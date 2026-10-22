import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PlayerViewSchema, PublicViewSchema, ReceiptSchema } from '@mothership/contracts';
import { ENGINE_VERSION, SOURCE_MANIFEST_SHA256, advanceDeadline, project, registerShot, resolveSlice } from '../dist/index.js';
import { context, finishTurns, fixtureProvenance, makeRequest, makeState, seatIds } from './helpers.mjs';

function register(state = makeState(), overrides = {}) {
  return registerShot(state, makeRequest(state), context(overrides));
}

function resolve(state) {
  const complete = finishTurns(state, advanceDeadline);
  return resolveSlice(complete, {
    now: complete.phase.endsAt, resolutionPhaseId: 'phase-resolution-a', completedNoJailVote: true,
  });
}

test('test fixture pins the reviewed baseline and unchanged source manifest', () => {
  const manifest = readFileSync(new URL('../../../rules/source-manifest.json', import.meta.url));
  assert.equal(createHash('sha256').update(manifest).digest('hex'), fixtureProvenance.sourceManifestSha256);
  assert.equal(fixtureProvenance.baseCommit, '333c9e820f362a211352bc689372663f29b73ac4');
  assert.equal(makeState().versions.engineVersion, ENGINE_VERSION);
  assert.equal(fixtureProvenance.sourceManifestSha256, SOURCE_MANIFEST_SHA256);
});

test('registration reserves one shot once, preserves inputs and returns a safe contract receipt', () => {
  const initial = makeState();
  const saved = structuredClone(initial);
  const accepted = register(initial);
  assert.deepEqual(initial, saved);
  assert.equal(accepted.receipt.status, 'accepted');
  assert.equal(accepted.state.seats[0].shotAvailable, false);
  assert.equal(accepted.state.attacks.length, 1);
  ReceiptSchema.parse(accepted.receipt);
  const rejected = registerShot(accepted.state, makeRequest(initial, { commandId: 'command-b' }), context());
  assert.equal(rejected.receipt.code, 'NOT_ALLOWED');
  assert.equal(rejected.state, accepted.state);
  assert.equal(rejected.state.attacks.length, 1);
});

test('secret registration leaves public and all unrelated composed audiences byte-identical', () => {
  const initial = makeState('protected');
  const before = project(initial);
  const after = project(register(initial).state);
  assert.equal(JSON.stringify(before.public), JSON.stringify(after.public));
  for (const seatId of seatIds.slice(1)) {
    assert.equal(JSON.stringify(before.players[seatId]), JSON.stringify(after.players[seatId]));
  }
  assert.equal(after.players['seat-1'].viewRevision, before.players['seat-1'].viewRevision + 1);
  assert.deepEqual(after.players['seat-1'].ownPendingCommandIds, ['command-a']);
  PublicViewSchema.parse(after.public);
  for (const view of Object.values(after.players)) {
    PlayerViewSchema.parse(view);
    assert.equal(view.seats.some(seat => 'role' in seat || 'protection' in seat || 'shotAvailable' in seat), false);
    assert.equal(JSON.stringify(view).includes('activeFromRound'), false);
  }
});

test('projection snapshots cannot mutate authority or another audience', () => {
  const initial = makeState();
  const views = project(initial);
  views.players['seat-1'].seats[0].health = 'Eliminated';
  views.players['seat-1'].versions.rulesetHash = '0'.repeat(64);
  views.public.phase.id = 'modified';
  assert.equal(initial.seats[0].health, 'Healthy');
  assert.equal(views.public.seats[0].health, 'Healthy');
  assert.equal(views.players['seat-2'].seats[0].health, 'Healthy');
  assert.equal(views.players['seat-2'].versions.rulesetHash, fixtureProvenance.sourceManifestSha256);
  assert.equal(initial.phase.id, 'phase-a');
});

test('trusted acceptance boundary includes end minus one and excludes exact end or stale phase', () => {
  const state = makeState();
  assert.equal(register(state, { evaluatedAt: state.phase.endsAt - 1 }).receipt.status, 'accepted');
  assert.equal(register(state, { evaluatedAt: state.phase.endsAt }).receipt.code, 'PHASE_CLOSED');
  assert.equal(register(state, { evaluatedAt: state.phase.endsAt + 1 }).receipt.code, 'PHASE_CLOSED');
  assert.equal(register(state, { evaluatedAt: state.phase.startedAt - 1 }).receipt.code, 'PHASE_CLOSED');
  assert.equal(registerShot(state, makeRequest(state, { phaseId: 'stale-phase' }), context()).receipt.code, 'PHASE_CLOSED');
});

