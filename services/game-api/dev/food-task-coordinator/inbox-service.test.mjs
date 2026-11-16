import assert from 'node:assert/strict';
import {test} from 'node:test';
import {setTimeout as sleep} from 'node:timers/promises';
import {createPlanetService,PLANET_FOOD_OWNER_INBOX_PROFILE,withPlanetRequestTiming} from '../../dist/index.js';
import {createFoodInboxIntent,createPlanetFoodInbox,foodInboxScopeKey} from '../../dist/planet-food-inbox.js';
import {createPlanetFoodInboxWorker} from '../../dist/planet-food-inbox-worker.js';
import {createLoopbackFoodStore} from './firestore.mjs';
import {envelope,seedTwoHumanTask} from './fixture.mjs';
import {digest,ok,planetServiceHarness} from '../../test/planet-service-helper.mjs';

async function inboxMatch(t,{overlap=false,live=false,humans=7}={}){
  const real=createLoopbackFoodStore();
  let failAfterOwnerClaim=false, ownerWasClaimed=false;
  const joined=Promise.withResolvers(), trailing=Promise.withResolvers();
  let joinId, trailingId, trailingReply, trailingRequest,recordCommit,afterInboxCapture;
  const store={...real,...(live?{}:{watchFoodInbox:undefined}),
    async transaction(action){
      let claim=false, observed, recorded=[];
      const value=await real.transaction(tx=>{
        recorded=[];
        return action({...tx,
          create(path,item){
            if(recordCommit&&path.startsWith('foodInboxIntent/'))recorded.push({stage:'intake',item});
            if(recordCommit&&path.startsWith('foodInboxProgress/'))recorded.push({stage:'progress',item,id:path.split('/').at(-1)});
            if(recordCommit&&path.startsWith('foodInboxResult/'))recorded.push({stage:'close',item});
            tx.create(path,item);
          },
          set(path,item){
            if(path.startsWith('foodInboxOwner/')&&item.expiresAt>0)claim=true;
            if(path.startsWith('foodIngress/')){
              if(!item.response&&item.request?.operation==='foodCommand')observed=item;
              if(recordCommit)recorded.push({stage:item.response?'apply':'append',item});
            }
            tx.set(path,item);
          }});
      });
      if(recorded.length)recordCommit(recorded);
      if(claim&&failAfterOwnerClaim)ownerWasClaimed=true;
      if(observed&&observed.request.request.commandId===joinId){
        joined.resolve(observed);
        if(overlap)await trailing.promise;
      }
      if(observed&&observed.request.request.commandId===trailingId)trailing.resolve(observed);
      return value;
    },
    async readOnly(action){
      if(ownerWasClaimed){
        ownerWasClaimed=false;failAfterOwnerClaim=false;
        throw new Error('simulated worker exit after claiming ownership');
      }
      if(!afterInboxCapture)return real.readOnly(action);
      let captured=false;
      const value=await real.readOnly(tx=>action({...tx,async get(path){
        if(path.startsWith('foodInboxRoute/'))captured=true;
        return tx.get(path);
      }}));
      if(captured&&afterInboxCapture){
        const after=afterInboxCapture;
        afterInboxCapture=undefined;
        await after();
      }
      return value;
    },
  };
  t.after(()=>store.close());
  const submitJoin=overlap?async(h,uid,request)=>{
    joinId=request.commandId;
    trailingId=h.nextId();
    trailingRequest={...request,commandId:trailingId,command:{...request.command,answer:'DECLINE'}};
    const original=h.invoke(uid,'foodCommand',{request});
    const admitted=await joined.promise;
    h.setTime(admitted.context.now+5);
    trailingReply=h.invoke(uid,'foodCommand',{request:trailingRequest});
    return original;
  }:undefined;
  const seeded=await seedTwoHumanTask(store,7,{foodAuthorityProfile:PLANET_FOOD_OWNER_INBOX_PROFILE,submitJoin,humans});
  const {h}=seeded;
  const read=path=>store.readOnly(tx=>tx.get(path));
  const route=await read('foodInboxRoute/'+h.matchId);
  assert.equal(route.scope.taskId,seeded.task.options.taskId);
  assert.equal(route.closedAt,null);
  assert.equal((await h.current()).foodAuthorityProfile,PLANET_FOOD_OWNER_INBOX_PROFILE);
  const deliveries=new Map();
  async function pump(){
    for(const path of await store.listKeys('foodInboxWake',100)){
      const record=await read(path);
      if(record?.wake.scope.matchId!==h.matchId)continue;
      await h.service.dispatchFoodInboxWake(record.wake.id,async wake=>{deliveries.set(wake.id,wake);});
    }
    for(const [id,wake] of [...deliveries]){
      if(wake.wakeAt>h.now())continue;
      await h.service.runFoodInbox(wake);
      deliveries.delete(id);
    }
  }
  async function call(uid,operation,fields){
    let settled=false;
    const result=h.invoke(uid,operation,fields).finally(()=>{settled=true;});
    for(let turn=0;turn<36&&!settled;turn++){
      await pump();
      await sleep(15);
    }
    return result;
  }
  return {...seeded,store,route,read,pump,call,deliveries,trailing,trailingRequest,trailingReply,setCommitObserver:observe=>{recordCommit=observe;},afterCapture:next=>{afterInboxCapture=next;},failNextOwner:()=>{failAfterOwnerClaim=true;}};

}

