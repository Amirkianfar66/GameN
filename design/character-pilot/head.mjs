// mothership:dev-only
//
// The pilot's heads (cast.mjs), drawn in the rig's head frame (design/board-motion/figures/crew.mjs):
// the middle of the face at 0,0, chin near 15, the top of the skull near -16. 'front' is the
// three-quarter view facing left, 'down' looks down (the eyes lids) and 'back' is turned away.
//
// Motion the animation feeds in (anim.mjs), never anything about the game:
// - blink 0..1: how far the lids are closed;
// - sway, lift: how far the hair's free ends trail (units in this frame), for follow-through.

import { INK, add, lerp, shade, tint } from './ink.mjs';

const EYE_WHITE = '#F6F1E7';

/** Points along the free end of a lock of hair, moved by the hair's follow-through (more toward the tip). */
const trail = (points, { sway = 0, lift = 0 }, from = 0.35) => points.map(([x, y], i) => {
  const k = Math.max(0, (y - from * 30) / 40);
  return [x + sway * k, y + lift * k];
});

// ---------- Faces ----------
// The face language of the owner's example (7 November 2026): a soft oval with a small chin; big
// almond eyes whose dark irises fill most of the eye, a catch-light, a heavy upper lash line that
// lifts into a small wing; full, tapered brows; a small nose and mouth drawn inside the face.

const IRIS = { c8: '#3A2418', c6: '#1F1A1D', c4: '#2A1C14' };

/** The face's outline, facing left: a soft oval, a small nose bump, a small chin; Atlas's broader and squarer. */
function faceOutline(c) {
  return c.build === 'heavy'
    ? [[-2, -16.6], [-9.6, -12.8], [-12.6, -6.8], [-12.8, -2.4], [-13.6, 1.4], [-14.6, 3.8], [-13, 5.2], [-12.8, 8.4], [-12.2, 11.6], [-9.8, 15.2], [-4.4, 17.6], [3.2, 16.6], [9.6, 11.6], [12.8, 4.2], [13.2, -4.6], [10.6, -12.6], [4.4, -16.6]]
    : [[-2, -16.4], [-9.4, -12.6], [-12.2, -6.8], [-12.6, -2.6], [-13.2, 1.2], [-13.8, 3.4], [-12.6, 4.8], [-12.4, 7.4], [-11.6, 10.6], [-9.6, 14.2], [-7, 16.6], [-4.6, 16.6], [0.8, 14], [6.4, 10.6], [10.6, 6.8], [12.4, 1], [12.4, -4.6], [10.2, -12.4], [4.2, -16.2]];
}

function ear(cv, c) {
  cv.form([[8.6, -3.8], [12.6, -5], [14.2, 0.4], [12.4, 5.4], [9.4, 4]], c.skin, { weight: 1.5, depth: 1.2, rim: false, grain: false, seed: 11 });
  cv.line([[11.2, -1.6], [12.4, 0.6], [11, 2.8]], { weight: 0.9 });
}

