import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createPlanetGame,applyPlanetCommand,advancePlanetDeadline,planetDeadlineAt,projectPlanetPublic,projectPlanetPlayer,assertPlanetGameState,encodePlanetGameState,decodePlanetGameState,abortPlanetGame,PLANET_GAME_PINS} from '../dist/index.js';
import {nextPlanetPosition,planetNavigationWeights} from '../dist/planet-game/navigation.js';
import {planetSeatView} from '../dist/planet-game/model.js';
import {planetWorldDriver,currentWorld,worldSeat} from './planet-world-helper.mjs';
const context=(s,now=s.phase.endsAt,sample=.999999)=>({now,nextPhaseId:`extra-${s.round}-${s.phase.id}`.slice(0,120),nextDeadlineToken:`extra-token-${s.round}-${s.phase.id}`.slice(0,120),phaseId:s.phase.id,deadlineToken:s.deadlineToken,random:Array(32).fill(sample)});
function voteAll(d,target){for(const id of d.state.ballot.eligibleVoters)d.command(id,{type:'VOTE',targetSeatId:target});d.deadline();}
function appoint(d){d.until(s=>s.round===2&&s.phase.kind==='CAPTAIN_ELECTION');voteAll(d,'seat-7');d.deadline();assert.equal(d.state.phase.kind,'OFFICER_APPOINTMENT');d.command('seat-7',{type:'APPOINT_OFFICER',targetSeatId:'seat-4'});}
function tieDriver(n){const d=planetWorldDriver(n);d.until(s=>s.phase.kind==='JAIL_VOTE');voteAll(d,'seat-1');appoint(d);d.until(s=>s.round===2&&s.phase.kind==='JAIL_VOTE');voteAll(d,n===8?null:'seat-2');d.until(s=>s.phase.kind==='NAV_TIE');return d;}
function direct(d,actor,command,ctx){return applyPlanetCommand(d.state,actor,{protocolVersion:3,matchId:d.state.matchId,phaseId:d.state.phase.id,commandId:`direct-${ctx.nextPhaseId}`,command},ctx);}

