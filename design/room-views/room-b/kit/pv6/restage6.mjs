// PV6-A's re-staging of Vega and her bench, after the Lead's review of sheet version 1794970662-fdca: the bench runs along the
// left side of Mira's view, away from the camera (it may be cut by the left edge); Vega stands on its right side near its near
// end, facing it, toward screen left and into the picture (a profile or a three-quarter back); she stays near and big (at least
// 40% of the stage's height, about 45% preferred), whole under the strict edge rule; nothing nearer than Lyra covers more than
// 10% of her box or any of her face or press area, and the same for Juno, except her own stool; the PLACE mask at most 10%.
// Exports E_STATION (the chosen staging), restageE() and measure(); run alone it searches and prints the best candidates.
// Generates nothing.
import { writeFileSync } from 'fs';
import { phoneView, IDS, TOK, ALPHA, figureAt } from '../vis/vis5.mjs';
import { camera, project, DEG } from '../ring/ring4b.mjs';
import { cheatRoom, camAt, fits, VIEWER } from './stage6.mjs';

// a box on the deck, as vis5.mjs's orientedBox: its a axis (w) along (cos yaw, -sin yaw), its b axis (d) along (sin yaw, cos
// yaw); the front (-d side, corners k0 and k1) toward the user
function obox(name, place, c, w, d, y0, y1, yaw) {
  const cs = Math.cos(yaw), sn = Math.sin(yaw), k = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([a, b]) => [c[0] + a * cs + b * sn, c[1] - a * sn + b * cs]);
  const faces = [[0, 1], [1, 2], [2, 3], [3, 0]].map(([i, j]) => ({ pts: [[k[i][0], y0, k[i][1]], [k[j][0], y0, k[j][1]], [k[j][0], y1, k[j][1]], [k[i][0], y1, k[i][1]]], fill: TOK.light }));
  faces.push({ pts: k.map(([x, z]) => [x, y1, z]), fill: TOK.pale });
  return { name, place, faces, c: [c[0], (y0 + y1) / 2, c[1]], foot: k, h: y1 };
}
// Vega and her station in the camera's frame: u to screen right, v into the picture (metres from Mira's eye, on the deck)
export function frame(room) { const { C, yaw } = camAt(room, {}); const right = [Math.cos(yaw), -Math.sin(yaw)], fwd = [Math.sin(yaw), Math.cos(yaw)];
  return { C, yaw, right, fwd, at: (u, v) => [C[0] + u * right[0] + v * fwd[0], C[2] + u * right[1] + v * fwd[1]], uv: (x, z) => [(x - C[0]) * right[0] + (z - C[2]) * right[1], (x - C[0]) * fwd[0] + (z - C[2]) * fwd[1]] }; }
// s: { vega: [u, v], faceRel (degrees from the camera's forward, - = screen left), axisRel (the bench's long axis, degrees from
// forward), along (Vega's place along the bench from its centre, - = toward the near end, m), gap (Vega's feet to the bench's
// front, m), mirror }
export function restageE(room, s) {
  const F = frame(room), p = room.P('E'), [x, z] = F.at(...s.vega), face = F.yaw + s.faceRel * DEG, axis = F.yaw + s.axisRel * DEG;
  p.x = x; p.z = z; p.face = face; p.mirror = s.mirror;
  const by = axis - Math.PI / 2, A = [Math.cos(by), -Math.sin(by)], B = [Math.sin(by), Math.cos(by)];   // A: along the bench (into the picture), B: away from Vega
  const W = 1.0, D = 0.46, back = s.gap + D / 2;   // Vega at (along, -back) in the bench's frame
  const c = [x - A[0] * s.along + B[0] * back, z - A[1] * s.along + B[1] * back];
  // the microscope where her facing meets the bench's middle line, kept on the bench
  const f = [Math.sin(face), Math.cos(face)], fb = f[0] * B[0] + f[1] * B[1], fa = f[0] * A[0] + f[1] * A[1];
  const t = fb > 0.05 ? back / fb : Infinity, aM = Math.max(-W / 2 + 0.12, Math.min(W / 2 - 0.12, s.along + fa * t));
  room.objects = room.objects.filter(o => o.place !== 'E');
  room.objects.push(obox('bench', 'E', c, W, D, 0, 0.84, by), obox('microscope', 'E', [c[0] + A[0] * aM, c[1] + A[1] * aM], 0.18, 0.2, 0.84, 1.22, by));
  return { bench: c, benchYaw: by, scopeAlong: aM, facesScopeDeg: Number.isFinite(t) ? Math.abs(Math.atan2(fa, fb) / DEG - Math.atan2(aM - s.along, back) / DEG) : 180 };
}
export function roomFor(moves, s) { const room = cheatRoom(moves); const info = restageE(room, s); return { room, info }; }

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
export function coverOn(room, view, cam, id, ignore = []) {
  const fg = view.layout.figs.find(f => f.place === id), sq = view.layout.squares.find(q => q.id === room.P(id).id), me = cam.view([room.P(id).x, 1.2, room.P(id).z])[2];
  const prisms = room.objects.filter(o => o.place !== VIEWER && !ignore.includes(`${o.place} ${o.name}`)).map(prismOf);
  const others = room.people.filter(p => p.place !== VIEWER && p.place !== id).map(p => ({ p, fg: figureAt(cam, p, 1) })).filter(x => x.fg && x.fg.z < me).map(x => ({ ...x, r: spriteRectOf(x.fg) }));
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
// the PLACE mask's share: every piece in view filled in the painting (1024 x 1536, 80° across, horizon 714), grown 6 px
const GW = 1024, GH = 1536, FP = GW / 2 / Math.tan(40 * DEG);
function fillPoly(buf, pts) { const ys = pts.map(p => p[1]), y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(GH - 1, Math.ceil(Math.max(...ys)));
  for (let y = y0; y <= y1; y += 1) { const yc = y + 0.5, xs = []; for (let i = 0; i < pts.length; i += 1) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yc) !== (b[1] <= yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); }
    xs.sort((p, q) => p - q); for (let k = 0; k + 1 < xs.length; k += 2) { const xa = Math.max(0, Math.ceil(xs[k] - 0.5)), xb = Math.min(GW - 1, Math.floor(xs[k + 1] - 0.5)); for (let x = xa; x <= xb; x += 1) buf[y * GW + x] = 1; } } }
