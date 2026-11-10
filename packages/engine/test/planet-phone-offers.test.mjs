import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {
  PLANET_GAME_PINS,PLANET_PHONE_OFFER_PINS,PLANET_ORIGINAL_PINS,PLANET_SYNC_PINS,PlanetVersionsSchema,
} from '@mothership/contracts';
import {
  createPlanetGame,applyPlanetCommand,advancePlanetDeadline,projectPlanetPublic,projectPlanetPlayer,
  assertPlanetGameState,decodePlanetGameState,encodePlanetGameState,
} from '../dist/index.js';
import {panelExhaustedForEligibleRequest,physicalPlanetCommand} from '../dist/planet-game/physical.js';
import {planetHasPhoneOffers,planetHasPrivateFeedback,planetHasSyncPresentation,planetFaction} from '../dist/planet-game/model.js';
import {planetWorldDriver,prepareBlackholeRound,moveAcross,currentWorld,worldSeat} from './planet-world-helper.mjs';

const copy=value=>structuredClone(value);
const baseline=JSON.parse(readFileSync(new URL('./fixtures/planet-1.1-replay.json',import.meta.url),'utf8'));
const candidateVersions=assetManifestVersion=>({...PLANET_PHONE_OFFER_PINS,assetManifestVersion});
const phoneDriver=(count,options={})=>planetWorldDriver(count,{...options,versions:candidateVersions('planet-world-test-art')});
const offer=(state,id,type)=>projectPlanetPlayer(state,id).offers.find(value=>value.type===type);
function request(state,command,label){return {protocolVersion:3,matchId:state.matchId,phaseId:state.phase.id,commandId:label,command};}
function context(state,label,patch={}){return {now:state.evaluatedAt+1,nextPhaseId:`phone-next-${label}`,nextDeadlineToken:`phone-token-${label}`,random:Array(32).fill(.999999),...patch};}
function execute(state,actor,command,label,patch={}){return applyPlanetCommand(state,actor,request(state,command,label),context(state,label,patch));}
function patient(state,id='seat-6'){
  for(const world of Object.values(state.worlds)){
    const self=worldSeat(world,id);
    const slotId=['H1','H2','H3','H4'].find(slot=>!world.seats.some(seat=>seat.seatId!==id&&seat.slotId===slot));
    assert.ok(slotId);
    Object.assign(self,{health:'Injured',location:'Hospital',slotId,jailed:false,rescueDueAfterRound:state.round+1,
      medical:{admittedRound:state.round,rescueDueAfterRound:state.round+1,rescueOpportunity:'NEXT_NORMAL_ROUND'}});
    if(world.captainSeatId===id){world.captainSeatId=null;world.officerSeatId=null;}
    if(world.officerSeatId===id)world.officerSeatId=null;
  }
}
function nativePatient(count){
  const d=phoneDriver(count);
  d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-3');
  d.command('seat-3',{type:'REQUEST_BLACKOUT'});d.until(s=>s.phase.kind==='BLACKOUT');
  d.deadline({now:d.state.phase.startedAt+5000});
  d.command('seat-3',{type:'SELECT_BLACKOUT_SLOT',windowId:d.state.phase.id,slotId:'A1'},{now:d.state.phase.startedAt+5001});
  d.until(s=>s.round===2&&s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-2');
  assert.equal(worldSeat(currentWorld(d),'seat-1').health,'Injured');return d;
}
function declaration(count,target){
  const ids=Array.from({length:count},(_,i)=>`seat-${i+1}`),actor=target==='seat-1'?'seat-2':'seat-1';
  const roomA=new Set([actor,target]);for(const id of ids)if(roomA.size<5)roomA.add(id);
  const d=phoneDriver(count,{initialRooms:Object.fromEntries(ids.map(id=>[id,roomA.has(id)?'Room A':'Room B']))});
  d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId===actor);
  d.command(actor,{type:'REQUEST_HACK',targetSeatId:target});d.command(actor,{type:'PASS_TURN'});
  assert.equal(d.state.phase.kind,'HACK_DECLARE');return d;
}

