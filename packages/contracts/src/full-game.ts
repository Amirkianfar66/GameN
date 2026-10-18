import { FullCloneStatusSchema } from './clone.js';
import { BlackoutRoomSchema, FullBlackoutPublicSchema, FullBlackoutTargetingSchema, validBlackoutPublic, blackoutSlotIds } from './blackout.js';
import { z } from 'zod';
import { FullOutcomeEventSchema } from './captain-outcomes.js';
import { IdentifierSchema, SeatIdSchema, TimestampSchema, RevisionSchema } from './protocol.js';
import { RoleSchema, LocationSchema, HealthSchema } from './views.js';
import { BoardSlotIdSchema, FullMedicalStatusSchema, validBoardMedicalView } from './board-medical.js';
import { isKnownFullGameplayPins, supportsVoteResults, supportsDeclaredHack, supportsPublicHack, supportsCaptainCommands, supportsBlackout, supportsClone, supportsHospitalFour, HOSPITAL_FOUR_ASSET_MANIFEST_VERSION } from './full-game-versions.js';

// Product V1 uses wire protocol 2. Protocol 1 remains the reviewed Officer fixture.
export const FULL_PROTOCOL_VERSION = 2 as const;
export const FactionSchema = z.enum(['Blue', 'Red', 'Alien']);
const target = { targetSeatId: SeatIdSchema };
export const FullCommandSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('PASS_TURN') }),
  z.strictObject({ type: z.literal('CAPTAIN_RELEASE') }),
  z.strictObject({ type: z.literal('CAPTAIN_EJECT') }),
  z.strictObject({ type: z.literal('REQUEST_BLACKOUT') }),
  z.strictObject({ type: z.literal('ACTIVATE_CLONE') }),
  z.strictObject({ type: z.literal('SELECT_BLACKOUT_SLOT'),snapshotId:IdentifierSchema,room:BlackoutRoomSchema,slotId:BoardSlotIdSchema }),
  z.strictObject({ type: z.literal('MOVE'), destination: z.enum(['Room A', 'Room B', 'Command Room']) }),
  z.strictObject({ type: z.literal('REGISTER_SHOT'), ...target }),
  z.strictObject({ type: z.literal('DISABLE'), ...target }),
  z.strictObject({ type: z.literal('PROTECT'), ...target }),
  z.strictObject({ type: z.literal('RESCUE'), ...target }),
  z.strictObject({ type: z.literal('SUPPLY'), targetSeatIds: z.array(SeatIdSchema).length(2).refine(x => new Set(x).size === 2) }),
  z.strictObject({ type: z.literal('SCAN'), ...target, guess: FactionSchema }),
  z.strictObject({ type: z.literal('REQUEST_HACK'), ...target }),
  z.strictObject({ type: z.literal('DECLARE_HACK_SIDE'), declaredSide: FactionSchema }),
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
  kind: z.enum(['ORDINARY_TURN','HACK','HACK_DECLARE','HACK_RESULT','CAPTAIN_ELECTION','RELEASE_CHOICE','RELEASE_VOTE','JAIL_VOTE','SHOWDOWN','BLACKOUT','VOTE_RESULT','FINISHED','ABORTED']),
  startedAt: TimestampSchema, endsAt: TimestampSchema.nullable() }).refine(p => ['FINISHED','ABORTED'].includes(p.kind) ? p.endsAt === null : p.endsAt !== null && p.endsAt - p.startedAt === (['HACK_DECLARE','BLACKOUT'].includes(p.kind) ? 15_000 : ['VOTE_RESULT','HACK_RESULT'].includes(p.kind) ? 5_000 : 60_000), 'Exact live phase duration and no terminal deadline');
export type FullPhase = z.infer<typeof FullPhaseSchema>;
export const FullAssetManifestVersionSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/);
export const FullVersionsSchema = z.strictObject({ protocolVersion: z.literal(2), rulesetVersion: IdentifierSchema,
  rulesetHash: z.string().regex(/^[a-f0-9]{64}$/), engineVersion: z.string().min(1).max(128), assetManifestVersion: FullAssetManifestVersionSchema }).refine(isKnownFullGameplayPins, 'Exact reviewed gameplay tuple required').refine(v=>supportsHospitalFour(v) ? v.assetManifestVersion===HOSPITAL_FOUR_ASSET_MANIFEST_VERSION : v.assetManifestVersion!==HOSPITAL_FOUR_ASSET_MANIFEST_VERSION, 'Exact successor art pairing required');
