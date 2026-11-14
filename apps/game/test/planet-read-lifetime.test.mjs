import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createPlanetController,createFoodTaskController} from '../dist/index.js';
import {postHostedPlanetRequest} from '../dist/browser/planet-request.js';
import {config,deferred,flush,hostedRig,memory,virtualTime} from './planet-read-lifetime-support.mjs';

for(const stage of ['idToken','appCheck','headers','body'])test(`a stalled hosted READ ${stage} settles at its actual deadline`,async()=>{
 const r=hostedRig();let settled=false,error=null;
 try{
  const gate=r.plan(stage),request=r.connection.request({operation:'read',matchId:r.value.matchId});request.then(()=>{settled=true;},e=>{settled=true;error=e;});await flush();
  await r.time.advance(15_999);assert.equal(settled,false,'the actual transport allows finite late responses beyond the8s freshness wait');
  await r.time.advance(1);assert.equal(settled,true,'the actual READ must finish, not leave future polls behind the same never-settling promise');assert.ok(error);
  assert.equal(r.activeReads,0,'aborted headers/body must settle before any replacement');
  const calls=r.fetches.length;gate.resolve('late-token-or-response');await flush();assert.equal(r.fetches.length,calls,'a late credential completion must never dispatch a timed-out READ');
 }finally{r.dispose();await flush();}
});

test('the scheduled poll recovers after a transient READ failure without refresh or reload',async()=>{
 const r=hostedRig();try{
  await r.session.start(r.value.matchId);r.plan('error');await r.time.advance(500);assert.equal(r.session.getModel().connection,'stale');
  await r.time.advance(500);assert.equal(r.session.getModel().connection,'live');assert.equal(r.session.getModel().selfSeatId,'seat-1');assert.equal(r.maxReads,1);
 }finally{r.dispose();await flush();}
});

for(const stage of ['idToken','appCheck','headers','body'])test(`scheduled recovery after a stalled ${stage} keeps one logical READ and the same seat`,async()=>{
 const r=hostedRig();try{
  await r.session.start(r.value.matchId);const gate=r.plan(stage);await r.time.advance(500);
  await r.time.advance(8000);assert.equal(r.session.getModel().connection,'stale','the existing freshness wait remains8s');assert.equal(r.session.getModel().members.length,0);
  await r.time.advance(9000);assert.equal(r.session.getModel().connection,'live','a scheduled fresh READ must recover without a caller refresh');assert.equal(r.session.getModel().selfSeatId,'seat-1');assert.equal(r.session.getModel().matchId,r.value.matchId);assert.equal(r.maxReads,1);
  const count=r.fetches.length;gate.resolve('late');await flush();assert.equal(r.fetches.length,count);assert.equal(r.session.getModel().connection,'live');
 }finally{r.dispose();await flush();}
});

test('a finite READ past8s retains its original clock window and never starts an overlapping read',async()=>{
 const r=hostedRig();try{
  await r.session.start(r.value.matchId);r.session.setVisible(false);const gate=r.plan('body');r.session.setVisible(true);await flush();
  await r.time.advance(8500);assert.equal(r.session.getModel().connection,'stale');assert.equal(r.maxReads,1);
  // The next scheduled waiter reuses the actual old flight; its delayed body
  // is stamped at the original6000, not at the later retry's start.
  await r.time.advance(500);await flush();
  const delayed=r.fetches.findLast(x=>x.request.operation==='read');assert.equal(delayed.at,6000);
  gate.resolve();await flush();assert.equal(r.session.getModel().connection,'live');
  const clock=r.session.getModel().setupClock;assert.equal(clock.status,'synced');assert.equal(clock.uncertaintyMs,4500);assert.equal(clock.serverNowMs,10_500);
  assert.equal(r.fetches.filter(x=>x.request.operation==='read').length,2);assert.equal(r.maxReads,1);
  await r.time.advance(500);assert.equal(r.session.getModel().connection,'live');assert.equal(r.session.getModel().setupClock.uncertaintyMs,0);assert.equal(r.session.getModel().setupClock.serverNowMs,15_500);assert.equal(r.fetches.filter(x=>x.request.operation==='read').length,3);
 }finally{r.dispose();await flush();}
});