for(const count of [7,8,9]){
  test(`${count}: native patient keypad lists every original number without a stock or Doctor-identity oracle`,()=>{
    const d=nativePatient(count),prefix=copy(d.state),expected=d.ids;
    assert.deepEqual(offer(prefix,'seat-1','PANEL_CODE').targetSeatIds,expected);
    const before=copy(prefix),publicView=projectPlanetPublic(prefix);
    const nonDoctor=Object.fromEntries(d.ids.filter(id=>id!=='seat-2').map(id=>[id,projectPlanetPlayer(prefix,id)]));
    for(const stock of [0,1,2]){
      const twin=copy(prefix);currentWorld({state:twin}).injectionsRemaining=stock;
      assertPlanetGameState(twin);
      assert.deepEqual(projectPlanetPublic(twin),publicView);
      for(const [id,view]of Object.entries(nonDoctor))assert.deepEqual(projectPlanetPlayer(twin,id),view,`${id}/stock${stock}`);
      assert.deepEqual(offer(twin,'seat-1','PANEL_CODE').targetSeatIds,expected);
    }
    const changedDoctor=copy(prefix);
    [changedDoctor.roles['seat-2'],changedDoctor.roles['seat-4']]=[changedDoctor.roles['seat-4'],changedDoctor.roles['seat-2']];
    changedDoctor.code=d.ids.filter(id=>['Undercover','Alien','Insider','Doctor'].includes(changedDoctor.roles[id]));
    assertPlanetGameState(changedDoctor);
    assert.deepEqual(offer(changedDoctor,'seat-1','PANEL_CODE'),offer(prefix,'seat-1','PANEL_CODE'));
    const offboard=copy(prefix),removed=worldSeat(currentWorld({state:offboard}),'seat-5');
    Object.assign(removed,{health:'Eliminated',location:null,slotId:null,rescueDueAfterRound:null,medical:null});
    assertPlanetGameState(offboard);
    assert.deepEqual(offer(offboard,'seat-1','PANEL_CODE').targetSeatIds,expected,'An original number stays a choice after elimination');
    const reordered=copy(prefix);reordered.roles=Object.fromEntries(Object.entries(reordered.roles).reverse());
    assertPlanetGameState(reordered);
    assert.deepEqual(offer(reordered,'seat-1','PANEL_CODE').targetSeatIds,expected,'Keypad order follows original numbers rather than object insertion');
    assert.deepEqual(prefix,before,'Offer reads never mutate authority');

    const empty=copy(prefix);currentWorld({state:empty}).injectionsRemaining=0;
    const emptyBefore=copy(empty);
    for(const doctorSeatId of ['seat-2','seat-3']){
      const result=execute(empty,'seat-1',{type:'PANEL_CODE',doctorSeatId},`empty-${doctorSeatId}`);
      assert.equal(result.receipt.code,'NO_INJECTION');assert.deepEqual(result.state,emptyBefore);assert.deepEqual(empty,emptyBefore);
    }
    // Direct defensive probes prove that the exhausted guard does not even read
    // correctness. Wire schemas necessarily parse the number before this helper.
    const unread={type:'PANEL_CODE',get doctorSeatId(){throw Error('Correctness must stay unread');}};
    assert.equal(panelExhaustedForEligibleRequest(empty,'seat-1',unread),true);
    assert.equal(physicalPlanetCommand(empty,'seat-1',unread,'empty-unread'),false);assert.deepEqual(empty,emptyBefore);

    const wrong=execute(prefix,'seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-3'},'wrong-number');
    assert.equal(wrong.receipt.status,'accepted');assert.equal(wrong.state.global.panelRequests['seat-1'].status,'WRONG');
    assert.equal(currentWorld({state:wrong.state}).injectionsRemaining,2);
    assert.equal(offer(wrong.state,'seat-1','PANEL_CODE'),undefined);
    d.command('seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-2'});
    assert.equal(d.state.global.panelRequests['seat-1'].status,'QUEUED');
    assert.equal(currentWorld(d).injectionsRemaining,1);assert.equal(offer(d.state,'seat-1','PANEL_CODE'),undefined);
    d.command('seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-2'},{accepted:false});
    d.until(s=>s.round===2&&s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-6');
    d.command('seat-6',{type:'SUBMIT_CODE',seatIds:['seat-1','seat-2','seat-3','seat-4']});
    assert.equal(d.state.global.codeAttempted,true);assert.equal(d.state.global.shipHackUnlocked,false);
    assert.ok(offer(d.state,'seat-6','SCAN'),'Wrong final Code retains ordinary Scan eligibility');
    assert.equal(offer(d.state,'seat-6','ACTIVATE_SHIP_HACK'),undefined);
    d.command('seat-6',{type:'SCAN',targetSeatId:'seat-3',guess:'Blue'});
    d.until(s=>s.round===3);assert.equal(d.state.global.panelRequests['seat-1'].status,'TREATED');
    assert.equal(worldSeat(currentWorld(d),'seat-1').health,'Healthy');d.replay();
  });

  for(let number=1;number<=count;number++)test(`${count}/seat-${number}: native Standard Hack declaration offers exact actor-private choices`,()=>{
    const id=`seat-${number}`,d=declaration(count,id),state=d.state,role=state.roles[id];
    const expected=['Undercover','Alien'].includes(role)?['Blue','Red','Alien']:[planetFaction(role)];
    assert.deepEqual(offer(state,id,'DECLARE_HACK_SIDE').declaredSides,expected);
    for(const other of d.ids.filter(value=>value!==id)){
      assert.equal(projectPlanetPlayer(state,other).offers.some(value=>Object.hasOwn(value,'declaredSides')),false);
    }
    assert.equal(JSON.stringify(projectPlanetPublic(state)).includes('declaredSides'),false);
    const historical=copy(state);historical.versions={...PLANET_GAME_PINS,assetManifestVersion:state.versions.assetManifestVersion};
    assert.equal(Object.hasOwn(offer(historical,id,'DECLARE_HACK_SIDE'),'declaredSides'),false);
    const withoutVersions=value=>{const result=copy(value);delete result.versions;return result;};
    assert.deepEqual(withoutVersions(projectPlanetPublic(state)),withoutVersions(projectPlanetPublic(historical)));
    for(const side of ['Blue','Red','Alien']){
      const before=copy(state),result=execute(state,id,{type:'DECLARE_HACK_SIDE',declaredSide:side},`claim-${id}-${side}`);
      assert.equal(result.receipt.status,expected.includes(side)?'accepted':'rejected');assert.deepEqual(state,before);
      if(expected.includes(side)){
        assert.equal(result.state.hack.declaredSide,side);assert.equal(result.state.hack.status,'DECLARED');
        assert.equal(result.state.phase.kind,'HACK_RESULT');
        assert.deepEqual(projectPlanetPlayer(result.state,id).hackFeedback,{id:state.hack.id,status:'DECLARED',declaredSide:side});
      }else assert.deepEqual(result.state,state);
    }
    d.command(id,{type:'DECLARE_HACK_SIDE',declaredSide:expected[0]});d.replay();
  });

  test(`${count}: candidate keeps giver-only Meet results across a native selected reality`,()=>{
    const d=prepareBlackholeRound(phoneDriver(count));
    d.command('seat-1',{type:'REQUEST_HACK',targetSeatId:'seat-2'});d.command('seat-1',{type:'PASS_TURN'});
    d.command('seat-2',{type:'DECLARE_HACK_SIDE',declaredSide:'Blue'});d.deadline();
    d.command('seat-1',{type:'OFFER_PROMISE',recipientSeatId:'seat-2',kind:'MEET_A',targetSeatId:null});
    d.command('seat-2',{type:'ACCEPT_PROMISE',promiseId:d.history.at(-1).request.commandId});
    const selected=moveAcross(d,'seat-2');d.until(s=>s.phase.kind==='BLACKHOLE_PRESENTATION');
    assert.equal(d.state.currentWorldId,selected);assert.equal(d.state.global.promises[0].status,'Pending');
    d.deadline();assert.equal(d.state.phase.kind,'JAIL_VOTE');
    assert.equal(worldSeat(currentWorld(d),'seat-1').location,'Room A');
    assert.equal(worldSeat(currentWorld(d),'seat-2').location,'Room B');
    assert.equal(d.state.global.promises[0].status,'Fulfilled');d.replay();
  });

  test(`${count}: candidate replays native predecessor commands with inherited Sync, neutral navigation and private feedback`,()=>{
    const prefixes=new Map();
    for(const f of baseline.fixtures.filter(value=>value.count===count&&value.label!=='native-empty-panel-wrong-code')){
      const setup=copy(f.setup);setup.versions=candidateVersions(setup.assetManifestVersion);
      let state=createPlanetGame(setup,copy(f.initialContext));
      const collect=()=>{
        assert.equal(state.phase.kind==='NAV_TIE',false);
        for(const id of Object.keys(state.roles)){
          const view=projectPlanetPlayer(state,id);assert.equal(Object.hasOwn(view.abilities,'panelRequest'),true);
          assert.equal(Object.hasOwn(view.abilities,'engineerCapture'),true);
        }
        if(state.phase.kind==='BLACKHOLE_PRESENTATION')assert.equal(state.phase.endsAt-state.phase.startedAt,6000);
        if(state.phase.kind==='NAV_SETTING')assert.equal(state.phase.endsAt-state.phase.startedAt,15000);
        if(state.round===2){
          if(!prefixes.has(state.phase.kind))prefixes.set(state.phase.kind,copy(state));
          if(state.phase.kind==='ORDINARY_TURN'&&state.activeSeatId==='seat-6')prefixes.set('HACKER_ORDINARY_TURN',copy(state));
        }
      };
      collect();
      for(const record of f.history){
        if(record.kind==='COMMAND'){
          const result=applyPlanetCommand(state,record.actor,copy(record.request),copy(record.context));
          assert.deepEqual(result.receipt,record.receipt);state=result.state;
        }else{
          const result=advancePlanetDeadline(state,copy(record.context));assert.equal(result.advanced,true);state=result.state;
        }
        collect();
      }
      assert.deepEqual(decodePlanetGameState(encodePlanetGameState(state)),state);
      assert.equal(state.round,3);
      if(f.label==='native-feedback-sync-code'){
        assert.equal(state.global.panelRequests['seat-1'].status,'TREATED');
        assert.equal(state.global.codeAttempted,true);assert.equal(state.global.shipHackUnlocked,true);
        if(count===9)assert.notEqual(projectPlanetPlayer(state,'seat-9').abilities.engineerCapture,null);
      }
    }

    // Named constructed boundary controls over native phase prefixes. Changing
    // health/action state here is not claimed as a second native gameplay history.
    const open=['CAPTAIN_ELECTION','VOTE_RESULT','OFFICER_APPOINTMENT','PRE_TURN','ORDINARY_TURN','HACKER_ORDINARY_TURN',
      'HACK_DECLARE','HACK_RESULT','HACK','BLACKHOLE_PRESENTATION','JAIL_VOTE','BLACKOUT'];
    for(const kind of open){
      const prefix=prefixes.get(kind);assert.ok(prefix,`Native prefix for${kind}`);
      assert.equal(prefix.navigation.started,false);
      for(const status of ['Healthy','Injured','Jailed'])for(const spent of [false,true]){
        const state=copy(prefix);state.global.codeAttempted=false;state.global.shipHackUnlocked=false;
        for(const world of Object.values(state.worlds)){
          const self=worldSeat(world,'seat-6');self.roleActionSpent=spent;
          if(status==='Jailed'){
            Object.assign(self,{health:'Healthy',location:'Jail',slotId:'J5',jailed:true,rescueDueAfterRound:null,medical:null});
            if(world.captainSeatId==='seat-6'){world.captainSeatId=null;world.officerSeatId=null;}
            if(world.officerSeatId==='seat-6')world.officerSeatId=null;
          }
        }
        if(status==='Injured')patient(state);
        assert.doesNotThrow(()=>assertPlanetGameState(state),`${kind}/${status}/${spent}`);
        const before=copy(state),label=`code-${kind}-${status}-${spent}`;
        assert.ok(offer(state,'seat-6','SUBMIT_CODE'),label);
        const result=execute(state,'seat-6',{type:'SUBMIT_CODE',seatIds:[...state.code]},label);
        assert.equal(result.receipt.status,'accepted',label);assert.deepEqual(state,before);
        assert.equal(result.state.global.codeAttempted,true);assert.equal(result.state.global.shipHackUnlocked,true);
        for(const [id,world]of Object.entries(state.worlds))assert.deepEqual(result.state.worlds[id],world,'Code spends no Role Action or physical resource');
        assert.equal(offer(result.state,'seat-6','SUBMIT_CODE'),undefined);
        assert.equal(execute(result.state,'seat-6',{type:'SUBMIT_CODE',seatIds:[...state.code]},`${label}-again`).receipt.code,'NOT_ALLOWED');
      }
    }
    for(const [kind,prefix]of prefixes)if(kind.startsWith('NAV_')){
      const state=copy(prefix);state.global.codeAttempted=false;state.global.shipHackUnlocked=false;
      assert.equal(offer(state,'seat-6','SUBMIT_CODE'),undefined);
      const result=execute(state,'seat-6',{type:'SUBMIT_CODE',seatIds:[...state.code]},`closed-${kind}`);
      assert.equal(result.receipt.code,'NOT_ALLOWED');assert.deepEqual(result.state,state);
    }
    const roundOne=createPlanetGame({...baseline.fixtures.find(f=>f.count===count).setup,versions:candidateVersions('planet-world-test-art')},copy(baseline.fixtures[0].initialContext));
    assert.equal(offer(roundOne,'seat-6','SUBMIT_CODE'),undefined);
    assert.equal(execute(roundOne,'seat-6',{type:'SUBMIT_CODE',seatIds:[...roundOne.code]},'round-one-code').receipt.code,'NOT_ALLOWED');
    const eliminated=copy(prefixes.get('ORDINARY_TURN'));eliminated.global.codeAttempted=false;eliminated.global.shipHackUnlocked=false;
    for(const world of Object.values(eliminated.worlds)){
      const self=worldSeat(world,'seat-6');Object.assign(self,{health:'Eliminated',location:null,slotId:null,medical:null,rescueDueAfterRound:null});
      if(world.captainSeatId==='seat-6'){world.captainSeatId=null;world.officerSeatId=null;}
    }
    assertPlanetGameState(eliminated);assert.equal(offer(eliminated,'seat-6','SUBMIT_CODE'),undefined);
    assert.equal(execute(eliminated,'seat-6',{type:'SUBMIT_CODE',seatIds:[...eliminated.code]},'eliminated-code').receipt.code,'NOT_ALLOWED');
  });
}

