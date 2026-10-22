import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  FullCommandResponseSchema, FullAdvanceResponseSchema, FullOperationResponseSchema,
  FullLookupResponseSchema, FullPublicViewSchema, FullPlayerViewSchema, FullLobbyViewSchema, FullEventSchema,
  OwnAcknowledgmentsSchema, SeatSessionSchema,
} from '@mothership/contracts';
import {
  DECLARED_HACK_FULL_GAME_VERSION_PINS as HACK_PINS, createFullGame, executeFullGame, advanceFullGame, abortFullGame,
  projectFullGame, projectOwnAcknowledgments,
} from '@mothership/engine';
import { createV1Service } from '../dist/index.js';
import { encodeV1Setup, encodeV1State, decodeV1Setup, decodeV1State } from '../dist/full-game.js';
import { assertLocalEmulators, createEmulatorIdentity, firestoreRequest } from '../../../infra/firebase/test/helpers.mjs';
import { createV1DeadlineHandler } from '../../../infra/firebase/dist/v1.js';

let app, db;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const job = state => ({ matchId: state.matchId, phaseId: state.phase.id, deadlineToken: state.deadlineToken });
const operation = value => {
  const response = FullOperationResponseSchema.parse(value);
  assert.equal(response.ok, true, JSON.stringify(response)); return response.result;
};
before(() => {
  assertLocalEmulators();
  assert.equal(HACK_PINS.engineVersion, 'full-game-1.5.0', 'This suite requires the reviewed declared-Hack tuple');
  app = initializeApp({ projectId: 'demo-mothership' }, `declared-hack-${randomUUID()}`); db = getFirestore(app);
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
  const matchId = `declared-hack-${randomUUID()}`, base = db.collection('matches').doc(matchId);
  const context = { matchId, now, phaseId: randomUUID(), deadlineToken: randomUUID(),
    assetManifestVersion: 'declared-hack-service-fixture-assets-v1',
    versions: { ...HACK_PINS, assetManifestVersion: 'declared-hack-service-fixture-assets-v1' } };
  const state = { ...createFullGame({ ...context, setup }), journalSequence: 1 }, views = projectFullGame(state);
  const seatBindings = state.seats.map((seat, index) => ({ seatId: seat.seatId, uid: players[index].uid,
    bindingRevision: 1, initialRoom: setup.initialRooms[seat.seatId] }));
  const batch = db.batch();
  batch.create(base.collection('control').doc('session'), { protocolVersion: 2, hostUid: players[0].uid,
    playerCount, status: 'running', roomCode: 'ABCDEF123456', createdAt: now, gameStarted: true });
  batch.create(base.collection('engine').doc('gameplayPins'), HACK_PINS);
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
async function assertStored(h) {
  const state = await h.current(), projected = projectFullGame(state);
  assert.deepEqual(FullPublicViewSchema.parse((await h.base.collection('views').doc('public').get()).data()), projected.public);
  for (const [index, seat] of state.seats.entries()) {
    const uid = h.players[index].uid, binding = (await h.base.collection('seats').doc(seat.seatId).get()).data();
    assert.deepEqual(FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(uid).get()).data()), projected.players[seat.seatId]);
    assert.deepEqual(OwnAcknowledgmentsSchema.parse((await h.base.collection('ownAcknowledgments').doc(uid).get()).data()),
      projectOwnAcknowledgments(state, seat.seatId, binding.bindingRevision));
  }
  assert.deepEqual((await h.base.collection('engine').doc('gameplayPins').get()).data(), HACK_PINS);
  return state;
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

async function retryUnavailable(deliver) {
  let response;
  for (let attempt = 0; attempt < 5; attempt++) {
    response = await deliver();
    if (response.error?.code !== 'UNAVAILABLE') return response;
  }
  assert.fail(`Persistent transaction failure: ${JSON.stringify(response)}`);
}
async function openHack(h, { target = 'seat-2', close = 'pass' } = {}) {
  const untouched = await publicationSnapshot(h, 'seat-1'), counts = await audienceCounts(h);
  const request = await accept(h, 'seat-1', { type: 'REQUEST_HACK', targetSeatId: target });
  assert.deepEqual(await publicationSnapshot(h, 'seat-1'), untouched,
    'Private registration cannot rewrite public or uninvolved private documents');
  assert.deepEqual((await audienceCounts(h)).filter(([key]) => key !== 'p-seat-1'),
    counts.filter(([key]) => key !== 'p-seat-1'));
  if (close === 'expiry') await expire(h);
  else await accept(h, 'seat-1', { type: 'PASS_TURN' });
  const state = await assertStored(h);
  assert.equal(state.phase.kind, 'HACK_DECLARE');
  assert.equal(state.phase.endsAt - state.phase.startedAt, 15_000);
  assert.equal(state.activeSeatId, 'seat-1');
  assert.equal(state.activeHack.targetSeatId, target);
  return { state, request };
}
async function assertExchange(h, state, target, hackId, status, side) {
  const stored = await assertStored(h); assert.deepEqual(stored, state);
  const publicView = (await h.base.collection('views').doc('public').get()).data();
  assert.equal(Object.hasOwn(publicView, 'hackFeedback'), false);
  assert.equal(Object.hasOwn(publicView, 'hackPartnerSeatId'), false);
  assert.equal(state.activeSeatId, 'seat-1');
  for (const [index, player] of h.players.entries()) {
    const id = `seat-${index + 1}`;
    const view = FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(player.uid).get()).data());
    if (id === 'seat-1' || id === target) {
      assert.deepEqual(view.hackFeedback, { hackId, phaseId: state.phase.id, round: state.round,
        status, declaredSide: side });
      assert.equal(view.hackPartnerSeatId, id === 'seat-1' ? target : 'seat-1');
    } else {
      assert.equal(view.hackFeedback, null); assert.equal(view.hackPartnerSeatId, null);
    }
    assert.deepEqual(view.legalTargets.DECLARE_HACK_SIDE,
      state.phase.kind === 'HACK_DECLARE' && id === target ? [target] : undefined);
  }
}
const participantRequest = (h, state, side = 'Blue', commandId = randomUUID()) => ({
  protocolVersion: 2, matchId: h.base.id, phaseId: state.phase.id, commandId,
  command: { type: 'DECLARE_HACK_SIDE', declaredSide: side },
});
async function declaration(h, state, side = 'Blue', target = 'seat-2') {
  const request = participantRequest(h, state, side);
  const response = FullCommandResponseSchema.parse(await h.service.submit(h.players[Number(target.slice(5)) - 1].uid, request));
  assert.equal(response.ok, true, JSON.stringify(response)); assert.equal(response.receipt.status, 'accepted');
  return { request, receipt: response.receipt, state: await h.current() };
}
async function assertNoContinuation(h, state, early = false) {
  const records = await journal(h), counts = await audienceCounts(h);
  const response = await h.service.runDeadline(job(state));
  if (early) assert.deepEqual(response, { status: 'too-early', retryAfterMs: state.phase.endsAt - h.now() });
  else assert.equal(FullAdvanceResponseSchema.parse(response).result, 'unchanged');
  assert.deepEqual(await journal(h), records); assert.deepEqual(await audienceCounts(h), counts);
}

