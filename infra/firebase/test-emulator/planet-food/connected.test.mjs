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
async function invoke(payload,identity){
  const {functionsHost}=assertLocalEmulators();
  const response=await fetch(`http://${functionsHost}/${projectId}/us-central1/planetApi`,{
    method:'POST',signal:AbortSignal.timeout(60000),headers:{'content-type':'application/json',origin:'http://localhost:5173',
      ...(identity?{authorization:`Bearer ${identity.idToken}`}:{})},body:JSON.stringify(payload)});
  const body=await response.json();assert.equal(response.status,200,JSON.stringify(body));assert.equal(body.ok,true,JSON.stringify(body));return body.result;
}
const operation=(operation,matchId,extra={})=>({operation,matchId,requestId:randomUUID(),...extra});
const read=async(matchId,identity)=>PlanetSessionSnapshotSchema.parse(await invoke({operation:'read',matchId},identity));
async function waitFor(predicate,label,timeout=120000){
  const end=Date.now()+timeout;
  do{const found=await predicate();if(found)return found;await pause(1000);}while(Date.now()<end);
  assert.fail(`Timed out waiting for ${label}`);
}

// Dedicated opt-in Functions/Tasks suite. No injected clock, authority seed,
// manual advance/runBots, direct task invocation or private-state mutation.
test('7/8/9: normal HTTP setup, lone human and private bot workers deliver and return once', {timeout:240000},async()=>{
  assertLocalEmulators();assert.equal(process.env.MOTHERSHIP_PLANET_ENGINE_PROFILE,PLANET_FOOD_TASK_ENGINE_PROFILE);
  assert.equal(process.env.MOTHERSHIP_PLANET_SETUP_FLOW_VERSION,'3');
  const app=initializeApp({projectId},'connected-food-'+randomUUID()),db=getFirestore(app),store=createFirestorePlanetStore(db),matches=[];
  try{
    const counts=process.env.MOTHERSHIP_FOOD_TEST_COUNT?[Number(process.env.MOTHERSHIP_FOOD_TEST_COUNT)]:[7,8,9];
    assert.ok(counts.every(n=>[7,8,9].includes(n)));
    const outcomes=await Promise.allSettled(counts.map(async count=>{
      const host=await createEmulatorIdentity(),human=await createEmulatorIdentity();
      const created=await invoke({operation:'create',requestId:randomUUID(),playerCount:count},host),matchId=created.matchId;
      matches.push({host,matchId});
      const admission=await invoke({operation:'requestAdmission',requestId:randomUUID(),roomCode:created.roomCode,kind:'player',displayName:'Food crew'},human);
      await invoke(operation('approveAdmission',matchId,{admissionId:admission.admissionId}),host);
      await invoke(operation('setBots',matchId,{count:count-1}),host);
      await invoke(operation('beginSetup',matchId),host);
      const reading=await waitFor(async()=>{const v=await read(matchId,human);return v.status==='reading'?v:false;},`${count} reading`);
      await pause(Math.max(0,reading.setup.endsAt-Date.now()));
      await invoke(operation('ready',matchId),human);
      let view=await waitFor(async()=>{const v=await read(matchId,human);return v.foodPlayerView?.offers.some(o=>o.type==='TASK_ANSWER')?v:false;},`${count} automatic human invitation`);
      assert.deepEqual(view.versions,{...PLANET_FOOD_TASK_PINS,assetManifestVersion:process.env.MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION});
      const receipts=[];let taskId=null,returnsAt=null,delivered=false,nextRead=Date.now(),lastTask=null;
      const finishBy=Date.now()+65000;
      while(Date.now()<finishBy){
        const food=view.foodPlayerView,t=food.participantTask;
        if(t){
          lastTask=t;
          taskId??=t.taskId;returnsAt??=t.returnsAt;assert.equal(t.taskId,taskId);assert.equal(t.returnsAt,returnsAt);
          assert.ok(t.ownReturnPlacement,'Own destination is supplied by authority');
          if(t.outcome?.kind==='DELIVERED')delivered=true;
        }
        if(taskId&&food.step?.kind!=='AWAY')break;
        // Local animation time can plan a tap from the last authorized anchors;
        // only the server's later durable admission decides its actual result.
        const decision=chooseFoodBotInput({...food,serverNowMs:Math.min(Date.now(),t?.deadlineAt??Infinity)});
        if(decision.command){
          const request={schemaVersion:1,protocolVersion:3,matchId,phaseId:food.phaseId,foodStepId:food.step.stepId,
            round:food.round,commandId:randomUUID(),command:decision.command};
          const {receipt}=await invoke({operation:'foodCommand',request},human);
          receipts.push({request,receipt});
          nextRead=Date.now();
        }else{
          nextRead=Math.max(Date.now(),nextRead)+500;
          const wake=Math.min(nextRead,decision.nextWakeAt??Infinity);
          await pause(Math.max(0,wake-Date.now()));
          // A timing-critical press uses the preceding authoritative anchors;
          // it must not wait for another read or heartbeat round trip at its wake.
          if(wake<nextRead&&t&&wake<t.deadlineAt)continue;
        }
        view=await read(matchId,human);
      }
      assert.ok(taskId);assert.ok(delivered,JSON.stringify({count,control:lastTask?.selfControl,outcome:lastTask?.outcome,
        crate:lastTask?.crate,panel:lastTask?.panel,commands:receipts.map(r=>({command:r.request.command,receipt:r.receipt}))}));
      assert.equal(view.foodPlayerView.step,null);assert.ok(view.foodPlayerView.serverNowMs>=returnsAt);
      assert.equal(view.publicView.board.checkpoint,'FOOD_RETURNED');
      const outsider=await read(matchId,host);assert.equal(outsider.foodPlayerView,null);
      assert.equal(outsider.foodPublicView.stock.doses,20);
      for(const {request,receipt}of receipts.filter(x=>x.receipt.status==='accepted').slice(0,2)){
        assert.deepEqual((await invoke({operation:'foodCommand',request},human)).receipt,receipt);
        assert.deepEqual((await invoke({operation:'foodReceipt',matchId,commandId:request.commandId},human)).receipt,receipt);
      }
      const saved=await store.transaction(tx=>tx.get('session/'+matchId));
      for(const world of Object.values(saved.state.worlds))assert.deepEqual(world.food.deliveredTaskIds,[taskId]);
      const documents=await db.collection('planetDocuments').where('namespace','==','journal').get();
      const keys=documents.docs.map(doc=>doc.get('key')).filter(key=>key.startsWith('journal/'+matchId+'/'));
      const journal=await Promise.all(keys.map(key=>store.transaction(tx=>tx.get(key))));
      assert.equal(journal.filter(r=>r.kind==='INITIALIZE').length,1);
      assert.ok(journal.some(r=>r.kind==='FOOD_COMMAND'&&r.controller==='bot'&&r.receipt.status==='accepted'));
      assert.ok(journal.some(r=>r.kind==='DEADLINE'),'Private Tasks ran without a client advance');
    }));
    for(const outcome of outcomes)if(outcome.status==='rejected')throw outcome.reason;
  }finally{
    for(const {host,matchId}of matches)try{await invoke(operation('abort',matchId),host);}catch{}
    await db.terminate();await deleteApp(app);
  }
});
