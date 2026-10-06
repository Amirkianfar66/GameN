import type { PlayerView, PublicView } from '@mothership/contracts';
import type { ConnectionStatus, ShellProblem } from '@mothership/presentation';
import { createServerClock } from '../clock/server-clock.js';
import type { ClockReading, ClockSample } from '../clock/server-clock.js';
import type { ClientPorts } from '../ports.js';
import { createPlayerSnapshotStore, createPublicSnapshotStore } from '../snapshot/snapshot-store.js';
import type { SnapshotRejection, SnapshotStore } from '../snapshot/snapshot-store.js';
import { createPublicApiClient, DEFAULT_API_TIMEOUT_MS } from '../transport/api-client.js';
import type { FeedListener, PlayerTransport, PublicTransport, TransportMode, ViewFeed } from '../transport/transport.js';

export interface SessionState<View> {
  readonly connection: ConnectionStatus;
  /** The latest view that passed every check. Kept while stale so it stays readable. */
  readonly view: View | null;
  readonly problem: ShellProblem | null;
  /** Changes whenever the server-time estimate does. */
  readonly clockRevision: number;
}

export interface AudienceSession<View> {
  readonly mode: TransportMode;
  getState(): SessionState<View>;
  readClock(): ClockReading;
  subscribe(listener: () => void): () => void;
  start(): void;
  /** Drops the feed and subscribes again. The seat, role and version pins are kept. */
  reconnect(): void;
  /** Discards the server-time estimate and measures again, e.g. after returning to the foreground. */
  resyncClock(): void;
  dispose(): void;
}

/** Client-side technical parameters. None of them is a game rule or a server deadline. */
export interface SessionTiming {
  readonly apiTimeoutMs: number;
  /** Most server-time samples taken per synchronization. */
  readonly clockSamples: number;
  /** Stop sampling once the estimate is at least this tight. */
  readonly clockGoodEnoughMs: number;
  readonly clockRetryMs: number;
  readonly clockRetryMaxMs: number;
}
export const DEFAULT_SESSION_TIMING: SessionTiming = {
  apiTimeoutMs: DEFAULT_API_TIMEOUT_MS,
  clockSamples: 3,
  clockGoodEnoughMs: 100,
  clockRetryMs: 2_000,
  clockRetryMaxMs: 30_000,
};

function toProblem(rejection: SnapshotRejection): ShellProblem {
  if (rejection.kind === 'incompatible-protocol') return 'incompatible-protocol';
  if (rejection.kind === 'unreadable') return 'unreadable-update';
  return 'integrity';
}

/** What a session needs from a backend, whatever wire protocol it speaks. */
export interface SessionSource<View> {
  readonly mode: TransportMode;
  /** The audience's view feed: 'connected', then the current view, after every (re)connection. */
  readonly feed: ViewFeed;
  /** Where server time is asked. Any answer that carries the server's time calibrates the clock. */
  readonly time: {
    serverTime(): Promise<{ readonly kind: 'no-response' } | { readonly kind: string; readonly sample: ClockSample }>;
    cancelPending(): void;
  };
  readonly store: SnapshotStore<View>;
  readonly ports: ClientPorts;
  readonly timing?: Partial<SessionTiming> | undefined;
}