for(const stage of ['idToken','appCheck','headers','body'])test(`overdue ${stage} cannot beat a delayed deadline timer`,async()=>{
 const r=hostedRig();let settled=false,error=null;try{
  const gate=r.plan(stage),pending=r.connection.request({operation:'read',matchId:r.value.matchId});pending.then(()=>{settled=true;},e=>{settled=true;error=e;});await flush();
  r.time.jump(16_001);gate.resolve('late');await flush();
  assert.equal(settled,true);assert.ok(error,'a monotonic elapsed-budget fence rejects even before the overdue timer runs');assert.equal(r.activeReads,0);
  if(['idToken','appCheck'].includes(stage))assert.equal(r.fetches.length,0,'expired credentials cannot dispatch the READ');
 }finally{r.dispose();await flush();}
});

test('an overdue credential completion expires acquisition even if its sibling is still pending',async()=>{
 const time=virtualTime(),id=deferred(),app=deferred();let failed=false,fetches=0;
 const pending=postHostedPlanetRequest(config,{getIdToken:()=>id.promise,getAppCheckToken:()=>app.promise,fetch:async()=>{fetches++;throw Error('expired READ must not dispatch');}},{operation:'read',matchId:'planet-local'},{scheduler:time.scheduler,clock:time.clock});
 pending.catch(()=>{failed=true;});await flush();time.jump(16_001);id.resolve('late-id-token');await flush();
 assert.equal(failed,true);assert.equal(fetches,0);app.resolve('late-app-check');await flush();assert.equal(fetches,0);assert.equal(time.timerCount,0);
});

test('deadline cancellation owns the old READ until headers actually settle',async()=>{
 const r=hostedRig();try{
  await r.session.start(r.value.matchId);r.plan('headers',2000);await r.time.advance(500);await r.time.advance(16_000);
  assert.equal(r.fetches.findLast(x=>x.request.operation==='read').signal?.aborted,true);assert.equal(r.activeReads,1);
  await r.time.advance(1999);assert.equal(r.activeReads,1);assert.equal(r.fetches.filter(x=>x.request.operation==='read').length,2,'no replacement while aborted transport is still settling');
  await r.time.advance(501);assert.equal(r.activeReads,0);assert.equal(r.session.getModel().connection,'live');assert.equal(r.maxReads,1);
 }finally{r.dispose();await flush();}
});

test('blur/focus during a stalled old-generation READ recovers automatically with a fresh clock and role',async()=>{
 const r=hostedRig();let game;
 try{
  await r.session.start(r.value.matchId);game=createPlanetController(r.session.gameTransport('player'),r.ports,{matchId:r.value.matchId,surface:'player'});await game.start();
  r.plan('headers');await r.time.advance(500);r.session.setVisible(false);assert.equal(game.getModel().board,null);assert.deepEqual(r.session.getModel().setupClock,{status:'unsynced'});
  r.session.setVisible(true);await r.time.advance(17_000);
  assert.equal(r.session.getModel().connection,'live');assert.equal(game.getModel().connection,'live');assert.equal(game.getModel().ownSeatId,'seat-1');game.openPanel('card');assert.equal(game.getModel().privateArea.role.name,'Hacker');assert.equal(r.session.getModel().setupClock.status,'synced');assert.equal(r.maxReads,1);
 }finally{game?.dispose();r.dispose();await flush();}
});

test('a finite old-generation reply cannot repaint private data or calibrate the resumed clock',async()=>{
 const r=hostedRig();let game;try{
  await r.session.start(r.value.matchId);game=createPlanetController(r.session.gameTransport('player'),r.ports,{matchId:r.value.matchId,surface:'player'});await game.start();
  const old=r.plan('body');await r.time.advance(500);r.session.setVisible(false);assert.equal(game.getModel().board,null);
  r.value.playerView.viewRevision++;r.value.publicView.viewRevision++;const fresh=r.plan('headers');r.session.setVisible(true);await r.time.advance(1000);
  old.resolve();await flush();assert.equal(game.getModel().board,null,'old generation must stay concealed');assert.equal(r.session.getModel().setupClock.status,'unsynced','discarded reply cannot supply the clock');assert.equal(r.maxReads,1);
  fresh.resolve();await flush();assert.equal(game.getModel().connection,'live');assert.equal(game.getModel().revision,2);assert.equal(game.getModel().ownSeatId,'seat-1');assert.equal(r.session.getModel().setupClock.uncertaintyMs,0);assert.equal(r.session.getModel().setupClock.serverNowMs,7500);
 }finally{game?.dispose();r.dispose();await flush();}
});

