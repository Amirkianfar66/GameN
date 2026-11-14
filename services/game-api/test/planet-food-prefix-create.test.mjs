import assert from 'node:assert/strict';
import {test} from 'node:test';
import {FOOD_TASK_TRANSPORT} from '@mothership/contracts';
import {PlanetAtomicCreateConflict} from '../dist/planet-persistence-errors.js';
import {FOOD_PREFIX_WORKER_LEASE_MS} from '../dist/planet-food-service.js';
import {digest,memoryPlanetStore,ok} from './planet-service-helper.mjs';
import {runHumanFoodJourney,setupNativeHumanFood} from './planet-food-native-service-control.mjs';

const prefixKey=h=>'foodPrefixWorker/'+h.matchId;
const ingress=h=>h.store.export().filter(([key])=>key.startsWith('foodIngress/')).map(([,value])=>value);
const rateKey=(uid,budget)=>'foodTransportRate/'+digest([uid,budget]);
const clone=value=>structuredClone(value);
// This operation retains the zero-writer admission path; heartbeat admission is detached.
const recovery=h=>h.operation(h.host,'issueRecovery',{matchId:h.matchId,seatId:'seat-1'});

/** Native-engine orchestration control, not a Firestore concurrency/performance model.
 * Creates are validated atomically after callback completion; a conflict rolls
 * back both logical envelopes. The adapter's Commit-error provenance is tested separately.
 */
function capableStore({supported=true}={}){
  const base=memoryPlanetStore(),attempts=[];let gate=null,missingHook=null,createError=null;
  const store={...base,attempts,
    readOnly:async operation=>{
      const snapshot=new Map(base.export());
      return operation(Object.freeze({get:async key=>{
        const value=clone(snapshot.get(key)??null);
        if(value===null&&key.startsWith('foodPrefixWorker/')){
          if(missingHook){const run=missingHook;missingHook=null;await run();}
          const current=gate;
          if(current){current.arrivals++;if(current.arrivals===current.count){gate=null;current.release();}await current.ready;}
        }
        return value;
      }}));
    },
    transaction:operation=>{
      let latest;
      return base.transaction(async tx=>{
        const existing=new Map(base.export()),a={reads:[],sets:[],creates:[],committed:false,error:null};latest=a;attempts.push(a);
        const surface={get:async key=>{a.reads.push(key);return tx.get(key);},
          set:(key,value)=>{a.sets.push([key,clone(value)]);tx.set(key,value);},delete:key=>tx.delete(key)};
        if(supported)surface.create=(key,value)=>{a.creates.push([key,clone(value)]);tx.set(key,value);};
        const result=await operation(surface);
        if(a.creates.length&&createError){const error=createError;createError=null;throw error;}
        if(a.creates.some(([key])=>existing.has(key)))throw new PlanetAtomicCreateConflict(new Error('Synthetic create precondition conflict'));
        return result;
      }).then(result=>{latest.committed=true;return result;}).catch(error=>{if(latest)latest.error=error;throw error;});
    },
    gateMissing:count=>{let release;const ready=new Promise(resolve=>{release=resolve;});gate={count,arrivals:0,release,ready};},
    beforeMissingClaim:operation=>{missingHook=operation;},
    failCreate:error=>{createError=error;},
  };
  return store;
}

function claims(store,from=0){return store.attempts.slice(from).filter(a=>a.creates.some(([key])=>key.startsWith('foodPrefixWorker/')));}
function assertPair(attempt){
  const prefix=attempt.creates.find(([key])=>key.startsWith('foodPrefixWorker/'));assert.ok(prefix);
  assert.equal(attempt.creates.length,2);assert.equal(attempt.reads.includes(prefix[0]),false,'missing fast claim does not read its create target');
  const lease=prefix[1],wake=attempt.creates.find(([key])=>key==='deadline/'+lease.wakeTaskId)?.[1];assert.ok(wake);
  assert.equal(wake.endsAt,lease.expiresAt);assert.equal(wake.nextAttemptAt,lease.expiresAt);
  assert.equal(wake.status,'pending');assert.equal(wake.kind,'game');
  if(lease.throughSequence===0){assert.equal(wake.sessionWriterRecovery,true);assert.equal(wake.ingressSequence,undefined);}
  else {assert.equal(wake.ingressSequence,lease.throughSequence);assert.equal(wake.sessionWriterRecovery,undefined);}
}

for(const count of [7,8,9])test(`${count}: native candidate journey uses missing-only creates without changing replay, return or meals`,async()=>{
  const store=capableStore(),result=await runHumanFoodJourney({count,control:'PANEL',store});
  assert.equal(result.outcome.kind,'DELIVERED');assert.equal(result.stats.restarted,true);
  assert.ok(claims(store).length>0);for(const claim of claims(store))assertPair(claim);
  assert.ok(claims(store).some(a=>a.creates.some(([key,value])=>key.startsWith('foodPrefixWorker/')&&value.throughSequence>0)));
});

