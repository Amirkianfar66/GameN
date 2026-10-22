//
// The private-talk capsule's poses (scenes/capsule.mjs; docs/design/private-capsule.md): a
// participant sitting at the capsule's table and its few quiet variations, and the walk there and
// back. Skeletons in the shared figure frame (design/board-motion/figures/body.mjs), drawn by the
// approved rig and wardrobe unchanged; the approved gestures and the walk
// (design/board-motion/figures/gestures.mjs, motion.mjs) are reused, not edited.
//
// What a pose shows comes only from public facts the board already draws: a participant's health
// and detention. Injured (a patient, in the gown the board dresses every patient in): the bandage,
// a hunch and, walking, the approved stagger. Jailed (a prisoner, in the prison uniform): the hands
// held together in front. Both: both. Nothing heals, nothing frees and nothing changes clothes on
// the way. No pose follows a role, a side, a claim, who is speaking or any sound: the variations
// are a schedule drawn from the exchange's public id, the same on every screen.

import { walkPose } from '../scene-drawing/motion.mjs';

const ARM_UPPER = 33;
const ARM_FORE = 28;

/** Sitting at the table, side on, facing left (the rig's way): both forearms forward, the hands resting on the table's edge. */
const SIT = Object.freeze({
  head: [51, 94], tilt: 4, view: 'front',
  neck: [61, 120], pelvis: [70, 176],
  sF: [50, 129], eF: [42, 154], wF: [22, 152], handF: { angle: 184, type: 'flat' },
  sN: [78, 127], eN: [74, 154], wN: [50, 158], handN: { angle: 180, type: 'flat' },
  hipF: [62, 178], kF: [26, 175], aF: [28, 217], footF: { dir: -1 },
  hipN: [76, 182], kN: [36, 179], aN: [40, 222], footN: { dir: -1 },
  order: ['legF', 'armF', 'neck', 'torso', 'legN', 'armN', 'head'],
});

const move = (sk, joints, [dx, dy]) => Object.fromEntries(Object.entries(sk).map(([key, value]) => [key, joints.includes(key) ? [value[0] + dx, value[1] + dy] : value]));
const UPPER = ['head', 'neck', 'sF', 'eF', 'wF', 'sN', 'eN', 'wN'];

/**
 * The sitting pose and its variations, all facing left. A participant holds `sit` and drifts
 * through the others on the schedule of capsuleLoop(); none of them points, signals or mimes
 * anything.
 */
export const CAPSULE_POSES = Object.freeze({
  /** Sitting at the table, the hands resting on its edge. */
  sit: SIT,
  /** Leaning in over the table, the forearms on it. */
  lean: Object.freeze({ ...move(SIT, UPPER, [-6, 3]), tilt: 9, wF: [14, 151], wN: [40, 156] }),
  /** Sitting back, the hands on the thighs. */
  back: Object.freeze({ ...move(SIT, UPPER, [4, -2]), tilt: -3, eF: [52, 152], wF: [42, 170], handF: { angle: 170, type: 'flat' }, eN: [82, 152], wN: [64, 170], handN: { angle: 176, type: 'flat' } }),
  /** An open hand at the chest, palm up: the near hand. */
  open: Object.freeze({ ...SIT, eN: [70, 152], wN: [52, 138], handN: { angle: 240, type: 'open' } }),
  /** Listening: the near elbow on the table, the hand at the chin, the head inclined. */
  chin: Object.freeze({ ...SIT, head: [50, 97], tilt: 9, eN: [62, 153], wN: [53, 114], handN: { angle: -105, type: 'fist' } }),
  /** A nod: the head dipped. */
  nod: Object.freeze({ ...SIT, head: [50, 99], tilt: 15 }),
});
export const POSE_NAMES = Object.freeze(Object.keys(CAPSULE_POSES));

