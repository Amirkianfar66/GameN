// The boundary to a real backend speaking wire protocol 2 (docs/backend/protocol2-client-handoff.md).
// A transport carries bytes and identity and nothing else: it does not validate, merge,
// cache, order or interpret what it carries. Everything it hands over is unvalidated.
//
// It is deliberately not a general database gateway. It can reach the documented
// operations and the documented listener paths, each named here, and no other.

/** The documented JSON operations the connected flow uses. */
export const V1_OPERATIONS = [
  'v1CreateMatch', 'v1RequestAdmission', 'v1ApproveAdmission', 'v1AdmitDisplay', 'v1StartMatch', 'v1AbortMatch',
  'v1IssueSeatRecovery', 'v1RedeemSeatRecovery',
  'v1Command', 'v1Receipt', 'v1Advance', 'v1ServerTime', 'v1SetLobbyIdentity', 'v1SetPracticeBots',
] as const;
export type V1Operation = (typeof V1_OPERATIONS)[number];

/** A document the caller may listen to. The transport supplies its own verified UID where a path needs one. */
export type DocumentTarget =
  | { readonly kind: 'lobby'; readonly matchId: string }
  | { readonly kind: 'identities'; readonly matchId: string }
  | { readonly kind: 'practice-bots'; readonly matchId: string }
  | { readonly kind: 'seat-session'; readonly matchId: string }
  | { readonly kind: 'own-acknowledgments'; readonly matchId: string }
  | { readonly kind: 'public-view'; readonly matchId: string }
  /** The caller's own private view. It cannot name another player's. */
  | { readonly kind: 'player-view'; readonly matchId: string }
  /** Host only. */
  | { readonly kind: 'session'; readonly matchId: string }
  | { readonly kind: 'admission'; readonly matchId: string; readonly admissionId: string };

/** A collection the caller may listen to. Host only: every admission request of its match. */
export type CollectionTarget = { readonly kind: 'admissions'; readonly matchId: string };

export interface Snapshot<Value> {
  readonly value: Value;
  /**
   * Confirmed by the server: not served from a cache and with no local write pending. Only
   * a fresh snapshot can enable an action. A stale one may be shown, labeled as such.
   */
  readonly fresh: boolean;
}

/**
 * Why a listener ended. refused: the server's rules do not let this identity read what it
 * asked for. Anything else is a failure of the listener and says nothing about access.
 */
// A hosted permission denial can be an Auth/App Check failure, not a revoked seat.
// Hide held views immediately, but do not discard unresolved command identifiers.
export type ListenerFailure = 'refused' | 'authorization-uncertain' | 'failed';

export interface DocumentListener {
  /** The document as it is, unvalidated, or null when it does not exist. */
  onSnapshot(snapshot: Snapshot<unknown>): void;
  /** The listener failed or was refused. Nothing delivered before it is fresh any more. A transport that cannot tell which says nothing. */
  onError(reason?: ListenerFailure): void;
}

export interface CollectionListener {
  onSnapshot(snapshot: Snapshot<readonly { readonly id: string; readonly data: unknown }[]>): void;
  onError(reason?: ListenerFailure): void;
}

export interface ConnectedTransport {
  /** emulator is a development backend and is labeled on screen at all times. */
  readonly mode: 'emulator' | 'production';
  /** The verified identity this transport acts as, or null before sign-in. Never taken from a payload. */
  currentUid(): string | null;
  /** Establishes or restores the identity. Resolves with its UID. */
  signIn(): Promise<string>;
  /**
   * One JSON POST to a documented operation, with the caller's current ID token. Resolves
   * with the parsed JSON body whatever the HTTP status, because a failure is a JSON body
   * too. Rejects when no readable JSON answer arrived, which leaves the outcome unknown.
   */
  post(operation: V1Operation, body: unknown): Promise<unknown>;
  /** Starts listening and returns a function that stops it. */
  listenDocument(target: DocumentTarget, listener: DocumentListener): () => void;
  listenCollection(target: CollectionTarget, listener: CollectionListener): () => void;
}
