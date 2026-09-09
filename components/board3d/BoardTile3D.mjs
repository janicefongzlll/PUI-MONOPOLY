import * as THREE from '../../vendor/three.module.min.js';
import { writeWrapped } from './resources.mjs';

const tint = new THREE.Color();

// Six columns by six rows of landscape cells, shaped to the space they are printed on.
const ATLAS_WIDTH = 2048, ATLAS_HEIGHT = 1368;
const LABEL_ASPECT = ATLAS_WIDTH / ATLAS_HEIGHT;

export function createLabelAtlas(spaces, resources) {
  const canvas = document.createElement('canvas'); canvas.width = ATLAS_WIDTH; canvas.height = ATLAS_HEIGHT;
  const ctx = canvas.getContext('2d'); const cellW = canvas.width / 6, cellH = canvas.height / 6;
  spaces.forEach((space, i) => {
    const x = (i % 6) * cellW, y = Math.floor(i / 6) * cellH;
    ctx.fillStyle = '#fafbf4'; ctx.fillRect(x, y, cellW, cellH);
    ctx.textAlign = 'left'; ctx.fillStyle = '#64766e'; ctx.font = '600 21px sans-serif';
    ctx.fillText(String(i).padStart(2, '0'), x + 22, y + 32);
    ctx.fillStyle = '#143b37'; ctx.font = '700 34px sans-serif';
    writeWrapped(ctx, space.name, x + 22, y + 76, cellW - 42, 37, 3);
    ctx.font = '700 28px sans-serif'; ctx.fillStyle = '#33756a';
    const detail = space.price !== undefined ? `$${space.price}  /  Rent $${space.rent}` : space.label;
    writeWrapped(ctx, detail, x + 22, y + cellH - 38, cellW - 42, 31, 2);
  });
  return new THREE.MeshBasicMaterial({ map: resources.texture(canvas), side: THREE.DoubleSide, toneMapped: false });
}

