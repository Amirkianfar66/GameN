import assert from 'node:assert/strict';
import test from 'node:test';
import { createV1DeadlineHandler, createV1Entrypoints } from '../dist/v1.js';

// Private gameplay-task acceptance: early delivery must remain retryable, while
// completed/stale work is acknowledged. No SDK initialization, ports or clocks
// are started here; the actual Functions registration delegates to stub services.
const PAYLOAD = Object.freeze({ matchId: 'deadline-match', phaseId: 'deadline-phase', deadlineToken: 'deadline-token' });
const PRIVATE = 'private-role-and-recovery-evidence';
const success = (result = 'advanced') => ({ protocolVersion: 2, matchId: PAYLOAD.matchId,
  phaseId: PAYLOAD.phaseId, serverTimeMs: 123_456, result });
const safeError = expected => error => {
  assert.equal(error.message, expected);
  assert.equal(error.message.includes(PRIVATE), false);
  return true;
};
function serviceFor(runDeadline) {
  const calls = [];
  return { calls, service: {
    runDeadline: async payload => { calls.push({ kind: 'deadline', payload }); return runDeadline(payload); },
    runPracticeBots: async (matchId, options) => {
      calls.push({ kind: 'bots', matchId, options }); return { status: 'unchanged', processed: 0 };
    },
  } };
}
function registered(service) {
  let resolutions = 0;
  const endpoints = createV1Entrypoints(() => {
    resolutions++;
    return { service, app: undefined, configuration: {} };
  });
  assert.equal(resolutions, 0, 'Export discovery must not resolve a runtime or initialize SDKs');
  return { task: endpoints.deadlineTask, resolutions: () => resolutions };
}

test('an early gameplay task throws without bots, then the same task advances and stale retries still drain bounded bots', async () => {
  const outcomes = [{ status: 'too-early', retryAfterMs: 60_000 },
    { status: 'too-early', retryAfterMs: 1 }, success('advanced'), success('unchanged')];
  const h = serviceFor(async payload => {
    assert.deepEqual(payload, PAYLOAD);
    return outcomes.shift();
  });
  const handler = createV1DeadlineHandler(h.service);
  for (let attempt = 0; attempt < 2; attempt++) {
    await assert.rejects(handler(PAYLOAD), safeError('Deadline has not elapsed'));
    assert.equal(h.calls.filter(call => call.kind === 'bots').length, 0);
  }
  await handler(PAYLOAD);
  await handler(PAYLOAD);
  assert.equal(outcomes.length, 0);
  assert.deepEqual(h.calls.map(call => call.kind), ['deadline', 'deadline', 'deadline', 'bots', 'deadline', 'bots']);
  assert.deepEqual(h.calls.filter(call => call.kind === 'deadline').map(call => call.payload),
    [PAYLOAD, PAYLOAD, PAYLOAD, PAYLOAD], 'Retries preserve the phase/token identity');
  assert.deepEqual(h.calls.filter(call => call.kind === 'bots'), Array.from({ length: 2 }, () =>
    ({ kind: 'bots', matchId: PAYLOAD.matchId, options: { limit: 18 } })));
});

const malformed = [
  ['null result', null], ['missing result', undefined], ['array result', []], ['string result', PRIVATE],
  ['empty result', {}], ['legacy partial unchanged', { result: 'unchanged' }],
  ['missing early delay', { status: 'too-early' }],
  ['zero early delay', { status: 'too-early', retryAfterMs: 0 }],
  ['negative early delay', { status: 'too-early', retryAfterMs: -1 }],
  ['fractional early delay', { status: 'too-early', retryAfterMs: 0.5 }],
  ['unsafe early delay', { status: 'too-early', retryAfterMs: Number.MAX_SAFE_INTEGER + 1 }],
  ['nonfinite early delay', { status: 'too-early', retryAfterMs: Infinity }],
  ['NaN early delay', { status: 'too-early', retryAfterMs: NaN }],
  ['string early delay', { status: 'too-early', retryAfterMs: '1000' }],
  ['extra private early fields', { status: 'too-early', retryAfterMs: 1000, privateRole: PRIVATE }],
  ['mixed early/public envelope', { ...success(), status: 'too-early', retryAfterMs: 1000 }],
  ['unrecognized private status', { status: 'failed', retryAfterMs: 1000 }],
  ['public response with extra private fields', { ...success(), privateRole: PRIVATE }],
  ['public response with early delay', { ...success('unchanged'), retryAfterMs: 1000 }],
  ['public response without match', { protocolVersion: 2, phaseId: PAYLOAD.phaseId, serverTimeMs: 123, result: 'advanced' }],
  ['public response without phase', { protocolVersion: 2, matchId: PAYLOAD.matchId, serverTimeMs: 123, result: 'unchanged' }],
  ['public response for a different match', { ...success(), matchId: 'different-match' }],
  ['public response for a different phase', { ...success('unchanged'), phaseId: 'different-phase' }],
  ['wrong protocol', { ...success(), protocolVersion: 1 }],
  ['negative server time', { ...success(), serverTimeMs: -1 }],
  ['unrecognized public result', { ...success(), result: 'too-early' }],
  ['typed service failure', { ok: false, serverTimeMs: 123, error: { code: 'UNAVAILABLE' } }],
];
for (const [label, outcome] of malformed) {
  test(`gameplay deadline rejects ${label} with a sanitized retry error before bots`, async () => {
    const h = serviceFor(async () => outcome);
    await assert.rejects(createV1DeadlineHandler(h.service)(PAYLOAD), safeError('Deadline evaluation unavailable'));
    assert.deepEqual(h.calls.map(call => call.kind), ['deadline']);
  });
}

