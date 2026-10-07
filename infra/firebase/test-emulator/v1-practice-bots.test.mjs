import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  FullPracticeBotsDocumentSchema, FullSetPracticeBotsResponseSchema,
  FullLobbyIdentityDocumentSchema, FullSetLobbyIdentityResponseSchema,
  FullOperationResponseSchema, FullFailureSchema, FullPublicViewSchema, FullPlayerViewSchema,
} from '@mothership/contracts';
import { createFullGame, executeFullGame, advanceFullGame, abortFullGame, projectFullGame, projectOwnAcknowledgments } from '@mothership/engine';
import { createV1Service } from '../../../services/game-api/dist/index.js';
import { decodeV1State, decodeV1Setup } from '../../../services/game-api/dist/full-game.js';
import { createV1DeadlineHandler } from '../dist/v1.js';
import { encodeFirestoreValue } from '../test/helpers.mjs';

// No SDK or test connection is permitted until explicit loopback demo emulators are supplied.
const projectId = process.env.MOTHERSHIP_PRACTICE_TEST_PROJECT ?? 'demo-mothership';
const loopback = /^(?:127\.0\.0\.1|localhost):([0-9]{1,5})$/;
let app, db, serial = 0;
before(() => {
  assert.ok(['demo-mothership', 'demo-mothership-practice-bots'].includes(projectId));
  for (const key of ['FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST']) {
    const port = Number(process.env[key]?.match(loopback)?.[1]);
    assert.ok(port > 0 && port < 65536, 'Only explicit loopback emulators are permitted');
  }
  assert.ok(process.env.GCLOUD_PROJECT === undefined || process.env.GCLOUD_PROJECT === projectId);
  app = initializeApp({ projectId }, 'practice-' + randomUUID()); db = getFirestore(app);
});
after(async () => { await db?.terminate(); if (app) await deleteApp(app); });
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const op = value => { FullOperationResponseSchema.parse(value); assert.equal(value.ok, true); return value.result; };
const fail = (value, code) => { FullFailureSchema.parse(value); assert.equal(value.error?.code, code); };
const configured = (value, body) => {
  FullSetPracticeBotsResponseSchema.parse(value); assert.equal(value.ok, true);
  assert.equal(value.matchId, body.matchId); assert.equal(value.requestId, body.requestId); return value;
};
const configureError = (value, code) => { FullSetPracticeBotsResponseSchema.parse(value); assert.equal(value.error?.code, code); };
async function settleUnavailable(response, repeatSameIntent) {
  // Real Firestore contention may exhaust one transaction's retries. Reconcile the
  // unchanged request after both competitors settle; never replace its request ID.
  for (let retry = 0; response.error?.code === 'UNAVAILABLE' && retry < 2; retry++) response = await repeatSameIntent();
  assert.notEqual(response.error?.code, 'UNAVAILABLE', 'The unchanged intent must settle once contention is over');
  return response;
}
async function auth() {
  const response = await fetch('http://' + process.env.FIREBASE_AUTH_EMULATOR_HOST + '/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-only', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }),
  });
  assert.equal(response.status, 200); const data = await response.json(); return { uid: data.localId, idToken: data.idToken };
}
async function read(h, identity, suffix, { method = 'GET', data } = {}) {
  return fetch('http://' + process.env.FIRESTORE_EMULATOR_HOST + '/v1/projects/' + projectId + '/databases/(default)/documents/' + h.base.path + '/' + suffix, {
    method, headers: { 'content-type': 'application/json', ...(identity ? { authorization: 'Bearer ' + identity.idToken } : {}) },
    ...(data === undefined ? {} : { body: JSON.stringify({ fields: encodeFirestoreValue(data).mapValue.fields }) }),
  });
}
async function harness({ playerCount = 7, humanSeats = [] } = {}) {
  let now = 2_000_000_000_000 + ++serial * 100_000_000;
  const service = createV1Service({ db, clock: () => now, shuffle: items => [...items] });
  const [host, display, outsider, ...humans] = await Promise.all(Array.from({ length: humanSeats.length + 3 }, () => auth()));
  const created = op(await service.createMatch(host.uid, { protocolVersion: 2, requestId: randomUUID(), playerCount }));
  const base = db.collection('matches').doc(created.matchId);
  const request = fields => ({ protocolVersion: 2, matchId: base.id, requestId: randomUUID(), ...fields });
  const admission = async identity => op(await service.requestAdmission(identity.uid, { protocolVersion: 2, requestId: randomUUID(), roomCode: created.roomCode, initialRoom: 'Room A' }));
  const approve = async (identity, seatId) => {
    const pending = await admission(identity);
    return service.approveAdmission(host.uid, request({ admissionId: pending.admissionId, seatId }));
  };
  for (let i = 0; i < humanSeats.length; i++) op(await approve(humans[i], humanSeats[i]));
  op(await service.admitDisplay(host.uid, request({ displayUid: display.uid })));
  const configuration = (botCount, requestId = randomUUID()) => ({ schemaVersion: 1, protocolVersion: 2, matchId: base.id, requestId, botCount });
  const set = async count => { const body = configuration(count); return configured(await service.setPracticeBots(host.uid, body), body); };
  const practice = async () => FullPracticeBotsDocumentSchema.parse((await base.collection('practice').doc('public').get()).data());
  const identities = async () => FullLobbyIdentityDocumentSchema.parse((await base.collection('identities').doc('public').get()).data());
  const bindings = async () => Object.fromEntries((await base.collection('seats').get()).docs.map(doc => [doc.id, doc.data()]));
  const state = async () => decodeV1State((await base.collection('engine').doc('current').get()).data());
  const h = { service, base, host, display, outsider, humans, humanSeats, request, admission, approve, configuration, set, practice, identities, bindings, state, now: () => now, setTime: value => { now = value; } };
  return h;
}
async function roster(h) {
  const bindings = await h.bindings(), practice = await h.practice(), identities = await h.identities();
  const bots = Object.entries(bindings).filter(([, binding]) => binding.controller === 'bot').map(([seatId]) => seatId).sort();
  assert.deepEqual(practice.botSeatIds, bots);
  assert.deepEqual(identities.seats.map(seat => seat.seatId).sort(), Object.keys(bindings).sort());
  const lobby = (await h.base.collection('lobby').doc('public').get()).data();
  assert.deepEqual(lobby.seats.map(seat => seat.seatId).sort(), Object.keys(bindings).sort());
  return { bindings, practice, identities, bots };
}

