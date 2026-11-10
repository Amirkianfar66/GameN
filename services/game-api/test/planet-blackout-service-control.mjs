import assert from 'node:assert/strict';
import {PLANET_BLACKOUT_PINS} from '@mothership/contracts';
import {assertPlanetGameState,projectPlanetPlayer} from '@mothership/engine';
import {planetWorldDriver,prepareBlackholeRound,currentWorld} from '../../../packages/engine/test/planet-world-helper.mjs';
import {adoptNativePlanetState,ok} from './planet-service-helper.mjs';

// Native synthetic history, adopted as a clearly labelled service control.
// The service's real engine, persistence, receipts and deadlines own all later steps.
export function blackoutServiceDriver(count,{sync=false,treatment=true}={}){
 const versions={...PLANET_BLACKOUT_PINS,assetManifestVersion:'planet-world-test-art'};
 const d=planetWorldDriver(count,{versions});
 if(sync)prepareBlackholeRound(d);
 if(treatment){d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-2');d.command('seat-2',{type:'RESCUE',targetSeatId:'seat-1'});}
 d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-3');d.command('seat-3',{type:'REQUEST_BLACKOUT'});
 d.until(s=>s.phase.kind==='BLACKOUT');return d;
}
export async function adoptBlackoutServiceControl(h,options){
 const d=blackoutServiceDriver(h.count,options);await adoptNativePlanetState(h,d.state);return d;
}
export function fullHospitalBlackoutDriver(count,{panel=false}={}){
 const d=planetWorldDriver(count,{versions:{...PLANET_BLACKOUT_PINS,assetManifestVersion:'planet-world-test-art'}});
 d.until(s=>s.round===2&&s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-2');
 // Constructed valid medical control, following a native prefix. It does not
 // claim that these body/medical positions arose from that prefix's commands.
 const state=structuredClone(d.state),world=currentWorld({state}),factions=Object.fromEntries(d.ids.map(id=>[id,projectPlanetPlayer(state,id).self.faction]));
 world.captainSeatId=null;world.officerSeatId=null;world.actions=[];
 for(const seat of world.seats){
  const n=Number(seat.seatId.slice(5)),hospital=n>=4&&n<=7;
  Object.assign(seat,{health:hospital?(n===4?'Injured':'Eliminated'):'Healthy',location:hospital?'Hospital':n<=3?'Room A':'Room B',
   slotId:hospital?`H${n-3}`:n<=3?`A${n}`:`B${n-7}`,lastRoom:n<=4?'Room A':'Room B',jailed:false,
   revealedFaction:hospital&&n!==4?factions[seat.seatId]:null,rescueDueAfterRound:n===4?state.round+1:null,
   medical:n===4?{admittedRound:state.round,rescueDueAfterRound:state.round+1,rescueOpportunity:'NEXT_NORMAL_ROUND'}:null});
  if(hospital)seat.clone.active=false;
 }
 assertPlanetGameState(state);d.replaceForConstructedControl(state);
 if(panel)d.command('seat-4',{type:'PANEL_CODE',doctorSeatId:'seat-2'});
 else d.command('seat-2',{type:'RESCUE',targetSeatId:'seat-4'});
 d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-3');d.command('seat-3',{type:'REQUEST_BLACKOUT'});
 d.until(s=>s.phase.kind==='BLACKOUT');return d;
}
export async function assertFullHospitalBeforeRescue(h,{panel=false}={}){
 await adoptNativePlanetState(h,fullHospitalBlackoutDriver(h.count,{panel}).state);
 await h.deadline();const dark=(await h.current()).state;
 assert.equal(ok((await h.command(h.players[2],{type:'SELECT_BLACKOUT_SLOT',windowId:dark.phase.id,slotId:'A1'})).response).receipt.status,'accepted');
 await h.deadline();const vote=(await h.current()).state,world=currentWorld({state:vote}),victim=world.seats.find(s=>s.seatId==='seat-1');
 assert.equal(vote.phase.kind,'JAIL_VOTE');assert.equal(victim.health,'Eliminated');assert.equal(victim.location,null);assert.equal(victim.medical,null);
 assert.equal(world.seats.filter(s=>s.location==='Hospital').length,4);assert.equal(world.injectionsRemaining,1);
 const before=(await h.read()).publicView;
 assert.equal(before.board.checkpoint,'AFTER_BLACKOUT');assert.equal(before.events.some(e=>e.kind==='HOSPITAL_OVERFLOW_REMOVED'&&e.seatIds.includes('seat-1')),true);
 assert.equal(before.events.some(e=>['INJURED','ELIMINATED'].includes(e.kind)&&e.seatIds.includes('seat-1')),false);
 assert.equal(world.actions.some(a=>a.command.type===(panel?'PANEL_CODE':'RESCUE')),true);
 if(panel)assert.equal((await h.read(h.players[3])).playerView.abilities.panelRequest.status,'QUEUED');
 await h.deadline();assert.equal((await h.current()).state.phase.kind,'VOTE_RESULT');await h.deadline();
 const completed=(await h.current()).state,finalWorld=currentWorld({state:completed});
 assert.equal(finalWorld.seats.find(s=>s.seatId==='seat-1').health,'Eliminated');assert.equal(finalWorld.seats.find(s=>s.seatId==='seat-1').location,null);
 assert.equal(finalWorld.seats.find(s=>s.seatId==='seat-4').health,'Healthy');assert.equal(finalWorld.seats.find(s=>s.seatId==='seat-4').location,'Room A');
 assert.equal(finalWorld.seats.filter(s=>s.location==='Hospital').length,3);assert.equal(finalWorld.injectionsRemaining,1);
 if(panel)assert.equal((await h.read(h.players[3])).playerView.abilities.panelRequest.status,'TREATED');
 assert.equal((await h.read()).publicView.board.checkpoint,'ROUND_FINALIZED');
}
export async function assertBlackoutThroughFinalization(h,{retry=false}={}){
 const table=await h.admission(h.display,'display','Table');ok(await h.approve(table));
 await adoptBlackoutServiceControl(h);
 const opening=(await h.current()).state,start=opening.phase.startedAt,previewJob=await h.currentJob();
 assert.equal(opening.phase.kind,'BLACKOUT');assert.equal(opening.finalized.round,opening.round);
 assert.equal((await h.read(h.display)).publicView.board.checkpoint,'PRE_BLACKOUT');
 const before=await h.store.transaction(tx=>tx.get('deadline/'+previewJob.taskId));assert.equal(before.endsAt,start+5000);
 h.setTime(start+4999);assert.equal((await h.service.runDeadline(previewJob)).status,'too-early');
 h.setTime(start+5000);if(retry)h.store.retryNext();
 assert.equal((await h.service.runDeadline(previewJob)).status,'advanced');
 const dark=(await h.current()).state,darkJob=await h.currentJob();assert.equal(dark.phase.id,opening.phase.id);
 assert.notEqual(darkJob.deadlineToken,previewJob.deadlineToken);
 assert.equal((await h.store.transaction(tx=>tx.get('deadline/'+darkJob.taskId))).endsAt,start+15000);
 const publicBefore=(await h.read(h.display)).publicView,bystanderBefore=(await h.read(h.players[3])).playerView;
 const chosen=await h.command(h.players[2],{type:'SELECT_BLACKOUT_SLOT',windowId:dark.phase.id,slotId:'A1'});
 assert.equal(ok(chosen.response).receipt.status,'accepted');
 const selected=structuredClone((await h.current()).state);
 assert.deepEqual((await h.read(h.display)).publicView,publicBefore);assert.deepEqual((await h.read(h.players[3])).playerView,bystanderBefore);
 assert.deepEqual(await h.invoke(h.players[2],'command',{request:chosen.request}),chosen.response);
 assert.deepEqual((await h.current()).state,selected);
 assert.equal((await h.service.runDeadline(previewJob)).status,'unchanged');
 assert.deepEqual((await h.current()).state,selected);
 const stillPending=await h.store.transaction(tx=>tx.get('deadline/'+darkJob.taskId));
 h.reload({engineProfile:undefined});assert.deepEqual((await h.current()).state,selected);
 assert.deepEqual(await h.store.transaction(tx=>tx.get('deadline/'+darkJob.taskId)),stillPending);
 h.setTime(start+15000+43000);
 const results=await Promise.all([h.service.runDeadline(darkJob),h.service.runDeadline(darkJob)]);
 assert.equal(results.filter(r=>r.status==='advanced').length,1);
 const vote=(await h.current()).state,world=currentWorld({state:vote}),patient=world.seats.find(s=>s.seatId==='seat-1');
 assert.equal(vote.phase.kind,'JAIL_VOTE');assert.equal(vote.phase.startedAt,h.now());assert.equal(vote.phase.endsAt-h.now(),60000);
 assert.equal(patient.health,'Injured');assert.equal(patient.location,'Hospital');assert.equal(world.injectionsRemaining,1);
 assert.equal(world.actions.some(a=>a.command.type==='RESCUE'),true,'The reserved treatment must still be pending');
 assert.equal(world.actions.some(a=>a.command.type==='REQUEST_BLACKOUT'),false);
 assert.equal(world.seats.find(s=>s.seatId==='seat-3').blackoutSpent,true);
 const after=(await h.read(h.display)).publicView;assert.equal(after.board.checkpoint,'AFTER_BLACKOUT');
 const injury=after.events.find(e=>e.kind==='INJURED'&&e.seatIds.includes('seat-1'));assert.ok(injury);
 assert.equal(after.events.some(e=>e.kind==='ATTACK_BLOCKED'),false);
 const voteJob=await h.currentJob(),outbox=await h.store.transaction(tx=>tx.get('deadline/'+voteJob.taskId));
 assert.equal(outbox.endsAt,h.now()+60000);assert.equal((await h.store.transaction(tx=>tx.get('deadline/'+darkJob.taskId))).status,'complete');
 for(const uid of h.players)assert.equal(ok((await h.command(uid,{type:'VOTE',targetSeatId:'seat-1'})).response).receipt.status,'accepted');
 assert.equal((await h.current()).state.phase.kind,'JAIL_VOTE','All ballots cannot shorten the interval');
 await h.deadline();const result=(await h.current()).state;
 assert.equal(result.phase.kind,'VOTE_RESULT');assert.equal(result.phase.endsAt-result.phase.startedAt,5000);
 const resultView=(await h.read(h.display)).publicView,resultPatient=resultView.board.seats.find(s=>s.seatId==='seat-1');
 assert.equal(resultView.board.checkpoint,'AFTER_BLACKOUT');assert.equal(resultPatient.location,'Hospital');assert.equal(resultPatient.jailed,true);
 assert.deepEqual(resultView.events.find(e=>e.id===injury.id),injury,'Jail snapshot publication cannot restamp earlier injury');
 await h.deadline({late:19000});const complete=(await h.current()).state,finalView=(await h.read(h.display)).publicView;
 assert.notEqual(complete.phase.kind,'BLACKOUT');assert.equal(finalView.board.checkpoint,'ROUND_FINALIZED');
 const treated=currentWorld({state:complete}).seats.find(s=>s.seatId==='seat-1');
 assert.equal(treated.health,'Healthy');assert.equal(treated.location,'Jail');assert.equal(treated.jailed,true);
 assert.equal(currentWorld({state:complete}).injectionsRemaining,1);
 assert.deepEqual(finalView.events.find(e=>e.id===injury.id),injury,'Later treatment cannot rewrite an already-published injury');
 assert.equal((await h.service.runDeadline(darkJob)).status,'unchanged');assert.equal((await h.service.runDeadline(voteJob)).status,'unchanged');
 assert.deepEqual((await h.current()).state,complete);return {opening,chosen,selected,vote,complete,injury};
}
