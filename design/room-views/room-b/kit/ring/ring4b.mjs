// Room B, the owner's corrected four-position test (17 November): Mira, Juno, Lyra and Atlas, one in the middle of
// each wall, each facing the one opposite, and each view showing all three others. Measures a straight lens and a curved
// panorama per station. Grey blockout; the approved drawings as stand-in cut-outs turned to the camera.
import { readFileSync, writeFileSync } from 'fs';
import { skeletonOf } from '../../pr284/apps/game/hosted/scene-drawing/gestures.mjs';
import { pressPoint } from '../../pr284/apps/game/hosted/scene-drawing/frame.mjs';
import { pressSide } from '../../pr284/apps/game/hosted/board-v2-drawing/fit-four.mjs';
import { FIGURE_EXTENTS } from '../../pr284/design/phone-ui/components/room-scene/figure-extents.mjs';
import { layoutTags } from '../../pr284/design/phone-ui/components/tag-layout.mjs';

const DIR = new URL('./', import.meta.url).pathname;
export const UNIT_M = 1.72 / 239.7, DEG = Math.PI / 180;
const MEASURED = JSON.parse(readFileSync(DIR + 'measured.json', 'utf8'));
const ALPHA = Object.fromEntries(Object.entries(JSON.parse(readFileSync(DIR + 'alpha.json', 'utf8'))).map(([k, v]) => [k, Buffer.from(v, 'base64')]));
export const NAMES = { B1: 'Mira', B2: 'Juno', B3: 'Lyra', B4: 'Atlas' }, NUM = { B1: 1, B2: 2, B3: 3, B4: 4 };
const GESTURE = { B1: 'tablet', B2: 'laptopStool', B3: 'tankBack', B4: 'leanBench' }, MIRROR = { B1: true, B2: false, B3: false, B4: false };
export const IDS = ['B1', 'B2', 'B3', 'B4'];
const CX = 0, CZ = 6.9, CEIL = 3.4;
export const TOP = 99, BOT = 92;
const FONT = 'font-family="-apple-system, system-ui, sans-serif"';

