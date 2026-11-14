// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
// Light, Node-only checks for Designer's #240 correction list. No browser,
// emulator, clock injection into a service, or production drawing registration.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createFoodTaskController,createFoodHoldInput} from '@mothership/game';
import {parseFoodTaskReceipt,FoodTaskCommandRequestSchema,foodTaskRevisionBody} from '@mothership/contracts';
import {nativeFoodCase} from './food-native-packets.mjs';
import {foodDisplay,foodControlSub} from '../../hosted/planet/food-display.mjs';
import {boardOf,CAST} from '../../../../design/food-supply/boards.mjs';
import {run} from '../../../../design/food-supply/stage.mjs';
import {tick,view} from '../../../../design/food-supply/task.mjs';

const root=resolve(new URL('../../../../',import.meta.url).pathname);
const map=JSON.parse(readFileSync(resolve(root,'docs/frontend/food-supply-comparison-map.json'),'utf8'));
const entry=id=>{const row=map.cases.find(c=>c.id===id);return {row,value:nativeFoodCase(row.reference.query)};};
const broken=entry('food-winch-10'),record=broken.value.initial,v=record.value.foodPlayerView,t=v.participantTask;
const model={view:v,fresh:true,canHold:true,physicalHolding:false,needsContactOff:false};
const native=foodDisplay(model,record.now),at=record.now-t.startedAt;
const last=run(boardOf('mistakes')).filter(f=>f.at<=at).at(-1),reference=view(tick(last.state,at).state,CAST.winch.seat,at);
assert.equal(native.panel.stop,reference.panel.stop);assert.equal(native.crate.state,reference.crate.state);
assert.equal(v.offers.find(o=>o.type==='TASK_PRESS').inputs.includes('HOLD'),true);
assert.equal(native.buttons[0].enabled,true);assert.equal(reference.buttons[0].enabled,true);
assert.equal(foodControlSub(native.buttons[0],native),'Lifts when the hook stops at 1');assert.equal(native.buttons[0].next,false);

const recovered=entry('food-states-06').value,{request,receipt}=recovered.recovery;
assert.equal(parseFoodTaskReceipt(receipt,request,'seat-3').status,'rejected');
assert.equal(receipt.code,'STALE_CONTEXT');
let stored=JSON.stringify({schemaVersion:1,ownerUid:'audit-own-phone',matchId:request.matchId,seatId:'seat-3',entries:[request],contact:null}),answer=null,commands=0,lookups=0;
const own=recovered.initial.value.foodPlayerView,now=recovered.initial.now;
const controller=createFoodTaskController({currentUid:()=> 'audit-own-phone',command:async()=>{commands++;throw Error('Recovery must not resend');},
 receipt:async()=>{lookups++;return {receipt:answer,serverTimeMs:now};},refresh(){}},
 {clock:{now:()=>now},scheduler:{setTimeout,clearTimeout},ids:{next:()=> 'unused'},unresolved:{load:()=>null,save(){},clear(){}},
 recovery:{load:()=>stored,save:s=>{stored=s;},clear:()=>{stored=null;}}},
 {binding:{uid:'audit-own-phone',matchId:request.matchId,seatId:'seat-3'},readClock:()=>({status:'synced',serverNowMs:now,uncertaintyMs:0})});
assert.equal(controller.observe(own,{matchId:request.matchId,versions:own.versions,phaseId:own.phaseId,round:own.round,serverNowMs:now}),true);
await controller.checkReceipts();const unknown=controller.getModel();
assert.equal(unknown.feedback.status,'unknown');assert.equal(unknown.pendingCount,1);assert.equal(unknown.canPanelLock,false);
answer=receipt;await controller.checkReceipts();const resolved=controller.getModel();
assert.equal(resolved.feedback.status,'rejected');assert.equal(resolved.feedback.recovered,true);assert.equal(resolved.pendingCount,0);assert.equal(resolved.canPanelLock,true);assert.equal(commands,0);controller.dispose();

const result={scope:'Node-only synthetic engine-prefix and original-receipt checks. No browser/connected/device/Designer acceptance.',
 winch10:{query:broken.row.reference.query,at,panelStop:native.panel.stop,displayStop:native.panel.stop+1,crateState:native.crate.state,settled:native.crate.settled,
  authoritativeOffer:v.offers[0].inputs,nativeHoldEnabled:true,referenceHoldEnabled:true,
  conclusion:'Designer cd2b70dd reconciles the existing approved early Hold. The real server offer remains usable, without claiming a lift.'},
 states06:{construction:recovered.recovery.construction,authoritativeReceipt:{status:receipt.status,code:receipt.code},
  transitions:[{receipt:null,status:unknown.feedback.status,pending:unknown.pendingCount,canPanelLock:unknown.canPanelLock},
   {receipt:'original authoritative receipt',status:resolved.feedback.status,recovered:resolved.feedback.recovered,pending:resolved.pendingCount,canPanelLock:resolved.canPanelLock}],lookups,commands},
 panel14:{releaseNext:false,offeredInputs:entry('food-panel-14').value.initial.value.foodPlayerView.offers[0].inputs}};
