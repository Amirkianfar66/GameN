import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PLANET_GAME_PINS} from '@mothership/contracts';
import {decodePlanetGameState,encodePlanetGameState} from '@mothership/engine';
import {planetServiceHarness,startPlanetHarness,memoryPlanetStore,ok,denied,digest} from './planet-service-helper.mjs';

for(const count of [7,8,9]) {
  test(`${count}: real-engine setup uses thirty-second choice and reading windows plus human Ready; bots and pinned state survive reload`,async()=>{
    const h=await planetServiceHarness({count});
    ok(await h.operation(h.host,'beginSetup',{matchId:h.matchId}));
    const choosing=await h.read();assert.equal(choosing.status,'choosing');assert.equal(choosing.setup.endsAt-h.now(),30_000);
    h.setTime(choosing.setup.endsAt-1);assert.equal((await h.service.runDeadline(await h.currentJob())).status,'too-early');
    await h.deadline();const reading=await h.read(h.players[0]);
    assert.equal(reading.status,'reading');assert.equal(reading.setup.endsAt-h.now(),30_000);assert.ok(reading.privateRole);
    const remembered=structuredClone(reading.privateRole),prepared=(await h.current()).prepared;
    assert.deepEqual((await h.current()).versions,{...PLANET_GAME_PINS,assetManifestVersion:'design-0.6.0'});
    assert.equal(new Set(reading.members.map(m=>m.characterId)).size,count);
    assert.equal(reading.members.filter(m=>m.controller==='bot').length,count-1);
    assert.ok(['Room A','Room B'].every(room=>Object.values(prepared.initialRooms).filter(r=>r===room).length<=5));
    h.reload();assert.deepEqual((await h.read(h.players[0])).privateRole,remembered);
    await h.deadline();assert.equal((await h.current()).status,'reading','Elapsed reading time cannot substitute for human Ready');
    ok(await h.operation(h.players[0],'ready',{matchId:h.matchId}));
    const s=await h.current();assert.equal(s.status,'running');assert.deepEqual(s.state.versions,s.versions);
    assert.equal(s.state.roles['seat-1'],remembered.role);assert.deepEqual(decodePlanetGameState(encodePlanetGameState(s.state)),s.state);
    assert.deepEqual((await h.read(h.players[0])).playerView.self.role,remembered.role);
  });

  test(`${count}: early Ready does not shorten reading; lost and duplicate setup deadlines never redeal`,async()=>{
    const h=await planetServiceHarness({count});ok(await h.operation(h.host,'beginSetup',{matchId:h.matchId}));
    const choosingJob=await h.currentJob();await h.deadline({late:5_000});
    const s=await h.current(),remembered=structuredClone(s.preparedState),readJob=await h.currentJob();
    ok(await h.operation(h.players[0],'ready',{matchId:h.matchId}));assert.equal((await h.current()).status,'reading');
    h.setTime(s.setup.endsAt-1);assert.equal((await h.service.runDeadline(readJob)).status,'too-early');
    assert.equal((await h.service.runDeadline(choosingJob)).status,'unchanged');assert.deepEqual((await h.current()).preparedState,remembered);
    h.setTime(s.setup.endsAt+70_000);
    await h.service.repairDeadlines(async()=>assert.fail('An overdue lost setup task should be repaired directly'));
    const started=await h.current();assert.equal(started.status,'running');assert.equal(started.state.phase.startedAt,h.now());
    assert.equal(started.state.phase.endsAt-h.now(),15_000);assert.deepEqual(started.state.roles,remembered.roles);
    await h.service.runDeadline(readJob);assert.deepEqual((await h.current()).state,started.state);
  });

  test(`${count}: requester-bound admission scrubs pending/closed reads and admitted display receives only public game data`,async()=>{
    const h=await planetServiceHarness({count}),pending=await h.admission(h.nextId(),'player','Waiting');
    const uid=(await h.current()).admissions.find(a=>a.id===pending.admissionId).uid;
    const display=await h.admission(h.display,'display','Table');
    for(const [caller,admission,kind] of [[uid,pending,'player'],[h.display,display,'display']]){
      const view=await h.read(caller);assert.deepEqual(view.admission,{requestId:admission.requestId,kind,status:'pending'});
      assert.deepEqual(view.members,[]);assert.deepEqual(view.pendingAdmissions,[]);assert.equal(view.setup,null);
      assert.equal(view.publicView,null);assert.equal(view.playerView,null);assert.equal(view.privateRole,null);assert.equal(view.selfSeatId,null);
    }
    ok(await h.approve(display));await startPlanetHarness(h);
    const waiting=await h.read(uid);assert.equal(waiting.admission.status,'closed');assert.deepEqual(waiting.members,[]);assert.equal(waiting.publicView,null);
    const admitted=await h.read(h.display);assert.deepEqual(admitted.admission,{requestId:display.requestId,kind:'display',status:'admitted'});
    assert.ok(admitted.publicView);assert.equal(admitted.playerView,null);assert.equal(admitted.privateRole,null);assert.equal(admitted.selfSeatId,null);
    assert.deepEqual(admitted.pendingAdmissions,[]);denied(await h.invoke(h.nextId(),'read',{matchId:h.matchId}));
    denied(await h.invoke(h.display,'advance',{matchId:h.matchId}));denied(await h.invoke(h.display,'runBots',{matchId:h.matchId}));
    denied(await h.invoke(h.display,'receipt',{matchId:h.matchId,commandId:'unknown'}));
  });

  test(`${count}: durable actor-scoped accepted/rejected receipts reconcile after phase change, reload and seat recovery`,async()=>{
    const h=await planetServiceHarness({count,humans:count});await startPlanetHarness(h);
    const rejected=await h.command(h.players[0],{type:'PASS_TURN'},{commandId:'stable-rejection'});
    assert.equal(ok(rejected.response).receipt.status,'rejected');
    await h.deadline();assert.equal((await h.current()).state.activeSeatId,'seat-1');
    assert.deepEqual(await h.invoke(h.players[0],'command',{request:rejected.request}),rejected.response);
    const accepted=await h.command(h.players[0],{type:'PASS_TURN'},{commandId:'same-id-two-actors'});
    assert.equal(ok(accepted.response).receipt.status,'accepted');
    const journalBefore=(await h.store.listKeys('journal',100)).length;h.reload();
    assert.deepEqual(await h.invoke(h.players[0],'command',{request:accepted.request}),accepted.response);
    assert.equal((await h.store.listKeys('journal',100)).length,journalBefore);
    assert.deepEqual(ok(await h.invoke(h.players[0],'receipt',{matchId:h.matchId,commandId:accepted.request.commandId})).receipt,ok(accepted.response).receipt);
    const second=await h.command(h.players[1],{type:'PASS_TURN'},{commandId:accepted.request.commandId});assert.equal(ok(second.response).receipt.status,'accepted');
    assert.notDeepEqual(ok(second.response).receipt,ok(accepted.response).receipt);
    denied(await h.invoke(h.players[0],'command',{request:{...accepted.request,command:{type:'REQUEST_BLACKOUT'}}}),'COMMAND_ID_CONFLICT');
    const recovery=ok(await h.operation(h.host,'issueRecovery',{matchId:h.matchId,seatId:'seat-1'})),newUid=h.nextId();
    ok(await h.operation(newUid,'redeemRecovery',{matchId:h.matchId,recoveryCode:recovery.recoveryCode}));
    assert.equal((await h.read(newUid)).selfSeatId,'seat-1');denied(await h.invoke(h.players[0],'read',{matchId:h.matchId}));
    denied(await h.invoke(h.players[0],'command',{request:accepted.request}));
    assert.deepEqual(ok(await h.invoke(newUid,'receipt',{matchId:h.matchId,commandId:accepted.request.commandId})).receipt,ok(accepted.response).receipt);
    denied(await h.operation(h.nextId(),'redeemRecovery',{matchId:h.matchId,recoveryCode:recovery.recoveryCode}));
  });

  test(`${count}: dispatched-but-lost game deadline is repaired once; concurrent duplicate deliveries preserve a full successor window`,async()=>{
    const h=await startPlanetHarness(await planetServiceHarness({count,humans:count}));
    const before=await h.current(),job=await h.currentJob();let enqueued=0;
    await h.service.dispatchDeadline(job.taskId,async value=>{enqueued++;assert.equal(value.deadlineToken,job.deadlineToken);});assert.equal(enqueued,1);
    h.setTime(before.state.phase.endsAt+45_000);
    await Promise.all([h.service.repairDeadlines(async()=>{}),h.service.runDeadline(job),h.service.runDeadline(job)]);
    const after=await h.current();assert.notEqual(after.state.phase.id,before.state.phase.id);assert.equal(after.state.activeSeatId,'seat-1');
    assert.equal(after.state.phase.startedAt,h.now());assert.equal(after.state.phase.endsAt-h.now(),60_000);
    assert.equal((await h.service.runDeadline(job)).status,'unchanged');assert.deepEqual((await h.current()).state,after.state);
    assert.equal((await h.store.transaction(tx=>tx.get('deadline/'+job.taskId))).status,'complete');
  });
}

