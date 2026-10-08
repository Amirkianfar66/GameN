import { z } from 'zod';
import { IdentifierSchema, SeatIdSchema, TimestampSchema, RevisionSchema } from './protocol.js';
import { RoleSchema, LocationSchema, HealthSchema } from './views.js';

// Product V1 uses wire protocol 2. Protocol 1 remains the reviewed Officer fixture.
export const FULL_PROTOCOL_VERSION = 2 as const;
export const FactionSchema = z.enum(['Blue', 'Red', 'Alien']);
const target = { targetSeatId: SeatIdSchema };
export const FullCommandSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('PASS_TURN') }),
  z.strictObject({ type: z.literal('MOVE'), destination: z.enum(['Room A', 'Room B', 'Command Room']) }),
  z.strictObject({ type: z.literal('REGISTER_SHOT'), ...target }),
  z.strictObject({ type: z.literal('DISABLE'), ...target }),
  z.strictObject({ type: z.literal('PROTECT'), ...target }),
  z.strictObject({ type: z.literal('RESCUE'), ...target }),
  z.strictObject({ type: z.literal('SUPPLY'), targetSeatIds: z.array(SeatIdSchema).length(2).refine(x => new Set(x).size === 2) }),
  z.strictObject({ type: z.literal('SCAN'), ...target, guess: FactionSchema }),
  z.strictObject({ type: z.literal('REQUEST_HACK'), ...target }),
  z.strictObject({ type: z.literal('SUBMIT_CODE'), seatIds: z.array(SeatIdSchema).length(4).refine(x => new Set(x).size === 4) }),
  z.strictObject({ type: z.literal('VOTE'), targetSeatId: SeatIdSchema.nullable() }),
  z.strictObject({ type: z.literal('RELEASE_CHOICE'), targetSeatId: SeatIdSchema.nullable() }),
  z.strictObject({ type: z.literal('RELEASE_VOTE'), approve: z.boolean().nullable() }),
  z.strictObject({ type: z.literal('SHOWDOWN_SHOT'), ...target }),
]);
export type FullCommand = z.infer<typeof FullCommandSchema>;
const commandContext = { protocolVersion: z.literal(2), matchId: IdentifierSchema, phaseId: IdentifierSchema, commandId: IdentifierSchema };
export const FullCommandRequestSchema = z.strictObject({ ...commandContext, command: FullCommandSchema });
export type FullCommandRequest = z.infer<typeof FullCommandRequestSchema>;
export const FullReceiptSchema = z.discriminatedUnion('status', [
  z.strictObject({ ...commandContext, status: z.literal('accepted'), code: z.literal('REGISTERED') }),
  z.strictObject({ ...commandContext, status: z.literal('rejected'), code: z.enum(['PHASE_CLOSED', 'NOT_ALLOWED']) }),
]);
export type FullReceipt = z.infer<typeof FullReceiptSchema>;
export const FullFailureSchema = z.strictObject({ ok: z.literal(false), serverTimeMs: TimestampSchema,
  error: z.strictObject({ code: z.enum(['UNAUTHENTICATED','FORBIDDEN','INVALID_REQUEST','UNSUPPORTED_PROTOCOL','COMMAND_ID_CONFLICT','REQUEST_ID_CONFLICT','UNAVAILABLE','RATE_LIMITED']), retryAfterMs: TimestampSchema.nullable().optional() }) });
export type FullFailure = z.infer<typeof FullFailureSchema>;
export const FullPhaseSchema = z.strictObject({ id: IdentifierSchema,
  kind: z.enum(['ORDINARY_TURN','HACK','CAPTAIN_ELECTION','RELEASE_CHOICE','RELEASE_VOTE','JAIL_VOTE','SHOWDOWN','FINISHED','ABORTED']),
  startedAt: TimestampSchema, endsAt: TimestampSchema.nullable() }).refine(p => ['FINISHED','ABORTED'].includes(p.kind) ? p.endsAt === null : p.endsAt !== null && p.endsAt - p.startedAt === 60_000, 'Fixed 60-second live windows and no terminal deadline');
export type FullPhase = z.infer<typeof FullPhaseSchema>;
export const FullAssetManifestVersionSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/);
export const FullVersionsSchema = z.strictObject({ protocolVersion: z.literal(2), rulesetVersion: IdentifierSchema,
  rulesetHash: z.string().regex(/^[a-f0-9]{64}$/), engineVersion: z.string().min(1).max(128), assetManifestVersion: FullAssetManifestVersionSchema });
