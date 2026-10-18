// Runtime drawing port of Claude cb9386bd716dc346160509d5e49d7348fdaf4f84; source design/board-v2/figures/captain.mjs.
// Only development fence and relative imports adapted; canonical source preserved.
//
// The Captain films' poses (storyboards S6 and S7; docs/design/captain-films.md): the Captain at the
// chart table pressing the console, and the prisoners' reactions to an EJECT. Skeletons in the shared
// figure frame (design/board-motion/figures/body.mjs), drawn by the approved rig and wardrobe
// unchanged; the approved gestures, the walk and the blend (design/board-motion/figures/gestures.mjs,
// motion.mjs) are reused, not edited.
//
// A pose shows only what the public outcome says happened: the Captain's office pressed a command,
// the prisoners were released or taken off the board. Nothing in a pose follows a role, a side or a
// cause, nothing points at anyone, and nobody is hurt: an ejected character tumbles as a silhouette,
// a body leaves as a grey paper cut-out.

import { GESTURES, skeletonOf } from '../scene-drawing/gestures.mjs';
import { blend } from '../scene-drawing/motion.mjs';

const move = (sk, joints, [dx, dy]) => Object.fromEntries(Object.entries(sk).map(([key, value]) => [key, joints.includes(key) ? [value[0] + dx, value[1] + dy] : value]));
const UPPER = ['head', 'neck', 'sF', 'eF', 'wF', 'sN', 'eN', 'wN'];
const TABLE = skeletonOf('captainTable');

/** How far the Captain's upper body dips at the press, in figure units (about 2 px on a phone). */
export const PRESS_DIP = 5;

/**
 * The Captain at the chart table (C1's gesture, captainTable), the near hand lifted to press the
 * console set in the table (reach), and the press itself: the hand down on it, the shoulders dipped.
 * The far hand stays on the table. The arms stay in front of the table, as C1's gesture draws them.
 */
export const CAPTAIN_POSES = Object.freeze({
  table: TABLE,
  reach: Object.freeze({ ...TABLE, head: [61, 57], tilt: 6, eN: [110, 106], wN: [100, 116], handN: { angle: 70, type: 'fist' } }),
  press: Object.freeze({ ...move(TABLE, UPPER, [0, PRESS_DIP]), tilt: 8, eN: [106, 118 + PRESS_DIP], wN: [94, 141 + PRESS_DIP], handN: { angle: 80, type: 'flat' } }),
});

/** The Captain's pose at a moment: from (a CAPTAIN_POSES name) toward to, a share v of the way. */
export const captainPose = (from, to, v) => blend(CAPTAIN_POSES[from], CAPTAIN_POSES[to], v);

/**
 * A prisoner's startle at the lockdown, from whatever place it holds: the upper body jerks up and
 * the head goes back, the hands come up a little. Not the hit's jolt: nothing strikes anyone.
 */
export function startle(sk) {
  const out = move(sk, UPPER, [0, -4]);
  out.wF = [out.wF[0], out.wF[1] - 6];
  out.wN = [out.wN[0], out.wN[1] - 6];
  out.tilt = (sk.tilt ?? 0) - 10;
  return out;
}

/** Bracing, on its feet: the knees bent, the forearms up in front of the chest, the head down. */
export const BRACE = Object.freeze({
  ...GESTURES.stand,
  head: [58, 44], tilt: 10, view: 'front',
  neck: [60, 70], pelvis: [62, 130],
  sF: [39, 79], eF: [30, 104], wF: [46, 84], handF: { angle: -60, type: 'fist' },
  sN: [83, 78], eN: [94, 104], wN: [74, 86], handN: { angle: -120, type: 'fist' },
  hipF: [53, 132], kF: [44, 172], aF: [40, 214], footF: { dir: -1 },
  hipN: [71, 132], kN: [82, 172], aN: [86, 214], footN: { dir: 1 },
  order: ['legF', 'legN', 'neck', 'torso', 'armF', 'armN', 'head'],
});

/** Tumbling: arms and legs spread, as the air takes a character out. Drawn as a silhouette, turning. */
export const TUMBLE = Object.freeze({
  head: [62, 42], tilt: -6, view: 'front',
  neck: [62, 68], pelvis: [62, 126],
  sF: [40, 76], eF: [20, 60], wF: [6, 40], handF: { angle: -120, type: 'open' },
  sN: [84, 76], eN: [104, 62], wN: [120, 44], handN: { angle: -60, type: 'open' },
  hipF: [54, 128], kF: [38, 164], aF: [26, 200], footF: { dir: -1, angle: 20 },
  hipN: [70, 128], kN: [88, 166], aN: [102, 202], footN: { dir: 1, angle: -20 },
  order: ['legF', 'legN', 'armF', 'armN', 'neck', 'torso', 'head'],
});

/** A prisoner's pose through an EJECT: its place's gesture, startled, getting up into the brace, then tumbling. */
export function ejectPose(sk, { startled = 0, braced = 0, tumbling = 0 }) {
  if (tumbling > 0) return blend(BRACE, TUMBLE, tumbling);
  if (braced > 0) return blend(startle(sk), BRACE, braced);
  if (startled > 0) return blend(sk, startle(sk), startled);
  return sk;
}
