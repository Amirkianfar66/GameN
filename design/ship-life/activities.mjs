// mothership:dev-only
//
// Ship life: each place's activity, as key skeletons of the rig (design/board-motion/figures/),
// varied from the place's own resting gesture. A cycle is: the resting pose, a short action, a
// natural pause, sometimes a variation, and a clean return to the resting pose, then a rest of
// varied length before the next. Nothing loops in step with anything else: every place and seat
// has its own seed. Under Reduce motion every place holds its resting pose.
//
// The bones blend about their joints (the rig's blend); what cannot blend (the head's view, a
// hand's item, the drawing order) switches halfway. Props the rig has (wrench, tablet, clipboard,
// flask, laptop, mug) are the rig's own; the rest (a parcel, a wire) are drawn by ./props.mjs
// at the hand.

import { skeletonOf } from '../board-motion/figures/gestures.mjs';
import { sample } from '../board-motion/figures/motion.mjs';

/** A small, fast, repeatable random: the same seed always gives the same activity. */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = text => [...String(text)].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
const between = (rand, lo, hi) => lo + (hi - lo) * rand();

/** A skeleton like sk with some joints and specs replaced. */
export function pose(sk, changes) {
  const out = { ...sk };
  for (const [key, value] of Object.entries(changes)) {
    out[key] = value && typeof value === 'object' && !Array.isArray(value) ? { ...(sk[key] ?? {}), ...value } : value;
  }
  return out;
}
/** Moves joints by offsets: { wN: [dx, dy], ... }. */
export function nudge(sk, offsets) {
  const out = { ...sk };
  for (const [key, [dx, dy]] of Object.entries(offsets)) out[key] = [sk[key][0] + dx, sk[key][1] + dy];
  return out;
}

// ---------- the activities ----------
// Each builds one cycle: beats [{ ms, sk, ease, props }], from the resting pose back to it. props:
// what the hands hold from that beat on ({ parcel: 'N' }, { wire: 'F' }); null clears them.

/** A1, the PC workstation, seated with the back to us: typing, a pause to read, a reach to a control. */
function pcWork(rest, rand) {
  const beats = [];
  // Typing: the elbows rise and fall in turn, the shoulders with them, now and then a short pause.
  const typing = ms => {
    const strokes = Math.round(ms / 150);
    for (let i = 0; i < strokes; i += 1) {
      const far = i % 2 === 0, lift = between(rand, 1.8, 3);
      const sk = nudge(rest, far ? { eF: [0.5, -lift], wF: [0.8, -lift * 0.7], sF: [0, -0.8], head: [0, 0.5] } : { eN: [-0.5, -lift], wN: [-0.8, -lift * 0.7], sN: [0, -0.8] });
      beats.push({ ms: 150, ease: 'linear', sk });
      if (i % 7 === 6 && rand() < 0.5) beats.push({ ms: between(rand, 220, 420), ease: 'standard', sk: rest });
    }
    beats.push({ ms: 160, ease: 'standard', sk: rest });
  };
  typing(between(rand, 1500, 2600));
  // A pause to read: sitting up, leaning in to the right screen; a glance to the left one; back.
  const read = pose(nudge(rest, { neck: [1, -3], head: [2, -7], sF: [0, -2], sN: [0, -2], eF: [0, -2], eN: [0, -2] }), { tilt: -4 });
  const glance = pose(nudge(read, { neck: [-2, 0], head: [-7, 1] }), { tilt: -9 });
  beats.push({ ms: 420, ease: 'settle', sk: read }, { ms: between(rand, 800, 1400), ease: 'linear', sk: nudge(read, { head: [1, -1] }) });
  if (rand() < 0.7) beats.push({ ms: 380, ease: 'standard', sk: glance }, { ms: between(rand, 500, 900), ease: 'linear', sk: nudge(glance, { head: [0, -1] }) }, { ms: 360, ease: 'standard', sk: read });
  if (rand() < 0.65) {
    // A control at the foot of the right screen: the near hand goes up to it, turns it twice, comes back.
    const reach = pose(nudge(rest, { head: [4, -3], neck: [1, -1] }), { tilt: 5, eN: [107, 124], wN: [112, 100], handN: { angle: -70, type: 'fist' } });
    beats.push({ ms: 400, ease: 'standard', sk: reach });
    beats.push({ ms: 240, ease: 'standard', sk: pose(reach, { handN: { angle: -40 } }) }, { ms: 240, ease: 'standard', sk: pose(reach, { handN: { angle: -75 } }) }, { ms: 220, ease: 'standard', sk: pose(reach, { handN: { angle: -45 } }) });
    beats.push({ ms: 440, ease: 'settle', sk: rest });
  } else {
    beats.push({ ms: 400, ease: 'settle', sk: rest });
  }
  typing(between(rand, 900, 1800));
  return beats;
}

