// Room A, a view from each place: the owner's design v1 (gamen-room-visibility-design-v1.json, read unchanged; Room A uses the
// same perimeter-five-v1 layout as Room B). A layout test with stand-ins and no pictures: flat blockout in Room A's family
// (tokens 0.5.0 color.room.roomA), the approved crew drawings in each place's own Room A gesture as cut-outs turned to the
// camera, the room scene's tag layout and the test pages' checks. Room B's layout test (roomb/vis/vis5.mjs) is the model; what
// differs is Room A's: its people and their work, its stations on the walls, its round window, its solid ceiling and its lamps.
// The camera is PV6's: straight lines, the phone's 70° slice at 5° down, from the viewer's plan spot at eye height.
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { camera, project, figure, UNIT_M, DEG, TOP, BOT } from '../../roomb/ring/ring4b.mjs';
import { layoutTags } from '../../pr284/design/phone-ui/components/tag-layout.mjs';
import { skeletonOf } from '../../pr284/apps/game/hosted/scene-drawing/gestures.mjs';
import { pressPoint } from '../../pr284/apps/game/hosted/scene-drawing/frame.mjs';
import { pressSide } from '../../pr284/apps/game/hosted/board-v2-drawing/fit-four.mjs';
import { FIGURE_EXTENTS } from '../../pr284/design/phone-ui/components/room-scene/figure-extents.mjs';
import { CAST, TURNED_HEADS } from './cast.mjs';
export { DEG, TOP, BOT, UNIT_M, CAST, TURNED_HEADS };

const DIR = new URL('./', import.meta.url).pathname;
const RAW = readFileSync(DIR + '../vis-design-v1.json');
export const DESIGN_SHA = createHash('sha256').update(RAW).digest('hex');
export const DESIGN = JSON.parse(RAW);
export const PLACES = Object.fromEntries(DESIGN.layout.places.map(p => [p.id, p]));
export const FULL = DESIGN.full_room_visibility.per_place;
export const IDS = ['A', 'B', 'C', 'D', 'E'];
// tokens 0.5.0 color.room.roomA (design/room-pilot/rooms.mjs FAMILIES['room-a'])
export const TOK = Object.freeze({ deep: '#14243F', shadow: '#1D3D6B', mid: '#2D609E', light: '#5C92CC', pale: '#A9CAEB' });
export const EYE = 1.6, CEIL = 3.0, SIZE = 4;
// The tags and chips, measured in this machine's system font (render.cjs); the tags widened by Room B's own ratio between its
// measured tags and the same tag measured this way (Mira's: 74 against 68 px at 100% text, 148 against 134 at 200%), so they
// are as wide as the room page draws them.
const TAGS = JSON.parse(readFileSync(DIR + 'tags.json', 'utf8')), WIDEN = { 100: 74 / 68, 200: 148 / 134 };
// the room's own controls as Room B's layout test measured them (roomb/ring/measured.json: the label, the Windows control, the Board chip)
const MB = JSON.parse(readFileSync(DIR + '../../roomb/ring/measured.json', 'utf8'));
const MEASURED = Object.fromEntries([100, 200].map(pct => [pct, { label: MB[pct].label, control: MB[pct].control, chip: MB[pct].chip,
  ...Object.fromEntries(Object.values(CAST).map(c => ['t' + c.id, [Math.ceil(TAGS[pct]['t' + c.id][0] * WIDEN[pct]), TAGS[pct]['t' + c.id][1]]])) }]));
const CHIPS = Object.fromEntries([100, 200].map(pct => [pct, Object.fromEntries(Object.values(CAST).map(c => ['chip' + c.id, TAGS[pct]['chip' + c.id]]))]));
const A0 = JSON.parse(readFileSync(DIR + 'alpha.json', 'utf8'));
export const ALPHA = Object.fromEntries(Object.entries(A0).map(([k, v]) => [k, Buffer.from(v, 'base64')]));
const FONT = 'font-family="-apple-system, system-ui, sans-serif"';
const f1 = n => (+n).toFixed(1);