export function createSessionFrom<View>(config: SessionSource<View>): AudienceSession<View> {
  const { store, ports } = config;
  const transport = { mode: config.mode, subscribe: (listener: FeedListener) => config.feed.subscribe(listener) };
  const timing: SessionTiming = { ...DEFAULT_SESSION_TIMING, ...config.timing };
  const api = config.time;
  const serverClock = createServerClock(ports.clock);
  const listeners = new Set<() => void>();

  let state: SessionState<View> = { connection: 'connecting', view: null, problem: null, clockRevision: 0 };
  let started = false;
  let disposed = false;
  let unsubscribe: (() => void) | null = null;
  let feedConnected = false;
  // Callbacks from a feed that was replaced, and samples from a superseded sync, are ignored.
  let feedGeneration = 0;
  let syncGeneration = 0;
  let retryHandle: unknown = null;
  let retryDelayMs = timing.clockRetryMs;

  function update(patch: Partial<SessionState<View>>): void {
    const next = { ...state, ...patch };
    if (next.connection === state.connection && next.view === state.view && next.problem === state.problem && next.clockRevision === state.clockRevision) return;
    state = next;
    for (const listener of [...listeners]) listener();
  }

  function cancelRetry(): void {
    if (retryHandle !== null) ports.scheduler.clearTimeout(retryHandle);
    retryHandle = null;
  }

  // Listeners run synchronously inside update() and may dispose or reconnect the session
  // while being told. Whatever continues after an update re-checks that it is still current.

  function syncClock(): void {
    if (disposed) return;
    const generation = ++syncGeneration;
    cancelRetry();
    const current = (): boolean => !disposed && generation === syncGeneration;
    void (async () => {
      try {
        for (let attempt = 0; attempt < timing.clockSamples; attempt += 1) {
          const result = await api.serverTime();
          if (!current()) return;
          if (!('sample' in result)) break;
          // A safe error still carries the server's time, which is all this needs.
          if (serverClock.addSample(result.sample)) {
            update({ clockRevision: state.clockRevision + 1 });
            if (!current()) return;
          }
          const reading = serverClock.read();
          if (reading.status === 'synced' && reading.uncertaintyMs <= timing.clockGoodEnoughMs) break;
        }
      } catch {
        // A transport that misbehaves is the same as one that did not answer: try again later.
        if (!current()) return;
      }
      if (serverClock.read().status === 'synced') {
        retryDelayMs = timing.clockRetryMs;
        return;
      }
      if (!feedConnected) return;
      retryHandle = ports.scheduler.setTimeout(() => {
        retryHandle = null;
        if (current() && feedConnected) syncClock();
      }, retryDelayMs);
      retryDelayMs = Math.min(retryDelayMs * 2, timing.clockRetryMaxMs);
    })();
  }

  function invalidateClock(): void {
    serverClock.invalidate();
    syncGeneration += 1;
    cancelRetry();
    update({ clockRevision: state.clockRevision + 1 });
  }

  function onPayload(payload: unknown): void {
    const outcome = store.accept(payload);
    if (outcome.kind === 'ignored-stale') return;
    // A failed integrity check is never cleared by later data: the feed is not trusted again.
    if (state.problem === 'integrity') return;
    if (outcome.kind === 'rejected') {
      update({ problem: toProblem(outcome.rejection) });
      return;
    }
    // A view that arrives while the feed reports itself down is kept but not called current.
    update({ view: outcome.view, problem: null, connection: feedConnected ? 'live' : 'stale' });
  }

  function onConnectionChange(next: 'connected' | 'disconnected', generation: number): void {
    if (next === 'connected') {
      if (feedConnected) return;
      feedConnected = true;
      // Local elapsed time may not have been trustworthy while disconnected. The view stays
      // stale until the feed delivers the current one.
      invalidateClock();
      if (disposed || generation !== feedGeneration || !feedConnected) return;
      syncClock();
      return;
    }
    feedConnected = false;
    cancelRetry();
    syncGeneration += 1;
    update({ connection: state.view ? 'stale' : 'connecting' });
  }

  function attach(): void {
    const generation = ++feedGeneration;
    feedConnected = false;
    const stop = transport.subscribe({
      onPayload: payload => {
        if (!disposed && generation === feedGeneration) onPayload(payload);
      },
      onConnectionChange: next => {
        if (!disposed && generation === feedGeneration) onConnectionChange(next, generation);
      },
    });
    // A transport may call back before subscribe returns, and a listener may have replaced
    // or disposed this feed in the meantime. Then this subscription is already unwanted.
    if (disposed || generation !== feedGeneration) stop();
    else unsubscribe = stop;
  }

  function detach(): void {
    feedGeneration += 1;
    feedConnected = false;
    const stop = unsubscribe;
    unsubscribe = null;
    stop?.();
  }

  return {
    mode: transport.mode,
    getState: () => state,
    readClock: () => serverClock.read(),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start() {
      if (started || disposed) return;
      started = true;
      attach();
    },
    reconnect() {
      if (!started || disposed) return;
      detach();
      const generation = feedGeneration;
      cancelRetry();
      syncGeneration += 1;
      update({ connection: state.view ? 'stale' : 'connecting' });
      // A listener that reconnected or disposed while being told has already settled this.
      if (disposed || generation !== feedGeneration) return;
      attach();
    },
    resyncClock() {
      if (!started || disposed) return;
      invalidateClock();
      if (!disposed && feedConnected) syncClock();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      detach();
      cancelRetry();
      syncGeneration += 1;
      api.cancelPending();
      listeners.clear();
    },
  };
}

export interface SessionOptions<Transport> {
  readonly transport: Transport;
  /** The match this client asked for. A view for any other match is refused. */
  readonly matchId: string;
  readonly ports: ClientPorts;
  readonly timing?: Partial<SessionTiming>;
}

function fromTransport<View>(options: SessionOptions<PublicTransport | PlayerTransport>, store: SnapshotStore<View>): AudienceSession<View> {
  const timeoutMs = options.timing?.apiTimeoutMs ?? DEFAULT_SESSION_TIMING.apiTimeoutMs;
  return createSessionFrom({ mode: options.transport.mode, feed: options.transport, time: createPublicApiClient(options.transport, options.ports, timeoutMs), store, ports: options.ports, timing: options.timing });
}

export function createPublicSession(options: SessionOptions<PublicTransport>): AudienceSession<PublicView> {
  return fromTransport(options, createPublicSnapshotStore({ matchId: options.matchId }));
}

export function createPlayerSession(options: SessionOptions<PlayerTransport>): AudienceSession<PlayerView> {
  return fromTransport(options, createPlayerSnapshotStore({ matchId: options.matchId }));
}
