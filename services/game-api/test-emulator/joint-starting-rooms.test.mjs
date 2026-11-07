import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { FullOperationResponseSchema, FullSetPracticeBotsResponseSchema, FullCommandResponseSchema, FullBeginSetupResponseSchema, FullAdvanceResponseSchema, FullPublicViewSchema, FullPlayerViewSchema, OwnAcknowledgmentsSchema, FullLobbyViewSchema } from '@mothership/contracts';
import { FULL_GAME_VERSION_PINS, CAPACITY_FULL_GAME_VERSION_PINS, PASS_FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS, createFullGame, executeFullGame, advanceFullGame, projectFullGame, projectOwnAcknowledgments } from '@mothership/engine';
import { createV1Service } from '../dist/index.js';
import { jointStartingRooms, jointStartingRoomAssignmentCount } from '../dist/joint-starting-rooms.js';
import { decodeV1Setup, decodeV1State, encodeV1State } from '../dist/full-game.js';
import { startStagedMatch, beginStagedSetup, confirmStagedChoices } from './staged-start-helper.mjs';
import { assertLocalEmulators, createEmulatorIdentity } from '../../../infra/firebase/test/helpers.mjs';

let app, db, serial = 0;
before(() => { assertLocalEmulators(); app = initializeApp({ projectId: 'demo-mothership' }, `joint-starting-rooms-${randomUUID()}`); db = getFirestore(app); });
after(async () => { await db?.terminate(); if (app) await deleteApp(app); });
const op = response => { FullOperationResponseSchema.parse(response); assert.equal(response.ok, true, JSON.stringify(response)); return response.result; };
const bots = response => { FullSetPracticeBotsResponseSchema.parse(response); assert.equal(response.ok, true, JSON.stringify(response)); return response; };
const roomCounts = rooms => Object.fromEntries(['Room A', 'Room B'].map(room => [room, rooms.filter(value => value === room).length]));

async function harness({ count = 9, versions = FULL_GAME_VERSION_PINS, preferences = Array(20).fill('Room A'), rankSequence = [0] } = {}) {
  let now = 1_600_000_000_000 + ++serial * 100_000_000, draws = 0, shuffles = 0, forbidDraw = false; const ranks = [];
  const options = { db, clock: () => now, randomStartingRoomRank: maximum => {
    assert.equal(forbidDraw, false, 'A persisted complete assignment cannot draw again');
    ranks.push(maximum); return rankSequence[ranks.length - 1] ?? maximum - 1;
  }, shuffle: items => { shuffles++; return [...items]; }, randomInitialRoom: () => {
    assert.equal(forbidDraw, false, 'Persisted assignments and retries must not redraw');
    assert.ok(draws < preferences.length); return preferences[draws++];
  } };
  const service = createV1Service(options), host = await createEmulatorIdentity();
  const created = op(await service.createMatch(host.uid, { protocolVersion: 2, requestId: randomUUID(), playerCount: count }));
  const base = db.collection('matches').doc(created.matchId);
  assert.deepEqual((await base.collection('engine').doc('gameplayPins').get()).data(), FULL_GAME_VERSION_PINS, 'Only creation adopts current gameplay pins');
  // Explicit local historical-lobby fixture, before any room assignment.
  if (versions === null) await base.collection('engine').doc('gameplayPins').delete();
  else if (versions !== FULL_GAME_VERSION_PINS) await base.collection('engine').doc('gameplayPins').set(versions);
  const request = (fields = {}) => ({ protocolVersion: 2, matchId: base.id, requestId: randomUUID(), ...fields });
  return { service, options, host, base, created, request, players: [], draws: () => draws, ranks, shuffles: () => shuffles,
    now: () => now, setTime: value => { now = value; }, forbidDraw: () => { forbidDraw = true; },
    bindings: async () => Object.fromEntries((await base.collection('seats').get()).docs.map(doc => [doc.id, doc.data()])),
    current: async () => decodeV1State((await base.collection('engine').doc('current').get()).data()),
  };
}
async function pending(h) {
  const identity = await createEmulatorIdentity();
  const payload = { protocolVersion: 2, requestId: randomUUID(), roomCode: h.created.roomCode, initialRoom: 'Room B' };
  const result = op(await h.service.requestAdmission(identity.uid, payload));
  return { identity, payload, result };
}
async function approve(h, entry, seatId, body = h.request({ admissionId: entry.result.admissionId, seatId })) {
  op(await h.service.approveAdmission(h.host.uid, body));
  h.players[Number(seatId.slice(5)) - 1] = entry.identity;
  return body;
}
async function humans(h, count) {
  for (let n = 1; n <= count; n++) await approve(h, await pending(h), `seat-${n}`);
}
async function configure(h, count, body = { schemaVersion: 1, ...h.request({ botCount: count }) }) {
  return { body, response: bots(await h.service.setPracticeBots(h.host.uid, body)) };
}
async function settle(response, retry, schema) {
  schema.parse(response);
  for (let attempt = 0; response.error?.code === 'UNAVAILABLE' && attempt < 2; attempt++) response = schema.parse(await retry());
  return response;
}
async function submit(h, seatNumber, payload) {
  return FullCommandResponseSchema.parse(await h.service.submit(h.players[seatNumber - 1].uid, payload));
}
const command = (h, state, type) => ({ protocolVersion: 2, matchId: h.base.id, phaseId: state.phase.id, commandId: randomUUID(), command: type });
async function replay(h) {
  const records = (await h.base.collection('events').orderBy('sequence').get()).docs.map(doc => doc.data());
  let state;
  for (const record of records) {
    if (record.kind === 'SETUP') state = createFullGame({ ...record, setup: decodeV1Setup(record.setup) });
    else if (record.kind === 'COMMAND') {
      const result = executeFullGame(state, record.actorSeatId, record.request, record);
      assert.deepEqual(result.receipt, record.receipt); state = result.state;
    } else if (record.kind === 'DEADLINE') { const result = advanceFullGame(state, record); assert.equal(result.advanced, true); state = result.state; }
    else assert.fail('Unexpected journal decision');
    state.journalSequence = record.sequence;
  }
  assert.deepEqual(state, await h.current());
  assert.deepEqual(projectFullGame(state).public, (await h.base.collection('views').doc('public').get()).data());
}


