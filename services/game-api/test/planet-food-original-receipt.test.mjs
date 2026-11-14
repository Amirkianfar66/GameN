import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chooseFoodBotInput} from '../dist/food-bot-policy.js';
import {planetServiceHarness,memoryPlanetStore,digest,ok,denied} from './planet-service-helper.mjs';
import {enterTimedPlanetBoarding} from './planet-timed-reading-helper.mjs';

// Causal persistence-fault controls over the real service and engine, with an
// injected fixture clock. These are not Firestore or native latency evidence.
const clone=value=>structuredClone(value);
const stored=(store,key)=>new Map(store.export()).get(key);
const receiptKey=(h,seatId,request)=>'food-command/'+digest([h.matchId,seatId,request.commandId]);
const ownEntries=(h,request)=>h.store.export().filter(([key,value])=>key.startsWith('foodIngress/')
  &&value.request?.operation==='foodCommand'&&value.request.request.commandId===request.commandId).map(([,value])=>value);
const ownJournal=(h,request)=>h.store.export().filter(([key,value])=>key.startsWith('journal/'+h.matchId+'/')
  &&value.kind==='FOOD_COMMAND'&&value.request.commandId===request.commandId).map(([,value])=>value);

/** Detached snapshot reads allow normal recovery operations immediately before
 * final verification without holding the fake writer queue. No game state,
 * original receipt or membership is seeded or altered by this fault port.
 */
function faultStore(){
  const base=memoryPlanetStore(),stats={injected:0,finalVerificationStarts:0};
  let armed=null,verification=null;
  const inject=fault=>{
    assert.equal(verification,null,'Only one final verification hook is pending');
    verification=fault;stats.injected++;
    return new Error('Synthetic receipt transport/storage failure');
  };
  return {...base,stats,
    arm(mode,key,{beforeFinalRead}={}){
      assert.equal(armed,null);assert.equal(verification,null);
      armed={mode,key,beforeFinalRead};
    },
    readOnly:async operation=>{
      if(verification){const current=verification;verification=null;stats.finalVerificationStarts++;
        if(current.beforeFinalRead)await current.beforeFinalRead();}
      const snapshot=new Map(base.export());
      return operation(Object.freeze({get:async key=>clone(snapshot.get(key)??null)}));
    },
    transaction:operation=>{
      let afterCommit=null;
      return base.transaction(async tx=>operation({
        get:async key=>{
          const value=await tx.get(key);
          if(armed?.mode==='lookup'&&key===armed.key){const fault=armed;armed=null;throw inject(fault);}
          return value;
        },
        set:(key,value)=>{
          if(armed?.mode==='beforeReceiptCommit'&&key===armed.key){const fault=armed;armed=null;throw inject(fault);}
          tx.set(key,value);
          if(armed?.mode==='afterReceiptCommit'&&key===armed.key){afterCommit=armed;armed=null;}
        },
        delete:key=>tx.delete(key),
      })).then(result=>{if(afterCommit)throw inject(afterCommit);return result;});
    },
  };
}

function press(h,view,input){
  const task=view.participantTask;assert.ok(task);
  return {schemaVersion:1,protocolVersion:3,matchId:h.matchId,phaseId:view.phaseId,foodStepId:view.step.stepId,
    round:view.round,commandId:h.nextId(),command:{type:'TASK_PRESS',taskId:task.taskId,
      controlSessionId:task.controlSessionId,expectedControlRevision:task.controlRevision,input}};
}

async function setup(count=7){
  const store=faultStore(),h=await planetServiceHarness({count,humans:1,store,setupFlowVersion:3,
    engineProfile:'food-task-1.4',assetManifestVersion:'design-0.9.0',sample:.999999});
  const {session:boarding}=await enterTimedPlanetBoarding(h);
  h.setTime(boarding.setup.endsAt);await h.service.runDeadline(await h.currentJob());
  await h.service.runBots(h.matchId);
  const invited=await h.read(h.players[0]),view=invited.foodPlayerView;
  const offer=view.offers.find(value=>value.type==='TASK_ANSWER');assert.ok(offer);
  const request={schemaVersion:1,protocolVersion:3,matchId:h.matchId,phaseId:view.phaseId,
    foodStepId:view.step.stepId,round:view.round,commandId:h.nextId(),command:{type:'TASK_ANSWER',
      requestId:offer.requestId,requestRevision:offer.requestRevision,answer:'JOIN'}};
  const response=await h.invoke(h.players[0],'foodCommand',{request});
  assert.equal(ok(response).receipt.status,'accepted');
  const snapshot=await h.read(h.players[0]),seatId=snapshot.selfSeatId,task=snapshot.foodPlayerView.participantTask;
  assert.equal(task.selfControl,'WINCH');assert.equal(snapshot.versions.engineVersion,'planet-game-1.4.0');
  assert.equal(snapshot.versions.assetManifestVersion,'design-0.9.0');
  return {h,store,seatId,task,snapshot,joined:{request,response}};
}

