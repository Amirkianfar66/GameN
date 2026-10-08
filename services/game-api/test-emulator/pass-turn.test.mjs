import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  FullOperationResponseSchema, FullCommandResponseSchema, FullFailureSchema,
  FullAdvanceResponseSchema, FullLookupResponseSchema, FullPublicViewSchema, FullPlayerViewSchema, FullEventSchema,
} from '@mothership/contracts';
import {
  createFullGame, executeFullGame, advanceFullGame, projectFullGame,
  FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS,
} from '@mothership/engine';
import { createV1Service } from '../dist/index.js';
import { encodeV1State, decodeV1State, decodeV1Setup } from '../dist/full-game.js';
import { beginStagedSetup, confirmStagedChoices, completeStagedSetup, startStagedMatch } from './staged-start-helper.mjs';
import { assertLocalEmulators, createEmulatorIdentity } from '../../../infra/firebase/test/helpers.mjs';

let app, db, serial = 0;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const op = response => { FullOperationResponseSchema.parse(response); assert.equal(response.ok, true, 'Operation must succeed'); return response.result; };
const failure = (response, code) => { FullFailureSchema.parse(response); assert.equal(response.error?.code, code); };
before(() => {
  assertLocalEmulators();
  app = initializeApp({ projectId: 'demo-mothership' }, `pass-turn-${randomUUID()}`);
  db = getFirestore(app);
});
after(async () => { await db?.terminate(); if (app) await deleteApp(app); });

async function harness(count = 7, { start = true, legacy = false } = {}) {
  let now = 1_600_000_000_000 + ++serial * 100_000_000;
  const options = { db, clock: () => now, shuffle: items => [...items], randomInitialRoom: () => 'Room A' };
  const service = createV1Service(options), host = await createEmulatorIdentity();
  const players = await Promise.all(Array.from({ length: count }, () => createEmulatorIdentity()));
  const created = op(await service.createMatch(host.uid, { protocolVersion: 2, requestId: randomUUID(), playerCount: count }));
  const base = db.collection('matches').doc(created.matchId);
  const request = (fields = {}) => ({ protocolVersion: 2, matchId: base.id, requestId: randomUUID(), ...fields });
  for (const [index, identity] of players.entries()) {
    const admission = op(await service.requestAdmission(identity.uid, { protocolVersion: 2, requestId: randomUUID(), roomCode: created.roomCode }));
    op(await service.approveAdmission(host.uid, request({ admissionId: admission.admissionId, seatId: `seat-${index + 1}` })));
  }
  if (legacy) {
    // Fixture of a saved pre-PASS lobby: this field did not exist in that release.
    await base.collection('engine').doc('gameplayPins').delete();
  } else assert.deepEqual((await base.collection('engine').doc('gameplayPins').get()).data(), FULL_GAME_VERSION_PINS);
  // Existing host readers strictly allow these keys; creation pins stay server-only.
  assert.deepEqual(Object.keys((await base.collection('control').doc('session').get()).data()).sort(),
    ['protocolVersion', 'hostUid', 'playerCount', 'status', 'roomCode', 'createdAt', 'lifecycleVersion', 'gameStarted'].sort());
  const h = { service, options, host, players, base, request, now: () => now, setTime: value => { now = value; },
    current: async () => decodeV1State((await base.collection('engine').doc('current').get()).data()) };
  if (start) await startStagedMatch(h);
  return h;
}
const body = (h, state, command = { type: 'PASS_TURN' }, commandId = randomUUID()) =>
  ({ protocolVersion: 2, matchId: h.base.id, phaseId: state.phase.id, commandId, command });