test('periodic repair replaces a dispatched JOIN wake that never reached an owner', {timeout:60_000},async t=>{
  const {h,task,route,store,read}=await inboxMatch(t,{live:true});
  const scopeKey=foodInboxScopeKey(route.scope);
  const ownerKey='foodInboxOwner/'+scopeKey;
  const resultKey='foodInboxResult/'+scopeKey;
  const ownWake=wake=>foodInboxScopeKey(wake.scope)===scopeKey;
  const pendingWakes=async()=>{
    const paths=await store.listKeys('foodInboxWake',100);
    return (await Promise.all(paths.map(read))).filter(row=>row&&ownWake(row.wake));
  };
  const [bootstrap,...additional]=await pendingWakes();
  assert.ok(bootstrap);
  assert.equal(additional.length,0,'the live listener path starts with only its JOIN wake');
  assert.equal(bootstrap.watchdogFor,undefined);
  const before=await h.current();
  const firstDeliveries=[];
  assert.equal(await h.service.dispatchFoodInboxWake(bootstrap.wake.id,async wake=>{firstDeliveries.push(wake);}),true);
  assert.deepEqual(firstDeliveries,[bootstrap.wake]);
  assert.equal((await read('foodInboxWake/'+bootstrap.wake.id)).status,'dispatched');
  assert.equal(await read(ownerKey),null);
  await store.transaction(tx=>{
    for(let index=0;index<101;index++){
      const id=digest(['historical-dispatch',h.matchId,index]);
      const wake={...bootstrap.wake,id,scope:{...route.scope,matchId:'history-'+h.nextId()}};
      tx.create('foodInboxWake/'+id,{wake,status:'dispatched',nextAttemptAt:0});
    }
  });

  // The queue acknowledged creation, but no delivery arrived and no client
  // request can stage another wake. The periodic worker is the recovery path.
  h.setTime(Math.max(bootstrap.wake.wakeAt,h.now())+60_000);
  const replacements=[];
  await h.service.repairFoodInboxWakes(async wake=>{if(ownWake(wake))replacements.push(wake);});
  assert.equal(replacements.length,1,'periodic repair must enqueue a fresh generation for this Task');
  const [replacement]=replacements;
  assert.notEqual(replacement.id,bootstrap.wake.id,'Cloud Tasks may retain the original name');
  assert.deepEqual(replacement.scope,route.scope);
  assert.ok(replacement.wakeAt<=h.now());

  await h.service.runFoodInbox(bootstrap.wake);
  assert.equal(await read(ownerKey),null,'the obsolete delivery cannot beat the replacement to ownership');
  await h.service.runFoodInbox(replacement);
  const owner=await read(ownerKey),completed=await read(resultKey);
  assert.equal(owner.epoch,1);
  const watchdogs=(await pendingWakes()).filter(row=>row.watchdogFor===owner.id);
  assert.equal(watchdogs.length,1,'the replacement claim has a durable owner watchdog');
  assert.deepEqual(completed.scope,route.scope);
  const closed=await read('foodInboxRoute/'+h.matchId),parent=await h.current();
  assert.equal(closed.closedAt,h.now());
  assert.equal(completed.closedAt,closed.closedAt);
  assert.equal(completed.parentPhaseId,parent.state.phase.id);
  assert.equal(completed.journalSequence,parent.journalSequence);
  assert.notEqual(parent.state.phase.kind,'FOOD_SUPPLY');
  const journal=[];
  for(let sequence=before.journalSequence+1;sequence<=parent.journalSequence;sequence++){
    journal.push(await read('journal/'+h.matchId+'/'+String(sequence).padStart(12,'0')));
  }
  const returns=journal.filter(row=>row.kind==='DEADLINE'&&row.context.phaseId===route.scope.phaseId&&row.context.now===task.returnsAt);
  assert.equal(returns.length,1,'normal Task return keeps its original authoritative boundary');

  const [closedWatchdog]=watchdogs;
  await h.service.dispatchFoodInboxWake(closedWatchdog.wake.id,async()=>{});
  h.setTime(Math.max(closedWatchdog.wake.wakeAt,h.now())+60_000);
  const afterClosed=[];
  await h.service.repairFoodInboxWakes(async wake=>{if(ownWake(wake))afterClosed.push(wake);});
  assert.deepEqual(afterClosed,[],'periodic repair does not rearm a watchdog for a closed Task');
  await h.service.runFoodInbox(closedWatchdog.wake);
  await h.service.runFoodInbox(bootstrap.wake);
  await h.service.runFoodInbox(replacement);
  assert.deepEqual(await read(ownerKey),owner);
  assert.deepEqual(await read(resultKey),completed);
  assert.deepEqual(await read('foodInboxRoute/'+h.matchId),closed);
  assert.equal((await h.current()).journalSequence,parent.journalSequence);
});

test('periodic repair replaces a lost continuation after the owner exhausts its work budget', {timeout:60_000},async t=>{
  const {h,task,route,store,read}=await inboxMatch(t,{live:true});
  const scopeKey=foodInboxScopeKey(route.scope);
  const ownerKey='foodInboxOwner/'+scopeKey,resultKey='foodInboxResult/'+scopeKey;
  const ownWake=wake=>foodInboxScopeKey(wake.scope)===scopeKey;
  const ownWakes=async()=>{
    const paths=await store.listKeys('foodInboxWake',100);
    return (await Promise.all(paths.map(read))).filter(row=>row&&ownWake(row.wake));
  };
  const [bootstrap]=await ownWakes();
  assert.ok(bootstrap);
  const before=await h.current();
  await h.service.dispatchFoodInboxWake(bootstrap.wake.id,async()=>{});

  let steps=0;
  const boundedWorker=createPlanetFoodInboxWorker({store,inbox:createPlanetFoodInbox(store),clock:h.now,newId:h.nextId,
    step:async()=>{steps++;return 'again';}});
  await boundedWorker.runFoodInbox(bootstrap.wake);
  assert.equal(steps,1024);
  const released=await read(ownerKey);
  assert.equal(released.epoch,1);
  assert.equal(released.expiresAt,0);
  assert.equal(await read(resultKey),null);
  const followups=(await ownWakes()).filter(row=>row.wake.id!==bootstrap.wake.id);
  const watchdog=followups.find(row=>row.watchdogFor===released.id);
  const continuation=followups.find(row=>row.watchdogFor===undefined);
  assert.ok(watchdog&&continuation);
  const dropped=[];
  for(const row of [watchdog,continuation]){
    assert.equal(await h.service.dispatchFoodInboxWake(row.wake.id,async wake=>{dropped.push(wake);}),true);
  }
  assert.deepEqual(dropped,[watchdog.wake,continuation.wake]);

  h.setTime(Math.max(h.now(),watchdog.wake.wakeAt,continuation.wake.wakeAt)+60_000);
  const recovered=[];
  await h.service.repairFoodInboxWakes(async wake=>{if(ownWake(wake))recovered.push(wake);});
  assert.equal(recovered.length,1,'repair must replace the continuation alone');
  const [replacement]=recovered;
  assert.notEqual(replacement.id,continuation.wake.id);
  assert.equal(replacement.wakeAt,continuation.wake.wakeAt);
  assert.deepEqual(replacement.scope,route.scope);

  await h.service.runFoodInbox(watchdog.wake);
  await h.service.runFoodInbox(continuation.wake);
  assert.deepEqual(await read(ownerKey),released,'neither obsolete generation can claim');
  assert.equal(await read(resultKey),null);
  await h.service.runFoodInbox(replacement);
  const owner=await read(ownerKey),completed=await read(resultKey),parent=await h.current();
  assert.equal(owner.epoch,2);
  assert.equal(owner.expiresAt,0);
  assert.deepEqual(completed.scope,route.scope);
  assert.equal(completed.parentPhaseId,parent.state.phase.id);
  assert.equal(completed.journalSequence,parent.journalSequence);
  assert.notEqual(parent.state.phase.kind,'FOOD_SUPPLY');
  const journal=[];
  for(let sequence=before.journalSequence+1;sequence<=parent.journalSequence;sequence++){
    journal.push(await read('journal/'+h.matchId+'/'+String(sequence).padStart(12,'0')));
  }
  assert.equal(journal.filter(row=>row.kind==='DEADLINE'&&row.context.phaseId===route.scope.phaseId&&row.context.now===task.returnsAt).length,1);

  await h.service.runFoodInbox(continuation.wake);
  await h.service.runFoodInbox(replacement);

  // A matching continuation can outlive the owner's final acknowledgement.
  const late={...continuation.wake,id:digest(['closed-continuation',scopeKey]),wakeAt:h.now()};
  const inbox=createPlanetFoodInbox(store);
  await store.transaction(tx=>inbox.stageWake(tx,late,{continuationFor:owner.id}));
  await h.service.runFoodInbox(late);
  assert.deepEqual(await read(ownerKey),owner,'a late continuation must not reclaim a closed Task');
  assert.equal((await read('foodInboxWake/'+late.id)).status,'handled');
  assert.deepEqual(await read(resultKey),completed);
  assert.equal((await h.current()).journalSequence,parent.journalSequence);
});

