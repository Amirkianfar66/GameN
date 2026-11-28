// Room A, view E (Lyra's place), sheet RA-E, version 1: the guides, as sheet RA-B's (guideB.mjs, version 1) for view B, with
// view E's own pieces: every station in the painting but the viewer's own, which the approved plan leaves out of the viewer's view
// (visA), and the food capsule where it is in the picture, in its own step 3. The monitors' screens and the round window, where
// they are in view, are openings: flat black, for the game to fill, and the colour check's openings. What is in view is measured,
// not listed: inView below. No plain-wall area. View B's and view A's guide notes follow.
// Room A, view B (Mira's place), sheet RA-B, version 1: the guides, as sheet RA-A's (guideA.mjs, version 4) for view A.
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
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { camera, project, figure } from '../../roomb/ring/ring4b.mjs';
import { build } from '../vis/visA.mjs';
import { LAYOUT, CAPSULE, capsuleAt, camOf, roomWith, IDS, CAST } from '../stageA.mjs';
const DIR = new URL('./', import.meta.url).pathname, DEG = Math.PI / 180;
export const VIEWER = 'E', NAME = 'RA-E';
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
// Version 2 (the Lead, 27 November, on RA-B-2, the accepted step-1 picture): the floor fit, where floorfit-<view>.json exists. The
// listed objects stand on the painted deck: each of their floor points (y = 0) keeps its place between the north wall's foot and the
// deck seam 1 m out, as the guide's camera puts it (its fraction of the way from one line to the other, at its x), and is drawn at
// the same fraction between the painted foot and the painted seam (measureB2.py). Their other points, and everything else the guide
// draws, are the camera's. A local change to the desk's area alone, not a warp of the picture. Views without the file are unchanged.
const FIT = existsSync(DIR + `floorfit-${VIEWER}.json`) ? JSON.parse(readFileSync(DIR + `floorfit-${VIEWER}.json`, 'utf8')) : null;
// version 2, where the step-1 picture's painted window was fitted (window-X.json): steps 2 and 3's map takes the window's opening from
// the painted black, where it lies inside the guide's glass (the rest of the glass reads as frame), so the colour check's opening gate
// reads flat black both on the painting and on the code guides of the dry run
const WIN = existsSync(DIR + `window-${VIEWER}.json`) ? JSON.parse(readFileSync(DIR + `window-${VIEWER}.json`, 'utf8')) : null;
// the fit's two lines on the deck: the north wall's foot (z = 2) and the seam 1 m out (z = 1), as view B's desk, unless the view's
// floorfit file names others (its lines: the axis they are fixed on, the wall's and the seam's value there, and the span they are
// drawn through, in metres; view E's crates use the west wall's foot, x = -2, and the seam 1 m out from it, x = -1)
const FL = (FIT && FIT.lines) || { axis: 'z', wall: 2, seam: 1, along: [-1.9, 1.9] };
const lineAt = v => { const q = u => (FL.axis === 'z' ? [u, 0, v] : [v, 0, u]), a = cam.proj(cam.view(q(FL.along[0]))), b = cam.proj(cam.view(q(FL.along[1]))), s = (b[1] - a[1]) / (b[0] - a[0]); return { slope: s, intercept: a[1] - s * a[0] }; };
const fitY = ([x, y]) => { const g0 = lineAt(FL.wall), g1 = lineAt(FL.seam), p0 = FIT.painted.wallFoot, p1 = FIT.painted.seam1, at = (l, x) => l.intercept + l.slope * x;
  const t = (y - at(g0, x)) / (at(g1, x) - at(g0, x)); if (t < -0.02 || t > 1.02) throw new Error(`the floor fit holds between the wall's foot and the far seam, not at ${t.toFixed(3)}`);
  return [x, at(p0, x) + t * (at(p1, x) - at(p0, x))]; };
// or, where the fit lists its points (floorfit-X.json's points, measured for the view, as view D's), each listed point drawn where it says
const FITPTS = FIT && FIT.points ? new Map(FIT.points.map(f => [f.world.map(v => v.toFixed(3)).join(), f.to])) : null;
const PO = (o, q) => { const pp = P(q); if (!pp || !FIT || !FIT.objects.includes(o.name)) return pp; if (pp.length !== q.length) throw new Error('a fitted face was clipped');
  if (FITPTS) return pp.map((p, i) => FITPTS.get(q[i].map(v => v.toFixed(3)).join()) ?? p);
  return pp.map((p, i) => (q[i][1] < 0.02 ? fitY(p) : p)); };
