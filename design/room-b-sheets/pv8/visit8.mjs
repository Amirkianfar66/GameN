// The capsule visits (ship-life's visit: walk, open, take, eat facing the room, wrapper back, shut, walk back), for Room B's new
// layout: the visitor's spot beside the capsule (never in front of its hatch, the arm on the capsule's side reaching it), and each
// person's walk from their place in a view to that spot, planned on the deck round every piece of furniture and every other
// person, with what the walker passes behind in that view. Exports planWalk(), visitorSpot() and walkInView(). Generates nothing.
import { camera, project, DEG } from '../ring/ring4b.mjs';
import { EYE } from '../vis/vis5.mjs';
import { hatchOf, placeOf, DIMS } from './capsule8.mjs';
export const BODY = { r: 0.2, h: 1.72 };
const H = 2;   // the room's half size
const segDist = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz, t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2)) : 0; return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz); };
const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
export const footDist = (o, p) => (inPoly(o.foot, p[0], p[1]) ? 0 : Math.min(...o.foot.map((a, i) => segDist(p, a, o.foot[(i + 1) % o.foot.length]))));
// the deck's free space for a walker: clear of furniture by clear (less near the start and the goal, where a person stands at
// their own station), of the walls by wall, and of the other people by apart
export function freeAt(room, walker, p, { clear = 0.2, wall = 0.24, apart = 0.42, ends = [] } = {}) {
  if (Math.abs(p[0]) > H - wall || Math.abs(p[1]) > H - wall) return false;
  const near = ends.some(e => Math.hypot(p[0] - e[0], p[1] - e[1]) < 0.45), start = ends[0] && Math.hypot(p[0] - ends[0][0], p[1] - ends[0][1]) < 0.5;
  for (const o of room.objects) { if (start && o.place === walker && o.name !== 'food capsule') continue; const d = footDist(o, p); if (d < (near ? 0.06 : clear)) return false; }
  for (const q of room.people) if (q.place !== walker && Math.hypot(q.x - p[0], q.z - p[1]) < apart) return false;
  return true;
}
// a walk on the deck from a to b: A* on a 5 cm grid, then pulled straight between corners
export function planWalk(room, walker, a, b, opts = {}) {
  const g = 0.05, n = Math.round((2 * H) / g) + 1, idx = (i, j) => i * n + j, xy = (i, j) => [-H + i * g, -H + j * g], cell = p => [Math.round((p[0] + H) / g), Math.round((p[1] + H) / g)];
  const ends = [a, b], free = new Uint8Array(n * n);
  for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) free[idx(i, j)] = freeAt(room, walker, xy(i, j), { ...opts, ends }) ? 1 : 0;
  const [si, sj] = cell(a), [gi, gj] = cell(b); free[idx(si, sj)] = 1; free[idx(gi, gj)] = 1;
  const dist = new Float64Array(n * n).fill(Infinity), prev = new Int32Array(n * n).fill(-1), open = [[0, si, sj]]; dist[idx(si, sj)] = 0;
  const hh = (i, j) => Math.hypot(i - gi, j - gj) * g;
  while (open.length) { open.sort((p, q) => q[0] - p[0]); const [, i, j] = open.pop(); if (i === gi && j === gj) break;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const i2 = i + di, j2 = j + dj; if (i2 < 0 || j2 < 0 || i2 >= n || j2 >= n || !free[idx(i2, j2)]) continue;
      const nd = dist[idx(i, j)] + Math.hypot(di, dj) * g; if (nd < dist[idx(i2, j2)]) { dist[idx(i2, j2)] = nd; prev[idx(i2, j2)] = idx(i, j); open.push([nd + hh(i2, j2), i2, j2]); } } }
  if (!Number.isFinite(dist[idx(gi, gj)])) return null;
  const cells = []; for (let k = idx(gi, gj); k !== -1; k = prev[k]) cells.unshift([Math.floor(k / n), k % n]);
  const pts = [a, ...cells.slice(1, -1).map(([i, j]) => xy(i, j)), b];
  const clearLine = (p, q) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]), m = Math.max(1, Math.ceil(L / 0.02)); for (let k = 0; k <= m; k += 1) { const t = k / m, r = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; if (!freeAt(room, walker, r, { ...opts, ends })) return false; } return true; };
  const out = [pts[0]]; let k = 0; while (k < pts.length - 1) { let m = pts.length - 1; while (m > k + 1 && !clearLine(pts[k], pts[m])) m -= 1; out.push(pts[m]); k = m; }
  const L = out.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - out[i][0], p[1] - out[i][1]), 0);
  return { points: out.map(p => p.map(v => +v.toFixed(3))), lengthM: +L.toFixed(2) };
}
// the capsule's hatch: its centre on the deck plan and its normal
export function hatchFrame(room, spec) { const p = placeOf(room, spec), n = [Math.sin(spec.faceDeg * DEG), Math.cos(spec.faceDeg * DEG)];
  return { c: [p.c[0] + n[0] * DIMS.d / 2, p.c[1] + n[1] * DIMS.d / 2], n, y: p.y0 + (DIMS.hatch.y0 + DIMS.hatch.y1) / 2, capsule: p.c }; }
