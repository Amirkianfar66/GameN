// Exact1.8 Auth/Firestore transactions. Native staged setup is explicit; other
// fixtures start from one legal synthetic initial SETUP then real service commands.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { CAPTAIN_OUTCOMES_FULL_GAME_VERSION_PINS as PINS,
  BOARD_MEDICAL_FULL_GAME_VERSION_PINS as OLD, projectFullGame } from '@mothership/engine';
import { FullCommandResponseSchema, FullEventSchema, FullOperationResponseSchema, FullPlayerViewSchema } from '@mothership/contracts';
import { createV1Service } from '../dist/index.js';
import { decodeV1State } from '../dist/full-game.js';
import { assertLocalEmulators, createEmulatorIdentity, firestoreRequest } from '../../../infra/firebase/test/helpers.mjs';
import { startStagedMatch } from './staged-start-helper.mjs';
import { boardMedicalFixture, assertBoardJournal, assertStoredBoard, retryUnavailable, deadlinePayload } from './board-medical-helper.mjs';
let app,db;
before(()=>{assertLocalEmulators();app=initializeApp({projectId:'demo-mothership'},`captain-${randomUUID()}`);db=getFirestore(app);});
after(async()=>{await db?.terminate();if(app)await deleteApp(app);});
const seat=(state,id)=>state.seats.find(s=>s.seatId===id);
const fixture=count=>boardMedicalFixture(db,count,{pins:PINS});
const events=async(h,key='public')=>(await h.base.collection('audienceEvents').doc(key).collection('items').get()).docs.map(d=>FullEventSchema.parse(d.data()));
const outcomes=async(h,type,key='public')=>(await events(h,key)).filter(e=>e.fact.type===type);
async function vote(h,round,kind,target) {
  const state=await h.until(s=>s.round===round && s.phase.kind===kind);
  for(const id of state.eligibleVoters) await h.accept(id,{type:'VOTE',targetSeatId:target});
  const result=await h.expire();assert.equal(result.phase.kind,'VOTE_RESULT');return result;
}
async function commandRoom(h,round=2) {
  await vote(h,round,'CAPTAIN_ELECTION','seat-1');await h.expire();return h.turn('seat-1',round);
}
const op=value=>{const r=FullOperationResponseSchema.parse(value);assert.equal(r.ok,true,JSON.stringify(r));return r.result;};
for(const count of [7,8,9]) {
  test(`${count}: native admission/joint rooms/staged setup pins1.8 without changing recreated-service defaults`,async()=>{
    let now=1_900_000_000_000;
    const options={db,clock:()=>now,creationVersions:PINS,assetManifestVersion:'captain-native-assets-fixture',
      shuffle:items=>[...items],randomStartingRoomRank:()=>0,randomInitialRoom:()=>assert.fail('Joint draw required')};
    const service=createV1Service(options),host=await createEmulatorIdentity();
    const created=op(await service.createMatch(host.uid,{protocolVersion:2,requestId:randomUUID(),playerCount:count}));
    const base=db.collection('matches').doc(created.matchId),players=await Promise.all(Array.from({length:count},()=>createEmulatorIdentity()));
    const ids=players.map((_,i)=>`seat-${i+1}`),request=(fields={})=>({protocolVersion:2,matchId:base.id,requestId:randomUUID(),...fields});
    for(const [i,player] of players.entries()) {
      const admission=op(await service.requestAdmission(player.uid,{protocolVersion:2,requestId:randomUUID(),roomCode:created.roomCode}));
      op(await service.approveAdmission(host.uid,request({admissionId:admission.admissionId,seatId:ids[i]})));
    }
    const h={base,service,options,host,players,ids,pins:PINS,request,now:()=>now,setTime:v=>{assert.ok(v>=now);now=v;},
      current:async()=>decodeV1State((await base.collection('engine').doc('current').get()).data())};
    await startStagedMatch(h);const state=await h.current();
    assert.equal(state.versions.engineVersion,'full-game-1.8.0');assert.deepEqual(state.captainPowersUsed,{releaseUsed:false,ejectUsed:false});
    assert.equal(state.pendingCaptainReveal,null);assert.equal(state.pendingEjectStage,null);assert.deepEqual(state.outcomes,[]);
    h.service=createV1Service({...options,creationVersions:OLD});
    const player=players[Number(state.activeSeatId.slice(5))-1];
    const response=FullCommandResponseSchema.parse(await retryUnavailable(()=>h.service.submit(player.uid,{protocolVersion:2,matchId:base.id,
      phaseId:state.phase.id,commandId:randomUUID(),command:{type:'PASS_TURN'}})));
    assert.equal(response.receipt.status,'accepted');await assertStoredBoard(h);await assertBoardJournal(h);
  });
  test(`${count}: RELEASE is native own-turn/Command all-prisoner return and independent once resource`,async()=>{
    const h=await fixture(count);await vote(h,1,'JAIL_VOTE','seat-4');await h.expire();await commandRoom(h);
    const before=await h.current(),resources=seat(before,'seat-1');
    const other=await h.send('seat-2',{type:'CAPTAIN_RELEASE'});assert.equal(other.receipt.status,'rejected');
    const accepted=await h.accept('seat-1',{type:'CAPTAIN_RELEASE'});const state=await h.current();
    assert.equal(seat(state,'seat-4').location,'Room A');assert.equal(seat(state,'seat-4').jailed,false);
    assert.equal(seat(state,'seat-4').movedInRound,false);assert.equal(seat(state,'seat-1').mainActionUsedRound,resources.mainActionUsedRound);
    assert.deepEqual(state.captainPowersUsed,{releaseUsed:true,ejectUsed:false});
    const blocked=await h.send('seat-1',{type:'CAPTAIN_EJECT'});assert.equal(blocked.receipt.status,'rejected');
    assert.deepEqual((await h.current()).captainPowersUsed,state.captainPowersUsed);
    const movie=await outcomes(h,'CAPTAIN_OUTCOME');assert.equal(movie.length,1);assert.deepEqual(movie[0].fact.seatIds,['seat-4']);
    assert.equal(movie[0].fact.kind,'RELEASE');assert.equal(movie[0].expiresAt-movie[0].publishedAt,30_000);
    assert.equal(movie[0].outcomeId,movie[0].eventId);
    const restored=createV1Service(h.options);await h.expire();
    const retry=FullCommandResponseSchema.parse(await restored.submit(h.uid('seat-1'),accepted.request));assert.deepEqual(retry.receipt,accepted.receipt);
    assert.equal((await outcomes(h,'CAPTAIN_OUTCOME')).length,1);await assertBoardJournal(h);
  });
  test(`${count}: concurrent EJECT commits once, nulls retained placement, defers reveal, replays exact receipt across phases`,async()=>{
    const h=await fixture(count);await vote(h,1,'JAIL_VOTE','seat-4');await h.expire();await commandRoom(h);
    const before=await h.current(),requests=[1,2].map(()=>({protocolVersion:2,matchId:h.base.id,phaseId:before.phase.id,commandId:randomUUID(),command:{type:'CAPTAIN_EJECT'}}));
    const responses=await Promise.all(requests.map(request=>retryUnavailable(()=>h.service.submit(h.uid('seat-1'),request))));
    assert.deepEqual(responses.map(r=>r.receipt.status).sort(),['accepted','rejected']);
    const winner=responses.findIndex(r=>r.receipt.status==='accepted'),state=await h.current(),victim=seat(state,'seat-4');
    assert.equal(victim.location,null);assert.equal(victim.slotId,null);assert.equal(victim.health,'Eliminated');assert.equal(victim.jailed,false);
    assert.equal(victim.medicalEpisode,null);assert.ok(state.code.includes('seat-4')===before.code.includes('seat-4'));
    const views=projectFullGame(state);assert.equal(seat(views.public,'seat-4').revealedFaction,null);
    assert.deepEqual(views.players['seat-1'].self.captainCommandUses,{releaseUsed:false,ejectUsed:true});
    for(const id of h.ids.filter(id=>id!=='seat-1'))assert.equal(views.players[id].self.captainCommandUses,null);
    assert.equal(state.result,null);assert.equal((await outcomes(h,'CAPTAIN_OUTCOME')).length,1);
    assert.equal((await outcomes(h,'BOARD_PLACEMENT_CHANGED')).filter(e=>e.fact.seatId==='seat-4' && e.fact.location===null).length,1);
    assert.ok(!(await events(h)).some(e=>e.fact.type==='PUBLIC_MOVE' && e.fact.location===null));
    const reconnect=createV1Service(h.options);await h.expire();
    const recovered=await reconnect.submit(h.uid('seat-1'),requests[winner]);assert.deepEqual(recovered.receipt,responses[winner].receipt);
    const conflicting=await reconnect.submit(h.uid('seat-1'),{...requests[winner],command:{type:'CAPTAIN_RELEASE'}});assert.equal(conflicting.error.code,'COMMAND_ID_CONFLICT');
    const after=await h.finishRound(2);assert.equal(after.pendingCaptainReveal,null);assert.equal(after.pendingEjectStage,null);
    assert.equal(seat(projectFullGame(after).public,'seat-4').revealedFaction,'Blue');assert.equal(seat(after,'seat-4').location,null);
    const denied=await firestoreRequest(`${h.base.path}/playerViews/${h.players[0].uid}`,{idToken:h.outsider.idToken});assert.equal(denied.status,403);
    assert.equal((await outcomes(h,'CAPTAIN_OUTCOME')).length,1);await assertBoardJournal(h);
  });
  test(`${count}: transient injury then same-batch Rescue publishes two cause-free clinical outcomes despite final Healthy snapshot`,async()=>{
    const h=await fixture(count);await h.turn('seat-2',1);await h.accept('seat-2',{type:'RESCUE',targetSeatId:'seat-4'});
    await h.turn('seat-3',1);await h.accept('seat-3',{type:'DISABLE',targetSeatId:'seat-4'});
    await h.finishRound(1);const state=await h.current();assert.equal(seat(state,'seat-4').health,'Healthy');assert.equal(seat(state,'seat-4').medicalEpisodeCount,1);
    const clinical=await outcomes(h,'MEDICAL_OUTCOME');assert.deepEqual(clinical.map(e=>e.fact.kind),['INJURY','HEALED']);
    assert.deepEqual(clinical[0].fact.presentationAnchor,clinical[1].fact.presentationAnchor);
    assert.deepEqual(clinical[0].fact.presentationAnchor,{kind:'CLINICAL_VIGNETTE',batchId:clinical[0].fact.presentationAnchor.batchId,anchorId:'HV1',slotCount:count});
    assert.match(clinical[0].fact.presentationAnchor.batchId,/^[a-f0-9]{64}$/);
    for(const id of h.ids) {const own=await outcomes(h,'MEDICAL_OUTCOME',`p-${id}`);assert.deepEqual(own.map(e=>e.fact.presentationAnchor.anchorId),['HV1','HV1']);assert.notEqual(own[0].fact.presentationAnchor.batchId,clinical[0].fact.presentationAnchor.batchId);}
    assert.deepEqual(clinical.map(e=>e.fact.health),['Injured','Healthy']);assert.equal(clinical[0].publishedAt,clinical[1].publishedAt);
    assert.doesNotMatch(JSON.stringify(clinical),/attacker|healer|giver|sourceSeat|role|cause|commandId|actorSeat/);
    const reader=FullPlayerViewSchema.parse((await h.base.collection('playerViews').doc(h.players[3].uid).get()).data());
    assert.equal(seat(reader,'seat-4').medical,null);
    const payload=deadlinePayload(h.initial);const retry=await h.service.runDeadline(payload);assert.equal(retry.result,'unchanged');
    assert.equal((await outcomes(h,'MEDICAL_OUTCOME')).length,2);await assertBoardJournal(h);
  });
  test(`${count}: abort after EJECT preserves neutral offboard facts and private pending evidence without early reveal/victory`,async()=>{
    const h=await fixture(count);await vote(h,1,'JAIL_VOTE','seat-4');await h.expire();await commandRoom(h);await h.accept('seat-1',{type:'CAPTAIN_EJECT'});
    const result=op(await h.service.abortMatch(h.host.uid,h.request()));assert.equal(result.aborted,true);
    const state=await h.current();assert.equal(state.phase.kind,'ABORTED');assert.equal(state.result,null);
    assert.equal(seat(projectFullGame(state).public,'seat-4').revealedFaction,null);assert.ok(state.pendingEjectStage);
    assert.equal((await outcomes(h,'CAPTAIN_OUTCOME')).length,1);await assertBoardJournal(h);
  });
  test(`${count}: historical1.7 rejects new Captain commands and publishes no new fields or event envelopes`,async()=>{
    const h=await boardMedicalFixture(db,count,{pins:OLD});const rejected=await h.send('seat-1',{type:'CAPTAIN_RELEASE'});assert.equal(rejected.receipt.status,'rejected');
    const state=await h.current();assert.equal(Object.hasOwn(state,'captainPowersUsed'),false);assert.equal(Object.hasOwn(state,'outcomes'),false);
    for(const view of Object.values(projectFullGame(state).players))assert.equal(Object.hasOwn(view.self,'captainCommandUses'),false);
    await h.finishRound(1);for(const e of await events(h))assert.equal(Object.hasOwn(e,'versions'),false);await assertBoardJournal(h);
  });
}
