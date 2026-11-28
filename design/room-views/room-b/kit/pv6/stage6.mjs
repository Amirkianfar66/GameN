// PV6-A's staging: Mira's view with a straight-line camera, the people cheated a little to fit (the owner, 18 November 2026: "we
// can cheat a little bit about characters to fit"; the Lead's brief: each of Vega, Lyra and Juno moves up to about 0.6 m from
// their plan spot, their station moving with them; Atlas stays out of view; who sees whom does not change). The room is the layout
// test's (vis5.mjs build), the camera ring4b's camera in 'rect' mode through phoneView. Exports cheatRoom() and stage(); run alone
// it prints a candidate. Generates nothing.
import { build, phoneView, IDS, EYE, inCone, FULL, PLACES, TOK } from '../vis/vis5.mjs';
import { DEG } from '../ring/ring4b.mjs';
export const VIEWER = 'A';
// a box on the deck, as vis5.mjs's orientedBox: its a axis (w) along (cos yaw, -sin yaw), its b axis (d) along (sin yaw, cos
// yaw); the front (-d side, corners k0 and k1) toward the user, where a slanted top is lowest
export function obox(name, place, c, w, d, y0, y1, yaw, slant = 0) {
  const cs = Math.cos(yaw), sn = Math.sin(yaw), k = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([a, b]) => [c[0] + a * cs + b * sn, c[1] - a * sn + b * cs]);
  const top = i => (slant && (i === 0 || i === 1) ? y1 - slant : y1);
  const faces = [[0, 1], [1, 2], [2, 3], [3, 0]].map(([i, j]) => ({ pts: [[k[i][0], y0, k[i][1]], [k[j][0], y0, k[j][1]], [k[j][0], top(j), k[j][1]], [k[i][0], top(i), k[i][1]]], fill: TOK.light }));
  faces.push({ pts: k.map(([x, z], i) => [x, top(i), z]), fill: TOK.pale });
  return { name, place, faces, c: [c[0], (y0 + y1) / 2, c[1]], foot: k, h: y1 };
}
function cyl(name, place, c, r, y0, y1) {   // as vis5.mjs's cylinder
  const n = 18, faces = [];
  for (let i = 0; i < n; i += 1) { const a = (i / n) * 2 * Math.PI, b = ((i + 1) / n) * 2 * Math.PI; faces.push({ pts: [[c[0] + r * Math.cos(a), y0, c[1] + r * Math.sin(a)], [c[0] + r * Math.cos(b), y0, c[1] + r * Math.sin(b)], [c[0] + r * Math.cos(b), y1, c[1] + r * Math.sin(b)], [c[0] + r * Math.cos(a), y1, c[1] + r * Math.sin(a)]], fill: TOK.light }); }
  faces.push({ pts: Array.from({ length: n }, (_, i) => [c[0] + r * Math.cos((i / n) * 2 * Math.PI), y1, c[1] + r * Math.sin((i / n) * 2 * Math.PI)]), fill: TOK.pale });
  return { name, place, faces, c: [c[0], (y0 + y1) / 2, c[1]], foot: Array.from({ length: 12 }, (_, i) => [c[0] + r * Math.cos((i / 12) * 2 * Math.PI), c[1] + r * Math.sin((i / 12) * 2 * Math.PI)]), h: y1 };
}
// the camera's frame at Mira's place: u to screen right, v into the picture (metres, on the deck)
export function frame(room) { const { C, yaw } = camAt(room, {}); const right = [Math.cos(yaw), -Math.sin(yaw)], fwd = [Math.sin(yaw), Math.cos(yaw)];
  return { C, yaw, right, fwd, at: (u, v) => [C[0] + u * right[0] + v * fwd[0], C[2] + u * right[1] + v * fwd[1]], uv: (x, z) => [(x - C[0]) * right[0] + (z - C[2]) * right[1], (x - C[0]) * fwd[0] + (z - C[2]) * fwd[1]] }; }