test('candidate gates inherit exactly their supported predecessors and unknown or mixed tuples fail closed',()=>{
  for(const pins of [PLANET_ORIGINAL_PINS,PLANET_SYNC_PINS,PLANET_GAME_PINS,PLANET_PHONE_OFFER_PINS]){
    const versions={...pins,assetManifestVersion:'planet-world-test-art'};
    assert.equal(planetHasPhoneOffers(versions),pins===PLANET_PHONE_OFFER_PINS);
    assert.equal(planetHasPrivateFeedback(versions),[PLANET_GAME_PINS,PLANET_PHONE_OFFER_PINS].includes(pins));
    assert.equal(planetHasSyncPresentation(versions),pins!==PLANET_ORIGINAL_PINS);
  }
  const f=baseline.fixtures[0],setup={...copy(f.setup),versions:candidateVersions(f.setup.assetManifestVersion)},state=createPlanetGame(setup,copy(f.initialContext));
  for(const versions of [
    {...state.versions,engineVersion:'planet-game-1.2.1'},
    {...state.versions,rulesetVersion:PLANET_SYNC_PINS.rulesetVersion},
    {...state.versions,rulesetHash:PLANET_SYNC_PINS.rulesetHash},
    {...state.versions,protocolVersion:2},
  ]){
    assert.equal(PlanetVersionsSchema.safeParse(versions).success,false);
    assert.throws(()=>createPlanetGame({...setup,versions},copy(f.initialContext)));
    const tampered={...copy(state),versions};
    assert.throws(()=>decodePlanetGameState(tampered));assert.throws(()=>projectPlanetPublic(tampered));
    assert.throws(()=>projectPlanetPlayer(tampered,'seat-1'));
    assert.throws(()=>execute(tampered,'seat-1',{type:'PASS_TURN'},'invalid-tuple'));
  }
  assert.throws(()=>createPlanetGame({...setup,assetManifestVersion:'other-art'},copy(f.initialContext)),/asset/i);
  const defaultGame=createPlanetGame(copy(f.setup),copy(f.initialContext));assert.equal(defaultGame.versions.engineVersion,'planet-game-1.1.0');
});
