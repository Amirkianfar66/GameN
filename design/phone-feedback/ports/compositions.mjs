// Consumes the proposed server projection; never counts ballots or verifies a claim.
export const KIT_VERSION = 'phone-feedback-0.1.0';
export const HACK_TIMING = Object.freeze({ declarationMaxMs: 15000, resultMs: 5000, conversationMs: 60000 });
export const VOTE_WINDOW_MS = 5000;
const labels = {
  CAPTAIN_ELECTED: ['Captain chosen', 'Captain election', 'captain'],
  RUNOFF_REQUIRED: ['Runoff vote', 'Captain election tied', 'tie'],
  NO_CAPTAIN_ELECTED: ['No Captain selected', 'Captain election', 'none'],
  PLAYER_JAILED: ['Jail selected', 'Jail vote', 'jail'],
  NO_JAIL_SELECTION: ['No one selected', 'Jail vote', 'none'],
  PLAYER_RELEASED: ['Release approved', 'Release vote', 'release'],
  RELEASE_DENIED: ['Release denied', 'Release vote', 'denied'],
};
const number = value => Number.isInteger(value) && value >= 0;
const cleanSeat = seat => seat ? { n: seat.n, name: String(seat.name), character: seat.character, location: seat.location, health: seat.health, jailed: Boolean(seat.jailed), captain: Boolean(seat.captain) } : null;
const byId = (seats, id) => seats.find(seat => `seat-${seat.n}` === id);
export function voteComposition(result, seats) {
  const label = labels[result?.outcome];
  if (!label || !number(result.eligibleVoterCount)) return null;
  const selected = cleanSeat(byId(seats, result.selectedSeatId));
  if (['CAPTAIN_ELECTED', 'PLAYER_JAILED', 'PLAYER_RELEASED', 'RELEASE_DENIED'].includes(result.outcome) && !selected) return null;
  const counts = Object.entries(result.counts ?? {}).filter(([id, value]) => byId(seats, id) && number(value)).map(([id, count]) => ({ seat: cleanSeat(byId(seats, id)), count })).sort((a, b) => b.count - a.count || a.seat.n - b.seat.n);
  if (counts.reduce((sum, item) => sum + item.count, 0) > result.eligibleVoterCount) return null;
  if (result.kind === 'RELEASE_VOTE' && (!number(result.yesCount) || result.yesCount > result.eligibleVoterCount)) return null;
  return { heading: label[0], subtitle: result.outcome === 'NO_JAIL_SELECTION' && result.tiedSeatIds?.length ? 'Jail vote tied' : label[1], icon: result.outcome === 'NO_JAIL_SELECTION' && result.tiedSeatIds?.length ? 'tie' : label[2], selected, counts, eligibleVoterCount: result.eligibleVoterCount,
    yesCount: result.kind === 'RELEASE_VOTE' ? result.yesCount : null,
    detail: result.kind === 'RELEASE_VOTE' ? `${result.yesCount} yes / ${result.eligibleVoterCount} eligible` : `${result.eligibleVoterCount} eligible voters`,
    outcome: result.outcome, round: result.round };
}
export function hackComposition(view, { current, concealed, participant }) {
  if (!current || concealed || !participant || !view?.hackFeedback) return null;
  const phase = view.phase.kind, feedback = view.hackFeedback;
  if (!['HACK_DECLARE', 'HACK_RESULT', 'HACK'].includes(phase)) return null;
  const declared = feedback.status === 'DECLARED' && ['Blue', 'Red', 'Alien'].includes(feedback.declaredSide) ? feedback.declaredSide : null;
  return { stage: phase, partner: cleanSeat(view.partner), heading: phase === 'HACK' ? 'Ready to talk' : phase === 'HACK_RESULT' ? 'Declared side' : 'Awaiting declaration',
    declaration: phase === 'HACK_RESULT' ? declared ?? 'No side declared' : null,
    note: phase === 'HACK_RESULT' ? 'A declaration, not a verified faction.' : phase === 'HACK' ? 'Full 60-second conversation. Keep this conversation private.' : 'The target has up to 15 seconds to declare a side.',
    endsAt: view.phase.endsAt };
}
export function windowState({ id, startedAt, endsAt }, now, { current = true, reconnect = false, reduced = false, seen = false } = {}) {
  if (!id || !Number.isFinite(startedAt) || !Number.isFinite(endsAt) || endsAt < startedAt || !current || now >= endsAt || now < startedAt) return { visible: false, beat: 'none', remainingMs: 0 };
  const elapsed = now - startedAt, remainingMs = endsAt - now;
  return { visible: true, remainingMs, beat: reconnect || reduced || seen ? 'settled' : elapsed < 300 ? 'enter' : remainingMs <= 200 ? 'exit' : 'settled' };
}
