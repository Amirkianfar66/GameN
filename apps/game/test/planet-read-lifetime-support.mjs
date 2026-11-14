import {PLANET_FOOD_TASK_PINS,PlanetSessionSnapshotSchema} from '@mothership/contracts';
import {createPlanetSession} from '../dist/index.js';
import {postHostedPlanetRequest} from '../dist/browser/planet-request.js';
import {planetView} from './planet-support.mjs';
import {playerView,publicView} from '../../../tests/bootstrap/support/food-task-contract-fixture.mjs';

export const flush=async()=>{for(let n=0;n<80;n++)await Promise.resolve();};
export const memory=()=>{let value=null;return {load:()=>value,save:next=>{value=next;},clear:()=>{value=null;}};};
export function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
export function virtualTime(){
 let now=6000,serial=0;const timers=new Map();
 const scheduler={setTimeout(fn,ms){const id=++serial;timers.set(id,{at:now+ms,fn});return id;},clearTimeout:id=>timers.delete(id)};
 return {scheduler,clock:{now:()=>now},get now(){return now;},get timerCount(){return timers.size;},jump(ms){now+=ms;},
  async advance(ms){const end=now+ms;for(let n=0;n<2000;n++){const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();await flush();if(n===1999)throw Error('Virtual timer loop');}now=end;await flush();}};
}
export const config={projectId:'mothership-test-project',apiKey:'A'.repeat(30),appId:'1:1234567890:web:abc123',messagingSenderId:'1234567890',authDomain:'mothership-test-project.firebaseapp.com',pageOrigin:'https://mothership-test-project.web.app',recaptchaEnterpriseSiteKey:'B'.repeat(30)};
export function foodSnapshot(host=false){
 const versions={...PLANET_FOOD_TASK_PINS,assetManifestVersion:'design-0.9.0'},p=planetView(),own=playerView(9),pub=publicView(9);
 for(const f of [own,pub]){f.versions=versions;f.round=1;f.stock.publicationRound=0;if(f.participantTask){f.participantTask.round=1;f.participantTask.ownReturnPlacement={location:'Room A',slotId:'A1'};}}
 Object.assign(p,{versions,matchId:own.matchId,round:1,self:{...p.self,seatId:'seat-1'},phase:{id:own.phaseId,kind:'FOOD_SUPPLY',startedAt:1000,endsAt:33500},activeSeatId:null,offers:[],navigation:{lastMovedRound:0,arrivedAt:null}});
 Object.assign(p.board,{finalizedRound:0,checkpoint:'INITIAL'});
 const shared=structuredClone(p);for(const key of ['self','abilities','knowledge','offers','privateNavigation','hackFeedback','blackoutTargeting','promises','promiseQuota','ownBallot','windows'])delete shared[key];shared.board.kind='FINALIZED';
 return PlanetSessionSnapshotSchema.parse({matchId:p.matchId,roomCode:'PLANET',versions,status:'running',playerCount:9,isHost:host,selfSeatId:host?null:'seat-1',admission:null,
  members:p.board.seats.map((s,i)=>({seatId:s.seatId,displayName:`Crew ${i+1}`,characterId:`c${i+1}`,controller:'human',ready:true})),pendingAdmissions:[],setup:null,privateRole:null,publicView:shared,playerView:host?null:p,foodPublicView:pub,foodPlayerView:host?null:own});
}

/** Controlled browser-fetch contract: abort settles headers/body before a new READ can start. */
export function hostedRig({host=false}={}){
 const time=virtualTime(),requests=[],fetches=[],plans=[],gates=[],stores={resume:memory(),requests:memory()},ports={clock:time.clock,scheduler:time.scheduler,ids:{next:()=>`request-${++serial}`},unresolved:memory()};
 let serial=0,activeReads=0,maxReads=0,value=foodSnapshot(host),uid='read-lifetime-user',mutationHandler=null;
 function gate(){const d=deferred();gates.push(d);return d;}
 function abortable(d,signal,delay=0){
  if(signal?.aborted)return Promise.reject(signal.reason);
  return new Promise((resolve,reject)=>{
   const abort=()=>{if(delay)time.scheduler.setTimeout(()=>reject(signal.reason),delay);else reject(signal.reason);};signal?.addEventListener('abort',abort,{once:true});
   d.promise.then(resolve,reject).finally(()=>signal?.removeEventListener('abort',abort));
  });
 }
 function answer(q,at){
  if(q.operation==='read'){const out=structuredClone(value);for(const f of [out.foodPublicView,out.foodPlayerView])if(f)f.serverNowMs=at;return {ok:true,serverTimeMs:at,result:out};}
  if(q.operation==='foodCommand'){
   const {command,...context}=q.request;
   return {ok:true,serverTimeMs:at,result:{receipt:{...context,status:'accepted',receivedAt:at,result:{kind:'INPUT',taskId:command.taskId,controlSessionId:command.controlSessionId,effect:command.input.edge==='UP'?'GESTURE_CLOSED':'APPLIED',gestureSequence:command.input.gestureSequence,crateId:command.input.crateId}}}};
  }
  return {ok:true,serverTimeMs:at,result:{matchId:value.matchId}};
 }
 const connection={mode:'authenticated',currentUid:()=>uid,signIn:async()=>uid,request(q){
  requests.push(structuredClone(q));const plan=q.operation==='read'?(plans.shift()??{stage:'success'}):{stage:'success'};
  const at=time.now,response=answer(q,at),acquisition=plan.gate;
  return postHostedPlanetRequest(config,{
   getIdToken:()=>plan.stage==='idToken'?acquisition.promise:Promise.resolve('test-id-token'),
   getAppCheckToken:()=>plan.stage==='appCheck'?acquisition.promise:Promise.resolve('test-app-check'),
   async fetch(url,init){
    const row={request:structuredClone(q),signal:init.signal,at:time.now};fetches.push(row);
    if(q.operation!=='read'&&mutationHandler)return mutationHandler(q,init,response);
    let ended=false;const end=()=>{if(!ended&&q.operation==='read'){ended=true;activeReads--;}};
    if(q.operation==='read'){activeReads++;maxReads=Math.max(maxReads,activeReads);}
    try{
     if(plan.stage==='error')throw Error('Transient transport failure');
     if(plan.stage==='headers')await abortable(plan.gate,init.signal,plan.abortDelay);
     return {text:async()=>{try{if(plan.stage==='body')await abortable(plan.gate,init.signal,plan.abortDelay);return JSON.stringify(response);}finally{end();}}};
    }catch(error){end();throw error;}
   },
  },q,{scheduler:time.scheduler,clock:time.clock});
 }};
 const session=createPlanetSession(connection,ports,stores);
 return {time,ports,stores,session,connection,requests,fetches,gate,get value(){return value;},set value(next){value=next;},get maxReads(){return maxReads;},get activeReads(){return activeReads;},setUid:next=>{uid=next;},
  plan(stage,abortDelay=0){const d=stage==='success'||stage==='error'?null:gate();plans.push({stage,gate:d,abortDelay});return d;},
  mutation(handler){mutationHandler=handler;},
  dispose(){session.dispose();for(const d of gates)d.reject(Error('Fixture disposed'));},
 };
}
