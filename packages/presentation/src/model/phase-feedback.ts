import type { FullVoteResult } from '@mothership/contracts';
import { isCurrent, isSeatId, seatNumber } from './common.js';
import type { AudienceFacts, PhaseFacts, ShellEnvironment, VoteResultModel } from './types.js';

// Connected readers validate the exact tuple/current-phase association with the shared
// schema before this consumer receives it. No independently widened wire type is used.
export type VoteResultFacts = FullVoteResult;
export const voteResultOf = (view: AudienceFacts): FullVoteResult | null => 'voteResult' in view ? view.voteResult ?? null : null;

const HEADINGS = {
  CAPTAIN_ELECTED: 'Captain chosen', RUNOFF_REQUIRED: 'Runoff required', NO_CAPTAIN_ELECTED: 'No Captain chosen',
  PLAYER_JAILED: 'Jail vote result', NO_JAIL_SELECTION: 'No one selected for Jail',
  PLAYER_RELEASED: 'Release approved', RELEASE_DENIED: 'Release denied',
} as const satisfies Record<VoteResultModel['outcome'], string>;

/** Copy follows the explicit outcome, never a maximum/count or the next round's phase. */
export function voteResultSummary(result: VoteResultFacts): string {
  const selected = result.selectedSeatId === null ? null : `Player ${seatNumber(result.selectedSeatId)}`;
  switch (result.outcome) {
    case 'CAPTAIN_ELECTED': return `${selected} is Captain.`;
    case 'RUNOFF_REQUIRED': return 'The vote is tied. A new runoff follows.';
    case 'NO_CAPTAIN_ELECTED': return 'The vote selected no Captain.';
    case 'PLAYER_JAILED': return `${selected} goes to Jail.`;
    case 'NO_JAIL_SELECTION': return result.tiedSeatIds.length > 0 ? 'The vote is tied. No one goes to Jail.' : 'The vote selected no one for Jail.';
    case 'PLAYER_RELEASED': return `${selected} is released.`;
    case 'RELEASE_DENIED': return `${selected} is not released.`;
  }
}

export function buildVoteResult(
  result: VoteResultFacts | null,
  phase: PhaseFacts,
  environment: ShellEnvironment,
): VoteResultModel | null {
  if (result === null || phase.kind !== 'VOTE_RESULT' || phase.id !== result.id
    || phase.startedAt !== result.startedAt || phase.endsAt !== result.endsAt
    || !isCurrent(environment) || environment.deadline.kind !== 'running') return null;
  const counts = Object.entries(result.counts).flatMap(([seatId, votes]) => isSeatId(seatId) && typeof votes === 'number' ? [{ seatId, votes }] : [])
    .sort((a, b) => seatNumber(a.seatId) - seatNumber(b.seatId));
  const lines = result.kind === 'RELEASE_VOTE'
    ? result.yesCount === null ? [] : [`${result.yesCount} Yes · ${result.eligibleVoterCount} eligible voters`]
    : [`${result.eligibleVoterCount} eligible voters`, `${result.eligibleVoterCount - counts.reduce((total, count) => total + count.votes, 0)} abstentions or missing ballots`];
  return { id: result.id, round: result.round, kind: result.kind, outcome: result.outcome, heading: HEADINGS[result.outcome],
    summary: voteResultSummary(result), selectedSeatId: result.selectedSeatId, tiedSeatIds: [...result.tiedSeatIds].sort((a,b) => seatNumber(a)-seatNumber(b)), counts, lines };
}
