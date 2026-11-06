import assert from 'node:assert/strict';
import {test} from 'node:test';
import {advancePlanetDeadline,assertPlanetGameState,projectPlanetPublic,projectPlanetPlayer} from '../dist/index.js';
import {planetWorldDriver,prepareBlackholeRound,moveAcross,currentWorld,worldSeat} from './planet-world-helper.mjs';
for(const n of[7,8,9])test(`${n}: native accepted meeting Promise waits through Sync presentation and settles only selected Beta at voting start`,()=>{
 const d=prepareBlackholeRound(planetWorldDriver(n));d.command('seat-1',{type:'REQUEST_HACK',targetSeatId:'seat-2'});d.deadline();d.command('seat-2',{type:'DECLARE_HACK_SIDE',declaredSide:'Blue'});d.deadline();assert.equal(d.state.phase.kind,'HACK');
 d.command('seat-1',{type:'OFFER_PROMISE',recipientSeatId:'seat-2',kind:'MEET_A',targetSeatId:null});const promiseId=d.history.at(-1).request.commandId;
 d.command('seat-2',{type:'ACCEPT_PROMISE',promiseId});assert.equal(d.state.global.promises[0].offerStatus,'accepted');
 d.command('seat-2',{type:'OFFER_PROMISE',recipientSeatId:'seat-1',kind:'JAIL_VOTE',targetSeatId:'seat-4'});
 const jailPromiseId=d.history.at(-1).request.commandId;
 d.command('seat-1',{type:'ACCEPT_PROMISE',promiseId:jailPromiseId});
 const original=d.state.currentWorldId,branch=moveAcross(d,'seat-2');assert.equal(worldSeat(d.state.worlds[original],'seat-2').location,'Room A');assert.equal(worldSeat(d.state.worlds[branch],'seat-2').location,'Room B');
 assert.equal(projectPlanetPlayer(d.state,'seat-1').promises[0].status,'Pending');assert.equal(projectPlanetPlayer(d.state,'seat-3').promises.length,0);assert.equal(projectPlanetPublic(d.state).board.seats.find(s=>s.seatId==='seat-2').location,'Room A');
 d.until(s=>s.phase.kind==='BLACKHOLE_PRESENTATION');assert.equal(d.state.currentWorldId,branch);assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,6000);assert.deepEqual(d.state.global.promises.map(p=>p.status),['Pending','Pending']);d.deadline();assert.equal(d.state.phase.kind,'JAIL_VOTE');assert.equal(d.state.global.promises[0].status,'Not fulfilled');assert.equal(d.state.global.promiseGiven.includes('seat-1'),true);assert.equal(d.state.global.promiseReceived.includes('seat-2'),true);
 const voteStart=d.state.phase.startedAt,voteEnd=d.state.phase.endsAt;
 assert.equal(voteEnd-voteStart,60000,'Presentation completion opens a separate complete vote');
 assert.equal(d.state.global.promises[1].status,'Pending','The meeting checkpoint cannot finalize a Jail card');
 d.command('seat-2',{type:'VOTE',targetSeatId:'seat-4'},{now:voteStart});
 assert.equal(d.state.global.promises[1].status,'Pending','Registering a ballot is not its opportunity closure');
 d.command('seat-1',{type:'VOTE',targetSeatId:null},{now:voteEnd-1});
 d.command('seat-3',{type:'VOTE',targetSeatId:'seat-4'},{now:voteEnd,accepted:false});
 d.deadline();assert.equal(d.state.phase.kind,'VOTE_RESULT');
 assert.equal(d.state.global.promises[0].status,'Not fulfilled');assert.equal(d.state.global.promises[1].status,'Fulfilled');
 assert.equal(projectPlanetPlayer(d.state,'seat-3').promises.length,0);d.replay();
});
test('constructed no-office tie and lazy round shuffle consume independent recorded samples once without mutating context',()=>{
 const d=planetWorldDriver(7);d.until(s=>s.round===2&&s.phase.kind==='BLACKOUT');const s=structuredClone(d.state),w=s.worlds[s.currentWorldId];
 for(const [i,seat]of w.seats.entries())Object.assign(seat,i<5?{location:'Jail',slotId:`J${i+1}`,jailed:true}:{health:'Injured',location:'Hospital',slotId:`H${i-4}`,rescueDueAfterRound:3,medical:{admittedRound:2,rescueDueAfterRound:3,rescueOpportunity:'NEXT_NORMAL_ROUND'},jailed:false});
 assertPlanetGameState(s);const ctx={now:s.phase.endsAt,nextPhaseId:'independent-samples',nextDeadlineToken:'independent-token',phaseId:s.phase.id,deadlineToken:s.deadlineToken,random:[.25,...Array(32).fill(.999999)]},before=structuredClone(ctx);
 const opened=advancePlanetDeadline(s,ctx);assert.equal(opened.advanced,true);assert.equal(opened.state.phase.kind,'NAV_SETTING');const closing={...ctx,now:opened.state.phase.endsAt,phaseId:opened.state.phase.id,deadlineToken:opened.state.deadlineToken,nextPhaseId:'independent-close',nextDeadlineToken:'independent-close-token'};const result=advancePlanetDeadline(opened.state,closing);assert.equal(result.advanced,true);assert.deepEqual(ctx,before);assert.equal(result.state.round,3);assert.deepEqual(result.state.turnOrder,d.ids,'Tie consumes sample0; subsequent Fisher-Yates starts at sample1');assert.equal(result.state.navigation.position,'B1');
});

