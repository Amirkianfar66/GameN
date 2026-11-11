//
// The Supplier's film (the storyboard approved on 6 November 2026, docs/design/cinematic/
// role-reveal.md on `claude/designer-role-films`): "The fixer of the Belt markets."
//   1 · memory · The Belt markets. A stall under an awning, shelves of goods behind it, crates
//       stacked up to a swinging lamp, and the player's own character leaning back on them, the arms
//       folded. A crate drops onto the counter: CLANK. Narration: "The Belt markets."
//   2 · memory · Two crates. In the back room the player's character crouches at a false floor that
//       lifts on two sealed crates, lit by a work lamp. Narration: "Two crates, off the books."
//   3 · aboard · The cargo hold. Two silhouettes wait among the containers. Two crates come down on
//       the hoist and land, one beside each, a blank tag swinging on each.
// What the pictures show: two deliveries, kept secret; the role card says when and what. Nobody is
// anybody: the two who wait are silhouettes, and the tags are blank.

import { skeletonOf } from '../../scene-drawing/gestures.mjs';
import { litFigure } from '../kit/cast.mjs';
import { beam, dust, glow, halftone, inBeam, linear, pool, puff } from '../kit/fx.mjs';
import { ease, f, f3, lerp, progress, rng } from '../kit/math.mjs';
import { INK, STEEL, gadgetOf, markOf, nobody, poly, soundWord } from './common.mjs';

export const SUPPLIER_CAPTIONS = Object.freeze([['The Belt markets.'], ['Two crates,', 'off the books.']]);

// ---------- the card's mark and the gadget ----------

/** The Supplier's mark on the card on the desk: a braced crate, paper on the dark plate. */
export function supplierMark(D, face, u) {
  const s = Math.min(face.w, face.h) * 0.34, cx = face.x + face.w / 2, cy = face.y + face.h / 2;
  const box = [[cx - s, cy - s], [cx + s, cy - s], [cx + s, cy + s], [cx - s, cy + s]];
  const b = s * 0.2, inner = s - b;
  const bar = (x0, y0, x1, y1, wd) => { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), nx = (-dy / l) * wd, ny = (dx / l) * wd; return poly([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]]); };
  return markOf(D, 'sp-mark', face, u, {
    solid: [poly(box)],
    holes: [
      poly([[cx - inner, cy - inner], [cx + inner, cy - inner], [cx + inner, cy - inner + b * 0.5], [cx - inner, cy - inner + b * 0.5]]),
      poly([[cx - inner, cy + inner - b * 0.5], [cx + inner, cy + inner - b * 0.5], [cx + inner, cy + inner], [cx - inner, cy + inner]]),
      bar(cx - inner * 0.86, cy - inner * 0.62, cx + inner * 0.86, cy + inner * 0.62, b * 0.28),
    ],
  });
}

/** The twin supply canister the role card's device draws, without the hand or its team accent. */
export function supplierGadget() {
  return gadgetOf('bf-gadget-sp', { box: [40, 8, 90, 116], grip: [72, 92], glint: [87, 15] }, cv => {
    cv.form([[66, 70], [78, 70], [79, 114], [72, 118], [65, 114]], STEEL.grip, { weight: 2.6, depth: 3, seed: 121, tension: 0.4 });
    cv.form([[52, 62], [92, 62], [94, 72], [50, 72]], STEEL.dark, { weight: 2.4, depth: 2, seed: 122, tension: 0.2 });
    for (const [x, seed] of [[51, 123], [74, 125]]) {
      cv.form([[x, 20], [x + 19, 20], [x + 20, 62], [x - 1, 62]], STEEL.body, { weight: 2.6, depth: 4, seed, tension: 0.35 });
      cv.form([[x + 2, 13], [x + 17, 13], [x + 17, 21], [x + 2, 21]], STEEL.deep, { weight: 1.8, depth: 1, seed: seed + 1, tension: 0.3 });
      cv.flat([[x + 3, 24], [x + 6, 24], [x + 6, 58], [x + 3, 58]], STEEL.shine, { opacity: 0.75, tension: 0.2 });
    }
    for (const y of [30, 52]) cv.form([[48, y], [96, y], [96, y + 5], [48, y + 5]], STEEL.dark, { weight: 1.8, depth: 1, seed: 127 + y, tension: 0.1, hatch: false });
    cv.flat([[60, 38], [64, 38], [64, 46], [60, 46]], STEEL.lamp, { tension: 0.3 });
    cv.flat([[83, 38], [87, 38], [87, 46], [83, 46]], STEEL.lamp, { tension: 0.3 });
  });
}

