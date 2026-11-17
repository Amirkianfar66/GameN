// The acting: the Doctor test's 4 seconds (the role film's 0 to 4,000 ms), as an animator's timing chart. Every
// drawing is a pose of the approved rig (crew-drawing-1.0.0, unchanged), given here as key poses and breakdowns;
// the in-betweens are the rig's own blend (it turns each bone about its joint, so a hand travels on an arc), spaced
// by the chart's ease for that interval. The character is on twos: a new drawing every 1/12 s, held for two frames
// of 24. The camera and the light move on every frame of the screen.
//
//   A  the briefing room, 0-3,000 ms (the film's opener, its beats kept: the glint at 2,050-2,650, the flash from 2,650)
//        0      Mira looks out of the window, breathing; a blink
//        520    the card: her eyes go down first, then her head
//        900    she gathers herself: a breath in, the body sinks and draws back (the anticipation)
//        1000   the reach, over the desk, the arm long (the stretch), the hand open
//        1380   the hand closes on the injector; the body settles past and back
//        1500   the lift, the hand on an arc out and up, the body coming up behind it
//        2050   the injector by her face, a little past; settling; she looks at it, her brow sets
//        2380   a slow blink, the decision
//        2650   her eyes go past it, into the memory, as the light swells
//   B  Colony Nine, the fever years, 3,000-4,000 ms (the film's first panel, the same character in memory)
//        3000   at the foot of a cot, reading the chart, her eyes along its lines
//        3560   the head dips a little further (the anticipation)
//        3650   her eyes come up first, then her head, past where it rests and back, the hair following; a blink

import { STAND } from '../../../apps/game/hosted/scene-drawing/gestures.mjs';
import { blend } from '../../../apps/game/hosted/scene-drawing/motion.mjs';
import { clamp01 } from '../../../apps/game/hosted/pregame-films/kit/math.mjs';

export const TEST_MS = 4000;
/** The drawings' rate: on twos at 24 frames a second. */
export const DRAWING_MS = 1000 / 12;
export const CUT_MS = 3000;
/** The film's own beats inside the test, kept: the glint and the flash, the cut to the first memory at 3,000. */
export const GLINT = Object.freeze([2050, 2650]);
export const FLASH = Object.freeze([2650, 2950, 3300]);

/** The drawing a moment shows: on twos. */
export const drawingAt = t => Math.min(TEST_MS - DRAWING_MS, Math.floor(Math.max(0, t) / DRAWING_MS) * DRAWING_MS);

// ── Spacing: the chart's eases between two keys ──────────────────────

const SPACING = Object.freeze({
  even: v => v,
  slowOut: v => v * v * v, // slow out of the first key, fast into the second
  slowIn: v => 1 - (1 - v) ** 3, // fast out, slow into the second (a settle)
  both: v => (v < 0.5 ? 4 * v ** 3 : 1 - (-2 * v + 2) ** 3 / 2),
  snap: v => 1 - (1 - v) ** 5, // most of the move in the first drawings (a snap into an extreme)
});

/** A channel's value at t: keys [ms, value, spacing to the next], mixed by `mixer`. */
function channel(keys, t, mixer) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i += 1) {
    const [a, va, sp = 'both'] = keys[i], [b, vb] = keys[i + 1];
    if (t < b) return mixer(va, vb, SPACING[sp](clamp01((t - a) / (b - a))));
  }
  return keys.at(-1)[1];
}
const num = (a, b, k) => a + (b - a) * k;
const step = (keys, t) => { let v = keys[0][1]; for (const [at, value] of keys) if (t >= at) v = value; return v; };

// ── Shot A: the key poses (the rig's frame: the floor at 233, the figure facing left) ──

const arms = (base, { sF, eF, wF, sN, eN, wN }) => ({ ...base, ...(sF && { sF }), ...(eF && { eF }), ...(wF && { wF }), ...(sN && { sN }), ...(eN && { eN }), ...(wN && { wN }) });
/** The far arm (the picture's left) takes the injector, so it is drawn last, over the body. */
const ORDER = ['legF', 'legN', 'neck', 'torso', 'armN', 'head', 'armF'];
const pose = (over) => ({ ...STAND, view: 'front', handF: { type: 'none' }, handN: { angle: 200 }, order: ORDER, ...over });

