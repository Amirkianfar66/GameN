import test from 'node:test';
import assert from 'node:assert/strict';
import {FoodTaskParticipantSchema, parseFoodTaskReceipt} from '@mothership/contracts';
import {createFoodTaskMachine, applyFoodTaskPress, advanceFoodTaskMachine, projectFoodTaskParticipant,
  foodTaskMachineDeadlineAt, foodTaskMachineInputs, setFoodTaskPresence, sampleFoodTaskCrate, sampleFoodTaskPanel,hasOnlyDueFoodTaskWarnings} from '../dist/planet-game/food-machine.js';

const options = {matchId:'match-food',phaseId:'phase-food',foodStepId:'food-step',round:1,taskId:'food-task',
  winchSeatId:'seat-1',panelSeatId:'seat-2',winchControlSessionId:'winch-session',panelControlSessionId:'panel-session',startedAt:0};
const create = (overrides={}) => createFoodTaskMachine({...options,...overrides});
function request(m, seat, input, commandId=`c-${seat}-${input.kind}-${m.evaluatedAt}-${Object.keys(m.receipts).length}`, expectedControlRevision=m.controlRevision) {
  return {schemaVersion:1,protocolVersion:3,matchId:m.options.matchId,phaseId:m.options.phaseId,foodStepId:m.options.foodStepId,
    round:m.options.round,commandId,command:{type:'TASK_PRESS',taskId:m.options.taskId,
      controlSessionId:seat===m.options.winchSeatId?m.options.winchControlSessionId:m.options.panelControlSessionId,
      expectedControlRevision,input}};
}
function press(m, at, seat, input, extra={}) {
  const r=extra.request??request(m,seat,input,extra.commandId,extra.expectedControlRevision);
  const result=applyFoodTaskPress(m,seat,r,{now:at,protectionBySeat:extra.protectionBySeat??{},roll:extra.roll??(()=>.99)});
  assert.ok(parseFoodTaskReceipt(result.receipt,r,seat), 'wire receipt correlates with original request');
  for(const p of result.machine.people) assert.equal(FoodTaskParticipantSchema.safeParse(projectFoodTaskParticipant(result.machine,p.seatId)).success,true);
  return result;
}
const down=(m,at,sequence=1,extra={})=>press(m,at,m.options.winchSeatId,{kind:'HOLD',edge:'DOWN',gestureSequence:sequence,crateId:null},extra);
const up=(m,at,sequence=1,extra={})=>press(m,at,m.options.winchSeatId,{kind:'HOLD',edge:'UP',gestureSequence:sequence,crateId:null},extra);
const panel=(m,at,kind,extra={})=>press(m,at,m.options.panelSeatId,{kind},extra);
const key=(m,at,seat,extra={})=>press(m,at,seat,{kind:'KEY'},extra);
const tick=(m,at)=>advanceFoodTaskMachine(m,at).machine;
function held(){return tick(down(create(),4000).machine,4450);}
function locked(stop){let m=panel(held(),4450,'PANEL_RELEASE').machine;return panel(m,4450+(stop-1)*250,'PANEL_LOCK').machine;}
function landed(){let m=locked(5);m=up(m,5450).machine;return tick(m,5750);}
function emptyEvents(m){const v=structuredClone(m);v.events=[];return v;}

