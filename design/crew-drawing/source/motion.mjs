// mothership:dev-only
//
// The crew's own small motion (DSN-REQ-17): what moves on a figure besides the game's movement. The
// game's movement is the rig's and is unchanged: skeletons, gestures, the walk (motion.mjs
// walkPose, stride 17), easing, timelines and places. The character pilot's showcase walk and wave
// (the character pilot's anim.mjs, a review page) are not part of this release.
//
// What this adds, all of it drawn on the head alone (head.mjs):
// - blinks: irregular, every 2.4 to 4.6 s, 170 ms each, each character on its own schedule;
// - an idle drift: the head moving a little and tilting, the body still;
// - follow-through: Mira's hair and Echo's locs, which hang below the jaw, trail the head's
//   movement and settle (hairFollow); no other head has hair that hangs.
// Reduced motion keeps every pose and every blink, and stops the idle drift and the hair's swing.
// A character gone still (Eliminated: the rig's down and slumps, or a gesture marked +still) does
// not move at all. Echo's eyes are behind the visor: Echo has no lids, so a blink draws nothing.
//
// Every value is a pure function of its inputs (time in ms, a character, the head's positions), so
// a frame looks the same every time; hairFollow keeps only the state its spring needs.

import { HEADS } from './head.mjs';

/** Each character's own schedule, so no two blink together. */
const SEEDS = Object.freeze({ c1: 13, c2: 17, c3: 19, c4: 11, c5: 23, c6: 7, c7: 29, c8: 3, c9: 31 });
const TAU = Math.PI * 2;

function hash(seed, i) {
  let h = Math.imul(seed * 374761393 + i * 668265263, 1274126177);
  h ^= h >>> 15;
  return ((h >>> 0) % 10000) / 10000;
}

/** A character's seed, and another for a second figure of the same character (seat), so they need not blink together. */
const seedOf = (id, seat = 0) => (SEEDS[id] ?? 1) + seat * 101;

/** Whether a character has lids to close (Echo's eyes are behind the visor). */
export const hasLids = id => HEADS[id].eyes.length > 0;
/** Whether a character has hair that hangs and swings (Mira's hair, Echo's locs). */
export const hasHangingHair = id => HEADS[id].sway != null;

/**
 * The lids at t ms (0 open, 1 shut): irregular blinks every 2.4 to 4.6 s, each 170 ms, quick to
 * close and slower to open; 0 for Echo. seat: another schedule for a second figure of the same
 * character on the same screen.
 */
export function blinkAt(t, id, { seat = 0 } = {}) {
  if (!hasLids(id)) return 0;
  const seed = seedOf(id, seat);
  let at = 700 + hash(seed, 0) * 1500;
  for (let i = 1; at <= t && i < 100000; i += 1) {
    const u = t - at;
    if (u < 170) return u < 55 ? u / 55 : u < 80 ? 1 : 1 - (u - 80) / 90;
    at += 2400 + hash(seed, i) * 2200;
  }
  return 0;
}

/** The idle drift at t ms: the head moving a little ({ dx, dy } in the figure's units) and tilting (degrees). */
export function idleDrift(t, id, { seat = 0 } = {}) {
  const seed = seedOf(id, seat);
  const look = Math.sin((TAU * t) / 4600 + seed * 2.3);
  const sway = Math.sin((TAU * t) / 5800 + seed * 1.7);
  return { dx: 0.9 * look + 0.4 * sway, dy: 0.35 * look, tilt: 2.4 * look };
}

/**
 * Whether a drawn gesture (the rig's name with its marks, as skeletonOf takes it) is a character
 * gone still: Eliminated, lying on the deck (down), slumped (slumpDesk, slumpBench) or still where
 * it sits or lies (+still). Its head neither blinks, drifts nor swings.
 */
export const isStill = gesture => /^(?:down|slumpDesk|slumpBench)(?:\+|$)|\+still(?:\+|$)/.test(String(gesture));

/** No drift: the head where the skeleton puts it. */
export const STILL_DRIFT = Object.freeze({ dx: 0, dy: 0, tilt: 0 });

/**
 * The follow-through of hanging hair: a damped spring that trails the head's movement, for a
 * figure that moves (the rig's walk, a move between places). step(dt, x, y): the head's position
 * after dt ms, in the figure's units and including where the figure itself is moved (a move across
 * the board), returns { sway, lift } in the head's units (head.mjs): the ends swing back from the
 * way the head goes and hang lower as it rises, overshoot a little and settle. Without hanging hair,
 * always { sway: 0, lift: 0 }. stiffness and damping per second; gain: head units of sway per unit
 * per ms of the head's speed.
 */
export function hairFollow(id, { stiffness = 60, damping = 9, gain = 22 } = {}) {
  if (!hasHangingHair(id)) return { step: () => ({ sway: 0, lift: 0 }), reset() {} };
  let last = null, sway = 0, lift = 0, vs = 0, vl = 0;
  const limit = v => Math.max(-6, Math.min(6, v));
  return {
    step(dt, x, y) {
      if (last === null || !(dt > 0)) { last = [x, y]; return { sway, lift }; }
      const vx = (x - last[0]) / dt, vy = (y - last[1]) / dt;
      last = [x, y];
      const ts = limit(-vx * gain), tl = limit(-vy * gain * 0.5);
      for (let left = dt / 1000; left > 1e-9; left -= 0.008) {
        const h = Math.min(0.008, left);
        vs += (stiffness * (ts - sway) - damping * vs) * h;
        sway += vs * h;
        vl += (stiffness * (tl - lift) - damping * vl) * h;
        lift += vl * h;
      }
      sway = limit(sway);
      lift = limit(lift);
      return { sway, lift };
    },
    reset() { last = null; sway = 0; lift = 0; vs = 0; vl = 0; },
  };
}

/**
 * Everything the crew's own motion gives a figure at t ms, as the drawing takes it (head.mjs,
 * figure.mjs, mount.mjs): { blink, sway, lift, drift }. reduced: the person or the system asks for
 * reduced motion: the pose and the blinks stay, the drift and the hair's swing stop. follow: the
 * hair's { sway, lift } from hairFollow, for a figure that moves; without it, the idle's own small
 * follow-through. blink: false to keep the eyes open (a frozen frame, a still export). still: the
 * character is gone still (isStill of its gesture): nothing moves (a skeleton looking down or
 * turned away keeps its lids as crewFrame draws them).
 */
export function crewMotion(t, id, { reduced = false, follow = null, blink = true, seat = 0, still = false } = {}) {
  if (still) return { blink: 0, sway: 0, lift: 0, drift: STILL_DRIFT };
  const lids = blink ? blinkAt(t, id, { seat }) : 0;
  if (reduced) return { blink: lids, sway: 0, lift: 0, drift: STILL_DRIFT };
  const drift = idleDrift(t, id, { seat });
  if (!hasHangingHair(id)) return { blink: lids, sway: 0, lift: 0, drift };
  if (follow) return { blink: lids, sway: follow.sway, lift: follow.lift, drift };
  // Idle: the ends answer the head's drift half a second late.
  const late = idleDrift(t - 520, id, { seat });
  return { blink: lids, sway: 1.6 * (late.dx - drift.dx) - 0.8 * late.tilt / 2.4, lift: -0.4 * (late.dy + 0.35), drift };
}
