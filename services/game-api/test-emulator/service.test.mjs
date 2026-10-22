import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { CommandResponseSchema, ApiFailureSchema, PlayerViewSchema, PublicViewSchema, ReceiptLookupResponseSchema } from '@mothership/contracts';
import { createGameService, deadlineIntent } from '../dist/index.js';
import { createDeadlineEnqueuer } from '../../../infra/firebase/dist/tasks.js';
import { project, registerShot, advanceDeadline, resolveSlice } from '@mothership/engine';
import { makeState, makeRequest, seatIds } from '../../../packages/engine/test/helpers.mjs';
import { assertLocalEmulators, createEmulatorIdentity, refreshEmulatorIdentity, invokeFunction, firestoreRequest } from '../../../infra/firebase/test/helpers.mjs';

let app, db, officer, target, display;
before(async () => {
  assertLocalEmulators();
  app = initializeApp({ projectId: 'demo-mothership' }, `backend-test-${randomUUID()}`);
  db = getFirestore(app);
  [officer, target, display] = await Promise.all([createEmulatorIdentity(), createEmulatorIdentity(), createEmulatorIdentity()]);
});
after(async () => { await db?.terminate(); if (app) await deleteApp(app); });

async function seed(variant = 'unprotected', startedAt) {
  const state = makeState(variant); state.matchId = randomUUID();
  if (startedAt !== undefined) state.phase = { ...state.phase, startedAt, endsAt: startedAt + 60000 };
  const base = db.collection('matches').doc(state.matchId), views = project(state);
  const batch = db.batch();
  batch.set(base.collection('engine').doc('current'), state);
  batch.set(base.collection('views').doc('public'), views.public);
  const identities = [officer.uid, target.uid, ...seatIds.slice(2).map((_, i) => `scripted-${i}`)];
  identities.forEach((uid, i) => {
    batch.set(base.collection('members').doc(uid), { kind: 'player', seatId: seatIds[i] });
    batch.set(base.collection('playerViews').doc(uid), views.players[seatIds[i]]);
  });
  batch.set(base.collection('members').doc(display.uid), { kind: 'display' });
  const intent = deadlineIntent(state); batch.set(base.collection('outbox').doc(intent.taskId), intent);
  await batch.commit();
  let now = state.phase.startedAt + 1;
  const service = createGameService({ db, clock: () => now });
  return { state, base, service, setTime: t => { now = t; }, request: makeRequest(state), current: async () => (await base.collection('engine').doc('current').get()).data() };
}
async function finish(harness) {
  let state = await harness.current();
  while (!state.turnsComplete) {
    harness.setTime(state.phase.endsAt);
    const result = await harness.service.runDeadline({ matchId: state.matchId, phaseId: state.phase.id, deadlineToken: state.deadlineToken });
    assert.equal(result.result, 'advanced'); state = await harness.current();
  }
  await harness.service.resolveFixtureAfterVote(state.matchId);
}

test('same command retry after expiry returns original terminal receipt; conflict preserves original', async () => {
  const h = await seed();
  const first = await h.service.submit(officer.uid, h.request); CommandResponseSchema.parse(first);
  assert.equal(first.receipt.status, 'accepted');
  h.setTime(h.state.phase.endsAt + 1000);
  assert.deepEqual((await h.service.submit(officer.uid, h.request)).receipt, first.receipt);
  const conflict = await h.service.submit(officer.uid, { ...h.request, command: { type: 'REGISTER_SHOT', targetSeatId: 'seat-3' } });
  ApiFailureSchema.parse(conflict); assert.equal(conflict.error.code, 'COMMAND_ID_CONFLICT');
  const lookup = await h.service.lookup(officer.uid, { protocolVersion: 1, matchId: h.state.matchId, commandId: h.request.commandId });
  ReceiptLookupResponseSchema.parse(lookup); assert.deepEqual(lookup.receipt, first.receipt);
  assert.equal((await h.current()).attacks.length, 1);
  assert.equal((await h.base.collection('receipts').get()).size, 1);
  assert.equal((await h.service.lookup(target.uid, { protocolVersion: 1, matchId: h.state.matchId, commandId: h.request.commandId })).status, 'unknown');
});

test('two different command IDs race for one shot with at most one acceptance', async () => {
  const h = await seed();
  const results = await Promise.all(['command-race-a', 'command-race-b'].map(commandId => h.service.submit(officer.uid, { ...h.request, commandId })));
  assert.equal(results.filter(r => r.ok && r.receipt.status === 'accepted').length, 1);
  assert.equal(results.filter(r => r.ok && r.receipt.code === 'NOT_ALLOWED').length, 1);
  const state = await h.current(); assert.equal(state.attacks.length, 1); assert.equal(state.seats[0].shotAvailable, false);
  assert.equal((await h.base.collection('receipts').get()).size, 2);
});

