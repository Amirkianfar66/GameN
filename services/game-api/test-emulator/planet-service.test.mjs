import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {before,after,test} from 'node:test';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {CrewCharacterIdSchema} from '@mothership/contracts';
import {createFirestorePlanetStore} from '../dist/planet-store.js';
import {planetServiceHarness,ok,denied} from '../test/planet-service-helper.mjs';
import {assertLocalEmulators} from '../../../infra/firebase/test/helpers.mjs';

// Actual Firestore transactions and JSON chunk persistence, with injected service
// time. Authenticated HTTP/token verification is exercised in the Firebase suite.
let app,db;
before(()=>{assertLocalEmulators();app=initializeApp({projectId:'demo-mothership'},'planet-service-'+randomUUID());db=getFirestore(app);});
after(async()=>{await db?.terminate();if(app)await deleteApp(app);});

for(const count of [7,8,9]){
  test(`${count}: Firestore arbitrates simultaneous character competition, durably restores roles and reconciles duplicate commands after recovery`,async()=>{
    const base=createFirestorePlanetStore(db),errors=[];
    const store={...base,transaction:operation=>base.transaction(operation).catch(error=>{
      // Test-only diagnostic: never include request/state/token payloads.
      errors.push({code:error.code??null,message:String(error.message).slice(0,320)});throw error;
    })};
    const h=await planetServiceHarness({store,count,humans:2});
    ok(await h.operation(h.host,'beginSetup',{matchId:h.matchId}));
    const characterId=CrewCharacterIdSchema.options[0];
    const choices=await Promise.all(h.players.map(uid=>h.operation(uid,'chooseCharacter',{matchId:h.matchId,characterId})));
    assert.equal(choices.filter(r=>r.ok).length,1);denied(choices.find(r=>!r.ok),'NOT_ALLOWED');
    assert.equal((await h.current()).members.filter(m=>m.characterId===characterId).length,1);
    await h.deadline();const own=await h.read(h.players[0]);assert.ok(own.privateRole);
    h.reload();assert.deepEqual((await h.read(h.players[0])).privateRole,own.privateRole);
    for(const uid of h.players)ok(await h.operation(uid,'ready',{matchId:h.matchId}));
    await h.deadline();assert.equal((await h.current()).state.roles['seat-1'],own.privateRole.role);
    await h.deadline();assert.equal((await h.current()).state.activeSeatId,'seat-1');
    const request={protocolVersion:3,matchId:h.matchId,phaseId:(await h.current()).state.phase.id,commandId:'durable-duplicate',command:{type:'PASS_TURN'}};
    const responses=await Promise.all([h.invoke(h.players[0],'command',{request}),h.invoke(h.players[0],'command',{request})]);
    assert.ok(responses.every(r=>r.ok),JSON.stringify({responses,storageErrors:errors}));
    assert.equal(ok(responses[0]).receipt.status,'accepted');assert.deepEqual(responses[0],responses[1]);
    assert.equal((await h.current()).state.activeSeatId,'seat-2','A retried transaction must not pass two turns');
    const recovery=ok(await h.operation(h.host,'issueRecovery',{matchId:h.matchId,seatId:'seat-1'})),uid=h.nextId();
    ok(await h.operation(uid,'redeemRecovery',{matchId:h.matchId,recoveryCode:recovery.recoveryCode}));h.reload();
    assert.equal((await h.read(uid)).selfSeatId,'seat-1');denied(await h.invoke(h.players[0],'read',{matchId:h.matchId}));
    assert.deepEqual(ok(await h.invoke(uid,'receipt',{matchId:h.matchId,commandId:request.commandId})).receipt,ok(responses[0]).receipt);
    assert.deepEqual(await h.invoke(uid,'command',{request}),responses[0]);
  });

  test(`${count}: Firestore concurrent deadline deliveries advance once, preserve outbox freshness and reject stale token deliveries`,async()=>{
    const store=createFirestorePlanetStore(db),h=await planetServiceHarness({store,count,humans:count});
    ok(await h.operation(h.host,'beginSetup',{matchId:h.matchId}));await h.deadline();
    for(const uid of h.players)ok(await h.operation(uid,'ready',{matchId:h.matchId}));await h.deadline();
    const before=await h.current(),job=await h.currentJob();
    await h.service.dispatchDeadline(job.taskId,async()=>{});h.setTime(before.state.phase.endsAt+60_000);
    const deliveries=await Promise.all([h.service.runDeadline(job),h.service.runDeadline(job)]);
    assert.equal(deliveries.filter(r=>r.status==='advanced').length,1);
    const after=await h.current();assert.equal(after.state.activeSeatId,'seat-1');assert.equal(after.state.phase.startedAt,h.now());
    assert.equal(after.state.phase.endsAt,h.now()+60_000);assert.equal((await store.transaction(tx=>tx.get('deadline/'+job.taskId))).status,'complete');
    h.reload();assert.deepEqual((await h.current()).state,after.state);
    assert.equal((await h.service.runDeadline(job)).status,'unchanged');assert.deepEqual((await h.current()).state,after.state);
    assert.equal((await h.service.runDeadline({...await h.currentJob(),deadlineToken:'unrecorded-token'})).status,'unchanged');
  });
}

test('Firestore private state chunks preserve nested drawing arrays and reject a corrupted saved digest',async()=>{
  const store=createFirestorePlanetStore(db),key='journal/chunk-control-'+randomUUID();
  const nested={strokes:[{points:[[0,0],[1,1]],pressure:[.4,.5]}],large:'x'.repeat(120_000)};
  await store.transaction(tx=>tx.set(key,nested));assert.deepEqual(await store.transaction(tx=>tx.get(key)),nested);
  const heads=await db.collection('planetDocuments').where('key','==',key).get();assert.equal(heads.size,1);assert.ok(heads.docs[0].get('chunks')>1);
  await heads.docs[0].ref.update({digest:'0'.repeat(64)});
  await assert.rejects(store.transaction(tx=>tx.get(key)),/digest mismatch/);
});
