// mothership:dev-only
//
// The Hospital's medical films (storyboards S9, S5 and S10; docs/design/hospital-films.md): the
// beats as data, and what a berth shows at any moment, worked out from that moment and public,
// authoritative inputs alone.
//
//   S9  the critical state: what an Injured patient's berth shows while the snapshot says so
//       (an unstable monitor, a warning lamp, the rescue round, a detention tag), with a short
//       entry when a patient is admitted. The round comes from the seat's medical facts; no
//       clock here counts anything down.
//   S5  the medical drone and the emergency revival: played for an authorized HEALED outcome.
//       It leaves the Hospital's own ceiling dock, whoever registered the Rescue.
//   S10 the flatline and the life-support shutdown: played for an authorized DEATH outcome,
//       whatever caused it. It never kills anyone: the server's outcome comes first.
//
// The inputs are Backend's (protocol 2, full-game-1.7.0 seats and full-game-1.8.0 outcome
// events; packages/contracts/src/board-medical.ts and captain-outcomes.ts on #146): a seat's
// health, location, slotId, jailed and medical facts; a MEDICAL_OUTCOME's kind, seat and
// presentation anchor (HV1 to HV9); the time since the outcome's presentation start; the
// device's reduced-motion setting. Nothing here reads an attacker, a healer, a role, a side, a
// cause or a receipt, and nothing changes health, place or time: a film only draws.

import { DOCK, DRONE_SCENE, berthKit, hoverAt } from '../fx/medical.mjs';

export const MEDICAL_FILMS_VERSION = 'board-v2-medical-films-0.1.0';

const clamp01 = v => Math.max(0, Math.min(1, v));
const ramp = (t, from, to) => clamp01((t - from) / (to - from));
const easeOut = v => 1 - (1 - v) ** 2;
const easeInOut = v => (v < 0.5 ? 2 * v * v : 1 - (-2 * v + 2) ** 2 / 2);
const lerp = (a, b, v) => a + (b - a) * v;
const hundredth = v => Math.round(v * 100) / 100 || 0;

// ---------- the medical facts a screen reads ----------

/** Backend's rescue indicator values (FullMedicalStatus.rescueOpportunity). */
export const RESCUE_OPPORTUNITIES = Object.freeze(['NEXT_NORMAL_ROUND', 'CURRENT_NORMAL_ROUND', 'NO_ADDITIONAL_ROUND', 'CLOSED']);

/**
 * The rescue tag a berth shows for a patient's medical facts, from the server's values alone:
 * the round its rescue opportunity runs to, and the tone. Null when there is no tag (no episode,
 * or the match is closed).
 *
 *   NEXT_NORMAL_ROUND      "R3", cyan: a later normal round is still to come
 *   CURRENT_NORMAL_ROUND   "R3", amber: the due round is in progress
 *   NO_ADDITIONAL_ROUND    no round, a struck grey cross: a new injury in round 5 or the showdown,
 *                          with no further Rescue round and no deadline (G-07)
 *
 * label is the tag's accessible words. It promises nothing: a rescue opportunity, not a rescue.
 */
export function rescueTag(medical) {
  if (!medical) return null;
  const { rescueOpportunity: opportunity, rescueDueAfterRound: due } = medical;
  if (!RESCUE_OPPORTUNITIES.includes(opportunity)) throw new Error(`No rescue opportunity ${opportunity}`);
  if (opportunity === 'CLOSED') return null;
  if (opportunity === 'NO_ADDITIONAL_ROUND') {
    if (due !== null) throw new Error('NO_ADDITIONAL_ROUND has no due round');
    return { tone: 'none', text: '', label: 'No Rescue round left' };
  }
  if (!Number.isInteger(due)) throw new Error(`${opportunity} needs its due round`);
  return opportunity === 'CURRENT_NORMAL_ROUND'
    ? { tone: 'current', text: `R${due}`, label: `Rescue possible this round, round ${due}` }
    : { tone: 'next', text: `R${due}`, label: `Rescue possible until the end of round ${due}` };
}

