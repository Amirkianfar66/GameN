// mothership:dev-only
//
// The state map for navigation, from a view alone (protocol 3 candidate,
// packages/contracts/src/planet-game.ts at 79418e7): the office panel from the seat's own
// PlanetPlayerView, the public strip from any view's common fields. Pure functions of the view and of
// the client's own command memory (a command still pending, and the phase in which this client saw a
// command accepted). The server's offers[] is the only authority on what may be done now.
//
// What each audience may see (owner decisions P09 to P13, the navigation overlay's confirmed rules 3
// and 4, motion-requirements.md):
//   offices   privateNavigation only: the position, the final direction (never a total, a weight, the
//             Captain's share or the direction before a ship hack), the tie choice (the Officer
//             alone sees that there is a tie) and each office's acknowledgement, which never vetoes
//   everyone  navigation.lastMovedRound and the MOVEMENT_COMPLETED event: that the ship moved; the
//             destination only on arrival (navigation.arrivedAt, result)
// The route-setting window (owner decision P28, 6 November 2026): "from Round 2, every navigation
// opportunity has the same full 15-second route-setting window. Only the eligible Officer receives
// controls for a genuine tie. Early selection cannot shorten the window. Public wording, animation,
// sound and timing must not reveal whether a tie occurred." The protocol 3 candidate calls that
// window's phase NAV_TIE (15 s); it now runs at every opportunity, tie or not, so neither its kind
// nor its timing tells anyone anything. Every screen but the eligible Officer's draws it exactly as
// the acknowledgement stages ("the course is being set"), for the window's full time: the strip and
// the Captain's panel read only phase.kind, never offers or a choice, and nothing moves on the
// Officer's choice but the Officer's own panel. The Officer's panel itself shows the tie controls
// only while CHOOSE_NAV_DIRECTION is offered (a genuine tie), and otherwise reads as everyone's.
//
// privateNavigation.tieChoice and .confirmation are not read: their meaning (a tie to choose now, or
// one chosen; the acknowledgement awaited, or one given) is not settled (request R11). The stage is
// read from phase.kind, the controls from offers, and "confirmed" from this client's own receipt.

import { armOf, classify, depthOf, isPlanet, step } from './route.mjs';

export const NAV_PHASES = Object.freeze(['NAV_TIE', 'NAV_CAPTAIN_CONFIRM', 'NAV_OFFICER_CONFIRM']);

/**
 * The route-setting window (P28): the phase kind the candidate gives it, and its fixed length. It
 * runs at every navigation opportunity from Round 2, the same 15 s whether or not there is a tie.
 */
export const ROUTE_WINDOW = Object.freeze({ kind: 'NAV_TIE', durationMs: 15_000, fromRound: 2, decision: 'P28' });

/**
 * When the route-setting window ends: the phase's own endsAt, never earlier (an early choice does not
 * shorten it). null outside the window.
 */
export const routeWindowEnds = view => (view.phase?.kind === ROUTE_WINDOW.kind ? view.phase.endsAt ?? null : null);

const offered = (view, type) => (view.offers ?? []).some(offer => offer.type === type);

/** The seat's office: 'captain', 'officer' or null. */
export function officeOf(view) {
  if (view.offices.captainSeatId === view.self.seatId) return 'captain';
  if (view.offices.officerSeatId === view.self.seatId) return 'officer';
  return null;
}

/**
 * The office panel (the Captain's or the Officer's own private route view):
 *   none       no privateNavigation in the view (not an office, or Round 1 before the first election)
 *   idle       outside navigation: the position at rest
 *   setting    the route-setting window (P28: every opportunity from Round 2, 15 s), for an office
 *              not offered the choice: the Captain always, the Officer when there is no genuine tie
 *   tie        the Officer is offered CHOOSE_NAV_DIRECTION (a genuine tie): Blue or Red, no numbers
 *   chosen     this client's tie choice was accepted in this phase; it holds until the window ends
 *              (an early choice never shortens it, P28)
 *   confirm    the office is offered CONFIRM_NAVIGATION: the final direction and the step it makes
 *   confirmed  this client's acknowledgement was accepted in this phase
 *   closed     the office's own stage, not offered and no acceptance seen here (a reconnect after
 *              acknowledging, or a timeout, which acknowledges automatically)
 *   waiting    the other office's stage: the direction, and who is acknowledging
 *   sending    the client sent the stage's command and has no receipt yet
 *   arrived    the ship is at a planet
 * Options: pending (a command type the client sent, no receipt yet), accepted ({ [commandType]:
 * phaseId } of the receipts this client saw accepted).
 */
