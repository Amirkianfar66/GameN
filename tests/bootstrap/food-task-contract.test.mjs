import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FoodTaskCommandRequestSchema as Request, FoodTaskReceiptSchema as Receipt,
  FoodTaskPublicViewSchema as Public, FoodTaskPlayerViewSchema as Player,
  FoodTaskStoredReceiptSchema as Stored, FoodTaskMealSchema as Meal,
  FoodTaskVersionsSchema, FOOD_TASK_PARAMETERS as P, FOOD_TASK_VERTICAL as V, parseFoodTaskView, parseFoodTaskReceipt,
  foodTaskHoldInput, foodTaskHoldRecoveryInput, foodTaskRevisionBody, foodTaskHoldRelease } from '../../packages/contracts/dist/planet-food-task.js';
import {createHoldLedger,admitHoldInput,advancePendingHold,projectHoldRecovery,admitHoldRecoveryOff} from '../../packages/contracts/dist/food-task-hold.js';
import { PlanetCommandRequestSchema, PlanetVersionsSchema } from '../../packages/contracts/dist/planet-game.js';

import {versions,request,down,publicView,playerView,task} from './support/food-task-contract-fixture.mjs';
const copy = v => structuredClone(v);
const reject = (schema, value, mutate) => {const bad=copy(value);mutate(bad);assert.equal(schema.safeParse(bad).success,false);};

