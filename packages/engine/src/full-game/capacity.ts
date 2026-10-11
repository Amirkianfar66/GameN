import type { FullGameplayVersions, FullGameSetup, FullGameState } from './model.js';
import { MAX_ROOM_OCCUPANTS, roomCapacityEnabled } from './model.js';
import type { GameSeat, Room } from './roster.js';

type Location = GameSeat['location'];

/** Eliminated occupants retain their place. Capacity is a rule of the exact new tuple only. */
export function roomHasSpace(state: FullGameState, destination: Location): boolean {
  if (!roomCapacityEnabled(state.versions) || destination === 'Final Zone') return true;
  const maximum = destination === 'Command Room' ? 1 : MAX_ROOM_OCCUPANTS;
  return state.seats.filter(seat => seat.location === destination).length < maximum;
}

export function assertInitialRoomCapacity(setup: Pick<FullGameSetup, 'initialRooms'>, versions: FullGameplayVersions): void {
  if (!roomCapacityEnabled(versions)) return;
  for (const room of ['Room A', 'Room B']) {
    if (Object.values(setup.initialRooms).filter(location => location === room).length > MAX_ROOM_OCCUPANTS) {
      throw new Error('Starting room exceeds the recorded capacity');
    }
  }
}

/** A forced return spends no move and does not overwrite the remembered voluntary room. */
export function ordinaryReturnDestination(state: FullGameState, seat: GameSeat): Room {
  if (seat.location === seat.lastRoom || roomHasSpace(state, seat.lastRoom)) return seat.lastRoom;
  const other = seat.lastRoom === 'Room A' ? 'Room B' : 'Room A';
  if (seat.location !== other && !roomHasSpace(state, other)) throw new Error('No ordinary return place in a valid roster');
  return other;
}
