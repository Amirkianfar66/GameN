import { initializeHospitalOverflowState } from './hospital-four.js';
import type { MedicalResolutionBatch } from './medical.js';
import { initializeCloneState, assertCloneState, cloneActivationAllowed, activateClone, cloneBlocksAttack, finishCloneCheckpoint, stopCloneEffects, clearEliminatedCloneEffects } from './clone.js';
import { FullCommandRequestSchema, FullPublicViewSchema, FullPlayerViewSchema, FullAssetManifestVersionSchema, FullVersionsSchema, FullHackFeedbackSchema, IdentifierSchema } from '@mothership/contracts';
import type { FullCommand, FullCommandRequest, FullReceipt, FullPlayerView, SeatId } from '@mothership/contracts';
import { buildRoster } from './roster.js';
import type { GameSeat } from './roster.js';
import { tallyJailVote, tallyElection, tallyReleaseVote } from './votes.js';
import { evaluateVictory } from './victory.js';
import { FULL_ENGINE_VERSION, FULL_RULESET_VERSION, FULL_RULESET_HASH, isSupportedFullGameVersions, passTurnEnabled, roomCapacityEnabled, resolutionPlacementEnabled, voteResultEnabled, declaredHackEnabled, publicHackEnabled, boardMedicalEnabled, captainCommandsEnabled, blackoutEnabled, cloneEnabled, hospitalFourEnabled } from './model.js';
import type { FullGameState, FullGameSetup, FullGameContext } from './model.js';
import { roomHasSpace, assertInitialRoomCapacity, ordinaryReturnDestination } from './capacity.js';
import { placeResolvedSeats } from './placement.js';
import { captainCommandAllowed, executeCaptainCommand, assertCaptainState, closeCaptainCheckpoint } from './captain.js';
import { blackoutRequestAllowed, openBlackout, selectBlackoutSlot, finishBlackout, assertBlackoutState, projectBlackoutTargeting } from './blackout.js';
import { appendOutcome, assertOutcomes, roomBlockOutcome } from './outcomes.js';
import { moveBoardSeat } from './slots.js';
import { initializeMedicalState, assertMedicalState, beginMedicalResolution, recordMedicalDamage, healMedicalSeat, applyDueMedicalDeaths, placeImmediateMedicalSeat, placeMedicalSeats, projectMedicalStatus } from './medical.js';

