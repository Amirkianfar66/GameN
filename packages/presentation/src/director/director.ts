import type { PlayerPresentationEvent, PlayerView, PublicPresentationEvent, PublicView, SeatId } from '@mothership/contracts';
import type { HealthState, LocationName } from '../model/types.js';

// The event director: decides which authorized presentation events become a cue, and when.
//
// A cue is a moment of emphasis and nothing else. An event authorizes it; what it shows is
// taken from the audience's own views, so a cue never states anything the screen does not.
// It changes nothing: not health, not resources, not whose turn it is, not a deadline.
// Nothing waits for a cue, and a cue is never kept for later.
//
// Delivery is as the integration owner has proposed for wire protocol 1 (the response to
// FE-C04, FE-C10 and FE-C11 in docs/backend/contract-review-response.md on the backend
// branch): events come on a stream of their own, in order, with no promise about whether an
// event or the view it belongs to arrives first. So:
//   - an event is played only when the view it names is the one on screen;
//   - an event the view has already moved past is not played;
//   - when a feed becomes current, whatever its first view already reflects is history;
//   - an event delivered twice is played once, and a registration is one cue however many
//     ways this device hears of it;
//   - only a change this device itself showed is emphasized: the view before did not state
//     the fact and the view on screen does. This is also what makes a first view history:
//     with nothing shown before it, nothing in it is a change.

/**
 * Something a renderer may show for a moment. These kinds are the whole vocabulary: there
 * is no attack, block or cause. A cue carries what is needed to draw it and no identifier.
 */
export type Cue =
  /** The phase on screen changed. */
  | { readonly kind: 'phase-change' }
  /** The phase changed and the round number went up with it. */
  | { readonly kind: 'round-transition'; readonly round: number }
  /** A token is somewhere else. Any path drawn between the two is decoration and implies no route. */
  | { readonly kind: 'public-move'; readonly seatId: SeatId; readonly from: LocationName; readonly to: LocationName }
  /** A public health status changed. No cause is known, so none is shown. */
  | { readonly kind: 'status-change'; readonly seatId: SeatId; readonly health: HealthState }
  /** This seat's own command was registered. Not an outcome. */
  | { readonly kind: 'registration' };

export interface IssuedCue {
  readonly cue: Cue;
  /** private: belongs to this seat alone, and may be shown only inside its open private panel. */
  readonly privacy: 'public' | 'private';
}

export interface Director<View, Event> {
  /** The view on screen, from a feed that is current. Tell it every one, in order; the same view again changes nothing. */
  onView(view: View): IssuedCue[];
  /** One validated event for this audience, in the order its stream delivered it. */
  onEvent(event: Event): IssuedCue[];
  /** The feed is no longer current. Nothing from it is played until a current view says where things stand. */
  suspend(): void;
}

export interface PlayerDirector extends Director<PlayerView, PlayerPresentationEvent> {
  /**
   * This device learned from a receipt, or from its own view, that the server registered
   * the command. The same registration reported again by an event is not a second cue.
   */
  onRegistered(commandId: string): IssuedCue[];
}

type AnyView = PublicView | PlayerView;
type AnyEvent = PublicPresentationEvent | PlayerPresentationEvent;

// Memory bounds, not behavior: a correct feed stays far below them.
const MAX_WAITING = 64;
const MAX_REMEMBERED = 256;

/** Lets go of the oldest entry of a collection that keeps insertion order. */
function dropOldest<Key>(collection: { keys(): IterableIterator<Key>; delete(key: Key): boolean }): void {
  for (const key of collection.keys()) {
    collection.delete(key);
    return;
  }
}

function belongsTo(event: AnyEvent, view: AnyView): boolean {
  if (event.matchId !== view.matchId || event.audience.kind !== view.audience.kind) return false;
  return event.audience.kind !== 'player' || view.audience.kind !== 'player' || event.audience.seatId === view.audience.seatId;
}

const seatIn = (view: AnyView, seatId: SeatId): AnyView['seats'][number] | undefined => view.seats.find(seat => seat.seatId === seatId);
const pendingIn = (view: AnyView, commandId: string): boolean => 'ownPendingCommandIds' in view && view.ownPendingCommandIds.includes(commandId);

