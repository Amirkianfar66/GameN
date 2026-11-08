// mothership:dev-only
//
// The room pilot (a proposal for the owner, 7 November 2026; the owner approved it on 8 November
// 2026 and asked for every room): Room A redrawn by hand to match the approved crew, and the
// darkness the other rooms are matched to (./ink-room.mjs). The same room, camera, places and props as today's scene
// (design/board-motion/scenes/room-a.mjs, its fittings lifted from design/source/board/
// board-room-a.svg), drawn with the crew's own ink (design/crew-drawing/source/ink.mjs): a
// hand-drawn wobbling outline, heavier where a form turns from the light; a noir cel shadow on
// the side away from the light, hatched; a rim light; a scratched grain; lit from the upper
// left, as the crew are. Over it, the room's own light: two shafts from the ceiling bars, their
// pools on the deck, and the dark that gathers at the panel's edges.
// Printed in Room A's colour family (design tokens 0.5.0 color.room.roomA), with the shared ink
// and paper. Nothing here changes a place, a slot, the camera, the focus or a press area: the
// scene's own (ROOM_A) are reused as they are. Nothing in it is written, and nothing says which
// rooms connect.

import { ROOM_A } from '../board-motion/scenes/room-a.mjs';
import { INK, inkCanvas, pathOfPoly, shade, spline, waver } from '../crew-drawing/source/ink.mjs';

/** Room A's colour family (tokens 0.5.0 color.room.roomA), dark to light, with the shared ink and paper. */
export const FAMILY = Object.freeze({ deep: '#14243F', shadow: '#1D3D6B', mid: '#2D609E', light: '#5C92CC', pale: '#A9CAEB' });
export const PAPER = Object.freeze({ plain: '#F4EBDD', shade: '#E3D6C2', deep: '#CBBBA2' });
export const SPACE = '#10141C';
const F = FAMILY, P = PAPER;

/** The scene this pilot redraws: its places, focus and frame, unchanged. */
export const SCENE = ROOM_A;
export const VIEWBOX = Object.freeze([0, 0, 1024, 768]);

// ---------- Shapes in the room's oblique camera ----------

const rectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const circlePts = (cx, cy, rx, ry = rx, n = 40) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
});

/** A hard-edged form: straight sides drawn by hand (a slight waver), the crew's ink, shadow, hatch and grain. */
function slab(cv, points, fill, { weight = 2.8, depth = null, wobble = 0.75, step = 6, seed = 1, ...rest } = {}) {
  return cv.form(points, fill, { weight, depth, wobble, step, tension: 0, seed, ...rest });
}
/** A round form, inked by hand. */
function blob(cv, points, fill, { weight = 2.6, wobble = 0.6, step = 4, seed = 2, ...rest } = {}) {
  return cv.form(points, fill, { weight, wobble, step, tension: 1, seed, ...rest });
}

/**
 * A box in the room's camera: its front face, its top and its right side receding up and to the
 * right (as kit.mjs box()). x, y: the front's lower left on the floor; w, h its size; d the depth.
 */
function box(cv, x, y, w, h, d, { front = F.light, top = F.pale, side = F.mid, seed = 10, weight = 2.8 } = {}) {
  const dx = d * 0.55, dy = d * 0.45;
  slab(cv, [[x + w, y], [x + w + dx, y - dy], [x + w + dx, y - h - dy], [x + w, y - h]], side, { seed, weight, depth: 3 });
  slab(cv, [[x, y - h], [x + dx, y - h - dy], [x + w + dx, y - h - dy], [x + w, y - h]], top, { seed: seed + 1, weight, depth: 2, hatch: false });
  slab(cv, [[x, y], [x + w, y], [x + w, y - h], [x, y - h]], front, { seed: seed + 2, weight, depth: Math.min(9, h * 0.16) });
}

/**
 * A stroke by hand: tapered at both ends, or one (the crew's brush), for marks, scuffs and light;
 * with taper 'none', an even line that wavers a little (seams, cables, rails).
 */
function stroke(cv, points, { taper = 'both', weight = 1.6, color = INK, opacity = null, seed = 3, wobble = 0.5 } = {}) {
  if (taper !== 'none') return cv.line(points, { weight, color, opacity, seed, taper });
  const line = waver(spline(points, { closed: false, step: 4 }), seed, wobble, 14, false);
  return cv.raw(`<path d="${pathOfPoly(line, false)}" fill="none" stroke="${color}" stroke-width="${weight}" stroke-linecap="round" stroke-linejoin="round"${opacity === null ? '' : ` opacity="${opacity}"`}/>`);
}

/** A soft glow: an ellipse of light fading to nothing at its edge (a lamp, a screen's spill). */
function glow(cv, cx, cy, rx, ry, color, opacity) {
  const id = cv.uid('glow');
  cv.def(`<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/><stop offset="0.45" stop-color="${color}" stop-opacity="${opacity * 0.55}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`);
  cv.raw(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id})"/>`);
}

