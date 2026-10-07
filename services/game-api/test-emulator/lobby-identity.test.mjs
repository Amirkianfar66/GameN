import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import {
  FullLobbyIdentityDocumentSchema, FullSetLobbyIdentityResponseSchema, FullOperationResponseSchema,
  FullPublicViewSchema, FullPlayerViewSchema,
} from '@mothership/contracts';
import { createV1Service } from '../dist/index.js';
import { decodeV1State } from '../dist/full-game.js';
import { createV1HttpHandler } from '../../../infra/firebase/dist/v1.js';
import { encodeFirestoreValue } from '../../../infra/firebase/test/helpers.mjs';

// This suite supports either CI's existing guarded demo or its own fresh Auth/Firestore instance.
const projectId = process.env.MOTHERSHIP_IDENTITY_TEST_PROJECT ?? 'demo-mothership';
const loopback = /^(?:127\.0\.0\.1|localhost):([0-9]{1,5})$/;
let app, db, serial = 0;
before(() => {
  assert.ok(['demo-mothership', 'demo-mothership-identities'].includes(projectId));
  for (const key of ['FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST']) {
    const port = Number(process.env[key]?.match(loopback)?.[1]);
    assert.ok(port > 0 && port < 65536, 'Only explicit loopback emulators are permitted');
  }
  assert.ok(process.env.GCLOUD_PROJECT === undefined || process.env.GCLOUD_PROJECT === projectId);
  app = initializeApp({ projectId }, 'identity-' + randomUUID()); db = getFirestore(app);
});
after(async () => { await db?.terminate(); if (app) await deleteApp(app); });
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const op = value => { FullOperationResponseSchema.parse(value); assert.equal(value.ok, true); return value.result; };
const ack = value => { FullSetLobbyIdentityResponseSchema.parse(value); assert.equal(value.ok, true); return value; };
const error = (value, code) => { FullSetLobbyIdentityResponseSchema.parse(value); assert.equal(value.error?.code, code); };
async function auth() {
  const response = await fetch('http://' + process.env.FIREBASE_AUTH_EMULATOR_HOST + '/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-only', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }),
  });
  assert.equal(response.status, 200); const data = await response.json(); return { uid: data.localId, idToken: data.idToken };
}
async function read(h, identity, suffix = 'identities/public', { method = 'GET', data } = {}) {
  return fetch('http://' + process.env.FIRESTORE_EMULATOR_HOST + '/v1/projects/' + projectId + '/databases/(default)/documents/' + h.base.path + '/' + suffix, {
    method, headers: { 'content-type': 'application/json', ...(identity ? { authorization: 'Bearer ' + identity.idToken } : {}) },
    ...(data === undefined ? {} : { body: JSON.stringify({ fields: encodeFirestoreValue(data).mapValue.fields }) }),
  });
}
async function harness({ seats = 7 } = {}) {
  const now = 2_000_000_000_000 + ++serial * 100_000_000;
  const service = createV1Service({ db, clock: () => now, shuffle: items => [...items] });
  const [host, display, outsider, ...players] = await Promise.all(Array.from({ length: 10 }, () => auth()));
  const created = op(await service.createMatch(host.uid, { protocolVersion: 2, requestId: randomUUID(), playerCount: 7 }));
  const base = db.collection('matches').doc(created.matchId);
  const request = fields => ({ protocolVersion: 2, matchId: base.id, requestId: randomUUID(), ...fields });
  for (let i = 0; i < seats; i++) {
    const admission = op(await service.requestAdmission(players[i].uid, { protocolVersion: 2, requestId: randomUUID(), roomCode: created.roomCode, initialRoom: 'Room A' }));
    op(await service.approveAdmission(host.uid, request({ admissionId: admission.admissionId, seatId: 'seat-' + (i + 1) })));
  }
  op(await service.admitDisplay(host.uid, request({ displayUid: display.uid })));
  const identity = (displayName = 'Player One', characterId = 'c1', requestId = randomUUID()) =>
    ({ schemaVersion: 1, protocolVersion: 2, matchId: base.id, requestId, displayName, characterId });
  const document = async () => FullLobbyIdentityDocumentSchema.parse((await base.collection('identities').doc('public').get()).data());
  const state = async () => decodeV1State((await base.collection('engine').doc('current').get()).data());
  return { service, base, host, display, outsider, players, request, identity, document, state, now };
}

