// mothership:dev-only
//
// The state maps for the match's end and for recovery, from the view alone (protocol 3 candidate,
// packages/contracts/src/planet-game.ts at 79418e7) and the client's own clock and connection:
// the end reveal over the arrival, the no-survivors ending, the host's abort, and the reconnect,
// stale and failed-asset states. Nothing here decides an ending: result and endReveal are the
// server's, and they are drawn only when the view carries them.
//
// The rules (game-design.md "Navigation and endings"; owner decisions; the brief's "Arrival, no
// survivors and recovery" row; motion requirements): Blue or Red wins at its planet; the Alien
// co-wins with either team only if alive and it personally used the Blackhole (Injured is alive);
// the finalized no-survivors exception has no winner; a host abort has no winner; only
// authoritative terminal results; a crew all jailed or injured is not "no survivors" (only the
// server's reason says so); on reconnect, restore the latest state and never replay a historical
// death, Sync or film. endReveal (every role and the Code) exists only in FINISHED.

/** Each secret role's side (7: Insider, Doctor, Blue Disabler, Supplier, Undercover, Hacker, Alien; 8 adds Red Disabler; 9 adds Engineer). */
export const ROLE_SIDE = Object.freeze({
  Insider: 'Blue', Doctor: 'Blue', 'Blue Disabler': 'Blue', Supplier: 'Blue', Engineer: 'Blue',
  Undercover: 'Red', Hacker: 'Red', 'Red Disabler': 'Red', Alien: 'Alien',
});
export const SIDES = Object.freeze(['Blue', 'Red', 'Alien']);

/**
 * The ending, from the view's result and endReveal only:
 *   none          no terminal result in the view
 *   arrival       FINISHED, reason ARRIVAL: the winning side, the Alien's co-win (from the result, never inferred), the reveal
 *   no-survivors  FINISHED, reason NO_SURVIVORS: no winner, the reveal
 *   aborted       ABORTED: no winner and no reveal (the view carries none)
 * The reveal groups every seat by side in seat order; a seat is marked a winner only from the result.
 */
export function endState(view) {
  const r = view.result;
  if (!r) return { state: 'none' };
  if (view.phase.kind === 'ABORTED' || r.reason === 'ABORTED') return { state: 'aborted' };
  if (view.phase.kind !== 'FINISHED' || !view.endReveal) return { state: 'none' };
  const roles = [...view.endReveal.roles].sort((a, b) => a.seatId - b.seatId).map(x => ({ ...x, side: ROLE_SIDE[x.role] }));
  const winners = r.reason === 'ARRIVAL' ? new Set([r.winner, ...(r.alienCoWinner ? ['Alien'] : [])]) : new Set();
  const bySide = Object.fromEntries(SIDES.map(side => [side, roles.filter(x => x.side === side).map(x => ({ ...x, winner: winners.has(side) }))]));
  const code = [...view.endReveal.code].sort((a, b) => a - b);
  if (r.reason === 'ARRIVAL') return { state: 'arrival', winner: r.winner, alienCoWinner: r.alienCoWinner, bySide, code };
  if (r.reason === 'NO_SURVIVORS') return { state: 'no-survivors', bySide, code };
  return { state: 'none' };
}

/**
 * Whether a film plays, seeks, stands at its end or is skipped, on this screen now (the motion
 * bible's lifecycle, as one function): t = now - start (the server's clock).
 *   play     never played here, and 0 <= t < end: play from t (a late join seeks)
 *   final    t >= end, or already played here: draw the final state at once, no replay
 *   skip     an event past its expiry (publishedAt + 30 s) that this screen never drew: draw the latest state only
 *   wait     t < 0 (the clock has not reached it)
 */
export function filmDecision({ start, end, now, played = false, expiresAt = null }) {
  const t = now - start;
  if (t < 0) return { decision: 'wait', t };
  if (played) return { decision: 'final', t: end };
  if (expiresAt !== null && now > expiresAt) return { decision: 'skip', t: end };
  if (t >= end) return { decision: 'final', t: end };
  return { decision: 'play', t };
}

/** The end reveal's clock: it starts when the arrival film ends (FINISHED's startedAt + the arrival's length on this surface). */
export const revealStart = (view, arrivalLength) => view.phase.startedAt + arrivalLength;

/**
 * The connection strip, from the client's own transport and clock (no contract field):
 *   ok            connected and current: nothing is drawn
 *   reconnecting  the transport is down: the board stays, controls are held, nothing replays
 *   restored      connected again, within RESTORED_MS: "Back. This is the latest state."
 *   stale         connected, but the phase should have ended STALE_MS ago and no newer view came
 * The server's clock never stops; a reconnect draws the latest view at rest (films by filmDecision).
 */
export const RESTORED_MS = 2000;
export const STALE_MS = 3000;
export function connectionState({ online, now, restoredAt = null, phaseEndsAt = null }) {
  if (!online) return { state: 'reconnecting' };
  if (restoredAt !== null && now - restoredAt < RESTORED_MS) return { state: 'restored' };
  if (phaseEndsAt !== null && now - phaseEndsAt > STALE_MS) return { state: 'stale' };
  return { state: 'ok' };
}

export const END_STATES = Object.freeze(['none', 'arrival', 'no-survivors', 'aborted']);
export const CONNECTION_STATES = Object.freeze(['ok', 'reconnecting', 'restored', 'stale']);
