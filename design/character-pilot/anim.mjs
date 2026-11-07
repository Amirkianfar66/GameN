// mothership:dev-only
//
// The pilot's animation (the owner: "more like AAA animation"): the approved rig's skeletons and
// easing curves (design/board-motion/figures/motion.mjs), with the overlapping action that makes
// a figure feel alive:
// - idle: breathing that lifts the chest and shoulders, a slow shift of weight, a head that drifts
//   and tilts, irregular blinks, and hair that follows the head late;
// - walk: the rig's walk with a longer stride, a counter-tilt of the head, hair that streams behind
//   and bounces a beat after the body;
// - wave: an anticipation dip, a quick raise, the forearm swinging at the elbow, an eased settle.
// Every frame is a pure function of t and the character's seed: the same frame every time, for every
// viewer. Nothing here reads the game.

import { STAND } from '../board-motion/figures/gestures.mjs';
import { EASE, blend, walkPose } from '../board-motion/figures/motion.mjs';

const UPPER = ['neck', 'head', 'sN', 'eN', 'wN', 'sF', 'eF', 'wF'];
const ARMS = ['sN', 'eN', 'wN', 'sF', 'eF', 'wF'];
const TAU = Math.PI * 2;
const shift = (sk, [dx, dy], joints) => { const out = { ...sk }; for (const j of joints) out[j] = [sk[j][0] + dx, sk[j][1] + dy]; return out; };
const clamp01 = v => Math.max(0, Math.min(1, v));

function hash(seed, i) {
  let h = Math.imul(seed * 374761393 + i * 668265263, 1274126177);
  h ^= h >>> 15;
  return ((h >>> 0) % 10000) / 10000;
}

/** The lids at t (0 open, 1 shut): irregular blinks every 2.4 to 4.6 s, each 170 ms, quick to close and slower to open. */
export function blinkAt(t, seed = 1) {
  let at = 700 + hash(seed, 0) * 1500;
  for (let i = 1; at <= t && i < 400; i += 1) {
    const u = t - at;
    if (u < 170) return u < 55 ? u / 55 : u < 80 ? 1 : 1 - (u - 80) / 90;
    at += 2400 + hash(seed, i) * 2200;
  }
  return 0;
}

/** Standing: breathing, a shift of weight, the head drifting; the hair late behind the head. */
export function idle(t, { base = STAND, seed = 1 } = {}) {
  const breath = (Math.sin((TAU * t) / 3400 + seed) + 1) / 2;
  const weight = Math.sin((TAU * t) / 5800 + seed * 1.7);
  const look = Math.sin((TAU * t) / 4600 + seed * 2.3);
  let sk = shift(base, [0, -1.2 * breath], UPPER);
  sk = shift(sk, [0, -0.6 * breath], ARMS);
  sk = shift(sk, [1.1 * weight, 0.3 * Math.abs(weight)], ['pelvis', 'hipN', 'hipF', ...UPPER]);
  sk.head = [sk.head[0] + 0.9 * look, sk.head[1] + 0.35 * look];
  sk.tilt = (base.tilt ?? 0) + 2.4 * look;
  // Follow-through: the hair's ends answer the head's drift and the weight shift half a second late.
  const lateLook = Math.sin((TAU * (t - 520)) / 4600 + seed * 2.3);
  const lateWeight = Math.sin((TAU * (t - 520)) / 5800 + seed * 1.7);
  return { sk, motion: { blink: blinkAt(t, seed), sway: 1.6 * (lateLook - look) - 1.2 * lateWeight, lift: -0.6 * breath } };
}

// The walk: the rig's walkPose, the stride lengthened (feet carried out from the hips, knees solved again).
const THIGH = 49, SHIN = 39, RIG_STRIDE = 17;
function knee(hip, ankle, dir) {
  const dx = ankle[0] - hip[0], dy = ankle[1] - hip[1];
  const d = Math.min(Math.hypot(dx, dy), THIGH + SHIN - 0.5);
  const a = (THIGH * THIGH - SHIN * SHIN + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, THIGH * THIGH - a * a));
  const ux = dx / (Math.hypot(dx, dy) || 1), uy = dy / (Math.hypot(dx, dy) || 1);
  const mx = hip[0] + ux * a, my = hip[1] + uy * a;
  const k1 = [mx - uy * h, my + ux * h], k2 = [mx + uy * h, my - ux * h];
  return (k1[0] - k2[0]) * dir > 0 ? k1 : k2;
}
/** The pilot's walk at phase 0..1 (going left): the rig's walk with a 22-unit stride. */
export function stridePose(phase, stride = 22) {
  const sk = walkPose(phase);
  const out = ankle => [62 + ((ankle[0] - 62) * stride) / RIG_STRIDE, ankle[1]];
  const aF = out(sk.aF), aN = out(sk.aN);
  return { ...sk, aF, aN, kF: knee(sk.hipF, aF, -1), kN: knee(sk.hipN, aN, -1) };
}

/** Walking on the spot (going left), one cycle every cycleMs; the hair streams behind and bounces late. */
export function walk(t, { seed = 1, cycleMs = 760 } = {}) {
  const phase = ((t / cycleMs) % 1 + 1) % 1;
  const base = stridePose(phase);
  const sk = { ...base, tilt: (base.tilt ?? 0) + 1.6 * Math.sin(TAU * phase) - 2 };
  const late = phase - 0.13;
  return { sk, motion: { blink: blinkAt(t, seed), sway: 2.6 + 0.9 * Math.sin(TAU * late), lift: -1.8 * Math.cos(2 * TAU * late) } };
}

/** The near arm raised in a wave, the head tilted toward it. */
const WAVE = Object.freeze({ ...STAND, sN: [84, 71], eN: [104, 52], wN: [108, 24], handN: { angle: -86, type: 'open' }, head: [57, 36], tilt: -6 });
/** Before the raise: weight down a little, the arm drawn in (anticipation). */
const DIP = Object.freeze({ ...shift(STAND, [0, 2.4], UPPER), eN: [100, 104], wN: [90, 120], handN: { angle: 200 }, tilt: 3 });

/** A wave hello over `total` ms: dip, raise (snap), three swings of the forearm, settle back. */
export function wave(t, { seed = 1, total = 3200 } = {}) {
  const u = ((t % total) + total) % total;
  let sk;
  if (u < 380) sk = blend(STAND, DIP, EASE.standard(u / 380));
  else if (u < 760) sk = blend(DIP, WAVE, EASE.snap((u - 380) / 380));
  else if (u < 2440) {
    // The forearm swings about the elbow, easing in and out of each swing.
    const s = (u - 760) / 1680;
    const swing = Math.sin(TAU * 3 * s) * 20 * Math.sin(Math.PI * clamp01(s * 1.15));
    const a = (swing * Math.PI) / 180;
    const [ex, ey] = WAVE.eN, [wx, wy] = WAVE.wN;
    const dx = wx - ex, dy = wy - ey;
    sk = { ...WAVE, wN: [ex + dx * Math.cos(a) - dy * Math.sin(a), ey + dx * Math.sin(a) + dy * Math.cos(a)], handN: { angle: -86 + swing, type: 'open' } };
  } else sk = blend(WAVE, STAND, EASE.settle((u - 2440) / (total - 2440)));
  const raise = u > 380 && u < 2440 ? 1 : 0;
  return { sk, motion: { blink: blinkAt(t, seed), sway: raise * 1.4 * Math.sin((TAU * (u - 900)) / 560), lift: 0 } };
}

export const ACTIONS = Object.freeze({ idle, walk, wave });
