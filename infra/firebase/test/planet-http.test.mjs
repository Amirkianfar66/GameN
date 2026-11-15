import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlanetHttpHandler} from '../dist/planet.js';

function setup(overrides={}) {
  const calls=[];
  return {calls,dependencies:{
    service:{handle:async(...args)=>{calls.push(args);return {ok:true,serverTimeMs:123,result:{matchId:'match-a'}};}},
    configuration:{emulator:true,allowedOrigins:['http://localhost:5173']},clock:()=>123,
    verifyIdToken:async token=>{if(token!=='verified-token')throw new Error('private auth detail');return {uid:'verified-uid'};},
    verifyAppCheckToken:async()=>{throw new Error('unexpected appcheck');},...overrides,
  }};
}
async function invoke(dependencies,overrides={}) {
  const capture={headers:{},status:undefined,body:undefined};
  const response={set(k,v){capture.headers[k]=v;return response;},status(v){capture.status=v;return response;},json(v){capture.body=v;return response;}};
  await createPlanetHttpHandler(dependencies)({method:'POST',headers:{'content-type':'application/json',authorization:'Bearer verified-token'},body:{operation:'read',matchId:'match-a'},...overrides},response);
  return capture;
}
test('Planet authenticates the caller, strictly parses operations and never accepts a body UID',async()=>{
  const {calls,dependencies}=setup();
  for(const body of [{operation:'read',matchId:'match-a',uid:'victim'},{operation:'read',matchId:'../escape'},{operation:'deadline',matchId:'match-a'},null,[]]){
    assert.equal((await invoke(dependencies,{body})).status,400);
  }
  assert.equal(calls.length,0);
  const response=await invoke(dependencies);
  assert.equal(response.status,200);assert.deepEqual(calls,[['verified-uid',{operation:'read',matchId:'match-a'}]]);
  assert.equal(response.headers['Cache-Control'],'no-store, private');assert.equal(response.headers.Pragma,'no-cache');
});
test('Planet refuses missing, duplicate, malformed or invalid Auth and hides verifier details',async()=>{
  const {calls,dependencies}=setup();
  for(const authorization of [undefined,['Bearer verified-token'],'Bearer invalid-token','Basic verified-token','Bearer '+'.'.repeat(8200)]){
    const response=await invoke(dependencies,{headers:{'content-type':'application/json',authorization}});
    assert.equal(response.status,401);assert.deepEqual(response.body,{ok:false,serverTimeMs:123,error:{code:'UNAUTHENTICATED'}});
  }
  assert.equal(calls.length,0);
});
test('Planet requires production App Check and checks it before service access',async()=>{
  let checks=0;
  const {calls,dependencies}=setup({configuration:{emulator:false,allowedOrigins:[]},verifyAppCheckToken:async token=>{checks++;if(token!=='valid-appcheck')throw new Error('private appcheck');}});
  assert.equal((await invoke(dependencies)).status,403);
  const headers={'content-type':'application/json',authorization:'Bearer verified-token','x-firebase-appcheck':'invalid'};
  assert.equal((await invoke(dependencies,{headers})).status,403);assert.equal(calls.length,0);
  assert.equal((await invoke(dependencies,{headers:{...headers,'x-firebase-appcheck':'valid-appcheck'}})).status,200);assert.equal(checks,2);
});
test('Planet enforces configured origins and bounded preflights without authorizing operations',async()=>{
  const {calls,dependencies}=setup();
  const headers={origin:'http://localhost:5173','access-control-request-method':'POST','access-control-request-headers':'Authorization, Content-Type'};
  const response=await invoke(dependencies,{method:'OPTIONS',headers});
  assert.equal(response.status,204);assert.equal(response.headers['Access-Control-Allow-Origin'],'http://localhost:5173');
  for(const invalid of [{...headers,origin:'https://evil.example'},{...headers,'access-control-request-method':'GET'},{...headers,'access-control-request-headers':'x-uid'},{...headers,origin:['http://localhost:5173']}]){
    assert.ok([400,403].includes((await invoke(dependencies,{method:'OPTIONS',headers:invalid})).status));
  }
  assert.equal(calls.length,0);
});
test('Planet bounds raw input, methods and media types',async()=>{
  const {calls,dependencies}=setup();
  assert.equal((await invoke(dependencies,{rawBody:new Uint8Array(16385)})).status,413);
  assert.equal((await invoke(dependencies,{method:'GET'})).status,405);
  assert.equal((await invoke(dependencies,{headers:{'content-type':'text/plain'}})).status,415);
  assert.equal(calls.length,0);
});
test('Planet returns safe service failures with useful retry/conflict statuses',async()=>{
  for(const [code,status] of [['FORBIDDEN',403],['UNAUTHENTICATED',401],['RATE_LIMITED',429],['REQUEST_ID_CONFLICT',409],['COMMAND_ID_CONFLICT',409],['UNAVAILABLE',503]]){
    const {dependencies}=setup({service:{handle:async()=>({ok:false,serverTimeMs:123,error:{code}})}});
    assert.equal((await invoke(dependencies)).status,status);
  }
  const {dependencies}=setup({service:{handle:async()=>{throw new Error('role and credential material');}}});
  assert.deepEqual((await invoke(dependencies)).body,{ok:false,serverTimeMs:123,error:{code:'UNAVAILABLE'}});
});

