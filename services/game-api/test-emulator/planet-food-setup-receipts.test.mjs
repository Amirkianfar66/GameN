import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {before,after,test} from 'node:test';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {createFirestorePlanetStore} from '../dist/planet-store.js';
import {planetServiceHarness,digest,ok,denied} from '../test/planet-service-helper.mjs';
import {assertLocalEmulators} from '../../../infra/firebase/test/helpers.mjs';

// Genuine SDK persistence with injected service-fixture time. Normal operations
// build the match; no game state is seeded. Lost-ACK causality is covered by the
// separate service regressions. This file captures an actual successful Ready
// response and verifies that its durable replay survives the Food handoff.
// These are not real-time native-client acceptance journeys.
let app,db;
before(()=>{
  assertLocalEmulators();
  app=initializeApp({projectId:'demo-mothership'},'food-setup-receipts-'+randomUUID());
  db=getFirestore(app);
});
after(async()=>{await db?.terminate();if(app)await deleteApp(app);});
const operationKey=(uid,requestId)=>'operation/'+digest([uid,requestId]);

async function scopedMetadataKeys(h,namespace){
  const heads=await db.collection('planetDocuments').where('namespace','==',namespace).select('key').get();
  return heads.docs.map(doc=>doc.get('key')).filter(key=>typeof key==='string'&&key.startsWith(namespace+'/'+h.matchId+'/')).sort();
}

async function authorityStamp(h,ready,bots){
  const observed=await h.store.readOnly(async tx=>{
    const session=await tx.get('session/'+h.matchId);
    const keys=[operationKey(ready.uid,ready.request.requestId),operationKey(bots.uid,bots.request.requestId),
      'foodIngressControl/'+h.matchId,'foodPrefixWorker/'+h.matchId,'foodContact/'+h.matchId,
      'rate/'+digest(ready.uid),'rate/'+digest(h.host),
      'foodTransportRate/'+digest([ready.uid,'control']),'foodTransportRate/'+digest([h.host,'control'])];
    const records=await Promise.all(keys.map(key=>tx.get(key)));
    return {sessionHash:digest(session),journalSequence:session.journalSequence,recordsHash:digest(records)};
  });
  // Keep failures focused on technical hashes/counts rather than dumping a full
  // private synthetic match, its roles, recovery tokens or saved journal bodies.
  const journal=await scopedMetadataKeys(h,'journal'),ingress=await scopedMetadataKeys(h,'foodIngress');
  return {...observed,journalKeysHash:digest(journal),journalRows:journal.length,
    ingressKeysHash:digest(ingress),ingressRows:ingress.length};
}

for(const count of [7,8,9])test(`${count}: Firestore setup receipts retain original responses and UID authorization after Food initialization`,{timeout:60000},async()=>{
  const h=await planetServiceHarness({count,humans:2,store:createFirestorePlanetStore(db),
    setupFlowVersion:3,engineProfile:'food-task-1.4',assetManifestVersion:'design-0.9.0'});
  const botsRequest={operation:'setBots',matchId:h.matchId,requestId:h.nextId(),count:count-h.players.length};
  const botsResponse=await h.service.handle(h.host,botsRequest);ok(botsResponse);
  const bots={uid:h.host,request:botsRequest,response:botsResponse};
  ok(await h.operation(h.host,'beginSetup',{matchId:h.matchId}));await h.deadline();
  const reading=await h.current();assert.equal(reading.status,'reading');h.setTime(reading.setup.endsAt);
  ok(await h.operation(h.players[0],'ready',{matchId:h.matchId}));
  const readyRequest={operation:'ready',matchId:h.matchId,requestId:h.nextId()},readyUid=h.players[1];
  const readyResponse=await h.service.handle(readyUid,readyRequest);ok(readyResponse);
  const ready={uid:readyUid,request:readyRequest,response:readyResponse};
  const original=await h.store.readOnly(tx=>tx.get(operationKey(readyUid,readyRequest.requestId)));
  assert.ok(original);assert.deepEqual(original.response,readyResponse,'The successful SDK commit contains the original Ready response');
  const boarding=await h.current();assert.equal(boarding.status,'boarding');assert.equal(boarding.state,null);
  const boardingJob=await h.currentJob();h.setTime(boarding.setup.endsAt+1000);
  assert.equal((await h.service.runDeadline(boardingJob)).status,'advanced');
  const running=await h.current();assert.equal(running.status,'running');assert.ok(running.state);
  assert.equal(running.versions.engineVersion,'planet-game-1.4.0');
  assert.ok(h.now()>readyResponse.serverTimeMs);
  h.reload();

  const before=await authorityStamp(h,ready,bots),draws=h.draws();
  assert.deepEqual(await h.service.handle(ready.uid,ready.request),ready.response,
    'A fresh service recovers the exact pre-Food Ready response and original server time');
  assert.deepEqual(await h.service.handle(bots.uid,bots.request),bots.response);
  denied(await h.service.handle(bots.uid,{...bots.request,count:bots.request.count-1}),'REQUEST_ID_CONFLICT');
  denied(await h.service.handle(ready.uid,{...ready.request,requestId:h.nextId()}),'NOT_ALLOWED');
  denied(await h.service.handle(h.players[0],ready.request),'NOT_ALLOWED');
  assert.equal(h.draws(),draws);assert.deepEqual(await authorityStamp(h,ready,bots),before,
    'Captured Session, receipt, rate, ownership, journal and ingress evidence remains unchanged');

  const seatId=running.members.find(member=>member.uid===ready.uid).seatId;
  const issued=ok(await h.operation(h.host,'issueRecovery',{matchId:h.matchId,seatId})),replacementUid=h.nextId();
  ok(await h.operation(replacementUid,'redeemRecovery',{matchId:h.matchId,recoveryCode:issued.recoveryCode}));
  h.reload();
  const recovered=await h.current();assert.equal(recovered.members.find(member=>member.seatId===seatId).uid,replacementUid);
  assert.equal(recovered.members.some(member=>member.uid===ready.uid),false);
  const beforeDenials=await authorityStamp(h,ready,bots),drawsAfterRecovery=h.draws();
  denied(await h.service.handle(ready.uid,ready.request),'FORBIDDEN');
  denied(await h.service.handle(replacementUid,ready.request),'NOT_ALLOWED');
  assert.equal(h.draws(),drawsAfterRecovery);assert.deepEqual(await authorityStamp(h,ready,bots),beforeDenials);
  const retained=await h.store.readOnly(tx=>tx.get(operationKey(ready.uid,ready.request.requestId)));
  assert.deepEqual(retained.response,ready.response,'UID revocation neither deletes nor transfers the original operation receipt');
});
