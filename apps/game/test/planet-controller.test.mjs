import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createPlanetController,readPlanetView,readPlanetReceipt} from '../dist/index.js';
import {PLANET_GAME_PINS,PlanetPlayerViewSchema} from '@mothership/contracts';

import {ids,planetView,rig} from './planet-support.mjs';

test('protocol 3 validates exact audience and rejects legacy, foreign seats, malformed slots',()=>{
 const v=planetView();assert.ok(readPlanetView(v,'planet-local','seat-6'));assert.equal(readPlanetView(v,'planet-local',null),null);
 assert.equal(readPlanetView({...v,versions:{...v.versions,protocolVersion:2}},'planet-local','seat-6'),null);
 assert.equal(readPlanetView(v,'planet-local','seat-5'),null);
 const malformed=structuredClone(v);malformed.board.seats[0].slotId='B1';assert.equal(readPlanetView(malformed,'planet-local','seat-6'),null);
});
test('private role, Code knowledge and navigation never enter closed, windows or display models',async()=>{
 const r=rig();await r.controller.start();assert.equal(r.read().privateArea,null);
 r.controller.openPanel('windows');assert.deepEqual(r.read().privateArea,{windows:[]});assert.ok(!JSON.stringify(r.read()).includes('Hacker'));
 r.controller.openPanel('card');assert.equal(r.read().privateArea.role.name,'Hacker');assert.equal(r.read().privateArea.knowledge.knownUndercoverSeatId,'seat-5');
 r.controller.setVisible(false);assert.equal(r.read().board,null);assert.equal(r.read().privateArea,null);assert.equal(r.read().action,null);r.controller.dispose();
});
test('Code is four original identities, remains separate from ship activation and works beyond Round 5',async()=>{
 const r=rig();await r.controller.start();r.controller.begin('SUBMIT_CODE');for(const id of ids.slice(0,4))r.controller.choose(id);
 assert.equal(r.read().action.step,'confirm');assert.match(r.read().action.confirmation,/one final Code/);await r.controller.confirm();
 assert.deepEqual(r.sent[0].command,{type:'SUBMIT_CODE',seatIds:ids.slice(0,4)});assert.equal(r.read().action.step,'accepted');
 assert.equal(r.saved(),null);r.controller.begin('PASS_TURN');assert.equal(r.sent.length,1);r.controller.dispose();
});
test('Move room then empty slot is one command; occupied and mismatched locations cannot be selected',async()=>{
 const r=rig();await r.controller.start();r.controller.begin('MOVE');assert.deepEqual(r.read().action.choices.map(x=>x.value),['Room B','Command Room']);
 r.controller.choose('Room B');r.controller.choose('A1');assert.equal(r.read().action.step,'slots');r.controller.choose('B5');assert.match(r.read().action.confirmation,/repositioning spends/);await r.controller.confirm();
 assert.deepEqual(r.sent[0].command,{type:'MOVE',destination:'Room B',slotId:'B5'});r.controller.dispose();
});
test('unknown registration keeps only recovery identifiers, retries exact body and original ID',async()=>{
 const r=rig(planetView(),{reply:'lost'});await r.controller.start();r.controller.begin('PASS_TURN');await r.controller.confirm();
 assert.equal(r.read().recovery.status,'unknown');const stored=JSON.parse(r.saved());assert.deepEqual(Object.keys(stored).sort(),['commandId','matchId','ownerUid','phaseId','protocolVersion','seatId']);
 r.controller.begin('MOVE');assert.equal(r.read().action,null);r.setReply('accepted');await r.controller.retry();assert.equal(r.sent.length,2);assert.deepEqual(r.sent[1],r.sent[0]);r.controller.dispose();
});
test('original receipt can settle after phase change; missing receipt never authorizes replacement',async()=>{
 const r=rig(planetView(),{reply:'lost'});await r.controller.start();r.controller.begin('PASS_TURN');await r.controller.confirm();
 const next=planetView();next.viewRevision=2;next.phase={id:'phase-next',kind:'PRE_TURN',startedAt:1000,endsAt:16000};r.push(next);
 assert.equal(r.read().recovery.canRetry,false);await r.controller.checkReceipt();assert.equal(r.read().recovery.status,'unknown');
 r.setReply('accepted');await r.controller.checkReceipt();assert.equal(r.lookups[1].phaseId,'phase-6-turn');assert.equal(r.saved(),null);r.controller.dispose();
});
test('fresh view revisions, trusted deadline and identity changes suppress all action marks',async()=>{
 const r=rig();await r.controller.start();r.controller.begin('SCAN');r.controller.choose('seat-1');assert.equal(r.read().action.step,'faction');
 r.push(planetView(),false);assert.equal(r.read().action,null);assert.equal(r.read().privateArea,null);r.push(planetView());
 r.controller.begin('SUBMIT_CODE');await r.advance(60000);assert.equal(r.read().action,null);assert.equal(r.read().canPass,false);
 r.setUid('wrong-user');r.push(planetView());assert.equal(r.read().board,null);assert.equal(r.read().connection,'error');r.controller.dispose();
});
test('window endpoint/station/round filters preserve drawing while Officer blocks movement',async()=>{
 const v=planetView();v.board.seats[5].slotId='B1';v.offices.blockedSeatId='seat-6';v.self.movementSpent=true;v.offers=v.offers.filter(o=>o.type!=='MOVE');
 const drawing={strokes:[{color:'#e9b64e',width:3,points:[[0,0],[1,1]]}]};
 v.windows=[{windowId:'A_B',canDraw:true,drawings:[{id:'drawing-1',windowId:'A_B',authorSeatId:'seat-1',round:6,order:0,drawing}]}];v.offers.push({type:'SHOW_WINDOW',targetSeatIds:[],slotIds:[],windowIds:['A_B']});
 const r=rig(v);await r.controller.start();r.controller.openPanel('windows');assert.equal(r.read().privateArea.windows[0].canDraw,true);assert.equal(r.read().canMove,false);
 r.controller.showDrawing('A_B',{strokes:[{color:'url(https://bad)',width:1,points:[[0,0]]}]});assert.equal(r.read().action,null);
 r.controller.showDrawing('A_B',drawing);await r.controller.confirm();assert.equal(r.sent[0].command.type,'SHOW_WINDOW');r.controller.dispose();
});
test('reloaded recovery checks the saved command, never reconstructs its private payload',async()=>{
 const r=rig();r.setSaved(JSON.stringify({protocolVersion:3,matchId:'planet-local',phaseId:'old-phase',commandId:'original-command',ownerUid:'local-uid',seatId:'seat-6'}));await r.controller.start();
 assert.equal(r.read().recovery.canRetry,false);await r.controller.checkReceipt();assert.equal(r.lookups[0].commandId,'original-command');assert.equal(r.sent.length,0);r.controller.dispose();
});
test('receipt validation binds protocol, match, phase and command together',()=>{
 const context={protocolVersion:3,matchId:'planet-local',phaseId:'phase-a',commandId:'original'};const receipt={...context,status:'accepted',code:'REGISTERED'};
 assert.ok(readPlanetReceipt(receipt,context));assert.equal(readPlanetReceipt({...receipt,phaseId:'other'},context),null);assert.equal(readPlanetReceipt({...receipt,protocolVersion:2},context),null);
});
test('a nonresponding command times out into recovery instead of staying busy forever',async()=>{
 const r=rig(planetView(),{reply:'never'});await r.controller.start();r.controller.begin('PASS_TURN');const sending=r.controller.confirm();await r.advance(8000);await sending;assert.equal(r.read().recovery.status,'unknown');r.controller.dispose();
});
test('an unreviewed artwork manifest cannot silently enter the supported Planet consumer',()=>{
 const v=planetView();v.versions.assetManifestVersion='unreviewed-art';assert.equal(readPlanetView(v,'planet-local','seat-6'),null);
});
test('Insider presentation is an unordered identity set with no role-to-player pairing',async()=>{
 const v=planetView('Insider');v.knowledge.insiderSeatIds=['seat-7','seat-2','seat-5'];const r=rig(v);await r.controller.start();r.controller.openPanel('card');assert.deepEqual(r.read().privateArea.knowledge.insiderSeatIds,['seat-2','seat-5','seat-7']);assert.ok(!r.read().privateArea.knowledge.insiderSeatIds.some(x=>typeof x==='object'));r.controller.dispose();
});
test('the lit Blackout preview keeps station windows free; darkness removes images and closes an unsent Show',async()=>{
 const v=planetView();v.phase={id:'phase-blackout',kind:'BLACKOUT',startedAt:0,endsAt:15000};v.blackout={windowId:'window-blackout',previewEndsAt:5000,endsAt:15000};v.windows=[{windowId:'A_B',canDraw:true,drawings:[]}];v.offers=[{type:'SHOW_WINDOW',targetSeatIds:[],slotIds:[],windowIds:['A_B']}];
 const r=rig(v);await r.controller.start();r.controller.openPanel('windows');assert.equal(r.read().privateArea.windows[0].canDraw,true);r.controller.showDrawing('A_B',{strokes:[{color:'#F7D886',width:4,points:[[0,0],[1,1]]}]});assert.equal(r.read().action.canConfirm,true);
 await r.advance(5000);assert.equal(r.read().dark,true);assert.equal(r.read().action,null);assert.deepEqual(r.read().privateArea.windows,[]);assert.deepEqual(r.read().presentation.events,[]);await r.controller.confirm();assert.equal(r.sent.length,0);r.controller.dispose();
});
test('closing accepted private registration removes its label while retaining the awaiting-view barrier',async()=>{
 const v=planetView('Alien');v.offers=[{type:'ACTIVATE_BLACKHOLE',targetSeatIds:[],slotIds:[],windowIds:[]}];const r=rig(v);await r.controller.start();r.controller.begin('ACTIVATE_BLACKHOLE');await r.controller.confirm();assert.equal(r.read().action.step,'accepted');r.controller.dismiss();assert.equal(r.read().action,null);assert.equal(r.read().privateArea,null);assert.ok(!JSON.stringify(r.read()).includes('ACTIVATE_BLACKHOLE'));r.controller.begin('ACTIVATE_BLACKHOLE');assert.equal(r.read().action,null);assert.equal(r.sent.length,1);r.controller.dispose();
});
