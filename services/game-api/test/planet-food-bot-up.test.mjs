// Native-engine/memory-store controls isolate orchestration delay. Genuine
// Firestore and actual-time delivery verification are separate.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as engine from '@mothership/engine';
import {FOOD_TASK_TRANSPORT} from '@mothership/contracts';
import {chooseFoodBotInput} from '../dist/food-bot-policy.js';
import {memoryPlanetStore} from './planet-service-helper.mjs';
import {currentPlanetJournal} from './planet-boarding-helper.mjs';
import {setupNativeHumanFood,sendNativeFood,runNativeFoodWorkersThrough} from './planet-food-native-service-control.mjs';

const isUp=command=>command?.type==='TASK_PRESS'&&command.input.kind==='HOLD'&&command.input.edge==='UP';
const entries=h=>h.store.export().filter(([key])=>key.startsWith('foodIngress/')).map(([,entry])=>entry);
const upEntries=h=>entries(h).filter(entry=>isUp(entry.request?.request?.command));

function effectiveHumanExpiry(h,s,seatId,at){
  const lease=s.foodService?.leases[seatId],member=s.members.find(m=>m.seatId===seatId&&m.controller==='human');
  const task=engine.projectPlanetFoodPlayer(s.state,seatId,at).participantTask,person=task?.people.find(p=>p.seatId===seatId);
  if(!lease||lease.offline||!member||lease.taskId!==task?.taskId||!person?.alive||!person.online)return null;
  const contact=h.store.export().find(([key])=>key==='foodContact/'+h.matchId)?.[1]?.[seatId];
  const current=contact&&contact.taskId===lease.taskId&&contact.bindingRevision===member.bindingRevision
    &&Number.isSafeInteger(contact.admittedAt)&&Number.isSafeInteger(contact.expiresAt)
    &&contact.expiresAt-contact.admittedAt===FOOD_TASK_TRANSPORT.presenceLeaseMs&&contact.admittedAt<=at;
  return Math.max(lease.expiresAt,current?contact.expiresAt:0);
}

