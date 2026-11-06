import assert from 'node:assert/strict';
import {test} from 'node:test';
import {abortMatchForCleanup} from '../test-emulator/support/cleanup.mjs';
const request={protocolVersion:2,matchId:'local-cleanup-match',requestId:'original-abort-request'};

test('cleanup reconciles a committed abort after a timeout and rate limit using the identical body',async()=>{
 const attempts=[],waits=[],cache=new Map();let commits=0;
 const replies=[{kind:'no-response',reason:'timeout'},{kind:'api-failure',code:'RATE_LIMITED',retryAfterMs:1000},null];
 const api={async abortMatch(body){attempts.push(structuredClone(body));assert.ok(Object.isFrozen(body));const key=JSON.stringify(body);if(!cache.has(key)){commits++;cache.set(key,{kind:'done',result:true});}return replies.shift()??cache.get(key);}};
 const result=await abortMatchForCleanup(api,request,{wait:async ms=>{waits.push(ms);}});assert.deepEqual(result,{kind:'done',result:true});assert.equal(commits,1);assert.deepEqual(attempts,[request,request,request]);assert.deepEqual(waits,[500,1000]);
});
test('cleanup fails after its bounded identical retries rather than accepting a missing reply',async()=>{
 const attempts=[],waits=[];await assert.rejects(abortMatchForCleanup({async abortMatch(body){attempts.push(structuredClone(body));return {kind:'no-response',reason:'timeout'};}},request,{wait:async ms=>{waits.push(ms);}}),/unresolved after three identical attempts/);assert.deepEqual(attempts,[request,request,request]);assert.deepEqual(waits,[500,1000]);
});
test('cleanup retains a first UNAVAILABLE abort and verifies the eventual success',async()=>{
 const attempts=[],replies=[{kind:'api-failure',code:'UNAVAILABLE',retryAfterMs:null},{kind:'done',result:true}];await abortMatchForCleanup({async abortMatch(body){attempts.push(structuredClone(body));return replies.shift();}},request,{wait:async()=>{}});assert.deepEqual(attempts,[request,request]);
});
test('cleanup rejects a definitive refusal without masking it or issuing a replacement',async()=>{
 let calls=0;await assert.rejects(abortMatchForCleanup({async abortMatch(){calls++;return {kind:'api-failure',code:'FORBIDDEN',retryAfterMs:null};}},request,{wait:async()=>{assert.fail('No retry after definitive refusal');}}),/refused: api-failure FORBIDDEN/);assert.equal(calls,1);
});
test('cleanup requires a true success and never exceeds a server retry wait budget',async()=>{
 await assert.rejects(abortMatchForCleanup({async abortMatch(){return {kind:'done',result:false};}},request),/verified abort success/);
 await assert.rejects(abortMatchForCleanup({async abortMatch(){return {kind:'api-failure',code:'RATE_LIMITED',retryAfterMs:5000};}},request,{wait:async()=>{assert.fail('Over-budget wait must fail');}}),/bounded budget/);
});
