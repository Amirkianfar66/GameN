// Owned runtime port of Designer #229. The numeric-input seam supports immutable dark reflow.
import {FRAME} from '../scene-drawing/body.mjs';
import {INJURED} from '../scene-drawing/gestures.mjs';
import {PRESS,slotGeometry} from '../scene-drawing/frame.mjs';
import {FIGURE_EXTENTS,FIGURE_MOTION_REACH} from './phone-figure-extents.mjs';
const [ax,ay]=FRAME.anchor;

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
/** clamp(), except that a picture smaller than the panel (lo above hi) is centred in it. */
const within = (value, lo, hi) => (lo <= hi ? clamp(value, lo, hi) : (lo + hi) / 2);

/** How far inside the view's side edges a person's press point is kept, in CSS pixels. */
export const EDGE_CLEAR = 48;
/** How far inside the view's edges every present figure's painted outline is kept, in CSS pixels. */
export const FIGURE_CLEAR = 4;
/**
 * The least margin kept round a gesture's measured outline (figure-extents.mjs), in frame units, for
 * the crew's own motion while a figure stands, sits or lies in its place: the head's idle drift and
 * tilt and the hanging hair's swing (crew-drawing/motion.mjs), across and above; its feet do not
 * move. Where a gesture's measured motion reaches further (FIGURE_MOTION_REACH: Mira's or Echo's
 * hair swinging past the pillow of the Jail's cot), that reach is the margin on that side.
 */
export const MOTION_ALLOWANCE = Object.freeze({ x: 8, top: 6, bottom: 0 });

/**
 * A place's painted outline in scene units, [x0, y0, x1, y1]: what its occupant is drawn as there,
 * from the measured extents, with the motion's margin (MOTION_ALLOWANCE, or the gesture's measured
 * reach where it is further), mirrored with the place, and held to the picture's own box (nothing
 * past it can be framed). Standing (sitting, lying) and Injured count as
 * one outline, so an injury never moves the camera; an Eliminated occupant (slot.eliminated) is its
 * place's down pose, which the lit room shows.
 */
export function paintedExtent(slot) {
  const drawn = slot.eliminated && slot.down ? [slot.down] : [slot.gesture, `${slot.gesture}${INJURED}`];
  const boxes = drawn.map(gesture => {
    const box = FIGURE_EXTENTS[gesture];
    if (!box) throw new Error(`No measured extent for ${gesture} (design/tools/phone-ui-figure-extents.mjs)`);
    // A gesture gone still (an Eliminated down pose, +still) does not move: it keeps the allowance alone.
    const [l, t, r, b] = FIGURE_MOTION_REACH[gesture] ?? [0, 0, 0, 0];
    return [box[0] - Math.max(MOTION_ALLOWANCE.x, l), box[1] - Math.max(MOTION_ALLOWANCE.top, t),
      box[2] + Math.max(MOTION_ALLOWANCE.x, r), box[3] + Math.max(MOTION_ALLOWANCE.bottom, b)];
  });
  const fx0 = Math.min(...boxes.map(b => b[0])), fx1 = Math.max(...boxes.map(b => b[2]));
  const fy0 = Math.min(...boxes.map(b => b[1])), fy1 = Math.max(...boxes.map(b => b[3]));
  const s = slot.scale, [x, y] = slot.at;
  const a = x + (fx0 - ax) * s, b = x + (fx1 - ax) * s;
  const [x0, x1] = slot.mirror ? [2 * x - b, 2 * x - a] : [a, b];
  return [Math.max(0, x0), Math.max(0, y + (fy0 - ay) * s), Math.min(1024, x1), Math.min(768, y + (fy1 - ay) * s)];
}

/**
 * The phone room view's framing, for a tall panel (the space between the top bar and the tabs).
 * The game's frameScene() spreads the bay its places are in across the panel's width, which on a
 * portrait phone zooms a landscape room far in and cuts people off at the sides. This uses the
 * smallest scale that still fills the panel with the picture (its inner box), so as much of the
 * room shows as fits without empty bands. Across, it holds the bay's centre, as the game does, and
 * moves only as far as it must to keep everyone present EDGE_CLEAR inside the sides; when they
 * span more than the view, it centres on them. Vertically it keeps frameScene()'s band, from the
 * back row's heads to the front row's press areas under the caption.
 *
 * The owner's decision of 11 November 2026 (T1): nobody present is cut off. Each present figure's
 * whole painted outline (paintedExtent: its measured pixels and the motion's margin) stays at
 * least FIGURE_CLEAR inside the view, and each press area whole; when they cannot, the view zooms
 * out just far enough, and the bands that leaves are the cost. Frontend and Integration found that
 * press areas alone are not enough (#222: A3's reach at the floor hatch was cut in a full Room A).
 * Up and down, the band runs from the top of the back row's outlines to the bottom of the front
 * row's outlines and press areas, over every place, so it does not depend on who is present; it
 * may show the picture's own border (its box past the inner box) where an outline reaches it. The
 * framing depends only on who the lit room already shows, and the game holds it still from
 * lights-out to lights-on (phone-ui.md, the Blackout).
 */
