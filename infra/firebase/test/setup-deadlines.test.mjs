import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { RESET_VALUE } from 'firebase-functions/v2/options';
import { createV1SetupEnqueuer, createV1SetupDeadlineHandler, createV1SetupRepairHandler, createV1Entrypoints, V1_OPERATIONS } from '../dist/v1.js';

const payload = { matchId: 'synthetic-match', setupId: 'synthetic-setup', stage: 'choosing', deadlineToken: 'synthetic-token' };
const idFor = value => createHash('sha256').update(JSON.stringify(['setup', value.matchId, value.setupId, value.stage, value.deadlineToken])).digest('hex');
const intent = { ...payload, taskId: idFor(payload), dueAt: 1_234_567 };
const failure = message => error => error.message === message;

function endpoints(service = {}, configuration = {}) {
  let resolutions = 0;
  return { value: createV1Entrypoints(() => { resolutions++; return { app: {}, configuration, service }; }), resolutions: () => resolutions };
}
function event(protocolVersion = 2) {
  return { params: { matchId: payload.matchId, intentId: intent.taskId }, data: { get: key => key === 'protocolVersion' ? protocolVersion : undefined,
    ref: { path: `matches/${payload.matchId}/setupOutbox/${intent.taskId}` } } };
}

test('setup timer endpoints are private, bounded, separately scheduled and lazy with no new browser operation', () => {
  const handlers = endpoints(); assert.equal(handlers.resolutions(), 0);
  for (const name of ['setupDeadlineTask', 'dispatchSetupDeadline', 'repairSetupDeadlines']) {
    const metadata = handlers.value[name].__endpoint;
    assert.equal(metadata.platform, 'gcfv2'); assert.deepEqual(metadata.region, ['us-central1']);
    assert.equal(metadata.maxInstances, 12); assert.equal(metadata.minInstances, 0);
    assert.equal(metadata.httpsTrigger, undefined);
    assert.equal(V1_OPERATIONS.includes(name), false);
  }
  const task = handlers.value.setupDeadlineTask.__endpoint;
  assert.deepEqual(task.taskQueueTrigger.invoker, ['private']); assert.equal(task.timeoutSeconds, 30);
  assert.equal(task.taskQueueTrigger.retryConfig.maxAttempts, 10);
  assert.equal(task.taskQueueTrigger.retryConfig.minBackoffSeconds, 1); assert.equal(task.taskQueueTrigger.retryConfig.maxBackoffSeconds, 60);
  assert.equal(task.taskQueueTrigger.rateLimits.maxConcurrentDispatches, 10);
  const dispatch = handlers.value.dispatchSetupDeadline.__endpoint;
  assert.equal(dispatch.eventTrigger.eventType, 'google.cloud.firestore.document.v1.created');
  assert.equal(dispatch.eventTrigger.eventFilterPathPatterns.document, 'matches/{matchId}/setupOutbox/{intentId}');
  assert.equal(dispatch.eventTrigger.retry, true); assert.equal(dispatch.timeoutSeconds, 30);
  const repair = handlers.value.repairSetupDeadlines.__endpoint;
  assert.equal(repair.scheduleTrigger.schedule, 'every 1 minutes'); assert.equal(repair.timeoutSeconds, 60);
  assert.equal(handlers.value.deadlineTask.__endpoint.maxInstances, RESET_VALUE, 'Existing gameplay endpoint options retain the SDK default reset');
});

test('setup enqueue sends only the separate epoch/stage/token envelope at the authoritative due time', async () => {
  const calls = [];
  const enqueue = createV1SetupEnqueuer({ enqueue: async (given, options) => calls.push({ given, options }) });
  for (const stage of ['choosing', 'awaiting-ready']) {
    const given = { ...intent, stage, taskId: idFor({ ...payload, stage }), protocolVersion: 2, status: 'pending', privateRole: 'not-forwarded' };
    await enqueue(given);
    assert.deepEqual(calls.at(-1).given, { ...payload, stage });
    assert.equal(calls.at(-1).options.id, given.taskId); assert.equal(calls.at(-1).options.scheduleTime.getTime(), intent.dueAt);
    assert.notEqual(given.taskId, createHash('sha256').update(JSON.stringify([payload.matchId, payload.setupId, payload.deadlineToken])).digest('hex'));
  }
  assert.equal(calls.length, 2);
});

