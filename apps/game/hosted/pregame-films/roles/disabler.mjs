//
// The Disablers' film, the Blue Disabler's and the Red Disabler's alike, frame for frame, as their
// phones already share one Disable strip; only the title's name differs (the storyboard approved on
// 6 November 2026, docs/design/cinematic/role-reveal.md on `claude/designer-role-films`): "The
// breaker of machines, hired with one charge."
//   1 · memory · The engine decks of Ceres. Pipes, gauges and caged lamps. The player's own
//       character, back to us, pulls a breaker's lever down: CLUNK, sparks fly from the box, and the
//       deck's lamps go out one by one, leaving its emergency light. Narration: "The engine decks of
//       Ceres."
//   2 · memory · One charge. The stun rod in its open case beside a single glowing charge cell, and
//       an envelope of credits pushed across the table by a gloved hand. Narration: "One charge."
//   3 · aboard · A dark cabin. A silhouette stands by its bunk. The rod reaches in from the edge in a
//       gloved fist; its charge arcs once to the silhouette and the cabin's light dips. ZZT.
// The Disable is one hidden attack a match, public only as damage at the round's end: the panel
// aboard foreshadows it and shows no event. The arc is white and paper light, never a team colour.

import { skeletonOf } from '../../scene-drawing/gestures.mjs';
import { blend } from '../../scene-drawing/motion.mjs';
import { inkCanvas } from '../../crew-drawing/ink.mjs';
import { litFigure, onPage } from '../kit/cast.mjs';
import { beam, blurFilter, dust, glow, halftone, linear, pool, sparks } from '../kit/fx.mjs';
import { ease, f, f3, lerp, noise, progress, rng } from '../kit/math.mjs';
import { INK, STEEL, gadgetOf, inked, markOf, nobody, poly, soundWord } from './common.mjs';

export const DISABLER_CAPTIONS = Object.freeze([['The engine', 'decks of Ceres.'], ['One charge.']]);

// ---------- the card's mark and the gadget ----------

/** The Disablers' mark on the card on the desk: a lightning bolt, paper on the dark plate. */
export function disablerMark(D, face, u) {
  const s = Math.min(face.w, face.h) * 0.42, cx = face.x + face.w / 2, cy = face.y + face.h / 2;
  const bolt = [[0.22, -1], [-0.5, 0.12], [-0.04, 0.12], [-0.24, 1], [0.52, -0.2], [0.06, -0.2], [0.34, -1]].map(([x, y]) => [cx + x * s * 0.8, cy + y * s]);
  return markOf(D, 'ds-mark', face, u, { solid: [poly(bolt)] });
}

/** The stun rod the role card's device draws, without the hand or its team accent: a forked head on a shaft. */
export function disablerGadget() {
  return gadgetOf('bf-gadget-ds', { box: [40, 8, 90, 116], grip: [72, 92], glint: [83, 11] }, cv => {
    cv.form([[66, 70], [78, 70], [79, 114], [72, 118], [65, 114]], STEEL.grip, { weight: 2.6, depth: 3, seed: 101, tension: 0.4 });
    for (const y of [80, 90, 100]) cv.line([[65.5, y], [78.5, y + 2]], { weight: 1.4, color: '#1F2738', taper: 'none' });
    cv.form([[58, 62], [86, 62], [88, 70], [56, 70]], STEEL.dark, { weight: 2.4, depth: 2, seed: 102, tension: 0.2 });
    cv.form([[68, 30], [76, 30], [77, 62], [67, 62]], STEEL.body, { weight: 2.4, depth: 3, seed: 103, tension: 0.2 });
    cv.form([[62, 24], [82, 24], [84, 32], [60, 32]], STEEL.dark, { weight: 2.2, depth: 2, seed: 104, tension: 0.2 });
    for (const [x, seed] of [[61, 105], [79, 106]]) {
      cv.form([[x, 10], [x + 5, 10], [x + 5, 26], [x, 26]], STEEL.body, { weight: 2, depth: 2, seed, tension: 0.3 });
      cv.flat([[x + 1, 8], [x + 4, 8], [x + 4, 11], [x + 1, 11]], STEEL.lamp, { tension: 0.5 });
    }
    cv.flat([[69.5, 34], [71, 34], [71, 60], [69.5, 60]], STEEL.shine, { opacity: 0.8, tension: 0.1 });
  });
}

// ---------- panel 1: the engine decks of Ceres ----------

