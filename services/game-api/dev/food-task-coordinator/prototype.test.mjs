import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {test} from 'node:test';
import {setTimeout as sleep} from 'node:timers/promises';
import {createLoopbackFoodStore} from './firestore.mjs';
import {createFoodTaskCoordinator} from './coordinator.mjs';
import {envelope, seedTwoHumanTask} from './fixture.mjs';
import {runNativeFoodWorkersThrough} from '../../test/planet-food-native-service-control.mjs';
import {chooseFoodBotInput} from '../../dist/food-bot-policy.js';

const contextOf = ({command: _command, ...context}) => context;
const key = (taskId, suffix) => `prototypeFoodTask/${taskId}/${suffix}`;
const entry = (taskId, n) => key(taskId, `entry/${String(n).padStart(16, '0')}`);
const read = (store, path) => store.readOnly(tx => tx.get(path));
async function until(check) {
  for (let i = 0; i < 100; i++) {
    if (check()) return;
    await sleep(20);
  }
  assert.fail('Expected a subscribed frame');
}
function deadlineOf(store, taskId) {
  return read(store, key(taskId, 'state'));
}

for (const admissionMode of ['shared-cursor', 'owner-fifo']) test(`seven-player, two-human Food Task with ${admissionMode} ingress, takeover and audience push`, {timeout: 60000}, async t => {
  const store = createLoopbackFoodStore();
  const subscriptions = [];
  t.after(async () => { for (const unsubscribe of subscriptions) unsubscribe(); await store.close(); });
  const {h, session, task, winch, panel} = await seedTwoHumanTask(store);
  const start = task.options.startedAt;
  let time = start, loseNextAdmission = false;
  const measured = {...store, async transaction(action) {
    let appended = false;
    const result = await store.transaction(tx => action({...tx, set(path, value) {
      if (path.startsWith('prototypeFoodTask/') && path.includes('/entry/')) appended = true;
      tx.set(path, value);
    }}));
    if (appended && loseNextAdmission) {
      loseNextAdmission = false;
      throw new Error('lost admission acknowledgement');
    }
    return result;
  }};
  const c = createFoodTaskCoordinator({store: measured, admissionMode, clock: () => time, randomSamples: () => Array(64).fill(.2)});
  const taskId = await c.openTask({session});
  let owner = await c.acquire(taskId, randomUUID());
  assert.equal(owner.epoch, 1);
  const frames = [], privateFrames = [], errors = [];
  subscriptions.push(c.subscribe(taskId, h.display, frame => frames.push(frame), error => errors.push(error)));
  const stopWinch = c.subscribe(taskId, winch, frame => privateFrames.push(frame), error => errors.push(error));
  subscriptions.push(stopWinch);
  await until(() => frames.length && privateFrames.length);
  const initialFrame = privateFrames[0];
  const headZero = await c.restore(taskId, owner);
  assert.equal(headZero.pending, 0);
  assert.equal(initialFrame.playerView.participantTask.selfControl, 'WINCH');
  assert.ok(initialFrame.ordinaryPlayerView);
  assert.equal(frames[0].playerView, null);
  assert.equal(frames[0].ordinaryPlayerView, null);
  assert.equal((await c.snapshot(taskId, h.players.find(uid => uid !== winch && uid !== panel))).playerView.participantTask, null);
  await assert.rejects(c.snapshot(taskId, 'unknown'), {code: 'FORBIDDEN'});
  assert.deepEqual(await c.clockSample(taskId, winch), {receivedAt: start, serverTimeMs: start});
  assert.deepEqual(await c.restore(taskId, owner), headZero, 'delivery and calibration append neither input nor presence');

  // Contact at original admitted time, even when the owner has not processed it.
  for (const offset of [1500, 2800, 4000]) {
    time = start + offset;
    await Promise.all([c.heartbeat(taskId, winch), c.heartbeat(taskId, panel)]);
    await c.runDue(taskId, owner);
  }
  const live = (await c.snapshot(taskId, winch)).playerView;
  assert.equal(live.participantTask.stage, 'ACTIVE');
  const view = live.participantTask;
  const hold = edge => ({type: 'TASK_PRESS', taskId, controlSessionId: view.controlSessionId,
    expectedControlRevision: view.controlRevision, input: {kind: 'HOLD', edge, gestureSequence: 1, crateId: view.crate.id}});
  const down = envelope(live, hold('DOWN'));
  const up = envelope(live, hold('UP'));
  const publicBefore = frames.length;
  // UP goes through while the original DOWN acknowledgement is unknown. UP first
  // tests the engine's exact close-before-DOWN tombstone, rather than host order.
  const provisionalUp = await c.submit(taskId, winch, up);
  assert.equal(provisionalUp.phase, 'durably-admitted');
  assert.equal('receipt' in provisionalUp, false);
  loseNextAdmission = true;
  await assert.rejects(c.submit(taskId, winch, down), /lost admission acknowledgement/);
  assert.equal((await c.receipt(taskId, winch, contextOf(down))).phase, 'durably-admitted');
  assert.equal((await c.submit(taskId, winch, down)).duplicate, true);
  await assert.rejects(c.submit(taskId, winch, {...down,command: hold('UP')}), {code: 'COMMAND_ID_CONFLICT'});
  assert.equal(await c.receipt(taskId, panel, contextOf(down)), null);
  assert.equal(await c.receipt(taskId, winch, {...contextOf(down), round: 2}), null);

  const reached = Promise.withResolvers(), switched = Promise.withResolvers();
  const oldOwner = owner;
  const frozen = c.runDue(taskId, oldOwner, {beforeCommit: async () => { reached.resolve(); await switched.promise; }});
  void frozen.catch(() => {});
  try {
    await reached.promise;
    time++;
    const beforePause = await c.restore(taskId, owner);
    const received = await c.heartbeat(taskId, panel);
    assert.equal(received.admittedAt, time);
    const whilePaused = await c.restore(taskId, owner);
    assert.equal(whilePaused.processed, beforePause.processed);
    assert.equal(whilePaused.pending, beforePause.pending + 1);
    assert.equal(await c.acquire(taskId, randomUUID()), null);
    time = owner.expiresAt;
    const replacement = createFoodTaskCoordinator({store, admissionMode, clock: () => time});
    owner = await replacement.acquire(taskId, randomUUID());
    assert.equal(owner.epoch, 2);
    if (admissionMode === 'owner-fifo') await assert.rejects(c.heartbeat(taskId, winch), {code: 'STALE_OWNER'});
    assert.equal((await replacement.restore(taskId, owner)).pending, whilePaused.pending);
    await replacement.runDue(taskId, owner);
  } finally { switched.resolve(); }
  await assert.rejects(frozen, {code: 'STALE_OWNER'});
  const [upResult, downResult] = await Promise.all([c.receipt(taskId, winch, contextOf(up)), c.receipt(taskId, winch, contextOf(down))]);
  assert.equal(upResult.phase, 'applied');
  assert.equal(downResult.phase, 'applied');
  assert.equal(downResult.receipt.receivedAt, start + 4000);
  assert.equal(downResult.receipt.code ?? downResult.receipt.result?.effect, 'GESTURE_CLOSED');
  const permuted = Object.fromEntries(Object.entries(contextOf(down)).reverse());
  assert.deepEqual(await c.receipt(taskId, winch, permuted), downResult);
  assert.equal(frames.length, publicBefore, 'private holds and presence do not tick the public stream');
  assert.equal((await c.snapshot(taskId, winch)).playerView.participantTask.crate.state, 'INTAKE');
  stopWinch();
  const reconnected = [];
  subscriptions.push(c.subscribe(taskId, winch, frame => reconnected.push(frame), error => errors.push(error)));
  await until(() => reconnected.length);
  assert.equal(reconnected[0].frameSequence, 1);
  assert.notEqual(reconnected[0].frameEpoch, initialFrame.frameEpoch);
  assert.equal(reconnected[0].playerView.seatId, initialFrame.playerView.seatId);

  // Advance to the exact disconnect grace and fixed return, with a new owner
  // whenever the technical lease expires. A later receipt remains recoverable.
  for (const at of [start + 14000, start + 22000, task.returnsAt]) {
    time = at;
    owner = await c.acquire(taskId, owner.id);
    await c.runDue(taskId, owner);
  }
  const saved = await read(store, key(taskId, 'returned-result'));
  assert.equal(saved.state.phase.kind, 'PRE_TURN');
  assert.equal(saved.returnedAt, task.returnsAt);
  await c.runDue(taskId, owner);
  assert.deepEqual(await read(store, key(taskId, 'returned-result')), saved);
  assert.deepEqual(await c.receipt(taskId, winch, contextOf(down)), downResult);
  assert.equal((await deadlineOf(store, taskId)).state.food.completedThroughRound, 1);
  assert.equal((await read(store, entry(taskId, headZero.processed + 1))).context.now, start + 1500);
  assert.deepEqual(errors, []);
  assert.ok(frames.every((frame, i) => frame.frameSequence === i + 1));
});

