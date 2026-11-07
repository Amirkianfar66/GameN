// mothership:dev-only
//
// The Disablers' three panels, shared frame for frame by the Blue Disabler and the Red Disabler
// (docs/design/cinematic/role-reveal.md, "Blue Disabler and Red Disabler"): the breaker of machines,
// hired with one charge, told around the player's own character:
//   1  the engine decks of Ceres (memory, in sepia): pipes and caged lamps; the player's character
//      throws a breaker, sparks fly, and the deck's lamps go out one by one (CLUNK)
//   2  one charge (memory): the stun rod in its open case beside a single charge cell, and an
//      envelope of credits pushed across the table by a gloved hand
//   3  aboard, ahead (a glimpse of the work to come, not an event of the match): a dark cabin, a silhouette in it; the rod's charge arcs once and the cabin's
//      light dips (ZZT)
// What the pictures show: one hidden attack in the whole match, the one charge; the role card says
// it in words. The arc is white and paper light, never a team colour; every figure but the player's
// own is a silhouette, and no one is named.
//
// Each panel is a pure function (local ms since the panel slammed in, { w, h, prefix, seat, character, reduced })
// -> SVG markup, drawn for a nominal 828 x 480 panel and scaled to its height (stagecraft.mjs shot()).

import { skeletonOf } from '../../../board-motion/figures/gestures.mjs';
import { INK, lightCone, lightPool, particles, stars } from '../../lib/comic.mjs';
import { beat, clamp01, easeInOutCubic, easeOutBack, easeOutCubic, rand } from '../../lib/ease.mjs';
import { NIGHT, lampFlicker, motes, sfxSvg } from './art.mjs';
import { NOMINAL, breathe, contact, floor, hero, shot, silhouette } from './stagecraft.mjs';

const f = v => Number((+v).toFixed(2));
/** The decks' and the cabin's own fills (held clear of the faction accents by the palette test). */
const DECK = Object.freeze({ pipe: '#4F5A6B', pipeLit: '#8A96A8', flange: '#2C3442', grate: '#141A24', box: '#5A6474', foam: '#30353D', foamLit: '#444A54', cell: '#FFF1C9', felt: '#3B3128', envelope: '#D8C8A2', bill: '#B9C2A0', glove: '#20242C', bunk: '#2E3B58', blanket: '#3E4F72' });
/** The arc's light: white at the core, paper and amber around it, never a team colour. */
const ARC = Object.freeze({ core: '#FFFFFF', glow: '#FFF3C4', halo: '#FFE7A3' });

/** The far arm's two bones (the rig's own lengths): an elbow for a hand at `hand`, bent away to `side`. */
function reachTo(shoulder, hand, side = -1, l1 = 34, l2 = 28) {
  const dx = hand[0] - shoulder[0], dy = hand[1] - shoulder[1];
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const hgt = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const ux = dx / (Math.hypot(dx, dy) || 1), uy = dy / (Math.hypot(dx, dy) || 1);
  const px = -uy * side, py = ux * side;
  return [shoulder[0] + ux * a + px * hgt, shoulder[1] + uy * a + py * hgt];
}

/** A jagged bolt from a to b, re-struck every `period` ms (deterministic): white core, paper glow. */
function arcSvg(prefix, { from, to, t, period = 70, seed = 5, glow }) {
  const strike = Math.floor(t / period);
  const n = 9;
  const pts = [from];
  for (let i = 1; i < n; i += 1) {
    const u = i / n;
    const jitter = (rand(seed, strike, i) - 0.5) * 46 * Math.sin(Math.PI * u);
    const nx = -(to[1] - from[1]), ny = to[0] - from[0], l = Math.hypot(nx, ny) || 1;
    pts.push([from[0] + (to[0] - from[0]) * u + (nx / l) * jitter, from[1] + (to[1] - from[1]) * u + (ny / l) * jitter]);
  }
  pts.push(to);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('');
  return `<path d="${d}" fill="none" stroke="${ARC.halo}" stroke-width="16" stroke-linejoin="round" opacity="0.55" filter="url(#${glow})"/>`
    + `<path d="${d}" fill="none" stroke="${ARC.glow}" stroke-width="7" stroke-linejoin="round"/>`
    + `<path d="${d}" fill="none" stroke="${ARC.core}" stroke-width="2.8" stroke-linejoin="round"/>`
    + lightPool(prefix, `arc-${seed}`, { cx: to[0], cy: to[1], rx: 90, ry: 80, color: ARC.glow, opacity: 0.5 });
}

