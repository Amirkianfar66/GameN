// mothership:dev-only
//
// The small parts every figure shares: hands, boots, the shoulder patch, and the few things a
// hand can hold in a room (a tablet, a clipboard, a wrench, a flask, a mug). Held things are
// drawn in public tones only: none of them belongs to a role, and none is a weapon.

import { INK, PAPER, PAPER_DEEP, PAPER_SHADE, STEEL, blob } from './rig.mjs';
import { BOOTS } from './crew.mjs';

const mirror = (points, x, dir) => points.map(([dx, dy]) => [x + dx * dir, dy]);

/**
 * A hand at a point, its fingers pointing at angle (degrees, 0 = right, 90 = down). type:
 * 'open' (the default), 'fist' (closed, the knuckles forward) or 'flat' (laid on a surface).
 */
export function hand(cv, c, [x, y], angle = 0, { size = 1.15, type = 'open' } = {}) {
  cv.group(`translate(${x} ${y}) rotate(${angle}) scale(${size})`, () => {
    if (type === 'fist') {
      cv.form(blob([[-4.4, -3.6], [2.6, -4.6], [5.6, -1.6], [5.2, 3.4], [0.6, 5], [-4.6, 3.6]]), c.skin, { stroke: 1.9, shadow: blob([[0.6, 0.6], [5.4, 0.4], [4.6, 4], [0.4, 4.6]]), dots: false });
      cv.line('M1.2 -3.6 Q3 -0.6 1.2 2.6 M3.6 -3 Q5.2 -0.4 3.6 2.2', { width: 0.9 });
      return;
    }
    if (type === 'flat') {
      cv.form(blob([[-4.6, -2.4], [4.4, -3.2], [8.6, -1.4], [8.8, 1.6], [4, 3], [-4.4, 2.8]]), c.skin, { stroke: 1.8, shadow: blob([[-1, 0.8], [8.6, 0.6], [4, 2.8], [-3, 2.6]]), dots: false });
      cv.line('M3 -0.6 L8 -0.6 M3 1.2 L7.6 1.2', { width: 0.8 });
      return;
    }
    cv.form(blob([[-4.3, -3.1], [3.8, -3.8], [6.4, 0], [4.3, 4.3], [-3.1, 4.1], [-5, 0.5]]), c.skin, { stroke: 1.9, shadow: blob([[0.6, 1], [6.2, 0.4], [4.2, 4.2], [-1.2, 4]]), dots: false });
    cv.line('M-1.6 -3.2 Q-4 -0.2 -1.8 2.4', { width: 1.1 });
  });
}

/**
 * A boot, its ankle at a point, the toe to the left (dir -1) or the right (dir 1), the sole
 * turned by angle degrees (0 = flat on the floor).
 */
export function boot(cv, [x, y], dir = -1, angle = 0, { view = 'side' } = {}) {
  cv.group(`translate(${x} ${y}) rotate(${angle})`, () => {
    if (view === 'back') {
      // Seen from behind: the heel and the back of the sole.
      cv.form(blob([[-6.4, -6], [6.4, -6], [7.4, 8], [6.6, 14.6], [-6.6, 14.6], [-7.4, 8]], 0.5), BOOTS, { stroke: 2.3, shadow: blob([[1.6, -6], [6.4, -6], [7.4, 8], [6.6, 14.6], [1.6, 14.6]], 0.5) });
      cv.line('M-6.8 10.6 H6.8', { width: 1.6 });
      cv.line('M-5.6 -1 L5.6 -1', { width: 1.2, color: STEEL.light });
      return;
    }
    const shape = mirror([[-6, -6], [-6, 3], [-12, 6.5], [-16, 11], [-14, 14.5], [5, 14.5], [7, 10], [6.4, -6]], 0, -dir);
    cv.form(blob(shape, 0.5), BOOTS, { stroke: 2.3, shadow: blob(mirror([[1, -6], [6.4, -6], [7, 10], [5, 14.5], [0, 14.5]], 0, -dir), 0.5) });
    cv.line(`M${15 * dir} 11.6 L${-6.6 * dir} 11.6`, { width: 1.6 });
    cv.line('M-5.6 -1 L5.6 -1', { width: 1.2, color: STEEL.light });
  });
}

