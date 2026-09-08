import * as THREE from '../../vendor/three.module.min.js';
import { dampAngle, dampFactor } from '../../animation/cameraMovement.mjs';

export const CAMERA_MODES = Object.freeze({ FOLLOW: 'FOLLOW', LANDING: 'LANDING', OVERVIEW: 'OVERVIEW', IDLE: 'IDLE' });

export class BoardCamera {
  constructor(camera, reducedMotion = false, onMode) {
    this.camera = camera;
    this.reducedMotion = reducedMotion;
    this.onMode = onMode;
    this.mode = CAMERA_MODES.OVERVIEW;
    this.context = CAMERA_MODES.IDLE;
    this.focus = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.direction = new THREE.Vector3(-1, 0, 0);
    this.heading = Math.PI;
    this.camera.position.set(26, 32, 32);
    this.camera.lookAt(0, 0, 0);
    this.onMode?.(this.mode);
  }

  setMode(mode) { this.mode = mode; this.onMode?.(mode); }
  track(position, direction, mode = CAMERA_MODES.IDLE) {
    this.focus.copy(position);
    if (direction?.lengthSq()) this.direction.copy(direction).normalize();
    this.context = mode;
    if (this.mode !== CAMERA_MODES.OVERVIEW) this.setMode(mode);
  }
  follow(position, direction) {
    this.track(position, direction, CAMERA_MODES.FOLLOW);
    // Automatic cinematic follow when a move begins. Users can still request overview mid-hop.
    this.setMode(this.reducedMotion ? CAMERA_MODES.OVERVIEW : CAMERA_MODES.FOLLOW);
  }
  overview() { this.setMode(CAMERA_MODES.OVERVIEW); }
  returnToPlayer() { this.setMode(this.context); }

  update(delta) {
    const alpha = dampFactor(4.5, delta);
    const nextPosition = new THREE.Vector3();
    const nextTarget = new THREE.Vector3();
    if (this.mode === CAMERA_MODES.OVERVIEW) {
      // Fit the projected board bounds, not just its width: the nearest corner
      // takes much more screen space under perspective, especially on a phone.
      const eye = new THREE.Vector3(0.48, 0.86, 0.62).normalize();
      const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), eye).normalize();
      const up = new THREE.Vector3().crossVectors(eye, right);
      const tanV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
      const tanH = tanV * this.camera.aspect;
      let distance = 0;
      for (const x of [-14, 14]) for (const z of [-14, 14]) for (const y of [-1, 3]) {
        const point = new THREE.Vector3(x, y, z);
        distance = Math.max(distance, point.dot(eye) + Math.max(Math.abs(point.dot(right)) / tanH, Math.abs(point.dot(up)) / tanV));
      }
      nextPosition.copy(eye).multiplyScalar(distance * 1.12);
    } else {
      const desiredHeading = Math.atan2(this.direction.z, this.direction.x);
      this.heading = dampAngle(this.heading, desiredHeading, dampFactor(3.8, delta));
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
