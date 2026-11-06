// mothership:dev-only
//
// The offices' motion: pure functions of t (ms), each played once when its cause first arrives in
// a view this screen has already drawn (states.mjs officeChanges()), never on a reconnect:
//   appoint  a seat newly holds the Officer office: its badge pins onto the name tag and the board
//   block    a seat is newly blocked: the hazard tape unrolls across its figure's feet
//   expire   the block ends with its round: the tape rolls back and is gone
// Public and quiet: no sound (a sound in the pre-turn window would be heard by everyone at once,
// and the window also hides the Alien's secret Blackhole, which must never be hinted at). Reduced:
// fades only, 160 ms. The server's 30-second and 15-second windows are never shortened or held.

import { clamp01, easeInOutCubic, easeOutBack, easeOutCubic } from '../../cinematic/lib/ease.mjs';

export const MOTION = Object.freeze({
  appoint: Object.freeze({ end: 560, pin: Object.freeze([0, 420]), ring: Object.freeze([300, 560]) }),
  block: Object.freeze({ end: 480, unroll: Object.freeze([0, 360]), settle: Object.freeze([300, 480]) }),
  expire: Object.freeze({ end: 360, roll: Object.freeze([0, 360]) }),
  reduced: Object.freeze({ end: 160 }),
});

const span = (t, [a, b]) => clamp01((t - a) / (b - a));
const fade = t => clamp01(t / MOTION.reduced.end);

/** The badge pins on: scale 1.8 to 1, a turn of -20 degrees back to 0; an ink ring spreads and fades. */
export function appointFrame(t, { reduced = false } = {}) {
  if (reduced) return { reduced: true, badge: { opacity: fade(t), scale: 1, rotate: 0 }, ring: { opacity: 0, scale: 1 }, done: t >= MOTION.reduced.end };
  const m = MOTION.appoint, p = span(t, m.pin), r = span(t, m.ring);
  return { reduced: false, badge: { opacity: Math.min(1, p * 3), scale: 1.8 - 0.8 * easeOutBack(p), rotate: -20 * (1 - easeOutCubic(p)) }, ring: { opacity: r > 0 ? 0.55 * (1 - r) : 0, scale: 1 + 0.4 * easeOutCubic(r) }, done: t >= m.end };
}

/** The tape unrolls from the left (reveal 0 to 1) and settles with a small drop (settle 1 = flat). */
export function blockFrame(t, { reduced = false } = {}) {
  if (reduced) return { reduced: true, tape: { opacity: fade(t), reveal: 1, drop: 0 }, done: t >= MOTION.reduced.end };
  const m = MOTION.block, u = easeInOutCubic(span(t, m.unroll)), s = span(t, m.settle);
  return { reduced: false, tape: { opacity: 1, reveal: u, drop: 3 * (1 - easeOutBack(s)) * (s > 0 ? 1 : 0) }, done: t >= m.end };
}

/** The tape rolls back to the right (reveal 1 to 0) and is gone. */
export function expireFrame(t, { reduced = false } = {}) {
  if (reduced) return { reduced: true, tape: { opacity: 1 - fade(t), reveal: 1, drop: 0 }, done: t >= MOTION.reduced.end };
  const m = MOTION.expire;
  return { reduced: false, tape: { opacity: 1, reveal: 1 - easeInOutCubic(span(t, m.roll)), drop: 0 }, done: t >= m.end };
}

export const FRAMES = Object.freeze({ appoint: appointFrame, block: blockFrame, expire: expireFrame });
export const motionEnd = (kind, reduced = false) => (reduced ? MOTION.reduced.end : MOTION[kind].end);