for (const playerCount of [7, 8, 9]) test(`${playerCount}-seat bot capacity preserves human bindings and their chosen public identities`, async () => {
  const h = await harness({ playerCount, humanSeats: ['seat-1', 'seat-' + playerCount] });
  for (let i = 0; i < 2; i++) {
    const selected = await h.service.setLobbyIdentity(h.humans[i].uid, { schemaVersion: 1, ...h.request({ displayName: 'Human ' + (i + 1), characterId: i === 0 ? 'c1' : 'c9' }) });
    FullSetLobbyIdentityResponseSchema.parse(selected); assert.equal(selected.ok, true);
  }
  const humanBindings = await h.bindings(), humanIdentities = (await h.identities()).seats;
  const result = await h.set(playerCount - 2), before = await roster(h);
  assert.equal(result.botSeatIds.length, playerCount - 2); assert.equal(before.practice.revision, result.revision);
  assert.equal(Object.keys(before.bindings).length, playerCount);
  for (const seatId of h.humanSeats) {
    assert.deepEqual(before.bindings[seatId], humanBindings[seatId]);
    assert.deepEqual(before.identities.seats.find(seat => seat.seatId === seatId), humanIdentities.find(seat => seat.seatId === seatId));
  }
  for (const seatId of before.bots) {
    assert.equal(Object.hasOwn(before.bindings[seatId], 'uid'), false);
    assert.deepEqual(Object.keys(before.bindings[seatId]).sort(), ['bindingRevision', 'controller', 'initialRoom']);
    assert.ok(before.bindings[seatId].bindingRevision >= 1);
  }
  assert.equal(new Set(before.identities.seats.map(seat => seat.characterId)).size, playerCount);
  assert.equal(new Set(before.identities.seats.map(seat => seat.displayName)).size, playerCount);
  assert.ok(before.identities.seats.every(seat => seat.characterId !== null && seat.displayName !== null));
  configureError(await h.service.setPracticeBots(h.host.uid, h.configuration(playerCount - 1)), 'CAPACITY_EXCEEDED');
  assert.deepEqual(await roster(h), before);
});

test('new public practice record starts empty; old missing record is a readable legacy fallback', async () => {
  const h = await harness();
  assert.deepEqual(await h.practice(), { schemaVersion: 1, protocolVersion: 2, matchId: h.base.id, revision: 0, policyVersion: 'practice-1', botSeatIds: [] });
  assert.equal((await read(h, h.host, 'practice/public')).status, 200);
  await h.base.collection('practice').doc('public').delete();
  assert.equal((await read(h, h.host, 'practice/public')).status, 404);
  await h.set(1); assert.equal((await h.practice()).botSeatIds.length, 1);
});

test('only the current host configures; strict versions and unknown actor/secret fields are rejected', async () => {
  const h = await harness({ humanSeats: ['seat-7'] }), body = h.configuration(1);
  for (const identity of [h.display, h.outsider, ...h.humans]) configureError(await h.service.setPracticeBots(identity.uid, body), 'FORBIDDEN');
  configureError(await h.service.setPracticeBots('', body), 'UNAUTHENTICATED');
  configureError(await h.service.setPracticeBots(h.host.uid, { ...body, protocolVersion: 1 }), 'UNSUPPORTED_PROTOCOL');
  configureError(await h.service.setPracticeBots(h.host.uid, { ...body, schemaVersion: 2 }), 'UNSUPPORTED_SCHEMA');
  for (const extra of [{ seatId: 'seat-7' }, { uid: h.humans[0].uid }, { recoveryToken: 'synthetic-invalid-input' }]) {
    configureError(await h.service.setPracticeBots(h.host.uid, { ...body, ...extra }), 'INVALID_REQUEST');
  }
  for (const botCount of [-1, 10, 1.5]) configureError(await h.service.setPracticeBots(h.host.uid, { ...body, botCount }), 'INVALID_REQUEST');
  assert.equal((await h.practice()).botSeatIds.length, 0);
});

