import type { AudienceView, SeatId } from '@mothership/contracts';
import { en } from '../copy/en.js';
import { displaySeconds, FINAL_SECONDS, isCurrent, phaseSummary, resolveScreen, seatNumber } from './common.js';
import type { LiveAnnouncement, PlayerShellInput, ShellEnvironment, TableShellInput } from './types.js';

interface Moment {
  readonly env: ShellEnvironment;
  readonly view: AudienceView | null;
}

/** More simultaneous seat changes than this are summarized instead of read out one by one. */
const MAX_SEAT_ANNOUNCEMENTS = 3;

function polite(text: string): LiveAnnouncement {
  return { politeness: 'polite', text };
}

function sawExpiry(moment: Moment | null, view: AudienceView): boolean {
  return moment?.view?.phase.id === view.phase.id && moment.env.deadline.kind === 'expired';
}

// Where the match stands. Mentions an expired phase unless the listener already heard that.
function summary(previous: Moment | null, next: Moment, view: AudienceView, selfSeatId: SeatId | null): string {
  const base = phaseSummary(view, selfSeatId);
  return next.env.deadline.kind === 'expired' && !sawExpiry(previous, view) ? `${base} ${en.announce.timeUp}` : base;
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

function describe(previous: Moment | null, next: Moment, selfSeatId: SeatId | null): LiveAnnouncement[] {
  const nextScreen = resolveScreen(next.env, next.view !== null);
  const previousScreen = previous ? resolveScreen(previous.env, previous.view !== null) : 'connecting';
  const becameUnreadable = next.env.problem === 'unreadable-update' && previous?.env.problem !== 'unreadable-update';

  if (nextScreen === 'blocked') {
    if (previousScreen === 'blocked' && previous?.env.problem === next.env.problem) return [];
    const heading = next.env.problem === 'integrity' ? en.blocked.integrity.heading : en.blocked.incompatible.heading;
    return [{ politeness: 'assertive', text: `${heading}.` }];
  }
  if (nextScreen === 'connecting' || next.view === null) return becameUnreadable ? [polite(en.announce.unreadable)] : [];

  const view = next.view;
  const current = isCurrent(next.env);
  const wasShown = previous !== null && previousScreen === 'match' && previous.view !== null;
  const wasCurrent = wasShown && isCurrent(previous.env);
  const out: LiveAnnouncement[] = [];

  if (!current) {
    if (becameUnreadable) out.push(polite(en.announce.unreadable));
    else if (wasCurrent) out.push(polite(en.announce.connectionLost));
  } else if (!wasShown) {
    return [polite(en.announce.connected(summary(previous, next, view, selfSeatId)))];
  } else if (!wasCurrent) {
    // Whatever happened while disconnected is obsolete: state the present, do not replay it.
    return [polite(en.announce.reconnected(summary(previous, next, view, selfSeatId)))];
  } else if (previous?.view) {
    if (previous.view.phase.id !== view.phase.id) out.push(polite(summary(previous, next, view, selfSeatId)));
    for (const change of seatChanges(previous.view, view)) out.push(polite(change));
  }

  // The countdown is a trusted fact about the shown phase, so it is voiced even while stale.
  // "unsynced" covers the moment after a return from the background, before time is re-measured.
  const before = previous?.view?.phase.id === view.phase.id ? previous.env.deadline : null;
  const after = next.env.deadline;
  if (before && (before.kind === 'running' || before.kind === 'unsynced')) {
    if (after.kind === 'expired') {
      out.push(polite(en.announce.timeUp));
    } else if (after.kind === 'running' && selfSeatId !== null && view.activeSeatId === selfSeatId) {
      const seconds = displaySeconds(after.remainingMs);
      const wasAbove = before.kind === 'unsynced' || displaySeconds(before.remainingMs) > FINAL_SECONDS;
      // A screen-reader user gets the same warning a sighted player reads off the countdown.
      if (wasAbove && seconds <= FINAL_SECONDS) out.push(polite(en.announce.finalSeconds(seconds)));
    }
  }
  return out;
}

function moment(input: PlayerShellInput | TableShellInput): Moment {
  return { env: input, view: input.view };
}

/** What a screen reader should hear because the player's screen changed from one input to the next. */
export function describePlayerTransition(previous: PlayerShellInput | null, next: PlayerShellInput): LiveAnnouncement[] {
  return describe(previous ? moment(previous) : null, moment(next), next.view?.self.seatId ?? null);
}

export function describeTableTransition(previous: TableShellInput | null, next: TableShellInput): LiveAnnouncement[] {
  return describe(previous ? moment(previous) : null, moment(next), null);
}
