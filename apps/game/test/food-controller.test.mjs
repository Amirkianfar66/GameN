import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createFoodTaskController,createFoodHoldInput} from '../dist/index.js';
import {FOOD_TASK_VERTICAL} from '@mothership/contracts';
import {playerView} from '../../../tests/bootstrap/support/food-task-contract-fixture.mjs';

const copy=v=>structuredClone(v),flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
function receipt(q,{status='accepted',effect='APPLIED',code='NOT_ALLOWED',closure=null}={}){
 const {command,...context}=q,c=command;
 if(status==='rejected')return {...context,status,receivedAt:6000,code,requestClosure:closure};
 const result=c.type==='TASK_PRESS'?{kind:'INPUT',taskId:c.taskId,controlSessionId:c.controlSessionId,
  effect,gestureSequence:c.input.kind==='HOLD'?c.input.gestureSequence:null,crateId:c.input.kind==='HOLD'?c.input.crateId:null,
  ...(c.input.kind==='HOLD_RECOVER_OFF'?{effect:'RECOVERED_CLOSED',closedThroughSequence:c.input.throughSequence}:{})}
  :{kind:'REQUEST',requestId:c.type==='TASK_ASK'?'request-original':c.requestId,
   requestRevision:c.type==='TASK_ASK'?0:c.requestRevision+1,state:c.type==='TASK_ASK'?'PENDING':c.type==='TASK_ASK_WITHDRAW'?'WITHDRAWN':c.answer==='JOIN'?'JOINED':'DECLINED'};
 return {...context,status,receivedAt:6000,result};
}
function rig({saved=null,send=null,lookup=null,storeFailure=false,idStart=0}={}){
 let uid='food-owner',now=6000,synced=true,sequence=idStart,stored=saved,failStore=storeFailure;
 const sent=[],lookups=[],timers=new Map();let timerId=0;
 const ports={clock:{now:()=>now},ids:{next:()=>`native-command-${++sequence}`},scheduler:{setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id)},
  recovery:{load:()=>stored,save:value=>{if(failStore)throw Error('store unavailable');stored=value;},clear:()=>{if(failStore)throw Error('store unavailable');stored=null;}}};
 const controller=createFoodTaskController({currentUid:()=>uid,refresh(){},
  command:q=>{sent.push(copy(q));return send?send(q):Promise.resolve({receipt:receipt(q),serverTimeMs:now});},
  receipt:context=>{lookups.push(copy(context));return lookup?lookup(context):Promise.resolve({receipt:null,serverTimeMs:now});}},ports,
  {binding:{uid,matchId:'food-fixture-7',seatId:'seat-1'},readClock:()=>synced?{status:'synced',serverNowMs:now,uncertaintyMs:0}:{status:'unsynced'}});
 const observe=(v=playerView(7))=>controller.observe(v,{matchId:v.matchId,versions:v.versions,phaseId:v.phaseId,round:v.round,serverNowMs:v.serverNowMs});
 return {controller,sent,lookups,observe,saved:()=>stored,setUid:value=>{uid=value;},setSynced:value=>{synced=value;},setStoreFailure:value=>{failStore=value;},
  async advance(ms){now+=ms;for(const [id,t]of [...timers])if(t.at<=now){timers.delete(id);t.fn();}await flush();}};
}
function asking(){const v=playerView(7);v.participantTask=null;v.step={kind:'ASKING',stepId:'food-step-2',startedAt:1000,askingEndsAt:31000,someoneAsking:false};
 v.ownAvailability={canAsk:true,reason:null};v.partnerChoices=v.partnerChoices.map(p=>({...p,available:true,reason:null}));v.offers=[{type:'TASK_ASK',partnerSeatIds:v.partnerChoices.map(p=>p.seatId)}];return v;}
function landed(){const v=playerView(7),t=v.participantTask;v.viewRevision++;t.revision++;t.controlRevision++;
 t.crate={...t.crate,state:'LANDED',x:5,height:FOOD_TASK_VERTICAL.platform};t.ownGesture.highestSequence=1;t.ownGesture.recoveryRevision++;
 v.offers=[{...v.offers[0],controlRevision:t.controlRevision,inputs:['KEY']}];return v;}

