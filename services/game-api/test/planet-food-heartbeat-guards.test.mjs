import assert from 'node:assert/strict';
import {test} from 'node:test';
import {FOOD_TASK_PARAMETERS,FOOD_TASK_TRANSPORT} from '@mothership/contracts';
import {advancePlanetDeadline,applyPlanetFoodCommand,encodePlanetGameState,setPlanetFoodPresence} from '@mothership/engine';
import {setupNativeHumanFood} from './planet-food-native-service-control.mjs';
import {memoryPlanetStore,digest,ok,denied} from './planet-service-helper.mjs';

// Fixture-clock, real-engine storage-port controls. These do not establish
// Firestore retry behavior, multiplayer balance or native liveness/latency.
const clone=value=>structuredClone(value);
const records=h=>new Map(h.store.export());
const peek=h=>records(h).get('session/'+h.matchId);
const entries=h=>h.store.export().filter(([key])=>key.startsWith('foodIngress/')).map(([,value])=>value);
const beats=h=>entries(h).filter(entry=>entry.request?.operation==='foodHeartbeat');
const journal=h=>h.store.export().filter(([key])=>key.startsWith('journal/'+h.matchId+'/'))
  .map(([,value])=>value).sort((a,b)=>a.sequence-b.sequence);
const heartbeatJournal=h=>journal(h).filter(row=>row.kind==='FOOD_HEARTBEAT');
const beat=(f,uid=f.h.players[0],taskId=f.task.taskId)=>f.h.invoke(uid,'foodHeartbeat',{matchId:f.h.matchId,taskId});
function gate(){
  let enter,resume;
  const reached=new Promise(resolve=>{enter=resolve;}),wait=new Promise(resolve=>{resume=resolve;});
  return {enter,resume,reached,wait};
}
async function bounded(promise,label){
  let timer;
  try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label)),5000);})]);}
  finally{clearTimeout(timer);}
}

/** Gates and lost ACKs occur outside the fake serialized writer queue. Only
 * transport callbacks/acknowledgments are faulted: no membership or persisted
 * engine state is rewritten. RO operations use one detached committed snapshot.
 */
function guardStore(){
  const base=memoryPlanetStore(),retrySignal=new Error('Synthetic heartbeat SDK callback retry');
  const stats={consistentSnapshots:0,captureGates:0,admissionGates:0,retries:0,lostAcks:0,controlFaults:0};
  let capture=null,admission=null,retry=null,loseAck=null,controlFault=null,afterCapture=null;
  return {...base,stats,
    pauseCapture(matchId){assert.equal(capture,null);const current=gate();capture={...current,matchId};return current;},
    pauseAdmission(operation){assert.equal(admission,null);const current=gate();admission={...current,operation};return current;},
    retryHeartbeat(advanceClock){assert.equal(retry,null);retry=advanceClock;},
    loseAdmissionAck(operation){assert.equal(loseAck,null);loseAck=operation;},
    failControlRead(matchId,error){assert.equal(controlFault,null);controlFault={key:'foodIngressControl/'+matchId,error};},
    afterEachCapture(matchId,operation){afterCapture=operation?{matchId,operation}:null;},
    readOnly:async operation=>{
      const snapshot=new Map(base.export()),reads=[];
      const result=await operation(Object.freeze({get:async key=>{reads.push(key);return clone(snapshot.get(key)??null);}}));
      const consistent=reads.some(key=>key.startsWith('session/')&&reads.includes('foodIngressControl/'+key.slice('session/'.length)));
      if(consistent)stats.consistentSnapshots++;
      if(capture&&reads.includes('session/'+capture.matchId)&&reads.includes('foodIngressControl/'+capture.matchId)){
        const current=capture;capture=null;stats.captureGates++;current.enter();await current.wait;
      }
      if(afterCapture&&reads.includes('session/'+afterCapture.matchId)&&reads.includes('foodIngressControl/'+afterCapture.matchId))
        await afterCapture.operation();
      return result;
    },
    transaction:operation=>{
      let latest=[];
      const run=()=>base.transaction(async tx=>{
        const writes=[];
        const result=await operation({
          get:async key=>{
            if(controlFault?.key===key){const current=controlFault;controlFault=null;stats.controlFaults++;throw current.error;}
            return tx.get(key);
          },
          set:(key,value)=>{writes.push([key,clone(value)]);tx.set(key,value);},
          delete:key=>tx.delete(key),
        });
        const heartbeat=writes.find(([key,value])=>key.startsWith('foodIngress/')
          &&value.request?.operation==='foodHeartbeat'&&value.response===null);
        if(heartbeat&&retry){
          const advance=retry;retry=null;stats.retries++;stats.firstAttempt=clone(heartbeat[1]);advance();throw retrySignal;
        }
        latest=writes;return result;
      });
      return run().catch(error=>{if(error!==retrySignal)throw error;return run();}).then(async result=>{
        const pending=latest.find(([key,value])=>key.startsWith('foodIngress/')&&value.request!==null&&value.response===null);
        if(pending&&pending[1].request.operation===loseAck){
          loseAck=null;stats.lostAcks++;stats.ackWrites=clone(latest);throw new Error('Synthetic committed admission ACK loss');
        }
        if(pending&&admission?.operation===pending[1].request.operation){
          const current=admission;admission=null;stats.admissionGates++;current.enter();await current.wait;
        }
        return result;
      });
    },
  };
}

