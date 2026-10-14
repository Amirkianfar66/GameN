// Provisional #139 acceptance: synthetic initial SETUP; subsequent real service decisions.
// Real Auth/Firestore Rules do not establish HTTP token validation, automatic Tasks delivery,
// native setup randomness, visual art or physical conversation privacy.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  FullCommandResponseSchema, FullAdvanceResponseSchema, FullOperationResponseSchema,
  FullLookupResponseSchema, FullPublicViewSchema, FullPlayerViewSchema, FullLobbyViewSchema, FullEventSchema,
  OwnAcknowledgmentsSchema, SeatSessionSchema, FullPracticeBotsDocumentSchema, PRACTICE_BOT_POLICY_VERSION,
} from '@mothership/contracts';
import {
  PUBLIC_HACK_FULL_GAME_VERSION_PINS as HACK_PINS, createFullGame, executeFullGame, advanceFullGame, abortFullGame,
  projectFullGame, projectOwnAcknowledgments,
} from '@mothership/engine';
import { createV1Service } from '../dist/index.js';
import { encodeV1Setup, encodeV1State, decodeV1Setup, decodeV1State } from '../dist/full-game.js';
import { assertLocalEmulators, createEmulatorIdentity, firestoreRequest } from '../../../infra/firebase/test/helpers.mjs';
import { createV1DeadlineHandler } from '../../../infra/firebase/dist/v1.js';

let app, db;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const job = state => ({ matchId: state.matchId, phaseId: state.phase.id, deadlineToken: state.deadlineToken });
const operation = value => {
  const response = FullOperationResponseSchema.parse(value);
  assert.equal(response.ok, true, JSON.stringify(response)); return response.result;
};
before(() => {
  assertLocalEmulators();
  assert.equal(HACK_PINS.engineVersion, 'full-game-1.6.0', 'This suite requires the provisional public-Hack tuple');
  app = initializeApp({ projectId: 'demo-mothership' }, `public-hack-${randomUUID()}`); db = getFirestore(app);
});
after(async () => { await db?.terminate(); if (app) await deleteApp(app); });

