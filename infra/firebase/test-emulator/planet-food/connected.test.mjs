import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {createFirestorePlanetStore} from '@mothership/game-api';
import {PLANET_FOOD_TASK_ENGINE_PROFILE,PLANET_FOOD_TASK_PINS,PlanetSessionSnapshotSchema} from '@mothership/contracts';
import {chooseFoodBotInput} from '../../../../services/game-api/dist/food-bot-policy.js';
import {assertLocalEmulators,createEmulatorIdentity,projectId} from '../../test/helpers.mjs';

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let scenarioSignal;
const requestTimings=[];
async function invoke(payload,identity){
  const {functionsHost}=assertLocalEmulators();
  const began=Date.now();
  const response=await fetch(`http://${functionsHost}/${projectId}/us-central1/planetApi`,{
    method:'POST',signal:AbortSignal.any([AbortSignal.timeout(10000),...(scenarioSignal?[scenarioSignal]:[])]),headers:{'content-type':'application/json',origin:'http://localhost:5173',
      ...(identity?{authorization:`Bearer ${identity.idToken}`}:{})},body:JSON.stringify(payload)});
  const body=await response.json();requestTimings.push({operation:payload.operation,ms:Date.now()-began,status:response.status});
  if(response.status===503&&body.ok===false&&body.error?.code==='UNAVAILABLE')
    throw Object.assign(new Error('Temporary transport unavailable'),{transportUnavailable:true});
  if(payload.operation==='foodHeartbeat'&&response.status===200&&body.ok===false&&body.error?.code==='NOT_ALLOWED')return {renewed:false};
  assert.equal(response.status,200,JSON.stringify(body));assert.equal(body.ok,true,JSON.stringify(body));return body.result;
}
const operation=(operation,matchId,extra={})=>({operation,matchId,requestId:randomUUID(),...extra});
async function read(matchId,identity){
  for(let attempt=0;;attempt++){
    try{return PlanetSessionSnapshotSchema.parse(await invoke({operation:'read',matchId},identity));}
    catch(error){
      // A new snapshot retries transport only. State-changing requests keep their
      // original IDs and do not receive a blanket server-side retry here.
      if(error.transportUnavailable!==true||attempt>=3)throw error;
      await pause(500);
    }
  }
}
async function waitFor(predicate,label,timeout=120000){
  const end=Date.now()+timeout;
  do{const found=await predicate();if(found)return found;await pause(1000);}while(Date.now()<end);
  assert.fail(`Timed out waiting for ${label}`);
}