for (const count of [7, 8, 9]) test(`${count}: native EJECT prevents an accepted Jail Promise without turning ineligibility into abstention`, () => {
  const d = planetWorldDriver(count);
  d.until(s => s.round === 1 && s.phase.kind === 'JAIL_VOTE');
  for (const id of d.state.ballot.eligibleVoters) d.command(id, {type:'VOTE',targetSeatId:'seat-1'});
  d.until(s => s.round === 2 && s.phase.kind === 'CAPTAIN_ELECTION');
  for (const id of d.state.ballot.eligibleVoters) d.command(id, {type:'VOTE',targetSeatId:'seat-6'});
  d.deadline(); d.deadline();
  d.command('seat-6', {type:'APPOINT_OFFICER',targetSeatId:'seat-7'});
  d.until(s => s.round === 2 && s.phase.kind === 'JAIL_VOTE');
  for (const id of d.state.ballot.eligibleVoters) d.command(id, {type:'VOTE',targetSeatId:'seat-2'});
  d.until(s => s.round === 3 && s.phase.kind === 'ORDINARY_TURN' && s.activeSeatId === 'seat-1');
  assert.equal(worldSeat(currentWorld(d),'seat-1').location,'Jail');
  assert.equal(worldSeat(currentWorld(d),'seat-2').location,'Jail');
  d.command('seat-1', {type:'REQUEST_HACK',targetSeatId:'seat-2'});
  d.deadline(); d.command('seat-2', {type:'DECLARE_HACK_SIDE',declaredSide:'Blue'}); d.deadline();
  for (const [giver,recipient,kind,targetSeatId] of [
    ['seat-1','seat-2','NO_JAIL_VOTE',null], ['seat-2','seat-1','JAIL_VOTE','seat-7']
  ]) {
    d.command(giver, {type:'OFFER_PROMISE',recipientSeatId:recipient,kind,targetSeatId});
    const promiseId=d.history.at(-1).request.commandId;
    d.command(recipient, {type:'ACCEPT_PROMISE',promiseId});
  }
  d.until(s => s.phase.kind === 'ORDINARY_TURN' && s.activeSeatId === 'seat-6');
  d.command('seat-6', {type:'CAPTAIN_EJECT'});
  d.until(s => s.phase.kind === 'JAIL_VOTE');
  assert.equal(d.state.ballot.eligibleVoters.includes('seat-1'),false);
  assert.equal(d.state.ballot.eligibleVoters.includes('seat-2'),false);
  assert.equal(d.state.global.promises.every(p => p.status === 'Pending'),true);
  d.deadline();
  assert.deepEqual(d.state.global.promises.map(p=>p.status),['Not fulfilled','Not fulfilled']);
  assert.equal(projectPlanetPlayer(d.state,'seat-3').promises.length,0);
  assert.deepEqual([...d.state.global.promiseGiven].sort(),['seat-1','seat-2']);
  assert.deepEqual([...d.state.global.promiseReceived].sort(),['seat-1','seat-2']);
  d.replay();
});
