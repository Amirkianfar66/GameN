import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {before,after,test} from 'node:test';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {createFirestorePlanetStore} from '../dist/planet-store.js';
import {planetServiceHarness,digest,ok,denied} from '../test/planet-service-helper.mjs';
import {enterTimedPlanetBoarding} from '../test/planet-timed-reading-helper.mjs';
import {assertLocalEmulators} from '../../../infra/firebase/test/helpers.mjs';

// Real Firestore SDK metadata/chunk transactions, normal service setup and an
// injected service-fixture clock. Only one post-commit ACK is faulted. These
// controls are not real-time native-client or continued-liveness evidence.
let app,db;
before(()=>{
  assertLocalEmulators();
  app=initializeApp({projectId:'demo-mothership'},'food-heartbeat-'+randomUUID());db=getFirestore(app);
});
after(async()=>{await db?.terminate();if(app)await deleteApp(app);});
const sameHash=(actual,expected,label)=>assert.equal(digest(actual),digest(expected),label);

function lostHeartbeatAcknowledgement(base){
  let armed=false;
  const stats={faults:0,captured:null};
  return {...base,stats,arm:()=>{assert.equal(armed,false);armed=true;},
    transaction:async operation=>{
      let candidate=null;
      const result=await base.transaction(async tx=>{
        // Only the final successful SDK callback supplies the post-commit witness.
        candidate=null;let sessionWritten=false;
        const surface={get:key=>tx.get(key),delete:key=>tx.delete(key),set:(key,value)=>{
          if(key.startsWith('session/'))sessionWritten=true;
          if(key.startsWith('foodIngress/')&&value.request?.operation==='foodHeartbeat'&&value.response===null)
            candidate={key,entry:structuredClone(value)};
          tx.set(key,value);
        }};
        if(tx.create)surface.create=(key,value)=>tx.create(key,value);
        const value=await operation(surface);
        if(candidate)candidate.sessionWritten=sessionWritten;
        return value;
      });
      if(armed&&candidate){armed=false;stats.faults++;stats.captured=candidate;
        throw new Error('Synthetic lost heartbeat admission acknowledgement after SDK commit');}
      return result;
    },
  };
}

async function setup(count){
  const base=createFirestorePlanetStore(db),store=lostHeartbeatAcknowledgement(base);
  const h=await planetServiceHarness({count,humans:1,store,setupFlowVersion:3,
    engineProfile:'food-task-1.4',assetManifestVersion:'design-0.9.0',sample:.999999});
  const {session:boarding}=await enterTimedPlanetBoarding(h);
  h.setTime(boarding.setup.endsAt);await h.service.runDeadline(await h.currentJob());
  await h.service.runBots(h.matchId);
  const invited=await h.read(h.players[0]),view=invited.foodPlayerView;
  const offer=view.offers.find(row=>row.type==='TASK_ANSWER');assert.ok(offer,'Normal bot invitation is present');
  const request={schemaVersion:1,protocolVersion:3,matchId:h.matchId,phaseId:view.phaseId,foodStepId:view.step.stepId,
    round:view.round,commandId:h.nextId(),command:{type:'TASK_ANSWER',requestId:offer.requestId,
      requestRevision:offer.requestRevision,answer:'JOIN'}};
  assert.equal(ok(await h.invoke(h.players[0],'foodCommand',{request})).receipt.status,'accepted');
  const snapshot=await h.read(h.players[0]),task=snapshot.foodPlayerView.participantTask;
  assert.equal(task.selfControl,'WINCH');assert.equal(h.now(),task.startedAt);
  assert.equal(snapshot.versions.engineVersion,'planet-game-1.4.0');assert.equal(snapshot.versions.assetManifestVersion,'design-0.9.0');
  // All subsequent observations use the SDK read-only port, never an own read
  // operation that could renew presence or conceal recovery behavior.
  return {h,base,store,task,seatId:snapshot.selfSeatId,phaseId:snapshot.foodPlayerView.phaseId};
}

async function scopedKeys(h,namespace){
  const metadata=await db.collection('planetDocuments').where('namespace','==',namespace).select('key').get();
  return metadata.docs.map(doc=>doc.get('key')).filter(key=>typeof key==='string'
    &&key.startsWith(namespace+'/'+h.matchId+'/')).sort();
}
async function observations(f,entryKey){
  const journalKeys=await scopedKeys(f.h,'journal'),ingressKeys=await scopedKeys(f.h,'foodIngress');
  return f.base.readOnly(async tx=>{
    const session=await tx.get('session/'+f.h.matchId),control=await tx.get('foodIngressControl/'+f.h.matchId);
    const entry=entryKey?await tx.get(entryKey):null,journal=[];
    for(const key of journalKeys)journal.push(await tx.get(key));
    return {session,control,entry,journal,ingressRows:ingressKeys.length};
  });
}
function stamp(value){
  return {sessionHash:digest(value.session),controlHash:digest(value.control),entryHash:digest(value.entry),
    journalHash:digest(value.journal),journalRows:value.journal.length,ingressRows:value.ingressRows};
}

