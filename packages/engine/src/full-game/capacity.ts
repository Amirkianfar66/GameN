import type { FullGameplayVersions, FullGameSetup, FullGameState } from './model.js';
import { MAX_ROOM_OCCUPANTS, boardMedicalEnabled, roomCapacityEnabled, resolutionPlacementEnabled, hospitalFourEnabled } from './model.js';
import type { GameSeat, Room } from './roster.js';

type Location = GameSeat['location'];

/** Eliminated occupants retain their place. Capacity is a rule of the exact new tuple only. */
export function roomHasSpace(state: FullGameState, destination: Location): boolean {
  if (!roomCapacityEnabled(state.versions) || destination === 'Final Zone') return true;
  const maximum = destination === 'Command Room' ? 1 : destination === 'Hospital'
    ? hospitalFourEnabled(state.versions) ? 4 : boardMedicalEnabled(state.versions) ? state.playerCount : MAX_ROOM_OCCUPANTS
    : MAX_ROOM_OCCUPANTS;
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

/** Forced returns spend no move. Only the new tuple remembers the actual fallback room. */
export function ordinaryReturnDestination(state: FullGameState, seat: GameSeat): Room {
  let destination = seat.lastRoom;
  if (seat.location !== destination && !roomHasSpace(state, destination)) {
    destination = destination === 'Room A' ? 'Room B' : 'Room A';
    if (seat.location !== destination && !roomHasSpace(state, destination)) throw new Error('No ordinary return place in a valid roster');
  }
  if (resolutionPlacementEnabled(state.versions)) seat.lastRoom = destination;
  return destination;
}
