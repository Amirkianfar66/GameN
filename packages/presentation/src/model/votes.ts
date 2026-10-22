import type { FullPlayerView, FullPublicView, SeatId } from '@mothership/contracts';
import { en } from '../copy/en.js';
import { isSeatId, seatNumber } from './common.js';
import type { AudienceFacts, VotePanelModel } from './types.js';

// What a screen may say about voting. Two audiences, kept apart:
//   - every audience: what is being voted on and the count the server publishes at closure;
//   - one player, in the open private panel: that player's own ballot.
// Nothing here counts a vote or decides one. The numbers and the seat a count names are the
// server's; this module puts them into words.

type Tally = NonNullable<FullPublicView['lastTally']>;
type VotingFacts = Pick<FullPublicView, 'phase' | 'activeSeatId' | 'ballot' | 'lastTally'>;

/** Only a wire protocol 2 view carries voting facts. */
function votingFacts(view: AudienceFacts): VotingFacts | null {
  return 'ballot' in view ? view : null;
}

const bySeat = (a: SeatId, b: SeatId): number => seatNumber(a) - seatNumber(b);
const names = (seatIds: readonly SeatId[]): string => [...seatIds].sort(bySeat).map(seatId => en.seat.label(seatNumber(seatId))).join(', ');

function buildCurrent(facts: VotingFacts): VotePanelModel['current'] {
  const { ballot, phase } = facts;
  const voters = en.vote.voters(ballot.eligibleVoters.length);
  switch (phase.kind) {
    case 'CAPTAIN_ELECTION':
      return { title: en.phase.kind[phase.kind], lines: [ballot.eligibleTargets.length > 0 ? en.vote.candidates(names(ballot.eligibleTargets)) : en.vote.noCandidates, voters] };
    case 'JAIL_VOTE':
      return { title: en.phase.kind[phase.kind], lines: [ballot.eligibleTargets.length > 0 ? en.vote.jailTargets(names(ballot.eligibleTargets)) : en.vote.noJailTargets, voters] };
    case 'RELEASE_CHOICE':
      // The seat the server names as active in this phase is the one that may choose.
      return { title: en.phase.kind[phase.kind], lines: [
        ...(facts.activeSeatId === null ? [] : [en.vote.releaseChooser(seatNumber(facts.activeSeatId))]),
        ...(ballot.eligibleTargets.length > 0 ? [en.vote.releaseCandidates(names(ballot.eligibleTargets))] : []),
      ] };
    case 'RELEASE_VOTE':
      return { title: en.phase.kind[phase.kind], lines: [
        ...(ballot.releaseTargetSeatId === null ? [] : [en.vote.releaseSubject(seatNumber(ballot.releaseTargetSeatId))]),
        voters,
      ] };
    default:
      return null;
  }
}

/**
 * What the count decided, in one sentence, exactly as the tally names it: the seat it
 * selected in an election or a Jail vote, and whether a release was granted. Null when the
 * tally does not say.
 */
export function tallyResult(tally: Tally): string | null {
  const selected = tally.selectedSeatId === null ? null : seatNumber(tally.selectedSeatId);
  switch (tally.kind) {
    case 'CAPTAIN_ELECTION': return selected === null ? en.vote.tally.nobodyElected : en.vote.tally.elected(selected);
    case 'JAIL_VOTE': return selected === null ? en.vote.tally.nobodyJailed : en.vote.tally.jailed(selected);
    case 'RELEASE_VOTE':
      if (selected === null || tally.released === null) return null;
      return tally.released ? en.vote.tally.released(selected) : en.vote.tally.notReleased(selected);
  }
}

function buildTally(tally: Tally): NonNullable<VotePanelModel['lastTally']> {
  const counts = Object.entries(tally.counts)
    .flatMap(([seatId, votes]) => (isSeatId(seatId) && typeof votes === 'number' ? [{ seatId, label: en.seat.label(seatNumber(seatId)), votes }] : []))
    .sort((a, b) => bySeat(a.seatId, b.seatId));
  const result = tallyResult(tally);
  const lines: string[] = [];
  if (tally.kind === 'RELEASE_VOTE') {
    if (tally.selectedSeatId !== null) lines.push(en.vote.tally.releaseSubject(seatNumber(tally.selectedSeatId)));
    if (tally.yesCount !== null) lines.push(en.vote.tally.yes(tally.yesCount, tally.eligibleVoterCount));
  } else {
    lines.push(en.vote.tally.voters(tally.eligibleVoterCount));
    // Plain arithmetic on the published numbers: those who could vote, less the votes counted for a seat.
    const counted = counts.reduce((sum, row) => sum + row.votes, 0);
    if (counted <= tally.eligibleVoterCount) lines.push(en.vote.tally.votedForNobody(tally.eligibleVoterCount - counted));
  }
  if (result !== null) lines.push(result);
  return { heading: en.vote.tally.heading, title: en.phase.kind[tally.kind], counts, lines };
}

/** The public facts of a vote, for a phone and for the shared display alike. Null when there is nothing to say. */
export function buildVotePanel(view: AudienceFacts): VotePanelModel | null {
  const facts = votingFacts(view);
  if (facts === null) return null;
  const current = buildCurrent(facts);
  const lastTally = facts.lastTally === null ? null : buildTally(facts.lastTally);
  return current === null && lastTally === null ? null : { heading: en.vote.heading, current, lastTally };
}

/** The latest published count of a view, or null. Used to notice that a new one has arrived. */
export function publishedTally(view: AudienceFacts): Tally | null {
  return votingFacts(view)?.lastTally ?? null;
}

/**
 * The player's own ballot in the vote that is open, as the server's view states it, or null
 * while the view does not say the player has voted. Private to that player.
 */
export function ownBallotLine(view: FullPlayerView): string | null {
  if (!view.hasVoted) return null;
  const ballot = view.ownBallot;
  if (ballot === null) return en.action.ballot.own.abstained;
  if (typeof ballot === 'boolean') return ballot ? en.action.ballot.own.yes : en.action.ballot.own.no;
  return en.action.ballot.own.seat(en.action.who(seatNumber(ballot), ballot === view.self.seatId));
}

/** Seats that may vote in the open vote, by the public ballot. Empty outside a vote and for a view without voting facts. */
export function eligibleVoters(view: AudienceFacts): readonly SeatId[] {
  return votingFacts(view)?.ballot.eligibleVoters ?? [];
}