test('two metadata callers observe missing lease; exactly one atomic create wins that race',async()=>{
  const store=capableStore(),{h}=await setupNativeHumanFood({store});
  const start=store.attempts.length;store.gateMissing(2);
  const responses=await Promise.all([1,2].map(()=>recovery(h)));
  assert.ok(responses.every(r=>r.ok&&typeof r.result.recoveryCode==='string'));
  const raced=claims(store,start).slice(0,2);assert.equal(raced.length,2);
  assert.equal(raced.filter(a=>a.committed).length,1);assert.equal(raced.filter(a=>a.error instanceof PlanetAtomicCreateConflict).length,1);
  raced.forEach(assertPair);
  assert.equal(store.export().some(([key])=>key===prefixKey(h)),false,'every successful owner releases its own record');
  const issued=ingress(h).filter(e=>e.request?.operation==='issueRecovery');assert.equal(issued.length,2);
  assert.ok(issued.every(e=>e.response?.ok));
});

test('known authorization, token and budget denials create no ownership wake',async()=>{
  const store=capableStore(),{h,task}=await setupNativeHumanFood({store});let start=store.attempts.length;
  const outsider=await h.invoke('synthetic-outsider','foodHeartbeat',{matchId:h.matchId,taskId:task.taskId});
  assert.equal(outsider.ok,false);assert.equal(outsider.error.code,'FORBIDDEN');assert.equal(claims(store,start).length,0);
  start=store.attempts.length;
  const token=await h.operation('synthetic-outsider','redeemRecovery',{matchId:h.matchId,recoveryCode:'invalid-synthetic-token'});
  assert.equal(token.ok,false);assert.equal(token.error.code,'FORBIDDEN');assert.equal(claims(store,start).length,0);
  await store.transaction(async tx=>tx.set(rateKey(h.players[0],'presence'),{since:h.now(),count:FOOD_TASK_TRANSPORT.requestsPerMinute.presence}));
  start=store.attempts.length;
  const limited=await h.invoke(h.players[0],'foodHeartbeat',{matchId:h.matchId,taskId:task.taskId});
  assert.equal(limited.ok,false);assert.equal(limited.error.code,'RATE_LIMITED');assert.equal(claims(store,start).length,0);
});

test('same-transaction beforeClaim rate check survives a rate change after RO preflight',async()=>{
  const store=capableStore(),{h}=await setupNativeHumanFood({store});
  const start=store.attempts.length,before=ingress(h).length;
  store.beforeMissingClaim(()=>store.transaction(async tx=>tx.set(rateKey(h.host,'control'),
    {since:h.now(),count:FOOD_TASK_TRANSPORT.requestsPerMinute.control})));
  const result=await recovery(h);
  assert.equal(result.ok,false);assert.equal(result.error.code,'RATE_LIMITED');
  assert.equal(claims(store,start).length,0);assert.equal(ingress(h).length,before);
  assert.equal(store.export().some(([key])=>key===prefixKey(h)),false);
});

test('exact original operation recovers before fresh rate limits without another claim or context',async()=>{
  const store=capableStore(),{h,snapshot}=await setupNativeHumanFood({store});
  const q={operation:'issueRecovery',requestId:h.nextId(),matchId:h.matchId,seatId:snapshot.selfSeatId};
  const original=await h.service.handle(h.host,q);ok(original);
  await store.transaction(async tx=>tx.set(rateKey(h.host,'control'),{since:h.now(),count:FOOD_TASK_TRANSPORT.requestsPerMinute.control}));
  const start=store.attempts.length,draws=h.draws(),before=ingress(h).length;
  assert.deepEqual(await h.service.handle(h.host,q),original);assert.equal(claims(store,start).length,0);
  assert.equal(h.draws(),draws);assert.equal(ingress(h).length,before);
});

test('pending original input recovers through a positive create claim without a new context or duplicate receipt',async()=>{
  const store=capableStore(),{h,snapshot}=await setupNativeHumanFood({store}),view=snapshot.foodPlayerView,t=view.participantTask;
  const request={schemaVersion:1,protocolVersion:3,matchId:h.matchId,phaseId:view.phaseId,foodStepId:view.step.stepId,
    round:view.round,commandId:h.nextId(),command:{type:'TASK_PRESS',taskId:t.taskId,controlSessionId:t.controlSessionId,
      expectedControlRevision:t.controlRevision,input:{kind:'KEY'}}};
  store.loseNextAcknowledgement('foodIngress/');
  const lost=await h.invoke(h.players[0],'foodCommand',{request});assert.equal(lost.ok,false);assert.equal(lost.error.code,'UNAVAILABLE');
  const original=ingress(h).find(e=>e.request?.request?.commandId===request.commandId);assert.ok(original);assert.equal(original.response,null);
  const draws=h.draws(),start=store.attempts.length;
  const recovered=await h.invoke(h.players[0],'foodCommand',{request});assert.equal(recovered.ok,true);assert.equal(recovered.result.receipt.status,'rejected');
  assert.equal(h.draws(),draws);assert.equal(recovered.result.receipt.receivedAt,original.context.now);
  const same=ingress(h).filter(e=>e.request?.request?.commandId===request.commandId);assert.equal(same.length,1);
  assert.deepEqual(same[0].context,original.context);assert.deepEqual(same[0].response,recovered);
  const positive=claims(store,start).filter(a=>a.creates.some(([key,value])=>key===prefixKey(h)&&value.throughSequence===original.sequence));
  assert.ok(positive.length>0);positive.forEach(assertPair);
  assert.deepEqual(await h.invoke(h.players[0],'foodCommand',{request}),recovered);
});