export function officePanelState(view, { pending = null, accepted = {} } = {}) {
  const nav = view.privateNavigation ?? null;
  if (!nav) return { state: 'none' };
  const office = officeOf(view);
  const base = { office, position: nav.position, arm: armOf(nav.position), depth: depthOf(nav.position) };
  if (isPlanet(nav.position)) return { ...base, state: 'arrived' };
  const phase = view.phase;
  if (phase.kind === 'NAV_TIE') {
    if (pending === 'CHOOSE_NAV_DIRECTION') return { ...base, state: 'sending', command: 'CHOOSE_NAV_DIRECTION' };
    if (offered(view, 'CHOOSE_NAV_DIRECTION')) return { ...base, state: 'tie', choices: ['Blue', 'Red'] };
    if (accepted.CHOOSE_NAV_DIRECTION === phase.id) return { ...base, state: 'chosen', direction: nav.direction ?? null };
    return { ...base, state: 'setting' };
  }
  if (phase.kind === 'NAV_CAPTAIN_CONFIRM' || phase.kind === 'NAV_OFFICER_CONFIRM') {
    const stage = phase.kind === 'NAV_CAPTAIN_CONFIRM' ? 'captain' : 'officer';
    const direction = nav.direction ?? null;
    const course = direction ? step(nav.position, direction) : null;
    const known = { ...base, stage, direction, course };
    if (pending === 'CONFIRM_NAVIGATION') return { ...known, state: 'sending', command: 'CONFIRM_NAVIGATION' };
    if (offered(view, 'CONFIRM_NAVIGATION')) return { ...known, state: 'confirm' };
    if (accepted.CONFIRM_NAVIGATION === phase.id) return { ...known, state: 'confirmed' };
    return { ...known, state: stage === office ? 'closed' : 'waiting' };
  }
  return { ...base, state: 'idle' };
}

/**
 * The step the office panel animates when the position changes between two of its views: the
 * route rule's name for it, or null (no animation; the new position is drawn at rest).
 */
export function panelStep(previousPosition, position) {
  if (!previousPosition || !position) return null;
  const made = classify(previousPosition, position);
  return made ? { from: previousPosition, to: position, ...made } : null;
}

/**
 * The public strip, for every screen (the display, every phone): what anyone may know.
 *   idle        nothing to draw
 *   navigating  a navigation stage: "the course is being set", the same for all three stages
 *   transit     a MOVEMENT_COMPLETED event this screen has not played: the neutral transit, from the
 *               event's publishedAt (t = now - publishedAt), identical for every movement
 *   moved       the last completed movement (navigation.lastMovedRound): a still chip, "Round N"
 *   arrived     the ship is at a planet (navigation.arrivedAt): the arrival composition; the
 *               result's winners belong to the end reveal
 * Options: now (the server-corrected clock, ms), played (event ids this screen already played),
 * transitEnd (the transit's length, ms).
 */
export function publicNavState(view, { now = null, played = new Set(), transitEnd = 0 } = {}) {
  const nav = view.navigation;
  if (nav.arrivedAt) return { state: 'arrived', planet: `${nav.arrivedAt} Planet`, round: nav.lastMovedRound, since: view.phase.kind === 'FINISHED' ? view.phase.startedAt : null };
  const event = (view.events ?? []).filter(e => e.kind === 'MOVEMENT_COMPLETED' && e.audience.kind === 'public')
    .sort((a, b) => b.publishedAt - a.publishedAt)[0] ?? null;
  if (event && !played.has(event.id) && now !== null && now - event.publishedAt < transitEnd && now < event.expiresAt) {
    return { state: 'transit', round: event.round, eventId: event.id, t: Math.max(0, now - event.publishedAt) };
  }
  if (NAV_PHASES.includes(view.phase.kind)) return { state: 'navigating', round: view.round };
  if (nav.lastMovedRound > 0) return { state: 'moved', round: nav.lastMovedRound };
  return { state: 'idle' };
}

/** Every state each map can return, for the review page, the tests and the handoff. */
export const STATES = Object.freeze({
  office: Object.freeze(['none', 'idle', 'setting', 'tie', 'chosen', 'confirm', 'confirmed', 'closed', 'waiting', 'sending', 'arrived']),
  public: Object.freeze(['idle', 'navigating', 'transit', 'moved', 'arrived']),
  step: Object.freeze(['start', 'advance', 'switch', 'arrive']),
});
