import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, FieldPath } from 'firebase-admin/firestore';
import { createV1Service, decodeV1State } from '@mothership/game-api';
import { createV1DeadlineHandler } from '../dist/v1.js';
import { createFirestoreDeadlineReader, createLocalDeadlineRunner } from '../dev/deadline-runner.mjs';
import { assertLocalEmulators } from '../test/helpers.mjs';

let app, db;
const bases = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const success = value => { assert.equal(value.ok, true); return value.result; };
before(() => {
  assertLocalEmulators();
  app = initializeApp({ projectId: 'demo-mothership' }, `local-runner-test-${randomUUID()}`);
  db = getFirestore(app);
});
after(async () => {
  for (const base of bases) await db.recursiveDelete(base);
  await db?.terminate(); if (app) await deleteApp(app);
});
async function match(clock = Date.now) {
  // Synthetic verified UID inputs are used only for service setup. No browser,
  // client advance loop, task overrides or seeded engine state is involved.
  const service = createV1Service({ db, clock, shuffle: values => [...values] });
  const host = `host-${randomUUID()}`;
  const created = success(await service.createMatch(host, { protocolVersion: 2, requestId: randomUUID(), playerCount: 7 }));
  const base = db.collection('matches').doc(created.matchId); bases.push(base);
  const request = fields => ({ protocolVersion: 2, matchId: base.id, requestId: randomUUID(), ...fields });
  for (let i = 1; i <= 7; i++) {
    const uid = `player-${randomUUID()}`;
    const admission = success(await service.requestAdmission(uid, { protocolVersion: 2, requestId: randomUUID(), roomCode: created.roomCode, initialRoom: 'Room A' }));
    success(await service.approveAdmission(host, request({ admissionId: admission.admissionId, seatId: `seat-${i}` })));
  }
  success(await service.startMatch(host, request({})));
  return { service, host, base, request, current: async () => decodeV1State((await base.collection('engine').doc('current').get()).data()) };
}
async function waitFor(read, predicate, timeoutMs) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) { const value = await read(); if (predicate(value)) return value; await pause(200); }
  assert.fail('Local deadline runner did not reach the expected state within the bounded wait');
}

test('independent local CLI advances a real 60-second phase with every browser closed', { timeout: 110_000 }, async () => {
  const h = await match(); const initial = await h.current();
  assert.equal(initial.phase.endsAt - initial.phase.startedAt, 60_000);
  assert.equal((await h.base.get()).exists, false, 'the reader must discover controls without root match documents');
  let output = '', errors = '';
  const child = spawn(process.execPath, ['infra/firebase/dev/run-deadlines.mjs'], {
    cwd: fileURLToPath(new URL('../../../', import.meta.url)),
    env: { ...process.env, GCLOUD_PROJECT: 'demo-mothership', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8180' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const exited = once(child, 'exit');
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { errors += chunk; });
  try {
    await waitFor(async () => output, value => value.includes('localDeadlines'), 15_000);
    // Only the independent poller and normal emulator Functions remain running.
    // No test/browser calls advance or runDeadline after match setup.
    const next = await waitFor(h.current, value => value.phase.id !== initial.phase.id, 75_000);
    assert.ok(next.phase.startedAt >= initial.phase.endsAt);
    assert.equal(next.phase.endsAt - next.phase.startedAt, 60_000);
    assert.equal(next.journalSequence, initial.journalSequence + 1);
    await waitFor(async () => output, value => value.split('\n').some(line => {
      try { return JSON.parse(line).localDeadlines.advanced > 0; } catch { return false; }
    }), 5_000);
    assert.equal(errors, '');
    assert.doesNotMatch(output, new RegExp(initial.deadlineToken));
  } finally {
    child.kill('SIGTERM');
    const killTimer = setTimeout(() => child.kill('SIGKILL'), 10_000);
    try {
      const [code] = await exited;
      assert.equal(code, 0, 'the runner must drain and close cleanly');
    } finally { clearTimeout(killTimer); }
  }
});

test('dispatched early delivery, restart, delayed catch-up and runner/client races preserve one full window', { timeout: 45_000 }, async () => {
  let now = 2_100_000_000_000;
  const h = await match(() => now), initial = await h.current();
  const intent = (await h.base.collection('outbox').get()).docs[0];
  const job = { matchId: h.base.id, phaseId: initial.phase.id, deadlineToken: initial.deadlineToken };
  // Model the observed emulator behavior through the real dispatch/handler path:
  // enqueue succeeds, delivery is immediate, evaluation is early, ack is durable.
  assert.equal((await h.service.dispatchDeadlineIntent(intent.ref.path, async () => {
    await createV1DeadlineHandler(h.service)(job);
  })).status, 'dispatched');
  assert.equal((await intent.ref.get()).get('status'), 'dispatched');
  assert.equal((await h.current()).phase.id, initial.phase.id);
  const scopedDb = { collectionGroup: name => h.base.collection(name), doc: path => db.doc(path), getAll: (...refs) => db.getAll(...refs) };
  const reader = createFirestoreDeadlineReader(scopedDb, FieldPath.documentId());
  const runner = () => createLocalDeadlineRunner({ readPage: reader, runDeadline: payload => h.service.runDeadline(payload), clock: () => now, pageSize: 1 });
  assert.equal((await runner().tick()).due, 0);
  now = initial.phase.endsAt + 120_000;
  // A new instance has no remembered tasks or prior cursor. Durable current state suffices.
  const restarted = runner(); assert.equal((await restarted.tick()).advanced, 1);
  const second = await h.current();
  assert.equal(second.phase.startedAt, now); assert.equal(second.phase.endsAt, now + 60_000);
  assert.equal((await restarted.tick()).due, 0);
  assert.equal((await h.service.runDeadline(job)).result, 'unchanged');
  assert.equal((await intent.ref.get()).get('status'), 'dispatched', 'the local runner must not rewrite dispatch status');
  now = second.phase.endsAt;
  await Promise.all([runner().tick(), runner().tick(), h.service.advance(h.host, { protocolVersion: 2, matchId: h.base.id, phaseId: second.phase.id })]);
  // Emulator contention can return UNAVAILABLE. Retry through the runner, preserving
  // the exact same authority and without weakening the single-transition assertion.
  let third = await h.current();
  for (let attempt = 0; third.phase.id === second.phase.id && attempt < 5; attempt++) {
    await runner().tick(); third = await h.current();
  }
  assert.notEqual(third.phase.id, second.phase.id);
  assert.equal(third.journalSequence, second.journalSequence + 1);
  assert.equal(third.phase.endsAt, now + 60_000);
  const deadlines = (await h.base.collection('events').where('kind', '==', 'DEADLINE').get()).docs;
  assert.equal(deadlines.length, 2);
  success(await h.service.abortMatch(h.host, h.request({})));
  assert.equal((await runner().tick()).scanned, 0);
});
