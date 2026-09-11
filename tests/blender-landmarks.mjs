// Real exported GLBs through the production loader. No browser/account writes.
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../vendor/three.module.min.js';
import { createBoardLayout } from '../components/board3d/boardLayout.mjs';
import { BlenderLandmarks, BLENDER_LANDMARKS, landmarkAssetSpecs } from '../components/board3d/BlenderLandmarks.mjs';

globalThis.ProgressEvent ??= class { constructor(type, values) { this.type = type; Object.assign(this, values); } };
const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const data = vm.runInNewContext(source.slice(0, source.indexOf('// Saves carry')) + '\nJSON.stringify({spaces,corners:cornerAt})');
const { spaces, corners } = JSON.parse(data), before = JSON.stringify(spaces);
const layout = createBoardLayout(spaces, corners), specs = landmarkAssetSpecs(spaces);
assert.equal(specs.length, 28);
assert.equal(new Set(specs.map(s => s.id)).size, 28);
assert.deepEqual(Object.keys(BLENDER_LANDMARKS), spaces.filter(s => s.price !== undefined).map(s => s.name));
assert.deepEqual(specs.filter(s => s.id.startsWith('transit')).map(s => s.index), [6, 16]);
assert.equal(specs.find(s => s.id === 'jail').index, 10);
assert.equal(specs.find(s => s.id === 'go-to-jail').index, 28);

const fetchAsset = async url => {
  const b = readFileSync(new URL(url));
  return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) };
};
const scene = new THREE.Scene(), dimensions = new Map(), missing = [];
const layer = new BlenderLandmarks({ scene, spaces, layout, fetchAsset,
  onModel: (index, size) => dimensions.set(index, size), onMissing: index => missing.push(index) });
const result = await layer.ready;
assert.equal(result.loaded, 28); assert.equal(result.total, 28); assert.deepEqual(missing, []);
assert.ok(result.drawCalls <= 40, `bounded material batches: ${result.drawCalls}`);
let triangles = 0, bytes = 0;
const tileBounds = new Map();
for (const mesh of layer.group.children) {
  assert.ok(mesh.material.isMeshStandardMaterial);
  assert.equal(mesh.layers.mask, 1, 'landmarks never join the token overlay layer');
  const positions = mesh.geometry.attributes.position, indices = mesh.geometry.attributes.landmarkTile;
  triangles += mesh.geometry.index.count / 3;
  for (let i = 0; i < positions.count; i++) {
    const tileIndex = indices.getX(i), tile = layout[tileIndex];
    assert.ok(specs.some(s => s.index === tileIndex));
    const box = tileBounds.get(tileIndex) || new THREE.Box3();
    const point = new THREE.Vector3().fromBufferAttribute(positions, i);
    point.x -= tile.x + tile.inward[0] * tile.landmarkAt;
    point.z -= tile.z + tile.inward[1] * tile.landmarkAt;
    point.applyAxisAngle(new THREE.Vector3(0, 1, 0), tile.rotation);
    box.expandByPoint(point); tileBounds.set(tileIndex, box);
  }
  const i = mesh.geometry.index.getX(0);
  assert.equal(layer.tileFromHit({object: mesh, face: {a: i}}), indices.getX(i), 'batched picking preserves the space identity');
}
assert.equal(tileBounds.size, 28);
for (const spec of specs) {
  const box = tileBounds.get(spec.index), scale = 4.9 / 2.3;
  assert.ok(box.min.x >= -.88 * scale - .001 && box.max.x <= .88 * scale + .001, `${spec.id}: width`);
  assert.ok(box.min.z >= -.42 * scale - .001 && box.max.z <= .42 * scale + .001, `${spec.id}: depth`);
  assert.ok(Math.abs(box.min.y - .43) < .001, `${spec.id}: rests on tile`);
  assert.ok(box.max.y <= .43 + spec.height * scale + .001, `${spec.id}: height`);
  assert.ok(dimensions.get(spec.index).y > 0);
  bytes += statSync(new URL(`../assets/models/landmarks/${spec.id}.glb`, import.meta.url)).size;
}
assert.ok(triangles < 150000, `mobile geometry budget: ${triangles}`);
assert.ok(bytes < 6 * 1024 * 1024, `download budget: ${bytes}`);
assert.equal(JSON.stringify(spaces), before, 'art loading never changes gameplay data');
layer.dispose(); assert.equal(scene.children.length, 0);

// A single missing file degrades only its tile and still completes loading.
const warn = console.warn; console.warn = () => {};
try {
  const fallback = [];
  const partial = new BlenderLandmarks({ scene, spaces, layout,
    fetchAsset: url => url.includes('taipei-101') ? Promise.resolve({ok:false,status:404}) : fetchAsset(url),
    onMissing: index => fallback.push(index) });
  const r = await partial.ready;
  assert.equal(r.loaded, 27); assert.deepEqual(fallback, [1]);
  partial.dispose();
} finally { console.warn = warn; }

// Navigating away during download aborts requests and must not resurrect the scene.
let requests = 0, aborted = 0, callbacks = 0;
const cancelled = new BlenderLandmarks({ scene, spaces, layout,
  fetchAsset: (url, {signal}) => new Promise((resolve, reject) => {
    requests++; signal.addEventListener('abort', () => { aborted++; reject(new Error('aborted')); }, {once:true});
  }), onReady: () => callbacks++, onModel: () => callbacks++ });
cancelled.dispose(); await cancelled.ready;
assert.equal(requests, 4); assert.equal(aborted, 4); assert.equal(callbacks, 0);
assert.equal(scene.children.length, 0);
console.log(`PASS: 28 Blender assets; exact names/indices, four-edge fit, ground/height bounds, safe picking, failure fallback and disposal.`);
console.log(`PASS: ${triangles} triangles, ${result.drawCalls} material batches, ${(bytes / 1024 / 1024).toFixed(2)} MiB; gameplay data unchanged.`);
