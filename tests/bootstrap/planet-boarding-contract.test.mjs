import test from 'node:test';
import assert from 'node:assert/strict';
import {PLANET_GAME_PINS,PlanetSessionSnapshotSchema,PLANET_BOARDING_DURATION_MS} from '../../packages/contracts/dist/index.js';
const snapshot=(count=7)=>({matchId:'boarding-contract',roomCode:'ABC123',versions:{...PLANET_GAME_PINS,assetManifestVersion:'design-0.7.0'},setupFlowVersion:2,status:'boarding',playerCount:count,isHost:true,selfSeatId:null,admission:null,
  members:Array.from({length:count},(_,i)=>({seatId:`seat-${i+1}`,displayName:`Crew ${i+1}`,characterId:`c${i+1}`,controller:'bot',ready:true})),pendingAdmissions:[],
  setup:{id:'boarding-1',startedAt:100000,endsAt:110000},privateRole:null,publicView:null,playerView:null});
for(const count of [7,8,9])test(`${count}: boarding is an explicit setup version with a ten-second admitted public interval`,()=>{
  const value=snapshot(count);assert.equal(value.setup.endsAt-value.setup.startedAt,PLANET_BOARDING_DURATION_MS);
  assert.deepEqual(PlanetSessionSnapshotSchema.parse(value),value);
});
test('legacy snapshots retain exactly their existing JSON shape and cannot acquire boarding',()=>{
  const {setupFlowVersion,...legacy}=snapshot();legacy.status='reading';legacy.setup={id:'reading-1',endsAt:100000};
  assert.deepEqual(PlanetSessionSnapshotSchema.parse(legacy),legacy);
  assert.equal(PlanetSessionSnapshotSchema.safeParse({...legacy,status:'boarding'}).success,false);
  for(const setupFlowVersion of [1,3,'2',null])assert.equal(PlanetSessionSnapshotSchema.safeParse({...legacy,setupFlowVersion}).success,false);
});
test('boarding rejects malformed interval, unready roster and private/game payloads',()=>{
  for(const patch of [{setup:null},{setup:{id:'b-1',endsAt:110000}},{setup:{...snapshot().setup,endsAt:109999}},
    {setup:{...snapshot().setup,deadlineToken:'private'}},{members:snapshot().members.slice(1)},
    {members:snapshot().members.map((m,i)=>i?m:{...m,ready:false})},
    {members:snapshot().members.map((m,i)=>i?m:{...m,characterId:null})},
    {privateRole:{role:'Doctor',faction:'Blue',knowledge:{insiderSeatIds:[],knownUndercoverSeatId:null,scanResults:[]}}},
    {publicView:{}},{playerView:{}}])assert.equal(PlanetSessionSnapshotSchema.safeParse({...snapshot(),...patch}).success,false);
});
test('pending/closed boarding reads remain scrubbed and never receive interval or public roster',()=>{
  for(const status of ['pending','closed','declined']){
    const denied={...snapshot(),isHost:false,admission:{requestId:'join-1',kind:'display',status},members:[],setup:null};
    assert.deepEqual(PlanetSessionSnapshotSchema.parse(denied),denied);
    assert.equal(PlanetSessionSnapshotSchema.safeParse({...denied,setup:snapshot().setup}).success,false);
    assert.equal(PlanetSessionSnapshotSchema.safeParse({...denied,members:snapshot().members}).success,false);
  }
});
test('boarding timing never leaks into choosing/reading or into the gameplay versions object',()=>{
  for(const status of ['choosing','reading','running'])assert.equal(PlanetSessionSnapshotSchema.safeParse({...snapshot(),status}).success,false);
  assert.equal(PlanetSessionSnapshotSchema.safeParse({...snapshot(),versions:{...snapshot().versions,setupFlowVersion:2}}).success,false);
});
