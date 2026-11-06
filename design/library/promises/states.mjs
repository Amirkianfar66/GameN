// mothership:dev-only
//
// The state maps for Promises, from the seat's own PlanetPlayerView alone (protocol 3 candidate,
// packages/contracts/src/planet-game.ts at 79418e7) and the client's own command memory. The
// server's offers[] is the only authority on what may be sent now; promises[] is the only record.
//
// The rules (game-design.md "Promises and windows"; owner decisions P04, P16, P23, P24 and P25):
// one accepted Promise given and one received per player for the whole match; exact terms need
// the recipient's explicit acceptance during permitted private talk; draft, declined and expired
// offers use neither slot; the records are pair-private and survive Sync; six kinds; actual
// ballots count, not the vote's outcome or the admission; Officer Selection is conditional on the
// giver winning the specified election; a meeting is evaluated when voting starts after Sync;
// same-round Promises finalize at the close of their opportunity in that round, election Promises
// may wait for their election until the match ends; an absent opportunity is "Condition not met",
// one that occurs but is prevented is "Not fulfilled", and failure is not proof of lying.
//
// What the view does not settle (request R13): promiseQuota's booleans have no stated sense (a slot
// used, or a slot open), so the quota is read from the records instead (a slot is used only by an
// accepted Promise); NO_JAIL_VOTE has no target, and whether it means "not against the recipient"
// or "no Jail ballot at all" is not stated; whose place decides a meeting is not stated; and an
// electionId cannot be named for a person. None of these is guessed here: the state map carries
// the contract's fields, and the words (copy.mjs) say only what the view says.

export const KINDS = Object.freeze(['CAPTAIN_SUPPORT', 'OFFICER_SELECTION', 'JAIL_VOTE', 'NO_JAIL_VOTE', 'MEET_A', 'MEET_B']);
export const RESULTS = Object.freeze(['Fulfilled', 'Not fulfilled', 'Condition not met']);
export const STATUSES = Object.freeze(['Pending', ...RESULTS]);
/** Promises decided by a Captain election (electionId), and those decided within their own round. */
export const ELECTION_KINDS = Object.freeze(['CAPTAIN_SUPPORT', 'OFFICER_SELECTION']);
export const ROUND_KINDS = Object.freeze(['JAIL_VOTE', 'NO_JAIL_VOTE', 'MEET_A', 'MEET_B']);

const offer = (view, type) => (view.offers ?? []).find(o => o.type === type) ?? null;
const me = view => view.self.seatId;
const promises = view => view.promises ?? [];

/** A Promise as this seat sees it, or null for a pair this seat is not in (the contract never sends one). */
export function promiseRecord(view, p) {
  const side = p.giverSeatId === me(view) ? 'given' : p.recipientSeatId === me(view) ? 'received' : null;
  if (!side) return null;
  return Object.freeze({
    id: p.id, side, kind: p.kind, giver: p.giverSeatId, recipient: p.recipientSeatId,
    partner: side === 'given' ? p.recipientSeatId : p.giverSeatId, target: p.targetSeatId,
    round: p.round, electionId: p.electionId, offer: p.offerStatus,
    status: p.offerStatus === 'accepted' ? p.status : null,
  });
}

/** When a Promise is decided: its election, its round's Jail vote, or the start of its round's voting after Sync. */
export function opportunity(record) {
  if (ELECTION_KINDS.includes(record.kind)) return { at: 'election', electionId: record.electionId };
  if (record.kind === 'JAIL_VOTE' || record.kind === 'NO_JAIL_VOTE') return { at: 'jail-vote', round: record.round };
  return { at: 'voting-start', round: record.round };
}

/** The lifetime slots, from the records: used only by an accepted Promise. promiseQuota is not read (R13). */
export function quota(view) {
  const accepted = promises(view).filter(p => p.offerStatus === 'accepted');
  return {
    given: accepted.some(p => p.giverSeatId === me(view)) ? 'used' : 'open',
    received: accepted.some(p => p.recipientSeatId === me(view)) ? 'used' : 'open',
  };
}

/** The ledger: this seat's accepted Promise given and accepted Promise received (each at most one). */
export function ledger(view) {
  const records = promises(view).map(p => promiseRecord(view, p)).filter(r => r && r.offer === 'accepted');
  return { given: records.find(r => r.side === 'given') ?? null, received: records.find(r => r.side === 'received') ?? null };
}

/** The latest settled offer of a side in this round that nothing later supersedes: a note under the composer or the inbox. */
function settledNote(view, side) {
  const mine = promises(view).map(p => promiseRecord(view, p)).filter(r => r && r.side === side && r.round === view.round);
  const last = mine.at(-1);
  return last && (last.offer === 'declined' || last.offer === 'expired') ? { offer: last.offer, partner: last.partner, kind: last.kind, id: last.id } : null;
}

