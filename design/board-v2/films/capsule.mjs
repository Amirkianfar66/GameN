// mothership:dev-only
//
// The private-talk capsule as a film (storyboard S2; docs/design/private-capsule.md): the Hack's
// public pair leaving their places for the capsule in the five-second result stage, sitting there
// for the sixty-second conversation, and going back to their latest places when it ends. Data and
// pure functions: what a screen draws at a moment of a stage from the stage, the milliseconds
// since its authoritative start, which of the two seats the public projection names so far, the
// exchange's public id and the device's reduced-motion setting. Nothing else: not the declared
// side, the claim, a role, who asked, who is speaking or any sound.
//
// The server's deadlines are the only clock. The entrance plays inside the result stage and is over
// before it ends, so it takes nothing from the conversation's minute, which starts at its own
// authoritative start; nothing waits for the film. The exit plays over whatever comes next and
// blocks nothing. Every press area stays where it is throughout: the participants' places keep
// theirs, the capsule has none.
//
// At their places the participants stand, take a step toward the capsule's side and fade out of
// their room, leaving an away marker (their figure, gray and faint, with the capsule's badge and
// their own name tag) at the slot that is still theirs; they come back the same way, each as it
// leaves the capsule. In the capsule they walk from its doorway to their chairs by their paths
// (scenes/capsule.mjs PATHS), never across the table, and back the same way. They walk at the
// approved public move's cadence and wear what the board dresses them in throughout.

import { EASE, blend } from '../../board-motion/figures/motion.mjs';
import { capsuleLoop, LOOP, sittingPose, walkingPose } from '../figures/capsule.mjs';
import { BESIDE, CAPSULE_SEATS, DOOR_FRAMES, DOORWAY, PATHS } from '../scenes/capsule.mjs';

/** The capsule's stages, as the server runs them: the declaration (up to 15 s), the result (5 s) and the conversation (60 s); then its end. */
export const CAPSULE_STAGES = Object.freeze(['idle', 'declare', 'result', 'talk', 'exit']);
const CLOSED = 0;
const OPEN = DOOR_FRAMES - 1;

/** The film's beats, in milliseconds from the stage's authoritative start. */
export const CAPSULE_FILM = Object.freeze({
  id: 'private-capsule',
  storyboard: 'S2',
  server: Object.freeze({ declareMaxMs: 15000, resultMs: 5000, talkMs: 60000 }),
  entrance: Object.freeze({
    highlight: Object.freeze([0, 300]),
    stand: Object.freeze([700, 820]),
    stepOut: Object.freeze([820, 1420]),
    fadeOut: Object.freeze([1120, 1420]),
    ghostIn: Object.freeze([820, 1120]),
    doorOpens: Object.freeze([1250, 1550]),
    enter: Object.freeze({ P1: Object.freeze([1550, 2600]), P2: Object.freeze([2000, 2900]) }),
    fadeIn: 150,
    sit: Object.freeze({ P1: Object.freeze([2600, 2930]), P2: Object.freeze([2900, 3230]) }),
    doorCloses: Object.freeze([3300, 3600]),
    busyAt: 3600,
    settledAt: 3600,
  }),
  exit: Object.freeze({
    doorOpens: Object.freeze([0, 300]),
    stand: Object.freeze([300, 420]),
    leave: Object.freeze({ P1: Object.freeze([420, 1300]), P2: Object.freeze([420, 1120]) }),
    fadeOut: 150,
    doorCloses: Object.freeze([1300, 1600]),
    /** At its place, from the moment it has left the capsule (its leave's end): stepping in, its figure fading in and its away marker out, then settling. */
    stepIn: 600,
    fadeIn: 300,
    settle: 330,
    endAt: 2230,
  }),
  reduced: Object.freeze({
    fadeMs: 80,
    entrance: Object.freeze({ swapAt: 700, doorOpen: Object.freeze([700, 1100]) }),
    exit: Object.freeze({ swapAt: 0, doorOpen: Object.freeze([0, 400]) }),
  }),
  /** The away marker at a participant's slot: its figure in its gesture, desaturated and faint, with the capsule's badge; its name tag as always. */
  away: Object.freeze({ opacity: 0.35, saturation: 0 }),
  /** How far a participant steps toward the capsule's side as it leaves its room, in figure units of its slot's scale. */
  step: 110,
});