// The stations at the people's poses (the Lead's review of version 1794970662-fdca and the Motion builder's pose sketches):
// each person stands at { at: [x, z], faceDeg } (compass: 0 north, 90 east) and their station is built from the pose.
const dirOf = deg => [Math.sin(deg * DEG), Math.cos(deg * DEG)];   // compass to (x, z)
// Vega (test-tube pose): her far hand (the one away from the camera) rests on the bench's edge 0.24 m forward, 0.14 m to that
// side, 0.87 m up, so the bench's long edge runs along that side through that point (side: 'left', as the pose sketch, or 'right',
// its mirror, for a view from her front left); turnDeg turns the bench from her facing (+ clockwise), nearEnd is where
// its near end comes along her facing from her feet (m, - = behind them); the microscope stands on its middle line 0.28 m from
// the centre, toward the near end (scope: 'near') or the far end.
export const VEGA_HAND = { forward: 0.24, left: 0.14, up: 0.87 };
function stationE(room, s) {
  const p = room.P('E'); [p.x, p.z] = s.at; p.face = s.faceDeg * DEG; p.mirror = s.mirror;
  const sd = s.side === 'right' ? 1 : -1, f = dirOf(s.faceDeg), l = dirOf(s.faceDeg + 90 * sd), e = dirOf(s.faceDeg + (s.turnDeg ?? 0)), n = dirOf(s.faceDeg + (s.turnDeg ?? 0) + 90 * sd);
  const H = [p.x + f[0] * VEGA_HAND.forward + l[0] * VEGA_HAND.left, p.z + f[1] * VEGA_HAND.forward + l[1] * VEGA_HAND.left], W = 1.0, D = 0.46;
  const ef = e[0] * f[0] + e[1] * f[1], nf = n[0] * f[0] + n[1] * f[1], aC = (s.nearEnd - VEGA_HAND.forward - (D / 2) * nf + (W / 2) * ef) / ef;
  const c = [H[0] + e[0] * aC + n[0] * (D / 2), H[1] + e[1] * aC + n[1] * (D / 2)], by = (s.faceDeg + (s.turnDeg ?? 0) + 90 * sd) * DEG, aM = s.scope === 'near' ? -0.28 : 0.28;
  room.objects = room.objects.filter(o => o.place !== 'E');
  room.objects.push(obox('bench', 'E', c, W, D, 0, 0.84, by), obox('microscope', 'E', [c[0] + e[0] * aM, c[1] + e[1] * aM], 0.18, 0.2, 0.84, 1.22, by));
}
// Lyra (typing pose): both hands 0.26-0.31 m forward, 0.89-0.91 m up, so the console stands in front of her, its working edge
// (the low front of its slanted top) 0.25 m in front of her feet
export const LYRA_EDGE = 0.25;
function stationC(room, s) {
  const p = room.P('C'); [p.x, p.z] = s.at; p.face = s.faceDeg * DEG; if (s.mirror !== undefined) p.mirror = s.mirror;
  const f = dirOf(s.faceDeg), c = [p.x + f[0] * (LYRA_EDGE + 0.2), p.z + f[1] * (LYRA_EDGE + 0.2)];
  room.objects = room.objects.filter(o => o.place !== 'C');
  room.objects.push(obox('console', 'C', c, 0.55, 0.4, 0, 0.95, s.faceDeg * DEG, 0.12));
}
// Juno (seated pose): hips on the stool at 0.52 m, hands 0.35-0.37 m forward, 0.66 m up, so the stool stays behind her as her
// seat (as the layout test placed it) and the cart stands in front of her, its near edge 0.25 m in front of her feet
export const JUNO_EDGE = 0.25;
function stationB(room, s) {
  const p = room.P('B'); [p.x, p.z] = s.at; p.face = s.faceDeg * DEG; if (s.mirror !== undefined) p.mirror = s.mirror;
  const f = dirOf(s.faceDeg), c = [p.x + f[0] * (JUNO_EDGE + 0.21), p.z + f[1] * (JUNO_EDGE + 0.21)];
  room.objects = room.objects.filter(o => o.place !== 'B');
  room.objects.push(cyl('stool', 'B', [p.x - f[0] * 0.08, p.z - f[1] * 0.08], 0.17, 0, 0.45), obox('laptop cart', 'B', c, 0.5, 0.42, 0, 0.62, s.faceDeg * DEG));
}
export function restage(room, stations = {}) { if (stations.E) stationE(room, stations.E); if (stations.C) stationC(room, stations.C); if (stations.B) stationB(room, stations.B); return room; }
// the room with people and their stations moved: moves = { place: [dx, dz] } in metres (X east, Z north); stations = { place: { at, faceDeg, ... } }
// re-stages a person and their station at a pose (restage)
export function cheatRoom(moves = {}, stations = {}) {
  const room = build(4);
  for (const [pl, [dx, dz]] of Object.entries(moves)) {
    const p = room.P(pl); p.x += dx; p.z += dz;
    for (const o of room.objects.filter(o => o.place === pl)) {
      o.faces = o.faces.map(f => ({ ...f, pts: f.pts.map(([x, y, z]) => [x + dx, y, z + dz]) })); o.foot = o.foot.map(([x, z]) => [x + dx, z + dz]); o.c = [o.c[0] + dx, o.c[1], o.c[2] + dz];
    }
  }
  restage(room, stations);
  return room;
}
// the camera: Mira's place moved back along her line of sight by back metres and turned by turnDeg (+ to the right)
export function camAt(room, { back = 0, turnDeg = 0 } = {}) {
  const V = room.P(VIEWER), yaw = V.camYaw + turnDeg * DEG;
  return { C: [V.x - Math.sin(V.camYaw) * back, EYE, V.z - Math.cos(V.camYaw) * back], yaw };
}
// the room's own rules for a cheat: every station inside the room with 5 cm to spare, stations and people clear of each other
export function fits(room) {
  const h = room.size / 2, bad = [];
  for (const o of room.objects) for (const [x, z] of o.foot) if (Math.abs(x) > h - 0.05 || Math.abs(z) > h - 0.05) { bad.push(`${o.place}'s ${o.name} outside the room`); break; }
  const box = o => { const xs = o.foot.map(p => p[0]), zs = o.foot.map(p => p[1]); return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]; };
  const objs = room.objects.filter(o => o.name !== 'microscope');
  for (let i = 0; i < objs.length; i += 1) for (let j = i + 1; j < objs.length; j += 1) { if (objs[i].place === objs[j].place) continue; const a = box(objs[i]), b = box(objs[j]); if (a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]) bad.push(`${objs[i].place}'s ${objs[i].name} meets ${objs[j].place}'s ${objs[j].name}`); }
  for (const p of room.people) for (const o of objs) { if (o.place === p.place) continue; const b = box(o); if (p.x > b[0] - 0.25 && p.x < b[2] + 0.25 && p.z > b[1] - 0.25 && p.z < b[3] + 0.25) bad.push(`${p.name} stands in ${o.place}'s ${o.name}`); }
  return bad;
}
export function stage({ moves = {}, stations = {}, back = 0, turnDeg = 0, fov = 70, farScale = 1, pct = 100 } = {}) {
  const room = cheatRoom(moves, stations), { C, yaw } = camAt(room, { back, turnDeg });
  const views = Object.fromEntries([[390, 844], [430, 932]].map(([W, H]) => [`${W}x${H}`, phoneView(room, VIEWER, IDS, { W, H, pct, fov, pitch: -5, farScale, lens: 'rect', C, yaw })]));
  return { room, C, yaw, views, fits: fits(room) };
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const room = build(4);
  for (const p of room.people) console.log(p.place, p.name, 'at', p.x.toFixed(2), p.z.toFixed(2), 'facing', (p.face / DEG).toFixed(0), 'camera', (p.camYaw / DEG).toFixed(0), '| sees', IDS.filter(o => inCone(p.place, o)).join(''), '| out of view', FULL[p.place].blind_place);
  for (const o of room.objects) console.log('  ', o.place, o.name, 'c', o.c.map(v => v.toFixed(2)).join(','));
  const s = stage();
  for (const [k, v] of Object.entries(s.views)) console.log(k, JSON.stringify(Object.values(v.per).map(c => [c.name, c.distM, c.heightPx, c.marginL, c.marginR])), v.issues);
}