/**
 * The stun rod lying along its length from (x, y) at `angle` degrees, `len` long: the grip, the guard
 * ring, the shaft and the forked prongs of the role card's device. Returns { svg, tip } (the prongs' point).
 */
function stunRod({ x, y, angle = 0, len = 300, live = 0, held = false }) {
  const a = (angle * Math.PI) / 180;
  const tip = [x + Math.cos(a) * len, y + Math.sin(a) * len];
  const s = len / 300;
  const svg = `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)}) scale(${f(s)})">`
    + `<rect x="0" y="-13" width="110" height="26" rx="9" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="5"/>`
    + `<path d="M14 -8H96" stroke="${NIGHT.steelLit}" stroke-width="3" opacity="0.8"/>`
    + `<ellipse cx="114" cy="0" rx="9" ry="30" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="5"/>`
    + `<rect x="118" y="-8" width="140" height="16" rx="5" fill="${NIGHT.steelPale}" stroke="${INK}" stroke-width="4.5"/>`
    + `<path d="M124 -3H252" stroke="#FFFFFF" stroke-width="2" opacity="0.6"/>`
    + `<ellipse cx="190" cy="0" rx="7" ry="17" fill="${NIGHT.steelLit}" stroke="${INK}" stroke-width="4"/>`
    + `<path d="M256 -6L300 -20V-12L266 0L300 12V20L256 6Z" fill="${NIGHT.steelPale}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`
    + (live > 0 ? `<circle cx="296" cy="0" r="${f(10 + 8 * live)}" fill="${ARC.glow}" opacity="${f(0.7 * live)}"/>` : '')
    + (held ? `<rect x="22" y="-30" width="76" height="60" rx="20" fill="${DECK.glove}" stroke="${NIGHT.rim}" stroke-width="3"/><path d="M42 -26V26M60 -27V27M78 -26V26" stroke="${INK}" stroke-width="3"/>` : '')
    + `</g>`;
  return { svg, tip };
}

/** A caged lamp on the deck's ceiling at x, its cone down to the floor; `on` 0..1. */
function cagedLamp(prefix, { x, y = 34, on, id }) {
  return (on > 0 ? lightCone(prefix, `deck-${id}`, { from: [x, y + 20], to: [x, 440], spread: 120, color: '#FFE7A3', opacity: 0.26 * on, near: 18 }) : '')
    + `<path d="M${f(x)} 0V${f(y)}" stroke="${INK}" stroke-width="4"/>`
    + `<ellipse cx="${f(x)}" cy="${f(y + 12)}" rx="16" ry="14" fill="${on > 0.2 ? '#FFF3C4' : '#4A4636'}" opacity="${f(0.35 + 0.65 * on)}" stroke="${INK}" stroke-width="3.5"/>`
    + `<path d="M${f(x - 16)} ${f(y + 12)}H${f(x + 16)}M${f(x)} ${f(y - 2)}V${f(y + 26)}" stroke="${INK}" stroke-width="3"/>`
    + (on > 0 ? lightPool(prefix, `deck-bulb-${id}`, { cx: x, cy: y + 14, rx: 50, ry: 36, color: '#FFE7A3', opacity: 0.45 * on }) : '');
}

/** When each of the deck's lamps goes out after the breaker is thrown (ms after the panel slams in). */
const THROW = Object.freeze([240, 420]);
const LAMPS = Object.freeze([90, 250, 410, 570, 730]);