// ---- The room for a ring radius R and a gap G behind each person: a square room, everyone facing the centre.
export function build(R, G = 0.7) {
  const half = R + G, SW = half, FRONT = CZ - half, BACK = CZ + half;
  const place = { B1: [0, CZ - R, 0], B2: [-R, CZ, 90], B3: [R, CZ, -90], B4: [0, CZ + R, 180] };
  const people = IDS.map(id => { const [x, z, yaw] = place[id]; return { id, x, z, Y: 0, face: yaw * DEG, gesture: GESTURE[id], mirror: MIRROR[id], eye: (233 - skeletonOf(GESTURE[id]).head[1]) * UNIT_M }; });
  const P = id => people.find(p => p.id === id);
  const axes = p => ({ f: [Math.sin(p.face), Math.cos(p.face)], r: [Math.cos(p.face), -Math.sin(p.face)] });
  const at = (p, fwd, right) => { const a = axes(p); return [p.x + a.f[0] * fwd + a.r[0] * right, p.z + a.f[1] * fwd + a.r[1] * right]; };
  const quads = [], Q = (pts, v, n, kind = 'shell') => quads.push({ pts, v, n, kind });
  Q([[-SW, 0, FRONT], [SW, 0, FRONT], [SW, 0, BACK], [-SW, 0, BACK]], 172, [0, 1, 0]);
  Q([[-SW, CEIL, FRONT], [SW, CEIL, FRONT], [SW, CEIL, BACK], [-SW, CEIL, BACK]], 70, [0, -1, 0]);
  Q([[-SW, 0, BACK], [SW, 0, BACK], [SW, CEIL, BACK], [-SW, CEIL, BACK]], 140, [0, 0, -1]);
  Q([[-SW, 0, FRONT], [SW, 0, FRONT], [SW, CEIL, FRONT], [-SW, CEIL, FRONT]], 128, [0, 0, 1]);
  Q([[-SW, 0, FRONT], [-SW, 0, BACK], [-SW, CEIL, BACK], [-SW, CEIL, FRONT]], 160, [1, 0, 0]);
  Q([[SW, 0, FRONT], [SW, 0, BACK], [SW, CEIL, BACK], [SW, CEIL, FRONT]], 115, [-1, 0, 0]);
  const win = [-Math.min(1.3, half - 0.3), Math.min(1.3, half - 0.3)];
  const tank = at(P('B3'), 0.1, 0.62), screenZ = CZ + 0.3;                 // the screen just behind Lyra, toward the tank
  const door = [-Math.min(1.85, half - 0.25), -0.75];                         // the door at the cart-wall end of the door wall
  const features = {
    window: { pts: [[win[0], 1.95, BACK - 0.01], [win[1], 1.95, BACK - 0.01], [win[1], 3.1, BACK - 0.01], [win[0], 3.1, BACK - 0.01]], n: [0, 0, -1] },
    screen: { pts: [[SW - 0.01, 1.85, screenZ - 0.55], [SW - 0.01, 1.85, screenZ + 0.55], [SW - 0.01, 2.5, screenZ + 0.55], [SW - 0.01, 2.5, screenZ - 0.55]], n: [-1, 0, 0] },
    door: { pts: [[door[0], 0, FRONT + 0.01], [door[1], 0, FRONT + 0.01], [door[1], 2.2, FRONT + 0.01], [door[0], 2.2, FRONT + 0.01]], n: [0, 0, 1] },
  };
  Q(features.window.pts, 0, features.window.n, 'window'); Q(features.screen.pts, 0, features.screen.n, 'screen'); Q(features.door.pts, 64, features.door.n, 'door');
  for (let x = -Math.floor(SW); x <= Math.floor(SW); x += 1) Q([[x - 0.012, 0.002, FRONT], [x + 0.012, 0.002, FRONT], [x + 0.012, 0.002, BACK], [x - 0.012, 0.002, BACK]], 140, [0, 1, 0]);
  for (let z = Math.ceil(FRONT + 0.01); z < BACK; z += 1) Q([[-SW, 0.002, z - 0.012], [SW, 0.002, z - 0.012], [SW, 0.002, z + 0.012], [-SW, 0.002, z + 0.012]], 140, [0, 1, 0]);
  for (const [x0, x1] of [[-1.2, -0.3], [0.3, 1.2]]) Q([[x0, CEIL - 0.02, CZ - 0.3], [x1, CEIL - 0.02, CZ - 0.3], [x1, CEIL - 0.02, CZ + 0.3], [x0, CEIL - 0.02, CZ + 0.3]], 245, [0, -1, 0]);
  const objects = [];
  const orientedBox = (name, c, w, d, y0, y1, yaw, v) => { const cs = Math.cos(yaw), sn = Math.sin(yaw), k = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([a, b]) => [c[0] + a * cs + b * sn, c[1] - a * sn + b * cs]);
    const faces = [[0, 1], [1, 2], [2, 3], [3, 0]].map(([i, j]) => [[k[i][0], y0, k[i][1]], [k[j][0], y0, k[j][1]], [k[j][0], y1, k[j][1]], [k[i][0], y1, k[i][1]]]); faces.push(k.map(([x, z]) => [x, y1, z]));
    objects.push({ name, faces, v, c: [c[0], (y0 + y1) / 2, c[1]], foot: { box: k }, h: y1 }); };
  const cylinder = (name, c, r, y0, y1, v) => { const n = 18, faces = [];
    for (let i = 0; i < n; i += 1) { const a = (i / n) * 2 * Math.PI, b = ((i + 1) / n) * 2 * Math.PI; faces.push([[c[0] + r * Math.cos(a), y0, c[1] + r * Math.sin(a)], [c[0] + r * Math.cos(b), y0, c[1] + r * Math.sin(b)], [c[0] + r * Math.cos(b), y1, c[1] + r * Math.sin(b)], [c[0] + r * Math.cos(a), y1, c[1] + r * Math.sin(a)]]); }
    faces.push(Array.from({ length: n }, (_, i) => [c[0] + r * Math.cos((i / n) * 2 * Math.PI), y1, c[1] + r * Math.sin((i / n) * 2 * Math.PI)]));
    objects.push({ name, faces, v, c: [c[0], (y0 + y1) / 2, c[1]], foot: { c, r }, h: y1 }); };
  const B1 = P('B1'), B2 = P('B2'), B3 = P('B3'), B4 = P('B4');
  orientedBox('tablet console', at(B1, 0.12, -0.55), 0.5, 0.36, 0, 0.95, B1.face, 150);
  cylinder('stool', at(B2, -0.08, 0), 0.17, 0, 0.45, 150);
  orientedBox('laptop cart', at(B2, 0.1, 0.62), 0.5, 0.42, 0, 0.62, B2.face, 165);
  cylinder('specimen tank', tank, 0.29, 0, 1.0, 205);
  orientedBox('bench', at(B4, 0.5, 0), 1.15, 0.46, 0, 0.84, B4.face, 120);
  orientedBox('capsule', at(B4, 0.5, -0.45), 0.24, 0.24, 0.84, 1.16, B4.face, 150);
  return { R, G, half, SW, FRONT, BACK, people, P, quads, objects, features, screenZ, win, door };
}

