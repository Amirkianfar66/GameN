import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  FullPublicViewSchema, FullPlayerViewSchema, FullReceiptSchema, FullEventSchema, FullFailureSchema,
  FullOperationResponseSchema, FullCommandResponseSchema, FullLookupResponseSchema, FullAdvanceResponseSchema,
  FullServerTimeResponseSchema, FullLobbyViewSchema,
} from '@mothership/contracts';
import { createFullGame, executeFullGame, advanceFullGame, abortFullGame, projectFullGame } from '@mothership/engine';
import { createV1Service } from '../dist/index.js';
import { encodeV1State, decodeV1State, decodeV1Setup } from '../dist/full-game.js';
import { createDeadlineEnqueuer } from '../../../infra/firebase/dist/tasks.js';
import { assertLocalEmulators, createEmulatorIdentity, firestoreRequest, firestoreEventQuery } from '../../../infra/firebase/test/helpers.mjs';

let app, db, serial = 0;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const success = response => { FullOperationResponseSchema.parse(response); assert.equal(response.ok, true, JSON.stringify(response)); return response.result; };
const error = (response, code) => { FullFailureSchema.parse(response); assert.equal(response.error?.code, code, JSON.stringify(response)); };
before(async () => {
  assertLocalEmulators();
  app = initializeApp({ projectId: 'demo-mothership' }, `full-service-${randomUUID()}`);
  db = getFirestore(app);
});
after(async () => { await db?.terminate(); if (app) await deleteApp(app); });

async function harness(playerCount = 7, { deal = true, hostPlays = false, assetManifestVersion = '0.0.0-no-assets' } = {}) {
  let now = 2_000_000_000_000 + ++serial * 100_000_000;
  const service = createV1Service({ db, clock: () => now, shuffle: items => [...items], assetManifestVersion });
  const host = await createEmulatorIdentity();
  const players = await Promise.all(Array.from({ length: playerCount }, (_, i) => hostPlays && i === 0 ? host : createEmulatorIdentity()));
  const createPayload = { protocolVersion: 2, requestId: randomUUID(), playerCount };
  const created = success(await service.createMatch(host.uid, createPayload));
  const base = db.collection('matches').doc(created.matchId);
  const lobbyView = async () => FullLobbyViewSchema.parse((await base.collection('lobby').doc('public').get()).data());
  assert.equal((await lobbyView()).status, 'lobby');
  const request = (fields = {}) => ({ protocolVersion: 2, matchId: base.id, requestId: randomUUID(), ...fields });
  const admission = async (identity, initialRoom = 'Room A') => success(await service.requestAdmission(identity.uid, {
    protocolVersion: 2, requestId: randomUUID(), roomCode: created.roomCode, initialRoom,
  }));
  const approve = async (identity, seatId) => {
    const pending = await admission(identity);
    const response = await service.approveAdmission(host.uid, request({ admissionId: pending.admissionId, seatId }));
    FullOperationResponseSchema.parse(response);
    if (response.ok) { const actualLobby = await lobbyView(); assert.ok(actualLobby.seats.some(item => item.seatId === seatId)); }
    return response;
  };
  const current = async () => decodeV1State((await base.collection('engine').doc('current').get()).data());
  const h = { service, host, players, created, createPayload, base, request, admission, approve, current, lobbyView,
    setTime: value => { now = value; }, now: () => now,
    command: async (seatNumber, command, commandId = randomUUID(), phaseId) => {
      const state = await current();
      const payload = { protocolVersion: 2, matchId: base.id, phaseId: phaseId ?? state.phase.id, commandId, command };
      const response = await service.submit(players[seatNumber - 1].uid, payload);
      FullCommandResponseSchema.parse(response);
      return { payload, response };
    },
  };
  if (deal) {
    for (let i = 0; i < playerCount; i++) success(await approve(players[i], `seat-${i + 1}`));
    success(await service.startMatch(host.uid, request()));
    assert.equal((await lobbyView()).status, 'running');
  }
  return h;
}
async function tick(h, delay = 0) {
  const state = await h.current();
  assert.notEqual(state.phase.endsAt, null);
  h.setTime(state.phase.endsAt + delay);
  const response = await h.service.runDeadline({ matchId: state.matchId, phaseId: state.phase.id, deadlineToken: state.deadlineToken });
  FullAdvanceResponseSchema.parse(response);
  assert.equal(response.result, 'advanced', JSON.stringify(response));
  return h.current();
}
async function until(h, predicate, maximum = 150) {
  let state = await h.current();
  for (let count = 0; !predicate(state); count++) { assert.ok(count < maximum, 'bounded lifecycle'); state = await tick(h); }
  return state;
}
const read = (h, path, identity) => firestoreRequest(`${h.base.path}/${path}`, { idToken: identity.idToken });
async function audience(h, key) { return (await h.base.collection('audienceEvents').doc(key).collection('items').get()).docs.map(doc => FullEventSchema.parse(doc.data())); }