test('causal UP leaves while DOWN is pending; late DOWN receipt cannot regress the newer feedback or move the crate',async()=>{
 const a=deferred(),b=deferred(),r=rig({send:q=>q.command.input.edge==='DOWN'?a.promise:b.promise});assert.equal(r.observe(),true);
 assert.equal(r.controller.holdDown(),true);assert.equal(r.sent.length,1);r.controller.holdUp();assert.equal(r.sent.length,2);
 const [down,up]=r.sent;assert.notEqual(up.commandId,down.commandId);assert.equal(up.phaseId,down.phaseId);
 assert.equal(up.command.taskId,down.command.taskId);assert.equal(up.command.controlSessionId,down.command.controlSessionId);
 assert.deepEqual(up.command.input,{...down.command.input,edge:'UP',crateId:null});
 b.resolve({receipt:receipt(up,{effect:'GESTURE_CLOSED'}),serverTimeMs:6000});await flush();
 a.resolve({receipt:receipt(down,{effect:'NO_CHANGE'}),serverTimeMs:6000});await flush();
 assert.equal(r.controller.getModel().feedback.commandId,up.commandId);assert.equal(r.controller.getModel().view.participantTask.crate.state,'INTAKE');r.controller.dispose();
});
test('release retains original Task/session/context after offers and crate generation change',async()=>{
 const r=rig();r.observe();r.controller.holdDown();await flush();const original=r.sent[0];
 const next=playerView(7);next.viewRevision++;next.participantTask.revision++;next.participantTask.crate.id='crate-replacement';next.participantTask.crate.generation=1;next.offers=[];
 assert.equal(r.observe(next),true);r.controller.holdUp();await flush();
 assert.equal(r.sent.length,2);assert.equal(r.sent[1].phaseId,original.phaseId);assert.equal(r.sent[1].command.expectedControlRevision,original.command.expectedControlRevision);
 assert.equal(r.sent[1].command.input.crateId,null);assert.equal(r.sent[1].command.input.gestureSequence,original.command.input.gestureSequence);r.controller.dispose();
});
test('connection loss alone sends no release; observed backgrounding sends UP before conceal',async()=>{
 const r=rig();r.observe();r.controller.holdDown();await flush();r.controller.disconnect();assert.equal(r.sent.length,1);
 r.controller.setVisible(false);assert.equal(r.sent.length,2);assert.equal(r.sent[1].command.input.edge,'UP');assert.equal(r.controller.getModel().view,null);
 r.controller.setVisible(true);assert.equal(r.controller.getModel().canHold,false);r.controller.dispose();
});
test('wrong authentication cannot release an original contact or expose its view',async()=>{
 const r=rig();r.observe();r.controller.holdDown();await flush();r.setUid('another-owner');r.controller.holdUp();await flush();
 assert.equal(r.sent.length,1);assert.equal(r.controller.getModel().view,null);assert.equal(r.controller.getModel().feedback,null);r.controller.dispose();
});
test('unknown responses retain both original identities; a null lookup never means rejection or permission for a replacement DOWN',async()=>{
 const r=rig({send:async()=>null});r.observe();r.controller.holdDown();r.controller.holdUp();await flush();
 const ids=r.sent.map(q=>q.commandId);assert.equal(r.controller.getModel().feedback.status,'unknown');await r.controller.checkReceipts();
 assert.deepEqual(r.lookups.map(q=>q.commandId),ids);assert.equal(r.controller.getModel().feedback.status,'unknown');assert.equal(r.controller.holdDown(),false);
 r.controller.dispose();
});
test('reloading an unknown Ask retains context/family, excludes its private Partner and never replays it',async()=>{
 const first=rig({send:async()=>null});first.observe(asking());await first.controller.ask('seat-4');
 const original=first.sent[0],saved=JSON.parse(first.saved());assert.deepEqual(saved.entries[0].command,{type:'TASK_ASK'});
 assert.ok(!JSON.stringify(saved).includes('seat-4'));first.controller.dispose();
 const r=rig({saved:JSON.stringify(saved),lookup:async()=>({receipt:receipt(original),serverTimeMs:6000})});r.observe(asking());await r.controller.checkReceipts();await r.controller.retry();
 assert.equal(r.sent.length,0);assert.equal(r.lookups[0].commandId,original.commandId);assert.equal(r.controller.getModel().feedback.status,'accepted');assert.equal(r.saved(),null);r.controller.dispose();
});
test('recovered Hold never replays DOWN; explicit finger-off closes actual older holder and newer pending contact atomically',async()=>{
 const v=playerView(7),t=v.participantTask;t.crate.state='HELD';t.crate.holder='WINCH';t.crate.height=1;
 t.ownGesture={controlSessionId:t.controlSessionId,highestSequence:2,recoveryRevision:6,currentHolder:{sequence:1,crateId:t.crate.id},pendingIntent:{sequence:2,crateId:t.crate.id}};
 const r=rig();assert.equal(r.observe(v),true);assert.equal(r.sent.length,0);assert.equal(r.controller.getModel().needsContactOff,true);assert.equal(r.controller.holdDown(),false);
 r.controller.holdUp();await flush();assert.equal(r.sent.length,1);assert.deepEqual(r.sent[0].command.input,{kind:'HOLD_RECOVER_OFF',recoveryRevision:6,throughSequence:2});
 assert.equal(r.sent.some(q=>q.command.input.kind==='HOLD'),false);r.controller.dispose();
});
async function storedHoldContact({release=true}={}){
 const seed=rig({send:async()=>null});seed.observe();seed.controller.holdDown();
 if(release)seed.controller.holdUp();
 await flush();
 const stored={saved:seed.saved(),original:seed.sent[0]};
 seed.controller.dispose();
 return stored;
}
function liveWinchContact(kind='currentHolder'){
 const view=playerView(7),task=view.participantTask;
 if(kind==='currentHolder')Object.assign(task.crate,{state:'HELD',holder:'WINCH',height:1});
 Object.assign(task.ownGesture,{highestSequence:1,recoveryRevision:2,[kind]:{sequence:1,crateId:task.crate.id}});
 return view;
}