async function original(f,status){
  if(status==='accepted')return f.joined;
  const request=press(f.h,f.snapshot.foodPlayerView,{kind:'KEY'});
  const response=await f.h.invoke(f.h.players[0],'foodCommand',{request});
  assert.equal(ok(response).receipt.status,'rejected');assert.equal(response.result.receipt.code,'NOT_ALLOWED');
  return {request,response};
}

async function replaceOwner(f,nextUid){
  const issued=ok(await f.h.operation(f.h.host,'issueRecovery',{matchId:f.h.matchId,seatId:f.seatId}));
  ok(await f.h.operation(nextUid,'redeemRecovery',{matchId:f.h.matchId,recoveryCode:issued.recoveryCode}));
  return (await f.h.current()).members.find(member=>member.seatId===f.seatId);
}

for(const count of [7,8,9])for(const status of ['accepted','rejected'])test(
  `${count}: currently authorized ${status} original survives an earlier receipt-lookup fault unchanged`,async()=>{
    const f=await setup(count),{h,store,seatId}=f,q=await original(f,status),key=receiptKey(h,seatId,q.request);
    const originalStored=stored(store,key);assert.ok(originalStored);assert.deepEqual(originalStored.response,q.response);
    const before=store.export(),draws=h.draws();h.setTime(h.now()+37);h.reload();
    store.arm('lookup',key);
    const recovered=await h.invoke(h.players[0],'foodCommand',{request:q.request});
    assert.equal(store.stats.injected,1);assert.equal(store.stats.finalVerificationStarts,1);
    assert.deepEqual(recovered,q.response,'Return the exact stored response, including its original server/receipt time');
    assert.equal(recovered.result.receipt.status,status);assert.notEqual(recovered.serverTimeMs,h.now());
    assert.equal(h.draws(),draws,'Receipt recovery does not sample another gameplay context');
    assert.deepEqual(store.export(),before,'Recovery adds no ingress, budget, authority, journal or lease mutation');
    assert.equal(ownEntries(h,q.request).length,1);assert.equal(ownJournal(h,q.request).length,1);
  });

for(const status of ['accepted','rejected'])test(
  `new ${status} receipt remains authoritative after its authority commit acknowledgement fails`,async()=>{
    const f=await setup(),{h,store,seatId}=f;let request;
    if(status==='accepted'){
      h.setTime(f.task.runningAt);
      const view=(await h.read(h.players[0])).foodPlayerView,decision=chooseFoodBotInput(view).command;
      assert.ok(decision);assert.equal(decision.type,'TASK_PRESS');assert.equal(decision.input.kind,'HOLD');
      request=press(h,view,decision.input);
    }else request=press(h,f.snapshot.foodPlayerView,{kind:'KEY'});
    const key=receiptKey(h,seatId,request);assert.equal(stored(store,key),undefined);
    store.arm('afterReceiptCommit',key);
    const result=await h.invoke(h.players[0],'foodCommand',{request}),originalStored=stored(store,key);
    assert.equal(store.stats.injected,1);assert.equal(store.stats.finalVerificationStarts,1);assert.ok(originalStored);
    assert.equal(originalStored.response.result.receipt.status,status);
    assert.deepEqual(result,originalStored.response,'The technical failure cannot replace a freshly verified durable original');
    assert.equal(ownEntries(h,request).length,1);assert.equal(ownJournal(h,request).length,1);
    const before=store.export(),draws=h.draws();h.setTime(h.now()+1);h.reload();
    assert.deepEqual(await h.invoke(h.players[0],'foodCommand',{request}),originalStored.response);
    assert.deepEqual(store.export(),before);assert.equal(h.draws(),draws);
  });