for (const n of [7,8,9]) {
  test(`${n}: strict four command families accept no caller identity, timing or outcome authority`, () => {
    const commands=[{type:'TASK_ASK',partnerSeatId:'seat-2'},
      {type:'TASK_ANSWER',requestId:'ask-2',requestRevision:0,answer:'JOIN'},
      {type:'TASK_ASK_WITHDRAW',requestId:'ask-2',requestRevision:0},down,
      {...down,input:{kind:'HOLD',edge:'UP',gestureSequence:1,crateId:null}},
      {...down,input:{kind:'PANEL_LOCK'}},{...down,input:{kind:'KEY'}}];
    for (const command of commands) assert.deepEqual(Request.parse(request(command,n)),request(command,n));
    for (const [key,value] of Object.entries({actorSeatId:'seat-2',receivedAt:1,clientTime:1,roll:0,protection:true,
      assignment:'WINCH',outcome:'DELIVERED',foodDoses:10})) reject(Request,request(down,n),v=>{v.command[key]=value;});
    for (const value of [NaN,Infinity,-1,Number.MAX_SAFE_INTEGER+1]) reject(Request,request(down,n),v=>{v.command.expectedControlRevision=value;});
    for (const value of [0,-1,Infinity,Number.MAX_SAFE_INTEGER+1]) reject(Request,request(down,n),v=>{v.command.input.gestureSequence=value;});
    assert.equal(Request.parse(request({...down,input:{...down.input,crateId:null}},n)).command.input.crateId,null);
    reject(Request,request(down,n),v=>{v.command.input.edge='CANCEL';});
  });
  test(`${n}: up-before-ack is a distinct valid request and a release/cancel never supplies physics time`, () => {
    const up=request({...down,input:{kind:'HOLD',edge:'UP',gestureSequence:1,crateId:null}},n);
    assert.equal(Request.parse(up).command.input.crateId,null);
    reject(Request,up,v=>{v.command.input.shownAt=4500;});
    reject(Request,up,v=>{v.command.input.targetSeatId='seat-2';});
    reject(Request,up,v=>{v.command.input.hazard='DROP';});
  });
  test(`${n}: exact assignment, custody, canonical roster and common return are enforced`, () => {
    const v=playerView(n);Player.parse(v);Public.parse(publicView(n));
    reject(Player,v,x=>{x.rosterSeatIds=x.rosterSeatIds.filter(id=>id!=='seat-2');});
    reject(Player,v,x=>{x.participantTask.panelSeatId='seat-1';});
    reject(Player,v,x=>{x.participantTask.people[1].seatId='seat-3';});
    reject(Player,v,x=>{x.participantTask.selfControl='PANEL';});
    for (const key of ['runningAt','deadlineAt','returnsAt']) reject(Player,v,x=>{x.participantTask[key]++;});
    reject(Player,v,x=>{x.step.returnsAt=9000;});
    reject(Player,v,x=>{x.participantTask.crate.holder='BRAKE';});
    reject(Player,v,x=>{x.participantTask.ownGesture.controlSessionId='another-session';});
    reject(Player,v,x=>{x.participantTask.ownGesture=null;});
    reject(Player,v,x=>{x.offers[0].inputs=['PANEL_LOCK'];});
  });
  test(`${n}: public and nonparticipant payloads cannot carry private Task details or refusals`, () => {
    const p=publicView(n);Public.parse(p);
    for (const key of ['participantTask','invitation','privateCursor','outcome','endedAt','controlSessionId','protection','roll'])
      reject(Public,p,v=>{v[key]=key==='privateCursor'?1:task();});
    const other={...playerView(n),seatId:'seat-3',participantTask:null,offers:[],partnerChoices:publicView(n).rosterSeatIds.filter(id=>id!=='seat-3').map(seatId=>({seatId,available:false,reason:'NOT_AVAILABLE_NOW'}))};Player.parse(other);
    reject(Player,other,v=>{v.participantTask=task();});
    reject(Player,other,v=>{v.invitation={foodStepId:'food-step-2',round:2,requestId:'ask-2',revision:0,volunteerSeatId:'seat-1',partnerSeatId:'seat-2',askedAt:1000,answerEndsAt:16000,state:'PENDING'};});
  });
  test(`${n}: participant stopped outcomes have no Protection/luck discriminator or metadata channel`, () => {
    const stopped=playerView(n);stopped.participantTask.events={cursor:1,events:[{id:'own-event-1',cursor:1,at:6000,kind:'STOPPED',mechanism:'DROP',actorSeatId:'seat-1',victimSeatId:'seat-2',crateId:'crate-0',x:4}]};
    stopped.participantTask.crate={id:'crate-0',generation:0,state:'BRAKED',holder:'BRAKE',x:4,height:1,anchorAt:6000,motion:null};
    Player.parse(stopped);
    const protection=Player.parse(copy(stopped)),luck=Player.parse(copy(stopped));assert.deepEqual(protection,luck);
    for (const key of ['cause','roll','protection','donorSeatId','offlineSince']) reject(Player,stopped,v=>{v.participantTask[key]=1;});
    reject(Player,stopped,v=>{v.participantTask.events.events[0].cause='PROTECTION';});
    reject(Player,stopped,v=>{v.participantTask.events.events[0].kind='CATCH';});
    reject(Player,stopped,v=>{v.participantTask.events.cursor=0;});
    reject(Player,stopped,v=>{v.participantTask.events.cursor=100;});
    reject(Player,stopped,v=>{v.participantTask.events.events[0].victimSeatId='seat-3';});
    const two=copy(stopped);two.participantTask.events.cursor=2;
    two.participantTask.events.events.push({...two.participantTask.events.events[0],id:'own-event-2',cursor:2});Player.parse(two);
    reject(Player,two,v=>{v.participantTask.events.events[1].id='own-event-1';});
    reject(Player,two,v=>{v.participantTask.events.events[1].at=5999;});
    reject(Player,two,v=>{v.participantTask.events.events[1].at=6001;});
  });
  test(`${n}: private invitation retains full answer time and offers bind its revision and actor`, () => {
    const v={...playerView(n),serverNowMs:31000,participantTask:null,step:{kind:'ASKING',stepId:'food-step-2',startedAt:1000,askingEndsAt:31000,someoneAsking:true},
      invitation:{foodStepId:'food-step-2',round:2,requestId:'ask-2',revision:0,volunteerSeatId:'seat-2',partnerSeatId:'seat-1',askedAt:30999,answerEndsAt:45999,state:'PENDING'},
      ownAvailability:{canAsk:false,reason:'REQUEST_PENDING'},offers:[{type:'TASK_ANSWER',requestId:'ask-2',requestRevision:0}]};
    Player.parse(v);
    reject(Player,v,x=>{x.invitation.answerEndsAt=31000;});
    reject(Player,v,x=>{x.offers[0].requestRevision=1;});
    reject(Player,v,x=>{x.offers[0].type='TASK_ASK_WITHDRAW';});
    reject(Player,v,x=>{x.invitation.state='DECLINED';});
  });
  test(`${n}: meal evidence is one integer dose, once per actual ordinary turn and own reality only`, () => {
    const m={id:'meal-r2-s1',round:2,seatId:'seat-1',sourcePhaseId:'ordinary-r2-s1',order:1,endedAt:6000,
      result:'ATE',dosesConsumed:1,placement:{location:'Jail',slotId:'J1'}};
    const v=playerView(n);v.ownMeals=[m];Player.parse(v);
    for (const doses of [0,0.5,2,Infinity]) reject(Meal,m,x=>{x.dosesConsumed=doses;});
    reject(Player,v,x=>{x.ownMeals.push({...m,id:'second-hack-continuation'});});
    reject(Player,v,x=>{x.ownMeals[0].seatId='seat-2';});
    reject(Player,v,x=>{x.ownMeals[0].worldId='world-0';});
    reject(Player,v,x=>{x.stock.doses=.5;});
    reject(Public,publicView(n),x=>{x.stock.basis='PLAYER_CURRENT';});
  });
  test(`${n}: ordered completion suffix cannot publish speculative shared placement`, () => {
    const v=publicView(n);const t={id:'turn-r2-s1',round:2,seatId:'seat-1',sourcePhaseId:'ordinary-r2-s1',order:1,endedAt:6000,placement:null};
    v.turnEnds=[t,{...t,id:'turn-r2-s2',seatId:'seat-2',sourcePhaseId:'ordinary-r2-s2',order:2,endedAt:6000}];Public.parse(v);
    reject(Public,v,x=>{x.turnEnds[0].placement={location:'Room B',slotId:'B1'};});
    reject(Public,v,x=>{x.turnEnds[1].order=1;});
    reject(Public,v,x=>{x.turnEnds[1].seatId='seat-1';});
    reject(Public,v,x=>{x.turnEnds[1].endedAt=5999;});
  });
  test(`${n}: receipt storage retains original answer time and cannot acquire gameplay secrets`, () => {
    const q=request({...down,input:{kind:'HOLD',edge:'UP',gestureSequence:1,crateId:null}},n);
    const {command,...context}=q;
    const r={...context,status:'accepted',receivedAt:4500,result:{kind:'INPUT',taskId:'task-2',controlSessionId:'winch-session-2',effect:'GESTURE_CLOSED',gestureSequence:1,crateId:null}};
    const stored={actorSeatId:'seat-1',requestHash:'b'.repeat(64),response:r};Stored.parse(stored);
    assert.deepEqual(Receipt.parse(JSON.parse(JSON.stringify(r))),r);
    reject(Receipt,r,x=>{x.result.roll=.1;});reject(Receipt,r,x=>{x.result.protectionConsumed=true;});
    reject(Stored,stored,x=>{x.requestHash='not-a-hash';});
  });
  test(`${n}: match, exact version/hash/art and authenticated seat are bound by the parser`, () => {
    const v=playerView(n),e={matchId:v.matchId,seatId:'seat-1',versions,phaseId:v.phaseId,round:v.round,serverNowMs:v.serverNowMs};parseFoodTaskView(v,e);
    for (const key of ['rulesetHash','assetManifestVersion']) assert.throws(()=>parseFoodTaskView(v,{...e,versions:{...versions,[key]:key==='rulesetHash'?'c'.repeat(64):'other-art'}}));
    assert.throws(()=>parseFoodTaskView(v,{...e,seatId:'seat-2'}));assert.throws(()=>parseFoodTaskView(v,{...e,matchId:'other-match'}));
    reject(FoodTaskVersionsSchema,versions,x=>{x.engineVersion='planet-game-1.3.0';});
  });
  test(`${n}: offers require live authority, including the complete extended answer interval`, () => {
    const ask={...playerView(n),participantTask:null,step:{kind:'ASKING',stepId:'food-step-2',startedAt:1000,askingEndsAt:31000,someoneAsking:false},
      ownAvailability:{canAsk:true,reason:null},partnerChoices:playerView(n).partnerChoices.map(p=>p.seatId==='seat-2'?{...p,available:true,reason:null}:p),offers:[{type:'TASK_ASK',partnerSeatIds:['seat-2']}]};Player.parse(ask);
    reject(Player,ask,v=>{v.step=null;});reject(Player,ask,v=>{v.step=publicView(n).step;});
    reject(Player,ask,v=>{v.serverNowMs=31000;});reject(Player,ask,v=>{v.step.someoneAsking=true;});
    const press=playerView(n);
    reject(Player,press,v=>{v.participantTask.stage='ENDED';v.participantTask.outcome={kind:'LOST',at:6000,reason:'NOT_OVER_PLATFORM'};});
    reject(Player,press,v=>{v.participantTask.people[0].alive=false;v.participantTask.people[0].death={at:6000,mechanism:'CUT',actorSeatId:'seat-2'};});
    reject(Player,press,v=>{v.serverNowMs=31000;});
    reject(Player,press,v=>{v.participantTask.foodStepId='other-step';});
    reject(Player,press,v=>{v.participantTask.round=1;});
    const waiting={...ask,serverNowMs:31000,ownAvailability:{canAsk:false,reason:'REQUEST_PENDING'},
      invitation:{foodStepId:'food-step-2',round:2,requestId:'ask-2',revision:0,volunteerSeatId:'seat-2',partnerSeatId:'seat-1',askedAt:30999,answerEndsAt:45999,state:'PENDING'},
      offers:[{type:'TASK_ANSWER',requestId:'ask-2',requestRevision:0}]};waiting.step.someoneAsking=true;Player.parse(waiting);
    reject(Player,waiting,v=>{v.serverNowMs=45999;});reject(Player,waiting,v=>{v.invitation.askedAt=31001;v.invitation.answerEndsAt=46001;});
    const early=playerView(n);early.serverNowMs=2000;early.participantTask.stage='BRIEFING';Player.parse(early);
  });
  test(`${n}: accepted receipt is correlated to the exact original family, gesture, Task and session`, () => {
    const q=request({...down,input:{kind:'HOLD',edge:'UP',gestureSequence:1,crateId:null}},n),{command,...context}=q;
    const r={...context,status:'accepted',receivedAt:4500,result:{kind:'INPUT',taskId:'task-2',controlSessionId:'winch-session-2',effect:'GESTURE_CLOSED',gestureSequence:1,crateId:null}};
    assert.equal(parseFoodTaskReceipt(null,q,'seat-1'),null);assert.deepEqual(parseFoodTaskReceipt(r,q,'seat-1'),r);
    for (const [key,value] of [['taskId','other-task'],['controlSessionId','other-session'],['gestureSequence',2]]) {
      const bad=copy(r);bad.result[key]=value;assert.throws(()=>parseFoodTaskReceipt(bad,q,'seat-1'));
    }
    assert.throws(()=>parseFoodTaskReceipt(r,request({type:'TASK_ASK',partnerSeatId:'seat-2'},n),'seat-1'));
    const known=request({...down,input:{kind:'HOLD',edge:'UP',gestureSequence:1,crateId:'crate-0'}},n);
    assert.throws(()=>parseFoodTaskReceipt({...r,result:{...r.result,crateId:'crate-1'}},known,'seat-1'));
    const answer=request({type:'TASK_ANSWER',requestId:'ask-2',requestRevision:0,answer:'JOIN'},n);
    const response={...context,status:'accepted',receivedAt:4500,result:{kind:'REQUEST',requestId:'ask-2',requestRevision:1,state:'JOINED'}};
    parseFoodTaskReceipt(response,answer,'seat-1');assert.throws(()=>parseFoodTaskReceipt({...response,result:{...response.result,state:'DECLINED'}},answer,'seat-1'));
  });
  test(`${n}: exact same-response context and clock-only polls preserve revision-body stability`, () => {
    const v=playerView(n),expected={matchId:v.matchId,seatId:v.seatId,versions,phaseId:v.phaseId,round:v.round,serverNowMs:v.serverNowMs};
    parseFoodTaskView(v,expected);
    for (const patch of [{phaseId:'asynchronous-other-phase'},{round:1},{serverNowMs:6001}]) assert.throws(()=>parseFoodTaskView(v,{...expected,...patch}));
    const later={...v,serverNowMs:6100};Player.parse(later);assert.deepEqual(foodTaskRevisionBody(v),foodTaskRevisionBody(later));
    assert.notDeepEqual(foodTaskRevisionBody(v),foodTaskRevisionBody({...later,privateCursor:1}));
  });
  test(`${n}: public absence order cannot disclose the randomly assigned controls`, () => {
    const a=playerView(n),b=copy(a);b.participantTask.winchSeatId='seat-2';b.participantTask.panelSeatId='seat-1';
    b.participantTask.selfControl='PANEL';b.participantTask.controlSessionId='panel-session-2';b.participantTask.ownGesture=null;b.offers=[];
    Player.parse(a);Player.parse(b);assert.deepEqual(a.step,b.step);
    reject(Player,b,v=>{v.step.awaySeatIds=['seat-2','seat-1'];});
    reject(Public,publicView(n),v=>{v.step.awaySeatIds=['seat-2','seat-1'];});
  });
  test(`${n}: every Partner has a server-authored state, and the client uses the offered subset`, () => {
    const v=playerView(n);v.step={kind:'ASKING',stepId:'food-step-2',startedAt:1000,askingEndsAt:31000,someoneAsking:false};v.participantTask=null;
    v.partnerChoices=v.partnerChoices.map(p=>p.seatId==='seat-2'?{...p,available:true,reason:null}:{...p,reason:'WENT_LAST_ROUND'});
    v.ownAvailability={canAsk:true,reason:null};v.offers=[{type:'TASK_ASK',partnerSeatIds:['seat-2']}];Player.parse(v);
    reject(Player,v,x=>{x.partnerChoices.pop();});reject(Player,v,x=>{x.offers[0].partnerSeatIds=['seat-3'];});
    reject(Player,v,x=>{x.partnerChoices[1].reason='REFUSED_THIS_ROUND';});
  });
  test(`${n}: expired original requests remain pair-private after the active invitation clears`, () => {
    const q=request({type:'TASK_ANSWER',requestId:'ask-old',requestRevision:0,answer:'JOIN'},n),{command,...context}=q;
    const closure={foodStepId:'food-step-2',round:2,requestId:'ask-old',requestRevision:1,volunteerSeatId:'seat-2',partnerSeatId:'seat-1',
      askedAt:1000,answerEndsAt:16000,closedAt:16000,state:'EXPIRED'};
    const refused={...context,status:'rejected',receivedAt:16001,code:'REQUEST_CLOSED',requestClosure:closure};
    parseFoodTaskReceipt(refused,q,'seat-1');assert.throws(()=>parseFoodTaskReceipt(refused,q,'seat-3'));
    assert.throws(()=>parseFoodTaskReceipt({...refused,requestClosure:{...closure,requestId:'new-ask'}},q,'seat-1'));
    const v={...playerView(n),serverNowMs:16001,participantTask:null,offers:[],invitation:null,requestClosures:[closure],step:null};Player.parse(v);
    reject(Player,v,x=>{x.seatId='seat-3';x.partnerChoices=publicView(n).rosterSeatIds.filter(id=>id!=='seat-3').map(seatId=>({seatId,available:false,reason:'NOT_AVAILABLE_NOW'}));});
    reject(Receipt,refused,x=>{x.requestClosure=null;});reject(Receipt,refused,x=>{x.code='NOT_ALLOWED';});
  });
  test(`${n}: empty cosmetic suffix still carries buffered blade, brake custody and an old crate fall`, () => {
    const v=playerView(n);v.serverNowMs=6100;v.participantTask.panel.blade={state:'BUFFERED',stop:6,changedAt:6000};
    v.participantTask.crate={id:'crate-1',generation:1,state:'INTAKE',holder:null,x:0,height:0,anchorAt:6000,motion:null};
    v.offers[0].crateId='crate-1';v.participantTask.broken=[{crateId:'crate-0',at:6000,x:2,landing:'DECK',
      motion:{fromX:2,toX:2,fromHeight:.4,toHeight:.04,easing:'CUBIC_IN',startedAt:6000,endsAt:6300}}];Player.parse(v);
    reject(Player,v,x=>{x.participantTask.crate.x=1e308;});reject(Player,v,x=>{x.offers[0].crateId='crate-0';});
    reject(Player,v,x=>{x.participantTask.broken[0].motion.fromHeight=2;});
    reject(Player,v,x=>{x.participantTask.events={cursor:1,events:[{id:'bad-stop',cursor:1,at:6000,kind:'STOPPED',mechanism:null,actorSeatId:null,victimSeatId:null,crateId:null,x:null}]};});
  });
}
test('standalone candidate cannot register commands or rewrite historical version validation', () => {
  assert.equal(PlanetVersionsSchema.safeParse(versions).success,false);
  assert.equal(PlanetCommandRequestSchema.safeParse(request(down)).success,false);
  assert.deepEqual([P.snapMs,P.restMs,P.warningMs,P.presenceGraceMs,P.returnMs],[50,200,150,8000,32500]);
});
test('turnEnds.order is match-scoped completion sequence; Round 2 starts after Round 1 without reusing its index', () => {
  const v=publicView(7);v.turnEnds=[
    {id:'turn-r1-last',round:1,seatId:'seat-7',sourcePhaseId:'ordinary-r1-last',order:7,endedAt:5000,placement:null},
    {id:'turn-r2-first',round:2,seatId:'seat-4',sourcePhaseId:'ordinary-r2-first',order:8,endedAt:6000,placement:null}
  ];Public.parse(v);
  reject(Public,v,x=>{x.turnEnds[1].order=1;});
});
test('parsed release-before-ack and up-before-down requests execute the same durable ordering guard', () => {
  const base=createHoldLedger('task-2','winch-session-2','seat-1',1000),authority=at=>({taskId:'task-2',controlSessionId:'winch-session-2',
    authenticatedSeatId:'seat-1',control:'WINCH',alive:true,active:true,currentRevision:5,currentCrateId:'crate-0',canAcquire:true,receivedAt:at});
  const up=foodTaskHoldInput(request({...down,input:{kind:'HOLD',edge:'UP',gestureSequence:1,crateId:null}}));
  const first=admitHoldInput(base,up,authority(4500)),late=admitHoldInput(first.ledger,foodTaskHoldInput(request(down)),authority(4600));
  assert.equal(late.effect.type,'NONE');assert.equal(late.ledger.holderSequence,null);
  const pendingRequest=request({...down,input:{kind:'HOLD',edge:'DOWN',gestureSequence:2,crateId:null}});pendingRequest.commandId='early-unbound-down';
  const pending=admitHoldInput(late.ledger,foodTaskHoldInput(pendingRequest),{...authority(4700),canAcquire:false});
  assert.equal(pending.receipt.code,'DOWN_PENDING');
  const ready=advancePendingHold(pending.ledger,authority(5000));assert.equal(ready.effect.type,'ACQUIRE');assert.equal(ready.effect.crateId,'crate-0');
  const off=request({...down,input:{kind:'HOLD',edge:'UP',gestureSequence:2,crateId:null}});off.commandId='focus-loss-up';
  const released=admitHoldInput(ready.ledger,foodTaskHoldInput(off),authority(5010));assert.equal(released.effect.type,'RELEASE');
  const again=admitHoldInput(released.ledger,foodTaskHoldInput(off),authority(6000));assert.equal(again.effect.type,'NONE');assert.deepEqual(again.receipt,released.receipt);
});
test('focus/visibility cancellation constructs a causal UP without waiting for DOWN acknowledgement or a new offer', () => {
  const q=request({...down,input:{kind:'HOLD',edge:'DOWN',gestureSequence:4,crateId:null}});
  const up=foodTaskHoldRelease(q,'pointer-up-4');assert.equal(up.command.input.edge,'UP');assert.equal(up.command.input.crateId,null);
  assert.equal(up.phaseId,q.phaseId);assert.equal(up.foodStepId,q.foodStepId);assert.equal(up.command.input.gestureSequence,4);
  assert.throws(()=>foodTaskHoldRelease(q,q.commandId));assert.throws(()=>foodTaskHoldRelease(up,'another-down'));
});


