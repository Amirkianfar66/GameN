import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  FullCommandResponseSchema, FullAdvanceResponseSchema, FullOperationResponseSchema,
  FullLookupResponseSchema, FullPublicViewSchema, FullPlayerViewSchema, FullLobbyViewSchema,
  OwnAcknowledgmentsSchema, SeatSessionSchema,
} from '@mothership/contracts';
import {
  VOTE_RESULT_FULL_GAME_VERSION_PINS as VOTE_PINS, createFullGame, executeFullGame, advanceFullGame, abortFullGame,
  projectFullGame, projectOwnAcknowledgments,
} from '@mothership/engine';
import { createV1Service } from '../dist/index.js';
import { encodeV1Setup, encodeV1State, decodeV1Setup, decodeV1State } from '../dist/full-game.js';
import { assertLocalEmulators, createEmulatorIdentity, firestoreRequest } from '../../../infra/firebase/test/helpers.mjs';

let app, db;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const job = state => ({ matchId: state.matchId, phaseId: state.phase.id, deadlineToken: state.deadlineToken });
const operation = value => {
  const response = FullOperationResponseSchema.parse(value);
  assert.equal(response.ok, true, JSON.stringify(response)); return response.result;
};
before(() => {
  assertLocalEmulators();
  assert.equal(VOTE_PINS.engineVersion, 'full-game-1.4.0', 'This suite requires the reviewed vote-result tuple');
  app = initializeApp({ projectId: 'demo-mothership' }, `vote-result-${randomUUID()}`); db = getFirestore(app);
});
after(async () => { await db?.terminate(); if (app) await deleteApp(app); });

