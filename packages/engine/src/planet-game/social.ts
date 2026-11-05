import { IdentifierSchema, PlanetCommandSchema, PlanetPromiseSchema, PlanetWindowDrawingSchema } from '@mothership/contracts';
import type { PlanetCommand, PlanetPlayerView, PlanetPromise, PlanetWindowId, SeatId } from '@mothership/contracts';
import { alive, copyPlanet, planetSeat, planetWorld } from './model.js';
import type { PlanetGameState } from './model.js';

export interface PlanetPromiseOpportunityDetails {
  electionId?:string;
  ballotPhaseId?:string;
  candidateSeatIds?:readonly SeatId[];
  votes?:Partial<Record<SeatId,SeatId|null>>;
  electionComplete?:boolean;
  captainSeatId?:SeatId|null;
  officerSeatId?:SeatId|null;
}
export type PlanetPromiseOpportunity = 'MEETING'|'JAIL'|'ELECTION'|'APPOINTMENT'|'ROUND_END'|'MATCH_END';
const futureElection = (promise:PlanetPromise):boolean => ['CAPTAIN_SUPPORT','OFFICER_SELECTION'].includes(promise.kind);
const windows:readonly PlanetWindowId[] = ['A_B','A_HOSPITAL','B_JAIL'];
const endpoints:Record<PlanetWindowId,readonly string[]> = {
  A_B:['Room A','Room B'], A_HOSPITAL:['Room A','Hospital'], B_JAIL:['Room B','Jail'],
};
const stations:Record<PlanetWindowId,readonly string[]> = { A_B:['A1','B1'], A_HOSPITAL:['A2'], B_JAIL:['B2'] };
const currentSeat = (state:PlanetGameState,id:SeatId) => {
  try { return planetSeat(planetWorld(state,id),id); } catch { return null; }
};
function windowsOpen(state:PlanetGameState,now:number):boolean {
  return Number.isSafeInteger(now) && now>=state.phase.startedAt
    && !['FINISHED','ABORTED','NAV_TIE','NAV_CAPTAIN_CONFIRM','NAV_OFFICER_CONFIRM'].includes(state.phase.kind)
    && state.navigation.lastMovedRound<state.round
    && !(state.phase.kind==='BLACKOUT' && now>=state.phase.startedAt+5_000);
}
function privatePair(state:PlanetGameState,actorId:SeatId,otherId:SeatId):boolean {
  if(state.phase.kind!=='HACK' || !state.hack || actorId===otherId || !Object.hasOwn(state.roles,otherId))return false;
  const pair=[state.hack.actorSeatId,state.hack.targetSeatId];
  return pair.includes(actorId) && pair.includes(otherId);
}

/** Only the current actor-world endpoint grants access; drawings confer no onward view. */
export function planetWindows(state:PlanetGameState,actorId:SeatId,now=state.evaluatedAt):PlanetPlayerView['windows'] {
  const actor=currentSeat(state,actorId);
  if(!actor || !alive(actor) || !windowsOpen(state,now))return [];
  return windows.filter(id=>endpoints[id].includes(actor.location??'')).map(windowId=>({
    windowId,canDraw:stations[windowId].includes(actor.slotId??''),
    drawings:state.global.drawings.filter(d=>d.round===state.round && d.windowId===windowId)
      .map(d=>copyPlanet(d)).sort((a,b)=>a.order-b.order),
  }));
}

