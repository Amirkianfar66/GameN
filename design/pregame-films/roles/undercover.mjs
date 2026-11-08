// mothership:dev-only
//
// The Undercover's film (the storyboard approved on 6 November 2026, docs/design/cinematic/
// role-reveal.md on `claude/designer-role-films`): "The agent with no name on any list."
//   1 · memory · Red Planet intelligence. A street at night in the dust rain; the player's own
//       character leans on a street lamp's post, the arms folded. In front, on a café table, an open
//       personnel file with a faceless photograph and no name, the rain dripping on it: DRIP.
//       Narration: "Red Planet intelligence."
//   2 · memory · Armed. Close on a shoulder: the holster's strap across the chest, and a pistol
//       sliding down into the holster, its grip left out. Narration: "No name. One gun."
//   3 · aboard · The shield. In a corridor aboard the player's character stands beside a
//       silhouette; a shield mark settles on its shoulder and a ring of light goes out from it once.
// The weapon shoots from Round 4, and protection is given once a player a match: the role card
// says so. The shield is paper and amber light, never a team colour, and the street is not red.

import { skeletonOf } from '../../board-motion/figures/gestures.mjs';
import { inkCanvas } from '../../crew-drawing/source/ink.mjs';
import { litFigure } from '../kit/cast.mjs';
import { beam, blurFilter, dust, glow, halftone, inBeam, linear, pool, rain } from '../kit/fx.mjs';
import { ease, f, f3, lerp, progress, rng } from '../kit/math.mjs';
import { INK, STEEL, circle, gadgetOf, inked, markOf, nobody, soundWord } from './common.mjs';

export const UNDERCOVER_CAPTIONS = Object.freeze([['Red Planet', 'intelligence.'], ['No name.', 'One gun.']]);

// ---------- the card's mark and the gadget ----------

/** The Undercover's mark on the card on the desk: a domino mask, paper on the dark plate. */
export function undercoverMark(D, face, u) {
  const s = Math.min(face.w, face.h) * 0.4, cx = face.x + face.w / 2, cy = face.y + face.h / 2 - s * 0.12;
  const p = (x, y) => `${f(cx + x * s)} ${f(cy + y * s)}`;
  // A full domino mask: a deep band over the eyes, dipping at the bridge and notched for the nose.
  const mask = `M${p(-1, -0.2)}C${p(-0.92, -0.72)} ${p(-0.36, -0.78)} ${p(0, -0.5)}C${p(0.36, -0.78)} ${p(0.92, -0.72)} ${p(1, -0.2)}`
    + `C${p(1.02, 0.42)} ${p(0.6, 0.66)} ${p(0.26, 0.46)}C${p(0.14, 0.38)} ${p(0.08, 0.2)} ${p(0, 0.2)}C${p(-0.08, 0.2)} ${p(-0.14, 0.38)} ${p(-0.26, 0.46)}C${p(-0.6, 0.66)} ${p(-1.02, 0.42)} ${p(-1, -0.2)}Z`;
  const eye = side => `M${p(side * 0.72, -0.12)}Q${p(side * 0.46, -0.36)} ${p(side * 0.18, -0.08)}Q${p(side * 0.46, 0.1)} ${p(side * 0.72, -0.12)}Z`;
  // Its ties, trailing from each end.
  const tie = side => `M${p(side * 0.96, -0.1)}C${p(side * 1.08, 0.2)} ${p(side * 1.0, 0.62)} ${p(side * 0.86, 0.98)}L${p(side * 0.98, 1.02)}C${p(side * 1.14, 0.66)} ${p(side * 1.2, 0.2)} ${p(side * 1.06, -0.16)}Z`;
  return markOf(D, 'uc-mark', face, u, { solid: [tie(-1), tie(1), mask], holes: [eye(-1), eye(1)] });
}

