import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {createFirestorePlanetStore} from '@mothership/game-api';
import {PlanetSessionSnapshotSchema,PLANET_PHONE_ENGINE_PROFILE,PLANET_BLACKOUT_ENGINE_PROFILE} from '@mothership/contracts';
import {assertLocalEmulators,createEmulatorIdentity,firestoreRequest,projectId} from '../test/helpers.mjs';

const setupFlowVersion=process.env.MOTHERSHIP_PLANET_SETUP_FLOW_VERSION==='2'?2:process.env.MOTHERSHIP_PLANET_SETUP_FLOW_VERSION==='3'?3:undefined;
const boardingEnabled=setupFlowVersion!==undefined,timedReading=setupFlowVersion===3;
async function invoke(payload,identity) {
  const {functionsHost}=assertLocalEmulators();
  const response=await fetch(`http://${functionsHost}/${projectId}/us-central1/planetApi`,{
    method:'POST',signal:AbortSignal.timeout(60_000),headers:{'content-type':'application/json',origin:'http://localhost:5173',...(identity?{authorization:`Bearer ${identity.idToken}`}:{})},body:JSON.stringify(payload),
  });
  return {status:response.status,headers:response.headers,body:await response.json()};
}
const result=response=>{assert.equal(response.status,200,JSON.stringify(response.body));assert.equal(response.body.ok,true,JSON.stringify(response.body));return response.body.result;};
const operation=(operation,matchId,extra={})=>({operation,matchId,requestId:randomUUID(),...extra});
const snapshot=async(matchId,identity)=>PlanetSessionSnapshotSchema.parse(result(await invoke({operation:'read',matchId},identity)));
async function waitFor(predicate,description,timeoutMs=120_000) {
  const endsAt=Date.now()+timeoutMs;
  do {const value=await predicate();if(value)return value;await new Promise(resolve=>setTimeout(resolve,1000));}while(Date.now()<endsAt);
  assert.fail(`Timed out waiting for ${description}`);
}

test('real Planet HTTP rejects unauthenticated requests and caller-supplied identity',async()=>{
  assertLocalEmulators();
  const identity=await createEmulatorIdentity();
  assert.equal((await invoke({operation:'read',matchId:'unknown-match'})).status,401);
  assert.equal((await invoke({operation:'create',requestId:randomUUID(),playerCount:7,uid:'other'},identity)).status,400);
  assert.equal((await invoke({operation:'read',matchId:'unknown-match'},identity)).status,403);
});

