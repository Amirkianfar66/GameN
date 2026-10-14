// Exact 1.10 Auth/Firestore acceptance. Native admission/staged setup is explicit.
// Other cases begin with one legal synthetic Healthy SETUP and use service decisions.
// No midmatch Admin edits, automatic Functions/Tasks, phone/art or Balance claim.
// Active Clone plus Hospital aging is a constructed engine boundary, not a reachable
// fresh-service history: normal attacks cannot newly injure an active Clone.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { CLONE_FULL_GAME_VERSION_PINS as PINS, BLACKOUT_FULL_GAME_VERSION_PINS as OLD,
  projectFullGame } from '@mothership/engine';
import { FullCommandResponseSchema, FullAdvanceResponseSchema, FullLookupResponseSchema,
  FullOperationResponseSchema, FullPublicViewSchema, FullPlayerViewSchema,
  FullEventSchema, OwnAcknowledgmentsSchema } from '@mothership/contracts';
import { createV1Service } from '../dist/index.js';
import { decodeV1State } from '../dist/full-game.js';
import { assertLocalEmulators, createEmulatorIdentity, firestoreRequest,
  firestoreEventQuery } from '../../../infra/firebase/test/helpers.mjs';
import { startStagedMatch } from './staged-start-helper.mjs';
import { boardMedicalFixture, assertStoredBoard, assertBoardJournal,
  retryUnavailable, deadlinePayload } from './board-medical-helper.mjs';

let app, db;
before(() => {
  assertLocalEmulators();
  assert.equal(PINS.engineVersion, 'full-game-1.10.0');
  assert.equal(PINS.rulesetHash, '6168feb6931a8f590176521e3d2eb1cb9de800eec5171cdfd5b77b4d952e1234');
  assert.equal(OLD.engineVersion, 'full-game-1.9.0');
  app = initializeApp({ projectId: 'demo-mothership' }, 'clone-' + randomUUID());
  db = getFirestore(app);
});
after(async () => { await db?.terminate(); if (app) await deleteApp(app); });
const UNUSED = { used:false, activatedRound:null, expiresAfterRound:null, active:false };
const seat = (state, id) => state.seats.find(value => value.seatId === id);
const cloneStatus = (round, active = true) => ({
  used:true, activatedRound:round, expiresAfterRound:Math.min(round + 1, 5), active,
});
const fixture = (count, options = {}) => boardMedicalFixture(db, count, { pins:PINS, ...options });
const label = (count, words) => count + ' (synthetic legal SETUP): ' + words;
const op = value => {
  const parsed = FullOperationResponseSchema.parse(value);
  assert.equal(parsed.ok, true, JSON.stringify(parsed)); return parsed.result;
};
const body = (h, state, command, commandId = randomUUID()) => ({
  protocolVersion:2, matchId:h.base.id, phaseId:state.phase.id, commandId, command,
});
const submit = (h, actor, request) => retryUnavailable(() => h.service.submit(h.uid(actor), request))
  .then(value => FullCommandResponseSchema.parse(value));
async function events(h, key = 'public') {
  return (await h.base.collection('audienceEvents').doc(key).collection('items').get()).docs
    .map(doc => ({ id:doc.id, event:FullEventSchema.parse(doc.data()) }));
}
const blockEvents = async (h, key) => (await events(h, key))
  .filter(value => value.event.fact.type === 'ATTACK_BLOCKED');
