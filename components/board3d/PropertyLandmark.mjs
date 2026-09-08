// Lightweight model factory. Replace this factory with GLTF assets later; indices stay unchanged.
export function addPropertyLandmark(batch, tile, space) {
  const inward = tile.inward;
  const origin = [tile.x + inward[0] * tile.landmarkAt, tile.z + inward[1] * tile.landmarkAt];
  const angle = tile.rotation;
  // The models below were drawn for a 2.3-unit space. Scaling them with the tile keeps a
  // bigger board from leaving tiny buildings adrift on it; only the tile top stays fixed.
  const scale = Math.min(tile.alongSize, tile.radialSize) / 2.3;
  const put = (kind, color, x, y, z, sx, sy, sz) => {
    const wx = origin[0] + (Math.cos(angle) * x + Math.sin(angle) * z) * scale;
    const wz = origin[1] + (-Math.sin(angle) * x + Math.cos(angle) * z) * scale;
    batch.add(kind, color, [wx, y * scale + 0.43, wz], [sx * scale, sy * scale, sz * scale], angle);
  };
  const stone = '#d9e2dc', glass = '#438b9a', roof = '#255b58', gold = '#d4b266';
  const tree = (x, z) => { put('cylinder', '#826444', x, 0.22, z, 0.055, 0.44, 0.055); put('sphere', '#4f8f6b', x, 0.53, z, 0.25, 0.35, 0.25); };
  const block = (x, z, w, h, d, color = stone) => put('box', color, x, h / 2, z, w, h, d);
  if (space.price !== undefined) {
    const type = space.art % 8;
    if (type === 0 || type === 3) {
      [1, 0.8, 0.58].forEach((s, i) => put('box', i % 2 ? glass : stone, 0, 0.4 + i * 0.5, 0, 0.65 * s, 0.5, 0.65 * s));
      put('cone', gold, 0, 1.8, 0, 0.12, 0.6, 0.12);
    } else if (type === 1) {
      [-0.34, 0.34].forEach(x => { block(x, 0, 0.38, 1.25, 0.45, glass); put('cone', stone, x, 1.4, 0, 0.23, 0.3, 0.23); });
      put('box', gold, 0, 0.84, 0, 0.8, 0.1, 0.18);
    } else if (type === 2) {
      [-0.42, 0, 0.42].forEach(x => block(x, 0, 0.25, 0.95, 0.4, glass));
      put('box', roof, 0, 1.04, 0, 1.4, 0.18, 0.56);
    } else if (type === 4) {
      put('cone', roof, 0, 0.72, 0, 0.53, 1.45, 0.53);
      put('box', gold, 0, 0.54, 0, 0.72, 0.12, 0.72);
    } else if (type === 5) {
      block(0, 0, 1.12, 0.46, 0.6);
      [-0.4, 0, 0.4].forEach(x => { block(x, 0, 0.2, 1, 0.2); put('cone', gold, x, 1.22, 0, 0.16, 0.44, 0.16); });
    } else if (type === 6) {
      put('cylinder', stone, 0, 0.28, 0, 0.6, 0.55, 0.4);
      put('cylinder', roof, 0, 0.57, 0, 0.4, 0.1, 0.25);
      for (let i = 0; i < 8; i++) put('box', gold, Math.cos(i * Math.PI / 4) * 0.49, 0.34, Math.sin(i * Math.PI / 4) * 0.3, 0.08, 0.36, 0.08);
    } else {
      block(0, 0, 0.6, 1, 0.6); put('cone', roof, 0, 1.22, 0, 0.46, 0.45, 0.46);
      put('sphere', gold, 0, 0.8, 0.32, 0.14, 0.14, 0.025);
    }
    tree(0.64, -0.1);
  } else if (space.type === 'station') {
    [-0.45, 0.45].forEach(x => block(x, 0, 0.1, 0.7, 0.6));
    put('box', glass, 0, 0.76, 0, 1.25, 0.15, 0.8);
    block(0, 0, 0.7, 0.35, 0.35, gold);
  } else if (space.type === 'parking' || space.type === 'start') {
    tree(-0.45, 0); tree(0.35, -0.15); block(0, 0.2, 0.55, 0.18, 0.24, stone);
  } else if (space.type === 'jail' || space.type === 'go-jail') {
    block(0, 0, 1.1, 0.6, 0.65); put('box', roof, 0, 0.64, 0, 1.22, 0.1, 0.78);
    [-0.3, -0.1, 0.1, 0.3].forEach(x => put('box', roof, x, 0.33, 0.34, 0.04, 0.45, 0.04));
  } else {
    block(0, 0, 0.8, 0.38, 0.62); put('cone', space.type === 'chance' ? glass : gold, 0, 0.62, 0, 0.6, 0.45, 0.6);
  }
}
