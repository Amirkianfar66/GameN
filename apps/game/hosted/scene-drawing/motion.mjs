// Runtime drawing port; Designer 49f0db4d34d2a2a418f669a13bed660fc665b1b6; source SHA256 b50a12ff2e967eca07778433d2359fef907397de90e04fff355367d0eae5343c.
//
// The animation of the board-motion figures (owner's decision of 9 October 2026: every place's
// gesture moves to another room and is hit). A frame is a skeleton (body.mjs), so an
// animation is a few key skeletons and the in-betweens are blended bone by bone: a limb turns
// about its joint instead of shrinking through it.
//
// What plays is chosen only by public facts and plays the same for everyone: a move by
// PUBLIC_MOVE, a hit by PUBLIC_HEALTH_CHANGED. A hit is cause-neutral: the public view says a
// character's health changed, not how (a shot and a Disable attack both injure), so nothing in
// it is a weapon, a muzzle, a projectile or a direction an attack came from.

import { GESTURES } from './gestures.mjs';

const POINTS = ['pelvis', 'neck', 'head', 'sN', 'eN', 'wN', 'sF', 'eF', 'wF', 'hipN', 'kN', 'aN', 'hipF', 'kF', 'aF'];
/** Each joint's parent: blending turns a bone about its parent joint. */
const PARENT = { neck: 'pelvis', head: 'neck', sN: 'neck', sF: 'neck', eN: 'sN', wN: 'eN', eF: 'sF', wF: 'eF', hipN: 'pelvis', hipF: 'pelvis', kN: 'hipN', aN: 'kN', kF: 'hipF', aF: 'kF' };
const ORDERED = POINTS.slice(1);

const lerp = (a, b, t) => a + (b - a) * t;
const lerp2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
/** The shortest turn from angle a to angle b, in radians. */
const turn = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

function bones(sk) {
  return Object.fromEntries(ORDERED.map(joint => {
    const [px, py] = sk[PARENT[joint]], [x, y] = sk[joint];
    return [joint, { angle: Math.atan2(y - py, x - px), length: Math.hypot(x - px, y - py) }];
  }));
}

const mixSpec = (a = {}, b = {}, t) => {
  const out = { ...(t < 0.5 ? a : b) };
  if (typeof a.angle === 'number' && typeof b.angle === 'number') out.angle = a.angle + (turn(a.angle * Math.PI / 180, b.angle * Math.PI / 180) * 180 / Math.PI) * t;
  return out;
};

/**
 * The skeleton between a and b at t (0 = a, 1 = b): the pelvis moves straight, every bone turns
 * about its parent joint and changes length evenly; what cannot be blended (the head's view,
 * the drawing order, what a hand holds) switches at the middle.
 */
export function blend(a, b, t) {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const ba = bones(a), bb = bones(b);
  const out = { ...(t < 0.5 ? a : b) };
  out.pelvis = lerp2(a.pelvis, b.pelvis, t);
  for (const joint of ORDERED) {
    const from = ba[joint], to = bb[joint];
    const angle = from.angle + turn(from.angle, to.angle) * t;
    const length = lerp(from.length, to.length, t);
    const [px, py] = out[PARENT[joint]];
    out[joint] = [px + Math.cos(angle) * length, py + Math.sin(angle) * length];
  }
  out.tilt = lerp(a.tilt ?? 0, b.tilt ?? 0, t);
  for (const spec of ['handN', 'handF', 'footN', 'footF']) out[spec] = mixSpec(a[spec], b[spec], t);
  if (a.shadow && b.shadow) out.shadow = lerp2(a.shadow, b.shadow, t);
  return out;
}

// ---------- Easing: the token curves (design tokens 0.4.0, motionEasing) ----------

function bezier(x1, y1, x2, y2) {
  const at = (p1, p2, s) => 3 * p1 * s * (1 - s) ** 2 + 3 * p2 * s * s * (1 - s) + s ** 3;
  return x => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, s = x;
    for (let i = 0; i < 24; i += 1) { s = (lo + hi) / 2; if (at(x1, x2, s) < x) lo = s; else hi = s; }
    return at(y1, y2, s);
  };
}
export const EASE = {
  standard: bezier(0.2, 0, 0, 1),
  impact: bezier(0.55, 0, 1, 0.45),
  settle: bezier(0.16, 0.84, 0.3, 1),
  snap: bezier(0.2, 1.3, 0.4, 1),
  sweep: bezier(0.65, 0, 0.35, 1),
  linear: x => x,
};

/**
 * A timeline: keys [{ at: ms, sk, ease }] in time order. Its skeleton at time t, each segment
 * eased by the ease of the key it runs to.
 */