async function seed(playerCount, { botSeatIds = [] } = {}) {
  // Explicit local Admin synthetic initial SETUP, with legal independent role/room/order
  // inputs. This does not prove native lobby randomness or automatic Functions/Tasks
  // delivery. Every later gameplay state is produced by actual service operations;
  // no intermediate ballot, predecessor, health, continuation or result is injected.
  let now = 1_800_000_000_000;
  const players = await Promise.all(Array.from({ length: playerCount }, () => createEmulatorIdentity()));
  const [display, outsider, host] = await Promise.all([createEmulatorIdentity(), createEmulatorIdentity(), createEmulatorIdentity()]);
  const roleOrder = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien',
    ...(playerCount >= 8 ? ['Red Disabler'] : []), ...(playerCount === 9 ? ['Officer'] : [])];
  const ids = roleOrder.map((_, index) => `seat-${index + 1}`);
  const setup = { playerCount, roleOrder, codeExtraSeatIds: ['seat-1', 'seat-2', 'seat-3'],
    initialRooms: Object.fromEntries(ids.map((id, index) => [id, index < 5 ? 'Room A' : 'Room B'])),
    roundOrders: Array.from({ length: 5 }, () => [...ids]) };
  const matchId = `public-hack-${randomUUID()}`, base = db.collection('matches').doc(matchId);
  const context = { matchId, now, phaseId: randomUUID(), deadlineToken: randomUUID(),
    assetManifestVersion: 'public-hack-service-fixture-assets-v1',
    versions: { ...HACK_PINS, assetManifestVersion: 'public-hack-service-fixture-assets-v1' } };
  const state = { ...createFullGame({ ...context, setup }), journalSequence: 1 }, views = projectFullGame(state);
  const seatBindings = state.seats.map((seat, index) => ({ seatId: seat.seatId,
    ...(botSeatIds.includes(seat.seatId) ? { controller: 'bot' } : { uid: players[index].uid }),
    bindingRevision: 1, initialRoom: setup.initialRooms[seat.seatId] }));
  const batch = db.batch();
  batch.create(base.collection('control').doc('session'), { protocolVersion: 2, hostUid: host.uid,
    playerCount, status: 'running', roomCode: 'ABCDEF123456', createdAt: now, gameStarted: true });
  batch.create(base.collection('engine').doc('gameplayPins'), HACK_PINS);
  batch.create(base.collection('engine').doc('current'), encodeV1State(state));
  batch.create(base.collection('lobby').doc('public'), FullLobbyViewSchema.parse({ protocolVersion: 2, matchId,
    playerCount, status: 'running', seats: seatBindings.map(({ seatId, initialRoom }) => ({ seatId, initialRoom })) }));
  batch.create(base.collection('members').doc(display.uid), { kind: 'display' });
  batch.create(base.collection('members').doc(host.uid), { kind: 'display' });
  batch.create(base.collection('practice').doc('public'), FullPracticeBotsDocumentSchema.parse({ schemaVersion: 1,
    protocolVersion: 2, matchId, revision: 0, policyVersion: PRACTICE_BOT_POLICY_VERSION, botSeatIds }));
  batch.create(base.collection('views').doc('public'), FullPublicViewSchema.parse(views.public));
  for (const binding of seatBindings) {
    const { seatId, ...stored } = binding;
    batch.create(base.collection('seats').doc(seatId), stored);
    if (binding.controller === 'bot') continue;
    batch.create(base.collection('members').doc(binding.uid), { kind: 'player', seatId, bindingRevision: 1 });
    batch.create(base.collection('seatSessions').doc(binding.uid), SeatSessionSchema.parse({ schemaVersion: 1, protocolVersion: 2,
      matchId, seatId, bindingRevision: 1 }));
    batch.create(base.collection('playerViews').doc(binding.uid), FullPlayerViewSchema.parse(views.players[seatId]));
    batch.create(base.collection('ownAcknowledgments').doc(binding.uid), projectOwnAcknowledgments(state, seatId));
  }
  batch.create(base.collection('events').doc(randomUUID()), { journalVersion: 1, sequence: 1, kind: 'SETUP', ...context,
    setup: encodeV1Setup(setup), verifiedUid: host.uid, dealId: `synthetic-${randomUUID()}`, seatBindings });
  const taskId = hash([matchId, state.phase.id, state.deadlineToken]);
  batch.create(base.collection('outbox').doc(taskId), { protocolVersion: 2, ...job(state), taskId,
    endsAt: state.phase.endsAt, status: 'pending', attempts: 0, nextAttemptAt: now, leaseUntil: null, leaseToken: null });
  await batch.commit();
  const options = { db, clock: () => now,
    randomInitialRoom: () => assert.fail('Recorded SETUP must not draw rooms'),
    randomStartingRoomRank: () => assert.fail('Recorded SETUP must not redraw rooms') };
  const h = { base, players, display, outsider, host, botSeatIds, service: createV1Service(options), options,
    now: () => now, setTime: value => { assert.ok(value >= now, 'Trusted fixture clock must not regress'); now = value; },
    current: async () => decodeV1State((await base.collection('engine').doc('current').get()).data()) };
  h.request = (fields = {}) => ({ protocolVersion: 2, matchId, requestId: randomUUID(), ...fields });
  // Scope only the candidate query to this real fixture/phase. All service queries,
  // dispatches and transaction decisions remain real Firestore, with no mock state.
  h.repairFor = phaseId => createV1Service({ ...options, db: {
    collection: name => db.collection(name), doc: path => db.doc(path),
    runTransaction: callback => db.runTransaction(callback),
    collectionGroup: name => { assert.equal(name, 'outbox'); return base.collection(name).where('phaseId', '==', phaseId); },
  } });
  return h;
}
const own = (state, seatId) => state.seats.find(seat => seat.seatId === seatId);
const journal = async h => (await h.base.collection('events').orderBy('sequence').get()).docs.map(doc => doc.data());
async function submit(h, seatId, command, phaseId) {
  const state = await h.current(); h.setTime(Math.max(h.now(), state.phase.startedAt + 1));
  const request = { protocolVersion: 2, matchId: h.base.id, phaseId: phaseId ?? state.phase.id, commandId: randomUUID(), command };
  const response = FullCommandResponseSchema.parse(await h.service.submit(h.players[Number(seatId.slice(5)) - 1].uid, request));
  assert.equal(response.ok, true, JSON.stringify(response)); return { request, receipt: response.receipt };
}
async function accept(h, seatId, command) {
  const response = await submit(h, seatId, command);
  assert.equal(response.receipt.status, 'accepted', JSON.stringify(response)); return response;
}
async function expire(h) {
  const state = await h.current(); assert.notEqual(state.phase.endsAt, null);
  h.setTime(state.phase.endsAt);
  const response = FullAdvanceResponseSchema.parse(await h.service.runDeadline(job(state)));
  assert.equal(response.result, 'advanced', JSON.stringify(response)); return h.current();
}
async function assertStored(h) {
  const state = await h.current(), projected = projectFullGame(state);
  assert.deepEqual(FullPublicViewSchema.parse((await h.base.collection('views').doc('public').get()).data()), projected.public);
  for (const [index, seat] of state.seats.entries()) {
    const uid = h.players[index].uid, binding = (await h.base.collection('seats').doc(seat.seatId).get()).data();
    if (binding.controller === 'bot') {
      assert.equal((await h.base.collection('playerViews').doc(uid).get()).exists, false, 'Bots have no synthetic human private document');
      continue;
    }
    assert.deepEqual(FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(uid).get()).data()), projected.players[seat.seatId]);
    assert.deepEqual(OwnAcknowledgmentsSchema.parse((await h.base.collection('ownAcknowledgments').doc(uid).get()).data()),
      projectOwnAcknowledgments(state, seat.seatId, binding.bindingRevision));
  }
  assert.deepEqual((await h.base.collection('engine').doc('gameplayPins').get()).data(), HACK_PINS);
  return state;
}
async function assertReplay(h) {
  const records = await journal(h);
  assert.deepEqual(records.map(record => record.sequence), Array.from({ length: records.length }, (_, index) => index + 1));
  let replay;
  for (const record of records) {
    if (record.kind === 'SETUP') replay = createFullGame({ ...record, setup: decodeV1Setup(record.setup) });
    else if (record.kind === 'COMMAND') {
      const decision = executeFullGame(replay, record.actorSeatId, record.request, record);
      assert.deepEqual(decision.receipt, record.receipt); replay = decision.state;
    } else if (record.kind === 'DEADLINE') {
      const decision = advanceFullGame(replay, record); assert.equal(decision.advanced, true); replay = decision.state;
    } else if (record.kind === 'ABORT') replay = abortFullGame(replay, record);
    else assert.fail('Unexpected journal decision');
    replay = { ...replay, journalSequence: record.sequence };
  }
  assert.deepEqual(replay, await h.current());
  assert.equal((await h.base.collection('receipts').get()).size, records.filter(record => record.kind === 'COMMAND').length);
  await assertStored(h);
}
async function publicationSnapshot(h, excludedSeatId) {
  const refs = [h.base.collection('views').doc('public')];
  for (const [index, player] of h.players.entries()) if (`seat-${index + 1}` !== excludedSeatId
    && !h.botSeatIds.includes(`seat-${index + 1}`)) {
    refs.push(h.base.collection('playerViews').doc(player.uid), h.base.collection('ownAcknowledgments').doc(player.uid));
  }
  return Promise.all(refs.map(async ref => { const document = await ref.get();
    return { path: ref.path, data: document.data(), updateTime: { seconds: document.updateTime.seconds, nanoseconds: document.updateTime.nanoseconds } }; }));
}
async function audienceCounts(h) {
  return Promise.all(['public', ...h.players.map((_, index) => `p-seat-${index + 1}`)]
    .map(async key => [key, (await h.base.collection('audienceEvents').doc(key).collection('items').get()).size]));
}