/** An elbow for a shoulder and a wrist, bent toward dir (-1: down and back, as an arm hangs), at the rig's arm lengths. */
function elbow(s, w, dir = -1) {
  const dx = w[0] - s[0], dy = w[1] - s[1];
  const reach = Math.hypot(dx, dy) || 1;
  const d = Math.min(reach, ARM_UPPER + ARM_FORE - 0.5);
  const a = (ARM_UPPER * ARM_UPPER - ARM_FORE * ARM_FORE + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, ARM_UPPER * ARM_UPPER - a * a));
  const ux = dx / reach, uy = dy / reach;
  const mx = s[0] + ux * a, my = s[1] + uy * a;
  const e1 = [mx - uy * h, my + ux * h], e2 = [mx + uy * h, my - ux * h];
  return (e1[0] - e2[0]) * -dir > 0 ? e1 : e2;
}
const round = ([x, y]) => [Number(x.toFixed(1)), Number(y.toFixed(1))];

/** The hands held together in front, at `at` (a prisoner's, wherever it walks or sits). */
function handsTogether(sk, at) {
  const wF = [at[0] - 3, at[1]], wN = [at[0] + 3, at[1] + 1];
  return { ...sk, eF: round(elbow(sk.sF, wF)), wF, handF: { angle: 10, type: 'fist' }, eN: round(elbow(sk.sN, wN)), wN, handN: { angle: 170, type: 'fist' } };
}

/** The public facts a participant is drawn by: Injured (a patient) and Jailed (a prisoner), from the board. */
export function statusOf(seat) {
  return { injured: seat.health === 'Injured', jailed: Boolean(seat.jailed) || seat.room === 'jail' };
}

/** A sitting pose (a name of CAPSULE_POSES) as a participant of this status holds it. */
export function sittingPose(name, { injured = false, jailed = false } = {}) {
  let sk = CAPSULE_POSES[name] ?? SIT;
  if (jailed && (name === 'open' || name === 'chin')) sk = SIT;
  if (injured) sk = { ...move(sk, UPPER, [-2, 5]), tilt: (sk.tilt ?? 0) + 7, bandage: true };
  if (jailed) sk = handsTogether(sk, [Math.min(sk.sF[0], sk.sN[0]) - 6, sk.pelvis[1] - 14]);
  return sk;
}

/** Walking, facing left, at phase 0..1 of the two-step cycle, as a participant of this status walks: the approved walk, the approved stagger when Injured. */
export function walkingPose(phase, { injured = false, jailed = false } = {}) {
  let sk = walkPose(phase, { limp: injured ? 1 : 0 });
  if (injured) sk = { ...sk, bandage: true };
  if (jailed) sk = handsTogether(sk, [sk.pelvis[0] - 10, sk.pelvis[1] - 10]);
  return sk;
}

// ---------- the quiet variations, on a public schedule ----------

/** A small deterministic generator (mulberry32) seeded from a string. */
function generator(text) {
  let h = 2166136261;
  for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The variations' timing, in ms: a pose is held for hold[0] to hold[1], reached over ease; a blink lasts blink and comes every blinkEvery[0] to blinkEvery[1]. */
export const LOOP = Object.freeze({ hold: Object.freeze([3800, 6800]), ease: 700, blink: 120, blinkEvery: Object.freeze([3000, 6000]), sequence: Object.freeze(['lean', 'sit', 'chin', 'sit', 'open', 'back', 'nod', 'sit']) });

/**
 * One participant's schedule of variations over `ms` from the conversation's start: a list of
 * { at, pose } (the pose reached at `at`, after LOOP.ease) and of blink starts. Seeded from the
 * exchange's public id and the seat (P1 or P2), so the two never move together by design and
 * every screen draws the same; it reads nothing else.
 */
export function capsuleLoop(exchangeId, seatId, ms = 60000) {
  const random = generator(`${exchangeId}|${seatId}`);
  const keys = [{ at: 0, pose: 'sit' }];
  let at = Math.round(1200 + random() * 2400);
  let index = Math.floor(random() * LOOP.sequence.length);
  while (at < ms) {
    keys.push({ at, pose: LOOP.sequence[index % LOOP.sequence.length] });
    index += 1;
    at += Math.round(LOOP.hold[0] + random() * (LOOP.hold[1] - LOOP.hold[0]));
  }
  const blinks = [];
  for (let t = Math.round(LOOP.blinkEvery[0] * random()); t < ms; t += Math.round(LOOP.blinkEvery[0] + random() * (LOOP.blinkEvery[1] - LOOP.blinkEvery[0]))) blinks.push(t);
  return { keys, blinks };
}