test('rejected receipts are durable, cannot later accept after eligibility changes', async () => {
  const h = await seed();
  await h.base.collection('engine').doc('current').update({ activeSeatId: 'seat-2' });
  const rejected = await h.service.submit(officer.uid, h.request); assert.equal(rejected.receipt.code, 'NOT_ALLOWED');
  await h.base.collection('engine').doc('current').update({ activeSeatId: 'seat-1' });
  assert.deepEqual((await h.service.submit(officer.uid, h.request)).receipt, rejected.receipt);
  assert.equal((await h.current()).attacks.length, 0);
});

test('secret registration leaves actual Firestore public/target/unrelated data AND updateTime unchanged', async () => {
  const h = await seed('protected');
  const paths = ['views/public', `playerViews/${target.uid}`, ...Array.from({length:7}, (_, i) => `playerViews/scripted-${i}`)];
  const before = await Promise.all(paths.map(path => db.doc(`${h.base.path}/${path}`).get()));
  const officerBefore = await h.base.collection('playerViews').doc(officer.uid).get();
  assert.equal((await h.service.submit(officer.uid, h.request)).receipt.status, 'accepted');
  const after = await Promise.all(paths.map(path => db.doc(`${h.base.path}/${path}`).get()));
  before.forEach((doc, i) => { assert.deepEqual(doc.data(), after[i].data()); assert.ok(doc.updateTime.isEqual(after[i].updateTime)); });
  const officerAfter = await h.base.collection('playerViews').doc(officer.uid).get();
  assert.equal(officerAfter.data().viewRevision, officerBefore.data().viewRevision + 1);
  assert.equal((await h.base.collection('audienceEvents').doc('public').collection('items').get()).size, 0);
  assert.equal((await h.base.collection('audienceEvents').doc(target.uid).collection('items').get()).size, 0);
  const event = (await h.base.collection('audienceEvents').doc(officer.uid).collection('items').get()).docs[0].data();
  assert.deepEqual(event.fact, { type: 'COMMAND_REGISTERED', commandId: h.request.commandId });
});

for (const variant of ['protected', 'unprotected']) test(`${variant} fixture resolves only after scripted turns and completed vote; duplicate resolution no damage`, async () => {
  const h = await seed(variant);
  assert.equal((await h.service.submit(officer.uid, h.request)).receipt.status, 'accepted');
  await assert.rejects(h.service.resolveFixtureAfterVote(h.state.matchId));
  assert.equal((await h.current()).seats[1].health, 'Healthy');
  await finish(h); const state = await h.current();
  assert.equal(state.seats[1].health, variant === 'protected' ? 'Healthy' : 'Injured');
  if (variant === 'protected') assert.equal(state.seats[1].protection.consumed, true);
  await h.service.resolveFixtureAfterVote(h.state.matchId); assert.deepEqual(await h.current(), state);
  const publicView = (await h.base.collection('views').doc('public').get()).data(); PublicViewSchema.parse(publicView);
  const targetView = (await h.base.collection('playerViews').doc(target.uid).get()).data(); PlayerViewSchema.parse(targetView);
  const events = (await h.base.collection('audienceEvents').doc('public').collection('items').get()).docs.map(d => d.data());
  assert.ok(!JSON.stringify({ publicView, targetView, events }).match(/protection|blocked|targetSeatId|actorSeatId|REGISTER_SHOT/i));
  assert.equal(state.seats[1].location, 'Room A'); // Stops before relocation/finalization.
});

test('registered attacks survive later actor injury, Jail and elimination through Firestore adapter', async () => {
  for (const status of ['Injured', 'Jailed', 'Eliminated']) {
    const h = await seed(); await h.service.submit(officer.uid, h.request);
    const state = await h.current();
    if (status === 'Jailed') { state.seats[0].jailed = true; state.seats[0].location = 'Jail'; }
    else state.seats[0].health = status;
    await h.base.collection('engine').doc('current').set(state);
    await finish(h); assert.equal((await h.current()).seats[1].health, 'Injured');
  }
});

