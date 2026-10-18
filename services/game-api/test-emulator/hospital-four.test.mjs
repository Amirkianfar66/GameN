// Exact 1.11 Auth/Firestore acceptance. Native admission/setup cases are explicit.
// Gameplay histories use one legal synthetic Healthy SETUP and real service commands,
// trusted deadlines, receipts and complete journal replay; no midmatch Admin edits.
// These are isolated service tests, not automatic Tasks, art, phone or Balance evidence.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { HOSPITAL_FOUR_FULL_GAME_VERSION_PINS as PINS, CLONE_FULL_GAME_VERSION_PINS as OLD, projectFullGame } from '@mothership/engine';
import { FullCommandResponseSchema, FullAdvanceResponseSchema, FullLookupResponseSchema, FullOperationResponseSchema,
  FullPublicViewSchema, FullPlayerViewSchema, FullEventSchema, FullOutcomeEventSchema, FullReadyForMatchResponseSchema,
  HOSPITAL_FOUR_ASSET_MANIFEST_VERSION as ART, HOSPITAL_FOUR_LAYOUT_REVISION as LAYOUT } from '@mothership/contracts';
import { createV1Service } from '../dist/index.js';
import { decodeV1State } from '../dist/full-game.js';
import { assertLocalEmulators, createEmulatorIdentity, firestoreRequest, firestoreEventQuery } from '../../../infra/firebase/test/helpers.mjs';
import { beginStagedSetup, confirmStagedChoices, completeStagedSetup, setupRequest, setupDocument } from './staged-start-helper.mjs';
import { boardMedicalFixture, assertStoredBoard, assertBoardJournal, retryUnavailable, deadlinePayload } from './board-medical-helper.mjs';
let app,db;
before(()=>{
  assertLocalEmulators();assert.equal(PINS.engineVersion,'full-game-1.11.0');
  assert.equal(PINS.rulesetHash,'7d9d3519df8813feb1213f1ad4439cae90895af6850c223264c28907824aeb9c');
  app=initializeApp({projectId:'demo-mothership'},'hospital-four-'+randomUUID());db=getFirestore(app);
});
after(async()=>{await db?.terminate();if(app)await deleteApp(app);});
const seat=(s,id)=>s.seats.find(v=>v.seatId===id);
const fixture=(n,pins=PINS)=>boardMedicalFixture(db,n,{pins,...(pins.engineVersion===PINS.engineVersion?{assetManifestVersion:ART}:{})});
const label=(n,words)=>`${n} (synthetic legal SETUP): ${words}`;
const op=value=>{const r=FullOperationResponseSchema.parse(value);assert.equal(r.ok,true,JSON.stringify(r));return r.result;};
const body=(h,s,command,commandId=randomUUID())=>({protocolVersion:2,matchId:h.base.id,phaseId:s.phase.id,commandId,command});
const submit=(h,actor,request)=>retryUnavailable(()=>h.service.submit(h.uid(actor),request)).then(v=>FullCommandResponseSchema.parse(v));
async function events(h,key='public'){
  return (await h.base.collection('audienceEvents').doc(key).collection('items').get()).docs.map(d=>({id:d.id,event:FullEventSchema.parse(d.data())})).sort((a,b)=>a.event.viewRevision-b.event.viewRevision||Number(a.id.split('-')[1])-Number(b.id.split('-')[1]));
}
async function vote(h,round,target){
  const s=await h.until(s=>s.round===round&&s.phase.kind==='JAIL_VOTE');assert.ok(s.eligibleTargets.includes(target));
  for(const voter of s.eligibleVoters)await h.accept(voter,{type:'VOTE',targetSeatId:target});
  const result=await h.expire();assert.equal(result.phase.kind,'VOTE_RESULT');assert.equal(result.lastTally.selectedSeatId,target);return result;
}
async function select(h,actor,slotId){
  const s=await h.current(),t=projectFullGame(s).players[actor].self.blackoutTargeting;assert.ok(t);
  h.setTime(s.phase.startedAt+5000);return h.accept(actor,{type:'SELECT_BLACKOUT_SLOT',snapshotId:t.snapshotId,room:t.room,slotId});
}
// Canonical weapons only: UC's one starting weapon, Supply to 1/3, Blue's lifetime
// Blackout. Extra8/9 seats are detained with normal votes; they never gain invented ammo.
async function showdownHistory(h,{rescueFresh=false,protectTarget=false,stopAfterFour=false}={}){
  const n=h.ids.length;
  await vote(h,1,'seat-7');await h.finishRound(1);
  if(n>=8)await vote(h,2,'seat-8');await h.finishRound(2);
  await h.turn('seat-4',3);const supply=await h.accept('seat-4',{type:'SUPPLY',targetSeatIds:['seat-1','seat-3']});
  if(protectTarget){await h.turn('seat-5',3);await h.accept('seat-5',{type:'PROTECT',targetSeatId:'seat-4'});}
  if(n===9)await vote(h,3,'seat-9');await h.finishRound(3);
  await h.turn('seat-1',4);await h.accept('seat-1',{type:'REGISTER_SHOT',targetSeatId:'seat-2'});
  await h.turn('seat-2',4);let rescue;
  if(rescueFresh)rescue=await h.accept('seat-2',{type:'RESCUE',targetSeatId:'seat-1'});
  await h.turn('seat-3',4);await h.accept('seat-3',{type:'REQUEST_BLACKOUT'});await h.accept('seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-5'});
  await h.turn('seat-5',4);await h.accept('seat-5',{type:'REGISTER_SHOT',targetSeatId:'seat-1'});
  const blackout=await h.until(s=>s.round===4&&s.phase.kind==='BLACKOUT');await select(h,'seat-3','A4');await h.expire();
  const afterFour=await h.current();
  if(stopAfterFour)return {afterFour,supply,rescue,checkpoint:blackout};
  assert.deepEqual(afterFour.seats.filter(s=>s.location==='Hospital').map(s=>s.seatId),rescueFresh?['seat-2','seat-4','seat-5']:['seat-1','seat-2','seat-4','seat-5']);
  if(rescueFresh){
    assert.equal(seat(afterFour,'seat-1').health,'Healthy');assert.equal(seat(afterFour,'seat-1').medicalEpisode,null);
    assert.equal(seat(afterFour,'seat-1').hospitalOverflow,null);
    assert.equal((await submit(h,'seat-2',rescue.request)).receipt.status,'accepted');
    await vote(h,5,'seat-1');
  }
  const phase=await h.until(s=>s.phase.kind==='SHOWDOWN');
  const bodies=phase.seats.filter(s=>s.location==='Hospital');assert.equal(bodies.length,rescueFresh?3:4);
  assert.ok(bodies.every(s=>s.health==='Eliminated'));
  assert.equal(phase.result,null);assert.equal(phase.round,5);
  assert.deepEqual(phase.supplierGrantResults.find(r=>r.commandId===supply.request.commandId).successfulRecipientSeatIds,['seat-1','seat-3']);
  return {phase,afterFour,supply,rescue};
}
async function closeOnce(h,phase){
  h.setTime(phase.phase.endsAt-1);assert.equal((await h.service.runDeadline(deadlinePayload(phase))).status,'too-early');
  assert.equal((await h.current()).phase.id,phase.phase.id);const before=(await h.base.collection('events').get()).size;
  h.setTime(phase.phase.endsAt);
  const results=await Promise.all([1,2,3].map(()=>retryUnavailable(()=>h.service.runDeadline(deadlinePayload(phase))).then(v=>FullAdvanceResponseSchema.parse(v))));
  assert.equal(results.filter(r=>r.result==='advanced').length,1);assert.equal(results.filter(r=>r.result==='unchanged').length,2);
  assert.equal((await h.base.collection('events').get()).size,before+1);return h.current();
}
async function assertOverflow(h,phase,ids){
  const {state,views}=await assertStoredBoard(h);assert.equal(state.seats.length,h.ids.length);
  assert.equal(state.phase.kind,'FINISHED');
  for(const id of ids){
    const victim=seat(state,id);assert.equal(victim.health,'Eliminated');assert.equal(victim.location,null);assert.equal(victim.slotId,null);
    assert.equal(victim.jailed,false);assert.equal(victim.captain,false);assert.equal(victim.medicalEpisode,null);
    assert.deepEqual(victim.hospitalOverflow,{phaseId:phase.phase.id,round:5});
    for(const view of [views.public,...Object.values(views.players)]){
      const projected=seat(view,id);assert.equal(projected.location,null);assert.equal(projected.slotId,null);assert.equal(projected.medical,null);
    }
  }
  assert.deepEqual(state.captainPowersUsed,{releaseUsed:false,ejectUsed:false});
  assert.deepEqual(state.code,h.initial.code);assert.equal(views.public.endReveal.roles.length,h.ids.length);
  assert.doesNotMatch(JSON.stringify(views),/"(?:hospitalOverflow|attackerSeatId|sourceSeatId|admissionOrder)"/);
  const occurrenceIds=[],times=[];
  for(const key of ['public',...h.ids.map(id=>'p-'+id)]){
    const all=(await events(h,key)).map(v=>v.event),batch=all.filter(e=>e.fact.phaseId===phase.phase.id);
    const removed=batch.filter(e=>e.fact.type==='HOSPITAL_OVERFLOW_REMOVED');
    assert.deepEqual(removed.map(e=>e.fact.seatId),[...ids].sort());
    assert.equal(batch.filter(e=>e.fact.type==='MEDICAL_OUTCOME'&&ids.includes(e.fact.seatId)).length,0,'Denied candidates emit neither medical INJURY nor DEATH/anchor');
    for(const e of removed){
      FullOutcomeEventSchema.parse(e);assert.deepEqual(e.fact,{type:'HOSPITAL_OVERFLOW_REMOVED',phaseId:phase.phase.id,round:5,seatId:e.fact.seatId});
      assert.deepEqual(e.versions,PINS);assert.equal(e.outcomeId,e.eventId);assert.match(e.eventId,/^[a-f0-9]{64}$/);
      assert.equal(e.expiresAt-e.publishedAt,30000);assert.equal(Object.hasOwn(e.fact,'presentationAnchor'),false);
      assert.doesNotMatch(JSON.stringify(e),/"(?:attackerSeatId|sourceSeatId|grantedBy|commandId|role|faction|medicalEpisodeCount)"/);
      occurrenceIds.push(e.eventId);times.push(e.publishedAt);
    }
  }
  assert.equal(new Set(occurrenceIds).size,occurrenceIds.length);assert.equal(new Set(times).size,1,'Full batch shares one checkpoint publication time');
  assert.ok(state.seats.filter(s=>s.location==='Hospital').every(s=>/^H[1-4]$/.test(s.slotId)));
  return {state,views};
}
for(const n of [7,8,9]){
  test(`${n}: native admission/preparation pins Hospital4 across compatible-binary restart with historical creation/art defaults`,async()=>{
    let now=1900000000000,draws=0,shuffles=0;
    const options={db,clock:()=>now,creationVersions:PINS,assetManifestVersion:ART,historicalAssetManifestVersion:'v1-preview-469bf64fe98cac5a',
      shuffle:items=>{shuffles++;return [...items];},randomInitialRoom:()=>assert.fail('Joint draw only'),
      randomStartingRoomRank:maximum=>{assert.ok(maximum>0);draws++;assert.equal(shuffles,0);return 0;}};
    const service=createV1Service(options),host=await createEmulatorIdentity();
    const created=op(await service.createMatch(host.uid,{protocolVersion:2,requestId:randomUUID(),playerCount:n}));
    const base=db.collection('matches').doc(created.matchId),ids=Array.from({length:n},(_,i)=>`seat-${i+1}`),players=await Promise.all(ids.map(()=>createEmulatorIdentity()));
    const request=(fields={})=>({protocolVersion:2,matchId:base.id,requestId:randomUUID(),...fields});
    for(const id of [...ids].reverse()){
      const a=op(await service.requestAdmission(players[Number(id.slice(5))-1].uid,{protocolVersion:2,requestId:randomUUID(),roomCode:created.roomCode}));
      op(await service.approveAdmission(host.uid,request({admissionId:a.admissionId,seatId:id})));
      if(id!=='seat-1')assert.equal(draws,0);
    }
    assert.equal(draws,1);assert.equal(shuffles,0);
    const h={base,service,options,host,players,ids,pins:PINS,request,uid:id=>players[Number(id.slice(5))-1].uid,now:()=>now,
      setTime:v=>{assert.ok(v>=now);now=v;},current:async()=>decodeV1State((await base.collection('engine').doc('current').get()).data())};
    await beginStagedSetup(h);await confirmStagedChoices(h);
    const prepared=(await base.collection('setup').doc('deal').get()).data();assert.deepEqual(prepared.versions,{...PINS,assetManifestVersion:ART});
    const bad=FullReadyForMatchResponseSchema.parse(await service.readyForMatch(h.uid('seat-1'),setupRequest(h,{dealId:prepared.dealId,bindingRevision:1,
      acceptedVersions:{...OLD,assetManifestVersion:'design-0.4.0'}})));
    assert.equal(bad.ok,false);assert.equal(bad.error.code,'UNSUPPORTED_PROTOCOL');assert.ok((await setupDocument(h)).seats.every(s=>!s.ready));
    h.service=createV1Service({...options,creationVersions:OLD,assetManifestVersion:'design-0.4.0'});await completeStagedSetup(h);
    const started=await h.current();assert.deepEqual(started.versions,prepared.versions);assert.equal(draws,1);
    assert.deepEqual((await base.collection('setup').doc('deal').get()).data(),prepared);
    assert.ok(started.seats.every(s=>s.hospitalOverflow===null));assert.ok(started.seats.every(s=>s.location!=='Hospital'));
    assert.deepEqual((await base.collection('engine').doc('gameplayPins').get()).data(),PINS);
    await assertBoardJournal(h);
  });
  test(label(n,'untrusted clients cannot write removal authority, provenance or another private view'),async()=>{
    const h=await fixture(n),before=await h.current();
    for(const identity of[h.players[0],h.host,h.display,h.outsider]){
      assert.equal((await firestoreRequest(h.base.path+'/engine/current',{idToken:identity.idToken})).status,403);
      assert.equal((await firestoreRequest(h.base.path+'/audienceEvents/public/items/forged',{idToken:identity.idToken,method:'PATCH',data:{fact:{type:'HOSPITAL_OVERFLOW_REMOVED',seatId:'seat-1'}}})).status,403);
    }
    for(const identity of[h.players[0],h.host,h.display,h.outsider])assert.equal((await firestoreRequest(h.base.path+'/playerViews/'+h.uid('seat-6'),{idToken:identity.idToken})).status,403);
    assert.equal((await firestoreRequest(h.base.path+'/playerViews/'+h.uid('seat-6'),{idToken:h.players[5].idToken})).status,200);
    const attempted=FullCommandResponseSchema.parse(await h.service.submit(h.uid('seat-1'),body(h,before,{type:'HOSPITAL_OVERFLOW_REMOVED',seatId:'seat-2'})));
    assert.equal(attempted.ok,false);assert.equal(attempted.error.code,'INVALID_REQUEST');assert.deepEqual(await h.current(),before);
    await assertBoardJournal(h);
  });
  test(label(n,'same-batch Rescue cancels new injury; lower-number second-hit body wins last bed over earlier higher living victim'),async()=>{
    const h=await fixture(n),{phase,afterFour}=await showdownHistory(h,{rescueFresh:true});
    assert.equal(seat(afterFour,'seat-1').health,'Healthy');assert.equal(seat(afterFour,'seat-1').hospitalOverflow,null);
    assert.deepEqual(phase.seats.filter(s=>s.location==='Hospital').map(s=>s.slotId),['H1','H2','H3']);
    await h.accept('seat-1',{type:'SHOWDOWN_SHOT',targetSeatId:'seat-6'});
    await h.accept('seat-3',{type:'SHOWDOWN_SHOT',targetSeatId:'seat-1'});
    await h.accept('seat-6',{type:'SHOWDOWN_SHOT',targetSeatId:'seat-1'});
    const completed=await closeOnce(h,phase);assert.equal(seat(completed,'seat-1').health,'Eliminated');
    assert.equal(seat(completed,'seat-1').location,'Hospital');assert.equal(seat(completed,'seat-1').slotId,'H4');
    assert.equal(seat(completed,'seat-1').hospitalOverflow,null);await assertOverflow(h,phase,['seat-6']);
    assert.deepEqual(completed.result,{winner:'Blue',alienCoWinner:true});await assertBoardJournal(h);
  });
  test(label(n,'four retained bodies force permanent removal, preserve registered actions and recover lost receipts once'),async()=>{
    const h=await fixture(n),{phase,supply}=await showdownHistory(h),request=body(h,phase,{type:'SHOWDOWN_SHOT',targetSeatId:'seat-6'});
    const before=await h.current();for(const identity of[h.host,h.display,h.outsider]){
      const denied=FullCommandResponseSchema.parse(await h.service.submit(identity.uid,request));assert.equal(denied.ok,false);assert.equal(denied.error.code,'FORBIDDEN');
    }
    assert.deepEqual(await h.current(),before);
    const copies=await Promise.all([1,2,3].map(()=>submit(h,'seat-3',request)));assert.ok(copies.every(r=>r.ok&&r.receipt.status==='accepted'));assert.deepEqual(copies[1].receipt,copies[0].receipt);
    const conflict=await submit(h,'seat-3',{...request,command:{type:'SHOWDOWN_SHOT',targetSeatId:'seat-7'}});assert.equal(conflict.ok,false);assert.equal(conflict.error.code,'COMMAND_ID_CONFLICT');
    const later=await h.accept('seat-6',{type:'SHOWDOWN_SHOT',targetSeatId:'seat-3'});
    await closeOnce(h,phase);const {state}=await assertOverflow(h,phase,['seat-3','seat-6']);
    assert.deepEqual(state.supplierGrantResults.find(r=>r.commandId===supply.request.commandId).successfulRecipientSeatIds,['seat-1','seat-3'],'Grant history is not rewritten after recipient overflow');
    h.service=createV1Service(h.options);
    for(const [actor,r]of[['seat-3',{request,receipt:copies[0].receipt}],['seat-6',later]]){
      const recovered=FullLookupResponseSchema.parse(await h.service.lookup(h.uid(actor),{protocolVersion:2,matchId:h.base.id,commandId:r.request.commandId}));
      assert.equal(recovered.status,'found');assert.deepEqual(recovered.receipt,r.receipt);assert.deepEqual((await submit(h,actor,r.request)).receipt,r.receipt);
      assert.equal((await h.send(actor,{type:'SHOWDOWN_SHOT',targetSeatId:'seat-7'})).receipt.code,'PHASE_CLOSED');
    }
    const occurrence=(await events(h)).find(v=>v.event.fact.type==='HOSPITAL_OVERFLOW_REMOVED');
    for(const identity of[h.players[0],h.host,h.display])assert.equal((await firestoreRequest(h.base.path+'/audienceEvents/public/items/'+occurrence.id,{idToken:identity.idToken})).status,200);
    assert.equal((await firestoreRequest(h.base.path+'/audienceEvents/public/items/'+occurrence.id,{idToken:h.outsider.idToken})).status,403);
    assert.equal((await firestoreEventQuery(h.base.id,'p-seat-3',h.players[2],'seat-3')).status,200);
    for(const identity of[h.players[0],h.host,h.display,h.outsider])assert.equal((await firestoreEventQuery(h.base.id,'p-seat-3',identity,'seat-3')).status,403);
    const eventBefore=await events(h);assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline(deadlinePayload(phase))).result,'unchanged');assert.deepEqual(await events(h),eventBefore);
    for(const id of['seat-3','seat-6'])assert.equal(seat(state,id).medicalEpisode,null,'Committed removal cannot become Rescue-eligible again');
    await assertBoardJournal(h);
  });
  test(label(n,'stored 1.10 preserves roster-sized fifth/sixth Hospital positions and emits no successor removal'),async()=>{
    const h=await fixture(n,OLD),{phase}=await showdownHistory(h);
    await h.accept('seat-3',{type:'SHOWDOWN_SHOT',targetSeatId:'seat-6'});await h.accept('seat-6',{type:'SHOWDOWN_SHOT',targetSeatId:'seat-3'});
    await h.expire();const s=await h.current();assert.equal(s.phase.kind,'FINISHED');
    assert.equal(seat(s,'seat-3').health,'Injured');assert.equal(seat(s,'seat-3').slotId,'H5');
    assert.equal(seat(s,'seat-6').health,'Injured');assert.equal(seat(s,'seat-6').slotId,'H6');
    assert.ok(s.seats.every(v=>!Object.hasOwn(v,'hospitalOverflow')));assert.equal((await events(h)).filter(v=>v.event.fact.type==='HOSPITAL_OVERFLOW_REMOVED').length,0);
    assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline(deadlinePayload(phase))).result,'unchanged');await assertBoardJournal(h);
  });
}

