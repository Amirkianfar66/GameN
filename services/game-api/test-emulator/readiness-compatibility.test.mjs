import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  FullOperationResponseSchema, FullSetPracticeBotsResponseSchema, FullReadyForMatchResponseSchema,
  FullSetupDocumentSchema, FullSetupPlayerViewSchema, FullPublicViewSchema, FullVersionsSchema,
} from '@mothership/contracts';
import {
  FULL_GAME_VERSION_PINS, DECLARED_HACK_FULL_GAME_VERSION_PINS, VOTE_RESULT_FULL_GAME_VERSION_PINS, RESOLUTION_FULL_GAME_VERSION_PINS,
} from '@mothership/engine';
import { createV1Service } from '../dist/index.js';
import { beginStagedSetup, confirmStagedChoices } from './staged-start-helper.mjs';
import { assertLocalEmulators, projectId, createEmulatorIdentity } from '../../../infra/firebase/test/helpers.mjs';

// Native local setup with real Auth identities and Firestore transactions. Only
// the historical/profile creation pin is an explicit admin fixture, written
// before admission/room assignment. Deadline delivery uses the stored task and
// an injected clock; these cases do not establish Functions or manifest loading.
const profiles = [
  { name: 'vote-results 1.4', pins: VOTE_RESULT_FULL_GAME_VERSION_PINS },
  { name: 'declared-Hack 1.5', pins: DECLARED_HACK_FULL_GAME_VERSION_PINS },
];
const preparedAsset = 'readiness-compatibility-assets-v1';
let app, db, serial = 0;
before(() => {
  assertLocalEmulators();
  assert.equal(profiles[0].pins.engineVersion, 'full-game-1.4.0');
  assert.deepEqual(FULL_GAME_VERSION_PINS, RESOLUTION_FULL_GAME_VERSION_PINS,
    'New-version acceptance must not replace the historical default or silently drop a profile');
  app = initializeApp({ projectId }, `readiness-compatibility-${randomUUID()}`);
  db = getFirestore(app);
});
after(async () => { await db?.terminate(); if (app) await deleteApp(app); });

const operation = response => {
  const value = FullOperationResponseSchema.parse(response);
  assert.equal(value.ok, true, JSON.stringify(value));
  return value.result;
};
const readyResponse = (response, expected) => {
  const value = FullReadyForMatchResponseSchema.parse(response);
  if (expected === undefined) assert.equal(value.ok, true, JSON.stringify(value));
  else { assert.equal(value.ok, false); assert.equal(value.error.code, expected, JSON.stringify(value)); }
  return value;
};
const withoutTime = ({ serverTimeMs: _time, ...value }) => value;
const receiptRef = (uid, requestId) => db.collection('setupOperations').doc(
  createHash('sha256').update(JSON.stringify([uid, requestId])).digest('hex'));
const setup = async h => FullSetupDocumentSchema.parse((await h.base.collection('setup').doc('public').get()).data());
const preview = async (h, identity) => FullSetupPlayerViewSchema.parse((await h.base.collection('setupPlayerViews').doc(identity.uid).get()).data());
const deal = async h => (await h.base.collection('setup').doc('deal').get()).data();
const readyBody = (h, own, fields = {}) => ({ schemaVersion: 1, ...h.request(),
  dealId: own.dealId, bindingRevision: own.bindingRevision, ...fields });

