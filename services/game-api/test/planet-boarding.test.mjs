import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createPlanetGame,advancePlanetDeadline,applyPlanetCommand,projectPlanetPublic,projectPlanetPlayer} from '@mothership/engine';
import {createPlanetService} from '../dist/planet-game.js';
import {LegacyPlanetSessionSnapshotSchema} from './planet-boarding-legacy-schema.mjs';
import {planetServiceHarness,ok,denied} from './planet-service-helper.mjs';
import {beginPlanetReading,readyPlanetHumans,enterPlanetBoarding,currentPlanetJournal} from './planet-boarding-helper.mjs';

for(const count of [7,8,9]){
  test(`${count}: boarding waits for reading minimum and every human, preserves the prepared deal and starts full PRE_TURN and first-turn clocks`,async()=>{
    const h=await planetServiceHarness({count,humans:2,setupFlowVersion:2});
    assert.equal((await h.read()).setupFlowVersion,2);
    const reading=await beginPlanetReading(h),role=structuredClone((await h.read(h.players[0])).privateRole);
    assert.ok(role);await readyPlanetHumans(h);
    h.setTime(reading.setup.endsAt-1);assert.equal((await h.service.runDeadline(await h.currentJob())).status,'too-early');
    assert.equal((await h.current()).status,'reading');
    await h.deadline({late:17_000});const boarded=await h.current();
    assert.equal(boarded.status,'boarding');assert.equal(boarded.setup.startedAt,h.now());assert.equal(boarded.setup.endsAt,h.now()+10_000);
    assert.equal(boarded.state,null);assert.deepEqual(boarded.prepared,reading.prepared);assert.deepEqual(boarded.preparedState,reading.preparedState);
    assert.deepEqual(boarded.members.map(({uid,...member})=>member),reading.members.map(({uid,...member})=>({...member,ready:true})));
    const boardingJob=await h.currentJob();h.setTime(boarded.setup.endsAt-1);
    assert.equal((await h.service.runDeadline(boardingJob)).status,'too-early');assert.equal((await h.current()).state,null);
    await h.deadline({late:45_000});const running=await h.current();
    assert.equal(running.status,'running');assert.equal(running.setup,null);assert.equal(running.state.phase.kind,'PRE_TURN');
    assert.equal(running.state.phase.startedAt,h.now());assert.equal(running.state.phase.endsAt,h.now()+15_000);
    assert.deepEqual(running.state.roles,reading.preparedState.roles);assert.equal(running.state.roles['seat-1'],role.role);
    assert.deepEqual(running.members.map(({uid,...member})=>member),boarded.members.map(({uid,...member})=>member));
    await h.deadline({late:12_000});const first=(await h.current()).state;
    assert.equal(first.phase.kind,'ORDINARY_TURN');assert.equal(first.activeSeatId,'seat-1');
    assert.equal(first.phase.startedAt,h.now());assert.equal(first.phase.endsAt,h.now()+60_000);
    assert.equal((await h.service.runDeadline(boardingJob)).status,'unchanged');assert.deepEqual((await h.current()).state,first);
  });

  test(`${count}: late final Ready races with another client and the old reading task without creating a second stage`,async()=>{
    const h=await planetServiceHarness({count,humans:2,setupFlowVersion:2}),reading=await beginPlanetReading(h);
    await readyPlanetHumans(h,[h.players[1]]);const oldJob=await h.currentJob();
    h.setTime(reading.setup.endsAt);assert.equal((await h.service.runDeadline(oldJob)).status,'unchanged');
    assert.equal((await h.current()).status,'reading');h.setTime(h.now()+23_000);
    const second=createPlanetService(h.options),request={operation:'ready',matchId:h.matchId,requestId:h.nextId()};
    const results=await Promise.all([h.service.handle(h.players[1],request),second.handle(h.players[1],request),second.runDeadline(oldJob)]);
    assert.deepEqual(results[0],results[1]);ok(results[0]);const boarded=await h.current();
    assert.equal(boarded.status,'boarding');assert.equal(boarded.setup.startedAt,h.now());assert.equal(boarded.setup.endsAt,h.now()+10_000);
    const records=await currentPlanetJournal(h);assert.equal(records.filter(r=>r.kind==='BOARDING_STARTED').length,1);assert.equal(records.filter(r=>r.kind==='INITIALIZE').length,0);
    const before=structuredClone(boarded.setup);assert.deepEqual(await second.handle(h.players[1],request),results[0]);
    assert.equal((await h.service.runDeadline(oldJob)).status,'unchanged');assert.deepEqual((await h.current()).setup,before);
  });

  test(`${count}: boarding exposes only admitted public roster and times; local expiry, Skip and completion cannot create a game`,async()=>{
    const h=await planetServiceHarness({count,setupFlowVersion:2}),pendingUid=h.nextId();
    const pending=await h.admission(pendingUid,'display','Waiting'),display=await h.admission(h.display,'display','Table');ok(await h.approve(display));
    await enterPlanetBoarding(h);const current=await h.current();
    for(const uid of [h.host,h.players[0],h.display]){
      const view=await h.read(uid);assert.equal(view.status,'boarding');assert.equal(view.setupFlowVersion,2);
      assert.deepEqual(view.setup,{id:current.setup.id,startedAt:current.setup.startedAt,endsAt:current.setup.endsAt});
      assert.equal(view.members.length,count);assert.ok(view.members.every(m=>m.characterId!==null&&m.ready));
      for(const field of ['privateRole','publicView','playerView'])assert.equal(view[field],null);
      assert.equal(JSON.stringify(view).includes(current.setup.token),false);assert.equal(Object.hasOwn(view,'prepared'),false);
    }
    const closed=await h.read(pendingUid);assert.deepEqual(closed.admission,{requestId:pending.requestId,kind:'display',status:'closed'});
    assert.deepEqual(closed.members,[]);assert.deepEqual(closed.pendingAdmissions,[]);assert.equal(closed.setup,null);
    denied(await h.invoke(h.nextId(),'read',{matchId:h.matchId}));
    for(const operation of ['skipBoarding','completeBoarding'])denied(await h.invoke(h.players[0],operation,{matchId:h.matchId}),'INVALID_REQUEST');
    const request={protocolVersion:3,matchId:h.matchId,phaseId:current.setup.id,commandId:h.nextId(),command:{type:'PASS_TURN'}};
    denied(await h.invoke(h.players[0],'command',{request}),'NOT_ALLOWED');
    denied(await h.invoke(h.display,'advance',{matchId:h.matchId}));denied(await h.invoke(h.players[0],'advance',{matchId:h.matchId}));
    h.setTime(current.setup.endsAt+60_000);
    assert.equal((await h.read(h.players[0])).status,'boarding');assert.equal((await h.current()).state,null,'Reading after local expiry must not initialize authority');
    await h.service.runDeadline(await h.currentJob());assert.equal((await h.current()).status,'running');
  });

  test(`${count}: recovery keeps the current boarding identity/deal and revokes old UID; abort invalidates the durable task`,async()=>{
    const h=await planetServiceHarness({count,setupFlowVersion:2});await enterPlanetBoarding(h);
    const before=await h.current(),job=await h.currentJob(),recovery=ok(await h.operation(h.host,'issueRecovery',{matchId:h.matchId,seatId:'seat-1'})),uid=h.nextId();
    h.setTime(before.setup.startedAt+4_000);const redeem={operation:'redeemRecovery',matchId:h.matchId,requestId:h.nextId(),recoveryCode:recovery.recoveryCode};
    const accepted=await h.service.handle(uid,redeem);assert.deepEqual(ok(accepted),{matchId:h.matchId,seatId:'seat-1'});
    assert.deepEqual(await h.service.handle(uid,redeem),accepted);h.reload({setupFlowVersion:1,assetManifestVersion:'design-0.7.0'});
    const restored=await h.read(uid);assert.equal(restored.setupFlowVersion,2);assert.equal(restored.status,'boarding');
    assert.deepEqual(restored.setup,{id:before.setup.id,startedAt:before.setup.startedAt,endsAt:before.setup.endsAt});
    assert.deepEqual((await h.current()).prepared,before.prepared);assert.equal(restored.selfSeatId,'seat-1');
    denied(await h.invoke(h.players[0],'read',{matchId:h.matchId}));
    h.setTime(before.setup.endsAt+1_000);assert.equal((await h.read(uid)).status,'boarding','Recovery and reading never restart or initialize an expired cinematic');
    ok(await h.operation(h.host,'abort',{matchId:h.matchId}));const aborted=await h.current();
    assert.equal(aborted.status,'aborted');assert.equal(aborted.state,null);assert.equal(aborted.setup,null);
    assert.equal((await h.service.runDeadline(job)).status,'unchanged');assert.deepEqual(await h.current(),aborted);
    assert.equal((await currentPlanetJournal(h)).filter(r=>r.kind==='INITIALIZE').length,0);
  });

  test(`${count}: lost dispatch and duplicate delayed boarding tasks recover once and keep exact ordered engine replay`,async()=>{
    const h=await planetServiceHarness({count,humans:count,setupFlowVersion:2});await enterPlanetBoarding(h);
    const job=await h.currentJob(),second=createPlanetService(h.options);let enqueued=0;
    await h.service.dispatchDeadline(job.taskId,async delivered=>{enqueued++;assert.equal(delivered.kind,'setup');});assert.equal(enqueued,1);
    h.setTime((await h.current()).setup.endsAt+70_000);
    await Promise.all([h.service.repairDeadlines(async()=>{}),second.runDeadline(job),h.service.runDeadline(job)]);
    const started=await h.current();assert.equal(started.status,'running');assert.equal(started.state.phase.startedAt,h.now());assert.equal(started.state.phase.endsAt,h.now()+15_000);
    assert.equal((await h.store.transaction(tx=>tx.get('deadline/'+job.taskId))).status,'complete');
    await h.deadline();const target=await h.current(),records=await currentPlanetJournal(h);
    assert.equal(records.filter(r=>r.kind==='BOARDING_STARTED').length,1);assert.equal(records.filter(r=>r.kind==='INITIALIZE').length,1);
    assert.deepEqual(records.map(r=>r.sequence),Array.from({length:records.length},(_,i)=>i+1));
    let replay=null;for(const record of records){
      assert.equal(record.setupFlowVersion,2);
      if(record.kind==='BOARDING_STARTED'){assert.equal(replay,null);assert.equal(record.context.now+10_000,started.state.phase.startedAt-70_000);}
      else if(record.kind==='INITIALIZE')replay=createPlanetGame(record.setup,record.context);
      else if(record.kind==='DEADLINE'){assert.ok(replay);const result=advancePlanetDeadline(replay,record.context);assert.equal(result.advanced,true);replay=result.state;}
      else if(record.kind==='COMMAND'){assert.ok(replay);const result=applyPlanetCommand(replay,record.actorSeatId,record.request,record.context);assert.deepEqual(result.receipt,record.receipt);replay=result.state;}
    }
    assert.deepEqual(replay,target.state);assert.deepEqual(projectPlanetPublic(replay),projectPlanetPublic(target.state));
    for(const id of Object.keys(replay.roles))assert.deepEqual(projectPlanetPlayer(replay,id),projectPlanetPlayer(target.state,id));
    assert.equal((await h.service.runDeadline(job)).status,'unchanged');assert.deepEqual((await h.current()).state,target.state);
  });

  test(`${count}: all-bot sessions auto-ready but still receive reading and boarding windows`,async()=>{
    const h=await planetServiceHarness({count,humans:0,setupFlowVersion:2}),reading=await beginPlanetReading(h);
    assert.ok(reading.members.every(m=>m.ready));assert.equal(reading.setup.endsAt-h.now(),30_000);
    await h.deadline();const boarding=await h.current();assert.equal(boarding.status,'boarding');assert.equal(boarding.setup.endsAt-h.now(),10_000);
    assert.equal(boarding.state,null);assert.equal((await h.service.runBots(h.matchId)).accepted,0);
    await h.deadline();assert.equal((await h.current()).status,'running');
    assert.equal((await h.current()).state.phase.endsAt-h.now(),15_000);
  });
}