// ---------- The room ----------

function shell(cv) {
  // The ceiling and its two light bars.
  slab(cv, [[20, 20], [1004, 20], [904, 70], [120, 70]], INK, { weight: 0, depth: 0, hatch: false, grain: false, rim: false, seed: 3 });
  for (const [x0, x1, x2, x3, s] of [[286, 476, 466, 308, 4], [548, 738, 716, 558, 5]]) {
    glow(cv, (x0 + x1) / 2, 46, (x1 - x0) * 0.66, 30, P.plain, 0.42);
    slab(cv, [[x0, 31], [x1, 31], [x2, 58], [x3, 58]], P.plain, { weight: 2.2, depth: 2, hatch: false, seed: s, shadowTone: P.shade });
    stroke(cv, [[x0 + 34, 44], [x1 - 24, 44]], { color: P.shade, weight: 2.2, seed: s });
  }
  // The side walls fall into the dark toward us: hatched low down, darker still at the front.
  const sideDark = cv.uid('side');
  cv.def(`<linearGradient id="${sideDark}" x1="0" y1="0" x2="0" y2="1"><stop offset="0.3" stop-color="${INK}" stop-opacity="0"/><stop offset="1" stop-color="${INK}" stop-opacity="0.42"/></linearGradient>`);
  // The left wall, in the dark: ribs, a beam across.
  slab(cv, [[20, 20], [120, 70], [120, 372], [20, 748]], F.deep, { depth: 14, seed: 6, weight: 3.2 });
  for (const [a, b, s] of [[[20, 260], [120, 170]], [[20, 457], [120, 251]], [[20, 640], [120, 330]]].map((l, i) => [...l, 7 + i])) stroke(cv, [a, b], { color: F.shadow, weight: 3, taper: 'none', seed: s });
  for (const [x, s] of [[54, 16], [88, 17]]) stroke(cv, [[x, 26 + (x - 20) * 0.5], [x, 748 - (x - 20) * 3.76]], { color: SPACE, weight: 1.6, opacity: 0.6, taper: 'none', seed: s });
  slab(cv, [[20, 340], [120, 203], [120, 221], [20, 384]], F.shadow, { weight: 2.4, depth: 3, seed: 9 });
  cv.raw(`<polygon points="20,420 120,254 120,372 20,748" fill="url(#${cv.prefix}-hatch)" opacity="0.8"/><polygon points="20,20 120,70 120,372 20,748" fill="url(#${sideDark})"/>`);
  // The right wall: a lit panel at its top, ribs below.
  slab(cv, [[1004, 20], [904, 70], [904, 372], [1004, 748]], F.shadow, { depth: 12, seed: 11, weight: 3.2 });
  slab(cv, [[1004, 20], [904, 70], [904, 150], [1004, 216]], F.mid, { depth: 5, seed: 12, weight: 2.6 });
  for (const [a, b, s] of [[[1004, 260], [904, 170]], [[1004, 457], [904, 251]], [[1004, 640], [904, 330]]].map((l, i) => [...l, 13 + i])) stroke(cv, [a, b], { color: F.deep, weight: 3, taper: 'none', seed: s });
  for (const [x, s] of [[970, 18], [936, 19]]) stroke(cv, [[x, 220 - (1004 - x) * 0.66], [x, 748 - (1004 - x) * 3.76]], { color: F.deep, weight: 1.6, opacity: 0.7, taper: 'none', seed: s });
  cv.raw(`<polygon points="1004,420 904,254 904,372 1004,748" fill="url(#${cv.prefix}-hatch)" opacity="0.65"/><polygon points="1004,20 904,70 904,372 1004,748" fill="url(#${sideDark})"/>`);
}

