// mothership:dev-only
//
// Synthetic Captain outcomes for reviewing the Captain's films (storyboards S6 and S7;
// docs/design/captain-films.md). Test-only: nothing here is a rule, a server answer or a production
// authority. Backend's full-game-1.8.0 publishes a CAPTAIN_OUTCOME { kind, seatIds } with the snapshot
// its command leaves: where each released prisoner goes is the server's (its remembered Room A or B,
// the other room's fallback, competing returns in numeric order), and nothing here works that out. The
// places below are written by hand for this review page and are not to be ported.
//
//   Board 'captain' (round 3): Vega at A1; Rigel Injured at H1; Lyra and Atlas prisoners at J1 and J2;
//   Orion at B2; Nova at B4; Juno the Captain at C1; Mira Injured and detained at H2 (a Hospital
//   detainee: neither command touches her); Echo's body at J5. With seven or eight players the last
//   seats are left out.
//   Board 'crowded': five prisoners, J1 to J5 (Rigel, Lyra, Atlas, Orion, Nova); Vega at A1; Juno the
//   Captain at C1; Mira at B2; Echo Injured at H1.
//
//   release        on 'captain': RELEASE [3, 4]: Lyra to A2, Atlas to B1 (the synthetic answer)
//   eject          on 'captain': EJECT [3, 4, 9]: Lyra and Atlas, and Echo's body, off the board
//   release-full   on 'crowded': RELEASE [2..6]: to A2, A3, B1, B3 and A4
//   eject-full     on 'crowded': EJECT [2..6]

import { slotsOf } from '../scenes/slots.mjs';

export const CAPTAIN_BOARDS = Object.freeze(['captain', 'crowded']);

/** A board's seats for a roster: [{ seat, character, room, slot, health, jailed, captain }], as fixtures.mjs gives them. */
export function captainSeats(board, roster) {
  const seat = (n, room, slot, health = 'Healthy', extra = {}) => ({ seat: n, character: `c${((n - 1) % 9) + 1}`, room, slot, health, jailed: false, captain: false, ...extra });
  const jailed = { jailed: true };
  const list = board === 'captain'
    ? [seat(1, 'room-a', 'A1'), seat(2, 'hospital', 'H1', 'Injured'), seat(3, 'jail', 'J1', 'Healthy', jailed), seat(4, 'jail', 'J2', 'Healthy', jailed),
      seat(5, 'room-b', 'B2'), seat(6, 'room-b', 'B4'), seat(7, 'command-room', 'C1', 'Healthy', { captain: true }), seat(8, 'hospital', 'H2', 'Injured', jailed),
      seat(9, 'jail', 'J5', 'Eliminated', jailed)]
    : board === 'crowded'
      ? [seat(1, 'room-a', 'A1'), seat(2, 'jail', 'J1', 'Healthy', jailed), seat(3, 'jail', 'J2', 'Healthy', jailed), seat(4, 'jail', 'J3', 'Healthy', jailed),
        seat(5, 'jail', 'J4', 'Healthy', jailed), seat(6, 'jail', 'J5', 'Healthy', jailed), seat(7, 'command-room', 'C1', 'Healthy', { captain: true }),
        seat(8, 'room-b', 'B2'), seat(9, 'hospital', 'H1', 'Injured')]
      : null;
  if (!list) throw new Error(`No Captain board ${board}`);
  return list.filter(entry => entry.seat <= roster);
}

const to = (room, slot) => Object.freeze({ room, slot });
export const CAPTAIN_OUTCOMES = Object.freeze({
  release: Object.freeze({ board: 'captain', kind: 'RELEASE', places: Object.freeze({ 3: to('room-a', 'A2'), 4: to('room-b', 'B1') }) }),
  eject: Object.freeze({ board: 'captain', kind: 'EJECT' }),
  'release-full': Object.freeze({ board: 'crowded', kind: 'RELEASE', places: Object.freeze({ 2: to('room-a', 'A2'), 3: to('room-a', 'A3'), 4: to('room-b', 'B1'), 5: to('room-b', 'B3'), 6: to('room-a', 'A4') }) }),
  'eject-full': Object.freeze({ board: 'crowded', kind: 'EJECT' }),
});

/**
 * An outcome for a roster: its kind and seatIds as Backend's executeFullGame() lists them (RELEASE:
 * every living occupant of the Jail; EJECT: every occupant, bodies included; in seat order), the
 * seats before and after (the snapshot published with it), and the film's subjects in slot order:
 * [{ seat, from (its Jail slot), to ({ room, slot } or null: off the board), body }].
 */
export function captainOutcome(name, roster) {
  const outcome = CAPTAIN_OUTCOMES[name];
  if (!outcome) throw new Error(`No Captain outcome ${name}`);
  const before = captainSeats(outcome.board, roster);
  const inJail = before.filter(seat => seat.room === 'jail');
  const listed = inJail.filter(seat => outcome.kind === 'EJECT' || seat.health !== 'Eliminated');
  if (!listed.some(seat => seat.health !== 'Eliminated')) throw new Error(`${name}: nobody living in the Jail`);
  const seatIds = listed.map(seat => seat.seat).sort((a, b) => a - b);
  const after = before.map(seat => {
    if (!seatIds.includes(seat.seat)) return seat;
    if (outcome.kind === 'EJECT') return { ...seat, room: null, slot: null, health: 'Eliminated', jailed: false, captain: false };
    const place = outcome.places[seat.seat];
    if (!place) throw new Error(`${name}: no synthetic place for seat ${seat.seat}`);
    return { ...seat, ...place, jailed: false };
  });
  const order = slotsOf('jail', roster).map(slot => slot.id);
  const subjects = listed
    .map(seat => ({ seat: seat.seat, from: seat.slot, to: outcome.kind === 'EJECT' ? null : outcome.places[seat.seat], body: seat.health === 'Eliminated' }))
    .sort((a, b) => order.indexOf(a.from) - order.indexOf(b.from));
  return { name, board: outcome.board, kind: outcome.kind, seatIds, before, after, subjects };
}