const LAMPS = [0.12, 0.38, 0.64, 0.9];
const OUT_AT = [620, 760, 900, 1040];

function engineDecks(D, { w, h, local, character, reduced }) {
  const k = h / 252;
  const t = reduced ? 1300 : local;
  const cv = inkCanvas('ds1');
  const pull = reduced ? 1 : ease.inOutCubic(progress(t, 240, 520));
  const on = LAMPS.map((_, i) => (reduced ? 0 : 1 - progress(t, OUT_AT[i], OUT_AT[i] + 90)));
  const lit = on.reduce((a, b) => a + b, 0) / LAMPS.length;
  // The deck: a bulkhead of pipes and gauges in the lamps' light, and the emergency light once they are out.
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'ds1-wall', [[0, '#2A241F'], [0.7, '#342C25'], [1, '#191410']])}"/>`;
  for (const [y, r] of [[h * 0.22, 7], [h * 0.3, 5], [h * 0.58, 9]]) back += `<rect x="0" y="${f(y - r * k)}" width="${f(w)}" height="${f(r * 2 * k)}" fill="#4A3F35" stroke="${INK}" stroke-width="${f(1.6 * k)}"/><rect x="0" y="${f(y - r * k * 0.6)}" width="${f(w)}" height="${f(r * 0.4 * k)}" fill="#7A6A58" opacity="0.6"/>`;
  for (const x of [w * 0.07, w * 0.83, w * 0.95]) back += `<rect x="${f(x - 6 * k)}" y="0" width="${f(12 * k)}" height="${f(h * 0.72)}" fill="#3F352C" stroke="${INK}" stroke-width="${f(1.6 * k)}"/>`;
  for (const [x, y] of [[w * 0.74, h * 0.42], [w * 0.88, h * 0.44], [w * 0.62, h * 0.4]]) {
    const needle = (reduced ? -40 : lerp(30, -60, progress(t, 600, 1100)) + noise(t / 120, x) * 6) * Math.PI / 180;
    back += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(11 * k)}" fill="#D9CCB2" stroke="${INK}" stroke-width="${f(2 * k)}"/><path d="M${f(x)} ${f(y)}L${f(x + Math.sin(needle) * 8 * k)} ${f(y - Math.cos(needle) * 8 * k)}" stroke="${INK}" stroke-width="${f(1.4 * k)}"/>`;
  }
  back += `<path d="M0 ${f(h * 0.72)}H${f(w)}V${f(h)}H0Z" fill="${linear(D, 'ds1-floor', [[0, '#2A231D'], [1, '#0F0C09']])}"/>`;
  for (let x = 0; x < w; x += 14 * k) back += `<path d="M${f(x)} ${f(h * 0.72)}L${f(x - 20 * k)} ${f(h)}" stroke="#0B0907" stroke-width="${f(1 * k)}" opacity="0.5"/>`;
  // The caged lamps along the deckhead, going out one by one.
  let air = '', lamps = '';
  LAMPS.forEach((lx, i) => {
    const x = w * lx, y = h * 0.06;
    if (on[i] > 0.01) {
      const cone = { from: [x, y + 6 * k], to: [x, h * 0.95], w0: 12 * k, w1: w * 0.3 };
      air += beam(D, `ds1-cone${i}`, { ...cone, color: '#FFE2A8', opacity: 0.22 * on[i], soft: 4 * k }) + pool(D, `ds1-pool${i}`, { cx: x, cy: h * 0.86, rx: w * 0.16, ry: h * 0.06, color: '#FFD58E', opacity: 0.4 * on[i] });
    }
    lamps += `<rect x="${f(x - 2 * k)}" y="0" width="${f(4 * k)}" height="${f(y - 4 * k)}" fill="#2A231D"/>`
      + `<circle cx="${f(x)}" cy="${f(y + 2 * k)}" r="${f(6 * k)}" fill="${on[i] > 0.5 ? '#FFF0C8' : '#5A4E40'}" stroke="${INK}" stroke-width="${f(1.4 * k)}"/>`
      + `<path d="M${f(x - 7 * k)} ${f(y + 2 * k)}A${f(7 * k)} ${f(7 * k)} 0 0 0 ${f(x + 7 * k)} ${f(y + 2 * k)}M${f(x)} ${f(y - 5 * k)}V${f(y + 9 * k)}M${f(x - 5 * k)} ${f(y - 3 * k)}L${f(x + 5 * k)} ${f(y + 7 * k)}" fill="none" stroke="${INK}" stroke-width="${f(1.2 * k)}"/>`
      + (on[i] > 0.01 ? glow(D, `ds1-bulb${i}`, { cx: x, cy: y + 2 * k, r: 22 * k, color: '#FFE6B0', opacity: 0.85 * on[i] }) : '');
  });
  if (!reduced) air += dust({ seed: 41, n: 40, t, box: [0, 0, w, h * 0.9], size: [0.5 * k, 1.2 * k], color: '#FFF0CC', opacity: 0.7 * lit, lightAt: (x) => (Math.min(...LAMPS.map((lx, i) => Math.abs(x - w * lx) / (w * 0.15) + (1 - on[i]) * 9)) < 1 ? 1.5 : 0.2) });
  // The emergency light left when the lamps are out: a slow amber pulse.
  const emergency = reduced ? 1 : progress(t, 1040, 1140) * (0.75 + 0.25 * Math.sin(t / 140));
  const [ex, ey] = [w * 0.52, h * 0.1];
  const dark = `<rect width="${f(w)}" height="${f(h)}" fill="#07050A" opacity="${f3(0.55 * (1 - lit))}"/>`;
  const emer = `<rect x="${f(ex - 9 * k)}" y="${f(ey - 4 * k)}" width="${f(18 * k)}" height="${f(8 * k)}" rx="${f(3 * k)}" fill="${emergency > 0.3 ? '#FFB347' : '#5A4630'}" stroke="${INK}" stroke-width="${f(1.4 * k)}"/>`
    + (emergency > 0 ? pool(D, 'ds1-emer', { cx: ex, cy: h * 0.5, rx: w * 0.55, ry: h * 0.6, color: '#FFA94D', opacity: 0.32 * emergency, core: 0.1 }) + glow(D, 'ds1-emer-g', { cx: ex, cy: ey, r: 30 * k, color: '#FFB347', opacity: 0.9 * emergency }) : '');
  // The breaker box on the bulkhead, and the character pulling its lever down, back to us.
  const scale = (h * 0.98) / 233;
  const at = [w * 0.36, h * 1.16];
  const base = skeletonOf('wallPanelBack');
  const top = { ...base, handN: { angle: 95, type: 'fist' } };
  const down = { ...top, eF: [14, 104], wF: [20, 96], handF: { angle: -95, type: 'fist' } };
  const sk = pull <= 0 ? top : pull >= 1 ? down : { ...blend(top, down, pull), handF: down.handF, handN: top.handN };
  // The box on the bulkhead to the left of the character; its lever sticks out of its right side to the hand.
  const hand = onPage(at, scale, sk.wF);
  const pivot = [onPage(at, scale, [22, 0])[0] - 22 * k, onPage(at, scale, [22, 79])[1]];
  const box = [pivot[0] - 44 * k, pivot[1] - 34 * k, 44 * k, 66 * k];
  cv.form([[box[0], box[1]], [box[0] + box[2], box[1]], [box[0] + box[2], box[1] + box[3]], [box[0], box[1] + box[3]]], '#59656B', { weight: 2.4 * k, depth: 4 * k, seed: 43, tension: 0.1 });
  const sparkAt = [box[0] + box[2] * 0.82, box[1] + 8 * k];
  const lever = `<path d="M${f(pivot[0])} ${f(pivot[1])}L${f(hand[0])} ${f(hand[1])}" stroke="${INK}" stroke-width="${f(6 * k)}" stroke-linecap="round"/><path d="M${f(pivot[0])} ${f(pivot[1])}L${f(hand[0])} ${f(hand[1])}" stroke="#9AA5AE" stroke-width="${f(3 * k)}" stroke-linecap="round"/><circle cx="${f(pivot[0])}" cy="${f(pivot[1])}" r="${f(4 * k)}" fill="#3A4448" stroke="${INK}" stroke-width="${f(1.4 * k)}"/>`;
  const hero = litFigure(D, 'ds1-hero', {
    c: character, sk, at, scale, t, reduced,
    ambient: { color: '#3E3226', strength: lerp(0.45, 0.6, lit) },
    key: { at: [w * 0.4, h * 0.1], z: 80 * k, color: lit > 0.3 ? '#FFD9A0' : '#FFB86A', gain: lerp(0.9, 1.6, lit) },
    rim: { dx: -0.7, dy: -0.7, color: '#F2DDB4', width: 2.6 * k, gain: 0.7 },
  });
  const fx = reduced ? '' : sparks({ seed: 47, n: 18, t, t0: 470, at: sparkAt, speed: [0.25, 0.75], angle: -Math.PI * 0.35, spread: Math.PI * 0.9, color: '#FFE3A0', width: 1.6 * k })
    + (t > 470 && t < 620 ? glow(D, 'ds1-flash', { cx: sparkAt[0], cy: sparkAt[1], r: 40 * k, color: '#FFF1C8', opacity: 1 - progress(t, 470, 620) }) : '');
  const clunk = soundWord(D, 'ds1-clunk', 'CLUNK', { x: w * 0.72, y: h * 0.74, size: 20 * k, k: reduced ? 1 : progress(t, 480, 700), rotate: -6 });
  return back + air + lamps + inked(cv, w, h) + lever + hero + dark + emer + fx + clunk;
}

