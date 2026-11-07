//
// The crew's portraits, in the frame the owner chose ("the icon border like IOS style"): a
// continuous-corner rounded square (a superellipse, n = 5), a white rim and a soft shadow, the
// character's colour under a noir vignette, the shoulders and the traced head (head.mjs). Three
// shapes of it, nothing in any of them saying a role or a team:
// - crewPortraitSvg: the app icon (128 by 128), as approved in the character pilot;
// - crewCardSvg: the character's card, in the box of the rig's card art (8 0 84 96) with the face
//   where the old card has it (x 48, y 34), so every place that crops a face from a card still
//   finds one: lists, chips, the picker, the lobby, the phase bar, role cards and files;
// - crewStandeeSvg: the card standing on its pedestal, in the box of the rig's standee (0 0 96 120),
//   the board's piece where live figures are not drawn.

import { SUIT, crewMember } from './crew.mjs';
import { HEADS, crewHead, hangTransform, lidPaths } from './head.mjs';
import { INK, inkCanvas, pathOfPoly, shade, squircle, tint } from './ink.mjs';

/** The icon's own box (viewBox) and its half-size inside it. */
export const PORTRAIT = Object.freeze({ box: Object.freeze([-64, -64, 128, 128]), half: 54 });
/** Where the head sits in the icon and its scale: the face a little left of the middle, as on the owner's icons. */
const HEAD = Object.freeze({ at: Object.freeze([-6, -1]), scale: 1.62 });
/** The same, for a client placing something on the face (a crop, a highlight): head units to the icon's. */
export const PORTRAIT_HEAD = HEAD;
/** The card's box (the rig's card art's), its shape and where its face is; the standee's box. */
export const CARD = Object.freeze({ box: Object.freeze([8, 0, 84, 96]), centre: Object.freeze([48, 47]), half: Object.freeze([36, 43]), face: Object.freeze([48, 34]), scale: 0.667 });
export const STANDEE = Object.freeze({ box: Object.freeze([0, 0, 96, 120]) });

/** A superellipse with half-widths a and b: the continuous corners of an iOS icon on a card that is taller than wide. */
function superellipse(cx, cy, a, b, n = 5, steps = 96) {
  const pts = [];
  for (let i = 0; i < steps; i += 1) {
    const t = (i / steps) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    pts.push([cx + a * Math.sign(c) * Math.abs(c) ** (2 / n), cy + b * Math.sign(s) * Math.abs(s) ** (2 / n)]);
  }
  return pts;
}

/**
 * The bust in the icon's frame: the canvas suit, its charcoal sides, the pads and collar in the
 * accent, the neck from where the drawing has it leave the jaw, and the head. bottom: how far down
 * the shoulders go.
 */
function bust(cv, c, { bottom = 66, motion = {}, art = null, live = false } = {}) {
  cv.form([[-62, bottom], [-56, 44], [-40, 34], [-14, 29], [16, 29], [40, 33], [56, 42], [64, bottom]], SUIT.light, { weight: 2.2, depth: 6, tension: 0.8, seed: 211 });
  cv.form([[-62, bottom], [-56, 44], [-44, 37], [-36, bottom]], SUIT.dark, { weight: 1.6, depth: 3, tension: 0.6, seed: 213, rim: false });
  cv.form([[38, bottom], [44, 36], [56, 42], [64, bottom]], SUIT.dark, { weight: 1.6, depth: 3, tension: 0.6, seed: 215, rim: false });
  cv.form([[-54, 40], [-40, 31], [-30, 36], [-42, 47]], c.accent, { weight: 1.8, depth: 3, tension: 0.5, seed: 217 });
  cv.form([[34, 34], [48, 32], [56, 42], [42, 46]], c.accent, { weight: 1.8, depth: 3, tension: 0.5, seed: 219 });
  cv.form([[-14, 29], [-12, 22], [12, 21], [16, 29], [8, 36], [-8, 36]], c.accent, { weight: 1.6, depth: 2, tension: 0.6, seed: 221, rim: false });
  const [nx, ny, nr] = HEADS[c.id].neck;
  const top = [HEAD.at[0] + HEAD.scale * nx, HEAD.at[1] + HEAD.scale * (ny - nr)], r = HEAD.scale * nr;
  cv.form([[top[0] - r, top[1]], [top[0] + r, top[1]], [2 + r * 1.1, 28], [2 - r * 1.1, 29]], c.skin, { weight: 1.8, depth: 3, tension: 0.6, seed: 223, rim: false, hatch: false });
  cv.raw(`<g${live ? ' data-crew-portrait-head=""' : ''} transform="${portraitHeadTransform()}">`);
  crewHead(cv, c, 'front', motion, { art, live });
  cv.raw('</g>');
}