test('changing the new-creation artwork configuration does not strand a saved historical asset pin',async()=>{
  const h=await startPlanetHarness(await planetServiceHarness({assetManifestVersion:'design-0.5.0'}));
  const original=await h.read(h.players[0]);h.reload({assetManifestVersion:'design-0.6.0'});
  assert.deepEqual(await h.read(h.players[0]),original);assert.equal((await h.current()).versions.assetManifestVersion,'design-0.5.0');
  ok(await h.invoke(h.host,'advance',{matchId:h.matchId}));
});

test('recovering a host-owned seat revokes all old UID privileges including old display membership',async()=>{
  const h=await planetServiceHarness({count:7,humans:0});
  ok(await h.operation(h.host,'setBots',{matchId:h.matchId,count:6}));
  const admission=await h.admission(h.host,'player','Host');ok(await h.approve(admission));
  const old=await h.current(),seat=old.members.find(m=>m.uid===h.host).seatId;
  old.displays.push(h.host);await h.store.transaction(tx=>tx.set('session/'+h.matchId,old));
  const recovery=ok(await h.operation(h.host,'issueRecovery',{matchId:h.matchId,seatId:seat})),uid=h.nextId();
  ok(await h.operation(uid,'redeemRecovery',{matchId:h.matchId,recoveryCode:recovery.recoveryCode}));
  assert.equal((await h.read(uid)).isHost,true);denied(await h.invoke(h.host,'read',{matchId:h.matchId}));
  denied(await h.operation(h.host,'abort',{matchId:h.matchId}));assert.equal((await h.current()).status,'lobby');
});

