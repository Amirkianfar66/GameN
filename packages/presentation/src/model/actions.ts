import type { FullPlayerView, SeatId } from '@mothership/contracts';
import type { ActionChoice, ActionKind, CompoundActionKind, FactionName, SeatBallotKind, TargetActionKind } from './types.js';

// The actions a connected phone can offer, and where each one's legality is read from.
// Nothing here decides what a player may do: an action is offered only while the player's
// own authoritative view lists it, and with exactly the choices that view lists.

/** Every action the connected phone knows how to offer, in the order it lists them. */
export const ACTION_KINDS: readonly ActionKind[] = [
  'move', 'shot', 'disable', 'protect', 'rescue', 'scan', 'supply', 'hack', 'code', 'showdown-shot', 'vote', 'release-choice', 'release-vote',
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

/** The wire command of each action whose choice has several parts. */
export const COMPOUND_ACTION_COMMANDS = {
  scan: 'SCAN',
  supply: 'SUPPLY',
  code: 'SUBMIT_CODE',
} as const satisfies Record<CompoundActionKind, string>;

/** How many parts each of them has: a seat and a guess; two seats; four seats. */
const PARTS = { scan: 2, supply: 2, code: 4 } as const satisfies Record<CompoundActionKind, number>;

// The factions a Scan may guess, in the order they are listed. Keyed by the contract's own
// type, so a faction added to or taken from the contract fails to compile here.
const FACTION_NAMES = { Blue: true, Red: true, Alien: true } as const satisfies Record<FactionName, true>;
export const FACTIONS = Object.keys(FACTION_NAMES) as readonly FactionName[];

/** How a control carries the answer that names nobody: an abstention, or no release request. */
export const NOBODY = 'none';
const RELEASE_ANSWERS = [['yes', true], ['no', false], [NOBODY, null]] as const;

export function isActionKind(value: unknown): value is ActionKind {
  return typeof value === 'string' && (ACTION_KINDS as readonly string[]).includes(value);
}

export function isCompoundKind(kind: ActionKind): kind is CompoundActionKind {
  return Object.hasOwn(PARTS, kind);
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
 * Everything the view offers this seat right now for an action whose choice is one pick, or
 * null when the view does not open that action at all. A move is always open, with the
 * destinations the view lists. An open ballot always has the answer that names nobody,
 * which the wire contract defines.
 */
export function offeredChoices(view: FullPlayerView, kind: Exclude<ActionKind, CompoundActionKind>): readonly ActionChoice[] | null {
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

/**
 * The seats an action with several parts draws from, or null when the view does not open
 * it. A Scan and a Supply are opened by the server's list of seats. A Code attempt is
 * opened by the view's own flag, and names four of the match's seats: the contract puts no
 * list on it, and the server judges the attempt.
 */
function pool(view: FullPlayerView, kind: CompoundActionKind): readonly SeatId[] | null {
  if (kind === 'code') return view.self.codeAttemptAvailable ? view.seats.map(seat => seat.seatId) : null;
  return view.legalTargets[COMPOUND_ACTION_COMMANDS[kind]] ?? null;
}

const isFaction = (value: string | undefined): value is FactionName => FACTIONS.some(faction => faction === value);

/** The picks so far are distinct seats of the pool, and for a Scan a seat followed by a faction. */
function picksStand(seats: readonly SeatId[], kind: CompoundActionKind, picked: readonly string[]): boolean {
  if (picked.length > PARTS[kind]) return false;
  const named = kind === 'scan' ? picked.slice(0, 1) : picked;
  if (new Set(named).size !== named.length || named.some(value => !seats.some(seatId => seatId === value))) return false;
  return kind !== 'scan' || picked.length < 2 || isFaction(picked[1]);
}

/**
 * Where an action stands for this seat right now. closed: the view does not open it.
 * empty: it is open and no whole choice can be made (nobody to name, or fewer seats than
 * the choice needs). open: a whole choice can be made.
 */
export function openness(view: FullPlayerView, kind: ActionKind): 'closed' | 'empty' | 'open' {
  if (!isCompoundKind(kind)) {
    const offered = offeredChoices(view, kind);
    return offered === null ? 'closed' : offered.length > 0 ? 'open' : 'empty';
  }
  const seats = pool(view, kind);
  if (seats === null) return 'closed';
  return seats.length >= (kind === 'scan' ? 1 : PARTS[kind]) ? 'open' : 'empty';
}

/**
 * What may be picked next for an action, as the names controls carry, given what has been
 * picked so far. Empty when the choice is whole. Null when the view does not open the
 * action, or no longer offers what was picked.
 */
export function nextOptions(view: FullPlayerView, kind: ActionKind, picked: readonly string[] = []): readonly string[] | null {
  if (!isCompoundKind(kind)) {
    const offered = offeredChoices(view, kind);
    if (offered === null || picked.length > 1 || (picked.length === 1 && !offered.some(choice => choiceValue(choice) === picked[0]))) return null;
    return picked.length === 0 ? offered.map(choiceValue) : [];
  }
  const seats = pool(view, kind);
  if (seats === null || !picksStand(seats, kind, picked)) return null;
  if (picked.length === PARTS[kind]) return [];
  if (kind === 'scan' && picked.length === 1) return FACTIONS;
  return seats.filter(seatId => !picked.includes(seatId));
}

/** The choice the picks make once there are enough of them, or null: not whole yet, or not what the view offers. */
export function completeChoice(view: FullPlayerView, kind: ActionKind, picked: readonly string[]): ActionChoice | null {
  if (!isCompoundKind(kind)) {
    return picked.length === 1 ? (offeredChoices(view, kind) ?? []).find(choice => choiceValue(choice) === picked[0]) ?? null : null;
  }
  const seats = pool(view, kind);
  if (seats === null || picked.length !== PARTS[kind] || !picksStand(seats, kind, picked)) return null;
  // The picks are names; the seats they name are taken from the view's own list.
  const [first, second, third, fourth] = picked.map(value => seats.find(seatId => seatId === value));
  if (kind === 'scan') return first !== undefined && isFaction(picked[1]) ? { kind, targetSeatId: first, guess: picked[1] } : null;
  if (first === undefined || second === undefined) return null;
  if (kind === 'supply') return { kind, targetSeatIds: [first, second] };
  return third === undefined || fourth === undefined ? null : { kind, seatIds: [first, second, third, fourth] };
}

/** The view offers exactly this choice right now. */
export function isOffered(view: FullPlayerView, choice: ActionChoice): boolean {
  switch (choice.kind) {
    case 'scan': return completeChoice(view, 'scan', [choice.targetSeatId, choice.guess]) !== null;
    case 'supply': return completeChoice(view, 'supply', choice.targetSeatIds) !== null;
    case 'code': return completeChoice(view, 'code', choice.seatIds) !== null;
    default: return (offeredChoices(view, choice.kind) ?? []).some(candidate => sameChoice(candidate, choice));
  }
}

/**
 * One string for a whole choice. Within one kind of action no two different choices share
 * it; the seats of a Supply or a Code attempt are a set, so their order does not matter.
 * For an action with one pick it is the name its control carries.
 */
export function choiceValue(choice: ActionChoice): string {
  switch (choice.kind) {
    case 'move': return choice.destination;
    case 'release-vote': return RELEASE_ANSWERS.find(([, approve]) => approve === choice.approve)?.[0] ?? NOBODY;
    case 'scan': return `${choice.targetSeatId}/${choice.guess}`;
    case 'supply': return [...choice.targetSeatIds].sort().join('+');
    case 'code': return [...choice.seatIds].sort().join('+');
    default: return choice.targetSeatId ?? NOBODY;
  }
}

export function sameChoice(a: ActionChoice, b: ActionChoice): boolean {
  return a.kind === b.kind && choiceValue(a) === choiceValue(b);
}