export function phoneFrame(scene, { width, height, cap = 44, pad = 6 }, present = [], input = null) {
  const [ix0, iy0, ix1, iy1] = scene.inner ?? [0, 0, 1024, 768];
  let k = Math.max(width / (ix1 - ix0), height / (iy1 - iy0));
  let cx = (scene.focus[0] + scene.focus[2]) / 2;
  const xs = input ? (input.populated ? [input.pressMin, input.pressMax] : []) : present.map(slot => slot.pressAt[0]);
  const outlines = input ? (input.populated ? [[input.figureMin, 0, input.figureMax, 0]] : []) : present.map(paintedExtent);
  const populated = input ? input.populated : present.length;
  const fx0 = Math.min(...outlines.map(o => o[0])), fx1 = Math.max(...outlines.map(o => o[2]));
  if (populated) {
    const span = Math.max(...xs) - Math.min(...xs);
    if (span > 0 && span * k + PRESS > width) k = (width - PRESS) / span;
    if ((fx1 - fx0) * k + 2 * FIGURE_CLEAR > width) k = (width - 2 * FIGURE_CLEAR) / (fx1 - fx0);
  }
  // Up and down: every place's outline and press area, whoever is present.
  const geometry = scene.slots.map(slot => ({ g: slotGeometry(slot), o: paintedExtent(slot) }));
  const top = Math.min(...geometry.map(({ g, o }) => Math.min(g.headTop, o[1])));
  const band = kk => Math.max(...geometry.map(({ g, o }) => Math.max(g.press[1] + PRESS / 2 / kk, o[3]))) - top;
  // What the band may never exceed: the panel below FIGURE_CLEAR and above its foot.
  const room = height - pad - FIGURE_CLEAR;
  for (let i = 0; i < 4 && band(k) * k > room; i += 1) k = (room - PRESS / 2) / (band(k) - PRESS / 2 / k);
  if (populated) {
    const half = width / (2 * k);
    const lo = Math.max(Math.max(...xs) + EDGE_CLEAR / k, fx1 + FIGURE_CLEAR / k) - half;
    const hi = Math.min(Math.min(...xs) - EDGE_CLEAR / k, fx0 - FIGURE_CLEAR / k) + half;
    if (lo <= hi) cx = clamp(cx, lo, hi);
    else {
      // Press points that cannot all keep EDGE_CLEAR: the outlines stay whole, centred between them.
      const flo = fx1 + FIGURE_CLEAR / k - half, fhi = fx0 - FIGURE_CLEAR / k + half;
      cx = flo <= fhi ? clamp((Math.min(...xs) + Math.max(...xs)) / 2, flo, fhi) : (fx0 + fx1) / 2;
    }
  }
  // Across, the picture's inner box covers the view, unless an outline needs the picture's own border.
  const [bx0, bx1] = populated ? [Math.min(ix0, fx0 - FIGURE_CLEAR / k), Math.max(ix1, fx1 + FIGURE_CLEAR / k)] : [ix0, ix1];
  const tx = within(width / 2 - cx * k, width - Math.min(1024, bx1) * k, -Math.max(0, bx0) * k);
  const bottom = top + band(k);
  const avail = height - cap - pad;
  const ty = (bottom - top) * k > avail ? height - pad - bottom * k : cap + (avail - (bottom - top) * k) / 2 - top * k;
  const [by0, by1] = [Math.max(0, Math.min(iy0, top - FIGURE_CLEAR / k)), Math.min(768, Math.max(iy1, bottom))];
  return { k, tx, ty: within(ty, height - by1 * k, -by0 * k) };
}

/** Derived public framing bounds only: no occupied position IDs, roster or identity is retained. */
export function framingInput(present=[]){
 const xs=present.map(s=>s.pressAt[0]),outlines=present.map(paintedExtent);
 return Object.freeze({populated:present.length?1:0,pressMin:xs.length?Math.min(...xs):0,pressMax:xs.length?Math.max(...xs):0,figureMin:outlines.length?Math.min(...outlines.map(o=>o[0])):0,figureMax:outlines.length?Math.max(...outlines.map(o=>o[2])):0});
}