/** A shoulder patch: the character's field, with a stripe of its accent. */
export function patch(cv, c, [x, y], angle) {
  cv.group(`translate(${x} ${y}) rotate(${angle})`, () => {
    cv.form('M-5.4 -2.8 H5.4 V2.8 H-5.4 Z', c.field, { stroke: 1.6 });
    cv.line('M-5.4 0.2 H5.4', { width: 1.1, color: c.accent });
  });
}

/**
 * Something held, drawn at the hand (x, y) along angle, or a gesture's own prop (a laptop on
 * the knees). Public tones only. A tablet's or a laptop's screen is a plain light panel:
 * nothing is written on it.
 */
export function item(cv, kind, [x, y], angle = 0) {
  cv.group(`translate(${x} ${y}) rotate(${angle})`, () => {
    if (kind === 'tablet') {
      cv.form('M-11 -15 H11 Q13 -15 13 -13 V13 Q13 15 11 15 H-11 Q-13 15 -13 13 V-13 Q-13 -15 -11 -15 Z', STEEL.deep, { stroke: 2 });
      cv.fill('M-10 -12 H10 V11 H-10 Z', STEEL.light);
      cv.line('M-7 -7 H5 M-7 -2 H7 M-7 3 H2', { width: 1.4, color: STEEL.pale });
      cv.line('M-10 -12 L-3 -12 L-10 -5 Z', { width: 0.8, color: PAPER, opacity: 0.6 });
    } else if (kind === 'clipboard') {
      cv.form('M-11 -15 H11 V15 H-11 Z', PAPER_DEEP, { stroke: 2 });
      cv.fill('M-8.6 -10 H8.6 V12.6 H-8.6 Z', PAPER);
      cv.form('M-5 -17 H5 V-12 H-5 Z', STEEL.mid, { stroke: 1.4 });
      cv.line('M-6 -5 H6 M-6 0 H6 M-6 5 H3', { width: 1, color: STEEL.light });
    } else if (kind === 'wrench') {
      cv.form('M-2 -2.4 L20 -2.4 L20 2.4 L-2 2.4 Z', STEEL.light, { stroke: 1.6 });
      cv.form('M18 -6 Q27 -7 27 0 Q27 7 18 6 L20 2.4 L24 2 L24 -2 L20 -2.4 Z', STEEL.light, { stroke: 1.6 });
    } else if (kind === 'flask') {
      cv.form('M-2.6 -14 H2.6 V-6 L9 8 Q10 12 6 12 H-6 Q-10 12 -9 8 L-2.6 -6 Z', STEEL.pale, { stroke: 1.8 });
      cv.fill('M-6.6 3 H6.6 L8.4 8 Q9 10.6 6 10.6 H-6 Q-9 10.6 -8.4 8 Z', PAPER_SHADE);
      cv.line('M-3.6 -14 H3.6', { width: 2, color: INK });
    } else if (kind === 'laptop') {
      // Open on the knees, seen from the side: the base along the thighs from the hinge at the
      // origin, the lid up from it, its screen lighting the face it is turned to.
      cv.fill('M14 -22 A20 17 0 1 0 14.01 -22 Z', PAPER, 0.2);
      cv.form('M-2 0 L37 -2.4 L39 1.4 L0 4 Z', STEEL.mid, { stroke: 1.8 });
      cv.line('M5 -0.2 L31 -1.9', { width: 1.1, color: STEEL.light });
      cv.form('M-2 0 L-12 -33 L-3 -36 L7 -2 Z', STEEL.deep, { stroke: 2 });
      cv.line('M5.4 -3.4 L-3.6 -33.6', { width: 2, color: STEEL.pale });
      cv.fill('M-4 -18 A2.2 2.2 0 1 0 -3.99 -18 Z', STEEL.light);
    } else if (kind === 'mug') {
      cv.form('M-6 -7 H6 V7 Q6 9 4 9 H-4 Q-6 9 -6 7 Z', STEEL.light, { stroke: 1.8 });
      cv.line('M6 -3 Q11 -3 11 1 Q11 5 6 5', { width: 1.8 });
    }
  });
}