async function setup(){
  const store=guardStore(),f=await setupNativeHumanFood({count:7,control:'WINCH',store});
  const {h,snapshot,task}=f,seatId=snapshot.selfSeatId;
  assert.equal(h.now(),task.startedAt);assert.equal(FOOD_TASK_TRANSPORT.presenceLeaseMs,2000);
  assert.equal(FOOD_TASK_PARAMETERS.presenceGraceMs,8000);
  const expiry=peek(h).foodService.leases[seatId].expiresAt;
  assert.equal(expiry,task.startedAt+FOOD_TASK_TRANSPORT.presenceLeaseMs);
  // No own service read after this return: inspections cannot renew presence.
  return {...f,store,seatId,expiry,graceEnd:expiry+FOOD_TASK_PARAMETERS.presenceGraceMs};
}
async function replaceOwner(f,nextUid){
  const {h,seatId}=f;
  const issued=ok(await h.operation(h.host,'issueRecovery',{matchId:h.matchId,seatId}));
  ok(await h.operation(nextUid,'redeemRecovery',{matchId:h.matchId,recoveryCode:issued.recoveryCode}));
  return peek(h).members.find(member=>member.seatId===seatId);
}

test('Control fencing reloads authorization when normal recovery revokes the captured UID',async t=>{
  const f=await setup(),{h,store,seatId}=f,old=h.players[0],next=h.nextId();h.setTime(h.now()+100);
  const pause=store.pauseCapture(h.matchId);t.after(()=>pause.resume());
  const pending=beat(f);await bounded(pause.reached,'Heartbeat did not capture Session and Control');
  assert.equal((await replaceOwner(f,next)).uid,next);
  const before=store.export();pause.resume();denied(await pending,'FORBIDDEN');
  assert.equal(store.stats.captureGates,1);assert.deepEqual(store.export(),before);
  assert.equal(beats(h).length,0);assert.equal(heartbeatJournal(h).length,0);
  assert.equal(peek(h).members.find(member=>member.seatId===seatId).uid,next);
  denied(await beat(f,old),'FORBIDDEN');
});

test('same-UID recovery ABA before admission resnapshots the current binding instead of freezing the old one',async t=>{
  const f=await setup(),{h,store,seatId}=f,old=h.players[0],next=h.nextId();h.setTime(h.now()+100);
  const initial=peek(h).members.find(member=>member.seatId===seatId),snapshots=store.stats.consistentSnapshots;
  const pause=store.pauseCapture(h.matchId);t.after(()=>pause.resume());
  const pending=beat(f);await bounded(pause.reached,'Heartbeat did not capture Session and Control');
  await replaceOwner(f,next);const current=await replaceOwner(f,old);
  assert.equal(current.bindingRevision,initial.bindingRevision+2);pause.resume();
  assert.equal(ok(await pending).renewed,true);
  assert.equal(store.stats.captureGates,1);assert.ok(store.stats.consistentSnapshots>=snapshots+2);
  assert.equal(beats(h).length,1);assert.equal(beats(h)[0].bindingRevision,current.bindingRevision);
  assert.equal(beats(h)[0].uid,old);assert.equal(heartbeatJournal(h).length,1);
});