test('lobby creation is idempotent; host capability is separate from player identity and role secrets', async () => {
  const h = await harness(7, { deal: false });
  const retry = success(await h.service.createMatch(h.host.uid, h.createPayload));
  assert.deepEqual(retry, h.created);
  error(await h.service.createMatch(h.host.uid, { ...h.createPayload, playerCount: 8 }), 'COMMAND_ID_CONFLICT');
  assert.match(h.created.roomCode, /^[A-F0-9]{12}$/);
  assert.equal((await read(h, 'control/session', h.host)).status, 200);
  assert.equal((await read(h, 'control/session', h.players[0])).status, 403);
  error(await h.service.startMatch(h.host.uid, h.request()), 'FORBIDDEN');
  for (let i = 0; i < 7; i++) success(await h.approve(h.players[i], `seat-${i + 1}`));
  error(await h.service.startMatch(h.players[0].uid, h.request()), 'FORBIDDEN');
  success(await h.service.startMatch(h.host.uid, h.request()));
  FullServerTimeResponseSchema.parse(await h.service.serverTime(h.host.uid, { protocolVersion: 2, matchId: h.base.id }));
  const earlyAdvance = FullAdvanceResponseSchema.parse(await h.service.advance(h.host.uid, { protocolVersion: 2, matchId: h.base.id, phaseId: (await h.current()).phase.id }));
  assert.equal(earlyAdvance.result, 'unchanged');
  assert.equal((await h.lobbyView()).status, 'running');
  const display = await createEmulatorIdentity();
  success(await h.service.admitDisplay(h.host.uid, h.request({ displayUid: display.uid })));
  for (const identity of [h.host, display, ...h.players]) assert.equal((await read(h, 'views/public', identity)).status, 200);
  assert.equal((await read(h, `playerViews/${h.players[0].uid}`, h.host)).status, 403);
  assert.equal((await read(h, `playerViews/${h.players[0].uid}`, display)).status, 403);
  assert.equal((await read(h, `playerViews/${h.players[1].uid}`, h.players[0])).status, 403);
  for (const path of ['engine/current', 'members/' + h.players[0].uid, 'seats/seat-1']) assert.equal((await read(h, path, h.host)).status, 403);
  error(await h.service.submit(h.host.uid, { protocolVersion: 2, matchId: h.base.id, phaseId: (await h.current()).phase.id, commandId: randomUUID(), command: { type: 'MOVE', destination: 'Room B' } }), 'FORBIDDEN');
  const selfHost = await harness(7, { hostPlays: true });
  assert.equal((await selfHost.base.collection('members').doc(selfHost.host.uid).get()).get('seatId'), 'seat-1');
  assert.equal((await read(selfHost, `playerViews/${selfHost.host.uid}`, selfHost.host)).status, 200);
  success(await selfHost.service.abortMatch(selfHost.host.uid, selfHost.request()));
  assert.equal((await selfHost.lobbyView()).status, 'aborted');
  assert.equal((await selfHost.current()).phase.kind, 'ABORTED');
  assert.equal((await read(selfHost, 'views/public', selfHost.host)).body.fields.endReveal.nullValue, null);
});

test('concurrent admissions cannot assign one seat twice or one identity to two seats', async () => {
  const h = await harness(7, { deal: false });
  const pending = await Promise.all(h.players.slice(0, 2).map(identity => h.admission(identity)));
  const approvalRequests = pending.map(entry => h.request({ admissionId: entry.admissionId, seatId: 'seat-1' }));
  const deliveries = await Promise.all(approvalRequests.map(payload => h.service.approveAdmission(h.host.uid, payload)));
  const raced = await Promise.all(deliveries.map((response, i) => settleUnavailable(response, () => h.service.approveAdmission(h.host.uid, approvalRequests[i]))));
  raced.forEach(response => FullOperationResponseSchema.parse(response));
  assert.equal(raced.filter(response => response.ok).length, 1);
  assert.equal(raced.filter(response => response.error?.code === 'FORBIDDEN').length, 1, JSON.stringify(raced));
  const next = h.players[2];
  const alternatives = await Promise.all([h.admission(next), h.admission(next, 'Room B')]);
  const identityRequests = alternatives.map((entry, i) => h.request({ admissionId: entry.admissionId, seatId: `seat-${i + 2}` }));
  const identityDeliveries = await Promise.all(identityRequests.map(payload => h.service.approveAdmission(h.host.uid, payload)));
  const sameIdentity = await Promise.all(identityDeliveries.map((response, i) => settleUnavailable(response, () => h.service.approveAdmission(h.host.uid, identityRequests[i]))));
  sameIdentity.forEach(response => FullOperationResponseSchema.parse(response));
  assert.equal(sameIdentity.filter(response => response.ok).length, 1);
  assert.equal(sameIdentity.filter(response => response.error?.code === 'FORBIDDEN').length, 1, JSON.stringify(sameIdentity));
  const bindings = (await h.base.collection('seats').get()).docs;
  assert.equal(new Set(bindings.map(doc => doc.get('uid'))).size, bindings.length);
  assert.equal(bindings.length, 2);
  assert.deepEqual((await h.lobbyView()).seats.map(s => s.seatId).sort(), bindings.map(doc => doc.id).sort());
  for (const binding of bindings) {
    const member = await h.base.collection('members').doc(binding.get('uid')).get();
    assert.equal(member.get('seatId'), binding.id);
    assert.equal(member.get('bindingRevision'), binding.get('bindingRevision'));
  }
  const third = await h.admission(h.players[3]);
  error(await h.service.approveAdmission(h.host.uid, h.request({ admissionId: third.admissionId, seatId: 'seat-8' })), 'FORBIDDEN');
  error(await h.service.startMatch(h.host.uid, h.request()), 'FORBIDDEN');
});

