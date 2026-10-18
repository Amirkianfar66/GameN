// mothership:dev-only
//
// Synthetic medical facts for reviewing the Hospital's films (storyboards S9, S5 and S10;
// docs/design/hospital-films.md) on the mixed board and the full ward. Test-only: nothing here
// is a rule, a server answer or a production authority. Backend's full-game-1.7.0 seats carry
// these facts, and its full-game-1.8.0 MEDICAL_OUTCOME events carry the outcomes and their
// anchors; a client reads them and works none of them out. The two server rules copied below are
// copied for this review page only, so that its synthetic answers look like the server's.

import { fixtureSeats } from './fixtures.mjs';
import { FOUR } from './layout.mjs';

/** The mixed board's Injured patients' admissions: Rigel (seat 2, H1) in round 2, Mira (seat 8, H2, detained) in round 3. */
export const ADMISSIONS = Object.freeze({ 2: 2, 8: 3 });

/**
 * Backend's rescue indicator for an episode admitted in admittedRound, at round in a normal round
 * (packages/contracts/src/board-medical.ts, medicalRescueOpportunity(), on #146), copied for this
 * review page only: a client reads the server's value.
 */
export function serverMedical(admittedRound, round, phaseKind = 'ORDINARY_TURN') {
  const due = admittedRound === 5 ? null : admittedRound + 1;
  const opportunity = phaseKind === 'FINISHED' || phaseKind === 'ABORTED' ? 'CLOSED'
    : phaseKind === 'SHOWDOWN' || due === null ? 'NO_ADDITIONAL_ROUND'
      : due === round ? 'CURRENT_NORMAL_ROUND' : 'NEXT_NORMAL_ROUND';
  return Object.freeze({ admittedRound, rescueDueAfterRound: due, rescueOpportunity: opportunity });
}

const LOCATION = Object.freeze({ 'command-room': 'Command Room', 'room-a': 'Room A', 'room-b': 'Room B', hospital: 'Hospital', jail: 'Jail' });

/**
 * A fixture's seats with the public facts a full-game-1.7.0 view gives each: location, slotId,
 * health, jailed and medical (non-null exactly while Injured). round is the match's round (3 by
 * default); &round=5 makes every Injured patient a new round-5 injury, which has no due round.
 */
export function medicalSeats(seats, { round = 3 } = {}) {
  return seats.map(seat => {
    const admitted = round === 5 ? 5 : ADMISSIONS[seat.seat] ?? round;
    return { ...seat, location: LOCATION[seat.room], slotId: seat.slot, medical: seat.health === 'Injured' ? serverMedical(admitted, round) : null };
  });
}

/**
 * The synthetic outcomes the review page plays, each one subject's MEDICAL_OUTCOME at a round-3
 * checkpoint of the mixed board (or of the full ward, every seat Injured), and where the subject is
 * in the snapshot published with it:
 *
 *   rescue           Rigel (seat 2, Injured at H1) is healed and returns to Room A, A2
 *   rescue-detained  Mira (seat 8, Injured and detained at H2) is healed and returns to the Jail, J1
 *                    (eight and nine players)
 *   vignette         Orion (seat 5, Healthy at B2) is injured and healed in one batch: the snapshot never
 *                    shows Orion in the Hospital, and Orion is back at B2. The film plays at the lowest
 *                    free anchor
 *   death            Rigel dies; the body stays at H1
 *   rescue-taken     Rigel is healed and returns to A2, and in the same batch Lyra (seat 3, at A3) is
 *                    injured and placed at H1, the berth Rigel left: Rigel's anchor is HV1, which Lyra
 *                    now holds, so no film plays (filmBerth())
 *   rescue-ward      on the full ward, Vega (seat 1, H1) is healed and returns to A1: every other berth
 *                    holds a living patient, so the inset goes to the band beside the caption
 *   rescue-upper     on the full ward, Mira (seat 8, H8, an upper berth) is healed and returns to A1
 *
 * kinds is the subject's chronology in the batch, as Backend publishes it; also, the batch's other
 * seats that move, with theirs.
 */
