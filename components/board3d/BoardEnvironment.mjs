import * as THREE from '../../vendor/three.module.min.js';
import { TILE_DEPTH } from './boardLayout.mjs';
import { TOKEN_LAYER } from './PlayerToken3D.mjs';

export function createBoardEnvironment(scene, resources, batch, [spanX, spanZ]) {
  // Everything below the ring is sized from it, so changing the tile pitch cannot leave
  // the park short of the boxes or push the board out through the fog.
  const parkX = spanX - TILE_DEPTH * 2, parkZ = spanZ - TILE_DEPTH * 2;
  const reach = Math.max(spanX, spanZ);
  const sx = parkX / 21, sz = parkZ / 21; // the fixtures below were laid out for a 21-unit park
  scene.background = new THREE.Color('#142e33');
  scene.fog = new THREE.Fog('#142e33', reach * 1.6, reach * 4.2);
  const sky = new THREE.HemisphereLight('#ecfaff', '#526853', 2.5); scene.add(sky);
  const sun = new THREE.DirectionalLight('#fff2d6', 3.3);
  sun.position.set(-12, 25, 14); sun.castShadow = true;
  const shadowReach = Math.hypot(spanX, spanZ) / 2;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -shadowReach; sun.shadow.camera.right = shadowReach;
  sun.shadow.camera.top = shadowReach; sun.shadow.camera.bottom = -shadowReach; sun.shadow.camera.far = reach * 2.3;
  sun.shadow.normalBias = 0.06; sun.shadow.bias = -0.0002; scene.add(sun);
  const fill = new THREE.DirectionalLight('#b9e5f2', 1.1); fill.position.set(12, 10, -10); scene.add(fill);
  // The token overlay pass renders with only TOKEN_LAYER enabled, so lights must join it.
  [sky, sun, fill].forEach(light => light.layers.enable(TOKEN_LAYER));
  const ground = resources.mesh('box', resources.material('#19363a'), [0, -1.25, 0], [reach * 8, 0.1, reach * 8], scene);
  ground.receiveShadow = true;
  const plinth = new THREE.Mesh(resources.roundedBox(spanX + 1, 0.85, spanZ + 1, 0.2), resources.material('#164c46', 0.35));
  plinth.position.y = -0.55; plinth.receiveShadow = true; scene.add(plinth);
  const trim = new THREE.Mesh(resources.roundedBox(spanX + 0.6, 0.08, spanZ + 0.6, 0.03), resources.material('#ba9c59', 0.65));
  trim.position.y = -0.13; scene.add(trim);
  const park = new THREE.Mesh(resources.roundedBox(parkX, 0.18, parkZ, 0.08), resources.material('#497b66'));
  park.position.y = -0.02; park.receiveShadow = true; scene.add(park);
  const plaza = new THREE.Mesh(resources.roundedBox(12 * sx, 0.16, 7 * sz, 0.08), resources.material('#194c46', 0.25));
  plaza.position.set(0, 0.1, 1.8 * sz); plaza.receiveShadow = true; scene.add(plaza);
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#e9e7ce'; ctx.textAlign = 'center';
  ctx.font = '700 106px sans-serif'; ctx.fillText('PUI', 512, 183);
  ctx.fillStyle = '#dbbb72'; ctx.font = '800 120px sans-serif'; ctx.fillText('FORTUNE', 512, 318);
  ctx.fillStyle = '#afcabe'; ctx.font = '500 26px sans-serif'; ctx.fillText('BUY  ·  TRADE  ·  BUILD', 512, 410);
  const titleMaterial = new THREE.MeshBasicMaterial({ map: resources.texture(canvas), transparent: true, depthWrite: false, toneMapped: false });
  const title = new THREE.Mesh(new THREE.PlaneGeometry(11 * sx, 5.5 * sz), titleMaterial);
  title.rotation.x = -Math.PI / 2; title.position.set(0, 0.2, 1.8 * sz); scene.add(title);
  // A compact skyline leaves the central title and the playing ring unobstructed.
  for (let i = 0; i < 9; i++) {
    const x = (i - 4) * 1.25 * sx, z = -5.2 * sz, height = [1.3, 2.2, 1.7, 3.1, 4, 2.8, 1.5, 2.1, 1.1][i];
    batch.add('box', i % 2 ? '#438b9a' : '#d9e2dc', [x, height / 2, z], [0.9 * sx, height, 0.9 * sz]);
    batch.add('box', '#d4b266', [x, height + 0.1, z], [0.95 * sx, 0.18, 0.95 * sz]);
    const face = z + 0.9 * sz / 2 + 0.01;
    for (let j = 0; j < Math.floor(height * 2); j++) batch.add('box', '#255b58', [x, 0.35 + j * 0.42, face], [0.62 * sx, 0.1, 0.035]);
  }
  for (let i = 0; i < 16; i++) {
    const x = (i % 8 - 3.5) * 2.05 * sx, z = (i < 8 ? 7.2 : -8.1) * sz;
    batch.add('cylinder', '#826444', [x, 0.26, z], [0.1, 0.5, 0.1]);
    batch.add('sphere', '#4f8f6b', [x, 0.7, z], [0.42, 0.56, 0.42]);
  }
  return { dispose() { title.geometry.dispose(); titleMaterial.dispose(); } };
}
