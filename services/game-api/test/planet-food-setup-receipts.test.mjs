import assert from 'node:assert/strict';
import {test} from 'node:test';
import {CrewCharacterIdSchema,FOOD_TASK_TRANSPORT} from '@mothership/contracts';
import {planetServiceHarness,memoryPlanetStore,digest,ok,denied} from './planet-service-helper.mjs';

// Causal service regressions with injected fixture time and acknowledgement loss.
// All setup, boarding and recovery transitions use normal service operations.
// These are not native-client or real-time connected acceptance journeys.
const clone=value=>structuredClone(value);
const operationKey=(uid,requestId)=>'operation/'+digest([uid,requestId]);
const genericRateKey=uid=>'rate/'+digest(uid);
const foodRateKey=uid=>'foodTransportRate/'+digest([uid,'control']);
const withoutKey=(records,key)=>records.filter(([name])=>name!==key);

/** Snapshot reads are detached from the serialized writer queue so a deliberately
 * paused old observation cannot block the normal transition being tested.
 */
function snapshotStore(){
  const base=memoryPlanetStore();let paused=null;
  return {...base,
    readOnly:async operation=>{
      const snapshot=new Map(base.export()),reads=[];
      const result=await operation(Object.freeze({get:async key=>{
        reads.push(key);return clone(snapshot.get(key)??null);
      }}));
      if(paused&&reads.includes(paused.key)){
        const gate=paused;paused=null;gate.enter();await gate.wait;
      }
      return result;
    },
    pauseNextRead(key){
      assert.equal(paused,null,'Only one causal read gate is armed');
      let enter,resume;
      const reached=new Promise(resolve=>{enter=resolve;}),wait=new Promise(resolve=>{resume=resolve;});
      paused={key,enter,wait};return {reached,resume};
    },
  };
}

async function boardingWithLostReady(count){
  const store=snapshotStore();
  const h=await planetServiceHarness({count,humans:2,store,setupFlowVersion:3,
    engineProfile:'food-task-1.4',assetManifestVersion:'design-0.9.0'});
  const accepted=[];
  const capture=async(uid,operation,fields={})=>{
    const request={operation,matchId:h.matchId,requestId:h.nextId(),...fields};
    const response=await h.service.handle(uid,request);ok(response);
    const stored=new Map(store.export()).get(operationKey(uid,request.requestId));
    assert.ok(stored);assert.deepEqual(stored.response,response,'The original setup response is durably stored');
    const record={uid,request,response};accepted.push(record);return record;
  };
  const display=await h.admission(h.display,'display','ReceiptTable');
  await capture(h.host,'approveAdmission',{admissionId:display.admissionId});
  const bots=await capture(h.host,'setBots',{count:count-h.players.length});
  await capture(h.host,'beginSetup');
  await capture(h.players[0],'chooseCharacter',{characterId:CrewCharacterIdSchema.options[0]});
  await h.deadline();
  const reading=await h.current();assert.equal(reading.status,'reading');
  h.setTime(reading.setup.endsAt);
  ok(await h.operation(h.players[0],'ready',{matchId:h.matchId}));
  const readyRequest={operation:'ready',matchId:h.matchId,requestId:h.nextId()},readyUid=h.players[1];
  store.loseNextAcknowledgement('operation/');
  denied(await h.service.handle(readyUid,readyRequest),'UNAVAILABLE');
  const original=new Map(store.export()).get(operationKey(readyUid,readyRequest.requestId));
  assert.ok(original,'The lost acknowledgement follows a durably committed Ready receipt');
  ok(original.response);
  const ready={uid:readyUid,request:readyRequest,response:clone(original.response)};accepted.push(ready);
  const boarding=await h.current();assert.equal(boarding.status,'boarding');assert.equal(boarding.state,null);
  assert.ok(boarding.members.every(member=>member.ready));
  return {h,store,accepted,bots,ready,boarding};
}

async function initializeFood(fixture){
  const {h,boarding}=fixture,job=await h.currentJob();
  h.setTime(boarding.setup.endsAt+1000);
  assert.equal((await h.service.runDeadline(job)).status,'advanced');
  const current=await h.current();assert.equal(current.status,'running');assert.ok(current.state);
  assert.equal(current.versions.engineVersion,'planet-game-1.4.0');
  return current;
}

async function replaceReadyMember(fixture){
  const {h,ready}=fixture;
  const seatId=(await h.current()).members.find(member=>member.uid===ready.uid).seatId;
  const issued=ok(await h.operation(h.host,'issueRecovery',{matchId:h.matchId,seatId}));
  const replacementUid=h.nextId();
  ok(await h.operation(replacementUid,'redeemRecovery',{matchId:h.matchId,recoveryCode:issued.recoveryCode}));
  const current=await h.current();
  assert.equal(current.members.find(member=>member.seatId===seatId).uid,replacementUid);
  assert.equal(current.members.some(member=>member.uid===ready.uid),false);
  assert.equal(current.displays.includes(ready.uid),false);
  return replacementUid;
}

