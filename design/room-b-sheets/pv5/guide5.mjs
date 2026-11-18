// Sheet PV5: Room B's five per-place pictures, PV5-A to PV5-E, for the owner's choice (4 m room, 95° slice, the far two
// 10% bigger, camera 5° down). Geometry: the layout test's 4 m room (vis/vis5.mjs, as room-b-places.json gives it), plus the
// ceiling of Option A (the owner, recorded on #280 at f18bffcd): a round skylight onto space in the middle, its frame and
// mullions, a ring of 16 small lights and a few panel seams. Each guide is a cylindrical panorama 120° across on 1024 x 1536, level, the horizon
// 747 px from the top, the camera 1.6 m up at the place; painted as the colour plan in Room B's five values (the method of
// pv1-shared version 2); no people; the viewer's own workstation left out. Writes, per place: pv5-<X>-guide.svg (the input
// image), pv5-<X>-regions.svg (the colour check's map) and pv5-<X>-annotated.svg (for checking). Generates nothing.
import { writeFileSync } from 'fs';
import { camera, project } from '../ring/ring4b.mjs';
import { build, IDS, CAST, FULL, TOK, EYE, CEIL, DEG, phoneView, figureAt, spriteRect, inCone, FAR_M } from '../vis/vis5.mjs';
const DIR = new URL('./', import.meta.url).pathname;
export const GW = 1024, GH = 1536, ACROSS = 120, FP = GW / (ACROSS * DEG), GCX = 512, GHY = 747, SIZE = 4;
export const SLICE = { widthDeg: 95, pitchDeg: -5, farScale: 1.1, phones: [[390, 844], [430, 932]] };
export const MAP = { back: '#FF0000', left: '#00FF00', right: '#0000FF', deck: '#FFFF00', window: '#FF00FF', screen: '#00FFFF', display: '#FF8000', skylight: '#0080FF' };
const f1 = n => (+n).toFixed(1), FONT = 'font-family="-apple-system, system-ui, sans-serif"';
export const room = build(SIZE);
// Option A's ceiling (the Lead's brief of 18 November): a round skylight centred on the room's middle, glass radius 1.10 m; its
// frame from 1.10 to 1.20 m, a lit inner edge (pale) then a darker band (mid, as the window's frame); two mullions 0.07 m wide
// along X = 0 and Z = 0, making four panes; the rest of the ceiling solid (deep) with a few panel seams (eight radial, between
// the lights, and one ring at 1.70 m); a ring of 16 small lights (pale, 0.05 m radius) at r 1.45 m. Drawn just under the
// ceiling plane, in this order.
export const SKY = { glassR: 1.10, litTo: 1.135, frameR: 1.20, mullion: 0.07, lights: { n: 16, r: 1.45, size: 0.05 }, seams: { radial: 8, from: 1.20, ringR: 1.70, w: 0.025 } };
const YC = CEIL - 0.002, ring = (r, n = 144, cx = 0, cz = 0) => Array.from({ length: n }, (_, i) => { const a = (i / n) * 2 * Math.PI; return [cx + r * Math.cos(a), YC, cz + r * Math.sin(a)]; });
const strip = (a, b, w) => { const d = [b[0] - a[0], b[2] - a[2]], L = Math.hypot(...d), n = [(-d[1] / L) * (w / 2), (d[0] / L) * (w / 2)];
  return [[a[0] + n[0], YC, a[2] + n[1]], [b[0] + n[0], YC, b[2] + n[1]], [b[0] - n[0], YC, b[2] - n[1]], [a[0] - n[0], YC, a[2] - n[1]]]; };
