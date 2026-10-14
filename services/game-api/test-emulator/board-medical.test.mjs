// Issue #142: legal synthetic initial SETUP; all subsequent state uses real service decisions.
// Auth/Firestore Rules and transactional/replay evidence only. No claim of native setup,
// HTTP auth validation, automatic Tasks delivery, Board-v2 art or human balance.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { BOARD_MEDICAL_FULL_GAME_VERSION_PINS as MEDICAL_PINS,
  PUBLIC_HACK_FULL_GAME_VERSION_PINS as HISTORICAL_PINS } from '@mothership/engine';
import { FullCommandResponseSchema, FullLookupResponseSchema, FullOperationResponseSchema,
  FullEventSchema } from '@mothership/contracts';
import { createV1Service } from '../dist/index.js';
import { assertLocalEmulators, createEmulatorIdentity, firestoreRequest } from '../../../infra/firebase/test/helpers.mjs';
import { startStagedMatch } from './staged-start-helper.mjs';
import { boardMedicalFixture, assertStoredBoard, assertBoardJournal, retryUnavailable,
  deadlinePayload } from './board-medical-helper.mjs';

let app, db;
before(() => {
  assertLocalEmulators();
  assert.equal(MEDICAL_PINS.engineVersion, 'full-game-1.7.0');
  assert.equal(HISTORICAL_PINS.engineVersion, 'full-game-1.6.0');
  app = initializeApp({ projectId: 'demo-mothership' }, `board-medical-${randomUUID()}`);
  db = getFirestore(app);
});
after(async () => { await db?.terminate(); if (app) await deleteApp(app); });
const seat = (state, id) => state.seats.find(value => value.seatId === id);
const position = state => Object.fromEntries(state.seats.map(value => [value.seatId, [value.location, value.slotId]]));
const fixture = (count, options = {}) => boardMedicalFixture(db, count, { pins: MEDICAL_PINS, ...options });
const operation = value => {
  const response = FullOperationResponseSchema.parse(value);
  assert.equal(response.ok, true, JSON.stringify(response)); return response.result;
};
async function jail(h, round, target) {
  const state = await h.until(value => value.round === round && value.phase.kind === 'JAIL_VOTE');
  assert.ok(state.eligibleTargets.includes(target));
  for (const voter of state.eligibleVoters) await h.accept(voter, { type: 'VOTE', targetSeatId: target });
  const result = await h.expire();
  assert.equal(result.phase.kind, 'VOTE_RESULT'); assert.equal(result.lastTally.selectedSeatId, target);
  return result;
}
async function elect(h, round, target) {
  const state = await h.until(value => value.round === round && value.phase.kind === 'CAPTAIN_ELECTION');
  for (const voter of state.eligibleVoters) await h.accept(voter, { type: 'VOTE', targetSeatId: target });
  const result = await h.expire();
  assert.equal(result.phase.kind, 'VOTE_RESULT'); assert.equal(seat(result, target).captain, true);
  return h.expire();
}
async function injure(h, round, { movePatient = false, protectPatient = false } = {}) {
  await h.turn('seat-3', round);
  const attack = await h.accept('seat-3', { type: 'DISABLE', targetSeatId: 'seat-4' });
  let move;
  if (movePatient) {
    await h.turn('seat-4', round);
    move = await h.accept('seat-4', { type: 'MOVE', destination: 'Room B' });
  }
  if (protectPatient) {
    await h.turn('seat-5', round);
    await h.accept('seat-5', { type: 'PROTECT', targetSeatId: 'seat-4' });
  }
  const state = await h.finishRound(round);
  assert.equal(seat(state, 'seat-4').health, 'Injured');
  return { state, attack, move };
}
function episode(state, id, admittedRound, number = 1) {
  const value = seat(state, id);
  assert.equal(value.health, 'Injured'); assert.equal(value.location, 'Hospital');
  assert.equal(value.medicalEpisodeCount, number);
  assert.deepEqual(value.medicalEpisode, { number, admittedRound,
    deathDueAfterRound: admittedRound < 5 ? admittedRound + 1 : null });
}
function medical(view, id, admittedRound, opportunity) {
  assert.deepEqual(seat(view, id).medical, { admittedRound,
    rescueDueAfterRound: admittedRound < 5 ? admittedRound + 1 : null, rescueOpportunity: opportunity });
}
async function assertMedicalPublication(h) {
  const { state, views } = await assertStoredBoard(h);
  const slots = state.seats.map(value => value.slotId);
  assert.equal(new Set(slots).size, state.playerCount, 'Every physical occupant has a unique persistent slot');
  for (const value of views.public.seats) {
    assert.deepEqual(Object.keys(value).sort(),
      ['seatId', 'health', 'location', 'jailed', 'captain', 'revealedFaction', 'slotId', 'medical'].sort());
    if (value.health === 'Injured') {
      assert.equal(value.location, 'Hospital'); assert.ok(value.medical);
      assert.deepEqual(Object.keys(value.medical).sort(), ['admittedRound', 'rescueDueAfterRound', 'rescueOpportunity']);
    } else assert.equal(value.medical, null);
    for (const player of Object.values(views.players)) assert.deepEqual(seat(player, value.seatId), value);
  }
  const { endReveal: _permittedTerminalReveal, ...ordinaryPublic } = views.public;
  assert.doesNotMatch(JSON.stringify(ordinaryPublic), /"(?:medicalEpisode|medicalEpisodeCount|number|role|attackerSeatId|healerSeatId|grantedBy|sourceSeatId)"/);
  const publicEvents = (await h.base.collection('audienceEvents').doc('public').collection('items').get()).docs
    .map(doc => FullEventSchema.parse(doc.data()));
  assert.doesNotMatch(JSON.stringify(publicEvents), /"(?:medicalEpisode|medicalEpisodeCount|role|attackerSeatId|healerSeatId|grantedBy|sourceSeatId|commandId)"/);
  return { state, views };
}

