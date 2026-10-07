import type { ListenerFailure, Snapshot } from '../connected/transport.js';

export interface ListenerVerification {
  invalidate(): void;
  ensure(): Promise<void>;
}

/** Concurrent listeners share one refresh; a later denial still requires a later refresh. */
export function createListenerVerification(refresh: () => Promise<void>): ListenerVerification {
  let required = 0;
  let verified = 0;
  let pending: Promise<void> | null = null;
  return {
    invalidate() { required += 1; },
    ensure() {
      if (pending !== null) return pending;
      if (verified === required) return Promise.resolve();
      pending = (async () => {
        while (verified !== required) {
          const generation = required;
          await refresh();
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
