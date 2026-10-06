import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  FullPlayerViewSchema, FullPublicViewSchema, FullReceiptSchema,
} from '@mothership/contracts';
import {
  createFullGame, executeFullGame, advanceFullGame, abortFullGame, projectFullGame,
} from '../dist/index.js';

const fixtureStart = 1_800_000_000_000;
const baseRoles = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien'];

function driver(playerCount = 9) {
  let serial = 0;
  const next = () => ++serial;
  const ctx = now => ({ now, nextPhaseId: `phase-${next()}`, nextDeadlineToken: `deadline-${next()}` });
  const roleOrder = [...baseRoles, ...(playerCount >= 8 ? ['Red Disabler'] : []), ...(playerCount === 9 ? ['Officer'] : [])];
  const ids = roleOrder.map((_, index) => `seat-${index + 1}`);
  const initial = createFullGame({
    matchId: 'fixture-full-a',
    setup: {
      playerCount, roleOrder, codeExtraSeatIds: ['seat-1', 'seat-2', 'seat-3'],
      initialRooms: Object.fromEntries(ids.map(id => [id, 'Room A'])),
      roundOrders: Array.from({ length: 5 }, () => [...ids]),
    },
    now: fixtureStart, phaseId: 'phase-start', deadlineToken: 'deadline-start', assetManifestVersion: 'fixture-assets-v1',
  });
  const request = (state, command, commandId = `command-${next()}`) => ({
    protocolVersion: 2, matchId: state.matchId, phaseId: state.phase.id, commandId, command,
  });
  const tick = (state, delay = 0) => {
    assert.notEqual(state.phase.endsAt, null, 'The test must reach its target before the match becomes terminal');
    const result = advanceFullGame(state, {
      ...ctx(state.phase.endsAt + delay), phaseId: state.phase.id, deadlineToken: state.deadlineToken,
    });
    assert.equal(result.advanced, true, `Expected expiry of ${state.phase.kind} in Round ${state.round}`);
    return result.state;
  };
  const until = (state, predicate, maximum = 200) => {
    let current = state;
    for (let steps = 0; !predicate(current); steps += 1) {
      assert.ok(steps < maximum, 'Lifecycle must reach the requested checkpoint within the bounded synthetic run');
      current = tick(current);
    }
    return current;
  };
  const apply = (state, actorSeatId, command, now = state.phase.startedAt + 1) => {
    const result = executeFullGame(state, actorSeatId, request(state, command), ctx(now));
    FullReceiptSchema.parse(result.receipt);
    return result;
  };
  const turn = (state, role, round = state.round) => {
    const seatId = state.seats.find(seat => seat.role === role).seatId;
    return until(state, current => current.round === round && current.phase.kind === 'ORDINARY_TURN' && current.activeSeatId === seatId);
  };
  return { initial, ctx, request, tick, until, apply, turn };
}

const seat = (state, role) => state.seats.find(item => item.role === role);
const accepted = result => {
  assert.equal(result.receipt.status, 'accepted');
  return result.state;
};

for (const playerCount of [7, 8, 9]) {
  test(`complete ${playerCount}-player five-round missing-input path reaches conditional showdown and Draw`, () => {
    const d = driver(playerCount);
    // Synthetic focused fixture: injure Blue members to prevent the confirmed normal
    // R5 power victory. Missing ballots/targets do not themselves guarantee no winner.
    const initial = structuredClone(d.initial);
    initial.seats.filter(item => item.faction === 'Blue').forEach(item => { item.health = 'Injured'; });
    let current = initial;
    const ordinaryTurns = new Map();
    let sawElection = false;
    for (let steps = 0; current.phase.kind !== 'SHOWDOWN'; steps += 1) {
      assert.ok(steps < 180);
      if (current.phase.kind === 'ORDINARY_TURN') {
        ordinaryTurns.set(current.round, (ordinaryTurns.get(current.round) ?? 0) + 1);
      }
      if (current.phase.kind === 'CAPTAIN_ELECTION') sawElection = true;
      current = d.tick(current);
    }
    assert.equal(sawElection, true);
    assert.deepEqual([...ordinaryTurns.values()], Array(5).fill(playerCount));
    assert.equal(current.round, 5);
    assert.equal(current.result, null);
    for (const item of current.seats) {
      assert.equal(item.location, 'Final Zone');
      assert.equal(item.specialShotAvailable, true);
    }
    const terminal = d.tick(current);
    assert.equal(terminal.phase.kind, 'FINISHED');
    assert.deepEqual(terminal.result, { winner: 'Draw', alienCoWinner: false });
    assert.equal(terminal.deadlineToken, null);
    const views = projectFullGame(terminal);
    FullPublicViewSchema.parse(views.public);
    for (const view of Object.values(views.players)) FullPlayerViewSchema.parse(view);
    assert.equal(views.public.endReveal.roles.length, playerCount);
    assert.deepEqual([...views.public.endReveal.code].sort(), [...terminal.code].sort());
  });

  test(`healthy ${playerCount}-player no-action baseline wins Blue after normal R5 and does not enter showdown`, () => {
    const d = driver(playerCount);
    const terminal = d.until(d.initial, current => current.phase.kind === 'FINISHED');
    assert.equal(terminal.round, 5);
    assert.deepEqual(terminal.result, { winner: 'Blue', alienCoWinner: true });
    assert.equal(terminal.seats.some(item => item.location === 'Final Zone'), false);
  });
}