// ---------- panel 2: one charge ----------

function oneCharge(D, { w, h, local, reduced }) {
  const k = h / 252;
  const t = reduced ? 1300 : local;
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'ds2-table', [[0, '#3E3329'], [0.5, '#554536'], [1, '#2A2119']])}"/>`;
  back += `<rect width="${f(w)}" height="${f(h)}" fill="${halftone(D, 'ds2-dots', { size: 4 * k, r: 0.8 * k, color: '#1A140E' })}" opacity="0.3"/>`;
  back += pool(D, 'ds2-pool', { cx: w * 0.58, cy: h * 0.5, rx: w * 0.5, ry: h * 0.6, color: '#FFD58E', opacity: 0.45, core: 0.25 });
  // The open case: its lid up behind, the rod in its foam, the one charge cell beside it.
  const [cx0, cy0, cw, ch] = [w * 0.36, h * 0.3, w * 0.5, h * 0.52];
  let kase = `<rect x="${f(cx0 + 8 * k)}" y="${f(cy0 + 10 * k)}" width="${f(cw)}" height="${f(ch)}" fill="#000" opacity="0.45" filter="${blurFilter(D, 'ds2-shadow', 4 * k)}"/>`
    + `<rect x="${f(cx0)}" y="${f(cy0)}" width="${f(cw)}" height="${f(ch)}" rx="${f(5 * k)}" fill="#3B3A38" stroke="${INK}" stroke-width="${f(2.4 * k)}"/>`
    + `<rect x="${f(cx0 + 6 * k)}" y="${f(cy0 + 6 * k)}" width="${f(cw - 12 * k)}" height="${f(ch - 12 * k)}" rx="${f(3 * k)}" fill="#1E1D1C"/>`
    + `<rect x="${f(cx0 + 6 * k)}" y="${f(cy0 + 6 * k)}" width="${f(cw - 12 * k)}" height="${f(ch - 12 * k)}" fill="${halftone(D, 'ds2-foam', { size: 3 * k, r: 0.9 * k, color: '#0E0D0C' })}" opacity="0.8"/>`;
  // The rod lying in its cut-out.
  const ry = cy0 + ch * 0.4, rx0 = cx0 + cw * 0.08, rx1 = cx0 + cw * 0.7;
  kase += `<rect x="${f(rx0)}" y="${f(ry - 5 * k)}" width="${f(rx1 - rx0)}" height="${f(10 * k)}" rx="${f(4 * k)}" fill="#0A0A09"/>`
    + `<rect x="${f(rx0 + 2 * k)}" y="${f(ry - 4 * k)}" width="${f((rx1 - rx0) * 0.38)}" height="${f(8 * k)}" rx="${f(3 * k)}" fill="#3A465E" stroke="${INK}" stroke-width="${f(1.4 * k)}"/>`
    + `<rect x="${f(rx0 + (rx1 - rx0) * 0.38)}" y="${f(ry - 2.6 * k)}" width="${f((rx1 - rx0) * 0.5)}" height="${f(5.2 * k)}" fill="#AEB9CB" stroke="${INK}" stroke-width="${f(1.4 * k)}"/>`
    + `<path d="M${f(rx1 - 6 * k)} ${f(ry - 2.6 * k)}h${f(10 * k)}v${f(-4 * k)}h${f(8 * k)}M${f(rx1 - 6 * k)} ${f(ry + 2.6 * k)}h${f(10 * k)}v${f(4 * k)}h${f(8 * k)}" fill="none" stroke="#AEB9CB" stroke-width="${f(2.6 * k)}"/>`;
  // The charge cell in its own slot, glowing.
  const pulse = reduced ? 0.85 : 0.7 + 0.3 * Math.sin(t / 240);
  const [qx, qy] = [cx0 + cw * 0.84, cy0 + ch * 0.66];
  kase += glow(D, 'ds2-cell-glow', { cx: qx, cy: qy, r: 34 * k, color: '#FFF1C8', opacity: 0.8 * pulse })
    + `<rect x="${f(qx - 9 * k)}" y="${f(qy - 18 * k)}" width="${f(18 * k)}" height="${f(36 * k)}" rx="${f(6 * k)}" fill="#E9E4D6" stroke="${INK}" stroke-width="${f(1.8 * k)}"/>`
    + `<rect x="${f(qx - 5.5 * k)}" y="${f(qy - 11 * k)}" width="${f(11 * k)}" height="${f(24 * k)}" rx="${f(4 * k)}" fill="#FFFBEF" opacity="${f3(0.6 + 0.4 * pulse)}"/>`
    + `<rect x="${f(qx - 7 * k)}" y="${f(qy - 22 * k)}" width="${f(14 * k)}" height="${f(5 * k)}" rx="${f(1.5 * k)}" fill="#3C342B" stroke="${INK}" stroke-width="${f(1.2 * k)}"/>`;
  // The envelope of credits, pushed in from the left under a gloved hand.
  const p = reduced ? 1 : ease.outCubic(progress(t, 150, 700));
  const ex = lerp(-w * 0.35, w * 0.17, p), ey = h * 0.62;
  const env = `<g transform="rotate(-6 ${f(ex)} ${f(ey)})">`
    + `<rect x="${f(ex - 46 * k + 5 * k)}" y="${f(ey - 26 * k + 7 * k)}" width="${f(92 * k)}" height="${f(52 * k)}" fill="#000" opacity="0.4"/>`
    + `<rect x="${f(ex - 46 * k)}" y="${f(ey - 26 * k)}" width="${f(92 * k)}" height="${f(52 * k)}" fill="#E3D6BA" stroke="${INK}" stroke-width="${f(1.8 * k)}"/>`
    + `<path d="M${f(ex - 46 * k)} ${f(ey - 26 * k)}L${f(ex)} ${f(ey + 4 * k)}L${f(ex + 46 * k)} ${f(ey - 26 * k)}" fill="none" stroke="${INK}" stroke-width="${f(1.4 * k)}"/>`
    + [0, 1, 2].map(i => `<rect x="${f(ex - 30 * k + i * 9 * k)}" y="${f(ey - 34 * k + i * 2 * k)}" width="${f(26 * k)}" height="${f(14 * k)}" rx="${f(2 * k)}" fill="#C9B78A" stroke="${INK}" stroke-width="${f(1.2 * k)}" transform="rotate(${-12 + i * 9} ${f(ex - 17 * k + i * 9 * k)} ${f(ey - 27 * k)})"/>`).join('')
    + `</g>`;
  const glove = `<g transform="translate(${f(ex - 52 * k)} ${f(ey + 2 * k)})">`
    + `<path d="M${f(-120 * k)} ${f(-6 * k)}L${f(-6 * k)} ${f(-16 * k)}L${f(-6 * k)} ${f(14 * k)}L${f(-120 * k)} ${f(18 * k)}Z" fill="#26201B" stroke="${INK}" stroke-width="${f(2 * k)}"/>`
    + `<path d="M${f(-8 * k)} ${f(-18 * k)}C${f(10 * k)} ${f(-24 * k)} ${f(34 * k)} ${f(-18 * k)} ${f(40 * k)} ${f(-6 * k)}C${f(44 * k)} ${f(4 * k)} ${f(30 * k)} ${f(16 * k)} ${f(-8 * k)} ${f(16 * k)}Z" fill="#3A302A" stroke="${INK}" stroke-width="${f(2 * k)}" stroke-linejoin="round"/>`
    + `<path d="M${f(8 * k)} ${f(-14 * k)}Q${f(22 * k)} ${f(-10 * k)} ${f(30 * k)} ${f(-2 * k)}" fill="none" stroke="#6B5B4E" stroke-width="${f(1.4 * k)}"/>`
    + `</g>`;
  return back + kase + env + glove;
}