async function submit(h, seat, payload) {
  return FullCommandResponseSchema.parse(await h.service.submit(h.players[seat - 1].uid, payload));
}
async function accepted(h, seat, command = { type: 'PASS_TURN' }) {
  const payload = body(h, await h.current(), command), response = await submit(h, seat, payload);
  assert.equal(response.ok, true); assert.equal(response.receipt.status, 'accepted');
  return { payload, receipt: response.receipt };
}
async function tick(h) {
  const state = await h.current(); assert.notEqual(state.phase.endsAt, null);
  h.setTime(state.phase.endsAt);
  const result = FullAdvanceResponseSchema.parse(await h.service.runDeadline(job(state)));
  assert.equal(result.result, 'advanced'); return h.current();
}
const job = state => ({ matchId: state.matchId, phaseId: state.phase.id, deadlineToken: state.deadlineToken });
async function until(h, predicate) {
  let state = await h.current();
  for (let count = 0; !predicate(state); count++) { assert.ok(count < 100, 'Bounded real lifecycle'); state = await tick(h); }
  return state;
}
async function events(h, audience) {
  return (await h.base.collection('audienceEvents').doc(audience).collection('items').get()).docs.map(doc => FullEventSchema.parse(doc.data()));
}
async function decisions(h, commandId) {
  assert.equal((await h.base.collection('receipts').get()).docs.filter(doc => doc.get('receipt.commandId') === commandId).length, 1);
  assert.equal((await h.base.collection('events').where('kind', '==', 'COMMAND').get()).docs.filter(doc => doc.get('request.commandId') === commandId).length, 1);
}
const stablePaths = h => ['engine/current', 'views/public', ...h.players.map(identity => `playerViews/${identity.uid}`)];
async function snapshot(h, paths = stablePaths(h)) {
  return Promise.all(paths.map(async path => { const doc = await db.doc(`${h.base.path}/${path}`).get(); return { path, data: doc.data(), updateTime: doc.updateTime }; }));
}
async function unchanged(h, previous) {
  for (const entry of previous) {
    const doc = await db.doc(`${h.base.path}/${entry.path}`).get();
    assert.deepEqual(doc.data(), entry.data, entry.path);
    if (entry.updateTime) assert.ok(doc.updateTime.isEqual(entry.updateTime), entry.path);
    else assert.equal(doc.exists, false);
  }
}
async function settle(response, retry, schema = FullCommandResponseSchema) {
  schema.parse(response);
  for (let count = 0; response.error?.code === 'UNAVAILABLE' && count < 2; count++) response = schema.parse(await retry());
  return response; // Persistent failures remain failures; the exact original payload is retained.
}
async function replay(h) {
  const records = (await h.base.collection('events').orderBy('sequence').get()).docs.map(doc => doc.data());
  let state;
  for (const record of records) {
    if (record.kind === 'SETUP') state = createFullGame({ ...record, setup: decodeV1Setup(record.setup) });
    else if (record.kind === 'COMMAND') {
      const result = executeFullGame(state, record.actorSeatId, record.request, record);
      assert.deepEqual(result.receipt, record.receipt); state = result.state;
    } else if (record.kind === 'DEADLINE') {
      const result = advanceFullGame(state, record); assert.equal(result.advanced, true); state = result.state;
    } else assert.fail('This fixture contains only setup, command and deadline records');
    state.journalSequence = record.sequence;
  }
  assert.deepEqual(state, await h.current());
  assert.deepEqual(projectFullGame(state).public, (await h.base.collection('views').doc('public').get()).data());
}

for (const count of [7, 8, 9]) test(`${count}-seat PASS commits one early transition, audience-safe events and the next full-minute deadline`, async () => {
  const h = await harness(count), before = await h.current(); h.setTime(before.phase.startedAt + 1234);
  const acknowledgments = await snapshot(h, h.players.map(identity => `ownAcknowledgments/${identity.uid}`));
  const { payload, receipt } = await accepted(h, 1), after = await h.current();
  assert.equal(receipt.phaseId, before.phase.id); assert.equal(receipt.code, 'REGISTERED');
  assert.equal(after.activeSeatId, 'seat-2'); assert.notEqual(after.phase.id, before.phase.id);
  assert.notEqual(after.deadlineToken, before.deadlineToken);
  assert.equal(after.phase.startedAt, h.now()); assert.equal(after.phase.endsAt, h.now() + 60_000);
  assert.equal(after.journalSequence, before.journalSequence + 1);
  assert.deepEqual(after.seats, before.seats); assert.deepEqual(after.queued, before.queued);
  await unchanged(h, acknowledgments); await decisions(h, payload.commandId);
  FullPublicViewSchema.parse((await h.base.collection('views').doc('public').get()).data());
  for (const [index, identity] of h.players.entries()) {
    FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(identity.uid).get()).data());
    const ownEvents = await events(h, `p-seat-${index + 1}`);
    assert.equal(ownEvents.filter(event => event.fact.type === 'PHASE_CHANGED' && event.fact.phaseId === after.phase.id).length, 1);
    assert.equal(ownEvents.filter(event => event.fact.type === 'COMMAND_REGISTERED' && event.fact.commandId === payload.commandId).length, index === 0 ? 1 : 0);
  }
  const publicEvents = await events(h, 'public');
  assert.equal(publicEvents.filter(event => event.fact.type === 'PHASE_CHANGED' && event.fact.phaseId === after.phase.id).length, 1);
  assert.equal(publicEvents.some(event => event.fact.type === 'COMMAND_REGISTERED'), false);
  const intents = (await h.base.collection('outbox').get()).docs;
  assert.equal(intents.length, 2, 'Original and next deadline identities coexist');
  const next = intents.find(doc => doc.get('phaseId') === after.phase.id);
  assert.ok(next); assert.equal(next.id, hash([h.base.id, after.phase.id, after.deadlineToken]));
  assert.equal(next.get('deadlineToken'), after.deadlineToken); assert.equal(next.get('endsAt'), after.phase.endsAt);
  await replay(h);
});