test('wire recovery projects the actual older owner after a newer contact closes and atomically turns all contacts off', () => {
  const context = at => ({taskId:'task-2',controlSessionId:'winch-session-2',authenticatedSeatId:'seat-1',control:'WINCH',alive:true,
    active:true,currentRevision:5,currentCrateId:'crate-0',canAcquire:true,receivedAt:at});
  const contact = (sequence, edge) => ({...request({...down,input:{kind:'HOLD',edge,gestureSequence:sequence,crateId:null}}),commandId:`contact-${sequence}-${edge}`});
  let ledger=createHoldLedger('task-2','winch-session-2','seat-1',1000);
  for (const [sequence,edge,at] of [[1,'DOWN',5000],[2,'DOWN',5010],[2,'UP',5020]])
    ledger=admitHoldInput(ledger,foodTaskHoldInput(contact(sequence,edge)),context(at)).ledger;
  const own=projectHoldRecovery(ledger),v=playerView(7);v.participantTask.ownGesture={controlSessionId:'winch-session-2',...own};
  v.participantTask.crate={...v.participantTask.crate,state:'HELD',holder:'WINCH',height:1};Player.parse(v);
  reject(Player,v,x=>{x.participantTask.ownGesture.currentHolder.crateId='old-crate';});
  assert.deepEqual(own.currentHolder,{sequence:1,crateId:'crate-0'});assert.equal(own.pendingIntent,null);
  reject(Player,v,x=>{x.participantTask.ownGesture.currentHolder.sequence=3;});
  const recovery={...request({...down,input:{kind:'HOLD_RECOVER_OFF',recoveryRevision:own.recoveryRevision,throughSequence:3}}),commandId:'recovered-finger-off'};
  const closed=admitHoldRecoveryOff(ledger,foodTaskHoldRecoveryInput(recovery),context(5030));
  assert.equal(closed.effect.type,'RELEASE');assert.equal(closed.receipt.closedHighwater,3);
  assert.equal(projectHoldRecovery(closed.ledger).currentHolder,null);
  assert.equal(admitHoldInput(closed.ledger,foodTaskHoldInput(contact(3,'DOWN')),context(5040)).effect.type,'NONE');
  assert.equal(advancePendingHold(closed.ledger,context(5050)).effect.type,'NONE');
  const {command,...envelope}=recovery;
  const receipt={...envelope,status:'accepted',receivedAt:5030,result:{kind:'INPUT',taskId:command.taskId,controlSessionId:command.controlSessionId,
    effect:'RECOVERED_CLOSED',gestureSequence:null,crateId:'crate-0',closedThroughSequence:3}};
  parseFoodTaskReceipt(receipt,recovery,'seat-1');
  assert.throws(()=>parseFoodTaskReceipt({...receipt,result:{...receipt.result,closedThroughSequence:2}},recovery,'seat-1'));
  assert.throws(()=>foodTaskHoldRecoveryInput(contact(4,'UP')));
});
for (const n of [7,8,9]) test(`${n}: nonparticipant Partner choices stay uniformly unavailable during AWAY regardless of private death`, () => {
  const v={...playerView(n),seatId:'seat-3',participantTask:null,offers:[],
    partnerChoices:publicView(n).rosterSeatIds.filter(id=>id!=='seat-3').map(seatId=>({seatId,available:false,reason:'NOT_AVAILABLE_NOW'}))};
  Player.parse(v);reject(Player,v,x=>{x.partnerChoices[0].reason='ELIMINATED';});
  reject(Player,v,x=>{x.partnerChoices[0].reason='IN_HOSPITAL';});
});

