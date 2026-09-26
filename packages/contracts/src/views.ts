import { z } from 'zod';
import { IdentifierSchema, PROTOCOL_VERSION, RevisionSchema, SeatIdSchema, TimestampSchema } from './protocol.js';

export const VersionsSchema = z.strictObject({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  rulesetVersion: IdentifierSchema,
  rulesetHash: z.string().regex(/^[a-f0-9]{64}$/),
  engineVersion: z.string().min(1).max(128),
  assetManifestVersion: z.string().min(1).max(128),
});
export const RoleSchema = z.enum(['Officer', 'Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Red Disabler', 'Alien']);
export const LocationSchema = z.enum(['Room A', 'Room B', 'Command Room', 'Hospital', 'Jail', 'Final Zone']);
export const HealthSchema = z.enum(['Healthy', 'Injured', 'Eliminated']);
export const PublicSeatSchema = z.strictObject({
  seatId: SeatIdSchema, location: LocationSchema, health: HealthSchema,
  jailed: z.boolean(), captain: z.boolean(),
});
export const PhaseSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    id: IdentifierSchema, kind: z.literal('ORDINARY_TURN'), startedAt: TimestampSchema, endsAt: TimestampSchema,
  }).refine(p => p.endsAt - p.startedAt === 60_000, 'Ordinary turn is 60 seconds'),
  // No invented resolution deadline, vote duration, pause or automatic next phase.
  z.strictObject({ id: IdentifierSchema, kind: z.literal('ROUND_RESOLUTION'), startedAt: TimestampSchema, endsAt: z.null() }),
]);

const facts = {
  versions: VersionsSchema,
  matchId: IdentifierSchema,
  viewRevision: RevisionSchema,
  playerCount: z.literal(9),
  round: z.number().int().min(1).max(5),
  phase: PhaseSchema,
  activeSeatId: SeatIdSchema.nullable(),
  seats: z.array(PublicSeatSchema).length(9).refine(seats => new Set(seats.map(s => s.seatId)).size === 9, 'Nine unique seats required'),
};

export const PublicViewSchema = z.strictObject({ ...facts, audience: z.strictObject({ kind: z.literal('public') }) });
export type PublicView = z.infer<typeof PublicViewSchema>;

// A complete composed snapshot with its own revision, never PublicView + a private patch.
export const PlayerViewSchema = z.strictObject({
  ...facts,
  audience: z.strictObject({ kind: z.literal('player'), seatId: SeatIdSchema }),
  self: z.strictObject({ seatId: SeatIdSchema, role: RoleSchema, shotAvailable: z.boolean() }),
  ownPendingCommandIds: z.array(IdentifierSchema).max(1),
}).refine(view => view.audience.seatId === view.self.seatId, 'Player view must belong to its audience');
export type PlayerView = z.infer<typeof PlayerViewSchema>;
export type AudienceView = PublicView | PlayerView;