/** The signal beacon the role card's device draws, without the hand or its team accent: its lens catches the light. */
export function undercoverGadget() {
  return gadgetOf('bf-gadget-uc', { box: [40, 8, 90, 116], grip: [72, 92], glint: [76, 20] }, cv => {
    cv.form([[66, 70], [78, 70], [79, 114], [72, 118], [65, 114]], STEEL.grip, { weight: 2.6, depth: 3, seed: 161, tension: 0.4 });
    cv.form([[56, 34], [88, 34], [92, 40], [92, 66], [88, 72], [56, 72], [52, 66], [52, 40]], STEEL.body, { weight: 2.8, depth: 5, seed: 162, tension: 0.35 });
    for (const y of [44, 54, 62]) cv.line([[55, y], [89, y]], { weight: 1.2, color: STEEL.dark, taper: 'none' });
    cv.form([[60, 20], [84, 20], [86, 34], [58, 34]], STEEL.glass, { weight: 2.4, depth: 2, seed: 163, tension: 0.4, hatch: false });
    cv.flat([[63, 23], [81, 23], [82, 31], [62, 31]], STEEL.glassLit, { opacity: 0.95, tension: 0.4 });
    cv.form([[66, 14], [78, 14], [78, 20], [66, 20]], STEEL.deep, { weight: 1.8, depth: 1, seed: 164, tension: 0.3 });
    cv.line([[92, 44], [102, 30], [104, 18]], { weight: 1.8, color: INK, taper: 'end' });
    cv.flat([[57, 37], [87, 37], [87, 40], [57, 40]], STEEL.shine, { opacity: 0.75, tension: 0.2 });
  });
}

// ---------- panel 1: Red Planet intelligence ----------

