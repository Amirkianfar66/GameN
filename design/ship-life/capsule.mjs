// mothership:dev-only
//
// Ship life: the food capsule, a compact dispenser in the ship's comic language, drawn in the
// crew's ink (design/crew-drawing/source/ink.mjs). A steel housing on a bracket in the room's own
// colour family; a paper hatch with a handle that slides up into the housing; behind it a
// compartment with a tray where a portion waits (and where the empty wrapper goes back); a vent
// under the hatch; and a small indicator at the top:
//   stocked: a warm cream glow (food is there);
//   empty:   dark glass, unlit (opened, the tray is bare);
//   unknown: the indicator covered by a hatched steel shutter, neither lit nor dark glass, so an
//            unknown availability never reads as empty.
// No number, no word, no team colour, no alarm. The Hospital has no capsule.
//
// The Jail's variant is a ration hatch in the wall (kind 'hatch'): the same hatch, tray and
// indicator, set flush in a steel frame, reached without leaving the Jail.

import { inkCanvas } from '../crew-drawing/source/ink.mjs';
import { INK, PAPER, PAPER_DEEP, PAPER_SHADE, STEEL } from '../board-motion/figures/rig.mjs';

export const STATES = Object.freeze(['stocked', 'empty', 'unknown']);
const GLOW = '#F7DFA3';
const GLASS = '#283142';
const INSIDE = '#141922';

/**
 * The capsule as an SVG in its own box (w × h room units, placed at the capsule's box in the room).
 * state: stocked | empty | unknown. open: 0 (closed) to 1 (the hatch fully up). portion: whether
 * a portion is on the tray (only when stocked). family: the room's colour family (rooms.mjs).
 * hatch: the hatch's rectangle [x, y, w, h] in the room; box: the capsule's [x, y, w, h].
 */