test('increase/decrease preserves retained bot identities and removes the highest bot seats without touching humans', async () => {
  const h = await harness({ humanSeats: ['seat-4'] });
  await h.set(3); const first = await roster(h);
  await h.set(5); const grown = await roster(h);
  for (const seatId of first.bots) {
    assert.deepEqual(grown.bindings[seatId], first.bindings[seatId]);
    assert.deepEqual(grown.identities.seats.find(seat => seat.seatId === seatId), first.identities.seats.find(seat => seat.seatId === seatId));
  }
  await h.set(1); const reduced = await roster(h);
  assert.deepEqual(reduced.bots, [grown.bots[0]]);
  assert.deepEqual(reduced.bindings['seat-4'], first.bindings['seat-4']);
  await h.set(0); const empty = await roster(h);
  assert.deepEqual(Object.keys(empty.bindings), ['seat-4']); assert.deepEqual(empty.bots, []);
  assert.equal((await h.base.collection('engine').doc('current').get()).exists, false);
});

test('bot allocation avoids a human claiming a previously generated bot name and character', async () => {
  const h = await harness(); await h.set(1);
  const previous = (await h.identities()).seats[0]; await h.set(0);
  const human = await auth(); op(await h.approve(human, previous.seatId));
  const selected = await h.service.setLobbyIdentity(human.uid, { schemaVersion: 1, ...h.request({ displayName: previous.displayName, characterId: previous.characterId }) });
  FullSetLobbyIdentityResponseSchema.parse(selected); assert.equal(selected.ok, true);
  await h.set(1); const current = await roster(h);
  assert.equal(new Set(current.identities.seats.map(seat => seat.characterId)).size, 2);
  assert.equal(new Set(current.identities.seats.map(seat => seat.displayName)).size, 2);
  assert.deepEqual(current.identities.seats.find(seat => seat.seatId === previous.seatId), previous);
});

test('configuration replay checks fresh host authority and payload digest, including after start and service restart', async () => {
  const h = await harness(), body = h.configuration(7);
  const first = configured(await h.service.setPracticeBots(h.host.uid, body), body), before = await roster(h);
  assert.deepEqual(configured(await h.service.setPracticeBots(h.host.uid, body), body), first);
  configureError(await h.service.setPracticeBots(h.host.uid, { ...body, botCount: 6 }), 'REQUEST_ID_CONFLICT');
  assert.deepEqual(await roster(h), before);
  op(await h.service.startMatch(h.host.uid, h.request()));
  const stateBefore = await h.state(), frozen = await roster(h);
  const restarted = createV1Service({ db, clock: () => h.now() });
  assert.deepEqual(configured(await restarted.setPracticeBots(h.host.uid, body), body), first);
  configureError(await restarted.setPracticeBots(h.host.uid, h.configuration(0)), 'LOBBY_LOCKED');
  assert.deepEqual(await h.state(), stateBefore); assert.deepEqual(await roster(h), frozen);
  await h.base.collection('control').doc('session').update({ hostUid: h.outsider.uid });
  configureError(await restarted.setPracticeBots(h.host.uid, body), 'FORBIDDEN');
});

test('lobby abort locks bot configuration without a role deal', async () => {
  const h = await harness(); await h.set(2); const before = await roster(h);
  op(await h.service.abortMatch(h.host.uid, h.request()));
  configureError(await h.service.setPracticeBots(h.host.uid, h.configuration(0)), 'LOBBY_LOCKED');
  assert.deepEqual((await h.practice()).botSeatIds, before.bots);
  assert.equal((await h.base.collection('engine').doc('current').get()).exists, false);
});

