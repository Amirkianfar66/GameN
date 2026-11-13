import { z } from 'zod';
import { IdentifierSchema, SeatIdSchema, TimestampSchema, RevisionSchema } from './protocol.js';
import { ClinicalPresentationAnchorSchema } from './captain-outcomes.js';

/** Separate successor wire contract. Never reinterpret a saved protocol-2 match. */
export const PLANET_ORIGINAL_PINS = Object.freeze({
  protocolVersion: 3 as const, engineVersion: 'planet-game-1.0.0' as const,
  rulesetVersion: 'in-person-planet-2026-11-05' as const,
  rulesetHash: '32cde63d777ed93744637f911c134247272dc862524bd5aa9d0c3cd405dbe8ea' as const,
});
export const PLANET_SYNC_PINS = Object.freeze({
  protocolVersion: 3 as const, engineVersion: 'planet-game-1.0.1' as const,
  rulesetVersion: 'in-person-planet-sync-six-2026-11-05' as const,
  rulesetHash: '4f26343641fcff00480bb3c0ba852703418f772bb677117a272828ad229c8b1c' as const,
});
export const PLANET_GAME_PINS = Object.freeze({
  protocolVersion: 3 as const, engineVersion: 'planet-game-1.1.0' as const,
  rulesetVersion: 'in-person-planet-private-feedback-2026-11-06' as const,
  rulesetHash: '4a1fc0e0dc21255253e31ae46e6042f9bd71e3fdec0f82f8a79b3ce213d01bfa' as const,
});
/** Compatible private-offer implementation; canonical gameplay rules and creation defaults stay unchanged. */
export const PLANET_PHONE_OFFER_PINS = Object.freeze({
  ...PLANET_GAME_PINS, engineVersion: 'planet-game-1.2.0' as const,
});
export const PLANET_PHONE_ENGINE_PROFILE = 'phone-private-choices-1.2' as const;
/** Owner-approved pre-vote Blackout successor; never selected by changing historical defaults. */
export const PLANET_BLACKOUT_PINS = Object.freeze({
  protocolVersion: 3 as const, engineVersion: 'planet-game-1.3.0' as const,
  rulesetVersion: 'in-person-planet-blackout-before-vote-2026-11-10' as const,
  rulesetHash: '2505515ad41e9d49c06bd14aaf9dab56dcf0adb471725c1c15d877a0f0b97556' as const,
});
export const PLANET_BLACKOUT_ENGINE_PROFILE = 'blackout-before-vote-1.3' as const;
/** Explicit opt-in Food successor. Historical creation defaults are unchanged. */
export const PLANET_FOOD_TASK_PINS = Object.freeze({
  protocolVersion: 3 as const, engineVersion: 'planet-game-1.4.0' as const,
  rulesetVersion: 'in-person-planet-food-task-2026-11-12' as const,
  rulesetHash: '7a12428b37a0cd7382c98b1772fc46444899d9be7b64ad60f6c0cea8bc3c9333' as const,
});
export const PLANET_FOOD_TASK_ENGINE_PROFILE = 'food-task-1.4' as const;
const assetVersion = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/);
const pinnedVersions = <E extends string,R extends string,H extends string>(pins:{engineVersion:E;rulesetVersion:R;rulesetHash:H}) => z.strictObject({
  protocolVersion:z.literal(3),engineVersion:z.literal(pins.engineVersion),rulesetVersion:z.literal(pins.rulesetVersion),rulesetHash:z.literal(pins.rulesetHash),assetManifestVersion:assetVersion,
});
export const PlanetVersionsSchema = z.union([pinnedVersions(PLANET_FOOD_TASK_PINS),pinnedVersions(PLANET_BLACKOUT_PINS),pinnedVersions(PLANET_PHONE_OFFER_PINS),pinnedVersions(PLANET_GAME_PINS),pinnedVersions(PLANET_SYNC_PINS),pinnedVersions(PLANET_ORIGINAL_PINS)]);
export type PlanetVersions = z.infer<typeof PlanetVersionsSchema>;
export const PlanetRoundSchema = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER - 2);
export const PlanetRoleSchema = z.enum(['Insider','Doctor','Blue Disabler','Supplier','Undercover','Hacker','Alien','Red Disabler','Engineer']);
export type PlanetRole = z.infer<typeof PlanetRoleSchema>;
export const PlanetFactionSchema = z.enum(['Blue','Red','Alien']);
export type PlanetFaction = z.infer<typeof PlanetFactionSchema>;
export const PlanetLocationSchema = z.enum(['Room A','Room B','Command Room','Hospital','Jail']);
export type PlanetLocation = z.infer<typeof PlanetLocationSchema>;
export const PlanetHealthSchema = z.enum(['Healthy','Injured','Eliminated']);
export const PlanetSlotIdSchema = z.enum(['A1','A2','A3','A4','A5','B1','B2','B3','B4','B5','C1','H1','H2','H3','H4','J1','J2','J3','J4','J5']);
export type PlanetSlotId = z.infer<typeof PlanetSlotIdSchema>;
export const PlanetWindowIdSchema = z.enum(['A_B','A_HOSPITAL','B_JAIL']);
export type PlanetWindowId = z.infer<typeof PlanetWindowIdSchema>;
export const PlanetDirectionSchema = z.enum(['Blue','Red']);
export type PlanetDirection = z.infer<typeof PlanetDirectionSchema>;
export const PlanetRoutePositionSchema = z.enum(['Start','Junction','B1','B2','Blue Planet','R1','R2','Red Planet']);
export type PlanetRoutePosition = z.infer<typeof PlanetRoutePositionSchema>;
export const PlanetPromiseKindSchema = z.enum(['CAPTAIN_SUPPORT','OFFICER_SELECTION','JAIL_VOTE','NO_JAIL_VOTE','MEET_A','MEET_B']);
export type PlanetPromiseKind = z.infer<typeof PlanetPromiseKindSchema>;
export const PlanetPromiseStatusSchema = z.enum(['Pending','Fulfilled','Not fulfilled','Condition not met']);
const ids = z.array(SeatIdSchema).max(9).refine(v => new Set(v).size === v.length, 'Distinct player identities required');
const code = z.array(SeatIdSchema).length(4).refine(v => new Set(v).size === 4, 'Four distinct original player identities required');

