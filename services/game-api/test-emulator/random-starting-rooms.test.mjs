import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createV1Service } from '../dist/index.js';
import { decodeV1Setup, decodeV1State } from '../dist/full-game.js';
import { FullOperationResponseSchema, FullSetPracticeBotsResponseSchema, FullLobbyViewSchema } from '@mothership/contracts';
import { assertLocalEmulators, createEmulatorIdentity } from '../../../infra/firebase/test/helpers.mjs';
import { beginStagedSetup, confirmStagedChoices, completeStagedSetup, startStagedMatch } from './staged-start-helper.mjs';

let app, db;
before(() => {
  assertLocalEmulators();
  app = initializeApp({ projectId: 'demo-mothership' }, `random-rooms-${randomUUID()}`);
  db = getFirestore(app);
});
after(async () => { await db?.terminate(); if (app) await deleteApp(app); });
const op = response => { FullOperationResponseSchema.parse(response); assert.equal(response.ok, true, JSON.stringify(response)); return response.result; };
const bots = response => { FullSetPracticeBotsResponseSchema.parse(response); assert.equal(response.ok, true, JSON.stringify(response)); return response; };
async function harness(rooms) {
  let now = 1_700_000_000_000, draws = 0, shuffles = 0, forbidDraw = false;
  const randomInitialRoom = () => {
    assert.equal(forbidDraw, false, 'Stored rooms must survive without drawing again');
    assert.ok(draws < rooms.length, 'Each new assignment gets one independent test draw');
    return rooms[draws++];
  };
  const service = createV1Service({ db, clock: () => now, randomInitialRoom, shuffle: items => { shuffles++; return [...items]; } });
  const host = await createEmulatorIdentity();
  const created = op(await service.createMatch(host.uid, { protocolVersion: 2, requestId: randomUUID(), playerCount: 7 }));
  const base = db.collection('matches').doc(created.matchId);
  const request = (fields = {}) => ({ protocolVersion: 2, matchId: base.id, requestId: randomUUID(), ...fields });
  return { service, host, base, created, request, randomInitialRoom, draws: () => draws, shuffles: () => shuffles,
    now: () => now, setTime: value => { now = value; }, forbidDraw: () => { forbidDraw = true; },
    lobby: async () => FullLobbyViewSchema.parse((await base.collection('lobby').doc('public').get()).data()),
    bindings: async () => Object.fromEntries((await base.collection('seats').get()).docs.map(doc => [doc.id, doc.data()])),
  };
}
async function admit(h, identity, seatId, legacyRoom) {
  const payload = { protocolVersion: 2, requestId: randomUUID(), roomCode: h.created.roomCode,
    ...(legacyRoom === undefined ? {} : { initialRoom: legacyRoom }) };
  const pending = op(await h.service.requestAdmission(identity.uid, payload));
  const admission = await h.base.collection('admissions').doc(pending.admissionId).get();
  op(await h.service.approveAdmission(h.host.uid, h.request({ admissionId: pending.admissionId, seatId })));
  assert.equal((await h.base.collection('seats').doc(seatId).get()).get('initialRoom'), admission.get('initialRoom'));
  return { payload, pending, room: admission.get('initialRoom') };
}
async function recover(h, seatId) {
  const replacement = await createEmulatorIdentity();
  const grant = op(await h.service.issueSeatRecovery(h.host.uid, h.request({ seatId })));
  op(await h.service.redeemSeatRecovery(replacement.uid, h.request({ recoveryToken: grant.recoveryToken })));
  return replacement;
}
async function settle(response, retry) {
  for (let n = 0; !response.ok && response.error.code === 'UNAVAILABLE' && n < 2; n++) response = await retry();
  return response;
}

