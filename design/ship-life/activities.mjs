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

// ---------- Room A, the open deck and the floor hatch ----------

/** A2, the open deck, an arm across and a hand at the chin: a checklist from the belt, read, a glance round, put away. */
function checklist(rest, rand) {
  const beats = [];
  // The near hand goes to the belt and comes up with the clipboard (the rig's own, nothing written on it).
  const belt = pose(rest, { eN: [96, 104], wN: [86, 124], handN: { angle: 100, type: 'fist' }, tilt: 2 });
  const read = pose(rest, {
    head: [57, 41], tilt: -6, view: 'down',
    eN: [98, 104], wN: [76, 100], handN: { angle: -100, type: 'fist', item: 'clipboard', itemAt: [0, -14], itemAngle: -8 },
  });
  beats.push({ ms: 420, ease: 'standard', sk: belt }, { ms: 460, ease: 'standard', sk: read });
  beats.push({ ms: between(rand, 900, 1500), ease: 'linear', sk: nudge(read, { head: [0, 1], wN: [0, -1] }) });
  // A glance round the room, the checklist lowered a little, then back to it.
  const glance = pose(nudge(read, { wN: [2, 6], eN: [1, 3] }), { head: [55, 37], tilt: rand() < 0.5 ? -9 : 7, view: 'front' });
  beats.push({ ms: 380, ease: 'standard', sk: glance }, { ms: between(rand, 600, 1100), ease: 'linear', sk: nudge(glance, { head: [-1, 0] }) });
  if (rand() < 0.6) beats.push({ ms: 380, ease: 'standard', sk: read }, { ms: between(rand, 600, 1000), ease: 'linear', sk: nudge(read, { head: [1, 1] }) });
  // Put away: down to the belt (the clipboard goes as the hand gets there), back to the chin.
  beats.push({ ms: 440, ease: 'standard', sk: pose(belt, { handN: { item: 'clipboard', itemAt: [0, -14], itemAngle: 80 } }) });
  beats.push({ ms: 120, ease: 'standard', sk: belt }, { ms: 480, ease: 'settle', sk: rest });
  return beats;
}

/** A3, crouched at the floor hatch with a wrench: small turns of the wrench, the fitting looked at closely, a rest. */
function hatchWork(rest, rand) {
  const beats = [];
  const turn = (dx, dy, angle) => pose(nudge(rest, { wN: [dx, dy], eN: [dx * 0.5, dy * 0.4] }), { handN: { itemAngle: angle } });
  const turns = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < turns; i += 1) {
    beats.push({ ms: 300, ease: 'impact', sk: turn(6, -5, 98) }, { ms: 340, ease: 'settle', sk: turn(0, 0, 125) });
    if (rand() < 0.4) beats.push({ ms: between(rand, 200, 400), ease: 'linear', sk: turn(0, 0, 125) });
  }
  // The fitting looked at closely: lower, the free hand to the rim of the hatch.
  const look = pose(nudge(rest, { head: [-3, 6], neck: [-1, 3], wF: [10, -6], eF: [6, -6] }), { tilt: -24 });
  beats.push({ ms: 460, ease: 'standard', sk: look }, { ms: between(rand, 900, 1500), ease: 'linear', sk: nudge(look, { head: [1, 0] }) });
  // A rest: sitting back on the heel a moment, the head up.
  const back = pose(nudge(rest, { head: [6, -6], neck: [4, -4], sF: [3, -3], sN: [3, -3], pelvis: [2, 0] }), { tilt: -10 });
  beats.push({ ms: 480, ease: 'standard', sk: back }, { ms: between(rand, 600, 1100), ease: 'linear', sk: back }, { ms: 520, ease: 'settle', sk: rest });
  return beats;
}

// ---------- Room B ----------