/** Only bounded vector strokes; never accept script, HTML, SVG markup or remote URLs. */
export const PlanetDrawingSchema = z.strictObject({
  strokes: z.array(z.strictObject({
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    width: z.number().min(1).max(24),
    points: z.array(z.tuple([z.number().min(0).max(1),z.number().min(0).max(1)])).min(1).max(512),
  })).min(1).max(128),
}).refine(d => d.strokes.reduce((n,s)=>n+s.points.length,0) <= 4096, 'Drawing point budget exceeded');
export type PlanetDrawing = z.infer<typeof PlanetDrawingSchema>;

export const PlanetCommandSchema = z.discriminatedUnion('type', [
  z.strictObject({type:z.literal('PASS_TURN')}),
  z.strictObject({type:z.literal('MOVE'),destination:z.enum(['Room A','Room B','Command Room']),slotId:PlanetSlotIdSchema}),
  z.strictObject({type:z.literal('REGISTER_SHOT'),targetSeatId:SeatIdSchema}),
  z.strictObject({type:z.literal('PROTECT'),targetSeatId:SeatIdSchema}),
  z.strictObject({type:z.literal('RESCUE'),targetSeatId:SeatIdSchema}),
  z.strictObject({type:z.literal('SUPPLY'),targetSeatIds:z.array(SeatIdSchema).length(2).refine(v=>new Set(v).size===2)}),
  z.strictObject({type:z.literal('SCAN'),targetSeatId:SeatIdSchema,guess:PlanetFactionSchema}),
  z.strictObject({type:z.literal('SUBMIT_CODE'),seatIds:code}),
  z.strictObject({type:z.literal('ACTIVATE_SHIP_HACK')}),
  z.strictObject({type:z.literal('ENGINEER_SUPPRESS')}),
  z.strictObject({type:z.literal('ACTIVATE_BLACKHOLE')}),
  z.strictObject({type:z.literal('ACTIVATE_CLONE')}),
  z.strictObject({type:z.literal('REQUEST_BLACKOUT')}),
  z.strictObject({type:z.literal('SELECT_BLACKOUT_SLOT'),windowId:IdentifierSchema,slotId:PlanetSlotIdSchema}),
  z.strictObject({type:z.literal('CAPTAIN_RELEASE')}),
  z.strictObject({type:z.literal('CAPTAIN_EJECT')}),
  z.strictObject({type:z.literal('APPOINT_OFFICER'),targetSeatId:SeatIdSchema}),
  z.strictObject({type:z.literal('BLOCK_MOVE'),targetSeatId:SeatIdSchema}),
  z.strictObject({type:z.literal('CHOOSE_NAV_DIRECTION'),direction:PlanetDirectionSchema}),
  z.strictObject({type:z.literal('CONFIRM_NAVIGATION')}),
  z.strictObject({type:z.literal('VOTE'),targetSeatId:SeatIdSchema.nullable()}),
  z.strictObject({type:z.literal('REQUEST_HACK'),targetSeatId:SeatIdSchema}),
  z.strictObject({type:z.literal('DECLARE_HACK_SIDE'),declaredSide:PlanetFactionSchema}),
  z.strictObject({type:z.literal('PANEL_CODE'),doctorSeatId:SeatIdSchema}),
  z.strictObject({type:z.literal('OFFER_PROMISE'),recipientSeatId:SeatIdSchema,kind:PlanetPromiseKindSchema,targetSeatId:SeatIdSchema.nullable()}),
  z.strictObject({type:z.literal('ACCEPT_PROMISE'),promiseId:IdentifierSchema}),
  z.strictObject({type:z.literal('DECLINE_PROMISE'),promiseId:IdentifierSchema}),
  z.strictObject({type:z.literal('SHOW_WINDOW'),windowId:PlanetWindowIdSchema,drawing:PlanetDrawingSchema}),
]);
export type PlanetCommand = z.infer<typeof PlanetCommandSchema>;
export const PlanetCommandTypeSchema = z.enum([
  'PASS_TURN','MOVE','REGISTER_SHOT','PROTECT','RESCUE','SUPPLY','SCAN','SUBMIT_CODE','ACTIVATE_SHIP_HACK','ENGINEER_SUPPRESS',
  'ACTIVATE_BLACKHOLE','ACTIVATE_CLONE','REQUEST_BLACKOUT','SELECT_BLACKOUT_SLOT','CAPTAIN_RELEASE','CAPTAIN_EJECT','APPOINT_OFFICER',
  'BLOCK_MOVE','CHOOSE_NAV_DIRECTION','CONFIRM_NAVIGATION','VOTE','REQUEST_HACK','DECLARE_HACK_SIDE','PANEL_CODE',
  'OFFER_PROMISE','ACCEPT_PROMISE','DECLINE_PROMISE','SHOW_WINDOW',
]);
const context = {protocolVersion:z.literal(3),matchId:IdentifierSchema,commandId:IdentifierSchema,phaseId:IdentifierSchema};
export const PlanetCommandRequestSchema = z.strictObject({...context,command:PlanetCommandSchema});
export type PlanetCommandRequest = z.infer<typeof PlanetCommandRequestSchema>;
export const PlanetReceiptSchema = z.discriminatedUnion('status',[
  z.strictObject({...context,status:z.literal('accepted'),code:z.literal('REGISTERED')}),
  z.strictObject({...context,status:z.literal('rejected'),code:z.enum(['NOT_ALLOWED','PHASE_CLOSED','NO_INJECTION'])}),
]);
export type PlanetReceipt = z.infer<typeof PlanetReceiptSchema>;
export const PlanetPhaseKindSchema = z.enum([
  'FOOD_SUPPLY','OFFICER_APPOINTMENT','PRE_TURN','ORDINARY_TURN','HACK_DECLARE','HACK_RESULT','HACK','BLACKHOLE_PRESENTATION','JAIL_VOTE','CAPTAIN_ELECTION',
  'VOTE_RESULT','BLACKOUT','NAV_SETTING','NAV_TIE','NAV_CAPTAIN_CONFIRM','NAV_OFFICER_CONFIRM','FINISHED','ABORTED',
]);
export type PlanetPhaseKind = z.infer<typeof PlanetPhaseKindSchema>;
export const PLANET_PHASE_DURATIONS: Readonly<Record<PlanetPhaseKind,number|null>> = Object.freeze({
  FOOD_SUPPLY:null, OFFICER_APPOINTMENT:30_000, PRE_TURN:15_000, ORDINARY_TURN:60_000,
  HACK_DECLARE:15_000, HACK_RESULT:5_000, HACK:60_000, BLACKHOLE_PRESENTATION:6_000, JAIL_VOTE:60_000, CAPTAIN_ELECTION:60_000,
  VOTE_RESULT:5_000, BLACKOUT:15_000, NAV_SETTING:15_000, NAV_TIE:15_000, NAV_CAPTAIN_CONFIRM:15_000, NAV_OFFICER_CONFIRM:15_000,
  FINISHED:null, ABORTED:null,
});
export const PlanetPhaseSchema = z.strictObject({
  id:IdentifierSchema,kind:PlanetPhaseKindSchema,startedAt:TimestampSchema,endsAt:TimestampSchema.nullable(),
}).refine(p=>p.kind==='FOOD_SUPPLY' ? p.endsAt!==null && p.endsAt>=p.startedAt : PLANET_PHASE_DURATIONS[p.kind]===null ? p.endsAt===null :
  p.endsAt!==null && p.endsAt-p.startedAt===PLANET_PHASE_DURATIONS[p.kind], 'Exact authoritative phase duration required');
