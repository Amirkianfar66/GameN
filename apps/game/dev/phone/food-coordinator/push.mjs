globalThis[Symbol.for('mothership:dev-only')]=true;

import {FOOD_TASK_TRANSPORT, IdentifierSchema, TimestampSchema} from '@mothership/contracts';
import {createServerClock, readPlanetFood, readPlanetView} from '@mothership/game';

export function createFoodFrameGate(binding) {
  let generation = null, epoch = null, sequence = 0, highest = -1, highestOrdinary = -1;
  function packetFor(token, frame) {
    if (token !== generation || generation === null) return {discard: 'generation'};
    if (frame?.phase !== 'published' || typeof frame.fresh !== 'boolean') return {error: 'authorization'};
    const ordinary = readPlanetView(frame.ordinaryPlayerView, binding.matchId, binding.seatId);
    const packet = {value: frame.ordinaryPlayerView, fresh: frame.fresh,
      food: {publicView: frame.publicView, playerView: frame.playerView, serverTimeMs: frame.serverTimeMs}};
    const food = ordinary && readPlanetFood(packet, ordinary, binding.seatId);
    if (!food?.playerView || (food.playerView.participantTask && food.playerView.participantTask.taskId !== binding.taskId)) {
      return {error: 'authorization'};
    }
    if (food.playerView.viewRevision < highest || ordinary.viewRevision < highestOrdinary) return {discard: 'revision'};
    highest = food.playerView.viewRevision;
    highestOrdinary = ordinary.viewRevision;
    return {packet};
  }
  return {
    open() {
      generation = Symbol('Food subscription');
      epoch = null;
      sequence = 0;
      return generation;
    },
    close() { generation = null; },
    accept(token, frame) {
      if (token !== generation || generation === null) return {discard: 'generation'};
      if (typeof frame?.frameEpoch !== 'string' || !frame.frameEpoch || !Number.isSafeInteger(frame.frameSequence)
        || frame.frameSequence < 1) return {error: 'authorization'};
      if (epoch !== null && epoch !== frame.frameEpoch) return {discard: 'epoch'};
      if (frame.frameSequence <= sequence) return {discard: 'sequence'};
      const result = packetFor(token, frame);
      if (result.packet) {
        epoch = frame.frameEpoch;
        sequence = frame.frameSequence;
      }
      return result;
    },
    snapshot: packetFor,
  };
}

async function readFrames(response, onFrame) {
  if (!response.body || !response.headers.get('content-type')?.startsWith('text/event-stream')) throw Error('No Food stream');
  let pending = '';
  for await (const decoded of response.body.pipeThrough(new TextDecoderStream())) {
    pending += decoded;
    let end;
    while ((end = pending.indexOf('\n\n')) !== -1) {
      const event = pending.slice(0, end);
      pending = pending.slice(end + 2);
      if (event.startsWith('data: ')) onFrame(JSON.parse(event.slice(6)));
      else if (event === 'event: failure\ndata: authorization') throw Object.assign(Error('Food authorization'), {authorization: true});
      else throw Error('Food stream failed');
    }
    if (pending.length > 1_000_000) throw Error('Invalid Food stream boundary');
  }
}

