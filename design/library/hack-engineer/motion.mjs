// mothership:dev-only
//
// The group's motion: four short private beats on the seat's own phone, each played once, on the
// accepted receipt (never while a command is pending, never as a result the view has not given),
// each a pure function of the milliseconds since the receipt arrived. No sound and no vibration by
// default (a private action stays private in sound too). Reduced motion: the before and after
// states cross-faded over 80 ms each, nothing travelling, scaling, sparking or blinking.
//
//   insert   the ship hack registered: the cartridge slides into the port and seats, sparks, lamps on, RETAINED
//   unlock   a correct final Code: the Code card punched, the bag's seal torn off, the cartridge lifts and lights, UNLOCKED
//   wrong    a wrong final Code: the Code card punched, WRONG CODE (no shake: a calm, final answer)
//   capture  the Engineer's capture registered: brackets close, a dark shutter blink (never a white
//            flash), the print slides out and develops, CAPTURED

import { bell, beat, clamp01, easeInOutCubic, easeOutBack, easeOutCubic, r2 } from '../../cinematic/lib/ease.mjs';

export const MOTION = Object.freeze({
  insert: Object.freeze({ end: 900, slide: Object.freeze([0, 380]), seat: Object.freeze([380, 460]), spark: Object.freeze([420, 640]), lamps: Object.freeze([560, 720]), stamp: Object.freeze([700, 900]) }),
  unlock: Object.freeze({ end: 1000, punch: Object.freeze([0, 160]), seal: Object.freeze([200, 520]), bag: Object.freeze([320, 620]), lift: Object.freeze([520, 800]), stamp: Object.freeze([780, 1000]) }),
  wrong: Object.freeze({ end: 600, punch: Object.freeze([0, 160]), stamp: Object.freeze([300, 600]) }),
  capture: Object.freeze({ end: 1200, brackets: Object.freeze([0, 220]), shutter: Object.freeze([220, 300]), slide: Object.freeze([300, 700]), develop: Object.freeze([620, 1080]), stamp: Object.freeze([1000, 1200]) }),
  reduced: Object.freeze({ fade: 80, end: 160 }),
});

export const motionEnd = (kind, reduced = false) => (reduced ? MOTION.reduced.end : MOTION[kind].end);

/** The stamp's punch: scale from 1.35 with an overshoot, opacity in fast. */
const stamp = v => ({ scale: r2(v <= 0 ? 1.35 : 1.35 - 0.35 * easeOutBack(v, 2.2)), opacity: r2(clamp01(v * 3)) });

/** A reduced beat: 'before' fading out over the first fade, 'after' in over the second; the stamp with 'after'. */
function reducedFrame(t) {
  const { fade, end } = MOTION.reduced;
  const after = clamp01((t - fade) / fade);
  return { reduced: true, before: r2(1 - clamp01(t / fade)), after: r2(after), stamp: { scale: 1, opacity: r2(after) }, done: t >= end };
}

export function insertFrame(t, { reduced = false } = {}) {
  if (reduced) return reducedFrame(t);
  const M = MOTION.insert;
  const slide = easeInOutCubic(beat(t, M.slide));
  return {
    // The cartridge's travel from where it rests beside the port (0) into the slot (1), over a small arc.
    cartridge: { travel: r2(slide), arc: r2(-6 * bell(slide)), opacity: t < M.seat[1] ? 1 : 0 },
    seated: t >= M.seat[0],
    clunk: r2(1 + 0.04 * bell(beat(t, M.seat))),
    spark: { opacity: r2(bell(beat(t, M.spark))), scale: r2(0.7 + 0.5 * beat(t, M.spark)) },
    lamps: r2(easeOutCubic(beat(t, M.lamps))),
    stamp: t >= M.stamp[0] ? stamp(beat(t, M.stamp)) : { scale: 1.35, opacity: 0 },
    done: t >= M.end,
  };
}

export function unlockFrame(t, { reduced = false } = {}) {
  if (reduced) return reducedFrame(t);
  const M = MOTION.unlock;
  const seal = easeInOutCubic(beat(t, M.seal));
  return {
    punch: r2(easeOutCubic(beat(t, M.punch))),
    cardNudge: r2(2 * bell(beat(t, M.punch))),
    seal: { x: r2(60 * seal), y: r2(-30 * seal), rotate: r2(38 * seal), opacity: r2(1 - beat(t, [M.seal[1] - 120, M.seal[1]])) },
    bag: r2(1 - easeOutCubic(beat(t, M.bag))),
    lift: r2(-8 * easeOutBack(beat(t, M.lift), 1.6)),
    led: r2(beat(t, M.lift)),
    stamp: t >= M.stamp[0] ? stamp(beat(t, M.stamp)) : { scale: 1.35, opacity: 0 },
    done: t >= M.end,
  };
}

export function wrongFrame(t, { reduced = false } = {}) {
  if (reduced) return reducedFrame(t);
  const M = MOTION.wrong;
  return {
    punch: r2(easeOutCubic(beat(t, M.punch))),
    cardNudge: r2(2 * bell(beat(t, M.punch))),
    stamp: t >= M.stamp[0] ? stamp(beat(t, M.stamp)) : { scale: 1.35, opacity: 0 },
    done: t >= M.end,
  };
}

export function captureFrame(t, { reduced = false } = {}) {
  if (reduced) return reducedFrame(t);
  const M = MOTION.capture;
  return {
    brackets: r2(1.14 - 0.14 * easeOutCubic(beat(t, M.brackets))),
    // A dark blink: ink over the viewfinder, never a light flash.
    shutter: r2(0.85 * bell(beat(t, M.shutter))),
    print: { y: r2(-40 * (1 - easeOutCubic(beat(t, M.slide)))), opacity: r2(clamp01(beat(t, M.slide) * 4)), rotate: r2(-3 * easeOutCubic(beat(t, M.slide))) },
    // The picture under the print's window, dark until it develops.
    develop: r2(1 - easeInOutCubic(beat(t, M.develop))),
    viewfinder: r2(1 - beat(t, [M.slide[0], M.slide[0] + 200])),
    stamp: t >= M.stamp[0] ? stamp(beat(t, M.stamp)) : { scale: 1.35, opacity: 0 },
    done: t >= M.end,
  };
}

export const FRAMES = Object.freeze({ insert: insertFrame, unlock: unlockFrame, wrong: wrongFrame, capture: captureFrame });
