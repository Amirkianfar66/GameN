// Room B, a view from each place: the owner's design v1 (docs/design/room-visibility/gamen-room-visibility-design-v1.json,
// read unchanged). Places A to E on the walls of a compact square room, the centre open, each with a fixed 90° view; in a
// full room each player sees three of the other four, and the fourth stands just off their right shoulder. A layout test:
// flat blockout in Room B's family, the approved crew drawings as front stand-in cut-outs (turned to the camera), the room
// scene's tag layout and the test pages' checks.
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { camera, project, figure, UNIT_M, DEG, TOP, BOT } from '../ring/ring4b.mjs';
import { layoutTags } from '../../pr284/design/phone-ui/components/tag-layout.mjs';
import { skeletonOf } from '../../pr284/apps/game/hosted/scene-drawing/gestures.mjs';
import { pressPoint } from '../../pr284/apps/game/hosted/scene-drawing/frame.mjs';
import { pressSide } from '../../pr284/apps/game/hosted/board-v2-drawing/fit-four.mjs';
import { FIGURE_EXTENTS } from '../../pr284/design/phone-ui/components/room-scene/figure-extents.mjs';
export { DEG, TOP, BOT, UNIT_M };

const DIR = new URL('./', import.meta.url).pathname;
const RAW = readFileSync(DIR + '../vis-design-v1.json');
export const DESIGN_SHA = createHash('sha256').update(RAW).digest('hex');
export const DESIGN = JSON.parse(RAW);
export const PLACES = Object.fromEntries(DESIGN.layout.places.map(p => [p.id, p]));
export const FULL = DESIGN.full_room_visibility.per_place;
export const IDS = ['A', 'B', 'C', 'D', 'E'];
// Who stands where, by person (crew-drawing-1.0.0's public ids, apps/game/hosted/crew-drawing/crew.mjs): A Mira c8, B Juno c7,
// C Lyra c3, D Atlas c4, E Vega c1. The stand-in pictures B1 to B5 came from the ring test, where they were five seats in entry
// order; they were given to the places by that order (B1 -> A, B2 -> B, ...), not by who they show. Only B1 is the person named:
// B1 shows Mira (c8); B2 shows Lyra (c3: bun, green); B3 and B3s show Orion (c5: bald, white moustache, teal; B3 from the back);
// B4 shows Vega (c1: afro, glasses, orange); B5 shows Nova (c6: bob, headphones, magenta). Fixed 18 November 2026 (the Lead's
// report): each place names its person by crew id; drawing says whose drawing its picture is; where they differ, the stand-in
// is drawn as a plain shape (shape: the picture's silhouette), never with another person's face. The gestures (poses) are kept.
export const CAST = {
  A: { id: 'B1', name: 'Mira', crew: 'c8', drawing: 'c8', num: 1, gesture: 'tablet', mirror: true, png: 'B1.png', shape: 'B1-shape.png' },
  B: { id: 'B2', name: 'Juno', crew: 'c7', drawing: 'c3', num: 2, gesture: 'laptopStool', mirror: false, png: 'B2.png', shape: 'B2-shape.png' },
  C: { id: 'B3', name: 'Lyra', crew: 'c3', drawing: 'c5', num: 3, gesture: 'stand', mirror: false, png: 'B3s.png', shape: 'B3s-shape.png' },
  D: { id: 'B4', name: 'Atlas', crew: 'c4', drawing: 'c1', num: 4, gesture: 'leanBench', mirror: false, png: 'B4.png', shape: 'B4-shape.png' },
  E: { id: 'B5', name: 'Vega', crew: 'c1', drawing: 'c6', num: 5, gesture: 'microscope', mirror: false, png: 'B5.png', shape: 'B5-shape.png' },
};
// the picture to draw for a stand-in: the person's own drawing, or else the plain shape
export const standInPng = p => (p.drawing === p.crew ? p.png : p.shape);
export const STANDIN_MISMATCH = Object.entries(CAST).filter(([, c]) => c.drawing !== c.crew).map(([pl, c]) => `${pl} ${c.name} (${c.crew}): ${c.png} shows ${c.drawing}`);
// tokens 0.5.0 color.room.roomB
export const TOK = Object.freeze({ deep: '#2A1446', shadow: '#4B2079', mid: '#7A3CAD', light: '#AE6CD3', pale: '#DCB6EE' });
export const EYE = 1.6, CEIL = 3.0;
const MEASURED = JSON.parse(readFileSync(DIR + '../ring/measured.json', 'utf8')), CHIPS = JSON.parse(readFileSync(DIR + 'chips.json', 'utf8'));
const A0 = JSON.parse(readFileSync(DIR + '../ring/alpha.json', 'utf8')), A3 = JSON.parse(readFileSync(DIR + 'alpha-B3s.json', 'utf8'));
export const ALPHA = { B1: Buffer.from(A0.B1, 'base64'), B2: Buffer.from(A0.B2, 'base64'), B3: Buffer.from(A3.B3s, 'base64'), B4: Buffer.from(A0.B4, 'base64'), B5: Buffer.from(A0.B5, 'base64') };
const FONT = 'font-family="-apple-system, system-ui, sans-serif"';
const f1 = n => (+n).toFixed(1);