const clone = <T>(value:T):T => JSON.parse(JSON.stringify(value)) as T;
const alive = (seat: GameSeat) => seat.health !== 'Eliminated';
const ready = (seat: GameSeat) => seat.health === 'Healthy' && !seat.jailed;
const voterIds = (state: FullGameState) => state.seats.filter(alive).map(s => s.seatId);
const find = (state: FullGameState, id: SeatId) => state.seats.find(s => s.seatId === id);
const beforeVoting = (state: FullGameState) => ['ORDINARY_TURN','HACK','HACK_DECLARE','HACK_RESULT','CAPTAIN_ELECTION'].includes(state.phase.kind);
// FINAL G-09 applies only to the new tuple; historical movement stays exact.
function movementWindowOpen(state: FullGameState): boolean {
  if(!publicHackEnabled(state.versions)) return beforeVoting(state);
  if(!Number.isInteger(state.turnIndex) || state.turnIndex<0 || state.turnIndex>=state.turnOrder.length
    || state.turnOrder[state.turnIndex]!==state.activeSeatId) return false;
  if(state.phase.kind==='ORDINARY_TURN') return true;
  if(!['HACK_DECLARE','HACK_RESULT','HACK'].includes(state.phase.kind)) return false;
  return state.turnOrder.slice(state.turnIndex+1).some(id=>state.seats.some(seat=>seat.seatId===id && alive(seat)));
}
function validateContext(context: FullGameContext) {
  if (!Number.isSafeInteger(context.now) || context.now < 0 || context.now > Number.MAX_SAFE_INTEGER - 60_000
    || !IdentifierSchema.safeParse(context.nextPhaseId).success || !IdentifierSchema.safeParse(context.nextDeadlineToken).success) throw new Error('Invalid trusted transition context');
}
function phase(state: FullGameState, kind: FullGameState['phase']['kind'], context: FullGameContext) {
  if(['FINISHED','ABORTED'].includes(kind))stopCloneEffects(state);
  state.phase = { id: context.nextPhaseId, kind, startedAt: context.now, endsAt: ['FINISHED','ABORTED'].includes(kind) ? null : context.now + (['HACK_DECLARE','BLACKOUT'].includes(kind)?15_000:['VOTE_RESULT','HACK_RESULT'].includes(kind)?5_000:60_000) };
  state.deadlineToken = state.phase.endsAt === null ? null : context.nextDeadlineToken;
  state.activeSeatId = null; state.activeHack = null;
  if(blackoutEnabled(state.versions))state.blackout=null;
  if(declaredHackEnabled(state.versions)) state.hackFeedback=null;
  if(voteResultEnabled(state.versions)) {state.voteResult=null;state.voteResultContinuation=null;}
  state.ballots = []; state.eligibleVoters = []; state.eligibleTargets = []; state.releaseTargetSeatId = null;
}
function openVoteResult(state:FullGameState,context:FullGameContext,votePhaseId:string,
  outcome:NonNullable<FullGameState['voteResult']>['outcome'],kind:NonNullable<FullGameState['voteResultContinuation']>['kind'],candidates:SeatId[]=[]) {
  if(!state.lastTally) throw new Error('Vote tally required');
  phase(state,'VOTE_RESULT',context);
  state.voteResult={...state.lastTally,id:state.phase.id,votePhaseId,round:state.round,
    startedAt:state.phase.startedAt,endsAt:state.phase.endsAt!,outcome,tiedSeatIds:[...candidates]};
  state.voteResultContinuation={kind,candidates:kind==='CAPTAIN_RUNOFF'?[...candidates]:[]};
}
function nextTurn(state: FullGameState, context: FullGameContext): void {
  while (state.turnIndex < state.turnOrder.length && !alive(find(state,state.turnOrder[state.turnIndex]!)!)) state.turnIndex++;
  if (state.turnIndex < state.turnOrder.length) {
    phase(state,'ORDINARY_TURN',context); state.activeSeatId = state.turnOrder[state.turnIndex]!;
  } else {
    const captain = state.seats.find(s => s.captain);
    if (!boardMedicalEnabled(state.versions) && captain && !state.releaseUsed && state.seats.some(s=>s.jailed && alive(s))) {
      phase(state,'RELEASE_CHOICE',context); state.activeSeatId = captain.seatId;
      state.eligibleTargets = state.seats.filter(s=>s.jailed && alive(s)).map(s=>s.seatId); state.releaseChoiceMade=false;
    } else openJailVote(state,context);
  }
}
function requireNewPhaseIdentifiers(state: FullGameState, context: FullGameContext) {
  if (context.nextPhaseId === state.phase.id || context.nextDeadlineToken === state.deadlineToken) throw new Error('New phase identifiers required');
}
function closeOrdinaryTurn(state: FullGameState, context: FullGameContext) {
  if (state.pendingHack) {
    const hack = state.pendingHack;
    phase(state, declaredHackEnabled(state.versions)?'HACK_DECLARE':'HACK', context);
    state.activeHack = hack; state.activeSeatId = hack.actorSeatId; state.pendingHack = null;
    if(declaredHackEnabled(state.versions)) state.hackFeedback={hackId:state.phase.id,phaseId:state.phase.id,round:state.round,status:'AWAITING_DECLARATION',declaredSide:null};
  } else { state.turnIndex++; nextTurn(state, context); }
}
function advanceHack(state:FullGameState,kind:'HACK_RESULT'|'HACK',context:FullGameContext,declaredSide:NonNullable<FullGameState['hackFeedback']>['declaredSide']) {
  const hack=state.activeHack,feedback=state.hackFeedback;
  if(!declaredHackEnabled(state.versions) || !hack || !feedback || feedback.phaseId!==state.phase.id
    || feedback.round!==state.round || state.activeSeatId!==hack.actorSeatId
    || (state.phase.kind==='HACK_DECLARE' ? feedback.hackId!==state.phase.id || feedback.status!=='AWAITING_DECLARATION'
      : state.phase.kind!=='HACK_RESULT' || feedback.status==='AWAITING_DECLARATION')) throw new Error('Current Hack continuation required');
  FullHackFeedbackSchema.parse(feedback);
  phase(state,kind,context);state.activeHack=hack;state.activeSeatId=hack.actorSeatId;
  state.hackFeedback={...feedback,phaseId:state.phase.id,status:declaredSide===null?'NO_DECLARATION':'DECLARED',declaredSide};
}
function openJailVote(state: FullGameState, context: FullGameContext) {
  phase(state,'JAIL_VOTE',context); state.eligibleVoters=voterIds(state);
  state.eligibleTargets=state.seats.filter(s=>alive(s) && !s.jailed).map(s=>s.seatId);
}
function openElection(state: FullGameState, context: FullGameContext, candidates?: SeatId[]) {
  const eligible = candidates ?? state.seats.filter(ready).map(s=>s.seatId);
  if (eligible.length === 0) { beginRound(state,context); return; }
  phase(state,'CAPTAIN_ELECTION',context); state.eligibleVoters=voterIds(state); state.eligibleTargets=eligible;
}
function beginRound(state: FullGameState, context: FullGameContext) {
  state.queued=[]; state.pendingHack=null; state.hacksThisRound=0;
  state.turnOrder=[...state.setup.roundOrders[state.round-1]!]; state.turnIndex=0;
  nextTurn(state,context);
}
function loseCaptain(state: FullGameState, seat: GameSeat) {
  seat.captain=false;
  if (seat.location === 'Command Room' && !resolutionPlacementEnabled(state.versions)) seat.location=ordinaryReturnDestination(state,seat);
}
function placement(state: FullGameState, seat: GameSeat) {
  if (boardMedicalEnabled(state.versions)) { placeImmediateMedicalSeat(state,seat); return; }
  if (!ready(seat)) loseCaptain(state,seat);
  if (seat.jailed) {
    // At most one successful Jail tally per round over five rounds. Fail closed on
    // an impossible overfull snapshot rather than placing a sixth occupant.
    if (seat.location !== 'Jail' && !roomHasSpace(state,'Jail')) throw new Error('Jail capacity invariant violated');
    seat.location='Jail';
  } else if (seat.health === 'Injured') {
    // Released Injured players can wait physically in Jail while no longer jailed.
    // Eliminated occupants retain their places and are included by roomHasSpace.
    if (seat.location === 'Hospital' || roomHasSpace(state,'Hospital')) seat.location='Hospital';
  } else if (seat.health === 'Healthy' && (seat.location!==null && ['Hospital','Jail'].includes(seat.location))) {
    seat.location=ordinaryReturnDestination(state,seat);
  }
}
function attack(state: FullGameState, target: GameSeat, showdown=false, medicalBatch?:MedicalResolutionBatch) {
  if (!alive(target)) return;
  if(cloneBlocksAttack(state,target,showdown)) { roomBlockOutcome(state,target); return; }
  // Registration has already locked target location and Command legality (V1-06).
  if (target.protection && !target.protection.consumed && target.protection.activeFromRound <= state.round) {
    target.protection.consumed=true; roomBlockOutcome(state,target); return;
  }
  if (boardMedicalEnabled(state.versions)) { recordMedicalDamage(state,target,medicalBatch); clearEliminatedCloneEffects(state); return; }
  target.health=target.health === 'Healthy' ? 'Injured' : 'Eliminated';
  if (target.captain) loseCaptain(state,target);
}
function factionSurvives(state: FullGameState, faction: 'Blue'|'Red') { return state.seats.some(s=>s.faction===faction && alive(s)); }
function resolveRound(state: FullGameState, context: FullGameContext, showdown=false,blackoutTargets:Record<string,SeatId|null>={}) {
  const blueBefore=factionSurvives(state,'Blue'), redBefore=factionSurvives(state,'Red');
  const medicalBatch=beginMedicalResolution(state);
  // Complete stages are evaluated without intermediate victory. Actor status never cancels.
  for (const actorId of state.turnOrder) {
    const queued=state.queued.filter(q=>q.actorSeatId===actorId);
    const main=queued.filter(q=>q.command.type==='DISABLE' || q.command.type==='PROTECT' || q.command.type==='REQUEST_BLACKOUT');
    const shots=queued.filter(q=>q.command.type===(showdown?'SHOWDOWN_SHOT':'REGISTER_SHOT'));
    for (const q of [...main,...shots]) {
      if(q.command.type==='REQUEST_BLACKOUT') {
        const id=blackoutTargets[actorId];if(id)attack(state,find(state,id)!,false,medicalBatch);continue;
      }
      if (!('targetSeatId' in q.command) || q.command.targetSeatId === null) continue;
      const target=find(state,q.command.targetSeatId)!;
      if (q.command.type==='PROTECT') {
        if (alive(target)) target.protection={activeFromRound:state.round+1,consumed:false,grantedBy:q.actorSeatId};
      } else attack(state,target,showdown,medicalBatch);
    }
  }
  if (!showdown) {
    for (const actorId of state.turnOrder) for (const q of state.queued.filter(q=>q.actorSeatId===actorId)) {
      if (q.command.type==='RESCUE') {
        const target=find(state,q.command.targetSeatId)!;
        if (boardMedicalEnabled(state.versions)) healMedicalSeat(target,state);
        else if (target.health==='Injured') target.health='Healthy';
      }
    }
    if (state.round===3) {
      // The stage records actual grants, including accepted actions with no surviving
      // recipients. A legacy save before this checkpoint can start complete history;
      // a legacy save past it never infers an outcome from ammunition or an empty queue.
      state.supplierGrantResults ??= [];
      for (const q of state.queued) if (q.command.type==='SUPPLY') {
        const successfulRecipientSeatIds = q.command.targetSeatIds.filter(id => alive(find(state,id)!));
        for (const id of successfulRecipientSeatIds) find(state,id)!.ordinaryWeapons++;
        state.supplierGrantResults.push({ round:3, commandId:q.commandId, supplierSeatId:q.actorSeatId,
          successfulRecipientSeatIds:[...successfulRecipientSeatIds].sort() });
      }
    }
    if (boardMedicalEnabled(state.versions)) { applyDueMedicalDeaths(state); placeMedicalSeats(state,medicalBatch); }
    else if (resolutionPlacementEnabled(state.versions)) placeResolvedSeats(state);
    else {
      // Preserve the exact 1.2 healed-first pass, including its audited return bug.
      // Earlier tuples retain the original single pass.
      if (roomCapacityEnabled(state.versions)) {
        for (const s of state.seats) if (ready(s) && s.location === 'Hospital') placement(state,s);
      }
      for (const s of state.seats) placement(state,s);
    }
  }
  if (showdown && boardMedicalEnabled(state.versions)) placeMedicalSeats(state,medicalBatch);
  clearEliminatedCloneEffects(state);
  if(!showdown)finishCloneCheckpoint(state);
  const ejectStage=captainCommandsEnabled(state.versions) && !showdown ? closeCaptainCheckpoint(state) : false;
  const simultaneousElimination=ejectStage || (blueBefore && redBefore && !factionSurvives(state,'Blue') && !factionSurvives(state,'Red'));
  state.result=evaluateVictory({ seats:state.seats,round:state.round,correctCode:state.correctCode,
    codeEligibleNow:state.round===5,simultaneousElimination,finalCheckpoint:showdown });
  state.queued=[]; state.pendingHack=null;
  if (state.result) { phase(state,'FINISHED',context); return; }
  if (state.round===5) {
    for (const seat of state.seats.filter(alive)) { if (!boardMedicalEnabled(state.versions)) seat.location='Final Zone'; seat.specialShotAvailable=true; }
    phase(state,'SHOWDOWN',context); return;
  }
  state.round++;
  for (const s of state.seats) s.movedInRound=false;
  state.electionForNextRound=!state.seats.some(s=>s.captain);
  if (state.electionForNextRound) openElection(state,context); else beginRound(state,context);
}
export function createFullGame({matchId,setup,now,phaseId,deadlineToken,assetManifestVersion,versions}: {
  matchId:string;setup:FullGameSetup;now:number;phaseId:string;deadlineToken:string;assetManifestVersion:string;versions?:FullGameState['versions'];
}): FullGameState {
  const context={now,nextPhaseId:phaseId,nextDeadlineToken:deadlineToken}; validateContext(context);
  if (!IdentifierSchema.safeParse(matchId).success || !FullAssetManifestVersionSchema.safeParse(assetManifestVersion).success) throw new Error('Invalid match pin');
  const recordedVersions = FullVersionsSchema.parse(versions ?? {protocolVersion:2,rulesetVersion:FULL_RULESET_VERSION,rulesetHash:FULL_RULESET_HASH,engineVersion:FULL_ENGINE_VERSION,assetManifestVersion});
  if (!isSupportedFullGameVersions(recordedVersions) || recordedVersions.assetManifestVersion !== assetManifestVersion
    || (hospitalFourEnabled(recordedVersions) && assetManifestVersion !== 'design-0.5.0')) throw new Error('Unsupported full-game version pins');
  const {seats,code}=buildRoster(setup), seatIds=seats.map(s=>s.seatId);
  assertInitialRoomCapacity(setup, recordedVersions);
  if (setup.roundOrders.length!==5 || setup.roundOrders.some(order=>order.length!==seats.length || new Set(order).size!==seats.length || order.some(id=>!seatIds.includes(id)))) throw new Error('Five recorded complete round permutations required');
  const state:FullGameState={matchId,setup:clone(setup),versions:clone(recordedVersions),
    playerCount:setup.playerCount,round:1,seats,code,phase:{id:phaseId,kind:'ORDINARY_TURN',startedAt:now,endsAt:now+60_000},deadlineToken,activeSeatId:null,
    turnIndex:0,turnOrder:[],queued:[],ballots:[],eligibleVoters:[],eligibleTargets:[],releaseTargetSeatId:null,releaseUsed:false,releaseChoiceMade:false,
    hacksThisRound:0,pendingHack:null,activeHack:null,codeSubmitted:false,correctCode:false,lastTally:null,result:null,electionForNextRound:false,supplierGrantResults:[],journalSequence:0,
    ...(blackoutEnabled(recordedVersions)?{blackout:null}:{}),
    ...(captainCommandsEnabled(recordedVersions)?{captainPowersUsed:{releaseUsed:false,ejectUsed:false},pendingCaptainReveal:null,pendingEjectStage:null,outcomes:[]}:{}),
    ...(voteResultEnabled(recordedVersions)?{voteResult:null,voteResultContinuation:null}:{}),
    ...(declaredHackEnabled(recordedVersions)?{hackFeedback:null}:{}),
    viewRevisions:{public:0,players:Object.fromEntries(seatIds.map(id=>[id,0]))}};
  initializeHospitalOverflowState(state);
  if (boardMedicalEnabled(state.versions)) initializeMedicalState(state);
  initializeCloneState(state);
  beginRound(state,context); assertMedicalState(state); assertCaptainState(state); assertOutcomes(state); assertBlackoutState(state); assertCloneState(state); return state;
}
const ordinaryShotAllowed=(state:FullGameState, actor:GameSeat)=>ready(actor) && actor.ordinaryWeapons>0
  && (actor.role==='Officer' ? !actor.officerShotSpent : state.round>=4);