test('new admitted seats have null identity; public reads require admitted reverse binding; direct writes/lists denied', async () => {
  const h = await harness();
  const value = await h.document(); assert.equal(value.revision, 7); assert.equal(value.locked, false);
  assert.deepEqual(value.seats, h.players.map((_, i) => ({ seatId: 'seat-' + (i + 1), displayName: null, characterId: null })));
  for (const identity of [h.host, h.display, ...h.players]) assert.equal((await read(h, identity)).status, 200);
  for (const identity of [undefined, h.outsider]) assert.equal((await read(h, identity)).status, 403);
  for (const identity of [h.host, h.display, h.players[0]]) {
    assert.equal((await read(h, identity, 'identities/public', { method: 'PATCH', data: value })).status, 403);
    assert.equal((await read(h, identity, 'identities')).status, 403);
  }
  await h.base.collection('seats').doc('seat-1').update({ bindingRevision: 2 });
  assert.equal((await read(h, h.players[0])).status, 403);
  error(await h.service.setLobbyIdentity(h.players[0].uid, h.identity()), 'FORBIDDEN');
});

test('only the current player sets own identity; host/display/outsider cannot select a seat', async () => {
  const h = await harness();
  for (const user of [h.host, h.display, h.outsider]) error(await h.service.setLobbyIdentity(user.uid, h.identity()), 'FORBIDDEN');
  error(await h.service.setLobbyIdentity(h.players[0].uid, { ...h.identity(), seatId: 'seat-2' }), 'INVALID_REQUEST');
  ack(await h.service.setLobbyIdentity(h.players[0].uid, h.identity('Supplier')));
  const value = await h.document();
  assert.deepEqual(value.seats[0], { seatId: 'seat-1', displayName: 'Supplier', characterId: 'c1' });
  assert.equal(value.seats[1].characterId, null);
  assert.equal((await h.base.collection('engine').doc('current').get()).exists, false);
});

test('concurrent claims serialize; durable refusal/replay/conflict and released-character new intent are deterministic', async () => {
  const h = await harness();
  const requests = [h.identity('First', 'c1'), h.identity('Second', 'c1')];
  const replies = await Promise.all(requests.map((body, i) => h.service.setLobbyIdentity(h.players[i].uid, body)));
  assert.equal(replies.filter(result => result.ok).length, 1);
  const winner = replies.findIndex(result => result.ok), loser = 1 - winner;
  error(replies[loser], 'CHARACTER_TAKEN');
  const first = ack(replies[winner]);
  const before = await h.document();
  assert.equal(before.seats.filter(entry => entry.characterId === 'c1').length, 1);
  assert.deepEqual(ack(await h.service.setLobbyIdentity(h.players[winner].uid, requests[winner])), first);
  error(await h.service.setLobbyIdentity(h.players[winner].uid, { ...requests[winner], displayName: 'Changed' }), 'REQUEST_ID_CONFLICT');
  ack(await h.service.setLobbyIdentity(h.players[winner].uid, h.identity('Winner', 'c2')));
  error(await h.service.setLobbyIdentity(h.players[loser].uid, requests[loser]), 'CHARACTER_TAKEN');
  ack(await h.service.setLobbyIdentity(h.players[loser].uid, { ...requests[loser], requestId: randomUUID() }));
  const revision = (await h.document()).revision;
  ack(await h.service.setLobbyIdentity(h.players[loser].uid, { ...requests[loser], requestId: randomUUID() }));
  assert.equal((await h.document()).revision, revision, 'same public identity does not increment revision');
});

