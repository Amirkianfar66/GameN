import { PLANET_GAME_PINS, PLANET_PHASE_DURATIONS, PlanetVersionsSchema, PlanetCommandRequestSchema, PlanetReceiptSchema, IdentifierSchema } from '@mothership/contracts';
import type { PlanetCommandRequest, PlanetReceipt, PlanetPhaseKind, SeatId } from '@mothership/contracts';
import { copyPlanet, seatIds, planetWorld, planetSeat, freeHealthy, alive, planetSeatView, storePlanetEvent, planetHasSyncPresentation, planetHasPrivateFeedback } from './model.js';
import type { PlanetGameSetup, PlanetGameContext, PlanetGameState, PlanetWorld } from './model.js';
import { assertPlanetContext, assertPlanetGameState } from './validation.js';
import { planetCommand } from './commands.js';
import { projectPlanetPublic, projectPlanetPlayer, stampPlanetEventPublications } from './projection.js';
import { resolvePlanetPhysical, jailPlanetSeat, planetSlotIds } from './physical.js';
import { finalizePlanetPromises } from './social.js';
import { planetNavigationWeights, nextPlanetPosition } from './navigation.js';
import { tallyElection, tallyJailVote } from '../full-game/votes.js';

function phase(state:PlanetGameState,kind:PlanetPhaseKind,ctx:PlanetGameContext):void {
  if(ctx.nextPhaseId===state.phase?.id||ctx.nextDeadlineToken===state.deadlineToken)throw Error('Fresh phase/deadline identities required');
  const duration=PLANET_PHASE_DURATIONS[kind];state.phase={id:ctx.nextPhaseId,kind,startedAt:ctx.now,endsAt:duration===null?null:ctx.now+duration};
  state.deadlineToken=duration===null?null:ctx.nextDeadlineToken;state.activeSeatId=null;state.blackoutPreviewComplete=false;
}
function publishBoard(state:PlanetGameState,round=state.finalized.round):void {
  const world=planetWorld(state);state.finalized={round,seats:world.seats.map(s=>planetSeatView(world,s)),events:copyPlanet(world.events)};
}
function revisions(before:PlanetGameState,after:PlanetGameState):PlanetGameState {
  // Revisions count changed authorized views, never internal commands or hidden world operations.
  const withoutRevision=(value:{viewRevision:number})=>JSON.stringify({...value,viewRevision:0});
  if(withoutRevision(projectPlanetPublic(before))!==withoutRevision(projectPlanetPublic(after)))after.revisions.public++;
  for(const id of seatIds(after))if(withoutRevision(projectPlanetPlayer(before,id))!==withoutRevision(projectPlanetPlayer(after,id)))after.revisions.players[id]!++;
  stampPlanetEventPublications(after);assertPlanetGameState(after);return after;
}
type TransitionContext=PlanetGameContext&{randomIndex:number};
function draw(ctx:PlanetGameContext,size:number):number {
  const runtime=ctx as TransitionContext;const sample=ctx.random[runtime.randomIndex++];if(sample===undefined)throw Error('Recorded randomness exhausted');return Math.floor(sample*size);
}
function roundOrder(state:PlanetGameState,ctx:PlanetGameContext):SeatId[] {
  const saved=state.global.roundOrders[String(state.round)];if(saved)return [...saved];
  const ids=seatIds(state);for(let i=ids.length-1;i>0;i--){const j=draw(ctx,i+1);[ids[i],ids[j]]=[ids[j]!,ids[i]!];}
  state.global.roundOrders[String(state.round)]=ids;return [...ids];
}
function terminal(state:PlanetGameState,ctx:PlanetGameContext,reason:'ARRIVAL'|'NO_SURVIVORS'|'ABORTED',winner:'Blue'|'Red'|null=null):void {
  const world=planetWorld(state),alien=world.seats.find(s=>state.roles[s.seatId]==='Alien');
  state.result={winner,reason,alienCoWinner:reason==='ARRIVAL'&&Boolean(alien&&alive(alien)&&state.global.blackholeSpent)};
  for(const w of Object.values(state.worlds))for(const s of w.seats){s.clone.active=false;if(s.medical)s.medical.rescueOpportunity='CLOSED';}
  state.hack=null;state.panelOpen=false;state.ballot=null;finalizePlanetPromises(state,'MATCH_END');phase(state,reason==='ABORTED'?'ABORTED':'FINISHED',ctx);publishBoard(state,state.round);
}
function appointmentDone(state:PlanetGameState,ctx:PlanetGameContext):void {
  const world=planetWorld(state);finalizePlanetPromises(state,'APPOINTMENT',{captainSeatId:world.captainSeatId,officerSeatId:world.officerSeatId,electionId:state.ballot?.electionId??state.phase.id});
  state.ballot=null;publishBoard(state);phase(state,'PRE_TURN',ctx);
}
function openElection(state:PlanetGameState,ctx:PlanetGameContext,candidates?:SeatId[],electionId?:string):void {
  const world=planetWorld(state),targets=candidates??world.seats.filter(freeHealthy).map(s=>s.seatId);
  if(targets.length===0){state.ballot=null;phase(state,'PRE_TURN',ctx);return;}
  phase(state,'CAPTAIN_ELECTION',ctx);state.ballot={kind:'CAPTAIN_ELECTION',eligibleVoters:world.seats.filter(alive).map(s=>s.seatId),eligibleTargets:[...targets],votes:{},runoff:candidates!==undefined,electionId:electionId??state.phase.id};
}
function beginNextRound(state:PlanetGameState,ctx:PlanetGameContext):void {
  if(state.round>=Number.MAX_SAFE_INTEGER-2)throw Error('Planet round integer exhausted');state.round++;
  state.global.lastBlockedSeatId=state.global.blockedSeatId;state.global.blockedSeatId=null;state.global.movementSpent=[];state.global.hackSpent=[];
  state.blackholeActive=false;state.hack=null;state.panelOpen=true;state.navigation.direction=null;state.navigation.started=false;state.afterVote=null;state.ballot=null;
  if(planetHasPrivateFeedback(state.versions)){state.navigation.settingTie=false;state.navigation.settingDirection=null;}
  const world=planetWorld(state);world.actions=[];world.events=[];world.suppressedSeatIds=[];world.shipHackOverride=false;
  for(const seat of world.seats){seat.roleActionSpent=false;seat.shotSpent=false;if(seat.medical)seat.medical.rescueOpportunity=seat.medical.rescueDueAfterRound<=state.round?'CURRENT_NORMAL_ROUND':'NEXT_NORMAL_ROUND';}
  state.turnOrder=roundOrder(state,ctx);state.turnIndex=0;state.electionNeeded=world.captainSeatId===null;
  if(state.electionNeeded)openElection(state,ctx);else phase(state,'PRE_TURN',ctx);
}
function moveShip(state:PlanetGameState,ctx:PlanetGameContext):void {
  if(state.navigation.lastMovedRound>=state.round)throw Error('Movement already completed for round');
  const direction=state.round===1?'Blue':state.navigation.direction;if(direction===null)throw Error('Final direction required');
  state.navigation.position=nextPlanetPosition(state.navigation.position,direction);state.navigation.lastMovedRound=state.round;
  const world=planetWorld(state);storePlanetEvent(state,world,'MOVEMENT_COMPLETED',[]);publishBoard(state,state.round);
  finalizePlanetPromises(state,'ROUND_END');
  if(state.navigation.position==='Blue Planet'||state.navigation.position==='Red Planet'){
    state.navigation.arrivedAt=state.navigation.position==='Blue Planet'?'Blue':'Red';terminal(state,ctx,'ARRIVAL',state.navigation.arrivedAt);
  }else beginNextRound(state,ctx);
}
function confirmation(state:PlanetGameState,ctx:PlanetGameContext,afterCaptain=false):void {
  const world=planetWorld(state),available=(id:SeatId|null)=>id!==null&&freeHealthy(planetSeat(world,id));
  if(!afterCaptain&&available(world.captainSeatId)){phase(state,'NAV_CAPTAIN_CONFIRM',ctx);return;}
  if(available(world.officerSeatId)){phase(state,'NAV_OFFICER_CONFIRM',ctx);return;}
  moveShip(state,ctx);
}
function resolveRound(state:PlanetGameState,ctx:PlanetGameContext):void {
  const world=planetWorld(state);resolvePlanetPhysical(state,world);publishBoard(state,state.round);
  if(world.seats.every(s=>!alive(s))){terminal(state,ctx,'NO_SURVIVORS');return;}
  state.navigation.started=true;
  if(state.round===1){state.navigation.direction=null;moveShip(state,ctx);return;}
  const weights=planetNavigationWeights(state,world);
  const candidate=world.shipHackOverride?'Red':weights.Blue===weights.Red?null:weights.Blue>weights.Red?'Blue':'Red';
  if(planetHasPrivateFeedback(state.versions)) {
    // Every new-version round has the same neutral window; neither its presence nor
    // an early private Officer choice discloses a tie or a hidden ship-hack override.
    state.navigation.direction=null;state.navigation.settingTie=candidate===null;state.navigation.settingDirection=candidate;
    phase(state,'NAV_SETTING',ctx);return;
  }
  state.navigation.direction=candidate;
  if(state.navigation.direction===null){
    if(world.officerSeatId!==null&&freeHealthy(planetSeat(world,world.officerSeatId))){phase(state,'NAV_TIE',ctx);return;}
    state.navigation.direction=draw(ctx,2)===0?'Blue':'Red';
  }
  confirmation(state,ctx);
}
function openJailVote(state:PlanetGameState,ctx:PlanetGameContext):void {
  // This is the actual meeting opportunity, after any authoritative presentation.
  publishBoard(state,state.round);finalizePlanetPromises(state,'MEETING');
  const world=planetWorld(state);phase(state,'JAIL_VOTE',ctx);
  state.ballot={kind:'JAIL_VOTE',eligibleVoters:world.seats.filter(alive).map(s=>s.seatId),eligibleTargets:world.seats.filter(s=>alive(s)&&!s.jailed).map(s=>s.seatId),votes:{},runoff:false,electionId:state.phase.id};
}
function syncAndVote(state:PlanetGameState,ctx:PlanetGameContext):void {
  state.panelOpen=false;state.hack=null;state.ballot=null;
  if(state.blackholeActive){
    const worlds=Object.keys(state.worlds),chosen=worlds[draw(ctx,worlds.length)]!;
    state.currentWorldId=chosen;state.worlds={[chosen]:state.worlds[chosen]!};for(const id of seatIds(state))state.realityOf[id]=chosen;
    state.blackholeActive=false;
    storePlanetEvent(state,planetWorld(state),'BLACKHOLE_SYNCED',[]);
    // Selected physical state is finalized, but attacks and Promise opportunities wait.
    publishBoard(state,state.round);
    if(planetHasSyncPresentation(state.versions)){phase(state,'BLACKHOLE_PRESENTATION',ctx);return;}
  }
  openJailVote(state,ctx);
}
function nextTurn(state:PlanetGameState,ctx:PlanetGameContext):void {
  while(state.turnIndex<state.turnOrder.length&&!alive(planetSeat(planetWorld(state,state.turnOrder[state.turnIndex]!),state.turnOrder[state.turnIndex]!)))state.turnIndex++;
  if(state.turnIndex>=state.turnOrder.length){syncAndVote(state,ctx);return;}
  phase(state,'ORDINARY_TURN',ctx);state.activeSeatId=state.turnOrder[state.turnIndex]!;
}
function finishTurn(state:PlanetGameState,ctx:PlanetGameContext):void {
  if(state.hack){state.hack.id=ctx.nextPhaseId;phase(state,'HACK_DECLARE',ctx);state.activeSeatId=state.hack.actorSeatId;}
  else{state.turnIndex++;nextTurn(state,ctx);}
}
function voteClosed(state:PlanetGameState,ctx:PlanetGameContext):void {
  const ballot=state.ballot;if(!ballot)throw Error('Ballot required');const world=planetWorld(state);
  const input={eligibleVoters:ballot.eligibleVoters,eligibleTargets:ballot.eligibleTargets,ballots:Object.entries(ballot.votes).map(([voterSeatId,targetSeatId])=>({voterSeatId:voterSeatId as SeatId,targetSeatId:targetSeatId??null}))};
  if(ballot.kind==='JAIL_VOTE'){
    const result=tallyJailVote(input),selected=result.jailedSeatId,admitted=selected!==null&&jailPlanetSeat(state,world,selected);
    state.lastTally={kind:'JAIL_VOTE',phaseId:state.phase.id,counts:result.counts,eligibleVoterCount:result.eligibleVoterCount,selectedSeatId:selected,tiedSeatIds:[],outcome:selected===null?'NO_JAIL_SELECTION':admitted?'PLAYER_JAILED':'JAIL_FULL'};
    finalizePlanetPromises(state,'JAIL',{votes:ballot.votes,ballotPhaseId:state.phase.id});state.afterVote='RESOLVE';publishBoard(state,state.round);
  }else{
    const result=tallyElection(input),winner=result.winnerSeatId,complete=result.tiedSeatIds.length===0;
    finalizePlanetPromises(state,'ELECTION',{electionId:ballot.electionId,ballotPhaseId:state.phase.id,candidateSeatIds:ballot.eligibleTargets,votes:ballot.votes,electionComplete:complete,captainSeatId:winner});
    state.lastTally={kind:'CAPTAIN_ELECTION',phaseId:state.phase.id,counts:result.counts,eligibleVoterCount:result.eligibleVoterCount,selectedSeatId:winner,tiedSeatIds:result.tiedSeatIds,outcome:winner?'CAPTAIN_ELECTED':complete?'NO_CAPTAIN_ELECTED':'RUNOFF_REQUIRED'};
    if(winner){world.captainSeatId=winner;world.officerSeatId=null;const seat=planetSeat(world,winner);seat.location='Command Room';seat.slotId='C1';state.electionNeeded=false;state.afterVote='APPOINT';publishBoard(state);}
    else state.afterVote=complete?'NEXT_ROUND':'RUNOFF';
  }
  phase(state,'VOTE_RESULT',ctx);
}
function afterVote(state:PlanetGameState,ctx:PlanetGameContext):void {
  const continuation=state.afterVote;state.afterVote=null;
  if(continuation==='RESOLVE'){
    const world=planetWorld(state);world.actions=world.actions.filter(a=>a.command.type!=='REQUEST_BLACKOUT'||freeHealthy(planetSeat(world,a.actorSeatId)));
    for(const a of world.actions)if(a.command.type==='REQUEST_BLACKOUT')a.boundRoom=planetSeat(world,a.actorSeatId).location as 'Room A'|'Room B'|'Command Room';
    state.ballot=null;phase(state,'BLACKOUT',ctx);
  }else if(continuation==='RUNOFF')openElection(state,ctx,state.lastTally!.tiedSeatIds,state.ballot!.electionId);
  else if(continuation==='APPOINT'){
    const world=planetWorld(state),eligible=world.seats.filter(s=>s.seatId!==world.captainSeatId&&freeHealthy(s));
    if(eligible.length)phase(state,'OFFICER_APPOINTMENT',ctx);else appointmentDone(state,ctx);
  }else if(continuation==='NEXT_ROUND'){state.ballot=null;phase(state,'PRE_TURN',ctx);}
  else throw Error('Vote continuation required');
}
export function createPlanetGame(setup:PlanetGameSetup,ctx:PlanetGameContext):PlanetGameState {
  assertPlanetContext(ctx);ctx={...ctx,randomIndex:0} as TransitionContext;IdentifierSchema.parse(setup.matchId);
  if(![7,8,9].includes(setup.playerCount))throw Error('Unsupported planet roster');
  const ids=Array.from({length:setup.playerCount},(_,i)=>`seat-${i+1}` as SeatId),roles=['Insider','Doctor','Blue Disabler','Supplier','Undercover','Hacker','Alien',...(setup.playerCount>=8?['Red Disabler']:[]),...(setup.playerCount===9?['Engineer']:[])];
  const versions=PlanetVersionsSchema.parse(setup.versions??{...PLANET_GAME_PINS,assetManifestVersion:setup.assetManifestVersion});
  if(versions.assetManifestVersion!==setup.assetManifestVersion)throw Error('Explicit planet version asset must match setup asset');
  const privateFeedback=planetHasPrivateFeedback(versions);
  if(setup.roleOrder.length!==ids.length||new Set(setup.roleOrder).size!==ids.length||setup.roleOrder.some(r=>!roles.includes(r))||setup.initialTurnOrder.length!==ids.length||new Set(setup.initialTurnOrder).size!==ids.length||setup.initialTurnOrder.some(id=>!ids.includes(id)))throw Error('Complete original deal and round order required');
  if(Object.keys(setup.initialRooms).length!==ids.length||ids.some(id=>!['Room A','Room B'].includes(setup.initialRooms[id])))throw Error('Complete independent starting rooms required');
  if(['Room A','Room B'].some(room=>ids.filter(id=>setup.initialRooms[id]===room).length>5))throw Error('Starting room capacity exceeded');
  const counts={'Room A':0,'Room B':0},assigned=Object.fromEntries(ids.map((id,i)=>[id,setup.roleOrder[i]!])) as PlanetGameState['roles'];
  const world:PlanetWorld={seats:ids.map(id=>{const location=setup.initialRooms[id],number=++counts[location];return {seatId:id,health:'Healthy',location,slotId:`${location==='Room A'?'A':'B'}${number}` as 'A1',lastRoom:location,jailed:false,revealedFaction:null,rescueDueAfterRound:null,medical:null,ordinaryWeapons:assigned[id]==='Undercover'?1:0,roleActionSpent:false,shotSpent:false,protection:null,protectionEver:false,clone:{used:false,active:false,expiresAfterRound:null},blackoutSpent:false,engineerSpent:false,...(privateFeedback?{engineerCapture:null}:{})};}),actions:[],injectionsRemaining:2,captainSeatId:null,officerSeatId:null,releaseUsed:false,ejectUsed:false,shipHackSpent:false,shipHackOverride:false,suppressedSeatIds:[],events:[],...(privateFeedback?{panelReservations:{}}:{})};
  const state:PlanetGameState={matchId:setup.matchId,versions,playerCount:setup.playerCount,round:1,evaluatedAt:ctx.now,
    phase:{id:ctx.nextPhaseId,kind:'PRE_TURN',startedAt:ctx.now,endsAt:ctx.now+15000},deadlineToken:ctx.nextDeadlineToken,roles:assigned,code:ids.filter(id=>['Undercover','Alien','Insider','Doctor'].includes(assigned[id]!)),worlds:{'world-0':world},realityOf:Object.fromEntries(ids.map(id=>[id,'world-0'])) as Record<SeatId,string>,currentWorldId:'world-0',blackholeActive:false,blackoutPreviewComplete:false,nextWorldNumber:1,
    global:{...(privateFeedback?{panelRequests:{}}:{}),promiseEvaluation:{},movementSpent:[],blockedSeatId:null,lastBlockedSeatId:null,blackholeSpent:false,blackholeRound:null,panelAttempts:[],scanResults:[],scanUsedRound:null,scanBlockedThroughRound:null,codeAttempted:false,shipHackUnlocked:false,hackCounts:Object.fromEntries(ids.map(id=>[id,0])) as Record<SeatId,number>,hackSpent:[],promises:[],promiseGiven:[],promiseReceived:[],declinedPromiseIds:[],drawings:[],roundOrders:{'1':[...setup.initialTurnOrder]}},
    turnOrder:[...setup.initialTurnOrder],turnIndex:0,activeSeatId:null,hack:null,panelOpen:true,ballot:null,lastTally:null,afterVote:null,electionNeeded:false,
    navigation:{position:'Start',direction:null,lastMovedRound:0,arrivedAt:null,started:false,...(privateFeedback?{settingTie:false,settingDirection:null}:{})},result:null,finalized:{round:0,seats:[],events:[]},revisions:{public:0,players:Object.fromEntries(ids.map(id=>[id,0])) as Record<SeatId,number>},eventPublications:{}};
  publishBoard(state,0);assertPlanetGameState(state);projectPlanetPublic(state);for(const id of ids)projectPlanetPlayer(state,id);return state;
}
export function applyPlanetCommand(before:PlanetGameState,actorId:SeatId,raw:PlanetCommandRequest,ctx:PlanetGameContext):{state:PlanetGameState;receipt:PlanetReceipt} {
  assertPlanetGameState(before);assertPlanetContext(ctx);ctx={...ctx,randomIndex:0} as TransitionContext;const request=PlanetCommandRequestSchema.parse(raw);
  const receipt=(status:'accepted'|'rejected',code:'REGISTERED'|'NOT_ALLOWED'|'PHASE_CLOSED'|'NO_INJECTION')=>PlanetReceiptSchema.parse({protocolVersion:3,matchId:request.matchId,phaseId:request.phaseId,commandId:request.commandId,status,code});
  if(request.matchId!==before.matchId||!before.roles[actorId])return {state:before,receipt:receipt('rejected','NOT_ALLOWED')};
  if(before.result||request.phaseId!==before.phase.id||ctx.now<before.phase.startedAt||ctx.now<before.evaluatedAt||ctx.now>=before.phase.endsAt!)return {state:before,receipt:receipt('rejected','PHASE_CLOSED')};
  const state=copyPlanet(before);state.evaluatedAt=ctx.now;
  if(!planetCommand(state,actorId,request.command,request.commandId,ctx.now))return {state:before,receipt:receipt('rejected','NOT_ALLOWED')};
  switch(request.command.type){
    case 'PASS_TURN':finishTurn(state,ctx);break;
    case 'DECLARE_HACK_SIDE':phase(state,'HACK_RESULT',ctx);state.activeSeatId=state.hack!.actorSeatId;break;
    case 'APPOINT_OFFICER':appointmentDone(state,ctx);break;
    case 'CHOOSE_NAV_DIRECTION':if(!planetHasPrivateFeedback(state.versions))confirmation(state,ctx);break;
    case 'CONFIRM_NAVIGATION':if(before.phase.kind==='NAV_CAPTAIN_CONFIRM')confirmation(state,ctx,true);else moveShip(state,ctx);break;
  }
  return {state:revisions(before,state),receipt:receipt('accepted','REGISTERED')};
}
export function planetDeadlineAt(state:PlanetGameState):number|null {return state.phase.kind==='BLACKOUT'&&!state.blackoutPreviewComplete?state.phase.startedAt+5000:state.phase.endsAt;}
export function advancePlanetDeadline(before:PlanetGameState,ctx:PlanetGameContext):{state:PlanetGameState;advanced:boolean} {
  assertPlanetGameState(before);assertPlanetContext(ctx);ctx={...ctx,randomIndex:0} as TransitionContext;
  if(before.phase.endsAt===null||ctx.now<before.evaluatedAt||ctx.now<planetDeadlineAt(before)!||(ctx.phaseId!==undefined&&ctx.phaseId!==before.phase.id)||(ctx.deadlineToken!==undefined&&ctx.deadlineToken!==before.deadlineToken))return {state:before,advanced:false};
  const state=copyPlanet(before);state.evaluatedAt=ctx.now;
  if(state.phase.kind==='BLACKOUT'&&!state.blackoutPreviewComplete&&ctx.now<state.phase.endsAt!){
    if(ctx.nextDeadlineToken===state.deadlineToken)throw Error('Fresh dark-window deadline token required');
    state.blackoutPreviewComplete=true;state.deadlineToken=ctx.nextDeadlineToken;return {state:revisions(before,state),advanced:true};
  }
  switch(state.phase.kind){
    case 'PRE_TURN':nextTurn(state,ctx);break;
    case 'ORDINARY_TURN':finishTurn(state,ctx);break;
    case 'HACK_DECLARE':state.hack!.status='NO_DECLARATION';phase(state,'HACK_RESULT',ctx);state.activeSeatId=state.hack!.actorSeatId;break;
    case 'HACK_RESULT':phase(state,'HACK',ctx);state.activeSeatId=state.hack!.actorSeatId;break;
    case 'HACK':state.hack=null;state.turnIndex++;nextTurn(state,ctx);break;
    case 'BLACKHOLE_PRESENTATION':openJailVote(state,ctx);break;
    case 'CAPTAIN_ELECTION':case 'JAIL_VOTE':voteClosed(state,ctx);break;
    case 'VOTE_RESULT':afterVote(state,ctx);break;
    case 'OFFICER_APPOINTMENT':{
      const world=planetWorld(state),eligible=world.seats.filter(s=>s.seatId!==world.captainSeatId&&freeHealthy(s));
      world.officerSeatId=eligible.length?eligible[draw(ctx,eligible.length)]!.seatId:null;appointmentDone(state,ctx);break;
    }
    case 'BLACKOUT':resolveRound(state,ctx);break;
    case 'NAV_SETTING':
      if(!planetHasPrivateFeedback(state.versions))throw Error('Navigation setting requires the private-feedback version');
      state.navigation.settingDirection=state.navigation.settingDirection??(draw(ctx,2)===0?'Blue':'Red');
      state.navigation.direction=state.navigation.settingDirection;confirmation(state,ctx);break;
    case 'NAV_TIE':state.navigation.direction=draw(ctx,2)===0?'Blue':'Red';confirmation(state,ctx);break;
    case 'NAV_CAPTAIN_CONFIRM':confirmation(state,ctx,true);break;
    case 'NAV_OFFICER_CONFIRM':moveShip(state,ctx);break;
    case 'FINISHED':case 'ABORTED':return {state:before,advanced:false};
  }
  return {state:revisions(before,state),advanced:true};
}
export function abortPlanetGame(before:PlanetGameState,ctx:PlanetGameContext):PlanetGameState {assertPlanetGameState(before);assertPlanetContext(ctx);ctx={...ctx,randomIndex:0} as TransitionContext;if(before.result)return before;const state=copyPlanet(before);state.evaluatedAt=ctx.now;terminal(state,ctx,'ABORTED');return revisions(before,state);}
