// Real local Auth/Firestore/Functions acceptance, not deployed Tasks/IAM evidence.
// Native HTTP creates/admissions/configures the exact selected 1.3/1.5/1.10/1.11 lobby. Its real
// Auth identities and UID-free practice bindings are reused in a SEPARATE fresh
// 1.9 fixture. One legal synthetic SETUP + complete pure-engine journal prefix
// ends at a fresh 5-second Jail VOTE_RESULT before the first fixture engine write.
// All subsequent phase/bot decisions come from real Functions and Tasks time:
// no injected service clock, client advance, manual bot/task callback or later
// Admin gameplay edit. Native timed setup is covered by existing full-http tests.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { BLACKOUT_FULL_GAME_VERSION_PINS as PINS, FULL_GAME_VERSION_PINS as BASELINE,
  DECLARED_HACK_FULL_GAME_VERSION_PINS as DECLARED, CLONE_FULL_GAME_VERSION_PINS as CLONE, HOSPITAL_FOUR_FULL_GAME_VERSION_PINS as HOSPITAL_FOUR, createFullGame, executeFullGame,
  advanceFullGame, abortFullGame, projectFullGame, projectOwnAcknowledgments } from '@mothership/engine';
import { FullOperationResponseSchema, FullSetPracticeBotsResponseSchema, FullPracticeBotsDocumentSchema,
  FullPublicViewSchema, FullPlayerViewSchema, FullLobbyViewSchema, FullCommandResponseSchema,
  FullLookupResponseSchema, FullServerTimeResponseSchema, SeatSessionSchema, sameFullGameplayPins, PRACTICE_BOT_POLICY_VERSION } from '@mothership/contracts';
import { encodeV1Setup, encodeV1State, decodeV1Setup, decodeV1State } from '../../../services/game-api/dist/full-game.js';
import { assertLocalEmulators, projectId, createEmulatorIdentity, firestoreRequest } from '../test/helpers.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value !== null && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;
const digest = value => hash(canonical(value));
const pause = () => new Promise(resolve => setTimeout(resolve, 150));
const nativeProfiles = { 'historical': BASELINE, 'declared-hack-1.5': DECLARED, 'board-v2-1.10': CLONE, 'hospital-four-1.11': HOSPITAL_FOUR };
const selectedNativeProfile = process.env.MOTHERSHIP_NEW_MATCH_PROFILE ?? 'historical';
assert.ok(Object.hasOwn(nativeProfiles, selectedNativeProfile), 'Explicit native creation profile required');
const operations = new Set(['v1CreateMatch', 'v1RequestAdmission', 'v1ApproveAdmission',
  'v1AdmitDisplay', 'v1SetPracticeBots', 'v1Command', 'v1Receipt', 'v1ServerTime', 'v1AbortMatch']);
