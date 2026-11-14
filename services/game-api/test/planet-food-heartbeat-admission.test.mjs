import assert from 'node:assert/strict';
import {test} from 'node:test';
import {FOOD_TASK_PARAMETERS,FOOD_TASK_TRANSPORT} from '@mothership/contracts';
import {FOOD_PREFIX_WORKER_LEASE_MS} from '../dist/planet-food-service.js';
import {planetServiceHarness,memoryPlanetStore,ok} from './planet-service-helper.mjs';
import {enterTimedPlanetBoarding} from './planet-timed-reading-helper.mjs';

// Controlled service/engine causality with fixture time and post-commit ACK
// gates. This does not model Firestore locking or establish native liveness.
const clone=value=>structuredClone(value);
const entries=store=>store.export().filter(([key])=>key.startsWith('foodIngress/')).map(([,value])=>value);
const peek=(h)=>new Map(h.store.export()).get('session/'+h.matchId);
const prefix=(h)=>new Map(h.store.export()).get('foodPrefixWorker/'+h.matchId);
function gate(){
  let enter,resume;const reached=new Promise(resolve=>{enter=resolve;}),wait=new Promise(resolve=>{resume=resolve;});
  return {reached,wait,enter,resume};
}
async function bounded(promise,label){
  let timer;
  try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label)),5000);})]);}
  finally{clearTimeout(timer);}
}
const completion=promise=>promise.then(value=>({fulfilled:true,value}),()=>({fulfilled:false}));

/** Same post-commit/outside-queue gate pattern as planet-food-service.test.mjs.
 * A pending ACK cannot hold the fake writer tail or block unrelated records.
 * No Session, lease, receipt or engine state is seeded/rewritten by this port.
 */
function controlledStore(){
  const base=memoryPlanetStore(),stats={heartbeatApplications:[]};
  let ack=null,probe=null,fixtureClock=()=>0;
  return {...base,stats,
    useClock:read=>{fixtureClock=read;},
    pauseClockAuthority(matchId,at){assert.equal(ack,null);const current=gate();ack={...current,matchId,at};return current;},
    pauseNextPrefixObservation(matchId){assert.equal(probe,null);const current=gate();probe={...current,key:'foodPrefixWorker/'+matchId};return current;},
    readOnly:async operation=>{
      const snapshot=new Map(base.export()),reads=[];
      const result=await operation(Object.freeze({get:async key=>{reads.push(key);return clone(snapshot.get(key)??null);}}));
      if(probe&&reads.includes(probe.key)){const current=probe;probe=null;current.enter();await current.wait;}
      return result;
    },
    transaction:operation=>{
      const writes=new Map();
      const result=base.transaction(tx=>operation({get:key=>tx.get(key),
        set:(key,value)=>{
          writes.set(key,clone(value));
          if(key.startsWith('journal/')&&value.kind==='FOOD_HEARTBEAT')stats.heartbeatApplications.push({
            recordedContextAt:value.context.now,fixtureClockAtApplication:fixtureClock(),leaseExpiresAt:value.leaseExpiresAt});
          tx.set(key,value);
        },delete:key=>{writes.set(key,null);tx.delete(key);}}));
      return result.then(async value=>{
        if(ack&&writes.has('session/'+ack.matchId)){
          const clock=[...writes].find(([key,entry])=>key.startsWith('foodIngress/')&&entry?.request===null
            &&entry.context.now===ack.at&&entry.response?.ok);
          if(clock){const current=ack;ack=null;stats.clockAuthority=clone(clock[1]);current.enter();await current.wait;}
        }
        return value;
      });
    },
  };
}

