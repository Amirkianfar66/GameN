//
// The Insider's film (the storyboard approved on 6 November 2026, docs/design/cinematic/
// role-reveal.md on `claude/designer-role-films`): "The clerk who read the files nobody read."
//   1 · memory · Vesta Station's archive. Filing cabinets to the ceiling, a desk piled with reports
//       under one lamp, dust turning in its cone; the player's own character behind the desk reads a
//       report, then looks up. Narration: "Vesta Station. The archive."
//   2 · memory · Three files. Three folders slide across the desk one after another and land, each
//       with a faceless photograph clipped to it. THUD. Narration: "Three files. Three faces."
//   3 · aboard · The cork board. In the player's cabin at night, the player's character stands at a
//       cork board, a fist at the chin. Three faceless photographs are pinned up, and a string runs
//       from pin to pin between them.
// What the pictures show: three players, by their faces, never who: every photograph is faceless.
// The role card says what they hold. Nothing here is an event of the match.

import { skeletonOf } from '../../scene-drawing/gestures.mjs';
import { blend } from '../../scene-drawing/motion.mjs';
import { inkCanvas } from '../../crew-drawing/ink.mjs';
import { litFigure } from '../kit/cast.mjs';
import { beam, blurFilter, dust, glow, halftone, inBeam, linear, pool, puff } from '../kit/fx.mjs';
import { ease, f, f3, lerp, progress, rng } from '../kit/math.mjs';
import { INK, STEEL, circle, gadgetOf, inked, markOf, soundWord } from './common.mjs';

export const INSIDER_CAPTIONS = Object.freeze([['Vesta Station.', 'The archive.'], ['Three files.', 'Three faces.']]);

// ---------- the card's mark and the gadget ----------

/** The Insider's mark on the card on the desk: an open eye, paper on the dark plate. */
export function insiderMark(D, face, u) {
  const s = Math.min(face.w, face.h) * 0.4, cx = face.x + face.w / 2, cy = face.y + face.h / 2;
  const eye = `M${f(cx - s)} ${f(cy)}Q${f(cx)} ${f(cy - s * 0.98)} ${f(cx + s)} ${f(cy)}Q${f(cx)} ${f(cy + s * 0.98)} ${f(cx - s)} ${f(cy)}Z`;
  return markOf(D, 'in-mark', face, u, { solid: [eye], holes: [circle(cx, cy, s * 0.42)], over: [circle(cx - s * 0.15, cy - s * 0.15, s * 0.12)] });
}

const ring = (cx, cy, r, n = 12) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * Math.PI * 2), cy + r * Math.sin((i / n) * Math.PI * 2)]);

/** The dossier tablet the role card's device draws, without the hand or its team accent: three faceless faces on its screen. */
export function insiderGadget() {
  return gadgetOf('bf-gadget-in', { box: [40, 8, 90, 116], grip: [72, 92], glint: [100, 17] }, cv => {
    cv.form([[66, 66], [78, 66], [79, 114], [72, 118], [65, 114]], STEEL.grip, { weight: 2.6, depth: 3, seed: 91, tension: 0.4 });
    cv.form([[61, 62], [83, 62], [83, 70], [61, 70]], STEEL.dark, { weight: 2.2, depth: 2, seed: 92, tension: 0.3 });
    cv.form([[44, 12], [104, 12], [107, 16], [107, 62], [103, 66], [45, 66], [41, 62], [41, 16]], STEEL.body, { weight: 2.8, depth: 5, seed: 93, tension: 0.3 });
    cv.form([[48, 18], [100, 18], [100, 58], [48, 58]], '#1C2333', { weight: 2, depth: 0, seed: 94, rim: false, hatch: false, grain: false, tension: 0.15 });
    for (const x of [57, 74, 91]) {
      cv.flat([[x - 7, 24], [x + 7, 24], [x + 7, 44], [x - 7, 44]], '#3B4556', { tension: 0.1 });
      cv.flat(ring(x, 31, 3.6), '#C9D3C8', { tension: 1 });
      cv.flat([[x - 6, 44], [x - 5.5, 39.5], [x - 2, 36.6], [x + 2, 36.6], [x + 5.5, 39.5], [x + 6, 44]], '#C9D3C8', { tension: 0.8 });
    }
    cv.line([[50, 50], [98, 50]], { weight: 1.2, color: '#C9D3C8', taper: 'none' });
    cv.line([[50, 54], [84, 54]], { weight: 1.2, color: '#8E9B8F', taper: 'none' });
    cv.flat([[45, 14], [101, 14], [101, 16], [45, 16]], STEEL.shine, { opacity: 0.8, tension: 0.2 });
  });
}