/**
 * The berth whose number a presentation anchor carries (HVn names berth Hn's geometry), for the
 * match's starting roster. An anchor is a transient presentation place, never a bed, an occupant or
 * a target (Backend's ClinicalPresentationAnchor); filmBerth() says whether a film can play there.
 */
export function clinicalBerth(anchor, playerCount) {
  const { anchorId, slotCount } = typeof anchor === 'string' ? { anchorId: anchor, slotCount: playerCount } : anchor;
  if (!/^HV[1-9]$/.test(anchorId)) throw new Error(`No clinical anchor ${anchorId}`);
  if (slotCount !== playerCount) throw new Error(`The anchor's slotCount ${slotCount} is not the match's ${playerCount}`);
  const n = Number(anchorId.slice(2));
  if (n > playerCount) throw new Error(`${anchorId} is outside a ${playerCount}-berth ward`);
  return `H${n}`;
}

/**
 * Where a clinical film plays over the snapshot published with its outcome, and whether it can: at
 * the berth its anchor names (clinicalBerth()), unless another seat holds that slot in the snapshot.
 * Anchors are presentation places and the server's placement is exact even where a subject's slot
 * differs from its anchor, so a patient admitted in the same batch can hold that berth: the film
 * would then cover a real target, so it is not drawn, and the outcome's announcement stands alone
 * (Backend's CLINICAL_VIGNETTE rule on #146). seats are the snapshot's ({ seat, slotId }); subject is
 * the outcome's seat. Returns { berth, plays, holder }, holder the seat that holds the berth or null.
 */
export function filmBerth(anchor, playerCount, seats, subject) {
  const berth = clinicalBerth(anchor, playerCount);
  const holder = seats.find(seat => seat.slotId === berth && seat.seat !== subject)?.seat ?? null;
  return { berth, plays: holder === null, holder };
}

/**
 * What a berth shows of its occupant between films, from the seat alone: an Injured patient's
 * monitor and lamp (red while its due round is in progress, amber otherwise), an Eliminated body's
 * equipment off and its bed light down, nothing added for an empty berth. jailed adds the
 * detention tag.
 */
export function berthState(seat) {
  if (!seat || seat.location !== 'Hospital') return { monitor: null, lamp: null, bedLight: 'on', tag: null, detention: false };
  if (seat.health === 'Eliminated') return { monitor: 'off', lamp: 'off', bedLight: 'off', tag: null, detention: false };
  if (seat.health !== 'Injured') throw new Error('Only Injured or Eliminated seats are in the Hospital');
  const tag = rescueTag(seat.medical);
  return { monitor: 'unstable', lamp: tag?.tone === 'current' ? 'red' : 'amber', bedLight: 'on', tag, detention: Boolean(seat.jailed) };
}

// ---------- S9: the critical state ----------

export const CRITICAL = Object.freeze({
  id: 'hospital-critical',
  storyboard: 'S9',
  // The monitor's sweep, the lamp's slow pulse and the breath: decorative loops that count nothing.
  sweepMs: 2400,
  lampMs: 2000,
  lampOpacity: Object.freeze([0.55, 1]),
  breathMs: 4000,
  breathPx: 0.6,
  // On admission: the patient arrives in the berth as the monitor boots, then the lamp and the tag come on.
  entry: Object.freeze({ boot: Object.freeze([0, 240]), tagPop: Object.freeze([240, 360]) }),
  reduced: Object.freeze({ fadeMs: 80 }),
});

/**
 * An Injured patient's berth at loop time t (any clock: the loops encode nothing) and, after an
 * admission, entryT ms since its INJURY outcome (null for a patient already there):
 *   monitor  { kind: boot | unstable, sweep }   lamp { on, opacity }   breath  the figure's art offset in px
 *   tag      { opacity, scale }   figure { opacity }: the patient arriving in the berth on admission
 */