// ---------- panel 3: a dark cabin ----------

function darkCabin(D, { w, h, local, reduced }) {
  const k = h / 252;
  const t = reduced ? 1300 : local;
  const arc = reduced ? 0 : progress(t, 420, 640);
  const dip = reduced ? 0.4 : arc > 0 && arc < 1 ? 0.35 + 0.25 * Math.abs(Math.sin(t / 25)) : progress(t, 640, 900) * 0.6;
  const light = reduced ? 0.6 : t < 420 ? 1 : 1 - (arc < 1 ? 0.7 : 0.4) + dip * 0.3;
  const cv = inkCanvas('ds3');
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'ds3-wall', [[0, '#121A2A'], [0.7, '#182134'], [1, '#0A0F1A']])}"/>`;
  for (let x = w * 0.1; x < w; x += w * 0.22) back += `<path d="M${f(x)} 0V${f(h * 0.76)}" stroke="#060A12" stroke-width="${f(2 * k)}"/><path d="M${f(x + 2 * k)} 0V${f(h * 0.76)}" stroke="#2A3650" stroke-width="${f(0.9 * k)}" opacity="0.7"/>`;
  back += `<path d="M0 ${f(h * 0.76)}H${f(w)}V${f(h)}H0Z" fill="${linear(D, 'ds3-floor', [[0, '#111827'], [1, '#04070D']])}"/>`;
  // The bunk on the right.
  cv.form([[w * 0.66, h * 0.52], [w * 1.02, h * 0.52], [w * 1.02, h * 0.66], [w * 0.66, h * 0.66]], '#3A4560', { weight: 2.2 * k, depth: 3 * k, seed: 61, tension: 0.1 });
  cv.form([[w * 0.68, h * 0.47], [w * 1.02, h * 0.47], [w * 1.02, h * 0.53], [w * 0.68, h * 0.53]], '#8C94A6', { weight: 2 * k, depth: 2 * k, seed: 62, tension: 0.4 });
  cv.form([[w * 0.66, h * 0.66], [w * 0.69, h * 0.66], [w * 0.69, h * 0.8], [w * 0.66, h * 0.8]], '#232B3D', { weight: 1.8 * k, depth: 1, seed: 63, tension: 0.1 });
  // The cabin's ceiling light, and its light dipping as the charge arcs.
  const lamp = [w * 0.55, h * 0.04];
  const cone = { from: [lamp[0], lamp[1] + 4 * k], to: [w * 0.55, h * 0.96], w0: 16 * k, w1: w * 0.5 };
  const air = beam(D, 'ds3-cone', { ...cone, color: '#E6ECF5', opacity: 0.16 * light, soft: 5 * k })
    + pool(D, 'ds3-pool', { cx: w * 0.55, cy: h * 0.86, rx: w * 0.3, ry: h * 0.08, color: '#DDE5F0', opacity: 0.35 * light });
  const lampSvg = `<rect x="${f(lamp[0] - 18 * k)}" y="${f(lamp[1] - 4 * k)}" width="${f(36 * k)}" height="${f(7 * k)}" rx="${f(2 * k)}" fill="${light > 0.6 ? '#F2F4F8' : '#7A8294'}" stroke="${INK}" stroke-width="${f(1.4 * k)}"/>`
    + glow(D, 'ds3-bulb', { cx: lamp[0], cy: lamp[1] + 2 * k, r: 30 * k, color: '#EEF2FA', opacity: 0.7 * light });
  // Nobody, standing by the bunk.
  const scale = (h * 0.9) / 233;
  const target = [w * 0.58, h * 1.0];
  const shape = nobody(D, 'ds3-nobody', { sk: skeletonOf('standFolded'), at: target, scale, t, reduced, color: '#0B1119', rim: { dx: -0.7, dy: -0.7, color: '#C9D4E6', width: 2.6 * k, gain: 0.5 + 0.5 * (arc > 0 && arc < 1 ? 1 : 0) } });
  // The rod reaching in from the left edge in a gloved fist.
  const reach = reduced ? 1 : ease.outCubic(progress(t, 60, 420));
  const tip = [lerp(-w * 0.1, w * 0.3, reach), h * 0.46];
  const fist = [tip[0] - 70 * k, tip[1] + 18 * k];
  const rod = `<path d="M${f(-w * 0.2)} ${f(fist[1] + 40 * k)}L${f(fist[0] - 14 * k)} ${f(fist[1] + 6 * k)}" stroke="${INK}" stroke-width="${f(26 * k)}" stroke-linecap="round"/><path d="M${f(-w * 0.2)} ${f(fist[1] + 40 * k)}L${f(fist[0] - 14 * k)} ${f(fist[1] + 6 * k)}" stroke="#1E2230" stroke-width="${f(22 * k)}" stroke-linecap="round"/>`
    + `<path d="M${f(fist[0])} ${f(fist[1])}L${f(tip[0] - 8 * k)} ${f(tip[1])}" stroke="${INK}" stroke-width="${f(8 * k)}" stroke-linecap="round"/><path d="M${f(fist[0])} ${f(fist[1])}L${f(tip[0] - 8 * k)} ${f(tip[1])}" stroke="#AEB9CB" stroke-width="${f(4.6 * k)}" stroke-linecap="round"/>`
    + `<path d="M${f(tip[0] - 10 * k)} ${f(tip[1] - 7 * k)}h${f(14 * k)}M${f(tip[0] - 10 * k)} ${f(tip[1] + 7 * k)}h${f(14 * k)}M${f(tip[0] - 10 * k)} ${f(tip[1] - 7 * k)}v${f(14 * k)}" fill="none" stroke="#AEB9CB" stroke-width="${f(3.2 * k)}" stroke-linecap="round"/>`
    + `<ellipse cx="${f(fist[0])}" cy="${f(fist[1])}" rx="${f(17 * k)}" ry="${f(14 * k)}" fill="#2A231E" stroke="${INK}" stroke-width="${f(2.2 * k)}"/><path d="M${f(fist[0] - 4 * k)} ${f(fist[1] - 12 * k)}v${f(24 * k)}M${f(fist[0] + 5 * k)} ${f(fist[1] - 11 * k)}v${f(22 * k)}" stroke="#4A3E35" stroke-width="${f(1.4 * k)}"/>`;
  // The charge: one arc of white light from the fork to the silhouette.
  let bolt = '';
  if (arc > 0 && arc < 1) {
    const end = onPage(target, scale, [58, 96]);
    const r = rng(Math.floor(t / 40));
    const n = 9, pts = [];
    for (let i = 0; i <= n; i += 1) {
      const s = i / n, x = lerp(tip[0] + 6 * k, end[0], s), y = lerp(tip[1], end[1], s);
      pts.push([x, y + (i === 0 || i === n ? 0 : (r() - 0.5) * 22 * k)]);
    }
    const d = `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}`;
    const k2 = Math.sin(arc * Math.PI);
    bolt = `<path d="${d}" fill="none" stroke="#F4F1E8" stroke-width="${f(7 * k)}" opacity="${f3(0.35 * k2)}" filter="${blurFilter(D, 'ds3-bolt-blur', 3 * k)}" stroke-linejoin="round"/>`
      + `<path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="${f(2.2 * k)}" opacity="${f3(k2)}" stroke-linejoin="round"/>`
      + glow(D, 'ds3-hit', { cx: end[0], cy: end[1], r: 46 * k, color: '#F4F1E8', opacity: 0.8 * k2 });
  }
  const dim = `<rect width="${f(w)}" height="${f(h)}" fill="#03050A" opacity="${f3(0.45 * (1 - light))}"/>`;
  const zzt = soundWord(D, 'ds3-zzt', 'ZZT', { x: w * 0.4, y: h * 0.2, size: 24 * k, k: reduced ? 1 : progress(t, 440, 620), rotate: -10, face: { top: '#FFFFFF', mid: '#EDEAE0', bottom: '#C9C3B4', side: '#4A4640', sideDeep: '#1E1C19', ink: INK, highlight: '#FFFFFF' } });
  return back + air + inked(cv, w, h) + lampSvg + shape + dim + rod + bolt + zzt;
}

/** The Disablers' panels, as functions of each panel's size and local time. */
export function disablerPanels(D, { character, reduced }) {
  return [
    ({ w, h, local }) => engineDecks(D, { w, h, local, character, reduced }),
    ({ w, h, local }) => oneCharge(D, { w, h, local, reduced }),
    ({ w, h, local }) => darkCabin(D, { w, h, local, reduced }),
  ];
}

/** The Disablers' film: the card's mark, the gadget, the three panels and the narration. */
export const DISABLER = Object.freeze({ mark: disablerMark, gadget: disablerGadget, panels: disablerPanels, captions: DISABLER_CAPTIONS });
