import assert from 'node:assert/strict';
import test from 'node:test';
import {createPlanetSession} from '../dist/index.js';
import {readPlanetBlackoutFraming,readPlanetBlackoutFrameInput} from '../dist/planet/blackout-framing.js';
import {sessionScenario} from '../dev/planet/scenarios.mjs';
import {phoneLayouts,createBlackoutGeometry} from '../hosted/planet/phone-layout.mjs';
import {rig} from './planet-support.mjs';

const synced={status:'synced',serverNowMs:10000,uncertaintyMs:0};
const fixture=(count=9)=>sessionScenario('blackout',{now:10000,count,tuple:'blackout'});
function contextOf(s){const p=s.playerView;return {matchId:s.matchId,round:p.round,playerCount:s.playerCount,versions:s.versions,phaseId:p.phase.id,windowId:p.blackout.windowId,startedAt:p.phase.startedAt,previewEndsAt:p.blackout.previewEndsAt,endsAt:p.blackout.endsAt};}

test('cold entry reads only same-response public positions, independent of audience revisions',()=>{
 for(const count of [7,8,9]){
  const s=fixture(count);s.playerView.viewRevision=37;s.publicView.viewRevision=4;
  Object.assign(s.playerView.board.seats[0],{location:'Jail',slotId:'J1',jailed:true});
  const positions=readPlanetBlackoutFraming(s,contextOf(s),synced);
  assert.deepEqual(positions,s.publicView.board.seats.map(({location,slotId,health})=>({location,slotId,eliminated:health==='Eliminated'})));
  assert.ok(positions.every(p=>Object.keys(p).sort().join(',')==='eliminated,location,slotId'));
  positions[0].location='Hospital';assert.equal(s.publicView.board.seats[0].location,'Room A','No reference to the original snapshot escapes');
 }
});

test('cold framing rejects mismatched transaction, window, checkpoint and canonical roster inputs',()=>{
 const mutations=[
  s=>{s.matchId='another-match';},s=>{s.selfSeatId='seat-1';},s=>{s.status='finished';},
  s=>{s.publicView=null;},s=>{s.playerView=null;},s=>{s.publicView.matchId='another-match';},
  s=>{s.publicView.round--;},s=>{s.publicView.playerCount=7;},s=>{s.publicView.versions.assetManifestVersion='design-0.7.0';},
  s=>{s.publicView.phase.kind='BLACKHOLE_PRESENTATION';},s=>{s.publicView.phase.id='another-phase';},
  s=>{s.publicView.phase.startedAt++;},s=>{s.playerView.phase.endsAt++;},
  s=>{s.publicView.blackout.windowId='another-window';},s=>{s.publicView.blackout.previewEndsAt++;},s=>{s.publicView.blackout.endsAt++;},
  s=>{s.publicView.board.kind='PLAYER_CURRENT';},s=>{s.publicView.board.checkpoint='AFTER_BLACKOUT';},s=>{s.publicView.board.finalizedRound--;},
  s=>{s.publicView.board.seats[1].slotId='A1';},s=>{s.publicView.board.seats[0].slotId='J1';},s=>{s.publicView.board.seats.pop();},
 ];
 for(const mutate of mutations){const s=fixture(),context=contextOf(s);mutate(s);assert.equal(readPlanetBlackoutFraming(s,context,synced),null,mutate.toString());}
 const s=fixture(),context=contextOf(s);
 for(const field of ['matchId','round','playerCount','phaseId','windowId','startedAt','previewEndsAt','endsAt']){
  const bad={...context,[field]:typeof context[field]==='number'?context[field]+1:'mismatched'};assert.equal(readPlanetBlackoutFraming(s,bad,synced),null,field);
 }
 const badVersion={...context,versions:{...context.versions,engineVersion:'different'}};assert.equal(readPlanetBlackoutFraming(s,badVersion,synced),null);
});

test('cold framing requires the exact current tuple and the full synchronized unexpired 5/15-second window',()=>{
 for(const tuple of ['current','phone','original','sync']){const s=sessionScenario('blackout',{now:10000,tuple});assert.equal(readPlanetBlackoutFraming(s,contextOf(s),synced),null,tuple);}
 const s=fixture(),context=contextOf(s);
 for(const time of [{status:'unsynced'},{...synced,serverNowMs:NaN},{...synced,uncertaintyMs:Infinity},{...synced,uncertaintyMs:-1},{...synced,serverNowMs:context.startedAt-1},{...synced,serverNowMs:context.endsAt},{...synced,serverNowMs:context.endsAt-1,uncertaintyMs:1}])assert.equal(readPlanetBlackoutFraming(s,context,time),null,JSON.stringify(time));
 assert.ok(readPlanetBlackoutFraming(s,context,{...synced,serverNowMs:context.previewEndsAt}));
 assert.equal(readPlanetBlackoutFraming(s,null,synced),null);
 for(const duration of [4999,5001]){const changed=fixture();changed.playerView.blackout.previewEndsAt=changed.publicView.blackout.previewEndsAt=context.startedAt+duration;assert.equal(readPlanetBlackoutFraming(changed,contextOf(changed),synced),null);}
});