test('warning-only query includes every due timer, is nonempty and never changes authority',()=>{
  const m=tick(panel(held(),4450,'PANEL_RELEASE').machine,5450),before=JSON.stringify(m);
  assert.equal(hasOnlyDueFoodTaskWarnings(m,5450),false);
  assert.equal(hasOnlyDueFoodTaskWarnings(m,5473),true);assert.equal(hasOnlyDueFoodTaskWarnings(m,5650),true);
  for(const at of [5450-1,-1,NaN,Infinity,5650.5])assert.equal(hasOnlyDueFoodTaskWarnings(m,at),false);
  assert.equal(hasOnlyDueFoodTaskWarnings(m,30000),false,'later due TIME defeats earlier warnings');
  assert.equal(hasOnlyDueFoodTaskWarnings(m,32500),false,'RETURN/TIME cannot be hidden behind warning timers');
  assert.equal(JSON.stringify(m),before);
});
test('warning-only query rejects a real grace tie even when earlier due timers are warnings',()=>{
  const m=tick(panel(held(),4450,'PANEL_RELEASE').machine,5450);
  const warningAt=m.warningWindows.flatMap(w=>[w.startsAt,w.endsAt]).filter(at=>at>=m.evaluatedAt+8000&&at<m.deadlineAt).sort((a,b)=>a-b)[0];
  assert.ok(warningAt);const offline=setFoodTaskPresence(m,'seat-1',false,warningAt-8000).machine;
  assert.equal(hasOnlyDueFoodTaskWarnings(offline,warningAt-1),true);
  assert.equal(hasOnlyDueFoodTaskWarnings(offline,warningAt),false,'WARNING and GRACE at the same time remain non-warning-only');
});
for(const kind of ['MOTION','BRIEFING','TIME'])test(`warning-only timer classification rejects a ${kind} tie`,()=>{
  // A defensive timer fixture tests classification, without applying synthetic warnings as gameplay.
  const m=structuredClone(kind==='MOTION'?down(create(),4000).machine:create()),at=kind==='MOTION'?m.crate.motion.endsAt:kind==='BRIEFING'?m.runningAt:m.deadlineAt;
  if(kind==='TIME')m.stage='ACTIVE';
  m.warningWindows=[{mechanism:'CUT',actorSeatId:'seat-2',victimSeatId:'seat-1',startsAt:at-100,endsAt:at}];
  assert.equal(hasOnlyDueFoodTaskWarnings(m,at-1),true);assert.equal(hasOnlyDueFoodTaskWarnings(m,at),false);
});

for(const count of [7,8,9]) test(`${count} seats: exact pair/context and canonical contract for both randomized control assignments`,()=>{
  const m=create({winchSeatId:`seat-${count}`,panelSeatId:'seat-1'});
  for(const seat of [m.options.winchSeatId,m.options.panelSeatId]) {
    const p=projectFoodTaskParticipant(m,seat);assert.equal(p.returnsAt,32500);assert.equal(p.deadlineAt,30000);
    assert.equal(p.selfControl,seat===m.options.winchSeatId?'WINCH':'PANEL');
    assert.equal(p.ownGesture!==null,p.selfControl==='WINCH');
  }
});

test('immutable JSON-restorable machine and pure projection have no getter writes',()=>{
  const m=create(), json=JSON.stringify(m);assert.ok(Object.isFrozen(m));assert.ok(Object.isFrozen(m.people[0]));
  assert.throws(()=>{m.people[0].alive=false;},TypeError);
  projectFoodTaskParticipant(m,'seat-1');assert.equal(JSON.stringify(m),json);
  const restored=JSON.parse(json);assert.deepEqual(down(restored,4000).machine,down(m,4000).machine);
  assert.throws(()=>projectFoodTaskParticipant(m,'seat-9'),/denied/);
});

test('early unbound contact waits through briefing, automatically binds and starts lift exactly at 4000',()=>{
  const m=down(create(),500).machine;
  assert.equal(m.crate.state,'INTAKE');assert.equal(m.hold.holderSequence,null);
  assert.equal(projectFoodTaskParticipant(m,'seat-1').ownGesture.pendingIntent.sequence,1);
  const result=advanceFoodTaskMachine(m,4500);
  assert.equal(result.machine.crate.state,'HELD');
  assert.equal(result.machine.events.find(e=>e.kind==='LIFTED').at,4000);
  assert.equal(result.machine.crate.anchorAt,4450);assert.equal(result.effects.length,0);
});

test('release before acknowledgement and UP-before-DOWN close intent without resurrecting',()=>{
  let m=create();m=up(m,100,3).machine;const before=projectFoodTaskParticipant(m,'seat-2');
  m=down(m,200,3).machine;assert.equal(m.hold.holderSequence,null);assert.equal(m.crate.state,'INTAKE');
  assert.deepEqual(projectFoodTaskParticipant(m,'seat-2'),before);
  m=tick(m,5000);assert.equal(m.crate.state,'INTAKE');
  const d=down(create(),4000,1,{commandId:'down-unacked'});const r=up(d.machine,4001,1);
  assert.equal(r.machine.crate.state,'FALLING');assert.equal(r.machine.hold.holderSequence,null);
  assert.equal(tick(r.machine,5000).crate.state,'INTAKE');
});