/**
 * The walk's cadence, in two-step cycles a millisecond: the approved public move's, 1.5 cycles
 * across its 450 ms accent (design/board-motion/js/director.js; design tokens 0.4.0,
 * motionBeatsMs.pieceMove).
 */
export const CADENCE = 1.5 / 450;

const clamp01 = v => Math.max(0, Math.min(1, v));
const within = (t, [a, b]) => clamp01((t - a) / Math.max(1, b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const lerp2 = (a, b, p) => [lerp(a[0], b[0], p), lerp(a[1], b[1], p)];

function doorWhileOpening(t, [a, b]) {
  if (t < a) return CLOSED;
  if (t >= b) return OPEN;
  return Math.min(OPEN, 1 + Math.floor(((t - a) / (b - a)) * OPEN));
}
function doorWhileClosing(t, [a, b]) {
  if (t < a) return OPEN;
  if (t >= b) return CLOSED;
  return Math.max(CLOSED, OPEN - 1 - Math.floor(((t - a) / (b - a)) * OPEN));
}

/** The settled state of a stage: what a screen joining it (a reconnect, a seat named late) draws instead of any part of the film it missed. */
function settledPerson(stage) {
  if (stage === 'result' || stage === 'talk') return { home: { state: 'away', progress: 1, figure: 0, ghost: 1 }, capsule: { state: 'seated', progress: 1, opacity: 1 } };
  return { home: { state: 'present', progress: 1, figure: 1, ghost: 0 }, capsule: { state: 'empty', progress: 0, opacity: 0 } };
}

/**
 * What a screen draws at `t` ms from the start of `stage` (one of CAPSULE_STAGES):
 *   door       the door's drawn position, 0 closed to DOOR_FRAMES - 1 open
 *   busy       the door-status light lit (the two are inside)
 *   highlight  the pair's outline at their places, 0 to 1 (the declaration and the result's opening)
 *   people     for each seat the projection names (P1 the lower player number, P2 the other),
 *              home: { state: present | standing | stepping | away | returning | settling,
 *                      progress 0..1, figure (its opacity), ghost (the away marker's opacity) }
 *              capsule: { state: empty | entering | sitting | seated | standing | leaving, progress 0..1, opacity }
 * `known` names each seat the public projection has named so far: 'live' (play its film) or
 * 'settled' (named after its part began, or a reconnect: draw its settled state). A seat not named
 * is not drawn at all: never invented while the projection is awaited. With none named, the capsule
 * is drawn as when idle, its door shut and its light off, whatever the stage: neither says who is
 * coming. With every named seat settled, so is the capsule: its door shut and its light as the
 * stage leaves it, nothing of the film played.
 */
export function capsuleFrame(stage, t, { known = { P1: 'live', P2: 'live' }, reduced = false } = {}) {
  const film = CAPSULE_FILM;
  const seats = CAPSULE_SEATS.map(seat => seat.id).filter(id => known[id]);
  const out = { stage, door: CLOSED, busy: false, highlight: 0, people: {} };
  if (!seats.length || stage === 'idle' || !CAPSULE_STAGES.includes(stage)) return out;
  const live = seats.some(id => known[id] === 'live');
  if (stage === 'declare') {
    out.highlight = 1;
    for (const id of seats) out.people[id] = { home: { state: 'present', progress: 1, figure: 1, ghost: 0 }, capsule: { state: 'empty', progress: 0, opacity: 0 } };
    return out;
  }
  if (stage === 'talk' || (stage === 'result' && !live)) {
    out.busy = true;
    for (const id of seats) out.people[id] = settledPerson(stage);
    return out;
  }
  if (stage === 'exit' && !live) {
    for (const id of seats) out.people[id] = settledPerson('exit');
    return out;
  }
  if (stage === 'result') {
    const e = film.entrance;
    if (reduced) {
      const r = film.reduced;
      const swap = within(t, [r.entrance.swapAt, r.entrance.swapAt + r.fadeMs]);
      out.door = t >= r.entrance.doorOpen[0] && t < r.entrance.doorOpen[1] ? OPEN : CLOSED;
      out.busy = t >= r.entrance.doorOpen[1];
      out.highlight = t < r.entrance.swapAt ? 1 : 0;
      for (const id of seats) {
        out.people[id] = known[id] === 'settled' ? settledPerson('result') : {
          home: { state: swap >= 1 ? 'away' : 'present', progress: swap, figure: 1 - swap, ghost: swap },
          capsule: { state: swap > 0 ? 'seated' : 'empty', progress: swap, opacity: swap },
        };
      }
      return out;
    }
    out.door = t < e.doorCloses[0] ? doorWhileOpening(t, e.doorOpens) : doorWhileClosing(t, e.doorCloses);
    out.busy = t >= e.busyAt;
    out.highlight = t < e.stand[1] ? within(t, e.highlight) : 0;
    for (const id of seats) {
      if (known[id] === 'settled') { out.people[id] = settledPerson('result'); continue; }
      const ghost = within(t, e.ghostIn);
      let home;
      if (t < e.stand[0]) home = { state: 'present', progress: 1, figure: 1, ghost: 0 };
      else if (t < e.stand[1]) home = { state: 'standing', progress: within(t, e.stand), figure: 1, ghost };
      else if (t < e.stepOut[1]) home = { state: 'stepping', progress: within(t, e.stepOut), figure: 1 - within(t, e.fadeOut), ghost };
      else home = { state: 'away', progress: 1, figure: 0, ghost: 1 };
      const enter = e.enter[id], sit = e.sit[id];
      let capsule;
      if (t < enter[0]) capsule = { state: 'empty', progress: 0, opacity: 0 };
      else if (t < enter[1]) capsule = { state: 'entering', progress: within(t, enter), opacity: within(t, [enter[0], enter[0] + e.fadeIn]) };
      else if (t < sit[1]) capsule = { state: 'sitting', progress: within(t, sit), opacity: 1 };
      else capsule = { state: 'seated', progress: 1, opacity: 1 };
      out.people[id] = { home, capsule };
    }
    return out;
  }
  // The exit, from the conversation's end: nothing here holds the next stage back.
  const x = film.exit;
  if (reduced) {
    const r = film.reduced;
    const swap = within(t, [r.exit.swapAt, r.exit.swapAt + r.fadeMs]);
    out.door = t >= r.exit.doorOpen[0] && t < r.exit.doorOpen[1] ? OPEN : CLOSED;
    for (const id of seats) {
      out.people[id] = known[id] === 'settled' ? settledPerson('exit') : {
        home: { state: swap >= 1 ? 'present' : 'away', progress: swap, figure: swap, ghost: 1 - swap },
        capsule: { state: swap >= 1 ? 'empty' : 'seated', progress: swap, opacity: 1 - swap },
      };
    }
    return out;
  }
  out.door = t < x.doorCloses[0] ? doorWhileOpening(t, x.doorOpens) : doorWhileClosing(t, x.doorCloses);
  for (const id of seats) {
    if (known[id] === 'settled') { out.people[id] = settledPerson('exit'); continue; }
    const leave = x.leave[id];
    let capsule;
    if (t < x.stand[0]) capsule = { state: 'seated', progress: 1, opacity: 1 };
    else if (t < x.stand[1]) capsule = { state: 'standing', progress: within(t, x.stand), opacity: 1 };
    else if (t < leave[1]) capsule = { state: 'leaving', progress: within(t, leave), opacity: 1 - within(t, [leave[1] - x.fadeOut, leave[1]]) };
    else capsule = { state: 'empty', progress: 0, opacity: 0 };
    // Back at its place from the moment it has left the capsule: never in both at once.
    const back = leave[1];
    const ghost = 1 - within(t, [back, back + x.fadeIn]);
    let home;
    if (t < back) home = { state: 'away', progress: 0, figure: 0, ghost: 1 };
    else if (t < back + x.stepIn) home = { state: 'returning', progress: within(t, [back, back + x.stepIn]), figure: within(t, [back, back + x.fadeIn]), ghost };
    else if (t < back + x.stepIn + x.settle) home = { state: 'settling', progress: within(t, [back + x.stepIn, back + x.stepIn + x.settle]), figure: 1, ghost };
    else home = { state: 'present', progress: 1, figure: 1, ghost: 0 };
    out.people[id] = { home, capsule };
  }
  return out;
}

/** When a stage's film is over and its last frame holds: the result's at its settled moment, the exit's at its end. */
export function capsuleEnd(stage, { reduced = false } = {}) {
  if (stage === 'result') return reduced ? CAPSULE_FILM.reduced.entrance.doorOpen[1] : CAPSULE_FILM.entrance.settledAt;
  if (stage === 'exit') return reduced ? CAPSULE_FILM.reduced.exit.doorOpen[1] : CAPSULE_FILM.exit.endAt;
  return 0;
}

// ---------- where and how a participant is drawn ----------

/**
 * The point at fraction p of a path's length, and whether a participant walking it faces right
 * there (mirror): each leg's way across; a leg straight up or down keeps the facing of the leg
 * before it, or the one after it, or `fallback`.
 */
function along(points, p, fallback) {
  const legs = points.slice(1).map((to, i) => ({ from: points[i], to, length: Math.hypot(to[0] - points[i][0], to[1] - points[i][1]) }));
  const faces = legs.map(leg => (Math.abs(leg.to[0] - leg.from[0]) < 8 ? null : leg.to[0] > leg.from[0]));
  for (let i = 1; i < faces.length; i += 1) if (faces[i] === null) faces[i] = faces[i - 1];
  for (let i = faces.length - 2; i >= 0; i -= 1) if (faces[i] === null) faces[i] = faces[i + 1];
  let left = clamp01(p) * legs.reduce((sum, leg) => sum + leg.length, 0);
  for (const [i, leg] of legs.entries()) {
    if (left <= leg.length || i === legs.length - 1) return { at: lerp2(leg.from, leg.to, leg.length ? Math.min(1, left / leg.length) : 1), mirror: faces[i] ?? fallback };
    left -= leg.length;
  }
  return { at: points.at(-1), mirror: fallback };
}

/** A participant's scale at a depth (its feet's y): the doorway's in the doorway, its seat's at its chair. */
const scaleAt = (seat, y) => lerp(DOORWAY.scale, seat.scale, clamp01((y - DOORWAY.at[1]) / (seat.at[1] - DOORWAY.at[1])));

/** The pose a seated participant holds at `t` ms into the conversation: its schedule's, eased from the one before; its eyes closed through a blink. */
export function seatedPose(seatId, t, status, { exchangeId = '', reduced = false } = {}) {
  if (reduced) return sittingPose('sit', status);
  const { keys, blinks } = capsuleLoop(exchangeId, seatId);
  let index = 0;
  while (index + 1 < keys.length && keys[index + 1].at <= t) index += 1;
  const key = keys[index];
  const from = index > 0 ? keys[index - 1].pose : key.pose;
  const eased = EASE.standard(clamp01((t - key.at) / LOOP.ease));
  let sk = blend(sittingPose(from, status), sittingPose(key.pose, status), eased);
  if (blinks.some(b => t >= b && t < b + LOOP.blink)) sk = { ...sk, view: 'down' };
  return sk;
}

/**
 * A participant in the capsule, in its scene's units: its anchor (where its feet are), its scale,
 * whether it faces right (mirror) and its skeleton, for a capsule part of capsuleFrame(). It walks
 * its path in (PATHS), turns and sits; it stands, turns to its path and walks it backward. talkMs:
 * the milliseconds into the conversation, for the seated variations (0 outside it).
 */
export function capsulePerson(seatId, capsule, status, { exchangeId = '', talkMs = 0, reduced = false } = {}) {
  const seat = CAPSULE_SEATS.find(entry => entry.id === seatId);
  const beside = BESIDE[seatId];
  const path = PATHS[seatId];
  const enter = CAPSULE_FILM.entrance.enter[seatId];
  const leave = CAPSULE_FILM.exit.leave[seatId];
  const p = capsule.progress;
  if (capsule.state === 'entering') {
    const { at, mirror } = along(path, p, seat.mirror);
    return { at, scale: scaleAt(seat, at[1]), mirror, sk: walkingPose(p * (enter[1] - enter[0]) * CADENCE, status) };
  }
  if (capsule.state === 'sitting') {
    const eased = EASE.settle(p);
    const arriving = along(path, 1, seat.mirror).mirror;
    return { at: lerp2(beside, seat.at, eased), scale: seat.scale, mirror: eased < 0.5 ? arriving : seat.mirror, sk: blend(walkingPose((enter[1] - enter[0]) * CADENCE, status), sittingPose('sit', status), eased) };
  }
  if (capsule.state === 'seated') return { at: seat.at, scale: seat.scale, mirror: seat.mirror, sk: seatedPose(seatId, talkMs, status, { exchangeId, reduced }) };
  const out = [...path].reverse();
  const going = along(out, 0, seat.mirror).mirror;
  if (capsule.state === 'standing') {
    const eased = EASE.snap(p);
    return { at: lerp2(seat.at, beside, eased), scale: seat.scale, mirror: eased < 0.5 ? seat.mirror : going, sk: blend(sittingPose('sit', status), walkingPose(0, status), eased) };
  }
  if (capsule.state === 'leaving') {
    const { at, mirror } = along(out, p, seat.mirror);
    return { at, scale: scaleAt(seat, at[1]), mirror, sk: walkingPose(p * (leave[1] - leave[0]) * CADENCE, status) };
  }
  return null;
}

/**
 * A participant at its own place, for a home part of capsuleFrame(): the place's anchor, scale and
 * facing as its slot gives them (slot: slotsOf()'s), its skeleton there (rest: the place's
 * gesture's, as the board draws it), and where it is drawn as it stands, steps out, returns and
 * settles. It steps toward the capsule's side of the board (right) by CAPSULE_FILM.step.
 */
export function homePerson(slot, home, rest, status) {
  const step = CAPSULE_FILM.step * slot.scale;
  const out = [slot.at[0] + step, slot.at[1]];
  const [a, b] = CAPSULE_FILM.entrance.stepOut;
  const back = CAPSULE_FILM.exit.stepIn;
  const p = home.progress;
  if (home.state === 'standing') {
    const eased = EASE.snap(p);
    return { at: slot.at, scale: slot.scale, mirror: eased < 0.5 ? slot.mirror : true, sk: blend(rest, walkingPose(0, status), eased) };
  }
  if (home.state === 'stepping') return { at: lerp2(slot.at, out, p), scale: slot.scale, mirror: true, sk: walkingPose(p * (b - a) * CADENCE, status) };
  if (home.state === 'returning') return { at: lerp2(out, slot.at, p), scale: slot.scale, mirror: false, sk: walkingPose(p * back * CADENCE, status) };
  if (home.state === 'settling') {
    const eased = EASE.settle(p);
    return { at: slot.at, scale: slot.scale, mirror: eased < 0.5 ? false : slot.mirror, sk: blend(walkingPose(back * CADENCE, status), rest, eased) };
  }
  return { at: slot.at, scale: slot.scale, mirror: slot.mirror, sk: rest };
}

/** The film's contract, for contract/films.json and the handoff: its audience, inputs, beats and limits. */
export function capsuleContract() {
  const film = CAPSULE_FILM;
  return {
    id: film.id,
    storyboard: film.storyboard,
    status: 'proposal',
    audience: {
      film: 'public: every phone and the shared display, the same; the pair, their entrance, the conversation scene and their exit are public (G-02; rules-contracts, Audiences and delivery)',
      claim: 'participant-private, not part of this film: the declared side and its card stay in the two participants\' own panel (design/phone-kit/js/hack.js), which the film never covers and never reads',
    },
    clock: 'Milliseconds from the authoritative start of the stage (the result stage, the conversation, the conversation\'s end), from the server\'s deadlines; never a local start time and never an animation\'s end.',
    inputs: ['stage (declare, result, talk, exit, idle)', 't (from the stage\'s authoritative start)', 'the public pair: two seat ids, ordered by player number (P1 the lower)', 'each participant\'s public place, health and detention, from the board (the latest authoritative)', 'the exchange\'s public id (the seated variations\' seed)', 'reduced (the device setting)'],
    notInputs: ['the declared side or the claim', 'which participant asked', 'who is speaking, a microphone or any sound', 'a role, a faction or a defense', 'an animation\'s completion'],
    server: film.server,
    beats: [
      { stage: 'declare', what: 'Both participants outlined at their places in caption yellow, with the capsule\'s badge, once the projection names the pair' },
      { stage: 'result', from: 0, to: 700, what: 'The outline and the badge (in by 300 ms); the private claim card on the participants\' own phones is theirs, beside the board' },
      { stage: 'result', from: 700, to: 1420, what: 'Each stands (120 ms), steps toward the capsule\'s side and fades out of its room; its away marker comes up at its slot, which keeps its press area' },
      { stage: 'result', from: 1250, to: 3600, what: 'The capsule\'s door slides open (1 250 to 1 550 ms). P1 comes in at 1 550 and walks behind the table to its chair (1 050 ms), P2 at 2 000 straight to its own (900 ms); each turns and sits (330 ms). The door slides shut (3 300 to 3 600 ms)' },
      { stage: 'result', at: 3600, what: 'The door-status light lights. Settled, still, until the conversation starts: 1 400 ms to spare inside the stage' },
      { stage: 'talk', from: 0, to: 60000, what: 'Both seated; quiet variations on a schedule seeded by the exchange\'s public id (lean in, sit back, a nod, an open hand, a hand at the chin, a blink), unrelated to speech; the top bar counts the conversation\'s server time down from 1:00' },
      { stage: 'exit', from: 0, to: 1600, what: 'The light goes out and the door opens (300 ms); both stand (300 to 420 ms) and walk their paths back to the doorway, fading in it, P2 gone at 1 120 ms and P1 at 1 300; the door shuts (1 300 to 1 600 ms)' },
      { stage: 'exit', from: 1120, to: 2230, what: 'As each leaves the capsule it steps back in at its latest authoritative place, where the board has it now (600 ms), and settles into its gesture (330 ms); its away marker fades. Nothing waits for this' },
    ],
    reduced: { what: 'No walking, no steps, no variations. Result: the outline and badge; at 700 ms the people fade (80 ms) to their away markers and appear seated in the capsule, its door shown open until 1 100 ms, then shut and the light lit. Exit: the door shown open for 400 ms while the people fade (80 ms) from the capsule back to their places.', fadeMs: film.reduced.fadeMs },
    reconnect: 'Draws the stage\'s settled state at the current server time: in the result stage and the conversation, the pair seated, the door shut and its light lit, the away markers at their places; after it, everyone at their places and the capsule empty. The entrance and the exit are never replayed, and the minute is never restarted.',
    loading: 'Draws only the seats the public projection names: none, one or two. With none, the capsule as when idle (its door shut, its light off) under the stage\'s top bar; with one, that one\'s film alone. A seat named after its part began is drawn settled. Nobody is invented while a projection is awaited.',
    away: film.away,
    paths: { P1: PATHS.P1, P2: PATHS.P2, units: 'scene units of the 512 x 768 capsule (its feet); the way out is the same path backward', cadence: 'the approved public move\'s: 1.5 two-step cycles per 450 ms', scale: 'the doorway\'s (0.9) in the doorway to the seat\'s (1.05) at the chairs, by depth' },
    layers: { capsule: 'its own panel beside the Command Room, exactly half its width (fit.mjs { capsule: true }); back, door, the participants, busy; no slots: its only targets are each seated participant\'s own seat (scenes/capsule.mjs capsuleTargets(), 44 px), as its slot is', home: 'the participant\'s own room, its figure layer: the away marker at its slot; the step out is clipped to the room\'s panel', tags: 'every name tag stays: at the slot, and under each seated participant in the capsule' },
  };
}
