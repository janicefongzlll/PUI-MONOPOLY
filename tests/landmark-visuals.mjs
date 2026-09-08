import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three.module.min.js';
import { BoardResources, StaticCityBatch } from '../components/board3d/resources.mjs';
import { addPropertyLandmark } from '../components/board3d/PropertyLandmark.mjs';
import { landmarkVisuals } from '../components/board3d/landmarkVisuals.mjs';

const source = readFileSync(new URL('../app.js',import.meta.url),'utf8');
const propertySource = source.split('const properties = [')[1].split('].map(')[0];
const names = [...propertySource.matchAll(/\["([^"]+)"/g)].map(m=>m[1]);
assert.equal(names.length,24);
assert.deepEqual(Object.keys(landmarkVisuals),names,'every existing property has its own named model');
assert.equal(new Set(Object.values(landmarkVisuals).map(v=>v.model)).size,24);
const resources = new BoardResources(), total = new StaticCityBatch(resources);
let parts=0,triangles=0;
for (const name of names) {
  const batch = new StaticCityBatch(resources);
  const tile = {x:0,z:0,inward:[0,-1],landmarkAt:0,rotation:0,alongSize:2.3,radialSize:2.3};
  const space=Object.freeze({name,price:100,color:'#ff00ff',art:0});
  addPropertyLandmark(batch,tile,space);
  const bounds=new THREE.Box3(), colors=new Set();
  batch.batches.forEach(({kind,color,transforms})=>{
    const geometry=resources.geometry(kind); geometry.computeBoundingBox(); colors.add(color);
    for(const matrix of transforms) bounds.union(geometry.boundingBox.clone().applyMatrix4(matrix));
    parts+=transforms.length; triangles+=(geometry.index?.count??geometry.attributes.position.count)/3*transforms.length;
  });
  assert.ok(colors.size>=3,`${name} uses at least three architectural colours`);
  assert.ok(!colors.has(space.color),`${name} never uses the property colour as its material`);
  assert.ok(bounds.min.x>=-.91&&bounds.max.x<=.91&&bounds.min.z>=-.43&&bounds.max.z<=.43,`${name} fits its original footprint: ${JSON.stringify(bounds)}`);
  assert.ok(bounds.min.y>=.42&&bounds.max.y<=2.8,`${name} sits on the tile with a bounded height`);
  addPropertyLandmark(total,tile,space);
  console.log(`${name}: ${colors.size} colours, height ${(bounds.max.y-.43).toFixed(2)}`);
}
assert.ok(parts<1400,'architectural parts stay within the lightweight scene budget');
assert.ok(triangles<150000,'landmark triangle count is bounded');
assert.ok(total.batches.size<200,'repeated parts and materials share draw calls');
const scene=new THREE.Scene();
total.build(scene);
assert.equal(scene.children.length,total.batches.size,'one instanced draw mesh per shared batch');
assert.ok(scene.children.every(mesh=>mesh.isInstancedMesh),'all architectural pieces use instancing');
assert.ok(scene.children.some(mesh=>mesh.material.emissiveIntensity===.22),'warm windows use a restrained emissive material');
assert.ok(scene.children.every(mesh=>mesh.material.isMeshStandardMaterial),'all models retain the existing lit material system');
console.log(`PASS: 24 unique models, safe footprints; ${parts} parts, ${Math.round(triangles)} triangles, ${total.batches.size} instanced batches`);
resources.dispose();
