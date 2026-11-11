//
// The Doctor's three panels (the approved pilot's back story, docs/design/cinematic/role-reveal.md on
// `claude/designer-role-films`): "The medic who kept the last two doses."
//   1 · memory · Colony Nine, the fever years. A prefab field ward at night: three cots full under
//       one hanging lamp swaying on its cord, a dust storm beating on the porthole, dust turning in
//       the lamp's cone. The player's own character stands at the foot of the nearest cot reading a
//       chart, then looks up. Narration: "Colony Nine. The fever years."
//   2 · memory · The last two doses. An open medicine case under a desk lamp: twelve slots, every one
//       empty but two, whose vials still glow and pulse. Spent vials lie tipped on the table, rain runs
//       down the window, a drop falls. DRIP. Narration: "Two doses left."
//   3 · aboard · The Mothership's Hospital at night. A patient (a silhouette: nobody) sits up in bed,
//       rimmed by one pulse of light as a green glow rises on the wall; the monitor's trace runs and
//       steadies; the Hospital panel's keypad lights the player's own number. BEEP.
// Drawn in the crew's ink, each panel a small set with its own light and life. Every other person is
// a faceless silhouette. Nothing here is an event of the match.

import { skeletonOf } from '../../scene-drawing/gestures.mjs';
import { blend } from '../../scene-drawing/motion.mjs';
import { inkCanvas } from '../../crew-drawing/ink.mjs';
import { litFigure } from '../kit/cast.mjs';
import { beam, blurFilter, dust, glow, halftone, inBeam, linear, pool, radial, rain } from '../kit/fx.mjs';
import { inkWord } from '../kit/letters.mjs';
import { ease, f, f3, lerp, noise, progress, rng } from '../kit/math.mjs';
import { INK, STEEL, gadgetOf, inked, markOf, nobody, poly, soundWord } from './common.mjs';

export const DOCTOR_CAPTIONS = Object.freeze([['Colony Nine.', 'The fever years.'], ['Two doses left.']]);

// ---------- the card's mark and the gadget ----------

/**
 * The Doctor's mark, on the role card on the desk in the opener (the owner, 8 November 2026: "In Dr
 * animation the card on table with Doctor text on it make it the medical cross"): a medical cross,
 * paper on a dark plate, as the board's Hospital draws its cross. No red: red is a team's colour, and
 * the red cross is a protected emblem. `face` is the card's face in px, `u` the opener's unit.
 */
export function doctorMark(D, face, u) {
  // A cross of five equal squares, its arms a third of its span.
  const s = Math.min(face.w, face.h) * 0.35, a = s / 3, cx = face.x + face.w / 2, cy = face.y + face.h / 2;
  const cross = [[-a, -s], [a, -s], [a, -a], [s, -a], [s, a], [a, a], [a, s], [-a, s], [-a, a], [-s, a], [-s, -a], [-a, -a]].map(([px, py]) => [cx + px, cy + py]);
  return markOf(D, 'dc-mark', face, u, { solid: [poly(cross)] });
}

/** The injector the role card's device draws, without the hand and without its team accent: its two vials catch the light. */
export function doctorGadget() {
  return gadgetOf('bf-gadget', { box: [40, 8, 90, 116], grip: [72, 92], glint: [87.5, 29] }, cv => {
    cv.form([[66, 56], [78, 56], [79, 114], [72, 118], [65, 114]], STEEL.grip, { weight: 2.6, depth: 3, seed: 81, tension: 0.4 });
    cv.form([[46, 44], [57, 44], [57, 53], [46, 53]], STEEL.dark, { weight: 2.2, depth: 2, seed: 82, tension: 0.3 });
    cv.form([[100, 42], [115, 46.5], [115, 51.5], [100, 56]], STEEL.dark, { weight: 2.2, depth: 2, seed: 83, tension: 0.2 });
    cv.line([[115, 49], [123, 49]], { weight: 2, color: INK, taper: 'end' });
    cv.form([[57, 38], [99, 38], [102, 42], [102, 56], [99, 60], [57, 60], [54, 56], [54, 42]], STEEL.body, { weight: 2.8, depth: 5, seed: 84, tension: 0.35 });
    cv.flat([[60, 41], [94, 41], [94, 44], [60, 44]], STEEL.shine, { opacity: 0.8, tension: 0.2 });
    for (const x of [60, 81]) {
      cv.form([[x, 19], [x + 13, 19], [x + 13, 40], [x, 40]], STEEL.glass, { weight: 2.4, depth: 2, seed: 85 + x, tension: 0.35, hatch: false });
      cv.flat([[x + 2.5, 27], [x + 10.5, 27], [x + 10.5, 38], [x + 2.5, 38]], STEEL.glassLit, { opacity: 0.95, tension: 0.4 });
      cv.line([[x + 3.6, 22], [x + 3.6, 34]], { weight: 1.6, color: '#FFFFFF', taper: 'both' });
      cv.form([[x + 2, 14.5], [x + 11, 14.5], [x + 11, 20.5], [x + 2, 20.5]], STEEL.deep, { weight: 1.8, depth: 1, seed: 87 + x, tension: 0.3 });
    }
    cv.form([[61, 49], [68, 42], [75, 49], [68, 56]], '#1C2333', { weight: 1.8, depth: 0, seed: 89, rim: false, hatch: false, grain: false, tension: 1 });
    cv.flat([[66, 44.5], [70, 44.5], [70, 47], [72.5, 47], [72.5, 51], [70, 51], [70, 53.5], [66, 53.5], [66, 51], [63.5, 51], [63.5, 47], [66, 47]], STEEL.lamp, { tension: 0 });
  });
}