async function setup(count){
  const store=controlledStore(),h=await planetServiceHarness({count,humans:1,store,setupFlowVersion:3,
    engineProfile:'food-task-1.4',assetManifestVersion:'design-0.9.0',sample:.999999});
  store.useClock(h.now);
  const {session:boarding}=await enterTimedPlanetBoarding(h);
  h.setTime(boarding.setup.endsAt);await h.service.runDeadline(await h.currentJob());
  await h.service.runBots(h.matchId);
  const invited=await h.read(h.players[0]),view=invited.foodPlayerView;
  const offer=view.offers.find(row=>row.type==='TASK_ANSWER');assert.ok(offer);
  const request={schemaVersion:1,protocolVersion:3,matchId:h.matchId,phaseId:view.phaseId,foodStepId:view.step.stepId,
    round:view.round,commandId:h.nextId(),command:{type:'TASK_ANSWER',requestId:offer.requestId,
      requestRevision:offer.requestRevision,answer:'JOIN'}};
  assert.equal(ok(await h.invoke(h.players[0],'foodCommand',{request})).receipt.status,'accepted');
  const snapshot=await h.read(h.players[0]),task=snapshot.foodPlayerView.participantTask;
  assert.equal(task.selfControl,'WINCH');assert.equal(h.now(),task.startedAt);
  assert.equal(snapshot.versions.engineVersion,'planet-game-1.4.0');assert.equal(snapshot.versions.assetManifestVersion,'design-0.9.0');
  // No own service read or other own renewal is allowed after this return.
  return {h,store,task,seatId:snapshot.selfSeatId};
}