/** The head's place in the icon: fixed (a portrait does not drift). */
const portraitHeadTransform = () => `translate(${HEAD.at.join(' ')}) scale(${HEAD.scale})`;

/**
 * The values of one frame for a live portrait (crewPortraitSvg with live): { portraitHead, lids,
 * hang }, set by mount.mjs applyCrewFrame. The portrait's head keeps its place; its lids blink and
 * its hanging hair follows motion's { blink, sway, lift }. A figure's frame (crewFrame) never
 * moves a portrait's head: the two heads have their own hooks.
 */
export function crewPortraitFrame(c, motion = {}) {
  const { id } = crewMember(c);
  return { portraitHead: portraitHeadTransform(), lids: lidPaths(id, motion.blink ?? 0), hang: hangTransform(id, motion.sway ?? 0, motion.lift ?? 0) };
}

/** The ground's gradient and a shape's clip, with this drawing's own ids. */
function ground(cv, c, d) {
  const g = cv.uid('ground'), clip = cv.uid('frame');
  cv.def(`<radialGradient id="${g}" cx="0.38" cy="0.32" r="0.86"><stop offset="0" stop-color="${tint(c.field, 0.16)}"/><stop offset="0.62" stop-color="${c.field}"/><stop offset="1" stop-color="${shade(c.field, 0.5)}"/></radialGradient>`);
  cv.def(`<clipPath id="${clip}"><path d="${d}"/></clipPath>`);
  return { g, clip };
}

/**
 * A character's app-icon portrait as an inline SVG. motion: the head's { blink, sway, lift }.
 * size: CSS pixels, or null to fill its container. art: as for a figure (mount.mjs). live: hooks
 * for crewPortraitFrame (the lids and the hanging hair; the head stays in its place).
 */
export function crewPortraitSvg(c, { prefix = 'pp', motion = {}, size = null, art = null, live = false } = {}) {
  const cv = inkCanvas(prefix);
  const d = pathOfPoly(squircle(0, 0, PORTRAIT.half));
  const { g, clip } = ground(cv, c, d);
  cv.raw(`<path d="${d}" transform="translate(1.6 3.2) scale(1.02)" fill="${INK}" opacity="0.2"/>`);
  cv.raw(`<path d="${d}" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="7" stroke-linejoin="round"/>`);
  cv.raw(`<g clip-path="url(#${clip})"><path d="${d}" fill="url(#${g})"/>`);
  for (let i = 0; i < 9; i += 1) {
    const y = -50 + i * 12.4, x = -54 + ((i * 37) % 11);
    cv.line([[x, y + 6], [x + 34, y - 4], [x + 70, y + 2], [x + 108, y - 6]], { weight: 1.1, color: shade(c.field, 0.3), opacity: 0.22, seed: 200 + i });
  }
  bust(cv, c, { motion, art, live });
  cv.raw(`<path d="${d}" fill="none" stroke="${INK}" stroke-width="20" opacity="0.14"/></g>`);
  cv.raw(`<path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="1.2" opacity="0.65"/>`);
  const [x, y, w, h] = PORTRAIT.box;
  return cv.svg({ viewBox: `${x} ${y} ${w} ${h}`, width: size, height: size });
}

