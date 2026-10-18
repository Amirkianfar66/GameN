// mothership:dev-only
//
// The Captain's films (storyboards S6, S7 and S8; docs/design/captain-films.md): the beats as data,
// and what is drawn at any moment, worked out from that moment and public, authoritative inputs alone.
//
//   S6  RELEASE: played for an authorized CAPTAIN_OUTCOME kind RELEASE. The Captain presses the
//       console, a green pulse runs down the board's gutters to the Jail, the door unlocks and
//       opens, the prisoners walk out and cross to the places the snapshot gives them, the door shuts.
//   S7  EJECT: played for an authorized CAPTAIN_OUTCOME kind EJECT. The Captain lifts the cover and
//       presses, the emergency light comes on, the Jail locks down, an airlock opens, the air takes
//       the living prisoners out as silhouettes and the bodies leave as grey cut-outs, the hull is
//       seen from outside, the hatch shuts, the console shows EJECT used.
//   S8  the command plates' states, for the Captain's own controls.
//
// The inputs are Backend's (protocol 2, full-game-1.8.0; packages/contracts/src/captain-outcomes.ts
// on #146): the outcome's kind and seatIds (RELEASE: every living prisoner physically in the Jail;
// EJECT: every physical Jail occupant, bodies included), the time since the outcome's presentation
// start, the client's snapshot before it (where each subject was and whether it was a body) and the
// snapshot published with it (where each released subject went, and the Captain at C1), and the
// device's reduced-motion setting. Nothing here reads a role, a side, a faction or a cause; the
// outcome names no actor, and the Captain drawn pressing is whoever holds the public office at C1.
// A film changes nothing and decides nothing: it plays after the authorized outcome.

import { AIRLOCK } from '../fx/captain.mjs';

export const CAPTAIN_FILMS_VERSION = 'board-v2-captain-films-0.1.0';

const clamp01 = v => Math.max(0, Math.min(1, v));
const ramp = (t, from, to) => clamp01((t - from) / (to - from));
const easeOut = v => 1 - (1 - v) ** 2;
const easeIn = v => v * v;
const easeInOut = v => (v < 0.5 ? 2 * v * v : 1 - (-2 * v + 2) ** 2 / 2);
const lerp = (a, b, v) => a + (b - a) * v;
const hundredth = v => Math.round(v * 100) / 100 || 0;

// ---------- the words ----------

/**
 * The words a client says for an authoritative CAPTAIN_OUTCOME: Frontend's, as the hosted board says
 * them today (#154, board-v2-host.mjs paintOutcomes()): every listed seat, in the outcome's order. A
 * film adds no words of its own; it marks the beat at which its picture shows the outcome.
 */
export const captainWords = (kind, seats) => `${seats.map(seat => `Player ${seat}`).join(', ')}: ${kind === 'RELEASE' ? 'released from detention' : 'ejected'}.`;

// ---------- where the people go, in the Jail's scene units ----------

/** Where a prisoner steps to at the open door, and where it is when it has passed through: the doorway's foot, then just inside. */
export const DOOR_STEP = Object.freeze({ at: Object.freeze([512, 386]), scale: 0.94, through: Object.freeze([512, 368]) });

/** A walking prisoner on its way to the door from its place (slot: { at, scale }), a share v of the way: its feet, its scale, its facing. */
export function walkToDoor(slot, v) {
  const u = easeInOut(clamp01(v));
  return {
    at: [hundredth(lerp(slot.at[0], DOOR_STEP.at[0], u)), hundredth(lerp(slot.at[1], DOOR_STEP.at[1], u))],
    scale: hundredth(lerp(slot.scale, DOOR_STEP.scale, u)),
    // The rig faces left; a figure going right is drawn mirrored.
    mirror: DOOR_STEP.at[0] > slot.at[0] + 1,
  };
}

/** The figure's middle over its feet, in figure units (FRAME.anchor less the pelvis): what the air pulls toward the hatch. */
export const BODY_MIDDLE = 108;

/**
 * A living prisoner taken by the air from where it braces (slot: { at, scale }), a share v of the
 * way into the hatch: its feet (so that its middle reaches the hatch's centre), its scale (shrinking
 * into the distance), its turn in degrees and its opacity (gone at the hatch).
 */
export function pullToHatch(slot, v, index = 0) {
  const u = easeIn(clamp01(v));
  const scale = lerp(slot.scale, slot.scale * 0.22, u);
  const [hx, hy] = AIRLOCK.c;
  const to = [hx, hy + BODY_MIDDLE * scale];
  return {
    at: [hundredth(lerp(slot.at[0], to[0], u)), hundredth(lerp(slot.at[1], to[1], u) - Math.sin(Math.PI * u) * 40)],
    scale: hundredth(scale),
    turn: Math.round((index % 2 ? -1 : 1) * 300 * u),
    opacity: hundredth(1 - ramp(v, 0.82, 1)),
  };
}

// ---------- S6: RELEASE ----------

