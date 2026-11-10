import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PLANET_BLACKOUT_PINS} from '@mothership/contracts';
import {assertPlanetGameState,abortPlanetGame,decodePlanetGameState,encodePlanetGameState} from '../dist/index.js';
import {planetWorldDriver} from './planet-world-helper.mjs';

// Independent regression for the accepted-invalid INITIAL/PRE_TURN + RESOLVED
// marker reproduced on6a49af53. These are corrupt private-save controls, not
// claims that a player command can write authority or rewind a match.
const copy=value=>structuredClone(value);
function abort(state,label){
  return abortPlanetGame(state,{now:state.evaluatedAt+1,nextPhaseId:`restore-abort-${label}`,
    nextDeadlineToken:`restore-abort-token-${label}`,random:Array(32).fill(.99)});
}
function transplant(state,batch,label){
  const value=copy(state);value.blackoutBatch=copy(batch);
  value.evaluatedAt=Math.max(value.evaluatedAt,batch.completedAt)+1;
  value.phase={...value.phase,id:`restore-corrupt-${label}`,startedAt:value.evaluatedAt,
    endsAt:value.phase.endsAt===null?null:value.evaluatedAt+60_000};
  return value;
}
function preserved(state,label){
  assertPlanetGameState(state);const before=copy(state),restored=decodePlanetGameState(encodePlanetGameState(state));
  assert.deepEqual(restored,before,label);assert.deepEqual(state,before);
}
function refused(state,label){
  const before=copy(state);assert.throws(()=>assertPlanetGameState(state),undefined,label);
  assert.throws(()=>decodePlanetGameState(state),undefined,`${label}: reconnect cannot admit contradictory completion evidence`);assert.deepEqual(state,before);
}

for(const count of [7,8,9])test(`${count}: independent restore matrix binds completed and aborted batches to their actual publication category and round`,()=>{
  const d=planetWorldDriver(count,{versions:{...PLANET_BLACKOUT_PINS,assetManifestVersion:'planet-world-test-art'}});
  const initial=copy(d.state);preserved(initial,'initial without a batch');preserved(abort(initial,'initial'),'initial abort without a batch');
  d.until(state=>state.phase.kind==='BLACKOUT');const openOne=copy(d.state),abortedOne=abort(openOne,'open-one');
  preserved(openOne,'open PRE_BLACKOUT');preserved(abortedOne,'aborted pending PRE_BLACKOUT');
  d.deadline();const afterOne=copy(d.state),abortedAfterOne=abort(afterOne,'after-one');
  assert.equal(afterOne.phase.kind,'JAIL_VOTE');preserved(afterOne,'resolved AFTER_BLACKOUT');preserved(abortedAfterOne,'resolved AFTER_BLACKOUT abort');
  refused(transplant(initial,afterOne.blackoutBatch,'resolved-initial'),'RESOLVED cannot precede its initial-round window');
  refused(transplant(abortedOne,afterOne.blackoutBatch,'resolved-pre'),'RESOLVED cannot carry PRE_BLACKOUT even on Abort');
  refused(transplant(abort(initial,'initial-copy'),abortedOne.blackoutBatch,'aborted-initial'),'ABORTED pending cannot carry INITIAL');
  refused(transplant(abortedAfterOne,abortedOne.blackoutBatch,'aborted-after'),'ABORTED pending cannot carry AFTER_BLACKOUT');

  d.until(state=>state.round===2&&state.phase.kind==='CAPTAIN_ELECTION');const carry=copy(d.state),abortedCarry=abort(carry,'carry');
  preserved(carry,'previous completed round without a current batch');preserved(abortedCarry,'previous completed round abort without a current batch');
  d.until(state=>state.round===2&&state.phase.kind==='BLACKOUT');const abortedTwo=abort(d.state,'open-two');preserved(abortedTwo,'current-round aborted pending window');
  d.until(state=>state.round===2&&state.phase.kind==='NAV_SETTING');const full=copy(d.state),abortedFull=abort(full,'full');
  assert.equal(full.finalized.round,2);preserved(full,'resolved current ROUND_FINALIZED');preserved(abortedFull,'resolved current ROUND_FINALIZED abort');
  refused(transplant(carry,full.blackoutBatch,'resolved-carry'),'RESOLVED cannot attach to a previous-round carried publication');
  refused(transplant(abortedCarry,full.blackoutBatch,'resolved-abort-carry'),'RESOLVED cannot attach to previous-round carry on Abort');
  refused(transplant(abortedFull,abortedTwo.blackoutBatch,'aborted-full'),'ABORTED pending cannot carry current ROUND_FINALIZED');
  refused(transplant(abortedCarry,abortedTwo.blackoutBatch,'aborted-carry'),'ABORTED pending cannot carry previous ROUND_FINALIZED');
  d.replay();
});
