import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  FullOperationResponseSchema, FullSetPracticeBotsResponseSchema, FullReadyForMatchResponseSchema,
  FullCommandResponseSchema, FullAdvanceResponseSchema, FullPlayerViewSchema, FullPublicViewSchema,
  FullSetupPlayerViewSchema, FullSetupDocumentSchema,
  CLONE_VERSION_PINS,
} from '@mothership/contracts';
import {
  FULL_GAME_VERSION_PINS, RESOLUTION_FULL_GAME_VERSION_PINS, DECLARED_HACK_FULL_GAME_VERSION_PINS,
  VOTE_RESULT_FULL_GAME_VERSION_PINS, CAPACITY_FULL_GAME_VERSION_PINS,
  PASS_FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS,
  createFullGame, executeFullGame, advanceFullGame, abortFullGame, projectFullGame,
} from '@mothership/engine';
import { createV1Service } from '../dist/index.js';
import { decodeV1Setup, decodeV1State } from '../dist/full-game.js';
import { beginStagedSetup, confirmStagedChoices, deliverSetupDeadline } from './staged-start-helper.mjs';
import { assertLocalEmulators, projectId, createEmulatorIdentity } from '../../../infra/firebase/test/helpers.mjs';

// Native creation/admission/setup only: no Admin writes seed gameplay, pins,
// roles or a prepared deal. The deterministic shuffle/room rank and injected
// clock are explicit fixtures. Stored workers are invoked directly; these tests
// do not prove automatic Functions/Tasks delivery or browser/art-byte loading.
const RELEASE_ASSET = 'design-0.3.0';
const HISTORICAL_ASSET = 'v1-preview-469bf64fe98cac5a';
const RELEASE_PINS = DECLARED_HACK_FULL_GAME_VERSION_PINS;
// Independent expected routing table, including every executable historical
// tuple. The old 1.0.0 handoff fixture is not a supported service behavior.
const ROUTING_PROFILES = [
  { pins: LEGACY_FULL_GAME_VERSION_PINS, asset: HISTORICAL_ASSET, acknowledge: false },
  { pins: PASS_FULL_GAME_VERSION_PINS, asset: HISTORICAL_ASSET, acknowledge: false },
  { pins: CAPACITY_FULL_GAME_VERSION_PINS, asset: HISTORICAL_ASSET, acknowledge: false },
  { pins: RESOLUTION_FULL_GAME_VERSION_PINS, asset: HISTORICAL_ASSET, acknowledge: false },
  { pins: VOTE_RESULT_FULL_GAME_VERSION_PINS, asset: 'design-0.2.0', acknowledge: true },
  { pins: RELEASE_PINS, asset: RELEASE_ASSET, acknowledge: true },
];
let app, db, serial = 0;
before(() => {
  assertLocalEmulators();
  assert.deepEqual(FULL_GAME_VERSION_PINS, RESOLUTION_FULL_GAME_VERSION_PINS,
    'Unconfigured service creation must retain the reviewed 1.3 default');
  assert.equal(RELEASE_PINS.engineVersion, 'full-game-1.5.0');
  app = initializeApp({ projectId }, `release-profile-${randomUUID()}`); db = getFirestore(app);
});
after(async () => { await db?.terminate(); if (app) await deleteApp(app); });

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const operation = response => {
  const parsed = FullOperationResponseSchema.parse(response);
  assert.equal(parsed.ok, true, JSON.stringify(parsed)); return parsed.result;
};
const setup = async h => FullSetupDocumentSchema.parse((await h.base.collection('setup').doc('public').get()).data());
const prepared = async h => (await h.base.collection('setup').doc('deal').get()).data();
const current = async h => decodeV1State((await h.base.collection('engine').doc('current').get()).data());
const preview = async (h, player) => FullSetupPlayerViewSchema.parse(
  (await h.base.collection('setupPlayerViews').doc(player.uid).get()).data());
const records = async h => (await h.base.collection('events').orderBy('sequence').get()).docs.map(doc => doc.data());
const withoutTime = ({ serverTimeMs: _time, ...response }) => response;

