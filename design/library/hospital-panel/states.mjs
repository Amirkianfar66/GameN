// mothership:dev-only
//
// The state map for the Hospital panel: a living Hospital patient's own code console (any secret
// role: a shared public onboard action), from the seat's own PlanetPlayerView alone (protocol 3
// candidate, packages/contracts/src/planet-game.ts at 79418e7) and the client's own command memory.
// The server's offers[] is the only authority on whether a number may be sent now.
//
// The rules (game-design.md "Doctor and panel"; owner decisions P21 and P22; the Hospital-panel
// overlays of 25 October): one code attempt per player in the whole match, spent globally either
// way; the code is the Doctor's original player number; a correct number reserves one of the two
// shared injections and queues self-Rescue at this round's Rescue stage (registering is not a heal);
// a wrong number spends the attempt and no injection; with no injection available the request is
// refused before the number is checked: nothing is spent and nothing is revealed (P21). Submissions
// close when the turns and private talk finish (P22).
//
// What the view does not say (request R12): the receipt of an accepted PANEL_CODE is only
// REGISTERED, and abilities.panelAttemptSpent turns true either way, so the patient cannot learn
// from the contract whether the number was right, whether the reservation was treated, had no
// effect or was not kept at Sync, nor why a request was refused. Where a view carries R12's
// proposed abilities.panelRequest, and a refusal R12's proposed code NO_INJECTION, they are used;
// without them the console says only what the view says (registered, used, refused) and never
// guesses. The injection count (abilities.injectionsRemaining) is the Doctor's own and is never read
// here, not even on the Doctor's phone.

export const R12_RESULTS = Object.freeze(['RESERVED', 'WRONG']);
export const R12_STATUSES = Object.freeze(['QUEUED', 'TREATED', 'NO_EFFECT', 'DISCARDED']);

const offer = (view, type) => (view.offers ?? []).find(o => o.type === type) ?? null;
const ownSeat = view => view.board.seats.find(seat => seat.seatId === view.self.seatId);

/** The keys the console offers: the offer's numbers when it lists them, else every player number. */
export function keypad(view) {
  const listed = offer(view, 'PANEL_CODE')?.targetSeatIds ?? [];
  const numbers = listed.length ? [...listed] : Array.from({ length: view.playerCount }, (_, i) => i + 1);
  return numbers.sort((a, b) => a - b);
}

/**
 * The medical deadline line, from the seat's own public medical facts (the berth's rescue tag, S9):
 *   next     a later normal round is still to come: "Rescue by the end of Round N"
 *   current  the due round is in progress: "This is the last round for Rescue"
 *   closed   no Rescue round is left
 * null when the seat has no medical episode.
 */
export function deadline(view) {
  const medical = ownSeat(view)?.medical ?? null;
  if (!medical) return null;
  const tone = { NEXT_NORMAL_ROUND: 'next', CURRENT_NORMAL_ROUND: 'current', CLOSED: 'closed' }[medical.rescueOpportunity] ?? null;
  return tone ? { tone, round: medical.rescueDueAfterRound } : null;
}

/**
 * The console:
 *   none        not a living Hospital patient: nothing is drawn
 *   available   offered PANEL_CODE, no number picked: the keypad
 *   choosing    offered, a number picked on this phone: the confirmation
 *   sending     PANEL_CODE sent, no receipt yet
 *   registered  accepted in this phase, the result unknown to the view (no R12): "registered, attempt used"
 *   reserved    R12: correct; an injection is reserved; self-Rescue queued for this round's Rescue stage
 *   wrong       R12: not the Doctor's number; the attempt is used, no injection spent
 *   treated     R12: the reserved injection was given at the Rescue stage
 *   no-effect   R12: the reserved injection was spent without effect (no refund)
 *   discarded   R12: the Blackhole's Sync did not keep the request; the attempt stays used
 *   exhausted   refused with R12's NO_INJECTION: nothing spent, the number not checked (P21)
 *   refused     refused for another reason (NOT_ALLOWED, PHASE_CLOSED): nothing used
 *   used        the attempt was used earlier and the view says no more
 *   closed      the attempt is unused, but no number is offered now (outside the turns, P22)
 * Options: pending (a command type sent, no receipt yet), accepted ({ PANEL_CODE: phaseId }),
 * rejected ({ PANEL_CODE: { phaseId, code } }), picked (the number chosen on this phone, or null).
 * Every state carries the deadline line and, where the console shows one, the number and the round.
 */
export function panelState(view, { pending = null, accepted = {}, rejected = {}, picked = null } = {}) {
  const seat = ownSeat(view);
  if (!seat || seat.health === 'Eliminated' || seat.location !== 'Hospital') return { state: 'none' };
  const base = { deadline: deadline(view) };
  const request = view.abilities.panelRequest ?? null;
  if (request && R12_RESULTS.includes(request.result)) {
    const at = { ...base, round: request.round };
    if (request.result === 'WRONG') return { ...at, state: 'wrong' };
    const by = { QUEUED: 'reserved', TREATED: 'treated', NO_EFFECT: 'no-effect', DISCARDED: 'discarded' }[request.status];
    if (by) return { ...at, state: by };
  }
  if (pending === 'PANEL_CODE') return { ...base, state: 'sending', number: picked };
  const refusal = rejected.PANEL_CODE ?? null;
  if (refusal && refusal.phaseId === view.phase.id && !view.abilities.panelAttemptSpent) {
    return { ...base, state: refusal.code === 'NO_INJECTION' ? 'exhausted' : 'refused' };
  }
  if (view.abilities.panelAttemptSpent) return { ...base, state: accepted.PANEL_CODE === view.phase.id ? 'registered' : 'used' };
  if (offer(view, 'PANEL_CODE')) {
    const keys = keypad(view);
    return picked !== null && keys.includes(picked) ? { ...base, state: 'choosing', keys, number: picked } : { ...base, state: 'available', keys };
  }
  return { ...base, state: 'closed' };
}

/** Every state, for the review page, the tests and the handoff. */
export const STATES = Object.freeze(['none', 'available', 'choosing', 'sending', 'registered', 'reserved', 'wrong', 'treated', 'no-effect', 'discarded', 'exhausted', 'refused', 'used', 'closed']);