function streetAtNight(D, { w, h, local, character, reduced }) {
  const k = h / 252;
  const t = reduced ? 1300 : local;
  const cv = inkCanvas('uc1');
  // The street: shut fronts across the way, wet stones, the dust rain.
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'uc1-night', [[0, '#1E1A17'], [0.6, '#2A241F'], [1, '#14100D']])}"/>`;
  const r = rng(81);
  for (let x = -10 * k; x < w; x += 54 * k) {
    const top = h * (0.06 + r() * 0.12);
    back += `<rect x="${f(x)}" y="${f(top)}" width="${f(52 * k)}" height="${f(h * 0.66 - top)}" fill="#2B2520" stroke="${INK}" stroke-width="${f(1.6 * k)}"/>`;
    for (let wy = top + 10 * k; wy < h * 0.5; wy += 20 * k) back += `<rect x="${f(x + 10 * k)}" y="${f(wy)}" width="${f(12 * k)}" height="${f(9 * k)}" fill="${r() < 0.3 ? '#C9A971' : '#16120F'}" opacity="${f3(0.8)}"/><rect x="${f(x + 30 * k)}" y="${f(wy)}" width="${f(12 * k)}" height="${f(9 * k)}" fill="${r() < 0.25 ? '#C9A971' : '#16120F'}" opacity="0.8"/>`;
  }
  back += `<path d="M0 ${f(h * 0.66)}H${f(w)}V${f(h)}H0Z" fill="${linear(D, 'uc1-street', [[0, '#2A231D'], [1, '#100C09']])}"/>`;
  for (let i = 0; i < 7; i += 1) back += `<path d="M0 ${f(h * (0.7 + i * 0.045))}H${f(w)}" stroke="#0B0907" stroke-width="${f(1 * k)}" opacity="0.5"/>`;
  // The street lamp on the right, its cone, and the reflection on the wet street.
  const [px, lampY] = [w * 0.84, h * 0.05];
  const cone = { from: [px - 18 * k, lampY + 6 * k], to: [w * 0.66, h * 0.92], w0: 16 * k, w1: w * 0.5 };
  let air = beam(D, 'uc1-cone', { ...cone, color: '#FFE2A8', opacity: 0.3, soft: 4 * k })
    + pool(D, 'uc1-pool', { cx: w * 0.66, cy: h * 0.84, rx: w * 0.3, ry: h * 0.07, color: '#FFD58E', opacity: 0.45 })
    + `<path d="M${f(w * 0.62)} ${f(h * 0.7)}L${f(w * 0.6)} ${f(h)}" stroke="#FFE2A8" stroke-width="${f(6 * k)}" opacity="0.12" filter="${blurFilter(D, 'uc1-reflect', 3 * k)}"/>`;
  if (!reduced) air += rain({ seed: 83, n: 70, t, box: [0, 0, w, h], len: 10 * k, speed: 0.7, slant: 0.35, color: '#D8C9AE', opacity: 0.4, width: 1 * k })
    + dust({ seed: 84, n: 30, t, box: [w * 0.4, 0, w * 0.6, h], size: [0.5 * k, 1.3 * k], color: '#FFF0CC', opacity: 0.7, lightAt: (x, y) => inBeam([x, y], cone) * 2 });
  const post = `<rect x="${f(px - 3 * k)}" y="${f(lampY)}" width="${f(6 * k)}" height="${f(h * 0.62)}" fill="#2B2520" stroke="${INK}" stroke-width="${f(1.8 * k)}"/>`
    + `<path d="M${f(px)} ${f(lampY)}Q${f(px)} ${f(lampY - 10 * k)} ${f(px - 14 * k)} ${f(lampY - 6 * k)}" fill="none" stroke="${INK}" stroke-width="${f(4 * k)}"/>`
    + `<path d="M${f(px - 30 * k)} ${f(lampY + 2 * k)}L${f(px - 24 * k)} ${f(lampY - 8 * k)}H${f(px - 6 * k)}L${f(px)} ${f(lampY + 2 * k)}Z" fill="#3E342B" stroke="${INK}" stroke-width="${f(1.8 * k)}"/><ellipse cx="${f(px - 15 * k)}" cy="${f(lampY + 2 * k)}" rx="${f(14 * k)}" ry="${f(3 * k)}" fill="#FFF0C8"/>`
    + glow(D, 'uc1-bulb', { cx: px - 15 * k, cy: lampY + 3 * k, r: 30 * k, color: '#FFE6B0', opacity: 0.9 });
  // The character leaning on the post, the arms folded.
  const scale = (h * 0.8) / 233;
  const hero = litFigure(D, 'uc1-hero', {
    c: character, sk: skeletonOf('wallLean'), at: [px - 26 * k, h * 0.96], scale, t, reduced,
    ambient: { color: '#3E3226', strength: 0.5 },
    key: { at: [px - 15 * k, lampY + 4 * k], z: 70 * k, color: '#FFD9A0', gain: 1.6 },
    rim: { dx: 0.7, dy: -0.7, color: '#F2DDB4', width: 2.4 * k, gain: 0.7 },
  });
  // The café table in front: the open file, its faceless photograph, no name, the rain on it.
  const [tx, ty] = [w * 0.24, h * 0.8];
  cv.form([[tx - 74 * k, ty], [tx + 74 * k, ty], [tx + 80 * k, ty + 10 * k], [tx - 80 * k, ty + 10 * k]], '#4A3D31', { weight: 2.2 * k, depth: 2 * k, seed: 85, tension: 0.1 });
  cv.line([[tx, ty + 10 * k], [tx, h + 4 * k]], { weight: 4 * k, color: '#1C1612', taper: 'none' });
  const file = `<path d="M${f(tx - 60 * k)} ${f(ty - 2 * k)}L${f(tx - 50 * k)} ${f(ty - 30 * k)}H${f(tx + 50 * k)}L${f(tx + 60 * k)} ${f(ty - 2 * k)}Z" fill="#CDB48A" stroke="${INK}" stroke-width="${f(1.8 * k)}" stroke-linejoin="round"/>`
    + `<path d="M${f(tx)} ${f(ty - 30 * k)}V${f(ty - 2 * k)}" stroke="#A89069" stroke-width="${f(1.4 * k)}"/>`
    + `<path d="M${f(tx - 44 * k)} ${f(ty - 26 * k)}h${f(30 * k)}v${f(20 * k)}h${f(-32 * k)}Z" fill="#8F8573" stroke="${INK}" stroke-width="${f(1 * k)}"/>`
    + `<path d="${circle(tx - 29 * k, ty - 20 * k, 4 * k)}" fill="#2A241E"/><path d="M${f(tx - 39 * k)} ${f(ty - 6 * k)}Q${f(tx - 29 * k)} ${f(ty - 18 * k)} ${f(tx - 19 * k)} ${f(ty - 6 * k)}Z" fill="#2A241E"/>`
    + [0, 1, 2].map(i => `<path d="M${f(tx + 8 * k)} ${f(ty - 22 * k + i * 6 * k)}h${f((34 - i * 6) * k)}" stroke="#8E7754" stroke-width="${f(1.8 * k)}"/>`).join('')
    + `<path d="M${f(tx + 8 * k)} ${f(ty - 28 * k)}h${f(30 * k)}" stroke="${INK}" stroke-width="${f(1.4 * k)}" stroke-dasharray="${f(2 * k)} ${f(2 * k)}" opacity="0.6"/>`;
  // DRIP: drops falling onto the file, a ring where each lands.
  let drops = '';
  if (!reduced) for (const [i, t0] of [140, 520, 900].entries()) {
    const p = progress(t, t0, t0 + 260), x = tx + (i - 1) * 22 * k + 6 * k;
    if (p > 0 && p < 1) drops += `<path d="M${f(x)} ${f(lerp(ty - 70 * k, ty - 14 * k, p * p))}m0 ${f(-4 * k)}q${f(3 * k)} ${f(4 * k)} 0 ${f(7 * k)}q${f(-3 * k)} ${f(-3 * k)} 0 ${f(-7 * k)}" fill="#E6DCCB"/>`;
    const q = progress(t, t0 + 260, t0 + 560);
    if (q > 0 && q < 1) drops += `<ellipse cx="${f(x)}" cy="${f(ty - 12 * k)}" rx="${f(lerp(2, 9, q) * k)}" ry="${f(lerp(1, 3, q) * k)}" fill="none" stroke="#E6DCCB" stroke-width="${f(1 * k)}" opacity="${f3(1 - q)}"/>`;
  }
  const drip = soundWord(D, 'uc1-drip', 'DRIP', { x: w * 0.13, y: h * 0.56, size: 17 * k, k: reduced ? 1 : progress(t, 400, 600), rotate: -8 });
  return back + air + post + hero + inked(cv, w, h) + file + drops + drip;
}

