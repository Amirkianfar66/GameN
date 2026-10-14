import type { FullGameState } from './model.js';
import type { GameSeat } from './roster.js';

type Location = GameSeat['location'];

/** Logical server positions only. Callers select the exact versioned behavior. */
export function slotIdsFor(location: Location, playerCount: FullGameState['playerCount']): string[] {
  if (![7, 8, 9].includes(playerCount)) throw new Error('Invalid board roster size');
  let prefix: string;
  let count: number;
  switch (location) {
    case 'Room A': prefix = 'A'; count = 5; break;
    case 'Room B': prefix = 'B'; count = 5; break;
    case 'Jail': prefix = 'J'; count = 5; break;
    case 'Command Room': prefix = 'C'; count = 1; break;
    case 'Hospital': prefix = 'H'; count = playerCount; break;
    default: throw new Error('Invalid board location');
  }
  return Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`);
}

const playerNumber = (seat: GameSeat): number => Number(seat.seatId.slice(5));

function collectSlots(state: FullGameState, complete: boolean, allowMissing: boolean): Set<string> {
  // Working resolution rosters may be subsets, but never contain aliases,
  // duplicate players or players outside the recorded starting roster.
  slotIdsFor('Hospital', state.playerCount);
  if (!Array.isArray(state.seats) || state.seats.length > state.playerCount
    || (complete && state.seats.length !== state.playerCount)) throw new Error('Invalid board roster');
  const ids = new Set<string>(), occupied = new Set<string>(), counts = new Map<Location, number>();
  for (const seat of state.seats) {
    if (!/^seat-[1-9]$/.test(seat.seatId) || playerNumber(seat) > state.playerCount || ids.has(seat.seatId)) {
      throw new Error('Invalid board roster');
    }
    ids.add(seat.seatId);
    const available = slotIdsFor(seat.location, state.playerCount);
    const count = (counts.get(seat.location) ?? 0) + 1;
    if (count > available.length) throw new Error('Board room capacity exceeded');
    counts.set(seat.location, count);
    if (seat.slotId === undefined) {
      if (!allowMissing) throw new Error('Missing board slot');
    } else {
      if (typeof seat.slotId !== 'string' || !available.includes(seat.slotId) || occupied.has(seat.slotId)) {
        throw new Error('Invalid or duplicate board slot');
      }
      occupied.add(seat.slotId);
    }
  }
  return occupied;
}

function assertPhysicalState(state: FullGameState): void {
  for (const seat of state.seats) {
    if (!['Healthy', 'Injured', 'Eliminated'].includes(seat.health)
      || typeof seat.jailed !== 'boolean' || typeof seat.captain !== 'boolean') throw new Error('Invalid board status');
    if (seat.health === 'Injured' && seat.location !== 'Hospital') throw new Error('Injured player outside Hospital');
    if (seat.location === 'Command Room' && (seat.health !== 'Healthy' || seat.jailed || !seat.captain)) {
      throw new Error('Command requires a Healthy free Captain');
    }
  }
  const jailObligations = state.seats.filter(seat => seat.location === 'Jail'
    || (seat.location === 'Hospital' && seat.health === 'Injured' && seat.jailed)).length;
  if (jailObligations > 5) throw new Error('Jail detention capacity exceeded');
}

/** Fill missing entrants in player-number order; keep compatible slots and holes.
 * Partial working rosters are allowed. Plan first so failures never partly assign.
 */
export function assignMissingBoardSlots(state: FullGameState): void {
  const occupied = collectSlots(state, false, true);
  const assignments: Array<{ seat: GameSeat; slotId: string }> = [];
  for (const seat of [...state.seats].sort((a, b) => playerNumber(a) - playerNumber(b))) {
    if (seat.slotId !== undefined) continue;
    const slotId = slotIdsFor(seat.location, state.playerCount).find(id => !occupied.has(id));
    if (slotId === undefined) throw new Error('No free board slot');
    occupied.add(slotId);
    assignments.push({ seat, slotId });
  }
  for (const { seat, slotId } of assignments) seat.slotId = slotId;
}

/** Initialize a complete valid board without repacking previously assigned seats. */
export function initializeBoardSlots(state: FullGameState): void {
  collectSlots(state, true, true);
  assertPhysicalState(state);
  assignMissingBoardSlots(state);
}

/** Immediate transfer. Resources, remembered rooms and role logic belong to callers.
 * Status may already have changed before departure (for example Captain loss).
 */
export function moveBoardSeat(state: FullGameState, seat: GameSeat, destination: Location): void {
  if (!state.seats.includes(seat)) throw new Error('Board transfer requires the current seat object');
  const occupied = collectSlots(state, true, false);
  const candidates = slotIdsFor(destination, state.playerCount);
  if (destination === 'Command Room' && (seat.health !== 'Healthy' || seat.jailed || !seat.captain)) {
    throw new Error('Command requires a Healthy free Captain');
  }
  if (seat.health === 'Injured' && destination !== 'Hospital') throw new Error('Injured player outside Hospital');
  if (seat.location === destination) return;
  const slotId = candidates.find(id => !occupied.has(id));
  if (slotId === undefined) throw new Error('No free board slot');
  seat.location = destination;
  seat.slotId = slotId;
}

/** Persist/project only complete, compatible rosters. Medical episodes are separate. */
export function assertBoardSlots(state: FullGameState): void {
  collectSlots(state, true, false);
  assertPhysicalState(state);
}
