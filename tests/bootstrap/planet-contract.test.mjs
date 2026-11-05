import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {
  PLANET_GAME_PINS, PlanetVersionsSchema, PlanetCommandRequestSchema, PlanetRoleSchema,
  PlanetRoundSchema, PlanetPublicViewSchema, PlanetPlayerViewSchema, PlanetDrawingSchema,
  PlanetPhaseSchema, FullCommandRequestSchema,
} from '../../packages/contracts/dist/index.js';

const publicView = () => ({
  versions:{...PLANET_GAME_PINS,assetManifestVersion:'design-0.5.0'},matchId:'synthetic-planet',viewRevision:1,round:7,playerCount:7,
  phase:{id:'neutral-phase-7',kind:'ORDINARY_TURN',startedAt:1000,endsAt:61000},activeSeatId:'seat-1',
  offices:{captainSeatId:null,officerSeatId:null,blockedSeatId:null},
  board:{kind:'FINALIZED',finalizedRound:6,seats:Array.from({length:7},(_,i)=>({
    seatId:`seat-${i+1}`,health:'Healthy',location:i<3?'Room A':'Room B',slotId:i<3?`A${i+1}`:`B${i-2}`,
    jailed:false,captain:false,officer:false,revealedFaction:null,rescueDueAfterRound:null,
  }))},
  hackSession:null,blackout:null,ballot:{eligibleVoters:[],eligibleTargets:[]},lastTally:null,
  navigation:{lastMovedRound:6,arrivedAt:null},events:[],result:null,endReveal:null,
});
const playerView = () => ({
  ...publicView(),board:{...publicView().board,kind:'PLAYER_CURRENT'},
  self:{seatId:'seat-1',role:'Insider',faction:'Blue',ordinaryWeapons:0,movementSpent:false,roleActionSpent:false,shotSpent:false,standardHackSpent:false},
  abilities:{codeAttempted:false,shipHackUnlocked:false,shipHackSpent:false,scanBlockedThroughRound:null,blackholeSpent:false,
    blackoutSpent:false,engineerSpent:false,clone:null,injectionsRemaining:null,panelAttemptSpent:false,protectionGrants:[]},
  knowledge:{insiderSeatIds:['seat-2','seat-5','seat-7'],knownUndercoverSeatId:null,scanResults:[]},
  offers:[],privateNavigation:null,hackFeedback:null,blackoutTargeting:null,promises:[],promiseQuota:{given:false,received:false},windows:[],
});
const request=command=>({protocolVersion:3,matchId:'synthetic-planet',phaseId:'neutral-phase-7',commandId:'synthetic-command',command});