// ---------- panel 2: armed ----------

function armed(D, { w, h, local, reduced }) {
  const k = h / 252;
  const t = reduced ? 1300 : local;
  // Close on a shoulder in a dark coat, a key light from the left.
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'uc2-dark', [[0, '#1A1613'], [1, '#0E0B09']])}"/>`;
  back += pool(D, 'uc2-key', { cx: w * 0.32, cy: h * 0.4, rx: w * 0.5, ry: h * 0.6, color: '#FFD58E', opacity: 0.3, core: 0.2 });
  const coat = `<path d="M${f(w * 0.08)} ${f(h + 4 * k)}C${f(w * 0.12)} ${f(h * 0.4)} ${f(w * 0.3)} ${f(h * 0.12)} ${f(w * 0.56)} ${f(h * 0.08)}C${f(w * 0.8)} ${f(h * 0.05)} ${f(w * 0.98)} ${f(h * 0.2)} ${f(w * 1.04)} ${f(h * 0.36)}V${f(h + 4 * k)}Z" fill="${linear(D, 'uc2-coat', [[0, '#4A4038'], [1, '#2A231E']], { x1: 0, y1: 0, x2: 1, y2: 1 })}" stroke="${INK}" stroke-width="${f(2.6 * k)}"/>`
    + `<path d="M${f(w * 0.56)} ${f(h * 0.08)}C${f(w * 0.5)} ${f(h * 0.4)} ${f(w * 0.46)} ${f(h * 0.7)} ${f(w * 0.48)} ${f(h + 4 * k)}" fill="none" stroke="#1E1915" stroke-width="${f(2 * k)}"/>`
    + `<rect width="${f(w)}" height="${f(h)}" fill="${halftone(D, 'uc2-dots', { size: 4 * k, r: 0.9 * k, color: '#0E0B09', angle: 30 })}" opacity="0.25"/>`;
  // The holster's strap across the chest, and the holster under the arm.
  const strap = `<path d="M${f(w * 0.2)} ${f(h * 0.2)}L${f(w * 0.86)} ${f(h * 0.98)}" stroke="${INK}" stroke-width="${f(18 * k)}"/><path d="M${f(w * 0.2)} ${f(h * 0.2)}L${f(w * 0.86)} ${f(h * 0.98)}" stroke="#5E4632" stroke-width="${f(14 * k)}"/><path d="M${f(w * 0.2)} ${f(h * 0.2)}L${f(w * 0.86)} ${f(h * 0.98)}" stroke="#7A5C42" stroke-width="${f(1.6 * k)}" stroke-dasharray="${f(4 * k)} ${f(3 * k)}"/>`
    + `<rect x="${f(w * 0.5)}" y="${f(h * 0.52)}" width="${f(10 * k)}" height="${f(14 * k)}" fill="#B8A887" stroke="${INK}" stroke-width="${f(1.4 * k)}" transform="rotate(50 ${f(w * 0.52)} ${f(h * 0.58)})"/>`;
  const [hx, hy, g] = [w * 0.64, h * 0.56, 1.45 * k];
  const holster = `<path d="M${f(hx - 30 * g)} ${f(hy - 26 * g)}H${f(hx + 30 * g)}L${f(hx + 22 * g)} ${f(hy + 60 * g)}Q${f(hx)} ${f(hy + 74 * g)} ${f(hx - 22 * g)} ${f(hy + 60 * g)}Z" fill="#6A4E36" stroke="${INK}" stroke-width="${f(2.6 * k)}" stroke-linejoin="round"/>`
    + `<path d="M${f(hx - 26 * g)} ${f(hy - 16 * g)}H${f(hx + 26 * g)}" stroke="#3E2E20" stroke-width="${f(2.4 * k)}"/><path d="M${f(hx - 24 * g)} ${f(hy - 20 * g)}V${f(hy + 54 * g)}" stroke="#8A6A4C" stroke-width="${f(1.4 * k)}" stroke-dasharray="${f(3 * k)} ${f(3 * k)}"/>`;
  // The pistol sliding down into it, its grip left out.
  const p = reduced ? 1 : ease.outCubic(progress(t, 100, 650));
  const gy = lerp(hy - 120 * g, hy - 26 * g, p);
  const gun = `<g transform="translate(${f(hx)} ${f(gy)})">`
    + `<path d="M${f(-12 * g)} ${f(8 * g)}H${f(12 * g)}V${f(84 * g)}H${f(-12 * g)}Z" fill="#3A3E46" stroke="${INK}" stroke-width="${f(2.2 * k)}"/>`
    + `<path d="M${f(-15 * g)} ${f(-6 * g)}H${f(15 * g)}L${f(16 * g)} ${f(10 * g)}H${f(-16 * g)}Z" fill="#555A66" stroke="${INK}" stroke-width="${f(2.2 * k)}" stroke-linejoin="round"/>`
    // The grip, standing up and back out of the holster, chequered, lit on its edge.
    + `<g transform="rotate(-14 ${f(-2 * g)} ${f(-6 * g)})"><path d="M${f(-13 * g)} ${f(-6 * g)}L${f(-15 * g)} ${f(-50 * g)}Q${f(-15 * g)} ${f(-56 * g)} ${f(-8 * g)} ${f(-56 * g)}H${f(6 * g)}Q${f(12 * g)} ${f(-56 * g)} ${f(11 * g)} ${f(-50 * g)}L${f(9 * g)} ${f(-6 * g)}Z" fill="#2E2620" stroke="${INK}" stroke-width="${f(2.6 * k)}" stroke-linejoin="round"/>`
    + [0, 1, 2, 3, 4].map(i => `<path d="M${f(-11 * g)} ${f((-14 - i * 8) * g)}L${f(7 * g)} ${f((-20 - i * 8) * g)}" stroke="#4E4238" stroke-width="${f(1.2 * k)}"/>`).join('')
    + `<path d="M${f(-13 * g)} ${f(-10 * g)}L${f(-14.5 * g)} ${f(-50 * g)}" stroke="#D8C9AE" stroke-width="${f(1.6 * k)}" opacity="0.8"/></g>`
    + `<path d="M${f(-11 * g)} ${f(-2 * g)}H${f(11 * g)}" stroke="#A9B0BC" stroke-width="${f(1.6 * k)}"/>`
    + `</g>`;
  D.use('uc2-holster', `<clipPath id="uc2-holster"><path d="M${f(-w)} ${f(-h)}H${f(w * 2)}V${f(hy - 22 * g)}H${f(-w)}Z"/></clipPath>`);
  const glint = p >= 1 && !reduced ? glow(D, 'uc2-glint', { cx: hx - 14 * g, cy: hy - 80 * g, r: 14 * k, color: '#FFF4D8', opacity: 0.6 * (1 - progress(t, 650, 1000)) }) : '';
  return back + coat + strap + `<g clip-path="url(#uc2-holster)">${gun}</g>` + holster + glint;
}