test('setup enqueue refuses malformed identity, stage, hash and due time before touching the queue', async () => {
  let calls = 0;
  const enqueue = createV1SetupEnqueuer({ enqueue: async () => { calls++; } });
  for (const invalid of [
    { ...intent, matchId: '../match' }, { ...intent, setupId: '' }, { ...intent, deadlineToken: 'token/child' },
    { ...intent, stage: 'running' }, { ...intent, stage: 'ORDINARY_TURN' }, { ...intent, taskId: 'wrong-task' },
    { ...intent, dueAt: -1 }, { ...intent, dueAt: 1.5 }, { ...intent, dueAt: Number.MAX_SAFE_INTEGER + 1 },
    { ...intent, dueAt: Number.MAX_SAFE_INTEGER }, { ...intent, dueAt: NaN },
  ]) await assert.rejects(enqueue(invalid), failure('Invalid setup deadline intent'));
  assert.equal(calls, 0);
});

test('setup enqueue treats recognized AlreadyExists as the lost-ack case but propagates other failures', async () => {
  for (const code of ['functions/task-already-exists', 'ALREADY_EXISTS', 6]) {
    let calls = 0;
    const enqueue = createV1SetupEnqueuer({ enqueue: async () => { calls++; throw Object.assign(new Error('private task diagnostics'), { code }); } });
    await enqueue(intent); assert.equal(calls, 1);
  }
  await assert.rejects(createV1SetupEnqueuer({ enqueue: async () => { throw new Error('synthetic unavailable'); } })(intent), /synthetic unavailable/);
});

test('setup task validates exact setup envelope and cannot use gameplay phase fields or client authority', async () => {
  const calls = [];
  const handler = createV1SetupDeadlineHandler({ runSetupDeadline: async given => { calls.push(given); return { status: 'unchanged' }; },
    runPracticeBots: async () => assert.fail('Setup must not invoke gameplay bots') });
  for (const invalid of [null, [], {}, { ...payload, phaseId: 'forged-gameplay-phase' }, { ...payload, uid: 'forged-host' },
    { ...payload, protocolVersion: 2 }, { ...payload, dueAt: 0 }, { ...payload, stage: 'running' }, { ...payload, setupId: '../setup' },
    { matchId: payload.matchId, phaseId: payload.setupId, deadlineToken: payload.deadlineToken },
  ]) await assert.rejects(handler(invalid), failure('Invalid setup deadline task'));
  assert.equal(calls.length, 0);
  await handler(payload); await handler({ ...payload, stage: 'awaiting-ready' });
  assert.deepEqual(calls, [payload, { ...payload, stage: 'awaiting-ready' }]);
});

test('early setup delivery throws retryably rather than acknowledging and dropping the future window', async () => {
  const calls = [];
  const handler = createV1SetupDeadlineHandler({ runSetupDeadline: async given => {
    calls.push(given); return calls.length === 1 ? { status: 'too-early', retryAfterMs: 30_000 } : { status: 'advanced' };
  } });
  await assert.rejects(handler(payload), failure('Setup deadline has not elapsed'));
  await handler(payload);
  assert.deepEqual(calls, [payload, payload], 'Retry preserves the exact setup epoch and token');
});

test('setup task safely rejects failures and malformed outcomes while stale and blocked outcomes are terminal', async () => {
  for (const result of [null, {}, { status: 'failed' }, { status: 'unknown' }, { status: 'advanced', privateRole: 'Alien' },
    { status: 'too-early' }, { status: 'too-early', retryAfterMs: 0 }, { status: 'too-early', retryAfterMs: 0.5 },
    { status: 'too-early', retryAfterMs: Number.MAX_SAFE_INTEGER + 1 }, { status: 'unchanged', retryAfterMs: 1 },
  ]) await assert.rejects(createV1SetupDeadlineHandler({ runSetupDeadline: async () => result })(payload), failure('Setup deadline evaluation unavailable'));
  await assert.rejects(createV1SetupDeadlineHandler({ runSetupDeadline: async () => { throw new Error('private prepared deal'); } })(payload), failure('Setup deadline evaluation unavailable'));
  for (const status of ['advanced', 'unchanged', 'blocked']) await createV1SetupDeadlineHandler({ runSetupDeadline: async () => ({ status }) })(payload);
});

