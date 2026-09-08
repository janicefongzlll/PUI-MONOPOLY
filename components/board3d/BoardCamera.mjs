import * as THREE from '../../vendor/three.module.min.js';
import { dampAngle, dampFactor } from '../../animation/cameraMovement.mjs';

export const CAMERA_MODES = Object.freeze({ FOLLOW: 'FOLLOW', LANDING: 'LANDING', OVERVIEW: 'OVERVIEW', IDLE: 'IDLE', FREE: 'FREE' });

export class BoardCamera {
  constructor(camera, reducedMotion = false, onMode, spans = [26, 26]) {
    this.camera = camera;
    this.reducedMotion = reducedMotion;
    this.onMode = onMode;
    this.spans = spans;
    this.mode = CAMERA_MODES.OVERVIEW;
    this.context = CAMERA_MODES.IDLE;
    this.focus = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.direction = new THREE.Vector3(-1, 0, 0);
    this.heading = Math.PI;
    this.freeTarget = new THREE.Vector3();
    this.freeYaw = 0; this.freePitch = 0.9; this.freeDistance = spans[0];
    this.camera.position.set(26, 32, 32);
    this.camera.lookAt(0, 0, 0);
    this.onMode?.(this.mode);
  }

  setMode(mode) { this.mode = mode; this.onMode?.(mode); }
  // Overview and free look are the player's own choices; scripted tracking must not undo them.
  get manual() { return this.mode === CAMERA_MODES.OVERVIEW || this.mode === CAMERA_MODES.FREE; }
  track(position, direction, mode = CAMERA_MODES.IDLE) {
    this.focus.copy(position);
    if (direction?.lengthSq()) this.direction.copy(direction).normalize();
    this.context = mode;
    if (!this.manual) this.setMode(mode);
  }
  follow(position, direction) {
    this.track(position, direction, CAMERA_MODES.FOLLOW);
    // A move always reclaims the camera, whatever the player had been looking at.
    // Reduced motion keeps the follow view too; only the damping and hop sizes are toned down.
    this.setMode(CAMERA_MODES.FOLLOW);
  }
  overview() { this.setMode(CAMERA_MODES.OVERVIEW); }
  returnToPlayer() { this.setMode(this.context); }

  // Free look. Orbits whatever the camera was already pointing at, so a drag while
  // watching a piece turns around that piece rather than jumping to the board centre.
  enterFree() {
    if (this.mode === CAMERA_MODES.FREE) return;
    this.freeTarget.copy(this.target);
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.freeTarget);
    this.freeDistance = Math.max(offset.length(), 1);
    this.freeYaw = Math.atan2(offset.x, offset.z);
    this.freePitch = Math.asin(THREE.MathUtils.clamp(offset.y / this.freeDistance, -1, 1));
    this.setMode(CAMERA_MODES.FREE);
  }
  orbit(dx, dy) {
    this.enterFree();
    this.freeYaw -= dx * 0.006;
    // Stay above the table: below the horizon the board is edge-on and unreadable.
    this.freePitch = THREE.MathUtils.clamp(this.freePitch + dy * 0.006, 0.12, 1.45);
  }
  zoom(factor) {
    this.enterFree();
    const span = Math.max(...this.spans);
    this.freeDistance = THREE.MathUtils.clamp(this.freeDistance * factor, span * 0.1, span * 2.6);
  }

  update(delta) {
    const alpha = dampFactor(this.reducedMotion ? 10 : 4.5, delta);
    const nextPosition = new THREE.Vector3();
    const nextTarget = new THREE.Vector3();
    if (this.mode === CAMERA_MODES.FREE) {
      const cosPitch = Math.cos(this.freePitch);
      nextPosition.set(Math.sin(this.freeYaw) * cosPitch, Math.sin(this.freePitch), Math.cos(this.freeYaw) * cosPitch)
        .multiplyScalar(this.freeDistance).add(this.freeTarget);
      nextTarget.copy(this.freeTarget);
    } else if (this.mode === CAMERA_MODES.OVERVIEW) {
      // Fit the projected board bounds, not just its width: the nearest corner
      // takes much more screen space under perspective, especially on a phone.
      const eye = new THREE.Vector3(0.48, 0.86, 0.62).normalize();
      const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), eye).normalize();
      const up = new THREE.Vector3().crossVectors(eye, right);
      const tanV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
      const tanH = tanV * this.camera.aspect;
      let distance = 0;
      const edgeX = this.spans[0] / 2 + 1, edgeZ = this.spans[1] / 2 + 1;
      for (const x of [-edgeX, edgeX]) for (const z of [-edgeZ, edgeZ]) for (const y of [-1, 3]) {
        const point = new THREE.Vector3(x, y, z);
        distance = Math.max(distance, point.dot(eye) + Math.max(Math.abs(point.dot(right)) / tanH, Math.abs(point.dot(up)) / tanV));
      }
      nextPosition.copy(eye).multiplyScalar(distance * 1.12);
    } else {
      const desiredHeading = Math.atan2(this.direction.z, this.direction.x);
      this.heading = dampAngle(this.heading, desiredHeading, dampFactor(this.reducedMotion ? 9 : 3.8, delta));
      const forward = new THREE.Vector3(Math.cos(this.heading), 0, Math.sin(this.heading));
      const outside = new THREE.Vector3(forward.z, 0, -forward.x);
      const landing = this.mode === CAMERA_MODES.LANDING;
      const mobile = this.camera.aspect < 0.85;
      nextPosition.copy(this.focus).addScaledVector(forward, -4.4).addScaledVector(outside, landing ? 6.5 : 8.5);
      nextPosition.y = landing ? 8.2 : (mobile ? 12 : 10.3);
      nextTarget.copy(this.focus).addScaledVector(forward, landing ? 0.25 : 1.25);
      nextTarget.y = 0.55;
    }
    this.camera.position.lerp(nextPosition, alpha);
    this.target.lerp(nextTarget, alpha);
    this.camera.lookAt(this.target);
  }
}