export const RELEASE_FILM = Object.freeze({
  id: 'captain-release',
  storyboard: 'S6',
  end: 4200,
  // The console: the inset opens on the RELEASE plate; the Captain lifts the near hand and presses.
  insetPop: Object.freeze([0, 160]),
  reach: Object.freeze([0, 450]),
  press: Object.freeze([500, 800]),
  down: Object.freeze([500, 620]),
  up: Object.freeze([680, 800]),
  ring: Object.freeze([520, 800]),
  // The green pulse runs down the gutters to the Jail's lamp.
  pulse: Object.freeze([800, 1300]),
  tail: 0.22,
  // The keypad and the lamp go green, the lock's wheel turns in three steps.
  locks: Object.freeze([1300, 1700]),
  wheel: Object.freeze([Object.freeze([1300, 0]), Object.freeze([1430, 45]), Object.freeze([1560, 90])]),
  // The door slides open.
  door: Object.freeze([1700, 2200]),
  // The prisoners, one after another in slot order: up, to the door, through it, across the board, landing.
  walk: Object.freeze({ start: 2200, stagger: 80, up: 150, toDoor: 450, through: 120, across: 450, land: 330 }),
  // The door shuts once the last is through; the signals and the wheel go back; the Captain back at the table.
  close: Object.freeze([3300, 3800]),
  normal: 3800,
  back: Object.freeze([3700, 4100]),
  used: 3800,
  insetClose: Object.freeze([3950, 4200]),
  announce: 1700,
  reduced: Object.freeze({ fadeMs: 80, holdMs: 520, stages: Object.freeze(['console', 'open', 'arrived', 'closed']) }),
});

const reducedEnd = film => film.reduced.fadeMs * 2 + film.reduced.holdMs * film.reduced.stages.length;
/** When a film has drawn its last: every node it added is gone by then. */
export const releaseEnd = (reduced = false) => (reduced ? reducedEnd(RELEASE_FILM) : RELEASE_FILM.end);

/** A reduced film's stage at t, and the film's opacity (it fades in and out over fadeMs). */
function reducedStage(film, t) {
  const { fadeMs, holdMs, stages } = film.reduced;
  const end = reducedEnd(film);
  const index = Math.max(0, Math.min(stages.length - 1, Math.floor((t - fadeMs) / holdMs)));
  // Each panel fades in over fadeMs from its start (the first from the film's start); the last fades out.
  const start = index === 0 ? 0 : fadeMs + index * holdMs;
  return { stage: stages[index], index, fade: hundredth(ramp(t, start, start + fadeMs)), opacity: hundredth(Math.min(ramp(t, 0, fadeMs), 1 - ramp(t, end - fadeMs, end))) };
}

/** The console inset's parts: the plate's state, the cover's frame, the glove (where its tip is, on the plate), the accents and the USED stamp. */
const noInset = () => ({ opacity: 0, scale: 1, plate: 'available', cover: null, glove: null, ring: null, click: null, stamp: 0 });

/**
 * One released prisoner at t, i of the film's subjects in slot order:
 *   state  'jail' (at its old place), 'up' (getting up), 'door' (walking to the door), 'through'
 *          (passing the doorway), 'across' (crossing the board), 'land' (settling at its new place), 'settled'
 *   v      the share of that state done
 */
export function releasePerson(t, i) {
  const W = RELEASE_FILM.walk;
  const t0 = W.start + i * W.stagger;
  const steps = [['up', W.up], ['door', W.toDoor], ['through', W.through], ['across', W.across], ['land', W.land]];
  if (t < t0) return { state: 'jail', v: 0 };
  let at = t0;
  for (const [state, ms] of steps) {
    if (t < at + ms) return { state, v: hundredth((t - at) / ms) };
    at += ms;
  }
  return { state: 'settled', v: 1 };
}

/**
 * What RELEASE draws at t (ms from the outcome's presentation start) for count subjects:
 *   inset     the console inset's parts (noInset() shape) with its opacity and scale
 *   captain   { from, to, v }: C1's pose (figures/captain.mjs CAPTAIN_POSES), blended
 *   pulse     { v (the head's share of the way), tail, opacity } or null
 *   door      { open, wheel, lamp, keypad } (fx/captain.mjs jailDoorSvg())
 *   people    one releasePerson() per subject
 *   announce  whether the words are in the live region; done: nothing drawn, nothing left
 */
