import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { FullOperationResponseSchema, FullCommandResponseSchema, FullSetPracticeBotsResponseSchema } from '@mothership/contracts';
import { advanceFullGame, FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS, projectFullGame } from '@mothership/engine';
import { createV1Service } from '../dist/index.js';
import { encodeV1State, decodeV1State } from '../dist/full-game.js';
import { startStagedMatch } from './staged-start-helper.mjs';
import { assertLocalEmulators, createEmulatorIdentity } from '../../../infra/firebase/test/helpers.mjs';

let app, db, serial = 0;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const success = response => { FullOperationResponseSchema.parse(response); assert.equal(response.ok, true); return response.result; };
const job = state => ({ matchId: state.matchId, phaseId: state.phase.id, deadlineToken: state.deadlineToken });
before(() => { assertLocalEmulators(); app = initializeApp({ projectId: 'demo-mothership' }, `deadline-repair-${randomUUID()}`); db = getFirestore(app); });
after(async () => { await db?.terminate(); if (app) await deleteApp(app); });

async function harness({ count = 7, bots = 0, legacy = false } = {}) {
  let now = 1_600_000_000_000 + ++serial * 100_000_000;
  const options = { db, clock: () => now, shuffle: items => [...items], randomInitialRoom: () => 'Room A' };
  const service = createV1Service(options), host = await createEmulatorIdentity();
  const players = await Promise.all(Array.from({ length: count - bots }, () => createEmulatorIdentity()));
  const created = success(await service.createMatch(host.uid, { protocolVersion: 2, requestId: randomUUID(), playerCount: count }));
  const base = db.collection('matches').doc(created.matchId);
  const request = (fields = {}) => ({ protocolVersion: 2, matchId: base.id, requestId: randomUUID(), ...fields });
  for (const [index, player] of players.entries()) {
    const admission = success(await service.requestAdmission(player.uid, { protocolVersion: 2, requestId: randomUUID(), roomCode: created.roomCode }));
    success(await service.approveAdmission(host.uid, request({ admissionId: admission.admissionId, seatId: `seat-${index + 1}` })));
  }
  if (bots) assert.equal(FullSetPracticeBotsResponseSchema.parse(await service.setPracticeBots(host.uid, { schemaVersion: 1, ...request({ botCount: bots }) })).ok, true);
  if (legacy) await base.collection('engine').doc('gameplayPins').delete();
  const h = { service, options, host, players, base, request, now: () => now, setTime: value => { now = value; },
    current: async () => decodeV1State((await base.collection('engine').doc('current').get()).data()) };
  await startStagedMatch(h);
  // All transactions, documents and queries are real Firestore. Restrict repair's
  // collection-group candidate page to this fixture, as other suites retain history.
  h.repairWith = (transaction = callback => db.runTransaction(callback)) => createV1Service({ ...options, db: {
    collection: name => db.collection(name), doc: path => db.doc(path), runTransaction: transaction,
    collectionGroup: name => { assert.equal(name, 'outbox'); return base.collection(name); },
  } });
  h.repair = h.repairWith();
  return h;
}
const noEnqueue = async () => assert.fail('An acknowledged deadline must be recovered without creating another task');
async function currentIntent(h) {
  const state = await h.current();
  const ref = h.base.collection('outbox').doc(hash([h.base.id, state.phase.id, state.deadlineToken]));
  assert.equal((await ref.get()).get('endsAt'), state.phase.endsAt);
  return ref;
}
async function dispatched(h) {
  const ref = await currentIntent(h), state = await h.current(); let calls = 0;
  assert.equal((await h.service.dispatchDeadlineIntent(ref.path, async intent => {
    calls++; assert.equal(intent.taskId, ref.id); assert.deepEqual(job(state), { matchId: intent.matchId, phaseId: intent.phaseId, deadlineToken: intent.deadlineToken });
  })).status, 'dispatched');
  assert.equal(calls, 1); assert.equal((await ref.get()).get('status'), 'dispatched');
  return { ref, state };
}
async function command(h, seatNumber, command) {
  const payload = { protocolVersion: 2, matchId: h.base.id, phaseId: (await h.current()).phase.id, commandId: randomUUID(), command };
  const response = FullCommandResponseSchema.parse(await h.service.submit(h.players[seatNumber - 1].uid, payload));
  assert.equal(response.ok, true); assert.equal(response.receipt.status, 'accepted'); return { payload, receipt: response.receipt };
}
const journal = async h => (await h.base.collection('events').orderBy('sequence').get()).docs.map(doc => doc.data());

