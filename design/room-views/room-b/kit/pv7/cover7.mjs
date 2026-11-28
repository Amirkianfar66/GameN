// What covers a person in a view (PV6-A's coverOn, restage6.mjs, word for word but for the viewer): pixels of their box, lower half,
// face and press area with something nearer in front (pieces by ray cast, people by their stand-in's painted pixels), leaving out the
// viewer's own figure and station, which are never in their own view (coverOn left out place A's, PV6-A's viewer). Generates nothing.
import { ALPHA, figureAt } from '../vis/vis5.mjs';
// ---- measuring a candidate
const prismOf = o => { const y1 = o.h, y0 = 2 * o.c[1] - o.h, P = o.foot, n = P.length; let a2 = 0; for (let i = 0; i < n; i += 1) { const [x0, z0] = P[i], [x1, z1] = P[(i + 1) % n]; a2 += x0 * z1 - x1 * z0; }
  const sgn = a2 > 0 ? 1 : -1, edges = P.map((e, i) => { const q = P[(i + 1) % n], dx = q[0] - e[0], dz = q[1] - e[1]; return { e, n: [sgn * dz, -sgn * dx] }; }); return { o, y0, y1, edges }; };
function hitT(pr, C, d) {   // entry t of the ray C + t d into a vertical prism (or Infinity)
  let lo = 0, hi = Infinity;
  if (Math.abs(d[1]) < 1e-12) { if (C[1] < pr.y0 || C[1] > pr.y1) return Infinity; } else { const t1 = (pr.y0 - C[1]) / d[1], t2 = (pr.y1 - C[1]) / d[1]; lo = Math.max(lo, Math.min(t1, t2)); hi = Math.min(hi, Math.max(t1, t2)); }
  for (const { e, n } of pr.edges) { const s0 = n[0] * (C[0] - e[0]) + n[1] * (C[2] - e[1]), sd = n[0] * d[0] + n[1] * d[2];
    if (Math.abs(sd) < 1e-12) { if (s0 > 0) return Infinity; } else if (sd > 0) hi = Math.min(hi, -s0 / sd); else lo = Math.max(lo, -s0 / sd); if (lo > hi) return Infinity; }
  return lo <= hi ? lo : Infinity;
}
const paints = (r, id, x, y) => { let sx = ((x - r.left) / r.size) * 300; const sy = ((y - r.top) / r.size) * 300; if (r.flip) sx = 300 - sx; return !(sx < 0 || sy < 0 || sx >= 300 || sy >= 300) && ALPHA[id][Math.floor(sy) * 300 + Math.floor(sx)] === 1; };
const spriteRectOf = fg => ({ left: fg.anchor[0] - (fg.p.mirror ? 148 : 152) * fg.u, top: fg.anchor[1] - 273 * fg.u, size: 300 * fg.u, flip: !!fg.p.mirror });
// what covers person id on one phone: pixels of their box, face and press area with something nearer in front (pieces by ray
// cast, people by their stand-in's painted pixels); ignore: piece names to leave out (Juno's own stool)
export function coverOn7(room, view, cam, id, viewer, ignore = []) {
  const fg = view.layout.figs.find(f => f.place === id), sq = view.layout.squares.find(q => q.id === room.P(id).id), me = cam.view([room.P(id).x, 1.2, room.P(id).z])[2];
  const prisms = room.objects.filter(o => o.place !== viewer && !ignore.includes(`${o.place} ${o.name}`)).map(prismOf);
  const others = room.people.filter(p => p.place !== viewer && p.place !== id).map(p => ({ p, fg: figureAt(cam, p, 1) })).filter(x => x.fg && x.fg.z < me).map(x => ({ ...x, r: spriteRectOf(x.fg) }));
  const fwd = cam.fwd, right = [Math.cos(cam.yaw), 0, -Math.sin(cam.yaw)];
  const covered = (x, y) => { const u = (x - cam.cx) / cam.f, w = (cam.hy - y) / cam.f, d = [fwd[0] + u * right[0], w, fwd[2] + u * right[2]];
    for (const pr of prisms) { const t = hitT(pr, cam.C, d); if (t < me) return `${pr.o.place} ${pr.o.name}`; }
    for (const o of others) if (paints(o.r, o.p.id, x, y)) return o.p.name; return null; };
  const tally = (x0, y0, x1, y1, keep = () => true) => { let n = 0; const by = {}; for (let y = Math.floor(y0) + 0.5; y < y1; y += 1) for (let x = Math.floor(x0) + 0.5; x < x1; x += 1) { if (!keep(x, y)) continue; n += 1; const c = covered(x, y); if (c) by[c] = (by[c] ?? 0) + 1; } return { n, by }; };
  const [bx0, by0, bx1, by1] = fg.box, box = tally(bx0, by0, bx1, by1), lower = tally(bx0, (by0 + by1) / 2, bx1, by1);
  const face = tally(fg.head[0] - fg.headR, fg.head[1] - fg.headR, fg.head[0] + fg.headR, fg.head[1] + fg.headR, (x, y) => Math.hypot(x - fg.head[0], y - fg.head[1]) <= fg.headR);
  const press = tally(sq.x0, sq.y0, sq.x1, sq.y1);
  const share = t => +(Object.values(t.by).reduce((a, b) => a + b, 0) / Math.max(1, t.n)).toFixed(4);
  return { box: share(box), lower: share(lower), face: share(face), press: share(press), byBox: Object.fromEntries(Object.entries(box.by).map(([k, v]) => [k, +(v / box.n).toFixed(4)])), depthM: +me.toFixed(2) };
}