export function capsuleSvg({ box, hatch, state = 'unknown', open = 0, portion = state === 'stocked', family, kind = 'wall', light = null, prefix = 'cap' }) {
  if (!STATES.includes(state)) throw new Error(`Unknown capsule state ${state}`);
  const [bx, by, w, h] = box;
  const [hx, hy, hw, hh] = [hatch[0] - bx, hatch[1] - by, hatch[2], hatch[3]];
  const cv = inkCanvas(prefix);
  const rect = (x, y, rw, rh) => [[x, y], [x + rw, y], [x + rw, y + rh], [x, y + rh]];
  const flatForm = (points, fill, opts = {}) => cv.form(points, fill, { tension: 0, step: 1, ...opts });

  if (kind === 'wall') {
    // The bracket in the room's colour, then the housing over it.
    flatForm(rect(4, 2, w - 8, h - 4), family.shadow, { weight: 2, depth: 2.6, seed: 21 });
    flatForm(rect(1, 8, w - 2, h - 16), STEEL.mid, { weight: 2.4, depth: 4.2, seed: 23 });
    cv.line([[4, 13], [w - 4, 13]], { weight: 1, color: STEEL.light, taper: 'none' });
    for (const [x, y] of [[6, 11], [w - 6, 11], [6, h - 11], [w - 6, h - 11]]) cv.flat([[x - 1.3, y], [x, y - 1.3], [x + 1.3, y], [x, y + 1.3]], STEEL.pale);
  } else {
    // The Jail's ration hatch: a heavy steel frame flush in the wall.
    flatForm(rect(0, 0, w, h), STEEL.shadow, { weight: 2.6, depth: 3.4, seed: 25 });
    flatForm(rect(3, 3, w - 6, h - 6), STEEL.mid, { weight: 1.4, depth: 2.4, seed: 27, hatch: false });
  }

  // The indicator.
  const lamp = [w / 2, kind === 'wall' ? 22 : 10];
  const r = 4.2;
  const circle = ([cx, cy], rr, n = 14) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * rr, cy + Math.sin((i / n) * Math.PI * 2) * rr]);
  if (state === 'stocked') {
    cv.raw(`<circle cx="${lamp[0]}" cy="${lamp[1]}" r="${r * 2.6}" fill="${GLOW}" opacity="0.22"/>`);
    cv.form(circle(lamp, r), GLOW, { weight: 1.4, depth: 0, hatch: false, rim: false, seed: 29 });
    cv.flat(circle([lamp[0] - 1.2, lamp[1] - 1.2], 1.3, 8), '#FFFFFF', { opacity: 0.7 });
  } else if (state === 'empty') {
    cv.form(circle(lamp, r), GLASS, { weight: 1.4, depth: 0, hatch: false, rim: false, seed: 29 });
    cv.line([[lamp[0] - 2.4, lamp[1] - 1.6], [lamp[0] - 0.8, lamp[1] - 2.8]], { weight: 0.7, color: STEEL.light, taper: 'none' });
  } else {
    flatForm(rect(lamp[0] - r - 1.6, lamp[1] - r, (r + 1.6) * 2, r * 2), STEEL.light, { weight: 1.4, depth: 3, seed: 31 });
    cv.line([[lamp[0] - r - 1.6, lamp[1]], [lamp[0] + r + 1.6, lamp[1]]], { weight: 0.9, color: STEEL.deep, taper: 'none' });
  }

  // The compartment behind the hatch, the tray, and the portion on it.
  cv.form(rect(hx, hy, hw, hh), INSIDE, { tension: 0, step: 1, weight: 2, depth: 0, hatch: false, rim: false, grain: false, seed: 33 });
  cv.line([[hx + 2, hy + hh - 6], [hx + hw - 2, hy + hh - 6]], { weight: 1.6, color: STEEL.light, taper: 'none' });
  if (state === 'stocked' && portion) {
    // The portion as a hand takes it (props.mjs): a short bar in a paper sleeve with a steel band.
    const pw = Math.min(18, hw - 6), ph = pw * 0.5;
    flatForm(rect(hx + hw / 2 - pw / 2, hy + hh - 6.3 - ph, pw, ph), PAPER, { weight: 1.3, depth: 1.6, seed: 35 });
    cv.line([[hx + hw / 2 - pw * 0.1, hy + hh - 6.3 - ph], [hx + hw / 2 - pw * 0.1, hy + hh - 6.3]], { weight: 2.4, color: STEEL.light, taper: 'none' });
  }

  // The hatch: paper, sliding up into the housing as it opens; its handle along the bottom.
  const up = Math.max(0, Math.min(1, open)) * (hh - 3);
  const clip = cv.uid('hatchclip');
  cv.def(`<clipPath id="${clip}"><rect x="${hx - 1}" y="${hy - 1}" width="${hw + 2}" height="${hh + 2}"/></clipPath>`);
  cv.raw(`<g clip-path="url(#${clip})">`);
  flatForm(rect(hx, hy - up, hw, hh), PAPER_SHADE, { weight: 1.8, depth: 2.2, seed: 37 });
  cv.line([[hx + 4, hy - up + 6], [hx + hw - 4, hy - up + 6]], { weight: 0.9, color: PAPER_DEEP, taper: 'none' });
  flatForm(rect(hx + hw / 2 - 7, hy - up + hh - 7, 14, 3.6), STEEL.deep, { weight: 1.1, depth: 0, seed: 39, hatch: false });
  cv.raw('</g>');
  // The frame round the opening, over the hatch's edge.
  cv.outline(rect(hx, hy, hw, hh), 2.2, 41);

  // A vent under the hatch.
  for (let i = 0; i < 2; i += 1) cv.line([[hx + 3, hy + hh + 7 + i * 5], [hx + hw - 3, hy + hh + 7 + i * 5]], { weight: 1.3, color: STEEL.deep, taper: 'none' });
  // The room's own light where it crosses the device, as it crosses the wall behind (light: a shaft
  // in room coordinates, its gradient's stops from y[0] to y[1]), so the device sits in the room.
  if (light) {
    const shaft = cv.uid('shaft'), cut = cv.uid('shaftclip');
    cv.def(`<linearGradient id="${shaft}" gradientUnits="userSpaceOnUse" x1="0" y1="${light.y[0] - by}" x2="0" y2="${light.y[1] - by}">${light.stops.map(([o, a]) => `<stop offset="${o}" stop-color="${PAPER}" stop-opacity="${a}"/>`).join('')}</linearGradient>`);
    cv.def(`<clipPath id="${cut}"><rect x="0" y="0" width="${w}" height="${h}"/></clipPath>`);
    cv.raw(`<polygon clip-path="url(#${cut})" points="${light.points.map(([x, y]) => `${(x - bx).toFixed(1)},${(y - by).toFixed(1)}`).join(' ')}" fill="url(#${shaft})"/>`);
  }
  return cv.svg({ viewBox: `0 0 ${w} ${h}`, width: w, height: h });
}