const FullTallySchema = z.strictObject({ kind:z.enum(['CAPTAIN_ELECTION','RELEASE_VOTE','JAIL_VOTE']),counts:z.partialRecord(SeatIdSchema,z.number().int().nonnegative()),eligibleVoterCount:z.number().int().nonnegative(), yesCount:z.number().int().nonnegative().nullable(), selectedSeatId:SeatIdSchema.nullable(),released:z.boolean().nullable() });
export const FullVoteResultSchema = FullTallySchema.extend({ id:IdentifierSchema,votePhaseId:IdentifierSchema,
  round:z.number().int().min(1).max(5),startedAt:TimestampSchema,endsAt:TimestampSchema,
  outcome:z.enum(['CAPTAIN_ELECTED','RUNOFF_REQUIRED','NO_CAPTAIN_ELECTED','PLAYER_JAILED','NO_JAIL_SELECTION','PLAYER_RELEASED','RELEASE_DENIED']),
  tiedSeatIds:z.array(SeatIdSchema).max(9),
 }).refine(r=>{
  if(r.id===r.votePhaseId || r.endsAt-r.startedAt!==5000 || new Set(r.tiedSeatIds).size!==r.tiedSeatIds.length) return false;
  if(r.kind==='RELEASE_VOTE') {
    const released=r.eligibleVoterCount>0 && (r.yesCount??0)*2>=r.eligibleVoterCount;
    return r.selectedSeatId!==null && Object.keys(r.counts).length===0 && r.yesCount!==null && r.yesCount<=r.eligibleVoterCount
      && r.tiedSeatIds.length===0 && r.released===released && r.outcome===(released?'PLAYER_RELEASED':'RELEASE_DENIED');
  }
  if(r.yesCount!==null || r.released!==null || Object.values(r.counts).reduce((a,b)=>a+b,0)>r.eligibleVoterCount) return false;
  const maximum=Math.max(0,...Object.values(r.counts));
  const top=maximum===0?[]:Object.keys(r.counts).filter(id=>r.counts[id as keyof typeof r.counts]===maximum).sort();
  const ties=top.length>1?top:[];
  if(JSON.stringify(r.tiedSeatIds)!==JSON.stringify(ties)) return false;
  if(r.kind==='JAIL_VOTE') {
    const selected=top.length===1 && maximum*2>=r.eligibleVoterCount?top[0]:null;
    return r.selectedSeatId===selected && r.outcome===(selected?'PLAYER_JAILED':'NO_JAIL_SELECTION');
  }
  const selected=top.length===1?top[0]:null;
  return r.selectedSeatId===selected && r.outcome===(selected?'CAPTAIN_ELECTED':ties.length?'RUNOFF_REQUIRED':'NO_CAPTAIN_ELECTED');
},'Consistent vote result identity, timing and aggregate outcome required');
export type FullVoteResult = z.infer<typeof FullVoteResultSchema>;
export const FullHackFeedbackSchema = z.strictObject({ hackId:IdentifierSchema, phaseId:IdentifierSchema,
  round:z.number().int().min(1).max(5),status:z.enum(['AWAITING_DECLARATION','DECLARED','NO_DECLARATION']),
  declaredSide:FactionSchema.nullable(),
}).refine(f=>(f.status==='DECLARED') === (f.declaredSide!==null),'Only a declared claim has a side');
export type FullHackFeedback = z.infer<typeof FullHackFeedbackSchema>;
export const FullHackSessionSchema = z.strictObject({ hackId:IdentifierSchema, actorSeatId:SeatIdSchema, targetSeatId:SeatIdSchema })
  .refine(s=>s.actorSeatId!==s.targetSeatId,'Distinct Hack participants required');
