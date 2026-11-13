// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
// Light, Node-only checks for Designer's #240 correction list. No browser,
// emulator, clock injection into a service, or production drawing registration.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createFoodTaskController} from '@mothership/game';
import {parseFoodTaskReceipt} from '@mothership/contracts';
import {nativeFoodCase} from './food-native-packets.mjs';
import {foodDisplay} from '../../hosted/planet/food-display.mjs';
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
assert.equal(native.buttons[0].enabled,true);assert.equal(reference.buttons[0].enabled,false);

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
  authoritativeOffer:v.offers[0].inputs,nativeHoldEnabled:true,referenceHoldEnabled:false,
  conclusion:'Matching mechanical fixture; source/contract conflict. The approved early held contact is offered by the server and must remain usable pending Designer/owner resolution.'},
 states06:{construction:recovered.recovery.construction,authoritativeReceipt:{status:receipt.status,code:receipt.code},
  transitions:[{receipt:null,status:unknown.feedback.status,pending:unknown.pendingCount,canPanelLock:unknown.canPanelLock},
   {receipt:'original authoritative receipt',status:resolved.feedback.status,recovered:resolved.feedback.recovered,pending:resolved.pendingCount,canPanelLock:resolved.canPanelLock}],lookups,commands},
 panel14:{releaseNext:false,offeredInputs:entry('food-panel-14').value.initial.value.foodPlayerView.offers[0].inputs}};
const landed=entry('food-panel-14').value.initial,landedView=landed.value.foodPlayerView;
const buttons=foodDisplay({view:landedView,fresh:true,canKey:true,canPanelRelease:true},landed.now).buttons;
assert.equal(buttons.find(b=>b.act==='release').enabled,true);assert.equal(buttons.find(b=>b.act==='release').next,false);assert.equal(buttons.find(b=>b.act==='key').next,true);
const dir=resolve(root,'docs/frontend/evidence/food-supply-corrections-2026-11-13');mkdirSync(dir,{recursive:true});
writeFileSync(resolve(dir,'input-audit.json'),JSON.stringify(result,null,2)+'\n');
console.log('Food correction audit: authoritative recovery and offered inputs preserved; winch-10 source conflict recorded.');
