import assert from 'node:assert/strict';
import {test} from 'node:test';
import {planetWorldDriver,prepareBlackholeRound,moveAcross,currentWorld} from '../../../packages/engine/test/planet-world-helper.mjs';
import {planetServiceHarness,adoptNativePlanetState,ok} from './planet-service-helper.mjs';
import {navigationControl} from './planet-service-controls.mjs';

for(const count of [7,8,9]){
  test(`${count}: service-seeded native P28 history hides early Officer choice from public, Captain and bystander reads through reload`,async()=>{
    const d=navigationControl(count),h=await planetServiceHarness({count,humans:count});
    const table=await h.admission(h.display,'display','Table');ok(await h.approve(table));await adoptNativePlanetState(h,d.state);
    const job=await h.currentJob();await h.service.dispatchDeadline(job.taskId,async()=>{});
    const outboxBefore=await h.store.transaction(tx=>tx.get('deadline/'+job.taskId));
    const before=await Promise.all([h.read(h.display),h.read(h.players[6]),h.read(h.players[2])]);
    const setting=structuredClone((await h.current()).state.phase);
    assert.equal(setting.endsAt-setting.startedAt,15_000);assert.equal((await h.read(h.players[3])).playerView.privateNavigation.tieChoice,true);
    const {response}=await h.command(h.players[3],{type:'CHOOSE_NAV_DIRECTION',direction:'Red'});assert.equal(ok(response).receipt.status,'accepted');
    assert.deepEqual(await Promise.all([h.read(h.display),h.read(h.players[6]),h.read(h.players[2])]),before);
    const saved=(await h.current()).state;assert.deepEqual(saved.phase,setting);assert.equal(saved.deadlineToken,job.deadlineToken);
    assert.equal((await h.read(h.players[3])).playerView.privateNavigation.direction,null);
    assert.deepEqual(await h.store.transaction(tx=>tx.get('deadline/'+job.taskId)),outboxBefore,'A hidden choice must not reset the existing outbox task or its retry metadata');
    h.reload();assert.deepEqual(await Promise.all([h.read(h.display),h.read(h.players[6]),h.read(h.players[2])]),before);
    h.setTime(setting.endsAt-1);assert.equal((await h.service.runDeadline(job)).status,'too-early');
    h.setTime(setting.endsAt);assert.equal((await h.service.runDeadline(job)).status,'advanced');
    assert.equal((await h.current()).state.phase.kind,'NAV_CAPTAIN_CONFIRM');
    assert.equal((await h.read(h.players[6])).playerView.privateNavigation.direction,'Red');
    assert.equal((await h.read(h.players[2])).playerView.privateNavigation,null);
  });

  test(`${count}: service-seeded native branched P27 history preserves selected costs, separate Promise opportunities and delayed full vote`,async()=>{
    const d=prepareBlackholeRound(planetWorldDriver(count),{patient:true}),branch=moveAcross(d,'seat-2');
    d.command('seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-2'});
    d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-2');d.command('seat-2',{type:'RESCUE',targetSeatId:'seat-1'});
    d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-3');
    d.command('seat-3',{type:'REQUEST_HACK',targetSeatId:'seat-5'});d.deadline();d.command('seat-5',{type:'DECLARE_HACK_SIDE',declaredSide:'Red'});d.deadline();
    for(const [giver,recipient,kind,targetSeatId] of [['seat-3','seat-5','MEET_A',null],['seat-5','seat-3','JAIL_VOTE','seat-4']]){
      const offer=d.command(giver,{type:'OFFER_PROMISE',recipientSeatId:recipient,kind,targetSeatId});
      d.command(recipient,{type:'ACCEPT_PROMISE',promiseId:offer.receipt.commandId});
    }
    d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId===d.ids.at(-1));
    const h=await planetServiceHarness({count,humans:count});await adoptNativePlanetState(h,d.state);await h.deadline();
    const synced=(await h.current()).state;assert.equal(synced.phase.kind,'BLACKHOLE_PRESENTATION');assert.equal(synced.phase.endsAt-synced.phase.startedAt,6_000);
    assert.equal(synced.currentWorldId,branch);assert.deepEqual(Object.keys(synced.worlds),[branch]);assert.equal(currentWorld({state:synced}).injectionsRemaining,0);
    assert.deepEqual(synced.global.promises.map(p=>p.status),['Pending','Pending']);
    const patient=await h.read(h.players[0]),bystander=await h.read(h.players[3]),publicBefore=(await h.read()).publicView;
    assert.equal(patient.playerView.abilities.panelRequest.status,'DISCARDED');assert.equal(bystander.playerView.abilities.panelRequest,null);
    assert.equal(JSON.stringify(publicBefore).includes('panelRequest'),false);assert.equal(JSON.stringify(publicBefore).includes(branch),false);
    const saved=structuredClone(synced),job=await h.currentJob();h.reload();assert.deepEqual((await h.current()).state,saved);
    h.setTime(synced.phase.endsAt-1);assert.equal((await h.service.runDeadline(job)).status,'too-early');
    h.setTime(synced.phase.endsAt+43_000);assert.equal((await h.service.runDeadline(job)).status,'advanced');
    const vote=(await h.current()).state;assert.equal(vote.phase.kind,'JAIL_VOTE');assert.equal(vote.phase.startedAt,h.now());assert.equal(vote.phase.endsAt-h.now(),60_000);
    assert.deepEqual(vote.global.promises.map(p=>p.status),['Fulfilled','Pending'],'Meeting evaluates at vote opening; Jail-vote Promise still waits for actual ballot closure');
    assert.deepEqual((await h.read()).publicView.events,publicBefore.events,'The Sync event is not restamped at vote opening');
    const result=await h.command(h.players[4],{type:'VOTE',targetSeatId:'seat-4'});assert.equal(ok(result.response).receipt.status,'accepted');
    await h.deadline();assert.deepEqual((await h.current()).state.global.promises.map(p=>p.status),['Fulfilled','Fulfilled']);
    assert.equal((await h.service.runDeadline(job)).status,'unchanged');
  });
}
