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

/** The face's outline, facing left: brow, nose, lips and chin on the left edge, the jaw and nape on the right. */
function faceOutline(c) {
  const heavy = c.build === 'heavy';
  return heavy
    ? [[-2, -16.5], [-9.4, -12.6], [-12.4, -6.4], [-12.8, -2.2], [-15.6, 4.2], [-12.6, 5.6], [-12.8, 8.2], [-12.2, 11.2], [-10.2, 15.2], [-4.4, 17.8], [3.2, 16.6], [9.6, 11.4], [12.8, 4], [13.2, -4.6], [10.6, -12.4], [4.4, -16.4]]
    : [[-2, -16.2], [-9.2, -12.4], [-12, -6.4], [-12.4, -2.2], [-15, 4.2], [-12.2, 5.6], [-12.2, 8.2], [-11.2, 11.2], [-8.4, 14.6], [-3.6, 16.4], [2.8, 14.6], [8.6, 9.6], [11.8, 3], [12.4, -4.6], [10.2, -12.2], [4.2, -16]];
}

function ear(cv, c) {
  cv.form([[8.6, -3.8], [12.6, -5], [14.2, 0.4], [12.4, 5.4], [9.4, 4]], c.skin, { weight: 1.5, depth: 1.2, rim: false, grain: false, seed: 11 });
  cv.line([[11.2, -1.6], [12.4, 0.6], [11, 2.8]], { weight: 0.9 });
}

/** Eyes looking left, big and bright, the upper lid inked heavy; blink closes them; 'down' draws lids. */
function eyes(cv, c, { blink = 0, down = false }) {
  const heavy = c.build === 'heavy';
  const shut = down ? 1 : Math.max(0, Math.min(1, blink));
  const specs = [
    { cx: -8.2, cy: -0.9, rx: heavy ? 1.9 : 2.3, ry: heavy ? 2.1 : 2.9, pupil: [-9, -0.6], pr: heavy ? 1.15 : 1.35 },
    { cx: 1.2, cy: -1.1, rx: heavy ? 2.7 : 3.3, ry: heavy ? 2.6 : 3.5, pupil: [-0.4, -0.7], pr: heavy ? 1.45 : 1.7 },
  ];
  for (const e of specs) {
    const open = 1 - shut;
    if (open > 0.08) {
      const ry = e.ry * open;
      const top = e.cy - ry * 0.85;
      cv.raw(`<ellipse cx="${e.cx}" cy="${(e.cy + e.ry * shut * 0.4).toFixed(2)}" rx="${e.rx}" ry="${Math.max(0.3, ry).toFixed(2)}" fill="${EYE_WHITE}" stroke="${INK}" stroke-width="0.7"/>`);
      if (open > 0.35) cv.raw(`<circle cx="${e.pupil[0]}" cy="${(e.pupil[1] + e.ry * shut * 0.4).toFixed(2)}" r="${(e.pr * Math.min(1, open * 1.3)).toFixed(2)}" fill="${INK}"/><circle cx="${(e.pupil[0] - 0.45).toFixed(2)}" cy="${(e.pupil[1] - 0.55 + e.ry * shut * 0.4).toFixed(2)}" r="0.42" fill="${EYE_WHITE}"/>`);
      // The upper lid: a heavy inked arc, lowered with the blink.
      cv.line([[e.cx - e.rx - 0.6, top + 0.8], [e.cx, top - 0.2], [e.cx + e.rx + 0.5, top + 0.6]], { weight: heavy ? 1.6 : 1.4, taper: 'end' });
    } else {
      // Shut, or looking down: a lid line curving down.
      cv.line([[e.cx - e.rx - 0.4, e.cy], [e.cx, e.cy + 1.1], [e.cx + e.rx + 0.4, e.cy + 0.2]], { weight: 1.3 });
    }
  }
  // Lashes at the outer corner (the near eye), for Mira and Nova.
  if (!heavy && shut < 0.5) cv.line([[4.6, -4.2], [5.8, -5.2]], { weight: 0.8, taper: 'start' });
  // Brows: Atlas's low and heavy, Nova's level, Mira's arched.
  const brows = heavy
    ? [[[-11.4, -5.4], [-8.6, -6.6], [-5.6, -6.4]], [[-1.8, -6.6], [2, -7.4], [5.8, -6.6]]]
    : c.hairStyle === 'bob'
      ? [[[-11, -6.6], [-8.2, -7.2], [-5.6, -7.2]], [[-1.4, -7.8], [2.2, -8.2], [5.6, -7.8]]]
      : [[[-11, -6.2], [-8.4, -7.6], [-5.8, -7.2]], [[-1.6, -7.6], [1.8, -8.8], [5.4, -8]]];
  for (const b of brows) cv.line(b, { weight: heavy ? 2.4 : 1.6, color: shade(c.hair, 0.2), taper: 'end' });
}