/** Outer admission owns time/phase authentication and cloning. Refusal never changes state. */
export function socialPlanetCommand(state:PlanetGameState,actorId:SeatId,command:PlanetCommand,commandId:string,now=state.evaluatedAt):boolean {
  const actor=currentSeat(state,actorId),parsed=PlanetCommandSchema.safeParse(command);
  if(!actor || !alive(actor) || !IdentifierSchema.safeParse(commandId).success || !parsed.success
    || ['FINISHED','ABORTED'].includes(state.phase.kind))return false;
  const intent=parsed.data;
  if(intent.type==='SHOW_WINDOW') {
    const window=planetWindows(state,actorId,now).find(value=>value.windowId===intent.windowId);
    if(!window?.canDraw || state.global.drawings.some(d=>d.id===commandId) || state.global.promises.some(p=>p.id===commandId))return false;
    const order=state.global.drawings.filter(d=>d.round===state.round && d.windowId===intent.windowId).reduce((maximum,d)=>Math.max(maximum,d.order),-1)+1;
    const drawing=PlanetWindowDrawingSchema.safeParse({id:commandId,windowId:intent.windowId,authorSeatId:actorId,round:state.round,order,drawing:intent.drawing});
    if(!drawing.success)return false;
    state.global.drawings.push(drawing.data);
    return true;
  }
  if(intent.type==='OFFER_PROMISE') {
    if(!privatePair(state,actorId,intent.recipientSeatId) || state.global.promiseGiven.includes(actorId)
      || state.global.promiseReceived.includes(intent.recipientSeatId) || state.global.promises.some(p=>p.id===commandId)
      || state.global.drawings.some(d=>d.id===commandId)
      || intent.targetSeatId!==null && !Object.hasOwn(state.roles,intent.targetSeatId))return false;
    const draft=PlanetPromiseSchema.safeParse({id:commandId,giverSeatId:actorId,recipientSeatId:intent.recipientSeatId,
      kind:intent.kind,targetSeatId:intent.targetSeatId,round:state.round,electionId:null,accepted:false,offerStatus:'offered',status:'Pending'});
    if(!draft.success)return false;
    state.global.promises.push(draft.data);
    return true;
  }
  if(intent.type!=='ACCEPT_PROMISE' && intent.type!=='DECLINE_PROMISE')return false;
  const promise=state.global.promises.find(p=>p.id===intent.promiseId);
  if(!promise || promise.accepted || promise.offerStatus!=='offered' || promise.status!=='Pending' || promise.round!==state.round
    || promise.recipientSeatId!==actorId || state.global.declinedPromiseIds.includes(promise.id)
    || !privatePair(state,actorId,promise.giverSeatId))return false;
  if(intent.type==='DECLINE_PROMISE') {
    promise.offerStatus='declined';
    state.global.declinedPromiseIds.push(promise.id);
    return true;
  }
  if(state.global.promiseGiven.includes(promise.giverSeatId) || state.global.promiseReceived.includes(actorId))return false;
  promise.accepted=true;
  promise.offerStatus='accepted';
  state.global.promiseGiven.push(promise.giverSeatId);
  state.global.promiseReceived.push(actorId);
  state.global.promiseEvaluation[promise.id]={candidateBallots:0,missedRequiredBallot:false,captainWon:null,ballotPhaseIds:[]};
  return true;
}

function recordedVotes(state:PlanetGameState,kind:'JAIL_VOTE'|'CAPTAIN_ELECTION',details:PlanetPromiseOpportunityDetails) {
  const ballot=state.ballot?.kind===kind?state.ballot:null;
  const votes=details.votes??ballot?.votes;
  if(votes===undefined || Object.entries(votes).some(([id,target])=>!Object.hasOwn(state.roles,id)
    || target!==null && !Object.hasOwn(state.roles,target)))return null;
  return {votes,ballot};
}

