import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createFoodTaskController,createFoodHoldInput} from '../dist/index.js';
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
function rig({saved=null,send=null,lookup=null,storeFailure=false}={}){
 let uid='food-owner',now=6000,synced=true,sequence=0,stored=saved,failStore=storeFailure;
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
test('saved unacknowledged high-water participates in fresh explicit off recovery',async()=>{
 const first=rig({send:async()=>null});first.observe();first.controller.holdDown();first.controller.holdUp();await flush();const saved=first.saved();first.controller.dispose();
 const r=rig({saved});r.observe();await flush();
 assert.equal(r.sent.length,1);assert.equal(r.sent[0].command.input.kind,'HOLD_RECOVER_OFF');assert.equal(r.sent[0].command.input.throughSequence,1);
 assert.ok(r.lookups.length>=2);assert.equal(r.sent.some(q=>q.command.input.kind==='HOLD'&&q.command.input.edge==='DOWN'),false);r.controller.dispose();
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