for (const playerCount of [7, 8, 9]) {
  test(`${playerCount} seats: early queue delivery retries every Hack window while public advance and stale tasks stay unchanged`, async () => {
    const h = await seed(playerCount);
    await accept(h, 'seat-1', { type: 'REQUEST_HACK', targetSeatId: 'seat-2' });
    const handler = createV1DeadlineHandler(h.service), previous = [];
    for (const [kind, nextKind, duration] of [
      ['ORDINARY_TURN', 'HACK_DECLARE', 15_000], ['HACK_DECLARE', 'HACK_RESULT', 5000],
      ['HACK_RESULT', 'HACK', 60_000], ['HACK', 'ORDINARY_TURN', 60_000],
    ]) {
      const state = await h.current(); assert.equal(state.phase.kind, kind);
      h.setTime(state.phase.endsAt - 1);
      const records = await journal(h), counts = await audienceCounts(h);
      assert.deepEqual(await h.service.runDeadline(job(state)), { status: 'too-early', retryAfterMs: 1 });
      await assert.rejects(handler(job(state)), /^Error: Deadline has not elapsed$/);
      assert.equal(FullAdvanceResponseSchema.parse(await h.service.advance(h.display.uid,
        { protocolVersion: 2, matchId: h.base.id, phaseId: state.phase.id })).result, 'unchanged');
      assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline({ ...job(state), deadlineToken: randomUUID() })).result, 'unchanged');
      for (const old of previous) assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline(old)).result, 'unchanged');
      assert.deepEqual(await h.current(), state); assert.deepEqual(await journal(h), records);
      assert.deepEqual(await audienceCounts(h), counts); await assertStored(h);
      h.setTime(state.phase.endsAt);
      await handler(job(state));
      const next = await h.current(); assert.equal(next.phase.kind, nextKind);
      assert.equal(next.phase.startedAt, h.now()); assert.equal(next.phase.endsAt - next.phase.startedAt, duration);
      const committed = await journal(h);
      assert.equal(committed.filter(record => record.kind === 'DEADLINE' && record.phaseId === state.phase.id).length, 1);
      await handler(job(state));
      assert.deepEqual(await h.current(), next); assert.deepEqual(await journal(h), committed);
      previous.push(job(state));
    }
    await assertReplay(h);
  });

  for (const close of ['pass', 'expiry']) test(`${playerCount} seats: ${close}, early declaration, five-second private result and full sixty-second talk persist and replay`, async () => {
    const h = await seed(playerCount), { state: opened } = await openHack(h, { close });
    const hackId = opened.phase.id;
    await assertExchange(h, opened, 'seat-2', hackId, 'AWAITING_DECLARATION', null);
    h.setTime(opened.phase.startedAt + 1234);
    const invalid = await submit(h, 'seat-2', { type: 'DECLARE_HACK_SIDE', declaredSide: 'Alien' });
    assert.equal(invalid.receipt.status, 'rejected'); assert.equal(invalid.receipt.code, 'NOT_ALLOWED');
    assert.deepEqual((await h.current()).phase, opened.phase, 'Invalid side cannot consume or end declaration');
    const accepted = await declaration(h, opened), result = accepted.state;
    assert.equal(result.phase.kind, 'HACK_RESULT');
    assert.equal(result.phase.startedAt, h.now()); assert.equal(result.phase.endsAt, h.now() + 5000);
    await assertExchange(h, result, 'seat-2', hackId, 'DECLARED', 'Blue');
    // The old phase is the receipt binding even though acceptance opened a result.
    assert.equal(accepted.receipt.phaseId, opened.phase.id);
    assert.equal(accepted.receipt.commandId, accepted.request.commandId);
    const records = await journal(h), beforeRecovery = await h.current();
    assert.deepEqual(FullCommandResponseSchema.parse(await h.service.submit(h.players[1].uid, accepted.request)).receipt, accepted.receipt);
    assert.deepEqual(FullLookupResponseSchema.parse(await h.service.lookup(h.players[1].uid,
      { protocolVersion: 2, matchId: h.base.id, commandId: accepted.request.commandId })).receipt, accepted.receipt);
    const conflict = FullCommandResponseSchema.parse(await h.service.submit(h.players[1].uid,
      { ...accepted.request, command: { type: 'DECLARE_HACK_SIDE', declaredSide: 'Red' } }));
    assert.equal(conflict.ok, false); assert.equal(conflict.error.code, 'COMMAND_ID_CONFLICT');
    assert.deepEqual(await h.current(), beforeRecovery); assert.deepEqual(await journal(h), records);
    const stale = await submit(h, 'seat-2', { type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue' }, opened.phase.id);
    assert.equal(stale.receipt.status, 'rejected'); assert.equal(stale.receipt.code, 'PHASE_CLOSED');
    const blocked = await submit(h, 'seat-2', { type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue' });
    assert.equal(blocked.receipt.status, 'rejected'); assert.equal(blocked.receipt.code, 'NOT_ALLOWED');
    h.setTime(result.phase.startedAt + 4999); await assertNoContinuation(h, result, true);
    h.setTime(result.phase.endsAt);
    const raced = await Promise.all(Array.from({ length: 3 }, () => retryUnavailable(() => h.service.runDeadline(job(result)))));
    assert.deepEqual(raced.map(response => FullAdvanceResponseSchema.parse(response).result).sort(), ['advanced', 'unchanged', 'unchanged']);
    const talk = await h.current(); assert.equal(talk.phase.kind, 'HACK');
    assert.equal(talk.phase.startedAt, h.now()); assert.equal(talk.phase.endsAt, h.now() + 60_000);
    await assertExchange(h, talk, 'seat-2', hackId, 'DECLARED', 'Blue');
    await assertNoContinuation(h, result);
    h.setTime(talk.phase.endsAt - 1); await assertNoContinuation(h, talk, true);
    const next = await expire(h); assert.equal(next.phase.kind, 'ORDINARY_TURN'); assert.equal(next.activeSeatId, 'seat-2');
    for (const view of Object.values(projectFullGame(next).players)) {
      assert.equal(view.hackFeedback, null); assert.equal(view.hackPartnerSeatId, null);
    }
    // Receipt recovery after the whole exchange cannot resurrect feedback.
    assert.deepEqual(FullCommandResponseSchema.parse(await h.service.submit(h.players[1].uid, accepted.request)).receipt, accepted.receipt);
    assert.deepEqual(await h.current(), next); await assertReplay(h);
  });

  test(`${playerCount} seats: declaration/deadline races use exact 14999/15000 server boundaries and preserve no-declaration`, async () => {
    for (const elapsed of [14_999, 15_000]) {
      const h = await seed(playerCount), { state: opened } = await openHack(h);
      h.setTime(opened.phase.startedAt + elapsed);
      const request = participantRequest(h, opened);
      const [submitted, deadline] = await Promise.all([
        retryUnavailable(() => h.service.submit(h.players[1].uid, request)),
        retryUnavailable(() => h.service.runDeadline(job(opened))),
      ]);
      const response = FullCommandResponseSchema.parse(submitted);
      assert.equal(response.ok, true, JSON.stringify(response));
      assert.equal(response.receipt.status, elapsed === 14_999 ? 'accepted' : 'rejected');
      if (elapsed === 15_000) assert.equal(response.receipt.code, 'PHASE_CLOSED');
      if (elapsed === 14_999 && deadline.status === 'too-early') {
        assert.deepEqual(deadline, { status: 'too-early', retryAfterMs: 1 });
      } else assert.equal(FullAdvanceResponseSchema.parse(deadline).result, elapsed === 14_999 ? 'unchanged' : 'advanced');
      const result = await h.current(); assert.equal(result.phase.kind, 'HACK_RESULT');
      assert.equal(result.phase.startedAt, h.now()); assert.equal(result.phase.endsAt, h.now() + 5000);
      await assertExchange(h, result, 'seat-2', opened.phase.id,
        elapsed === 14_999 ? 'DECLARED' : 'NO_DECLARATION', elapsed === 14_999 ? 'Blue' : null);
      await assertNoContinuation(h, opened);
      const talk = await expire(h); assert.equal(talk.phase.endsAt - talk.phase.startedAt, 60_000);
      await assertExchange(h, talk, 'seat-2', opened.phase.id,
        elapsed === 14_999 ? 'DECLARED' : 'NO_DECLARATION', elapsed === 14_999 ? 'Blue' : null);
      await assertReplay(h);
    }
  });

  test(`${playerCount} seats: acknowledged lost declaration/result tasks repair once without a browser and retain full late windows`, async () => {
    const h = await seed(playerCount), { state: opened } = await openHack(h);
    for (const [previous, nextKind, duration] of [[opened, 'HACK_RESULT', 5000], [null, 'HACK', 60_000]]) {
      const state = previous ?? await h.current();
      const taskId = hash([h.base.id, state.phase.id, state.deadlineToken]), ref = h.base.collection('outbox').doc(taskId);
      let enqueues = 0;
      assert.equal((await h.service.dispatchDeadlineIntent(ref.path, async intent => {
        enqueues++; assert.equal(intent.taskId, taskId); assert.equal(intent.endsAt, state.phase.endsAt);
      })).status, 'dispatched');
      assert.equal(enqueues, 1);
      const repair = h.repairFor(state.phase.id), noEnqueue = async () => assert.fail('An acknowledged lost delivery needs no second enqueue');
      h.setTime(state.phase.endsAt - 1); await repair.repairOutbox(noEnqueue, { limit: 1 });
      assert.deepEqual(await h.current(), state);
      h.setTime(state.phase.endsAt + 90_000);
      await Promise.all([repair.repairOutbox(noEnqueue, { limit: 1 }), retryUnavailable(() => h.service.runDeadline(job(state)))]);
      const next = await h.current(); assert.equal(next.phase.kind, nextKind);
      assert.equal(next.phase.startedAt, h.now()); assert.equal(next.phase.endsAt, h.now() + duration);
      assert.equal((await ref.get()).get('status'), 'completed');
      assert.equal((await journal(h)).filter(record => record.kind === 'DEADLINE' && record.phaseId === state.phase.id).length, 1);
      const records = await journal(h); await repair.repairOutbox(noEnqueue, { limit: 1 }); await assertNoContinuation(h, state);
      assert.deepEqual(await h.current(), next); assert.deepEqual(await journal(h), records);
    }
    await assertExchange(h, await h.current(), 'seat-2', opened.phase.id, 'NO_DECLARATION', null);
    await assertReplay(h);
  });

  test(`${playerCount} seats: only fixed target can declare; private claims, Rules access and invalid submissions do not leak or rewrite bystanders`, async () => {
    const h = await seed(playerCount), { state: opened } = await openHack(h, { target: 'seat-5' });
    // Undercover may choose any side. No verified truth/faction metadata is emitted.
    const before = await publicationSnapshot(h, 'seat-5'), counts = await audienceCounts(h);
    for (const seatId of ['seat-1', 'seat-2']) {
      const rejected = await submit(h, seatId, { type: 'DECLARE_HACK_SIDE', declaredSide: 'Alien' });
      assert.equal(rejected.receipt.status, 'rejected'); assert.equal(rejected.receipt.code, 'NOT_ALLOWED');
    }
    assert.deepEqual(await publicationSnapshot(h, 'seat-5'), before);
    assert.deepEqual(await audienceCounts(h), counts, 'Rejected guesses cannot create audience events');
    const result = (await declaration(h, opened, 'Alien', 'seat-5')).state;
    await assertExchange(h, result, 'seat-5', opened.phase.id, 'DECLARED', 'Alien');
    const ownPath = `${h.base.path}/playerViews/${h.players[4].uid}`;
    assert.equal((await firestoreRequest(ownPath, { idToken: h.players[4].idToken })).status, 200);
    for (const identity of [h.players[0], h.players[1], h.display, h.outsider]) {
      assert.equal((await firestoreRequest(ownPath, { idToken: identity.idToken })).status, 403);
    }
    for (const identity of [h.players[0], h.display]) {
      const publicRead = await firestoreRequest(`${h.base.path}/views/public`, { idToken: identity.idToken });
      assert.equal(publicRead.status, 200); assert.equal(JSON.stringify(publicRead.body).includes('declaredSide'), false);
      assert.equal((await firestoreRequest(`${h.base.path}/engine/current`, { idToken: identity.idToken })).status, 403);
      assert.equal((await firestoreRequest(`${h.base.path}/events`, { idToken: identity.idToken })).status, 403);
    }
    for (const key of ['public', ...h.players.map((_, index) => `p-seat-${index + 1}`)]) {
      const items = (await h.base.collection('audienceEvents').doc(key).collection('items').get()).docs.map(doc => FullEventSchema.parse(doc.data()));
      const text = JSON.stringify(items);
      assert.equal(text.includes('declaredSide'), false); assert.equal(text.includes('hackPartnerSeatId'), false);
      assert.equal(text.includes('verifiedTruth'), false);
    }
    const latest = FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(h.players[4].uid).get()).data());
    assert.equal(FullPlayerViewSchema.safeParse({ ...latest, hackFeedback: { ...latest.hackFeedback, phaseId: opened.phase.id } }).success, false,
      'Stable exchange identity alone cannot validate old feedback for the result phase');
    await assertReplay(h);
  });

  test(`${playerCount} seats: two permitted claims have identical persisted public and bystander bytes at identical timing`, async () => {
    const captures = [];
    for (const side of ['Blue', 'Alien']) {
      const h = await seed(playerCount), { state: opened } = await openHack(h, { target: 'seat-5' });
      h.setTime(opened.phase.startedAt + 2345);
      const result = (await declaration(h, opened, side, 'seat-5')).state;
      await assertExchange(h, result, 'seat-5', opened.phase.id, 'DECLARED', side);
      const snapshot = [];
      for (const ref of [h.base.collection('views').doc('public'), ...h.players.flatMap((player, index) =>
        [0, 4].includes(index) ? [] : [h.base.collection('playerViews').doc(player.uid), h.base.collection('ownAcknowledgments').doc(player.uid)])]) {
        const value = (await ref.get()).data();
        // Only independent match/phase UUIDs differ; all authorized content,
        // revisions, phase times, capabilities and private bystander facts remain.
        snapshot.push({ ...value, ...(Object.hasOwn(value, 'matchId') ? { matchId: 'independent-match' } : {}),
          ...(value.phase ? { phase: { ...value.phase, id: 'independent-result-phase' } } : {}) });
      }
      captures.push(JSON.stringify(snapshot)); await assertReplay(h);
    }
    assert.equal(captures[0], captures[1], 'Permitted private claim choice cannot alter public/bystander content');
  });

  test(`${playerCount} seats: recovery retains current claim/deadline and old receipt, revoked identity is denied, abort cannot resume the exchange`, async () => {
    const h = await seed(playerCount), { state: opened } = await openHack(h);
    h.setTime(opened.phase.startedAt + 500);
    const accepted = await declaration(h, opened), result = accepted.state;
    h.setTime(result.phase.startedAt + 1000);
    const old = h.players[1], replacement = await createEmulatorIdentity();
    const issued = operation(await h.service.issueSeatRecovery(h.players[0].uid, h.request({ seatId: 'seat-2' })));
    assert.equal(typeof issued.recoveryToken, 'string');
    h.setTime(result.phase.startedAt + 2000);
    operation(await h.service.redeemSeatRecovery(replacement.uid, h.request({ recoveryToken: issued.recoveryToken })));
    h.players[1] = replacement;
    assert.deepEqual((await h.current()).phase, result.phase);
    const restored = FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(replacement.uid).get()).data());
    assert.deepEqual(restored.hackFeedback, projectFullGame(result).players['seat-2'].hackFeedback);
    assert.equal(restored.phase.endsAt - h.now(), 3000);
    assert.equal((await firestoreRequest(`${h.base.path}/playerViews/${replacement.uid}`, { idToken: old.idToken })).status, 403);
    const lookupBody = { protocolVersion: 2, matchId: h.base.id, commandId: accepted.request.commandId };
    h.service = createV1Service(h.options); // Restart with only persisted authority/receipts.
    const denied = FullLookupResponseSchema.parse(await h.service.lookup(old.uid, lookupBody));
    assert.equal(denied.error.code, 'FORBIDDEN');
    assert.deepEqual(FullLookupResponseSchema.parse(await h.service.lookup(replacement.uid, lookupBody)).receipt, accepted.receipt);
    assert.deepEqual(FullCommandResponseSchema.parse(await h.service.submit(replacement.uid, accepted.request)).receipt, accepted.receipt);
    await assertStored(h);
    h.setTime(result.phase.startedAt + 3000);
    operation(await h.service.abortMatch(h.players[0].uid, h.request()));
    const aborted = await h.current(); assert.equal(aborted.phase.kind, 'ABORTED'); assert.equal(aborted.activeHack, null);
    for (const view of Object.values(projectFullGame(aborted).players)) {
      assert.equal(view.hackFeedback, null); assert.equal(view.hackPartnerSeatId, null);
    }
    await assertNoContinuation(h, opened); await assertNoContinuation(h, result);
    assert.deepEqual(await h.current(), aborted); await assertReplay(h);
  });
}
