import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createV1RepairHandler, createV1Entrypoints } from '../dist/v1.js';

const enqueue = async () => assert.fail('A repair result stub must not invoke a queue');
const success = { dispatched: 2, unchanged: 3, failed: 0, blocked: 1, nextCursor: 'bounded-next-page' };
test('gameplay repair processes one bounded page and leaves leased or later pages for subsequent invocations', async () => {
  const calls = [];
  await createV1RepairHandler({ repairOutbox: async (given, options) => { calls.push({ given, options }); return success; } }, enqueue)();
  assert.deepEqual(calls, [{ given: enqueue, options: { limit: 100 } }]);
});
test('gameplay repair throws retryably for failed work or unavailable storage instead of reporting healthy Scheduler success', async () => {
  await assert.rejects(createV1RepairHandler({ repairOutbox: async () => ({ ...success, failed: 1 }) }, enqueue)(), /^Error: Deadline repair unavailable$/);
  await assert.rejects(createV1RepairHandler({ repairOutbox: async () => { throw new Error('private storage diagnostics'); } }, enqueue)(), /^Error: Deadline repair unavailable$/);
});
test('gameplay repair rejects malformed counters but does not treat an active lease as lost work', async () => {
  for (const result of [null, {}, ...['dispatched','unchanged','failed','blocked'].flatMap(key =>
    [-1,0.5,NaN,Number.MAX_SAFE_INTEGER+1,undefined].map(value => ({ ...success, [key]: value })))]) {
    await assert.rejects(createV1RepairHandler({ repairOutbox: async () => result }, enqueue)(), /^Error: Deadline repair unavailable$/);
  }
  await createV1RepairHandler({ repairOutbox: async () => ({ dispatched: 0, unchanged: 0, failed: 0, blocked: 1 }) }, enqueue)();
});
test('registered scheduled gameplay repair surfaces a resolved failure without changing scheduling or invoking cloud queues', async () => {
  const calls = [];
  const endpoints = createV1Entrypoints(() => ({ app: {}, configuration: {}, service: {
    repairOutbox: async (_enqueue, options) => { calls.push(options); return { ...success, failed: 1 }; },
  } }));
  assert.equal(endpoints.repairDeadlines.__endpoint.scheduleTrigger.schedule, 'every 1 minutes');
  await assert.rejects(endpoints.repairDeadlines.run({}), /^Error: Deadline repair unavailable$/);
  assert.deepEqual(calls, [{ limit: 100 }]);
});
