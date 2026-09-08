// Pure visual mapping. The engine's 13x7 space order and save version stay intact.
export const BOARD_SIZE = 26;
export const TILE_TOP = 0.42;
export const wrapIndex = (index, count = 36) => ((index % count) + count) % count;

export function createBoardLayout(spaces, corners) {
  const half = BOARD_SIZE / 2;
  const cornerSize = 2.5;
  const centre = half - cornerSize / 2;
  return spaces.map((space, index) => {
    let side = corners.findLastIndex(corner => index >= corner);
    const local = index - corners[side];
    const run = (corners[side + 1] ?? spaces.length) - corners[side] - 1;
    const along = (BOARD_SIZE - cornerSize * 2) / run;
    const offset = local === 0 ? centre : half - cornerSize - (local - 0.5) * along;
    const coordinates = [[offset, centre], [-centre, offset], [-offset, -centre], [centre, -offset]][side];
    const horizontal = side % 2 === 0;
    return {
      index, x: coordinates[0], z: coordinates[1], side,
      width: local === 0 || !horizontal ? cornerSize - 0.1 : along - 0.1,
      depth: local === 0 || horizontal ? cornerSize - 0.1 : along - 0.1,
      inward: [[0, -1], [1, 0], [0, 1], [-1, 0]][side],
      rotation: [0, Math.PI / 2, Math.PI, -Math.PI / 2][side]
    };
  });
}

export function routeForSteps(from, steps, count = 36) {
  return Array.from({ length: Math.abs(steps) }, (_, i) => wrapIndex(from + Math.sign(steps) * (i + 1), count));
}

export function tokenOffset(players, player, position = player.position) {
  const occupants = players.filter(p => p.position === position || p.id === player.id).sort((a, b) => a.id - b.id);
  if (occupants.length <= 1) return { x: 0, z: 0 };
  const slot = occupants.findIndex(p => p.id === player.id);
  const angle = slot / occupants.length * Math.PI * 2 + Math.PI / 4;
  return { x: Math.cos(angle) * 0.49, z: Math.sin(angle) * 0.49 };
}