function backWall(cv) {
  slab(cv, rectPts(120, 70, 784, 302), F.shadow, { depth: 12, seed: 21, weight: 3.4, step: 8 });
  slab(cv, rectPts(322, 104, 380, 232), F.mid, { depth: 10, seed: 22, weight: 2.6, step: 8 });
  slab(cv, rectPts(120, 70, 784, 34), F.deep, { depth: 6, seed: 23, weight: 3, step: 8 });
  slab(cv, rectPts(120, 336, 784, 36), F.deep, { depth: 7, seed: 24, weight: 3, step: 8 });
  // Scratched panels: a few hatched strokes where the paint has worn, as the crew's suits are worn.
  for (const [x, y, s] of [[140, 112, 37], [244, 262, 38], [736, 210, 39], [850, 250, 40], [600, 108, 41], [346, 312, 42]]) {
    for (let i = 0; i < 4; i += 1) stroke(cv, [[x + i * 5, y + 12], [x + 8 + i * 5, y]], { weight: 0.9, color: INK, opacity: 0.4, seed: s * 10 + i });
  }
  // Seams and wear.
  stroke(cv, [[134, 288], [300, 288]], { weight: 1.4, opacity: 0.5, taper: 'none', seed: 25 });
  stroke(cv, [[724, 196], [890, 196]], { weight: 1.4, opacity: 0.5, taper: 'none', seed: 26 });
  stroke(cv, [[322, 316], [702, 316]], { weight: 1.4, opacity: 0.45, taper: 'none', seed: 27 });
  for (const [x, y, s] of [[150, 140, 28], [236, 300, 29], [760, 120, 30], [860, 300, 31], [640, 120, 32]]) {
    stroke(cv, [[x, y], [x + 18, y + 7], [x + 30, y + 4]], { weight: 0.9, color: shade(F.mid, 0.4), opacity: 0.7, seed: s });
  }
  // Rivets along the lower band.
  for (const x of [170, 250, 380, 470, 554, 644, 770, 860]) {
    cv.raw(`<circle cx="${x}" cy="354" r="3.4" fill="${INK}"/><circle cx="${x - 0.9}" cy="353" r="1.3" fill="${F.pale}"/>`);
  }
  // The pillars either side of the viewport, and the wall's edges.
  for (const [x, s] of [[300, 33], [702, 34]]) {
    slab(cv, rectPts(x, 70, 22, 302), F.light, { depth: 6, seed: s, weight: 3 });
    for (const y of [92, 140, 188, 236, 284, 352]) cv.raw(`<circle cx="${x + 9}" cy="${y}" r="2.8" fill="${INK}"/>`);
  }
  slab(cv, rectPts(120, 70, 14, 302), F.shadow, { depth: 4, seed: 35, weight: 3 });
  slab(cv, rectPts(890, 70, 14, 302), F.mid, { depth: 4, seed: 36, weight: 3 });
}

function viewport(cv) {
  // The frame: a wide pale ring, its bolts, and space through the glass.
  blob(cv, circlePts(512, 210, 119, 119, 64), F.pale, { depth: 12, seed: 41, weight: 3.6 });
  const space = cv.uid('space');
  cv.def(`<clipPath id="${space}"><circle cx="512" cy="210" r="92"/></clipPath>`);
  cv.raw(`<g clip-path="url(#${space})"><circle cx="512" cy="210" r="94" fill="${SPACE}"/>`);
  for (const [x, y, r] of [[452, 164, 1.8], [476, 238, 1.4], [499, 146, 2.4], [537, 170, 1.5], [566, 141, 2], [590, 196, 1.4], [441, 222, 1.6], [489, 190, 1.1], [571, 181, 1.1], [460, 264, 1.2], [523, 131, 1.2]]) {
    cv.raw(`<circle cx="${x}" cy="${y}" r="${r}" fill="${P.plain}"/>`);
  }
  cv.raw(`<path d="M468 196 L471 187 L474 196 L483 199 L474 202 L471 211 L468 202 L459 199 Z" fill="${P.plain}"/>`);
  // The planet: a pale disc lit from the upper left, its night side hatched, a band across it.
  // The planet: its night side dark, a crescent lit from the upper left, the terminator hatched.
  blob(cv, circlePts(600, 322, 132, 132, 72), shade(P.deep, 0.62), { depth: 0, seed: 42, weight: 3.2, hatch: false, rim: false });
  const lit = cv.uid('lit');
  cv.def(`<clipPath id="${lit}"><circle cx="600" cy="322" r="131"/></clipPath>`);
  cv.raw(`<g clip-path="url(#${lit})"><path d="M440 360 C452 250 520 196 612 190 C548 214 516 262 512 330 C510 352 512 372 518 392 Z" fill="${P.plain}"/>`
    + `<path d="M512 330 C516 262 548 214 612 190 C600 200 570 226 552 270 C540 300 536 336 540 372 L518 392 C512 372 510 352 512 330 Z" fill="${P.deep}"/>`
    + `<path d="M552 270 C570 226 600 200 612 190 C660 200 690 230 700 262 C640 256 590 268 552 300 Z" fill="url(#${cv.prefix}-hatch)" opacity="0.9"/>`
    + `<path d="M540 372 C536 336 540 300 552 270 L560 430 Z" fill="url(#${cv.prefix}-hatch)" opacity="0.7"/></g>`);
  stroke(cv, [[470, 300], [500, 286], [530, 280]], { color: P.deep, weight: 2.4, seed: 43 });
  stroke(cv, [[478, 330], [500, 320], [524, 316]], { color: P.deep, weight: 2, seed: 44 });
  cv.raw(`<circle cx="600" cy="322" r="132" fill="none" stroke="${INK}" stroke-width="3.6"/>`);
  cv.raw(`<path d="M436 176 L496 118 L524 118 L430 210 Z" fill="${P.plain}" opacity="0.14"/><path d="M446 232 L560 120 L574 124 L452 246 Z" fill="${P.plain}" opacity="0.09"/></g>`);
  // The glass's inner lip, inked, and the bolts.
  cv.raw(`<circle cx="512" cy="210" r="92" fill="none" stroke="${INK}" stroke-width="5"/>`);
  for (let i = 0; i < 8; i += 1) {
    const a = Math.PI / 8 + (i * Math.PI) / 4, x = 512 + Math.cos(a) * 105, y = 210 + Math.sin(a) * 105;
    blob(cv, circlePts(x, y, 5.4, 5.4, 12), F.mid, { weight: 1.8, depth: 2, wobble: 0.2, step: 2, seed: 45 + i, hatch: false, grain: false });
  }
  // The light catches the ring's upper left.
  stroke(cv, [[404, 192], [420, 150], [452, 118], [492, 102]], { color: P.plain, weight: 4, opacity: 0.8, seed: 53 });
}

