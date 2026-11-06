// mothership:dev-only
//
// Library group 8's motion: pure functions of t (ms), each once on its cause, never on a reconnect:
//   supply    the recipient's own phone, when its ordinary weapons first grow: the crate drops in and its seal tag lights
//   admission the injured figure leaves its room slot with an injured gait (a slow bob, never a
//             trajectory or a shooter), crosses between the board's panels, walks to its berth and
//             lies down (states.mjs WALK); only when R4's origin is known, else it snaps
//   seat      a lobby seat newly filled: its row slides in
// The admission is public (the placement is); the supply is private and silent. Reduced: fades only.

import { clamp01, easeInOutCubic, easeOutBack, easeOutCubic } from '../../cinematic/lib/ease.mjs';
import { WALK } from './states.mjs';

export const MOTION = Object.freeze({
  supply: Object.freeze({ end: 520, drop: Object.freeze([0, 360]), tag: Object.freeze([300, 520]) }),
  admission: WALK,
  seat: Object.freeze({ end: 240 }),
  reduced: Object.freeze({ end: 160 }),
});

const span = (t, [a, b]) => clamp01((t - a) / (b - a));
const fade = t => clamp01(t / MOTION.reduced.end);

export function supplyFrame(t, { reduced = false } = {}) {
  if (reduced) return { reduced: true, crate: { drop: 1, opacity: fade(t) }, tag: { glow: 1 }, done: t >= MOTION.reduced.end };
  const m = MOTION.supply, d = span(t, m.drop);
  return { reduced: false, crate: { drop: easeOutBack(d), opacity: Math.min(1, d * 3) }, tag: { glow: easeOutCubic(span(t, m.tag)) }, done: t >= m.end };
}

/**
 * The admission at t: where the figure is along its path (stage leave | cross | enter | settle), its
 * progress in that stage, its opacity (it fades out of the room panel and into the Hospital's), its
 * injured bob (px, a slow sway, never a hit), and its lie (0 standing, 1 on the berth).
 */
export function admissionFrame(t, { reduced = false } = {}) {
  if (reduced) return { reduced: true, stage: t >= MOTION.reduced.end ? 'settle' : 'cross', progress: 1, opacity: fade(t), bob: 0, lie: 1, panel: 'hospital', done: t >= MOTION.reduced.end };
  const w = WALK;
  const stage = t < w.leave[1] ? 'leave' : t < w.cross[1] ? 'cross' : t < w.enter[1] ? 'enter' : 'settle';
  const progress = easeInOutCubic(span(t, w[stage]));
  const opacity = stage === 'cross' ? (span(t, w.cross) < 0.5 ? 1 - 2 * span(t, w.cross) : 2 * span(t, w.cross) - 1) : 1;
  const walking = stage === 'leave' || stage === 'enter';
  return { reduced: false, stage, progress, opacity, bob: walking ? 2.5 * Math.abs(Math.sin(t / 140)) : 0, lie: stage === 'settle' ? easeOutCubic(span(t, w.settle)) : 0, panel: stage === 'leave' || (stage === 'cross' && span(t, w.cross) < 0.5) ? 'room' : 'hospital', done: t >= w.end };
}

export function seatFrame(t, { reduced = false } = {}) {
  if (reduced) return { reduced: true, slide: 1, opacity: fade(t), done: t >= MOTION.reduced.end };
  const v = easeOutCubic(span(t, [0, MOTION.seat.end]));
  return { reduced: false, slide: v, opacity: v, done: t >= MOTION.seat.end };
}

export const FRAMES = Object.freeze({ supply: supplyFrame, admission: admissionFrame, seat: seatFrame });
export const motionEnd = (kind, reduced = false) => (reduced ? MOTION.reduced.end : MOTION[kind].end);
