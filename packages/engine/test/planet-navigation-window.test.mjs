import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PLANET_ORIGINAL_PINS,PLANET_SYNC_PINS} from '@mothership/contracts';
import {createPlanetGame,applyPlanetCommand,advancePlanetDeadline,projectPlanetPublic,projectPlanetPlayer,
  assertPlanetGameState,encodePlanetGameState,decodePlanetGameState} from '../dist/index.js';
import {planetSeatView} from '../dist/planet-game/model.js';
import {planetWorldDriver,currentWorld} from './planet-world-helper.mjs';

function voteAll(d,target) {
  for(const id of d.state.ballot.eligibleVoters)d.command(id,{type:'VOTE',targetSeatId:target});
  d.deadline();
}
function roundTwoDriver(count,{tie=true,versions}={}) {
  const d=planetWorldDriver(count,versions?{versions:{...versions,assetManifestVersion:'planet-world-test-art'}}:{});
  d.until(s=>s.round===1 && s.phase.kind==='JAIL_VOTE');voteAll(d,tie?'seat-1':null);
  d.until(s=>s.round===2 && s.phase.kind==='CAPTAIN_ELECTION');
  assert.equal(d.state.navigation.lastMovedRound,1,'Round1 still moves without a navigation-setting stage');
  voteAll(d,'seat-7');d.deadline();
  assert.equal(d.state.phase.kind,'OFFICER_APPOINTMENT');
  d.command('seat-7',{type:'APPOINT_OFFICER',targetSeatId:'seat-4'});
  return d;
}
function navigationDriver(count,{tie=true,shipHack=false,versions}={}) {
  const d=roundTwoDriver(count,{tie,versions});
  if(shipHack) {
    d.until(s=>s.phase.kind==='ORDINARY_TURN' && s.activeSeatId==='seat-6');
    const shared=projectPlanetPublic(d.state),others=d.ids.filter(id=>id!=='seat-6').map(id=>projectPlanetPlayer(d.state,id));
    d.command('seat-6',{type:'SUBMIT_CODE',seatIds:[...d.state.code]});
    d.command('seat-6',{type:'ACTIVATE_SHIP_HACK'});
    assert.deepEqual(projectPlanetPublic(d.state),shared,'Hidden ship-hack registration cannot change the public packet/revision');
    assert.deepEqual(d.ids.filter(id=>id!=='seat-6').map(id=>projectPlanetPlayer(d.state,id)),others,'Ship-hack registration remains Hacker-only');
  }
  d.until(s=>s.round===2 && s.phase.kind==='JAIL_VOTE');
  voteAll(d,tie && count!==8?'seat-2':null);
  d.until(s=>s.round===2 && s.phase.kind===(versions?'NAV_TIE':'NAV_SETTING'));
  return d;
}
const context=(state,label,patch={})=>({now:state.phase.endsAt,nextPhaseId:`nav-next-${label}`,nextDeadlineToken:`nav-token-${label}`,
  phaseId:state.phase.id,deadlineToken:state.deadlineToken,random:Array(32).fill(.999999),...patch});