async function consistent(h, expected) {
  const bindings = await h.bindings();
  assert.deepEqual(Object.fromEntries(Object.entries(bindings).map(([id, binding]) => [id, binding.initialRoom])), expected);
  const lobby = FullLobbyViewSchema.parse((await h.base.collection('lobby').doc('public').get()).data());
  assert.deepEqual(Object.fromEntries(lobby.seats.map(seat => [seat.seatId, seat.initialRoom])), expected);
  for (const doc of (await h.base.collection('admissions').where('status', '==', 'approved').get()).docs) assert.equal(doc.get('initialRoom'), expected[doc.get('seatId')]);
}
const ids = count => Array.from({ length: count }, (_, index) => `seat-${index + 1}`);
const unassigned = seatIds => Object.fromEntries(seatIds.map(id => [id, null]));
async function startingState(h, expected) {
  await startStagedMatch(h);
  const state = await h.current(), deal = (await h.base.collection('setup').doc('deal').get()).data();
  assert.deepEqual(state.setup.initialRooms, expected); assert.deepEqual(decodeV1Setup(deal.setup).initialRooms, expected);
  assert.deepEqual(Object.fromEntries(state.seats.map(seat => [seat.seatId, seat.location])), expected);
  assert.deepEqual(state.versions, { ...FULL_GAME_VERSION_PINS, assetManifestVersion: state.versions.assetManifestVersion });
  assert.deepEqual(deal.versions, state.versions); assert.deepEqual((await h.base.collection('engine').doc('gameplayPins').get()).data(), FULL_GAME_VERSION_PINS);
  assert.equal(state.phase.endsAt - state.phase.startedAt, 60_000); await replay(h);
  return state;
}