test('exact deadline race rejects late registration, advances once, delayed next window starts now', async () => {
  const h = await seed(); h.setTime(h.state.phase.endsAt);
  const job = { matchId: h.state.matchId, phaseId: h.state.phase.id, deadlineToken: h.state.deadlineToken };
  const [command, ...jobs] = await Promise.all([h.service.submit(officer.uid, h.request), h.service.runDeadline(job), h.service.runDeadline(job)]);
  assert.equal(command.receipt.code, 'PHASE_CLOSED');
  assert.equal(jobs.filter(r => r.result === 'advanced').length, 1);
  const advanced = await h.current(); assert.equal(advanced.activeSeatId, 'seat-2'); assert.equal(advanced.attacks.length, 0);
  assert.equal((await h.service.submit(officer.uid, { ...h.request, commandId: 'delayed-a' })).receipt.code, 'PHASE_CLOSED');
  const delayed = await seed(); const now = delayed.state.phase.endsAt + 90000; delayed.setTime(now);
  await delayed.service.runDeadline({ matchId: delayed.state.matchId, phaseId: delayed.state.phase.id, deadlineToken: delayed.state.deadlineToken });
  assert.equal((await delayed.current()).phase.startedAt, now); assert.equal((await delayed.current()).phase.endsAt, now + 60000);
});

test('secret registration does not invalidate deadline; stale phase/token jobs and early catch-up are no-ops', async () => {
  const h = await seed(); await h.service.submit(officer.uid, h.request);
  const job = { matchId: h.state.matchId, phaseId: h.state.phase.id, deadlineToken: h.state.deadlineToken };
  assert.equal((await h.service.runDeadline(job)).result, 'unchanged');
  assert.equal((await h.service.advance(display.uid, { protocolVersion: 1, matchId: h.state.matchId, phaseId: h.state.phase.id })).result, 'unchanged');
  h.setTime(h.state.phase.endsAt);
  assert.equal((await h.service.runDeadline({ ...job, deadlineToken: 'stale-token' })).result, 'unchanged');
  assert.equal((await h.service.runDeadline(job)).result, 'advanced');
  assert.equal((await h.service.runDeadline(job)).result, 'unchanged');
  assert.equal((await h.current()).attacks.length, 1);
});

test('outbox enqueue failure remains durable, repair retries stable ID; reconnect preserves seat and resource', async () => {
  const h = await seed(); await h.service.submit(officer.uid, h.request);
  const attempted = new Set();
  const first = await h.service.repairOutbox(async intent => { attempted.add(intent.taskId); throw new Error('synthetic enqueue failure'); });
  assert.ok(first.failed >= 1);
  assert.equal((await h.base.collection('outbox').get()).docs[0].data().status, 'pending');
  const enqueued = new Set();
  const second = await h.service.repairOutbox(async intent => { assert.ok(attempted.has(intent.taskId)); enqueued.add(intent.taskId); });
  assert.equal(second.failed, 0); assert.ok(second.dispatched >= 1);
  assert.equal((await h.service.repairOutbox(async () => assert.fail('already dispatched'))).dispatched, 0);
  const renewed = await refreshEmulatorIdentity(officer.refreshToken); assert.equal(renewed.uid, officer.uid);
  const recovered = await h.service.lookup(renewed.uid, { protocolVersion: 1, matchId: h.state.matchId, commandId: h.request.commandId });
  assert.equal(recovered.status, 'found');
  const restored = await firestoreRequest(`${h.base.path}/playerViews/${renewed.uid}`, { idToken: renewed.idToken });
  assert.equal(restored.status, 200);
  assert.equal(restored.body.fields.self.mapValue.fields.role.stringValue, 'Officer');
  const recoveredHttp = await invokeFunction('receipt', { protocolVersion: 1, matchId: h.state.matchId, commandId: h.request.commandId }, { idToken: renewed.idToken });
  assert.equal(recoveredHttp.body.status, 'found');
  const view = (await h.base.collection('playerViews').doc(renewed.uid).get()).data();
  assert.equal(view.self.seatId, 'seat-1'); assert.equal(view.self.role, 'Officer'); assert.equal(view.self.shotAvailable, false);
});