// ---------- a crate ----------

/** A wooden crate's front: planks, a brace and its ink, at (x, y) its bottom-left, `w` x `h`. */
function crate({ x, y, w, h, k, fill = '#7A6146', dark = '#4E3C2A', tag = false, swing = 0 }) {
  let out = `<rect x="${f(x)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}" fill="${fill}" stroke="${INK}" stroke-width="${f(2 * k)}"/>`;
  for (let i = 1; i < 3; i += 1) out += `<path d="M${f(x)} ${f(y - (h * i) / 3)}H${f(x + w)}" stroke="${dark}" stroke-width="${f(1.2 * k)}"/>`;
  out += `<rect x="${f(x)}" y="${f(y - h)}" width="${f(w)}" height="${f(h * 0.12)}" fill="${dark}" stroke="${INK}" stroke-width="${f(1.4 * k)}"/><rect x="${f(x)}" y="${f(y - h * 0.12)}" width="${f(w)}" height="${f(h * 0.12)}" fill="${dark}" stroke="${INK}" stroke-width="${f(1.4 * k)}"/>`;
  out += `<path d="M${f(x + w * 0.06)} ${f(y - h * 0.14)}L${f(x + w * 0.94)} ${f(y - h * 0.86)}" stroke="${dark}" stroke-width="${f(Math.min(w, h) * 0.12)}"/><path d="M${f(x + w * 0.06)} ${f(y - h * 0.14)}L${f(x + w * 0.94)} ${f(y - h * 0.86)}" stroke="${INK}" stroke-width="${f(1.2 * k)}" opacity="0.6"/>`;
  if (tag) {
    // A blank tag on its string, swinging from the crate's corner.
    const [tx, ty] = [x + w * 0.88, y - h * 0.9];
    const len = 16 * k, a = swing * Math.PI / 180;
    const [ex, ey] = [tx + Math.sin(a) * len, ty + Math.cos(a) * len];
    out += `<path d="M${f(tx)} ${f(ty)}L${f(ex)} ${f(ey)}" stroke="#E9DFC8" stroke-width="${f(1 * k)}"/>`
      + `<g transform="rotate(${f3(-swing)} ${f(ex)} ${f(ey)})"><path d="M${f(ex - 6 * k)} ${f(ey)}h${f(12 * k)}v${f(14 * k)}h${f(-12 * k)}Z" fill="#EFE6D2" stroke="${INK}" stroke-width="${f(1 * k)}"/><circle cx="${f(ex)}" cy="${f(ey + 2.5 * k)}" r="${f(1.2 * k)}" fill="${INK}"/></g>`;
  }
  return out;
}

// ---------- panel 1: the Belt markets ----------