/** The card's drawing on a canvas, in the card's box: the frame, the ground, the bust with its face at CARD.face. */
function drawCard(cv, c, { motion = {}, art = null } = {}) {
  const [cx, cy] = CARD.centre, [a, b] = CARD.half;
  const d = pathOfPoly(superellipse(cx, cy, a, b));
  const { g, clip } = ground(cv, c, d);
  cv.raw(`<path d="${d}" transform="translate(1 2)" fill="${INK}" opacity="0.2"/>`);
  cv.raw(`<path d="${d}" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="4.6" stroke-linejoin="round"/>`);
  cv.raw(`<g clip-path="url(#${clip})"><path d="${d}" fill="url(#${g})"/>`);
  for (let i = 0; i < 7; i += 1) {
    const y = 8 + i * 12.6, x = 10 + ((i * 29) % 9);
    cv.line([[x, y + 4], [x + 24, y - 3], [x + 48, y + 1], [x + 76, y - 4]], { weight: 0.8, color: shade(c.field, 0.3), opacity: 0.22, seed: 230 + i });
  }
  const k = CARD.scale;
  const t = [CARD.face[0] - k * HEAD.at[0], CARD.face[1] - k * HEAD.at[1]];
  cv.group(`translate(${t.map(n => n.toFixed(2)).join(' ')}) scale(${k})`, () => bust(cv, c, { bottom: 92, motion, art }));
  cv.raw(`<path d="${d}" fill="none" stroke="${INK}" stroke-width="13" opacity="0.14"/></g>`);
  cv.raw(`<path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="0.8" opacity="0.65"/>`);
}

/** A character's card as a standalone SVG (84 by 96, the rig's card box): for every place that shows a character's card or crops its face. */
export function crewCardSvg(c, { prefix = 'pc', motion = {}, art = null } = {}) {
  const cv = inkCanvas(prefix);
  drawCard(cv, c, { motion, art });
  const [x, y, w, h] = CARD.box;
  return cv.svg({ viewBox: `${x} ${y} ${w} ${h}`, width: w, height: h });
}

/**
 * The board's stand and clamp, unchanged from the rig's standee (design/source/crew): the same
 * steel, the same footprint, so the piece's origin (48, 104), its tag (48, 116) and its marker
 * slots stay where layouts put them. Only the character in the card is new.
 */
function stand() {
  return '<ellipse cx="50.5" cy="108.5" rx="30" ry="8" fill="#151923"/>'
    + '<ellipse cx="48" cy="106" rx="29" ry="8" fill="#34415A" stroke="#151923" stroke-width="2.6"/>'
    + '<ellipse cx="48" cy="103.5" rx="29" ry="8" fill="#8696AE" stroke="#151923" stroke-width="2.6"/>'
    + '<path d="M26 101 C32 98.4 40 97.4 48 97.4" fill="none" stroke="#F4EBDD" stroke-width="2" stroke-linecap="round"/>';
}
function clamp(dots) {
  return '<path d="M27 87.5 H69 V98.5 Q48 104.5 27 98.5 Z" fill="#55657E" stroke="#151923" stroke-width="2.6" stroke-linejoin="round"/>'
    + `<path d="M54 87.5 H69 V98.5 Q62 100.8 54 101.8 Z" fill="url(#${dots})" opacity="0.7"/>`
    + '<path d="M31 90.5 H50" fill="none" stroke="#B9C4D3" stroke-width="1.8" stroke-linecap="round"/>';
}

/** The standee's anchors, the rig's: where it stands, where its name tag goes, where markers sit. */
export const STANDEE_ANCHORS = Object.freeze({
  origin: Object.freeze([48, 104]),
  tagTop: Object.freeze([48, 116]),
  markerSlots: Object.freeze({ turn: Object.freeze([48, -2]), captain: Object.freeze([78, 18]), health: Object.freeze([78, 70]), jail: Object.freeze([18, 70]) }),
});

/** A character's standee as a standalone SVG (96 by 120, the rig's standee box): the new card in the rig's stand and clamp. */
export function crewStandeeSvg(c, { prefix = 'ps', motion = {}, art = null } = {}) {
  const cv = inkCanvas(prefix);
  const dots = cv.uid('dots');
  cv.def(`<pattern id="${dots}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="2" cy="2" r="0.8" fill="${INK}"/></pattern>`);
  cv.raw(`<g data-layer="${prefix}-stand">${stand()}</g><g data-layer="${prefix}-card">`);
  drawCard(cv, c, { motion, art });
  cv.raw(`</g><g data-layer="${prefix}-clamp">${clamp(dots)}</g>`);
  const [x, y, w, h] = STANDEE.box;
  return cv.svg({ viewBox: `${x} ${y} ${w} ${h}`, width: w, height: h });
}