export function criticalFrame(t, { reduced = false, entryT = null } = {}) {
  const C = CRITICAL;
  const entering = entryT !== null && entryT < C.entry.tagPop[1];
  if (reduced) {
    const opacity = entryT === null ? 1 : ramp(entryT, 0, C.reduced.fadeMs);
    return { monitor: { kind: 'unstable', sweep: 1, opacity }, lamp: { on: true, opacity }, breath: 0, tag: { opacity, scale: 1 }, figure: { opacity } };
  }
  if (entering && entryT < C.entry.boot[1]) {
    // The authorized transfer: the patient arrives in the berth as its monitor boots.
    const arrived = hundredth(ramp(entryT, ...C.entry.boot));
    return { monitor: { kind: 'boot', sweep: ramp(entryT, ...C.entry.boot), opacity: 1 }, lamp: { on: false, opacity: 0 }, breath: 0, tag: { opacity: 0, scale: 0.8 }, figure: { opacity: arrived } };
  }
  const tag = entering ? { opacity: ramp(entryT, ...C.entry.tagPop), scale: lerp(0.8, 1, easeOut(ramp(entryT, ...C.entry.tagPop))) } : { opacity: 1, scale: 1 };
  const phase = ((t % C.lampMs) + C.lampMs) % C.lampMs / C.lampMs;
  const lampOpacity = lerp(C.lampOpacity[0], C.lampOpacity[1], 0.5 - 0.5 * Math.cos(2 * Math.PI * phase));
  return {
    monitor: { kind: 'unstable', sweep: (((t % C.sweepMs) + C.sweepMs) % C.sweepMs) / C.sweepMs, opacity: 1 },
    lamp: { on: true, opacity: hundredth(lampOpacity) },
    breath: hundredth(C.breathPx * Math.sin((2 * Math.PI * t) / C.breathMs)),
    tag,
    figure: { opacity: 1 },
  };
}

// ---------- S5: the medical drone and the emergency revival ----------

export const RESCUE = Object.freeze({
  id: 'medical-rescue',
  storyboard: 'S5',
  // Alert: the lamp blinks amber twice (2.5 a second) and the vitals inset opens on the unstable trace.
  alert: Object.freeze([0, 800]),
  blinks: Object.freeze([Object.freeze([0, 200]), Object.freeze([400, 600])]),
  insetPop: Object.freeze([0, 160]),
  // The drone leaves the ceiling dock and comes down over the bed, arms tucked.
  arrive: Object.freeze([800, 1800]),
  hoverBob: Object.freeze({ amplitude: DRONE_SCENE.bob, periodMs: 700 }),
  unfold: Object.freeze([1800, 2200]),
  // The scan line goes down the patient and back, under a faint hologram.
  scan: Object.freeze([2200, 3100]),
  hologram: Object.freeze([2400, 3100]),
  // The probes and the lens charge, then one controlled pulse; the patient reacts.
  charge: Object.freeze([3100, 3500]),
  pulse: Object.freeze([3500, 3700]),
  jolt: Object.freeze({ from: 3500, to: 3900, offset: Object.freeze([0, -2.5]) }),
  // The heartbeat steadies, the lamp calms, the patient sits up: Injured to Healthy.
  stabilize: Object.freeze([3700, 4400]),
  recover: Object.freeze([3900, 4300]),
  // Arms tucked, the drone goes back up to its dock; the inset closes.
  depart: Object.freeze([4700, 5600]),
  insetClose: Object.freeze([4700, 4900]),
  reduced: Object.freeze({ fadeMs: 80, switchAt: 800, holdMs: 1600 }),
});

/** When a film has drawn its last: every node it added is gone by then. */
export const rescueEnd = (reduced = false) => (reduced ? RESCUE.reduced.fadeMs * 2 + RESCUE.reduced.holdMs : RESCUE.depart[1]);

/**
 * The drone's lens in scene units at t, between the dock and its hover point over the berth (at the
 * share of its size it is drawn at there, droneFit()), with the hover's bob; null before it leaves
 * the dock and after it is back.
 */
