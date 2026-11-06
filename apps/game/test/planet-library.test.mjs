import assert from 'node:assert/strict';
import {test} from 'node:test';
import {planetView,rig} from './planet-support.mjs';
function beforeSupply(){const v=planetView();v.round=3;v.phase={id:'blackout',kind:'BLACKOUT',startedAt:1000,endsAt:16000};v.blackout={windowId:'blackout',previewEndsAt:6000,endsAt:16000};v.board.finalizedRound=2;v.navigation.lastMovedRound=2;v.activeSeatId=null;v.offers=[];v.offices.captainSeatId='seat-1';Object.assign(v.board.seats[0],{captain:true,location:'Command Room',slotId:'C1'});return v;}
function afterSupply(v){const next=structuredClone(v);next.viewRevision++;next.phase={id:'navigation',kind:'NAV_CAPTAIN_CONFIRM',startedAt:16001,endsAt:31001};next.blackout=null;next.board.finalizedRound=3;next.self.ordinaryWeapons=1;return next;}
test('Supply notice is private, follows the actual finalized opportunity and never replays after foreground',async()=>{
 const v=beforeSupply(),r=rig(v);await r.controller.start();await r.advance(15001);r.push(afterSupply(v));assert.equal(r.read().privateArea,null);r.controller.openPanel('card');assert.deepEqual(r.read().privateArea.supplyDelivery,{round:3,count:1});r.controller.dismiss();assert.equal(r.read().privateArea,null);
 r.controller.setVisible(false);r.controller.setVisible(true);for(let i=0;i<12;i++)await Promise.resolve();await r.advance(250);for(let i=0;i<12;i++)await Promise.resolve();r.controller.openPanel('card');assert.equal(r.read().privateArea.supplyDelivery,null);assert.equal(r.read().privateArea.resources.ordinaryWeapons,1);r.controller.dispose();
});
test('Sync can restore a weapon without producing a Supply receipt',async()=>{
 const v=planetView(),r=rig(v);await r.controller.start();const next=structuredClone(v);next.viewRevision++;next.phase={id:'sync',kind:'BLACKHOLE_PRESENTATION',startedAt:1000,endsAt:7000};next.activeSeatId=null;next.offers=[];next.self.ordinaryWeapons=1;r.push(next);r.controller.openPanel('card');assert.equal(r.read().privateArea.supplyDelivery,null);assert.equal(r.read().privateArea.resources.ordinaryWeapons,1);r.controller.dispose();
});
test('Hospital keypad labels are numbers and a selected number still registers the offered seat identity',async()=>{
 const v=planetView();v.offers=[{type:'PANEL_CODE',targetSeatIds:['seat-9','seat-2','seat-6'],slotIds:[],windowIds:[]}];const r=rig(v);await r.controller.start();r.controller.begin('PANEL_CODE');assert.deepEqual(r.read().action.choices,[{value:'seat-2',label:'2'},{value:'seat-6',label:'6'},{value:'seat-9',label:'9'}]);r.controller.choose('seat-6');await r.controller.confirm();assert.deepEqual(r.sent[0].command,{type:'PANEL_CODE',doctorSeatId:'seat-6'});r.controller.dispose();
});
test('the emitted window view closes at the preview boundary even after a tick just before it',async()=>{
 const v=beforeSupply();v.windows=[{windowId:'A_B',canDraw:true,drawings:[]}];v.offers=[{type:'SHOW_WINDOW',targetSeatIds:[],slotIds:[],windowIds:['A_B']}];const r=rig(v);await r.controller.start();r.controller.openPanel('windows');let emitted=null;const stop=r.controller.subscribe(model=>{emitted=model;});
 await r.advance(4999);assert.equal(emitted.dark,false);assert.equal(emitted.privateArea.windows.length,1);await r.advance(1);assert.equal(emitted.dark,true);assert.deepEqual(emitted.privateArea.windows,[]);assert.equal(emitted.phase.kind,'BLACKOUT');stop();r.controller.dispose();
});
test('rendering that crosses the preview deadline cannot cancel its already due redraw',async()=>{
 const v=beforeSupply();v.windows=[{windowId:'A_B',canDraw:true,drawings:[]}];const r=rig(v);let renderWork=0;const monotonicNow=r.ports.clock.now;r.ports.clock.now=()=>monotonicNow()+renderWork;
 await r.controller.start();r.controller.openPanel('windows');let emitted=null;const stop=r.controller.subscribe(model=>{emitted=model;if(!model.dark&&model.phase.nowMs>=5999)renderWork=2;});
 await r.advance(4999);assert.equal(emitted.dark,false);await r.advance(1);assert.equal(emitted.dark,true);assert.deepEqual(emitted.privateArea.windows,[]);stop();r.controller.dispose();
});
test('a just-future authoritative phase becomes usable at its supplied start',async()=>{
 const v=planetView();v.phase.startedAt=1001;v.phase.endsAt=61001;const r=rig(v);await r.controller.start();let emitted=null;const stop=r.controller.subscribe(model=>{emitted=model;});
 assert.equal(emitted.phase.expired,true);assert.equal(emitted.canPass,false);await r.advance(1);assert.equal(emitted.phase.expired,false);assert.equal(emitted.canPass,true);assert.equal(emitted.phase.startedAt,1001);stop();r.controller.dispose();
});
