// mothership:dev-only
//
// The pilot's heads (cast.mjs), drawn in the rig's head frame (design/board-motion/figures/crew.mjs):
// the middle of the face at 0,0, the chin near 16, the top of the skull near -16. 'front' is the
// three-quarter view facing left, 'down' looks down (the lids lowered) and 'back' is turned away.
//
// The faces are the owner's own art. Each head is traced from the owner's drawing (faces/, made by
// design/tools/character-pilot-trace.py) and fitted to the head frame by the eyes and the chin. The
// rig adds the motion: lids that close over the drawn eyes, and Mira's hair, below the jaw, swinging
// with the hair's follow-through. From behind, the head is drawn in the same colours.
//
// Motion the animation feeds in (anim.mjs), never anything about the game:
// - blink 0..1: how far the lids are closed;
// - sway, lift: how far the hair's free ends trail (units in this frame), for follow-through.

import { ATLAS_HEAD } from './faces/atlas.mjs';
import { ECHO_HEAD } from './faces/echo.mjs';
import { JUNO_HEAD } from './faces/juno.mjs';
import { LYRA_HEAD } from './faces/lyra.mjs';
import { MIRA_HEAD } from './faces/mira.mjs';
import { NOVA_HEAD } from './faces/nova.mjs';
import { ORION_HEAD } from './faces/orion.mjs';
import { RIGEL_HEAD } from './faces/rigel.mjs';
import { VEGA_HEAD } from './faces/vega.mjs';
import { INK, shade, tint } from './ink.mjs';

/** Each character's head, traced from the owner's art: { id, eyes, neck, skin, hair, sway, paths } (faces/). */
export const TRACED_HEADS = Object.freeze({
  c1: VEGA_HEAD, c2: RIGEL_HEAD, c3: LYRA_HEAD, c4: ATLAS_HEAD, c5: ORION_HEAD,
  c6: NOVA_HEAD, c7: JUNO_HEAD, c8: MIRA_HEAD, c9: ECHO_HEAD,
});

const f2 = n => n.toFixed(2);

/** Points along the free end of a lock of hair, moved by the hair's follow-through (more toward the tip). */
const trail = (points, { sway = 0, lift = 0 }, from = 0.35) => points.map(([x, y]) => {
  const k = Math.max(0, (y - from * 30) / 40);
  return [x + sway * k, y + lift * k];
});

// ---------- The traced head ----------

/** The traced art, once, as a symbol the head draws (twice when its hanging hair swings). */
function artSymbol(cv, head) {
  const id = cv.uid('head');
  cv.def(`<g id="${id}">${head.paths.map(([fill, d]) => `<path fill="${fill}" d="${d}"/>`).join('')}</g>`);
  return id;
}

/**
 * The hair hanging below the line it hangs from (head.sway) swings and lifts with the follow-through:
 * the art above the line is drawn as it is; below it, the same art is skewed about the line, so the
 * two meet without a seam and the ends move most.
 */
function hangingHair(cv, head, art, { sway, lift }) {
  const y = head.sway;
  const above = cv.uid('hang'), below = cv.uid('hang');
  cv.def(`<clipPath id="${above}"><rect x="-80" y="-80" width="160" height="${f2(80 + y + 0.4)}"/></clipPath>`);
  cv.def(`<clipPath id="${below}"><rect x="-80" y="${f2(y)}" width="160" height="80"/></clipPath>`);
  // The ends hang about 15 below the line; they trail by about 0.6 of the sway and lift, as the
  // back view's locks do.
  const skew = Math.atan(sway / 24) * (180 / Math.PI), stretch = 1 + lift / 24;
  cv.raw(`<use href="#${art}" clip-path="url(#${above})"/>`);
  cv.raw(`<g clip-path="url(#${below})"><g transform="translate(0 ${f2(y)}) skewX(${f2(skew)}) scale(1 ${stretch.toFixed(3)}) translate(0 ${f2(-y)})"><use href="#${art}"/></g></g>`);
}

/**
 * The lids: closed 0..1. Each comes down over a drawn eye (head.eyes, ellipses) in the head's skin,
 * its edge curving down and inked as a lash line; shut, the edge lies along the eye's lower lid.
 */