test('configured asset manifest is pinned identically in setup journal, engine and both audience projections', async () => {
  const h = await harness(7, { assetManifestVersion: '1.2.0-approved' });
  const setup = (await h.base.collection('events').where('kind', '==', 'SETUP').get()).docs[0].data();
  assert.equal(setup.assetManifestVersion, '1.2.0-approved');
  for (const value of [setup, await h.current(), (await h.base.collection('views').doc('public').get()).data(), (await h.base.collection('playerViews').doc(h.players[0].uid).get()).data()]) assert.equal(value.versions.assetManifestVersion, '1.2.0-approved');
});

for (const playerCount of [7, 8, 9]) test(`${playerCount}-player real Firestore match reaches a schema-valid final result through all five rounds`, async () => {
  const h = await harness(playerCount);
  const first = await h.current();
  assert.equal(first.seats.length, playerCount);
  assert.equal(first.seats.some(s => s.role === 'Red Disabler'), playerCount >= 8);
  assert.equal(first.seats.some(s => s.role === 'Officer'), playerCount === 9);
  assert.equal(first.code.length, 4);
  assert.ok(first.code.includes('seat-7'));
  assert.ok(!first.code.includes('seat-5'));
  const finished = await until(h, state => state.phase.kind === 'FINISHED');
  assert.equal(finished.round, 5);
  assert.notEqual(finished.result, null);
  assert.equal(finished.deadlineToken, null);
  const publicView = FullPublicViewSchema.parse((await h.base.collection('views').doc('public').get()).data());
  assert.notEqual(publicView.endReveal, null);
  assert.equal((await h.base.collection('control').doc('session').get()).get('status'), 'complete');
  assert.equal((await h.lobbyView()).status, 'complete');
  for (const identity of h.players) FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(identity.uid).get()).data());
  assert.equal((await h.service.runDeadline({ matchId: first.matchId, phaseId: first.phase.id, deadlineToken: first.deadlineToken })).result, 'unchanged');
  const journal = (await h.base.collection('events').orderBy('sequence').get()).docs;
  assert.deepEqual(journal.map(doc => doc.get('sequence')), Array.from({ length: journal.length }, (_, i) => i + 1));
});

test('public movement is visible to admitted audiences while command acknowledgement stays on the actor stream', async () => {
  const h = await harness();
  const { payload, response } = await h.command(1, { type: 'MOVE', destination: 'Room B' });
  FullReceiptSchema.parse(response.receipt); assert.equal(response.receipt.status, 'accepted');
  for (const key of ['public', ...h.players.map((_, i) => `p-seat-${i + 1}`)]) {
    const events = await audience(h, key);
    assert.ok(events.some(event => event.fact.type === 'PUBLIC_MOVE' && event.fact.seatId === 'seat-1'));
    assert.equal(events.some(event => event.fact.type === 'COMMAND_REGISTERED' && event.fact.commandId === payload.commandId), key === 'p-seat-1');
  }
  assert.equal((await firestoreEventQuery(h.base.id, 'p-seat-1', h.players[0], 'seat-1')).status, 200);
  assert.equal((await firestoreEventQuery(h.base.id, 'p-seat-1', h.players[1], 'seat-1')).status, 403);
  const write = await firestoreRequest(`${h.base.path}/playerViews/${h.players[0].uid}`, { idToken: h.players[0].idToken, method: 'PATCH', data: { spoof: true } });
  assert.equal(write.status, 403);
});

