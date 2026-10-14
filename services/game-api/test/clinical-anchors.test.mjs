// Presentation-only geometry controls; constructed public clinical batches are
// explicitly independent of native damage reachability and persistent positions.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clinicalPresentationAnchors } from '../dist/full-game.js';
const rows=count=>Array.from({length:count},(_,i)=>({seatId:`seat-${i+1}`,location:'Room A',slotId:`A${i+1}`}));
const medical=(seatId,kind='INJURY')=>({recipientSeatIds:null,fact:{type:'MEDICAL_OUTCOME',phaseId:'phase-batch',round:1,seatId,kind,health:kind==='INJURY'?'Injured':'Healthy'}});
for(const count of [7,8,9]) {
  test(`${count}: clinical anchors preserve starting patients/bodies, holes and same-subject injury/heal without changing final positions`,()=>{
    const before={playerCount:count,seats:rows(count),outcomes:[]};
    Object.assign(before.seats[1],{location:'Hospital',slotId:'H1'});Object.assign(before.seats[6],{location:'Hospital',slotId:'H3',health:'Eliminated'});
    const after=structuredClone(before);after.outcomes=[medical('seat-6'),medical('seat-4'),medical('seat-2','HEALED'),medical('seat-4','HEALED')];
    // Persisted final geometry deliberately differs from vignette geometry.
    Object.assign(after.seats[1],{location:'Room A',slotId:'A2'});Object.assign(after.seats[5],{location:'Hospital',slotId:'H1'});
    const original=structuredClone({before,after});
    assert.deepEqual(clinicalPresentationAnchors(before,after),{'seat-2':'HV1','seat-4':'HV2','seat-6':'HV4'});
    assert.deepEqual({before,after},original);
    after.outcomes.reverse();assert.deepEqual(clinicalPresentationAnchors(before,after),{'seat-2':'HV1','seat-4':'HV2','seat-6':'HV4'});
  });
  test(`${count}: all-roster clinical batch fits exactly, duplicate occurrences share one anchor and hidden fields do not influence placement`,()=>{
    const before={playerCount:count,seats:rows(count),outcomes:[]},after=structuredClone(before);
    after.outcomes=after.seats.flatMap(s=>[medical(s.seatId),medical(s.seatId,'HEALED')]).reverse();
    const anchors=clinicalPresentationAnchors(before,after);assert.equal(new Set(Object.values(anchors)).size,count);
    assert.deepEqual(Object.values(anchors),Array.from({length:count},(_,i)=>`HV${i+1}`));
    after.seats.reverse();for(const [index,seat] of after.seats.entries()){seat.role='secret-test-only';seat.queuedActorOrder=count-index;}
    assert.deepEqual(clinicalPresentationAnchors(before,after),anchors);
  });
  test(`${count}: only current completed batch gets anchors, with fail-closed unknown subject and invalid recorded geometry`,()=>{
    const before={playerCount:count,seats:rows(count),outcomes:[medical('seat-1')]},after=structuredClone(before);
    assert.deepEqual(clinicalPresentationAnchors(before,after),{});after.outcomes.push(medical('seat-2'));assert.deepEqual(clinicalPresentationAnchors(before,after),{'seat-2':'HV1'});
    const bad=structuredClone(before);Object.assign(bad.seats[0],{location:'Hospital',slotId:'H9'});
    if(count<9)assert.throws(()=>clinicalPresentationAnchors(bad,after));
    after.outcomes.push(medical('unknown-seat'));assert.throws(()=>clinicalPresentationAnchors(before,after));
  });
}