test('same-ID DOWN retry after release returns original immutable receipt without relift or retiming',()=>{
  const m=create(), req=request(m,'seat-1',{kind:'HOLD',edge:'DOWN',gestureSequence:1,crateId:null},'original-down');
  const d=press(m,4000,'seat-1',req.command.input,{request:req});const u=up(d.machine,4100);
  const retry=press(u.machine,4200,'seat-1',req.command.input,{request:req});
  assert.equal(retry.replayed,true);assert.deepEqual(retry.receipt,d.receipt);assert.equal(retry.effects.length,0);
  assert.equal(retry.machine.crate.motion.startedAt,4100);assert.equal(retry.machine.events.length,u.machine.events.length);
  const conflict=structuredClone(req);conflict.command.input.gestureSequence=2;
  const c=press(retry.machine,4201,'seat-1',conflict.command.input,{request:conflict});
  assert.equal(c.receipt.code,'NOT_ALLOWED');assert.deepEqual(c.machine.hold,retry.machine.hold);
});

test('fresh Hold observed before Panel revision remains admissible pending and auto-picks up later',()=>{
  let m=locked(2);m=up(m,4700).machine;
  m=down(m,4750,2,{expectedControlRevision:0}).machine;
  assert.equal(m.hold.gestures['2'].state,'PENDING');
  m=tick(m,5000);m=panel(m,5000,'PANEL_RELEASE').machine;
  m=panel(m,7250,'PANEL_LOCK').machine;
  assert.equal(m.panel.stop,0);assert.equal(m.crate.state,'LIFTING');
  assert.equal(m.hold.gestures['2'].boundCrateId,'food-crate-1');assert.equal(m.hold.holderSequence,2);
});

test('future revisions, unknown control sessions and outsider input change no participant counters',()=>{
  const m=held(), before=projectFoodTaskParticipant(m,'seat-2');
  const f=down(m,4451,2,{expectedControlRevision:1000});assert.equal(f.receipt.code,'FUTURE_REVISION');
  assert.deepEqual(projectFoodTaskParticipant(f.machine,'seat-2'),before);
  const req=request(m,'seat-1',{kind:'HOLD',edge:'UP',gestureSequence:1,crateId:null});req.command.controlSessionId='unknown-session';
  const bad=applyFoodTaskPress(m,'seat-1',req,{now:4451,protectionBySeat:{}});assert.equal(bad.receipt.code,'STALE_CONTEXT');
  assert.deepEqual(projectFoodTaskParticipant(bad.machine,'seat-1'),projectFoodTaskParticipant(m,'seat-1'));
  const out=applyFoodTaskPress(m,'seat-9',request(m,'seat-1',{kind:'KEY'}),{now:4451,protectionBySeat:{}});
  assert.equal(out.receipt.code,'PHASE_CLOSED');assert.deepEqual(out.machine.hold,m.hold);
});

test('partial lift fall records sampled global height and uses CUBIC_IN to intact intake',()=>{
  const m=down(create(),4000).machine;const r=up(m,4225).machine;
  assert.equal(r.crate.motion.fromHeight,.5);assert.equal(r.crate.motion.toHeight,0);assert.equal(r.crate.motion.easing,'CUBIC_IN');
  assert.equal(sampleFoodTaskCrate(r,4375).height,.4375);
  const end=tick(r,4525);assert.equal(end.crate.state,'INTAKE');assert.equal(end.crate.height,0);assert.equal(end.broken.length,0);
});

test('wrong release preserves old fall and replacement entry independently without events',()=>{
  const m=up(locked(2),4700).machine;
  assert.equal(m.broken.length,1);assert.equal(m.broken[0].motion.toHeight,.04);
  assert.equal(m.crate.id,'food-crate-1');assert.equal(m.crate.motion.easing,'CUBIC_OUT');
  assert.equal(m.crate.motion.fromHeight,-.184);assert.ok(Math.abs(sampleFoodTaskCrate(m,4850).height+.023)<1e-12);
  const p=projectFoodTaskParticipant(emptyEvents(m),'seat-1');assert.equal(p.events.events.length,0);
  assert.equal(p.broken[0].crateId,'food-crate-0');assert.equal(p.broken[0].motion.startedAt,4700);
  assert.equal(p.crate.motion.startedAt,4700);assert.equal(p.broken[0].motion.endsAt,5000);
  assert.equal(m.outcome,null);
});

