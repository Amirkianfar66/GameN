// mothership:dev-only
//
// The end's and recovery's motion: pure functions of t (ms) on the server's clock, each played once
// (states.mjs filmDecision: a late join seeks, a reconnect after the end draws the final state, and
// nothing historical replays):
//   reveal     after the arrival film: the banner drops, the winning emblem lands, each role card
//              turns face up in seat order, the Code's numbers stamp into their plate
//   noSurvivors  the board dims, the flat line draws across, the words come up
//   strip      the connection strip slides down (reconnecting, stale) or fades away (restored)
// Sound: the reveal's cue is the arrival's single sting (navigation's AUDIO), no new cue; the rest
// is silent. Reduced: fades only, 160 ms, everything at once.

import { clamp01, easeInOutCubic, easeOutBack, easeOutCubic } from '../../cinematic/lib/ease.mjs';

const ROLE_STEP = 90;
export const MOTION = Object.freeze({
  reveal: Object.freeze({ banner: Object.freeze([0, 500]), emblem: Object.freeze([300, 700]), rolesFrom: 500, roleSpan: 300, codeAfter: 200, codeSpan: 400 }),
  noSurvivors: Object.freeze({ end: 1300, dim: Object.freeze([0, 600]), line: Object.freeze([300, 1200]), words: Object.freeze([900, 1300]) }),
  strip: Object.freeze({ end: 200 }),
  reduced: Object.freeze({ end: 160 }),
});
/** The reveal's length for a roster of `count` seats: the last role's turn, then the Code. */
export const revealEnd = (count = 9) => MOTION.reveal.rolesFrom + (count - 1) * ROLE_STEP + MOTION.reveal.roleSpan + MOTION.reveal.codeAfter + MOTION.reveal.codeSpan;

const span = (t, [a, b]) => clamp01((t - a) / (b - a));
const fade = t => clamp01(t / MOTION.reduced.end);

/** The reveal at t for `count` seats: banner drop (0 = above, 1 = in place), emblem pop, each role's turn (0 = face down, 1 = up), the Code stamp. */
export function revealFrame(t, { count = 9, reduced = false } = {}) {
  if (reduced) return { reduced: true, banner: { drop: 1, opacity: fade(t) }, emblem: { scale: 1, opacity: fade(t) }, roles: Array.from({ length: count }, () => ({ turn: 1, opacity: fade(t) })), code: { scale: 1, opacity: fade(t) }, done: t >= MOTION.reduced.end };
  const m = MOTION.reveal, end = revealEnd(count);
  const roles = Array.from({ length: count }, (_, i) => { const v = span(t, [m.rolesFrom + i * ROLE_STEP, m.rolesFrom + i * ROLE_STEP + m.roleSpan]); return { turn: easeInOutCubic(v), opacity: v > 0 ? 1 : 0 }; });
  const codeAt = end - m.codeSpan, c = span(t, [codeAt, end]);
  return { reduced: false, banner: { drop: easeOutBack(span(t, m.banner)), opacity: Math.min(1, span(t, m.banner) * 3) }, emblem: { scale: easeOutBack(span(t, m.emblem)), opacity: span(t, m.emblem) > 0 ? 1 : 0 }, roles, code: { scale: c > 0 ? 1.4 - 0.4 * easeOutBack(c) : 1.4, opacity: Math.min(1, c * 2) }, done: t >= end };
}

/** No survivors: the board dims (dim 0 to 0.6), the flat line draws across (draw 0 to 1), the words fade in. */
export function noSurvivorsFrame(t, { reduced = false } = {}) {
  if (reduced) return { reduced: true, dim: 0.6 * fade(t), line: { draw: 1, opacity: fade(t) }, words: { opacity: fade(t) }, done: t >= MOTION.reduced.end };
  const m = MOTION.noSurvivors;
  return { reduced: false, dim: 0.6 * easeOutCubic(span(t, m.dim)), line: { draw: easeInOutCubic(span(t, m.line)), opacity: 1 }, words: { opacity: easeOutCubic(span(t, m.words)) }, done: t >= m.end };
}

/** The connection strip slides down into place (slide 1 = in), or out for "restored" (out = true). */
export function stripFrame(t, { reduced = false, out = false } = {}) {
  if (reduced) return { reduced: true, slide: 1, opacity: out ? 1 - fade(t) : fade(t), done: t >= MOTION.reduced.end };
  const v = easeOutCubic(span(t, [0, MOTION.strip.end]));
  return { reduced: false, slide: out ? 1 : v, opacity: out ? 1 - v : 1, done: t >= MOTION.strip.end };
}

export const FRAMES = Object.freeze({ reveal: revealFrame, noSurvivors: noSurvivorsFrame, strip: stripFrame });
export const motionEnd = (kind, reduced = false, count = 9) => (reduced ? MOTION.reduced.end : kind === 'reveal' ? revealEnd(count) : MOTION[kind].end);