async function lobby(count, { creationVersions, assetManifestVersion = 'design-0.2.0', historicalAssetManifestVersion } = {}) {
  let now = 1_700_000_000_000 + ++serial * 100_000_000;
  const options = { db, clock: () => now, shuffle: items => [...items], randomStartingRoomRank: () => 0,
    assetManifestVersion, ...(creationVersions === undefined ? {} : { creationVersions }),
    ...(historicalAssetManifestVersion === undefined ? {} : { historicalAssetManifestVersion }) };
  const service = createV1Service(options), host = await createEmulatorIdentity();
  const created = operation(await service.createMatch(host.uid, { protocolVersion: 2, requestId: randomUUID(), playerCount: count }));
  const base = db.collection('matches').doc(created.matchId);
  const pins = creationVersions ?? RESOLUTION_FULL_GAME_VERSION_PINS;
  assert.deepEqual((await base.collection('engine').doc('gameplayPins').get()).data(), pins,
    'Creation must persist its selected gameplay pins without a fixture overwrite');
  assert.equal((await base.collection('engine').doc('current').get()).exists, false);
  const request = (fields = {}) => ({ protocolVersion: 2, matchId: base.id, requestId: randomUUID(), ...fields });
  const players = [];
  for (let index = 0; index < 2; index++) {
    const player = await createEmulatorIdentity();
    const admission = operation(await service.requestAdmission(player.uid, { protocolVersion: 2,
      requestId: randomUUID(), roomCode: created.roomCode }));
    operation(await service.approveAdmission(host.uid, request({ admissionId: admission.admissionId, seatId: `seat-${index + 1}` })));
    players.push(player);
  }
  const bots = FullSetPracticeBotsResponseSchema.parse(await service.setPracticeBots(host.uid,
    { schemaVersion: 1, ...request({ botCount: count - players.length }) }));
  assert.equal(bots.ok, true, JSON.stringify(bots));
  assert.equal(bots.botSeatIds.length, count - players.length);
  const h = { service, options, host, players, base, request, pins, assetManifestVersion,
    now: () => now, setTime: value => { assert.ok(value >= now, 'The trusted fixture clock cannot regress'); now = value; } };
  h.recreate = changes => { h.service = createV1Service({ ...options, ...changes }); return h.service; };
  return h;
}

async function prepare(h, expectedAssetManifestVersion = h.assetManifestVersion) {
  await beginStagedSetup(h);
  const progress = await confirmStagedChoices(h), deal = await prepared(h);
  assert.equal(progress.stage, 'awaiting-ready');
  assert.equal(progress.readingEndsAt - progress.readingStartedAt, 30_000);
  assert.deepEqual(deal.versions, { ...h.pins, assetManifestVersion: expectedAssetManifestVersion });
  assert.equal(progress.seats.filter(seat => seat.ready).length, progress.playerCount - h.players.length);
  for (const player of h.players) assert.deepEqual((await preview(h, player)).versions, deal.versions);
  assert.equal((await h.base.collection('engine').doc('current').get()).exists, false);
  assert.equal((await h.base.collection('events').get()).size, 0);
  return deal;
}

async function readyAndLaunch(h, { acknowledge, rejectMissing = false } = {}) {
  const deal = await prepared(h), accepted = [];
  for (const [index, player] of h.players.entries()) {
    const own = await preview(h, player);
    const body = { schemaVersion: 1, ...h.request(), dealId: own.dealId, bindingRevision: own.bindingRevision,
      ...(acknowledge ? { acceptedVersions: { ...own.versions } } : {}) };
    assert.equal(Object.hasOwn(body, 'acceptedVersions'), acknowledge);
    if (rejectMissing && index === 0) {
      const missing = { ...body }; delete missing.acceptedVersions;
      const before = await setup(h), response = FullReadyForMatchResponseSchema.parse(await h.service.readyForMatch(player.uid, missing));
      assert.equal(response.ok, false); assert.equal(response.error.code, 'UNSUPPORTED_PROTOCOL');
      assert.deepEqual(await setup(h), before);
      assert.equal((await db.collection('setupOperations').doc(hash([player.uid, body.requestId])).get()).exists, false,
        'Missing compatibility must not consume the ID needed for its corrected acknowledgment');
    }
    const response = FullReadyForMatchResponseSchema.parse(await h.service.readyForMatch(player.uid, body));
    assert.equal(response.ok, true, JSON.stringify(response));
    assert.equal(response.stage, 'awaiting-ready'); assert.equal(response.dealId, deal.dealId);
    assert.equal(response.seatId, own.self.seatId); assert.equal(response.bindingRevision, own.bindingRevision);
    accepted.push({ player, body, response });
  }
  assert.equal((await h.base.collection('engine').doc('current').get()).exists, false,
    'All humans Ready cannot shorten the full reading window');
  await deliverSetupDeadline(h, 'awaiting-ready');
  const state = await current(h), view = FullPublicViewSchema.parse((await h.base.collection('views').doc('public').get()).data());
  assert.deepEqual(state.versions, deal.versions); assert.deepEqual(view.versions, deal.versions);
  assert.deepEqual((await h.base.collection('engine').doc('gameplayPins').get()).data(), h.pins);
  assert.equal(state.phase.kind, 'ORDINARY_TURN'); assert.equal(state.phase.startedAt, h.now());
  assert.equal(state.phase.endsAt - state.phase.startedAt, 60_000);
  assert.equal((await h.base.collection('events').where('kind', '==', 'SETUP').get()).size, 1);
  return { state, accepted };
}