test('setup begins with ordinary Round 1 and validates every recorded round permutation', () => {
  const d = driver(7);
  assert.equal(d.initial.round, 1);
  assert.equal(d.initial.phase.kind, 'ORDINARY_TURN');
  assert.equal(d.initial.activeSeatId, 'seat-1');
  assert.equal(d.initial.phase.endsAt - d.initial.phase.startedAt, 60_000);
  assert.equal(d.initial.seats.some(item => item.captain), false);
  const args = { matchId: 'fixture-full-a', setup: d.initial.setup, now: fixtureStart, phaseId: 'phase-start', deadlineToken: 'deadline-start', assetManifestVersion: 'fixture-assets-v1' };
  assert.throws(() => createFullGame({ ...args, setup: { ...args.setup, roundOrders: args.setup.roundOrders.slice(1) } }));
  const invalidOrders = structuredClone(args.setup.roundOrders);
  invalidOrders[3][0] = invalidOrders[3][1];
  assert.throws(() => createFullGame({ ...args, setup: { ...args.setup, roundOrders: invalidOrders } }));
});

test('ordinary deadline boundary, stale token and late delivery preserve the next full turn', () => {
  const d = driver();
  const current = d.initial;
  const context = { ...d.ctx(current.phase.endsAt - 1), phaseId: current.phase.id, deadlineToken: current.deadlineToken };
  assert.equal(advanceFullGame(current, context).advanced, false);
  assert.equal(advanceFullGame(current, { ...context, now: current.phase.endsAt, deadlineToken: 'obsolete-token' }).advanced, false);
  const late = d.tick(current, 90_000);
  assert.equal(late.phase.startedAt, current.phase.endsAt + 90_000);
  assert.equal(late.phase.endsAt - late.phase.startedAt, 60_000);
  assert.equal(advanceFullGame(late, { ...context, now: late.phase.endsAt }).advanced, false);
  const closed = d.apply(current, 'seat-1', { type: 'MOVE', destination: 'Room B' }, current.phase.endsAt);
  assert.equal(closed.receipt.code, 'PHASE_CLOSED');
});

test('movement is once before voting across the round, only Captain enters Command, and title survives leaving', () => {
  const d = driver();
  const moved = accepted(d.apply(d.initial, 'seat-2', { type: 'MOVE', destination: 'Room B' }));
  assert.equal(seat(moved, 'Cracker').movedInRound, true);
  assert.equal(seat(moved, 'Cracker').lastRoom, 'Room B');
  assert.equal(d.apply(moved, 'seat-2', { type: 'MOVE', destination: 'Room A' }).receipt.code, 'NOT_ALLOWED');
  assert.equal(d.apply(d.initial, 'seat-2', { type: 'MOVE', destination: 'Command Room' }).receipt.code, 'NOT_ALLOWED');
  // Synthetic Captain fixture isolates Command access without inventing an election.
  const captain = structuredClone(d.initial);
  seat(captain, 'Cracker').captain = true;
  const inCommand = accepted(d.apply(captain, 'seat-2', { type: 'MOVE', destination: 'Command Room' }));
  assert.equal(seat(inCommand, 'Cracker').captain, true);
  const freshRound = structuredClone(inCommand);
  seat(freshRound, 'Cracker').movedInRound = false;
  const left = accepted(d.apply(freshRound, 'seat-2', { type: 'MOVE', destination: 'Room B' }));
  assert.equal(seat(left, 'Cracker').captain, true);
  assert.equal(seat(left, 'Cracker').location, 'Room B');
  const voting = d.until(d.initial, state => state.phase.kind === 'JAIL_VOTE');
  assert.equal(d.apply(voting, 'seat-1', { type: 'MOVE', destination: 'Room B' }).receipt.code, 'NOT_ALLOWED');
});