test('a stalled READ cannot delay or cancel the original causal Hold UP',async()=>{
 const r=hostedRig();let food;
 try{
  await r.session.start(r.value.matchId);r.plan('headers');await r.time.advance(500);
  const own=r.value.foodPlayerView;food=createFoodTaskController(r.session.foodTransport(),{...r.ports,recovery:memory()},{binding:{uid:'read-lifetime-user',matchId:r.value.matchId,seatId:'seat-1'},readClock:r.session.gameTransport('player').readClock});
  food.observe(own,{matchId:own.matchId,versions:own.versions,phaseId:own.phaseId,round:own.round,serverNowMs:own.serverNowMs});
  assert.equal(food.holdDown(),true);food.holdUp();await flush();
  const inputs=r.fetches.filter(x=>x.request.operation==='foodCommand');assert.deepEqual(inputs.map(x=>x.request.request.command.input.edge),['DOWN','UP']);assert.equal(inputs[0].request.request.command.input.gestureSequence,inputs[1].request.request.command.input.gestureSequence);assert.ok(inputs.every(x=>x.signal===undefined));
  await r.time.advance(17_000);assert.equal(r.session.getModel().connection,'live');assert.equal(food.getModel().physicalHolding,false);assert.equal(r.maxReads,1);
 }finally{food?.dispose();r.dispose();await flush();}
});

test('an unknown committed Abort keeps its original ID/body across reads, reload and Retry',async()=>{
 const r=hostedRig({host:true}),lost=r.gate(),attempts=[];let commits=0,resumed;
 r.mutation(async(q,init,response)=>{
  if(q.operation!=='abort')return {text:async()=>JSON.stringify(response)};
  attempts.push(structuredClone(q));assert.equal(init.signal,undefined,'READ cancellation never applies to mutations');
  if(attempts.length===1){commits++;r.value={...r.value,status:'aborted',privateRole:null,publicView:null,playerView:null,foodPublicView:null,foodPlayerView:null};await lost.promise;}
  return {text:async()=>JSON.stringify(response)};
 });
 try{
  await r.session.start(r.value.matchId);const pending=r.session.operate({operation:'abort',matchId:r.value.matchId});await flush();await r.time.advance(17_000);await pending;
  assert.equal(r.session.getModel().uncertain,true);assert.equal(r.session.getModel().status,'aborted');const saved=r.stores.requests.load();assert.ok(saved);assert.equal(attempts.length,1);
  r.session.dispose();const {createPlanetSession}=await import('../dist/index.js');resumed=createPlanetSession(r.connection,r.ports,r.stores);await resumed.start();assert.equal(resumed.getModel().uncertain,true);
  await resumed.retry();assert.deepEqual(attempts,[attempts[0],attempts[0]]);assert.equal(commits,1);assert.equal(resumed.getModel().uncertain,false);assert.equal(r.stores.requests.load(),null);
  lost.resolve();await flush();assert.equal(resumed.getModel().uncertain,false);
 }finally{resumed?.dispose();r.dispose();await flush();}
});

test('successful READ cleanup removes its deadline rather than aborting a later operation',async()=>{
 const r=hostedRig();try{
  await r.connection.request({operation:'read',matchId:r.value.matchId});assert.equal(r.time.timerCount,0);const signal=r.fetches[0].signal;
  await r.time.advance(20_000);assert.equal(signal?.aborted??false,false);
 }finally{r.dispose();await flush();}
});

test('mutation token acquisition remains unchanged and never inherits a READ deadline',async()=>{
 const time=virtualTime(),token=deferred();let fetched=0,settled=false;
 const ports={getIdToken:()=>token.promise,getAppCheckToken:async()=>'test-app-check',fetch:async(_url,init)=>{fetched++;assert.equal(init.signal,undefined);return {text:async()=>'{}'};}};
 const result=postHostedPlanetRequest(config,ports,{operation:'abort',matchId:'planet-local',requestId:'original-abort'},{scheduler:time.scheduler,clock:time.clock});result.then(()=>{settled=true;});await time.advance(20_000);assert.equal(settled,false);assert.equal(fetched,0);token.resolve('test-id-token');await result;assert.equal(fetched,1);assert.equal(time.timerCount,0);
});
