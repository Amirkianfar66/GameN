import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { deadlineTaskId } from '@mothership/game-api';
import { createDeadlineEnqueuer, createTrustedDeadlineHandler } from '../dist/tasks.js';

function intent() {
  const matchId = 'match-a', phaseId = 'phase-a', deadlineToken = 'deadline-a';
  return { matchId, phaseId, deadlineToken, taskId: deadlineTaskId(matchId, phaseId, deadlineToken), endsAt: 1_800_000_060_000, status: 'pending' };
}

test('deadline adapter enqueues only the phase/token envelope with a stable ID and absolute schedule', async () => {
  const calls = [];
  const enqueue = createDeadlineEnqueuer({ enqueue: async (data, options) => { calls.push({ data, options }); } });
  const effect = intent();
  await enqueue(effect);
  await enqueue(effect);
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.deepEqual(call.data, { matchId: effect.matchId, phaseId: effect.phaseId, deadlineToken: effect.deadlineToken });
    assert.equal(call.options.id, effect.taskId);
    assert.equal(call.options.scheduleTime.getTime(), effect.endsAt);
  }
});

test('duplicate task acknowledgements succeed while other enqueue failures remain repairable', async () => {
  for (const code of ['functions/task-already-exists', 'ALREADY_EXISTS', 6]) {
    const enqueue = createDeadlineEnqueuer({ enqueue: async () => { throw { code }; } });
    await assert.doesNotReject(enqueue(intent()));
  }
  const outage = new Error('Queue unavailable');
  const enqueue = createDeadlineEnqueuer({ enqueue: async () => { throw outage; } });
  await assert.rejects(enqueue(intent()), error => error === outage);
});

test('invalid deadline identity or time is never sent to the external queue', async () => {
  let calls = 0;
  const enqueue = createDeadlineEnqueuer({ enqueue: async () => { calls++; } });
  for (const override of [{ taskId: 'wrong-id' }, { matchId: '../escape' }, { endsAt: Number.NaN }, { endsAt: -1 }, { endsAt: Number.MAX_SAFE_INTEGER }]) {
    await assert.rejects(enqueue({ ...intent(), ...override }), /Invalid durable deadline intent/);
  }
  assert.equal(calls, 0);
});

test('trusted deadline handler validates the exact private envelope before delegation', async () => {
  const calls = [];
  const handler = createTrustedDeadlineHandler({ runDeadline: async payload => {
    calls.push(payload);
    return { protocolVersion: 1, matchId: payload.matchId, phaseId: payload.phaseId, serverTimeMs: 1, result: 'unchanged' };
  } });
  const payload = { matchId: 'match-a', phaseId: 'phase-a', deadlineToken: 'deadline-a' };
  for (const invalid of [null, [], {}, { ...payload, actorUid: 'untrusted' }, { ...payload, deadlineToken: '../escape' }, { matchId: 'match-a', phaseId: 'phase-a' }]) {
    await assert.rejects(handler(invalid), /Invalid deadline task payload/);
  }
  assert.equal(calls.length, 0);
  await handler(payload);
  assert.deepEqual(calls, [payload]);
});

test('trusted deadline handler acknowledges advanced/stale jobs and makes evaluation failure retryable without secrets', async () => {
  const payload = { matchId: 'match-a', phaseId: 'phase-a', deadlineToken: 'deadline-a' };
  for (const result of ['advanced', 'unchanged']) {
    const handler = createTrustedDeadlineHandler({ runDeadline: async () => ({ protocolVersion: 1, matchId: payload.matchId, phaseId: payload.phaseId, serverTimeMs: 1, result }) });
    await assert.doesNotReject(handler(payload));
  }
  for (const code of ['UNAVAILABLE', 'UNSUPPORTED_PROTOCOL']) {
    const handler = createTrustedDeadlineHandler({ runDeadline: async () => ({ ok: false, serverTimeMs: 1, error: { code } }) });
    await assert.rejects(handler(payload), error => error.message === (code === 'UNSUPPORTED_PROTOCOL' ? 'Deadline pinned version unsupported' : 'Deadline evaluation unavailable'));
  }
  const handler = createTrustedDeadlineHandler({ runDeadline: async () => { throw new Error('Private state and credentials'); } });
  await assert.rejects(handler(payload), error => error.message === 'Deadline evaluation unavailable');
});

test('SDK deadline export retains the private invoker deployment declaration', async () => {
  const app = initializeApp({ projectId: 'demo-mothership' }, 'task-metadata-test');
  try {
    const { deadlineTask } = await import('../dist/index.js');
    assert.equal(deadlineTask.__endpoint.platform, 'gcfv2');
    assert.deepEqual(deadlineTask.__endpoint.region, ['us-central1']);
    assert.deepEqual(deadlineTask.__endpoint.taskQueueTrigger.invoker, ['private']);
    assert.equal(deadlineTask.__endpoint.taskQueueTrigger.retryConfig.maxAttempts, 5);
  } finally {
    await getFirestore(app).terminate();
    await deleteApp(app);
  }
});