export const KEYS_A = Object.freeze({
  // Looking out of the window, the weight on the back foot, a hand on the hip.
  rest: pose({ head: [57, 36], tilt: -5, neck: [61, 64], pelvis: [62, 124], sF: [39, 73], eF: [32, 105], wF: [34, 133] }),
  // A breath in: the chest and shoulders up a little.
  breath: pose({ head: [57, 34.6], tilt: -5.5, neck: [61, 62.8], pelvis: [62, 124], sF: [39, 71.8], eF: [32, 104], wF: [34, 132], sN: [84, 70.8] }),
  // The card: the head turns down to the desk.
  notice: pose({ head: [54, 40], tilt: 7, neck: [60, 64.5], pelvis: [62, 124], sF: [38.5, 73.5], eF: [31.5, 105.5], wF: [33.5, 133.5] }),
  // Gathering: the body sinks and draws back, the spine short (squash), the far elbow back, the shoulders up.
  gather: pose({ head: [61, 43], tilt: 2, neck: [64, 69], pelvis: [64, 127.5], sF: [42, 76], eF: [40, 104], wF: [45, 126], sN: [87, 75], eN: [104, 103], wN: [87, 125] }),
  // The reach, past the injector: the torso long over the desk (stretch), the arm straight, the hand open.
  reach: pose({ head: [41, 49], tilt: -12, neck: [50, 70], pelvis: [59, 123], sF: [30, 81], eF: [16, 113], wF: [9, 147], sN: [74, 78], eN: [92, 104], wN: [80, 124] }),
  // Contact: the hand closes on the injector's grip.
  grip: pose({ head: [44, 48], tilt: -10, neck: [52, 69.5], pelvis: [59.5, 123.5], sF: [32, 80], eF: [17, 111], wF: [14, 146], sN: [76, 77], eN: [94, 104], wN: [81, 124] }),
  // Settling past and back: the body gives a little under the weight.
  settle: pose({ head: [45, 50.5], tilt: -9, neck: [53, 71.5], pelvis: [60, 124.5], sF: [33, 82], eF: [18, 113], wF: [14, 146], sN: [77, 79], eN: [95, 106], wN: [82, 126] }),
  // The lift's breakdown: the elbow drops and goes out, the hand passing low and wide (the arc), the body coming up.
  lift: pose({ head: [50, 41], tilt: -3, neck: [57, 66], pelvis: [61, 124], sF: [36, 75], eF: [16, 99], wF: [6, 113], sN: [81, 73], eN: [100, 101], wN: [84, 123] }),
  // The injector by her face, past where it will rest: the body back, the head back with it.
  raise: pose({ head: [56, 32.5], tilt: 9, neck: [62, 62], pelvis: [62.5, 124], sF: [39, 72], eF: [5, 96], wF: [11, 61], sN: [85, 71], eN: [104, 99], wN: [86, 121] }),
  // Holding it there, the head turned to it.
  hold: pose({ head: [55, 34.5], tilt: 6, neck: [61, 63], pelvis: [62, 124], sF: [38.5, 72.5], eF: [5, 99], wF: [11, 65], sN: [84.5, 71.5], eN: [103.5, 99.5], wN: [85.5, 121.5] }),
  // A breath out, the shoulders down; the head a little forward to the injector.
  hold2: pose({ head: [54, 35.5], tilt: 4, neck: [60.5, 63.6], pelvis: [62, 124], sF: [38.5, 73.2], eF: [5, 100], wF: [11, 66], sN: [84.5, 72.4], eN: [103.5, 100], wN: [85.5, 122] }),
  // Into the memory: the head lifts, the eyes past the injector.
  memory: pose({ head: [56, 33], tilt: -2, neck: [61, 62.6], pelvis: [62, 124], sF: [38.5, 72.5], eF: [5.5, 100], wF: [11.5, 66], sN: [84.5, 71.5], eN: [103.5, 99.5], wN: [85.5, 121.5] }),
});