// The file's plan (x east, y south, origin top-left, 0..1) to the room (metres: X east, Z north, the centre at 0, 0); its
// directions (degrees clockwise from east) to the camera's yaw (0 = north, 90 = east).
export const toRoom = (pl, size = SIZE) => [(pl.anchor.x - 0.5) * size, (0.5 - pl.anchor.y) * size];
export const yawOf = deg => (((deg + 90) % 360) * DEG);
const sgn = a => ((((a + 180) % 360) + 360) % 360) - 180;
const bearing = (from, to) => (Math.atan2(to.anchor.y - from.anchor.y, to.anchor.x - from.anchor.x) / DEG + 360) % 360;
export const offsetDeg = (v, s) => sgn(bearing(PLACES[v], PLACES[s]) - PLACES[v].camera_facing_degrees);
export const inCone = (v, s) => v !== s && Math.abs(offsetDeg(v, s)) <= 45 + 1e-9;
// The angle a person is seen at, from where they stand and the way their body faces: 0 from the front, 180 from behind, + from
// their right. And the head that angle takes: the approved face up to about 100°, the back view from about 118°; between, a
// turned head, which only Juno, Atlas and Lyra have (the Lead, 18 November).
export const seenAt = (C, p) => sgn(Math.atan2(C[0] - p.x, C[2] - p.z) / DEG - p.face / DEG);
// The staging keeps 3° clear of that band, so nobody without a turned head is seen between 97° and 121°.
export const HEAD_BAND = [97, 121];
export const headFor = (deg, name) => { const a = Math.abs(deg); return a < HEAD_BAND[0] ? 'approved face' : a > HEAD_BAND[1] ? 'back view' : TURNED_HEADS.has(name) ? 'turned head' : 'NEEDS A SKETCH'; };

// ---- The room
export const at = (p, fwd, right) => [p.x + Math.sin(p.face) * fwd + Math.cos(p.face) * right, p.z + Math.cos(p.face) * fwd - Math.sin(p.face) * right];
// a box on the deck or the wall: its a axis (w) along (cos yaw, -sin yaw), its b axis (d) along (sin yaw, cos yaw); the -d side is
// its front, so a box against the north wall with its front to the room has yaw 0
export function obox(name, place, c, w, d, y0, y1, yaw, { fill = TOK.light, top = TOK.pale, kind = 'station' } = {}) {
  const cs = Math.cos(yaw), sn = Math.sin(yaw), k = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([a, b]) => [c[0] + a * cs + b * sn, c[1] - a * sn + b * cs]);
  const faces = [[0, 1], [1, 2], [2, 3], [3, 0]].map(([i, j]) => ({ pts: [[k[i][0], y0, k[i][1]], [k[j][0], y0, k[j][1]], [k[j][0], y1, k[j][1]], [k[i][0], y1, k[i][1]]], fill }));
  faces.push({ pts: k.map(([x, z]) => [x, y1, z]), fill: top });
  return { name, place, faces, c: [c[0], (y0 + y1) / 2, c[1]], foot: k, h: y1, y0, kind, w, d, yaw };
}
// a slab leaning from a hinge line: the floor hatch's lid
function slab(name, place, a, b, len, tilt, out, th = 0.03) {
  // a, b: the hinge's ends on the floor; out: unit vector across the hatch (away from the hinge); tilt: from the floor, radians
  const up = [out[0] * Math.cos(tilt) * len, Math.sin(tilt) * len, out[1] * Math.cos(tilt) * len], A = [a[0], 0.02, a[1]], B = [b[0], 0.02, b[1]];
  const A2 = [A[0] + up[0], A[1] + up[1], A[2] + up[2]], B2 = [B[0] + up[0], B[1] + up[1], B[2] + up[2]];
  return { name, place, faces: [{ pts: [A, B, B2, A2], fill: TOK.mid }], c: [(A[0] + B2[0]) / 2, (A[1] + B2[1]) / 2, (A[2] + B2[2]) / 2], foot: [[A[0], A[2]], [B[0], B[2]], [B2[0], B2[2]], [A2[0], A2[2]]], h: A2[1], kind: 'station' };
}
function cylinder(name, place, c, r, y0, y1) {
  const n = 18, faces = [];
  for (let i = 0; i < n; i += 1) { const a = (i / n) * 2 * Math.PI, b = ((i + 1) / n) * 2 * Math.PI; faces.push({ pts: [[c[0] + r * Math.cos(a), y0, c[1] + r * Math.sin(a)], [c[0] + r * Math.cos(b), y0, c[1] + r * Math.sin(b)], [c[0] + r * Math.cos(b), y1, c[1] + r * Math.sin(b)], [c[0] + r * Math.cos(a), y1, c[1] + r * Math.sin(a)]], fill: TOK.light }); }
  faces.push({ pts: Array.from({ length: n }, (_, i) => [c[0] + r * Math.cos((i / n) * 2 * Math.PI), y1, c[1] + r * Math.sin((i / n) * 2 * Math.PI)]), fill: TOK.pale });
  return { name, place, faces, c: [c[0], (y0 + y1) / 2, c[1]], foot: Array.from({ length: 12 }, (_, i) => [c[0] + r * Math.cos((i / 12) * 2 * Math.PI), c[1] + r * Math.sin((i / 12) * 2 * Math.PI)]), h: y1, kind: 'station' };
}
// A point on a wall (n, e, s, w) at u metres from its centre, measured to the right as seen from inside the room, at height y;
// the wall's inward normal. Used for the round window, the capsule and the panel.
export const WALLS = { n: { n: [0, 0, -1], at: (u, y, e = 0) => [u, y, SIZE / 2 - e] }, s: { n: [0, 0, 1], at: (u, y, e = 0) => [-u, y, -SIZE / 2 + e] },
  e: { n: [-1, 0, 0], at: (u, y, e = 0) => [SIZE / 2 - e, y, -u] }, w: { n: [1, 0, 0], at: (u, y, e = 0) => [-SIZE / 2 + e, y, u] } };