const toWall = (deg, h) => { const c = Math.cos(deg * DEG), s2 = Math.sin(deg * DEG), t = h / Math.max(Math.abs(c), Math.abs(s2)); return [t * c, YC, t * s2]; };
export const CEILING = {
  seams: [...Array.from({ length: SKY.seams.radial }, (_, k) => { const deg = 11.25 + k * 45, a = [SKY.seams.from * Math.cos(deg * DEG), YC, SKY.seams.from * Math.sin(deg * DEG)]; return strip(a, toWall(deg, 2.0), SKY.seams.w); })],
  seamRing: [ring(SKY.seams.ringR + SKY.seams.w / 2), ring(SKY.seams.ringR - SKY.seams.w / 2)],
  lights: Array.from({ length: SKY.lights.n }, (_, k) => { const a = (k / SKY.lights.n) * 2 * Math.PI; return ring(SKY.lights.size, 24, SKY.lights.r * Math.cos(a), SKY.lights.r * Math.sin(a)); }),
  lightCentres: Array.from({ length: SKY.lights.n }, (_, k) => { const a = (k / SKY.lights.n) * 2 * Math.PI; return [SKY.lights.r * Math.cos(a), YC, SKY.lights.r * Math.sin(a)]; }),
  band: ring(SKY.frameR), lit: ring(SKY.litTo), glass: ring(SKY.glassR),
  mullions: [strip([0, YC, -(SKY.glassR + 0.02)], [0, YC, SKY.glassR + 0.02], SKY.mullion), strip([-(SKY.glassR + 0.02), YC, 0], [SKY.glassR + 0.02, YC, 0], SKY.mullion)],
};
export const camOf = id => { const P = room.P(id); return camera({ C: [P.x, EYE, P.z], yaw: P.camYaw, f: FP, cx: GCX, hy: GHY, mode: 'cyl' }); };
const seen = (cam, q) => { const p0 = q.pts[0], d = [cam.C[0] - p0[0], cam.C[1] - p0[1], cam.C[2] - p0[2]]; return d[0] * q.n[0] + d[1] * q.n[1] + d[2] * q.n[2] > 0; };
// an object's side face is drawn only if it faces the camera (the objects are convex: its outward normal is from the object's
// axis to the face's middle); tops are always below the eye, so always drawn
const facesCam = (cam, fc, o) => { const m = fc.pts.reduce((s, p) => [s[0] + p[0] / fc.pts.length, s[1] + p[1] / fc.pts.length, s[2] + p[2] / fc.pts.length], [0, 0, 0]);
  return (cam.C[0] - m[0]) * (m[0] - o.c[0]) + (cam.C[2] - m[2]) * (m[2] - o.c[2]) > 0; };
