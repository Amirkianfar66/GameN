// Room A, view B (Mira's place), sheet RA-B, version 2 (the Lead, 27 November): the guides fitted to RA-B-1, the step-1 picture,
// where it painted the back wall's foot and the deck by it more than 16 px off the guide: Vega's desk, its monitors and Vega's
// stand-in follow the painting there (the floor fit below; measure-B.json); everything else as version 1. Writes fit-B.json too.
// Version 1: the guides, as sheet RA-A's (guideA.mjs, version 4) for view A, with view B's
// own pieces: Vega's PC desk and its two monitors, whose screens are openings (flat black, for the game to fill, and the colour
// check's openings), Atlas's crates and Lyra's hatch, its lid and the toolbox; the round window in the north wall is an opening
// too. The food capsule and Echo's cabinet are out of view B. No plain-wall area and no step 3. View A's guide notes follow.
// Room A, view A (Vega's place), sheet RA-A: the guides. The room is the plan's (stageA.mjs, version 7 of the Room A plan, approved
// by the owner on 19 November): the stations and the food capsule where the plan puts them, with no people and no chair (Vega's
// chair is drawn with Vega). The painting is PV6's: 1024 x 1536, straight lines, 80° across (focal 610.2 px), level, the horizon at
// y 714, so each phone's 70° slice at 5° down (390 x 844, 430 x 932 and 402 x 742) is a centred crop of it. The colour plan is Room
// A's own (tokens 0.5.0 color.room.roomA) with the ship's warm light: the two light bars' cream cores and a warm glow around them,
// pools of light on the deck, the walls darker toward their foot with a rust skirting, as in Room B. Openings are flat black.
// Writes ra-A-empty.svg (step 1's input), ra-A-guide.svg (with the stations and the capsule), ra-A-guide-s2.svg (with the stations,
// without the capsule), ra-A-regions.svg and ra-A-empty-regions.svg (the colour check's maps), ra-A-empty-annotated.svg (for
// checking), ra-A-furniture.svg, ra-A-stations.svg, ra-A-capsule.svg and ra-A-capsule-label.svg (the masks' outlines and their
// label maps), and pieces-A.json. Version 3: the annotated guide also outlines step 2's plain-wall area (plainA.json). Generates nothing.
import { writeFileSync, readFileSync } from 'fs';
import { camera, project, figure } from '../../roomb/ring/ring4b.mjs';
import { build } from '../vis/visA.mjs';
import { LAYOUT, CAPSULE, capsuleAt, camOf, roomWith } from '../stageA.mjs';
const DIR = new URL('./', import.meta.url).pathname, DEG = Math.PI / 180;
export const VIEWER = 'B', NAME = 'RA-B';
export const GW = 1024, GH = 1536, ACROSS = 80, FP = GW / 2 / Math.tan((ACROSS / 2) * DEG), GHY = 714, GCX = 512, FOV = 70, PITCH = -5;
// the colour plan: Room A's blue steel (tokens 0.5.0 color.room.roomA), the crew's paper, and the ship's warm light as Room B has it
export const TOKA = { deep: '#14243F', shadow: '#1D3D6B', mid: '#2D609E', light: '#5C92CC', pale: '#A9CAEB' };
export const WARM = { cream: '#FCE3A0', orange: '#EC793C', rust: '#75402E', paper: '#F4EBDD' };
export const MAP = { back: '#FF0000', left: '#00FF00', right: '#0000FF', deck: '#FFFF00', window: '#FF00FF', lamp: '#FFC800' };
// the room, as the plan stages it: the stations and the capsule; LAYOUT.stations draws no chair (roomWith adds it, with Vega)
export const room = build({ ...LAYOUT, capsule: capsuleAt(CAPSULE) });
const { C, yaw } = camOf(VIEWER);
export const cam = camera({ C, yaw, f: FP, cx: GCX, hy: GHY, mode: 'rect' });
const f1 = n => (+n).toFixed(1), pts = pp => pp.map(p => p.map(f1).join(',')).join(' '), P = q => project(cam, q);
const at = p => cam.proj(cam.view(p)), depth = p => cam.view(p)[2];
// Version 2, the floor fit (the Lead, 27 November). RA-B-1 painted the back wall's foot, the far corner and the deck by them lower
// than the guide (measureB.py, measure-B.json). Where the foot is more than 16 px off, Vega's desk and its monitors, and Vega, follow
// the painting. The fitted floor: for a deck point between the seam 1 m from the back wall (z 1) and the wall's foot (z 2), its offset
// d is the painted line minus the guide's, for the foot line and for that seam at the point's x, interpolated by z; k = 1 + d / (its
// y - the horizon). Everything standing on the point is scaled by k about the horizon: y' = horizon + k (y - horizon), x unchanged
// (the camera is level, so a point and its foot share x; a person is scaled by k about the point on the horizon above their feet,
// eyes kept on the horizon). The rest of the room is drawn as version 1 drew it.
const MEAS = JSON.parse(readFileSync(DIR + 'measure-B.json', 'utf8'));
const lineThrough = (a, b) => x => a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
export const GUIDE_FOOT = lineThrough(at([-2, 0, 2]), at([2, 0, 2])), GUIDE_FAR = lineThrough(at([-2, 0, 1]), at([2, 0, 1])), GUIDE_NEAR = lineThrough(at([-2, 0, 0]), at([2, 0, 0]));
export const PAINT_FOOT = x => MEAS.backWallFoot.slope * x + MEAS.backWallFoot.intercept, PAINT_FAR = x => MEAS.farSeam.y0 + MEAS.farSeam.slope * (x - MEAS.farSeam.x0), PAINT_NEAR = x => MEAS.nearSeam.y0 + MEAS.nearSeam.slope * (x - MEAS.nearSeam.x0);
export const FIT_PLACES = new Set(['A']);   // fitted: Vega's desk, its monitors and Vega
export function floorFit(X, Z) {   // a deck point's offset d and scale k in the painting (z between 1 and 2 m; held at its ends beyond)
  const [u, v] = at([X, 0, Z]), t = Math.min(1, Math.max(0, Z - 1)), dB = PAINT_FOOT(u) - GUIDE_FOOT(u), dF = PAINT_FAR(u) - GUIDE_FAR(u), d = dF + t * (dB - dF);
  return { u, v, d, k: 1 + d / (v - GHY), dB, dF };
}
const fitPt = p => { const [u, v] = at(p), { k } = floorFit(p[0], p[2]); return [u, GHY + k * (v - GHY)]; };
const PO = (o, q) => (FIT_PLACES.has(o.place) ? q.map(fitPt) : P(q));   // an object's face, fitted where its place is fitted
const wallName = n => (n[2] === -1 ? 'north' : n[2] === 1 ? 'south' : n[0] === -1 ? 'east' : 'west');
const seen = q => { const p0 = q.pts[0], d = [C[0] - p0[0], C[1] - p0[1], C[2] - p0[2]]; return d[0] * q.n[0] + d[1] * q.n[1] + d[2] * q.n[2] > 0; };
// the walls' roles in this view: the one whose seen part straddles the picture's middle is the back wall
export const ROLES = (() => { const out = {}; for (const q of room.quads.filter(q => q.kind === 'wall' && seen(q))) { const pp = P(q.pts); if (!pp) continue; const xs = pp.map(p => p[0]), x0 = Math.max(0, Math.min(...xs)), x1 = Math.min(GW, Math.max(...xs)); if (x1 <= x0) continue;
  out[wallName(q.n)] = x0 <= GCX && x1 >= GCX ? 'back' : (x0 + x1) / 2 < GCX ? 'left' : 'right'; } return out; })();