for(const recovery of ['direct watchdog','periodic repair'])test(`closed inbox refuses the original once after ${recovery}`, {timeout:60_000},async t=>{
  const {h,task,winch,route,store,read,setCommitObserver}=await inboxMatch(t,{live:true});
  const scopeKey=foodInboxScopeKey(route.scope);
  const ownerKey='foodInboxOwner/'+scopeKey,resultKey='foodInboxResult/'+scopeKey;
  const routeKey='foodInboxRoute/'+h.matchId,controlKey='foodIngressControl/'+h.matchId;
  const ownScope=scope=>foodInboxScopeKey(scope)===scopeKey;
  const ownWakes=async()=>{
    const paths=await store.listKeys('foodInboxWake',100);
    return (await Promise.all(paths.map(read))).filter(row=>row&&ownScope(row.wake.scope));
  };
  const [bootstrap]=await ownWakes();
  assert.ok(bootstrap);
  const inbox=createPlanetFoodInbox(store,h.now);
  const member=(await h.current()).members.find(row=>row.uid===winch);
  const binding={uid:winch,seatId:member.seatId,revision:member.bindingRevision};
  const request={operation:'foodHeartbeat',matchId:h.matchId,taskId:route.scope.taskId};
  const originals=['at-return','after-return'].map(label=>createFoodInboxIntent(route.scope,binding,request,label));
  const progress=intent=>store.readOnly(tx=>inbox.progress(tx,intent));
  h.setTime(task.returnsAt-1);
  for(const intent of originals){
    assert.equal((await inbox.intake(intent,h.now())).duplicate,false);
    assert.equal(await h.service.dispatchFoodInboxWake(intent.id,async()=>{}),true);
  }
  const first=await inbox.next(route.scope),queued=originals.find(intent=>intent.id!==first.id);
  assert.ok(queued);
  assert.equal(await h.service.dispatchFoodInboxWake(bootstrap.wake.id,async()=>{}),true);

  let closeAcks=0;
  const refusals=[];
  setCommitObserver(rows=>{
    for(const row of rows){
      if(row.stage==='close'&&ownScope(row.item.scope)){
        closeAcks++;
        throw new Error('simulated lost acknowledgement after committing Food close');
      }
      if(row.stage==='progress'&&row.id===queued.id)refusals.push(row.item);
    }
  });
  h.setTime(task.returnsAt);
  await assert.rejects(h.service.runFoodInbox(bootstrap.wake),/lost acknowledgement after committing Food close/);
  assert.equal(closeAcks,1);
  const owner=await read(ownerKey),completed=await read(resultKey),closed=await read(routeKey);
  const control=await read(controlKey),parent=await h.current();
  assert.equal(completed.closedAt,task.returnsAt);
  assert.equal(closed.closedAt,completed.closedAt);
  assert.equal(parent.state.phase.startedAt,task.returnsAt);
  assert.equal(completed.journalSequence,parent.journalSequence);
  assert.equal((await progress(first)).kind,'admitted');
  assert.equal((await inbox.next(route.scope)).id,queued.id);
  assert.equal(await progress(queued),null);

  const watchdog=(await ownWakes()).find(row=>row.watchdogFor===owner.id&&row.wake.wakeAt===owner.expiresAt);
  assert.ok(watchdog);
  assert.equal(await h.service.dispatchFoodInboxWake(watchdog.wake.id,async()=>{}),true);
  let cleanup=watchdog.wake;
  if(recovery==='periodic repair'){
    h.setTime(watchdog.wake.wakeAt+60_000);
    const replacements=[];
    await h.service.repairFoodInboxWakes(async wake=>{if(ownScope(wake.scope))replacements.push(wake);});
    assert.equal(replacements.length,1,'a closed route with queued work still needs its owner recovery wake');
    [cleanup]=replacements;
    assert.notEqual(cleanup.id,watchdog.wake.id);
    assert.equal(cleanup.wakeAt,watchdog.wake.wakeAt);
    await h.service.runFoodInbox(watchdog.wake);
    assert.deepEqual(await read(ownerKey),owner);
    assert.equal(await progress(queued),null);
  }else h.setTime(watchdog.wake.wakeAt);

  await h.service.runFoodInbox(cleanup);
  const refusal={kind:'resolved',response:{ok:false,serverTimeMs:h.now(),error:{code:'NOT_ALLOWED'}}};
  assert.deepEqual(await progress(queued),refusal);
  assert.equal(await inbox.next(route.scope),null);
  const successor=await read(ownerKey);
  assert.equal(successor.epoch,owner.epoch+1);
  assert.equal(successor.expiresAt,0);
  await h.service.runFoodInbox(watchdog.wake);
  await h.service.runFoodInbox(cleanup);
  await h.service.runFoodInbox(bootstrap.wake);
  assert.deepEqual(await read(ownerKey),successor);
  assert.deepEqual(refusals,[refusal]);
  assert.deepEqual(await progress(queued),refusal);
  assert.deepEqual(await read(resultKey),completed);
  assert.deepEqual(await read(routeKey),closed);
  assert.deepEqual(await read(controlKey),control);
  assert.deepEqual(await h.current(),parent);
});

