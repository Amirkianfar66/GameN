import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {
  PLANET_GAME_PINS, PLANET_ORIGINAL_PINS, PLANET_SYNC_PINS,
  PlanetVersionsSchema, PlanetPublicViewSchema, PlanetPlayerViewSchema, planetSupportsPhase,
} from '@mothership/contracts';
import {
  createPlanetGame, applyPlanetCommand, advancePlanetDeadline, projectPlanetPublic, projectPlanetPlayer,
  assertPlanetGameState, encodePlanetGameState, decodePlanetGameState,
} from '../dist/index.js';

// Immutable predecessors captured from the actual old compiled runtimes before
// successor rebuild. Positive replay uses their legal synthetic SETUP and native
// recorded commands/deadlines, never a new engine's regenerated expectations.
// Explicit corruption/resource probes are constructed controls, not native histories.
const bundles=['planet-1.0-replay.json','planet-1.0.1-replay.json'].map(name=>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}`,import.meta.url),'utf8')));
const copy=value=>structuredClone(value);
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const ids=count=>Array.from({length:count},(_,i)=>`seat-${i+1}`);
const setupFor=f=>({...copy(f.setup),versions:copy(f.versions)});
const initial=f=>createPlanetGame(setupFor(f),copy(f.initialContext));
const first=bundles[0].fixtures[0];
function noLatestFields(state) {
  assert.equal(Object.hasOwn(state.global,'panelRequests'),false);
  for(const world of Object.values(state.worlds)) {
    assert.equal(Object.hasOwn(world,'panelReservations'),false);
    for(const seat of world.seats)assert.equal(Object.hasOwn(seat,'engineerCapture'),false);
  }
  assert.equal(Object.hasOwn(state.navigation,'settingTie'),false);
  assert.equal(Object.hasOwn(state.navigation,'settingDirection'),false);
}
function hashes(state) {
  const publicView=projectPlanetPublic(state),players=ids(state.playerCount).map(id=>projectPlanetPlayer(state,id));
  PlanetPublicViewSchema.parse(publicView);for(const own of players)PlanetPlayerViewSchema.parse(own);
  for(const own of players)for(const key of ['engineerCapture','panelRequest'])assert.equal(Object.hasOwn(own.abilities,key),false);
  return {state:sha(state),public:sha(publicView),players:players.map(sha)};
}
function replacementPhase(view,kind) {
  const duration=kind==='BLACKHOLE_PRESENTATION'?6_000:15_000;
  return {...copy(view),phase:{id:`compat-${kind}`,kind,startedAt:view.phase.startedAt,endsAt:view.phase.startedAt+duration}};
}
for(const bundle of bundles)for(const f of bundle.fixtures) {
  const label=`${f.versions.engineVersion}/${f.count}`;
  test(`${label}: every native golden state/public/player checkpoint and receipt remains byte-identical`,()=>{
    assert.equal(f.checkpoints.length,f.history.length+1);
    const savedInput={setup:setupFor(f),context:copy(f.initialContext)},savedCopy=copy(savedInput);
    let state=createPlanetGame(savedInput.setup,savedInput.context);assert.deepEqual(savedInput,savedCopy);
    const check=index=>{
      noLatestFields(state);assert.deepEqual(hashes(state),f.checkpoints[index],`${label} checkpoint ${index}`);
      if(index===0||index===Math.floor(f.history.length/2)||index===f.history.length) {
        const before=copy(state),restored=decodePlanetGameState(encodePlanetGameState(state));
        assert.deepEqual(state,before);assert.deepEqual(restored,state);assert.notEqual(restored,state);
        assert.equal(sha(restored),f.checkpoints[index].state);
      }
    };
    check(0);
    for(const [index,record] of f.history.entries()) {
      const before=copy(state);
      if(record.kind==='COMMAND') {
        const result=applyPlanetCommand(state,record.actor,copy(record.request),copy(record.context));
        assert.deepEqual(result.receipt,record.receipt,`${label} receipt ${index}`);assert.deepEqual(state,before);state=result.state;
      } else {
        assert.equal(record.kind,'DEADLINE');const result=advancePlanetDeadline(state,copy(record.context));
        assert.equal(result.advanced,true,`${label} deadline ${index}`);assert.deepEqual(state,before);state=result.state;
      }
      check(index+1);
    }
    const meeting=state.global.promises.find(p=>p.kind==='MEET_A');
    assert.ok(meeting,'Golden includes the recipient-leaves-room counterexample');
    assert.equal(meeting.status,'Not fulfilled','Legacy meetings require both participants, even when the giver remains in A');
    assert.deepEqual(state.versions,f.versions);
  });
  test(`${label}: legacy wire/storage shapes reject latest-only feedback and phases`,()=>{
    const state=initial(f),own=projectPlanetPlayer(state,'seat-1'),publicView=projectPlanetPublic(state);
    assert.deepEqual(PlanetVersionsSchema.parse(state.versions),f.versions);noLatestFields(state);
    for(const key of ['engineerCapture','panelRequest']) {
      const changed=copy(own);changed.abilities[key]=null;assert.equal(PlanetPlayerViewSchema.safeParse(changed).success,false);
    }
    for(const view of [own,publicView]) {
      const schema=view.self?PlanetPlayerViewSchema:PlanetPublicViewSchema;
      assert.equal(schema.safeParse(replacementPhase(view,'NAV_SETTING')).success,false);
      if(f.versions.engineVersion==='planet-game-1.0.0')assert.equal(schema.safeParse(replacementPhase(view,'BLACKHOLE_PRESENTATION')).success,false);
      else assert.equal(schema.safeParse(replacementPhase(view,'BLACKHOLE_PRESENTATION')).success,true,'P27 is available only in the exact1.0.1 predecessor');
    }
    const forbidden=copy(state);forbidden.phase=replacementPhase(publicView,'NAV_SETTING').phase;
    forbidden.evaluatedAt=forbidden.phase.startedAt;assert.throws(()=>decodePlanetGameState(forbidden));
    for(const mutate of [s=>{s.global.panelRequests={};},s=>{s.worlds[s.currentWorldId].panelReservations={};},
      s=>{s.worlds[s.currentWorldId].seats[0].engineerCapture=null;}]) {
      const invalid=copy(state);mutate(invalid);assert.throws(()=>assertPlanetGameState(invalid),'No empty latest-field migration in a legacy save');
    }
  });
  test(`${label}: CONSTRUCTED exhausted Hospital panel keeps generic rejection and reveals no correctness`,()=>{
    const state=initial(f),world=state.worlds[state.currentWorldId],patient=world.seats.find(s=>s.seatId==='seat-1');
    state.phase={id:'legacy-empty-panel',kind:'ORDINARY_TURN',startedAt:state.evaluatedAt,endsAt:state.evaluatedAt+60_000};
    state.activeSeatId='seat-1';state.turnIndex=0;state.panelOpen=true;world.injectionsRemaining=0;
    patient.health='Injured';patient.location='Hospital';patient.slotId='H1';patient.rescueDueAfterRound=state.round+1;
    patient.medical={admittedRound:state.round,rescueDueAfterRound:state.round+1,rescueOpportunity:'NEXT_NORMAL_ROUND'};
    assertPlanetGameState(state);const before=copy(state);
    for(const doctorSeatId of ['seat-2','seat-3']) {
      const request={protocolVersion:3,matchId:state.matchId,phaseId:state.phase.id,commandId:`legacy-panel-${doctorSeatId}`,command:{type:'PANEL_CODE',doctorSeatId}};
      const result=applyPlanetCommand(state,'seat-1',request,{now:state.evaluatedAt+1,nextPhaseId:'legacy-empty-next',nextDeadlineToken:'legacy-empty-token',random:[]});
      assert.equal(result.receipt.status,'rejected');assert.equal(result.receipt.code,'NOT_ALLOWED');assert.deepEqual(result.state,before);assert.deepEqual(state,before);
    }
    assert.deepEqual(state.global.panelAttempts,[]);noLatestFields(state);
  });
}
for(const f of bundles[0].fixtures) {
  test(`${f.count}: default constructor selects1.1.0; explicit old tuples and matching assets remain supported`,()=>{
    const latest=createPlanetGame(copy(f.setup),copy(f.initialContext));
    assert.deepEqual(latest.versions,{...PLANET_GAME_PINS,assetManifestVersion:f.setup.assetManifestVersion});
    for(const id of ids(f.count)) {
      const view=projectPlanetPlayer(latest,id);PlanetPlayerViewSchema.parse(view);
      assert.equal(Object.hasOwn(view.abilities,'engineerCapture'),true);assert.equal(view.abilities.engineerCapture,null);
      assert.equal(Object.hasOwn(view.abilities,'panelRequest'),true);assert.equal(view.abilities.panelRequest,null);
    }
    for(const pins of [PLANET_ORIGINAL_PINS,PLANET_SYNC_PINS,PLANET_GAME_PINS]) {
      const setup={...copy(f.setup),versions:{...pins,assetManifestVersion:f.setup.assetManifestVersion}};
      assert.deepEqual(createPlanetGame(setup,copy(f.initialContext)).versions,setup.versions);
      assert.throws(()=>createPlanetGame({...setup,assetManifestVersion:'different-art'},copy(f.initialContext)),/asset/i);
    }
  });
  test(`${f.count}:1.1.0 views reject legacy NAV_TIE and require both explicit private feedback fields`,()=>{
    const state=createPlanetGame(copy(f.setup),copy(f.initialContext)),own=projectPlanetPlayer(state,'seat-1'),pub=projectPlanetPublic(state);
    assert.equal(PlanetPlayerViewSchema.safeParse(replacementPhase(own,'NAV_TIE')).success,false);
    assert.equal(PlanetPublicViewSchema.safeParse(replacementPhase(pub,'NAV_TIE')).success,false);
    assert.equal(PlanetPlayerViewSchema.safeParse(replacementPhase(own,'NAV_SETTING')).success,true);
    assert.equal(PlanetPublicViewSchema.safeParse(replacementPhase(pub,'NAV_SETTING')).success,true);
    for(const key of ['engineerCapture','panelRequest']) {const invalid=copy(own);delete invalid.abilities[key];assert.equal(PlanetPlayerViewSchema.safeParse(invalid).success,false);}
  });
}
test('supported phase matrix and complete tuple matching never infer compatibility from one matching pin',()=>{
  const pins=[PLANET_ORIGINAL_PINS,PLANET_SYNC_PINS,PLANET_GAME_PINS],assetManifestVersion=first.setup.assetManifestVersion;
  for(const p of pins) {
    const versions={...p,assetManifestVersion};assert.equal(PlanetVersionsSchema.safeParse(versions).success,true);
    assert.equal(planetSupportsPhase(versions,'NAV_SETTING'),p.engineVersion==='planet-game-1.1.0');
    assert.equal(planetSupportsPhase(versions,'NAV_TIE'),p.engineVersion!=='planet-game-1.1.0');
    assert.equal(planetSupportsPhase(versions,'BLACKHOLE_PRESENTATION'),p.engineVersion!=='planet-game-1.0.0');
    for(const other of pins.filter(q=>q!==p))for(const key of ['engineVersion','rulesetVersion','rulesetHash']) {
      const mixed={...versions,[key]:other[key]};assert.equal(PlanetVersionsSchema.safeParse(mixed).success,false,`${p.engineVersion} mixed ${key}`);
      assert.throws(()=>createPlanetGame({...copy(first.setup),versions:mixed},copy(first.initialContext)));
    }
    for(const invalid of [{...versions,protocolVersion:2},{...versions,rulesetHash:'0'.repeat(64)},{...versions,assetManifestVersion:'bad/art'},
      {...versions,unexpected:true}])assert.equal(PlanetVersionsSchema.safeParse(invalid).success,false);
  }
});
