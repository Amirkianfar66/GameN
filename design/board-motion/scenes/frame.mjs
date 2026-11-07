// mothership:dev-only
//
// How a room scene is framed in a board panel of any size, and where each place's figure and
// press area fall in it. Pure functions: the prototype frames its panels with them and the
// checks measure them in Node.
//
// The panel shows the scene's focus (the bay its places are in) across its width, never less
// than covering the panel with the picture. Vertically it shows the band from the back row's
// heads to the front row's press areas under the room's caption; on a panel too short for the
// whole band it keeps the press areas and lets the back row's heads go under the caption.

import { FRAME } from '../figures/body.mjs';
import { skeletonOf } from '../figures/gestures.mjs';

/** The smallest press area, in CSS pixels. */
export const PRESS = 44;
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/**
 * A gesture's press point, in figure units: the upper chest, between the head and the hips,
 * or where the gesture says (a character lying under a blanket is pressed at the head).
 */
export const pressPoint = sk => sk.press ?? lerp(sk.head, sk.pelvis, 0.4);

/** A figure point of a place, in scene units. */
export function toScene(slot, [x, y]) {
  const [ax, ay] = FRAME.anchor;
  return [slot.at[0] + (slot.mirror ? ax - x : x - ax) * slot.scale, slot.at[1] + (y - ay) * slot.scale];
}

/** Where a place's figure is, in scene units: its press point and the top of its head. */
export function slotGeometry(slot, gesture = slot.gesture) {
  const sk = skeletonOf(gesture);
  return { press: toScene(slot, pressPoint(sk)), headTop: toScene(slot, [sk.head[0], sk.head[1] - 24])[1] };
}

/**
 * The scale (CSS pixels per scene unit) and offset of a scene in a panel width x height with a
 * caption band cap pixels tall at its top and pad pixels kept at its foot.
 */
export function frameScene(scene, { width, height, cap = 44, pad = 6 }) {
  const [ix0, iy0, ix1, iy1] = scene.inner ?? [0, 0, 1024, 768];
  const [fx0, , fx1] = scene.focus;
  const k = Math.max(width / (fx1 - fx0), width / (ix1 - ix0), height / (iy1 - iy0));
  const half = PRESS / 2 / k;
  const geometry = scene.slots.map(slot => slotGeometry(slot));
  const top = Math.min(...geometry.map(g => g.headTop));
  const bottom = Math.max(...geometry.map(g => g.press[1] + half));
  const tx = clamp(width / 2 - ((fx0 + fx1) / 2) * k, width - ix1 * k, -ix0 * k);
  const avail = height - cap - pad;
  const ty = (bottom - top) * k > avail ? height - pad - bottom * k : cap + (avail - (bottom - top) * k) / 2 - top * k;
  return { k, tx, ty: clamp(ty, height - iy1 * k, -iy0 * k) };
}

/**
 * Each place's press area in a framed panel, in CSS pixels: PRESS square on the figure's press
 * point, moved inward where it would leave the panel or reach under the caption, so that every
 * press area is whole, on screen and still on its figure.
 */
export function pressRects(scene, { k, tx, ty }, { width, height, cap = 44, pad = 6 }, slots = scene.slots) {
  return slots.map(slot => {
    const g = slotGeometry(slot);
    const x = clamp(tx + g.press[0] * k - PRESS / 2, 0, width - PRESS);
    const y = clamp(ty + g.press[1] * k - PRESS / 2, cap, height - pad - PRESS);
    return { id: slot.id, left: x, top: y, right: x + PRESS, bottom: y + PRESS };
  });
}
