// mothership:dev-only
//
// Ship life: the room view's framing on a phone, today's and two wider ones, for the owner to choose
// between (the owner, 11 November 2026: "Zoom out the room artwork and characters so more floor,
// walls, ceiling, equipment, and space between stations are visible ... Prepare the current framing
// alongside two wider alternatives for each main room").
//
// All three are the phone pack's framing (design/phone-ui/prototype/art.mjs phoneFrame, the
// specification since the owner's decision of 11 November 2026, corrected on #222 so that nobody
// present is cut off as drawn), run here with each figure's outline doing its place's activity:
// - the outline: the pack's own (paintedExtent: the resting gesture's measured pixels, Injured
//   included, and the margin for the crew's own motion), joined with the activity's measured
//   outline (./activity-extents.mjs: every pose and what the hands hold), with the same margin;
// - today: that framing, which equals the pack's phoneFrame wherever no activity reaches past the
//   resting outline (the test runs the pack's own outline through it and compares);
// - wider: its scale the filled view's times zoom (0.9 and 0.8: a tenth and a fifth less
//   magnification), or today's where a crowd already zoomed it out further (a full Jail). The
//   interface keeps its size (bars, tags, buttons, 44-pixel press areas): only the room is smaller.
//   Across, it keeps every outline whole and every press point clear of the sides, and the room's
//   food capsule and its visitor's spot in view too where they fit; when they cannot all fit, the
//   people win. Up and down, the band from the back row's heads to the front row's press areas and
//   outlines is centred as today; the picture's extension (./extend.mjs) fills what the picture no
//   longer does.
// The framing is fixed for the room: it never moves for an activity or a visit, and the Blackout
// keeps it (as the pack: the framing depends only on who the lit room shows).

import { FRAME } from '../board-motion/figures/body.mjs';
import { PRESS, slotGeometry } from '../board-motion/scenes/frame.mjs';
import { EDGE_CLEAR, FIGURE_CLEAR, MOTION_ALLOWANCE, paintedExtent } from '../phone-ui/prototype/art.mjs';
import { FIGURE_MOTION_REACH } from '../phone-ui/prototype/figure-extents.mjs';
import { ACTIVITY_EXTENTS } from './activity-extents.mjs';
import { REACH } from './extend.mjs';
import { CAPSULES } from './positions.mjs';

export { EDGE_CLEAR, FIGURE_CLEAR };
/**
 * The framings compared: today's, a tenth wider, a fifth wider. The owner chose a fifth wider
 * ("approved, go with a fifth wider", 11 November 2026): chosen marks it.
 */
export const ZOOMS = Object.freeze([
  Object.freeze({ id: 'today', zoom: 1, name: 'Today', note: 'The phone pack\'s framing, with the activities' }),
  Object.freeze({ id: 'wider-10', zoom: 0.9, name: 'A tenth wider', note: '0.9 × the filled view\'s scale' }),
  Object.freeze({ id: 'wider-20', zoom: 0.8, name: 'A fifth wider', note: '0.8 × the filled view\'s scale', chosen: 'the owner, 11 November 2026' }),
]);

const [AX, AY] = FRAME.anchor;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const within = (value, lo, hi) => (lo <= hi ? clamp(value, lo, hi) : (lo + hi) / 2);
/** A press area's side in CSS pixels for a figure of scale unit (the game's pressSide: at least PRESS). */
export const pressSide = unit => Math.max(PRESS, Math.min(64, 0.26 * 214 * unit));

/** Where the pack presses a place: its press point (the game's own), in scene units. */
export const pressAt = slot => slotGeometry(slot).press;

/**
 * A present figure's outline doing its place's activity, in scene units, [x0, y0, x1, y1]: the
 * pack's own outline at rest (paintedExtent), joined with the activity's measured outline
 * (ACTIVITY_EXTENTS) and the same margin for the crew's own motion (MOTION_ALLOWANCE, or the
 * resting gesture's measured reach where that is further), mirrored with the place and held to the
 * picture. An Eliminated figure does no activity: its outline is the pack's alone.
 */