function beltMarkets(D, { w, h, local, character, reduced }) {
  const k = h / 252;
  const t = reduced ? 1300 : local;
  // The market's back wall and the shelves of the stall.
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'sp1-wall', [[0, '#2B2420'], [0.7, '#3A3029'], [1, '#1A1410']])}"/>`;
  const r = rng(51);
  for (const y of [h * 0.3, h * 0.48]) {
    back += `<rect x="${f(w * 0.02)}" y="${f(y)}" width="${f(w * 0.5)}" height="${f(4 * k)}" fill="#5A4836" stroke="${INK}" stroke-width="${f(1.2 * k)}"/>`;
    for (let x = w * 0.04; x < w * 0.5; x += 13 * k) {
      const kind = r();
      const gh = (8 + r() * 12) * k, gw = (7 + r() * 5) * k;
      back += kind < 0.5
        ? `<rect x="${f(x)}" y="${f(y - gh)}" width="${f(gw)}" height="${f(gh)}" rx="${f(2 * k)}" fill="${['#8A7656', '#B39C74', '#6E5C46'][Math.floor(r() * 3)]}" stroke="${INK}" stroke-width="${f(1 * k)}"/>`
        : `<path d="M${f(x)} ${f(y)}V${f(y - gh * 0.7)}Q${f(x + gw / 2)} ${f(y - gh * 1.1)} ${f(x + gw)} ${f(y - gh * 0.7)}V${f(y)}Z" fill="${['#9C8A6A', '#C8B48C'][Math.floor(r() * 2)]}" stroke="${INK}" stroke-width="${f(1 * k)}"/>`;
    }
  }
  back += `<path d="M0 ${f(h * 0.8)}H${f(w)}V${f(h)}H0Z" fill="#15100C"/>`;
  // The awning across the top, its scallops.
  let awning = '';
  for (let i = 0; i < 12; i += 1) {
    const x0 = (i / 12) * w * 0.62, x1 = ((i + 1) / 12) * w * 0.62;
    awning += `<path d="M${f(x0)} 0H${f(x1)}V${f(h * 0.12)}Q${f((x0 + x1) / 2)} ${f(h * 0.17)} ${f(x0)} ${f(h * 0.12)}Z" fill="${i % 2 ? '#D8C8A6' : '#6E5640'}" stroke="${INK}" stroke-width="${f(1.4 * k)}"/>`;
  }
  // The swinging lamp over the crates, and its cone.
  const swing = reduced ? 0 : 6 * Math.sin(t / 480) * Math.PI / 180;
  const [lx0, len] = [w * 0.74, h * 0.2];
  const lx = lx0 + Math.sin(swing) * len, ly = Math.cos(swing) * len;
  const cone = { from: [lx, ly + 4 * k], to: [lx + Math.sin(swing) * h * 0.5, h * 0.92], w0: 18 * k, w1: w * 0.5 };
  let air = beam(D, 'sp1-cone', { ...cone, color: '#FFE2A8', opacity: 0.3, soft: 4 * k })
    + pool(D, 'sp1-pool', { cx: cone.to[0], cy: h * 0.82, rx: w * 0.3, ry: h * 0.08, color: '#FFD58E', opacity: 0.45 });
  if (!reduced) air += dust({ seed: 52, n: 40, t, box: [w * 0.4, 0, w * 0.6, h], size: [0.5 * k, 1.3 * k], color: '#FFF0CC', opacity: 0.85, lightAt: (x, y) => inBeam([x, y], cone) * 2 });
  // The crates stacked up to the lamp, the character leaning back on them, the arms folded.
  let crates = '';
  for (const [x, y, cw, ch] of [[w * 0.66, h * 0.82, 58 * k, 46 * k], [w * 0.82, h * 0.82, 56 * k, 50 * k], [w * 0.72, h * 0.82 - 46 * k, 52 * k, 42 * k], [w * 0.9, h * 0.82 - 50 * k, 40 * k, 38 * k]]) crates += crate({ x, y, w: cw, h: ch, k });
  const scale = (h * 0.86) / 233;
  const hero = litFigure(D, 'sp1-hero', {
    c: character, sk: skeletonOf('leanCrates'), at: [w * 0.6, h * 0.98], scale, t, reduced,
    ambient: { color: '#4A3A2A', strength: 0.55 },
    key: { at: [lx, ly + 8 * k], z: 70 * k, color: '#FFD9A0', gain: 1.6 },
    rim: { dx: 0.75, dy: -0.65, color: '#F2DDB4', width: 2.4 * k, gain: 0.7 },
  });
  // The counter in front, and a crate dropping onto it.
  const counter = `<path d="M${f(-4 * k)} ${f(h * 0.66)}H${f(w * 0.48)}V${f(h + 4 * k)}H${f(-4 * k)}Z" fill="${linear(D, 'sp1-counter', [[0, '#6A5440'], [1, '#3A2D21']])}" stroke="${INK}" stroke-width="${f(2.4 * k)}"/><rect x="${f(-4 * k)}" y="${f(h * 0.64)}" width="${f(w * 0.5)}" height="${f(6 * k)}" fill="#8B7155" stroke="${INK}" stroke-width="${f(1.8 * k)}"/>`;
  const fall = reduced ? 1 : progress(t, 380, 600);
  const dropY = lerp(-h * 0.2, h * 0.64, ease.inCubic(fall));
  const bounce = reduced ? 0 : Math.max(0, Math.sin(progress(t, 600, 760) * Math.PI)) * 5 * k;
  const dropped = crate({ x: w * 0.22, y: dropY - bounce, w: 64 * k, h: 44 * k, k, fill: '#86694B' });
  const fx = reduced ? '' : puff(D, 'sp1-puff', { t, t0: 600, at: [w * 0.22 + 32 * k, h * 0.64], r: w * 0.14, ms: 480, color: '#D8C9AE', opacity: 0.4, seed: 5 });
  const clank = soundWord(D, 'sp1-clank', 'CLANK', { x: w * 0.3, y: h * 0.24, size: 20 * k, k: reduced ? 1 : progress(t, 600, 800), rotate: -7 });
  const lamp = `<path d="M${f(lx0)} 0L${f(lx)} ${f(ly - 10 * k)}" stroke="${INK}" stroke-width="${f(1.3 * k)}"/><g transform="translate(${f(lx)} ${f(ly)}) rotate(${f3(-swing * 180 / Math.PI)})"><path d="M${f(-12 * k)} 0L${f(-5 * k)} ${f(-11 * k)}H${f(5 * k)}L${f(12 * k)} 0Z" fill="#3E342B" stroke="${INK}" stroke-width="${f(1.8 * k)}" stroke-linejoin="round"/><ellipse cx="0" cy="0" rx="${f(11 * k)}" ry="${f(2.6 * k)}" fill="#FFF0C8"/></g>` + glow(D, 'sp1-bulb', { cx: lx, cy: ly + 2 * k, r: 26 * k, color: '#FFE6B0', opacity: 0.9 });
  return back + awning + air + crates + hero + counter + dropped + fx + lamp + clank;
}