export function dronePosition(t, berthId, fit = 1) {
  const R = RESCUE;
  const hover = hoverAt(berthKit(berthId), fit);
  if (t < R.arrive[0] || t >= R.depart[1]) return null;
  const at = v => [lerp(DOCK[0], hover[0], v), lerp(DOCK[1], hover[1], v)];
  if (t < R.arrive[1]) return at(easeInOut(ramp(t, ...R.arrive)));
  const departFrom = R.depart[0] + 100;
  if (t >= departFrom) return at(1 - easeInOut(ramp(t, departFrom, R.depart[1])));
  const bob = R.hoverBob.amplitude * Math.sin((2 * Math.PI * (t - R.arrive[1])) / R.hoverBob.periodMs);
  return [hover[0], hundredth(hover[1] + bob)];
}

/**
 * What the rescue draws at t (ms from its presentation start), the same for every Rescue:
 *   inset     the vitals inset: { opacity, scale, kind, sweep }
 *   lamp      'amber' | 'calm' | 'dark' (a blink's off beat), with its opacity
 *   drone     { at (its lens, in scene units, or null), frame, opacity, fit (the share of its size it is drawn at, droneFit()) }
 *   scan      { y (0 at the head to 1 down the body), opacity }   hologram { opacity }
 *   pulse     { frame (0 for none), scale, opacity }
 *   patient   { pose: 'injured' | 'healthy', jolt and offset [dx, dy] in px (its art only, never its press area) }
 *   announce  whether "<name> recovered." is in the live region
 *   done      nothing is drawn, and nothing the film added is on the page
 */
export function rescueFrame(t, berthId, { reduced = false, fit = 1 } = {}) {
  const R = RESCUE;
  const frame = {
    stage: 'before', inset: { opacity: 0, scale: 1, kind: 'unstable', sweep: 0 }, lamp: { state: 'amber', opacity: 1 },
    drone: { at: null, frame: 'folded', opacity: 1, fit }, scan: { y: 0, opacity: 0 }, hologram: { opacity: 0 },
    pulse: { frame: 0, scale: 1, opacity: 0 }, patient: { pose: 'injured', jolt: [0, 0], offset: [0, 0] }, announce: false, done: false,
  };
  if (t < 0) return frame;
  const end = rescueEnd(reduced);
  if (t >= end) return { ...frame, stage: 'done', done: true, lamp: { state: 'calm', opacity: 1 }, patient: { pose: 'healthy', jolt: [0, 0], offset: [0, 0] } };
  if (reduced) {
    // No travel, flash or jolt: the drone still over the bed, the trace and the patient switching once.
    const { fadeMs, switchAt, holdMs } = R.reduced;
    const opacity = Math.min(ramp(t, 0, fadeMs), 1 - ramp(t, fadeMs + holdMs, end));
    const after = t >= switchAt;
    return { ...frame, stage: t < fadeMs ? 'in' : t < fadeMs + holdMs ? 'hold' : 'out', inset: { opacity, scale: 1, kind: after ? 'stable' : 'unstable', sweep: 1 },
      lamp: { state: after ? 'calm' : 'amber', opacity: 1 }, drone: { at: hoverAt(berthKit(berthId), fit), frame: 'open', opacity, fit }, patient: { pose: after ? 'healthy' : 'injured', jolt: [0, 0], offset: [0, 0] }, announce: after };
  }
  frame.stage = t < R.alert[1] ? 'alert' : t < R.arrive[1] ? 'arrive' : t < R.scan[0] ? 'unfold' : t < R.charge[0] ? 'scan' : t < R.pulse[0] ? 'charge' : t < R.pulse[1] ? 'pulse' : t < R.depart[0] ? 'recover' : 'depart';
  // The inset: open on the unstable trace, steady from the pulse on, closed as the drone leaves.
  const steady = t >= R.stabilize[0];
  frame.inset = {
    opacity: t < R.insetClose[0] ? 1 : 1 - ramp(t, ...R.insetClose),
    scale: lerp(0.85, 1, easeOut(ramp(t, ...R.insetPop))),
    kind: steady ? 'stable' : 'unstable',
    sweep: steady ? clamp01((t - R.stabilize[0]) / 1100) : ((t % 1200) / 1200),
  };
  const blinkOn = R.blinks.some(([a, b]) => t >= a && t < b);
  frame.lamp = steady ? { state: 'calm', opacity: 1 } : t < R.alert[1] ? { state: blinkOn ? 'amber' : 'dark', opacity: 1 } : { state: 'amber', opacity: 1 };
  frame.drone = {
    at: dronePosition(t, berthId, fit),
    frame: t >= R.pulse[0] && t < R.pulse[1] ? 'pulse' : t >= R.charge[0] && t < R.pulse[0] ? 'charge' : t >= R.unfold[0] + 200 && t < R.depart[0] ? 'open' : 'folded',
    opacity: 1, fit,
  };
  if (t >= R.scan[0] && t < R.scan[1]) {
    const mid = (R.scan[0] + R.scan[1]) / 2;
    frame.scan = { y: t < mid ? easeInOut(ramp(t, R.scan[0], mid)) : 1 - easeInOut(ramp(t, mid, R.scan[1])), opacity: 1 };
  }
  if (t >= R.hologram[0] && t < R.hologram[1]) frame.hologram = { opacity: Math.min(ramp(t, R.hologram[0], R.hologram[0] + 150), 1 - ramp(t, R.hologram[1] - 150, R.hologram[1])) * 0.85 };
  if (t >= R.pulse[0] && t < R.pulse[1]) {
    const v = ramp(t, ...R.pulse);
    frame.pulse = { frame: v < 0.5 ? 1 : 2, scale: lerp(0.8, 1.2, easeOut(v)), opacity: 1 - v * 0.7 };
  }
  if (t >= R.jolt.from && t < R.jolt.to) {
    const v = ramp(t, R.jolt.from, R.jolt.to);
    const k = v < 0.25 ? easeOut(v / 0.25) : 1 - easeOut((v - 0.25) / 0.75);
    frame.patient.jolt = R.jolt.offset.map(px => hundredth(px * k));
  }
  frame.patient.offset = frame.patient.jolt;
  frame.patient.pose = t >= (R.recover[0] + R.recover[1]) / 2 ? 'healthy' : 'injured';
  frame.announce = t >= R.stabilize[0];
  return frame;
}