async function retryUnavailable(deliver) {
  let response;
  for (let attempt = 0; attempt < 5; attempt++) {
    response = await deliver();
    if (response.error?.code !== 'UNAVAILABLE') return response;
  }
  assert.fail(`Persistent transaction failure: ${JSON.stringify(response)}`);
}
async function openHack(h, { actor = 'seat-1', target = 'seat-2', close = 'pass' } = {}) {
  const untouched = await publicationSnapshot(h, actor), counts = await audienceCounts(h);
  const request = await accept(h, actor, { type: 'REQUEST_HACK', targetSeatId: target });
  assert.deepEqual(await publicationSnapshot(h, actor), untouched,
    'Private registration cannot rewrite public or uninvolved private documents');
  assert.deepEqual((await audienceCounts(h)).filter(([key]) => key !== `p-${actor}`),
    counts.filter(([key]) => key !== `p-${actor}`));
  if (close === 'expiry') await expire(h);
  else await accept(h, actor, { type: 'PASS_TURN' });
  const state = await assertStored(h);
  assert.equal(state.phase.kind, 'HACK_DECLARE');
  assert.equal(state.phase.endsAt - state.phase.startedAt, 15_000);
  assert.equal(state.activeSeatId, actor);
  assert.equal(state.activeHack.targetSeatId, target);
  return { state, request };
}
async function assertExchange(h, state, target, hackId, status, side, actor = 'seat-1') {
  const stored = await assertStored(h); assert.deepEqual(stored, state);
  const publicView = (await h.base.collection('views').doc('public').get()).data();
  assert.equal(Object.hasOwn(publicView, 'hackFeedback'), false);
  assert.equal(Object.hasOwn(publicView, 'hackPartnerSeatId'), false);
  const session = { hackId, actorSeatId: actor, targetSeatId: target };
  assert.deepEqual(publicView.hackSession, session, 'The public pair is an association, never a gameplay room');
  assert.equal(state.activeSeatId, actor);
  for (const [index, player] of h.players.entries()) {
    const id = `seat-${index + 1}`;
    const view = h.botSeatIds.includes(id) ? projectFullGame(state).players[id]
      : FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(player.uid).get()).data());
    assert.deepEqual(view.hackSession, session, 'Every authorized audience receives the same public pair');
    if (id === actor || id === target) {
      assert.deepEqual(view.hackFeedback, { hackId, phaseId: state.phase.id, round: state.round,
        status, declaredSide: side });
      assert.equal(view.hackPartnerSeatId, id === actor ? target : actor);
    } else {
      assert.equal(view.hackFeedback, null); assert.equal(view.hackPartnerSeatId, null);
    }
    assert.deepEqual(view.legalTargets.DECLARE_HACK_SIDE,
      state.phase.kind === 'HACK_DECLARE' && id === target ? [target] : undefined);
  }
}
const participantRequest = (h, state, side = 'Blue', commandId = randomUUID()) => ({
  protocolVersion: 2, matchId: h.base.id, phaseId: state.phase.id, commandId,
  command: { type: 'DECLARE_HACK_SIDE', declaredSide: side },
});
async function declaration(h, state, side = 'Blue', target = 'seat-2') {
  const request = participantRequest(h, state, side);
  const response = FullCommandResponseSchema.parse(await h.service.submit(h.players[Number(target.slice(5)) - 1].uid, request));
  assert.equal(response.ok, true, JSON.stringify(response)); assert.equal(response.receipt.status, 'accepted');
  return { request, receipt: response.receipt, state: await h.current() };
}
async function declarationWithLostAcknowledgment(h, state) {
  // Fault only the response after the actual Firestore commit. No authority or
  // receipt is mocked, and recovery must use the original immutable command ID.
  let loseAcknowledgment = true;
  const lossy = createV1Service({ ...h.options, db: {
    collection: name => db.collection(name), doc: path => db.doc(path),
    runTransaction: async callback => {
      const committed = await db.runTransaction(callback);
      if (loseAcknowledgment) { loseAcknowledgment = false; throw new Error('Synthetic lost response after commit'); }
      return committed;
    },
  } });
  const request = participantRequest(h, state);
  const lost = FullCommandResponseSchema.parse(await lossy.submit(h.players[1].uid, request));
  assert.equal(lost.ok, false); assert.equal(lost.error.code, 'UNAVAILABLE');
  const records = await journal(h), after = await h.current(), publications = await publicationSnapshot(h);
  assert.equal(records.filter(record => record.kind === 'COMMAND' && record.request.commandId === request.commandId).length, 1);
  assert.equal(after.phase.kind, 'HACK_RESULT');
  h.service = createV1Service(h.options);
  const recovered = FullCommandResponseSchema.parse(await h.service.submit(h.players[1].uid, request));
  assert.equal(recovered.ok, true); assert.equal(recovered.receipt.status, 'accepted');
  assert.deepEqual(await h.current(), after); assert.deepEqual(await journal(h), records);
  assert.deepEqual(await publicationSnapshot(h), publications, 'Receipt recovery creates no redundant view writes');
  return { request, receipt: recovered.receipt, state: after };
}
async function assertNoContinuation(h, state, early = false) {
  const records = await journal(h), counts = await audienceCounts(h);
  const response = await h.service.runDeadline(job(state));
  if (early) assert.deepEqual(response, { status: 'too-early', retryAfterMs: state.phase.endsAt - h.now() });
  else assert.equal(FullAdvanceResponseSchema.parse(response).result, 'unchanged');
  assert.deepEqual(await journal(h), records); assert.deepEqual(await audienceCounts(h), counts);
}
async function until(h, predicate, maximum = 100) {
  for (let attempt = 0; attempt < maximum; attempt++) {
    const state = await h.current();
    if (predicate(state)) return state;
    assert.notEqual(state.phase.endsAt, null, 'A terminal match cannot progress to a missing target checkpoint');
    await expire(h);
  }
  assert.fail('The requested canonical service checkpoint was not reached');
}
async function assertCleared(h) {
  const state = await assertStored(h), projected = projectFullGame(state);
  assert.equal(state.activeHack, null); assert.equal(projected.public.hackSession, null);
  for (const view of Object.values(projected.players)) {
    assert.equal(view.hackSession, null); assert.equal(view.hackFeedback, null); assert.equal(view.hackPartnerSeatId, null);
  }
  return state;
}

