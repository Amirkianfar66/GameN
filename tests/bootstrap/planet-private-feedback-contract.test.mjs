import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PLANET_GAME_PINS,PLANET_SYNC_PINS,PLANET_ORIGINAL_PINS,PlanetVersionsSchema,PlanetPublicViewSchema,PlanetPlayerViewSchema,PlanetReceiptSchema} from '../../packages/contracts/dist/index.js';
const pins=[PLANET_ORIGINAL_PINS,PLANET_SYNC_PINS,PLANET_GAME_PINS];
const versions=p=>({...p,assetManifestVersion:'synthetic-contract-art'});
function shared(p=PLANET_GAME_PINS){return {versions:versions(p),matchId:'contract-example',viewRevision:1,round:7,playerCount:9,
 phase:{id:'setting',kind:p===PLANET_GAME_PINS?'NAV_SETTING':'NAV_TIE',startedAt:1000,endsAt:16000},activeSeatId:null,
 offices:{captainSeatId:'seat-2',officerSeatId:'seat-3',blockedSeatId:null},board:{kind:'FINALIZED',finalizedRound:7,seats:Array.from({length:9},(_,i)=>({seatId:`seat-${i+1}`,health:'Healthy',location:i<5?'Room A':'Room B',slotId:i<5?`A${i+1}`:`B${i-4}`,jailed:false,captain:i===1,officer:i===2,revealedFaction:null,rescueDueAfterRound:null,medical:null}))},
 hackSession:null,blackout:null,ballot:{eligibleVoters:[],eligibleTargets:[]},lastTally:null,navigation:{lastMovedRound:6,arrivedAt:null},events:[],result:null,endReveal:null};}
function player(p=PLANET_GAME_PINS){const v=shared(p);return {...v,board:{...v.board,kind:'PLAYER_CURRENT'},self:{seatId:'seat-1',role:'Insider',faction:'Blue',ordinaryWeapons:0,movementSpent:false,roleActionSpent:false,shotSpent:false,standardHackSpent:false},
 abilities:{codeAttempted:false,shipHackUnlocked:false,shipHackSpent:false,scanBlockedThroughRound:null,blackholeSpent:false,blackoutSpent:false,engineerSpent:false,clone:null,injectionsRemaining:null,panelAttemptSpent:false,protectionGrants:[],captainCommands:null,...(p===PLANET_GAME_PINS?{engineerCapture:null,panelRequest:null}:{})},knowledge:{insiderSeatIds:[],knownUndercoverSeatId:null,scanResults:[]},offers:[],privateNavigation:null,hackFeedback:null,blackoutTargeting:null,promises:[],promiseQuota:{given:false,received:false},ownBallot:null,windows:[]};}
