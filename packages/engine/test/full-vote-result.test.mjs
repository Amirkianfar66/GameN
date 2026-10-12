import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FullPlayerViewSchema, FullPublicViewSchema, FullReceiptSchema } from '@mothership/contracts';
import {
  VOTE_RESULT_FULL_GAME_VERSION_PINS as FULL_GAME_VERSION_PINS, RESOLUTION_FULL_GAME_VERSION_PINS, CAPACITY_FULL_GAME_VERSION_PINS,
  PASS_FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS,
  createFullGame, executeFullGame, advanceFullGame, abortFullGame, projectFullGame,
} from '../dist/index.js';

// Issue #119 acceptance against docs/backend/playtest-feedback-contract.md at
// accdf01002686abc4b3da4cab7fb03da6ba6a0ae. New cases pin the explicit 1.4 vote tuple;
// the four saved tuples are separate compatibility cases. No service receipt or
// human balance claim follows from these pure-engine tests.
const START = 1_800_000_000_000;
const ASSETS = 'vote-result-fixture-assets-v1';
const ROLES = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien'];
const OUTCOMES = new Set(['CAPTAIN_ELECTED', 'RUNOFF_REQUIRED', 'NO_CAPTAIN_ELECTED',
  'PLAYER_JAILED', 'NO_JAIL_SELECTION', 'PLAYER_RELEASED', 'RELEASE_DENIED']);
const RESULT_KEYS = ['id', 'votePhaseId', 'round', 'kind', 'startedAt', 'endsAt', 'outcome',
  'tiedSeatIds', 'counts', 'eligibleVoterCount', 'yesCount', 'selectedSeatId', 'released'].sort();
const byId = (state, id) => state.seats.find(seat => seat.seatId === id);