test('production inbox survives profile switch-off and commits one normal Task return', {timeout:60_000},async t=>{
  const {h,task,winch,panel,route,read,pump,call,deliveries}=await inboxMatch(t);
  const initial=await read('foodIngressControl/'+h.matchId);
  assert.equal(route.cutoverThrough,initial.processedSequence);
  await pump();
  h.reload({foodAuthorityProfile:undefined});
  const start=task.options.startedAt;
  h.setTime(start+1_000);
  for(const uid of [winch,panel]){
    const result=await call(uid,'foodHeartbeat',{matchId:h.matchId,taskId:route.scope.taskId});
    assert.deepEqual(result,{ok:true,serverTimeMs:h.now(),result:{renewed:true}});
  }
  const authorized=await h.service.projectFoodInboxSnapshot(winch,h.matchId);
  assert.equal(authorized.foodPlayerView.participantTask.taskId,route.scope.taskId);
  const observer=await h.service.projectFoodInboxSnapshot(h.display,h.matchId);
  assert.equal(observer.foodPlayerView,null);
  assert.deepEqual(observer.foodStream,{version:1,phaseId:route.scope.phaseId,foodStepId:observer.foodPublicView.step.stepId});
  assert.deepEqual(authorized.foodStream,observer.foodStream);
  assert.equal(await h.service.projectFoodInboxSnapshot('stranger',h.matchId),null);
  h.setTime(task.options.commonReturnAt??start+32_500);
  await pump();
  const resultKey='foodInboxResult/'+foodInboxScopeKey(route.scope);
  const completed=await read(resultKey);
  assert.equal(completed.closedAt,h.now());
  assert.equal((await read('foodInboxRoute/'+h.matchId)).closedAt,h.now());
  const parent=await h.current();
  assert.notEqual(parent.state.phase.kind,'FOOD_SUPPLY');
  assert.equal(completed.parentPhaseId,parent.state.phase.id);
  assert.equal((await h.service.projectFoodInboxSnapshot(winch,h.matchId)).foodStream,undefined);
  // Same scope wake delivery can be replayed without a second result or journal write.
  for(const wake of [...deliveries.values()])if(wake.wakeAt<=h.now())await h.service.runFoodInbox(wake);
  assert.equal((await h.current()).journalSequence,parent.journalSequence);
  assert.deepEqual(await read(resultKey),completed);
});

test('production inbox orders recovery, revokes old projection, and commits one host abort', {timeout:60_000},async t=>{
  const {h,task,winch,route,call,read,pump}=await inboxMatch(t);
  const at=task.options.startedAt+500;
  h.setTime(at);
  await pump();
  const member=(await h.current()).members.find(row=>row.uid===winch);
  const recovery=await call(h.host,'issueRecovery',{matchId:h.matchId,requestId:h.nextId(),seatId:member.seatId});
  assert.equal(recovery.ok,true,JSON.stringify(recovery));
  const replacement='replacement-'+h.nextId();
  const redeemed=await call(replacement,'redeemRecovery',{matchId:h.matchId,requestId:h.nextId(),recoveryCode:recovery.result.recoveryCode});
  assert.equal(redeemed.ok,true,JSON.stringify(redeemed));
  assert.equal((await read('foodInboxRoute/'+h.matchId)).bindingEpoch,1);
  assert.equal(await h.service.projectFoodInboxSnapshot(winch,h.matchId),null);
  assert.equal((await h.service.projectFoodInboxSnapshot(replacement,h.matchId)).foodPlayerView.seatId,member.seatId);
  const invalid=await h.invoke(winch,'foodHeartbeat',{matchId:h.matchId,taskId:route.scope.taskId});
  assert.equal(invalid.error.code,'FORBIDDEN');
  const requestId=h.nextId();
  const abort=await call(h.host,'abort',{matchId:h.matchId,requestId});
  assert.equal(abort.ok,true,JSON.stringify(abort));
  const original=await h.invoke(h.host,'abort',{matchId:h.matchId,requestId});
  assert.deepEqual(original,abort);
  const after=await h.current(),result=await read('foodInboxResult/'+foodInboxScopeKey(route.scope));
  assert.equal(after.status,'aborted');
  assert.equal(after.journalSequence,result.journalSequence);
});

test('timed intake reauthorizes across a binding replacement after its captured snapshot', {timeout:60_000},async t=>{
  const {h,task,winch,route,call,read,afterCapture}=await inboxMatch(t);
  h.setTime(task.runningAt);
  const member=(await h.current()).members.find(row=>row.uid===winch);
  const recovery=ok(await call(h.host,'issueRecovery',{matchId:h.matchId,requestId:h.nextId(),seatId:member.seatId}));
  const view=(await h.service.projectFoodInboxSnapshot(winch,h.matchId)).foodPlayerView;
  const own=view.participantTask;
  const request=envelope(view,{type:'TASK_PRESS',taskId:route.scope.taskId,controlSessionId:own.controlSessionId,
    expectedControlRevision:own.controlRevision,input:{kind:'HOLD',edge:'UP',gestureSequence:1,crateId:own.crate.id}});
  const input={operation:'foodCommand',request};
  const original=createFoodInboxIntent(route.scope,{uid:winch,seatId:member.seatId,revision:member.bindingRevision},input,request.commandId);
  const replacement='replacement-'+h.nextId();
  afterCapture(async()=>{
    ok(await call(replacement,'redeemRecovery',{matchId:h.matchId,requestId:h.nextId(),recoveryCode:recovery.recoveryCode}));
  });
  assert.equal((await h.invoke(winch,'foodCommand',{request})).error.code,'FORBIDDEN');
  assert.equal((await read('foodInboxRoute/'+h.matchId)).bindingEpoch,1);
  assert.equal(await read('foodInboxIntent/'+foodInboxScopeKey(route.scope)+'/'+original.id),null);
  const control=await read('foodIngressControl/'+h.matchId);
  const replacementReceipt=ok(await call(replacement,'foodCommand',{request})).receipt;
  assert.equal(replacementReceipt.status,'accepted');
  assert.equal(replacementReceipt.commandId,request.commandId);
  assert.deepEqual(ok(await h.invoke(replacement,'foodCommand',{request})).receipt,replacementReceipt);
  assert.equal((await read('foodIngressControl/'+h.matchId)).processedSequence,control.processedSequence+1);
});

