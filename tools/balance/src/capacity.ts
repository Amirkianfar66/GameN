import { damageBudget } from './codeinfo.js';
import { ROOM_CAPACITY } from './model.js';
import type { Mode } from './model.js';

// Arithmetic that follows from the room-capacity rule (issue #96) and the resource rules. It
// counts what can be reached; it plays nothing and decides no outcome. The audit that uses it is
// docs/balance/capacity-audit.md, and a test holds that document's tables to these values.

const ROOMS = 2;

function binomial(n: number, k: number): number {
  let result = 1;
  for (let index = 1; index <= k; index += 1) result = (result * (n - k + index)) / index;
  return Math.round(result);
}

export interface SplitShare {
  // Players in the fuller room and in the other one.
  split: [number, number];
  probability: number;
}

export interface StartingRoomFacts {
  mode: Mode;
  // Places in Room A and Room B together that nobody holds when every player is in one of them.
  freePlacesAtTheStart: number;
  // An independent, even draw for each player, which was the rule from 8 October: how often it
  // puts six or more players in one room.
  independentDrawOverCapacity: number;
  // Every assignment that the capacity allows, equally likely: the independent draws, drawn again
  // until they are legal.
  uniform: StartingScheme;
  // An even draw for each player, kept in a given order until a room holds five; every later
  // player gets the other room whatever they drew. The service of PR #98 does this in the order
  // in which the host approves players.
  sequential: StartingScheme & {
    // For each place in that order, how often the player's room was settled by those before them,
    // so that their own draw did not count.
    settledBeforeJoining: number[];
  };
  // The most even split the mode allows, in a random order: no draw of sizes at all.
  balanced: StartingScheme;
}

export interface StartingScheme {
  splits: SplitShare[];
  // How often a room holds five when the match starts.
  aRoomStartsFull: number;
  // How often a given player starts in Room A. One half under every scheme here, by symmetry.
  inRoomA: number;
  // How often two given players start in the same room: the lowest and the highest over all pairs.
  togetherLowest: number;
  togetherHighest: number;
}

function schemeFrom(mode: Mode, weightOf: (assignment: boolean[]) => number): StartingScheme {
  // Enumerate every assignment (true = Room A) with its probability under the scheme.
  const splits = new Map<string, number>();
  const together = Array.from({ length: mode }, () => new Array<number>(mode).fill(0));
  let inRoomA = 0;
  let total = 0;
  for (let bits = 0; bits < 2 ** mode; bits += 1) {
    const assignment = Array.from({ length: mode }, (_, index) => ((bits >> index) & 1) === 1);
    const weight = weightOf(assignment);
    if (weight === 0) continue;
    total += weight;
    const inA = assignment.filter(Boolean).length;
    const key = `${Math.max(inA, mode - inA)}/${Math.min(inA, mode - inA)}`;
    splits.set(key, (splits.get(key) ?? 0) + weight);
    if (assignment[0]) inRoomA += weight;
    for (let left = 0; left < mode; left += 1) {
      for (let right = left + 1; right < mode; right += 1) {
        if (assignment[left] === assignment[right]) (together[left] as number[])[right] = ((together[left] as number[])[right] ?? 0) + weight;
      }
    }
  }
  const pairs: number[] = [];
  for (let left = 0; left < mode; left += 1) for (let right = left + 1; right < mode; right += 1) pairs.push(((together[left] as number[])[right] ?? 0) / total);
  const shares = [...splits.entries()].map(([key, weight]) => ({ split: key.split('/').map(Number) as [number, number], probability: weight / total }))
    .sort((left, right) => right.split[0] - left.split[0]);
  return {
    splits: shares,
    aRoomStartsFull: shares.filter(share => share.split[0] === ROOM_CAPACITY).reduce((sum, share) => sum + share.probability, 0),
    inRoomA: inRoomA / total,
    togetherLowest: Math.min(...pairs),
    togetherHighest: Math.max(...pairs),
  };
}