// beside the capsule: to the side of the hatch (55° to 125° off its normal), within reach of it
export function besideOK(room, spec, p) { const hf = hatchFrame(room, spec), v = [p[0] - hf.capsule[0], p[1] - hf.capsule[1]], ang = Math.acos((v[0] * hf.n[0] + v[1] * hf.n[1]) / Math.hypot(...v)) / DEG, reach = Math.hypot(p[0] - hf.c[0], p[1] - hf.c[1]);
  return { ang: +ang.toFixed(0), reach: +reach.toFixed(2), ok: ang >= 55 && ang <= 125 && reach >= 0.3 && reach <= 0.6 }; }
// the walker as a body on the deck: sample points on its outline as a camera sees it
export function bodyPoints(cam, p) { const toC = [cam.C[0] - p[0], cam.C[2] - p[1]], L = Math.hypot(...toC), side = [-toC[1] / L, toC[0] / L], out = [];
  for (const y of [0.05, 0.3, 0.6, 0.9, 1.2, 1.45, 1.62]) for (const s of [-0.16, 0, 0.16]) out.push([p[0] + side[0] * s * (y > 1.45 ? 0.6 : 1), y, p[1] + side[1] * s * (y > 1.45 ? 0.6 : 1)]); return out; }
import { camOf, blockerOf, project as proj8, inPoly as inPoly8, figureAt as figAt8, rectOf as rectOf8, paints as paints8 } from './geom8.mjs';
// a walk as one view sees it: every 5 cm along it, the share of the walker's body in the frame and what hides each part of it;
// returned as sections (from, to, in metres along the walk) per piece or person it passes behind, and the frame sections
export function walkInView(room, V, walker, walk, { W = 390, H = 844 } = {}) {
  const { cam, SH } = camOf(V, W, H), pts = walk.points, segs = pts.slice(1).map((p, i) => [pts[i], p, Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])]), samples = [];
  let s0 = 0; for (const [a, b, L] of segs) { for (let s = 0; s < L; s += 0.05) samples.push({ at: [a[0] + (b[0] - a[0]) * s / L, a[1] + (b[1] - a[1]) * s / L], s: s0 + s }); s0 += L; }
  samples.push({ at: pts[pts.length - 1], s: s0 });
  const rows = samples.map(({ at, s }) => { const bp = bodyPoints(cam, at), by = {}; let inF = 0;
    for (const q of bp) { const v = cam.view(q); if (v[2] < 0.05) continue; const [x, y] = cam.proj(v); if (x < 0 || x > W || y < 0 || y > SH) continue; inF += 1; const b = blockerOf(room, V, cam, q, { skipPeople: [walker] }); if (b) by[b] = (by[b] ?? 0) + 1; }
    return { s: +s.toFixed(2), inFrame: +(inF / bp.length).toFixed(2), by: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, +(v / bp.length).toFixed(2)])) }; });
  const sections = (test) => { const out = []; let cur = null; for (const r of rows) { const v = test(r); if (v) { if (!cur) cur = { from: r.s, to: r.s, max: v }; else { cur.to = r.s; cur.max = Math.max(cur.max, v); } } else if (cur) { out.push(cur); cur = null; } } if (cur) out.push(cur); return out; };
  const names = [...new Set(rows.flatMap(r => Object.keys(r.by)))], behind = Object.fromEntries(names.map(n => [n, sections(r => r.by[n] ?? 0).filter(x => x.max >= 0.1)])), outOf = sections(r => (r.inFrame < 1 ? 1 - r.inFrame : 0));
  return { behind: Object.fromEntries(Object.entries(behind).filter(([, v]) => v.length)), outOfFrame: outOf, rows };
}