for (const legacy of [false, true]) test(`dispatched due deadline with no delivery advances once and retains ${legacy ? 'legacy' : 'current'} version pins`, async () => {
  const h = await harness({ legacy }), { ref, state } = await dispatched(h);
  const before = await journal(h); h.setTime(state.phase.endsAt + 90_000);
  await h.repair.repairOutbox(noEnqueue, { limit: 10 });
  const after = await h.current();
  assert.notEqual(after.phase.id, state.phase.id, 'Repair must recover the acknowledged, undelivered deadline');
  assert.equal(after.activeSeatId, 'seat-2'); assert.equal(after.phase.startedAt, h.now());
  assert.equal(after.phase.endsAt, h.now() + 60_000); assert.deepEqual(after.seats, state.seats); assert.deepEqual(after.queued, state.queued);
  assert.deepEqual(after.versions, { ...(legacy ? LEGACY_FULL_GAME_VERSION_PINS : FULL_GAME_VERSION_PINS), assetManifestVersion: state.versions.assetManifestVersion });
  assert.equal((await ref.get()).get('status'), 'completed');
  const records = await journal(h); assert.equal(records.length, before.length + 1);
  const decision = records.at(-1); assert.equal(decision.kind, 'DEADLINE'); assert.equal(decision.phaseId, state.phase.id); assert.equal(decision.deadlineToken, state.deadlineToken);
  // Finish the page's next-phase pending enqueue, then prove repeated repair and
  // a delayed original delivery cannot skip its still-unexpired full minute.
  await h.repair.repairOutbox(async () => {}, { limit: 10 });
  assert.equal((await h.service.runDeadline(job(state))).result, 'unchanged');
  await h.repair.repairOutbox(noEnqueue, { limit: 10 }); assert.deepEqual(await h.current(), after);
  assert.deepEqual(await journal(h), records);
});

test('an old dispatched retry timestamp cannot advance before the actual deadline', async () => {
  const h = await harness(), { ref, state } = await dispatched(h);
  h.setTime(state.phase.startedAt + 30_000);
  await ref.update({ nextAttemptAt: h.now() }); // Saved intents from the previous dispatcher used the lease timestamp.
  const records = await journal(h);
  await h.repair.repairOutbox(noEnqueue, { limit: 1 });
  assert.deepEqual(await h.current(), state); assert.deepEqual(await journal(h), records);
  assert.equal((await ref.get()).get('status'), 'dispatched'); assert.equal((await ref.get()).get('nextAttemptAt'), state.phase.endsAt);
  assert.equal((await h.repair.repairOutbox(noEnqueue, { limit: 1 })).nextCursor, null, 'A deferred future record cannot occupy subsequent first pages');
});

test('pending and live/expired leases retain the enqueue path', async () => {
  const h = await harness(), ref = await currentIntent(h); let calls = 0;
  await ref.update({ status: 'leased', leaseToken: 'live-lease', leaseUntil: h.now() + 30_000, nextAttemptAt: h.now() });
  assert.equal((await h.repair.repairOutbox(async () => calls++, { limit: 1 })).unchanged, 1); assert.equal(calls, 0);
  h.setTime(h.now() + 30_000);
  assert.equal((await h.repair.repairOutbox(async intent => { calls++; assert.equal(intent.taskId, ref.id); }, { limit: 1 })).dispatched, 1);
  assert.equal(calls, 1); assert.equal((await ref.get()).get('status'), 'dispatched');
  assert.equal((await ref.get()).get('nextAttemptAt'), (await h.current()).phase.endsAt);
});

test('bounded cursor pages retire stale dispatched history without advancing a future current phase', async () => {
  const h = await harness(); const old = [];
  for (let index = 0; index < 3; index++) { const item = await dispatched(h); old.push(item); h.setTime(h.now() + 1000); await command(h, index + 1, { type: 'PASS_TURN' }); }
  const current = await h.current(); h.setTime(old.at(-1).state.phase.endsAt);
  // These old intents became stale through early Pass; make their repair timestamp
  // eligible, without changing the untouched current phase's future endsAt.
  for (const item of old) await item.ref.update({ nextAttemptAt: h.now() });
  await (await currentIntent(h)).update({ nextAttemptAt: h.now() + 1 });
  let cursor; let pages = 0;
  do { const page = await h.repair.repairOutbox(noEnqueue, { limit: 1, ...(cursor ? { cursor } : {}) }); cursor = page.nextCursor; assert.ok(++pages <= 4); } while (cursor);
  for (const item of old) assert.equal((await item.ref.get()).get('status'), 'completed');
  assert.deepEqual(await h.current(), current);
  assert.equal((await h.repair.repairOutbox(noEnqueue, { limit: 1 })).nextCursor, null);
  await assert.rejects(h.repair.repairOutbox(noEnqueue, { limit: 1, cursor: 'invalid' }), /Invalid repair cursor/);
  for (const limit of [0, 101, 1.5]) await assert.rejects(h.repair.repairOutbox(noEnqueue, { limit }), /1\.\.100/);
});

