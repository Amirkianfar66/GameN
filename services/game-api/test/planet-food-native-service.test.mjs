import assert from 'node:assert/strict';
import {test} from 'node:test';
import {FOOD_TASK_TRANSPORT} from '@mothership/contracts';
import {applyPlanetFoodCommand,setPlanetFoodPresence,advancePlanetDeadline,encodePlanetGameState} from '@mothership/engine';
import {runHumanFoodJourney,setupNativeHumanFood,sendNativeFood,runNativeFoodWorkersThrough} from './planet-food-native-service-control.mjs';
import {ok} from './planet-service-helper.mjs';
import {currentPlanetJournal} from './planet-boarding-helper.mjs';

for(const count of [7,8,9])for(const control of ['WINCH','PANEL']){
 test(`${count}: native service setup, human ${control}, bot cooperation, cadence, fixed return, receipt restart and meal`,async()=>{
  const result=await runHumanFoodJourney({count,control});
  assert.equal(result.stats.restarted,true);
 });
}


function ownDown(snapshot){
 const t=snapshot.foodPlayerView.participantTask,g=t.ownGesture;assert.ok(g);
 return {type:'TASK_PRESS',taskId:t.taskId,controlSessionId:t.controlSessionId,expectedControlRevision:t.controlRevision,
  input:{kind:'HOLD',edge:'DOWN',gestureSequence:g.highestSequence+1,crateId:t.crate.id}};
}

test('native snapshot and invalid-input budget saturation cannot starve causal UP or exact own receipt recovery',async()=>{
 const {h,task,snapshot}=await setupNativeHumanFood({count:7,control:'WINCH'});
 await runNativeFoodWorkersThrough(h,task.runningAt);h.setTime(task.runningAt);
 const live=await h.read(h.players[0]),down=await sendNativeFood(h,live.foodPlayerView,ownDown(live));
 assert.equal(down.receipt.status,'accepted');
 let readLimited=false;
 for(let n=0;n<=FOOD_TASK_TRANSPORT.requestsPerMinute.snapshot;n++){
  const r=await h.invoke(h.players[0],'read',{matchId:h.matchId});
  if(!r.ok){assert.equal(r.error.code,'RATE_LIMITED');readLimited=true;break;}
 }
 assert.equal(readLimited,true,'actual fresh polling budget is enforced');
 let inputLimited=false;
 for(let n=0;n<=FOOD_TASK_TRANSPORT.requestsPerMinute.input;n++){
  const t=live.foodPlayerView.participantTask;
  const request={schemaVersion:1,protocolVersion:3,matchId:h.matchId,phaseId:live.foodPlayerView.phaseId,
   foodStepId:live.foodPlayerView.step.stepId,round:live.foodPlayerView.round,commandId:h.nextId(),
   command:{type:'TASK_PRESS',taskId:t.taskId,controlSessionId:t.controlSessionId,expectedControlRevision:t.controlRevision,input:{kind:'PANEL_LOCK'}}};
  const r=await h.invoke(h.players[0],'foodCommand',{request});
  if(!r.ok){assert.equal(r.error.code,'RATE_LIMITED');inputLimited=true;break;}
  assert.equal(r.result.receipt.status,'rejected');
 }
 assert.equal(inputLimited,true,'actual invalid-input flood is bounded');
 const up={...down.request.command,input:{...down.request.command.input,edge:'UP'}};
 const released=await sendNativeFood(h,live.foodPlayerView,up);assert.equal(released.receipt.status,'accepted');
 assert.equal(released.receipt.result.effect,'APPLIED');
 const retried=await h.invoke(h.players[0],'foodCommand',{request:released.request});assert.deepEqual(retried,released.response);
 const recovered=ok(await h.invoke(h.players[0],'foodReceipt',{matchId:h.matchId,commandId:released.request.commandId}));
 assert.deepEqual(recovered.receipt,released.receipt);
 const s=await h.current(),m=s.state.food.step.task;assert.equal(m.hold.holderSequence,null);assert.equal(m.crate.state,'FALLING');
});

