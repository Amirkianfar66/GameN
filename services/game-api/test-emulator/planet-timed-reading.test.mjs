import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {before,after,test} from 'node:test';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {createPlanetService} from '../dist/planet-game.js';
import {createFirestorePlanetStore} from '../dist/planet-store.js';
import {planetServiceHarness,ok,denied} from '../test/planet-service-helper.mjs';
import {beginPlanetReading} from '../test/planet-boarding-helper.mjs';
import {enterTimedPlanetBoarding} from '../test/planet-timed-reading-helper.mjs';
import {assertLocalEmulators} from '../../../infra/firebase/test/helpers.mjs';

// Genuine optimistic Firestore transactions with explicit service time. The
// automatic private Functions/Tasks acceptance runs separately with real time.
let app,db;
before(()=>{assertLocalEmulators();app=initializeApp({projectId:'demo-mothership'},'timed-reading-'+randomUUID());db=getFirestore(app);});
after(async()=>{await db?.terminate();if(app)await deleteApp(app);});
async function journal(h){
  const heads=await db.collection('planetDocuments').where('namespace','==','journal').get();
  const paths=heads.docs.map(doc=>doc.get('key')).filter(path=>path.startsWith('journal/'+h.matchId+'/'));
  return (await Promise.all(paths.map(path=>h.store.transaction(tx=>tx.get(path))))).sort((a,b)=>a.sequence-b.sequence);
}