test('moving over platform breaks; locked stop 5 lands only after exact fall boundary',()=>{
  let moving=panel(held(),4450,'PANEL_RELEASE').machine;
  moving=up(moving,5500).machine;assert.equal(moving.broken[0].landing,'PLATFORM');assert.equal(moving.crate.state,'INTAKE');
  let m=up(locked(5),5450).machine;assert.equal(m.crate.state,'FALLING');
  const early=key(m,5749,'seat-1');assert.equal(early.accepted,false);
  const at=key(early.machine,5750,'seat-1');assert.equal(at.accepted,true);assert.equal(at.machine.crate.state,'LANDED');
});

test('swing release origin includes horizontal offset and pendulum global rise',()=>{
  const m=locked(5);const pose=sampleFoodTaskCrate(m,5775);
  assert.ok(pose.x>5.8);assert.ok(pose.height>1);
  const r=up(m,5775).machine;assert.equal(r.crate.id,'food-crate-1');
  assert.equal(r.broken[0].motion.fromX,pose.x);assert.equal(r.broken[0].motion.fromHeight,pose.height);
});

test('Protection and lucky stopped DROP produce identical complete participant state and receipt',()=>{
  const m=locked(4), req=request(m,'seat-1',{kind:'HOLD',edge:'UP',gestureSequence:1,crateId:null},'same-drop');
  let protectedRollCalled=false;
  const protectedStop=press(m,5200,'seat-1',req.command.input,{request:req,protectionBySeat:{'seat-2':true},roll:()=>{protectedRollCalled=true;return .99;}});
  const luckyStop=press(m,5200,'seat-1',req.command.input,{request:req,roll:()=>.24});
  for(const seat of ['seat-1','seat-2'])assert.deepEqual(projectFoodTaskParticipant(protectedStop.machine,seat),projectFoodTaskParticipant(luckyStop.machine,seat));
  assert.deepEqual(protectedStop.receipt,luckyStop.receipt);assert.equal(protectedRollCalled,false);
  assert.equal(protectedStop.effects[0].type,'CONSUME_PROTECTION');assert.equal(luckyStop.effects.length,0);
  assert.equal(protectedStop.machine.crate.state,'BRAKED');assert.equal(protectedStop.machine.hold.holderSequence,null);
  assert.equal(protectedStop.machine.events.at(-1).kind,'STOPPED');
});

test('stopped DROP brake survives time and old UP cannot release later same-crate Hold',()=>{
  let m=up(locked(4),5200,1,{roll:()=>0}).machine;
  m=tick(m,6000);assert.equal(m.crate.state,'BRAKED');
  m=down(m,6001,2).machine;assert.equal(m.crate.state,'HELD');assert.equal(m.hold.holderSequence,2);
  const before=projectFoodTaskParticipant(m,'seat-2');m=up(m,6002,1).machine;
  assert.equal(m.crate.state,'HELD');assert.equal(m.hold.holderSequence,2);
  assert.deepEqual(projectFoodTaskParticipant(m,'seat-2'),before);
});

test('lethal DROP kills immediately, breaks crate and loses with no later delivery',()=>{
  const r=up(locked(4),5200,1,{roll:()=>.25});const m=r.machine;
  assert.deepEqual(r.effects.map(e=>e.type),['KILL']);assert.equal(m.people[1].alive,false);
  assert.deepEqual(m.people[1].death,{at:5200,mechanism:'DROP',actorSeatId:'seat-1'});
  assert.deepEqual(m.outcome,{kind:'LOST',at:5200,reason:'CRATE_BROKEN_NO_FETCHER'});
  assert.equal(m.broken.length,1);assert.equal(key(m,6000,'seat-1').receipt.code,'PHASE_CLOSED');
  assert.equal(advanceFoodTaskMachine(m,40000).effects.length,0);
});

test('unprotected lethal hazard requires explicit recorded server RNG; no input mutation on throw',()=>{
  const m=locked(4), before=JSON.stringify(m);
  const req=request(m,'seat-1',{kind:'HOLD',edge:'UP',gestureSequence:1,crateId:null});
  assert.throws(()=>applyFoodTaskPress(m,'seat-1',req,{now:5200,protectionBySeat:{}}),/recorded server roll/);
  assert.equal(JSON.stringify(m),before);
});

