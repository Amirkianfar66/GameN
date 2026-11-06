import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {before,after,test} from 'node:test';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {createFirestorePlanetStore} from '../dist/planet-store.js';
import {planetServiceHarness,adoptNativePlanetState,ok} from '../test/planet-service-helper.mjs';
import {navigationControl,branchedPanelControl} from '../test/planet-service-controls.mjs';
import {assertLocalEmulators} from '../../../infra/firebase/test/helpers.mjs';

let app,db;
before(()=>{assertLocalEmulators();app=initializeApp({projectId:'demo-mothership'},'planet-privacy-'+randomUUID());db=getFirestore(app);});
after(async()=>{await db?.terminate();if(app)await deleteApp(app);});

for(const count of [7,8,9]){
  test(`${count}: Firestore saves native P28 private choice without changing public/Captain reads or timer metadata`,async()=>{
    const h=await planetServiceHarness({store:createFirestorePlanetStore(db),count,humans:count}),d=navigationControl(count);
    const table=await h.admission(h.display,'display','Table');ok(await h.approve(table));await adoptNativePlanetState(h,d.state);
    const job=await h.currentJob();await h.service.dispatchDeadline(job.taskId,async()=>{});
    const deadlineHead=db.collection('planetDocuments').doc(createHash('sha256').update('deadline/'+job.taskId).digest('hex'));
    const timerBefore=await deadlineHead.get(),publicBefore=await h.read(h.display),captainBefore=await h.read(h.players[6]);
    const response=await h.command(h.players[3],{type:'CHOOSE_NAV_DIRECTION',direction:'Red'});assert.equal(ok(response.response).receipt.status,'accepted');
    assert.deepEqual(await h.read(h.display),publicBefore);assert.deepEqual(await h.read(h.players[6]),captainBefore);
    const timerAfter=await deadlineHead.get();assert.equal(timerAfter.updateTime.toMillis(),timerBefore.updateTime.toMillis());assert.deepEqual(timerAfter.data(),timerBefore.data());
    h.reload();assert.deepEqual(await h.read(h.display),publicBefore);assert.equal((await h.read(h.players[3])).playerView.privateNavigation.direction,null);
    await h.deadline();assert.equal((await h.current()).state.phase.kind,'NAV_CAPTAIN_CONFIRM');assert.equal((await h.read(h.players[6])).playerView.privateNavigation.direction,'Red');
  });

  test(`${count}: Firestore retains the selected native Blackhole world and private patient result through P27 and delayed vote opening`,async()=>{
    const h=await planetServiceHarness({store:createFirestorePlanetStore(db),count,humans:count}),{driver:d,branch}=branchedPanelControl(count);
    await adoptNativePlanetState(h,d.state);await h.deadline();const synced=(await h.current()).state;
    assert.equal(synced.phase.kind,'BLACKHOLE_PRESENTATION');assert.equal(synced.phase.endsAt-synced.phase.startedAt,6_000);
    assert.deepEqual(Object.keys(synced.worlds),[branch]);assert.equal(synced.worlds[branch].injectionsRemaining,0);
    const patient=await h.read(h.players[0]);assert.equal(patient.playerView.abilities.panelRequest.status,'DISCARDED');
    assert.equal((await h.read(h.players[3])).playerView.abilities.panelRequest,null);
    const publicBefore=(await h.read()).publicView;assert.equal(JSON.stringify(publicBefore).includes(branch),false);
    h.reload();assert.deepEqual((await h.current()).state,synced);assert.deepEqual((await h.read(h.players[0])).playerView,patient.playerView);
    const job=await h.currentJob();await h.deadline({late:50_000});const vote=(await h.current()).state;
    assert.equal(vote.phase.kind,'JAIL_VOTE');assert.equal(vote.phase.endsAt-h.now(),60_000);assert.deepEqual((await h.read()).publicView.events,publicBefore.events);
    assert.equal((await h.service.runDeadline(job)).status,'unchanged');assert.deepEqual((await h.current()).state,vote);
  });
}
