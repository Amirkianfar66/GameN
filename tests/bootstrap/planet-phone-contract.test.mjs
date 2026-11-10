import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {PLANET_PHONE_OFFER_PINS,PLANET_PHONE_ENGINE_PROFILE,PLANET_GAME_PINS,PLANET_SYNC_PINS,PLANET_ORIGINAL_PINS,
 PlanetVersionsSchema,PlanetOfferSchema,PlanetSessionSnapshotSchema,PLANET_SETUP_FLOW_VERSION,
 PLANET_TIMED_READING_SETUP_FLOW_VERSION,PLANET_ROLE_CARD_DURATION_MS,PLANET_ROLE_FILM_DURATION_MS,
 PLANET_READING_DURATION_MS,CrewCharacterIdSchema,planetSupportsPhase} from '../../packages/contracts/dist/index.js';
const versions=p=>({...p,assetManifestVersion:'synthetic-phone-contract-art'});
const copy=v=>structuredClone(v);
function snapshot(count=7,flow=3,status='reading'){
 return {matchId:'phone-contract',roomCode:'ABC123',versions:versions(PLANET_GAME_PINS),setupFlowVersion:flow,
  status,playerCount:count,isHost:false,selfSeatId:null,admission:{requestId:'display-admission',kind:'display',status:'admitted'},
  members:Array.from({length:count},(_,i)=>({seatId:`seat-${i+1}`,displayName:`Crew ${i+1}`,characterId:CrewCharacterIdSchema.options[i],controller:'bot',ready:true})),
  pendingAdmissions:[],setup:status==='reading'?{id:'reading',startedAt:1000,roleFilmStartsAt:21000,endsAt:31000}:{id:'boarding',startedAt:31000,endsAt:41000},privateRole:null,publicView:null,playerView:null};
}
test('phone candidate explicitly inherits frozen1.1 canonical rules without relabeling the authority or creation default',()=>{
 const record=JSON.parse(readFileSync(new URL('../../docs/backend/planet-phone-interface-compatibility-2026-11-10.json',import.meta.url)));
 const bytes=readFileSync(new URL('../../'+record.canonicalAuthority.path,import.meta.url));
 assert.deepEqual(record.candidatePins,PLANET_PHONE_OFFER_PINS);assert.equal(record.creationProfile,PLANET_PHONE_ENGINE_PROFILE);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),PLANET_GAME_PINS.rulesetHash);
 assert.equal(JSON.parse(bytes).engine_version,'planet-game-1.1.0');assert.equal(PLANET_GAME_PINS.engineVersion,'planet-game-1.1.0');
 assert.equal(PLANET_PHONE_OFFER_PINS.rulesetHash,PLANET_GAME_PINS.rulesetHash);
 assert.equal(PLANET_PHONE_OFFER_PINS.rulesetVersion,PLANET_GAME_PINS.rulesetVersion);
 assert.equal(PLANET_SETUP_FLOW_VERSION,2);assert.equal(PLANET_TIMED_READING_SETUP_FLOW_VERSION,3);
});
test('only exactly registered candidate and historical tuples parse; unknown and mixed canonical rules fail closed',()=>{
 const pins=[PLANET_ORIGINAL_PINS,PLANET_SYNC_PINS,PLANET_GAME_PINS,PLANET_PHONE_OFFER_PINS];
 for(const p of pins)assert.deepEqual(PlanetVersionsSchema.parse(versions(p)),versions(p));
 for(const p of [PLANET_ORIGINAL_PINS,PLANET_SYNC_PINS])for(const key of ['rulesetVersion','rulesetHash'])
  assert.equal(PlanetVersionsSchema.safeParse({...versions(PLANET_PHONE_OFFER_PINS),[key]:p[key]}).success,false);
 for(const engineVersion of ['planet-game-1.2.1','planet-game-99'])assert.equal(PlanetVersionsSchema.safeParse({...versions(PLANET_PHONE_OFFER_PINS),engineVersion}).success,false);
 for(const p of [PLANET_GAME_PINS,PLANET_PHONE_OFFER_PINS]){
  assert.equal(planetSupportsPhase(versions(p),'NAV_SETTING'),true);assert.equal(planetSupportsPhase(versions(p),'NAV_TIE'),false);
  assert.equal(planetSupportsPhase(versions(p),'BLACKHOLE_PRESENTATION'),true);
 }
});
test('declaration choices are a bounded private declaration-offer field and remain optional in the historical shape',()=>{
 const offer={type:'DECLARE_HACK_SIDE',targetSeatIds:[],slotIds:[],windowIds:[],promiseTargetSeatIds:[]};
 assert.deepEqual(PlanetOfferSchema.parse(offer),offer);
 for(const declaredSides of [['Blue'],['Red'],['Blue','Red','Alien']])assert.deepEqual(PlanetOfferSchema.parse({...offer,declaredSides}).declaredSides,declaredSides);
 for(const declaredSides of [[],['Blue','Blue'],['Unknown'],['Blue','Red','Alien','Blue']])assert.equal(PlanetOfferSchema.safeParse({...offer,declaredSides}).success,false);
 for(const type of ['PANEL_CODE','MOVE','REQUEST_HACK'])assert.equal(PlanetOfferSchema.safeParse({...offer,type,declaredSides:['Blue']}).success,false);
});
for(const count of [7,8,9]){
 test(`${count}: saved flow3 exposes exact20s card plus10s film and independent10s boarding`,()=>{
  assert.equal(PLANET_ROLE_CARD_DURATION_MS,20000);assert.equal(PLANET_ROLE_FILM_DURATION_MS,10000);assert.equal(PLANET_READING_DURATION_MS,30000);
  for(const status of ['reading','boarding'])assert.deepEqual(PlanetSessionSnapshotSchema.parse(snapshot(count,3,status)),snapshot(count,3,status));
  assert.deepEqual(PlanetSessionSnapshotSchema.parse(snapshot(count,2,'boarding')),snapshot(count,2,'boarding'));
  for(const patch of [{startedAt:undefined},{roleFilmStartsAt:undefined},{roleFilmStartsAt:20999},{endsAt:30999},{startedAt:-1},{roleFilmStartsAt:21000.5}]){
   const v=snapshot(count);Object.assign(v.setup,patch);assert.equal(PlanetSessionSnapshotSchema.safeParse(v).success,false);
  }
 });
 test(`${count}: new timing cannot contaminate saved absent/2 packets, other stages or denied audiences`,()=>{
  const legacy=snapshot(count,2);legacy.setup={id:'reading',endsAt:31000};assert.deepEqual(PlanetSessionSnapshotSchema.parse(legacy),legacy);
  delete legacy.setupFlowVersion;assert.deepEqual(PlanetSessionSnapshotSchema.parse(legacy),legacy);
  assert.equal(PlanetSessionSnapshotSchema.safeParse(snapshot(count,2)).success,false);
  for(const status of ['choosing','boarding','running'])assert.equal(PlanetSessionSnapshotSchema.safeParse({...snapshot(count),status}).success,false);
  for(const flow of [1,4])assert.equal(PlanetSessionSnapshotSchema.safeParse({...snapshot(count),setupFlowVersion:flow}).success,false);
  const denied={...snapshot(count),admission:{requestId:'not-admitted',kind:'display',status:'pending'},members:[],setup:null};
  assert.deepEqual(PlanetSessionSnapshotSchema.parse(denied),denied);
  assert.equal(PlanetSessionSnapshotSchema.safeParse({...denied,setup:snapshot(count).setup}).success,false);
  const bad=copy(snapshot(count));bad.members[0].characterId=null;assert.equal(PlanetSessionSnapshotSchema.safeParse(bad).success,false);
 });
}
