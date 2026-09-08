import * as THREE from '../../vendor/three.module.min.js';

export class BoardResources {
  constructor() { this.geometries = new Map(); this.materials = new Map(); this.textures = []; }
  material(color, metalness = 0.1, roughness = 0.65) {
    const key = `${color}/${metalness}/${roughness}`;
    if (!this.materials.has(key)) this.materials.set(key, new THREE.MeshStandardMaterial({ color, metalness, roughness }));
    return this.materials.get(key);
  }
  tokenMaterial(url) {
    const key = `token/${url}`;
    if (!this.materials.has(key)) {
      const texture = new THREE.TextureLoader().load(url);
      texture.colorSpace = THREE.SRGBColorSpace;
      this.textures.push(texture);
      this.materials.set(key, new THREE.SpriteMaterial({
        map: texture, transparent: true, alphaTest: 0.15,
        depthWrite: false, toneMapped: false
      }));
    }
    return this.materials.get(key);
  }
  geometry(kind = 'box') {
    if (!this.geometries.has(kind)) {
      const geometry = kind === 'sphere' ? new THREE.SphereGeometry(1, 12, 8)
        : kind === 'cylinder' ? new THREE.CylinderGeometry(1, 1, 1, 20)
        : kind === 'cone' ? new THREE.ConeGeometry(1, 1, 8)
        : kind === 'ring' ? new THREE.TorusGeometry(1, 0.065, 6, 40)
        : new THREE.BoxGeometry(1, 1, 1);
      this.geometries.set(kind, geometry);
    }
    return this.geometries.get(kind);
  }
  roundedBox(width, height, depth, radius = 0.1) {
    const key = `rounded/${width}/${height}/${depth}/${radius}`;
    if (!this.geometries.has(key)) {
      const shape = new THREE.Shape();
      const x = -width / 2 + radius, z = -depth / 2 + radius;
      const w = width - radius * 2, d = depth - radius * 2;
      shape.moveTo(x, z); shape.lineTo(x + w, z); shape.lineTo(x + w, z + d); shape.lineTo(x, z + d); shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.03, height - radius * 2), bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: radius, bevelThickness: radius, curveSegments: 1 });
      geometry.rotateX(-Math.PI / 2); geometry.center();
      this.geometries.set(key, geometry);
    }
    return this.geometries.get(key);
  }
  mesh(kind, material, position, scale, parent, shadow = false) {
    const mesh = new THREE.Mesh(this.geometry(kind), material);
    mesh.position.set(...position); mesh.scale.set(...scale);
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  texture(canvas) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    this.textures.push(texture); return texture;
  }
  dispose() {
    this.geometries.forEach(value => value.dispose());
    this.materials.forEach(value => value.dispose());
    this.textures.forEach(value => value.dispose());
  }
}

// Repeated city geometry is batched by material to keep mobile draw calls low.
export class StaticCityBatch {
  constructor(resources) { this.resources = resources; this.batches = new Map(); this.dummy = new THREE.Object3D(); }
  add(kind, color, position, scale, rotation = 0, surface = 'default') {
    const key = `${kind}/${color}/${surface}`;
    if (!this.batches.has(key)) this.batches.set(key, { kind, color, surface, transforms: [] });
    this.dummy.position.set(...position); this.dummy.scale.set(...scale);
    if (Array.isArray(rotation)) this.dummy.quaternion.set(...rotation); else this.dummy.rotation.set(0, rotation, 0);
    this.dummy.updateMatrix();
    this.batches.get(key).transforms.push(this.dummy.matrix.clone());
  }
  build(parent) {
    this.batches.forEach(({ kind, color, surface, transforms }) => {
      const materialKey = `landmark/${color}/${surface}`;
      let material;
      if (surface !== 'default') {
        if (!this.resources.materials.has(materialKey)) this.resources.materials.set(materialKey,new THREE.MeshStandardMaterial({
          color, metalness: surface === 'metal' ? .55 : surface === 'glass' ? .3 : .06,
          roughness: surface === 'glass' ? .24 : surface === 'metal' ? .38 : .72,
          emissive: surface === 'lit' ? color : '#000000', emissiveIntensity: surface === 'lit' ? .22 : 0
        }));
        material = this.resources.materials.get(materialKey);
      } else material = this.resources.material(color);
      const mesh = new THREE.InstancedMesh(this.resources.geometry(kind), material, transforms.length);
      transforms.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
    });
  }
}

export function writeWrapped(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const words = text.split(' '); const lines = []; let line = '';
  words.forEach(word => {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = word; } else line = next;
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((value, i) => ctx.fillText(value, x, y + i * lineHeight));
}