async function command(h, player, value) {
  const state = await current(h);
  const request = { protocolVersion: 2, matchId: h.base.id, phaseId: state.phase.id, commandId: randomUUID(), command: value };
  const response = FullCommandResponseSchema.parse(await h.service.submit(player.uid, request));
  assert.equal(response.ok, true, JSON.stringify(response)); assert.equal(response.receipt.status, 'accepted');
  return { request, receipt: response.receipt };
}

async function deadline(h, state) {
  const taskId = hash([h.base.id, state.phase.id, state.deadlineToken]);
  const intent = (await h.base.collection('outbox').doc(taskId).get()).data();
  assert.ok(intent, 'Each live phase must have its real persisted outbox intent');
  assert.equal(intent.phaseId, state.phase.id); assert.equal(intent.deadlineToken, state.deadlineToken);
  assert.equal(intent.endsAt, state.phase.endsAt);
  h.setTime(intent.endsAt);
  const response = FullAdvanceResponseSchema.parse(await h.service.runDeadline({ matchId: intent.matchId,
    phaseId: intent.phaseId, deadlineToken: intent.deadlineToken }));
  assert.equal(response.result, 'advanced'); return current(h);
}

async function assertReplay(h) {
  const journal = await records(h);
  assert.deepEqual(journal.map(record => record.sequence), Array.from({ length: journal.length }, (_, index) => index + 1));
  let replay;
  for (const record of journal) {
    if (record.kind === 'SETUP') replay = createFullGame({ ...record, setup: decodeV1Setup(record.setup) });
    else if (record.kind === 'COMMAND') {
      const decision = executeFullGame(replay, record.actorSeatId, record.request, record);
      assert.deepEqual(decision.receipt, record.receipt); replay = decision.state;
    } else if (record.kind === 'DEADLINE') {
      const decision = advanceFullGame(replay, record); assert.equal(decision.advanced, true); replay = decision.state;
    } else if (record.kind === 'ABORT') replay = abortFullGame(replay, record);
    else assert.fail('Unexpected journal record');
    replay = { ...replay, journalSequence: record.sequence };
  }
  assert.deepEqual(replay, await current(h));
  assert.equal((await h.base.collection('receipts').get()).size, journal.filter(record => record.kind === 'COMMAND').length);
  const views = projectFullGame(replay);
  assert.deepEqual((await h.base.collection('views').doc('public').get()).data(), views.public);
  for (const [index, player] of h.players.entries()) {
    assert.deepEqual(FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(player.uid).get()).data()),
      views.players[`seat-${index + 1}`]);
  }
}