// ---------- panel 1: Colony Nine, the fever years ----------

function cot(cv, [x, y], w, depth, breathe, seed) {
  // A camp cot seen from the side, its foot toward the front (left) and its head toward the back
  // (right): legs, canvas, a sheet over someone breathing, their head on the pillow.
  const h = w * 0.13;
  const legs = [[0.05, 0.07], [0.95, 0.93]];
  for (const [a, b] of legs) cv.line([[x + w * a, y + h], [x + w * b, y + h + w * 0.13]], { weight: 1.7 * depth, color: INK, taper: 'none' });
  cv.form([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], '#7C6A52', { weight: 2 * depth, depth: 2 * depth, seed, tension: 0.2 });
  const r = w * 0.1, chest = 1 + 0.09 * breathe;
  cv.form([[x + w * 0.03, y + 2], [x + w * 0.1, y - r * 0.55], [x + w * 0.3, y - r * 0.6], [x + w * 0.5, y - r * 0.95 * chest], [x + w * 0.66, y - r * 1.05 * chest], [x + w * 0.8, y - r * 0.8], [x + w * 0.86, y + 2]], '#D9CDB6', { weight: 2 * depth, depth: 3.5 * depth, seed: seed + 1, tension: 0.9 });
  cv.form([[x + w * 0.82, y - r * 0.15], [x + w * 0.99, y - r * 0.2], [x + w * 0.99, y + 2], [x + w * 0.82, y + 2]], '#EFE6D3', { weight: 1.6 * depth, depth: 1, seed: seed + 3, tension: 0.6, rim: false });
  cv.form([[x + w * 0.83, y - r * 0.4], [x + w * 0.87, y - r * 1.15], [x + w * 0.95, y - r * 1.2], [x + w * 0.98, y - r * 0.5], [x + w * 0.92, y - r * 0.1]], '#3B3127', { weight: 1.8 * depth, depth: 1.5 * depth, seed: seed + 2, tension: 0.9, rim: false });
}

