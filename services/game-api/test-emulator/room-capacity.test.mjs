import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { FullOperationResponseSchema, FullSetPracticeBotsResponseSchema, FullCommandResponseSchema, FullBeginSetupResponseSchema, FullAdvanceResponseSchema, FullPublicViewSchema, FullPlayerViewSchema, OwnAcknowledgmentsSchema } from '@mothership/contracts';
import { FULL_GAME_VERSION_PINS, PASS_FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS, createFullGame, executeFullGame, advanceFullGame, projectFullGame, projectOwnAcknowledgments } from '@mothership/engine';
import { createV1Service } from '../dist/index.js';
import { decodeV1Setup, decodeV1State, encodeV1State } from '../dist/full-game.js';
import { startStagedMatch, beginStagedSetup, confirmStagedChoices } from './staged-start-helper.mjs';
import { assertLocalEmulators, createEmulatorIdentity } from '../../../infra/firebase/test/helpers.mjs';

let app, db, serial = 0;
before(() => { assertLocalEmulators(); app = initializeApp({ projectId: 'demo-mothership' }, `room-capacity-${randomUUID()}`); db = getFirestore(app); });
after(async () => { await db?.terminate(); if (app) await deleteApp(app); });
const op = response => { FullOperationResponseSchema.parse(response); assert.equal(response.ok, true, JSON.stringify(response)); return response.result; };
const bots = response => { FullSetPracticeBotsResponseSchema.parse(response); assert.equal(response.ok, true, JSON.stringify(response)); return response; };
const roomCounts = rooms => Object.fromEntries(['Room A', 'Room B'].map(room => [room, rooms.filter(value => value === room).length]));

