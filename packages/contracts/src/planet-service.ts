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
export const PlanetSessionSnapshotSchema=z.strictObject({
  matchId:IdentifierSchema,roomCode:z.string().regex(/^[A-Z0-9]{6}$/),versions:PlanetVersionsSchema,
  status:z.enum(['lobby','choosing','reading','running','finished','aborted']),
  playerCount:z.union([z.literal(7),z.literal(8),z.literal(9)]),isHost:z.boolean(),selfSeatId:SeatIdSchema.nullable(),
  admission:PlanetAdmissionStandingSchema.nullable(),
  members:z.array(z.strictObject({seatId:SeatIdSchema,displayName:name,characterId:CrewCharacterIdSchema.nullable(),controller:z.enum(['human','bot']),ready:z.boolean()})).max(9),
  pendingAdmissions:z.array(z.strictObject({id:IdentifierSchema,kind:z.enum(['player','display']),displayName:name})),
  setup:z.strictObject({id:IdentifierSchema,endsAt:TimestampSchema}).nullable(),
  privateRole:z.strictObject({
    role:PlanetRoleSchema,faction:PlanetFactionSchema,
    knowledge:PlanetPlayerViewSchema.shape.knowledge,
  }).nullable(),
  publicView:PlanetPublicViewSchema.nullable(),playerView:PlanetPlayerViewSchema.nullable(),
}).superRefine((value,ctx)=>{
  const denied=value.admission!==null&&value.admission.status!=='admitted';
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
