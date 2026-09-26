import { z } from 'zod';

export const PROTOCOL_VERSION = 1 as const;
export const IdentifierSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/);
export const SeatIdSchema = z.enum(['seat-1', 'seat-2', 'seat-3', 'seat-4', 'seat-5', 'seat-6', 'seat-7', 'seat-8', 'seat-9']);
export const TimestampSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const RevisionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export type SeatId = z.infer<typeof SeatIdSchema>;

const requestContext = {
  protocolVersion: z.literal(PROTOCOL_VERSION),
  matchId: IdentifierSchema,
  phaseId: IdentifierSchema,
};

// Transport obtains identity from verified Auth. No actor, clock or outcome input.
export const RegisterShotSchema = z.strictObject({
  ...requestContext,
  commandId: IdentifierSchema,
  command: z.strictObject({ type: z.literal('REGISTER_SHOT'), targetSeatId: SeatIdSchema }),
});
export type RegisterShot = z.infer<typeof RegisterShotSchema>;

const receiptContext = { ...requestContext, commandId: IdentifierSchema };
export const ReceiptSchema = z.discriminatedUnion('status', [
  z.strictObject({ ...receiptContext, status: z.literal('accepted'), code: z.literal('REGISTERED') }),
  z.strictObject({ ...receiptContext, status: z.literal('rejected'), code: z.enum(['PHASE_CLOSED', 'NOT_ALLOWED']) }),
]);
export type Receipt = z.infer<typeof ReceiptSchema>;

// These errors are separate from durable game receipts; never attach raw errors or secrets.
export const ApiErrorSchema = z.strictObject({
  code: z.enum(['UNAUTHENTICATED', 'FORBIDDEN', 'INVALID_REQUEST', 'UNSUPPORTED_PROTOCOL', 'COMMAND_ID_CONFLICT', 'UNAVAILABLE']),
});
export const ApiFailureSchema = z.strictObject({ ok: z.literal(false), serverTimeMs: TimestampSchema, error: ApiErrorSchema });
export type ApiFailure = z.infer<typeof ApiFailureSchema>;
export const CommandResponseSchema = z.discriminatedUnion('ok', [
  z.strictObject({ ok: z.literal(true), serverTimeMs: TimestampSchema, receipt: ReceiptSchema }),
  ApiFailureSchema,
]);
export type CommandResponse = z.infer<typeof CommandResponseSchema>;

export const ReceiptLookupRequestSchema = z.strictObject({
  protocolVersion: z.literal(PROTOCOL_VERSION), matchId: IdentifierSchema, commandId: IdentifierSchema,
});
export type ReceiptLookupRequest = z.infer<typeof ReceiptLookupRequestSchema>;
export const ReceiptLookupResponseSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('found'), serverTimeMs: TimestampSchema, receipt: ReceiptSchema }),
  z.strictObject({ status: z.literal('unknown'), serverTimeMs: TimestampSchema }),
]);
export type ReceiptLookupResponse = z.infer<typeof ReceiptLookupResponseSchema>;

export const AdvanceIfExpiredRequestSchema = z.strictObject(requestContext);
export type AdvanceIfExpiredRequest = z.infer<typeof AdvanceIfExpiredRequestSchema>;
export const AdvanceIfExpiredResponseSchema = z.strictObject({
  ...requestContext, serverTimeMs: TimestampSchema, result: z.enum(['advanced', 'unchanged']),
});
export type AdvanceIfExpiredResponse = z.infer<typeof AdvanceIfExpiredResponseSchema>;
export const ServerTimeResponseSchema = z.strictObject({ protocolVersion: z.literal(PROTOCOL_VERSION), serverTimeMs: TimestampSchema });
export type ServerTimeResponse = z.infer<typeof ServerTimeResponseSchema>;
