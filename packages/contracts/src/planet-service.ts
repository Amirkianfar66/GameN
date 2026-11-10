import {z} from 'zod';
import {IdentifierSchema,SeatIdSchema,TimestampSchema} from './protocol.js';
import {CrewCharacterIdSchema,CrewDisplayNameSchema} from './lobby-identity.js';
import {PlanetCommandRequestSchema,PlanetPublicViewSchema,PlanetPlayerViewSchema,PlanetVersionsSchema,PlanetRoleSchema,PlanetFactionSchema} from './planet-game.js';

const requestId={requestId:IdentifierSchema};
const match={matchId:IdentifierSchema};
const name=CrewDisplayNameSchema;
export const PlanetServiceRequestSchema=z.discriminatedUnion('operation',[
  z.strictObject({operation:z.literal('create'),...requestId,playerCount:z.union([z.literal(7),z.literal(8),z.literal(9)])}),
  z.strictObject({operation:z.literal('requestAdmission'),...requestId,roomCode:z.string().regex(/^[A-Z0-9]{6}$/),kind:z.enum(['player','display']),displayName:name}),
  z.strictObject({operation:z.literal('approveAdmission'),...match,...requestId,admissionId:IdentifierSchema}),
  z.strictObject({operation:z.literal('setBots'),...match,...requestId,count:z.number().int().min(0).max(9)}),
  z.strictObject({operation:z.literal('beginSetup'),...match,...requestId}),
  z.strictObject({operation:z.literal('chooseCharacter'),...match,...requestId,characterId:CrewCharacterIdSchema}),
  z.strictObject({operation:z.literal('ready'),...match,...requestId}),
  z.strictObject({operation:z.literal('read'),...match}),
  z.strictObject({operation:z.literal('command'),request:PlanetCommandRequestSchema}),
  z.strictObject({operation:z.literal('receipt'),...match,commandId:IdentifierSchema}),
  z.strictObject({operation:z.literal('advance'),...match}),
  z.strictObject({operation:z.literal('runBots'),...match}),
  z.strictObject({operation:z.literal('abort'),...match,...requestId}),
  z.strictObject({operation:z.literal('issueRecovery'),...match,...requestId,seatId:SeatIdSchema}),
  z.strictObject({operation:z.literal('redeemRecovery'),...match,...requestId,recoveryCode:z.string().min(16).max(128)}),
]);
export type PlanetServiceRequest=z.infer<typeof PlanetServiceRequestSchema>;
/** Server binds this standing to the authenticated caller and its original admission request.
 * It is never inferred from a remembered device mode, null seat, or successful HTTP status.
 */