// The file's plan (x east, y south, origin top-left, 0..1) to the room (metres: X east, Z north, the centre at 0, 0); its
// directions (degrees clockwise from east) to the camera's yaw (0 = north, 90 = east).
export const toRoom = (pl, size) => [(pl.anchor.x - 0.5) * size, (0.5 - pl.anchor.y) * size];
export const yawOf = deg => (((deg + 90) % 360) * DEG);
const sgn = a => ((((a + 180) % 360) + 360) % 360) - 180;
const bearing = (from, to) => (Math.atan2(to.anchor.y - from.anchor.y, to.anchor.x - from.anchor.x) / DEG + 360) % 360;
// the file's own test: the subject's centre inside the viewer's 90° cone; and the angle each subject is seen from
export const offsetDeg = (v, s) => sgn(bearing(PLACES[v], PLACES[s]) - PLACES[v].camera_facing_degrees);
export const inCone = (v, s) => v !== s && Math.abs(offsetDeg(v, s)) <= 45 + 1e-9;
export const seenFromDeg = (v, s) => sgn(bearing(PLACES[s], PLACES[v]) - PLACES[s].baseline_body_facing_degrees);   // + : from the subject's right
export const needs = (v, s) => { const a = seenFromDeg(v, s); return Math.abs(a) < 15 ? 'front' : `needs ${Math.abs(a) > 55 ? 72 : 35}° ${a > 0 ? 'R' : 'L'}`; };