export function releaseFrame(t, { reduced = false, count = 0 } = {}) {
  const F = RELEASE_FILM;
  const end = releaseEnd(reduced);
  const frame = {
    stage: 'before', inset: noInset(), captain: { from: 'table', to: 'table', v: 0 }, pulse: null,
    door: { open: 0, wheel: 0, lamp: 'normal', keypad: 'normal' }, people: Array.from({ length: count }, () => ({ state: 'jail', v: 0 })), announce: false, done: false,
  };
  if (t < 0) return frame;
  if (t >= end) return { ...frame, stage: 'done', done: true, people: frame.people.map(() => ({ state: 'settled', v: 1 })) };
  if (reduced) {
    // No travel, flash or turn: four still panels, each faded in over 80 ms.
    const { stage, index, fade, opacity } = reducedStage(F, t);
    const open = index === 1 || index === 2;
    return {
      ...frame, stage, announce: index >= 1, fade, opacity,
      inset: { ...noInset(), opacity: index === 0 ? opacity : 0, plate: 'pressed' },
      captain: { from: 'press', to: 'press', v: 0 },
      door: { open: open ? 1 : 0, wheel: open ? 90 : 0, lamp: open ? 'green' : 'normal', keypad: open ? 'green' : 'normal' },
      people: frame.people.map(() => (index >= 2 ? { state: 'settled', v: 1 } : { state: 'jail', v: 0 })),
    };
  }
  frame.stage = t < F.press[0] ? 'console' : t < F.pulse[0] ? 'press' : t < F.locks[0] ? 'pulse' : t < F.door[0] ? 'locks' : t < F.walk.start ? 'door' : t < F.close[0] ? 'walk' : t < F.normal ? 'close' : 'settle';
  // The console inset: open from the start, the plate pressed then used, closing at the end.
  const pressed = t >= F.down[0] && t < F.up[1];
  frame.inset = {
    opacity: hundredth(1 - ramp(t, ...F.insetClose)),
    scale: hundredth(lerp(0.85, 1, easeOut(ramp(t, ...F.insetPop)))),
    plate: t >= F.used ? 'used' : pressed ? 'pressed' : 'available',
    cover: null,
    // The glove's tip over the button, then on it; gone once the plate is up again.
    glove: t < F.up[1] ? { lift: hundredth(t < F.down[0] ? 1 - easeOut(ramp(t, F.reach[0], F.reach[1])) * 0.7 : t < F.down[1] ? 0.3 * (1 - ramp(t, ...F.down)) : t < F.up[0] ? 0 : 0.6 * ramp(t, ...F.up)), opacity: hundredth(Math.min(ramp(t, 0, 120), 1 - ramp(t, F.up[0] + 60, F.up[1]))) } : null,
    ring: t >= F.ring[0] && t < F.ring[1] ? { scale: hundredth(lerp(0.7, 1.25, easeOut(ramp(t, ...F.ring)))), opacity: hundredth(1 - ramp(t, ...F.ring)) } : null,
    click: null,
    stamp: hundredth(ramp(t, F.used, F.used + 120)),
  };
  // C1: reaching, pressing, holding the press, then back to the table.
  frame.captain = t < F.down[0] ? { from: 'table', to: 'reach', v: hundredth(easeOut(ramp(t, ...F.reach))) }
    : t < F.down[1] ? { from: 'reach', to: 'press', v: hundredth(ramp(t, ...F.down)) }
      : t < F.back[0] ? { from: 'press', to: 'press', v: 0 }
        : { from: 'press', to: 'table', v: hundredth(easeInOut(ramp(t, ...F.back))) };
  if (t >= F.pulse[0] && t < F.locks[0] + 200) {
    frame.pulse = { v: hundredth(easeInOut(ramp(t, ...F.pulse))), tail: F.tail, opacity: hundredth(1 - ramp(t, F.locks[0], F.locks[0] + 200)) };
  }
  const wheel = t >= F.normal ? 0 : F.wheel.reduce((angle, [at, deg]) => (t >= at ? deg : angle), 0);
  const green = t >= F.locks[0] && t < F.normal;
  frame.door = {
    open: hundredth(t < F.close[0] ? easeInOut(ramp(t, ...F.door)) : 1 - easeInOut(ramp(t, ...F.close))),
    wheel, lamp: green ? 'green' : 'normal', keypad: green ? 'green' : 'normal',
  };
  frame.people = frame.people.map((_, i) => releasePerson(t, i));
  frame.announce = t >= F.announce;
  return frame;
}

// ---------- S7: EJECT ----------