test('an earlier queued recovery denies a heartbeat already admitted against the old binding',async()=>{
  const f=await setup(),{h,store,seatId}=f,next=h.nextId();h.setTime(h.now()+100);
  const oldBinding=peek(h).members.find(member=>member.seatId===seatId).bindingRevision;
  const issued=ok(await h.operation(h.host,'issueRecovery',{matchId:h.matchId,seatId}));
  // A real recovery entry commits, but its synthetic lost ACK prevents its
  // original caller from draining. The normal writer finally releases ownership.
  store.loseAdmissionAck('redeemRecovery');
  denied(await h.operation(next,'redeemRecovery',{matchId:h.matchId,recoveryCode:issued.recoveryCode}),'UNAVAILABLE');
  const queued=entries(h).find(entry=>entry.request?.operation==='redeemRecovery'&&entry.response===null);assert.ok(queued);
  assert.equal(peek(h).members.find(member=>member.seatId===seatId).bindingRevision,oldBinding);
  const deniedHeartbeat=await beat(f);denied(deniedHeartbeat,'FORBIDDEN');
  const entry=beats(h)[0];assert.ok(entry.sequence>queued.sequence);assert.equal(entry.bindingRevision,oldBinding);
  assert.equal(entry.response.error.code,'FORBIDDEN');assert.equal(heartbeatJournal(h).length,0);
  assert.equal(peek(h).members.find(member=>member.seatId===seatId).uid,next);
});

test('a successful SDK callback retry resamples actual heartbeat admission time without duplicating its effect',async()=>{
  const f=await setup(),{h,store,seatId}=f,start=f.task.startedAt;h.setTime(start+500);
  const draws=h.draws();store.retryHeartbeat(()=>h.setTime(start+900));
  const result=await beat(f);assert.equal(ok(result).renewed,true);
  assert.equal(store.stats.retries,1);assert.equal(store.stats.firstAttempt.context.now,start+500);
  const entry=beats(h)[0];assert.equal(beats(h).length,1);assert.equal(entry.context.now,start+900);
  assert.equal(result.serverTimeMs,start+900);assert.equal(h.draws(),draws+1);
  assert.equal(heartbeatJournal(h).length,1);assert.equal(heartbeatJournal(h)[0].context.now,start+900);
  assert.equal(peek(h).foodService.leases[seatId].expiresAt,start+2900);
});

test('a retried heartbeat actually admitted at the closed grace endpoint cannot reuse its earlier tentative time',async()=>{
  const f=await setup(),{h,store,graceEnd}=f;h.setTime(graceEnd-1);
  store.retryHeartbeat(()=>h.setTime(graceEnd));denied(await beat(f),'NOT_ALLOWED');
  assert.equal(store.stats.retries,1);assert.equal(store.stats.firstAttempt.context.now,graceEnd-1);
  assert.equal(beats(h).length,1);assert.equal(beats(h)[0].context.now,graceEnd);
  assert.equal(heartbeatJournal(h).length,0);assert.equal(peek(h).state.food.step.task.stage,'ENDED');
});

for(const late of [0,1])test(`heartbeat at grace endpoint${late?'+1ms':''} stays late and cannot revive the Task`,async()=>{
  const f=await setup(),{h,seatId,graceEnd}=f;h.setTime(graceEnd+late);
  denied(await beat(f),'NOT_ALLOWED');assert.equal(beats(h).length,1);
  assert.equal(beats(h)[0].context.now,graceEnd+late);assert.equal(heartbeatJournal(h).length,0);
  const machine=peek(h).state.food.step.task;assert.equal(machine.stage,'ENDED');assert.equal(machine.outcome.kind,'CANCELLED');
  const offline=journal(h).filter(row=>row.kind==='FOOD_PRESENCE'&&row.actorSeatId===seatId&&!row.online);
  assert.equal(offline.length,1);assert.equal(offline[0].context.now,f.expiry);
});

