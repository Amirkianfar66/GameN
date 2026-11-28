// Two figures per view for sheets PV6-B to PV6-E, version 2: the room from above (pv6-<view>-plan.svg: walls, window, screen,
// lamps, the skylight's ring, every station and person where this view's staging puts them, the camera's 70° wedge, the capsule
// units with their hatches, the visitor's spot and every walk to it), and the walks in this view's picture (pv6-<view>-walks.svg:
// the furnished guide with each walk's feet line and the visitor's spot, as the painting's camera sees them). Generates nothing.
import { readFileSync, writeFileSync } from 'fs';
import { camera, DEG } from '../ring/ring4b.mjs';
import { EYE } from '../vis/vis5.mjs';
import { LAMPS, RING } from '../pv6/report6.mjs';
import { roomOf8, camAt8, LAYOUT, FULL } from './views8.mjs';
import { LAYOUTS, unitIn, visitorOf } from './units8.mjs';
const DIR = new URL('./', import.meta.url).pathname, VIS = JSON.parse(readFileSync(DIR + `visits-${LAYOUT}.json`, 'utf8'));
const COL = { A: '#E0B04F', B: '#7FC8FF', C: '#9BE38B', D: '#FF8C69', E: '#D49BFF' }, NAME = { A: 'Mira', B: 'Juno', C: 'Lyra', D: 'Atlas', E: 'Vega' };
const f1 = n => (+n).toFixed(1), FONT = 'font-family="-apple-system, system-ui, sans-serif"';
const lab = (x, y, t, col, size = 13, anchor = 'middle') => `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" ${FONT} font-size="${size}" font-weight="700" fill="${col}" stroke="rgba(0,0,0,0.8)" stroke-width="3" paint-order="stroke">${t}</text>`;
function plan(V) { const S = 1000, M = 60, k = (S - 2 * M) / 4, P = ([x, z]) => [M + (x + 2) * k, M + (2 - z) * k], room = roomOf8(V, 1), out = [], { C, yaw } = camAt8(V);
  const poly = (pts, fill, stroke = '#2A1446', extra = '') => `<polygon points="${pts.map(P).map(p => p.map(f1).join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="2"${extra}/>`;
  out.push(`<rect width="${S}" height="${S}" fill="#17131D"/>`, poly([[-2, -2], [2, -2], [2, 2], [-2, 2]], '#3A2450', '#DCB6EE'));
  for (let g = -1; g <= 1; g += 1) out.push(`<line x1="${f1(P([g, -2])[0])}" y1="${f1(P([g, -2])[1])}" x2="${f1(P([g, 2])[0])}" y2="${f1(P([g, 2])[1])}" stroke="#4B2079" stroke-width="1"/>`, `<line x1="${f1(P([-2, g])[0])}" y1="${f1(P([-2, g])[1])}" x2="${f1(P([2, g])[0])}" y2="${f1(P([2, g])[1])}" stroke="#4B2079" stroke-width="1"/>`);
  const c0 = P([0, 0]); out.push(`<circle cx="${f1(c0[0])}" cy="${f1(c0[1])}" r="${f1(1.45 * k)}" fill="none" stroke="#FCE3A0" stroke-width="1.5" stroke-dasharray="3 5"/>`, lab(c0[0], c0[1] - 1.45 * k - 8, 'skylight ring (above)', '#FCE3A0', 12));
  for (const [fe, name] of [[room.window, 'window'], [room.screen, 'screen']]) { const xs = fe.pts.map(p => [p[0], p[2]]); out.push(`<line x1="${f1(P(xs[0])[0])}" y1="${f1(P(xs[0])[1])}" x2="${f1(P(xs[1])[0])}" y2="${f1(P(xs[1])[1])}" stroke="#5FB8FF" stroke-width="7"/>`); const m = P([(xs[0][0] + xs[1][0]) / 2, (xs[0][1] + xs[1][1]) / 2]); out.push(lab(m[0] + (name === 'screen' ? 34 : 0), m[1] + (name === 'window' ? 22 : 4), name, '#5FB8FF', 12)); }
  for (const l of LAMPS) { const p = P([l.at[0], l.at[2]]); out.push(`<rect x="${f1(p[0] - 7)}" y="${f1(p[1] - 7)}" width="14" height="14" fill="#FCE3A0" stroke="#EC793C" stroke-width="2"/>`, lab(p[0], p[1] + (l.wall === 'north' ? 22 : l.wall === 'south' ? -12 : 4) + (l.wall === 'east' ? 0 : 0), l.id, '#FCE3A0', 11)); }
  // the camera's wedge
  const w = [-35, 35].map(d => [C[0] + 6 * Math.sin(yaw + d * DEG), C[2] + 6 * Math.cos(yaw + d * DEG)]); out.push(`<polygon points="${[P([C[0], C[2]]), P(w[0]), P(w[1])].map(p => p.map(f1).join(',')).join(' ')}" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.35)" stroke-width="1.5" stroke-dasharray="6 5" clip-path="url(#room)"/>`);
  // stations (the viewer's own drawn faint: never drawn in their own view)
  for (const o of room.objects) { const own = o.place === V, cap = o.name === 'food capsule', fill = cap ? '#EADBC8' : own ? 'rgba(122,60,173,0.35)' : '#7A3CAD';
    out.push(`<polygon points="${o.foot.map(([x, z]) => P([x, z])).map(p => p.map(f1).join(',')).join(' ')}" fill="${fill}" stroke="${cap ? '#EC793C' : '#DCB6EE'}" stroke-width="${cap ? 3 : 1.5}"${own ? ' stroke-dasharray="5 4"' : ''}/>`);
    if (!cap) { const c = P([o.c[0], o.c[2]]); if (o.name !== 'microscope') out.push(lab(c[0], c[1] + 4, `${NAME[o.place] ?? o.place}'s ${o.name}${own ? ' (own, not drawn)' : ''}`, '#F4EBDD', 11)); } }
  // the capsule units: hatch side, visitor spot
  for (const u of LAYOUTS[LAYOUT]) { const U = unitIn(room, u), s = visitorOf(U, V), f = [U.c[0] + U.n[0] * U.d / 2, U.c[1] + U.n[1] * U.d / 2], t = [U.n[1], -U.n[0]], a = P([f[0] - t[0] * 0.09, f[1] - t[1] * 0.09]), b = P([f[0] + t[0] * 0.09, f[1] + t[1] * 0.09]);
    out.push(`<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="#EC793C" stroke-width="6"/>`); const cp = P(U.c); out.push(lab(cp[0], cp[1] - 14, `capsule ${u.id}`, '#FFB37A', 13));
    const sp = P(s); out.push(`<circle cx="${f1(sp[0])}" cy="${f1(sp[1])}" r="9" fill="none" stroke="#FFFFFF" stroke-width="2.5"/>`, `<circle cx="${f1(sp[0])}" cy="${f1(sp[1])}" r="2.5" fill="#FFFFFF"/>`, lab(sp[0], sp[1] + 24, u.visitorIn?.[V] ? 'visitor, cheated here' : 'visitor', '#FFFFFF', 11));
    // a spot cheated in this view: the shared spot it moved from, dashed, with the move
    if (u.visitorIn?.[V]) { const s1 = visitorOf(U), q1 = P(s1); out.push(`<circle cx="${f1(q1[0])}" cy="${f1(q1[1])}" r="9" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="4 3" opacity="0.8"/>`, `<line x1="${f1(q1[0])}" y1="${f1(q1[1])}" x2="${f1(sp[0])}" y2="${f1(sp[1])}" stroke="#FFFFFF" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.8"/>`, lab(q1[0], q1[1] + 24, 'shared spot', '#D8D2E3', 11)); } }
  // walks
  for (const wk of VIS.views[V].walks) { if (!wk.points) continue; const pts = wk.points.map(P).map(p => p.map(f1).join(',')).join(' ');
    out.push(`<polyline points="${pts}" fill="none" stroke="${COL[wk.place]}" stroke-width="3" stroke-linejoin="round"${LAYOUTS[LAYOUT].length > 1 && !wk.nearer ? ' stroke-dasharray="8 6" opacity="0.6"' : ''}/>`); }
  // people at this view's spots, the viewer as the camera
  for (const p of room.people) { const q = P([p.x, p.z]); if (p.place === V) continue; out.push(`<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="13" fill="${COL[p.place]}" stroke="#10141C" stroke-width="2"/>`, `<line x1="${f1(q[0])}" y1="${f1(q[1])}" x2="${f1(q[0] + 24 * Math.sin(p.face))}" y2="${f1(q[1] - 24 * Math.cos(p.face))}" stroke="#10141C" stroke-width="3"/>`, lab(q[0], q[1] - 20, `${p.name}${p.place === FULL[V].blind_place ? ' (out of view)' : ''}`, COL[p.place], 14)); }
  const cq = P([C[0], C[2]]); out.push(`<circle cx="${f1(cq[0])}" cy="${f1(cq[1])}" r="10" fill="#FFFFFF" stroke="#10141C" stroke-width="2"/>`, lab(cq[0], cq[1] + 28, `camera: ${NAME[V]}'s place`, '#FFFFFF', 13));
  out.push(lab(M, 34, `PV6-${V} · Room B from above, as ${NAME[V]}'s view stages it · capsule layout ${LAYOUT} · walks to the visitor's spot`, '#F4EBDD', 15, 'start'), lab(S - M, S - 22, 'north up · 1 m squares', '#A9A1B8', 12, 'end'));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><defs><clipPath id="room"><rect x="${M}" y="${M}" width="${4 * k}" height="${4 * k}"/></clipPath></defs>${out.join('')}</svg>`; }
// the walks in this view's own picture: the painting's camera (80° across, 1024 x 1536, horizon y 714)
function walks(V) { const GW = 1024, GH = 1536, FP = GW / 2 / Math.tan(40 * DEG), { C, yaw } = camAt8(V), cam = camera({ C, yaw, f: FP, cx: 512, hy: 714, mode: 'rect' }), room = roomOf8(V, 1), out = [];
  const at = ([x, z], y = 0) => { const v = cam.view([x, y, z]); return v[2] > 0.15 ? cam.proj(v) : null; };
  for (const wk of VIS.views[V].walks) { if (!wk.points) continue; const fine = []; for (let i = 1; i < wk.points.length; i += 1) { const a = wk.points[i - 1], b = wk.points[i], n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.05)); for (let j = 0; j <= n; j += 1) fine.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); }
    const runs = []; let cur = []; for (const p of fine) { const q = at(p); if (q) cur.push(q); else if (cur.length) { runs.push(cur); cur = []; } } if (cur.length) runs.push(cur);
    for (const r of runs) out.push(`<polyline points="${r.map(q => q.map(f1).join(',')).join(' ')}" fill="none" stroke="${COL[wk.place]}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"${LAYOUTS[LAYOUT].length > 1 && !wk.nearer ? ' stroke-dasharray="12 9" opacity="0.6"' : ''}/>`);
    const s0 = at(wk.points[0]); if (s0) out.push(lab(s0[0], s0[1] + 26, wk.who, COL[wk.place], 16)); }
  for (const u of LAYOUTS[LAYOUT]) { const U = unitIn(room, u), s = visitorOf(U, V), q = at(s); if (q) out.push(`<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="12" fill="none" stroke="#FFFFFF" stroke-width="3"/>`, lab(q[0], q[1] + 32, `visitor at ${u.id}`, '#FFFFFF', 15)); }
  out.push(`<rect x="8" y="8" width="${GW - 16}" height="54" rx="6" fill="rgba(12,15,22,0.86)"/>`, lab(20, 32, `PV6-${V} · the walks to the capsule in ${NAME[V]}'s picture: each person's feet line, from their place to the visitor's spot`, '#F4EBDD', 14, 'start'), lab(20, 52, 'Drawn over the furnished guide; a line that leaves the picture leaves the view', '#A9A1B8', 12.5, 'start'));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${GW}" height="${GH}" viewBox="0 0 ${GW} ${GH}"><image href="pv6-${V}-guide.png" x="0" y="0" width="${GW}" height="${GH}"/>${out.join('')}</svg>`; }
for (const V of process.argv.slice(2)) { writeFileSync(DIR + `pv6-${V}-plan.svg`, plan(V)); writeFileSync(DIR + `pv6-${V}-walks.svg`, walks(V)); console.log(V, 'plan and walks written'); }