// ---------- panel 2: two crates, off the books ----------

function falseFloor(D, { w, h, local, character, reduced }) {
  const k = h / 252;
  const t = reduced ? 1300 : local;
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'sp2-wall', [[0, '#221C17'], [0.6, '#2C241E'], [1, '#14100C']])}"/>`;
  back += `<path d="M0 ${f(h * 0.5)}H${f(w)}V${f(h)}H0Z" fill="${linear(D, 'sp2-floor', [[0, '#3A2F25'], [1, '#1E1812']])}"/>`;
  for (let x = -w * 0.2; x < w * 1.2; x += 26 * k) back += `<path d="M${f(x)} ${f(h * 0.5)}L${f(x - 60 * k)} ${f(h)}" stroke="#15100C" stroke-width="${f(1.4 * k)}"/>`;
  back += `<rect x="0" y="${f(h * 0.5)}" width="${f(w)}" height="${f(h * 0.5)}" fill="${halftone(D, 'sp2-dots', { size: 4 * k, r: 0.8 * k, color: '#0E0B08' })}" opacity="0.3"/>`;
  // The hidden hold under the floor: a dark pit, and the two sealed crates in it.
  const [hx, hy, hw, hh] = [w * 0.16, h * 0.62, w * 0.44, h * 0.3];
  const open = reduced ? 1 : ease.inOutCubic(progress(t, 120, 620));
  let pit = `<path d="M${f(hx)} ${f(hy)}H${f(hx + hw)}L${f(hx + hw - 10 * k)} ${f(hy + hh)}H${f(hx + 10 * k)}Z" fill="#0B0806" stroke="${INK}" stroke-width="${f(2.2 * k)}"/>`;
  pit += crate({ x: hx + hw * 0.08, y: hy + hh * 0.92, w: hw * 0.38, h: hh * 0.62, k, fill: '#7A6146' }) + crate({ x: hx + hw * 0.52, y: hy + hh * 0.92, w: hw * 0.38, h: hh * 0.62, k, fill: '#86694B' });
  // A seal on each crate.
  for (const x of [hx + hw * 0.27, hx + hw * 0.71]) pit += `<circle cx="${f(x)}" cy="${f(hy + hh * 0.6)}" r="${f(5 * k)}" fill="#C9B78A" stroke="${INK}" stroke-width="${f(1.2 * k)}"/>`;
  // The floor's lid, lifting up on its hinge at the far side.
  const lidAngle = lerp(0, 72, open);
  const lid = `<g transform="translate(${f(hx)} ${f(hy)}) scale(1 ${f3(Math.cos(lidAngle * Math.PI / 180))})"><rect x="0" y="0" width="${f(hw)}" height="${f(hh)}" fill="#4A3B2E" stroke="${INK}" stroke-width="${f(2 * k)}"/>${[1, 2, 3].map(i => `<path d="M${f((hw * i) / 4)} 0V${f(hh)}" stroke="#2A2018" stroke-width="${f(1.4 * k)}"/>`).join('')}</g>`;
  const lidUp = `<g transform="translate(${f(hx)} ${f(hy)}) scale(1 ${f3(-Math.sin(lidAngle * Math.PI / 180) * 0.6)})"><rect x="0" y="0" width="${f(hw)}" height="${f(hh)}" fill="#5A4836" stroke="${INK}" stroke-width="${f(2 * k)}"/>${[1, 2, 3].map(i => `<path d="M${f((hw * i) / 4)} 0V${f(hh)}" stroke="#2A2018" stroke-width="${f(1.4 * k)}"/>`).join('')}</g>`;
  // The work lamp on its hook, its cone down into the hold.
  const lamp = [hx + hw * 0.5, h * 0.06];
  const cone = { from: [lamp[0], lamp[1] + 8 * k], to: [hx + hw * 0.5, hy + hh * 0.8], w0: 14 * k, w1: hw * 1.1 };
  let air = beam(D, 'sp2-cone', { ...cone, color: '#FFE2A8', opacity: 0.32 * (0.4 + 0.6 * open), soft: 4 * k })
    + pool(D, 'sp2-pool', { cx: hx + hw / 2, cy: hy + hh * 0.5, rx: hw * 0.7, ry: hh * 0.7, color: '#FFD58E', opacity: 0.5 * open });
  if (!reduced) air += dust({ seed: 54, n: 30, t, box: [hx - 20 * k, 0, hw + 40 * k, h], size: [0.5 * k, 1.2 * k], color: '#FFF0CC', opacity: 0.8, lightAt: (x, y) => inBeam([x, y], cone) * 2 });
  const lampSvg = `<path d="M${f(lamp[0])} 0V${f(lamp[1])}" stroke="${INK}" stroke-width="${f(1.4 * k)}"/><rect x="${f(lamp[0] - 7 * k)}" y="${f(lamp[1])}" width="${f(14 * k)}" height="${f(10 * k)}" rx="${f(3 * k)}" fill="#FFF0C8" stroke="${INK}" stroke-width="${f(1.4 * k)}"/><path d="M${f(lamp[0] - 7 * k)} ${f(lamp[1] + 3 * k)}h${f(14 * k)}M${f(lamp[0] - 7 * k)} ${f(lamp[1] + 7 * k)}h${f(14 * k)}M${f(lamp[0])} ${f(lamp[1])}v${f(10 * k)}" stroke="${INK}" stroke-width="${f(1 * k)}"/>` + glow(D, 'sp2-bulb', { cx: lamp[0], cy: lamp[1] + 5 * k, r: 26 * k, color: '#FFE6B0', opacity: 0.9 });
  // The character crouched at the edge of the hold, prying it open.
  const scale = (h * 0.9) / 233;
  const hero = litFigure(D, 'sp2-hero', {
    c: character, sk: skeletonOf('crouchHatch'), at: [w * 0.82, h * 1.02], scale, t, reduced,
    ambient: { color: '#4A3A2A', strength: 0.55 },
    key: { at: [hx + hw / 2, hy], z: 60 * k, color: '#FFD9A0', gain: 1.5 },
    rim: { dx: 0.7, dy: -0.7, color: '#F2DDB4', width: 2.4 * k, gain: 0.7 },
  });
  return back + air + pit + (open < 0.5 ? lid : lidUp) + hero + lampSvg;
}