test('Panel CUT after landing permits survivor key and delivery exactly once with empty-event recovery',()=>{
  let m=landed();m=panel(m,5750,'PANEL_RELEASE').machine;
  const kill=panel(m,5750,'PANEL_LOCK');m=kill.machine;
  assert.equal(m.people[0].alive,false);assert.equal(m.outcome,null);assert.equal(kill.effects[0].type,'KILL');
  const won=key(m,5751,'seat-2');assert.equal(won.machine.outcome.kind,'DELIVERED');
  assert.deepEqual(won.effects.map(e=>e.type),['DELIVER']);assert.equal(won.machine.crate.state,'SENT');
  const recovered=projectFoodTaskParticipant(emptyEvents(won.machine),'seat-2');
  assert.deepEqual(recovered.people[0].death,{at:5750,mechanism:'CUT',actorSeatId:'seat-2'});
  assert.equal(recovered.crate.motion.fromHeight,.36);assert.equal(recovered.crate.motion.toHeight,-.12);
  assert.equal(recovered.crate.motion.endsAt,6851);assert.equal(recovered.outcome.at,5751);
  assert.equal(advanceFoodTaskMachine(won.machine,32500).effects.length,0);
});

test('Panel CUT before landing loses NOT_OVER_PLATFORM; buffered CUT is cause-indistinguishable',()=>{
  const m=locked(5);let ready=panel(m,5500,'PANEL_RELEASE').machine;
  const req=request(ready,'seat-2',{kind:'PANEL_LOCK'},'cut');
  const kill=press(ready,5500,'seat-2',{kind:'PANEL_LOCK'},{request:req});
  assert.equal(kill.machine.outcome.reason,'NOT_OVER_PLATFORM');assert.equal(kill.machine.people[0].alive,false);
  const p=press(ready,5500,'seat-2',{kind:'PANEL_LOCK'},{request:req,protectionBySeat:{'seat-1':true}});
  const l=press(ready,5500,'seat-2',{kind:'PANEL_LOCK'},{request:req,roll:()=>0});
  assert.equal(p.machine.panel.blade.state,'BUFFERED');
  for(const seat of ['seat-1','seat-2'])assert.deepEqual(projectFoodTaskParticipant(p.machine,seat),projectFoodTaskParticipant(l.machine,seat));
});

test('simultaneous independent keys accept the same observed revision in either server order',()=>{
  const m=landed(), a=request(m,'seat-1',{kind:'KEY'},'key-a'),b=request(m,'seat-2',{kind:'KEY'},'key-b');
  const ab1=press(m,5800,'seat-1',{kind:'KEY'},{request:a});const ab2=press(ab1.machine,5800,'seat-2',{kind:'KEY'},{request:b});
  const ba1=press(m,5800,'seat-2',{kind:'KEY'},{request:b});const ba2=press(ba1.machine,5800,'seat-1',{kind:'KEY'},{request:a});
  assert.equal(ab2.accepted,true);assert.equal(ba2.accepted,true);assert.equal(ab2.machine.outcome.kind,'DELIVERED');
  assert.deepEqual(ab2.effects,ba2.effects);assert.deepEqual(ab2.machine.people,ba2.machine.people);
  assert.deepEqual(ab2.machine.outcome,ba2.machine.outcome);assert.equal(ab1.machine.controlRevision,m.controlRevision);
});

test('recovery reports actual older holder when latest contact closed and atomically prevents resurrection',()=>{
  let m=held();m=down(m,4500,2).machine;m=up(m,4501,2).machine;
  const view=projectFoodTaskParticipant(m,'seat-1').ownGesture;
  assert.equal(view.highestSequence,2);assert.equal(view.currentHolder.sequence,1);assert.equal(view.pendingIntent,null);
  m=down(m,4502,3).machine;
  const recovery=projectFoodTaskParticipant(m,'seat-1').ownGesture.recoveryRevision;
  const r=press(m,4503,'seat-1',{kind:'HOLD_RECOVER_OFF',recoveryRevision:recovery,throughSequence:4});
  assert.equal(r.receipt.result.effect,'RECOVERED_CLOSED');assert.equal(r.receipt.result.closedThroughSequence,4);
  assert.equal(r.machine.hold.holderSequence,null);assert.equal(r.machine.hold.gestures['3'].state,'CLOSED');
  assert.equal(r.machine.crate.motion.startedAt,4503);
  assert.equal(down(r.machine,4504,4).machine.hold.holderSequence,null);
});

