import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FullOutcomePublicEventSchema } from '@mothership/contracts';
import { CLONE_FULL_GAME_VERSION_PINS, projectFullGame } from '../dist/index.js';
import { PINS,copy,seat,views,driver,accept,turn,endRound,ward,queued,closeSynthetic,overflows } from './hospital-four-test-helper.mjs';

// Native EJECT/Clone histories start from legal SETUP. Every seeded ward, raw
// registered effect or edited defense below is explicitly SYNTHETIC: these are
// atomic checkpoint/restore controls, not claims of service or native reachability.
function elect(d,state,target='seat-4'){
  let current=d.until(state,s=>s.phase.kind==='CAPTAIN_ELECTION');
  for(const voter of current.eligibleVoters)current=accept(d.apply(current,voter,{type:'VOTE',targetSeatId:target}));
  current=d.tick(current);assert.equal(current.phase.kind,'VOTE_RESULT');return d.tick(current);
}
function protectedSeat(state,id){const subject=seat(state,id);subject.lifetimeProtectionReceived=true;subject.protection={activeFromRound:state.round,consumed:false,grantedBy:'seat-5'};}
function blockRecord(state,id='seat-2'){const records=state.outcomes.filter(o=>o.fact.type==='ATTACK_BLOCKED'&&o.fact.seatId===id);assert.equal(records.length,1);return records[0];}
function noPrivateHistory(view){for(const part of [view.public,...Object.values(view.players)]){assert.equal(Object.hasOwn(part,'outcomes'),false);assert.equal(Object.hasOwn(part,'recipientSeatIds'),false);assert.equal(Object.hasOwn(part,'hospitalOverflow'),false);}}
function overflowFixture(n){const d=driver(n);let state=ward(turn(d,d.initial,4,'seat-1'),['seat-4','seat-5','seat-6','seat-7']);state=queued(state,[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}]]);return {d,state:closeSynthetic(d,state)};}
function audienceFixture(n,pins,mode){
  const d=driver(n,pins);let state=turn(d,d.initial,4,'seat-1');
  if(mode==='hospital')state=ward(state,['seat-2'],'Injured');
  if(mode==='overflow')state=ward(state,['seat-4','seat-5','seat-6','seat-7']);
  // A retained body observes its actual physical room, independently of health.
  if(mode==='retained-body'){seat(state,'seat-5').health='Eliminated';seat(state,'seat-5').medicalEpisode=null;}
  protectedSeat(state,'seat-2');views(state);
  const commands=[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}],['seat-4',{type:'REGISTER_SHOT',targetSeatId:'seat-2'}]];
  if(mode==='healed')commands.push(['seat-2',{type:'RESCUE',targetSeatId:'seat-1'}]);
  state=closeSynthetic(d,queued(state,commands));return {state,record:blockRecord(state)};
}
for(const n of [7,8,9]){
  test(`${n}: native 1.11 EJECT records its own retained victims once, replays and cannot be substituted by overflow proof`,()=>{
    const d=driver(n);let state=endRound(d,d.initial,'seat-7');state=turn(d,elect(d,state),2,'seat-4');
    state=accept(d.apply(state,'seat-4',{type:'CAPTAIN_EJECT'}));const victim=seat(state,'seat-7');
    assert.equal(victim.location,null);assert.equal(victim.slotId,null);assert.equal(victim.hospitalOverflow,null);assert.equal(state.captainPowersUsed.ejectUsed,true);
    const occurrences=state.outcomes.filter(o=>o.fact.type==='CAPTAIN_OUTCOME'&&o.fact.kind==='EJECT');assert.equal(occurrences.length,1);assert.deepEqual(occurrences[0].fact.seatIds,['seat-7']);d.replay(state);
    const missing=copy(state);missing.outcomes=missing.outcomes.filter(o=>o.fact.type!=='CAPTAIN_OUTCOME'||o.fact.kind!=='EJECT');assert.throws(()=>projectFullGame(missing));
    const overlap=copy(state);seat(overlap,'seat-7').hospitalOverflow={phaseId:state.phase.id,round:state.round};seat(overlap,'seat-7').medicalEpisodeCount=1;
    overlap.outcomes.push({fact:{type:'HOSPITAL_OVERFLOW_REMOVED',phaseId:state.phase.id,round:state.round,seatId:'seat-7'},recipientSeatIds:null});assert.throws(()=>projectFullGame(overlap));
  });
  test(`${n}: SYNTHETIC global EJECT use alone cannot justify a fresh off-board seat or erased overflow occurrence`,()=>{
    const d=driver(n),fresh=copy(d.initial);Object.assign(seat(fresh,'seat-4'),{health:'Eliminated',location:null,slotId:null,medicalEpisode:null,medicalEpisodeCount:1,hospitalOverflow:null});fresh.captainPowersUsed.ejectUsed=true;assert.throws(()=>projectFullGame(fresh));
    const {state}=overflowFixture(n),erased=copy(state);seat(erased,'seat-1').hospitalOverflow=null;erased.outcomes=erased.outcomes.filter(o=>o.fact.type!=='HOSPITAL_OVERFLOW_REMOVED');erased.captainPowersUsed.ejectUsed=true;assert.throws(()=>projectFullGame(erased));
  });
  test(`${n}: SYNTHETIC exact1.11 stored physical H5 anchors fail closed while historical H5 and clinical HV5 remain valid`,()=>{
    for(const type of ['ATTACK_BLOCKED','BOARD_PLACEMENT_CHANGED'])for(const pins of [PINS,CLONE_FULL_GAME_VERSION_PINS]){
      const d=driver(n,pins),state=copy(d.initial);state.outcomes.push({fact:{type,phaseId:state.phase.id,round:1,seatId:'seat-1',location:'Hospital',slotId:'H5'},recipientSeatIds:type==='ATTACK_BLOCKED'?['seat-1']:null});
      if(pins===PINS)assert.throws(()=>projectFullGame(state));else views(state);
    }
    const fact={type:'MEDICAL_OUTCOME',phaseId:'clinical-phase',round:1,seatId:'seat-1',kind:'INJURY',health:'Injured',presentationAnchor:{kind:'CLINICAL_VIGNETTE',batchId:'clinical-batch',anchorId:'HV5',slotCount:n}};
    FullOutcomePublicEventSchema.parse({protocolVersion:2,matchId:'clinical-match',eventId:'clinical-event',viewRevision:1,versions:PINS,outcomeId:'clinical-event',publishedAt:1_800_000_000_000,expiresAt:1_800_000_030_000,fact,audience:{kind:'public'}});
  });
  for(const mode of ['origin','hospital','healed','overflow','retained-body'])test(`${n}: SYNTHETIC old1.10/new1.11 ${mode} block freezes actual stage recipients before final medical placement`,()=>{
    const old=audienceFixture(n,CLONE_FULL_GAME_VERSION_PINS,mode),next=audienceFixture(n,PINS,mode);
    assert.equal(old.record.fact.location,mode==='hospital'?'Hospital':'Room A');assert.equal(next.record.fact.location,old.record.fact.location);
    assert.equal(old.record.recipientSeatIds.includes('seat-1'),mode==='hospital');assert.equal(next.record.recipientSeatIds.includes('seat-1'),mode!=='hospital');
    if(mode==='healed')assert.equal(seat(next.state,'seat-1').health,'Healthy');
    else if(mode==='overflow'){assert.equal(seat(next.state,'seat-1').location,null);assert.equal(overflows(next.state).length,1);}
    else assert.equal(seat(next.state,'seat-1').location,'Hospital');
    if(mode==='retained-body'){assert.ok(next.record.recipientSeatIds.includes('seat-5'));assert.ok(old.record.recipientSeatIds.includes('seat-5'));}
    const recovered=copy(next.state);assert.deepEqual(blockRecord(recovered).recipientSeatIds,next.record.recipientSeatIds);noPrivateHistory(views(next.state));
    assert.equal(seat(next.state,'seat-2').protection.consumed,true);
  });
  test(`${n}: native 1.11 Clone activation remains private and original expiry precedes next normal view`,()=>{
    const d=driver(n);let state=turn(d,d.initial,1,'seat-7');const before=views(state);state=accept(d.apply(state,'seat-7',{type:'ACTIVATE_CLONE'}));
    const after=views(state);assert.deepEqual(after.public,before.public);for(const id of Object.keys(before.players).filter(id=>id!=='seat-7'))assert.deepEqual(after.players[id],before.players[id]);
    state=endRound(d,state);assert.equal(seat(state,'seat-7').cloneStatus.active,true);state=endRound(d,state);assert.equal(seat(state,'seat-7').cloneStatus.active,false);assert.equal(seat(state,'seat-7').cloneStatus.used,true);d.replay(state);
  });
  test(`${n}: SYNTHETIC full ward cannot overflow Clone-blocked repeated targets or consume their independent Protection`,()=>{
    const d=driver(n);let state=ward(turn(d,d.initial,4,'seat-7'),['seat-1','seat-2','seat-4','seat-5']);state=accept(d.apply(state,'seat-7',{type:'ACTIVATE_CLONE'}));protectedSeat(state,'seat-7');
    state=queued(state,[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-7'}],['seat-6',{type:'REGISTER_SHOT',targetSeatId:'seat-7'}]]);state=closeSynthetic(d,state);
    assert.equal(seat(state,'seat-7').health,'Healthy');assert.equal(seat(state,'seat-7').hospitalOverflow,null);assert.equal(seat(state,'seat-7').protection.consumed,false);assert.equal(overflows(state).length,0);assert.equal(state.outcomes.filter(o=>o.fact.type==='ATTACK_BLOCKED'&&o.fact.seatId==='seat-7').length,2);
  });
  test(`${n}: SYNTHETIC full ward single Protection block retains health and repeated accepted effects still overflow after it is consumed`,()=>{
    for(const hits of [1,2]){
      const d=driver(n);let state=ward(turn(d,d.initial,4,'seat-1'),['seat-4','seat-5','seat-6','seat-7']);protectedSeat(state,'seat-1');state=queued(state,[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}],...(hits===2?[['seat-4',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}]]:[])]);state=closeSynthetic(d,state);
      assert.equal(seat(state,'seat-1').protection.consumed,true);assert.equal(state.outcomes.filter(o=>o.fact.type==='ATTACK_BLOCKED'&&o.fact.seatId==='seat-1').length,1);assert.equal(overflows(state).length,hits===1?0:1);assert.equal(seat(state,'seat-1').health,hits===1?'Healthy':'Eliminated');
    }
  });
  test(`${n}: SYNTHETIC accepted R5 Code retains subsequently overflowed identities and resolves Red victory at the complete checkpoint`,()=>{
    const d=driver(n);let state=ward(turn(d,d.initial,5,'seat-6'),['seat-2','seat-4','seat-5','seat-7']);state=accept(d.apply(state,'seat-6',{type:'SUBMIT_CODE',seatIds:state.code}));
    state=queued(state,[['seat-6',{type:'REGISTER_SHOT',targetSeatId:'seat-3'}]]);state=closeSynthetic(d,state);assert.equal(seat(state,'seat-3').location,null);assert.equal(state.code.includes('seat-3'),true);assert.equal(state.correctCode,true);assert.equal(state.codeSubmitted,true);assert.equal(state.phase.kind,'FINISHED');assert.equal(state.result.winner,'Red');
  });
}