test('lost admission ACK recovers one heartbeat only through its atomic wake after restart and replays engine history',async()=>{
  const f=await setup(),{h,store,seatId,task}=f;h.setTime(task.startedAt+5000);
  const before=clone(peek(h).state),last=journal(h).at(-1).sequence;store.loseAdmissionAck('foodHeartbeat');
  denied(await beat(f),'UNAVAILABLE');assert.equal(store.stats.lostAcks,1);
  const entry=beats(h)[0];assert.equal(beats(h).length,1);assert.equal(entry.response,null);
  assert.equal(entry.context.now,task.startedAt+5000);assert.equal(heartbeatJournal(h).length,0);
  assert.deepEqual(encodePlanetGameState(peek(h).state),encodePlanetGameState(before));
  const wakeRows=store.export().filter(([key,value])=>key.startsWith('deadline/')&&value.ingressSequence===entry.sequence);
  assert.equal(wakeRows.length,1);const [wakeKey,wake]=wakeRows[0];
  assert.equal(wake.phaseId,before.phase.id);assert.equal(wake.endsAt,entry.context.now);assert.equal(wake.status,'pending');
  assert.ok(store.stats.ackWrites.some(([key])=>key===wakeKey),'The lost-ACK commit included its recovery wake');
  assert.ok(store.stats.ackWrites.some(([key])=>key.startsWith('foodIngress/')));
  h.setTime(h.now()+1);h.reload();
  await h.service.runDeadline(wake); // Never re-invoke the original heartbeat caller.
  const recovered=beats(h)[0];assert.equal(beats(h).length,1);assert.deepEqual(recovered.context,entry.context);
  assert.equal(ok(recovered.response).renewed,true);assert.equal(recovered.response.serverTimeMs,entry.context.now);
  assert.equal(heartbeatJournal(h).length,1);assert.equal(heartbeatJournal(h)[0].actorSeatId,seatId);
  assert.equal(records(h).get(wakeKey).status,'complete');
  const replayRecords=journal(h).filter(row=>row.sequence>last);let replay=before;
  for(const row of replayRecords){
    if(row.kind==='FOOD_COMMAND'){
      const applied=applyPlanetFoodCommand(replay,row.actorSeatId,row.request,row.context);
      assert.deepEqual(applied.receipt,row.receipt);replay=applied.state;
    }else if(row.kind==='FOOD_PRESENCE')replay=setPlanetFoodPresence(replay,row.actorSeatId,row.online,row.context);
    else if(row.kind==='DEADLINE')replay=advancePlanetDeadline(replay,row.context).state;
    else assert.equal(row.kind,'FOOD_HEARTBEAT');
  }
  assert.deepEqual(encodePlanetGameState(replay),encodePlanetGameState(peek(h).state));
});

test('identical heartbeat fields are separate physical requests, with no new ID or receipt deduplication',async()=>{
  const f=await setup(),{h}=f;h.setTime(h.now()+100);ok(await beat(f));h.setTime(h.now()+100);ok(await beat(f));
  const admitted=beats(h);assert.equal(admitted.length,2);assert.ok(admitted[1].sequence>admitted[0].sequence);
  assert.deepEqual(admitted[0].request,admitted[1].request);
  assert.deepEqual(Object.keys(admitted[0].request).sort(),['matchId','operation','taskId']);
  assert.equal(admitted[0].receiptPath,null);assert.equal(admitted[1].receiptPath,null);
  assert.notEqual(admitted[0].job.deadlineToken,admitted[1].job.deadlineToken);
  assert.equal(heartbeatJournal(h).length,2);
});

