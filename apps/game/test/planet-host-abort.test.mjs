import assert from 'node:assert/strict';
import test from 'node:test';
import {createPlanetSession} from '../dist/index.js';
import {sessionScenario} from '../dev/planet/scenarios.mjs';
import {rig} from './planet-support.mjs';

const memory=()=>{let value=null;return{load:()=>value,save:next=>{value=next;},clear:()=>{value=null;}};};
function setup(){
 const base=rig(),stores={resume:memory(),requests:memory(),rolePrivacy:memory()},requests=[];
 let snapshot={...sessionScenario('display',{now:1000,count:9,tuple:'blackout'}),isHost:true,admission:null};
 const answer=result=>({ok:true,serverTimeMs:1000,result});
 const abort=()=>{snapshot={...snapshot,status:'aborted',setup:null,privateRole:null,playerView:null,publicView:null};};
 const connection={mode:'synthetic',currentUid:()=> 'test-host',signIn:async()=> 'test-host',async request(request){requests.push(structuredClone(request));return answer(request.operation==='read'?structuredClone(snapshot):{matchId:snapshot.matchId});}};
 return{connection,stores,ports:base.ports,requests,answer,abort,get matchId(){return snapshot.matchId;}};
}
test('a committed abort with a lost response survives reload and retries only its original request',async()=>{
 const h=setup(),read=h.connection.request,attempts=[];let commits=0,session=createPlanetSession(h.connection,h.ports,h.stores);
 h.connection.request=async request=>{if(request.operation!=='abort')return read(request);attempts.push(structuredClone(request));if(attempts.length===1){commits++;h.abort();return null;}return h.answer({matchId:h.matchId});};
 try{
  await session.start(h.matchId);await session.operate({operation:'abort',matchId:h.matchId});assert.equal(session.getModel().uncertain,true);assert.equal(session.getModel().status,'running','a lost response must not imply a terminal result');
  await session.refresh();assert.equal(session.getModel().status,'aborted');assert.equal(session.getModel().canReturnToLobby,false);const pending=h.stores.requests.load();assert.ok(pending);
  session.dispose();session=createPlanetSession(h.connection,h.ports,h.stores);await session.start();assert.equal(session.getModel().uncertain,true);assert.equal(h.stores.requests.load(),pending);
  await session.operate({operation:'abort',matchId:h.matchId});assert.equal(attempts.length,1,'an uncertain abort cannot be replaced');await session.retry();assert.deepEqual(attempts,[attempts[0],attempts[0]]);assert.equal(commits,1);assert.equal(session.getModel().status,'aborted');assert.equal(session.getModel().uncertain,false);assert.equal(h.stores.requests.load(),null);assert.equal(session.getModel().canReturnToLobby,true);
 }finally{session.dispose();}
});
test('a pending abort sends once and waits for the authoritative terminal readback',async()=>{
 const h=setup(),read=h.connection.request,attempts=[],session=createPlanetSession(h.connection,h.ports,h.stores);let release;
 h.connection.request=async request=>{if(request.operation!=='abort')return read(request);attempts.push(structuredClone(request));return new Promise(resolve=>{release=()=>{h.abort();resolve(h.answer({matchId:h.matchId}));};});};
 try{
  await session.start(h.matchId);const sending=session.operate({operation:'abort',matchId:h.matchId});assert.equal(session.getModel().busy,true);assert.equal(session.getModel().status,'running');await session.operate({operation:'abort',matchId:h.matchId});assert.equal(attempts.length,1);assert.equal(session.getModel().canReturnToLobby,false);
  release();await sending;assert.equal(session.getModel().status,'aborted');assert.equal(session.getModel().busy,false);assert.equal(session.getModel().canReturnToLobby,true);assert.equal(h.requests.some(r=>r.operation==='command'),false);
 }finally{release?.();session.dispose();}
});