const copy=v=>structuredClone(v);
test('new immutable authority binds P28 and confirmed feedback/Meet semantics without rewriting predecessor sources',()=>{
 const bytes=readFileSync(new URL('../../rules/planet-successor-private-feedback-authority-2026-11-06.json',import.meta.url)),authority=JSON.parse(bytes);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),PLANET_GAME_PINS.rulesetHash);
 assert.equal(authority.engine_version,PLANET_GAME_PINS.engineVersion);assert.equal(authority.ruleset_version,PLANET_GAME_PINS.rulesetVersion);
 for(const source of [...authority.sources,...authority.preserved_candidates])assert.equal(createHash('sha256').update(readFileSync(new URL('../../'+source.path,import.meta.url))).digest('hex'),source.sha256,source.path);
});
test('exact three Planet tuples are supported; no engine/ruleset/hash mixing or implicit upgrade',()=>{
 for(const p of pins)assert.deepEqual(PlanetVersionsSchema.parse(versions(p)),versions(p));
 for(const a of pins)for(const b of pins)if(a!==b)for(const key of ['engineVersion','rulesetVersion','rulesetHash'])assert.equal(PlanetVersionsSchema.safeParse({...versions(a),[key]:b[key]}).success,false);
 assert.equal(PlanetVersionsSchema.safeParse({...versions(PLANET_GAME_PINS),engineVersion:'planet-game-99'}).success,false);
});
test('wire phase legality follows saved tuple; old tie phases and P27 stay isolated from NAV_SETTING',()=>{
 for(const p of pins){const v=shared(p);assert.equal(PlanetPublicViewSchema.safeParse(v).success,true);
  assert.equal(PlanetPublicViewSchema.safeParse({...v,phase:{...v.phase,kind:'NAV_SETTING'}}).success,p===PLANET_GAME_PINS);
  assert.equal(PlanetPublicViewSchema.safeParse({...v,phase:{...v.phase,kind:'NAV_TIE'}}).success,p!==PLANET_GAME_PINS);
  assert.equal(PlanetPublicViewSchema.safeParse({...v,phase:{...v.phase,kind:'BLACKHOLE_PRESENTATION',endsAt:7000}}).success,p!==PLANET_ORIGINAL_PINS);
 }
 for(const duration of [0,14999,15001])assert.equal(PlanetPublicViewSchema.safeParse({...shared(),phase:{...shared().phase,endsAt:1000+duration}}).success,false);
 for(const patch of [{tie:true},{direction:'Red'},{weights:{Blue:3,Red:3}},{choiceAt:2000}])assert.equal(PlanetPublicViewSchema.safeParse({...shared(),navigation:{...shared().navigation,...patch}}).success,false);
});
test('new feedback fields are mandatory only for the new tuple and never silently fill historical packets',()=>{
 for(const p of pins){const v=player(p);assert.equal(PlanetPlayerViewSchema.safeParse(v).success,true);
  for(const key of ['engineerCapture','panelRequest']){const bad=copy(v);if(p===PLANET_GAME_PINS)delete bad.abilities[key];else bad.abilities[key]=null;assert.equal(PlanetPlayerViewSchema.safeParse(bad).success,false);}
 }
});
test('Engineer capture distinguishes empty used capture from unused and masks all other roles',()=>{
 const v=player();v.self={...v.self,seatId:'seat-9',role:'Engineer'};v.abilities.engineerSpent=true;v.abilities.engineerCapture={round:3,seatIds:[]};assert.equal(PlanetPlayerViewSchema.safeParse(v).success,true);
 for(const patch of [{round:8,seatIds:[]},{round:3,seatIds:['seat-1','seat-1']},{round:3,seatIds:['seat-1'],worldId:'secret'}])assert.equal(PlanetPlayerViewSchema.safeParse({...v,abilities:{...v.abilities,engineerCapture:patch}}).success,false);
 const other=player();other.abilities.engineerCapture={round:3,seatIds:[]};assert.equal(PlanetPlayerViewSchema.safeParse(other).success,false);
 assert.equal(PlanetPlayerViewSchema.safeParse({...v,abilities:{...v.abilities,engineerCapture:null}}).success,false);
});
test('patient-only status transport is bounded evidence, never a correctness oracle or extra inventory',()=>{
 const v=player();v.abilities.panelAttemptSpent=true;
 for(const status of ['WRONG','QUEUED','TREATED','NO_EFFECT','DISCARDED']){v.abilities.panelRequest={commandId:'patient-request',round:4,status};assert.equal(PlanetPlayerViewSchema.safeParse(v).success,true);}
 for(const extra of [{doctorSeatId:'seat-2'},{injectionsRemaining:2},{worldId:'world-2'},{result:'WRONG'}])assert.equal(PlanetPlayerViewSchema.safeParse({...v,abilities:{...v.abilities,panelRequest:{...v.abilities.panelRequest,...extra}}}).success,false);
 const receipt={protocolVersion:3,matchId:'contract-example',phaseId:'ordinary',commandId:'empty-pool',status:'rejected',code:'NO_INJECTION'};
 assert.equal(PlanetReceiptSchema.safeParse(receipt).success,true);assert.equal(PlanetReceiptSchema.safeParse({...receipt,correct:true}).success,false);
});
test('setting choice is current Officer eligibility; confirmation remains an awaited action, not history',()=>{
 const v=player();v.self.seatId='seat-3';v.self.role='Blue Disabler';v.privateNavigation={position:'B1',direction:null,tieChoice:true,confirmation:null};v.offers=[{type:'CHOOSE_NAV_DIRECTION',targetSeatIds:['seat-3'],slotIds:[],windowIds:[],promiseTargetSeatIds:[]}];
 assert.equal(PlanetPlayerViewSchema.safeParse(v).success,true);
 for(const change of [{direction:'Red'},{confirmation:'OFFICER'}])assert.equal(PlanetPlayerViewSchema.safeParse({...v,privateNavigation:{...v.privateNavigation,...change}}).success,false);
 assert.equal(PlanetPlayerViewSchema.safeParse({...v,offers:[]}).success,false);
 assert.equal(PlanetPlayerViewSchema.safeParse({...v,self:{...v.self,seatId:'seat-2'}}).success,false);
});