test('first delivery of a pending old-phase heartbeat wake drains after an earlier common return without renewal',async()=>{
  const f=await setup(),{h,store,task}=f,foodPhase=peek(h).state.phase.id;
  h.setTime(task.returnsAt);
  const pause=store.pauseAdmission('advance');
  const advancing=h.invoke(h.host,'advance',{matchId:h.matchId});
  let entry,wakeKey,wake;
  try{
    await bounded(pause.reached,'The earlier common-return advance was not admitted');
    const earlier=entries(h).find(row=>row.request?.operation==='advance'&&row.response===null);assert.ok(earlier);
    h.setTime(task.returnsAt+1);store.loseAdmissionAck('foodHeartbeat');
    denied(await bounded(beat(f),'Detached heartbeat admission waited behind return ownership'),'UNAVAILABLE');
    entry=beats(h)[0];assert.ok(entry.sequence>earlier.sequence);assert.equal(entry.response,null);
    assert.equal(entry.context.now,task.returnsAt+1);assert.equal(entry.job.phaseId,foodPhase);
    [wakeKey,wake]=store.export().find(([key,value])=>key.startsWith('deadline/')&&value.ingressSequence===entry.sequence);
    assert.equal(wake.status,'pending');assert.equal(heartbeatJournal(h).length,0);
  }finally{pause.resume();ok(await bounded(advancing,'The earlier common return did not finish'));}
  assert.equal(store.stats.admissionGates,1);
  const returned=peek(h);assert.equal(returned.state.phase.kind,'PRE_TURN');assert.equal(returned.state.food.step,null);
  assert.notEqual(returned.state.phase.id,wake.phaseId);assert.equal(beats(h)[0].response,null);
  const beforeEngine=encodePlanetGameState(returned.state);h.reload();
  assert.equal((await h.service.runDeadline(wake)).status,'advanced');
  const recovered=beats(h)[0];assert.deepEqual(recovered.context,entry.context);
  denied(recovered.response,'NOT_ALLOWED');assert.equal(recovered.response.serverTimeMs,entry.context.now);
  assert.equal(beats(h).length,1);assert.equal(heartbeatJournal(h).length,0);
  assert.equal(Object.keys(peek(h).foodService.leases).length,0);
  assert.deepEqual(encodePlanetGameState(peek(h).state),beforeEngine);
  assert.equal(records(h).get(wakeKey).status,'complete');
});

test('a wrong Task heartbeat is ordered but cannot renew the own lease or contact',async()=>{
  const f=await setup(),{h,seatId}=f;h.setTime(h.now()+100);
  const lease=clone(peek(h).foodService.leases[seatId]),contact=clone(records(h).get('foodContact/'+h.matchId));
  denied(await beat(f,h.players[0],h.nextId()),'NOT_ALLOWED');
  assert.equal(beats(h).length,1);assert.equal(beats(h)[0].response.error.code,'NOT_ALLOWED');
  assert.equal(heartbeatJournal(h).length,0);assert.deepEqual(peek(h).foodService.leases[seatId],lease);
  assert.deepEqual(records(h).get('foodContact/'+h.matchId),contact);
});

test('a normally ended Task rejects heartbeat without restoring presence',async()=>{
  const f=await setup(),{h,seatId}=f;h.setTime(f.graceEnd);
  ok(await h.invoke(h.host,'advance',{matchId:h.matchId}));
  const ended=peek(h);assert.equal(ended.state.food.step.task.stage,'ENDED');
  denied(await beat(f),'NOT_ALLOWED');assert.equal(heartbeatJournal(h).length,0);
  assert.equal(peek(h).state.food.step.task.stage,'ENDED');assert.equal(peek(h).foodService.leases[seatId],undefined);
});

test('nonmembers and the non-playing host cannot create a heartbeat entry or wake',async()=>{
  const f=await setup(),{h,store}=f,before=store.export();
  for(const uid of [h.nextId(),h.host]){const response=await beat(f,uid);denied(response,'FORBIDDEN');assert.equal('result' in response,false);}
  assert.deepEqual(store.export(),before);assert.equal(beats(h).length,0);
});