test('recorded finger-off closes a fresh live contact before stalled original lookups',async t=>{
 for(const kind of ['currentHolder','pendingIntent'])await t.test(kind,async()=>{
  const {saved,original}=await storedHoldContact(),lookup=deferred(),ack=deferred(),calls=[];
  const r=rig({saved,idStart:2,send:q=>{calls.push(q.command.input.kind);return ack.promise;},
   lookup:()=>{calls.push('lookup');return lookup.promise;}});
  assert.equal(r.observe(liveWinchContact(kind)),true);
  assert.deepEqual(calls,['HOLD_RECOVER_OFF','lookup']);
  assert.equal(r.sent.length,1);
  assert.deepEqual(r.sent[0].command.input,{kind:'HOLD_RECOVER_OFF',recoveryRevision:2,throughSequence:1});
  assert.equal(r.controller.getModel().canHold,false);
  ack.resolve({receipt:receipt(r.sent[0]),serverTimeMs:6000});await flush();
  const closed=r.controller.getModel();
  assert.equal(closed.feedback,null);
  assert.equal(closed.recoveryFeedback.receipt.result.effect,'RECOVERED_CLOSED');
  assert.equal(closed.pendingCount,0);
  assert.equal(closed.canHold,false,'a receipt alone does not change the authorized contact');
  lookup.resolve({receipt:receipt(original),serverTimeMs:6000});await flush();
  assert.deepEqual(JSON.parse(r.saved()).entries,[]);
  assert.equal(r.controller.getModel().recoveryFeedback.commandId,r.sent[0].commandId);
  r.controller.dispose();
 });
});