function lids(cv, head, closed) {
  if (closed <= 0) return;
  const k = Math.min(1, closed);
  for (const [cx, cy, rx, ry] of head.eyes) {
    const clip = cv.uid('lid');
    cv.def(`<clipPath id="${clip}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath>`);
    const sag = ry * 0.32, edge = cy - ry - sag + 2 * ry * k;
    const left = cx - rx - 0.4, right = cx + rx + 0.4, low = edge + 2 * sag;
    const curve = `Q${f2(cx)} ${f2(low)}`;
    cv.raw(`<g clip-path="url(#${clip})"><path d="M${f2(left)} ${f2(cy - ry - 1)}H${f2(right)}V${f2(edge)}${curve} ${f2(left)} ${f2(edge)}Z" fill="${head.skin}"/>`
      + `<path d="M${f2(left)} ${f2(edge)}${curve} ${f2(right)} ${f2(edge)}" fill="none" stroke="${INK}" stroke-width="${f2(Math.max(0.7, ry * 0.3))}" stroke-linecap="round"/></g>`);
  }
}

function tracedFront(cv, head, motion, down) {
  const art = artSymbol(cv, head);
  if (head.sway == null) cv.raw(`<use href="#${art}"/>`);
  else hangingHair(cv, head, art, motion);
  lids(cv, head, down ? 1 : motion.blink);
}

// ---------- From behind ----------

/**
 * The back view fitted to the size of the traced head: [x scale, y scale, y shift]. Mira's hair from
 * behind is as full and long as her front's; Nova's bob and headphones and Atlas's crop as tall;
 * Orion's bald head as large. The other heads are drawn at their traced size.
 */
const BACK_FIT = Object.freeze({ long: [1.2, 1, -7.5], bob: [1.08, 1.23, -0.8], quiff: [1, 1.12, -1.2], bald: [1.1, 1.1, -4] });

/** A rounded mass with a bumpy edge (curls, a bun), as points for a form. */
const bumpy = (cx, cy, rx, ry, n, bump) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2, k = 1 + (i % 2 ? -bump : bump);
  return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
});

function headBack(cv, c, motion) {
  const [sx, sy, dy] = BACK_FIT[c.hairStyle] ?? [1, 1, 0];
  cv.group(`translate(0 ${dy}) scale(${sx} ${sy})`, () => backShapes(cv, c, motion));
}