test('persisted expiry wake recovers queued work after claimant exits', {timeout:60_000},async t=>{
  const {h,task,winch,route,store,read,pump,failNextOwner}=await inboxMatch(t);
  const m=(await h.current()).members.find(row=>row.uid===winch);
  const inbox=createPlanetFoodInbox(store);
  const original=createFoodInboxIntent(route.scope,{uid:winch,seatId:m.seatId,revision:m.bindingRevision},
    {operation:'foodHeartbeat',matchId:h.matchId,taskId:route.scope.taskId},'claim-crash');
  h.setTime(task.options.startedAt+300);
  await inbox.intake(original,h.now());
  failNextOwner();
  await assert.rejects(pump(),/simulated worker exit/);
  const previous=await read('foodInboxOwner/'+foodInboxScopeKey(route.scope));
  assert.equal(previous.epoch,1);
  assert.equal(await store.readOnly(tx=>inbox.progress(tx,original)),null);
  assert.equal((await inbox.next(route.scope)).id,original.id);
  const pending=await store.listKeys('foodInboxWake',100);
  const saved=await Promise.all(pending.map(read));
  const watchdog=saved.find(wake=>wake?.watchdogFor===previous.id);
  assert.equal(watchdog.wake.wakeAt,previous.expiresAt);
  h.setTime(previous.expiresAt);
  await h.service.runFoodInbox(watchdog.wake);
  const consumed=await store.readOnly(tx=>inbox.progress(tx,original));
  assert.equal(consumed.kind,'admitted');
  assert.equal(consumed.admittedAt,previous.expiresAt);
  assert.equal(await inbox.next(route.scope),null);
  assert.ok((await read('foodInboxOwner/'+foodInboxScopeKey(route.scope))).epoch>previous.epoch);
});

test('periodic repair leaves a dispatched watchdog obsolete after ownership changes', {timeout:60_000},async t=>{
  const {h,winch,route,store,read,failNextOwner}=await inboxMatch(t);
  const scopeKey=foodInboxScopeKey(route.scope);
  const ownerKey='foodInboxOwner/'+scopeKey;
  const ownWakes=async()=>{
    const paths=await store.listKeys('foodInboxWake',100);
    return (await Promise.all(paths.map(read))).filter(row=>row&&foodInboxScopeKey(row.wake.scope)===scopeKey);
  };
  const bootstrap=(await ownWakes()).find(row=>!row.watchdogFor&&row.wake.wakeAt===h.now());
  assert.ok(bootstrap);
  failNextOwner();
  await assert.rejects(h.service.runFoodInbox(bootstrap.wake),/simulated worker exit/);
  const previous=await read(ownerKey);
  const stale=(await ownWakes()).find(row=>row.watchdogFor===previous.id);
  assert.ok(stale);
  assert.equal(await h.service.dispatchFoodInboxWake(stale.wake.id,async()=>{}),true);

  const member=(await h.current()).members.find(row=>row.uid===winch);
  const inbox=createPlanetFoodInbox(store);
  const intent=createFoodInboxIntent(route.scope,{uid:winch,seatId:member.seatId,revision:member.bindingRevision},
    {operation:'foodHeartbeat',matchId:h.matchId,taskId:route.scope.taskId},'distinct-recovery-wake');
  h.setTime(previous.expiresAt);
  await inbox.intake(intent,h.now());
  await h.service.runFoodInbox((await read('foodInboxWake/'+intent.id)).wake);
  const successor=await read(ownerKey);
  assert.equal(successor.epoch,previous.epoch+1);
  assert.equal((await read('foodInboxRoute/'+h.matchId)).closedAt,null);
  const parent=await h.current();

  h.setTime(stale.wake.wakeAt+60_000);
  const replacements=[];
  await h.service.repairFoodInboxWakes(async wake=>{
    const saved=await read('foodInboxWake/'+wake.id);
    if(saved?.watchdogFor===previous.id)replacements.push(wake);
  });
  assert.deepEqual(replacements,[]);
  await h.service.runFoodInbox(stale.wake);
  assert.deepEqual(await read(ownerKey),successor);
  assert.equal((await h.current()).journalSequence,parent.journalSequence);
});

test('JOIN fence preserves each already-admitted command and its original clock', {timeout:60_000},async t=>{
  const {h,route,read,pump,trailing,trailingRequest,trailingReply}=await inboxMatch(t,{overlap:true});
  const original=await trailing.promise;
  assert.equal(route.cutoverThrough,original.sequence);
  assert.equal(original.response,null);
  h.setTime(h.now()+100);
  await pump();
  await trailingReply;
  const stored=await read('foodIngress/'+h.matchId+'/'+String(original.sequence).padStart(16,'0'));
  assert.equal(stored.context.now,original.context.now);
  assert.equal(stored.response.result.receipt.commandId,trailingRequest.commandId);
  assert.equal(stored.response.result.receipt.receivedAt,original.context.now);
  assert.equal(stored.response.result.receipt.status,'rejected');
  assert.equal((await read('foodIngressControl/'+h.matchId)).processedSequence,original.sequence);
});

test('production inbox preserves causal release and does not acknowledge gameplay at intake', {timeout:60_000},async t=>{
  const {h,task,winch,panel,route,store,read,call,pump}=await inboxMatch(t);
  h.setTime(task.runningAt);
  await pump();
  for(const uid of [winch,panel])assert.equal((await call(uid,'foodHeartbeat',{matchId:h.matchId,taskId:route.scope.taskId})).ok,true);
  const projected=await h.service.projectFoodInboxSnapshot(winch,h.matchId);
  const view=projected.foodPlayerView, own=view.participantTask;
  assert.equal(own.stage,'ACTIVE');
  const gesture=edge=>envelope(view,{type:'TASK_PRESS',taskId:route.scope.taskId,
    controlSessionId:own.controlSessionId,expectedControlRevision:own.controlRevision,
    input:{kind:'HOLD',edge,gestureSequence:1,crateId:own.crate.id}});
  const release=gesture('UP'), press=gesture('DOWN');
  const before=await read('foodIngressControl/'+h.matchId);
  let acknowledged=false;
  const submitted=h.invoke(winch,'foodCommand',{request:release}).finally(()=>{acknowledged=true;});
  const inbox=createPlanetFoodInbox(store);
  let pending;
  for(let pass=0;pass<40&&!pending;pass++){
    pending=await inbox.next(route.scope);
    if(!pending)await sleep(15);
  }
  assert.equal(pending.request.request.commandId,release.commandId);
  assert.equal(acknowledged,false);
  assert.equal(await store.readOnly(tx=>inbox.progress(tx,pending)),null);
  assert.deepEqual(await read('foodIngressControl/'+h.matchId),before);
  h.setTime(h.now()+5);
  await pump();
  const result=await submitted;
  assert.equal(result.result.receipt.receivedAt,h.now());
  assert.equal(result.result.receipt.status,'accepted');
  h.setTime(h.now()+5);
  const later=await call(winch,'foodCommand',{request:press});
  assert.equal(later.result.receipt.result.effect,'GESTURE_CLOSED');
  assert.deepEqual(await h.invoke(winch,'foodCommand',{request:release}),result);
  assert.equal((await h.service.projectFoodInboxSnapshot(winch,h.matchId)).foodPlayerView.participantTask.ownGesture.currentHolder,null);
});

