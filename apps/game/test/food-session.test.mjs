import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PLANET_FOOD_TASK_PINS,PlanetSessionSnapshotSchema} from '@mothership/contracts';
import {createPlanetSession,createPlanetController,createFoodTaskController,readPlanetFood} from '../dist/index.js';
import {planetHasFood,planetSupportsAssets,planetHasPrivateOffers,planetHasPrivateFeedback,planetRoundOrderText} from '@mothership/presentation';
import {planetView} from './planet-support.mjs';
import {sessionScenario} from '../dev/planet/scenarios.mjs';
import {playerView,publicView} from '../../../tests/bootstrap/support/food-task-contract-fixture.mjs';

const copy=v=>structuredClone(v),flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
const memory=()=>{let value=null;return {load:()=>value,save:v=>{value=v;},clear:()=>{value=null;}};};
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
function snapshot(){
 const versions={...PLANET_FOOD_TASK_PINS,assetManifestVersion:'design-0.9.0'},p=planetView(),own=playerView(9),pub=publicView(9);
 for(const f of [own,pub]){f.versions=versions;f.round=1;f.stock.publicationRound=0;if(f.participantTask){f.participantTask.round=1;f.participantTask.ownReturnPlacement={location:'Room A',slotId:'A1'};}}
 Object.assign(p,{versions,matchId:own.matchId,round:1,self:{...p.self,seatId:'seat-1'},phase:{id:own.phaseId,kind:'FOOD_SUPPLY',startedAt:1000,endsAt:33500},activeSeatId:null,offers:[],navigation:{lastMovedRound:0,arrivedAt:null}});
 Object.assign(p.board,{finalizedRound:0,checkpoint:'INITIAL'});
 const shared=copy(p);for(const key of ['self','abilities','knowledge','offers','privateNavigation','hackFeedback','blackoutTargeting','promises','promiseQuota','ownBallot','windows'])delete shared[key];shared.board.kind='FINALIZED';
 return PlanetSessionSnapshotSchema.parse({matchId:p.matchId,roomCode:'PLANET',versions,status:'running',playerCount:9,isHost:false,selfSeatId:'seat-1',admission:null,
  members:p.board.seats.map((s,i)=>({seatId:s.seatId,displayName:`Crew ${i+1}`,characterId:`c${i+1}`,controller:'human',ready:true})),pendingAdmissions:[],setup:null,privateRole:null,publicView:shared,playerView:p,foodPublicView:pub,foodPlayerView:own});
}
function rig(){
 let now=6000,uid='food-session',serial=0,timerId=0,value=snapshot(),readGate=null,commandGate=null,readsInFlight=0,maxReads=0;
 const timers=new Map(),requests=[],stores={resume:memory(),requests:memory()},ports={clock:{now:()=>now},ids:{next:()=>`input-${++serial}`},unresolved:memory(),
  scheduler:{setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id)}};
 const answer=(result,at=now)=>({ok:true,serverTimeMs:at,result});
 const connection={mode:'synthetic',currentUid:()=>uid,signIn:async()=>uid,async request(q){requests.push({at:now,...copy(q)});
  if(q.operation==='read'){
   readsInFlight++;maxReads=Math.max(maxReads,readsInFlight);const at=now,out=copy(value);for(const f of [out.foodPublicView,out.foodPlayerView])if(f)f.serverNowMs=at;
   try{if(readGate)await readGate.promise;return answer(out,at);}finally{readsInFlight--;}
  }
  if(q.operation==='foodCommand'){if(commandGate)await commandGate.promise;const {command,...context}=q.request,c=command;
   return answer({receipt:{...context,status:'accepted',receivedAt:now,result:{kind:'INPUT',taskId:c.taskId,controlSessionId:c.controlSessionId,effect:c.input.edge==='UP'?'GESTURE_CLOSED':'APPLIED',gestureSequence:c.input.gestureSequence,crateId:c.input.crateId}}});}
  return answer(q.operation==='foodReceipt'?{receipt:null}:{});
 }};
 const session=createPlanetSession(connection,ports,stores);
 return {session,ports,requests,connection,stores,get value(){return value;},get maxReads(){return maxReads;},set value(v){value=v;},setUid:v=>{uid=v;},
  gateRead(){return readGate=deferred();},gateCommand(){return commandGate=deferred();},
  async advance(ms){const end=now+ms;for(let n=0;n<500;n++){const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();await flush();}now=end;await flush();}};
}
test('Food dispatch is exact for gameplay and artwork; predecessor pins retain their assets and ordering',()=>{
 const v=snapshot().versions;assert.equal(planetHasFood(v),true);assert.equal(planetSupportsAssets(v),true);assert.equal(planetHasPrivateOffers(v),true);assert.equal(planetHasPrivateFeedback(v),true);
 assert.match(planetRoundOrderText(v),/^Food Supply/);assert.match(planetRoundOrderText(v),/Blackout .* Jail vote/);
 assert.equal(planetSupportsAssets({...v,assetManifestVersion:'design-0.8.0'}),false);
 const old=planetView().versions;assert.equal(planetHasFood(old),false);assert.equal(planetSupportsAssets(old),true);assert.equal(planetSupportsAssets({...old,assetManifestVersion:'design-0.9.0'}),false);
});
test('a predecessor time probe retains its own original request window rather than borrowing an older pending snapshot',async()=>{
 const r=rig();r.value=sessionScenario('board',{now:6000});await r.session.start(r.value.matchId);const t=r.session.gameTransport('player'),gate=r.gateRead(),pending=r.session.refresh();await flush();
 await r.advance(1000);const time=t.serverTime();await flush();gate.resolve();await pending;
 assert.equal(await time,7000,'predecessor clock probe must not return the older snapshot stamp of6000');assert.equal(t.readClock,undefined);r.session.dispose();
});
test('one Food read supplies both surfaces and the clock; clock-only polls retain canonical away identities',async()=>{
 const r=rig();await r.session.start(r.value.matchId);const t=r.session.gameTransport('player');
 const game=createPlanetController(t,r.ports,{matchId:r.value.matchId,surface:'player'});await game.start();
 assert.equal(r.requests.filter(q=>q.operation==='read').length,1);assert.equal(game.getModel().connection,'live');assert.equal(game.getModel().board.seats.length,9);
 assert.equal(game.getModel().identities.length,9);assert.equal(game.getModel().food.step.awaySeatIds.length,2);assert.equal(game.getModel().food.playerView,undefined);
 await r.advance(500);assert.equal(r.requests.filter(q=>q.operation==='read').length,2);assert.equal(game.getModel().connection,'live');assert.equal(t.readClock().serverNowMs,6500);
 game.dispose();r.session.dispose();
});
test('snapshot/clock coalescing queues one post-receipt read and never blocks a causal UP',async()=>{
 const r=rig();await r.session.start(r.value.matchId);const t=r.session.gameTransport('player'),gate=r.gateRead(),pending=r.session.refresh();await flush();
 const clock=t.serverTime(),food=createFoodTaskController(r.session.foodTransport(),{...r.ports,recovery:memory()},{binding:{uid:'food-session',matchId:r.value.matchId,seatId:'seat-1'},readClock:t.readClock});
 const own=r.value.foodPlayerView;food.observe(own,{matchId:own.matchId,versions:own.versions,phaseId:own.phaseId,round:own.round,serverNowMs:own.serverNowMs});
 const input=r.gateCommand();assert.equal(food.holdDown(),true);food.holdUp();await flush();
 assert.deepEqual(r.requests.filter(q=>q.operation==='foodCommand').map(q=>q.request.command.input.edge),['DOWN','UP']);assert.equal(r.maxReads,1);
 input.resolve();await flush();gate.resolve();await pending;await clock;await flush();
 assert.equal(r.maxReads,1);assert.equal(r.requests.filter(q=>q.operation==='read').length,3,'one read begun before the receipt, then one queued after it');
 food.dispose();r.session.dispose();
});
test('a slow read permits a bounded presence fallback; a private terminal stops it but snapshots continue to common return',async()=>{
 const r=rig();await r.session.start(r.value.matchId);const gate=r.gateRead();void r.session.refresh();await flush();await r.advance(2100);
 assert.equal(r.maxReads,1);assert.equal(r.requests.filter(q=>q.operation==='foodHeartbeat').length,2);gate.resolve();await flush();
 const f=r.value.foodPlayerView;f.viewRevision++;f.participantTask.revision++;f.participantTask.stage='ENDED';f.participantTask.outcome={kind:'LOST',reason:'NOT_OVER_PLATFORM',at:8000};f.offers=[];
 await r.session.refresh();const count=r.requests.filter(q=>q.operation==='foodHeartbeat').length,reads=r.requests.filter(q=>q.operation==='read').length;
 await r.advance(2000);assert.equal(r.requests.filter(q=>q.operation==='foodHeartbeat').length,count);assert.ok(r.requests.filter(q=>q.operation==='read').length>=reads+3);r.session.dispose();
});
test('hidden sessions stop reads/presence; visible without focus requires a fresh same-response snapshot',async()=>{
 const r=rig();await r.session.start(r.value.matchId);r.session.setVisible(false);const before=r.requests.length;await r.advance(2500);assert.equal(r.requests.length,before);
 r.session.setVisible(true);await r.session.refresh();assert.equal(r.session.getModel().connection,'live');assert.equal(r.session.getModel().setupClock.status,'synced');r.session.dispose();
});
test('a locally timed-out read remains the sole network read; pending read/presence cannot block UP',async()=>{
 const r=rig();await r.session.start(r.value.matchId);const gate=r.gateRead();void r.session.refresh();await flush();await r.advance(17000);
 assert.equal(r.maxReads,1);assert.equal(r.requests.filter(q=>q.operation==='read').length,2);assert.equal(r.session.getModel().connection,'stale');
 const food=r.session.foodTransport(),view=r.value.foodPlayerView,t=view.participantTask,original={schemaVersion:1,protocolVersion:3,matchId:view.matchId,phaseId:view.phaseId,foodStepId:t.foodStepId,round:view.round,commandId:'release-during-stalled-read',
  command:{type:'TASK_PRESS',taskId:t.taskId,controlSessionId:t.controlSessionId,expectedControlRevision:t.controlRevision,input:{kind:'HOLD',edge:'UP',gestureSequence:1,crateId:null}}};
 await food.command(original);assert.equal(r.requests.at(-1).operation,'foodCommand');assert.equal(r.requests.at(-1).request.command.input.edge,'UP');
 gate.resolve();await flush();r.session.dispose();
});
test('mixed Food response clocks, missing own return placement and public private-data injection conceal the whole read',async()=>{
 const r=rig();await r.session.start(r.value.matchId);const t=r.session.gameTransport('player');let feed=null;
 const stop=t.listen({matchId:r.value.matchId,seatId:'seat-1'},{snapshot:s=>{feed=s;},error(){}});
 const p=feed.value;assert.ok(readPlanetFood(feed,p,'seat-1'));
 const wrong=copy(feed);wrong.food.playerView.serverNowMs++;assert.equal(readPlanetFood(wrong,p,'seat-1'),null);
 const display={...feed,food:{publicView:feed.food.publicView,serverTimeMs:feed.food.serverTimeMs}};assert.ok(readPlanetFood(display,r.value.publicView,null));display.food.playerView=feed.food.playerView;assert.equal(readPlanetFood(display,r.value.publicView,null),null);
 delete r.value.foodPlayerView.participantTask.ownReturnPlacement;await r.session.refresh();assert.equal(r.session.getModel().connection,'error');assert.equal(r.session.getModel().members.length,0);stop();r.session.dispose();
});
test('lifecycle recovery cannot admit a Food command, heartbeat or receipt into its public request store',async()=>{
 for(const request of [{operation:'foodReceipt',matchId:'native-food-review',commandId:'old-food-input'},
  {operation:'foodHeartbeat',matchId:'native-food-review',taskId:'old-task'},
  {operation:'foodCommand',request:{schemaVersion:1,protocolVersion:3,matchId:'native-food-review',phaseId:'old-phase',foodStepId:'old-phase',round:1,commandId:'old-ask',command:{type:'TASK_ASK',partnerSeatId:'seat-3'}}}]){
  const r=rig();r.stores.requests.save(JSON.stringify({ownerUid:'food-session',request}));await r.session.start(r.value.matchId);
  assert.equal(r.session.getModel().connection,'error');await r.session.retry();assert.equal(r.requests.length,0);r.session.dispose();
 }
});
