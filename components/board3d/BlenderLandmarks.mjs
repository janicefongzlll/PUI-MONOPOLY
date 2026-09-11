import * as THREE from '../../vendor/three.module.min.js';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { mergeGeometries } from '../../vendor/BufferGeometryUtils.js';
import { landmarkVisuals } from './landmarkVisuals.mjs';

// Stable property names select art. Positions, prices and saved state remain engine-owned.
export const BLENDER_LANDMARKS = Object.freeze({
  'Taipei 101': 'taipei-101',
  'Petronas Twin Towers': 'petronas-twin-towers',
  'Marina Bay Sands': 'marina-bay-sands',
  'Burj Khalifa': 'burj-khalifa',
  'Eiffel Tower': 'eiffel-tower',
  'Sagrada Família': 'sagrada-familia',
  'Colosseum': 'colosseum',
  'Big Ben': 'big-ben',
  'Acropolis': 'acropolis',
  'Christ the Redeemer': 'christ-the-redeemer',
  'Machu Picchu': 'machu-picchu',
  'Taj Mahal': 'taj-mahal',
  'Angkor Wat': 'angkor-wat',
  'Sydney Opera House': 'sydney-opera-house',
  'Golden Gate Bridge': 'golden-gate-bridge',
  'Statue of Liberty': 'statue-of-liberty',
  'Moai of Rapa Nui': 'moai-of-rapa-nui',
  'Chichén Itzá': 'chichen-itza',
  'Pyramids of Giza': 'pyramids-of-giza',
  'Neuschwanstein Castle': 'neuschwanstein-castle',
  'Mount Fuji': 'mount-fuji',
  'Great Wall of China': 'great-wall-of-china',
  'Hagia Sophia': 'hagia-sophia',
  'Grand Canyon': 'grand-canyon'
});

export function landmarkAssetSpecs(spaces) {
  let station = 0;
  return spaces.map((space, index) => {
    let id = BLENDER_LANDMARKS[space.name];
    if (space.type === 'jail') id = 'jail';
    if (space.type === 'go-jail') id = 'go-to-jail';
    if (space.type === 'station') id = station++ === 0 ? 'transit-station-west' : 'transit-station-east';
    return id ? { id, index, height: landmarkVisuals[space.name]?.height ?? (space.type === 'station' ? 1.05 : 1.35) } : null;
  }).filter(Boolean);
}

const materialKey = m => [m.color.getHexString(), m.roughness, m.metalness,
  m.emissive.getHexString(), m.emissiveIntensity, m.opacity, m.side].join('/');

export function disposeLoadedLandmark(root) {
  const geometries = new Set(), materials = new Set();
  root.traverse(node => {
    if (!node.isMesh) return;
    geometries.add(node.geometry);
    (Array.isArray(node.material) ? node.material : [node.material]).forEach(m => materials.add(m));
  });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
}

// Bake the GLB's transforms once. Faces carry their tile index even after batching,
// so tapping a tower or train still opens the correct existing property panel.
export function prepareLandmark(root, tile, spec) {
  root.updateMatrixWorld(true);
  const source = new THREE.Box3().setFromObject(root);
  const size = source.getSize(new THREE.Vector3()), centre = source.getCenter(new THREE.Vector3());
  if (!Number.isFinite(size.length()) || Math.min(size.x, size.y, size.z) <= 0) throw new Error(`Invalid model bounds: ${spec.id}`);
  const tileScale = Math.min(tile.alongSize, tile.radialSize) / 2.3;
  const scale = Math.min(tileScale, spec.height * tileScale / size.y,
    1.76 * tileScale / size.x, .84 * tileScale / size.z);
  const transform = new THREE.Matrix4().compose(
    new THREE.Vector3(tile.x + tile.inward[0] * tile.landmarkAt, .43, tile.z + tile.inward[1] * tile.landmarkAt),
    // Blender -Y is glTF +Z: make each entrance face the tokens, on all four edges.
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -tile.rotation),
    new THREE.Vector3(scale, scale, scale)
  ).multiply(new THREE.Matrix4().makeTranslation(-centre.x, -source.min.y, -centre.z));
  const parts = [];
  root.traverse(node => {
    if (!node.isMesh) return;
    const geometry = node.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(transform, node.matrixWorld));
    // These authored GLBs use one material per glTF primitive, with no textures/skins.
    for (const name of Object.keys(geometry.attributes)) if (!['position', 'normal'].includes(name)) geometry.deleteAttribute(name);
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    geometry.setAttribute('landmarkTile', new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count).fill(spec.index), 1));
    parts.push({ geometry, material: node.material, key: materialKey(node.material) });
  });
  return { parts, dimensions: size.multiplyScalar(scale) };
}