async function heldAtSafeRelease({count=7,mode='NONE',delayMs=200,boundary=null}={}){
  const store=memoryPlanetStore(),transaction=store.transaction.bind(store),retry=new Error('Targeted uncommitted UP admission retry');
  let h,armed=false,clockAcknowledgment=null,speculativeUp=null,delays=0;
  const ownViews=[];
  store.transaction=operation=>transaction(async tx=>{
    let clockEntry=null,upEntry=null;
    const result=await operation({...tx,set:(key,value)=>{
      if(armed&&key.startsWith('foodIngress/')&&value.response===null){
        if(value.request===null)clockEntry=structuredClone(value);
        if(isUp(value.request?.request?.command))upEntry=structuredClone(value);
      }
      tx.set(key,value);
    }});
    if(armed&&mode==='ADMISSION'&&upEntry){
      // Fail before the memory transaction commits, then let the existing SDK-
      // retry-shaped control rerun the SAME operation at its new actual clock.
      armed=false;delays++;speculativeUp=upEntry;
      h.setTime(h.now()+delayMs);throw retry;
    }
    return {result,clockEntry};
  }).then(({result,clockEntry})=>{
    if(armed&&mode==='CLOCK_ACK'&&clockEntry){
      // The canonical CLOCK is already durable. Only its caller's acknowledgment
      // is delayed; the Entry context/time must remain its original value.
      armed=false;delays++;clockAcknowledgment=clockEntry;
      h.setTime(h.now()+delayMs);
    }
    return result;
  }).catch(error=>{
    if(error!==retry)throw error;
    return transaction(operation);
  });
  const setup=await setupNativeHumanFood({count,control:'PANEL',store});h=setup.h;const task=setup.task;
  // Keep the real human's transport contact alive while briefing elapses.
  for(const offset of [1500,2800]){h.setTime(task.startedAt+offset);await h.read(h.players[0]);}
  await runNativeFoodWorkersThrough(h,task.runningAt);h.setTime(task.runningAt);
  await h.service.runBots(h.matchId);
  await runNativeFoodWorkersThrough(h,task.runningAt+450);h.setTime(task.runningAt+450);
  let human=await h.read(h.players[0]);
  assert.equal(human.foodPlayerView.participantTask.crate.state,'HELD');
  const release=chooseFoodBotInput(human.foodPlayerView).command;assert.equal(release?.input.kind,'PANEL_RELEASE');
  assert.equal((await sendNativeFood(h,human.foodPlayerView,release)).receipt.status,'accepted');
  h.setTime(h.now()+1000);human=await h.read(h.players[0]);
  const lock=chooseFoodBotInput(human.foodPlayerView).command;assert.equal(lock?.input.kind,'PANEL_LOCK');
  assert.equal((await sendNativeFood(h,human.foodPlayerView,lock)).receipt.status,'accepted');
  const lockAt=h.now();
  // Real human reads drain the initial DROP warning boundaries without running
  // the bot driver. Select a later crossing where no engine/presence work is due.
  if(boundary!=='WARNING')for(const offset of [1500,3000]){h.setTime(lockAt+offset);await h.read(h.players[0]);}
  let current=await h.current(),safeAt=null,proposal=null;
  const [start,end]=boundary==='WARNING'?[1000,1800]:boundary==='PRESENCE'?[5200,6600]:[3200,4600];
  for(let at=lockAt+start;at<Math.min(lockAt+end,task.deadlineAt-delayMs);at++){
    // A policy crossing alone is insufficient: reject a candidate if engine or
    // effective human presence work can become due anywhere in the delay.
    const due=engine.planetDeadlineAt(current.state),expiry=effectiveHumanExpiry(h,current,human.selfSeatId,at);
    if(boundary==='WARNING'){
      if(due===null||due>at||engine.hasOnlyDuePlanetFoodWarnings(current.state,at)!==true||expiry===null||expiry<=at+delayMs)continue;
    }else if(boundary==='PRESENCE'){
      if(due!==null&&due<=at+delayMs||expiry===null||expiry>at)continue;
    }else if(due!==null&&due<=at+delayMs||expiry===null||expiry<=at+delayMs)continue;
    const command=chooseFoodBotInput(engine.projectPlanetFoodPlayer(current.state,task.winchSeatId,at)).command;
    const later=chooseFoodBotInput(engine.projectPlanetFoodPlayer(current.state,task.winchSeatId,at+delayMs)).command;
    if(isUp(command)&&!isUp(later)){safeAt=at;proposal=command;break;}
  }
  assert.ok(safeAt!==null,'no policy-safe crossing meeting the boundary/presence precondition was found');
  h.setTime(safeAt);if(boundary===null)await h.read(h.players[0]);current=await h.current();
  const before=engine.projectPlanetFoodPlayer(current.state,task.winchSeatId,safeAt);
  assert.equal(before.participantTask.stage,'ACTIVE');assert.equal(before.participantTask.panel.stop,5);
  assert.equal(before.participantTask.crate.state,'HELD');assert.equal(before.participantTask.crate.motion,null);
  assert.deepEqual(chooseFoodBotInput(before).command,proposal);
  assert.equal(chooseFoodBotInput(engine.projectPlanetFoodPlayer(current.state,task.winchSeatId,safeAt+delayMs)).command,null);
  const due=engine.planetDeadlineAt(current.state);
  if(boundary==='WARNING')assert.equal(engine.hasOnlyDuePlanetFoodWarnings(current.state,safeAt),true);
  else assert.ok(due===null||due>safeAt+delayMs,'a due engine warning/motion must not explain this fixture');
  const effectiveExpiry=effectiveHumanExpiry(h,current,human.selfSeatId,safeAt);
  if(boundary==='PRESENCE')assert.ok(effectiveExpiry<=safeAt);
  else assert.ok(effectiveExpiry>safeAt+delayMs,
    'matching active baseline or newer valid contact keeps human presence effective through delay');
  const originalProject=h.options.engine.projectPlanetFoodPlayer;
  h.reload({engine:{...h.options.engine,projectPlanetFoodPlayer:(state,actor,at)=>{
    const view=originalProject(state,actor,at);
    if(actor===task.winchSeatId){
      const command=chooseFoodBotInput(view).command;
      ownViews.push({at,up:isUp(command),beforeClockAcknowledgment:clockAcknowledgment===null});
    }
    return view;
  }}});
  const baseline=entries(h).length;armed=true;
  return {h,task,safeAt,proposal,baseline,ownViews,effectiveExpiry,
    details:()=>({delays,clockAcknowledgment,speculativeUp})};
}