const P = ([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`;

/**
 * One almond eye. inner and outer: its corners (the inner toward the nose); top and bottom: how far
 * the upper and lower lids arch; open 0..1 (a blink brings the upper lid down onto the lower). The
 * iris looks left, clipped to the eye, the white showing beside it; the lash line is inked heavy
 * and lifts past the outer corner into a wing.
 */
function almond(cv, c, { inner, outer, top, bottom, iris: r, open, wing, lash = 1.5, squash = 1 }) {
  const w = outer[0] - inner[0];
  const span = Math.abs(w);
  const dir = Math.sign(w);
  // Control points: the lower lid's, and the upper lid's (lowered onto the lower as the eye shuts).
  const lowA = add(outer, [-dir * span * 0.28, bottom * 1.25]), lowB = add(inner, [dir * span * 0.3, bottom * 1.25]);
  const upY = t => top * 1.3 * t - bottom * 1.25 * (1 - t);
  const upA = add(inner, [dir * span * 0.2, -upY(open)]), upB = add(outer, [-dir * span * 0.34, -upY(open) * 0.92]);
  const upper = `M${P(inner)} C${P(upA)} ${P(upB)} ${P(outer)}`;
  const shape = `${upper} C${P(lowA)} ${P(lowB)} ${P(inner)} Z`;
  if (open > 0.15) {
    const clip = cv.uid('eye');
    cv.def(`<clipPath id="${clip}"><path d="${shape}"/></clipPath>`);
    // The gaze is to the left: the iris sits left of the eye's middle and fills the eye's height, up
    // against the upper lash line, so the white shows beside it.
    const centre = lerp(inner, outer, 0.5);
    const apexUp = centre[1] - 0.75 * upY(open), apexLow = centre[1] + 0.75 * bottom * 1.25;
    const ir = ((apexLow - apexUp) / 2) * r, rx = ir * squash;
    const at = [Math.min(inner[0], outer[0]) + span * 0.37, (apexUp + apexLow) / 2 - (apexLow - apexUp) * 0.06];
    cv.raw(`<path d="${shape}" fill="${EYE_WHITE}"/><g clip-path="url(#${clip})">`
      + `<ellipse cx="${at[0].toFixed(2)}" cy="${at[1].toFixed(2)}" rx="${rx.toFixed(2)}" ry="${ir.toFixed(2)}" fill="${IRIS[c.id] ?? INK}"/>`
      + `<ellipse cx="${at[0].toFixed(2)}" cy="${at[1].toFixed(2)}" rx="${(rx * 0.55).toFixed(2)}" ry="${(ir * 0.55).toFixed(2)}" fill="#0B0A0C"/>`
      + `<circle cx="${(at[0] + rx * 0.34).toFixed(2)}" cy="${(at[1] - ir * 0.4).toFixed(2)}" r="${Math.max(0.4, ir * 0.27).toFixed(2)}" fill="#FFFFFF"/>`
      + `<path d="${upper} L${P(add(outer, [0, 1.3]))} L${P(add(inner, [0, 1.3]))} Z" fill="${INK}" opacity="0.14"/></g>`);
  }
  // The lash line along the upper lid, lifting past the outer corner into a wing.
  cv.raw(`<path d="${upper} Q${P(add(outer, [wing[0] * 0.45, wing[1] * 0.15]))} ${P(add(outer, wing))}" fill="none" stroke="${INK}" stroke-width="${lash}" stroke-linecap="round" stroke-linejoin="round"/>`);
  // A thin lower lid along the outer half.
  if (open > 0.15) cv.raw(`<path d="M${P(lerp(inner, outer, 0.42))} C${P(add(lerp(inner, outer, 0.62), [0, bottom * 1.05]))} ${P(add(lerp(inner, outer, 0.86), [0, bottom * 0.75]))} ${P(add(outer, [-dir * 0.2, 0.25]))}" fill="none" stroke="${INK}" stroke-width="0.55" stroke-linecap="round" opacity="0.75"/>`);
}

/** Both eyes and the brows, looking left. 'down': lids lowered, lashes along them. */
function eyes(cv, c, { blink = 0, down = false }) {
  const heavy = c.build === 'heavy';
  const open = down ? 0 : 1 - Math.max(0, Math.min(1, blink));
  if (heavy) {
    // Atlas: hooded and narrower, the lash line heavy, hardly a wing; low, heavy brows.
    almond(cv, c, { inner: [-6, -1], outer: [-10.8, -1.6], top: 3, bottom: 1.5, iris: 0.92, squash: 0.78, open, wing: [-0.6, -0.3], lash: 1.6 });
    almond(cv, c, { inner: [-2.4, -1], outer: [6.6, -1.8], top: 3.4, bottom: 1.7, iris: 0.92, open, wing: [0.8, -0.4], lash: 1.7 });
    cv.line([[-5.4, -5.6], [-8.6, -6.6], [-11.8, -5.8]], { weight: 2.5, color: shade(c.hair, 0.1), taper: 'end' });
    cv.line([[-1.6, -5.8], [2.4, -7.2], [7.2, -6.2]], { weight: 2.9, color: shade(c.hair, 0.1), taper: 'end' });
    // The hood of the lid: a crease over the near eye.
    if (open > 0.15) cv.line([[-0.6, -4.6], [2.4, -5.4], [5.8, -4.6]], { weight: 0.6, color: shade(c.skin, 0.4), taper: 'both' });
    return;
  }
  const bob = c.hairStyle === 'bob';
  almond(cv, c, { inner: [-6.6, -1.4], outer: [-11.9, -2.2], top: 4.2, bottom: 2.2, iris: 1, squash: 0.72, open, wing: [-1, -1.2], lash: 1.35 });
  almond(cv, c, { inner: [-2.4, -1.2], outer: [6.8, -2.6], top: bob ? 4.5 : 4.7, bottom: 2.4, iris: 1, open, wing: [1.9, -1.7], lash: 1.45 });
  if (down) {
    for (const [x, y] of [[-10, 0.2], [-8.4, 0.5], [1.2, 0.8], [3.2, 0.8], [5.2, 0.4]]) cv.line([[x, y - 0.4], [x - 0.3, y + 0.9]], { weight: 0.5, taper: 'both' });
  }
  // Full brows, thick toward the nose and tapering out: Mira's arched, Nova's straighter.
  const brow = shade(c.hair, 0.05);
  if (bob) {
    cv.line([[-6.2, -7.2], [-9.2, -7.9], [-12, -7.4]], { weight: 2, color: brow, taper: 'end' });
    cv.line([[-1.8, -7.6], [2.4, -8.6], [7.6, -8.2]], { weight: 2.2, color: brow, taper: 'end' });
  } else {
    cv.line([[-6.2, -7.4], [-9.4, -8.8], [-12, -8.2]], { weight: 2, color: brow, taper: 'end' });
    cv.line([[-1.8, -7.8], [2.4, -10], [7.8, -8.8]], { weight: 2.3, color: brow, taper: 'end' });
  }
}

/** The nose: a small hook by the far cheek, drawn inside the face. */
function nose(cv, c) {
  const heavy = c.build === 'heavy';
  cv.raw(`<path d="M${heavy ? '-10.6 -0.4 L-13.2 3.6 Q-13 5.2 -10.8 5' : '-10.4 0 L-12.6 3.4 Q-12.4 4.8 -10.6 4.6'}" fill="none" stroke="${INK}" stroke-width="${heavy ? 1.1 : 0.9}" stroke-linecap="round" stroke-linejoin="round"/>`);
}

/** A small mouth, slightly parted, with the lower lip's shadow. */
function mouth(cv, c) {
  if (c.mustache) return;
  cv.raw(`<path d="M-11 9.2 Q-9.4 8.5 -7.2 9.3 Q-8.8 10.6 -11 9.2 Z" fill="#5A2A24"/><path d="M-11.2 9.2 Q-9.4 8.4 -7 9.3" fill="none" stroke="${INK}" stroke-width="0.8" stroke-linecap="round"/>`);
  cv.raw(`<path d="M-10.4 11.1 Q-9.2 11.8 -8 11.1" fill="none" stroke="${shade(c.skin, 0.3)}" stroke-width="0.7" stroke-linecap="round"/>`);
}

function facialHair(cv, c) {
  if (c.mustache) cv.form([[-12.8, 8.2], [-10.6, 6.8], [-7.4, 7.4], [-4.6, 8.4], [-7.4, 9.2], [-10.6, 9]], c.hair, { weight: 1, depth: 0.6, rim: false, grain: false, seed: 23 });
  if (c.goatee) cv.form([[-11.2, 11.4], [-8.8, 11.2], [-7.6, 13.6], [-8.4, 16.8], [-10.2, 15.6]], c.hair, { weight: 1, depth: 0.6, rim: false, grain: false, seed: 29 });
  if (c.build === 'heavy') {
    // Stubble on the jaw: a few dry-brush flecks.
    for (const [x, y] of [[-6, 13.6], [-3, 14.8], [0.6, 14.2], [3.6, 12.6], [-4.6, 11.4], [-1.4, 12.6], [6.2, 9.6]]) cv.line([[x, y], [x + 0.6, y + 0.5]], { weight: 0.5, color: shade(c.skin, 0.4), taper: 'both' });
  }
}

// ---------- Hair ----------

function hairBehind(cv, c, motion) {
  if (c.hairStyle === 'long') {
    // Mira, the far side: hair falling behind the face to the shoulder, framing it.
    cv.form(trail([[-6, -15], [-14.6, -12], [-18, -3.4], [-18.2, 6], [-20.4, 14.6], [-18.8, 22.4], [-13.6, 26.6], [-10, 21.6], [-8.6, 12], [-6, 2]], motion, 0.2), c.hair, { weight: 2.2, depth: 3.4, seed: 30, wobble: 0.55, rim: false });
    cv.line(trail([[-15, -1.6], [-15.6, 8], [-16.4, 17.6]], motion, 0.2), { weight: 0.85, color: c.hairLight, opacity: 0.85 });
    // Mira: a full, wavy fall behind the head and neck, flaring out in waves at the shoulders.
    cv.form(trail([[-9, -18.6], [-2, -23.6], [8, -24.2], [16.4, -19], [21, -9.4], [21.6, 1.6], [20.6, 9.6], [24.4, 15], [28.4, 20.6], [24.4, 24.6], [20, 21.6], [17.6, 26.6], [12.6, 28], [9.4, 23.6], [5.6, 26.4], [2.6, 21.6], [5.6, 14], [8.6, 5], [5.4, -5], [-2, -10], [-10, -10.4]], motion, 0.2), c.hair, { weight: 2.3, depth: 5, seed: 31, wobble: 0.6, rim: false });
    for (const lock of [[[14.4, -15], [19, -4], [18, 8], [22.6, 17.4]], [[10.6, 0], [12.4, 12], [15.6, 22.6]], [[6.6, 8], [7, 17], [4.6, 23.6]]]) cv.line(trail(lock, motion, 0.2), { weight: 0.9, color: c.hairLight, opacity: 0.85 });
  }
  if (c.hairStyle === 'bob') {
    // Nova, the far side: the bob falling straight behind the face to the jaw.
    cv.form([[-6, -14], [-13.8, -11], [-15.6, -3], [-15.6, 6], [-15, 11.2], [-9.6, 11.6], [-8, 2], [-6, -6]], c.hair, { weight: 2.1, depth: 2.8, seed: 36, wobble: 0.25, tension: 0.8, rim: false });
    // Nova: a blunt bob to the jaw, its back edge cut straight.
    cv.form(trail([[-4, -19], [7.6, -18], [15, -10.6], [16.8, -0.6], [16.4, 9.6], [14.6, 12.6], [7, 12.6], [6.4, 4], [3, -6], [-8, -8]], motion, 0.1), c.hair, { weight: 2.2, depth: 3.6, seed: 37, wobble: 0.3, tension: 0.8, rim: false });
    cv.line([[10.6, -12.6], [14, -2], [14.2, 9.4]], { weight: 0.9, color: c.hairLight, opacity: 0.8 });
  }
  if (c.hairStyle === 'quiff') {
    // Atlas: the back of the short crop, down to the nape.
    cv.form([[-2, -18], [9, -17.6], [15.4, -10], [15.4, -1], [13, 5.6], [9, 3.6], [6, -8]], c.hair, { weight: 2, depth: 2.8, seed: 41, rim: false });
  }
}

function hairFront(cv, c, motion) {
  if (c.hairStyle === 'long') {
    // The crown, full on top, parted on the far side: a fringe sweeps down to the far temple, the
    // hairline rises on the near side to show the forehead, and the hair goes back over the near ear.
    cv.form([[-12.4, -4.8], [-16, -11], [-13.6, -19.8], [-6.4, -25.6], [4.8, -26.6], [14.8, -22.4], [19.6, -12.6], [17.4, -3.6], [13.6, -6.8], [9.6, -11.6], [5, -15.4], [-0.6, -17.6], [-4.6, -16.6], [-7.4, -13.6], [-10, -10], [-11.6, -6.6]], c.hair, { weight: 1.8, depth: 2.4, seed: 43, wobble: 0.5, rim: false });
    cv.line([[-11.6, -18.6], [-3, -23.2], [6, -23.6], [14, -18.6]], { weight: 0.9, color: c.hairLight, opacity: 0.9 });
    cv.line([[-5, -25.4], [-7.2, -19.6], [-9.6, -14]], { weight: 0.8, color: shade(c.hair, 0.4) });
    // A loose wave falling by the far temple.
    cv.line(trail([[-12.8, -9], [-14.6, -4], [-13.4, 1]], motion), { weight: 1.3, color: c.hair, taper: 'end' });
  }
  if (c.hairStyle === 'bob') {
    // Straight-cut bangs, and the near side falling past the cheek to the jaw.
    cv.form([[-13.4, -8.6], [-13, -14.6], [-6, -19.8], [4.4, -20.4], [12.6, -15.4], [15.4, -7], [14.6, 4.2], [11.6, 11.6], [9.2, 11.4], [10.4, 2.4], [9, -6.6], [4, -9], [-2, -9.2], [-8, -9], [-13, -8.4]], c.hair, { weight: 1.8, depth: 2.2, seed: 53, wobble: 0.25, tension: 0.7, rim: false });
    cv.line([[-9, -14.6], [-1, -17.6], [7, -16.6]], { weight: 0.9, color: c.hairLight, opacity: 0.9 });
  }
  if (c.hairStyle === 'quiff') {
    // A swept-up crop: tufts standing up and back from a clear forehead.
    cv.form([[-11.6, -7.6], [-12.8, -14], [-9.6, -21.4], [-5.8, -25.6], [-2.8, -21.8], [1.2, -26.6], [4.8, -22.2], [9.6, -25.6], [12.2, -19.6], [17, -16.8], [15.4, -9], [14, -1.8], [11.2, -7], [7, -10.6], [0, -11.6], [-6.4, -10.8]], c.hair, { weight: 1.9, depth: 2.4, seed: 59, wobble: 0.5, tension: 0.62, rim: false });
    cv.line([[-8.6, -14.6], [-5.6, -21]], { weight: 0.8, color: c.hairLight, opacity: 0.9 });
    cv.line([[-2, -15], [1, -22.4]], { weight: 0.8, color: c.hairLight, opacity: 0.9 });
    cv.line([[4.4, -14.6], [8.6, -21.6]], { weight: 0.8, color: c.hairLight, opacity: 0.9 });
    // The sideburn, down in front of the ear.
    cv.form([[8.4, -6.6], [10.6, -6.4], [10.2, 2.6], [8.4, 3]], c.hair, { weight: 1, depth: 0, rim: false, grain: false, seed: 61 });
  }
}

function headphones(cv, c) {
  if (!c.headphones) return;
  cv.line([[-8.8, -17.2], [-2, -22.6], [7.4, -21.4], [13.4, -12.6], [14.4, -4.8]], { weight: 2.6, color: c.gear, taper: 'none' });
  cv.line([[-8.6, -17], [-2, -22.2], [7.4, -21], [13, -12.6]], { weight: 0.8, color: tint(c.gear, 0.45), taper: 'both', opacity: 0.8 });
  // The ear cup, its ring in Nova's colour.
  cv.form([[9.6, -5.6], [14.6, -6.6], [17.6, -0.6], [16.4, 6], [11.4, 6.6], [8.8, 0.6]], c.gear, { weight: 1.8, depth: 2, seed: 67 });
  cv.form([[11.2, -2.6], [14.4, -3.2], [15.6, 0.6], [14.6, 3.6], [11.6, 3.8], [10.6, 0.4]], c.field, { weight: 1.1, depth: 1, rim: false, grain: false, seed: 71 });
}

// ---------- From behind ----------

function headBack(cv, c, motion) {
  if (c.hairStyle === 'long') {
    cv.form(trail([[-14, -8], [-10, -18.4], [0, -21], [10, -18.4], [15.4, -6], [16.4, 8], [19, 20], [17.6, 31.6], [20, 39.6], [11, 42.6], [4, 37.6], [-4, 42.4], [-12.6, 38], [-12.4, 28], [-16, 18], [-15.6, 6]], motion), c.hair, { weight: 2.2, depth: 4.4, seed: 73, wobble: 0.5 });
    for (const lock of [[[-6, -14], [-8, 4], [-6, 20], [-8, 34]], [[2, -15], [4, 4], [2, 22], [4, 36]], [[9, -12], [12, 4], [11, 20], [14, 33]]]) cv.line(trail(lock, motion), { weight: 0.9, color: c.hairLight, opacity: 0.85 });
    return;
  }
  for (const side of [-1, 1]) cv.form([[11 * side, -4], [14.6 * side, -4.6], [15.2 * side, 1.6], [12.4 * side, 5.6], [10.6 * side, 2]], c.skin, { weight: 1.5, depth: 1, rim: false, grain: false, seed: 79 + side });
  cv.form([[-11.6, -11], [-13, -2], [-11.6, 6.6], [-6, 13], [0, 14.4], [6, 13], [11.6, 6.6], [13, -2], [11.6, -11], [0, -15.4]], c.skin, { weight: 2, depth: 3, seed: 83 });
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
  hairBehind(cv, c, m);
  cv.form(faceOutline(c), c.skin, { weight: 2, depth: 2.6, seed: 7, wobble: 0.25, hatch: false, grain: false, shadowTone: shade(c.skin, 0.24) });
  // The far cheek's blush and the light on the near cheekbone.
  // Cheeks modelled in a deeper skin tone (no pink: a blush would come too near the red team's colour).
  cv.flat([[-9.6, 3.2], [-6.8, 2.8], [-6.2, 5.2], [-8.8, 5.8]], shade(c.skin, 0.12), { opacity: c.build === 'heavy' ? 0 : 0.16 });
  cv.flat([[0.6, 3.4], [4.6, 3], [5.2, 5.6], [1.4, 6.2]], shade(c.skin, 0.12), { opacity: c.build === 'heavy' ? 0 : 0.14 });
  ear(cv, c);
  nose(cv, c);
  facialHair(cv, c);
  eyes(cv, c, { blink: m.blink, down: view === 'down' });
  mouth(cv, c);
  hairFront(cv, c, m);
  headphones(cv, c);
}