async function harness(count, pins) {
  let now = 1_620_000_000_000 + ++serial * 100_000_000;
  const options = { db, clock: () => now, shuffle: items => [...items], randomStartingRoomRank: () => 0,
    assetManifestVersion: preparedAsset };
  const service = createV1Service(options), host = await createEmulatorIdentity();
  const created = operation(await service.createMatch(host.uid, { protocolVersion: 2, requestId: randomUUID(), playerCount: count }));
  const base = db.collection('matches').doc(created.matchId);
  assert.deepEqual((await base.collection('engine').doc('gameplayPins').get()).data(), FULL_GAME_VERSION_PINS);
  if (pins !== FULL_GAME_VERSION_PINS) await base.collection('engine').doc('gameplayPins').set(pins);
  const request = (fields = {}) => ({ protocolVersion: 2, matchId: base.id, requestId: randomUUID(), ...fields });
  const players = [];
  for (let index = 0; index < 2; index++) {
    const identity = await createEmulatorIdentity();
    const admission = operation(await service.requestAdmission(identity.uid, {
      protocolVersion: 2, requestId: randomUUID(), roomCode: created.roomCode,
    }));
    operation(await service.approveAdmission(host.uid, request({ admissionId: admission.admissionId, seatId: `seat-${index + 1}` })));
    players.push(identity);
  }
  const bots = FullSetPracticeBotsResponseSchema.parse(await service.setPracticeBots(host.uid, {
    schemaVersion: 1, ...request({ botCount: count - players.length }),
  }));
  assert.equal(bots.ok, true, JSON.stringify(bots));
  const h = { service, options, host, base, players, request, pins, now: () => now, setTime: value => { now = value; } };
  await beginStagedSetup(h);
  await confirmStagedChoices(h);
  const progress = await setup(h), prepared = await deal(h);
  assert.equal(progress.stage, 'awaiting-ready');
  assert.equal(progress.readingEndsAt - progress.readingStartedAt, 30_000);
  assert.deepEqual(prepared.versions, { ...pins, assetManifestVersion: preparedAsset });
  assert.equal(progress.seats.filter(seat => seat.ready).length, count - players.length, 'Only bots are automatically Ready');
  for (const identity of players) assert.deepEqual((await preview(h, identity)).versions, prepared.versions);
  await noGameplay(h);
  return h;
}
async function noGameplay(h) {
  assert.equal((await h.base.collection('engine').doc('current').get()).exists, false);
  assert.equal((await h.base.collection('events').get()).size, 0);
  assert.equal((await h.base.collection('outbox').get()).size, 0);
}
async function readingIntent(h) {
  const progress = await setup(h);
  const intents = (await h.base.collection('setupOutbox').get()).docs.filter(doc =>
    doc.get('stage') === 'awaiting-ready' && doc.get('setupId') === progress.setupId);
  assert.equal(intents.length, 1);
  const value = intents[0].data();
  assert.equal(value.dueAt, progress.readingEndsAt);
  return { ref: intents[0].ref, payload: { matchId: value.matchId, setupId: value.setupId,
    stage: value.stage, deadlineToken: value.deadlineToken } };
}
async function rejectUnchanged(h, identity, body, code) {
  const publicRef = h.base.collection('setup').doc('public'), previousSnapshot = await publicRef.get();
  const previous = FullSetupDocumentSchema.parse(previousSnapshot.data()), prepared = await deal(h), own = await preview(h, identity);
  readyResponse(await h.service.readyForMatch(identity.uid, body), code);
  const afterSnapshot = await publicRef.get();
  assert.deepEqual(FullSetupDocumentSchema.parse(afterSnapshot.data()), previous, 'Rejected compatibility cannot mark Ready or change setup revision');
  assert.ok(afterSnapshot.updateTime.isEqual(previousSnapshot.updateTime), 'Rejected compatibility cannot rewrite Ready even with identical data');
  assert.deepEqual(await deal(h), prepared, 'Rejected compatibility cannot change prepared pins or the deal');
  assert.deepEqual(await preview(h, identity), own);
  assert.equal((await receiptRef(identity.uid, body.requestId).get()).exists, false, 'A corrected echo may reuse this request ID');
  await noGameplay(h);
}
async function accept(h, identity, own, body = readyBody(h, own, { acceptedVersions: own.versions }), service = h.service) {
  const response = readyResponse(await service.readyForMatch(identity.uid, body));
  assert.equal(response.seatId, own.self.seatId);
  assert.equal(response.bindingRevision, own.bindingRevision);
  assert.equal(response.dealId, own.dealId);
  return { body, response };
}
async function launched(h) {
  const progress = await setup(h), prepared = await deal(h);
  assert.equal(progress.stage, 'running'); assert.ok(progress.seats.every(seat => seat.ready));
  const state = (await h.base.collection('engine').doc('current').get()).data();
  assert.deepEqual(state.versions, prepared.versions, 'Launch uses the saved five pins, including its manifest');
  assert.equal(state.phase.startedAt, h.now());
  assert.equal(state.phase.endsAt - state.phase.startedAt, 60_000);
  assert.equal((await h.base.collection('events').where('kind', '==', 'SETUP').get()).size, 1);
  assert.equal((await h.base.collection('outbox').get()).size, 1);
  const view = FullPublicViewSchema.parse((await h.base.collection('views').doc('public').get()).data());
  assert.deepEqual(view.versions, prepared.versions);
  return { state, view, progress };
}