function colonyWard(D, { w, h, local, character, reduced }) {
  const k = h / 252;
  const t = reduced ? 1300 : local;
  const cv = inkCanvas('dc1');
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'dc1-wall', [[0, '#2A2420'], [0.65, '#3A3029'], [1, '#1C1713']])}"/>`;
  // Corrugated prefab wall.
  for (let x = 0; x < w; x += 8 * k) back += `<path d="M${f(x)} ${f(h * 0.1)}V${f(h * 0.66)}" stroke="#14100C" stroke-width="${f(1.6 * k)}" opacity="0.8"/><path d="M${f(x + 2.4 * k)} ${f(h * 0.1)}V${f(h * 0.66)}" stroke="#6A5A48" stroke-width="${f(0.8 * k)}" opacity="0.55"/>`;
  back += `<rect y="0" width="${f(w)}" height="${f(h * 0.1)}" fill="#120E0B"/>`;
  back += `<path d="M0 ${f(h * 0.66)}H${f(w)}V${f(h)}H0Z" fill="${linear(D, 'dc1-floor', [[0, '#2E2620'], [1, '#100C09']])}"/>`;
  for (let i = -3; i < 9; i += 1) back += `<path d="M${f(w * 0.45 + i * 18 * k)} ${f(h * 0.66)}L${f(w * 0.45 + i * 60 * k)} ${f(h)}" stroke="#0B0806" stroke-width="${f(1 * k)}" opacity="0.6"/>`;
  // The porthole and the storm beating on it.
  const [px, py, pr] = [w * 0.86, h * 0.3, 27 * k];
  const storm = reduced ? '' : rain({ seed: 7, n: 46, t: t * 1.6, box: [px - pr, py - pr, pr * 2, pr * 2], len: 7 * k, speed: 0.55, slant: -1.6, color: '#CDB895', opacity: 0.55, width: 1.1 * k });
  D.use('dc1-porthole', `<clipPath id="dc1-porthole"><circle cx="${f(px)}" cy="${f(py)}" r="${f(pr)}"/></clipPath>`);
  back += `<circle cx="${f(px)}" cy="${f(py)}" r="${f(pr)}" fill="${radial(D, 'dc1-storm', [[0, '#8C7656'], [0.7, '#4C3E2C'], [1, '#2A2118']])}"/>`;
  back += `<g clip-path="url(#dc1-porthole)">${storm}<circle cx="${f(px + (reduced ? 0 : noise(t / 300, 3) * 6 * k))}" cy="${f(py)}" r="${f(pr * 0.9)}" fill="#B49A70" opacity="${f3(0.18 + 0.12 * noise(t / 180, 5))}" filter="${blurFilter(D, 'dc1-gust', 6 * k)}"/></g>`;
  back += `<circle cx="${f(px)}" cy="${f(py)}" r="${f(pr + 5 * k)}" fill="none" stroke="#4A3E33" stroke-width="${f(8 * k)}"/><circle cx="${f(px)}" cy="${f(py)}" r="${f(pr + 5 * k)}" fill="none" stroke="${INK}" stroke-width="${f(2.4 * k)}"/><circle cx="${f(px)}" cy="${f(py)}" r="${f(pr)}" fill="none" stroke="${INK}" stroke-width="${f(2 * k)}"/>`;
  for (let i = 0; i < 8; i += 1) { const a = (i / 8) * Math.PI * 2; back += `<circle cx="${f(px + Math.cos(a) * (pr + 5 * k))}" cy="${f(py + Math.sin(a) * (pr + 5 * k))}" r="${f(1.3 * k)}" fill="#1A140F"/>`; }
  // The lamp, swinging on its cord, and the cone it throws over the cots.
  const swing = reduced ? 0 : 5 * Math.sin(t / 520) * Math.PI / 180;
  const [lx0, ly0] = [w * 0.5, 0], len = h * 0.24;
  const lx = lx0 + Math.sin(swing) * len, ly = ly0 + Math.cos(swing) * len;
  const cone = { from: [lx, ly + 4 * k], to: [lx + Math.sin(swing) * h * 0.6 + w * 0.04, h * 0.86], w0: 22 * k, w1: w * 0.62 };
  let air = beam(D, 'dc1-cone', { ...cone, color: '#FFE2A8', opacity: 0.32, soft: 4 * k });
  air += pool(D, 'dc1-pool', { cx: cone.to[0], cy: h * 0.74, rx: w * 0.36, ry: h * 0.12, color: '#FFD58E', opacity: 0.45 });
  if (!reduced) air += dust({ seed: 12, n: 46, t, box: [0, ly, w, h * 0.9], size: [0.5 * k, 1.3 * k], color: '#FFF0CC', opacity: 0.9, lightAt: (x, y) => inBeam([x, y], cone) * 2 });
  // Three cots going back, each with someone under the sheet breathing.
  // Three cots in a row going back toward the porthole, each with someone under the sheet breathing.
  cot(cv, [w * 0.6, h * 0.53], w * 0.2, 0.55, reduced ? 0 : Math.sin(t / 420 + 2), 31);
  cot(cv, [w * 0.42, h * 0.62], w * 0.3, 0.75, reduced ? 0 : Math.sin(t / 470 + 1), 41);
  cot(cv, [w * 0.2, h * 0.76], w * 0.46, 1, reduced ? 0 : Math.sin(t / 510), 51);
  const lampShade = `<g transform="translate(${f(lx)} ${f(ly)}) rotate(${f3(-swing * 180 / Math.PI)})"><path d="M${f(-12 * k)} 0L${f(-5 * k)} ${f(-11 * k)}H${f(5 * k)}L${f(12 * k)} 0Z" fill="#3E342B" stroke="${INK}" stroke-width="${f(1.8 * k)}" stroke-linejoin="round"/><ellipse cx="0" cy="0" rx="${f(11 * k)}" ry="${f(2.6 * k)}" fill="#FFF0C8"/></g>`;
  const cord = `<path d="M${f(lx0)} 0L${f(lx)} ${f(ly - 11 * k)}" stroke="${INK}" stroke-width="${f(1.3 * k)}"/>`;
  // The player's character at the foot of the nearest cot: reading the chart, then looking up.
  const read = skeletonOf('tablet');
  const chart = { ...read, handF: { ...read.handF, item: 'clipboard', itemAt: [2, -14], itemAngle: -14 } };
  const up = { ...chart, view: 'front', head: [read.head[0] - 1, read.head[1] - 5], tilt: -3 };
  const look = reduced ? 1 : ease.inOutCubic(progress(t, 650, 1000));
  const sk = look <= 0 ? chart : look >= 1 ? up : { ...blend(chart, up, look), view: look > 0.5 ? 'front' : 'down', handF: chart.handF };
  const scale = (h * 0.86) / 233;
  const hero = litFigure(D, 'dc1-hero', {
    c: character, sk, at: [w * 0.13, h * 1.02], scale, t, reduced,
    ambient: { color: '#4A3A2A', strength: 0.55 },
    key: { at: [lx, ly + 10 * k], z: 70 * k, color: '#FFD9A0', gain: 1.6 },
    rim: { dx: 0.8, dy: -0.6, color: '#F2DDB4', width: 2.4 * k, gain: 0.8 },
  });
  return back + cord + air + inked(cv, w, h) + lampShade + glow(D, 'dc1-bulb', { cx: lx, cy: ly + 2 * k, r: 26 * k, color: '#FFE6B0', opacity: 0.9 }) + hero;
}

