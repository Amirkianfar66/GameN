import assert from 'node:assert/strict';
import { FullPlayerViewSchema,FullPublicViewSchema,FullReceiptSchema } from '@mothership/contracts';
import { HOSPITAL_FOUR_FULL_GAME_VERSION_PINS as PINS,CLONE_FULL_GAME_VERSION_PINS,BLACKOUT_FULL_GAME_VERSION_PINS,
  CAPTAIN_OUTCOMES_FULL_GAME_VERSION_PINS,BOARD_MEDICAL_FULL_GAME_VERSION_PINS,PUBLIC_HACK_FULL_GAME_VERSION_PINS,
  DECLARED_HACK_FULL_GAME_VERSION_PINS,VOTE_RESULT_FULL_GAME_VERSION_PINS,RESOLUTION_FULL_GAME_VERSION_PINS,
  CAPACITY_FULL_GAME_VERSION_PINS,PASS_FULL_GAME_VERSION_PINS,LEGACY_FULL_GAME_VERSION_PINS,
  createFullGame,executeFullGame,advanceFullGame,abortFullGame,projectFullGame } from '../dist/index.js';
import { assertHospitalOverflowState } from '../dist/full-game/hospital-four.js';
import { beginMedicalResolution,recordMedicalDamage,healMedicalSeat,placeMedicalSeats } from '../dist/full-game/medical.js';
import { assertBoardSlots } from '../dist/full-game/slots.js';

// Exact 1.11 engine acceptance. Native cases use only legal SETUP, commands and
// deadlines. SYNTHETIC full wards, injury stages and queues are explicitly labeled;
// they are not evidence of native admission, service concurrency, Tasks or Balance.
const START=1_800_000_000_000;
const ROLES=['Insider','Cracker','Blue Disabler','Supplier','Undercover','Hacker','Alien'];
const OLD=[LEGACY_FULL_GAME_VERSION_PINS,PASS_FULL_GAME_VERSION_PINS,CAPACITY_FULL_GAME_VERSION_PINS,
  RESOLUTION_FULL_GAME_VERSION_PINS,VOTE_RESULT_FULL_GAME_VERSION_PINS,DECLARED_HACK_FULL_GAME_VERSION_PINS,
  PUBLIC_HACK_FULL_GAME_VERSION_PINS,BOARD_MEDICAL_FULL_GAME_VERSION_PINS,CAPTAIN_OUTCOMES_FULL_GAME_VERSION_PINS,
  BLACKOUT_FULL_GAME_VERSION_PINS,CLONE_FULL_GAME_VERSION_PINS];