for (const count of [7, 8, 9]) {
  test(`${count} seats: the Board V2 worker preserves an unprepared 1.5 lobby and accepted Ready receipts`, async () => {
    const h = await lobby(count, { creationVersions: RELEASE_PINS, assetManifestVersion: RELEASE_ASSET });
    h.recreate({ creationVersions: CLONE_VERSION_PINS, assetManifestVersion: 'design-0.4.0', historicalAssetManifestVersion: HISTORICAL_ASSET });
    const deal = await prepare(h, RELEASE_ASSET);
    const { state, accepted } = await readyAndLaunch(h, { acknowledge: true });
    assert.deepEqual(state.versions, { ...RELEASE_PINS, assetManifestVersion: RELEASE_ASSET });
    for (const { player, body, response } of accepted) assert.deepEqual(
      withoutTime(await h.service.readyForMatch(player.uid, body)), withoutTime(response));
    assert.deepEqual(await prepared(h), deal);
    await assertReplay(h);
  });
  test(`${count} seats: native Board V2 creation and staged Ready retain the exact new five-pin agreement`, async () => {
    const h = await lobby(count, { creationVersions: CLONE_VERSION_PINS, assetManifestVersion: 'design-0.4.0', historicalAssetManifestVersion: HISTORICAL_ASSET });
    const deal = await prepare(h, 'design-0.4.0');
    const { state, accepted } = await readyAndLaunch(h, { acknowledge: true, rejectMissing: true });
    assert.deepEqual(state.versions, { ...CLONE_VERSION_PINS, assetManifestVersion: 'design-0.4.0' });
    h.recreate({ creationVersions: RELEASE_PINS, assetManifestVersion: RELEASE_ASSET });
    assert.deepEqual(await prepared(h), deal);
    for (const { player, body, response } of accepted) assert.deepEqual(
      withoutTime(await h.service.readyForMatch(player.uid, body)), withoutTime(response));
    await command(h, h.players[0], { type: 'PASS_TURN' });
    assert.deepEqual((await current(h)).versions, deal.versions);
    await assertReplay(h);
  });
  test(`${count} seats: unconfigured native creation and historical Ready retain the 1.3 default`, async () => {
    const h = await lobby(count), deal = await prepare(h);
    assert.deepEqual(deal.versions, { ...RESOLUTION_FULL_GAME_VERSION_PINS, assetManifestVersion: 'design-0.2.0' });
    const { state } = await readyAndLaunch(h, { acknowledge: false });
    for (const view of [projectFullGame(state).public, ...Object.values(projectFullGame(state).players)]) {
      assert.equal(Object.hasOwn(view, 'hackFeedback'), false);
      assert.equal(Object.hasOwn(view, 'voteResult'), false);
    }
    await assertReplay(h);
  });

  for (const profile of ROUTING_PROFILES) {
    test(`${count} seats: stored ${profile.pins.engineVersion} routes art explicitly and freezes all prepared pins`, async () => {
      const freshRelease = profile.pins === RELEASE_PINS;
      const h = await lobby(count, { creationVersions: profile.pins,
        ...(freshRelease ? { assetManifestVersion: RELEASE_ASSET, historicalAssetManifestVersion: HISTORICAL_ASSET } : {}) });
      // Historical lobbies were created by a worker with routing omitted. The
      // new release worker must use their saved tuple, not its creation mode.
      h.recreate({ creationVersions: RELEASE_PINS, assetManifestVersion: RELEASE_ASSET,
        historicalAssetManifestVersion: HISTORICAL_ASSET });
      const deal = await prepare(h, profile.asset);
      const expected = { ...profile.pins, assetManifestVersion: profile.asset };
      assert.deepEqual(deal.versions, expected);
      h.recreate({ creationVersions: RESOLUTION_FULL_GAME_VERSION_PINS, assetManifestVersion: 'design-0.2.0',
        historicalAssetManifestVersion: 'different-historical-test-assets' });
      assert.deepEqual(await prepared(h), deal,
        'Changing routing after preparation cannot retag or redeal a saved match');
      const { state, accepted } = await readyAndLaunch(h, { acknowledge: profile.acknowledge });
      assert.deepEqual(state.versions, expected);
      h.recreate({ creationVersions: RELEASE_PINS, assetManifestVersion: RELEASE_ASSET,
        historicalAssetManifestVersion: HISTORICAL_ASSET });
      for (const { player, body, response } of accepted) {
        const retry = FullReadyForMatchResponseSchema.parse(await h.service.readyForMatch(player.uid, body));
        assert.deepEqual(withoutTime(retry), withoutTime(response));
        assert.equal(Object.hasOwn(body, 'acceptedVersions'), profile.acknowledge);
        if (profile.acknowledge) assert.deepEqual(body.acceptedVersions, expected);
      }
      assert.deepEqual(await prepared(h), deal); assert.deepEqual(await current(h), state);
      const journal = await records(h);
      assert.deepEqual(journal.find(record => record.kind === 'SETUP').versions, expected,
        'The recorded SETUP and replay retain the same complete five-pin tuple');
      await assertReplay(h);
    });
  }

  test(`${count} seats: a 1.3 deal prepared before routing retains its original asset through Ready and replay`, async () => {
    const h = await lobby(count), deal = await prepare(h);
    const expected = { ...RESOLUTION_FULL_GAME_VERSION_PINS, assetManifestVersion: 'design-0.2.0' };
    assert.deepEqual(deal.versions, expected);
    h.recreate({ creationVersions: RELEASE_PINS, assetManifestVersion: RELEASE_ASSET,
      historicalAssetManifestVersion: HISTORICAL_ASSET });
    assert.deepEqual(await prepared(h), deal,
      'An existing prepared 1.3 deal must not be moved to the newly configured historical asset');
    const { state, accepted } = await readyAndLaunch(h, { acknowledge: false });
    assert.deepEqual(state.versions, expected);
    h.recreate({ creationVersions: RESOLUTION_FULL_GAME_VERSION_PINS, assetManifestVersion: RELEASE_ASSET,
      historicalAssetManifestVersion: HISTORICAL_ASSET });
    for (const { player, body, response } of accepted) {
      assert.equal(Object.hasOwn(body, 'acceptedVersions'), false);
      const retried = FullReadyForMatchResponseSchema.parse(await h.service.readyForMatch(player.uid, body));
      assert.deepEqual(withoutTime(retried), withoutTime(response));
    }
    assert.deepEqual(await prepared(h), deal); assert.deepEqual(await current(h), state);
    await assertReplay(h);
  });

  test(`${count} seats: explicit 1.5 creation, prepared art and Ready receipts survive changed service defaults`, async () => {
    const h = await lobby(count, { creationVersions: RELEASE_PINS, assetManifestVersion: RELEASE_ASSET });
    // A different creation mode cannot reinterpret a lobby's stored gameplay pins.
    h.recreate({ creationVersions: RESOLUTION_FULL_GAME_VERSION_PINS });
    const deal = await prepare(h);
    h.recreate({ creationVersions: RESOLUTION_FULL_GAME_VERSION_PINS, assetManifestVersion: 'design-0.2.0' });
    assert.deepEqual(await prepared(h), deal, 'Service recreation cannot replace a prepared deal or asset pin');
    const { state, accepted } = await readyAndLaunch(h, { acknowledge: true, rejectMissing: true });
    assert.deepEqual(state.versions, { ...RELEASE_PINS, assetManifestVersion: RELEASE_ASSET });
    h.recreate({ creationVersions: RESOLUTION_FULL_GAME_VERSION_PINS, assetManifestVersion: '0.0.0-no-assets' });
    for (const { player, body, response } of accepted) {
      const retry = FullReadyForMatchResponseSchema.parse(await h.service.readyForMatch(player.uid, body));
      assert.deepEqual(withoutTime(retry), withoutTime(response), 'Accepted Ready replay retains its original five-pin intent');
    }
    assert.deepEqual(await current(h), state); assert.deepEqual(await prepared(h), deal);
    await command(h, h.players[0], { type: 'PASS_TURN' });
    const continued = await current(h);
    assert.equal(continued.phase.kind, 'ORDINARY_TURN'); assert.equal(continued.activeSeatId, 'seat-2');
    assert.deepEqual(continued.versions, deal.versions,
      'A running 1.5 match still executes under its stored pins after the service changes creation profile');
    const fresh = operation(await h.service.createMatch(h.host.uid, { protocolVersion: 2, requestId: randomUUID(), playerCount: count }));
    assert.deepEqual((await db.collection('matches').doc(fresh.matchId).collection('engine').doc('gameplayPins').get()).data(),
      RESOLUTION_FULL_GAME_VERSION_PINS, 'The recreated service applies its selected creation mode only to new matches');
    await assertReplay(h);
  });

  test(`${count} seats: native 1.5 bot target commits one declaration receipt, full result/talk and exact replay`, async () => {
    const h = await lobby(count, { creationVersions: RELEASE_PINS, assetManifestVersion: RELEASE_ASSET });
    await prepare(h); const { state: turn } = await readyAndLaunch(h, { acknowledge: true });
    assert.equal(turn.activeSeatId, 'seat-1', 'The explicit deterministic shuffle retains the first human turn');
    const own = FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(h.players[0].uid).get()).data());
    const bindings = (await h.base.collection('seats').get()).docs;
    const target = own.legalTargets.REQUEST_HACK.find(id => bindings.find(binding => binding.id === id)?.get('controller') === 'bot');
    assert.ok(target, 'The native room assignment supplies a legal bot target');
    await command(h, h.players[0], { type: 'REQUEST_HACK', targetSeatId: target });
    await command(h, h.players[0], { type: 'PASS_TURN' });
    const opened = await current(h);
    assert.equal(opened.phase.kind, 'HACK_DECLARE'); assert.equal(opened.phase.endsAt - opened.phase.startedAt, 15_000);
    assert.equal(opened.activeHack.targetSeatId, target);
    const expectedSide = opened.seats.find(seat => seat.seatId === target).faction;
    const worker = await h.service.runPracticeBots(h.base.id, { limit: 18 });
    assert.equal(worker.status, 'advanced'); assert.ok(worker.processed > 0 && worker.processed <= 18);
    const result = await current(h);
    assert.equal(result.phase.kind, 'HACK_RESULT'); assert.equal(result.phase.startedAt, h.now());
    assert.equal(result.phase.endsAt, h.now() + 5000);
    assert.equal(result.activeSeatId, 'seat-1'); assert.equal(result.activeHack.targetSeatId, target);
    const declarations = (await records(h)).filter(record => record.kind === 'COMMAND' && record.request.command.type === 'DECLARE_HACK_SIDE');
    assert.equal(declarations.length, 1);
    const declared = declarations[0];
    assert.equal(declared.controller, 'bot'); assert.equal(declared.policyVersion, 'practice-1');
    assert.equal(Object.hasOwn(declared, 'verifiedUid'), false); assert.equal(declared.actorSeatId, target);
    assert.deepEqual(declared.request.command, { type: 'DECLARE_HACK_SIDE', declaredSide: expectedSide });
    assert.equal(declared.request.phaseId, opened.phase.id);
    assert.deepEqual(declared.receipt, { protocolVersion: 2, matchId: h.base.id, phaseId: opened.phase.id,
      commandId: declared.request.commandId, status: 'accepted', code: 'REGISTERED' });
    const receipt = (await h.base.collection('receipts').doc(hash([target, declared.request.commandId])).get()).data();
    assert.equal(receipt.controller, 'bot'); assert.deepEqual(receipt.receipt, declared.receipt);
    const saved = await records(h);
    assert.deepEqual(await h.service.runPracticeBots(h.base.id, { limit: 18 }), { status: 'unchanged', processed: 0 });
    assert.deepEqual(await records(h), saved, 'A repeated bot invocation cannot replace its accepted claim');
    const humanView = FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(h.players[0].uid).get()).data());
    assert.deepEqual(humanView.hackFeedback, { hackId: opened.phase.id, phaseId: result.phase.id, round: result.round,
      status: 'DECLARED', declaredSide: expectedSide });
    assert.equal((await h.base.collection('playerViews').get()).size, h.players.length, 'Bot private views are not published as human documents');
    const publicView = FullPublicViewSchema.parse((await h.base.collection('views').doc('public').get()).data());
    assert.equal(Object.hasOwn(publicView, 'hackFeedback'), false); assert.equal(Object.hasOwn(publicView, 'hackPartnerSeatId'), false);
    h.setTime(result.phase.endsAt - 1);
    const earlyResult = await h.service.runDeadline({ matchId: h.base.id,
      phaseId: result.phase.id, deadlineToken: result.deadlineToken });
    assert.deepEqual(earlyResult, { status: 'too-early', retryAfterMs: 1 }); assert.deepEqual(await current(h), result);
    const talk = await deadline(h, result);
    assert.equal(talk.phase.kind, 'HACK'); assert.equal(talk.phase.startedAt, result.phase.endsAt);
    assert.equal(talk.phase.endsAt, talk.phase.startedAt + 60_000);
    assert.equal(talk.hackFeedback.hackId, opened.phase.id); assert.equal(talk.hackFeedback.phaseId, talk.phase.id);
    h.setTime(talk.phase.endsAt - 1);
    const early = await h.service.runDeadline({ matchId: h.base.id,
      phaseId: talk.phase.id, deadlineToken: talk.deadlineToken });
    assert.deepEqual(early, { status: 'too-early', retryAfterMs: 1 }); assert.deepEqual(await current(h), talk);
    const next = await deadline(h, talk);
    assert.equal(next.phase.kind, 'ORDINARY_TURN'); assert.equal(next.activeSeatId, 'seat-2');
    assert.equal(next.phase.startedAt, talk.phase.endsAt); assert.equal(next.phase.endsAt - next.phase.startedAt, 60_000);
    assert.equal(next.activeHack, null); assert.equal(next.hackFeedback, null);
    assert.deepEqual(next.versions, { ...RELEASE_PINS, assetManifestVersion: RELEASE_ASSET });
    await assertReplay(h);
  });
}