test('Planet timing separates authentication and service without leaking authority or changing the response',async()=>{
  const timings=[];let now=0;
  const {dependencies}=setup({configuration:{emulator:false,allowedOrigins:[]},monotonicClock:()=>now,
    verifyIdToken:async()=>{now+=12;return {uid:'private-user'};},
    verifyAppCheckToken:async()=>{now+=7;},
    service:{handle:async()=>{now+=90;return {ok:true,serverTimeMs:123,result:{private:'role-material'}};}},
    onTiming:summary=>timings.push(summary)});
  const result=await invoke(dependencies,{headers:{'content-type':'application/json',authorization:'Bearer verified-token','x-firebase-appcheck':'private-app-token'}});
  assert.deepEqual(result.body,{ok:true,serverTimeMs:123,result:{private:'role-material'}});
  assert.equal(result.status,200);assert.equal(timings.length,1);
  const {service,...http}=timings[0];
  assert.deepEqual(http,{operation:'read',authMs:12,appCheckMs:7,serviceMs:90,totalMs:109,serviceOk:true});
  assert.ok(service);
  assert.doesNotMatch(JSON.stringify(timings),/private-user|role-material|match-a|verified-token|private-app-token/);
  assert.equal(Object.keys(result.headers).some(key=>/timing/i.test(key)),false);
});

test('Planet timing cannot alter success, refusal or unknown outcome and ignores unauthenticated input',async()=>{
  for(const mode of ['success','refusal','throw']){
    const timings=[];
    const {dependencies}=setup({onTiming:summary=>{timings.push(summary);throw new Error('diagnostic sink unavailable');},
      service:{handle:async()=>{
        if(mode==='throw')throw new Error('private service failure');
        return mode==='success'?{ok:true,serverTimeMs:123,result:{matchId:'match-a'}}:{ok:false,serverTimeMs:123,error:{code:'NOT_ALLOWED'}};
      }}});
    const result=await invoke(dependencies);
    assert.equal(result.status,mode==='throw'?503:200);
    assert.equal(timings.length,1);
    assert.equal(timings[0].serviceOk,mode==='throw'?null:mode==='success');
    assert.doesNotMatch(JSON.stringify(timings),/private service failure|match-a/);
    assert.doesNotMatch(JSON.stringify(result.body),/diagnostic sink unavailable|private service failure/);
  }
  const timings=[];
  const {dependencies}=setup({onTiming:summary=>timings.push(summary)});
  await invoke(dependencies,{headers:{'content-type':'application/json'}});
  await invoke(dependencies,{body:{operation:'read',matchId:'match-a',extra:'private'}});
  assert.deepEqual(timings,[]);
  const asyncFailure=setup({onTiming:async()=>{throw new Error('asynchronous sink failure');}});
  assert.equal((await invoke(asyncFailure.dependencies)).status,200);
});
