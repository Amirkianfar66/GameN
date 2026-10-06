import {
  FULL_PROTOCOL_VERSION, FullAdmissionDocumentSchema, FullHostSessionSchema, FullLobbyViewSchema, FullPlayerViewSchema, FullPublicViewSchema,
} from '@mothership/contracts';
import type { FullAdmissionDocument, FullHostSession, FullLobbyView, FullPlayerView, FullPublicView, SeatId } from '@mothership/contracts';
import { createSnapshotStore } from '../snapshot/snapshot-store.js';
import type { SnapshotStore } from '../snapshot/snapshot-store.js';

// Where protocol-2 documents enter client state. Each is parsed with the shared strict
// schema, pinned to the match this client asked for, and for a private view to the seat the
// host approved. Nothing here interprets a document; it only decides whether to believe it.
//
// A revision lower than the one held is dropped when it may be a replay or a cached copy.
// When the server itself confirmed it, the match has gone backwards under this client: the
// handoff calls that a restoration error, and the stores report it as an integrity failure.

/** Wire protocol versions the connected client can display. */
export const SUPPORTED_CONNECTED_VERSIONS: readonly number[] = [FULL_PROTOCOL_VERSION];

/** For a shared display. A player's view fails this schema and cannot enter public state. */
export function createConnectedPublicStore(options: { readonly matchId: string }): SnapshotStore<FullPublicView> {
  return createSnapshotStore<FullPublicView>({
    matchId: options.matchId,
    supportedVersions: SUPPORTED_CONNECTED_VERSIONS,
    confirmedRegression: 'integrity',
    parse: payload => {
      const result = FullPublicViewSchema.safeParse(payload);
      return result.success ? result.data : null;
    },
    identityOf: () => null,
  });
}

/**
 * For one seat. A view for any seat but the approved one is unreadable here, and the first
 * accepted view fixes the role for the life of the store: roles are dealt once.
 */
export function createConnectedPlayerStore(options: { readonly matchId: string; readonly seatId: SeatId }): SnapshotStore<FullPlayerView> {
  return createSnapshotStore<FullPlayerView>({
    matchId: options.matchId,
    supportedVersions: SUPPORTED_CONNECTED_VERSIONS,
    confirmedRegression: 'integrity',
    parse: payload => {
      const result = FullPlayerViewSchema.safeParse(payload);
      return result.success && result.data.audience.seatId === options.seatId ? result.data : null;
    },
    identityOf: view => `${view.self.seatId}/${view.self.role}`,
  });
}

export type DocumentRejection =
  | { readonly kind: 'incompatible-protocol'; readonly receivedVersion: number }
  | { readonly kind: 'unreadable' }
  | { readonly kind: 'wrong-match' };
export type DocumentOutcome<Value> =
  | { readonly kind: 'accepted'; readonly value: Value }
  /** The document does not exist, or not for this reader. */
  | { readonly kind: 'missing' }
  | { readonly kind: 'rejected'; readonly rejection: DocumentRejection };

const rejected = (rejection: DocumentRejection) => ({ kind: 'rejected', rejection }) as const;

/** The lobby as every admitted member may see it. It carries no revision: its order is the listener's. */
export function readLobby(payload: unknown, matchId: string): DocumentOutcome<FullLobbyView> {
  if (payload === null) return { kind: 'missing' };
  const version = typeof payload === 'object' ? topLevelVersion(payload) : null;
  if (version !== null && !SUPPORTED_CONNECTED_VERSIONS.includes(version)) return rejected({ kind: 'incompatible-protocol', receivedVersion: version });
  const parsed = FullLobbyViewSchema.safeParse(payload);
  if (!parsed.success) return rejected({ kind: 'unreadable' });
  return parsed.data.matchId === matchId ? { kind: 'accepted', value: parsed.data } : rejected({ kind: 'wrong-match' });
}

// A lobby view and an administrative document carry their version at the top level.
function topLevelVersion(payload: object | null): number | null {
  const version: unknown = (payload as { readonly protocolVersion?: unknown } | null)?.protocolVersion;
  return typeof version === 'number' && Number.isInteger(version) && version >= 0 ? version : null;
}

// The two documents below are readable by the host, and an admission by its requester too.
// Each is judged by the shared strict schema for the body the service stores, so a drift
// shows as an unreadable document instead of being displayed. The schema knows nothing of
// a missing document or of another protocol version; those two outcomes are decided here.
// Neither body carries the identifiers of its path: the listener asked for that path, and
// the Security Rules decide who may read it.

/** One request to be seated, as the host and the requester may read it: the stored document, whole. */
export type Admission = FullAdmissionDocument;

export function readAdmission(payload: unknown): DocumentOutcome<Admission> {
  if (payload === null) return { kind: 'missing' };
  const parsed = FullAdmissionDocumentSchema.safeParse(payload);
  return parsed.success ? { kind: 'accepted', value: parsed.data } : rejected({ kind: 'unreadable' });
}

/**
 * What a host's screen needs of its own match. The stored document also carries its
 * protocol version and when it was created; both are checked and neither is passed on.
 * It holds no engine state.
 */
export type HostSession = Pick<FullHostSession, 'hostUid' | 'playerCount' | 'status' | 'roomCode'>;

export function readHostSession(payload: unknown): DocumentOutcome<HostSession> {
  if (payload === null) return { kind: 'missing' };
  // A document of another protocol version is said to be that, whatever else it holds.
  const version = typeof payload === 'object' ? topLevelVersion(payload) : null;
  if (version !== null && !SUPPORTED_CONNECTED_VERSIONS.includes(version)) return rejected({ kind: 'incompatible-protocol', receivedVersion: version });
  const parsed = FullHostSessionSchema.safeParse(payload);
  if (!parsed.success) return rejected({ kind: 'unreadable' });
  const { hostUid, playerCount, status, roomCode } = parsed.data;
  return { kind: 'accepted', value: { hostUid, playerCount, status, roomCode } };
}