// ---------- S10: the flatline and the life-support shutdown ----------

export const FLATLINE = Object.freeze({
  id: 'medical-flatline',
  storyboard: 'S10',
  // The heartbeat slows and thins on the inset; the lamp pulses red, slowly; the patient stills.
  fail: Object.freeze([0, 1600]),
  insetPop: Object.freeze([0, 160]),
  // The trace is flat; the room's light dips, never to darkness.
  flat: Object.freeze([1600, 2400]),
  dim: Object.freeze({ down: Object.freeze([1600, 1900]), up: Object.freeze([3400, 4000]), level: 0.72 }),
  // The equipment powers down: the trace collapses to a dot, the lamp and the bed light go out.
  shutdown: Object.freeze([2400, 3400]),
  dot: Object.freeze([2400, 2900]),
  lampOff: Object.freeze([2400, 2600]),
  bedLight: Object.freeze([2400, 3000]),
  still: 2400,
  insetClose: Object.freeze([3400, 3700]),
  end: 4200,
  reduced: Object.freeze({ fadeMs: 80, switchAt: 800, holdMs: 1600 }),
});

export const flatlineEnd = (reduced = false) => (reduced ? FLATLINE.reduced.fadeMs * 2 + FLATLINE.reduced.holdMs : FLATLINE.end);

/**
 * What the flatline draws at t (ms from its presentation start):
 *   inset     { opacity, scale, kind: slowing | flat | off, sweep, dot }
 *   lamp      { state: red | off, opacity }
 *   room      the Hospital art's brightness (1, dipping to 0.72; never dark, never its press areas)
 *   bedLight  how far the berth's bed light is out (0 to 1)
 *   patient   { pose: 'injured' | 'still', breath (0 to 1: how much of the breathing is left), offset [dx, dy]
 *             in px: the breath on its art, fading as it stills }
 *   announce  whether "<name> was eliminated." is in the live region
 */
