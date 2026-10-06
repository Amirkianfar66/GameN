import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tallyElection, tallyJailVote, tallyReleaseVote } from '../dist/full-game/votes.js';

const voters = ['seat-1', 'seat-2', 'seat-3', 'seat-4'];
const targets = ['seat-1', 'seat-2'];
const ballot = (voterSeatId, targetSeatId) => ({ voterSeatId, targetSeatId });
// Voter/target sets and absent/abstaining ballots are explicit arithmetic inputs.
// These arithmetic tests do not themselves open, close or advance voting phases.

test('Jail uses all eligible voters as denominator and accepts exactly fifty percent', () => {
  const equalHalf = tallyJailVote({ eligibleVoters: voters, eligibleTargets: targets, ballots: [ballot('seat-1', 'seat-2'), ballot('seat-2', 'seat-2')] });
  assert.equal(equalHalf.jailedSeatId, 'seat-2');
  assert.equal(equalHalf.eligibleVoterCount, 4);
  assert.deepEqual(equalHalf.counts, { 'seat-1': 0, 'seat-2': 2 });
  const onlyCast = tallyJailVote({ eligibleVoters: voters, eligibleTargets: targets, ballots: [ballot('seat-1', 'seat-2')] });
  assert.equal(onlyCast.jailedSeatId, null);
  const odd = tallyJailVote({ eligibleVoters: [...voters, 'seat-5'], eligibleTargets: targets, ballots: [ballot('seat-1', 'seat-2'), ballot('seat-2', 'seat-2')] });
  assert.equal(odd.jailedSeatId, null);
});

test('Jail ties cause no jail even when both reach fifty percent', () => {
  const result = tallyJailVote({ eligibleVoters: voters, eligibleTargets: targets, ballots: [ballot('seat-1', 'seat-1'), ballot('seat-2', 'seat-1'), ballot('seat-3', 'seat-2'), ballot('seat-4', 'seat-2')] });
  assert.equal(result.jailedSeatId, null);
  assert.deepEqual(result.counts, { 'seat-1': 2, 'seat-2': 2 });
});

test('Captain election uses plurality without a majority threshold and returns positive-vote runoff ties', () => {
  const belowHalf = tallyElection({ eligibleVoters: voters, eligibleTargets: targets, ballots: [ballot('seat-1', 'seat-2')] });
  assert.equal(belowHalf.winnerSeatId, 'seat-2');
  assert.deepEqual(belowHalf.tiedSeatIds, []);
  const tied = tallyElection({ eligibleVoters: voters, eligibleTargets: targets, ballots: [ballot('seat-1', 'seat-2'), ballot('seat-2', 'seat-1')] });
  assert.equal(tied.winnerSeatId, null);
  assert.deepEqual(tied.tiedSeatIds, ['seat-1', 'seat-2']);
});

test('empty and all-abstain arithmetic invents no winner or runoff policy', () => {
  for (const eligibleVoters of [[], voters]) {
    const input = { eligibleVoters, eligibleTargets: targets, ballots: eligibleVoters.map(voterSeatId => ballot(voterSeatId, null)) };
    assert.equal(tallyJailVote(input).jailedSeatId, null);
    assert.equal(tallyElection(input).winnerSeatId, null);
    assert.deepEqual(tallyElection(input).tiedSeatIds, []);
  }
  assert.equal(tallyElection({ eligibleVoters: voters, eligibleTargets: [], ballots: [] }).winnerSeatId, null);
});

test('release succeeds at exactly half of all eligible voters and missing/no votes never shrink denominator', () => {
  assert.deepEqual(tallyReleaseVote({ eligibleVoters: voters, ballots: [{ voterSeatId: 'seat-1', approve: true }, { voterSeatId: 'seat-2', approve: true }] }), { released: true, yesCount: 2, eligibleVoterCount: 4 });
  assert.deepEqual(tallyReleaseVote({ eligibleVoters: voters, ballots: [{ voterSeatId: 'seat-1', approve: true }, { voterSeatId: 'seat-2', approve: null }, { voterSeatId: 'seat-3', approve: false }] }), { released: false, yesCount: 1, eligibleVoterCount: 4 });
  assert.deepEqual(tallyReleaseVote({ eligibleVoters: [], ballots: [] }), { released: false, yesCount: 0, eligibleVoterCount: 0 });
});

test('duplicate and ineligible voters/targets are rejected rather than counted', () => {
  const source = { eligibleVoters: voters, eligibleTargets: targets, ballots: [ballot('seat-1', 'seat-2')] };
  for (const tally of [tallyElection, tallyJailVote]) {
    assert.throws(() => tally({ ...source, ballots: [ballot('seat-1', 'seat-2'), ballot('seat-1', null)] }));
    assert.throws(() => tally({ ...source, ballots: [ballot('seat-9', 'seat-2')] }));
    assert.throws(() => tally({ ...source, ballots: [ballot('seat-1', 'seat-3')] }));
    assert.throws(() => tally({ ...source, eligibleVoters: ['seat-1', 'seat-1'] }));
    assert.throws(() => tally({ ...source, eligibleTargets: ['seat-2', 'seat-2'] }));
    assert.throws(() => tally({ ...source, eligibleTargets: ['seat-10'] }));
  }
  assert.throws(() => tallyReleaseVote({ eligibleVoters: voters, ballots: [{ voterSeatId: 'seat-1', approve: true }, { voterSeatId: 'seat-1', approve: false }] }));
  assert.throws(() => tallyReleaseVote({ eligibleVoters: voters, ballots: [{ voterSeatId: 'seat-9', approve: true }] }));
  assert.throws(() => tallyReleaseVote({ eligibleVoters: voters, ballots: [{ voterSeatId: 'seat-1', approve: 'yes' }] }));
});

test('tallies preserve inputs and results do not depend on ballot arrival order', () => {
  const source = { eligibleVoters: voters, eligibleTargets: targets, ballots: [ballot('seat-1', 'seat-2'), ballot('seat-2', 'seat-2'), ballot('seat-3', 'seat-1')] };
  const saved = structuredClone(source);
  for (const tally of [tallyElection, tallyJailVote]) {
    assert.deepEqual(tally(source), tally({ ...source, ballots: [...source.ballots].reverse() }));
  }
  assert.deepEqual(source, saved);
});