// ---- The room
const at = (p, fwd, right) => [p.x + Math.sin(p.face) * fwd + Math.cos(p.face) * right, p.z + Math.cos(p.face) * fwd - Math.sin(p.face) * right];
function orientedBox(name, place, c, w, d, y0, y1, yaw, slant = 0) {
  const cs = Math.cos(yaw), sn = Math.sin(yaw), k = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([a, b]) => [c[0] + a * cs + b * sn, c[1] - a * sn + b * cs]);
  const top = i => (slant && (i === 0 || i === 1) ? y1 - slant : y1);   // a slanted top: lower at the front (the person's side)
  const faces = [[0, 1], [1, 2], [2, 3], [3, 0]].map(([i, j]) => ({ pts: [[k[i][0], y0, k[i][1]], [k[j][0], y0, k[j][1]], [k[j][0], top(j), k[j][1]], [k[i][0], top(i), k[i][1]]], fill: TOK.light }));
  faces.push({ pts: k.map(([x, z], i) => [x, top(i), z]), fill: TOK.pale });
  return { name, place, faces, c: [c[0], (y0 + y1) / 2, c[1]], foot: k, h: y1 };
}
function cylinder(name, place, c, r, y0, y1) {
  const n = 18, faces = [];
  for (let i = 0; i < n; i += 1) { const a = (i / n) * 2 * Math.PI, b = ((i + 1) / n) * 2 * Math.PI; faces.push({ pts: [[c[0] + r * Math.cos(a), y0, c[1] + r * Math.sin(a)], [c[0] + r * Math.cos(b), y0, c[1] + r * Math.sin(b)], [c[0] + r * Math.cos(b), y1, c[1] + r * Math.sin(b)], [c[0] + r * Math.cos(a), y1, c[1] + r * Math.sin(a)]], fill: TOK.light }); }
  faces.push({ pts: Array.from({ length: n }, (_, i) => [c[0] + r * Math.cos((i / n) * 2 * Math.PI), y1, c[1] + r * Math.sin((i / n) * 2 * Math.PI)]), fill: TOK.pale });
  return { name, place, faces, c: [c[0], (y0 + y1) / 2, c[1]], foot: Array.from({ length: 12 }, (_, i) => [c[0] + r * Math.cos((i / 12) * 2 * Math.PI), c[1] + r * Math.sin((i / 12) * 2 * Math.PI)]), h: y1 };
}
// The window and the screen: on a wall (n, e, s, w) at t along it (0..1, clockwise round the room from the north-west corner).
export function feature(size, wall, t, w, y0, y1) {
  const h = size / 2, e = 0.012, u = -h + t * size;
  const pts = { n: [[u - w / 2, y0, h - e], [u + w / 2, y0, h - e], [u + w / 2, y1, h - e], [u - w / 2, y1, h - e]], s: [[-u + w / 2, y0, -h + e], [-u - w / 2, y0, -h + e], [-u - w / 2, y1, -h + e], [-u + w / 2, y1, -h + e]],
    e: [[h - e, y0, -u + w / 2], [h - e, y0, -u - w / 2], [h - e, y1, -u - w / 2], [h - e, y1, -u + w / 2]], w: [[-h + e, y0, u - w / 2], [-h + e, y0, u + w / 2], [-h + e, y1, u + w / 2], [-h + e, y1, u - w / 2]] }[wall];
  const n = { n: [0, 0, -1], s: [0, 0, 1], e: [-1, 0, 0], w: [1, 0, 0] }[wall];
  return { wall, t, w, y0, y1, pts, n };
}
export const WINDOW = { w: 1.5, y0: 1.3, y1: 2.45 }, SCREEN = { w: 0.95, y0: 1.45, y1: 2.0 };
// The window and the screen, where nobody stands in front of them in any view (chooser.mjs): the window on the south wall,
// its centre a quarter of the way from the west corner; the screen on the west wall, a fifth of the way from the north corner.
export const PLACEMENT = { window: ['s', 0.75], screen: ['w', 0.8] };
export function build(size, place = PLACEMENT) {
  const h = size / 2, quads = [], Q = (pts, fill, n, kind) => quads.push({ pts, fill, n, kind });
  Q([[-h, 0, -h], [h, 0, -h], [h, 0, h], [-h, 0, h]], TOK.deep, [0, 1, 0], 'floor');
  Q([[-h, CEIL, -h], [h, CEIL, -h], [h, CEIL, h], [-h, CEIL, h]], TOK.deep, [0, -1, 0], 'ceiling');
  Q([[-h, 0, h], [h, 0, h], [h, CEIL, h], [-h, CEIL, h]], TOK.mid, [0, 0, -1], 'wall');
  Q([[-h, 0, -h], [h, 0, -h], [h, CEIL, -h], [-h, CEIL, -h]], TOK.mid, [0, 0, 1], 'wall');
  Q([[h, 0, -h], [h, 0, h], [h, CEIL, h], [h, CEIL, -h]], TOK.shadow, [-1, 0, 0], 'wall');
  Q([[-h, 0, -h], [-h, 0, h], [-h, CEIL, h], [-h, CEIL, -h]], TOK.shadow, [1, 0, 0], 'wall');
  for (let x = -Math.floor(h); x <= Math.floor(h) + 1e-9; x += 1) if (Math.abs(x) < h - 0.05) Q([[x - 0.012, 0.002, -h], [x + 0.012, 0.002, -h], [x + 0.012, 0.002, h], [x - 0.012, 0.002, h]], TOK.shadow, [0, 1, 0], 'seam');
  for (let z = -Math.floor(h); z <= Math.floor(h) + 1e-9; z += 1) if (Math.abs(z) < h - 0.05) Q([[-h, 0.002, z - 0.012], [h, 0.002, z - 0.012], [h, 0.002, z + 0.012], [-h, 0.002, z + 0.012]], TOK.shadow, [0, 1, 0], 'seam');
  const win = feature(size, ...place.window, WINDOW.w, WINDOW.y0, WINDOW.y1), scr = feature(size, ...place.screen, SCREEN.w, SCREEN.y0, SCREEN.y1);
  const frame = (fe, m) => { const [a, b, c] = [fe.pts[0], fe.pts[1], fe.pts[2]], ux = [(b[0] - a[0]) / fe.w, 0, (b[2] - a[2]) / fe.w], off = [fe.n[0] * 0.004, 0, fe.n[2] * 0.004];
    const P = (p, du, dy) => [p[0] + ux[0] * du + off[0], p[1] + dy, p[2] + ux[2] * du + off[2]]; return [P(a, -m, -m), P(b, m, -m), P(c, m, m), P(fe.pts[3], -m, m)]; };
  Q(frame(win, 0.09), TOK.pale, win.n, 'frame'); Q(win.pts.map(p => [p[0] + win.n[0] * 0.008, p[1], p[2] + win.n[2] * 0.008]), '#000', win.n, 'window');
  Q(frame(scr, 0.06), TOK.light, scr.n, 'frame'); Q(scr.pts.map(p => [p[0] + scr.n[0] * 0.008, p[1], p[2] + scr.n[2] * 0.008]), '#000', scr.n, 'screen');
  const people = IDS.map(id => { const pl = PLACES[id], [x, z] = toRoom(pl, size); return { place: id, ...CAST[id], x, z, Y: 0, face: yawOf(pl.baseline_body_facing_degrees), camYaw: yawOf(pl.camera_facing_degrees) }; });
  const P = id => people.find(p => p.place === id), objects = [];
  // Low workstations, at each person's left (everyone is seen from the front or their right, so nothing stands between a
  // person and the three who see them); Atlas and Vega lean over a low bench in front, as their gestures do.
  // a side station: at the person's left and a little forward, slid along the wall to stay inside the room, its long side
  // along the nearest wall (so it is angled to the person, who faces into the room)
  const side = (p, w, d) => { let [x, z] = at(p, 0.15, -0.62); const m = Math.hypot(w, d) / 2 + 0.05; x = Math.max(-h + m, Math.min(h - m, x)); z = Math.max(-h + m, Math.min(h - m, z));
    const wallYaw = Math.abs(Math.abs(p.x) - h) < Math.abs(Math.abs(p.z) - h) ? (p.x > 0 ? Math.PI / 2 : -Math.PI / 2) : (p.z > 0 ? 0 : Math.PI); return [[x, z], wallYaw]; };   // the box's front (its -d side, where a slanted top is lowest) faces into the room
  { const [c, yaw] = side(P('A'), 0.55, 0.4); objects.push(orientedBox('tablet console', 'A', c, 0.55, 0.4, 0, 0.95, yaw, 0.12)); }
  { const [c, yaw] = side(P('B'), 0.5, 0.42); objects.push(cylinder('stool', 'B', at(P('B'), -0.08, 0), 0.17, 0, 0.45), orientedBox('laptop cart', 'B', c, 0.5, 0.42, 0, 0.62, yaw)); }
  { const [c, yaw] = side(P('C'), 0.55, 0.4); objects.push(orientedBox('console', 'C', c, 0.55, 0.4, 0, 0.95, yaw, 0.12)); }
  objects.push(orientedBox('bench', 'D', at(P('D'), 0.5, 0), 1.15, 0.46, 0, 0.84, P('D').face));
  objects.push(orientedBox('bench', 'E', at(P('E'), 0.5, 0), 1.0, 0.46, 0, 0.84, P('E').face), orientedBox('microscope', 'E', at(P('E'), 0.5, -0.3), 0.18, 0.2, 0.84, 1.22, P('E').face));
  return { size, h, quads, objects, people, P, window: win, screen: scr, place };
}