test('untracked blur or disposal preserves a lookup-first off marker',async t=>{
 for(const action of ['blur','dispose'])await t.test(action,async()=>{
  const {saved}=await storedHoldContact({release:false}),stalled=deferred();
  const r=rig({saved,idStart:1,lookup:()=>stalled.promise});
  assert.equal(r.observe(liveWinchContact()),true);
  if(action==='blur')r.controller.setVisible(false);
  else r.controller.dispose();
  await flush();
  assert.equal(r.sent.length,0);
  const memory=JSON.parse(r.saved());
  assert.equal(memory.contact.offObserved,true);
  assert.deepEqual(memory.entries.map(q=>q.command.input.edge),['DOWN']);
  r.controller.dispose();

  const original=deferred(),reloaded=rig({saved:JSON.stringify(memory),idStart:1,lookup:()=>original.promise});
  assert.equal(reloaded.observe(liveWinchContact()),true);
  assert.equal(reloaded.lookups.length,1);
  assert.equal(reloaded.sent.length,0);
  original.resolve({receipt:null,serverTimeMs:6000});await flush();
  assert.deepEqual(reloaded.sent.map(q=>q.command.input.kind),['HOLD_RECOVER_OFF']);
  reloaded.controller.dispose();
 });
});

test('a live Winch holder cannot use an off proof outside its own context',async t=>{
 for(const key of ['phaseId','foodStepId','controlSessionId','ownerUid'])await t.test(key,async()=>{
  const {saved}=await storedHoldContact(),memory=JSON.parse(saved);
  (key==='ownerUid'?memory:memory.contact)[key]='different-scope';
  const r=rig({saved:JSON.stringify(memory),idStart:2});
  assert.equal(r.observe(liveWinchContact()),true);
  await r.controller.recoverOff();await flush();
  assert.equal(r.sent.length,0);
  if(key==='ownerUid'){
   assert.equal(r.lookups.length,0);
   assert.equal(r.controller.getModel().recoveryBlocked,true);
  }else{
   assert.ok(r.lookups.length>=2);
   assert.equal(r.controller.getModel().pendingCount,2);
  }
  r.controller.dispose();
 });
});

test('a stale closure-first receipt leaves every original unresolved',async()=>{
 const {saved}=await storedHoldContact(),original=deferred();
 const r=rig({saved,idStart:2,lookup:()=>original.promise,
  send:async q=>({receipt:receipt(q,{status:'rejected',code:'STALE_RECOVERY'}),serverTimeMs:6000})});
 assert.equal(r.observe(liveWinchContact()),true);
 assert.deepEqual(r.sent.map(q=>q.command.input.kind),['HOLD_RECOVER_OFF']);
 await flush();
 assert.equal(r.controller.getModel().feedback.status,'unknown');
 assert.equal(r.controller.getModel().recoveryFeedback.receipt.code,'STALE_RECOVERY');
 assert.equal(r.controller.getModel().canHold,false);
 assert.deepEqual(JSON.parse(r.saved()).entries,JSON.parse(saved).entries);
 r.controller.setVisible(false);r.controller.dispose();
});