test('racing full bot allocation and human admission commits one coherent capacity outcome', async () => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const h = await harness(), human = await auth(), pending = await h.admission(human);
    const body = h.configuration(7), admission = h.request({ admissionId: pending.admissionId, seatId: 'seat-1' });
    let [bots, admitted] = await Promise.all([
      h.service.setPracticeBots(h.host.uid, body),
      h.service.approveAdmission(h.host.uid, admission),
    ]);
    FullSetPracticeBotsResponseSchema.parse(bots); FullOperationResponseSchema.parse(admitted);
    assert.ok(!(bots.ok && admitted.ok), 'Competing capacity claims cannot both commit');
    const raced = await roster(h), acknowledgedWinner = bots.ok || admitted.ok;
    bots = await settleUnavailable(bots, () => h.service.setPracticeBots(h.host.uid, body));
    admitted = await settleUnavailable(admitted, () => h.service.approveAdmission(h.host.uid, admission));
    FullSetPracticeBotsResponseSchema.parse(bots); FullOperationResponseSchema.parse(admitted);
    assert.equal([bots.ok, admitted.ok].filter(Boolean).length, 1);
    const current = await roster(h);
    if (acknowledgedWinner) assert.deepEqual(current, raced, 'Reconciliation cannot rewrite the winning roster');
    if (bots.ok) { assert.equal(current.bots.length, 7); fail(admitted, 'FORBIDDEN'); }
    else { configureError(bots, 'CAPACITY_EXCEEDED'); assert.equal(current.bots.length, 0); assert.equal(current.bindings['seat-1'].uid, human.uid); }
  }
});

test('racing bot removal and match start serializes the frozen complete roster or the empty lobby', async () => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const h = await harness(); await h.set(7); const body = h.configuration(0), start = h.request();
    let [removed, started] = await Promise.all([h.service.setPracticeBots(h.host.uid, body), h.service.startMatch(h.host.uid, start)]);
    FullSetPracticeBotsResponseSchema.parse(removed); FullOperationResponseSchema.parse(started);
    assert.ok(!(removed.ok && started.ok), 'Start cannot commit a removed roster');
    const raced = await roster(h), acknowledgedWinner = removed.ok || started.ok;
    removed = await settleUnavailable(removed, () => h.service.setPracticeBots(h.host.uid, body));
    started = await settleUnavailable(started, () => h.service.startMatch(h.host.uid, start));
    FullSetPracticeBotsResponseSchema.parse(removed); FullOperationResponseSchema.parse(started);
    assert.equal([removed.ok, started.ok].filter(Boolean).length, 1);
    if (acknowledgedWinner) assert.deepEqual(await roster(h), raced, 'Reconciliation cannot rewrite the frozen roster');
    const control = (await h.base.collection('control').doc('session').get()).data(), current = await roster(h);
    if (started.ok) { configureError(removed, 'LOBBY_LOCKED'); assert.equal(control.status, 'running'); assert.equal(current.bots.length, 7); assert.equal((await h.state()).seats.length, 7); }
    else { fail(started, 'FORBIDDEN'); assert.equal(control.status, 'lobby'); assert.deepEqual(current.bots, []); assert.equal((await h.base.collection('engine').doc('current').get()).exists, false); }
  }
});

for (const playerCount of [7, 8, 9]) test(`${playerCount}-seat practice starts with no bot UID or private bot client document`, async () => {
  const h = await harness({ playerCount, humanSeats: ['seat-' + playerCount] }); await h.set(playerCount - 1);
  op(await h.service.startMatch(h.host.uid, h.request()));
  FullPublicViewSchema.parse((await h.base.collection('views').doc('public').get()).data());
  FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(h.humans[0].uid).get()).data());
  const value = await roster(h);
  for (const collection of ['members', 'seatSessions', 'playerViews', 'ownAcknowledgments']) {
    const documents = await h.base.collection(collection).get();
    const expected = collection === 'members' ? [h.host.uid, h.display.uid, h.humans[0].uid] : [h.humans[0].uid];
    assert.deepEqual(documents.docs.map(doc => doc.id).sort(), expected.sort());
  }
  assert.ok(value.bots.every(seatId => !Object.hasOwn(value.bindings[seatId], 'uid')));
  assert.equal((await h.state()).seats.length, playerCount);
});

test('practice public metadata is readable only by admitted audiences; all direct writes and private binding epochs are denied', async () => {
  const h = await harness({ humanSeats: ['seat-7'] }); await h.set(2);
  const value = await h.practice();
  for (const identity of [h.host, h.display, ...h.humans]) {
    assert.equal((await read(h, identity, 'practice/public')).status, 200);
    assert.equal((await read(h, identity, 'practice/public', { method: 'PATCH', data: value })).status, 403);
    assert.equal((await read(h, identity, 'practice')).status, 403);
    assert.equal((await read(h, identity, 'practice/bindingEpochs')).status, 403);
  }
  for (const identity of [undefined, h.outsider]) assert.equal((await read(h, identity, 'practice/public')).status, 403);
});