/**
 * The giver's composer:
 *   given     this seat's one given Promise is accepted: nothing more to give in the match
 *   sending   OFFER_PROMISE sent, no receipt yet
 *   waiting   this seat's offer awaits the recipient's answer (offerStatus offered)
 *   refused   the server refused the offer in this phase: nothing used
 *   choose    OFFER_PROMISE offered, no card picked: the six cards (and the recipient, from the offer)
 *   target    Jail Vote picked, no target yet: the offer's promiseTargetSeatIds
 *   review    a complete draft: the exact terms and "Offer Promise"
 *   closed    no offer: outside permitted private talk
 * A draft is { kind, recipient, target }; recipient defaults to the offer's only recipient. A
 * declined or expired offer of this round adds a note (nothing used) until a later offer exists.
 */
export function composerState(view, { pending = null, rejected = {}, draft = null } = {}) {
  const mine = promises(view).filter(p => p.giverSeatId === me(view));
  if (mine.some(p => p.offerStatus === 'accepted')) return { state: 'given' };
  if (pending === 'OFFER_PROMISE') return { state: 'sending', draft };
  const waiting = mine.find(p => p.offerStatus === 'offered');
  if (waiting) return { state: 'waiting', record: promiseRecord(view, waiting) };
  const note = settledNote(view, 'given');
  const refusal = rejected.OFFER_PROMISE ?? null;
  if (refusal && refusal.phaseId === view.phase.id) return { state: 'refused', code: refusal.code, note };
  const o = offer(view, 'OFFER_PROMISE');
  if (!o) return { state: 'closed', note };
  const recipients = [...o.targetSeatIds].sort((a, b) => a - b);
  const targets = [...(o.promiseTargetSeatIds ?? [])].sort((a, b) => a - b);
  const recipient = draft?.recipient ?? (recipients.length === 1 ? recipients[0] : null);
  const base = { recipients, targets, note };
  if (!draft?.kind || !KINDS.includes(draft.kind) || recipient === null || !recipients.includes(recipient)) return { ...base, state: 'choose', recipient };
  if (draft.kind === 'JAIL_VOTE' && (draft.target == null || !targets.includes(draft.target))) return { ...base, state: 'target', recipient, kind: draft.kind };
  return { ...base, state: 'review', recipient, kind: draft.kind, target: draft.kind === 'JAIL_VOTE' ? draft.target : null };
}

/**
 * The recipient's inbox: the offer to this seat that awaits an answer (offerStatus offered).
 *   none          no offer awaits this seat's answer
 *   answering     ACCEPT_PROMISE or DECLINE_PROMISE sent, no receipt yet
 *   incoming      ACCEPT_PROMISE and DECLINE_PROMISE offered: the exact terms, Accept and Decline of equal weight
 *   decline-only  only DECLINE_PROMISE offered (this seat's one received Promise is already accepted)
 *   locked        neither offered (the talk has closed; the server expires it)
 * A declined or expired offer of this round adds a note to none (nothing used).
 */
export function inboxState(view, { pending = null } = {}) {
  const waiting = promises(view).find(p => p.recipientSeatId === me(view) && p.offerStatus === 'offered');
  if (!waiting) return { state: 'none', note: settledNote(view, 'received') };
  const record = promiseRecord(view, waiting);
  if (pending === 'ACCEPT_PROMISE' || pending === 'DECLINE_PROMISE') return { state: 'answering', record, answer: pending === 'ACCEPT_PROMISE' ? 'accept' : 'decline' };
  const accept = offer(view, 'ACCEPT_PROMISE'), decline = offer(view, 'DECLINE_PROMISE');
  if (accept && decline) return { state: 'incoming', record };
  if (decline) return { state: 'decline-only', record };
  return { state: 'locked', record };
}

/**
 * What a new view brings for the first time, against the previous view this screen drew (never
 * against nothing: a reconnect draws everything at rest):
 *   arrived   offers to this seat newly awaiting an answer
 *   accepted  Promises newly accepted (either side)
 *   declined  offers newly declined or expired (either side)
 *   results   Promises whose status moved from Pending to a result (R6: at the close of each Promise's own opportunity)
 */
export function changes(previous, view) {
  const empty = { arrived: [], accepted: [], declined: [], results: [] };
  if (!previous) return empty;
  const before = new Map(promises(previous).map(p => [p.id, p]));
  const out = { arrived: [], accepted: [], declined: [], results: [] };
  for (const p of promises(view)) {
    const was = before.get(p.id) ?? null;
    if (p.offerStatus === 'offered' && !was && p.recipientSeatId === me(view)) out.arrived.push(p.id);
    if (p.offerStatus === 'accepted' && was && was.offerStatus === 'offered') out.accepted.push(p.id);
    if ((p.offerStatus === 'declined' || p.offerStatus === 'expired') && was && was.offerStatus === 'offered') out.declined.push(p.id);
    if (p.offerStatus === 'accepted' && RESULTS.includes(p.status) && was && was.offerStatus === 'accepted' && was.status === 'Pending') out.results.push(p.id);
  }
  return out;
}

/** Every composer and inbox state, for the review page, the tests and the handoff. */
export const COMPOSER_STATES = Object.freeze(['closed', 'choose', 'target', 'review', 'sending', 'waiting', 'refused', 'given']);
export const INBOX_STATES = Object.freeze(['none', 'incoming', 'decline-only', 'answering', 'locked']);
