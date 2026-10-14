// Exact 1.9 Auth/Firestore acceptance. Native admission/staged setup cases are named.
// Other histories begin with a legal synthetic initial SETUP, then service decisions.
// No midmatch Admin edits, automatic Functions/Tasks, phone/art or Balance claim.
// Body-inclusive block observers are separately labelled constructed engine fixtures;
// fresh legal 1.9 histories produce bodies only in Hospital or off-board.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { BLACKOUT_FULL_GAME_VERSION_PINS as PINS,
  CAPTAIN_OUTCOMES_FULL_GAME_VERSION_PINS as OLD, projectFullGame } from '@mothership/engine';
import { FullCommandResponseSchema, FullAdvanceResponseSchema, FullLookupResponseSchema,
  FullOperationResponseSchema, FullPublicViewSchema, FullPlayerViewSchema, FullEventSchema, OwnAcknowledgmentsSchema } from '@mothership/contracts';
import { createV1Service } from '../dist/index.js';
import { decodeV1State } from '../dist/full-game.js';
import { assertLocalEmulators, createEmulatorIdentity, firestoreRequest,
  firestoreEventQuery } from '../../../infra/firebase/test/helpers.mjs';
import { startStagedMatch } from './staged-start-helper.mjs';
import { boardMedicalFixture, assertStoredBoard, assertBoardJournal, retryUnavailable,
  deadlinePayload } from './board-medical-helper.mjs';
