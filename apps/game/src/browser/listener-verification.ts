import type { ListenerFailure, Snapshot } from '../connected/transport.js';

export interface ListenerVerification {
  invalidate(): void;
  ensure(): Promise<void>;
}

/**
 * How long a refresh of credentials is taken to be good enough for the next denial too.
 * A refresh is a new sign-in token and a new attestation, and each is metered. The rules
 * refuse some listeners for reasons no credential changes: a display the host has not yet
 * admitted, a device whose seat was moved. Such a listener is opened again every second or
 * two for as long as its page is open, so a refresh for every denial would never stop.
 */
export const CREDENTIAL_REFRESH_INTERVAL_MS = 5 * 60_000;

export interface ListenerVerificationOptions {
  /** Milliseconds on any clock that does not go backwards. */
  readonly now?: () => number;
  readonly minIntervalMs?: number;
}

/**
 * Concurrent listeners share one refresh. A later denial requires a later refresh, but not
 * sooner than the interval after the last one that succeeded: until then a listener opens
 * with the credentials that refresh gave, and the SDK's own renewal keeps them current.
 */
export function createListenerVerification(refresh: () => Promise<void>, options: ListenerVerificationOptions = {}): ListenerVerification {
  const now = options.now ?? (() => Date.now());
  const minIntervalMs = options.minIntervalMs ?? CREDENTIAL_REFRESH_INTERVAL_MS;
  let required = 0;
  let verified = 0;
  let refreshedAt: number | null = null;
  let pending: Promise<void> | null = null;
  const recent = (): boolean => refreshedAt !== null && now() - refreshedAt < minIntervalMs;
  return {
    invalidate() { required += 1; },
    ensure() {
      if (pending !== null) return pending;
      if (verified === required) return Promise.resolve();
      pending = (async () => {
        while (verified !== required && !recent()) {
          const generation = required;
          await refresh();
          refreshedAt = now();
          verified = generation;
        }
      })().finally(() => { pending = null; });
      return pending;
    },
  };
}

export function hostedListenerFailure(error: { readonly code?: string }): ListenerFailure {
  return error.code === 'permission-denied' || error.code === 'unauthenticated'
    ? 'authorization-uncertain' : 'failed';
}

/** A reconnect refreshes uncertain credentials before opening a new SDK listener. */
export function listenWithVerification<Value>(verification: ListenerVerification,
  open: (deliver: (snapshot: Snapshot<Value>) => void, fail: (error: { readonly code?: string }) => void) => () => void,
  listener: { onSnapshot(snapshot: Snapshot<Value>): void; onError(reason: ListenerFailure): void },
): () => void {
  let ended = false;
  let stop = (): void => {};
  const fail = (reason: ListenerFailure): void => {
    if (ended) return;
    ended = true;
    if (reason === 'authorization-uncertain') verification.invalidate();
    listener.onError(reason);
  };
  void verification.ensure().then(() => {
    if (ended) return;
    stop = open(snapshot => { if (!ended) listener.onSnapshot(snapshot); }, error => fail(hostedListenerFailure(error)));
    if (ended) stop();
  }).catch(() => fail('authorization-uncertain'));
  return () => { ended = true; stop(); };
}