export function activityOutline(slot) {
  const rest = paintedExtent(slot);
  const box = slot.eliminated ? null : ACTIVITY_EXTENTS[slot.id];
  if (!box) return rest;
  const reach = [slot.gesture, `${slot.gesture}+injured`].map(g => FIGURE_MOTION_REACH[g] ?? [0, 0, 0, 0]);
  const most = i => Math.max(...reach.map(r => r[i]));
  const fx0 = box[0] - Math.max(MOTION_ALLOWANCE.x, most(0)), fx1 = box[2] + Math.max(MOTION_ALLOWANCE.x, most(2));
  const fy0 = box[1] - Math.max(MOTION_ALLOWANCE.top, most(1)), fy1 = box[3] + Math.max(MOTION_ALLOWANCE.bottom, most(3));
  const s = slot.scale, [x, y] = slot.at;
  const a = x + (fx0 - AX) * s, b = x + (fx1 - AX) * s;
  const [x0, x1] = slot.mirror ? [2 * x - b, 2 * x - a] : [a, b];
  const act = [Math.max(0, x0), Math.max(0, y + (fy0 - AY) * s), Math.min(1024, x1), Math.min(768, y + (fy1 - AY) * s)];
  return [Math.min(rest[0], act[0]), Math.min(rest[1], act[1]), Math.max(rest[2], act[2]), Math.max(rest[3], act[3])];
}

/**
 * A room's framing in a panel (the room view between the bars): { k, tx, ty, zoom, fill }, scene
 * units to CSS pixels. present: the slots of everyone the lit room shows. zoom: 1 for today's;
 * below 1, wider. room: the room's id, for its capsule (a wider view keeps it and its visitor in view
 * where it can). outline: each present figure's outline (the activity's, by default; the pack's
 * paintedExtent reproduces the pack's phoneFrame exactly).
 */
export function roomFrame(scene, { width, height, cap = 46, pad = 8 }, present = [], { zoom = 1, room = null, outline = activityOutline } = {}) {
  const [ix0, iy0, ix1, iy1] = scene.inner ?? [0, 0, 1024, 768];
  const fill = Math.max(width / (ix1 - ix0), height / (iy1 - iy0));
  let k = fill;
  let cx = (scene.focus[0] + scene.focus[2]) / 2;
  const xs = present.map(slot => pressAt(slot)[0]);
  const outlines = present.map(outline);
  const fx0 = Math.min(...outlines.map(o => o[0])), fx1 = Math.max(...outlines.map(o => o[2]));
  if (present.length) {
    const span = Math.max(...xs) - Math.min(...xs);
    if (span > 0 && span * k + PRESS > width) k = (width - PRESS) / span;
    if ((fx1 - fx0) * k + 2 * FIGURE_CLEAR > width) k = (width - 2 * FIGURE_CLEAR) / (fx1 - fx0);
  }
  // Up and down: every place's outline and press area, whoever is present (as the pack).
  const geometry = scene.slots.map(slot => ({ g: slotGeometry(slot), o: outline(slot) }));
  const top = Math.min(...geometry.map(({ g, o }) => Math.min(g.headTop, o[1])));
  const band = kk => Math.max(...geometry.map(({ g, o }) => Math.max(g.press[1] + PRESS / 2 / kk, o[3]))) - top;
  const roomFor = height - pad - FIGURE_CLEAR;
  for (let i = 0; i < 4 && band(k) * k > roomFor; i += 1) k = (roomFor - PRESS / 2) / (band(k) - PRESS / 2 / k);
  // Wider: the filled view's scale times zoom, unless the crowd already zoomed it out further.
  k = Math.min(k, fill * zoom);
  const half = width / (2 * k);
  let lo = -Infinity, hi = Infinity;
  if (present.length) {
    lo = Math.max(Math.max(...xs) + EDGE_CLEAR / k, fx1 + FIGURE_CLEAR / k) - half;
    hi = Math.min(Math.min(...xs) - EDGE_CLEAR / k, fx0 - FIGURE_CLEAR / k) + half;
    if (lo <= hi) cx = clamp(cx, lo, hi);
    else {
      // Press points that cannot all keep EDGE_CLEAR: the outlines stay whole, centred between them.
      const flo = fx1 + FIGURE_CLEAR / k - half, fhi = fx0 - FIGURE_CLEAR / k + half;
      cx = flo <= fhi ? clamp((Math.min(...xs) + Math.max(...xs)) / 2, flo, fhi) : (fx0 + fx1) / 2;
    }
  }
  // Wider: the capsule and its visitor's spot in view too, where they fit with the people.
  const device = zoom < 1 && room ? CAPSULES[room] : null;
  if (device) {
    const extra = [device.box[0], device.box[0] + device.box[2], device.spot[0] - 30 * device.scale, device.spot[0] + 30 * device.scale];
    const dlo = Math.max(lo, Math.max(...extra) + 8 / k - half), dhi = Math.min(hi, Math.min(...extra) - 8 / k + half);
    if (dlo <= dhi) cx = clamp(cx, dlo, dhi);
  }
  // Across, the picture's inner box covers the view, unless an outline needs the picture's own border.
  const [bx0, bx1] = present.length ? [Math.min(ix0, fx0 - FIGURE_CLEAR / k), Math.max(ix1, fx1 + FIGURE_CLEAR / k)] : [ix0, ix1];
  const tx = within(width / 2 - cx * k, width - Math.min(1024, bx1) * k, -Math.max(0, bx0) * k);
  const bottom = top + band(k);
  const avail = height - cap - pad;
  const ty = (bottom - top) * k > avail ? height - pad - bottom * k : cap + (avail - (bottom - top) * k) / 2 - top * k;
  // Today's is held inside the picture (its border where an outline reaches it); a wider one inside
  // the picture and its extension.
  const [by0, by1] = zoom < 1 ? [-REACH, 768 + REACH] : [Math.max(0, Math.min(iy0, top - FIGURE_CLEAR / k)), Math.min(768, Math.max(iy1, bottom))];
  return { k, tx, ty: within(ty, height - by1 * k, -by0 * k), zoom, fill };
}