for(const count of [7,8,9])test(`${count}: Firestore detached heartbeat admission survives a lost ACK and its original wake recovers once`,
  {timeout:90000},async()=>{
    const f=await setup(count),{h,base,store,task,seatId}=f,start=task.startedAt;
    const before=await observations(f),beforeSessionHash=digest(before.session);
    h.setTime(start+100);store.arm();
    denied(await h.invoke(h.players[0],'foodHeartbeat',{matchId:h.matchId,taskId:task.taskId}),'UNAVAILABLE');
    assert.equal(store.stats.faults,1,'Exactly one genuine committed admission loses its acknowledgement');
    assert.ok(store.stats.captured);assert.equal(store.stats.captured.sessionWritten,false,
      'The committed detached admission does not publish Session');
    const entryKey=store.stats.captured.key,admitted=await observations(f,entryKey),entry=admitted.entry;
    assert.equal(digest(admitted.session),beforeSessionHash,'Admission leaves the entire genuine Session unchanged');
    assert.equal(admitted.ingressRows,before.ingressRows+1);assert.equal(admitted.journal.length,before.journal.length);
    assert.ok(entry);assert.equal(entry.context.now,start+100);assert.equal(entry.response,null);
    sameHash(entry.actorSeatId,seatId,'Saved actor is the authorized original seat');
    sameHash(entry.request.taskId,task.taskId,'Saved Task identity is unchanged');
    sameHash(entry.job.phaseId,f.phaseId,'Recovery wake names the original captured Food phase');
    assert.equal(admitted.control.nextSequence,entry.sequence+1);
    assert.ok(admitted.control.processedSequence<entry.sequence);assert.equal(admitted.control.lastAdmittedAt,start+100);
    const wakeKey='deadline/'+digest([h.matchId,entry.job.phaseId,entry.job.deadlineToken]);
    const wake=await base.readOnly(tx=>tx.get(wakeKey));assert.ok(wake);
    const originalJob={matchId:h.matchId,...entry.job};
    assert.equal(wake.ingressSequence,entry.sequence);assert.equal(wake.endsAt,start+100);
    assert.equal(wake.nextAttemptAt,start+100);assert.equal(wake.status,'pending');assert.equal(wake.kind,'game');
    assert.equal(admitted.session.foodService.leases[seatId].expiresAt,start+2000,
      'Durable admission alone does not fabricate a renewal');
    assert.equal(admitted.journal.filter(row=>row.kind==='FOOD_HEARTBEAT').length,0);

    h.setTime(start+137);h.reload();
    assert.equal((await h.service.runDeadline(originalJob)).status,'advanced','The original durable wake needs no caller retry');
    const recovered=await observations(f,entryKey),heartbeat=recovered.journal.filter(row=>row.kind==='FOOD_HEARTBEAT');
    assert.equal(heartbeat.length,1);sameHash(heartbeat[0].actorSeatId,seatId,'Exactly the saved actor receives the renewal');
    assert.equal(heartbeat[0].context.now,start+100);assert.equal(heartbeat[0].leaseExpiresAt,start+2100);
    sameHash(recovered.entry.context,entry.context,'Recovery retains the exact committed admission context');
    sameHash(recovered.entry.response,{ok:true,serverTimeMs:start+100,result:{renewed:true}},
      'Recovered response retains its original admission server time');
    assert.equal(recovered.session.foodService.leases[seatId].expiresAt,start+2100);
    assert.ok(recovered.control.processedSequence>=entry.sequence);
    assert.equal(recovered.ingressRows,admitted.ingressRows);
    assert.equal((await base.readOnly(tx=>tx.get(wakeKey))).status,'complete');

    const recoveredStamp=stamp(recovered);h.reload();
    assert.equal((await h.service.runDeadline(originalJob)).status,'unchanged');
    sameHash(stamp(await observations(f,entryKey)),recoveredStamp,'Restart/repeated wake adds no entry, application, lease or journal effect');

    // No further own renewal is sent. Its ordinary cancellation remains canon;
    // the normal host advance still reaches the unchanged common return.
    h.setTime(task.returnsAt);ok(await h.invoke(h.host,'advance',{matchId:h.matchId}));
    const returned=await observations(f,entryKey);
    assert.equal(task.returnsAt-start,32500);assert.equal(returned.session.state.phase.kind,'PRE_TURN');
    assert.equal(returned.session.state.phase.startedAt,task.returnsAt);assert.equal(returned.session.state.food.step,null);
    assert.equal(Object.keys(returned.session.foodService.leases).length,0);
    assert.equal(returned.journal.filter(row=>row.kind==='FOOD_HEARTBEAT').length,1);
    const returnedStamp=stamp(returned);h.reload();
    assert.equal((await h.service.runDeadline(originalJob)).status,'unchanged');
    sameHash(stamp(await observations(f,entryKey)),returnedStamp,'Old wake after phase change cannot restore Task or renew presence');
    assert.equal(store.stats.faults,1);
  });