// ---------- panel 3: the shield ----------

function shield(D, { w, h, local, character, reduced }) {
  const k = h / 252;
  const t = reduced ? 1300 : local;
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'uc3-wall', [[0, '#121A2A'], [0.7, '#182134'], [1, '#0A0F1A']])}"/>`;
  for (let x = w * 0.08; x < w; x += w * 0.2) back += `<path d="M${f(x)} 0V${f(h * 0.8)}" stroke="#060A12" stroke-width="${f(2 * k)}"/><path d="M${f(x + 2 * k)} 0V${f(h * 0.8)}" stroke="#2A3650" stroke-width="${f(0.9 * k)}" opacity="0.7"/>`;
  back += `<rect x="0" y="${f(h * 0.1)}" width="${f(w)}" height="${f(3 * k)}" fill="#C9D4E6" opacity="0.25"/>`;
  back += `<path d="M0 ${f(h * 0.8)}H${f(w)}V${f(h)}H0Z" fill="${linear(D, 'uc3-floor', [[0, '#111827'], [1, '#04070D']])}"/>`;
  back += pool(D, 'uc3-pool', { cx: w * 0.5, cy: h * 0.86, rx: w * 0.4, ry: h * 0.08, color: '#DDE5F0', opacity: 0.25 });
  const scale = (h * 0.92) / 233;
  const [sx, sy] = [w * 0.66, h * 1.04];
  const settle = reduced ? 1 : ease.outBack(progress(t, 200, 520), 1.4);
  const ring = reduced ? 0 : progress(t, 520, 1100);
  const lit = settle > 0 ? 0.4 + 0.6 * Math.max(0, 1 - ring) : 0;
  const shape = nobody(D, 'uc3-nobody', { sk: skeletonOf('standBack'), at: [sx, sy], scale, t, reduced, flip: true, color: '#0B1119', rim: { dx: -0.7, dy: -0.7, color: '#F2D8A0', width: 2.6 * k, gain: 0.4 + 0.6 * lit } });
  const hero = litFigure(D, 'uc3-hero', {
    c: character, sk: skeletonOf('stand'), at: [w * 0.3, sy], scale, t, reduced,
    ambient: { color: '#2E3A58', strength: 0.75 },
    key: { at: [sx, h * 0.3], z: 70 * k, color: '#FFD9A0', gain: 0.6 + 1.2 * lit },
    rim: { dx: -0.7, dy: -0.7, color: '#DCE8FF', width: 2.6 * k, gain: 0.7 },
  });
  // The shield mark settling on the silhouette's shoulder: paper, with amber light round it.
  const [mx, my] = [sx - 16 * scale, sy - 160 * scale];
  let mark = '';
  if (settle > 0) {
    const y = lerp(my - 50 * k, my, Math.min(1, settle)), s = 14 * k * Math.max(0.2, settle);
    mark = glow(D, 'uc3-mark-glow', { cx: mx, cy: y, r: 40 * k, color: '#FFD27A', opacity: 0.7 * lit })
      + `<path d="M${f(mx)} ${f(y - s)}L${f(mx + s * 0.85)} ${f(y - s * 0.62)}V${f(y + s * 0.1)}Q${f(mx + s * 0.75)} ${f(y + s * 0.75)} ${f(mx)} ${f(y + s * 1.05)}Q${f(mx - s * 0.75)} ${f(y + s * 0.75)} ${f(mx - s * 0.85)} ${f(y + s * 0.1)}V${f(y - s * 0.62)}Z" fill="#F3E9D6" stroke="${INK}" stroke-width="${f(2 * k)}" stroke-linejoin="round"/>`
      + `<path d="M${f(mx)} ${f(y - s * 0.62)}V${f(y + s * 0.7)}M${f(mx - s * 0.5)} ${f(y - s * 0.1)}H${f(mx + s * 0.5)}" stroke="#C9A35A" stroke-width="${f(2 * k)}"/>`;
  }
  // The ring of light going out from it once.
  const halo = ring > 0 && ring < 1 ? `<circle cx="${f(mx)}" cy="${f(my)}" r="${f(lerp(10, 150, ease.outCubic(ring)) * k)}" fill="none" stroke="#FFE3A0" stroke-width="${f(lerp(5, 0.6, ring) * k)}" opacity="${f3(1 - ring)}"/>` : '';
  return back + hero + shape + halo + mark;
}

/** The Undercover's panels, as functions of each panel's size and local time. */
export function undercoverPanels(D, { character, reduced }) {
  return [
    ({ w, h, local }) => streetAtNight(D, { w, h, local, character, reduced }),
    ({ w, h, local }) => armed(D, { w, h, local, reduced }),
    ({ w, h, local }) => shield(D, { w, h, local, character, reduced }),
  ];
}

/** The Undercover's film: the card's mark, the gadget, the three panels and the narration. */
export const UNDERCOVER = Object.freeze({ mark: undercoverMark, gadget: undercoverGadget, panels: undercoverPanels, captions: UNDERCOVER_CAPTIONS });