export type PlanetPhase = z.infer<typeof PlanetPhaseSchema>;
export function planetSupportsPhase(versions:PlanetVersions,kind:PlanetPhaseKind):boolean {
  if(kind==='FOOD_SUPPLY')return versions.engineVersion===PLANET_FOOD_TASK_PINS.engineVersion;
  const feedback=versions.engineVersion===PLANET_FOOD_TASK_PINS.engineVersion||versions.engineVersion==='planet-game-1.1.0'||versions.engineVersion===PLANET_PHONE_OFFER_PINS.engineVersion||versions.engineVersion===PLANET_BLACKOUT_PINS.engineVersion;
  if(kind==='NAV_SETTING')return feedback;
  if(kind==='NAV_TIE')return !feedback;
  if(kind==='BLACKHOLE_PRESENTATION')return versions.engineVersion!=='planet-game-1.0.0';
  return true;
}
export const PlanetEngineerCaptureSchema = z.strictObject({round:PlanetRoundSchema,seatIds:ids});
export type PlanetEngineerCapture = z.infer<typeof PlanetEngineerCaptureSchema>;
export const PlanetPanelRequestSchema = z.strictObject({commandId:IdentifierSchema,round:PlanetRoundSchema,
  status:z.enum(['WRONG','QUEUED','TREATED','NO_EFFECT','DISCARDED'])});