// A fresh Functions suite only. No injected service clock, manual advance/runBots
// call, private-state mutation or direct invocation of the task callback is used.
test(`actual Planet private triggers and Tasks launch 7/8/9 bots after real setup windows with ${boardingEnabled?'versioned boarding':'legacy initialization'}`, {timeout:180_000},async()=>{
  assertLocalEmulators();
  const app=initializeApp({projectId},'planet-functions-'+randomUUID()),db=getFirestore(app),store=createFirestorePlanetStore(db);
  const matches=[];
  try {
    for(const count of [7,8,9]){
      const host=await createEmulatorIdentity(),display=await createEmulatorIdentity(),stranger=await createEmulatorIdentity();
      const created=result(await invoke({operation:'create',requestId:randomUUID(),playerCount:count},host));
      const matchId=created.matchId;matches.push({matchId,host,count});
      const admissionRequestId=randomUUID();
      const requested=result(await invoke({operation:'requestAdmission',requestId:admissionRequestId,roomCode:created.roomCode,kind:'display',displayName:'Table'},display));
      const pending=await snapshot(matchId,display);
      assert.deepEqual(pending.admission,{requestId:admissionRequestId,kind:'display',status:'pending'});
      for(const field of ['members','pendingAdmissions'])assert.deepEqual(pending[field],[]);
      for(const field of ['setup','privateRole','publicView','playerView','selfSeatId'])assert.equal(pending[field],null);
      assert.equal((await invoke({operation:'read',matchId},stranger)).status,403);
      result(await invoke(operation('approveAdmission',matchId,{admissionId:requested.admissionId}),host));
      const admitted=await snapshot(matchId,display);
      assert.deepEqual(admitted.admission,{requestId:admissionRequestId,kind:'display',status:'admitted'});assert.equal(admitted.playerView,null);
      result(await invoke(operation('setBots',matchId,{count}),host));
      result(await invoke(operation('beginSetup',matchId),host));
      const choosing=await snapshot(matchId,host);
      assert.equal(choosing.status,'choosing');assert.equal(choosing.playerCount,count);assert.equal(choosing.members.length,count);
      assert.equal(choosing.setupFlowVersion,setupFlowVersion);
      assert.equal(choosing.publicView,null);assert.equal(choosing.privateRole,null);
      matches.at(-1).choosing=choosing;matches.at(-1).display=display;
      const metadataId=createHash('sha256').update('session/'+matchId).digest('hex');
      for(const path of [`planetDocuments/${metadataId}`,`planetChunks/${metadataId}-0`]){
        assert.equal((await firestoreRequest(path,{idToken:host.idToken})).status,403);
        assert.equal((await firestoreRequest(path,{idToken:display.idToken})).status,403);
      }
    }
    // All three matches use their own real timers. Observe automatic transitions;
    // a client read cannot evaluate or advance a gameplay/setup deadline.
    await Promise.all(matches.map(async match=>{
      const reading=await waitFor(async()=>{
        const view=await snapshot(match.matchId,match.host);
        return view.status==='reading'?view:false;
      },`${match.count}-player reading stage`,90_000);
      assert.ok(reading.setup.endsAt>=match.choosing.setup.endsAt+30_000);
      assert.equal(reading.publicView,null);assert.equal(reading.privateRole,null);
      assert.ok(reading.members.every(member=>member.controller==='bot'&&member.ready));
      if(timedReading){
        assert.equal(reading.setup.roleFilmStartsAt-reading.setup.startedAt,20_000);
        assert.equal(reading.setup.endsAt-reading.setup.roleFilmStartsAt,10_000);
        assert.equal(reading.setup.endsAt-reading.setup.startedAt,30_000);
        const shared=await snapshot(match.matchId,match.display);assert.deepEqual(shared.setup,reading.setup);assert.equal(shared.privateRole,null);
      }else{
        assert.equal(Object.hasOwn(reading.setup,'startedAt'),false);assert.equal(Object.hasOwn(reading.setup,'roleFilmStartsAt'),false);
      }
      match.reading=reading;
      if(boardingEnabled){
        const boarding=await waitFor(async()=>{
          const view=await snapshot(match.matchId,match.host);return view.status==='boarding'?view:false;
        },`${match.count}-player automatic boarding stage`,90_000);
        assert.equal(boarding.setupFlowVersion,setupFlowVersion);
        assert.equal(boarding.setup.endsAt-boarding.setup.startedAt,10_000);
        assert.ok(boarding.setup.startedAt>=reading.setup.endsAt,'Boarding cannot consume the reading minimum');
        assert.notEqual(boarding.setup.id,reading.setup.id);
        assert.deepEqual(boarding.members,reading.members,'Public roster and Ready flags remain fixed');
        for(const field of ['publicView','playerView','privateRole'])assert.equal(boarding[field],null);
        const shared=await snapshot(match.matchId,match.display);
        assert.equal(shared.status,'boarding');assert.deepEqual(shared.setup,boarding.setup);assert.deepEqual(shared.members,boarding.members);
        assert.equal(shared.selfSeatId,null);assert.equal(shared.privateRole,null);assert.equal(shared.playerView,null);
        const authority=await store.transaction(tx=>tx.get('session/'+match.matchId));
        assert.equal(authority.state,null,'The actual game is not initialized during boarding');
        assert.ok(authority.prepared);assert.ok(authority.preparedState);
        const timerId=createHash('sha256').update(JSON.stringify([match.matchId,authority.setup.id,authority.setup.token])).digest('hex');
        const timer=await store.transaction(tx=>tx.get('deadline/'+timerId));
        assert.equal(timer.kind,'setup');assert.equal(timer.phaseId,boarding.setup.id);assert.equal(timer.endsAt,boarding.setup.endsAt);
        match.boarding=boarding;
      }
      const running=await waitFor(async()=>{
        const view=await snapshot(match.matchId,match.host);
        return view.status==='running'||view.status==='finished'?view:false;
      },`${match.count}-player automatic launch`,90_000);
      assert.ok(Date.now()>=reading.setup.endsAt);assert.ok(running.publicView);assert.equal(running.playerView,null);
      assert.equal(running.setupFlowVersion,setupFlowVersion);
      if(boardingEnabled){
        assert.ok(running.publicView.phase.startedAt>=match.boarding.setup.endsAt,'Initialization follows the boarding deadline');
        assert.equal(running.publicView.phase.kind,'PRE_TURN');
        assert.equal(running.publicView.phase.endsAt-running.publicView.phase.startedAt,15_000,'The existing full pre-turn budget begins on actual initialization');
      }
      const display=await snapshot(match.matchId,match.display);
      assert.ok(display.publicView);assert.equal(display.playerView,null);assert.equal(display.privateRole,null);assert.equal(display.selfSeatId,null);
      const authority=await store.transaction(tx=>tx.get('session/'+match.matchId));
      assert.equal(authority.versions.engineVersion,process.env.MOTHERSHIP_PLANET_ENGINE_PROFILE===PLANET_BLACKOUT_ENGINE_PROFILE?'planet-game-1.3.0':
        process.env.MOTHERSHIP_PLANET_ENGINE_PROFILE===PLANET_PHONE_ENGINE_PROFILE?'planet-game-1.2.0':'planet-game-1.1.0');
      assert.equal(authority.versions.assetManifestVersion,process.env.MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION??'design-0.6.0');
      assert.ok(authority.state);assert.equal(authority.members.length,match.count);
      const journals=(await db.collection('planetDocuments').where('namespace','==','journal').get()).docs.map(doc=>doc.get('key')).filter(key=>key.startsWith('journal/'+match.matchId+'/'));
      const records=await Promise.all(journals.map(key=>store.transaction(tx=>tx.get(key))));
      assert.ok(records.some(record=>record.kind==='PREPARE'),'Recorded random setup is durable');
      assert.ok(records.some(record=>record.kind==='INITIALIZE'),'Real timer launched the prepared game once');
      assert.equal(records.filter(record=>record.kind==='INITIALIZE').length,1);
      const boardingRecords=records.filter(record=>record.kind==='BOARDING_STARTED');
      assert.equal(boardingRecords.length,boardingEnabled?1:0);
      if(boardingEnabled){assert.deepEqual(boardingRecords[0].setup,match.boarding.setup);assert.equal(boardingRecords[0].setupFlowVersion,setupFlowVersion);}
      await waitFor(async()=>{
        const values=(await db.collection('planetDocuments').where('namespace','==','journal').get()).docs.map(doc=>doc.get('key')).filter(key=>key.startsWith('journal/'+match.matchId+'/'));
        for(const key of values){const record=await store.transaction(tx=>tx.get(key));if(record.kind==='COMMAND'&&record.controller==='bot'&&record.receipt.status==='accepted')return true;}
        return false;
      },`${match.count}-player private bot trigger`,30_000);
    }));
  } finally {
    for(const {matchId,host}of matches)try{result(await invoke(operation('abort',matchId),host));}catch{}
    await db.terminate();await deleteApp(app);
  }
});
