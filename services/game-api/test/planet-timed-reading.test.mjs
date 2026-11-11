import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createPlanetService} from '../dist/planet-game.js';
import {planetServiceHarness,ok,denied} from './planet-service-helper.mjs';
import {beginPlanetReading,currentPlanetJournal} from './planet-boarding-helper.mjs';
import {enterTimedPlanetBoarding} from './planet-timed-reading-helper.mjs';

for(const count of [7,8,9]){
  test(`${count}: timed reading publishes one admitted interval and requires a fresh human Ready after all thirty seconds`,async()=>{
    const h=await planetServiceHarness({count,humans:2,setupFlowVersion:3}),pendingUid=h.nextId();
    await h.admission(pendingUid,'display','Pending');ok(await h.approve(await h.admission(h.display,'display','Table')));
    const reading=await beginPlanetReading(h),job=await h.currentJob();
    const interval={id:reading.setup.id,startedAt:reading.setup.startedAt,roleFilmStartsAt:reading.setup.startedAt+20_000,endsAt:reading.setup.startedAt+30_000};
    assert.equal(reading.setup.startedAt,h.now());assert.equal(reading.setup.roleFilmStartsAt,interval.roleFilmStartsAt);assert.equal(reading.setup.endsAt,interval.endsAt);
    const own=await h.read(h.players[0]);assert.ok(own.privateRole);
    for(const uid of [h.host,h.display,h.players[0],h.players[1]]){
      const view=await h.read(uid);assert.equal(view.setupFlowVersion,3);assert.deepEqual(view.setup,interval);
      assert.equal(view.publicView,null);assert.equal(view.playerView,null);
      if(uid===h.host||uid===h.display)assert.equal(view.privateRole,null);
      assert.equal(JSON.stringify(view).includes(reading.setup.token),false);
    }
    const pending=await h.read(pendingUid);assert.equal(pending.setup,null);assert.equal(pending.privateRole,null);assert.deepEqual(pending.members,[]);
    const ready={operation:'ready',matchId:h.matchId,requestId:h.nextId()};
    for(const elapsed of [0,19_999,20_000,29_999]){
      h.setTime(interval.startedAt+elapsed);denied(await h.service.handle(h.players[0],ready),'NOT_ALLOWED');
      assert.deepEqual((await h.current()).setup,reading.setup);assert.equal((await h.current()).members[0].ready,false);
    }
    assert.equal((await h.service.runDeadline(job)).status,'too-early');
    for(const operation of ['skipRoleFilm','completeRoleFilm'])denied(await h.invoke(h.players[0],operation,{matchId:h.matchId}),'INVALID_REQUEST');
    h.setTime(interval.endsAt);assert.equal((await h.service.runDeadline(job)).status,'unchanged');
    assert.equal((await h.current()).status,'reading','Elapsed time and bot readiness cannot replace either human confirmation');
    ok(await h.service.handle(h.players[0],ready));assert.equal((await h.current()).status,'reading');
    ok(await h.operation(h.players[1],'ready',{matchId:h.matchId}));const boarded=await h.current();
    assert.equal(boarded.status,'boarding');assert.equal(boarded.setup.startedAt,h.now());assert.equal(boarded.setup.endsAt,h.now()+10_000);
    assert.equal(Object.hasOwn(boarded.setup,'roleFilmStartsAt'),false);assert.deepEqual(boarded.prepared,reading.prepared);
    assert.equal((await h.service.runDeadline(job)).status,'unchanged');
  });

  test(`${count}: timed reading recovery and configuration changes retain the own role, interval and overdue human gate`,async()=>{
    const h=await planetServiceHarness({count,setupFlowVersion:3}),reading=await beginPlanetReading(h),role=(await h.read(h.players[0])).privateRole;
    const recovery=ok(await h.operation(h.host,'issueRecovery',{matchId:h.matchId,seatId:'seat-1'})),uid=h.nextId();
    h.setTime(reading.setup.roleFilmStartsAt+4_000);
    const redeem={operation:'redeemRecovery',matchId:h.matchId,requestId:h.nextId(),recoveryCode:recovery.recoveryCode};
    const accepted=await h.service.handle(uid,redeem);ok(accepted);assert.deepEqual(await h.service.handle(uid,redeem),accepted);
    h.reload({setupFlowVersion:1,assetManifestVersion:'design-0.7.0'});
    const restored=await h.read(uid);assert.equal(restored.setupFlowVersion,3);assert.deepEqual(restored.privateRole,role);
    assert.deepEqual(restored.setup,{id:reading.setup.id,startedAt:reading.setup.startedAt,roleFilmStartsAt:reading.setup.roleFilmStartsAt,endsAt:reading.setup.endsAt});
    denied(await h.invoke(h.players[0],'read',{matchId:h.matchId}));
    h.setTime(reading.setup.endsAt+120_000);assert.equal((await h.read(uid)).status,'reading');
    assert.equal((await h.current()).members[0].ready,false);ok(await h.operation(uid,'ready',{matchId:h.matchId}));
    const boarded=await h.current(),job=await h.currentJob();assert.equal(boarded.setup.endsAt,h.now()+10_000);
    assert.deepEqual(boarded.prepared,reading.prepared);ok(await h.operation(h.host,'abort',{matchId:h.matchId}));
    const aborted=await h.current();assert.equal(aborted.status,'aborted');assert.equal(aborted.setup,null);assert.equal(aborted.state,null);
    assert.equal((await h.service.runDeadline(job)).status,'unchanged');assert.deepEqual(await h.current(),aborted);
  });

  test(`${count}: timed last Ready survives a lost acknowledgement, duplicate clients and stale reading delivery once`,async()=>{
    const h=await planetServiceHarness({count,humans:2,setupFlowVersion:3}),reading=await beginPlanetReading(h),readingJob=await h.currentJob();
    h.setTime(reading.setup.endsAt+37_000);ok(await h.operation(h.players[0],'ready',{matchId:h.matchId}));
    const request={operation:'ready',matchId:h.matchId,requestId:h.nextId()};h.store.loseNextAcknowledgement('operation/');
    denied(await h.service.handle(h.players[1],request),'UNAVAILABLE');const boarded=await h.current();assert.equal(boarded.status,'boarding');
    h.setTime(h.now()+2_000);const second=createPlanetService(h.options);
    const [first,duplicate]=await Promise.all([h.service.handle(h.players[1],request),second.handle(h.players[1],request),second.runDeadline(readingJob)]);
    ok(first);assert.deepEqual(first,duplicate);assert.deepEqual((await h.current()).setup,boarded.setup);
    assert.equal((await currentPlanetJournal(h)).filter(record=>record.kind==='BOARDING_STARTED').length,1);
    const boardingJob=await h.currentJob();h.setTime(boarded.setup.endsAt+90_000);
    await Promise.all([second.runDeadline(boardingJob),h.service.repairDeadlines(async()=>{}),h.service.runDeadline(boardingJob)]);
    const started=await h.current();assert.equal(started.status,'running');assert.equal(started.state.phase.kind,'PRE_TURN');
    assert.equal(started.state.phase.startedAt,h.now());assert.equal(started.state.phase.endsAt,h.now()+15_000);
    assert.deepEqual(started.state.roles,reading.preparedState.roles);
    await h.deadline({late:12_000});const firstTurn=(await h.current()).state;
    assert.equal(firstTurn.phase.kind,'ORDINARY_TURN');assert.equal(firstTurn.phase.startedAt,h.now());assert.equal(firstTurn.phase.endsAt,h.now()+60_000);
    assert.equal((await h.service.runDeadline(boardingJob)).status,'unchanged');assert.deepEqual((await h.current()).state,firstTurn);
    assert.equal((await currentPlanetJournal(h)).filter(record=>record.kind==='INITIALIZE').length,1);
    for(const record of await currentPlanetJournal(h))assert.equal(record.setupFlowVersion,3);
  });

  test(`${count}: timed all-bot matches keep all thirty reading seconds and the separate ten-second boarding stage`,async()=>{
    const h=await planetServiceHarness({count,humans:0,setupFlowVersion:3}),reading=await beginPlanetReading(h);
    assert.ok(reading.members.every(member=>member.ready));const job=await h.currentJob();
    h.setTime(reading.setup.endsAt-1);assert.equal((await h.service.runDeadline(job)).status,'too-early');
    await h.deadline({late:8_000});const boarded=await h.current();assert.equal(boarded.status,'boarding');assert.equal(boarded.setup.endsAt,h.now()+10_000);
    await h.deadline();assert.equal((await h.current()).status,'running');
  });
}

