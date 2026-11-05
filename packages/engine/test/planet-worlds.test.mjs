import assert from 'node:assert/strict';
import {test} from 'node:test';
import {assertPlanetGameState,projectPlanetPublic,projectPlanetPlayer} from '../dist/index.js';
import {planetWorldDriver,currentWorld,actorWorld,worldSeat,moveAcross,prepareBlackholeRound,hackerToOrdinaryRoom,toSync} from './planet-world-helper.mjs';

for(const count of [7,8,9]) {
  test(`${count}: NATIVE Original spaceship activation is inherited by a later branch, together with spent physical cost`,()=>{
    const d=prepareBlackholeRound(planetWorldDriver(count));hackerToOrdinaryRoom(d);
    d.command('seat-6',{type:'SUBMIT_CODE',seatIds:[...d.state.code]});
    d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-6');d.command('seat-6',{type:'ACTIVATE_SHIP_HACK'});
    const original=d.state.currentWorldId;assert.equal(currentWorld(d).shipHackSpent,true);
    const branch=moveAcross(d,'seat-3');assert.notEqual(branch,original);
    assert.equal(d.state.worlds[branch].shipHackSpent,true);assert.equal(d.state.worlds[branch].shipHackOverride,true);
    assert.equal(worldSeat(d.state.worlds[branch],'seat-6').roleActionSpent,true);
    assert.deepEqual(d.state.worlds[branch].actions,d.state.worlds[original].actions);
    toSync(d);assert.equal(d.state.currentWorldId,branch);assert.deepEqual(Object.keys(d.state.worlds),[branch]);
    assert.equal(currentWorld(d).shipHackSpent,true);assert.equal(currentWorld(d).shipHackOverride,true);
    assert.equal(d.state.global.codeAttempted,true);assert.equal(d.state.global.shipHackUnlocked,true);assert.equal(d.state.global.blackholeSpent,true);d.replay();
  });
  test(`${count}: NATIVE selecting a pre-activation world preserves global Code unlock but restores only genuinely unspent physical activation`,()=>{
    const d=prepareBlackholeRound(planetWorldDriver(count));hackerToOrdinaryRoom(d);
    const branch=moveAcross(d,'seat-3'),original=d.state.currentWorldId;
    d.command('seat-6',{type:'SUBMIT_CODE',seatIds:[...d.state.code]});d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-6');
    d.command('seat-6',{type:'ACTIVATE_SHIP_HACK'});assert.equal(d.state.worlds[original].shipHackSpent,true);assert.equal(d.state.worlds[branch].shipHackSpent,false);
    toSync(d);assert.equal(d.state.currentWorldId,branch);assert.equal(currentWorld(d).shipHackSpent,false);assert.equal(currentWorld(d).shipHackOverride,false);
    assert.equal(worldSeat(currentWorld(d),'seat-6').roleActionSpent,false);assert.equal(d.state.global.codeAttempted,true);assert.equal(d.state.global.shipHackUnlocked,true);
    d.until(s=>s.round===3&&s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-6');d.command('seat-6',{type:'ACTIVATE_SHIP_HACK'});
    assert.equal(currentWorld(d).shipHackSpent,true);d.replay();
  });
  test(`${count}: NATIVE wrong Scan and final Code attempt survive discarded actor reality and lock the complete next round`,()=>{
    const d=prepareBlackholeRound(planetWorldDriver(count));hackerToOrdinaryRoom(d);const branch=moveAcross(d,'seat-3');
    d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-6');
    d.command('seat-6',{type:'SCAN',targetSeatId:'seat-5',guess:'Blue'});
    d.command('seat-6',{type:'SUBMIT_CODE',seatIds:['seat-1','seat-2','seat-3','seat-4']});
    assert.deepEqual(d.state.global.scanResults,[{round:2,targetSeatId:'seat-5',guess:'Blue',matched:false,inCode:null}]);
    toSync(d);assert.equal(d.state.currentWorldId,branch);assert.equal(worldSeat(currentWorld(d),'seat-6').roleActionSpent,false);
    assert.equal(d.state.global.scanUsedRound,2);assert.equal(d.state.global.scanBlockedThroughRound,3);assert.equal(d.state.global.codeAttempted,true);assert.equal(d.state.global.shipHackUnlocked,false);
    d.until(s=>s.round===3&&s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-6');
    d.command('seat-6',{type:'SCAN',targetSeatId:'seat-5',guess:'Red'},{accepted:false});d.command('seat-6',{type:'SUBMIT_CODE',seatIds:[...d.state.code]},{accepted:false});
    assert.equal(projectPlanetPlayer(d.state,'seat-6').abilities.scanBlockedThroughRound,3);d.replay();
  });
  test(`${count}: NATIVE global patient attempt survives discarded panel reservation; selected Doctor queue and two-injection costs never mix or refill`,()=>{
    const d=prepareBlackholeRound(planetWorldDriver(count),{patient:true});
    const original=d.state.currentWorldId;
    assert.equal(worldSeat(currentWorld(d),'seat-1').location,'Hospital');assert.equal(currentWorld(d).injectionsRemaining,1,'One native R1 reservation remains spent');
    const branch=moveAcross(d,'seat-2');assert.equal(d.state.worlds[branch].injectionsRemaining,1,'Fork inherits the already spent injection');
    d.command('seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-2'});
    assert.equal(d.state.worlds[original].injectionsRemaining,0);assert.ok(d.state.worlds[original].actions.some(a=>a.command.type==='PANEL_CODE'));
    d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-2');d.command('seat-2',{type:'RESCUE',targetSeatId:'seat-1'});
    assert.equal(d.state.worlds[branch].injectionsRemaining,0);assert.deepEqual(d.state.global.panelAttempts,['seat-1']);
    const selectedActionIds=d.state.worlds[branch].actions.map(a=>a.commandId);
    toSync(d);assert.equal(d.state.currentWorldId,branch);assert.deepEqual(currentWorld(d).actions.map(a=>a.commandId),selectedActionIds);
    assert.equal(currentWorld(d).actions.some(a=>a.command.type==='PANEL_CODE'),false);assert.equal(currentWorld(d).actions.some(a=>a.command.type==='RESCUE'),true);
    assert.equal(currentWorld(d).injectionsRemaining,0);assert.deepEqual(d.state.global.panelAttempts,['seat-1']);assert.equal(d.state.panelOpen,false);
    d.until(s=>s.round===3);assert.equal(worldSeat(currentWorld(d),'seat-1').health,'Healthy');assert.equal(currentWorld(d).injectionsRemaining,0);
    assert.deepEqual(d.state.global.panelAttempts,['seat-1']);d.replay();
  });
  test(`${count}: CONSTRUCTED all-Eliminated Original cannot finish before a surviving whole branch is selected`,()=>{
    // A complete elimination cannot natively precede Sync in this attack timetable.
    // Only this explicit corruption/control setup edits physical authority; subsequent
    // progression still uses the public deadline API, not a replacement Sync function.
    const d=prepareBlackholeRound(planetWorldDriver(count));const branch=moveAcross(d,'seat-3'),original=d.state.currentWorldId;
    const constructed=structuredClone(d.state),world=constructed.worlds[original];world.captainSeatId=null;world.officerSeatId=null;
    for(const [i,s]of world.seats.entries())Object.assign(s,{health:'Eliminated',location:i<4?'Hospital':null,slotId:i<4?`H${i+1}`:null,jailed:false,rescueDueAfterRound:null,clone:{...s.clone,active:false}});
    assertPlanetGameState(constructed);d.replaceForConstructedControl(constructed);
    assert.equal(d.state.result,null);assert.equal(projectPlanetPublic(d.state).result,null);
    toSync(d);assert.equal(d.state.currentWorldId,branch);assert.equal(d.state.result,null);assert.ok(currentWorld(d).seats.some(s=>s.health!=='Eliminated'));
    assert.equal(Object.keys(d.state.worlds).length,1);assertPlanetGameState(d.state);
    // Deliberately no native replay claim for the hand-edited control prefix.
  });
}
