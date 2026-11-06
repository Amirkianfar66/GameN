// mothership:dev-only
//
// The state maps for the offices' remaining pieces, from the seat's own view alone (protocol 3
// candidate, packages/contracts/src/planet-game.ts at 79418e7) and the client's own command memory:
// the Captain's Officer appointment, the Officer's movement block, the public office badges and the
// public block marker. offers[] is the only authority on what may be sent; offices.* is public.
//
// The rules (owner decision P07; the Officer office overlay of 25 October; game-design.md "Offices";
// motion requirements): the Captain appoints another Healthy, non-Jailed player outside the Hospital
// within 30 seconds; a timeout picks an eligible player uniformly; no eligible player leaves the
// office vacant for that Captain term. The Officer is a public office held alongside a secret role,
// never a role. Every round has a fixed 15-second pre-turn window for the Officer's block (and the
// Alien's secret Blackhole, which nothing here may hint at); early submissions do not shorten it.
// The block is public and stops voluntary movement for the round only; forced Hospital and Jail
// transfers, votes, actions and windows are unaffected; the same player cannot be blocked in
// consecutive rounds (the offer leaves them out). A block expires with its round.

import { bySeat } from '../seats.mjs';

const offer = (view, type) => (view.offers ?? []).find(o => o.type === type) ?? null;
const sorted = ids => [...ids].sort(bySeat);

/** The public offices: who holds each, and who is blocked from moving this round. */
export const offices = view => ({ captain: view.offices.captainSeatId, officer: view.offices.officerSeatId, blocked: view.offices.blockedSeatId });

/**
 * The public strip's stage for the offices (the same on every screen):
 *   appointing   OFFICER_APPOINTMENT: "The Captain is appointing an Officer."
 *   pre-turn     PRE_TURN, with an Officer: "Before the turns: the Officer may block one player's move."
 *   quiet        PRE_TURN with no Officer: "Before the turns." (the window still runs its fixed 15 s)
 *   null         any other phase
 * Nothing here depends on anything secret: the pre-turn stage reads the same whoever acts in it.
 */
export function publicStage(view) {
  if (view.phase.kind === 'OFFICER_APPOINTMENT') return { stage: 'appointing', captain: view.offices.captainSeatId };
  if (view.phase.kind === 'PRE_TURN') return view.offices.officerSeatId !== null ? { stage: 'pre-turn', officer: view.offices.officerSeatId } : { stage: 'quiet' };
  return { stage: null };
}

/**
 * The Captain's appointment panel (only on the Captain's phone, only in OFFICER_APPOINTMENT):
 *   none       not the Captain, or another phase
 *   sending    APPOINT_OFFICER sent, no receipt yet
 *   refused    refused in this phase (choose again while time remains)
 *   appointed  an Officer holds the office (this phone's receipt, or the view)
 *   vacant     offered with no eligible player: the office stays empty this term
 *   choose     offered: the eligible players, every one of the same weight
 *   confirm    a player picked on this phone: the confirmation
 *   closed     no offer (the window is closing)
 */
export function appointState(view, { pending = null, accepted = {}, rejected = {}, picked = null } = {}) {
  if (view.self.seatId !== view.offices.captainSeatId || view.phase.kind !== 'OFFICER_APPOINTMENT') return { state: 'none' };
  if (pending === 'APPOINT_OFFICER') return { state: 'sending', target: picked };
  if (view.offices.officerSeatId !== null) return { state: 'appointed', officer: view.offices.officerSeatId };
  if (accepted.APPOINT_OFFICER === view.phase.id) return { state: 'appointed', officer: picked };
  const refusal = rejected.APPOINT_OFFICER ?? null;
  const o = offer(view, 'APPOINT_OFFICER');
  if (refusal && refusal.phaseId === view.phase.id && !(o && picked !== null && o.targetSeatIds.includes(picked))) return { state: 'refused', code: refusal.code, targets: o ? sorted(o.targetSeatIds) : [] };
  if (!o) return { state: 'closed' };
  const targets = sorted(o.targetSeatIds);
  if (!targets.length) return { state: 'vacant' };
  return picked !== null && targets.includes(picked) ? { state: 'confirm', targets, target: picked } : { state: 'choose', targets };
}

/**
 * The Officer's block panel (only on the Officer's phone, only in PRE_TURN):
 *   none     not the Officer, or another phase
 *   sending  BLOCK_MOVE sent, no receipt yet
 *   blocked  a block holds this round (the view's blockedSeatId)
 *   refused  refused in this phase
 *   choose   offered: the players who may be blocked (the offer leaves out last round's), and "no one" by sending nothing
 *   confirm  a player picked on this phone: the confirmation
 *   closed   no offer
 */
export function blockState(view, { pending = null, accepted = {}, rejected = {}, picked = null } = {}) {
  if (view.self.seatId !== view.offices.officerSeatId || view.phase.kind !== 'PRE_TURN') return { state: 'none' };
  if (pending === 'BLOCK_MOVE') return { state: 'sending', target: picked };
  if (view.offices.blockedSeatId !== null) return { state: 'blocked', target: view.offices.blockedSeatId };
  if (accepted.BLOCK_MOVE === view.phase.id) return { state: 'blocked', target: picked };
  const refusal = rejected.BLOCK_MOVE ?? null;
  if (refusal && refusal.phaseId === view.phase.id) return { state: 'refused', code: refusal.code };
  const o = offer(view, 'BLOCK_MOVE');
  if (!o || !o.targetSeatIds.length) return { state: 'closed' };
  const targets = sorted(o.targetSeatIds);
  return picked !== null && targets.includes(picked) ? { state: 'confirm', targets, target: picked } : { state: 'choose', targets };
}

/** This seat's own note when it is the one blocked this round. */
export const selfBlocked = view => view.offices.blockedSeatId !== null && view.offices.blockedSeatId === view.self.seatId;

/** The badges a seat's name tag carries: offices first (Captain, Officer), then a block for this round. */
export function badges(view, seatId) {
  const out = [];
  if (view.offices.captainSeatId === seatId) out.push('captain');
  if (view.offices.officerSeatId === seatId) out.push('officer');
  if (view.offices.blockedSeatId === seatId) out.push('blocked');
  return out;
}

/**
 * What a new view brings once, against the previous view this screen drew (never on a reconnect):
 *   appointed  the seat newly holding the Officer office (the badge pins on)
 *   blocked    the seat newly blocked (the tape drops at its feet)
 *   expired    the seat whose block ended (the tape rolls away)
 */
export function officeChanges(previous, view) {
  if (!previous) return { appointed: null, blocked: null, expired: null };
  const was = previous.offices, now = view.offices;
  return {
    appointed: now.officerSeatId !== null && now.officerSeatId !== was.officerSeatId ? now.officerSeatId : null,
    blocked: now.blockedSeatId !== null && now.blockedSeatId !== was.blockedSeatId ? now.blockedSeatId : null,
    expired: was.blockedSeatId !== null && now.blockedSeatId !== was.blockedSeatId ? was.blockedSeatId : null,
  };
}

export const APPOINT_STATES = Object.freeze(['none', 'choose', 'confirm', 'sending', 'appointed', 'refused', 'vacant', 'closed']);
export const BLOCK_STATES = Object.freeze(['none', 'choose', 'confirm', 'sending', 'blocked', 'refused', 'closed']);