function fittings(cv) {
  // The wall console, left: its screen with marks (no words), buttons, a slider.
  cv.raw(`<path d="M158 252 H284 L296 266 H170 Z" fill="${INK}" opacity="0.8"/>`);
  slab(cv, rectPts(158, 122, 126, 130), F.shadow, { depth: 8, seed: 61, weight: 3 });
  slab(cv, rectPts(170, 134, 102, 58), SPACE, { depth: 0, seed: 62, weight: 2.4, hatch: false, rim: false });
  glow(cv, 221, 163, 48, 26, F.pale, 0.2);
  for (const [y, x1, s] of [[150, 236, 63], [162, 252, 64], [174, 214, 65]]) stroke(cv, [[181, y], [x1, y]], { color: P.plain, weight: 2.6, taper: 'end', seed: s });
  cv.raw(`<circle cx="254" cy="176" r="5.5" fill="none" stroke="${P.plain}" stroke-width="2.4"/>`);
  for (const [x, fill, s] of [[172, P.plain, 66], [202, F.pale, 67], [232, F.pale, 68]]) slab(cv, rectPts(x, 204, 22, 16), fill, { weight: 2, depth: 2, step: 3, wobble: 0.3, seed: s, hatch: false });
  stroke(cv, [[172, 236], [270, 236]], { weight: 2.6, taper: 'none', seed: 69 });
  slab(cv, rectPts(228, 229, 13, 14), P.plain, { weight: 2, depth: 2, step: 3, wobble: 0.3, seed: 70, hatch: false });
  // The pipes, right, their clamps and a valve wheel.
  for (const [y, s] of [[121, 71], [143, 72], [165, 73]]) {
    slab(cv, rectPts(724, y, 166, 14), F.pale, { weight: 2.6, depth: 4, step: 8, seed: s });
    stroke(cv, [[732, y + 4], [882, y + 4]], { color: P.plain, weight: 2, opacity: 0.85, taper: 'none', seed: s + 10 });
  }
  for (const [x, s] of [[752, 74], [858, 75]]) slab(cv, rectPts(x, 117, 10, 66), F.light, { weight: 2.4, depth: 2, step: 4, wobble: 0.3, seed: s });
  blob(cv, circlePts(812, 150, 21, 21, 28), F.pale, { weight: 3, depth: 5, seed: 76 });
  blob(cv, circlePts(812, 150, 12, 12, 20), F.mid, { weight: 2.4, depth: 3, seed: 77, hatch: false });
  stroke(cv, [[812, 131], [812, 169]], { weight: 2.8, taper: 'none', seed: 78 });
  stroke(cv, [[793, 150], [831, 150]], { weight: 2.8, taper: 'none', seed: 79 });
  cv.raw(`<circle cx="812" cy="150" r="4.5" fill="${P.plain}" stroke="${INK}" stroke-width="2.4"/>`);
  // The locker, right: two doors, vents, handles; its right side in shadow.
  cv.raw(`<path d="M760 336 H880 L890 348 H770 Z" fill="${INK}" opacity="0.85"/>`);
  slab(cv, rectPts(760, 206, 120, 130), F.light, { depth: 11, seed: 81, weight: 3 });
  stroke(cv, [[820, 208], [820, 334]], { weight: 2.6, taper: 'none', seed: 82 });
  for (const y of [222, 232, 242]) { stroke(cv, [[774, y], [806, y]], { weight: 2, taper: 'none', seed: 83 + y }); stroke(cv, [[834, y], [866, y]], { weight: 2, taper: 'none', seed: 84 + y }); }
  for (const x of [806, 828]) cv.raw(`<rect x="${x}" y="268" width="6" height="20" rx="1.5" fill="${INK}"/>`);
}