for (const count of [7, 8, 9]) {
  test(`${count} seats: human approval order does not reveal a room before the uniform joint completion`, async () => {
    const total = jointStartingRoomAssignmentCount(count);
    for (const order of [ids(count), ids(count).reverse()]) {
      const h = await harness({ count }); const entries = await Promise.all(ids(count).map(() => pending(h)));
      for (const entry of entries) assert.equal((await h.base.collection('admissions').doc(entry.result.admissionId).get()).get('initialRoom'), null);
      for (let index = 0; index < order.length; index++) {
        await approve(h, entries[Number(order[index].slice(5)) - 1], order[index]);
        if (index < count - 1) { await consistent(h, unassigned(order.slice(0, index + 1))); assert.deepEqual(h.ranks, []); }
      }
      const expected = jointStartingRooms(count, 0); await consistent(h, expected); assert.deepEqual(h.ranks, [total]);
      assert.equal(h.draws(), 0); assert.equal(h.shuffles(), 0, 'Rooms do not consume role/turn randomness');
      h.forbidDraw(); await startingState(h, expected); assert.deepEqual(h.ranks, [total]);
    }
  });

  test(`${count} seats: concurrent last approvals atomically publish one complete assignment`, async () => {
    const h = await harness({ count }); await humans(h, count - 2);
    const entries = await Promise.all([pending(h), pending(h)]);
    const bodies = entries.map((entry, index) => h.request({ admissionId: entry.result.admissionId, seatId: `seat-${count - 1 + index}` }));
    const first = await Promise.all(bodies.map(body => h.service.approveAdmission(h.host.uid, body)));
    for (let index = 0; index < entries.length; index++) {
      op(await settle(first[index], () => h.service.approveAdmission(h.host.uid, bodies[index]), FullOperationResponseSchema));
      h.players[count - 2 + index] = entries[index].identity;
    }
    const expected = jointStartingRooms(count, 0); await consistent(h, expected);
    assert.deepEqual(h.ranks, [jointStartingRoomAssignmentCount(count)]); assert.equal(h.draws(), 0);
    const before = await h.bindings();
    for (const body of bodies) op(await h.service.approveAdmission(h.host.uid, body));
    assert.deepEqual(await h.bindings(), before); assert.equal(h.ranks.length, 1);
  });

  test(`${count} seats: bot fill and last human approval serialize one persisted joint assignment`, async () => {
    const h = await harness({ count }); await humans(h, count - 1); const last = await pending(h);
    const approval = h.request({ admissionId: last.result.admissionId, seatId: `seat-${count}` });
    const fill = { schemaVersion: 1, ...h.request({ botCount: 1 }) };
    const responses = await Promise.all([h.service.approveAdmission(h.host.uid, approval), h.service.setPracticeBots(h.host.uid, fill)]);
    const human = await settle(responses[0], () => h.service.approveAdmission(h.host.uid, approval), FullOperationResponseSchema);
    const bot = await settle(responses[1], () => h.service.setPracticeBots(h.host.uid, fill), FullSetPracticeBotsResponseSchema);
    assert.equal([human, bot].filter(response => response.ok).length, 1);
    if (human.ok) assert.equal(bot.error.code, 'CAPACITY_EXCEEDED'); else assert.equal(human.error.code, 'FORBIDDEN');
    assert.ok(h.ranks.length >= 1 && h.ranks.length <= 2, 'At most one uncommitted rank per competing invocation');
    const actual = Object.fromEntries(Object.entries(await h.bindings()).map(([id, binding]) => [id, binding.initialRoom]));
    assert.ok([jointStartingRooms(count, 0), jointStartingRooms(count, jointStartingRoomAssignmentCount(count) - 1)]
      .some(expected => JSON.stringify(expected) === JSON.stringify(actual)));
    await consistent(h, actual); const drawCount = h.ranks.length; h.forbidDraw();
    const before = await h.bindings();
    if (human.ok) { op(await h.service.approveAdmission(h.host.uid, approval)); await configure(h, 0); }
    else { await configure(h, 1, fill); await configure(h, 1); }
    assert.deepEqual(await h.bindings(), before); assert.equal(h.ranks.length, drawCount); assert.equal(h.draws(), 0);
  });

  test(`${count} seats: retained bots, shrink, re-completion and recovery keep all room records coherent`, async () => {
    const h = await harness({ count }); await humans(h, 1); await configure(h, count - 2);
    await consistent(h, unassigned(ids(count - 1))); assert.deepEqual(h.ranks, []);
    const complete = await configure(h, count - 1), first = jointStartingRooms(count, 0);
    await consistent(h, first); assert.equal(h.ranks.length, 1);
    const firstRecord = await h.base.collection('engine').doc('startingRooms').get();
    assert.deepEqual(firstRecord.get('initialRooms'), first); assert.deepEqual(firstRecord.get('versions'), FULL_GAME_VERSION_PINS);
    await configure(h, count - 1, complete.body); await configure(h, count - 1); await consistent(h, first); assert.equal(h.ranks.length, 1);
    // Recovering a human changes uid/epoch but not the completed roster's draw.
    const recovery = op(await h.service.issueSeatRecovery(h.host.uid, h.request({ seatId: 'seat-1' }))), replacement = await createEmulatorIdentity();
    op(await h.service.redeemSeatRecovery(replacement.uid, h.request({ recoveryToken: recovery.recoveryToken })));
    h.players[0] = replacement; await configure(h, count - 1); await consistent(h, first); assert.equal(h.ranks.length, 1);
    h.forbidDraw();
    await configure(h, count - 2); await consistent(h, Object.fromEntries(ids(count - 1).map(id => [id, first[id]]))); assert.equal(h.ranks.length, 1);
    await configure(h, count - 1); await consistent(h, first); assert.equal(h.ranks.length, 1); assert.equal((await h.bindings())[`seat-${count}`].bindingRevision, 2);
    const preserved = await h.base.collection('engine').doc('startingRooms').get();
    assert.deepEqual(preserved.data(), firstRecord.data()); assert.equal(preserved.updateTime.isEqual(firstRecord.updateTime), true);
    const state = await startingState(h, first);
    const reconnect = op(await h.service.issueSeatRecovery(h.host.uid, h.request({ seatId: 'seat-1' }))), next = await createEmulatorIdentity();
    op(await h.service.redeemSeatRecovery(next.uid, h.request({ recoveryToken: reconnect.recoveryToken })));
    assert.deepEqual(await h.current(), state); await consistent(h, first); assert.equal(h.ranks.length, 1); assert.equal(h.draws(), 0);
  });

  test(`${count} seats: a final human joining a partial bot roster assigns everyone together`, async () => {
    const h = await harness({ count }); await humans(h, 1); await configure(h, count - 2);
    await consistent(h, unassigned(ids(count - 1))); const last = await pending(h);
    await approve(h, last, `seat-${count}`); const expected = jointStartingRooms(count, 0);
    await consistent(h, expected); assert.equal(h.ranks.length, 1); assert.equal(h.draws(), 0);
    const canonical = (await h.base.collection('engine').doc('startingRooms').get()).data(), vacant = `seat-${count - 1}`;
    h.forbidDraw(); await configure(h, count - 3);
    await consistent(h, Object.fromEntries(Object.entries(expected).filter(([id]) => id !== vacant)));
    const replacement = await pending(h); assert.equal((await h.base.collection('admissions').doc(replacement.result.admissionId).get()).get('initialRoom'), null);
    await approve(h, replacement, vacant); await consistent(h, expected); assert.equal(h.ranks.length, 1);
    assert.deepEqual((await h.base.collection('engine').doc('startingRooms').get()).data(), canonical);
    await startingState(h, expected);
  });

  test(`${count} seats: corrupt canonical draw, roster or prepared deal cannot be repaired or launched`, async () => {
    for (const corruption of ['missing-record', 'unknown-record-pins', 'wrong-binding', 'wrong-deal']) {
      const h = await harness({ count }); await configure(h, count); h.forbidDraw();
      const record = h.base.collection('engine').doc('startingRooms');
      if (corruption === 'wrong-deal') {
        await beginStagedSetup(h); await confirmStagedChoices(h);
        const ref = h.base.collection('setup').doc('deal'), deal = (await ref.get()).data();
        deal.setup.initialRooms = jointStartingRooms(count, jointStartingRoomAssignmentCount(count) - 1); await ref.set(deal);
        h.setTime(deal.readingEndsAt);
        const intent = (await h.base.collection('setupOutbox').get()).docs.find(doc => doc.get('stage') === 'awaiting-ready').data();
        assert.equal((await h.service.runSetupDeadline({ matchId: h.base.id, setupId: intent.setupId, stage: intent.stage, deadlineToken: intent.deadlineToken })).status, 'failed');
      } else {
        if (corruption === 'missing-record') await record.delete();
        if (corruption === 'unknown-record-pins') await record.update({ versions: { ...FULL_GAME_VERSION_PINS, rulesetHash: 'f'.repeat(64) } });
        if (corruption === 'wrong-binding') await h.base.collection('seats').doc('seat-1').update({ initialRoom: null });
        const before = await h.bindings();
        const response = FullBeginSetupResponseSchema.parse(await h.service.beginSetup(h.host.uid, { schemaVersion: 1, ...h.request() }));
        assert.equal(response.ok, false); assert.equal(response.error.code, 'UNAVAILABLE'); assert.deepEqual(await h.bindings(), before);
        const unchanged = await h.service.setPracticeBots(h.host.uid, { schemaVersion: 1, ...h.request({ botCount: count }) });
        assert.equal(unchanged.ok, false); assert.equal(unchanged.error.code, 'UNAVAILABLE'); assert.deepEqual(await h.bindings(), before);
        assert.equal((await h.base.collection('setup').doc('public').get()).get('stage'), 'lobby');
      }
      assert.equal((await h.base.collection('engine').doc('current').get()).exists, false); assert.equal(h.ranks.length, 1);
      assert.deepEqual((await h.base.collection('engine').doc('gameplayPins').get()).data(), FULL_GAME_VERSION_PINS);
    }
  });
}

