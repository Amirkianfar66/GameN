// Room B's views B to E, version 2 (sheets PV6-B to PV6-E): the guides, as version 1's (guide7.mjs, word for word but for the
// staging and the capsule): from the view's staging (views8.mjs: the furniture as the chosen option keeps it, people cheated alone,
// the food capsule on Atlas's bench as its own piece, drawn just after the bench it stands on) and the layout test's room
// (vis5.mjs) with Option A's ceiling (guide5.mjs CEILING), the same lamps, ring, colour plan and painting as PV6-A: 1024 x 1536,
// straight lines, 80° across (focal 610.2 px), the horizon at y 714, so both phones' 70° slices at 5° down fit inside it. The view
// is the module's query (guide7.mjs?view=B) or, run alone, its argument. Writes pv6-<view>-guide.svg (with the stations),
// pv6-<view>-empty.svg (without), pv6-<view>-regions.svg and pv6-<view>-empty-regions.svg (colour check v4's maps),
// pv6-<view>-empty-annotated.svg, pv6-<view>-furniture.svg and pv6-<view>-stations.svg (the PLACE outlines and their label map),
// and pieces8-<view>.json. The option is the query's (guide8.mjs?view=B&option=1) or PV8_OPTION, 1 by default. Generates nothing.
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { camera, project } from '../ring/ring4b.mjs';
import { IDS, figureAt, spriteRect, standInPng, FULL } from '../vis/vis5.mjs';
import { CEILING, SKY } from '../pv5/guide5.mjs';
import { roomOf8, view8 } from './views8.mjs';
import { camAt8 } from './stage8.mjs';
import { DIMS, placeOf } from './capsule8.mjs';
import { WALL } from './units8.mjs';
import { LAMPS } from '../pv6/report6.mjs';
const DIR = new URL('./', import.meta.url).pathname, DEG = Math.PI / 180;
export const GW = 1024, GH = 1536, ACROSS = 80, FP = GW / 2 / Math.tan((ACROSS / 2) * DEG), GHY = 714, GCX = 512;
// the colour plan's values: Room B's violet (tokens 0.5.0 color.room.roomB) and the references' plum, measured
export const VIOLET = { deep: '#2A1446', shadow: '#4B2079', mid: '#7A3CAD', light: '#AE6CD3', pale: '#DCB6EE' };
export const PLUM = { deep: '#2A172E', shadow: '#582D59', mid: '#684166', light: '#774B70', warm: '#8C5675', pale: '#C18CA9' };
export const WARM = { orange: '#EC793C', cream: '#FCE3A0', rust: '#75402E' }, BLUEGREEN = ['#3A9497', '#066D84'];
export const MAP = { back: '#FF0000', left: '#00FF00', right: '#0000FF', deck: '#FFFF00', window: '#FF00FF', screen: '#00FFFF', display: '#FF8000', skylight: '#0080FF', lamp: '#FFC800' };
export const VIEWER = new URL(import.meta.url).searchParams.get('view') ?? process.argv[2];
// C's version 6: the lit strips at the foot of the back wall, cut from the step-1 picture by strips8.py (their plaques, in pixels)
const STRIPS = VIEWER && existsSync(DIR + `strips-${VIEWER}.json`) ? JSON.parse(readFileSync(DIR + `strips-${VIEWER}.json`, 'utf8')).strips : [];
if (!['B', 'C', 'D', 'E'].includes(VIEWER)) throw new Error(`guide8.mjs: no view ${VIEWER}`);
export const OPTION = +(new URL(import.meta.url).searchParams.get('option') ?? process.env.PV8_OPTION ?? 1);
export const STAGING = { fov: 70, farScale: 1 };
export const room = roomOf8(VIEWER, OPTION);
const { C, yaw } = camAt8(VIEWER);
export const cam = camera({ C, yaw, f: FP, cx: GCX, hy: GHY, mode: 'rect' });
const f1 = n => (+n).toFixed(1), pts = pp => pp.map(p => p.map(f1).join(',')).join(' '), P = q => project(cam, q);
const at = p => cam.proj(cam.view(p)), depth = p => cam.view(p)[2];
const wallName = n => (n[2] === -1 ? 'north' : n[2] === 1 ? 'south' : n[0] === -1 ? 'east' : 'west');
const seen = q => { const p0 = q.pts[0], d = [C[0] - p0[0], C[1] - p0[1], C[2] - p0[2]]; return d[0] * q.n[0] + d[1] * q.n[1] + d[2] * q.n[2] > 0; };
// the walls' roles in this view: the one whose seen part straddles the picture's middle is the back wall
export const ROLES = (() => { const out = {}; for (const q of room.quads.filter(q => q.kind === 'wall' && seen(q))) { const pp = P(q.pts); if (!pp) continue; const xs = pp.map(p => p[0]), x0 = Math.max(0, Math.min(...xs)), x1 = Math.min(GW, Math.max(...xs)); if (x1 <= x0) continue;
  out[wallName(q.n)] = x0 <= GCX && x1 >= GCX ? 'back' : (x0 + x1) / 2 < GCX ? 'left' : 'right'; } return out; })();