test('saved unacknowledged high-water participates in fresh explicit off recovery',async()=>{
 const first=rig({send:async()=>null});first.observe();first.controller.holdDown();first.controller.holdUp();await flush();const saved=first.saved();first.controller.dispose();
 const r=rig({saved,idStart:2});r.observe();await flush();
 assert.equal(r.sent.length,1);assert.equal(r.sent[0].command.input.kind,'HOLD_RECOVER_OFF');assert.equal(r.sent[0].command.input.throughSequence,1);
 assert.ok(r.lookups.length>=2);assert.equal(r.sent.some(q=>q.command.input.kind==='HOLD'&&q.command.input.edge==='DOWN'),false);r.controller.dispose();
});
test('verified finger-off closure retires never-delivered Hold originals, enables an offered KEY and stays closed after reload',async()=>{
 const recovery=deferred(),r=rig({send:q=>q.command.input.kind==='HOLD'?Promise.resolve(null):recovery.promise});r.observe();
 r.controller.holdDown();r.controller.holdUp();await flush();const originals=r.sent.slice();
 assert.equal(r.controller.getModel().pendingCount,2);const off=r.controller.recoverOff();await flush();
 const q=r.sent.at(-1);assert.equal(q.command.input.kind,'HOLD_RECOVER_OFF');assert.equal(q.command.input.throughSequence,1);
 assert.deepEqual(r.lookups.map(q=>q.commandId),originals.map(q=>q.commandId));
 recovery.resolve({receipt:receipt(q),serverTimeMs:6000});await off;
 assert.equal(r.controller.getModel().pendingCount,0);assert.equal(r.controller.getModel().canCheck,false);
 assert.equal(r.controller.getModel().feedback,null);
 assert.equal(r.controller.getModel().recoveryFeedback.receipt.result.effect,'RECOVERED_CLOSED');
 assert.equal(r.observe(landed()),true);await flush();assert.equal(r.controller.getModel().canKey,true);
 const saved=r.saved();assert.deepEqual(JSON.parse(saved).entries,[]);assert.equal(JSON.parse(saved).contact.highestSequence,1);
 r.controller.dispose();
 const reloaded=rig({saved,idStart:3});assert.equal(reloaded.observe(landed()),true);await flush();
 assert.equal(reloaded.controller.getModel().pendingCount,0);assert.equal(reloaded.controller.getModel().canKey,true);
 await reloaded.controller.checkReceipts();assert.equal(reloaded.lookups.length,0);
 await reloaded.controller.press('KEY');assert.deepEqual(reloaded.sent.map(q=>q.command.input.kind),['KEY']);
 assert.equal(reloaded.sent.some(q=>q.command.input.kind==='HOLD'),false);reloaded.controller.dispose();
});
test('verified closure preserves unknown commands outside its exact original contact boundary',async t=>{
 const variants={
  'other Task':q=>{q.command.taskId='other-task';},
  'other control session':q=>{q.command.controlSessionId='other-session';},
  'higher sequence':q=>{q.command.input.gestureSequence=2;},
  'other phase':q=>{q.phaseId='other-phase';},
  'other Food step':q=>{q.foodStepId='other-step';},
  'other round':q=>{q.round=1;},
  'non-Hold input':q=>{q.command.input={kind:'KEY'};},
 };
 for(const [name,change]of Object.entries(variants))await t.test(name,async()=>{
  const first=rig({send:async()=>null});first.observe();first.controller.holdDown();first.controller.holdUp();await flush();
  const saved=JSON.parse(first.saved()),unrelated=copy(first.sent[0]);unrelated.commandId='unrelated-original';change(unrelated);saved.entries.push(unrelated);first.controller.dispose();
  const r=rig({saved:JSON.stringify(saved),idStart:2});r.observe();await flush();
  assert.equal(r.sent.length,1);assert.equal(r.sent[0].command.input.kind,'HOLD_RECOVER_OFF');
  assert.equal(r.controller.getModel().pendingCount,1);assert.deepEqual(JSON.parse(r.saved()).entries,[unrelated]);
  assert.equal(r.controller.getModel().canCheck,true);r.controller.dispose();
 });
});
test('rejected or mismatched recovery cannot retire unknown Hold inputs or permit a replacement DOWN',async t=>{
 for(const invalid of ['rejected','wrong boundary'])await t.test(invalid,async()=>{
  const r=rig({send:async q=>q.command.input.kind==='HOLD'?null:{receipt:invalid==='rejected'?receipt(q,{status:'rejected',code:'STALE_RECOVERY'}):
   {...receipt(q),result:{...receipt(q).result,closedThroughSequence:q.command.input.throughSequence+1}},serverTimeMs:6000}});
  r.observe();r.controller.holdDown();r.controller.holdUp();await flush();await r.controller.recoverOff();
  assert.equal(r.controller.getModel().pendingCount,invalid==='rejected'?2:3);assert.equal(r.controller.holdDown(),false);
  assert.equal(JSON.parse(r.saved()).entries.filter(q=>q.command.input.kind==='HOLD').length,2);
  assert.deepEqual(r.sent.filter(q=>q.command.input.kind==='HOLD').map(q=>q.command.input.edge),['DOWN','UP']);r.controller.dispose();
 });
});
test('a late original Hold completion after verified closure does not restore pending state or replace the recovery receipt',async()=>{
 const a=deferred(),b=deferred(),r=rig({send:q=>q.command.input.kind==='HOLD'?(q.command.input.edge==='DOWN'?a.promise:b.promise):Promise.resolve({receipt:receipt(q),serverTimeMs:6000})});
 r.observe();r.controller.holdDown();r.controller.holdUp();await r.controller.recoverOff();const recoveryId=r.sent.at(-1).commandId;
 assert.equal(r.controller.getModel().pendingCount,0);r.observe(landed());
 a.resolve(null);b.resolve({receipt:receipt(r.sent[1],{effect:'GESTURE_CLOSED'}),serverTimeMs:6000});await flush();
 const m=r.controller.getModel();assert.equal(m.pendingCount,0);assert.equal(m.canCheck,false);assert.equal(m.canKey,true);
 assert.equal(m.feedback,null);assert.equal(m.recoveryFeedback.commandId,recoveryId);
 assert.equal(m.recoveryFeedback.receipt.result.effect,'RECOVERED_CLOSED');assert.deepEqual(JSON.parse(r.saved()).entries,[]);r.controller.dispose();
});

