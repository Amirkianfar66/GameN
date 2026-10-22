import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, before, after } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { FullOperationResponseSchema, FullSetPracticeBotsResponseSchema, FullBeginSetupResponseSchema, FullSetupDocumentSchema } from '@mothership/contracts';
import { createV1Service } from '../dist/index.js';
import { assertLocalEmulators, projectId, createEmulatorIdentity } from '../../../infra/firebase/test/helpers.mjs';

let app, db, serial = 0;
before(() => { assertLocalEmulators(); app = initializeApp({ projectId }, 'setup-outbox-' + randomUUID()); db = getFirestore(app); });
after(async () => { await db?.terminate(); if (app) await deleteApp(app); });
async function harness() {
  // Earlier than other isolated fixtures so bounded global repair picks only this test's due intents.
  let now = 1_000_000_000_000 + ++serial * 100_000_000;
  const service = createV1Service({ db, clock: () => now }), host = await createEmulatorIdentity();
  const created = FullOperationResponseSchema.parse(await service.createMatch(host.uid, { protocolVersion: 2, requestId: randomUUID(), playerCount: 7 }));
  assert.equal(created.ok, true); const base = db.collection('matches').doc(created.result.matchId);
  const request = fields => ({ schemaVersion: 1, protocolVersion: 2, matchId: base.id, requestId: randomUUID(), ...fields });
  assert.equal(FullSetPracticeBotsResponseSchema.parse(await service.setPracticeBots(host.uid, request({ botCount: 7 }))).ok, true);
  const begin = FullBeginSetupResponseSchema.parse(await service.beginSetup(host.uid, request()));
  assert.equal(begin.ok, true); assert.equal(begin.stage, 'choosing');
  const progress = async () => FullSetupDocumentSchema.parse((await base.collection('setup').doc('public').get()).data());
  const intent = async stage => {
    const docs = (await base.collection('setupOutbox').get()).docs.filter(doc => doc.get('stage') === stage);
    assert.equal(docs.length, 1); return docs[0];
  };
  return { service, host, base, request, progress, intent, now: () => now, setTime: value => { now = value; } };
}
const payload = doc => { const value = doc.data(); return { matchId: value.matchId, setupId: value.setupId, stage: value.stage, deadlineToken: value.deadlineToken }; };
const noGameplay = async h => { assert.equal((await h.base.collection('engine').doc('current').get()).exists, false); assert.equal((await h.base.collection('outbox').get()).size, 0); };
const enqueueNever = async () => { assert.fail('A due lost task must be evaluated, not hidden behind an existing queue ID'); };

test('bounded repair recovers dispatched but lost setup tasks through both full windows without a browser', async () => {
  const h = await harness(), captured = [];
  const choosing = await h.intent('choosing');
  assert.deepEqual(await h.service.dispatchSetupDeadlineIntent(choosing.ref.path, async value => { captured.push(value); }), { status: 'dispatched' });
  assert.equal(captured.length, 1); assert.equal(captured[0].dueAt, choosing.get('dueAt'));
  assert.deepEqual(await h.service.dispatchSetupDeadlineIntent(choosing.ref.path, enqueueNever), { status: 'unchanged' });
  h.setTime(choosing.get('dueAt') - 1); await h.service.repairSetupOutbox(enqueueNever, { limit: 100 }); await noGameplay(h);
  assert.equal((await h.progress()).stage, 'choosing');
  h.setTime(choosing.get('dueAt')); const first = await h.service.repairSetupOutbox(enqueueNever, { limit: 100 });
  assert.equal(first.failed, 0); assert.equal(first.blocked, 0); assert.equal((await h.progress()).stage, 'awaiting-ready'); await noGameplay(h);
  assert.equal((await choosing.ref.get()).get('status'), 'completed');
  const reading = await h.intent('awaiting-ready');
  assert.equal(reading.get('dueAt') - h.now(), 30_000);
  assert.deepEqual(await h.service.dispatchSetupDeadlineIntent(reading.ref.path, async value => { captured.push(value); }), { status: 'dispatched' });
  h.setTime(reading.get('dueAt') - 1); await h.service.repairSetupOutbox(enqueueNever, { limit: 100 }); await noGameplay(h);
  h.setTime(reading.get('dueAt')); const last = await h.service.repairSetupOutbox(enqueueNever, { limit: 100 });
  assert.equal(last.failed, 0); assert.equal(last.blocked, 0); assert.equal((await h.progress()).stage, 'running');
  const state = (await h.base.collection('engine').doc('current').get()).data();
  assert.equal(state.phase.startedAt, h.now()); assert.equal(state.phase.endsAt - h.now(), 60_000);
  assert.equal((await h.base.collection('events').where('kind', '==', 'SETUP').get()).size, 1);
  assert.equal((await h.base.collection('outbox').get()).size, 1); assert.equal(captured.length, 2);
  assert.deepEqual(await h.service.runSetupDeadline(payload(reading)), { status: 'unchanged' });
});