test('PASS rejects inactive, unauthenticated, display-only and nonmember identities without granting actor authority', async () => {
  const h = await harness(), state = await h.current(), payload = body(h, state);
  const views = await snapshot(h, stablePaths(h).slice(1));
  const inactive = await submit(h, 2, payload); assert.equal(inactive.receipt.code, 'NOT_ALLOWED');
  await unchanged(h, views); await decisions(h, payload.commandId);
  const display = await createEmulatorIdentity(), outsider = await createEmulatorIdentity();
  op(await h.service.admitDisplay(h.host.uid, h.request({ displayUid: display.uid })));
  const noWrites = await snapshot(h);
  for (const uid of [h.host.uid, display.uid, outsider.uid]) failure(await h.service.submit(uid, { ...payload, commandId: randomUUID() }), 'FORBIDDEN');
  failure(await h.service.submit(undefined, payload), 'UNAUTHENTICATED');
  failure(await h.service.submit(h.players[0].uid, { ...payload, command: { type: 'PASS_TURN', targetSeatId: 'seat-2' } }), 'INVALID_REQUEST');
  await unchanged(h, noWrites);
});

for (const condition of ['Injured', 'Jailed', 'Eliminated']) test(`PASS eligibility for an active ${condition} seat is independent of movement/action readiness`, async () => {
  const h = await harness(), state = await h.current();
  // Explicit local state fixture isolates eligibility; real bindings and submissions are unchanged.
  if (condition === 'Jailed') { state.seats[0].jailed = true; state.seats[0].location = 'Jail'; }
  else { state.seats[0].health = condition; state.seats[0].location = condition === 'Injured' ? 'Hospital' : 'Room A'; }
  const projected = projectFullGame(state), batch = db.batch();
  batch.set(h.base.collection('engine').doc('current'), encodeV1State(state));
  batch.set(h.base.collection('views').doc('public'), projected.public);
  h.players.forEach((identity, index) => batch.set(h.base.collection('playerViews').doc(identity.uid), projected.players[`seat-${index + 1}`]));
  await batch.commit();
  const response = await submit(h, 1, body(h, state));
  assert.equal(response.receipt.status, condition === 'Eliminated' ? 'rejected' : 'accepted');
  assert.equal(response.receipt.code, condition === 'Eliminated' ? 'NOT_ALLOWED' : 'REGISTERED');
  const after = await h.current(); assert.deepEqual(after.seats, state.seats);
  assert.equal(after.activeSeatId, condition === 'Eliminated' ? 'seat-1' : 'seat-2');
});

