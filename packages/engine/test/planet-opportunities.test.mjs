import assert from 'node:assert/strict';
import {test} from 'node:test';
import {advancePlanetDeadline,assertPlanetGameState,projectPlanetPublic,projectPlanetPlayer} from '../dist/index.js';
import {planetWorldDriver,prepareBlackholeRound,moveAcross,toSync,currentWorld,worldSeat} from './planet-world-helper.mjs';
for(const n of[7,8,9])test(`${n}: native accepted meeting Promise remains Pending in speculative Original and settles only selected Beta at voting start`,()=>{
 const d=prepareBlackholeRound(planetWorldDriver(n));d.command('seat-1',{type:'REQUEST_HACK',targetSeatId:'seat-2'});d.deadline();d.command('seat-2',{type:'DECLARE_HACK_SIDE',declaredSide:'Blue'});d.deadline();assert.equal(d.state.phase.kind,'HACK');
 d.command('seat-1',{type:'OFFER_PROMISE',recipientSeatId:'seat-2',kind:'MEET_A',targetSeatId:null});const promiseId=d.history.at(-1).request.commandId;
 d.command('seat-2',{type:'ACCEPT_PROMISE',promiseId});assert.equal(d.state.global.promises[0].offerStatus,'accepted');
 const original=d.state.currentWorldId,branch=moveAcross(d,'seat-2');assert.equal(worldSeat(d.state.worlds[original],'seat-2').location,'Room A');assert.equal(worldSeat(d.state.worlds[branch],'seat-2').location,'Room B');
 assert.equal(projectPlanetPlayer(d.state,'seat-1').promises[0].status,'Pending');assert.equal(projectPlanetPlayer(d.state,'seat-3').promises.length,0);assert.equal(projectPlanetPublic(d.state).board.seats.find(s=>s.seatId==='seat-2').location,'Room A');
 toSync(d);assert.equal(d.state.currentWorldId,branch);assert.equal(d.state.global.promises[0].status,'Not fulfilled');assert.equal(d.state.global.promiseGiven.includes('seat-1'),true);assert.equal(d.state.global.promiseReceived.includes('seat-2'),true);d.replay();
});
test('constructed no-office tie and lazy round shuffle consume independent recorded samples once without mutating context',()=>{
 const d=planetWorldDriver(7);d.until(s=>s.round===2&&s.phase.kind==='BLACKOUT');const s=structuredClone(d.state),w=s.worlds[s.currentWorldId];
 for(const [i,seat]of w.seats.entries())Object.assign(seat,i<5?{location:'Jail',slotId:`J${i+1}`,jailed:true}:{health:'Injured',location:'Hospital',slotId:`H${i-4}`,rescueDueAfterRound:3,medical:{admittedRound:2,rescueDueAfterRound:3,rescueOpportunity:'NEXT_NORMAL_ROUND'},jailed:false});
 assertPlanetGameState(s);const ctx={now:s.phase.endsAt,nextPhaseId:'independent-samples',nextDeadlineToken:'independent-token',phaseId:s.phase.id,deadlineToken:s.deadlineToken,random:[.25,...Array(32).fill(.999999)]},before=structuredClone(ctx);
 const result=advancePlanetDeadline(s,ctx);assert.equal(result.advanced,true);assert.deepEqual(ctx,before);assert.equal(result.state.round,3);assert.deepEqual(result.state.turnOrder,d.ids,'Tie consumes sample0; subsequent Fisher-Yates starts at sample1');assert.equal(result.state.navigation.position,'B1');
});