export function flatlineFrame(t, { reduced = false } = {}) {
  const F = FLATLINE;
  const frame = {
    stage: 'before', inset: { opacity: 0, scale: 1, kind: 'slowing', sweep: 0, dot: 0 }, lamp: { state: 'red', opacity: 1 },
    room: 1, bedLight: 0, patient: { pose: 'injured', breath: 1, offset: [0, 0] }, announce: false, done: false,
  };
  if (t < 0) return frame;
  const end = flatlineEnd(reduced);
  if (t >= end) return { ...frame, stage: 'done', done: true, lamp: { state: 'off', opacity: 0 }, bedLight: 1, patient: { pose: 'still', breath: 0, offset: [0, 0] } };
  if (reduced) {
    const { fadeMs, switchAt, holdMs } = F.reduced;
    const opacity = Math.min(ramp(t, 0, fadeMs), 1 - ramp(t, fadeMs + holdMs, end));
    const off = t >= switchAt;
    return { ...frame, stage: t < fadeMs ? 'in' : t < fadeMs + holdMs ? 'hold' : 'out', inset: { opacity, scale: 1, kind: off ? 'off' : 'flat', sweep: 1, dot: off ? 0.6 : 0 },
      lamp: { state: off ? 'off' : 'red', opacity: off ? 0 : 1 }, bedLight: off ? 1 : 0, patient: { pose: 'still', breath: 0, offset: [0, 0] }, announce: true };
  }
  frame.stage = t < F.flat[0] ? 'fail' : t < F.shutdown[0] ? 'flat' : t < F.shutdown[1] ? 'shutdown' : 'settle';
  const kind = t < F.flat[0] ? 'slowing' : t < F.shutdown[0] ? 'flat' : 'off';
  frame.inset = {
    opacity: t < F.insetClose[0] ? 1 : 1 - ramp(t, ...F.insetClose),
    scale: lerp(0.85, 1, easeOut(ramp(t, ...F.insetPop))),
    kind,
    sweep: kind === 'slowing' ? ramp(t, ...F.fail) : kind === 'flat' ? ramp(t, F.flat[0], F.flat[0] + 500) : 1,
    dot: kind === 'off' ? 1 - ramp(t, ...F.dot) : 0,
  };
  // A slow red pulse while the heart fails (one a second), steady at the flatline, then out.
  frame.lamp = t < F.flat[0]
    ? { state: 'red', opacity: hundredth(0.6 + 0.4 * (0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 1000))) }
    : t < F.lampOff[0] ? { state: 'red', opacity: 1 } : { state: 'off', opacity: hundredth(1 - ramp(t, ...F.lampOff)) };
  const dimIn = ramp(t, ...F.dim.down), dimOut = ramp(t, ...F.dim.up);
  frame.room = hundredth(1 - (1 - F.dim.level) * (dimIn - dimOut));
  frame.bedLight = hundredth(ramp(t, ...F.bedLight));
  // The patient stills: the critical state's breath, fading to nothing by the flatline.
  const breath = hundredth(1 - ramp(t, ...F.fail));
  frame.patient = { pose: t >= F.still ? 'still' : 'injured', breath, offset: [0, hundredth(CRITICAL.breathPx * breath * Math.sin((2 * Math.PI * t) / CRITICAL.breathMs))] };
  frame.announce = t >= F.flat[0];
  return frame;
}

// ---------- the films as data ----------