/** B1, standing with a tablet: scrolls a neutral diagram, taps it, looks up at the equipment nearby. */
function tabletWork(rest, rand) {
  const beats = [];
  for (let i = 0; i < 2 + Math.floor(rand() * 2); i += 1) {
    beats.push({ ms: 320, ease: 'standard', sk: nudge(rest, { wN: [-3, -7], eN: [-1, -3] }) }, { ms: 380, ease: 'standard', sk: nudge(rest, { wN: [-2, 3], eN: [0, 1] }) });
  }
  // A tap: the finger goes in, a short pause.
  beats.push({ ms: 200, ease: 'standard', sk: nudge(rest, { wN: [-6, -2] }) }, { ms: 140, ease: 'impact', sk: nudge(rest, { wN: [-8, 0] }) }, { ms: 260, ease: 'settle', sk: rest });
  // Up at the equipment: the tablet lowered a little, the head up and round.
  const up = pose(nudge(rest, { wF: [0, 6], eF: [0, 3], wN: [0, 6] }), { head: [53, 37], tilt: -7, view: 'front' });
  beats.push({ ms: 420, ease: 'standard', sk: up }, { ms: between(rand, 800, 1400), ease: 'linear', sk: nudge(up, { head: [-1, 0] }) }, { ms: 460, ease: 'settle', sk: rest });
  return beats;
}

/** B2, on the stool with a laptop: types, pauses, tilts the screen a little, types again. */
function laptopWork(rest, rand) {
  const beats = [];
  const typing = ms => {
    for (let i = 0; i < Math.round(ms / 150); i += 1) {
      const far = i % 2 === 0, lift = between(rand, 2, 3.4);
      beats.push({ ms: 150, ease: 'linear', sk: nudge(rest, far ? { wF: [0, -lift], eF: [0, -lift * 0.4] } : { wN: [0, -lift], eN: [0, -lift * 0.4] }) });
    }
    beats.push({ ms: 160, ease: 'standard', sk: rest });
  };
  typing(between(rand, 1200, 2200));
  // A pause: sitting back, the head up from the screen.
  const pause = pose(nudge(rest, { head: [3, -6], neck: [2, -3], sF: [1, -2], sN: [1, -2] }), { tilt: 6 });
  beats.push({ ms: 420, ease: 'standard', sk: pause }, { ms: between(rand, 700, 1300), ease: 'linear', sk: nudge(pause, { head: [0, -1] }) });
  if (rand() < 0.6) {
    // The screen tilted back a little: the near hand to the top of the lid.
    const lid = pose(rest, { eN: [58, 142], wN: [12, 134], handN: { angle: 200, type: 'fist' } });
    beats.push({ ms: 420, ease: 'standard', sk: lid }, { ms: 360, ease: 'standard', sk: pose(nudge(lid, { wN: [-3, 2] }), { prop: { angle: -8 } }) });
    beats.push({ ms: 420, ease: 'standard', sk: pose(rest, { prop: { angle: -8 } }) });
    typing(between(rand, 900, 1600));
    beats.push({ ms: 360, ease: 'standard', sk: pose(rest, { prop: { angle: -8 } }) }, { ms: 300, ease: 'standard', sk: rest });
  } else {
    beats.push({ ms: 400, ease: 'settle', sk: rest });
    typing(between(rand, 900, 1600));
  }
  return beats;
}

/** B3, at the specimen tank, back to us, the near hand on the glass: wipes a patch of it with a cloth, looks in closely. */
function tankWork(rest, rand) {
  const beats = [];
  // The cloth from the belt, in the near hand, back to the glass; small circles; a look in, close.
  const belt = pose(rest, { eN: [100, 104], wN: [94, 126], handN: { angle: 95, type: 'fist' } });
  const glass = pose(rest, { eN: [106, 92], wN: [98, 64], handN: { angle: -84, type: 'flat' } });
  beats.push({ ms: 420, ease: 'standard', sk: belt }, { ms: 460, ease: 'standard', sk: glass, props: { cloth: 'N' } });
  const circle = [[-6, -4], [-8, 4], [0, 8], [4, 2], [-2, -4], [-8, 2], [-2, 6], [0, 0]];
  for (const [dx, dy] of circle) beats.push({ ms: 150, ease: 'linear', sk: nudge(glass, { wN: [dx, dy], eN: [dx * 0.4, dy * 0.3] }), props: { cloth: 'N' } });
  const look = pose(nudge(glass, { head: [4, -2], neck: [2, -1] }), { tilt: 4 });
  beats.push({ ms: 380, ease: 'standard', sk: look, props: { cloth: 'N' } }, { ms: between(rand, 900, 1500), ease: 'linear', sk: nudge(look, { head: [1, 0] }), props: { cloth: 'N' } });
  beats.push({ ms: 420, ease: 'standard', sk: belt, props: { cloth: 'N' } }, { ms: 140, ease: 'standard', sk: belt, props: null });
  beats.push({ ms: 460, ease: 'settle', sk: rest });
  return beats;
}