const legal = (mode: Mode, assignment: boolean[]): boolean => {
  const inA = assignment.filter(Boolean).length;
  return inA <= ROOM_CAPACITY && mode - inA <= ROOM_CAPACITY;
};

/**
 * What three ways of drawing starting rooms give, exactly. The owner's decision is "random, but at
 * most five per room, unrelated to role, character, faction and seat"; it names no distribution.
 * None of these is the service's method, which is Backend's to choose and to state.
 */
export function startingRoomFacts(mode: Mode): StartingRoomFacts {
  const all = 2 ** mode;
  let over = 0;
  for (let inA = 0; inA <= mode; inA += 1) if (inA > ROOM_CAPACITY || mode - inA > ROOM_CAPACITY) over += binomial(mode, inA);

  const uniform = schemeFrom(mode, assignment => (legal(mode, assignment) ? 1 : 0));

  // Sequential: follow every sequence of even draws; a draw is ignored where a room is already full.
  const weights = new Map<string, number>();
  const settled = new Array<number>(mode).fill(0);
  for (let bits = 0; bits < all; bits += 1) {
    const assignment: boolean[] = [];
    for (let index = 0; index < mode; index += 1) {
      const inA = assignment.filter(Boolean).length;
      const forced = inA === ROOM_CAPACITY ? false : index - inA === ROOM_CAPACITY ? true : null;
      if (forced !== null) settled[index] = (settled[index] ?? 0) + 1 / all;
      assignment.push(forced ?? ((bits >> index) & 1) === 1);
    }
    const key = assignment.map(inA => (inA ? 'A' : 'B')).join('');
    weights.set(key, (weights.get(key) ?? 0) + 1 / all);
  }
  const sequential = schemeFrom(mode, assignment => weights.get(assignment.map(inA => (inA ? 'A' : 'B')).join('')) ?? 0);

  const larger = Math.ceil(mode / ROOMS);
  const balanced = schemeFrom(mode, assignment => {
    const inA = assignment.filter(Boolean).length;
    return inA === larger || inA === mode - larger ? 1 : 0;
  });

  return {
    mode,
    freePlacesAtTheStart: ROOMS * ROOM_CAPACITY - mode,
    independentDrawOverCapacity: over / all,
    uniform,
    sequential: { ...sequential, settledBeforeJoining: settled },
    balanced,
  };
}

export interface CapacityReach {
  mode: Mode;
  // Damage a match has before the showdown, and how much of it can fall before Round 4 resolves.
  damageBeforeShowdown: number;
  damageBeforeRound4: number;
  // The most players Injured at once, and so the most Hospital is ever asked to hold.
  mostInjuredAtOnce: number;
  // The first round whose resolution can leave more Injured players than Hospital has places; null if none can.
  firstRoundASixthCanBeInjured: number | null;
  // The most players that can ever be waiting for Hospital at once.
  mostWaiting: number;
  // The most players Eliminated before the showdown: each needs two of the damage.
  mostEliminatedBeforeShowdown: number;
  // The most players that can be sent to Jail in a match: one Jail vote a round, five rounds.
  mostJailed: number;
}

/** Where the capacity of Hospital and Jail can bind at all, from the resource and vote rules. */
export function capacityReach(mode: Mode): CapacityReach {
  const budget = damageBudget(mode);
  const damage = budget.attacksBeforeShowdown;
  // Before Round 4 only the Disablers and Officer can deal damage (R-ROLE-17, R-ROLE-11, R-SHOT-03).
  const early = 1 + (mode >= 8 ? 1 : 0) + (mode === 9 ? 1 : 0);
  const waiting = Math.max(0, damage - ROOM_CAPACITY);
  return {
    mode,
    damageBeforeShowdown: damage,
    damageBeforeRound4: early,
    mostInjuredAtOnce: damage,
    // A sixth Injured player needs six damage on six players. Ordinary weapons fire from Round 4.
    firstRoundASixthCanBeInjured: waiting === 0 ? null : 4,
    mostWaiting: waiting,
    mostEliminatedBeforeShowdown: budget.maxEliminationsBeforeShowdown,
    mostJailed: 5,
  };
}