// ---------- a faceless photograph ----------

/** A photograph of nobody: a head and shoulders in one dark tone on pale photo paper, at (x, y) its centre. */
function photo({ x, y, w, h, angle = 0, k, tone = '#2A241E', paper = '#E8DFCB' }) {
  const hw = w / 2, hh = h / 2;
  const head = circle(x, y - hh * 0.22, Math.min(w, h) * 0.17);
  const shoulders = `M${f(x - hw * 0.72)} ${f(y + hh * 0.86)}C${f(x - hw * 0.7)} ${f(y + hh * 0.26)} ${f(x - hw * 0.3)} ${f(y + hh * 0.12)} ${f(x)} ${f(y + hh * 0.12)}C${f(x + hw * 0.3)} ${f(y + hh * 0.12)} ${f(x + hw * 0.7)} ${f(y + hh * 0.26)} ${f(x + hw * 0.72)} ${f(y + hh * 0.86)}Z`;
  return `<g transform="rotate(${f3(angle)} ${f(x)} ${f(y)})">`
    + `<rect x="${f(x - hw)}" y="${f(y - hh)}" width="${f(w)}" height="${f(h)}" fill="${paper}" stroke="${INK}" stroke-width="${f(1.4 * k)}"/>`
    + `<rect x="${f(x - hw * 0.84)}" y="${f(y - hh * 0.86)}" width="${f(w * 0.84)}" height="${f(h * 0.86)}" fill="#8F8573"/>`
    + `<path d="${shoulders}" fill="${tone}"/><path d="${head}" fill="${tone}"/>`
    + `</g>`;
}

// ---------- panel 1: Vesta Station's archive ----------