// The layout's own rules: the centre open, walkways between stations, the room's things clear of each other.
export function layoutOK(room) {
  const station = { B1: ['tablet console'], B2: ['stool', 'laptop cart'], B3: ['specimen tank'], B4: ['bench', 'capsule'] };
  const shapes = id => [{ c: [room.P(id).x, room.P(id).z], r: 0.3 }, ...room.objects.filter(o => station[id].includes(o.name)).map(o => o.foot)];
  const pts = s => (s.box ? s.box : Array.from({ length: 16 }, (_, i) => [s.c[0] + (s.r ?? 0) * Math.cos((i / 16) * 2 * Math.PI), s.c[1] + (s.r ?? 0) * Math.sin((i / 16) * 2 * Math.PI)]));
  const dist = (a, b) => Math.min(...pts(a).flatMap(p => pts(b).map(q => Math.hypot(p[0] - q[0], p[1] - q[1]))));
  const centre = Math.min(...IDS.flatMap(id => shapes(id).flatMap(s => pts(s).map(p => Math.hypot(p[0] - CX, p[1] - CZ)))));
  let walk = Infinity; for (let i = 0; i < 4; i += 1) for (let j = i + 1; j < 4; j += 1) for (const a of shapes(IDS[i])) for (const b of shapes(IDS[j])) walk = Math.min(walk, dist(a, b));
  return { centreClear: +centre.toFixed(2), walkway: +walk.toFixed(2), ok: centre >= 0.9 && walk >= 0.6 };
}

// ---- A camera: a straight lens ('rect') or a curved panorama ('cyl', the ring page's projection).
export function camera({ C, yaw, f, cx, hy, mode = 'rect' }) {
  const fwd = [Math.sin(yaw), 0, Math.cos(yaw)], right = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const view = p => { const d = [p[0] - C[0], p[1] - C[1], p[2] - C[2]]; return [d[0] * right[0] + d[2] * right[2], d[1], d[0] * fwd[0] + d[2] * fwd[2]]; };
  const proj = mode === 'rect' ? v => [cx + (f * v[0]) / v[2], hy - (f * v[1]) / v[2]] : v => { const rho = Math.hypot(v[0], v[2]); return [cx + f * Math.atan2(v[0], v[2]), hy - (f * v[1]) / rho]; };
  return { C, yaw, f, cx, hy, mode, view, proj, fwd, dist: v => (mode === 'rect' ? v[2] : Math.hypot(v[0], v[2])) };
}
function clipPlane(poly, n, c = 0) { const out = [], sd = p => p[0] * n[0] + p[2] * n[2] - c;
  for (let i = 0; i < poly.length; i += 1) { const a = poly[i], b = poly[(i + 1) % poly.length], sa = sd(a), sb = sd(b); if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) { const t = sa / (sa - sb); out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])]); } } return out; }
