import type { FullGameState } from './model.js';
import type { GameSeat } from './roster.js';
import { ordinaryReturnDestination, roomHasSpace } from './capacity.js';

const ready = (seat: GameSeat): boolean => seat.health === 'Healthy' && !seat.jailed;
const playerOrder = (a: GameSeat, b: GameSeat): number => Number(a.seatId.slice(5)) - Number(b.seatId.slice(5));

/** Plan the new tuple's whole resolution, then publish placements together.
 * Healed beds are vacated without temporarily occupying an ordinary room.
 * The private working roster counts only occupants already assigned a final place.
 * No transient location or extra state field is exposed or persisted.
 */
export function placeResolvedSeats(state: FullGameState): void {
  for (const seat of state.seats) if (!ready(seat)) seat.captain = false;
  const returns = new Map(state.seats.filter(seat =>
    (ready(seat) && (seat.location === 'Hospital' || seat.location === 'Jail'))
    || (!seat.captain && !seat.jailed && seat.location === 'Command Room'))
    .map(seat => [seat.seatId, { ...seat }]));
  const working = { ...state, seats: state.seats.filter(seat => !returns.has(seat.seatId)).map(seat => ({ ...seat })) };
  // Jail placement precedes attacks in canonical play. Keep that invariant for a
  // restored state without letting an Injured jailed player enter Hospital.
  for (const seat of working.seats.filter(seat => seat.jailed).sort(playerOrder)) {
    if (seat.location !== 'Jail' && !roomHasSpace(working, 'Jail')) throw new Error('Jail capacity invariant violated');
    seat.location = 'Jail';
  }
  const injured = [...working.seats, ...returns.values()].filter(seat => seat.health === 'Injured' && !seat.jailed).sort(playerOrder);
  for (const seat of injured) {
    if (seat.location === 'Hospital') continue; // Existing patients retain their beds.
    if (roomHasSpace(working, 'Hospital')) {
      seat.location = 'Hospital';
      if (returns.delete(seat.seatId)) working.seats.push(seat);
    }
    // An ordinary/Jail waiter keeps their actual place. A Command waiter remains
    // unassigned until ordinary returns, like an Eliminated former Captain.
  }
  for (const seat of [...returns.values()].sort(playerOrder)) {
    seat.location = ordinaryReturnDestination(working, seat);
    working.seats.push(seat);
  }
  const planned = new Map(working.seats.map(seat => [seat.seatId, seat]));
  for (const seat of state.seats) {
    const placement = planned.get(seat.seatId)!;
    seat.location = placement.location;
    seat.lastRoom = placement.lastRoom;
  }
}