test('registration eligibility uses actor status and public target legality without defense hints', () => {
  const cases = [
    state => { state.seats[0].health = 'Injured'; },
    state => { state.seats[0].health = 'Eliminated'; },
    state => { state.seats[0].jailed = true; },
    state => { state.activeSeatId = 'seat-2'; },
    state => { state.seats[0].role = 'Hacker'; },
    state => { state.seats[0].shotAvailable = false; },
    state => { state.seats[1].health = 'Eliminated'; },
    state => { state.seats[1].location = 'Room B'; },
    state => { state.seats[1].location = 'Command Room'; state.seats[0].location = 'Command Room'; },
  ];
  for (const mutate of cases) {
    const state = makeState();
    mutate(state);
    assert.equal(register(state).receipt.code, 'NOT_ALLOWED');
    assert.equal(state.attacks.length, 0);
  }
  const state = makeState();
  assert.equal(register(state, { actorSeatId: 'seat-2' }).receipt.code, 'NOT_ALLOWED');
  const selfRequest = makeRequest(state, { command: { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' } });
  assert.equal(registerShot(state, selfRequest, context()).receipt.code, 'NOT_ALLOWED');
  assert.deepEqual(register(makeState('protected')).receipt, register(makeState('unprotected')).receipt);
});

test('paired Protection fixtures expose identical initial views and neutral shared identifiers', () => {
  const protectedViews = project(makeState('protected'));
  const unprotectedViews = project(makeState('unprotected'));
  assert.equal(JSON.stringify(protectedViews.public), JSON.stringify(unprotectedViews.public));
  assert.equal(JSON.stringify(protectedViews.players['seat-2']), JSON.stringify(unprotectedViews.players['seat-2']));
  assert.equal(protectedViews.public.matchId, 'fixture-match-a');
  for (const identifier of [protectedViews.public.matchId, protectedViews.public.phase.id]) {
    assert.doesNotMatch(identifier, /protected|unprotected|officer|undercover|target|seat-[1-9]/i);
  }
});

test('protected shot consumes active Protection and leaves health unchanged without defense disclosure', () => {
  const initial = makeState('protected');
  const accepted = register(initial).state;
  const resolved = resolve(accepted);
  assert.equal(resolved.seats[1].health, 'Healthy');
  assert.equal(resolved.seats[1].protection.consumed, true);
  assert.equal(resolved.seats[1].protection.lifetimeReceipts, 1);
  assert.equal(resolved.seats[0].shotAvailable, false);
  assert.equal(accepted.seats[1].protection.consumed, false);
  const views = project(resolved);
  assert.deepEqual(views.players['seat-1'].ownPendingCommandIds, []);
  assert.equal(JSON.stringify(views).includes('protection'), false);
  assert.equal(JSON.stringify(views).includes('blocked'), false);
  assert.equal(resolved.seats[1].location, 'Room A');
});

test('unprotected shot deals exactly one injury and repeated resolution is a no-op', () => {
  const resolved = resolve(register().state);
  assert.equal(resolved.seats[1].health, 'Injured');
  assert.equal(resolved.seats[1].location, 'Room A');
  const duplicate = resolveSlice(resolved, {
    now: resolved.phase.startedAt + 1, resolutionPhaseId: 'unused-duplicate', completedNoJailVote: true,
  });
  assert.equal(duplicate, resolved);
  assert.equal(duplicate.seats[1].health, 'Injured');
  PublicViewSchema.parse(project(resolved).public);
});

test('Protection only blocks when active in this round and unconsumed', () => {
  for (const mutation of [
    state => { state.seats[1].protection.activeFromRound = 3; },
    state => { state.seats[1].protection.consumed = true; },
  ]) {
    const state = makeState('protected');
    mutation(state);
    assert.equal(resolve(register(state).state).seats[1].health, 'Injured');
  }
});

test('validly registered attack survives later actor injury, Jail or elimination', () => {
  for (const mutate of [
    state => { state.seats[0].health = 'Injured'; },
    state => { state.seats[0].jailed = true; state.seats[0].location = 'Jail'; },
    state => { state.seats[0].health = 'Eliminated'; },
  ]) {
    const accepted = register().state;
    mutate(accepted);
    assert.equal(resolve(accepted).seats[1].health, 'Injured');
  }
});

test('deadline validates phase and private token; secret registration does not obsolete the timer', () => {
  const initial = makeState();
  const accepted = register(initial).state;
  const deadline = {
    phaseId: initial.phase.id, deadlineToken: initial.deadlineToken, now: initial.phase.endsAt,
    nextPhaseId: 'phase-b', nextDeadlineToken: 'deadline-b',
  };
  for (const overrides of [
    { now: initial.phase.endsAt - 1 }, { phaseId: 'obsolete-phase' }, { deadlineToken: 'obsolete-token' },
  ]) {
    const result = advanceDeadline(accepted, { ...deadline, ...overrides });
    assert.equal(result.advanced, false);
    assert.equal(result.state, accepted);
  }
  const result = advanceDeadline(accepted, deadline);
  assert.equal(result.advanced, true);
  assert.equal(result.state.activeSeatId, 'seat-2');
  assert.equal(result.state.attacks.length, 1);
  assert.equal(advanceDeadline(result.state, deadline).advanced, false);
});

test('delayed deadline opens the next full minute at actual evaluation time', () => {
  const initial = makeState();
  const now = initial.phase.endsAt + 90_000;
  const result = advanceDeadline(initial, {
    phaseId: initial.phase.id, deadlineToken: initial.deadlineToken, now,
    nextPhaseId: 'phase-b', nextDeadlineToken: 'deadline-b',
  });
  assert.equal(result.state.phase.startedAt, now);
  assert.equal(result.state.phase.endsAt, now + 60_000);
  assert.equal(result.state.revisions.public, initial.revisions.public + 1);
  for (const seatId of seatIds) assert.equal(result.state.revisions.players[seatId], initial.revisions.players[seatId] + 1);
  assert.equal(initial.activeSeatId, 'seat-1');
});

test('deadline and registration serialization gives one defined boundary outcome', () => {
  const initial = makeState();
  const beforeEnd = register(initial, { evaluatedAt: initial.phase.endsAt - 1 });
  assert.equal(beforeEnd.receipt.status, 'accepted');
  const deadline = {
    phaseId: initial.phase.id, deadlineToken: initial.deadlineToken, now: initial.phase.endsAt,
    nextPhaseId: 'phase-b', nextDeadlineToken: 'deadline-b',
  };
  assert.equal(advanceDeadline(beforeEnd.state, deadline).state.attacks.length, 1);
  const advancedFirst = advanceDeadline(initial, deadline).state;
  assert.equal(registerShot(advancedFirst, makeRequest(initial), context({ evaluatedAt: initial.phase.endsAt })).receipt.code, 'PHASE_CLOSED');
  assert.equal(advancedFirst.attacks.length, 0);
});

test('last turn expiry is private; resolution requires the explicit internal completed-vote prerequisite', () => {
  const initial = makeState();
  initial.remainingTurnSeatIds = [];
  const deadline = {
    phaseId: initial.phase.id, deadlineToken: initial.deadlineToken, now: initial.phase.endsAt,
    nextPhaseId: 'unused-phase', nextDeadlineToken: 'unused-deadline',
  };
  const result = advanceDeadline(initial, deadline);
  assert.equal(result.advanced, true);
  assert.equal(result.state.turnsComplete, true);
  assert.equal(result.state.deadlineToken, null);
  assert.deepEqual(project(result.state), project(initial));
  assert.equal(advanceDeadline(result.state, deadline).advanced, false);
  assert.equal(register(result.state, { evaluatedAt: initial.phase.endsAt - 1 }).receipt.code, 'PHASE_CLOSED');
  assert.throws(() => resolveSlice(initial, { now: initial.phase.endsAt, resolutionPhaseId: 'resolution-a', completedNoJailVote: true }));
  assert.throws(() => resolveSlice(result.state, { now: initial.phase.endsAt, resolutionPhaseId: 'resolution-a', completedNoJailVote: false }));
  assert.throws(() => resolveSlice(result.state, { now: initial.phase.endsAt - 1, resolutionPhaseId: 'resolution-a', completedNoJailVote: true }));
});

test('pinned replay of registration, delayed turns and resolution yields identical JSON', () => {
  const run = variant => {
    const accepted = register(makeState(variant));
    const complete = finishTurns(accepted.state, advanceDeadline, 25_000);
    const state = resolveSlice(complete, {
      now: complete.phase.endsAt, resolutionPhaseId: 'phase-resolution-a', completedNoJailVote: true,
    });
    return JSON.stringify({ state, receipt: accepted.receipt, views: project(state) });
  };
  for (const variant of ['protected', 'unprotected']) assert.equal(run(variant), run(variant));
});

test('invalid trusted times and repeated next-phase identities fail before mutation', () => {
  const initial = makeState();
  for (const evaluatedAt of [NaN, Infinity, -1, 0.5]) assert.throws(() => register(initial, { evaluatedAt }), RangeError);
  assert.throws(() => advanceDeadline(initial, {
    phaseId: initial.phase.id, deadlineToken: initial.deadlineToken, now: initial.phase.endsAt,
    nextPhaseId: initial.phase.id, nextDeadlineToken: 'deadline-b',
  }), RangeError);
  assert.equal(initial.seats[0].shotAvailable, true);
  assert.equal(initial.remainingTurnSeatIds.length, 8);
});

test('pure transitions preserve the private adapter-owned journal ordering', () => {
  const initial = makeState();
  initial.journalSequence = 42;
  const accepted = register(initial).state;
  const complete = finishTurns(accepted, advanceDeadline);
  const resolved = resolveSlice(complete, {
    now: complete.phase.endsAt, resolutionPhaseId: 'phase-resolution-a', completedNoJailVote: true,
  });
  assert.equal(accepted.journalSequence, 42);
  assert.equal(complete.journalSequence, 42);
  assert.equal(resolved.journalSequence, 42);
  assert.equal(JSON.stringify(project(resolved)).includes('journalSequence'), false);
});