export type FullHackSession = z.infer<typeof FullHackSessionSchema>;
const publicFacts = {
  versions: FullVersionsSchema, matchId: IdentifierSchema, viewRevision: RevisionSchema,
  playerCount: z.union([z.literal(7),z.literal(8),z.literal(9)]), round: z.number().int().min(1).max(5),
  phase: FullPhaseSchema, activeSeatId: SeatIdSchema.nullable(),
  seats: z.array(z.strictObject({ seatId: SeatIdSchema, health: HealthSchema, location: LocationSchema.nullable(), jailed:z.boolean(),captain:z.boolean(),revealedFaction:FactionSchema.nullable(),slotId:BoardSlotIdSchema.nullable().optional(),medical:FullMedicalStatusSchema.nullable().optional() })).min(7).max(9),
  ballot: z.strictObject({ eligibleVoters: z.array(SeatIdSchema), eligibleTargets: z.array(SeatIdSchema), releaseTargetSeatId: SeatIdSchema.nullable() }),
  lastTally: FullTallySchema.nullable(),
  voteResult: FullVoteResultSchema.nullable().optional(),
  hackSession: FullHackSessionSchema.nullable().optional(),
  blackout:FullBlackoutPublicSchema.nullable().optional(),
  result: z.strictObject({ winner:z.enum(['Blue','Red','Alien','Draw']),alienCoWinner:z.boolean() }).nullable(),
  endReveal: z.strictObject({ roles:z.array(z.strictObject({seatId:SeatIdSchema,role:RoleSchema})),code:z.array(SeatIdSchema).length(4) }).nullable(),
};
function validVoteResult(view:z.infer<typeof FullPublicViewShape>):boolean {
  if(!supportsVoteResults(view.versions)) return view.phase.kind!=='VOTE_RESULT' && !Object.hasOwn(view,'voteResult');
  if(!Object.hasOwn(view,'voteResult') || view.voteResult===undefined) return false;
  if(view.phase.kind!=='VOTE_RESULT') return view.voteResult===null;
  const r=view.voteResult,t=view.lastTally;
  if(r===null || t===null || r.id!==view.phase.id || r.round!==view.round || r.startedAt!==view.phase.startedAt
    || r.endsAt!==view.phase.endsAt || view.activeSeatId!==null || view.ballot.eligibleVoters.length!==0
    || view.ballot.eligibleTargets.length!==0 || view.ballot.releaseTargetSeatId!==null || r.eligibleVoterCount>view.playerCount
    || r.tiedSeatIds.some(id=>!view.seats.some(s=>s.seatId===id))) return false;
  return r.kind===t.kind && r.eligibleVoterCount===t.eligibleVoterCount && r.yesCount===t.yesCount
    && r.selectedSeatId===t.selectedSeatId && r.released===t.released && JSON.stringify(r.counts)===JSON.stringify(t.counts);
}
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
function validHackSession(view:z.infer<typeof FullPublicViewShape>):boolean {
  if(!supportsPublicHack(view.versions)) return !Object.hasOwn(view,'hackSession');
  if(!Object.hasOwn(view,'hackSession') || view.hackSession===undefined) return false;
  const session=view.hackSession;
  if(!['HACK_DECLARE','HACK_RESULT','HACK'].includes(view.phase.kind)) return session===null;
  if(session===null || session.actorSeatId!==view.activeSeatId || session.actorSeatId===session.targetSeatId
    || ![session.actorSeatId,session.targetSeatId].every(id=>view.seats.some(s=>s.seatId===id))) return false;
  return view.phase.kind==='HACK_DECLARE' ? session.hackId===view.phase.id : session.hackId!==view.phase.id;
}
function validPublicReferences(view:z.infer<typeof FullPublicViewShape>):boolean {
  const ids=view.seats.map(s=>s.seatId),has=(id:string|null)=>id===null || ids.includes(id as z.infer<typeof SeatIdSchema>);
  return validBlackoutPublic(view) && validBoardMedicalView(view) && validVoteResult(view) && validHackSession(view) && (supportsDeclaredHack(view.versions) || !['HACK_DECLARE','HACK_RESULT'].includes(view.phase.kind))
    && (!['HACK_DECLARE','HACK_RESULT','HACK'].includes(view.phase.kind) || !supportsDeclaredHack(view.versions) || view.activeSeatId!==null) && (view.phase.kind==='FINISHED'?view.endReveal!==null && view.result!==null:view.endReveal===null && view.result===null)
    && view.seats.every(s=>s.health==='Eliminated'?(s.revealedFaction!==null || (supportsCaptainCommands(view.versions) && s.location===null && view.phase.kind!=='FINISHED')):view.phase.kind==='FINISHED'||s.revealedFaction===null)
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
  self:z.strictObject({ seatId:SeatIdSchema,role:RoleSchema,movementDestinations:z.array(z.enum(['Room A','Room B','Command Room'])),releaseVoteAvailable:z.boolean(),ordinaryWeapons:z.number().int().nonnegative(),shotAvailable:z.boolean(),rescuesRemaining:z.number().int().nonnegative(),disablerAvailable:z.boolean(),hackAvailable:z.boolean(),scanAvailable:z.boolean(),codeAttemptAvailable:z.boolean(),cloneStatus:FullCloneStatusSchema.nullable().optional(),blackoutTargeting:FullBlackoutTargetingSchema.nullable().optional(),captainCommandUses:z.strictObject({releaseUsed:z.boolean(),ejectUsed:z.boolean()}).nullable().optional() }),
  knowledge:z.strictObject({insiderCandidates:z.array(SeatIdSchema),undercoverSeatId:SeatIdSchema.nullable(),code:z.array(SeatIdSchema),scanResults:z.array(z.strictObject({round:z.number().int().min(1).max(5),targetSeatId:SeatIdSchema,guess:FactionSchema,matched:z.boolean(),inCode:z.boolean().nullable()})),protections:z.array(z.strictObject({seatId:SeatIdSchema,activeFromRound:z.number().int(),consumed:z.boolean()}))}),
  legalTargets:z.record(z.string(),z.array(SeatIdSchema)), ownPendingCommandIds:z.array(IdentifierSchema).max(2),
  ownBallot:z.union([SeatIdSchema,z.boolean()]).nullable(), hasVoted:z.boolean(),
  hackPartnerSeatId:SeatIdSchema.nullable(),
  hackFeedback:FullHackFeedbackSchema.nullable().optional(),
 }).refine(v=>{
  const ids=v.seats.map(s=>s.seatId),has=(id:string|null)=>id===null || ids.includes(id as z.infer<typeof SeatIdSchema>);
  const unique=(items:string[])=>new Set(items).size===items.length && items.every(has);
  const k=v.knowledge,role=v.self.role;
  if(supportsClone(v.versions)) {
    const c=v.self.cloneStatus,current=v.seats.find(s=>s.seatId===v.self.seatId);
    if(!Object.hasOwn(v.self,'cloneStatus') || c===undefined || (role==='Alien' ? c===null : c!==null))return false;
    if(c!==null && (c.activatedRound!==null && c.activatedRound>v.round || c.active && (!c.used || c.expiresAfterRound===null || c.expiresAfterRound<v.round || current?.health==='Eliminated' || ['SHOWDOWN','FINISHED','ABORTED'].includes(v.phase.kind))))return false;
    if(c!==null && c.used && !c.active && current?.health!=='Eliminated' && !['SHOWDOWN','FINISHED','ABORTED'].includes(v.phase.kind) && c.expiresAfterRound!==null && v.round<=c.expiresAfterRound)return false;
    const offer=v.legalTargets['ACTIVATE_CLONE'];
    if(offer!==undefined && (role!=='Alien' || c===null || c.used || current?.health!=='Healthy' || current.jailed || v.phase.kind!=='ORDINARY_TURN' || v.activeSeatId!==v.self.seatId || offer.length!==1 || offer[0]!==v.self.seatId))return false;
  } else if(Object.hasOwn(v.self,'cloneStatus') || Object.hasOwn(v.legalTargets,'ACTIVATE_CLONE'))return false;
  if(supportsBlackout(v.versions)) {
    const t=v.self.blackoutTargeting,current=v.seats.find(s=>s.seatId===v.self.seatId);
    if(!Object.hasOwn(v.self,'blackoutTargeting') || t===undefined || Object.hasOwn(v.legalTargets,'DISABLE'))return false;
    if(t!==null && (v.phase.kind!=='BLACKOUT' || !['Blue Disabler','Red Disabler'].includes(role)
      || current?.health!=='Healthy' || current.jailed || current.location!==t.room || t.snapshotId!==v.blackout?.snapshotId
      || t.darkStartsAt!==v.blackout.darkStartsAt || t.endsAt!==v.phase.endsAt
      || JSON.stringify(t.slotIds)!==JSON.stringify(blackoutSlotIds(t.room,v.playerCount,v.versions))))return false;
    const selecting=v.legalTargets['SELECT_BLACKOUT_SLOT'];
    if(selecting!==undefined && (t===null || t.selectedSlotId!==null || selecting.length!==1 || selecting[0]!==v.self.seatId))return false;
  } else if(Object.hasOwn(v.self,'blackoutTargeting') || Object.hasOwn(v.legalTargets,'REQUEST_BLACKOUT') || Object.hasOwn(v.legalTargets,'SELECT_BLACKOUT_SLOT'))return false;
  if(supportsCaptainCommands(v.versions)) {
    const current=v.seats.find(s=>s.seatId===v.self.seatId);
    if(!Object.hasOwn(v.self,'captainCommandUses') || v.self.captainCommandUses===undefined
      || (current?.captain ? v.self.captainCommandUses===null : v.self.captainCommandUses!==null)) return false;
  } else if(Object.hasOwn(v.self,'captainCommandUses') || Object.hasOwn(v.legalTargets,'CAPTAIN_RELEASE') || Object.hasOwn(v.legalTargets,'CAPTAIN_EJECT')) return false;
  if(supportsPublicHack(v.versions)) {
    const session=v.hackSession,feedback=v.hackFeedback;
    const partner=session?.actorSeatId===v.self.seatId?session.targetSeatId:session?.targetSeatId===v.self.seatId?session.actorSeatId:null;
    if(partner===null) {
      if(v.hackPartnerSeatId!==null || feedback!==null) return false;
    } else if(v.hackPartnerSeatId!==partner || !feedback || feedback.hackId!==session?.hackId
      || feedback.phaseId!==v.phase.id || feedback.round!==v.round) return false;
  }
  const prelude=['HACK_DECLARE','HACK_RESULT'].includes(v.phase.kind),exchange=prelude || v.phase.kind==='HACK';
  if(!supportsDeclaredHack(v.versions)) {
    if(Object.hasOwn(v,'hackFeedback') || Object.hasOwn(v.legalTargets,'DECLARE_HACK_SIDE')) return false;
  } else {
    if(!Object.hasOwn(v,'hackFeedback') || v.hackFeedback===undefined) return false;
    if(prelude && (v.self.codeAttemptAvailable || Object.keys(v.legalTargets).some(key=>key!=='DECLARE_HACK_SIDE'))) return false;
    const f=v.hackFeedback;
    if(!exchange || v.hackPartnerSeatId===null) {
      if(f!==null || v.hackPartnerSeatId!==null || (exchange && v.activeSeatId===v.self.seatId) || Object.hasOwn(v.legalTargets,'DECLARE_HACK_SIDE')) return false;
    } else {
      if(f===null || f.phaseId!==v.phase.id || f.round!==v.round || v.hackPartnerSeatId===v.self.seatId
        || (v.activeSeatId!==v.self.seatId && v.activeSeatId!==v.hackPartnerSeatId)) return false;
      if(v.phase.kind==='HACK_DECLARE' ? f.status!=='AWAITING_DECLARATION' || f.hackId!==v.phase.id
        : f.status==='AWAITING_DECLARATION' || f.hackId===v.phase.id) return false;
      const declaration=v.legalTargets['DECLARE_HACK_SIDE'];
      if(v.phase.kind==='HACK_DECLARE' && v.activeSeatId!==v.self.seatId) {
        if(!declaration || declaration.length!==1 || declaration[0]!==v.self.seatId) return false;
      } else if(declaration!==undefined) return false;
    }
  }
  return (v.phase.kind!=='VOTE_RESULT' || (Object.keys(v.legalTargets).length===0 && v.self.movementDestinations.length===0 && !v.self.codeAttemptAvailable && !v.self.releaseVoteAvailable && v.ownBallot===null && !v.hasVoted))
    && validPublicReferences({...v,audience:{kind:'public'}}) && v.audience.seatId===v.self.seatId && has(v.self.seatId)
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
export const FullEventSchema=z.union([FullPublicEventSchema,FullPlayerEventSchema,FullOutcomeEventSchema]);
export type FullEvent=z.infer<typeof FullEventSchema>;
