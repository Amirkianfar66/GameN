import { z } from 'zod';
import { IdentifierSchema, SeatIdSchema, RevisionSchema, TimestampSchema } from './protocol.js';

// Independent public identity document: no fields are added to protocol-2 game views.
export const CREW_CATALOG_VERSION = 'crew-0.1.0' as const;
export const CREW_NAME_MAX_LENGTH = 12;
export const CrewCharacterIdSchema = z.enum(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9']);
export const CrewDisplayNameSchema = z.string().refine(value =>
  [...value].length >= 1 && [...value].length <= CREW_NAME_MAX_LENGTH
  && value.trim().length > 0 && !/[\p{Cc}\p{Cs}]/u.test(value),
  'Names require 1..12 Unicode code points, nonblank text and no controls or lone surrogates');
const version = { schemaVersion: z.literal(1), protocolVersion: z.literal(2) };
export const FullLobbyIdentityDocumentSchema = z.strictObject({
  ...version, catalogVersion: z.literal(CREW_CATALOG_VERSION), matchId: IdentifierSchema,
  revision: RevisionSchema, locked: z.boolean(),
  seats: z.array(z.strictObject({
    seatId: SeatIdSchema, displayName: CrewDisplayNameSchema.nullable(), characterId: CrewCharacterIdSchema.nullable(),
  })).max(9),
}).refine(value => new Set(value.seats.map(seat => seat.seatId)).size === value.seats.length
  && value.seats.every(seat => (seat.displayName === null) === (seat.characterId === null))
  && new Set(value.seats.filter(seat => seat.characterId !== null).map(seat => seat.characterId)).size
    === value.seats.filter(seat => seat.characterId !== null).length,
'Unique seats/characters and paired selected or null identity required');
export const FullSetLobbyIdentityRequestSchema = z.strictObject({
  ...version, requestId: IdentifierSchema, matchId: IdentifierSchema,
  displayName: CrewDisplayNameSchema, characterId: CrewCharacterIdSchema,
});
export const FullLobbyIdentityErrorCodeSchema = z.enum([
  'UNAUTHENTICATED', 'FORBIDDEN', 'INVALID_REQUEST', 'UNSUPPORTED_PROTOCOL', 'UNSUPPORTED_SCHEMA',
  'REQUEST_ID_CONFLICT', 'CHARACTER_TAKEN', 'IDENTITY_LOCKED', 'UNAVAILABLE', 'RATE_LIMITED',
]);
export const FullSetLobbyIdentityResponseSchema = z.discriminatedUnion('ok', [
  z.strictObject({ ...version, ok: z.literal(true), serverTimeMs: TimestampSchema, revision: RevisionSchema }),
  z.strictObject({ ...version, ok: z.literal(false), serverTimeMs: TimestampSchema,
    error: z.strictObject({ code: FullLobbyIdentityErrorCodeSchema, retryAfterMs: TimestampSchema.optional() }) }),
]);
export type CrewCharacterId = z.infer<typeof CrewCharacterIdSchema>;
export type FullLobbyIdentityDocument = z.infer<typeof FullLobbyIdentityDocumentSchema>;
export type FullSetLobbyIdentityRequest = z.infer<typeof FullSetLobbyIdentityRequestSchema>;
export type FullSetLobbyIdentityResponse = z.infer<typeof FullSetLobbyIdentityResponseSchema>;