/** Shot A's chart: [ms, key, spacing to the next key]. */
const CHART_A = [
  [0, 'rest', 'both'], [420, 'breath', 'both'], [560, 'breath', 'slowIn'], [700, 'notice', 'both'],
  [820, 'notice', 'slowOut'], [1000, 'gather', 'snap'], [1300, 'reach', 'slowIn'], [1380, 'grip', 'slowIn'],
  [1460, 'settle', 'both'], [1540, 'settle', 'slowOut'], [1760, 'lift', 'slowIn'], [2040, 'raise', 'slowIn'],
  [2260, 'hold', 'both'], [2560, 'hold2', 'both'], [2900, 'memory', 'slowIn'], [3000, 'memory'],
];

/** Which hand the far arm has at a moment, a new drawing each (hands.mjs): none, open (reaching), closing, holding. */
const HAND_A = [[0, 'none'], [1000, 'open'], [1300, 'closing'], [1380, 'fist']];

/** The face: the look (the eyes lead the head), the lids, the brow and the mouth. */
const FACE_A = {
  look: [[0, 'out'], [520, 'desk'], [1460, 'desk'], [1540, 'injector'], [2660, 'out']],
  brow: [[0, 'rest'], [640, 'soft'], [900, 'lifted'], [1300, 'rest'], [2140, 'knit'], [2700, 'soft']],
  mouth: [[0, 'closed'], [900, 'breath'], [1100, 'parted'], [1460, 'closed'], [2200, 'pressed'], [2760, 'parted']],
  // Lids: a blink at 300, half down to the desk, the slow blink at 2,380 (down fast, held, up slowly).
  lids: [[0, 0, 'even'], [290, 0, 'even'], [330, 1, 'even'], [380, 1, 'slowIn'], [460, 0, 'even'], [560, 0, 'both'], [660, 0.32, 'both'],
    [1400, 0.32, 'both'], [1600, 0.05, 'even'], [2380, 0.05, 'snap'], [2440, 1, 'even'], [2560, 1, 'slowIn'], [2700, 0, 'even']],
};

// ── Shot B: Colony Nine ──────────────────────────────────────────────

const CHART = { item: 'clipboard', itemAt: [2, -14], itemAngle: -14 };
const reading = over => ({
  ...STAND, view: 'front', order: ['legF', 'legN', 'neck', 'torso', 'armF', 'armN', 'head'],
  sF: [39, 75], eF: [30, 104], wF: [38, 112], handF: { angle: -70, ...CHART },
  sN: [84, 73], eN: [90, 102], wN: [64, 100], handN: { angle: 196 },
  ...over,
});

export const KEYS_B = Object.freeze({
  read: reading({ head: [55, 41], tilt: 9, neck: [60, 66] }),
  readBreath: reading({ head: [55, 39.8], tilt: 8.5, neck: [60, 65], sF: [39, 74], sN: [84, 72] }),
  dip: reading({ head: [53.5, 43.5], tilt: 12, neck: [59.5, 67], sF: [39.5, 76], sN: [84, 74.5] }),
  up: reading({ head: [58.5, 31.5], tilt: -7, neck: [61.5, 62.5], sF: [39, 73], eF: [31, 104], wF: [39, 116], sN: [84, 71.5], eN: [91, 103], wN: [66, 104] }),
  rest: reading({ head: [57.5, 34], tilt: -3, neck: [61, 63.5], sF: [39, 73.5], eF: [31, 105], wF: [39, 117], sN: [84, 72], eN: [91, 104], wN: [66, 105] }),
});

const CHART_B = [
  [3000, 'read', 'both'], [3300, 'readBreath', 'both'], [3560, 'read', 'slowIn'], [3640, 'dip', 'snap'],
  [3820, 'up', 'slowIn'], [3960, 'rest', 'even'], [4000, 'rest'],
];

const FACE_B = {
  look: [[3000, 'readL'], [3170, 'readM'], [3340, 'readR'], [3500, 'readM'], [3660, 'up']],
  brow: [[3000, 'rest'], [3720, 'lifted'], [3900, 'soft']],
  mouth: [[3000, 'closed'], [3760, 'parted']],
  lids: [[3000, 0.42, 'even'], [3640, 0.48, 'snap'], [3720, 0, 'even'], [3880, 0, 'snap'], [3920, 1, 'even'], [3960, 0.1, 'slowIn'], [4000, 0, 'even']],
};

// ── The hair: follow-through ─────────────────────────────────────────