function deck(cv) {
  slab(cv, [[120, 372], [904, 372], [1004, 748], [20, 748]], F.mid, { depth: 0, seed: 91, weight: 0, hatch: false, step: 10 });
  const clip = cv.uid('deck');
  cv.def(`<clipPath id="${clip}"><polygon points="120,372 904,372 1004,748 20,748"/></clipPath>`);
  cv.raw(`<g clip-path="url(#${clip})">`);
  // Shade under the back wall, and the dark left side of the deck.
  cv.flat([[113, 398], [911, 398], [904, 372], [120, 372]], F.shadow, { tension: 0 });
  cv.flat([[120, 372], [210, 372], [140, 748], [20, 748]], F.shadow, { tension: 0 });
  cv.raw(`<polygon points="120,372 260,372 220,748 20,748" fill="url(#${cv.prefix}-hatch)" opacity="0.55"/>`);
  // Plates: seams drawn by hand, the far ones fainter.
  for (const [a, b, s] of [[[250.7, 372], [184, 748]], [[381.3, 372], [348, 748]], [[512, 372], [512, 748]], [[642.7, 372], [676, 748]], [[773.3, 372], [840, 748]]].map((l, i) => [...l, 92 + i])) {
    stroke(cv, [a, b], { weight: 1.8, opacity: 0.38, taper: 'none', seed: s });
  }
  for (const [y, x0, x1, s] of [[430, 104.6, 919.4, 97], [512, 82.8, 941.2, 98], [618, 54.6, 969.4, 99]]) stroke(cv, [[x0, y], [x1, y]], { weight: 1.8, opacity: 0.38, taper: 'none', seed: s });
  for (const [x, y] of [[262, 440], [370, 440], [524, 440], [654, 440], [762, 440], [240, 630], [362, 630], [526, 630], [662, 630], [784, 630]]) {
    cv.raw(`<circle cx="${x}" cy="${y}" r="2.8" fill="${INK}" opacity="0.55"/><circle cx="${x - 0.8}" cy="${y - 0.9}" r="1" fill="${F.pale}" opacity="0.8"/>`);
  }
  // The grain of a worn deck.
  cv.raw(`<polygon points="120,372 904,372 1004,748 20,748" fill="url(#${cv.prefix}-grain)" opacity="0.9"/>`);
  // Scuffs where people stand.
  for (const [pts, s] of [[[[300, 560], [322, 556]], 101], [[[560, 640], [586, 642]], 102], [[[452, 520], [470, 517]], 103], [[[700, 676], [720, 680]], 104], [[[690, 690], [740, 676]], 105], [[[330, 708], [372, 698]], 106]]) {
    stroke(cv, pts, { color: P.shade, weight: 1.6, opacity: 0.55, seed: s });
  }
  // A floor grate, front left.
  slab(cv, [[214, 664], [318, 664], [326, 712], [204, 712]], F.shadow, { weight: 2.6, depth: 4, step: 4, seed: 107 });
  for (let i = 0; i < 6; i += 1) stroke(cv, [[226 + i * 17, 668], [222 + i * 18.4, 708]], { color: SPACE, weight: 3, taper: 'none', seed: 108 + i });
  cv.raw('</g>');
}

/** The room's light: two shafts from the ceiling bars and their pools on the deck. */
function light(cv) {
  for (const [top, bottom, pool, s] of [
    [[[300, 58], [462, 58]], [[236, 600], [560, 600]], [398, 590, 176, 62], 121],
    [[[562, 58], [716, 58]], [[470, 612], [812, 612]], [640, 600, 182, 64], 122],
  ]) {
    const [cx, cy, rx, ry] = pool;
    const beam = cv.uid('beam');
    cv.def(`<linearGradient id="${beam}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.plain}" stop-opacity="0.4"/><stop offset="0.5" stop-color="${P.plain}" stop-opacity="0.16"/><stop offset="1" stop-color="${P.plain}" stop-opacity="0.07"/></linearGradient>`);
    // The pool: one hard-edged step of light, as the crew's cel shading, a soft heart, a dotted fringe.
    glow(cv, cx, cy, rx * 1.4, ry * 1.5, F.pale, 0.3);
    cv.raw(`<ellipse cx="${cx}" cy="${cy}" rx="${rx * 1.13}" ry="${ry * 1.17}" fill="url(#${cv.prefix}-dots-pale)" opacity="0.55"/>`);
    cv.form(circlePts(cx, cy, rx, ry, 36), F.light, { weight: 0, depth: 0, tension: 1, wobble: 1.6, step: 8, seed: s, rim: false, hatch: false, grain: true });
    glow(cv, cx - rx * 0.08, cy - ry * 0.06, rx * 0.78, ry * 0.74, P.plain, 0.55);
    cv.raw(`<polygon points="${[...top, ...bottom.slice().reverse()].map(p => p.join(',')).join(' ')}" fill="url(#${beam})"/>`);
    stroke(cv, [top[0], bottom[0]], { color: P.plain, weight: 1.2, opacity: 0.22, taper: 'none', seed: s });
    stroke(cv, [top[1], bottom[1]], { color: P.plain, weight: 1.2, opacity: 0.22, taper: 'none', seed: s + 5 });
    // Dust in the beam.
    for (let i = 0; i < 9; i += 1) {
      const t = ((i * 37 + s * 11) % 97) / 97, u = ((i * 61 + s * 7) % 89) / 89;
      const y = 90 + t * 420, k = (y - 58) / (bottom[0][1] - 58);
      const x0 = top[0][0] + (bottom[0][0] - top[0][0]) * k, x1 = top[1][0] + (bottom[1][0] - top[1][0]) * k;
      cv.raw(`<circle cx="${(x0 + (x1 - x0) * (0.15 + u * 0.7)).toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.9 + (i % 3) * 0.45).toFixed(2)}" fill="${P.plain}" opacity="${(0.35 + (i % 4) * 0.1).toFixed(2)}"/>`);
    }
  }
}