test('production listener keeps a warm owner, wakes independently and publishes authorized freshness', {timeout:60_000},async t=>{
  const {h,task,winch,panel,route,store,read}=await inboxMatch(t,{live:true});
  const unavailable=await h.service.projectFoodInboxDelivery(winch,h.matchId);
  assert.equal(unavailable.fresh,false);
  assert.equal((await h.service.projectFoodInboxDelivery(h.display,h.matchId)).fresh,true);
  assert.equal((await h.service.projectFoodInboxDelivery(h.display,h.matchId)).recheckAt,undefined);
  const pending=await store.listKeys('foodInboxWake',100);
  const records=await Promise.all(pending.map(read));
  const bootstrap=records.find(record=>record?.wake.scope.matchId===h.matchId).wake;
  const origin=performance.now(),base=task.options.startedAt;
  h.reload({clock:()=>base+Math.floor(performance.now()-origin)});
  const ownerPath='foodInboxOwner/'+foodInboxScopeKey(route.scope);
  let owner;
  const ownerRun=h.service.runFoodInbox(bootstrap);
  void ownerRun.catch(()=>{});
  try{
    for(let i=0;i<60&&!owner;i++){
      owner=await read(ownerPath);
      if(!owner)await sleep(15);
    }
    assert.equal(owner.epoch,1);
    const heartbeatLatency=[];
    for(let round=0;round<6;round++){
      for(const uid of [winch,panel]){
        const before=performance.now();
        const result=await h.invoke(uid,'foodHeartbeat',{matchId:h.matchId,taskId:route.scope.taskId});
        heartbeatLatency.push(performance.now()-before);
        assert.equal(result.ok,true,JSON.stringify(result));
      }
      if(round<5)await sleep(830);
    }
    assert.equal((await read(ownerPath)).epoch,owner.epoch);
    assert.ok((await read(ownerPath)).expiresAt>owner.expiresAt);
    const fresh=await h.service.projectFoodInboxDelivery(winch,h.matchId);
    assert.equal(fresh.fresh,true);
    assert.ok(fresh.recheckAt>fresh.snapshot.foodPublicView.serverNowMs);
    assert.deepEqual(fresh.snapshot.foodStream,(await h.service.projectFoodInboxDelivery(h.display,h.matchId)).snapshot.foodStream);
    const view=fresh.snapshot.foodPlayerView,piece=view.participantTask;
    assert.equal(piece.stage,'ACTIVE');
    const started=performance.now();
    const command=await h.invoke(winch,'foodCommand',{request:envelope(view,{type:'TASK_PRESS',taskId:route.scope.taskId,
      controlSessionId:piece.controlSessionId,expectedControlRevision:piece.controlRevision,
      input:{kind:'HOLD',edge:'DOWN',gestureSequence:1,crateId:piece.crate.id}})});
    const downMs=performance.now()-started;
    assert.equal(command.result.receipt.status,'accepted');
    const outstanding=await Promise.all((await store.listKeys('foodInboxWake',100)).map(read));
    const thisScope=outstanding.filter(record=>record?.wake.scope.matchId===h.matchId);
    assert.ok(thisScope.every(record=>record.watchdogFor||record.wake.id===bootstrap.id));
    t.diagnostic(JSON.stringify({heartbeatCount:heartbeatLatency.length,
      heartbeatMaxMs:Math.round(Math.max(...heartbeatLatency)),downToExactReceiptMs:Math.round(downMs)}));
  } finally {
    const stopped=await h.invoke(h.host,'abort',{matchId:h.matchId,requestId:h.nextId()});
    await ownerRun;
    assert.equal(stopped.ok,true,JSON.stringify(stopped));
  }
});

