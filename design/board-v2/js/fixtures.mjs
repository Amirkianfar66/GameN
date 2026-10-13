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

/**
 * The Blackout's synthetic outcomes on the mixed board. `hits` are the slots the round's published
 * batch hit: positions of the window's frozen snapshot, where the impact is drawn. `after` is, per
 * roster, where each hit seat is once the round is resolved, as an authoritative projection would
 * give it: its room, its slot and its health. Every Injured is in the Hospital (G-05; rules-contracts,
 * normal-round schedule step 9), each at the lowest free berth taken in player-number order, written
 * out here by hand: the drawing layer allocates nothing and infers no placement, and Backend's stored
 * slotId decides the berth. Every seat not named stays where it was. A miss and a round with no strike
 * are the same picture by design. `blocks` are not in the published batch: they are the room facts
 * that only the blocked target's room's occupants receive (ATTACK BLOCKED, S4), so a block is a
 * miss on every other screen, and nobody moves. Test-only, like every fixture: no rule decides these here.
 */
const settled = (seat, room, slot, health) => Object.freeze({ seat, room, slot, health });
const perRoster = entries => Object.freeze(Object.fromEntries(Object.entries(entries).map(([roster, list]) => [roster, Object.freeze(list)])));
export const BLACKOUT_OUTCOMES = Object.freeze({
  hit: Object.freeze({
    hits: Object.freeze(['B2']),
    blocks: Object.freeze([]),
    after: perRoster({ 7: [settled(5, 'hospital', 'H2', 'Injured')], 8: [settled(5, 'hospital', 'H3', 'Injured')], 9: [settled(5, 'hospital', 'H3', 'Injured')] }),
  }),
  double: Object.freeze({
    hits: Object.freeze(['B2', 'A3']),
    blocks: Object.freeze([]),
    after: perRoster({
      7: [settled(3, 'hospital', 'H2', 'Injured'), settled(5, 'hospital', 'H3', 'Injured')],
      8: [settled(3, 'hospital', 'H3', 'Injured'), settled(5, 'hospital', 'H4', 'Injured')],
      9: [settled(3, 'hospital', 'H3', 'Injured'), settled(5, 'hospital', 'H5', 'Injured')],
    }),
  }),
  miss: Object.freeze({ hits: Object.freeze([]), blocks: Object.freeze([]), after: perRoster({ 7: [], 8: [], 9: [] }) }),
  none: Object.freeze({ hits: Object.freeze([]), blocks: Object.freeze([]), after: perRoster({ 7: [], 8: [], 9: [] }) }),
  blocked: Object.freeze({ hits: Object.freeze([]), blocks: Object.freeze(['B2']), after: perRoster({ 7: [], 8: [], 9: [] }) }),
});

/** The mixed board once an outcome is resolved: every seat where the outcome's after-state puts it, every other seat unmoved. */
export function settledSeats(outcome, roster) {
  const moved = new Map(outcome.after[roster].map(entry => [entry.seat, entry]));
  return fixtureSeats('mixed', roster).map(seat => (moved.has(seat.seat) ? { ...seat, ...moved.get(seat.seat) } : seat));
}

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