for(const status of ['lobby','choosing','reading','running'])test(`saved legacy ${status} stays on its original setup/art behavior after new creation defaults change`,async()=>{
  const h=await planetServiceHarness({humans:7,assetManifestVersion:'design-0.6.0'});
  if(status!=='lobby'){ok(await h.operation(h.host,'beginSetup',{matchId:h.matchId}));if(status!=='choosing')await h.deadline();}
  if(status==='running'){await readyPlanetHumans(h);await h.deadline();}
  const before=await h.current(),snapshot=await h.read(h.players[0]);
  assert.equal(Object.hasOwn(before,'setupFlowVersion'),false);assert.equal(Object.hasOwn(snapshot,'setupFlowVersion'),false);
  h.reload({setupFlowVersion:2,assetManifestVersion:'design-0.7.0'});
  const reloaded=await h.read(h.players[0]);assert.deepEqual(reloaded,snapshot);
  assert.deepEqual(LegacyPlanetSessionSnapshotSchema.parse(snapshot),snapshot);assert.deepEqual(LegacyPlanetSessionSnapshotSchema.parse(reloaded),snapshot);
  assert.equal((await h.current()).versions.assetManifestVersion,'design-0.6.0');
  if(status==='lobby')ok(await h.operation(h.host,'beginSetup',{matchId:h.matchId}));
  if(['lobby','choosing'].includes(status))await h.deadline();
  if(status!=='running'){await readyPlanetHumans(h);await h.deadline();assert.equal((await h.current()).status,'running');}
  assert.equal(Object.hasOwn(await h.current(),'setupFlowVersion'),false);
  for(const record of await currentPlanetJournal(h)){assert.equal(Object.hasOwn(record,'setupFlowVersion'),false);assert.notEqual(record.kind,'BOARDING_STARTED');}
});