test('setup enqueue failure keeps a retryable durable intent and later dispatch retains the exact payload', async () => {
  const h = await harness(), choosing = await h.intent('choosing');
  assert.deepEqual(await h.service.dispatchSetupDeadlineIntent(choosing.ref.path, async () => { throw Error('synthetic queue outage'); }), { status: 'failed' });
  const failed = await choosing.ref.get(); assert.equal(failed.get('status'), 'pending'); assert.ok(failed.get('nextAttemptAt') > h.now());
  assert.equal(failed.get('leaseToken'), null); assert.equal(failed.get('leaseUntil'), null); await noGameplay(h);
  h.setTime(failed.get('nextAttemptAt')); let captured;
  assert.deepEqual(await h.service.dispatchSetupDeadlineIntent(choosing.ref.path, async value => { captured = value; }), { status: 'dispatched' });
  for (const key of ['matchId', 'setupId', 'stage', 'deadlineToken', 'dueAt', 'taskId']) assert.equal(captured[key], choosing.get(key));
  const latest = await choosing.ref.get(); assert.equal(latest.get('attempts'), 2); assert.equal(latest.get('nextAttemptAt'), choosing.get('dueAt'));
});

test('expired dispatch lease is repaired atomically and late queue acknowledgement cannot resurrect it', async () => {
  const h = await harness(), choosing = await h.intent('choosing');
  let queued, release; const reached = new Promise(resolve => { queued = resolve; }), held = new Promise(resolve => { release = resolve; });
  const dispatch = h.service.dispatchSetupDeadlineIntent(choosing.ref.path, async () => { queued(); await held; });
  await reached; const leased = await choosing.ref.get(); assert.equal(leased.get('status'), 'leased');
  h.setTime(Math.max(leased.get('leaseUntil'), choosing.get('dueAt')));
  const repair = await h.service.repairSetupOutbox(enqueueNever, { limit: 100 }); assert.equal(repair.failed, 0);
  assert.equal((await h.progress()).stage, 'awaiting-ready'); assert.equal((await choosing.ref.get()).get('status'), 'completed');
  release(); assert.deepEqual(await dispatch, { status: 'unchanged' }); assert.equal((await choosing.ref.get()).get('status'), 'completed'); await noGameplay(h);
});

test('setup dispatcher and repair reject other outbox paths, invalid limits and cursor domains before mutation', async () => {
  const h = await harness(), before = (await h.progress()).revision;
  for (const path of ['matches/' + h.base.id + '/outbox/' + 'a'.repeat(64), 'setupOutbox/invalid', 'matches/../setupOutbox/' + 'a'.repeat(64)]) {
    assert.deepEqual(await h.service.dispatchSetupDeadlineIntent(path, enqueueNever), { status: 'blocked' });
  }
  for (const limit of [0, 101, -1, 1.5]) await assert.rejects(() => h.service.repairSetupOutbox(enqueueNever, { limit }));
  const cursor = Buffer.from(JSON.stringify({ time: h.now(), path: h.base.path + '/outbox/' + 'a'.repeat(64) })).toString('base64url');
  await assert.rejects(() => h.service.repairSetupOutbox(enqueueNever, { limit: 1, cursor }));
  assert.equal((await h.progress()).revision, before); await noGameplay(h);
});
