import type { IdSource, MonotonicClock } from '../ports.js';
import type { ConnectedFailureCode, LobbyIdentityFailureCode, PracticeBotsFailureCode, OperationResult } from './api.js';

type LifecycleFailureCode = ConnectedFailureCode | LobbyIdentityFailureCode | PracticeBotsFailureCode;

// The lifecycle operations (create a lobby, ask to join, seat a player, admit a display,
// start, end, issue a recovery code, take a seat over) are asked for by a person pressing a
// control, and the answer to any of them can be lost on the way. This is the one rule they
// share, kept in one place and out of the page that draws the controls:
//
//   A request is made once, from what the person entered when they first pressed, and is
//   kept until the server has settled it. Until then, pressing again sends that very
//   request, with the same identifier, whatever the controls say by then: the service then
//   answers with the original result instead of doing the thing twice.
//
//   A refusal settles a request only if every earlier attempt of it was answered. After an
//   attempt that got no answer, a refusal says nothing about that attempt: it may have been
//   carried out, or may yet be. The request is kept, and it is for the person to give it up.
//
// Nothing here decides anything about a match. It decides only what is sent again.

/** What became of one press. */
export type LifecycleOutcome<Request, Result> =
  /** A send for this key is still on its way. This press sent nothing. */
  | { readonly kind: 'busy' }
  /** The client core would not send it: it is not a request the protocol allows. Nothing left the device and nothing is kept. */
  | { readonly kind: 'invalid' }
  /** The server answered this request. It is settled, and forgotten. */
  | { readonly kind: 'done'; readonly request: Request; readonly result: Result }
  /** The server refused this request and no earlier attempt of it is unaccounted for. Settled, and forgotten: a new press makes a new request. */
  | { readonly kind: 'refused'; readonly request: Request; readonly code: LifecycleFailureCode }
  /** Not settled. The same request is what the next press sends. */
  | {
    readonly kind: 'unsettled';
    readonly request: Request;
    /**
     * no-answer: nothing usable came back; it may have been carried out.
     * not-now: the server could not take it, or said to slow down; nothing is sent before the wait it named is over.
     * refused-after-no-answer: this attempt was refused, but an earlier attempt of the same request got no answer.
     */
    readonly why: 'no-answer' | 'not-now' | 'refused-after-no-answer';
    readonly code: LifecycleFailureCode | null;
    /** How long from now nothing will be sent, when the server named a wait. */
    readonly retryAfterMs: number | null;
  };

/** A request that is kept, as a page may show it: what will be sent again, and whether an attempt of it went unanswered. */
export interface UnsettledRequest {
  readonly request: unknown;
  readonly unanswered: boolean;
}

/**
 * Where requests marked durable are kept across a reload of the page: per tab, like the
 * identifiers of an unresolved command. Only identifiers ever reach it (see DURABLE_FIELDS).
 */
export interface LifecycleRequestStore {
  load(): unknown;
  save(value: unknown): void;
}

export interface LifecycleRequestsOptions {
  readonly ids: IdSource;
  readonly clock: MonotonicClock;
  readonly store?: LifecycleRequestStore | undefined;
}

export interface LifecycleRequests {
  /** The request kept under a key, or null when none is. */
  unsettled(key: string): UnsettledRequest | null;
  /**
   * Sends the request kept under the key, or else builds one with a new identifier and keeps
   * it until it is settled. `build` is not called while a request is kept. A durable request
   * outlives a reload of the page; it may carry identifiers only.
   */
  send<Request extends object, Result>(
    key: string,
    build: (requestId: string) => Request,
    call: (request: Request) => Promise<OperationResult<Result, LifecycleFailureCode>>,
    options?: { readonly durable?: boolean },
  ): Promise<LifecycleOutcome<Request, Result>>;
  /**
   * Gives up the request kept under a key. An attempt of it may still be carried out: whoever
   * calls this tells the person so. While a send for the key is on its way nothing is given
   * up, and the answer is false.
   */
  abandon(key: string): boolean;
}

/**
 * The only fields a request written to the store may have. A request with any other field
 * is never written, whatever the caller asked for: a recovery code, a room code or anything
 * else a person typed stays in memory.
 */
