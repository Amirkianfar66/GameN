import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {setImmediate as tick} from 'node:timers/promises';
import {PlanetFoodStreamFrameSchema} from '@mothership/contracts';
import {createPlanetHttpHandler} from '../dist/planet.js';
import {handlePlanetFoodTransport} from '../dist/planet-food-stream.js';
import {setupNativeHumanFood} from '../../../services/game-api/test/planet-food-native-service-control.mjs';

async function fixture(){
  const {h,snapshot}=await setupNativeHumanFood();
  const offer={version:1,phaseId:snapshot.publicView.phase.id,foodStepId:snapshot.foodPublicView.step.stepId};
  snapshot.foodStream=offer;
  return {h,snapshot,scope:{...offer,matchId:snapshot.matchId}};
}
function response({backpressure=false}={}){
  const events=new EventEmitter(),frames=[],capture={headers:{},status:0,json:null,ended:0};
  const res={...capture,set(k,v){capture.headers[k]=v;return res;},status(v){capture.status=v;return res;},
    json(v){capture.json=v;return res;},on:(...args)=>events.on(...args),off:(...args)=>events.off(...args),
    write(line){const value=JSON.parse(line.slice(6).trim());PlanetFoodStreamFrameSchema.parse(value);frames.push(value);return !backpressure;},
    end(){capture.ended++;events.emit('close');},flushHeaders(){}};
  return {res,frames,capture,events};
}
async function until(predicate){for(let n=0;n<100&&!predicate();n++)await tick();assert.ok(predicate(),'expected transport progress');}

test('Food transport uses the normal HTTP authentication and strict request boundary without gameplay reads',async()=>{
  const {snapshot,scope}=await fixture();let projections=0,gameplay=0,now=1000;
  const service={handle:async()=>{gameplay++;throw new Error('must not enter game queue');},
    projectFoodInboxDelivery:async(uid,id)=>{assert.equal(uid,'verified');assert.equal(id,scope.matchId);projections++;now+=10;return {snapshot,fresh:true};},
    subscribeFoodInboxMatch:async()=>()=>{}};
  const handler=createPlanetHttpHandler({service,configuration:{emulator:false,allowedOrigins:['https://game.test']},clock:()=>now,
    verifyIdToken:async(token)=>{if(token!=='valid')throw new Error('secret');return {uid:'verified'};},
    verifyAppCheckToken:async(token)=>{if(token!=='checked')throw new Error('secret');}});
  const request={method:'POST',headers:{origin:'https://game.test','content-type':'application/json',authorization:'Bearer valid','x-firebase-appcheck':'checked'},
    body:{operation:'foodClock',...scope}};
  for(const patch of [{headers:{...request.headers,origin:'https://other.test'}},{headers:{...request.headers,authorization:'Bearer invalid'}},
    {headers:{...request.headers,'x-firebase-appcheck':'invalid'}},{body:{...request.body,taskId:'private-task'}}]){
    const out=response();await handler({...request,...patch},out.res);assert.ok(out.capture.status>=400);
  }
  assert.equal(projections,0);
  const out=response();await handler(request,out.res);
  assert.equal(out.capture.status,200);assert.deepEqual(out.capture.json,{ok:true,scope,receivedAt:1000,serverTimeMs:1010});
  assert.equal(gameplay,0);assert.equal(projections,1);assert.equal(out.capture.headers['Cache-Control'],'no-store, private');
});

