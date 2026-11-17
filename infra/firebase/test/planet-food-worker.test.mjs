import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlanetFoodInboxEnqueuer, createPlanetFoodInboxHandler, isPlanetFoodInboxWake, planetFoodInboxQueueId} from '../dist/planet-food-worker.js';

const fixture = () => ({kind: 'food-inbox', id: 'wake-1', wakeAt: 1_800_000_000_000,
  scope: {version: 'food-inbox-1', matchId: 'match-1', phaseId: 'phase-1', taskId: 'task-1'}});

test('private Food wake rejects malformed and browser-authority fields before enqueue', async () => {
  const valid = fixture(), calls = [];
  const enqueue = createPlanetFoodInboxEnqueuer({enqueue: async (...args) => { calls.push(args); }});
  assert.equal(isPlanetFoodInboxWake(valid), true);
  const invalid = [null, [], {...valid, kind: 'game'}, {...valid, id: ''}, {...valid, uid: 'player-1'},
    {...valid, ownerEpoch: 1}, {...valid, wakeAt: -1}, {...valid, wakeAt: Infinity},
    {...valid, wakeAt: 1.5}, {...valid, wakeAt: Number.MAX_SAFE_INTEGER},
    {...valid, scope: {...valid.scope, version: 'food-inbox-2'}},
    {...valid, scope: {...valid.scope, taskId: ''}},
    {...valid, scope: {...valid.scope, owner: 'browser-selected'}},
    {...valid, scope: {version: 'food-inbox-1', matchId: 'match-1', taskId: 'task-1'}}];
  for (const value of invalid) {
    assert.equal(isPlanetFoodInboxWake(value), false);
    await assert.rejects(enqueue(value), /Invalid private Food wake/);
  }
  assert.equal(calls.length, 0);
});

test('queue identity preserves exact wake scope and is independent of object-key order', () => {
  const wake = fixture(), id = planetFoodInboxQueueId(wake);
  assert.match(id, /^food-inbox-[a-f0-9]{64}$/);
  assert.equal(planetFoodInboxQueueId({scope: {taskId: 'task-1', phaseId: 'phase-1', matchId: 'match-1', version: 'food-inbox-1'},
    wakeAt: wake.wakeAt, id: 'wake-1', kind: 'food-inbox'}), id);
  for (const changed of [{...wake, id: 'wake-2'}, {...wake, wakeAt: wake.wakeAt + 1},
    ...['matchId', 'phaseId', 'taskId'].map(key => ({...wake, scope: {...wake.scope, [key]: 'different'}}))]) {
    assert.notEqual(planetFoodInboxQueueId(changed), id);
  }
});

test('dispatch uses the exact saved time and a detached private payload', async () => {
  const wake = fixture(), saved = structuredClone(wake), calls = [];
  const enqueue = createPlanetFoodInboxEnqueuer({enqueue: async (...args) => { calls.push(args); }});
  await enqueue(wake);
  wake.scope.taskId = 'changed-after-dispatch';
  assert.deepEqual(calls[0][0], saved);
  assert.equal(calls[0][1].id, planetFoodInboxQueueId(saved));
  assert.equal(calls[0][1].scheduleTime.getTime(), saved.wakeAt);
});

test('only the provider already-exists result completes duplicate dispatch', async () => {
  for (const code of [6, 'ALREADY_EXISTS', 'functions/task-already-exists']) {
    const enqueue = createPlanetFoodInboxEnqueuer({enqueue: async () => { throw {code}; }});
    await enqueue(fixture());
  }
  for (const failure of [new Error('network outcome unknown'), {code: 14}, {code: '6'}, {code: 'PERMISSION_DENIED'}, null]) {
    const enqueue = createPlanetFoodInboxEnqueuer({enqueue: async () => { throw failure; }});
    await assert.rejects(enqueue(fixture()), error => error === failure);
  }
});

test('the private handler waits for worker completion and rejects failed work for retry', async () => {
  const run = Promise.withResolvers(), calls = [];
  let returned = false;
  const handle = createPlanetFoodInboxHandler({runFoodInbox: async wake => { calls.push(wake); await run.promise; }});
  await assert.rejects(handle({...fixture(), owner: 'forged'}), /Invalid private Food wake/);
  assert.equal(calls.length, 0);
  const wake = fixture(), pending = handle(wake).then(() => { returned = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(returned, false);
  assert.deepEqual(calls, [wake]);
  run.resolve();
  await pending;
  assert.equal(returned, true);
  const fail = createPlanetFoodInboxHandler({runFoodInbox: async () => { throw new Error('sensitive worker details'); }});
  await assert.rejects(fail(wake), error => error.message === 'Planet Food worker unavailable');
});