test('expired existing lease keeps the read/set reclamation path despite create support',async()=>{
  const store=capableStore(),{h}=await setupNativeHumanFood({store});
  const phaseId=h.nextId(),deadlineToken=h.nextId(),taskId=digest([h.matchId,phaseId,deadlineToken]),expiresAt=h.now()-1;
  await store.transaction(async tx=>{
    tx.set(prefixKey(h),{owner:'synthetic-expired-owner',expiresAt,throughSequence:0,wakeTaskId:taskId});
    tx.set('deadline/'+taskId,{matchId:h.matchId,phaseId,deadlineToken,kind:'game',taskId,endsAt:expiresAt,
      status:'pending',nextAttemptAt:expiresAt,sessionWriterRecovery:true});
  });
  const start=store.attempts.length,at=h.now();ok(await recovery(h));
  const replacement=store.attempts.slice(start).find(a=>a.sets.some(([key,value])=>key===prefixKey(h)&&value.owner!=='synthetic-expired-owner'));
  assert.ok(replacement);assert.ok(replacement.reads.includes(prefixKey(h)));assert.equal(replacement.creates.length,0);
  assert.equal(replacement.sets.find(([key])=>key===prefixKey(h))[1].throughSequence,0);
  assert.equal(replacement.sets.find(([key])=>key===prefixKey(h))[1].expiresAt,at+FOOD_PREFIX_WORKER_LEASE_MS);
});

test('unsupported transaction capability retains native read/set ownership semantics',async()=>{
  const store=capableStore({supported:false}),{h}=await setupNativeHumanFood({store});
  const start=store.attempts.length;ok(await recovery(h));
  const ownership=store.attempts.slice(start).filter(a=>a.sets.some(([key])=>key===prefixKey(h)));
  assert.ok(ownership.length>0);assert.equal(claims(store).length,0);
  assert.ok(ownership.every(a=>a.reads.includes(prefixKey(h))));
  assert.ok(ownership.some(a=>a.sets.some(([key,value])=>key===prefixKey(h)&&value.throughSequence===0)));
});

test('ambiguous create acknowledgment preserves its complete lease/wake and bounded recovery',async()=>{
  const store=capableStore(),{h}=await setupNativeHumanFood({store});
  const draws=h.draws(),before=ingress(h).length;store.loseNextAcknowledgement('foodPrefixWorker/');
  const result=await recovery(h);
  assert.equal(result.ok,false);assert.equal(result.error.code,'UNAVAILABLE');assert.equal(h.draws(),draws);assert.equal(ingress(h).length,before);
  const records=new Map(store.export()),lease=records.get(prefixKey(h)),wake=records.get('deadline/'+lease.wakeTaskId);
  assert.ok(lease);assert.equal(lease.throughSequence,0);assert.equal(wake.sessionWriterRecovery,true);
  assert.equal(lease.expiresAt,h.now()+FOOD_PREFIX_WORKER_LEASE_MS);assert.equal(wake.endsAt,lease.expiresAt);assert.notEqual(wake.status,'complete');
  const early=await h.service.runDeadline(wake);assert.equal(early.status,'too-early');
  h.setTime(lease.expiresAt);await h.service.runDeadline(wake);
  assert.equal(store.export().find(([key])=>key==='deadline/'+wake.taskId)[1].status,'complete');
  assert.equal(ingress(h).some(e=>e.request?.operation==='issueRecovery'),false,'an unadmitted request is never fabricated on recovery');
});

test('untyped code6 create error propagates without being treated as a clean lost claim',async()=>{
  const store=capableStore(),{h}=await setupNativeHumanFood({store}),original=Object.assign(new Error('Synthetic unproven SDK6'),{code:6});
  const start=store.attempts.length,before=ingress(h).length,draws=h.draws();store.failCreate(original);
  const result=await recovery(h);
  assert.equal(result.ok,false);assert.equal(result.error.code,'UNAVAILABLE');
  assert.equal(claims(store,start).length,1);assert.equal(claims(store,start)[0].error,original);
  assert.equal(store.export().some(([key])=>key===prefixKey(h)),false);assert.equal(ingress(h).length,before);assert.equal(h.draws(),draws);
});
