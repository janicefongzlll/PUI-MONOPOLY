import * as THREE from '../../vendor/three.module.min.js';
import { writeWrapped } from './resources.mjs';

export function createLabelAtlas(spaces, resources) {
  const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 2048;
  const ctx = canvas.getContext('2d'); const cell = canvas.width / 6;
  spaces.forEach((space, i) => {
    const x = (i % 6) * cell, y = Math.floor(i / 6) * cell;
    ctx.fillStyle = '#fafbf4'; ctx.fillRect(x, y, cell, cell);
    ctx.textAlign = 'left'; ctx.fillStyle = '#64766e'; ctx.font = '600 21px sans-serif';
    ctx.fillText(String(i).padStart(2, '0'), x + 22, y + 38);
    ctx.fillStyle = '#143b37'; ctx.font = '700 33px sans-serif';
    writeWrapped(ctx, space.name, x + 22, y + 90, cell - 42, 38, 3);
    ctx.font = '700 28px sans-serif'; ctx.fillStyle = '#33756a';
    const detail = space.price !== undefined ? `$${space.price}  /  Rent $${space.rent}` : space.label;
    writeWrapped(ctx, detail, x + 22, y + cell - 70, cell - 42, 31, 2);
  });
  return new THREE.MeshBasicMaterial({ map: resources.texture(canvas), side: THREE.DoubleSide, toneMapped: false });
}

export class BoardTile3D {
  constructor(space, layout, resources, labelMaterial) {
    this.layout = layout; this.group = new THREE.Group(); this.group.position.set(layout.x, 0, layout.z);
    this.group.userData.tileIndex = layout.index;
    const color = space.price !== undefined ? '#f0f3e9' : ({ start: '#bce2c5', chance: '#c6e4ef', tax: '#f0deae', station: '#c9d6e8', jail: '#eac8bc', 'go-jail': '#eac8bc', parking: '#cde0cb' }[space.type]);
    this.body = new THREE.Mesh(resources.roundedBox(layout.width, 0.4, layout.depth), resources.material(color));
    this.body.position.y = 0.2; this.body.receiveShadow = true; this.group.add(this.body);
    const accent = new THREE.Mesh(resources.roundedBox(layout.width - 0.16, 0.05, layout.depth - 0.16, 0.025), resources.material(space.color || '#bc9954', 0.35));
    accent.position.y = 0.025; this.group.add(accent);
    this.owner = new THREE.Mesh(resources.roundedBox(layout.width + 0.025, 0.06, layout.depth + 0.025, 0.03), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }));
    this.owner.position.y = 0.035; this.owner.visible = false; this.group.add(this.owner);
    const labelGeometry = new THREE.PlaneGeometry(Math.min(layout.side % 2 ? layout.depth : layout.width, 2.5) * 0.92, 0.94);
    const uv = labelGeometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (layout.index % 6 + uv.getX(i)) / 6, (5 - Math.floor(layout.index / 6) + uv.getY(i)) / 6);
    this.label = new THREE.Mesh(labelGeometry, labelMaterial);
    this.label.rotation.set(-Math.PI / 2, 0, -layout.rotation);
    this.label.position.set(-layout.inward[0] * 0.65, 0.425, -layout.inward[1] * 0.65);
    this.group.add(this.label);
    this.upgrade = resources.mesh('cone', resources.material('#e3bf68', 0.65), [layout.inward[0] * 0.85, 0.75, layout.inward[1] * 0.85], [0.22, 0.6, 0.22], this.group);
    this.upgrade.visible = false;
  }
  sync(space, players) {
    this.owner.visible = space.owner !== undefined && space.owner !== null;
    if (this.owner.visible) this.owner.material.color.set(players.find(p => p.id === space.owner)?.color || '#bc9954');
    this.upgrade.visible = Boolean(space.building);
  }
  dispose() { this.label.geometry.dispose(); this.owner.material.dispose(); }
}