for(const count of [7,8,9])test(`${count}: heartbeat commits before a positive owner ACK clears, then applies its saved time`,
  {timeout:15000},async()=>{
    const {h,store,task,seatId}=await setup(count),start=task.startedAt;
    assert.equal(FOOD_TASK_TRANSPORT.presenceLeaseMs,2000);assert.equal(FOOD_TASK_PARAMETERS.presenceGraceMs,8000);
    const initial=peek(h),scheduler=initial.foodService.scheduler;
    assert.equal(initial.foodService.leases[seatId].expiresAt,start+2000);
    assert.ok(scheduler&&scheduler.endsAt<=start+4000);
    h.setTime(start+4000);
    const ack=store.pauseClockAuthority(h.matchId,h.now());
    let observed=null,heartbeatCompletion=null,heartbeatSettled=false,heartbeatResponse,heartbeatEntry,wakeRecord;
    const clockCompletion=completion(h.service.runDeadline({matchId:h.matchId,phaseId:scheduler.phaseId,
      deadlineToken:scheduler.token,kind:'game'}));
    try{
      await bounded(ack.reached,'CLOCK authority ACK gate was not reached');
      const owner=prefix(h),clock=store.stats.clockAuthority,state=peek(h);
      assert.ok(owner&&owner.throughSequence>0,'The gate must hold a real positive prefix owner');
      assert.equal(owner.throughSequence,clock.sequence);assert.equal(clock.context.now,start+4000);
      assert.equal(owner.expiresAt,start+4000+FOOD_PREFIX_WORKER_LEASE_MS);assert.equal(owner.expiresAt,start+12000);
      assert.equal(state.state.food.step.task.stage,'ACTIVE');
      assert.equal(state.state.food.step.task.presence[seatId].disconnectedAt,start+2000);
      assert.equal(state.foodService.leases[seatId].offline,true);
      observed=store.pauseNextPrefixObservation(h.matchId);
      h.setTime(start+4500);
      heartbeatCompletion=completion(h.invoke(h.players[0],'foodHeartbeat',{matchId:h.matchId,taskId:task.taskId})
        .then(value=>{heartbeatSettled=true;heartbeatResponse=value;return value;},error=>{heartbeatSettled=true;throw error;}));
      await bounded(observed.reached,'Heartbeat did not reach the bounded technical prefix observation');
      assert.equal(heartbeatSettled,false,'Durable admission must not complete the service call before ordered application');
      const beats=entries(store).filter(entry=>entry.request?.operation==='foodHeartbeat');
      // This is the focused baseline-red assertion. Both implementations have
      // reached a technical wait; only detached admission has committed this row.
      assert.equal(beats.length,1,'Heartbeat must be durably admitted at +4.5s before the held owner is released');
      heartbeatEntry=beats[0];assert.equal(heartbeatEntry.context.now,start+4500);assert.equal(heartbeatEntry.response,null);
      assert.ok(heartbeatEntry.sequence>clock.sequence);assert.equal(heartbeatEntry.actorSeatId,seatId);
      const wakes=store.export().filter(([key,value])=>key.startsWith('deadline/')&&value.ingressSequence===heartbeatEntry.sequence);
      assert.equal(wakes.length,1,'The heartbeat and its recovery wake must commit together');wakeRecord=wakes[0];
      assert.equal(wakeRecord[1].endsAt,start+4500);assert.equal(wakeRecord[1].nextAttemptAt,start+4500);
      assert.equal(wakeRecord[1].status,'pending');assert.equal(wakeRecord[1].kind,'game');
      assert.equal(store.stats.heartbeatApplications.length,0,'Admission must not fabricate a presence renewal');
      assert.equal(peek(h).foodService.leases[seatId].expiresAt,start+2000);
      assert.equal(peek(h).foodService.leases[seatId].offline,true);
    }finally{
      // Always let the baseline complete its real late admission instead of
      // leaving a waiter alive for the coordinator's 20-second wall budget.
      h.setTime(start+11000);observed?.resume();ack.resume();
      const results=await bounded(Promise.all([clockCompletion,...(heartbeatCompletion?[heartbeatCompletion]:[])]),
        'Released fixture callers did not settle');
      assert.ok(results.every(result=>result.fulfilled),'Released service/deadline callers must settle normally');
    }
    assert.equal(heartbeatSettled,true);assert.equal(ok(heartbeatResponse).renewed,true);
    assert.equal(heartbeatResponse.serverTimeMs,start+4500,'Response retains the actual committed admission sample');
    assert.deepEqual(store.stats.heartbeatApplications,[{recordedContextAt:start+4500,
      fixtureClockAtApplication:start+11000,leaseExpiresAt:start+6500}]);
    const applied=entries(store).filter(entry=>entry.request?.operation==='foodHeartbeat');assert.equal(applied.length,1);
    assert.deepEqual(applied[0].context,heartbeatEntry.context);assert.deepEqual(applied[0].response,heartbeatResponse);
    assert.equal(new Map(store.export()).get(wakeRecord[0]).status,'complete');
    // Deadline processing may already have appended CLOCK +11s through runBots.
    // This explicit host advance also drains that same due presence boundary;
    // it cannot renew the human and is not an own service read.
    ok(await h.invoke(h.host,'advance',{matchId:h.matchId}));
    const after=peek(h),machine=after.state.food.step.task,lease=after.foodService.leases[seatId];
    assert.equal(h.now(),start+11000);assert.equal(machine.outcome,null);
    assert.equal(machine.presence[seatId].disconnectedAt,start+6500);
    assert.equal(lease.expiresAt,start+6500);assert.equal(lease.offline,true);
    assert.equal(machine.presence[seatId].disconnectedAt+FOOD_TASK_PARAMETERS.presenceGraceMs,start+14500);
    const journal=store.export().filter(([key])=>key.startsWith('journal/'+h.matchId+'/')).map(([,value])=>value);
    const offline=journal.filter(row=>row.kind==='FOOD_PRESENCE'&&row.actorSeatId===seatId&&row.online===false);
    assert.deepEqual(offline.map(row=>row.context.now),[start+2000,start+6500]);
    const online=journal.filter(row=>row.kind==='FOOD_PRESENCE'&&row.actorSeatId===seatId&&row.online===true);
    assert.equal(online.length,1);assert.equal(online[0].context.now,start+4500);
    assert.equal(journal.filter(row=>row.kind==='FOOD_HEARTBEAT'&&row.actorSeatId===seatId).length,1);
  });