let app, db;
before(() => {
  assertLocalEmulators(); assert.equal(PINS.engineVersion, 'full-game-1.9.0');
  assert.equal(PINS.rulesetHash, '7784630d4e6a51f7a8e6c89873dfab479b5281f10ddbcb4918503525096ed7a0');
  assert.equal(OLD.engineVersion, 'full-game-1.8.0');
  app = initializeApp({ projectId: 'demo-mothership' }, `blackout-${randomUUID()}`); db = getFirestore(app);
});
after(async () => { await db?.terminate(); if (app) await deleteApp(app); });
const seat = (state, id) => state.seats.find(s => s.seatId === id);
const fixture = count => boardMedicalFixture(db, count, { pins: PINS });
const label = (count, words) => `${count} (synthetic legal SETUP): ${words}`;
const op = value => { const r = FullOperationResponseSchema.parse(value); assert.equal(r.ok, true, JSON.stringify(r)); return r.result; };
const request = (h, state, command, commandId = randomUUID()) => ({ protocolVersion: 2, matchId: h.base.id, phaseId: state.phase.id, commandId, command });
const deliver = async (h, actor, body) => FullCommandResponseSchema.parse(await retryUnavailable(() => h.service.submit(h.uid(actor), body)));
async function storedViews(h) {
  const publicView = FullPublicViewSchema.parse((await h.base.collection('views').doc('public').get()).data());
  const players = Object.fromEntries(await Promise.all(h.players.map(async (identity, index) => [
    `seat-${index + 1}`, FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(identity.uid).get()).data()),
  ]))); return { public: publicView, players };
}
async function eventDocs(h, key = 'public') {
  return (await h.base.collection('audienceEvents').doc(key).collection('items').get()).docs
    .map(doc => ({ id: doc.id, event: FullEventSchema.parse(doc.data()) }));
}
const events = async (h, key) => (await eventDocs(h, key)).map(v => v.event);
const blocks = async (h, key) => (await events(h, key)).filter(v => v.fact.type === 'ATTACK_BLOCKED');
async function checkpoint(h, predicate) {
  let state = await h.current();
  for (let step = 0; !predicate(state); step++) {
    assert.ok(step < 120 && state.phase.endsAt !== null, `History stopped at ${state.round}/${state.phase.kind}`);
    h.setTime(Math.max(h.now(), state.phase.endsAt));
    const r = FullAdvanceResponseSchema.parse(await retryUnavailable(() => h.service.runDeadline(deadlinePayload(state))));
    assert.equal(r.result, 'advanced'); state = await h.current();
  } return state;
}
const blackout = (h, round) => checkpoint(h, s => s.round === round && s.phase.kind === 'BLACKOUT');
async function vote(h, round, kind, target) {
  const state = await h.until(s => s.round === round && s.phase.kind === kind); assert.ok(state.eligibleTargets.includes(target));
  for (const voter of state.eligibleVoters) await h.accept(voter, { type: 'VOTE', targetSeatId: target });
  const result = await h.expire(); assert.equal(result.phase.kind, 'VOTE_RESULT'); return result;
}
function selection(state, actor, slotId) {
  const t = projectFullGame(state).players[actor].self.blackoutTargeting;
  assert.ok(t, `${actor} needs its own authoritative admission`);
  return { type: 'SELECT_BLACKOUT_SLOT', snapshotId: t.snapshotId, room: t.room, slotId };
}
async function select(h, actor, slotId) {
  const state = await h.current(); h.setTime(Math.max(h.now(), state.phase.startedAt + 5_000));
  return h.accept(actor, selection(state, actor, slotId));
}
async function assertWindow(h, state) {
  assert.equal(state.phase.kind, 'BLACKOUT'); assert.equal(state.activeSeatId, null);
  assert.equal(state.phase.endsAt - state.phase.startedAt, 15_000);
  const { views } = await assertStoredBoard(h);
  assert.deepEqual(views.public.blackout, { snapshotId: state.phase.id, layoutRevision: 'board-v2-0.1.1', darkStartsAt: state.phase.startedAt + 5_000 });
  assert.deepEqual(Object.keys(views.public.blackout).sort(), ['darkStartsAt', 'layoutRevision', 'snapshotId']);
  for (const view of Object.values(views.players)) assert.deepEqual(view.blackout, views.public.blackout);
  return views;
}
async function privateStreams(h) {
  return Object.fromEntries(await Promise.all(h.ids.map(async id => [id, {
    events: await events(h, `p-${id}`),
    acknowledgments: OwnAcknowledgmentsSchema.parse((await h.base.collection('ownAcknowledgments').doc(h.uid(id)).get()).data()),
  }])));
}
const capture = async h => ({ ...await storedViews(h), publicEvents: await events(h), privateStreams: await privateStreams(h) });
async function privateOnly(h, before, actor) {
  const after = await storedViews(h), streams = await privateStreams(h);
  assert.deepEqual(after.public, before.public, 'Private decision cannot change public bytes/revision');
  for (const id of h.ids.filter(id => id !== actor)) {
    assert.deepEqual(after.players[id], before.players[id], `${id} cannot observe another private decision`);
    assert.deepEqual(streams[id], before.privateStreams[id], `${id} cannot receive another actor's event or acknowledgment`);
  }
  assert.deepEqual(await events(h), before.publicEvents, 'Private registration must not append public cues'); return after;
}
async function sameRoom(h, round, { rescue = false } = {}) {
  await h.turn('seat-1', round); await h.accept('seat-1', { type: 'MOVE', destination: 'Room B' });
  if (rescue) { await h.turn('seat-2', round); await h.accept('seat-2', { type: 'RESCUE', targetSeatId: 'seat-4' }); }
  await h.turn('seat-3', round); await h.accept('seat-3', { type: 'REQUEST_BLACKOUT' });
  await h.turn('seat-8', round); await h.accept('seat-8', { type: 'MOVE', destination: 'Room A' }); await h.accept('seat-8', { type: 'REQUEST_BLACKOUT' });
  const state = await blackout(h, round), views = await assertWindow(h, state);
  assert.equal(views.players['seat-3'].self.blackoutTargeting.room, 'Room A'); assert.equal(views.players['seat-8'].self.blackoutTargeting.room, 'Room A');
  assert.deepEqual(views.players['seat-3'].self.blackoutTargeting.slotIds, views.players['seat-8'].self.blackoutTargeting.slotIds);
  h.setTime(state.phase.startedAt + 5_000);
  // Reverse arrival order; effects must still follow stored actor order.
  const first = await capture(h); await h.accept('seat-8', selection(state, 'seat-8', 'A4')); await privateOnly(h, first, 'seat-8');
  const second = await capture(h); await h.accept('seat-3', selection(state, 'seat-3', 'A4')); await privateOnly(h, second, 'seat-3');
  assert.equal((await h.current()).phase.id, state.phase.id); assert.equal((await h.current()).phase.endsAt, state.phase.endsAt); return state;
}
for (const count of [7, 8, 9]) {
  test(`${count}: native admission/joint rooms/full staged setup preserves 1.9 and no-request 5+10 window`, async () => {
    let now = 1_900_000_000_000, shuffles = 0;
    const ranks = [], options = { db, clock: () => now, creationVersions: PINS, assetManifestVersion: 'blackout-native-service-fixture-assets-v1',
      shuffle: items => { shuffles++; return [...items]; }, randomInitialRoom: () => assert.fail('Joint assignment required'),
      randomStartingRoomRank: maximum => { assert.equal(shuffles, 0); ranks.push(maximum); assert.equal(ranks.length, 1); return 0; } };
    const service = createV1Service(options), host = await createEmulatorIdentity();
    const created = op(await service.createMatch(host.uid, { protocolVersion: 2, requestId: randomUUID(), playerCount: count }));
    const base = db.collection('matches').doc(created.matchId), ids = Array.from({ length: count }, (_, i) => `seat-${i + 1}`);
    const players = await Promise.all(ids.map(() => createEmulatorIdentity()));
    const envelope = (fields = {}) => ({ protocolVersion: 2, matchId: base.id, requestId: randomUUID(), ...fields });
    for (const id of [...ids].reverse()) {
      const identity = players[Number(id.slice(5)) - 1];
      const admission = op(await service.requestAdmission(identity.uid, { protocolVersion: 2, requestId: randomUUID(), roomCode: created.roomCode }));
      op(await service.approveAdmission(host.uid, envelope({ admissionId: admission.admissionId, seatId: id })));
      if (id !== 'seat-1') assert.equal(ranks.length, 0);
    }
    assert.equal(ranks.length, 1); assert.equal(shuffles, 0);
    const h = { base, service, options, host, players, ids, pins: PINS, request: envelope,
      uid: id => players[Number(id.slice(5)) - 1].uid, now: () => now, setTime: v => { assert.ok(v >= now); now = v; },
      current: async () => decodeV1State((await base.collection('engine').doc('current').get()).data()) };
    await startStagedMatch(h); const initial = await h.current(); assert.ok(shuffles > 0); assert.equal(ranks.length, 1);
    assert.deepEqual(initial.versions, { ...PINS, assetManifestVersion: options.assetManifestVersion });
    assert.deepEqual((await base.collection('engine').doc('gameplayPins').get()).data(), PINS);
    assert.deepEqual((await base.collection('setup').doc('deal').get()).get('versions'), initial.versions); assert.equal(initial.blackout, null);
    for (const room of ['Room A', 'Room B']) assert.ok(initial.seats.filter(s => s.location === room).length <= 5);
    h.service = createV1Service({ ...options, creationVersions: OLD });
    const passed = await deliver(h, initial.activeSeatId, request(h, initial, { type: 'PASS_TURN' })); assert.equal(passed.ok, true); assert.equal(passed.receipt.status, 'accepted');
    const state = await blackout(h, 1), views = await assertWindow(h, state);
    for (const view of Object.values(views.players)) assert.equal(view.self.blackoutTargeting, null);
    const fixed = await h.current(); h.setTime(state.phase.endsAt - 1);
    const early = await h.service.runDeadline(deadlinePayload(state)); assert.equal(early.status, 'too-early'); assert.equal(early.retryAfterMs, 1); assert.deepEqual(await h.current(), fixed);
    h.setTime(state.phase.endsAt); assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline(deadlinePayload(state))).result, 'advanced');
    assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline(deadlinePayload(state))).result, 'unchanged');
    const next = await h.current(); assert.equal(next.round, 2); assert.equal(next.blackout, null); assert.ok(next.seats.every(s => s.health === 'Healthy' && s.disablerSpent === false));
    assert.deepEqual((await base.collection('engine').doc('gameplayPins').get()).data(), PINS); assert.equal(ranks.length, 1); await assertBoardJournal(h);
  });
  test(label(count, 'secret request changes only its actor; Rules deny other players, host, display and outsider'), async () => {
    const h = await fixture(count); await h.turn('seat-3', 1);
    const before = await capture(h), accepted = await h.accept('seat-3', { type: 'REQUEST_BLACKOUT' }); await privateOnly(h, before, 'seat-3');
    const state = await h.current(); assert.equal(seat(state, 'seat-3').mainActionUsedRound, 1); assert.equal(seat(state, 'seat-3').disablerSpent, false);
    const duplicate = await h.send('seat-3', { type: 'REQUEST_BLACKOUT' }); assert.equal(duplicate.receipt.status, 'rejected'); assert.equal(seat(await h.current(), 'seat-3').disablerSpent, false);
    const path = `${h.base.path}/playerViews/${h.players[2].uid}`; assert.equal((await firestoreRequest(path, { idToken: h.players[2].idToken })).status, 200);
    for (const identity of [h.players[0], h.host, h.display, h.outsider]) {
      assert.equal((await firestoreRequest(path, { idToken: identity.idToken })).status, 403);
      const lookup = FullLookupResponseSchema.parse(await h.service.lookup(identity.uid, { protocolVersion: 2, matchId: h.base.id, commandId: accepted.request.commandId }));
      if (identity.uid === h.players[0].uid) assert.equal(lookup.status, 'unknown');
      else { assert.equal(lookup.ok, false); assert.equal(lookup.error.code, 'FORBIDDEN'); }
    }
    for (const identity of [h.host, h.display]) assert.equal((await firestoreRequest(`${h.base.path}/views/public`, { idToken: identity.idToken })).status, 200);
    assert.equal((await firestoreRequest(`${h.base.path}/views/public`, { idToken: h.outsider.idToken })).status, 403);
    const window = await blackout(h, 1), projected = await assertWindow(h, window); assert.ok(projected.players['seat-3'].self.blackoutTargeting);
    for (const id of h.ids.filter(id => id !== 'seat-3')) assert.equal(projected.players[id].self.blackoutTargeting, null); await assertBoardJournal(h);
  });
  test(label(count, 'inclusive dark start; invalid intents do not lock; first choice and uncertain receipt survive restart'), async () => {
    const h = await fixture(count); await h.turn('seat-3', 1); await h.accept('seat-3', { type: 'REQUEST_BLACKOUT' });
    const state = await blackout(h, 1); await assertWindow(h, state); const choice = selection(state, 'seat-3', 'A4');
    h.setTime(state.phase.startedAt + 4_999); const early = await h.send('seat-3', choice); assert.equal(early.receipt.code, 'NOT_ALLOWED'); assert.equal(seat(await h.current(), 'seat-3').disablerSpent, false);
    h.setTime(state.phase.startedAt + 5_000);
    assert.equal((await h.send('seat-2', choice)).receipt.code, 'NOT_ALLOWED', 'An admitted intent cannot be submitted by another seat');
    for (const identity of [h.host, h.display, h.outsider]) {
      const denied = FullCommandResponseSchema.parse(await h.service.submit(identity.uid, request(h, state, choice)));
      assert.equal(denied.ok, false); assert.equal(denied.error.code, 'FORBIDDEN');
    }
    for (const command of [{ ...choice, snapshotId: randomUUID() }, { ...choice, room: 'Room B', slotId: 'B1' }, { ...choice, slotId: 'H9' }]) {
      const invalid = await h.send('seat-3', command); assert.equal(invalid.receipt.status, 'rejected'); assert.equal(invalid.receipt.code, 'NOT_ALLOWED');
      assert.equal(seat(await h.current(), 'seat-3').disablerSpent, false); assert.equal(projectFullGame(await h.current()).players['seat-3'].self.blackoutTargeting.selectedSlotId, null);
    }
    const before = await capture(h), accepted = await h.accept('seat-3', choice);
    assert.equal((await privateOnly(h, before, 'seat-3')).players['seat-3'].self.blackoutTargeting.selectedSlotId, 'A4'); assert.equal(seat(await h.current(), 'seat-3').disablerSpent, true);
    assert.equal((await h.current()).phase.id, state.phase.id); assert.equal((await h.current()).phase.endsAt, state.phase.endsAt);
    assert.equal((await h.send('seat-3', { ...choice, slotId: 'A5' })).receipt.status, 'rejected');
    const conflict = await deliver(h, 'seat-3', { ...accepted.request, command: { ...choice, slotId: 'A5' } }); assert.equal(conflict.ok, false); assert.equal(conflict.error.code, 'COMMAND_ID_CONFLICT');
    h.service = createV1Service(h.options);
    assert.deepEqual(FullLookupResponseSchema.parse(await h.service.lookup(h.uid('seat-3'), { protocolVersion: 2, matchId: h.base.id, commandId: accepted.request.commandId })).receipt, accepted.receipt);
    assert.deepEqual((await deliver(h, 'seat-3', accepted.request)).receipt, accepted.receipt); await h.expire();
    assert.equal(seat(await h.current(), 'seat-4').health, 'Injured'); assert.equal(seat(await h.current(), 'seat-4').medicalEpisodeCount, 1);
    assert.deepEqual((await deliver(h, 'seat-3', accepted.request)).receipt, accepted.receipt);
    assert.equal((await deliver(h, 'seat-3', { ...accepted.request, commandId: randomUUID() })).receipt.code, 'PHASE_CLOSED');
    assert.equal(seat(await h.current(), 'seat-4').medicalEpisodeCount, 1); await assertBoardJournal(h);
  });
  test(label(count, 'competing final-dark selections lock one; concurrent identical retry spends no second use'), async () => {
    const h = await fixture(count); await h.turn('seat-3', 1); await h.accept('seat-3', { type: 'REQUEST_BLACKOUT' });
    const state = await blackout(h, 1); h.setTime(state.phase.endsAt - 1);
    const attempts = ['A4', 'A5'].map(slot => request(h, state, selection(state, 'seat-3', slot)));
    const responses = await Promise.all(attempts.map(body => deliver(h, 'seat-3', body)));
    assert.ok(responses.every(r => r.ok)); assert.deepEqual(responses.map(r => r.receipt.status).sort(), ['accepted', 'rejected']);
    const winner = responses.findIndex(r => r.receipt.status === 'accepted'), committed = await h.current();
    assert.equal(committed.phase.id, state.phase.id); assert.equal(seat(committed, 'seat-3').disablerSpent, true);
    assert.equal(projectFullGame(committed).players['seat-3'].self.blackoutTargeting.selectedSlotId, attempts[winner].command.slotId);
    for (const r of await Promise.all(Array.from({ length: 3 }, () => deliver(h, 'seat-3', attempts[winner])))) assert.deepEqual(r.receipt, responses[winner].receipt);
    assert.deepEqual(await h.current(), committed); const early = await h.service.runDeadline(deadlinePayload(state)); assert.equal(early.status, 'too-early'); assert.equal(early.retryAfterMs, 1);
    await h.expire(); const resolved = await h.current(), victim = attempts[winner].command.slotId === 'A4' ? 'seat-4' : 'seat-5';
    assert.equal(seat(resolved, victim).health, 'Injured'); assert.equal(resolved.seats.filter(s => s.health === 'Injured').length, 1); await assertBoardJournal(h);
  });
  for (const kind of ['self', 'empty']) test(label(count, `${kind} position is a neutral consuming miss without replacement`), async () => {
    const h = await fixture(count); await h.turn('seat-3', 1); await h.accept('seat-3', { type: 'REQUEST_BLACKOUT' });
    if (kind === 'empty') await h.accept('seat-2', { type: 'MOVE', destination: 'Room B' });
    const state = await blackout(h, 1), t = projectFullGame(state).players['seat-3'].self.blackoutTargeting;
    assert.deepEqual(t.slotIds, ['A1', 'A2', 'A3', 'A4', 'A5']); assert.deepEqual(Object.keys(t).sort(), ['darkStartsAt', 'endsAt', 'room', 'selectedSlotId', 'slotIds', 'snapshotId']);
    await select(h, 'seat-3', kind === 'self' ? seat(state, 'seat-3').slotId : 'A2'); await h.expire(); const next = await h.current();
    assert.equal(seat(next, 'seat-3').disablerSpent, true); assert.ok(next.seats.every(s => s.health === 'Healthy')); assert.equal((await blocks(h)).length, 0);
    for (const id of h.ids) assert.equal((await blocks(h, `p-${id}`)).length, 0); await assertBoardJournal(h);
  });
  test(label(count, 'exclusive deadline and unanswered admission spend once without a random victim'), async () => {
    const h = await fixture(count); await h.turn('seat-3', 1); await h.accept('seat-3', { type: 'REQUEST_BLACKOUT' });
    const state = await blackout(h, 1); h.setTime(state.phase.endsAt);
    const expired = await h.send('seat-3', selection(state, 'seat-3', 'A4')); assert.equal(expired.receipt.status, 'rejected'); assert.equal(expired.receipt.code, 'PHASE_CLOSED');
    assert.equal(seat(await h.current(), 'seat-3').disablerSpent, false, 'Rejected intent does not consume before deadline resolution');
    h.service = createV1Service(h.options); await h.expire(); const completed = await h.current();
    assert.equal(seat(completed, 'seat-3').disablerSpent, true); assert.ok(completed.seats.every(s => s.health === 'Healthy')); assert.equal(completed.blackout, null);
    assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline(deadlinePayload(state))).result, 'unchanged'); assert.deepEqual(await h.current(), completed); await assertBoardJournal(h);
  });
  test(label(count, 'post-vote cancellation preserves lifetime use and permits a legal later request'), async () => {
    const h = await fixture(count); await h.turn('seat-3', 1); await h.accept('seat-3', { type: 'REQUEST_BLACKOUT' });
    await vote(h, 1, 'JAIL_VOTE', 'seat-3'); const state = await blackout(h, 1), views = await assertWindow(h, state);
    assert.equal(seat(state, 'seat-3').location, 'Jail'); assert.equal(seat(state, 'seat-3').jailed, true); assert.equal(seat(state, 'seat-3').disablerSpent, false);
    for (const view of Object.values(views.players)) assert.equal(view.self.blackoutTargeting, null);
    h.setTime(state.phase.startedAt + 5_000); assert.equal((await h.send('seat-3', { type: 'SELECT_BLACKOUT_SLOT', snapshotId: state.phase.id, room: 'Jail', slotId: 'J1' })).receipt.status, 'rejected');
    await h.finishRound(1); assert.equal(seat(await h.current(), 'seat-3').disablerSpent, false);
    await vote(h, 2, 'CAPTAIN_ELECTION', 'seat-1'); await h.expire(); await h.turn('seat-1', 2); await h.accept('seat-1', { type: 'CAPTAIN_RELEASE' });
    assert.equal(seat(await h.current(), 'seat-3').jailed, false); await h.turn('seat-3', 2); await h.accept('seat-3', { type: 'REQUEST_BLACKOUT' });
    const later = await blackout(h, 2); assert.ok(projectFullGame(later).players['seat-3'].self.blackoutTargeting);
    await select(h, 'seat-3', seat(later, 'seat-3').slotId); await h.expire(); assert.equal(seat(await h.current(), 'seat-3').disablerSpent, true); await assertBoardJournal(h);
  });
  test(label(count, 'opening binds current room and stable positions; targeting grants no movement'), async () => {
    const h = await fixture(count); await h.turn('seat-3', 1); await h.accept('seat-3', { type: 'REQUEST_BLACKOUT' }); await h.accept('seat-3', { type: 'MOVE', destination: 'Room B' });
    const state = await blackout(h, 1), t = projectFullGame(state).players['seat-3'].self.blackoutTargeting;
    assert.equal(t.room, 'Room B'); assert.deepEqual(t.slotIds, ['B1', 'B2', 'B3', 'B4', 'B5']);
    const fixed = state.seats.map(s => [s.seatId, s.location, s.slotId]); assert.equal((await h.send('seat-3', { type: 'MOVE', destination: 'Room A' })).receipt.status, 'rejected');
    assert.deepEqual((await h.current()).seats.map(s => [s.seatId, s.location, s.slotId]), fixed);
    await select(h, 'seat-3', seat(state, 'seat-6').slotId); await h.expire(); const final = await h.current();
    assert.equal(seat(final, 'seat-6').health, 'Injured'); assert.equal(seat(final, 'seat-6').location, 'Hospital'); assert.equal(seat(final, 'seat-4').health, 'Healthy'); await assertBoardJournal(h);
  });
  test(label(count, 'Disabler Captain requests in Command and selects neutral C1 as a consuming self-miss'), async () => {
    const h = await fixture(count); await h.finishRound(1); await vote(h, 2, 'CAPTAIN_ELECTION', 'seat-3'); await h.expire(); await h.turn('seat-3', 2);
    assert.equal(seat(await h.current(), 'seat-3').slotId, 'C1'); await h.accept('seat-3', { type: 'REQUEST_BLACKOUT' }); const state = await blackout(h, 2);
    const t = projectFullGame(state).players['seat-3'].self.blackoutTargeting; assert.equal(t.room, 'Command Room'); assert.deepEqual(t.slotIds, ['C1']);
    await select(h, 'seat-3', 'C1'); await h.expire(); const final = await h.current();
    assert.equal(seat(final, 'seat-3').health, 'Healthy'); assert.equal(seat(final, 'seat-3').slotId, 'C1'); assert.equal(seat(final, 'seat-3').disablerSpent, true);
    assert.equal((await blocks(h)).length, 0); for (const id of h.ids) assert.equal((await blocks(h, `p-${id}`)).length, 0); await assertBoardJournal(h);
  });
  test(label(count, 'Protection block publishes frozen living-room recipients and opaque 30-second facts; public and outsiders receive none'), async () => {
    const h = await fixture(count); await h.turn('seat-5', 1); await h.accept('seat-5', { type: 'PROTECT', targetSeatId: 'seat-4' }); await h.finishRound(1);
    await h.turn('seat-3', 2); await h.accept('seat-3', { type: 'REQUEST_BLACKOUT' }); const state = await blackout(h, 2); await select(h, 'seat-3', 'A4');
    const recipients = state.seats.filter(s => s.location === 'Room A').map(s => s.seatId); await h.expire(); const final = await h.current();
    assert.equal(seat(final, 'seat-4').health, 'Healthy'); assert.equal(seat(final, 'seat-4').protection.consumed, true); assert.equal((await blocks(h)).length, 0);
    const observed = [];
    for (const id of h.ids) {
      const values = await blocks(h, `p-${id}`); assert.equal(values.length, recipients.includes(id) ? 1 : 0); if (!values.length) continue;
      const e = values[0]; observed.push(e);
      assert.deepEqual(e.fact, { type: 'ATTACK_BLOCKED', phaseId: state.phase.id, round: 2, seatId: 'seat-4', location: 'Room A', slotId: 'A4' });
      assert.deepEqual(e.audience, { kind: 'player', seatId: id }); assert.deepEqual(e.versions, PINS);
      assert.match(e.eventId, /^[a-f0-9]{64}$/); assert.equal(e.outcomeId, e.eventId); assert.equal(e.publishedAt, h.now()); assert.equal(e.expiresAt - e.publishedAt, 30_000);
      assert.doesNotMatch(JSON.stringify(e), /actorSeat|attacker|grantedBy|sourceSeat|cause|commandId|disabler|protection/i);
    }
    assert.equal(new Set(observed.map(e => e.eventId)).size, observed.length); assert.equal(new Set(observed.map(e => e.publishedAt)).size, 1);
    const visible = (await eventDocs(h, 'p-seat-4')).find(v => v.event.fact.type === 'ATTACK_BLOCKED');
    const path = `${h.base.path}/audienceEvents/p-seat-4/items/${visible.id}`; assert.equal((await firestoreRequest(path, { idToken: h.players[3].idToken })).status, 200);
    for (const identity of [h.players[5], h.host, h.display, h.outsider]) assert.equal((await firestoreRequest(path, { idToken: identity.idToken })).status, 403);
    assert.equal((await firestoreEventQuery(h.base.id, 'p-seat-4', h.players[3], 'seat-4')).status, 200);
    for (const identity of [h.players[5], h.host, h.display, h.outsider]) assert.equal((await firestoreEventQuery(h.base.id, 'p-seat-4', identity, 'seat-4')).status, 403);
    h.service = createV1Service(h.options); const before = await eventDocs(h, 'p-seat-4'); await h.service.runDeadline(deadlinePayload(state)); assert.deepEqual(await eventDocs(h, 'p-seat-4'), before);
    await h.turn('seat-1', 3); await h.accept('seat-1', { type: 'MOVE', destination: 'Room B' }); await h.accept('seat-6', { type: 'MOVE', destination: 'Room A' });
    assert.equal(seat(await h.current(), 'seat-6').location, 'Room A'); assert.equal((await blocks(h, 'p-seat-6')).length, 0); await assertBoardJournal(h);
  });
  test(label(count, 'a full batch publishes two blocked subjects canonically despite reverse target resolution'), async () => {
    const h = await fixture(count);
    await h.turn('seat-5', 1); await h.accept('seat-5', { type: 'PROTECT', targetSeatId: 'seat-5' }); await h.finishRound(1);
    await h.turn('seat-5', 2); await h.accept('seat-5', { type: 'PROTECT', targetSeatId: 'seat-4' }); await h.finishRound(2);
    await h.turn('seat-4', 3); await h.accept('seat-4', { type: 'SUPPLY', targetSeatIds: ['seat-3', 'seat-5'] }); await h.finishRound(3);
    await h.turn('seat-3', 4); await h.accept('seat-3', { type: 'REGISTER_SHOT', targetSeatId: 'seat-5' });
    await h.turn('seat-5', 4); await h.accept('seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-4' });
    const window = await blackout(h, 4); assert.equal((await blocks(h)).length, 0);
    for (const id of h.ids) assert.equal((await blocks(h, `p-${id}`)).length, 0, 'No block is published before the complete checkpoint');
    await h.expire(); const completed = await h.current();
    assert.equal(seat(completed, 'seat-4').health, 'Healthy'); assert.equal(seat(completed, 'seat-5').health, 'Healthy');
    assert.equal(seat(completed, 'seat-4').protection.consumed, true); assert.equal(seat(completed, 'seat-5').protection.consumed, true);
    assert.equal((await blocks(h)).length, 0);
    const recipients = window.seats.filter(s => s.location === 'Room A').map(s => s.seatId), opaqueIds = [];
    for (const id of h.ids) {
      const values = await blocks(h, `p-${id}`);
      assert.deepEqual(values.map(e => e.fact.seatId), recipients.includes(id) ? ['seat-4', 'seat-5'] : []);
      for (const e of values) {
        assert.equal(e.publishedAt, h.now()); assert.equal(e.expiresAt - e.publishedAt, 30_000); assert.match(e.eventId, /^[a-f0-9]{64}$/);
        assert.doesNotMatch(JSON.stringify(e), /actorSeat|attacker|grantedBy|sourceSeat|cause|commandId|disabler|protection/i); opaqueIds.push(e.eventId);
      }
    }
    assert.equal(new Set(opaqueIds).size, opaqueIds.length); await assertBoardJournal(h);
  });
  test(label(count, 'historical 1.8 retains direct DISABLE and rejects new commands/fields'), async () => {
    const h = await boardMedicalFixture(db, count, { pins: OLD }); await h.turn('seat-3', 1);
    assert.equal((await h.send('seat-3', { type: 'REQUEST_BLACKOUT' })).receipt.status, 'rejected');
    assert.equal((await h.send('seat-3', { type: 'SELECT_BLACKOUT_SLOT', snapshotId: randomUUID(), room: 'Room A', slotId: 'A4' })).receipt.status, 'rejected');
    await h.accept('seat-3', { type: 'DISABLE', targetSeatId: 'seat-4' }); await h.finishRound(1); const state = await h.current();
    assert.equal(seat(state, 'seat-4').health, 'Injured'); assert.equal(Object.hasOwn(state, 'blackout'), false);
    const views = await storedViews(h); assert.equal(Object.hasOwn(views.public, 'blackout'), false);
    for (const view of Object.values(views.players)) assert.equal(Object.hasOwn(view.self, 'blackoutTargeting'), false);
    assert.equal((await blocks(h)).length, 0); assert.equal(state.versions.engineVersion, 'full-game-1.8.0'); await assertBoardJournal(h);
  });
  for (const correct of [false, true]) test(label(count, `R5 Blackout Code ${correct ? 'correct' : 'dead/offboard identity'} preserves timing, retry and delayed victory`), async () => {
    const h = await fixture(count); await vote(h, 1, 'JAIL_VOTE', 'seat-1'); await h.finishRound(1); await vote(h, 2, 'CAPTAIN_ELECTION', 'seat-7'); await h.expire();
    await h.turn('seat-3', 2); await h.accept('seat-3', { type: 'REQUEST_BLACKOUT' }); await h.turn('seat-7', 2); await h.accept('seat-7', { type: 'CAPTAIN_EJECT' });
    const window2 = await blackout(h, 2); await select(h, 'seat-3', 'A4'); await h.expire(); assert.equal(seat(await h.current(), 'seat-1').location, null); assert.equal(seat(await h.current(), 'seat-4').health, 'Injured');
    await h.finishRound(3); assert.equal(seat(await h.current(), 'seat-4').health, 'Eliminated'); assert.equal(seat(await h.current(), 'seat-4').location, 'Hospital');
    await h.turn('seat-6', 5); const ordinary = await h.current(), stale = request(h, ordinary, { type: 'SUBMIT_CODE', seatIds: [...ordinary.code] });
    const state = await blackout(h, 5); await assertWindow(h, state); assert.equal(projectFullGame(state).players['seat-6'].self.codeAttemptAvailable, true);
    assert.equal((await deliver(h, 'seat-6', stale)).receipt.code, 'PHASE_CLOSED'); assert.equal((await h.send('seat-2', { type: 'SUBMIT_CODE', seatIds: [...state.code] })).receipt.status, 'rejected');
    const before = await capture(h), candidate = correct ? [...state.code] : ['seat-1', 'seat-2', 'seat-4', 'seat-7'];
    const accepted = await h.accept('seat-6', { type: 'SUBMIT_CODE', seatIds: candidate }); await privateOnly(h, before, 'seat-6'); const submitted = await h.current();
    assert.equal(submitted.codeSubmitted, true); assert.equal(submitted.correctCode, correct); assert.equal(submitted.result, null); assert.equal(submitted.phase.id, state.phase.id); assert.equal(submitted.phase.endsAt, state.phase.endsAt);
    assert.equal(projectFullGame(submitted).players['seat-6'].self.codeAttemptAvailable, false); assert.equal((await h.send('seat-6', { type: 'SUBMIT_CODE', seatIds: candidate })).receipt.status, 'rejected');
    h.service = createV1Service(h.options); assert.deepEqual((await deliver(h, 'seat-6', accepted.request)).receipt, accepted.receipt);
    h.setTime(state.phase.endsAt - 1); assert.equal((await h.service.runDeadline(deadlinePayload(state))).status, 'too-early'); assert.equal((await h.current()).result, null);
    h.setTime(state.phase.endsAt);
    assert.equal((await h.send('seat-6', { type: 'SUBMIT_CODE', seatIds: candidate })).receipt.code, 'PHASE_CLOSED');
    assert.equal((await h.current()).result, null); await h.expire(); const completed = await h.current();
    if (correct) { assert.equal(completed.phase.kind, 'FINISHED'); assert.deepEqual(completed.result, { winner: 'Red', alienCoWinner: false }); }
    else if (count === 8) { assert.equal(completed.phase.kind, 'SHOWDOWN'); assert.equal(completed.result, null); }
    else { assert.equal(completed.phase.kind, 'FINISHED'); assert.deepEqual(completed.result, { winner: 'Blue', alienCoWinner: true }); }
    assert.deepEqual((await deliver(h, 'seat-6', accepted.request)).receipt, accepted.receipt); assert.equal(seat(completed, 'seat-1').location, null); assert.equal(seat(completed, 'seat-4').health, 'Eliminated');
    assert.equal(window2.phase.endsAt - window2.phase.startedAt, 15_000); await assertBoardJournal(h);
  });
}
// Canonical seven-player mode has one Disabler; dual roles are only eight/nine.
for (const count of [8, 9]) {
  test(label(count, 'same-room dual strikes survive reverse selection order and deal independent damages'), async () => {
    const h = await fixture(count), window = await sameRoom(h, 1); assert.equal(seat(await h.current(), 'seat-3').disablerSpent, true); assert.equal(seat(await h.current(), 'seat-8').disablerSpent, true);
    await h.expire(); const state = await h.current(), victim = seat(state, 'seat-4'); assert.equal(victim.health, 'Eliminated'); assert.equal(victim.location, 'Hospital'); assert.equal(victim.medicalEpisodeCount, 1);
    assert.equal((await blocks(h)).length, 0); assert.equal(state.blackout, null); assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline(deadlinePayload(window))).result, 'unchanged'); await assertBoardJournal(h);
  });
  test(label(count, 'dual same-slot Protection blocks one, next injures, registered Rescue follows both'), async () => {
    const h = await fixture(count); await h.turn('seat-5', 1); await h.accept('seat-5', { type: 'PROTECT', targetSeatId: 'seat-4' }); await h.finishRound(1);
    const window = await sameRoom(h, 2, { rescue: true }); await h.expire(); const state = await h.current(), victim = seat(state, 'seat-4');
    assert.equal(victim.health, 'Healthy'); assert.equal(victim.medicalEpisodeCount, 1); assert.equal(victim.protection.consumed, true); assert.equal(seat(state, 'seat-2').rescuesRemaining, 1);
    const room = window.seats.filter(s => s.location === 'Room A').map(s => s.seatId); assert.equal((await blocks(h)).length, 0);
    for (const id of h.ids) { const values = await blocks(h, `p-${id}`); assert.equal(values.length, room.includes(id) ? 1 : 0); if (values.length) assert.doesNotMatch(JSON.stringify(values), /actorSeat|attacker|grantedBy|sourceSeat|cause|commandId|disabler|protection/i); }
    const clinical = (await events(h)).filter(e => e.fact.type === 'MEDICAL_OUTCOME' && e.fact.seatId === 'seat-4'); assert.deepEqual(clinical.map(e => e.fact.kind), ['INJURY', 'HEALED']);
    assert.equal(new Set(clinical.map(e => e.publishedAt)).size, 1); await assertBoardJournal(h);
  });
}