for(const count of [7,8,9])test(`${count}: native bot Winch admits UP at the known safe actual clock`,async context=>{
  const f=await heldAtSafeRelease({count}),before=(await f.h.current()).state,last=(await currentPlanetJournal(f.h)).at(-1).sequence;
  await f.h.service.runBots(f.h.matchId);
  const ups=upEntries(f.h);assert.equal(ups.length,1);assert.equal(ups[0].response.result.receipt.status,'accepted');
  assert.equal(ups[0].context.now,f.safeAt);assert.equal(ups[0].response.result.receipt.receivedAt,f.safeAt);
  let replay=before;
  for(const record of (await currentPlanetJournal(f.h)).filter(r=>r.sequence>last)){
    if(record.kind==='FOOD_COMMAND'){
      const transition=engine.applyPlanetFoodCommand(replay,record.actorSeatId,record.request,record.context);
      assert.deepEqual(transition.receipt,record.receipt);replay=transition.state;
    }else if(record.kind==='FOOD_PRESENCE')replay=engine.setPlanetFoodPresence(replay,record.actorSeatId,record.online,record.context);
    else if(record.kind==='DEADLINE')replay=engine.advancePlanetDeadline(replay,record.context).state;
  }
  assert.deepEqual(engine.encodePlanetGameState(replay),engine.encodePlanetGameState((await f.h.current()).state));
  f.h.reload();await f.h.service.runBots(f.h.matchId);
  assert.equal(upEntries(f.h).length,1,'restart does not duplicate the closed holder UP');
  assert.deepEqual(upEntries(f.h)[0],ups[0],'original context, request and receipt survive restart');
  context.diagnostic(JSON.stringify({mode:'NONE',safeAt:f.safeAt,acceptedUpAt:ups[0].context.now}));
});

for(const count of [7,8,9])test(`${count}: safe first-action UP avoids CLOCK and its200ms acknowledgment delay`,async context=>{
  const f=await heldAtSafeRelease({count,mode:'CLOCK_ACK'});await f.h.service.runBots(f.h.matchId);
  const {delays,clockAcknowledgment,speculativeUp}=f.details();assert.equal(delays,0);assert.equal(clockAcknowledgment,null);
  assert.ok(f.ownViews.some(v=>v.beforeClockAcknowledgment&&v.at===f.safeAt&&v.up),'owned pre-CLOCK projection chose UP');
  assert.equal(speculativeUp,null);const ups=upEntries(f.h);assert.equal(ups.length,1);
  assert.equal(ups[0].context.now,f.safeAt);assert.equal(ups[0].response.result.receipt.receivedAt,f.safeAt);
  assert.equal(ups[0].response.result.receipt.status,'accepted');
  assert.equal(entries(f.h).slice(f.baseline)[0].request.request.command.input.edge,'UP','the UP itself is first new ingress');
  context.diagnostic(JSON.stringify({mode:'CLOCK_ACK',safeAt:f.safeAt,acceptedUpAt:ups[0].context.now,
    avoidedClockDelay:true,admittedUps:1,newEntries:entries(f.h).length-f.baseline}));
});

for(const count of [7,8,9])test(`${count}: a200ms speculative admission retry still records no unsafe UP`,async context=>{
  const f=await heldAtSafeRelease({count,mode:'ADMISSION'});await f.h.service.runBots(f.h.matchId);
  const {delays,clockAcknowledgment,speculativeUp}=f.details();assert.equal(delays,1);assert.equal(clockAcknowledgment,null);
  assert.ok(speculativeUp,'without CLOCK delay, UP reaches admission on the first safe attempt');
  assert.deepEqual(speculativeUp.request.request.command,f.proposal);assert.equal(speculativeUp.context.now,f.safeAt);
  assert.equal(f.h.now(),f.safeAt+200);assert.equal(upEntries(f.h).length,0,'retry-time fresh policy rejects the now-unsafe UP');
  assert.equal(f.h.store.export().some(([key,intent])=>key.startsWith('foodBotIntent/')&&isUp(intent.request?.request?.command)),false);
  assert.equal((await f.h.current()).state.food.step.task.crate.state,'HELD');
  context.diagnostic(JSON.stringify({mode:'ADMISSION',plannedAt:speculativeUp.context.now,actualRetryAt:f.h.now(),
    capturedInput:speculativeUp.request.request.command.input,admittedUps:0,newEntries:entries(f.h).length-f.baseline}));
});