for (const [label, versions] of [['capacity1.2', CAPACITY_FULL_GAME_VERSION_PINS], ['Pass', PASS_FULL_GAME_VERSION_PINS], ['legacy', LEGACY_FULL_GAME_VERSION_PINS], ['missing', null]]) {
  test(`${label}: old stored lobby keeps its assignments and exact deal/launch pins`, async () => {
    const h = await harness({ versions });
    await h.base.collection('engine').doc('startingRooms').set({ invalid: 'historical tuples ignore this record' });
    await humans(h, 1); await configure(h, 8);
    const expected = Object.fromEntries(Object.entries(await h.bindings()).map(([id, binding]) => [id, binding.initialRoom]));
    assert.equal(Object.values(expected).filter(room => room === 'Room A').length, label === 'capacity1.2' ? 5 : 9);
    assert.ok(Object.values(expected).every(room => room !== null)); assert.deepEqual(h.ranks, []); assert.equal(h.draws(), 9);
    h.forbidDraw(); await startStagedMatch(h);
    const state = await h.current(), pins = versions ?? LEGACY_FULL_GAME_VERSION_PINS, deal = (await h.base.collection('setup').doc('deal').get()).data();
    assert.deepEqual(state.versions, { ...pins, assetManifestVersion: state.versions.assetManifestVersion });
    assert.deepEqual(deal.versions, state.versions); assert.deepEqual(state.setup.initialRooms, expected); await replay(h);
    assert.deepEqual((await h.base.collection('engine').doc('gameplayPins').get()).data(), versions === null ? undefined : versions);
  });
}

test('mixed/unknown tuples cannot draw or mutate admission/bot state', async () => {
  for (const versions of [{ ...FULL_GAME_VERSION_PINS, rulesetHash: 'f'.repeat(64) }, { ...FULL_GAME_VERSION_PINS, engineVersion: CAPACITY_FULL_GAME_VERSION_PINS.engineVersion }]) {
    const h = await harness({ versions }), before = await h.bindings(), identity = await createEmulatorIdentity();
    const admission = await h.service.requestAdmission(identity.uid, { protocolVersion: 2, requestId: randomUUID(), roomCode: h.created.roomCode });
    assert.equal(admission.ok, false); assert.equal(admission.error.code, 'UNAVAILABLE');
    const bots = await h.service.setPracticeBots(h.host.uid, { schemaVersion: 1, ...h.request({ botCount: 9 }) });
    assert.equal(bots.ok, false); assert.equal(bots.error.code, 'UNAVAILABLE'); assert.deepEqual(await h.bindings(), before);
    assert.equal((await h.base.collection('admissions').get()).size, 0); assert.deepEqual(h.ranks, []); assert.equal(h.draws(), 0);
    assert.deepEqual((await h.base.collection('engine').doc('gameplayPins').get()).data(), versions);
  }
});
