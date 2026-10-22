import type { SeatId } from '@mothership/contracts';

export interface TargetVoteInput {
  // Eligibility and ballot replacement policy belong to the approved phase handler.
  eligibleVoters: SeatId[];
  eligibleTargets: SeatId[];
  ballots: Array<{ voterSeatId: SeatId; targetSeatId: SeatId | null }>;
}

export interface VoteCounts {
  counts: Record<string, number>;
  eligibleVoterCount: number;
}

function uniqueEligible(seats: SeatId[], name: string): void {
  if (new Set(seats).size !== seats.length || seats.some(seat => !/^seat-[1-9]$/.test(seat))) {
    throw new Error(`${name} must contain unique canonical seat IDs`);
  }
}

function countTargets({ eligibleVoters, eligibleTargets, ballots }: TargetVoteInput): VoteCounts {
  uniqueEligible(eligibleVoters, 'Eligible voters');
  uniqueEligible(eligibleTargets, 'Eligible targets');
  const counts = Object.fromEntries(eligibleTargets.map(seatId => [seatId, 0]));
  const seen = new Set<SeatId>();
  for (const ballot of ballots) {
    if (!eligibleVoters.includes(ballot.voterSeatId) || seen.has(ballot.voterSeatId)) throw new Error('Duplicate or ineligible voter');
    seen.add(ballot.voterSeatId);
    if (ballot.targetSeatId !== null) {
      if (!eligibleTargets.includes(ballot.targetSeatId)) throw new Error('Ineligible vote target');
      counts[ballot.targetSeatId]! += 1;
    }
  }
  return { counts, eligibleVoterCount: eligibleVoters.length };
}

function leaders(counts: Record<string, number>): SeatId[] {
  const highest = Math.max(0, ...Object.values(counts));
  // This reports arithmetic only; no all-abstain Captain fallback is approved.
  if (highest === 0) return [];
  return Object.keys(counts).filter(seatId => counts[seatId] === highest).sort() as SeatId[];
}

export function tallyJailVote(input: TargetVoteInput): VoteCounts & { jailedSeatId: SeatId | null } {
  const result = countTargets(input);
  const top = leaders(result.counts);
  const seatId = top[0];
  return {
    ...result,
    jailedSeatId: top.length === 1 && seatId !== undefined
      && result.counts[seatId]! * 2 >= result.eligibleVoterCount ? seatId : null,
  };
}

export function tallyElection(input: TargetVoteInput): VoteCounts & { winnerSeatId: SeatId | null; tiedSeatIds: SeatId[] } {
  const result = countTargets(input);
  const top = leaders(result.counts);
  return { ...result, winnerSeatId: top.length === 1 ? top[0]! : null, tiedSeatIds: top.length > 1 ? top : [] };
}

export function tallyReleaseVote({ eligibleVoters, ballots }: {
  eligibleVoters: SeatId[];
  ballots: Array<{ voterSeatId: SeatId; approve: boolean | null }>;
}): { released: boolean; yesCount: number; eligibleVoterCount: number } {
  uniqueEligible(eligibleVoters, 'Eligible voters');
  const seen = new Set<SeatId>();
  let yesCount = 0;
  for (const ballot of ballots) {
    if (!eligibleVoters.includes(ballot.voterSeatId) || seen.has(ballot.voterSeatId)) throw new Error('Duplicate or ineligible voter');
    if (ballot.approve !== true && ballot.approve !== false && ballot.approve !== null) throw new Error('Invalid release ballot');
    seen.add(ballot.voterSeatId);
    if (ballot.approve === true) yesCount += 1;
  }
  return { released: eligibleVoters.length > 0 && yesCount * 2 >= eligibleVoters.length, yesCount, eligibleVoterCount: eligibleVoters.length };
}