function back(cv) {
  // Crates stacked by the console, left.
  cv.raw(`<polygon points="242,414 258,398 306,406 288,428 150,428 150,414" fill="${INK}" opacity="0.85"/>`);
  box(cv, 150, 414, 92, 92, 29, { front: P.shade, top: P.plain, side: P.deep, seed: 131 });
  stroke(cv, [[162, 334], [230, 402]], { weight: 2.4, taper: 'none', seed: 134 });
  stroke(cv, [[230, 334], [162, 402]], { weight: 2.4, taper: 'none', seed: 135 });
  cv.raw(`<rect x="160" y="332" width="72" height="72" fill="none" stroke="${INK}" stroke-width="2.2"/>`);
  box(cv, 158, 306, 48, 26, 18, { front: P.shade, top: P.plain, side: P.deep, seed: 136 });
  stroke(cv, [[168, 293], [196, 293]], { weight: 2, taper: 'none', seed: 139 });
  // A canister, right: a cylinder, banded, its top lit.
  cv.raw(`<ellipse cx="842" cy="412" rx="42" ry="11" fill="${INK}" opacity="0.85"/>`);
  slab(cv, [[786, 340], [850, 340], [850, 404], [834, 412], [818, 414], [802, 412], [786, 404]], F.pale, { weight: 3, depth: 12, step: 4, seed: 141 });
  for (const [y, s] of [[362, 142], [386, 143]]) stroke(cv, [[786, y], [802, y + 8], [818, y + 10], [834, y + 8], [850, y]], { weight: 2.4, seed: s });
  blob(cv, circlePts(818, 340, 32, 10, 36), P.plain, { weight: 2.8, depth: 2, step: 3, seed: 144, hatch: false });
  blob(cv, circlePts(818, 340, 19, 5.5, 24), F.pale, { weight: 2, depth: 1, step: 2, seed: 145, hatch: false });
}