test('start locks selected/unselected identities; replay succeeds after freeze without touching engine or public game view', async () => {
  const h = await harness(), body = h.identity('Officer', 'c9');
  const selected = ack(await h.service.setLobbyIdentity(h.players[0].uid, body));
  const before = await h.document();
  op(await h.service.startMatch(h.host.uid, h.request()));
  const locked = await h.document();
  assert.equal(locked.locked, true); assert.equal(locked.revision, before.revision + 1);
  assert.equal(locked.seats[1].displayName, null, 'unselected seats retain numbered fallback');
  const engineBefore = (await h.base.collection('engine').doc('current').get()).data();
  const publicBefore = (await h.base.collection('views').doc('public').get()).data();
  assert.deepEqual(ack(await h.service.setLobbyIdentity(h.players[0].uid, body)), selected);
  error(await h.service.setLobbyIdentity(h.players[0].uid, h.identity('Other', 'c8')), 'IDENTITY_LOCKED');
  assert.deepEqual((await h.base.collection('engine').doc('current').get()).data(), engineBefore);
  assert.deepEqual((await h.base.collection('views').doc('public').get()).data(), publicBefore);
  const state = await h.state();
  assert.deepEqual(state.setup.roleOrder, ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien']);
  assert.equal(Object.hasOwn(state.setup, 'characterId'), false);
  const command = { protocolVersion: 2, matchId: h.base.id, phaseId: state.phase.id, commandId: randomUUID(), command: { type: 'MOVE', destination: 'Room B' } };
  const result = await h.service.submit(h.players[0].uid, command); assert.equal(result.receipt.status, 'accepted');
  FullPublicViewSchema.parse((await h.base.collection('views').doc('public').get()).data());
  FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(h.players[0].uid).get()).data());
  assert.deepEqual(await h.document(), locked, 'gameplay never updates public identity metadata');
});

test('seat recovery preserves identity, removes old read/replay authority and lets only the replacement edit an unlocked seat', async () => {
  const h = await harness(), body = h.identity();
  ack(await h.service.setLobbyIdentity(h.players[0].uid, body));
  const before = await h.document(), replacement = await auth();
  const grant = op(await h.service.issueSeatRecovery(h.host.uid, h.request({ seatId: 'seat-1' })));
  op(await h.service.redeemSeatRecovery(replacement.uid, h.request({ recoveryToken: grant.recoveryToken })));
  assert.deepEqual(await h.document(), before);
  assert.equal((await read(h, h.players[0])).status, 403); assert.equal((await read(h, replacement)).status, 200);
  error(await h.service.setLobbyIdentity(h.players[0].uid, body), 'FORBIDDEN');
  ack(await h.service.setLobbyIdentity(replacement.uid, h.identity('Recovered', 'c3')));
  op(await h.service.startMatch(h.host.uid, h.request()));
  const locked = await h.document(), second = await auth();
  const nextGrant = op(await h.service.issueSeatRecovery(h.host.uid, h.request({ seatId: 'seat-1' })));
  op(await h.service.redeemSeatRecovery(second.uid, h.request({ recoveryToken: nextGrant.recoveryToken })));
  assert.deepEqual(await h.document(), locked);
  error(await h.service.setLobbyIdentity(second.uid, h.identity()), 'IDENTITY_LOCKED');
  assert.equal((await h.state()).seats[0].role, 'Insider');
});

test('old missing document is readable as absence; running matches remain missing; old lobby can create the separate record', async () => {
  const h = await harness();
  await h.base.collection('identities').doc('public').delete();
  assert.equal((await read(h, h.players[0])).status, 404);
  op(await h.service.startMatch(h.host.uid, h.request()));
  assert.equal((await h.base.collection('identities').doc('public').get()).exists, false);
  error(await h.service.setLobbyIdentity(h.players[0].uid, h.identity()), 'IDENTITY_LOCKED');
  assert.equal((await h.base.collection('identities').doc('public').get()).exists, false);
  const lobby = await harness();
  await lobby.base.collection('identities').doc('public').delete();
  ack(await lobby.service.setLobbyIdentity(lobby.players[0].uid, lobby.identity()));
  const value = await lobby.document(); assert.equal(value.revision, 1); assert.equal(value.seats.length, 7);
  assert.equal(value.seats[1].displayName, null);
});

