import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  FullBeginSetupResponseSchema, FullConfirmSetupChoiceResponseSchema, FullReadyForMatchResponseSchema,
  FullSetupDocumentSchema, FullSetupPlayerViewSchema, FullOperationResponseSchema, FullFailureSchema,
  FullLobbyIdentityDocumentSchema, FullSetLobbyIdentityResponseSchema, FullSetPracticeBotsResponseSchema,
  FullPublicViewSchema, FullPlayerViewSchema, FullReceiptSchema, OwnAcknowledgmentsSchema, FullAdvanceResponseSchema,
} from '@mothership/contracts';
import { createFullGame, projectFullGame, projectOwnAcknowledgments } from '@mothership/engine';
import { createV1Service } from '../../../services/game-api/dist/index.js';
import { decodeV1State, decodeV1Setup, encodeV1State } from '../../../services/game-api/dist/full-game.js';
import { encodeFirestoreValue } from '../test/helpers.mjs';

// SDK initialization is allowed only after explicit demo-project and loopback guards.
const projectId = process.env.MOTHERSHIP_SETUP_TEST_PROJECT ?? 'demo-mothership';
const loopback = /^(?:127\.0\.0\.1|localhost):([0-9]{1,5})$/;
let app, db, serial = 0;
before(() => {
  assert.ok(['demo-mothership', 'demo-mothership-staged-start'].includes(projectId));
  for (const key of ['FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST']) {
    const port = Number(process.env[key]?.match(loopback)?.[1]);
    assert.ok(port > 0 && port < 65536, 'Only explicit loopback emulators are permitted');
  }
  assert.ok(process.env.GCLOUD_PROJECT === undefined || process.env.GCLOUD_PROJECT === projectId);
  app = initializeApp({ projectId }, 'staged-start-' + randomUUID()); db = getFirestore(app);
});
after(async () => { await db?.terminate(); if (app) await deleteApp(app); });
const responseSchemas = { beginSetup: FullBeginSetupResponseSchema, confirmSetupChoice: FullConfirmSetupChoiceResponseSchema, readyForMatch: FullReadyForMatchResponseSchema, abortMatch: FullOperationResponseSchema, redeemSeatRecovery: FullOperationResponseSchema };
const op = value => { FullOperationResponseSchema.parse(value); assert.equal(value.ok, true); return value.result; };
const fail = (value, code) => { FullFailureSchema.parse(value); assert.equal(value.error?.code, code); };
const ack = (operation, value, body) => {
  responseSchemas[operation].parse(value); assert.equal(value.ok, true);
  if (body) { assert.equal(value.matchId, body.matchId); assert.equal(value.requestId, body.requestId); if (body.bindingRevision !== undefined) assert.equal(value.bindingRevision, body.bindingRevision); }
  return value;
};
const refused = (operation, value, code) => { responseSchemas[operation].parse(value); assert.equal(value.error?.code, code); };
async function settled(operation, invoke, initial) {
  let value = initial ?? await invoke(); responseSchemas[operation].parse(value);
  for (let retry = 0; value.error?.code === 'UNAVAILABLE' && retry < 2; retry++) {
    value = await invoke(); responseSchemas[operation].parse(value);
  }
  assert.notEqual(value.error?.code, 'UNAVAILABLE', 'Reconcile the same request after contention; never create a new intent');
  return value;
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
async function harness({ playerCount = 7, humanCount = playerCount, admittedCount = humanCount, shuffle = items => [...items] } = {}) {
  let now = 2_000_000_000_000 + ++serial * 100_000_000;
  const service = createV1Service({ db, clock: () => now, shuffle });
  const [host, display, outsider, ...players] = await Promise.all(Array.from({ length: humanCount + 3 }, () => auth()));
  const created = op(await service.createMatch(host.uid, { protocolVersion: 2, requestId: randomUUID(), playerCount }));
  const base = db.collection('matches').doc(created.matchId);
  const request = fields => ({ protocolVersion: 2, matchId: base.id, requestId: randomUUID(), ...fields });
  const setupRequest = fields => ({ schemaVersion: 1, ...request(fields) });
  for (let i = 0; i < admittedCount; i++) {
    const pending = op(await service.requestAdmission(players[i].uid, { protocolVersion: 2, requestId: randomUUID(), roomCode: created.roomCode, initialRoom: i % 2 ? 'Room B' : 'Room A' }));
    op(await service.approveAdmission(host.uid, request({ admissionId: pending.admissionId, seatId: 'seat-' + (i + 1) })));
  }
  op(await service.admitDisplay(host.uid, request({ displayUid: display.uid })));
  if (humanCount < playerCount) {
    const configured = FullSetPracticeBotsResponseSchema.parse(await service.setPracticeBots(host.uid, setupRequest({ botCount: playerCount - humanCount })));
    assert.equal(configured.ok, true);
  }
  const initialIdentities = FullLobbyIdentityDocumentSchema.parse((await base.collection('identities').doc('public').get()).data());
  const occupiedCharacters = new Set(initialIdentities.seats.map(seat => seat.characterId));
  const humanCharacters = Array.from({ length: 9 }, (_, index) => 'c' + (index + 1)).filter(id => !occupiedCharacters.has(id));
  assert.ok(humanCharacters.length >= humanCount, 'Every human must have an actually free character after bot allocation');
  const document = async () => FullSetupDocumentSchema.parse((await base.collection('setup').doc('public').get()).data());
  const identities = async () => FullLobbyIdentityDocumentSchema.parse((await base.collection('identities').doc('public').get()).data());
  const state = async () => decodeV1State((await base.collection('engine').doc('current').get()).data());
  const choice = (index, fields = {}) => setupRequest({ bindingRevision: 1, displayName: 'Crew ' + (index + 1), characterId: humanCharacters[index], ...fields });
  const begin = async () => { const body = setupRequest(); return ack('beginSetup', await service.beginSetup(host.uid, body), body); };
  const confirm = async (index, body = choice(index)) => { const response = ack('confirmSetupChoice', await service.confirmSetupChoice(players[index].uid, body), body); assert.equal(response.seatId, 'seat-' + (index + 1)); return response; };
  const readyBody = async (fields = {}) => setupRequest({ bindingRevision: 1, dealId: (await document()).dealId, ...fields });
  const ready = async (index, body) => { body ??= await readyBody(); const response = ack('readyForMatch', await service.readyForMatch(players[index].uid, body), body); assert.equal(response.seatId, 'seat-' + (index + 1)); assert.equal(response.dealId, body.dealId); return response; };
  const prepare = async () => { await begin(); for (let i = 0; i < humanCount; i++) await confirm(i); };
  return { service, base, host, display, outsider, players, request, setupRequest, document, identities, state, choice, begin, confirm, readyBody, ready, prepare, now: () => now, setTime: value => { now = value; } };
}
async function noGameplay(h) {
  assert.equal((await h.base.collection('engine').doc('current').get()).exists, false);
  assert.equal((await h.base.collection('views').doc('public').get()).exists, false);
  for (const name of ['playerViews', 'ownAcknowledgments', 'outbox', 'events', 'receipts']) assert.equal((await h.base.collection(name).get()).size, 0, name + ' must not contain gameplay before final Ready');
}
async function snapshot(ref) {
  const value = await ref.get(); return { exists: value.exists, data: value.data() ?? null, updateTime: value.updateTime?.toMillis() ?? null };
}
async function privateView(h, uid) { return FullSetupPlayerViewSchema.parse((await h.base.collection('setupPlayerViews').doc(uid).get()).data()); }
async function launchEvidence(h) {
  const current = await h.state(), journal = (await h.base.collection('events').where('kind', '==', 'SETUP').get()).docs;
  assert.equal(journal.length, 1); assert.equal((await h.base.collection('outbox').get()).size, 1);
  assert.deepEqual(current.setup, decodeV1Setup(journal[0].get('setup')));
  assert.deepEqual(current.setup, decodeV1Setup((await h.base.collection('setup').doc('deal').get()).get('setup')));
  assert.equal(current.phase.id, journal[0].get('phaseId')); assert.equal(current.phase.startedAt, journal[0].get('now'));
  assert.equal(current.phase.endsAt - current.phase.startedAt, 60_000);
  assert.equal((await h.document()).stage, 'running');
  assert.equal((await h.base.collection('setupPlayerViews').get()).size, 0);
  return current;
}

for (const playerCount of [7, 8, 9]) test(`${playerCount} humans reconfirm choices, receive one private deal, and launch only at final Ready`, async () => {
  const h = await harness({ playerCount });
  const beforeRooms = (await h.base.collection('lobby').doc('public').get()).get('seats');
  await h.begin(); let document = await h.document();
  assert.equal(document.stage, 'choosing'); assert.equal(document.dealId, null);
  assert.ok(document.seats.every(seat => !seat.confirmed && !seat.ready)); await noGameplay(h);
  for (let i = 0; i < playerCount; i++) { await h.confirm(i); await noGameplay(h); }
  document = await h.document(); assert.equal(document.stage, 'awaiting-ready'); assert.ok(document.dealId);
  const deal = await snapshot(h.base.collection('setup').doc('deal'));
  for (let i = 0; i < playerCount; i++) {
    const own = await privateView(h, h.players[i].uid);
    assert.equal(own.self.seatId, 'seat-' + (i + 1)); assert.equal(own.dealId, document.dealId); assert.equal(own.bindingRevision, 1);
    assert.deepEqual(Object.keys(own.self).sort(), ['role', 'seatId']);
  }
  h.setTime(h.now() + 180_000);
  for (let i = 0; i < playerCount - 1; i++) {
    await h.ready(i); await noGameplay(h);
    assert.equal((await h.base.collection('setupPlayerViews').doc(h.players[i].uid).get()).exists, false);
  }
  const finalBody = await h.readyBody(); await h.ready(playerCount - 1, finalBody);
  const state = await launchEvidence(h); assert.equal(state.phase.startedAt, h.now());
  assert.deepEqual(await snapshot(h.base.collection('setup').doc('deal')), deal);
  assert.deepEqual(state.setup.initialRooms, Object.fromEntries(beforeRooms.map(seat => [seat.seatId, seat.initialRoom])));
  const projections = projectFullGame(state);
  for (let i = 0; i < playerCount; i++) {
    const own = FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(h.players[i].uid).get()).data());
    assert.deepEqual(own, projections.players['seat-' + (i + 1)]);
    OwnAcknowledgmentsSchema.parse((await h.base.collection('ownAcknowledgments').doc(h.players[i].uid).get()).data());
  }
});

