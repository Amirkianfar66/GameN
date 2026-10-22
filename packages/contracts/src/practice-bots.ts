import { z } from 'zod';
import { IdentifierSchema, RevisionSchema, SeatIdSchema, TimestampSchema } from './protocol.js';

export const PRACTICE_BOT_POLICY_VERSION = 'practice-1' as const;
const version = { schemaVersion: z.literal(1), protocolVersion: z.literal(2) };
const botSeatIds = z.array(SeatIdSchema).max(9).refine(ids =>
  ids.every((seatId, index) => index === 0 || ids[index - 1]! < seatId),
  'Bot seats must be unique and sorted');

/** Host-authorized practice configuration; identity never comes from request fields. */
export const FullSetPracticeBotsRequestSchema = z.strictObject({
  ...version, requestId: IdentifierSchema, matchId: IdentifierSchema,
  botCount: z.number().int().min(0).max(9),
});
/** Independent public metadata. Bot identities contain no role or decision evidence. */
export const FullPracticeBotsDocumentSchema = z.strictObject({
  ...version, matchId: IdentifierSchema, revision: RevisionSchema,
  policyVersion: z.literal(PRACTICE_BOT_POLICY_VERSION), botSeatIds,
});
export const FullPracticeBotsErrorCodeSchema = z.enum([
  'UNAUTHENTICATED', 'FORBIDDEN', 'INVALID_REQUEST', 'UNSUPPORTED_PROTOCOL', 'UNSUPPORTED_SCHEMA',
  'REQUEST_ID_CONFLICT', 'LOBBY_LOCKED', 'CAPACITY_EXCEEDED', 'UNAVAILABLE', 'RATE_LIMITED',
]);
export const FullSetPracticeBotsResponseSchema = z.discriminatedUnion('ok', [
  z.strictObject({ ...version, ok: z.literal(true), serverTimeMs: TimestampSchema,
    matchId: IdentifierSchema, requestId: IdentifierSchema, revision: RevisionSchema, botSeatIds }),
  z.strictObject({ ...version, ok: z.literal(false), serverTimeMs: TimestampSchema,
    error: z.strictObject({ code: FullPracticeBotsErrorCodeSchema, retryAfterMs: TimestampSchema.optional() }) }),
]);
export type FullSetPracticeBotsRequest = z.infer<typeof FullSetPracticeBotsRequestSchema>;
export type FullPracticeBotsDocument = z.infer<typeof FullPracticeBotsDocumentSchema>;
export type FullPracticeBotsErrorCode = z.infer<typeof FullPracticeBotsErrorCodeSchema>;
export type FullSetPracticeBotsResponse = z.infer<typeof FullSetPracticeBotsResponseSchema>;