for (const count of [7, 8, 9]) {
  test(`${count}: native creation/admission/setup uses one role-independent joint draw and persists the reviewed medical tuple`, async () => {
    let now = 1_900_000_000_000, shuffles = 0;
    const ranks = [], options = { db, clock: () => now, creationVersions: MEDICAL_PINS,
      assetManifestVersion: 'board-medical-native-fixture-assets-v1',
      shuffle: items => { shuffles++; return [...items]; },
      randomInitialRoom: () => assert.fail('New tuple must use the joint room assignment'),
      randomStartingRoomRank: maximum => {
        assert.equal(shuffles, 0, 'Room assignment precedes and is independent of role/turn randomness');
        ranks.push(maximum); assert.equal(ranks.length, 1, 'Complete recorded rooms cannot redraw'); return 0;
      } };
    const service = createV1Service(options), host = await createEmulatorIdentity();
    const created = operation(await service.createMatch(host.uid,
      { protocolVersion: 2, requestId: randomUUID(), playerCount: count }));
    const base = db.collection('matches').doc(created.matchId);
    assert.deepEqual((await base.collection('engine').doc('gameplayPins').get()).data(), MEDICAL_PINS);
    assert.equal((await base.collection('engine').doc('current').get()).exists, false);
    const ids = Array.from({ length: count }, (_, index) => `seat-${index + 1}`);
    const players = await Promise.all(ids.map(() => createEmulatorIdentity()));
    const request = (fields = {}) => ({ protocolVersion: 2, matchId: base.id, requestId: randomUUID(), ...fields });
    for (const id of [...ids].reverse()) {
      const identity = players[Number(id.slice(5)) - 1];
      const admission = operation(await service.requestAdmission(identity.uid,
        { protocolVersion: 2, requestId: randomUUID(), roomCode: created.roomCode }));
      operation(await service.approveAdmission(host.uid, request({ admissionId: admission.admissionId, seatId: id })));
      if (id !== 'seat-1') assert.equal(ranks.length, 0, 'Partial admission discloses no random room assignment');
    }
    assert.equal(ranks.length, 1); assert.equal(shuffles, 0);
    const h = { base, service, options, host, players, ids, pins: MEDICAL_PINS, request,
      now: () => now, setTime: value => { assert.ok(value >= now); now = value; },
      current: async () => {
        const { decodeV1State } = await import('../dist/full-game.js');
        return decodeV1State((await base.collection('engine').doc('current').get()).data());
      } };
    await startStagedMatch(h);
    const before = await h.current();
    assert.ok(shuffles > 0, 'Role and turn setup has actually run after the room assignment');
    assert.equal(ranks.length, 1);
    for (const room of ['Room A', 'Room B']) {
      const occupants = before.seats.filter(value => value.location === room);
      assert.ok(occupants.length <= 5);
      assert.deepEqual(occupants.map(value => value.slotId), occupants.map((_, i) => `${room === 'Room A' ? 'A' : 'B'}${i + 1}`));
    }
    assert.deepEqual(before.versions, { ...MEDICAL_PINS, assetManifestVersion: options.assetManifestVersion });
    const prepared = (await base.collection('setup').doc('deal').get()).data();
    assert.deepEqual(prepared.versions, before.versions);
    // A recreated service with another new-match default must still execute this saved tuple.
    h.service = createV1Service({ ...options, creationVersions: HISTORICAL_PINS });
    const accepted = FullCommandResponseSchema.parse(await h.service.submit(players[Number(before.activeSeatId.slice(5)) - 1].uid,
      { protocolVersion: 2, matchId: base.id, phaseId: before.phase.id, commandId: randomUUID(), command: { type: 'PASS_TURN' } }));
    assert.equal(accepted.ok, true); assert.equal(accepted.receipt.status, 'accepted');
    assert.deepEqual(position(await h.current()), position(before));
    assert.deepEqual((await base.collection('engine').doc('gameplayPins').get()).data(), MEDICAL_PINS);
    assert.equal(ranks.length, 1);
    await assertMedicalPublication(h); await assertBoardJournal(h);
  });
  test(`${count}: last-slot contention commits one entrant; holes persist and receipt replay survives restart`, async () => {
    const h = await fixture(count, { roomACount: 4 }), initial = await h.current();
    for (const [index, value] of initial.seats.entries()) {
      assert.equal(value.slotId, index < 4 ? `A${index + 1}` : `B${index - 3}`);
      assert.equal(value.medicalEpisodeCount, 0); assert.equal(value.medicalEpisode, null);
    }
    const phaseId = initial.phase.id;
    const requests = ['seat-5', 'seat-6'].map(seatId => ({ seatId, request: {
      protocolVersion: 2, matchId: h.base.id, phaseId, commandId: randomUUID(), command: { type: 'MOVE', destination: 'Room A' },
    } }));
    h.setTime(initial.phase.startedAt + 1);
    const decisions = await Promise.all(requests.map(async value => ({ ...value,
      response: FullCommandResponseSchema.parse(await retryUnavailable(() => h.service.submit(h.uid(value.seatId), value.request))) })));
    assert.ok(decisions.every(value => value.response.ok));
    assert.deepEqual(decisions.map(value => value.response.receipt.status).sort(), ['accepted', 'rejected']);
    const winner = decisions.find(value => value.response.receipt.status === 'accepted');
    const loser = decisions.find(value => value.response.receipt.status === 'rejected');
    assert.equal(loser.response.receipt.code, 'NOT_ALLOWED');
    const committed = await h.current();
    assert.equal(seat(committed, winner.seatId).slotId, 'A5');
    assert.equal(seat(committed, loser.seatId).slotId, seat(initial, loser.seatId).slotId);
    assert.equal(seat(committed, loser.seatId).movedInRound, false);
    assert.equal(committed.seats.filter(value => value.location === 'Room A').length, 5);
    const replayed = await Promise.all(Array.from({ length: 3 }, () => h.service.submit(h.uid(winner.seatId), winner.request)));
    for (const response of replayed) assert.deepEqual(FullCommandResponseSchema.parse(response).receipt, winner.response.receipt);
    assert.deepEqual(await h.current(), committed);
    const conflict = FullCommandResponseSchema.parse(await h.service.submit(h.uid(winner.seatId),
      { ...winner.request, command: { type: 'MOVE', destination: 'Room B' } }));
    assert.equal(conflict.ok, false); assert.equal(conflict.error.code, 'COMMAND_ID_CONFLICT');
    h.service = createV1Service(h.options);
    assert.deepEqual(FullLookupResponseSchema.parse(await h.service.lookup(h.uid(winner.seatId),
      { protocolVersion: 2, matchId: h.base.id, commandId: winner.request.commandId })).receipt, winner.response.receipt);
    const fixed = position(committed);
    await h.accept('seat-2', { type: 'MOVE', destination: 'Room B' });
    const hole = await h.current();
    assert.equal(hole.seats.some(value => value.slotId === 'A2'), false);
    for (const id of h.ids.filter(id => id !== 'seat-2')) assert.deepEqual(position(hole)[id], fixed[id]);
    await h.accept('seat-7', { type: 'MOVE', destination: 'Room A' });
    const filled = await h.current();
    assert.equal(seat(filled, 'seat-7').slotId, 'A2', 'The entrant takes the lowest free hole');
    assert.equal(seat(filled, winner.seatId).slotId, 'A5', 'Existing occupants never compact');
    await assertMedicalPublication(h); await assertBoardJournal(h);
  });

  test(`${count}: injured target moves before resolution, recovers its seat/receipt, is detained in Hospital and heals to Jail`, async () => {
    const h = await fixture(count), { state: admitted, move } = await injure(h, 2, { movePatient: true });
    episode(admitted, 'seat-4', 2);
    assert.equal(seat(admitted, 'seat-4').lastRoom, 'Room B');
    const hospitalSlot = seat(admitted, 'seat-4').slotId;
    const old = h.players[3], replacement = await createEmulatorIdentity();
    const issued = operation(await h.service.issueSeatRecovery(h.host.uid, h.request({ seatId: 'seat-4' })));
    operation(await h.service.redeemSeatRecovery(replacement.uid, h.request({ recoveryToken: issued.recoveryToken })));
    h.players[3] = replacement; h.service = createV1Service(h.options);
    assert.deepEqual(await h.current(), admitted, 'Seat recovery cannot reinterpret slots or medical authority');
    assert.deepEqual(FullCommandResponseSchema.parse(await h.service.submit(replacement.uid, move.request)).receipt, move.receipt);
    const changed = FullCommandResponseSchema.parse(await h.service.submit(replacement.uid,
      { ...move.request, command: { type: 'MOVE', destination: 'Room A' } }));
    assert.equal(changed.ok, false); assert.equal(changed.error.code, 'COMMAND_ID_CONFLICT');
    const denied = FullLookupResponseSchema.parse(await h.service.lookup(old.uid,
      { protocolVersion: 2, matchId: h.base.id, commandId: move.request.commandId }));
    assert.equal(denied.ok, false); assert.equal(denied.error.code, 'FORBIDDEN');
    const ownPath = `${h.base.path}/playerViews/${replacement.uid}`;
    assert.equal((await firestoreRequest(ownPath, { idToken: replacement.idToken })).status, 200);
    for (const identity of [old, h.players[0], h.host, h.display, h.outsider])
      assert.equal((await firestoreRequest(ownPath, { idToken: identity.idToken })).status, 403);
    for (const identity of [replacement, h.host, h.display]) {
      const read = await firestoreRequest(`${h.base.path}/views/public`, { idToken: identity.idToken });
      assert.equal(read.status, 200); assert.doesNotMatch(JSON.stringify(read.body), /medicalEpisode|attackerSeatId|healerSeatId/);
      assert.equal((await firestoreRequest(`${h.base.path}/engine/current`, { idToken: identity.idToken })).status, 403);
    }
    await h.turn('seat-2', 3);
    await h.accept('seat-2', { type: 'RESCUE', targetSeatId: 'seat-4' });
    const detained = await jail(h, 3, 'seat-4');
    assert.equal(seat(detained, 'seat-4').jailed, true);
    assert.equal(seat(detained, 'seat-4').location, 'Hospital');
    assert.equal(seat(detained, 'seat-4').slotId, hospitalSlot);
    medical((await assertMedicalPublication(h)).views.public, 'seat-4', 2, 'CURRENT_NORMAL_ROUND');
    await h.expire();
    const healed = await h.current();
    assert.equal(seat(healed, 'seat-4').health, 'Healthy'); assert.equal(seat(healed, 'seat-4').jailed, true);
    assert.equal(seat(healed, 'seat-4').location, 'Jail'); assert.equal(seat(healed, 'seat-4').slotId, 'J1');
    assert.equal(seat(healed, 'seat-4').medicalEpisode, null); assert.equal(seat(healed, 'seat-4').medicalEpisodeCount, 1);
    const result = await h.send('seat-4', { type: 'RELEASE_CHOICE', targetSeatId: 'seat-4' });
    assert.equal(result.receipt.status, 'rejected'); assert.equal(result.receipt.code, 'NOT_ALLOWED');
    assert.deepEqual(FullCommandResponseSchema.parse(await h.service.submit(replacement.uid, move.request)).receipt, move.receipt);
    await assertMedicalPublication(h); await assertBoardJournal(h);
  });

  for (const admittedRound of [2, 4]) for (const rescue of [false, true]) {
    test(`${count}: R${admittedRound} injury receives R${admittedRound + 1}; ${rescue ? 'registered Rescue precedes death' : 'due death ignores existing protection'}`, async () => {
      const h = await fixture(count), { state: admitted } = await injure(h, admittedRound, { protectPatient: !rescue });
      episode(admitted, 'seat-4', admittedRound);
      const bed = seat(admitted, 'seat-4').slotId;
      medical((await assertMedicalPublication(h)).views.public, 'seat-4', admittedRound, 'CURRENT_NORMAL_ROUND');
      const dueRound = admittedRound + 1;
      if (rescue) {
        await h.turn('seat-2', dueRound);
        await h.accept('seat-2', { type: 'RESCUE', targetSeatId: 'seat-4' });
      } else {
        // Registered in A before injury; active throughout the full due round.
        assert.deepEqual(seat(admitted, 'seat-4').protection,
          { activeFromRound: dueRound, consumed: false, grantedBy: 'seat-5' });
      }
      const state = await h.finishRound(dueRound), value = seat(state, 'seat-4');
      assert.equal(value.health, rescue ? 'Healthy' : 'Eliminated');
      assert.equal(value.medicalEpisode, null); assert.equal(value.medicalEpisodeCount, 1);
      if (rescue) {
        assert.equal(value.location, 'Room A'); assert.equal(value.slotId, 'A4'); assert.equal(value.lastRoom, 'Room A');
      } else {
        assert.equal(value.location, 'Hospital'); assert.equal(value.slotId, bed, 'The eliminated body retains its bed');
        assert.equal(value.protection.consumed, false, 'Automatic death bypasses rather than consumes Protection');
      }
      assert.equal(seat((await assertMedicalPublication(h)).views.public, 'seat-4').medical, null);
      await assertBoardJournal(h);
    });
  }

  test(`${count}: Rescue/no-op cannot create or prolong episodes; a later fresh injury gets a new deadline`, async () => {
    const h = await fixture(count);
    await injure(h, 1);
    await h.turn('seat-2', 2); await h.accept('seat-2', { type: 'RESCUE', targetSeatId: 'seat-4' });
    await h.finishRound(2);
    assert.equal(seat(await h.current(), 'seat-4').medicalEpisodeCount, 1);
    assert.equal(seat(await h.current(), 'seat-4').medicalEpisode, null);
    await h.turn('seat-2', 3); await h.accept('seat-2', { type: 'RESCUE', targetSeatId: 'seat-4' });
    await h.finishRound(3);
    const unchanged = seat(await h.current(), 'seat-4');
    assert.equal(unchanged.health, 'Healthy'); assert.equal(unchanged.medicalEpisodeCount, 1); assert.equal(unchanged.medicalEpisode, null);
    await h.turn('seat-5', 4); await h.accept('seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-4' });
    const reinjured = await h.finishRound(4); episode(reinjured, 'seat-4', 4, 2);
    await h.finishRound(5);
    assert.equal(seat(await h.current(), 'seat-4').health, 'Eliminated');
    assert.equal(seat(await h.current(), 'seat-4').medicalEpisodeCount, 2);
    await assertMedicalPublication(h); await assertBoardJournal(h);
  });

  test(`${count}: two registered hits eliminate before Rescue and retain a Hospital body without a private source leak`, async () => {
    const h = await fixture(count);
    await h.turn('seat-2', 4); await h.accept('seat-2', { type: 'RESCUE', targetSeatId: 'seat-4' });
    await h.turn('seat-3', 4); await h.accept('seat-3', { type: 'DISABLE', targetSeatId: 'seat-4' });
    await h.turn('seat-5', 4); await h.accept('seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-4' });
    const state = await h.finishRound(4), target = seat(state, 'seat-4');
    assert.equal(target.health, 'Eliminated'); assert.equal(target.location, 'Hospital');
    assert.equal(target.slotId, 'H1'); assert.equal(target.medicalEpisode, null); assert.equal(target.medicalEpisodeCount, 1);
    assert.equal(seat(state, 'seat-2').rescuesRemaining, 1, 'Accepted Rescue spends its use but never revives');
    await assertMedicalPublication(h); await assertBoardJournal(h);
  });

  test(`${count}: R5/showdown uses actual rooms, fills the roster-sized Hospital and preserves eliminated-shooter effects`, async () => {
    const h = await fixture(count);
    // Legal votes reduce Blue power at the R5 checkpoint without changing any private state by Admin.
    await jail(h, 1, 'seat-1'); await jail(h, 2, 'seat-2'); await jail(h, 3, 'seat-7');
    await h.turn('seat-3', 5); await h.accept('seat-3', { type: 'DISABLE', targetSeatId: 'seat-4' });
    const showdown = await h.finishRound(5);
    assert.equal(showdown.phase.kind, 'SHOWDOWN'); episode(showdown, 'seat-4', 5);
    medical((await assertMedicalPublication(h)).views.public, 'seat-4', 5, 'NO_ADDITIONAL_ROUND');
    assert.equal(showdown.seats.some(value => value.location === 'Final Zone'), false);
    assert.equal(seat(showdown, 'seat-4').slotId, 'H1');
    for (const id of ['seat-1', 'seat-2', 'seat-7']) {
      assert.equal(seat(showdown, id).location, 'Jail'); assert.equal(seat(showdown, id).jailed, true);
    }
    const fixed = position(showdown);
    for (const [index, id] of h.ids.entries()) {
      const targetSeatId = h.ids[(index + 1) % count];
      await h.accept(id, { type: 'SHOWDOWN_SHOT', targetSeatId });
      assert.deepEqual(position(await h.current()), fixed, 'Shot registration does not transfer participants');
    }
    const finished = await h.expire();
    assert.equal(finished.phase.kind, 'FINISHED'); assert.deepEqual(finished.result, { winner: 'Draw', alienCoWinner: false });
    assert.equal(finished.seats.filter(value => value.location === 'Hospital').length, count);
    assert.deepEqual(new Set(finished.seats.map(value => value.slotId)), new Set(h.ids.map((_, i) => `H${i + 1}`)));
    assert.equal(seat(finished, 'seat-4').health, 'Eliminated'); assert.equal(seat(finished, 'seat-4').slotId, 'H1');
    assert.equal(seat(finished, 'seat-5').health, 'Injured', 'Seat 4 still fires its registered shot after its earlier elimination');
    const { views } = await assertMedicalPublication(h);
    for (const value of finished.seats) {
      assert.equal(value.medicalEpisodeCount, 1);
      if (value.health === 'Injured') medical(views.public, value.seatId, 5, 'CLOSED');
    }
    assert.equal(finished.round, 5); assert.equal(finished.phase.endsAt, null); assert.equal(finished.deadlineToken, null);
    const records = (await h.base.collection('events').get()).size;
    assert.equal((await h.service.runDeadline(deadlinePayload(showdown))).result, 'unchanged');
    assert.deepEqual(await h.current(), finished); assert.equal((await h.base.collection('events').get()).size, records);
    await assertBoardJournal(h);
  });

  test(`${count}: abort closes medical opportunity without moving the patient or admitting a later aging tick`, async () => {
    const h = await fixture(count), { state: admitted } = await injure(h, 1);
    const fixed = position(admitted), episodeBefore = seat(admitted, 'seat-4').medicalEpisode;
    operation(await h.service.abortMatch(h.host.uid, h.request()));
    const state = await h.current(); assert.equal(state.phase.kind, 'ABORTED');
    assert.deepEqual(position(state), fixed); assert.deepEqual(seat(state, 'seat-4').medicalEpisode, episodeBefore);
    medical((await assertMedicalPublication(h)).views.public, 'seat-4', 1, 'CLOSED');
    assert.equal((await h.service.runDeadline(deadlinePayload(admitted))).result, 'unchanged');
    assert.deepEqual(await h.current(), state); await assertBoardJournal(h);
  });

  test(`${count}: exact historical 1.6 keeps old wire, persistent injury and private state without medical episodes`, async () => {
    const h = await fixture(count, { pins: HISTORICAL_PINS });
    await injure(h, 2); const state = await h.finishRound(3);
    assert.equal(seat(state, 'seat-4').health, 'Injured'); assert.equal(seat(state, 'seat-4').location, 'Hospital');
    const { views } = await assertStoredBoard(h);
    for (const view of [views.public, ...Object.values(views.players)]) for (const value of view.seats) {
      assert.equal(Object.hasOwn(value, 'slotId'), false); assert.equal(Object.hasOwn(value, 'medical'), false);
    }
    for (const value of state.seats) {
      assert.equal(Object.hasOwn(value, 'slotId'), false); assert.equal(Object.hasOwn(value, 'medicalEpisode'), false);
      assert.equal(Object.hasOwn(value, 'medicalEpisodeCount'), false);
    }
    assert.deepEqual(state.versions, { ...HISTORICAL_PINS, assetManifestVersion: state.versions.assetManifestVersion });
    await assertBoardJournal(h);
  });

  for (const historical of [false, true]) test(`${count}: ${historical ? '1.6 retains the approved historical release ballot' : 'inactive 1.7 excludes the old release ballot pending Captain companion'}`, async () => {
    const h = await fixture(count, { pins: historical ? HISTORICAL_PINS : MEDICAL_PINS });
    await jail(h, 1, 'seat-4'); await elect(h, 2, 'seat-1');
    const state = await h.until(value => value.round === 2 && ['RELEASE_CHOICE', 'JAIL_VOTE'].includes(value.phase.kind));
    if (historical) {
      assert.equal(state.phase.kind, 'RELEASE_CHOICE');
      await h.accept('seat-1', { type: 'RELEASE_CHOICE', targetSeatId: 'seat-4' });
      const vote = await h.expire(); assert.equal(vote.phase.kind, 'RELEASE_VOTE');
      for (const id of vote.eligibleVoters) await h.accept(id, { type: 'RELEASE_VOTE', approve: true });
      const released = await h.expire();
      assert.equal(seat(released, 'seat-4').jailed, false); assert.equal(seat(released, 'seat-4').location, 'Room A');
    } else {
      assert.equal(state.phase.kind, 'JAIL_VOTE'); assert.equal(state.releaseUsed, false);
      for (const command of [{ type: 'RELEASE_CHOICE', targetSeatId: 'seat-4' }, { type: 'RELEASE_VOTE', approve: true }]) {
        const response = await h.send('seat-1', command);
        assert.equal(response.receipt.status, 'rejected'); assert.equal(response.receipt.code, 'NOT_ALLOWED');
      }
    }
    await assertStoredBoard(h); await assertBoardJournal(h);
  });
}