test('registered setup task calls only setup evaluation and preserves safe retry errors', async () => {
  const calls = [];
  const handlers = endpoints({ runSetupDeadline: async given => { calls.push(given); return { status: 'too-early', retryAfterMs: 1 }; },
    runDeadline: async () => assert.fail('Setup cannot fabricate a gameplay deadline'), runPracticeBots: async () => assert.fail('Setup cannot start gameplay bots') });
  await assert.rejects(handlers.value.setupDeadlineTask.run({ data: payload }), failure('Setup deadline has not elapsed'));
  assert.deepEqual(calls, [payload]);
});

test('setup creation trigger skips missing/nonprotocol events and passes current path to the durable dispatcher', async () => {
  const calls = [];
  const handlers = endpoints({ dispatchSetupDeadlineIntent: async (path, enqueue) => { calls.push({ path, enqueue }); return { status: 'dispatched' }; } });
  await handlers.value.dispatchSetupDeadline.run({}); await handlers.value.dispatchSetupDeadline.run(event(1));
  assert.equal(handlers.resolutions(), 0);
  await handlers.value.dispatchSetupDeadline.run(event());
  assert.equal(calls.length, 1); assert.equal(calls[0].path, event().data.ref.path); assert.equal(typeof calls[0].enqueue, 'function');
  assert.equal(handlers.resolutions(), 1);
});

test('setup dispatch refuses malformed or failed outcomes safely and local enqueue never falls back to cloud', async () => {
  for (const result of [null, {}, { status: 'failed' }, { status: 'unknown' }]) {
    const handlers = endpoints({ dispatchSetupDeadlineIntent: async () => result });
    await assert.rejects(handlers.value.dispatchSetupDeadline.run(event()), failure('Setup deadline dispatch unavailable'));
  }
  const thrown = endpoints({ dispatchSetupDeadlineIntent: async () => { throw new Error('private storage diagnostics'); } });
  await assert.rejects(thrown.value.dispatchSetupDeadline.run(event()), failure('Setup deadline dispatch unavailable'));
  for (const status of ['unchanged', 'blocked']) await endpoints({ dispatchSetupDeadlineIntent: async () => ({ status }) }).value.dispatchSetupDeadline.run(event());
  const local = endpoints({ dispatchSetupDeadlineIntent: async (_path, enqueue) => { await enqueue(intent); return { status: 'dispatched' }; } }, { emulator: true });
  await assert.rejects(local.value.dispatchSetupDeadline.run(event()), failure('Setup deadline dispatch unavailable'));
  assert.equal(local.resolutions(), 2, 'The validated local Tasks guard runs before any SDK queue creation');
});

test('setup repair uses a bounded independent page and retries resolved failures instead of silently succeeding', async () => {
  const enqueue = async () => assert.fail('This successful repair stub must not enqueue');
  const calls = [];
  await createV1SetupRepairHandler({ repairSetupOutbox: async (given, options) => { calls.push({ given, options }); return { dispatched: 1, unchanged: 2, failed: 0, blocked: 0, nextCursor: null }; } }, enqueue)();
  assert.deepEqual(calls, [{ given: enqueue, options: { limit: 100 } }]);
  for (const result of [null, {}, { dispatched: 0, unchanged: 0, failed: 1, blocked: 0 },
    { dispatched: 0, unchanged: 0, failed: -1, blocked: 0 }, { dispatched: 0, unchanged: 0, failed: 0.5, blocked: 0 },
    { dispatched: 0, unchanged: 0, failed: 0 },
  ]) await assert.rejects(createV1SetupRepairHandler({ repairSetupOutbox: async () => result }, enqueue)(), failure('Setup deadline repair unavailable'));
  await assert.rejects(createV1SetupRepairHandler({ repairSetupOutbox: async () => { throw new Error('private outbox diagnostics'); } }, enqueue)(), failure('Setup deadline repair unavailable'));
});