test('stale recovery after new gesture cannot release it, or alter shared state',()=>{
  const m=held(), recovery=projectFoodTaskParticipant(m,'seat-1').ownGesture.recoveryRevision;
  const n=down(m,4500,2).machine,before=projectFoodTaskParticipant(n,'seat-2');
  const r=press(n,4501,'seat-1',{kind:'HOLD_RECOVER_OFF',recoveryRevision:recovery,throughSequence:3});
  assert.equal(r.receipt.code,'STALE_RECOVERY');assert.equal(r.machine.hold.holderSequence,1);
  assert.deepEqual(projectFoodTaskParticipant(r.machine,'seat-2'),before);
});

test('causal old generation UP cannot release newly acquired replacement',()=>{
  let m=up(locked(2),4700).machine;m=down(m,4750,2).machine;m=tick(m,5000);
  m=panel(m,5000,'PANEL_RELEASE').machine;m=panel(m,7250,'PANEL_LOCK').machine;
  assert.equal(m.hold.holderSequence,2);assert.equal(m.crate.id,'food-crate-1');
  const r=up(m,7251,1);assert.equal(r.machine.hold.holderSequence,2);assert.equal(r.machine.crate.state,'LIFTING');
});

test('disconnect retains first timestamp and does not release Hold; reconnect during grace resumes unchanged',()=>{
  const m=held();let r=setFoodTaskPresence(m,'seat-1',false,4500).machine;
  r=setFoodTaskPresence(r,'seat-1',false,6000).machine;assert.equal(r.presence['seat-1'].disconnectedAt,4500);
  assert.equal(r.hold.holderSequence,1);assert.equal(r.crate.state,'HELD');
  r=setFoodTaskPresence(r,'seat-1',true,12499).machine;assert.equal(r.outcome,null);assert.equal(r.people[0].online,true);
  assert.equal(tick(r,12500).outcome,null);assert.equal(r.returnsAt,32500);
});

test('grace expiration drains before reconnect/input equality, remains immutable and common return fixed',()=>{
  let m=setFoodTaskPresence(held(),'seat-1',false,4500).machine;
  m=setFoodTaskPresence(m,'seat-1',true,12500).machine;
  assert.deepEqual(m.outcome,{kind:'CANCELLED',at:12500,reason:'DISCONNECT',disconnectedSeatId:'seat-1'});
  assert.equal(m.people[0].online,false);assert.equal(up(m,12500).receipt.code,'PHASE_CLOSED');
  assert.equal(foodTaskMachineDeadlineAt(m),32500);m=tick(m,40000);
  assert.equal(m.returnedAt,32500);assert.equal(m.outcome.at,12500);assert.equal(foodTaskMachineDeadlineAt(m),null);
});

test('dead participant absence cannot cancel surviving Panel after valid landing',()=>{
  let m=landed();m=setFoodTaskPresence(m,'seat-1',false,5750).machine;
  m=panel(m,5751,'PANEL_RELEASE').machine;m=panel(m,5751,'PANEL_LOCK').machine;
  m=tick(m,15000);assert.equal(m.outcome,null);assert.equal(m.people[0].alive,false);
  m=key(m,15000,'seat-2').machine;assert.equal(m.outcome.kind,'DELIVERED');
});

test('all earlier/equal motion and briefing boundaries drain before later input with original timestamps',()=>{
  let m=down(create(),100).machine;
  const r=panel(m,4450,'PANEL_RELEASE',{expectedControlRevision:1});m=r.machine;assert.equal(r.accepted,true);
  assert.equal(m.events.find(e=>e.kind==='LIFTED').at,4000);assert.equal(m.crate.anchorAt,4450);
  assert.equal(m.panel.anchorAt,4450);
  const late=advanceFoodTaskMachine(up(locked(5),5450).machine,40000).machine;
  assert.equal(late.events.find(e=>e.kind==='LANDED').at,5750);assert.equal(late.outcome.at,30000);assert.equal(late.returnedAt,32500);
});

test('deadline wins exact grace tie; equal grace uses documented Winch before Panel technical order',()=>{
  let m=create();m=setFoodTaskPresence(m,'seat-2',false,22000).machine;m=tick(m,40000);
  assert.deepEqual(m.outcome,{kind:'LOST',at:30000,reason:'TIME'});
  let n=create();n=setFoodTaskPresence(n,'seat-2',false,5000).machine;n=setFoodTaskPresence(n,'seat-1',false,5000).machine;
  assert.equal(tick(n,13000).outcome.disconnectedSeatId,'seat-1');
});

