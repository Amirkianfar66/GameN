// Frozen pre-R17 snapshot schema from 469b709b6689a1063ec36a10c70b8b6e2420c18c.
// This control intentionally does not derive fields from the current service schema.
import {z} from 'zod';
import {IdentifierSchema,SeatIdSchema,TimestampSchema,CrewCharacterIdSchema,CrewDisplayNameSchema,
  PlanetVersionsSchema,PlanetRoleSchema,PlanetFactionSchema,PlanetPlayerViewSchema,PlanetPublicViewSchema} from '@mothership/contracts';

const admission=z.strictObject({requestId:IdentifierSchema,kind:z.enum(['player','display']),status:z.enum(['pending','admitted','declined','closed'])});
export const LegacyPlanetSessionSnapshotSchema=z.strictObject({
  matchId:IdentifierSchema,roomCode:z.string().regex(/^[A-Z0-9]{6}$/),versions:PlanetVersionsSchema,
  status:z.enum(['lobby','choosing','reading','running','finished','aborted']),
  playerCount:z.union([z.literal(7),z.literal(8),z.literal(9)]),isHost:z.boolean(),selfSeatId:SeatIdSchema.nullable(),
  admission:admission.nullable(),
  members:z.array(z.strictObject({seatId:SeatIdSchema,displayName:CrewDisplayNameSchema,characterId:CrewCharacterIdSchema.nullable(),controller:z.enum(['human','bot']),ready:z.boolean()})).max(9),
  pendingAdmissions:z.array(z.strictObject({id:IdentifierSchema,kind:z.enum(['player','display']),displayName:CrewDisplayNameSchema})),
  setup:z.strictObject({id:IdentifierSchema,endsAt:TimestampSchema}).nullable(),
  privateRole:z.strictObject({role:PlanetRoleSchema,faction:PlanetFactionSchema,knowledge:PlanetPlayerViewSchema.shape.knowledge}).nullable(),
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