for (const corruption of ['task-id', 'due-time', 'unsupported']) test(`dispatched ${corruption} records fail closed and leave the repair page`, async () => {
  const h = await harness(), { ref, state } = await dispatched(h); h.setTime(state.phase.endsAt);
  if (corruption === 'task-id') await ref.update({ taskId: 'f'.repeat(64) });
  if (corruption === 'due-time') await ref.update({ endsAt: state.phase.endsAt - 1 });
  if (corruption === 'unsupported') await h.base.collection('engine').doc('current').set(encodeV1State({ ...state, versions: { ...state.versions, engineVersion: 'unreviewed-engine' } }));
  const before = await h.current(), records = await journal(h);
  assert.equal((await h.repair.repairOutbox(noEnqueue, { limit: 1 })).blocked, 1);
  assert.equal((await ref.get()).get('status'), 'blocked'); assert.deepEqual(await h.current(), before); assert.deepEqual(await journal(h), records);
  assert.equal((await h.repair.repairOutbox(noEnqueue, { limit: 1 })).nextCursor, null);
});

test('repair and duplicate delivery race to one canonical phase decision', async () => {
  const h = await harness(), { ref, state } = await dispatched(h); h.setTime(state.phase.endsAt);
  await Promise.all([h.repair.repairOutbox(noEnqueue, { limit: 1 }), h.repair.repairOutbox(noEnqueue, { limit: 1 }), h.service.runDeadline(job(state))]);
  assert.equal((await h.current()).activeSeatId, 'seat-2'); assert.equal((await ref.get()).get('status'), 'completed');
  assert.equal((await journal(h)).filter(record => record.kind === 'DEADLINE' && record.phaseId === state.phase.id).length, 1);
});

test('Pass racing due repair cannot skip a second turn, and an old token cannot alter the winner', async () => {
  const h = await harness(), { ref, state } = await dispatched(h); h.setTime(state.phase.endsAt - 1);
  // Hold the Pass transaction at its engine read, then let the authoritative
  // repair clock reach the deadline before both transactions settle.
  let entered, release;
  const began = new Promise(resolve => { entered = resolve; }), hold = new Promise(resolve => { release = resolve; }); let held = false;
  const delayedDb = { collection: name => db.collection(name), doc: path => db.doc(path), runTransaction: callback => db.runTransaction(tx => callback(new Proxy(tx, { get(target, key) {
    if (key === 'get') return async reference => { const value = await target.get(reference); if (!held && reference.path === h.base.path + '/engine/current') { held = true; entered(); await hold; } return value; };
    const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value;
  } }))) };
  const payload = { protocolVersion: 2, matchId: h.base.id, phaseId: state.phase.id, commandId: randomUUID(), command: { type: 'PASS_TURN' } };
  const pass = createV1Service({ ...h.options, db: delayedDb }).submit(h.players[0].uid, payload); await began;
  h.setTime(state.phase.endsAt); release(); await Promise.all([pass, h.repair.repairOutbox(noEnqueue, { limit: 1 })]);
  const after = await h.current(); assert.equal(after.activeSeatId, 'seat-2'); assert.equal(after.phase.startedAt, h.now());
  assert.equal((await h.service.runDeadline(job(state))).result, 'unchanged'); assert.deepEqual(await h.current(), after);
  assert.equal((await ref.get()).get('status'), 'completed');
  assert.equal((await journal(h)).filter(record => record.kind === 'DEADLINE' && record.phaseId === state.phase.id).length, 1);
});

test('repair preserves queued effects and starts a complete separate Hack minute', async () => {
  const h = await harness();
  while ((await h.current()).activeSeatId !== 'seat-5') {
    const before = await h.current(), ref = await currentIntent(h); h.setTime(before.phase.endsAt);
    assert.equal((await h.service.runDeadline(job(before))).result, 'advanced'); await ref.update({ status: 'completed' });
  }
  const { ref, state } = await dispatched(h);
  await command(h, 5, { type: 'PROTECT', targetSeatId: 'seat-1' }); await command(h, 5, { type: 'REQUEST_HACK', targetSeatId: 'seat-2' });
  const registered = await h.current(); h.setTime(state.phase.endsAt + 80_000);
  await h.repair.repairOutbox(noEnqueue, { limit: 1 });
  const hack = await h.current(); assert.equal(hack.phase.kind, 'HACK'); assert.equal(hack.turnIndex, state.turnIndex);
  assert.equal(hack.phase.startedAt, h.now()); assert.equal(hack.phase.endsAt, h.now() + 60_000);
  assert.deepEqual(hack.queued, registered.queued); assert.deepEqual(hack.seats, registered.seats);
  assert.equal(hack.pendingHack, null); assert.deepEqual(hack.activeHack, registered.pendingHack);
  assert.equal((await ref.get()).get('status'), 'completed');
  const next = await dispatched(h); h.setTime(next.state.phase.endsAt); await h.repair.repairOutbox(noEnqueue, { limit: 1 });
  assert.equal((await h.current()).activeSeatId, 'seat-6'); assert.deepEqual((await h.current()).queued, registered.queued);
});