function views(state) {
  const result = projectFullGame(state);
  FullPublicViewSchema.parse(result.public);
  for (const view of Object.values(result.players)) FullPlayerViewSchema.parse(view);
  return result;
}
function driver(count, pins = FULL_GAME_VERSION_PINS) {
  let serial = 0;
  const roleOrder = [...ROLES, ...(count >= 8 ? ['Red Disabler'] : []), ...(count === 9 ? ['Officer'] : [])];
  const ids = roleOrder.map((_, index) => `seat-${index + 1}`);
  const initial = createFullGame({ matchId: 'vote-result-fixture', now: START,
    phaseId: 'phase-start', deadlineToken: 'deadline-start', assetManifestVersion: ASSETS,
    versions: { ...pins, assetManifestVersion: ASSETS },
    setup: { playerCount: count, roleOrder, codeExtraSeatIds: ['seat-1', 'seat-2', 'seat-3'],
      initialRooms: Object.fromEntries(ids.map((id, index) => [id, index < 5 ? 'Room A' : 'Room B'])),
      roundOrders: Array.from({ length: 5 }, () => [...ids]) } });
  const visitedKinds = [initial.phase.kind];
  const context = now => ({ now, nextPhaseId: `phase-${++serial}`, nextDeadlineToken: `deadline-${serial}` });
  const request = (state, command) => ({ protocolVersion: 2, matchId: state.matchId,
    phaseId: state.phase.id, commandId: `command-${++serial}`, command });
  const apply = (state, actor, command, now = state.phase.startedAt + 1) => {
    const result = executeFullGame(state, actor, request(state, command), context(now));
    FullReceiptSchema.parse(result.receipt); return result;
  };
  const deadline = (state, now = state.phase.endsAt) => ({ ...context(now),
    phaseId: state.phase.id, deadlineToken: state.deadlineToken });
  const tick = (state, delay = 0) => {
    assert.notEqual(state.phase.endsAt, null, 'Reach the requested checkpoint before a terminal state');
    const result = advanceFullGame(state, deadline(state, state.phase.endsAt + delay));
    assert.equal(result.advanced, true);
    visitedKinds.push(result.state.phase.kind); views(result.state);
    return result.state;
  };
  const until = (state, predicate) => {
    let current = state;
    for (let step = 0; !predicate(current); step++) {
      assert.ok(step < 500, 'Canonical lifecycle did not reach the bounded checkpoint');
      current = tick(current);
    }
    return current;
  };
  return { initial, context, request, apply, deadline, tick, until, visitedKinds };
}
function accepted(result) {
  assert.equal(result.receipt.status, 'accepted'); assert.equal(result.receipt.code, 'REGISTERED');
  return result.state;
}
function rejected(result, before, code = 'NOT_ALLOWED') {
  assert.equal(result.receipt.status, 'rejected'); assert.equal(result.receipt.code, code);
  assert.strictEqual(result.state, before, 'Rejected input leaves all engine state unchanged');
}
function targetBallots(d, state, voters, targetSeatId) {
  for (const actor of voters) state = accepted(d.apply(state, actor, { type: 'VOTE', targetSeatId }));
  return state;
}
function countsFor(vote, entries = []) {
  const result = Object.fromEntries(vote.eligibleTargets.map(id => [id, 0]));
  for (const [id, total] of entries) result[id] = total;
  return result;
}
function assertOutsideResult(state, historical = false) {
  const result = views(state);
  for (const view of [result.public, ...Object.values(result.players)]) {
    if (historical) assert.equal(Object.hasOwn(view, 'voteResult'), false);
    else assert.equal(view.voteResult, null);
  }
}
function assertResult(state, vote, closureTime, expected) {
  assert.equal(state.phase.kind, 'VOTE_RESULT');
  assert.equal(state.phase.startedAt, closureTime);
  assert.equal(state.phase.endsAt, closureTime + 5000);
  assert.equal(state.activeSeatId, null);
  assert.deepEqual(state.ballots, []); assert.deepEqual(state.eligibleVoters, []); assert.deepEqual(state.eligibleTargets, []);
  const projected = views(state), result = projected.public.voteResult;
  assert.deepEqual(Object.keys(result).sort(), RESULT_KEYS);
  assert.equal(result.id, state.phase.id); assert.equal(result.votePhaseId, vote.phase.id);
  assert.equal(result.round, vote.round); assert.equal(result.kind, vote.phase.kind);
  assert.equal(result.startedAt, closureTime); assert.equal(result.endsAt, closureTime + 5000);
  assert.ok(OUTCOMES.has(result.outcome)); assert.ok(Array.isArray(result.tiedSeatIds));
  for (const [key, value] of Object.entries(expected)) assert.deepEqual(result[key], value, key);
  assert.deepEqual(state.lastTally, Object.fromEntries(['kind', 'counts', 'eligibleVoterCount',
    'yesCount', 'selectedSeatId', 'released'].map(key => [key, result[key]])));
  for (const view of Object.values(projected.players)) {
    assert.deepEqual(view.voteResult, result);
    assert.deepEqual(view.legalTargets, {});
    assert.deepEqual(view.self.movementDestinations, []);
    for (const field of ['releaseVoteAvailable', 'shotAvailable', 'disablerAvailable', 'hackAvailable',
      'scanAvailable', 'codeAttemptAvailable']) assert.equal(view.self[field], false, field);
    assert.equal(view.ownBallot, null); assert.equal(view.hasVoted, false);
  }
  assert.equal(projected.public.endReveal, null);
  assert.equal(projected.public.result, null);
  const publicBytes = JSON.stringify(projected.public);
  for (const privateKey of ['"voterSeatId"', '"ballots"', '"queued"', '"knowledge"']) {
    assert.equal(publicBytes.includes(privateKey), false, privateKey);
  }
  return result;
}
function closeVote(d, vote, expected, delay = 0) {
  const before = structuredClone(vote), context = d.deadline(vote, vote.phase.endsAt + delay);
  const outcome = advanceFullGame(vote, context);
  assert.equal(outcome.advanced, true); assert.deepEqual(vote, before);
  assert.deepEqual(advanceFullGame(JSON.parse(JSON.stringify(before)), context), outcome);
  assertResult(outcome.state, vote, context.now, expected);
  const duplicate = advanceFullGame(outcome.state, { ...context, now: context.now + 100_000 });
  assert.equal(duplicate.advanced, false); assert.strictEqual(duplicate.state, outcome.state);
  return { state: outcome.state, context };
}
function finishResult(d, state, nextKind, delay = 0) {
  const before = structuredClone(state), context = d.deadline(state, state.phase.endsAt + delay);
  const result = advanceFullGame(state, context);
  assert.equal(result.advanced, true); assert.deepEqual(state, before);
  // This verifies durable continuation without naming or exposing its private storage field.
  assert.deepEqual(advanceFullGame(JSON.parse(JSON.stringify(before)), context), result);
  assert.equal(result.state.phase.kind, nextKind);
  assert.equal(result.state.phase.startedAt, context.now);
  if (result.state.phase.endsAt !== null) assert.equal(result.state.phase.endsAt, context.now + 60_000);
  assertOutsideResult(result.state);
  const duplicate = advanceFullGame(result.state, { ...context, now: context.now + 100_000 });
  assert.equal(duplicate.advanced, false); assert.strictEqual(duplicate.state, result.state);
  return result.state;
}
function election(d) {
  return d.until(d.initial, state => state.phase.kind === 'CAPTAIN_ELECTION');
}
function prisonerAndCaptain(d) {
  let vote = d.until(d.initial, state => state.phase.kind === 'JAIL_VOTE');
  vote = targetBallots(d, vote, vote.eligibleVoters.slice(0, Math.ceil(vote.eligibleVoters.length / 2)), 'seat-6');
  let state = d.tick(vote);
  state = d.until(state, current => current.phase.kind === 'CAPTAIN_ELECTION');
  state = targetBallots(d, state, ['seat-1'], 'seat-1');
  state = d.tick(state);
  return d.until(state, current => current.phase.kind === 'RELEASE_CHOICE');
}
function releaseVote(d) {
  const choice = prisonerAndCaptain(d);
  const requested = accepted(d.apply(choice, 'seat-1', { type: 'RELEASE_CHOICE', targetSeatId: 'seat-6' }));
  assert.equal(requested.releaseUsed, true);
  const vote = requested.phase.kind === 'RELEASE_VOTE' ? requested : d.tick(requested);
  assert.equal(vote.phase.kind, 'RELEASE_VOTE');
  return vote;
}