async function seed(playerCount) {
  // Explicit local Admin synthetic initial SETUP, with legal independent role/room/order
  // inputs. This does not prove native lobby randomness or automatic Functions/Tasks
  // delivery. Every later gameplay state is produced by actual service operations;
  // no intermediate ballot, predecessor, health, continuation or result is injected.
  let now = 1_800_000_000_000;
  const players = await Promise.all(Array.from({ length: playerCount }, () => createEmulatorIdentity()));
  const [display, outsider] = await Promise.all([createEmulatorIdentity(), createEmulatorIdentity()]);
  const roleOrder = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien',
    ...(playerCount >= 8 ? ['Red Disabler'] : []), ...(playerCount === 9 ? ['Officer'] : [])];
  const ids = roleOrder.map((_, index) => `seat-${index + 1}`);
  const setup = { playerCount, roleOrder, codeExtraSeatIds: ['seat-1', 'seat-2', 'seat-3'],
    initialRooms: Object.fromEntries(ids.map((id, index) => [id, index < 5 ? 'Room A' : 'Room B'])),
    roundOrders: Array.from({ length: 5 }, () => [...ids]) };
  const matchId = `vote-result-${randomUUID()}`, base = db.collection('matches').doc(matchId);
  const context = { matchId, now, phaseId: randomUUID(), deadlineToken: randomUUID(),
    assetManifestVersion: 'vote-result-service-fixture-assets-v1',
    versions: { ...VOTE_PINS, assetManifestVersion: 'vote-result-service-fixture-assets-v1' } };
  const state = { ...createFullGame({ ...context, setup }), journalSequence: 1 }, views = projectFullGame(state);
  const seatBindings = state.seats.map((seat, index) => ({ seatId: seat.seatId, uid: players[index].uid,
    bindingRevision: 1, initialRoom: setup.initialRooms[seat.seatId] }));
  const batch = db.batch();
  batch.create(base.collection('control').doc('session'), { protocolVersion: 2, hostUid: players[0].uid,
    playerCount, status: 'running', roomCode: 'ABCDEF123456', createdAt: now, gameStarted: true });
  batch.create(base.collection('engine').doc('gameplayPins'), VOTE_PINS);
  batch.create(base.collection('engine').doc('current'), encodeV1State(state));
  batch.create(base.collection('lobby').doc('public'), FullLobbyViewSchema.parse({ protocolVersion: 2, matchId,
    playerCount, status: 'running', seats: seatBindings.map(({ seatId, initialRoom }) => ({ seatId, initialRoom })) }));
  batch.create(base.collection('members').doc(display.uid), { kind: 'display' });
  batch.create(base.collection('views').doc('public'), FullPublicViewSchema.parse(views.public));
  for (const binding of seatBindings) {
    const { seatId, ...stored } = binding;
    batch.create(base.collection('seats').doc(seatId), stored);
    batch.create(base.collection('members').doc(binding.uid), { kind: 'player', seatId, bindingRevision: 1 });
    batch.create(base.collection('seatSessions').doc(binding.uid), SeatSessionSchema.parse({ schemaVersion: 1, protocolVersion: 2,
      matchId, seatId, bindingRevision: 1 }));
    batch.create(base.collection('playerViews').doc(binding.uid), FullPlayerViewSchema.parse(views.players[seatId]));
    batch.create(base.collection('ownAcknowledgments').doc(binding.uid), projectOwnAcknowledgments(state, seatId));
  }
  batch.create(base.collection('events').doc(randomUUID()), { journalVersion: 1, sequence: 1, kind: 'SETUP', ...context,
    setup: encodeV1Setup(setup), verifiedUid: players[0].uid, dealId: `synthetic-${randomUUID()}`, seatBindings });
  const taskId = hash([matchId, state.phase.id, state.deadlineToken]);
  batch.create(base.collection('outbox').doc(taskId), { protocolVersion: 2, ...job(state), taskId,
    endsAt: state.phase.endsAt, status: 'pending', attempts: 0, nextAttemptAt: now, leaseUntil: null, leaseToken: null });
  await batch.commit();
  const options = { db, clock: () => now,
    randomInitialRoom: () => assert.fail('Recorded SETUP must not draw rooms'),
    randomStartingRoomRank: () => assert.fail('Recorded SETUP must not redraw rooms') };
  const h = { base, players, display, outsider, service: createV1Service(options), options,
    now: () => now, setTime: value => { assert.ok(value >= now, 'Trusted fixture clock must not regress'); now = value; },
    current: async () => decodeV1State((await base.collection('engine').doc('current').get()).data()) };
  h.request = (fields = {}) => ({ protocolVersion: 2, matchId, requestId: randomUUID(), ...fields });
  // Scope only the candidate query to this real fixture/phase. All service queries,
  // dispatches and transaction decisions remain real Firestore, with no mock state.
  h.repairFor = phaseId => createV1Service({ ...options, db: {
    collection: name => db.collection(name), doc: path => db.doc(path),
    runTransaction: callback => db.runTransaction(callback),
    collectionGroup: name => { assert.equal(name, 'outbox'); return base.collection(name).where('phaseId', '==', phaseId); },
  } });
  return h;
}
const journal = async h => (await h.base.collection('events').orderBy('sequence').get()).docs.map(doc => doc.data());
async function submit(h, seatId, command, phaseId) {
  const state = await h.current(); h.setTime(Math.max(h.now(), state.phase.startedAt + 1));
  const request = { protocolVersion: 2, matchId: h.base.id, phaseId: phaseId ?? state.phase.id, commandId: randomUUID(), command };
  const response = FullCommandResponseSchema.parse(await h.service.submit(h.players[Number(seatId.slice(5)) - 1].uid, request));
  assert.equal(response.ok, true, JSON.stringify(response)); return { request, receipt: response.receipt };
}
async function accept(h, seatId, command) {
  const response = await submit(h, seatId, command);
  assert.equal(response.receipt.status, 'accepted', JSON.stringify(response)); return response;
}
async function expire(h) {
  const state = await h.current(); assert.notEqual(state.phase.endsAt, null);
  h.setTime(state.phase.endsAt);
  const response = FullAdvanceResponseSchema.parse(await h.service.runDeadline(job(state)));
  assert.equal(response.result, 'advanced', JSON.stringify(response)); return h.current();
}
async function until(h, predicate) {
  for (let bound = 0; bound < 160; bound++) {
    const state = await h.current(); if (predicate(state)) return state;
    assert.notEqual(state.phase.endsAt, null, 'Fixture reached terminal before its checkpoint');
    if (state.phase.kind === 'ORDINARY_TURN') await accept(h, state.activeSeatId, { type: 'PASS_TURN' });
    else await expire(h);
  }
  assert.fail('Canonical service lifecycle must reach its bounded checkpoint');
}
async function voteAll(h, command) {
  const state = await h.current(); const responses = [];
  for (const seatId of state.eligibleVoters) responses.push(await accept(h, seatId, command));
  return responses;
}
async function assertStored(h) {
  const state = await h.current(), projected = projectFullGame(state);
  assert.deepEqual(FullPublicViewSchema.parse((await h.base.collection('views').doc('public').get()).data()), projected.public);
  for (const [index, seat] of state.seats.entries()) {
    const uid = h.players[index].uid, binding = (await h.base.collection('seats').doc(seat.seatId).get()).data();
    assert.deepEqual(FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(uid).get()).data()), projected.players[seat.seatId]);
    assert.deepEqual(OwnAcknowledgmentsSchema.parse((await h.base.collection('ownAcknowledgments').doc(uid).get()).data()),
      projectOwnAcknowledgments(state, seat.seatId, binding.bindingRevision));
  }
  assert.deepEqual((await h.base.collection('engine').doc('gameplayPins').get()).data(), VOTE_PINS);
  return state;
}
function assertResult(state, previous, outcome) {
  assert.equal(state.phase.kind, 'VOTE_RESULT'); assert.equal(state.phase.endsAt - state.phase.startedAt, 5000);
  const result = projectFullGame(state).public.voteResult;
  assert.equal(result.id, state.phase.id); assert.equal(result.votePhaseId, previous.phase.id);
  assert.equal(result.kind, previous.phase.kind); assert.equal(result.round, previous.round);
  assert.equal(result.startedAt, state.phase.startedAt); assert.equal(result.endsAt, state.phase.endsAt);
  assert.equal(result.outcome, outcome); assert.deepEqual(state.ballots, []);
  assert.deepEqual(state.eligibleVoters, []); assert.deepEqual(state.eligibleTargets, []);
  for (const view of Object.values(projectFullGame(state).players)) {
    assert.deepEqual(view.voteResult, result); assert.deepEqual(view.legalTargets, {});
    assert.deepEqual(view.self.movementDestinations, []); assert.equal(view.self.codeAttemptAvailable, false);
    assert.equal(view.ownBallot, null); assert.equal(view.hasVoted, false);
  }
  assert.equal(projectFullGame(state).public.endReveal, null); assert.equal(state.result, null);
  return result;
}
async function assertReplay(h) {
  const records = await journal(h);
  assert.deepEqual(records.map(record => record.sequence), Array.from({ length: records.length }, (_, index) => index + 1));
  let replay;
  for (const record of records) {
    if (record.kind === 'SETUP') replay = createFullGame({ ...record, setup: decodeV1Setup(record.setup) });
    else if (record.kind === 'COMMAND') {
      const decision = executeFullGame(replay, record.actorSeatId, record.request, record);
      assert.deepEqual(decision.receipt, record.receipt); replay = decision.state;
    } else if (record.kind === 'DEADLINE') {
      const decision = advanceFullGame(replay, record); assert.equal(decision.advanced, true); replay = decision.state;
    } else if (record.kind === 'ABORT') replay = abortFullGame(replay, record);
    else assert.fail('Unexpected journal decision');
    replay = { ...replay, journalSequence: record.sequence };
  }
  assert.deepEqual(replay, await h.current());
  assert.equal((await h.base.collection('receipts').get()).size, records.filter(record => record.kind === 'COMMAND').length);
  await assertStored(h);
}
async function publicationSnapshot(h, excludedSeatId) {
  const refs = [h.base.collection('views').doc('public')];
  for (const [index, player] of h.players.entries()) if (`seat-${index + 1}` !== excludedSeatId) {
    refs.push(h.base.collection('playerViews').doc(player.uid), h.base.collection('ownAcknowledgments').doc(player.uid));
  }
  return Promise.all(refs.map(async ref => { const document = await ref.get();
    return { path: ref.path, data: document.data(), updateTime: { seconds: document.updateTime.seconds, nanoseconds: document.updateTime.nanoseconds } }; }));
}
async function audienceCounts(h) {
  return Promise.all(['public', ...h.players.map((_, index) => `p-seat-${index + 1}`)]
    .map(async key => [key, (await h.base.collection('audienceEvents').doc(key).collection('items').get()).size]));
}