test('one real-time bounded worker covers the full common return under concurrent traffic', {timeout:105_000},async t=>{
  const {h,task,winch,panel,route,read,store,setCommitObserver}=await inboxMatch(t,{live:true,humans:2});
  const available=await Promise.all((await store.listKeys('foodInboxWake',100)).map(read));
  const bootstrap=available.find(record=>record?.wake.scope.matchId===h.matchId).wake;
  const origin=performance.now(),start=task.options.startedAt;
  const now=()=>start+Math.floor(performance.now()-origin);
  h.reload({clock:now});
  let ownerRun,workerFailure,stopping=false;
  const timeOfDispatch=performance.now();
  await h.service.dispatchFoodInboxWake(bootstrap.id,async wake=>{
    ownerRun=h.service.runFoodInbox(wake);
    void ownerRun.catch(error=>{workerFailure=error;});
  });
  const ownerPath='foodInboxOwner/'+foodInboxScopeKey(route.scope);
  let owner;
  for(let pass=0;pass<100&&!owner;pass++){
    if(workerFailure)throw workerFailure;
    owner=await read(ownerPath);
    if(!owner)await sleep(10);
  }
  assert.ok(owner, 'Expected the outbox acknowledgement and scoped ownership claim to settle concurrently');
  const localBootstrapMs=performance.now()-timeOfDispatch;
  const heartbeatMs=[],buttonMs=[],contacts=[],transientContacts=[];
  const actions=new Map(),admissions=new Map(),applicationAcks=new Map();
  const actionKey=(uid,request)=>request.operation==='foodCommand'?request.request.commandId:
    request.operation==='foodHeartbeat'?uid:null;
  setCommitObserver(rows=>{
    const ack=performance.now();
    for(const {stage,item,id} of rows){
      if(stage==='progress'&&item.kind==='admitted'){
        admissions.set(id,{sequence:item.sequence,admittedAt:origin+item.admittedAt-start,appendAck:ack});
      }else if(stage==='apply')applicationAcks.set(item.sequence,ack);
      else if(stage==='intake'){
        const action=actions.get(actionKey(item.binding.uid,item.request));
        if(action){action.intakeAck=ack;action.intentId=item.id;}
      }
    }
  });
  function allStages(action){
    const admitted=admissions.get(action.intentId);
    return admitted?{...action,...admitted,applyAck:applicationAcks.get(admitted.sequence)}:action;
  }
  function startAction(uid,request){
    const action={kind:request.operation==='foodHeartbeat'?'heartbeat':request.request.command.input.kind,
      received:performance.now()};
    actions.set(actionKey(uid,request),action);
    return action;
  }
  const staleReasons={},spans=new Map(),staleSpanMs=[];
  let sampled=0,stale=0,freshWithEngineDue=0,botWakes=0,observerReads=0;
  let sampledDocs;
  const projectionService=createPlanetService({...h.options,clock:now,store:{...store,
    readOnly(action){
      return store.readOnly(tx=>action({...tx,async get(path){
        const value=await tx.get(path);
        if(path===ownerPath||path==='session/'+h.matchId)sampledDocs.set(path,value);
        return value;
      }}));
    },
  }});
  const traffic=[];
  for(const uid of [winch,panel])traffic.push((async()=>{
    while(!stopping){
      const frame=await h.service.projectFoodInboxDelivery(uid,h.matchId);
      if(frame.snapshot.foodPublicView?.step?.kind!=='AWAY'||frame.snapshot.foodPlayerView.participantTask.stage==='ENDED')return;
      const request={operation:'foodHeartbeat',matchId:h.matchId,taskId:route.scope.taskId};
      const action=startAction(uid,request);
      const response=await withPlanetRequestTiming(()=>h.invoke(uid,'foodHeartbeat',request),summary=>{action.service=summary;});
      action.response=performance.now();
      if(response.ok){heartbeatMs.push(action.response-action.received);contacts.push(action);}
      else if(response.error.code==='UNAVAILABLE')transientContacts.push(action);
      else assert.equal(response.error.code,'NOT_ALLOWED',JSON.stringify(response));
      await sleep(800);
    }
  })());
  traffic.push((async()=>{
    while(!stopping){
      for(const uid of [winch,panel]){
        sampledDocs=new Map();
        const delivery=await projectionService.projectFoodInboxDelivery(uid,h.matchId);
        const at=delivery.snapshot.foodPublicView?.serverNowMs;
        if(delivery.snapshot.foodStream){
          sampled++;
          const session=sampledDocs.get('session/'+h.matchId),currentOwner=sampledDocs.get(ownerPath);
          const due=h.options.engine.planetDeadlineAt(session.state);
          if(delivery.fresh){
            if(due!==null&&due<=at)freshWithEngineDue++;
            if(spans.has(uid))staleSpanMs.push(at-spans.get(uid));
            spans.delete(uid);
            continue;
          }
          stale++;
          if(!spans.has(uid))spans.set(uid,at);
          const ownId=delivery.snapshot.foodPlayerView.seatId,task=delivery.snapshot.foodPlayerView.participantTask;
          const leases=session.foodService.leases,own=leases[ownId];
          const reasons=new Map();
          if(!currentOwner||currentOwner.expiresAt<=at)reasons.set('owner',currentOwner?at-currentOwner.expiresAt:null);
          if(task.stage!=='ENDED'&&(!own||own.offline||own.expiresAt<=at))reasons.set('ownPresence',own?at-own.expiresAt:null);
          for(const [seat,lease] of Object.entries(leases))
            if(seat!==ownId&&!lease.offline&&lease.expiresAt<=at)reasons.set('otherPresence',at-lease.expiresAt);
          if(due!==null&&due<=at)reasons.set('engineBoundary',at-due);
          if(!reasons.size)reasons.set('otherFence',null);
          for(const [reason,lag] of reasons)(staleReasons[reason]??=[]).push(lag);
        }else if(spans.has(uid)&&at!==undefined){
          staleSpanMs.push(at-spans.get(uid));spans.delete(uid);
        }
      }
      await sleep(200);
    }
  })());
  traffic.push((async()=>{
    while(!stopping){
      const display=await h.service.projectFoodInboxDelivery(h.display,h.matchId);
      assert.equal(display.fresh,true);
      assert.equal(display.recheckAt,undefined);
      observerReads++;
      const bots=await h.service.runBots(h.matchId);
      if(display.snapshot.foodStream){assert.equal(bots.accepted,0);botWakes++;}
      await sleep(680);
    }
  })());
  for(const load of traffic)void load.catch(()=>{});
  async function offered(uid,predicate){
    for(let pass=0;pass<200;pass++){
      const frame=await h.service.projectFoodInboxDelivery(uid,h.matchId);
      const view=frame.snapshot.foodPlayerView, own=view?.participantTask;
      if(frame.fresh&&own?.stage==='ACTIVE'&&predicate(own,view))return {own,view};
      await sleep(40);
    }
    assert.fail('Expected current authoritative control offer');
  }
  async function send(uid,{own,view},input){
    const request=envelope(view,{type:'TASK_PRESS',taskId:route.scope.taskId,controlSessionId:own.controlSessionId,
      expectedControlRevision:own.controlRevision,input});
    const action=startAction(uid,{operation:'foodCommand',request});
    const result=await h.invoke(uid,'foodCommand',{request});
    action.response=performance.now();
    assert.equal(result.ok,true,JSON.stringify(result));
    assert.equal(result.result.receipt.status,'accepted',JSON.stringify(result));
    buttonMs.push(action.response-action.received);contacts.push(action);
  }
  try{
    const winchOffer=await offered(winch,(_own,view)=>view.offers.some(offer=>offer.type==='TASK_PRESS'&&offer.inputs.includes('HOLD')));
    const gesture={kind:'HOLD',gestureSequence:1,crateId:winchOffer.own.crate.id};
    await send(winch,winchOffer,{...gesture,edge:'DOWN'});
    const panelOffer=await offered(panel,(own,view)=>own.crate.state==='HELD'&&view.offers.some(offer=>
      offer.type==='TASK_PRESS'&&offer.inputs.includes('PANEL_RELEASE')));
    await send(panel,panelOffer,{kind:'PANEL_RELEASE'});
    const contact=await offered(winch,own=>own.ownGesture.currentHolder?.sequence===1);
    await send(winch,contact,{...gesture,edge:'UP'});
    await ownerRun;
    const completed=await read('foodInboxResult/'+foodInboxScopeKey(route.scope));
    const finalOwner=await read(ownerPath);
    assert.equal(finalOwner.epoch,owner.epoch);
    assert.equal(finalOwner.expiresAt,0);
    assert.ok(completed.closedAt>=task.returnsAt&&completed.closedAt-task.returnsAt<1_000);
    assert.ok(heartbeatMs.length>=48, 'Both clients kept their presence loop until the physical Task ended');
    const retained=await Promise.all((await store.listKeys('foodInboxWake',100)).map(read));
    const watchdogs=retained.filter(record=>record?.watchdogFor===owner.id);
    assert.ok(watchdogs.length>=2, 'The same leased owner persisted multiple expiry wake revisions');
    const percentile=(values,p)=>values.length?Math.round([...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1]):null;
    const stats=values=>({n:values.length,p95:percentile(values,.95),max:percentile(values,1)});
    const timings=(actions)=>{
      const rows=actions.map(allStages);
      return {
      receivedToIntakeAck:stats(rows.flatMap(row=>row.intakeAck===undefined?[]:[row.intakeAck-row.received])),
      receivedToAdmittedClock:stats(rows.flatMap(row=>row.admittedAt===undefined?[]:[row.admittedAt-row.received])),
      appendAckToApplyAck:stats(rows.flatMap(row=>row.appendAck===undefined||row.applyAck===undefined?[]:[row.applyAck-row.appendAck])),
      receivedToApplyAck:stats(rows.flatMap(row=>row.applyAck===undefined?[]:[row.applyAck-row.received])),
      receivedToExactResponse:stats(rows.map(row=>row.response-row.received)),
      applyAckToExactResponse:stats(rows.flatMap(row=>row.applyAck===undefined?[]:[row.response-row.applyAck])),
      };
    };
    t.diagnostic(JSON.stringify({localBootstrapMs:Math.round(localBootstrapMs),heartbeats:heartbeatMs.length,
      heartbeatP95Ms:percentile(heartbeatMs,.95),heartbeatMaxMs:percentile(heartbeatMs,1),
      controlCount:buttonMs.length,controlP95Ms:percentile(buttonMs,.95),controlMaxMs:percentile(buttonMs,1),
      ownerHandoffs:finalOwner.epoch-owner.epoch,watchdogs:watchdogs.length,staleParticipantSamples:stale,
      participantSamples:sampled,freshWithEngineDue,botWakes,observerReads,returnDriftMs:completed.closedAt-task.returnsAt,
      staleReasons:Object.fromEntries(Object.entries(staleReasons).map(([reason,ages])=>[reason,{
        count:ages.length,ageMs:stats(ages.filter(age=>age!==null)),
      }])),sampledStaleSpanMs:stats(staleSpanMs),staleSpansCensored:spans.size,
      stagedHeartbeatMs:timings(contacts.filter(row=>row.kind==='heartbeat')),
      stagedControlMs:timings(contacts.filter(row=>row.kind!=='heartbeat')),
      unavailableHeartbeats:transientContacts.map(allStages).map(row=>({atSinceJoinMs:Math.round(row.received-origin),
        serviceMs:Math.round(row.response-row.received),intakeAck:row.intakeAck!==undefined,
        admitted:row.admittedAt===undefined?null:Math.round(row.admittedAt-row.received),
        applied:row.applyAck===undefined?null:Math.round(row.applyAck-row.received),
        requestTiming:row.service})),
    }));
    assert.equal(transientContacts.length,0,'No live heartbeat should exceed the service recovery budget');
  }finally{
    stopping=true;
    if(!(await read('foodInboxResult/'+foodInboxScopeKey(route.scope)))){
      await h.invoke(h.host,'abort',{matchId:h.matchId,requestId:h.nextId()});
    }
    await Promise.allSettled([ownerRun,...traffic]);
  }
  await Promise.all(traffic);
});

