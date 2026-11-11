// mothership:dev-only
//
// A redrawn room's picture, trimmed for release (room-drawing-1.0.0, docs/design/room-drawing-
// release.md). The crew's ink samples every outline every few units, far more finely than a phone
// or a display shows it, so a picture is ten times today's size. Each subpath that the ink wrote
// (a path of absolute M, L and Z only: an outline, a fill, a hand-drawn line) keeps the fewest of
// its own points that stay within TOLERANCE units of every point it had (Ramer-Douglas-Peucker),
// written in whole units where the subpath is at least SMALL units across and in tenths where it
// is smaller (a button, a bolt, a bottle). A subpath that would close on fewer than four points is
// kept as it was. Everything else, including today's shapes copied as they are and every pattern
// tile, is kept byte for byte. The trimmed picture draws the same picture (tested to within a
// pixel's edge in Chrome).

export const TOLERANCE = 0.25;
export const SMALL = 24;

/** The kept points of an open run: Ramer-Douglas-Peucker (by the distance to each segment), iteratively, the ends always kept. */
function simplify(points, tolerance) {
  if (points.length < 3) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = 1; keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a], [bx, by] = points[b];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let worst = -1, at = -1;
    for (let i = a + 1; i < b; i += 1) {
      // The distance to the segment, not to its line: a point past either end (a hook where a
      // ring closes) is as far as it is from that end.
      const [px, py] = points[i];
      const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
      const d = Math.hypot(px - ax - dx * t, py - ay - dy * t);
      if (d > worst) { worst = d; at = i; }
    }
    if (worst > tolerance) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return points.filter((_, i) => keep[i]);
}

/** The kept points of a closed loop: split at the point farthest from its first, each half simplified. */
function simplifyLoop(points, tolerance) {
  if (points.length < 4) return points.slice();
  let far = 1, best = -1;
  for (let i = 1; i < points.length; i += 1) {
    const d = Math.hypot(points[i][0] - points[0][0], points[i][1] - points[0][1]);
    if (d > best) { best = d; far = i; }
  }
  return [...simplify(points.slice(0, far + 1), tolerance), ...simplify([...points.slice(far), points[0]], tolerance).slice(1, -1)];
}

const INK_PATH = /^M[-\d. ]+(?:L[-\d. ]+)*Z?(?:M[-\d. ]+(?:L[-\d. ]+)*Z?)*$/;
const write = (n, tenths) => String(tenths ? Math.round(n * 10) / 10 : Math.round(n));

/** A path's data trimmed, or as it was when the ink did not write it. */
export function trimPath(d, { tolerance = TOLERANCE } = {}) {
  if (!INK_PATH.test(d)) return d;
  return d.split('M').filter(Boolean).map(sub => {
    const closed = sub.endsWith('Z');
    const points = (closed ? sub.slice(0, -1) : sub).split('L').map(pair => pair.trim().split(' ').map(Number));
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of points) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    const tenths = Math.max(maxX - minX, maxY - minY) < SMALL;
    const kept = (closed ? simplifyLoop(points, tolerance) : simplify(points, tolerance))
      .map(([x, y]) => [write(x, tenths), write(y, tenths)])
      .filter((p, i, all) => !i || p[0] !== all[i - 1][0] || p[1] !== all[i - 1][1]);
    const original = `M${sub}`;
    if (closed && kept.length < 4) return original;
    if (!closed && kept.length < 2) return original;
    return `M${kept.map(([x, y]) => `${x} ${y}`).join('L')}${closed ? 'Z' : ''}`;
  }).join('');
}

/** A picture with every path the ink wrote trimmed; everything else kept byte for byte. */
export function trimSvg(svg, options = {}) {
  return svg.replace(/ d="([^"]*)"/g, (_, d) => ` d="${trimPath(d, options)}"`);
}