export const PlanetAdmissionStandingSchema=z.strictObject({
  requestId:IdentifierSchema,kind:z.enum(['player','display']),
  status:z.enum(['pending','admitted','declined','closed']),
});
export type PlanetAdmissionStanding=z.infer<typeof PlanetAdmissionStandingSchema>;
export const PlanetRecoveryResultSchema=z.strictObject({...match,seatId:SeatIdSchema});
export type PlanetRecoveryResult=z.infer<typeof PlanetRecoveryResultSchema>;
/** Service setup version, independent of engine/rules/artwork. Legacy packets omit it. */
export const PLANET_SETUP_FLOW_VERSION=2 as const;
export const PLANET_BOARDING_DURATION_MS=10_000;
export const PLANET_TIMED_READING_SETUP_FLOW_VERSION=3 as const;
export const PLANET_ROLE_CARD_DURATION_MS=20_000;
export const PLANET_ROLE_FILM_DURATION_MS=10_000;
export const PLANET_READING_DURATION_MS=30_000;
export const PlanetSetupFlowVersionSchema=z.union([z.literal(PLANET_SETUP_FLOW_VERSION),z.literal(PLANET_TIMED_READING_SETUP_FLOW_VERSION)]);
export const PlanetSessionSnapshotSchema=z.strictObject({
  matchId:IdentifierSchema,roomCode:z.string().regex(/^[A-Z0-9]{6}$/),versions:PlanetVersionsSchema,
  setupFlowVersion:PlanetSetupFlowVersionSchema.optional(),
  status:z.enum(['lobby','choosing','reading','boarding','running','finished','aborted']),
  playerCount:z.union([z.literal(7),z.literal(8),z.literal(9)]),isHost:z.boolean(),selfSeatId:SeatIdSchema.nullable(),
  admission:PlanetAdmissionStandingSchema.nullable(),
  members:z.array(z.strictObject({seatId:SeatIdSchema,displayName:name,characterId:CrewCharacterIdSchema.nullable(),controller:z.enum(['human','bot']),ready:z.boolean()})).max(9),
  pendingAdmissions:z.array(z.strictObject({id:IdentifierSchema,kind:z.enum(['player','display']),displayName:name})),
  setup:z.strictObject({id:IdentifierSchema,startedAt:TimestampSchema.optional(),roleFilmStartsAt:TimestampSchema.optional(),endsAt:TimestampSchema}).nullable(),
  privateRole:z.strictObject({
    role:PlanetRoleSchema,faction:PlanetFactionSchema,
    knowledge:PlanetPlayerViewSchema.shape.knowledge,
  }).nullable(),
  publicView:PlanetPublicViewSchema.nullable(),playerView:PlanetPlayerViewSchema.nullable(),
}).superRefine((value,ctx)=>{
  const denied=value.admission!==null&&value.admission.status!=='admitted';
  if(value.status==='boarding'){
    if(value.setupFlowVersion!==PLANET_SETUP_FLOW_VERSION&&value.setupFlowVersion!==PLANET_TIMED_READING_SETUP_FLOW_VERSION)
      ctx.addIssue({code:'custom',message:'Boarding requires its saved setup flow version'});
    if(value.privateRole!==null||value.publicView!==null||value.playerView!==null)
      ctx.addIssue({code:'custom',message:'Boarding exposes no private role or game views'});
    if(!denied&&(!value.setup||value.setup.startedAt===undefined
      ||value.setup.endsAt-value.setup.startedAt!==PLANET_BOARDING_DURATION_MS
      ||value.members.length!==value.playerCount||value.members.some(member=>member.characterId===null||!member.ready)))
      ctx.addIssue({code:'custom',message:'Admitted boarding requires an exact interval and the complete ready public roster'});
  }else if(value.status==='reading'&&value.setupFlowVersion===PLANET_TIMED_READING_SETUP_FLOW_VERSION){
    if(!denied&&(!value.setup||value.setup.startedAt===undefined||value.setup.roleFilmStartsAt===undefined
      ||value.setup.roleFilmStartsAt-value.setup.startedAt!==PLANET_ROLE_CARD_DURATION_MS
      ||value.setup.endsAt-value.setup.roleFilmStartsAt!==PLANET_ROLE_FILM_DURATION_MS
      ||value.setup.endsAt-value.setup.startedAt!==PLANET_READING_DURATION_MS
      ||value.members.length!==value.playerCount||value.members.some(member=>member.characterId===null)))
      ctx.addIssue({code:'custom',message:'Timed reading requires its exact saved card and film interval and full roster'});
  }else if(value.setup?.startedAt!==undefined)
    ctx.addIssue({code:'custom',message:'Only boarding or versioned timed reading carries a setup start timestamp'});
  if(value.setup?.roleFilmStartsAt!==undefined&&(value.status!=='reading'||value.setupFlowVersion!==PLANET_TIMED_READING_SETUP_FLOW_VERSION))
    ctx.addIssue({code:'custom',message:'Only versioned timed reading carries a role film boundary'});
  if(denied&&(value.isHost||value.selfSeatId!==null||value.members.length!==0||value.pendingAdmissions.length!==0
    ||value.setup!==null||value.privateRole!==null||value.publicView!==null||value.playerView!==null))
    ctx.addIssue({code:'custom',message:'Unapproved admission carries no admitted audience data'});
  if(value.admission?.kind==='display'&&(value.selfSeatId!==null||value.privateRole!==null||value.playerView!==null))
    ctx.addIssue({code:'custom',message:'Display admission carries no player data'});
  if(!value.isHost&&value.pendingAdmissions.length!==0)
    ctx.addIssue({code:'custom',message:'Pending admissions are host-only'});
});
export type PlanetSessionSnapshot=z.infer<typeof PlanetSessionSnapshotSchema>;
export interface PlanetServiceSuccess {ok:true;serverTimeMs:number;result:unknown}
export interface PlanetServiceFailure {ok:false;serverTimeMs:number;error:{code:'UNAUTHENTICATED'|'FORBIDDEN'|'INVALID_REQUEST'|'NOT_FOUND'|'NOT_ALLOWED'|'REQUEST_ID_CONFLICT'|'COMMAND_ID_CONFLICT'|'UNAVAILABLE'|'RATE_LIMITED'}}
export type PlanetServiceResponse=PlanetServiceSuccess|PlanetServiceFailure;