test('queued Officer shot survives PASS on the last ordinary turn and resolves exactly once at the canonical boundary', async () => {
  const h = await harness(9); await until(h, state => state.activeSeatId === 'seat-9');
  const shot = await accepted(h, 9, { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' }), queued = await h.current();
  const pass = await accepted(h, 9), after = await h.current();
  assert.equal(after.phase.kind, 'JAIL_VOTE'); assert.equal(after.round, 1);
  assert.deepEqual(after.queued, queued.queued); assert.deepEqual(after.seats, queued.seats);
  assert.equal(after.queued[0].commandId, shot.payload.commandId);
  assert.equal(after.seats[8].ordinaryWeapons, 0); assert.equal(after.seats[8].officerShotSpent, true);
  assert.equal(after.seats[0].health, 'Healthy'); assert.equal(after.phase.endsAt, h.now() + 60_000);
  const resolved = await until(h, state => state.round === 2);
  assert.equal(resolved.seats[0].health, 'Injured'); assert.equal(resolved.queued.length, 0);
  await decisions(h, shot.payload.commandId); await decisions(h, pass.payload.commandId); await replay(h);
});

test('PASS after a registered main action opens the pending Hack first, retaining queued effects and a full conversation window', async () => {
  const h = await harness(); await until(h, state => state.activeSeatId === 'seat-5');
  const protect = await accepted(h, 5, { type: 'PROTECT', targetSeatId: 'seat-1' });
  await accepted(h, 5, { type: 'REQUEST_HACK', targetSeatId: 'seat-2' });
  const queued = await h.current(), passed = await accepted(h, 5), hack = await h.current();
  assert.equal(hack.phase.kind, 'HACK'); assert.equal(hack.activeSeatId, 'seat-5');
  assert.deepEqual(hack.activeHack, { actorSeatId: 'seat-5', targetSeatId: 'seat-2' });
  assert.equal(hack.pendingHack, null); assert.equal(hack.turnIndex, queued.turnIndex);
  assert.deepEqual(hack.queued, queued.queued); assert.equal(hack.queued[0].commandId, protect.payload.commandId);
  assert.equal(hack.seats[4].mainActionUsedRound, 1); assert.equal(hack.phase.endsAt, h.now() + 60_000);
  const forbidden = await submit(h, 5, body(h, hack)); assert.equal(forbidden.receipt.code, 'NOT_ALLOWED');
  assert.equal((await h.current()).phase.id, hack.phase.id);
  const next = await tick(h); assert.equal(next.activeSeatId, 'seat-6'); assert.deepEqual(next.queued, hack.queued);
  await decisions(h, passed.payload.commandId); await replay(h);
});

test('PASS accepts one millisecond before the deadline and rejects the exact boundary and before-start clock', async () => {
  const early = await harness(), initial = await early.current(); early.setTime(initial.phase.startedAt - 1);
  assert.equal((await submit(early, 1, body(early, initial))).receipt.code, 'PHASE_CLOSED');
  early.setTime(initial.phase.endsAt - 1); await accepted(early, 1);
  assert.equal((await early.current()).phase.endsAt, early.now() + 60_000);
  const expired = await harness(), state = await expired.current(); expired.setTime(state.phase.endsAt);
  const views = await snapshot(expired, stablePaths(expired).slice(1));
  assert.equal((await submit(expired, 1, body(expired, state))).receipt.code, 'PHASE_CLOSED');
  await unchanged(expired, views); assert.equal((await expired.current()).phase.id, state.phase.id);
});

test('simultaneous duplicate PASS, a different PASS and an early deadline make exactly one transition', async () => {
  const h = await harness(), state = await h.current(), payload = body(h, state), other = body(h, state);
  const invoke = p => h.service.submit(h.players[0].uid, p);
  const [first, second, third, competitor, deadline] = await Promise.all([
    invoke(payload), invoke(payload), invoke(payload), invoke(other), h.service.runDeadline(job(state)),
  ]);
  const repeats = await Promise.all([first, second, third].map(response => settle(response, () => invoke(payload))));
  const separate = await settle(competitor, () => invoke(other));
  for (const response of [...repeats, separate]) assert.equal(response.ok, true, response.error?.code);
  for (const response of repeats) assert.deepEqual(response.receipt, repeats[0].receipt);
  assert.equal([repeats[0], separate].filter(response => response.receipt.status === 'accepted').length, 1);
  assert.equal([repeats[0], separate].filter(response => response.receipt.code === 'PHASE_CLOSED').length, 1);
  const reconciledDeadline = await settle(deadline, () => h.service.runDeadline(job(state)), FullAdvanceResponseSchema);
  assert.equal(reconciledDeadline.result, 'unchanged');
  assert.equal((await h.current()).activeSeatId, 'seat-2');
  assert.equal((await h.base.collection('outbox').get()).size, 2);
  await decisions(h, payload.commandId); await decisions(h, other.commandId); await replay(h);
});

test('a PASS versus duplicate due deadline race rejects the expired PASS and advances exactly once', async () => {
  const h = await harness(), state = await h.current(), payload = body(h, state); h.setTime(state.phase.endsAt);
  const [initial, ...initialDeadlines] = await Promise.all([submit(h, 1, payload), h.service.runDeadline(job(state)), h.service.runDeadline(job(state))]);
  const response = await settle(initial, () => submit(h, 1, payload));
  const deadlines = await Promise.all(initialDeadlines.map(value => settle(value, () => h.service.runDeadline(job(state)), FullAdvanceResponseSchema)));
  assert.equal(response.ok, true, response.error?.code);
  assert.equal(response.receipt.code, 'PHASE_CLOSED');
  assert.equal(deadlines.filter(value => value.result === 'advanced').length, 1);
  const durableDeadlines = (await h.base.collection('events').where('kind', '==', 'DEADLINE').get()).docs
    .filter(doc => doc.get('phaseId') === state.phase.id && doc.get('deadlineToken') === state.deadlineToken);
  assert.equal(durableDeadlines.length, 1, 'Exactly one durable deadline transition');
  const after = await h.current(); assert.equal(after.activeSeatId, 'seat-2'); assert.equal(after.phase.endsAt, h.now() + 60_000);
  await decisions(h, payload.commandId); await replay(h);
});

test('lost PASS acknowledgment, receipt lookup, restart and old outbox delivery cannot advance the new phase twice', async () => {
  const h = await harness(), state = await h.current(), payload = body(h, state);
  const lostDb = { collection: name => db.collection(name), doc: path => db.doc(path),
    runTransaction: async callback => { await db.runTransaction(callback); throw new Error('synthetic response loss after commit'); } };
  failure(await createV1Service({ ...h.options, db: lostDb }).submit(h.players[0].uid, payload), 'UNAVAILABLE');
  h.service = createV1Service(h.options);
  const lookup = FullLookupResponseSchema.parse(await h.service.lookup(h.players[0].uid, { protocolVersion: 2, matchId: h.base.id, commandId: payload.commandId }));
  assert.equal(lookup.status, 'found'); assert.equal(lookup.receipt.status, 'accepted');
  const oldIntent = (await h.base.collection('outbox').get()).docs.find(doc => doc.get('phaseId') === state.phase.id);
  let deliveries = 0;
  assert.equal((await h.service.dispatchDeadlineIntent(oldIntent.ref.path, async intent => {
    deliveries++; assert.equal(intent.phaseId, state.phase.id); assert.equal(intent.deadlineToken, state.deadlineToken);
  })).status, 'dispatched');
  assert.equal(deliveries, 1);
  const beforeRetry = await snapshot(h);
  h.setTime(state.phase.endsAt + 1);
  assert.deepEqual((await submit(h, 1, payload)).receipt, lookup.receipt);
  assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline(job(state))).result, 'unchanged');
  await unchanged(h, beforeRetry); await decisions(h, payload.commandId);
  failure(await submit(h, 1, { ...payload, command: { type: 'MOVE', destination: 'Room B' } }), 'COMMAND_ID_CONFLICT');
  failure(await submit(h, 1, { ...payload, extra: true }), 'INVALID_REQUEST');
});

