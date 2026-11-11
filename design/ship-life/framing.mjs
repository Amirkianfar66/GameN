// mothership:dev-only
//
// Ship life: the room view's framing on a phone, today's and two wider ones, for the owner to choose
// between (the owner, 11 November 2026: "Zoom out the room artwork and characters so more floor,
// walls, ceiling, equipment, and space between stations are visible ... Prepare the current framing
// alongside two wider alternatives for each main room").
//
// today: the phone pack's own framing (design/phone-ui/prototype/art.mjs phoneFrame, the
//   specification since the owner's decision of 11 November 2026), reproduced here and tested equal.
// wider: the same, its scale the filled view's times zoom (0.9 and 0.8: a tenth and a fifth less
//   magnification), or a crowd's own zoom-out where that is already wider (a full Jail). The
//   interface keeps its size (bars, tags, buttons, 44-pixel press areas): only the room is smaller.
//   Across, it keeps everyone present clear of the sides, and the room's food capsule, its visitor's
//   spot and the walk to it too where they fit, so a visit stays in view; when they cannot all fit,
//   the people win. Up and down, it centres the band from the back row's heads to the front row's
//   press areas, as today; the picture's extension (./extend.mjs) fills what the picture no longer
//   does. The framing is fixed for the room: it never moves for an activity or a visit, and the
//   Blackout keeps it (as the pack: the framing depends only on who the lit room shows).

import { FRAME } from '../board-motion/figures/body.mjs';
import { PRESS, slotGeometry } from '../board-motion/scenes/frame.mjs';
import { REACH } from './extend.mjs';
import { CAPSULES } from './positions.mjs';

/** How far inside the view's sides a person's press point is kept (the pack's EDGE_CLEAR). */
export const EDGE_CLEAR = 48;
/** The framings compared: today's, a tenth wider, a fifth wider. */
export const ZOOMS = Object.freeze([
  Object.freeze({ id: 'today', zoom: 1, name: 'Today', note: 'The phone pack\'s framing, unchanged' }),
  Object.freeze({ id: 'wider-10', zoom: 0.9, name: 'A tenth wider', note: '0.9 × today\'s scale' }),
  Object.freeze({ id: 'wider-20', zoom: 0.8, name: 'A fifth wider', note: '0.8 × today\'s scale' }),
]);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const within = (value, lo, hi) => (lo <= hi ? clamp(value, lo, hi) : (lo + hi) / 2);
/** A press area's side in CSS pixels for a figure of scale unit (the game's pressSide: at least PRESS). */
export const pressSide = unit => Math.max(PRESS, Math.min(64, 0.26 * 214 * unit));

/** Where the pack presses a place: its press point (the game's own), in scene units. */
export const pressAt = slot => slotGeometry(slot).press;

/**
 * A room's framing in a panel (the room view between the bars): { k, tx, ty }, scene units to CSS
 * pixels. present: the slots of everyone the lit room shows. zoom: 1 for today's; below 1, wider.
 * room: the room's id, for its capsule (a wider view keeps it and its visitor in view where it can).
 */
export function roomFrame(scene, { width, height, cap = 46, pad = 8 }, present = [], { zoom = 1, room = null } = {}) {
  const [ix0, iy0, ix1, iy1] = scene.inner ?? [0, 0, 1024, 768];
  const fill = Math.max(width / (ix1 - ix0), height / (iy1 - iy0));
  let k = fill;
  let cx = (scene.focus[0] + scene.focus[2]) / 2;
  const xs = present.map(slot => pressAt(slot)[0]);
  if (xs.length) {
    const span = Math.max(...xs) - Math.min(...xs);
    if (span > 0 && span * k + PRESS > width) k = (width - PRESS) / span;
  }
  // Wider: the filled view's scale times zoom, unless a crowd already zoomed it out further (the
  // owner's T1, a full Jail): a wider framing is never smaller than that.
  k = Math.min(k, fill * zoom);
  const reach = width / (2 * k) - EDGE_CLEAR / k;
  if (xs.length) {
    const lo = Math.max(...xs) - reach, hi = Math.min(...xs) + reach;
    cx = lo <= hi ? clamp(cx, lo, hi) : (Math.min(...xs) + Math.max(...xs)) / 2;
  }
  // Wider: the capsule, its visitor's spot and the people together, if they fit; else the people.
  const device = zoom < 1 && room ? CAPSULES[room] : null;
  if (device) {
    const half = width / (2 * k) - 8 / k;
    const extra = [device.box[0], device.box[0] + device.box[2], device.spot[0] - 30 * device.scale, device.spot[0] + 30 * device.scale];
    const all = [...xs, ...extra];
    const lo = Math.max(...all) - half, hi = Math.min(...all) + half;
    if (lo <= hi) cx = clamp(cx, lo, hi);
    if (xs.length) { const plo = Math.max(...xs) - reach, phi = Math.min(...xs) + reach; cx = plo <= phi ? clamp(cx, plo, phi) : cx; }
  }
  const tx = within(width / 2 - cx * k, width - ix1 * k, -ix0 * k);
  const half = PRESS / 2 / k;
  const geometry = scene.slots.map(slot => slotGeometry(slot));
  const top = Math.min(...geometry.map(g => g.headTop));
  const bottom = Math.max(...geometry.map(g => g.press[1] + half));
  const avail = height - cap - pad;
  const ty = (bottom - top) * k > avail ? height - pad - bottom * k : cap + (avail - (bottom - top) * k) / 2 - top * k;
  // Today's is held inside the picture's inner box; a wider one inside the picture and its extension.
  const [y0, y1] = zoom < 1 ? [-REACH, 768 + REACH] : [iy0, iy1];
  return { k, tx, ty: within(ty, height - y1 * k, -y0 * k), zoom, fill };
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
  const [ax, ay] = FRAME.anchor, [bx, by, bw] = FRAME.box;
  const s = slot.scale * frame.k;
  return { left: frame.tx + slot.at[0] * frame.k - (ax - bx) * s, top: frame.ty + slot.at[1] * frame.k - (ay - by) * s, side: bw * s };
}