const moved = (seat, kinds, after) => Object.freeze({ seat, kinds: Object.freeze(kinds), after: Object.freeze({ jailed: false, ...after }) });
export const MEDICAL_OUTCOMES = Object.freeze({
  rescue: Object.freeze({ fixture: 'mixed', ...moved(2, ['HEALED'], { room: 'room-a', slot: 'A2', health: 'Healthy' }) }),
  'rescue-detained': Object.freeze({ fixture: 'mixed', ...moved(8, ['HEALED'], { room: 'jail', slot: 'J1', health: 'Healthy', jailed: true }), rosters: Object.freeze([8, 9]) }),
  vignette: Object.freeze({ fixture: 'mixed', ...moved(5, ['INJURY', 'HEALED'], { room: 'room-b', slot: 'B2', health: 'Healthy' }) }),
  death: Object.freeze({ fixture: 'mixed', ...moved(2, ['DEATH'], { room: 'hospital', slot: 'H1', health: 'Eliminated' }) }),
  'rescue-taken': Object.freeze({ fixture: 'mixed', ...moved(2, ['HEALED'], { room: 'room-a', slot: 'A2', health: 'Healthy' }), also: Object.freeze([moved(3, ['INJURY'], { room: 'hospital', slot: 'H1', health: 'Injured' })]) }),
  'rescue-ward': Object.freeze({ fixture: 'ward', ...moved(1, ['HEALED'], { room: 'room-a', slot: 'A1', health: 'Healthy' }) }),
  'rescue-upper': Object.freeze({ fixture: 'ward', ...moved(8, ['HEALED'], { room: 'room-a', slot: 'A1', health: 'Healthy' }), rosters: Object.freeze([8, 9]) }),
});

/**
 * Backend's clinical anchor for a subject (captain-outcomes-implementation.md on #146), copied for
 * this review page only: every starting Hospital place (bodies included) reserves its own HV
 * number; a new clinical subject takes the lowest unused one, in public player-number order.
 */
export function serverAnchor(subject, startSeats, roster) {
  // With &beds=4 the successor's anchor contract is not settled (H4-CLINICAL-01 on #157): the page
  // uses the Designer's proposal on #155, HVn for bed Hn of the four, with no slotCount. Synthetic.
  const shape = anchorId => (FOUR ? { kind: 'CLINICAL_VIGNETTE', batchId: 'review-batch', anchorId } : { kind: 'CLINICAL_VIGNETTE', batchId: 'review-batch', anchorId, slotCount: roster });
  const own = startSeats.find(seat => seat.seat === subject && seat.room === 'hospital');
  if (own) return shape(`HV${own.slot.slice(1)}`);
  const reserved = new Set(startSeats.filter(seat => seat.room === 'hospital').map(seat => Number(seat.slot.slice(1))));
  for (let n = 1; n <= (FOUR ? 4 : roster); n += 1) if (!reserved.has(n)) return shape(`HV${n}`);
  throw new Error('No free clinical anchor');
}

/** An outcome: its subject, chronology, anchor, and the seats before and after its batch. */
export function medicalOutcome(name, roster) {
  const outcome = MEDICAL_OUTCOMES[name];
  if (!outcome) throw new Error(`No medical outcome ${name}`);
  if (outcome.rosters && !outcome.rosters.includes(roster)) throw new Error(`${name} needs ${outcome.rosters.join(' or ')} players`);
  const before = fixtureSeats(outcome.fixture, roster);
  const subject = before.find(seat => seat.seat === outcome.seat);
  if (!subject) throw new Error(`Seat ${outcome.seat} is not in a ${roster}-player match`);
  const moves = new Map([outcome, ...(outcome.also ?? [])].map(entry => [entry.seat, entry.after]));
  const after = before.map(seat => (moves.has(seat.seat) ? { ...seat, ...moves.get(seat.seat) } : seat));
  return { name, fixture: outcome.fixture, subject, kinds: outcome.kinds, anchor: serverAnchor(outcome.seat, before, roster), before, after };
}