/** What the five places work at (as today's scene), drawn in the new hand. */
function places(cv) {
  // A cable loop hangs from the soffit on the right.
  stroke(cv, [[640, 104], [646, 150], [672, 170], [700, 150], [702, 108]], { weight: 6.5, taper: 'none', seed: 151 });
  stroke(cv, [[640, 104], [646, 150], [672, 170], [700, 150], [702, 108]], { color: F.mid, weight: 2.6, taper: 'none', seed: 151 });
  // A5: the junction box on the wall left of the viewport, its door open, wires showing.
  slab(cv, [[318, 186], [328, 190], [328, 286], [318, 292]], F.mid, { weight: 2.4, depth: 2, step: 4, seed: 152 });
  slab(cv, rectPts(328, 188, 58, 98), F.shadow, { weight: 3, depth: 6, step: 5, seed: 153 });
  slab(cv, rectPts(336, 198, 42, 78), SPACE, { weight: 2.2, depth: 0, step: 4, seed: 154, hatch: false, rim: false });
  for (const [pts, color, s] of [
    [[[344, 206], [344, 250]], F.pale, 155], [[[352, 206], [352, 236], [360, 246], [360, 262]], F.pale, 156], [[[364, 206], [366, 230], [372, 238], [372, 256]], F.pale, 157],
    [[[344, 250], [340, 270], [344, 300], [352, 318]], F.light, 158], [[[360, 262], [358, 284], [366, 300], [370, 322]], F.light, 159],
  ]) stroke(cv, pts, { color, weight: 2.6, taper: 'none', seed: s });
  slab(cv, rectPts(340, 262, 34, 8), F.mid, { weight: 2, depth: 1, step: 3, wobble: 0.3, seed: 160, hatch: false });
  for (const [x, fill] of [[346, P.plain], [356, F.pale], [366, P.plain]]) cv.raw(`<circle cx="${x}" cy="212" r="2.6" fill="${fill}"/>`);
  slab(cv, [[328, 188], [300, 176], [300, 300], [328, 286]], F.light, { weight: 2.8, depth: 5, step: 5, seed: 161 });
  stroke(cv, [[306, 196], [322, 202]], { color: F.mid, weight: 2, taper: 'none', seed: 162 });
  stroke(cv, [[306, 280], [322, 276]], { color: F.mid, weight: 2, taper: 'none', seed: 163 });
  // A4: a stack of crates against the wall right of the viewport.
  box(cv, 628, 404, 78, 72, 28, { front: F.light, top: F.pale, side: F.mid, seed: 171 });
  stroke(cv, [[628, 368], [706, 368]], { weight: 2.2, opacity: 0.7, taper: 'none', seed: 174 });
  stroke(cv, [[667, 334], [667, 402]], { weight: 2.2, opacity: 0.7, taper: 'none', seed: 175 });
  box(cv, 640, 332, 58, 54, 22, { front: F.pale, top: P.shade, side: F.light, seed: 176 });
  stroke(cv, [[652, 300], [686, 300]], { color: F.mid, weight: 2.6, taper: 'none', seed: 179 });
  stroke(cv, [[652, 312], [676, 312]], { color: F.mid, weight: 2.6, taper: 'none', seed: 180 });
  // A1: the workstation under the viewport, facing the back wall: two monitors, a keyboard, a mug.
  cv.raw(`<ellipse cx="522" cy="482" rx="96" ry="12" fill="${INK}" opacity="0.35"/>`);
  slab(cv, rectPts(560, 398, 34, 82), F.mid, { weight: 2.6, depth: 5, step: 5, seed: 181 });
  slab(cv, [[594, 398], [606, 390], [606, 470], [594, 480]], F.shadow, { weight: 2.6, depth: 2, step: 5, seed: 182 });
  slab(cv, rectPts(452, 408, 8, 72), F.shadow, { weight: 2.2, depth: 2, step: 4, seed: 183, hatch: false });
  slab(cv, [[440, 392], [594, 392], [606, 382], [454, 382]], F.pale, { weight: 2.6, depth: 2, step: 5, seed: 184, hatch: false });
  slab(cv, rectPts(440, 392, 154, 16), F.light, { weight: 2.8, depth: 4, step: 5, seed: 185 });
  for (const [x, y, w, h, tilt, s] of [[450, 318, 66, 48, -4, 186], [526, 312, 70, 52, 3, 190]]) {
    glow(cv, x + w / 2, y + h / 2, w * 1.05, h * 1.05, F.pale, 0.26);
    cv.group(`rotate(${tilt} ${x + w / 2} ${y + h})`, () => {
      slab(cv, rectPts(x + w / 2 - 6, y + h, 12, 16), F.shadow, { weight: 2.2, depth: 2, step: 3, wobble: 0.3, seed: s, hatch: false });
      slab(cv, rectPts(x + w / 2 - 20, y + h + 14, 40, 7), F.shadow, { weight: 2.2, depth: 2, step: 3, wobble: 0.3, seed: s + 4, hatch: false });
      slab(cv, rectPts(x, y, w, h), F.deep, { weight: 3, depth: 3, step: 4, wobble: 0.4, seed: s + 1, hatch: false });
      slab(cv, rectPts(x + 6, y + 6, w - 12, h - 12), F.pale, { weight: 0, depth: 0, step: 4, wobble: 0.3, seed: s + 2, hatch: false, rim: false });
      for (const [dy, k] of [[16, 0.62], [26, 0.78], [36, 0.45]]) stroke(cv, [[x + 12, y + dy], [x + w * k, y + dy]], { color: F.mid, weight: 2.4, taper: 'none', seed: s + 3 });
      stroke(cv, [[x + w * 0.62, y + h - 12], [x + w * 0.7, y + h - 22], [x + w * 0.78, y + h - 16], [x + w - 12, y + h - 28]], { color: F.light, weight: 2.2, taper: 'none', seed: s + 3 });
      cv.raw(`<path d="M${x + 6} ${y + 6} H${x + w * 0.42} L${x + 6} ${y + h * 0.6} Z" fill="${P.plain}" opacity="0.4"/>`);
    });
  }
  slab(cv, rectPts(490, 374, 62, 8), F.deep, { weight: 2, depth: 1, step: 3, wobble: 0.3, seed: 195, hatch: false });
  slab(cv, rectPts(574, 366, 14, 14), F.light, { weight: 2, depth: 2, step: 3, wobble: 0.3, seed: 196, hatch: false });
  stroke(cv, [[588, 370], [594, 372], [594, 377], [588, 380]], { weight: 2, seed: 197 });
  stroke(cv, [[470, 408], [468, 440], [476, 462], [488, 480]], { weight: 3.4, taper: 'none', seed: 198 });
  // A power cable from the workstation along the deck to the right wall.
  const cable = [[600, 474], [680, 488], [760, 478], [846, 470], [880, 466], [912, 446]];
  stroke(cv, cable, { weight: 8, taper: 'none', seed: 199 });
  stroke(cv, cable, { color: F.mid, weight: 3.4, taper: 'none', seed: 199 });
  // A3: the open floor hatch, front right, its lid raised, a toolbox beside it; hazard marks round it.
  slab(cv, [[562, 574], [632, 574], [642, 610], [550, 610]], SPACE, { weight: 3, depth: 0, step: 4, seed: 201, hatch: false, rim: false });
  for (const [y, s] of [[586, 202], [598, 203]]) stroke(cv, [[570, y], [628, y]], { color: F.mid, weight: 2.6, taper: 'none', seed: s });
  slab(cv, [[562, 574], [632, 574], [628, 530], [566, 530]], F.mid, { weight: 3, depth: 6, step: 4, seed: 204 });
  for (const [y, s] of [[542, 205], [554, 206], [566, 207]]) stroke(cv, [[574, y], [620, y]], { color: F.light, weight: 1.8, taper: 'none', seed: s });
  for (let i = 0; i < 5; i += 1) stroke(cv, [[544 + i * 20, 622], [556 + i * 20, 612]], { color: P.shade, weight: 3.4, taper: 'none', seed: 208 + i });
  box(cv, 452, 668, 58, 26, 18, { front: F.pale, top: P.shade, side: F.light, seed: 214 });
  stroke(cv, [[468, 644], [481, 634], [494, 644]], { weight: 3.4, taper: 'none', seed: 217 });
}