async function harness({ count = 9, versions = FULL_GAME_VERSION_PINS, preferences = Array(20).fill('Room A') } = {}) {
  let now = 1_600_000_000_000 + ++serial * 100_000_000, draws = 0, shuffles = 0, forbidDraw = false;
  const options = { db, clock: () => now, shuffle: items => { shuffles++; return [...items]; }, randomInitialRoom: () => {
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
  return { service, options, host, base, created, request, players: [], draws: () => draws, shuffles: () => shuffles,
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

for (const count of [7, 8, 9]) test(`${count} human admissions keep one preference each, cap their stored rooms and launch the same deal`, async () => {
  const h = await harness({ count }); await humans(h, count);
  const bindings = await h.bindings(), expected = Object.fromEntries(Object.entries(bindings).map(([id, binding]) => [id, binding.initialRoom]));
  assert.deepEqual(roomCounts(Object.values(expected)), { 'Room A': 5, 'Room B': count - 5 });
  assert.equal(h.draws(), count); assert.equal(h.shuffles(), 0, 'Admission consumes no role or turn randomness');
  h.forbidDraw(); await startStagedMatch(h);
  const state = await h.current(), deal = (await h.base.collection('setup').doc('deal').get()).data();
  assert.deepEqual(decodeV1Setup(deal.setup).initialRooms, expected); assert.deepEqual(state.setup.initialRooms, expected);
  assert.deepEqual(Object.fromEntries(state.seats.map(seat => [seat.seatId, seat.location])), expected);
  assert.deepEqual(state.versions, { ...FULL_GAME_VERSION_PINS, assetManifestVersion: state.versions.assetManifestVersion });
  assert.equal(state.phase.endsAt - state.phase.startedAt, 60_000);
  const recovery = op(await h.service.issueSeatRecovery(h.host.uid, h.request({ seatId: 'seat-1' })));
  const replacement = await createEmulatorIdentity();
  op(await h.service.redeemSeatRecovery(replacement.uid, h.request({ recoveryToken: recovery.recoveryToken })));
  assert.deepEqual(await h.current(), state); assert.equal((await h.bindings())['seat-1'].initialRoom, expected['seat-1']);
  await replay(h);
});

for (const count of [7, 8, 9]) test(`${count} all-bot roster caps initial rooms without rerolling retained or replayed assignments`, async () => {
  const h = await harness({ count }), added = await configure(h, count), before = await h.bindings();
  assert.deepEqual(roomCounts(Object.values(before).map(binding => binding.initialRoom)), { 'Room A': 5, 'Room B': count - 5 });
  assert.equal(h.draws(), count); h.forbidDraw();
  await configure(h, count, added.body); await configure(h, count);
  assert.deepEqual(await h.bindings(), before);
  await startStagedMatch(h); assert.deepEqual((await h.current()).setup.initialRooms,
    Object.fromEntries(Object.entries(before).map(([id, binding]) => [id, binding.initialRoom])));
  await replay(h);
});

test('concurrent approvals compete for the last Room A place and persist the redirected admission', async () => {
  const h = await harness({ preferences: [...Array(4).fill('Room A'), ...Array(3).fill('Room B'), 'Room A', 'Room A'] });
  await humans(h, 7);
  const entries = await Promise.all([pending(h), pending(h)]);
  for (const entry of entries) assert.equal((await h.base.collection('admissions').doc(entry.result.admissionId).get()).get('initialRoom'), 'Room A');
  assert.equal(Object.keys(await h.bindings()).length, 7, 'Pending requests do not consume occupancy');
  const bodies = entries.map((entry, index) => h.request({ admissionId: entry.result.admissionId, seatId: `seat-${index + 8}` }));
  const first = await Promise.all(bodies.map(body => h.service.approveAdmission(h.host.uid, body)));
  for (let index = 0; index < entries.length; index++) op(await settle(first[index], () => h.service.approveAdmission(h.host.uid, bodies[index]), FullOperationResponseSchema));
  const bindings = await h.bindings();
  assert.deepEqual(roomCounts(Object.values(bindings).map(binding => binding.initialRoom)), { 'Room A': 5, 'Room B': 4 });
  assert.deepEqual(['seat-8', 'seat-9'].map(id => bindings[id].initialRoom).sort(), ['Room A', 'Room B']);
  for (let index = 0; index < entries.length; index++) {
    const admission = await h.base.collection('admissions').doc(entries[index].result.admissionId).get();
    assert.equal(admission.get('status'), 'approved'); assert.equal(admission.get('initialRoom'), bindings[`seat-${index + 8}`].initialRoom);
    op(await h.service.approveAdmission(h.host.uid, bodies[index]));
  }
  assert.deepEqual(await h.bindings(), bindings); assert.equal(h.draws(), 9, 'Neither approval nor replay redraws');
});

for (const count of [7, 8, 9]) test(`${count} seats: concurrent Moves reserve one last place and durable rejection survives returned space`, async () => {
  const h = await harness({ count, preferences: [...Array(4).fill('Room A'), ...Array(count - 4).fill('Room B')] });
  await humans(h, count); await startStagedMatch(h);
  const before = await h.current(), bodies = [5, 6].map(() => command(h, before, { type: 'MOVE', destination: 'Room A' }));
  const initial = await Promise.all(bodies.map((body, index) => submit(h, index + 5, body)));
  const responses = await Promise.all(initial.map((response, index) => settle(response, () => submit(h, index + 5, bodies[index]), FullCommandResponseSchema)));
  for (const response of responses) assert.equal(response.ok, true);
  assert.deepEqual(responses.map(response => response.receipt.status).sort(), ['accepted', 'rejected']);
  const loser = responses.findIndex(response => response.receipt.status === 'rejected'), after = await h.current();
  assert.equal(responses[loser].receipt.code, 'NOT_ALLOWED');
  assert.deepEqual(roomCounts(after.seats.map(seat => seat.location)), { 'Room A': 5, 'Room B': count - 5 });
  assert.equal(after.seats[loser + 4].movedInRound, false, 'The losing command spends no movement');
  assert.equal(projectFullGame(after).players[`seat-${loser + 5}`].self.movementDestinations.includes('Room A'), false);
  const leave = await submit(h, 1, command(h, after, { type: 'MOVE', destination: 'Room B' }));
  assert.equal(leave.receipt.status, 'accepted');
  const restoredSpace = await h.current();
  assert.equal(projectFullGame(restoredSpace).players[`seat-${loser + 5}`].self.movementDestinations.includes('Room A'), true);
  const retried = await submit(h, loser + 5, bodies[loser]);
  assert.deepEqual(retried.receipt, responses[loser].receipt); assert.deepEqual(await h.current(), restoredSpace);
  assert.equal((await h.base.collection('receipts').get()).size, 3, 'Each immutable command has one durable decision');
  assert.equal((await h.base.collection('events').where('kind', '==', 'COMMAND').get()).size, 3);
  await replay(h);
});

for (const [label, versions] of [['Pass', PASS_FULL_GAME_VERSION_PINS], ['legacy', LEGACY_FULL_GAME_VERSION_PINS], ['missing', null]]) {
  test(`${label} stored lobby preserves uncapped human/bot rooms, its exact launch versions and journal replay`, async () => {
    const h = await harness({ versions }); await humans(h, 1); await configure(h, 8);
    const bindings = await h.bindings(); assert.ok(Object.values(bindings).every(binding => binding.initialRoom === 'Room A'));
    h.forbidDraw(); await startStagedMatch(h);
    const state = await h.current(), expected = versions ?? LEGACY_FULL_GAME_VERSION_PINS;
    assert.deepEqual(state.versions, { ...expected, assetManifestVersion: state.versions.assetManifestVersion });
    assert.ok(state.seats.every(seat => seat.location === 'Room A'));
    const body = command(h, state, { type: 'MOVE', destination: 'Room B' });
    const first = await submit(h, 1, body); assert.equal(first.receipt.status, 'accepted');
    assert.deepEqual((await submit(h, 1, body)).receipt, first.receipt); await replay(h);
    assert.equal(h.draws(), 9);
  });
}

test('new-capacity corruption fails closed at selection and dealing without rewriting rooms or pins', async () => {
  const h = await harness(); await configure(h, 9);
  await h.base.collection('seats').doc('seat-6').update({ initialRoom: 'Room A' });
  const before = await h.bindings();
  const failed = FullBeginSetupResponseSchema.parse(await h.service.beginSetup(h.host.uid, { schemaVersion: 1, ...h.request() }));
  assert.equal(failed.ok, false); assert.equal(failed.error.code, 'UNAVAILABLE');
  assert.equal((await h.base.collection('setup').doc('public').get()).get('stage'), 'lobby');
  assert.equal((await h.base.collection('engine').doc('current').get()).exists, false); assert.deepEqual(await h.bindings(), before);
  await h.base.collection('seats').doc('seat-6').update({ initialRoom: 'Room B' });
  await beginStagedSetup(h);
  await h.base.collection('seats').doc('seat-6').update({ initialRoom: 'Room A' });
  // Deliver the real current selection intent with an injected local trusted clock.
  const setup = (await h.base.collection('setup').doc('public').get()).data(); h.setTime(setup.choosingEndsAt);
  const intent = (await h.base.collection('setupOutbox').get()).docs.find(doc => doc.get('stage') === 'choosing').data();
  assert.equal((await h.service.runSetupDeadline({ matchId: h.base.id, setupId: intent.setupId, stage: intent.stage, deadlineToken: intent.deadlineToken })).status, 'failed');
  assert.equal((await h.base.collection('setup').doc('deal').get()).exists, false);
  assert.equal((await h.base.collection('engine').doc('current').get()).exists, false);
  assert.deepEqual((await h.base.collection('engine').doc('gameplayPins').get()).data(), FULL_GAME_VERSION_PINS);
});


test('a corrupt prepared capacity deal cannot launch gameplay or change its pinned version', async () => {
  const h = await harness(); await configure(h, 9); await beginStagedSetup(h); await confirmStagedChoices(h);
  const dealRef = h.base.collection('setup').doc('deal'), deal = (await dealRef.get()).data();
  deal.setup.initialRooms['seat-6'] = 'Room A';
  await dealRef.set(deal);
  h.setTime(deal.readingEndsAt);
  const intent = (await h.base.collection('setupOutbox').get()).docs.find(doc => doc.get('stage') === 'awaiting-ready').data();
  assert.equal((await h.service.runSetupDeadline({ matchId: h.base.id, setupId: intent.setupId, stage: intent.stage, deadlineToken: intent.deadlineToken })).status, 'failed');
  assert.equal((await h.base.collection('control').doc('session').get()).get('status'), 'awaiting-ready');
  assert.equal((await h.base.collection('engine').doc('current').get()).exists, false);
  assert.equal((await h.base.collection('events').get()).size, 0);
  assert.deepEqual((await dealRef.get()).get('versions'), deal.versions);
  assert.deepEqual((await h.base.collection('engine').doc('gameplayPins').get()).data(), FULL_GAME_VERSION_PINS);
});


// Focused local Admin predecessors isolate the capacity rule from a complete game
// history. Every roster starts through real admission/setup; the labeled health,
// phase and already-registered-effect fixture is then stored with the production
// codec. The service's actual deadline decision is replayed from that predecessor.
// This is not a claim that its earlier SETUP journal reaches an injected state.
const ownSeat = (state, seatId) => state.seats.find(seat => seat.seatId === seatId);
const occupancy = (state, location) => state.seats.filter(seat => seat.location === location).length;
function assertPhysicalCaps(state) {
  for (const location of ['Room A', 'Room B', 'Hospital', 'Jail']) assert.ok(occupancy(state, location) <= 5, `${location} exceeds five`);
  assert.ok(occupancy(state, 'Command Room') <= 1);
  for (const seat of state.seats.filter(seat => seat.location === 'Command Room')) assert.equal(seat.captain, true);
  assert.equal(new Set(state.seats.map(seat => seat.seatId)).size, state.playerCount);
}
function deadlinePhase(h, state, kind = 'JAIL_VOTE', targetSeatId = null) {
  state.phase = { id: randomUUID(), kind, startedAt: h.now(), endsAt: h.now() + 60_000 };
  state.deadlineToken = randomUUID(); state.activeSeatId = null; state.pendingHack = null; state.activeHack = null;
  state.turnIndex = state.turnOrder.length;
  state.eligibleVoters = state.seats.filter(seat => seat.health !== 'Eliminated').map(seat => seat.seatId);
  state.eligibleTargets = kind === 'JAIL_VOTE' ? state.seats.filter(seat => seat.health !== 'Eliminated' && !seat.jailed).map(seat => seat.seatId) : [];
  state.releaseTargetSeatId = targetSeatId;
  state.ballots = kind === 'RELEASE_VOTE' ? state.eligibleVoters.map(voterSeatId => ({ voterSeatId, targetSeatId: null, approve: true })) : [];
  if (kind === 'RELEASE_VOTE') { state.releaseUsed = true; state.releaseChoiceMade = true; }
  return state;
}
async function humanGame(count) {
  const h = await harness({ count }); await humans(h, count); h.forbidDraw(); await startStagedMatch(h);
  assert.deepEqual((await h.current()).seats.map(seat => seat.role),
    ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien', ...(count >= 8 ? ['Red Disabler'] : []), ...(count === 9 ? ['Officer'] : [])]);
  return h;
}
async function storePredecessor(h, state) {
  assertPhysicalCaps(state);
  assert.deepEqual(state.versions, { ...FULL_GAME_VERSION_PINS, assetManifestVersion: state.versions.assetManifestVersion });
  const views = projectFullGame(state), bindings = await h.bindings(), batch = db.batch();
  batch.set(h.base.collection('engine').doc('current'), encodeV1State(state));
  batch.set(h.base.collection('views').doc('public'), FullPublicViewSchema.parse(views.public));
  for (const [seatId, binding] of Object.entries(bindings)) {
    assert.equal(binding.controller ?? 'human', 'human');
    batch.set(h.base.collection('playerViews').doc(binding.uid), FullPlayerViewSchema.parse(views.players[seatId]));
    batch.set(h.base.collection('ownAcknowledgments').doc(binding.uid), projectOwnAcknowledgments(state, seatId, binding.bindingRevision));
  }
  await batch.commit(); assert.deepEqual(await h.current(), state);
}
async function assertStoredViews(h, state) {
  assertPhysicalCaps(state);
  const views = projectFullGame(state), bindings = await h.bindings();
  assert.deepEqual(FullPublicViewSchema.parse((await h.base.collection('views').doc('public').get()).data()), views.public);
  for (const [seatId, binding] of Object.entries(bindings)) {
    assert.deepEqual(FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(binding.uid).get()).data()), views.players[seatId]);
    assert.deepEqual(OwnAcknowledgmentsSchema.parse((await h.base.collection('ownAcknowledgments').doc(binding.uid).get()).data()),
      projectOwnAcknowledgments(state, seatId, binding.bindingRevision));
  }
  assert.deepEqual((await h.base.collection('engine').doc('gameplayPins').get()).data(), FULL_GAME_VERSION_PINS);
}
async function audienceItemCounts(h) {
  const keys = ['public', ...Object.keys(await h.bindings()).map(seatId => `p-${seatId}`)];
  return Promise.all(keys.map(async key => [key, (await h.base.collection('audienceEvents').doc(key).collection('items').get()).size]));
}
async function storedDeadline(h, before, inject = true) {
  if (inject) await storePredecessor(h, before);
  else assert.deepEqual(await h.current(), before);
  const originalCount = (await h.base.collection('events').get()).size;
  h.setTime(before.phase.endsAt);
  const payload = { matchId: h.base.id, phaseId: before.phase.id, deadlineToken: before.deadlineToken };
  const response = FullAdvanceResponseSchema.parse(await h.service.runDeadline(payload));
  assert.equal(response.result, 'advanced', JSON.stringify(response));
  const after = await h.current(); await assertStoredViews(h, after);
  const records = (await h.base.collection('events').get()).docs.map(doc => doc.data());
  assert.equal(records.length, originalCount + 1);
  const decisions = records.filter(record => record.kind === 'DEADLINE' && record.phaseId === payload.phaseId);
  assert.equal(decisions.length, 1, 'One canonical decision per delivered phase');
  const replayed = advanceFullGame(before, decisions[0]);
  assert.equal(replayed.advanced, true); assert.deepEqual(replayed.state, after);
  const effectsAfter = await audienceItemCounts(h);
  assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline(payload)).result, 'unchanged');
  assert.deepEqual(await h.current(), after); await assertStoredViews(h, after);
  assert.equal((await h.base.collection('events').get()).size, originalCount + 1);
  assert.deepEqual(await audienceItemCounts(h), effectsAfter, 'Duplicate delivery emits no additional placement or phase effects');
  return after;
}

for (const count of [7, 8, 9]) {
  test(`${count} seats: stored deadline counts an Eliminated Hospital occupant, waits and reconsiders a later vacant bed`, async () => {
    const h = await humanGame(count), predecessor = await h.current();
    for (const seat of predecessor.seats.slice(0, 5)) Object.assign(seat, { location: 'Hospital', health: 'Injured' });
    ownSeat(predecessor, 'seat-1').health = 'Eliminated';
    Object.assign(ownSeat(predecessor, 'seat-6'), { health: 'Injured', location: 'Room B' });
    const waiting = await storedDeadline(h, deadlinePhase(h, predecessor));
    assert.equal(occupancy(waiting, 'Hospital'), 5);
    assert.equal(ownSeat(waiting, 'seat-6').location, 'Room B'); assert.equal(ownSeat(waiting, 'seat-6').health, 'Injured');
    assert.equal(ownSeat(waiting, 'seat-6').movedInRound, false);
    // This case isolates a bed already vacant before a later checkpoint. The
    // owner-approved same-checkpoint departure and entry order is tested below.
    const later = structuredClone(waiting);
    Object.assign(ownSeat(later, 'seat-2'), { health: 'Healthy', location: 'Room A' });
    const admitted = await storedDeadline(h, deadlinePhase(h, later));
    assert.equal(ownSeat(admitted, 'seat-6').location, 'Hospital'); assert.equal(occupancy(admitted, 'Hospital'), 5);
    assert.equal(ownSeat(admitted, 'seat-1').location, 'Hospital'); assert.equal(ownSeat(admitted, 'seat-1').health, 'Eliminated');
    assert.equal(ownSeat(admitted, 'seat-6').movedInRound, false);
  });

  test(`${count} seats: stored Rescue deadline returns a healed patient to the other ordinary room`, async () => {
    const h = await humanGame(count), predecessor = await h.current();
    Object.assign(ownSeat(predecessor, 'seat-6'), { health: 'Injured', location: 'Hospital', lastRoom: 'Room A' });
    Object.assign(ownSeat(predecessor, 'seat-2'), { rescuesRemaining: 1, mainActionUsedRound: predecessor.round });
    predecessor.queued = [{ actorSeatId: 'seat-2', commandId: randomUUID(), command: { type: 'RESCUE', targetSeatId: 'seat-6' } }];
    const healed = await storedDeadline(h, deadlinePhase(h, predecessor));
    assert.equal(ownSeat(healed, 'seat-6').health, 'Healthy'); assert.equal(ownSeat(healed, 'seat-6').location, 'Room B');
    assert.equal(occupancy(healed, 'Room A'), 5); assert.equal(ownSeat(healed, 'seat-6').movedInRound, false);
    assert.equal(ownSeat(healed, 'seat-2').rescuesRemaining, 1, 'Deadline does not spend an already registered Rescue again');
  });

  test(`${count} seats: stored Healthy release falls back without spending or resetting voluntary movement`, async () => {
    for (const movedInRound of [false, true]) {
      const h = await humanGame(count), predecessor = await h.current();
      Object.assign(ownSeat(predecessor, 'seat-6'), { location: 'Jail', jailed: true, lastRoom: 'Room A', movedInRound });
      Object.assign(ownSeat(predecessor, 'seat-7'), { captain: true, location: 'Command Room' });
      const released = await storedDeadline(h, deadlinePhase(h, predecessor, 'RELEASE_VOTE', 'seat-6'));
      assert.equal(ownSeat(released, 'seat-6').location, 'Room B'); assert.equal(ownSeat(released, 'seat-6').jailed, false);
      assert.equal(ownSeat(released, 'seat-6').health, 'Healthy'); assert.equal(ownSeat(released, 'seat-6').movedInRound, movedInRound);
      assert.equal(released.releaseUsed, true); assert.equal(occupancy(released, 'Room A'), 5);
    }
  });

  test(`${count} seats: stored Injured release waits physically in Jail free until a later Hospital vacancy`, async () => {
    const h = await humanGame(count), predecessor = await h.current();
    for (const seat of predecessor.seats.slice(0, 5)) Object.assign(seat, { location: 'Hospital', health: 'Injured' });
    Object.assign(ownSeat(predecessor, 'seat-6'), { health: 'Injured', location: 'Jail', jailed: true });
    Object.assign(ownSeat(predecessor, 'seat-7'), { captain: true, location: 'Command Room' });
    const released = await storedDeadline(h, deadlinePhase(h, predecessor, 'RELEASE_VOTE', 'seat-6'));
    assert.equal(ownSeat(released, 'seat-6').jailed, false); assert.equal(ownSeat(released, 'seat-6').location, 'Jail');
    assert.equal(ownSeat(released, 'seat-6').health, 'Injured'); assert.equal(ownSeat(released, 'seat-6').movedInRound, false);
    assert.deepEqual(projectFullGame(released).players['seat-6'].self.movementDestinations, []);
    assert.equal(occupancy(released, 'Hospital'), 5);
    const waiting = await storedDeadline(h, released, false);
    assert.equal(ownSeat(waiting, 'seat-6').location, 'Jail'); assert.equal(ownSeat(waiting, 'seat-6').jailed, false);
    const later = structuredClone(waiting);
    Object.assign(ownSeat(later, 'seat-1'), { health: 'Healthy', location: 'Room A' });
    const admitted = await storedDeadline(h, deadlinePhase(h, later));
    assert.equal(ownSeat(admitted, 'seat-6').location, 'Hospital'); assert.equal(ownSeat(admitted, 'seat-6').jailed, false);
    assert.equal(ownSeat(admitted, 'seat-6').movedInRound, false);
  });

  test(`${count} seats: stored injury and Rescue preserve Captain loss with ordinary-room fallback`, async () => {
    const h = await humanGame(count), predecessor = await h.current();
    Object.assign(ownSeat(predecessor, 'seat-1'), { captain: true, location: 'Command Room', lastRoom: 'Room A' });
    Object.assign(ownSeat(predecessor, 'seat-6'), { location: 'Room A', lastRoom: 'Room A' });
    Object.assign(ownSeat(predecessor, 'seat-3'), { disablerSpent: true, mainActionUsedRound: predecessor.round });
    Object.assign(ownSeat(predecessor, 'seat-2'), { rescuesRemaining: 1, mainActionUsedRound: predecessor.round });
    // Both registrations predate the Captain's Command move. Subsequent target
    // location cannot cancel either accepted effect (V1-06/V1-07).
    predecessor.queued = [
      { actorSeatId: 'seat-2', commandId: randomUUID(), command: { type: 'RESCUE', targetSeatId: 'seat-1' } },
      { actorSeatId: 'seat-3', commandId: randomUUID(), command: { type: 'DISABLE', targetSeatId: 'seat-1' } },
    ];
    const resolved = await storedDeadline(h, deadlinePhase(h, predecessor));
    assert.equal(ownSeat(resolved, 'seat-1').captain, false); assert.equal(ownSeat(resolved, 'seat-1').health, 'Healthy');
    assert.equal(ownSeat(resolved, 'seat-1').location, 'Room B'); assert.equal(ownSeat(resolved, 'seat-1').movedInRound, false);
    assert.equal(occupancy(resolved, 'Room A'), 5); assert.equal(occupancy(resolved, 'Command Room'), 0);
    assert.equal(ownSeat(resolved, 'seat-3').disablerSpent, true); assert.equal(ownSeat(resolved, 'seat-2').rescuesRemaining, 1);
  });

  test(`${count} seats: stored injured Captain vacates Command and waits outside a full Hospital`, async () => {
    const h = await humanGame(count), predecessor = await h.current();
    for (const seat of predecessor.seats.slice(0, 5)) Object.assign(seat, { location: 'Hospital', health: 'Injured' });
    Object.assign(ownSeat(predecessor, 'seat-6'), { captain: true, location: 'Command Room', lastRoom: 'Room B' });
    Object.assign(ownSeat(predecessor, 'seat-3'), { disablerSpent: true, mainActionUsedRound: predecessor.round });
    // Valid earlier registration survives the actor's later injury and the target's
    // later Command move; five beds plus the Captain and other seats fit every mode.
    predecessor.queued = [{ actorSeatId: 'seat-3', commandId: randomUUID(), command: { type: 'DISABLE', targetSeatId: 'seat-6' } }];
    const resolved = await storedDeadline(h, deadlinePhase(h, predecessor));
    assert.equal(ownSeat(resolved, 'seat-6').captain, false); assert.equal(ownSeat(resolved, 'seat-6').health, 'Injured');
    assert.equal(ownSeat(resolved, 'seat-6').location, 'Room B'); assert.equal(ownSeat(resolved, 'seat-6').movedInRound, false);
    assert.equal(occupancy(resolved, 'Command Room'), 0); assert.equal(occupancy(resolved, 'Hospital'), 5);
    assert.equal(ownSeat(resolved, 'seat-3').disablerSpent, true);
  });
}


for (const count of [7, 8, 9]) test(`${count} seats: stored deadline frees healed Hospital places before waiting entrants compete in seat order`, async () => {
  const h = await humanGame(count), predecessor = await h.current();
  for (const seat of predecessor.seats.slice(0, 4)) Object.assign(seat, { location: 'Hospital', health: 'Injured' });
  for (const seatId of ['seat-5', 'seat-6']) Object.assign(ownSeat(predecessor, seatId), { location: 'Room B', health: 'Injured' });
  // The already-healed patient comes after both waiting entrants in the stored
  // seat array. Its departure must be processed before either entry attempt.
  // Four remaining patients plus two entrants plus this patient fit all modes.
  Object.assign(ownSeat(predecessor, 'seat-7'), { location: 'Hospital', health: 'Healthy', lastRoom: 'Room B' });
  assert.equal(occupancy(predecessor, 'Hospital'), 5);
  assert.deepEqual(predecessor.seats.slice(4, 7).map(seat => seat.seatId), ['seat-5', 'seat-6', 'seat-7']);
  const resolved = await storedDeadline(h, deadlinePhase(h, predecessor));
  assert.equal(ownSeat(resolved, 'seat-7').location, 'Room B'); assert.equal(ownSeat(resolved, 'seat-7').health, 'Healthy');
  assert.equal(ownSeat(resolved, 'seat-5').location, 'Hospital', 'Earlier stored seat takes the freshly freed place');
  assert.equal(ownSeat(resolved, 'seat-6').location, 'Room B', 'Later stored seat waits when that place has been taken');
  assert.equal(ownSeat(resolved, 'seat-5').health, 'Injured'); assert.equal(ownSeat(resolved, 'seat-6').health, 'Injured');
  assert.deepEqual(resolved.seats.filter(seat => seat.location === 'Hospital').map(seat => seat.seatId),
    ['seat-1', 'seat-2', 'seat-3', 'seat-4', 'seat-5']);
  for (const seatId of ['seat-5', 'seat-6', 'seat-7']) assert.equal(ownSeat(resolved, seatId).movedInRound, false);
  assert.equal(occupancy(resolved, 'Hospital'), 5); assert.equal(resolved.round, predecessor.round + 1);
});