const at = p => cam.proj(cam.view(p)), depth = p => cam.view(p)[2];
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
const PIECE_OF = { 'electrical panel': 'electrical cabinet', 'panel door': 'electrical cabinet', 'floor hatch': 'floor hatch', 'hatch lid': 'hatch lid', toolbox: 'toolbox', crate: 'crates', 'food capsule': 'food capsule', 'PC desk': 'PC workstation', monitor: 'PC workstation' };
// the hatch's lid is its own piece, as in view A, wherever it is in this view (view B, where it was a 9 px sliver at the painting's
// edge, made it part of the hatch's piece)
const inPicture = o => o.faces.some(fc => { const pp = P(fc.pts); return pp && pp.some(([x, y]) => x > 0 && x < GW && y > 0 && y < GH); });
// what is in view, measured on the painting: the round window (its glass inside the painting), the screens (a monitor's front face
// toward the camera, inside the painting) and the viewer's own station (left out, as the plan leaves it out; its pixels are reported)
const inPaint = pp => pp && pp.some(([x, y]) => x > 0 && x < GW && y > 0 && y < GH);
export const inView = (() => { const win = room.quads.filter(q => q.kind === 'window'), mon = room.objects.filter(o => o.name === 'monitor');
  return { window: win.some(q => seen(q) && inPaint(P(q.pts))), screens: mon.some(o => o.faces.some(fc => normalOf(fc, o).n[2] < -0.7 && facesCam(fc, o) && inPaint(P(fc.pts)))),
    capsule: room.objects.some(o => o.kind === 'capsule' && inPicture(o)), own: room.objects.filter(o => o.place === VIEWER && inPicture(o)).map(o => o.name) }; })();