test('no display, admission, human command or forged recovery can turn a server bot into a player seat', async () => {
  const h = await harness({ humanSeats: ['seat-7'] }); await h.set(6);
  const botSeatId = (await h.practice()).botSeatIds[0], before = (await h.bindings())[botSeatId];
  fail(await h.approve(h.display, botSeatId), 'FORBIDDEN');
  fail(await h.service.issueSeatRecovery(h.host.uid, h.request({ seatId: botSeatId })), 'FORBIDDEN');
  assert.equal((await h.base.collection('recovery').doc(botSeatId).get()).exists, false);
  assert.deepEqual((await h.bindings())[botSeatId], before);
  assert.equal((await h.base.collection('members').doc(h.display.uid).get()).get('kind'), 'display');
  op(await h.service.startMatch(h.host.uid, h.request()));
  const state = await h.state(), body = { protocolVersion: 2, matchId: h.base.id, phaseId: state.phase.id, commandId: randomUUID(), command: { type: 'MOVE', destination: 'Room B' } };
  fail(await h.service.submit(h.display.uid, body), 'FORBIDDEN');
  fail(await h.service.submit(h.host.uid, body), 'FORBIDDEN');
  fail(await h.service.submit(h.humans[0].uid, { ...body, seatId: botSeatId }), 'INVALID_REQUEST');

  // Admin-only corruption probe: adding a plausible UID still cannot bypass the bot controller guard.
  await h.base.collection('seats').doc(botSeatId).update({ uid: h.display.uid });
  const recoveryToken = 'x'.repeat(43);
  await h.base.collection('recovery').doc(botSeatId).set({ tokenDigest: hash([h.base.id, botSeatId, recoveryToken]),
    expiresAt: h.now() + 600_000, bindingRevision: before.bindingRevision, issuedByUid: h.host.uid, consumed: false });
  const replacement = await auth();
  fail(await h.service.redeemSeatRecovery(replacement.uid, h.request({ recoveryToken })), 'FORBIDDEN');
  assert.equal((await h.base.collection('members').doc(replacement.uid).get()).exists, false);
  assert.deepEqual(await h.state(), state);
});

test('forged reverse membership and UID cannot read any bot private projection, own result, session or event stream', async () => {
  const h = await harness({ humanSeats: ['seat-7'] }); await h.set(6);
  op(await h.service.startMatch(h.host.uid, h.request()));
  const botSeatId = (await h.practice()).botSeatIds[0], binding = (await h.bindings())[botSeatId], state = await h.state(), forged = h.humans[0];
  await h.base.collection('seats').doc(botSeatId).update({ uid: forged.uid });
  await h.base.collection('members').doc(forged.uid).set({ kind: 'player', seatId: botSeatId, bindingRevision: binding.bindingRevision });
  // Seed schema-valid canaries so denial is checked independently of ordinary document absence.
  await h.base.collection('playerViews').doc(forged.uid).set(projectFullGame(state).players[botSeatId]);
  await h.base.collection('ownAcknowledgments').doc(forged.uid).set(projectOwnAcknowledgments(state, botSeatId, binding.bindingRevision));
  await h.base.collection('seatSessions').doc(forged.uid).set({ schemaVersion: 1, protocolVersion: 2, matchId: h.base.id, seatId: botSeatId, bindingRevision: binding.bindingRevision });
  await h.base.collection('audienceEvents').doc('p-' + botSeatId).collection('items').doc('private-canary').set({
    protocolVersion: 2, matchId: h.base.id, audience: { kind: 'player', seatId: botSeatId }, fact: { type: 'COMMAND_REGISTERED', commandId: 'synthetic-bot-command' }, viewRevision: 1,
  });
  for (const identity of [h.host, h.display, forged, h.outsider]) {
    for (const path of ['playerViews/' + forged.uid, 'ownAcknowledgments/' + forged.uid, 'seatSessions/' + forged.uid, 'audienceEvents/p-' + botSeatId + '/items/private-canary', 'engine/current', 'seats/' + botSeatId]) {
      assert.equal((await read(h, identity, path)).status, 403);
    }
  }
  const command = { protocolVersion: 2, matchId: h.base.id, phaseId: state.phase.id, commandId: randomUUID(), command: { type: 'MOVE', destination: 'Room B' } };
  fail(await h.service.submit(forged.uid, command), 'FORBIDDEN');
  fail(await h.service.lookup(forged.uid, { protocolVersion: 2, matchId: h.base.id, commandId: command.commandId }), 'FORBIDDEN');
  const selected = await h.service.setLobbyIdentity(forged.uid, { schemaVersion: 1, ...h.request({ displayName: 'Forged Bot', characterId: 'c9' }) });
  FullSetLobbyIdentityResponseSchema.parse(selected); assert.equal(selected.error?.code, 'FORBIDDEN');
  assert.deepEqual(await h.state(), state);
});