async function roundFiveElectionPredecessor(h) {
  let state = await h.current();
  // Explicit late-round test fixture prepared solely by real canonical engine
  // deadline transitions, with no guessed effects/roles and no bot stand-in.
  for (let index = 0; !(state.round === 4 && state.phase.kind === 'JAIL_VOTE'); index++) {
    assert.ok(index < 100); state = advanceFullGame(state, { ...job(state), now: state.phase.endsAt, nextPhaseId: randomUUID(), nextDeadlineToken: randomUUID() }).state;
  }
  h.setTime(state.phase.startedAt); await h.base.collection('engine').doc('current').set(encodeV1State(state));
  const publicView = projectFullGame(state).public; await h.base.collection('views').doc('public').set(publicView);
  for (const doc of (await h.base.collection('outbox').get()).docs) await doc.ref.update({ status: 'completed' });
  const taskId = hash([h.base.id, state.phase.id, state.deadlineToken]);
  await h.base.collection('outbox').doc(taskId).set({ protocolVersion: 2, ...job(state), endsAt: state.phase.endsAt, taskId,
    status: 'pending', attempts: 0, nextAttemptAt: h.now(), leaseUntil: null, leaseToken: null });
  return dispatched(h);
}

test('direct repair runs real bot decisions beyond one full 18-command pass without Eventarc', async () => {
  const h = await harness({ count: 9, bots: 9 }), { ref, state } = await roundFiveElectionPredecessor(h); h.setTime(state.phase.endsAt);
  await h.repair.repairOutbox(noEnqueue, { limit: 1 }); const after = await h.current();
  assert.equal(after.round, 5); assert.equal(after.phase.kind, 'CAPTAIN_ELECTION'); assert.equal(after.ballots.length, 9);
  assert.equal(after.seats.filter(seat => seat.movedInRound).length, 9); assert.equal(after.codeSubmitted, true);
  const commands = (await journal(h)).filter(record => record.kind === 'COMMAND' && record.request.phaseId === after.phase.id);
  assert.equal(commands.length, 19, 'Actual nine votes, nine movements and the Hacker Code slot must all be processed');
  assert.equal(new Set(commands.map(record => record.request.commandId)).size, 19);
  assert.equal((await ref.get()).get('status'), 'completed');
  assert.deepEqual(await h.service.runPracticeBots(h.base.id, { limit: 18 }), { status: 'unchanged', processed: 0 });
  assert.equal((await h.base.collection('receipts').get()).size, 19);
});

test('bot storage failure after canonical advancement retains a durable retry and reconciles the new phase', async () => {
  const h = await harness({ count: 9, bots: 9 }), { ref, state } = await roundFiveElectionPredecessor(h); h.setTime(state.phase.endsAt);
  let failBot = true;
  const broken = h.repairWith(callback => db.runTransaction(tx => callback(new Proxy(tx, { get(target, key) {
    if (key === 'get') return async reference => { if (failBot && reference.path === h.base.path + '/practice/public') { failBot = false; throw new Error('synthetic bot storage failure'); } return target.get(reference); };
    const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value;
  } }))));
  assert.equal((await broken.repairOutbox(noEnqueue, { limit: 1 })).failed, 1);
  assert.equal((await h.current()).round, 5, 'The deadline committed before bot storage failed');
  assert.equal((await ref.get()).get('status'), 'dispatched'); assert.ok((await ref.get()).get('nextAttemptAt') > h.now());
  assert.equal((await h.repair.repairOutbox(async () => {}, { limit: 1 })).dispatched, 1, 'The fresh phase still follows its ordinary enqueue path');
  assert.equal((await h.repair.repairOutbox(noEnqueue, { limit: 1 })).nextCursor, null, 'Backoff leaves the failed first page');
  h.setTime((await ref.get()).get('nextAttemptAt'));
  await h.repair.repairOutbox(async () => {}, { limit: 100 });
  const after = await h.current(); assert.equal(after.ballots.length, 9); assert.equal(after.codeSubmitted, true); assert.equal(after.seats.filter(seat => seat.movedInRound).length, 9);
  assert.equal((await ref.get()).get('status'), 'completed');
  assert.equal((await journal(h)).filter(record => record.kind === 'DEADLINE' && record.phaseId === state.phase.id).length, 1);
  assert.equal((await h.base.collection('receipts').get()).size, 19);
});