for(const n of [7,8,9]){
 test(`${n}: native setup preserves fixed original Code and private starting information with strict independent rooms`,()=>{
  const d=planetWorldDriver(n),s=d.state;assert.deepEqual(s.versions,{...PLANET_GAME_PINS,assetManifestVersion:'planet-world-test-art'});
  assert.deepEqual(s.code,['seat-1','seat-2','seat-5','seat-7']);
  assert.deepEqual(projectPlanetPlayer(s,'seat-1').knowledge.insiderSeatIds,['seat-2','seat-5','seat-7']);
  assert.equal(projectPlanetPlayer(s,'seat-6').knowledge.knownUndercoverSeatId,'seat-5');assert.deepEqual(projectPlanetPlayer(s,'seat-7').knowledge.insiderSeatIds,[]);
  if(n>=8)assert.equal(projectPlanetPlayer(s,'seat-8').knowledge.knownUndercoverSeatId,'seat-5');
  assert.deepEqual(Object.keys(s.global.roundOrders),['1']);
  const bad=structuredClone(d.setup);bad.roleOrder[0]='Alien';assert.throws(()=>createPlanetGame(bad,context(s,s.phase.startedAt)));
  bad.roleOrder=[...d.setup.roleOrder];for(const id of d.ids)bad.initialRooms[id]='Room A';assert.throws(()=>createPlanetGame(bad,context(s,s.phase.startedAt)));
  assert.deepEqual(decodePlanetGameState(JSON.parse(JSON.stringify(encodePlanetGameState(s)))),s);
 });
 test(`${n}: native pre-turn and ordinary deadlines refuse early/stale work and Pass closes only its own turn`,()=>{
  const d=planetWorldDriver(n),s=d.state,early=context(s,s.phase.endsAt-1);assert.equal(advancePlanetDeadline(s,early).advanced,false);
  d.command('seat-1',{type:'PASS_TURN'},{accepted:false});assert.equal(d.state.phase.kind,'PRE_TURN');
  d.deadline();const old=structuredClone(d.state);d.command('seat-1',{type:'PASS_TURN'});assert.equal(d.state.activeSeatId,'seat-2');assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,60000);
  assert.equal(advancePlanetDeadline(d.state,{...context(d.state,d.state.phase.endsAt),phaseId:old.phase.id,deadlineToken:old.deadlineToken}).advanced,false);d.replay();
 });
 test(`${n}: native last-turn Standard Hack retains full15/5/60 windows and closes voluntary movement`,()=>{
  const d=planetWorldDriver(n);d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId===d.ids.at(-1));const actor=d.ids.at(-1),w=currentWorld(d),target=w.seats.find(s=>s.seatId!==actor&&s.location===worldSeat(w,actor).location);assert.ok(target);
  d.command(actor,{type:'REQUEST_HACK',targetSeatId:target.seatId});assert.equal(projectPlanetPublic(d.state).hackSession,null);d.deadline();assert.equal(d.state.phase.kind,'HACK_DECLARE');
  d.command('seat-6',{type:'MOVE',destination:'Room B',slotId:'B5'},{accepted:false});d.deadline();assert.equal(d.state.phase.kind,'HACK_RESULT');assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,5000);
  d.deadline();assert.equal(d.state.phase.kind,'HACK');assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,60000);d.deadline();assert.equal(d.state.phase.kind,'JAIL_VOTE');d.replay();
 });
 test(`${n}: native permitted Hack claims change pair-private feedback without public or bystander differences`,()=>{
  const d=planetWorldDriver(n);d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-6');d.command('seat-6',{type:'REQUEST_HACK',targetSeatId:'seat-5'});d.deadline();
  const ctx=context(d.state,d.state.phase.startedAt+100),blue=direct(d,'seat-5',{type:'DECLARE_HACK_SIDE',declaredSide:'Blue'},ctx),red=direct(d,'seat-5',{type:'DECLARE_HACK_SIDE',declaredSide:'Red'},ctx);
  assert.equal(blue.receipt.status,'accepted');assert.equal(red.receipt.status,'accepted');assert.deepEqual(projectPlanetPublic(blue.state),projectPlanetPublic(red.state));assert.deepEqual(projectPlanetPlayer(blue.state,'seat-1'),projectPlanetPlayer(red.state,'seat-1'));
  assert.equal(projectPlanetPlayer(blue.state,'seat-6').hackFeedback.declaredSide,'Blue');assert.equal(projectPlanetPlayer(red.state,'seat-6').hackFeedback.declaredSide,'Red');
 });
 test(`${n}: native Blackout has one five-second boundary, exact dark offers, frozen slot damage and stale-token safety`,()=>{
  const d=planetWorldDriver(n);d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-3');d.command('seat-3',{type:'REQUEST_BLACKOUT'});d.until(s=>s.phase.kind==='BLACKOUT');
  const light=structuredClone(d.state),id=light.phase.id;assert.equal(planetDeadlineAt(light),light.phase.startedAt+5000);assert.equal(projectPlanetPlayer(light,'seat-3').offers.some(o=>o.type==='SELECT_BLACKOUT_SLOT'),false);
  d.command('seat-3',{type:'SELECT_BLACKOUT_SLOT',windowId:id,slotId:'A1'},{now:light.phase.startedAt+4999,accepted:false});
  d.deadline({now:light.phase.startedAt+5000});assert.equal(d.state.phase.id,id);assert.notEqual(d.state.deadlineToken,light.deadlineToken);assert.equal(planetDeadlineAt(d.state),light.phase.endsAt);
  assert.equal(projectPlanetPlayer(d.state,'seat-3').offers.some(o=>o.type==='SELECT_BLACKOUT_SLOT'),true);
  assert.equal(advancePlanetDeadline(d.state,{...context(d.state,light.phase.endsAt),deadlineToken:light.deadlineToken}).advanced,false);
  d.command('seat-3',{type:'SELECT_BLACKOUT_SLOT',windowId:id,slotId:'A1'},{now:light.phase.startedAt+5001});assert.equal(worldSeat(currentWorld(d),'seat-1').health,'Healthy');
  d.deadline();assert.equal(worldSeat(currentWorld(d),'seat-1').health,'Injured');assert.match(worldSeat(currentWorld(d),'seat-1').slotId,/^H[1-4]$/);assert.equal(worldSeat(currentWorld(d),'seat-1').rescueDueAfterRound,2);d.replay();
 });
 test(`${n}: native Officer appointment timeout uses recorded uniform samples and fixed pre-turn block persists for round`,()=>{
  const d=planetWorldDriver(n);d.until(s=>s.round===2&&s.phase.kind==='CAPTAIN_ELECTION');voteAll(d,'seat-7');d.deadline();assert.equal(d.state.phase.kind,'OFFICER_APPOINTMENT');assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,30000);
  const a=advancePlanetDeadline(d.state,context(d.state,d.state.phase.endsAt,0)).state,b=advancePlanetDeadline(d.state,context(d.state,d.state.phase.endsAt,.999)).state;
  assert.equal(a.worlds[a.currentWorldId].officerSeatId,'seat-1');assert.equal(b.worlds[b.currentWorldId].officerSeatId,d.ids.filter(id=>id!=='seat-7').at(-1));
  d.command('seat-7',{type:'APPOINT_OFFICER',targetSeatId:'seat-4'});const until=d.state.phase.endsAt;d.command('seat-4',{type:'BLOCK_MOVE',targetSeatId:'seat-6'});assert.equal(d.state.phase.endsAt,until);assert.equal(d.state.phase.kind,'PRE_TURN');
  d.deadline();d.command('seat-6',{type:'MOVE',destination:'Room B',slotId:'B5'},{accepted:false});d.until(s=>s.round===3&&s.phase.kind==='PRE_TURN');assert.equal(d.state.global.blockedSeatId,null);assert.equal(d.state.global.lastBlockedSeatId,'seat-6');
  d.command('seat-4',{type:'BLOCK_MOVE',targetSeatId:'seat-6'},{accepted:false});d.command('seat-4',{type:'BLOCK_MOVE',targetSeatId:'seat-5'});d.replay();
 });
 test(`${n}: native genuine tie choices and sequential acknowledgements make exactly one Y movement`,()=>{
  const d=tieDriver(n);assert.equal(d.state.navigation.position,'Junction');
  for(const [i,direction]of ['Blue','Blue','Red','Red'].entries()){
    assert.equal(d.state.phase.kind,'NAV_TIE');d.command('seat-4',{type:'CHOOSE_NAV_DIRECTION',direction});assert.equal(d.state.phase.kind,'NAV_CAPTAIN_CONFIRM');
    const round=d.state.round;d.command('seat-4',{type:'CONFIRM_NAVIGATION'},{accepted:false});d.command('seat-7',{type:'CONFIRM_NAVIGATION'});assert.equal(d.state.phase.kind,'NAV_OFFICER_CONFIRM');assert.equal(d.state.navigation.lastMovedRound,round-1);
    d.command('seat-4',{type:'CONFIRM_NAVIGATION'});assert.equal(d.state.navigation.lastMovedRound,round);assert.equal(d.state.navigation.position,['B1','B2','R2','Red Planet'][i]);
    if(i<3)d.until(s=>s.phase.kind==='NAV_TIE');
  }
  assert.deepEqual(d.state.result,{winner:'Red',reason:'ARRIVAL',alienCoWinner:false});assert.equal(d.state.round,5);d.replay();
 });
 test(`${n}: native alternating navigation crosses Round6 with lazily recorded orders and no automatic ending`,()=>{
  const d=tieDriver(n);
  for(let round=2;round<=6;round++){
    assert.equal(d.state.phase.kind,'NAV_TIE');d.command('seat-4',{type:'CHOOSE_NAV_DIRECTION',direction:round%2===0?'Blue':'Red'});d.deadline();assert.equal(d.state.phase.kind,'NAV_OFFICER_CONFIRM');d.deadline();
    if(round<6)d.until(s=>s.phase.kind==='NAV_TIE');
  }
  assert.equal(d.state.round,7);assert.equal(d.state.result,null);assert.equal(d.state.navigation.lastMovedRound,6);assert.deepEqual(Object.keys(d.state.global.roundOrders),['1','2','3','4','5','6','7']);d.replay();
 });
 test(`${n}: constructed full Jail retains the actual winning ballot and pair-private Promise fulfillment`,()=>{
  const d=planetWorldDriver(n);d.until(s=>s.phase.kind==='JAIL_VOTE');const s=structuredClone(d.state),w=s.worlds[s.currentWorldId];
  w.captainSeatId=null;w.officerSeatId=null;for(let i=0;i<5;i++)Object.assign(w.seats[i],{location:'Jail',slotId:`J${i+1}`,jailed:true});
  for(let i=5;i<n;i++)Object.assign(w.seats[i],{location:'Room B',slotId:`B${i-4}`,jailed:false});
  s.ballot.eligibleTargets=d.ids.slice(5);const p={id:'full-jail-promise',giverSeatId:'seat-6',recipientSeatId:'seat-7',kind:'JAIL_VOTE',targetSeatId:'seat-6',round:1,electionId:null,accepted:true,status:'Pending',offerStatus:'accepted'};
  s.global.promises.push(p);s.global.promiseGiven=['seat-6'];s.global.promiseReceived=['seat-7'];s.global.promiseEvaluation[p.id]={candidateBallots:0,missedRequiredBallot:false,captainWon:null,ballotPhaseIds:[]};s.finalized.seats=w.seats.map(seat=>planetSeatView(w,seat));assertPlanetGameState(s);d.replaceForConstructedControl(s);
  voteAll(d,'seat-6');assert.equal(d.state.lastTally.selectedSeatId,'seat-6');assert.equal(d.state.lastTally.outcome,'JAIL_FULL');assert.equal(d.state.lastTally.counts['seat-6'],n);assert.equal(worldSeat(currentWorld(d),'seat-6').jailed,false);assert.equal(d.state.global.promises[0].status,'Fulfilled');
  assert.equal(projectPlanetPlayer(d.state,'seat-6').promises.length,1);assert.equal(projectPlanetPlayer(d.state,'seat-1').promises.length,0);
 });
 test(`${n}: constructed no-survivor finish waits for Sync and finalized complete resolution; abort never invents a winner`,()=>{
  const d=planetWorldDriver(n),s=structuredClone(d.state),w=s.worlds[s.currentWorldId];for(const [i,seat]of w.seats.entries())Object.assign(seat,{health:'Eliminated',location:i<4?'Hospital':null,slotId:i<4?`H${i+1}`:null,rescueDueAfterRound:null,medical:null});
  assertPlanetGameState(s);d.replaceForConstructedControl(s);d.deadline();assert.equal(d.state.phase.kind,'JAIL_VOTE');assert.equal(d.state.result,null);d.deadline();assert.equal(d.state.result,null);d.deadline();assert.equal(d.state.phase.kind,'BLACKOUT');d.deadline();assert.deepEqual(d.state.result,{winner:null,reason:'NO_SURVIVORS',alienCoWinner:false});assert.equal(d.state.navigation.lastMovedRound,0);
  const fresh=planetWorldDriver(n).state,aborted=abortPlanetGame(fresh,context(fresh,fresh.phase.startedAt+1));assert.equal(aborted.phase.kind,'ABORTED');assert.deepEqual(aborted.result,{winner:null,reason:'ABORTED',alienCoWinner:false});assert.equal(projectPlanetPublic(aborted).endReveal,null);
 });
 test(`${n}: restored malformed commands and room audiences fail closed before projection/resolution`,()=>{
  const s=planetWorldDriver(n).state,mutators=[
    x=>x.worlds[x.currentWorldId].events.push({event:{id:'bad',round:1,phaseId:s.phase.id,viewRevision:0,publishedAt:s.evaluatedAt,expiresAt:s.evaluatedAt+30000,audience:{kind:'player',seatId:'seat-1'},kind:'ATTACK_BLOCKED',seatIds:['seat-1'],actorSeatId:null,location:'Room A',slotId:'A1',clinicalAnchor:null},recipients:null}),
    x=>x.worlds[x.currentWorldId].events.push({event:{id:'bad',round:1,phaseId:s.phase.id,viewRevision:0,publishedAt:s.evaluatedAt,expiresAt:s.evaluatedAt+30000,audience:{kind:'player',seatId:'seat-1'},kind:'ATTACK_BLOCKED',seatIds:['seat-1'],actorSeatId:null,location:'Room A',slotId:'A1',clinicalAnchor:null},recipients:['seat-2']}),
    x=>x.worlds[x.currentWorldId].actions.push({actorSeatId:'seat-1',commandId:'bad',order:0,command:{type:'OBSOLETE'}}),
    x=>x.worlds[x.currentWorldId].actions.push({actorSeatId:'seat-1',commandId:'bad',order:0,command:{type:'REGISTER_SHOT',targetSeatId:'not-a-player'}}),
    x=>x.versions.protocolVersion=2,
    x=>x.worlds[x.currentWorldId].seats[0].slotId='H5',
  ];for(const mutate of mutators){const bad=structuredClone(s);mutate(bad);assert.throws(()=>decodePlanetGameState(bad));}
  assert.deepEqual(decodePlanetGameState(JSON.parse(JSON.stringify(s))),s);
 });
}
test('Y route cannot convert opposite-arm movement into two steps or a reset',()=>{
 let position='Junction';for(const direction of ['Blue','Blue','Red','Red'])position=nextPlanetPosition(position,direction);assert.equal(position,'Red Planet');
 assert.equal(nextPlanetPosition('B1','Red'),'R1');assert.equal(nextPlanetPosition('R2','Blue'),'B2');assert.equal(nextPlanetPosition('Start','Red'),'Junction');
});
test('navigation eligibility includes no body, detention, Hospital, Alien or partial Captain suppression contribution',()=>{
 const d=planetWorldDriver(9),s=structuredClone(d.state),w=s.worlds[s.currentWorldId];w.captainSeatId='seat-1';assert.deepEqual(planetNavigationWeights(s,w),{Blue:6,Red:3});w.suppressedSeatIds=['seat-1'];assert.deepEqual(planetNavigationWeights(s,w),{Blue:4,Red:3});
 Object.assign(worldSeat(w,'seat-2'),{health:'Injured',location:'Hospital',slotId:'H1'});worldSeat(w,'seat-3').jailed=true;worldSeat(w,'seat-4').health='Eliminated';assert.deepEqual(planetNavigationWeights(s,w),{Blue:1,Red:3});
});