function backShapes(cv, c, motion) {
  if (c.hairStyle === 'long') {
    cv.form(trail([[-14, -8], [-10, -18.4], [0, -21], [10, -18.4], [15.4, -6], [16.4, 8], [19, 20], [17.6, 31.6], [20, 39.6], [11, 42.6], [4, 37.6], [-4, 42.4], [-12.6, 38], [-12.4, 28], [-16, 18], [-15.6, 6]], motion), c.hair, { weight: 2.2, depth: 4.4, seed: 73, wobble: 0.5 });
    for (const lock of [[[-6, -14], [-8, 4], [-6, 20], [-8, 34]], [[2, -15], [4, 4], [2, 22], [4, 36]], [[9, -12], [12, 4], [11, 20], [14, 33]]]) cv.line(trail(lock, motion), { weight: 0.9, color: c.hairLight, opacity: 0.85 });
    return;
  }
  if (c.hairStyle === 'afro') {
    // Vega: a full cloud of curls hiding the ears, the headband across its top.
    cv.form(bumpy(0, -11, 21, 21.5, 22, 0.05), c.hair, { weight: 2.2, depth: 4.4, seed: 131, wobble: 0.6 });
    for (const [x, y] of [[-12, -18], [-4, -24], [6, -21], [13, -12], [-15, -6], [-6, -10], [5, -6], [12, 0], [-9, 1], [1, 4]]) {
      cv.line([[x - 2, y + 1], [x, y - 1.4], [x + 2.2, y + 0.6]], { weight: 0.9, color: c.hairLight, opacity: 0.85, seed: 133 });
    }
    cv.line([[-18.6, -14], [-11, -25.6], [0, -28.8], [11, -25.6], [18.6, -14]], { weight: 2.6, color: c.band, taper: 'none' });
    return;
  }
  if (c.hairStyle === 'locs') {
    // Echo: locs from the crown, hanging down the back past the neck, over the visor's strap.
    cv.form([[-14, -3], [-14.8, -12], [-9.4, -20], [0, -22.4], [9.4, -20], [14.8, -12], [14, -3], [7, 2], [0, 0.6], [-7, 2]], c.hair, { weight: 2.1, depth: 3, seed: 137 });
    cv.line([[-15, -4], [-7, -5.4], [0, -5.8], [7, -5.4], [15, -4]], { weight: 2.4, color: c.gear, taper: 'none' });
    for (const [i, x] of [-12, -8, -4, 0, 4, 8, 12].entries()) {
      const end = 22 + (i % 3) * 3.4;
      cv.limb(trail([[x * 0.9, -16], [x * 1.08, 4], [x * 1.18, end]], motion), [2.4, 2.2, 1.9], c.hair, { weight: 1.4, seed: 139 + i, rim: false });
      cv.line(trail([[x * 1.02, -2], [x * 1.12, 10]], motion), { weight: 0.8, color: c.hairLight, opacity: 0.8, seed: 141 + i });
    }
    return;
  }
  for (const side of [-1, 1]) cv.form([[11 * side, -4], [14.6 * side, -4.6], [15.2 * side, 1.6], [12.4 * side, 5.6], [10.6 * side, 2]], c.skin, { weight: 1.5, depth: 1, rim: false, grain: false, seed: 79 + side });
  cv.form([[-11.6, -11], [-13, -2], [-11.6, 6.6], [-6, 13], [0, 14.4], [6, 13], [11.6, 6.6], [13, -2], [11.6, -11], [0, -15.4]], c.skin, { weight: 2, depth: 3, seed: 83 });
  if (c.hairStyle === 'beanie') {
    // Rigel: ginger hair at the back below the beanie, and the beanie with its rolled cuff.
    cv.form([[-13.6, -8], [-14, 0], [-12.4, 7], [-6.4, 11.8], [0, 12.6], [6.4, 11.8], [12.4, 7], [14, 0], [13.6, -8]], c.hair, { weight: 2, depth: 2.8, seed: 143 });
    cv.form([[-15.4, -6], [-15.8, -14.6], [-12, -22.4], [-4.4, -27.2], [4.4, -27.2], [12, -22.4], [15.8, -14.6], [15.4, -6]], c.band, { weight: 2.2, depth: 3.4, seed: 145 });
    cv.form([[-16.4, -10.6], [16.4, -10.6], [16.6, -4], [-16.6, -4]], shade(c.band, 0.18), { weight: 1.8, depth: 1.6, seed: 147, tension: 0.4 });
    for (let x = -13; x <= 13; x += 3.25) cv.line([[x, -9.6], [x * 1.01, -5]], { weight: 0.55, color: shade(c.band, 0.45), taper: 'none', seed: 149 });
    return;
  }
  if (c.hairStyle === 'bun') {
    // Lyra: hair drawn up to a bun on the crown, its tie, and loose strands at the nape.
    cv.form([[-14, 0], [-14.6, -10], [-9, -19], [0, -22], [9, -19], [14.6, -10], [14, 0], [9, 5], [0, 3.6], [-9, 5]], c.hair, { weight: 2.1, depth: 3, seed: 151 });
    cv.form(bumpy(1, -27, 8, 7.4, 12, 0.06), c.hair, { weight: 2, depth: 3, seed: 153, wobble: 0.5 });
    cv.line([[-3, -29], [1, -32], [5, -28.6]], { weight: 0.9, color: c.hairLight, opacity: 0.85 });
    cv.line([[-5.4, -21.4], [1, -20.2], [7, -21.4]], { weight: 2.2, color: c.band, taper: 'none' });
    for (const [x, d] of [[-10, -1], [9, 1], [-4, -1]]) cv.line([[x, 3], [x + d * 1.4, 8], [x + d * 0.6, 12]], { weight: 1, color: c.hair, taper: 'end' });
    for (const lock of [[[-8, -16], [-6, -6]], [[3, -19], [4, -8]], [[10, -14], [9, -4]]]) cv.line(lock, { weight: 0.8, color: c.hairLight, opacity: 0.8 });
    return;
  }
  if (c.hairStyle === 'bald') {
    // Orion: the bald crown catching the light, and wild white hair round the back and sides.
    cv.flat([[-6, -12.4], [-1, -14], [2, -11], [-3, -9.6]], tint(c.skin, 0.35), { opacity: 0.7 });
    cv.form([[-14, -9], [-16.4, -3], [-15, 4], [-10, 10.4], [0, 12.4], [10, 10.4], [15, 4], [16.4, -3], [14, -9], [11, -3], [6, 3], [0, 4.6], [-6, 3], [-11, -3]], c.hair, { weight: 1.9, depth: 2.6, seed: 157, wobble: 0.5 });
    for (const side of [-1, 1]) {
      cv.form([[13 * side, -10], [20 * side, -14.6], [17.6 * side, -8], [23 * side, -6.6], [17 * side, -3], [21 * side, 1], [15 * side, 1.6]], c.hair, { weight: 1.7, depth: 2, seed: 159 + side, tension: 0.4 });
      cv.line([[14 * side, -8.6], [19 * side, -11.6]], { weight: 0.7, color: c.hairLight, opacity: 0.9 });
    }
    for (const lock of [[[-8, 4], [-4, 8]], [[3, 6], [7, 4]]]) cv.line(lock, { weight: 0.7, color: c.hairLight, opacity: 0.9 });
    return;
  }
  if (c.hairStyle === 'messy') {
    // Juno: messy hair with tufts sticking up and out, and the goggles' strap round the back.
    cv.form([[-14.4, 4], [-15, -6], [-18.4, -9], [-14.6, -12], [-17.4, -17], [-11, -18], [-10, -24], [-4, -21], [0, -26.4], [4, -21.6], [10, -24.6], [10.6, -18.6], [17, -18], [14.6, -12], [18.4, -8], [15, -5], [14.4, 4], [9, 10.4], [3, 12], [-3, 12], [-9, 10.4]], c.hair, { weight: 2, depth: 3, seed: 163, tension: 0.35 });
    for (const lock of [[[-9, -14], [-12, -20]], [[1, -16], [0, -23]], [[7, -14], [10, -20]], [[-4, -6], [-6, 0]], [[6, -6], [8, 1]]]) cv.line(lock, { weight: 0.8, color: c.hairLight, opacity: 0.9 });
    cv.line([[-15.4, -11.4], [-8, -14], [0, -14.6], [8, -14], [15.4, -11.4]], { weight: 2.4, color: c.gear, taper: 'none' });
    return;
  }
  if (c.hairStyle === 'bob') {
    cv.form([[-15.6, 9.6], [-16.4, -6], [-11, -17.6], [0, -20.6], [11, -17.6], [16.4, -6], [15.6, 9.6], [6, 10.4], [0, 9.6], [-6, 10.4]], c.hair, { weight: 2.2, depth: 3.4, seed: 89, tension: 0.8 });
  } else {
    cv.form([[-13.6, 0], [-14, -10.6], [-7, -20.6], [2, -21.6], [10.6, -19.6], [14.6, -9.6], [13.6, 0.6], [8, 4.6], [0, 3.4], [-8, 4.6]], c.hair, { weight: 2.1, depth: 3, seed: 97, wobble: 0.5 });
  }
  if (c.headphones) {
    cv.line([[-14.6, -4], [-10, -18.6], [0, -22.4], [10, -18.6], [14.6, -4]], { weight: 2.6, color: c.gear, taper: 'none' });
    for (const side of [-1, 1]) cv.form([[13 * side, -5.6], [17 * side, -4.6], [17.6 * side, 3], [13.6 * side, 5.4], [12 * side, 0]], c.gear, { weight: 1.6, depth: 1.4, seed: 101 + side });
  }
}

/**
 * The head, in its own frame. view: 'front', 'down' or 'back'. motion: { blink, sway, lift }.
 */
export function pilotHead(cv, c, view = 'front', motion = {}) {
  const m = { blink: motion.blink ?? 0, sway: motion.sway ?? 0, lift: motion.lift ?? 0 };
  if (view === 'back') { headBack(cv, c, m); return; }
  tracedFront(cv, TRACED_HEADS[c.id], m, view === 'down');
}
