import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {createFoodApplySignal} from '../dev/phone/food-coordinator/bridge.mjs';
import {foodRenderEffect} from '../dev/phone/food-coordinator/observe.mjs';
import {createFoodFrameGate, createFoodPushSession} from '../dev/phone/food-coordinator/push.mjs';
import {createFoodTrialTrace} from '../dev/phone/food-coordinator/trace.mjs';

const {cases} = JSON.parse(readFileSync(new URL('../dev/phone/food/native-fixtures.json', import.meta.url)));
function packet(id = 'food-panel-03') {
  const record = cases.find(row => row.id === id).native.initial;
  return {phase: 'published', serverTimeMs: record.now, fresh: true, publicView: record.value.foodPublicView,
    playerView: record.value.foodPlayerView, ordinaryPlayerView: record.value.playerView};
}
const ready = packet();
const binding = {uid: 'local-test', matchId: ready.playerView.matchId, seatId: ready.playerView.seatId,
  taskId: ready.playerView.participantTask.taskId};
const frame = (frameEpoch, frameSequence, view = ready) => ({...view, frameEpoch, frameSequence});
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return {promise, resolve};
};
const flush = () => new Promise(resolve => setImmediate(resolve));

test('display accepts only the new subscription, ordered epoch, complete bound projection and current revision', () => {
  const gate = createFoodFrameGate(binding), first = gate.open();
  assert.ok(gate.accept(first, frame('first', 1)).packet);
  assert.deepEqual(gate.accept(first, frame('first', 1)), {discard: 'sequence'});
  assert.deepEqual(gate.accept(first, frame('other', 2)), {discard: 'epoch'});
  assert.deepEqual(gate.accept(first, frame('first', 2, packet('food-panel-02'))), {discard: 'revision'});
  assert.deepEqual(gate.accept(first, frame('first', 3, {...ready, playerView: {...ready.playerView, seatId: 'seat-8'}})),
    {error: 'authorization'});
  assert.deepEqual(gate.snapshot(first, {...ready, serverTimeMs: ready.serverTimeMs + 1}), {error: 'authorization'});
  gate.close();
  assert.deepEqual(gate.accept(first, frame('first', 4)), {discard: 'generation'});
  const second = gate.open();
  assert.ok(gate.accept(second, frame('second', 1)).packet);
  assert.deepEqual(gate.accept(first, frame('first', 5)), {discard: 'generation'});
  const otherTask = createFoodFrameGate({...binding, taskId: 'other-task'});
  assert.deepEqual(otherTask.snapshot(otherTask.open(), ready), {error: 'authorization'});
});

