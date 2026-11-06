import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PLANET_ORIGINAL_PINS,PLANET_SYNC_PINS} from '@mothership/contracts';
import {readPlanetView} from '../dist/index.js';
import {ids,planetView,rig} from './planet-support.mjs';

function historical(pins){const v=planetView();v.versions={...pins,assetManifestVersion:'design-0.5.0'};delete v.abilities.engineerCapture;delete v.abilities.panelRequest;return v;}
function setting(choice=true){const v=planetView();v.phase={id:'setting',kind:'NAV_SETTING',startedAt:1000,endsAt:16000};v.activeSeatId=null;v.offices={captainSeatId:'seat-1',officerSeatId:'seat-6',blockedSeatId:null};v.board.seats[0].captain=true;v.board.seats[5].officer=true;v.privateNavigation={position:'B1',direction:null,tieChoice:choice,confirmation:null};v.offers=choice?[{type:'CHOOSE_NAV_DIRECTION',targetSeatIds:[],slotIds:[],windowIds:[]}]:[];return v;}
function publicView(v){const fields=['versions','matchId','viewRevision','round','playerCount','phase','activeSeatId','offices','board','hackSession','blackout','ballot','lastTally','navigation','events','result','endReveal'];return {...Object.fromEntries(fields.map(k=>[k,structuredClone(v[k])])),board:{...structuredClone(v.board),kind:'FINALIZED'}};}

