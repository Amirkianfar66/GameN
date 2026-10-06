import type { AdvanceIfExpiredRequest, ReceiptLookupRequest, RegisterShot } from '@mothership/contracts';

/** fixture and emulator are development backends and are labeled on screen at all times. */
export type TransportMode = 'fixture' | 'emulator' | 'production';

export interface FeedListener {
  /** One unvalidated audience view. The transport must not interpret, merge or cache it. */
  onPayload(payload: unknown): void;
  /**
   * One unvalidated presentation event from this audience's own stream. The transport puts
   * them in the stream's order, by view revision and then by the stream's own ordinal, and
   * does nothing else with them: it does not match them to views, drop repeats or decide
   * what is old.
   */
  onEventPayload(payload: unknown): void;
  onConnectionChange(state: 'connected' | 'disconnected'): void;
}

export interface AudienceFeed {
  /**
   * Starts delivering the caller's audience view and its presentation events, and returns
   * a function that stops both. After every (re)connection the transport reports
   * 'connected' and then delivers the current view, even when it is unchanged, so the
   * client can tell fresh from stale.
   *
   * An event may arrive before or after the view it belongs to, and events the stream
   * still holds may be delivered again after a (re)connection. The client decides what is
   * history; nothing here is an instruction to replay it.
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
export interface PublicTransport extends AudienceFeed, SharedEndpoints {
  readonly audience: 'public';
}

/** One authenticated seat. Identity comes from the transport's credentials, never a payload. */
export interface PlayerTransport extends AudienceFeed, SharedEndpoints {
  readonly audience: 'player';
  /** Resolves with an unvalidated CommandResponse. A rejection means no response arrived. */
  submitCommand(command: RegisterShot): Promise<unknown>;
  /** Resolves with an unvalidated ReceiptLookupResponse or ApiFailure. */
  lookupReceipt(request: ReceiptLookupRequest): Promise<unknown>;
}

export type GameTransport = PublicTransport | PlayerTransport;
