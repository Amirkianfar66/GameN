import assert from 'node:assert/strict';
import {test} from 'node:test';
import {setTimeout as sleep} from 'node:timers/promises';
import {createPlanetService,PLANET_FOOD_OWNER_INBOX_PROFILE,withPlanetRequestTiming} from '../../dist/index.js';
import {createFoodInboxIntent,createPlanetFoodInbox,foodInboxScopeKey} from '../../dist/planet-food-inbox.js';
import {createLoopbackFoodStore} from './firestore.mjs';
import {envelope,seedTwoHumanTask} from './fixture.mjs';

async function inboxMatch(t,{overlap=false,live=false,humans=7}={}){
  const real=createLoopbackFoodStore();
  let failAfterOwnerClaim=false, ownerWasClaimed=false;
  const joined=Promise.withResolvers(), trailing=Promise.withResolvers();
  let joinId, trailingId, trailingReply, trailingRequest,recordCommit;
  const store={...real,...(live?{}:{watchFoodInbox:undefined}),
    async transaction(action){
      let claim=false, observed, recorded=[];
      const value=await real.transaction(tx=>{
        recorded=[];
        return action({...tx,
          create(path,item){
            if(recordCommit&&path.startsWith('foodInboxIntent/'))recorded.push({stage:'intake',item});
            if(recordCommit&&path.startsWith('foodInboxProgress/'))recorded.push({stage:'progress',item,id:path.split('/').at(-1)});
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
  return {...seeded,store,route,read,pump,call,deliveries,trailing,trailingRequest,trailingReply,setCommitObserver:observe=>{recordCommit=observe;},failNextOwner:()=>{failAfterOwnerClaim=true;}};

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