test('deadline is closed endpoint, same-ID recovery keeps original receipt after Task ends',()=>{
  const m=held(), req=request(m,'seat-1',{kind:'HOLD',edge:'UP',gestureSequence:1,crateId:null},'last-drop');
  const r=press(m,30000,'seat-1',req.command.input,{request:req});assert.equal(r.receipt.code,'PHASE_CLOSED');
  const again=press(r.machine,31000,'seat-1',req.command.input,{request:req});assert.deepEqual(again.receipt,r.receipt);
  assert.equal(again.replayed,true);assert.equal(again.machine.outcome.at,30000);
});

test('50ms smoothstep snap / 200ms rest / destination locking and bounced rail are analytical',()=>{
  const m=panel(held(),4450,'PANEL_RELEASE').machine;
  assert.deepEqual(sampleFoodTaskPanel(m,4475),{x:.5,stop:1,direction:1,resting:false});
  assert.equal(sampleFoodTaskPanel(m,4500).x,1);assert.equal(sampleFoodTaskPanel(m,4699).x,1);
  assert.equal(sampleFoodTaskPanel(m,4700).stop,2);assert.equal(sampleFoodTaskPanel(m,5950).stop,5);
  assert.equal(panel(m,4475,'PANEL_LOCK').machine.panel.stop,1);
});

test('150ms danger warning is scheduled before CUT without performing the hazard',()=>{
  let m=panel(held(),4450,'PANEL_RELEASE').machine;
  m=tick(m,5549);assert.equal(m.panel.warning,null);
  m=tick(m,5550);assert.equal(m.panel.warning.mechanism,'CUT');assert.equal(m.panel.warning.startsAt,5550);
  assert.equal(m.people[0].alive,true);assert.equal(m.hazards.length,0);
  assert.equal(foodTaskMachineDeadlineAt(m),5950);
});

test('private refusals and closure-only intents do not alter other participant cursor/revision',()=>{
  const m=create(), before=projectFoodTaskParticipant(m,'seat-2');
  const d=down(m,100).machine;assert.deepEqual(projectFoodTaskParticipant(d,'seat-2'),before);
  const u=up(d,101).machine;assert.deepEqual(projectFoodTaskParticipant(u,'seat-2'),before);
  const wrong=press(u,102,'seat-1',{kind:'PANEL_LOCK'}).machine;
  assert.deepEqual(projectFoodTaskParticipant(wrong,'seat-2'),before);
});

test('server time never backdates and no mutation occurs for invalid trusted clock',()=>{
  const m=held(), before=JSON.stringify(m);
  assert.throws(()=>advanceFoodTaskMachine(m,4449),/backward/);
  assert.throws(()=>applyFoodTaskPress(m,'seat-1',request(m,'seat-1',{kind:'KEY'}),{now:4449,protectionBySeat:{}}),/backward/);
  assert.equal(JSON.stringify(m),before);
});


test('authority offers match apply interlocks while causal release/recovery needs no visible Hold offer',()=>{
  let m=create();assert.deepEqual(foodTaskMachineInputs(m,'seat-1'),['HOLD']);assert.deepEqual(foodTaskMachineInputs(m,'seat-2'),[]);
  m=down(m,100).machine;m=tick(m,4000);assert.deepEqual(foodTaskMachineInputs(m,'seat-2'),[]);
  m=tick(m,4450);assert.deepEqual(foodTaskMachineInputs(m,'seat-2'),['PANEL_RELEASE']);
  m=panel(m,4450,'PANEL_RELEASE').machine;assert.deepEqual(foodTaskMachineInputs(m,'seat-2'),['PANEL_LOCK']);
  m=landed();assert.deepEqual(foodTaskMachineInputs(m,'seat-1'),['KEY']);assert.deepEqual(foodTaskMachineInputs(m,'seat-2'),['KEY','PANEL_RELEASE']);
  assert.equal(down(m,5750,2).accepted,false);
  assert.equal(up(m,5750,1).accepted,true);
  const r=press(m,5750,'seat-1',{kind:'HOLD_RECOVER_OFF',recoveryRevision:m.hold.recoveryRevision,throughSequence:2});assert.equal(r.accepted,true);
  assert.deepEqual(foodTaskMachineInputs(r.machine,'seat-9'),[]);
  m=key(m,5800,'seat-1').machine;assert.deepEqual(foodTaskMachineInputs(m,'seat-1'),[]);
  m=key(m,5800,'seat-2').machine;assert.deepEqual(foodTaskMachineInputs(m,'seat-2'),[]);
});