// ---- One phone view. fov: the picture's angle across the screen; pitch: 0 (level) or -5 (the view's middle 5° down: the
// horizon raised by f·tan 5°, so walls stay upright). occupied: the places with someone in them.
const seenQ = (cam, q) => { const p0 = q.pts[0], d = [cam.C[0] - p0[0], cam.C[1] - p0[1], cam.C[2] - p0[2]]; return d[0] * q.n[0] + d[1] * q.n[1] + d[2] * q.n[2] > 0; };
const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const box2 = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const nearBox = (b, c, r) => Math.hypot(Math.max(b.x0, Math.min(c[0], b.x1)) - c[0], Math.max(b.y0, Math.min(c[1], b.y1)) - c[1]) < r;
export const spriteRect = fg => ({ left: fg.anchor[0] - (fg.p.mirror ? 148 : 152) * fg.u, top: fg.anchor[1] - 273 * fg.u, size: 300 * fg.u, flip: !!fg.p.mirror });
function paints(r, id, x, y) { let sx = ((x - r.left) / r.size) * 300; const sy = ((y - r.top) / r.size) * 300; if (r.flip) sx = 300 - sx; return !(sx < 0 || sy < 0 || sx >= 300 || sy >= 300) && ALPHA[id][Math.floor(sy) * 300 + Math.floor(sx)] === 1; }
const poly = (pts, fill, ink = true) => `<polygon points="${pts.map(p => p.map(f1).join(',')).join(' ')}" fill="${fill}"${ink ? ` stroke="${TOK.deep}" stroke-width="0.9" stroke-linejoin="round"` : ''}/>`;
// A stand-in, as ring4b.mjs figure() draws it, times a scale s (the owner's trick: far figures a little larger, feet on their
// spot). With s = 1 it is figure() exactly.
export function figureAt(cam, p, s = 1) {
  const v = cam.view([p.x, p.Y, p.z]); if (v[2] < 0.25) return null;
  const u = ((cam.f * UNIT_M) / cam.dist(v)) * s, [ax, ay] = cam.proj(v), sk = skeletonOf(p.gesture), m = p.mirror ? -1 : 1, atp = ([x, y]) => [ax + m * (x - 62) * u, ay + (y - 233) * u];
  const e = FIGURE_EXTENTS[p.gesture], xs = [atp([e[0], 0])[0], atp([e[2], 0])[0]];
  return { id: p.id, z: cam.dist(v), u, anchor: [ax, ay], head: atp(sk.head), headR: 30 * u, press: atp(pressPoint(sk)), side: pressSide(u), box: [Math.min(...xs), atp([0, e[1]])[1], Math.max(...xs), atp([0, e[3]])[1]], p, scale: s };
}
export const FAR_M = 3.0;
// farScale: far figures (more than FAR_M away) drawn that much larger; nearWidth: the edge checks also read with the
// figure seen nearly side-on (about 72°) narrowed to that share of its width about its centre line; annotate: test marks.
export function phoneView(room, viewer, occupied, { W = 390, H = 844, pct = 100, fov = 90, pitch = 0, squares: showSquares = true, labels = true, farScale = 1, nearWidth = 1, annotate = false, lens = 'cyl', C = null, yaw = null } = {}) {
  // lens 'rect' (PV6): straight lines, fov the angle across; C and yaw move and turn the camera from the place's own
  const SH = H - TOP - BOT, m = MEASURED[pct], k2 = pct / 100, f = lens === 'rect' ? W / 2 / Math.tan((fov / 2) * DEG) : W / (fov * DEG), hy = SH / 2 + f * Math.tan(pitch * DEG);
  const V = room.P(viewer), cam = camera({ C: C ?? [V.x, EYE, V.z], yaw: yaw ?? V.camYaw, f, cx: W / 2, hy, mode: lens });
  const shell = room.quads.filter(q => q.kind === 'floor' || q.kind === 'ceiling' || seenQ(cam, q)).map(q => { const pp = project(cam, q.pts); return pp && poly(pp, q.fill, q.kind !== 'seam' && q.kind !== 'light'); }).filter(Boolean);
  const items = room.objects.filter(o => o.place !== viewer).map(o => ({ z: cam.dist(cam.view(o.c)), kind: 'object', name: `${o.place}'s ${o.name}`, polys: o.faces.map(fc => ({ pp: project(cam, fc.pts), fill: fc.fill })).filter(x => x.pp) }));
  for (const it of items) it.svg = it.polys.map(x => poly(x.pp, x.fill)).join('');
  const others = room.people.filter(p => p.place !== viewer && occupied.includes(p.place));
  const seenIds = others.filter(p => inCone(viewer, p.place)).map(p => p.place), hiddenIds = others.filter(p => !inCone(viewer, p.place)).map(p => p.place);
  const all = others.map(p => { const fg1 = figure(cam, p); return { p, fg: fg1 && farScale !== 1 && fg1.z > FAR_M ? figureAt(cam, p, farScale) : fg1 }; });
  const drawn = all.filter(a => a.fg && a.fg.box[2] > 0 && a.fg.box[0] < W);   // anything of them inside the screen's width is drawn
  for (const { p, fg } of drawn) { const r = spriteRect(fg), xc = r.left + r.size / 2; items.push({ z: fg.z - 0.05, kind: 'figure', place: p.place, id: p.id, rect: r, svg: `<image href="${standInPng(p)}" x="${f1(r.left)}" y="${f1(r.top)}" width="${f1(r.size)}" height="${f1(r.size)}"${r.flip ? ` transform="translate(${f1(2 * xc)} 0) scale(-1 1)"` : ''}/>` }); }
  items.sort((a, b) => b.z - a.z);
  const figs = all.filter(a => seenIds.includes(a.p.place) && a.fg).map(a => ({ ...a.fg, place: a.p.place, name: a.p.name, num: a.p.num, id: a.p.id }));
  // the room's own controls, as on the test pages; the out-of-view chip under "You", flush with the right edge
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
  const laid = figs.length ? layoutTags({ panel: { width: W, height: SH }, pad: 4, gap: 2, lift: 2, footClear: 34, keepClear, tags: tagsIn }) : { places: [], inside: true, apart: true };
  const tags = laid.places.map(pl => { const t = tagsIn.find(x => x.seat === pl.seat); return { id: pl.seat, x0: pl.left, x1: pl.left + t.width, y0: pl.top, y1: pl.top + t.height }; });
  // checks
  const issues = [], per = {};
  for (const id of seenIds) if (!figs.find(fg => fg.place === id)) issues.push(`${room.P(id).name} in the cone but not drawable`);
  for (const fg of figs) {
    const sq = squares.find(s => s.id === fg.id), tag = tags.find(t => t.id === fg.id), it = items.findIndex(i => i.kind === 'figure' && i.id === fg.id), nearer = it >= 0 ? items.slice(it + 1) : [];
    const pts = []; { const r = 0.8 * fg.headR; for (let gy = -1; gy <= 1.001; gy += 0.125) for (let gx = -1; gx <= 1.001; gx += 0.125) if (gx * gx + gy * gy <= 1) pts.push([fg.head[0] + gx * r, fg.head[1] + gy * r]); }
    const cover = {}; for (const [x, y] of pts) { let by = null; for (const n2 of nearer) { if (n2.kind === 'object') { if (n2.polys.some(q => inPoly(q.pp, x, y))) by = n2.name; } else if (paints(n2.rect, n2.id, x, y)) by = room.P(n2.place).name; } if (by) cover[by] = (cover[by] ?? 0) + 1; }
    const c = per[fg.place] = { name: fg.name, offsetDeg: +offsetDeg(viewer, fg.place).toFixed(1), needs: needs(viewer, fg.place), seenFromDeg: +seenFromDeg(viewer, fg.place).toFixed(1), distM: +fg.z.toFixed(2),
      heightPx: Math.round(239.7 * fg.u), whole: fg.box[0] >= 0 && fg.box[2] <= W && fg.box[1] >= 0 && fg.box[3] <= SH, marginL: Math.round(fg.box[0]), marginR: Math.round(W - fg.box[2]), marginTop: Math.round(fg.box[1]), marginFoot: Math.round(SH - fg.box[3]),
      press: +fg.side.toFixed(1), pressInside: sq.x0 >= 0 && sq.x1 <= W && sq.y0 >= 0 && sq.y1 <= SH, tagged: !!tag, faceCovered: Object.fromEntries(Object.entries(cover).map(([n, c3]) => [n, Math.round((100 * c3) / pts.length)])) };
    if (!c.whole) issues.push(`${fg.name} cut off`); if (!c.tagged) issues.push(`${fg.name} has no tag`); if (c.press < 44) issues.push(`${fg.name}'s press area under 44 px`); if (!c.pressInside) issues.push(`${fg.name}'s press area not whole`);
    for (const [n, b] of chrome) { if (box2(sq, b)) issues.push(`${fg.name}'s press area under the ${n}`); if (nearBox(b, fg.head, fg.headR * 0.8)) issues.push(`${fg.name}'s face under the ${n}`); }
    if (tag) for (const o of figs) if (nearBox(tag, o.head, o.headR * 0.8)) issues.push(`${fg.name}'s tag on ${o.name}'s face`);
    for (const [n, val] of Object.entries(c.faceCovered)) if (val >= 10) issues.push(`${fg.name}'s face ${val}% behind ${n}`);
  }
  for (let i = 0; i < figs.length; i += 1) for (let j = i + 1; j < figs.length; j += 1) { if (Math.hypot(figs[i].head[0] - figs[j].head[0], figs[i].head[1] - figs[j].head[1]) < figs[i].headR + figs[j].headR + 4) issues.push(`faces ${figs[i].name}/${figs[j].name} touch`); if (box2(squares[i], squares[j])) issues.push(`press ${figs[i].name}/${figs[j].name} overlap`); }
  if (!laid.inside) issues.push('a tag does not fit inside'); if (!laid.apart) issues.push('tags touch');
  // the edge, two ways: strict (the whole drawing on screen) and relaxed (the face, the tag and the press area on screen, and at
  // most 10% of the figure's width past an edge); each with the full-width stand-in and with the nearly side-on figure at
  // nearWidth of its width about its centre line
  const edge = { perFigure: {} };
  for (const fg of figs) { const side72 = Math.abs(seenFromDeg(viewer, fg.place)) > 55, tag = tags.find(t => t.id === fg.id), sq = squares.find(q => q.id === fg.id), r = fg.headR * 0.85;
    const narrow = k => [fg.anchor[0] - k * (fg.anchor[0] - fg.box[0]), fg.anchor[0] + k * (fg.box[2] - fg.anchor[0])];
    const one = k => { const [x0, x1] = narrow(k), wpx = x1 - x0, over = Math.max(0, -x0) + Math.max(0, x1 - W); return { clearancePx: Math.round(Math.min(x0, W - x1)), overPct: +((100 * over) / wpx).toFixed(1), whole: x0 >= 0 && x1 <= W }; };
    const faceOn = fg.head[0] - r >= 0 && fg.head[0] + r <= W && fg.head[1] - r >= 0, tagOn = !!tag && tag.x0 >= 0 && tag.x1 <= W && tag.y0 >= 0 && tag.y1 <= SH, pressOn = sq.x0 >= 0 && sq.x1 <= W && sq.y0 >= 0 && sq.y1 <= SH;
    const full = one(1), nar = side72 ? one(nearWidth) : full;
    edge.perFigure[fg.place] = { name: fg.name, side72, faceOn, tagOn, pressOn, full, narrow: nar, relaxedFull: faceOn && tagOn && pressOn && full.overPct <= 10, relaxedNarrow: faceOn && tagOn && pressOn && nar.overPct <= 10 }; }
  const pf = Object.values(edge.perFigure);
  Object.assign(edge, { strictFull: pf.every(e => e.full.whole), strictNarrow: pf.every(e => e.narrow.whole), relaxedFull: pf.every(e => e.relaxedFull), relaxedNarrow: pf.every(e => e.relaxedNarrow) });
  // the hidden: fully out of the picture, with the gap to the edge
  const hidden = hiddenIds.map(id => { const a = all.find(x => x.p.place === id), fg = a.fg; const gap = fg ? Math.round(fg.box[0] >= W ? fg.box[0] - W : fg.box[2] <= 0 ? -fg.box[2] : -1) : null;
    const out = !fg || fg.box[0] >= W || fg.box[2] <= 0; if (!out) issues.push(`${a.p.name} (not in the cone) partly in the picture`); return { place: id, name: a.p.name, offsetDeg: +offsetDeg(viewer, id).toFixed(1), out, gapPx: gap }; });
  if (ooc) { if (ooc.x0 < 0 || ooc.y1 > SH) issues.push('the out-of-view chip does not fit'); for (const t of tags) if (box2(t, ooc)) issues.push('a tag on the out-of-view chip'); for (const fg of figs) if (nearBox(ooc, fg.head, fg.headR * 0.8)) issues.push(`the out-of-view chip on ${fg.name}'s face`); for (const q of squares) if (box2(q, ooc.press)) issues.push('a press area under the out-of-view chip'); }
  // the features: are they in the picture, and is anyone standing in front of them?
  const featureBox = fe => { const pp = project(cam, fe.pts); if (!pp) return null; const xs = pp.map(p => p[0]), ys = pp.map(p => p[1]); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; };
  const behind = fb => (fb ? drawn.filter(({ fg }) => box2(fb, { x0: fg.box[0], x1: fg.box[2], y0: fg.box[1], y1: fg.box[3] })).map(({ p }) => p.name) : []);
  const wb = featureBox(room.window), sb = featureBox(room.screen), inPic = b => !!b && b.x1 > 0 && b.x0 < W;
  const features = { window: { inPicture: inPic(wb), people: behind(wb) }, screen: { inPicture: inPic(sb), people: behind(sb) } };
  // drawing
  const pill = (t, num, name, text = name) => { const h = t.y1 - t.y0, r = h / 2, d = 20 * k2, x = t.x0;
    return `<rect x="${f1(t.x0)}" y="${f1(t.y0)}" width="${f1(t.x1 - t.x0)}" height="${f1(h)}" rx="${f1(r)}" fill="rgba(12,15,22,0.86)" stroke="rgba(244,235,221,0.28)" stroke-width="1.5"/>`
      + `<circle cx="${f1(x + 3 * k2 + d / 2)}" cy="${f1(t.y0 + r)}" r="${f1(d / 2)}" fill="#F4EBDD"/><text x="${f1(x + 3 * k2 + d / 2)}" y="${f1(t.y0 + r + 4.2 * k2)}" text-anchor="middle" ${FONT} font-size="${12 * k2}" font-weight="800" fill="#10141C">${num}</text>`
      + `<text x="${f1(x + 3 * k2 + d + 5 * k2)}" y="${f1(t.y0 + r + 4.5 * k2)}" ${FONT} font-size="${13 * k2}" font-weight="600" fill="#F4EBDD">${text}</text>`; };
  const sqSvg = b => `<rect x="${f1(b.x0)}" y="${f1(b.y0)}" width="${f1(b.x1 - b.x0)}" height="${f1(b.y1 - b.y0)}" fill="none" stroke="#00E5FF" stroke-width="1.5" stroke-dasharray="5 3" opacity="0.85"/>`;
  const bars = `<rect width="${W}" height="${TOP}" fill="#0F1117"/><text x="${W / 2}" y="${TOP / 2 + 22}" text-anchor="middle" ${FONT} font-size="12" fill="#5B6273" letter-spacing="1">APP TOP BAR (FRONTEND'S)</text><rect y="${H - BOT}" width="${W}" height="${BOT}" fill="#0F1117"/><text x="${W / 2}" y="${H - BOT / 2 + 4}" text-anchor="middle" ${FONT} font-size="12" fill="#5B6273" letter-spacing="1">APP TABS (FRONTEND'S)</text>`;
  const overlay = `<g transform="translate(${label.x0} ${label.y0}) skewX(-9) rotate(-1.4)"><rect width="${m.label[0]}" height="${m.label[1]}" fill="#F1B84B" stroke="#10141C" stroke-width="2"/></g><text x="${f1(label.x0 + m.label[0] / 2)}" y="${f1(label.y0 + m.label[1] / 2 + 5.5 * k2)}" text-anchor="middle" font-family="Arial Narrow, Arial, sans-serif" font-size="${15 * k2}" font-weight="800" letter-spacing="1" fill="#10141C">ROOM B</text>`
    + `<rect x="${f1(ctl.x0)}" y="${ctl.y0}" width="${m.control[0]}" height="44" rx="22" fill="#F4EBDD"/><text x="${f1(W / 2 + 11)}" y="${f1(ctl.y0 + 27.5)}" text-anchor="middle" ${FONT} font-size="${15 * k2}" font-weight="600" fill="#10141C">Windows · 2</text>`
    + `<rect x="${f1(chip.x0)}" y="${chip.y0}" width="${m.chip[0]}" height="${m.chip[1]}" rx="16" fill="rgba(12,15,22,0.86)" stroke="rgba(244,235,221,0.4)" stroke-dasharray="4 3"/><text x="${f1(W / 2)}" y="${f1(chip.y0 + 21)}" text-anchor="middle" ${FONT} font-size="${13 * k2}" font-weight="600" fill="#F4EBDD">Other rooms on the Board</text>`
    + `<rect x="${you.x0}" y="${you.y0}" width="${youW}" height="${you.y1 - you.y0}" rx="${Math.round(10 * k2)}" fill="rgba(12,15,22,0.86)"/><text x="${f1(you.x0 + youW / 2)}" y="${f1(you.y0 + 14 * k2)}" text-anchor="middle" ${FONT} font-size="${11 * k2}" font-weight="600" fill="rgba(244,235,221,0.85)">${youT}</text>`
    + (ooc ? pill(ooc, ooc.num, ooc.name, `${ooc.name} · out of view`) : '');
  // test-page only: the angle each stand-in would need, at their feet
  const needLabels = labels ? figs.map(fg => { const t = needs(viewer, fg.place), w = t.length * 5.6 + 10, x = fg.anchor[0] - w / 2, y = fg.box[3] + 3;
    return `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="15" rx="3" fill="rgba(241,184,75,0.92)"/><text x="${f1(fg.anchor[0])}" y="${f1(y + 11)}" text-anchor="middle" ${FONT} font-size="10" font-weight="700" fill="#10141C">${t}</text>`; }).join('') : '';
  const marks = annotate ? figs.map(fg => { const e = edge.perFigure[fg.place], out = [];
    if (e.side72 && nearWidth !== 1) { const x0 = fg.anchor[0] - nearWidth * (fg.anchor[0] - fg.box[0]), x1 = fg.anchor[0] + nearWidth * (fg.box[2] - fg.anchor[0]); out.push(`<rect x="${f1(x0)}" y="${f1(fg.box[1])}" width="${f1(x1 - x0)}" height="${f1(fg.box[3] - fg.box[1])}" fill="none" stroke="#F1B84B" stroke-width="1.5" stroke-dasharray="4 3"/>`); }
    if (fg.box[0] < 0) out.push(`<rect x="0" y="${f1(fg.box[1])}" width="4" height="${f1(fg.box[3] - fg.box[1])}" fill="#FF5A5A"/>`); if (fg.box[2] > W) out.push(`<rect x="${W - 4}" y="${f1(fg.box[1])}" width="4" height="${f1(fg.box[3] - fg.box[1])}" fill="#FF5A5A"/>`);
    return out.join(''); }).join('') : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#0F1117"/>${bars}<svg x="0" y="${TOP}" width="${W}" height="${SH}" viewBox="0 0 ${W} ${SH}" overflow="hidden"><rect width="${W}" height="${SH}" fill="${TOK.deep}"/>${shell.join('')}${items.map(i => i.svg).join('')}${needLabels}${marks}${showSquares ? [...squares, ...(ooc ? [ooc.press] : [])].map(sqSvg).join('') : ''}${tags.map(t => { const fg = figs.find(x => x.id === t.id); return pill(t, fg.num, fg.name); }).join('')}${overlay}</svg></svg>`;
  const layout = { W, SH, f, hy, squares, chip: ooc ? { x0: ooc.x0, y0: ooc.y0, x1: ooc.x1, y1: ooc.y1, press: ooc.press, name: ooc.name, num: ooc.num } : null, tags, figs: figs.map(fg => ({ place: fg.place, name: fg.name, num: fg.num, anchor: fg.anchor, head: fg.head, headR: fg.headR, u: fg.u, box: fg.box, scale: fg.scale ?? 1 })) };
  return { svg, issues, per, hidden, features, edge, layout, chip: ooc ? { name: ooc.name, box: [ooc.x0, ooc.y0, ooc.x1, ooc.y1].map(Math.round) } : null, seen: seenIds, f: +f.toFixed(2), hy: +hy.toFixed(1), SH };
}