export function sample(keys, t) {
  if (t <= keys[0].at) return keys[0].sk;
  for (let i = 1; i < keys.length; i += 1) {
    const a = keys[i - 1], b = keys[i];
    if (t <= b.at) return blend(a.sk, b.sk, (EASE[b.ease ?? 'standard'])((t - a.at) / Math.max(1, b.at - a.at)));
  }
  return keys[keys.length - 1].sk;
}

// ---------- The walk: generated, not drawn pose by pose ----------

const THIGH = 49, SHIN = 39;
/** A knee for a hip and an ankle, bent toward dir (-1: the knee points left, 1: right). */
function knee(hip, ankle, dir) {
  const dx = ankle[0] - hip[0], dy = ankle[1] - hip[1];
  const d = Math.min(Math.hypot(dx, dy), THIGH + SHIN - 0.5);
  const a = (THIGH * THIGH - SHIN * SHIN + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, THIGH * THIGH - a * a));
  const ux = dx / (Math.hypot(dx, dy) || 1), uy = dy / (Math.hypot(dx, dy) || 1);
  const mx = hip[0] + ux * a, my = hip[1] + uy * a;
  // The two solutions are either side of the hip-ankle line; take the one toward dir.
  const k1 = [mx - uy * h, my + ux * h], k2 = [mx + uy * h, my - ux * h];
  return (k1[0] - k2[0]) * dir > 0 ? k1 : k2;
}

/**
 * A walking skeleton going left at phase 0..1 of a two-step cycle. limp: 0 for a walk, 1 for
 * the stagger of an Injured character (hunched, a hand pressed to the side, the step uneven).
 */
export function walkPose(phase, { limp = 0 } = {}) {
  const p = ((phase % 1) + 1) % 1;
  const stride = 17 - limp * 5, lift = 11 - limp * 4;
  const foot = q => {
    const u = ((q % 1) + 1) % 1;
    if (u < 0.5) return [62 - stride + (u / 0.5) * 2 * stride, 215];
    const s = (u - 0.5) / 0.5;
    return [62 + stride - s * 2 * stride, 215 - lift * Math.sin(Math.PI * s)];
  };
  const bob = 3 * Math.cos(4 * Math.PI * p) + limp * 4 * Math.max(0, Math.cos(2 * Math.PI * p));
  const pelvis = [62, 123 + bob];
  const lean = 3 + limp * 9;
  const neck = [pelvis[0] - lean, pelvis[1] - 59 + limp * 5];
  const aF = foot(p), aN = foot(p + 0.5);
  const hipF = [pelvis[0] - 8, pelvis[1] + 2], hipN = [pelvis[0] + 8, pelvis[1] + 2];
  const swing = Math.sin(2 * Math.PI * p) * (16 - limp * 12);
  const sF = [neck[0] - 21, neck[1] + 9], sN = [neck[0] + 23, neck[1] + 8];
  const arm = (s, a, bend) => {
    const e = [s[0] + Math.sin(a) * 31, s[1] + Math.cos(a) * 31];
    const w = [e[0] + Math.sin(a + bend) * 27, e[1] + Math.cos(a + bend) * 27];
    return [e, w];
  };
  const [eF, wF] = arm(sF, (swing * Math.PI) / 180, -0.3);
  let [eN, wN] = arm(sN, (-swing * Math.PI) / 180, -0.35);
  if (limp) { eN = [sN[0] + 8, sN[1] + 28]; wN = [neck[0] + 14, pelvis[1] - 10]; }
  return {
    head: [neck[0] - 4, neck[1] - 28 + limp * 6], tilt: limp * 10, view: limp ? 'down' : 'front',
    neck, pelvis, sF, eF, wF, sN, eN, wN,
    handF: { angle: 90 }, handN: limp ? { angle: 190, type: 'flat' } : { angle: 90 },
    hipF, kF: knee(hipF, aF, -1), aF, footF: { dir: -1, angle: aF[1] < 214 ? -10 : 0 },
    hipN, kN: knee(hipN, aN, -1), aN, footN: { dir: -1, angle: aN[1] < 214 ? -10 : 0 },
    shadow: [62, 40],
    order: ['legF', 'armF', 'legN', 'neck', 'torso', 'armN', 'head'],
  };
}

// ---------- A hit, and what follows it ----------

const shift = (sk, [dx, dy], joints = POINTS) => {
  const out = { ...sk };
  for (const joint of joints) out[joint] = [sk[joint][0] + dx, sk[joint][1] + dy];
  return out;
};

/**
 * The jolt of a hit, from whatever gesture a character holds: the upper body snaps up and
 * back on itself, the head goes back, the arms fly out on both sides alike. Nothing points
 * anywhere: the same jolt plays whoever caused it and from wherever.
 */
