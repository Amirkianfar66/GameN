import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
  PLANET_BLACKOUT_PINS,PLANET_GAME_PINS,PLANET_PHONE_OFFER_PINS,
  PlanetPublicViewSchema,PlanetPlayerViewSchema,
} from '@mothership/contracts';
import {
  advancePlanetDeadline,abortPlanetGame,assertPlanetGameState,projectPlanetPublic,projectPlanetPlayer,
  encodePlanetGameState,decodePlanetGameState,
} from '../dist/index.js';
import {planetWorldDriver,prepareBlackholeRound,moveAcross,currentWorld,worldSeat} from './planet-world-helper.mjs';

// Expectations were specified independently from the 10 November owner decision
// and Proposal B before adopting its contract or implementation. Native histories
// replay; constructed controls use valid explicitly labelled predecessors and do
// not claim native reachability, service transactions or human balance evidence.
const copy=value=>structuredClone(value);
const versions=pins=>({...pins,assetManifestVersion:'planet-world-test-art'});
const candidate=(count,options={})=>planetWorldDriver(count,{...options,versions:versions(PLANET_BLACKOUT_PINS)});
const physical=(d,id)=>worldSeat(currentWorld(d),id);
const publicView=d=>projectPlanetPublic(d.state);
const own=(d,id)=>projectPlanetPlayer(d.state,id);
const cue=(view,kind)=>view.events.filter(event=>event.kind===kind);
const nativePredecessors=new Map();
const published=d=>Object.fromEntries([['public',publicView(d)],...d.ids.map(id=>[id,own(d,id)])]
  .map(([audience,view])=>[audience,copy(view.events.filter(event=>event.round===d.state.round&&['INJURED','ATTACK_BLOCKED'].includes(event.kind)))]));
function retainPublished(d,before,label){
  for(const [audience,events]of Object.entries(before))for(const event of events){
    const current=(audience==='public'?publicView(d):own(d,audience)).events.find(candidate=>candidate.id===event.id);
    assert.deepEqual(current,event,`${label}/${audience}/${event.kind}: first publication identity, anchor and metadata are immutable`);
  }
}

function checkpoint(d,expected){
  const shared=publicView(d);assert.equal(shared.board.checkpoint,expected);PlanetPublicViewSchema.parse(shared);
  for(const id of d.ids){const view=own(d,id);assert.equal(view.board.checkpoint,expected);PlanetPlayerViewSchema.parse(view);}
}
function refuseDeadline(d,label,patch={}){
  const before=copy(d.state),result=advancePlanetDeadline(before,{now:before.phase.endsAt,nextPhaseId:`audit-refusal-${label}`,
    nextDeadlineToken:`audit-refusal-token-${label}`,random:Array(32).fill(.99),phaseId:before.phase.id,deadlineToken:before.deadlineToken,...patch});
  assert.equal(result.advanced,false,label);assert.deepEqual(result.state,before);assert.deepEqual(d.state,before);
}
function fixedStep(d,label,now=d.state.phase.endsAt){
  const before=copy(d.state),ctx={now,nextPhaseId:`audit-phase-${label}`,nextDeadlineToken:`audit-token-${label}`,
    random:Array(32).fill(.99),phaseId:before.phase.id,deadlineToken:before.deadlineToken};
  const result=advancePlanetDeadline(d.state,ctx);assert.equal(result.advanced,true,label);assert.deepEqual(d.state,before);
  d.replaceForConstructedControl(result.state);assertPlanetGameState(d.state);return ctx;
}
function dark(d){fixedStep(d,'dark',d.state.phase.startedAt+5_000);assert.equal(d.state.phase.kind,'BLACKOUT');}
function select(d,actor,target){
  const slotId=physical(d,target).slotId;assert.ok(slotId);
  d.command(actor,{type:'SELECT_BLACKOUT_SLOT',windowId:d.state.phase.id,slotId},{now:d.state.phase.startedAt+5_001});
}
function voteOpened(d,label='blackout-commit',late=0){
  const at=d.state.phase.endsAt+late,oldPhase=copy(d.state.phase),oldToken=d.state.deadlineToken,ctx=fixedStep(d,label,at);
  assert.equal(d.state.phase.kind,'JAIL_VOTE');assert.equal(d.state.phase.startedAt,at);assert.equal(d.state.phase.endsAt,at+60_000);
  assert.notEqual(d.state.phase.id,oldPhase.id);assert.notEqual(d.state.deadlineToken,oldToken);checkpoint(d,'AFTER_BLACKOUT');
  refuseDeadline(d,'duplicate-blackout-commit',ctx);return d.state;
}
function remainingResolution(d,label='remaining'){
  fixedStep(d,`${label}-vote`);assert.equal(d.state.phase.kind,'VOTE_RESULT');
  assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,5_000);
  refuseDeadline(d,`${label}-result-early`,{now:d.state.phase.endsAt-1});
  fixedStep(d,`${label}-result`);assert.notEqual(d.state.phase.kind,'BLACKOUT');return d.state;
}

function constructed(count,round=4){
  const d=candidate(count),key=`${count}/${round}`;
  if(!nativePredecessors.has(key)){d.until(s=>s.round===round&&s.phase.kind==='ORDINARY_TURN');nativePredecessors.set(key,copy(d.state));}
  else d.replaceForConstructedControl(copy(nativePredecessors.get(key)));
  const s=copy(d.state);
  s.round=round;s.global.roundOrders[String(round)]=[...d.ids];s.turnOrder=[...d.ids];s.turnIndex=count-1;s.activeSeatId=d.ids.at(-1);
  s.phase={id:`audit-last-turn-${count}-${round}`,kind:'ORDINARY_TURN',startedAt:2_000,endsAt:62_000};s.deadlineToken=`audit-last-token-${count}-${round}`;s.evaluatedAt=2_001;
  s.navigation.lastMovedRound=round-1;s.navigation.started=false;s.navigation.direction=null;s.navigation.settingDirection=null;s.navigation.settingTie=false;
  s.panelOpen=true;s.ballot=null;s.afterVote=null;d.replaceForConstructedControl(s);return d;
}
function layout(d,{patients=[],bodies=[],roomA=['seat-1','seat-2','seat-3','seat-5'],jailed=[]}={}){
  const w=currentWorld(d),hospital=[...patients,...bodies],a=roomA.filter(id=>d.ids.includes(id)&&!hospital.includes(id)&&!jailed.includes(id));
  const b=d.ids.filter(id=>!hospital.includes(id)&&!jailed.includes(id)&&!a.includes(id));assert.ok(a.length<=5&&b.length<=5&&hospital.length<=4);
  for(const seat of w.seats){
    const h=hospital.indexOf(seat.seatId),j=jailed.indexOf(seat.seatId),inA=a.includes(seat.seatId);
    Object.assign(seat,{health:h>=0?(patients.includes(seat.seatId)?'Injured':'Eliminated'):'Healthy',
      location:h>=0?'Hospital':j>=0?'Jail':inA?'Room A':'Room B',slotId:h>=0?`H${h+1}`:j>=0?`J${j+1}`:`${inA?'A':'B'}${(inA?a:b).indexOf(seat.seatId)+1}`,
      jailed:j>=0,lastRoom:inA?'Room A':'Room B',revealedFaction:null,rescueDueAfterRound:patients.includes(seat.seatId)?d.state.round:null,
      medical:patients.includes(seat.seatId)?{admittedRound:d.state.round-1,rescueDueAfterRound:d.state.round,rescueOpportunity:'CURRENT_NORMAL_ROUND'}:null});
  }
  assertPlanetGameState(d.state);return d;
}
function register(d,id,command){
  const s=copy(d.state);s.activeSeatId=id;s.turnIndex=s.turnOrder.indexOf(id);d.replaceForConstructedControl(s);
  return d.command(id,command);
}
function closeConstructedTurns(d){
  const s=copy(d.state);s.activeSeatId=s.turnOrder.at(-1);s.turnIndex=s.turnOrder.length-1;d.replaceForConstructedControl(s);
  fixedStep(d,'open-blackout');assert.equal(d.state.phase.kind,'BLACKOUT');assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,15_000);
  checkpoint(d,'PRE_BLACKOUT');return d;
}
function hospitalInvariant(d){
  const seats=currentWorld(d).seats,occupied=seats.filter(seat=>seat.location==='Hospital');assert.ok(occupied.length<=4);
  assert.equal(new Set(seats.flatMap(seat=>seat.slotId?[seat.slotId]:[])).size,seats.filter(seat=>seat.slotId!==null).length);
  for(const seat of seats.filter(seat=>seat.health==='Injured')){assert.equal(seat.location,'Hospital');assert.ok(seat.medical);}
  assertPlanetGameState(d.state);
}