export const DURABLE_FIELDS: readonly string[] = ['protocolVersion', 'matchId', 'requestId', 'seatId'];

/** Answers after which the same request may simply be sent again, later. */
const NOT_NOW: ReadonlySet<string> = new Set(['UNAVAILABLE', 'RATE_LIMITED']);

interface Kept {
  request: object;
  unanswered: boolean;
  durable: boolean;
  /** Nothing is sent before this moment: the server named a wait. */
  notBefore: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const identifiersOnly = (request: object): boolean => Object.keys(request).every(field => DURABLE_FIELDS.includes(field))
  && Object.values(request).every(value => typeof value === 'string' || typeof value === 'number');

export function createLifecycleRequests(options: LifecycleRequestsOptions): LifecycleRequests {
  const { ids, clock, store } = options;
  const kept = new Map<string, Kept>();
  const inFlight = new Set<string>();

  // What an earlier page of this tab left unsettled. Anything that is not a plain record of
  // identifiers is ignored: the store is not trusted to hold what this module wrote.
  const stored: unknown = store?.load();
  if (isRecord(stored)) {
    for (const [key, entry] of Object.entries(stored)) {
      if (isRecord(entry) && isRecord(entry.request) && identifiersOnly(entry.request)) {
        kept.set(key, { request: entry.request, unanswered: entry.unanswered === true, durable: true, notBefore: 0 });
      }
    }
  }

  function persist(): void {
    if (store === undefined) return;
    const durable: Record<string, { request: object; unanswered: boolean }> = {};
    for (const [key, entry] of kept) if (entry.durable) durable[key] = { request: entry.request, unanswered: entry.unanswered };
    store.save(durable);
  }
  function forget(key: string): void {
    kept.delete(key);
    persist();
  }

  return {
    unsettled(key) {
      const entry = kept.get(key);
      return entry === undefined ? null : { request: entry.request, unanswered: entry.unanswered };
    },

    async send<Request extends object, Result>(
      key: string,
      build: (requestId: string) => Request,
      call: (request: Request) => Promise<OperationResult<Result, LifecycleFailureCode>>,
      sendOptions: { readonly durable?: boolean } = {},
    ): Promise<LifecycleOutcome<Request, Result>> {
      // A second press while the first is still on its way sends nothing.
      if (inFlight.has(key)) return { kind: 'busy' };
      let entry = kept.get(key);
      if (entry === undefined) {
        const request = build(ids.next());
        // Only identifiers are ever written down. Anything else is kept in memory, whatever was asked for.
        entry = { request, unanswered: false, durable: sendOptions.durable === true && identifiersOnly(request), notBefore: 0 };
        kept.set(key, entry);
        persist();
      }
      // Kept under this key by this module: either built by this caller's `build`, or read
      // back from the store, in which case `call` checks it like any other request.
      const request = entry.request as Request;
      const wait = entry.notBefore - clock.now();
      if (wait > 0) return { kind: 'unsettled', request, why: 'not-now', code: null, retryAfterMs: wait };

      inFlight.add(key);
      let result: OperationResult<Result, LifecycleFailureCode>;
      try {
        result = await call(request);
      } catch {
        // Not a request the protocol allows. Nothing left the device.
        forget(key);
        return { kind: 'invalid' };
      } finally {
        inFlight.delete(key);
      }
      if (result.kind === 'done') {
        forget(key);
        return { kind: 'done', request, result: result.result };
      }
      if (result.kind === 'api-failure') {
        if (NOT_NOW.has(result.code)) {
          entry.notBefore = clock.now() + (result.retryAfterMs ?? 0);
          return { kind: 'unsettled', request, why: 'not-now', code: result.code, retryAfterMs: result.retryAfterMs };
        }
        // A refusal settles the attempt it answers. An earlier attempt that got no answer is still unaccounted for.
        if (entry.unanswered) return { kind: 'unsettled', request, why: 'refused-after-no-answer', code: result.code, retryAfterMs: null };
        forget(key);
        return { kind: 'refused', request, code: result.code };
      }
      entry.unanswered = true;
      persist();
      return { kind: 'unsettled', request, why: 'no-answer', code: null, retryAfterMs: null };
    },

    abandon(key) {
      if (inFlight.has(key)) return false;
      forget(key);
      return true;
    },
  };
}
