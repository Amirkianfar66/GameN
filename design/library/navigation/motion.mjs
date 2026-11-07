// mothership:dev-only
//
// The office panel's motion: pure functions of t (ms) for the review page and for Frontend. Each
// plays once, from the moment its cause arrives, and never while a command is pending or after a
// refusal:
//   step     the position changed between two of the office's views, and the route rule names the
//            movement (states.mjs panelStep): the token travels from place to place
//   choose   the Officer's tie choice was accepted: the unchosen course fades, CHOSEN is stamped
//   confirm  an office's acknowledgement was accepted: CONFIRMED is stamped
// A reconnect or a late view draws the state at rest: a motion is never replayed for a cause the
// page did not see arrive. No sound and no vibration: the panel is private (and a sound would say
// that the course was being set on that phone). The public films are in films.mjs.

import { clamp01, easeInOutCubic, easeOutBack, easeOutCubic } from '../../cinematic/lib/ease.mjs';
import { anchorPercent } from './art.mjs';

export const MOTION = Object.freeze({
  step: Object.freeze({ end: 900, travel: Object.freeze([120, 720]), course: Object.freeze([0, 200]), pulse: Object.freeze([640, 900]) }),
  choose: Object.freeze({ end: 520, fade: Object.freeze([0, 300]), stamp: Object.freeze([280, 520]) }),
  confirm: Object.freeze({ end: 420, stamp: Object.freeze([0, 420]) }),
  reduced: Object.freeze({ end: 160, fade: 80 }),
});

const span = (t, [a, b]) => clamp01((t - a) / (b - a));
const stampAt = v => ({ opacity: easeOutCubic(clamp01(v * 1.6)), scale: 1 + 0.35 * (1 - easeOutBack(v)), rotate: -8 });

/**
 * The step at t: the token's place (percent of the panel) and opacity, the course overlay's opacity,
 * the destination lamp's pulse. A switch arcs a little off its rung so that it reads as crossing,
 * not as sliding along an arm; an arrival grows the pulse into the planet.
 */
export function stepFrame(t, { from, to, kind }, { reduced = false } = {}) {
  const a = anchorPercent(from);
  const b = anchorPercent(to);
  if (reduced) {
    const { end, fade } = MOTION.reduced;
    const before = t < fade ? 1 - t / fade : 0;
    const after = t < fade ? 0 : clamp01((t - fade) / (end - fade));
    return { reduced: true, before: { ...a, opacity: before }, after: { ...b, opacity: after }, course: { opacity: 0 }, done: t >= end };
  }
  const m = MOTION.step;
  const v = easeInOutCubic(span(t, m.travel));
  const lift = kind === 'switch' ? Math.sin(Math.PI * v) * 4.5 : 0;
  const pulseV = span(t, m.pulse);
  return {
    reduced: false,
    token: { left: a.left + (b.left - a.left) * v, top: a.top + (b.top - a.top) * v - lift, opacity: 1, scale: 1 + 0.12 * Math.sin(Math.PI * v) },
    course: { opacity: 1 - span(t, m.course) },
    pulse: { ...b, scale: 1 + (kind === 'arrive' ? 1.4 : 0.8) * easeOutCubic(pulseV), opacity: pulseV > 0 ? 1 - pulseV : 0 },
    done: t >= m.end,
  };
}

/** The tie choice accepted: the unchosen course fades, the CHOSEN stamp lands. */
export function chooseFrame(t, { reduced = false } = {}) {
  if (reduced) {
    const { end, fade } = MOTION.reduced;
    return { reduced: true, other: { opacity: t < fade ? 1 - t / fade : 0 }, stamp: { opacity: clamp01((t - fade) / (end - fade)), scale: 1, rotate: -8 }, done: t >= end };
  }
  const m = MOTION.choose;
  return { reduced: false, other: { opacity: 1 - easeOutCubic(span(t, m.fade)) }, stamp: span(t, m.stamp) > 0 ? stampAt(span(t, m.stamp)) : { opacity: 0, scale: 1.35, rotate: -8 }, done: t >= m.end };
}

/** An acknowledgement accepted: the CONFIRMED stamp lands. */
export function confirmFrame(t, { reduced = false } = {}) {
  if (reduced) {
    const { end } = MOTION.reduced;
    return { reduced: true, stamp: { opacity: clamp01(t / end), scale: 1, rotate: -8 }, done: t >= end };
  }
  const m = MOTION.confirm;
  return { reduced: false, stamp: stampAt(span(t, m.stamp)), done: t >= m.end };
}

export const FRAMES = Object.freeze({ step: stepFrame, choose: chooseFrame, confirm: confirmFrame });
export const motionEnd = (kind, reduced = false) => (reduced ? MOTION.reduced.end : MOTION[kind].end);