// the light bars: points along each, for the glows
const BARS = LAYOUT.lamps.z.map(z => ({ z, pts: Array.from({ length: 11 }, (_, i) => [-LAYOUT.lamps.half + (i * 2 * LAYOUT.lamps.half) / 10, 3.0, z]) }));
// an object's face: its outward normal (from the object's centre) and whether the camera sees its outer side
const normalOf = (fc, o) => { const [a, b, c] = fc.pts, u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  let nn = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const m = fc.pts.reduce((s, p) => [s[0] + p[0] / fc.pts.length, s[1] + p[1] / fc.pts.length, s[2] + p[2] / fc.pts.length], [0, 0, 0]);
  if (nn[0] * (m[0] - o.c[0]) + nn[1] * (m[1] - o.c[1]) + nn[2] * (m[2] - o.c[2]) < 0) nn = nn.map(x => -x); const L = Math.hypot(...nn) || 1; return { n: nn.map(x => x / L), m }; };
const facesCam = (fc, o) => { const { n, m } = normalOf(fc, o); return n[0] * (C[0] - m[0]) + n[1] * (C[1] - m[1]) + n[2] * (C[2] - m[2]) > 0; };
// the pieces in this view, far to near: the viewer's own station left out; the cabinet and its door one piece; the hatch's hole,
// its lid and the toolbox three pieces (the Motion builder's list: the hatch's rim its own layer, the lid its own piece); the capsule
// step 3's one piece
const PIECE_OF = { 'electrical panel': 'electrical cabinet', 'panel door': 'electrical cabinet', 'floor hatch': 'floor hatch', 'hatch lid': 'floor hatch', toolbox: 'toolbox', crate: 'crates', 'food capsule': 'food capsule', 'PC desk': 'PC workstation', monitor: 'PC workstation' };
// view B: the lid is part of the hatch's piece. It stands at the painting's right edge (x 1015 to 1024, 248 px), outside every phone's
// slice (they end at x 939), too small to lift as a layer of its own (the lift drops parts under 400 px)
const inPicture = o => o.faces.some(fc => { const pp = P(fc.pts); return pp && pp.some(([x, y]) => x > 0 && x < GW && y > 0 && y < GH); });
export const pieces = () => { const out = [];
  for (const o of room.objects.filter(o => o.place !== VIEWER && inPicture(o))) { const name = PIECE_OF[o.name]; if (!name) throw new Error('no piece for ' + o.name);
    const p = out.find(p => p.name === name && p.place === o.place); if (p) p.objects.push(o); else out.push({ place: o.place, name, step: o.kind === 'capsule' ? 3 : 2, kind: o.kind === 'capsule' ? 'wall' : undefined, objects: [o] }); }
  return out.map(p => ({ ...p, dist: Math.min(...p.objects.map(o => depth(o.c))) })).sort((a, b) => b.dist - a.dist); };
