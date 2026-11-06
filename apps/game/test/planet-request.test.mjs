import assert from 'node:assert/strict';
import {test} from 'node:test';
import {postHostedPlanetRequest} from '../dist/browser/planet-request.js';
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
