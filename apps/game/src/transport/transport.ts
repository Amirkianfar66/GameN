import type { AdvanceIfExpiredRequest, ReceiptLookupRequest, RegisterShot } from '@mothership/contracts';

/** fixture and emulator are development backends and are labeled on screen at all times. */
export type TransportMode = 'fixture' | 'emulator' | 'production';

export interface FeedListener {
  /**
   * One unvalidated audience view. The transport must not interpret, merge or cache it.
   * `confirmed` is true only when the transport knows the payload to be the server's current
   * state; a transport that cannot tell leaves it out.
   */
  onPayload(payload: unknown, confirmed?: boolean): void;
  onConnectionChange(state: 'connected' | 'disconnected'): void;
}

export interface ViewFeed {
  /**
   * Starts delivering the caller's audience view and returns a function that stops it.
   * After every (re)connection the transport reports 'connected' and then delivers the
   * current view, even when it is unchanged, so the client can tell fresh from stale.
   */
  subscribe(listener: FeedListener): () => void;
}

interface SharedEndpoints {
  readonly mode: TransportMode;
  /** Resolves with an unvalidated ServerTimeResponse or ApiFailure. */
  serverTime(): Promise<unknown>;
  /** Resolves with an unvalidated AdvanceIfExpiredResponse or ApiFailure. */
  advanceIfExpired(request: AdvanceIfExpiredRequest): Promise<unknown>;
}

/** The table display. It has no way to submit a command or read a receipt. */
export interface PublicTransport extends ViewFeed, SharedEndpoints {
  readonly audience: 'public';
}

/** One authenticated seat. Identity comes from the transport's credentials, never a payload. */
export interface PlayerTransport extends ViewFeed, SharedEndpoints {
  readonly audience: 'player';
  /** Resolves with an unvalidated CommandResponse. A rejection means no response arrived. */
  submitCommand(command: RegisterShot): Promise<unknown>;
  /** Resolves with an unvalidated ReceiptLookupResponse or ApiFailure. */
  lookupReceipt(request: ReceiptLookupRequest): Promise<unknown>;
}

export type GameTransport = PublicTransport | PlayerTransport;