export const EJECT_FILM = Object.freeze({
  id: 'captain-eject',
  storyboard: 'S7',
  end: 7200,
  // 1 Command: a short push on C1 (art only); the inset on the EJECT plate under its cover; the
  // cover lifts in three frames, the press, a hard click.
  insetPop: Object.freeze([0, 160]),
  push: Object.freeze({ in: Object.freeze([0, 600]), out: Object.freeze([900, 1300]), scale: 1.06 }),
  reach: Object.freeze([100, 450]),
  cover: Object.freeze([Object.freeze([0, 'closed']), Object.freeze([300, 'lifting']), Object.freeze([450, 'open'])]),
  press: Object.freeze([600, 900]),
  down: Object.freeze([600, 700]),
  up: Object.freeze([760, 900]),
  click: Object.freeze([600, 820]),
  insetClose: Object.freeze([1300, 1500]),
  // 2 Alert: the emergency light in the Command Room and the Jail (under 2 Hz, low), a red pulse down the gutters.
  alert: Object.freeze([900, 1500]),
  emergency: Object.freeze({ from: 900, rise: 200, out: Object.freeze([6600, 7200]), periodMs: 625, low: 0.16, high: 0.34 }),
  pulse: Object.freeze([900, 1400]),
  tail: 0.22,
  // 3 Lockdown: the door locks (the wheel turns back), the keypad stripes red and amber, the hatch is
  // revealed in the wall; the prisoners start and get up to brace.
  lockdown: Object.freeze([1500, 2400]),
  wheel: Object.freeze([Object.freeze([1500, 0]), Object.freeze([1600, -45]), Object.freeze([1700, -90])]),
  reveal: Object.freeze([1600, 2000]),
  startle: Object.freeze([1500, 1700]),
  brace: Object.freeze([1700, 2100]),
  // 4 Airlock: the clamps release in three steps, the iris opens onto space, the suction builds.
  clamps: Object.freeze([Object.freeze([2400, 0.34]), Object.freeze([2500, 0.67]), Object.freeze([2600, 1])]),
  iris: Object.freeze([2700, 3300]),
  suction: Object.freeze({ in: Object.freeze([2900, 3300]), out: Object.freeze([4200, 4500]), frameMs: 90 }),
  debris: Object.freeze([3000, 3900]),
  // 5 Ejection: the living, one after another in slot order, pulled out as silhouettes; the bodies
  // rise and fade as grey cut-outs, all at once.
  eject: Object.freeze({ start: 3300, stagger: 100, lean: 150, pull: 450, last: 100 }),
  bodies: Object.freeze([3300, 4100]),
  label: Object.freeze([3300, 4400]),
  // 6 Exterior: the hull from outside, the hatch open, the characters drifting away.
  exterior: Object.freeze({ in: Object.freeze([4400, 4600]), out: Object.freeze([5600, 5800]) }),
  // 7 Closure: the iris shuts, the clamps engage, the hatch is gone; the signals go back; the console
  // shows EJECT used under its shut cover; the memorial plaque.
  irisClose: Object.freeze([5800, 6300]),
  clampsBack: Object.freeze([6300, 6500]),
  hatchOut: Object.freeze([6600, 7000]),
  normal: 6800,
  wheelBack: Object.freeze([6800, 7000]),
  final: Object.freeze([6100, 6260]),
  finalClose: Object.freeze([7000, 7200]),
  plaque: Object.freeze([6600, 6800]),
  announce: 3300,
  reduced: Object.freeze({ fadeMs: 80, holdMs: 600, stages: Object.freeze(['console', 'open', 'empty', 'memorial']) }),
});

export const ejectEnd = (reduced = false) => (reduced ? reducedEnd(EJECT_FILM) : EJECT_FILM.end);

/**
 * One subject of an EJECT at t, i of the film's living subjects in slot order (bodies: body true):
 *   state  'jail', 'startle', 'brace', 'pulled' (a silhouette, v of the way into the hatch), 'gone',
 *          or for a body 'jail', 'dissolve' (rising and fading as a grey cut-out), 'gone'
 */
export function ejectPerson(t, i, { body = false } = {}) {
  const F = EJECT_FILM;
  if (body) {
    if (t < F.bodies[0]) return { state: 'jail', v: 0 };
    if (t < F.bodies[1]) return { state: 'dissolve', v: hundredth(ramp(t, ...F.bodies)) };
    return { state: 'gone', v: 1 };
  }
  const E = F.eject;
  const t0 = E.start + i * E.stagger;
  if (t < F.startle[0]) return { state: 'jail', v: 0 };
  if (t < F.brace[0]) return { state: 'startle', v: hundredth(easeOut(ramp(t, ...F.startle))) };
  if (t < t0 + E.lean) return { state: 'brace', v: hundredth(easeInOut(ramp(t, ...F.brace))), lean: hundredth(ramp(t, t0, t0 + E.lean)) };
  if (t < t0 + E.lean + E.pull + E.last) return { state: 'pulled', v: hundredth(ramp(t, t0 + E.lean, t0 + E.lean + E.pull + E.last)) };
  return { state: 'gone', v: 1 };
}

/**
 * What EJECT draws at t for its subjects ({ body } each, in slot order):
 *   inset       the console inset's parts, opacity and scale
 *   push        the Command Room art's scale on C1's press point (1 to 1.06; never its press areas)
 *   captain     C1's pose
 *   emergency   the emergency light's opacity over the Command Room's and the Jail's art
 *   pulse       the red pulse, or null
 *   door        { open: 0, wheel, lamp, keypad }
 *   airlock     { reveal (its opacity), clamps, open, glow }
 *   suction     { frame 1 to 3, opacity }   debris: { v, opacity }
 *   people      one ejectPerson() per subject
 *   label       EJECTED's { opacity, scale }   exterior: { opacity, drift (0 to 1) }   plaque: its opacity
 */