test('lobby abort locks the record without a deal; persisted acknowledgments survive service restart', async () => {
  const h = await harness(), body = h.identity();
  const first = ack(await h.service.setLobbyIdentity(h.players[0].uid, body)), before = await h.document();
  op(await h.service.abortMatch(h.host.uid, h.request()));
  const value = await h.document(); assert.equal(value.locked, true); assert.equal(value.revision, before.revision + 1);
  assert.equal((await h.base.collection('engine').doc('current').get()).exists, false);
  const restarted = createV1Service({ db, clock: () => h.now });
  assert.deepEqual(ack(await restarted.setLobbyIdentity(h.players[0].uid, body)), first);
  error(await restarted.setLobbyIdentity(h.players[0].uid, h.identity('AfterAbort', 'c2')), 'IDENTITY_LOCKED');
});

test('identity setter has bounded per-UID rate delay and does not persist transient refusal', async () => {
  const h = await harness(), uid = h.players[0].uid, body = h.identity();
  await db.collection('requestLimits').doc(hash([uid, 'setLobbyIdentity'])).set({ windowStartedAt: h.now, count: 120 });
  const response = await h.service.setLobbyIdentity(uid, body); error(response, 'RATE_LIMITED');
  assert.equal(response.error.retryAfterMs, 60_000);
  assert.equal((await db.collection('lobbyIdentityOperations').doc(hash([uid, body.requestId])).get()).exists, false);
});

test('real emulator Auth passes through the normal HTTP adapter to the persisted identity service', async () => {
  const h = await harness();
  const handler = createV1HttpHandler('setLobbyIdentity', { service: h.service, configuration: {
    projectId, emulator: true, allowedOrigins: ['http://localhost:5173'], assetManifestVersion: '0.0.0-no-assets',
  }, verifyIdToken: token => getAuth(app).verifyIdToken(token, true), verifyAppCheckToken: async () => assert.fail('local handler must not call production App Check') });
  async function invoke(identity) {
    const capture = {};
    const response = { set() { return this; }, status(value) { capture.status = value; return this; }, json(value) { capture.body = value; return this; } };
    await handler({ method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:5173', ...(identity ? { authorization: 'Bearer ' + identity.idToken } : {}) }, body: h.identity() }, response);
    FullSetLobbyIdentityResponseSchema.parse(capture.body); return capture;
  }
  assert.equal((await invoke()).status, 401);
  assert.equal((await invoke(h.display)).status, 403);
  const response = await invoke(h.players[0]); assert.equal(response.status, 200); ack(response.body);
});

test('concurrent start and selection freeze one serializable outcome before roles become visible', async () => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const h = await harness(), body = h.identity('BeforeDeal', 'c4');
    const [selected, started] = await Promise.all([
      h.service.setLobbyIdentity(h.players[0].uid, body), h.service.startMatch(h.host.uid, h.request()),
    ]);
    op(started); FullSetLobbyIdentityResponseSchema.parse(selected);
    const value = await h.document(); assert.equal(value.locked, true);
    if (selected.ok) assert.deepEqual(value.seats[0], { seatId: 'seat-1', displayName: 'BeforeDeal', characterId: 'c4' });
    else { error(selected, 'IDENTITY_LOCKED'); assert.equal(value.seats[0].characterId, null); }
    error(await h.service.setLobbyIdentity(h.players[0].uid, h.identity('AfterDeal', 'c5')), 'IDENTITY_LOCKED');
    assert.equal((await h.state()).seats[0].role, 'Insider');
  }
});

test('new lobbies expose an empty revision-zero record without requiring a player selection', async () => {
  const h = await harness({ seats: 0 });
  assert.deepEqual(await h.document(), { schemaVersion: 1, protocolVersion: 2, catalogVersion: 'crew-0.1.0', matchId: h.base.id, revision: 0, locked: false, seats: [] });
  assert.equal((await read(h, h.host)).status, 200);
  error(await h.service.setLobbyIdentity(h.players[0].uid, h.identity()), 'FORBIDDEN');
});
