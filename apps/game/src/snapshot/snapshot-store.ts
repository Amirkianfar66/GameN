import { IdentifierSchema, PlayerViewSchema, PROTOCOL_VERSION, PublicViewSchema } from '@mothership/contracts';
import type { PlayerView, PublicView } from '@mothership/contracts';

/** Wire protocol versions this build can display. */
export const SUPPORTED_PROTOCOL_VERSIONS: readonly number[] = [PROTOCOL_VERSION];

export type SnapshotRejection =
  /** Readable enough to see it speaks another protocol: the app, not the data, is out of date. */
  | { readonly kind: 'incompatible-protocol'; readonly receivedVersion: number }
  /** Does not satisfy this audience's schema. Includes a view meant for a different audience. */
  | { readonly kind: 'unreadable' }
  | { readonly kind: 'wrong-match' }
  /** A player feed changed seat or role. Roles are never dealt again within a match. */
  | { readonly kind: 'identity-changed' }
  /** Versions or player count differ from those the match was pinned to. */
  | { readonly kind: 'pins-changed' }
  /** The current revision arrived again with different content. */
  | { readonly kind: 'revision-conflict' };

export type SnapshotOutcome<View> =
  | { readonly kind: 'accepted'; readonly view: View }
  /** The current revision arrived again, identical. It proves the feed is current. */
  | { readonly kind: 'unchanged'; readonly view: View }
  /** Older than the view already held. It proves nothing and is dropped. */
  | { readonly kind: 'ignored-stale' }
  | { readonly kind: 'rejected'; readonly rejection: SnapshotRejection };

export interface SnapshotStore<View> {
  accept(payload: unknown): SnapshotOutcome<View>;
  current(): View | null;
}

/**
 * Reads the protocol version from a payload without trusting anything else about it.
 * Interim: the shared contracts package should export this probe (contract review FE-C06).
 */
export function probeProtocolVersion(payload: unknown): number | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const versions: unknown = (payload as { readonly versions?: unknown }).versions;
  if (typeof versions !== 'object' || versions === null) return null;
  const version: unknown = (versions as { readonly protocolVersion?: unknown }).protocolVersion;
  return typeof version === 'number' && Number.isInteger(version) && version >= 0 ? version : null;
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

interface Pins {
  readonly versions: string;
  readonly playerCount: number;
  readonly identity: string | null;
}

export interface SnapshotStoreConfig<View> {
  readonly matchId: string;
  readonly parse: (payload: unknown) => View | null;
  readonly identityOf: (view: View) => string | null;
  /** Wire protocol versions this store can hold. Defaults to the protocol-1 fixture protocol. */
  readonly supportedVersions?: readonly number[];
}

/** What every wire protocol's composed view has, and all a store needs to know about one. */
interface ComposedView {
  readonly matchId: string;
  readonly viewRevision: number;
  readonly versions: unknown;
  readonly playerCount: number;
}

// The single place an audience view enters client state. Strict parsing means a field the
// contract does not list, or a view built for another audience, never gets past this point.
export function createSnapshotStore<View extends ComposedView>(config: SnapshotStoreConfig<View>): SnapshotStore<View> {
  if (!IdentifierSchema.safeParse(config.matchId).success) throw new TypeError('A snapshot store needs a valid match id');
  const supported = config.supportedVersions ?? SUPPORTED_PROTOCOL_VERSIONS;
  let held: { readonly view: View; readonly canonical: string } | null = null;
  let pins: Pins | null = null;

  const reject = (rejection: SnapshotRejection): SnapshotOutcome<View> => ({ kind: 'rejected', rejection });

  return {
    current: () => held?.view ?? null,
    accept(payload) {
      const version = probeProtocolVersion(payload);
      if (version !== null && !supported.includes(version)) return reject({ kind: 'incompatible-protocol', receivedVersion: version });
      const view = config.parse(payload);
      if (view === null) return reject({ kind: 'unreadable' });
      if (view.matchId !== config.matchId) return reject({ kind: 'wrong-match' });

      const seen: Pins = { versions: JSON.stringify(view.versions), playerCount: view.playerCount, identity: config.identityOf(view) };
      if (pins) {
        if (pins.identity !== seen.identity) return reject({ kind: 'identity-changed' });
        if (pins.versions !== seen.versions || pins.playerCount !== seen.playerCount) return reject({ kind: 'pins-changed' });
      }

      // Parsing rebuilds the object in schema order, so equal views serialize identically.
      const canonical = JSON.stringify(view);
      if (held) {
        // Only the order of revisions is used. The size of a step carries no meaning here.
        if (view.viewRevision < held.view.viewRevision) return { kind: 'ignored-stale' };
        if (view.viewRevision === held.view.viewRevision) {
          return canonical === held.canonical ? { kind: 'unchanged', view: held.view } : reject({ kind: 'revision-conflict' });
        }
      }
      pins ??= seen;
      held = { view: deepFreeze(view), canonical };
      return { kind: 'accepted', view: held.view };
    },
  };
}

/** For the table display. A player's view fails this schema and cannot enter public state. */
export function createPublicSnapshotStore(options: { readonly matchId: string }): SnapshotStore<PublicView> {
  return createSnapshotStore<PublicView>({
    matchId: options.matchId,
    parse: payload => {
      const result = PublicViewSchema.safeParse(payload);
      return result.success ? result.data : null;
    },
    identityOf: () => null,
  });
}

/** For one seat. The first accepted view fixes the seat and role for the life of the store. */
export function createPlayerSnapshotStore(options: { readonly matchId: string }): SnapshotStore<PlayerView> {
  return createSnapshotStore<PlayerView>({
    matchId: options.matchId,
    parse: payload => {
      const result = PlayerViewSchema.safeParse(payload);
      return result.success ? result.data : null;
    },
    identityOf: view => `${view.self.seatId}/${view.self.role}`,
  });
}
