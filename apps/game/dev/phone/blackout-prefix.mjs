// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
import {createPlanetGame,applyPlanetCommand,advancePlanetDeadline,assertPlanetGameState} from '@mothership/engine';

// Reproducible native prefix for local consumer acceptance. Never a runtime seed.
export function nativeBlackoutPrefix(matchId,count,versions){
 const roles=['Insider','Doctor','Blue Disabler','Supplier','Undercover','Hacker','Alien','Red Disabler','Engineer'],ids=roles.map((_,i)=>'seat-'+(i+1)),roomA=new Set(['seat-1','seat-2','seat-3','seat-5','seat-8']);
 const setup={matchId,versions,assetManifestVersion:versions.assetManifestVersion,playerCount:count,roleOrder:roles,initialTurnOrder:ids,initialRooms:Object.fromEntries(ids.map(id=>[id,roomA.has(id)?'Room A':'Room B']))};
 function run(start){
  let serial=0;const context=now=>({now,nextPhaseId:'consumer-phase-'+(++serial),nextDeadlineToken:'consumer-token-'+serial,random:Array(64).fill(.999999)});let state=createPlanetGame(setup,context(start));const history=[];
  const deadline=()=>{const c={...context(state.phase.endsAt),phaseId:state.phase.id,deadlineToken:state.deadlineToken},r=advancePlanetDeadline(state,c);assert.equal(r.advanced,true);state=r.state;history.push({kind:'DEADLINE',at:c.now});};
  const command=(actorSeatId,command)=>{const request={protocolVersion:3,matchId,phaseId:state.phase.id,commandId:'consumer-prefix-'+(++serial),command},c=context(state.phase.startedAt+1),r=applyPlanetCommand(state,actorSeatId,request,c);assert.equal(r.receipt.status,'accepted');state=r.state;history.push({kind:'COMMAND',type:command.type});};
  for(let n=0;!(state.round===2&&state.phase.kind==='ORDINARY_TURN'&&state.activeSeatId==='seat-1');n++){assert.ok(n<100&&!state.result);deadline();}
  for(const id of ids){assert.equal(state.activeSeatId,id);if(id==='seat-2')command(id,{type:'RESCUE',targetSeatId:'seat-3'});if(id==='seat-3'||id==='seat-8')command(id,{type:'REQUEST_BLACKOUT'});deadline();}
  assert.equal(state.phase.kind,'BLACKOUT');assertPlanetGameState(state);return {state,history};
 }
 const duration=run(1000).state.phase.startedAt-1000,anchor=Date.now(),value=run(anchor-duration);assert.equal(value.state.phase.startedAt,anchor);return value;
}