test('creation retry preserves the saved legacy flow while a genuinely new request records flow 2 independently of artwork',async()=>{
  const h=await planetServiceHarness(),request={operation:'create',requestId:h.nextId(),playerCount:7};
  const original=await h.service.handle(h.host,request),old=ok(original);h.reload({setupFlowVersion:2,assetManifestVersion:'design-0.7.0'});
  assert.deepEqual(await h.service.handle(h.host,request),original);
  const oldSession=await h.store.transaction(tx=>tx.get('session/'+old.matchId));assert.equal(Object.hasOwn(oldSession,'setupFlowVersion'),false);assert.equal(oldSession.versions.assetManifestVersion,'design-0.6.0');
  const created=ok(await h.service.handle(h.host,{...request,requestId:h.nextId()})),next=await h.store.transaction(tx=>tx.get('session/'+created.matchId));
  assert.equal(next.setupFlowVersion,2);assert.equal(next.versions.assetManifestVersion,'design-0.7.0');
  const sameArt=await planetServiceHarness({setupFlowVersion:2,assetManifestVersion:'design-0.6.0'});assert.equal((await sameArt.current()).setupFlowVersion,2);
});

for(const version of [1,3,'2',null])test(`unsupported saved setup version ${JSON.stringify(version)} fails closed without mutating the session`,async()=>{
  const h=await planetServiceHarness(),session=await h.current();session.setupFlowVersion=version;
  await h.store.transaction(tx=>tx.set('session/'+h.matchId,session));
  denied(await h.invoke(h.host,'read',{matchId:h.matchId}),'UNAVAILABLE');denied(await h.invoke(h.host,'advance',{matchId:h.matchId}),'UNAVAILABLE');
  assert.deepEqual(await h.current(),session);
});

