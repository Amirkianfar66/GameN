import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createPlanetPregame,publicFilmRoster,PREGAME_ROLE_IDS} from '../dist/index.js';

function memory(initial=null){let value=initial;return {load:()=>value,save:next=>{value=next},clear:()=>{value=null},get value(){return value}};}
const visibility={visible:true,focused:true,uid:'synthetic-owner'};
function state(count=9){return {mode:'synthetic',connection:'live',message:null,matchId:'pregame-synthetic',roomCode:'ABCDEF',status:'reading',versions:{assetManifestVersion:'design-0.8.0'},isHost:false,selfSeatId:'seat-4',playerCount:count,members:Array.from({length:count},(_,i)=>({seatId:`seat-${i+1}`,characterId:`c${i+1}`,displayName:`Player ${i+1}`,controller:'human',ready:false})),pendingAdmissions:[],setup:{id:'reading-synthetic',endsAt:31000},setupFlowVersion:2,setupClock:{status:'synced',serverNowMs:1000,uncertaintyMs:0},remainingMs:30000,canChoose:false,canReady:false,canReturnToLobby:false,busy:false,uncertain:false,ownRole:{role:'Hacker'},recoveryCode:null,pendingAdmission:null};}
function rig(options={},store=memory()){let now=1000;const controller=createPlanetPregame({now:()=>now},store,options);return {controller,store,setNow:t=>{now=t},advance:ms=>{now+=ms},update:(s,v=visibility)=>controller.update(s,v)};}
function boarding(count=9){return {...state(count),status:'boarding',ownRole:null,setup:{id:'boarding-synthetic',startedAt:1000,endsAt:11000},remainingMs:10000};}

