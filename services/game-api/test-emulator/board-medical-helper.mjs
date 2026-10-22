// Test-only Auth/Firestore fixture: one legal synthetic initial SETUP, then service decisions.
// This is not native setup randomness, HTTP token validation or automatic Tasks evidence.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import {
  FullCommandResponseSchema, FullAdvanceResponseSchema, FullPublicViewSchema,
  FullPlayerViewSchema, FullLobbyViewSchema, OwnAcknowledgmentsSchema, SeatSessionSchema,
} from '@mothership/contracts';
import { createFullGame, executeFullGame, advanceFullGame, abortFullGame,
  projectFullGame, projectOwnAcknowledgments } from '@mothership/engine';
import { createV1Service } from '../dist/index.js';
import { encodeV1Setup, encodeV1State, decodeV1Setup, decodeV1State } from '../dist/full-game.js';
import { createEmulatorIdentity } from '../../../infra/firebase/test/helpers.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const deadlinePayload = state => ({ matchId: state.matchId, phaseId: state.phase.id, deadlineToken: state.deadlineToken });
export async function retryUnavailable(deliver) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await deliver();
    if (response.error?.code !== 'UNAVAILABLE') return response;
  }
  assert.fail('Persistent service transaction failure');
}
export async function boardMedicalFixture(db, playerCount, { pins, roomACount = 5, assetManifestVersion = 'board-medical-service-fixture-assets-v1' } = {}) {
  assert.ok(pins, 'Every fixture supplies an explicit immutable tuple');
  let now = 1_800_000_000_000;
  const players = await Promise.all(Array.from({ length: playerCount }, () => createEmulatorIdentity()));
  const [host, display, outsider] = await Promise.all(Array.from({ length: 3 }, () => createEmulatorIdentity()));
  const roleOrder = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien',
    ...(playerCount >= 8 ? ['Red Disabler'] : []), ...(playerCount === 9 ? ['Officer'] : [])];
  const ids = roleOrder.map((_, index) => `seat-${index + 1}`);
  const setup = { playerCount, roleOrder, codeExtraSeatIds: ['seat-1', 'seat-2', 'seat-3'],
    initialRooms: Object.fromEntries(ids.map((id, index) => [id, index < roomACount ? 'Room A' : 'Room B'])),
    roundOrders: Array.from({ length: 5 }, () => [...ids]) };
  const matchId = `board-medical-${randomUUID()}`, base = db.collection('matches').doc(matchId);
  const context = { matchId, now, phaseId: randomUUID(), deadlineToken: randomUUID(),
    assetManifestVersion, versions: { ...pins, assetManifestVersion } };
  const initial = { ...createFullGame({ ...context, setup }), journalSequence: 1 };
  const views = projectFullGame(initial);
  const seatBindings = ids.map((seatId, index) => ({ seatId, uid: players[index].uid,
    bindingRevision: 1, initialRoom: setup.initialRooms[seatId] }));
  const batch = db.batch();
  batch.create(base.collection('control').doc('session'), { protocolVersion: 2, hostUid: host.uid,
    playerCount, status: 'running', roomCode: 'ABCDEF123456', createdAt: now, gameStarted: true });
  batch.create(base.collection('engine').doc('gameplayPins'), pins);
  batch.create(base.collection('engine').doc('current'), encodeV1State(initial));
  batch.create(base.collection('lobby').doc('public'), FullLobbyViewSchema.parse({ protocolVersion: 2, matchId,
    playerCount, status: 'running', seats: seatBindings.map(({ seatId, initialRoom }) => ({ seatId, initialRoom })) }));
  for (const identity of [host, display]) batch.create(base.collection('members').doc(identity.uid), { kind: 'display' });
  batch.create(base.collection('views').doc('public'), FullPublicViewSchema.parse(views.public));
  for (const { seatId, ...binding } of seatBindings) {
    batch.create(base.collection('seats').doc(seatId), binding);
    batch.create(base.collection('members').doc(binding.uid), { kind: 'player', seatId, bindingRevision: 1 });
    batch.create(base.collection('seatSessions').doc(binding.uid), SeatSessionSchema.parse({ schemaVersion: 1,
      protocolVersion: 2, matchId, seatId, bindingRevision: 1 }));
    batch.create(base.collection('playerViews').doc(binding.uid), views.players[seatId]);
    batch.create(base.collection('ownAcknowledgments').doc(binding.uid), projectOwnAcknowledgments(initial, seatId));
  }
  batch.create(base.collection('events').doc(randomUUID()), { journalVersion: 1, sequence: 1, kind: 'SETUP',
    ...context, setup: encodeV1Setup(setup), verifiedUid: host.uid, dealId: `synthetic-${randomUUID()}`, seatBindings });
  const taskId = hash([matchId, initial.phase.id, initial.deadlineToken]);
  batch.create(base.collection('outbox').doc(taskId), { protocolVersion: 2, ...deadlinePayload(initial), taskId,
    endsAt: initial.phase.endsAt, status: 'pending', attempts: 0, nextAttemptAt: now, leaseUntil: null, leaseToken: null });
  await batch.commit();
  const options = { db, clock: () => now,
    randomInitialRoom: () => assert.fail('Recorded setup cannot redraw rooms'),
    randomStartingRoomRank: () => assert.fail('Recorded setup cannot redraw its joint assignment') };
  const h = { db, base, players, host, display, outsider, ids, initial, pins, options,
    service: createV1Service(options), now: () => now,
    setTime: value => { assert.ok(value >= now, 'Trusted fixture clock must not regress'); now = value; },
    current: async () => decodeV1State((await base.collection('engine').doc('current').get()).data()) };
  h.request = (fields = {}) => ({ protocolVersion: 2, matchId, requestId: randomUUID(), ...fields });
  h.uid = seatId => players[Number(seatId.slice(5)) - 1].uid;
  h.send = async (seatId, command) => {
    const state = await h.current(); h.setTime(Math.max(now, state.phase.startedAt + 1));
    const request = { protocolVersion: 2, matchId, phaseId: state.phase.id, commandId: randomUUID(), command };
    const response = FullCommandResponseSchema.parse(await retryUnavailable(() => h.service.submit(h.uid(seatId), request)));
    assert.equal(response.ok, true, JSON.stringify(response));
    return { request, receipt: response.receipt };
  };
  h.accept = async (seatId, command) => {
    const result = await h.send(seatId, command);
    assert.equal(result.receipt.status, 'accepted', JSON.stringify(result)); return result;
  };
  h.expire = async () => {
    const state = await h.current(); assert.notEqual(state.phase.endsAt, null, JSON.stringify(state.phase));
    h.setTime(Math.max(now, state.phase.endsAt));
    const result = FullAdvanceResponseSchema.parse(await retryUnavailable(() => h.service.runDeadline(deadlinePayload(state))));
    assert.equal(result.result, 'advanced', JSON.stringify(result)); return h.current();
  };
  h.until = async predicate => {
    let state = await h.current();
    for (let step = 0; !predicate(state); step++) {
      assert.ok(step < 120 && state.phase.endsAt !== null, `Bounded real service history stopped at ${state.round}/${state.phase.kind}`);
      state = await h.expire();
    }
    return state;
  };
  h.turn = (seatId, round) => h.until(state => state.round === round && state.phase.kind === 'ORDINARY_TURN' && state.activeSeatId === seatId);
  h.finishRound = round => h.until(state => state.round > round || ['FINISHED', 'SHOWDOWN'].includes(state.phase.kind));
  return h;
}
export async function assertStoredBoard(h) {
  const state = await h.current(), views = projectFullGame(state);
  assert.deepEqual(FullPublicViewSchema.parse((await h.base.collection('views').doc('public').get()).data()), views.public);
  for (const [index, player] of h.players.entries()) {
    const seatId = `seat-${index + 1}`, binding = (await h.base.collection('seats').doc(seatId).get()).data();
    assert.deepEqual(FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(player.uid).get()).data()), views.players[seatId]);
    assert.deepEqual(OwnAcknowledgmentsSchema.parse((await h.base.collection('ownAcknowledgments').doc(player.uid).get()).data()),
      projectOwnAcknowledgments(state, seatId, binding.bindingRevision));
  }
  assert.deepEqual((await h.base.collection('engine').doc('gameplayPins').get()).data(), h.pins);
  return { state, views };
}
export async function assertBoardJournal(h) {
  const records = (await h.base.collection('events').orderBy('sequence').get()).docs.map(doc => doc.data());
  assert.deepEqual(records.map(record => record.sequence), Array.from({ length: records.length }, (_, index) => index + 1));
  let replay;
  for (const record of records) {
    if (record.kind === 'SETUP') replay = createFullGame({ ...record, setup: decodeV1Setup(record.setup) });
    else if (record.kind === 'COMMAND') {
      const result = executeFullGame(replay, record.actorSeatId, record.request, record);
      assert.deepEqual(result.receipt, record.receipt); replay = result.state;
    } else if (record.kind === 'DEADLINE') {
      const result = advanceFullGame(replay, record); assert.equal(result.advanced, true); replay = result.state;
    } else if (record.kind === 'ABORT') replay = abortFullGame(replay, record);
    else assert.fail(`Unexpected journal decision ${record.kind}`);
    replay = { ...replay, journalSequence: record.sequence };
  }
  assert.deepEqual(replay, await h.current());
  assert.equal((await h.base.collection('receipts').get()).size, records.filter(record => record.kind === 'COMMAND').length);
  await assertStoredBoard(h);
}
