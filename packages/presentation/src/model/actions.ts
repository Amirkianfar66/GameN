import type { FullPlayerView, SeatId } from '@mothership/contracts';
import type { ActionChoice, ActionKind, SeatBallotKind, TargetActionKind } from './types.js';

// The actions a connected phone can offer, and where each one's legality is read from.
// Nothing here decides what a player may do: an action is offered only while the player's
// own authoritative view lists it, and with exactly the choices that view lists.

/** Every action the connected phone knows how to offer, in the order it lists them. */
export const ACTION_KINDS: readonly ActionKind[] = [
  'move', 'shot', 'disable', 'protect', 'rescue', 'hack', 'showdown-shot', 'vote', 'release-choice', 'release-vote',
];

/**
 * The wire command each action that names one seat sends. The same name is the key under
 * which the player's view lists the seats the server will accept for it.
 */
export const TARGET_ACTION_COMMANDS = {
  shot: 'REGISTER_SHOT',
  disable: 'DISABLE',
  protect: 'PROTECT',
  rescue: 'RESCUE',
  hack: 'REQUEST_HACK',
  'showdown-shot': 'SHOWDOWN_SHOT',
} as const satisfies Record<TargetActionKind, string>;

/** The wire command of each ballot that names one seat or nobody, and the key its seats are listed under. */
export const SEAT_BALLOT_COMMANDS = {
  vote: 'VOTE',
  'release-choice': 'RELEASE_CHOICE',
} as const satisfies Record<SeatBallotKind, string>;

/** How a control carries the answer that names nobody: an abstention, or no release request. */
export const NOBODY = 'none';
const RELEASE_ANSWERS = [['yes', true], ['no', false], [NOBODY, null]] as const;

export function isActionKind(value: unknown): value is ActionKind {
  return typeof value === 'string' && (ACTION_KINDS as readonly string[]).includes(value);
}

/**
 * The seats the server lists for one action right now, or null when the view does not open
 * that action at all. An empty list is an open action with nobody to choose.
 */
export function offeredTargets(view: FullPlayerView, kind: TargetActionKind): readonly SeatId[] | null {
  // The view states an ordinary shot twice, as a flag and as a list. Both must say it is open.
  if (kind === 'shot' && !view.self.shotAvailable) return null;
  return view.legalTargets[TARGET_ACTION_COMMANDS[kind]] ?? null;
}

/**
 * Everything the view offers this seat for one action right now, or null when the view does
 * not open that action at all. A move is always open, with the destinations the view lists.
 * An open ballot always has the answer that names nobody, which the wire contract defines.
 */
export function offeredChoices(view: FullPlayerView, kind: ActionKind): readonly ActionChoice[] | null {
  switch (kind) {
    case 'move':
      return view.self.movementDestinations.map(destination => ({ kind, destination }));
    case 'vote':
    case 'release-choice': {
      const seats = view.legalTargets[SEAT_BALLOT_COMMANDS[kind]];
      return seats === undefined ? null : [...seats.map(targetSeatId => ({ kind, targetSeatId })), { kind, targetSeatId: null }];
    }
    case 'release-vote':
      return view.self.releaseVoteAvailable ? RELEASE_ANSWERS.map(([, approve]) => ({ kind, approve })) : null;
    default: {
      const seats = offeredTargets(view, kind);
      return seats === null ? null : seats.map(targetSeatId => ({ kind, targetSeatId }));
    }
  }
}

/** The one string a control carries for a choice. Within one kind of action no two choices share it. */
export function choiceValue(choice: ActionChoice): string {
  if (choice.kind === 'move') return choice.destination;
  if (choice.kind === 'release-vote') return RELEASE_ANSWERS.find(([, approve]) => approve === choice.approve)?.[0] ?? NOBODY;
  return choice.targetSeatId ?? NOBODY;
}

export function sameChoice(a: ActionChoice, b: ActionChoice): boolean {
  return a.kind === b.kind && choiceValue(a) === choiceValue(b);
}