test('invalid input and unauthenticated identities cannot reach persistence or randomness',async()=>{
  const store={transaction:()=>assert.fail('Preflight reached storage'),listKeys:()=>assert.fail('Preflight queried storage')};
  const h=await import('../dist/planet-game.js');const service=h.createPlanetService({store,engine:{},randomSamples:()=>assert.fail('Preflight consumed randomness')});
  denied(await service.handle('',{operation:'create',requestId:'create',playerCount:7}),'UNAUTHENTICATED');
  denied(await service.handle('person',{operation:'read',matchId:'match',uid:'injected'}),'INVALID_REQUEST');
});

test('lost accepted-command acknowledgement is reconciled from its durable receipt without repeating the effect',async()=>{
  const h=await startPlanetHarness(await planetServiceHarness({humans:7}));await h.deadline();
  const request={protocolVersion:3,matchId:h.matchId,phaseId:(await h.current()).state.phase.id,commandId:'lost-accepted-ack',command:{type:'PASS_TURN'}};
  h.store.loseNextAcknowledgement('command/');denied(await h.invoke(h.players[0],'command',{request}),'UNAVAILABLE');
  const committed=await h.current();assert.equal(committed.state.activeSeatId,'seat-2');
  const receipt=ok(await h.invoke(h.players[0],'receipt',{matchId:h.matchId,commandId:request.commandId})).receipt;assert.equal(receipt.status,'accepted');
  assert.deepEqual(ok(await h.invoke(h.players[0],'command',{request})).receipt,receipt);assert.deepEqual((await h.current()).state,committed.state);
});