test('stale automatic reconciliation leaves the accepted original UP and fresh released view intact',async()=>{
 const upReply=deferred(),recoveryReply=deferred();
 const r=rig({send:async q=>{
  const input=q.command.input;
  if(input.kind==='HOLD_RECOVER_OFF')return recoveryReply.promise;
  if(input.edge==='UP')return upReply.promise;
  return {receipt:receipt(q),serverTimeMs:6000};
 }});
 r.observe();assert.equal(r.controller.holdDown(),true);await flush();
 const held=liveWinchContact();held.viewRevision++;assert.equal(r.observe(held),true);
 r.controller.holdUp();
 const original=r.sent.at(-1),pending=copy(held);pending.viewRevision++;
 assert.equal(r.observe(pending),true);
 const recovery=r.sent.at(-1);
 assert.equal(recovery.command.input.kind,'HOLD_RECOVER_OFF');
 assert.equal(r.controller.getModel().feedback.commandId,original.commandId);
 upReply.resolve({receipt:receipt(original),serverTimeMs:6000});await flush();
 const released=playerView(7);released.viewRevision=pending.viewRevision+1;
 Object.assign(released.participantTask.ownGesture,{highestSequence:1,recoveryRevision:3});
 assert.equal(r.observe(released),true);
 recoveryReply.resolve({receipt:receipt(recovery,{status:'rejected',code:'STALE_RECOVERY'}),serverTimeMs:6000});await flush();
 const model=r.controller.getModel();
 assert.equal(model.feedback.commandId,original.commandId);
 assert.equal(model.feedback.receipt.status,'accepted');
 assert.equal(model.recoveryFeedback.commandId,recovery.commandId);
 assert.equal(model.recoveryFeedback.receipt.code,'STALE_RECOVERY');
 assert.equal(model.view.participantTask.ownGesture.currentHolder,null);
 assert.equal(model.canHold,true);
 assert.equal(model.pendingCount,0);
 r.controller.dispose();
});

