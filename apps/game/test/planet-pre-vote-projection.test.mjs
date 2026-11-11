import assert from 'node:assert/strict';
import test from 'node:test';
import {PLANET_BLACKOUT_PINS} from '@mothership/contracts';
import {createPlanetGame,projectPlanetPlayer,projectPlanetPublic} from '@mothership/engine';
import {planetWorldDriver,prepareBlackholeRound} from '../../../packages/engine/test/planet-world-helper.mjs';
import {rig} from './planet-support.mjs';

// Actual Backend projections from a native synthetic command/deadline history.
// This is a pure consumer boundary test, separate from real emulator acceptance.
for(const count of [7,8,9])for(const sync of [false,true])test(`${count}, Sync ${sync}: native projections publish Blackout damage before the full vote, then Jail/result before later Rescue`,async()=>{
 const versions={...PLANET_BLACKOUT_PINS,assetManifestVersion:'design-0.8.0'},d=planetWorldDriver(count,{versions:{...PLANET_BLACKOUT_PINS,assetManifestVersion:'planet-world-test-art'}});
 // The shared driver's setup uses test art. Recreate that initial deal through
 // the native factory with released art before driving any command or deadline.
 d.replaceForConstructedControl(createPlanetGame({...d.setup,versions,assetManifestVersion:versions.assetManifestVersion},{now:1000,nextPhaseId:'consumer-initial',nextDeadlineToken:'consumer-token',random:Array(32).fill(.999999)}));
 if(sync)prepareBlackholeRound(d);
 d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-2');d.command('seat-2',{type:'RESCUE',targetSeatId:'seat-1'});
 d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-3');d.command('seat-3',{type:'REQUEST_BLACKOUT'});
 d.until(s=>['BLACKHOLE_PRESENTATION','BLACKOUT'].includes(s.phase.kind));
 const display=rig(projectPlanetPublic(d.state),{display:true,now:d.state.evaluatedAt});await display.controller.start();
 const publish=async(r,view)=>{await r.advance(d.state.evaluatedAt-r.ports.clock.now());r.push(view);assert.equal(r.read().connection,'live');};
 if(sync){assert.equal(d.state.phase.kind,'BLACKHOLE_PRESENTATION');assert.equal(display.read().phase.endsAt-display.read().phase.startedAt,6000);assert.equal(display.read().board.checkpoint,'PRE_BLACKOUT');assert.doesNotMatch(display.read().boardLabel,/complete|finalized/);d.deadline();}
 assert.equal(d.state.phase.kind,'BLACKOUT');await publish(display,projectPlanetPublic(d.state));assert.equal(display.read().phase.endsAt-display.read().phase.startedAt,15000);assert.equal(display.read().canVote,false);assert.equal(display.read().board.checkpoint,'PRE_BLACKOUT');
 const picker=rig(projectPlanetPlayer(d.state,'seat-3'),{now:d.state.evaluatedAt});await picker.controller.start();d.deadline({now:d.state.phase.startedAt+5000});await publish(picker,projectPlanetPlayer(d.state,'seat-3'));assert.equal(picker.read().dark,true);assert.equal(picker.read().board,null);picker.controller.begin('SELECT_BLACKOUT_SLOT');picker.controller.choose('A1');await picker.controller.confirm();const selected=picker.sent[0].command;assert.equal(selected.slotId,'A1');const publicBefore=projectPlanetPublic(d.state);d.command('seat-3',selected,{now:d.state.phase.startedAt+5001});assert.deepEqual(projectPlanetPublic(d.state),publicBefore);
 const windowEnd=d.state.phase.endsAt;d.deadline({now:windowEnd+2000});assert.equal(d.state.phase.kind,'JAIL_VOTE');await publish(display,projectPlanetPublic(d.state));await publish(picker,projectPlanetPlayer(d.state,'seat-3'));
 assert.equal(display.read().board.checkpoint,'AFTER_BLACKOUT');assert.equal(display.read().board.finalizedRound,d.state.round);assert.equal(display.read().phase.remainingMs,60000);assert.equal(display.read().phase.startedAt,windowEnd+2000);assert.match(display.read().boardLabel,/After Blackout/);assert.doesNotMatch(display.read().boardLabel,/complete|finalized/);
 const patient=display.read().board.seats.find(s=>s.seatId==='seat-1');assert.equal(patient.health,'Injured');assert.equal(patient.location,'Hospital');assert.equal(display.read().privateArea,null);assert.equal(display.read().presentation.events.some(e=>e.kind==='RESCUED'),false);assert.equal(picker.read().canVote,true);
 for(const id of d.state.ballot.eligibleVoters)d.command(id,{type:'VOTE',targetSeatId:'seat-3'});d.deadline();assert.equal(d.state.phase.kind,'VOTE_RESULT');await publish(display,projectPlanetPublic(d.state));assert.equal(display.read().phase.remainingMs,5000);assert.equal(display.read().board.checkpoint,'AFTER_BLACKOUT');assert.equal(display.read().board.seats.find(s=>s.seatId==='seat-3').jailed,true);assert.equal(display.read().board.seats.find(s=>s.seatId==='seat-1').health,'Injured');assert.equal(display.read().presentation.events.some(e=>e.kind==='RESCUED'),false);
 d.deadline();await publish(display,projectPlanetPublic(d.state));assert.equal(display.read().board.checkpoint,'ROUND_FINALIZED');assert.notEqual(display.read().phase.kind,'BLACKOUT');assert.equal(display.read().boardLabel,`Round ${display.read().board.finalizedRound} complete`);const rescued=display.read().board.seats.find(s=>s.seatId==='seat-1');assert.equal(rescued.health,'Healthy');assert.ok(['Room A','Room B'].includes(rescued.location));assert.ok(rescued.slotId);assert.ok(display.read().presentation.events.some(e=>e.kind==='RESCUED'&&e.seatIds.includes('seat-1')));assert.equal(display.read().board.seats.length,count);
 display.controller.dispose();picker.controller.dispose();
});