/** B4, leaning on the bench: lifts a sample to the light, turns it, puts it back, squares the tray. */
function benchWork(rest, rand) {
  const beats = [];
  const lift = pose(rest, {
    head: [60, 50], tilt: -4, view: 'front',
    eN: [104, 106], wN: [92, 86], handN: { angle: -90, type: 'fist', item: 'flask', itemAt: [0, -6], itemAngle: 0 },
  });
  beats.push({ ms: 380, ease: 'standard', sk: pose(rest, { wN: [92, 124], handN: { type: 'fist' } }) });
  beats.push({ ms: 460, ease: 'standard', sk: lift });
  beats.push({ ms: 420, ease: 'standard', sk: pose(lift, { handN: { itemAngle: 16 } }) }, { ms: between(rand, 500, 900), ease: 'linear', sk: pose(lift, { handN: { itemAngle: -10 } }) });
  beats.push({ ms: 360, ease: 'standard', sk: pose(lift, { handN: { itemAngle: 0 } }) });
  // Put back: the flask goes as the hand reaches the bench.
  beats.push({ ms: 420, ease: 'standard', sk: pose(rest, { wN: [92, 126], handN: { type: 'fist', item: 'flask', itemAt: [0, -6], itemAngle: 0 } }) });
  beats.push({ ms: 120, ease: 'standard', sk: pose(rest, { wN: [92, 126], handN: { type: 'fist' } }) });
  // The tray squared: both hands slide a little one way, then back.
  beats.push({ ms: 360, ease: 'standard', sk: nudge(rest, { wF: [6, 0], eF: [3, 0], wN: [6, 0], eN: [3, 0] }) }, { ms: 300, ease: 'standard', sk: nudge(rest, { wF: [3, 0], wN: [3, 0] }) });
  beats.push({ ms: 420, ease: 'settle', sk: rest });
  return beats;
}

/** B5, at the microscope: looks through it, turns the focus, looks up a moment, looks again. */
function microscopeWork(rest, rand) {
  const beats = [];
  const peer = pose(nudge(rest, { head: [-5, 3], neck: [-2, 1] }), { tilt: -14, view: 'down' });
  beats.push({ ms: 420, ease: 'standard', sk: peer });
  for (let i = 0; i < 2 + Math.floor(rand() * 2); i += 1) {
    beats.push({ ms: 260, ease: 'standard', sk: pose(nudge(peer, { wF: [1, 2] }), { handF: { angle: -70 } }) }, { ms: 300, ease: 'standard', sk: pose(peer, { handF: { angle: -100 } }) });
  }
  beats.push({ ms: between(rand, 600, 1000), ease: 'linear', sk: nudge(peer, { head: [0, 1] }) });
  // Up for a moment, the flask held out a little to look at; then back to the eyepiece.
  const up = pose(nudge(rest, { head: [2, -3], wN: [4, -4] }), { tilt: 0, view: 'front' });
  beats.push({ ms: 400, ease: 'standard', sk: up }, { ms: between(rand, 600, 1100), ease: 'linear', sk: up });
  if (rand() < 0.6) beats.push({ ms: 420, ease: 'standard', sk: peer }, { ms: between(rand, 700, 1200), ease: 'linear', sk: peer });
  beats.push({ ms: 440, ease: 'settle', sk: rest });
  return beats;
}

// ---------- The Command Room ----------

/**
 * C1, the Captain leaning on the chart table: looks over the table's neutral instruments, shifts
 * the hands, reads a small status tablet. Never a direction: no pointing, no line drawn, nothing
 * set on the chart, nothing that says a course was chosen or confirmed.
 */