export type PlanetPanelRequest = z.infer<typeof PlanetPanelRequestSchema>;


export const PlanetSeatViewSchema = z.strictObject({
  seatId:SeatIdSchema,health:PlanetHealthSchema,location:PlanetLocationSchema.nullable(),slotId:PlanetSlotIdSchema.nullable(),
  jailed:z.boolean(),captain:z.boolean(),officer:z.boolean(),revealedFaction:PlanetFactionSchema.nullable(),
  rescueDueAfterRound:PlanetRoundSchema.nullable(),
  medical:z.strictObject({admittedRound:PlanetRoundSchema,rescueDueAfterRound:PlanetRoundSchema,
    rescueOpportunity:z.enum(['NEXT_NORMAL_ROUND','CURRENT_NORMAL_ROUND','CLOSED'])}).nullable(),
});
export type PlanetSeatView = z.infer<typeof PlanetSeatViewSchema>;
const boardSeats = z.array(PlanetSeatViewSchema).min(7).max(9).superRefine((seats,ctx)=>{
  if(new Set(seats.map(s=>s.seatId)).size!==seats.length) ctx.addIssue({code:'custom',message:'Duplicate seat'});
  const slots=seats.flatMap(s=>s.slotId===null?[]:[s.slotId]);
  if(new Set(slots).size!==slots.length) ctx.addIssue({code:'custom',message:'Duplicate occupied slot'});
  for(const s of seats){
    const prefix=s.location===null?null:({'Room A':'A','Room B':'B','Command Room':'C',Hospital:'H',Jail:'J'} as const)[s.location];
    if((s.location===null)!==(s.slotId===null) || (prefix && !s.slotId?.startsWith(prefix)))
      ctx.addIssue({code:'custom',message:'Location/slot mismatch'});
    if(s.health==='Injured' && s.location!=='Hospital') ctx.addIssue({code:'custom',message:'Injured players must be in Hospital'});
  }
});
export const PlanetBlackoutCheckpointSchema = z.enum(['INITIAL','FOOD_RETURNED','PRE_BLACKOUT','AFTER_BLACKOUT','ROUND_FINALIZED']);
export type PlanetBlackoutCheckpoint = z.infer<typeof PlanetBlackoutCheckpointSchema>;
/** Candidate publication identity, not proof that a PLAYER_CURRENT board is globally resolved. */
export function planetCheckpointMatchesPhase(checkpoint:PlanetBlackoutCheckpoint,publicationRound:number,round:number,kind:PlanetPhaseKind):boolean {
  if(checkpoint==='FOOD_RETURNED')return publicationRound===round&&['PRE_TURN','ORDINARY_TURN','HACK_DECLARE','HACK_RESULT','HACK','ABORTED'].includes(kind);
  if(checkpoint==='INITIAL')return publicationRound===0&&round===1&&['FOOD_SUPPLY','PRE_TURN','ORDINARY_TURN','HACK_DECLARE','HACK_RESULT','HACK','ABORTED'].includes(kind);
  if(checkpoint==='PRE_BLACKOUT')return publicationRound===round&&['BLACKHOLE_PRESENTATION','BLACKOUT','ABORTED'].includes(kind);
  if(checkpoint==='AFTER_BLACKOUT')return publicationRound===round&&['JAIL_VOTE','VOTE_RESULT','ABORTED'].includes(kind);
  return publicationRound>=1&&(publicationRound===round&&['NAV_SETTING','NAV_CAPTAIN_CONFIRM','NAV_OFFICER_CONFIRM','FINISHED','ABORTED'].includes(kind)
    ||publicationRound===round-1&&['CAPTAIN_ELECTION','VOTE_RESULT','FOOD_SUPPLY','OFFICER_APPOINTMENT','PRE_TURN','ORDINARY_TURN','HACK_DECLARE','HACK_RESULT','HACK','ABORTED'].includes(kind));
}
export const PlanetBoardViewSchema = z.strictObject({
  kind:z.enum(['FINALIZED','PLAYER_CURRENT']),finalizedRound:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER-2),seats:boardSeats,
  checkpoint:PlanetBlackoutCheckpointSchema.optional(),
});
export type PlanetBoardView = z.infer<typeof PlanetBoardViewSchema>;
export const PlanetPromiseSchema = z.strictObject({
  id:IdentifierSchema,giverSeatId:SeatIdSchema,recipientSeatId:SeatIdSchema,kind:PlanetPromiseKindSchema,
  targetSeatId:SeatIdSchema.nullable(),round:PlanetRoundSchema,electionId:IdentifierSchema.nullable(),
  accepted:z.boolean(),status:PlanetPromiseStatusSchema,
  offerStatus:z.enum(['offered','accepted','declined','expired']),
}).refine(p=>p.giverSeatId!==p.recipientSeatId && (p.kind==='JAIL_VOTE')===(p.targetSeatId!==null)
  && p.accepted===(p.offerStatus==='accepted'),'Exact Promise terms required');
