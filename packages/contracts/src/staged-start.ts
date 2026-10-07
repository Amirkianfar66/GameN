import { z } from 'zod';
import { IdentifierSchema, RevisionSchema, SeatIdSchema, TimestampSchema } from './protocol.js';
import { FullVersionsSchema } from './full-game.js';
import { CrewCharacterIdSchema, CrewDisplayNameSchema } from './lobby-identity.js';
import { RoleSchema } from './views.js';

export const SETUP_LIFECYCLE_VERSION = 'staged-start-1' as const;
const version = { schemaVersion: z.literal(1), protocolVersion: z.literal(2) };
const documentVersion = { ...version, lifecycleVersion: z.literal(SETUP_LIFECYCLE_VERSION) };
const playerCount = z.union([z.literal(7), z.literal(8), z.literal(9)]);
const bindingRevision = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
export const FullSetupStageSchema = z.enum(['lobby', 'choosing', 'awaiting-ready', 'running', 'aborted']);

/** Neutral startup progress only. Role previews are separate, own-UID documents. */
export const FullSetupDocumentSchema = z.strictObject({
  ...documentVersion, matchId: IdentifierSchema, playerCount, revision: RevisionSchema,
  stage: FullSetupStageSchema, dealId: IdentifierSchema.nullable(), setupId: IdentifierSchema.nullable(),
  choosingStartedAt: TimestampSchema.nullable(), choosingEndsAt: TimestampSchema.nullable(),
  readingStartedAt: TimestampSchema.nullable(), readingEndsAt: TimestampSchema.nullable(),
  seats: z.array(z.strictObject({ seatId: SeatIdSchema, confirmed: z.boolean(), ready: z.boolean() })).max(9),
}).refine(value => {
  const ids = value.seats.map(seat => seat.seatId);
  if (ids.length > value.playerCount || !ids.every((id, index) => Number(id.slice(5)) <= value.playerCount
    && (index === 0 || ids[index - 1]! < id)) || value.seats.some(seat => seat.ready && !seat.confirmed)) return false;
  const full = ids.length === value.playerCount;
  const unstarted = value.setupId === null && value.choosingStartedAt === null && value.choosingEndsAt === null
    && value.readingStartedAt === null && value.readingEndsAt === null;
  const choosingWindow = value.setupId !== null && value.choosingStartedAt !== null && value.choosingEndsAt !== null
    && value.choosingEndsAt - value.choosingStartedAt === 30_000;
  const choosingOnly = choosingWindow && value.readingStartedAt === null && value.readingEndsAt === null;
  const readingWindow = choosingWindow && value.readingStartedAt !== null && value.readingEndsAt !== null
    && value.readingStartedAt >= value.choosingEndsAt! && value.readingEndsAt - value.readingStartedAt === 30_000;
  if (value.stage === 'lobby') return unstarted && value.dealId === null && value.seats.every(seat => !seat.confirmed && !seat.ready);
  if (value.stage === 'choosing') return full && choosingOnly && value.dealId === null && value.seats.every(seat => !seat.ready);
  if (value.stage === 'awaiting-ready') return full && readingWindow && value.dealId !== null && value.seats.every(seat => seat.confirmed);
  if (value.stage === 'running') return full && readingWindow && value.dealId !== null && value.seats.every(seat => seat.confirmed && seat.ready);
  // An aborted setup retains one coherent timing subset rather than manufacturing a new deadline.
  return (unstarted && value.dealId === null && value.seats.every(seat => !seat.confirmed && !seat.ready))
    || (choosingOnly && value.dealId === null && value.seats.every(seat => !seat.ready))
    || (readingWindow && value.dealId !== null);
}, 'Sorted in-bounds seats, fixed 30-second setup windows and progress consistent with the stage required');