function captainWork(rest, rand) {
  const beats = [];
  // The gaze moves over the table, near and far; the weight shifts from hand to hand.
  beats.push({ ms: 520, ease: 'standard', sk: pose(nudge(rest, { head: [-4, 1], neck: [-2, 0], wF: [2, 0] }), { tilt: -6 }) }, { ms: between(rand, 700, 1100), ease: 'linear', sk: pose(nudge(rest, { head: [-4, 2], neck: [-2, 0] }), { tilt: -6 }) });
  beats.push({ ms: 520, ease: 'standard', sk: pose(nudge(rest, { head: [4, 1], neck: [2, 0], wN: [-2, 0], pelvis: [2, 0] }), { tilt: 5 }) }, { ms: between(rand, 700, 1100), ease: 'linear', sk: pose(nudge(rest, { head: [4, 2], neck: [2, 0], pelvis: [2, 0] }), { tilt: 5 }) });
  if (rand() < 0.7) {
    // The status tablet: up from the table's edge in the near hand, read, put down again.
    const read = pose(nudge(rest, { head: [0, -4], neck: [0, -3], sF: [0, -3], sN: [0, -3] }), {
      eN: [100, 120], wN: [80, 108], handN: { angle: -100, type: 'fist', item: 'tablet', itemAt: [0, -12], itemAngle: -6 },
    });
    beats.push({ ms: 460, ease: 'standard', sk: read }, { ms: between(rand, 1000, 1600), ease: 'linear', sk: nudge(read, { head: [0, 1] }) });
    beats.push({ ms: 440, ease: 'standard', sk: pose(rest, { handN: { item: 'tablet', itemAt: [0, -12], itemAngle: 70 } }) }, { ms: 120, ease: 'standard', sk: rest });
  }
  beats.push({ ms: 460, ease: 'settle', sk: rest });
  return beats;
}

// ---------- The Hospital: the patients rest (quiet breaths, small moves; never a visit) ----------

const breath = (rest, deep = 1) => nudge(rest, { neck: [0, -1.2 * deep], sF: [0, -1.4 * deep], sN: [0, -1.4 * deep], head: [0, -1 * deep], eF: [0, -0.8 * deep], eN: [0, -0.8 * deep] });
function breathing(beats, rest, rand, n) {
  for (let i = 0; i < n; i += 1) {
    beats.push({ ms: between(rand, 1400, 1800), ease: 'standard', sk: breath(rest, between(rand, 0.8, 1.2)) }, { ms: between(rand, 1800, 2300), ease: 'standard', sk: rest });
  }
}

/** H1 (lying, an arm across the forehead): quiet breaths, then the arm or the pillow settled. */
function lyingRest(rest, rand) {
  const beats = [];
  breathing(beats, rest, rand, 2);
  if (rand() < 0.5) {
    const arm = nudge(rest, { wN: [8, 6], eN: [4, 3] });
    beats.push({ ms: 520, ease: 'standard', sk: arm }, { ms: between(rand, 900, 1400), ease: 'linear', sk: arm }, { ms: 620, ease: 'settle', sk: rest });
  } else {
    const turn = pose(nudge(rest, { head: [-2, -1] }), { tilt: rand() < 0.5 ? -7 : 6 });
    beats.push({ ms: 600, ease: 'standard', sk: turn }, { ms: between(rand, 1200, 1800), ease: 'linear', sk: turn }, { ms: 640, ease: 'settle', sk: rest });
  }
  breathing(beats, rest, rand, 1);
  return beats;
}

/** H2 and H3 (sitting up against the pillow): quiet breaths, the blanket straightened, a glance at the bedside display. */
function sittingRest(rest, rand) {
  const beats = [];
  breathing(beats, rest, rand, 2);
  const tug = nudge(rest, { wF: [2, -7], wN: [-2, -7], eF: [0, -4], eN: [0, -4] });
  beats.push({ ms: 420, ease: 'standard', sk: tug }, { ms: 360, ease: 'settle', sk: nudge(rest, { wF: [1, -2], wN: [-1, -2] }) }, { ms: 300, ease: 'standard', sk: rest });
  const glance = pose(nudge(rest, { head: [-4, 0], neck: [-1, 0] }), { tilt: -8 });
  beats.push({ ms: 520, ease: 'standard', sk: glance }, { ms: between(rand, 900, 1500), ease: 'linear', sk: glance }, { ms: 560, ease: 'settle', sk: rest });
  breathing(beats, rest, rand, 1);
  return beats;
}

