// mothership:dev-only
//
// Synthetic board states for reviewing the board-v2 proposal: who is at which slot, in which
// health. Test-only: no fixture is a rule, a server answer or a production authority. Seats are
// numbered 1 to the roster and drawn as the nine crew characters in order (seat n is cn).
//
//   ward     every seat Injured in the Hospital: every berth taken
//   mixed    a match in its third round: a Captain, people in A, B and the Jail, two patients,
//            one of them detained (still Jailed), and one patient who died in the ward
//   stress   every slot of every room taken (characters repeat): layout only, never a match
//   empty    nobody: the slots and their markers alone

import { BOARD_ROOMS, slotsOf } from '../scenes/slots.mjs';

export const FIXTURES = Object.freeze(['ward', 'mixed', 'stress', 'empty']);

/** A fixture's occupants for a roster: [{ seat, character, slot, room, health, jailed, captain }]. */
export function fixtureSeats(name, roster) {
  if (!FIXTURES.includes(name)) throw new Error(`No fixture ${name}`);
  const seat = (n, room, slot, health = 'Healthy', extra = {}) => ({ seat: n, character: `c${((n - 1) % 9) + 1}`, room, slot, health, jailed: false, captain: false, ...extra });
  if (name === 'empty') return [];
  if (name === 'ward') return slotsOf('hospital', roster).map((slot, index) => seat(index + 1, 'hospital', slot.id, 'Injured'));
  if (name === 'stress') {
    let n = 0;
    return BOARD_ROOMS.flatMap(room => slotsOf(room, roster).map(slot => {
      n += 1;
      return seat(n, room, slot.id, room === 'hospital' ? 'Injured' : 'Healthy', { jailed: room === 'jail', captain: room === 'command-room' });
    }));
  }
  // mixed: nine seats at most; with fewer, the last ones are left out.
  return [
    seat(1, 'room-a', 'A1'), seat(2, 'hospital', 'H1', 'Injured'), seat(3, 'room-a', 'A3'),
    seat(4, 'jail', 'J2', 'Healthy', { jailed: true }), seat(5, 'room-b', 'B2'), seat(6, 'room-b', 'B4'),
    seat(7, 'command-room', 'C1', 'Healthy', { captain: true }), seat(8, 'hospital', 'H2', 'Injured', { jailed: true }),
    seat(9, 'hospital', 'H4', 'Eliminated'),
  ].filter(entry => entry.seat <= roster);
}