/** Called only at authoritative opportunity closure. No result is derived from a discarded world. */
export function finalizePlanetPromises(state:PlanetGameState,opportunity:PlanetPromiseOpportunity,details:PlanetPromiseOpportunityDetails={}):void {
  if(state.blackholeActive && opportunity!=='MATCH_END')return;
  const pending=state.global.promises.filter(p=>p.accepted && p.status==='Pending');
  if(opportunity==='ROUND_END' || opportunity==='MATCH_END') {
    for(const p of pending) {
      if(opportunity==='ROUND_END' && (futureElection(p) || p.round>state.round))continue;
      const evaluation=state.global.promiseEvaluation[p.id];
      p.status=opportunity==='MATCH_END' && p.kind==='CAPTAIN_SUPPORT' && evaluation?.candidateBallots
        ? evaluation.missedRequiredBallot?'Not fulfilled':'Fulfilled':'Condition not met';
    }
    state.global.drawings=state.global.drawings.filter(d=>d.round>state.round);
    for(const draft of state.global.promises.filter(p=>!p.accepted && p.round<=state.round)) {
      if(draft.offerStatus==='offered')draft.offerStatus='expired';
      if(!state.global.declinedPromiseIds.includes(draft.id))state.global.declinedPromiseIds.push(draft.id);
    }
    return;
  }
  if(opportunity==='MEETING') {
    const world=planetWorld(state);
    for(const p of pending.filter(p=>p.round===state.round && ['MEET_A','MEET_B'].includes(p.kind))) {
      const room=p.kind==='MEET_A'?'Room A':'Room B';
      p.status=[p.giverSeatId,p.recipientSeatId].every(id=>{const seat=planetSeat(world,id);return alive(seat)&&seat.location===room;})?'Fulfilled':'Not fulfilled';
    }
    return;
  }
  if(opportunity==='JAIL') {
    const recorded=recordedVotes(state,'JAIL_VOTE',details);
    if(!recorded)return;
    const eligible=recorded.ballot?.eligibleVoters??planetWorld(state).seats.filter(alive).map(seat=>seat.seatId);
    for(const p of pending.filter(p=>p.round===state.round && ['JAIL_VOTE','NO_JAIL_VOTE'].includes(p.kind))) {
      const voted=recorded.votes[p.giverSeatId];
      p.status=eligible.includes(p.giverSeatId) && (p.kind==='JAIL_VOTE'?voted===p.targetSeatId:voted!==p.recipientSeatId)?'Fulfilled':'Not fulfilled';
    }
    return;
  }
  if(opportunity==='ELECTION') {
    const recorded=recordedVotes(state,'CAPTAIN_ELECTION',details);
    const electionId=details.electionId??recorded?.ballot?.electionId;
    const ballotPhaseId=details.ballotPhaseId??state.phase.id;
    const candidates=details.candidateSeatIds??recorded?.ballot?.eligibleTargets;
    if(!recorded || !electionId || !IdentifierSchema.safeParse(electionId).success || !IdentifierSchema.safeParse(ballotPhaseId).success
      || !candidates || new Set(candidates).size!==candidates.length || candidates.some(id=>!Object.hasOwn(state.roles,id)))return;
    for(const p of pending.filter(futureElection)) {
      if(p.electionId===null)p.electionId=electionId;
      if(p.electionId!==electionId)continue;
      const evaluation=state.global.promiseEvaluation[p.id];
      if(!evaluation)throw Error('Missing accepted Promise evaluation');
      if(!evaluation.ballotPhaseIds.includes(ballotPhaseId)) {
        evaluation.ballotPhaseIds.push(ballotPhaseId);
        if(p.kind==='CAPTAIN_SUPPORT' && candidates.includes(p.recipientSeatId)) {
          evaluation.candidateBallots++;
          if(recorded.votes[p.giverSeatId]!==p.recipientSeatId)evaluation.missedRequiredBallot=true;
        }
      }
      if(details.electionComplete!==true)continue;
      if(p.kind==='CAPTAIN_SUPPORT')p.status=evaluation.candidateBallots===0?'Condition not met':evaluation.missedRequiredBallot?'Not fulfilled':'Fulfilled';
      else if(Object.hasOwn(details,'captainSeatId')) {
        evaluation.captainWon=details.captainSeatId===p.giverSeatId;
        if(!evaluation.captainWon)p.status='Condition not met';
      }
    }
    return;
  }
  if(opportunity==='APPOINTMENT') {
    const captain=details.captainSeatId??planetWorld(state).captainSeatId;
    const officer=Object.hasOwn(details,'officerSeatId')?details.officerSeatId:planetWorld(state).officerSeatId;
    for(const p of pending.filter(p=>p.kind==='OFFICER_SELECTION')) {
      if(p.electionId===null || details.electionId!==undefined && p.electionId!==details.electionId)continue;
      const evaluation=state.global.promiseEvaluation[p.id];
      if(evaluation?.captainWon!==true || captain!==p.giverSeatId)continue;
      p.status=officer===p.recipientSeatId?'Fulfilled':'Not fulfilled';
    }
  }
}