test('a technical failure with no durable original stays UNAVAILABLE and retains the original pending input',async()=>{
  const f=await setup(),{h,store,seatId}=f,request=press(h,f.snapshot.foodPlayerView,{kind:'KEY'});
  const key=receiptKey(h,seatId,request),beforeState=clone((await h.current()).state);
  store.arm('beforeReceiptCommit',key);
  denied(await h.invoke(h.players[0],'foodCommand',{request}),'UNAVAILABLE');
  assert.equal(store.stats.injected,1);assert.equal(store.stats.finalVerificationStarts,1);
  assert.equal(stored(store,key),undefined);assert.deepEqual((await h.current()).state,beforeState);
  const pending=ownEntries(h,request);assert.equal(pending.length,1);assert.equal(pending[0].response,null);
  assert.equal(ownJournal(h,request).length,0);
  const draws=h.draws();h.setTime(h.now()+1);
  const recovered=await h.invoke(h.players[0],'foodCommand',{request});
  assert.equal(ok(recovered).receipt.status,'rejected');assert.equal(recovered.result.receipt.receivedAt,pending[0].context.now);
  assert.equal(h.draws(),draws);assert.equal(ownEntries(h,request).length,1);assert.equal(ownJournal(h,request).length,1);
});

test('normal recovery revokes the old UID before the final durable-receipt check',async()=>{
  const f=await setup(),{h,store,seatId,joined:q}=f,key=receiptKey(h,seatId,q.request),originalStored=stored(store,key);
  const oldUid=h.players[0],nextUid=h.nextId();
  store.arm('lookup',key,{beforeFinalRead:async()=>{
    const owner=await replaceOwner(f,nextUid);assert.equal(owner.uid,nextUid);
  }});
  denied(await h.invoke(oldUid,'foodCommand',{request:q.request}),'FORBIDDEN');
  assert.equal(store.stats.injected,1);assert.equal(store.stats.finalVerificationStarts,1);
  assert.deepEqual(stored(store,key),originalStored);assert.equal(ownEntries(h,q.request).length,1);
  denied(await h.invoke(oldUid,'foodReceipt',{matchId:h.matchId,commandId:q.request.commandId}),'FORBIDDEN');
});

test('restoring the same UID through normal recovery does not bypass its changed binding revision',async()=>{
  const f=await setup(),{h,store,seatId,joined:q}=f,key=receiptKey(h,seatId,q.request),originalStored=stored(store,key);
  const oldUid=h.players[0],nextUid=h.nextId(),initial=(await h.current()).members.find(member=>member.seatId===seatId);
  store.arm('lookup',key,{beforeFinalRead:async()=>{
    await replaceOwner(f,nextUid);const owner=await replaceOwner(f,oldUid);
    assert.equal(owner.uid,oldUid);assert.equal(owner.bindingRevision,initial.bindingRevision+2);
  }});
  denied(await h.invoke(oldUid,'foodCommand',{request:q.request}),'FORBIDDEN');
  assert.equal(store.stats.injected,1);assert.equal(store.stats.finalVerificationStarts,1);
  assert.deepEqual(stored(store,key),originalStored);assert.equal(ownEntries(h,q.request).length,1);
  assert.equal(ownJournal(h,q.request).length,1);
});

test('a final fingerprint conflict takes precedence over an earlier technical failure',async()=>{
  const f=await setup(),{h,store,seatId,joined:q}=f,key=receiptKey(h,seatId,q.request),before=store.export();
  const changed={...q.request,command:{...q.request.command,answer:'DECLINE'}};
  store.arm('lookup',key);
  denied(await h.invoke(h.players[0],'foodCommand',{request:changed}),'COMMAND_ID_CONFLICT');
  assert.equal(store.stats.injected,1);assert.equal(store.stats.finalVerificationStarts,1);
  assert.deepEqual(store.export(),before);assert.equal(ownEntries(h,q.request).length,1);
});

test('failure of the final verification read cannot fall back to an unverified original response',async()=>{
  const f=await setup(),{h,store,seatId,joined:q}=f,key=receiptKey(h,seatId,q.request),before=store.export();
  store.arm('lookup',key,{beforeFinalRead:async()=>{throw new Error('Synthetic final authorization/read failure');}});
  const result=await h.invoke(h.players[0],'foodCommand',{request:q.request});denied(result,'UNAVAILABLE');
  assert.equal(store.stats.injected,1);assert.equal(store.stats.finalVerificationStarts,1);
  assert.equal('result' in result,false);assert.deepEqual(store.export(),before);
});