/** H4 (lying, the other side): quiet breaths and a slight turn of the head. */
function lyingTurn(rest, rand) {
  const beats = [];
  breathing(beats, rest, rand, 2);
  const turn = pose(nudge(rest, { head: [-1, 0] }), { tilt: 6 });
  beats.push({ ms: 700, ease: 'standard', sk: turn }, { ms: between(rand, 1400, 2200), ease: 'linear', sk: turn }, { ms: 700, ease: 'settle', sk: rest });
  breathing(beats, rest, rand, 1);
  return beats;
}

// ---------- The Jail: small, restless moves; never a way out ----------

/** J1, hunched on the bench: rubs the hands, shifts the elbows on the knees, looks up a moment. */
function benchRestless(rest, rand) {
  const beats = [];
  for (let i = 0; i < 4 + Math.floor(rand() * 3); i += 1) {
    const a = i % 2 === 0 ? 1 : -1;
    beats.push({ ms: 170, ease: 'linear', sk: nudge(rest, { wF: [a * 2.5, -a * 1.5], wN: [-a * 2.5, a * 1.5] }) });
  }
  beats.push({ ms: 220, ease: 'standard', sk: rest });
  const shift = pose(nudge(rest, { eF: [3, 1], eN: [3, -1], sF: [2, 1], sN: [2, -1], head: [2, 0] }), { tilt: 4 });
  beats.push({ ms: 460, ease: 'standard', sk: shift }, { ms: between(rand, 500, 900), ease: 'linear', sk: shift });
  const up = pose(nudge(rest, { head: [0, -12], neck: [0, -6], sF: [0, -4], sN: [0, -4] }), { view: 'front', tilt: 0 });
  beats.push({ ms: 460, ease: 'standard', sk: up }, { ms: between(rand, 800, 1400), ease: 'linear', sk: nudge(up, { head: [-1, 0] }) }, { ms: 520, ease: 'settle', sk: rest });
  return beats;
}

/** J2, at the door, back to us: up on the toes to glance through the inspection slit (it does nothing), down, the hands shifted. */
function doorGlance(rest, rand) {
  const beats = [];
  const lift = ['pelvis', 'neck', 'head', 'sN', 'eN', 'wN', 'sF', 'eF', 'wF', 'hipN', 'hipF', 'kN', 'kF'];
  const toes = nudge(rest, Object.fromEntries(lift.map(j => [j, [0, j === 'kN' || j === 'kF' ? -4 : -7]])));
  const peer = pose(nudge(toes, { head: [0, -3], wF: [0, -6], wN: [0, -6] }), { tilt: 0 });
  beats.push({ ms: 520, ease: 'standard', sk: peer }, { ms: between(rand, 900, 1500), ease: 'linear', sk: nudge(peer, { head: [rand() < 0.5 ? -2 : 2, 0] }) }, { ms: 500, ease: 'settle', sk: rest });
  // The hands shift on the door, the head bows again.
  beats.push({ ms: 440, ease: 'standard', sk: pose(nudge(rest, { wF: [-2, 10], eF: [-2, 6], head: [0, 3] }), { tilt: -4 }) }, { ms: between(rand, 700, 1200), ease: 'linear', sk: pose(nudge(rest, { wF: [-2, 10], eF: [-2, 6], head: [0, 3] }), { tilt: -4 }) });
  beats.push({ ms: 480, ease: 'settle', sk: rest });
  return beats;
}

/** J3, leaning on the wall: the weight shifted (the foot down from the wall), the arms unfolded and folded again, a look round. */
function wallRestless(rest, rand) {
  const beats = [];
  const down = nudge(pose(rest, { kN: [76, 176], aN: [80, 214], footN: { dir: 1, angle: 0 } }), { pelvis: [3, 0], hipN: [3, 0], hipF: [3, 0] });
  beats.push({ ms: 480, ease: 'standard', sk: down }, { ms: between(rand, 500, 900), ease: 'linear', sk: down });
  const open = pose(down, { eF: [36, 104], wF: [40, 132], handF: { angle: 95, type: 'open' }, eN: [94, 104], wN: [90, 130], handN: { angle: 88, type: 'open' } });
  beats.push({ ms: 460, ease: 'standard', sk: open }, { ms: between(rand, 700, 1200), ease: 'linear', sk: pose(open, { head: [62, 38], tilt: rand() < 0.5 ? -8 : 6 }) });
  beats.push({ ms: 460, ease: 'standard', sk: down }, { ms: 500, ease: 'settle', sk: rest });
  return beats;
}

