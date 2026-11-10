import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID,createHash} from 'node:crypto';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {createFirestorePlanetStore} from '@mothership/game-api';
import {PLANET_BLACKOUT_PINS,PLANET_BLACKOUT_ENGINE_PROFILE,CrewCharacterIdSchema,PlanetSessionSnapshotSchema} from '@mothership/contracts';
import {createPlanetGame,applyPlanetCommand,advancePlanetDeadline,assertPlanetGameState,planetDeadlineAt} from '@mothership/engine';
import {assertLocalEmulators,createEmulatorIdentity,projectId} from '../../test/helpers.mjs';

// Dedicated profile acceptance, deliberately outside the historical flat suite.
// Run with real local Functions/Tasks and the exact candidate profile. The native
// synthetic prefix is seeded once; every later clock/command/transition is real.
async function invoke(payload,identity){
 const {functionsHost}=assertLocalEmulators();
 const response=await fetch(`http://${functionsHost}/${projectId}/us-central1/planetApi`,{
  method:'POST',signal:AbortSignal.timeout(60000),headers:{'content-type':'application/json',origin:'http://localhost:5173',authorization:`Bearer ${identity.idToken}`},body:JSON.stringify(payload)});
 const body=await response.json();assert.equal(response.status,200,JSON.stringify(body));assert.equal(body.ok,true,JSON.stringify(body));return body.result;
}
const operation=(name,matchId,extra={})=>({operation:name,matchId,requestId:randomUUID(),...extra});
const read=async(matchId,identity)=>PlanetSessionSnapshotSchema.parse(await invoke({operation:'read',matchId},identity));
async function waitFor(predicate,label,timeout=100000){
 const end=Date.now()+timeout;
 do{const found=await predicate();if(found)return found;await new Promise(resolve=>setTimeout(resolve,500));}while(Date.now()<end);
 assert.fail(`Timed out waiting for ${label}`);
}
function nativeWindow(count,matchId,versions){
 const roles=['Insider','Doctor','Blue Disabler','Supplier','Undercover','Hacker','Alien',...(count>=8?['Red Disabler']:[]),...(count===9?['Engineer']:[])];
 const ids=roles.map((_,i)=>`seat-${i+1}`),a=new Set(count===7?['seat-1','seat-2','seat-3','seat-5','seat-6']:['seat-1','seat-2','seat-3','seat-5','seat-8']);
 const setup={matchId,versions,assetManifestVersion:versions.assetManifestVersion,playerCount:count,roleOrder:roles,initialTurnOrder:ids,
  initialRooms:Object.fromEntries(ids.map(id=>[id,a.has(id)?'Room A':'Room B']))};
 const anchor=Date.now(),prefix='connected-'+randomUUID().slice(0,8);let sequence=0;
 const context=now=>({now,nextPhaseId:`${prefix}-phase-${++sequence}`,nextDeadlineToken:`${prefix}-token-${sequence}`,random:Array(64).fill(.999999)});
 const initialContext=context(anchor-15000-count*60000),history=[];let state=createPlanetGame(setup,initialContext);
 const deadline=()=>{const ctx={...context(state.phase.endsAt),phaseId:state.phase.id,deadlineToken:state.deadlineToken},result=advancePlanetDeadline(state,ctx);
  assert.equal(result.advanced,true);state=result.state;history.push({kind:'DEADLINE',context:ctx});};
 const command=(actorSeatId,command)=>{const request={protocolVersion:3,matchId,phaseId:state.phase.id,commandId:`${prefix}-command-${++sequence}`,command},ctx=context(state.phase.startedAt+1),result=applyPlanetCommand(state,actorSeatId,request,ctx);
  assert.equal(result.receipt.status,'accepted');state=result.state;history.push({kind:'COMMAND',actorSeatId,request,context:ctx,receipt:result.receipt});};
 const healedSeatId=count===7?'seat-1':'seat-3';
 deadline();
 for(const id of ids){assert.equal(state.activeSeatId,id);
  if(id==='seat-2')command(id,{type:'RESCUE',targetSeatId:healedSeatId});
  if(id==='seat-3'||id==='seat-8')command(id,{type:'REQUEST_BLACKOUT'});
  deadline();
 }
 assert.equal(state.phase.kind,'BLACKOUT');assert.equal(state.phase.startedAt,anchor);assertPlanetGameState(state);
 return {state,healedSeatId,setup,initialContext,history};
}
async function prepare(count,store){
 const host=await createEmulatorIdentity(),display=await createEmulatorIdentity(),players=[];
 const created=await invoke({operation:'create',requestId:randomUUID(),playerCount:count},host),matchId=created.matchId;
 for(let i=0;i<count;i++){
  const identity=await createEmulatorIdentity(),admission=await invoke({operation:'requestAdmission',requestId:randomUUID(),roomCode:created.roomCode,kind:'player',displayName:`Crew ${i+1}`},identity);
  await invoke(operation('approveAdmission',matchId,{admissionId:admission.admissionId}),host);players.push(identity);
 }
 const admitted=await invoke({operation:'requestAdmission',requestId:randomUUID(),roomCode:created.roomCode,kind:'display',displayName:'Table'},display);
 await invoke(operation('approveAdmission',matchId,{admissionId:admitted.admissionId}),host);
 const session=await store.transaction(tx=>tx.get('session/'+matchId));
 assert.deepEqual(session.versions,{...PLANET_BLACKOUT_PINS,assetManifestVersion:process.env.MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION??'design-0.8.0'});
 const fixture=nativeWindow(count,matchId,session.versions);
 session.status='running';session.setup=null;session.prepared=null;session.preparedState=null;session.state=fixture.state;
 for(const [i,member]of session.members.entries()){
  assert.equal(member.seatId,`seat-${i+1}`);assert.equal(member.uid,players[i].uid);assert.equal(member.controller,'human');
  member.characterId=CrewCharacterIdSchema.options[i];member.ready=true;
 }
 const token=fixture.state.deadlineToken,phaseId=fixture.state.phase.id,taskId=createHash('sha256').update(JSON.stringify([matchId,phaseId,token])).digest('hex');
 await store.transaction(tx=>{
  tx.set('session/'+matchId,session);
  tx.set('deadline/'+taskId,{matchId,phaseId,deadlineToken:token,taskId,kind:'game',endsAt:planetDeadlineAt(fixture.state),status:'pending',nextAttemptAt:Date.now()});
 });
 return {count,matchId,host,display,players,...fixture};
}
test('real HTTP and private Tasks commit pre-vote Blackout, both admitted strikes where present, full vote/result and later Rescue for 7/8/9', {timeout:240000},async()=>{
 assertLocalEmulators();assert.equal(process.env.MOTHERSHIP_PLANET_ENGINE_PROFILE,PLANET_BLACKOUT_ENGINE_PROFILE,'Use the dedicated candidate profile for this suite');
 const app=initializeApp({projectId},'connected-blackout-'+randomUUID()),db=getFirestore(app),store=createFirestorePlanetStore(db),matches=[];
 try{
  const outcomes=await Promise.allSettled([7,8,9].map(async count=>{
   const m=await prepare(count,store);matches.push(m);
   const lit=await read(m.matchId,m.display);assert.equal(lit.publicView.phase.kind,'BLACKOUT');assert.equal(lit.publicView.board.checkpoint,'PRE_BLACKOUT');
   assert.equal(lit.publicView.blackout.previewEndsAt-lit.publicView.phase.startedAt,5000);assert.equal(lit.publicView.phase.endsAt-lit.publicView.blackout.previewEndsAt,10000);
   assert.equal(lit.playerView,null);assert.equal(lit.privateRole,null);
   const dark=await waitFor(async()=>{const v=await read(m.matchId,m.players[2]);return v.playerView?.blackoutTargeting?.selectable?v:false;},`${count} real dark boundary`,25000);
   const originalPhase=dark.playerView.phase,publicBefore=(await read(m.matchId,m.display)).publicView;
   const actors=count===7?[[2,'A1']]:[[2,'A5'],[7,'A3']],receipts=[];
   for(const [index,slotId]of actors){
    const request={protocolVersion:3,matchId:m.matchId,phaseId:originalPhase.id,commandId:randomUUID(),command:{type:'SELECT_BLACKOUT_SLOT',windowId:originalPhase.id,slotId}};
    const result=await invoke({operation:'command',request},m.players[index]);assert.equal(result.receipt.status,'accepted');receipts.push({index,request,receipt:result.receipt});
   }
   assert.deepEqual((await read(m.matchId,m.display)).publicView,publicBefore,'Private choices cannot alter the display');
   const vote=await waitFor(async()=>{const v=await read(m.matchId,m.display);return v.publicView?.phase.kind==='JAIL_VOTE'?v:false;},`${count} automatic Blackout-only commit`,30000);
   assert.equal(vote.publicView.board.checkpoint,'AFTER_BLACKOUT');assert.equal(vote.publicView.phase.endsAt-vote.publicView.phase.startedAt,60000);
   assert.ok(vote.publicView.phase.startedAt>=originalPhase.endsAt);assert.equal(vote.publicView.board.finalizedRound,1);
   for(const id of count===7?['seat-1']:['seat-3','seat-8']){
    const seat=vote.publicView.board.seats.find(s=>s.seatId===id);assert.equal(seat.health,'Injured');assert.equal(seat.location,'Hospital');
   }
   const injury=vote.publicView.events.find(e=>e.kind==='INJURED'&&e.seatIds.includes(m.healedSeatId));assert.ok(injury);
   for(const {index,request,receipt}of receipts){
    assert.deepEqual((await invoke({operation:'command',request},m.players[index])).receipt,receipt);
    assert.equal((await read(m.matchId,m.players[index])).playerView.abilities.blackoutSpent,true);
   }
   for(const identity of m.players){
    const request={protocolVersion:3,matchId:m.matchId,phaseId:vote.publicView.phase.id,commandId:randomUUID(),command:{type:'VOTE',targetSeatId:m.healedSeatId}};
    assert.equal((await invoke({operation:'command',request},identity)).receipt.status,'accepted');
   }
   assert.equal((await read(m.matchId,m.display)).publicView.phase.kind,'JAIL_VOTE','Complete ballot submission cannot shorten voting');
   const result=await waitFor(async()=>{const v=await read(m.matchId,m.display);return v.publicView?.phase.kind==='VOTE_RESULT'?v:false;},`${count} full real vote`,95000);
   assert.equal(result.publicView.phase.endsAt-result.publicView.phase.startedAt,5000);assert.equal(result.publicView.board.checkpoint,'AFTER_BLACKOUT');
   const detained=result.publicView.board.seats.find(s=>s.seatId===m.healedSeatId);assert.equal(detained.location,'Hospital');assert.equal(detained.jailed,true);
   const finalized=await waitFor(async()=>{const v=await read(m.matchId,m.display);return v.publicView?.board.checkpoint==='ROUND_FINALIZED'?v:false;},`${count} actual remaining-action finalization`,30000);
   assert.equal(finalized.publicView.round,2);assert.equal(finalized.publicView.board.finalizedRound,1);
   const healed=finalized.publicView.board.seats.find(s=>s.seatId===m.healedSeatId);assert.equal(healed.health,'Healthy');assert.equal(healed.location,'Jail');
   assert.deepEqual(finalized.publicView.events.find(e=>e.id===injury.id),injury,'Later real Rescue cannot restamp earlier injury');
   const saved=await store.transaction(tx=>tx.get('session/'+m.matchId)),world=saved.state.worlds[saved.state.currentWorldId];
   assert.equal(world.injectionsRemaining,1);assert.equal(world.actions.length,0);
   assert.equal(saved.state.phase.kind,'CAPTAIN_ELECTION');assert.equal(finalized.playerView,null);
  }));
  for(const outcome of outcomes)if(outcome.status==='rejected')throw outcome.reason;
 }finally{
  for(const m of matches)try{await invoke(operation('abort',m.matchId),m.host);}catch{}
  await db.terminate();await deleteApp(app);
 }
});
