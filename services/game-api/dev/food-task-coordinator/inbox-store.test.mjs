import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {test} from 'node:test';
import {createFoodInboxIntent, createPlanetFoodInbox, PlanetFoodInboxConflict} from '../../dist/planet-food-inbox.js';
import {PLANET_FOOD_INBOX_VERSION} from '../../dist/planet-food-inbox-types.js';
import {createLoopbackFoodStore} from './firestore.mjs';
import {createFoodTaskCoordinator} from './coordinator.mjs';
import {envelope, seedTwoHumanTask} from './fixture.mjs';

const scope=()=>({version:PLANET_FOOD_INBOX_VERSION,matchId:randomUUID(),phaseId:randomUUID(),taskId:randomUUID()});
const binding={uid:'crew-1',seatId:'seat-1',revision:1};
const heartbeat=(target,original,taskId=target.taskId)=>createFoodInboxIntent(target,binding,
  {operation:'foodHeartbeat',matchId:target.matchId,taskId},original);
const progress={kind:'admitted',sequence:33,admittedAt:1875000};

test('Food inbox isolates its frozen original and uses stable semantic deduplication',()=>{
  const target=scope(), actor={...binding};
  const request={operation:'foodHeartbeat',matchId:target.matchId,taskId:target.taskId};
  const intent=createFoodInboxIntent(target,actor,request,'original');
  const retry=createFoodInboxIntent(target,actor,{taskId:request.taskId,matchId:request.matchId,operation:request.operation},'original');
  assert.equal(intent.id,retry.id);
  assert.equal(intent.fingerprint,retry.fingerprint);
  target.phaseId='different';actor.revision=3;request.taskId='changed';
  assert.notEqual(intent.scope.phaseId,target.phaseId);
  assert.equal(intent.binding.revision,1);
  assert.notEqual(intent.request.taskId,request.taskId);
  assert.ok(Object.isFrozen(intent.request)&&Object.isFrozen(intent.binding));
});

test('Food inbox persists intake once across a lost acknowledgement and conflicts',async t=>{
  const store=createLoopbackFoodStore();t.after(()=>store.close());
  const target=scope(), original=heartbeat(target,'original');
  let loseAck=true;
  const interrupted={...store,async transaction(action){
    const result=await store.transaction(action);
    if(loseAck){loseAck=false;throw new Error('lost intake acknowledgement');}
    return result;
  }};
  const inbox=createPlanetFoodInbox(interrupted);
  assert.deepEqual(await inbox.intake(original,10),{kind:'queued',id:original.id,duplicate:true});
  assert.equal(await store.readOnly(tx=>inbox.progress(tx,original)),null);
  assert.equal((await inbox.next(target)).id,original.id);
  assert.equal((await inbox.intake(original,25)).duplicate,true);
  await assert.rejects(inbox.intake(heartbeat(target,'original','changed-body'),10),PlanetFoodInboxConflict);
  let pending;
  await assert.rejects(inbox.dispatch(original.id,async wake=>{pending=wake;throw new Error('lost enqueue ACK');}),/lost enqueue/);
  const calls=[];
  await inbox.dispatch(original.id,async wake=>{calls.push(wake);});
  assert.deepEqual(calls,[pending]);
  assert.deepEqual(calls[0],{kind:'food-inbox',id:original.id,scope:target,wakeAt:10});
  assert.equal(await inbox.dispatch(original.id,async()=>assert.fail('already delivered')),false);
  assert.ok(!(await store.listKeys('foodInboxWake',100)).includes('foodInboxWake/'+original.id));
});