const copy=value=>JSON.parse(JSON.stringify(value));
const seat=(state,id)=>state.seats.find(s=>s.seatId===id);
const med=(state,id)=>state.outcomes.filter(o=>o.fact.type==='MEDICAL_OUTCOME'&&o.fact.seatId===id);
const overflows=state=>state.outcomes.filter(o=>o.fact.type==='HOSPITAL_OVERFLOW_REMOVED');
function views(state){
  const out=projectFullGame(state);FullPublicViewSchema.parse(out.public);
  for(const view of Object.values(out.players)){FullPlayerViewSchema.parse(view);assert.deepEqual(view.seats,out.public.seats);assert.ok(view.seats.every(s=>!Object.hasOwn(s,'hospitalOverflow')));}
  assert.equal(Object.hasOwn(out.public,'hospitalOverflow'),false);
  if(state.versions.engineVersion===PINS.engineVersion){
    assertBoardSlots(state);assertHospitalOverflowState(state);assert.ok(state.seats.filter(s=>s.location==='Hospital').length<=4);
    for(const s of state.seats.filter(s=>s.location==='Hospital'))assert.match(s.slotId,/^H[1-4]$/);
    assert.ok(state.seats.every(s=>Object.hasOwn(s,'hospitalOverflow')));
    if(state.phase.kind==='BLACKOUT')assert.equal(out.public.blackout.layoutRevision,'board-v2-four-0.1.0');
  }
  return out;
}
function driver(n,pins=PINS){
  let seq=0;
  const roles=[...ROLES,...(n>=8?['Red Disabler']:[]),...(n===9?['Officer']:[])],ids=roles.map((_,i)=>`seat-${i+1}`);
  const asset=pins.engineVersion===PINS.engineVersion?'design-0.5.0':'historical-medical-fixture';
  const args={matchId:'hospital-four-fixture',now:START,phaseId:'initial-phase',deadlineToken:'initial-token',assetManifestVersion:asset,versions:{...pins,assetManifestVersion:asset},
    setup:{playerCount:n,roleOrder:roles,codeExtraSeatIds:['seat-1','seat-2','seat-3'],initialRooms:Object.fromEntries(ids.map((id,i)=>[id,i<5?'Room A':'Room B'])),roundOrders:Array.from({length:5},()=>[...ids])}};
  const initial=createFullGame(args),history=[];views(initial);
  const context=now=>({now,nextPhaseId:`phase-${++seq}`,nextDeadlineToken:`token-${seq}`});
  const apply=(state,actor,command,now=state.phase.startedAt+1)=>{
    const request={protocolVersion:2,matchId:state.matchId,phaseId:state.phase.id,commandId:`command-${++seq}`,command},ctx=context(now),before=copy(state);
    const result=executeFullGame(state,actor,request,ctx);FullReceiptSchema.parse(result.receipt);assert.deepEqual(state,before);
    assert.deepEqual(executeFullGame(copy(state),actor,copy(request),copy(ctx)),result);views(result.state);
    history.push({kind:'COMMAND',actor,request,context:ctx,receipt:result.receipt});return result;
  };
  const tick=state=>{
    assert.notEqual(state.phase.endsAt,null);const ctx={...context(state.phase.endsAt),phaseId:state.phase.id,deadlineToken:state.deadlineToken},before=copy(state);
    const result=advanceFullGame(state,ctx);assert.equal(result.advanced,true);assert.deepEqual(state,before);assert.deepEqual(advanceFullGame(copy(state),copy(ctx)),result);
    assert.equal(advanceFullGame(result.state,ctx).advanced,false);views(result.state);history.push({kind:'DEADLINE',context:ctx});return result.state;
  };
  const until=(state,predicate)=>{let current=state;for(let bound=0;!predicate(current);bound++){assert.ok(bound<280,'Bounded legal checkpoint');current=tick(current);}return current;};
  const replay=expected=>{let state=createFullGame(copy(args));for(const e of history){if(e.kind==='COMMAND'){const r=executeFullGame(state,e.actor,copy(e.request),copy(e.context));assert.deepEqual(r.receipt,e.receipt);state=r.state;}else state=advanceFullGame(state,copy(e.context)).state;}assert.deepEqual(state,expected);assert.deepEqual(views(state),views(expected));};
  return {initial,args,apply,tick,until,replay,context,n};
}
const accept=result=>{assert.equal(result.receipt.status,'accepted',JSON.stringify(result.receipt));return result.state;};
const turn=(d,state,round,actor)=>d.until(state,s=>s.round===round&&s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId===actor);
function window(d,state,target=null){
  let current=d.until(state,s=>s.round===state.round&&s.phase.kind==='JAIL_VOTE');
  if(target!==null)for(const voter of current.eligibleVoters)current=accept(d.apply(current,voter,{type:'VOTE',targetSeatId:target}));
  current=d.tick(current);assert.equal(current.phase.kind,'VOTE_RESULT');current=d.tick(current);assert.equal(current.phase.kind,'BLACKOUT');return current;
}
const endRound=(d,state,target=null)=>d.tick(window(d,state,target));
function select(d,state,actor,target){const own=views(state).players[actor].self.blackoutTargeting,victim=state.blackout.occupants.find(s=>s.seatId===target);assert.ok(own);assert.equal(victim.location,own.room);return accept(d.apply(state,actor,{type:'SELECT_BLACKOUT_SLOT',snapshotId:own.snapshotId,room:own.room,slotId:victim.slotId},own.darkStartsAt));}
function supplyPrefix(d){
  let state=endRound(d,d.initial,'seat-7');state=endRound(d,state,d.n>=8?'seat-8':null);
  state=accept(d.apply(turn(d,state,3,'seat-4'),'seat-4',{type:'SUPPLY',targetSeatIds:['seat-1','seat-3']}));
  state=endRound(d,state,d.n===9?'seat-9':null);assert.equal(seat(state,'seat-1').ordinaryWeapons,1);assert.equal(seat(state,'seat-3').ordinaryWeapons,1);return state;
}
function nativeWard(d,rescue=false){
  let state=supplyPrefix(d);state=accept(d.apply(turn(d,state,4,'seat-1'),'seat-1',{type:'REGISTER_SHOT',targetSeatId:'seat-2'}));
  if(rescue)state=accept(d.apply(turn(d,state,4,'seat-2'),'seat-2',{type:'RESCUE',targetSeatId:'seat-1'}));
  state=accept(d.apply(turn(d,state,4,'seat-3'),'seat-3',{type:'REQUEST_BLACKOUT'}));state=accept(d.apply(state,'seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-5'}));
  state=accept(d.apply(turn(d,state,4,'seat-5'),'seat-5',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}));
  return d.tick(select(d,window(d,state),'seat-3','seat-4'));
}
function ward(state,ids,health='Eliminated',admittedRound=state.round){
  const out=copy(state),occupied=new Set(out.seats.filter(s=>s.location==='Hospital'&&!ids.includes(s.seatId)).map(s=>s.slotId));for(const id of ids){
    const s=seat(out,id);s.health=health;s.location='Hospital';s.slotId=['H1','H2','H3','H4'].find(slot=>!occupied.has(slot));occupied.add(s.slotId);s.captain=false;s.jailed=false;s.medicalEpisodeCount=1;
    s.medicalEpisode=health==='Injured'?{number:1,admittedRound,deathDueAfterRound:admittedRound===5?null:admittedRound+1}:null;
    if(s.cloneStatus?.active)s.cloneStatus.active=false;
  }views(out);return out;
}
function queued(state,commands){const out=copy(state);out.queued=commands.map(([actorSeatId,command],i)=>({actorSeatId,commandId:`synthetic-${i}`,command}));return out;}
function closeSynthetic(d,state){return d.tick(window(d,state));}
function sameInitialResources(state,id){const s=seat(state,id);return {weapons:s.ordinaryWeapons,main:s.mainActionUsedRound,moved:s.movedInRound,hack:s.hackUsed,disabler:s.disablerSpent,special:s.specialShotAvailable};}


export { PINS,OLD,START,copy,seat,med,overflows,views,driver,accept,turn,window,endRound,select,supplyPrefix,nativeWard,ward,queued,closeSynthetic,sameInitialResources };