function memory(){let value=null;return {load:()=>value,save:next=>{value=next;},clear:()=>{value=null;}};}
function sessionRig(){
 const base=rig(undefined,{now:10000}),stores={resume:memory(),requests:memory()};let value=fixture(),uid='framing-user',lost=false;
 const connection={mode:'synthetic',currentUid:()=>uid,signIn:async()=>uid,async request(){return lost?null:{ok:true,serverTimeMs:base.ports.clock.now(),result:structuredClone(value)};}};
 const session=createPlanetSession(connection,base.ports,stores);
 return {session,base,context:contextOf(value),setUid(v){uid=v;},setLost(v){lost=v;},get value(){return value;},set value(v){value=v;}};
}

test('session bridge requires fresh authorization and suppresses callbacks while hidden, stale, changed-user or expired',async()=>{
 const r=sessionRig();let calls=0;const prepare=input=>{calls++;return phoneLayouts({width:390,height:844,top:80,nav:72},9,input.kind==='lit'?input.positions:[],{frameAll:input.kind==='all'});};
 assert.equal(r.session.withBlackoutFraming(r.context,prepare),null);await r.session.start('planet-local');
 const geometry=r.session.withBlackoutFraming(r.context,prepare);assert.ok(geometry);assert.equal(calls,1);
 assert.ok(!/seatId|displayName|characterId|health|occupied/.test(JSON.stringify(geometry)));
 r.setUid('another-user');assert.equal(r.session.withBlackoutFraming(r.context,prepare),null);assert.equal(calls,1);r.setUid('framing-user');
 r.session.setVisible(false);assert.equal(r.session.withBlackoutFraming(r.context,prepare),null);assert.equal(calls,1);
 r.session.setVisible(true);await r.session.refresh();assert.ok(r.session.withBlackoutFraming(r.context,prepare));
 r.setLost(true);await r.session.refresh();const before=calls;assert.equal(r.session.withBlackoutFraming(r.context,prepare),null);assert.equal(calls,before);
 r.setLost(false);await r.session.refresh();await r.base.advance(10000);assert.equal(r.session.withBlackoutFraming(r.context,prepare),null);r.session.dispose();
});

test('cold reconstruction retains every neutral slot and freezes through later dark snapshots and reconnect',async()=>{
 const r=sessionRig();await r.session.start('planet-local');const cache=createBlackoutGeometry(),prepare=()=>r.session.withBlackoutFraming(r.context,input=>phoneLayouts({width:390,height:844,top:80,nav:72},9,input.kind==='lit'?input.positions:[],{frameAll:input.kind==='all'}));
 const geometry=cache.read('window',prepare);assert.ok(geometry);for(const [room,presses]of Object.entries(geometry.roomPresses))assert.deepEqual(presses.map(p=>p.id),phoneLayouts({width:390,height:844,top:80,nav:72},9).roomPresses[room].map(p=>p.id));
 r.value.publicView.viewRevision++;Object.assign(r.value.publicView.board.seats[0],{location:'Jail',slotId:'J1',jailed:true});await r.session.refresh();
 assert.strictEqual(cache.read('window',prepare),geometry,'A later dark packet cannot move the saved camera');
 r.setLost(true);await r.session.refresh();assert.strictEqual(cache.read('window',prepare),geometry);r.setLost(false);await r.session.refresh();assert.strictEqual(cache.read('window',prepare),geometry);
 const bad=structuredClone(r.context);bad.windowId='not-this-window';assert.equal(r.session.withBlackoutFraming(bad,()=>{throw Error('wrong window');}),null);
 r.session.dispose();assert.equal(r.session.withBlackoutFraming(r.context,()=>{throw Error('disposed');}),null);
});

test('Designer frameAll applies only to a trusted current window with no recoverable public checkpoint',()=>{
 for(const tuple of ['current','phone','original','sync','blackout']){
  const s=sessionScenario('blackout',{now:10000,tuple}),context=contextOf(s);s.publicView=null;
  assert.deepEqual(readPlanetBlackoutFrameInput(s,context,synced),{kind:'all'},tuple);
  assert.equal(readPlanetBlackoutFrameInput(s,context,{...synced,serverNowMs:context.endsAt}),null);
  const wrong={...context,windowId:'wrong'};assert.equal(readPlanetBlackoutFrameInput(s,wrong,synced),null);
 }
 const s=fixture(),context=contextOf(s);s.publicView.phase.id='wrong-public-phase';assert.deepEqual(readPlanetBlackoutFrameInput(s,context,synced),{kind:'all'});
 const malformed=fixture();malformed.publicView.board.checkpoint='AFTER_BLACKOUT';assert.equal(readPlanetBlackoutFrameInput(malformed,context,synced),null,'A structurally invalid packet does not regain authority through fallback');
 const bad=fixture();bad.playerView.phase.id='wrong';assert.equal(readPlanetBlackoutFrameInput(bad,context,synced),null);
});
test('authorization loss never enters the canonical fallback and retires ownership of cached bounds',async()=>{
 const r=sessionRig();await r.session.start('planet-local');assert.equal(r.session.ownsBlackoutFraming(r.context),true);
 r.setUid('revoked');assert.equal(r.session.ownsBlackoutFraming(r.context),false);assert.equal(r.session.withBlackoutFraming(r.context,()=>{throw Error('unauthorized fallback');}),null);
 r.setUid('framing-user');r.value.publicView=null;await r.session.refresh();assert.deepEqual(r.session.withBlackoutFraming(r.context,x=>x),{kind:'all'});r.session.dispose();
});