test('hidden Officer registration preserves public and unrelated data/updateTime; recovery revokes old access and preserves seat receipts/resources', async () => {
  const h = await harness(9);
  await until(h, state => state.activeSeatId === 'seat-9');
  const paths = ['views/public', ...h.players.slice(0, 8).map(identity => `playerViews/${identity.uid}`)];
  const before = await Promise.all(paths.map(path => db.doc(`${h.base.path}/${path}`).get()));
  const shot = await h.command(9, { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' });
  assert.equal(shot.response.receipt.status, 'accepted');
  const after = await Promise.all(paths.map(path => db.doc(`${h.base.path}/${path}`).get()));
  before.forEach((doc, i) => { assert.deepEqual(doc.data(), after[i].data()); assert.ok(doc.updateTime.isEqual(after[i].updateTime)); });
  for (const key of ['public', ...h.players.slice(0, 8).map((_, i) => `p-seat-${i + 1}`)]) assert.ok(!JSON.stringify(await audience(h, key)).includes(shot.payload.commandId));
  assert.ok((await audience(h, 'p-seat-9')).some(event => event.fact.commandId === shot.payload.commandId));
  const request = h.request({ seatId: 'seat-9' });
  const issued = success(await h.service.issueSeatRecovery(h.host.uid, request));
  assert.match(issued.recoveryToken, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(success(await h.service.issueSeatRecovery(h.host.uid, request)).recoveryToken, null);
  const replacement = await createEmulatorIdentity();
  success(await h.service.redeemSeatRecovery(replacement.uid, h.request({ recoveryToken: issued.recoveryToken })));
  const old = h.players[8];
  assert.equal((await h.base.collection('members').doc(old.uid).get()).exists, false);
  assert.equal((await h.base.collection('playerViews').doc(old.uid).get()).exists, false);
  assert.equal((await read(h, `playerViews/${old.uid}`, old)).status, 403);
  assert.equal((await read(h, 'views/public', old)).status, 403);
  assert.equal((await read(h, `playerViews/${replacement.uid}`, replacement)).status, 200);
  assert.equal((await firestoreEventQuery(h.base.id, 'p-seat-9', old, 'seat-9')).status, 403);
  assert.equal((await firestoreEventQuery(h.base.id, 'p-seat-9', replacement, 'seat-9')).status, 200);
  error(await h.service.lookup(old.uid, { protocolVersion: 2, matchId: h.base.id, commandId: shot.payload.commandId }), 'FORBIDDEN');
  const lookup = FullLookupResponseSchema.parse(await h.service.lookup(replacement.uid, { protocolVersion: 2, matchId: h.base.id, commandId: shot.payload.commandId }));
  assert.deepEqual(lookup.receipt, shot.response.receipt);
  assert.deepEqual(FullCommandResponseSchema.parse(await h.service.submit(replacement.uid, shot.payload)).receipt, shot.response.receipt);
  error(await h.service.submit(replacement.uid, { ...shot.payload, command: { type: 'REGISTER_SHOT', targetSeatId: 'seat-2' } }), 'COMMAND_ID_CONFLICT');
  const state = await h.current();
  assert.equal(state.seats[8].officerShotSpent, true); assert.equal(state.seats[8].ordinaryWeapons, 0);
  assert.equal((await h.base.collection('seats').doc('seat-9').get()).get('bindingRevision'), 2);
  const replayAttempt = await createEmulatorIdentity();
  error(await h.service.redeemSeatRecovery(replayAttempt.uid, h.request({ recoveryToken: issued.recoveryToken })), 'FORBIDDEN');
  const privateCollections = await Promise.all(['recovery', 'identityAudit', 'events', 'receipts'].map(name => h.base.collection(name).get()));
  const identityOperations = await db.collection('identityOperations').where('uid', 'in', [h.host.uid, replacement.uid]).get();
  assert.ok(!JSON.stringify([...privateCollections.flatMap(snapshot => snapshot.docs.map(doc => doc.data())), ...identityOperations.docs.map(doc => doc.data())]).includes(issued.recoveryToken));
});

// A transaction can commit and still return UNAVAILABLE, or exhaust its retry
// budget under emulator contention. Resolve only that unknown result by sending
// the exact same invocation again, never by inventing a new request/command ID.
async function settleUnavailable(response, identicalRetry) {
  for (let retry = 0; response.error?.code === 'UNAVAILABLE' && retry < 2; retry++) response = await identicalRetry();
  return response; // The caller's strict outcome assertion fails if still unresolved.
}

// Use simultaneous real Firestore transactions, including duplicate delivery that the
// browser/network can initiate without the application's retry loop.
async function duplicateBurst(h, seatNumber, payload, count = 6) {
  const invocation = () => h.service.submit(h.players[seatNumber - 1].uid, payload);
  const deliveries = await Promise.all(Array.from({ length: count }, invocation));
  deliveries.forEach(response => FullCommandResponseSchema.parse(response));
  const responses = await Promise.all(deliveries.map(response => settleUnavailable(response, invocation)));
  for (const response of responses) {
    FullCommandResponseSchema.parse(response);
    assert.equal(response.ok, true, JSON.stringify(response));
    assert.deepEqual(response.receipt, responses[0].receipt);
  }
  return responses[0].receipt;
}
async function commandDecisionCount(h, commandId) {
  const receipts = (await h.base.collection('receipts').get()).docs.filter(doc => doc.get('receipt.commandId') === commandId);
  const journal = (await h.base.collection('events').where('kind', '==', 'COMMAND').get()).docs.filter(doc => doc.get('request.commandId') === commandId);
  assert.equal(receipts.length, 1, 'one durable receipt');
  assert.equal(journal.length, 1, 'one durable command decision');
}
async function stableDocuments(h, paths, callback) {
  const before = await Promise.all(paths.map(path => db.doc(`${h.base.path}/${path}`).get()));
  await callback();
  const after = await Promise.all(paths.map(path => db.doc(`${h.base.path}/${path}`).get()));
  before.forEach((doc, i) => {
    assert.deepEqual(after[i].data(), doc.data(), pathLabel(paths[i]));
    assert.ok(after[i].updateTime.isEqual(doc.updateTime), pathLabel(paths[i]));
  });
}
const pathLabel = path => `duplicate delivery must not rewrite ${path}`;

test('concurrent accepted Officer duplicates spend once, recover before phase checks and apply one shot effect at resolution', async () => {
  const h = await harness(9);
  const before = await until(h, state => state.activeSeatId === 'seat-9');
  const payload = { protocolVersion: 2, matchId: h.base.id, phaseId: before.phase.id, commandId: randomUUID(), command: { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' } };
  const receipt = await duplicateBurst(h, 9, payload);
  assert.equal(receipt.status, 'accepted');
  await commandDecisionCount(h, payload.commandId);
  const registered = await h.current();
  assert.equal(registered.journalSequence, before.journalSequence + 1);
  assert.equal(registered.queued.filter(q => q.commandId === payload.commandId).length, 1);
  assert.equal(registered.seats[8].ordinaryWeapons, before.seats[8].ordinaryWeapons - 1);
  assert.equal(registered.seats[8].officerShotSpent, true);
  assert.equal(registered.viewRevisions.players['seat-9'], before.viewRevisions.players['seat-9'] + 1);
  assert.equal(registered.viewRevisions.public, before.viewRevisions.public);
  const own = FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(h.players[8].uid).get()).data());
  assert.deepEqual(own.ownPendingCommandIds, [payload.commandId]);
  assert.equal((await audience(h, 'p-seat-9')).filter(event => event.fact.type === 'COMMAND_REGISTERED' && event.fact.commandId === payload.commandId).length, 1);
  const stablePaths = ['engine/current', 'views/public', ...h.players.map(identity => `playerViews/${identity.uid}`)];
  await tick(h);
  assert.notEqual((await h.current()).phase.id, payload.phaseId);
  await stableDocuments(h, stablePaths, async () => assert.deepEqual(await duplicateBurst(h, 9, payload), receipt));
  const resolved = await until(h, state => state.round === 2);
  assert.equal(resolved.seats[0].health, 'Injured', 'one hit injures; duplicate effects would eliminate');
  assert.equal(resolved.seats[8].ordinaryWeapons, 0);
  assert.equal(resolved.queued.length, 0);
  await stableDocuments(h, stablePaths, async () => assert.deepEqual(await duplicateBurst(h, 9, payload), receipt));
  await commandDecisionCount(h, payload.commandId);
  const healthEvents = (await audience(h, 'public')).filter(event => event.fact.type === 'PUBLIC_HEALTH_CHANGED' && event.fact.seatId === 'seat-1');
  assert.deepEqual(healthEvents.map(event => event.fact.health), ['Injured']);
  const lookup = FullLookupResponseSchema.parse(await h.service.lookup(h.players[8].uid, { protocolVersion: 2, matchId: h.base.id, commandId: payload.commandId }));
  assert.deepEqual(lookup.receipt, receipt);
});

for (const code of ['NOT_ALLOWED', 'PHASE_CLOSED']) test(`concurrent rejected ${code} duplicates are terminal before and after phase advance without resource/effect changes`, async () => {
  const h = await harness();
  const initial = await h.current();
  if (code === 'PHASE_CLOSED') await tick(h);
  const before = await h.current();
  const payload = { protocolVersion: 2, matchId: h.base.id, phaseId: initial.phase.id, commandId: randomUUID(), command: { type: 'REGISTER_SHOT', targetSeatId: 'seat-2' } };
  const views = ['views/public', ...h.players.map(identity => `playerViews/${identity.uid}`)];
  let receipt;
  await stableDocuments(h, views, async () => { receipt = await duplicateBurst(h, 1, payload); });
  assert.equal(receipt.status, 'rejected'); assert.equal(receipt.code, code);
  await commandDecisionCount(h, payload.commandId);
  const rejected = await h.current();
  assert.equal(rejected.journalSequence, before.journalSequence + 1);
  assert.deepEqual(rejected.seats, before.seats);
  assert.deepEqual(rejected.queued, before.queued);
  assert.deepEqual(rejected.viewRevisions, before.viewRevisions);
  assert.ok(!(await audience(h, 'p-seat-1')).some(event => event.fact.commandId === payload.commandId));
  await tick(h);
  await stableDocuments(h, ['engine/current', ...views], async () => assert.deepEqual(await duplicateBurst(h, 1, payload), receipt));
  await commandDecisionCount(h, payload.commandId);
  const lookup = FullLookupResponseSchema.parse(await h.service.lookup(h.players[0].uid, { protocolVersion: 2, matchId: h.base.id, commandId: payload.commandId }));
  assert.deepEqual(lookup.receipt, receipt);
});

test('lost acknowledgement remains unresolved after a later preflight error; lookup recovers the committed original receipt', async () => {
  const h = await harness();
  const before = await h.current();
  const payload = { protocolVersion: 2, matchId: h.base.id, phaseId: before.phase.id, commandId: randomUUID(), command: { type: 'MOVE', destination: 'Room B' } };
  const unavailableDb = {
    collection: name => db.collection(name),
    doc: path => db.doc(path),
    runTransaction: async callback => { await db.runTransaction(callback); throw new Error('synthetic response loss after real commit'); },
  };
  const unavailable = createV1Service({ db: unavailableDb, clock: h.now });
  error(await unavailable.submit(h.players[0].uid, payload), 'UNAVAILABLE');
  error(await h.service.submit(h.players[0].uid, { ...payload, unexpected: true }), 'INVALID_REQUEST');
  const lookup = FullLookupResponseSchema.parse(await h.service.lookup(h.players[0].uid, { protocolVersion: 2, matchId: h.base.id, commandId: payload.commandId }));
  assert.equal(lookup.status, 'found'); assert.equal(lookup.receipt.status, 'accepted');
  assert.equal((await h.current()).seats[0].location, 'Room B');
  await commandDecisionCount(h, payload.commandId);
  await stableDocuments(h, ['engine/current', 'views/public'], async () => assert.deepEqual(await duplicateBurst(h, 1, payload), lookup.receipt));
});

test('fresh closed phase plus unknown lookup prevents delayed acceptance but permits a later durable rejection', async () => {
  const h = await harness();
  const initial = await h.current();
  const payload = { protocolVersion: 2, matchId: h.base.id, phaseId: initial.phase.id, commandId: randomUUID(), command: { type: 'MOVE', destination: 'Room B' } };
  await tick(h);
  const fresh = FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(h.players[0].uid).get()).data());
  assert.notEqual(fresh.phase.id, payload.phaseId);
  assert.ok(!fresh.ownPendingCommandIds.includes(payload.commandId));
  const lookup = FullLookupResponseSchema.parse(await h.service.lookup(h.players[0].uid, { protocolVersion: 2, matchId: h.base.id, commandId: payload.commandId }));
  assert.equal(lookup.status, 'unknown');
  const before = await h.current();
  const receipt = await duplicateBurst(h, 1, payload);
  assert.equal(receipt.status, 'rejected'); assert.equal(receipt.code, 'PHASE_CLOSED');
  assert.deepEqual((await h.current()).seats, before.seats);
  await commandDecisionCount(h, payload.commandId);
});

test('recovery rotation, expiry and competing redemptions fail closed; a host-player transfer moves host capability', async () => {
  const h = await harness(7, { hostPlays: true });
  const first = success(await h.service.issueSeatRecovery(h.host.uid, h.request({ seatId: 'seat-1' })));
  const second = success(await h.service.issueSeatRecovery(h.host.uid, h.request({ seatId: 'seat-1' })));
  const identities = await Promise.all([createEmulatorIdentity(), createEmulatorIdentity()]);
  error(await h.service.redeemSeatRecovery(identities[0].uid, h.request({ recoveryToken: first.recoveryToken })), 'FORBIDDEN');
  const outcomes = await Promise.all(identities.map(identity => h.service.redeemSeatRecovery(identity.uid, h.request({ recoveryToken: second.recoveryToken }))));
  assert.equal(outcomes.filter(response => response.ok).length, 1);
  const winner = identities[outcomes.findIndex(response => response.ok)];
  assert.equal((await h.base.collection('control').doc('session').get()).get('hostUid'), winner.uid);
  error(await h.service.abortMatch(h.host.uid, h.request()), 'FORBIDDEN');
  const expiring = success(await h.service.issueSeatRecovery(winner.uid, h.request({ seatId: 'seat-2' })));
  h.setTime(expiring.expiresAt);
  const other = await createEmulatorIdentity();
  error(await h.service.redeemSeatRecovery(other.uid, h.request({ recoveryToken: expiring.recoveryToken })), 'FORBIDDEN');
  success(await h.service.abortMatch(winner.uid, h.request()));
});

test('durable submit limit does not create a receipt or reserve a command ID, and deduplicated receipts precede throttling', async () => {
  const h = await harness();
  const limit = db.collection('requestLimits').doc(hash([h.players[0].uid, 'submit']));
  await limit.set({ windowStartedAt: h.now(), count: 120 });
  const commandId = randomUUID();
  const attempt = await h.command(1, { type: 'MOVE', destination: 'Room B' }, commandId);
  error(attempt.response, 'RATE_LIMITED'); assert.ok(attempt.response.error.retryAfterMs > 0);
  assert.equal((await h.base.collection('receipts').doc(hash(['seat-1', commandId])).get()).exists, false);
  await limit.set({ windowStartedAt: h.now(), count: 0 });
  const accepted = await h.service.submit(h.players[0].uid, attempt.payload);
  assert.equal(accepted.receipt.status, 'accepted');
  await limit.set({ windowStartedAt: h.now(), count: 120 });
  assert.deepEqual((await h.service.submit(h.players[0].uid, attempt.payload)).receipt, accepted.receipt);
  assert.equal((await h.base.collection('receipts').get()).size, 1);
});

test('deadline race at the exact boundary rejects the command, advances once and grants a delayed full next window', async () => {
  const h = await harness(); const state = await h.current();
  h.setTime(state.phase.endsAt);
  const job = { matchId: h.base.id, phaseId: state.phase.id, deadlineToken: state.deadlineToken };
  const payload = { protocolVersion: 2, matchId: h.base.id, phaseId: state.phase.id, commandId: randomUUID(), command: { type: 'MOVE', destination: 'Room B' } };
  const [command, ...jobs] = await Promise.all([h.service.submit(h.players[0].uid, payload), h.service.runDeadline(job), h.service.runDeadline(job)]);
  assert.equal(command.receipt.code, 'PHASE_CLOSED');
  assert.equal(jobs.filter(response => response.result === 'advanced').length, 1);
  const current = await h.current();
  assert.equal(current.activeSeatId, 'seat-2'); assert.equal(current.seats[0].location, 'Room A');
  h.setTime(current.phase.endsAt + 90_000);
  assert.equal((await h.service.runDeadline({ matchId: h.base.id, phaseId: current.phase.id, deadlineToken: 'stale-token' })).result, 'unchanged');
  assert.equal((await h.service.runDeadline({ matchId: h.base.id, phaseId: current.phase.id, deadlineToken: current.deadlineToken })).result, 'advanced');
  assert.equal((await h.current()).phase.startedAt, h.now());
  assert.equal((await h.current()).phase.endsAt - h.now(), 60_000);
});

test('outbox dispatch uses one durable lease, stable queue identity, lost-ack repair, expired leases and bounded cursor pages', async () => {
  const h = await harness();
  const intent = (await h.base.collection('outbox').get()).docs[0];
  let release, entered;
  const hold = new Promise(resolve => { release = resolve; });
  const began = new Promise(resolve => { entered = resolve; });
  let calls = 0;
  const first = h.service.dispatchDeadlineIntent(intent.ref.path, async () => { calls++; entered(); await hold; });
  await began;
  assert.equal((await h.service.dispatchDeadlineIntent(intent.ref.path, async () => assert.fail('live lease must not enqueue twice'))).status, 'unchanged');
  release(); assert.equal((await first).status, 'dispatched'); assert.equal(calls, 1);
  await intent.ref.update({ status: 'pending', nextAttemptAt: h.now(), leaseToken: null, leaseUntil: null });
  let ackFailed = false;
  const wrappedDb = {
    doc: path => db.doc(path),
    collectionGroup: name => h.base.collection(name), // Isolates this real-Firestore repair page from concurrently running suites.
    runTransaction: callback => db.runTransaction(tx => callback(new Proxy(tx, { get(target, key) {
      if (key === 'update') return (ref, data) => {
        if (data.status === 'dispatched' && !ackFailed) { ackFailed = true; throw new Error('synthetic acknowledgement loss'); }
        return target.update(ref, data);
      };
      const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value;
    } }))),
  };
  const repair = createV1Service({ db: wrappedDb, clock: h.now });
  const queued = new Set(); const attempts = [];
  const enqueue = createDeadlineEnqueuer({ enqueue: async (payload, options) => {
    attempts.push(options.id); assert.deepEqual(payload, { matchId: h.base.id, phaseId: intent.get('phaseId'), deadlineToken: intent.get('deadlineToken') });
    if (queued.has(options.id)) throw Object.assign(new Error('already exists'), { code: 'functions/task-already-exists' });
    queued.add(options.id);
  } });
  assert.equal((await repair.dispatchDeadlineIntent(intent.ref.path, enqueue)).status, 'failed');
  assert.equal((await intent.ref.get()).get('status'), 'pending');
  h.setTime((await intent.ref.get()).get('nextAttemptAt'));
  const page = await repair.repairOutbox(enqueue, { limit: 1 });
  assert.equal(page.dispatched, 1); assert.notEqual(page.nextCursor, null);
  assert.deepEqual(attempts, [intent.id, intent.id]); assert.equal(queued.size, 1);
  assert.equal((await repair.repairOutbox(enqueue, { limit: 1, cursor: page.nextCursor })).dispatched, 0);
  await assert.rejects(repair.repairOutbox(enqueue, { limit: 1, cursor: 'invalid' }), /Invalid repair cursor/);
  const second = await tick(h);
  const next = h.base.collection('outbox').doc(hash([h.base.id, second.phase.id, second.deadlineToken]));
  await next.update({ status: 'leased', leaseToken: 'abandoned-lease', leaseUntil: h.now() - 1, nextAttemptAt: h.now() - 1 });
  const repaired = await repair.repairOutbox(async value => { assert.equal(value.taskId, next.id); }, { limit: 1 });
  assert.equal(repaired.dispatched, 1);
  const malformedId = 'a'.repeat(64), malformed = h.base.collection('outbox').doc(malformedId);
  await malformed.set({ ...intent.data(), taskId: malformedId, matchId: 'another-match', status: 'pending', nextAttemptAt: h.now() });
  assert.equal((await repair.dispatchDeadlineIntent(malformed.path, async () => assert.fail('invalid intent must not enqueue'))).status, 'blocked');
  assert.equal((await malformed.get()).get('status'), 'blocked');
});

test('recorded journal and binding audit reconstruct state under a fresh emulator match ID with old receipts kept in the original match', async () => {
  const h = await harness();
  const accepted = await h.command(1, { type: 'MOVE', destination: 'Room B' }); assert.equal(accepted.response.receipt.status, 'accepted');
  const rejected = await h.command(2, { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' }); assert.equal(rejected.response.receipt.status, 'rejected');
  await tick(h);
  const replacement = await createEmulatorIdentity();
  const issued = success(await h.service.issueSeatRecovery(h.host.uid, h.request({ seatId: 'seat-1' })));
  success(await h.service.redeemSeatRecovery(replacement.uid, h.request({ recoveryToken: issued.recoveryToken })));
  success(await h.service.abortMatch(h.host.uid, h.request()));
  const records = (await h.base.collection('events').orderBy('sequence').get()).docs.map(doc => doc.data());
  let replay;
  for (const record of records) {
    if (record.kind === 'SETUP') replay = createFullGame({ ...record, setup: decodeV1Setup(record.setup) });
    else if (record.kind === 'COMMAND') { const evaluated = executeFullGame(replay, record.actorSeatId, record.request, record); assert.deepEqual(evaluated.receipt, record.receipt); replay = evaluated.state; }
    else if (record.kind === 'DEADLINE') { const evaluated = advanceFullGame(replay, record); assert.equal(evaluated.advanced, true); replay = evaluated.state; }
    else if (record.kind === 'ABORT') replay = abortFullGame(replay, record);
    else assert.fail('unsupported private journal record');
    replay = { ...replay, journalSequence: record.sequence };
  }
  assert.deepEqual(replay, await h.current());
  assert.deepEqual(projectFullGame(replay).public, (await h.base.collection('views').doc('public').get()).data());
  const bindings = new Map(records[0].seatBindings.map(binding => [binding.seatId, { ...binding }]));
  const audit = (await h.base.collection('identityAudit').orderBy('bindingRevision').get()).docs.map(doc => doc.data());
  for (const transfer of audit) {
    const before = bindings.get(transfer.seatId); assert.equal(before.uid, transfer.previousUid);
    assert.equal(before.bindingRevision + 1, transfer.bindingRevision);
    bindings.set(transfer.seatId, { ...before, uid: transfer.currentUid, bindingRevision: transfer.bindingRevision });
  }
  for (const [seatId, value] of bindings) assert.deepEqual((await h.base.collection('seats').doc(seatId).get()).data(), { uid: value.uid, bindingRevision: value.bindingRevision, initialRoom: value.initialRoom });
  const restored = db.collection('matches').doc(randomUUID()), restoredState = { ...replay, matchId: restored.id };
  const projection = projectFullGame(restoredState), batch = db.batch();
  const control = (await h.base.collection('control').doc('session').get()).data();
  batch.set(restored.collection('control').doc('session'), { ...control, roomCode: 'RESTORED' });
  batch.set(restored.collection('engine').doc('current'), encodeV1State(restoredState));
  batch.set(restored.collection('views').doc('public'), projection.public);
  for (const [seatId, binding] of bindings) {
    batch.set(restored.collection('seats').doc(seatId), { uid: binding.uid, bindingRevision: binding.bindingRevision, initialRoom: binding.initialRoom });
    batch.set(restored.collection('members').doc(binding.uid), { kind: 'player', seatId, bindingRevision: binding.bindingRevision });
    batch.set(restored.collection('playerViews').doc(binding.uid), projection.players[seatId]);
  }
  await batch.commit();
  assert.notEqual(restored.id, h.base.id);
  assert.equal((await restored.collection('receipts').get()).size, 0, 'receipts are decisions scoped to the original match identity');
  const restoredLookup = FullLookupResponseSchema.parse(await h.service.lookup(replacement.uid, { protocolVersion: 2, matchId: restored.id, commandId: accepted.payload.commandId }));
  assert.equal(restoredLookup.status, 'unknown');
  const sourceLookup = FullLookupResponseSchema.parse(await h.service.lookup(replacement.uid, { protocolVersion: 2, matchId: h.base.id, commandId: accepted.payload.commandId }));
  assert.deepEqual(sourceLookup.receipt, accepted.response.receipt);
  assert.equal((await firestoreRequest(`${restored.path}/playerViews/${replacement.uid}`, { idToken: replacement.idToken })).status, 200);
  assert.equal((await firestoreRequest(`${restored.path}/views/public`, { idToken: h.players[0].idToken })).status, 403);
  assert.deepEqual(decodeV1State((await restored.collection('engine').doc('current').get()).data()), restoredState);
  assert.deepEqual((await restored.collection('playerViews').doc(replacement.uid).get()).data().self, projectFullGame(replay).players['seat-1'].self);
});