for (const count of [7, 8, 9]) {
  for (const profile of profiles) {
    test(`${count} seats ${profile.name}: incompatible Ready leaves no receipt; same-ID exact retry launches only after minimum and all humans`, async () => {
      const h = await harness(count, profile.pins), own = await preview(h, h.players[0]);
      const body = readyBody(h, own), otherPins = profiles.find(candidate => candidate !== profile)?.pins ?? RESOLUTION_FULL_GAME_VERSION_PINS;
      const wrongAsset = FullVersionsSchema.parse({ ...own.versions, assetManifestVersion: 'readiness-compatibility-assets-wrong' });
      const wrongKnown = FullVersionsSchema.parse({ ...otherPins, assetManifestVersion: own.versions.assetManifestVersion });
      await rejectUnchanged(h, h.players[0], body, 'UNSUPPORTED_PROTOCOL');
      await rejectUnchanged(h, h.players[0], { ...body, acceptedVersions: wrongAsset }, 'UNSUPPORTED_PROTOCOL');
      await rejectUnchanged(h, h.players[0], { ...body, acceptedVersions: wrongKnown }, 'UNSUPPORTED_PROTOCOL');
      await rejectUnchanged(h, h.players[0], { ...body, acceptedVersions: { ...own.versions, rulesetHash: 'invalid-hash' } }, 'INVALID_REQUEST');
      await rejectUnchanged(h, h.players[0], { ...body, acceptedVersions: { ...own.versions, protocolVersion: 3 } }, 'INVALID_REQUEST');
      await accept(h, h.players[1], await preview(h, h.players[1]));
      const intent = await readingIntent(h), before = await setup(h);
      h.setTime(before.readingEndsAt);
      assert.deepEqual(await h.service.runSetupDeadline(intent.payload), { status: 'unchanged' });
      assert.deepEqual(await setup(h), before, 'Reading expiry keeps awaiting-ready while the incompatible human is missing');
      assert.equal((await intent.ref.get()).get('status'), 'completed');
      await noGameplay(h);
      // A later deployment/config change cannot replace the prepared manifest.
      const replacementService = createV1Service({ ...h.options, assetManifestVersion: 'readiness-compatibility-assets-v2' });
      const corrected = { ...body, acceptedVersions: own.versions };
      const accepted = await accept(h, h.players[0], own, corrected, replacementService);
      assert.equal(accepted.response.stage, 'running');
      assert.equal((await receiptRef(h.players[0].uid, body.requestId).get()).exists, true);
      const final = await launched(h);
      assert.deepEqual(await h.service.runSetupDeadline(intent.payload), { status: 'unchanged' });
      assert.deepEqual((await h.base.collection('engine').doc('current').get()).data(), final.state);
      assert.equal((await h.base.collection('events').get()).size, 1);
    });

    test(`${count} seats ${profile.name}: accepted Ready replay preserves its receipt and conflicting capability payload never mutates setup`, async () => {
      const h = await harness(count, profile.pins), own = await preview(h, h.players[0]);
      const accepted = await accept(h, h.players[0], own), ref = receiptRef(h.players[0].uid, accepted.body.requestId);
      const saved = (await ref.get()).data(), progress = await setup(h);
      assert.equal(accepted.response.stage, 'awaiting-ready');
      assert.equal(progress.seats.find(seat => seat.seatId === own.self.seatId).ready, true);
      await noGameplay(h);
      h.setTime(h.now() + 10);
      const replay = readyResponse(await h.service.readyForMatch(h.players[0].uid, accepted.body));
      assert.deepEqual(withoutTime(replay), withoutTime(accepted.response)); assert.equal(replay.serverTimeMs, h.now());
      assert.deepEqual((await ref.get()).data(), saved); assert.deepEqual(await setup(h), progress);
      const missing = { ...accepted.body }; delete missing.acceptedVersions;
      readyResponse(await h.service.readyForMatch(h.players[0].uid, missing), 'REQUEST_ID_CONFLICT');
      const wrong = { ...accepted.body, acceptedVersions: { ...own.versions, assetManifestVersion: 'readiness-other-assets' } };
      readyResponse(await h.service.readyForMatch(h.players[0].uid, wrong), 'REQUEST_ID_CONFLICT');
      assert.deepEqual((await ref.get()).data(), saved); assert.deepEqual(await setup(h), progress);
      await accept(h, h.players[1], await preview(h, h.players[1]));
      const intent = await readingIntent(h);
      h.setTime((await setup(h)).readingEndsAt);
      assert.deepEqual(await h.service.runSetupDeadline(intent.payload), { status: 'advanced' });
      const final = await launched(h);
      const afterLaunch = readyResponse(await h.service.readyForMatch(h.players[0].uid, accepted.body));
      assert.deepEqual(withoutTime(afterLaunch), withoutTime(accepted.response), 'Replay returns the original accepted Ready response');
      assert.deepEqual((await ref.get()).data(), saved);
      assert.deepEqual(await setup(h), final.progress);
      assert.deepEqual((await h.base.collection('engine').doc('current').get()).data(), final.state);
      assert.equal((await h.base.collection('events').get()).size, 1);
    });

    test(`${count} seats ${profile.name}: recovery clears Ready and fresh binding must acknowledge the same prepared pins`, async () => {
      const h = await harness(count, profile.pins), previous = h.players[0], own = await preview(h, previous);
      const accepted = await accept(h, previous, own), originalReceipt = (await receiptRef(previous.uid, accepted.body.requestId).get()).data();
      const prepared = await deal(h);
      const grant = operation(await h.service.issueSeatRecovery(h.host.uid, h.request({ seatId: own.self.seatId })));
      assert.equal(typeof grant.recoveryToken, 'string');
      const replacement = await createEmulatorIdentity();
      operation(await h.service.redeemSeatRecovery(replacement.uid, h.request({ recoveryToken: grant.recoveryToken })));
      const recovered = await preview(h, replacement), progress = await setup(h);
      assert.equal(recovered.bindingRevision, own.bindingRevision + 1);
      assert.equal(recovered.dealId, own.dealId); assert.deepEqual(recovered.self, own.self); assert.deepEqual(recovered.versions, own.versions);
      assert.deepEqual(await deal(h), prepared);
      assert.equal(progress.seats.find(seat => seat.seatId === own.self.seatId).ready, false);
      assert.equal((await h.base.collection('setupPlayerViews').doc(previous.uid).get()).exists, false);
      readyResponse(await h.service.readyForMatch(previous.uid, accepted.body), 'FORBIDDEN');
      readyResponse(await h.service.readyForMatch(replacement.uid, accepted.body), 'STALE_BINDING');
      assert.equal((await receiptRef(replacement.uid, accepted.body.requestId).get()).exists, false);
      const fresh = { ...accepted.body, bindingRevision: recovered.bindingRevision }; delete fresh.acceptedVersions;
      await rejectUnchanged(h, replacement, fresh, 'UNSUPPORTED_PROTOCOL');
      await accept(h, h.players[1], await preview(h, h.players[1]));
      const intent = await readingIntent(h);
      h.setTime((await setup(h)).readingEndsAt);
      assert.deepEqual(await h.service.runSetupDeadline(intent.payload), { status: 'unchanged' });
      await noGameplay(h);
      const reack = await accept(h, replacement, recovered, { ...fresh, acceptedVersions: recovered.versions });
      assert.equal(reack.response.stage, 'running');
      const replacementReceipt = await receiptRef(replacement.uid, fresh.requestId).get();
      assert.equal(replacementReceipt.exists, true);
      assert.equal(replacementReceipt.get('bindingRevision'), recovered.bindingRevision);
      await launched(h);
      assert.deepEqual((await receiptRef(previous.uid, accepted.body.requestId).get()).data(), originalReceipt);
      const record = (await h.base.collection('events').where('kind', '==', 'SETUP').get()).docs[0].data();
      const binding = record.seatBindings.find(seat => seat.seatId === own.self.seatId);
      assert.equal(binding.uid, replacement.uid); assert.equal(binding.bindingRevision, recovered.bindingRevision);
    });
  }

  test(`${count} seats historical 1.3: Ready without acceptedVersions and its accepted receipt retain historical behavior`, async () => {
    const h = await harness(count, RESOLUTION_FULL_GAME_VERSION_PINS), own = await preview(h, h.players[0]);
    const body = readyBody(h, own), accepted = await accept(h, h.players[0], own, body);
    assert.equal(Object.hasOwn(body, 'acceptedVersions'), false);
    const ref = receiptRef(h.players[0].uid, body.requestId), saved = (await ref.get()).data(), progress = await setup(h);
    const replay = readyResponse(await h.service.readyForMatch(h.players[0].uid, body));
    assert.deepEqual(withoutTime(replay), withoutTime(accepted.response));
    assert.deepEqual((await ref.get()).data(), saved); assert.deepEqual(await setup(h), progress);
    const second = await preview(h, h.players[1]);
    await accept(h, h.players[1], second, readyBody(h, second));
    await noGameplay(h);
    const intent = await readingIntent(h);
    h.setTime((await setup(h)).readingEndsAt);
    assert.deepEqual(await h.service.runSetupDeadline(intent.payload), { status: 'advanced' });
    const final = await launched(h);
    assert.deepEqual(final.state.versions, { ...RESOLUTION_FULL_GAME_VERSION_PINS, assetManifestVersion: preparedAsset });
    assert.equal(Object.hasOwn(final.view, 'voteResult'), false);
  });
}