// the round window: a circle on a wall, its glass and its frame ring (n points)
export function roundWindow(wall, u, yc, r, rim = 0.08, n = 36) {
  const W = WALLS[wall], tangent = { n: [1, 0, 0], s: [-1, 0, 0], e: [0, 0, -1], w: [0, 0, 1] }[wall];
  const ring = (rad, e) => Array.from({ length: n }, (_, i) => { const a = (i / n) * 2 * Math.PI, c = W.at(u, yc, e); return [c[0] + tangent[0] * Math.cos(a) * rad, c[1] + Math.sin(a) * rad, c[2] + tangent[2] * Math.cos(a) * rad]; });
  return { wall, u, yc, r, glass: ring(r, 0.012), frame: ring(r + rim, 0.006), n: W.n };
}
// Room A's layout (stageA.mjs fills it): where the window, the capsule and the stations are, and where each person stands
export function build(layout) {
  const h = SIZE / 2, quads = [], Q = (pts, fill, n, kind) => quads.push({ pts, fill, n, kind });
  Q([[-h, 0, -h], [h, 0, -h], [h, 0, h], [-h, 0, h]], TOK.deep, [0, 1, 0], 'floor');
  Q([[-h, CEIL, -h], [h, CEIL, -h], [h, CEIL, h], [-h, CEIL, h]], TOK.deep, [0, -1, 0], 'ceiling');
  Q([[-h, 0, h], [h, 0, h], [h, CEIL, h], [-h, CEIL, h]], TOK.mid, [0, 0, -1], 'wall');
  Q([[-h, 0, -h], [h, 0, -h], [h, CEIL, -h], [-h, CEIL, -h]], TOK.mid, [0, 0, 1], 'wall');
  Q([[h, 0, -h], [h, 0, h], [h, CEIL, h], [h, CEIL, -h]], TOK.shadow, [-1, 0, 0], 'wall');
  Q([[-h, 0, -h], [-h, 0, h], [-h, CEIL, h], [-h, CEIL, -h]], TOK.shadow, [1, 0, 0], 'wall');
  for (let x = -Math.floor(h); x <= Math.floor(h) + 1e-9; x += 1) if (Math.abs(x) < h - 0.05) Q([[x - 0.012, 0.002, -h], [x + 0.012, 0.002, -h], [x + 0.012, 0.002, h], [x - 0.012, 0.002, h]], TOK.shadow, [0, 1, 0], 'seam');
  for (let z = -Math.floor(h); z <= Math.floor(h) + 1e-9; z += 1) if (Math.abs(z) < h - 0.05) Q([[-h, 0.002, z - 0.012], [h, 0.002, z - 0.012], [h, 0.002, z + 0.012], [-h, 0.002, z + 0.012]], TOK.shadow, [0, 1, 0], 'seam');
  // the lamps: two light bars across the solid ceiling, east to west
  for (const z of layout.lamps.z) Q([[-layout.lamps.half, CEIL - 0.003, z - 0.05], [layout.lamps.half, CEIL - 0.003, z - 0.05], [layout.lamps.half, CEIL - 0.003, z + 0.05], [-layout.lamps.half, CEIL - 0.003, z + 0.05]], '#F4EBDD', [0, -1, 0], 'light');
  const win = roundWindow(...layout.window);
  Q(win.frame, TOK.pale, win.n, 'frame'); Q(win.glass, '#000', win.n, 'window');
  const people = IDS.map(id => { const s = layout.people[id]; return { place: id, ...CAST[id], x: s.at[0], z: s.at[1], Y: 0, face: s.faceDeg * DEG, camYaw: yawOf(PLACES[id].camera_facing_degrees), plan: toRoom(PLACES[id]), mirror: !!s.mirror }; });
  const P = id => people.find(p => p.place === id), objects = layout.stations(P).flat();
  if (layout.capsule) objects.push(layout.capsule());
  return { size: SIZE, h, quads, objects, people, P, window: win, layout };
}
export { cylinder, slab };