test('push uses new clock pairs after hide and can refresh freshness without changing the view body', async () => {
  const sources = [], samples = [], published = [], failures = [], requests = [];
  let now = 0, snapshot = ready;
  const heartbeatPending = deferred();
  const encoder = new TextEncoder();
  const send = (index, value) => sources[index].enqueue(encoder.encode('data: ' + JSON.stringify(value) + '\n\n'));
  const session = createFoodPushSession({binding,
    ports: {clock: {now: () => now}, scheduler: {setTimeout: () => 1, clearTimeout() {}}},
    request(route) {
      requests.push(route);
      if (route === 'heartbeat') return heartbeatPending.promise;
      if (route === 'clock') { const sample = deferred(); samples.push(sample); return sample.promise; }
      if (route === 'snapshot') return Promise.resolve(snapshot);
      assert.equal(route, 'frames');
      const body = new ReadableStream({start(controller) { sources.push(controller); }});
      return Promise.resolve(new Response(body, {headers: {'content-type': 'text/event-stream'}}));
    },
  });
  const transport = session.gameTransport();
  transport.listen(binding, {snapshot: value => published.push(value), error: kind => failures.push(kind)});
  try {
    session.setVisible(true);
    send(0, frame('one', 1));
    await flush();
    assert.equal(published.length, 0, 'A pushed stamp alone cannot calibrate the clock');
    session.setVisible(false);
    assert.deepEqual(transport.readClock(), {status: 'unsynced'});
    session.setVisible(true);
    now = 6;
    samples[0].resolve({receivedAt: 42, serverTimeMs: 42});
    send(0, frame('one', 2));
    send(1, frame('two', 1));
    await flush();
    assert.equal(transport.readClock().status, 'unsynced');
    assert.equal(published.length, 0);
    samples[1].resolve({receivedAt: ready.serverTimeMs, serverTimeMs: ready.serverTimeMs});
    await flush();
    assert.equal(published.length, 1);
    assert.equal(transport.readClock().serverNowMs, ready.serverTimeMs + 3);
    assert.equal(session.report().drops.generation, 1);
    assert.equal(requests.filter(route => route === 'heartbeat').length, 2, 'Previous presence holds no new visibility lane');

    snapshot = {...ready, fresh: false};
    session.foodTransport().refresh();
    await flush();
    assert.equal(failures.at(-1), 'network');
    assert.equal(published.length, 1);
    snapshot = ready;
    session.foodTransport().refresh();
    await flush();
    assert.equal(published.length, 2);
    assert.equal(published[1].food.playerView.viewRevision, published[0].food.playerView.viewRevision);
    assert.equal(session.report().refreshes, 2);

    const oldSnapshot = deferred();
    snapshot = oldSnapshot.promise;
    session.foodTransport().refresh();
    send(1, frame('two', 2));
    await flush();
    const errorsBeforeOldReply = failures.length;
    oldSnapshot.resolve({...ready, fresh: false});
    await flush();
    assert.equal(session.report().drops.supersededSnapshot, 1);
    assert.equal(failures.length, errorsBeforeOldReply);
    assert.equal(published.length, 3);
  } finally {
    session.dispose();
    for (const source of sources) source.close();
    heartbeatPending.resolve(null);
    await flush();
  }
});

test('input, verified original receipt and authority paint have separate clocks and witnesses', async () => {
  let now = 100;
  const trace = createFoodTrialTrace({now: () => now, timeOriginMs: 900, seatId: binding.seatId});
  const input = trace.input({kind: 'PANEL_RELEASE', eventType: 'pointerdown', trusted: true, disabled: false});
  const task = ready.playerView.participantTask;
  const context = {schemaVersion: 1, protocolVersion: 3, matchId: binding.matchId, phaseId: ready.playerView.phaseId,
    foodStepId: task.foodStepId, round: ready.playerView.round, commandId: 'release-original'};
  const request = {...context, command: {type: 'TASK_PRESS', taskId: task.taskId, controlSessionId: task.controlSessionId,
    expectedControlRevision: task.controlRevision, input: {kind: 'PANEL_RELEASE'}}};
  const responseTime = ready.serverTimeMs;
  const receipt = {...context, status: 'accepted', receivedAt: responseTime, result: {
    kind: 'INPUT', taskId: task.taskId, controlSessionId: task.controlSessionId, effect: 'APPLIED', gestureSequence: null, crateId: null,
  }};
  const wire = deferred();
  const outgoing = trace.dispatch(request, input, () => wire.promise);
  now = 105;
  trace.pendingDom(context.commandId, () => true)();
  assert.equal(trace.report().commands[0].eventToPendingDomMs, 5);
  wire.resolve(null);
  await outgoing;
  assert.equal(trace.report().commands[0].receipt, null);
  now = 110;
  await trace.lookup(context, async () => ({serverTimeMs: responseTime, receipt: {...receipt, commandId: 'wrong'}}));
  assert.equal(trace.report().commands[0].attempts.at(-1).disposition, 'unverified');
  now = 175;
  const marker = {epoch: 'test', sequence: 3, receivedAtMs: 170, publishedAtServerMs: 120};
  assert.deepEqual(trace.projected({...marker, commandIds: []}, () => true), []);
  assert.equal(trace.report().commands[0].eventToAuthoritativeRenderMs, null);
  const [paint] = trace.projected({...marker, commandIds: [context.commandId]}, () => 'Panel moving');
  now = 190;
  paint();
  assert.equal(trace.report().commands[0].authority, null, 'Paint before the verified receipt is provisional');
  now = 200;
  await trace.lookup(context, async () => ({serverTimeMs: responseTime, receipt}));
  const report = trace.report();
  assert.equal(report.commands[0].eventToVerifiedReceiptMs, 100);
  assert.equal(report.commands[0].eventToAuthoritativeFrameMs, 70);
  assert.equal(report.commands[0].eventToAuthoritativeDomMs, 75);
  assert.equal(report.commands[0].eventToAuthoritativeRenderMs, 90);
  assert.equal(report.commands[0].authority.publishedAtServerMs, 120);
  assert.equal(JSON.stringify(report).includes('release-original'), false);
});