/**
 * Panel 1 (memory): the engine decks of Ceres. The player's character, back to us, throws the
 * breaker; sparks fly from the box and the deck's caged lamps go out one after another.
 */
export function panelDecks(local, { w, h, prefix, character = 'c4', reduced = false }) {
  const t = local;
  // In the reduced still the breaker is already thrown and the deck already dark but for its last lamp.
  const thrown = reduced ? 1 : easeInOutCubic(beat(t, THROW));
  const outAt = i => THROW[1] + 60 + Math.abs(i - 3) * 110;
  const lampOn = i => (reduced ? (i === 0 ? 1 : 0) : 1 - beat(t, [outAt(i), outAt(i) + 90])) * (reduced ? 1 : lampFlicker(t, 11 + i) * 0.2 + 0.8);
  // The wall: three pipes with flanges and a valve wheel, two gauges.
  let pipes = '';
  [[96, 30], [168, 22], [292, 34]].forEach(([py, pr], i) => {
    pipes += `<rect x="-10" y="${f(py - pr / 2)}" width="${NOMINAL[0] + 20}" height="${pr}" fill="${DECK.pipe}" stroke="${INK}" stroke-width="4"/>`
      + `<path d="M0 ${f(py - pr / 2 + 5)}H${NOMINAL[0]}" stroke="${DECK.pipeLit}" stroke-width="3" opacity="0.7"/>`;
    for (let fx = 60 + i * 40; fx < NOMINAL[0]; fx += 170) pipes += `<rect x="${f(fx)}" y="${f(py - pr / 2 - 6)}" width="14" height="${pr + 12}" rx="3" fill="${DECK.flange}" stroke="${INK}" stroke-width="3"/>`;
  });
  const gauge = (gx, gy, a) => `<circle cx="${gx}" cy="${gy}" r="22" fill="${NIGHT.steelPale}" stroke="${INK}" stroke-width="4"/><path d="M${gx} ${gy}L${f(gx + 15 * Math.cos(a))} ${f(gy + 15 * Math.sin(a))}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  // The deck goes dark, but keeps the films' one brightness: its emergency light and the sparks stay.
  const dark = reduced ? 0.3 : 0.3 * beat(t, [THROW[1] + 40, outAt(0) + 120]);
  const far = pipes
    + gauge(150, 236, -2.4 + (reduced ? 1.6 : 1.6 * thrown)) + gauge(700, 236, -1.2 + (reduced ? 1.4 : 1.4 * thrown))
    + `<circle cx="300" cy="168" r="26" fill="none" stroke="${DECK.flange}" stroke-width="7"/><path d="M274 168H326M300 142V194" stroke="${DECK.flange}" stroke-width="5"/>`
    + LAMPS.map((x, i) => cagedLamp(prefix, { x, on: lampOn(i), id: i })).join('');
  // The breaker box on the wall, its lever swinging from up to down about the pivot.
  const pivot = [556, 258], lever = 70;
  const ang = (-96 + 192 * thrown) * (Math.PI / 180);
  const grip = [pivot[0] + Math.cos(ang) * lever, pivot[1] + Math.sin(ang) * lever];
  const sparkV = reduced ? 0 : beat(t, [THROW[1], THROW[1] + 700]);
  const box = contact(556, 150, 446)
    + `<rect x="486" y="150" width="140" height="220" rx="8" fill="${DECK.box}" stroke="${INK}" stroke-width="6"/>`
    + `<path d="M494 158H618" stroke="${DECK.pipeLit}" stroke-width="3" opacity="0.7"/>`
    + `<rect x="504" y="176" width="34" height="18" rx="3" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="3"/><rect x="574" y="176" width="34" height="18" rx="3" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="3"/>`
    + `<circle cx="${pivot[0]}" cy="${pivot[1]}" r="14" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="4"/>`
    + `<path d="M${pivot[0]} ${pivot[1]}L${f(grip[0])} ${f(grip[1])}" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>`
    + `<path d="M${pivot[0]} ${pivot[1]}L${f(grip[0])} ${f(grip[1])}" stroke="${DECK.pipeLit}" stroke-width="6" stroke-linecap="round"/>`
    + `<circle cx="${f(grip[0])}" cy="${f(grip[1])}" r="11" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="4"/>`
    + `<circle cx="604" cy="340" r="9" fill="#FFB347" opacity="${f(0.4 + 0.6 * thrown)}" stroke="${INK}" stroke-width="3"/>`
    + (thrown > 0.5 ? lightPool(prefix, 'emergency', { cx: 604, cy: 340, rx: 120, ry: 90, color: '#FFB347', opacity: 0.5 * thrown }) : '');
  // The player's own character at the box, back to us, pulling the lever down with the far hand.
  const at = [606, 560], scale = 1.62;
  const toRig = ([px, py]) => [62 + (px - at[0]) / scale, 233 + (py - at[1]) / scale];
  const base = skeletonOf('wallPanelBack');
  const wF = toRig(grip);
  const sk = { ...base, wF, eF: reachTo(base.sF, wF, -1) };
  const worker = hero(prefix, { character, sk, at, scale });
  const middle = floor(prefix, { color: DECK.grate }) + box
    + (reduced ? worker : `<g transform="${breathe(t, at, 0.3, 0.006)}">${worker}</g>`);
  const near = `<rect width="${NOMINAL[0]}" height="${NOMINAL[1]}" fill="${NIGHT.deep}" opacity="${f(dark)}"/>`
    + (thrown > 0.5 ? lightPool(prefix, 'emergency-near', { cx: 604, cy: 340, rx: 260, ry: 200, color: '#FFB347', opacity: 0.24 * thrown }) : '')
    + particles({ origin: [556, 236], v: sparkV, count: 26, seed: 37, direction: -70, spread: 160, speed: 220, gravity: 260, color: '#FFE7A3', size: 3.4, streak: 0.05 })
    + motes({ x: 60, y: 60, w: 700, h: 360, t, count: 12, seed: 47, color: '#FFE7A3', opacity: 0.4 * (1 - dark), reduced })
    + sfxSvg('CLUNK', { x: 330, y: 360, size: 46, rotate: -8, pop: reduced ? 1 : easeOutBack(beat(t, [THROW[1], THROW[1] + 180]), 1.8), opacity: reduced ? 1 : 1 - beat(t, [THROW[1] + 800, THROW[1] + 1100]) });
  return shot(w, h, { far, middle, near }, { local: t, focus: [520, 260] });
}

/**
 * Panel 2 (memory): one charge. The stun rod in its open case under a lamp, a single charge cell
 * beside it glowing, and an envelope of credits pushed across the table by a gloved hand.
 */
export function panelCharge(local, { w, h, prefix, reduced = false }) {
  const t = local;
  const root = prefix.split('-p')[0];
  const pulse = reduced ? 1 : 0.75 + 0.25 * Math.sin(t / 240);
  const far = lightPool(prefix, 'lamp', { cx: 470, cy: 300, rx: 380, ry: 200, color: '#FFE7A3', opacity: 0.36 })
    + `<path d="M0 230H${NOMINAL[0]}" stroke="${INK}" stroke-width="3" opacity="0.4"/>`;
  const table = `<path d="M0 300H${NOMINAL[0]}V480H0Z" fill="${DECK.felt}" stroke="${INK}" stroke-width="5"/>`
    + `<path d="M0 302H${NOMINAL[0]}" stroke="${NIGHT.rim}" stroke-width="2.5" opacity="0.6"/>`
    + `<rect x="0" y="300" width="${NOMINAL[0]}" height="180" fill="url(#${root}-dots)" opacity="0.25"/>`;
  // The open case: the lid standing behind, the foam with the rod's cut-out and the cell's.
  const lid = `<path d="M300 300L320 130H760L780 300Z" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`
    + `<path d="M330 140H750" stroke="${NIGHT.steelLit}" stroke-width="3" opacity="0.7"/>`
    + `<path d="M336 160L330 290H770L764 160Z" fill="${DECK.foam}"/>`;
  const caseBody = contact(540, 520, 404)
    + `<rect x="290" y="296" width="500" height="104" rx="12" fill="${NIGHT.steelLit}" stroke="${INK}" stroke-width="6"/>`
    + `<rect x="306" y="306" width="468" height="70" rx="8" fill="${DECK.foamLit}" stroke="${INK}" stroke-width="3"/>`
    + `<path d="M298 300H782" stroke="${NIGHT.steelPale}" stroke-width="3" opacity="0.7"/>`;
  const rod = stunRod({ x: 322, y: 338, angle: 0, len: 330 }).svg;
  const big = body => `<g transform="translate(540 330) scale(1.16) translate(-540 -330)">${body}</g>`;
  // The single charge cell, lying in its own slot, glowing.
  const cell = `<rect x="676" y="318" width="44" height="40" rx="8" fill="${DECK.cell}" opacity="${f(0.7 + 0.3 * pulse)}" stroke="${INK}" stroke-width="4"/>`
    + `<rect x="684" y="312" width="28" height="8" rx="3" fill="${NIGHT.steelPale}" stroke="${INK}" stroke-width="3"/>`
    + lightPool(prefix, 'cell', { cx: 698, cy: 338, rx: 90, ry: 74, color: ARC.glow, opacity: 0.45 * pulse });
  // The envelope slides in under the gloved hand and stops on the table.
  const v = reduced ? 1 : easeOutCubic(beat(t, [120, 640]));
  const ex = -170 + 300 * v, ey = 386;
  const envelope = `<g transform="rotate(-6 ${f(ex + 110)} ${f(ey + 40)})">`
    + `<rect x="${f(ex + 18)}" y="${f(ey - 12)}" width="150" height="40" rx="3" fill="${DECK.bill}" stroke="${INK}" stroke-width="3"/>`
    + `<rect x="${f(ex)}" y="${f(ey)}" width="220" height="86" rx="5" fill="${DECK.envelope}" stroke="${INK}" stroke-width="4"/>`
    + `<path d="M${f(ex)} ${f(ey)}L${f(ex + 110)} ${f(ey + 48)}L${f(ex + 220)} ${f(ey)}" fill="none" stroke="${INK}" stroke-width="3"/>`
    + `<path d="M${f(ex + 6)} ${f(ey + 4)}H${f(ex + 214)}" stroke="${NIGHT.rim}" stroke-width="2.5" opacity="0.7"/></g>`;
  const glove = `<g transform="translate(${f(ex - 170 + 30 * (1 - v))} ${f(ey + 20)})">`
    + `<path d="M0 10Q40 -4 120 6L170 4Q196 6 196 24Q196 42 170 44L120 46Q40 56 0 40Z" fill="${DECK.glove}" stroke="${NIGHT.rim}" stroke-width="2.5"/>`
    + `<path d="M120 12Q150 10 186 14M120 26H190M120 38Q150 40 182 36" fill="none" stroke="${INK}" stroke-width="2.4"/></g>`;
  const near = envelope + glove
    + motes({ x: 300, y: 120, w: 420, h: 180, t, count: 12, seed: 59, color: '#FFE7A3', opacity: 0.5, reduced });
  return shot(w, h, { far, middle: table + big(lid + caseBody + rod + cell), near }, { local: t, focus: [460, 330], push: 0.06 });
}

/** When the charge arcs (ms after the panel slams in). */
const ARC_AT = Object.freeze([300, 520]);

/**
 * Panel 3 (now, aboard): a dark cabin with a silhouette in it. The rod reaches in from the edge, its
 * charge arcs once to the silhouette, and the cabin's light dips.
 */
export function panelArc(local, { w, h, prefix, reduced = false }) {
  const t = local;
  const root = prefix.split('-p')[0];
  const struck = reduced ? 0 : beat(t, ARC_AT);
  const live = reduced ? 1 : beat(t, [100, ARC_AT[0]]);
  const dip = reduced ? 0.16 : 0.16 + 0.34 * Math.sin(Math.PI * clamp01((t - ARC_AT[0]) / 520));
  // The cabin: a porthole on the stars, a bunk along the wall, the ceiling strip that dips.
  const far = `<defs><clipPath id="${prefix}-port"><circle cx="190" cy="170" r="70"/></clipPath></defs>`
    + `<circle cx="190" cy="170" r="70" fill="#060812"/><g clip-path="url(#${prefix}-port)">${stars({ x: 110, y: 90, w: 160, h: 160, count: 26, seed: 71, t: t + 900 })}</g>`
    + `<circle cx="190" cy="170" r="70" fill="none" stroke="${NIGHT.steelLit}" stroke-width="10"/><circle cx="190" cy="170" r="70" fill="none" stroke="${INK}" stroke-width="4"/>`
    + lightPool(prefix, 'port', { cx: 220, cy: 220, rx: 220, ry: 200, color: NIGHT.slat, opacity: 0.22 })
    + `<rect x="250" y="12" width="330" height="12" rx="5" fill="#FFF3C4" opacity="${f(1 - dip)}" stroke="${INK}" stroke-width="4"/>`
    + lightPool(prefix, 'strip', { cx: 415, cy: 160, rx: 300, ry: 190, color: NIGHT.slat, opacity: 0.3 * (1 - dip) });
  const bunk = contact(170, 300, 452)
    + `<rect x="20" y="330" width="300" height="34" rx="6" fill="${DECK.bunk}" stroke="${INK}" stroke-width="5"/>`
    + `<rect x="20" y="364" width="300" height="70" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="5"/>`
    + `<path d="M26 334H314" stroke="${NIGHT.rim}" stroke-width="2.5" opacity="0.6"/>`;
  // The silhouette standing in the cabin, rim-lit by the porthole; the arc lights its rim brighter.
  const at = [420, 470];
  const figure = silhouette(`${prefix}-occupant`, { gesture: 'standFolded', at, scale: 1.42, rim: [-5, -4] });
  const middle = floor(prefix, { color: DECK.grate }) + bunk
    + (reduced ? figure : `<g transform="${breathe(t, at, 1.1, 0.008)}">${figure}</g>`);
  // The rod reaches in from the right edge, held in a gloved fist.
  const rod = stunRod({ x: 790, y: 440, angle: 204, len: 250, live, held: true });
  const target = [446, 290];
  const bolt = struck > 0 && struck < 1 ? arcSvg(prefix, { from: rod.tip, to: target, t, seed: 3, glow: `${root}-glow` }) : '';
  const flash = struck > 0 && struck < 1 ? `<rect width="${NOMINAL[0]}" height="${NOMINAL[1]}" fill="${ARC.glow}" opacity="${f(0.12 * Math.sin(Math.PI * struck))}"/>` : '';
  const near = `<rect width="${NOMINAL[0]}" height="${NOMINAL[1]}" fill="${NIGHT.deep}" opacity="${f(dip * 0.45)}"/>`
    + rod.svg + bolt + flash
    + particles({ origin: target, v: reduced ? 0 : beat(t, [ARC_AT[0] + 60, ARC_AT[0] + 560]), count: 18, seed: 83, direction: -90, spread: 240, speed: 120, gravity: 140, color: ARC.glow, size: 3, streak: 0.04 })
    + sfxSvg('ZZT', { x: 600, y: 120, size: 48, rotate: 8, pop: reduced ? 1 : easeOutBack(beat(t, [ARC_AT[0], ARC_AT[0] + 160]), 1.8), opacity: reduced ? 1 : 1 - beat(t, [ARC_AT[0] + 900, ARC_AT[0] + 1200]) });
  return shot(w, h, { far, middle, near }, { local: t, focus: [430, 280] });
}

/** The Disablers' panels, in order (one film for both). */
export const DISABLER_PANELS = Object.freeze([panelDecks, panelCharge, panelArc]);
