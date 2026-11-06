// mothership:dev-only
//
// The state map: which picture and which words the Hacker's final Code, the ship hack and the
// Engineer's capture show, from the seat's own player view alone (protocol 3 candidate,
// packages/contracts/src/planet-game.ts at 79418e7: PlanetPlayerView). Pure functions of the view
// and of the client's own pending command; nothing else. The server's offers[] is the only
// authority on what may be done now: a state here never enables an action the view does not offer,
// and its "why not" reasons only explain, from the seat's own facts, why an offer is absent.
//
// Two fields the confirmation needs are not in the contract yet (motion bible, R8 and R9):
//   abilities.engineerCapture { round, seatIds }  the identities the server fixed at the capture (P14)
//   abilities.shipHackRound                       the round the ship hack was registered in
// Where a view carries them they are used; without them the states fall back to what the view
// says (spent), and never guess the identities or the round.

import { bySeat } from '../seats.mjs';
const OPPOSITE = Object.freeze({ 'Room A': 'Room B', 'Room B': 'Room A' });

const offered = (view, type) => (view.offers ?? []).some(offer => offer.type === type);
const ownSeat = view => view.board.seats.find(seat => seat.seatId === view.self.seatId);

/**
 * Why the seat cannot use a Role Action now, from its own facts, in the order a player would fix
 * them: none when every condition holds (the offer then decides). Never shown as a rule the client
 * enforces: it words the absence of an offer.
 */
export function roleActionBlockers(view) {
  const seat = ownSeat(view);
  const out = [];
  if (seat.health === 'Eliminated') return ['eliminated'];
  if (view.phase.kind !== 'ORDINARY_TURN' || view.activeSeatId !== view.self.seatId) out.push('notYourTurn');
  if (seat.health === 'Injured') out.push('injured');
  if (seat.jailed) out.push('jailed');
  if (seat.health === 'Healthy' && !seat.jailed && !['Room A', 'Room B'].includes(seat.location)) out.push('notInAB');
  if (view.self.roleActionSpent) out.push('actionUsed');
  return out;
}

// ---------- the Hacker ----------

/**
 * The final Code (one submission in the match, from Round 2, alive, anywhere, before navigation,
 * no Role Action cost; P18, P20, P01):
 *   none       not the Hacker, or eliminated before attempting
 *   round1     Round 1: it opens in Round 2
 *   available  the view offers SUBMIT_CODE
 *   closed     not attempted, not offered now (after this round's navigation, or another stage)
 *   sending    the client sent SUBMIT_CODE and has no receipt yet
 *   correct    attempted and the ship hack is unlocked
 *   wrong      attempted and the ship hack is still locked: Scan stays, no retry
 */
export function finalCodeState(view, { pending = null } = {}) {
  if (view.self.role !== 'Hacker') return { state: 'none' };
  const a = view.abilities;
  if (a.codeAttempted) return { state: a.shipHackUnlocked ? 'correct' : 'wrong' };
  if (pending === 'SUBMIT_CODE') return { state: 'sending' };
  if (ownSeat(view).health === 'Eliminated') return { state: 'none' };
  if (view.round < 2) return { state: 'round1' };
  return { state: offered(view, 'SUBMIT_CODE') ? 'available' : 'closed' };
}

/**
 * The ship hack (one retained activation; P19, P03):
 *   sealed    not unlocked (no correct final Code yet, or a wrong one)
 *   eligible  unlocked, unused, and the view offers ACTIVATE_SHIP_HACK now
 *   armed     unlocked, unused, not offered now: blockers say why (or 'notNow' when none of the seat's facts explains it)
 *   sending   the client sent ACTIVATE_SHIP_HACK and has no receipt yet
 *   retained  spent in this round, before this round's navigation (needs shipHackRound, R9)
 *   used      spent (in an earlier round, or the round is unknown)
 * After Sync the selected world's view decides: an activation the selected world never made is not spent.
 */
export function shipHackState(view, { pending = null } = {}) {
  if (view.self.role !== 'Hacker') return { state: 'none' };
  const a = view.abilities;
  if (!a.shipHackUnlocked) return { state: 'sealed' };
  if (a.shipHackSpent) {
    const round = a.shipHackRound ?? null;
    const thisRound = round !== null && round === view.round && (view.navigation?.lastMovedRound ?? 0) < view.round;
    return { state: thisRound ? 'retained' : 'used', round };
  }
  if (pending === 'ACTIVATE_SHIP_HACK') return { state: 'sending' };
  if (offered(view, 'ACTIVATE_SHIP_HACK')) return { state: 'eligible' };
  const blockers = roleActionBlockers(view);
  return { state: 'armed', blockers: blockers.length ? blockers : ['notNow'] };
}

// ---------- the Engineer ----------

/**
 * The Engineer's capture (once a match, from A/B, on its own eligible Role Action; P12, P14):
 *   none         not the Engineer (nine players only)
 *   available    the view offers ENGINEER_SUPPRESS; preview: the opposite room's occupants now, in seat order
 *   unavailable  unused, not offered now: blockers say why
 *   sending      the client sent ENGINEER_SUPPRESS and has no receipt yet
 *   captured     spent in this round: the fixed identities (needs engineerCapture, R8), suppressed through this round
 *   used         spent in an earlier round, or the record is not in the view (then no identities are drawn)
 * The preview is the seat's own current world; the server fixes the identities at the moment it
 * registers the command, which the confirmation (R8) shows, never the preview.
 */
export function engineerState(view, { pending = null } = {}) {
  if (view.self.role !== 'Engineer') return { state: 'none' };
  const a = view.abilities;
  if (a.engineerSpent) {
    const record = a.engineerCapture ?? null;
    if (record && record.round === view.round) return { state: 'captured', round: record.round, seatIds: [...record.seatIds].sort(bySeat) };
    return { state: 'used', round: record?.round ?? null, seatIds: record ? [...record.seatIds].sort(bySeat) : null };
  }
  if (pending === 'ENGINEER_SUPPRESS') return { state: 'sending' };
  const seat = ownSeat(view);
  const room = OPPOSITE[seat.location] ?? null;
  if (offered(view, 'ENGINEER_SUPPRESS')) {
    const seatIds = view.board.seats.filter(other => other.location === room && other.seatId !== view.self.seatId).map(other => other.seatId).sort(bySeat);
    return { state: 'available', room, preview: seatIds };
  }
  const blockers = roleActionBlockers(view);
  return { state: 'unavailable', room, blockers: blockers.length ? blockers : ['notNow'] };
}

/** Every state each function can return, for the review page, the tests and the handoff. */
export const STATES = Object.freeze({
  finalCode: Object.freeze(['none', 'round1', 'available', 'closed', 'sending', 'correct', 'wrong']),
  shipHack: Object.freeze(['none', 'sealed', 'eligible', 'armed', 'sending', 'retained', 'used']),
  engineer: Object.freeze(['none', 'available', 'unavailable', 'sending', 'captured', 'used']),
  blockers: Object.freeze(['eliminated', 'notYourTurn', 'injured', 'jailed', 'notInAB', 'actionUsed', 'notNow']),
});