// ---------- panel 3: the cargo hold ----------

function cargoHold(D, { w, h, local, reduced }) {
  const k = h / 252;
  const t = reduced ? 1300 : local;
  let back = `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'sp3-wall', [[0, '#101826'], [0.7, '#162032'], [1, '#090E18']])}"/>`;
  // The hold's ribs and the containers stacked back into the dark.
  for (let x = w * 0.05; x < w; x += w * 0.18) back += `<path d="M${f(x)} 0V${f(h * 0.78)}" stroke="#060A12" stroke-width="${f(3 * k)}"/><path d="M${f(x + 3 * k)} 0V${f(h * 0.78)}" stroke="#27324A" stroke-width="${f(1 * k)}" opacity="0.7"/>`;
  for (const [x, y, cw, ch, c] of [[w * 0.0, h * 0.78, w * 0.2, h * 0.34, '#2A3346'], [w * 0.0, h * 0.44, w * 0.16, h * 0.26, '#232B3C'], [w * 0.8, h * 0.78, w * 0.22, h * 0.4, '#262F42'], [w * 0.84, h * 0.38, w * 0.18, h * 0.24, '#202838']]) {
    back += `<rect x="${f(x)}" y="${f(y - ch)}" width="${f(cw)}" height="${f(ch)}" fill="${c}" stroke="${INK}" stroke-width="${f(2 * k)}"/>`;
    for (let i = 1; i < 6; i += 1) back += `<path d="M${f(x + (cw * i) / 6)} ${f(y - ch + 3 * k)}V${f(y - 3 * k)}" stroke="#141A26" stroke-width="${f(1.4 * k)}"/>`;
  }
  back += `<path d="M0 ${f(h * 0.78)}H${f(w)}V${f(h)}H0Z" fill="${linear(D, 'sp3-floor', [[0, '#121A28'], [1, '#04070D']])}"/>`;
  // The hold's floodlight from above, and the two crates coming down on the hoist.
  const cone = { from: [w * 0.5, 0], to: [w * 0.5, h * 0.95], w0: 30 * k, w1: w * 0.75 };
  const air = beam(D, 'sp3-cone', { ...cone, color: '#E6ECF5', opacity: 0.14, soft: 6 * k })
    + pool(D, 'sp3-pool', { cx: w * 0.5, cy: h * 0.86, rx: w * 0.42, ry: h * 0.08, color: '#DDE5F0', opacity: 0.35 });
  const scale = (h * 0.82) / 233;
  const spots = [[w * 0.3, 380], [w * 0.66, 620]];
  let crates = '', who = '';
  spots.forEach(([x, at], i) => {
    // Nobody, waiting: one beside each landing.
    who += nobody(D, `sp3-nobody${i}`, { sk: skeletonOf(i ? 'standBack' : 'standFolded'), at: [x + (i ? 52 : -52) * k, h * 0.98], scale, t, reduced, flip: i === 1, color: '#0B1119', rim: { dx: i ? 0.7 : -0.7, dy: -0.7, color: '#C9D4E6', width: 2.4 * k, gain: 0.6 } });
    const p = reduced ? 1 : progress(t, at - 380, at);
    const y = lerp(-h * 0.1, h * 0.9, ease.outCubic(p));
    const settle = reduced ? 1 : progress(t, at, at + 200);
    const swing = reduced ? 8 : p < 1 ? 0 : 22 * Math.exp(-(t - at) / 380) * Math.cos((t - at) / 90);
    const cw = 56 * k, ch = 44 * k;
    crates += `<path d="M${f(x - cw * 0.3)} 0L${f(x - cw * 0.3)} ${f(y - ch)}M${f(x + cw * 0.3)} 0L${f(x + cw * 0.3)} ${f(y - ch)}" stroke="#8C94A6" stroke-width="${f(1.4 * k)}" opacity="${f3(1 - settle * 0.6)}"/>`
      + `<ellipse cx="${f(x)}" cy="${f(h * 0.9 + 2 * k)}" rx="${f(cw * 0.6)}" ry="${f(4 * k)}" fill="#000" opacity="${f3(0.55 * p)}"/>`
      + crate({ x: x - cw / 2, y, w: cw, h: ch, k, fill: '#4F5A66', dark: '#323B46', tag: p >= 1 || reduced, swing });
    if (!reduced) crates += puff(D, `sp3-puff${i}`, { t, t0: at, at: [x, h * 0.9], r: w * 0.1, ms: 420, color: '#9AA4B8', opacity: 0.35, seed: 9 + i });
  });
  return back + air + who + crates;
}

/** The Supplier's panels, as functions of each panel's size and local time. */
export function supplierPanels(D, { character, reduced }) {
  return [
    ({ w, h, local }) => beltMarkets(D, { w, h, local, character, reduced }),
    ({ w, h, local }) => falseFloor(D, { w, h, local, character, reduced }),
    ({ w, h, local }) => cargoHold(D, { w, h, local, reduced }),
  ];
}

/** The Supplier's film: the card's mark, the gadget, the three panels and the narration. */
export const SUPPLIER = Object.freeze({ mark: supplierMark, gadget: supplierGadget, panels: supplierPanels, captions: SUPPLIER_CAPTIONS });
