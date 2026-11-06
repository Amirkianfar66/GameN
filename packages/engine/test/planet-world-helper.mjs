import assert from 'node:assert/strict';
import { createPlanetGame,applyPlanetCommand,advancePlanetDeadline,assertPlanetGameState,projectPlanetPlayer,projectPlanetPublic } from '../dist/index.js';

// Legal synthetic initial deal, followed solely by public commands and trusted deadlines.
// Random vectors, requests and transition contexts are retained for exact replay.
export function planetWorldDriver(count,{versions,initialRooms}={}) {
  const roles=['Insider','Doctor','Blue Disabler','Supplier','Undercover','Hacker','Alien',...(count>=8?['Red Disabler']:[]),...(count===9?['Engineer']:[])];
  const ids=roles.map((_,i)=>`seat-${i+1}`),roomA=new Set(['seat-1','seat-2','seat-3','seat-5','seat-6']);
  const setup={matchId:`planet-worlds-${count}`,playerCount:count,roleOrder:roles,initialRooms:initialRooms??Object.fromEntries(ids.map(id=>[id,roomA.has(id)?'Room A':'Room B'])),initialTurnOrder:ids,assetManifestVersion:'planet-world-test-art',...(versions?{versions}:{})};
  let sequence=0;
  const context=(now,sample=0.999999)=>({now,nextPhaseId:`world-phase-${++sequence}`,nextDeadlineToken:`world-token-${sequence}`,random:Array(32).fill(sample)});
  const initialContext=context(1000),initial=createPlanetGame(setup,initialContext),history=[];
  let state=initial;
  const command=(actor,command,{now=Math.max(state.evaluatedAt,state.phase.startedAt)+1,sample=0.999999,accepted=true}={})=>{
    const request={protocolVersion:3,matchId:state.matchId,phaseId:state.phase.id,commandId:`world-command-${++sequence}`,command};
    const ctx=context(now,sample),before=structuredClone(state),result=applyPlanetCommand(state,actor,request,ctx);
    assert.deepEqual(state,before,'Command must not mutate input authority');
    assert.equal(result.receipt.status,accepted?'accepted':'rejected',`${actor}/${command.type}: ${JSON.stringify(result.receipt)}`);
    if(!accepted)assert.deepEqual(result.state,state);
    state=result.state;history.push({kind:'COMMAND',actor,request:structuredClone(request),context:structuredClone(ctx),receipt:structuredClone(result.receipt)});return result;
  };
  const deadline=({now=state.phase.endsAt,sample=0.999999}={})=>{
    assert.notEqual(now,null,'A finished match has no deadline');
    const ctx={...context(now,sample),phaseId:state.phase.id,deadlineToken:state.deadlineToken},before=structuredClone(state),result=advancePlanetDeadline(state,ctx);
    assert.deepEqual(state,before,'Deadline must not mutate input authority');assert.equal(result.advanced,true);
    state=result.state;history.push({kind:'DEADLINE',context:structuredClone(ctx)});return state;
  };
  const until=(predicate,{sample=0.999999,max=180}={})=>{
    for(let step=0;!predicate(state);step++){assert.ok(step<max&&!state.result,`Bounded native history stopped at R${state.round}/${state.phase.kind}`);deadline({sample});}
    return state;
  };
  const replay=()=>{
    let restored=createPlanetGame(structuredClone(setup),structuredClone(initialContext));
    for(const record of history){
      if(record.kind==='COMMAND'){const result=applyPlanetCommand(restored,record.actor,structuredClone(record.request),structuredClone(record.context));assert.deepEqual(result.receipt,record.receipt);restored=result.state;}
      else{const result=advancePlanetDeadline(restored,structuredClone(record.context));assert.equal(result.advanced,true);restored=result.state;}
    }
    assert.deepEqual(restored,state,'Recorded full-world replay is exact');assertPlanetGameState(restored);
    projectPlanetPublic(restored);for(const id of ids)projectPlanetPlayer(restored,id);
  };
  return {ids,setup,history,command,deadline,until,replay,get state(){return state;},replaceForConstructedControl(value){state=value;}};
}
export const currentWorld = d=>d.state.worlds[d.state.currentWorldId];
export const actorWorld = (d,id)=>d.state.worlds[d.state.realityOf[id]];
export const worldSeat = (world,id)=>world.seats.find(s=>s.seatId===id);
export function moveAcross(d,id) {
  const world=actorWorld(d,id),actor=worldSeat(world,id),destination=actor.location==='Room A'?'Room B':'Room A',prefix=destination==='Room A'?'A':'B';
  assert.ok(['Room A','Room B'].includes(actor.location));
  const slotId=Array.from({length:5},(_,i)=>`${prefix}${i+1}`).find(slot=>!world.seats.some(seat=>seat.slotId===slot));assert.ok(slotId,'Native destination has a free place');
  d.command(id,{type:'MOVE',destination,slotId});return d.state.realityOf[id];
}
export function prepareBlackholeRound(d,{patient=false}={}) {
  if(patient){
    d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-2');d.command('seat-2',{type:'RESCUE',targetSeatId:'seat-2'});
    d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-3');d.command('seat-3',{type:'REQUEST_BLACKOUT'});
    d.until(s=>s.phase.kind==='BLACKOUT');
    // Real authoritative light boundary; no phase/time edits or manual resolution.
    d.deadline({now:d.state.phase.startedAt+5000});
    d.command('seat-3',{type:'SELECT_BLACKOUT_SLOT',windowId:d.state.phase.id,slotId:'A1'},{now:d.state.phase.startedAt+5001});
  }
  d.until(s=>s.round===2&&s.phase.kind==='CAPTAIN_ELECTION');
  assert.equal(d.state.navigation.position,'Junction');assert.equal(d.state.navigation.lastMovedRound,1);
  for(const id of d.state.ballot.eligibleVoters)d.command(id,{type:'VOTE',targetSeatId:'seat-6'});
  d.deadline();assert.equal(d.state.phase.kind,'VOTE_RESULT');d.deadline();assert.equal(d.state.phase.kind,'OFFICER_APPOINTMENT');
  d.command('seat-6',{type:'APPOINT_OFFICER',targetSeatId:'seat-7'});assert.equal(d.state.phase.kind,'PRE_TURN');
  d.command('seat-7',{type:'ACTIVATE_BLACKHOLE'});assert.equal(d.state.blackholeActive,true);d.deadline();assert.equal(d.state.phase.kind,'ORDINARY_TURN');
  return d;
}
export function hackerToOrdinaryRoom(d) {
  const world=actorWorld(d,'seat-6'),slotId=['A1','A2','A3','A4','A5'].find(slot=>!world.seats.some(s=>s.slotId===slot));assert.ok(slotId);
  d.command('seat-6',{type:'MOVE',destination:'Room A',slotId});assert.equal(Object.keys(d.state.worlds).length,1,'Command departure creates no A/B branch');
}
export function toSync(d,{sample=0.999999}={}) {return d.until(s=>s.phase.kind==='JAIL_VOTE',{sample});}
