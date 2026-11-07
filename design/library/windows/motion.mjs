// mothership:dev-only
//
// The windows' motion: pure functions of t (ms). Each plays once, from the moment its cause first
// arrives in a view this screen has already drawn, and never on a reconnect (which draws at rest):
//   show    the artist's accepted SHOW_WINDOW receipt: the drawing lifts off the pad into the
//           window's pane, SHOWN lands
//   arrive  a drawing first seen in a window (R7: no publishedAt, so on first sight only): it
//           drops into the end of the feed and its tape presses down
//   dark    the Blackout begins: the shade lowers over the pane
//   light   the Blackout ends: the shade rises
// Strokes follow the finger with no animation of their own. No sound: a sound would tell the
// table that someone drew or showed something. Reduced: fades only, 160 ms.

import { clamp01, easeInOutCubic, easeOutBack, easeOutCubic } from '../../cinematic/lib/ease.mjs';

export const MOTION = Object.freeze({
  show: Object.freeze({ end: 760, lift: Object.freeze([0, 480]), land: Object.freeze([360, 560]), stamp: Object.freeze([480, 760]) }),
  arrive: Object.freeze({ end: 420, drop: Object.freeze([0, 360]), tape: Object.freeze([240, 420]) }),
  dark: Object.freeze({ end: 420, lower: Object.freeze([0, 320]), label: Object.freeze([240, 420]) }),
  light: Object.freeze({ end: 320, raise: Object.freeze([0, 320]) }),
  reduced: Object.freeze({ end: 160 }),
});

const span = (t, [a, b]) => clamp01((t - a) / (b - a));
const fade = t => clamp01(t / MOTION.reduced.end);
const stampAt = v => (v > 0 ? { opacity: easeOutCubic(clamp01(v * 1.6)), scale: 1 + 0.35 * (1 - easeOutBack(v)), rotate: -8 } : { opacity: 0, scale: 1.35, rotate: -8 });

/** The drawing lifts off the pad (lift 1 = in the pane, shrunk to scale 0.5), the new image lands, SHOWN. */
export function showFrame(t, { reduced = false } = {}) {
  if (reduced) return { reduced: true, ghost: { opacity: 1 - fade(t), lift: 0, scale: 1 }, landed: { opacity: fade(t), drop: 1 }, stamp: { opacity: fade(t), scale: 1, rotate: -8 }, done: t >= MOTION.reduced.end };
  const m = MOTION.show, l = easeInOutCubic(span(t, m.lift)), d = easeOutCubic(span(t, m.land));
  return { reduced: false, ghost: { opacity: 1 - span(t, [360, 480]), lift: l, scale: 1 - 0.5 * l }, landed: { opacity: Math.min(1, d * 2), drop: d }, stamp: stampAt(span(t, m.stamp)), done: t >= m.end };
}

/** A drawing first seen drops into the feed (drop 1 = in place) and its tape presses down (tape 1 = flat). */
export function arriveFrame(t, { reduced = false } = {}) {
  if (reduced) return { reduced: true, image: { opacity: fade(t), drop: 1 }, tape: { press: 1 }, done: t >= MOTION.reduced.end };
  const m = MOTION.arrive, d = easeOutCubic(span(t, m.drop));
  return { reduced: false, image: { opacity: Math.min(1, d * 2), drop: d }, tape: { press: easeOutBack(span(t, m.tape)) }, done: t >= m.end };
}

/** The shade lowers over the pane (cover 1 = closed); the "Lights out" words fade in. */
export function darkFrame(t, { reduced = false } = {}) {
  if (reduced) return { reduced: true, shade: { opacity: fade(t), cover: 1 }, label: { opacity: fade(t) }, done: t >= MOTION.reduced.end };
  const m = MOTION.dark;
  return { reduced: false, shade: { opacity: 1, cover: easeInOutCubic(span(t, m.lower)) }, label: { opacity: easeOutCubic(span(t, m.label)) }, done: t >= m.end };
}

/** The shade rises (cover 0 = open) and the pane's drawings are there again. */
export function lightFrame(t, { reduced = false } = {}) {
  if (reduced) return { reduced: true, shade: { opacity: 1 - fade(t), cover: 1 }, label: { opacity: 1 - fade(t) }, done: t >= MOTION.reduced.end };
  const m = MOTION.light, r = easeInOutCubic(span(t, m.raise));
  return { reduced: false, shade: { opacity: 1, cover: 1 - r }, label: { opacity: 1 - Math.min(1, r * 2) }, done: t >= m.end };
}

export const FRAMES = Object.freeze({ show: showFrame, arrive: arriveFrame, dark: darkFrame, light: lightFrame });
export const motionEnd = (kind, reduced = false) => (reduced ? MOTION.reduced.end : MOTION[kind].end);