test('secret Officer shot changes only own projection and reserves its single ordinary shot', () => {
  const d = driver();
  const current = d.turn(d.initial, 'Officer');
  const before = projectFullGame(current);
  const result = d.apply(current, seat(current, 'Officer').seatId, { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' });
  const after = projectFullGame(accepted(result));
  assert.equal(JSON.stringify(after.public), JSON.stringify(before.public));
  for (const item of current.seats.filter(item => item.role !== 'Officer')) {
    assert.equal(JSON.stringify(after.players[item.seatId]), JSON.stringify(before.players[item.seatId]));
  }
  assert.equal(seat(result.state, 'Officer').officerShotSpent, true);
  assert.equal(seat(result.state, 'Officer').ordinaryWeapons, 0);
  assert.equal(d.apply(result.state, seat(current, 'Officer').seatId, { type: 'REGISTER_SHOT', targetSeatId: 'seat-2' }).receipt.code, 'NOT_ALLOWED');
  assert.deepEqual(after.players[seat(current, 'Officer').seatId].ownPendingCommandIds, [result.receipt.commandId]);
});

test('registered Officer target remains fixed across actor death and target movement before resolution', () => {
  const d = driver();
  const current = d.turn(d.initial, 'Officer');
  const registered = accepted(d.apply(current, seat(current, 'Officer').seatId, { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' }));
  // Synthetic later events isolate approved V1-06 without relying on arrival order.
  const changed = structuredClone(registered);
  seat(changed, 'Officer').health = 'Eliminated';
  seat(changed, 'Insider').location = 'Room B';
  const nextRound = d.until(changed, state => state.round === 2 && state.phase.kind === 'ORDINARY_TURN');
  assert.equal(seat(nextRound, 'Insider').health, 'Injured');
  assert.equal(seat(nextRound, 'Officer').officerShotSpent, true);
  assert.equal(seat(nextRound, 'Insider').location, 'Hospital');
  assert.equal(projectFullGame(nextRound).players['seat-1'].ownPendingCommandIds.length, 0);
});

test('Undercover self-Protection activates next round, remains secret to recipient/public and cannot be granted twice', () => {
  const d = driver();
  const underTurn = d.turn(d.initial, 'Undercover');
  const protectedState = accepted(d.apply(underTurn, 'seat-5', { type: 'PROTECT', targetSeatId: 'seat-5' }));
  const firstResolved = d.until(protectedState, state => state.round === 2 && state.phase.kind === 'ORDINARY_TURN');
  assert.equal(seat(firstResolved, 'Undercover').protection.activeFromRound, 2);
  assert.equal(seat(firstResolved, 'Undercover').lifetimeProtectionReceived, true);
  const nextUnderTurn = d.turn(firstResolved, 'Undercover');
  assert.equal(d.apply(nextUnderTurn, 'seat-5', { type: 'PROTECT', targetSeatId: 'seat-5' }).receipt.code, 'NOT_ALLOWED');
  const views = projectFullGame(firstResolved);
  assert.equal(views.players['seat-5'].knowledge.protections.some(protection => protection.seatId === 'seat-5'), true);
  assert.equal(JSON.stringify(views.public).includes('activeFromRound'), false);
  assert.equal(views.players['seat-1'].knowledge.protections.length, 0);
});

test('active Protection consumes against a shot while neither target nor public gets a block explanation', () => {
  const d = driver();
  const underTurn = d.turn(d.initial, 'Undercover');
  const registered = accepted(d.apply(underTurn, 'seat-5', { type: 'PROTECT', targetSeatId: 'seat-1' }));
  const nextRound = d.until(registered, state => state.round === 2 && state.phase.kind === 'ORDINARY_TURN');
  const officerTurn = d.turn(nextRound, 'Officer');
  const shot = accepted(d.apply(officerTurn, 'seat-9', { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' }));
  const thirdRound = d.until(shot, state => state.round === 3 && state.phase.kind === 'ORDINARY_TURN');
  assert.equal(seat(thirdRound, 'Insider').health, 'Healthy');
  assert.equal(seat(thirdRound, 'Insider').protection.consumed, true);
  const views = projectFullGame(thirdRound);
  assert.equal(views.players['seat-1'].knowledge.protections.length, 0);
  assert.equal(views.players['seat-9'].knowledge.protections.length, 0);
  assert.equal(JSON.stringify(views.public).includes('BLOCK'), false);
  assert.equal(views.players['seat-5'].knowledge.protections.find(protection => protection.seatId === 'seat-1').consumed, true);
});

test('Disabler reserves one use, queued effect survives Jail and Rescue runs after attacks with Hospital exception', () => {
  const d = driver();
  const disablerTurn = d.turn(d.initial, 'Blue Disabler');
  const disabled = accepted(d.apply(disablerTurn, 'seat-3', { type: 'DISABLE', targetSeatId: 'seat-1' }));
  assert.equal(seat(disabled, 'Blue Disabler').disablerSpent, true);
  assert.equal(d.apply(disabled, 'seat-3', { type: 'DISABLE', targetSeatId: 'seat-2' }).receipt.code, 'NOT_ALLOWED');
  const changed = structuredClone(disabled);
  seat(changed, 'Blue Disabler').jailed = true;
  seat(changed, 'Blue Disabler').location = 'Jail';
  const nextRound = d.until(changed, state => state.round === 2 && state.phase.kind === 'ORDINARY_TURN');
  assert.equal(seat(nextRound, 'Insider').health, 'Injured');
  assert.equal(seat(nextRound, 'Insider').location, 'Hospital');
  const crackerTurn = d.turn(nextRound, 'Cracker');
  const rescue = accepted(d.apply(crackerTurn, 'seat-2', { type: 'RESCUE', targetSeatId: 'seat-1' }));
  assert.equal(seat(rescue, 'Cracker').rescuesRemaining, 1);
  const thirdRound = d.until(rescue, state => state.round === 3 && state.phase.kind === 'ORDINARY_TURN');
  assert.equal(seat(thirdRound, 'Insider').health, 'Healthy');
  assert.equal(seat(thirdRound, 'Insider').location, 'Room A');
  assert.equal(seat(thirdRound, 'Cracker').location, 'Room A');
});

test('a queued no-effect Rescue consumes its reserved use and injured self-Rescue remains allowed', () => {
  const d = driver();
  const crackerTurn = d.turn(d.initial, 'Cracker');
  const noEffect = accepted(d.apply(crackerTurn, 'seat-2', { type: 'RESCUE', targetSeatId: 'seat-1' }));
  assert.equal(seat(noEffect, 'Cracker').rescuesRemaining, 1);
  const nextRound = d.until(noEffect, state => state.round === 2 && state.phase.kind === 'ORDINARY_TURN');
  assert.equal(seat(nextRound, 'Cracker').rescuesRemaining, 1);
  const injured = structuredClone(d.turn(nextRound, 'Cracker'));
  seat(injured, 'Cracker').health = 'Injured';
  seat(injured, 'Cracker').location = 'Hospital';
  const selfRescue = accepted(d.apply(injured, 'seat-2', { type: 'RESCUE', targetSeatId: 'seat-2' }));
  assert.equal(seat(selfRescue, 'Cracker').rescuesRemaining, 0);
  const thirdRound = d.until(selfRescue, state => state.round === 3 && state.phase.kind === 'ORDINARY_TURN');
  assert.equal(seat(thirdRound, 'Cracker').health, 'Healthy');
  assert.equal(seat(thirdRound, 'Cracker').location, 'Room A');
});

test('Supplier Round 3 grants two distinct recipients, including Officer without restoring a spent shot', () => {
  const d = driver();
  const roundThree = d.until(d.initial, state => state.round === 3 && state.phase.kind === 'ORDINARY_TURN');
  const supplierTurn = d.turn(roundThree, 'Supplier');
  const before = structuredClone(supplierTurn);
  // Synthetic prior spend isolates Supplier-to-Officer behavior without injuring a recipient.
  seat(before, 'Officer').officerShotSpent = true;
  seat(before, 'Officer').ordinaryWeapons = 0;
  // Invalid duplicate targets fail the strict request schema before rule evaluation;
  // the API maps this parser failure to INVALID_REQUEST rather than a game receipt.
  assert.throws(() => d.apply(before, 'seat-4', { type: 'SUPPLY', targetSeatIds: ['seat-1', 'seat-1'] }));
  const supplied = accepted(d.apply(before, 'seat-4', { type: 'SUPPLY', targetSeatIds: ['seat-1', 'seat-9'] }));
  const nextRound = d.until(supplied, state => state.round === 4 && state.phase.kind === 'ORDINARY_TURN');
  assert.equal(seat(nextRound, 'Insider').ordinaryWeapons, 1);
  assert.equal(seat(nextRound, 'Officer').ordinaryWeapons, 1);
  assert.equal(seat(nextRound, 'Officer').officerShotSpent, true);
  const views = projectFullGame(nextRound);
  assert.equal(views.players['seat-9'].self.shotAvailable, false);
  assert.equal(JSON.stringify(views.public).includes('ordinaryWeapons'), false);
});

test('Hacker Scan consumes once per round and wrong faction reveals no Code membership to other audiences', () => {
  const d = driver();
  const hackerTurn = d.turn(d.initial, 'Hacker');
  const before = projectFullGame(hackerTurn);
  const scanned = accepted(d.apply(hackerTurn, 'seat-6', { type: 'SCAN', targetSeatId: 'seat-1', guess: 'Red' }));
  assert.equal(seat(scanned, 'Hacker').scanUsedRound, 1);
  assert.deepEqual(seat(scanned, 'Hacker').knowledge.scanResults.at(-1), { round: 1, targetSeatId: 'seat-1', guess: 'Red', matched: false, inCode: null });
  assert.equal(d.apply(scanned, 'seat-6', { type: 'SCAN', targetSeatId: 'seat-1', guess: 'Blue' }).receipt.code, 'NOT_ALLOWED');
  const after = projectFullGame(scanned);
  assert.equal(JSON.stringify(after.public), JSON.stringify(before.public));
  assert.equal(JSON.stringify(after.players['seat-1']), JSON.stringify(before.players['seat-1']));
  const roundTwo = d.until(scanned, state => state.round === 2 && state.phase.kind === 'ORDINARY_TURN');
  const nextHacker = d.turn(roundTwo, 'Hacker');
  const correct = accepted(d.apply(nextHacker, 'seat-6', { type: 'SCAN', targetSeatId: 'seat-6', guess: 'Red' }));
  assert.equal(seat(correct, 'Hacker').knowledge.scanResults.at(-1).matched, true);
  assert.equal(seat(correct, 'Hacker').knowledge.scanResults.at(-1).inCode, correct.code.includes('seat-6'));
});

test('Hack request is independent of Main Action, starts after ordinary expiry and grants a full extra minute', () => {
  const d = driver();
  const disablerTurn = d.turn(d.initial, 'Blue Disabler');
  const action = accepted(d.apply(disablerTurn, 'seat-3', { type: 'DISABLE', targetSeatId: 'seat-1' }));
  const hacked = accepted(d.apply(action, 'seat-3', { type: 'REQUEST_HACK', targetSeatId: 'seat-2' }));
  assert.equal(hacked.phase.kind, 'ORDINARY_TURN');
  assert.equal(hacked.hacksThisRound, 1);
  assert.equal(seat(hacked, 'Blue Disabler').hackUsed, true);
  const extra = d.tick(hacked, 25_000);
  assert.equal(extra.phase.kind, 'HACK');
  assert.equal(extra.phase.startedAt, hacked.phase.endsAt + 25_000);
  assert.equal(extra.phase.endsAt - extra.phase.startedAt, 60_000);
  const views = projectFullGame(extra);
  assert.equal(views.players['seat-3'].hackPartnerSeatId, 'seat-2');
  assert.equal(views.players['seat-2'].hackPartnerSeatId, 'seat-3');
  assert.equal(views.players['seat-1'].hackPartnerSeatId, null);
  const nextTurn = d.tick(extra);
  assert.equal(nextTurn.phase.kind, 'ORDINARY_TURN');
  assert.equal(nextTurn.activeSeatId, 'seat-4');
});

test('Code accepts one unordered attempt anywhere during R5 but waits for complete normal resolution', () => {
  const d = driver();
  const roundFive = d.until(d.initial, state => state.round === 5 && state.phase.kind === 'ORDINARY_TURN');
  assert.equal(roundFive.activeSeatId, 'seat-1');
  const before = projectFullGame(roundFive);
  const submitted = accepted(d.apply(roundFive, 'seat-6', { type: 'SUBMIT_CODE', seatIds: [...roundFive.code].reverse() }));
  assert.equal(submitted.correctCode, true);
  assert.equal(submitted.codeSubmitted, true);
  assert.equal(submitted.result, null);
  assert.equal(submitted.phase.kind, 'ORDINARY_TURN');
  assert.equal(JSON.stringify(projectFullGame(submitted).public), JSON.stringify(before.public));
  assert.equal(d.apply(submitted, 'seat-6', { type: 'SUBMIT_CODE', seatIds: [...roundFive.code] }).receipt.code, 'NOT_ALLOWED');
  const terminal = d.until(submitted, state => state.phase.kind === 'FINISHED');
  assert.deepEqual(terminal.result, { winner: 'Red', alienCoWinner: false });
  assert.equal(d.apply(d.initial, 'seat-6', { type: 'SUBMIT_CODE', seatIds: [...d.initial.code] }).receipt.code, 'NOT_ALLOWED');
});

test('Captain election ties create a new full-window runoff and empty ballots assign nobody', () => {
  const d = driver(7);
  const election = d.until(d.initial, state => state.phase.kind === 'CAPTAIN_ELECTION');
  let tied = accepted(d.apply(election, 'seat-1', { type: 'VOTE', targetSeatId: 'seat-1' }));
  tied = accepted(d.apply(tied, 'seat-2', { type: 'VOTE', targetSeatId: 'seat-2' }));
  assert.equal(d.apply(tied, 'seat-1', { type: 'VOTE', targetSeatId: 'seat-2' }).receipt.code, 'NOT_ALLOWED');
  const runoff = d.tick(tied, 10_000);
  assert.equal(runoff.phase.kind, 'CAPTAIN_ELECTION');
  assert.deepEqual([...runoff.eligibleTargets].sort(), ['seat-1', 'seat-2']);
  assert.equal(runoff.phase.endsAt - runoff.phase.startedAt, 60_000);
  const selected = accepted(d.apply(runoff, 'seat-3', { type: 'VOTE', targetSeatId: 'seat-2' }));
  const roundTwo = d.tick(selected);
  assert.equal(roundTwo.phase.kind, 'ORDINARY_TURN');
  assert.equal(seat(roundTwo, 'Cracker').captain, true);
  assert.equal(seat(roundTwo, 'Cracker').location, 'Command Room');
  assert.equal(seat(roundTwo, 'Cracker').movedInRound, false);
  const noVotes = d.tick(election);
  assert.equal(noVotes.seats.some(item => item.captain), false);
});

test('Jail and release use eligible denominators, selected prisoner and one consumed match-wide request', () => {
  const d = driver(8);
  const jail = d.until(d.initial, state => state.phase.kind === 'JAIL_VOTE');
  let voted = jail;
  for (const voter of ['seat-1', 'seat-2', 'seat-3', 'seat-4']) voted = accepted(d.apply(voted, voter, { type: 'VOTE', targetSeatId: 'seat-8' }));
  const election = d.tick(voted);
  assert.equal(seat(election, 'Red Disabler').jailed, true);
  assert.equal(seat(election, 'Red Disabler').health, 'Healthy');
  const captainChoice = accepted(d.apply(election, 'seat-1', { type: 'VOTE', targetSeatId: 'seat-1' }));
  const secondRound = d.tick(captainChoice);
  const choice = d.until(secondRound, state => state.phase.kind === 'RELEASE_CHOICE');
  assert.equal(d.apply(choice, 'seat-2', { type: 'RELEASE_CHOICE', targetSeatId: 'seat-8' }).receipt.code, 'NOT_ALLOWED');
  const requested = accepted(d.apply(choice, 'seat-1', { type: 'RELEASE_CHOICE', targetSeatId: 'seat-8' }));
  assert.equal(requested.releaseUsed, true);
  const releaseVote = requested.phase.kind === 'RELEASE_VOTE' ? requested : d.tick(requested);
  assert.equal(releaseVote.phase.kind, 'RELEASE_VOTE');
  let approvals = releaseVote;
  for (const voter of ['seat-1', 'seat-2', 'seat-3', 'seat-4']) approvals = accepted(d.apply(approvals, voter, { type: 'RELEASE_VOTE', approve: true }));
  const afterRelease = d.tick(approvals);
  assert.equal(afterRelease.phase.kind, 'JAIL_VOTE');
  assert.equal(seat(afterRelease, 'Red Disabler').jailed, false);
  assert.equal(seat(afterRelease, 'Red Disabler').location, 'Room A');
  assert.equal(afterRelease.releaseUsed, true);
  assert.equal(afterRelease.lastTally.yesCount, 4);
});

test('showdown consumes distinct special ammunition, accepts Injured/Jailed shooters and resolves all queued shots after shooter death', () => {
  const d = driver(7);
  const initial = structuredClone(d.initial);
  initial.seats.filter(item => item.faction === 'Blue').forEach(item => { item.health = 'Injured'; });
  initial.seats[2].jailed = true;
  initial.seats[2].location = 'Jail';
  const showdown = d.until(initial, state => state.phase.kind === 'SHOWDOWN');
  assert.equal(showdown.seats[2].specialShotAvailable, true);
  assert.equal(showdown.seats[2].location, 'Final Zone');
  let shots = accepted(d.apply(showdown, 'seat-1', { type: 'SHOWDOWN_SHOT', targetSeatId: 'seat-2' }));
  shots = accepted(d.apply(shots, 'seat-2', { type: 'SHOWDOWN_SHOT', targetSeatId: 'seat-5' }));
  shots = accepted(d.apply(shots, 'seat-3', { type: 'SHOWDOWN_SHOT', targetSeatId: 'seat-6' }));
  assert.equal(shots.seats[0].specialShotAvailable, false);
  assert.equal(d.apply(shots, 'seat-1', { type: 'SHOWDOWN_SHOT', targetSeatId: 'seat-3' }).receipt.code, 'NOT_ALLOWED');
  assert.equal(shots.seats[0].ordinaryWeapons, 0);
  const finished = d.tick(shots);
  assert.equal(finished.phase.kind, 'FINISHED');
  assert.equal(finished.seats[1].health, 'Eliminated');
  assert.equal(finished.seats[4].health, 'Injured', 'Seat 2 registered attack survives Seat 2 elimination by the earlier shot');
  assert.equal(finished.seats[5].health, 'Injured', 'Jailed Seat 3 may use its independent special shot');
  assert.deepEqual(finished.result, { winner: 'Draw', alienCoWinner: false });
});

test('host abort is explicit and terminal without a fabricated winner or end-of-match secret disclosure', () => {
  const d = driver();
  const aborted = abortFullGame(d.initial, d.ctx(d.initial.phase.startedAt + 1));
  assert.equal(aborted.phase.kind, 'ABORTED');
  assert.equal(aborted.result, null);
  assert.equal(aborted.deadlineToken, null);
  assert.equal(projectFullGame(aborted).public.endReveal, null);
  assert.equal(d.apply(aborted, 'seat-1', { type: 'MOVE', destination: 'Room B' }).receipt.code, 'PHASE_CLOSED');
});

test('movement during Captain election stays consumed after the next ordinary turn begins', () => {
  const d = driver(7);
  const election = d.until(d.initial, state => state.phase.kind === 'CAPTAIN_ELECTION');
  const moved = accepted(d.apply(election, 'seat-2', { type: 'MOVE', destination: 'Room B' }));
  const chosen = accepted(d.apply(moved, 'seat-1', { type: 'VOTE', targetSeatId: 'seat-1' }));
  const ordinary = d.tick(chosen);
  assert.equal(ordinary.phase.kind, 'ORDINARY_TURN');
  assert.equal(seat(ordinary, 'Cracker').movedInRound, true);
  assert.equal(seat(ordinary, 'Cracker').location, 'Room B');
  assert.equal(d.apply(ordinary, 'seat-2', { type: 'MOVE', destination: 'Room A' }).receipt.code, 'NOT_ALLOWED');
});

test('a legal shot remains locked when its Captain target later moves into Command', () => {
  const d = driver();
  const current = structuredClone(d.turn(d.initial, 'Officer'));
  // Synthetic current Captain outside Command permits a legal local registration.
  seat(current, 'Insider').captain = true;
  const shot = accepted(d.apply(current, 'seat-9', { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' }));
  const moved = accepted(d.apply(shot, 'seat-1', { type: 'MOVE', destination: 'Command Room' }));
  assert.equal(seat(moved, 'Insider').location, 'Command Room');
  const resolved = d.until(moved, state => state.round === 2 && state.phase.kind === 'ORDINARY_TURN');
  assert.equal(seat(resolved, 'Insider').health, 'Injured');
  assert.equal(seat(resolved, 'Insider').captain, false);
  assert.equal(seat(resolved, 'Insider').location, 'Hospital');
});

test('Protection granted in the same normal round cannot block that round shot', () => {
  const d = driver();
  const underTurn = d.turn(d.initial, 'Undercover');
  const grant = accepted(d.apply(underTurn, 'seat-5', { type: 'PROTECT', targetSeatId: 'seat-1' }));
  const officerTurn = d.turn(grant, 'Officer');
  const shot = accepted(d.apply(officerTurn, 'seat-9', { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' }));
  const resolved = d.until(shot, state => state.round === 2 && state.phase.kind === 'ORDINARY_TURN');
  assert.equal(seat(resolved, 'Insider').health, 'Injured');
  assert.equal(seat(resolved, 'Insider').protection.activeFromRound, 2);
  assert.equal(seat(resolved, 'Insider').protection.consumed, false);
});

test('Round 5 Protection grant has no next normal round and cannot block a showdown shot', () => {
  const d = driver();
  const initial = structuredClone(d.initial);
  initial.seats.filter(item => item.faction === 'Blue').forEach(item => { item.health = 'Injured'; });
  const underTurn = d.until(initial, state => state.round === 5 && state.phase.kind === 'ORDINARY_TURN' && state.activeSeatId === 'seat-5');
  const grant = accepted(d.apply(underTurn, 'seat-5', { type: 'PROTECT', targetSeatId: 'seat-5' }));
  const showdown = d.until(grant, state => state.phase.kind === 'SHOWDOWN');
  assert.equal(seat(showdown, 'Undercover').protection.activeFromRound, 6);
  const shot = accepted(d.apply(showdown, 'seat-1', { type: 'SHOWDOWN_SHOT', targetSeatId: 'seat-5' }));
  const resolved = d.tick(shot);
  assert.equal(seat(resolved, 'Undercover').health, 'Injured');
  assert.equal(seat(resolved, 'Undercover').protection.consumed, false);
});

test('a jailed Hacker submits outside its own R5 turn and terminal Code eligibility is checked after effects', () => {
  const d = driver();
  const roundFive = structuredClone(d.until(d.initial, state => state.round === 5 && state.phase.kind === 'ORDINARY_TURN'));
  seat(roundFive, 'Hacker').jailed = true;
  seat(roundFive, 'Hacker').location = 'Jail';
  for (const item of roundFive.seats.filter(item => item.faction === 'Red' && item.role !== 'Hacker')) item.health = 'Injured';
  assert.notEqual(roundFive.activeSeatId, 'seat-6');
  const submitted = accepted(d.apply(roundFive, 'seat-6', { type: 'SUBMIT_CODE', seatIds: [...roundFive.code].reverse() }));
  assert.equal(submitted.result, null);
  assert.equal(submitted.correctCode, true);
  // Synthetic later injury isolates the terminal health checkpoint, not input arrival.
  const laterInjury = structuredClone(submitted);
  seat(laterInjury, 'Hacker').health = 'Injured';
  const showdown = d.until(laterInjury, state => state.phase.kind === 'SHOWDOWN');
  assert.equal(showdown.result, null);
  assert.equal(showdown.codeSubmitted, true);
  assert.equal(showdown.correctCode, true);
  assert.equal(seat(showdown, 'Hacker').jailed, true);
});

test('recorded full lifecycle replay preserves input states and produces identical pinned outcomes', () => {
  const run = () => {
    const d = driver(7);
    const before = structuredClone(d.initial);
    const moved = accepted(d.apply(d.initial, 'seat-2', { type: 'MOVE', destination: 'Room B' }));
    assert.deepEqual(d.initial, before);
    const terminal = d.until(moved, state => state.phase.kind === 'FINISHED');
    return JSON.stringify({ state: terminal, views: projectFullGame(terminal) });
  };
  assert.equal(run(), run());
});

test('second hidden Hack request reaches the global cap without changing unrelated audiences', () => {
  const d = driver();
  const first = accepted(d.apply(d.initial, 'seat-1', { type: 'REQUEST_HACK', targetSeatId: 'seat-2' }));
  const firstConversation = d.tick(first);
  const secondTurn = d.tick(firstConversation);
  assert.equal(secondTurn.activeSeatId, 'seat-2');
  const before = projectFullGame(secondTurn);
  const second = accepted(d.apply(secondTurn, 'seat-2', { type: 'REQUEST_HACK', targetSeatId: 'seat-3' }));
  assert.equal(second.hacksThisRound, 2);
  const after = projectFullGame(second);
  assert.equal(JSON.stringify(after.public), JSON.stringify(before.public));
  for (const item of second.seats.filter(item => item.seatId !== 'seat-2')) {
    assert.equal(JSON.stringify(after.players[item.seatId]), JSON.stringify(before.players[item.seatId]));
  }
  const thirdTurn = d.tick(d.tick(second));
  assert.equal(thirdTurn.activeSeatId, 'seat-3');
  assert.equal(d.apply(thirdTurn, 'seat-3', { type: 'REQUEST_HACK', targetSeatId: 'seat-4' }).receipt.code, 'NOT_ALLOWED');
});

test('a hidden vote changes only its owning player until the aggregate tally closes', () => {
  const d = driver();
  const jail = d.until(d.initial, state => state.phase.kind === 'JAIL_VOTE');
  const before = projectFullGame(jail);
  const voted = accepted(d.apply(jail, 'seat-1', { type: 'VOTE', targetSeatId: 'seat-2' }));
  const after = projectFullGame(voted);
  assert.equal(JSON.stringify(after.public), JSON.stringify(before.public));
  for (const item of voted.seats.filter(item => item.seatId !== 'seat-1')) {
    assert.equal(JSON.stringify(after.players[item.seatId]), JSON.stringify(before.players[item.seatId]));
  }
  assert.equal(after.players['seat-1'].hasVoted, true);
  assert.equal(after.players['seat-1'].ownBallot, 'seat-2');
  const closed = d.tick(voted);
  assert.equal(projectFullGame(closed).public.lastTally.counts['seat-2'], 1);
});

test('a declined or missing release choice preserves the opportunity; a failed selected vote consumes it', () => {
  const d = driver();
  const initial = structuredClone(d.initial);
  // Synthetic existing Captain/prisoner isolate the release-choice policy.
  seat(initial, 'Insider').captain = true;
  seat(initial, 'Insider').location = 'Command Room';
  seat(initial, 'Red Disabler').jailed = true;
  seat(initial, 'Red Disabler').location = 'Jail';
  const choice = d.until(initial, state => state.phase.kind === 'RELEASE_CHOICE');
  const missing = d.tick(choice);
  assert.equal(missing.phase.kind, 'JAIL_VOTE');
  assert.equal(missing.releaseUsed, false);
  const decline = accepted(d.apply(choice, 'seat-1', { type: 'RELEASE_CHOICE', targetSeatId: null }));
  assert.equal(d.tick(decline).releaseUsed, false);
  const selected = accepted(d.apply(choice, 'seat-1', { type: 'RELEASE_CHOICE', targetSeatId: 'seat-8' }));
  const vote = d.tick(selected);
  const failed = d.tick(vote);
  assert.equal(failed.phase.kind, 'JAIL_VOTE');
  assert.equal(failed.releaseUsed, true);
  assert.equal(seat(failed, 'Red Disabler').jailed, true);
  assert.equal(failed.lastTally.released, false);
  assert.equal(failed.lastTally.yesCount, 0);
});

test('recorded actor order governs no-effect Protection even if a synthetic queue is reordered', () => {
  const d = driver();
  const initial = structuredClone(d.initial);
  // Test-only injury/placement isolates staged target death before a later grant.
  seat(initial, 'Insider').health = 'Injured';
  const disablerTurn = d.turn(initial, 'Blue Disabler');
  const attack = accepted(d.apply(disablerTurn, 'seat-3', { type: 'DISABLE', targetSeatId: 'seat-1' }));
  const underTurn = d.turn(attack, 'Undercover');
  const grant = accepted(d.apply(underTurn, 'seat-5', { type: 'PROTECT', targetSeatId: 'seat-1' }));
  const reordered = structuredClone(grant);
  reordered.queued.reverse();
  const resolved = d.until(reordered, state => state.round === 2 && state.phase.kind === 'ORDINARY_TURN');
  assert.equal(seat(resolved, 'Insider').health, 'Eliminated');
  assert.equal(seat(resolved, 'Insider').protection, null);
  assert.equal(seat(resolved, 'Insider').lifetimeProtectionReceived, true);
  assert.equal(projectFullGame(resolved).players['seat-5'].knowledge.protections.some(protection => protection.seatId === 'seat-1'), false);
});

test('full shared snapshots reject absent audience, active-seat and ballot references', () => {
  const d = driver(7);
  const views = projectFullGame(d.initial);
  const wrongAudience = structuredClone(views.players['seat-1']);
  wrongAudience.audience.seatId = 'seat-9';
  wrongAudience.self.seatId = 'seat-9';
  assert.equal(FullPlayerViewSchema.safeParse(wrongAudience).success, false);
  const wrongActive = structuredClone(views.public);
  wrongActive.activeSeatId = 'seat-9';
  assert.equal(FullPublicViewSchema.safeParse(wrongActive).success, false);
  for (const field of ['eligibleVoters', 'eligibleTargets']) {
    const wrongBallot = structuredClone(views.public);
    wrongBallot.ballot[field] = ['seat-9'];
    assert.equal(FullPublicViewSchema.safeParse(wrongBallot).success, false);
    wrongBallot.ballot[field] = ['seat-1', 'seat-1'];
    assert.equal(FullPublicViewSchema.safeParse(wrongBallot).success, false);
  }
});

test('full audience contracts reject premature exact-role/Code and living-player faction disclosures', () => {
  const d = driver(7);
  const publicView = projectFullGame(d.initial).public;
  const premature = structuredClone(publicView);
  premature.endReveal = { roles: d.initial.seats.map(item => ({ seatId: item.seatId, role: item.role })), code: [...d.initial.code] };
  assert.equal(FullPublicViewSchema.safeParse(premature).success, false);
  const livingFaction = structuredClone(publicView);
  livingFaction.seats[0].revealedFaction = 'Blue';
  assert.equal(FullPublicViewSchema.safeParse(livingFaction).success, false);
  const finished = d.until(d.initial, state => state.phase.kind === 'FINISHED');
  const terminalPlayer = projectFullGame(finished).players['seat-2'];
  assert.equal(FullPlayerViewSchema.safeParse(terminalPlayer).success, true);
  const inconsistentRole = structuredClone(terminalPlayer);
  // Swap two same-faction roles: the public terminal roster stays canonical,
  // isolating disagreement with the viewer's unchanged private role.
  inconsistentRole.endReveal.roles.find(item => item.seatId === 'seat-2').role = 'Supplier';
  inconsistentRole.endReveal.roles.find(item => item.seatId === 'seat-4').role = 'Cracker';
  const { self, knowledge, legalTargets, ownPendingCommandIds, ownBallot, hasVoted, hackPartnerSeatId, ...publicFacts } = inconsistentRole;
  assert.equal(FullPublicViewSchema.safeParse({ ...publicFacts, audience: { kind: 'public' } }).success, true);
  assert.equal(FullPlayerViewSchema.safeParse(inconsistentRole).success, false);
});

test('private knowledge contracts reject role-inappropriate fields, invalid Code and malformed Scan results', () => {
  const d = driver();
  const views = projectFullGame(d.initial);
  const generic = views.players['seat-2'];
  for (const change of [
    view => { view.knowledge.insiderCandidates = ['seat-1', 'seat-5', 'seat-7']; },
    view => { view.knowledge.undercoverSeatId = 'seat-5'; },
    view => { view.knowledge.code = [...d.initial.code]; },
    view => { view.knowledge.scanResults = [{ round: 1, targetSeatId: 'seat-1', guess: 'Blue', matched: true, inCode: true }]; },
    view => { view.knowledge.protections = [{ seatId: 'seat-1', activeFromRound: 2, consumed: false }]; },
  ]) {
    const malformed = structuredClone(generic);
    change(malformed);
    assert.equal(FullPlayerViewSchema.safeParse(malformed).success, false);
  }
  const wrongCode = structuredClone(views.players['seat-7']);
  wrongCode.knowledge.code = ['seat-1', 'seat-1', 'seat-2', 'seat-7'];
  assert.equal(FullPlayerViewSchema.safeParse(wrongCode).success, false);
  const failedScan = structuredClone(views.players['seat-6']);
  failedScan.knowledge.scanResults = [{ round: 1, targetSeatId: 'seat-1', guess: 'Blue', matched: false, inCode: true }];
  assert.equal(FullPlayerViewSchema.safeParse(failedScan).success, false);
});

test('asset manifest versions retain bounded dotted version strings', () => {
  const d = driver(7);
  const args = { matchId: 'fixture-full-a', setup: d.initial.setup, now: fixtureStart, phaseId: 'phase-start', deadlineToken: 'deadline-start', assetManifestVersion: '0.1.0' };
  const dotted = createFullGame(args);
  assert.equal(projectFullGame(dotted).public.versions.assetManifestVersion, '0.1.0');
  assert.throws(() => createFullGame({ ...args, assetManifestVersion: '' }));
  assert.throws(() => createFullGame({ ...args, assetManifestVersion: 'x'.repeat(129) }));
});

test('commands before phase start fail closed and new deadline windows cannot overflow safe timestamps', () => {
  const d = driver();
  const saved = structuredClone(d.initial);
  assert.equal(d.apply(d.initial, 'seat-1', { type: 'MOVE', destination: 'Room B' }, d.initial.phase.startedAt - 1).receipt.code, 'PHASE_CLOSED');
  assert.deepEqual(d.initial, saved);
  assert.throws(()=>abortFullGame(d.initial,d.ctx(d.initial.phase.startedAt-1)));
  assert.throws(() => createFullGame({ matchId: 'fixture-full-a', setup: d.initial.setup, now: Number.MAX_SAFE_INTEGER - 59_999, phaseId: 'phase-start', deadlineToken: 'deadline-start', assetManifestVersion: 'fixture-assets-v1' }));
  assert.throws(() => advanceFullGame(d.initial, { ...d.ctx(Number.MAX_SAFE_INTEGER - 59_999), phaseId: d.initial.phase.id, deadlineToken: d.initial.deadlineToken }));
});