test('receipt replay after seat recovery belongs only to the current reverse-bound identity', async () => {
  const h = await harness(), { payload, receipt } = await accepted(h, 1);
  const token = op(await h.service.issueSeatRecovery(h.host.uid, h.request({ seatId: 'seat-1' })));
  const replacement = await createEmulatorIdentity();
  op(await h.service.redeemSeatRecovery(replacement.uid, h.request({ recoveryToken: token.recoveryToken })));
  failure(await submit(h, 1, payload), 'FORBIDDEN');
  const response = FullCommandResponseSchema.parse(await h.service.submit(replacement.uid, payload));
  assert.deepEqual(response.receipt, receipt); await decisions(h, payload.commandId);
  const lookup = FullLookupResponseSchema.parse(await h.service.lookup(replacement.uid, { protocolVersion: 2, matchId: h.base.id, commandId: payload.commandId }));
  assert.deepEqual(lookup.receipt, receipt); assert.equal((await h.current()).activeSeatId, 'seat-2');
});

test('saved legacy lobby and prepared deal retain their reviewed pins across restart, launch, commands and journal replay', async () => {
  const h = await harness(7, { start: false, legacy: true });
  await beginStagedSetup(h); await confirmStagedChoices(h);
  const prepared = (await h.base.collection('setup').doc('deal').get()).data();
  assert.deepEqual(prepared.versions, { ...LEGACY_FULL_GAME_VERSION_PINS, assetManifestVersion: '0.0.0-no-assets' });
  assert.equal((await h.base.collection('engine').doc('current').get()).exists, false);
  const beforeRestart = await snapshot(h, ['setup/deal']); h.service = createV1Service(h.options);
  await completeStagedSetup(h); await unchanged(h, beforeRestart);
  const state = await h.current(); assert.deepEqual(state.versions, prepared.versions);
  const legacyView = FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(h.players[0].uid).get()).data());
  assert.equal(legacyView.legalTargets.PASS_TURN, undefined);
  const rejected = await submit(h, 1, body(h, state)); assert.equal(rejected.receipt.code, 'NOT_ALLOWED');
  await accepted(h, 1, { type: 'MOVE', destination: 'Room B' }); await tick(h);
  assert.deepEqual((await h.current()).versions, prepared.versions); await replay(h);
});