for (const n of [7,8,9]) test(`${n}: private end cards use strict authoritative reasons and cancellation identity`, () => {
  const ended = outcome => {
    const v=playerView(n);v.offers=[];v.serverNowMs=outcome.at;const t=v.participantTask;
    t.stage='ENDED';t.outcome=outcome;
    if (outcome.kind==='DELIVERED') {
      t.crate={...t.crate,state:'SENT',height:V.platform,x:5,anchorAt:outcome.at,
        motion:{fromX:5,toX:5,fromHeight:V.platform,toHeight:-.12,easing:'QUADRATIC_IN_OUT',startedAt:outcome.at,endsAt:outcome.at+1100}};t.people.forEach(p=>{p.keyTurned=true;});
    }
    if (outcome.kind==='LOST' && outcome.reason!=='TIME') {
      const victim=t.people.find(p=>p.seatId===(outcome.reason==='CRATE_BROKEN_NO_FETCHER'?'seat-2':'seat-1'));
      victim.alive=false;victim.death={at:outcome.at,mechanism:victim.seatId==='seat-1'?'CUT':'DROP',
        actorSeatId:victim.seatId==='seat-1'?'seat-2':'seat-1'};
      if (outcome.reason==='CRATE_BROKEN_NO_FETCHER') t.broken=[{crateId:'old-crate',at:outcome.at,x:4,landing:'CONSOLE',
        motion:{fromX:4,toX:4,fromHeight:1,toHeight:V.console,easing:'CUBIC_IN',startedAt:outcome.at,endsAt:outcome.at+300}}];
    }
    return v;
  };
  for (const reason of ['TIME','CRATE_BROKEN_NO_FETCHER','NOT_OVER_PLATFORM']) {
    const v=ended({kind:'LOST',at:reason==='TIME'?31000:9500,reason});Player.parse(v);
    reject(Player,v,x=>{delete x.participantTask.outcome.reason;});
    reject(Player,v,x=>{x.participantTask.outcome.reason='PROTECTION';});
    reject(Player,v,x=>{x.participantTask.outcome.disconnectedSeatId='seat-1';});
    reject(Player,v,x=>{x.participantTask.outcome.roll=.1;});
  }
  const timed=ended({kind:'LOST',at:31000,reason:'TIME'});
  reject(Player,timed,x=>{x.participantTask.outcome.at=30999;});
  for (const seat of ['seat-1','seat-2']) {
    const v=ended({kind:'CANCELLED',at:10000,reason:'DISCONNECT',disconnectedSeatId:seat});Player.parse(v);
    // A completed cancellation retains its original identity after that phone reconnects.
    v.participantTask.people.forEach(p=>{p.online=true;});Player.parse(v);
    reject(Player,v,x=>{x.participantTask.outcome.disconnectedSeatId='seat-3';});
    reject(Player,v,x=>{x.participantTask.outcome.reason='TIME';});
    reject(Player,v,x=>{x.participantTask.outcome.at=8999;});
    reject(Player,v,x=>{x.participantTask.people.find(p=>p.seatId===seat).alive=false;});
    reject(Player,v,x=>{delete x.participantTask.outcome.disconnectedSeatId;});
  }
  const delivered=ended({kind:'DELIVERED',at:9500,dosesAdded:10});Player.parse(delivered);
  reject(Player,delivered,x=>{x.participantTask.outcome.dosesAdded=5;});
  reject(Player,delivered,x=>{x.participantTask.outcome.reason='LUCK';});
  reject(Player,delivered,x=>{x.participantTask.crate.motion=null;});
  for (const outcome of [timed.participantTask.outcome,delivered.participantTask.outcome,
    {kind:'CANCELLED',at:10000,reason:'DISCONNECT',disconnectedSeatId:'seat-1'}]) {
    reject(Public,publicView(n),x=>{x.outcome=outcome;});
    const outsider={...playerView(n),seatId:'seat-3',participantTask:null,offers:[],
      partnerChoices:publicView(n).rosterSeatIds.filter(id=>id!=='seat-3').map(seatId=>({seatId,available:false,reason:'NOT_AVAILABLE_NOW'}))};
    reject(Player,outsider,x=>{x.outcome=outcome;});
    reject(Player,outsider,x=>{x.participantTask=ended(outcome).participantTask;});
  }
});