test('begin requires host and a complete coherent roster; fresh legacy start cannot bypass staged startup', async () => {
  const h = await harness({ admittedCount: 6 }); const body = h.setupRequest();
  for (const identity of [h.display, h.outsider, h.players[0]]) refused('beginSetup', await h.service.beginSetup(identity.uid, body), 'FORBIDDEN');
  refused('beginSetup', await h.service.beginSetup('', body), 'UNAUTHENTICATED');
  refused('beginSetup', await h.service.beginSetup(h.host.uid, body), 'ROSTER_INCOMPLETE');
  fail(await h.service.startMatch(h.host.uid, h.request()), 'FORBIDDEN');
  const draft = FullSetLobbyIdentityResponseSchema.parse(await h.service.setLobbyIdentity(h.players[0].uid, h.setupRequest({ displayName: 'Early', characterId: 'c1' })));
  assert.equal(draft.error?.code, 'IDENTITY_LOCKED'); await noGameplay(h);
  const pending = op(await h.service.requestAdmission(h.players[6].uid, { protocolVersion: 2, requestId: randomUUID(), roomCode: (await h.base.collection('control').doc('session').get()).get('roomCode'), initialRoom: 'Room B' }));
  op(await h.service.approveAdmission(h.host.uid, h.request({ admissionId: pending.admissionId, seatId: 'seat-7' })));
  await h.begin(); fail(await h.service.startMatch(h.host.uid, h.request()), 'FORBIDDEN'); await noGameplay(h);
});