function createCore() {
  /** False until a current view arrives, and again from a suspension until the next one. */
  let live = false;
  /**
   * The view cues are judged against, and the one shown before it. A view this director
   * did not see arrive from an earlier one has no past here and is its own "before", so
   * nothing it reflects can count as a change.
   */
  let screen: { readonly shown: AnyView; readonly before: AnyView } | null = null;
  /** Events ahead of the view on screen, or that arrived while the feed was not current. */
  let waiting: AnyEvent[] = [];
  /** Event ids already taken in. */
  const seen = new Set<string>();
  const registered = new Set<string>();

  function registration(commandId: string): IssuedCue[] {
    if (registered.has(commandId)) return [];
    registered.add(commandId);
    if (registered.size > MAX_REMEMBERED) dropOldest(registered);
    return [{ cue: { kind: 'registration' }, privacy: 'private' }];
  }

  function present(event: AnyEvent, view: AnyView, previous: AnyView): IssuedCue[] {
    if (!belongsTo(event, view)) return [];
    const publicly = (cue: Cue): IssuedCue[] => [{ cue, privacy: 'public' }];
    const fact = event.fact;
    switch (fact.type) {
      case 'PHASE_CHANGED':
        if (view.phase.id !== fact.phaseId || previous.phase.id === fact.phaseId) return [];
        return publicly(view.round > previous.round ? { kind: 'round-transition', round: view.round } : { kind: 'phase-change' });
      case 'PUBLIC_MOVE': {
        const [now, then] = [seatIn(view, fact.seatId), seatIn(previous, fact.seatId)];
        if (now === undefined || then === undefined || now.location !== fact.to || then.location === fact.to) return [];
        // Where the token was on this screen, which after a skipped revision need not be
        // where the event says it came from.
        return publicly({ kind: 'public-move', seatId: fact.seatId, from: then.location, to: fact.to });
      }
      case 'PUBLIC_HEALTH_CHANGED': {
        const [now, then] = [seatIn(view, fact.seatId), seatIn(previous, fact.seatId)];
        if (now === undefined || then === undefined || now.health !== fact.health || then.health === fact.health) return [];
        return publicly({ kind: 'status-change', seatId: fact.seatId, health: fact.health });
      }
      case 'COMMAND_REGISTERED':
        // Only a player's own view lists pending commands; a public view never can.
        if (!pendingIn(view, fact.commandId) || pendingIn(previous, fact.commandId)) return [];
        return registration(fact.commandId);
    }
  }

  function hold(event: AnyEvent): void {
    waiting.push(event);
    if (waiting.length > MAX_WAITING) waiting.shift();
  }

  return {
    onView(view: AnyView): IssuedCue[] {
      const previous = live && screen !== null ? screen.shown : null;
      if (previous !== null && view.viewRevision <= previous.viewRevision) return [];
      const before = previous ?? view;
      live = true;
      screen = { shown: view, before };
      const due = waiting.filter(event => event.viewRevision === view.viewRevision);
      waiting = waiting.filter(event => event.viewRevision > view.viewRevision);
      return due.flatMap(event => present(event, view, before));
    },
    onEvent(event: AnyEvent): IssuedCue[] {
      if (seen.has(event.eventId)) return [];
      seen.add(event.eventId);
      if (seen.size > MAX_REMEMBERED) dropOldest(seen);
      // Not current, or ahead of the screen: kept until a view can be put next to it.
      if (!live || screen === null || event.viewRevision > screen.shown.viewRevision) {
        hold(event);
        return [];
      }
      // The screen has moved past it. Its facts are on screen; the moment for it is over.
      if (event.viewRevision < screen.shown.viewRevision) return [];
      return present(event, screen.shown, screen.before);
    },
    suspend(): void {
      live = false;
    },
    onRegistered: registration,
  };
}

/** For the table display. It has no private cue to give. */
export function createPublicDirector(): Director<PublicView, PublicPresentationEvent> {
  const { onView, onEvent, suspend } = createCore();
  return { onView, onEvent, suspend };
}

/** For one seat. */
export function createPlayerDirector(): PlayerDirector {
  return createCore();
}
