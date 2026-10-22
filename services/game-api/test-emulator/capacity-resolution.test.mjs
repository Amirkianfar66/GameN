import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { FullCommandResponseSchema, FullAdvanceResponseSchema, FullPublicViewSchema, FullPlayerViewSchema, FullLobbyViewSchema, OwnAcknowledgmentsSchema, SeatSessionSchema } from '@mothership/contracts';
// Historical resolution fixtures retain their exact 1.3 vote timing.
import { RESOLUTION_FULL_GAME_VERSION_PINS as FULL_GAME_VERSION_PINS, createFullGame, executeFullGame, advanceFullGame, projectFullGame, projectOwnAcknowledgments } from '@mothership/engine';
import { createV1Service } from '../dist/index.js';
import { encodeV1Setup, encodeV1State, decodeV1Setup, decodeV1State } from '../dist/full-game.js';
import { assertLocalEmulators, createEmulatorIdentity } from '../../../infra/firebase/test/helpers.mjs';

const catalogue = JSON.parse(readFileSync(new URL('../../../packages/engine/test/fixtures/capacity-resolution.json', import.meta.url)));
assert.equal(catalogue.source_commit, 'c82863eff563ea7fd8f6ee33e7260d2dc1c4899c');
const cases = catalogue.cases.filter(fixture => /-CAP-(25|27|28|45|46)$/.test(fixture.id));
assert.equal(cases.length, 15);
let app, db;
before(() => { assertLocalEmulators(); app = initializeApp({ projectId: 'demo-mothership' }, `capacity-resolution-${randomUUID()}`); db = getFirestore(app); });
after(async () => { await db?.terminate(); if (app) await deleteApp(app); });

