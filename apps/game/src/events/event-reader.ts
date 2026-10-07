import { PlayerPresentationEventSchema, PublicPresentationEventSchema } from '@mothership/contracts';
import type { PlayerPresentationEvent, PublicPresentationEvent } from '@mothership/contracts';
import { SUPPORTED_PROTOCOL_VERSIONS } from '../snapshot/snapshot-store.js';

export type EventRejection =
  /** Readable enough to see it speaks another protocol. The view feed decides what the screen does about that. */
  | { readonly kind: 'incompatible-protocol'; readonly receivedVersion: number }
  /** Does not satisfy this audience's schema. Includes an event meant for the other kind of audience. */
  | { readonly kind: 'unreadable' }
  | { readonly kind: 'wrong-match' };

export type EventOutcome<Event> =
  | { readonly kind: 'accepted'; readonly event: Event }
  | { readonly kind: 'rejected'; readonly rejection: EventRejection };

// An event carries its protocol version at the top level, where a view nests it.
function probeEventProtocolVersion(payload: unknown): number | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const version: unknown = (payload as { readonly protocolVersion?: unknown }).protocolVersion;
  return typeof version === 'number' && Number.isInteger(version) && version >= 0 ? version : null;
}

// The single place a presentation event enters client state. Strict parsing means a fact
// the contract does not list, a field it does not name, or a player's event on the public
// stream never gets past this point. Whether an event belongs to the seat on screen is
// decided where it meets that seat's view, by the director.
function read<Event extends { readonly matchId: string }>(
  payload: unknown, matchId: string, parse: (payload: unknown) => Event | null,
): EventOutcome<Event> {
  const version = probeEventProtocolVersion(payload);
  if (version !== null && !SUPPORTED_PROTOCOL_VERSIONS.includes(version)) return { kind: 'rejected', rejection: { kind: 'incompatible-protocol', receivedVersion: version } };
  const event = parse(payload);
  if (event === null) return { kind: 'rejected', rejection: { kind: 'unreadable' } };
  if (event.matchId !== matchId) return { kind: 'rejected', rejection: { kind: 'wrong-match' } };
  return { kind: 'accepted', event };
}

/** For the table display. A player's event fails this schema and cannot enter public state. */
export function readPublicEvent(payload: unknown, matchId: string): EventOutcome<PublicPresentationEvent> {
  return read(payload, matchId, candidate => {
    const result = PublicPresentationEventSchema.safeParse(candidate);
    return result.success ? result.data : null;
  });
}

/** For one seat. */
export function readPlayerEvent(payload: unknown, matchId: string): EventOutcome<PlayerPresentationEvent> {
  return read(payload, matchId, candidate => {
    const result = PlayerPresentationEventSchema.safeParse(candidate);
    return result.success ? result.data : null;
  });
}