test('an invalid saved authority profile never falls back to detached legacy intake', {timeout:60_000},async t=>{
  const {h,winch,route,store,read}=await inboxMatch(t);
  const controlKey='foodIngressControl/'+h.matchId;
  const original=await read(controlKey),path='session/'+h.matchId;
  for(const corrupt of [null,'unknown-food-authority']){
    await store.transaction(async tx=>tx.set(path,{...await tx.get(path),foodAuthorityProfile:corrupt}));
    const command=await h.invoke(winch,'foodHeartbeat',{matchId:h.matchId,taskId:route.scope.taskId});
    assert.equal(command.error.code,'UNAVAILABLE');
    assert.deepEqual(await read(controlKey),original);
  }
});

test('two live Food owners continue while an unrelated ordinary deadline advances', {timeout:60_000},async t=>{
  const games=[await inboxMatch(t,{live:true,humans:2}),await inboxMatch(t,{live:true,humans:2})];
  const ordinary=await planetServiceHarness({store:games[0].store});
  ok(await ordinary.operation(ordinary.host,'beginSetup',{matchId:ordinary.matchId}));
  const ready=await Promise.all(games.map(async game=>{
    const {h,store,read}=game;
    const records=await Promise.all((await store.listKeys('foodInboxWake',100)).map(read));
    return records.find(record=>record?.wake.scope.matchId===h.matchId).wake;
  }));
  const origin=performance.now();
  const workerRuns=games.map((game,index)=>{
    game.h.reload({clock:()=>game.task.options.startedAt+Math.floor(performance.now()-origin)});
    return game.h.service.runFoodInbox(ready[index]);
  });
  for(const run of workerRuns)void run.catch(()=>{});
  const milliseconds=[];
  let normalResult;
  try{
    for(const game of games){
      let present;
      for(let retry=0;retry<75&&!present;retry++){
        present=await game.read('foodInboxOwner/'+foodInboxScopeKey(game.route.scope));
        if(!present)await sleep(15);
      }
      assert.equal(present?.epoch,1);
    }
    for(let round=0;round<4;round++){
      const beats=games.flatMap(game=>[game.winch,game.panel].map(async uid=>{
        const at=performance.now();
        assert.deepEqual(ok(await game.h.invoke(uid,'foodHeartbeat',{
          matchId:game.h.matchId,taskId:game.route.scope.taskId,
        })),{renewed:true});
        milliseconds.push(performance.now()-at);
      }));
      if(round===1)beats.push(ordinary.deadline().then(result=>{normalResult=result.status;}));
      await Promise.all(beats);
      if(round<3)await sleep(700);
    }
    assert.equal(normalResult,'advanced');
    assert.equal((await ordinary.current()).status,'reading');
    assert.equal(milliseconds.length,16);
    t.diagnostic(JSON.stringify({simultaneousTasks:2,heartbeats:milliseconds.length,normalDeadline:normalResult,
      heartbeatP95Ms:Math.round([...milliseconds].sort((a,b)=>a-b)[Math.ceil(milliseconds.length*.95)-1]),
      heartbeatMaxMs:Math.round(Math.max(...milliseconds))}));
  }finally{
    await Promise.all(games.map(game=>game.h.invoke(game.h.host,'abort',{matchId:game.h.matchId,requestId:game.h.nextId()})));
    await Promise.all(workerRuns);
  }
});