test('bounded internal runner journals real engine commands once; retries and concurrent workers cannot duplicate spending or close the deadline early', async () => {
  const h = await harness(); await h.set(7); op(await h.service.startMatch(h.host.uid, h.request()));
  const initial = await h.state();
  const first = await h.service.runPracticeBots(h.base.id, { limit: 1 });
  assert.deepEqual(first, { status: 'advanced', processed: 1 });
  assert.deepEqual(await h.service.runPracticeBots(h.base.id, { limit: 1 }), { status: 'advanced', processed: 1 });
  assert.equal((await h.base.collection('receipts').get()).size, 2);
  const concurrent = await Promise.all(Array.from({ length: 2 }, () => h.service.runPracticeBots(h.base.id, { limit: 18 })));
  assert.ok(concurrent.every(result => ['advanced', 'unchanged'].includes(result.status) && result.processed >= 0 && result.processed <= 18));
  const settled = await h.state(), journal = (await h.base.collection('events').orderBy('sequence').get()).docs.map(doc => doc.data());
  assert.equal(settled.phase.id, initial.phase.id); assert.equal(settled.phase.endsAt, initial.phase.endsAt);
  const commands = journal.filter(record => record.kind === 'COMMAND'); assert.ok(commands.length > 0);
  assert.equal(new Set(commands.map(record => record.actorSeatId + '/' + record.request.commandId)).size, commands.length);
  for (const record of commands) {
    assert.equal(record.controller, 'bot'); assert.equal(record.policyVersion, 'practice-1'); assert.equal(Object.hasOwn(record, 'verifiedUid'), false);
    assert.equal(record.request.commandId, hash(['practice-1', h.base.id, record.request.phaseId, record.actorSeatId, record.request.command.type]));
  }
  const receipts = (await h.base.collection('receipts').get()).docs;
  assert.equal(receipts.length, commands.length);
  assert.ok(receipts.every(doc => doc.get('controller') === 'bot' && !Object.hasOwn(doc.data(), 'verifiedUid')));
  assert.deepEqual(await h.service.runPracticeBots(h.base.id, { limit: 18 }), { status: 'unchanged', processed: 0 });
  assert.deepEqual(await h.state(), settled);
  assert.equal((await h.base.collection('events').get()).size, journal.length);
  for (const collection of ['playerViews', 'ownAcknowledgments', 'seatSessions']) assert.equal((await h.base.collection(collection).get()).size, 0);

  let replay;
  for (const record of journal) {
    if (record.kind === 'SETUP') replay = createFullGame({ ...record, setup: decodeV1Setup(record.setup) });
    else if (record.kind === 'COMMAND') { const evaluated = executeFullGame(replay, record.actorSeatId, record.request, record); assert.deepEqual(evaluated.receipt, record.receipt); replay = evaluated.state; }
    else if (record.kind === 'DEADLINE') { const evaluated = advanceFullGame(replay, record); assert.equal(evaluated.advanced, true); replay = evaluated.state; }
    else if (record.kind === 'ABORT') replay = abortFullGame(replay, record);
    else assert.fail('Unknown journal operation');
    replay = { ...replay, journalSequence: record.sequence };
  }
  assert.deepEqual(replay, settled);
  assert.deepEqual(projectFullGame(replay).public, (await h.base.collection('views').doc('public').get()).data());
});

test('runner refuses unsafe bounds and never acts before phase start, at deadline, in a lobby or after host abort', async () => {
  const h = await harness(); await h.set(7);
  for (const limit of [0, 19, 1.5]) assert.deepEqual(await h.service.runPracticeBots(h.base.id, { limit }), { status: 'blocked', processed: 0 });
  assert.deepEqual(await h.service.runPracticeBots('../unsafe', { limit: 18 }), { status: 'blocked', processed: 0 });
  assert.deepEqual(await h.service.runPracticeBots(h.base.id, { limit: 18 }), { status: 'unchanged', processed: 0 });
  op(await h.service.startMatch(h.host.uid, h.request())); const state = await h.state();
  h.setTime(state.phase.startedAt - 1);
  assert.deepEqual(await h.service.runPracticeBots(h.base.id, { limit: 18 }), { status: 'unchanged', processed: 0 });
  h.setTime(state.phase.endsAt);
  assert.deepEqual(await h.service.runPracticeBots(h.base.id, { limit: 18 }), { status: 'unchanged', processed: 0 });
  assert.deepEqual(await h.state(), state);
  op(await h.service.abortMatch(h.host.uid, h.request())); const aborted = await h.state();
  assert.deepEqual(await h.service.runPracticeBots(h.base.id, { limit: 18 }), { status: 'unchanged', processed: 0 });
  assert.deepEqual(await h.state(), aborted);
});

test('storage failure is surfaced for trigger retry and cannot consume a command before a successful worker retry', async () => {
  const h = await harness(); await h.set(7); op(await h.service.startMatch(h.host.uid, h.request())); const before = await h.state();
  const failingDb = new Proxy(db, { get(target, key) {
    if (key === 'runTransaction') return async () => { throw new Error('synthetic storage unavailability'); };
    const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value;
  } });
  const failing = createV1Service({ db: failingDb, clock: () => h.now() });
  assert.deepEqual(await failing.runPracticeBots(h.base.id, { limit: 18 }), { status: 'failed', processed: 0 });
  assert.deepEqual(await h.state(), before); assert.equal((await h.base.collection('receipts').get()).size, 0);
  assert.deepEqual(await h.service.runPracticeBots(h.base.id, { limit: 1 }), { status: 'advanced', processed: 1 });
  assert.equal((await h.base.collection('receipts').get()).size, 1);
});