for(const count of [7,8,9]) test(`${count} players: delivery, lethal drop and return share the same machine authority with swapped last-seat assignment`,()=>{
  let m=create({winchSeatId:`seat-${count}`,panelSeatId:'seat-1'});
  m=down(m,4000).machine;m=tick(m,4450);m=panel(m,4450,'PANEL_RELEASE').machine;m=panel(m,5450,'PANEL_LOCK').machine;
  m=up(m,5450).machine;m=tick(m,5750);
  const first=key(m,5800,m.options.winchSeatId);const won=key(first.machine,5800,m.options.panelSeatId);
  assert.equal(won.machine.outcome.kind,'DELIVERED');assert.equal(won.effects[0].doses,10);assert.equal(tick(won.machine,40000).returnedAt,32500);
  m=create({winchSeatId:`seat-${count}`,panelSeatId:'seat-1'});m=down(m,4000).machine;m=tick(m,4450);
  m=panel(m,4450,'PANEL_RELEASE').machine;m=panel(m,5200,'PANEL_LOCK').machine;
  const dead=up(m,5200);assert.equal(dead.machine.outcome.reason,'CRATE_BROKEN_NO_FETCHER');assert.equal(dead.effects[0].seatId,'seat-1');
  assert.equal(tick(dead.machine,40000).returnedAt,32500);
});

test('recover-off same-ID retry is exact after later gesture, with no second release or closure',()=>{
  let m=held();m=down(m,4500,2).machine;
  const input={kind:'HOLD_RECOVER_OFF',recoveryRevision:m.hold.recoveryRevision,throughSequence:3};
  const req=request(m,'seat-1',input,'recover-id');const first=press(m,4501,'seat-1',input,{request:req});
  m=tick(first.machine,4801);m=down(m,4802,4).machine;assert.equal(m.hold.holderSequence,4);
  const before=projectFoodTaskParticipant(m,'seat-2');const retry=press(m,4803,'seat-1',input,{request:req});
  assert.deepEqual(retry.receipt,first.receipt);assert.equal(retry.replayed,true);assert.equal(retry.effects.length,0);
  assert.equal(retry.machine.hold.holderSequence,4);assert.deepEqual(projectFoodTaskParticipant(retry.machine,'seat-2'),before);
});

test('known old generation is guarded while unbound pending contact can bind replacement exactly once',()=>{
  const m=up(locked(2),4700).machine;
  const r=press(m,4701,'seat-1',{kind:'HOLD',edge:'DOWN',gestureSequence:2,crateId:'food-crate-0'});
  assert.equal(r.receipt.code,'CRATE_CHANGED');assert.equal(r.machine.hold.gestures['2'],undefined);
  let n=down(r.machine,4702,3).machine;n=tick(n,5000);n=panel(n,5000,'PANEL_RELEASE').machine;n=panel(n,7250,'PANEL_LOCK').machine;
  assert.equal(n.hold.gestures['3'].boundCrateId,'food-crate-1');
  const p=tick(n,7700);assert.equal(p.events.filter(e=>e.kind==='LIFTED'&&e.crateId==='food-crate-1').length,1);
});


test('newer pending held contact acquires once when older stopped release establishes brake eligibility',()=>{
  let m=locked(4);m=down(m,5200,2).machine;
  const r=up(m,5201,1,{roll:()=>0});
  assert.equal(r.machine.hold.holderSequence,2);assert.equal(r.machine.hold.gestures['2'].boundCrateId,'food-crate-0');
  assert.equal(r.machine.crate.state,'HELD');assert.equal(r.machine.events.filter(e=>e.kind==='TAKEN').length,1);
  assert.equal(tick(r.machine,6000).events.filter(e=>e.kind==='TAKEN').length,1);
});

test('atomic recover-off closes newer pending before stopped release, leaving brake without reacquisition',()=>{
  let m=locked(4);m=down(m,5200,2).machine;
  const r=press(m,5201,'seat-1',{kind:'HOLD_RECOVER_OFF',recoveryRevision:m.hold.recoveryRevision,throughSequence:3},{roll:()=>0});
  assert.equal(r.machine.crate.state,'BRAKED');assert.equal(r.machine.hold.holderSequence,null);
  assert.equal(r.machine.hold.gestures['2'].state,'CLOSED');assert.equal(r.machine.events.filter(e=>e.kind==='TAKEN').length,0);
});