for (const playerCount of [7, 8, 9]) {
  test(`${playerCount} seats: early queue delivery retries every Hack window while public advance and stale tasks stay unchanged`, async () => {
    const h = await seed(playerCount);
    await accept(h, 'seat-1', { type: 'REQUEST_HACK', targetSeatId: 'seat-2' });
    const handler = createV1DeadlineHandler(h.service), previous = [];
    for (const [kind, nextKind, duration] of [
      ['ORDINARY_TURN', 'HACK_DECLARE', 15_000], ['HACK_DECLARE', 'HACK_RESULT', 5000],
      ['HACK_RESULT', 'HACK', 60_000], ['HACK', 'ORDINARY_TURN', 60_000],
    ]) {
      const state = await h.current(); assert.equal(state.phase.kind, kind);
      h.setTime(state.phase.endsAt - 1);
      const records = await journal(h), counts = await audienceCounts(h);
      assert.deepEqual(await h.service.runDeadline(job(state)), { status: 'too-early', retryAfterMs: 1 });
      await assert.rejects(handler(job(state)), /^Error: Deadline has not elapsed$/);
      assert.equal(FullAdvanceResponseSchema.parse(await h.service.advance(h.display.uid,
        { protocolVersion: 2, matchId: h.base.id, phaseId: state.phase.id })).result, 'unchanged');
      assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline({ ...job(state), deadlineToken: randomUUID() })).result, 'unchanged');
      for (const old of previous) assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline(old)).result, 'unchanged');
      assert.deepEqual(await h.current(), state); assert.deepEqual(await journal(h), records);
      assert.deepEqual(await audienceCounts(h), counts); await assertStored(h);
      h.setTime(state.phase.endsAt);
      await handler(job(state));
      const next = await h.current(); assert.equal(next.phase.kind, nextKind);
      assert.equal(next.phase.startedAt, h.now()); assert.equal(next.phase.endsAt - next.phase.startedAt, duration);
      const committed = await journal(h);
      assert.equal(committed.filter(record => record.kind === 'DEADLINE' && record.phaseId === state.phase.id).length, 1);
      await handler(job(state));
      assert.deepEqual(await h.current(), next); assert.deepEqual(await journal(h), committed);
      previous.push(job(state));
    }
    await assertReplay(h);
  });

  for (const close of ['pass', 'expiry']) test(`${playerCount} seats: ${close}, early declaration, five-second private result and full sixty-second talk persist and replay`, async () => {
    const h = await seed(playerCount), { state: opened } = await openHack(h, { close });
    const hackId = opened.phase.id;
    await assertExchange(h, opened, 'seat-2', hackId, 'AWAITING_DECLARATION', null);
    h.setTime(opened.phase.startedAt + 1234);
    const invalid = await submit(h, 'seat-2', { type: 'DECLARE_HACK_SIDE', declaredSide: 'Alien' });
    assert.equal(invalid.receipt.status, 'rejected'); assert.equal(invalid.receipt.code, 'NOT_ALLOWED');
    assert.deepEqual((await h.current()).phase, opened.phase, 'Invalid side cannot consume or end declaration');
    const accepted = close === 'pass' ? await declarationWithLostAcknowledgment(h, opened) : await declaration(h, opened);
    const result = accepted.state;
    assert.equal(result.phase.kind, 'HACK_RESULT');
    assert.equal(result.phase.startedAt, h.now()); assert.equal(result.phase.endsAt, h.now() + 5000);
    await assertExchange(h, result, 'seat-2', hackId, 'DECLARED', 'Blue');
    // The old phase is the receipt binding even though acceptance opened a result.
    assert.equal(accepted.receipt.phaseId, opened.phase.id);
    assert.equal(accepted.receipt.commandId, accepted.request.commandId);
    const records = await journal(h), beforeRecovery = await h.current();
    assert.deepEqual(FullCommandResponseSchema.parse(await h.service.submit(h.players[1].uid, accepted.request)).receipt, accepted.receipt);
    assert.deepEqual(FullLookupResponseSchema.parse(await h.service.lookup(h.players[1].uid,
      { protocolVersion: 2, matchId: h.base.id, commandId: accepted.request.commandId })).receipt, accepted.receipt);
    const conflict = FullCommandResponseSchema.parse(await h.service.submit(h.players[1].uid,
      { ...accepted.request, command: { type: 'DECLARE_HACK_SIDE', declaredSide: 'Red' } }));
    assert.equal(conflict.ok, false); assert.equal(conflict.error.code, 'COMMAND_ID_CONFLICT');
    assert.deepEqual(await h.current(), beforeRecovery); assert.deepEqual(await journal(h), records);
    const stale = await submit(h, 'seat-2', { type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue' }, opened.phase.id);
    assert.equal(stale.receipt.status, 'rejected'); assert.equal(stale.receipt.code, 'PHASE_CLOSED');
    const blocked = await submit(h, 'seat-2', { type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue' });
    assert.equal(blocked.receipt.status, 'rejected'); assert.equal(blocked.receipt.code, 'NOT_ALLOWED');
    h.setTime(result.phase.startedAt + 4999); await assertNoContinuation(h, result, true);
    h.setTime(result.phase.endsAt);
    const raced = await Promise.all(Array.from({ length: 3 }, () => retryUnavailable(() => h.service.runDeadline(job(result)))));
    assert.deepEqual(raced.map(response => FullAdvanceResponseSchema.parse(response).result).sort(), ['advanced', 'unchanged', 'unchanged']);
    const talk = await h.current(); assert.equal(talk.phase.kind, 'HACK');
    assert.equal(talk.phase.startedAt, h.now()); assert.equal(talk.phase.endsAt, h.now() + 60_000);
    await assertExchange(h, talk, 'seat-2', hackId, 'DECLARED', 'Blue');
    await assertNoContinuation(h, result);
    h.setTime(talk.phase.endsAt - 1); await assertNoContinuation(h, talk, true);
    const next = await expire(h); assert.equal(next.phase.kind, 'ORDINARY_TURN'); assert.equal(next.activeSeatId, 'seat-2');
    for (const view of Object.values(projectFullGame(next).players)) {
      assert.equal(view.hackFeedback, null); assert.equal(view.hackPartnerSeatId, null); assert.equal(view.hackSession, null);
    }
    assert.equal(projectFullGame(next).public.hackSession, null);
    // Receipt recovery after the whole exchange cannot resurrect feedback.
    assert.deepEqual(FullCommandResponseSchema.parse(await h.service.submit(h.players[1].uid, accepted.request)).receipt, accepted.receipt);
    assert.deepEqual(await h.current(), next); await assertReplay(h);
  });

  test(`${playerCount} seats: declaration/deadline races use exact 14999/15000 server boundaries and preserve no-declaration`, async () => {
    for (const elapsed of [14_999, 15_000]) {
      const h = await seed(playerCount), { state: opened } = await openHack(h);
      h.setTime(opened.phase.startedAt + elapsed);
      const request = participantRequest(h, opened);
      const [submitted, deadline] = await Promise.all([
        retryUnavailable(() => h.service.submit(h.players[1].uid, request)),
        retryUnavailable(() => h.service.runDeadline(job(opened))),
      ]);
      const response = FullCommandResponseSchema.parse(submitted);
      assert.equal(response.ok, true, JSON.stringify(response));
      assert.equal(response.receipt.status, elapsed === 14_999 ? 'accepted' : 'rejected');
      if (elapsed === 15_000) assert.equal(response.receipt.code, 'PHASE_CLOSED');
      if (elapsed === 14_999 && deadline.status === 'too-early') {
        assert.deepEqual(deadline, { status: 'too-early', retryAfterMs: 1 });
      } else assert.equal(FullAdvanceResponseSchema.parse(deadline).result, elapsed === 14_999 ? 'unchanged' : 'advanced');
      const result = await h.current(); assert.equal(result.phase.kind, 'HACK_RESULT');
      assert.equal(result.phase.startedAt, h.now()); assert.equal(result.phase.endsAt, h.now() + 5000);
      await assertExchange(h, result, 'seat-2', opened.phase.id,
        elapsed === 14_999 ? 'DECLARED' : 'NO_DECLARATION', elapsed === 14_999 ? 'Blue' : null);
      await assertNoContinuation(h, opened);
      const talk = await expire(h); assert.equal(talk.phase.endsAt - talk.phase.startedAt, 60_000);
      await assertExchange(h, talk, 'seat-2', opened.phase.id,
        elapsed === 14_999 ? 'DECLARED' : 'NO_DECLARATION', elapsed === 14_999 ? 'Blue' : null);
      await assertReplay(h);
    }
  });

  test(`${playerCount} seats: acknowledged lost declaration/result tasks repair once without a browser and retain full late windows`, async () => {
    const h = await seed(playerCount), { state: opened } = await openHack(h);
    for (const [previous, nextKind, duration] of [[opened, 'HACK_RESULT', 5000], [null, 'HACK', 60_000]]) {
      const state = previous ?? await h.current();
      const taskId = hash([h.base.id, state.phase.id, state.deadlineToken]), ref = h.base.collection('outbox').doc(taskId);
      let enqueues = 0;
      assert.equal((await h.service.dispatchDeadlineIntent(ref.path, async intent => {
        enqueues++; assert.equal(intent.taskId, taskId); assert.equal(intent.endsAt, state.phase.endsAt);
      })).status, 'dispatched');
      assert.equal(enqueues, 1);
      const repair = h.repairFor(state.phase.id), noEnqueue = async () => assert.fail('An acknowledged lost delivery needs no second enqueue');
      h.setTime(state.phase.endsAt - 1); await repair.repairOutbox(noEnqueue, { limit: 1 });
      assert.deepEqual(await h.current(), state);
      h.setTime(state.phase.endsAt + 90_000);
      await Promise.all([repair.repairOutbox(noEnqueue, { limit: 1 }), retryUnavailable(() => h.service.runDeadline(job(state)))]);
      const next = await h.current(); assert.equal(next.phase.kind, nextKind);
      assert.equal(next.phase.startedAt, h.now()); assert.equal(next.phase.endsAt, h.now() + duration);
      assert.equal((await ref.get()).get('status'), 'completed');
      assert.equal((await journal(h)).filter(record => record.kind === 'DEADLINE' && record.phaseId === state.phase.id).length, 1);
      const records = await journal(h); await repair.repairOutbox(noEnqueue, { limit: 1 }); await assertNoContinuation(h, state);
      assert.deepEqual(await h.current(), next); assert.deepEqual(await journal(h), records);
    }
    await assertExchange(h, await h.current(), 'seat-2', opened.phase.id, 'NO_DECLARATION', null);
    await assertReplay(h);
  });

  test(`${playerCount} seats: only fixed target can declare; private claims, Rules access and invalid submissions do not leak or rewrite bystanders`, async () => {
    const h = await seed(playerCount), { state: opened } = await openHack(h, { target: 'seat-5' });
    // Undercover may choose any side. No verified truth/faction metadata is emitted.
    const before = await publicationSnapshot(h, 'seat-5'), counts = await audienceCounts(h);
    for (const seatId of ['seat-1', 'seat-2']) {
      const rejected = await submit(h, seatId, { type: 'DECLARE_HACK_SIDE', declaredSide: 'Alien' });
      assert.equal(rejected.receipt.status, 'rejected'); assert.equal(rejected.receipt.code, 'NOT_ALLOWED');
    }
    assert.deepEqual(await publicationSnapshot(h, 'seat-5'), before);
    assert.deepEqual(await audienceCounts(h), counts, 'Rejected guesses cannot create audience events');
    const result = (await declaration(h, opened, 'Alien', 'seat-5')).state;
    await assertExchange(h, result, 'seat-5', opened.phase.id, 'DECLARED', 'Alien');
    const ownPath = `${h.base.path}/playerViews/${h.players[4].uid}`;
    assert.equal((await firestoreRequest(ownPath, { idToken: h.players[4].idToken })).status, 200);
    for (const identity of [h.players[0], h.players[1], h.host, h.display, h.outsider]) {
      assert.equal((await firestoreRequest(ownPath, { idToken: identity.idToken })).status, 403);
    }
    for (const identity of [h.players[0], h.host, h.display]) {
      const publicRead = await firestoreRequest(`${h.base.path}/views/public`, { idToken: identity.idToken });
      assert.equal(publicRead.status, 200); assert.equal(JSON.stringify(publicRead.body).includes('declaredSide'), false);
      assert.equal(publicRead.body.fields.hackSession.mapValue.fields.hackId.stringValue, opened.phase.id);
      assert.equal(publicRead.body.fields.hackSession.mapValue.fields.targetSeatId.stringValue, 'seat-5');
      assert.equal((await firestoreRequest(`${h.base.path}/engine/current`, { idToken: identity.idToken })).status, 403);
      assert.equal((await firestoreRequest(`${h.base.path}/events`, { idToken: identity.idToken })).status, 403);
    }
    for (const identity of [h.host, h.display, h.players[1], h.outsider]) {
      for (const path of ['views/public', `playerViews/${h.players[4].uid}`, 'engine/current']) {
        assert.equal((await firestoreRequest(`${h.base.path}/${path}`, { idToken: identity.idToken,
          method: 'PATCH', data: { hackSession: { hackId: opened.phase.id, actorSeatId: 'seat-1', targetSeatId: 'seat-2' } } })).status, 403);
      }
    }
    assert.equal((await firestoreRequest(`${h.base.path}/views/public`, { idToken: h.outsider.idToken })).status, 403);
    assert.equal((await firestoreRequest(`${h.base.path}/views/public`)).status, 403);
    for (const key of ['public', ...h.players.map((_, index) => `p-seat-${index + 1}`)]) {
      const items = (await h.base.collection('audienceEvents').doc(key).collection('items').get()).docs.map(doc => FullEventSchema.parse(doc.data()));
      const text = JSON.stringify(items);
      assert.equal(text.includes('declaredSide'), false); assert.equal(text.includes('hackPartnerSeatId'), false);
      assert.equal(text.includes('verifiedTruth'), false);
    }
    const latest = FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(h.players[4].uid).get()).data());
    assert.equal(FullPlayerViewSchema.safeParse({ ...latest, hackFeedback: { ...latest.hackFeedback, phaseId: opened.phase.id } }).success, false,
      'Stable exchange identity alone cannot validate old feedback for the result phase');
    await assertReplay(h);
  });

  test(`${playerCount} seats: Blue, Red, Alien and missing claims have identical public and bystander talk output at the same committed time`, async () => {
    const captures = [];
    for (const side of ['Blue', 'Red', 'Alien', null]) {
      const h = await seed(playerCount), { state: opened } = await openHack(h, { target: 'seat-5' });
      let result;
      if (side === null) result = await expire(h);
      else {
        h.setTime(opened.phase.startedAt + 14_999);
        result = (await declaration(h, opened, side, 'seat-5')).state;
      }
      assert.equal(result.phase.kind, 'HACK_RESULT');
      assert.equal(result.phase.endsAt - result.phase.startedAt, 5000);
      // Earlier accepted results are delivered one millisecond late. Missing and
      // declared cases enter talk at the same real service transition time; only
      // independent IDs are normalized, never status/content/capabilities/times.
      h.setTime(opened.phase.startedAt + 20_000);
      assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline(job(result))).result, 'advanced');
      const talk = await h.current();
      await assertExchange(h, talk, 'seat-5', opened.phase.id, side === null ? 'NO_DECLARATION' : 'DECLARED', side);
      assert.equal(talk.phase.startedAt, opened.phase.startedAt + 20_000);
      assert.equal(talk.phase.endsAt - talk.phase.startedAt, 60_000);
      const snapshot = [];
      for (const ref of [h.base.collection('views').doc('public'), ...h.players.flatMap((player, index) =>
        [0, 4].includes(index) ? [] : [h.base.collection('playerViews').doc(player.uid), h.base.collection('ownAcknowledgments').doc(player.uid)])]) {
        const value = (await ref.get()).data();
        // Only independent match/phase UUIDs differ; all authorized content,
        // revisions, phase times, capabilities and private bystander facts remain.
        snapshot.push({ ...value, ...(Object.hasOwn(value, 'matchId') ? { matchId: 'independent-match' } : {}),
          ...(value.phase ? { phase: { ...value.phase, id: 'independent-result-phase' } } : {}),
          ...(value.hackSession ? { hackSession: { ...value.hackSession, hackId: 'independent-hack' } } : {}) });
      }
      captures.push(JSON.stringify(snapshot)); await assertReplay(h);
    }
    for (const capture of captures) assert.equal(capture, captures[0], 'Private claim/status cannot alter equivalent public/bystander output');
  });

  test(`${playerCount} seats: recovery retains current claim/deadline and old receipt, revoked identity is denied, abort cannot resume the exchange`, async () => {
    const h = await seed(playerCount), { state: opened } = await openHack(h);
    h.setTime(opened.phase.startedAt + 500);
    const accepted = await declaration(h, opened), result = accepted.state;
    h.setTime(result.phase.startedAt + 1000);
    const old = h.players[1], replacement = await createEmulatorIdentity();
    const issued = operation(await h.service.issueSeatRecovery(h.host.uid, h.request({ seatId: 'seat-2' })));
    assert.equal(typeof issued.recoveryToken, 'string');
    h.setTime(result.phase.startedAt + 2000);
    operation(await h.service.redeemSeatRecovery(replacement.uid, h.request({ recoveryToken: issued.recoveryToken })));
    h.players[1] = replacement;
    assert.deepEqual((await h.current()).phase, result.phase);
    const restored = FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(replacement.uid).get()).data());
    assert.deepEqual(restored.hackFeedback, projectFullGame(result).players['seat-2'].hackFeedback);
    assert.equal(restored.phase.endsAt - h.now(), 3000);
    assert.equal((await firestoreRequest(`${h.base.path}/playerViews/${replacement.uid}`, { idToken: old.idToken })).status, 403);
    const lookupBody = { protocolVersion: 2, matchId: h.base.id, commandId: accepted.request.commandId };
    h.service = createV1Service(h.options); // Restart with only persisted authority/receipts.
    const denied = FullLookupResponseSchema.parse(await h.service.lookup(old.uid, lookupBody));
    assert.equal(denied.error.code, 'FORBIDDEN');
    assert.deepEqual(FullLookupResponseSchema.parse(await h.service.lookup(replacement.uid, lookupBody)).receipt, accepted.receipt);
    assert.deepEqual(FullCommandResponseSchema.parse(await h.service.submit(replacement.uid, accepted.request)).receipt, accepted.receipt);
    await assertStored(h);
    h.setTime(result.phase.startedAt + 3000);
    operation(await h.service.abortMatch(h.host.uid, h.request()));
    const aborted = await h.current(); assert.equal(aborted.phase.kind, 'ABORTED'); assert.equal(aborted.activeHack, null);
    for (const view of Object.values(projectFullGame(aborted).players)) {
      assert.equal(view.hackFeedback, null); assert.equal(view.hackPartnerSeatId, null); assert.equal(view.hackSession, null);
    }
    assert.equal(projectFullGame(aborted).public.hackSession, null);
    await assertNoContinuation(h, opened); await assertNoContinuation(h, result);
    assert.deepEqual(await h.current(), aborted); await assertReplay(h);
  });
}

