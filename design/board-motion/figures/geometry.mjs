// mothership:dev-only
//
// The geometry of every figure pose, in the pose's own units: its box (viewBox), its anchor
// (the feet, the seat, or the line below which a prop hides it), its head, and where the head
// and the name plate sit. poses.mjs draws in these boxes; the board places pieces by them.

const STANDING = { box: [0, -8, 120, 248], anchor: [62, 233], head: [58, 36], headTop: 6, plate: 233 };

export const GEOMETRY = {
  standing: STANDING,
  standingFolded: STANDING,
  standingBack: STANDING,
  walking: STANDING,
  leaning: { box: [0, -2, 140, 152], anchor: [70, 136], head: [70, 41], headTop: 10, plate: 136, front: true },
  inBed: { box: [0, 0, 140, 150], anchor: [70, 128], head: [64, 45], headTop: 14, plate: 128, front: true },
  onBench: { box: [10, 22, 112, 180], anchor: [86, 140], head: [58, 64], headTop: 38, plate: 197 },
  atConsole: { box: [10, 8, 112, 194], anchor: [74, 197], head: [78, 50], headTop: 24, plate: 197 },
  out: { box: [0, 92, 124, 150], anchor: [62, 233], head: [62, 140], headTop: 110, plate: 233 },
};

/**
 * What a piece needs to draw a pose, as shares of its box: aspect (height over width),
 * anchor x and y, head x and y, the top of the head, the plate's line. mirror flips x.
 */
export function shares(pose, mirror = false) {
  const g = GEOMETRY[pose];
  const [minX, minY, w, h] = g.box;
  const x = value => (mirror ? 1 - (value - minX) / w : (value - minX) / w);
  const y = value => (value - minY) / h;
  return { aspect: h / w, fx: x(g.anchor[0]), fy: y(g.anchor[1]), hx: x(g.head[0]), hy: y(g.head[1]), ht: y(g.headTop), pl: y(g.plate), front: Boolean(g.front), width: w };
}
