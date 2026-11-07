// mothership:dev-only
//
// The Supplier's three panels (docs/design/cinematic/role-reveal.md, "Supplier"): the fixer of the
// Belt markets, told around the player's own character:
//   1  the Belt markets (memory, in sepia): a stall that sells everything, crates stacked up to a
//      swinging lamp, the player's character leaning on them; a crate lands on the counter (CLANK)
//   2  two crates, off the books (memory): the player's character crouched at a false floor that
//      lifts on two sealed crates
//   3  aboard, ahead (a glimpse of the work to come, not an event of the match): the cargo hold; two crates come down on the hoist and land, one beside each of
//      two silhouettes, a blank tag on each
// What the pictures show: two deliveries, kept secret; the role card says when and what. No
// recipient has a face, number or name, and no tag is written on.
//
// Each panel is a pure function (local ms since the panel slammed in, { w, h, prefix, seat, character, reduced })
// -> SVG markup, drawn for a nominal 828 x 480 panel and scaled to its height (stagecraft.mjs shot()).

import { skeletonOf } from '../../../board-motion/figures/gestures.mjs';
import { INK, lightCone, lightPool, particles } from '../../lib/comic.mjs';
import { beat, clamp01, easeInOutCubic, easeOutBack, easeOutCubic } from '../../lib/ease.mjs';
import { NIGHT, lampFlicker, motes, sfxSvg } from './art.mjs';
import { NOMINAL, breathe, contact, floor, hangingLamp, hero, shot, silhouette } from './stagecraft.mjs';

const f = v => Number((+v).toFixed(2));
/** A drop that lands and bounces twice, smaller each time (0..1 in, 0..1 out). */
const easeOutBounce = v => {
  const n = 7.5625, d = 2.75;
  if (v < 1 / d) return n * v * v;
  if (v < 2 / d) return n * (v -= 1.5 / d) * v + 0.75;
  if (v < 2.5 / d) return n * (v -= 2.25 / d) * v + 0.9375;
  return n * (v -= 2.625 / d) * v + 0.984375;
};
/** The market's and the hold's own fills (held clear of the faction accents by the palette test). */
const GOODS = Object.freeze({ crate: '#7A5E3C', crateLit: '#A8865A', crateDark: '#4E3A24', band: '#2E3542', awning: '#8E7B5A', awningDark: '#5E5038', counter: '#5A4630', plank: '#4A3A28', plankLit: '#6E5A40', hold: '#2A3346', container: '#3E4A60', containerLit: '#5D6B84', tag: '#E9E1CC', seal: '#8C5A3C', bottle: '#6F7F6A', can: '#9A8E78' });

/** A wooden crate with iron bands at (x, y), w x h, lit on its top edge. */
export function crate({ x, y, w, h, lit = 1, seal = false }) {
  return `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="4" fill="${GOODS.crate}" stroke="${INK}" stroke-width="5"/>`
    + `<path d="M${f(x + 6)} ${f(y + h * 0.33)}H${f(x + w - 6)}M${f(x + 6)} ${f(y + h * 0.66)}H${f(x + w - 6)}" stroke="${GOODS.crateDark}" stroke-width="3"/>`
    + `<rect x="${f(x + w * 0.16)}" y="${f(y)}" width="${f(w * 0.08)}" height="${f(h)}" fill="${GOODS.band}" stroke="${INK}" stroke-width="2.5"/>`
    + `<rect x="${f(x + w * 0.76)}" y="${f(y)}" width="${f(w * 0.08)}" height="${f(h)}" fill="${GOODS.band}" stroke="${INK}" stroke-width="2.5"/>`
    + `<path d="M${f(x + 4)} ${f(y + 4)}H${f(x + w - 4)}" stroke="${GOODS.crateLit}" stroke-width="4" opacity="${f(0.85 * lit)}"/>`
    + (seal ? `<circle cx="${f(x + w / 2)}" cy="${f(y + h / 2)}" r="${f(Math.min(w, h) * 0.13)}" fill="${GOODS.seal}" stroke="${INK}" stroke-width="3"/><circle cx="${f(x + w / 2 - 3)}" cy="${f(y + h / 2 - 3)}" r="${f(Math.min(w, h) * 0.04)}" fill="${NIGHT.rim}" opacity="0.7"/>` : '');
}