test('Food inbox drains every same-priority row and persists deletion with progress',async t=>{
  const store=createLoopbackFoodStore();t.after(()=>store.close());
  const target=scope(), inbox=createPlanetFoodInbox(store);
  const tied=['e','d','c','b','a'].map(id=>heartbeat(target,id)).sort((a,b)=>a.id<b.id?-1:1);
  // A Firestore server timestamp transform produces one shared request time for
  // every document written in this transaction. Stage in reverse ID order.
  await store.transaction(async tx=>{for(const row of [...tied].reverse())inbox.stageIntake(tx,row,100);});
  const foreign=heartbeat({...target,phaseId:randomUUID()},'other');
  await inbox.intake(foreign,100);
  const first=await inbox.next(target);
  assert.equal(first.id,tied[0].id);
  await assert.rejects(store.transaction(async tx=>{
    inbox.consume(tx,first,progress);
    throw new Error('aborted admission');
  }),/aborted admission/);
  assert.equal((await inbox.next(target)).id,first.id);
  assert.equal(await store.readOnly(tx=>inbox.progress(tx,first)),null);
  const late=heartbeat(target,'late-between-scans');
  for(const [index,row] of tied.entries()){
    assert.equal((await inbox.next(target)).id,row.id);
    const result={...progress,sequence:progress.sequence+index};
    await store.transaction(async tx=>{
      tx.create('syntheticAppend/'+row.id,{result});
      inbox.consume(tx,row,result);
    });
    assert.deepEqual(await store.readOnly(tx=>inbox.progress(tx,row)),result);
    assert.equal((await inbox.intake(row,200)).duplicate,true);
    if(index===0)await inbox.intake(late,100);
  }
  assert.equal((await inbox.next(target)).id,late.id);
  await store.transaction(async tx=>inbox.consume(tx,late,progress));
  assert.equal(await inbox.next(target),null);
  assert.equal((await inbox.next(foreign.scope)).id,foreign.id);
});

test('fenced owner consumes stale binding and preserves an already-admitted original', {timeout:60_000}, async t=>{
  const store=createLoopbackFoodStore();t.after(()=>store.close());
  const {h,session,task,winch}=await seedTwoHumanTask(store);
  const target={version:PLANET_FOOD_INBOX_VERSION,matchId:h.matchId,phaseId:session.state.phase.id,taskId:task.options.taskId};
  const actor=session.members.find(m=>m.uid===winch);
  const trusted={uid:winch,seatId:actor.seatId,revision:actor.bindingRevision};
  const inbox=createPlanetFoodInbox(store);
  const blocked=createFoodInboxIntent(target,{...trusted,revision:trusted.revision+1},
    {operation:'foodHeartbeat',matchId:h.matchId,taskId:target.taskId},'stale');
  let now=task.options.startedAt+3_000;
  let loseAppendAck=false;
  const wrapper={...store,async transaction(action){
    const result=await store.transaction(action);
    if(loseAppendAck&&result?.sequence){loseAppendAck=false;throw new Error('lost ordered append ACK');}
    return result;
  }};
  const owner=createFoodTaskCoordinator({store:wrapper,clock:()=>now,admissionMode:'owner-fifo'});
  await owner.openTask({session});
  const lease=await owner.acquire(target.taskId,randomUUID());
  await inbox.intake(blocked,now);
  assert.deepEqual(await owner.admitInbox(await inbox.next(target),inbox.consume),{refusal:'FORBIDDEN'});
  assert.deepEqual(await store.readOnly(tx=>inbox.progress(tx,blocked)),
    {kind:'resolved',response:{ok:false,serverTimeMs:now,error:{code:'FORBIDDEN'}}});
  const next=createFoodInboxIntent(target,trusted,{operation:'foodHeartbeat',matchId:h.matchId,taskId:target.taskId},'valid');
  await inbox.intake(next,now);now+=100;
  loseAppendAck=true;
  await assert.rejects(owner.admitInbox(await inbox.next(target),inbox.consume),/lost ordered append ACK/);
  assert.equal(await inbox.next(target),null);
  assert.deepEqual(await store.readOnly(tx=>inbox.progress(tx,next)),{kind:'admitted',sequence:1,admittedAt:now});
  await owner.runDue(target.taskId,lease);
  const view=(await owner.snapshot(target.taskId,winch)).playerView;
  const ownTask=view.participantTask;
  const request=envelope(view,{type:'TASK_PRESS',taskId:target.taskId,controlSessionId:ownTask.controlSessionId,
    expectedControlRevision:ownTask.controlRevision,input:{kind:'HOLD',edge:'DOWN',gestureSequence:1,crateId:ownTask.crate.id}});
  const original=await owner.submit(target.taskId,winch,request);
  now+=100;
  const retried=createFoodInboxIntent(target,trusted,{operation:'foodCommand',request},request.commandId);
  await inbox.intake(retried,now);
  const answer=await owner.admitInbox(await inbox.next(target),inbox.consume);
  assert.equal(answer.duplicate,true);
  assert.equal(answer.admittedAt,original.admittedAt);
  assert.equal(await inbox.next(target),null);
  assert.deepEqual(await store.readOnly(tx=>inbox.progress(tx,retried)),{kind:'admitted',sequence:2,admittedAt:original.admittedAt});
});