// a glow: a radial gradient in an ellipse, clipped to a surface
function painter() {
  const defs = []; let n = 0;
  const clip = pp => { const id = `c${n++}`; defs.push(`<clipPath id="${id}"><polygon points="${pts(pp)}"/></clipPath>`); return id; };
  const glow = (cx, cy, rx, ry, stops, cid) => { const id = `g${n++}`; defs.push(`<radialGradient id="${id}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`);
    return `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="url(#${id})"${cid ? ` clip-path="url(#${cid})"` : ''}/>`; };
  return { defs, clip, glow };
}
// fills of a station's faces in the colour plan
function faceFill(o, fc, i, top) {
  const { n } = normalOf(fc, o);
  if (o.name === 'floor hatch') return top ? { fill: TOKA.deep, stroke: TOKA.light, w: 2.2 } : null;   // the open hole, its rim lit
  if (o.name === 'hatch lid') return { fill: TOKA.mid, stroke: TOKA.pale, w: 1.6 };
  if (o.name === 'panel door') return { fill: TOKA.mid, stroke: TOKA.pale, w: 1.2 };
  if (o.name === 'monitor' && !top && n[2] < -0.7) return { fill: '#000', stroke: TOKA.light, w: 1.2, opening: true };   // the screen: an opening, flat black
  const front = Math.abs(n[1]) < 0.5 && ((o.kind === 'capsule' || o.name === 'electrical panel') ? n[0] < -0.7 : false);
  if (top) return { fill: TOKA.pale, stroke: TOKA.deep, w: 1 };
  if (front && o.name === 'electrical panel') return { fill: TOKA.deep, stroke: TOKA.light, w: 1.6 };   // the open cabinet's inside
  if (front && o.kind === 'capsule') return { fill: TOKA.light, stroke: TOKA.deep, w: 1.2 };
  return { fill: Math.abs(n[0]) > Math.abs(n[2]) ? TOKA.shadow : TOKA.mid, stroke: TOKA.deep, w: 0.9 };
}
const quadOnFace = (fc, u0, u1, v0, v1) => { const [a, b, c, d] = fc.pts, lerp = (p, q, t) => p.map((x, k) => x + (q[k] - x) * t), A = lerp(a, b, u0), B = lerp(a, b, u1), D = lerp(d, c, u0), Cc = lerp(d, c, u1);
  return [lerp(A, D, v0), lerp(B, Cc, v0), lerp(B, Cc, v1), lerp(A, D, v1)]; };