test('an acknowledged-lost last Ready retry returns its original receipt without restarting boarding',async()=>{
  const h=await planetServiceHarness({setupFlowVersion:2}),reading=await beginPlanetReading(h);h.setTime(reading.setup.endsAt);
  const request={operation:'ready',matchId:h.matchId,requestId:h.nextId()};h.store.loseNextAcknowledgement('operation/');
  denied(await h.service.handle(h.players[0],request),'UNAVAILABLE');const staged=await h.current();assert.equal(staged.status,'boarding');
  h.setTime(h.now()+2_000);ok(await h.service.handle(h.players[0],request));assert.deepEqual((await h.current()).setup,staged.setup);
  assert.equal((await currentPlanetJournal(h)).filter(r=>r.kind==='BOARDING_STARTED').length,1);
});


test('the frozen old strict parser refuses flow-2 packets instead of silently treating them as legacy',async()=>{
  const h=await planetServiceHarness({setupFlowVersion:2});
  const lobby=await h.read(h.players[0]);assert.equal(LegacyPlanetSessionSnapshotSchema.safeParse(lobby).success,false);
  await enterPlanetBoarding(h);const boarding=await h.read(h.players[0]);
  assert.equal(LegacyPlanetSessionSnapshotSchema.safeParse(boarding).success,false);
  const {setupFlowVersion,...missingVersion}=boarding;
  assert.equal(LegacyPlanetSessionSnapshotSchema.safeParse(missingVersion).success,false,'Old status and timer shapes must still reject boarding when its explicit version is stripped');
});