export class BoardTile3D {
  constructor(space, layout, resources, labelMaterial) {
    this.layout = layout; this.group = new THREE.Group(); this.group.position.set(layout.x, 0, layout.z);
    this.group.userData.tileIndex = layout.index;
    const color = space.price !== undefined ? '#f0f3e9' : ({ start: '#bce2c5', chance: '#c6e4ef', tax: '#f0deae', station: '#c9d6e8', jail: '#eac8bc', 'go-jail': '#eac8bc', parking: '#cde0cb' }[space.type]);
    // A bought landmark washes its box and printed face in the owner's colour, so those
    // two need their own materials; the shared cache would tint every like-coloured tile.
    this.ownable = space.price !== undefined;
    this.baseColor = new THREE.Color(color);
    this.body = new THREE.Mesh(resources.roundedBox(layout.width, 0.4, layout.depth), this.ownable ? resources.material(color).clone() : resources.material(color));
    this.body.position.y = 0.2; this.body.receiveShadow = true; this.group.add(this.body);
    const accent = new THREE.Mesh(resources.roundedBox(layout.width - 0.16, 0.05, layout.depth - 0.16, 0.025), resources.material(space.color || '#bc9954', 0.35));
    accent.position.y = 0.025; this.group.add(accent);
    this.owner = new THREE.Mesh(resources.roundedBox(layout.width + 0.025, 0.06, layout.depth + 0.025, 0.03), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }));
    this.owner.position.y = 0.035; this.owner.visible = false; this.group.add(this.owner);
    // As wide as the space allows and matching the atlas cell, so nothing is stretched.
    // Height is capped by the room left between the plate's centre and the outer edge.
    const labelReach = (layout.radialSize / 2 + layout.labelAt - 0.05) * 2;
    const labelWidth = Math.min(layout.alongSize * 0.92, labelReach * LABEL_ASPECT);
    const labelGeometry = new THREE.PlaneGeometry(labelWidth, labelWidth / LABEL_ASPECT);
    const uv = labelGeometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (layout.index % 6 + uv.getX(i)) / 6, (5 - Math.floor(layout.index / 6) + uv.getY(i)) / 6);
    this.label = new THREE.Mesh(labelGeometry, this.ownable ? labelMaterial.clone() : labelMaterial);
    this.label.rotation.set(-Math.PI / 2, 0, -layout.rotation);
    this.label.position.set(layout.inward[0] * layout.labelAt, 0.425, layout.inward[1] * layout.labelAt);
    this.group.add(this.label);
    this.upgradeMaterial = new THREE.MeshStandardMaterial({ color: '#e3bf68', metalness: .65, roughness: .24, emissive: '#a56a08', emissiveIntensity: .35 });
    this.upgrade = new THREE.Mesh(resources.geometry('cone'), this.upgradeMaterial);
    this.upgrade.position.set(layout.inward[0] * layout.upgradeAt, .75, layout.inward[1] * layout.upgradeAt); this.upgrade.scale.set(.22, .6, .22); this.group.add(this.upgrade);
    this.upgrade.visible = false;
    const fairyGeometry = new THREE.BufferGeometry(); const fairyPoints = new Float32Array(36 * 3);
    for (let i = 0; i < 36; i++) {
      const ringIndex = i % 12, layer = Math.floor(i / 12), angle = ringIndex * Math.PI * 2 / 12 + layer * .19;
      const ring = [.58, .42, .3][layer];
      fairyPoints.set([Math.cos(angle) * ring, .34 + layer * .28 + (ringIndex % 4) * .16, Math.sin(angle) * ring], i * 3);
    }
    fairyGeometry.setAttribute('position', new THREE.BufferAttribute(fairyPoints, 3));
    this.fairyMaterial = new THREE.PointsMaterial({ color: '#fff6bd', size: .115, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    this.fairyLights = new THREE.Points(fairyGeometry, this.fairyMaterial);
    this.fairyLights.position.set(layout.inward[0] * layout.landmarkAt, .48, layout.inward[1] * layout.landmarkAt); this.fairyLights.visible = false; this.group.add(this.fairyLights);
    this.upgradeGlowTime = 0; this.upgradePulse = 0; this.isUpgraded = false;
  }
  sync(space, players) {
    const holder = space.owner === undefined || space.owner === null ? null : players.find(p => p.id === space.owner);
    this.owner.visible = Boolean(holder);
    if (holder) this.owner.material.color.set(holder.color);
    if (this.ownable) {
      this.body.material.color.copy(this.baseColor);
      this.label.material.color.set('#ffffff');
      if (holder) {
        // The printed face takes the lighter share so its name and price stay readable.
        tint.set(holder.color);
        this.body.material.color.lerp(tint, 0.78);
        this.label.material.color.lerp(tint, 0.5);
      }
    }
    const upgraded = Boolean(space.building);
    this.upgrade.visible = upgraded;
    // Saved upgrades receive the same gentle entrance as upgrades made this turn.
    if (upgraded && !this.isUpgraded) { this.upgradeGlowTime = 1.4; this.fairyLights.visible = true; }
    if (!upgraded) { this.fairyLights.visible = false; this.fairyMaterial.opacity = 0; }
    this.isUpgraded = upgraded;
  }
  playUpgradeGlow() { this.upgradeGlowTime = 1.9; this.fairyLights.visible = true; }
  update(delta) {
    if (!this.isUpgraded) return;
    this.upgradePulse += delta;
    if (this.upgradeGlowTime > 0) {
      this.upgradeGlowTime = Math.max(0, this.upgradeGlowTime - delta);
      const appeared = 1 - this.upgradeGlowTime / 1.9;
      const ease = 1 - (1 - appeared) * (1 - appeared);
      this.fairyLights.scale.setScalar(.68 + ease * .32);
      this.fairyMaterial.opacity = ease * .96;
      this.upgradeMaterial.emissiveIntensity = .42 + ease * .42;
      return;
    }
    // Small warm fairy lights remain around the model without altering its materials.
    const pulse = 1 + Math.sin(this.upgradePulse * 2.2) * .07;
    this.fairyLights.visible = true; this.fairyLights.rotation.y += delta * .55; this.fairyLights.scale.setScalar(pulse);
    this.fairyMaterial.opacity = .72 + Math.sin(this.upgradePulse * 3.8) * .18;
    this.upgradeMaterial.emissiveIntensity = .55 + Math.sin(this.upgradePulse * 2.2) * .08;
  }
  dispose() {
    this.label.geometry.dispose(); this.owner.material.dispose(); this.upgradeMaterial.dispose(); this.fairyLights.geometry.dispose(); this.fairyMaterial.dispose();
    if (this.ownable) { this.body.material.dispose(); this.label.material.dispose(); }
  }
}