/**
 * Mira's hanging hair trails her head: a damped spring driven by the head's movement through the chart, worked out
 * once over the whole test on the drawings' own clock (so a drawing's hair is always the same), and held on twos
 * with the rest of her. Returns { sway, lift } in the head's units at each drawing.
 */
function hairOf(chart, keys, from, to) {
  const out = new Map();
  let sway = 0, lift = 0, vs = 0, vl = 0, last = null;
  const k = 70, c = 8.5, gain = 70;
  for (let t = from; t < to + 1; t += DRAWING_MS / 4) {
    const head = poseOf(chart, keys, t).head;
    if (last) {
      const dt = DRAWING_MS / 4, vx = (head[0] - last[0]) / dt, vy = (head[1] - last[1]) / dt;
      const ts = Math.max(-6, Math.min(6, -vx * gain)), tl = Math.max(-6, Math.min(6, -vy * gain * 0.5));
      for (let left = dt / 1000; left > 1e-9; left -= 0.004) {
        const h = Math.min(0.004, left);
        vs += (k * (ts - sway) - c * vs) * h; sway += vs * h;
        vl += (k * (tl - lift) - c * vl) * h; lift += vl * h;
      }
    }
    last = head;
    const d = drawingAt(t);
    if (Math.abs(t - d) < 1e-6 || !out.has(d)) out.set(d, { sway: Math.round(sway * 2) / 2, lift: Math.round(lift * 2) / 2 });
  }
  return out;
}

function poseOf(chart, keys, t) {
  return channel(chart.map(([ms, key, sp]) => [ms, keys[key], sp]), t, (a, b, k) => {
    const p = blend(a, b, k);
    return { ...p, view: 'front', order: a.order, handF: a.handF, handN: a.handN };
  });
}

const HAIR_A = hairOf(CHART_A, KEYS_A, 0, CUT_MS - DRAWING_MS);
const HAIR_B = hairOf(CHART_B, KEYS_B, CUT_MS, TEST_MS - DRAWING_MS);

// ── A drawing ────────────────────────────────────────────────────────

const roundJoints = sk => {
  const out = { ...sk };
  for (const [name, v] of Object.entries(sk)) if (Array.isArray(v) && v.length === 2 && typeof v[0] === 'number') out[name] = [Math.round(v[0] * 4) / 4, Math.round(v[1] * 4) / 4];
  out.tilt = Math.round((sk.tilt ?? 0) * 4) / 4;
  return out;
};

/**
 * Everything a drawing is, at a moment (snapped to its drawing): `shot` 'A' or 'B', `sk` the body's skeleton, `hand`
 * the far hand's drawing, `face` the head's acting ({ look, lids, brow, mouth, sway, lift }), and the injector's
 * place (`held`: in the hand, from 1,380 ms).
 */
export function drawingOf(t) {
  const d = drawingAt(t);
  if (d < CUT_MS) {
    const sk = roundJoints(poseOf(CHART_A, KEYS_A, d));
    const hair = HAIR_A.get(d) ?? { sway: 0, lift: 0 };
    const lids = Math.round(channel(FACE_A.lids, d, num) * 20) / 20;
    return {
      t: d, shot: 'A', sk, hand: step(HAND_A, d), held: d >= 1380,
      face: { look: step(FACE_A.look, d), lids, brow: step(FACE_A.brow, d), mouth: step(FACE_A.mouth, d), ...hair },
    };
  }
  const sk = roundJoints(poseOf(CHART_B, KEYS_B, d));
  const hair = HAIR_B.get(d) ?? { sway: 0, lift: 0 };
  const lids = Math.round(channel(FACE_B.lids, d, num) * 20) / 20;
  return { t: d, shot: 'B', sk, hand: 'chart', held: false, face: { look: step(FACE_B.look, d), lids, brow: step(FACE_B.brow, d), mouth: step(FACE_B.mouth, d), ...hair } };
}

/** Every drawing of the test, in order: [t, drawing]. */
export function allDrawings() {
  const out = [];
  for (let t = 0; t < TEST_MS - 1e-6; t += DRAWING_MS) out.push(drawingOf(t + 1e-6));
  return out;
}

/** The reduced motion's two held drawings: the injector by her face, and her looking up in the ward. */
export const STILL_TIMES = Object.freeze([2300, 3960]);