for(const count of [7,8,9]){
  test(`${count}: transactional timed reading rejects early Ready and records one boarding stage across final-Ready clients and deadline delivery`,async()=>{
    const h=await planetServiceHarness({store:createFirestorePlanetStore(db),count,humans:2,setupFlowVersion:3}),reading=await beginPlanetReading(h),job=await h.currentJob();
    assert.equal(reading.setup.roleFilmStartsAt-reading.setup.startedAt,20_000);assert.equal(reading.setup.endsAt-reading.setup.roleFilmStartsAt,10_000);
    const request={operation:'ready',matchId:h.matchId,requestId:h.nextId()};h.setTime(reading.setup.endsAt-1);
    denied(await h.service.handle(h.players[0],request),'NOT_ALLOWED');assert.equal((await h.current()).members[0].ready,false);
    h.setTime(reading.setup.endsAt);ok(await h.service.handle(h.players[0],request));
    const finalReady={...request,requestId:h.nextId()},second=createPlanetService(h.options);
    const [first,duplicate]=await Promise.all([h.service.handle(h.players[1],finalReady),second.handle(h.players[1],finalReady),second.runDeadline(job)]);
    ok(first);assert.deepEqual(first,duplicate);const boarded=await h.current();assert.equal(boarded.status,'boarding');assert.equal(boarded.setupFlowVersion,3);
    assert.equal(boarded.setup.startedAt,h.now());assert.equal(boarded.setup.endsAt,h.now()+10_000);assert.equal(Object.hasOwn(boarded.setup,'roleFilmStartsAt'),false);
    assert.deepEqual(boarded.prepared,reading.prepared);assert.equal(boarded.state,null);
    const boardingJob=await h.currentJob(),stored=await h.store.transaction(tx=>tx.get('deadline/'+boardingJob.taskId));assert.equal(stored.endsAt,boarded.setup.endsAt);assert.equal(stored.kind,'setup');
    const records=await journal(h);assert.equal(records.filter(record=>record.kind==='BOARDING_STARTED').length,1);assert.equal(records.filter(record=>record.kind==='INITIALIZE').length,0);
    assert.deepEqual(records.map(record=>record.sequence),Array.from({length:records.length},(_,i)=>i+1));
    h.reload({setupFlowVersion:1,assetManifestVersion:'design-0.7.0'});assert.equal((await h.read(h.players[0])).setupFlowVersion,3);
    assert.equal((await h.service.runDeadline(job)).status,'unchanged');assert.deepEqual((await h.current()).setup,boarded.setup);
  });

  test(`${count}: durable timed reading recovery retains its interval and own role, revokes the prior UID and aborts without task initialization`,async()=>{
    const h=await planetServiceHarness({store:createFirestorePlanetStore(db),count,setupFlowVersion:3}),pendingUid=h.nextId();
    await h.admission(pendingUid,'display','Pending');ok(await h.approve(await h.admission(h.display,'display','Table')));
    const reading=await beginPlanetReading(h),job=await h.currentJob(),role=(await h.read(h.players[0])).privateRole;
    const display=await h.read(h.display);assert.equal(display.privateRole,null);assert.equal(display.playerView,null);
    assert.deepEqual(display.setup,(await h.read(h.players[0])).setup);assert.equal((await h.read(pendingUid)).setup,null);
    const recovery=ok(await h.operation(h.host,'issueRecovery',{matchId:h.matchId,seatId:'seat-1'})),uid=h.nextId();h.setTime(reading.setup.roleFilmStartsAt+3_000);
    ok(await h.operation(uid,'redeemRecovery',{matchId:h.matchId,recoveryCode:recovery.recoveryCode}));h.reload({setupFlowVersion:2,assetManifestVersion:'design-0.7.0'});
    const restored=await h.read(uid);assert.equal(restored.setupFlowVersion,3);assert.deepEqual(restored.setup,display.setup);assert.deepEqual(restored.privateRole,role);
    denied(await h.invoke(h.players[0],'read',{matchId:h.matchId}));h.setTime(reading.setup.endsAt+30_000);
    assert.equal((await h.read(uid)).status,'reading');assert.equal((await h.current()).members[0].ready,false);
    assert.equal((await h.service.runDeadline(job)).status,'unchanged');assert.equal((await h.current()).status,'reading');
    ok(await h.operation(h.host,'abort',{matchId:h.matchId}));const aborted=await h.current();
    assert.equal((await h.service.runDeadline(job)).status,'unchanged');assert.deepEqual(await h.current(),aborted);assert.equal(aborted.state,null);
    assert.equal((await journal(h)).filter(record=>record.kind==='INITIALIZE').length,0);
  });

  test(`${count}: delayed duplicate timed-flow boarding tasks initialize one preserved deal with full first-round clocks`,async()=>{
    const h=await planetServiceHarness({store:createFirestorePlanetStore(db),count,humans:count,setupFlowVersion:3}),{reading,session}=await enterTimedPlanetBoarding(h);
    const job=await h.currentJob(),second=createPlanetService(h.options);h.setTime(session.setup.endsAt-1);
    assert.equal((await second.runDeadline(job)).status,'too-early');await h.service.dispatchDeadline(job.taskId,async()=>{});
    h.setTime(session.setup.endsAt+91_000);const results=await Promise.all([h.service.runDeadline(job),second.runDeadline(job)]);
    assert.equal(results.filter(result=>result.status==='advanced').length,1);const started=await h.current();
    assert.equal(started.state.phase.kind,'PRE_TURN');assert.equal(started.state.phase.startedAt,h.now());assert.equal(started.state.phase.endsAt,h.now()+15_000);
    assert.deepEqual(started.state.roles,reading.preparedState.roles);assert.equal((await h.store.transaction(tx=>tx.get('deadline/'+job.taskId))).status,'complete');
    await h.deadline({late:20_000});const first=(await h.current()).state;assert.equal(first.phase.kind,'ORDINARY_TURN');assert.equal(first.phase.endsAt,h.now()+60_000);
    assert.equal((await second.runDeadline(job)).status,'unchanged');assert.deepEqual((await h.current()).state,first);
    const records=await journal(h);assert.equal(records.filter(record=>record.kind==='INITIALIZE').length,1);assert.equal(records.filter(record=>record.kind==='BOARDING_STARTED').length,1);
  });
}