test('authenticated HTTP command validates token/schema/protocol and derives the seat from membership', async () => {
  const h = await seed('unprotected', Date.now() - 1000);
  assert.equal((await invokeFunction('command', h.request)).body.error.code, 'UNAUTHENTICATED');
  assert.equal((await invokeFunction('command', h.request, {idToken:'invalid-token'})).body.error.code, 'UNAUTHENTICATED');
  // This fixture atomically seeds engine, projections and intent with a current server-time window.
  const invalid = await invokeFunction('command', { ...h.request, actorSeatId: 'seat-1' }, { idToken: officer.idToken });
  assert.equal(invalid.body.error.code, 'INVALID_REQUEST');
  const unsupported = await invokeFunction('command', { ...h.request, protocolVersion: 2 }, { idToken: officer.idToken });
  assert.equal(unsupported.body.error.code, 'UNSUPPORTED_PROTOCOL');
  const forbidden = await invokeFunction('command', h.request, { idToken: display.idToken }); assert.equal(forbidden.body.error.code, 'FORBIDDEN');
  const wrongSeat = await invokeFunction('command', h.request, { idToken: target.idToken }); assert.equal(wrongSeat.body.receipt.code, 'NOT_ALLOWED');
  const result = await invokeFunction('command', h.request, { idToken: officer.idToken }); CommandResponseSchema.parse(result.body);
  assert.equal(result.body.receipt.status, 'accepted'); assert.match(result.headers.get('cache-control'), /no-store/);
  const outside = await h.service.submit('outsider', h.request); assert.equal(outside.error.code, 'FORBIDDEN');
});

test('pinned journal replays committed engine state and projections deterministically', async () => {
  const h = await seed('protected');
  assert.equal((await h.service.submit(target.uid, { ...h.request, commandId: 'replay-rejected-a' })).receipt.code, 'NOT_ALLOWED');
  await h.service.submit(officer.uid, h.request); await finish(h);
  const records = (await h.base.collection('events').orderBy('sequence').get()).docs.map(d => d.data());
  let replay = structuredClone(h.state);
  for (const event of records) {
    if (event.kind === 'COMMAND') replay = registerShot(replay, event.request, { actorSeatId: event.actorSeatId, evaluatedAt: event.evaluatedAt, recordedRandomFacts: event.recordedRandomFacts }).state;
    else if (event.kind === 'DEADLINE') replay = advanceDeadline(replay, event).state;
    else if (event.kind === 'FIXTURE_VOTE_COMPLETED_AND_ATTACK_STAGE') replay = resolveSlice(replay, event);
    else assert.fail('unknown journal event');
    replay = { ...replay, journalSequence: event.sequence };
  }
  assert.deepEqual(replay, await h.current()); assert.deepEqual(project(replay).public, (await h.base.collection('views').doc('public').get()).data());
});

test('unsupported pinned engine or rule manifest fails closed before any new effects', async () => {
  for (const field of ['engineVersion', 'rulesetHash']) {
    const h = await seed(); const current = await h.current(); current.versions[field] = field === 'rulesetHash' ? '0'.repeat(64) : 'future-engine';
    await h.base.collection('engine').doc('current').set(current);
    assert.equal((await h.service.submit(officer.uid, h.request)).error.code, 'UNSUPPORTED_PROTOCOL');
    h.setTime(current.phase.endsAt);
    assert.equal((await h.service.advance(officer.uid, { protocolVersion: 1, matchId: h.state.matchId, phaseId: h.state.phase.id })).error.code, 'UNSUPPORTED_PROTOCOL');
    assert.equal((await h.base.collection('receipts').get()).size, 0);
  }
});


test('enqueue success followed by ack failure retries the same stable task and acknowledges duplicate', async () => {
  const h = await seed(); const intent = deadlineIntent(h.state);
  let ackFailed = false;
  const wrappedDb = {
    collectionGroup: name => ({ where: (...args) => ({ get: async () => {
      const pending = await db.collectionGroup(name).where(...args).get();
      return { docs: pending.docs.map(entry => ({ data: () => entry.data(), ref: { update: async data => {
        if (entry.id === intent.taskId && !ackFailed) { ackFailed = true; throw new Error('synthetic post-enqueue acknowledgement failure'); }
        return entry.ref.update(data);
      } } })) };
    } }) }),
  };
  const service = createGameService({ db: wrappedDb });
  const queueIds = new Set(); let attempts = 0;
  const enqueue = createDeadlineEnqueuer({ enqueue: async (_payload, options) => {
    if (options.id === intent.taskId) attempts++;
    if (queueIds.has(options.id)) throw Object.assign(new Error('already exists'), { code: 'functions/task-already-exists' });
    queueIds.add(options.id);
  } });
  const first = await service.repairOutbox(enqueue); assert.equal(first.failed, 1);
  assert.equal((await h.base.collection('outbox').doc(intent.taskId).get()).data().status, 'pending');
  const repaired = await service.repairOutbox(enqueue); assert.equal(repaired.failed, 0);
  assert.equal(attempts, 2); assert.ok(queueIds.has(intent.taskId));
  assert.equal((await h.base.collection('outbox').doc(intent.taskId).get()).data().status, 'dispatched');
});
