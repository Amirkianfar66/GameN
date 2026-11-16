import assert from 'node:assert/strict';
import {test} from 'node:test';
import {setTimeout as sleep} from 'node:timers/promises';
import {PLANET_FOOD_OWNER_INBOX_PROFILE} from '../../dist/index.js';
import {createFoodInboxIntent,createPlanetFoodInbox,foodInboxScopeKey} from '../../dist/planet-food-inbox.js';
import {createLoopbackFoodStore} from './firestore.mjs';
import {seedTwoHumanTask} from './fixture.mjs';

async function inboxMatch(t,{overlap=false}={}){
  const real=createLoopbackFoodStore();
  let failAfterOwnerClaim=false, ownerWasClaimed=false;
  const joined=Promise.withResolvers(), trailing=Promise.withResolvers();
  let joinId, trailingId, trailingReply, trailingRequest;
  const store={...real,
    async transaction(action){
      let claim=false, observed;
      const value=await real.transaction(tx=>action({...tx,set(path,item){
        if(path.startsWith('foodInboxOwner/')&&item.expiresAt>0)claim=true;
        if(path.startsWith('foodIngress/')&&!item.response&&item.request?.operation==='foodCommand')
          observed=item;
        tx.set(path,item);
      }}));
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
      return real.readOnly(action);
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
  const seeded=await seedTwoHumanTask(store,7,{foodAuthorityProfile:PLANET_FOOD_OWNER_INBOX_PROFILE,submitJoin});
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
  return {...seeded,store,route,read,pump,call,deliveries,trailing,trailingRequest,trailingReply,failNextOwner:()=>{failAfterOwnerClaim=true;}};

}

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
