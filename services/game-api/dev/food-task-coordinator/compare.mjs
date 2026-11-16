import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {setTimeout as sleep} from 'node:timers/promises';
import {withPlanetRequestTiming} from '../../dist/planet-game.js';
import {createLoopbackFoodStore} from './firestore.mjs';
import {createFoodTaskCoordinator} from './coordinator.mjs';
import {startFoodTaskOwner} from './drive.mjs';
import {envelope, seedTwoHumanTask} from './fixture.mjs';

// One paired synthetic script. No browser or network-hop timestamps are included.
const [variant = 'baseline', run = 'pilot', duration = '14000', roster = '7'] = process.argv.slice(2);
assert.ok(['baseline', 'coordinator'].includes(variant));
const spanMs = Number(duration), count = Number(roster);
assert.ok([7, 9].includes(count) && spanMs >= 10000 && spanMs <= 33000);

const adapter = createLoopbackFoodStore();
const pending = new Map(), timers = new Set(), subscriptions = [], errors = [], measurements = [], stages = {};
const jobs = new Map(), seenOutbox = new Set();
const traffic = {logicalReads: 0, logicalWrites: 0, logicalWriteBytes: 0, sdkCallbacks: 0};
const publications = {player: 0, public: 0};
const contacts = {received: 0, admitted: 0, applied: 0, readRenewals: 0};
const presses = new Map();
let active = false, recording = false, clock, elapsed, owner, deadlineDrift = [], presenceDrift = [], baselineCpu = [], candidateCpu = [], depths = [];
let onRecord = () => {};
function storeTiming(operation) {
  if (!recording) return operation();
  return withPlanetRequestTiming(operation, summary => {
    if (!recording) return;
    for (const [name, value] of Object.entries(summary.stages)) {
      const stage = stages[name] ??= {count: 0, totalMs: 0, maxMs: 0};
      stage.count += value.count;
      stage.totalMs += value.totalMs;
      stage.maxMs = Math.max(stage.maxMs, value.maxMs);
    }
  });
}
function wrap(tx, saved, fn) {
  if (recording) traffic.sdkCallbacks++;
  const wrapped = {...tx, get(key) {
    if (recording) traffic.logicalReads++;
    return tx.get(key);
  }};
  for (const method of ['set', 'create', 'delete']) {
    if (!tx[method]) continue;
    wrapped[method] = (key, value) => {
      saved.set(key, value ?? null);
      if (recording) {
        traffic.logicalWrites++;
        if (value != null) traffic.logicalWriteBytes += Buffer.byteLength(JSON.stringify(value));
      }
      return method === 'delete' ? tx.delete(key) : tx[method](key, value);
    };
  }
  return fn(wrapped);
}
const store = {...adapter,
  readOnly: fn => storeTiming(() => adapter.readOnly(tx => wrap(tx, new Map(), fn))),
  transaction: async fn => {
    const committed = await storeTiming(() => adapter.transaction(async tx => {
      const saved = new Map();
      return {value: await wrap(tx, saved, fn), saved};
    }));
    for (const [key, value] of committed.saved) {
      if (key.startsWith('deadline/') && value) jobs.set(key, value);
      if (recording) onRecord(key, value);
    }
    return committed.value;
  },
};
const schedule = (after, run) => {
  if (!active) return;
  const timer = setTimeout(() => { timers.delete(timer); if (active) run(); }, Math.max(0, after));
  timers.add(timer);
};
function issue(label, run, done) {
  if (!active) return Promise.resolve();
  const started = elapsed();
  const promise = Promise.resolve().then(run).then(out => {
    const ended = elapsed();
    if (recording) measurements.push({label, ms: ended - started, endMs: ended, refused: out?.ok === false});
    if (recording && out?.ok === false) errors.push({label, code: out.error?.code ?? 'refused', endMs: ended});
    if (recording) done?.(out, ended);
  }).catch(error => {
    if (recording) {
      const endMs = elapsed();
      measurements.push({label, ms: endMs - started, endMs, refused: true});
      errors.push({label, code: typeof error.code === 'string' ? error.code : 'exception', endMs});
    }
  }).finally(() => pending.delete(promise));
  pending.set(promise, label);
  return promise;
}
function recordCommand(id, fields) {
  const old = presses.get(id);
  if (old) Object.assign(old, fields);
}
const toContext = ({command: _command, ...context}) => context;
function summarize(values) {
  if (!values.length) return {n: 0, median: null, max: null};
  values.sort((a, b) => a - b);
  return {n: values.length, median: values[Math.ceil(values.length / 2) - 1], max: values.at(-1)};
}
let cleanup = 'closed', drained = false;
try {
  const {h, session, task, winch, panel} = await seedTwoHumanTask(store, count);
  const taskStart = task.options.startedAt;
  const viewers = [winch, panel, h.display, ...h.players.filter(uid => uid !== winch && uid !== panel)];
  const origin = performance.now();
  elapsed = () => Math.floor(performance.now() - origin);
  clock = () => taskStart + elapsed();
  const assigned = new Set();
  const lastRead = new Map(viewers.map(uid => [uid, 0]));
  const cpu = h.options.engine;
  const instrumented = {...cpu};
  for (const name of ['applyPlanetFoodCommand', 'advancePlanetDeadline', 'setPlanetFoodPresence']) {
    instrumented[name] = (...args) => {
      const started = performance.now();
      const result = cpu[name](...args);
      if (recording) baselineCpu.push(performance.now() - started);
      return result;
    };
  }
  h.reload({clock, engine: instrumented});
  const c = createFoodTaskCoordinator({store, clock, randomSamples: () => Array(64).fill(.2), onEvent(row) {
    if (!recording) return;
    const at = elapsed();
    if (row.stage === 'received') {
      if (row.kind === 'heartbeat') contacts.received++;
      recordCommand(row.commandId, {receivedMs: at});
    } else if (row.stage === 'durably-admitted') {
      if (row.kind === 'heartbeat') contacts.admitted++;
      recordCommand(row.commandId, {admittedMs: row.admittedAt - taskStart, appendAckMs: at});
    } else if (row.stage === 'picked-up') depths.push(row.queueDepth);
    else if (row.stage === 'applied') {
      if (row.kind === 'heartbeat') contacts.applied++;
      recordCommand(row.commandId, {appliedMs: at});
      candidateCpu.push(row.cpuMs);
      for (const due of row.boundaryDriftMs) (due.kind === 'engine' ? deadlineDrift : presenceDrift).push(due.ms);
    } else if (row.stage === 'published') recordCommand(row.commandId, {correlatedFrameMs: at});
  }});
  const taskId = task.options.taskId;
  if (variant === 'coordinator') await c.openTask({session});
  function lookup(uid, request) {
    void issue('receiptLookup', () => c.receipt(taskId, uid, toContext(request)), out => {
      if (out?.phase === 'applied') {
        recordCommand(request.commandId, {receiptMs: elapsed(), receiptStatus: out.receipt?.status ?? out.refusal,
          effect: out.receipt?.result?.effect ?? null, originalTimeMs: out.receipt?.receivedAt - taskStart});
      } else schedule(60, () => lookup(uid, request));
    });
  }
  function submit(uid, view, input, label) {
    assigned.add(label);
    const t = view.participantTask;
    const request = envelope(view, {type: 'TASK_PRESS', taskId,
      controlSessionId: t.controlSessionId, expectedControlRevision: t.controlRevision, input});
    presses.set(request.commandId, {label, offerObservedMs: elapsed()});
    if (variant === 'coordinator') {
      void issue(label, () => c.submit(taskId, uid, request), () => lookup(uid, request));
    } else {
      recordCommand(request.commandId, {receivedMs: elapsed()});
      void issue(label, () => h.invoke(uid, 'foodCommand', {request}), (out, receiptMs) => {
        const receipt = out?.result?.receipt;
        recordCommand(request.commandId, {receiptMs, receiptStatus: receipt?.status ?? 'unknown',
          effect: receipt?.result?.effect ?? null, originalTimeMs: receipt ? receipt.receivedAt - taskStart : null});
      });
    }
  }
  function observe(uid, view) {
    publications[view ? 'player' : 'public']++;
    const t = view?.participantTask, inputs = view?.offers.find(offer => offer.type === 'TASK_PRESS')?.inputs ?? [];
    if (!active || !t || t.stage !== 'ACTIVE') return;
    if (uid === winch && !assigned.has('winchDown') && inputs.includes('HOLD')) {
      submit(uid, view, {kind: 'HOLD', edge: 'DOWN', gestureSequence: 1, crateId: t.crate.id}, 'winchDown');
    }
    if (uid === panel && !assigned.has('panelRelease') && t.crate.state === 'HELD' && inputs.includes('PANEL_RELEASE')) {
      submit(uid, view, {kind: 'PANEL_RELEASE'}, 'panelRelease');
    }
  }
  function deliver(job) {
    schedule(job.endsAt - clock(), () => void issue('deadline', () => h.service.runDeadline(job), out => {
      if (out.status === 'too-early') schedule(out.retryAfterMs, () => deliver(job));
    }));
  }
  function enqueue(key, row) {
    if (row.matchId !== h.matchId || row.status === 'complete' || seenOutbox.has(key)) return;
    seenOutbox.add(key);
    schedule(0, () => void issue('outbox', () => h.service.dispatchDeadline(key.slice(9), async job => deliver(job))));
  }
  onRecord = (key, row) => {
    if (row === null) return;
    if (key.startsWith('deadline/')) enqueue(key, row);
    if (key.startsWith(`foodIngress/${h.matchId}/`)) {
      const id = row.request?.request?.commandId;
      if (row.response === null) recordCommand(id, {admittedMs: row.context.now - taskStart, appendAckMs: elapsed()});
      else recordCommand(id, {appliedMs: elapsed()});
      if (row.request?.operation === 'foodHeartbeat') {
        if (row.response === null) contacts.admitted++;
        else contacts.applied++;
      }
    }
    if (key.startsWith(`journal/${h.matchId}/`) && row.kind === 'DEADLINE') deadlineDrift.push(Math.max(0, clock() - row.context.now));
    if (key.startsWith(`journal/${h.matchId}/`) && row.kind === 'FOOD_PRESENCE' && row.online === false) presenceDrift.push(Math.max(0, clock() - row.context.now));
    if (key === `foodIngressControl/${h.matchId}`) depths.push(row.nextSequence - 1 - row.processedSequence);
    if (key === `foodContact/${h.matchId}`) contacts.readRenewals++;
    if (key === `session/${h.matchId}`) schedule(0, () => void issue('botTrigger', () => h.service.runBots(h.matchId)));
  };
  active = true;
  recording = true;
  if (variant === 'baseline') {
    for (const [key, job] of jobs) enqueue(key, job);
    for (const uid of viewers) {
      const poll = () => void issue('read', () => h.invoke(uid, 'read', {matchId: h.matchId}), out => {
        if (out.ok) { lastRead.set(uid, elapsed()); observe(uid, out.result.foodPlayerView); }
      }).finally(() => schedule(500, poll));
      schedule(500, poll);
    }
  } else {
    onRecord = () => {};
    owner = await startFoodTaskOwner({coordinator: c, taskId, clock, failed: error => errors.push({label: 'owner', code: error.code ?? 'exception'})});
    for (const uid of viewers) subscriptions.push(c.subscribe(taskId, uid, frame => {
      if (frame.fresh && recording) observe(uid, frame.playerView);
    }, error => errors.push({label: 'frame', code: error.code ?? 'exception'})));
  }
  for (const uid of [winch, panel]) {
    let busy = false;
    const presence = () => {
      if (!busy && (variant === 'coordinator' || elapsed() - lastRead.get(uid) >= 1000)) {
        busy = true;
        if (variant === 'baseline') contacts.received++;
        const beat = variant === 'coordinator' ? () => c.heartbeat(taskId, uid) : () => h.invoke(uid, 'foodHeartbeat', {matchId: h.matchId, taskId});
        void issue('heartbeat', beat).finally(() => { busy = false; });
      }
      schedule(1000, presence);
    };
    schedule(1000, presence);
  }
  await sleep(Math.max(0, spanMs - elapsed()));
  active = false;
  for (const timer of timers) clearTimeout(timer);
  const closing = Promise.allSettled([owner?.stop(), ...pending.keys()]);
  let cap;
  drained = await Promise.race([closing.then(() => true), new Promise(resolve => { cap = setTimeout(() => resolve(false), 25_000); })]);
  clearTimeout(cap);
  const tail = {boundedMs: 25_000, settledAfterWindow: measurements.filter(row => row.endMs > spanMs).length,
    unresolved: [...pending.values()], ownerSettled: owner ? drained : null};
  recording = false;
  if (variant === 'baseline' && drained) {
    const aborted = await h.operation(h.host, 'abort', {matchId: h.matchId});
    cleanup = aborted.ok ? 'authorized-abort' : 'abort-refused';
  } else if (!drained) cleanup = 'stopped-with-unresolved';
  const latency = Object.fromEntries([...new Set(measurements.map(row => row.label))].map(label => [label,
    summarize(measurements.filter(row => row.label === label).map(row => row.ms))]));
  process.stdout.write(JSON.stringify({variant, run, count, scenario: 'two-human-down-release', viewerCount: viewers.length,
    spanMs, mode: 'offer-driven closed loop', commands: [...presses.values()], latency, tail, traffic, sdk: stages, contacts, publications,
    deadlineDriftMs: summarize(deadlineDrift), presenceDriftMs: summarize(presenceDrift), queueDepth: summarize(depths),
    engineCpuMs: summarize(variant === 'baseline' ? baselineCpu : candidateCpu), errors, cleanup}) + '\n');
} finally {
  active = false;
  recording = false;
  for (const timer of timers) clearTimeout(timer);
  const stopped = owner?.stop();
  if (drained) await stopped;
  for (const unsubscribe of subscriptions) unsubscribe();
  await adapter.close();
}