function refuseDeadline(state,label,patch={}) {
  const before=structuredClone(state),result=advancePlanetDeadline(state,context(state,label,patch));
  assert.equal(result.advanced,false,label);assert.deepEqual(result.state,before);assert.deepEqual(state,before);
}
function allOfficeDirectionsAreHidden(d) {
  for(const id of ['seat-7','seat-4'])assert.equal(projectPlanetPlayer(d.state,id).privateNavigation.direction,null);
  for(const id of d.ids.filter(id=>!['seat-7','seat-4'].includes(id)))assert.equal(projectPlanetPlayer(d.state,id).privateNavigation,null);
  assert.equal(Object.hasOwn(projectPlanetPublic(d.state).navigation,'direction'),false);
}
function confirmAndMove(d,direction) {
  assert.equal(d.state.phase.kind,'NAV_CAPTAIN_CONFIRM');
  assert.equal(projectPlanetPlayer(d.state,'seat-7').privateNavigation.direction,direction);
  assert.equal(projectPlanetPlayer(d.state,'seat-4').privateNavigation.direction,direction);
  d.command('seat-4',{type:'CONFIRM_NAVIGATION'},{accepted:false});
  d.command('seat-7',{type:'CONFIRM_NAVIGATION'});assert.equal(d.state.phase.kind,'NAV_OFFICER_CONFIRM');
  assert.equal(d.state.navigation.lastMovedRound,1);
  d.command('seat-4',{type:'CONFIRM_NAVIGATION'});
  assert.equal(d.state.navigation.lastMovedRound,2);assert.equal(d.state.round,3);
  assert.equal(d.state.navigation.position,direction==='Blue'?'B1':'R1');
  assert.equal(d.state.navigation.settingTie,false);assert.equal(d.state.navigation.settingDirection,null);
}

