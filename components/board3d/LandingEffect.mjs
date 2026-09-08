import * as THREE from '../../vendor/three.module.min.js';
export class LandingEffect {
  constructor(scene) {
    this.material = new THREE.MeshBasicMaterial({ color: '#e7c46e', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.81, 48), this.material);
    this.mesh.rotation.x = -Math.PI / 2; this.mesh.position.y = 0.45; scene.add(this.mesh);
    this.tileMaterial = new THREE.MeshBasicMaterial({ color: '#e7c46e', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    this.tile = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.tileMaterial);
    this.tile.rotation.x = -Math.PI / 2; scene.add(this.tile);
    this.time = 0; this.active = false;
  }
  trigger(position, start = false, layout) {
    this.mesh.position.set(position.x, 0.45, position.z); this.material.color.set(start ? '#8ed9b2' : '#e7c46e');
    this.tile.visible = Boolean(layout);
    if (layout) { this.tile.position.set(layout.x, 0.435, layout.z); this.tile.scale.set(layout.width, layout.depth, 1); }
    this.time = 0; this.active = true;
  }
  update(delta) {
    if (!this.active) return;
    this.time += delta; const t = Math.min(1, this.time / 1.25);
    this.mesh.scale.setScalar(1 + t * 1.1); this.material.opacity = (1 - t) * 0.85;
    this.tileMaterial.opacity = (1 - t) * 0.22;
    if (t === 1) this.active = false;
  }
  dispose() { this.mesh.geometry.dispose(); this.material.dispose(); this.tile.geometry.dispose(); this.tileMaterial.dispose(); }
}