/** The films as data for anyone who cannot import the module (contract/films.json). */
export function medicalContracts() {
  const R = RESCUE, F = FLATLINE, C = CRITICAL;
  const inputsCommon = ['t (from the outcome\'s presentation start)', 'reduced (the device setting)', 'the berth: the outcome\'s presentationAnchor (HVn names berth Hn) and the snapshot\'s slots (filmBerth())', 'the subject\'s public character, clothes and detention, from the snapshot'];
  const notInputs = ['an attacker, a healer or whoever registered a Rescue', 'a role, a side or a hidden cause', 'a receipt or a private command', 'a local countdown or the client\'s own observation of time'];
  const where = {
    berth: 'filmBerth(): the berth the anchor names, unless another seat holds that slot in the published snapshot (a patient admitted in the same batch can take the berth the subject left); then no film is drawn and the outcome\'s announcement stands alone, as Backend\'s CLINICAL_VIGNETTE rule asks',
    subject: 'At its own berth the snapshot\'s figure is hidden while the film draws it there; anywhere else the snapshot\'s figure is marked away (grey) and its name tag is carried to the berth for the film, so it is never drawn in two places',
    inset: 'insetBox() (fx/medical.mjs): above the berth\'s press area, else below its name tag, else in the band beside the caption; never over the caption, the berth\'s own press area or a press area another seat holds; else no inset, and the berth\'s monitor shows the trace alone',
    drone: 'droneFit() (fx/medical.mjs): drawn smaller, to half its size at least, where the caption or another seat\'s press area is above the berth, so that it covers neither; its probes stay on the chest',
    several: 'Several clinical outcomes in one batch play at once, each at its own berth; each inset keeps clear of the insets placed before it (keepClear), in the batch\'s event order',
  };
  const words = 'None of the film\'s own: the client\'s announcement of the authoritative outcome (today the hosted board\'s "Player 2: Healed." or "Player 2: Eliminated.", #154). announce marks the beat at which the picture shows the change, for a client that times its words to the film as it does ATTACK BLOCKED\'s; said once either way';
  const interrupted = 'Nonblocking and cancelable: the board, the timer and the navigation stay usable; the film stops at once and draws nothing more when a newer snapshot moves its subject or another seat into its berth, or when the Blackout\'s window (S1) owns the board, which then shows the latest snapshot';
  return [
    {
      id: C.id, storyboard: C.storyboard, status: 'proposal',
      audience: 'public: every phone and the display, from the public snapshot',
      clock: 'Loops on any clock, encoding nothing. The entry is milliseconds from the INJURY outcome, live only; it plays at the seat\'s own berth (its slotId).',
      inputs: ['the seat: location Hospital, health Injured, jailed, slotId', 'medical: { admittedRound, rescueDueAfterRound, rescueOpportunity } (full-game-1.7.0)', 'reduced (the device setting)'],
      notInputs,
      shows: 'The berth\'s monitor (unstable trace), its lamp (red while the due round is in progress, else amber, a slow pulse), the rescue tag on its plate ("R3" from rescueDueAfterRound; a struck cross for NO_ADDITIONAL_ROUND; none when CLOSED) and, for a detained patient, the neutral detention tag beside it. The patient keeps the gown and the injured pose; a faint breath on the figure\'s art only. The round is the server\'s; nothing counts down',
      tags: 'tagBox() (fx/medical.mjs): on the berth\'s plate, whole in the panel, never in the caption\'s band (the upper berths\' tags go just below it) and never over a name tag (just below the one it would meet)',
      entry: { boot: C.entry.boot, tagPop: C.entry.tagPop, what: 'The authorized transfer: the patient arrives in the berth (fades in) as the monitor boots, then the lamp comes on and the tag pops in, at the seat\'s own berth' },
      loops: { sweepMs: C.sweepMs, lampMs: C.lampMs, breathMs: C.breathMs, breathPx: C.breathPx },
      reduced: 'Static: the trace, the lamp and the tag, faded in over 80 ms on admission; no breath, no pulse',
      body: 'An Eliminated patient\'s monitor and lamp are off and its bed light down; nothing is added for an empty berth',
    },
    {
      id: R.id, storyboard: R.storyboard, status: 'proposal',
      audience: 'public: every phone and the display, from the MEDICAL_OUTCOME kind HEALED event (alone, or after INJURY in the same batch); live only, never on a reconnect or for an expired event',
      clock: `Milliseconds from the outcome's presentation start; ${R.depart[1]} ms (reduced ${rescueEnd(true)} ms). ${interrupted}.`,
      inputs: inputsCommon, notInputs, where, words,
      beats: [
        { id: 'alert', from: R.alert[0], to: R.alert[1], what: 'The berth\'s lamp blinks amber twice; the vitals inset opens on the unstable trace' },
        { id: 'arrive', from: R.arrive[0], to: R.arrive[1], what: 'The drone leaves the Hospital\'s ceiling dock and comes down over the bed, arms tucked, hovering' },
        { id: 'unfold', from: R.unfold[0], to: R.unfold[1], what: 'Its three arms unfold over the bed' },
        { id: 'scan', from: R.scan[0], to: R.scan[1], what: 'A scan line goes down the patient and back under a faint diagnostic hologram' },
        { id: 'charge', from: R.charge[0], to: R.charge[1], what: 'The probes and the lens charge' },
        { id: 'pulse', from: R.pulse[0], to: R.pulse[1], what: 'One controlled revival pulse at the chest; the patient reacts (2.5 px, its art only)' },
        { id: 'recover', from: R.stabilize[0], to: R.depart[0], what: 'The trace steadies, the lamp calms, the patient sits up: Injured to Healthy, in the gown, the detention tag kept' },
        { id: 'depart', from: R.depart[0], to: R.depart[1], what: 'Arms tucked, the drone goes back up to its dock; the inset closes. The board then shows the snapshot: the patient in their room, or in the Jail if detained' },
      ],
      reduced: { what: 'No travel, flash or jolt: the drone still over the bed and the inset fade in over 80 ms; at 800 ms the trace steadies, the lamp calms and the patient sits up; out over 80 ms', fadeMs: R.reduced.fadeMs, holdMs: R.reduced.holdMs, switchAt: R.reduced.switchAt },
      origin: 'The Hospital\'s ceiling dock, whoever registered the Rescue: it never comes from anyone\'s room or points to anyone',
      never: 'An Eliminated patient is never revived: the film plays only for a HEALED outcome of an Injured patient',
    },
    {
      id: F.id, storyboard: F.storyboard, status: 'proposal',
      audience: 'public: every phone and the display, from the MEDICAL_OUTCOME kind DEATH event; live only',
      clock: `Milliseconds from the outcome's presentation start; ${F.end} ms (reduced ${flatlineEnd(true)} ms). It plays after the authorized outcome and never causes it. ${interrupted}.`,
      inputs: inputsCommon, notInputs, where: { berth: where.berth, subject: where.subject, inset: where.inset, several: where.several }, words,
      beats: [
        { id: 'fail', from: F.fail[0], to: F.fail[1], what: 'The inset opens: the heartbeat slows and thins; the lamp pulses red once a second; the patient\'s breath fades until it lies still' },
        { id: 'flat', from: F.flat[0], to: F.flat[1], what: `The trace goes flat; the lamp holds red; the Hospital's light dips to ${F.dim.level} of its brightness, never dark` },
        { id: 'shutdown', from: F.shutdown[0], to: F.shutdown[1], what: 'The equipment powers down: the trace collapses to a dot, the lamp and the bed light go out; the patient lies still (Eliminated)' },
        { id: 'settle', from: F.shutdown[1], to: F.end, what: 'The room\'s light returns; the inset closes. The body stays where the snapshot has it, its equipment off' },
      ],
      reduced: { what: 'No dip or pulse: the inset with the flat trace and the patient still fade in over 80 ms; at 800 ms the screen and the lamp go off; out over 80 ms', fadeMs: F.reduced.fadeMs, holdMs: F.reduced.holdMs, switchAt: F.reduced.switchAt },
      never: 'No local countdown, timer or animation kills a patient or shortens a rescue opportunity: the server\'s deadline does, and its DEATH outcome comes first; a death\'s cause is never shown',
    },
  ];
}
