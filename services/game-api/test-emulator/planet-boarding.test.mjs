import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {before,after,test} from 'node:test';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {createPlanetService} from '../dist/planet-game.js';
import {createFirestorePlanetStore} from '../dist/planet-store.js';
import {planetServiceHarness,ok,denied} from '../test/planet-service-helper.mjs';
import {beginPlanetReading,readyPlanetHumans,enterPlanetBoarding} from '../test/planet-boarding-helper.mjs';
import {assertLocalEmulators} from '../../../infra/firebase/test/helpers.mjs';

// Genuine optimistic Firestore transactions with recorded service time. Live
// authenticated HTTP and private Tasks are exercised separately in a fresh suite.
let app,db;
before(()=>{assertLocalEmulators();app=initializeApp({projectId:'demo-mothership'},'boarding-data-'+randomUUID());db=getFirestore(app);});
after(async()=>{await db?.terminate();if(app)await deleteApp(app);});
async function journal(h){
  const heads=await db.collection('planetDocuments').where('namespace','==','journal').get();
  const paths=heads.docs.map(doc=>doc.get('key')).filter(path=>path.startsWith('journal/'+h.matchId+'/'));
  return (await Promise.all(paths.map(path=>h.store.transaction(tx=>tx.get(path))))).sort((a,b)=>a.sequence-b.sequence);
}