function front(cv) {
  // A coiled cable, front left.
  cv.raw(`<ellipse cx="124" cy="704" rx="62" ry="21" fill="${INK}" opacity="0.85"/>`);
  for (const [rx, ry, cy, s] of [[58, 20, 694, 221], [36, 12, 692, 222]]) {
    const ring = circlePts(116, cy, rx, ry, 44);
    stroke(cv, [...ring, ring[0]], { weight: 12, taper: 'none', seed: s });
    stroke(cv, [...ring, ring[0]], { color: rx > 40 ? F.pale : F.light, weight: 5.4, taper: 'none', seed: s });
  }
  stroke(cv, [[62, 700], [48, 710], [38, 724], [30, 742]], { weight: 12, taper: 'none', seed: 223 });
  stroke(cv, [[62, 700], [48, 710], [38, 724], [30, 742]], { color: F.pale, weight: 5.4, taper: 'none', seed: 223 });
  // A toolbox, front right.
  cv.raw(`<polygon points="872,720 976,720 990,706 990,728 880,734" fill="${INK}" opacity="0.85"/>`);
  stroke(cv, [[906, 652], [912, 636], [931, 630], [950, 636], [956, 652]], { weight: 10, taper: 'none', seed: 224 });
  stroke(cv, [[906, 652], [912, 636], [931, 630], [950, 636], [956, 652]], { color: F.pale, weight: 4.2, taper: 'none', seed: 224 });
  box(cv, 872, 720, 104, 54, 25, { front: P.shade, top: P.plain, side: P.deep, seed: 225 });
  stroke(cv, [[872, 684], [976, 684]], { weight: 2.6, taper: 'none', seed: 228 });
  slab(cv, rectPts(912, 676, 24, 16), F.pale, { weight: 2, depth: 2, step: 3, wobble: 0.3, seed: 229, hatch: false });
}

/** The dark gathering at the panel's edges, and the front of the deck falling into shadow. */
function finish(cv) {
  const vignette = cv.uid('dark');
  cv.def(`<radialGradient id="${vignette}" cx="0.5" cy="0.56" r="0.7"><stop offset="0.5" stop-color="${INK}" stop-opacity="0"/><stop offset="0.82" stop-color="${INK}" stop-opacity="0.4"/><stop offset="1" stop-color="${INK}" stop-opacity="0.7"/></radialGradient>`);
  cv.raw(`<rect x="0" y="0" width="1024" height="768" fill="url(#${vignette})"/>`);
  // The front edge falls into shadow, hatched.
  cv.raw(`<polygon points="20,748 1004,748 990,700 34,700" fill="${INK}" opacity="0.18"/><polygon points="20,748 1004,748 990,700 34,700" fill="url(#${cv.prefix}-hatch)" opacity="0.6"/>`);
}

/**
 * The panel's heavy ink edges: the back wall's frame and the corners. Drawn behind the props, as
 * today's scene draws them, so that no edge crosses a crate or the canister standing over it.
 */
function edges(cv) {
  cv.raw(`<path d="M120 70 H904 V372 H120 Z" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linejoin="round"/>`);
  for (const [a, b] of [[[20, 20], [120, 70]], [[1004, 20], [904, 70]], [[20, 748], [120, 372]], [[1004, 748], [904, 372]]]) stroke(cv, [a, b], { weight: 5, taper: 'none', seed: 231 });
}

/**
 * Room A, redrawn: the back picture of the scene (everything behind the characters), 1024 by
 * 768, as today's design/board-motion/assets/scenes/room-a.back.svg. prefix: its ids'. header:
 * given, the picture as a file, with its XML declaration and this comment; otherwise the element.
 */
export function roomAPilotSvg({ prefix = 'ra', header = null } = {}) {
  const cv = inkCanvas(prefix);
  cv.def(`<pattern id="${prefix}-dots-pale" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="4.5" cy="4.5" r="2.2" fill="${F.pale}"/></pattern>`);
  shell(cv);
  backWall(cv);
  viewport(cv);
  fittings(cv);
  deck(cv);
  light(cv);
  edges(cv);
  back(cv);
  places(cv);
  front(cv);
  finish(cv);
  return cv.svg({ viewBox: VIEWBOX.join(' '), width: 1024, height: 768, inline: header === null, header: header ?? '' });
}