test('legacy draft choices require confirmation; edits reset only the affected confirmation and exact claims stay unique', async () => {
  const h = await harness();
  // Explicit synthetic pre-deployment lobby: old public suggestions are not confirmations.
  const identity = await h.identities(), { lifecycleVersion: _lifecycle, gameStarted: _started, ...legacyControl } = (await h.base.collection('control').doc('session').get()).data();
  const legacy = db.batch(); legacy.set(h.base.collection('control').doc('session'), legacyControl); legacy.delete(h.base.collection('setup').doc('public'));
  legacy.set(h.base.collection('identities').doc('public'), FullLobbyIdentityDocumentSchema.parse({ ...identity, revision: identity.revision + 1,
    seats: identity.seats.map((seat, index) => ({ ...seat, displayName: 'Legacy ' + (index + 1), characterId: 'c' + (index + 1) })) }));
  await legacy.commit();
  await h.begin(); assert.ok((await h.document()).seats.every(seat => !seat.confirmed));
  const body = h.choice(0, { displayName: 'Supplier' }); await h.confirm(0, body);
  const selected = FullSetLobbyIdentityResponseSchema.parse(await h.service.setLobbyIdentity(h.players[0].uid, h.setupRequest({ displayName: 'Undercover', characterId: 'c1' })));
  assert.equal(selected.ok, true); assert.equal((await h.document()).seats[0].confirmed, false);
  ack('confirmSetupChoice', await h.service.confirmSetupChoice(h.players[0].uid, body));
  assert.equal((await h.document()).seats[0].confirmed, false, 'A cached acknowledgment cannot reconfirm an edited draft');
  await h.confirm(0, h.choice(0, { displayName: 'Undercover' }));
  refused('confirmSetupChoice', await h.service.confirmSetupChoice(h.players[1].uid, h.choice(1, { displayName: 'Undercover' })), 'NAME_TAKEN');
  refused('confirmSetupChoice', await h.service.confirmSetupChoice(h.players[1].uid, h.choice(1, { characterId: 'c1' })), 'CHARACTER_TAKEN');
  assert.equal((await h.document()).seats[0].confirmed, true); assert.equal((await h.document()).seats[1].confirmed, false); await noGameplay(h);
});