export type PlanetPromise = z.infer<typeof PlanetPromiseSchema>;
export const PlanetWindowDrawingSchema = z.strictObject({
  id:IdentifierSchema,windowId:PlanetWindowIdSchema,authorSeatId:SeatIdSchema,round:PlanetRoundSchema,
  order:z.number().int().nonnegative(),drawing:PlanetDrawingSchema,
});
export type PlanetWindowDrawing = z.infer<typeof PlanetWindowDrawingSchema>;
export const PlanetEventSchema = z.strictObject({
  id:IdentifierSchema,round:PlanetRoundSchema,phaseId:IdentifierSchema,viewRevision:RevisionSchema,
  publishedAt:TimestampSchema,expiresAt:TimestampSchema,
  audience:z.union([z.strictObject({kind:z.literal('public')}),z.strictObject({kind:z.literal('player'),seatId:SeatIdSchema})]),
  kind:z.enum(['BLACKHOLE_SYNCED','CAPTAIN_RELEASE','CAPTAIN_EJECT','INJURED','RESCUED','ELIMINATED','ATTACK_BLOCKED','BLACKOUT_HIT','MOVEMENT_COMPLETED','HOSPITAL_OVERFLOW_REMOVED','PLACEMENT_CHANGED']),
  seatIds:ids,actorSeatId:SeatIdSchema.nullable(),location:PlanetLocationSchema.nullable(),
  slotId:PlanetSlotIdSchema.nullable(),clinicalAnchor:ClinicalPresentationAnchorSchema.nullable(),
}).refine(e=>(e.actorSeatId===null || ['CAPTAIN_RELEASE','CAPTAIN_EJECT'].includes(e.kind))
  && e.expiresAt-e.publishedAt===30_000
  && (e.kind!=='ATTACK_BLOCKED'||e.audience.kind==='player'),'Audience-safe occurrence with fixed expiry');
