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
 let now=6000,uid='food-session',serial=0,timerId=0,value=snapshot(),readGate=null,commandGate=null,readsInFlight=0,maxReads=0,denial=null;
 const timers=new Map(),requests=[],stores={resume:memory(),requests:memory()},ports={clock:{now:()=>now},ids:{next:()=>`input-${++serial}`},unresolved:memory(),
  scheduler:{setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id)}};
 const answer=(result,at=now)=>({ok:true,serverTimeMs:at,result});
 const connection={mode:'synthetic',currentUid:()=>uid,signIn:async()=>uid,async request(q){requests.push({at:now,...copy(q)});
  if(denial?.operation===q.operation)return {ok:false,serverTimeMs:now,error:{code:denial.code}};
  if(q.operation==='read'){
   readsInFlight++;maxReads=Math.max(maxReads,readsInFlight);const at=now,out=copy(value);for(const f of [out.foodPublicView,out.foodPlayerView])if(f)f.serverNowMs=at;
   try{if(readGate)await readGate.promise;return answer(out,at);}finally{readsInFlight--;}
  }
  if(q.operation==='foodCommand'){if(commandGate)await commandGate.promise;const {command,...context}=q.request,c=command;
   return answer({receipt:{...context,status:'accepted',receivedAt:now,result:{kind:'INPUT',taskId:c.taskId,controlSessionId:c.controlSessionId,effect:c.input.edge==='UP'?'GESTURE_CLOSED':'APPLIED',gestureSequence:c.input.gestureSequence??null,crateId:c.input.crateId??null}}});}
  return answer(q.operation==='foodReceipt'?{receipt:null}:{});
 }};
 const session=createPlanetSession(connection,ports,stores);
 return {session,ports,requests,connection,stores,get value(){return value;},get maxReads(){return maxReads;},set value(v){value=v;},setUid:v=>{uid=v;},
  deny(operation,code){denial={operation,code};},gateRead(){return readGate=deferred();},gateCommand(){return commandGate=deferred();},
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
test('an accepted Panel RELEASE still gets its own READ after a prior wire read outlives the local timeout',async t=>{
 for(const delay of [8250,8600])await t.test('old wire READ settles at '+delay+' ms',async()=>{
  const r=rig(),s=r.value,v=s.foodPlayerView,task=v.participantTask,seatId=task.panelSeatId;
  s.selfSeatId=seatId;s.playerView.self.seatId=seatId;v.seatId=seatId;
  Object.assign(task,{selfControl:'PANEL',controlSessionId:'panel-session-2',ownGesture:null});
  Object.assign(task.crate,{state:'HELD',holder:'WINCH',height:1});
  v.partnerChoices=v.partnerChoices.map(row=>row.seatId===seatId?{...row,seatId:task.winchSeatId}:row);
  v.offers=[{...v.offers[0],controlSessionId:task.controlSessionId,inputs:['PANEL_RELEASE']}];
  await r.session.start(s.matchId);
  assert.equal(r.session.getModel().connection,'live');
  const transport=r.session.gameTransport('player'),foodTransport=r.session.foodTransport();
  const food=createFoodTaskController(foodTransport,{...r.ports,recovery:memory()},{
   binding:{uid:'food-session',matchId:s.matchId,seatId},readClock:transport.readClock,
  });
  const stop=transport.listen({matchId:s.matchId,seatId},{snapshot(packet){
   const own=packet.food.playerView;
   assert.ok(food.observe(own,{matchId:own.matchId,versions:own.versions,phaseId:own.phaseId,
    round:own.round,serverNowMs:packet.food.serverTimeMs},packet.fresh));
  },error(kind){food.disconnect(kind);}});
  const readStarts=()=>r.requests.filter(q=>q.operation==='read').map(q=>q.at);
  try{
   const oldGate=r.gateRead();const oldRefresh=r.session.refresh();await flush();
   assert.equal(food.getModel().canPanelRelease,true);
   await food.press('PANEL_RELEASE');
   assert.equal(food.getModel().feedback.status,'accepted');
   assert.equal(food.getModel().canPanelLock,false);
   v.viewRevision++;task.revision++;task.controlRevision++;task.panel.locked=false;task.panel.anchorAt=6000;
   v.offers=[{...v.offers[0],controlRevision:task.controlRevision,inputs:['PANEL_LOCK']}];
   foodTransport.refresh();
   await r.advance(delay);
   assert.deepEqual(readStarts(),[6000,6000],'local timeout cannot free the wire READ slot');
   assert.equal(food.getModel().canPanelLock,false);
   oldGate.resolve();await oldRefresh;await flush();
   assert.deepEqual(readStarts(),[6000,6000,6000+delay],'a real new READ starts at wire settlement');
   assert.equal(r.maxReads,1);
   assert.equal(food.getModel().canPanelLock,true);
  }finally{stop();food.dispose();r.session.dispose();}
 });
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
test('explicit auth refusal on a Food read, input or original lookup conceals immediately, retaining correlation only',async()=>{
 for(const code of ['FORBIDDEN','UNAUTHENTICATED'])for(const operation of ['read','foodCommand','foodReceipt','foodHeartbeat']){
  const r=rig();await r.session.start(r.value.matchId);const t=r.session.gameTransport('player'),food=createFoodTaskController(r.session.foodTransport(),{...r.ports,recovery:memory()},
   {binding:{uid:'food-session',matchId:r.value.matchId,seatId:'seat-1'},readClock:t.readClock});
  const stop=t.listen({matchId:r.value.matchId,seatId:'seat-1'},{snapshot:s=>{const v=s.food.playerView;food.observe(v,{matchId:v.matchId,versions:v.versions,phaseId:v.phaseId,round:v.round,serverNowMs:s.food.serverTimeMs});},error:kind=>food.disconnect(kind)});
  assert.ok(food.getModel().view);r.deny(operation,code);
  if(operation==='read')await r.session.refresh();
  else if(operation==='foodCommand'){food.holdDown();await flush();assert.equal(food.getModel().pendingCount,1);}
  else if(operation==='foodHeartbeat'){const gate=r.gateRead();void r.session.refresh();await flush();await r.advance(1000);r.session.dispose();gate.resolve();await flush();}
  else await r.session.foodTransport().receipt({matchId:r.value.matchId,commandId:'original-input'});
  assert.equal(food.getModel().view,null,operation+' '+code+' must not retain a displayable Task');assert.equal(r.session.getModel().connection,'error');
  stop();food.dispose();r.session.dispose();
 }
});

function streamingRig(){
 const r=rig(),s=r.value,watch=[],clock=[];
 const offer={version:1,phaseId:s.foodPlayerView.phaseId,foodStepId:s.foodPlayerView.step.stepId};
 s.foodStream=offer;
 r.connection.foodDelivery={
  watch(request,signal,receive,keepalive){const gate=deferred();watch.push({request,signal,receive,keepalive,...gate});return gate.promise;},
  clock(request,signal){const gate=deferred();clock.push({request,signal,...gate});return gate.promise;},
 };
 const scope={matchId:s.matchId,...offer};
 return {...r,scope,watch,clock,
  reads:()=>r.requests.filter(q=>q.operation==='read'),
  pair(index,time=r.ports.clock.now()){clock[index].resolve({ok:true,scope,receivedAt:time,serverTimeMs:time});},
  frame(index,frameSequence,result={},source=s,stamp=r.ports.clock.now()){
   const next=copy(source);for(const f of [next.foodPublicView,next.foodPlayerView])if(f)f.serverNowMs=stamp;
   watch[index].receive({...scope,frameEpoch:'watch-'+index,frameSequence,serverTimeMs:stamp,kind:'snapshot',snapshot:next,fresh:true,...result});
  },
  close(index,frameSequence,reason,result={}){
   watch[index].receive({...scope,frameEpoch:'watch-'+index,frameSequence,serverTimeMs:r.ports.clock.now(),kind:'closed',reason,...result});
   watch[index].resolve();
  },
 };
}
test('Food stream selects only on the verified offer and needs one fresh frame plus paired time',async()=>{
 const r=streamingRig(),session=r.session;await session.start(r.scope.matchId);
 const t=session.gameTransport('player'),display=session.gameTransport('display'),playerPackets=[],publicPackets=[];
 const stop=t.listen({matchId:r.scope.matchId,seatId:'seat-1'},{snapshot:s=>playerPackets.push(s),error(){}});
 const stopDisplay=display.listen({matchId:r.scope.matchId,seatId:null},{snapshot:s=>publicPackets.push(s),error(){}});
 try{
  assert.deepEqual(r.watch[0].request,{operation:'foodWatch',...r.scope});assert.deepEqual(r.clock[0].request,{operation:'foodClock',...r.scope});
  r.frame(0,1,{fresh:false},r.value,9000);r.pair(0);await flush();
  assert.equal(t.readClock().serverNowMs,6000);assert.equal(session.getModel().connection,'stale');assert.equal(playerPackets.length,0);
  r.frame(0,1);assert.equal(playerPackets.length,0,'duplicate freshness cannot reopen a seat');
  r.frame(0,2,{},r.value,9100);assert.equal(session.getModel().connection,'live');
  assert.equal(playerPackets[0].food.serverTimeMs,9100);assert.equal(await t.serverTime(),6000);
  assert.ok(playerPackets[0].food.playerView.participantTask);assert.equal(Object.hasOwn(publicPackets[0].food,'playerView'),false);
  r.frame(0,3,{fresh:false});assert.equal(session.getModel().connection,'stale');
  await r.advance(2000);assert.equal(r.reads().length,1);assert.equal(r.requests.filter(q=>q.operation==='foodHeartbeat').length,2);
  await session.refresh();assert.equal(r.watch.length,1);assert.equal(r.clock.length,1);
 }finally{stop();stopDisplay();session.dispose();}
});
test('Food clock excludes handler time and bounds the offset on uneven links',async t=>{
 const cases=[
  {name:'short handler',outbound:45,inbound:45,handler:15,displayError:0},
  {name:'slow handler',outbound:45,inbound:45,handler:360,displayError:0},
  {name:'uneven link with a slow handler',outbound:20,inbound:70,handler:360,displayError:-25},
 ];
 for(const {name,outbound,inbound,handler,displayError} of cases)await t.test(name,async()=>{
  const r=streamingRig(),session=r.session,serverOffset=500;
  try{
   await session.start(r.scope.matchId);
   const sentAt=r.ports.clock.now(),serverReceivedAt=sentAt+serverOffset+outbound;
   r.frame(0,1,{},r.value,sentAt+serverOffset);
   await r.advance(outbound+handler+inbound);
   const actualServerNow=r.ports.clock.now()+serverOffset;
   r.clock[0].resolve({ok:true,scope:r.scope,receivedAt:serverReceivedAt,serverTimeMs:serverReceivedAt+handler});
   await flush();
   assert.equal(session.getModel().connection,'live');
   const reading=session.getModel().setupClock;
   assert.deepEqual(reading,{status:'synced',serverNowMs:actualServerNow+displayError,uncertaintyMs:46});
   assert.ok(Math.abs(reading.serverNowMs-actualServerNow)<=reading.uncertaintyMs);
  }finally{session.dispose();}
 });
});
test('Food clock rejects handler time longer than the measured round trip',async()=>{
 const r=streamingRig(),session=r.session;
 try{
  await session.start(r.scope.matchId);
  r.frame(0,1);
  await r.advance(90);
  r.clock[0].resolve({ok:true,scope:r.scope,receivedAt:6545,serverTimeMs:6636});
  await flush();
  assert.deepEqual(session.gameTransport('player').readClock(),{status:'unsynced'});
  assert.equal(session.getModel().connection,'stale');
 }finally{session.dispose();}
});
test('EOF and hide fence old frames and clock samples, then a verified planned closure resumes ordinary reads',async()=>{
 const r=streamingRig(),s=r.session;await s.start(r.scope.matchId);const t=s.gameTransport('player');
 r.frame(0,1);assert.equal(s.getModel().connection,'stale');r.watch[0].resolve();await flush();await r.advance(500);
 assert.equal(r.reads().length,1);assert.equal(r.watch[0].signal.aborted,true);assert.equal(r.watch.length,2);
 r.pair(0,12000);r.frame(0,2);r.pair(1);await flush();
 assert.equal(t.readClock().serverNowMs,6500);assert.equal(s.getModel().connection,'stale');
 r.frame(1,1);assert.equal(s.getModel().connection,'live');
 s.setVisible(false);await r.advance(2000);assert.equal(r.watch[1].signal.aborted,true);assert.equal(r.watch.length,2);
 assert.equal(t.readClock().status,'unsynced');
 s.setVisible(true);await flush();assert.equal(r.watch.length,3);r.frame(1,2);assert.equal(s.getModel().status,null);
 const aborted={...r.value,status:'aborted',publicView:null,playerView:null,foodPublicView:null,foodPlayerView:null};delete aborted.foodStream;
 // The clock request is allowed to lose the phase race. The planned snapshot
 // itself carries the verified outcome and the next READ supplies paired time.
 r.clock[2].resolve({ok:false,error:{code:'NOT_ALLOWED'},serverTimeMs:8500});await flush();
 const ordinary=r.connection.request;
 r.connection.request=q=>q.operation==='read'?(r.requests.push(q),Promise.resolve({ok:true,result:aborted,serverTimeMs:8500})):ordinary(q);
 r.close(2,1,'phase-ended',{snapshot:aborted});await flush();assert.equal(s.getModel().status,'aborted');
 assert.equal(r.reads().length,2);assert.equal(r.watch.length,3);assert.equal(t.readClock().serverNowMs,8500);
 s.dispose();
});
test('an old heartbeat refusal cannot conceal a reconnected Food seat; current revocation stops delivery',async()=>{
 const r=streamingRig(),s=r.session,heartbeat=deferred(),ordinary=r.connection.request;
 r.connection.request=q=>q.operation==='foodHeartbeat'?heartbeat.promise:ordinary(q);
 await s.start(r.scope.matchId);r.pair(0);r.frame(0,1);await r.advance(1000);
 r.close(0,2,'unavailable');await r.advance(500);r.frame(1,1);r.pair(1);await flush();
 heartbeat.resolve({ok:false,error:{code:'FORBIDDEN'},serverTimeMs:7500});await flush();assert.equal(s.getModel().connection,'live');
 r.close(1,2,'authorization');await r.advance(5000);
 assert.equal(s.getModel().connection,'error');assert.equal(r.reads().length,1);assert.equal(r.watch.length,2);s.dispose();
});
test('the watch pulse keeps a stale stream open without making its seat usable',async()=>{
 const r=streamingRig(),s=r.session;await s.start(r.scope.matchId);
 const transport=s.gameTransport('player'),packets=[];
 const stop=transport.listen({matchId:r.scope.matchId,seatId:'seat-1'},{snapshot:value=>packets.push(value),error(){}});
 try{
  r.frame(0,1,{fresh:false});r.pair(0);await flush();await r.advance(2500);r.watch[0].keepalive();
  await r.advance(2500);assert.equal(r.watch[0].signal.aborted,false);assert.equal(s.getModel().connection,'stale');
  assert.equal(packets.length,0);assert.equal(transport.readClock().serverNowMs,11000);
  r.frame(0,2);assert.equal(s.getModel().connection,'live');assert.equal(packets.length,1);
  r.frame(0,2);await r.advance(3000);assert.equal(s.getModel().connection,'stale');assert.equal(r.watch[0].signal.aborted,true);
  assert.equal(transport.readClock().status,'unsynced');assert.equal(r.reads().length,1);
  await r.advance(500);r.frame(1,1);r.pair(1);await flush();assert.equal(s.getModel().connection,'live');
  await r.advance(2500);r.watch[0].keepalive();await r.advance(500);
  assert.equal(s.getModel().connection,'stale');assert.equal(r.watch[1].signal.aborted,true);
  assert.equal(r.reads().length,1);
 }finally{stop();s.dispose();}
});
test('paired time cannot revive a pending frame after delivery silence',async()=>{
 const r=streamingRig(),s=r.session;await s.start(r.scope.matchId);
 r.frame(0,1);await r.advance(3000);r.pair(0,9000);r.watch[0].keepalive();await flush();
 assert.equal(r.watch[0].signal.aborted,true);assert.equal(s.gameTransport('player').readClock().status,'unsynced');
 assert.equal(s.getModel().selfSeatId,null);assert.equal(r.reads().length,1);
 s.dispose();
});
test('an unknown scoped heartbeat retains its own cadence without arming the watch',async()=>{
 const r=streamingRig(),s=r.session,ordinary=r.connection.request,beats=[];
 r.connection.request=(q,signal)=>{
  if(q.operation!=='foodHeartbeat')return ordinary(q);
  const at=r.ports.clock.now();assert.ok(signal instanceof AbortSignal);beats.push(at);
  return Promise.resolve(beats.length===1?{ok:false,error:{code:'UNAVAILABLE'},serverTimeMs:at}:{ok:true,result:{renewed:true},serverTimeMs:at});
 };
 await s.start(r.scope.matchId);r.frame(0,1);r.pair(0);await flush();await r.advance(3000);
 assert.deepEqual(beats,[7000,8000,9000]);assert.equal(s.getModel().connection,'stale');assert.equal(r.watch[0].signal.aborted,true);
 s.dispose();
});
test('a lost command response checks just the original ID without another semantic frame or gameplay POST',async()=>{
 const r=streamingRig(),s=r.session,ordinary=r.connection.request;
 let original,lookups=0;
 r.connection.request=async(q,signal)=>{
  if(q.operation==='foodCommand'){
   original=await ordinary(q);return {ok:false,error:{code:'UNAVAILABLE'},serverTimeMs:r.ports.clock.now()};
  }
  if(q.operation==='foodReceipt'){
   r.requests.push(q);assert.ok(signal instanceof AbortSignal);
   return ++lookups===1?{ok:true,result:{receipt:null},serverTimeMs:r.ports.clock.now()}:original;
  }
  return ordinary(q);
 };
 await s.start(r.scope.matchId);r.pair(0);r.frame(0,1);await flush();
 const t=s.gameTransport('player'),food=createFoodTaskController(s.foodTransport(),{...r.ports,recovery:memory()},
  {binding:{uid:'food-session',matchId:r.scope.matchId,seatId:'seat-1'},readClock:t.readClock});
 const stop=t.listen({matchId:r.scope.matchId,seatId:'seat-1'},{snapshot:snapshot=>{
  const own=snapshot.food.playerView;food.observe(own,{matchId:own.matchId,versions:own.versions,phaseId:own.phaseId,round:own.round,serverNowMs:snapshot.food.serverTimeMs});
 },error:kind=>food.disconnect(kind)});
 try{
  assert.equal(food.holdDown(),true);await flush();const id=food.getModel().feedback.commandId;
  assert.equal(food.getModel().feedback.status,'unknown');await r.advance(500);assert.equal(food.getModel().feedback.status,'unknown');
  await r.advance(500);assert.equal(food.getModel().feedback.status,'accepted');assert.equal(food.getModel().feedback.recovered,true);
  assert.deepEqual(r.requests.filter(q=>q.operation==='foodReceipt'),[1,2].map(()=>({operation:'foodReceipt',matchId:r.scope.matchId,commandId:id})));
  assert.equal(r.requests.filter(q=>q.operation==='foodCommand').length,1);assert.equal(r.reads().length,1);assert.equal(r.watch.length,1);
 }finally{stop();food.dispose();s.dispose();}
});
