import * as THREE from '../../vendor/three.module.min.js';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { mergeGeometries } from '../../vendor/BufferGeometryUtils.js';
import { TILE_DEPTH } from './boardLayout.mjs';
import { TOKEN_LAYER } from './PlayerToken3D.mjs';

// The centre park is the MJM mill site authored in Blender (blender-models/palm_oil_mill.blend).
// It is loaded as-is from the exported GLB, so the board shows exactly what the Blender file
// renders. The site was modelled inside a 130.3 x 101.5 m frame centred on (14.9, -13), which
// maps onto the park; the glTF exporter already turned Blender's Z-up into Y-up.
const SITE_URL = new URL('../../assets/models/palm_oil_mill.glb', import.meta.url).href;
const SITE_FRAME = { x: 14.9, y: -13, width: 130.3, depth: 101.5 };
const SITE_CLIP_SECONDS = 240 / 24; // every vehicle loop is 240 frames at 24 fps and returns to its start
// Every chimney and vent that smokes, in Blender coordinates (x, y, z, plume size). The Blender
// file models its plumes as static blobs, which are stripped from the export so the live puffs
// below can rise from the same mouths. The steam is parented to the site group, so it inherits
// the same scale and placement as the stacks it rises from.
const VENTS = [
  [3.55, 11.65, 15.5, 1], [6.35, 11.65, 16.4, 1],   // boiler stacks
  [-12.55, 14.25, 12.0, .9],                        // rust flue
  [-16, 16, 20.3, 1.1],                             // square stack
  // The two process vents replace the Blender file's own plumes, which were far broader
  // than the chimney wisps, so they keep that size.
  [10, 20, 2.0, 2.4], [-40, 21, 1.7, 2.4]
];

// The eleven palms arrive as forty-odd separate meshes, one per tree per material. They never
// move, so merging them by material turns all of that into four draw calls.
function mergePalms(model, named) {
  const groups = new Map();
  model.updateWorldMatrix(false, true);
  model.traverse(node => {
    if (!node.isMesh || !named(node).startsWith('OilPalm')) return;
    const batch = groups.get(node.material) || { material: node.material, geometries: [], nodes: [] };
    const geometry = node.geometry.clone();
    geometry.applyMatrix4(new THREE.Matrix4().copy(model.matrixWorld).invert().multiply(node.matrixWorld));
    batch.geometries.push(geometry); batch.nodes.push(node);
    groups.set(node.material, batch);
  });
  groups.forEach(({ material, geometries, nodes }) => {
    if (geometries.length < 2) return;
    const merged = mergeGeometries(geometries, false);
    geometries.forEach(geometry => geometry.dispose());
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = false; mesh.receiveShadow = true;
    model.add(mesh);
    nodes.forEach(node => { node.geometry.dispose(); node.removeFromParent(); });
  });
  model.children.filter(child => child.isGroup && !child.children.length).forEach(child => child.removeFromParent());
}

export function createBoardEnvironment(scene, resources, batch, [spanX, spanZ]) {
  // Everything below the ring is sized from it, so changing the tile pitch cannot leave
  // the park short of the boxes or push the board out through the fog.
  const parkX = spanX - TILE_DEPTH * 2, parkZ = spanZ - TILE_DEPTH * 2;
  const reach = Math.max(spanX, spanZ);
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

  // The site group scales the Blender metres down so the modelled frame fills the park exactly,
  // and slides the frame centre onto the park centre. Blender (x, y, z) arrives as (x, z, -y).
  const scale = Math.min(parkX / SITE_FRAME.width, parkZ / SITE_FRAME.depth);
  const site = new THREE.Group();
  site.scale.setScalar(scale);
  site.position.set(-SITE_FRAME.x * scale, 0.07, SITE_FRAME.y * scale);
  scene.add(site);

  // Landmarks the opening fly-through visits, converted from Blender metres to board units.
  const toWorld = (bx, by, bz) => new THREE.Vector3(site.position.x + bx * scale, site.position.y + bz * scale, site.position.z - by * scale);
  const points = { plaque: toWorld(38, -44, 1.5), mill: toWorld(-1.05, 8.05, 7), silos: toWorld(-0.5, 24, 11) };

  // Steam off the boiler stacks. It stays out of the GLB so it can be soft and moving. Each puff
  // swells as it climbs and shrinks away again, so the loop never pops and no per-instance
  // opacity is needed. Sizes are in Blender metres because the mesh lives inside the site group.
  const PUFFS = 7;
  const steamGeometry = new THREE.SphereGeometry(1, 10, 6);
  const steamMaterial = new THREE.MeshStandardMaterial({
    color: '#eef3f4', roughness: 1, metalness: 0, transparent: true, opacity: .42, depthWrite: false
  });
  const steam = new THREE.InstancedMesh(steamGeometry, steamMaterial, VENTS.length * PUFFS);
  steam.castShadow = false; steam.receiveShadow = false; steam.frustumCulled = false;
  site.add(steam);
  const puff = new THREE.Object3D();
  let drift = 0;
  const updateSteam = delta => {
    drift += delta;
    let i = 0;
    VENTS.forEach(([vx, vy, vz, size], v) => {
      for (let p = 0; p < PUFFS; p++) {
        const t = (drift * .21 + p / PUFFS + v * .13) % 1;
        const swell = Math.sin(t * Math.PI);
        puff.position.set(vx + (t * 1.8 + Math.sin(t * 4.5 + v * 2) * .25) * size,
                          vz + .3 + t * 4.5 * size,
                          -(vy + (t * .7 + Math.cos(t * 3.7 + v) * .15) * size));
        puff.scale.setScalar((.15 + swell * (.45 + t * .65)) * size);
        puff.updateMatrix();
        steam.setMatrixAt(i++, puff.matrix);
      }
    });
    steam.instanceMatrix.needsUpdate = true;
  };
  updateSteam(0);

  // The GLB arrives asynchronously; until then the park is plain grass. Vehicles play their
  // baked loops through one mixer. The static Blender steam blob is dropped for the live puffs.
  let mixer = null, model = null, disposed = false;
  new GLTFLoader().load(SITE_URL, gltf => {
    if (disposed) return;
    model = gltf.scene;
    // Multi-material objects arrive split into child meshes named after the mesh data, so the
    // name that says what a mesh belongs to is the one on its top-level node.
    const named = node => { let owner = node; while (owner.parent && owner.parent !== model) owner = owner.parent; return owner.name || ''; };
    model.traverse(node => {
      if (!node.isMesh) return;
      // Only the buildings cast. The shadow map is static and redrawn rarely, so a moving
      // vehicle would leave its shadow behind anyway, and the palms cost more than they add.
      node.castShadow = named(node).startsWith('PalmOilMill'); node.receiveShadow = true;
    });
    mergePalms(model, named);
    site.add(model);
    mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach(clip => mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity).play());
    mixer.setTime(drift % SITE_CLIP_SECONDS);
    scene.dispatchEvent({ type: 'site-ready' });
  }, undefined, error => console.warn('Mill site failed to load', error));

  return {
    points,
    update(delta) {
      updateSteam(delta);
      mixer?.update(delta);
    },
    dispose() {
      disposed = true;
      steamGeometry.dispose(); steamMaterial.dispose(); steam.dispose();
      model?.traverse(node => {
        if (!node.isMesh) return;
        node.geometry.dispose();
        (Array.isArray(node.material) ? node.material : [node.material]).forEach(m => m.dispose());
      });
    }
  };
}
