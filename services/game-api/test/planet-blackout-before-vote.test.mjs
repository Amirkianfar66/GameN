import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PLANET_BLACKOUT_ENGINE_PROFILE} from '@mothership/contracts';
import {planetServiceHarness,ok,denied} from './planet-service-helper.mjs';
import {adoptBlackoutServiceControl,assertBlackoutThroughFinalization,assertFullHospitalBeforeRescue} from './planet-blackout-service-control.mjs';

for(const count of [7,8,9]){
 for(const panel of [false,true])test(`${count}: full Hospital overflow is permanent before later ${panel?'reserved panel':'Doctor'} Rescue`,async()=>{
  const h=await planetServiceHarness({count,humans:count,engineProfile:PLANET_BLACKOUT_ENGINE_PROFILE});
  await assertFullHospitalBeforeRescue(h,{panel});
 });
 test(`${count}: service controls persist one split resolution, private choice and fresh vote/result through retries`,async()=>{
  const h=await planetServiceHarness({count,humans:count,engineProfile:PLANET_BLACKOUT_ENGINE_PROFILE});
  await assertBlackoutThroughFinalization(h,{retry:true});
 });
 test(`${count}: a lost accepted targeting acknowledgement recovers its durable receipt after the phase changes`,async()=>{
  const h=await planetServiceHarness({count,humans:count,engineProfile:PLANET_BLACKOUT_ENGINE_PROFILE});
  await adoptBlackoutServiceControl(h);await h.deadline();const before=(await h.current()).state;
  h.store.loseNextAcknowledgement('command/');
  const chosen=await h.command(h.players[2],{type:'SELECT_BLACKOUT_SLOT',windowId:before.phase.id,slotId:'A1'});
  denied(chosen.response,'UNAVAILABLE');const selected=structuredClone((await h.current()).state);
  const receipt=ok(await h.invoke(h.players[2],'receipt',{matchId:h.matchId,commandId:chosen.request.commandId})).receipt;
  assert.equal(receipt.status,'accepted');
  assert.deepEqual(ok(await h.invoke(h.players[2],'command',{request:chosen.request})).receipt,receipt);
  assert.deepEqual((await h.current()).state,selected);
  await h.deadline();const vote=structuredClone((await h.current()).state);
  assert.equal(vote.phase.kind,'JAIL_VOTE');
  assert.deepEqual(ok(await h.invoke(h.players[2],'command',{request:chosen.request})).receipt,receipt);
  assert.deepEqual((await h.current()).state,vote);
 });
 test(`${count}: lost deadline acknowledgement and repair retain one charged batch and one full vote outbox`,async()=>{
  const h=await planetServiceHarness({count,humans:count,engineProfile:PLANET_BLACKOUT_ENGINE_PROFILE});
  await adoptBlackoutServiceControl(h);const opening=(await h.current()).state,job=await h.currentJob();
  h.setTime(opening.phase.endsAt+31000);h.store.loseNextAcknowledgement('session/');
  await assert.rejects(h.service.runDeadline(job),/Synthetic lost transaction acknowledgement/);
  const committed=structuredClone(await h.current());assert.equal(committed.state.phase.kind,'JAIL_VOTE');
  assert.equal(committed.state.phase.endsAt-h.now(),60000);
  assert.equal((await h.service.runDeadline(job)).status,'unchanged');
  await h.service.repairDeadlines(async()=>{});assert.deepEqual((await h.current()).state,committed.state);
  const next=await h.currentJob(),outbox=await h.store.transaction(tx=>tx.get('deadline/'+next.taskId));
  assert.equal(outbox.endsAt,committed.state.phase.endsAt);
 });
}
