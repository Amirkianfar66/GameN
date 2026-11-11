import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PLANET_BLACKOUT_PINS,PLANET_GAME_PINS,PLANET_PHONE_OFFER_PINS} from '@mothership/contracts';
import {abortPlanetGame,projectPlanetPublic,projectPlanetPlayer,encodePlanetGameState,decodePlanetGameState,assertPlanetGameState} from '../dist/index.js';
import {planetWorldDriver,prepareBlackholeRound,moveAcross,currentWorld,worldSeat} from './planet-world-helper.mjs';
const copy=value=>structuredClone(value);
const driver=count=>planetWorldDriver(count,{versions:{...PLANET_BLACKOUT_PINS,assetManifestVersion:'planet-world-test-art'}});
function abort(state,label){
  const before=copy(state),shared=projectPlanetPublic(state);
  const result=abortPlanetGame(state,{now:state.evaluatedAt+1,nextPhaseId:`abort-${label}`,nextDeadlineToken:`abort-token-${label}`,random:[]});
  assert.deepEqual(state,before);assert.equal(result.phase.kind,'ABORTED');assert.equal(result.result.reason,'ABORTED');
  assert.deepEqual(result.finalized,before.finalized,'Abort cannot republish speculative/current-world physical state');
  const actual=projectPlanetPublic(result);
  assert.deepEqual(actual.board,shared.board);assert.deepEqual(actual.offices,shared.offices);assert.deepEqual(actual.events,shared.events);
  const restored=decodePlanetGameState(encodePlanetGameState(result));assert.deepEqual(restored,result);
  assert.deepEqual(projectPlanetPublic(restored),actual);
  for(const id of Object.keys(result.roles))assert.deepEqual(projectPlanetPlayer(restored,id),projectPlanetPlayer(result,id));
  assert.equal(abortPlanetGame(result,{now:result.evaluatedAt+1,nextPhaseId:`again-${label}`,nextDeadlineToken:`again-token-${label}`,random:[]}),result);
  return result;
}
for(const n of [7,8,9]){
  test(`${n}: abort/reconnect preserves INITIAL and carried completed-round publication identity`,()=>{
    const initial=driver(n);initial.deadline();moveAcross(initial,'seat-1');
    assert.equal(projectPlanetPublic(initial.state).board.checkpoint,'INITIAL');
    const ended=abort(initial.state,`initial-${n}`);assert.equal(ended.finalized.round,0);
    const carried=driver(n);carried.until(s=>s.round===2&&s.phase.kind==='CAPTAIN_ELECTION');
    assert.equal(carried.state.finalized.checkpoint,'ROUND_FINALIZED');assert.equal(carried.state.finalized.round,1);
    abort(carried.state,`carried-${n}`);
    carried.until(s=>s.round===2&&s.phase.kind==='NAV_SETTING');
    assert.equal(carried.state.finalized.round,2);abort(carried.state,`current-final-${n}`);
  });
  test(`${n}: aborting an admitted window retains selected cost, cancels pending admission without damage and preserves PRE_BLACKOUT`,()=>{
    const d=driver(n);d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-3');d.command('seat-3',{type:'REQUEST_BLACKOUT'});
    if(n>=8){d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-8');d.command('seat-8',{type:'REQUEST_BLACKOUT'});}
    d.until(s=>s.phase.kind==='BLACKOUT');d.deadline({now:d.state.phase.startedAt+5000});
    d.command('seat-3',{type:'SELECT_BLACKOUT_SLOT',windowId:d.state.phase.id,slotId:'A1'},{now:d.state.phase.startedAt+5001});
    const ended=abort(d.state,`open-${n}`);
    assert.equal(ended.blackoutBatch.status,'ABORTED');assert.equal(ended.finalized.checkpoint,'PRE_BLACKOUT');
    assert.equal(worldSeat(currentWorld({state:ended}),'seat-1').health,'Healthy');
    assert.equal(worldSeat(currentWorld({state:ended}),'seat-3').blackoutSpent,true);
    if(n>=8)assert.equal(worldSeat(currentWorld({state:ended}),'seat-8').blackoutSpent,false);
    assert.equal(ended.blackoutBatch.attempts.every(row=>row.outcome===null),true);
  });
  test(`${n}: abort/reconnect preserves selected PRE_BLACKOUT presentation and published AFTER_BLACKOUT injury occurrences`,()=>{
    const synced=prepareBlackholeRound(driver(n));moveAcross(synced,'seat-2');
    synced.until(s=>s.phase.kind==='BLACKHOLE_PRESENTATION');
    assert.equal(synced.state.finalized.checkpoint,'PRE_BLACKOUT');assert.equal(synced.state.blackoutBatch,null);
    abort(synced.state,`presentation-${n}`);
    const hit=driver(n);hit.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-3');hit.command('seat-3',{type:'REQUEST_BLACKOUT'});
    hit.until(s=>s.phase.kind==='BLACKOUT');hit.deadline({now:hit.state.phase.startedAt+5000});
    hit.command('seat-3',{type:'SELECT_BLACKOUT_SLOT',windowId:hit.state.phase.id,slotId:'A1'},{now:hit.state.phase.startedAt+5001});hit.deadline();
    assert.equal(hit.state.finalized.checkpoint,'AFTER_BLACKOUT');
    assert.equal(projectPlanetPublic(hit.state).events.some(event=>event.kind==='INJURED'),true);
    const ended=abort(hit.state,`after-${n}`);assert.equal(ended.blackoutBatch.status,'RESOLVED');
  });
  test(`${n}: constructed divergent private offices cannot leak through abort publication`,()=>{
    const d=prepareBlackholeRound(driver(n));moveAcross(d,'seat-2');
    const state=copy(d.state),original=state.worlds[state.currentWorldId];
    // Construct only a valid divergent office state over the native branch prefix;
    // this is a projection/abort control, not a second claimed gameplay history.
    const previous=worldSeat(original,'seat-6'),slot=['A1','A2','A3','A4','A5'].find(id=>!original.seats.some(seat=>seat.slotId===id));
    assert.ok(slot);previous.location='Room A';previous.slotId=slot;
    original.captainSeatId='seat-5';original.officerSeatId=null;assertPlanetGameState(state);
    assert.equal(projectPlanetPlayer(state,'seat-5').offices.captainSeatId,'seat-5');
    assert.equal(projectPlanetPublic(state).offices.captainSeatId,'seat-6');
    abort(state,`divergent-${n}`);
  });
}
test('historical1.1/1.2 abort semantics and omitted checkpoint fields stay unchanged',()=>{
  for(const pins of [PLANET_GAME_PINS,PLANET_PHONE_OFFER_PINS]){
    const d=planetWorldDriver(7,{versions:{...pins,assetManifestVersion:'planet-world-test-art'}});d.deadline();moveAcross(d,'seat-1');
    const ended=abortPlanetGame(d.state,{now:d.state.evaluatedAt+1,nextPhaseId:`old-abort-${pins.engineVersion.replaceAll('.','-')}`,nextDeadlineToken:'old-abort-token',random:[]});
    assert.equal(ended.finalized.round,1);assert.equal(Object.hasOwn(ended.finalized,'checkpoint'),false);
    assert.equal(Object.hasOwn(ended,'blackoutBatch'),false);
    assert.equal(projectPlanetPublic(ended).board.seats.find(seat=>seat.seatId==='seat-1').location,'Room B');
  }
});
