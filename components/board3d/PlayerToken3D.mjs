import * as THREE from '../../vendor/three.module.min.js';

// Tokens are duplicated onto this layer for CityBoard3D's depth-cleared overlay pass,
// which keeps every piece fully visible in front of buildings without moving it.
export const TOKEN_LAYER = 1;

// Artwork is purely presentational; animal identities in saved games stay unchanged.
const TOKEN_ART = {
  frog: { size: 1.5, foot: 0.18 },
  monkey: { size: 1.65, foot: 0.05 },
  wolf: { size: 1.65, foot: 0.05 },
  horse: { size: 1.65, foot: 0.05 }
};

export class PlayerToken3D {
  constructor(player, resources) {
    this.group = new THREE.Group(); this.group.userData.playerId = player.id;
    this.identity = player.animal.art || player.animal.name.toLowerCase();
    const r = resources;
    const white = r.material('#fff5de'), dark = r.material('#17302c'), coral = r.material('#d7624c');
    const skin = r.material(({ frog: '#77a958', monkey: '#a47649', wolf: '#8a9ba3', horse: '#bb8a5a', snake: '#77a958', mouse: '#8a9ba3', goldfish: '#e99943' })[this.identity] || player.color);
    let parent = this.group;
    const mesh = (kind, mat, pos, scale) => r.mesh(kind, mat, pos, scale, parent, true);
    mesh('cylinder', r.material(player.color, 0.3, 0.4), [0, 0.09, 0], [0.43, 0.18, 0.43]);
    mesh('cylinder', r.material('#d3b777', 0.7, 0.3), [0, 0.19, 0], [0.36, 0.04, 0.36]);
    // Retain the original model for legacy animals and while artwork is loading.
    this.model = new THREE.Group(); this.group.add(this.model); parent = this.model;
    mesh('sphere', skin, [0, 0.5, 0], [0.28, 0.35, 0.26]);
    mesh('sphere', white, [0, 0.5, 0.2], [0.2, 0.23, 0.09]);
    mesh('sphere', skin, [0, 0.99, 0], [0.39, 0.35, 0.32]);
    mesh('cylinder', coral, [0, 0.7, 0], [0.28, 0.09, 0.27]);
    const snout = this.identity === 'horse' ? [0.23, 0.25, 0.22] : [0.25, 0.16, 0.12];
    mesh('sphere', white, [0, 0.89, 0.28], snout);
    if (this.identity === 'frog') {
      [-1, 1].forEach(s => { mesh('sphere', skin, [s * 0.25, 1.22, 0.12], [0.2, 0.2, 0.17]); mesh('sphere', white, [s * 0.25, 1.25, 0.24], [0.12, 0.13, 0.07]); mesh('sphere', dark, [s * 0.25, 1.25, 0.3], [0.064, 0.075, 0.035]); });
    } else {
      [-1, 1].forEach(s => {
        const round = ['monkey', 'mouse'].includes(this.identity);
        mesh(round ? 'sphere' : 'cone', skin, [s * 0.32, 1.26, -0.02], round ? [0.19, 0.19, 0.13] : [0.17, 0.42, 0.15]);
        mesh('sphere', dark, [s * 0.16, 1.05, 0.29], [0.055, 0.078, 0.045]);
        mesh('sphere', white, [s * 0.16 - 0.013, 1.08, 0.32], [0.017, 0.021, 0.015]);
      });
      mesh('sphere', dark, [0, 0.96, this.identity === 'horse' ? 0.49 : 0.39], [0.07, 0.05, 0.035]);
    }
    if (this.identity === 'horse') [-0.14, 0, 0.14].forEach(z => mesh('sphere', r.material('#654331'), [0, 1.29, z - 0.12], [0.13, 0.16, 0.16]));
    [-1, 1].forEach(s => mesh('sphere', skin, [s * 0.2, 0.27, 0.18], [0.16, 0.1, 0.17]));
    parent = this.group;
    const art = TOKEN_ART[this.identity];
    if (art) {
      const url = new URL(`../../assets/tokens/${this.identity}.png`, import.meta.url).href;
      this.artwork = new THREE.Sprite(r.tokenMaterial(url));
      this.artwork.name = `${this.identity}-artwork`;
      this.artwork.center.set(0.5, art.foot);
      this.artwork.position.y = 0.23;
      this.artwork.scale.set(art.size, art.size, 1);
      this.artwork.visible = false;
      this.group.add(this.artwork);
    }
    this.halo = mesh('ring', r.material('#e7c975', 0.5), [0, 0.015, 0], [0.57, 0.57, 0.57]);
    this.halo.rotation.x = -Math.PI / 2; this.halo.castShadow = false;
    this.jailRing = mesh('ring', coral, [0, 0.4, 0], [0.47, 0.47, 0.47]);
    this.jailRing.rotation.x = -Math.PI / 2;
    // An invisible, generous tap target for small screens.
    const hit = mesh('sphere', new THREE.MeshBasicMaterial({ visible: false }), [0, 0.75, 0], [0.55, 0.8, 0.55]);
    hit.userData.playerId = player.id;
    this.group.traverse(object => object.layers.enable(TOKEN_LAYER));
  }
  sync(player, active) {
    // A bankrupt group's piece leaves the board.
    this.group.visible = !player.out;
    this.halo.visible = active && !player.out; this.jailRing.visible = player.jailed;
  }
  faceCamera(camera) {
    this.group.rotation.y = Math.atan2(camera.position.x - this.group.position.x, camera.position.z - this.group.position.z);
    if (this.artwork) {
      const ready = Boolean(this.artwork.material.map.image?.naturalWidth);
      this.artwork.visible = ready;
      this.model.visible = !ready;
    }
  }
}
