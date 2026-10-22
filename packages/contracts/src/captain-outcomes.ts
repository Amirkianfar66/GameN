import { RoomBlockFactSchema } from './blackout.js';
import { z } from 'zod';
import { IdentifierSchema, SeatIdSchema, RevisionSchema, TimestampSchema } from './protocol.js';
import { LocationSchema, HealthSchema } from './views.js';
import { BoardSlotIdSchema } from './board-medical.js';
import { supportsCaptainCommands, supportsBlackout, supportsHospitalFour } from './full-game-versions.js';

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
export const HospitalOverflowFactSchema = z.strictObject({...checkpoint,type:z.literal('HOSPITAL_OVERFLOW_REMOVED'),seatId:SeatIdSchema});
export const FullOutcomeFactSchema = z.union([ClinicalOutcomeFactSchema,CaptainOutcomeFactSchema,PlacementOutcomeFactSchema,RoomBlockFactSchema,HospitalOverflowFactSchema]);
export type FullOutcomeFact = z.infer<typeof FullOutcomeFactSchema>;
export const OutcomeGameplayPinsSchema=z.strictObject({protocolVersion:z.literal(2),engineVersion:z.string().min(1).max(128),
  rulesetVersion:IdentifierSchema,rulesetHash:z.string().regex(/^[a-f0-9]{64}$/)}).refine(supportsCaptainCommands,'Exact outcome-capable tuple');
export const ClinicalPresentationAnchorSchema=z.strictObject({kind:z.literal('CLINICAL_VIGNETTE'),batchId:IdentifierSchema,
  anchorId:z.string().regex(/^HV[1-9]$/),slotCount:z.union([z.literal(7),z.literal(8),z.literal(9)])
}).refine(a=>Number(a.anchorId.slice(2))<=a.slotCount,'Clinical anchor is within starting geometry');
export type ClinicalPresentationAnchor=z.infer<typeof ClinicalPresentationAnchorSchema>;
export const validClinicalAnchorForPlayerCount=(anchor:ClinicalPresentationAnchor,playerCount:7|8|9):boolean=>
  ClinicalPresentationAnchorSchema.safeParse(anchor).success && anchor.slotCount===playerCount;
const wireFact=z.union([ClinicalOutcomeFactSchema.safeExtend({presentationAnchor:ClinicalPresentationAnchorSchema}),CaptainOutcomeFactSchema,PlacementOutcomeFactSchema,HospitalOverflowFactSchema]);
const event={protocolVersion:z.literal(2),matchId:IdentifierSchema,eventId:IdentifierSchema,viewRevision:RevisionSchema,
  versions:OutcomeGameplayPinsSchema,outcomeId:IdentifierSchema,publishedAt:TimestampSchema,expiresAt:TimestampSchema,fact:wireFact};
function validSuccessorOutcome(e:{versions:import('./full-game-versions.js').FullGameplayPins;fact:FullOutcomeFact}):boolean {
  if(e.fact.type==='HOSPITAL_OVERFLOW_REMOVED' && !supportsHospitalFour(e.versions))return false;
  if(supportsHospitalFour(e.versions) && (e.fact.type==='BOARD_PLACEMENT_CHANGED' || e.fact.type==='ATTACK_BLOCKED') && e.fact.location==='Hospital' && Number(e.fact.slotId?.slice(1))>4)return false;
  return true;
}
export const FullOutcomePublicEventSchema=z.strictObject({...event,audience:z.strictObject({kind:z.literal('public')})}).refine(validSuccessorOutcome,'Exact successor occurrence/physical anchor');
export const FullOutcomePlayerEventSchema=z.strictObject({...event,fact:z.union([wireFact,RoomBlockFactSchema]),audience:z.strictObject({kind:z.literal('player'),seatId:SeatIdSchema})}).refine(validSuccessorOutcome,'Exact successor occurrence/physical anchor').refine(e=>e.fact.type!=='ATTACK_BLOCKED' || supportsBlackout(e.versions),'Exact room-defense tuple');
export const FullOutcomeEventSchema=z.union([FullOutcomePublicEventSchema,FullOutcomePlayerEventSchema]).refine(e=>e.outcomeId===e.eventId && e.expiresAt-e.publishedAt===30_000 && (e.fact.type!=='ATTACK_BLOCKED' || supportsBlackout(e.versions)),'Stable audience occurrence identity');
