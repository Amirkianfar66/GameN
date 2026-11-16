import {createHash, randomInt, randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {FOOD_TASK_TRANSPORT, FoodTaskCommandRequestSchema, parseFoodTaskReceipt, PLANET_FOOD_TASK_PINS} from '@mothership/contracts';
import * as planet from '@mothership/engine';
import {chooseFoodBotInput, canAdmitFoodBotPanelLock, foodBotPanelLockWindowEnd} from '../../dist/food-bot-policy.js';
import {FOOD_BOT_WORKER_LEASE_MS} from '../../dist/planet-food-service.js';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function identifier(value) {
  const hash = digest(value);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
const fail = code => { throw Object.assign(new Error(code), {code}); };
const taskOf = state => state.food?.step?.task ?? null;
const leaseMs = FOOD_TASK_TRANSPORT.presenceLeaseMs;
const entryNumber = sequence => String(sequence).padStart(16, '0');
const receiptFields = ['schemaVersion', 'protocolVersion', 'matchId', 'phaseId', 'foodStepId', 'round', 'commandId'];
const sample = () => Array.from({length: 64}, () => randomInt(0x1_0000_0000) / 0x1_0000_0000);
function assertTime(at, floor = 0) {
  if (!Number.isSafeInteger(at) || at < floor) fail('INVALID_CLOCK');
  return at;
}
function boundaryContext(context, ordinal, state, at) {
  const base = [context.nextPhaseId, context.nextDeadlineToken, context.random, ordinal];
  return {
    now: at,
    phaseId: state.phase.id,
    deadlineToken: state.deadlineToken,
    nextPhaseId: identifier([...base, 'phase']),
    nextDeadlineToken: identifier([...base, 'deadline']),
    random: Array.from({length: 64}, (_, i) => parseInt(digest([...base, 'random', i]).slice(0, 13), 16) / 0x10000000000000),
  };
}

/** Server-side development port. Caller supplies an already authenticated UID. */
export function createFoodTaskCoordinator({store, engine = planet, clock = Date.now, randomSamples = sample,
  admissionMode = 'shared-cursor', onEvent = () => {}}) {
  if (!store?.readOnly || !store?.watch) throw new TypeError('A snapshot-capable durable store is required');
  if (!['shared-cursor', 'owner-fifo'].includes(admissionMode)) throw new TypeError('Invalid admission mode');
  const ownedAdmission = admissionMode === 'owner-fifo';
  const localOwners = new Map(), admissionLanes = new Map();
  const path = (id, suffix) => {
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) fail('INVALID_TASK');
    return `prototypeFoodTask/${id}/${suffix}`;
  };
  const headKey = id => path(id, 'head');
  const ownerKey = id => path(id, 'owner');
  const stateKey = id => path(id, 'state');
  const entryKey = (id, n) => path(id, `entry/${entryNumber(n)}`);
  const appliedKey = (id, n) => path(id, `applied/${entryNumber(n)}`);
  const resultKey = id => path(id, 'returned-result');
  const dedupKey = (id, member, commandId) => path(id, `command/${digest([member.seatId, member.bindingRevision, commandId])}`);
  function event(stage, detail = {}) {
    try { onEvent(Object.freeze({stage, localMs: performance.now(), ...detail})); } catch { /* Measurement has no authority. */ }
  }
  function authorize(head, uid) {
    if (!head) fail('NOT_FOUND');
    const member = head.members.find(row => row.uid === uid && row.controller === 'human');
    if (member) return member;
    if (!uid || (head.hostUid !== uid && !head.displays.includes(uid))) fail('FORBIDDEN');
    return null;
  }
  function ownerAt(stored, token, at) {
    if (!stored || stored.id !== token?.id || stored.epoch !== token.epoch || at >= stored.expiresAt) fail('STALE_OWNER');
  }
  function activeTaskMember(head, uid) {
    const member = authorize(head, uid);
    if (!member || !head.participants.includes(member.seatId)) fail('FORBIDDEN');
    return member;
  }
  function nextDeadline(checkpoint) {
    if (!taskOf(checkpoint.state)) return null;
    const engineAt = engine.planetDeadlineAt(checkpoint.state);
    const absent = Object.entries(checkpoint.leases).filter(([, lease]) => !lease.offline)
      .sort(([a, x], [b, y]) => x.expiresAt - y.expiresAt || Number(a.slice(5)) - Number(b.slice(5)))[0];
    // Engine boundaries take exact ties, just as the existing service does.
    if (engineAt !== null && (!absent || engineAt <= absent[1].expiresAt)) return {kind: 'engine', at: engineAt};
    return absent ? {kind: 'presence', at: absent[1].expiresAt, seatId: absent[0]} : null;
  }
  async function openTask({session}) {
    const state = session?.state;
    const task = state && taskOf(state);
    if (!task || state.phase.kind !== 'FOOD_SUPPLY' || Object.entries(PLANET_FOOD_TASK_PINS).some(([key, value]) => state.versions[key] !== value) || session.status !== 'running') fail('INVALID_SEED');
    engine.assertPlanetGameState(state);
    const id = task.options.taskId;
    if (!/^[A-Za-z0-9_-]+$/.test(id)) fail('INVALID_SEED');
    const head = {
      taskId: id, matchId: state.matchId, hostUid: session.hostUid, displays: session.displays,
      members: session.members.map(({uid, seatId, controller, bindingRevision}) => ({uid, seatId, controller, bindingRevision})),
      participants: [task.options.winchSeatId, task.options.panelSeatId], tail: 0, admittedAt: state.evaluatedAt, closed: false,
    };
    const leases = structuredClone(session.foodService?.leases ?? {});
    for (const member of head.members.filter(row => row.controller === 'human' && head.participants.includes(row.seatId))) {
      if (leases[member.seatId]?.taskId !== id) fail('INVALID_SEED_LEASE');
    }
    await store.transaction(async tx => {
      if (await tx.get(headKey(id))) fail('TASK_EXISTS');
      tx.set(headKey(id), head);
      tx.set(stateKey(id), {cursor: 0, appliedAt: state.evaluatedAt, state, leases});
    });
    return id;
  }
  async function acquire(taskId, id) {
    if (!id) throw new TypeError('Owner identity is required');
    const token = await store.transaction(async tx => {
      const previous = await tx.get(ownerKey(taskId));
      const at = assertTime(clock());
      const live = previous && previous.expiresAt > at;
      if (live && previous.id !== id) return null;
      if (!previous && !await tx.get(headKey(taskId))) fail('NOT_FOUND');
      const next = {id, epoch: live ? previous.epoch : (previous?.epoch ?? 0) + 1, expiresAt: at + FOOD_BOT_WORKER_LEASE_MS};
      tx.set(ownerKey(taskId), next);
      return Object.freeze(next);
    });
    if (ownedAdmission && token) localOwners.set(taskId, token);
    return token;
  }
  function restore(taskId, token) {
    return store.readOnly(async tx => {
      const owner = await tx.get(ownerKey(taskId));
      ownerAt(owner, token, assertTime(clock()));
      const checkpoint = await tx.get(stateKey(taskId)), head = await tx.get(headKey(taskId));
      if (!checkpoint || !head) fail('NOT_FOUND');
      return {processed: checkpoint.cursor, pending: head.tail - checkpoint.cursor, nextAt: nextDeadline(checkpoint)?.at ?? null, returned: head.closed};
    });
  }
  async function append(taskId, source) {
    const receivedAt = assertTime(clock());
    const info = {kind: source.kind, commandId: source.request?.commandId ?? null, receivedAt};
    event('received', info);
    if (!ownedAdmission) return persistAdmission(taskId, source, receivedAt, source.token);
    // The ingress bridge must deliver to the same coordinator instance that
    // acquired this owner. A new process cannot admit until it has acquired.
    const route = source.token ?? localOwners.get(taskId);
    if (!route) fail('NOT_OWNER');
    let lane = admissionLanes.get(taskId);
    if (!lane) {
      lane = {tail: Promise.resolve(), depth: 0};
      admissionLanes.set(taskId, lane);
    }
    const queuedAt = performance.now(), depth = ++lane.depth;
    const result = lane.tail.then(() => {
      event('append-start', {...info, queueDepth: depth, queueWaitMs: performance.now() - queuedAt});
      return persistAdmission(taskId, source, receivedAt, route);
    });
    lane.tail = result.catch(() => {}).finally(() => {
      if (--lane.depth === 0) admissionLanes.delete(taskId);
    });
    return result;
  }
  async function persistAdmission(taskId, source, receivedAt, route) {
    const {kind, uid, request, token} = source;
    let entropy;
    const admitted = await store.transaction(async tx => {
      // The routed variant fences every append. Neither ingress path reads or
      // updates the gameplay checkpoint, including during contact admission.
      const owner = route ? await tx.get(ownerKey(taskId)) : null;
      const head = await tx.get(headKey(taskId));
      if (!head) fail('NOT_FOUND');
      const member = token ? source.member : activeTaskMember(head, uid);
      if (request && (request.matchId !== head.matchId || request.command.taskId !== taskId)) fail('NOT_ALLOWED');
      const key = request ? dedupKey(taskId, member, request.commandId) : null;
      const fingerprint = request ? digest(request) : null;
      const previous = key ? await tx.get(key) : null;
      const at = assertTime(clock(), head.admittedAt);
      if (route) ownerAt(owner, route, at);
      if (previous) {
        if (previous.fingerprint !== fingerprint) fail('COMMAND_ID_CONFLICT');
        return {admittedAt: previous.admittedAt, duplicate: true, sequence: previous.sequence};
      }
      if (head.closed) fail('NOT_ALLOWED');
      if (!token) {
        const input = request?.command.input;
        const closing = input?.kind === 'HOLD_RECOVER_OFF' || input?.kind === 'HOLD' && input.edge === 'UP';
        const lane = kind === 'heartbeat' ? 'presence' : closing ? 'closure' : 'input';
        const rateKey = path(taskId, `rate/${digest([uid, lane])}`);
        const old = await tx.get(rateKey);
        const budget = old && at - old.since < 60_000 ? old : {since: at, count: 0};
        if (budget.count >= FOOD_TASK_TRANSPORT.requestsPerMinute[lane]) fail('RATE_LIMITED');
        tx.set(rateKey, {...budget, count: budget.count + 1});
      }
      if (token && head.tail !== source.expectedTail) return null;
      if (kind === 'bot') {
        const {checkpoint, command, lockEndsAt} = source;
        const view = engine.projectPlanetFoodPlayer(checkpoint.state, member.seatId, at);
        const due = nextDeadline(checkpoint), pendingBoundary = due && due.at <= at;
        const lock = lockEndsAt !== null && at < lockEndsAt && canAdmitFoodBotPanelLock(view, command);
        if (pendingBoundary && (!lock || due.kind !== 'engine' || !engine.hasOnlyDuePlanetFoodWarnings(checkpoint.state, at)
          || Object.values(checkpoint.leases).some(lease => !lease.offline && lease.expiresAt <= at))) return null;
        if (command.input.kind === 'PANEL_LOCK' ? !lock : digest(chooseFoodBotInput(view).command) !== digest(command)) return null;
      }
      // Sample only the successful admission clock. Entropy is stable over SDK
      // callback retries and persisted with the exact original envelope.
      entropy ??= {nextPhaseId: randomUUID(), nextDeadlineToken: randomUUID(), random: randomSamples()};
      const sequence = head.tail + 1;
      tx.set(entryKey(taskId, sequence), {kind, receivedAt, context: {now: at, ...entropy}, request: request ?? null,
        seatId: member?.seatId ?? null, bindingRevision: member?.bindingRevision ?? null});
      if (key) {
        const context = Object.fromEntries(receiptFields.map(field => [field, request[field]]));
        tx.set(key, {fingerprint, context, sequence, admittedAt: at});
      }
      tx.set(headKey(taskId), {...head, tail: sequence, admittedAt: at});
      return {admittedAt: at, duplicate: false, sequence};
    });
    if (admitted && !admitted.duplicate) event('durably-admitted', {kind, commandId: request?.commandId ?? null, admittedAt: admitted.admittedAt});
    return admitted;
  }
  async function submit(taskId, uid, input) {
    const request = FoodTaskCommandRequestSchema.parse(input);
    if (request.command.type !== 'TASK_PRESS') fail('NOT_ALLOWED');
    const {admittedAt, duplicate} = await append(taskId, {kind: 'command', uid, request});
    return {phase: 'durably-admitted', commandId: request.commandId, admittedAt, duplicate};
  }
  async function heartbeat(taskId, uid) {
    const {admittedAt} = await append(taskId, {kind: 'heartbeat', uid});
    return {phase: 'durably-admitted', admittedAt};
  }
  function apply(checkpoint, entry, head) {
    const started = performance.now();
    const next = structuredClone(checkpoint), at = entry.context.now;
    let ordinal = 0, due = nextDeadline(next);
    const drift = [];
    while (due && due.at <= at) {
      if (ordinal >= 256) fail('BOUNDARY_BUDGET');
      const context = boundaryContext(entry.context, ordinal++, next.state, due.at);
      if (due.kind === 'engine') {
        const advanced = engine.advancePlanetDeadline(next.state, context);
        if (!advanced.advanced) fail('BOUNDARY_STALLED');
        next.state = advanced.state;
      } else {
        next.state = engine.setPlanetFoodPresence(next.state, due.seatId, false, context);
        next.leases[due.seatId].offline = true;
      }
      drift.push(due);
      syncLeases(next);
      due = nextDeadline(next);
    }
    let receipt = null, refusal = null;
    const own = head.members.find(row => row.seatId === entry.seatId && row.bindingRevision === entry.bindingRevision);
    if (entry.kind !== 'clock' && !own) refusal = 'FORBIDDEN';
    if (!refusal && entry.request) {
      const applied = engine.applyPlanetFoodCommand(next.state, entry.seatId, entry.request, entry.context);
      receipt = parseFoodTaskReceipt(applied.receipt, entry.request, entry.seatId);
      if (!receipt || receipt.receivedAt !== at) fail('RECEIPT_MISMATCH');
      next.state = applied.state;
    }
    if (!refusal && own?.controller === 'human') {
      syncLeases(next);
      const lease = next.leases[entry.seatId];
      if (lease) {
        if (lease.offline) next.state = engine.setPlanetFoodPresence(next.state, entry.seatId, true, entry.context);
        next.leases[entry.seatId] = {...lease, offline: false, expiresAt: at + leaseMs};
      } else if (entry.kind === 'heartbeat') refusal = 'NOT_ALLOWED';
    }
    syncLeases(next);
    next.cursor++;
    next.appliedAt = at;
    next.lastInput = entry.request ? {seatId: entry.seatId, commandId: entry.request.commandId} : null;
    return {next, applied: {receipt, refusal, admittedAt: at}, cpuMs: performance.now() - started, drift, kind: entry.kind, commandId: entry.request?.commandId ?? null};
  }
  function syncLeases(checkpoint) {
    const task = taskOf(checkpoint.state);
    for (const seatId of Object.keys(checkpoint.leases)) {
      if (!task || task.stage === 'ENDED' || !task.people.some(row => row.seatId === seatId && row.alive)) {
        delete checkpoint.leases[seatId];
      }
    }
  }
  async function load(taskId, token) {
    return store.readOnly(async tx => {
      const owner = await tx.get(ownerKey(taskId));
      ownerAt(owner, token, assertTime(clock()));
      const checkpoint = await tx.get(stateKey(taskId));
      const head = await tx.get(headKey(taskId));
      if (!checkpoint || !head) fail('NOT_FOUND');
      const entry = checkpoint.cursor === head.tail ? null : await tx.get(entryKey(taskId, checkpoint.cursor + 1));
      if (!entry && checkpoint.cursor !== head.tail) fail('MISSING_ADMISSION');
      return {checkpoint, head, entry};
    });
  }
  async function commit(taskId, token, previous, trial) {
    const {next, applied, drift, cpuMs, kind, commandId} = trial;
    const returned = taskOf(previous.state) && !taskOf(next.state);
    const commitStarted = performance.now();
    const committed = await store.transaction(async tx => {
      const owner = await tx.get(ownerKey(taskId));
      const current = await tx.get(stateKey(taskId));
      // Usually the append cursor lives on a separate document. Seal the Task
      // and record its handoff in the same transaction as its fixed return.
      const head = returned ? await tx.get(headKey(taskId)) : null;
      const before = returned ? await tx.get(resultKey(taskId)) : null;
      const at = assertTime(clock());
      ownerAt(owner, token, at);
      if (current?.cursor !== previous.cursor) return false;
      if (returned) {
        if (before) fail('RESULT_ALREADY_RECORDED');
        tx.set(headKey(taskId), {...head, closed: true});
        tx.set(resultKey(taskId), {taskId, returnedAt: next.state.phase.startedAt, state: next.state});
      }
      tx.set(stateKey(taskId), next);
      tx.set(appliedKey(taskId, next.cursor), applied);
      return true;
    });
    if (committed) event('applied', {kind, commandId, cpuMs, persistMs: performance.now() - commitStarted,
      admittedAt: applied.admittedAt, delayMs: Math.max(0, clock() - applied.admittedAt),
      boundaryDriftMs: drift.map(({at, kind}) => ({kind, ms: Math.max(0, clock() - at)})), returned: Boolean(returned)});
    return committed;
  }
  async function runDue(taskId, token, {beforeCommit} = {}) {
    for (let pass = 0; pass < 32; pass++) {
      const {checkpoint, head, entry} = await load(taskId, token);
      if (entry) {
        event('picked-up', {queueDepth: head.tail - checkpoint.cursor, kind: entry.kind, commandId: entry.request?.commandId ?? null});
        const trial = apply(checkpoint, entry, head);
        if (beforeCommit) await beforeCommit(entry.kind);
        await commit(taskId, token, checkpoint, trial);
        continue;
      }
      if (head.closed) return {nextAt: null, pending: 0};
      const at = assertTime(clock(), checkpoint.appliedAt), due = nextDeadline(checkpoint);
      let nextAt = due?.at ?? null, planned = null;
      for (const member of head.members) {
        if (member.controller !== 'bot' || !head.participants.includes(member.seatId)) continue;
        const view = engine.projectPlanetFoodPlayer(checkpoint.state, member.seatId, at);
        const decision = chooseFoodBotInput(view);
        if (decision.command?.type === 'TASK_PRESS') { planned = {member, view, command: decision.command}; break; }
        if (decision.nextWakeAt !== null) nextAt = Math.min(nextAt ?? Infinity, decision.nextWakeAt);
      }
      const lockEndsAt = planned ? foodBotPanelLockWindowEnd(planned.view, planned.command) : null;
      if (due && due.at <= at && (lockEndsAt === null || due.kind !== 'engine'
        || !engine.hasOnlyDuePlanetFoodWarnings(checkpoint.state, at)
        || Object.values(checkpoint.leases).some(lease => !lease.offline && lease.expiresAt <= at))) {
        await append(taskId, {kind: 'clock', token, expectedTail: head.tail});
        continue;
      }
      if (!planned) return {nextAt, pending: 0};
      const {member, view, command} = planned;
      // An uncommitted plan may pass a click or presence boundary while awaiting
      // storage. Append only under the observed tail and a fresh owned projection.
      const request = FoodTaskCommandRequestSchema.parse({schemaVersion: 1, protocolVersion: 3, matchId: view.matchId,
        phaseId: view.phaseId, foodStepId: view.step.stepId, round: view.round, commandId: randomUUID(), command});
      await append(taskId, {kind: 'bot', token, member, request, expectedTail: head.tail, checkpoint, command, lockEndsAt});
    }
    return {nextAt: clock(), pending: null};
  }
  async function receipt(taskId, uid, context) {
    return store.readOnly(async tx => {
      const head = await tx.get(headKey(taskId)), member = activeTaskMember(head, uid);
      const admitted = await tx.get(dedupKey(taskId, member, context.commandId));
      if (!admitted || !receiptFields.every(field => admitted.context[field] === context[field])) return null;
      const applied = await tx.get(appliedKey(taskId, admitted.sequence));
      if (!applied) return {phase: 'durably-admitted', admittedAt: admitted.admittedAt};
      return {phase: 'applied', ...applied};
    });
  }
  async function captureSnapshot(taskId, uid) {
    return store.readOnly(async tx => {
      const head = await tx.get(headKey(taskId)), member = authorize(head, uid);
      const checkpoint = await tx.get(stateKey(taskId));
      const at = assertTime(clock(), checkpoint.appliedAt);
      const due = nextDeadline(checkpoint);
      // Only an operator needs a freshness gate for timed inputs. Presenting
      // private deadline lag to another audience would also disclose its timing.
      const operator = member && head.participants.includes(member.seatId);
      const publishAt = operator && due && due.at <= at ? checkpoint.appliedAt : at;
      const publicView = engine.projectPlanetFoodPublic(checkpoint.state, publishAt);
      const playerView = member ? engine.projectPlanetFoodPlayer(checkpoint.state, member.seatId, publishAt) : null;
      const ordinaryPlayerView = member ? engine.projectPlanetPlayer(checkpoint.state, member.seatId) : null;
      const commandId = member && member.seatId === checkpoint.lastInput?.seatId ? checkpoint.lastInput.commandId : null;
      return {packet: {phase: 'published', publicView, playerView, ordinaryPlayerView, serverTimeMs: publishAt, fresh: publishAt === at}, commandId};
    });
  }
  const snapshot = async (taskId, uid) => (await captureSnapshot(taskId, uid)).packet;
  function subscribe(taskId, uid, publish, failed) {
    const frameEpoch = randomUUID();
    let open = true, last, pending = false, sending = false, frameSequence = 0;
    const refresh = async () => {
      pending = true;
      if (sending) return;
      sending = true;
      try {
        while (open && pending) {
          pending = false;
          const {packet, commandId} = await captureSnapshot(taskId, uid);
          // Never emit private cursor movement or an unrelated secret event to
          // the public channel. Time-only changes are client interpolation.
          const {publicView, playerView, ordinaryPlayerView} = packet;
          const key = digest([{...publicView, serverNowMs: 0}, playerView && {...playerView, serverNowMs: 0}, ordinaryPlayerView, packet.fresh]);
          if (!open || key === last) continue;
          last = key;
          const frame = {...packet, frameEpoch, frameSequence: ++frameSequence};
          event('published', {audience: playerView ? 'player' : 'public', frameEpoch, frameSequence, commandId});
          publish(frame);
        }
      } catch (error) { if (open) failed(error); }
      finally { sending = false; }
    };
    const unwatch = store.watch(stateKey(taskId), () => { void refresh(); }, failed);
    return () => { open = false; unwatch(); };
  }
  const clockSample = async (taskId, uid) => {
    const receivedAt = assertTime(clock());
    await store.readOnly(async tx => authorize(await tx.get(headKey(taskId)), uid));
    return {receivedAt, serverTimeMs: assertTime(clock(), receivedAt)};
  };
  return {openTask, acquire, restore, submit, heartbeat, runDue, receipt, subscribe, snapshot, clockSample,
    wakeOnAdmission: (taskId, wake, failed) => store.watch(headKey(taskId), wake, failed)};
}