test('due native warnings take CLOCK and their canonical journal order before a safe UP',async()=>{
  const f=await heldAtSafeRelease({boundary:'WARNING'}),last=(await currentPlanetJournal(f.h)).at(-1).sequence;
  await f.h.service.runBots(f.h.matchId);
  const added=entries(f.h).slice(f.baseline),up=upEntries(f.h)[0];
  assert.equal(added[0].request,null,'even warning-only engine work keeps UP on the CLOCK route');
  assert.ok(up);assert.ok(added[0].sequence<up.sequence);assert.equal(up.context.now,f.safeAt);
  const records=(await currentPlanetJournal(f.h)).filter(r=>r.sequence>last),warnings=records.filter(r=>r.kind==='DEADLINE');
  assert.ok(warnings.length>0);assert.ok(warnings.every(r=>r.context.now<=f.safeAt&&r.ingressSequence===added[0].sequence));
  const applied=records.find(r=>r.kind==='FOOD_COMMAND'&&isUp(r.request.command));
  assert.ok(warnings.every(r=>r.sequence<applied.sequence));assert.equal(up.response.result.receipt.status,'accepted');
});

test('due effective human presence is journaled at its original expiry before bot UP',async()=>{
  const f=await heldAtSafeRelease({boundary:'PRESENCE'}),last=(await currentPlanetJournal(f.h)).at(-1).sequence;
  await f.h.service.runBots(f.h.matchId);
  const added=entries(f.h).slice(f.baseline),up=upEntries(f.h)[0];
  assert.equal(added[0].request,null,'presence work is not bypassed by direct UP');
  assert.ok(up);assert.ok(added[0].sequence<up.sequence);assert.equal(up.response.result.receipt.status,'accepted');
  const records=(await currentPlanetJournal(f.h)).filter(r=>r.sequence>last),offline=records.find(r=>r.kind==='FOOD_PRESENCE'&&r.online===false);
  assert.ok(offline);assert.equal(offline.context.now,f.effectiveExpiry);assert.equal(offline.ingressSequence,added[0].sequence);
  assert.ok(offline.sequence<records.find(r=>r.kind==='FOOD_COMMAND'&&isUp(r.request.command)).sequence);
});

test('original committed prefix is recovered before the first safe bot UP',async()=>{
  const f=await heldAtSafeRelease(),human=engine.projectPlanetFoodPlayer((await f.h.current()).state,f.task.panelSeatId,f.safeAt);
  const request={schemaVersion:1,protocolVersion:3,matchId:f.h.matchId,phaseId:human.phaseId,foodStepId:human.step.stepId,
    round:human.round,commandId:f.h.nextId(),command:{type:'TASK_PRESS',taskId:human.participantTask.taskId,
      controlSessionId:human.participantTask.controlSessionId,expectedControlRevision:human.participantTask.controlRevision,input:{kind:'KEY'}}};
  f.h.store.loseNextAcknowledgement('foodIngress/');
  const lost=await f.h.invoke(f.h.players[0],'foodCommand',{request});
  assert.deepEqual(lost,{ok:false,serverTimeMs:f.safeAt,error:{code:'UNAVAILABLE'}});
  const original=entries(f.h).find(e=>e.request?.request?.commandId===request.commandId);
  assert.ok(original);assert.equal(original.response,null);
  const records=f.h.store.export(),pendingControl=records.find(([key])=>key==='foodIngressControl/'+f.h.matchId)[1];
  assert.ok(pendingControl.processedSequence<original.sequence);assert.equal(pendingControl.nextSequence,original.sequence+1);
  assert.equal(records.some(([key])=>key===original.receiptPath),false,'lost admission ACK precedes any receipt/effect');
  assert.ok(records.some(([key,job])=>key.startsWith('deadline/')&&job.ingressSequence===original.sequence&&job.status!=='complete'),
    'the original pending entry already has its atomic durable wake');
  await f.h.service.runBots(f.h.matchId);
  const restored=entries(f.h).find(e=>e.sequence===original.sequence),up=upEntries(f.h)[0];
  assert.deepEqual(restored.context,original.context);assert.deepEqual(restored.request,original.request);
  assert.equal(restored.response.result.receipt.status,'rejected','the original invalid KEY is processed exactly once');
  assert.ok(up);assert.ok(restored.sequence<up.sequence);assert.equal(up.response.result.receipt.status,'accepted');
  const control=f.h.store.export().find(([key])=>key==='foodIngressControl/'+f.h.matchId)[1];
  assert.ok(control.processedSequence>=up.sequence);
  assert.equal(entries(f.h).filter(e=>e.request?.request?.commandId===request.commandId).length,1);
  assert.equal(upEntries(f.h).length,1);
  assert.deepEqual(await f.h.invoke(f.h.players[0],'foodCommand',{request}),restored.response,'exact original retry recovers its receipt without another input');
});