function mouth(cv, c) {
  if (c.mustache) return;
  cv.line([[-11.6, 9.4], [-9.4, 9.9], [-7.4, 9.5]], { weight: 1.1, taper: 'both' });
  cv.line([[-10.2, 11.4], [-8.4, 11.6]], { weight: 0.6, color: shade(c.skin, 0.35), taper: 'both' });
}

function facialHair(cv, c) {
  if (c.mustache) cv.form([[-13.2, 8.4], [-10.6, 7], [-7.6, 7.8], [-4.8, 8.6], [-7.6, 9.4], [-10.8, 9.2]], c.hair, { weight: 1, depth: 0.6, rim: false, grain: false, seed: 23 });
  if (c.goatee) cv.form([[-11.4, 11.6], [-9, 11.4], [-7.6, 13.6], [-8.6, 16.8], [-10.4, 15.6]], c.hair, { weight: 1, depth: 0.6, rim: false, grain: false, seed: 29 });
  if (c.build === 'heavy') {
    // Stubble on the jaw: a few dry-brush flecks.
    for (const [x, y] of [[-6, 13.6], [-3, 14.8], [0.6, 14.2], [3.6, 12.6], [-4.6, 11.4], [-1.4, 12.6], [6.2, 9.6]]) cv.line([[x, y], [x + 0.6, y + 0.5]], { weight: 0.5, color: shade(c.skin, 0.4), taper: 'both' });
  }
}

// ---------- Hair ----------

function hairBehind(cv, c, motion) {
  if (c.hairStyle === 'long') {
    // Mira: a full, wavy fall behind the head and neck, flaring out in waves at the shoulders.
    cv.form(trail([[-9, -18.6], [-2, -23.6], [8, -24.2], [16.4, -19], [21, -9.4], [21.6, 1.6], [20.6, 9.6], [24.4, 15], [28.4, 20.6], [24.4, 24.6], [20, 21.6], [17.6, 26.6], [12.6, 28], [9.4, 23.6], [5.6, 26.4], [2.6, 21.6], [5.6, 14], [8.6, 5], [5.4, -5], [-2, -10], [-10, -10.4]], motion, 0.2), c.hair, { weight: 2.3, depth: 5, seed: 31, wobble: 0.6, rim: false });
    for (const lock of [[[14.4, -15], [19, -4], [18, 8], [22.6, 17.4]], [[10.6, 0], [12.4, 12], [15.6, 22.6]], [[6.6, 8], [7, 17], [4.6, 23.6]]]) cv.line(trail(lock, motion, 0.2), { weight: 0.9, color: c.hairLight, opacity: 0.85 });
  }
  if (c.hairStyle === 'bob') {
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
    cv.form([[-12.4, -4.8], [-15.2, -10.6], [-12.8, -18.8], [-6, -24], [4.6, -24.8], [13.8, -21], [18.4, -12], [16.6, -3.6], [13.4, -6.8], [9.6, -11.6], [5, -15.4], [-0.6, -17.6], [-4.6, -16.6], [-7.4, -13.6], [-10, -10], [-11.6, -6.6]], c.hair, { weight: 1.7, depth: 2.2, seed: 43, wobble: 0.5, rim: false });
    cv.line([[-11, -17.6], [-3, -21.6], [6, -22], [13, -17.6]], { weight: 0.9, color: c.hairLight, opacity: 0.9 });
    cv.line([[-4.8, -24], [-7, -19], [-9.6, -14]], { weight: 0.8, color: shade(c.hair, 0.4) });
    // A loose wave falling by the far temple.
    cv.line(trail([[-12.8, -9], [-14.6, -4], [-13.4, 1]], motion), { weight: 1.3, color: c.hair, taper: 'end' });
  }
  if (c.hairStyle === 'bob') {
    // Straight-cut bangs, and the near side falling past the cheek to the jaw.
    cv.form([[-13.4, -6], [-13, -13.6], [-6, -19.4], [4.4, -20.2], [12.6, -15.4], [15.4, -7], [14.6, 4.2], [11.6, 11.6], [9.2, 11.4], [10.4, 2.4], [8.6, -4], [4, -5.4], [-2, -5.2], [-8, -4.8], [-13, -4.4]], c.hair, { weight: 1.8, depth: 2.2, seed: 53, wobble: 0.25, tension: 0.7, rim: false });
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
  cv.form(faceOutline(c), c.skin, { weight: 2.2, depth: 2.6, seed: 7, wobble: 0.3, hatch: false, shadowTone: shade(c.skin, 0.26) });
  // The far cheek's blush and the light on the near cheekbone.
  cv.flat([[-11.6, 2.4], [-9.2, 1.8], [-8.2, 4.4], [-10.6, 5.4]], shade(c.skin, 0.1), { opacity: 0.5 });
  ear(cv, c);
  facialHair(cv, c);
  eyes(cv, c, { blink: m.blink, down: view === 'down' });
  mouth(cv, c);
  hairFront(cv, c, m);
  headphones(cv, c);
}
