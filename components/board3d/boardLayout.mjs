// Pure visual mapping. The engine's ring order, corner indices and save version stay intact.
// One pitch and one depth serve every space. The ring is therefore a rectangle, each edge
// as long as the spaces it carries, which keeps all 36 boxes exactly the same size — a
// square ring would have to squeeze the 9-space edges to match the 7-space ones.
export const TILE_PITCH = 5; // along the ring
export const TILE_DEPTH = 5; // across it
export const TILE_TOP = 0.42;
export const wrapIndex = (index, count = 36) => ((index % count) + count) % count;

const edgeRun = (corners, side, count) => (corners[side + 1] ?? count) - corners[side] - 1;

// Outer [x, z] extent of the ring, taken from the space count on a horizontal and a vertical edge.
export const boardSpans = (corners, count = 36) =>
  [0, 1].map(side => edgeRun(corners, side, count) * TILE_PITCH + TILE_DEPTH * 2);

export function createBoardLayout(spaces, corners) {
  const [spanX, spanZ] = boardSpans(corners, spaces.length);
  return spaces.map((space, index) => {
    const side = corners.findLastIndex(corner => index >= corner);
    const local = index - corners[side];
    const horizontal = side % 2 === 0;
    const span = horizontal ? spanX : spanZ;
    const across = (horizontal ? spanZ : spanX) / 2 - TILE_DEPTH / 2;
    const offset = local === 0 ? span / 2 - TILE_DEPTH / 2 : span / 2 - TILE_DEPTH - (local - 0.5) * TILE_PITCH;
    const coordinates = [[offset, across], [-across, offset], [-offset, -across], [across, -offset]][side];
    const alongSize = (local === 0 ? TILE_DEPTH : TILE_PITCH) - 0.1;
    const radialSize = TILE_DEPTH - 0.1;
    return {
      index, x: coordinates[0], z: coordinates[1], side, alongSize, radialSize,
      width: horizontal ? alongSize : radialSize,
      depth: horizontal ? radialSize : alongSize,
      // Where each part of a tile sits across its depth, measured from the tile centre:
      // negative faces the player on the outside, positive faces the park.
      tokenAt: -radialSize * 0.04,
      labelAt: -radialSize * 0.27,
      landmarkAt: radialSize * 0.23,
      upgradeAt: radialSize * 0.35,
      inward: [[0, -1], [1, 0], [0, 1], [-1, 0]][side],
      rotation: [0, Math.PI / 2, Math.PI, -Math.PI / 2][side]
    };
  });
}

export function routeForSteps(from, steps, count = 36) {
  return Array.from({ length: Math.abs(steps) }, (_, i) => wrapIndex(from + Math.sign(steps) * (i + 1), count));
}

export function tokenOffset(players, player, position = player.position) {
  const occupants = players.filter(p => (p.position === position && !p.out) || p.id === player.id).sort((a, b) => a.id - b.id);
  if (occupants.length <= 1) return { x: 0, z: 0 };
  const slot = occupants.findIndex(p => p.id === player.id);
  const angle = slot / occupants.length * Math.PI * 2 + Math.PI / 4;
  return { x: Math.cos(angle) * 0.49, z: Math.sin(angle) * 0.49 };
}