const publicFacts = {
  versions: FullVersionsSchema, matchId: IdentifierSchema, viewRevision: RevisionSchema,
  playerCount: z.union([z.literal(7),z.literal(8),z.literal(9)]), round: z.number().int().min(1).max(5),
  phase: FullPhaseSchema, activeSeatId: SeatIdSchema.nullable(),
  seats: z.array(z.strictObject({ seatId: SeatIdSchema, health: HealthSchema, location: LocationSchema, jailed:z.boolean(),captain:z.boolean(),revealedFaction:FactionSchema.nullable() })).min(7).max(9),
  ballot: z.strictObject({ eligibleVoters: z.array(SeatIdSchema), eligibleTargets: z.array(SeatIdSchema), releaseTargetSeatId: SeatIdSchema.nullable() }),
  lastTally: z.strictObject({ kind:z.enum(['CAPTAIN_ELECTION','RELEASE_VOTE','JAIL_VOTE']),counts:z.partialRecord(SeatIdSchema,z.number().int().nonnegative()),eligibleVoterCount:z.number().int().nonnegative(), yesCount:z.number().int().nonnegative().nullable(), selectedSeatId:SeatIdSchema.nullable(),released:z.boolean().nullable() }).nullable(),
  result: z.strictObject({ winner:z.enum(['Blue','Red','Alien','Draw']),alienCoWinner:z.boolean() }).nullable(),
  endReveal: z.strictObject({ roles:z.array(z.strictObject({seatId:SeatIdSchema,role:RoleSchema})),code:z.array(SeatIdSchema).length(4) }).nullable(),
};
function validTerminalReveal(view:z.infer<typeof FullPublicViewShape>):boolean {
  if (!view.endReveal) return true;
  const expected=['Insider','Cracker','Blue Disabler','Supplier','Undercover','Hacker','Alien',...(view.playerCount>=8?['Red Disabler']:[]),...(view.playerCount===9?['Officer']:[])];
  const roles=view.endReveal.roles;
  const faction=(role:string)=>role==='Alien'?'Alien':['Undercover','Hacker','Red Disabler'].includes(role)?'Red':'Blue';
  const alien=roles.find(s=>s.role==='Alien')?.seatId,undercover=roles.find(s=>s.role==='Undercover')?.seatId;
  return roles.length===expected.length && new Set(roles.map(s=>s.role)).size===expected.length && roles.every(s=>expected.includes(s.role))
    && alien!==undefined && undercover!==undefined && view.endReveal.code.includes(alien) && !view.endReveal.code.includes(undercover)
    && view.seats.every(s=>s.revealedFaction===null || s.revealedFaction===faction(roles.find(r=>r.seatId===s.seatId)?.role ?? ''));
}
function validPublicReferences(view:z.infer<typeof FullPublicViewShape>):boolean {
  const ids=view.seats.map(s=>s.seatId),has=(id:string|null)=>id===null || ids.includes(id as z.infer<typeof SeatIdSchema>);
  return (view.phase.kind==='FINISHED'?view.endReveal!==null && view.result!==null:view.endReveal===null && view.result===null)
    && view.seats.every(s=>s.health==='Eliminated'?s.revealedFaction!==null:view.phase.kind==='FINISHED'||s.revealedFaction===null)
    && (!view.result || !view.result.alienCoWinner || view.result.winner==='Blue')
    && ids.length===view.playerCount && new Set(ids).size===view.playerCount && ids.every(id=>Number(id.slice(5))<=view.playerCount)
    && has(view.activeSeatId) && view.ballot.eligibleVoters.every(has) && view.ballot.eligibleTargets.every(has)
    && new Set(view.ballot.eligibleVoters).size===view.ballot.eligibleVoters.length && new Set(view.ballot.eligibleTargets).size===view.ballot.eligibleTargets.length
    && has(view.ballot.releaseTargetSeatId) && (!view.lastTally || has(view.lastTally.selectedSeatId) && Object.keys(view.lastTally.counts).every(has))
    && validTerminalReveal(view)
    && (!view.endReveal || view.endReveal.roles.length===view.playerCount && new Set(view.endReveal.roles.map(s=>s.seatId)).size===view.playerCount && view.endReveal.roles.every(s=>has(s.seatId)) && view.endReveal.code.every(has) && new Set(view.endReveal.code).size===4);
}
const FullPublicViewShape=z.strictObject({ ...publicFacts, audience:z.strictObject({kind:z.literal('public')}) });
export const FullPublicViewSchema = FullPublicViewShape.refine(validPublicReferences, 'Complete roster and valid seat references required');
export type FullPublicView = z.infer<typeof FullPublicViewSchema>;
export const FullPlayerViewSchema = z.strictObject({ ...publicFacts, audience:z.strictObject({kind:z.literal('player'),seatId:SeatIdSchema}),
  self:z.strictObject({ seatId:SeatIdSchema,role:RoleSchema,movementDestinations:z.array(z.enum(['Room A','Room B','Command Room'])),releaseVoteAvailable:z.boolean(),ordinaryWeapons:z.number().int().nonnegative(),shotAvailable:z.boolean(),rescuesRemaining:z.number().int().nonnegative(),disablerAvailable:z.boolean(),hackAvailable:z.boolean(),scanAvailable:z.boolean(),codeAttemptAvailable:z.boolean() }),
  knowledge:z.strictObject({insiderCandidates:z.array(SeatIdSchema),undercoverSeatId:SeatIdSchema.nullable(),code:z.array(SeatIdSchema),scanResults:z.array(z.strictObject({round:z.number().int().min(1).max(5),targetSeatId:SeatIdSchema,guess:FactionSchema,matched:z.boolean(),inCode:z.boolean().nullable()})),protections:z.array(z.strictObject({seatId:SeatIdSchema,activeFromRound:z.number().int(),consumed:z.boolean()}))}),
  legalTargets:z.record(z.string(),z.array(SeatIdSchema)), ownPendingCommandIds:z.array(IdentifierSchema).max(2),
  ownBallot:z.union([SeatIdSchema,z.boolean()]).nullable(), hasVoted:z.boolean(),
  hackPartnerSeatId:SeatIdSchema.nullable(),
 }).refine(v=>{
  const ids=v.seats.map(s=>s.seatId),has=(id:string|null)=>id===null || ids.includes(id as z.infer<typeof SeatIdSchema>);
  const unique=(items:string[])=>new Set(items).size===items.length && items.every(has);
  const k=v.knowledge,role=v.self.role;
  return validPublicReferences({...v,audience:{kind:'public'}}) && v.audience.seatId===v.self.seatId && has(v.self.seatId)
    && (!v.endReveal || v.endReveal.roles.find(s=>s.seatId===v.self.seatId)?.role===v.self.role)
    && has(v.hackPartnerSeatId) && (typeof v.ownBallot!=='string' || has(v.ownBallot)) && Object.values(v.legalTargets).every(unique)
    && !(v.playerCount<9 && role==='Officer') && !(v.playerCount<8 && role==='Red Disabler')
    && (role==='Insider'?k.insiderCandidates.length===3 && unique(k.insiderCandidates):k.insiderCandidates.length===0)
    && (role==='Hacker'?k.undercoverSeatId!==null && has(k.undercoverSeatId):k.undercoverSeatId===null && k.scanResults.length===0)
    && (role==='Alien'?k.code.length===4 && unique(k.code) && k.code.includes(v.self.seatId):k.code.length===0)
    && (role==='Undercover'||k.protections.length===0) && k.protections.every(p=>has(p.seatId))
    && k.scanResults.every(r=>has(r.targetSeatId) && r.round<=v.round && (r.matched?r.inCode!==null:r.inCode===null));
}, 'Valid audience, roster references and role-specific knowledge required');
export type FullPlayerView = z.infer<typeof FullPlayerViewSchema>;

const eventContext={protocolVersion:z.literal(2),matchId:IdentifierSchema,eventId:IdentifierSchema,viewRevision:RevisionSchema};
const publicFact=z.discriminatedUnion('type',[
  z.strictObject({type:z.literal('PHASE_CHANGED'),phaseId:IdentifierSchema}),
  z.strictObject({type:z.literal('PUBLIC_HEALTH_CHANGED'),seatId:SeatIdSchema,health:HealthSchema}),
  z.strictObject({type:z.literal('PUBLIC_MOVE'),seatId:SeatIdSchema,location:LocationSchema}),
]);
export const FullPublicEventSchema=z.strictObject({...eventContext,audience:z.strictObject({kind:z.literal('public')}),fact:publicFact});
export const FullPlayerEventSchema=z.strictObject({...eventContext,audience:z.strictObject({kind:z.literal('player'),seatId:SeatIdSchema}),fact:z.union([publicFact,z.strictObject({type:z.literal('COMMAND_REGISTERED'),commandId:IdentifierSchema})])});
export const FullEventSchema=z.union([FullPublicEventSchema,FullPlayerEventSchema]);
export type FullEvent=z.infer<typeof FullEventSchema>;