for (const playerCount of [7, 8, 9]) {
  test(`${playerCount} seats: accepted movement during every nonfinal Hack stage keeps targets/occupancy authoritative and exits at the latest location`, async () => {
    for (const stage of ['HACK_DECLARE', 'HACK_RESULT', 'HACK']) {
      const h = await seed(playerCount), { state: opened } = await openHack(h);
      if (stage !== 'HACK_DECLARE') await declaration(h, opened);
      if (stage === 'HACK') await expire(h);
      const before = await h.current(); assert.equal(before.phase.kind, stage);
      const original = structuredClone(before.seats);
      assert.ok(projectFullGame(before).players['seat-2'].self.movementDestinations.includes('Room B'));
      const moved = await accept(h, 'seat-2', { type: 'MOVE', destination: 'Room B' });
      const current = await h.current();
      assert.deepEqual(current.phase, before.phase, 'Walking art cannot restart or extend a server stage');
      assert.equal(current.seats.length, playerCount);
      assert.equal(new Set(current.seats.map(seat => seat.seatId)).size, playerCount);
      assert.equal(own(current, 'seat-2').location, 'Room B');
      assert.equal(own(current, 'seat-2').movedInRound, true);
      assert.equal(own(current, 'seat-2').lastRoom, 'Room B');
      for (const seat of current.seats) {
        const prior = own(before, seat.seatId);
        assert.deepEqual(seat, seat.seatId === 'seat-2' ? { ...prior, location: 'Room B', lastRoom: 'Room B', movedInRound: true } : prior);
      }
      const session = { hackId: opened.phase.id, actorSeatId: 'seat-1', targetSeatId: 'seat-2' };
      assert.deepEqual(projectFullGame(current).public.hackSession, session);
      const snapshots = await publicationSnapshot(h), records = await journal(h);
      h.service = createV1Service(h.options);
      assert.deepEqual(FullCommandResponseSchema.parse(await h.service.submit(h.players[1].uid, moved.request)).receipt, moved.receipt);
      assert.deepEqual(await publicationSnapshot(h), snapshots); assert.deepEqual(await journal(h), records);
      const invalid = FullCommandResponseSchema.parse(await h.service.submit(h.players[1].uid, {
        ...moved.request, commandId: randomUUID(), command: { type: 'MOVE', destination: 'Private Capsule' },
      }));
      assert.equal(invalid.ok, false); assert.equal(invalid.error.code, 'INVALID_REQUEST');
      assert.deepEqual(await h.current(), current, 'Cinematic scenery cannot become an authoritative room');
      const talk = await until(h, state => state.phase.kind === 'HACK');
      await assertExchange(h, talk, 'seat-2', opened.phase.id,
        stage === 'HACK_DECLARE' ? 'NO_DECLARATION' : 'DECLARED', stage === 'HACK_DECLARE' ? null : 'Blue');
      h.setTime(talk.phase.endsAt - 1); await assertNoContinuation(h, talk, true);
      await expire(h);
      const after = await assertCleared(h);
      assert.equal(after.phase.kind, 'ORDINARY_TURN'); assert.equal(after.activeSeatId, 'seat-2');
      assert.equal(own(after, 'seat-2').location, 'Room B', 'Exit uses the committed latest room, not the departure room');
      assert.equal(own(after, 'seat-1').location, 'Room A');
      assert.deepEqual(after.seats, original.map(seat => seat.seatId === 'seat-2'
        ? { ...seat, location: 'Room B', lastRoom: 'Room B', movedInRound: true } : seat));
      const publicMoves = (await h.base.collection('audienceEvents').doc('public').collection('items').get()).docs
        .map(doc => FullEventSchema.parse(doc.data())).filter(event => event.fact.type === 'PUBLIC_MOVE');
      assert.deepEqual(publicMoves.map(event => event.fact), [{ type: 'PUBLIC_MOVE', seatId: 'seat-2', location: 'Room B' }],
        'Capsule entrance/exit creates no extra gameplay move events');
      await assertReplay(h);
    }
  });

  test(`${playerCount} seats: final ordinary cutoff closes movement through every final Hack stage and election, then next-round turns reopen it`, async () => {
    const h = await seed(playerCount), actor = `seat-${playerCount}`;
    const last = await until(h, state => state.phase.kind === 'ORDINARY_TURN' && state.activeSeatId === actor);
    assert.ok(projectFullGame(last).players['seat-1'].self.movementDestinations.includes('Room B'));
    await accept(h, 'seat-1', { type: 'MOVE', destination: 'Room B' });
    const { state: opened } = await openHack(h, { actor, target: 'seat-6' });
    for (const stage of ['HACK_DECLARE', 'HACK_RESULT', 'HACK']) {
      const before = await h.current(); assert.equal(before.phase.kind, stage);
      await assertExchange(h, before, 'seat-6', opened.phase.id,
        stage === 'HACK_DECLARE' ? 'AWAITING_DECLARATION' : 'DECLARED', stage === 'HACK_DECLARE' ? null : 'Red', actor);
      for (const view of Object.values(projectFullGame(before).players)) assert.deepEqual(view.self.movementDestinations, []);
      // Room A has a real vacancy and seat 6 has not moved. Rejection therefore
      // exercises the cutoff, not room fullness or a previously spent movement.
      assert.equal(before.seats.filter(seat => seat.location === 'Room A').length, 4);
      assert.equal(own(before, 'seat-6').movedInRound, false);
      const blocked = await submit(h, 'seat-6', { type: 'MOVE', destination: 'Room A' });
      assert.equal(blocked.receipt.status, 'rejected'); assert.equal(blocked.receipt.code, 'NOT_ALLOWED');
      assert.deepEqual((await h.current()).seats, before.seats);
      if (stage === 'HACK_DECLARE') await declaration(h, before, 'Red', 'seat-6');
      else await expire(h);
    }
    await assertCleared(h);
    const election = await until(h, state => state.phase.kind === 'CAPTAIN_ELECTION');
    assert.equal(election.round, 2);
    for (const view of Object.values(projectFullGame(election).players)) assert.deepEqual(view.self.movementDestinations, []);
    const blockedElection = await submit(h, 'seat-6', { type: 'MOVE', destination: 'Room A' });
    assert.equal(blockedElection.receipt.status, 'rejected'); assert.equal(blockedElection.receipt.code, 'NOT_ALLOWED');
    const next = await until(h, state => state.phase.kind === 'ORDINARY_TURN');
    assert.equal(next.round, 2); assert.ok(projectFullGame(next).players['seat-6'].self.movementDestinations.includes('Room A'));
    await accept(h, 'seat-6', { type: 'MOVE', destination: 'Room A' });
    assert.equal(own(await h.current(), 'seat-6').location, 'Room A');
    await assertReplay(h);
  });

  test(`${playerCount} seats: a bot target declares from its own view once, keeps the public pair and never shortens result or conversation`, async () => {
    const h = await seed(playerCount, { botSeatIds: ['seat-2'] }), { state: opened } = await openHack(h);
    h.setTime(opened.phase.startedAt + 123);
    assert.deepEqual(await h.service.runPracticeBots(h.base.id, { limit: 1 }), { status: 'advanced', processed: 1 });
    const result = await h.current();
    await assertExchange(h, result, 'seat-2', opened.phase.id, 'DECLARED', 'Blue');
    assert.equal(result.phase.kind, 'HACK_RESULT'); assert.equal(result.phase.endsAt - result.phase.startedAt, 5000);
    const declarationRecords = records => records.filter(record => record.kind === 'COMMAND'
      && record.request.command.type === 'DECLARE_HACK_SIDE');
    const registered = declarationRecords(await journal(h)); assert.equal(registered.length, 1);
    assert.equal(registered[0].controller, 'bot'); assert.equal(registered[0].actorSeatId, 'seat-2');
    assert.equal(registered[0].policyVersion, PRACTICE_BOT_POLICY_VERSION);
    assert.deepEqual(registered[0].request.command, { type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue' });
    h.service = createV1Service(h.options);
    const repeat = await h.service.runPracticeBots(h.base.id, { limit: 18 });
    assert.ok(['advanced', 'unchanged'].includes(repeat.status));
    assert.deepEqual((await h.current()).phase, result.phase);
    assert.deepEqual(declarationRecords(await journal(h)), registered);
    assert.equal((await firestoreRequest(`${h.base.path}/playerViews/${h.players[1].uid}`, { idToken: h.players[1].idToken })).status, 403,
      'A synthetic Auth identity for the bot is not an authorized player');
    h.setTime(result.phase.endsAt - 1); await assertNoContinuation(h, result, true);
    const talk = await expire(h); await assertExchange(h, talk, 'seat-2', opened.phase.id, 'DECLARED', 'Blue');
    assert.equal(talk.phase.endsAt - talk.phase.startedAt, 60_000);
    const repeated = await h.service.runPracticeBots(h.base.id, { limit: 18 });
    assert.ok(['advanced', 'unchanged'].includes(repeated.status));
    assert.deepEqual((await h.current()).phase, talk.phase);
    assert.deepEqual(declarationRecords(await journal(h)), registered);
    h.setTime(talk.phase.endsAt - 1); await assertNoContinuation(h, talk, true);
    await expire(h); await assertCleared(h); await assertReplay(h);
  });

  test(`${playerCount} seats: abort during declaration or conversation clears every public association and rejects obsolete deadlines without replay`, async () => {
    for (const stage of ['HACK_DECLARE', 'HACK']) {
      const h = await seed(playerCount), { state: opened } = await openHack(h);
      if (stage === 'HACK') { await declaration(h, opened); await expire(h); }
      const active = await h.current(); assert.equal(active.phase.kind, stage);
      operation(await h.service.abortMatch(h.host.uid, h.request()));
      const ended = await assertCleared(h); assert.equal(ended.phase.kind, 'ABORTED');
      const records = await journal(h), publications = await publicationSnapshot(h);
      h.service = createV1Service(h.options); h.setTime(active.phase.endsAt + 123_456);
      await assertNoContinuation(h, opened); await assertNoContinuation(h, active);
      assert.deepEqual(await h.current(), ended); assert.deepEqual(await journal(h), records);
      assert.deepEqual(await publicationSnapshot(h), publications);
      await assertReplay(h);
    }
  });

  test(`${playerCount} seats: a Round 5 Hack and Code attempt retain the full talk, finish only at the canonical checkpoint and never restore old sessions`, async () => {
    const h = await seed(playerCount);
    await until(h, state => state.round === 5 && state.phase.kind === 'ORDINARY_TURN' && state.activeSeatId === 'seat-6');
    const { state: opened } = await openHack(h, { actor: 'seat-6', target: 'seat-7' });
    const accepted = await declaration(h, opened, 'Alien', 'seat-7');
    const talk = await expire(h); assert.equal(talk.phase.kind, 'HACK');
    await assertExchange(h, talk, 'seat-7', opened.phase.id, 'DECLARED', 'Alien', 'seat-6');
    const code = await accept(h, 'seat-6', { type: 'SUBMIT_CODE', seatIds: ['seat-1', 'seat-2', 'seat-3', 'seat-7'] });
    assert.deepEqual((await h.current()).phase, talk.phase, 'Code registration does not invent an intermediate victory checkpoint');
    h.setTime(talk.phase.endsAt - 1); await assertNoContinuation(h, talk, true);
    await expire(h); await assertCleared(h);
    const finished = await until(h, state => state.phase.kind === 'FINISHED');
    assert.equal(finished.result.winner, 'Red'); await assertCleared(h);
    const records = await journal(h), publications = await publicationSnapshot(h);
    h.service = createV1Service(h.options);
    assert.deepEqual(FullCommandResponseSchema.parse(await h.service.submit(h.players[5].uid, code.request)).receipt, code.receipt);
    assert.deepEqual(FullCommandResponseSchema.parse(await h.service.submit(h.players[6].uid, accepted.request)).receipt, accepted.receipt);
    for (const old of [opened, accepted.state, talk]) await assertNoContinuation(h, old);
    assert.deepEqual(await h.current(), finished); assert.deepEqual(await journal(h), records);
    assert.deepEqual(await publicationSnapshot(h), publications); await assertReplay(h);
  });
}

for (const playerCount of [7, 8, 9]) test(`${playerCount} seats: concurrent final-turn MOVE and PASS follow committed journal order without reopening movement`, async t => {
  const h = await seed(playerCount), actor = `seat-${playerCount}`;
  await until(h, state => state.phase.kind === 'ORDINARY_TURN' && state.activeSeatId === actor);
  await accept(h, actor, { type: 'REQUEST_HACK', targetSeatId: 'seat-6' });
  const before = await h.current();
  assert.equal(before.phase.kind, 'ORDINARY_TURN'); assert.equal(before.activeSeatId, actor);
  assert.equal(before.turnIndex, playerCount - 1);
  assert.deepEqual(before.pendingHack, { actorSeatId: actor, targetSeatId: 'seat-6' });
  assert.equal(own(before, 'seat-1').movedInRound, false);
  assert.ok(before.seats.filter(seat => seat.location === 'Room B').length < 5);
  assert.ok(projectFullGame(before).players['seat-1'].self.movementDestinations.includes('Room B'));
  const commonTime = Math.max(h.now(), before.phase.startedAt) + 100;
  assert.ok(commonTime < before.phase.endsAt); h.setTime(commonTime);
  const envelope = { protocolVersion: 2, matchId: h.base.id, phaseId: before.phase.id };
  const move = { ...envelope, commandId: randomUUID(), command: { type: 'MOVE', destination: 'Room B' } };
  const pass = { ...envelope, commandId: randomUUID(), command: { type: 'PASS_TURN' } };
  // Each invocation observes the same fixed trusted time. Transaction contention
  // may choose either serial order; uncertain responses retry the same intent.
  const responses = await Promise.all([
    retryUnavailable(() => h.service.submit(h.players[0].uid, move)),
    retryUnavailable(() => h.service.submit(h.players[playerCount - 1].uid, pass)),
  ]);
  const [moved, passed] = responses.map(response => FullCommandResponseSchema.parse(response));
  assert.equal(moved.ok, true, JSON.stringify(moved)); assert.equal(passed.ok, true, JSON.stringify(passed));
  assert.equal(passed.receipt.status, 'accepted');
  assert.equal(moved.receipt.phaseId, before.phase.id); assert.equal(passed.receipt.phaseId, before.phase.id);
  const records = await journal(h), ids = new Set([move.commandId, pass.commandId]);
  const raced = records.filter(record => record.kind === 'COMMAND' && ids.has(record.request.commandId));
  assert.equal(raced.length, 2, 'Each concurrent intent has exactly one durable command decision');
  const moveRecord = raced.find(record => record.request.commandId === move.commandId);
  const passRecord = raced.find(record => record.request.commandId === pass.commandId);
  assert.equal(moveRecord.now, commonTime); assert.equal(passRecord.now, commonTime);
  const moveWon = moveRecord.sequence < passRecord.sequence;
  assert.equal(moved.receipt.status, moveWon ? 'accepted' : 'rejected');
  if (!moveWon) assert.equal(moved.receipt.code, 'PHASE_CLOSED');
  assert.deepEqual(moveRecord.receipt, moved.receipt); assert.deepEqual(passRecord.receipt, passed.receipt);
  t.diagnostic(JSON.stringify({ committedOrder: raced.map(record => ({ sequence: record.sequence,
    actorSeatId: record.actorSeatId, type: record.request.command.type,
    status: record.receipt.status, code: record.receipt.code })) }));
  const after = await assertStored(h);
  assert.equal(after.journalSequence, before.journalSequence + 2);
  assert.equal(after.phase.kind, 'HACK_DECLARE'); assert.equal(after.activeSeatId, actor);
  assert.notEqual(after.phase.id, before.phase.id);
  assert.equal(after.phase.startedAt, commonTime); assert.equal(after.phase.endsAt, commonTime + 15_000);
  assert.equal(after.pendingHack, null);
  assert.deepEqual(after.activeHack, { actorSeatId: actor, targetSeatId: 'seat-6' });
  assert.deepEqual(after.seats, before.seats.map(seat => moveWon && seat.seatId === 'seat-1'
    ? { ...seat, location: 'Room B', lastRoom: 'Room B', movedInRound: true } : seat));
  assert.equal(after.seats.filter(seat => seat.movedInRound).length, moveWon ? 1 : 0,
    'A committed MOVE spends precisely one movement; losing the phase race spends none');
  await assertExchange(h, after, 'seat-6', after.phase.id, 'AWAITING_DECLARATION', null, actor);
  for (const view of Object.values(projectFullGame(after).players)) assert.deepEqual(view.self.movementDestinations, []);
  const publications = await publicationSnapshot(h);
  h.service = createV1Service(h.options);
  assert.deepEqual(FullCommandResponseSchema.parse(await h.service.submit(h.players[0].uid, move)).receipt, moved.receipt);
  assert.deepEqual(FullCommandResponseSchema.parse(await h.service.submit(h.players[playerCount - 1].uid, pass)).receipt, passed.receipt);
  assert.deepEqual(await h.current(), after); assert.deepEqual(await journal(h), records);
  assert.deepEqual(await publicationSnapshot(h), publications, 'Duplicate receipts cannot drift the new phase or rewrite views');
  await assertReplay(h);
});