const wallName = n => (n[2] === -1 ? 'north' : n[2] === 1 ? 'south' : n[0] === -1 ? 'east' : 'west');
const pts = pp => pp.map(p => p.map(f1).join(',')).join(' ');
// which wall is ahead (its visible part spans straight ahead) and which lie to the left and right, for the colour check
export function wallRoles(id) {
  const cam = camOf(id), h = room.h, spans = {};
  for (let t = -h; t <= h + 1e-9; t += 0.02) for (const [n, p] of [['north', [t, 0, h]], ['south', [t, 0, -h]], ['east', [h, 0, t]], ['west', [-h, 0, t]]]) { const q = cam.view(p), a = Math.atan2(q[0], q[2]) / DEG; if (Math.abs(a) < ACROSS / 2 - 0.01) (spans[n] ??= []).push(a); }
  for (const [n, a] of Object.entries(spans)) if (Math.max(...a) - Math.min(...a) < 1) delete spans[n];   // a corner at the frame's edge is not a wall in view
  const roles = {}; for (const [n, a] of Object.entries(spans)) { const lo = Math.min(...a), hi = Math.max(...a); roles[n] = lo <= 0 && hi >= 0 ? 'back' : hi < 0 ? 'left' : 'right'; }
  return { roles, spans: Object.fromEntries(Object.entries(spans).map(([n, a]) => [n, [Math.round(Math.min(...a)), Math.round(Math.max(...a))]])) };
}
// ---- One place's drawing: paint 'plan' (the colour plan) or 'map' (the colour check's regions)
export function draw(id, mode, { furniture = true } = {}) {
  const cam = camOf(id), { roles } = wallRoles(id), out = [], defs = [], plan = mode === 'plan';
  const P = q => project(cam, q);
  const at = p => cam.proj(cam.view(p)), dist = p => cam.dist(cam.view(p));
  let n = 0; const clip = pp => { const cid = `c${id}${n++}`; defs.push(`<clipPath id="${cid}"><polygon points="${pts(pp)}"/></clipPath>`); return cid; };
  const glow = (cx, cy, rx, ry, color, o0, cid) => { const gid = `g${id}${n++}`; defs.push(`<radialGradient id="${gid}"><stop offset="0" stop-color="${color}" stop-opacity="${o0}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`);
    return `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="url(#${gid})" clip-path="url(#${cid})"/>`; };
  const quads = room.quads.filter(q => q.kind === 'floor' || q.kind === 'ceiling' || seen(cam, q));
  for (const q of quads) { const pp = P(q.pts); if (!pp) continue;
    if (q.kind === 'floor') { out.push(`<polygon points="${pts(pp)}" fill="${plan ? TOK.deep : MAP.deck}"/>`);
      if (plan) { const c = at([0, 0, 0]), d = dist([0, 0, 0]), rx = (FP * 1.9) / d; out.push(glow(c[0], c[1], rx, rx * Math.min(0.9, (1.6 / d) * 1.3), TOK.mid, 0.9, clip(pp)), glow(c[0], c[1], rx * 1.7, rx * 1.7 * Math.min(0.9, (1.6 / d) * 1.3), TOK.shadow, 0.85, clip(pp))); } }
    else if (q.kind === 'ceiling') { out.push(`<polygon points="${pts(pp)}" fill="${plan ? TOK.deep : '#000'}"/>`);
      if (plan) { const cid = clip(pp); for (const c of CEILING.lightCentres) { const a = at(c), r = (FP * 0.42) / dist(c); out.push(glow(a[0], a[1], r * 1.3, r * 0.8, TOK.shadow, 0.95, cid)); } }
      out.push(ceilingParts(P, plan)); }
    else if (q.kind === 'wall') { const role = roles[wallName(q.n)];
      if (!plan) { out.push(`<polygon points="${pts(pp)}" fill="${role ? MAP[role] : '#000'}"/>`); continue; }
      out.push(`<polygon points="${pts(pp)}" fill="${TOK.shadow}"/>`);
      // the lamps light the walls' upper middle: a mid glow at the visible part's middle, 1.9 m up
      const mid = q.pts[0].map((v, i) => (v + q.pts[2][i]) / 2); mid[1] = 1.9; const c = at(mid), d = dist(mid);
      if (Math.abs(Math.atan2(cam.view(mid)[0], cam.view(mid)[2])) < 75 * DEG) out.push(glow(c[0], c[1], (FP * 1.5) / d, (FP * 1.0) / d, TOK.mid, 0.95, clip(pp))); }
    else if (q.kind === 'seam') out.push(`<polygon points="${pts(pp)}" fill="${plan ? TOK.shadow : MAP.deck}"${plan ? ' fill-opacity="0.9"' : ''}/>`);
    else if (q.kind === 'frame') out.push(plan ? `<polygon points="${pts(pp)}" fill="${TOK.mid}" stroke="${TOK.light}" stroke-width="2" stroke-linejoin="round"/>` : `<polygon points="${pts(pp)}" fill="#000"/>`);
    else if (q.kind === 'window' || q.kind === 'screen') out.push(`<polygon points="${pts(pp)}" fill="${plan ? '#000' : MAP[q.kind]}"/>`); }
  // the other places' workstations, far to near; the viewer's own is left out
  const objs = room.objects.filter(o => furniture && o.place !== id).map(o => ({ o, z: o.name === 'microscope' ? dist(room.objects.find(b => b.place === o.place && b.name === 'bench').c) - 0.001 : dist(o.c) })).sort((a, b) => b.z - a.z);
  for (const { o } of objs) { const display = o.name === 'tablet console' || o.name === 'console', box = o.faces.length === 5;
    o.faces.forEach((fc, i) => { const top = box ? i === 4 : i === o.faces.length - 1; if (!top && !facesCam(cam, fc, o)) return; const pp = P(fc.pts); if (!pp) return;
      if (!plan) { out.push(`<polygon points="${pts(pp)}" fill="${top && display ? MAP.display : '#000'}"/>`); return; }
      const fill = top ? (display ? TOK.deep : TOK.light) : box ? (i === 0 ? (o.name === 'microscope' ? TOK.mid : TOK.shadow) : TOK.deep) : TOK.shadow;
      const stroke = top ? (display ? TOK.light : TOK.pale) : TOK.deep, w = top ? 1.6 : 0.9;
      out.push(`<polygon points="${pts(pp)}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round"/>`); }); }
  return { body: out.join(''), defs: defs.join('') };
}
// the ceiling's parts: seams, the lights, the skylight's frame, its glass (black; white in the map) and its mullions
function ceilingParts(P, plan) {
  const poly = (q, fill, extra = '') => { const pp = P(q); return pp ? `<polygon points="${pts(pp)}" fill="${fill}"${extra}/>` : ''; };
  const annulus = ([outer, inner], fill) => { const a = P(outer), b = P(inner); return a && b ? `<path d="M${pts(a).replace(/ /g, ' L')} Z M${pts(b).replace(/ /g, ' L')} Z" fill="${fill}" fill-rule="evenodd"/>` : ''; };
  if (!plan) return [poly(CEILING.band, '#000'), poly(CEILING.glass, MAP.skylight), ...CEILING.mullions.map(m => poly(m, '#000'))].join('');
  return [...CEILING.seams.map(q => poly(q, TOK.shadow)), annulus(CEILING.seamRing, TOK.shadow), ...CEILING.lights.map(q => poly(q, TOK.pale)),
    poly(CEILING.band, TOK.mid), poly(CEILING.lit, TOK.pale), poly(CEILING.glass, '#000'), ...CEILING.mullions.map(m => poly(m, TOK.mid, ` stroke="${TOK.light}" stroke-width="1.2" stroke-linejoin="round"`))].join('');
}
export const svgOf = (inner, defs, bg, extra = '', crisp = false) => `<svg xmlns="http://www.w3.org/2000/svg" width="${GW}" height="${GH}" viewBox="0 0 ${GW} ${GH}"${crisp ? ' shape-rendering="crispEdges"' : ''}><defs>${defs}</defs><rect width="${GW}" height="${GH}" fill="${bg}"/>${inner}${extra}</svg>`;
// ---- The phone slice, from a stage pixel to a guide pixel (the same cylinder, scaled and shifted)
export function slice([W, H]) {
  const SH = H - 99 - 92, fs = W / (SLICE.widthDeg * DEG), hys = SH / 2 + fs * Math.tan(SLICE.pitchDeg * DEG), k = FP / fs;
  const toGuide = ([x, y]) => [GCX + (x - W / 2) * k, GHY - (hys - y) * k];
  const [x0, y0] = toGuide([0, 0]), [x1, y1] = toGuide([W, SH]);
  return { W, H, SH, fs, hys, k, toGuide, rect: { x0, y0, x1, y1 }, paintingPxPerScreenPx: { at2x: +(k / 2).toFixed(3), at3x: +(k / 3).toFixed(3) } };
}
export function annotations(id) {
  const cam = camOf(id), out = [], lab = (x, y, t, col, size = 14, anchor = 'middle') => `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" ${FONT} font-size="${size}" font-weight="700" fill="${col}" stroke="rgba(0,0,0,0.75)" stroke-width="3" paint-order="stroke">${t}</text>`;
  out.push(`<line x1="0" x2="${GW}" y1="${GHY}" y2="${GHY}" stroke="#F1B84B" stroke-width="1.5" stroke-dasharray="8 5"/>`, lab(GW - 8, GHY + 20, 'horizon y 747', '#F1B84B', 14, 'end'));
  for (let d = -60; d <= 60; d += 15) { const x = GCX + FP * d * DEG; out.push(`<line x1="${f1(x)}" x2="${f1(x)}" y1="${GHY - (d % 30 === 0 ? 12 : 7)}" y2="${GHY + (d % 30 === 0 ? 12 : 7)}" stroke="#F1B84B" stroke-width="1.5"/>`); if (d % 30 === 0) out.push(lab(Math.min(GW - 26, Math.max(26, x)), GHY - 16, `${d > 0 ? '+' : ''}${d}°`, '#F1B84B', 13)); }
  // where each person will stand: the stand-ins at half strength, the far two at x1.10
  // where the skylight falls: its glass outlined, named under its lowest point
  { const gp = project(cam, CEILING.glass); if (gp) { const low = gp.reduce((m, p) => (p[1] > m[1] ? p : m), gp[0]);
    out.push(`<polygon points="${pts(gp)}" fill="none" stroke="#5FB8FF" stroke-width="2.5" stroke-dasharray="10 6"/>`, lab(Math.min(GW - 60, Math.max(60, low[0])), Math.min(GH - 8, low[1] + 22), 'skylight (glass)', '#5FB8FF', 14)); } }
  // only the three the slice shows (the 90° cone); the fourth, just off the right shoulder, is the out-of-view chip
  const others = room.people.filter(p => p.place !== id && inCone(id, p.place));
  for (const p of others) { const fg0 = figureAt(cam, p, 1); if (!fg0) continue; const s = fg0.z > FAR_M ? SLICE.farScale : 1, fg = figureAt(cam, p, s), r = spriteRect(fg), xc = r.left + r.size / 2;
    out.push(`<image href="${p.png}" x="${f1(r.left)}" y="${f1(r.top)}" width="${f1(r.size)}" height="${f1(r.size)}" opacity="0.5"${r.flip ? ` transform="translate(${f1(2 * xc)} 0) scale(-1 1)"` : ''}/>`,
      `<ellipse cx="${f1(fg.anchor[0])}" cy="${f1(fg.anchor[1])}" rx="${f1(26 * fg.u)}" ry="${f1(7 * fg.u)}" fill="none" stroke="#00E5FF" stroke-width="2"/>`,
      `<circle cx="${f1(fg.head[0])}" cy="${f1(fg.head[1] - 40 * fg.u)}" r="13" fill="#F4EBDD" stroke="#10141C" stroke-width="1.5"/><text x="${f1(fg.head[0])}" y="${f1(fg.head[1] - 40 * fg.u + 5)}" text-anchor="middle" ${FONT} font-size="14" font-weight="800" fill="#10141C">${p.num}</text>`,
      lab(fg.anchor[0], fg.anchor[1] + 26, `${p.name}${s !== 1 ? ' ×1.10' : ''}`, '#9FF3FF', 13)); }
  // both phones' 95° slices at 5° down, with their press areas and the out-of-view chip
  for (const [[W, H], col, dash] of [[SLICE.phones[0], '#FF6FB5', '6 5'], [SLICE.phones[1], '#7CFC9A', '12 6']]) { const sl = slice([W, H]), r = sl.rect;
    out.push(`<rect x="${f1(r.x0)}" y="${f1(r.y0)}" width="${f1(r.x1 - r.x0)}" height="${f1(r.y1 - r.y0)}" fill="none" stroke="${col}" stroke-width="2.5" stroke-dasharray="${dash}"/>`, lab(r.x0 + 8, W === 390 ? r.y0 + 22 : r.y1 - 10, `${W} × ${H}, 95°, 5° down`, col, 14, 'start'));
    const lay = phoneView(room, id, IDS, { W, H, fov: SLICE.widthDeg, pitch: SLICE.pitchDeg, farScale: SLICE.farScale }).layout, box = b => { const [a0, b0] = sl.toGuide([b.x0, b.y0]), [a1, b1] = sl.toGuide([b.x1, b.y1]); return { x0: a0, y0: b0, x1: a1, y1: b1 }; };
    for (const q of lay.squares.map(box)) out.push(`<rect x="${f1(q.x0)}" y="${f1(q.y0)}" width="${f1(q.x1 - q.x0)}" height="${f1(q.y1 - q.y0)}" fill="none" stroke="${col}" stroke-width="1.6" stroke-dasharray="4 3"/>`);
    if (lay.chip) { const c = box(lay.chip); out.push(`<rect x="${f1(c.x0)}" y="${f1(c.y0)}" width="${f1(c.x1 - c.x0)}" height="${f1(c.y1 - c.y0)}" rx="${f1((c.y1 - c.y0) / 2)}" fill="rgba(12,15,22,0.8)" stroke="${col}" stroke-width="1.6"/>`, lab(c.x0 + 10, c.y1 - (c.y1 - c.y0) / 2 + 5, `${lay.chip.num} ${lay.chip.name} · out of view`, '#F4EBDD', 13, 'start')); } }
  const v = room.P(id);
  out.push(`<rect x="8" y="8" width="${GW - 16}" height="76" rx="6" fill="rgba(12,15,22,0.86)"/>`,
    `<text x="20" y="30" ${FONT} font-size="14" font-weight="700" fill="#F4EBDD">PV5-${id} · from place ${id} (${v.name}'s, stand-in) · cylindrical, 120° across · horizon y 747 · eye 1.6 m, level</text>`,
    `<text x="20" y="52" ${FONT} font-size="12.5" fill="#F4EBDD">Pink: the 390 × 844 slice · green: the 430 × 932 slice · both 95° across and 5° down, with their press areas and the out-of-view chip.</text>`,
    `<text x="20" y="72" ${FONT} font-size="12.5" fill="#F4EBDD">Stand-ins at half strength mark where the code draws the crew (the far two ×1.10). The picture itself has no people.</text>`);
  return out.join('');
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  for (const id of IDS) {
    const g = draw(id, 'plan'), m = draw(id, 'map');
    writeFileSync(DIR + `pv5-${id}-guide.svg`, svgOf(g.body, g.defs, TOK.deep));
    writeFileSync(DIR + `pv5-${id}-regions.svg`, svgOf(m.body, m.defs, '#000', '', true));
    writeFileSync(DIR + `pv5-${id}-annotated.svg`, svgOf(g.body, g.defs, TOK.deep, annotations(id)));
    console.log(id, JSON.stringify(wallRoles(id)));
  }
  for (const ph of SLICE.phones) { const s = slice(ph); console.log(`${ph.join('x')}: slice in the guide x ${f1(s.rect.x0)}–${f1(s.rect.x1)}, y ${f1(s.rect.y0)}–${f1(s.rect.y1)}; ${f1(s.k)} painting px per stage px; per screen px ${JSON.stringify(s.paintingPxPerScreenPx)}`); }
}