test('server room draws ignore legacy choices and persist through approval, staged deal, launch and recovery', async () => {
  const rooms = ['Room B', 'Room B', 'Room A', 'Room B', 'Room A', 'Room A', 'Room B'];
  const h = await harness(rooms);
  const players = await Promise.all(rooms.map(() => createEmulatorIdentity()));
  for (let i = 0; i < players.length; i++) {
    const result = await admit(h, players[i], `seat-${i + 1}`, i === 1 ? 'Room A' : i === 2 ? 'Room B' : undefined);
    assert.equal(result.room, rooms[i]);
    assert.deepEqual(op(await h.service.requestAdmission(players[i].uid, result.payload)), result.pending);
  }
  assert.equal(h.draws(), 7); assert.equal(h.shuffles(), 0, 'Admission cannot consume role/Code/turn randomness');
  const expected = Object.fromEntries(rooms.map((room, i) => [`seat-${i + 1}`, room]));
  assert.deepEqual(Object.fromEntries((await h.lobby()).seats.map(seat => [seat.seatId, seat.initialRoom])), expected);
  h.forbidDraw();
  await recover(h, 'seat-1');
  await beginStagedSetup(h);
  await confirmStagedChoices(h);
  const deal = (await h.base.collection('setup').doc('deal').get()).data();
  assert.deepEqual(decodeV1Setup(deal.setup).initialRooms, expected);
  await recover(h, 'seat-2');
  assert.deepEqual((await h.base.collection('setup').doc('deal').get()).data(), deal, 'Reading recovery cannot alter the prepared deal');
  await completeStagedSetup(h);
  const state = decodeV1State((await h.base.collection('engine').doc('current').get()).data());
  assert.deepEqual(state.setup.initialRooms, expected);
  assert.deepEqual(Object.fromEntries(state.seats.map(seat => [seat.seatId, seat.location])), expected);
  assert.equal(state.phase.endsAt - state.phase.startedAt, 60_000);
  assert.equal(state.versions.protocolVersion, 2); assert.equal(state.versions.engineVersion, 'full-game-1.0.1');
  assert.equal(state.versions.rulesetVersion, 'in-person-v1-2026-10-06');
  await recover(h, 'seat-3');
  assert.deepEqual(decodeV1State((await h.base.collection('engine').doc('current').get()).data()), state, 'Running recovery cannot re-roll rooms or gameplay');
  assert.equal(h.draws(), 7); assert.ok(h.shuffles() > 0);
});

test('concurrent identical admissions settle one stored room and replay it through a fresh service instance', async () => {
  const h = await harness(Array(6).fill('Room A'));
  const player = await createEmulatorIdentity();
  const payload = { protocolVersion: 2, requestId: randomUUID(), roomCode: h.created.roomCode, initialRoom: 'Room B' };
  const deliveries = await Promise.all(Array.from({ length: 4 }, () => h.service.requestAdmission(player.uid, payload)));
  const results = await Promise.all(deliveries.map(response => settle(response, () => h.service.requestAdmission(player.uid, payload))));
  const pending = results.map(op);
  assert.ok(pending.every(result => result.admissionId === pending[0].admissionId));
  const admissions = (await h.base.collection('admissions').get()).docs;
  assert.equal(admissions.length, 1); assert.equal(admissions[0].get('initialRoom'), 'Room A');
  assert.equal((await db.collection('identityOperations').where('uid', '==', player.uid).get()).size, 1);
  const before = admissions[0].data(); h.forbidDraw();
  const restarted = createV1Service({ db, clock: h.now, randomInitialRoom: h.randomInitialRoom });
  assert.deepEqual(op(await restarted.requestAdmission(player.uid, payload)), pending[0]);
  assert.deepEqual((await admissions[0].ref.get()).data(), before);
  assert.equal((await restarted.requestAdmission(player.uid, { ...payload, initialRoom: 'Room A' })).error.code, 'COMMAND_ID_CONFLICT');
  op(await restarted.approveAdmission(h.host.uid, h.request({ admissionId: pending[0].admissionId, seatId: 'seat-1' })));
  assert.equal((await h.bindings())['seat-1'].initialRoom, 'Room A');
});