// ---- One phone view, as Room B's layout test draws it (roomb/vis/vis5.mjs phoneView), with PV6's straight-line camera
const seenQ = (cam, q) => { const p0 = q.pts[0], d = [cam.C[0] - p0[0], cam.C[1] - p0[1], cam.C[2] - p0[2]]; return d[0] * q.n[0] + d[1] * q.n[1] + d[2] * q.n[2] > 0; };
const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const box2 = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const nearBox = (b, c, r) => Math.hypot(Math.max(b.x0, Math.min(c[0], b.x1)) - c[0], Math.max(b.y0, Math.min(c[1], b.y1)) - c[1]) < r;
export const spriteRect = fg => ({ left: fg.anchor[0] - (fg.p.mirror ? 148 : 152) * fg.u, top: fg.anchor[1] - 273 * fg.u, size: 300 * fg.u, flip: !!fg.p.mirror });
function paints(r, id, x, y) { let sx = ((x - r.left) / r.size) * 300; const sy = ((y - r.top) / r.size) * 300; if (r.flip) sx = 300 - sx; return !(sx < 0 || sy < 0 || sx >= 300 || sy >= 300) && ALPHA[id][Math.floor(sy) * 300 + Math.floor(sx)] === 1; }
const poly = (pts, fill, ink = true) => `<polygon points="${pts.map(p => p.map(f1).join(',')).join(' ')}" fill="${fill}"${ink ? ` stroke="${TOK.deep}" stroke-width="0.9" stroke-linejoin="round"` : ''}/>`;
export function phoneView(room, viewer, occupied, { W = 390, H = 844, pct = 100, fov = 70, pitch = -5, squares: showSquares = true, labels = true, C = null, yaw = null, img = p => `${p.place}.png` } = {}) {
  const SH = H - TOP - BOT, m = MEASURED[pct], k2 = pct / 100, f = W / 2 / Math.tan((fov / 2) * DEG), hy = SH / 2 + f * Math.tan(pitch * DEG);
  const V = room.P(viewer), Cc = C ?? [V.plan[0], EYE, V.plan[1]], cam = camera({ C: Cc, yaw: yaw ?? V.camYaw, f, cx: W / 2, hy, mode: 'rect' });
  const shell = room.quads.filter(q => q.kind === 'floor' || q.kind === 'ceiling' || seenQ(cam, q)).map(q => { const pp = project(cam, q.pts); return pp && poly(pp, q.fill, !['seam', 'light'].includes(q.kind)); }).filter(Boolean);
  const items = room.objects.filter(o => o.place !== viewer).map(o => ({ z: cam.dist(cam.view(o.c)), kind: 'object', name: o.place ? `${room.P(o.place).name}'s ${o.name}` : o.name, polys: o.faces.map(fc => ({ pp: project(cam, fc.pts), fill: fc.fill })).filter(x => x.pp) }));
  for (const it of items) it.svg = it.polys.map(x => poly(x.pp, x.fill)).join('');
  const others = room.people.filter(p => p.place !== viewer && occupied.includes(p.place));
  const seenIds = others.filter(p => inCone(viewer, p.place)).map(p => p.place), hiddenIds = others.filter(p => !inCone(viewer, p.place)).map(p => p.place);
  const all = others.map(p => ({ p, fg: figure(cam, p) }));
  const drawn = all.filter(a => a.fg && a.fg.box[2] > 0 && a.fg.box[0] < W);
  for (const { p, fg } of drawn) { const r = spriteRect(fg), xc = r.left + r.size / 2; items.push({ z: fg.z - 0.05, kind: 'figure', place: p.place, id: p.id, rect: r, svg: `<image href="${img(p)}" x="${f1(r.left)}" y="${f1(r.top)}" width="${f1(r.size)}" height="${f1(r.size)}"${r.flip ? ` transform="translate(${f1(2 * xc)} 0) scale(-1 1)"` : ''}/>` }); }
  items.sort((a, b) => b.z - a.z);
  const figs = all.filter(a => seenIds.includes(a.p.place) && a.fg).map(a => ({ ...a.fg, place: a.p.place, name: a.p.name, num: a.p.num, id: a.p.id }));
  const label = { x0: 12, y0: 10, x1: 12 + m.label[0], y1: 10 + m.label[1] }, ctl = { x0: W / 2 - m.control[0] / 2, x1: W / 2 + m.control[0] / 2, y0: SH - 76, y1: SH - 32 };
  const chip = { x0: W / 2 - m.chip[0] / 2, x1: W / 2 + m.chip[0] / 2, y1: ctl.y0 - 8, y0: ctl.y0 - 8 - m.chip[1] };
  const youT = `You: ${V.num} ${V.name}`, youW = Math.round(youT.length * 6.4 * k2 + 16), you = { x0: W - 8 - youW, x1: W - 8, y0: label.y0 + 2, y1: label.y0 + 2 + Math.round(20 * k2) };
  const blind = FULL[viewer].blind_place, outP = occupied.includes(blind) ? room.P(blind) : null;
  const ooc = outP ? (() => { const [w, h] = CHIPS[pct]['chip' + outP.id], y0 = you.y1 + 10; return { id: outP.id, place: blind, name: outP.name, num: outP.num, x0: W - 6 - w, x1: W - 6, y0, y1: y0 + h, press: { x0: W - 6 - w, x1: W - 6, y0: y0 + h / 2 - Math.max(44, h) / 2, y1: y0 + h / 2 + Math.max(44, h) / 2 } }; })() : null;
  const chrome = [['label', label], ['Windows control', ctl], ['Board chip', chip], ['You', you], ...(ooc ? [['out-of-view chip', ooc.press]] : [])];
  const squares = figs.map(fg => ({ id: fg.id, x0: fg.press[0] - fg.side / 2, x1: fg.press[0] + fg.side / 2, y0: fg.press[1] - fg.side / 2, y1: fg.press[1] + fg.side / 2 }));
  const faces = figs.map(fg => { const r = fg.headR * 0.85; return { x0: fg.head[0] - r, x1: fg.head[0] + r, y0: fg.head[1] - r, y1: fg.head[1] + r }; });
  const tagsIn = figs.map(fg => ({ seat: fg.id, at: { x: fg.press[0], bottom: fg.press[1] + fg.side / 2 }, width: m['t' + fg.id][0], height: m['t' + fg.id][1], self: false }));
  const keepClear = [...chrome.map(([, b]) => b), ...faces].map(b => ({ left: b.x0, top: b.y0, width: b.x1 - b.x0, height: b.y1 - b.y0 }));
  const issues = [];
  const laid = figs.length ? layoutTags({ panel: { width: W, height: SH }, pad: 4, gap: 2, lift: 2, footClear: 34, keepClear, tags: tagsIn }) : { places: [], inside: true, apart: true };
  const accepted = laid.places.map(pl => { const t = tagsIn.find(x => x.seat === pl.seat); return { id: pl.seat, x0: pl.left, x1: pl.left + t.width, y0: pl.top, y1: pl.top + t.height }; });
  // Tags at the feet (Room B's five-view page, settled with the Lead on 18 November): each tag first goes just under its person's
  // feet; where something is in its way, the smallest nudge, to any side and at most 6 px, that clears it; and only where no such
  // nudge does it, the accepted layout's place. In the way: the room's controls and chip, a face, a tag already placed, the stage's
  // sides, and the 34 px the layout keeps clear above the stage's foot.
  const tags = [], blockers = [...chrome.map(([, b]) => b), ...faces];
  const free = b => b.x0 >= 4 && b.x1 <= W - 4 && b.y0 >= 4 && b.y1 <= SH - 34 && !blockers.some(o => box2(b, o)) && !tags.some(o => box2(b, o));
  for (const fg of [...figs].sort((a, b) => b.anchor[1] - a.anchor[1])) { const t = tagsIn.find(x => x.seat === fg.id), x0 = fg.anchor[0] - t.width / 2, y0 = fg.anchor[1] + 4;
    let put = null; for (let r = 0; r <= 6 && !put; r += 1) for (const [dx, dy] of r ? [[0, -r], [0, r], [-r, 0], [r, 0], [-r, -r], [r, -r], [-r, r], [r, r]] : [[0, 0]]) { const b = { id: fg.id, x0: x0 + dx, x1: x0 + dx + t.width, y0: y0 + dy, y1: y0 + dy + t.height }; if (free(b)) { put = { ...b, at: r ? `the feet, nudged ${r} px` : 'the feet' }; break; } }
    tags.push(put ?? { ...accepted.find(a => a.id === fg.id), at: 'the accepted place' }); }
  for (const t of tags) if (t.at === 'the accepted place' && tags.some(o => o !== t && box2(t, o))) issues.push('tags touch');
  // checks
  const per = {};
  for (const id of seenIds) if (!figs.find(fg => fg.place === id)) issues.push(`${room.P(id).name} in the cone but not drawable`);
  for (const fg of figs) {
    const p = room.P(fg.place), sq = squares.find(s => s.id === fg.id), tag = tags.find(t => t.id === fg.id), it = items.findIndex(i => i.kind === 'figure' && i.id === fg.id), nearer = it >= 0 ? items.slice(it + 1) : [];
    const pts = []; { const r = 0.8 * fg.headR; for (let gy = -1; gy <= 1.001; gy += 0.125) for (let gx = -1; gx <= 1.001; gx += 0.125) if (gx * gx + gy * gy <= 1) pts.push([fg.head[0] + gx * r, fg.head[1] + gy * r]); }
    const cover = {}; for (const [x, y] of pts) { let by = null; for (const n2 of nearer) { if (n2.kind === 'object') { if (n2.polys.some(q => inPoly(q.pp, x, y))) by = n2.name; } else if (paints(n2.rect, n2.id, x, y)) by = room.P(n2.place).name; } if (by) cover[by] = (cover[by] ?? 0) + 1; }
    const sa = seenAt(Cc, p), head = headFor(sa, fg.name);
    const c = per[fg.place] = { name: fg.name, offsetDeg: +offsetDeg(viewer, fg.place).toFixed(1), seenDeg: +sa.toFixed(1), head, distM: +fg.z.toFixed(2),
      heightPx: Math.round(239.7 * fg.u), whole: fg.box[0] >= 0 && fg.box[2] <= W && fg.box[1] >= 0 && fg.box[3] <= SH, marginL: Math.round(fg.box[0]), marginR: Math.round(W - fg.box[2]), marginTop: Math.round(fg.box[1]), marginFoot: Math.round(SH - fg.box[3]),
      tagAt: tag?.at ?? null, press: +fg.side.toFixed(1), pressInside: sq.x0 >= 0 && sq.x1 <= W && sq.y0 >= 0 && sq.y1 <= SH, tagged: !!tag, faceCovered: Object.fromEntries(Object.entries(cover).map(([n, c3]) => [n, Math.round((100 * c3) / pts.length)])) };
    if (!c.whole) issues.push(`${fg.name} cut off`); if (!c.tagged) issues.push(`${fg.name} has no tag`); if (c.press < 44) issues.push(`${fg.name}'s press area under 44 px`); if (!c.pressInside) issues.push(`${fg.name}'s press area not whole`);
    if (head === 'NEEDS A SKETCH') issues.push(`${fg.name} seen at ${Math.abs(sa).toFixed(0)}°: no head for it`);
    for (const [n, b] of chrome) { if (box2(sq, b)) issues.push(`${fg.name}'s press area under the ${n}`); if (nearBox(b, fg.head, fg.headR * 0.8)) issues.push(`${fg.name}'s face under the ${n}`); }
    if (tag) for (const o of figs) if (nearBox(tag, o.head, o.headR * 0.8)) issues.push(`${fg.name}'s tag on ${o.name}'s face`);
    for (const [n, val] of Object.entries(c.faceCovered)) if (val >= 10) issues.push(`${fg.name}'s face ${val}% behind ${n}`);
  }
  for (let i = 0; i < figs.length; i += 1) for (let j = i + 1; j < figs.length; j += 1) { if (Math.hypot(figs[i].head[0] - figs[j].head[0], figs[i].head[1] - figs[j].head[1]) < figs[i].headR + figs[j].headR + 4) issues.push(`faces ${figs[i].name}/${figs[j].name} touch`); if (box2(squares[i], squares[j])) issues.push(`press ${figs[i].name}/${figs[j].name} overlap`); }
  if (!laid.inside) issues.push('a tag does not fit inside'); if (!laid.apart) issues.push('tags touch');
  const hidden = hiddenIds.map(id => { const a = all.find(x => x.p.place === id), fg = a.fg; const gap = fg ? Math.round(fg.box[0] >= W ? fg.box[0] - W : fg.box[2] <= 0 ? -fg.box[2] : -1) : null;
    const out = !fg || fg.box[0] >= W || fg.box[2] <= 0; if (!out) issues.push(`${a.p.name} (not in the cone) partly in the picture`); return { place: id, name: a.p.name, offsetDeg: +offsetDeg(viewer, id).toFixed(1), out, gapPx: gap }; });
  if (ooc) { if (ooc.x0 < 0 || ooc.y1 > SH) issues.push('the out-of-view chip does not fit'); for (const t of tags) if (box2(t, ooc)) issues.push('a tag on the out-of-view chip'); for (const fg of figs) if (nearBox(ooc, fg.head, fg.headR * 0.8)) issues.push(`the out-of-view chip on ${fg.name}'s face`); for (const q of squares) if (box2(q, ooc.press)) issues.push('a press area under the out-of-view chip'); }
  // the round window and the capsule: in the picture, how much of the glass shows, and is anyone in front of it?
  const boxOf = pp => { const xs = pp.map(p => p[0]), ys = pp.map(p => p[1]); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; };
  const glassPP = seenQ(cam, { pts: room.window.glass, n: room.window.n }) ? project(cam, room.window.glass) : null, wb = glassPP ? boxOf(glassPP) : null;
  const clipBox = b => b && { x0: Math.max(0, b.x0), x1: Math.min(W, b.x1), y0: Math.max(0, b.y0), y1: Math.min(SH, b.y1) };
  const shown = b => { const c = clipBox(b); return c && c.x1 > c.x0 && c.y1 > c.y0 ? ((c.x1 - c.x0) * (c.y1 - c.y0)) / ((b.x1 - b.x0) * (b.y1 - b.y0)) : 0; };
  const inFront = (pp, b) => { if (!b) return []; const out = []; for (const { p, fg } of drawn) { const r = spriteRect(fg); let hit = 0, n = 0; for (let gy = 0; gy <= 1; gy += 0.1) for (let gx = 0; gx <= 1; gx += 0.1) { const x = b.x0 + gx * (b.x1 - b.x0), y = b.y0 + gy * (b.y1 - b.y0); if (!inPoly(pp, x, y)) continue; n += 1; if (paints(r, p.id, x, y)) hit += 1; } if (hit) out.push(`${p.name} ${Math.round((100 * hit) / n)}%`); } return out; };
  const capsule = room.objects.find(o => o.kind === 'capsule'), capFaces = capsule ? capsule.faces.map(fc => project(cam, fc.pts)).filter(Boolean) : [], capPP = capFaces.flat(), cb = capPP.length ? boxOf(capPP) : null;
  // who stands in front of the capsule: a nearer person whose figure paints over its faces
  const capZ = capsule ? cam.dist(cam.view(capsule.c)) : 0, capFront = () => { if (!cb) return []; const out = []; for (const { p, fg } of drawn) { if (fg.z > capZ) continue; const r = spriteRect(fg); let hit = 0, n = 0;
    for (let gy = 0; gy <= 1; gy += 0.1) for (let gx = 0; gx <= 1; gx += 0.1) { const x = cb.x0 + gx * (cb.x1 - cb.x0), y = cb.y0 + gy * (cb.y1 - cb.y0); if (!capFaces.some(q => inPoly(q, x, y))) continue; n += 1; if (paints(r, p.id, x, y)) hit += 1; }
    if (hit) out.push(`${p.name} ${Math.round((100 * hit) / n)}%`); } return out; };
  const features = { window: { inPicture: !!wb && shown(wb) > 0, shownPct: wb ? Math.round(100 * shown(wb)) : 0, box: wb && clipBox(wb), people: inFront(glassPP, wb) },
    capsule: capsule ? { inPicture: !!cb && shown(cb) > 0, shownPct: cb ? Math.round(100 * shown(cb)) : 0, box: cb && clipBox(cb), people: capFront() } : null };
  // drawing
  const pill = (t, num, name, text = name) => { const h = t.y1 - t.y0, r = h / 2, d = 20 * k2, x = t.x0;
    return `<rect x="${f1(t.x0)}" y="${f1(t.y0)}" width="${f1(t.x1 - t.x0)}" height="${f1(h)}" rx="${f1(r)}" fill="rgba(12,15,22,0.86)" stroke="rgba(244,235,221,0.28)" stroke-width="1.5"/>`
      + `<circle cx="${f1(x + 3 * k2 + d / 2)}" cy="${f1(t.y0 + r)}" r="${f1(d / 2)}" fill="#F4EBDD"/><text x="${f1(x + 3 * k2 + d / 2)}" y="${f1(t.y0 + r + 4.2 * k2)}" text-anchor="middle" ${FONT} font-size="${12 * k2}" font-weight="800" fill="#10141C">${num}</text>`
      + `<text x="${f1(x + 3 * k2 + d + 5 * k2)}" y="${f1(t.y0 + r + 4.5 * k2)}" ${FONT} font-size="${13 * k2}" font-weight="600" fill="#F4EBDD">${text}</text>`; };
  const sqSvg = b => `<rect x="${f1(b.x0)}" y="${f1(b.y0)}" width="${f1(b.x1 - b.x0)}" height="${f1(b.y1 - b.y0)}" fill="none" stroke="#00E5FF" stroke-width="1.5" stroke-dasharray="5 3" opacity="0.85"/>`;
  const bars = `<rect width="${W}" height="${TOP}" fill="#0F1117"/><text x="${W / 2}" y="${TOP / 2 + 22}" text-anchor="middle" ${FONT} font-size="12" fill="#5B6273" letter-spacing="0.5">Top bar</text><rect y="${H - BOT}" width="${W}" height="${BOT}" fill="#0F1117"/><text x="${W / 2}" y="${H - BOT / 2 + 4}" text-anchor="middle" ${FONT} font-size="12" fill="#5B6273" letter-spacing="0.5">Bottom bar</text>`;
  const overlay = `<g transform="translate(${label.x0} ${label.y0}) skewX(-9) rotate(-1.4)"><rect width="${m.label[0]}" height="${m.label[1]}" fill="#F1B84B" stroke="#10141C" stroke-width="2"/></g><text x="${f1(label.x0 + m.label[0] / 2)}" y="${f1(label.y0 + m.label[1] / 2 + 5.5 * k2)}" text-anchor="middle" font-family="Arial Narrow, Arial, sans-serif" font-size="${15 * k2}" font-weight="800" letter-spacing="1" fill="#10141C">ROOM A</text>`
    + `<rect x="${f1(ctl.x0)}" y="${ctl.y0}" width="${m.control[0]}" height="44" rx="22" fill="#F4EBDD"/><text x="${f1(W / 2)}" y="${f1(ctl.y0 + 27.5)}" text-anchor="middle" ${FONT} font-size="${15 * k2}" font-weight="600" fill="#10141C">Windows · 1</text>`
    + `<rect x="${f1(chip.x0)}" y="${chip.y0}" width="${m.chip[0]}" height="${m.chip[1]}" rx="16" fill="rgba(12,15,22,0.86)" stroke="rgba(244,235,221,0.4)" stroke-dasharray="4 3"/><text x="${f1(W / 2)}" y="${f1(chip.y0 + 21)}" text-anchor="middle" ${FONT} font-size="${13 * k2}" font-weight="600" fill="#F4EBDD">Other rooms on the Board</text>`
    + `<rect x="${you.x0}" y="${you.y0}" width="${youW}" height="${you.y1 - you.y0}" rx="${Math.round(10 * k2)}" fill="rgba(12,15,22,0.86)"/><text x="${f1(you.x0 + youW / 2)}" y="${f1(you.y0 + 14 * k2)}" text-anchor="middle" ${FONT} font-size="${11 * k2}" font-weight="600" fill="rgba(244,235,221,0.85)">${youT}</text>`
    + (ooc ? pill(ooc, ooc.num, ooc.name, `${ooc.name} · out of view`) : '');
  // test-page only: the angle each person is seen at and the head it takes, at their feet
  const needLabels = labels ? figs.map(fg => { const c = per[fg.place], t = `${Math.abs(c.seenDeg).toFixed(0)}° · ${c.head}`, w = t.length * 5.6 + 10, x = fg.anchor[0] - w / 2, y = fg.box[3] + 3, bad = c.head === 'NEEDS A SKETCH';
    return `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="15" rx="3" fill="${bad ? 'rgba(255,90,90,0.95)' : 'rgba(241,184,75,0.92)'}"/><text x="${f1(fg.anchor[0])}" y="${f1(y + 11)}" text-anchor="middle" ${FONT} font-size="10" font-weight="700" fill="#10141C">${t}</text>`; }).join('') : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#0F1117"/>${bars}<svg x="0" y="${TOP}" width="${W}" height="${SH}" viewBox="0 0 ${W} ${SH}" overflow="hidden"><rect width="${W}" height="${SH}" fill="${TOK.deep}"/>${shell.join('')}${items.map(i => i.svg).join('')}${needLabels}${showSquares ? [...squares, ...(ooc ? [ooc.press] : [])].map(sqSvg).join('') : ''}${tags.map(t => { const fg = figs.find(x => x.id === t.id); return pill(t, fg.num, fg.name); }).join('')}${overlay}</svg></svg>`;
  const layout = { W, SH, f, hy, squares, chip: ooc ? { x0: ooc.x0, y0: ooc.y0, x1: ooc.x1, y1: ooc.y1, press: ooc.press, name: ooc.name, num: ooc.num } : null, tags, figs: figs.map(fg => ({ place: fg.place, name: fg.name, num: fg.num, anchor: fg.anchor, head: fg.head, headR: fg.headR, u: fg.u, box: fg.box })),
    // the room's own controls as this view draws and checks them (added for view A's owner page; nothing else changes)
    chrome: { label, control: ctl, boardChip: chip, you, labelText: 'ROOM A', controlText: 'Windows · 1', boardText: 'Other rooms on the Board', youText: youT } };
  return { svg, issues, per, hidden, features, layout, cam, chip: ooc ? { name: ooc.name, box: [ooc.x0, ooc.y0, ooc.x1, ooc.y1].map(Math.round) } : null, seen: seenIds, f: +f.toFixed(2), hy: +hy.toFixed(1), SH };
}
