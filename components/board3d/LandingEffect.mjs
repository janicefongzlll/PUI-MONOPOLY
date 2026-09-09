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
    const sparkleGeometry = new THREE.BufferGeometry();
    const points = new Float32Array(14 * 3);
    for (let i = 0; i < 14; i++) { const angle = i * 2.399; const radius = .18 + (i % 4) * .09; points.set([Math.cos(angle) * radius, .25 + (i % 5) * .16, Math.sin(angle) * radius], i * 3); }
    sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    this.sparkleMaterial = new THREE.PointsMaterial({ color: '#fff0a4', size: .12, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    this.sparkles = new THREE.Points(sparkleGeometry, this.sparkleMaterial); this.sparkles.visible = false; scene.add(this.sparkles);
    this.upgradeTime = 0; this.upgrading = false;
  }
  trigger(position, start = false, layout) {
    this.mesh.position.set(position.x, 0.45, position.z); this.material.color.set(start ? '#8ed9b2' : '#e7c46e');
    this.tile.visible = Boolean(layout);
    if (layout) { this.tile.position.set(layout.x, 0.435, layout.z); this.tile.scale.set(layout.width, layout.depth, 1); }
    this.time = 0; this.active = true;
  }
  triggerUpgrade(layout) {
    this.sparkles.position.set(layout.x + layout.inward[0] * layout.landmarkAt, .42, layout.z + layout.inward[1] * layout.landmarkAt);
    this.sparkles.scale.set(1, 1, 1); this.sparkles.rotation.set(0, 0, 0); this.sparkles.visible = true;
    this.upgradeTime = 0; this.upgrading = true;
  }
  update(delta) {
    if (!this.active) return;
    this.time += delta; const t = Math.min(1, this.time / 1.25);
    this.mesh.scale.setScalar(1 + t * 1.1); this.material.opacity = (1 - t) * 0.85;
    this.tileMaterial.opacity = (1 - t) * 0.22;
    if (t === 1) this.active = false;
    if (this.upgrading) {
      this.upgradeTime += delta; const sparkleT = Math.min(1, this.upgradeTime / 1.8);
      this.sparkles.rotation.y += delta * 2.8; this.sparkles.scale.setScalar(1 + sparkleT * .7); this.sparkleMaterial.opacity = Math.sin(sparkleT * Math.PI) * .95;
      if (sparkleT === 1) { this.upgrading = false; this.sparkles.visible = false; }
    }
  }
  dispose() { this.mesh.geometry.dispose(); this.material.dispose(); this.tile.geometry.dispose(); this.tileMaterial.dispose(); this.sparkles.geometry.dispose(); this.sparkleMaterial.dispose(); }
}