test('publication witness requires the exact fresh frame and immutable originating seat', () => {
  const signal = createFoodApplySignal();
  const pushed = frame('first', 4);
  const publication = {stage: 'published', audience: 'player', frameEpoch: 'first', frameSequence: 4,
    commandId: 'own-press', localMs: 55};
  const originals = new Set(['own-press']);
  const witness = (value = pushed, actor = binding, issued = originals, event = publication) => {
    signal.observe(event);
    return signal.ownPublication(value, actor, issued, binding.taskId);
  };
  assert.equal(witness(frame('different', 4)), null);
  assert.equal(witness(frame('first', 5)), null);
  assert.equal(witness({...pushed, fresh: false}), null);
  assert.equal(witness(pushed, {...binding, seatId: 'seat-8'}), null);
  assert.equal(witness(pushed, {...binding, matchId: 'other-match'}), null);
  assert.equal(witness(pushed, binding, new Set(['another-press'])), null);
  assert.equal(witness(pushed, binding, originals, {...publication, audience: 'public'}), null);
  assert.deepEqual(witness(), {commandId: 'own-press', publishedAtMs: 55});
  assert.equal(signal.ownPublication(pushed, binding, originals, binding.taskId), null, 'The event cannot be reused');
});

test('a frame effect must change a rendered control for the original Task or exact Hold gesture', () => {
  const scope = {taskId: 'current-task', controlSessionId: 'current-control'};
  const before = {...scope, panel: 'release', key: 'available', hold: {state: 'off'}};
  const request = input => ({command: {type: 'TASK_PRESS', ...scope, input}});
  const release = request({kind: 'PANEL_RELEASE'});
  assert.equal(foodRenderEffect(release, before, before), null);
  assert.equal(foodRenderEffect(release, before, {...before, panel: 'lock', controlSessionId: 'other-control'}), null);
  assert.equal(foodRenderEffect(release, before, {...before, panel: 'lock'}), 'Panel moving');
  assert.equal(foodRenderEffect(request({kind: 'PANEL_LOCK'}), {...before, panel: 'lock'}, before), 'Panel locked');
  assert.equal(foodRenderEffect(request({kind: 'KEY'}), before, {...before, key: 'delivered'}), 'Delivered');
  const down = request({kind: 'HOLD', edge: 'DOWN', gestureSequence: 3, crateId: 'own-crate'});
  const held = {...before, hold: {state: 'held', sequence: 3, crateId: 'own-crate'}};
  assert.equal(foodRenderEffect(down, before, held), 'Crate held');
  assert.equal(foodRenderEffect(down, before, {...held, hold: {...held.hold, state: 'pending'}}), 'Hold pending');
  assert.equal(foodRenderEffect(down, before, {...held, hold: {...held.hold, crateId: 'other-crate'}}), null);
  const up = request({kind: 'HOLD', edge: 'UP', gestureSequence: 3, crateId: null});
  assert.equal(foodRenderEffect(up, held, before), 'Hold cleared');
  assert.equal(foodRenderEffect(up, before, before), null);
  assert.equal(foodRenderEffect(up, {...held, hold: {...held.hold, sequence: 4}}, before), null);
});

test('apply notification is an interruptible lookup wake only', async () => {
  const signal = createFoodApplySignal(), wake = signal.watch('own');
  const abort = new AbortController();
  const pending = wake.next(abort.signal);
  signal.observe({stage: 'durably-admitted', kind: 'command', commandId: 'own'});
  signal.observe({stage: 'applied', kind: 'command', commandId: 'different'});
  abort.abort();
  assert.equal(await pending, false);
  signal.observe({stage: 'applied', kind: 'command', commandId: 'own'});
  assert.equal(await wake.next(new AbortController().signal), true);
  wake.close();
});
