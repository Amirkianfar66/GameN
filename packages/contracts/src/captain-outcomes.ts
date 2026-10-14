import { z } from 'zod';
import { IdentifierSchema, SeatIdSchema, RevisionSchema, TimestampSchema } from './protocol.js';
import { LocationSchema, HealthSchema } from './views.js';
import { BoardSlotIdSchema } from './board-medical.js';
import { supportsCaptainCommands } from './full-game-versions.js';

const checkpoint = { phaseId:IdentifierSchema, round:z.number().int().min(1).max(5) };
export const ClinicalOutcomeFactSchema = z.strictObject({ ...checkpoint, type:z.literal('MEDICAL_OUTCOME'),
  kind:z.enum(['INJURY','HEALED','DEATH']),seatId:SeatIdSchema,health:HealthSchema }).refine(f =>
  f.health === (f.kind === 'INJURY' ? 'Injured' : f.kind === 'HEALED' ? 'Healthy' : 'Eliminated'), 'Exact clinical consequence');
export const CaptainOutcomeFactSchema = z.strictObject({ ...checkpoint,type:z.literal('CAPTAIN_OUTCOME'),kind:z.enum(['RELEASE','EJECT']),
  seatIds:z.array(SeatIdSchema).min(1).max(9).refine(ids=>new Set(ids).size===ids.length) });
export const PlacementOutcomeFactSchema = z.strictObject({ ...checkpoint,type:z.literal('BOARD_PLACEMENT_CHANGED'),
  seatId:SeatIdSchema,location:LocationSchema.nullable(),slotId:BoardSlotIdSchema.nullable() }).refine(f => {
  if(f.location===null) return f.slotId===null;
  const prefix:Record<string,string>={'Room A':'A','Room B':'B',Jail:'J',Hospital:'H','Command Room':'C'};
  return f.slotId!==null && prefix[f.location]!==undefined && f.slotId.startsWith(prefix[f.location]!);
},'Physical placement or retained offboard');
export const FullOutcomeFactSchema = z.union([ClinicalOutcomeFactSchema,CaptainOutcomeFactSchema,PlacementOutcomeFactSchema]);
export type FullOutcomeFact = z.infer<typeof FullOutcomeFactSchema>;
export const OutcomeGameplayPinsSchema=z.strictObject({protocolVersion:z.literal(2),engineVersion:z.string().min(1).max(128),
  rulesetVersion:IdentifierSchema,rulesetHash:z.string().regex(/^[a-f0-9]{64}$/)}).refine(supportsCaptainCommands,'Exact outcome-capable tuple');
export const ClinicalPresentationAnchorSchema=z.strictObject({kind:z.literal('CLINICAL_VIGNETTE'),batchId:IdentifierSchema,
  anchorId:z.string().regex(/^HV[1-9]$/),slotCount:z.union([z.literal(7),z.literal(8),z.literal(9)])
}).refine(a=>Number(a.anchorId.slice(2))<=a.slotCount,'Clinical anchor is within starting geometry');
export type ClinicalPresentationAnchor=z.infer<typeof ClinicalPresentationAnchorSchema>;
export const validClinicalAnchorForPlayerCount=(anchor:ClinicalPresentationAnchor,playerCount:7|8|9):boolean=>
  ClinicalPresentationAnchorSchema.safeParse(anchor).success && anchor.slotCount===playerCount;
const wireFact=z.union([ClinicalOutcomeFactSchema.safeExtend({presentationAnchor:ClinicalPresentationAnchorSchema}),CaptainOutcomeFactSchema,PlacementOutcomeFactSchema]);
const event={protocolVersion:z.literal(2),matchId:IdentifierSchema,eventId:IdentifierSchema,viewRevision:RevisionSchema,
  versions:OutcomeGameplayPinsSchema,outcomeId:IdentifierSchema,publishedAt:TimestampSchema,expiresAt:TimestampSchema,fact:wireFact};
export const FullOutcomePublicEventSchema=z.strictObject({...event,audience:z.strictObject({kind:z.literal('public')})});
export const FullOutcomePlayerEventSchema=z.strictObject({...event,audience:z.strictObject({kind:z.literal('player'),seatId:SeatIdSchema})});
export const FullOutcomeEventSchema=z.union([FullOutcomePublicEventSchema,FullOutcomePlayerEventSchema]).refine(e=>e.outcomeId===e.eventId && e.expiresAt-e.publishedAt===30_000,'Stable audience occurrence identity');