export function ejectFrame(t, { reduced = false, subjects = [] } = {}) {
  const F = EJECT_FILM;
  const end = ejectEnd(reduced);
  const living = subjects.map((s, i) => subjects.slice(0, i).filter(other => !other.body).length);
  const frame = {
    stage: 'before', inset: noInset(), push: 1, captain: { from: 'table', to: 'table', v: 0 }, emergency: 0, pulse: null,
    door: { open: 0, wheel: 0, lamp: 'normal', keypad: 'normal' }, airlock: { reveal: 0, clamps: 0, open: 0, glow: 0 },
    suction: { frame: 1, opacity: 0 }, debris: { v: 0, opacity: 0 }, people: subjects.map(() => ({ state: 'jail', v: 0 })),
    label: { opacity: 0, scale: 1 }, exterior: { opacity: 0, drift: 0 }, plaque: 0, announce: false, done: false,
  };
  if (t < 0) return frame;
  if (t >= end) return { ...frame, stage: 'done', done: true, people: subjects.map(() => ({ state: 'gone', v: 1 })), plaque: 1 };
  if (reduced) {
    // Still panels: the console with EJECT lit; the Jail with the hatch open and EJECTED; the empty
    // Jail; the memorial plaque. No suction, travel, push, shake, pulse or flash.
    const { stage, index, fade, opacity } = reducedStage(F, t);
    return {
      ...frame, stage, announce: index >= 1, fade, opacity,
      inset: { ...noInset(), opacity: index === 0 ? opacity : 0, plate: 'pressed', cover: 'open' },
      captain: { from: 'press', to: 'press', v: 0 },
      emergency: index <= 1 ? 0.2 : 0,
      door: { open: 0, wheel: index <= 1 ? -90 : 0, lamp: index <= 1 ? 'red' : 'normal', keypad: index <= 1 ? 'amber' : 'normal' },
      airlock: index === 1 ? { reveal: 1, clamps: 1, open: 1, glow: 0.6 } : { reveal: 0, clamps: 0, open: 0, glow: 0 },
      people: subjects.map(() => (index >= 1 ? { state: 'gone', v: 1 } : { state: 'jail', v: 0 })),
      label: { opacity: index === 1 ? 1 : 0, scale: 1 },
      plaque: index === 3 ? 1 : 0,
    };
  }
  frame.stage = t < F.alert[0] ? 'command' : t < F.lockdown[0] ? 'alert' : t < F.clamps[0][0] ? 'lockdown' : t < F.eject.start ? 'airlock' : t < F.exterior.in[0] ? 'ejection' : t < F.irisClose[0] ? 'exterior' : 'closure';
  const pressed = t >= F.down[0] && t < F.up[1];
  const final = t >= F.final[0];
  frame.inset = {
    opacity: hundredth(final ? Math.min(ramp(t, ...F.final), 1 - ramp(t, ...F.finalClose)) : 1 - ramp(t, ...F.insetClose)),
    scale: hundredth(final ? lerp(0.85, 1, easeOut(ramp(t, ...F.final))) : lerp(0.85, 1, easeOut(ramp(t, ...F.insetPop)))),
    plate: final ? 'used' : pressed ? 'pressed' : 'available',
    cover: final ? 'closed' : F.cover.reduce((frameName, [at, name]) => (t >= at ? name : frameName), 'closed'),
    glove: !final && t < F.up[1] ? { lift: hundredth(t < F.down[0] ? 1 - easeOut(ramp(t, F.reach[0], F.reach[1])) * 0.7 : t < F.down[1] ? 0.3 * (1 - ramp(t, ...F.down)) : t < F.up[0] ? 0 : 0.6 * ramp(t, ...F.up)), opacity: hundredth(Math.min(ramp(t, F.reach[0], F.reach[0] + 120), 1 - ramp(t, F.up[0] + 60, F.up[1]))) } : null,
    ring: null,
    click: t >= F.click[0] && t < F.click[1] ? { scale: hundredth(lerp(0.75, 1.1, easeOut(ramp(t, ...F.click)))), opacity: hundredth(1 - ramp(t, F.click[0] + 100, F.click[1])) } : null,
    stamp: final ? hundredth(ramp(t, F.final[1], F.final[1] + 120)) : 0,
  };
  frame.push = hundredth(1 + (F.push.scale - 1) * (easeOut(ramp(t, ...F.push.in)) - easeInOut(ramp(t, ...F.push.out))));
  frame.captain = t < F.down[0] ? { from: 'table', to: 'reach', v: hundredth(easeOut(ramp(t, ...F.reach))) }
    : t < F.down[1] ? { from: 'reach', to: 'press', v: hundredth(ramp(t, ...F.down)) }
      : t < F.insetClose[0] ? { from: 'press', to: 'press', v: 0 }
        : { from: 'press', to: 'table', v: hundredth(easeInOut(ramp(t, F.insetClose[0], F.insetClose[0] + 400))) };
  // The emergency light: up over 200 ms, then a slow pulse (1.6 Hz) between low opacities, out at the end.
  if (t >= F.emergency.from) {
    const E = F.emergency;
    const wave = 0.5 - 0.5 * Math.cos((2 * Math.PI * (t - E.from)) / E.periodMs);
    frame.emergency = hundredth((E.low + (E.high - E.low) * wave) * ramp(t, E.from, E.from + E.rise) * (1 - ramp(t, ...E.out)));
  }
  if (t >= F.pulse[0] && t < F.pulse[1] + 200) frame.pulse = { v: hundredth(easeInOut(ramp(t, ...F.pulse))), tail: F.tail, opacity: hundredth(1 - ramp(t, F.pulse[1], F.pulse[1] + 200)) };
  const alarm = t >= F.alert[0] && t < F.normal;
  frame.door = {
    open: 0,
    wheel: t >= F.wheelBack[0] ? Math.round(-90 * (1 - ramp(t, ...F.wheelBack))) : F.wheel.reduce((angle, [at, deg]) => (t >= at ? deg : angle), 0),
    lamp: alarm ? 'red' : 'normal',
    keypad: t >= F.lockdown[0] && t < F.normal ? 'amber' : alarm ? 'red' : 'normal',
  };
  const clamps = t >= F.clampsBack[0] ? 1 - ramp(t, ...F.clampsBack) : F.clamps.reduce((v, [at, share]) => (t >= at ? share : v), 0);
  frame.airlock = {
    reveal: hundredth(easeOut(ramp(t, ...F.reveal)) * (1 - ramp(t, ...F.hatchOut))),
    clamps: hundredth(clamps),
    open: hundredth(t < F.irisClose[0] ? easeInOut(ramp(t, ...F.iris)) : 1 - easeInOut(ramp(t, ...F.irisClose))),
    glow: hundredth(ramp(t, ...F.reveal) * (1 - ramp(t, ...F.hatchOut)) * (frame.emergency > 0 ? 0.6 + frame.emergency : 0.6)),
  };
  frame.suction = { frame: 1 + (Math.floor(Math.max(0, t - F.suction.in[0]) / F.suction.frameMs) % 3), opacity: hundredth(ramp(t, ...F.suction.in) * (1 - ramp(t, ...F.suction.out))) };
  frame.debris = { v: hundredth(ramp(t, ...F.debris)), opacity: hundredth(t >= F.debris[0] && t < F.debris[1] ? 1 - ramp(t, F.debris[1] - 150, F.debris[1]) : 0) };
  frame.people = subjects.map((s, i) => ejectPerson(t, living[i], s));
  frame.label = t >= F.label[0] && t < F.label[1] ? { opacity: hundredth(Math.min(ramp(t, F.label[0], F.label[0] + 120), 1 - ramp(t, F.label[1] - 200, F.label[1]))), scale: hundredth(lerp(0.8, 1, easeOut(ramp(t, F.label[0], F.label[0] + 160)))) } : { opacity: 0, scale: 1 };
  frame.exterior = { opacity: hundredth(Math.min(ramp(t, ...F.exterior.in), 1 - ramp(t, ...F.exterior.out))), drift: hundredth(ramp(t, F.exterior.in[0], F.exterior.out[1])) };
  frame.plaque = hundredth(ramp(t, ...F.plaque));
  frame.announce = t >= F.announce;
  return frame;
}