export type PlanetEvent = z.infer<typeof PlanetEventSchema>;
export const PlanetTallySchema = z.strictObject({
  kind:z.enum(['CAPTAIN_ELECTION','JAIL_VOTE']),phaseId:IdentifierSchema,counts:z.partialRecord(SeatIdSchema,z.number().int().nonnegative()),
  eligibleVoterCount:z.number().int().min(0).max(9),selectedSeatId:SeatIdSchema.nullable(),tiedSeatIds:ids,
  outcome:z.enum(['CAPTAIN_ELECTED','RUNOFF_REQUIRED','NO_CAPTAIN_ELECTED','PLAYER_JAILED','JAIL_FULL','NO_JAIL_SELECTION']),
});
export type PlanetTally = z.infer<typeof PlanetTallySchema>;
export const PlanetResultSchema = z.strictObject({
  winner:PlanetDirectionSchema.nullable(),reason:z.enum(['ARRIVAL','NO_SURVIVORS','ABORTED']),alienCoWinner:z.boolean(),
}).refine(r=>r.reason==='ARRIVAL' ? r.winner!==null : r.winner===null && !r.alienCoWinner,'Winner only on planet arrival');
export type PlanetResult = z.infer<typeof PlanetResultSchema>;
const commonView = {
  versions:PlanetVersionsSchema,matchId:IdentifierSchema,viewRevision:RevisionSchema,round:PlanetRoundSchema,
  playerCount:z.union([z.literal(7),z.literal(8),z.literal(9)]),phase:PlanetPhaseSchema,activeSeatId:SeatIdSchema.nullable(),
  offices:z.strictObject({captainSeatId:SeatIdSchema.nullable(),officerSeatId:SeatIdSchema.nullable(),blockedSeatId:SeatIdSchema.nullable()}),
  board:PlanetBoardViewSchema,
  hackSession:z.strictObject({id:IdentifierSchema,actorSeatId:SeatIdSchema,targetSeatId:SeatIdSchema}).nullable(),
  blackout:z.strictObject({windowId:IdentifierSchema,previewEndsAt:TimestampSchema,endsAt:TimestampSchema}).nullable(),
  ballot:z.strictObject({eligibleVoters:ids,eligibleTargets:ids}),lastTally:PlanetTallySchema.nullable(),
  navigation:z.strictObject({lastMovedRound:z.number().int().nonnegative(),arrivedAt:PlanetDirectionSchema.nullable()}),
  events:z.array(PlanetEventSchema),result:PlanetResultSchema.nullable(),
  endReveal:z.strictObject({roles:z.array(z.strictObject({seatId:SeatIdSchema,role:PlanetRoleSchema})).min(7).max(9),code}).nullable(),
};
function validateBlackoutCheckpoint(v:{versions:PlanetVersions;round:number;phase:{kind:PlanetPhaseKind};board:{finalizedRound:number;checkpoint?:PlanetBlackoutCheckpoint|undefined}},ctx:z.RefinementCtx):void {
  const food=v.versions.engineVersion===PLANET_FOOD_TASK_PINS.engineVersion;
  const candidate=food||v.versions.engineVersion===PLANET_BLACKOUT_PINS.engineVersion;
  if(v.board.checkpoint==='FOOD_RETURNED'&&!food)ctx.addIssue({code:'custom',message:'Food return checkpoint is exact-version bound'});
  if(candidate ? v.board.checkpoint===undefined : Object.hasOwn(v.board,'checkpoint'))
    ctx.addIssue({code:'custom',message:'Blackout checkpoint metadata is exact-version bound'});
  if(candidate&&v.board.checkpoint!==undefined&&!planetCheckpointMatchesPhase(v.board.checkpoint,v.board.finalizedRound,v.round,v.phase.kind))
    ctx.addIssue({code:'custom',message:'Shared checkpoint publication round and phase must agree'});
}
export const PlanetPublicViewSchema = z.strictObject(commonView).superRefine((v,ctx)=>{
  validateBlackoutCheckpoint(v,ctx);
  if(!planetSupportsPhase(v.versions,v.phase.kind)) ctx.addIssue({code:'custom',message:'Phase is unavailable under this exact tuple'});
  if(v.board.kind!=='FINALIZED' || v.board.seats.length!==v.playerCount) ctx.addIssue({code:'custom',message:'Finalized public board required'});
  if(v.events.some(e=>e.kind==='ATTACK_BLOCKED'||e.audience.kind!=='public')) ctx.addIssue({code:'custom',message:'Public event audience required'});
  if(v.phase.kind==='FINISHED' ? v.result===null || v.endReveal===null : v.endReveal!==null)
    ctx.addIssue({code:'custom',message:'Final reveal requires finished match'});
});
export type PlanetPublicView = z.infer<typeof PlanetPublicViewSchema>;
export const PlanetOfferSchema = z.strictObject({
  type:PlanetCommandTypeSchema,targetSeatIds:ids,slotIds:z.array(PlanetSlotIdSchema),windowIds:z.array(PlanetWindowIdSchema),
  promiseTargetSeatIds:ids.default([]),
  declaredSides:z.array(PlanetFactionSchema).min(1).max(3).refine(values=>new Set(values).size===values.length,'Distinct private declarations required').optional(),
}).superRefine((offer,ctx)=>{
  if(offer.declaredSides!==undefined&&offer.type!=='DECLARE_HACK_SIDE')
    ctx.addIssue({code:'custom',message:'Declaration permissions belong only to the private declaration offer'});
});
export type PlanetOffer = z.infer<typeof PlanetOfferSchema>;
export const PlanetPlayerViewSchema = z.strictObject({
  ...commonView,
  self:z.strictObject({seatId:SeatIdSchema,role:PlanetRoleSchema,faction:PlanetFactionSchema,ordinaryWeapons:z.number().int().nonnegative(),
    movementSpent:z.boolean(),roleActionSpent:z.boolean(),shotSpent:z.boolean(),standardHackSpent:z.boolean()}),
  abilities:z.strictObject({
    codeAttempted:z.boolean(),shipHackUnlocked:z.boolean(),shipHackSpent:z.boolean(),scanBlockedThroughRound:PlanetRoundSchema.nullable(),
    blackholeSpent:z.boolean(),blackoutSpent:z.boolean(),engineerSpent:z.boolean(),
    clone:z.strictObject({used:z.boolean(),active:z.boolean(),expiresAfterRound:PlanetRoundSchema.nullable()}).nullable(),
    injectionsRemaining:z.number().int().min(0).max(2).nullable(),panelAttemptSpent:z.boolean(),
    protectionGrants:z.array(z.strictObject({targetSeatId:SeatIdSchema,activeFromRound:PlanetRoundSchema,consumed:z.boolean()})),
    captainCommands:z.strictObject({releaseUsed:z.boolean(),ejectUsed:z.boolean()}).nullable(),
    engineerCapture:PlanetEngineerCaptureSchema.nullable().optional(),panelRequest:PlanetPanelRequestSchema.nullable().optional(),
  }),
  knowledge:z.strictObject({
    insiderSeatIds:ids,knownUndercoverSeatId:SeatIdSchema.nullable(),
    scanResults:z.array(z.strictObject({round:PlanetRoundSchema,targetSeatId:SeatIdSchema,guess:PlanetFactionSchema,matched:z.boolean(),inCode:z.boolean().nullable()})),
  }),
  offers:z.array(PlanetOfferSchema),
  privateNavigation:z.strictObject({position:PlanetRoutePositionSchema,direction:PlanetDirectionSchema.nullable(),tieChoice:z.boolean(),confirmation:z.enum(['CAPTAIN','OFFICER']).nullable()}).nullable(),
  hackFeedback:z.strictObject({id:IdentifierSchema,status:z.enum(['AWAITING_DECLARATION','DECLARED','NO_DECLARATION']),declaredSide:PlanetFactionSchema.nullable()}).nullable(),
  blackoutTargeting:z.strictObject({windowId:IdentifierSchema,boundRoom:z.enum(['Room A','Room B','Command Room']),selectable:z.boolean(),selectedSlotId:PlanetSlotIdSchema.nullable(),slotIds:z.array(PlanetSlotIdSchema)}).nullable(),
  promises:z.array(PlanetPromiseSchema),
  promiseQuota:z.strictObject({given:z.boolean(),received:z.boolean()}),
  ownBallot:z.strictObject({phaseId:IdentifierSchema,targetSeatId:SeatIdSchema.nullable()}).nullable(),
  windows:z.array(z.strictObject({windowId:PlanetWindowIdSchema,canDraw:z.boolean(),drawings:z.array(PlanetWindowDrawingSchema)})),
}).superRefine((v,ctx)=>{
  validateBlackoutCheckpoint(v,ctx);
  if(!planetSupportsPhase(v.versions,v.phase.kind)) ctx.addIssue({code:'custom',message:'Phase is unavailable under this exact tuple'});
  const phone=v.versions.engineVersion===PLANET_FOOD_TASK_PINS.engineVersion||v.versions.engineVersion===PLANET_PHONE_OFFER_PINS.engineVersion||v.versions.engineVersion===PLANET_BLACKOUT_PINS.engineVersion;
  const latest=v.versions.engineVersion==='planet-game-1.1.0'||phone;
  for(const offer of v.offers){
    if(!phone&&Object.hasOwn(offer,'declaredSides'))ctx.addIssue({code:'custom',message:'Historical offers omit private declaration permissions'});
    if(phone&&offer.type==='DECLARE_HACK_SIDE'){
      const expected=['Undercover','Alien'].includes(v.self.role)?['Blue','Red','Alien']:[v.self.faction];
      if(JSON.stringify(offer.declaredSides)!==JSON.stringify(expected))ctx.addIssue({code:'custom',message:'Exact actor-private declaration permissions required'});
    }
    if(phone&&offer.type==='PANEL_CODE'){
      const expected=Array.from({length:v.playerCount},(_,i)=>`seat-${i+1}`);
      if(JSON.stringify(offer.targetSeatIds)!==JSON.stringify(expected))ctx.addIssue({code:'custom',message:'Panel choices require every original public player identity'});
    }
  }
  for(const key of ['engineerCapture','panelRequest'] as const) {
    if(latest ? !Object.hasOwn(v.abilities,key)||v.abilities[key]===undefined : Object.hasOwn(v.abilities,key))
      ctx.addIssue({code:'custom',message:'Private feedback fields are exact-version bound'});
  }
  const capture=v.abilities.engineerCapture,request=v.abilities.panelRequest;
  if(capture && (v.self.role!=='Engineer'||capture.round>v.round||capture.seatIds.some(id=>!v.board.seats.some(s=>s.seatId===id)))) ctx.addIssue({code:'custom',message:'Engineer-only original capture'});
  if(latest && (v.self.role==='Engineer' ? v.abilities.engineerSpent!==(capture!==null) : capture!==null)) ctx.addIssue({code:'custom',message:'Capture must match retained Engineer use'});
  if(request && request.round>v.round) ctx.addIssue({code:'custom',message:'Patient request round cannot be in the future'});
  if(latest && v.abilities.panelAttemptSpent!==(request!==null)) ctx.addIssue({code:'custom',message:'Own panel attempt record required'});
  if(latest && v.phase.kind==='NAV_SETTING' && v.privateNavigation && (v.privateNavigation.direction!==null||v.privateNavigation.confirmation!==null
    || v.privateNavigation.tieChoice && (v.offices.officerSeatId!==v.self.seatId||!v.offers.some(o=>o.type==='CHOOSE_NAV_DIRECTION')))) ctx.addIssue({code:'custom',message:'Neutral setting exposes only eligible Officer choice'});
  if(v.board.kind!=='PLAYER_CURRENT'  || v.board.seats.length!==v.playerCount) ctx.addIssue({code:'custom',message:'Player current board required'});
  if(v.promises.some(p=>p.giverSeatId!==v.self.seatId && p.recipientSeatId!==v.self.seatId))
    ctx.addIssue({code:'custom',message:'Promise audience is the participant pair'});
  if(v.privateNavigation && v.offices.captainSeatId!==v.self.seatId && v.offices.officerSeatId!==v.self.seatId)
    ctx.addIssue({code:'custom',message:'Navigation is office-private'});
  if(v.self.role!=='Insider' && v.knowledge.insiderSeatIds.length) ctx.addIssue({code:'custom',message:'Insider information audience'});
  if(!['Hacker','Red Disabler'].includes(v.self.role) && v.knowledge.knownUndercoverSeatId!==null) ctx.addIssue({code:'custom',message:'Undercover starting knowledge audience'});
  if(v.self.role!=='Hacker' && (v.knowledge.scanResults.length || v.abilities.codeAttempted || v.abilities.shipHackUnlocked || v.abilities.shipHackSpent || v.abilities.scanBlockedThroughRound!==null))
    ctx.addIssue({code:'custom',message:'Hacker progression audience'});
  if(v.self.role!=='Undercover' && v.abilities.protectionGrants.length) ctx.addIssue({code:'custom',message:'Protection donor only'});
  if(v.self.role!=='Alien' && (v.abilities.clone!==null || v.abilities.blackholeSpent)) ctx.addIssue({code:'custom',message:'Alien ability audience'});
  if(v.self.role!=='Doctor' && v.abilities.injectionsRemaining!==null) ctx.addIssue({code:'custom',message:'Doctor inventory audience'});
  if(v.abilities.captainCommands!==null && v.offices.captainSeatId!==v.self.seatId) ctx.addIssue({code:'custom',message:'Captain controls audience'});
  if(v.events.some(e=>e.audience.kind==='player' && e.audience.seatId!==v.self.seatId)) ctx.addIssue({code:'custom',message:'Event participant audience'});
  const own=v.board.seats.find(s=>s.seatId===v.self.seatId);
  const endpoints:Record<PlanetWindowId,readonly PlanetLocation[]>={A_B:['Room A','Room B'],A_HOSPITAL:['Room A','Hospital'],B_JAIL:['Room B','Jail']};
  const stations:Record<PlanetWindowId,readonly string[]>={A_B:['A1','B1'],A_HOSPITAL:['A2'],B_JAIL:['B2']};
  if(v.windows.some(w=>!own?.location || !endpoints[w.windowId].includes(own.location)
    || (w.canDraw && (!own.slotId || !stations[w.windowId].includes(own.slotId)))
    || w.drawings.some(d=>d.windowId!==w.windowId || d.round!==v.round))) ctx.addIssue({code:'custom',message:'Window endpoint, station and round audience'});
});
export type PlanetPlayerView = z.infer<typeof PlanetPlayerViewSchema>;
