// mothership:dev-only
//
// The Hospital panel's motion: pure functions of t (ms). Each plays once, from the moment its cause
// arrives, and never while a command is pending or after a refusal:
//   press     a key picked on this phone (local feedback, no server fact): the cap lights, the digit lands
//   register  the accepted receipt (REGISTERED): a scan crosses the screen and the number leaves it
//   reserve   the view first carries R12's RESERVED for this round: the vial rises into the cradle and lights
//   wrong     the view first carries R12's WRONG: a failing-red strike draws across the blank screen
// When the view brings R12's result with the receipt, the result plays alone (no scan first). A
// reconnect draws the state at rest. No sound and no vibration: the panel is private, and a sound
// would tell the ward that a number was tried. Reduced: fades only.

import { clamp01, easeInOutCubic, easeOutBack, easeOutCubic } from '../../cinematic/lib/ease.mjs';

export const MOTION = Object.freeze({
  press: Object.freeze({ end: 180, cap: Object.freeze([0, 120]), digit: Object.freeze([40, 180]) }),
  register: Object.freeze({ end: 600, scan: Object.freeze([0, 480]), digits: Object.freeze([300, 480]), stamp: Object.freeze([420, 600]) }),
  reserve: Object.freeze({ end: 820, rise: Object.freeze([0, 420]), glow: Object.freeze([380, 700]), stamp: Object.freeze([560, 820]) }),
  wrong: Object.freeze({ end: 560, strike: Object.freeze([0, 260]), stamp: Object.freeze([260, 560]) }),
  reduced: Object.freeze({ end: 160 }),
});

const span = (t, [a, b]) => clamp01((t - a) / (b - a));
const stampAt = v => ({ opacity: easeOutCubic(clamp01(v * 1.6)), scale: 1 + 0.35 * (1 - easeOutBack(v)), rotate: -8 });
const reducedFrame = (t, extra = {}) => ({ reduced: true, after: { opacity: clamp01(t / MOTION.reduced.end) }, stamp: { opacity: clamp01(t / MOTION.reduced.end), scale: 1, rotate: -8 }, done: t >= MOTION.reduced.end, ...extra });

/** A key picked: the cap presses in and lights; the digit lands on the screen. */
export function pressFrame(t, { reduced = false } = {}) {
  if (reduced) return { reduced: true, cap: { scale: 1, lit: 1 }, digit: { opacity: clamp01(t / MOTION.reduced.end), scale: 1 }, done: t >= MOTION.reduced.end };
  const m = MOTION.press;
  const c = span(t, m.cap);
  const d = span(t, m.digit);
  return { reduced: false, cap: { scale: 1 - 0.08 * Math.sin(Math.PI * c), lit: c }, digit: { opacity: easeOutCubic(d), scale: 1.25 - 0.25 * easeOutBack(d) }, done: t >= m.end };
}

/** The receipt: the scan crosses the screen (0..1 of its width), the number fades out, REGISTERED. */
export function registerFrame(t, { reduced = false } = {}) {
  if (reduced) return reducedFrame(t, { scan: { x: 1, opacity: 0 }, digits: { opacity: 1 - clamp01(t / MOTION.reduced.end) } });
  const m = MOTION.register;
  const s = span(t, m.scan);
  return { reduced: false, scan: { x: easeInOutCubic(s), opacity: s > 0 && s < 1 ? 1 : 0 }, digits: { opacity: 1 - span(t, m.digits) }, stamp: span(t, m.stamp) > 0 ? stampAt(span(t, m.stamp)) : { opacity: 0, scale: 1.35, rotate: -8 }, done: t >= m.end };
}

/** R12 reserved: the vial rises from below the cradle (rise 1 = seated) and lights; RESERVED. */
export function reserveFrame(t, { reduced = false } = {}) {
  if (reduced) return reducedFrame(t, { vial: { rise: 1, glow: 1, opacity: clamp01(t / MOTION.reduced.end) } });
  const m = MOTION.reserve;
  const r = span(t, m.rise);
  return { reduced: false, vial: { rise: easeOutCubic(r), glow: easeOutCubic(span(t, m.glow)), opacity: Math.min(1, r * 3) }, stamp: span(t, m.stamp) > 0 ? stampAt(span(t, m.stamp)) : { opacity: 0, scale: 1.35, rotate: -8 }, done: t >= m.end };
}

/** R12 wrong: the strike draws across the screen (draw 1 = whole), no shake; WRONG NUMBER. */
export function wrongFrame(t, { reduced = false } = {}) {
  if (reduced) return reducedFrame(t, { strike: { draw: 1, opacity: clamp01(t / MOTION.reduced.end) } });
  const m = MOTION.wrong;
  return { reduced: false, strike: { draw: easeOutCubic(span(t, m.strike)), opacity: 1 }, stamp: span(t, m.stamp) > 0 ? stampAt(span(t, m.stamp)) : { opacity: 0, scale: 1.35, rotate: -8 }, done: t >= m.end };
}

export const FRAMES = Object.freeze({ press: pressFrame, register: registerFrame, reserve: reserveFrame, wrong: wrongFrame });
export const motionEnd = (kind, reduced = false) => (reduced ? MOTION.reduced.end : MOTION[kind].end);