test('gameplay deadline sanitizes a thrown service exception and skips bots', async () => {
  const h = serviceFor(async () => { throw new Error(PRIVATE); });
  await assert.rejects(createV1DeadlineHandler(h.service)(PAYLOAD), safeError('Deadline evaluation unavailable'));
  assert.deepEqual(h.calls.map(call => call.kind), ['deadline']);
});

test('malformed task identity is rejected before invoking the deadline service', async () => {
  const h = serviceFor(async () => assert.fail('Invalid task must not evaluate state'));
  const handler = createV1DeadlineHandler(h.service);
  for (const input of [null, [], {}, { ...PAYLOAD, now: 123 }, { ...PAYLOAD, uid: PRIVATE },
    { ...PAYLOAD, deadlineToken: '' }, { ...PAYLOAD, matchId: '../match' }, { ...PAYLOAD, phaseId: 'phase/child' }]) {
    await assert.rejects(handler(input), safeError('Invalid deadline task'));
  }
  assert.deepEqual(h.calls, []);
});

test('the registered private gameplay task retries early delivery and delegates due/stale work lazily', async () => {
  const outcomes = [{ status: 'too-early', retryAfterMs: 1 }, success('advanced'), success('unchanged')];
  const h = serviceFor(async payload => { assert.deepEqual(payload, PAYLOAD); return outcomes.shift(); });
  const e = registered(h.service), metadata = e.task.__endpoint;
  assert.deepEqual(metadata.region, ['us-central1']);
  assert.deepEqual(metadata.taskQueueTrigger.invoker, ['private']);
  assert.equal(metadata.taskQueueTrigger.retryConfig.maxAttempts, 10);
  assert.equal(metadata.taskQueueTrigger.retryConfig.minBackoffSeconds, 1);
  assert.equal(metadata.taskQueueTrigger.retryConfig.maxBackoffSeconds, 60);
  assert.equal(metadata.httpsTrigger, undefined);
  await assert.rejects(e.task.run({ data: PAYLOAD }), safeError('Deadline has not elapsed'));
  assert.deepEqual(h.calls.map(call => call.kind), ['deadline']);
  await e.task.run({ data: PAYLOAD });
  await e.task.run({ data: PAYLOAD });
  assert.equal(e.resolutions(), 3);
  assert.deepEqual(h.calls.map(call => call.kind), ['deadline', 'deadline', 'bots', 'deadline', 'bots']);
});

test('the registered task preserves safe failure handling and never runs bots for invalid outcomes', async () => {
  const h = serviceFor(async () => ({ ...success(), privateRole: PRIVATE }));
  const e = registered(h.service);
  await assert.rejects(e.task.run({ data: PAYLOAD }), safeError('Deadline evaluation unavailable'));
  assert.deepEqual(h.calls.map(call => call.kind), ['deadline']);
  await assert.rejects(e.task.run({ data: { ...PAYLOAD, force: true } }), safeError('Invalid deadline task'));
  assert.deepEqual(h.calls.map(call => call.kind), ['deadline']);
  assert.equal(e.resolutions(), 2);
});

test('bot failure after a committed deadline retries the same task and can resume through its stale response', async () => {
  let deadlines = 0, botCalls = 0;
  const handler = createV1DeadlineHandler({
    runDeadline: async payload => { assert.deepEqual(payload, PAYLOAD); return success(++deadlines === 1 ? 'advanced' : 'unchanged'); },
    runPracticeBots: async (matchId, options) => {
      assert.equal(matchId, PAYLOAD.matchId); assert.deepEqual(options, { limit: 18 });
      return ++botCalls === 1 ? { status: 'failed', processed: 0 } : { status: 'unchanged', processed: 0 };
    },
  });
  await assert.rejects(handler(PAYLOAD), safeError('Practice bot evaluation unavailable'));
  await handler(PAYLOAD);
  assert.equal(deadlines, 2); assert.equal(botCalls, 2);
});