function grow(buf, r) { const a = new Uint8Array(buf.length), b = new Uint8Array(buf.length);
  for (let y = 0; y < GH; y += 1) for (let x = 0; x < GW; x += 1) { let v = 0; for (let d = -r; d <= r && !v; d += 1) { const xx = x + d; if (xx >= 0 && xx < GW && buf[y * GW + xx]) v = 1; } a[y * GW + x] = v; }
  for (let y = 0; y < GH; y += 1) for (let x = 0; x < GW; x += 1) { let v = 0; for (let d = -r; d <= r && !v; d += 1) { const yy = y + d; if (yy >= 0 && yy < GH && a[yy * GW + x]) v = 1; } b[y * GW + x] = v; } return b; }
export function placeShare(room, C, yaw) {
  const cam = camera({ C, yaw, f: FP, cx: GW / 2, hy: 714, mode: 'rect' }), buf = new Uint8Array(GW * GH), per = {};
  for (const o of room.objects.filter(o => o.place !== VIEWER)) { const one = new Uint8Array(GW * GH); for (const f of o.faces) { const pp = project(cam, f.pts); if (pp) { fillPoly(buf, pp); fillPoly(one, pp); } } per[`${o.place} ${o.name}`] = +(one.reduce((a, b) => a + b, 0) / one.length).toFixed(4); }
  const tight = buf.reduce((a, b) => a + b, 0) / buf.length, g = grow(buf, 6);
  return { tight: +tight.toFixed(4), place: +(g.reduce((a, b) => a + b, 0) / g.length).toFixed(4), per };
}
export function measure(moves, s, { withPlace = true } = {}) {
  const { room, info } = roomFor(moves, s), { C, yaw } = camAt(room, {}), out = { s, info, fits: fits(room), phones: {} };
  for (const pct of [100, 200]) for (const [W, H] of [[390, 844], [430, 932]]) {
    const v = phoneView(room, VIEWER, IDS, { W, H, pct, fov: 70, pitch: -5, farScale: 1, lens: 'rect', C, yaw }), key = `${W}x${H}@${pct}`;
    const cam = camera({ C, yaw, f: v.f, cx: W / 2, hy: v.hy, mode: 'rect' }), e = v.per.E;
    const ph = out.phones[key] = { issues: v.issues, strict: v.edge.strictFull && v.edge.strictNarrow, vegaShare: e ? +(e.heightPx / v.SH).toFixed(3) : 0, vegaWhole: !!e?.whole, seen: v.seen.join('') };
    if (pct === 100) { ph.lyra = coverOn(room, v, cam, 'C'); ph.juno = coverOn(room, v, cam, 'B', ['B stool']); }
  }
  if (withPlace) out.place = placeShare(room, C, yaw);
  const p = room.P('E'), F = frame(room), toCam = Math.atan2(C[0] - p.x, C[2] - p.z);
  out.vega = { at: [+p.x.toFixed(3), +p.z.toFixed(3)], movedM: +Math.hypot(p.x - 1.04, p.z - 1.68).toFixed(3), faceDeg: +((((p.face / DEG) % 360) + 360) % 360).toFixed(1), seenFromDeg: +(((((toCam - p.face) / DEG + 540) % 360) + 360) % 360 - 180).toFixed(1), uv: F.uv(p.x, p.z).map(n => +n.toFixed(3)) };
  return out;
}
const ok = m => !m.fits.length && Object.values(m.phones).every(p => !p.issues.length && p.strict && p.vegaWhole && p.seen === 'BCE' && p.vegaShare >= 0.40)
  && ['390x844@100', '430x932@100'].every(k => { const p = m.phones[k]; return p.lyra.box <= 0.10 && p.lyra.face === 0 && p.lyra.press === 0 && p.juno.box <= 0.10 && p.juno.face === 0 && p.juno.press === 0; });

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const MOVES = { C: [-0.354, 0.354], B: [0.6, 0] }, PLAN = [1.04, 1.68], res = [];
  const room0 = cheatRoom(MOVES), F = frame(room0), planUV = F.uv(...PLAN);
  let tried = 0, geo = 0;
  for (let u = -1.15; u <= -0.45; u += 0.05) for (let v = 1.2; v <= 2.2; v += 0.05) {
    const [x, z] = F.at(u, v); if (Math.hypot(x - PLAN[0], z - PLAN[1]) > 0.6 + 1e-9) continue;
    for (const faceRel of [-100, -90, -80, -70, -60, -50, -40]) for (const axisRel of [-40, -30, -20, -10, 0, 10, 20]) for (const along of [-0.45, -0.3, -0.15]) for (const gap of [0.12, 0.2, 0.3]) {
      tried += 1; const s = { vega: [+u.toFixed(2), +v.toFixed(2)], faceRel, axisRel, along, gap, mirror: true };
      const { room, info } = roomFor(MOVES, s); if (fits(room).length || info.facesScopeDeg > 30) continue;
      const bench = room.objects.find(o => o.place === 'E' && o.name === 'bench'), bu = bench.foot.map(([bx, bz]) => F.uv(bx, bz));
      if (Math.max(...bu.map(q => q[0])) > u - 0.15) continue;   // the bench wholly on Vega's left (screen left)
      geo += 1; const m = measure(MOVES, s, { withPlace: false }); if (!ok(m)) continue;
      res.push(m);
    }
  }
  console.log('tried', tried, 'geometry ok', geo, 'all checks but the mask', res.length);
  // the mask only for the survivors
  for (const m of res) { const { room } = roomFor(MOVES, m.s), { C, yaw } = camAt(room, {}); m.place = placeShare(room, C, yaw); }
  res.sort((a, b) => a.place.place - b.place.place);
  writeFileSync(new URL('./_restage-all.json', import.meta.url).pathname, JSON.stringify(res.map(m => ({ s: m.s, place: m.place, vega: m.vega, v390: m.phones['390x844@100'].vegaShare, v430: m.phones['430x932@100'].vegaShare, lyra: m.phones['390x844@100'].lyra, juno: m.phones['390x844@100'].juno })), null, 0));
  console.log('mask over the survivors: min', res[0]?.place.place, 'median', res[Math.floor(res.length / 2)]?.place.place);
  for (const m of res.slice(0, 12)) console.log(JSON.stringify(m.s), '| vega', m.phones['390x844@100'].vegaShare, 'seen', m.vega.seenFromDeg, '| mask', m.place.place, 'tight', m.place.tight, JSON.stringify(m.place.per));
  const good = res.filter(m => m.place.place <= 0.095);
  const score = m => Math.abs(m.phones['390x844@100'].vegaShare - 0.45) * 4 + m.place.place * 2 + Math.abs(m.s.faceRel + 70) / 200 + m.phones['390x844@100'].lyra.box + m.phones['390x844@100'].juno.box;
  good.sort((a, b) => score(a) - score(b));
  writeFileSync(new URL('./_restage-search.json', import.meta.url).pathname, JSON.stringify(good.slice(0, 60), null, 1));
  console.log('mask under 9.5%:', good.length);
  for (const m of good.slice(0, 25)) { const a = m.phones['390x844@100'], b = m.phones['430x932@100'];
    console.log(JSON.stringify(m.s), '| vega', a.vegaShare, b.vegaShare, 'seen', m.vega.seenFromDeg, 'moved', m.vega.movedM, '| mask', m.place.place, 'bench', m.place.per['E bench'], '| lyra', a.lyra.box, a.lyra.lower, '| juno', a.juno.box); }
}
