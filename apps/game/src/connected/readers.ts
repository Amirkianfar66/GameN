import {
  FULL_PROTOCOL_VERSION, FullLobbyViewSchema, FullPlayerViewSchema, FullPublicViewSchema, SeatIdSchema, TimestampSchema,
} from '@mothership/contracts';
import type { FullLobbyView, FullPlayerView, FullPublicView, SeatId } from '@mothership/contracts';
import { createSnapshotStore } from '../snapshot/snapshot-store.js';
import type { SnapshotStore } from '../snapshot/snapshot-store.js';

// Where protocol-2 documents enter client state. Each is parsed with the shared strict
// schema, pinned to the match this client asked for, and for a private view to the seat the
// host approved. Nothing here interprets a document; it only decides whether to believe it.

/** Wire protocol versions the connected client can display. */
export const SUPPORTED_CONNECTED_VERSIONS: readonly number[] = [FULL_PROTOCOL_VERSION];

/** For a shared display. A player's view fails this schema and cannot enter public state. */
export function createConnectedPublicStore(options: { readonly matchId: string }): SnapshotStore<FullPublicView> {
  return createSnapshotStore<FullPublicView>({
    matchId: options.matchId,
    supportedVersions: SUPPORTED_CONNECTED_VERSIONS,
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

// PROVISIONAL. The two documents below are readable by the host and have no exported
// schema at the integration candidate this was written against (gap G1 in
// docs/frontend/protocol2-adoption-assessment.md). Each reader accepts exactly the fields
// the service writes there and nothing else, so a drift shows as an unreadable document
// instead of being displayed. An exported schema replaces both.

const ROOMS = ['Room A', 'Room B'] as const;
const UID = /^[A-Za-z0-9_-]{1,128}$/;
const ROOM_CODE = /^[A-F0-9]{12}$/;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const hasOnly = (value: Record<string, unknown>, keys: readonly string[]): boolean => Object.keys(value).every(key => keys.includes(key));
const isRoom = (value: unknown): value is (typeof ROOMS)[number] => ROOMS.some(room => room === value);

/** One request to be seated, as the host and the requester may read it. */
export type Admission =
  | { readonly uid: string; readonly initialRoom: 'Room A' | 'Room B'; readonly requestedAt: number; readonly status: 'pending' }
  | { readonly uid: string; readonly initialRoom: 'Room A' | 'Room B'; readonly requestedAt: number; readonly status: 'approved'; readonly seatId: SeatId };

export function readAdmission(payload: unknown): DocumentOutcome<Admission> {
  if (payload === null) return { kind: 'missing' };
  if (!isRecord(payload) || !hasOnly(payload, ['uid', 'initialRoom', 'requestedAt', 'status', 'seatId'])) return rejected({ kind: 'unreadable' });
  const { uid, initialRoom, requestedAt, status, seatId } = payload;
  if (typeof uid !== 'string' || !UID.test(uid) || !isRoom(initialRoom) || !TimestampSchema.safeParse(requestedAt).success) return rejected({ kind: 'unreadable' });
  const base = { uid, initialRoom, requestedAt: requestedAt as number };
  if (status === 'pending' && seatId === undefined) return { kind: 'accepted', value: { ...base, status } };
  const seat = SeatIdSchema.safeParse(seatId);
  if (status === 'approved' && seat.success) return { kind: 'accepted', value: { ...base, status, seatId: seat.data } };
  return rejected({ kind: 'unreadable' });
}

/** What a host may read about its own match. It holds no engine state. */
export interface HostSession {
  readonly hostUid: string;
  readonly playerCount: 7 | 8 | 9;
  readonly status: 'lobby' | 'running' | 'complete' | 'aborted';
  readonly roomCode: string;
}

export function readHostSession(payload: unknown): DocumentOutcome<HostSession> {
  if (payload === null) return { kind: 'missing' };
  if (!isRecord(payload) || !hasOnly(payload, ['protocolVersion', 'hostUid', 'playerCount', 'status', 'roomCode', 'createdAt'])) return rejected({ kind: 'unreadable' });
  const version = topLevelVersion(payload);
  if (version !== null && !SUPPORTED_CONNECTED_VERSIONS.includes(version)) return rejected({ kind: 'incompatible-protocol', receivedVersion: version });
  const { hostUid, playerCount, status, roomCode, createdAt } = payload;
  const statuses = ['lobby', 'running', 'complete', 'aborted'] as const;
  const known = statuses.find(candidate => candidate === status);
  if (version === null || typeof hostUid !== 'string' || !UID.test(hostUid) || (playerCount !== 7 && playerCount !== 8 && playerCount !== 9)
    || known === undefined || typeof roomCode !== 'string' || !ROOM_CODE.test(roomCode) || !TimestampSchema.safeParse(createdAt).success) return rejected({ kind: 'unreadable' });
  return { kind: 'accepted', value: { hostUid, playerCount, status: known, roomCode } };
}