test('configuration rate refusal carries bounded retry delay and creates no durable operation; removal clears stale bot recovery grants', async () => {
  const h = await harness(), body = h.configuration(1);
  await db.collection('requestLimits').doc(hash([h.host.uid, 'setPracticeBots'])).set({ windowStartedAt: h.now(), count: 120 });
  const limited = await h.service.setPracticeBots(h.host.uid, body); configureError(limited, 'RATE_LIMITED');
  assert.equal(limited.error.retryAfterMs, 60_000);
  assert.equal((await db.collection('practiceBotOperations').doc(hash([h.host.uid, body.requestId])).get()).exists, false);
  h.setTime(h.now() + 60_000); configured(await h.service.setPracticeBots(h.host.uid, body), body);
  const seatId = (await h.practice()).botSeatIds[0], old = (await h.bindings())[seatId];
  await h.base.collection('recovery').doc(seatId).set({ tokenDigest: 'synthetic-invalid-digest', consumed: false });
  await h.set(0); assert.equal((await h.base.collection('recovery').doc(seatId).get()).exists, false);
  await h.set(1); assert.ok((await h.bindings())[seatId].bindingRevision > old.bindingRevision);
});

test('the canonical deadline handler repairs a dropped engine-write bot event and stale task retries do not duplicate commands', async () => {
  const h = await harness(); await h.set(7); op(await h.service.startMatch(h.host.uid, h.request()));
  const missed = await h.state();
  assert.equal((await h.base.collection('receipts').get()).size, 0, 'No worker or engine-write handler was invoked for the first phase');
  const payload = { matchId: h.base.id, phaseId: missed.phase.id, deadlineToken: missed.deadlineToken };
  h.setTime(missed.phase.endsAt);
  const deadline = createV1DeadlineHandler(h.service); await deadline(payload);
  const repaired = await h.state(), records = (await h.base.collection('events').orderBy('sequence').get()).docs.map(doc => doc.data());
  assert.notEqual(repaired.phase.id, missed.phase.id);
  assert.equal(repaired.phase.kind, 'ORDINARY_TURN'); assert.equal(repaired.activeSeatId, 'seat-2');
  const commands = records.filter(record => record.kind === 'COMMAND' && record.controller === 'bot');
  assert.ok(commands.length > 0, 'The due deadline handler itself invoked the worker for the new phase');
  assert.ok(commands.every(record => record.request.phaseId === repaired.phase.id));
  const receipts = (await h.base.collection('receipts').get()).size;
  await deadline(payload);
  assert.deepEqual(await h.state(), repaired);
  assert.equal((await h.base.collection('events').get()).size, records.length);
  assert.equal((await h.base.collection('receipts').get()).size, receipts);
});

test('a human Hack with a bot keeps the private partner and full canonical minute without a fabricated bot conversation', async () => {
  const h = await harness({ humanSeats: ['seat-1'] }); await h.set(6); op(await h.service.startMatch(h.host.uid, h.request()));
  const turn = await h.state(), human = h.humans[0];
  assert.equal(turn.activeSeatId, 'seat-1');
  const request = { protocolVersion: 2, matchId: h.base.id, phaseId: turn.phase.id, commandId: randomUUID(), command: { type: 'REQUEST_HACK', targetSeatId: 'seat-3' } };
  const response = await h.service.submit(human.uid, request); assert.equal(response.receipt.status, 'accepted');
  assert.equal((await h.state()).phase.kind, 'ORDINARY_TURN');
  const deadline = createV1DeadlineHandler(h.service);
  h.setTime(turn.phase.endsAt);
  await deadline({ matchId: h.base.id, phaseId: turn.phase.id, deadlineToken: turn.deadlineToken });
  const hack = await h.state(); assert.equal(hack.phase.kind, 'HACK');
  assert.equal(hack.phase.endsAt - hack.phase.startedAt, 60_000);
  const own = FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(human.uid).get()).data());
  assert.equal(own.hackPartnerSeatId, 'seat-3');
  assert.equal(projectFullGame(hack).players['seat-3'].hackPartnerSeatId, 'seat-1');
  const botCommands = (await h.base.collection('events').get()).docs.map(doc => doc.data()).filter(record => record.controller === 'bot');
  assert.ok(botCommands.every(record => record.request.command.type === 'MOVE'), 'Only canonical public movement can occur during this Hack; no reply or requested conversation is manufactured');
  assert.deepEqual((await h.base.collection('playerViews').get()).docs.map(doc => doc.id), [human.uid]);
  await deadline({ matchId: h.base.id, phaseId: turn.phase.id, deadlineToken: turn.deadlineToken });
  assert.deepEqual(await h.state(), hack, 'A stale ordinary deadline cannot end the Hack early');
  h.setTime(hack.phase.endsAt);
  await deadline({ matchId: h.base.id, phaseId: hack.phase.id, deadlineToken: hack.deadlineToken });
  const next = await h.state(); assert.equal(next.phase.kind, 'ORDINARY_TURN'); assert.equal(next.activeSeatId, 'seat-2');
  assert.equal(next.phase.startedAt, hack.phase.endsAt); assert.equal(next.phase.endsAt - next.phase.startedAt, 60_000);
});