test('successor authority pins every recorded source and leaves historical runtime tuple separate',()=>{
  const path=new URL('../../rules/planet-successor-authority-2026-11-05.json',import.meta.url);
  const bytes=readFileSync(path), authority=JSON.parse(bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),PLANET_GAME_PINS.rulesetHash);
  for(const source of authority.sources) assert.equal(
    createHash('sha256').update(readFileSync(new URL('../../'+source.path,import.meta.url))).digest('hex'),source.sha256,source.path);
  assert.equal(PlanetVersionsSchema.safeParse({...publicView().versions,protocolVersion:2}).success,false);
  assert.equal(PlanetVersionsSchema.safeParse({...publicView().versions,engineVersion:'full-game-1.11.0'}).success,false);
});
test('uncapped contracts accept later rounds without adding a secret Officer or six-player roster',()=>{
  assert.equal(PlanetRoundSchema.parse(72),72);
  assert.equal(PlanetRoundSchema.safeParse(Number.MAX_SAFE_INTEGER).success,false);
  assert.equal(PlanetRoleSchema.safeParse('Officer').success,false);
  assert.equal(PlanetRoleSchema.safeParse('Cracker').success,false);
  assert.equal(PlanetRoleSchema.parse('Doctor'),'Doctor');
  assert.equal(PlanetPublicViewSchema.parse(publicView()).round,7);
  assert.equal(PlanetPublicViewSchema.safeParse({...publicView(),playerCount:6}).success,false);
});
test('new command protocol cannot enter legacy command parser and old protocol is not silently upgraded',()=>{
  assert.equal(PlanetCommandRequestSchema.safeParse(request({type:'ACTIVATE_BLACKHOLE'})).success,true);
  assert.equal(FullCommandRequestSchema.safeParse(request({type:'ACTIVATE_BLACKHOLE'})).success,false);
  const old={...request({type:'PASS_TURN'}),protocolVersion:2};
  assert.equal(FullCommandRequestSchema.safeParse(old).success,true);
  assert.equal(PlanetCommandRequestSchema.safeParse(old).success,false);
});
test('Code requires four distinct original player identities, not four role names or duplicates',()=>{
  assert.equal(PlanetCommandRequestSchema.safeParse(request({type:'SUBMIT_CODE',seatIds:['seat-1','seat-2','seat-5','seat-7']})).success,true);
  for(const seatIds of [['seat-1','seat-2','seat-2','seat-7'],['Insider','Doctor','Undercover','Alien']])
    assert.equal(PlanetCommandRequestSchema.safeParse(request({type:'SUBMIT_CODE',seatIds})).success,false);
});
test('public contract rejects private direction, reality metadata, role-bearing seats and room-only defense',()=>{
  for(const patch of [{privateNavigation:{position:'B2'}},{realityId:'Original'},{code:['seat-1','seat-2','seat-5','seat-7']}])
    assert.equal(PlanetPublicViewSchema.safeParse({...publicView(),...patch}).success,false);
  const v=publicView();v.board.seats[0].role='Insider';
  assert.equal(PlanetPublicViewSchema.safeParse(v).success,false);
  assert.equal(PlanetPublicViewSchema.safeParse({...publicView(),events:[{id:'event-1',round:7,kind:'ATTACK_BLOCKED',seatIds:['seat-2'],actorSeatId:null,location:'Room A'}]}).success,false);
  assert.equal(PlanetPublicViewSchema.safeParse({...publicView(),board:playerView().board}).success,false);
});
test('player contract enforces office-private navigation and pair-private Promise records',()=>{
  assert.equal(PlanetPlayerViewSchema.safeParse(playerView()).success,true);
  assert.equal(PlanetPlayerViewSchema.safeParse({...playerView(),privateNavigation:{position:'B2',direction:'Blue',tieChoice:false,confirmation:null}}).success,false);
  const promise={id:'promise-1',giverSeatId:'seat-2',recipientSeatId:'seat-3',kind:'MEET_A',targetSeatId:null,round:7,electionId:null,accepted:true,status:'Pending'};
  assert.equal(PlanetPlayerViewSchema.safeParse({...playerView(),promises:[promise]}).success,false);
  assert.equal(PlanetPlayerViewSchema.safeParse({...playerView(),promises:[{...promise,recipientSeatId:'seat-1'}]}).success,true);
});
test('knowledge and defense metadata cannot be attached to the wrong role packet',()=>{
  const alien={...playerView(),self:{...playerView().self,role:'Alien',faction:'Alien'}};
  assert.equal(PlanetPlayerViewSchema.safeParse(alien).success,false);
  assert.equal(PlanetPlayerViewSchema.safeParse({...playerView(),abilities:{...playerView().abilities,clone:{used:true,active:true,expiresAfterRound:8}}}).success,false);
  assert.equal(PlanetPlayerViewSchema.safeParse({...playerView(),abilities:{...playerView().abilities,injectionsRemaining:2}}).success,false);
});
test('board representation has four Hospital slots, unique occupancy and no injured patient outside Hospital',()=>{
  const v=publicView(); v.board.seats[0].location='Hospital';v.board.seats[0].slotId='H5';v.board.seats[0].health='Injured';
  assert.equal(PlanetPublicViewSchema.safeParse(v).success,false);
  v.board.seats[0].slotId='H1';
  assert.equal(PlanetPublicViewSchema.safeParse(v).success,true);
  const duplicate=publicView();duplicate.board.seats[1].slotId='A1';
  assert.equal(PlanetPublicViewSchema.safeParse(duplicate).success,false);
  const injured=publicView();injured.board.seats[0].health='Injured';
  assert.equal(PlanetPublicViewSchema.safeParse(injured).success,false);
});
test('server phase contracts bind new decision deadlines and reject early arbitrary terminal clocks',()=>{
  assert.equal(PlanetPhaseSchema.safeParse({id:'phase',kind:'OFFICER_APPOINTMENT',startedAt:1000,endsAt:31000}).success,true);
  assert.equal(PlanetPhaseSchema.safeParse({id:'phase',kind:'NAV_TIE',startedAt:1000,endsAt:16000}).success,true);
  assert.equal(PlanetPhaseSchema.safeParse({id:'phase',kind:'PRE_TURN',startedAt:1000,endsAt:2000}).success,false);
  assert.equal(PlanetPhaseSchema.safeParse({id:'phase',kind:'FINISHED',startedAt:1000,endsAt:16000}).success,false);
});
test('window drawing transport is bounded inert geometry, not executable or remotely fetched markup',()=>{
  assert.equal(PlanetDrawingSchema.safeParse({strokes:[{color:'#ffffff',width:3,points:[[0,0],[1,1]]}]}).success,true);
  for(const value of [{url:'https://example.invalid/picture.svg'},{svg:'<svg onload="alert(1)"/>'},
    {strokes:[{color:'#ffffff',width:3,points:[[2,0]]}]}]) assert.equal(PlanetDrawingSchema.safeParse(value).success,false);
});