for(const corruption of ['missing-start','negative-start','unsafe-start','missing-film','film-offset','end-offset','missing-token','missing-prepared','missing-prepared-state','running-state','incomplete-roster','missing-character']){
  test(`corrupt timed reading (${corruption}) fails closed without acknowledging its durable task`,async()=>{
    const h=await planetServiceHarness({setupFlowVersion:3}),session=await beginPlanetReading(h),job=await h.currentJob(),jobKey='deadline/'+job.taskId;
    const beforeJob=await h.store.transaction(tx=>tx.get(jobKey));
    if(corruption==='missing-start')delete session.setup.startedAt;
    else if(corruption==='negative-start')session.setup.startedAt=-1;
    else if(corruption==='unsafe-start')session.setup.startedAt=Number.MAX_SAFE_INTEGER+1;
    else if(corruption==='missing-film')delete session.setup.roleFilmStartsAt;
    else if(corruption==='film-offset')session.setup.roleFilmStartsAt++;
    else if(corruption==='end-offset')session.setup.endsAt++;
    else if(corruption==='missing-token')delete session.setup.token;
    else if(corruption==='missing-prepared')session.prepared=null;
    else if(corruption==='missing-prepared-state')session.preparedState=null;
    else if(corruption==='running-state')session.state=structuredClone(session.preparedState);
    else if(corruption==='incomplete-roster')session.members.pop();
    else session.members[0].characterId=null;
    await h.store.transaction(tx=>tx.set('session/'+h.matchId,session));h.setTime(session.setup.endsAt+1_000);
    denied(await h.invoke(h.host,'read',{matchId:h.matchId}),'UNAVAILABLE');
    await assert.rejects(h.service.runDeadline(job),/Invalid saved Planet timed reading stage/);
    assert.deepEqual(await h.current(),session);assert.deepEqual(await h.store.transaction(tx=>tx.get(jobKey)),beforeJob);
  });
}

test('timed reading markers are rejected in boarding and historical reading saves',async()=>{
  for(const setupFlowVersion of [undefined,2,3]){
    const h=await planetServiceHarness({setupFlowVersion});
    if(setupFlowVersion===3)await enterTimedPlanetBoarding(h);else await beginPlanetReading(h);
    const session=await h.current();session.setup.roleFilmStartsAt=h.now();
    await h.store.transaction(tx=>tx.set('session/'+h.matchId,session));
    denied(await h.invoke(h.host,'read',{matchId:h.matchId}),'UNAVAILABLE');assert.deepEqual(await h.current(),session);
  }
});
