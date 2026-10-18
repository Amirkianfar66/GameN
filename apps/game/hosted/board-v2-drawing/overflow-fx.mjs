// Runtime drawing port of Claude cb9386bd716dc346160509d5e49d7348fdaf4f84; source design/board-v2/fx/overflow.mjs.
// Only development fence and relative imports adapted; canonical source preserved.
//
// Where the successor board draws its off-board record and the overflow victim's beat (the owner's
// four-bed decision of 18 October 2026, HOSPITAL-4-2026-10-18, issue #155). Pure geometry, for
// Node and the browser alike; the art is #159's (fx/captain.mjs: the plaque and the grey cut-outs).
//
// In the successor a character can be off the board for two reasons, the Captain's EJECT and a
// Hospital found full, so the plaque that counts them leaves the Jail's caption, where it would
// suggest the airlock, for the spine between the Hospital and the Jail: beside both rooms, neither's.
// It counts the seats whose location is null, whatever took them off; the number is the page's text.

import { LABEL_MARGIN } from './label-box.mjs';

/** This module's version (a proposal for the successor's board). */
export const OVERFLOW_FX_VERSION = 'board-v2-overflow-0.1.0';

const f = value => Number(value.toFixed(2));

/**
 * The plaque on the successor board: centred in the spine between the Hospital's box and the
 * Jail's, at the height of their caption band. hospital and jail are the rooms' boxes on the phone
 * ({ left, top, width, height }); border is the panels' border and cap the caption band's height
 * (fit.mjs's shell); size is the plaque's laid-out [width, height], its count included. Returns
 * { left, top, width, height }, or null where the spine is narrower than the plaque.
 */
export function spinePlaqueBox({ hospital, jail, border, cap, size: [width, height] }) {
  const spineLeft = hospital.left + hospital.width;
  const spine = jail.left - spineLeft;
  if (spine < width) return null;
  const bandTop = Math.max(hospital.top, jail.top) + border;
  return { left: f(spineLeft + (spine - width) / 2), top: f(bandTop + Math.max(0, (cap - height) / 2)), width, height };
}

/**
 * The Hospital's FULL stamp during the overflow beat: right of the Hospital's caption, in its band,
 * vertically centred on it (the shape of fx/captain.mjs's plaqueBox()), where it fits whole there;
 * otherwise, on the smallest phones, just below the caption's band under its left end. Never over
 * the caption or anything in keepClear (the Hospital's press areas). caption is the caption's box
 * in the panel; size the stamp's laid-out [width, height]; panel { width, cap }. Returns
 * { left, top, place: 'band' | 'below' }, or null where neither place is clear: the client's words
 * then say it alone.
 */
export function fullStampBox({ caption, size: [width, height], panel, keepClear = [] }) {
  const m = LABEL_MARGIN;
  const meets = (a, b) => a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
  const right = caption.left + caption.width + 3 * m;
  if (right + width <= panel.width - m) {
    return { left: f(right), top: f(Math.max(m, Math.min(panel.cap - height - m, caption.top + (caption.height - height) / 2))), place: 'band' };
  }
  const below = { left: Math.max(m, caption.left), top: panel.cap + m, width, height };
  if (below.left + width <= panel.width - m && !keepClear.some(box => meets(below, box))) return { left: f(below.left), top: f(below.top), place: 'below' };
  return null;
}

/**
 * The way the victim's grey cut-out leaves the board: from its press point (where it was) to the
 * plaque's centre, in page pixels, on a gentle arc above the straight line (lift, in px, at its
 * middle). v from 0 to 1. Returns [x, y].
 */
export function overflowWay(from, to, v, lift = 36) {
  const x = from[0] + (to[0] - from[0]) * v;
  const y = from[1] + (to[1] - from[1]) * v - lift * 4 * v * (1 - v);
  return [f(x), f(y)];
}
