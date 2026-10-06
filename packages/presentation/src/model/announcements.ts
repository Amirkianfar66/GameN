import type { AudienceView, SeatId } from '@mothership/contracts';
import { en } from '../copy/en.js';
import { displaySeconds, FINAL_SECONDS, isCurrent, phaseSummary, resolveScreen, seatNumber } from './common.js';
import type { LiveAnnouncement, PlayerShellInput, ShellEnvironment, ShotFlowInput, TableShellInput } from './types.js';

interface Moment {
  readonly env: ShellEnvironment;
  readonly view: AudienceView | null;
}

/** What has already been said about the phase on screen, so it is said once. */
interface PhaseMemory {
  readonly phaseId: string | null;
  readonly expirySpoken: boolean;
  readonly lastSecondsSpoken: boolean;
}
const NOTHING_SPOKEN: PhaseMemory = { phaseId: null, expirySpoken: false, lastSecondsSpoken: false };

/** More simultaneous seat changes than this are summarized instead of read out one by one. */
const MAX_SEAT_ANNOUNCEMENTS = 3;

function polite(text: string): LiveAnnouncement {
  return { politeness: 'polite', text };
}

// Only public seat facts are compared. A health change is read out as a status and never
// as an attack: the view carries no cause, so the interface does not suggest one.
function seatChanges(previous: AudienceView, next: AudienceView): string[] {
  const before = new Map(previous.seats.map(seat => [seat.seatId, seat]));
  const changes: string[] = [];
  for (const seat of [...next.seats].sort((a, b) => seatNumber(a.seatId) - seatNumber(b.seatId))) {
    const old = before.get(seat.seatId);
    if (!old) continue;
    const number = seatNumber(seat.seatId);
    if (old.health !== seat.health) changes.push(en.announce.health(number, seat.health));
    if (old.jailed !== seat.jailed) changes.push(seat.jailed ? en.announce.jailed(number) : en.announce.released(number));
    if (old.location !== seat.location) changes.push(en.announce.location(number, seat.location));
    if (old.captain !== seat.captain) changes.push(seat.captain ? en.announce.captain(number) : en.announce.captainEnded(number));
  }
  return changes.length > MAX_SEAT_ANNOUNCEMENTS ? [en.announce.manyChanges] : changes;
}

// What changed about connection, phase and seats between two moments.
function describeChange(previous: Moment | null, next: Moment, view: AudienceView, selfSeatId: SeatId | null): LiveAnnouncement[] {
  const previousScreen = previous ? resolveScreen(previous.env, previous.view !== null) : 'connecting';
  const becameUnreadable = next.env.problem === 'unreadable-update' && previous?.env.problem !== 'unreadable-update';
  const current = isCurrent(next.env);
  const wasShown = previous !== null && previousScreen === 'match' && previous.view !== null;
  const wasCurrent = wasShown && isCurrent(previous.env);
  const summary = phaseSummary(view, selfSeatId);

  if (!current) {
    if (becameUnreadable) return [polite(en.announce.unreadable)];
    return wasCurrent ? [polite(en.announce.connectionLost)] : [];
  }
  if (!wasShown) return [polite(en.announce.connected(summary))];
  if (!wasCurrent) {
    // Whatever happened in the meantime is obsolete: state the present, do not replay it.
    const phrase = previous?.env.connection === 'live' ? en.announce.readableAgain : en.announce.reconnected;
    return [polite(phrase(summary))];
  }
  const out: LiveAnnouncement[] = [];
  if (previous?.view) {
    if (previous.view.phase.id !== view.phase.id) out.push(polite(summary));
    for (const change of seatChanges(previous.view, view)) out.push(polite(change));
  }
  return out;
}

// The countdown is a trusted fact about the phase on screen, so it is voiced even while the
// connection is stale. Each of its two notices is given once per phase, however many times
// the clock is re-measured after a reconnect or a return from the background, and in
// whichever order the view and the time happen to arrive.
function describeCountdown(next: Moment, view: AudienceView, selfSeatId: SeatId | null, memory: PhaseMemory): { out: LiveAnnouncement[]; memory: PhaseMemory } {
  let remembered = memory.phaseId === view.phase.id ? memory : { ...NOTHING_SPOKEN, phaseId: view.phase.id };
  const out: LiveAnnouncement[] = [];
  const deadline = next.env.deadline;
  if (deadline.kind === 'expired' && !remembered.expirySpoken) {
    out.push(polite(en.announce.timeUp));
    // Once time is up there is nothing left to warn about.
    remembered = { ...remembered, expirySpoken: true, lastSecondsSpoken: true };
  } else if (deadline.kind === 'running' && !remembered.lastSecondsSpoken && selfSeatId !== null && view.activeSeatId === selfSeatId) {
    const seconds = displaySeconds(deadline.remainingMs);
    if (seconds <= FINAL_SECONDS) {
      // A screen-reader user gets the same warning a sighted player reads off the countdown.
      out.push(polite(en.announce.finalSeconds(seconds)));
      remembered = { ...remembered, lastSecondsSpoken: true };
    }
  }
  return { out, memory: remembered };
}

