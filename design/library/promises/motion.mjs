// mothership:dev-only
//
// Promises' motion: pure functions of t (ms). Each plays once, from the moment its cause first
// arrives in a view this screen has already drawn (states.mjs changes()), on the two phones of the
// pair only, and never while a command is pending, after a refusal or on a reconnect (which draws
// the state at rest):
//   offer    the giver's accepted OFFER_PROMISE receipt: the card folds into its envelope
//   arrive   an offer to this seat first appears: the envelope drops in, opens, the card rises out
//   accept   the Promise is first seen accepted: the Pending seal presses onto the card
//   decline  first seen declined or not answered: the card dims and tips back, its stamp lands
//   result   first seen with a result (R6: when the Promise's own opportunity closes, which differs
//            by kind; states.mjs opportunity()): the Pending seal turns over to the result's seal and
//            its stamp lands
// No sound and no vibration: a Promise is pair-private, and a sound would tell the table that one
// was offered, accepted or decided. Reduced: fades only, 160 ms.

import { clamp01, easeInOutCubic, easeOutBack, easeOutCubic } from '../../cinematic/lib/ease.mjs';

export const MOTION = Object.freeze({
  offer: Object.freeze({ end: 720, fold: Object.freeze([0, 360]), envelope: Object.freeze([240, 560]), settle: Object.freeze([520, 720]) }),
  arrive: Object.freeze({ end: 760, drop: Object.freeze([0, 300]), open: Object.freeze([260, 440]), rise: Object.freeze([380, 760]) }),
  accept: Object.freeze({ end: 560, press: Object.freeze([0, 360]), ring: Object.freeze([300, 560]) }),
  decline: Object.freeze({ end: 600, dim: Object.freeze([0, 420]), stamp: Object.freeze([300, 600]) }),
  result: Object.freeze({ end: 720, out: Object.freeze([0, 240]), in: Object.freeze([240, 480]), stamp: Object.freeze([420, 720]) }),
  reduced: Object.freeze({ end: 160 }),
});

const span = (t, [a, b]) => clamp01((t - a) / (b - a));
const fade = t => clamp01(t / MOTION.reduced.end);
const stampAt = v => (v > 0 ? { opacity: easeOutCubic(clamp01(v * 1.6)), scale: 1 + 0.35 * (1 - easeOutBack(v)), rotate: -8 } : { opacity: 0, scale: 1.35, rotate: -8 });

/** The giver's card folds up into the envelope (card scale 1 to 0.3, rising), the envelope settles. */
export function offerFrame(t, { reduced = false } = {}) {
  if (reduced) return { reduced: true, card: { opacity: 1 - fade(t), scale: 1, lift: 0 }, envelope: { opacity: fade(t), scale: 1, flap: 1 }, done: t >= MOTION.reduced.end };
  const m = MOTION.offer, f = easeInOutCubic(span(t, m.fold)), e = span(t, m.envelope), s = easeOutCubic(span(t, m.settle));
  return { reduced: false, card: { opacity: 1 - span(t, [240, 360]), scale: 1 - 0.7 * f, lift: f }, envelope: { opacity: Math.min(1, e * 2), scale: 1.25 - 0.25 * s, flap: easeOutCubic(e) }, done: t >= m.end };
}

/** The recipient's envelope drops in (drop 1 = landed), opens (flap 0 = open), the card rises out (rise 1 = in place). */
export function arriveFrame(t, { reduced = false } = {}) {
  if (reduced) return { reduced: true, envelope: { opacity: 1 - fade(t), drop: 1, flap: 0 }, card: { opacity: fade(t), rise: 1 }, done: t >= MOTION.reduced.end };
  const m = MOTION.arrive, d = easeOutCubic(span(t, m.drop)), r = easeOutCubic(span(t, m.rise));
  return { reduced: false, envelope: { opacity: Math.min(1, span(t, m.drop) * 3) * (1 - span(t, [600, 760])), drop: d, flap: 1 - easeInOutCubic(span(t, m.open)) }, card: { opacity: Math.min(1, r * 2), rise: r }, done: t >= m.end };
}

/** The Pending seal presses onto the card (scale 1.6 to 1, a quarter turn back), an ink ring spreads and fades. */
export function acceptFrame(t, { reduced = false } = {}) {
  if (reduced) return { reduced: true, seal: { opacity: fade(t), scale: 1, rotate: 0 }, ring: { opacity: 0, scale: 1 }, done: t >= MOTION.reduced.end };
  const m = MOTION.accept, p = span(t, m.press), r = span(t, m.ring);
  return { reduced: false, seal: { opacity: Math.min(1, p * 2.5), scale: 1.6 - 0.6 * easeOutBack(p), rotate: -12 * (1 - easeOutCubic(p)) }, ring: { opacity: r > 0 ? 0.6 * (1 - r) : 0, scale: 1 + 0.25 * easeOutCubic(r) }, done: t >= m.end };
}

/** The card dims and tips back a little (never shakes); the Declined or Not answered stamp lands. */
export function declineFrame(t, { reduced = false } = {}) {
  if (reduced) return { reduced: true, card: { opacity: 1 - 0.45 * fade(t), tilt: 0 }, stamp: { opacity: fade(t), scale: 1, rotate: -8 }, done: t >= MOTION.reduced.end };
  const m = MOTION.decline, d = easeInOutCubic(span(t, m.dim));
  return { reduced: false, card: { opacity: 1 - 0.45 * d, tilt: 3 * d }, stamp: stampAt(span(t, m.stamp)), done: t >= m.end };
}

/** The Pending seal turns edge-on (turn 0) and the result's seal turns face-on; the result's stamp lands. */
export function resultFrame(t, { reduced = false } = {}) {
  if (reduced) return { reduced: true, before: { opacity: 1 - fade(t), turn: 1 }, after: { opacity: fade(t), turn: 1 }, stamp: { opacity: fade(t), scale: 1, rotate: -8 }, done: t >= MOTION.reduced.end };
  const m = MOTION.result, o = span(t, m.out), i = span(t, m.in);
  return { reduced: false, before: { opacity: o < 1 ? 1 : 0, turn: 1 - easeInOutCubic(o) }, after: { opacity: i > 0 ? 1 : 0, turn: easeOutBack(i) }, stamp: stampAt(span(t, m.stamp)), done: t >= m.end };
}

export const FRAMES = Object.freeze({ offer: offerFrame, arrive: arriveFrame, accept: acceptFrame, decline: declineFrame, result: resultFrame });
export const motionEnd = (kind, reduced = false) => (reduced ? MOTION.reduced.end : MOTION[kind].end);