test('concurrent confirmation claims serialize unique characters and names with immutable retry intents', async () => {
  for (const conflict of ['CHARACTER_TAKEN', 'NAME_TAKEN']) {
    const h = await harness(); await h.begin();
    const bodies = conflict === 'CHARACTER_TAKEN'
      ? [h.choice(0, { displayName: 'Claim A', characterId: 'c8' }), h.choice(1, { displayName: 'Claim B', characterId: 'c8' })]
      : [h.choice(0, { displayName: 'Shared' }), h.choice(1, { displayName: 'Shared' })];
    const initial = await Promise.all(bodies.map((body, index) => h.service.confirmSetupChoice(h.players[index].uid, body)));
    initial.forEach(value => FullConfirmSetupChoiceResponseSchema.parse(value));
    assert.ok(!initial.every(value => value.ok), 'Unique public claims cannot both commit');
    const responses = [];
    for (let i = 0; i < bodies.length; i++) responses.push(await settled('confirmSetupChoice', () => h.service.confirmSetupChoice(h.players[i].uid, bodies[i]), initial[i]));
    assert.equal(responses.filter(value => value.ok).length, 1);
    const winner = responses.findIndex(value => value.ok), loser = 1 - winner;
    ack('confirmSetupChoice', responses[winner]); refused('confirmSetupChoice', responses[loser], conflict);
    const identities = await h.identities(), field = conflict === 'CHARACTER_TAKEN' ? 'characterId' : 'displayName';
    assert.equal(identities.seats.filter(seat => seat[field] === bodies[winner][field]).length, 1);
    assert.equal((await h.document()).seats.filter(seat => seat.confirmed).length, 1); await noGameplay(h);
  }
});

test('setup requests enforce strict versions, current binding, stage and immutable request digests', async () => {
  const h = await harness(); const body = h.setupRequest();
  refused('beginSetup', await h.service.beginSetup(h.host.uid, { ...body, protocolVersion: 3 }), 'UNSUPPORTED_PROTOCOL');
  refused('beginSetup', await h.service.beginSetup(h.host.uid, { ...body, schemaVersion: 2 }), 'UNSUPPORTED_SCHEMA');
  refused('beginSetup', await h.service.beginSetup(h.host.uid, { ...body, seatId: 'seat-1' }), 'INVALID_REQUEST');
  refused('confirmSetupChoice', await h.service.confirmSetupChoice(h.players[0].uid, h.choice(0)), 'SETUP_LOCKED');
  refused('confirmSetupChoice', await h.service.confirmSetupChoice(h.players[0].uid, h.choice(0, { seatId: 'seat-2' })), 'INVALID_REQUEST');
  const first = ack('beginSetup', await h.service.beginSetup(h.host.uid, body));
  assert.deepEqual(ack('beginSetup', await h.service.beginSetup(h.host.uid, body)), first);
  const choice = h.choice(0), confirmed = ack('confirmSetupChoice', await h.service.confirmSetupChoice(h.players[0].uid, choice));
  assert.deepEqual(ack('confirmSetupChoice', await h.service.confirmSetupChoice(h.players[0].uid, choice)), confirmed);
  refused('confirmSetupChoice', await h.service.confirmSetupChoice(h.players[0].uid, { ...choice, displayName: 'Changed' }), 'REQUEST_ID_CONFLICT');
  refused('confirmSetupChoice', await h.service.confirmSetupChoice(h.players[1].uid, h.choice(1, { bindingRevision: 2 })), 'STALE_BINDING');
  for (let i = 1; i < h.players.length; i++) await h.confirm(i);
  const document = await h.document(), deal = await snapshot(h.base.collection('setup').doc('deal'));
  refused('readyForMatch', await h.service.readyForMatch(h.players[0].uid, h.setupRequest({ dealId: document.dealId, bindingRevision: 1, uid: h.players[1].uid })), 'INVALID_REQUEST');
  const restarted = createV1Service({ db, clock: h.now, shuffle: items => [...items].reverse() });
  assert.deepEqual(ack('confirmSetupChoice', await restarted.confirmSetupChoice(h.players[0].uid, choice)), confirmed);
  assert.deepEqual(await snapshot(h.base.collection('setup').doc('deal')), deal);
  refused('readyForMatch', await h.service.readyForMatch(h.players[0].uid, h.setupRequest({ dealId: randomUUID(), bindingRevision: 1 })), 'STALE_DEAL');
  refused('readyForMatch', await h.service.readyForMatch(h.players[0].uid, h.setupRequest({ dealId: document.dealId, bindingRevision: 2 })), 'STALE_BINDING');
  refused('confirmSetupChoice', await h.service.confirmSetupChoice(h.players[0].uid, h.choice(0)), 'SETUP_LOCKED'); await noGameplay(h);
});