/** J4, sitting on the deck, the knees up: the seat settled, the fingers tapped on a knee. */
function floorRestless(rest, rand) {
  const beats = [];
  const straight = nudge(rest, { neck: [0, -3], head: [0, -4], sF: [0, -3], sN: [0, -3], eF: [0, -2], eN: [0, -2], wF: [0, -2], wN: [0, -2] });
  beats.push({ ms: 460, ease: 'standard', sk: straight }, { ms: 520, ease: 'settle', sk: rest });
  const knee = pose(rest, { eN: [94, 182], wN: [88, 170], handN: { angle: -60, type: 'open' } });
  beats.push({ ms: 380, ease: 'standard', sk: knee });
  for (let i = 0; i < 4 + Math.floor(rand() * 3); i += 1) beats.push({ ms: 150, ease: 'impact', sk: nudge(knee, { wN: [1, -2.5] }) }, { ms: 150, ease: 'settle', sk: knee });
  beats.push({ ms: between(rand, 300, 600), ease: 'linear', sk: knee }, { ms: 440, ease: 'settle', sk: rest });
  return beats;
}

/** J5, on the cot: the head moved on the folded arm, a hand stretched up, settled again. */
function cotRestless(rest, rand) {
  const beats = [];
  const head = pose(nudge(rest, { head: [2, -2] }), { tilt: 78 });
  beats.push({ ms: 600, ease: 'standard', sk: head }, { ms: between(rand, 700, 1100), ease: 'linear', sk: head });
  const stretch = pose(nudge(rest, { eN: [12, -22], wN: [22, -46] }), { handN: { angle: -70, type: 'open' } });
  beats.push({ ms: 560, ease: 'standard', sk: stretch }, { ms: between(rand, 400, 700), ease: 'linear', sk: nudge(stretch, { wN: [2, -3] }) }, { ms: 620, ease: 'settle', sk: rest });
  return beats;
}

/**
 * The activity of each of the twenty places, from its resting gesture: { build, rest } (rest: how
 * long the place rests between cycles, in ms; the Hospital's patients keep breathing between).
 */
export const BUILDERS = Object.freeze({
  A1: { build: pcWork }, A2: { build: checklist }, A3: { build: hatchWork }, A4: { build: crateWork }, A5: { build: cableWork },
  B1: { build: tabletWork }, B2: { build: laptopWork }, B3: { build: tankWork }, B4: { build: benchWork }, B5: { build: microscopeWork },
  C1: { build: captainWork },
  H1: { build: lyingRest, rest: [0, 300] }, H2: { build: sittingRest, rest: [0, 300] }, H3: { build: sittingRest, rest: [0, 300] }, H4: { build: lyingTurn, rest: [0, 300] },
  J1: { build: benchRestless }, J2: { build: doorGlance }, J3: { build: wallRestless }, J4: { build: floorRestless }, J5: { build: cotRestless },
});

/** Fixed points a place's props come from, in the figure's frame: A5's wire leaves the open panel at its left edge. */
export const ANCHORS = Object.freeze({ A5: Object.freeze({ wire: Object.freeze([30, 80]) }) });

/**
 * What waits at a place between times, in the frame of its occupant (props.mjs draws it), shown
 * whenever the occupant's hands or lap do not hold it: A4's parcel on the crate top beside the
 * shoulder; B2's laptop, left on the stool while B2 is at the capsule.
 */
export const RESTING = Object.freeze({
  A4: Object.freeze({ parcel: Object.freeze({ at: Object.freeze([100, 78]), angle: 0 }) }),
  B2: Object.freeze({ laptop: Object.freeze({ at: Object.freeze([56, 191]), angle: 0 }) }),
});

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
  const entry = BUILDERS[place];
  const build = entry?.build;
  const pause = entry?.rest ?? REST;
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
    t += between(rand, ...pause);
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
