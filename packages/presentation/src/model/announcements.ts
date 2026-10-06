import type { SeatId } from '@mothership/contracts';
import { en } from '../copy/en.js';
import { displaySeconds, FINAL_SECONDS, isCurrent, phaseSummary, resolveScreen, seatNumber } from './common.js';
import { describeAction } from './connected-player.js';
import { resolveShotGate } from './shot.js';
import type {
  ActionFlowState, AudienceFacts, ConnectedPlayerInput, LiveAnnouncement, PlayerShellInput, ShellEnvironment, ShotFlowInput, TableShellInput,
} from './types.js';

type AudienceView = AudienceFacts;

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

function createAnnouncer<Input extends PlayerShellInput | TableShellInput | ConnectedPlayerInput>(selfSeatOf: (input: Input) => SeatId | null): Announcer<Input> {
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

type ShotStep = ShotFlowInput['step'];
const UNSETTLED: readonly ShotStep[] = ['submitting', 'checking', 'unknown'];
const CHOOSING: readonly ShotStep[] = ['targeting', 'confirming'];

function privately(politeness: LiveAnnouncement['politeness'], text: string): LiveAnnouncement {
  return { politeness, text, private: true };
}

function registeredLine(targetSeatId: SeatId | null, pending: boolean): string {
  if (!pending) return targetSeatId === null ? en.shot.wasRegisteredNoTarget : en.shot.wasRegistered(seatNumber(targetSeatId));
  return targetSeatId === null ? en.shot.registeredNoTarget : en.shot.registered(seatNumber(targetSeatId));
}

// What happened to the player's own command. Only steps the player did not bring about
// directly are put into words: a step the player just chose is read from where focus lands.
function describeShot(shot: ShotFlowInput, heard: ShotStep): LiveAnnouncement[] {
  switch (shot.step) {
    case 'submitting': return [privately('polite', en.shot.submitting)];
    case 'checking': return [privately('polite', shot.recovered ? en.shot.checkingAfterReload : en.shot.checking)];
    case 'registered': return [privately('polite', registeredLine(shot.targetSeatId, shot.pending))];
    // The player believes they acted. Being told otherwise should not wait its turn.
    case 'rejected': return [privately('assertive', en.shot.rejected[shot.code])];
    case 'not-registered': return [privately('assertive', en.shot.notRegistered[shot.reason])];
    case 'unknown': return [privately('assertive', en.shot.unknown)];
    case 'idle':
      // The answer came while nobody was looking, and the card has since gone back to
      // following the view. The listener last heard that the command was on its way.
      return UNSETTLED.includes(heard) && shot.registered !== null ? [privately('polite', registeredLine(shot.registered.targetSeatId, true))] : [];
    default: return [];
  }
}

export function createPlayerAnnouncer(): Announcer<PlayerShellInput> {
  const shared = createAnnouncer<PlayerShellInput>(input => input.view?.self.seatId ?? null);
  // The last step of the shot flow the listener was told about, or that needed no telling.
  let heard: ShotStep = 'idle';
  let previousStep: ShotStep = 'idle';
  return {
    next(input) {
      const out = shared.next(input);
      const step = input.shot.step;
      // Nothing private is put into words unless the private panel is open in front of the
      // player. A result that arrives while it is closed is said when it is next opened.
      const open = input.view !== null && input.privacy.revealed && !input.privacy.concealed && resolveScreen(input, true) === 'match';
      if (open && input.view !== null && step !== heard) {
        // A choice taken away by a lost connection or an ended turn, not put down by the
        // player: with the gate still open, going back to the start was the player's own doing.
        if (step === 'idle' && CHOOSING.includes(previousStep) && !resolveShotGate(input, input.view).open) {
          out.push(privately('polite', en.shot.choiceDropped));
        }
        out.push(...describeShot(input.shot, heard));
        heard = step;
      }
      previousStep = step;
      return out;
    },
  };
}

export function createTableAnnouncer(): Announcer<TableShellInput> {
  return createAnnouncer<TableShellInput>(() => null);
}

type ActionStep = ActionFlowState['step'];
const ACTION_CHOOSING: readonly ActionStep[] = ['choosing', 'confirming'];

/**
 * For a phone connected under wire protocol 2. The public lines are the shared ones. What
 * became of the player's own command is said privately, and only steps the player did not
 * bring about directly are put into words: a step just chosen is read from where focus lands.
 */
export function createConnectedPlayerAnnouncer(): Announcer<ConnectedPlayerInput> {
  const shared = createAnnouncer<ConnectedPlayerInput>(input => input.view?.self.seatId ?? null);
  let heard: ActionStep = 'idle';
  let previousStep: ActionStep = 'idle';
  let previousPhaseId: string | null = null;
  return {
    next(input) {
      const out = shared.next(input);
      const { step } = input.action;
      const phaseId = input.view?.phase.id ?? null;
      // Nothing private is put into words unless the private panel is open in front of the
      // player. A result that arrives while it is closed is said when it is next opened.
      const open = input.view !== null && input.privacy.revealed && !input.privacy.concealed && resolveScreen(input, true) === 'match';
      if (open && step !== heard) {
        // Taken away by a lost connection, the clock or a new phase, not put down by the
        // player: on the same phase with fresh, unexpired facts, going back was the player's own doing.
        const takenAway = !isCurrent(input) || input.deadline.kind === 'expired' || phaseId !== previousPhaseId;
        if (step === 'idle' && ACTION_CHOOSING.includes(previousStep) && takenAway) out.push(privately('polite', en.action.choiceDropped));
        const line = describeAction(input.action);
        if (line !== null) out.push(privately(step === 'submitting' || step === 'checking' || step === 'accepted' ? 'polite' : 'assertive', line));
        heard = step;
      }
      previousStep = step;
      previousPhaseId = phaseId;
      return out;
    },
  };
}