const WEDGE = 88 * DEG;
export function project(cam, pts) {
  let c = pts.map(cam.view);
  if (cam.mode === 'rect') c = clipPlane(c, [0, 0, 1], 0.12);
  else { c = clipPlane(c, [Math.cos(WEDGE), 0, Math.sin(WEDGE)]); c = clipPlane(c, [-Math.cos(WEDGE), 0, Math.sin(WEDGE)]); c = clipPlane(c, [0, 0, 1], 0.02);
    const fine = []; for (let i = 0; i < c.length; i += 1) { const a = c[i], b = c[(i + 1) % c.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 0.1));
      for (let k = 0; k < n; k += 1) fine.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n, a[2] + ((b[2] - a[2]) * k) / n]); }
    c = fine; }
  return c.length < 3 ? null : c.map(cam.proj);
}
const shade = v => `rgb(${v},${v},${v + 5})`;
export const polyStr = (pts, v) => `<polygon points="${pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')}" fill="${v === 0 ? '#000' : shade(v)}"/>`;
export const seen = (cam, q) => { const p0 = q.pts[0], d = [cam.C[0] - p0[0], cam.C[1] - p0[1], cam.C[2] - p0[2]]; return d[0] * q.n[0] + d[1] * q.n[1] + d[2] * q.n[2] > 0; };
export function figure(cam, p) {
  const v = cam.view([p.x, p.Y, p.z]); if (v[2] < 0.25) return null;
  const u = (cam.f * UNIT_M) / cam.dist(v), [ax, ay] = cam.proj(v), sk = skeletonOf(p.gesture), m = p.mirror ? -1 : 1, atp = ([x, y]) => [ax + m * (x - 62) * u, ay + (y - 233) * u];
  const e = FIGURE_EXTENTS[p.gesture], xs = [atp([e[0], 0])[0], atp([e[2], 0])[0]];
  return { id: p.id, z: cam.dist(v), u, anchor: [ax, ay], head: atp(sk.head), headR: 30 * u, press: atp(pressPoint(sk)), side: pressSide(u), box: [Math.min(...xs), atp([0, e[1]])[1], Math.max(...xs), atp([0, e[3]])[1]], p };
}
export const spriteRect = fg => ({ left: fg.anchor[0] - (fg.p.mirror ? 148 : 152) * fg.u, top: fg.anchor[1] - 273 * fg.u, size: 300 * fg.u, flip: !!fg.p.mirror });
export const spriteSvg = (fg, extra = '') => { const r = spriteRect(fg), xc = r.left + r.size / 2; return `<image href="${fg.p.id}.png" x="${r.left.toFixed(1)}" y="${r.top.toFixed(1)}" width="${r.size.toFixed(1)}" height="${r.size.toFixed(1)}"${r.flip ? ` transform="translate(${(2 * xc).toFixed(1)} 0) scale(-1 1)"` : ''}${extra}/>`; };
function paints(rect, id, x, y) { let sx = ((x - rect.left) / rect.size) * 300; const sy = ((y - rect.top) / rect.size) * 300; if (rect.flip) sx = 300 - sx; return !(sx < 0 || sy < 0 || sx >= 300 || sy >= 300) && ALPHA[id][Math.floor(sy) * 300 + Math.floor(sx)] === 1; }
const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const box2 = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const nearBox = (b, c, r) => Math.hypot(Math.max(b.x0, Math.min(c[0], b.x1)) - c[0], Math.max(b.y0, Math.min(c[1], b.y1)) - c[1]) < r;
function faceSamples(fg) { const r = 0.8 * fg.headR, pts = []; for (let gy = -1; gy <= 1.001; gy += 0.125) for (let gx = -1; gx <= 1.001; gx += 0.125) if (gx * gx + gy * gy <= 1) pts.push([fg.head[0] + gx * r, fg.head[1] + gy * r]); return pts; }

