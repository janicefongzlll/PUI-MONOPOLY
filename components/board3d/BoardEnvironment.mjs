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
  // A single mill complex following the MJM Mill reference: a long clerestory shed with a
  // press house and kernel store, boiler stacks, a covered FFB ramp, a tank farm, and a
  // working apron. Offsets are in park units so the whole site follows the park's scale.
  const vents = [];
  const mill = (x, z) => {
    const px = v => x + v * sx, pz = v => z + v * sz;
    const EAVE = 1.05, RISE = .42;
    const halfDepth = .85 * sz, slope = Math.hypot(halfDepth, RISE), pitch = Math.atan2(RISE, halfDepth);
    // Processing shed: walls, fascia, a pitched roof, then the raised clerestory ridge.
    batch.add('box', '#d8cba6', [x, .48, z], [5.0 * sx, .96, 1.7 * sz]);
    batch.add('box', '#8a7a49', [x, 1.0, z], [5.12 * sx, .09, 1.86 * sz]);
    for (const side of [-1, 1]) {
      batch.add('box', '#b8a468', [x, EAVE + RISE / 2, z + side * halfDepth / 2],
                [5.06 * sx, .075, slope], tilt(side * pitch, 0, 0));
    }
    batch.add('box', '#b09462', [x, EAVE + RISE + .17, z], [3.8 * sx, .34, .6 * sz]);
    batch.add('box', '#b8a468', [x, EAVE + RISE + .38, z], [3.92 * sx, .075, .74 * sz]);
    // Press house stepping down to the left, kernel store to the right.
    batch.add('box', '#d8cba6', [px(-3.3), .33, pz(.15)], [1.9 * sx, .66, 1.35 * sz]);
    batch.add('box', '#b8a468', [px(-3.3), .72, pz(.15)], [2.02 * sx, .08, 1.5 * sz]);
    batch.add('box', '#d8cba6', [px(3.15), .27, pz(.3)], [1.4 * sx, .54, 1.1 * sz]);
    batch.add('box', '#b6c0c1', [px(3.15), .58, pz(.3)], [1.52 * sx, .07, 1.22 * sz]);
    // Boiler stacks, the rust flue, and the ducting that ties them to the shed.
    // The stacks clear the clerestory by a good margin, as they do on the real mill.
    for (const [dx, height] of [[.55, 2.9], [1.02, 3.15]]) {
      batch.add('cylinder', '#4b5257', [px(dx), height / 2, pz(-.62)], [.095, height, .095], 0, 'metal');
      batch.add('cylinder', '#9aa4a6', [px(dx), height - .14, pz(-.62)], [.112, .12, .112], 0, 'metal');
      vents.push([px(dx), height, pz(-.62)]);
    }
    batch.add('cylinder', '#9c4526', [px(-1.55), 1.15, pz(-.66)], [.13, 2.3, .13]);
    batch.add('cylinder', '#9aa4a6', [px(-1.55), 2.36, pz(-.66)], [.15, .11, .15], 0, 'metal');
    vents.push([px(-1.55), 2.3, pz(-.66)]);
    batch.add('cylinder', '#7c8a8e', [px(.05), .8, pz(-.62)], [.075, 1.15 * sx, .075], tilt(0, 0, Math.PI / 2), 'metal');
    // Tank farm on its concrete pad.
    batch.add('box', '#9d9a90', [px(4.85), .04, pz(-.1)], [2.6 * sx, .08, 2.4 * sz]);
    for (const [tx, tz, tr] of [[4.15, .55, .34], [5.55, .5, .3], [4.9, -.78, .36]]) {
      batch.add('cylinder', '#8fb2c0', [px(tx), .44, pz(tz)], [tr, .88, tr], 0, 'metal');
      batch.add('cylinder', '#6f93a3', [px(tx), .5, pz(tz)], [tr * 1.05, .05, tr * 1.05], 0, 'metal');
      batch.add('cylinder', '#6f93a3', [px(tx), .88, pz(tz)], [tr * 1.05, .06, tr * 1.05], 0, 'metal');
      batch.add('cone', '#6f93a3', [px(tx), .98, pz(tz)], [tr, .18, tr], 0, 'metal');
    }
    // Covered FFB ramp on open posts, feeding the press house.
    batch.add('box', '#9d9a90', [px(-5.05), .13, pz(1.0)], [2.3 * sx, .26, .6 * sz]);
    for (let i = 0; i < 5; i++) {
      const postX = -5.95 + i * .45;
      for (const side of [-1, 1]) batch.add('box', '#9c8358', [px(postX), .32, pz(1.0 + side * .26)], [.05, .64, .05]);
    }
    batch.add('box', '#b8a468', [px(-5.05), .68, pz(1.0)], [2.42 * sx, .07, .82 * sz]);
    batch.add('box', '#8a7a49', [px(-3.95), .8, pz(.62)], [1.0 * sx, .16, .2 * sz], tilt(0, .48, 0));
    // Apron with tipped fruit bunches.
    batch.add('box', '#9d9a90', [px(.2), .03, pz(1.9)], [7.0 * sx, .06, 1.7 * sz]);
    for (const [hx, hz, s] of [[-2.5, 1.55, 1], [-1.4, 1.95, .8], [-.3, 1.6, .9], [.9, 2.0, .72]]) {
      batch.add('cone', '#8c3410', [px(hx), .06 + .17 * s, pz(hz)], [.36 * s, .34 * s, .3 * s]);
    }
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
  mill(0, -5.6 * sz); // fills `vents`, which the steam below rises from
  // The small palm cluster now flanks the mill rather than standing where it sits.
  [7.1, 8.3, 9.5].forEach((x, i) => {
    palm(x * sx, -5.4 * sz + (i % 2 ? .32 : -.3) * sz, 1.05 + (i % 3) * .16);
    palm(-x * sx, -5.4 * sz + (i % 2 ? -.3 : .32) * sz, 1.05 + ((i + 1) % 3) * .16);
  });
  tractor(-2.4 * sx, -3.55 * sz); tractor(2.2 * sx, -3.9 * sz, -1);
  pond(-3.2 * sx, -2.25 * sz, .72 * sx, .4 * sz);
  pond(3.3 * sx, -2.35 * sz, .62 * sx, .35 * sz);
  pond(0, -1.85 * sz, .55 * sx, .32 * sz);
  for (let i = 0; i < 12; i++) {
    const x = (i % 6 - 2.5) * 2.7 * sx, z = (i < 6 ? 7.2 : -8.15) * sz;
    palm(x, z, .82 + (i % 2) * .13);
  }
  // Steam off the boiler stacks. It stays out of the static batch so it can be soft and
  // moving. Each puff swells as it climbs and shrinks away again, so the loop never pops
  // and no per-instance opacity is needed.
  const PUFFS = 7;
  const steamGeometry = new THREE.SphereGeometry(1, 10, 6);
  const steamMaterial = new THREE.MeshStandardMaterial({
    color: '#eef3f4', roughness: 1, metalness: 0, transparent: true, opacity: .42, depthWrite: false
  });
  const steam = new THREE.InstancedMesh(steamGeometry, steamMaterial, vents.length * PUFFS);
  steam.castShadow = false; steam.receiveShadow = false; steam.frustumCulled = false;
  scene.add(steam);
  const puff = new THREE.Object3D();
  let drift = 0;
  const updateSteam = delta => {
    drift += delta;
    let i = 0;
    vents.forEach(([vx, vy, vz], v) => {
      for (let p = 0; p < PUFFS; p++) {
        const t = (drift * .21 + p / PUFFS + v * .13) % 1;
        const swell = Math.sin(t * Math.PI);
        puff.position.set(vx + t * .62 + Math.sin(t * 4.5 + v * 2) * .09,
                          vy + .1 + t * 1.55,
                          vz + t * .24 + Math.cos(t * 3.7 + v) * .05);
        puff.scale.setScalar(.05 + swell * (.15 + t * .22));
        puff.updateMatrix();
        steam.setMatrixAt(i++, puff.matrix);
      }
    });
    steam.instanceMatrix.needsUpdate = true;
  };
  updateSteam(0);

  return {
    update: updateSteam,
    dispose() {
      title.geometry.dispose(); titleMaterial.dispose();
      steamGeometry.dispose(); steamMaterial.dispose(); steam.dispose();
    }
  };
}