async function seed(fixture) {
  // Explicit local Admin synthetic initial SETUP. It is a legal constructor start
  // with supplied independent room/role/order inputs, not evidence of native lobby
  // randomness or real setup delivery. After this seed all authoritative commands
  // and deadlines run through the service; no intermediate health/state is injected.
  let now = 1_800_000_000_000;
  const players = await Promise.all(Array.from({ length: fixture.setup.playerCount }, () => createEmulatorIdentity()));
  const matchId = `capacity-resolution-${randomUUID()}`, base = db.collection('matches').doc(matchId);
  const { seed: ignoredSeed, ...setup } = fixture.setup;
  const context = { matchId, now, phaseId: randomUUID(), deadlineToken: randomUUID(),
    assetManifestVersion: 'resolution-service-fixture-assets-v1',
    versions: { ...FULL_GAME_VERSION_PINS, assetManifestVersion: 'resolution-service-fixture-assets-v1' } };
  const state = { ...createFullGame({ ...context, setup }), journalSequence: 1 }, views = projectFullGame(state);
  const seatBindings = state.seats.map((seat, index) => ({ seatId: seat.seatId, uid: players[index].uid,
    bindingRevision: 1, initialRoom: setup.initialRooms[seat.seatId] }));
  const batch = db.batch();
  batch.create(base.collection('control').doc('session'), { protocolVersion: 2, hostUid: players[0].uid,
    playerCount: setup.playerCount, status: 'running', roomCode: 'ABCDEF123456', createdAt: now, gameStarted: true });
  batch.create(base.collection('engine').doc('gameplayPins'), FULL_GAME_VERSION_PINS);
  batch.create(base.collection('engine').doc('current'), encodeV1State(state));
  batch.create(base.collection('lobby').doc('public'), FullLobbyViewSchema.parse({ protocolVersion: 2, matchId,
    playerCount: state.playerCount, status: 'running', seats: seatBindings.map(({ seatId, initialRoom }) => ({ seatId, initialRoom })) }));
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
  await batch.commit();
  const service = createV1Service({ db, clock: () => now,
    randomInitialRoom: () => assert.fail('Recorded setup cannot draw starting rooms'),
    randomStartingRoomRank: () => assert.fail('Recorded setup cannot draw a joint assignment') });
  return { base, service, players, state, setTime: value => { now = value; },
    current: async () => decodeV1State((await base.collection('engine').doc('current').get()).data()) };
}
function invariants(state) {
  for (const room of ['Room A', 'Room B', 'Hospital', 'Jail', 'Command Room']) {
    assert.ok(state.seats.filter(seat => seat.location === room).length <= (room === 'Command Room' ? 1 : 5), room);
  }
  for (const seat of state.seats) if (['Room A', 'Room B'].includes(seat.location)) assert.equal(seat.lastRoom, seat.location);
}
async function storedViews(h, state) {
  invariants(state); const views = projectFullGame(state);
  assert.deepEqual(FullPublicViewSchema.parse((await h.base.collection('views').doc('public').get()).data()), views.public);
  await Promise.all(state.seats.map(async (seat, index) => {
    const uid = h.players[index].uid;
    assert.deepEqual(FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(uid).get()).data()), views.players[seat.seatId]);
    assert.deepEqual(OwnAcknowledgmentsSchema.parse((await h.base.collection('ownAcknowledgments').doc(uid).get()).data()), projectOwnAcknowledgments(state, seat.seatId));
  }));
  assert.deepEqual((await h.base.collection('engine').doc('gameplayPins').get()).data(), FULL_GAME_VERSION_PINS);
  assert.deepEqual(state.versions, { ...FULL_GAME_VERSION_PINS, assetManifestVersion: state.versions.assetManifestVersion });
}
async function decision(h, sequence, kind) {
  const docs = (await h.base.collection('events').where('sequence', '==', sequence).get()).docs;
  assert.equal(docs.length, 1); const record = docs[0].data(); assert.equal(record.kind, kind); return record;
}
async function audienceCounts(h) {
  return Promise.all(['public', ...h.state.seats.map(seat => `p-${seat.seatId}`)]
    .map(async key => [key, (await h.base.collection('audienceEvents').doc(key).collection('items').get()).size]));
}
async function tick(h) {
  const before = h.state; assert.notEqual(before.phase.endsAt, null);
  const payload = { matchId: h.base.id, phaseId: before.phase.id, deadlineToken: before.deadlineToken };
  h.setTime(before.phase.endsAt);
  const response = FullAdvanceResponseSchema.parse(await h.service.runDeadline(payload));
  assert.equal(response.result, 'advanced', JSON.stringify(response));
  const state = await h.current(), record = await decision(h, before.journalSequence + 1, 'DEADLINE');
  const replayed = advanceFullGame(before, record); assert.equal(replayed.advanced, true); assert.deepEqual(replayed.state, state);
  h.state = state; invariants(state);
  const placement = ['JAIL_VOTE', 'RELEASE_VOTE'].includes(before.phase.kind);
  if (placement) {
    await storedViews(h, state);
    if (before.phase.kind === 'RELEASE_VOTE') for (const seat of state.seats) assert.equal(seat.movedInRound, before.seats.find(previous => previous.seatId === seat.seatId).movedInRound);
    else if (state.round > before.round) assert.ok(state.seats.every(seat => seat.movedInRound === false));
  }
  const effects = placement ? await audienceCounts(h) : null;
  assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline(payload)).result, 'unchanged');
  assert.deepEqual(await h.current(), state);
  assert.equal((await h.base.collection('events').get()).size, state.journalSequence, 'Duplicate delivery creates no decision');
  if (placement) { assert.deepEqual(await audienceCounts(h), effects, 'Duplicate delivery creates no placement effects'); await storedViews(h, state); }
}
const seatRef = (h, value) => value === null ? null : value.startsWith('@') ? h.state.seats.find(seat => seat.role === value.slice(1)).seatId : value;
async function submit(h, step) {
  const before = h.state, actorSeatId = seatRef(h, step.actor), command = structuredClone(step.command);
  if ('target' in command) { command.targetSeatId = seatRef(h, command.target); delete command.target; }
  if ('targets' in command) { command.targetSeatIds = command.targets.map(value => seatRef(h, value)); delete command.targets; }
  const request = { protocolVersion: 2, matchId: h.base.id, phaseId: before.phase.id, commandId: randomUUID(), command };
  const uid = h.players[Number(actorSeatId.slice(5)) - 1].uid; h.setTime(before.phase.startedAt + 1);
  const response = FullCommandResponseSchema.parse(await h.service.submit(uid, request));
  assert.equal(response.ok, true, JSON.stringify(response)); assert.equal(response.receipt.status, 'accepted'); assert.equal(response.receipt.code, step.expect);
  const after = await h.current(), record = await decision(h, before.journalSequence + 1, 'COMMAND');
  const replayed = executeFullGame(before, actorSeatId, request, record); assert.deepEqual(replayed.receipt, response.receipt); assert.deepEqual(replayed.state, after);
  const replay = FullCommandResponseSchema.parse(await h.service.submit(uid, request)); assert.deepEqual(replay.receipt, response.receipt);
  assert.deepEqual(await h.current(), after); assert.equal((await h.base.collection('events').get()).size, after.journalSequence);
  h.state = after; invariants(after);
}
function expectations(h, checks) {
  const state = h.state, views = projectFullGame(state);
  const expected = value => Array.isArray(value) ? value.map(item => typeof item === 'string' && item.startsWith('@') ? seatRef(h, item) : item) : value;
  for (const check of checks) {
    let actual;
    if ('truth' in check) actual = state.seats.find(seat => seat.seatId === seatRef(h, check.truth))[check.field];
    else if ('public' in check) actual = views.public.seats.find(seat => seat.seatId === seatRef(h, check.public))[check.field];
    else if ('visible' in check) actual = views.players[seatRef(h, check.visible)].self.movementDestinations;
    else if ('count' in check && check.count.startsWith('occupants:')) actual = state.seats.filter(seat => seat.location === check.count.slice('occupants:'.length)).length;
    else if ('count' in check && check.count === 'captains') actual = state.seats.filter(seat => seat.captain).length;
    else throw new Error('Unsupported independent capacity expectation');
    if ('sameSet' in check) assert.deepEqual([...actual].sort(), expected(check.sameSet).sort());
    else assert.deepEqual(actual, expected(check.equals), JSON.stringify(check));
  }
}
async function journalReplay(h) {
  let state;
  const records = (await h.base.collection('events').orderBy('sequence').get()).docs.map(doc => doc.data());
  assert.equal(records.length, h.state.journalSequence);
  for (const [index, record] of records.entries()) {
    assert.equal(record.sequence, index + 1);
    if (record.kind === 'SETUP') state = createFullGame({ ...record, setup: decodeV1Setup(record.setup) });
    else if (record.kind === 'COMMAND') {
      const evaluated = executeFullGame(state, record.actorSeatId, record.request, record);
      assert.deepEqual(evaluated.receipt, record.receipt); state = evaluated.state;
    } else if (record.kind === 'DEADLINE') { const evaluated = advanceFullGame(state, record); assert.equal(evaluated.advanced, true); state = evaluated.state; }
    else assert.fail('Unexpected journal decision');
    state.journalSequence = record.sequence;
  }
  assert.deepEqual(state, await h.current()); await storedViews(h, state);
  assert.equal((await h.base.collection('receipts').get()).size, records.filter(record => record.kind === 'COMMAND').length);
}
for (const fixture of cases) test(`${fixture.id}: actual service preserves independent expectations, receipts and full canonical journal replay`, async () => {
  const h = await seed(fixture);
  for (const step of fixture.steps) {
    if (step.op === 'until') {
      for (let bound = 0; !(h.state.phase.kind === step.phase && (step.round === undefined || h.state.round === step.round)
        && (step.active === undefined || h.state.activeSeatId === seatRef(h, step.active))); bound++) {
        assert.ok(bound < 500, 'Independent fixture must reach its checkpoint'); await tick(h);
      }
    } else if (step.op === 'expire') for (let i = 0; i < step.times; i++) await tick(h);
    else if (step.op === 'command') await submit(h, step);
    else if (step.op === 'assert') { expectations(h, step.checks); await storedViews(h, h.state); }
    else assert.fail('Unsupported independent operation');
  }
  await journalReplay(h);
});