function localTarget(state:FullGameState,actor:GameSeat,target:GameSeat,selfAllowed:boolean,remoteRescue=false) {
  return alive(target) && (selfAllowed || actor.seatId!==target.seatId) && target.location!=='Command Room'
    && (actor.location===target.location || (remoteRescue && actor.role==='Cracker' && (actor.location!==null && ['Room A','Room B'].includes(actor.location)) && target.location==='Hospital'));
}
function mainAllowed(state:FullGameState,actor:GameSeat) {return state.phase.kind==='ORDINARY_TURN' && state.activeSeatId===actor.seatId && actor.mainActionUsedRound!==state.round;}
export function legalTargets(state:FullGameState, actor:GameSeat):Record<string,SeatId[]> {
  const targets:Record<string,SeatId[]>={};
  const ids=(filter:(s:GameSeat)=>boolean)=>state.seats.filter(filter).map(s=>s.seatId);
  if(declaredHackEnabled(state.versions) && state.phase.kind==='HACK_DECLARE' && state.activeHack?.targetSeatId===actor.seatId && alive(actor)) targets['DECLARE_HACK_SIDE']=[actor.seatId];
  const ownTurn=state.phase.kind==='ORDINARY_TURN' && state.activeSeatId===actor.seatId;
  if(cloneActivationAllowed(state,actor))targets['ACTIVATE_CLONE']=[actor.seatId];
  if(blackoutRequestAllowed(state,actor))targets['REQUEST_BLACKOUT']=[actor.seatId];
  const targeting=blackoutEnabled(state.versions)?projectBlackoutTargeting(state,actor):null;
  if(targeting && targeting.selectedSlotId===null)targets['SELECT_BLACKOUT_SLOT']=[actor.seatId];
  for(const type of ['CAPTAIN_RELEASE','CAPTAIN_EJECT'] as const) if(captainCommandAllowed(state,actor,type)) targets[type]=[actor.seatId];
  if (ownTurn && alive(actor) && passTurnEnabled(state.versions)) targets['PASS_TURN']=[actor.seatId];
  if (ownTurn && ordinaryShotAllowed(state,actor) && !state.queued.some(q=>q.actorSeatId===actor.seatId && q.command.type==='REGISTER_SHOT')) targets['REGISTER_SHOT']=ids(s=>localTarget(state,actor,s,false));
  if (ownTurn && alive(actor) && !actor.hackUsed && state.hacksThisRound<2) targets['REQUEST_HACK']=ids(s=>localTarget(state,actor,s,false));
  if (mainAllowed(state,actor)) {
    if (ready(actor)) {
      if (!blackoutEnabled(state.versions) && (actor.role==='Blue Disabler'||actor.role==='Red Disabler') && !actor.disablerSpent) targets['DISABLE']=ids(s=>localTarget(state,actor,s,false));
      // This lifetime knowledge belongs only to Undercover. No other target hint sees it.
      if (actor.role==='Undercover') targets['PROTECT']=ids(s=>localTarget(state,actor,s,true) && !s.lifetimeProtectionReceived);
      if (actor.role==='Supplier' && state.round===3) targets['SUPPLY']=ids(s=>localTarget(state,actor,s,true));
      if (actor.role==='Hacker' && actor.scanUsedRound!==state.round) targets['SCAN']=ids(s=>localTarget(state,actor,s,true));
    }
    if (actor.role==='Cracker' && !actor.jailed && alive(actor) && actor.rescuesRemaining>0) targets['RESCUE']=ids(s=>localTarget(state,actor,s,true,true) && (ready(actor)||s.seatId===actor.seatId));
  }
  if (state.phase.kind==='SHOWDOWN' && alive(actor) && actor.specialShotAvailable) targets['SHOWDOWN_SHOT']=ids(s=>alive(s) && s.seatId!==actor.seatId);
  if (['JAIL_VOTE','CAPTAIN_ELECTION'].includes(state.phase.kind) && state.eligibleVoters.includes(actor.seatId) && !state.ballots.some(b=>b.voterSeatId===actor.seatId)) targets['VOTE']=[...state.eligibleTargets];
  if (state.phase.kind==='RELEASE_CHOICE' && state.activeSeatId===actor.seatId && !state.releaseChoiceMade) targets['RELEASE_CHOICE']=[...state.eligibleTargets];
  return targets;
}
function revise(before:FullGameState,after:FullGameState):FullGameState {
  const old=projectFullGame(before),next=projectFullGame(after);
  const outcomes=after.outcomes?.slice(before.outcomes?.length??0)??[];
  if (JSON.stringify(old.public)!==JSON.stringify(next.public) || outcomes.some(o=>o.recipientSeatIds===null)) after.viewRevisions.public++;
  for (const id of after.seats.map(s=>s.seatId)) if (JSON.stringify(old.players[id])!==JSON.stringify(next.players[id]) || outcomes.some(o=>o.recipientSeatIds===null || o.recipientSeatIds.includes(id))) after.viewRevisions.players[id]=(after.viewRevisions.players[id]??0)+1;
  return after;
}
export function executeFullGame(before:FullGameState,actorSeatId:SeatId,request:FullCommandRequest,context:FullGameContext):{state:FullGameState;receipt:FullReceipt} {
  assertMedicalState(before); assertCaptainState(before); assertOutcomes(before); assertBlackoutState(before); assertCloneState(before);
  validateContext(context); FullCommandRequestSchema.parse(request);
  const receiptBase={protocolVersion:2 as const,matchId:request.matchId,phaseId:request.phaseId,commandId:request.commandId};
  const reject=(code:'PHASE_CLOSED'|'NOT_ALLOWED')=>({state:before,receipt:{...receiptBase,status:'rejected' as const,code}});
  if (request.matchId!==before.matchId || request.phaseId!==before.phase.id || before.phase.endsAt===null || context.now>=before.phase.endsAt || context.now<before.phase.startedAt) return reject('PHASE_CLOSED');
  if(before.phase.kind==='VOTE_RESULT') return reject('NOT_ALLOWED');
  const state=clone(before),actor=find(state,actorSeatId); if (!actor || !alive(actor)) return reject('NOT_ALLOWED');
  const command=request.command,allowed=legalTargets(state,actor);
  switch(command.type) {
    case 'REQUEST_BLACKOUT':
      if(!blackoutRequestAllowed(state,actor))return reject('NOT_ALLOWED');
      actor.mainActionUsedRound=state.round;state.queued.push({commandId:request.commandId,actorSeatId,command});break;
    case 'SELECT_BLACKOUT_SLOT':
      if(!selectBlackoutSlot(state,actor,command,request.commandId,context.now))return reject('NOT_ALLOWED');break;
    case 'CAPTAIN_RELEASE': case 'CAPTAIN_EJECT': {
      if(!captainCommandAllowed(state,actor,command.type)) return reject('NOT_ALLOWED');
      const affected=state.seats.filter(s=>s.location==='Jail' && (command.type==='CAPTAIN_EJECT' || alive(s))).map(s=>s.seatId);
      executeCaptainCommand(state,actor,command.type,request.commandId);
      if(!(hospitalFourEnabled(state.versions) && command.type==='CAPTAIN_EJECT'))appendOutcome(state,{type:'CAPTAIN_OUTCOME',phaseId:state.phase.id,round:state.round,kind:command.type==='CAPTAIN_RELEASE'?'RELEASE':'EJECT',seatIds:affected});
      break;
    }
    case 'PASS_TURN':
      if (!allowed['PASS_TURN']?.includes(actorSeatId)) return reject('NOT_ALLOWED');
      requireNewPhaseIdentifiers(state, context); closeOrdinaryTurn(state, context); break;
    case 'DECLARE_HACK_SIDE':
      if(!allowed['DECLARE_HACK_SIDE']?.includes(actorSeatId)
        || (!['Undercover','Alien'].includes(actor.role) && command.declaredSide!==actor.faction)) return reject('NOT_ALLOWED');
      requireNewPhaseIdentifiers(state,context);advanceHack(state,'HACK_RESULT',context,command.declaredSide);break;
    case 'MOVE':
      if (!movementWindowOpen(state)||!ready(actor)||actor.movedInRound||!(actor.location!==null && ['Room A','Room B','Command Room'].includes(actor.location))
        ||command.destination===actor.location||(command.destination==='Command Room'&&!actor.captain)||!roomHasSpace(state,command.destination)) return reject('NOT_ALLOWED');
      if (boardMedicalEnabled(state.versions)) moveBoardSeat(state,actor,command.destination);
      else actor.location=command.destination;
      if(command.destination!=='Command Room')actor.lastRoom=command.destination; actor.movedInRound=true; break;
    case 'ACTIVATE_CLONE':
      if(!allowed['ACTIVATE_CLONE']?.includes(actorSeatId))return reject('NOT_ALLOWED');
      activateClone(state,actor);break;
    case 'SUBMIT_CODE':
      if (actor.role!=='Hacker'||state.round!==5||state.codeSubmitted||['SHOWDOWN','HACK_DECLARE','HACK_RESULT'].includes(state.phase.kind)||command.seatIds.some(id=>!find(state,id))) return reject('NOT_ALLOWED');
      state.codeSubmitted=true;state.correctCode=[...command.seatIds].sort().join(',')===state.code.join(',');break;
    case 'RELEASE_VOTE':
      if(boardMedicalEnabled(state.versions)||state.phase.kind!=='RELEASE_VOTE'||!state.eligibleVoters.includes(actorSeatId)||state.ballots.some(b=>b.voterSeatId===actorSeatId))return reject('NOT_ALLOWED');
      state.ballots.push({voterSeatId:actorSeatId,targetSeatId:null,approve:command.approve});break;
    case 'VOTE':
      if(!['JAIL_VOTE','CAPTAIN_ELECTION'].includes(state.phase.kind)||!state.eligibleVoters.includes(actorSeatId)||state.ballots.some(b=>b.voterSeatId===actorSeatId)
        ||(command.targetSeatId!==null&&!state.eligibleTargets.includes(command.targetSeatId)))return reject('NOT_ALLOWED');
      state.ballots.push({voterSeatId:actorSeatId,targetSeatId:command.targetSeatId,approve:null});break;
    case 'RELEASE_CHOICE':
      if(boardMedicalEnabled(state.versions)||state.phase.kind!=='RELEASE_CHOICE'||state.activeSeatId!==actorSeatId||state.releaseChoiceMade||(command.targetSeatId!==null&&!state.eligibleTargets.includes(command.targetSeatId)))return reject('NOT_ALLOWED');
      state.releaseChoiceMade=true;state.releaseTargetSeatId=command.targetSeatId; if(command.targetSeatId!==null)state.releaseUsed=true;break;
    case 'SUPPLY':
      if(command.targetSeatIds.some(id=>!allowed['SUPPLY']?.includes(id)))return reject('NOT_ALLOWED');
      actor.mainActionUsedRound=state.round;state.queued.push({commandId:request.commandId,actorSeatId,command});break;
    default:
      if(!allowed[command.type]?.includes(command.targetSeatId))return reject('NOT_ALLOWED');
      if(command.type==='SCAN') {
        actor.mainActionUsedRound=state.round;actor.scanUsedRound=state.round;
        const target=find(state,command.targetSeatId)!;const matched=target.faction===command.guess;
        actor.knowledge.scanResults.push({round:state.round,targetSeatId:target.seatId,guess:command.guess,matched,inCode:matched?state.code.includes(target.seatId):null});
      } else if(command.type==='REQUEST_HACK') {
        actor.hackUsed=true;state.hacksThisRound++;state.pendingHack={actorSeatId,targetSeatId:command.targetSeatId};
      } else {
        if(command.type==='REGISTER_SHOT') {actor.ordinaryWeapons--;if(actor.role==='Officer')actor.officerShotSpent=true;}
        else if(command.type==='SHOWDOWN_SHOT')actor.specialShotAvailable=false;
        else {
          actor.mainActionUsedRound=state.round;
          if(command.type==='DISABLE')actor.disablerSpent=true;
          if(command.type==='RESCUE')actor.rescuesRemaining--;
          if(command.type==='PROTECT')find(state,command.targetSeatId)!.lifetimeProtectionReceived=true;
        }
        state.queued.push({commandId:request.commandId,actorSeatId,command});
      }
  }
  clearEliminatedCloneEffects(state);
  state.journalSequence++;
  return {state:revise(before,state),receipt:{...receiptBase,status:'accepted',code:'REGISTERED'}};
}
export function advanceFullGame(before:FullGameState,context:FullGameContext & {phaseId:string;deadlineToken:string}):{state:FullGameState;advanced:boolean} {
  assertMedicalState(before); assertCaptainState(before); assertOutcomes(before); assertBlackoutState(before); assertCloneState(before);
  validateContext(context);
  if(context.phaseId!==before.phase.id||context.deadlineToken!==before.deadlineToken||before.phase.endsAt===null||context.now<before.phase.endsAt)return {state:before,advanced:false};
  requireNewPhaseIdentifiers(before, context);
  const state=clone(before);
  switch(state.phase.kind) {
    case 'ORDINARY_TURN':closeOrdinaryTurn(state,context);break;
    case 'HACK_DECLARE':advanceHack(state,'HACK_RESULT',context,null);break;
    case 'HACK_RESULT':advanceHack(state,'HACK',context,state.hackFeedback?.declaredSide??null);break;
    case 'HACK':state.turnIndex++;nextTurn(state,context);break;
    case 'RELEASE_CHOICE': {
      const target=state.releaseTargetSeatId;
      if(target!==null) {phase(state,'RELEASE_VOTE',context);state.releaseTargetSeatId=target;state.eligibleVoters=voterIds(state);}
      else openJailVote(state,context);break;
    }
    case 'RELEASE_VOTE': {
      const result=tallyReleaseVote({eligibleVoters:state.eligibleVoters,ballots:state.ballots.map(b=>({voterSeatId:b.voterSeatId,approve:b.approve}))});
      const target=state.releaseTargetSeatId!;
      if(result.released) {const seat=find(state,target)!;seat.jailed=false;placement(state,seat);}
      state.lastTally={kind:'RELEASE_VOTE',counts:{},eligibleVoterCount:result.eligibleVoterCount,yesCount:result.yesCount,selectedSeatId:target,released:result.released};
      if(voteResultEnabled(state.versions)) openVoteResult(state,context,before.phase.id,result.released?'PLAYER_RELEASED':'RELEASE_DENIED','JAIL_VOTE');
      else openJailVote(state,context);break;
    }
    case 'JAIL_VOTE': {
      const result=tallyJailVote({eligibleVoters:state.eligibleVoters,eligibleTargets:state.eligibleTargets,ballots:state.ballots.map(b=>({voterSeatId:b.voterSeatId,targetSeatId:b.targetSeatId}))});
      if(result.jailedSeatId) {const seat=find(state,result.jailedSeatId)!;seat.jailed=true;placement(state,seat);}
      state.lastTally={kind:'JAIL_VOTE',counts:result.counts,eligibleVoterCount:result.eligibleVoterCount,yesCount:null,selectedSeatId:result.jailedSeatId,released:null};
      if(voteResultEnabled(state.versions)) {
        const maximum=Math.max(0,...Object.values(result.counts));
        const top=maximum===0?[]:Object.keys(result.counts).filter(id=>result.counts[id]===maximum).sort() as SeatId[];
        openVoteResult(state,context,before.phase.id,result.jailedSeatId?'PLAYER_JAILED':'NO_JAIL_SELECTION','RESOLVE_ROUND',top.length>1?top:[]);
      }
      else resolveRound(state,context);break;
    }
    case 'CAPTAIN_ELECTION': {
      const result=tallyElection({eligibleVoters:state.eligibleVoters,eligibleTargets:state.eligibleTargets,ballots:state.ballots.map(b=>({voterSeatId:b.voterSeatId,targetSeatId:b.targetSeatId}))});
      state.lastTally={kind:'CAPTAIN_ELECTION',counts:result.counts,eligibleVoterCount:result.eligibleVoterCount,yesCount:null,selectedSeatId:result.winnerSeatId,released:null};
      if(voteResultEnabled(state.versions)) {
        if(result.winnerSeatId) {const captain=find(state,result.winnerSeatId)!;captain.captain=true;if(boardMedicalEnabled(state.versions))moveBoardSeat(state,captain,'Command Room');else captain.location='Command Room';}
        openVoteResult(state,context,before.phase.id,result.winnerSeatId?'CAPTAIN_ELECTED':result.tiedSeatIds.length?'RUNOFF_REQUIRED':'NO_CAPTAIN_ELECTED',
          result.tiedSeatIds.length?'CAPTAIN_RUNOFF':'BEGIN_ROUND',result.tiedSeatIds);break;
      }
      if(result.winnerSeatId) {const captain=find(state,result.winnerSeatId)!;captain.captain=true;if(boardMedicalEnabled(state.versions))moveBoardSeat(state,captain,'Command Room');else captain.location='Command Room';beginRound(state,context);}
      else if(result.tiedSeatIds.length>0)openElection(state,context,result.tiedSeatIds);
      else beginRound(state,context);break;
    }
    case 'VOTE_RESULT': {
      const continuation=state.voteResultContinuation;
      if(!voteResultEnabled(state.versions) || !state.voteResult || !continuation) throw new Error('Invalid vote result continuation');
      const result=state.voteResult;
      const expected=result.kind==='JAIL_VOTE'?'RESOLVE_ROUND':result.kind==='RELEASE_VOTE'?'JAIL_VOTE':result.outcome==='RUNOFF_REQUIRED'?'CAPTAIN_RUNOFF':'BEGIN_ROUND';
      if(continuation.kind!==expected || JSON.stringify(continuation.candidates)!==JSON.stringify(expected==='CAPTAIN_RUNOFF'?result.tiedSeatIds:[])) throw new Error('Invalid vote result continuation');
      switch(continuation.kind) {
        case 'BEGIN_ROUND':beginRound(state,context);break;
        case 'CAPTAIN_RUNOFF':openElection(state,context,continuation.candidates);break;
        case 'JAIL_VOTE':openJailVote(state,context);break;
        case 'RESOLVE_ROUND':
          if(blackoutEnabled(state.versions)){phase(state,'BLACKOUT',context);openBlackout(state);}else resolveRound(state,context);break;
        default:throw new Error('Invalid vote result continuation');
      }
      break;
    }
    case 'BLACKOUT':
      if(!blackoutEnabled(state.versions))throw new Error('Unsupported Blackout phase');
      resolveRound(state,context,false,finishBlackout(state));break;
    case 'SHOWDOWN':resolveRound(state,context,true);break;
    case 'FINISHED':case 'ABORTED':return {state:before,advanced:false};
  }
  state.journalSequence++;return {state:revise(before,state),advanced:true};
}
export function abortFullGame(before:FullGameState,context:FullGameContext):FullGameState {
  assertMedicalState(before); assertCaptainState(before); assertOutcomes(before); assertBlackoutState(before); assertCloneState(before);
  validateContext(context);if(context.now<before.phase.startedAt)throw new Error('Abort cannot precede the current phase');if(before.phase.endsAt===null)return before;
  const state=clone(before);phase(state,'ABORTED',context);state.queued=[];state.pendingHack=null;state.journalSequence++;return revise(before,state);
}
export function projectFullGame(state:FullGameState) {
  assertMedicalState(state); assertCaptainState(state); assertOutcomes(state); assertBlackoutState(state); assertCloneState(state);
  const terminal=state.phase.kind==='FINISHED';
  const facts={versions:state.versions,matchId:state.matchId,viewRevision:state.viewRevisions.public,playerCount:state.playerCount,round:state.round,phase:state.phase,activeSeatId:state.activeSeatId,
    seats:state.seats.map(s=>({seatId:s.seatId,health:s.health,location:s.location,jailed:s.jailed,captain:s.captain,revealedFaction:s.health==='Eliminated' && !(captainCommandsEnabled(state.versions) && state.pendingCaptainReveal?.seatIds.includes(s.seatId))?s.faction:null,
      ...(boardMedicalEnabled(state.versions)?{slotId:s.slotId!,medical:projectMedicalStatus(state,s)}:{})})),
    ballot:{eligibleVoters:state.eligibleVoters,eligibleTargets:state.eligibleTargets,releaseTargetSeatId:state.phase.kind==='RELEASE_VOTE'?state.releaseTargetSeatId:null},lastTally:state.lastTally,result:state.result,
    ...(voteResultEnabled(state.versions)?{voteResult:state.voteResult??null}:{}),
    ...(blackoutEnabled(state.versions)?{blackout:state.blackout?{snapshotId:state.blackout.snapshotId,layoutRevision:hospitalFourEnabled(state.versions)?'board-v2-four-0.1.0':'board-v2-0.1.1',darkStartsAt:state.blackout.darkStartsAt}:null}:{}),
    ...(publicHackEnabled(state.versions)?{hackSession:state.activeHack && state.hackFeedback
      ? {hackId:state.hackFeedback.hackId,actorSeatId:state.activeHack.actorSeatId,targetSeatId:state.activeHack.targetSeatId}:null}:{}),
    endReveal:terminal?{roles:state.seats.map(s=>({seatId:s.seatId,role:s.role})),code:state.code}:null};
  const publicView=FullPublicViewSchema.parse({...facts,audience:{kind:'public'}});
  const players:Partial<Record<SeatId,FullPlayerView>>={};
  for(const self of state.seats) {
    const targets=legalTargets(state,self),own=state.ballots.find(b=>b.voterSeatId===self.seatId);
    players[self.seatId]=FullPlayerViewSchema.parse({...facts,viewRevision:state.viewRevisions.players[self.seatId]??0,audience:{kind:'player',seatId:self.seatId},
      self:{seatId:self.seatId,role:self.role,...(cloneEnabled(state.versions)?{cloneStatus:self.cloneStatus}:{}),...(blackoutEnabled(state.versions)?{blackoutTargeting:projectBlackoutTargeting(state,self)}:{}),...(captainCommandsEnabled(state.versions)?{captainCommandUses:self.captain?{...state.captainPowersUsed!}:null}:{}),movementDestinations:movementWindowOpen(state)&&ready(self)&&!self.movedInRound?(['Room A','Room B',...(self.captain?['Command Room']:[])] as Array<'Room A'|'Room B'|'Command Room'>).filter(room=>room!==self.location && roomHasSpace(state,room)):[],releaseVoteAvailable:state.phase.kind==='RELEASE_VOTE'&&state.eligibleVoters.includes(self.seatId)&&!own,ordinaryWeapons:self.ordinaryWeapons,shotAvailable:!!targets['REGISTER_SHOT'],rescuesRemaining:self.rescuesRemaining,disablerAvailable:!!targets['DISABLE'] || !!targets['REQUEST_BLACKOUT'],hackAvailable:!!targets['REQUEST_HACK'],scanAvailable:!!targets['SCAN'],codeAttemptAvailable:self.role==='Hacker' && alive(self) && state.round===5 && !state.codeSubmitted && !['VOTE_RESULT','HACK_DECLARE','HACK_RESULT','SHOWDOWN','FINISHED','ABORTED'].includes(state.phase.kind)},
      knowledge:{...self.knowledge,protections:self.role==='Undercover'?state.seats.filter(s=>s.protection!==null).map(s=>({seatId:s.seatId,activeFromRound:s.protection!.activeFromRound,consumed:s.protection!.consumed})):[]},
      legalTargets:targets,ownPendingCommandIds:state.queued.filter(q=>q.actorSeatId===self.seatId).map(q=>q.commandId),ownBallot:own?(state.phase.kind==='RELEASE_VOTE'?own.approve:own.targetSeatId):null,hasVoted:!!own,
      ...(declaredHackEnabled(state.versions)?{hackFeedback:state.activeHack && [state.activeHack.actorSeatId,state.activeHack.targetSeatId].includes(self.seatId)?state.hackFeedback??null:null}:{}),
      hackPartnerSeatId:state.activeHack?.actorSeatId===self.seatId?state.activeHack.targetSeatId:state.activeHack?.targetSeatId===self.seatId?state.activeHack.actorSeatId:null});
  }
  return {public:publicView,players};
}
