import test from 'node:test';
import assert from 'node:assert/strict';
import {PLANET_GAME_PINS,PlanetAdmissionStandingSchema,PlanetSessionSnapshotSchema,PlanetRecoveryResultSchema} from '../../packages/contracts/dist/index.js';
const pending=()=>({matchId:'match-1',roomCode:'ABC123',versions:{...PLANET_GAME_PINS,assetManifestVersion:'design-0.6.0'},status:'lobby',playerCount:7,isHost:false,selfSeatId:null,
  admission:{requestId:'original-join',kind:'display',status:'pending'},members:[],pendingAdmissions:[],setup:null,privateRole:null,publicView:null,playerView:null});
test('R14 standing names only the original request and admitted audience; client UIDs are forbidden',()=>{
  for(const status of ['pending','admitted','declined','closed'])assert.equal(PlanetAdmissionStandingSchema.safeParse({...pending().admission,status}).success,true);
  assert.equal(PlanetAdmissionStandingSchema.safeParse({...pending().admission,uid:'forged'}).success,false);
  assert.equal(PlanetAdmissionStandingSchema.safeParse({...pending().admission,status:'approved'}).success,false);
  assert.equal(PlanetSessionSnapshotSchema.safeParse(pending()).success,true);
});
test('pending/declined/closed packets reject roster, setup, seats and host-only admissions',()=>{
  const member={seatId:'seat-1',displayName:'Crew',characterId:null,controller:'human',ready:false};
  for(const status of ['pending','declined','closed'])for(const patch of [
    {members:[member]},{setup:{id:'choice-1',endsAt:30000}},{selfSeatId:'seat-1'},{isHost:true},
    {pendingAdmissions:[{id:'request-2',kind:'player',displayName:'Other'}]},
  ])assert.equal(PlanetSessionSnapshotSchema.safeParse({...pending(),admission:{...pending().admission,status},...patch}).success,false);
});
test('display standing cannot be attached to a player seat; host has no requester admission',()=>{
  assert.equal(PlanetSessionSnapshotSchema.safeParse({...pending(),admission:{...pending().admission,status:'admitted'},selfSeatId:'seat-1'}).success,false);
  assert.equal(PlanetSessionSnapshotSchema.safeParse({...pending(),admission:null,isHost:true}).success,true);
  const {admission,...missing}=pending();assert.equal(PlanetSessionSnapshotSchema.safeParse(missing).success,false);
});
test('recovery confirms the requested match and server-assigned seat',()=>{
  assert.deepEqual(PlanetRecoveryResultSchema.parse({matchId:'match-1',seatId:'seat-1'}),{matchId:'match-1',seatId:'seat-1'});
  assert.equal(PlanetRecoveryResultSchema.safeParse({seatId:'seat-1'}).success,false);
  assert.equal(PlanetRecoveryResultSchema.safeParse({matchId:'match-1',seatId:'seat-1',uid:'client-uid'}).success,false);
});