for(const count of [7,8,9]){
  test(`${count}: native no-Sync path has full pre-vote Blackout, fresh vote/result clocks, strict checkpoint packets and exact replay`,()=>{
    const d=candidate(count);checkpoint(d,'INITIAL');d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId===d.ids.at(-1));
    const actualClose=d.state.phase.endsAt+17_000;d.deadline({now:actualClose});
    assert.equal(d.state.phase.kind,'BLACKOUT');assert.equal(d.state.phase.startedAt,actualClose);assert.equal(d.state.phase.endsAt,actualClose+15_000);checkpoint(d,'PRE_BLACKOUT');
    assert.equal(d.state.ballot,null);assert.equal(d.state.panelOpen,false);assert.equal(d.state.navigation.started,false);
    d.command('seat-1',{type:'VOTE',targetSeatId:'seat-2'},{accepted:false});d.command('seat-1',{type:'MOVE',destination:'Room B',slotId:'B5'},{accepted:false});
    refuseDeadline(d,'lit-one-ms-early',{now:actualClose+4_999});
    const interval=copy(d.state.phase);d.deadline({now:actualClose+5_000});assert.deepEqual(d.state.phase,interval);
    refuseDeadline(d,'dark-one-ms-early',{now:interval.endsAt-1});const actualVote=interval.endsAt+41_000;
    d.deadline({now:actualVote});assert.equal(d.state.phase.kind,'JAIL_VOTE');assert.equal(d.state.phase.startedAt,actualVote);assert.equal(d.state.phase.endsAt,actualVote+60_000);checkpoint(d,'AFTER_BLACKOUT');
    const completion=copy(d.history.at(-1).context);refuseDeadline(d,'native-stale-blackout',completion);
    const actualVoteClose=d.state.phase.endsAt+13_000;d.deadline({now:actualVoteClose});assert.equal(d.state.phase.kind,'VOTE_RESULT');assert.equal(d.state.phase.startedAt,actualVoteClose);assert.equal(d.state.phase.endsAt,actualVoteClose+5_000);
    d.deadline();assert.equal(d.state.round,2);assert.notEqual(d.state.phase.kind,'BLACKOUT');checkpoint(d,'ROUND_FINALIZED');d.replay();
    for(const schema of [PlanetPublicViewSchema,PlanetPlayerViewSchema]){
      const view=schema===PlanetPublicViewSchema?publicView(d):own(d,'seat-1');
      const invalid=copy(view);invalid.board.checkpoint='AFTER_SPECULATION';assert.equal(schema.safeParse(invalid).success,false);
      const missing=copy(view);delete missing.board.checkpoint;assert.equal(schema.safeParse(missing).success,false);
    }
  });

  test(`${count}: native whole-world Sync retains the admitted queue, waits six seconds, then Blackout commits before voting`,()=>{
    const d=prepareBlackholeRound(candidate(count));d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-3');
    d.command('seat-3',{type:'REQUEST_BLACKOUT'});const branch=moveAcross(d,'seat-2');
    d.until(s=>s.phase.kind==='BLACKHOLE_PRESENTATION');assert.equal(d.state.currentWorldId,branch);assert.deepEqual(Object.keys(d.state.worlds),[branch]);
    assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,6_000);assert.equal(d.state.ballot,null);assert.equal(physical(d,'seat-1').health,'Healthy');
    assert.equal(currentWorld(d).actions.some(action=>action.command.type==='REQUEST_BLACKOUT'),true);
    const restore=decodePlanetGameState(encodePlanetGameState(d.state));assert.deepEqual(restore,d.state);
    const at=d.state.phase.endsAt+23_000;d.deadline({now:at});assert.equal(d.state.phase.kind,'BLACKOUT');assert.equal(d.state.phase.startedAt,at);assert.equal(d.state.phase.endsAt,at+15_000);
    checkpoint(d,'PRE_BLACKOUT');d.deadline({now:at+5_000});select(d,'seat-3','seat-1');
    assert.equal(physical(d,'seat-1').health,'Healthy');d.deadline();assert.equal(d.state.phase.kind,'JAIL_VOTE');assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,60_000);
    assert.equal(physical(d,'seat-1').health,'Injured');assert.equal(physical(d,'seat-1').location,'Hospital');assert.equal(physical(d,'seat-3').blackoutSpent,true);checkpoint(d,'AFTER_BLACKOUT');d.replay();
  });

  test(`${count}: native Sync never admits or charges a request that exists only in the discarded reality`,()=>{
    const d=prepareBlackholeRound(candidate(count)),branch=moveAcross(d,'seat-2');
    d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-3');d.command('seat-3',{type:'REQUEST_BLACKOUT'});
    d.until(s=>s.phase.kind==='BLACKHOLE_PRESENTATION');assert.equal(d.state.currentWorldId,branch);assert.equal(currentWorld(d).actions.some(action=>action.command.type==='REQUEST_BLACKOUT'),false);
    d.deadline();assert.equal(d.state.phase.kind,'BLACKOUT');assert.equal(own(d,'seat-3').blackoutTargeting,null);assert.equal(physical(d,'seat-3').blackoutSpent,false);
    d.deadline();assert.equal(d.state.phase.kind,'JAIL_VOTE');assert.equal(physical(d,'seat-3').blackoutSpent,false);
    assert.ok(currentWorld(d).seats.every(seat=>seat.health==='Healthy'));assert.equal(cue(publicView(d),'INJURED').length,0);d.replay();
  });

  test(`${count}: native Meet checks the giver after Blackout forces Hospital, while its recipient stays in the promised room`,()=>{
    const d=candidate(count);d.deadline();d.command('seat-1',{type:'REQUEST_HACK',targetSeatId:'seat-2'});d.command('seat-1',{type:'PASS_TURN'});
    d.command('seat-2',{type:'DECLARE_HACK_SIDE',declaredSide:'Blue'});d.deadline();
    const promiseId=d.command('seat-1',{type:'OFFER_PROMISE',recipientSeatId:'seat-2',kind:'MEET_A',targetSeatId:null}).receipt.commandId;
    d.command('seat-2',{type:'ACCEPT_PROMISE',promiseId});d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-3');d.command('seat-3',{type:'REQUEST_BLACKOUT'});
    d.until(s=>s.phase.kind==='BLACKOUT');assert.equal(d.state.global.promises[0].status,'Pending');d.deadline({now:d.state.phase.startedAt+5_000});select(d,'seat-3','seat-1');
    assert.equal(d.state.global.promises[0].status,'Pending');d.deadline();assert.equal(d.state.phase.kind,'JAIL_VOTE');
    assert.equal(physical(d,'seat-1').location,'Hospital');assert.equal(physical(d,'seat-2').location,'Room A');assert.equal(d.state.global.promises[0].status,'Not fulfilled');
    assert.ok(d.state.ballot.eligibleVoters.includes('seat-1'));assert.ok(d.state.ballot.eligibleTargets.includes('seat-1'));
    for(const id of d.ids)assert.equal(own(d,id).promises.length,['seat-1','seat-2'].includes(id)?1:0);d.replay();
  });

  test(`${count}: constructed full H4 commits permanent overflow before reserved panel and Doctor Rescue can free a bed or heal the victim`,()=>{
    const d=layout(constructed(count),{patients:['seat-4','seat-5','seat-6','seat-7'],roomA:['seat-1','seat-2','seat-3']});
    register(d,'seat-2',{type:'RESCUE',targetSeatId:'seat-1'});register(d,'seat-7',{type:'PANEL_CODE',doctorSeatId:'seat-2'});register(d,'seat-3',{type:'REQUEST_BLACKOUT'});
    const panel=copy(d.state.global.panelRequests['seat-7']);assert.equal(panel.status,'QUEUED');assert.equal(currentWorld(d).injectionsRemaining,0);
    closeConstructedTurns(d);dark(d);select(d,'seat-3','seat-1');voteOpened(d);
    const victim=physical(d,'seat-1');assert.equal(victim.health,'Eliminated');assert.equal(victim.location,null);assert.equal(victim.slotId,null);assert.equal(victim.medical,null);assert.equal(victim.revealedFaction,null);
    assert.equal(physical(d,'seat-7').health,'Injured');assert.equal(d.state.global.panelRequests['seat-7'].status,'QUEUED');assert.equal(currentWorld(d).injectionsRemaining,0);
    const facts=publicView(d).events.filter(event=>event.seatIds.includes('seat-1'));
    assert.equal(facts.filter(event=>event.kind==='HOSPITAL_OVERFLOW_REMOVED').length,1);assert.equal(facts.some(event=>['INJURED','ELIMINATED'].includes(event.kind)),false);
    assert.ok(facts.every(event=>event.clinicalAnchor===null));assert.equal(d.state.ballot.eligibleVoters.includes('seat-1'),false);hospitalInvariant(d);
    const voters=[...d.state.ballot.eligibleVoters];for(const id of voters.slice(0,Math.ceil(voters.length/2)))d.command(id,{type:'VOTE',targetSeatId:'seat-2'});
    remainingResolution(d);assert.equal(physical(d,'seat-1').health,'Eliminated');assert.equal(physical(d,'seat-1').location,null);
    assert.equal(physical(d,'seat-2').jailed,true,'Threshold uses the smaller committed electorate, including living patients');
    assert.equal(physical(d,'seat-7').health,'Healthy');assert.equal(d.state.global.panelRequests['seat-7'].status,'TREATED');assert.equal(currentWorld(d).injectionsRemaining,0);
    assert.equal(cue(publicView(d),'RESCUED').some(event=>event.seatIds.includes('seat-1')),false);hospitalInvariant(d);
  });

  test(`${count}: constructed early admission keeps its bed against a lower-numbered later ordinary victim and the injured shooter's registration survives`,()=>{
    const d=layout(constructed(count),{patients:['seat-2','seat-4'],bodies:['seat-7'],roomA:['seat-1','seat-3','seat-5']});
    register(d,'seat-5',{type:'REGISTER_SHOT',targetSeatId:'seat-1'});register(d,'seat-3',{type:'REQUEST_BLACKOUT'});closeConstructedTurns(d);dark(d);select(d,'seat-3','seat-5');voteOpened(d);
    assert.equal(physical(d,'seat-5').health,'Injured');assert.equal(physical(d,'seat-5').slotId,'H4');assert.equal(physical(d,'seat-1').health,'Healthy');
    assert.equal(currentWorld(d).actions.some(action=>action.actorSeatId==='seat-5'&&action.command.type==='REGISTER_SHOT'),true);
    remainingResolution(d);assert.equal(physical(d,'seat-5').slotId,'H4');assert.equal(physical(d,'seat-1').health,'Eliminated');assert.equal(physical(d,'seat-1').location,null);
    assert.equal(physical(d,'seat-7').slotId,'H3');hospitalInvariant(d);
  });

  test(`${count}: constructed partial commit leaves ordinary Main-before-Shot, new Protection and accepted Rescue pending despite the actor's injury`,()=>{
    const d=layout(constructed(count));currentWorld(d).captainSeatId='seat-5';currentWorld(d).officerSeatId='seat-3';assertPlanetGameState(d.state);
    register(d,'seat-5',{type:'PROTECT',targetSeatId:'seat-1'});register(d,'seat-5',{type:'REGISTER_SHOT',targetSeatId:'seat-1'});
    register(d,'seat-2',{type:'RESCUE',targetSeatId:'seat-5'});register(d,'seat-3',{type:'REQUEST_BLACKOUT'});closeConstructedTurns(d);dark(d);select(d,'seat-3','seat-5');voteOpened(d);
    assert.equal(physical(d,'seat-5').health,'Injured');assert.equal(physical(d,'seat-1').health,'Healthy');assert.equal(physical(d,'seat-1').protection,null);
    assert.equal(currentWorld(d).captainSeatId,null);assert.equal(currentWorld(d).officerSeatId,null);assert.equal(publicView(d).offices.captainSeatId,null);
    assert.deepEqual(currentWorld(d).actions.map(action=>action.command.type).sort(),['PROTECT','REGISTER_SHOT','RESCUE']);assert.equal(cue(publicView(d),'RESCUED').length,0);
    const early=published(d);assert.ok(early.public.some(event=>event.kind==='INJURED'&&event.seatIds.includes('seat-5')));
    for(const id of d.state.ballot.eligibleVoters)d.command(id,{type:'VOTE',targetSeatId:'seat-5'});
    fixedStep(d,'pending-vote');assert.equal(d.state.phase.kind,'VOTE_RESULT');assert.equal(physical(d,'seat-5').jailed,true);retainPublished(d,early,'after-Jail');
    fixedStep(d,'pending-result');retainPublished(d,early,'after-Rescue-and-finalization');assert.equal(physical(d,'seat-5').health,'Healthy');assert.equal(physical(d,'seat-5').location,'Jail');assert.equal(physical(d,'seat-1').health,'Injured');
    assert.equal(physical(d,'seat-1').protection.activeFromRound,d.state.round+1);assert.equal(physical(d,'seat-1').protection.consumed,false);assert.deepEqual(currentWorld(d).actions,[]);hospitalInvariant(d);
  });

  test(`${count}: constructed accepted Doctor Rescue survives the Doctor's pre-vote injury without an early heal or refund`,()=>{
    const d=layout(constructed(count),{patients:['seat-1'],roomA:['seat-2','seat-3','seat-5','seat-7']});
    register(d,'seat-2',{type:'RESCUE',targetSeatId:'seat-1'});register(d,'seat-3',{type:'REQUEST_BLACKOUT'});closeConstructedTurns(d);dark(d);select(d,'seat-3','seat-2');voteOpened(d);
    assert.equal(physical(d,'seat-2').health,'Injured');assert.equal(physical(d,'seat-1').health,'Injured');assert.equal(currentWorld(d).injectionsRemaining,1);
    assert.equal(currentWorld(d).actions.some(action=>action.actorSeatId==='seat-2'&&action.command.type==='RESCUE'),true);
    remainingResolution(d);assert.equal(physical(d,'seat-1').health,'Healthy');assert.equal(physical(d,'seat-2').health,'Injured');assert.equal(currentWorld(d).injectionsRemaining,1);hospitalInvariant(d);
  });

  test(`${count}: constructed Clone blocks before Protection, survives the partial checkpoint and expires only after the remaining attack`,()=>{
    const d=layout(constructed(count),{roomA:['seat-1','seat-3','seat-5','seat-7']});
    Object.assign(physical(d,'seat-7'),{clone:{used:true,active:true,expiresAfterRound:d.state.round},protectionEver:true,protection:{donorSeatId:'seat-5',activeFromRound:d.state.round-1,consumed:false}});
    register(d,'seat-5',{type:'REGISTER_SHOT',targetSeatId:'seat-7'});register(d,'seat-3',{type:'REQUEST_BLACKOUT'});closeConstructedTurns(d);dark(d);select(d,'seat-3','seat-7');voteOpened(d);
    assert.equal(physical(d,'seat-7').health,'Healthy');assert.equal(physical(d,'seat-7').clone.active,true);assert.equal(physical(d,'seat-7').protection.consumed,false);
    assert.equal(cue(own(d,'seat-7'),'ATTACK_BLOCKED').length,1);assert.equal(cue(publicView(d),'ATTACK_BLOCKED').length,0);
    const early=published(d);
    remainingResolution(d);assert.equal(physical(d,'seat-7').health,'Healthy');assert.equal(physical(d,'seat-7').clone.active,false);assert.equal(physical(d,'seat-7').protection.consumed,false);
    assert.equal(cue(own(d,'seat-7'),'ATTACK_BLOCKED').length,2);retainPublished(d,early,'after-second-block-and-finalization');
  });

  test(`${count}: constructed partial checkpoint does not age existing injuries or apply Round-3 Supply, Protection grants or Clone expiry`,()=>{
    const d=layout(constructed(count,3),{patients:['seat-1'],roomA:['seat-2','seat-3','seat-4','seat-5','seat-7']});
    physical(d,'seat-7').clone={used:true,active:true,expiresAfterRound:3};
    register(d,'seat-4',{type:'SUPPLY',targetSeatIds:['seat-2','seat-5']});register(d,'seat-5',{type:'PROTECT',targetSeatId:'seat-2'});register(d,'seat-3',{type:'REQUEST_BLACKOUT'});
    const weapons=[physical(d,'seat-2').ordinaryWeapons,physical(d,'seat-5').ordinaryWeapons];closeConstructedTurns(d);voteOpened(d);
    assert.equal(physical(d,'seat-1').health,'Injured');assert.equal(physical(d,'seat-1').rescueDueAfterRound,3);assert.equal(physical(d,'seat-7').clone.active,true);assert.equal(physical(d,'seat-2').protection,null);
    assert.deepEqual([physical(d,'seat-2').ordinaryWeapons,physical(d,'seat-5').ordinaryWeapons],weapons);
    remainingResolution(d);assert.equal(physical(d,'seat-1').health,'Eliminated');assert.equal(physical(d,'seat-7').clone.active,false);assert.equal(physical(d,'seat-2').protection.activeFromRound,4);
    assert.deepEqual([physical(d,'seat-2').ordinaryWeapons,physical(d,'seat-5').ordinaryWeapons],weapons.map(value=>value+1));
  });

  test(`${count}: constructed empty electorate still receives full Blackout/vote/result before No survivors finalization`,()=>{
    const d=constructed(count),s=copy(d.state);
    for(const [index,seat]of currentWorld({state:s}).seats.entries())Object.assign(seat,{health:'Eliminated',location:index<4?'Hospital':null,slotId:index<4?`H${index+1}`:null,medical:null,rescueDueAfterRound:null});
    s.phase={...s.phase,kind:'PRE_TURN',endsAt:s.phase.startedAt+15_000};s.activeSeatId=null;s.turnIndex=0;d.replaceForConstructedControl(s);assertPlanetGameState(s);
    fixedStep(d,'empty-open');assert.equal(d.state.phase.kind,'BLACKOUT');assert.equal(d.state.result,null);voteOpened(d,'empty-commit');
    assert.deepEqual(d.state.ballot.eligibleVoters,[]);assert.deepEqual(d.state.ballot.eligibleTargets,[]);assert.equal(d.state.result,null);
    fixedStep(d,'empty-vote');assert.equal(d.state.phase.kind,'VOTE_RESULT');assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,5_000);assert.equal(d.state.result,null);
    fixedStep(d,'empty-result');assert.equal(d.state.phase.kind,'FINISHED');assert.equal(d.state.result.reason,'NO_SURVIVORS');assert.equal(d.state.result.winner,null);
  });

  test(`${count}: constructed living Hacker retains P18 through lit/dark Blackout, vote and result while Healthy, Injured or Jailed`,()=>{
    for(const condition of ['Healthy','Injured','Jailed'])for(const phase of ['LIT','DARK','VOTE','RESULT']){
      const d=layout(constructed(count),{patients:condition==='Injured'?['seat-6']:[],jailed:condition==='Jailed'?['seat-6']:[]});closeConstructedTurns(d);
      if(phase==='DARK')dark(d);if(['VOTE','RESULT'].includes(phase))voteOpened(d);if(phase==='RESULT')fixedStep(d,'hacker-vote');
      const before=copy(d.state),publicBefore=publicView(d),others=Object.fromEntries(d.ids.filter(id=>id!=='seat-6').map(id=>[id,own(d,id)]));
      d.command('seat-6',{type:'SUBMIT_CODE',seatIds:[...d.state.code]});assert.equal(d.state.global.codeAttempted,true);assert.equal(d.state.global.shipHackUnlocked,true);
      assert.deepEqual(d.state.phase,before.phase);assert.equal(physical(d,'seat-6').roleActionSpent,worldSeat(currentWorld({state:before}),'seat-6').roleActionSpent);
      assert.deepEqual(publicView(d),publicBefore);for(const [id,view]of Object.entries(others))assert.deepEqual(own(d,id),view);
      d.command('seat-6',{type:'SUBMIT_CODE',seatIds:[...d.state.code]},{accepted:false});
    }
    const d=closeConstructedTurns(layout(constructed(count)));voteOpened(d);remainingResolution(d);assert.equal(d.state.navigation.started,true);
    d.command('seat-6',{type:'SUBMIT_CODE',seatIds:[...d.state.code]},{accepted:false});
  });

  test(`${count}: constructed hidden request, consuming miss and timeout leave public and unrelated player packets identical`,()=>{
    const absent=layout(constructed(count)),requested=layout(constructed(count));register(requested,'seat-3',{type:'REQUEST_BLACKOUT'});
    closeConstructedTurns(absent);closeConstructedTurns(requested);assert.deepEqual(publicView(requested),publicView(absent));assert.deepEqual(own(requested,'seat-1'),own(absent,'seat-1'));
    assert.equal(own(absent,'seat-3').blackoutTargeting,null);assert.ok(own(requested,'seat-3').blackoutTargeting);
    dark(absent);dark(requested);const before=publicView(requested),otherBefore=own(requested,'seat-1');select(requested,'seat-3','seat-3');
    assert.deepEqual(publicView(requested),before);assert.deepEqual(own(requested,'seat-1'),otherBefore);
    voteOpened(absent);voteOpened(requested);assert.deepEqual(publicView(requested),publicView(absent));assert.deepEqual(own(requested,'seat-1'),own(absent,'seat-1'));
    assert.equal(physical(requested,'seat-3').blackoutSpent,true);assert.equal(physical(absent,'seat-3').blackoutSpent,false);
    for(const view of [publicView(requested),own(requested,'seat-1')]){assert.equal(Object.hasOwn(view,'blackoutBatch'),false);assert.equal(Object.hasOwn(view,'requested'),false);assert.equal(view.endReveal,null);}
  });

  test(`${count}: constructed targeting rejects early/wrong-window/wrong-room input, then locks one consuming self or empty miss; timeout also spends once`,()=>{
    for(const choice of ['self','empty','timeout']){
      const d=layout(constructed(count));register(d,'seat-3',{type:'REQUEST_BLACKOUT'});closeConstructedTurns(d);
      const command={type:'SELECT_BLACKOUT_SLOT',windowId:d.state.phase.id,slotId:'A1'};
      d.command('seat-3',command,{now:d.state.phase.startedAt+4_999,accepted:false});assert.equal(physical(d,'seat-3').blackoutSpent,false);dark(d);
      d.command('seat-3',{...command,windowId:'audit-wrong-window'},{now:d.state.phase.startedAt+5_000,accepted:false});
      d.command('seat-3',{...command,slotId:'B1'},{now:d.state.phase.startedAt+5_000,accepted:false});assert.equal(physical(d,'seat-3').blackoutSpent,false);
      if(choice!=='timeout'){
        d.command('seat-3',{...command,slotId:choice==='self'?physical(d,'seat-3').slotId:'A5'},{now:d.state.phase.startedAt+5_000});
        assert.equal(physical(d,'seat-3').blackoutSpent,true);d.command('seat-3',command,{now:d.state.phase.startedAt+5_001,accepted:false});
      }
      const before=currentWorld(d).seats.map(seat=>[seat.seatId,seat.health,seat.location,seat.slotId]);voteOpened(d);
      assert.equal(physical(d,'seat-3').blackoutSpent,true);assert.deepEqual(currentWorld(d).seats.map(seat=>[seat.seatId,seat.health,seat.location,seat.slotId]),before);
    }
  });

  test(`${count}: constructed ineligible untargeted requester is not admitted, charged or offered a picker`,()=>{
    const d=layout(constructed(count));register(d,'seat-3',{type:'REQUEST_BLACKOUT'});
    Object.assign(physical(d,'seat-3'),{health:'Injured',location:'Hospital',slotId:'H1',rescueDueAfterRound:d.state.round+1,
      medical:{admittedRound:d.state.round,rescueDueAfterRound:d.state.round+1,rescueOpportunity:'NEXT_NORMAL_ROUND'}});
    closeConstructedTurns(d);assert.equal(own(d,'seat-3').blackoutTargeting,null);assert.equal(physical(d,'seat-3').blackoutSpent,false);
    voteOpened(d);assert.equal(physical(d,'seat-3').blackoutSpent,false);assert.equal(physical(d,'seat-3').health,'Injured');
  });

  test(`${count}: constructed defensive feedback is identical for Clone and Protection and remains limited to the actual impact room, including its retained body`,()=>{
    const run=clone=>{
      const d=layout(constructed(count),{roomA:['seat-1','seat-2','seat-3','seat-4','seat-7']});
      // An explicitly constructed retained room-body audience control; this does
      // not claim that an ordinary new injury can bypass Hospital admission.
      Object.assign(physical(d,'seat-4'),{health:'Eliminated',medical:null,rescueDueAfterRound:null});
      Object.assign(physical(d,'seat-7'),{clone:{used:true,active:clone,expiresAfterRound:d.state.round},protectionEver:true,
        protection:{donorSeatId:'seat-5',activeFromRound:d.state.round-1,consumed:false}});
      register(d,'seat-3',{type:'REQUEST_BLACKOUT'});closeConstructedTurns(d);dark(d);select(d,'seat-3','seat-7');voteOpened(d);return d;
    };
    const protection=run(false),clone=run(true),recipients=['seat-1','seat-2','seat-3','seat-4','seat-7'];
    assert.deepEqual(publicView(clone),publicView(protection));assert.equal(cue(publicView(clone),'ATTACK_BLOCKED').length,0);
    for(const id of clone.ids){
      const events=cue(own(clone,id),'ATTACK_BLOCKED');assert.equal(events.length,recipients.includes(id)?1:0);
      assert.deepEqual(events,cue(own(protection,id),'ATTACK_BLOCKED'),`${id}: the authorized block cue never identifies its defense source`);
      if(!['seat-5','seat-7'].includes(id))assert.deepEqual(own(clone,id),own(protection,id),`${id}: no defense-source cue`);
      for(const event of events){assert.equal(event.actorSeatId,null);assert.deepEqual(event.seatIds,['seat-7']);assert.equal(event.location,'Room A');assert.equal(event.clinicalAnchor,null);
        assert.equal(event.audience.kind,'player');assert.equal(event.audience.seatId,id);assert.equal(event.publishedAt,clone.state.phase.startedAt);
        assert.equal(Object.hasOwn(event,'cause'),false);assert.equal(Object.hasOwn(event,'grantorSeatId'),false);}
    }
    assert.equal(physical(protection,'seat-7').protection.consumed,true);assert.equal(physical(clone,'seat-7').protection.consumed,false);
    assert.deepEqual(own(protection,'seat-5').abilities.protectionGrants,[{targetSeatId:'seat-7',activeFromRound:protection.state.round-1,consumed:true}]);
    assert.deepEqual(own(clone,'seat-5').abilities.protectionGrants,[{targetSeatId:'seat-7',activeFromRound:clone.state.round-1,consumed:false}]);
    const donor=copy(own(clone,'seat-5'));donor.abilities.protectionGrants[0].consumed=true;
    assert.deepEqual(donor,own(protection,'seat-5'),'Only the donor\'s authorized consumed flag differs');
    const defender=copy(own(clone,'seat-7'));defender.abilities.clone.active=false;
    assert.deepEqual(defender,own(protection,'seat-7'),'Only the defender\'s own Clone activation differs');
  });

  for(const pins of [PLANET_GAME_PINS,PLANET_PHONE_OFFER_PINS])test(`${count}: historical ${pins.engineVersion} keeps vote/result before Blackout, omits candidate checkpoint and replays exactly`,()=>{
    const d=planetWorldDriver(count,{versions:versions(pins)});d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId===d.ids.at(-1));d.deadline();
    assert.equal(d.state.phase.kind,'JAIL_VOTE');assert.equal(Object.hasOwn(d.state,'blackoutBatch'),false);assert.equal(Object.hasOwn(publicView(d).board,'checkpoint'),false);
    for(const id of d.ids)assert.equal(Object.hasOwn(own(d,id).board,'checkpoint'),false);
    d.deadline();assert.equal(d.state.phase.kind,'VOTE_RESULT');d.deadline();assert.equal(d.state.phase.kind,'BLACKOUT');d.deadline();d.replay();
  });

  test(`${count}: native publication categories survive reconnect and abort at every boundary, including the Jail republish and next-round carry`,()=>{
    const d=candidate(count),snapshots=[];
    const retain=label=>{snapshots.push({label,state:copy(d.state),public:publicView(d)});};
    checkpoint(d,'INITIAL');assert.equal(publicView(d).board.finalizedRound,0);retain('initial');
    d.until(s=>s.phase.kind==='BLACKOUT');checkpoint(d,'PRE_BLACKOUT');retain('pre-blackout');
    d.deadline();assert.equal(d.state.phase.kind,'JAIL_VOTE');checkpoint(d,'AFTER_BLACKOUT');retain('after-blackout');
    for(const id of d.state.ballot.eligibleVoters)d.command(id,{type:'VOTE',targetSeatId:'seat-1'});
    d.deadline();assert.equal(d.state.phase.kind,'VOTE_RESULT');checkpoint(d,'AFTER_BLACKOUT');
    assert.equal(publicView(d).board.seats.find(seat=>seat.seatId==='seat-1').location,'Jail');retain('after-jail-republish');
    d.deadline();assert.equal(d.state.round,2);checkpoint(d,'ROUND_FINALIZED');assert.equal(publicView(d).board.finalizedRound,1);retain('round-finalized-carried');
    d.until(s=>s.round===2&&s.phase.kind==='NAV_SETTING');checkpoint(d,'ROUND_FINALIZED');assert.equal(publicView(d).board.finalizedRound,2);retain('round-finalized-current');
    d.until(s=>s.round===3);checkpoint(d,'ROUND_FINALIZED');assert.equal(publicView(d).board.finalizedRound,2);retain('next-round-carried');d.replay();
    for(const {label,state,public:before}of snapshots){
      const restored=decodePlanetGameState(encodePlanetGameState(state));assert.deepEqual(restored,state);assert.deepEqual(projectPlanetPublic(restored),before);
      const aborted=abortPlanetGame(restored,{now:state.evaluatedAt+1,nextPhaseId:`audit-abort-${label}`,nextDeadlineToken:`audit-abort-token-${label}`,random:Array(32).fill(.99)});
      assertPlanetGameState(aborted);assert.equal(aborted.phase.kind,'ABORTED');assert.equal(aborted.result.reason,'ABORTED');
      assert.deepEqual(projectPlanetPublic(aborted).board,before.board,`${label}: abort cannot manufacture a newer public board`);
      assert.deepEqual(projectPlanetPublic(aborted).events,before.events,`${label}: abort retains the authorized published occurrences`);
      for(const id of d.ids)assert.equal(projectPlanetPlayer(aborted,id).board.checkpoint,before.board.checkpoint);
      for(const schema of [PlanetPublicViewSchema,PlanetPlayerViewSchema]){
        const packet=schema===PlanetPublicViewSchema?before:projectPlanetPlayer(restored,'seat-1');
        const invalid=copy(packet);invalid.board.finalizedRound=packet.round+1;assert.equal(schema.safeParse(invalid).success,false,`${label}: future publication round`);
        if(['PRE_BLACKOUT','AFTER_BLACKOUT'].includes(packet.board.checkpoint)){
          const stale=copy(packet);stale.board.finalizedRound=packet.round-1;assert.equal(schema.safeParse(stale).success,false,`${label}: current checkpoint requires current round`);
        }
      }
    }
  });

  test(`${count}: native abort before Sync preserves the earlier public board instead of publishing a private reposition or a new publication round`,()=>{
    const d=prepareBlackholeRound(candidate(count)),before=publicView(d);
    assert.equal(before.board.checkpoint,'ROUND_FINALIZED');assert.equal(before.board.finalizedRound,1);assert.equal(d.state.round,2);
    const target=['A1','A2','A3','A4','A5'].find(slot=>!currentWorld(d).seats.some(seat=>seat.slotId===slot));assert.ok(target);
    d.command('seat-1',{type:'MOVE',destination:'Room A',slotId:target});moveAcross(d,'seat-2');
    assert.notEqual(physical(d,'seat-1').slotId,before.board.seats.find(seat=>seat.seatId==='seat-1').slotId);
    assert.deepEqual(publicView(d).board,before.board);assert.notDeepEqual(own(d,'seat-1').board.seats,before.board.seats);
    const aborted=abortPlanetGame(d.state,{now:d.state.evaluatedAt+1,nextPhaseId:'audit-abort-speculation',nextDeadlineToken:'audit-abort-speculation-token',random:Array(32).fill(.99)});
    assertPlanetGameState(aborted);assert.equal(aborted.round,2);assert.deepEqual(projectPlanetPublic(aborted).board,before.board);
    assert.deepEqual(projectPlanetPublic(aborted).events,before.events);assert.equal(projectPlanetPublic(aborted).endReveal,null);
  });

  test(`${count}: native abort with an admitted selected Blackout batch preserves the targeting checkpoint and never resolves the pending hit`,()=>{
    const d=candidate(count);d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-3');d.command('seat-3',{type:'REQUEST_BLACKOUT'});
    d.until(s=>s.phase.kind==='BLACKOUT');d.deadline({now:d.state.phase.startedAt+5_000});select(d,'seat-3','seat-1');
    const before=publicView(d),pending=copy(d.state);assert.equal(before.board.checkpoint,'PRE_BLACKOUT');assert.equal(physical(d,'seat-1').health,'Healthy');assert.equal(physical(d,'seat-3').blackoutSpent,true);
    const restored=decodePlanetGameState(encodePlanetGameState(pending));assert.deepEqual(restored,pending);
    const aborted=abortPlanetGame(restored,{now:pending.evaluatedAt+1,nextPhaseId:'audit-abort-selected',nextDeadlineToken:'audit-abort-selected-token',random:Array(32).fill(.99)});
    assertPlanetGameState(aborted);assert.equal(worldSeat(currentWorld({state:aborted}),'seat-1').health,'Healthy');
    assert.equal(worldSeat(currentWorld({state:aborted}),'seat-3').blackoutSpent,true);assert.deepEqual(projectPlanetPublic(aborted).board,before.board);assert.deepEqual(projectPlanetPublic(aborted).events,before.events);
    assert.equal(projectPlanetPublic(aborted).endReveal,null);
  });

  test(`${count}: native Round-2 election, tie runoff, both result intervals and appointment preserve the carried finalized checkpoint`,()=>{
    const d=candidate(count);d.until(s=>s.round===2&&s.phase.kind==='CAPTAIN_ELECTION');const roundOne=copy(publicView(d).board);
    assert.equal(roundOne.checkpoint,'ROUND_FINALIZED');assert.equal(roundOne.finalizedRound,1);
    d.command('seat-1',{type:'VOTE',targetSeatId:'seat-1'});d.command('seat-2',{type:'VOTE',targetSeatId:'seat-2'});
    d.deadline();assert.equal(d.state.phase.kind,'VOTE_RESULT');assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,5_000);assert.deepEqual(publicView(d).board,roundOne);
    d.deadline();assert.equal(d.state.phase.kind,'CAPTAIN_ELECTION');assert.equal(d.state.ballot.runoff,true);assert.deepEqual(publicView(d).board,roundOne);
    for(const id of d.state.ballot.eligibleVoters)d.command(id,{type:'VOTE',targetSeatId:'seat-1'});
    d.deadline();assert.equal(d.state.phase.kind,'VOTE_RESULT');assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,5_000);checkpoint(d,'ROUND_FINALIZED');
    d.deadline();assert.equal(d.state.phase.kind,'OFFICER_APPOINTMENT');checkpoint(d,'ROUND_FINALIZED');assert.equal(publicView(d).board.finalizedRound,1);
    d.command('seat-1',{type:'APPOINT_OFFICER',targetSeatId:'seat-2'});assert.equal(d.state.phase.kind,'PRE_TURN');checkpoint(d,'ROUND_FINALIZED');assert.equal(publicView(d).board.finalizedRound,1);d.replay();
  });

  test(`${count}: constructed no eligible Officer skips appointment while an Alien Captain still receives the optional Sync, presentation and full Blackout`,()=>{
    const d=candidate(count);d.until(s=>s.round===2&&s.phase.kind==='CAPTAIN_ELECTION');
    layout(d,{patients:['seat-2','seat-3','seat-4','seat-5'],jailed:d.ids.filter(id=>!['seat-2','seat-3','seat-4','seat-5','seat-7'].includes(id)),roomA:['seat-7']});
    d.state.ballot.eligibleVoters=[...d.ids];d.state.ballot.eligibleTargets=['seat-7'];assertPlanetGameState(d.state);
    for(const id of d.ids)d.command(id,{type:'VOTE',targetSeatId:'seat-7'});
    d.deadline();assert.equal(d.state.phase.kind,'VOTE_RESULT');checkpoint(d,'ROUND_FINALIZED');
    d.deadline();assert.equal(d.state.phase.kind,'PRE_TURN');assert.equal(currentWorld(d).captainSeatId,'seat-7');assert.equal(currentWorld(d).officerSeatId,null);checkpoint(d,'ROUND_FINALIZED');
    d.command('seat-7',{type:'ACTIVATE_BLACKHOLE'});d.until(s=>s.phase.kind==='BLACKHOLE_PRESENTATION');
    assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,6_000);assert.equal(currentWorld(d).officerSeatId,null);assert.equal(d.state.ballot,null);
    d.deadline();assert.equal(d.state.phase.kind,'BLACKOUT');assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,15_000);checkpoint(d,'PRE_BLACKOUT');
    d.deadline();assert.equal(d.state.phase.kind,'JAIL_VOTE');assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,60_000);checkpoint(d,'AFTER_BLACKOUT');
    assert.equal(currentWorld(d).officerSeatId,null);assert.equal(d.state.result,null);
  });
}