export class BlenderLandmarks {
  constructor({ scene, spaces, layout, onReady, onProgress, onModel, onMissing, fetchAsset = (url, options) => fetch(url, options) }) {
    this.group = new THREE.Group(); this.group.name = 'Blender landmark collection'; scene.add(this.group);
    this.specs = landmarkAssetSpecs(spaces); this.layout = layout;
    this.abort = new AbortController(); this.disposed = false; this.materials = new Map();
    this.onModel = onModel; this.onMissing = onMissing; this.onProgress = onProgress;
    this.fetchAsset = fetchAsset; this.loader = new GLTFLoader();
    this.ready = this.load().then(result => { if (!this.disposed) onReady?.(result); return result; });
  }

  async read(spec) {
    const url = new URL(`../../assets/models/landmarks/${spec.id}.glb`, import.meta.url);
    const controller = new AbortController();
    const cancel = () => controller.abort();
    this.abort.signal.addEventListener('abort', cancel, { once: true });
    const timeout = setTimeout(cancel, 20000);
    try {
      const response = await this.fetchAsset(url.href, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${spec.id}`);
      const data = await response.arrayBuffer();
      if (this.disposed) return null;
      return (await this.loader.parseAsync(data, new URL('.', url).href)).scene;
    } finally {
      clearTimeout(timeout); this.abort.signal.removeEventListener('abort', cancel);
    }
  }

  async load() {
    const buckets = new Map(), missing = [];
    let cursor = 0, loaded = 0, finished = 0;
    const worker = async () => {
      while (!this.disposed && cursor < this.specs.length) {
        const spec = this.specs[cursor++]; let root;
        try {
          root = await this.read(spec);
          if (!root || this.disposed) continue;
          const { parts, dimensions } = prepareLandmark(root, this.layout[spec.index], spec);
          for (const part of parts) {
            if (!this.materials.has(part.key)) this.materials.set(part.key, part.material.clone());
            const group = buckets.get(part.key) || [];
            group.push(part.geometry); buckets.set(part.key, group);
          }
          this.onModel?.(spec.index, dimensions); loaded++;
        } catch (error) {
          if (!this.disposed) { missing.push(spec); console.warn(`Blender landmark failed to load: ${spec.id}`, error); }
        } finally {
          if (root) disposeLoadedLandmark(root);
          finished++; if (!this.disposed) this.onProgress?.(finished, this.specs.length);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, this.specs.length) }, worker));
    for (const [key, geometries] of buckets) {
      if (!this.disposed) {
        const geometry = mergeGeometries(geometries, false);
        if (geometry) {
          geometry.computeBoundingSphere();
          const mesh = new THREE.Mesh(geometry, this.materials.get(key));
          mesh.name = `Landmark material · ${key}`; mesh.castShadow = true; mesh.receiveShadow = true;
          this.group.add(mesh);
        }
      }
      geometries.forEach(g => g.dispose());
    }
    if (!this.disposed) missing.forEach(spec => this.onMissing?.(spec.index));
    return { loaded, total: this.specs.length, missing: missing.map(s => s.id), drawCalls: this.group.children.length };
  }

  tileFromHit(hit) {
    return hit?.face ? hit.object.geometry.getAttribute('landmarkTile')?.getX(hit.face.a) : undefined;
  }

  dispose() {
    this.disposed = true; this.abort.abort(); this.group.removeFromParent();
    this.group.children.forEach(mesh => mesh.geometry.dispose()); this.group.clear();
    this.materials.forEach(m => m.dispose()); this.materials.clear();
  }
}
