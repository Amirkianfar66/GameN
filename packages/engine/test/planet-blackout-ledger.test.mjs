import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PLANET_BLACKOUT_PINS,PLANET_PHONE_OFFER_PINS} from '@mothership/contracts';
import {assertPlanetGameState,decodePlanetGameState,encodePlanetGameState,advancePlanetDeadline} from '../dist/index.js';
import {resolvePlanetBlackoutBatch} from '../dist/planet-game/physical.js';
import {planetWorldDriver,currentWorld,worldSeat} from './planet-world-helper.mjs';
const copy=value=>structuredClone(value);
function rejectMutations(state,mutations){
  for(const [label,mutate]of mutations){
    const altered=copy(state);mutate(altered);const before=copy(altered);
    assert.throws(()=>decodePlanetGameState(altered),undefined,label);assert.deepEqual(altered,before,'Decoder never repairs input');
  }
}
for(const count of [7,8,9])test(`${count}: private admission/choice/completion ledger reconnects exactly and malformed states fail closed`,()=>{
  const d=planetWorldDriver(count,{versions:{...PLANET_BLACKOUT_PINS,assetManifestVersion:'planet-world-test-art'}});
  d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-3');d.command('seat-3',{type:'REQUEST_BLACKOUT'});
  d.until(s=>s.phase.kind==='BLACKOUT');const open=copy(d.state);
  assert.equal(open.blackoutBatch.status,'OPEN');assert.deepEqual(decodePlanetGameState(encodePlanetGameState(open)),open);
  const batch=s=>s.blackoutBatch,row=s=>batch(s).attempts[0];
  rejectMutations(open,[
    ['missing candidate ledger',s=>delete s.blackoutBatch],
    ['missing publication category',s=>delete s.finalized.checkpoint],
    ['wrong publication phase',s=>s.finalized.checkpoint='AFTER_BLACKOUT'],
    ['wrong publication round',s=>s.finalized.round=0],
    ['wrong window',s=>batch(s).windowId='other-window'],
    ['wrong duration',s=>batch(s).endsAt++],
    ['wrong batch round',s=>batch(s).round++],
    ['changed frozen health',s=>batch(s).snapshot[0].health='Eliminated'],
    ['changed frozen position',s=>batch(s).snapshot[0].slotId='B5'],
    ['unadmitted role',s=>row(s).actorSeatId='seat-2'],
    ['wrong stored order',s=>row(s).order++],
    ['wrong request',s=>row(s).commandId='other-request'],
    ['wrong bound room',s=>row(s).boundRoom='Room B'],
    ['duplicate admitted actor',s=>batch(s).attempts.push(copy(row(s)))],
    ['premature slot',s=>row(s).selectedSlotId='A1'],
    ['premature target',s=>row(s).targetSeatId='seat-1'],
    ['premature timeout',s=>row(s).selection='TIMED_OUT'],
    ['premature charge',s=>worldSeat(currentWorld({state:s}),'seat-3').blackoutSpent=true],
    ['premature outcome',s=>row(s).outcome='INJURED'],
    ['premature completion',s=>batch(s).status='RESOLVED'],
  ]);
  const previewToken=d.state.deadlineToken,previewPhase=d.state.phase.id;
  d.deadline({now:d.state.phase.startedAt+5000});
  const duplicateDark=advancePlanetDeadline(d.state,{now:d.state.evaluatedAt,nextPhaseId:'duplicate-dark',nextDeadlineToken:'duplicate-token',phaseId:previewPhase,deadlineToken:previewToken,random:[]});
  assert.equal(duplicateDark.advanced,false);assert.deepEqual(duplicateDark.state,d.state);
  d.command('seat-3',{type:'SELECT_BLACKOUT_SLOT',windowId:d.state.phase.id,slotId:'A1'},{now:d.state.phase.startedAt+5001});
  const selected=copy(d.state);assert.equal(row(selected).targetSeatId,'seat-1');
  assert.deepEqual(decodePlanetGameState(encodePlanetGameState(selected)),selected);
  rejectMutations(selected,[
    ['replacement target',s=>row(s).targetSeatId='seat-2'],
    ['selection before darkness',s=>row(s).selectedAt=batch(s).startedAt+4999],
    ['selection at closed boundary',s=>row(s).selectedAt=batch(s).endsAt],
    ['unspent committed choice',s=>worldSeat(currentWorld({state:s}),'seat-3').blackoutSpent=false],
    ['divergent retained request',s=>currentWorld({state:s}).actions.find(a=>a.command.type==='REQUEST_BLACKOUT').selectedSlotId='A2'],
  ]);
  const callback={now:selected.phase.endsAt,nextPhaseId:'old-window-next',nextDeadlineToken:'old-window-token',phaseId:selected.phase.id,deadlineToken:selected.deadlineToken,random:Array(32).fill(.999999)};
  d.deadline();const resolved=copy(d.state);assert.equal(batch(resolved).status,'RESOLVED');
  assert.deepEqual(decodePlanetGameState(encodePlanetGameState(resolved)),resolved);
  const duplicate=advancePlanetDeadline(resolved,callback);assert.equal(duplicate.advanced,false);assert.deepEqual(duplicate.state,resolved);
  const before=copy(resolved);assert.throws(()=>resolvePlanetBlackoutBatch(resolved));assert.deepEqual(resolved,before);
  rejectMutations(resolved,[
    ['resolved pending attempt',s=>row(s).selection='PENDING'],
    ['missing committed outcome',s=>row(s).outcome=null],
    ['miss with frozen victim',s=>row(s).outcome='MISS'],
    ['completion before full window',s=>batch(s).completedAt=batch(s).endsAt-1],
    ['resolved request repeated',s=>currentWorld({state:s}).actions.push(copy(currentWorld({state:selected}).actions.find(a=>a.command.type==='REQUEST_BLACKOUT')))],
    ['discarded completion ledger',s=>s.blackoutBatch=null],
    ['aborted ledger while voting',s=>batch(s).status='ABORTED'],
  ]);
});
test('historical tuples reject candidate publication and private admission fields without migration',()=>{
  const d=planetWorldDriver(7,{versions:{...PLANET_PHONE_OFFER_PINS,assetManifestVersion:'planet-world-test-art'}});
  assertPlanetGameState(d.state);
  rejectMutations(d.state,[['candidate batch',s=>s.blackoutBatch=null],['candidate checkpoint',s=>s.finalized.checkpoint='INITIAL']]);
});
