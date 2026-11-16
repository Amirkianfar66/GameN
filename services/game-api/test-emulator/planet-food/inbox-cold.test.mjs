import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {test} from 'node:test';
import {setTimeout as sleep} from 'node:timers/promises';
import {deleteApp,initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {PLANET_FOOD_TASK_ENGINE_PROFILE,PlanetSessionSnapshotSchema} from '@mothership/contracts';
import {createFirestorePlanetStore,PLANET_FOOD_OWNER_INBOX_PROFILE} from '../../dist/index.js';
import {foodInboxScopeKey} from '../../dist/planet-food-inbox.js';
import {assertLocalEmulators,createEmulatorIdentity,projectId} from '../../../../infra/firebase/test/helpers.mjs';

async function until(check,description,timeout=45_000,interval=1_000){
  const deadline=performance.now()+timeout;
  while(performance.now()<deadline){
    const value=await check();
    if(value)return value;
    await sleep(interval);
  }
  assert.fail('Timed out waiting for '+description);
}

test('normal Food JOIN starts the private inbox owner through the real trigger and task handler', {timeout:150_000},async t=>{
  const {functionsHost}=assertLocalEmulators();
  assert.ok(process.env.CLOUD_TASKS_EMULATOR_HOST,'The local Tasks emulator must be available');
  assert.equal(process.env.MOTHERSHIP_PLANET_ENGINE_PROFILE,PLANET_FOOD_TASK_ENGINE_PROFILE);
  assert.equal(process.env.MOTHERSHIP_PLANET_SETUP_FLOW_VERSION,'3');
  assert.equal(process.env.MOTHERSHIP_PLANET_FOOD_AUTHORITY_PROFILE,PLANET_FOOD_OWNER_INBOX_PROFILE);
  const app=initializeApp({projectId},'food-inbox-cold-'+randomUUID()),db=getFirestore(app);
  const store=createFirestorePlanetStore(db),host=await createEmulatorIdentity(),player=await createEmulatorIdentity();
  async function invoke(identity,payload,observeResponse){
    const started=performance.now();
    const result=await fetch('http://'+functionsHost+'/'+projectId+'/us-central1/planetApi',{
      method:'POST',signal:AbortSignal.any([t.signal,AbortSignal.timeout(15_000)]),
      headers:{'content-type':'application/json',origin:'http://localhost:5173',authorization:'Bearer '+identity.idToken},
      body:JSON.stringify(payload),
    });
    const body=await result.json();
    observeResponse?.({status:result.status,code:body.error?.code??null,elapsedMs:Math.round(performance.now()-started)});
    assert.equal(result.status,200,JSON.stringify(body));
    assert.equal(body.ok,true,JSON.stringify(body));
    return body.result;
  }
  const operation=(kind,fields)=>({operation:kind,requestId:randomUUID(),...fields});
  const saved=path=>store.readOnly(tx=>tx.get(path));
  let matchId;
  try{
    const match=await invoke(host,operation('create',{playerCount:7}));
    matchId=match.matchId;
    const {admissionId}=await invoke(player,operation('requestAdmission',{roomCode:match.roomCode,kind:'player',displayName:'Crew'}));
    await invoke(host,operation('approveAdmission',{matchId,admissionId}));
    await invoke(host,operation('setBots',{matchId,count:6}));
    await invoke(host,operation('beginSetup',{matchId}));
    const view=async()=>PlanetSessionSnapshotSchema.parse(await invoke(player,{operation:'read',matchId}));
    const reading=await until(async()=>{const x=await view();return x.status==='reading'&&x;},'timed role reading');
    await sleep(Math.max(0,reading.setup.endsAt-Date.now()));
    await invoke(player,operation('ready',{matchId}));
    const offered=await until(async()=>{
      const x=await view();
      const answer=x.foodPlayerView?.offers.find(option=>option.type==='TASK_ANSWER');
      return answer?{x,answer}:null;
    },'practice bot invitation');
    const food=offered.x.foodPlayerView,answer=offered.answer;
    const receipt=(await invoke(player,{operation:'foodCommand',request:{
      schemaVersion:1,protocolVersion:3,matchId,phaseId:food.phaseId,foodStepId:food.step.stepId,round:food.round,commandId:randomUUID(),
      command:{type:'TASK_ANSWER',answer:'JOIN',requestId:answer.requestId,requestRevision:answer.requestRevision},
    }})).receipt;
    assert.equal(receipt.status,'accepted');
    assert.equal(receipt.result.state,'JOINED');
    const route=await saved('foodInboxRoute/'+matchId);
    assert.equal(route.closedAt,null);
    assert.equal((await saved('session/'+matchId)).foodAuthorityProfile,PLANET_FOOD_OWNER_INBOX_PROFILE);
    // Do not send READ or heartbeat traffic until the boot owner is observed.
    // This proves JOIN's committed wake reached the real trigger and task path.
    const scoped=foodInboxScopeKey(route.scope);
    const first=await until(()=>saved('foodInboxOwner/'+scoped),'private boot owner',8_000,75);
    assert.equal(first.epoch,1);
    const bootMs=first.expiresAt-8_000-receipt.receivedAt;
    assert.ok(bootMs>=0&&bootMs<8_000);
    const offers=await view();
    assert.deepEqual(offers.foodStream,{version:1,phaseId:food.phaseId,foodStepId:food.step.stepId});
    const received=performance.now(),sinceJoinMs=Date.now()-receipt.receivedAt;
    const http=[];
    // Let both original invocations finish before Abort can affect either one.
    const pair=await Promise.allSettled([player,player].map((identity,index)=>
      invoke(identity,{operation:'foodHeartbeat',matchId,taskId:route.scope.taskId},timing=>{http[index]=timing;})));
    t.diagnostic(JSON.stringify({bootMs,sinceJoinMs,stage:offers.foodPlayerView?.participantTask?.stage??null,
      concurrentHeartbeatPairMs:Math.round(performance.now()-received),
      heartbeats:pair.map((result,index)=>({outcome:result.status,...http[index]}))}));
    const renewed=pair.map(result=>{
      if(result.status==='rejected')throw result.reason;
      return result.value;
    });
    assert.deepEqual(renewed,[{renewed:true},{renewed:true}]);
    assert.equal((await saved('foodInboxOwner/'+scoped)).epoch,1);
  }finally{
    if(matchId){try{await invoke(host,operation('abort',{matchId}));}catch{/* Preserve the original failure. */}}
    await db.terminate();
    await deleteApp(app);
  }
});