/** A blank shipping tag on its string, hanging from (x, y), swinging `swing` degrees. */
function tag({ x, y, swing = 0 }) {
  return `<g transform="rotate(${f(swing)} ${f(x)} ${f(y)})"><path d="M${f(x)} ${f(y)}V${f(y + 22)}" stroke="${INK}" stroke-width="2.5"/>`
    + `<path d="M${f(x - 18)} ${f(y + 30)}L${f(x - 10)} ${f(y + 22)}H${f(x + 10)}L${f(x + 18)} ${f(y + 30)}V${f(y + 74)}H${f(x - 18)}Z" fill="${GOODS.tag}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
    + `<circle cx="${f(x)}" cy="${f(y + 31)}" r="3.5" fill="${INK}"/></g>`;
}

/**
 * Panel 1 (memory): the Belt markets. A stall under an awning, shelves of goods behind it, crates
 * stacked to a swinging lamp, the player's character leaning back on them; a crate lands on the
 * counter (CLANK).
 */
export function panelMarket(local, { w, h, prefix, character = 'c4', reduced = false }) {
  const t = local;
  const root = prefix.split('-p')[0];
  // The shelves of goods behind the stall: bottles, cans and boxes on three boards.
  let shelves = '';
  for (let r = 0; r < 3; r += 1) {
    const sy = 120 + r * 70;
    shelves += `<rect x="40" y="${sy}" width="300" height="8" fill="${GOODS.counter}" stroke="${INK}" stroke-width="3"/>`;
    for (let i = 0; i < 7; i += 1) {
      const gx = 52 + i * 41 + (r % 2) * 10, kind = (i + r) % 3;
      shelves += kind === 0 ? `<rect x="${gx}" y="${sy - 40}" width="16" height="40" rx="5" fill="${GOODS.bottle}" stroke="${INK}" stroke-width="2.5"/><rect x="${gx + 5}" y="${sy - 50}" width="6" height="12" fill="${GOODS.bottle}" stroke="${INK}" stroke-width="2"/>`
        : kind === 1 ? `<rect x="${gx}" y="${sy - 28}" width="24" height="28" rx="3" fill="${GOODS.can}" stroke="${INK}" stroke-width="2.5"/>`
          : `<rect x="${gx}" y="${sy - 34}" width="30" height="34" fill="${GOODS.crateLit}" stroke="${INK}" stroke-width="2.5"/>`;
    }
  }
  // The awning's scalloped edge across the top.
  let scallops = '';
  for (let sx = 0; sx < NOMINAL[0]; sx += 46) scallops += `<path d="M${sx} 44Q${sx + 23} 74 ${sx + 46} 44" fill="${(sx / 46) % 2 ? GOODS.awning : GOODS.awningDark}" stroke="${INK}" stroke-width="3"/>`;
  const on = reduced ? 1 : lampFlicker(t, 13) * 0.2 + 0.8;
  const far = shelves
    + `<rect x="0" y="0" width="${NOMINAL[0]}" height="46" fill="${GOODS.awningDark}" stroke="${INK}" stroke-width="4"/>` + scallops
    + lightPool(prefix, 'stall', { cx: 470, cy: 260, rx: 360, ry: 200, color: '#FFE7A3', opacity: 0.18 * on });
  // The crates stacked behind the counter, and the player's character leaning back on them.
  const stack = crate({ x: 560, y: 190, w: 150, h: 100 }) + crate({ x: 580, y: 100, w: 120, h: 90 }) + crate({ x: 530, y: 290, w: 200, h: 120 });
  const at = [520, 470];
  const leaner = hero(prefix, { character, sk: skeletonOf('leanCrates'), at, scale: 1.5 });
  const middle = floor(prefix, { y: 430, color: GOODS.plank })
    + hangingLamp(prefix, { x: 470, y: 64, floor: 430, on, swing: reduced ? 0 : 3 * Math.sin(t / 900) })
    + stack + (reduced ? leaner : `<g transform="${breathe(t, at, 0.5, 0.008)}">${leaner}</g>`);
  // The counter in front, and a crate dropped on it.
  const drop = reduced ? 1 : easeOutBounce(clamp01(t / 420));
  const landed = reduced ? 1 : beat(t, [380, 420]);
  const counter = `<rect x="40" y="380" width="460" height="110" fill="${GOODS.counter}" stroke="${INK}" stroke-width="6"/>`
    + `<rect x="28" y="368" width="484" height="18" rx="4" fill="${GOODS.plankLit}" stroke="${INK}" stroke-width="5"/>`
    + `<path d="M34 371H506" stroke="${NIGHT.rim}" stroke-width="2.5" opacity="0.7"/>`
    + `<rect x="40" y="386" width="460" height="94" fill="url(#${root}-dots)" opacity="0.22"/>`;
  const dropped = crate({ x: 180, y: 268 - 220 * (1 - drop), w: 150, h: 100, seal: false });
  const near = counter + contact(255, 170, 372) + dropped
    + particles({ origin: [255, 368], v: reduced ? 0 : beat(t, [400, 900]), count: 14, seed: 91, direction: -90, spread: 170, speed: 80, gravity: 30, color: '#E9D9B8', size: 3, streak: 0.02 })
    + motes({ x: 320, y: 120, w: 300, h: 260, t, count: 14, seed: 43, color: '#FFE7A3', opacity: 0.5, reduced })
    + sfxSvg('CLANK', { x: 250, y: 220, size: 44, rotate: -6, pop: reduced ? 1 : easeOutBack(landed > 0 ? beat(t, [400, 580]) : 0, 1.8), opacity: reduced ? 1 : 1 - beat(t, [1200, 1500]) });
  return shot(w, h, { far, middle, near }, { local: t, focus: [420, 300] });
}

/**
 * Panel 2 (memory): two crates, off the books. The back room's plank floor; the player's character
 * crouched at a false floor that lifts on two sealed crates, lit by a work lamp.
 */
export function panelFalseFloor(local, { w, h, prefix, character = 'c4', reduced = false }) {
  const t = local;
  const root = prefix.split('-p')[0];
  const lift = reduced ? 1 : easeInOutCubic(beat(t, [120, 700]));
  // The floor in perspective: planks running back to the wall.
  let planks = '';
  for (let i = 0; i <= 12; i += 1) {
    const xb = -100 + i * 86, xt = 140 + i * 46;
    planks += `<path d="M${f(xt)} 170L${f(xb)} 480" stroke="${INK}" stroke-width="3" opacity="0.7"/>`;
  }
  const far = `<rect x="0" y="0" width="${NOMINAL[0]}" height="172" fill="${GOODS.crateDark}"/>`
    + `<path d="M0 172H${NOMINAL[0]}" stroke="${NIGHT.rim}" stroke-width="2" opacity="0.4"/>`
    + `<path d="M0 170H${NOMINAL[0]}V480H0Z" fill="${GOODS.plank}"/>` + planks
    + `<rect x="0" y="170" width="${NOMINAL[0]}" height="310" fill="url(#${root}-dots)" opacity="0.2"/>`;
  // The hatch: a dark cavity with two sealed crates, its lid lifting toward us on its far hinge.
  const hole = `<path d="M250 260H560L600 400H210Z" fill="#0E0B07" stroke="${INK}" stroke-width="5"/>`;
  const crates = `<g opacity="${f(0.25 + 0.75 * lift)}">${crate({ x: 252, y: 300, w: 140, h: 86, seal: true })}${crate({ x: 410, y: 296, w: 150, h: 90, seal: true })}</g>`;
  const lidH = 140 * (1 - 1.55 * lift);
  const lid = `<path d="M250 260H560L${f(560 + 40 * (lidH / 140))} ${f(260 + lidH)}H${f(250 - 40 * (lidH / 140))}Z" fill="${lidH >= 0 ? GOODS.plankLit : GOODS.plank}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
    + `<path d="M330 260L${f(330 - 12 * (lidH / 140))} ${f(260 + lidH)}M405 260V${f(260 + lidH)}M480 260L${f(480 + 12 * (lidH / 140))} ${f(260 + lidH)}" stroke="${INK}" stroke-width="3" opacity="0.7"/>`;
  const beam = lightCone(prefix, 'work', { from: [120, -20], to: [410, 340], spread: 170, color: '#FFE7A3', opacity: 0.32 * (0.4 + 0.6 * lift), near: 20 })
    + lightPool(prefix, 'cavity', { cx: 405, cy: 330, rx: 210, ry: 90, color: '#FFE7A3', opacity: 0.3 * lift });
  // The player's character crouched at the hatch's edge, a hand on the floor.
  const at = [690, 520];
  const crouch = hero(prefix, { character, sk: skeletonOf('crouchHatch'), at, scale: 1.6 });
  const near = lid + (reduced ? crouch : `<g transform="${breathe(t, at, 0.2, 0.01)}">${crouch}</g>`)
    + motes({ x: 220, y: 60, w: 300, h: 260, t, count: 14, seed: 61, color: '#FFE7A3', opacity: 0.55, reduced });
  return shot(w, h, { far, middle: hole + crates + beam, near }, { local: t, focus: [420, 320], push: 0.06 });
}