test('unresolved original UP stays visible and older off proof cannot extend to a newer Hold',async t=>{
 for(const staleResolved of [true,false])await t.test(staleResolved?'confirmed stale reconciliation':'unknown reconciliation',async()=>{
  const recoveryReply=deferred();
  const r=rig({send:async q=>{
   const input=q.command.input;
   if(input.kind==='HOLD_RECOVER_OFF')return recoveryReply.promise;
   if(input.edge==='UP')return null;
   return {receipt:receipt(q),serverTimeMs:6000};
  }});
  r.observe();assert.equal(r.controller.holdDown(),true);await flush();
  const held=liveWinchContact();held.viewRevision++;assert.equal(r.observe(held),true);
  r.controller.holdUp();await flush();
  const up=r.sent.at(-1),beforeClosure=copy(held);beforeClosure.viewRevision++;
  assert.equal(r.observe(beforeClosure),true);
  const recovery=r.sent.at(-1);
  assert.equal(recovery.command.input.throughSequence,1);
  recoveryReply.resolve(staleResolved?{receipt:receipt(recovery,{status:'rejected',code:'STALE_RECOVERY'}),serverTimeMs:6000}:null);
  await flush();
  const newer=copy(beforeClosure),gesture=newer.participantTask.ownGesture;
  newer.viewRevision++;gesture.highestSequence=2;gesture.recoveryRevision++;gesture.currentHolder.sequence=2;
  assert.equal(r.observe(newer),true);
  await r.controller.recoverOff();await flush();
  assert.equal(r.sent.length,3);
  assert.equal(r.controller.getModel().feedback.commandId,up.commandId);
  assert.equal(r.controller.getModel().feedback.status,'unknown');
  assert.equal(r.controller.getModel().view.participantTask.ownGesture.currentHolder.sequence,2);
  assert.equal(r.controller.getModel().canHold,false);
  await r.controller.retry();await flush();
  assert.deepEqual(r.sent.slice(3),[up],'only the unresolved original UP is eligible for retry');
  assert.ok(JSON.parse(r.saved()).entries.some(entry=>entry.commandId===up.commandId));
  if(!staleResolved){
   const reloaded=rig({saved:r.saved(),idStart:3});assert.equal(reloaded.observe(newer),true);await flush();
   assert.equal(reloaded.controller.getModel().feedback.commandId,up.commandId);
   assert.equal(reloaded.controller.getModel().recoveryFeedback.commandId,recovery.commandId);
   assert.equal(reloaded.sent.length,0);
   reloaded.controller.dispose();
  }
  r.controller.dispose();
 });
});
test('only the original matching receipt can settle; a foreign Task/session or command remains unknown',async()=>{
 const r=rig({send:async q=>({receipt:{...receipt(q),commandId:'other-command'},serverTimeMs:6000})});r.observe();r.controller.holdDown();await flush();
 assert.equal(r.controller.getModel().feedback.status,'unknown');assert.equal(r.controller.getModel().canHold,false);r.controller.dispose();
});
test('clock-only polls preserve revision; body changes, stale revisions and unrelated response context close the view',()=>{
 const r=rig(),v=playerView(7);assert.equal(r.observe(v),true);const poll=copy(v);poll.serverNowMs++;assert.equal(r.observe(poll),true);
 const bad=copy(poll);bad.stock.doses--;assert.equal(r.observe(bad),false);assert.equal(r.controller.getModel().view,null);
 const next=copy(poll);next.viewRevision++;assert.equal(r.observe(next),true);assert.equal(r.observe(v),false);
 assert.equal(r.controller.observe(next,{matchId:next.matchId,versions:next.versions,phaseId:'unrelated-phase',round:next.round,serverNowMs:next.serverNowMs}),false);r.controller.dispose();
});
test('server time unavailability and deadline shut inputs without advancing or extending the Task',async()=>{
 const r=rig();r.observe();r.setSynced(false);assert.equal(r.controller.getModel().canHold,false);r.setSynced(true);await r.advance(25_000);
 assert.equal(r.controller.getModel().canHold,false);assert.equal(r.controller.getModel().view.participantTask.stage,'ACTIVE');assert.equal(r.controller.getModel().view.participantTask.returnsAt,33500);r.controller.dispose();
});
test('a storage failure blocks a new DOWN but cannot swallow an existing causal UP',async()=>{
 const r=rig();r.observe();r.controller.holdDown();await flush();r.setStoreFailure(true);r.controller.holdUp();await flush();
 assert.equal(r.sent.length,2);assert.equal(r.sent[1].command.input.edge,'UP');assert.equal(r.controller.getModel().canHold,false);r.controller.dispose();
});
test('one Hold follows only its own pointer/key contact and closes on cancel, blur or disposal once',()=>{
 const log=[],input=createFoodHoldInput({down:()=>{log.push('down');return true;},up:()=>log.push('up')});
 assert.equal(input.pointerDown(11),true);assert.equal(input.pointerDown(12),false);input.pointerUp(12);assert.deepEqual(log,['down']);input.pointerUp(11);input.pointerUp(11);
 assert.equal(input.keyDown(' ',false),true);assert.equal(input.keyDown(' ',true),false);input.keyUp('Enter');input.releaseAll();input.keyUp(' ');
 assert.equal(input.keyDown('ArrowUp'),false);input.assistiveClick();input.assistiveClick();input.pointerDown(14);input.dispose();input.dispose();
 assert.deepEqual(log,['down','up','down','up','down','up','down','up']);
});
test('assistive activation releases a recovered pressed Hold through the same single control',()=>{
 const log=[],input=createFoodHoldInput({held:()=>true,down:()=>{log.push('down');return false;},up:()=>log.push('up')});input.assistiveClick();assert.deepEqual(log,['up']);input.dispose();
});
test('accepted ordinary Food input waits for its new view before a second press, while Hold release remains independent',async()=>{
 const r=rig();r.observe(asking());await r.controller.ask('seat-4');await r.controller.ask('seat-5');assert.equal(r.sent.length,1);assert.equal(r.controller.getModel().canAsk,false);
 const next=asking();next.viewRevision++;assert.equal(r.observe(next),true);assert.equal(r.controller.getModel().canAsk,true);r.controller.dispose();
});
test('a same-Task death or outcome cannot be rewritten by a later view revision',()=>{
 const r=rig(),v=playerView(7);v.offers=[];v.serverNowMs=9500;v.participantTask.people[0].alive=false;
 v.participantTask.people[0].death={at:9000,mechanism:'CUT',actorSeatId:'seat-2'};v.participantTask.stage='ENDED';v.participantTask.outcome={kind:'LOST',at:9000,reason:'NOT_OVER_PLATFORM'};
 assert.equal(r.observe(v),true);const changed=copy(v);changed.viewRevision++;changed.participantTask.outcome.reason='CRATE_BROKEN_NO_FETCHER';assert.equal(r.observe(changed),false);r.controller.dispose();
});
test('an adapter cannot mutate the original DOWN that a later UP must close',async()=>{
 const r=rig({send:async q=>{q.command.input.gestureSequence=99;q.phaseId='mutated-phase';return null;}});r.observe();r.controller.holdDown();await flush();r.controller.holdUp();await flush();
 assert.equal(r.sent[1].phaseId,r.sent[0].phaseId);assert.equal(r.sent[1].command.input.gestureSequence,1);r.controller.dispose();
});
test('future original receipt time stays unknown and lookup sends only its strict identity context',async()=>{
 const r=rig({send:async q=>({receipt:{...receipt(q),receivedAt:6001},serverTimeMs:6000})});r.observe();r.controller.holdDown();await flush();
 assert.equal(r.controller.getModel().feedback.status,'unknown');await r.controller.checkReceipts();assert.ok(r.lookups.length);assert.equal(Object.hasOwn(r.lookups[0],'command'),false);r.controller.dispose();
});
test('network-only loss retains the authorized timed scene with inputs closed; revocation and hidden screens conceal it',()=>{
 const r=rig();r.observe();r.controller.disconnect('network');assert.ok(r.controller.getModel().view);assert.equal(r.controller.getModel().fresh,false);assert.equal(r.controller.getModel().canHold,false);
 r.controller.disconnect('authorization');assert.equal(r.controller.getModel().view,null);r.observe();r.controller.setVisible(false);assert.equal(r.controller.getModel().view,null);r.controller.dispose();
});