for(const count of [7,8,9]){
  test(`${count}: lost final Ready and all five setup receipts replay unchanged after Food initialization and restart`,{timeout:10000},async()=>{
    const fixture=await boardingWithLostReady(count),{h,store,accepted,bots,ready}=fixture;
    await initializeFood(fixture);h.reload();
    assert.ok(h.now()>ready.response.serverTimeMs,'Replay occurs after the original Ready time');
    // Only transport counters are constructed for this negative budget control;
    // no game state, role, setup stage or receipt is seeded or modified.
    await store.transaction(async tx=>{
      for(const uid of new Set(accepted.map(record=>record.uid))){
        tx.set(genericRateKey(uid),{since:h.now(),count:120});
        tx.set(foodRateKey(uid),{since:h.now(),count:FOOD_TASK_TRANSPORT.requestsPerMinute.control});
      }
    });
    const before=store.export(),draws=h.draws();
    assert.deepEqual(await h.service.handle(ready.uid,ready.request),ready.response,
      'A committed Ready must retain its original response after the setup-to-Food handoff');
    for(const record of accepted){
      assert.deepEqual(await h.service.handle(record.uid,record.request),record.response);
      denied(await h.service.handle(record.uid,{...record.request,requestId:h.nextId()}),'NOT_ALLOWED');
    }
    denied(await h.service.handle(bots.uid,{...bots.request,count:bots.request.count-1}),'REQUEST_ID_CONFLICT');
    // Another current participant has no original receipt under its own UID.
    denied(await h.service.handle(h.display,ready.request),'NOT_ALLOWED');
    assert.equal(h.draws(),draws,'Receipt recovery samples no new authority context');
    assert.deepEqual(store.export(),before,'Replays and denials change no budget, journal, ingress, lease, wake or game record');
  });

  test(`${count}: setup receipt lookup rejects the revoked UID and does not transfer its receipt to a recovered UID`,{timeout:10000},async()=>{
    const fixture=await boardingWithLostReady(count),{h,store,ready}=fixture;
    await initializeFood(fixture);
    const replacementUid=await replaceReadyMember(fixture);h.reload();
    const before=store.export(),draws=h.draws();
    denied(await h.service.handle(ready.uid,ready.request),'FORBIDDEN');
    // Authorization precedes fingerprint comparison for a revoked identity.
    denied(await h.service.handle(ready.uid,{...ready.request,operation:'setBots',count:0}),'FORBIDDEN');
    denied(await h.service.handle(replacementUid,ready.request),'NOT_ALLOWED');
    assert.equal(h.draws(),draws);assert.deepEqual(store.export(),before);
    assert.deepEqual(new Map(store.export()).get(operationKey(ready.uid,ready.request.requestId)).response,ready.response,
      'The original immutable receipt remains stored without authorizing the old UID');
  });

  test(`${count}: normal abort preserves initialized Food setup receipts without enabling new setup effects`,{timeout:10000},async()=>{
    const fixture=await boardingWithLostReady(count),{h,store,accepted,bots}=fixture;
    await initializeFood(fixture);
    ok(await h.operation(h.host,'abort',{matchId:h.matchId}));h.reload();
    assert.equal((await h.current()).status,'aborted');
    const before=store.export(),draws=h.draws();
    for(const record of accepted){
      assert.deepEqual(await h.service.handle(record.uid,record.request),record.response);
      denied(await h.service.handle(record.uid,{...record.request,requestId:h.nextId()}),'NOT_ALLOWED');
    }
    denied(await h.service.handle(bots.uid,{...bots.request,count:0}),'REQUEST_ID_CONFLICT');
    assert.equal(h.draws(),draws);assert.deepEqual(store.export(),before);
  });
}

test('a stale boarding observation hands an exact Ready retry to the Food receipt route once',{timeout:10000},async()=>{
  const fixture=await boardingWithLostReady(7),{h,store,ready}=fixture;
  const gate=store.pauseNextRead('session/'+h.matchId);
  const pending=h.service.handle(ready.uid,ready.request);await gate.reached;
  let before,draws,rate;
  try{
    await initializeFood(fixture);
    before=store.export();draws=h.draws();rate=new Map(before).get(genericRateKey(ready.uid));assert.ok(rate);
  }finally{gate.resume();}
  assert.deepEqual(await pending,ready.response);
  const after=store.export(),afterRate=new Map(after).get(genericRateKey(ready.uid));
  assert.deepEqual(afterRate,{...rate,count:rate.count+1},'The pre-existing generic handoff performs one rate charge');
  assert.equal(h.draws(),draws+1,'The pre-existing generic path samples one discarded context, not a second game operation');
  assert.deepEqual(withoutKey(after,genericRateKey(ready.uid)),withoutKey(before,genericRateKey(ready.uid)),
    'The handoff creates no duplicate operation, initialization, ingress or ownership wake');
});

test('setup receipt authorization is fresh after an earlier initialized-Food observation',{timeout:10000},async()=>{
  const fixture=await boardingWithLostReady(7),{h,store,ready}=fixture;
  await initializeFood(fixture);
  const gate=store.pauseNextRead('session/'+h.matchId);
  const pending=h.service.handle(ready.uid,ready.request);await gate.reached;
  let before,draws;
  try{
    await replaceReadyMember(fixture);before=store.export();draws=h.draws();
  }finally{gate.resume();}
  denied(await pending,'FORBIDDEN');
  assert.equal(h.draws(),draws);assert.deepEqual(store.export(),before,
    'The captured old binding cannot retrieve its receipt after normal recovery replaces it');
});