// ---------- S8: the command plates' states ----------

/**
 * The state each of the Captain's own controls is drawn in, from the Captain's own view alone
 * (full-game-1.8.0): self.captainCommandUses is null for everyone but the current Captain (no
 * controls then); a used allowance is used, whoever was Captain (the office's two allowances are the
 * match's, and a new Captain sees them used); otherwise available exactly while legalTargets offers
 * the command (CAPTAIN_RELEASE / CAPTAIN_EJECT holding the Captain's own seat), sending while the
 * client's own command is in flight (pending: 'release' | 'eject' | null), and unavailable otherwise.
 * The server gives no reason for unavailable in 1.8; the art draws none.
 */
export function captainButtonStates(view, pending = null) {
  const uses = view?.self?.captainCommandUses ?? null;
  if (!uses) return null;
  const offered = name => Boolean(view.legalTargets?.[name]?.includes(view.self.seatId));
  const state = (kind, name, used) => (used ? 'used' : pending === kind ? 'sending' : offered(name) ? 'available' : 'unavailable');
  return { release: state('release', 'CAPTAIN_RELEASE', uses.releaseUsed), eject: state('eject', 'CAPTAIN_EJECT', uses.ejectUsed) };
}

/** The plate art for a control's state (fx/captain.mjs plateSvg()): sending is drawn pressed. */
export const plateFor = state => (state === 'sending' ? 'pressed' : state);

