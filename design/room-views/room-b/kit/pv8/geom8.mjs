// Shared geometry for version 2's checks: a view's camera on either phone, vertical prisms for the furniture (ray entry), the
// stand-ins' painted pixels, and point-in-polygon. As cover7.mjs and restage6.mjs. Generates nothing.
import { camera, project, DEG } from '../ring/ring4b.mjs';
import { EYE, ALPHA, figureAt } from '../vis/vis5.mjs';
import { planOf } from './stage8.mjs';
export function camOf(V, W = 390, H = 844) { const p = planOf(V), SH = H - 191, f = W / 2 / Math.tan(35 * DEG), hy = SH / 2 + f * Math.tan(-5 * DEG); return { cam: camera({ C: [p.x, EYE, p.z], yaw: p.camYaw, f, cx: W / 2, hy, mode: 'rect' }), W, SH }; }
export const prismOf = o => { const y1 = o.h, y0 = 2 * o.c[1] - o.h, P = o.foot, n = P.length; let a2 = 0; for (let i = 0; i < n; i += 1) { const [x0, z0] = P[i], [x1, z1] = P[(i + 1) % n]; a2 += x0 * z1 - x1 * z0; }
  const sgn = a2 > 0 ? 1 : -1, edges = P.map((e, i) => { const q = P[(i + 1) % n], dx = q[0] - e[0], dz = q[1] - e[1]; return { e, n: [sgn * dz, -sgn * dx] }; }); return { o, y0, y1, edges }; };
export function hitT(pr, C, d) { let lo = 0, hi = Infinity;
  if (Math.abs(d[1]) < 1e-12) { if (C[1] < pr.y0 || C[1] > pr.y1) return Infinity; } else { const t1 = (pr.y0 - C[1]) / d[1], t2 = (pr.y1 - C[1]) / d[1]; lo = Math.max(lo, Math.min(t1, t2)); hi = Math.min(hi, Math.max(t1, t2)); }
  for (const { e, n } of pr.edges) { const s0 = n[0] * (C[0] - e[0]) + n[1] * (C[2] - e[1]), sd = n[0] * d[0] + n[1] * d[2]; if (Math.abs(sd) < 1e-12) { if (s0 > 0) return Infinity; } else if (sd > 0) hi = Math.min(hi, -s0 / sd); else lo = Math.max(lo, -s0 / sd); if (lo > hi) return Infinity; }
  return lo <= hi ? lo : Infinity; }
export const paints = (r, id, x, y) => { let sx = ((x - r.left) / r.size) * 300; const sy = ((y - r.top) / r.size) * 300; if (r.flip) sx = 300 - sx; return !(sx < 0 || sy < 0 || sx >= 300 || sy >= 300) && ALPHA[id][Math.floor(sy) * 300 + Math.floor(sx)] === 1; };
export const rectOf = fg => ({ left: fg.anchor[0] - (fg.p.mirror ? 148 : 152) * fg.u, top: fg.anchor[1] - 273 * fg.u, size: 300 * fg.u, flip: !!fg.p.mirror });
export const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
// what stands between the camera and a room point: the nearest piece (by ray entry) or person (a 0.2 m body, 1.72 m tall)
export function blockerOf(room, V, cam, q, { skipPeople = [], skipObjects = [] } = {}) {
  const d = [q[0] - cam.C[0], q[1] - cam.C[1], q[2] - cam.C[2]], L = Math.hypot(...d), u = d.map(v => v / L);
  let best = null, bt = L - 0.02;
  for (const o of room.objects) { if (o.place === V || skipObjects.includes(o)) continue; const t = hitT(prismOf(o), cam.C, u); if (t < bt) { bt = t; best = `${o.place}'s ${o.name}`; } }
  for (const p of room.people) { if (p.place === V || skipPeople.includes(p.place)) continue; const t = cylT(p, cam.C, u); if (t < bt) { bt = t; best = p.name; } }
  return best;
}
function cylT(p, C, u) { const ox = C[0] - p.x, oz = C[2] - p.z, a = u[0] * u[0] + u[2] * u[2], b = 2 * (ox * u[0] + oz * u[2]), c = ox * ox + oz * oz - 0.2 * 0.2, disc = b * b - 4 * a * c; if (disc < 0 || a < 1e-12) return Infinity;
  for (const t of [(-b - Math.sqrt(disc)) / (2 * a), (-b + Math.sqrt(disc)) / (2 * a)]) { if (t <= 0) continue; const y = C[1] + u[1] * t; if (y >= 0 && y <= 1.72) return t; } return Infinity; }
export { project, DEG, figureAt, camera };