function describe(previous: Moment | null, next: Moment, selfSeatId: SeatId | null, memory: PhaseMemory): { out: LiveAnnouncement[]; memory: PhaseMemory } {
  const nextScreen = resolveScreen(next.env, next.view !== null);
  if (nextScreen === 'blocked') {
    const previousScreen = previous ? resolveScreen(previous.env, previous.view !== null) : 'connecting';
    if (previousScreen === 'blocked' && previous?.env.problem === next.env.problem) return { out: [], memory };
    const heading = next.env.problem === 'integrity' ? en.blocked.integrity.heading : en.blocked.incompatible.heading;
    return { out: [{ politeness: 'assertive', text: `${heading}.` }], memory };
  }
  if (nextScreen === 'connecting' || next.view === null) {
    const becameUnreadable = next.env.problem === 'unreadable-update' && previous?.env.problem !== 'unreadable-update';
    return { out: becameUnreadable ? [polite(en.announce.unreadable)] : [], memory };
  }
  const countdown = describeCountdown(next, next.view, selfSeatId, memory);
  return { out: [...describeChange(previous, next, next.view, selfSeatId), ...countdown.out], memory: countdown.memory };
}

/**
 * Decides what a screen reader should hear as a screen moves from one input to the next.
 * It remembers the previous input and what it has already said about the current phase,
 * so feed it every input the screen is drawn from, in order.
 */
export interface Announcer<Input> {
  next(input: Input): LiveAnnouncement[];
}

function createAnnouncer<Input extends PlayerShellInput | TableShellInput>(selfSeatOf: (input: Input) => SeatId | null): Announcer<Input> {
  let previous: Moment | null = null;
  let memory = NOTHING_SPOKEN;
  return {
    next(input) {
      const moment: Moment = { env: input, view: input.view };
      const result = describe(previous, moment, selfSeatOf(input), memory);
      previous = moment;
      memory = result.memory;
      return result.out;
    },
  };
}

// What happened to the player's own command. Only steps the player did not bring about
// directly are put into words: a step the player just chose is read from where focus lands.
function describeShot(shot: ShotFlowInput): LiveAnnouncement[] {
  const say = (politeness: LiveAnnouncement['politeness'], text: string): LiveAnnouncement[] => [{ politeness, text, private: true }];
  switch (shot.step) {
    case 'submitting': return say('polite', en.shot.submitting);
    case 'checking': return say('polite', en.shot.checking);
    case 'registered': return say('polite', en.shot.registered(seatNumber(shot.targetSeatId)));
    // The player believes they acted. Being told otherwise should not wait its turn.
    case 'rejected': return say('assertive', en.shot.rejected[shot.code]);
    case 'not-registered': return say('assertive', en.shot.notRegistered[shot.reason]);
    case 'unknown': return say('assertive', en.shot.unknown);
    default: return [];
  }
}

export function createPlayerAnnouncer(): Announcer<PlayerShellInput> {
  const shared = createAnnouncer<PlayerShellInput>(input => input.view?.self.seatId ?? null);
  // The last step of the shot flow the listener was told about, or that needed no telling.
  let heard: ShotFlowInput['step'] = 'idle';
  return {
    next(input) {
      const out = shared.next(input);
      // Nothing private is put into words unless the private panel is open in front of the
      // player. A result that arrives while it is closed is said when it is next opened.
      const open = input.view !== null && input.privacy.revealed && !input.privacy.concealed && resolveScreen(input, true) === 'match';
      if (open && input.shot.step !== heard) {
        heard = input.shot.step;
        out.push(...describeShot(input.shot));
      }
      return out;
    },
  };
}

export function createTableAnnouncer(): Announcer<TableShellInput> {
  return createAnnouncer<TableShellInput>(() => null);
}