async function assertPersistedReplay(h) {
  const records = (await h.base.collection('events').orderBy('sequence').get()).docs.map(doc => doc.data());
  assert.deepEqual(records.map(record => record.sequence), Array.from({ length: records.length }, (_, index) => index + 1));
  let replay;
  for (const record of records) {
    if (record.kind === 'SETUP') replay = createFullGame({ ...record, setup: decodeV1Setup(record.setup) });
    else if (record.kind === 'COMMAND') { const evaluated = executeFullGame(replay, record.actorSeatId, record.request, record); assert.deepEqual(evaluated.receipt, record.receipt); replay = evaluated.state; }
    else if (record.kind === 'DEADLINE') { const evaluated = advanceFullGame(replay, record); assert.equal(evaluated.advanced, true); replay = evaluated.state; }
    else if (record.kind === 'ABORT') replay = abortFullGame(replay, record);
    else assert.fail('Unknown journal operation');
    replay = { ...replay, journalSequence: record.sequence };
  }
  assert.deepEqual(replay, await h.state());
  assert.deepEqual(projectFullGame(replay).public, (await h.base.collection('views').doc('public').get()).data());
  return records;
}

for (const playerCount of [7, 8, 9]) test(`${playerCount}-seat all-bot practice finishes through persisted commands and canonical deadlines with exact replay`, async () => {
  const h = await harness({ playerCount }); await h.set(playerCount); op(await h.service.startMatch(h.host.uid, h.request()));
  let state = await h.state(), phases = 0;
  // Synthetic server time advances only to canonical deadlines. No direct state edit,
  // policy stand-in, hidden role override or automatic phase closure is used.
  while (state.phase.endsAt !== null) {
    assert.ok(phases++ < 120, 'Bounded canonical phase count');
    let finishedWorker = false;
    for (let invocation = 0; invocation < 8; invocation++) {
      const before = await h.state(), result = await h.service.runPracticeBots(h.base.id, { limit: 18 });
      assert.ok(['advanced', 'unchanged'].includes(result.status), 'The real persisted worker must remain available');
      state = await h.state();
      if (result.status === 'unchanged') {
        assert.equal(result.processed, 0); assert.deepEqual(state, before);
        finishedWorker = true; break;
      }
      assert.ok(result.processed > 0 && result.processed <= 18);
      assert.equal(state.journalSequence - before.journalSequence, result.processed, 'Every worker step must commit a distinct real journal decision');
      assert.notDeepEqual(state, before, 'An advanced result cannot be an unchanged-state loop');
      if (state.phase.endsAt === null) { finishedWorker = true; break; }
    }
    assert.ok(finishedWorker, 'Each phase worker is bounded and eventually reconciles its durable command slots');
    if (state.phase.endsAt === null) break;
    const due = { matchId: h.base.id, phaseId: state.phase.id, deadlineToken: state.deadlineToken }, closedPhase = state.phase.id;
    h.setTime(state.phase.endsAt);
    const advanced = await h.service.runDeadline(due); assert.equal(advanced.result, 'advanced');
    state = await h.state(); assert.notEqual(state.phase.id, closedPhase, 'A due canonical deadline must progress');
  }
  assert.equal(state.phase.kind, 'FINISHED'); assert.notEqual(state.result, null);
  assert.equal((await h.base.collection('control').doc('session').get()).get('status'), 'complete');
  const publicView = FullPublicViewSchema.parse((await h.base.collection('views').doc('public').get()).data());
  assert.notEqual(publicView.endReveal, null);
  const records = await assertPersistedReplay(h), commands = records.filter(record => record.kind === 'COMMAND');
  assert.ok(commands.length > 0); assert.ok(records.some(record => record.kind === 'DEADLINE'));
  assert.ok(commands.every(record => record.controller === 'bot' && record.policyVersion === 'practice-1' && !Object.hasOwn(record, 'verifiedUid')));
  assert.equal(new Set(commands.map(record => record.actorSeatId + '/' + record.request.commandId)).size, commands.length);
  assert.equal((await h.base.collection('receipts').get()).size, commands.length);
  for (const collection of ['playerViews', 'ownAcknowledgments', 'seatSessions']) assert.equal((await h.base.collection(collection).get()).size, 0);
  assert.deepEqual((await h.base.collection('members').get()).docs.map(doc => doc.id).sort(), [h.host.uid, h.display.uid].sort());
  assert.deepEqual(await h.service.runPracticeBots(h.base.id, { limit: 18 }), { status: 'unchanged', processed: 0 });
});