/** The two deliveries: where each crate comes down beside its recipient, and when it lands. */
const DELIVERIES = Object.freeze([
  Object.freeze({ x: 222, land: 520, figure: [140, 470] }),
  Object.freeze({ x: 560, land: 760, figure: [700, 470] }),
]);

/**
 * Panel 3 (now, aboard): the cargo hold. Two silhouettes wait; two crates come down on the hoist
 * and land, one beside each, and a blank tag swings on each crate.
 */
export function panelHold(local, { w, h, prefix, reduced = false }) {
  const t = local;
  // The hold: containers stacked along the back wall, a gantry rail across the top, a strip light.
  let containers = '';
  [[20, 150, 230, 130], [260, 120, 300, 160], [570, 150, 240, 130], [80, 40, 300, 110], [470, 30, 280, 120]].forEach(([cx, cy, cw, ch], i) => {
    containers += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="${i % 2 ? GOODS.container : GOODS.hold}" stroke="${INK}" stroke-width="4"/>`;
    for (let rx = cx + 14; rx < cx + cw - 8; rx += 18) containers += `<path d="M${rx} ${cy + 8}V${cy + ch - 8}" stroke="${INK}" stroke-width="2" opacity="0.45"/>`;
    containers += `<path d="M${cx + 4} ${cy + 4}H${cx + cw - 4}" stroke="${GOODS.containerLit}" stroke-width="3" opacity="0.8"/>`;
  });
  const far = containers
    + `<rect x="0" y="0" width="${NOMINAL[0]}" height="16" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="4"/>`
    + lightPool(prefix, 'hold', { cx: 414, cy: 260, rx: 420, ry: 240, color: NIGHT.slat, opacity: 0.16 });
  let middle = floor(prefix, { color: '#10151F' });
  let near = '';
  DELIVERIES.forEach((d, i) => {
    const v = reduced ? 1 : easeOutCubic(beat(t, [d.land - 420, d.land]));
    const settle = reduced ? 1 : beat(t, [d.land, d.land + 160]);
    const cy = 330 - (1 - v) * 330;
    // The two recipients, silhouettes rim-lit by the hold's light, waiting.
    middle += silhouette(`${prefix}-r${i}`, { gesture: 'standBack', at: d.figure, scale: 1.25, rim: [i ? 4 : -4, -4] });
    near += `<path d="M${d.x + 60} 0V${f(cy)}" stroke="${INK}" stroke-width="4" opacity="${f(1 - settle)}"/>`
      + `<path d="M${d.x + 60} ${f(cy)}L${d.x + 20} ${f(cy + 4)}M${d.x + 60} ${f(cy)}L${d.x + 100} ${f(cy + 4)}" stroke="${INK}" stroke-width="3" opacity="${f(1 - settle)}"/>`
      + (v > 0.98 ? contact(d.x + 60, 150, 448) : '')
      + crate({ x: d.x, y: cy + 4, w: 120, h: 110 })
      + (v >= 1 ? tag({ x: d.x + 96, y: cy + 10, swing: reduced ? 8 : 8 + 14 * Math.exp(-(t - d.land) / 300) * Math.sin((t - d.land) / 70) }) : '')
      + particles({ origin: [d.x + 60, 446], v: reduced ? 0 : beat(t, [d.land, d.land + 500]), count: 12, seed: 97 + i, direction: -90, spread: 170, speed: 70, gravity: 30, color: NIGHT.steelPale, size: 3, streak: 0.02 });
  });
  return shot(w, h, { far, middle, near }, { local: t, focus: [414, 300] });
}

/** The Supplier's panels, in order. */
export const SUPPLIER_PANELS = Object.freeze([panelMarket, panelFalseFloor, panelHold]);
