import test from 'node:test';
import assert from 'node:assert/strict';
import { assertLocalDeadlineEnvironment, createLocalDeadlineRunner } from '../dev/deadline-runner.mjs';
import { startLocalDeadlineCli } from '../dev/run-deadlines.mjs';

const local = { GCLOUD_PROJECT: 'demo-mothership', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8180' };
const state = (overrides = {}) => ({ matchId: 'match-a', versions: { protocolVersion: 2 },
  phase: { id: 'phase-a', kind: 'ORDINARY_TURN', endsAt: 1_000 }, deadlineToken: 'private-token', ...overrides });
const entry = value => ({ path: 'matches/match-a/control/session', state: value });
const page = entries => ({ entries, scanned: entries.length, nextCursor: null });
const response = (payload, result = 'advanced') => ({ protocolVersion: 2, ...payload, serverTimeMs: 1_000, result });
const flush = () => new Promise(resolve => setImmediate(resolve));

test('local runner guard refuses live/mixed/remote configuration before loading the SDK', async () => {
  assert.equal(assertLocalDeadlineEnvironment(local).projectId, 'demo-mothership');
  assert.equal(assertLocalDeadlineEnvironment({ GCP_PROJECT: 'demo-mothership', FIRESTORE_EMULATOR_HOST: '[::1]:8180',
    FIREBASE_CONFIG: '{"projectId":"demo-mothership"}', CLOUD_TASKS_EMULATOR_HOST: 'localhost:9499' }).projectId, 'demo-mothership');
  let initialized = 0;
  for (const environment of [
    {}, { GCLOUD_PROJECT: 'demo-mothership' }, { ...local, GCLOUD_PROJECT: 'production-project' },
    { ...local, GCP_PROJECT: 'different-project' }, { ...local, FIREBASE_CONFIG: '/tmp/firebase-config.json' },
    { ...local, FIREBASE_CONFIG: '{"projectId":"production-project"}' },
    ...['remote.example:8180', 'https://localhost:8180', 'user@localhost:8180', 'localhost:8180/path', 'localhost:8190', 'localhost:0'].map(host => ({ ...local, FIRESTORE_EMULATOR_HOST: host })),
    { ...local, CLOUD_TASKS_EMULATOR_HOST: 'remote.example:9499' }, { ...local, FIREBASE_DATABASE_EMULATOR_HOST: 'localhost:9000' },
    { ...local, GOOGLE_APPLICATION_CREDENTIALS: '/private/credential.json' }, { ...local, K_SERVICE: 'cloud-run' },
    { ...local, FUNCTION_TARGET: 'deployed-function' }, { ...local, FUNCTION_NAME: 'deployed-function' }, { ...local, FUNCTIONS_EMULATOR: 'false' },
  ]) await assert.rejects(startLocalDeadlineCli({ environment, loadRuntime: async () => { initialized++; assert.fail('SDK must not initialize'); } }));
  assert.equal(initialized, 0);
});

test('current phase is evaluated at the exact deadline and never early, independent of outbox status', async () => {
  let now = 999, current = state(), calls = 0;
  const runner = createLocalDeadlineRunner({ clock: () => now, readPage: async () => page([entry(current)]),
    runDeadline: async payload => { calls++; current = state({ phase: { id: 'phase-b', kind: 'ORDINARY_TURN', endsAt: 61_000 } }); return response(payload); } });
  assert.equal((await runner.tick()).due, 0); assert.equal(calls, 0);
  now = 1_000;
  assert.equal((await runner.tick()).advanced, 1); assert.equal(calls, 1);
  assert.equal((await runner.tick()).due, 0); assert.equal(calls, 1);
});

test('terminal, legacy, missing and malformed current records cannot invoke a trusted deadline', async () => {
  const entries = [entry(undefined), entry(state({ versions: { protocolVersion: 1 } })),
    entry(state({ phase: { id: 'phase-a', kind: 'FINISHED', endsAt: 1_000 } })),
    entry(state({ phase: { id: 'phase-a', kind: 'ABORTED', endsAt: 1_000 } })),
    entry(state({ phase: { id: 123, endsAt: 1_000 } })), entry(state({ deadlineToken: 123 })),
    entry(state({ phase: { id: 'phase-a', endsAt: null } })), entry(state({ matchId: 'another-match' })),
    { path: 'users/foreign/control/session', state: state() }, null];
  const runner = createLocalDeadlineRunner({ clock: () => 2_000, readPage: async () => page(entries), runDeadline: async () => assert.fail('invalid deadline') });
  assert.equal((await runner.tick()).skipped, entries.length);
});

test('unavailable, thrown and malformed responses retry on the next sweep without reporting success', async () => {
  let calls = 0;
  const runner = createLocalDeadlineRunner({ clock: () => 2_000, readPage: async () => page([entry(state())]),
    runDeadline: async payload => {
      calls++;
      if (calls === 1) return { ok: false, error: { code: 'UNAVAILABLE' } };
      if (calls === 2) throw new Error('Private Code and token');
      if (calls === 3) return { ...response(payload), matchId: 'another-match' };
      return response(payload, 'unchanged');
    } });
  for (let i = 0; i < 3; i++) { const counts = await runner.tick(); assert.equal(counts.failed, 1); assert.equal(counts.advanced, 0); }
  assert.equal((await runner.tick()).unchanged, 1);
});

test('bounded pagination wraps; a failed page is retried and later pages are not starved', async () => {
  const cursors = []; let fail = true;
  const runner = createLocalDeadlineRunner({ pageSize: 1, clock: () => 2_000,
    readPage: async ({ limit, cursor }) => {
      assert.equal(limit, 1); cursors.push(cursor);
      if (cursor === 'second' && fail) { fail = false; throw new Error('Unavailable'); }
      return { ...page([entry(state())]), nextCursor: cursor === null ? 'second' : cursor === 'second' ? 'third' : null };
    }, runDeadline: async payload => response(payload) });
  for (let i = 0; i < 5; i++) await runner.tick();
  assert.deepEqual(cursors, [null, 'second', 'second', 'third', null]);
});

test('overlapping ticks share one evaluation and shutdown drains it without rescheduling', async () => {
  let release, reads = 0, cleared = 0;
  const pending = new Promise(resolve => { release = resolve; });
  const timers = new Map(); let serial = 0;
  const scheduler = { setTimeout(fn) { timers.set(++serial, fn); return serial; }, clearTimeout(id) { timers.delete(id); cleared++; } };
  const runner = createLocalDeadlineRunner({ scheduler, readPage: async () => { reads++; await pending; return page([]); }, runDeadline: async () => assert.fail() });
  runner.start(); runner.start(); const first = runner.tick(); assert.equal(first, runner.tick()); assert.equal(reads, 1);
  let drained = false; const stop = runner.stop().then(() => { drained = true; });
  await flush(); assert.equal(drained, false);
  runner.start(); // Restart during a drain must leave only the new loop generation.
  release(); await first; await flush(); assert.equal(timers.size, 1);
  await runner.stop(); await stop; assert.equal(timers.size, 0); assert.equal(cleared, 1);
});

test('diagnostics expose aggregate counters only, even when SDK evaluation throws private details', async () => {
  const reports = [];
  const runner = createLocalDeadlineRunner({ clock: () => 2_000, readPage: async () => page([entry(state())]),
    runDeadline: async () => { throw new Error('private-role-map Code recovery-token'); }, report: counts => reports.push(counts) });
  await runner.tick();
  assert.deepEqual(Object.keys(reports[0]), ['scanned', 'due', 'advanced', 'unchanged', 'failed', 'skipped']);
  assert.equal(Object.isFrozen(reports[0]), true);
  assert.doesNotMatch(JSON.stringify(reports), /private|Code|token|match-a|phase-a/);
});

test('runner bounds fail closed and diagnostic failures do not stop evaluation', async () => {
  const options = { readPage: async () => page([]), runDeadline: async () => assert.fail() };
  for (const pageSize of [0, 101, 1.5]) assert.throws(() => createLocalDeadlineRunner({ ...options, pageSize }));
  for (const pollMs of [0, 99, 60_001, 1.5]) assert.throws(() => createLocalDeadlineRunner({ ...options, pollMs }));
  assert.equal((await createLocalDeadlineRunner({ ...options, report: () => { throw new Error('console unavailable'); } }).tick()).failed, 0);
});


test('guarded CLI starts one poll and releases the initialized runtime on shutdown', async () => {
  let loaded = 0, closed = 0, polls = 0;
  const query = { where() { return this; }, orderBy() { return this; }, limit() { return this; }, async get() { polls++; return { docs: [], size: 0 }; } };
  const stop = await startLocalDeadlineCli({ environment: local, report: () => {}, loadRuntime: async configuration => {
    loaded++; assert.equal(configuration.projectId, 'demo-mothership');
    return { db: { collectionGroup: () => query }, documentIdField: 'document-id', service: { runDeadline: async () => assert.fail() }, close: async () => { closed++; } };
  } });
  await stop(); assert.equal(loaded, 1); assert.equal(polls, 1); assert.equal(closed, 1);
});