async function invoke(name, payload, identity) {
  assert.ok(operations.has(name), 'No client-advance or manual worker endpoint is part of this harness');
  const { functionsHost } = assertLocalEmulators();
  const response = await fetch(`http://${functionsHost}/${projectId}/us-central1/${name}`, {
    method: 'POST', signal: AbortSignal.timeout(30_000), headers: { 'content-type': 'application/json',
      origin: 'http://localhost:5173', ...(identity ? { authorization: `Bearer ${identity.idToken}` } : {}) },
    body: JSON.stringify(payload),
  });
  return { status: response.status, headers: response.headers, body: await response.json() };
}
function success(response, schema = FullOperationResponseSchema) {
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.headers.get('cache-control'), 'no-store, private');
  const parsed = schema.parse(response.body); assert.equal(parsed.ok, true, JSON.stringify(parsed)); return parsed;
}
function decode(value) {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decode);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([key, item]) => [key, decode(item)]));
  throw new Error('Unsupported Firestore REST value');
}
async function readView(path, identity, schema) {
  const response = await firestoreRequest(path, { idToken: identity.idToken }); assert.equal(response.status, 200);
  return schema.parse(decode({ mapValue: { fields: response.body.fields } }));
}
async function abortIfOpen(base, host) {
  const control = await base.collection('control').doc('session').get();
  if (control.exists && !['complete', 'aborted'].includes(control.get('status'))) {
    success(await invoke('v1AbortMatch', { protocolVersion: 2, matchId: base.id, requestId: randomUUID() }, host));
  }
}
async function nativeConfiguration(db, count, cleanup) {
  const [host, display, outsider] = await Promise.all(Array.from({ length: 3 }, () => createEmulatorIdentity()));
  const botIds = count === 7 ? ['seat-3'] : ['seat-3', 'seat-4'];
  const ids = Array.from({ length: count }, (_, i) => `seat-${i + 1}`);
  const humanIds = ids.filter(id => !botIds.includes(id));
  const humans = Object.fromEntries(await Promise.all(humanIds.map(async id => [id, await createEmulatorIdentity()])));
  const created = success(await invoke('v1CreateMatch', { protocolVersion: 2, playerCount: count, requestId: randomUUID() }, host)).result;
  const base = db.collection('matches').doc(created.matchId); cleanup.push({ base, host });
  const body = fields => ({ protocolVersion: 2, matchId: base.id, requestId: randomUUID(), ...fields });
  async function admit(id) {
    const admitted = success(await invoke('v1RequestAdmission', { protocolVersion: 2, roomCode: created.roomCode, requestId: randomUUID() }, humans[id])).result;
    success(await invoke('v1ApproveAdmission', body({ admissionId: admitted.admissionId, seatId: id }), host));
  }
  // The real host configuration chooses the next free seats, without fabricated bot UIDs.
  await admit('seat-1'); await admit('seat-2');
  const configured = success(await invoke('v1SetPracticeBots', { schemaVersion: 1, ...body({ botCount: botIds.length }) }, host), FullSetPracticeBotsResponseSchema);
  assert.deepEqual(configured.botSeatIds, botIds);
  for (const id of humanIds.filter(id => !['seat-1', 'seat-2'].includes(id))) await admit(id);
  success(await invoke('v1AdmitDisplay', body({ displayUid: display.uid }), host));
  const pins = (await base.collection('engine').doc('gameplayPins').get()).data();
  assert.ok(sameFullGameplayPins(pins, nativeProfiles[selectedNativeProfile]), 'Native creation must match the exact configured release profile');
  assert.equal((await base.collection('engine').doc('current').get()).exists, false, 'No native setup or running match is rewritten');
  const bindings = (await base.collection('seats').get()).docs.map(doc => ({ seatId: doc.id, ...doc.data() }));
  assert.equal(bindings.length, count);
  for (const binding of bindings) {
    if (botIds.includes(binding.seatId)) { assert.equal(binding.controller, 'bot'); assert.equal(Object.hasOwn(binding, 'uid'), false); }
    else assert.equal(binding.uid, humans[binding.seatId].uid);
  }
  const practice = FullPracticeBotsDocumentSchema.parse((await base.collection('practice').doc('public').get()).data());
  assert.deepEqual(practice.botSeatIds, botIds);
  await abortIfOpen(base, host);
  assert.deepEqual((await base.collection('engine').doc('gameplayPins').get()).data(), pins, 'Native creation pins remain immutable');
  assert.equal((await base.collection('engine').doc('current').get()).exists, false);
  return { host, display, outsider, humans, humanIds, botIds, ids, bindings, practice };
}
function prefix(count, native, matchId) {
  const roleOrder = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien',
    ...(count >= 8 ? ['Red Disabler'] : []), ...(count === 9 ? ['Officer'] : [])];
  if (count >= 8) [roleOrder[3], roleOrder[7]] = [roleOrder[7], roleOrder[3]];
  const setup = { playerCount: count, roleOrder, codeExtraSeatIds: ['seat-1', 'seat-2', 'seat-3'],
    initialRooms: Object.fromEntries(native.ids.map((id, i) => [id, i < 5 ? 'Room A' : 'Room B'])),
    roundOrders: Array.from({ length: 5 }, () => [...native.ids]) };
  const assetManifestVersion = 'blackout-functions-synthetic-prefix-assets-v1';
  const start = { matchId, setup, versions: { ...PINS, assetManifestVersion }, assetManifestVersion,
    now: Date.now() - 2_000_000, phaseId: randomUUID(), deadlineToken: randomUUID() };
  let state = { ...createFullGame(start), journalSequence: 1 };
  const seatBindings = native.bindings.map(binding => ({ ...binding, initialRoom: setup.initialRooms[binding.seatId] }));
  const records = [{ journalVersion: 1, sequence: 1, kind: 'SETUP', ...start,
    setup: encodeV1Setup(setup), verifiedUid: native.host.uid, dealId: `synthetic-${randomUUID()}`, seatBindings }];
  for (let step = 0; state.phase.kind !== 'VOTE_RESULT'; step++) {
    assert.ok(step < 30 && state.round === 1 && state.phase.endsAt !== null);
    if (state.phase.kind === 'ORDINARY_TURN' && native.botIds.includes(state.activeSeatId)) {
      const actorSeatId = state.activeSeatId, now = state.phase.startedAt + 1;
      const commandId = hash([PRACTICE_BOT_POLICY_VERSION, matchId, state.phase.id, actorSeatId, 'REQUEST_BLACKOUT']);
      const request = { protocolVersion: 2, matchId, phaseId: state.phase.id, commandId, command: { type: 'REQUEST_BLACKOUT' } };
      const context = { now, nextPhaseId: randomUUID(), nextDeadlineToken: randomUUID() };
      const result = executeFullGame(state, actorSeatId, request, context); assert.equal(result.receipt.status, 'accepted');
      state = result.state;
      records.push({ journalVersion: 1, sequence: records.length + 1, kind: 'COMMAND', actorSeatId,
        controller: 'bot', policyVersion: PRACTICE_BOT_POLICY_VERSION, request, ...context, receipt: result.receipt });
      state = { ...state, journalSequence: records.length };
    }
    const context = { now: state.phase.kind === 'JAIL_VOTE' ? Date.now() : state.phase.endsAt,
      phaseId: state.phase.id, deadlineToken: state.deadlineToken, nextPhaseId: randomUUID(), nextDeadlineToken: randomUUID() };
    const result = advanceFullGame(state, context); assert.equal(result.advanced, true); state = result.state;
    records.push({ journalVersion: 1, sequence: records.length + 1, kind: 'DEADLINE', ...context });
    state = { ...state, journalSequence: records.length };
  }
  assert.equal(state.phase.endsAt - state.phase.startedAt, 5_000);
  assert.equal(state.voteResultContinuation.kind, 'RESOLVE_ROUND'); assert.equal(state.blackout, null);
  assert.ok(state.phase.endsAt > Date.now(), 'Seed the full fresh result phase, never an expired shortcut');
  return { state, records, seatBindings };
}
async function seedPrefix(db, count, native, cleanup) {
  const base = db.collection('matches').doc(`blackout-functions-${randomUUID()}`);
  const { state, records, seatBindings } = prefix(count, native, base.id), views = projectFullGame(state);
  const batch = db.batch();
  batch.create(base.collection('control').doc('session'), { protocolVersion: 2, hostUid: native.host.uid,
    playerCount: count, status: 'running', roomCode: 'ABCDEF123456', createdAt: records[0].now, gameStarted: true });
  batch.create(base.collection('engine').doc('gameplayPins'), PINS);
  batch.create(base.collection('engine').doc('current'), encodeV1State(state));
  batch.create(base.collection('practice').doc('public'), FullPracticeBotsDocumentSchema.parse({ ...native.practice, matchId: base.id }));
  batch.create(base.collection('lobby').doc('public'), FullLobbyViewSchema.parse({ protocolVersion: 2, matchId: base.id,
    playerCount: count, status: 'running', seats: seatBindings.map(({ seatId, initialRoom }) => ({ seatId, initialRoom })) }));
  batch.create(base.collection('views').doc('public'), views.public);
  for (const identity of [native.host, native.display]) batch.create(base.collection('members').doc(identity.uid), { kind: 'display' });
  for (const { seatId, ...binding } of seatBindings) {
    batch.create(base.collection('seats').doc(seatId), binding);
    if (binding.controller === 'bot') { assert.equal(Object.hasOwn(binding, 'uid'), false); continue; }
    batch.create(base.collection('members').doc(binding.uid), { kind: 'player', seatId, bindingRevision: binding.bindingRevision });
    batch.create(base.collection('playerViews').doc(binding.uid), views.players[seatId]);
    batch.create(base.collection('ownAcknowledgments').doc(binding.uid), projectOwnAcknowledgments(state, seatId, binding.bindingRevision));
    batch.create(base.collection('seatSessions').doc(binding.uid), SeatSessionSchema.parse({ schemaVersion: 1,
      protocolVersion: 2, matchId: base.id, seatId, bindingRevision: binding.bindingRevision }));
  }
  for (const record of records) {
    batch.create(base.collection('events').doc(randomUUID()), record);
    if (record.kind === 'COMMAND') batch.create(base.collection('receipts').doc(hash([record.actorSeatId, record.request.commandId])), {
      actorSeatId: record.actorSeatId, controller: 'bot', policyVersion: PRACTICE_BOT_POLICY_VERSION,
      digest: digest(record.request), receipt: record.receipt, evaluatedAt: record.now });
  }
  const taskId = hash([base.id, state.phase.id, state.deadlineToken]);
  batch.create(base.collection('outbox').doc(taskId), { protocolVersion: 2, matchId: base.id, phaseId: state.phase.id,
    deadlineToken: state.deadlineToken, endsAt: state.phase.endsAt, taskId, status: 'pending', attempts: 0,
    nextAttemptAt: Date.now(), leaseUntil: null, leaseToken: null });
  await batch.commit(); cleanup.push({ base, host: native.host });
  return { base, initial: state, native, prefixLength: records.length };
}
async function current(base) { return decodeV1State((await base.collection('engine').doc('current').get()).data()); }
async function records(base) { return (await base.collection('events').orderBy('sequence').get()).docs.map(doc => doc.data()); }
async function observeNext(h, previous, kind, duration) {
  const limit = performance.now() + Math.max(0, previous.phase.endsAt - Date.now()) + 30_000;
  do {
    const next = await current(h.base);
    if (next.phase.id !== previous.phase.id) {
      assert.equal(next.phase.kind, kind); assert.equal(next.phase.endsAt - next.phase.startedAt, duration);
      assert.ok(next.phase.startedAt >= previous.phase.endsAt); assert.ok(next.phase.startedAt <= Date.now());
      const decisions = (await records(h.base)).filter(r => r.kind === 'DEADLINE' && r.phaseId === previous.phase.id);
      assert.equal(decisions.length, 1); assert.equal(decisions[0].deadlineToken, previous.deadlineToken);
      assert.equal(decisions[0].nextPhaseId, next.phase.id); assert.equal(decisions[0].now, next.phase.startedAt);
      const intent = (await h.base.collection('outbox').where('phaseId', '==', previous.phase.id).get()).docs;
      assert.equal(intent.length, 1); assert.equal(intent[0].get('endsAt'), previous.phase.endsAt);
      assert.equal(intent[0].id, hash([h.base.id, previous.phase.id, previous.deadlineToken]));
      return next;
    }
    assert.deepEqual(next.phase, previous.phase, 'Automatic bot delivery never restarts or closes a phase early'); await pause();
  } while (performance.now() < limit);
  assert.fail(`Actual Tasks did not advance ${previous.phase.kind} to ${kind}`);
}
async function assertReplay(base) {
  const journal = await records(base); assert.deepEqual(journal.map(r => r.sequence), Array.from({ length: journal.length }, (_, i) => i + 1));
  let replay;
  for (const r of journal) {
    if (r.kind === 'SETUP') replay = createFullGame({ ...r, setup: decodeV1Setup(r.setup) });
    else if (r.kind === 'COMMAND') { const result = executeFullGame(replay, r.actorSeatId, r.request, r); assert.deepEqual(result.receipt, r.receipt); replay = result.state; }
    else if (r.kind === 'DEADLINE') { const result = advanceFullGame(replay, r); assert.equal(result.advanced, true); replay = result.state; }
    else if (r.kind === 'ABORT') replay = abortFullGame(replay, r);
    else assert.fail(`Unexpected journal kind ${r.kind}`);
    replay = { ...replay, journalSequence: r.sequence };
  }
  assert.deepEqual(replay, await current(base));
  assert.equal((await base.collection('receipts').get()).size, journal.filter(r => r.kind === 'COMMAND').length);
}
for (const count of [7, 8, 9]) test(`${count}: native Auth/admission configuration plus labelled legal 1.9 prefix observes real result/Blackout Tasks and automatic dark-stage bots`, { timeout: 120_000 }, async () => {
  assertLocalEmulators(); const app = initializeApp({ projectId }, `blackout-functions-${count}-${randomUUID()}`), db = getFirestore(app);
  const cleanup = [];
  try {
    const native = await nativeConfiguration(db, count, cleanup), h = await seedPrefix(db, count, native, cleanup);
    const resultView = await readView(`${h.base.path}/views/public`, native.display, FullPublicViewSchema);
    assert.equal(resultView.phase.kind, 'VOTE_RESULT'); assert.equal(resultView.versions.engineVersion, 'full-game-1.9.0'); assert.equal(resultView.blackout, null);
    const clock = await invoke('v1ServerTime', { protocolVersion: 2, matchId: h.base.id }, native.host);
    assert.equal(clock.status, 200); assert.equal(clock.headers.get('cache-control'), 'no-store, private');
    const time = FullServerTimeResponseSchema.parse(clock.body); assert.ok(time.serverTimeMs <= Date.now()); assert.ok(time.serverTimeMs >= h.initial.phase.startedAt);
    const window = await observeNext(h, h.initial, 'BLACKOUT', 15_000);
    assert.deepEqual(window.blackout.attempts.map(a => a.actorSeatId), native.botIds);
    assert.equal(window.blackout.darkStartsAt, window.phase.startedAt + 5_000);
    assert.equal(window.blackout.endsAt, window.phase.endsAt); assert.ok(window.phase.endsAt > Date.now());
    const publicBefore = FullPublicViewSchema.parse((await h.base.collection('views').doc('public').get()).data());
    assert.deepEqual(publicBefore.blackout, { snapshotId: window.phase.id, layoutRevision: 'board-v2-0.1.1', darkStartsAt: window.phase.startedAt + 5_000 });
    for (const identity of Object.values(native.humans)) {
      const view = FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(identity.uid).get()).data()); assert.equal(view.self.blackoutTargeting, null);
    }
    assert.equal((await h.base.collection('playerViews').get()).size, native.humanIds.length);
    const command = { protocolVersion: 2, matchId: h.base.id, phaseId: window.phase.id, commandId: randomUUID(),
      command: { type: 'SELECT_BLACKOUT_SLOT', snapshotId: window.phase.id, room: 'Room A', slotId: 'A1' } };
    assert.equal((await invoke('v1Command', command)).status, 401);
    for (const identity of [native.host, native.display, native.outsider]) {
      const denied = await invoke('v1Command', command, identity); assert.equal(denied.status, 403); assert.equal(FullCommandResponseSchema.parse(denied.body).error.code, 'FORBIDDEN');
    }
    const foreign = success(await invoke('v1Command', command, native.humans['seat-1']), FullCommandResponseSchema);
    assert.equal(foreign.receipt.status, 'rejected'); assert.equal(foreign.receipt.code, 'NOT_ALLOWED');
    const privatePath = `${h.base.path}/playerViews/${native.humans['seat-1'].uid}`;
    assert.equal((await firestoreRequest(privatePath, { idToken: native.humans['seat-1'].idToken })).status, 200);
    for (const identity of [native.host, native.display, native.outsider, native.humans['seat-2']]) assert.equal((await firestoreRequest(privatePath, { idToken: identity.idToken })).status, 403);
    let selections = [];
    const limit = performance.now() + Math.max(0, window.phase.endsAt - Date.now());
    do {
      const state = await current(h.base);
      if (state.phase.id === window.phase.id) {
        assert.deepEqual(state.phase, window.phase); assert.ok(state.seats.every(s => s.health === 'Healthy'));
      } else assert.ok(Date.now() >= window.phase.endsAt, 'Automatic progress cannot shorten the full shared deadline');
      selections = (await records(h.base)).filter(r => r.kind === 'COMMAND' && r.controller === 'bot'
        && r.request.phaseId === window.phase.id && r.request.command.type === 'SELECT_BLACKOUT_SLOT');
      assert.ok(selections.every(r => r.now >= window.blackout.darkStartsAt && r.now < window.phase.endsAt));
      assert.ok(selections.every(r => r.receipt.status === 'accepted'), 'Lit preview must not create a durable rejected bot receipt');
      const publicNow = FullPublicViewSchema.parse((await h.base.collection('views').doc('public').get()).data());
      if (publicNow.phase.id === window.phase.id) assert.deepEqual(publicNow, publicBefore, 'Bot selection is private and does not close lighting');
      else assert.ok(Date.now() >= window.phase.endsAt, 'Separate reads may cross the legitimate deadline, never an early transition');
      if (selections.length === native.botIds.length) break;
      await pause();
    } while (performance.now() < limit);
    assert.deepEqual(selections.map(r => r.actorSeatId).sort(), native.botIds);
    for (const r of selections) {
      assert.equal(r.policyVersion, PRACTICE_BOT_POLICY_VERSION); assert.equal(Object.hasOwn(r, 'verifiedUid'), false);
      assert.equal(r.request.command.slotId, 'A1'); assert.equal(r.request.command.room, 'Room A');
      assert.equal(r.request.commandId, hash([PRACTICE_BOT_POLICY_VERSION, h.base.id, window.phase.id, r.actorSeatId, 'SELECT_BLACKOUT_SLOT']));
      const stored = await h.base.collection('receipts').doc(hash([r.actorSeatId, r.request.commandId])).get();
      assert.equal(stored.get('controller'), 'bot'); assert.deepEqual(stored.get('receipt'), r.receipt);
      assert.equal(Object.hasOwn(stored.data(), 'verifiedUid'), false);
      for (const identity of [native.host, native.display, native.outsider]) {
        const denied = await invoke('v1Receipt', { protocolVersion: 2, matchId: h.base.id, commandId: r.request.commandId }, identity);
        assert.equal(denied.status, 403); assert.equal(FullLookupResponseSchema.parse(denied.body).error.code, 'FORBIDDEN');
      }
      const unknown = await invoke('v1Receipt', { protocolVersion: 2, matchId: h.base.id, commandId: r.request.commandId }, native.humans['seat-2']);
      assert.equal(unknown.status, 200); assert.equal(FullLookupResponseSchema.parse(unknown.body).status, 'unknown');
    }
    const next = await observeNext(h, window, 'CAPTAIN_ELECTION', 60_000);
    assert.equal(next.round, 2); assert.equal(next.blackout, null);
    assert.equal(next.seats.find(s => s.seatId === 'seat-1').health, count === 7 ? 'Injured' : 'Eliminated');
    assert.equal(next.seats.find(s => s.seatId === 'seat-1').location, 'Hospital');
    for (const id of native.botIds) assert.equal(next.seats.find(s => s.seatId === id).disablerSpent, true);
    const afterRecords = await records(h.base), actual = afterRecords.filter(r => r.sequence > h.prefixLength);
    assert.equal(actual.filter(r => r.kind === 'DEADLINE' && r.phaseId === h.initial.phase.id).length, 1);
    assert.equal(actual.filter(r => r.kind === 'DEADLINE' && r.phaseId === window.phase.id).length, 1);
    assert.equal(actual.filter(r => r.kind === 'COMMAND' && r.controller === 'bot' && r.request.phaseId === window.phase.id).length, native.botIds.length);
    assert.deepEqual((await h.base.collection('engine').doc('gameplayPins').get()).data(), PINS);
    await abortIfOpen(h.base, native.host); await assertReplay(h.base);
  } finally {
    for (const entry of cleanup.reverse()) await abortIfOpen(entry.base, entry.host);
    await db.terminate(); await deleteApp(app);
  }
});
