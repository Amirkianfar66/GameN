import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PLANET_GAME_PINS,PLANET_PHONE_OFFER_PINS,PLANET_PHONE_ENGINE_PROFILE,PLANET_BLACKOUT_PINS,PLANET_BLACKOUT_ENGINE_PROFILE} from '@mothership/contracts';
import {createProductionPlanetService} from '../dist/planet-engine.js';
import {planetServiceHarness,ok} from './planet-service-helper.mjs';

for(const count of [7,8,9])test(`${count}: Blackout creation is exact, opt-in and independent of saved setup/artwork`,async()=>{
 for(const setupFlowVersion of [undefined,1,2,3])for(const [engineProfile,pins]of [[undefined,PLANET_GAME_PINS],[PLANET_PHONE_ENGINE_PROFILE,PLANET_PHONE_OFFER_PINS],[PLANET_BLACKOUT_ENGINE_PROFILE,PLANET_BLACKOUT_PINS]]){
  const h=await planetServiceHarness({count,humans:0,engineProfile,setupFlowVersion,assetManifestVersion:'design-0.8.0'}),saved=await h.current();
  assert.deepEqual(saved.versions,{...pins,assetManifestVersion:'design-0.8.0'});
  assert.equal(saved.setupFlowVersion,setupFlowVersion===2||setupFlowVersion===3?setupFlowVersion:undefined);
  const production=createProductionPlanetService(h.options);
  const result=ok(await production.handle(h.host,{operation:'create',requestId:h.nextId(),playerCount:count}));
  assert.deepEqual((await h.store.transaction(tx=>tx.get('session/'+result.matchId))).versions,saved.versions);
 }
});
test('a retried creation retains its original tuple across candidate activation and rollback selections',async()=>{
 const h=await planetServiceHarness({humans:0}),request={operation:'create',requestId:h.nextId(),playerCount:9};
 const first=await h.service.handle(h.host,request),created=ok(first),historical=await h.store.transaction(tx=>tx.get('session/'+created.matchId));
 h.reload({engineProfile:PLANET_BLACKOUT_ENGINE_PROFILE,setupFlowVersion:3,assetManifestVersion:'design-0.8.0'});
 assert.deepEqual(await h.service.handle(h.host,request),first);assert.deepEqual(await h.store.transaction(tx=>tx.get('session/'+created.matchId)),historical);
 const candidateRequest={...request,requestId:h.nextId()},candidate=await h.service.handle(h.host,candidateRequest),candidateId=ok(candidate).matchId;
 const saved=await h.store.transaction(tx=>tx.get('session/'+candidateId));
 assert.deepEqual(saved.versions,{...PLANET_BLACKOUT_PINS,assetManifestVersion:'design-0.8.0'});assert.equal(saved.setupFlowVersion,3);
 h.reload({engineProfile:undefined});
 assert.deepEqual(await h.service.handle(h.host,candidateRequest),candidate);assert.deepEqual(await h.store.transaction(tx=>tx.get('session/'+candidateId)),saved);
});
