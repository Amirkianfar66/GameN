import assert from 'node:assert/strict';
import {test} from 'node:test';
import {FOOD_TASK_TRANSPORT} from '@mothership/contracts';
import {applyPlanetFoodCommand,setPlanetFoodPresence,advancePlanetDeadline,encodePlanetGameState,planetDeadlineAt,projectPlanetFoodPlayer} from '@mothership/engine';
import {chooseFoodBotInput,canAdmitFoodBotPanelLock} from '../dist/food-bot-policy.js';
import {runHumanFoodJourney,setupNativeHumanFood,sendNativeFood,runNativeFoodWorkersThrough} from './planet-food-native-service-control.mjs';
import {ok,memoryPlanetStore} from './planet-service-helper.mjs';
import {currentPlanetJournal} from './planet-boarding-helper.mjs';

for(const count of [7,8,9])for(const control of ['WINCH','PANEL']){
 test(`${count}: native service setup, human ${control}, bot cooperation, cadence, fixed return, receipt restart and meal`,async()=>{
  const result=await runHumanFoodJourney({count,control});
  assert.equal(result.stats.restarted,true);
 });
}

for(const age of [150,200,250,3000])test(`native planned Lock delayed${age}ms drains real warnings then keeps only a currently safe request`,async context=>{
 const store=memoryPlanetStore(),transaction=store.transaction.bind(store),retry=new Error('Synthetic targeted SDK retry');
 let armed=false,h,proposal;
 store.transaction=operation=>transaction(async tx=>{
  let lock;
  const result=await operation({...tx,set:(key,value)=>{
   if(armed&&key.startsWith('foodBotIntent/')&&value.request?.request?.command?.input?.kind==='PANEL_LOCK')lock=value.request.request;
   tx.set(key,value);
  }});
  if(lock){
   armed=false;const s=await tx.get('session/'+h.matchId);
   proposal={request:structuredClone(lock),plannedAt:h.now(),dueAt:planetDeadlineAt(s.state)};
   h.setTime(h.now()+age);throw retry;
  }
  return result;
 }).catch(error=>{if(error!==retry)throw error;return transaction(operation);});
 const setup=await setupNativeHumanFood({control:'WINCH',store});h=setup.h;const task=setup.task;
 await runNativeFoodWorkersThrough(h,task.runningAt);h.setTime(task.runningAt);
 const live=await h.read(h.players[0]);await sendNativeFood(h,live.foodPlayerView,chooseFoodBotInput(live.foodPlayerView).command);
 await runNativeFoodWorkersThrough(h,task.runningAt+450);h.setTime(task.runningAt+450);await h.service.runBots(h.matchId);
 const before=await h.current();assert.equal(before.state.food.step.task.panel.locked,false);
 const goalAt=before.state.food.step.task.panel.anchorAt+1000;h.setTime(goalAt);armed=true;
 const result=await h.service.runBots(h.matchId);assert.ok(proposal);assert.equal(proposal.plannedAt,goalAt);
 assert.ok(proposal.dueAt>goalAt&&proposal.dueAt<=goalAt+age,'a real warning boundary becomes due during transport');
 const current=await h.current(),view=projectPlanetFoodPlayer(current.state,task.panelSeatId,h.now());
 assert.ok(planetDeadlineAt(current.state)>h.now(),'canonical warning was drained before the next proposal');
 const journal=await currentPlanetJournal(h),locks=journal.filter(r=>r.kind==='FOOD_COMMAND'&&r.request.command.input?.kind==='PANEL_LOCK');
 if(age<250){
  assert.ok(result.accepted>0);assert.equal(current.state.food.step.task.panel.locked,true);assert.equal(current.state.food.step.task.panel.stop,5);
  assert.equal(locks.length,1);assert.deepEqual(locks[0].request,proposal.request,'retry retains the exact uncommitted request and command ID');
  assert.equal(locks[0].receipt.receivedAt,goalAt+age);assert.equal(locks[0].context.now,goalAt+age);
  const warnings=journal.filter(r=>r.kind==='DEADLINE'&&r.context.now>goalAt&&r.context.now<=goalAt+age);
  assert.ok(warnings.length>=2);assert.ok(warnings.every(r=>r.sequence<locks[0].sequence),'original warning boundaries precede the admitted Lock');
 }else if(age===3000){
  assert.ok(result.accepted>0);assert.equal(locks.length,1);
  assert.notEqual(locks[0].request.commandId,proposal.request.commandId,'the expired first proposal is not revived on the next rail pass');
  assert.equal(locks[0].receipt.receivedAt,goalAt+age);
  assert.equal(current.state.food.step.task.panel.stop,5);
 }else{
  assert.equal(result.accepted,0);assert.equal(current.state.food.step.task.panel.locked,false);assert.equal(locks.length,0);
  assert.equal(canAdmitFoodBotPanelLock(view,proposal.request.command),false);
  const nextGoalAt=goalAt+500;h.setTime(nextGoalAt);await h.service.runBots(h.matchId);
  const later=(await currentPlanetJournal(h)).filter(r=>r.kind==='FOOD_COMMAND'&&r.request.command.input?.kind==='PANEL_LOCK');
  assert.equal(later.length,1);assert.notEqual(later[0].request.commandId,proposal.request.commandId,'a later pass gets a new proposal');
  assert.equal(later[0].receipt.receivedAt,nextGoalAt);
 }
 context.diagnostic(JSON.stringify({proposalAgeMs:age,plannedOffset:goalAt-task.startedAt,warningOffset:proposal.dueAt-task.startedAt,
  actualOffset:goalAt+age-task.startedAt,drainedOffsets:journal.filter(r=>r.kind==='DEADLINE'&&r.context.now>goalAt).map(r=>r.context.now-task.startedAt),
  warningDrained:true,retainedRequestAccepted:age<250,lockInputs:locks.length}));
});


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
 const contact=await h.store.transaction(tx=>tx.get('foodContact/'+h.matchId)),renewedUntil=task.startedAt+14000;
 assert.deepEqual(contact['seat-1'],{taskId:task.taskId,bindingRevision:current.members.find(m=>m.seatId==='seat-1').bindingRevision,
  admittedAt:task.startedAt+12000,expiresAt:renewedUntil});
 assert.ok(current.foodService.leases['seat-1'].expiresAt<=renewedUntil,'Session is a cached baseline, private contact is the live renewal');
 await runNativeFoodWorkersThrough(h,renewedUntil-1);h.setTime(renewedUntil-1);
 current=await h.current();assert.equal(current.state.food.step.task.people.find(p=>p.seatId==='seat-1').online,true);
 assert.equal(current.state.food.step.task.hold.holderSequence,holder);
 await runNativeFoodWorkersThrough(h,renewedUntil);h.setTime(renewedUntil);
 current=await h.current();assert.equal(current.state.food.step.task.people.find(p=>p.seatId==='seat-1').online,false);
 assert.equal(current.state.food.step.task.hold.holderSequence,holder,'technical absence never fabricates a release');
 const absences=(await currentPlanetJournal(h)).filter(r=>r.kind==='FOOD_PRESENCE'&&r.actorSeatId==='seat-1'&&!r.online);
 assert.equal(absences.length,1);assert.equal(absences[0].context.now,renewedUntil,'canonical absence is recorded at the renewed expiry');
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