function archive(D, { w, h, local, character, reduced }) {
  const k = h / 252;
  const t = reduced ? 1300 : local;
  const cv = inkCanvas('in1');
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'in1-wall', [[0, '#231D18'], [0.7, '#2E2620'], [1, '#16110D']])}"/>`;
  // Filing cabinets to the ceiling: columns of drawers, each with its handle and label.
  const colW = 44 * k, drawerH = 20 * k, top = h * 0.02, bottom = h * 0.66;
  const r = rng(11);
  for (let x = -8 * k, col = 0; x < w; x += colW, col += 1) {
    back += `<rect x="${f(x)}" y="${f(top)}" width="${f(colW)}" height="${f(bottom - top)}" fill="#3A3129" stroke="${INK}" stroke-width="${f(1.8 * k)}"/>`;
    for (let y = top + 3 * k, row = 0; y + drawerH < bottom; y += drawerH, row += 1) {
      const out = r() < 0.12 ? 3 * k : 0;
      back += `<rect x="${f(x + 3 * k - out * 0.3)}" y="${f(y + out * 0.2)}" width="${f(colW - 6 * k)}" height="${f(drawerH - 3 * k)}" fill="#4B3F34" stroke="${INK}" stroke-width="${f(1.2 * k)}"/>`
        + `<rect x="${f(x + colW / 2 - 7 * k)}" y="${f(y + 3.5 * k)}" width="${f(14 * k)}" height="${f(5 * k)}" fill="#CDBB98" opacity="0.75" stroke="${INK}" stroke-width="${f(0.8 * k)}"/>`
        + `<rect x="${f(x + colW / 2 - 5 * k)}" y="${f(y + 11 * k)}" width="${f(10 * k)}" height="${f(2.6 * k)}" rx="${f(1.2 * k)}" fill="#1A1410"/>`;
      if (out && row % 2 === 0) back += `<path d="M${f(x + 8 * k)} ${f(y + 1 * k)}l${f(4 * k)} ${f(-6 * k)}h${f(12 * k)}l${f(2 * k)} ${f(6 * k)}" fill="#E4D8BF" stroke="${INK}" stroke-width="${f(0.9 * k)}"/>`;
    }
  }
  // The dark falls off toward the top: the archive goes on past the light.
  back += `<rect width="${f(w)}" height="${f(h * 0.7)}" fill="${linear(D, 'in1-falloff', [[0, '#0E0B08', 0.85], [0.6, '#0E0B08', 0.25], [1, '#0E0B08', 0]])}"/>`;
  back += `<path d="M0 ${f(bottom)}H${f(w)}V${f(h)}H0Z" fill="#15100C"/>`;
  // The desk lamp at the left, its cone over the reports and the reader.
  const lamp = [w * 0.17, h * 0.5];
  const cone = { from: [lamp[0] + 10 * k, lamp[1] + 4 * k], to: [w * 0.46, h * 0.82], w0: 18 * k, w1: w * 0.5 };
  let air = beam(D, 'in1-cone', { ...cone, color: '#FFE2A8', opacity: 0.3, soft: 4 * k });
  air += pool(D, 'in1-pool', { cx: w * 0.42, cy: h * 0.62, rx: w * 0.36, ry: h * 0.3, color: '#FFD58E', opacity: 0.4 });
  if (!reduced) air += dust({ seed: 13, n: 40, t, box: [0, h * 0.2, w, h * 0.7], size: [0.5 * k, 1.3 * k], color: '#FFF0CC', opacity: 0.85, lightAt: (x, y) => inBeam([x, y], cone) * 2 });
  // The reader, behind the desk: reading a report, then looking up.
  const read = skeletonOf('tablet');
  const report = { ...read, handF: { ...read.handF, item: 'clipboard', itemAt: [2, -14], itemAngle: -14 } };
  const up = { ...report, view: 'front', head: [read.head[0] - 1, read.head[1] - 5], tilt: -3 };
  const look = reduced ? 1 : ease.inOutCubic(progress(t, 650, 1000));
  const sk = look <= 0 ? report : look >= 1 ? up : { ...blend(report, up, look), view: look > 0.5 ? 'front' : 'down', handF: report.handF };
  const scale = (h * 0.95) / 233;
  const hero = litFigure(D, 'in1-hero', {
    c: character, sk, at: [w * 0.55, h * 1.2], scale, t, reduced,
    ambient: { color: '#4A3A2A', strength: 0.55 },
    key: { at: lamp, z: 60 * k, color: '#FFD9A0', gain: 1.7 },
    rim: { dx: 0.75, dy: -0.65, color: '#F2DDB4', width: 2.4 * k, gain: 0.7 },
  });
  // The desk across the front, piled with reports.
  cv.form([[-10 * k, h * 0.74], [w + 10 * k, h * 0.74], [w + 10 * k, h + 10 * k], [-10 * k, h + 10 * k]], '#5B4A39', { weight: 2.6 * k, depth: 5 * k, seed: 17, tension: 0.1 });
  let piles = '';
  for (const [px, n, seed] of [[w * 0.09, 7, 1], [w * 0.27, 4, 2], [w * 0.8, 9, 3], [w * 0.93, 5, 4]]) {
    const rr = rng(40 + seed);
    for (let i = 0; i < n; i += 1) {
      const y = h * 0.74 - i * 3.4 * k, dx = (rr() - 0.5) * 6 * k, a = (rr() - 0.5) * 6;
      piles += `<rect x="${f(px - 24 * k + dx)}" y="${f(y - 4 * k)}" width="${f(48 * k)}" height="${f(4 * k)}" fill="${i % 3 ? '#E4D8BF' : '#D3C4A5'}" stroke="${INK}" stroke-width="${f(1 * k)}" transform="rotate(${f3(a)} ${f(px)} ${f(y)})"/>`;
    }
  }
  // The lamp: its arm and head, lit inside.
  const lampSvg = `<path d="M${f(lamp[0] - 22 * k)} ${f(h * 0.74)}L${f(lamp[0] - 14 * k)} ${f(lamp[1] + 6 * k)}" stroke="${INK}" stroke-width="${f(3 * k)}"/>`
    + `<ellipse cx="${f(lamp[0] - 22 * k)}" cy="${f(h * 0.745)}" rx="${f(12 * k)}" ry="${f(3 * k)}" fill="#2B231C" stroke="${INK}" stroke-width="${f(1.6 * k)}"/>`
    + `<g transform="translate(${f(lamp[0])} ${f(lamp[1])}) rotate(-28)"><path d="M${f(-18 * k)} 0C${f(-16 * k)} ${f(-13 * k)} ${f(-6 * k)} ${f(-17 * k)} 0 ${f(-17 * k)}C${f(8 * k)} ${f(-17 * k)} ${f(16 * k)} ${f(-11 * k)} ${f(18 * k)} 0Z" fill="#33463A" stroke="${INK}" stroke-width="${f(2 * k)}"/><ellipse cx="0" cy="0" rx="${f(17 * k)}" ry="${f(3.4 * k)}" fill="#FFF0C8"/></g>`;
  return back + air + hero + inked(cv, w, h) + piles + lampSvg + glow(D, 'in1-bulb', { cx: lamp[0] + 3 * k, cy: lamp[1] + 3 * k, r: 30 * k, color: '#FFE6B0', opacity: 0.9 });
}