/** S8 as data: each state's treatment, with and without color, and its timing. */
export const CAPTAIN_BUTTONS = Object.freeze({
  id: 'captain-buttons',
  storyboard: 'S8',
  glow: Object.freeze({ periodMs: 2400, maxLuminanceChange: 0.15, reduced: 'static' }),
  press: Object.freeze({ ms: 120, px: 3 }),
  cover: Object.freeze({ frames: Object.freeze(['closed', 'lifting', 'open']), frameMs: 120 }),
});

// ---------- the films as data ----------

/** The films as data for anyone who cannot import the module (contract/films.json). */
export function captainContracts() {
  const R = RELEASE_FILM, E = EJECT_FILM, B = CAPTAIN_BUTTONS;
  const notInputs = ['an actor field (the outcome names none; the Captain at C1 is the public office holder)', 'a role, a side, a faction or a cause', 'a receipt, a private command or another player\'s captainCommandUses', 'a local countdown or the client\'s own observation of time'];
  const interrupted = 'Nonblocking and cancelable: the board, the turn timer and the navigation stay usable; the film stops at once and the board shows the latest snapshot when a newer snapshot moves a subject or places anyone in the Jail, when the Blackout\'s window (S1) owns the board, or when the page is hidden. Never replayed: not on a reconnect, nor for an expired or duplicate event';
  const where = {
    console: 'consoleBox() (fx/captain.mjs): in the top band right of C1\'s press area and name tag, below the band\'s caption line, whole inside the band (over the capsule\'s panel where the board has one: an ordinary turn has nobody seated there), never over a caption or a target; else no inset',
    pulse: 'conduitPoints() (fx/captain.mjs): from the inset\'s foot down the board\'s gutters and spine to the Jail\'s door lamp; it crosses no caption and no press area',
    door: 'jailDoorSvg() over the Jail\'s art at its scene frame (JAIL_DOOR.box): at rest exactly the room\'s door, lamp and keypad',
  };
  return [
    {
      id: R.id, storyboard: R.storyboard, status: 'proposal',
      audience: 'public: every phone and the display, from the CAPTAIN_OUTCOME kind RELEASE event; live only',
      clock: `Milliseconds from the outcome's presentation start; ${R.end} ms (reduced ${releaseEnd(true)} ms), inside the Captain's turn, whose timer keeps running. ${interrupted}.`,
      inputs: ['t (from the outcome\'s presentation start)', 'reduced (the device setting)', 'seatIds: every living prisoner physically in the Jail', 'the snapshot before: each subject\'s Jail slot', 'the snapshot published with it: each subject\'s Room A or Room B slot, and the Captain at C1'],
      notInputs, where,
      words: 'None of the film\'s own: the client\'s announcement of the authoritative outcome (today the hosted board\'s "Player 3, Player 4: released from detention.", #154); announce marks the beat the picture shows it (the door opening). Said once either way',
      beats: [
        { id: 'console', from: 0, to: R.press[0], what: 'The console inset opens on the RELEASE plate; C1 lifts the near hand over the console in the chart table' },
        { id: 'press', from: R.press[0], to: R.press[1], what: 'The press: the button 3 px down (Activated), a green ring round it; C1\'s shoulders dip about 2 px' },
        { id: 'pulse', from: R.pulse[0], to: R.pulse[1], what: 'A green dotted pulse runs from the inset down the board\'s gutters and spine to the Jail\'s door lamp' },
        { id: 'locks', from: R.locks[0], to: R.locks[1], what: 'The keypad and the lamp go green; the lock\'s wheel turns in three steps' },
        { id: 'door', from: R.door[0], to: R.door[1], what: 'The blast door\'s two leaves slide into the wall: the ship\'s corridor behind' },
        { id: 'walk', from: R.walk.start, to: R.close[0], what: `The prisoners, ${R.walk.stagger} ms apart in slot order: each gets up, walks to the door and through it, crosses the board (the reviewed public move, in the prison suit) and lands at the place the snapshot gives it, in the room's clothes, the change hidden in the landing's puff. Their new places show the away marker until they land` },
        { id: 'close', from: R.close[0], to: R.end, what: 'The door shuts; the signals and the wheel go back; C1 goes back to the table; the plate shows USED (the page\'s stamp) and the inset closes' },
      ],
      reduced: { what: 'Four still panels, each faded in over 80 ms: the console with RELEASE pressed; the door open; the prisoners at their new places; the door shut. No travel, ring, turn or pulse', fadeMs: R.reduced.fadeMs, holdMs: R.reduced.holdMs, stages: R.reduced.stages },
      never: 'A Hospital detainee is never touched (it stays in its berth, its detention tag kept), and a body in the Jail stays where it is; no vote, no block. A rejected, pending or unknown command plays nothing',
    },
    {
      id: E.id, storyboard: E.storyboard, status: 'proposal',
      audience: 'public: every phone and the display, from the CAPTAIN_OUTCOME kind EJECT event; live only',
      clock: `Milliseconds from the outcome's presentation start; ${E.end} ms (reduced ${ejectEnd(true)} ms). ${interrupted}.`,
      inputs: ['t (from the outcome\'s presentation start)', 'reduced (the device setting)', 'seatIds: every physical Jail occupant, bodies included', 'the snapshot before: each subject\'s Jail slot, and whether it was a body', 'the snapshot published with it: the subjects off the board (location null), the Captain at C1'],
      notInputs, where: { ...where, hatch: 'AIRLOCK (fx/captain.mjs): in the Jail\'s back wall left of the blast door, inside every phone\'s Jail panel and below its caption band; drawn only while the film plays' },
      words: 'None of the film\'s own: the client\'s announcement (today "Player 3, Player 4, Player 9: ejected.", #154, which lists the bodies too); announce marks the ejection beat. EJECTED, while the hatch is open, is the page\'s caption, as ATTACK BLOCKED\'s is',
      beats: [
        { id: 'command', from: 0, to: E.alert[0], what: 'A short push (at most 6%, the Command Room\'s art only) on C1; the inset on the EJECT plate under its clear cover; the cover lifts in three frames, the press, a hard click drawn as a red comic burst' },
        { id: 'alert', from: E.alert[0], to: E.alert[1], what: `The emergency light pulses over the Command Room's and the Jail's art (${(1000 / E.emergency.periodMs).toFixed(1)} Hz, opacity ${E.emergency.low} to ${E.emergency.high}); a red pulse runs down the gutters` },
        { id: 'lockdown', from: E.lockdown[0], to: E.lockdown[1], what: 'The door locks (the wheel turns back), the keypad stripes red and amber; the airlock hatch appears in the wall, its rim glowing; the prisoners start and get up to brace' },
        { id: 'airlock', from: E.clamps[0][0], to: E.eject.start, what: 'The clamps release in three steps; the iris opens onto space; the suction builds toward the hatch' },
        { id: 'ejection', from: E.eject.start, to: E.exterior.in[0], what: `The living, ${E.eject.stagger} ms apart in slot order, are pulled to the hatch as tumbling silhouettes with a paper rim and gone into it, with papers and a cup; the bodies rise and fade as grey cut-outs; EJECTED. Nothing graphic` },
        { id: 'exterior', from: E.exterior.in[0], to: E.exterior.out[1], what: 'The Jail\'s panel shows the hull from outside, the hatch open, the characters drifting away, small, as silhouettes' },
        { id: 'closure', from: E.irisClose[0], to: E.end, what: 'The iris shuts, the clamps engage, the hatch is gone; the light settles; the Jail is empty. The inset shows EJECT used under its shut cover (the page\'s stamp); the memorial plaque, with the count of characters off the board, appears beside the Jail\'s caption' },
      ],
      reduced: { what: 'Four still panels, each faded in over 80 ms: the console with EJECT pressed, its cover open; the Jail with the hatch open and EJECTED; the empty Jail; the memorial plaque. No suction, travel, push, shake, pulse or flash; the emergency light a still, low tint', fadeMs: E.reduced.fadeMs, holdMs: E.reduced.holdMs, stages: E.reduced.stages },
      settled: 'The Jail empty; the characters off the board are drawn nowhere on it; the plaque beside the Jail\'s caption counts them (the page\'s text). Frontend lists them as grey memorial silhouettes with their seat and name (memorialSvg()); a faction is shown only where the authoritative state reveals it, never by the film',
      never: 'A Hospital detainee is never touched; no module detaches; nothing graphic; no block. A rejected, pending or unknown command plays nothing',
    },
    {
      id: B.id, storyboard: B.storyboard, status: 'proposal',
      audience: 'the current Captain\'s own controls: self.captainCommandUses is non-null only for the current Captain',
      inputs: ['self.captainCommandUses { releaseUsed, ejectUsed }', 'legalTargets.CAPTAIN_RELEASE / CAPTAIN_EJECT (the Captain\'s own seat while offered)', 'the client\'s own command in flight', 'reduced (the device setting)'],
      states: [
        { id: 'available', what: `Lit, its rim solid; a glow cycle of ${B.glow.periodMs} ms, at most ${B.glow.maxLuminanceChange * 100}% luminance change (still under reduced motion)`, withoutColor: 'a solid outline and the label' },
        { id: 'unavailable', what: 'Dull and unlit; the server gives no reason in 1.8, so the client\'s line is neutral (Frontend\'s words)', withoutColor: 'a dashed outline' },
        { id: 'sending', what: `Activated: the button ${B.press.px} px down under an inner shadow (${B.press.ms} ms), then Frontend's "Sending Release…" / "Sending Eject…". EJECT's cover is lifted first (${B.cover.frames.join(', ')}); RELEASE confirms with Frontend's strip`, withoutColor: 'the pressed shape and the words' },
        { id: 'used', what: 'No rim, the button dark, the page\'s USED stamp across the plate; a new Captain sees it used too', withoutColor: 'the stamp' },
      ],
      never: 'A rejected, pending or unknown command never plays S6 or S7, and an invalid or empty command never shows used',
    },
  ];
}