const landed=entry('food-panel-14').value.initial,landedView=landed.value.foodPlayerView;
const buttons=foodDisplay({view:landedView,fresh:true,canKey:true,canPanelRelease:true},landed.now).buttons;
assert.equal(buttons.find(b=>b.act==='release').enabled,true);assert.equal(buttons.find(b=>b.act==='release').next,false);assert.equal(buttons.find(b=>b.act==='key').next,true);
const early=entry('food-states-15').value,prepared=early.pendingHold,presses=[],originals=[prepared.down,prepared.release];let earlyNow=early.initial.now,earlyStore=null;
const pendingController=createFoodTaskController({currentUid:()=> 'pending-own-phone',refresh(){},receipt:async()=>null,
 command:async q=>{const expected=originals[presses.length];assert.deepEqual(FoodTaskCommandRequestSchema.parse(q),FoodTaskCommandRequestSchema.parse(expected.request));presses.push(q);earlyNow=expected.receipt.receivedAt;return {receipt:expected.receipt,serverTimeMs:earlyNow};}},
 {clock:{now:()=>earlyNow},scheduler:{setTimeout,clearTimeout},ids:{next:()=>originals[presses.length].request.commandId},unresolved:{load:()=>null,save(){},clear(){}},
 recovery:{load:()=>earlyStore,save:s=>{earlyStore=s;},clear:()=>{earlyStore=null;}}},
 {binding:{uid:'pending-own-phone',matchId:early.initial.value.matchId,seatId:'seat-8'},readClock:()=>({status:'synced',serverNowMs:earlyNow,uncertaintyMs:0})});
const observePending=packet=>{earlyNow=packet.now;const own=packet.value.foodPlayerView;assert.equal(pendingController.observe(own,{matchId:own.matchId,versions:own.versions,phaseId:own.phaseId,round:own.round,serverNowMs:packet.now}),true);};
observePending(early.initial);const input=createFoodHoldInput({down:()=>pendingController.holdDown(),up:()=>pendingController.holdUp(),held:()=>pendingController.getModel().physicalHolding});
assert.equal(input.pointerDown(7),true);await new Promise(setImmediate);observePending(early.next);
const waiting=foodDisplay(pendingController.getModel(),earlyNow),hold=waiting.buttons[0];
assert.equal(hold.pending,true);assert.equal(hold.holding,false);assert.equal(hold.label,'Hold');assert.equal(hold.next,false);assert.equal(foodControlSub(hold,waiting),'Waiting for the hook');assert.equal(waiting.hint.text,'Keep holding till the hook comes.');
input.pointerUp(7);await new Promise(setImmediate);observePending(prepared.off);
assert.equal(pendingController.getModel().physicalHolding,false);assert.equal(pendingController.getModel().view.participantTask.ownGesture.pendingIntent,null);
assert.deepEqual(prepared.off.value.foodPlayerView.participantTask.crate,early.next.value.foodPlayerView.participantTask.crate);
assert.deepEqual(foodTaskRevisionBody(prepared.panel.value.foodPlayerView),foodTaskRevisionBody(prepared.panelAfter.value.foodPlayerView));
const unaware=nativeFoodCase(broken.row.reference.query.replace('as=winch','as=panel')).initial;
assert.deepEqual(foodTaskRevisionBody(unaware.value.foodPlayerView),foodTaskRevisionBody(prepared.panel.value.foodPlayerView));
result.pendingHold={originalDownAt:prepared.down.receipt.receivedAt,frameAt:early.next.now,releaseAt:prepared.release.receipt.receivedAt,label:hold.label,line:foodControlSub(hold,waiting),hint:waiting.hint.text,glow:hold.next,holding:hold.holding,physicalContact:true,
 originalInputEdges:presses.map(q=>q.command.input.edge),sameGesture:presses[0].command.input.gestureSequence===presses[1].command.input.gestureSequence,
 releasedCrateState:prepared.off.value.foodPlayerView.participantTask.crate.state,noFall:true,panelUnchanged:true};
input.dispose();pendingController.dispose();
const dir=resolve(root,'docs/frontend/evidence/food-supply-corrections-2026-11-13');mkdirSync(dir,{recursive:true});
writeFileSync(resolve(dir,'input-audit-cd2b70dd.json'),JSON.stringify(result,null,2)+'\n');
console.log('Food correction audit: original receipt, offered early Hold, private pending presentation and causal UP/no-fall all pass.');
