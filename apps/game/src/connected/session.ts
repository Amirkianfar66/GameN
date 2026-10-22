import type { FullPlayerView, FullPublicView, SeatId } from '@mothership/contracts';
import type { ClientPorts } from '../ports.js';
import { createSessionFrom, DEFAULT_SESSION_TIMING } from '../session/audience-session.js';
import type { AudienceSession, SessionTiming } from '../session/audience-session.js';
import type { ViewFeed } from '../transport/transport.js';
import type { ConnectedApi } from './api.js';
import { createConnectedPlayerStore, createConnectedPublicStore } from './readers.js';
import type { ConnectedTransport, DocumentTarget } from './transport.js';

// A session over a real backend's view document. It is the same session as the fixture's:
// the last readable view is kept while stale, and only a current view counts as live. What
// "current" means here is the handoff's rule: a snapshot the server confirmed. One served
// from a cache, a listener that failed, or a document that is gone leaves the session stale.
// A confirmed snapshot older than the view already held is not "current" either: the store
// reports it as an integrity failure, and the session stops trusting the feed.

function viewFeed(transport: Pick<ConnectedTransport, 'listenDocument'>, target: DocumentTarget): ViewFeed {
  return {
    subscribe(listener) {
      let fresh = false;
      const mark = (next: boolean): void => {
        if (next === fresh) return;
        fresh = next;
        listener.onConnectionChange(next ? 'connected' : 'disconnected');
      };
      return transport.listenDocument(target, {
        onSnapshot(snapshot) {
          // The server itself says the document is not there. Whether that takes a view away is the session's to judge.
          if (snapshot.fresh && snapshot.value === null) listener.onMissing?.();
          // A missing document proves nothing about the match: there is no view to call current.
          mark(snapshot.fresh && snapshot.value !== null);
          // The store is told whether the server confirmed this payload: a confirmed revision
          // lower than the one held is not a replay to drop, it is a match gone backwards.
          if (snapshot.value !== null) listener.onPayload(snapshot.value, snapshot.fresh);
        },
        onError(reason) {
          // Refused by the server's rules: this identity may not read the view, or no longer may.
          if (reason === 'refused') listener.onRefused?.();
          if (reason === 'authorization-uncertain') listener.onAuthorizationUncertain?.();
          // The transport never reported this feed up, or it did and no longer is.
          if (fresh) mark(false);
          else listener.onConnectionChange('disconnected');
        },
      });
    },
  };
}

export interface ConnectedSessionOptions {
  readonly transport: Pick<ConnectedTransport, 'listenDocument' | 'mode'>;
  readonly api: Pick<ConnectedApi, 'serverTime' | 'cancelPending'>;
  /** The match this client asked for. A view for any other match is refused. */
  readonly matchId: string;
  readonly ports: ClientPorts;
  readonly timing?: Partial<SessionTiming>;
}

function source(options: ConnectedSessionOptions, target: DocumentTarget) {
  return {
    mode: options.transport.mode,
    feed: viewFeed(options.transport, target),
    // Server time needs an admitted identity under protocol 2. Until then the countdown says it is syncing.
    time: { serverTime: () => options.api.serverTime(options.matchId), cancelPending: () => options.api.cancelPending() },
    ports: options.ports,
    timing: { ...DEFAULT_SESSION_TIMING, ...options.timing },
  };
}

/** For a shared display. */
export function createConnectedPublicSession(options: ConnectedSessionOptions): AudienceSession<FullPublicView> {
  return createSessionFrom({ ...source(options, { kind: 'public-view', matchId: options.matchId }), store: createConnectedPublicStore({ matchId: options.matchId }) });
}

/** For the seat the host approved. A view for any other seat is unreadable here. */
export function createConnectedPlayerSession(options: ConnectedSessionOptions & { readonly seatId: SeatId }): AudienceSession<FullPlayerView> {
  return createSessionFrom({ ...source(options, { kind: 'player-view', matchId: options.matchId }), store: createConnectedPlayerStore({ matchId: options.matchId, seatId: options.seatId }) });
}