test('retrying a setup transaction reuses recorded randomness and persists one prepared deal',async()=>{
  const h=await planetServiceHarness();ok(await h.operation(h.host,'beginSetup',{matchId:h.matchId}));
  const job=await h.currentJob();h.setTime((await h.current()).setup.endsAt);
  const before=h.draws();h.store.retryNext();await h.service.runDeadline(job);assert.equal(h.draws()-before,1);
  const session=await h.current(),records=h.store.export().filter(([key])=>key.startsWith('journal/'+h.matchId+'/')).map(([,value])=>value);
  assert.equal(records.filter(r=>r.kind==='PREPARE').length,1);assert.deepEqual(records.find(r=>r.kind==='PREPARE').setup,session.prepared);
  assert.ok(h.store.attempts.some(a=>a.commit===false));
});

test('creation disablement stops new matches while preserving a previous accepted creation receipt',async()=>{
  const h=await planetServiceHarness(),request={operation:'create',requestId:h.nextId(),playerCount:7};
  const original=await h.service.handle(h.host,request);ok(original);h.reload({enabled:false});
  assert.deepEqual(await h.service.handle(h.host,request),original);
  denied(await h.service.handle(h.host,{...request,requestId:h.nextId()}),'NOT_ALLOWED');
});

test('a second admission ID cannot replace requester standing or expose setup after admission closes',async()=>{
  const h=await planetServiceHarness(),uid=h.nextId(),a=await h.admission(uid,'display','Waiting');
  denied(await h.operation(uid,'requestAdmission',{roomCode:h.roomCode,kind:'display',displayName:'Waiting'}),'NOT_ALLOWED');
  assert.deepEqual((await h.read(uid)).admission,{requestId:a.requestId,kind:'display',status:'pending'});
  ok(await h.operation(h.host,'beginSetup',{matchId:h.matchId}));await h.deadline();
  const closed=await h.read(uid);assert.equal(closed.admission.status,'closed');assert.deepEqual(closed.members,[]);assert.equal(closed.setup,null);assert.equal(closed.privateRole,null);
});

test('a corrupt saved cross-match identity is unavailable and never projected to the authenticated caller',async()=>{
  const h=await startPlanetHarness(await planetServiceHarness()),s=await h.current();s.matchId='wrong-match';
  await h.store.transaction(tx=>tx.set('session/'+h.matchId,s));denied(await h.invoke(h.players[0],'read',{matchId:h.matchId}),'UNAVAILABLE');
});

test('repair backs off one corrupt deadline while progressing a healthy match and later recovers the original task',async()=>{
  const store=memoryPlanetStore(),bad=await startPlanetHarness(await planetServiceHarness({store,humans:7})),healthy=await startPlanetHarness(await planetServiceHarness({store,humans:7}));
  const original=await bad.current(),job=await bad.currentJob(),broken=structuredClone(original);broken.state.roles['seat-1']='invalid-role';
  await store.transaction(tx=>tx.set('session/'+bad.matchId,broken));bad.setTime(original.state.phase.endsAt+1_000);
  const result=await bad.service.repairDeadlines(async()=>{});assert.equal(result.failed,1);assert.ok(result.advanced>=1);
  const waiting=await store.transaction(tx=>tx.get('deadline/'+job.taskId));assert.notEqual(waiting.status,'complete');assert.equal(waiting.nextAttemptAt,bad.now()+30_000);
  assert.equal((await healthy.current()).state.activeSeatId,'seat-1');assert.equal((await bad.service.repairDeadlines(async()=>{})).failed,0);
  await store.transaction(tx=>tx.set('session/'+bad.matchId,original));bad.setTime(waiting.nextAttemptAt);
  assert.ok((await bad.service.repairDeadlines(async()=>{})).advanced>=1);assert.equal((await bad.current()).state.activeSeatId,'seat-1');
  assert.equal((await store.transaction(tx=>tx.get('deadline/'+job.taskId))).status,'complete');
});
