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
  // Palm-oil scenery replaces the former skyline. It lives inside the centre park and
  // is deliberately lower than the title, so it remains clearly decorative.
  const tilt = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)).toArray();
  const palm = (x, z, height = 1.25) => {
    batch.add('cylinder', '#7a5130', [x, height / 2, z], [.075, height, .075]);
    batch.add('sphere', '#527b34', [x, height + .03, z], [.24, .13, .24]);
    for (let i = 0; i < 7; i++) {
      const angle = i * Math.PI * 2 / 7;
      batch.add('cone', i % 2 ? '#3f7838' : '#60953f', [x + Math.sin(angle) * .24, height + .04, z + Math.cos(angle) * .24], [.12, .52, .12], tilt(Math.PI / 2.75, angle, 0));
    }
    batch.add('sphere', '#c87932', [x, height + .01, z], [.075, .06, .075]);
  };
  const mill = (x, z, mirror = 1) => {
    batch.add('box', '#e1cfa6', [x, .38, z], [1.65 * sx, .76, 1.25 * sz]);
    batch.add('box', '#386846', [x, .8, z], [1.78 * sx, .14, 1.38 * sz]);
    batch.add('box', '#b5843c', [x + mirror * .48 * sx, .32, z + .66 * sz], [.36 * sx, .42, .035]);
    for (const offset of [-.42, -.08, .27]) {
      batch.add('cylinder', '#aab7ad', [x + offset * sx, .78, z - .16 * sz], [.19, 1.28, .19]);
      batch.add('cone', '#6b7c73', [x + offset * sx, 1.47, z - .16 * sz], [.205, .16, .205]);
    }
    batch.add('cylinder', '#8c5940', [x - mirror * .58 * sx, 1.1, z], [.08, 1.45, .08]);
    batch.add('cone', '#384d4b', [x - mirror * .58 * sx, 1.86, z], [.12, .18, .12]);
  };
  const tractor = (x, z, direction = 1) => {
    const wheel = (dx, radius) => batch.add('cylinder', '#263a38', [x + dx * direction, radius, z], [radius, .11, radius], tilt(0, 0, Math.PI / 2));
    wheel(-.31, .17); wheel(.31, .11);
    batch.add('box', '#387b48', [x, .25, z], [.72, .28, .38]);
    batch.add('box', '#e0ad3d', [x - direction * .13, .47, z], [.27, .25, .34]);
    batch.add('box', '#8dc4c5', [x - direction * .13, .54, z + .01], [.18, .14, .35]);
    batch.add('box', '#f0c64e', [x + direction * .42, .28, z], [.2, .1, .28]);
  };
  const pond = (x, z, width, depth) => {
    // A flat water lens and a stone rim give the ponds a readable miniature silhouette.
    batch.add('ring', '#8da99e', [x, .125, z], [width, depth, 1], tilt(Math.PI / 2, 0, 0));
    batch.add('sphere', '#4a9bb0', [x, .11, z], [width * .82, .045, depth * .82]);
    batch.add('sphere', '#6cad52', [x - width * .18, .16, z + depth * .14], [.09, .018, .09]);
    batch.add('cylinder', '#52733e', [x + width * .24, .18, z - depth * .18], [.022, .15, .022]);
  };
  mill(-4.4 * sx, -5.45 * sz); mill(4.4 * sx, -5.45 * sz, -1);
  [-2.9, -2, -1.1, 1.1, 2, 2.9].forEach((x, i) => palm(x * sx, -5.35 * sz + (i % 2 ? .35 : -.26) * sz, 1.05 + (i % 3) * .16));
  tractor(-1.65 * sx, -4.65 * sz); tractor(1.5 * sx, -5.1 * sz, -1);
  pond(-3.2 * sx, -2.25 * sz, .72 * sx, .4 * sz);
  pond(3.3 * sx, -2.35 * sz, .62 * sx, .35 * sz);
  pond(0, -4.3 * sz, .58 * sx, .32 * sz);
  for (let i = 0; i < 12; i++) {
    const x = (i % 6 - 2.5) * 2.7 * sx, z = (i < 6 ? 7.2 : -8.15) * sz;
    palm(x, z, .82 + (i % 2) * .13);
  }
  return { dispose() { title.geometry.dispose(); titleMaterial.dispose(); } };
}