async function audienceSnapshot(h) {
  return {
    public:FullPublicViewSchema.parse((await h.base.collection('views').doc('public').get()).data()),
    publicEvents:await events(h),
    players:Object.fromEntries(await Promise.all(h.ids.map(async id => [id, {
      view:FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(h.uid(id)).get()).data()),
      events:await events(h, 'p-' + id),
      acknowledgments:OwnAcknowledgmentsSchema.parse(
        (await h.base.collection('ownAcknowledgments').doc(h.uid(id)).get()).data()),
    }]))),
  };
}
async function onlyActorChanged(h, before, actor) {
  const after = await audienceSnapshot(h);
  assert.deepEqual(after.public, before.public, 'Activation cannot change public bytes/revision');
  assert.deepEqual(after.publicEvents, before.publicEvents, 'Activation has no public cue');
  for (const id of h.ids.filter(id => id !== actor)) {
    assert.deepEqual(after.players[id], before.players[id], id + ' receives no activation view/event/ack');
  }
  return after;
}
async function checkpoint(h, predicate) {
  let state = await h.current();
  for (let step = 0; !predicate(state); step++) {
    assert.ok(step < 120 && state.phase.endsAt !== null,
      'Bounded history stopped at ' + state.round + '/' + state.phase.kind);
    h.setTime(Math.max(h.now(), state.phase.endsAt));
    const advanced = FullAdvanceResponseSchema.parse(
      await retryUnavailable(() => h.service.runDeadline(deadlinePayload(state))));
    assert.equal(advanced.result, 'advanced');
    state = await h.current();
  }
  return state;
}
const window = (h, round) => checkpoint(h, state => state.round === round && state.phase.kind === 'BLACKOUT');
async function vote(h, round, kind, target) {
  const state = await h.until(value => value.round === round && value.phase.kind === kind);
  assert.ok(state.eligibleTargets.includes(target));
  for (const voter of state.eligibleVoters) await h.accept(voter, { type:'VOTE', targetSeatId:target });
  const result = await h.expire();
  assert.equal(result.phase.kind, 'VOTE_RESULT');
  assert.equal(result.lastTally.selectedSeatId, target); return result;
}
async function select(h, actor, slotId) {
  const state = await h.current(), targeting = projectFullGame(state).players[actor].self.blackoutTargeting;
  assert.ok(targeting);
  h.setTime(Math.max(h.now(), state.phase.startedAt + 5_000));
  return h.accept(actor, { type:'SELECT_BLACKOUT_SLOT', snapshotId:targeting.snapshotId,
    room:targeting.room, slotId });
}
async function relocateAlien(h, round = 1) {
  await h.turn('seat-1', round);
  await h.accept('seat-1', { type:'MOVE', destination:'Room B' });
  await h.accept('seat-7', { type:'MOVE', destination:'Room A' });
  assert.equal(seat(await h.current(), 'seat-7').slotId, 'A1');
}
async function assertClonePublication(h) {
  const { state, views } = await assertStoredBoard(h);
  const alien = state.seats.find(value => value.role === 'Alien');
  assert.doesNotMatch(JSON.stringify(views.public), /"(?:cloneStatus|activatedRound|expiresAfterRound)"/);
  for (const [id, view] of Object.entries(views.players)) {
    assert.equal(Object.hasOwn(view.self, 'cloneStatus'), true);
    assert.deepEqual(view.self.cloneStatus, id === alien.seatId ? alien.cloneStatus : null);
    for (const publicSeat of view.seats) assert.equal(Object.hasOwn(publicSeat, 'cloneStatus'), false);
  }
  return { state, views };
}
async function assertGenericBlocks(h, phase, target, location, slotId, recipients, amount) {
  assert.equal((await blockEvents(h)).length, 0, 'Shared display receives no block fact');
  const ids = [], published = [];
  for (const viewer of h.ids) {
    const facts = (await blockEvents(h, 'p-' + viewer))
      .filter(value => value.event.fact.phaseId === phase.id && value.event.fact.seatId === target);
    assert.equal(facts.length, recipients.includes(viewer) ? amount : 0);
    for (const { event } of facts) {
      assert.deepEqual(event.fact, { type:'ATTACK_BLOCKED', phaseId:phase.id, round:phase.round,
        seatId:target, location, slotId });
      assert.deepEqual(event.audience, { kind:'player', seatId:viewer });
      assert.deepEqual(event.versions, PINS);
      assert.match(event.eventId, /^[a-f0-9]{64}$/); assert.equal(event.outcomeId, event.eventId);
      assert.equal(event.expiresAt - event.publishedAt, 30_000);
      assert.doesNotMatch(JSON.stringify(event),
        /"(?:cloneStatus|activatedRound|expiresAfterRound|cause|attackerSeatId|grantedBy|sourceSeatId|commandId)"/);
      ids.push(event.eventId); published.push(event.publishedAt);
    }
  }
  assert.equal(new Set(ids).size, ids.length, 'Every audience occurrence is opaque and distinct');
  assert.equal(new Set(published).size, 1, 'One complete checkpoint timestamp');
}