const OPENINGS_TEXT = inView.window && inView.screens ? ' · the window and the screens are openings, flat black' : inView.window ? ' · the window is an opening, flat black' : inView.screens ? ' · the screens are openings, flat black' : '';
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
// Version 1.1 (the Lead, 27 November): in views B and E, whose wall ahead is seen only a little off square (17.7 degrees), the
// deck seams are drawn stronger, at full strength with a 3 px stroke of the same deep navy, so the slant reads in the guide; the plates
// are the same 1 m plates as every view's. Every other view's guide is drawn as before, byte for byte.
const STRONG_SEAMS = ['B', 'E'].includes(VIEWER);
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
    else if (q.kind === 'seam') out.push(`<polygon points="${pts(pp)}" fill="${plan ? TOKA.deep : MAP.deck}"${plan ? (STRONG_SEAMS ? ` stroke="${TOKA.deep}" stroke-width="3" stroke-linejoin="round"` : ' fill-opacity="0.9"') : ''}/>`);
    else if (q.kind === 'frame') out.push(plan ? `<polygon points="${pts(pp)}" fill="${TOKA.light}" stroke="${TOKA.pale}" stroke-width="2" stroke-linejoin="round"/>` : `<polygon points="${pts(pp)}" fill="#000"/>`);
    else if (q.kind === 'window' && !plan && furniture && WIN) out.push(`<polygon points="${pts(pp)}" fill="#000"/>`, `<polygon points="${pts(WIN.opening.outline)}" fill="${MAP.window}" clip-path="url(#${clip(pp)})"/>`);
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
  const stand = roomWith(VIEWER), PNG = Object.fromEntries(IDS.filter(pl => pl !== VIEWER).map(pl => [pl, 'data:image/png;base64,' + readFileSync(DIR + `../vis/${pl}.png`).toString('base64')]));
  for (const p of stand.people.filter(p => p.place !== VIEWER)) { const fg = figure(cam, p); if (!fg || fg.box[2] < 0 || fg.box[0] > GW) continue; const r = { left: fg.anchor[0] - (p.mirror ? 148 : 152) * fg.u, top: fg.anchor[1] - 273 * fg.u, size: 300 * fg.u }, xc = r.left + r.size / 2;
    out.push(`<image href="${PNG[p.place]}" x="${f1(r.left)}" y="${f1(r.top)}" width="${f1(r.size)}" height="${f1(r.size)}" opacity="0.5"${p.mirror ? ` transform="translate(${f1(2 * xc)} 0) scale(-1 1)"` : ''}/>`,
      `<ellipse cx="${f1(fg.anchor[0])}" cy="${f1(fg.anchor[1])}" rx="${f1(26 * fg.u)}" ry="${f1(7 * fg.u)}" fill="none" stroke="#00E5FF" stroke-width="2"/>`, lab(fg.anchor[0], fg.anchor[1] + 26, `${p.name} (${p.crew})`, '#9FF3FF', 13)); }
  for (const [[W, H], col, dash] of [[[390, 844], '#FF6FB5', '6 5'], [[430, 932], '#7CFC9A', '12 6'], [[402, 742], '#8EC5FF', '3 4']]) { const r = slice([W, H]).rect;
    out.push(`<rect x="${f1(r.x0)}" y="${f1(r.y0)}" width="${f1(r.x1 - r.x0)}" height="${f1(r.y1 - r.y0)}" fill="none" stroke="${col}" stroke-width="2.5" stroke-dasharray="${dash}"/>`, lab(r.x0 + 8, W === 390 ? r.y0 + 18 : W === 430 ? r.y1 - 8 : r.y1 - 26, `${W} × ${H}: 70° across, 5° down`, col, 13, 'start')); }
  out.push(`<rect x="8" y="8" width="${GW - 16}" height="76" rx="6" fill="rgba(12,15,22,0.86)"/>`,
    `<text x="20" y="30" font-family="-apple-system, system-ui, sans-serif" font-size="14" font-weight="700" fill="#F4EBDD">${NAME} · Room A from ${CAST[VIEWER].name}'s place (${VIEWER}) · straight lines, 80° across · horizon y 714 · eye 1.6 m, level, upright</text>`,
    `<text x="20" y="52" font-family="-apple-system, system-ui, sans-serif" font-size="12.5" fill="#F4EBDD">Pink: 390 × 844 · green: 430 × 932 · blue: 402 × 742 (the owner's phone in the app) · each 70° across and 5° down, a centred crop</text>`,
    `<text x="20" y="72" font-family="-apple-system, system-ui, sans-serif" font-size="12.5" fill="#F4EBDD">Gold dashes: step 2's furniture${ps.some(p => p.step === 3) ? " · orange: step 3's capsule" : ''}${OPENINGS_TEXT} · stand-ins, for checking. No people are painted.</text>`);
  return out.join('');
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const g = draw('plan'), s2 = draw('plan', { capsule: false }), e = draw('plan', { furniture: false }), m = draw('map'), em = draw('map', { furniture: false });
  const W = (f, s) => writeFileSync(DIR + f, s);
  W('ra-E-guide.svg', svgOf(g.body, g.defs, TOKA.deep)); W('ra-E-guide-s2.svg', svgOf(s2.body, s2.defs, TOKA.deep)); W('ra-E-empty.svg', svgOf(e.body, e.defs, TOKA.deep));
  W('ra-E-regions.svg', svgOf(m.body, m.defs, '#000', '', true)); W('ra-E-empty-regions.svg', svgOf(em.body, em.defs, '#000', '', true));
  const ps = pieces(), s2p = ps.filter(p => p.step === 2), s3p = ps.filter(p => p.step === 3), grey = (p, k) => 20 * (k + 1);
  W('ra-E-furniture.svg', svgOf(s2p.flatMap(outline).map(pp => `<polygon points="${pts(pp)}" fill="#FFF"/>`).join(''), '', '#000', '', true));
  W('ra-E-stations.svg', svgOf(s2p.map((p, k) => outline(p).map(pp => `<polygon points="${pts(pp)}" fill="rgb(${grey(p, k)},${grey(p, k)},${grey(p, k)})"/>`).join('')).join(''), '', '#000', '', true));
  W('ra-E-capsule.svg', svgOf(s3p.flatMap(outline).map(pp => `<polygon points="${pts(pp)}" fill="#FFF"/>`).join(''), '', '#000', '', true));
  W('ra-E-capsule-label.svg', svgOf(s3p.map((p, k) => outline(p).map(pp => `<polygon points="${pts(pp)}" fill="rgb(${grey(p, k + s2p.length)},${grey(p, k + s2p.length)},${grey(p, k + s2p.length)})"/>`).join('')).join(''), '', '#000', '', true));
  W('ra-E-empty-annotated.svg', svgOf(e.body, e.defs, TOKA.deep, annotations(ps)));
  W('pieces-E.json', JSON.stringify(ps.map(p => ({ grey: p.step === 2 ? grey(p, s2p.indexOf(p)) : grey(p, s2p.length + s3p.indexOf(p)), place: p.place, name: p.name, step: p.step, ...(p.kind ? { kind: p.kind } : {}), parts: p.objects.map(o => o.name), depthM: +p.dist.toFixed(2) })), null, 1));
  const own = room.objects.filter(o => o.place === VIEWER), ownNames = [...new Set(own.map(o => o.name))];
  W('ra-E-own.svg', svgOf(own.map(o => o.faces.map(fc => P(fc.pts)).filter(Boolean).map(pp => `<polygon points="${pts(pp)}" fill="rgb(${20 * (ownNames.indexOf(o.name) + 1)},${20 * (ownNames.indexOf(o.name) + 1)},${20 * (ownNames.indexOf(o.name) + 1)})"/>`).join('')).join(''), '', '#000', '', true));
  W('view-E.json', JSON.stringify({ view: VIEWER, sheet: NAME, roles: ROLES, inView, own: ownNames, slices: Object.fromEntries(PHONES.map(ph => { const r = slice(ph).rect; return [ph.join('x'), [r.x0, r.y0, r.x1, r.y1].map(v => +v.toFixed(1))]; })) }, null, 1));
  console.log('roles', JSON.stringify(ROLES), '| focal', FP.toFixed(1), '| pieces', ps.map(p => `${p.place ?? '-'} ${p.name} (step ${p.step}) ${p.dist.toFixed(2)} m`).join(', '));
  for (const ph of PHONES) { const s = slice(ph); console.log(ph.join('x'), 'slice in the painting x', f1(s.rect.x0), '-', f1(s.rect.x1), 'y', f1(s.rect.y0), '-', f1(s.rect.y1), 'k', s.k.toFixed(4)); }
}