for (const count of [7, 8, 9]) {
  test(`${count}: Captain outcome has durable identity, exact 4999/5000 boundary and a full next turn`, () => {
    const d = driver(count), live = election(d);
    assertOutsideResult(live);
    const vote = targetBallots(d, live, ['seat-1'], 'seat-1');
    const result = closeVote(d, vote, { outcome: 'CAPTAIN_ELECTED', tiedSeatIds: [],
      counts: countsFor(vote, [['seat-1', 1]]), eligibleVoterCount: count, yesCount: null,
      selectedSeatId: 'seat-1', released: null });
    assert.equal(byId(result.state, 'seat-1').captain, true);
    assert.equal(byId(result.state, 'seat-1').location, 'Command Room');
    assert.equal(byId(result.state, 'seat-1').movedInRound, false);
    const early = advanceFullGame(result.state, d.deadline(result.state, result.state.phase.startedAt + 4999));
    assert.equal(early.advanced, false); assert.strictEqual(early.state, result.state);
    const reconnected = views(JSON.parse(JSON.stringify(result.state))).public;
    assert.deepEqual(reconnected.voteResult, views(result.state).public.voteResult);
    assert.equal(reconnected.phase.endsAt - (result.state.phase.startedAt + 4999), 1);
    const after = finishResult(d, result.state, 'ORDINARY_TURN');
    assert.equal(after.round, vote.round);
    assert.equal(after.activeSeatId, after.turnOrder[0]);
    rejected(executeFullGame(result.state, 'seat-1', { ...d.request(result.state, { type: 'PASS_TURN' }),
      phaseId: vote.phase.id }, d.context(result.state.phase.startedAt + 1)), result.state, 'PHASE_CLOSED');
  });

  test(`${count}: each repeated positive election tie shows five seconds before a full runoff`, () => {
    const d = driver(count); let vote = election(d), previousResultId = null;
    for (let run = 0; run < 2; run++) {
      vote = targetBallots(d, vote, ['seat-1'], 'seat-1');
      vote = targetBallots(d, vote, ['seat-2'], 'seat-2');
      const result = closeVote(d, vote, { outcome: 'RUNOFF_REQUIRED', tiedSeatIds: ['seat-1', 'seat-2'],
        counts: countsFor(vote, [['seat-1', 1], ['seat-2', 1]]), eligibleVoterCount: count,
        yesCount: null, selectedSeatId: null, released: null }).state;
      assert.notEqual(result.phase.id, previousResultId); previousResultId = result.phase.id;
      assert.equal(result.seats.some(seat => seat.captain), false);
      vote = finishResult(d, result, 'CAPTAIN_ELECTION', 17_000);
      assert.deepEqual(vote.eligibleTargets, ['seat-1', 'seat-2']);
      assert.equal(vote.round, result.round);
    }
    vote = targetBallots(d, vote, ['seat-3'], 'seat-2');
    const elected = closeVote(d, vote, { outcome: 'CAPTAIN_ELECTED', tiedSeatIds: [],
      counts: countsFor(vote, [['seat-2', 1]]), eligibleVoterCount: count, yesCount: null,
      selectedSeatId: 'seat-2', released: null }).state;
    assert.equal(byId(finishResult(d, elected, 'ORDINARY_TURN'), 'seat-2').captain, true);
  });

  test(`${count}: an actual all-abstain Captain ballot has a result and assigns nobody`, () => {
    const d = driver(count), live = election(d);
    const vote = targetBallots(d, live, live.eligibleVoters, null);
    const result = closeVote(d, vote, { outcome: 'NO_CAPTAIN_ELECTED', tiedSeatIds: [],
      counts: countsFor(vote), eligibleVoterCount: count, yesCount: null, selectedSeatId: null, released: null }).state;
    assert.equal(result.seats.some(seat => seat.captain), false);
    const next = finishResult(d, result, 'ORDINARY_TURN');
    assert.equal(next.seats.some(seat => seat.captain), false);
  });

  test(`${count}: Jail applies once at closure, then registered damage survives actor Jail and resolves once`, () => {
    const d = driver(count);
    const turn = d.until(d.initial, state => state.phase.kind === 'ORDINARY_TURN' && state.activeSeatId === 'seat-3');
    const registered = accepted(d.apply(turn, 'seat-3', { type: 'DISABLE', targetSeatId: 'seat-1' }));
    let vote = d.until(registered, state => state.phase.kind === 'JAIL_VOTE');
    const threshold = Math.ceil(vote.eligibleVoters.length / 2);
    vote = targetBallots(d, vote, vote.eligibleVoters.slice(0, threshold), 'seat-3');
    const result = closeVote(d, vote, { outcome: 'PLAYER_JAILED', tiedSeatIds: [],
      counts: countsFor(vote, [['seat-3', threshold]]), eligibleVoterCount: count, yesCount: null,
      selectedSeatId: 'seat-3', released: null }).state;
    assert.equal(byId(result, 'seat-3').jailed, true); assert.equal(byId(result, 'seat-3').location, 'Jail');
    assert.equal(byId(result, 'seat-1').health, 'Healthy');
    assert.equal(result.round, 1); assert.equal(result.queued.length, 1);
    const after = finishResult(d, result, 'CAPTAIN_ELECTION');
    assert.equal(byId(after, 'seat-1').health, 'Injured'); assert.equal(byId(after, 'seat-1').location, 'Hospital');
    assert.equal(byId(after, 'seat-3').disablerSpent, true); assert.equal(byId(after, 'seat-3').jailed, true);
    assert.equal(after.queued.length, 0); assert.equal(after.round, 2);
  });

  test(`${count}: the deferred checkpoint preserves registered attack before Rescue`, () => {
    const d = driver(count);
    const rescueTurn = d.until(d.initial, state => state.phase.kind === 'ORDINARY_TURN' && state.activeSeatId === 'seat-2');
    const rescued = accepted(d.apply(rescueTurn, 'seat-2', { type: 'RESCUE', targetSeatId: 'seat-1' }));
    const attackTurn = d.until(rescued, state => state.phase.kind === 'ORDINARY_TURN' && state.activeSeatId === 'seat-3');
    const registered = accepted(d.apply(attackTurn, 'seat-3', { type: 'DISABLE', targetSeatId: 'seat-1' }));
    const vote = d.until(registered, state => state.phase.kind === 'JAIL_VOTE');
    const result = closeVote(d, vote, { outcome: 'NO_JAIL_SELECTION' }).state;
    assert.equal(result.queued.length, 2); assert.equal(byId(result, 'seat-1').health, 'Healthy');
    assert.equal(byId(result, 'seat-2').rescuesRemaining, 1);
    const after = finishResult(d, result, 'CAPTAIN_ELECTION');
    assert.equal(byId(after, 'seat-1').health, 'Healthy');
    assert.equal(byId(after, 'seat-1').location, 'Room A');
    assert.equal(byId(after, 'seat-2').rescuesRemaining, 1);
    assert.equal(byId(after, 'seat-3').disablerSpent, true);
    assert.equal(after.queued.length, 0);
  });

  test(`${count}: all-abstain, below-threshold and tied Jail ballots publish no selection`, () => {
    for (const variant of ['abstain', 'below', 'tie']) {
      const d = driver(count); let vote = d.until(d.initial, state => state.phase.kind === 'JAIL_VOTE'), entries = [];
      if (variant === 'abstain') {
        vote = targetBallots(d, vote, vote.eligibleVoters, null);
      } else if (variant === 'below') {
        const total = Math.ceil(count / 2) - 1;
        vote = targetBallots(d, vote, vote.eligibleVoters.slice(0, total), 'seat-1'); entries = [['seat-1', total]];
      } else if (variant === 'tie') {
        const total = Math.floor(count / 2);
        vote = targetBallots(d, vote, vote.eligibleVoters.slice(0, total), 'seat-1');
        vote = targetBallots(d, vote, vote.eligibleVoters.slice(total, total * 2), 'seat-2');
        entries = [['seat-1', total], ['seat-2', total]];
      }
      const result = closeVote(d, vote, { outcome: 'NO_JAIL_SELECTION', tiedSeatIds: variant === 'tie' ? ['seat-1', 'seat-2'] : [],
        counts: countsFor(vote, entries),
        eligibleVoterCount: count, yesCount: null, selectedSeatId: null, released: null }).state;
      assert.equal(result.seats.some(seat => seat.jailed), false);
      finishResult(d, result, 'CAPTAIN_ELECTION');
    }
  });

  test(`${count}: release approval, denial and abstention display once before the full Jail vote`, () => {
    for (const variant of ['approved', 'denied', 'abstain']) {
      const d = driver(count); let vote = releaseVote(d);
      const threshold = Math.ceil(count / 2);
      const yesCount = variant === 'approved' ? threshold : variant === 'denied' ? threshold - 1 : 0;
      for (const [index, actor] of vote.eligibleVoters.entries()) {
        vote = accepted(d.apply(vote, actor, { type: 'RELEASE_VOTE', approve: variant === 'abstain' ? null : index < yesCount }));
        assert.equal(vote.phase.kind, 'RELEASE_VOTE', 'Even a complete ballot waits for its server deadline');
      }
      const released = variant === 'approved';
      const result = closeVote(d, vote, { outcome: released ? 'PLAYER_RELEASED' : 'RELEASE_DENIED',
        tiedSeatIds: [], counts: {}, eligibleVoterCount: count, yesCount, selectedSeatId: 'seat-6', released }).state;
      assert.equal(result.releaseUsed, true); assert.equal(byId(result, 'seat-6').jailed, !released);
      assert.equal(byId(result, 'seat-6').location, released ? 'Room B' : 'Jail');
      finishResult(d, result, 'JAIL_VOTE');
    }
  });

  test(`${count}: a skipped release choice invents no vote result and consumes no release request`, () => {
    const d = driver(count), choice = prisonerAndCaptain(d);
    const skipped = accepted(d.apply(choice, 'seat-1', { type: 'RELEASE_CHOICE', targetSeatId: null }));
    const jail = d.tick(skipped);
    assert.equal(jail.phase.kind, 'JAIL_VOTE'); assert.equal(jail.releaseUsed, false);
    assertOutsideResult(jail);
    assert.equal(byId(jail, 'seat-6').jailed, true);
  });

  test(`${count}: late vote closure and late result delivery give complete fresh windows without extension on retries`, () => {
    const d = driver(count); let vote = election(d);
    vote = targetBallots(d, vote, ['seat-1'], 'seat-1');
    const result = closeVote(d, vote, { outcome: 'CAPTAIN_ELECTED', selectedSeatId: 'seat-1' }, 12_345);
    assert.equal(result.state.phase.startedAt, vote.phase.endsAt + 12_345);
    const next = finishResult(d, result.state, 'ORDINARY_TURN', 23_456);
    assert.equal(next.phase.startedAt, result.state.phase.endsAt + 23_456);
    const stale = advanceFullGame(next, { ...result.context, now: next.phase.endsAt + 100_000 });
    assert.equal(stale.advanced, false); assert.strictEqual(stale.state, next);
  });

  test(`${count}: Round 3 Supplier grants remain private and occur after the Jail result only once`, () => {
    const d = driver(count);
    const turn = d.until(d.initial, state => state.round === 3 && state.phase.kind === 'ORDINARY_TURN' && state.activeSeatId === 'seat-4');
    const registered = accepted(d.apply(turn, 'seat-4', { type: 'SUPPLY', targetSeatIds: ['seat-1', 'seat-2'] }));
    const vote = d.until(registered, state => state.phase.kind === 'JAIL_VOTE');
    const result = closeVote(d, vote, { outcome: 'NO_JAIL_SELECTION' }).state;
    assert.equal(byId(result, 'seat-1').ordinaryWeapons, 0); assert.equal(byId(result, 'seat-2').ordinaryWeapons, 0);
    assert.equal((result.supplierGrantResults ?? []).length, 0);
    assert.equal(JSON.stringify(views(result).public).includes('ordinaryWeapons'), false);
    const after = finishResult(d, result, 'CAPTAIN_ELECTION');
    assert.equal(byId(after, 'seat-1').ordinaryWeapons, 1); assert.equal(byId(after, 'seat-2').ordinaryWeapons, 1);
    assert.equal(after.supplierGrantResults.length, 1);
  });

  test(`${count}: Round 5 result blocks every gameplay command and Code before terminal disclosure`, () => {
    const d = driver(count), vote = d.until(d.initial, state => state.round === 5 && state.phase.kind === 'JAIL_VOTE');
    // A separate canonical branch proves that this same Hacker/Code request is legal
    // before the barrier; the tested main branch never accepts that submission.
    accepted(d.apply(vote, 'seat-6', { type: 'SUBMIT_CODE', seatIds: [...vote.code] }));
    assert.equal(vote.codeSubmitted, false);
    const result = closeVote(d, vote, { outcome: 'NO_JAIL_SELECTION' }).state;
    const before = structuredClone(result), publicBefore = views(result);
    const commands = [
      ['seat-1', { type: 'MOVE', destination: 'Room B' }],
      ['seat-1', { type: 'PASS_TURN' }],
      ['seat-1', { type: 'VOTE', targetSeatId: 'seat-1' }],
      ['seat-1', { type: 'RELEASE_CHOICE', targetSeatId: null }],
      ['seat-1', { type: 'RELEASE_VOTE', approve: true }],
      ['seat-3', { type: 'DISABLE', targetSeatId: 'seat-1' }],
      ['seat-2', { type: 'RESCUE', targetSeatId: 'seat-1' }],
      ['seat-5', { type: 'PROTECT', targetSeatId: 'seat-1' }],
      ['seat-4', { type: 'SUPPLY', targetSeatIds: ['seat-1', 'seat-2'] }],
      ['seat-6', { type: 'SCAN', targetSeatId: 'seat-6', guess: 'Red' }],
      ['seat-3', { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' }],
      ['seat-3', { type: 'SHOWDOWN_SHOT', targetSeatId: 'seat-1' }],
      ['seat-3', { type: 'REQUEST_HACK', targetSeatId: 'seat-1' }],
      ['seat-6', { type: 'SUBMIT_CODE', seatIds: [...result.code] }],
    ];
    for (const [actor, command] of commands) rejected(d.apply(result, actor, command), result);
    rejected(d.apply(result, 'seat-6', { type: 'SUBMIT_CODE', seatIds: [...result.code] }, result.phase.endsAt), result, 'PHASE_CLOSED');
    assert.deepEqual(result, before); assert.deepEqual(views(result), publicBefore);
    assert.equal(result.round, 5); assert.equal(result.result, null);
    const terminal = finishResult(d, result, 'FINISHED');
    assert.deepEqual(terminal.result, { winner: 'Blue', alienCoWinner: true });
    const finished = views(terminal);
    assert.equal(finished.public.endReveal.roles.length, count);
    assert.deepEqual([...finished.public.endReveal.code].sort(), [...terminal.code].sort());
  });

  test(`${count}: same aggregate outcome does not disclose which players cast the individual ballots`, () => {
    const d = driver(count), live = election(d);
    const publicBefore = views(live).public;
    let first = targetBallots(d, live, ['seat-1'], 'seat-1');
    first = targetBallots(d, first, ['seat-2'], 'seat-2');
    let second = targetBallots(d, live, ['seat-3'], 'seat-1');
    second = targetBallots(d, second, ['seat-4'], 'seat-2');
    assert.deepEqual(views(first).public, publicBefore); assert.deepEqual(views(second).public, publicBefore);
    const context = { now: live.phase.endsAt, phaseId: live.phase.id, deadlineToken: live.deadlineToken,
      nextPhaseId: 'phase-paired-vote-result', nextDeadlineToken: 'deadline-paired-vote-result' };
    const a = advanceFullGame(first, context), b = advanceFullGame(second, context);
    assert.equal(a.advanced, true); assert.equal(b.advanced, true);
    assert.deepEqual(views(a.state).public, views(b.state).public);
    assertResult(a.state, first, context.now, { outcome: 'RUNOFF_REQUIRED', tiedSeatIds: ['seat-1', 'seat-2'] });
    assertResult(b.state, second, context.now, { outcome: 'RUNOFF_REQUIRED', tiedSeatIds: ['seat-1', 'seat-2'] });
  });

  test(`${count}: synthetic no-candidate restore skips an election without fabricating its result`, () => {
    const d = driver(count), restored = structuredClone(d.initial);
    // Synthetic negative edge, not a damage-budget-reachable Round 1 history.
    // Exercise the approved no-candidate branch without inventing an election.
    for (const seat of restored.seats) seat.health = 'Injured';
    const jail = d.until(restored, state => state.phase.kind === 'JAIL_VOTE');
    const result = closeVote(d, jail, { outcome: 'NO_JAIL_SELECTION' }).state;
    const next = finishResult(d, result, 'ORDINARY_TURN');
    assert.equal(next.round, 2); assert.equal(next.seats.some(seat => seat.captain), false);
    assertOutsideResult(next);
  });

  test(`${count}: host-authorized engine abort clears the live result and prevents continuation`, () => {
    const d = driver(count), vote = d.until(d.initial, state => state.phase.kind === 'JAIL_VOTE');
    const result = closeVote(d, vote, { outcome: 'NO_JAIL_SELECTION' }).state;
    // Host authorization is the service's responsibility; this is its engine abort path.
    const aborted = abortFullGame(result, d.context(result.phase.startedAt + 100));
    assert.equal(aborted.phase.kind, 'ABORTED'); assert.equal(aborted.phase.endsAt, null);
    assert.equal(aborted.deadlineToken, null); assert.equal(aborted.result, null);
    assertOutsideResult(aborted);
    assert.equal(views(aborted).public.endReveal, null);
    const late = advanceFullGame(aborted, d.deadline(result, result.phase.endsAt + 10_000));
    assert.equal(late.advanced, false); assert.strictEqual(late.state, aborted);
    const restored = JSON.parse(JSON.stringify(aborted));
    const lateRestored = advanceFullGame(restored, d.deadline(result, result.phase.endsAt + 20_000));
    assert.equal(lateRestored.advanced, false); assert.strictEqual(lateRestored.state, restored);
  });
}

for (const count of [7, 8, 9]) {
  for (const pins of [RESOLUTION_FULL_GAME_VERSION_PINS, CAPACITY_FULL_GAME_VERSION_PINS,
    PASS_FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS]) {
    test(`${count}: exact historical ${pins.engineVersion} keeps immediate votes and omits voteResult`, () => {
      const d = driver(count, pins), initialPins = structuredClone(d.initial.versions);
      assertOutsideResult(d.initial, true);
      let vote = d.until(d.initial, state => state.phase.kind === 'JAIL_VOTE');
      assertOutsideResult(vote, true);
      vote = targetBallots(d, vote, vote.eligibleVoters.slice(0, Math.ceil(count / 2)), 'seat-6');
      const electionState = d.tick(vote);
      assert.equal(electionState.phase.kind, 'CAPTAIN_ELECTION'); assertOutsideResult(electionState, true);
      const elected = targetBallots(d, electionState, ['seat-1'], 'seat-1');
      let current = d.tick(elected);
      assert.equal(current.phase.kind, 'ORDINARY_TURN'); assertOutsideResult(current, true);
      current = d.until(current, state => state.phase.kind === 'RELEASE_CHOICE');
      const requested = accepted(d.apply(current, 'seat-1', { type: 'RELEASE_CHOICE', targetSeatId: 'seat-6' }));
      const release = requested.phase.kind === 'RELEASE_VOTE' ? requested : d.tick(requested);
      assertOutsideResult(release, true);
      let approved = release;
      for (const actor of release.eligibleVoters.slice(0, Math.ceil(count / 2))) {
        approved = accepted(d.apply(approved, actor, { type: 'RELEASE_VOTE', approve: true }));
      }
      current = d.tick(approved);
      assert.equal(current.phase.kind, 'JAIL_VOTE'); assert.equal(byId(current, 'seat-6').jailed, false);
      assertOutsideResult(current, true);
      const terminal = d.until(current, state => state.phase.kind === 'FINISHED');
      assertOutsideResult(terminal, true); assert.deepEqual(terminal.versions, initialPins);
      assert.equal(d.visitedKinds.includes('VOTE_RESULT'), false);
      assert.deepEqual(terminal.result, { winner: 'Blue', alienCoWinner: true });
    });
  }
}