test('an exhausted private presence budget rejects before detached admission or wake writes',async()=>{
  const f=await setup(),{h,store}=f;
  // Explicit transport-budget saturation control; no engine or member rewrite.
  await store.transaction(async tx=>tx.set('foodTransportRate/'+digest([h.players[0],'presence']),
    {since:h.now(),count:FOOD_TASK_TRANSPORT.requestsPerMinute.presence}));
  const before=store.export();denied(await beat(f),'RATE_LIMITED');
  assert.deepEqual(store.export(),before);assert.equal(beats(h).length,0);assert.equal(heartbeatJournal(h).length,0);
});

test('a declared synthetic dead-participant projection rejects heartbeat without rewriting persisted engine life',async()=>{
  const f=await setup(),{h,seatId}=f;h.setTime(h.now()+100);
  // Isolated service guard-port fixture, NOT a native death history. The real
  // engine state remains alive; only this projection reports a dead participant.
  const project=h.options.engine.projectPlanetFoodPlayer;
  h.reload({engine:{...h.options.engine,projectPlanetFoodPlayer:(state,actor,at)=>{
    const view=clone(project(state,actor,at));
    if(actor===seatId&&view.participantTask)view.participantTask.people.find(person=>person.seatId===seatId).alive=false;
    return view;
  }}});
  denied(await beat(f),'NOT_ALLOWED');assert.equal(heartbeatJournal(h).length,0);
  const after=peek(h);assert.equal(after.state.food.step.task.people.find(person=>person.seatId===seatId).alive,true);
  assert.equal(after.foodService.leases[seatId],undefined,'A dead projection never extends an active participant lease');
});

test('a non-retryable Control-read error propagates without a fresh admission loop or fabricated heartbeat',async()=>{
  const f=await setup(),{h,store}=f,before=store.export(),captures=store.stats.consistentSnapshots;
  store.failControlRead(h.matchId,Object.assign(new Error('Synthetic unrelated invalid argument'),{code:3}));
  denied(await beat(f),'UNAVAILABLE');assert.equal(store.stats.controlFaults,1);
  assert.equal(store.stats.consistentSnapshots,captures+1);assert.deepEqual(store.export(),before);
  assert.equal(beats(h).length,0);
});

test('continual clean Control fence mismatches terminate without heartbeat admission, budget or wake',async t=>{
  const f=await setup(),{h,store,seatId}=f;h.setTime(h.now()+100);
  const presenceKey='foodTransportRate/'+digest([h.players[0],'presence']);
  const beforeRate=clone(records(h).get(presenceKey)),beforeKeys=new Set(records(h).keys());let captures=0;
  // Each stale capture is challenged by a real intervening host operation.
  // It changes Control without changing the heartbeat actor's membership.
  store.afterEachCapture(h.matchId,async()=>{
    captures++;
    assert.ok(captures<16,'Clean fence refresh must be bounded well before the wall timeout');
    ok(await h.operation(h.host,'issueRecovery',{matchId:h.matchId,seatId}));
  });
  t.after(()=>store.afterEachCapture(h.matchId,null));
  denied(await bounded(beat(f),'Clean fence refresh did not terminate promptly'),'UNAVAILABLE');
  store.afterEachCapture(h.matchId,null);
  assert.ok(captures>1&&captures<16);assert.equal(beats(h).length,0);assert.equal(heartbeatJournal(h).length,0);
  assert.deepEqual(records(h).get(presenceKey),beforeRate);
  // Host operations legitimately create their own wakes. Every new sequenced
  // wake must belong to those actual operations, never a fabricated heartbeat.
  const bySequence=new Map(entries(h).map(entry=>[entry.sequence,entry]));
  for(const [key,wake]of store.export().filter(([key,value])=>!beforeKeys.has(key)&&key.startsWith('deadline/')&&value.ingressSequence!==undefined))
    assert.equal(bySequence.get(wake.ingressSequence)?.request?.operation,'issueRecovery',key);
});