// ---------- panel 2: three files ----------

function threeFiles(D, { w, h, local, reduced }) {
  const k = h / 252;
  const t = reduced ? 1300 : local;
  // The desk, seen from above at a slant, under the lamp's pool.
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'in2-desk', [[0, '#4A3A2C'], [0.5, '#5E4B39'], [1, '#2E241B']])}"/>`;
  for (let i = 0; i < 9; i += 1) back += `<path d="M${f(-20 * k)} ${f(h * (0.08 + i * 0.12))}Q${f(w * 0.5)} ${f(h * (0.06 + i * 0.12))} ${f(w + 20 * k)} ${f(h * (0.1 + i * 0.12))}" stroke="#2A2017" stroke-width="${f(1.2 * k)}" fill="none" opacity="0.5"/>`;
  back += `<rect width="${f(w)}" height="${f(h)}" fill="${halftone(D, 'in2-dots', { size: 4 * k, r: 0.8 * k, color: '#1A140E' })}" opacity="0.3"/>`;
  back += pool(D, 'in2-pool', { cx: w * 0.5, cy: h * 0.52, rx: w * 0.55, ry: h * 0.55, color: '#FFD58E', opacity: 0.45, core: 0.25 });
  // Three folders slide in from the right, one after another, and land.
  const lands = [[w * 0.2, h * 0.55, -7, 60], [w * 0.5, h * 0.5, 4, 300], [w * 0.8, h * 0.56, -3, 540]];
  let files = '', shadows = '', fx = '';
  lands.forEach(([x1, y1, a1, at], i) => {
    const p = reduced ? 1 : progress(t, at, at + 300);
    if (p <= 0) return;
    const e = ease.outBack(p, 1.2);
    const x = lerp(w + w * 0.3, x1, e), y = lerp(y1 - h * 0.08, y1, e), a = lerp(18, a1, ease.outCubic(p));
    const fw = w * 0.25, fh = h * 0.62;
    shadows += `<rect x="${f(x - fw / 2 + 5 * k)}" y="${f(y - fh / 2 + 7 * k)}" width="${f(fw)}" height="${f(fh)}" fill="#000" opacity="0.45" transform="rotate(${f3(a)} ${f(x)} ${f(y)})" filter="${blurFilter(D, 'in2-shadow', 3 * k)}"/>`;
    files += `<g transform="rotate(${f3(a)} ${f(x)} ${f(y)})">`
      + `<path d="M${f(x - fw / 2)} ${f(y - fh / 2)}h${f(fw * 0.36)}l${f(5 * k)} ${f(-8 * k)}h${f(fw * 0.3)}l${f(5 * k)} ${f(8 * k)}H${f(x + fw / 2)}V${f(y + fh / 2)}H${f(x - fw / 2)}Z" fill="#CDB48A" stroke="${INK}" stroke-width="${f(2 * k)}" stroke-linejoin="round"/>`
      + `<path d="M${f(x - fw / 2 + 4 * k)} ${f(y + fh / 2 - 6 * k)}H${f(x + fw / 2 - 4 * k)}" stroke="#A89069" stroke-width="${f(1.4 * k)}"/>`
      + `<rect x="${f(x - fw * 0.3)}" y="${f(y + fh * 0.18)}" width="${f(fw * 0.6)}" height="${f(3 * k)}" fill="#8E7754"/><rect x="${f(x - fw * 0.3)}" y="${f(y + fh * 0.26)}" width="${f(fw * 0.42)}" height="${f(3 * k)}" fill="#8E7754"/>`
      + photo({ x: x - fw * 0.06, y: y - fh * 0.12, w: fw * 0.56, h: fh * 0.42, angle: -4 + i * 3, k })
      + `<path d="M${f(x - fw * 0.06)} ${f(y - fh * 0.38)}v${f(14 * k)}a${f(3 * k)} ${f(3 * k)} 0 0 0 ${f(6 * k)} 0v${f(-16 * k)}a${f(4.2 * k)} ${f(4.2 * k)} 0 0 0 ${f(-8.4 * k)} 0v${f(18 * k)}" fill="none" stroke="#C9CED6" stroke-width="${f(1.6 * k)}"/>`
      + `</g>`;
    if (!reduced) fx += puff(D, `in2-puff${i}`, { t, t0: at + 300, at: [x1, y1 + h * 0.3], r: w * 0.12, ms: 420, color: '#E2D2B2', opacity: 0.35, seed: 7 + i });
  });
  const thud = soundWord(D, 'in2-thud', 'THUD', { x: w * 0.84, y: h * 0.17, size: 22 * k, k: reduced ? 1 : progress(t, 840, 1040), rotate: 7 });
  return back + shadows + files + fx + thud;
}