// Dedicated opt-in Functions/Tasks suite. No injected clock, authority seed,
// manual advance/runBots, direct task invocation or private-state mutation.
test('7/8/9: normal HTTP setup, lone human and private bot workers deliver and return once', {timeout:240000},async context=>{
  scenarioSignal=context.signal;
  assertLocalEmulators();assert.equal(process.env.MOTHERSHIP_PLANET_ENGINE_PROFILE,PLANET_FOOD_TASK_ENGINE_PROFILE);
  assert.equal(process.env.MOTHERSHIP_PLANET_SETUP_FLOW_VERSION,'3');
  const app=initializeApp({projectId},'connected-food-'+randomUUID()),db=getFirestore(app),store=createFirestorePlanetStore(db),matches=[];
  try{
    const counts=process.env.MOTHERSHIP_FOOD_TEST_COUNT?[Number(process.env.MOTHERSHIP_FOOD_TEST_COUNT)]:[7,8,9];
    assert.ok(counts.every(n=>[7,8,9].includes(n)));
    const outcomes=await Promise.allSettled(counts.map(async count=>{
      const host=await createEmulatorIdentity(),human=await createEmulatorIdentity();
      const created=await invoke({operation:'create',requestId:randomUUID(),playerCount:count},host),matchId=created.matchId;
      const stage=(name,extra={})=>context.diagnostic(JSON.stringify({count,stage:name,at:Date.now(),...extra}));
      stage('CREATED');
      matches.push({host,matchId});
      const admission=await invoke({operation:'requestAdmission',requestId:randomUUID(),roomCode:created.roomCode,kind:'player',displayName:'Food crew'},human);
      await invoke(operation('approveAdmission',matchId,{admissionId:admission.admissionId}),host);
      await invoke(operation('setBots',matchId,{count:count-1}),host);
      await invoke(operation('beginSetup',matchId),host);
      const reading=await waitFor(async()=>{const v=await read(matchId,human);return v.status==='reading'?v:false;},`${count} reading`);
      stage('READING',{endsAt:reading.setup.endsAt});
      await pause(Math.max(0,reading.setup.endsAt-Date.now()));
      await invoke(operation('ready',matchId),human);
      stage('READY');
      let view,lastRead;
      try{view=await waitFor(async()=>{const v=await read(matchId,human);lastRead=v;return v.foodPlayerView?.offers.some(o=>o.type==='TASK_ANSWER')?v:false;},`${count} automatic human invitation`);}
      catch(error){stage('INVITATION_FAILED',{status:lastRead?.status,phase:lastRead?.publicView?.phase,round:lastRead?.foodPlayerView?.round,
        foodStep:lastRead?.foodPlayerView?.step,ownAvailability:lastRead?.foodPlayerView?.ownAvailability,
        invitation:lastRead?.foodPlayerView?.invitation,offers:lastRead?.foodPlayerView?.offers.map(o=>o.type)});throw error;}
      stage('INVITED');
      assert.deepEqual(view.versions,{...PLANET_FOOD_TASK_PINS,assetManifestVersion:process.env.MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION});
      const receipts=[];let taskId=null,returnsAt=null,delivered=false,nextRead=Date.now()+500,lastTask=null;
      let lastSnapshotAt=Date.now(),heartbeatInFlight=null,heartbeatFailure=null;
      let snapshotInFlight=null,snapshotFailure=null,needsSnapshotAfter=null;
      const startSnapshot=()=>{
        if(snapshotInFlight)return;
        const began=Date.now();
        snapshotInFlight=read(matchId,human).then(next=>{
          view=next;lastSnapshotAt=Date.now();
          if(needsSnapshotAfter!==null&&began>=needsSnapshotAfter)needsSnapshotAfter=null;
          nextRead=needsSnapshotAfter===null?Date.now()+500:Date.now();
        }).catch(error=>{snapshotFailure=error;}).finally(()=>{snapshotInFlight=null;});
      };
      const heartbeatStats={sent:0,renewed:0,unavailable:0};
      // Connection evidence is independent of the one in-flight snapshot and
      // timing-critical controls, exactly as the accepted transport policy requires.
      const heartbeatTimer=setInterval(()=>{
        const t=view.foodPlayerView?.participantTask,seatId=view.foodPlayerView?.seatId;
        if(!taskId||!t||t.stage==='ENDED'||!t.people.find(p=>p.seatId===seatId)?.alive
          ||Date.now()-lastSnapshotAt<1000||heartbeatInFlight)return;
        heartbeatStats.sent++;
        heartbeatInFlight=invoke({operation:'foodHeartbeat',matchId,taskId},human)
          .then(r=>{if(r.renewed)heartbeatStats.renewed++;})
          .catch(error=>{if(error.transportUnavailable)heartbeatStats.unavailable++;else heartbeatFailure=error;})
          .finally(()=>{heartbeatInFlight=null;});
      },1000);
      heartbeatTimer.unref();
      const finishBy=Date.now()+65000;
      try{while(Date.now()<finishBy){
        if(heartbeatFailure)throw heartbeatFailure;
        if(snapshotFailure)throw snapshotFailure;
        if(!snapshotInFlight&&Date.now()>=nextRead)startSnapshot();
        const food=view.foodPlayerView,t=food.participantTask;
        if(t){
          lastTask=t;
          if(taskId===null)stage('JOINED',{control:t.selfControl,startedAt:t.startedAt,returnsAt:t.returnsAt});
          taskId??=t.taskId;returnsAt??=t.returnsAt;assert.equal(t.taskId,taskId);assert.equal(t.returnsAt,returnsAt);
          assert.ok(t.ownReturnPlacement,'Own destination is supplied by authority');
          if(t.outcome?.kind==='DELIVERED')delivered=true;
        }
        if(taskId&&food.step?.kind!=='AWAY')break;
        // Local animation time can plan a tap from the last authorized anchors;
        // only the server's later durable admission decides its actual result.
        const decision=needsSnapshotAfter!==null||t&&Date.now()>=t.deadlineAt?{command:null,nextWakeAt:null}
          :chooseFoodBotInput({...food,serverNowMs:Date.now()});
        if(decision.command){
          const request={schemaVersion:1,protocolVersion:3,matchId,phaseId:food.phaseId,foodStepId:food.step.stepId,
            round:food.round,commandId:randomUUID(),command:decision.command};
          const sentAt=Date.now(),{receipt}=await invoke({operation:'foodCommand',request},human),ackAt=Date.now();
          stage('INPUT_ACK',{type:request.command.type,
            ...(request.command.type==='TASK_PRESS'?{input:request.command.input.kind}:{}),
            sentAt,receivedAt:receipt.receivedAt,ackAt,admissionMs:receipt.receivedAt-sentAt,roundTripMs:ackAt-sentAt,
            status:receipt.status});
          receipts.push({request,receipt});
          needsSnapshotAfter=Date.now();nextRead=Date.now();
          continue;
        }
        // Keep one snapshot in flight, but neither its reply nor heartbeat
        // delivery blocks a control planned from the last authoritative anchors.
        const wake=Math.min(snapshotInFlight?Date.now()+500:nextRead,decision.nextWakeAt??Infinity);
        await Promise.race([...(snapshotInFlight?[snapshotInFlight]:[]),pause(Math.max(1,wake-Date.now()))]);
      }}finally{
        clearInterval(heartbeatTimer);
        await Promise.all([...(heartbeatInFlight?[heartbeatInFlight]:[]),...(snapshotInFlight?[snapshotInFlight]:[])]);
        stage('HEARTBEAT_FALLBACK',heartbeatStats);
      }
      const saved=await store.transaction(tx=>tx.get('session/'+matchId));
      const actualDelivery=Object.values(saved.state.worlds).every(world=>world.food.deliveredTaskIds.includes(taskId));
      stage('TASK_FINISHED',{control:lastTask?.selfControl,outcome:lastTask?.outcome,actualDelivery});
      assert.ok(taskId);assert.ok(actualDelivery,JSON.stringify({count,control:lastTask?.selfControl,outcome:lastTask?.outcome,observedDelivery:delivered,
        crate:lastTask?.crate,panel:lastTask?.panel,commands:receipts.map(r=>({command:r.request.command,receipt:r.receipt}))}));
      assert.equal(view.foodPlayerView.step,null);assert.ok(view.foodPlayerView.serverNowMs>=returnsAt);
      stage('RETURNED',{observedDelivery:delivered});
      assert.equal(view.publicView.board.checkpoint,'FOOD_RETURNED');
      const outsider=await read(matchId,host);assert.equal(outsider.foodPlayerView,null);
      assert.equal(outsider.foodPublicView.stock.doses,20);
      for(const {request,receipt}of receipts.filter(x=>x.receipt.status==='accepted').slice(0,2)){
        assert.deepEqual((await invoke({operation:'foodCommand',request},human)).receipt,receipt);
        assert.deepEqual((await invoke({operation:'foodReceipt',matchId,commandId:request.commandId},human)).receipt,receipt);
      }
      for(const world of Object.values(saved.state.worlds))assert.deepEqual(world.food.deliveredTaskIds,[taskId]);
      const documents=await db.collection('planetDocuments').where('namespace','==','journal').get();
      const keys=documents.docs.map(doc=>doc.get('key')).filter(key=>key.startsWith('journal/'+matchId+'/'));
      const journal=await Promise.all(keys.map(key=>store.transaction(tx=>tx.get(key))));
      assert.equal(journal.filter(r=>r.kind==='INITIALIZE').length,1);
      assert.ok(journal.some(r=>r.kind==='FOOD_COMMAND'&&r.controller==='bot'&&r.receipt.status==='accepted'));
      assert.ok(journal.some(r=>r.kind==='DEADLINE'),'Private Tasks ran without a client advance');
    }));
    const failures=outcomes.filter(outcome=>outcome.status==='rejected');
    for(const failure of failures)context.diagnostic(String(failure.reason.stack??failure.reason));
    if(failures.length){
      // Synthetic failure evidence only; these reads never seed or advance authority.
      // Keep identity, roles, credentials and complete private payloads out of diagnostics.
      for(const {matchId}of matches)try{
        const inspect=async tx=>({session:await tx.get('session/'+matchId),control:await tx.get('foodIngressControl/'+matchId)});
        const {session,control}=await (store.readOnly?store.readOnly(inspect):store.transaction(inspect));
        const t=session?.state?.food?.step?.task;
        context.diagnostic(JSON.stringify({stage:'AUTHORITY_DIAGNOSTIC',status:session?.status,phase:session?.state?.phase?.kind,
          task:t?{stage:t.stage,evaluatedAt:t.evaluatedAt,deadlineAt:t.deadlineAt,outcome:t.outcome,
            crateState:t.crate.state,panelStop:t.panel.stop,panelLocked:t.panel.locked}:null,control}));
        const documents=await db.collection('planetDocuments').where('namespace','==','foodIngress').get();
        const keys=documents.docs.map(doc=>doc.get('key')).filter(key=>key.startsWith('foodIngress/'+matchId+'/'));
        const inspectEntries=tx=>Promise.all(keys.map(key=>tx.get(key)));
        const entries=await (store.readOnly?store.readOnly(inspectEntries):store.transaction(inspectEntries));
        context.diagnostic(JSON.stringify({stage:'INPUT_DIAGNOSTIC',admitted:entries.length,
          commands:entries.filter(e=>e.request?.operation==='foodCommand').map(e=>({sequence:e.sequence,
            controller:e.botIntentPath?'bot':'human',at:e.context.now,type:e.request.request.command.type,
            input:e.request.request.command.input?.kind,ok:e.response?.ok,
            status:e.response?.result?.receipt?.status,code:e.response?.result?.receipt?.code}))}));
      }catch(error){context.diagnostic('Failure diagnostics unavailable: '+String(error));}
      throw new AggregateError(failures.map(failure=>failure.reason),'Connected Food journeys failed');
    }
  }finally{
    scenarioSignal=undefined;
    context.diagnostic(JSON.stringify({transport:Object.fromEntries([...new Set(requestTimings.map(r=>r.operation))].map(operation=>{
      const times=requestTimings.filter(r=>r.operation===operation).map(r=>r.ms).sort((a,b)=>a-b);
      return [operation,{count:times.length,p95Ms:times[Math.ceil(times.length*.95)-1],maxMs:times.at(-1),
        unavailable:requestTimings.filter(r=>r.operation===operation&&r.status===503).length}];
    }))}));
    for(const {host,matchId}of matches)try{await invoke(operation('abort',matchId),host);}catch{}
    await db.terminate();await deleteApp(app);
  }
});
