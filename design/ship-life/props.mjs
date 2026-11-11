// mothership:dev-only
//
// Ship life: the props the rig does not draw, in the crew's ink (design/crew-drawing/source/ink.mjs):
// a small parcel, a wire out of a panel, a cleaning cloth, a food portion and its wrapper. Each is drawn in the
// figure's own frame (design/board-motion/figures/body.mjs: viewBox -90 -40 300 300, the floor at
// y 233), at the hand that holds it, so it moves, scales and mirrors with the figure. Public tones
// only: no team colour, nothing written, nothing that says what a role is or holds.

import { FRAME } from '../board-motion/figures/body.mjs';
import { item } from '../crew-drawing/source/figure.mjs';
import { inkCanvas } from '../crew-drawing/source/ink.mjs';
import { INK, PAPER, PAPER_DEEP, PAPER_SHADE, STEEL } from '../board-motion/figures/rig.mjs';

/** Where a hand holds a thing: a little past the wrist, along the hand's angle. */
export function handPoint(sk, side) {
  const w = sk[`w${side}`], spec = sk[`hand${side}`] ?? {};
  const a = ((spec.angle ?? 90) * Math.PI) / 180;
  return [w[0] + Math.cos(a) * 6, w[1] + Math.sin(a) * 6];
}

function parcel(cv, [x, y], angle) {
  cv.group(`translate(${x} ${y}) rotate(${angle})`, () => {
    cv.form([[-11, -8], [11, -8], [11, 8], [-11, 8]], PAPER_SHADE, { weight: 1.6, tension: 0, step: 1, depth: 2.4, seed: 7 });
    cv.line([[-11, -1], [11, -1]], { weight: 2.2, color: STEEL.mid, taper: 'none' });
    cv.line([[2, -8], [2, 8]], { weight: 2.2, color: STEEL.mid, taper: 'none' });
  });
}

function portion(cv, [x, y], angle) {
  // A food portion as the capsule gives it: a short bar in a paper sleeve with a steel band.
  cv.group(`translate(${x} ${y}) rotate(${angle})`, () => {
    cv.form([[-8, -4], [8, -4], [8, 4], [-8, 4]], PAPER, { weight: 1.4, tension: 0, step: 1, depth: 1.6, seed: 11 });
    cv.line([[-1.6, -4], [-1.6, 4]], { weight: 2.6, color: STEEL.light, taper: 'none' });
  });
}

function wrapper(cv, [x, y], angle) {
  cv.group(`translate(${x} ${y}) rotate(${angle})`, () => {
    cv.form([[-5, -3], [0, -5], [5, -2], [4, 3], [-1, 5], [-5, 2]], PAPER_DEEP, { weight: 1.2, depth: 1.2, seed: 13 });
    cv.line([[-2, -2], [1, 1], [3, -1]], { weight: 0.8, color: STEEL.mid });
  });
}

function cloth(cv, [x, y], angle) {
  // A small cleaning cloth bunched in the hand, a fold or two showing.
  cv.group(`translate(${x} ${y}) rotate(${angle})`, () => {
    cv.form([[-6, -4], [-1, -6.5], [5, -4.5], [6.5, 1], [3, 6], [-3, 5.5], [-6.5, 2]], PAPER_SHADE, { weight: 1.3, depth: 1.4, tension: 0.6, seed: 17 });
    cv.line([[-3, -3], [1, 0], [4, -1]], { weight: 0.8, color: PAPER_DEEP });
    cv.line([[-4, 2], [0, 3.5]], { weight: 0.8, color: PAPER_DEEP });
  });
}

function wire(cv, from, to) {
  // A pale cable with an ink edge, so it reads over the dark inside of a panel and over its door.
  const mid = [(from[0] + to[0]) / 2 + 2, Math.max(from[1], to[1]) + 9];
  cv.line([from, mid, to], { weight: 4.2, color: INK, taper: 'none' });
  cv.line([from, mid, to], { weight: 2.2, color: STEEL.pale, taper: 'none' });
  cv.line([[to[0] - 3.5, to[1] - 2], [to[0] + 3.5, to[1] + 2]], { weight: 5.6, color: INK, taper: 'none' });
  cv.line([[to[0] - 3, to[1] - 1.7], [to[0] + 3, to[1] + 1.7]], { weight: 3.4, color: STEEL.light, taper: 'none' });
}

/**
 * What waits at a place between times (activities.mjs RESTING), as one SVG in its occupant's frame,
 * placed at the place: each thing not in held (what the occupant's hands hold this frame) at its
 * spot. Drawn behind the occupant.
 */
export function restingSvg(resting, held = {}, { prefix = 'rest' } = {}) {
  const kinds = Object.keys(resting ?? {}).filter(kind => !held?.[kind]);
  if (!kinds.length) return '';
  const cv = inkCanvas(prefix);
  for (const kind of kinds) {
    const { at, angle = 0 } = resting[kind];
    if (kind === 'parcel') parcel(cv, at, angle);
    else if (kind === 'portion') portion(cv, at, angle);
    else if (kind === 'laptop') item(cv, 'laptop', at, angle);
    else throw new Error(`Nothing waits as ${kind}`);
  }
  const [minX, minY, w, h] = FRAME.box;
  return cv.svg({ viewBox: `${minX} ${minY} ${w} ${h}`, width: w, height: h });
}

/**
 * The props a figure holds this frame, as one SVG in the figure's frame. props: { parcel: 'N' |
 * 'F' | 'between', portion: 'N' | 'F', wrapper: 'N' | 'F', wire: 'F' | 'N', cloth: 'F' | 'N' }; anchors: fixed points
 * a prop comes from ({ wire: [x, y] }, the panel the wire leaves).
 */
export function propsSvg(sk, props, { prefix = 'prop', anchors = {} } = {}) {
  const kinds = Object.keys(props ?? {});
  if (!kinds.length) return '';
  const cv = inkCanvas(prefix);
  const at = side => (side === 'between' ? [(handPoint(sk, 'N')[0] + handPoint(sk, 'F')[0]) / 2, (handPoint(sk, 'N')[1] + handPoint(sk, 'F')[1]) / 2 - 2] : handPoint(sk, side));
  const angleOf = side => (side === 'between' ? 0 : ((sk[`hand${side}`]?.angle ?? 90) - 90) * 0.35);
  if (props.wire) wire(cv, anchors.wire ?? [26, 50], at(props.wire));
  if (props.parcel) parcel(cv, at(props.parcel), angleOf(props.parcel));
  if (props.portion) portion(cv, at(props.portion), angleOf(props.portion));
  if (props.wrapper) wrapper(cv, at(props.wrapper), angleOf(props.wrapper));
  if (props.cloth) cloth(cv, at(props.cloth), angleOf(props.cloth));
  const [minX, minY, w, h] = FRAME.box;
  return cv.svg({ viewBox: `${minX} ${minY} ${w} ${h}`, width: w, height: h });
}