test('stream emits authorized changes only, then returns the final same-player Session and detaches',async()=>{
  const {h,snapshot,scope}=await fixture(),out=response();let current={snapshot,fresh:true},changed,stops=0,reads=0;
  const service={projectFoodInboxDelivery:async()=>{reads++;return structuredClone(current);},
    subscribeFoodInboxMatch:async(_u,_m,onChange)=>{changed=onChange;return ()=>{stops++;};}};
  const pending=handlePlanetFoodTransport({service,uid:h.players[0],request:{operation:'foodWatch',...scope},response:out.res,receivedAt:0,clock:h.now,maxStreamMs:2000});
  await until(()=>changed&&reads>=2);
  assert.equal(out.frames.length,1);assert.match(out.capture.headers['Content-Type'],/^text\/event-stream/);
  current.snapshot.foodPublicView.serverNowMs++;
  current.snapshot.foodPlayerView.serverNowMs++;
  changed();await until(()=>reads>=3);await tick();assert.equal(out.frames.length,1,'sampled clocks do not expose storage notification cadence');
  current.fresh=false;changed();await until(()=>out.frames.length===2);assert.equal(out.frames[1].fresh,false);
  current.fresh=true;current.snapshot.foodPlayerView.viewRevision++;changed();await until(()=>out.frames.length===3);
  await h.operation(h.host,'abort',{matchId:h.matchId});
  current={snapshot:await h.read(h.players[0]),fresh:true};changed();await pending;
  assert.equal(out.frames.at(-1).kind,'closed');assert.equal(out.frames.at(-1).reason,'phase-ended');
  assert.equal(out.frames.at(-1).snapshot.status,'aborted');
  assert.deepEqual(out.frames.map(f=>f.frameSequence),[1,2,3,4]);
  assert.equal(new Set(out.frames.map(f=>f.frameEpoch)).size,1);assert.equal(stops,1);
  assert.equal(out.events.listenerCount('close'),0);assert.equal(out.events.listenerCount('drain'),0);
});

test('an interrupted or revoked stream exposes no error details or final private snapshot',async()=>{
  for(const mode of ['revoked','failure','timeout']){
    const {snapshot,scope}=await fixture(),out=response();let current={snapshot,fresh:true},changed,failed,stops=0;
    const service={projectFoodInboxDelivery:async()=>current,
      subscribeFoodInboxMatch:async(_u,_m,onChange,onFailure)=>{changed=onChange;failed=onFailure;return ()=>stops++;}};
    const pending=handlePlanetFoodTransport({service,uid:'player',request:{operation:'foodWatch',...scope},response:out.res,receivedAt:0,clock:()=>9000,maxStreamMs:mode==='timeout'?20:2000});
    await until(()=>changed);
    if(mode==='revoked'){current=null;changed();}
    if(mode==='failure')failed(new Error('private backend state'));
    await pending;
    const end=out.frames.at(-1);assert.equal(end.kind,'closed');assert.equal(end.reason,mode==='revoked'?'authorization':'unavailable');
    assert.equal(Object.hasOwn(end,'snapshot'),false);assert.doesNotMatch(JSON.stringify(out.frames),/private backend state/);assert.equal(stops,1);
  }
});

test('slow subscription and outstanding projection are fenced after disconnect',async()=>{
  const {snapshot,scope}=await fixture(),out=response();let release,subscribed=false,stops=0;
  const service={projectFoodInboxDelivery:async()=>({snapshot,fresh:true}),subscribeFoodInboxMatch:async()=>{
    subscribed=true;await new Promise(resolve=>{release=resolve;});return ()=>stops++;
  }};
  const pending=handlePlanetFoodTransport({service,uid:'player',request:{operation:'foodWatch',...scope},response:out.res,receivedAt:0,clock:()=>9000,maxStreamMs:2000});
  await until(()=>subscribed);out.events.emit('close');release();await pending;
  assert.equal(stops,1);assert.equal(out.frames.length,1);assert.equal(out.events.listenerCount('close'),0);
});

test('backpressure coalesces updates, keeps the accepted first frame and reprojects on drain',async()=>{
  const {snapshot,scope}=await fixture(),out=response({backpressure:true});let changed,reads=0;
  const service={projectFoodInboxDelivery:async()=>{reads++;return {snapshot,fresh:true};},
    subscribeFoodInboxMatch:async(_u,_m,callback)=>{changed=callback;return ()=>{};}};
  const pending=handlePlanetFoodTransport({service,uid:'player',request:{operation:'foodWatch',...scope},response:out.res,receivedAt:0,clock:()=>9000,maxStreamMs:2000});
  await until(()=>changed);changed();changed();await tick();assert.equal(reads,1);assert.equal(out.capture.ended,0);
  snapshot.foodPlayerView.viewRevision++;out.events.emit('drain');await until(()=>out.frames.length===2);
  assert.equal(reads,2);out.events.emit('close');await pending;
});
