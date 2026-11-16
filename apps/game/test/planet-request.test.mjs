import assert from 'node:assert/strict';
import {test} from 'node:test';
import {postHostedPlanetFoodDelivery,postHostedPlanetRequest} from '../dist/browser/planet-request.js';
const projectId='mothership-test-project';
const config={projectId,apiKey:'A'.repeat(30),appId:'1:1234567890:web:abc123',messagingSenderId:'1234567890',authDomain:`${projectId}.firebaseapp.com`,pageOrigin:`https://${projectId}.web.app`,recaptchaEnterpriseSiteKey:'B'.repeat(30)};
test('planned planetApi connection sends current Auth and App Check proof with exact protocol-3 body',async()=>{
 let captured=null;const body={operation:'read',matchId:'planet-local'};
 const response=await postHostedPlanetRequest(config,{getIdToken:async()=>'test-id-token',getAppCheckToken:async()=>'test-app-check',fetch:async(url,options)=>{captured={url,options};return {text:async()=>JSON.stringify({ok:true,serverTimeMs:1000,result:null})};}},body);
 assert.equal(captured.url,`https://us-central1-${projectId}.cloudfunctions.net/planetApi`);assert.equal(captured.options.redirect,'error');assert.equal(captured.options.credentials,'omit');assert.equal(captured.options.cache,'no-store');assert.equal(captured.options.headers.authorization,'Bearer test-id-token');assert.equal(captured.options.headers['X-Firebase-AppCheck'],'test-app-check');assert.deepEqual(JSON.parse(captured.options.body),body);assert.equal(response.ok,true);
});
test('invalid body cannot choose a UID, endpoint or legacy protocol before network access',async()=>{
 let calls=0;const ports={getIdToken:async()=>{calls++;return 'x';},getAppCheckToken:async()=>'y',fetch:async()=>{throw Error('must not send');}};
 await assert.rejects(postHostedPlanetRequest(config,ports,{operation:'read',matchId:'planet-local',uid:'foreign'}));
 await assert.rejects(postHostedPlanetRequest(config,ports,{operation:'command',request:{protocolVersion:2,matchId:'planet-local',phaseId:'phase-1',commandId:'command-1',command:{type:'PASS_TURN'}}}));assert.equal(calls,0);
});
const scope={version:1,matchId:'planet-local',phaseId:'food-phase',foodStepId:'food-step'};
test('Food watch uses the existing authenticated endpoint and delivers complete UTF-8 events only',async()=>{
 const request={operation:'foodWatch',...scope},controller=new AbortController(),received=[];
 const encoder=new TextEncoder();
 const bytes=encoder.encode(': keepalive\r\n\r\ndata: {"value":"é"}\r\n\r\ndata: {"value":2}\n\ndata: {"incomplete":true}');
 const response=new Response(new ReadableStream({start(reader){for(const byte of bytes)reader.enqueue(Uint8Array.of(byte));reader.close();}}),{headers:{'content-type':'text/event-stream; charset=utf-8'}});
 const ports={getIdToken:async()=>'id-token',getAppCheckToken:async()=>'app-check',async fetch(url,options){
  assert.equal(url,`https://us-central1-${projectId}.cloudfunctions.net/planetApi`);
  assert.equal(options.method,'POST');assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');
  assert.equal(options.headers.authorization,'Bearer id-token');assert.equal(options.headers['X-Firebase-AppCheck'],'app-check');
  assert.deepEqual(JSON.parse(options.body),request);assert.equal(options.signal,controller.signal);return response;
 }};
 await postHostedPlanetFoodDelivery(config,ports,request,controller.signal,frame=>received.push(frame));
 assert.deepEqual(received,[{value:'é'},{value:2}]);
});
test('Food delivery exposes paired JSON and safe refusals and aborts delayed credentials before dispatch',async()=>{
 const controller=new AbortController(),receive=()=>assert.fail('a refusal is not a frame');
 const refusal={ok:false,serverTimeMs:6000,error:{code:'FORBIDDEN'}};
 const clock={ok:true,scope,receivedAt:6001,serverTimeMs:6002};
 const ports={getIdToken:async()=>'id-token',getAppCheckToken:async()=>'app-check',async fetch(_url,options){
  return JSON.parse(options.body).operation==='foodClock'?Response.json(clock):Response.json(refusal,{status:403});
 }};
 assert.deepEqual(await postHostedPlanetFoodDelivery(config,ports,{operation:'foodWatch',...scope},controller.signal,receive),refusal);
 assert.deepEqual(await postHostedPlanetFoodDelivery(config,ports,{operation:'foodClock',...scope},controller.signal),clock);
 let release,calls=0;
 const pending=postHostedPlanetFoodDelivery(config,{...ports,getIdToken:()=>new Promise(r=>{release=r;}),fetch:async()=>{calls++;throw Error('must not send');}},
  {operation:'foodWatch',...scope},controller.signal,receive);
 controller.abort();await assert.rejects(pending,{name:'AbortError'});release('late-token');await Promise.resolve();assert.equal(calls,0);
});