export function draw(mode, { furniture = true, capsule = true } = {}) {
  const plan = mode === 'plan', out = [], { defs, clip, glow } = painter();
  for (const q of room.quads.filter(q => ['floor', 'ceiling'].includes(q.kind) || seen(q))) { const pp = P(q.pts); if (!pp) continue;
    if (q.kind === 'ceiling') { out.push(`<polygon points="${pts(pp)}" fill="${plan ? TOKA.deep : '#000'}"/>`); if (!plan) continue; const cid = clip(pp);
      for (const b of BARS) for (const c of b.pts) { if (depth(c) < 0.25) continue; const a = at(c), r = (FP * 0.42) / depth(c);
        out.push(glow(a[0], a[1], r * 1.5, r * 0.9, [[0, WARM.cream, 0.9], [0.22, WARM.paper, 0.6], [0.45, TOKA.pale, 0.32], [0.75, TOKA.light, 0.12], [1, TOKA.mid, 0]], cid)); } }
    else if (q.kind === 'floor') { out.push(`<polygon points="${pts(pp)}" fill="${plan ? TOKA.deep : MAP.deck}"/>`); if (!plan) continue;
      const cid = clip(pp), c = at([0, 0, 0]), d = depth([0, 0, 0]), rx = (FP * 2.2) / d, ry = rx * Math.min(0.9, (1.6 / d) * 1.2);
      out.push(glow(c[0], c[1], rx * 1.5, ry * 1.5, [[0, TOKA.shadow, 0.95], [1, TOKA.deep, 0]], cid));
      for (const b of BARS) for (const p3 of b.pts) { const foot = [p3[0], 0, p3[2]]; if (depth(foot) < 0.3) continue; const a = at(foot), r = (FP * 0.7) / depth(foot);
        out.push(glow(a[0], a[1], r * 1.4, r * 0.62, [[0, WARM.paper, 0.32], [0.25, TOKA.pale, 0.3], [0.55, TOKA.light, 0.3], [1, TOKA.mid, 0]], cid)); } }
    else if (q.kind === 'wall') { const role = ROLES[wallName(q.n)];
      if (!plan) { out.push(`<polygon points="${pts(pp)}" fill="${role ? MAP[role] : '#000'}"/>`); continue; }
      const cid = clip(pp); out.push(`<polygon points="${pts(pp)}" fill="${TOKA.shadow}"/>`);
      // the light bars' light on the wall's upper part, strongest where a bar comes closest to it
      for (const b of BARS) { const near = b.pts.map(p3 => { const w = q.n[0] !== 0 ? [Math.sign(-q.n[0]) * 2, 2.45, p3[2]] : [p3[0], 2.45, Math.sign(-q.n[2]) * 2]; return { w, dM: Math.hypot(w[0] - p3[0], w[2] - p3[2]) }; });
        for (const { w, dM } of near) { if (depth(w) < 0.3 || dM > 1.6) continue; const a = at(w), r = (FP * (1.25 - 0.3 * dM)) / depth(w), k = Math.max(0, 1 - dM / 1.6);
          out.push(glow(a[0], a[1], r, r * 1.1, [[0, TOKA.pale, 0.55 * k], [0.4, TOKA.light, 0.55 * k], [1, TOKA.mid, 0]], cid)); } }
      const base = (y0, y1) => { const fl = q.pts.filter(p => p[1] === 0).slice(0, 2); return [[fl[0][0], y0, fl[0][2]], [fl[1][0], y0, fl[1][2]], [fl[1][0], y1, fl[1][2]], [fl[0][0], y1, fl[0][2]]]; };
      const dark = P(base(0.06, 0.32)), rust = P(base(0, 0.06));
      if (dark) out.push(`<polygon points="${pts(dark)}" fill="${TOKA.deep}" fill-opacity="0.55" clip-path="url(#${cid})"/>`);
      if (rust) out.push(`<polygon points="${pts(rust)}" fill="${WARM.rust}" clip-path="url(#${cid})"/>`); }
    else if (q.kind === 'seam') out.push(`<polygon points="${pts(pp)}" fill="${plan ? TOKA.deep : MAP.deck}"${plan ? ' fill-opacity="0.9"' : ''}/>`);
    else if (q.kind === 'frame') out.push(plan ? `<polygon points="${pts(pp)}" fill="${TOKA.light}" stroke="${TOKA.pale}" stroke-width="2" stroke-linejoin="round"/>` : `<polygon points="${pts(pp)}" fill="#000"/>`);
    else if (q.kind === 'window') out.push(`<polygon points="${pts(pp)}" fill="${plan ? '#000' : MAP.window}"/>`);
    else if (q.kind === 'light') out.push(plan ? `<polygon points="${pts(pp)}" fill="${WARM.cream}" stroke="${WARM.paper}" stroke-width="1.2" stroke-linejoin="round"/>` : `<polygon points="${pts(pp)}" fill="${MAP.lamp}"/>`); }
  // the stations and the capsule, far to near
  if (furniture) for (const p of pieces().filter(p => capsule || p.step !== 3)) for (const o of [...p.objects].sort((a, b) => depth(b.c) - depth(a.c))) {
    const box = o.faces.length === 5;
    o.faces.forEach((fc, i) => { const top = box && i === 4; if (box && !top && !facesCam(fc, o)) return; const pp = PO(o, fc.pts); if (!pp) return;
      if (!plan) { const sc = o.name === 'monitor' && !top && normalOf(fc, o).n[2] < -0.7; out.push(`<polygon points="${pts(pp)}" fill="${sc ? MAP.window : '#000'}"/>`); return; }
      const f = faceFill(o, fc, i, top); if (!f) return;
      out.push(`<polygon points="${pts(pp)}" fill="${f.fill}" stroke="${f.stroke}" stroke-width="${f.w}" stroke-linejoin="round"/>`);
      if (!top && f.fill === TOKA.deep && o.name === 'electrical panel') {   // breakers in rows and two small warm indicator lights
        for (const [u0, u1, v0, v1] of [[0.12, 0.88, 0.62, 0.7], [0.12, 0.88, 0.44, 0.52], [0.12, 0.88, 0.26, 0.34]]) { const r = P(quadOnFace(fc, u0, u1, v0, v1)); if (r) out.push(`<polygon points="${pts(r)}" fill="${TOKA.mid}" stroke="${TOKA.light}" stroke-width="0.8"/>`); }
        for (const u of [0.2, 0.3]) { const r = P(quadOnFace(fc, u, u + 0.04, 0.82, 0.86)); if (r) out.push(`<polygon points="${pts(r)}" fill="${WARM.orange}"/>`); } }
      if (!top && f.fill === TOKA.light && o.kind === 'capsule') {   // the capsule's front: a closed paper-white hatch, a small dark lens above it
        const h = P(quadOnFace(fc, 0.16, 0.84, 0.12, 0.66)), l = P(quadOnFace(fc, 0.42, 0.58, 0.76, 0.86)); if (h) out.push(`<polygon points="${pts(h)}" fill="${WARM.paper}" stroke="${TOKA.deep}" stroke-width="1"/>`); if (l) out.push(`<polygon points="${pts(l)}" fill="${TOKA.deep}"/>`); } }); }
  return { body: out.join(''), defs: defs.join('') };
}
export const svgOf = (inner, defs, bg, extra = '', crisp = false) => `<svg xmlns="http://www.w3.org/2000/svg" width="${GW}" height="${GH}" viewBox="0 0 ${GW} ${GH}"${crisp ? ' shape-rendering="crispEdges"' : ''}><defs>${defs}</defs><rect width="${GW}" height="${GH}" fill="${bg}"/>${inner}${extra}</svg>`;
// a stage pixel to a painting pixel: the same straight-line camera, scaled about the horizon point
export const PHONES = [[390, 844], [430, 932], [402, 742]];
export const slice = ([W, H]) => { const SH = H - 99 - 92, fs = W / 2 / Math.tan((FOV / 2) * DEG), hys = SH / 2 - fs * Math.tan(5 * DEG), k = FP / fs;
  const toP = ([x, y]) => [GCX + (x - W / 2) * k, GHY + (y - hys) * k]; const [x0, y0] = toP([0, 0]), [x1, y1] = toP([W, SH]); return { W, H, SH, fs, hys, k, toP, rect: { x0, y0, x1, y1 } }; };