test('native ordinary reads renew a living participant lease without heartbeat or fabricated release',async()=>{
 const {h,task}=await setupNativeHumanFood({count:7,control:'WINCH'});let holder=null;
 for(let offset=1000;offset<=12000;offset+=1000){
  const at=task.startedAt+offset;await runNativeFoodWorkersThrough(h,at);h.setTime(at);
  const snapshot=await h.read(h.players[0]),t=snapshot.foodPlayerView.participantTask;
  assert.equal(t.people.find(p=>p.seatId===snapshot.selfSeatId).online,true);
  assert.equal(t.outcome,null);
  if(offset===4000){const r=await sendNativeFood(h,snapshot.foodPlayerView,ownDown(snapshot));assert.equal(r.receipt.status,'accepted');holder=r.request.command.input.gestureSequence;}
  await h.service.runBots(h.matchId);
 }
 let current=await h.current();assert.equal(current.state.food.step.task.hold.holderSequence,holder);
 assert.equal(current.foodService.leases['seat-1'].expiresAt,task.startedAt+14000);
 await runNativeFoodWorkersThrough(h,task.startedAt+15000);h.setTime(task.startedAt+15000);
 current=await h.current();assert.equal(current.state.food.step.task.people.find(p=>p.seatId==='seat-1').online,false);
 const rejoined=await h.read(h.players[0]),t=rejoined.foodPlayerView.participantTask;
 assert.equal(t.people.find(p=>p.seatId===rejoined.selfSeatId).online,true);assert.equal(t.outcome,null);
 assert.equal(t.ownGesture.currentHolder.sequence,holder);
});

test('native offline fresh DOWN reconnect replays encoded engine state in actual journal order',async()=>{
 const {h,task,snapshot}=await setupNativeHumanFood({count:7,control:'WINCH'});
 // Keep the original own briefing offer; receiving DOWN after briefing is valid, even before its ack.
 await runNativeFoodWorkersThrough(h,task.startedAt+5000);h.setTime(task.startedAt+5000);
 const before=(await h.current()).state,prior=await currentPlanetJournal(h),last=prior.at(-1).sequence;
 assert.equal(before.food.step.task.people.find(p=>p.seatId==='seat-1').online,false);
 const sent=await sendNativeFood(h,snapshot.foodPlayerView,ownDown(snapshot));assert.equal(sent.receipt.status,'accepted');
 const after=(await h.current()).state,records=(await currentPlanetJournal(h)).filter(r=>r.sequence>last);
 assert.deepEqual(records.map(r=>r.kind),['FOOD_COMMAND','FOOD_PRESENCE']);
 assert.equal(records[0].context.now,task.startedAt+5000);assert.equal(records[1].context.now,task.startedAt+5000);
 let replay=before;
 for(const r of records){
  if(r.kind==='FOOD_COMMAND'){
   const transition=applyPlanetFoodCommand(replay,r.actorSeatId,r.request,r.context);assert.deepEqual(transition.receipt,r.receipt);replay=transition.state;
  }else if(r.kind==='FOOD_PRESENCE')replay=setPlanetFoodPresence(replay,r.actorSeatId,r.online,r.context);
  else if(r.kind==='DEADLINE')replay=advancePlanetDeadline(replay,r.context).state;
 }
 assert.deepEqual(encodePlanetGameState(replay),encodePlanetGameState(after));
 assert.equal(after.food.step.task.hold.holderSequence,1);assert.equal(after.food.step.task.people.find(p=>p.seatId==='seat-1').online,true);
 h.reload();const lookup=ok(await h.invoke(h.players[0],'foodReceipt',{matchId:h.matchId,commandId:sent.request.commandId}));assert.deepEqual(lookup.receipt,sent.receipt);
});


test('native host abort archives active Task, clears views/scheduler and retains exact own receipt recovery',async()=>{
 const {h,task}=await setupNativeHumanFood({count:7,control:'WINCH'});
 await runNativeFoodWorkersThrough(h,task.runningAt);h.setTime(task.runningAt);
 const snapshot=await h.read(h.players[0]),held=await sendNativeFood(h,snapshot.foodPlayerView,ownDown(snapshot));
 assert.equal(held.receipt.status,'accepted');
 const current=await h.current(),stale=current.foodService.scheduler;assert.ok(stale);
 assert.equal(current.state.food.step.task.stage,'ACTIVE');
 h.setTime(h.now()+1);ok(await h.operation(h.host,'abort',{matchId:h.matchId}));
 const aborted=await h.current();assert.equal(aborted.status,'aborted');assert.equal(aborted.state.phase.kind,'ABORTED');
 assert.equal(aborted.foodService.scheduler,null);
 for(const uid of [h.host,h.players[0]]){
  const v=await h.read(uid);assert.equal(v.status,'aborted');
  for(const field of ['publicView','playerView','foodPublicView','foodPlayerView'])assert.equal(v[field],null,field);
 }
 h.reload();const receipt=ok(await h.invoke(h.players[0],'foodReceipt',{matchId:h.matchId,commandId:held.request.commandId}));
 assert.deepEqual(receipt.receipt,held.receipt);
 assert.deepEqual(await h.invoke(h.players[0],'foodCommand',{request:held.request}),held.response);
 h.setTime(Math.max(h.now(),stale.endsAt)+60000);
 assert.equal((await h.service.runDeadline({matchId:h.matchId,phaseId:stale.phaseId,deadlineToken:stale.token,kind:'game'})).status,'unchanged');
 assert.deepEqual(encodePlanetGameState((await h.current()).state),encodePlanetGameState(aborted.state));
});