for (const n of [7,8,9]) test(`${n}: durable victim facts survive an empty cosmetic suffix without disclosing a defense`, () => {
  for (const [mechanism,seat,actor] of [['CUT','seat-1','seat-2'],['DROP','seat-2','seat-1']]) {
    const v=playerView(n);v.serverNowMs=9500;v.offers=[];const t=v.participantTask;
    const victim=t.people.find(p=>p.seatId===seat);victim.alive=false;
    victim.death={at:9000,mechanism,actorSeatId:actor};t.events={cursor:5,events:[]};
    if (mechanism==='CUT') t.crate={...t.crate,state:'LANDED',height:V.platform};
    else {t.stage='ENDED';t.outcome={kind:'LOST',at:9000,reason:'CRATE_BROKEN_NO_FETCHER'};}
    Player.parse(v);
    reject(Player,v,x=>{x.participantTask.people.find(p=>p.seatId===seat).death=null;});
    reject(Player,v,x=>{x.participantTask.people.find(p=>p.seatId===seat).death.actorSeatId=seat;});
    reject(Player,v,x=>{x.participantTask.people.find(p=>p.seatId===seat).death.at=9501;});
    reject(Player,v,x=>{x.participantTask.people.find(p=>p.seatId===seat).death.mechanism=mechanism==='CUT'?'DROP':'CUT';});
    for (const key of ['cause','roll','protection','donorSeatId'])
      reject(Player,v,x=>{x.participantTask.people.find(p=>p.seatId===seat).death[key]='hidden';});
  }
  const cue=playerView(n);cue.offers=[];cue.participantTask.people[0].alive=false;
  cue.participantTask.people[0].death={at:6000,mechanism:'CUT',actorSeatId:'seat-2'};
  cue.participantTask.events={cursor:1,events:[{id:'death-cut',cursor:1,at:6000,kind:'ELIMINATED',mechanism:'CUT',
    actorSeatId:'seat-2',victimSeatId:'seat-1',crateId:'crate-0',x:6}]};Player.parse(cue);
  reject(Player,cue,x=>{x.participantTask.events.events[0].at=5999;});
  const alive=playerView(n);
  reject(Player,alive,x=>{x.participantTask.people[0].death={at:6000,mechanism:'CUT',actorSeatId:'seat-2'};});
});
for (const n of [7,8,9]) test(`${n}: global vertical anchors distinguish partial intake falls, platform and old broken crates`, () => {
  const v=playerView(n);v.serverNowMs=5325;
  v.participantTask.crate={...v.participantTask.crate,state:'FALLING',height:.5,anchorAt:5225,
    motion:{fromX:0,toX:0,fromHeight:.5,toHeight:V.intake,easing:'CUBIC_IN',startedAt:5225,endsAt:5525}};Player.parse(v);
  const platform=copy(v);platform.participantTask.crate.motion.toHeight=V.platform;Player.parse(platform);
  assert.equal(658-250*V.intake,658);assert.equal(658-250*V.platform,568);
  assert.equal(658-250*V.console,540);assert.equal(658-250*V.deck,648);
  reject(Player,v,x=>{x.participantTask.crate.motion.toHeight=.2;});
  reject(Player,v,x=>{delete x.participantTask.crate.motion.easing;});
  reject(Player,v,x=>{x.participantTask.crate.motion.easing='LINEAR';});
  reject(Player,v,x=>{x.participantTask.crate.motion.fromHeight=V.max+.001;});
  const broken=copy(v);broken.participantTask.broken=[{crateId:'old-crate',at:5225,x:2,landing:'DECK',
    motion:{fromX:2,toX:2,fromHeight:.5,toHeight:V.deck,easing:'CUBIC_IN',startedAt:5225,endsAt:5525}}];Player.parse(broken);
  reject(Player,broken,x=>{x.participantTask.broken[0].motion.toHeight=V.intake;});
  const landed=playerView(n);landed.participantTask.crate={...landed.participantTask.crate,state:'LANDED',height:V.platform};Player.parse(landed);
  reject(Player,landed,x=>{x.participantTask.crate.height=V.intake;});
});