for(const n of [7,8,9])test(label(n,'frozen block recipients use actual logical effect-time rooms, preserving exact old immediate transfers'),async()=>{
  for(const pins of[PINS,OLD]){
    const h=await fixture(n,pins),{checkpoint,afterFour}=await showdownHistory(h,{protectTarget:true,rescueFresh:true,stopAfterFour:true});
    assert.equal(seat(afterFour,'seat-2').location,'Hospital');assert.equal(seat(afterFour,'seat-1').health,'Healthy');
    const expected=pins.engineVersion===PINS.engineVersion?['seat-1','seat-2','seat-3','seat-4','seat-5']:['seat-1','seat-3','seat-4','seat-5'];
    const ids=[],times=[];
    assert.equal((await events(h)).filter(v=>v.event.fact.type==='ATTACK_BLOCKED').length,0,'Shared display receives no room block');
    for(const viewer of h.ids){
      const blocks=(await events(h,'p-'+viewer)).map(v=>v.event).filter(e=>e.fact.type==='ATTACK_BLOCKED'&&e.fact.phaseId===checkpoint.phase.id);
      assert.equal(blocks.length,expected.includes(viewer)?1:0,`${pins.engineVersion}/${viewer} follows frozen source membership, not final Hospital/A placement`);
      for(const e of blocks){
        assert.deepEqual(e.fact,{type:'ATTACK_BLOCKED',phaseId:checkpoint.phase.id,round:4,seatId:'seat-4',location:'Room A',slotId:'A4'});
        assert.deepEqual(e.versions,pins);assert.equal(e.expiresAt-e.publishedAt,30000);assert.match(e.eventId,/^[a-f0-9]{64}$/);
        assert.doesNotMatch(JSON.stringify(e.fact),/attacker|grantedBy|sourceSeatId|commandId|role|faction|cause/);ids.push(e.eventId);times.push(e.publishedAt);
      }
    }
    assert.equal(new Set(ids).size,ids.length);assert.equal(new Set(times).size,1);
    assert.equal((await firestoreEventQuery(h.base.id,'p-seat-2',h.players[1],'seat-2')).status,200);
    for(const identity of[h.players[5],h.host,h.display,h.outsider])assert.equal((await firestoreEventQuery(h.base.id,'p-seat-2',identity,'seat-2')).status,403);
    const previous=await events(h,'p-seat-2');assert.equal(FullAdvanceResponseSchema.parse(await h.service.runDeadline(deadlinePayload(checkpoint))).result,'unchanged');
    assert.deepEqual(await events(h,'p-seat-2'),previous,'Stale retry never recomputes recipients or republishes films');
    await assertBoardJournal(h);
  }
});
