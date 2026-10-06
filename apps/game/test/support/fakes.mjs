// Deterministic stand-ins for the host ports and a transport. Test-only: they carry no
// game data and implement no rule; each test scripts exactly what the "server" answers.

/** Lets every already-settled promise chain run to completion. */
export const flush = () => new Promise(resolve => setImmediate(resolve));

/**
 * A manual monotonic clock and scheduler. Local time moves only when a test says so.
 * The simulated server keeps its own time, so tests can make the two disagree.
 */
export function createFakeHost({ localStart = 5_000, serverStart = 1_800_000_000_000 } = {}) {
  let localNow = localStart;
  let serverSkewMs = 0;
  let nextHandle = 1;
  const timers = new Map();
  const host = {
    ports: {
      clock: { now: () => localNow },
      scheduler: {
        setTimeout(callback, delayMs) {
          const handle = nextHandle++;
          timers.set(handle, { at: localNow + delayMs, callback });
          return handle;
        },
        clearTimeout(handle) {
          timers.delete(handle);
        },
      },
    },
    localNow: () => localNow,
    /** Server time as the simulated backend sees it right now. */
    serverNow: () => serverStart + (localNow - localStart) + serverSkewMs,
    pendingTimers: () => timers.size,
    /** Advances local and server time together, firing due timers in order. */
    async advance(ms) {
      const target = localNow + ms;
      for (;;) {
        const due = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!due) break;
        timers.delete(due[0]);
        localNow = Math.max(localNow, due[1].at);
        due[1].callback();
        await flush();
      }
      localNow = target;
      await flush();
    },
    /** Server time passes while the local monotonic clock stands still, as when a device sleeps. */
    sleepDevice(ms) {
      serverSkewMs += ms;
    },
  };
  return host;
}

/**
 * A scriptable transport. `respond` holds one function per endpoint; replace any of them
 * in a test. By default the server answers the time immediately and nothing else.
 */
export function createFakeTransport(host, { audience = 'player', mode = 'fixture' } = {}) {
  const listeners = new Set();
  const calls = { subscribe: 0, unsubscribe: 0, serverTime: 0, advanceIfExpired: [], submitCommand: [], lookupReceipt: [] };
  const unavailable = () => ({ ok: false, serverTimeMs: host.serverNow(), error: { code: 'UNAVAILABLE' } });
  const respond = {
    serverTime: async () => ({ protocolVersion: 1, serverTimeMs: host.serverNow() }),
    advanceIfExpired: async () => unavailable(),
    submitCommand: async () => unavailable(),
    lookupReceipt: async () => unavailable(),
  };
  const transport = {
    mode,
    audience,
    subscribe(listener) {
      calls.subscribe += 1;
      listeners.add(listener);
      return () => {
        calls.unsubscribe += 1;
        listeners.delete(listener);
      };
    },
    serverTime() {
      calls.serverTime += 1;
      return respond.serverTime();
    },
    advanceIfExpired(request) {
      calls.advanceIfExpired.push(request);
      return respond.advanceIfExpired(request);
    },
  };
  if (audience === 'player') {
    transport.submitCommand = command => {
      calls.submitCommand.push(command);
      return respond.submitCommand(command);
    };
    transport.lookupReceipt = request => {
      calls.lookupReceipt.push(request);
      return respond.lookupReceipt(request);
    };
  }
  return {
    transport,
    calls,
    respond,
    subscribers: () => listeners.size,
    async connect() {
      for (const listener of [...listeners]) listener.onConnectionChange('connected');
      await flush();
    },
    async disconnect() {
      for (const listener of [...listeners]) listener.onConnectionChange('disconnected');
      await flush();
    },
    async deliver(payload) {
      for (const listener of [...listeners]) listener.onPayload(structuredClone(payload));
      await flush();
    },
    /** Connects and delivers the current view, as the transport contract requires. */
    async connectWith(payload) {
      await this.connect();
      await this.deliver(payload);
    },
    /** Makes the time endpoint take a round trip of `ms`, stamped by the server at its midpoint. */
    delayServerTime(ms) {
      respond.serverTime = () => new Promise(resolve => {
        host.ports.scheduler.setTimeout(() => {
          const serverTimeMs = host.serverNow();
          host.ports.scheduler.setTimeout(() => resolve({ protocolVersion: 1, serverTimeMs }), ms / 2);
        }, ms / 2);
      });
    },
  };
}
