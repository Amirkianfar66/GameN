import { z } from 'zod';
import { IdentifierSchema, PROTOCOL_VERSION, RevisionSchema, SeatIdSchema } from './protocol.js';
import { HealthSchema, LocationSchema } from './views.js';

const eventContext = {
  protocolVersion: z.literal(PROTOCOL_VERSION),
  matchId: IdentifierSchema,
  eventId: IdentifierSchema,
  viewRevision: RevisionSchema,
};
const publicFactOptions = [
  z.strictObject({ type: z.literal('PHASE_CHANGED'), phaseId: IdentifierSchema }),
  z.strictObject({ type: z.literal('PUBLIC_MOVE'), seatId: SeatIdSchema, from: LocationSchema, to: LocationSchema }),
  z.strictObject({ type: z.literal('PUBLIC_HEALTH_CHANGED'), seatId: SeatIdSchema, health: HealthSchema }),
] as const;

export const PublicPresentationEventSchema = z.strictObject({
  ...eventContext,
  audience: z.strictObject({ kind: z.literal('public') }),
  fact: z.discriminatedUnion('type', publicFactOptions),
});
export type PublicPresentationEvent = z.infer<typeof PublicPresentationEventSchema>;
export const PlayerPresentationEventSchema = z.strictObject({
  ...eventContext,
  audience: z.strictObject({ kind: z.literal('player'), seatId: SeatIdSchema }),
  fact: z.discriminatedUnion('type', [
    ...publicFactOptions,
    z.strictObject({ type: z.literal('COMMAND_REGISTERED'), commandId: IdentifierSchema }),
  ]),
});
export type PlayerPresentationEvent = z.infer<typeof PlayerPresentationEventSchema>;
export type PresentationEvent = PublicPresentationEvent | PlayerPresentationEvent;

// Intentionally absent: shooter/trajectory, Protection ownership, BLOCKED/BANG.
// RULE-003 must be approved before introducing effect-specific disclosure.
