// mothership:dev-only
//
// Synthetic facts for reviewing the overflow victim's beat (films/overflow.mjs) on the successor's
// four-berth board (&beds=4). Test-only: nothing here is a rule, a server answer or a production
// authority. The occurrence is Backend's illustrative name on draft #157, unallocated; which player
// overflows, and when, is the server's (H4-ORDER-01), never the board's.
//
// The board: all four beds taken (Vega at H1, Rigel detained at H2, Lyra's body at H3, Atlas at
// H4), and Orion at B2, Healthy, struck by an unblocked attack. Orion would enter the full
// Hospital, so Orion is eliminated and off the board: the snapshot after has Orion Eliminated with
// location and slot null, and nobody else moves.

/** The occurrence, as Backend's preferred event choice A would publish it (illustrative, unallocated). */
export const OVERFLOW_OCCURRENCE = Object.freeze({ type: 'HOSPITAL_OVERFLOW_REMOVED', phaseId: 'review-phase', round: 3, seatId: 5, illustrative: true });

/** The client's words for the review page: a stand-in (the hosted board's words for an elimination, #154) until Frontend writes the occurrence's. */
export const overflowWords = seat => `Player ${seat}: Eliminated.`;

const seat = (n, room, slot, health = 'Healthy', extra = {}) => Object.freeze({ seat: n, character: `c${((n - 1) % 9) + 1}`, room, slot, health, jailed: false, captain: false, ...extra });

/** The board before the occurrence, for a roster of 7, 8 or 9 (seats above the roster left out). */
export function overflowBefore(roster) {
  return [
    seat(1, 'hospital', 'H1', 'Injured'), seat(2, 'hospital', 'H2', 'Injured', { jailed: true }), seat(3, 'hospital', 'H3', 'Eliminated'),
    seat(4, 'hospital', 'H4', 'Injured'), seat(5, 'room-b', 'B2'), seat(6, 'room-b', 'B4'),
    seat(7, 'command-room', 'C1', 'Healthy', { captain: true }), seat(8, 'room-a', 'A1'), seat(9, 'jail', 'J1', 'Healthy', { jailed: true }),
  ].filter(entry => entry.seat <= roster);
}

/** The occurrence with the board before it and the snapshot published with it. */
export function overflowOutcome(roster) {
  const before = overflowBefore(roster);
  const subject = before.find(entry => entry.seat === OVERFLOW_OCCURRENCE.seatId);
  const after = before.map(entry => (entry.seat === subject.seat ? { ...entry, room: null, slot: null, health: 'Eliminated', jailed: false, captain: false } : entry));
  return { occurrence: OVERFLOW_OCCURRENCE, subject, before, after };
}