/** A4, the crates, leaning back with the arms folded: a label, a strap, the small parcel lifted from the crate top and put back. */
function crateWork(rest, rand) {
  const beats = [];
  // The arms unfold; the near hand goes to the crate at the hip, the head goes down to its label.
  const label = pose(rest, {
    head: [68, 43], tilt: -10, view: 'down',
    eN: [104, 98], wN: [110, 121], handN: { angle: 80, type: 'open' },
    eF: [38, 104], wF: [42, 130], handF: { angle: 95, type: 'open' },
  });
  beats.push({ ms: 520, ease: 'standard', sk: label }, { ms: between(rand, 700, 1200), ease: 'linear', sk: nudge(label, { head: [1, 1] }) });
  if (rand() < 0.7) {
    // A strap: two short tugs.
    const tug = nudge(label, { wN: [-5, -5], eN: [-3, -2], sN: [0, 1] });
    beats.push({ ms: 200, ease: 'impact', sk: tug }, { ms: 220, ease: 'settle', sk: label }, { ms: 200, ease: 'impact', sk: tug }, { ms: 260, ease: 'settle', sk: label });
  }
  // The parcel on the crate top, beside the shoulder: reached for, held in front in both hands and
  // looked over, then put back where it was (RESTING: it stays there between times).
  const lift = pose(label, { head: [67, 37], tilt: -2, view: 'front', eN: [110, 102], wN: [97, 83], handN: { angle: -60, type: 'fist' } });
  const hold = pose(rest, {
    head: [61, 44], tilt: -8, view: 'down',
    eN: [92, 106], wN: [74, 108], handN: { angle: 200, type: 'open' },
    eF: [40, 106], wF: [52, 110], handF: { angle: -10, type: 'open' },
  });
  beats.push({ ms: 440, ease: 'standard', sk: lift }, { ms: 140, ease: 'standard', sk: lift, props: { parcel: 'N' } });
  beats.push({ ms: 500, ease: 'standard', sk: hold, props: { parcel: 'between' } });
  beats.push({ ms: between(rand, 800, 1400), ease: 'linear', sk: nudge(hold, { head: [1, 1], wN: [0, -1], wF: [0, -1] }) });
  if (rand() < 0.5) beats.push({ ms: 380, ease: 'standard', sk: pose(nudge(hold, { wN: [3, -5], wF: [3, -5] }), { tilt: -4 }) }, { ms: between(rand, 400, 700), ease: 'linear', sk: pose(nudge(hold, { wN: [3, -4], wF: [3, -4] }), { tilt: -5 }) });
  beats.push({ ms: 480, ease: 'standard', sk: lift, props: { parcel: 'N' } }, { ms: 160, ease: 'standard', sk: nudge(lift, { wN: [0, 1] }), props: null });
  beats.push({ ms: 560, ease: 'settle', sk: rest });
  return beats;
}