// ---------- panel 3: the cork board ----------

function corkBoard(D, { w, h, local, character, reduced }) {
  const k = h / 252;
  const t = reduced ? 1300 : local;
  // The cabin at night: steel panels, a porthole with stars.
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'in3-wall', [[0, '#141C2E'], [0.7, '#1A2338'], [1, '#0B111D']])}"/>`;
  for (let x = w * 0.04; x < w; x += w * 0.24) back += `<path d="M${f(x)} 0V${f(h * 0.74)}" stroke="#070B14" stroke-width="${f(2 * k)}"/><path d="M${f(x + 2 * k)} 0V${f(h * 0.74)}" stroke="#2B3854" stroke-width="${f(0.9 * k)}" opacity="0.7"/>`;
  back += `<path d="M0 ${f(h * 0.74)}H${f(w)}V${f(h)}H0Z" fill="${linear(D, 'in3-floor', [[0, '#121A2A'], [1, '#05080F']])}"/>`;
  const [px, py, pr] = [w * 0.86, h * 0.24, 22 * k];
  D.use('in3-port', `<clipPath id="in3-port"><circle cx="${f(px)}" cy="${f(py)}" r="${f(pr)}"/></clipPath>`);
  let stars = '';
  const rs = rng(31);
  for (let i = 0; i < 22; i += 1) stars += `<circle cx="${f(px - pr + rs() * pr * 2)}" cy="${f(py - pr + rs() * pr * 2)}" r="${f((0.4 + rs() * 0.8) * k)}" fill="#EEF2FF" opacity="${f3(0.5 + 0.5 * rs())}"/>`;
  back += `<circle cx="${f(px)}" cy="${f(py)}" r="${f(pr)}" fill="#050812"/><g clip-path="url(#in3-port)">${stars}</g>`
    + `<circle cx="${f(px)}" cy="${f(py)}" r="${f(pr + 4 * k)}" fill="none" stroke="#2B3549" stroke-width="${f(7 * k)}"/><circle cx="${f(px)}" cy="${f(py)}" r="${f(pr + 4 * k)}" fill="none" stroke="${INK}" stroke-width="${f(2.2 * k)}"/>`;
  // The cork board, lit by a small lamp over it.
  const [bx, by, bw, bh] = [w * 0.05, h * 0.1, w * 0.5, h * 0.54];
  back += `<rect x="${f(bx - 5 * k)}" y="${f(by - 5 * k)}" width="${f(bw + 10 * k)}" height="${f(bh + 10 * k)}" fill="#3E2E1F" stroke="${INK}" stroke-width="${f(2.2 * k)}"/>`
    + `<rect x="${f(bx)}" y="${f(by)}" width="${f(bw)}" height="${f(bh)}" fill="#6B5133" stroke="${INK}" stroke-width="${f(1.4 * k)}"/>`
    + `<rect x="${f(bx)}" y="${f(by)}" width="${f(bw)}" height="${f(bh)}" fill="${halftone(D, 'in3-cork', { size: 3.2 * k, r: 0.7 * k, color: '#3D2C1B', angle: 20 })}" opacity="0.6"/>`;
  const lampAt = [bx + bw / 2, h * 0.02];
  const cone = { from: [lampAt[0], lampAt[1] + 4 * k], to: [bx + bw / 2, by + bh], w0: 16 * k, w1: bw * 1.1 };
  let air = beam(D, 'in3-cone', { ...cone, color: '#FFE2A8', opacity: 0.22, soft: 5 * k })
    + pool(D, 'in3-pool', { cx: bx + bw / 2, cy: by + bh * 0.5, rx: bw * 0.62, ry: bh * 0.62, color: '#FFD58E', opacity: 0.45, core: 0.25 });
  if (!reduced) air += dust({ seed: 33, n: 26, t, box: [bx, 0, bw, h * 0.7], size: [0.5 * k, 1.2 * k], color: '#FFF0CC', opacity: 0.7, lightAt: (x, y) => inBeam([x, y], cone) * 2 });
  // Three faceless photographs, pinned, and a string from pin to pin.
  const pins = [[bx + bw * 0.2, by + bh * 0.2], [bx + bw * 0.74, by + bh * 0.16], [bx + bw * 0.46, by + bh * 0.62]];
  let photos = '';
  pins.forEach(([x, y], i) => { photos += photo({ x, y: y + 15 * k, w: 36 * k, h: 42 * k, angle: [-5, 4, -2][i], k }); });
  const legs = [[pins[0], pins[1], 180, 520], [pins[1], pins[2], 560, 900], [pins[2], pins[0], 940, 1240]];
  let string = '';
  for (const [[x0, y0], [x1, y1], a, b] of legs) {
    const p = reduced ? 1 : ease.inOutCubic(progress(t, a, b));
    if (p <= 0) continue;
    const sag = 7 * k;
    const mx = lerp(x0, x1, 0.5), my = lerp(y0, y1, 0.5) + sag;
    // Drawn out along the curve as far as p.
    const pt = s => [(1 - s) * (1 - s) * x0 + 2 * (1 - s) * s * mx + s * s * x1, (1 - s) * (1 - s) * y0 + 2 * (1 - s) * s * my + s * s * y1];
    const pts = Array.from({ length: 13 }, (_, j) => pt((j / 12) * p));
    string += `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}" fill="none" stroke="#EDE3CC" stroke-width="${f(1.5 * k)}" stroke-linecap="round"/>`;
  }
  const pinHeads = pins.map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(3.4 * k)}" fill="#E0B25A" stroke="${INK}" stroke-width="${f(1.2 * k)}"/><circle cx="${f(x - 1 * k)}" cy="${f(y - 1 * k)}" r="${f(1 * k)}" fill="#FFF3D0"/>`).join('');
  const lampSvg = `<path d="M${f(lampAt[0] - 16 * k)} ${f(lampAt[1] - 6 * k)}H${f(lampAt[0] + 16 * k)}L${f(lampAt[0] + 10 * k)} ${f(lampAt[1] + 5 * k)}H${f(lampAt[0] - 10 * k)}Z" fill="#2B3549" stroke="${INK}" stroke-width="${f(1.8 * k)}"/>`
    + glow(D, 'in3-bulb', { cx: lampAt[0], cy: lampAt[1] + 5 * k, r: 26 * k, color: '#FFE6B0', opacity: 0.8 });
  // The player's character at the board, a fist at the chin, looking at it.
  const scale = (h * 0.95) / 233;
  const hero = litFigure(D, 'in3-hero', {
    c: character, sk: skeletonOf('think'), at: [w * 0.75, h * 1.12], scale, t, reduced,
    ambient: { color: '#2E3A58', strength: 0.75 },
    key: { at: [bx + bw, by + bh * 0.3], z: 70 * k, color: '#FFD9A0', gain: 1.5 },
    rim: { dx: 0.7, dy: -0.7, color: '#DCE8FF', width: 2.6 * k, gain: 0.8 },
  });
  return back + air + photos + string + pinHeads + lampSvg + hero;
}

/** The Insider's panels, as functions of each panel's size and local time. */
export function insiderPanels(D, { character, reduced }) {
  return [
    ({ w, h, local }) => archive(D, { w, h, local, character, reduced }),
    ({ w, h, local }) => threeFiles(D, { w, h, local, reduced }),
    ({ w, h, local }) => corkBoard(D, { w, h, local, character, reduced }),
  ];
}

/** The Insider's film: the card's mark, the gadget, the three panels and the narration. */
export const INSIDER = Object.freeze({ mark: insiderMark, gadget: insiderGadget, panels: insiderPanels, captions: INSIDER_CAPTIONS });
