import * as THREE from '../../vendor/three.module.min.js';
import { createBoardLayout, boardSpans, tokenOffset, TILE_TOP, wrapIndex } from './boardLayout.mjs';
import { BoardResources, StaticCityBatch } from './resources.mjs';
import { BoardTile3D, createLabelAtlas } from './BoardTile3D.mjs';
import { PlayerToken3D, TOKEN_LAYER } from './PlayerToken3D.mjs';
import { addPropertyLandmark } from './PropertyLandmark.mjs';
import { BoardCamera, CAMERA_MODES } from './BoardCamera.mjs';
import { LandingEffect } from './LandingEffect.mjs';
import { createBoardEnvironment } from './BoardEnvironment.mjs';
import { hopToken, bounceToken, animate } from '../../animation/tokenMovement.mjs';

// What the browser is actually drawing with, as reported by the driver.
function describeGPU(renderer) {
  try {
    const gl = renderer.getContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    return (info && gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || 'unknown';
  } catch { return 'unknown'; }
}

export class CityBoard3D {
  constructor({ host, spaces, corners, onToken, onTile, onError }) {
    this.host = host; this.spaces = spaces; this.onToken = onToken; this.onTile = onTile; this.onError = onError;
    this.layout = createBoardLayout(spaces, corners); this.spans = boardSpans(corners, spaces.length);
    this.tokens = new Map(); this.session = null; this.movingId = null;
    this.resources = new BoardResources(); this.scene = new THREE.Scene();
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    // Pixel budget. It only ever falls: a picture that keeps switching resolution flickers,
    // and the flight below drops to one device pixel while it fills the whole window.
    this.qualityCap = 1.5; this.slowFrames = 0;
    // A browser falling back to software rendering cannot afford this scene at full quality.
    // Say so, and hand it a scene it can actually draw, rather than stuttering through one.
    this.gpu = describeGPU(this.renderer);
    if (/swiftshader|software|llvmpipe|basic render|microsoft basic/i.test(this.gpu)) {
      this.qualityCap = 0.7; this.softwareGPU = true;
      console.warn(`PUI Fortune 3D is running without GPU acceleration (${this.gpu}). Turn on hardware acceleration in your browser settings for a smooth board.`);
    }
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, this.qualityCap));
    this.renderer.shadowMap.enabled = !this.softwareGPU; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.setAttribute('aria-label', 'Interactive 3D PUI Fortune board. Tap a piece to move or a tile to inspect it.');
    this.renderer.domElement.setAttribute('role', 'img');
    this.host.appendChild(this.renderer.domElement);
    // A near plane this far out keeps depth precision high across the board. Closer than
    // this and the stacked flat surfaces of the mill site shimmer against each other.
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.4, Math.max(...this.spans) * 8);
    this.cameraControl = new BoardCamera(this.camera, this.reducedMotion, mode => {
      const button = document.getElementById('board-view-button');
      if (button) { button.textContent = mode === CAMERA_MODES.OVERVIEW ? 'Return to player' : 'View board'; button.setAttribute('aria-pressed', String(mode === CAMERA_MODES.OVERVIEW)); }
      this.host.dataset.camera = mode;
    }, this.spans);
    const batch = new StaticCityBatch(this.resources);
    this.environment = createBoardEnvironment(this.scene, this.resources, batch, this.spans);
    this.labelMaterial = createLabelAtlas(spaces, this.resources);
    this.tiles = spaces.map((space, index) => {
      const tile = new BoardTile3D(space, this.layout[index], this.resources, this.labelMaterial);
      this.scene.add(tile.group); addPropertyLandmark(batch, this.layout[index], space); return tile;
    });
    batch.build(this.scene);
    // The mill site streams in after the first frames, so the static shadow map must be redrawn once it lands.
    this.siteReady = false; this.intro = null;
    this.scene.addEventListener('site-ready', () => {
      this.siteReady = true;
      // Compiling the site's materials up front stops the flight stalling for a fifth of a
      // second the first time each one comes into view.
      this.renderer.compile(this.scene, this.camera);
      this.renderer.shadowMap.needsUpdate = true;
    });
    this.landing = new LandingEffect(this.scene);
    this.raycaster = new THREE.Raycaster(); this.pointer = new THREE.Vector2();
    this.drags = new Map(); this.dragDistance = 0; this.pinchSpan = 0; this.pinchCentre = null; this.panPointer = null;
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', event => this.dragStart(event));
    canvas.addEventListener('pointermove', event => this.dragMove(event));
    canvas.addEventListener('pointerup', event => this.dragEnd(event));
    canvas.addEventListener('pointercancel', event => this.dragEnd(event));
    canvas.addEventListener('wheel', event => { event.preventDefault(); this.cameraControl.zoom(event.deltaY > 0 ? 1.12 : 1 / 1.12); }, { passive: false });
    canvas.addEventListener('click', event => this.pick(event));
    // The middle and right buttons pan. Both have loud browser defaults to suppress first:
    // the middle button opens the autoscroll cursor, which swallows the drag, and the right
    // button opens the context menu. Only `mousedown` cancels autoscroll, not `pointerdown`.
    canvas.addEventListener('mousedown', event => { if (event.button === 1 || event.button === 2) event.preventDefault(); });
    canvas.addEventListener('auxclick', event => event.preventDefault());
    canvas.addEventListener('contextmenu', event => event.preventDefault());
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); this.onError?.(new Error('3D context lost')); });
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(host);
    this.lastTime = 0; this.lastShadow = 0;
    this.renderer.setAnimationLoop(time => this.frame(time));
    this.resize();
  }

  applyPixelRatio() { this.resize(); }

  resize() {
    const { width, height } = this.host.getBoundingClientRect();
    if (!width || !height) return;
    // Draw to a pixel budget, not to the display's ratio: a board that fills a large screen
    // would otherwise cost several times what the same board costs in its box on the page.
    const budget = this.cinema ? 2.1e6 : 3.0e6;
    const ratio = Math.min(devicePixelRatio || 1, this.qualityCap, Math.sqrt(budget / (width * height)));
    // Setting the size reallocates the drawing buffer, which shows as a flash, so a resize
    // that would not change anything is skipped rather than paid for.
    const key = `${Math.round(width)}x${Math.round(height)}x${ratio.toFixed(2)}`;
    if (key === this.sizeKey) return;
    this.sizeKey = key;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
    this.cameraControl.viewportHeight = height;
    this.renderer.shadowMap.needsUpdate = true;
  }

  positionFor(player, position = player.position) {
    const tile = this.layout[wrapIndex(position)];
    const offset = tokenOffset(this.session.players, player, position);
    return new THREE.Vector3(tile.x + tile.inward[0] * tile.tokenAt + offset.x, TILE_TOP, tile.z + tile.inward[1] * tile.tokenAt + offset.z);
  }

  directionAt(position, nextPosition = wrapIndex(position + 1)) {
    const tile = this.layout[position], next = this.layout[nextPosition];
    return new THREE.Vector3(next.x - tile.x, 0, next.z - tile.z).normalize();
  }

  sync(state) {
    if (!state) return;
    const changedGame = this.session !== state;
    this.session = state;
    if (changedGame) {
      this.tokens.forEach(token => this.scene.remove(token.group)); this.tokens.clear(); this.movingId = null;
      // A new game normally resets the view, but not out from under the opening fly-through.
      if (this.cameraControl.mode !== CAMERA_MODES.CINEMA) this.cameraControl.overview();
    }
    state.players.forEach(p => {
      let token = this.tokens.get(p.id);
      if (!token) { token = new PlayerToken3D(p, this.resources); this.tokens.set(p.id, token); this.scene.add(token.group); }
      if (p.id !== this.movingId) token.group.position.copy(this.positionFor(p));
      token.sync(p, p.id === state.currentPlayer);
    });
    this.tiles.forEach((tile, i) => tile.sync(this.spaces[i], state.players));
    if (this.movingId === null) {
      const active = state.players[state.currentPlayer];
      const changedPlayer = this.activePlayer !== active.id;
      this.activePlayer = active.id;
      this.cameraControl.track(this.tokens.get(active.id).group.position, this.directionAt(active.position), CAMERA_MODES.IDLE);
      if (changedPlayer && !changedGame && !this.cameraControl.manual) this.cameraControl.returnToPlayer();
    }
    this.updateCaption(); this.renderer.shadowMap.needsUpdate = true;
  }

  updateCaption(position) {
    if (!this.session) return;
    const p = this.session.players[this.session.currentPlayer];
    const space = this.spaces[position ?? p.position];
    const title = document.getElementById('board-location-name'), meta = document.getElementById('board-location-meta');
    if (title) title.textContent = space.name;
    if (meta) meta.textContent = `${p.name} · ${p.animal.name}${space.price !== undefined ? ` · $${space.price} · Rent $${space.rent * (space.building ? 2 : 1)}` : ` · ${space.label}`}`;
  }

  async animateMovement(p, pending, onStep, signal) {
    const token = this.tokens.get(p.id);
    if (!token) return false;
    this.movingId = p.id;
    const firstNext = pending.route[pending.nextStep] ?? p.position;
    this.cameraControl.follow(token.group.position, this.directionAt(p.position, firstNext));
    // Give the camera time to descend from overview before the first hop.
    if (!(await animate(this.reducedMotion ? 220 : 420, () => {}, signal))) return false;
    for (let i = pending.nextStep; i < pending.route.length; i++) {
      const nextIndex = pending.route[i]; const previousIndex = p.position;
      const destination = this.positionFor(p, nextIndex);
      const direction = this.directionAt(previousIndex, nextIndex);
      const aheadIndex = pending.route[i + 1] ?? wrapIndex(nextIndex + (pending.options.direction || 1));
      const aheadDirection = this.directionAt(nextIndex, aheadIndex);
      const cameraDirection = new THREE.Vector3();
      const arrived = await hopToken(token.group, destination, {
        signal, reducedMotion: this.reducedMotion,
        onFrame: t => {
          // Look ahead into the turn before reaching the corner, then damp the heading.
          cameraDirection.copy(direction).lerp(aheadDirection, Math.max(0, (t - 0.35) / 0.65) * 0.7).normalize();
          this.cameraControl.track(token.group.position, cameraDirection, CAMERA_MODES.FOLLOW);
        }
      });
      if (!arrived || signal.aborted) return false;
      token.group.position.copy(destination); token.group.scale.setScalar(1);
      onStep(nextIndex, i);
      this.updateCaption(nextIndex);
      if (nextIndex === 0 && pending.options.collectStart) this.landing.trigger(destination, true);
    }
    this.landing.trigger(token.group.position, false, this.layout[p.position]);
    this.cameraControl.track(token.group.position, this.cameraControl.direction, CAMERA_MODES.LANDING);
    const arrived = await bounceToken(token.group, { signal, reducedMotion: this.reducedMotion });
    if (!arrived) return false;
    token.group.scale.setScalar(1); this.movingId = null;
    return true;
  }

  toggleOverview() {
    if (this.cameraControl.mode === CAMERA_MODES.OVERVIEW) this.cameraControl.returnToPlayer(); else this.cameraControl.overview();
  }

  sparkleUpgrade(position) {
    const layout = this.layout[wrapIndex(position)];
    if (layout) { this.tiles[wrapIndex(position)]?.playUpgradeGlow(); this.landing.triggerUpgrade(layout); }
  }

  // Drag to orbit, wheel or pinch to zoom. Any of these hands the camera to the player
  // until they press a view button or the next move takes it back.
  twoFingerSpan() {
    const [a, b] = [...this.drags.values()];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  }
  twoFingerCentre() {
    const [a, b] = [...this.drags.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  dragStart(event) {
    // Middle button, right button or Shift with the left: any of them pans instead of orbiting.
    const pans = event.button === 1 || event.button === 2 || (event.button === 0 && event.shiftKey);
    if (pans) event.preventDefault();
    // Capture keeps a drag alive outside the canvas; a synthetic pointer has nothing to capture.
    try { this.renderer.domElement.setPointerCapture?.(event.pointerId); } catch { /* not a live pointer */ }
    this.drags.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.drags.size === 1) this.dragDistance = 0;
    if (pans) this.panPointer = event.pointerId;
    this.pinchSpan = this.drags.size === 2 ? this.twoFingerSpan() : 0;
    this.pinchCentre = this.drags.size === 2 ? this.twoFingerCentre() : null;
  }
  dragMove(event) {
    const last = this.drags.get(event.pointerId);
    if (!last) return;
    const dx = event.clientX - last.x, dy = event.clientY - last.y;
    last.x = event.clientX; last.y = event.clientY;
    this.dragDistance += Math.hypot(dx, dy);
    if (this.drags.size === 2) {
      // Two fingers pinch and slide at once: the span zooms, the midpoint pans.
      const span = this.twoFingerSpan(), centre = this.twoFingerCentre();
      if (this.pinchSpan) this.cameraControl.zoom(this.pinchSpan / span);
      if (this.pinchCentre) this.cameraControl.pan(centre.x - this.pinchCentre.x, centre.y - this.pinchCentre.y);
      this.pinchSpan = span; this.pinchCentre = centre;
    } else if (this.drags.size === 1) {
      if (this.panPointer === event.pointerId) this.cameraControl.pan(dx, dy);
      else this.cameraControl.orbit(dx, dy);
    }
  }
  dragEnd(event) {
    this.drags.delete(event.pointerId);
    if (this.panPointer === event.pointerId) this.panPointer = null;
    this.pinchSpan = this.drags.size === 2 ? this.twoFingerSpan() : 0;
    this.pinchCentre = this.drags.size === 2 ? this.twoFingerCentre() : null;
  }

  pick(event) {
    // A drag that ends on the board is a camera move, not a tap on what sits under it.
    if (!this.session || this.intro || this.dragDistance > 6) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects([...this.tokens.values()].map(token => token.group), true);
    if (hits.length) {
      let object = hits[0].object;
      while (object && object.userData.playerId === undefined) object = object.parent;
      if (object) { this.onToken?.(object.userData.playerId); return; }
    }
    const tileHits = this.raycaster.intersectObjects(this.tiles.map(tile => tile.group), true);
    if (tileHits.length) {
      let object = tileHits[0].object;
      while (object && object.userData.tileIndex === undefined) object = object.parent;
      if (object) this.onTile?.(object.userData.tileIndex);
    }
  }

  // Opening fly-through: a close pass over the plaque, a sweep around the mill, then a climb
  // out to the board overview it hands the camera back on. Resolves when the flight is over,
  // however it ended, so the caller can bring the rest of the page back afterwards.
  whenSiteReady(timeout = 9000) {
    if (this.siteReady) return Promise.resolve();
    return new Promise(resolve => {
      const done = () => { clearTimeout(timer); this.scene.removeEventListener('site-ready', done); resolve(); };
      const timer = setTimeout(done, timeout);
      this.scene.addEventListener('site-ready', done);
    });
  }
  async playIntro(duration = 7000) {
    this.skipIntro();
    // Reduced motion takes the same tour more gently rather than being denied it: the path is
    // one continuous eased move, and stretching it slows every part of the flight down.
    if (this.reducedMotion) duration *= 1.6;
    this.cameraControl.setMode(CAMERA_MODES.CINEMA);
    this.cinema = true; this.applyPixelRatio();
    try { await this.flyThrough(duration); } finally { this.cinema = false; this.applyPixelRatio(); }
  }
  async flyThrough(duration) {
    await this.whenSiteReady();
    // The board can still be waiting for its first sync; frames start advancing once it lands.
    if (this.cameraControl.mode !== CAMERA_MODES.CINEMA) return;
    // Falling back keeps the flight running even if the site model never reported its points.
    const centre = new THREE.Vector3(0, 1, 0);
    const { plaque = centre, mill = centre } = this.environment.points || {};
    const at = (base, x, y, z) => base.clone().add(new THREE.Vector3(x, y, z));
    // One continuous turn. The camera opens low over the plaque, keeps circling the same way
    // past the mill, and climbs out of that same turn onto the overview, so the board never
    // appears to swing back on itself.
    const finish = this.cameraControl.overviewPose?.(new THREE.Vector3()) ?? this.camera.position.clone();
    const opening = at(plaque, -4, 4.2, 8);
    const startR = Math.hypot(opening.x, opening.z), startT = Math.atan2(opening.x, opening.z);
    const endR = Math.hypot(finish.x, finish.z) || startR;
    const endT = Math.atan2(finish.x, finish.z) - Math.PI * 2; // the long way round, one direction
    const smooth = value => { const v = Math.min(1, Math.max(0, value)); return v * v * (3 - 2 * v); };
    const path = { getPoint: u => {
      const angle = startT + (endT - startT) * u;
      // The climb waits until the mill has gone by, so the tour stays low where it matters.
      const rise = smooth((u - 0.3) / 0.7);
      const radius = startR + (endR - startR) * rise;
      return new THREE.Vector3(Math.sin(angle) * radius, opening.y + (finish.y - opening.y) * rise, Math.cos(angle) * radius);
    } };
    const boardCentre = new THREE.Vector3();
    const look = { getPoint: u => (u < 0.5
      ? plaque.clone().lerp(mill, smooth(u * 2))
      : mill.clone().lerp(boardCentre, smooth(u * 2 - 1))) };
    await new Promise(resolve => {
      // A board that never gets a session would otherwise hold the screen for good.
      const guard = setTimeout(() => this.endIntro(true), duration + 5000);
      this.intro = { path, look, duration, start: null, resolve: () => { clearTimeout(guard); resolve(); } };
      // The flight opens somewhere quite unlike the view it replaces, so it fades in rather
      // than cutting, which also covers the buffer swap that comes with going full screen.
      const canvas = this.renderer.domElement;
      canvas.classList.remove('is-flying'); void canvas.offsetWidth; canvas.classList.add('is-flying');
    });
  }
  advanceIntro(time) {
    // Any move or drag that claims the camera cuts the flight short rather than fighting it.
    if (this.cameraControl.mode !== CAMERA_MODES.CINEMA) { this.endIntro(false); return; }
    if (this.intro.start === null) this.intro.start = time;
    const t = Math.min(1, (time - this.intro.start) / this.intro.duration);
    const eased = t * t * (3 - 2 * t);
    this.camera.position.copy(this.intro.path.getPoint(eased));
    this.cameraControl.target.copy(this.intro.look.getPoint(eased));
    this.camera.lookAt(this.cameraControl.target);
    if (t >= 1) this.endIntro(true);
  }
  endIntro(handOver) {
    const intro = this.intro; this.intro = null;
    this.renderer.domElement.classList.remove('is-flying');
    if (handOver && this.cameraControl.mode === CAMERA_MODES.CINEMA) this.cameraControl.overview();
    intro?.resolve();
  }
  skipIntro() { if (this.intro) this.endIntro(true); }

  frame(time) {
    const delta = Math.min(0.05, (time - this.lastTime) / 1000 || 0.016); this.lastTime = time;
    if (!this.session || document.hidden || !this.host.offsetWidth) return;
    if (this.intro) this.advanceIntro(time);
    this.cameraControl.update(delta); this.landing.update(delta); this.environment.update(delta);
    this.tiles.forEach(tile => tile.update(delta));
    this.tokens.forEach(token => token.faceCamera(this.camera));
    // The city is static: refresh shadow maps only for state changes or at 15fps during hops.
    if (this.movingId !== null && time - this.lastShadow > 120) { this.renderer.shadowMap.needsUpdate = true; this.lastShadow = time; }
    // Frames that keep running long mean this device cannot afford the pixels it is being
    // given, so give it fewer. Once, then once more, and never back up.
    if (this.siteReady && !this.cinema) {
      this.slowFrames = delta > 0.028 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 1);
      if (this.slowFrames > 45 && this.qualityCap > 0.8) { this.qualityCap = this.qualityCap > 1 ? 1 : 0.8; this.slowFrames = 0; this.applyPixelRatio(); }
    }
    try {
      this.renderer.render(this.scene, this.camera);
      // Overlay pass: clear depth and redraw only the tokens, so buildings can never occlude a piece
      // while shadows, positions and intra-token depth from the first pass stay intact.
      const background = this.scene.background;
      this.scene.background = null; this.renderer.autoClear = false; this.renderer.clearDepth();
      this.camera.layers.set(TOKEN_LAYER);
      this.renderer.render(this.scene, this.camera);
      this.camera.layers.set(0); this.renderer.autoClear = true; this.scene.background = background;
    } catch (error) { this.onError?.(error); }
  }

  cancel() { this.movingId = null; }
  dispose() {
    this.endIntro(false);
    this.renderer.setAnimationLoop(null); this.resizeObserver.disconnect();
    this.tiles.forEach(tile => tile.dispose()); this.environment.dispose(); this.landing.dispose(); this.labelMaterial.dispose();
    this.resources.dispose(); this.renderer.dispose(); this.renderer.domElement.remove(); this.session = null;
  }
}