test('entry waits for resolved idle context, lasts exactly 2000ms, and never replays on navigation',()=>{
 const r=rig(),idle={...state(),connection:'connecting',status:null,matchId:null,versions:null,selfSeatId:null,members:[],setup:null,ownRole:null};
 r.update(idle);assert.equal(r.controller.sample(),null);r.update({...idle,connection:'live'});assert.equal(r.controller.sample().kind,'brand');
 r.advance(1999);assert.equal(r.controller.sample().t,1999);r.advance(1);assert.equal(r.controller.sample(),null);r.update({...idle,connection:'live'});assert.equal(r.controller.sample(),null);
});
test('active, recovery and uncertain entry contexts bypass the intro',()=>{
 for(const scenario of [{options:{skipEntry:true},value:{...state(),matchId:null,status:null,ownRole:null}},{value:{...state(),status:'running',ownRole:null}},{value:{...state(),uncertain:true}},{value:{...state(),pendingAdmission:{kind:'player',roomCode:'ABCDEF',status:'pending'}}}]){
  const r=rig(scenario.options);r.update(scenario.value);assert.notEqual(r.controller.sample()?.kind,'brand');
 }
});
test('all nine exact roles bind the authorized character and seat without fallback',()=>{
 for(const [role,slug]of Object.entries(PREGAME_ROLE_IDS)){const r=rig();r.update({...state(),ownRole:{role}});assert.deepEqual({...r.controller.sample(),key:null},{kind:'role',key:null,t:0,durationMs:10000,role:slug,character:'c4',seat:4});}
 for(const change of [{ownRole:null},{ownRole:{role:'doctor'}},{ownRole:{role:['Doctor']}},{selfSeatId:'seat-10'},{members:state().members.map(m=>m.seatId==='seat-4'?{...m,characterId:null}:m)}]){const r=rig();r.update({...state(),...change});assert.equal(r.controller.sample(),null);}
});
test('role ends at 10000ms, leaves Ready untouched, and stores only neutral seen identifiers',()=>{
 const r=rig(),s=state();r.update(s);r.advance(9999);assert.equal(r.controller.sample().t,9999);r.advance(1);assert.equal(r.controller.sample(),null);
 r.update(s);assert.equal(r.controller.sample(),null);assert.equal(s.members[3].ready,false);assert.equal(s.canReady,false);
 assert.ok(r.store.value.includes('reading-synthetic'));for(const secret of ['Hacker','hacker','c4','knowledge','caption'])assert.ok(!r.store.value.includes(secret));
});
test('Skip, refresh, recovery and reconnect cannot replay a role or confirm Ready',()=>{
 const r=rig(),s=state();r.update(s);r.controller.skip();assert.equal(r.controller.sample(),null);r.update({...s,connection:'stale'});r.update(s);assert.equal(r.controller.sample(),null);
 const reloaded=rig({},r.store);reloaded.update(s);assert.equal(reloaded.controller.sample(),null);
 const recovered=rig({skipRoleOnEntry:true});recovered.update(s);assert.equal(recovered.controller.sample(),null);assert.equal(s.members[3].ready,false);
 const manualRecovery=rig();manualRecovery.controller.suppressRolePlayback();manualRecovery.update(s);assert.equal(manualRecovery.controller.sample(),null);
});
test('late reveal, unavailable storage and historical artwork keep the authorized role card',()=>{
 for(const remainingMs of [0,9999]){const r=rig();r.update({...state(),remainingMs});assert.equal(r.controller.sample(),null);}
 const failed=rig({}, {load(){throw new Error()},save(){throw new Error()},clear(){}});failed.update(state());assert.equal(failed.controller.sample(),null);
 const corrupt=rig({},memory('not-json'));corrupt.update(state());assert.equal(corrupt.controller.sample(),null);
 const historical=rig();historical.update({...state(),versions:{assetManifestVersion:'design-0.7.0'}});assert.equal(historical.controller.sample(),null);
});
test('private films conceal immediately on blur, background, stale state, identity/role/character change or Ready',()=>{
 const variants=[{v:{...visibility,focused:false}},{v:{...visibility,visible:false}},{v:{...visibility,uid:null}},{v:{...visibility,uid:'different-owner'}},{s:{connection:'stale'}},{s:{ownRole:null}},{s:{ownRole:{role:'Doctor'}}},{s:{status:'boarding'}},{s:{members:state().members.map(m=>m.seatId==='seat-4'?{...m,ready:true}:m)}},{s:{members:state().members.map(m=>m.seatId==='seat-4'?{...m,characterId:'c9'}:m)}}];
 for(const change of variants){const r=rig();r.update(state());assert.equal(r.controller.sample().kind,'role');r.update({...state(),...change.s},change.v??visibility);assert.equal(r.controller.sample(),null);r.update(state());assert.equal(r.controller.sample(),null);}
});
test('public 7/8/9 roster extraction is sorted, complete, unique and ignores private extra fields',()=>{
 for(const count of [7,8,9]){const s=boarding(count);s.members.reverse();const roster=publicFilmRoster(s);assert.equal(roster.length,count);assert.deepEqual(roster.map(m=>m.seat),Array.from({length:count},(_,i)=>i+1));assert.ok(Object.isFrozen(roster));assert.deepEqual(publicFilmRoster({...s,members:s.members.map(m=>({...m,role:'Doctor',faction:'Blue',code:[1,2,3,4]}))}),roster);for(const m of roster)assert.deepEqual(Object.keys(m).sort(),['character','seat']);}
 for(const members of [state().members.slice(1),state().members.map(m=>({...m,characterId:'c1'})),state().members.map(m=>({...m,seatId:'seat-1'})),state().members.map(m=>({...m,characterId:null}))])assert.equal(publicFilmRoster({...state(),members}),null);
});
test('boarding seeks the server interval on recovery for 7/8/9 and expiry never starts gameplay',()=>{
 for(const count of [7,8,9]){const r=rig(),s=boarding(count);r.update({...s,setupClock:{status:'synced',serverNowMs:6000,uncertaintyMs:0}});assert.equal(r.controller.sample().t,5000);assert.equal(r.controller.sample().roster.length,count);r.advance(4999);assert.equal(r.controller.sample().t,9999);r.advance(1);assert.equal(r.controller.sample(),null);r.update({...s,setupClock:{status:'synced',serverNowMs:12000,uncertaintyMs:0},remainingMs:0});assert.equal(r.controller.sample(),null);assert.equal(s.status,'boarding');assert.equal(s.ownRole,null);}
});
test('boarding requires explicit flow2, trusted clock, valid interval, supported art and admitted public roster',()=>{
 const s=boarding();for(const change of [{setupFlowVersion:null},{setup:null},{setup:{id:'x',startedAt:1000,endsAt:10999}},{setupClock:{status:'unsynced'}},{setupClock:{status:'synced',serverNowMs:10999,uncertaintyMs:2}},{setupClock:{status:'synced',serverNowMs:999,uncertaintyMs:0}},{versions:{assetManifestVersion:'design-0.7.0'}},{members:[]},{connection:'stale'}]){const r=rig();r.update({...s,...change});assert.equal(r.controller.sample(),null);}
});
test('boarding clock correction does not rewind or restart a stable stage',()=>{
 const r=rig(),s=boarding();r.update({...s,setupClock:{status:'synced',serverNowMs:6000,uncertaintyMs:0}});assert.equal(r.controller.sample().t,5000);r.update({...s,setupClock:{status:'synced',serverNowMs:5500,uncertaintyMs:0}});assert.equal(r.controller.sample().t,5000);r.update({...s,setupClock:{status:'synced',serverNowMs:7000,uncertaintyMs:0}});assert.equal(r.controller.sample().t,6000);
});
test('boarding Skip is local even when persistence fails, and terminal/running state drops old visuals',()=>{
 const store={load:()=>null,save(){throw new Error()},clear(){}},r=rig({},store),s=boarding();r.update(s);assert.equal(r.controller.sample().kind,'boarding');r.controller.skip();assert.equal(r.controller.sample(),null);r.update(s);assert.equal(r.controller.sample(),null);assert.equal(s.status,'boarding');
 for(const status of ['running','finished','aborted']){const n=rig();n.update(s);n.update({...s,status});assert.equal(n.controller.sample(),null);}
});
test('disposal drops all presentation state and cannot be restarted',()=>{
 const r=rig();r.update(state());r.controller.dispose();assert.equal(r.controller.sample(),null);r.update(state());assert.equal(r.controller.sample(),null);
});