test('setup refuses unknown lifecycle markers and never overwrites an existing engine', async () => {
  const h = await harness({ humanCount: 1 }), control = h.base.collection('control').doc('session'), engine = h.base.collection('engine').doc('current');
  await control.update({ lifecycleVersion: 'future-setup' });
  refused('beginSetup', await h.service.beginSetup(h.host.uid, h.setupRequest()), 'UNSUPPORTED_SCHEMA'); await noGameplay(h);
  await control.update({ lifecycleVersion: 'staged-start-1' });
  await engine.set({ syntheticExistingEngine: true }); const existing = await snapshot(engine);
  refused('beginSetup', await h.service.beginSetup(h.host.uid, h.setupRequest()), 'UNAVAILABLE');
  assert.deepEqual(await snapshot(engine), existing); assert.equal((await h.document()).stage, 'lobby');
  await engine.delete(); await h.begin(); await engine.set({ syntheticExistingEngine: true });
  refused('confirmSetupChoice', await h.service.confirmSetupChoice(h.players[0].uid, h.choice(0)), 'UNAVAILABLE');
  assert.equal((await h.document()).seats[0].confirmed, false);
  await engine.delete(); await h.confirm(0); await engine.set({ syntheticExistingEngine: true });
  const prepared = await snapshot(h.base.collection('setup').doc('deal')), readyBefore = await snapshot(h.base.collection('setup').doc('public')), engineBefore = await snapshot(engine);
  refused('readyForMatch', await h.service.readyForMatch(h.players[0].uid, await h.readyBody()), 'UNAVAILABLE');
  assert.deepEqual(await snapshot(engine), engineBefore); assert.deepEqual(await snapshot(h.base.collection('setup').doc('public')), readyBefore);
  assert.deepEqual(await snapshot(h.base.collection('setup').doc('deal')), prepared);
  assert.equal((await h.base.collection('events').get()).size, 0); assert.equal((await h.base.collection('outbox').get()).size, 0);
  await engine.delete(); await control.update({ gameStarted: true });
  refused('readyForMatch', await h.service.readyForMatch(h.players[0].uid, await h.readyBody()), 'UNAVAILABLE');
  await control.update({ gameStarted: false, status: 'running' });
  refused('readyForMatch', await h.service.readyForMatch(h.players[0].uid, await h.readyBody()), 'UNAVAILABLE');
  await control.update({ status: 'awaiting-ready' }); await h.ready(0); await launchEvidence(h);
});

test('setup role previews are own-only and role reads do not touch public or unrelated snapshots', async () => {
  const h = await harness(); await h.prepare(); const value = await h.document();
  const publicBefore = await snapshot(h.base.collection('setup').doc('public'));
  const identityBefore = await snapshot(h.base.collection('identities').doc('public'));
  const unrelated = await snapshot(h.base.collection('setupPlayerViews').doc(h.players[1].uid));
  for (const identity of [h.host, h.display, ...h.players]) assert.equal((await read(h, identity, 'setup/public')).status, 200);
  for (const identity of [undefined, h.outsider]) assert.equal((await read(h, identity, 'setup/public')).status, 403);
  assert.equal((await read(h, h.players[0], 'setupPlayerViews/' + h.players[0].uid)).status, 200);
  for (const identity of [h.host, h.display, h.outsider, h.players[1]]) assert.equal((await read(h, identity, 'setupPlayerViews/' + h.players[0].uid)).status, 403);
  for (const identity of [h.host, h.display, h.players[0]]) {
    assert.equal((await read(h, identity, 'setup/public', { method: 'PATCH', data: value })).status, 403);
    assert.equal((await read(h, identity, 'setup/deal')).status, 403);
    assert.equal((await read(h, identity, 'setupPlayerViews')).status, 403);
    assert.equal((await read(h, identity, 'setupPlayerViews/' + h.players[0].uid, { method: 'PATCH', data: await privateView(h, h.players[0].uid) })).status, 403);
  }
  assert.deepEqual(await snapshot(h.base.collection('setup').doc('public')), publicBefore);
  assert.deepEqual(await snapshot(h.base.collection('identities').doc('public')), identityBefore);
  assert.deepEqual(await snapshot(h.base.collection('setupPlayerViews').doc(h.players[1].uid)), unrelated); await noGameplay(h);
});

test('different secret role deals leave the same neutral public setup progress', async () => {
  const first = await harness({ humanCount: 1 }), second = await harness({ humanCount: 1, shuffle: items => [...items].reverse() });
  await first.prepare(); await second.prepare();
  const normalize = value => ({ ...value, matchId: 'synthetic-match', dealId: 'synthetic-deal' });
  assert.deepEqual(normalize(await first.document()), normalize(await second.document()));
  assert.notEqual((await privateView(first, first.players[0].uid)).self.role, (await privateView(second, second.players[0].uid)).self.role);
  await noGameplay(first); await noGameplay(second);
});