// ---------- panel 2: the last two doses ----------

function lastDoses(D, { w, h, local, reduced }) {
  const k = h / 252;
  const t = reduced ? 1300 : local;
  const cv = inkCanvas('dc2');
  // The window behind, rain running down it.
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="#1E1A16"/>`;
  const [wx, wy, ww, wh] = [w * 0.46, h * 0.04, w * 0.5, h * 0.42];
  back += `<rect x="${f(wx)}" y="${f(wy)}" width="${f(ww)}" height="${f(wh)}" fill="${linear(D, 'dc2-night', [[0, '#3A3631'], [1, '#1C1915']])}"/>`;
  D.use('dc2-glass', `<clipPath id="dc2-glass"><rect x="${f(wx)}" y="${f(wy)}" width="${f(ww)}" height="${f(wh)}"/></clipPath>`);
  if (!reduced) back += `<g clip-path="url(#dc2-glass)">${rain({ seed: 21, n: 60, t, box: [wx, wy, ww, wh], len: 12 * k, speed: 0.8, slant: 0.12, color: '#C8BBA6', opacity: 0.45, width: 0.9 * k })}</g>`;
  // Runnels on the glass.
  const r = rng(5);
  for (let i = 0; i < 7; i += 1) {
    const x0 = wx + r() * ww, sp = 0.04 + r() * 0.05, y = wy + ((r() * wh + (reduced ? 0 : t * sp)) % wh);
    back += `<path d="M${f(x0)} ${f(wy)}Q${f(x0 + 2 * k)} ${f((wy + y) / 2)} ${f(x0 + r() * 3 * k)} ${f(y)}" stroke="#DCD2C2" stroke-width="${f(0.8 * k)}" fill="none" opacity="0.35"/><circle cx="${f(x0 + 1.5 * k)}" cy="${f(y)}" r="${f(1.6 * k)}" fill="#E9E1D2" opacity="0.6"/>`;
  }
  back += `<rect x="${f(wx)}" y="${f(wy)}" width="${f(ww)}" height="${f(wh)}" fill="none" stroke="${INK}" stroke-width="${f(3 * k)}"/><path d="M${f(wx + ww / 2)} ${f(wy)}V${f(wy + wh)}M${f(wx)} ${f(wy + wh / 2)}H${f(wx + ww)}" stroke="${INK}" stroke-width="${f(2.2 * k)}"/>`;
  // The table.
  back += `<path d="M0 ${f(h * 0.5)}H${f(w)}V${f(h)}H0Z" fill="${linear(D, 'dc2-table', [[0, '#5B4A39'], [1, '#2C231A']])}"/><path d="M0 ${f(h * 0.5)}H${f(w)}" stroke="${INK}" stroke-width="${f(2.4 * k)}"/>`;
  back += `<rect y="${f(h * 0.5)}" width="${f(w)}" height="${f(h * 0.5)}" fill="${halftone(D, 'dc2-dots', { size: 4 * k, r: 0.8 * k, color: '#1A140E' })}" opacity="0.35"/>`;
  // The lamp at the left, its cone on the case.
  const lamp = [w * 0.15, h * 0.2];
  const cone = { from: [lamp[0] + 8 * k, lamp[1] + 6 * k], to: [w * 0.5, h * 0.8], w0: 20 * k, w1: w * 0.55 };
  let air = beam(D, 'dc2-cone', { ...cone, color: '#FFE2A8', opacity: 0.35, soft: 4 * k }) + pool(D, 'dc2-pool', { cx: w * 0.5, cy: h * 0.72, rx: w * 0.4, ry: h * 0.18, color: '#FFD58E', opacity: 0.5 });
  if (!reduced) air += dust({ seed: 22, n: 30, t, box: [0, 0, w, h], size: [0.5 * k, 1.2 * k], color: '#FFF0CC', opacity: 0.8, lightAt: (x, y) => inBeam([x, y], cone) * 2 });
  // The case: its lid up behind, the tray of twelve slots, two vials left.
  const [cx0, cy0, cw, ch] = [w * 0.28, h * 0.56, w * 0.46, h * 0.3];
  cv.form([[cx0 + 4 * k, cy0 - ch * 0.9], [cx0 + cw - 4 * k, cy0 - ch * 0.9], [cx0 + cw, cy0], [cx0, cy0]], '#8E8577', { weight: 2.4 * k, depth: 4 * k, seed: 61, tension: 0.15 });
  cv.form([[cx0 + cw * 0.44, cy0 - ch * 0.62], [cx0 + cw * 0.56, cy0 - ch * 0.62], [cx0 + cw * 0.56, cy0 - ch * 0.5], [cx0 + cw * 0.66, cy0 - ch * 0.5], [cx0 + cw * 0.66, cy0 - ch * 0.38], [cx0 + cw * 0.56, cy0 - ch * 0.38], [cx0 + cw * 0.56, cy0 - ch * 0.26], [cx0 + cw * 0.44, cy0 - ch * 0.26], [cx0 + cw * 0.44, cy0 - ch * 0.38], [cx0 + cw * 0.34, cy0 - ch * 0.38], [cx0 + cw * 0.34, cy0 - ch * 0.5], [cx0 + cw * 0.44, cy0 - ch * 0.5]], '#E9DEC8', { weight: 1.6 * k, depth: 0, seed: 62, tension: 0, rim: false, hatch: false });
  cv.form([[cx0, cy0], [cx0 + cw, cy0], [cx0 + cw + 6 * k, cy0 + ch], [cx0 - 6 * k, cy0 + ch]], '#6F675B', { weight: 2.6 * k, depth: 5 * k, seed: 63, tension: 0.15 });
  const slots = [];
  for (let row = 0; row < 3; row += 1) for (let col = 0; col < 4; col += 1) slots.push([cx0 + cw * (0.16 + col * 0.225) + (row - 1) * 2 * k, cy0 + ch * (0.24 + row * 0.27)]);
  const left = new Set([5, 6]);
  let wells = '', vials = '';
  slots.forEach(([sx, sy], i) => {
    wells += `<ellipse cx="${f(sx)}" cy="${f(sy)}" rx="${f(8.5 * k)}" ry="${f(4.5 * k)}" fill="#1A1611" stroke="${INK}" stroke-width="${f(1.4 * k)}"/>`;
    if (!left.has(i)) return;
    const pulse = reduced ? 0.8 : 0.65 + 0.35 * Math.sin(t / 260 + i);
    vials += glow(D, `dc2-vglow${i}`, { cx: sx, cy: sy - 12 * k, r: 24 * k, color: '#FFE9B8', opacity: 0.75 * pulse })
      + `<rect x="${f(sx - 5 * k)}" y="${f(sy - 26 * k)}" width="${f(10 * k)}" height="${f(26 * k)}" rx="${f(4 * k)}" fill="#F3E8D2" stroke="${INK}" stroke-width="${f(1.8 * k)}"/>`
      + `<rect x="${f(sx - 3.4 * k)}" y="${f(sy - 16 * k)}" width="${f(6.8 * k)}" height="${f(14 * k)}" rx="${f(3 * k)}" fill="#FFFBEF" opacity="${f3(0.7 + 0.3 * pulse)}"/>`
      + `<rect x="${f(sx - 5.5 * k)}" y="${f(sy - 30 * k)}" width="${f(11 * k)}" height="${f(6 * k)}" rx="${f(1.6 * k)}" fill="#3C342B" stroke="${INK}" stroke-width="${f(1.4 * k)}"/>`;
  });
  // Spent vials tipped on the table.
  let spent = '';
  for (const [sx, sy, a] of [[w * 0.12, h * 0.78, 70], [w * 0.2, h * 0.9, -20], [w * 0.82, h * 0.82, 100], [w * 0.9, h * 0.68, 40]]) {
    spent += `<g transform="translate(${f(sx)} ${f(sy)}) rotate(${a})"><ellipse cx="0" cy="${f(6 * k)}" rx="${f(12 * k)}" ry="${f(3 * k)}" fill="#000" opacity="0.4"/><rect x="${f(-4.5 * k)}" y="${f(-12 * k)}" width="${f(9 * k)}" height="${f(22 * k)}" rx="${f(3.5 * k)}" fill="#BDB2A0" stroke="${INK}" stroke-width="${f(1.6 * k)}"/><rect x="${f(-5 * k)}" y="${f(-15 * k)}" width="${f(10 * k)}" height="${f(5 * k)}" rx="${f(1.5 * k)}" fill="#3C342B" stroke="${INK}" stroke-width="${f(1.2 * k)}"/></g>`;
  }
  // The lamp's head.
  const lampHead = `<g transform="translate(${f(lamp[0])} ${f(lamp[1])}) rotate(-32)"><path d="M${f(-18 * k)} 0C${f(-16 * k)} ${f(-14 * k)} ${f(-6 * k)} ${f(-18 * k)} 0 ${f(-18 * k)}C${f(8 * k)} ${f(-18 * k)} ${f(16 * k)} ${f(-12 * k)} ${f(18 * k)} 0Z" fill="#4A4036" stroke="${INK}" stroke-width="${f(2 * k)}"/><ellipse cx="0" cy="0" rx="${f(17 * k)}" ry="${f(3.6 * k)}" fill="#FFF0C8"/></g><path d="M${f(lamp[0] - 10 * k)} ${f(lamp[1] - 10 * k)}Q${f(-6 * k)} ${f(h * 0.3)} ${f(w * 0.02)} ${f(h * 0.56)}" stroke="${INK}" stroke-width="${f(3.2 * k)}" fill="none"/>`;
  // DRIP: a drop falling from the sill.
  const dropT = reduced ? 1 : progress(t, 300, 780);
  const drop = dropT < 1 ? `<path d="M${f(w * 0.72)} ${f(h * 0.47 + dropT * h * 0.2)}m0 -${f(4 * k)}q${f(3 * k)} ${f(4 * k)} 0 ${f(7 * k)}q${f(-3 * k)} ${f(-3 * k)} 0 ${f(-7 * k)}" fill="#E6DCCB"/>` : '';
  const drip = soundWord(D, 'dc2-drip', 'DRIP', { x: w * 0.78, y: h * 0.6, size: 18 * k, k: reduced ? 1 : progress(t, 760, 980), rotate: 8 });
  return back + air + inked(cv, w, h) + wells + vials + spent + lampHead + glow(D, 'dc2-bulb', { cx: lamp[0] + 3 * k, cy: lamp[1] + 3 * k, r: 30 * k, color: '#FFE6B0', opacity: 0.9 }) + drop + drip;
}

// ---------- panel 3: the Mothership's Hospital ----------

function trace(w, h, phase, steady) {
  const pts = [];
  for (let i = 0; i <= 60; i += 1) {
    const x = (i / 60) * w;
    const u = ((i / 60) * 3 + phase) % 1;
    const beat = u < 0.08 ? Math.sin((u / 0.08) * Math.PI) * (u < 0.04 ? -0.25 : 1) : 0;
    const wobble = (1 - steady) * Math.sin(i * 1.7 + phase * 9) * 0.25;
    pts.push([x, h / 2 - (beat * 0.8 + wobble) * h * 0.42]);
  }
  return `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}`;
}

function hospital(D, { w, h, local, seat, reduced }) {
  const k = h / 252;
  const t = reduced ? 1300 : local;
  const cv = inkCanvas('dc3');
  const glowRise = reduced ? 1 : ease.outCubic(progress(t, 150, 900));
  // The ward's wall in the night's teal, its panels and a strip light.
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'dc3-wall', [[0, '#0C2A2A'], [0.7, '#123836'], [1, '#081C1D']])}"/>`;
  for (let x = w * 0.08; x < w; x += w * 0.21) back += `<path d="M${f(x)} ${f(h * 0.08)}V${f(h * 0.7)}" stroke="#05100F" stroke-width="${f(2 * k)}"/><path d="M${f(x + 2 * k)} ${f(h * 0.08)}V${f(h * 0.7)}" stroke="#2C5E5A" stroke-width="${f(0.9 * k)}" opacity="0.7"/>`;
  back += `<rect width="${f(w)}" height="${f(h * 0.08)}" fill="#061514"/><rect x="${f(w * 0.2)}" y="${f(h * 0.08)}" width="${f(w * 0.4)}" height="${f(4 * k)}" fill="#BFEFE3" opacity="0.5"/>`;
  back += `<path d="M0 ${f(h * 0.7)}H${f(w)}V${f(h)}H0Z" fill="${linear(D, 'dc3-floor', [[0, '#0F2F2D'], [1, '#051312']])}"/>`;
  // The green glow rising on the wall behind the bed.
  back += pool(D, 'dc3-glow', { cx: w * 0.34, cy: h * 0.42, rx: w * 0.34, ry: h * 0.38, color: '#7DF0B4', opacity: 0.5 * glowRise, core: 0.1 });
  // The monitor on the wall: its trace running, steadying.
  const [mx, my, mw, mh] = [w * 0.6, h * 0.16, w * 0.22, h * 0.2];
  const steady = reduced ? 1 : ease.inOutCubic(progress(t, 200, 1100));
  back += `<rect x="${f(mx - 3 * k)}" y="${f(my - 3 * k)}" width="${f(mw + 6 * k)}" height="${f(mh + 6 * k)}" rx="${f(3 * k)}" fill="#1B2B2C" stroke="${INK}" stroke-width="${f(2.4 * k)}"/>`;
  back += `<rect x="${f(mx)}" y="${f(my)}" width="${f(mw)}" height="${f(mh)}" fill="#04140F"/>`;
  back += `<g transform="translate(${f(mx)} ${f(my)})"><path d="${trace(mw, mh, reduced ? 0.3 : t / 900, steady)}" fill="none" stroke="#7DF0B4" stroke-width="${f(1.6 * k)}" stroke-linejoin="round"/></g>`;
  back += glow(D, 'dc3-screen', { cx: mx + mw / 2, cy: my + mh / 2, r: mw * 0.8, color: '#7DF0B4', opacity: 0.35 });
  // The Hospital panel's keypad: the player's own number lit on its readout and its key.
  const [kx, ky, kw, kh] = [w * 0.86, h * 0.16, w * 0.11, h * 0.36];
  const lit = reduced ? 1 : progress(t, 880, 960);
  back += `<rect x="${f(kx)}" y="${f(ky)}" width="${f(kw)}" height="${f(kh)}" rx="${f(3 * k)}" fill="#22302F" stroke="${INK}" stroke-width="${f(2 * k)}"/>`;
  back += `<rect x="${f(kx + kw * 0.12)}" y="${f(ky + kh * 0.06)}" width="${f(kw * 0.76)}" height="${f(kh * 0.16)}" fill="#04140F" stroke="${INK}" stroke-width="${f(1.2 * k)}"/>`;
  const keys = [];
  for (let row = 0; row < 4; row += 1) for (let col = 0; col < 3; col += 1) keys.push([kx + kw * (0.2 + col * 0.3), ky + kh * (0.36 + row * 0.16), row * 3 + col + 1]);
  for (const [qx, qy, n] of keys) {
    const mine = n === seat && lit > 0;
    back += `<rect x="${f(qx - kw * 0.11)}" y="${f(qy - kh * 0.055)}" width="${f(kw * 0.22)}" height="${f(kh * 0.11)}" rx="${f(1.5 * k)}" fill="${mine ? '#F7D37A' : '#3A4A48'}" stroke="${INK}" stroke-width="${f(1 * k)}"/>`;
  }
  if (lit > 0) {
    const digit = inkWord(D, 'dc3-digit', String(seat), { x: kx + kw / 2, y: ky + kh * 0.14, size: kh * 0.09, skew: 0, weight: 1.2, inkWeight: 0.2, depth: 0, shadow: 0, rough: false, hot: false, face: { top: '#F7D37A', mid: '#F7D37A', bottom: '#F7D37A', side: '#000', sideDeep: '#000', ink: '#04140F', highlight: '#FFF6D8' } });
    back += digit.svg + glow(D, 'dc3-key-glow', { cx: kx + kw / 2, cy: ky + kh * 0.14, r: kw * 0.7, color: '#F7D37A', opacity: 0.5 * lit });
  }
  // The bed seen from its foot, and the patient sitting up in it: a silhouette, nobody, rimmed by the light.
  const [bx0, bx1, byFar, byNear] = [w * 0.1, w * 0.5, h * 0.7, h * 0.94];
  cv.form([[bx0 + w * 0.02, h * 0.36], [bx1 - w * 0.02, h * 0.36], [bx1 - w * 0.02, byFar + 4 * k], [bx0 + w * 0.02, byFar + 4 * k]], '#3C5C58', { weight: 2.4 * k, depth: 3 * k, seed: 73, tension: 0.12 });
  cv.form([[bx0, byFar], [bx1, byFar], [bx1 + w * 0.05, byNear], [bx0 - w * 0.05, byNear]], '#BFD9D2', { weight: 2.4 * k, depth: 4 * k, seed: 71, tension: 0.15 });
  const up = reduced ? 1 : ease.inOutCubic(progress(t, 60, 700));
  const sitting = skeletonOf('bedSitting'), lying = skeletonOf('bedLying');
  const sk = up >= 1 ? sitting : blend(lying, sitting, up);
  const scale = (h * 0.9) / 233;
  const waist = h * 0.76;
  const patient = nobody(D, 'dc3-patient', { sk: { ...sk, view: 'front' }, at: [(bx0 + bx1) / 2, waist + (233 - 214) * scale], scale, t, reduced, color: '#0A1A1A', rim: { dx: -0.7, dy: -0.7, color: '#B6F5D4', width: 2.8 * k, gain: 0.6 + 0.4 * glowRise } });
  const ring = reduced ? 0 : progress(t, 200, 900);
  const pulse = ring > 0 && ring < 1 ? `<ellipse cx="${f((bx0 + bx1) / 2)}" cy="${f(h * 0.52)}" rx="${f(lerp(20, 120, ease.outCubic(ring)) * k)}" ry="${f(lerp(14, 80, ease.outCubic(ring)) * k)}" fill="none" stroke="#B6F5D4" stroke-width="${f(lerp(4, 0.5, ring) * k)}" opacity="${f3(1 - ring)}"/>` : '';
  const sheet = `<path d="M${f(bx0 - w * 0.03)} ${f(byNear - 2 * k)}L${f(bx0 + w * 0.01)} ${f(waist)}Q${f((bx0 + bx1) / 2)} ${f(waist - 8 * k)} ${f(bx1 - w * 0.01)} ${f(waist)}L${f(bx1 + w * 0.03)} ${f(byNear - 2 * k)}Z" fill="#DCEDE8" stroke="${INK}" stroke-width="${f(2 * k)}" stroke-linejoin="round"/>`
    + `<path d="M${f(bx0 + w * 0.08)} ${f(waist + 14 * k)}Q${f((bx0 + bx1) / 2)} ${f(waist + 24 * k)} ${f(bx1 - w * 0.06)} ${f(waist + 12 * k)}" stroke="#8FB7AD" stroke-width="${f(1.4 * k)}" fill="none"/>`;
  const beep = soundWord(D, 'dc3-beep', 'BEEP', { x: w * 0.73, y: h * 0.62, size: 20 * k, k: reduced ? 1 : progress(t, 900, 1100), rotate: -6, face: { top: '#E9FFF3', mid: '#9AF5C6', bottom: '#4CC98C', side: '#13452E', sideDeep: '#06200F', ink: INK, highlight: '#FFFFFF' } });
  return back + inked(cv, w, h) + patient + sheet + pulse + beep;
}

/** The Doctor's panels, as functions of each panel's size and local time. */
export function doctorPanels(D, { character, seat, reduced }) {
  return [
    ({ w, h, local }) => colonyWard(D, { w, h, local, character, reduced }),
    ({ w, h, local }) => lastDoses(D, { w, h, local, reduced }),
    ({ w, h, local }) => hospital(D, { w, h, local, seat, reduced }),
  ];
}

/** The Doctor's film: the card's mark, the gadget, the three panels and the narration. */
export const DOCTOR = Object.freeze({ mark: doctorMark, gadget: doctorGadget, panels: doctorPanels, captions: DOCTOR_CAPTIONS });