// a lamp: a backplate, a cream core in a cage, on the wall at LAMP_Y; its warm light on the wall around it
const lampOn = l => { const n = l.wall === 'north' ? [0, 0, -1] : l.wall === 'south' ? [0, 0, 1] : l.wall === 'east' ? [-1, 0, 0] : [1, 0, 0]; return { ...l, n }; };
const LAMPS6 = LAMPS.map(lampOn);
const quadOn = (l, w, h, out = 0.04) => { const u = [-l.n[2], 0, l.n[0]], c = [l.at[0] + l.n[0] * out, l.at[1], l.at[2] + l.n[2] * out];
  return [[c[0] - u[0] * w / 2, c[1] - h / 2, c[2] - u[2] * w / 2], [c[0] + u[0] * w / 2, c[1] - h / 2, c[2] + u[2] * w / 2], [c[0] + u[0] * w / 2, c[1] + h / 2, c[2] + u[2] * w / 2], [c[0] - u[0] * w / 2, c[1] + h / 2, c[2] - u[2] * w / 2]]; };
export function draw(mode, { furniture = true, capsule = true, stool = true, strips = true } = {}) {   // capsule / stool / strips: false draws the stations without the food capsule / Juno's stool / C's vent grilles (the step-2 guide)
  const plan = mode === 'plan', out = [], defs = []; let n = 0;
  const clip = pp => { const id = `c${n++}`; defs.push(`<clipPath id="${id}"><polygon points="${pts(pp)}"/></clipPath>`); return id; };
  const glow = (cx, cy, rx, ry, stops, cid) => { const id = `g${n++}`; defs.push(`<radialGradient id="${id}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`);
    return `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="url(#${id})"${cid ? ` clip-path="url(#${cid})"` : ''}/>`; };
  const warmPool = [[0, WARM.orange, 0.9], [0.22, WARM.orange, 0.6], [0.48, PLUM.warm, 0.8], [0.78, PLUM.light, 0.45], [1, PLUM.mid, 0]];
  for (const q of room.quads.filter(q => q.kind === 'floor' || q.kind === 'ceiling' || seen(q))) { const pp = P(q.pts); if (!pp) continue;
    if (q.kind === 'ceiling') { out.push(`<polygon points="${pts(pp)}" fill="${plan ? VIOLET.deep : '#000'}"/>`); if (plan) { const cid = clip(pp);
        for (const c of CEILING.lightCentres) { const a = at(c), r = (FP * 0.34) / depth(c); if (depth(c) > 0.2) out.push(glow(a[0], a[1], r * 1.4, r * 0.8, [[0, WARM.cream, 1], [0.3, WARM.cream, 1], [0.4, WARM.orange, 0.95], [0.6, WARM.orange, 0.5], [0.8, PLUM.warm, 0.3], [1, PLUM.shadow, 0]], cid)); } }
      out.push(ceiling(plan)); }
    else if (q.kind === 'floor') { out.push(`<polygon points="${pts(pp)}" fill="${plan ? VIOLET.deep : MAP.deck}"/>`);
      if (plan) { const cid = clip(pp), c = at([0, 0, 0]), d = depth([0, 0, 0]), rx = (FP * 2.0) / d, ry = rx * Math.min(0.9, (1.6 / d) * 1.2);
        out.push(glow(c[0], c[1], rx * 1.6, ry * 1.6, [[0, PLUM.shadow, 0.9], [1, VIOLET.deep, 0]], cid), glow(c[0], c[1], rx, ry, [[0, PLUM.light, 0.95], [0.6, PLUM.mid, 0.8], [1, PLUM.shadow, 0]], cid));
        for (const l of LAMPS6) { const foot = [l.at[0] + l.n[0] * 0.45, 0, l.at[2] + l.n[2] * 0.45]; if (depth(foot) < 0.3) continue; const a = at(foot), r = (FP * 0.62) / depth(foot); out.push(glow(a[0], a[1], r * 1.6, r * 0.6, warmPool, cid)); } } }
    else if (q.kind === 'wall') { const role = ROLES[wallName(q.n)];
      if (!plan) { out.push(`<polygon points="${pts(pp)}" fill="${role ? MAP[role] : '#000'}"/>`); continue; }
      const cid = clip(pp); out.push(`<polygon points="${pts(pp)}" fill="${VIOLET.shadow}"/>`);
      // the warm light on the wall around each of its lamps, and the darker foot of the wall with a rust skirting
      for (const l of LAMPS6.filter(l => l.wall === wallName(q.n))) { const c = [l.at[0] + l.n[0] * 0.02, l.at[1], l.at[2] + l.n[2] * 0.02]; if (depth(c) < 0.3) continue; const a = at(c), r = (FP * 1.1) / depth(c);
        out.push(glow(a[0], a[1], r, r * 1.15, [[0, WARM.cream, 1], [0.13, WARM.cream, 1], [0.17, WARM.orange, 1], [0.26, WARM.orange, 0.85], [0.42, PLUM.warm, 0.9], [0.68, PLUM.light, 0.7], [0.88, PLUM.mid, 0.4], [1, PLUM.mid, 0]], cid)); }
      const base = (y0, y1) => q.pts.filter(p => p[1] === 0).slice(0, 2).flatMap((p, i, a) => i === 0 ? [[p[0], y0, p[2]], [a[1][0], y0, a[1][2]]] : []).concat(q.pts.filter(p => p[1] === 0).slice(0, 2).reverse().map(p => [p[0], y1, p[2]]));
      const dark = P(base(0.06, 0.32)), rust = P(base(0, 0.06));
      if (dark) out.push(`<polygon points="${pts(dark)}" fill="${VIOLET.deep}" fill-opacity="0.55" clip-path="url(#${cid})"/>`);
      if (rust) out.push(`<polygon points="${pts(rust)}" fill="${WARM.rust}" clip-path="url(#${cid})"/>`); }
    else if (q.kind === 'seam') out.push(`<polygon points="${pts(pp)}" fill="${plan ? PLUM.deep : MAP.deck}"${plan ? ' fill-opacity="0.9"' : ''}/>`);
    else if (q.kind === 'frame') out.push(plan ? `<polygon points="${pts(pp)}" fill="${PLUM.light}" stroke="${PLUM.pale}" stroke-width="2" stroke-linejoin="round"/>` : `<polygon points="${pts(pp)}" fill="#000"/>`);
    else if (q.kind === 'window' || q.kind === 'screen') out.push(`<polygon points="${pts(pp)}" fill="${plan ? '#000' : MAP[q.kind]}"/>`); }
  // the lamps on the seen walls
  for (const l of LAMPS6) { const wallQ = room.quads.find(q => q.kind === 'wall' && wallName(q.n) === l.wall); if (!seen(wallQ)) continue;
    const plate = P(quadOn(l, 0.26, 0.36, 0.01)), core = P(quadOn(l, 0.16, 0.25, 0.05)); if (!plate || !core) continue;
    if (!plan) { out.push(`<polygon points="${pts(plate)}" fill="${MAP.lamp}"/>`); continue; }
    out.push(`<polygon points="${pts(plate)}" fill="${VIOLET.deep}" stroke="${PLUM.shadow}" stroke-width="1.2"/>`, `<polygon points="${pts(core)}" fill="${WARM.cream}"/>`);
    for (const t of [-0.04, 0, 0.04]) { const bar = P(quadOn({ ...l, at: [l.at[0] + (-l.n[2]) * t, l.at[1], l.at[2] + l.n[0] * t] }, 0.008, 0.26, 0.06)); if (bar) out.push(`<polygon points="${pts(bar)}" fill="${PLUM.deep}"/>`); } }
  // the stations, far to near, the viewer's own left out
  if (furniture) {
    const objs = room.objects.filter(o => o.place !== VIEWER).map(o => ({ o, z: o.name === 'microscope' || (o.name === 'food capsule' && o.kind === 'counter') ? depth(room.objects.find(b => b.place === o.place && b.name === 'bench').c) - 0.001 : depth(o.c) })).sort((a, b) => b.z - a.z);
    for (const { o } of objs) { if (o.name === 'food capsule') { if (capsule) out.push(capsuleSvg(o, plan)); continue; } if (o.name === 'stool' && !stool) continue; const display = o.name === 'tablet console' || o.name === 'console', box = o.faces.length === 5;
      o.faces.forEach((fc, i) => { const top = box ? i === 4 : i === o.faces.length - 1; if (!top && !facesCam(fc, o)) return; const pp = P(fc.pts); if (!pp) return;
        if (!plan) { out.push(`<polygon points="${pts(pp)}" fill="${top && display ? MAP.display : '#000'}"/>`); return; }
        const fill = top ? (display ? VIOLET.deep : PLUM.light) : box ? (i === 0 ? (o.name === 'microscope' ? PLUM.warm : PLUM.mid) : VIOLET.shadow) : PLUM.mid;
        out.push(`<polygon points="${pts(pp)}" fill="${fill}" stroke="${top ? (display ? PLUM.light : WARM.orange) : PLUM.deep}" stroke-width="${top ? 1.6 : 0.9}" stroke-linejoin="round"/>`); });
      if (plan && display) { const front = o.faces[0], m = front.pts.map(p => p).reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]); for (const [k, col] of BLUEGREEN.entries()) { const d = [m[0] + (k - 0.5) * 0.08, 0.62, m[2]], a = at(d), r = (FP * 0.012) / depth(d); out.push(`<circle cx="${f1(a[0])}" cy="${f1(a[1])}" r="${f1(Math.max(1.5, r))}" fill="${col}"/>`); } } } }
  if (plan && furniture && strips) for (const s of STRIPS) out.push(grilleSvg(s.plaque));   // the full guide only: step 3's input shows a grille in each strip's shape
  return { body: out.join(''), defs: defs.join('') };
}
// C's version 6: a plain vent grille in each strip's plaque: a steel frame with six dark slots, unlit
function grilleSvg([x0, y0, x1, y1]) { const w = x1 + 1 - x0, h = y1 + 1 - y0, n = 6, sw = (w - 8) / n;
  const slots = Array.from({ length: n }, (_, i) => `<rect x="${f1(x0 + 4 + i * sw + 1)}" y="${f1(y0 + 5)}" width="${f1(sw - 2)}" height="${f1(h - 10)}" rx="1" fill="${VIOLET.deep}"/>`).join('');
  return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="3" fill="${PLUM.mid}" stroke="${PLUM.deep}" stroke-width="1.6"/>${slots}`; }
// the food capsule (capsule8.mjs, ship-life's counter unit): a box in the room's steel-plum, its front face with the paper hatch and
// its handle, two vent slots under the hatch and the small light above it, unlit (the code draws its state over it); in the map,
// furniture black like every piece
function capsuleSvg(o, plan) { if (o.kind === 'wall') return wallUnitSvg(o, plan); const parts = []; o.faces.forEach((fc, i) => { const top = i === 4; if (!top && !facesCam(fc, o)) return; const pp = P(fc.pts); if (!pp) return;
    parts.push(plan ? `<polygon points="${pts(pp)}" fill="${top ? PLUM.pale : i === 0 ? PLUM.light : VIOLET.shadow}" stroke="${PLUM.deep}" stroke-width="0.9" stroke-linejoin="round"/>` : `<polygon points="${pts(pp)}" fill="#000"/>`); });
  if (!plan || !facesCam(o.faces[0], o)) return parts.join('');
  const [k0, k1] = [o.foot[0], o.foot[1]], y0 = o.h - DIMS.h, ax = [(k1[0] - k0[0]) / DIMS.w, (k1[1] - k0[1]) / DIMS.w], n = [(o.foot[0][0] + o.foot[1][0]) / 2 - o.c[0], (o.foot[0][1] + o.foot[1][1]) / 2 - o.c[2]], nl = Math.hypot(...n), off = [n[0] / nl * 0.004, n[1] / nl * 0.004];
  const face = (a0, a1, b0, b1) => [[a0, b0], [a1, b0], [a1, b1], [a0, b1]].map(([a, b]) => [k0[0] + ax[0] * a + off[0], y0 + b, k0[1] + ax[1] * a + off[1]]);
  const m = (DIMS.w - DIMS.hatch.w) / 2, hatch = P(face(m, DIMS.w - m, DIMS.hatch.y0, DIMS.hatch.y1)), handle = P(face(DIMS.w / 2 - 0.045, DIMS.w / 2 + 0.045, DIMS.hatch.y0 + 0.008, DIMS.hatch.y0 + 0.03));
  if (hatch) parts.push(`<polygon points="${pts(hatch)}" fill="#EADBC8" stroke="${PLUM.deep}" stroke-width="1.2" stroke-linejoin="round"/>`); if (handle) parts.push(`<polygon points="${pts(handle)}" fill="${PLUM.deep}"/>`);
  for (const y of [DIMS.hatch.y0 - 0.035, DIMS.hatch.y0 - 0.06]) { const v = P(face(m + 0.012, DIMS.w - m - 0.012, y, y + 0.009)); if (v) parts.push(`<polygon points="${pts(v)}" fill="${VIOLET.deep}"/>`); }
  const lc = [k0[0] + ax[0] * DIMS.w / 2 + off[0], y0 + DIMS.light.y, k0[1] + ax[1] * DIMS.w / 2 + off[1]], la = at(lc), lr = (FP * DIMS.light.r) / depth(lc);
  parts.push(`<circle cx="${f1(la[0])}" cy="${f1(la[1])}" r="${f1(Math.max(1.5, lr))}" fill="${VIOLET.deep}" stroke="${PLUM.pale}" stroke-width="1"/>`);
  return parts.join(''); }
// a wall unit (ship-life's Room A kind): the bracket in the wall's own colour round the housing, the housing's sides and top, its
// front with the paper hatch and handle, two vent slots under it and the small light above it, unlit
function wallUnitSvg(o, plan) { const parts = [], [k0, k1] = [o.foot[0], o.foot[1]], W = WALL, ax = [(k1[0] - k0[0]) / W.w, (k1[1] - k0[1]) / W.w], back = [o.foot[3], o.foot[2]], bx = [(back[1][0] - back[0][0]) / W.w, (back[1][1] - back[0][1]) / W.w];
  const n = [(k0[0] + k1[0]) / 2 - o.c[0], (k0[1] + k1[1]) / 2 - o.c[2]], nl = Math.hypot(...n), off = [n[0] / nl * 0.004, n[1] / nl * 0.004];
  const bracket = P([[back[0][0] - bx[0] * W.bracket, W.y0 - W.bracket, back[0][1] - bx[1] * W.bracket], [back[1][0] + bx[0] * W.bracket, W.y0 - W.bracket, back[1][1] + bx[1] * W.bracket], [back[1][0] + bx[0] * W.bracket, W.y0 + W.h + W.bracket, back[1][1] + bx[1] * W.bracket], [back[0][0] - bx[0] * W.bracket, W.y0 + W.h + W.bracket, back[0][1] - bx[1] * W.bracket]]);
  if (bracket) parts.push(plan ? `<polygon points="${pts(bracket)}" fill="${VIOLET.shadow}" stroke="${PLUM.deep}" stroke-width="1" stroke-linejoin="round"/>` : `<polygon points="${pts(bracket)}" fill="#000"/>`);
  o.faces.forEach((fc, i) => { const top = i === 4; if (!top && !facesCam(fc, o)) return; const pp = P(fc.pts); if (!pp) return;
    parts.push(plan ? `<polygon points="${pts(pp)}" fill="${top ? PLUM.pale : i === 0 ? PLUM.light : VIOLET.shadow}" stroke="${PLUM.deep}" stroke-width="0.9" stroke-linejoin="round"/>` : `<polygon points="${pts(pp)}" fill="#000"/>`); });
  if (!plan || !facesCam(o.faces[0], o)) return parts.join('');
  const face = (a0, a1, y0, y1) => [[a0, y0], [a1, y0], [a1, y1], [a0, y1]].map(([a, y]) => [k0[0] + ax[0] * a + off[0], y, k0[1] + ax[1] * a + off[1]]);
  const m = (W.w - W.hatch.w) / 2, hatch = P(face(m, W.w - m, W.hatch.y0, W.hatch.y1)), handle = P(face(W.w / 2 - 0.04, W.w / 2 + 0.04, W.hatch.y0 + 0.008, W.hatch.y0 + 0.028));
  if (hatch) parts.push(`<polygon points="${pts(hatch)}" fill="#EADBC8" stroke="${PLUM.deep}" stroke-width="1.2" stroke-linejoin="round"/>`); if (handle) parts.push(`<polygon points="${pts(handle)}" fill="${PLUM.deep}"/>`);
  for (const y of [W.hatch.y0 - 0.04, W.hatch.y0 - 0.065]) { const v = P(face(m + 0.01, W.w - m - 0.01, y, y + 0.009)); if (v) parts.push(`<polygon points="${pts(v)}" fill="${VIOLET.deep}"/>`); }
  const lc = [k0[0] + ax[0] * W.w / 2 + off[0], W.light.y, k0[1] + ax[1] * W.w / 2 + off[1]], la = at(lc), lr = (FP * W.light.r) / depth(lc);
  parts.push(`<circle cx="${f1(la[0])}" cy="${f1(la[1])}" r="${f1(Math.max(1.5, lr))}" fill="${VIOLET.deep}" stroke="${PLUM.pale}" stroke-width="1"/>`);
  return parts.join(''); }
const facesCam = (fc, o) => { const [a, b, c] = fc.pts, u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], nn = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const out = (nn[0] * (a[0] - o.c[0]) + nn[1] * (a[1] - o.c[1]) + nn[2] * (a[2] - o.c[2])) > 0 ? 1 : -1; return out * (nn[0] * (C[0] - a[0]) + nn[1] * (C[1] - a[1]) + nn[2] * (C[2] - a[2])) > 0; };
// the ceiling's parts: seams, the warm ring of lights, the skylight's frame (warm-lit), its glass (black; azure in the map) and mullions
function ceiling(plan) {
  const poly = (q, fill, extra = '') => { const pp = P(q); return pp ? `<polygon points="${pts(pp)}" fill="${fill}"${extra}/>` : ''; };
  const annulus = ([outer, inner], fill) => { const a = P(outer), b = P(inner); return a && b ? `<path d="M${pts(a).replace(/ /g, ' L')} Z M${pts(b).replace(/ /g, ' L')} Z" fill="${fill}" fill-rule="evenodd"/>` : ''; };
  if (!plan) return [poly(CEILING.band, '#000'), poly(CEILING.glass, MAP.skylight), ...CEILING.mullions.map(m => poly(m, '#000'))].join('');
  return [...CEILING.seams.map(q => poly(q, VIOLET.shadow)), annulus(CEILING.seamRing, VIOLET.shadow), ...CEILING.lights.map(q => poly(q, WARM.cream)),
    poly(CEILING.band, PLUM.light), poly(CEILING.lit, PLUM.pale), poly(CEILING.glass, '#000'), ...CEILING.mullions.map(m => poly(m, PLUM.light, ` stroke="${PLUM.pale}" stroke-width="1.2" stroke-linejoin="round"`))].join('');
}
export const svgOf = (inner, defs, bg, extra = '', crisp = false) => `<svg xmlns="http://www.w3.org/2000/svg" width="${GW}" height="${GH}" viewBox="0 0 ${GW} ${GH}"${crisp ? ' shape-rendering="crispEdges"' : ''}><defs>${defs}</defs><rect width="${GW}" height="${GH}" fill="${bg}"/>${inner}${extra}</svg>`;
// a stage pixel to a painting pixel: the same straight-line camera, scaled about the horizon point
export const slice = ([W, H]) => { const SH = H - 99 - 92, fs = W / 2 / Math.tan(((STAGING.fov) / 2) * DEG), hys = SH / 2 - fs * Math.tan(5 * DEG), k = FP / fs;
  const toP = ([x, y]) => [GCX + (x - W / 2) * k, GHY + (y - hys) * k]; const [x0, y0] = toP([0, 0]), [x1, y1] = toP([W, SH]); return { W, H, SH, fs, hys, k, toP, rect: { x0, y0, x1, y1 } }; };
// the pieces each station makes in this view (E's microscope with its bench), far to near
export const pieces = () => { const out = []; for (const o of room.objects.filter(o => o.place !== VIEWER)) { if (o.name === 'microscope') { out.find(p => p.place === o.place && p.name === 'bench').objects.push(o); continue; } out.push({ place: o.place, name: o.name, unit: o.unit ?? null, kind: o.kind ?? null, objects: [o] }); }
  const ps = out.map(p => ({ ...p, dist: Math.min(...p.objects.map(o => depth(o.c))) }));
  // the capsule stands on its bench: it is drawn, and owns its overlap in the split map, just after the bench
  for (const p of ps.filter(p => p.name === 'food capsule' && p.objects[0].kind === 'counter')) { p.trueDist = p.dist; p.dist = ps.find(q => q.place === p.place && q.name === 'bench').dist - 0.001; }
  return ps.sort((a, b) => b.dist - a.dist); };
function annotations(outlines) {
  const s = { views: Object.fromEntries([[390, 844], [430, 932]].map(([W, H]) => [`${W}x${H}`, view8(VIEWER, OPTION, { W, H }).view])) }, lab = (x, y, t, col, size = 14, anchor = 'middle') => `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-family="-apple-system, system-ui, sans-serif" font-size="${size}" font-weight="700" fill="${col}" stroke="rgba(0,0,0,0.75)" stroke-width="3" paint-order="stroke">${t}</text>`;
  const out = [`<line x1="0" x2="${GW}" y1="${GHY}" y2="${GHY}" stroke="#F1B84B" stroke-width="1.5" stroke-dasharray="8 5"/>`, lab(GW - 8, GHY + 20, 'horizon y 714', '#F1B84B', 14, 'end')];
  for (let d = -35; d <= 35; d += 5) { const x = GCX + FP * Math.tan(d * DEG); out.push(`<line x1="${f1(x)}" x2="${f1(x)}" y1="${GHY - (d % 35 === 0 ? 12 : 6)}" y2="${GHY + (d % 35 === 0 ? 12 : 6)}" stroke="#F1B84B" stroke-width="1.5"/>`); }
  { const gp = P(CEILING.glass); if (gp) { const low = gp.reduce((m, p) => (p[1] > m[1] ? p : m), gp[0]); out.push(`<polygon points="${pts(gp)}" fill="none" stroke="#5FB8FF" stroke-width="2.5" stroke-dasharray="10 6"/>`, lab(Math.min(GW - 60, Math.max(60, low[0])), Math.min(GH - 8, low[1] + 22), 'skylight (glass)', '#5FB8FF', 14)); } }
  for (const l of LAMPS6) { const wallQ = room.quads.find(q => q.kind === 'wall' && wallName(q.n) === l.wall); if (!seen(wallQ) || depth(l.at) < 0.3) continue; const a = at(l.at); if (a[0] < 0 || a[0] > GW) continue; out.push(lab(a[0], a[1] - (FP * 0.22) / depth(l.at), `lamp ${l.id}`, '#FFC800', 12)); }
  out.push(outlines);
  for (const p of room.people.filter(p => p.place !== VIEWER)) { const fg = figureAt(cam, p, STAGING.farScale); if (!fg || fg.box[2] < 0 || fg.box[0] > GW) continue; const r = spriteRect(fg), xc = r.left + r.size / 2;
    out.push(`<image href="${standInPng(p)}" x="${f1(r.left)}" y="${f1(r.top)}" width="${f1(r.size)}" height="${f1(r.size)}" opacity="0.5"${r.flip ? ` transform="translate(${f1(2 * xc)} 0) scale(-1 1)"` : ''}/>`,
      `<ellipse cx="${f1(fg.anchor[0])}" cy="${f1(fg.anchor[1])}" rx="${f1(26 * fg.u)}" ry="${f1(7 * fg.u)}" fill="none" stroke="#00E5FF" stroke-width="2"/>`, lab(fg.anchor[0], fg.anchor[1] + 26, `${p.name} (${p.crew})`, '#9FF3FF', 13)); }
  for (const [[W, H], col, dash] of [[[390, 844], '#FF6FB5', '6 5'], [[430, 932], '#7CFC9A', '12 6']]) { const sl = slice([W, H]), r = sl.rect, lay = s.views[`${W}x${H}`].layout, box = b => { const a = sl.toP([b.x0, b.y0]), c = sl.toP([b.x1, b.y1]); return { x0: a[0], y0: a[1], x1: c[0], y1: c[1] }; };
    out.push(`<rect x="${f1(r.x0)}" y="${f1(r.y0)}" width="${f1(r.x1 - r.x0)}" height="${f1(r.y1 - r.y0)}" fill="none" stroke="${col}" stroke-width="2.5" stroke-dasharray="${dash}"/>`, lab(r.x0 + 8, W === 390 ? r.y0 + 18 : r.y1 - 8, `${W} × ${H}: 70° across, 5° down`, col, 13, 'start'));
    for (const q of lay.squares.map(box)) out.push(`<rect x="${f1(q.x0)}" y="${f1(q.y0)}" width="${f1(q.x1 - q.x0)}" height="${f1(q.y1 - q.y0)}" fill="none" stroke="${col}" stroke-width="1.6" stroke-dasharray="4 3"/>`);
    if (lay.chip) { const c = box(lay.chip); out.push(`<rect x="${f1(c.x0)}" y="${f1(c.y0)}" width="${f1(c.x1 - c.x0)}" height="${f1(c.y1 - c.y0)}" rx="${f1((c.y1 - c.y0) / 2)}" fill="rgba(12,15,22,0.6)" stroke="${col}" stroke-width="1.5"/>`); } }
  out.push(`<rect x="8" y="8" width="${GW - 16}" height="76" rx="6" fill="rgba(12,15,22,0.86)"/>`,
    `<text x="20" y="30" font-family="-apple-system, system-ui, sans-serif" font-size="14" font-weight="700" fill="#F4EBDD">PV6-${VIEWER} · from ${room.P(VIEWER).name}'s place (stand-in) · straight lines, 80° across · horizon y 714 · eye 1.6 m, level, upright</text>`,
    `<text x="20" y="52" font-family="-apple-system, system-ui, sans-serif" font-size="12.5" fill="#F4EBDD">Pink: the 390 × 844 slice · green: the 430 × 932 slice · both 70° across and 5° down (a lens shift), with their press areas and ${room.P(FULL[VIEWER].blind_place).name}'s chip</text>`,
    `<text x="20" y="72" font-family="-apple-system, system-ui, sans-serif" font-size="12.5" fill="#F4EBDD">Stand-ins: plain shapes in each person's pose, at their cheated spots; gold dashes: where the code places each piece, the food capsule included. No people or furniture in the picture.</text>`);
  return out.join('');
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const g = draw('plan'), e = draw('plan', { furniture: false }), m = draw('map'), em = draw('map', { furniture: false });
  writeFileSync(DIR + `pv6-${VIEWER}-guide.svg`, svgOf(g.body, g.defs, VIOLET.deep)); writeFileSync(DIR + `pv6-${VIEWER}-empty.svg`, svgOf(e.body, e.defs, VIOLET.deep));
  // version 4: where the food capsule is in the picture it is painted in its own step 3, so step 2's input shows the guide without it
  const capObj = room.objects.find(o => o.name === 'food capsule' && o.place !== VIEWER), capIn = !!capObj && capObj.faces.some(f => { const pp = P(f.pts); return !!pp && pp.some(([x, y]) => x >= 0 && x <= GW && y >= 0 && y <= GH); });
  // C's version 5 and E's version 3 (the Lead and the owner, 18 November): Juno's stool is painted in step 3 too, so step 2's input shows it neither
  const inPic = o => !!o && o.faces.some(f => { const pp = P(f.pts); return !!pp && pp.some(([x, y]) => x >= 0 && x <= GW && y >= 0 && y <= GH); });
  const stoolIn = inPic(room.objects.find(o => o.name === 'stool' && o.place !== VIEWER));
  if (capIn || stoolIn) { const g2 = draw('plan', { capsule: false, stool: false, strips: false }); writeFileSync(DIR + `pv6-${VIEWER}-guide-s2.svg`, svgOf(g2.body, g2.defs, VIOLET.deep)); }
  writeFileSync(DIR + `pv6-${VIEWER}-regions.svg`, svgOf(m.body, m.defs, '#000', '', true)); writeFileSync(DIR + `pv6-${VIEWER}-empty-regions.svg`, svgOf(em.body, em.defs, '#000', '', true));
  const ps = pieces(), shapes = ps.map(p => p.objects.flatMap(o => o.faces.map(f => P(f.pts)).filter(Boolean)));
  writeFileSync(DIR + `pv6-${VIEWER}-furniture.svg`, svgOf(shapes.flat().map(pp => `<polygon points="${pts(pp)}" fill="#FFF"/>`).join(''), '', '#000', '', true));
  writeFileSync(DIR + `pv6-${VIEWER}-stations.svg`, svgOf(shapes.map((ss, k) => ss.map(pp => `<polygon points="${pts(pp)}" fill="rgb(${20 * (k + 1)},${20 * (k + 1)},${20 * (k + 1)})"/>`).join('')).join(''), '', '#000', '', true));
  const outlines = shapes.flat().map(pp => `<polygon points="${pts(pp)}" fill="none" stroke="#FFD166" stroke-width="1.6" stroke-dasharray="5 4" stroke-linejoin="round"/>`).join('');
  writeFileSync(DIR + `pv6-${VIEWER}-empty-annotated.svg`, svgOf(e.body, e.defs, VIOLET.deep, annotations(outlines)));
  writeFileSync(DIR + `pieces8-${VIEWER}.json`, JSON.stringify(ps.map((p, k) => ({ grey: 20 * (k + 1), place: p.place, name: p.name, ...(p.unit ? { unit: p.unit, kind: p.kind } : {}), parts: p.objects.map(o => o.name), depthM: +(p.trueDist ?? p.dist).toFixed(2) })), null, 1));
  console.log('roles', JSON.stringify(ROLES), '| focal', FP.toFixed(1), '| pieces', ps.map(p => `${p.place} ${p.name} ${p.dist.toFixed(2)} m`).join(', '));
  for (const ph of [[390, 844], [430, 932]]) { const s = slice(ph); console.log(ph.join('x'), 'slice in the painting x', f1(s.rect.x0), '-', f1(s.rect.x1), 'y', f1(s.rect.y0), '-', f1(s.rect.y1), 'k', s.k.toFixed(4)); }
}
