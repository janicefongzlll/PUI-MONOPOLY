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

export class CityBoard3D {
  constructor({ host, spaces, corners, onToken, onTile, onError }) {
    this.host = host; this.spaces = spaces; this.onToken = onToken; this.onTile = onTile; this.onError = onError;
    this.layout = createBoardLayout(spaces, corners); this.spans = boardSpans(corners, spaces.length);
    this.tokens = new Map(); this.session = null; this.movingId = null;
    this.resources = new BoardResources(); this.scene = new THREE.Scene();
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.setAttribute('aria-label', 'Interactive 3D PUI Fortune board. Tap a piece to move or a tile to inspect it.');
    this.renderer.domElement.setAttribute('role', 'img');
    this.host.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, Math.max(...this.spans) * 8);
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
    this.landing = new LandingEffect(this.scene);
    this.raycaster = new THREE.Raycaster(); this.pointer = new THREE.Vector2();
    this.drags = new Map(); this.dragDistance = 0; this.pinchSpan = 0;
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', event => this.dragStart(event));
    canvas.addEventListener('pointermove', event => this.dragMove(event));
    canvas.addEventListener('pointerup', event => this.dragEnd(event));
    canvas.addEventListener('pointercancel', event => this.dragEnd(event));
    canvas.addEventListener('wheel', event => { event.preventDefault(); this.cameraControl.zoom(event.deltaY > 0 ? 1.12 : 1 / 1.12); }, { passive: false });
    canvas.addEventListener('click', event => this.pick(event));
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); this.onError?.(new Error('3D context lost')); });
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(host);
    this.lastTime = 0; this.lastShadow = 0;
    this.renderer.setAnimationLoop(time => this.frame(time));
    this.resize();
  }

  resize() {
    const { width, height } = this.host.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
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
      this.cameraControl.overview();
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
  dragStart(event) {
    this.renderer.domElement.setPointerCapture?.(event.pointerId);
    this.drags.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.drags.size === 1) this.dragDistance = 0;
    this.pinchSpan = this.drags.size === 2 ? this.twoFingerSpan() : 0;
  }
  dragMove(event) {
    const last = this.drags.get(event.pointerId);
    if (!last) return;
    const dx = event.clientX - last.x, dy = event.clientY - last.y;
    last.x = event.clientX; last.y = event.clientY;
    this.dragDistance += Math.hypot(dx, dy);
    if (this.drags.size === 2) {
      const span = this.twoFingerSpan();
      if (this.pinchSpan) this.cameraControl.zoom(this.pinchSpan / span);
      this.pinchSpan = span;
    } else if (this.drags.size === 1) this.cameraControl.orbit(dx, dy);
  }
  dragEnd(event) {
    this.drags.delete(event.pointerId);
    this.pinchSpan = this.drags.size === 2 ? this.twoFingerSpan() : 0;
  }

  pick(event) {
    // A drag that ends on the board is a camera move, not a tap on what sits under it.
    if (!this.session || this.dragDistance > 6) return;
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

  frame(time) {
    const delta = Math.min(0.05, (time - this.lastTime) / 1000 || 0.016); this.lastTime = time;
    if (!this.session || document.hidden || !this.host.offsetWidth) return;
    this.cameraControl.update(delta); this.landing.update(delta); this.environment.update(delta);
    this.tiles.forEach(tile => tile.update(delta));
    this.tokens.forEach(token => token.faceCamera(this.camera));
    // The city is static: refresh shadow maps only for state changes or at 15fps during hops.
    if (this.movingId !== null && time - this.lastShadow > 66) { this.renderer.shadowMap.needsUpdate = true; this.lastShadow = time; }
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
    this.renderer.setAnimationLoop(null); this.resizeObserver.disconnect();
    this.tiles.forEach(tile => tile.dispose()); this.environment.dispose(); this.landing.dispose(); this.labelMaterial.dispose();
    this.resources.dispose(); this.renderer.dispose(); this.renderer.domElement.remove(); this.session = null;
  }
}