test('historical shapes remain readable and phase names stay bound to their exact saved tuple',()=>{
 for(const pins of [PLANET_ORIGINAL_PINS,PLANET_SYNC_PINS]){const v=historical(pins);v.phase={id:'old-tie',kind:'NAV_TIE',startedAt:1000,endsAt:16000};assert.ok(readPlanetView(v,v.matchId,v.self.seatId));
  assert.equal(readPlanetView({...v,phase:{...v.phase,kind:'NAV_SETTING'}},v.matchId,v.self.seatId),null);v.abilities.panelRequest=null;assert.equal(readPlanetView(v,v.matchId,v.self.seatId),null);
 }
 const v=setting();assert.ok(readPlanetView(v,v.matchId,v.self.seatId));assert.equal(readPlanetView({...v,phase:{...v.phase,kind:'NAV_TIE'}},v.matchId,v.self.seatId),null);
 const missing=structuredClone(v);delete missing.abilities.engineerCapture;assert.equal(readPlanetView(missing,v.matchId,v.self.seatId),null);
});
test('a continuing match cannot silently switch between otherwise valid tuples',async()=>{
 const old=historical(PLANET_SYNC_PINS),r=rig(old);await r.controller.start();const next=planetView();next.viewRevision=2;r.push(next);assert.equal(r.read().connection,'error');assert.equal(r.read().board,null);r.controller.dispose();
});
test('early Officer choice preserves the full setting interval and cannot open confirmation locally',async()=>{
 const v=setting(),r=rig(v);await r.controller.start();r.controller.openPanel('navigation');assert.equal(r.read().privateArea.offers[0].type,'CHOOSE_NAV_DIRECTION');r.controller.begin('CHOOSE_NAV_DIRECTION');r.controller.choose('Blue');await r.controller.confirm();
 assert.deepEqual(r.sent[0].command,{type:'CHOOSE_NAV_DIRECTION',direction:'Blue'});assert.equal(r.read().phase.endsAt,16000);assert.equal(r.read().phase.kind,'NAV_SETTING');assert.equal(r.read().privateArea.navigation.direction,null);
 await r.advance(14999);assert.equal(r.read().phase.remainingMs,1);r.controller.begin('CONFIRM_NAVIGATION');assert.equal(r.sent.length,1);await r.advance(1);assert.equal(r.read().phase.kind,'NAV_SETTING');assert.equal(r.read().privateArea,null);
 const next=structuredClone(v);next.viewRevision++;next.phase={id:'captain-confirm',kind:'NAV_CAPTAIN_CONFIRM',startedAt:18000,endsAt:33000};next.privateNavigation={...next.privateNavigation,direction:'Blue',tieChoice:false};next.offers=[];await r.advance(2000);r.push(next);assert.equal(r.read().phase.remainingMs,15000);r.controller.openPanel('navigation');assert.deepEqual(r.read().privateArea.offers,[]);r.controller.dispose();
});
test('tie and non-tie bystander packets produce identical public consumer states throughout setting',async()=>{
 const tie=setting(),ordinary=setting(false);assert.deepEqual(publicView(tie),publicView(ordinary));const p=publicView(tie),r=rig(p,{display:true});await r.controller.start();const before=r.read();r.push(publicView(ordinary));assert.deepEqual(r.read(),before);assert.equal(r.read().privateArea,null);
 await r.advance(7000);assert.equal(r.read().phase.kind,'NAV_SETTING');assert.equal(r.read().phase.remainingMs,8000);assert.equal(r.sent.length,0);r.controller.dispose();
});
test('same-id NAV_SETTING timestamps cannot restart or shrink after an early choice',async()=>{
 const v=setting(),r=rig(v);await r.controller.start();const next=structuredClone(v);next.viewRevision++;next.phase.startedAt+=1000;next.phase.endsAt+=1000;r.push(next);assert.equal(r.read().connection,'error');assert.equal(r.read().action,null);r.controller.dispose();
});
test('confirmed Engineer identities including empty sets survive movement without entering other panels',async()=>{
 for(const seatIds of [[],['seat-1','seat-3']]){const v=planetView('Engineer');v.abilities.engineerSpent=true;v.abilities.engineerCapture={round:5,seatIds};const r=rig(v);await r.controller.start();r.controller.openPanel('card');assert.deepEqual(r.read().privateArea.abilities.engineerCapture,{round:5,seatIds});
  const next=structuredClone(v);next.viewRevision++;Object.assign(next.board.seats[0],{location:'Room B',slotId:'B5'});r.push(next);assert.deepEqual(r.read().privateArea.abilities.engineerCapture,{round:5,seatIds});r.controller.openPanel('windows');assert.equal(JSON.stringify(r.read()).includes('engineerCapture'),false);r.controller.dismiss();assert.equal(r.read().privateArea,null);r.controller.dispose();
 }
});
test('patient feedback survives departure and cannot be replaced by current health or Doctor inventory',async()=>{
 const v=planetView();v.abilities.panelAttemptSpent=true;v.abilities.panelRequest={commandId:'patient-original',round:4,status:'QUEUED'};const r=rig(v);await r.controller.start();r.controller.openPanel('hospital');assert.equal(r.read().privateArea.panelRequest.status,'QUEUED');assert.equal('abilities' in r.read().privateArea,false);assert.equal(r.read().board.seats.find(s=>s.seatId===v.self.seatId).health,'Healthy');
 for(const status of ['WRONG','TREATED','NO_EFFECT','DISCARDED']){const next=structuredClone(v);next.viewRevision=++v.viewRevision;next.abilities.panelRequest.status=status;r.push(next);assert.equal(r.read().privateArea.panelRequest.status,status);}
 r.controller.openPanel('windows');assert.equal(JSON.stringify(r.read()).includes('patient-original'),false);r.controller.setVisible(false);assert.equal(r.read().privateArea,null);r.controller.dispose();
});
test('NO_INJECTION is a new-tuple panel rejection and preserves the unused attempt',async()=>{
 const v=planetView();v.offers=[{type:'PANEL_CODE',targetSeatIds:ids,slotIds:[],windowIds:[]}];const r=rig(v);r.transport.command=async request=>({serverTimeMs:1000,receipt:{...Object.fromEntries(['protocolVersion','matchId','phaseId','commandId'].map(k=>[k,request[k]])),status:'rejected',code:'NO_INJECTION'}});
 await r.controller.start();r.controller.begin('PANEL_CODE');r.controller.choose('seat-2');await r.controller.confirm();assert.equal(r.read().recovery,null);r.push(structuredClone(v));assert.match(r.read().message,/attempt was not spent/);r.controller.openPanel('hospital');assert.equal(r.read().privateArea.panelAttemptSpent,false);assert.equal(r.read().privateArea.panelRequest,null);assert.equal(r.saved(),null);r.controller.dismiss();assert.equal(r.read().message,null);r.controller.dispose();
});
test('a new rejection code on a historical match stays uncertain rather than claiming panel evidence',async()=>{
 const v=historical(PLANET_SYNC_PINS);v.offers=[{type:'PANEL_CODE',targetSeatIds:ids,slotIds:[],windowIds:[]}];const r=rig(v);r.transport.command=async request=>({serverTimeMs:1000,receipt:{...Object.fromEntries(['protocolVersion','matchId','phaseId','commandId'].map(k=>[k,request[k]])),status:'rejected',code:'NO_INJECTION'}});
 await r.controller.start();r.controller.begin('PANEL_CODE');r.controller.choose('seat-2');await r.controller.confirm();assert.equal(r.read().recovery.status,'unknown');assert.ok(r.saved());assert.doesNotMatch(r.read().message,/attempt was not spent/);r.controller.dispose();
});