test('bots do not count as authenticated humans and cannot be claimed through forged reverse membership', async () => {
  const h = await harness({ humanCount: 1 }); await h.prepare();
  const before = await snapshot(h.base.collection('setup').doc('public')), botSeat = 'seat-2';
  const copied = await privateView(h, h.players[0].uid);
  await h.base.collection('members').doc(h.outsider.uid).set({ kind: 'player', seatId: botSeat, bindingRevision: 1 });
  await h.base.collection('seats').doc(botSeat).update({ uid: h.outsider.uid });
  await h.base.collection('setupPlayerViews').doc(h.outsider.uid).set({ ...copied, audience: { kind: 'player', seatId: botSeat }, self: { ...copied.self, seatId: botSeat } });
  refused('confirmSetupChoice', await h.service.confirmSetupChoice(h.outsider.uid, h.choice(0)), 'FORBIDDEN');
  refused('readyForMatch', await h.service.readyForMatch(h.outsider.uid, await h.readyBody()), 'FORBIDDEN');
  for (const suffix of ['setup/public', 'setupPlayerViews/' + h.outsider.uid, 'setup/deal']) assert.equal((await read(h, h.outsider, suffix)).status, 403);
  assert.deepEqual(await snapshot(h.base.collection('setup').doc('public')), before); await noGameplay(h);
});

test('recovery preserves choices and deal, resets waiting Ready, and revokes old reads and receipt replay', async () => {
  for (const stage of ['choosing', 'awaiting-ready', 'running']) {
    const h = await harness(); await h.begin(); let oldReady;
    if (stage !== 'choosing') {
      for (let i = 0; i < h.players.length; i++) await h.confirm(i);
      oldReady = await h.readyBody(); await h.ready(0, oldReady);
      if (stage === 'running') for (let i = 1; i < h.players.length; i++) await h.ready(i);
    }
    const old = h.players[0], replacement = await auth(), identities = await h.identities();
    const deal = await snapshot(h.base.collection('setup').doc('deal'));
    const state = stage === 'running' ? await h.state() : null;
    const grant = op(await h.service.issueSeatRecovery(h.host.uid, h.request({ seatId: 'seat-1' })));
    op(await h.service.redeemSeatRecovery(replacement.uid, h.request({ recoveryToken: grant.recoveryToken })));
    assert.deepEqual(await h.identities(), identities); assert.deepEqual(await snapshot(h.base.collection('setup').doc('deal')), deal);
    assert.equal((await h.base.collection('setupPlayerViews').doc(old.uid).get()).exists, false);
    assert.equal((await read(h, old, 'setup/public')).status, 403);
    refused('confirmSetupChoice', await h.service.confirmSetupChoice(old.uid, h.choice(0)), 'FORBIDDEN');
    if (oldReady) refused('readyForMatch', await h.service.readyForMatch(old.uid, oldReady), 'FORBIDDEN');
    const document = await h.document(); assert.equal(document.stage, stage);
    if (stage === 'awaiting-ready') {
      assert.equal(document.seats.find(seat => seat.seatId === 'seat-1').ready, false);
      const own = await privateView(h, replacement.uid); assert.equal(own.bindingRevision, 2);
      refused('readyForMatch', await h.service.readyForMatch(replacement.uid, await h.readyBody()), 'STALE_BINDING');
      ack('readyForMatch', await h.service.readyForMatch(replacement.uid, await h.readyBody({ bindingRevision: 2 })));
    } else if (stage === 'choosing') ack('confirmSetupChoice', await h.service.confirmSetupChoice(replacement.uid, h.choice(0, { bindingRevision: 2 })));
    else { assert.deepEqual(await h.state(), state); FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(replacement.uid).get()).data()); }
    if (stage !== 'running') await noGameplay(h);
  }
});

test('duplicate final Ready launches exactly once at server time and survives service restart', async () => {
  const h = await harness({ humanCount: 1 }); await h.begin();
  const choosing = await h.document(); assert.equal(choosing.stage, 'choosing');
  assert.ok(choosing.seats.filter(seat => seat.seatId !== 'seat-1').every(seat => seat.confirmed && !seat.ready));
  await noGameplay(h); await h.confirm(0);
  assert.ok((await h.document()).seats.filter(seat => seat.seatId !== 'seat-1').every(seat => seat.confirmed && seat.ready));
  h.setTime(h.now() + 240_000);
  const body = await h.readyBody(), invoke = () => h.service.readyForMatch(h.players[0].uid, body);
  const initial = await Promise.all([invoke(), invoke()]);
  const values = [];
  for (const value of initial) values.push(ack('readyForMatch', await settled('readyForMatch', invoke, value)));
  assert.deepEqual(values[0], values[1]); const state = await launchEvidence(h), document = await h.document();
  assert.equal(state.phase.startedAt, h.now());
  const restarted = createV1Service({ db, clock: h.now, shuffle: items => [...items].reverse() });
  assert.deepEqual(ack('readyForMatch', await restarted.readyForMatch(h.players[0].uid, body)), values[0]);
  assert.deepEqual(await h.state(), state); assert.deepEqual(await h.document(), document);
  refused('readyForMatch', await h.service.readyForMatch(h.players[0].uid, { ...body, dealId: randomUUID() }), 'STALE_DEAL');
});

