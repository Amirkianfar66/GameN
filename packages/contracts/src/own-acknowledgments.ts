import { z } from 'zod';
import { IdentifierSchema, RevisionSchema, SeatIdSchema } from './protocol.js';
import type { SeatId } from './protocol.js';

export const OWN_ACKNOWLEDGMENTS_SCHEMA_VERSION = 1 as const;
const bindingRevision = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
export const SupplierGrantResultSchema = z.strictObject({
  round: z.literal(3), commandId: IdentifierSchema,
  successfulRecipientSeatIds: z.array(SeatIdSchema).max(2).refine(ids => new Set(ids).size === ids.length),
});
export type SupplierGrantResult = z.infer<typeof SupplierGrantResultSchema>;
export const ReceivedSupplySchema = z.strictObject({ round: z.literal(3), ordinaryWeaponsGranted: z.literal(1) });
export const OwnAcknowledgmentsSchema = z.strictObject({
  schemaVersion: z.literal(1), protocolVersion: z.literal(2), matchId: IdentifierSchema,
  seatId: SeatIdSchema, bindingRevision, revision: RevisionSchema, historyAvailable: z.boolean(),
  supplierResults: z.array(SupplierGrantResultSchema).max(1),
  receivedSupply: z.array(ReceivedSupplySchema).max(1),
}).refine(value => (value.historyAvailable || (value.supplierResults.length === 0 && value.receivedSupply.length === 0))
  && value.revision === value.bindingRevision - 1 + (value.historyAvailable ? 1 : 0)
    + value.supplierResults.length + value.receivedSupply.length,
  'Acknowledgment revision and history must match this audience');
export type OwnAcknowledgments = z.infer<typeof OwnAcknowledgmentsSchema>;
export const OwnAcknowledgmentsReadSchema = OwnAcknowledgmentsSchema.nullable();

/** Missing documents are a supported legacy history-unavailable fallback. */
export function parseOwnAcknowledgments(payload: unknown, expected: {
  matchId: string; seatId: SeatId; bindingRevision?: number;
}): OwnAcknowledgments | null {
  if (payload === null || payload === undefined) return null;
  const result = OwnAcknowledgmentsSchema.parse(payload);
  if (result.matchId !== expected.matchId || result.seatId !== expected.seatId
    || (expected.bindingRevision !== undefined && result.bindingRevision !== expected.bindingRevision)) {
    throw new Error('Acknowledgment audience or binding does not match');
  }
  return result;
}

/** Own seat metadata only; the service and Rules still enforce the reverse binding. */
export const SeatSessionSchema = z.strictObject({
  schemaVersion: z.literal(1), protocolVersion: z.literal(2), matchId: IdentifierSchema,
  seatId: SeatIdSchema, bindingRevision,
});
export type SeatSession = z.infer<typeof SeatSessionSchema>;

/** Missing own session metadata is a supported legacy fallback. */
export function parseSeatSession(payload: unknown, expected: { matchId: string; seatId: SeatId }): SeatSession | null {
  if (payload === null || payload === undefined) return null;
  const result = SeatSessionSchema.parse(payload);
  if (result.matchId !== expected.matchId || result.seatId !== expected.seatId) {
    throw new Error('Seat session audience does not match');
  }
  return result;
}