/** What a framing shows: the scene units across and down, and whether each edge is inside the art. */
export function frameReport(frame, { width, height }) {
  const x0 = -frame.tx / frame.k, x1 = (width - frame.tx) / frame.k;
  const y0 = -frame.ty / frame.k, y1 = (height - frame.ty) / frame.k;
  return { across: x1 - x0, down: y1 - y0, x: [x0, x1], y: [y0, y1], beyondPicture: y0 < 0 || y1 > 768 };
}

/**
 * Each place's press area in a framed panel, as the pack places it (art.mjs rectsIn): { id, left,
 * top, side, press }. CSS pixels, at least PRESS on a side.
 */
export function pressRects(slots, { width, height, cap = 46, pad = 8 }, frame) {
  return slots.map(slot => {
    const side = pressSide(slot.scale * frame.k);
    const [x, y] = pressAt(slot);
    const px = frame.tx + x * frame.k, py = frame.ty + y * frame.k;
    const left = Math.min(width - side, Math.max(0, px - side / 2));
    const top = Math.min(height - pad - side, Math.max(cap, py - side / 2));
    return { id: slot.id, left, top, side, press: [px, py] };
  });
}

/** Pairs of press areas that overlap (by more than a pixel): a narrower framing brings people's press areas together. */
export function overlaps(rects) {
  const out = [];
  for (let i = 0; i < rects.length; i += 1) for (let j = i + 1; j < rects.length; j += 1) {
    const a = rects[i], b = rects[j];
    const w = Math.min(a.left + a.side, b.left + b.side) - Math.max(a.left, b.left);
    const h = Math.min(a.top + a.side, b.top + b.side) - Math.max(a.top, b.top);
    if (w > 1 && h > 1) out.push([a.id, b.id, Math.round(w * h)]);
  }
  return out;
}

/** The figure box of a place at a framing (the piece's left, top and side in CSS pixels). */
export function figureBox(slot, frame) {
  const [bx, by, bw] = FRAME.box;
  const s = slot.scale * frame.k;
  return { left: frame.tx + slot.at[0] * frame.k - (AX - bx) * s, top: frame.ty + slot.at[1] * frame.k - (AY - by) * s, side: bw * s };
}