export function jolt(sk) {
  const upper = ['neck', 'head', 'sN', 'eN', 'wN', 'sF', 'eF', 'wF'];
  const out = shift(sk, [0, -6], upper);
  // Both arms thrown up and out, upper arm and forearm at their own lengths.
  const spread = (s, side) => { const e = [s[0] + side * 24.8, s[1] - 18.6]; return [e, [e[0] + side * 13.5, e[1] - 23.5]]; };
  [out.eF, out.wF] = spread(out.sF, -1);
  [out.eN, out.wN] = spread(out.sN, 1);
  out.handF = { angle: -120, type: 'open' }; out.handN = { angle: -60, type: 'open' };
  out.head = [out.head[0] + 2, out.head[1] - 3];
  out.tilt = (sk.tilt ?? 0) - 14;
  out.view = sk.view === 'back' ? 'back' : 'front';
  out.order = ['armF', 'armN', 'legF', 'legN', 'neck', 'torso', 'head'];
  out.front = [];
  return out;
}

/** Hurt: hunched, a hand pressed to the side, the head down. Injured, before the walk to the Hospital. */
export function hurt() {
  const sk = walkPose(0.25, { limp: 1 });
  return { ...sk, kF: [50, 178], aF: [46, 215], kN: [74, 180], aN: [80, 215], footF: { dir: -1 }, footN: { dir: 1 } };
}

/**
 * A flinch after a hit that leaves a character Injured where it is: its own gesture, the upper
 * body sunk and the head dropped, before it settles back into the gesture.
 */
export function flinch(sk) {
  const out = shift(sk, [0, 4], ['neck', 'head', 'sN', 'eN', 'wN', 'sF', 'eF', 'wF']);
  out.head = [out.head[0] - 2, out.head[1] + 3];
  out.tilt = (sk.tilt ?? 0) + 12;
  return out;
}

/** Falling: the knees give, the body folds toward the floor. */
export function falling() {
  return {
    head: [30, 118], tilt: -40, view: 'down',
    neck: [42, 136], pelvis: [72, 184],
    sF: [24, 142], eF: [8, 164], wF: [2, 190], handF: { angle: 100, type: 'open' },
    sN: [58, 132], eN: [80, 150], wN: [96, 168], handN: { angle: 60, type: 'open' },
    hipF: [64, 186], kF: [44, 206], aF: [56, 216], footF: { dir: -1, angle: 20 },
    hipN: [80, 186], kN: [96, 210], aN: [84, 220], footN: { dir: 1, angle: -10 },
    shadow: [60, 56],
    order: ['armF', 'legF', 'legN', 'neck', 'torso', 'armN', 'head'],
  };
}

/** Eliminated: down on the deck (gestures.mjs). */
export const DOWN = GESTURES.down;

/** The keys of an animation, by kind, from the gestures it starts and ends in. */
export const TIMELINES = {
  /** Getting up from a place to walk (the move's opening beat), into the walk's first step. */
  exit: (from, ms, walk = walkPose(0)) => [{ at: 0, sk: from }, { at: ms, sk: walk, ease: 'snap' }],
  /** Settling from the walk's last step into a place (the move's settle beat). */
  arrive: (to, ms, walk = walkPose(0)) => [{ at: 0, sk: walk }, { at: ms, sk: to, ease: 'settle' }],
  /** Hit and Injured where it is: the impact, a flinch, then its place's gesture again (to: now Injured). */
  hitStay: (from, to, ms, settle) => [
    { at: 0, sk: from },
    { at: ms * 0.25, sk: jolt(from), ease: 'impact' },
    { at: ms, sk: flinch(from), ease: 'settle' },
    { at: ms + settle, sk: to, ease: 'standard' },
  ],
  /** Hit, then hurt (Injured): the public impact, before the walk out. */
  hitHurt: (from, ms) => [{ at: 0, sk: from }, { at: ms * 0.25, sk: jolt(from), ease: 'impact' }, { at: ms, sk: hurt(), ease: 'settle' }],
  /**
   * Hit, then down (Eliminated): the impact at impact ms (with the burst), held to the end of the
   * opening beat, the fall, still. to: the place's fall, lying on the deck (DOWN) or slumped
   * where it is (over the desk, over the bench), which it sags straight into.
   */
  hitDown: (from, beats, to = DOWN, impact = beats.opening / 3) => {
    const hit = jolt(from);
    return [
      { at: 0, sk: from },
      { at: impact, sk: hit, ease: 'impact' },
      { at: beats.opening, sk: blend(hit, to === DOWN ? falling() : to, 0.12), ease: 'standard' },
      { at: beats.opening + beats.accent, sk: to === DOWN ? falling() : blend(hit, to, 0.7), ease: 'impact' },
      { at: beats.opening + beats.accent + beats.settle, sk: to, ease: 'settle' },
    ];
  },
};