for(const count of [7,8,9]) {
  test(`${count}: native early Officer tie choice stays private for the full fixed window, reconnects closed and replays exactly`,()=>{
    const d=navigationDriver(count),setting=structuredClone(d.state.phase),token=d.state.deadlineToken;
    assert.equal(setting.endsAt-setting.startedAt,15_000);assert.equal(d.state.navigation.settingTie,true);
    assert.equal(d.state.navigation.direction,null);assert.equal(d.state.navigation.settingDirection,null);
    assert.equal(projectPlanetPlayer(d.state,'seat-4').privateNavigation.tieChoice,true);allOfficeDirectionsAreHidden(d);
    const authorityBefore=structuredClone(d.state),sharedBefore=projectPlanetPublic(d.state);
    const othersBefore=Object.fromEntries(d.ids.filter(id=>id!=='seat-4').map(id=>[id,projectPlanetPlayer(d.state,id)]));
    const officerBefore=projectPlanetPlayer(d.state,'seat-4');
    for(const [sample,direction] of [[.25,'Blue'],[.75,'Red']]) {
      const silent=advancePlanetDeadline(d.state,context(d.state,`silent-${direction}`,{random:[sample]}));
      assert.equal(silent.advanced,true);assert.equal(silent.state.phase.kind,'NAV_CAPTAIN_CONFIRM');
      assert.equal(silent.state.phase.startedAt,setting.endsAt);assert.equal(silent.state.navigation.direction,direction);
      assert.equal(projectPlanetPlayer(silent.state,'seat-4').privateNavigation.tieChoice,false,'A silent eligible Officer falls back only at the fixed deadline');
    }
    // Mutually exclusive accepted choices use the same native prefix and exact transition context.
    const choiceContext=context(d.state,'paired-choice',{now:setting.startedAt+100});
    const choose=direction=>applyPlanetCommand(d.state,'seat-4',{protocolVersion:3,matchId:d.state.matchId,phaseId:setting.id,
      commandId:'paired-officer-choice',command:{type:'CHOOSE_NAV_DIRECTION',direction}},choiceContext);
    const blue=choose('Blue'),red=choose('Red');
    assert.equal(blue.receipt.status,'accepted');assert.equal(red.receipt.status,'accepted');
    assert.deepEqual(projectPlanetPublic(blue.state),projectPlanetPublic(red.state));
    for(const id of d.ids.filter(id=>id!=='seat-4'))assert.deepEqual(projectPlanetPlayer(blue.state,id),projectPlanetPlayer(red.state,id));
    assert.equal(projectPlanetPlayer(blue.state,'seat-4').privateNavigation.direction,null);
    assert.equal(projectPlanetPlayer(red.state,'seat-4').privateNavigation.direction,null);
    assert.deepEqual(d.state,authorityBefore,'Paired command probes do not alter the native prefix');
    d.command('seat-7',{type:'CHOOSE_NAV_DIRECTION',direction:'Blue'},{accepted:false});
    d.command('seat-4',{type:'CHOOSE_NAV_DIRECTION',direction:'Blue'},{now:setting.startedAt+100});
    assert.deepEqual(d.state.phase,setting);assert.equal(d.state.deadlineToken,token);
    assert.equal(d.state.navigation.direction,null);assert.equal(d.state.navigation.settingTie,true);
    assert.equal(d.state.navigation.settingDirection,'Blue');allOfficeDirectionsAreHidden(d);
    assert.deepEqual(projectPlanetPublic(d.state),sharedBefore,'Even the public revision stays unchanged on an early choice');
    for(const [id,view] of Object.entries(othersBefore))assert.deepEqual(projectPlanetPlayer(d.state,id),view,`${id}: no early-choice notification or revision`);
    const officer=projectPlanetPlayer(d.state,'seat-4');assert.equal(officer.viewRevision,officerBefore.viewRevision+1);
    assert.equal(officer.privateNavigation.tieChoice,false);assert.equal(officer.offers.some(o=>o.type==='CHOOSE_NAV_DIRECTION'),false);
    const restored=decodePlanetGameState(JSON.parse(JSON.stringify(encodePlanetGameState(d.state))));
    assert.deepEqual(projectPlanetPlayer(restored,'seat-4'),officer,'Reload retains the accepted control closure without revealing direction');
    assert.deepEqual(projectPlanetPlayer(restored,'seat-7'),othersBefore['seat-7']);
    d.command('seat-4',{type:'CHOOSE_NAV_DIRECTION',direction:'Red'},{accepted:false});
    refuseDeadline(d.state,'early',{now:setting.endsAt-1});
    refuseDeadline(d.state,'stale-phase',{phaseId:'old-navigation-phase'});
    refuseDeadline(d.state,'stale-token',{deadlineToken:'old-navigation-token'});
    d.command('seat-4',{type:'CHOOSE_NAV_DIRECTION',direction:'Red'},{now:setting.endsAt,accepted:false});
    const actualClose=setting.endsAt+7_000;d.deadline({now:actualClose});
    const settingCallback=structuredClone(d.history.at(-1).context);
    assert.equal(d.state.phase.kind,'NAV_CAPTAIN_CONFIRM');assert.equal(d.state.phase.startedAt,actualClose);
    assert.equal(d.state.phase.endsAt,actualClose+15_000,'Late setting delivery preserves the full next confirmation');
    assert.equal(d.state.navigation.direction,'Blue');
    refuseDeadline(d.state,'duplicate-setting',{...settingCallback});
    confirmAndMove(d,'Blue');d.replay();
  });

  test(`${count}: native non-tie still uses the same neutral fifteen seconds and no Officer choice`,()=>{
    const d=navigationDriver(count,{tie:false});
    assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,15_000);
    assert.equal(d.state.navigation.settingTie,false);assert.equal(d.state.navigation.settingDirection,'Blue');
    allOfficeDirectionsAreHidden(d);
    const officer=projectPlanetPlayer(d.state,'seat-4');assert.equal(officer.privateNavigation.tieChoice,false);
    assert.equal(officer.offers.some(o=>o.type==='CHOOSE_NAV_DIRECTION'),false);
    d.command('seat-4',{type:'CHOOSE_NAV_DIRECTION',direction:'Red'},{accepted:false});
    const noRandom=advancePlanetDeadline(d.state,context(d.state,'non-tie-no-draw',{random:[]}));
    assert.equal(noRandom.advanced,true);assert.equal(noRandom.state.navigation.direction,'Blue','A known majority does not consume a fallback draw');
    d.deadline({sample:0});confirmAndMove(d,'Blue');d.replay();
  });

  test(`${count}: native retained ship hack overrides a genuine tie without an early public or Captain direction`,()=>{
    const d=navigationDriver(count,{tie:true,shipHack:true});
    assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,15_000);
    assert.equal(currentWorld(d).shipHackOverride,true);assert.equal(currentWorld(d).shipHackSpent,true);
    assert.equal(d.state.navigation.settingTie,false);assert.equal(d.state.navigation.settingDirection,'Red');
    allOfficeDirectionsAreHidden(d);
    assert.equal(projectPlanetPlayer(d.state,'seat-4').privateNavigation.tieChoice,false);
    d.command('seat-4',{type:'CHOOSE_NAV_DIRECTION',direction:'Blue'},{accepted:false});
    d.deadline({sample:0});confirmAndMove(d,'Red');
    assert.equal(currentWorld(d).shipHackSpent,true);assert.equal(currentWorld(d).shipHackOverride,false);d.replay();
  });

  test(`${count}: PAIRED CONSTRUCTED tie and non-tie from a native prefix have byte-identical neutral public, Captain and bystander packets`,()=>{
    const d=roundTwoDriver(count);d.until(s=>s.round===2 && s.phase.kind==='JAIL_VOTE');
    voteAll(d,count===8?null:'seat-2');d.until(s=>s.phase.kind==='BLACKOUT');
    const tied=structuredClone(d.state),untied=structuredClone(d.state);
    // Both exchanged identities belong to the fixed Code, so the Code set is unchanged.
    // Only this hidden-role pairing is constructed; neither twin is claimed as a native replay history.
    const confined=count===8?'seat-1':'seat-2';
    [untied.roles[confined],untied.roles['seat-5']]=[untied.roles['seat-5'],untied.roles[confined]];
    assert.deepEqual(untied.code,tied.code);assert.deepEqual(untied.finalized,tied.finalized);
    assertPlanetGameState(tied);assertPlanetGameState(untied);
    const beforeTied=structuredClone(tied),beforeUntied=structuredClone(untied);
    const ctx=context(tied,'paired-tie-status',{random:[]});
    const a=advancePlanetDeadline(tied,ctx),b=advancePlanetDeadline(untied,ctx);
    assert.equal(a.advanced,true);assert.equal(b.advanced,true);
    assert.deepEqual(tied,beforeTied);assert.deepEqual(untied,beforeUntied);
    assert.equal(a.state.phase.kind,'NAV_SETTING');assert.equal(b.state.phase.kind,'NAV_SETTING');
    assert.equal(a.state.navigation.settingTie,true);assert.equal(b.state.navigation.settingTie,false);
    assert.equal(a.state.navigation.settingDirection,null);assert.equal(b.state.navigation.settingDirection,'Blue');
    assert.deepEqual(a.state.phase,b.state.phase);assert.equal(a.state.phase.endsAt-a.state.phase.startedAt,15_000);
    assert.equal(JSON.stringify(projectPlanetPublic(a.state)),JSON.stringify(projectPlanetPublic(b.state)),
      'Tie status cannot alter public phase identities, timing, revisions, events or any other byte');
    for(const id of ['seat-7','seat-3'])assert.equal(JSON.stringify(projectPlanetPlayer(a.state,id)),JSON.stringify(projectPlanetPlayer(b.state,id)),
      `${id}: Captain and unchanged bystander receive identical full packets and revisions`);
    assert.equal(projectPlanetPlayer(a.state,'seat-4').privateNavigation.tieChoice,true);
    assert.equal(projectPlanetPlayer(b.state,'seat-4').privateNavigation.tieChoice,false);
    assert.equal(projectPlanetPlayer(a.state,'seat-7').privateNavigation.direction,null);
    assert.equal(projectPlanetPlayer(b.state,'seat-7').privateNavigation.direction,null);
    d.replay(); // Exact replay covers the untouched native prefix only.
  });

  test(`${count}: CONSTRUCTED all-confined zero-zero with no offices still waits fifteen seconds then uses one recorded fair draw`,()=>{
    const d=roundTwoDriver(count);d.until(s=>s.round===2 && s.phase.kind==='BLACKOUT');
    const s=structuredClone(d.state),world=s.worlds[s.currentWorldId];world.captainSeatId=null;world.officerSeatId=null;
    for(const [i,seat] of world.seats.entries())Object.assign(seat,i<5
      ? {health:'Healthy',location:'Jail',slotId:`J${i+1}`,jailed:true,rescueDueAfterRound:null,medical:null}
      : {health:'Injured',location:'Hospital',slotId:`H${i-4}`,jailed:false,rescueDueAfterRound:3,
        medical:{admittedRound:2,rescueDueAfterRound:3,rescueOpportunity:'NEXT_NORMAL_ROUND'}});
    s.finalized.seats=world.seats.map(seat=>planetSeatView(world,seat));assertPlanetGameState(s);
    // Only this named control prefix is constructed; subsequent transitions use the public deadline API.
    const setting=advancePlanetDeadline(s,context(s,'zero-zero-entry',{random:[]})).state;
    assert.equal(setting.phase.kind,'NAV_SETTING');assert.equal(setting.phase.endsAt-setting.phase.startedAt,15_000);
    assert.equal(setting.navigation.settingTie,true);assert.equal(setting.navigation.direction,null);
    assert.equal(setting.navigation.settingDirection,null);assert.equal(setting.result,null);
    for(const id of d.ids)assert.equal(projectPlanetPlayer(setting,id).privateNavigation,null);
    refuseDeadline(setting,'zero-zero-early',{now:setting.phase.endsAt-1});
    for(const [sample,position] of [[.25,'B1'],[.75,'R1']]) {
      const ctx=context(setting,`zero-zero-${sample===.25?'blue':'red'}`,{now:setting.phase.endsAt+3_000,random:[sample,...Array(32).fill(.999999)]});
      const before=structuredClone(ctx),moved=advancePlanetDeadline(setting,ctx);
      assert.equal(moved.advanced,true);assert.deepEqual(ctx,before);
      assert.equal(moved.state.navigation.position,position);assert.equal(moved.state.navigation.lastMovedRound,2);
      assert.equal(moved.state.round,3);assert.equal(moved.state.result,null);
      assert.deepEqual(moved.state.turnOrder,d.ids,'Only the first sample chooses the tie; later samples independently shuffle the next round');
      refuseDeadline(moved.state,'zero-zero-duplicate',{...ctx});
    }
    d.replay(); // Replay evidence covers the native prefix, not the explicitly constructed authority.
  });

  test(`${count}: native original and Sync historical tuples keep immediate NAV_TIE behavior and omit new feedback fields`,()=>{
    for(const versions of [PLANET_ORIGINAL_PINS,PLANET_SYNC_PINS]) {
      const d=navigationDriver(count,{versions});
      assert.equal(d.state.phase.kind,'NAV_TIE');assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,15_000);
      assert.equal(Object.hasOwn(d.state.navigation,'settingTie'),false);assert.equal(Object.hasOwn(d.state.navigation,'settingDirection'),false);
      assert.equal(Object.hasOwn(d.state.global,'panelRequests'),false);assert.equal(Object.hasOwn(currentWorld(d),'panelReservations'),false);
      for(const id of d.ids) {
        const abilities=projectPlanetPlayer(d.state,id).abilities;
        assert.equal(Object.hasOwn(abilities,'engineerCapture'),false);assert.equal(Object.hasOwn(abilities,'panelRequest'),false);
      }
      assert.equal(currentWorld(d).seats.every(seat=>!Object.hasOwn(seat,'engineerCapture')),true);
      const badSetup={...d.setup,versions:{...d.state.versions,assetManifestVersion:'mismatched-art'}};
      assert.throws(()=>createPlanetGame(badSetup,context(d.state,'asset-mismatch')),/asset must match/);
      d.command('seat-4',{type:'CHOOSE_NAV_DIRECTION',direction:'Red'});
      assert.equal(d.state.phase.kind,'NAV_CAPTAIN_CONFIRM','Historical early choice still advances immediately');
      assert.equal(d.state.navigation.direction,'Red');d.replay();
    }
  });
}