test('the same authoritative input times deliver the same Food result once in both durable runtimes', {timeout: 90000}, async t => {
  const store = createLoopbackFoodStore();
  t.after(() => store.close());
  const {h, session, task, winch, panel} = await seedTwoHumanTask(store);
  const start = task.options.startedAt, taskId = task.options.taskId;
  let time = start;
  const c = createFoodTaskCoordinator({store, admissionMode: 'owner-fifo', clock: () => time, randomSamples: () => Array(64).fill(.2)});
  await c.openTask({session});
  const ownerId = randomUUID();
  let owner = await c.acquire(taskId, ownerId);
  let nextContact = start + 1000, at = nextContact, completed = false;
  const inputKinds = [];
  for (let pass = 0; pass < 120; pass++) {
    time = at;
    if (at >= owner.expiresAt - 1000) owner = await c.acquire(taskId, ownerId);
    await runNativeFoodWorkersThrough(h, at);
    h.setTime(at);
    await c.runDue(taskId, owner);
    if (at >= nextContact) {
      for (const uid of [winch, panel]) {
        const beat = await h.invoke(uid, 'foodHeartbeat', {matchId: h.matchId, taskId});
        assert.equal(beat.ok, true);
        assert.equal((await c.heartbeat(taskId, uid)).admittedAt, at);
      }
      await c.runDue(taskId, owner);
      nextContact = at + 1000;
    }
    let nextBot = Infinity;
    for (const uid of [winch, panel]) {
      const original = (await h.read(uid)).foodPlayerView, proposed = (await c.snapshot(taskId, uid)).playerView;
      assert.deepEqual(proposed.participantTask, original.participantTask);
      const policy = chooseFoodBotInput(original);
      assert.deepEqual(chooseFoodBotInput(proposed), policy);
      if (policy.nextWakeAt !== null) nextBot = Math.min(nextBot, policy.nextWakeAt);
      if (!policy.command) continue;
      const request = envelope(original, policy.command);
      const baseline = await h.invoke(uid, 'foodCommand', {request});
      const admitted = await c.submit(taskId, uid, request);
      assert.equal(admitted.admittedAt, at);
      await c.runDue(taskId, owner);
      const alternative = await c.receipt(taskId, uid, contextOf(request));
      assert.equal(baseline.ok, true);
      assert.equal(baseline.result.receipt.status, 'accepted');
      assert.deepEqual(alternative.receipt, baseline.result.receipt);
      inputKinds.push(policy.command.input.edge ?? policy.command.input.kind);
    }
    const after = (await c.snapshot(taskId, panel)).playerView.participantTask;
    if (after.outcome) {
      assert.equal(after.outcome.kind, 'DELIVERED');
      completed = true;
      break;
    }
    const existing = (await h.current()).foodService.scheduler?.endsAt ?? Infinity;
    const expected = (await c.restore(taskId, owner)).nextAt ?? Infinity;
    at = Math.max(at + 1, Math.min(nextBot, existing, expected, nextContact));
  }
  assert.equal(completed, true);
  assert.deepEqual(inputKinds, ['DOWN', 'PANEL_RELEASE', 'PANEL_LOCK', 'UP', 'KEY', 'KEY']);
  await runNativeFoodWorkersThrough(h, task.returnsAt);
  time = task.returnsAt;
  owner = await c.acquire(taskId, ownerId);
  await c.runDue(taskId, owner);
  const result = await read(store, key(taskId, 'returned-result'));
  const baseline = (await h.current()).state;
  const currentFood = state => state.worlds[state.currentWorldId].food;
  assert.deepEqual(currentFood(result.state), currentFood(baseline));
  assert.deepEqual(currentFood(result.state).deliveredTaskIds, [taskId]);
  assert.equal(currentFood(result.state).doses, 20);
  assert.equal(result.returnedAt, baseline.phase.startedAt);
  await c.runDue(taskId, owner);
  assert.deepEqual(await read(store, key(taskId, 'returned-result')), result);
});
