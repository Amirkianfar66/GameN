import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFullGame,abortFullGame,projectFullGame } from '../dist/index.js';
import { beginMedicalResolution,recordMedicalDamage,healMedicalSeat,placeMedicalSeats } from '../dist/full-game/medical.js';
import { PINS,OLD,START,copy,seat,med,overflows,views,driver,accept,turn,window,endRound,select,supplyPrefix,nativeWard,ward,queued,closeSynthetic,sameInitialResources } from './hospital-four-test-helper.mjs';

for(const n of [7,8,9]){
  test(`${n}: native 1.11 initializes private provenance, exact four-bed art/layout and no public overflow metadata`,()=>{
    const d=driver(n);assert.ok(d.initial.seats.every(s=>s.hospitalOverflow===null));assert.equal(d.initial.versions.assetManifestVersion,'design-0.5.0');
    const wrong=copy(d.args);wrong.assetManifestVersion='design-0.4.0';wrong.versions.assetManifestVersion='design-0.4.0';assert.throws(()=>createFullGame(wrong));
    const dark=window(d,d.initial);views(dark);d.replay(dark);
  });
  test(`${n}: native R3 grants and four R4 injuries retain numbered beds, due deaths retain bodies and showdown overflow is permanent`,()=>{
    const d=driver(n);let state=nativeWard(d);assert.equal(overflows(state).length,0);assert.deepEqual(state.seats.filter(s=>s.location==='Hospital').map(s=>[s.seatId,s.slotId]),[['seat-1','H1'],['seat-2','H2'],['seat-4','H3'],['seat-5','H4']]);
    assert.ok(['seat-1','seat-2','seat-4','seat-5'].every(id=>seat(state,id).health==='Injured'));
    state=endRound(d,state);assert.equal(state.phase.kind,'SHOWDOWN');assert.ok(state.seats.filter(s=>s.location==='Hospital').every(s=>s.health==='Eliminated'));
    state=accept(d.apply(state,'seat-3',{type:'SHOWDOWN_SHOT',targetSeatId:'seat-6'}));state=accept(d.apply(state,'seat-6',{type:'SHOWDOWN_SHOT',targetSeatId:'seat-3'}));
    const beforeResources=sameInitialResources(state,'seat-6');state=d.tick(state);assert.equal(state.phase.kind,'FINISHED');
    for(const id of ['seat-3','seat-6']){const s=seat(state,id);assert.equal(s.health,'Eliminated');assert.equal(s.location,null);assert.equal(s.slotId,null);assert.equal(s.medicalEpisode,null);assert.equal(s.jailed,false);assert.equal(s.captain,false);assert.deepEqual(s.hospitalOverflow,{phaseId:overflows(state).find(o=>o.fact.seatId===id).fact.phaseId,round:5});assert.equal(med(state,id).length,0);}
    assert.deepEqual(sameInitialResources(state,'seat-6'),beforeResources);assert.equal(state.captainPowersUsed.ejectUsed,false);assert.equal(state.seats.length,n);assert.equal(state.code.includes('seat-3'),true);
    assert.deepEqual(overflows(state).map(o=>o.fact.seatId),['seat-3','seat-6']);assert.equal(state.result.winner,n===7?'Alien':n===8?'Red':'Draw');d.replay(state);
    const dead=copy(seat(state,'seat-6'));healMedicalSeat(seat(state,'seat-6'),state);assert.deepEqual(seat(state,'seat-6'),dead);
  });
  test(`${n}: native preregistered Rescue heals a new candidate before capacity, and a lower new second-hit body wins the final bed`,()=>{
    const d=driver(n);let state=nativeWard(d,true);assert.equal(seat(state,'seat-1').health,'Healthy');assert.equal(seat(state,'seat-1').hospitalOverflow,null);assert.equal(state.seats.filter(s=>s.location==='Hospital').length,3);
    assert.deepEqual(med(state,'seat-1').map(o=>o.fact.kind),['INJURY','HEALED']);state=endRound(d,state,'seat-1');assert.equal(state.phase.kind,'SHOWDOWN');
    state=accept(d.apply(state,'seat-1',{type:'SHOWDOWN_SHOT',targetSeatId:'seat-6'}));state=accept(d.apply(state,'seat-3',{type:'SHOWDOWN_SHOT',targetSeatId:'seat-1'}));state=accept(d.apply(state,'seat-6',{type:'SHOWDOWN_SHOT',targetSeatId:'seat-1'}));
    state=d.tick(state);assert.equal(seat(state,'seat-1').health,'Eliminated');assert.equal(seat(state,'seat-1').location,'Hospital');assert.equal(seat(state,'seat-1').slotId,'H4');assert.equal(seat(state,'seat-1').hospitalOverflow,null);
    assert.equal(seat(state,'seat-6').location,null);assert.equal(seat(state,'seat-6').health,'Eliminated');assert.equal(med(state,'seat-6').length,0);assert.equal(overflows(state).length,1);d.replay(state);
  });
  test(`${n}: SYNTHETIC full ward with legal R3 ammo/R4 preregistered Rescue lets the new healed candidate survive without a fifth bed`,()=>{
    const d=driver(n);let state=supplyPrefix(d);state=accept(d.apply(turn(d,state,4,'seat-2'),'seat-2',{type:'RESCUE',targetSeatId:'seat-1'}));state=accept(d.apply(turn(d,state,4,'seat-3'),'seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}));
    state=ward(state,['seat-4','seat-5','seat-6','seat-7']);state=closeSynthetic(d,state);
    assert.equal(seat(state,'seat-1').health,'Healthy');assert.equal(seat(state,'seat-1').hospitalOverflow,null);assert.deepEqual(med(state,'seat-1').map(o=>o.fact.kind),['INJURY','HEALED']);assert.equal(overflows(state).length,0);assert.equal(state.seats.filter(s=>s.location==='Hospital').length,4);
  });
  test(`${n}: SYNTHETIC full ward denies an incoming candidate, suppresses provisional medical facts, preserves earlier history/resources and rejects revival`,()=>{
    const d=driver(n);let state=supplyPrefix(d);state=accept(d.apply(turn(d,state,4,'seat-3'),'seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}));state=ward(state,['seat-4','seat-5','seat-6','seat-7']);
    const resources=sameInitialResources(state,'seat-1'),prior=copy(state.outcomes);state=closeSynthetic(d,state);assert.equal(seat(state,'seat-1').location,null);assert.equal(seat(state,'seat-1').health,'Eliminated');assert.equal(med(state,'seat-1').length,0);
    assert.deepEqual(state.outcomes.slice(0,prior.length),prior);assert.deepEqual(sameInitialResources(state,'seat-1'),resources);assert.equal(state.captainPowersUsed.ejectUsed,false);assert.equal(overflows(state).length,1);
    const saved=copy(state);healMedicalSeat(seat(state,'seat-1'),state);assert.deepEqual(state,saved);views(state);
  });
  test(`${n}: SYNTHETIC reversed actor effects do not override lower-number last-bed admission or repack existing bodies`,()=>{
    const d=driver(n);let state=ward(turn(d,d.initial,4,'seat-1'),['seat-5','seat-6','seat-7']);state=queued(state,[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-2'}],['seat-4',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}]]);
    const bodies=state.seats.filter(s=>s.location==='Hospital').map(s=>[s.seatId,s.slotId]);state=closeSynthetic(d,state);assert.equal(seat(state,'seat-1').location,'Hospital');assert.equal(seat(state,'seat-1').slotId,'H4');assert.equal(seat(state,'seat-2').location,null);assert.deepEqual(state.seats.filter(s=>bodies.some(([id])=>id===s.seatId)).map(s=>[s.seatId,s.slotId]),bodies);
  });
  test(`${n}: SYNTHETIC healed later-number patient vacates before lower-number incoming candidate and frees the lowest hole`,()=>{
    const d=driver(n);let state=ward(turn(d,d.initial,4,'seat-1'),['seat-4','seat-5','seat-6'],'Eliminated');
    state=ward(state,['seat-7'],'Injured');seat(state,'seat-7').slotId='H4';views(state);
    state=queued(state,[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}],['seat-2',{type:'RESCUE',targetSeatId:'seat-7'}]]);state=closeSynthetic(d,state);
    assert.equal(seat(state,'seat-7').health,'Healthy');assert.notEqual(seat(state,'seat-7').location,'Hospital');assert.equal(seat(state,'seat-1').slotId,'H4');assert.equal(overflows(state).length,0);
  });
  test(`${n}: SYNTHETIC R3 queued-stage control grants living recipients before later overflow, preserving grant history without refunds`,()=>{
    const d=driver(n);let state=ward(turn(d,d.initial,3,'seat-1'),['seat-5','seat-6','seat-7']);
    // Constructed preregistered R3 ordinary shots are unreachable for these roles;
    // this isolates the stable resolution pipeline, not a legal R3 play claim.
    state=queued(state,[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-2'}],['seat-5',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}],['seat-4',{type:'SUPPLY',targetSeatIds:['seat-2','seat-3']}]]);
    const before=seat(state,'seat-2').ordinaryWeapons;state=closeSynthetic(d,state);assert.equal(seat(state,'seat-2').location,null);assert.equal(seat(state,'seat-2').ordinaryWeapons,before+1);
    assert.deepEqual(state.supplierGrantResults.at(-1).successfulRecipientSeatIds,['seat-2','seat-3']);assert.equal(seat(state,'seat-2').health,'Eliminated');assert.equal(overflows(state).length,1);
  });
  test(`${n}: SYNTHETIC atomic staging never exceeds four logical Hospital occupants, leaves no persistent staging and forbids draft projection`,()=>{
    const d=driver(n),state=ward(turn(d,d.initial,4,'seat-1'),['seat-5','seat-6','seat-7']);const batch=beginMedicalResolution(state);
    recordMedicalDamage(state,seat(state,'seat-2'),batch);recordMedicalDamage(state,seat(state,'seat-1'),batch);assert.equal(state.seats.filter(s=>s.location==='Hospital').length,3);assert.throws(()=>projectFullGame(state));
    placeMedicalSeats(state,batch);assert.equal(seat(state,'seat-1').location,'Hospital');assert.equal(seat(state,'seat-2').location,null);assert.equal(Object.hasOwn(state,'candidates'),false);assert.equal(Object.hasOwn(state,'medicalBatch'),false);views(state);
  });
  test(`${n}: SYNTHETIC malformed overflow provenance/history, old private fields and fifth slots fail closed`,()=>{
    const d=driver(n);let state=ward(turn(d,d.initial,4,'seat-1'),['seat-4','seat-5','seat-6','seat-7']);state=queued(state,[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}]]);state=closeSynthetic(d,state);
    const corrupt=[s=>delete seat(s,'seat-2').hospitalOverflow,s=>seat(s,'seat-1').hospitalOverflow=null,s=>seat(s,'seat-1').hospitalOverflow.round=6,s=>seat(s,'seat-1').hospitalOverflow.phaseId='wrong',s=>seat(s,'seat-1').hospitalOverflow.extra=true,s=>seat(s,'seat-1').location='Room A',s=>seat(s,'seat-1').jailed=true,s=>s.outcomes=s.outcomes.filter(o=>o.fact.type!=='HOSPITAL_OVERFLOW_REMOVED'),s=>s.outcomes.push(copy(overflows(s)[0])),s=>seat(s,'seat-4').slotId='H5'];
    for(const mutate of corrupt){const broken=copy(state);mutate(broken);assert.throws(()=>projectFullGame(broken));}
    const before=copy(state),aborted=state.phase.endsAt===null?state:abortFullGame(state,d.context(state.phase.startedAt+1));assert.equal(overflows(aborted).length,1);assert.deepEqual(state,before);
  });
  for(const pins of OLD)test(`${n}: exact historical ${pins.engineVersion} keeps tuple/assets/replay and omits new overflow provenance`,()=>{
    const d=driver(n,pins);assert.ok(d.initial.seats.every(s=>!Object.hasOwn(s,'hospitalOverflow')));
    let state=turn(d,d.initial,1,'seat-3');state=accept(d.apply(state,'seat-3',{type:pins.engineVersion==='full-game-1.9.0'||pins.engineVersion==='full-game-1.10.0'?'REQUEST_BLACKOUT':'DISABLE',...(pins.engineVersion==='full-game-1.9.0'||pins.engineVersion==='full-game-1.10.0'?{}:{targetSeatId:'seat-1'})}));
    d.replay(state);const broken=copy(state);seat(broken,'seat-1').hospitalOverflow=null;assert.throws(()=>projectFullGame(broken));
  });
}