/** Partial pregame preview only; initial private knowledge arrives with live gameplay views. */
export const FullSetupPlayerViewSchema = z.strictObject({
  ...documentVersion, versions: FullVersionsSchema, matchId: IdentifierSchema, playerCount,
  dealId: IdentifierSchema, bindingRevision,
  audience: z.strictObject({ kind: z.literal('player'), seatId: SeatIdSchema }),
  self: z.strictObject({ seatId: SeatIdSchema, role: RoleSchema }),
}).refine(value => value.audience.seatId === value.self.seatId
  && Number(value.self.seatId.slice(5)) <= value.playerCount
  && (value.self.role !== 'Officer' || value.playerCount === 9)
  && (value.self.role !== 'Red Disabler' || value.playerCount >= 8),
'Own audience, in-bounds seat and role valid for this player mode required');

const request = { ...version, matchId: IdentifierSchema, requestId: IdentifierSchema };
export const FullBeginSetupRequestSchema = z.strictObject(request);
export const FullConfirmSetupChoiceRequestSchema = z.strictObject({
  ...request, bindingRevision, displayName: CrewDisplayNameSchema, characterId: CrewCharacterIdSchema,
});
export const FullReadyForMatchRequestSchema = z.strictObject({ ...request, dealId: IdentifierSchema, bindingRevision });

export const FullSetupErrorCodeSchema = z.enum([
  'UNAUTHENTICATED', 'FORBIDDEN', 'INVALID_REQUEST', 'UNSUPPORTED_PROTOCOL', 'UNSUPPORTED_SCHEMA',
  'REQUEST_ID_CONFLICT', 'UNAVAILABLE', 'RATE_LIMITED', 'ROSTER_INCOMPLETE', 'CHARACTER_TAKEN',
  'NAME_TAKEN', 'SETUP_LOCKED', 'STALE_DEAL', 'STALE_BINDING',
]);
const failure = z.strictObject({ ...version, ok: z.literal(false), serverTimeMs: TimestampSchema,
  error: z.strictObject({ code: FullSetupErrorCodeSchema, retryAfterMs: TimestampSchema.optional() }) });
const success = { ...request, ok: z.literal(true), serverTimeMs: TimestampSchema, revision: RevisionSchema };
export const FullBeginSetupResponseSchema = z.discriminatedUnion('ok', [
  z.strictObject({ ...success, stage: z.literal('choosing'), dealId: z.null() }),
  failure,
]);
export const FullConfirmSetupChoiceResponseSchema = z.discriminatedUnion('ok', [
  z.strictObject({ ...success, seatId: SeatIdSchema, bindingRevision,
    stage: z.enum(['choosing', 'awaiting-ready']), dealId: IdentifierSchema.nullable(),
  }).refine(value => (value.stage === 'choosing') === (value.dealId === null), 'Deal availability must match the confirmed stage'),
  failure,
]);
export const FullReadyForMatchResponseSchema = z.discriminatedUnion('ok', [
  z.strictObject({ ...success, seatId: SeatIdSchema, bindingRevision,
    stage: z.enum(['awaiting-ready', 'running']), dealId: IdentifierSchema }), failure,
]);

export type FullSetupStage = z.infer<typeof FullSetupStageSchema>;
export type FullSetupDocument = z.infer<typeof FullSetupDocumentSchema>;
export type FullSetupPlayerView = z.infer<typeof FullSetupPlayerViewSchema>;
export type FullSetupErrorCode = z.infer<typeof FullSetupErrorCodeSchema>;
export type FullBeginSetupRequest = z.infer<typeof FullBeginSetupRequestSchema>;
export type FullConfirmSetupChoiceRequest = z.infer<typeof FullConfirmSetupChoiceRequestSchema>;
export type FullReadyForMatchRequest = z.infer<typeof FullReadyForMatchRequestSchema>;
export type FullBeginSetupResponse = z.infer<typeof FullBeginSetupResponseSchema>;
export type FullConfirmSetupChoiceResponse = z.infer<typeof FullConfirmSetupChoiceResponseSchema>;
export type FullReadyForMatchResponse = z.infer<typeof FullReadyForMatchResponseSchema>;
