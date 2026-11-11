import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {PLANET_BLACKOUT_PINS,PLANET_BLACKOUT_ENGINE_PROFILE,PLANET_PHONE_OFFER_PINS,PLANET_GAME_PINS,
 PLANET_SYNC_PINS,PLANET_ORIGINAL_PINS,PlanetVersionsSchema,PlanetPublicViewSchema,PlanetPlayerViewSchema,
 PlanetPhaseKindSchema,PLANET_PHASE_DURATIONS,planetCheckpointMatchesPhase,planetSupportsPhase} from '../../packages/contracts/dist/index.js';
const oldPins=[PLANET_ORIGINAL_PINS,PLANET_SYNC_PINS,PLANET_GAME_PINS,PLANET_PHONE_OFFER_PINS];
const versions=p=>({...p,assetManifestVersion:'synthetic-blackout-contract-art'});
const bytes=path=>readFileSync(new URL('../../'+path,import.meta.url));
const digest=value=>createHash('sha256').update(value).digest('hex');
function shared(count=7,pins=PLANET_BLACKOUT_PINS){
 return {versions:versions(pins),matchId:'blackout-contract',viewRevision:1,round:2,playerCount:count,
  phase:{id:'blackout-window',kind:'BLACKOUT',startedAt:1000,endsAt:16000},activeSeatId:null,
  offices:{captainSeatId:null,officerSeatId:null,blockedSeatId:null},
  board:{kind:'FINALIZED',finalizedRound:2,...(pins===PLANET_BLACKOUT_PINS?{checkpoint:'PRE_BLACKOUT'}:{}),
   seats:Array.from({length:count},(_,i)=>({seatId:`seat-${i+1}`,health:'Healthy',location:i<5?'Room A':'Room B',slotId:i<5?`A${i+1}`:`B${i-4}`,
    jailed:false,captain:false,officer:false,revealedFaction:null,rescueDueAfterRound:null,medical:null}))},
  hackSession:null,blackout:{windowId:'blackout-window',previewEndsAt:6000,endsAt:16000},
  ballot:{eligibleVoters:[],eligibleTargets:[]},lastTally:null,navigation:{lastMovedRound:1,arrivedAt:null},events:[],result:null,endReveal:null};
}
function player(count=7,pins=PLANET_BLACKOUT_PINS){
 const v=shared(count,pins),feedback=[PLANET_GAME_PINS,PLANET_PHONE_OFFER_PINS,PLANET_BLACKOUT_PINS].includes(pins);
 return {...v,board:{...v.board,kind:'PLAYER_CURRENT'},
  self:{seatId:'seat-1',role:'Insider',faction:'Blue',ordinaryWeapons:0,movementSpent:false,roleActionSpent:false,shotSpent:false,standardHackSpent:false},
  abilities:{codeAttempted:false,shipHackUnlocked:false,shipHackSpent:false,scanBlockedThroughRound:null,blackholeSpent:false,blackoutSpent:false,
   engineerSpent:false,clone:null,injectionsRemaining:null,panelAttemptSpent:false,protectionGrants:[],captainCommands:null,...(feedback?{engineerCapture:null,panelRequest:null}:{})},
  knowledge:{insiderSeatIds:[],knownUndercoverSeatId:null,scanResults:[]},offers:[],privateNavigation:null,hackFeedback:null,blackoutTargeting:null,
  promises:[],promiseQuota:{given:false,received:false},ownBallot:null,windows:[]};
}
test('Blackout authority binds the exact owner decision, focused overlay and unchanged inherited sources',()=>{
 const path='rules/planet-successor-blackout-before-vote-authority-2026-11-10.json',raw=bytes(path),authority=JSON.parse(raw);
 assert.equal(digest(raw),PLANET_BLACKOUT_PINS.rulesetHash);
 assert.equal(authority.protocol_version,3);assert.equal(authority.engine_version,PLANET_BLACKOUT_PINS.engineVersion);
 assert.equal(authority.ruleset_version,PLANET_BLACKOUT_PINS.rulesetVersion);
 const parent=JSON.parse(bytes(authority.parent_authority.path));
 assert.deepEqual(authority.sources.slice(0,parent.sources.length),parent.sources);
 for(const source of [...authority.sources,...authority.preserved_authorities])assert.equal(digest(bytes(source.path)),source.sha256,source.path);
 assert.equal(PLANET_GAME_PINS.engineVersion,'planet-game-1.1.0');assert.equal(PLANET_PHONE_OFFER_PINS.engineVersion,'planet-game-1.2.0');
 assert.equal(PLANET_BLACKOUT_ENGINE_PROFILE,'blackout-before-vote-1.3');
});
test('new Blackout pins are an exact successor, with all saved predecessors separately registered',()=>{
 for(const p of [...oldPins,PLANET_BLACKOUT_PINS])assert.deepEqual(PlanetVersionsSchema.parse(versions(p)),versions(p));
 for(const p of oldPins)for(const key of ['engineVersion','rulesetVersion','rulesetHash']){
  assert.equal(PlanetVersionsSchema.safeParse({...versions(PLANET_BLACKOUT_PINS),[key]:p[key]}).success,false);
  assert.equal(PlanetVersionsSchema.safeParse({...versions(p),[key]:PLANET_BLACKOUT_PINS[key]}).success,false);
 }
 assert.equal(planetSupportsPhase(versions(PLANET_BLACKOUT_PINS),'BLACKHOLE_PRESENTATION'),true);
 assert.equal(planetSupportsPhase(versions(PLANET_BLACKOUT_PINS),'NAV_SETTING'),true);
 assert.equal(planetSupportsPhase(versions(PLANET_BLACKOUT_PINS),'NAV_TIE'),false);
 assert.equal(PLANET_PHASE_DURATIONS.BLACKOUT,15000);assert.equal(PLANET_PHASE_DURATIONS.JAIL_VOTE,60000);
 assert.equal(PLANET_PHASE_DURATIONS.VOTE_RESULT,5000);assert.equal(PLANET_PHASE_DURATIONS.BLACKHOLE_PRESENTATION,6000);
});
test('checkpoint and publication round identify exactly the permitted phase categories',()=>{
 const cases=[
  ['INITIAL',0,1,['PRE_TURN','ORDINARY_TURN','HACK_DECLARE','HACK_RESULT','HACK','ABORTED']],
  ['PRE_BLACKOUT',2,2,['BLACKHOLE_PRESENTATION','BLACKOUT','ABORTED']],
  ['AFTER_BLACKOUT',2,2,['JAIL_VOTE','VOTE_RESULT','ABORTED']],
  ['ROUND_FINALIZED',2,2,['NAV_SETTING','NAV_CAPTAIN_CONFIRM','NAV_OFFICER_CONFIRM','FINISHED','ABORTED']],
  ['ROUND_FINALIZED',1,2,['CAPTAIN_ELECTION','VOTE_RESULT','OFFICER_APPOINTMENT','PRE_TURN','ORDINARY_TURN','HACK_DECLARE','HACK_RESULT','HACK','ABORTED']],
 ];
 for(const [checkpoint,publicationRound,round,allowed]of cases)for(const phase of PlanetPhaseKindSchema.options)
  assert.equal(planetCheckpointMatchesPhase(checkpoint,publicationRound,round,phase),allowed.includes(phase),`${checkpoint}/${publicationRound}/${round}/${phase}`);
 for(const [checkpoint,published,round,phase]of [['INITIAL',1,1,'PRE_TURN'],['INITIAL',0,2,'PRE_TURN'],
  ['PRE_BLACKOUT',1,2,'BLACKOUT'],['AFTER_BLACKOUT',1,2,'JAIL_VOTE'],['ROUND_FINALIZED',0,1,'PRE_TURN'],['ROUND_FINALIZED',1,3,'ORDINARY_TURN']])
  assert.equal(planetCheckpointMatchesPhase(checkpoint,published,round,phase),false);
});
for(const count of [7,8,9]){
 test(`${count}: only the exact candidate requires checkpoint metadata on both audience boards`,()=>{
  for(const [factory,schema]of [[shared,PlanetPublicViewSchema],[player,PlanetPlayerViewSchema]]){
   const current=factory(count);assert.deepEqual(schema.parse(current),current);
   for(const checkpoint of [undefined,'AFTER_BLACKOUT','ROUND_FINALIZED','INITIAL','unknown']){
    const bad=structuredClone(current);bad.board.checkpoint=checkpoint;assert.equal(schema.safeParse(bad).success,false);
   }
   const absent=structuredClone(current);delete absent.board.checkpoint;assert.equal(schema.safeParse(absent).success,false);
   for(const old of oldPins){const historical=factory(count,old);assert.deepEqual(schema.parse(historical),historical);
    for(const checkpoint of [undefined,'PRE_BLACKOUT'])assert.equal(schema.safeParse({...historical,board:{...historical.board,checkpoint}}).success,false);
   }
   assert.equal(schema.safeParse({...current,blackoutBatch:{requesters:['seat-3']}}).success,false);
   assert.equal(schema.safeParse({...current,board:{...current.board,occupantSnapshot:[]}}).success,false);
  }
 });
 test(`${count}: candidate inherits private declaration choices, panel numbers and feedback field requirements`,()=>{
  const v=player(count);v.offers=[{type:'DECLARE_HACK_SIDE',targetSeatIds:[],slotIds:[],windowIds:[],promiseTargetSeatIds:[],declaredSides:['Blue']},
   {type:'PANEL_CODE',targetSeatIds:Array.from({length:count},(_,i)=>`seat-${i+1}`),slotIds:[],windowIds:[],promiseTargetSeatIds:[]}];
  assert.equal(PlanetPlayerViewSchema.safeParse(v).success,true);
  for(const change of ['declarations','numbers','feedback']){const bad=structuredClone(v);
   if(change==='declarations')bad.offers[0].declaredSides=['Blue','Red'];
   if(change==='numbers')bad.offers[1].targetSeatIds.pop();
   if(change==='feedback')delete bad.abilities.panelRequest;
   assert.equal(PlanetPlayerViewSchema.safeParse(bad).success,false);
  }
 });
}