test('neither direct gameplay nor internal bots/deadlines can consume the private prepared deal', async () => {
  const h = await harness({ humanCount: 1 }); await h.prepare(); const before = await snapshot(h.base.collection('setup').doc('public'));
  assert.deepEqual(await h.service.runPracticeBots(h.base.id, { limit: 18 }), { status: 'unchanged', processed: 0 });
  fail(await h.service.submit(h.players[0].uid, { protocolVersion: 2, matchId: h.base.id, phaseId: randomUUID(), commandId: randomUUID(), command: { type: 'MOVE', destination: 'Room B' } }), 'FORBIDDEN');
  fail(await h.service.advance(h.players[0].uid, { protocolVersion: 2, matchId: h.base.id, phaseId: randomUUID() }), 'FORBIDDEN');
  const deadline = FullAdvanceResponseSchema.parse(await h.service.runDeadline({ matchId: h.base.id, phaseId: randomUUID(), deadlineToken: randomUUID() }));
  assert.equal(deadline.result, 'unchanged');
  assert.deepEqual(await snapshot(h.base.collection('setup').doc('public')), before); await noGameplay(h);
});

test('all-bot 7/8/9 rosters begin and launch atomically with no bot private client documents', async () => {
  for (const playerCount of [7, 8, 9]) {
    const h = await harness({ playerCount, humanCount: 0 }); await h.begin(); await launchEvidence(h);
    assert.ok((await h.document()).seats.every(seat => seat.confirmed && seat.ready));
    for (const collection of ['setupPlayerViews', 'playerViews', 'ownAcknowledgments', 'seatSessions']) assert.equal((await h.base.collection(collection).get()).size, 0);
    const bindings = (await h.base.collection('seats').get()).docs;
    assert.ok(bindings.every(binding => binding.get('controller') === 'bot' && !Object.hasOwn(binding.data(), 'uid')));
  }
});

test('host abort works from lobby, choosing, awaiting-ready and running without inventing a winner', async () => {
  for (const stage of ['lobby', 'choosing', 'awaiting-ready', 'running']) {
    const h = await harness({ humanCount: 1 });
    if (stage !== 'lobby') await h.begin();
    if (['awaiting-ready', 'running'].includes(stage)) await h.confirm(0);
    if (stage === 'running') await h.ready(0);
    const body = h.request(); op(await h.service.abortMatch(h.host.uid, body));
    assert.equal((await h.document()).stage, 'aborted'); assert.equal((await h.base.collection('setupPlayerViews').get()).size, 0);
    assert.equal((await h.base.collection('control').doc('session').get()).get('status'), 'aborted');
    assert.equal((await h.base.collection('lobby').doc('public').get()).get('status'), 'aborted');
    if (stage === 'running') { const view = FullPublicViewSchema.parse((await h.base.collection('views').doc('public').get()).data()); assert.equal(view.phase.kind, 'ABORTED'); assert.equal(view.phase.endsAt, null); assert.equal(view.result, null); assert.equal(view.endReveal, null); }
    else await noGameplay(h);
    refused('beginSetup', await h.service.beginSetup(h.host.uid, h.setupRequest()), 'SETUP_LOCKED');
    op(await h.service.abortMatch(h.host.uid, body));
    assert.deepEqual(await h.service.runPracticeBots(h.base.id, { limit: 18 }), { status: 'unchanged', processed: 0 });
  }
});

test('abort versus final Ready serializes an aborted session and never leaves live gameplay', async () => {
  const h = await harness({ humanCount: 1 }); await h.prepare();
  const body = await h.readyBody(), abort = h.request();
  const [ready, aborted] = await Promise.all([h.service.readyForMatch(h.players[0].uid, body), h.service.abortMatch(h.host.uid, abort)]);
  FullReadyForMatchResponseSchema.parse(ready); op(await settled('abortMatch', () => h.service.abortMatch(h.host.uid, abort), aborted));
  const settledReady = await settled('readyForMatch', () => h.service.readyForMatch(h.players[0].uid, body), ready);
  if (!settledReady.ok) refused('readyForMatch', settledReady, 'SETUP_LOCKED');
  assert.equal((await h.document()).stage, 'aborted'); assert.equal((await h.base.collection('setupPlayerViews').get()).size, 0);
  if ((await h.base.collection('engine').doc('current').get()).exists) { const current = await h.state(); assert.equal(current.phase.kind, 'ABORTED'); assert.equal(current.result, null); }
  else await noGameplay(h);
});