/** A5, the electrical panel, back to us: along the cables, a wire drawn out and held, its connector turned and checked, back in. */
function cableWork(rest, rand) {
  const beats = [];
  // The far hand follows the cables down the open box's edge, the head following it.
  for (const [w, e, head, tilt] of [[[26, 46], [8, 66], [55, 36], -9], [[28, 72], [8, 92], [54, 38], -12], [[26, 94], [10, 112], [54, 40], -14]]) {
    beats.push({ ms: between(rand, 420, 560), ease: 'standard', sk: pose(rest, { wF: w, eF: e, head, tilt, handF: { angle: -95, type: 'open' } }) });
  }
  // A wire drawn out over the open door and held up to look at.
  const hold = pose(rest, { wF: [6, 84], eF: [14, 108], handF: { angle: -150, type: 'fist' }, head: [53, 38], tilt: -15 });
  beats.push({ ms: 440, ease: 'standard', sk: hold, props: { wire: 'F' } }, { ms: between(rand, 600, 1000), ease: 'linear', sk: nudge(hold, { wF: [1, -2] }), props: { wire: 'F' } });
  // Its connector turned in the fingers and looked at again.
  beats.push({ ms: 260, ease: 'standard', sk: pose(nudge(hold, { wF: [0, -3] }), { handF: { angle: -115 } }), props: { wire: 'F' } }, { ms: 260, ease: 'standard', sk: pose(hold, { handF: { angle: -160 } }), props: { wire: 'F' } });
  beats.push({ ms: between(rand, 400, 700), ease: 'linear', sk: nudge(hold, { head: [0, 1] }), props: { wire: 'F' } });
  // Pushed back in; sometimes the wrench tightens a terminal at the box's top right.
  beats.push({ ms: 440, ease: 'standard', sk: pose(rest, { wF: [28, 80], eF: [8, 98], handF: { angle: -60, type: 'fist' }, head: [55, 37], tilt: -10 }), props: { wire: 'F' } });
  beats.push({ ms: 200, ease: 'standard', sk: pose(rest, { wF: [27, 78], eF: [8, 96], handF: { angle: -60, type: 'fist' }, head: [55, 37], tilt: -10 }), props: null });
  if (rand() < 0.55) {
    const tighten = angle => pose(rest, { eN: [108, 92], wN: [100, 64], handN: { angle: -80, type: 'fist', item: 'wrench', itemAngle: angle }, head: [60, 36], tilt: 6 });
    beats.push({ ms: 460, ease: 'standard', sk: tighten(-70) }, { ms: 260, ease: 'standard', sk: tighten(-35) }, { ms: 220, ease: 'standard', sk: tighten(-70) }, { ms: 260, ease: 'standard', sk: tighten(-35) });
    beats.push({ ms: 460, ease: 'standard', sk: rest });
  }
  beats.push({ ms: 420, ease: 'settle', sk: rest });
  return beats;
}

/** The activity of each place built so far (the pilot: PC work, crates, cables); others rest. */
export const BUILDERS = Object.freeze({ A1: pcWork, A4: crateWork, A5: cableWork });

/** Fixed points a place's props come from, in the figure's frame: A5's wire leaves the open panel at its left edge. */
export const ANCHORS = Object.freeze({ A5: Object.freeze({ wire: Object.freeze([30, 80]) }) });

/**
 * What waits at a place between times, in the frame of its occupant (props.mjs draws it): A4's
 * parcel on the crate top beside the shoulder. It stays at the place while its occupant is away.
 */
export const RESTING = Object.freeze({ A4: Object.freeze({ parcel: Object.freeze({ at: Object.freeze([100, 78]), angle: 0 }) }) });

/** How long a place rests between cycles, in ms: varied, so places never move in step. */
const REST = [1600, 4200];

/**
 * A place's activity as a timeline: the cycles from start on, for one seat (the seat keeps two
 * characters at the same place out of step) and one round of it (round: after each visit to the
 * capsule the activity starts again, from its resting pose, with other cycles). Each cycle: a
 * rest, then the beats.
 */
export function activityTimeline(place, gesture, { seat = 0, start = 0, round = 0, until = start + 120000 } = {}) {
  const rest = skeletonOf(gesture);
  const build = BUILDERS[place];
  const rand = seeded(hash(`${place}:${seat}:${round}`));
  const keys = [{ at: start, sk: rest, props: null }];
  const props = [{ at: start, props: null }];
  let t = start + between(rand, round ? 900 : 300, round ? 2200 : 2400);
  if (!build) return { rest, keys, props, until, anchors: ANCHORS[place] ?? {}, resting: RESTING[place] ?? {} };
  while (t < until) {
    keys.push({ at: t, sk: rest, ease: 'standard' });
    for (const beat of build(rest, rand)) {
      t += beat.ms;
      keys.push({ at: t, sk: beat.sk, ease: beat.ease ?? 'standard' });
      if ('props' in beat) props.push({ at: t - beat.ms, props: beat.props });
    }
    t += between(rand, ...REST);
  }
  keys.push({ at: t, sk: rest, ease: 'standard' });
  return { rest, keys, props, until: t, anchors: ANCHORS[place] ?? {}, resting: RESTING[place] ?? {} };
}

/** The props held at time t. */
export function propsAt(timeline, t) {
  let held = null;
  for (const change of timeline.props) { if (change.at > t) break; held = change.props; }
  return held ?? {};
}

/** The skeleton and props of a place's activity at time t; under Reduce motion, its resting pose. */
export function activityAt(timeline, t, { reduced = false } = {}) {
  if (reduced) return { sk: timeline.rest, props: {} };
  return { sk: sample(timeline.keys, t), props: propsAt(timeline, t) };
}