for (const playerCount of [7, 8, 9]) {
  test(`${playerCount} seats: secret Jail ballots, stale receipts and concurrent result deadlines preserve a five-second result and a full next vote`, async () => {
    const h = await seed(playerCount), vote = await until(h, state => state.phase.kind === 'JAIL_VOTE');
    const untouched = await publicationSnapshot(h, 'seat-1'), counts = await audienceCounts(h);
    const first = await accept(h, 'seat-1', { type: 'VOTE', targetSeatId: 'seat-2' });
    assert.deepEqual(await publicationSnapshot(h, 'seat-1'), untouched, 'An individual ballot cannot rewrite public/uninvolved private documents');
    const afterCounts = await audienceCounts(h);
    assert.deepEqual(afterCounts.filter(([key]) => key !== 'p-seat-1'), counts.filter(([key]) => key !== 'p-seat-1'));
    for (const seatId of vote.eligibleVoters.filter(id => id !== 'seat-1')) await accept(h, seatId, { type: 'VOTE', targetSeatId: 'seat-2' });
    const resultState = await expire(h), result = assertResult(resultState, vote, 'PLAYER_JAILED');
    assert.equal(result.selectedSeatId, 'seat-2'); assert.equal(result.counts['seat-2'], playerCount);
    assert.equal(resultState.seats.find(seat => seat.seatId === 'seat-2').location, 'Jail');
    await assertStored(h);
    for (const identity of [h.players[0], h.display]) assert.equal((await firestoreRequest(`${h.base.path}/views/public`, { idToken: identity.idToken })).status, 200);
    assert.equal((await firestoreRequest(`${h.base.path}/playerViews/${h.players[1].uid}`, { idToken: h.display.idToken })).status, 403);
    assert.equal((await firestoreRequest(`${h.base.path}/engine/current`, { idToken: h.players[0].idToken })).status, 403);
    assert.equal((await firestoreRequest(`${h.base.path}/views/public`, { idToken: h.outsider.idToken })).status, 403);
    const beforeReplay = await h.current();
    assert.deepEqual(FullCommandResponseSchema.parse(await h.service.submit(h.players[0].uid, first.request)).receipt, first.receipt);
    assert.deepEqual(FullLookupResponseSchema.parse(await h.service.lookup(h.players[0].uid, { protocolVersion: 2, matchId: h.base.id, commandId: first.request.commandId })).receipt, first.receipt);
    const conflict = FullCommandResponseSchema.parse(await h.service.submit(h.players[0].uid, { ...first.request, command: { type: 'VOTE', targetSeatId: 'seat-1' } }));
    assert.equal(conflict.ok, false); assert.equal(conflict.error.code, 'COMMAND_ID_CONFLICT');
    assert.deepEqual(await h.current(), beforeReplay, 'Receipt recovery or conflicting reuse cannot reopen a closed vote');
    const stale = await submit(h, 'seat-1', { type: 'VOTE', targetSeatId: 'seat-1' }, vote.phase.id);
    assert.equal(stale.receipt.status, 'rejected'); assert.equal(stale.receipt.code, 'PHASE_CLOSED');
    const blocked = await submit(h, 'seat-1', { type: 'MOVE', destination: 'Room B' });
    assert.equal(blocked.receipt.status, 'rejected'); assert.equal(blocked.receipt.code, 'NOT_ALLOWED');
    const persisted = await h.current(), events = await journal(h), audiences = await audienceCounts(h);
    h.setTime(resultState.phase.startedAt + 4999);
    assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline(job(resultState))).result, 'unchanged');
    assert.deepEqual(await h.current(), persisted); assert.deepEqual(await journal(h), events);
    h.setTime(resultState.phase.endsAt);
    const concurrent = await Promise.all(Array.from({ length: 3 }, () => h.service.runDeadline(job(resultState))));
    assert.deepEqual(concurrent.map(response => FullAdvanceResponseSchema.parse(response).result).sort(), ['advanced', 'unchanged', 'unchanged']);
    const next = await h.current(); assert.equal(next.phase.kind, 'CAPTAIN_ELECTION'); assert.equal(next.round, 2);
    assert.equal(next.phase.startedAt, h.now()); assert.equal(next.phase.endsAt - next.phase.startedAt, 60_000);
    assert.equal(projectFullGame(next).public.voteResult, null);
    assert.equal((await journal(h)).filter(record => record.kind === 'DEADLINE' && record.phaseId === resultState.phase.id).length, 1);
    const nextCounts = await audienceCounts(h); assert.notDeepEqual(nextCounts, audiences);
    assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline(job(vote))).result, 'unchanged');
    assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline(job(resultState))).result, 'unchanged');
    assert.deepEqual(await h.current(), next); assert.deepEqual(await audienceCounts(h), nextCounts);
    await assertReplay(h);
  });

  test(`${playerCount} seats: each positive election tie and elected Captain has a result before its complete next window`, async () => {
    const h = await seed(playerCount), election = await until(h, state => state.phase.kind === 'CAPTAIN_ELECTION');
    for (const [index, seatId] of election.eligibleVoters.entries()) await accept(h, seatId, { type: 'VOTE', targetSeatId: index < 2 ? 'seat-1' : index < 4 ? 'seat-2' : null });
    const tied = await expire(h), result = assertResult(tied, election, 'RUNOFF_REQUIRED');
    assert.deepEqual(result.tiedSeatIds, ['seat-1', 'seat-2']); assert.equal(tied.seats.some(seat => seat.captain), false);
    const runoff = await expire(h); assert.equal(runoff.phase.kind, 'CAPTAIN_ELECTION');
    assert.deepEqual(runoff.eligibleTargets, ['seat-1', 'seat-2']); assert.equal(runoff.phase.endsAt - runoff.phase.startedAt, 60_000);
    await voteAll(h, { type: 'VOTE', targetSeatId: 'seat-1' });
    const elected = await expire(h); assertResult(elected, runoff, 'CAPTAIN_ELECTED');
    const captain = elected.seats.find(seat => seat.seatId === 'seat-1'); assert.equal(captain.captain, true); assert.equal(captain.location, 'Command Room');
    await assertStored(h);
    const turn = await expire(h); assert.equal(turn.phase.kind, 'ORDINARY_TURN'); assert.equal(turn.activeSeatId, 'seat-1');
    assert.equal(turn.phase.endsAt - turn.phase.startedAt, 60_000); assert.equal(projectFullGame(turn).public.voteResult, null);
    await assertReplay(h);
  });

  for (const approve of [true, false]) test(`${playerCount} seats: release-choice has no fabricated tally and ${approve ? 'accepted' : 'denied'} release result precedes a full Jail vote`, async () => {
    const h = await seed(playerCount); await until(h, state => state.phase.kind === 'JAIL_VOTE');
    await voteAll(h, { type: 'VOTE', targetSeatId: 'seat-2' }); await expire(h);
    await until(h, state => state.phase.kind === 'CAPTAIN_ELECTION');
    await voteAll(h, { type: 'VOTE', targetSeatId: 'seat-1' }); await expire(h);
    const choice = await until(h, state => state.phase.kind === 'RELEASE_CHOICE');
    await accept(h, 'seat-1', { type: 'RELEASE_CHOICE', targetSeatId: 'seat-2' });
    const vote = await expire(h); assert.equal(vote.phase.kind, 'RELEASE_VOTE'); assert.equal(projectFullGame(vote).public.voteResult, null);
    assert.notEqual(vote.phase.id, choice.phase.id);
    await voteAll(h, { type: 'RELEASE_VOTE', approve });
    const released = await expire(h), result = assertResult(released, vote, approve ? 'PLAYER_RELEASED' : 'RELEASE_DENIED');
    assert.equal(result.selectedSeatId, 'seat-2'); assert.equal(result.released, approve); assert.equal(result.yesCount, approve ? playerCount : 0);
    const prisoner = released.seats.find(seat => seat.seatId === 'seat-2'); assert.equal(prisoner.jailed, !approve); assert.equal(prisoner.location, approve ? 'Room A' : 'Jail');
    const jail = await expire(h); assert.equal(jail.phase.kind, 'JAIL_VOTE'); assert.equal(jail.phase.endsAt - jail.phase.startedAt, 60_000);
    assert.equal(projectFullGame(jail).public.voteResult, null); await assertReplay(h);
  });

  test(`${playerCount} seats: acknowledged lost result deadline is repaired without a browser and starts one complete late next window`, async () => {
    const h = await seed(playerCount), vote = await until(h, state => state.phase.kind === 'JAIL_VOTE');
    const result = await expire(h); assertResult(result, vote, 'NO_JAIL_SELECTION');
    const taskId = hash([h.base.id, result.phase.id, result.deadlineToken]), ref = h.base.collection('outbox').doc(taskId);
    let enqueueCalls = 0;
    assert.equal((await h.service.dispatchDeadlineIntent(ref.path, async intent => { enqueueCalls++; assert.equal(intent.taskId, taskId); assert.equal(intent.endsAt, result.phase.endsAt); })).status, 'dispatched');
    assert.equal(enqueueCalls, 1); assert.equal((await ref.get()).get('status'), 'dispatched');
    const repair = h.repairFor(result.phase.id), noEnqueue = async () => assert.fail('Acknowledged lost task must not require another enqueue');
    h.setTime(result.phase.startedAt + 4999); await repair.repairOutbox(noEnqueue, { limit: 1 });
    assert.deepEqual(await h.current(), result);
    h.setTime(result.phase.endsAt + 90_000);
    await Promise.all([repair.repairOutbox(noEnqueue, { limit: 1 }), h.service.runDeadline(job(result))]);
    const next = await h.current(); assert.equal(next.phase.kind, 'CAPTAIN_ELECTION'); assert.equal(next.phase.startedAt, h.now());
    assert.equal(next.phase.endsAt, h.now() + 60_000); assert.equal((await ref.get()).get('status'), 'completed');
    const records = await journal(h);
    assert.equal(records.filter(record => record.kind === 'DEADLINE' && record.phaseId === result.phase.id).length, 1);
    await repair.repairOutbox(noEnqueue, { limit: 1 });
    assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline(job(result))).result, 'unchanged');
    assert.deepEqual(await h.current(), next); assert.deepEqual(await journal(h), records); await assertReplay(h);
  });

  test(`${playerCount} seats: seat recovery retains the remaining result time and abort clears it without replaying a vote`, async () => {
    const h = await seed(playerCount), vote = await until(h, state => state.phase.kind === 'JAIL_VOTE');
    const ballot = await accept(h, 'seat-3', { type: 'VOTE', targetSeatId: 'seat-2' });
    const result = await expire(h); assertResult(result, vote, 'NO_JAIL_SELECTION');
    h.setTime(result.phase.startedAt + 1500);
    const old = h.players[2], replacement = await createEmulatorIdentity();
    const issued = operation(await h.service.issueSeatRecovery(h.players[0].uid, h.request({ seatId: 'seat-3' })));
    assert.equal(typeof issued.recoveryToken, 'string');
    h.setTime(result.phase.startedAt + 2000);
    operation(await h.service.redeemSeatRecovery(replacement.uid, h.request({ recoveryToken: issued.recoveryToken })));
    h.players[2] = replacement;
    assert.deepEqual((await h.current()).phase, result.phase, 'Recovery cannot restart the five-second result');
    const restored = FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(replacement.uid).get()).data());
    assert.equal(restored.voteResult.endsAt - h.now(), 3000); assert.deepEqual(restored.voteResult, projectFullGame(result).players['seat-3'].voteResult);
    assert.equal((await firestoreRequest(`${h.base.path}/playerViews/${replacement.uid}`, { idToken: old.idToken })).status, 403);
    const forbidden = await h.service.lookup(old.uid, { protocolVersion: 2, matchId: h.base.id, commandId: ballot.request.commandId });
    assert.equal(forbidden.error.code, 'FORBIDDEN', 'Revoked identity cannot recover even its old receipt');
    assert.deepEqual(FullLookupResponseSchema.parse(await h.service.lookup(replacement.uid, { protocolVersion: 2, matchId: h.base.id, commandId: ballot.request.commandId })).receipt, ballot.receipt);
    await assertStored(h);
    h.setTime(result.phase.startedAt + 3000); operation(await h.service.abortMatch(h.players[0].uid, h.request()));
    const aborted = await h.current(); assert.equal(aborted.phase.kind, 'ABORTED'); assert.equal(aborted.phase.endsAt, null);
    assert.equal(projectFullGame(aborted).public.voteResult, null);
    assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline(job(result))).result, 'unchanged');
    assert.deepEqual(await h.current(), aborted); await assertReplay(h);
  });

  test(`${playerCount} seats: Round 5 final Jail result precedes terminal reveal and grants no extra Code attempt`, async () => {
    const h = await seed(playerCount), vote = await until(h, state => state.round === 5 && state.phase.kind === 'JAIL_VOTE');
    const result = await expire(h); assertResult(result, vote, 'NO_JAIL_SELECTION');
    const blocked = await submit(h, 'seat-6', { type: 'SUBMIT_CODE', seatIds: [...result.code] });
    assert.equal(blocked.receipt.status, 'rejected'); assert.equal(blocked.receipt.code, 'NOT_ALLOWED');
    assert.equal((await h.current()).codeSubmitted, false); assert.equal(projectFullGame(await h.current()).public.endReveal, null);
    h.setTime(result.phase.startedAt + 4999);
    assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline(job(result))).result, 'unchanged');
    assert.equal((await h.current()).phase.kind, 'VOTE_RESULT');
    const terminal = await expire(h); assert.equal(terminal.phase.kind, 'FINISHED'); assert.equal(terminal.result.winner, 'Blue');
    assert.equal(terminal.phase.endsAt, null); assert.notEqual(projectFullGame(terminal).public.endReveal, null);
    assert.equal(projectFullGame(terminal).public.voteResult, null);
    const records = await journal(h);
    assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline(job(result))).result, 'unchanged');
    assert.deepEqual(await journal(h), records); await assertReplay(h);
  });
}