const outline = p => p.objects.flatMap(o => o.faces.map(fc => PO(o, fc.pts)).filter(Boolean));
function annotations(ps) {
  const lab = (x, y, t, col, size = 14, anchor = 'middle') => `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-family="-apple-system, system-ui, sans-serif" font-size="${size}" font-weight="700" fill="${col}" stroke="rgba(0,0,0,0.75)" stroke-width="3" paint-order="stroke">${t}</text>`;
  const out = [`<line x1="0" x2="${GW}" y1="${GHY}" y2="${GHY}" stroke="#F1B84B" stroke-width="1.5" stroke-dasharray="8 5"/>`, lab(GW - 8, GHY + 20, 'horizon y 714', '#F1B84B', 14, 'end')];
  for (let d = -40; d <= 40; d += 5) { const x = GCX + FP * Math.tan(d * DEG); out.push(`<line x1="${f1(x)}" x2="${f1(x)}" y1="${GHY - (d % 35 === 0 ? 12 : 6)}" y2="${GHY + (d % 35 === 0 ? 12 : 6)}" stroke="#F1B84B" stroke-width="1.5"/>`); }
  for (const b of BARS) { const c = [0, 3.0, b.z]; if (depth(c) < 0.3) continue; const a = at(c); out.push(lab(Math.min(GW - 60, Math.max(60, a[0])), a[1] + 26, `light bar (${b.z > 0 ? 'north' : 'south'})`, '#FFC800', 13)); }
  for (const p of ps) { const step3 = p.step === 3, col = step3 ? '#FF9F5A' : '#FFD166';
    out.push(outline(p).map(pp => `<polygon points="${pts(pp)}" fill="none" stroke="${col}" stroke-width="1.8" stroke-dasharray="${step3 ? '3 3' : '5 4'}" stroke-linejoin="round"/>`).join(''));
    const xs = outline(p).flat(), cx = xs.reduce((s, q) => s + q[0], 0) / xs.length, y0 = Math.min(...xs.map(q => q[1])); out.push(lab(Math.min(GW - 70, Math.max(70, cx)), Math.max(18, y0 - 8), `${p.name}${step3 ? ' (step 3)' : ''}`, col, 13)); }
  // step 2's plain-wall area (plainA.json, fitted to RA-A-1), for checking: step 2 repaints it as plain steel wall

  // the people in view at their spots in view A (stand-ins, half seen), for checking only: they are never painted
  const stand = roomWith(VIEWER), PNG = Object.fromEntries(['A', 'C', 'D', 'E'].map(pl => [pl, 'data:image/png;base64,' + readFileSync(DIR + `../vis/${pl}.png`).toString('base64')]));
  for (const p of stand.people.filter(p => p.place !== VIEWER)) { let fg = figure(cam, p); if (!fg || fg.box[2] < 0 || fg.box[0] > GW) continue;
    if (FIT_PLACES.has(p.place)) { const { k } = floorFit(p.x, p.z); fg = { ...fg, anchor: [fg.anchor[0], GHY + k * (fg.anchor[1] - GHY)], u: fg.u * k }; }
    const r = { left: fg.anchor[0] - (p.mirror ? 148 : 152) * fg.u, top: fg.anchor[1] - 273 * fg.u, size: 300 * fg.u }, xc = r.left + r.size / 2;
    out.push(`<image href="${PNG[p.place]}" x="${f1(r.left)}" y="${f1(r.top)}" width="${f1(r.size)}" height="${f1(r.size)}" opacity="0.5"${p.mirror ? ` transform="translate(${f1(2 * xc)} 0) scale(-1 1)"` : ''}/>`,
      `<ellipse cx="${f1(fg.anchor[0])}" cy="${f1(fg.anchor[1])}" rx="${f1(26 * fg.u)}" ry="${f1(7 * fg.u)}" fill="none" stroke="#00E5FF" stroke-width="2"/>`, lab(fg.anchor[0], fg.anchor[1] + 26, `${p.name} (${p.crew})${FIT_PLACES.has(p.place) ? ', fitted' : ''}`, '#9FF3FF', 13)); }
  // version 2: the painted back-wall foot (magenta) where the fit applies, and the guide's (cyan dashes), for checking
  out.push(`<line x1="${MEAS.farCorner.x}" x2="900" y1="${f1(PAINT_FOOT(MEAS.farCorner.x))}" y2="${f1(PAINT_FOOT(900))}" stroke="#FF4FD8" stroke-width="2"/>`, `<line x1="${MEAS.farCorner.x}" x2="${MEAS.farCorner.x}" y1="500" y2="${f1(PAINT_FOOT(MEAS.farCorner.x))}" stroke="#FF4FD8" stroke-width="2"/>`,
    `<line x1="${f1(at([-2, 0, 2])[0])}" x2="900" y1="${f1(GUIDE_FOOT(at([-2, 0, 2])[0]))}" y2="${f1(GUIDE_FOOT(900))}" stroke="#00E5FF" stroke-width="1.5" stroke-dasharray="6 4"/>`, lab(640, PAINT_FOOT(640) + 22, "the painted back-wall foot (RA-B-1)", '#FF9FEA', 12));
  for (const [[W, H], col, dash] of [[[390, 844], '#FF6FB5', '6 5'], [[430, 932], '#7CFC9A', '12 6'], [[402, 742], '#8EC5FF', '3 4']]) { const r = slice([W, H]).rect;
    out.push(`<rect x="${f1(r.x0)}" y="${f1(r.y0)}" width="${f1(r.x1 - r.x0)}" height="${f1(r.y1 - r.y0)}" fill="none" stroke="${col}" stroke-width="2.5" stroke-dasharray="${dash}"/>`, lab(r.x0 + 8, W === 390 ? r.y0 + 18 : W === 430 ? r.y1 - 8 : r.y1 - 26, `${W} × ${H}: 70° across, 5° down`, col, 13, 'start')); }
  out.push(`<rect x="8" y="8" width="${GW - 16}" height="76" rx="6" fill="rgba(12,15,22,0.86)"/>`,
    `<text x="20" y="30" font-family="-apple-system, system-ui, sans-serif" font-size="14" font-weight="700" fill="#F4EBDD">${NAME} version 2 · Room A from Mira's place (B) · straight lines, 80° across · horizon y 714 · eye 1.6 m, level, upright</text>`,
    `<text x="20" y="52" font-family="-apple-system, system-ui, sans-serif" font-size="12.5" fill="#F4EBDD">Pink: 390 × 844 · green: 430 × 932 · blue: 402 × 742 (the owner's phone in the app) · each 70° across and 5° down, a centred crop</text>`,
    `<text x="20" y="72" font-family="-apple-system, system-ui, sans-serif" font-size="12.5" fill="#F4EBDD">Gold dashes: step 2's furniture (the desk fitted to RA-B-1) · magenta: RA-B-1's painted back-wall foot · stand-ins, for checking. No people are painted.</text>`);
  return out.join('');
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const g = draw('plan'), s2 = draw('plan', { capsule: false }), e = draw('plan', { furniture: false }), m = draw('map'), em = draw('map', { furniture: false });
  const W = (f, s) => writeFileSync(DIR + f, s);
  W('ra-B-guide.svg', svgOf(g.body, g.defs, TOKA.deep)); W('ra-B-guide-s2.svg', svgOf(s2.body, s2.defs, TOKA.deep)); W('ra-B-empty.svg', svgOf(e.body, e.defs, TOKA.deep));
  W('ra-B-regions.svg', svgOf(m.body, m.defs, '#000', '', true)); W('ra-B-empty-regions.svg', svgOf(em.body, em.defs, '#000', '', true));
  const ps = pieces(), s2p = ps.filter(p => p.step === 2), s3p = ps.filter(p => p.step === 3), grey = (p, k) => 20 * (k + 1);
  W('ra-B-furniture.svg', svgOf(s2p.flatMap(outline).map(pp => `<polygon points="${pts(pp)}" fill="#FFF"/>`).join(''), '', '#000', '', true));
  W('ra-B-stations.svg', svgOf(s2p.map((p, k) => outline(p).map(pp => `<polygon points="${pts(pp)}" fill="rgb(${grey(p, k)},${grey(p, k)},${grey(p, k)})"/>`).join('')).join(''), '', '#000', '', true));
  W('ra-B-capsule.svg', svgOf(s3p.flatMap(outline).map(pp => `<polygon points="${pts(pp)}" fill="#FFF"/>`).join(''), '', '#000', '', true));
  W('ra-B-capsule-label.svg', svgOf(s3p.map((p, k) => outline(p).map(pp => `<polygon points="${pts(pp)}" fill="rgb(${grey(p, k + s2p.length)},${grey(p, k + s2p.length)},${grey(p, k + s2p.length)})"/>`).join('')).join(''), '', '#000', '', true));
  W('ra-B-empty-annotated.svg', svgOf(e.body, e.defs, TOKA.deep, annotations(ps)));
  W('pieces-B.json', JSON.stringify(ps.map(p => ({ grey: p.step === 2 ? grey(p, s2p.indexOf(p)) : grey(p, s2p.length + s3p.indexOf(p)), place: p.place, name: p.name, step: p.step, ...(p.kind ? { kind: p.kind } : {}), parts: p.objects.map(o => o.name), depthM: +p.dist.toFixed(2) })), null, 1));
  { const r1 = v => +v.toFixed(1), r3 = v => +v.toFixed(3), desk = room.objects.filter(o => FIT_PLACES.has(o.place));
    const corners = desk.flatMap(o => o.faces.flatMap(fc => fc.pts)).filter((q, i, a) => a.findIndex(w => w.every((c, j) => Math.abs(c - q[j]) < 1e-9)) === i)
      .map(q => { const g = at(q), f = fitPt(q), ff = floorFit(q[0], q[2]); return { room: q.map(r3), guide: g.map(r1), fitted: f.map(r1), shiftPx: r1(f[1] - g[1]), footOffsetPx: r1(ff.d), k: r3(ff.k) }; });
    const vega = roomWith(VIEWER).people.find(p => FIT_PLACES.has(p.place)), fg = figure(cam, vega), vf = floorFit(vega.x, vega.z);
    const toStage = ([W, H], [x, y]) => { const s = slice([W, H]); return [(x - GCX) / s.k + W / 2, (y - GHY) / s.k + s.hys]; };
    const x16 = (() => { let x = MEAS.farCorner.x; while (PAINT_FOOT(x) - GUIDE_FOOT(x) > 16 && x < GW) x += 0.5; return x; })();
    const table = []; for (let Z = 1; Z <= 2.0001; Z += 0.25) for (let X = -1.75; X <= 1.7501; X += 0.25) { const f = floorFit(X, Z); if (f.u >= 0 && f.u <= GW) table.push({ X: r3(X), Z: r3(Z), u: r1(f.u), v: r1(f.v), d: r1(f.d), k: r3(f.k) }); }
    const fit = { view: VIEWER, sheet: NAME, version: 2, picture: MEAS.picture,
      about: "View B's floor fit (the Lead, 27 November): RA-B-1 painted the back wall's foot, the far corner and the deck by them lower than the guide. Where the foot is more than 16 px off, Vega's desk and its monitors, and Vega, follow the painting. Picture pixels of the 1024 x 1536 painting; room metres x east, y up, z north.",
      rule: "For a deck point (x, z) with z from 1 to 2 m (from the seam 1 m from the back wall to the wall's foot): d = dFar + (z - 1) (dFoot - dFar), where dFoot and dFar are the painted foot line and far seam minus the guide's, at the point's picture x; k = 1 + d / (v - 714), v the point's picture y in the guide. Whatever stands on the point is scaled by k about the horizon: y' = 714 + k (y - 714), x unchanged; a person is scaled by k about the point on the horizon above their feet. Outside z 1-2 the room is the guide's.",
      measured: { backWallFoot: { painted: { slope: MEAS.backWallFoot.slope, intercept: MEAS.backWallFoot.intercept, rmsPx: MEAS.backWallFoot.rmsPx }, guide: { at: [r1(at([-2, 0, 2])[0]), r1(at([-2, 0, 2])[1])], to: [r1(at([2, 0, 2])[0]), r1(at([2, 0, 2])[1])] },
          offsetPx: Object.fromEntries([380, 420, 480, 540, 600, 640, 680, 720, 780, 820, 900, 960, 1000].map(x => [x, r1(PAINT_FOOT(x) - GUIDE_FOOT(x))])), over16: { from: MEAS.farCorner.x, to: r1(x16) } },
        farCorner: { painted: MEAS.farCorner.x, guide: r1(at([-2, 0, 2])[0]), offsetPx: r1(MEAS.farCorner.x - at([-2, 0, 2])[0]), footPainted: [MEAS.farCorner.x, r1(PAINT_FOOT(MEAS.farCorner.x))], footGuide: at([-2, 0, 2]).map(r1) },
        farSeam: { painted: { x0: MEAS.farSeam.x0, y0: MEAS.farSeam.y0, slope: MEAS.farSeam.slope }, offsetPx: Object.fromEntries([300, 380, 440, 500, 560, 620].map(x => [x, r1(PAINT_FAR(x) - GUIDE_FAR(x))])) },
        nearSeam: { note: 'for the record: not fitted', painted: { x0: MEAS.nearSeam.x0, y0: MEAS.nearSeam.y0, slope: MEAS.nearSeam.slope }, offsetPx: Object.fromEntries([120, 240, 360, 480, 600].map(x => [x, r1(PAINT_NEAR(x) - GUIDE_NEAR(x))])) } },
      desk: { pieces: desk.map(o => o.name), corners },
      vega: { spot: [vega.x, vega.z], footGuide: fg.anchor.map(r1), footFitted: [r1(fg.anchor[0]), r1(GHY + vf.k * (fg.anchor[1] - GHY))], footOffsetPx: r1(vf.d), k: r3(vf.k),
        onPhones: Object.fromEntries(PHONES.map(ph => { const a0 = toStage(ph, fg.anchor), a1 = toStage(ph, [fg.anchor[0], GHY + vf.k * (fg.anchor[1] - GHY)]); return [ph.join('x'), { footGuide: a0.map(r1), footFitted: a1.map(r1), shiftPx: r1(a1[1] - a0[1]), scale: r3(vf.k) }]; })) },
      walkers: { note: "for the Motion builder's walkers in view B: a figure whose feet stand in z 1-2 m is scaled by k about the point on the horizon above its feet; between the table's points, d and k by the rule", table } };
    W('fit-B.json', JSON.stringify(fit, null, 1)); }
  console.log('roles', JSON.stringify(ROLES), '| focal', FP.toFixed(1), '| pieces', ps.map(p => `${p.place ?? '-'} ${p.name} (step ${p.step}) ${p.dist.toFixed(2)} m`).join(', '));
  for (const ph of PHONES) { const s = slice(ph); console.log(ph.join('x'), 'slice in the painting x', f1(s.rect.x0), '-', f1(s.rect.x1), 'y', f1(s.rect.y0), '-', f1(s.rect.y1), 'k', s.k.toFixed(4)); }
}