// ---- Who each viewer sees: all three others (the one opposite and both neighbours).
export function plan(room) {
  return Object.fromEntries(room.people.map(v => { const rel = q => { const a = Math.atan2(q.x - v.x, q.z - v.z) - v.face; return Math.atan2(Math.sin(a), Math.cos(a)) / DEG; };
    const others = room.people.filter(q => q !== v), opp = others.reduce((b, q) => (Math.abs(rel(q)) < Math.abs(rel(b)) ? q : b));
    return [v.id, { opposite: opp, others, left: others.find(q => rel(q) < -20), right: others.find(q => rel(q) > 20) }]; }));
}
// The narrowest view that holds them whole (6 px from the sides, 50 px below the top, 10 px above the foot): a straight
// lens ('rect') or a curved panorama ('cyl'); or a fixed angle across ('cyl' with fixedDeg), centred on the group.
export function fitView(room, v, them, W, SH, mode = 'rect', fixedDeg = null) {
  const C = [v.x, v.Y + v.eye, v.z], a0 = Math.atan2(them.reduce((s2, q) => s2 + q.x, 0) / them.length - v.x, them.reduce((s2, q) => s2 + q.z, 0) / them.length - v.z);
  let best = null;
  for (let d = -40; d <= 40; d += 0.25) { const yaw = a0 + d * DEG, c1 = camera({ C, yaw, f: 1, cx: 0, hy: 0, mode }); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, ok = true;
    for (const q of them) { const fg = figure(c1, q); if (!fg) { ok = false; break; } x0 = Math.min(x0, fg.box[0]); x1 = Math.max(x1, fg.box[2]); y0 = Math.min(y0, fg.box[1]); y1 = Math.max(y1, fg.box[3]); }
    if (!ok) continue; const fx = (W / 2 - 6) / Math.max(-x0, x1), fy = (SH - 60) / (y1 - y0), f = Math.min(fx, fy);
    if (!best || f > best.f) best = { yaw, f, y0, y1 }; }
  const f = fixedDeg ? W / (fixedDeg * DEG) : best.f;
  const hy = Math.max(50 - f * best.y0, Math.min(SH - 10 - f * best.y1, 0.42 * SH));
  const hfov = mode === 'rect' ? (2 * Math.atan(W / 2 / f)) / DEG : W / f / DEG;
  return { cam: camera({ C, yaw: best.yaw, f, cx: W / 2, hy, mode }), hfov, edgeStretch: mode === 'rect' ? 1 / Math.cos((hfov / 2) * DEG) : 1 };
}
// ---- The phone view, with the checks.
export function phoneView(room, v, who, W, H, pct = 100, fitted = null, mode = 'rect') {
  const SH = H - TOP - BOT, m = MEASURED[pct], k = pct / 100;
  const fit = fitted ?? fitView(room, v, who.others, W, SH, mode), cam = fit.cam;
  const shell = room.quads.filter(q => seen(cam, q)).map(q => { const pp = project(cam, q.pts); return pp && polyStr(pp, q.v); }).filter(Boolean);
  const items = room.objects.map(o => ({ z: cam.dist(cam.view(o.c)), kind: 'object', name: o.name, polys: o.faces.map(fc => project(cam, fc)).filter(Boolean), v: o.v }));
  for (const it of items) it.svg = it.polys.map(pp => polyStr(pp, it.v)).join('');
  const figs = who.others.map(q => figure(cam, q));
  for (const fg of figs) items.push({ z: fg.z - 0.05, kind: 'figure', id: fg.id, rect: spriteRect(fg), svg: spriteSvg(fg) });
  items.sort((a, b) => b.z - a.z);
  const label = { x0: 12, y0: 10, x1: 12 + m.label[0], y1: 10 + m.label[1] }, ctl = { x0: W / 2 - m.control[0] / 2, x1: W / 2 + m.control[0] / 2, y0: SH - 76, y1: SH - 32 };
  const chip = { x0: W / 2 - m.chip[0] / 2, x1: W / 2 + m.chip[0] / 2, y1: ctl.y0 - 8, y0: ctl.y0 - 8 - m.chip[1] };
  const youT = `You: ${NUM[v.id]} ${NAMES[v.id]}`, youW = Math.round(youT.length * 6.4 * k + 16), you = { x0: W - 8 - youW, x1: W - 8, y0: label.y0 + 2, y1: label.y0 + 2 + Math.round(20 * k) };
  const chrome = [['label', label], ['Windows control', ctl], ['chip', chip], ['You', you]];
  const squares = figs.map(fg => ({ id: fg.id, x0: fg.press[0] - fg.side / 2, x1: fg.press[0] + fg.side / 2, y0: fg.press[1] - fg.side / 2, y1: fg.press[1] + fg.side / 2 }));
  const faces = figs.map(fg => { const r = fg.headR * 0.85; return { x0: fg.head[0] - r, x1: fg.head[0] + r, y0: fg.head[1] - r, y1: fg.head[1] + r }; });
  const tagsIn = figs.map(fg => ({ seat: fg.id, at: { x: fg.press[0], bottom: fg.press[1] + fg.side / 2 }, width: m['t' + fg.id][0], height: m['t' + fg.id][1], self: false }));
  const keepClear = [...chrome.map(([, b]) => b), ...faces].map(b => ({ left: b.x0, top: b.y0, width: b.x1 - b.x0, height: b.y1 - b.y0 }));
  const laid = layoutTags({ panel: { width: W, height: SH }, pad: 4, gap: 2, lift: 2, footClear: 34, keepClear, tags: tagsIn });
  const tags = laid.places.map(pl => { const t = tagsIn.find(x => x.seat === pl.seat); return { id: pl.seat, x0: pl.left, x1: pl.left + t.width, y0: pl.top, y1: pl.top + t.height }; });
  // checks
  const issues = [], per = {};
  for (const fg of figs) {
    const sq = squares.find(s => s.id === fg.id), tag = tags.find(t => t.id === fg.id);
    const nearer = items.slice(items.findIndex(i => i.kind === 'figure' && i.id === fg.id) + 1), pts = faceSamples(fg), cover = {};
    for (const [x, y] of pts) { let by = null; for (const it of nearer) { if (it.kind === 'object') { if (it.polys.some(pp => inPoly(pp, x, y))) by = it.name; } else if (paints(it.rect, it.id, x, y)) by = NAMES[it.id]; } if (by) cover[by] = (cover[by] ?? 0) + 1; }
    const c = per[fg.id] = { role: fg.id === who.opposite.id ? 'opposite' : 'neighbour', centreDeg: +((cam.mode === 'rect' ? Math.atan((fg.anchor[0] - W / 2) / cam.f) : (fg.anchor[0] - W / 2) / cam.f) / DEG).toFixed(1), stretchHere: +(cam.mode === 'rect' ? 1 / Math.cos(Math.atan((fg.anchor[0] - W / 2) / cam.f)) : 1).toFixed(2), whole: fg.box[0] >= 0 && fg.box[2] <= W && fg.box[1] >= 0 && fg.box[3] <= SH, heightPx: Math.round(239.7 * fg.u), press: +fg.side.toFixed(1),
      pressInside: sq.x0 >= 0 && sq.x1 <= W && sq.y0 >= 0 && sq.y1 <= SH, tagged: !!tag, faceCovered: Object.fromEntries(Object.entries(cover).map(([n, c2]) => [n, Math.round((100 * c2) / pts.length)])) };
    if (!c.whole) issues.push(`${fg.id} cut off`); if (!c.tagged) issues.push(`${fg.id} has no tag`); if (c.press < 44) issues.push(`${fg.id}'s press square under 44 px`); if (!c.pressInside) issues.push(`${fg.id}'s press square not whole`);
    for (const [n, b] of chrome) { if (box2(sq, b)) issues.push(`${fg.id}'s press square under the ${n}`); if (nearBox(b, fg.head, fg.headR * 0.8)) issues.push(`${fg.id}'s face under the ${n}`); }
    if (tag) for (const o of figs) if (nearBox(tag, o.head, o.headR * 0.8)) issues.push(`${fg.id}'s tag on ${o.id}'s face`);
    for (const [n, val] of Object.entries(c.faceCovered)) if (val >= 10) issues.push(`${fg.id}'s face ${val}% behind ${n}`);
  }
  for (let i = 0; i < figs.length; i += 1) for (let j = i + 1; j < figs.length; j += 1) { if (Math.hypot(figs[i].head[0] - figs[j].head[0], figs[i].head[1] - figs[j].head[1]) < figs[i].headR + figs[j].headR + 4) issues.push(`faces ${figs[i].id}/${figs[j].id} touch`); if (box2(squares[i], squares[j])) issues.push(`press ${figs[i].id}/${figs[j].id} overlap`); }
  if (!laid.inside) issues.push('a tag does not fit inside'); if (!laid.apart) issues.push('tags touch');
  // features in view (their centre inside the stage across)
  const inView = name => { const pts = room.features[name].pts, c = pts.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4, s[2] + p[2] / 4], [0, 0, 0]), vv = cam.view(c); if (vv[2] < 0.2) return false; const [x] = cam.proj(vv); return x > 0 && x < W; };
  const see = { window: inView('window'), screen: inView('screen'), door: inView('door') };
  // drawing
  const pill = (t, id, arrow = '') => { const h = t.y1 - t.y0, r = h / 2, d = 20 * k, x = t.x0 + (arrow === 'l' ? 12 * k : 0);
    return `<rect x="${t.x0.toFixed(1)}" y="${t.y0.toFixed(1)}" width="${(t.x1 - t.x0).toFixed(1)}" height="${h}" rx="${r}" fill="rgba(12,15,22,0.86)" stroke="rgba(244,235,221,${arrow ? 0.75 : 0.28})" stroke-width="1.5"/>`
      + (arrow ? `<text x="${(arrow === 'l' ? t.x0 + 7 * k : t.x1 - 7 * k).toFixed(1)}" y="${(t.y0 + r + 5 * k).toFixed(1)}" text-anchor="middle" ${FONT} font-size="${15 * k}" font-weight="700" fill="#F1B84B">${arrow === 'l' ? '‹' : '›'}</text>` : '')
      + `<circle cx="${(x + 3 * k + d / 2).toFixed(1)}" cy="${(t.y0 + r).toFixed(1)}" r="${(d / 2).toFixed(1)}" fill="#F4EBDD"/><text x="${(x + 3 * k + d / 2).toFixed(1)}" y="${(t.y0 + r + 4.2 * k).toFixed(1)}" text-anchor="middle" ${FONT} font-size="${12 * k}" font-weight="800" fill="#10141C">${NUM[id]}</text>`
      + `<text x="${(x + 3 * k + d + 5 * k).toFixed(1)}" y="${(t.y0 + r + 4.5 * k).toFixed(1)}" ${FONT} font-size="${13 * k}" font-weight="600" fill="#F4EBDD">${NAMES[id]}</text>`; };
  const sqSvg = b => `<rect x="${b.x0.toFixed(1)}" y="${b.y0.toFixed(1)}" width="${(b.x1 - b.x0).toFixed(1)}" height="${(b.y1 - b.y0).toFixed(1)}" fill="none" stroke="#00E5FF" stroke-width="1.5" stroke-dasharray="5 3" opacity="0.85"/>`;
  const bars = `<rect width="${W}" height="${TOP}" fill="#0F1117"/><text x="${W / 2}" y="${TOP / 2 + 22}" text-anchor="middle" ${FONT} font-size="12" fill="#5B6273" letter-spacing="1">APP TOP BAR (FRONTEND'S)</text><rect y="${H - BOT}" width="${W}" height="${BOT}" fill="#0F1117"/><text x="${W / 2}" y="${H - BOT / 2 + 4}" text-anchor="middle" ${FONT} font-size="12" fill="#5B6273" letter-spacing="1">APP TABS (FRONTEND'S)</text>`;
  const overlay = `<g transform="translate(${label.x0} ${label.y0}) skewX(-9) rotate(-1.4)"><rect width="${m.label[0]}" height="${m.label[1]}" fill="#F1B84B" stroke="#10141C" stroke-width="2"/></g><text x="${(label.x0 + m.label[0] / 2).toFixed(1)}" y="${(label.y0 + m.label[1] / 2 + 5.5 * k).toFixed(1)}" text-anchor="middle" font-family="Arial Narrow, Arial, sans-serif" font-size="${15 * k}" font-weight="800" letter-spacing="1" fill="#10141C">ROOM B</text>`
    + `<rect x="${ctl.x0.toFixed(1)}" y="${ctl.y0}" width="${m.control[0]}" height="44" rx="22" fill="#F4EBDD"/><text x="${(W / 2 + 11).toFixed(1)}" y="${(ctl.y0 + 27.5).toFixed(1)}" text-anchor="middle" ${FONT} font-size="${15 * k}" font-weight="600" fill="#10141C">Windows · 2</text>`
    + `<rect x="${chip.x0.toFixed(1)}" y="${chip.y0}" width="${m.chip[0]}" height="${m.chip[1]}" rx="16" fill="rgba(12,15,22,0.86)" stroke="rgba(244,235,221,0.4)" stroke-dasharray="4 3"/><text x="${(W / 2).toFixed(1)}" y="${(chip.y0 + 21).toFixed(1)}" text-anchor="middle" ${FONT} font-size="${13 * k}" font-weight="600" fill="#F4EBDD">Other rooms on the Board</text>`
    + `<rect x="${you.x0}" y="${you.y0}" width="${youW}" height="${you.y1 - you.y0}" rx="${Math.round(10 * k)}" fill="rgba(12,15,22,0.86)"/><text x="${(you.x0 + youW / 2).toFixed(1)}" y="${(you.y0 + 14 * k).toFixed(1)}" text-anchor="middle" ${FONT} font-size="${11 * k}" font-weight="600" fill="rgba(244,235,221,0.85)">${youT}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#0F1117"/>${bars}<svg x="0" y="${TOP}" width="${W}" height="${SH}" viewBox="0 0 ${W} ${SH}" overflow="hidden"><rect width="${W}" height="${SH}" fill="#1c1b20"/>${shell.join('')}${items.map(i => i.svg).join('')}${squares.map(sqSvg).join('')}${tags.map(t => pill(t, t.id)).join('')}${overlay}</svg></svg>`;
  // the pieces, for compositing over a picture: the people far to near, their tags, the screen's own overlay and bars
  const people = items.filter(i => i.kind === 'figure').map(i => i.svg).join('');
  const parts = { SH, bars, overlay, people, tags: tags.map(t => pill(t, t.id)).join(''), squares: squares.map(sqSvg).join(''), figs: figs.map(fg => ({ id: fg.id, anchor: fg.anchor, head: fg.head, headR: fg.headR, u: fg.u, z: fg.z, rect: spriteRect(fg) })) };
  return { svg, issues, per, see, hfov: fit.hfov, edgeStretch: fit.edgeStretch, cam, fit, parts };
}

export function seenAs(v, q) { const toCam = Math.atan2(v.x - q.x, v.z - q.z); let d = (toCam - q.face) / DEG; d = ((d + 540) % 360) - 180; return { angle: Math.round(d), kind: Math.abs(d) <= 30 ? 'front' : Math.abs(d) <= 60 ? 'three-quarter' : 'side', from: d > 0 ? 'their right' : 'their left' }; }