for(const count of [8,9]){
  test(`${count}: constructed both admitted Disablers strike despite first-strike actor incapacity and remain spent after later Jail`,()=>{
    const d=layout(constructed(count),{roomA:['seat-1','seat-2','seat-3','seat-8']});register(d,'seat-3',{type:'REQUEST_BLACKOUT'});register(d,'seat-8',{type:'REQUEST_BLACKOUT'});
    closeConstructedTurns(d);dark(d);select(d,'seat-3','seat-8');select(d,'seat-8','seat-3');voteOpened(d);
    for(const id of ['seat-3','seat-8']){assert.equal(physical(d,id).health,'Injured');assert.equal(physical(d,id).location,'Hospital');assert.equal(physical(d,id).blackoutSpent,true);}
    assert.equal(physical(d,'seat-3').slotId,'H1');assert.equal(physical(d,'seat-8').slotId,'H2');hospitalInvariant(d);
    for(const id of d.state.ballot.eligibleVoters)d.command(id,{type:'VOTE',targetSeatId:'seat-3'});
    fixedStep(d,'mutual-vote');assert.equal(physical(d,'seat-3').jailed,true);assert.equal(physical(d,'seat-3').location,'Hospital');
    assert.equal(physical(d,'seat-8').health,'Injured');assert.equal(physical(d,'seat-8').blackoutSpent,true);
    fixedStep(d,'mutual-result');assert.equal(physical(d,'seat-3').health,'Injured');assert.equal(physical(d,'seat-8').health,'Injured');hospitalInvariant(d);
  });

  test(`${count}: constructed same-slot strikes produce one second-hit body; active Protection absorbs only the first attempt`,()=>{
    for(const protectedTarget of [false,true]){
      const d=layout(constructed(count),{roomA:['seat-1','seat-2','seat-3','seat-8']});
      if(protectedTarget)Object.assign(physical(d,'seat-1'),{protectionEver:true,protection:{donorSeatId:'seat-5',activeFromRound:d.state.round-1,consumed:false}});
      register(d,'seat-3',{type:'REQUEST_BLACKOUT'});register(d,'seat-8',{type:'REQUEST_BLACKOUT'});closeConstructedTurns(d);dark(d);select(d,'seat-3','seat-1');select(d,'seat-8','seat-1');voteOpened(d);
      assert.equal(physical(d,'seat-1').health,protectedTarget?'Injured':'Eliminated');assert.equal(physical(d,'seat-1').slotId,'H1');assert.equal(physical(d,'seat-1').revealedFaction,null);
      assert.equal(currentWorld(d).seats.filter(seat=>seat.location==='Hospital').length,1);if(protectedTarget)assert.equal(physical(d,'seat-1').protection.consumed,true);
      for(const id of ['seat-3','seat-8'])assert.equal(physical(d,id).blackoutSpent,true);hospitalInvariant(d);
    }
  });

  test(`${count}: constructed two new candidates compete numerically for the last bed while an existing body keeps its place`,()=>{
    const d=layout(constructed(count),{patients:['seat-2','seat-4'],bodies:['seat-7'],roomA:['seat-1','seat-3','seat-5','seat-8']});
    register(d,'seat-3',{type:'REQUEST_BLACKOUT'});register(d,'seat-8',{type:'REQUEST_BLACKOUT'});closeConstructedTurns(d);dark(d);select(d,'seat-3','seat-5');select(d,'seat-8','seat-1');voteOpened(d);
    assert.equal(physical(d,'seat-1').health,'Injured');assert.equal(physical(d,'seat-1').slotId,'H4');assert.equal(physical(d,'seat-5').health,'Eliminated');assert.equal(physical(d,'seat-5').location,null);
    assert.equal(physical(d,'seat-7').slotId,'H3');assert.equal(d.state.ballot.eligibleVoters.includes('seat-5'),false);assert.ok(d.state.ballot.eligibleVoters.includes('seat-1'));hospitalInvariant(d);
  });

  test(`${count}: constructed same-batch second-hit body cannot displace any of four retained Hospital bodies`,()=>{
    const d=layout(constructed(count),{bodies:['seat-4','seat-5','seat-6','seat-7'],roomA:['seat-1','seat-2','seat-3','seat-8']});
    const retained=Object.fromEntries(['seat-4','seat-5','seat-6','seat-7'].map(id=>[id,physical(d,id).slotId]));
    register(d,'seat-3',{type:'REQUEST_BLACKOUT'});register(d,'seat-8',{type:'REQUEST_BLACKOUT'});closeConstructedTurns(d);dark(d);select(d,'seat-3','seat-1');select(d,'seat-8','seat-1');voteOpened(d);
    assert.equal(physical(d,'seat-1').health,'Eliminated');assert.equal(physical(d,'seat-1').location,null);assert.equal(physical(d,'seat-1').medical,null);
    for(const [id,slot]of Object.entries(retained))assert.equal(physical(d,id).slotId,slot);
    const facts=publicView(d).events.filter(event=>event.seatIds.includes('seat-1'));
    assert.equal(facts.filter(event=>event.kind==='HOSPITAL_OVERFLOW_REMOVED').length,1);assert.equal(facts.some(event=>['INJURED','ELIMINATED'].includes(event.kind)),false);hospitalInvariant(d);
  });

  test(`${count}: constructed two blocked subjects publish in numeric subject order with one timestamp and no stored attacker-order cue`,()=>{
    const d=layout(constructed(count),{roomA:['seat-1','seat-2','seat-3','seat-8']});
    for(const id of ['seat-1','seat-2'])Object.assign(physical(d,id),{protectionEver:true,protection:{donorSeatId:'seat-5',activeFromRound:d.state.round-1,consumed:false}});
    register(d,'seat-3',{type:'REQUEST_BLACKOUT'});register(d,'seat-8',{type:'REQUEST_BLACKOUT'});closeConstructedTurns(d);dark(d);select(d,'seat-3','seat-2');select(d,'seat-8','seat-1');voteOpened(d);
    assert.deepEqual(cue(own(d,'seat-1'),'ATTACK_BLOCKED').map(event=>event.seatIds),[['seat-1'],['seat-2']]);
    const events=cue(own(d,'seat-1'),'ATTACK_BLOCKED');assert.ok(events.every(event=>event.actorSeatId===null&&event.publishedAt===d.state.phase.startedAt));
    assert.equal(new Set(events.map(event=>event.publishedAt)).size,1);assert.equal(cue(publicView(d),'ATTACK_BLOCKED').length,0);
    for(const id of d.ids.filter(id=>!['seat-1','seat-2','seat-3','seat-8'].includes(id)))assert.equal(cue(own(d,id),'ATTACK_BLOCKED').length,0);
  });

  test(`${count}: constructed mutual overflow of the last two living Disablers waits for full empty vote and result before No survivors`,()=>{
    const d=layout(constructed(count),{bodies:['seat-4','seat-5','seat-6','seat-7'],roomA:['seat-1','seat-2','seat-3','seat-8']});
    for(const id of d.ids.filter(id=>!['seat-3','seat-8','seat-4','seat-5','seat-6','seat-7'].includes(id)))Object.assign(physical(d,id),{health:'Eliminated',location:null,slotId:null,medical:null,rescueDueAfterRound:null});
    register(d,'seat-3',{type:'REQUEST_BLACKOUT'});register(d,'seat-8',{type:'REQUEST_BLACKOUT'});closeConstructedTurns(d);dark(d);select(d,'seat-3','seat-8');select(d,'seat-8','seat-3');voteOpened(d);
    assert.ok(currentWorld(d).seats.every(seat=>seat.health==='Eliminated'));assert.equal(d.state.result,null);assert.deepEqual(d.state.ballot.eligibleVoters,[]);assert.deepEqual(d.state.ballot.eligibleTargets,[]);
    assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,60_000);const early=copy(publicView(d).events);fixedStep(d,'mutual-empty-vote');
    assert.equal(d.state.phase.kind,'VOTE_RESULT');assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,5_000);assert.equal(d.state.result,null);
    fixedStep(d,'mutual-empty-result');assert.equal(d.state.phase.kind,'FINISHED');assert.equal(d.state.result.reason,'NO_SURVIVORS');
    assert.equal(publicView(d).events.filter(event=>event.kind==='HOSPITAL_OVERFLOW_REMOVED').length,2);
    for(const event of early)assert.deepEqual(publicView(d).events.find(current=>current.id===event.id),event);
    assert.deepEqual(currentWorld(d).actions,[]);hospitalInvariant(d);
  });
}