function timed(now){return {...state(),setupFlowVersion:3,setup:{id:'timed-reading',startedAt:1000,roleFilmStartsAt:21000,endsAt:31000},setupClock:{status:'synced',serverNowMs:now,uncertaintyMs:0},remainingMs:Math.max(0,31000-now)};}
test('flow3 keeps card for20s and seeks its final10s without advancing any authority',()=>{
 const r=rig({skipRoleOnEntry:true});r.update(timed(1000));assert.equal(r.controller.sample(),null);r.advance(19999);assert.equal(r.controller.sample(),null);r.advance(1);assert.equal(r.controller.sample().t,0);r.advance(5000);assert.equal(r.controller.sample().t,5000);r.advance(5000);assert.equal(r.controller.sample(),null);
 assert.equal(timed(31000).members[3].ready,false);assert.equal(r.store.value,null);
});
test('timed late load, background/recovery and clock correction seek without restarting',()=>{
 const r=rig({skipRoleOnEntry:true});r.update(timed(26000));assert.equal(r.controller.sample().t,5000);r.update(timed(26000),{...visibility,focused:false});assert.equal(r.controller.sample(),null);r.update(timed(28000));assert.equal(r.controller.sample().t,7000);r.update(timed(27000));assert.equal(r.controller.sample().t,7000);
 const reloaded=rig({},r.store);reloaded.update(timed(29000));assert.equal(reloaded.controller.sample().t,8000);
 for(const value of [{...timed(26000),ownRole:null},{...timed(26000),connection:'stale'},{...timed(26000),setupClock:{status:'unsynced'}},{...timed(26000),setup:{id:'bad',startedAt:1000,roleFilmStartsAt:22000,endsAt:31000}}]){const x=rig();x.update(value);assert.equal(x.controller.sample(),null);}
});
test('timed Skip persists only neutral identifiers; no new match inherits that Skip',()=>{
 const r=rig();r.update(timed(26000));r.controller.skip();assert.equal(r.controller.sample(),null);r.update(timed(27000));assert.equal(r.controller.sample(),null);const reloaded=rig({},r.store);reloaded.update(timed(28000));assert.equal(reloaded.controller.sample(),null);
 for(const secret of ['Hacker','hacker','c4','knowledge'])assert.ok(!r.store.value.includes(secret));
 r.update({...timed(28000),matchId:'different-match'});assert.equal(r.controller.sample().t,7000);
});
test('flow3 boarding is the independent full10s interval and timed expiry never creates it',()=>{
 const r=rig();r.update(timed(31000));assert.equal(r.controller.sample(),null);r.update({...boarding(),setupFlowVersion:3});assert.equal(r.controller.sample().kind,'boarding');r.advance(10000);assert.equal(r.controller.sample(),null);
});