test('a due physical lift boundary is drained before bot cooperation resumes',async()=>{
  const {h,task}=await setupNativeHumanFood({control:'PANEL'});
  for(const offset of [1500,2800]){h.setTime(task.startedAt+offset);await h.read(h.players[0]);}
  await runNativeFoodWorkersThrough(h,task.runningAt);h.setTime(task.runningAt);await h.service.runBots(h.matchId);
  const lifting=await h.current(),motion=lifting.state.food.step.task.crate.motion;
  assert.equal(lifting.state.food.step.task.crate.state,'LIFTING');assert.ok(motion);
  const baseline=entries(h).length,last=(await currentPlanetJournal(h)).at(-1).sequence;
  h.setTime(motion.endsAt);assert.equal(engine.planetDeadlineAt(lifting.state),motion.endsAt);
  await h.service.runBots(h.matchId);
  assert.equal(entries(h).slice(baseline)[0].request,null);assert.equal(upEntries(h).length,0);
  const after=await h.current();assert.equal(after.state.food.step.task.crate.state,'HELD');assert.equal(after.state.food.step.task.crate.motion,null);
  assert.ok((await currentPlanetJournal(h)).some(r=>r.sequence>last&&r.kind==='DEADLINE'&&r.context.now===motion.endsAt));
});

test('pending-contact closure keeps CLOCK before closing the newer gesture and releasing the real holder',async()=>{
  const f=await heldAtSafeRelease(),s=await f.h.current(),view=engine.projectPlanetFoodPlayer(s.state,f.task.winchSeatId,f.safeAt),t=view.participantTask;
  // Adopt a real pure-engine DOWN history to cover a recoverable contact which
  // the cooperative policy itself never deliberately creates while holding.
  const request={schemaVersion:1,protocolVersion:3,matchId:f.h.matchId,phaseId:view.phaseId,foodStepId:view.step.stepId,
    round:view.round,commandId:f.h.nextId(),command:{type:'TASK_PRESS',taskId:t.taskId,controlSessionId:t.controlSessionId,
      expectedControlRevision:t.controlRevision,input:{kind:'HOLD',edge:'DOWN',gestureSequence:t.ownGesture.highestSequence+1,crateId:t.crate.id}}};
  const ctx={...structuredClone(entries(f.h).at(-1).context),now:f.safeAt};
  const transition=engine.applyPlanetFoodCommand(s.state,f.task.winchSeatId,request,ctx);
  assert.equal(transition.receipt.status,'accepted');
  const pending=engine.projectPlanetFoodPlayer(transition.state,f.task.winchSeatId,f.safeAt);
  assert.ok(pending.participantTask.ownGesture.currentHolder);assert.ok(pending.participantTask.ownGesture.pendingIntent);
  assert.equal(chooseFoodBotInput(pending).command.input.crateId,null);
  await f.h.store.transaction(async tx=>{const current=await tx.get('session/'+f.h.matchId);current.state=transition.state;tx.set('session/'+f.h.matchId,current);});
  await f.h.service.runBots(f.h.matchId);
  const added=entries(f.h).slice(f.baseline),ups=upEntries(f.h);
  assert.equal(added[0].request,null,'closing a pending contact is not direct actual-holder UP');
  assert.equal(ups.length,2);assert.equal(ups[0].request.request.command.input.crateId,null);
  assert.equal(ups[0].request.request.command.input.gestureSequence,request.command.input.gestureSequence);
  assert.equal(ups[1].request.request.command.input.gestureSequence,t.ownGesture.currentHolder.sequence);
  assert.equal(ups[1].request.request.command.input.crateId,t.ownGesture.currentHolder.crateId);
  assert.ok(ups.every(e=>e.context.now===f.safeAt&&e.response.result.receipt.status==='accepted'));
});
