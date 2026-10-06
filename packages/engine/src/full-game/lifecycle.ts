import { FullCommandRequestSchema, FullPublicViewSchema, FullPlayerViewSchema, FullAssetManifestVersionSchema, IdentifierSchema } from '@mothership/contracts';
import type { FullCommand, FullCommandRequest, FullReceipt, FullPlayerView, SeatId } from '@mothership/contracts';
import { buildRoster } from './roster.js';
import type { GameSeat } from './roster.js';
import { tallyJailVote, tallyElection, tallyReleaseVote } from './votes.js';
import { evaluateVictory } from './victory.js';
import { FULL_ENGINE_VERSION, FULL_RULESET_VERSION, FULL_RULESET_HASH } from './model.js';
import type { FullGameState, FullGameSetup, FullGameContext } from './model.js';

const clone = <T>(value:T):T => JSON.parse(JSON.stringify(value)) as T;
const alive = (seat: GameSeat) => seat.health !== 'Eliminated';
const ready = (seat: GameSeat) => seat.health === 'Healthy' && !seat.jailed;
const voterIds = (state: FullGameState) => state.seats.filter(alive).map(s => s.seatId);
const find = (state: FullGameState, id: SeatId) => state.seats.find(s => s.seatId === id);
const beforeVoting = (state: FullGameState) => ['ORDINARY_TURN','HACK','CAPTAIN_ELECTION'].includes(state.phase.kind);
function validateContext(context: FullGameContext) {
  if (!Number.isSafeInteger(context.now) || context.now < 0 || context.now > Number.MAX_SAFE_INTEGER - 60_000
    || !IdentifierSchema.safeParse(context.nextPhaseId).success || !IdentifierSchema.safeParse(context.nextDeadlineToken).success) throw new Error('Invalid trusted transition context');
}
function phase(state: FullGameState, kind: FullGameState['phase']['kind'], context: FullGameContext) {
  state.phase = { id: context.nextPhaseId, kind, startedAt: context.now, endsAt: ['FINISHED','ABORTED'].includes(kind) ? null : context.now + 60_000 };
  state.deadlineToken = state.phase.endsAt === null ? null : context.nextDeadlineToken;
  state.activeSeatId = null; state.activeHack = null;
  state.ballots = []; state.eligibleVoters = []; state.eligibleTargets = []; state.releaseTargetSeatId = null;
}
function nextTurn(state: FullGameState, context: FullGameContext): void {
  while (state.turnIndex < state.turnOrder.length && !alive(find(state,state.turnOrder[state.turnIndex]!)!)) state.turnIndex++;
  if (state.turnIndex < state.turnOrder.length) {
    phase(state,'ORDINARY_TURN',context); state.activeSeatId = state.turnOrder[state.turnIndex]!;
  } else {
    const captain = state.seats.find(s => s.captain);
    if (captain && !state.releaseUsed && state.seats.some(s=>s.jailed && alive(s))) {
      phase(state,'RELEASE_CHOICE',context); state.activeSeatId = captain.seatId;
      state.eligibleTargets = state.seats.filter(s=>s.jailed && alive(s)).map(s=>s.seatId); state.releaseChoiceMade=false;
    } else openJailVote(state,context);
  }
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
function loseCaptain(seat: GameSeat) {
  seat.captain=false;
  if (seat.location === 'Command Room') seat.location=seat.lastRoom;
}
function placement(seat: GameSeat) {
  if (!ready(seat)) loseCaptain(seat);
  if (seat.jailed) seat.location='Jail';
  else if (seat.health === 'Injured') seat.location='Hospital';
  else if (seat.health === 'Healthy' && ['Hospital','Jail'].includes(seat.location)) seat.location=seat.lastRoom;
}
function attack(state: FullGameState, target: GameSeat) {
  if (!alive(target)) return;
  // Registration has already locked target location and Command legality (V1-06).
  if (target.protection && !target.protection.consumed && target.protection.activeFromRound <= state.round) {
    target.protection.consumed=true; return;
  }
  target.health=target.health === 'Healthy' ? 'Injured' : 'Eliminated';
  if (target.captain) loseCaptain(target);
}
function factionSurvives(state: FullGameState, faction: 'Blue'|'Red') { return state.seats.some(s=>s.faction===faction && alive(s)); }
function resolveRound(state: FullGameState, context: FullGameContext, showdown=false) {
  const blueBefore=factionSurvives(state,'Blue'), redBefore=factionSurvives(state,'Red');
  // Complete stages are evaluated without intermediate victory. Actor status never cancels.
  for (const actorId of state.turnOrder) {
    const queued=state.queued.filter(q=>q.actorSeatId===actorId);
    const main=queued.filter(q=>q.command.type==='DISABLE' || q.command.type==='PROTECT');
    const shots=queued.filter(q=>q.command.type===(showdown?'SHOWDOWN_SHOT':'REGISTER_SHOT'));
    for (const q of [...main,...shots]) {
      if (!('targetSeatId' in q.command) || q.command.targetSeatId === null) continue;
      const target=find(state,q.command.targetSeatId)!;
      if (q.command.type==='PROTECT') {
        if (alive(target)) target.protection={activeFromRound:state.round+1,consumed:false,grantedBy:q.actorSeatId};
      } else attack(state,target);
    }
  }
  if (!showdown) {
    for (const actorId of state.turnOrder) for (const q of state.queued.filter(q=>q.actorSeatId===actorId)) {
      if (q.command.type==='RESCUE') {
        const target=find(state,q.command.targetSeatId)!;
        if (target.health==='Injured') target.health='Healthy';
      }
    }
    if (state.round===3) for (const q of state.queued) if (q.command.type==='SUPPLY') {
      for (const id of q.command.targetSeatIds) { const target=find(state,id)!; if (alive(target)) target.ordinaryWeapons++; }
    }
    for (const s of state.seats) placement(s);
  }
  const simultaneousElimination=blueBefore && redBefore && !factionSurvives(state,'Blue') && !factionSurvives(state,'Red');
  state.result=evaluateVictory({ seats:state.seats,round:state.round,correctCode:state.correctCode,
    codeEligibleNow:state.round===5,simultaneousElimination,finalCheckpoint:showdown });
  state.queued=[]; state.pendingHack=null;
  if (state.result) { phase(state,'FINISHED',context); return; }
  if (state.round===5) {
    for (const seat of state.seats.filter(alive)) { seat.location='Final Zone'; seat.specialShotAvailable=true; }
    phase(state,'SHOWDOWN',context); return;
  }
  state.round++;
  for (const s of state.seats) s.movedInRound=false;
  state.electionForNextRound=!state.seats.some(s=>s.captain);
  if (state.electionForNextRound) openElection(state,context); else beginRound(state,context);
}
export function createFullGame({matchId,setup,now,phaseId,deadlineToken,assetManifestVersion}: {
  matchId:string;setup:FullGameSetup;now:number;phaseId:string;deadlineToken:string;assetManifestVersion:string;
}): FullGameState {
  const context={now,nextPhaseId:phaseId,nextDeadlineToken:deadlineToken}; validateContext(context);
  if (!IdentifierSchema.safeParse(matchId).success || !FullAssetManifestVersionSchema.safeParse(assetManifestVersion).success) throw new Error('Invalid match pin');
  const {seats,code}=buildRoster(setup), seatIds=seats.map(s=>s.seatId);
  if (setup.roundOrders.length!==5 || setup.roundOrders.some(order=>order.length!==seats.length || new Set(order).size!==seats.length || order.some(id=>!seatIds.includes(id)))) throw new Error('Five recorded complete round permutations required');
  const state:FullGameState={matchId,setup:clone(setup),versions:{protocolVersion:2,rulesetVersion:FULL_RULESET_VERSION,rulesetHash:FULL_RULESET_HASH,engineVersion:FULL_ENGINE_VERSION,assetManifestVersion},
    playerCount:setup.playerCount,round:1,seats,code,phase:{id:phaseId,kind:'ORDINARY_TURN',startedAt:now,endsAt:now+60_000},deadlineToken,activeSeatId:null,
    turnIndex:0,turnOrder:[],queued:[],ballots:[],eligibleVoters:[],eligibleTargets:[],releaseTargetSeatId:null,releaseUsed:false,releaseChoiceMade:false,
    hacksThisRound:0,pendingHack:null,activeHack:null,codeSubmitted:false,correctCode:false,lastTally:null,result:null,electionForNextRound:false,journalSequence:0,
    viewRevisions:{public:0,players:Object.fromEntries(seatIds.map(id=>[id,0]))}};
  beginRound(state,context); return state;
}
const ordinaryShotAllowed=(state:FullGameState, actor:GameSeat)=>ready(actor) && actor.ordinaryWeapons>0
  && (actor.role==='Officer' ? !actor.officerShotSpent : state.round>=4);
function localTarget(state:FullGameState,actor:GameSeat,target:GameSeat,selfAllowed:boolean,remoteRescue=false) {
  return alive(target) && (selfAllowed || actor.seatId!==target.seatId) && target.location!=='Command Room'
    && (actor.location===target.location || (remoteRescue && actor.role==='Cracker' && ['Room A','Room B'].includes(actor.location) && target.location==='Hospital'));
}
function mainAllowed(state:FullGameState,actor:GameSeat) {return state.phase.kind==='ORDINARY_TURN' && state.activeSeatId===actor.seatId && actor.mainActionUsedRound!==state.round;}
export function legalTargets(state:FullGameState, actor:GameSeat):Record<string,SeatId[]> {
  const targets:Record<string,SeatId[]>={};
  const ids=(filter:(s:GameSeat)=>boolean)=>state.seats.filter(filter).map(s=>s.seatId);
  const ownTurn=state.phase.kind==='ORDINARY_TURN' && state.activeSeatId===actor.seatId;
  if (ownTurn && ordinaryShotAllowed(state,actor) && !state.queued.some(q=>q.actorSeatId===actor.seatId && q.command.type==='REGISTER_SHOT')) targets['REGISTER_SHOT']=ids(s=>localTarget(state,actor,s,false));
  if (ownTurn && alive(actor) && !actor.hackUsed && state.hacksThisRound<2) targets['REQUEST_HACK']=ids(s=>localTarget(state,actor,s,false));
  if (mainAllowed(state,actor)) {
    if (ready(actor)) {
      if ((actor.role==='Blue Disabler'||actor.role==='Red Disabler') && !actor.disablerSpent) targets['DISABLE']=ids(s=>localTarget(state,actor,s,false));
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
  if (JSON.stringify(old.public)!==JSON.stringify(next.public)) after.viewRevisions.public++;
  for (const id of after.seats.map(s=>s.seatId)) if (JSON.stringify(old.players[id])!==JSON.stringify(next.players[id])) after.viewRevisions.players[id]=(after.viewRevisions.players[id]??0)+1;
  return after;
}
export function executeFullGame(before:FullGameState,actorSeatId:SeatId,request:FullCommandRequest,context:FullGameContext):{state:FullGameState;receipt:FullReceipt} {
  validateContext(context); FullCommandRequestSchema.parse(request);
  const receiptBase={protocolVersion:2 as const,matchId:request.matchId,phaseId:request.phaseId,commandId:request.commandId};
  const reject=(code:'PHASE_CLOSED'|'NOT_ALLOWED')=>({state:before,receipt:{...receiptBase,status:'rejected' as const,code}});
  if (request.matchId!==before.matchId || request.phaseId!==before.phase.id || before.phase.endsAt===null || context.now>=before.phase.endsAt || context.now<before.phase.startedAt) return reject('PHASE_CLOSED');
  const state=clone(before),actor=find(state,actorSeatId); if (!actor || !alive(actor)) return reject('NOT_ALLOWED');
  const command=request.command,allowed=legalTargets(state,actor);
  switch(command.type) {
    case 'MOVE':
      if (!beforeVoting(state)||!ready(actor)||actor.movedInRound||!['Room A','Room B','Command Room'].includes(actor.location)
        ||command.destination===actor.location||(command.destination==='Command Room'&&!actor.captain)) return reject('NOT_ALLOWED');
      actor.location=command.destination; if(command.destination!=='Command Room')actor.lastRoom=command.destination; actor.movedInRound=true; break;
    case 'SUBMIT_CODE':
      if (actor.role!=='Hacker'||state.round!==5||state.codeSubmitted||state.phase.kind==='SHOWDOWN'||command.seatIds.some(id=>!find(state,id))) return reject('NOT_ALLOWED');
      state.codeSubmitted=true;state.correctCode=[...command.seatIds].sort().join(',')===state.code.join(',');break;
    case 'RELEASE_VOTE':
      if(state.phase.kind!=='RELEASE_VOTE'||!state.eligibleVoters.includes(actorSeatId)||state.ballots.some(b=>b.voterSeatId===actorSeatId))return reject('NOT_ALLOWED');
      state.ballots.push({voterSeatId:actorSeatId,targetSeatId:null,approve:command.approve});break;
    case 'VOTE':
      if(!['JAIL_VOTE','CAPTAIN_ELECTION'].includes(state.phase.kind)||!state.eligibleVoters.includes(actorSeatId)||state.ballots.some(b=>b.voterSeatId===actorSeatId)
        ||(command.targetSeatId!==null&&!state.eligibleTargets.includes(command.targetSeatId)))return reject('NOT_ALLOWED');
      state.ballots.push({voterSeatId:actorSeatId,targetSeatId:command.targetSeatId,approve:null});break;
    case 'RELEASE_CHOICE':
      if(state.phase.kind!=='RELEASE_CHOICE'||state.activeSeatId!==actorSeatId||state.releaseChoiceMade||(command.targetSeatId!==null&&!state.eligibleTargets.includes(command.targetSeatId)))return reject('NOT_ALLOWED');
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
  state.journalSequence++;
  return {state:revise(before,state),receipt:{...receiptBase,status:'accepted',code:'REGISTERED'}};
}
export function advanceFullGame(before:FullGameState,context:FullGameContext & {phaseId:string;deadlineToken:string}):{state:FullGameState;advanced:boolean} {
  validateContext(context);
  if(context.phaseId!==before.phase.id||context.deadlineToken!==before.deadlineToken||before.phase.endsAt===null||context.now<before.phase.endsAt)return {state:before,advanced:false};
  if(context.nextPhaseId===before.phase.id||context.nextDeadlineToken===before.deadlineToken)throw new Error('New phase identifiers required');
  const state=clone(before);
  switch(state.phase.kind) {
    case 'ORDINARY_TURN':
      if(state.pendingHack) {const hack=state.pendingHack;phase(state,'HACK',context);state.activeHack=hack;state.activeSeatId=hack.actorSeatId;state.pendingHack=null;}
      else {state.turnIndex++;nextTurn(state,context);}break;
    case 'HACK':state.turnIndex++;nextTurn(state,context);break;
    case 'RELEASE_CHOICE': {
      const target=state.releaseTargetSeatId;
      if(target!==null) {phase(state,'RELEASE_VOTE',context);state.releaseTargetSeatId=target;state.eligibleVoters=voterIds(state);}
      else openJailVote(state,context);break;
    }
    case 'RELEASE_VOTE': {
      const result=tallyReleaseVote({eligibleVoters:state.eligibleVoters,ballots:state.ballots.map(b=>({voterSeatId:b.voterSeatId,approve:b.approve}))});
      const target=state.releaseTargetSeatId!;
      if(result.released) {const seat=find(state,target)!;seat.jailed=false;placement(seat);}
      state.lastTally={kind:'RELEASE_VOTE',counts:{},eligibleVoterCount:result.eligibleVoterCount,yesCount:result.yesCount,selectedSeatId:target,released:result.released};openJailVote(state,context);break;
    }
    case 'JAIL_VOTE': {
      const result=tallyJailVote({eligibleVoters:state.eligibleVoters,eligibleTargets:state.eligibleTargets,ballots:state.ballots.map(b=>({voterSeatId:b.voterSeatId,targetSeatId:b.targetSeatId}))});
      if(result.jailedSeatId) {const seat=find(state,result.jailedSeatId)!;seat.jailed=true;placement(seat);}
      state.lastTally={kind:'JAIL_VOTE',counts:result.counts,eligibleVoterCount:result.eligibleVoterCount,yesCount:null,selectedSeatId:result.jailedSeatId,released:null};
      resolveRound(state,context);break;
    }
    case 'CAPTAIN_ELECTION': {
      const result=tallyElection({eligibleVoters:state.eligibleVoters,eligibleTargets:state.eligibleTargets,ballots:state.ballots.map(b=>({voterSeatId:b.voterSeatId,targetSeatId:b.targetSeatId}))});
      state.lastTally={kind:'CAPTAIN_ELECTION',counts:result.counts,eligibleVoterCount:result.eligibleVoterCount,yesCount:null,selectedSeatId:result.winnerSeatId,released:null};
      if(result.winnerSeatId) {const captain=find(state,result.winnerSeatId)!;captain.captain=true;captain.location='Command Room';beginRound(state,context);}
      else if(result.tiedSeatIds.length>0)openElection(state,context,result.tiedSeatIds);
      else beginRound(state,context);break;
    }
    case 'SHOWDOWN':resolveRound(state,context,true);break;
    case 'FINISHED':case 'ABORTED':return {state:before,advanced:false};
  }
  state.journalSequence++;return {state:revise(before,state),advanced:true};
}
export function abortFullGame(before:FullGameState,context:FullGameContext):FullGameState {
  validateContext(context);if(context.now<before.phase.startedAt)throw new Error('Abort cannot precede the current phase');if(before.phase.endsAt===null)return before;
  const state=clone(before);phase(state,'ABORTED',context);state.queued=[];state.pendingHack=null;state.journalSequence++;return revise(before,state);
}
export function projectFullGame(state:FullGameState) {
  const terminal=state.phase.kind==='FINISHED';
  const facts={versions:state.versions,matchId:state.matchId,viewRevision:state.viewRevisions.public,playerCount:state.playerCount,round:state.round,phase:state.phase,activeSeatId:state.activeSeatId,
    seats:state.seats.map(s=>({seatId:s.seatId,health:s.health,location:s.location,jailed:s.jailed,captain:s.captain,revealedFaction:s.health==='Eliminated'?s.faction:null})),
    ballot:{eligibleVoters:state.eligibleVoters,eligibleTargets:state.eligibleTargets,releaseTargetSeatId:state.phase.kind==='RELEASE_VOTE'?state.releaseTargetSeatId:null},lastTally:state.lastTally,result:state.result,
    endReveal:terminal?{roles:state.seats.map(s=>({seatId:s.seatId,role:s.role})),code:state.code}:null};
  const publicView=FullPublicViewSchema.parse({...facts,audience:{kind:'public'}});
  const players:Partial<Record<SeatId,FullPlayerView>>={};
  for(const self of state.seats) {
    const targets=legalTargets(state,self),own=state.ballots.find(b=>b.voterSeatId===self.seatId);
    players[self.seatId]=FullPlayerViewSchema.parse({...facts,viewRevision:state.viewRevisions.players[self.seatId]??0,audience:{kind:'player',seatId:self.seatId},
      self:{seatId:self.seatId,role:self.role,movementDestinations:beforeVoting(state)&&ready(self)&&!self.movedInRound?(['Room A','Room B',...(self.captain?['Command Room']:[])] as Array<'Room A'|'Room B'|'Command Room'>).filter(room=>room!==self.location):[],releaseVoteAvailable:state.phase.kind==='RELEASE_VOTE'&&state.eligibleVoters.includes(self.seatId)&&!own,ordinaryWeapons:self.ordinaryWeapons,shotAvailable:!!targets['REGISTER_SHOT'],rescuesRemaining:self.rescuesRemaining,disablerAvailable:!!targets['DISABLE'],hackAvailable:!!targets['REQUEST_HACK'],scanAvailable:!!targets['SCAN'],codeAttemptAvailable:self.role==='Hacker' && alive(self) && state.round===5 && !state.codeSubmitted && !['SHOWDOWN','FINISHED','ABORTED'].includes(state.phase.kind)},
      knowledge:{...self.knowledge,protections:self.role==='Undercover'?state.seats.filter(s=>s.protection!==null).map(s=>({seatId:s.seatId,activeFromRound:s.protection!.activeFromRound,consumed:s.protection!.consumed})):[]},
      legalTargets:targets,ownPendingCommandIds:state.queued.filter(q=>q.actorSeatId===self.seatId).map(q=>q.commandId),ownBallot:own?(state.phase.kind==='RELEASE_VOTE'?own.approve:own.targetSeatId):null,hasVoted:!!own,
      hackPartnerSeatId:state.activeHack?.actorSeatId===self.seatId?state.activeHack.targetSeatId:state.activeHack?.targetSeatId===self.seatId?state.activeHack.actorSeatId:null});
  }
  return {public:publicView,players};
}