test('seat recovery racing final Ready preserves the single deal and rejects displaced replay authority', async () => {
  const h = await harness({ humanCount: 1 }); await h.prepare();
  const old = h.players[0], replacement = await auth(), deal = await snapshot(h.base.collection('setup').doc('deal'));
  const grant = op(await h.service.issueSeatRecovery(h.host.uid, h.request({ seatId: 'seat-1' })));
  const body = await h.readyBody(), redemption = h.request({ recoveryToken: grant.recoveryToken });
  const [ready, redeemed] = await Promise.all([h.service.readyForMatch(old.uid, body), h.service.redeemSeatRecovery(replacement.uid, redemption)]);
  FullReadyForMatchResponseSchema.parse(ready);
  op(await settled('redeemSeatRecovery', () => h.service.redeemSeatRecovery(replacement.uid, redemption), redeemed));
  refused('readyForMatch', await h.service.readyForMatch(old.uid, body), 'FORBIDDEN');
  assert.equal((await read(h, old, 'setup/public')).status, 403);
  assert.equal((await h.base.collection('setupPlayerViews').doc(old.uid).get()).exists, false);
  assert.deepEqual(await snapshot(h.base.collection('setup').doc('deal')), deal);
  if ((await h.document()).stage === 'awaiting-ready') {
    assert.equal((await privateView(h, replacement.uid)).bindingRevision, 2);
    ack('readyForMatch', await h.service.readyForMatch(replacement.uid, await h.readyBody({ bindingRevision: 2 })));
  }
  const state = await launchEvidence(h);
  assert.deepEqual(state.setup, decodeV1Setup(deal.data.setup));
  FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(replacement.uid).get()).data());
  assert.equal((await h.base.collection('playerViews').doc(old.uid).get()).exists, false);
});

test('legacy running state without setup documents retains strict gameplay projections and canonical behavior', async () => {
  const h = await harness(); const seatIds = h.players.map((_, i) => 'seat-' + (i + 1));
  const setup = { playerCount: 7, roleOrder: ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien'], codeExtraSeatIds: ['seat-1', 'seat-2', 'seat-3'], initialRooms: Object.fromEntries(seatIds.map((id, i) => [id, i % 2 ? 'Room B' : 'Room A'])), roundOrders: Array.from({ length: 5 }, () => [...seatIds]) };
  const state = createFullGame({ matchId: h.base.id, setup, now: h.now(), phaseId: randomUUID(), deadlineToken: randomUUID(), assetManifestVersion: 'legacy-test' }), views = projectFullGame(state);
  const { lifecycleVersion: _lifecycle, gameStarted: _started, ...legacyControl } = (await h.base.collection('control').doc('session').get()).data();
  const batch = db.batch(); batch.delete(h.base.collection('setup').doc('public')); batch.delete(h.base.collection('setup').doc('deal'));
  batch.set(h.base.collection('engine').doc('current'), encodeV1State(state)); batch.set(h.base.collection('control').doc('session'), { ...legacyControl, status: 'running' });
  batch.update(h.base.collection('lobby').doc('public'), { status: 'running' }); batch.set(h.base.collection('views').doc('public'), views.public);
  for (let i = 0; i < h.players.length; i++) { batch.set(h.base.collection('playerViews').doc(h.players[i].uid), views.players[seatIds[i]]); batch.set(h.base.collection('ownAcknowledgments').doc(h.players[i].uid), projectOwnAcknowledgments(state, seatIds[i], 1)); }
  await batch.commit();
  FullPublicViewSchema.parse((await h.base.collection('views').doc('public').get()).data());
  for (const identity of [h.host, h.display, h.players[0]]) assert.equal((await read(h, identity, 'views/public')).status, 200);
  assert.equal((await read(h, h.players[0], 'playerViews/' + h.players[0].uid)).status, 200);
  assert.equal((await read(h, h.players[1], 'playerViews/' + h.players[0].uid)).status, 403);
  const response = await h.service.submit(h.players[0].uid, { protocolVersion: 2, matchId: h.base.id, phaseId: state.phase.id, commandId: randomUUID(), command: { type: 'MOVE', destination: 'Room B' } });
  assert.equal(response.ok, true); FullReceiptSchema.parse(response.receipt); assert.equal(response.receipt.status, 'accepted');
  assert.equal((await h.state()).seats[0].location, 'Room B'); assert.equal((await h.base.collection('setup').doc('public').get()).exists, false);
});