// Only Task delivery changes in this experimental client. The original DTO,
// command ID, recovery lookup and authorization parser are still used.
export function createFoodPushSession({binding, ports, request, identities = []}) {
  const clock = createServerClock(ports.clock), gate = createFoodFrameGate(binding), listeners = new Set();
  const metadata = new WeakMap();
  let stream = null, current = null, timer = null, retry = null, visible = false, disposed = false, revoked = false;
  const drops = {generation: 0, epoch: 0, sequence: 0, revision: 0, supersededSnapshot: 0};
  const contacts = [];
  let refreshes = 0;
  const currentUid = () => revoked || disposed ? null : binding.uid;
  const readClock = () => visible && currentUid() ? clock.read() : {status: 'unsynced'};
  const notifyError = kind => { for (const listener of listeners) listener.error(kind); };
  const emit = () => {
    if (!current || readClock().status !== 'synced') return;
    for (const listener of listeners) listener.snapshot(current);
  };
  const clear = () => {
    gate.close();
    stream?.abort.abort();
    stream = current = null;
    clock.invalidate();
    if (timer !== null) ports.scheduler.clearTimeout(timer);
    if (retry !== null) ports.scheduler.clearTimeout(retry);
    timer = retry = null;
  };

  function fail(state, kind) {
    if (state !== stream || state.abort.signal.aborted) return;
    clear();
    if (kind === 'authorization') revoked = true;
    notifyError(kind);
    if (kind === 'network' && visible && !disposed) retry = ports.scheduler.setTimeout(open, FOOD_TASK_TRANSPORT.snapshotMs);
  }

  async function calibrate(state) {
    const requestedAt = ports.clock.now();
    try {
      const response = await request('clock', {}, state.abort.signal);
      const receivedAt = ports.clock.now();
      if (stream !== state) return;
      if (!TimestampSchema.safeParse(response.serverTimeMs).success || !TimestampSchema.safeParse(response.receivedAt).success
        || response.receivedAt > response.serverTimeMs) throw Error('Invalid paired clock response');
      clock.addSample({requestedAt, receivedAt, serverTimeMs: response.serverTimeMs});
      emit();
      return response.serverTimeMs;
    } catch (error) { fail(state, error.authorization ? 'authorization' : 'network'); }
  }

  function scheduleHeartbeat(state) {
    const latest = state.latest, task = latest?.food.playerView.participantTask, time = readClock();
    if (stream !== state || !visible || revoked || (latest && !task) || task?.stage === 'ENDED'
      || (task && !task.people.some(person => person.seatId === binding.seatId && person.alive))
      || (task && time.status === 'synced' && time.serverNowMs >= task.deadlineAt)) return;
    if (!state.heartbeatPending) {
      state.heartbeatPending = true;
      const contact = {sentAtMs: ports.clock.now(), replyAtMs: null, disposition: null};
      if (contacts.length < 128) contacts.push(contact);
      void request('heartbeat', {}, state.abort.signal).then(result => {
        contact.disposition = result.phase === 'durably-admitted' ? 'admitted' : 'unknown';
      }).catch(error => {
        contact.disposition = state.abort.signal.aborted ? 'cancelled' : 'unavailable';
        if (error.authorization) fail(state, 'authorization');
      }).finally(() => { contact.replyAtMs = ports.clock.now(); state.heartbeatPending = false; });
    }
    timer = ports.scheduler.setTimeout(() => scheduleHeartbeat(state), FOOD_TASK_TRANSPORT.heartbeatMs);
  }

  function deliver(state, result, marker) {
    if (result.discard) { drops[result.discard]++; return; }
    if (result.error) { fail(state, result.error); return; }
    state.latest = result.packet;
    if (!result.packet.fresh) {
      current = null;
      notifyError('network');
      return;
    }
    current = result.packet;
    metadata.set(current, marker);
    emit();
  }

  async function refresh() {
    const state = stream;
    if (!state) { open(); return; }
    if (state.refreshing) { state.refreshQueued = true; return; }
    state.refreshing = true;
    try {
      do {
        state.refreshQueued = false;
        const before = state.latest;
        refreshes++;
        const frame = await request('snapshot', null, state.abort.signal);
        const receivedAtMs = ports.clock.now(), latest = state.latest?.food;
        if (state === stream && state.latest !== before && latest
          && frame.playerView?.viewRevision === latest.playerView.viewRevision && frame.serverTimeMs <= latest.serverTimeMs) {
          drops.supersededSnapshot++;
          continue;
        }
        deliver(state, gate.snapshot(state.id, frame), {sequence: null, receivedAtMs, commandIds: []});
      } while (state === stream && state.refreshQueued);
    } catch (error) { fail(state, error.authorization ? 'authorization' : 'network'); }
    finally { state.refreshing = false; }
  }

  function open() {
    retry = null;
    if (stream || !visible || disposed || revoked) return;
    const state = {id: gate.open(), abort: new AbortController(), heartbeatPending: false};
    stream = state;
    state.calibration = calibrate(state);
    void request('frames', null, state.abort.signal).then(response => readFrames(response, frame => {
      const receivedAtMs = ports.clock.now();
      const witness = frame?.ownCommandWitness;
      const matched = IdentifierSchema.safeParse(witness?.commandId).success && Number.isFinite(witness?.publishedAtMs)
        && witness.publishedAtMs >= 0;
      const marker = {epoch: frame?.frameEpoch, sequence: frame?.frameSequence, receivedAtMs,
        publishedAtServerMs: matched ? witness.publishedAtMs : null, commandIds: matched ? [witness.commandId] : []};
      deliver(state, gate.accept(state.id, frame), marker);
    })).then(() => fail(state, 'network'), error => fail(state, error.authorization ? 'authorization' : 'network'));
    scheduleHeartbeat(state);
  }

  async function foodReply(route, original) {
    if (!currentUid() || original.matchId !== binding.matchId) return null;
    const state = stream;
    try {
      const {outcome, serverTimeMs} = await request(route, original);
      if (outcome?.refusal === 'FORBIDDEN' && state) fail(state, 'authorization');
      if (!currentUid() || outcome?.phase !== 'applied' || outcome.refusal || !outcome.receipt) return null;
      return {receipt: outcome.receipt, serverTimeMs};
    } catch (error) {
      if (error.authorization && state) fail(state, 'authorization');
      return null;
    }
  }

  const transport = {
    mode: 'authenticated',
    currentUid, readClock,
    async authenticate() {
      if (!currentUid()) throw Error('Food trial identity unavailable');
      return {uid: binding.uid, matchId: binding.matchId, seatId: binding.seatId};
    },
    async serverTime() {
      const state = stream, stamp = await state?.calibration;
      if (state !== stream || stamp === undefined) throw Error('Food trial clock unavailable');
      return stamp;
    },
    listen(audience, listener) {
      if (audience.matchId !== binding.matchId || audience.seatId !== binding.seatId) {
        listener.error('authorization');
        return () => {};
      }
      listeners.add(listener);
      if (current && readClock().status === 'synced') listener.snapshot(current);
      return () => listeners.delete(listener);
    },
    identities: () => currentUid() ? identities : [],
    // Ordinary authority writes are outside this active-Task port.
    async command() { return null; },
    async receipt() { return null; },
  };
  return {
    currentUid,
    gameTransport: () => transport,
    foodTransport: () => ({
      currentUid,
      command: original => foodReply('command', original),
      receipt: context => foodReply('receipt', context),
      refresh: () => { void refresh(); },
    }),
    setVisible(value) {
      if (visible === value || disposed) return;
      visible = value;
      if (visible) open();
      else { clear(); notifyError('authorization'); }
    },
    frameMetadata: packet => metadata.get(packet) ?? null,
    report() {
      const reading = readClock();
      return {drops: {...drops}, refreshes, clockStatus: reading.status,
        clockUncertaintyMs: reading.uncertaintyMs ?? null, contacts: structuredClone(contacts)};
    },
    dispose() { clear(); disposed = true; listeners.clear(); },
  };
}