for(const count of [7,8,9]){
  test(`${count}: simultaneous final Ready, duplicate request and reading deadline commit one durable boarding boundary across clients`,async()=>{
    const h=await planetServiceHarness({store:createFirestorePlanetStore(db),count,humans:2,setupFlowVersion:2});
    const reading=await beginPlanetReading(h);await readyPlanetHumans(h,[h.players[1]]);const readingJob=await h.currentJob();
    h.setTime(reading.setup.endsAt+12_000);const second=createPlanetService(h.options),request={operation:'ready',matchId:h.matchId,requestId:h.nextId()};
    const [first,duplicate]=await Promise.all([h.service.handle(h.players[1],request),second.handle(h.players[1],request),second.runDeadline(readingJob)]);
    ok(first);assert.deepEqual(first,duplicate);const boarded=await h.current();
    assert.equal(boarded.status,'boarding');assert.equal(boarded.setupFlowVersion,2);assert.equal(boarded.state,null);
    assert.equal(boarded.setup.startedAt,h.now());assert.equal(boarded.setup.endsAt,h.now()+10_000);assert.deepEqual(boarded.prepared,reading.prepared);
    const job=await h.currentJob(),stored=await h.store.transaction(tx=>tx.get('deadline/'+job.taskId));
    assert.equal(stored.kind,'setup');assert.equal(stored.endsAt,boarded.setup.endsAt);assert.equal(stored.deadlineToken,boarded.setup.token);
    const records=await journal(h);assert.equal(records.filter(r=>r.kind==='BOARDING_STARTED').length,1);assert.equal(records.filter(r=>r.kind==='INITIALIZE').length,0);
    assert.deepEqual(records.map(r=>r.sequence),Array.from({length:records.length},(_,i)=>i+1));
    h.reload({setupFlowVersion:1,assetManifestVersion:'design-0.7.0'});assert.deepEqual((await h.current()).setup,boarded.setup);
    assert.equal((await h.read(h.players[0])).setupFlowVersion,2);assert.equal((await h.service.runDeadline(readingJob)).status,'unchanged');
  });

  test(`${count}: early and simultaneous delayed boarding deliveries never spend PRE_TURN or first ordinary turn time`,async()=>{
    const h=await planetServiceHarness({store:createFirestorePlanetStore(db),count,humans:count,setupFlowVersion:2});await enterPlanetBoarding(h);
    const boarded=await h.current(),job=await h.currentJob(),second=createPlanetService(h.options);
    h.setTime(boarded.setup.endsAt-1);assert.equal((await second.runDeadline(job)).status,'too-early');assert.equal((await h.current()).state,null);
    await h.service.dispatchDeadline(job.taskId,async()=>{});h.setTime(boarded.setup.endsAt+91_000);
    const results=await Promise.all([h.service.runDeadline(job),second.runDeadline(job)]);
    assert.equal(results.filter(r=>r.status==='advanced').length,1);const started=await h.current();
    assert.equal(started.status,'running');assert.equal(started.state.phase.kind,'PRE_TURN');assert.equal(started.state.phase.startedAt,h.now());assert.equal(started.state.phase.endsAt,h.now()+15_000);
    assert.deepEqual(started.state.roles,boarded.preparedState.roles);assert.deepEqual(started.versions,boarded.versions);
    const records=await journal(h);assert.equal(records.filter(r=>r.kind==='INITIALIZE').length,1);assert.equal(records.filter(r=>r.kind==='BOARDING_STARTED').length,1);
    assert.equal((await h.store.transaction(tx=>tx.get('deadline/'+job.taskId))).status,'complete');
    await h.deadline({late:20_000});const first=(await h.current()).state;assert.equal(first.phase.kind,'ORDINARY_TURN');assert.equal(first.phase.startedAt,h.now());assert.equal(first.phase.endsAt,h.now()+60_000);
    assert.equal((await second.runDeadline(job)).status,'unchanged');assert.deepEqual((await h.current()).state,first);
  });

  test(`${count}: durable boarding privacy and recovery survive reload, while abort makes the lost deadline stale`,async()=>{
    const h=await planetServiceHarness({store:createFirestorePlanetStore(db),count,setupFlowVersion:2}),pendingUid=h.nextId();
    await h.admission(pendingUid,'display','Pending');ok(await h.approve(await h.admission(h.display,'display','Table')));
    await enterPlanetBoarding(h);const boarded=await h.current(),job=await h.currentJob();
    for(const uid of [h.host,h.players[0],h.display]){
      const view=await h.read(uid);assert.equal(view.status,'boarding');assert.deepEqual(view.setup,{id:boarded.setup.id,startedAt:boarded.setup.startedAt,endsAt:boarded.setup.endsAt});
      assert.equal(view.members.length,count);assert.equal(view.privateRole,null);assert.equal(view.publicView,null);assert.equal(view.playerView,null);
      assert.equal(JSON.stringify(view).includes(boarded.setup.token),false);
    }
    const closed=await h.read(pendingUid);assert.equal(closed.admission.status,'closed');assert.deepEqual(closed.members,[]);assert.equal(closed.setup,null);
    const code=ok(await h.operation(h.host,'issueRecovery',{matchId:h.matchId,seatId:'seat-1'})),uid=h.nextId();
    h.setTime(boarded.setup.startedAt+8_000);ok(await h.operation(uid,'redeemRecovery',{matchId:h.matchId,recoveryCode:code.recoveryCode}));
    h.reload({setupFlowVersion:1,assetManifestVersion:'design-0.7.0'});denied(await h.invoke(h.players[0],'read',{matchId:h.matchId}));
    assert.deepEqual((await h.current()).setup,boarded.setup);assert.deepEqual((await h.current()).prepared,boarded.prepared);
    assert.equal((await h.read(uid)).selfSeatId,'seat-1');assert.deepEqual((await h.read(uid)).members,(await h.read(h.display)).members);
    h.setTime(boarded.setup.endsAt+30_000);assert.equal((await h.read(uid)).status,'boarding');assert.equal((await h.current()).state,null);
    ok(await h.operation(h.host,'abort',{matchId:h.matchId}));const aborted=await h.current();
    assert.equal(aborted.status,'aborted');assert.equal(aborted.setup,null);assert.equal(aborted.state,null);
    assert.equal((await h.service.runDeadline(job)).status,'unchanged');assert.deepEqual(await h.current(),aborted);
    assert.equal((await journal(h)).filter(r=>r.kind==='INITIALIZE').length,0);
  });
}
