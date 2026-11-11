import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PLANET_GAME_PINS,PLANET_PHONE_OFFER_PINS,PLANET_PHONE_ENGINE_PROFILE} from '@mothership/contracts';
import {createPlanetService} from '../dist/planet-game.js';
import {createProductionPlanetService} from '../dist/planet-engine.js';
import {planetServiceHarness,ok} from './planet-service-helper.mjs';
import {beginPlanetReading} from './planet-boarding-helper.mjs';

test('setup flow, artwork and the candidate engine profile select new creations independently with historical defaults',async()=>{
  for(const setupFlowVersion of [undefined,1,2,3])for(const engineProfile of [undefined,PLANET_PHONE_ENGINE_PROFILE]){
    const h=await planetServiceHarness({setupFlowVersion,engineProfile}),s=await h.current();
    assert.deepEqual(s.versions,{...(engineProfile?PLANET_PHONE_OFFER_PINS:PLANET_GAME_PINS),assetManifestVersion:'design-0.6.0'});
    assert.equal(s.setupFlowVersion,setupFlowVersion===2||setupFlowVersion===3?setupFlowVersion:undefined);
    assert.equal(Object.hasOwn(s,'setupFlowVersion'),setupFlowVersion===2||setupFlowVersion===3);
    const factory=createProductionPlanetService({...h.options});
    const created=ok(await factory.handle(h.host,{operation:'create',requestId:h.nextId(),playerCount:7}));
    const saved=await h.store.transaction(tx=>tx.get('session/'+created.matchId));assert.deepEqual(saved.versions,s.versions);assert.equal(saved.setupFlowVersion,s.setupFlowVersion);
  }
});

test('creation retries retain original setup and engine pins when both creation opt-ins change',async()=>{
  const h=await planetServiceHarness({setupFlowVersion:2}),request={operation:'create',requestId:h.nextId(),playerCount:7};
  const original=await h.service.handle(h.host,request),created=ok(original),before=await h.store.transaction(tx=>tx.get('session/'+created.matchId));
  h.reload({setupFlowVersion:3,engineProfile:PLANET_PHONE_ENGINE_PROFILE,assetManifestVersion:'design-0.8.0'});
  assert.deepEqual(await h.service.handle(h.host,request),original);assert.deepEqual(await h.store.transaction(tx=>tx.get('session/'+created.matchId)),before);
  const next=ok(await h.service.handle(h.host,{...request,requestId:h.nextId()})),saved=await h.store.transaction(tx=>tx.get('session/'+next.matchId));
  assert.equal(saved.setupFlowVersion,3);assert.deepEqual(saved.versions,{...PLANET_PHONE_OFFER_PINS,assetManifestVersion:'design-0.8.0'});
});

test('new creation configuration never relabels an existing flow-2 reading interval or accepts its Ready differently',async()=>{
  const h=await planetServiceHarness({setupFlowVersion:2}),before=await beginPlanetReading(h);
  h.reload({setupFlowVersion:3,engineProfile:PLANET_PHONE_ENGINE_PROFILE,assetManifestVersion:'design-0.8.0'});
  assert.equal((await h.read(h.players[0])).setupFlowVersion,2);ok(await h.operation(h.players[0],'ready',{matchId:h.matchId}));
  const ready=await h.current();assert.equal(ready.members[0].ready,true);assert.deepEqual(ready.setup,before.setup);assert.deepEqual(ready.versions,before.versions);
  await h.deadline();const boarded=await h.current();assert.equal(boarded.status,'boarding');assert.equal(boarded.setupFlowVersion,2);
  assert.deepEqual(boarded.versions,before.versions);assert.equal(boarded.setup.endsAt-boarded.setup.startedAt,10_000);
});

test('unknown direct service opt-ins fail construction instead of silently selecting a profile',async()=>{
  const h=await planetServiceHarness();
  for(const engineProfile of ['','planet-game-1.2.0','unknown',null])assert.throws(()=>createPlanetService({...h.options,engineProfile}),/Unsupported Planet engine profile/);
  for(const setupFlowVersion of [0,4,'3',null])assert.throws(()=>createPlanetService({...h.options,setupFlowVersion}),/Unsupported Planet setup flow version/);
});
