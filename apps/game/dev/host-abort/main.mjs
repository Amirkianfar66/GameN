// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import {mountPlanetApp} from '../../hosted/planet/app.mjs';
import {sessionScenario} from '../planet/scenarios.mjs';

// Excluded synthetic service around the unchanged native app/session/controller/renderer.
// Only public synthetic request identifiers persist for the explicit reload cases.
const query=new URL(location.href).searchParams,surface=query.get('surface')??'display',mode=query.get('mode')??'success',count=Number(query.get('count')??9),key='host-abort-regression-service';
const initial=()=>({...sessionScenario(surface==='player'?'hacker':'display',{now:Date.now(),count,tuple:'blackout'}),isHost:true,admission:null});
let value=initial(),service=JSON.parse(sessionStorage.getItem(key)??'null')??{aborted:false,abortRequests:[],commits:0,commandRequests:[],receiptRequests:[],receipt:null};
function persist(){sessionStorage.setItem(key,JSON.stringify(service));}
function publishAbort(){service.aborted=true;persist();value={...value,status:'aborted',setup:null,privateRole:null,playerView:null,publicView:null};}
if(service.aborted)publishAbort();
const answer=result=>({ok:true,serverTimeMs:Date.now(),result});
const connection={mode:'synthetic',currentUid:()=> 'synthetic-host',signIn:async()=> 'synthetic-host',async request(request){
 if(request.operation==='read')return answer(structuredClone(value));
 if(request.operation==='abort'){
  service.abortRequests.push(structuredClone(request));if(!service.aborted){service.commits++;publishAbort();}persist();
  if(mode==='lost-abort'&&service.abortRequests.length===1)return null;
  return answer({matchId:value.matchId});
 }
 if(request.operation==='command'){
  service.commandRequests.push(structuredClone(request.request));service.receipt={...Object.fromEntries(['protocolVersion','matchId','phaseId','commandId'].map(k=>[k,request.request[k]])),status:'accepted',code:'REGISTERED'};persist();
  return mode==='lost-command'?null:answer({receipt:service.receipt});
 }
 if(request.operation==='receipt'){service.receiptRequests.push(structuredClone(request));persist();return answer({receipt:service.receipt});}
 return answer({matchId:value.matchId});
}};
const app=await mountPlanetApp(document.getElementById('planet-root'),{connection,matchId:value.matchId,allowSynthetic:true});
window.hostAbortHarness={app,ready:app.artReady,async externalAbort(){publishAbort();await app.session.refresh();},summary(){return {
 abortAttempts:service.abortRequests.length,abortCommits:service.commits,originalAbortRetried:service.abortRequests.length>1&&service.abortRequests.every(r=>JSON.stringify(r)===JSON.stringify(service.abortRequests[0])),
 commandRequests:service.commandRequests.length,receiptRequests:service.receiptRequests.length,originalCommandReceipt:service.receiptRequests.length>0&&service.receiptRequests.every(r=>r.commandId===service.commandRequests[0]?.commandId),
 status:app.session.getModel().status,uncertain:app.session.getModel().uncertain,canReturnToLobby:app.session.getModel().canReturnToLobby};}};