for (const count of [7, 8, 9]) {
  test(count + ': native admission/full staged setup initializes only the new Alien-private Clone state', async () => {
    let now = 1_900_000_000_000, shuffles = 0;
    const ranks = [], options = { db, clock:() => now, creationVersions:PINS,
      assetManifestVersion:'clone-native-service-fixture-assets-v1',
      shuffle:items => { shuffles++; return [...items]; },
      randomInitialRoom:() => assert.fail('New tuple requires joint room assignment'),
      randomStartingRoomRank:maximum => {
        assert.equal(shuffles, 0); ranks.push(maximum); assert.equal(ranks.length, 1); return 0;
      } };
    const service = createV1Service(options), host = await createEmulatorIdentity();
    const created = op(await service.createMatch(host.uid,
      { protocolVersion:2, requestId:randomUUID(), playerCount:count }));
    const base = db.collection('matches').doc(created.matchId);
    const ids = Array.from({ length:count }, (_, index) => 'seat-' + (index + 1));
    const players = await Promise.all(ids.map(() => createEmulatorIdentity()));
    const request = (fields = {}) => ({ protocolVersion:2, matchId:base.id, requestId:randomUUID(), ...fields });
    for (const id of [...ids].reverse()) {
      const player = players[Number(id.slice(5)) - 1];
      const admission = op(await service.requestAdmission(player.uid,
        { protocolVersion:2, requestId:randomUUID(), roomCode:created.roomCode }));
      op(await service.approveAdmission(host.uid, request({ admissionId:admission.admissionId, seatId:id })));
      if (id !== 'seat-1') assert.equal(ranks.length, 0);
    }
    assert.equal(ranks.length, 1); assert.equal(shuffles, 0);
    const h = { base, service, options, host, players, ids, pins:PINS, request,
      uid:id => players[Number(id.slice(5)) - 1].uid, now:() => now,
      setTime:value => { assert.ok(value >= now); now = value; },
      current:async () => decodeV1State((await base.collection('engine').doc('current').get()).data()) };
    await startStagedMatch(h);
    const initial = await h.current(), alien = initial.seats.find(value => value.role === 'Alien');
    assert.ok(shuffles > 0); assert.equal(ranks.length, 1);
    assert.deepEqual(initial.versions, { ...PINS, assetManifestVersion:options.assetManifestVersion });
    assert.deepEqual((await base.collection('engine').doc('gameplayPins').get()).data(), PINS);
    assert.deepEqual((await base.collection('setup').doc('deal').get()).get('versions'), initial.versions);
    assert.deepEqual(alien.cloneStatus, UNUSED);
    for (const value of initial.seats.filter(value => value.role !== 'Alien')) assert.equal(value.cloneStatus, null);
    assert.equal(initial.blackout, null);
    h.service = createV1Service({ ...options, creationVersions:OLD });
    const own = await checkpoint(h, state => state.phase.kind === 'ORDINARY_TURN' && state.activeSeatId === alien.seatId);
    const accepted = await submit(h, alien.seatId, body(h, own, { type:'ACTIVATE_CLONE' }));
    assert.equal(accepted.ok, true); assert.equal(accepted.receipt.status, 'accepted');
    assert.deepEqual(seat(await h.current(), alien.seatId).cloneStatus, cloneStatus(1));
    assert.equal(ranks.length, 1); await assertClonePublication(h); await assertBoardJournal(h);
  });

  test(label(count, 'activation is private, immediate and independent of movement and Hack resources'), async () => {
    const h = await fixture(count, { roomACount:4 }); await h.turn('seat-7', 1);
    const before = await audienceSnapshot(h), original = seat(await h.current(), 'seat-7');
    const accepted = await h.accept('seat-7', { type:'ACTIVATE_CLONE' });
    const after = await onlyActorChanged(h, before, 'seat-7'), state = await h.current(), alien = seat(state, 'seat-7');
    assert.deepEqual(alien.cloneStatus, cloneStatus(1)); assert.equal(alien.mainActionUsedRound, 1);
    for (const field of ['ordinaryWeapons', 'movedInRound', 'hackUsed', 'specialShotAvailable']) assert.equal(alien[field], original[field]);
    assert.deepEqual(after.players['seat-7'].view.self.cloneStatus, cloneStatus(1));
    assert.equal(Object.hasOwn(after.players['seat-7'].view.legalTargets, 'ACTIVATE_CLONE'), false);
    const path = h.base.path + '/playerViews/' + h.uid('seat-7');
    assert.equal((await firestoreRequest(path, { idToken:h.players[6].idToken })).status, 200);
    for (const identity of [h.players[0], h.host, h.display, h.outsider]) {
      assert.equal((await firestoreRequest(path, { idToken:identity.idToken })).status, 403);
    }
    await h.accept('seat-7', { type:'REQUEST_HACK', targetSeatId:'seat-6' });
    await h.accept('seat-7', { type:'MOVE', destination:'Room A' });
    assert.equal(seat(await h.current(), 'seat-7').hackUsed, true);
    assert.equal(seat(await h.current(), 'seat-7').movedInRound, true);
    assert.deepEqual(seat(await h.current(), 'seat-7').cloneStatus, cloneStatus(1));
    assert.deepEqual((await submit(h, 'seat-7', accepted.request)).receipt, accepted.receipt);
    await assertClonePublication(h); await assertBoardJournal(h);
  });

  test(label(count, 'wrong role/turn, malformed input, exact deadline and detained own-turn activation cost nothing'), async () => {
    const h = await fixture(count);
    for (const actor of ['seat-1', 'seat-7']) assert.equal((await h.send(actor, { type:'ACTIVATE_CLONE' })).receipt.status, 'rejected');
    await h.turn('seat-7', 1); const own = await h.current();
    const malformed = await submit(h, 'seat-7', body(h, own, { type:'ACTIVATE_CLONE', targetSeatId:'seat-7' }));
    assert.equal(malformed.ok, false); assert.equal(malformed.error.code, 'INVALID_REQUEST');
    assert.deepEqual(seat(await h.current(), 'seat-7').cloneStatus, UNUSED);
    h.setTime(own.phase.endsAt);
    const expired = await h.send('seat-7', { type:'ACTIVATE_CLONE' });
    assert.equal(expired.receipt.code, 'PHASE_CLOSED'); assert.deepEqual(seat(await h.current(), 'seat-7').cloneStatus, UNUSED);
    await vote(h, 1, 'JAIL_VOTE', 'seat-7');
    assert.equal((await h.send('seat-7', { type:'ACTIVATE_CLONE' })).receipt.status, 'rejected');
    await window(h, 1); assert.equal((await h.send('seat-7', { type:'ACTIVATE_CLONE' })).receipt.status, 'rejected');
    await h.turn('seat-7', 2);
    assert.equal(seat(await h.current(), 'seat-7').jailed, true);
    assert.equal((await h.send('seat-7', { type:'ACTIVATE_CLONE' })).receipt.status, 'rejected');
    assert.deepEqual(seat(await h.current(), 'seat-7').cloneStatus, UNUSED);
    assert.equal(seat(await h.current(), 'seat-7').mainActionUsedRound, null); await assertBoardJournal(h);
  });

  test(label(count, 'concurrent activation commits once; conflicts and restart recover the same receipt across phases'), async () => {
    const h = await fixture(count); const state = await h.turn('seat-7', 1);
    h.setTime(state.phase.startedAt + 1);
    const requests = [1, 2].map(() => body(h, state, { type:'ACTIVATE_CLONE' }));
    const responses = await Promise.all(requests.map(request => submit(h, 'seat-7', request)));
    assert.ok(responses.every(value => value.ok));
    assert.deepEqual(responses.map(value => value.receipt.status).sort(), ['accepted', 'rejected']);
    const winner = responses.findIndex(value => value.receipt.status === 'accepted');
    const committed = await h.current(); assert.deepEqual(seat(committed, 'seat-7').cloneStatus, cloneStatus(1));
    const conflict = await submit(h, 'seat-7', { ...requests[winner], command:{ type:'PASS_TURN' } });
    assert.equal(conflict.ok, false); assert.equal(conflict.error.code, 'COMMAND_ID_CONFLICT');
    h.service = createV1Service(h.options);
    const lookup = FullLookupResponseSchema.parse(await h.service.lookup(h.uid('seat-7'),
      { protocolVersion:2, matchId:h.base.id, commandId:requests[winner].commandId }));
    assert.equal(lookup.status, 'found'); assert.deepEqual(lookup.receipt, responses[winner].receipt);
    for (const value of await Promise.all([1, 2, 3].map(() => submit(h, 'seat-7', requests[winner])))) {
      assert.deepEqual(value.receipt, responses[winner].receipt);
    }
    assert.deepEqual(await h.current(), committed);
    await h.expire();
    assert.deepEqual((await submit(h, 'seat-7', requests[winner])).receipt, responses[winner].receipt);
    const registered = (await events(h, 'p-seat-7')).filter(value =>
      value.event.fact.type === 'COMMAND_REGISTERED' && value.event.fact.commandId === requests[winner].commandId);
    assert.equal(registered.length, 1); await assertBoardJournal(h);
  });

  for (const activationRound of [1, 2, 3, 4, 5]) test(label(count,
    'R' + activationRound + ' activation covers its exact final normal checkpoint without refresh or Round 6'), async () => {
    const h = await fixture(count); await h.turn('seat-7', activationRound);
    const accepted = await h.accept('seat-7', { type:'ACTIVATE_CLONE' });
    const expiryRound = Math.min(activationRound + 1, 5);
    const closing = await window(h, expiryRound);
    assert.deepEqual(seat(closing, 'seat-7').cloneStatus, cloneStatus(activationRound));
    assert.equal(closing.phase.endsAt - closing.phase.startedAt, 15_000);
    h.service = createV1Service(h.options); h.setTime(closing.phase.endsAt - 1);
    const early = await h.service.runDeadline(deadlinePayload(closing));
    assert.equal(early.status, 'too-early'); assert.equal(early.retryAfterMs, 1);
    assert.deepEqual(seat(await h.current(), 'seat-7').cloneStatus, cloneStatus(activationRound));
    await h.expire(); const expired = await h.current();
    assert.deepEqual(seat(expired, 'seat-7').cloneStatus, cloneStatus(activationRound, false));
    assert.equal(seat(expired, 'seat-7').mainActionUsedRound, activationRound);
    assert.equal((await h.send('seat-7', { type:'ACTIVATE_CLONE' })).receipt.status, 'rejected');
    assert.deepEqual((await submit(h, 'seat-7', accepted.request)).receipt, accepted.receipt);
    if (expiryRound === 5) {
      assert.equal(expired.phase.kind, 'FINISHED'); assert.equal(expired.result.winner, 'Blue'); assert.equal(expired.round, 5);
    } else assert.equal(expired.round, expiryRound + 1);
    await assertClonePublication(h); await assertBoardJournal(h);
  });

  test(label(count, 'RELEASE restores unused eligibility; later detention preserves active Clone and EJECT bypasses both defenses'), async () => {
    const h = await fixture(count);
    await h.turn('seat-5', 1); await h.accept('seat-5', { type:'MOVE', destination:'Room B' });
    await vote(h, 1, 'JAIL_VOTE', 'seat-7'); await h.finishRound(1);
    await vote(h, 2, 'CAPTAIN_ELECTION', 'seat-1'); await h.expire();
    await h.turn('seat-1', 2); await h.accept('seat-1', { type:'CAPTAIN_RELEASE' });
    assert.equal(seat(await h.current(), 'seat-7').location, 'Room B'); assert.equal(seat(await h.current(), 'seat-7').jailed, false);
    await vote(h, 2, 'JAIL_VOTE', 'seat-2'); await h.finishRound(2);
    await h.turn('seat-5', 3); await h.accept('seat-5', { type:'PROTECT', targetSeatId:'seat-7' }); await h.finishRound(3);
    await h.turn('seat-5', 4); await h.accept('seat-5', { type:'REGISTER_SHOT', targetSeatId:'seat-7' });
    await h.turn('seat-7', 4); const accepted = await h.accept('seat-7', { type:'ACTIVATE_CLONE' });
    await vote(h, 4, 'JAIL_VOTE', 'seat-7'); const detention = await window(h, 4);
    assert.equal(seat(detention, 'seat-7').location, 'Jail');
    assert.equal(seat(detention, 'seat-7').slotId, 'J2');
    assert.deepEqual(seat(detention, 'seat-7').cloneStatus, cloneStatus(4));
    await h.expire();
    await assertGenericBlocks(h, { ...detention.phase, round:4 }, 'seat-7', 'Jail', 'J2', ['seat-2', 'seat-7'], 1);
    await h.turn('seat-1', 5);
    assert.deepEqual(seat(await h.current(), 'seat-7').protection, { activeFromRound:4, consumed:false, grantedBy:'seat-5' });
    assert.deepEqual(seat(await h.current(), 'seat-7').cloneStatus, cloneStatus(4));
    const settledBlocks = await Promise.all(h.ids.map(id => blockEvents(h, 'p-' + id)));
    await h.accept('seat-1', { type:'CAPTAIN_EJECT' }); const eliminated = await h.current(), alien = seat(eliminated, 'seat-7');
    assert.equal(alien.health, 'Eliminated'); assert.equal(alien.location, null); assert.equal(alien.slotId, null);
    assert.equal(seat(eliminated, 'seat-2').location, null);
    assert.deepEqual(alien.cloneStatus, cloneStatus(4, false)); assert.equal(alien.protection.consumed, false);
    assert.deepEqual(eliminated.captainPowersUsed, { releaseUsed:true, ejectUsed:true }); assert.equal(eliminated.result, null);
    assert.equal(seat(projectFullGame(eliminated).public, 'seat-7').revealedFaction, null);
    assert.equal((await blockEvents(h)).length, 0);
    assert.deepEqual(await Promise.all(h.ids.map(id => blockEvents(h, 'p-' + id))), settledBlocks,
      'Unblockable EJECT creates no additional defensive event');
    assert.deepEqual((await submit(h, 'seat-7', accepted.request)).receipt, accepted.receipt);
    await assertClonePublication(h); await assertBoardJournal(h);
  });

  test(label(count, 'an Injured Alien cannot activate; accepted Rescue clears its episode and permits a later healthy own turn'), async () => {
    const h = await fixture(count); await relocateAlien(h);
    await h.turn('seat-3', 1); await h.accept('seat-3', { type:'REQUEST_BLACKOUT' });
    const first = await window(h, 1); await select(h, 'seat-3', seat(first, 'seat-7').slotId); await h.expire();
    assert.equal(seat(await h.current(), 'seat-7').health, 'Injured'); assert.deepEqual(seat(await h.current(), 'seat-7').cloneStatus, UNUSED);
    await h.turn('seat-2', 2); await h.accept('seat-2', { type:'RESCUE', targetSeatId:'seat-7' });
    await h.turn('seat-7', 2); assert.equal((await h.send('seat-7', { type:'ACTIVATE_CLONE' })).receipt.status, 'rejected');
    assert.deepEqual(seat(await h.current(), 'seat-7').cloneStatus, UNUSED);
    await h.finishRound(2); const healed = seat(await h.current(), 'seat-7');
    assert.equal(healed.health, 'Healthy'); assert.equal(healed.location, 'Room A'); assert.equal(healed.medicalEpisode, null);
    assert.deepEqual(healed.cloneStatus, UNUSED);
    await h.turn('seat-7', 3); await h.accept('seat-7', { type:'ACTIVATE_CLONE' });
    assert.deepEqual(seat(await h.current(), 'seat-7').cloneStatus, cloneStatus(3)); await assertBoardJournal(h);
  });

  test(label(count, 'repeated Blackout/ordinary blocks preserve Protection; R5 expiry precedes actual-room showdown'), async () => {
    const h = await fixture(count);
    await vote(h, 1, 'JAIL_VOTE', 'seat-1'); await h.finishRound(1);
    await h.turn('seat-1', 2); await h.accept('seat-7', { type:'MOVE', destination:'Room A' });
    await vote(h, 2, 'JAIL_VOTE', 'seat-2'); await h.finishRound(2);
    await h.turn('seat-4', 3); await h.accept('seat-4', { type:'SUPPLY', targetSeatIds:['seat-5', 'seat-7'] });
    await h.turn('seat-5', 3); await h.accept('seat-5', { type:'PROTECT', targetSeatId:'seat-7' }); await h.finishRound(3);
    await h.turn('seat-3', 4); await h.accept('seat-3', { type:'REQUEST_BLACKOUT' });
    await h.turn('seat-5', 4); await h.accept('seat-5', { type:'REGISTER_SHOT', targetSeatId:'seat-7' });
    await h.turn('seat-7', 4); const before = await audienceSnapshot(h);
    await h.accept('seat-7', { type:'ACTIVATE_CLONE' }); await onlyActorChanged(h, before, 'seat-7');
    await h.accept('seat-7', { type:'REGISTER_SHOT', targetSeatId:'seat-4' });
    await vote(h, 4, 'JAIL_VOTE', 'seat-4');
    const fourth = await window(h, 4), recipients = fourth.seats.filter(value => value.location === 'Room A').map(value => value.seatId);
    await select(h, 'seat-3', seat(fourth, 'seat-7').slotId);
    for (const id of h.ids) assert.equal((await blockEvents(h, 'p-' + id)).length, 0, 'No outcome before the full checkpoint');
    await h.expire(); const afterFour = await h.current();
    assert.equal(seat(afterFour, 'seat-7').health, 'Healthy'); assert.deepEqual(seat(afterFour, 'seat-7').cloneStatus, cloneStatus(4));
    assert.equal(seat(afterFour, 'seat-7').protection.consumed, false);
    assert.equal(seat(afterFour, 'seat-4').health, 'Injured'); assert.equal(seat(afterFour, 'seat-4').location, 'Hospital');
    assert.equal(seat(afterFour, 'seat-4').jailed, true); assert.equal(seat(afterFour, 'seat-4').medicalEpisode.deathDueAfterRound, 5);
    await assertGenericBlocks(h, { ...fourth.phase, round:4 }, 'seat-7', 'Room A', 'A1', recipients, 2);
    const block = (await blockEvents(h, 'p-seat-7'))[0];
    const blockPath = h.base.path + '/audienceEvents/p-seat-7/items/' + block.id;
    assert.equal((await firestoreRequest(blockPath, { idToken:h.players[6].idToken })).status, 200);
    for (const identity of [h.players[5], h.host, h.display, h.outsider]) {
      assert.equal((await firestoreRequest(blockPath, { idToken:identity.idToken })).status, 403);
    }
    assert.equal((await firestoreEventQuery(h.base.id, 'p-seat-7', h.players[6], 'seat-7')).status, 200);
    await h.turn('seat-5', 5); await h.accept('seat-5', { type:'REGISTER_SHOT', targetSeatId:'seat-7' });
    const fifth = await window(h, 5); assert.deepEqual(seat(fifth, 'seat-7').cloneStatus, cloneStatus(4));
    await h.expire(); const showdown = await h.current();
    assert.equal(showdown.phase.kind, 'SHOWDOWN'); assert.equal(showdown.round, 5);
    assert.deepEqual(seat(showdown, 'seat-7').cloneStatus, cloneStatus(4, false));
    assert.equal(seat(showdown, 'seat-7').protection.consumed, false);
    assert.equal(seat(showdown, 'seat-4').health, 'Eliminated'); assert.equal(seat(showdown, 'seat-4').location, 'Hospital');
    await assertGenericBlocks(h, { ...fifth.phase, round:5 }, 'seat-7', 'Room A', 'A1', recipients, 1);
    const original = showdown.seats.map(value => [value.seatId, value.location, value.slotId]);
    await h.accept('seat-1', { type:'SHOWDOWN_SHOT', targetSeatId:'seat-7' });
    await h.accept('seat-2', { type:'SHOWDOWN_SHOT', targetSeatId:'seat-7' });
    assert.deepEqual((await h.current()).seats.map(value => [value.seatId, value.location, value.slotId]), original);
    await h.expire(); const finished = await h.current();
    assert.equal(finished.phase.kind, 'FINISHED'); assert.deepEqual(finished.result, { winner:'Draw', alienCoWinner:false });
    const alien = seat(finished, 'seat-7');
    assert.equal(alien.protection.consumed, true); assert.equal(alien.health, 'Injured'); assert.equal(alien.location, 'Hospital');
    assert.equal(alien.medicalEpisode.admittedRound, 5); assert.equal(alien.medicalEpisode.deathDueAfterRound, null);
    assert.deepEqual(alien.cloneStatus, cloneStatus(4, false));
    await assertGenericBlocks(h, { ...showdown.phase, round:5 }, 'seat-7', 'Room A', 'A1', recipients, 1);
    const settled = await events(h, 'p-seat-7'); h.service = createV1Service(h.options);
    assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline(deadlinePayload(showdown))).result, 'unchanged');
    assert.deepEqual(await events(h, 'p-seat-7'), settled);
    assert.equal((await h.send('seat-7', { type:'ACTIVATE_CLONE' })).receipt.status, 'rejected');
    await assertClonePublication(h); await assertBoardJournal(h);
  });

  test(label(count, 'after R3 expiry the next attack consumes preserved Protection; later injury ages without a Clone reset'), async () => {
    const h = await fixture(count); await relocateAlien(h);
    await h.turn('seat-5', 2); await h.accept('seat-5', { type:'PROTECT', targetSeatId:'seat-7' });
    await h.turn('seat-7', 2); await h.accept('seat-7', { type:'ACTIVATE_CLONE' });
    await h.turn('seat-3', 3); await h.accept('seat-3', { type:'REQUEST_BLACKOUT' });
    await h.turn('seat-4', 3); await h.accept('seat-4', { type:'SUPPLY', targetSeatIds:['seat-2', 'seat-4'] });
    const third = await window(h, 3); await select(h, 'seat-3', 'A1'); await h.expire();
    assert.deepEqual(seat(await h.current(), 'seat-7').cloneStatus, cloneStatus(2, false));
    assert.equal(seat(await h.current(), 'seat-7').protection.consumed, false);
    await h.turn('seat-2', 4); await h.accept('seat-2', { type:'REGISTER_SHOT', targetSeatId:'seat-7' });
    await h.turn('seat-5', 4); await h.accept('seat-5', { type:'REGISTER_SHOT', targetSeatId:'seat-7' });
    const fourth = await window(h, 4), recipients = fourth.seats.filter(value => value.location === 'Room A').map(value => value.seatId);
    await h.expire(); const injured = seat(await h.current(), 'seat-7');
    assert.equal(injured.health, 'Injured'); assert.equal(injured.location, 'Hospital'); assert.equal(injured.protection.consumed, true);
    assert.equal(injured.medicalEpisode.admittedRound, 4); assert.equal(injured.medicalEpisode.deathDueAfterRound, 5);
    assert.deepEqual(injured.cloneStatus, cloneStatus(2, false));
    await assertGenericBlocks(h, { ...fourth.phase, round:4 }, 'seat-7', 'Room A', 'A1', recipients, 1);
    await h.turn('seat-7', 5); assert.equal((await h.send('seat-7', { type:'ACTIVATE_CLONE' })).receipt.status, 'rejected');
    await h.finishRound(5); const eliminated = seat(await h.current(), 'seat-7');
    assert.equal(eliminated.health, 'Eliminated'); assert.equal(eliminated.location, 'Hospital'); assert.equal(eliminated.medicalEpisode, null);
    assert.deepEqual(eliminated.cloneStatus, cloneStatus(2, false));
    assert.equal((await h.send('seat-7', { type:'ACTIVATE_CLONE' })).receipt.status, 'rejected'); await assertBoardJournal(h);
  });

  test(label(count, 'host abort stops an active effect without erasing lifetime use, original expiry or saved receipt'), async () => {
    const h = await fixture(count); await h.turn('seat-7', 1);
    const accepted = await h.accept('seat-7', { type:'ACTIVATE_CLONE' });
    const result = op(await h.service.abortMatch(h.host.uid, h.request())); assert.equal(result.aborted, true);
    const stopped = await h.current();
    assert.equal(stopped.phase.kind, 'ABORTED'); assert.equal(stopped.phase.endsAt, null); assert.equal(stopped.result, null);
    assert.deepEqual(seat(stopped, 'seat-7').cloneStatus, cloneStatus(1, false));
    assert.equal(seat(stopped, 'seat-7').health, 'Healthy');
    h.service = createV1Service(h.options);
    assert.deepEqual((await submit(h, 'seat-7', accepted.request)).receipt, accepted.receipt);
    assert.equal((await h.send('seat-7', { type:'ACTIVATE_CLONE' })).receipt.status, 'rejected');
    await assertClonePublication(h); await assertBoardJournal(h);
  });

  test(label(count, 'historical 1.9 rejects Clone and retains its exact Blackout and field-absence boundary'), async () => {
    const h = await boardMedicalFixture(db, count, { pins:OLD }); await h.turn('seat-7', 1);
    assert.equal((await h.send('seat-7', { type:'ACTIVATE_CLONE' })).receipt.status, 'rejected');
    const initial = await h.current();
    assert.ok(initial.seats.every(value => !Object.hasOwn(value, 'cloneStatus')));
    for (const view of Object.values(projectFullGame(initial).players)) {
      assert.equal(Object.hasOwn(view.self, 'cloneStatus'), false); assert.equal(Object.hasOwn(view.legalTargets, 'ACTIVATE_CLONE'), false);
    }
    await h.finishRound(1); const final = await h.current();
    assert.equal(final.versions.engineVersion, 'full-game-1.9.0'); assert.ok(final.seats.every(value => !Object.hasOwn(value, 'cloneStatus')));
    for (const { event } of await events(h)) assert.doesNotMatch(JSON.stringify(event.fact), /cloneStatus|ACTIVATE_CLONE/);
    await assertBoardJournal(h);
  });
}