test('bot changes preserve humans and retained bots, draw only for new binding epochs, and launch stored rooms', async () => {
  const h = await harness(['Room B', 'Room A', 'Room A', 'Room B', 'Room A', 'Room B', 'Room B', 'Room B']);
  await admit(h, await createEmulatorIdentity(), 'seat-1', 'Room A');
  const configure = async (count, payload = { schemaVersion: 1, ...h.request({ botCount: count }) }) => ({ payload, response: bots(await h.service.setPracticeBots(h.host.uid, payload)) });
  const initial = await configure(3), before = await h.bindings();
  assert.equal(before['seat-1'].initialRoom, 'Room B');
  assert.deepEqual(['seat-2', 'seat-3', 'seat-4'].map(id => before[id].initialRoom), ['Room A', 'Room A', 'Room B']);
  assert.equal(h.shuffles(), 0); assert.equal(h.draws(), 4);
  assert.deepEqual((await configure(3, initial.payload)).response.botSeatIds, initial.response.botSeatIds);
  await configure(3); assert.equal(h.draws(), 4); assert.deepEqual(await h.bindings(), before);
  await configure(2); assert.equal(h.draws(), 4);
  await configure(3); const readded = await h.bindings();
  assert.equal(h.draws(), 5); assert.equal(readded['seat-4'].initialRoom, 'Room A');
  assert.equal(readded['seat-4'].bindingRevision, before['seat-4'].bindingRevision + 1);
  for (const id of ['seat-1', 'seat-2', 'seat-3']) assert.deepEqual(readded[id], before[id]);
  await configure(6); const assigned = await h.bindings(); h.forbidDraw();
  await startStagedMatch(h);
  const state = decodeV1State((await h.base.collection('engine').doc('current').get()).data());
  assert.deepEqual(state.setup.initialRooms, Object.fromEntries(Object.entries(assigned).map(([id, entry]) => [id, entry.initialRoom])));
  assert.equal(h.draws(), 8);
});

test('a retried bot transaction reuses one draw for each new binding', async () => {
  const h = await harness(['Room B', 'Room A', 'Room B']);
  let callbacks = 0;
  const retryingDb = { collection: db.collection.bind(db), doc: db.doc.bind(db), runTransaction: async callback => {
    // First execute against real emulator reads, discard all writes, then re-execute
    // the same callback. This controls retry timing without racing a live worker.
    await db.runTransaction(tx => { callbacks++; return callback({ get: tx.get.bind(tx), create() {}, set() {}, update() {}, delete() {} }); });
    return db.runTransaction(tx => { callbacks++; return callback(tx); });
  } };
  const service = createV1Service({ db: retryingDb, clock: h.now, randomInitialRoom: h.randomInitialRoom });
  bots(await service.setPracticeBots(h.host.uid, { schemaVersion: 1, ...h.request({ botCount: 3 }) }));
  assert.equal(callbacks, 2); assert.equal(h.draws(), 3);
  const assigned = await h.bindings();
  assert.deepEqual(['seat-1', 'seat-2', 'seat-3'].map(id => assigned[id].initialRoom), ['Room B', 'Room A', 'Room B']);
});

test('failure during a multi-bot draw commits no partial roster, epochs, configuration or receipt', async () => {
  const h = await harness(['Room B']);
  await admit(h, await createEmulatorIdentity(), 'seat-1');
  const paths = ['practice/public', 'practice/bindingEpochs', 'identities/public', 'setup/public', 'lobby/public'];
  const snapshot = async () => ({ bindings: await h.bindings(), documents: await Promise.all(paths.map(async path => {
    const doc = await db.doc(`${h.base.path}/${path}`).get(); return { path, exists: doc.exists, data: doc.data() };
  })) });
  const before = await snapshot(); let calls = 0;
  const failing = createV1Service({ db, clock: h.now, randomInitialRoom: () => {
    if (++calls === 2) throw new Error('Synthetic second-bot RNG failure');
    return 'Room A';
  } });
  const payload = { schemaVersion: 1, ...h.request({ botCount: 3 }) };
  const failed = FullSetPracticeBotsResponseSchema.parse(await failing.setPracticeBots(h.host.uid, payload));
  assert.equal(failed.ok, false); assert.equal(failed.error.code, 'UNAVAILABLE'); assert.equal(calls, 2);
  assert.deepEqual(await snapshot(), before);
  assert.equal((await db.collection('practiceBotOperations').where('verifiedUid', '==', h.host.uid).get()).size, 0);
  const restarted = createV1Service({ db, clock: h.now, randomInitialRoom: () => 'Room B' });
  bots(await restarted.setPracticeBots(h.host.uid, payload));
  const after = await h.bindings();
  assert.deepEqual(after['seat-1'], before.bindings['seat-1']);
  assert.ok(['seat-2', 'seat-3', 'seat-4'].every(id => after[id].initialRoom === 'Room B'), 'Independent draws impose no equal-room quota');
  assert.equal((await db.collection('practiceBotOperations').where('verifiedUid', '==', h.host.uid).get()).size, 1);
});
