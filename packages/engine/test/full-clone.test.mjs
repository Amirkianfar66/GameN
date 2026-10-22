import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FullPublicViewSchema, FullPlayerViewSchema, FullReceiptSchema } from '@mothership/contracts';
import {
  CLONE_FULL_GAME_VERSION_PINS as PINS, BLACKOUT_FULL_GAME_VERSION_PINS,
  CAPTAIN_OUTCOMES_FULL_GAME_VERSION_PINS, BOARD_MEDICAL_FULL_GAME_VERSION_PINS,
  PUBLIC_HACK_FULL_GAME_VERSION_PINS, DECLARED_HACK_FULL_GAME_VERSION_PINS,
  VOTE_RESULT_FULL_GAME_VERSION_PINS, RESOLUTION_FULL_GAME_VERSION_PINS,
  CAPACITY_FULL_GAME_VERSION_PINS, PASS_FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS,
  createFullGame, executeFullGame, advanceFullGame, abortFullGame, projectFullGame,
} from '../dist/index.js';
import { initializeCloneState, assertCloneState, cloneActivationAllowed, activateClone, cloneBlocksAttack,
  clearEliminatedCloneEffects, finishCloneCheckpoint, stopCloneEffects } from '../dist/full-game/clone.js';
import { assignMissingBoardSlots } from '../dist/full-game/slots.js';

// Clone 1.10 pure-engine acceptance. Native histories use legal SETUP and actual
// commands/deadlines. SYNTHETIC medical, queued-stage and corruption predecessors
// are labeled; they do not claim native reachability or service receipt recovery.
// Functions, UI disclosure/art and independent Balance acceptance remain separate.
const START=1_800_000_000_000, ASSETS='clone-engine-fixture-v1';
const ROLES=['Insider','Cracker','Blue Disabler','Supplier','Undercover','Hacker','Alien'];
const OLD=[LEGACY_FULL_GAME_VERSION_PINS,PASS_FULL_GAME_VERSION_PINS,CAPACITY_FULL_GAME_VERSION_PINS,
  RESOLUTION_FULL_GAME_VERSION_PINS,VOTE_RESULT_FULL_GAME_VERSION_PINS,DECLARED_HACK_FULL_GAME_VERSION_PINS,
  PUBLIC_HACK_FULL_GAME_VERSION_PINS,BOARD_MEDICAL_FULL_GAME_VERSION_PINS,CAPTAIN_OUTCOMES_FULL_GAME_VERSION_PINS,
  BLACKOUT_FULL_GAME_VERSION_PINS];
const copy=value=>JSON.parse(JSON.stringify(value));
const seat=(state,id='seat-7')=>state.seats.find(s=>s.seatId===id);
const unused={used:false,activatedRound:null,expiresAfterRound:null,active:false};
function views(state) {
  const result=projectFullGame(state); FullPublicViewSchema.parse(result.public);
  assert.equal(Object.hasOwn(result.public,'cloneStatus'),false);
  for(const player of Object.values(result.players)) {
    FullPlayerViewSchema.parse(player); assert.deepEqual(player.seats,result.public.seats);
    assert.ok(player.seats.every(s=>!Object.hasOwn(s,'cloneStatus')));
    if(state.versions.engineVersion===PINS.engineVersion) assert.deepEqual(player.self.cloneStatus,seat(state,player.self.seatId).cloneStatus);
    else assert.equal(Object.hasOwn(player.self,'cloneStatus'),false);
  }
  return result;
}
function driver(n,pins=PINS) {
  let serial=0;
  const roleOrder=[...ROLES,...(n>=8?['Red Disabler']:[]),...(n===9?['Officer']:[])];
  const ids=roleOrder.map((_,i)=>`seat-${i+1}`);
  const setup={playerCount:n,roleOrder,codeExtraSeatIds:['seat-1','seat-2','seat-3'],
    initialRooms:Object.fromEntries(ids.map(id=>[id,['seat-1','seat-2','seat-3','seat-5','seat-7'].includes(id)?'Room A':'Room B'])),
    roundOrders:Array.from({length:5},()=>[...ids])};
  const args={matchId:'clone-fixture',setup,now:START,phaseId:'phase-initial',deadlineToken:'token-initial',assetManifestVersion:ASSETS,versions:{...pins,assetManifestVersion:ASSETS}};
  const initial=createFullGame(args),history=[];views(initial);
  const context=now=>({now,nextPhaseId:`phase-${++serial}`,nextDeadlineToken:`token-${serial}`});
  const apply=(state,actor,command,now=state.phase.startedAt+1)=>{
    const request={protocolVersion:2,matchId:state.matchId,phaseId:state.phase.id,commandId:`command-${++serial}`,command};
    const ctx=context(now),before=copy(state),result=executeFullGame(state,actor,request,ctx);
    FullReceiptSchema.parse(result.receipt);assert.deepEqual(state,before);
    assert.deepEqual(executeFullGame(copy(state),actor,copy(request),copy(ctx)),result,'Recorded predecessor command replay is deterministic');
    views(result.state);history.push({kind:'COMMAND',actor,request,context:ctx,receipt:result.receipt});return result;
  };
  const tick=state=>{
    assert.notEqual(state.phase.endsAt,null);
    const ctx={...context(state.phase.endsAt),phaseId:state.phase.id,deadlineToken:state.deadlineToken},before=copy(state),result=advanceFullGame(state,ctx);
    assert.equal(result.advanced,true);assert.deepEqual(state,before);assert.deepEqual(advanceFullGame(copy(state),copy(ctx)),result);
    assert.equal(advanceFullGame(result.state,ctx).advanced,false,'Stale deadline cannot repeat a resolution');
    views(result.state);history.push({kind:'DEADLINE',context:ctx});return result.state;
  };
  const until=(state,predicate)=>{
    let current=state;
    for(let bound=0;!predicate(current);bound++){assert.ok(bound<260,'Canonical checkpoint must be reachable');current=tick(current);}
    return current;
  };
  const replay=expected=>{
    let current=createFullGame(copy(args));
    for(const item of history) {
      if(item.kind==='COMMAND'){const result=executeFullGame(current,item.actor,copy(item.request),copy(item.context));assert.deepEqual(result.receipt,item.receipt);current=result.state;}
      else current=advanceFullGame(current,copy(item.context)).state;
    }
    assert.deepEqual(current,expected);assert.deepEqual(views(current),views(expected));
  };
  return {initial,apply,tick,until,replay,context};
}
const accepted=result=>{assert.equal(result.receipt.status,'accepted',JSON.stringify(result.receipt));return result.state;};
function denied(result,state,code='NOT_ALLOWED'){assert.equal(result.receipt.status,'rejected');assert.equal(result.receipt.code,code);assert.strictEqual(result.state,state);}
const turn=(d,state,round,actor='seat-7')=>d.until(state,s=>s.round===round&&s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId===actor);
function vote(d,state,target=null) {
  let current=state;
  if(target!==null)for(const voter of state.eligibleVoters.slice(0,Math.ceil(state.eligibleVoters.length/2)))current=accepted(d.apply(current,voter,{type:'VOTE',targetSeatId:target}));
  return d.tick(current);
}
function window(d,state,jailTarget=null) {
  const jail=d.until(state,s=>s.round===state.round&&s.phase.kind==='JAIL_VOTE');
  const result=vote(d,jail,jailTarget);assert.equal(result.phase.kind,'VOTE_RESULT');
  const opened=d.tick(result);assert.equal(opened.phase.kind,'BLACKOUT');return opened;
}
const endRound=(d,state,target=null)=>d.tick(window(d,state,target));
function elect(d,state,target='seat-4') {
  const election=d.until(state,s=>s.phase.kind==='CAPTAIN_ELECTION');
  const result=vote(d,election,target);return d.tick(result);
}
const activate=(d,state,round)=>accepted(d.apply(turn(d,state,round),'seat-7',{type:'ACTIVATE_CLONE'}));
function select(d,state,actor,target='seat-7') {
  const own=views(state).players[actor].self.blackoutTargeting;
  assert.ok(own);const victim=state.blackout.occupants.find(s=>s.seatId===target);assert.equal(victim.location,own.room);
  return accepted(d.apply(state,actor,{type:'SELECT_BLACKOUT_SLOT',snapshotId:own.snapshotId,room:own.room,slotId:victim.slotId},state.blackout.darkStartsAt));
}
function showdownPredecessor(d) {
  // Three living Blue prisoners give Blue power <= Red in all 7/8/9 rosters.
  // Jail remains independently adjudicated; no health/resource/victory mutation.
  let state=d.initial;
  for(const target of ['seat-1','seat-2','seat-3'])state=endRound(d,state,target);
  return state;
}
function supplyAlien(d) {
  let state=turn(d,d.initial,3,'seat-1');
  state=accepted(d.apply(state,'seat-1',{type:'MOVE',destination:'Room B'}));
  state=accepted(d.apply(state,'seat-4',{type:'MOVE',destination:'Room A'}));
  state=accepted(d.apply(turn(d,state,3,'seat-4'),'seat-4',{type:'SUPPLY',targetSeatIds:['seat-5','seat-7']}));
  state=endRound(d,state);assert.equal(seat(state).ordinaryWeapons,1);return state;
}
function attacksWithProtection(n) {
  const d=driver(n);let state=d.initial;
  state=accepted(d.apply(state,'seat-1',{type:'MOVE',destination:'Room B'}));
  if(n>=8)state=accepted(d.apply(state,'seat-8',{type:'MOVE',destination:'Room A'}));
  if(n===9){state=accepted(d.apply(state,'seat-2',{type:'MOVE',destination:'Room B'}));state=accepted(d.apply(state,'seat-9',{type:'MOVE',destination:'Room A'}));}
  state=accepted(d.apply(turn(d,state,2,'seat-5'),'seat-5',{type:'PROTECT',targetSeatId:'seat-7'}));
  state=turn(d,state,3,'seat-4');
  if(n>=8)state=accepted(d.apply(state,n===9?'seat-9':'seat-2',{type:'MOVE',destination:'Room B'}));
  state=accepted(d.apply(state,'seat-4',{type:'MOVE',destination:'Room A'}));
  state=accepted(d.apply(state,'seat-4',{type:'SUPPLY',targetSeatIds:['seat-5','seat-7']}));
  state=activate(d,state,3);state=endRound(d,state);
  state=turn(d,state,4,'seat-3');state=accepted(d.apply(state,'seat-4',{type:'MOVE',destination:'Room B'}));
  if(n===9)state=accepted(d.apply(state,'seat-9',{type:'MOVE',destination:'Room A'}));
  state=accepted(d.apply(state,'seat-3',{type:'REQUEST_BLACKOUT'}));
  state=accepted(d.apply(turn(d,state,4,'seat-5'),'seat-5',{type:'REGISTER_SHOT',targetSeatId:'seat-7'}));
  if(n>=8)state=accepted(d.apply(turn(d,state,4,'seat-8'),'seat-8',{type:'REQUEST_BLACKOUT'}));
  if(n===9)state=accepted(d.apply(turn(d,state,4,'seat-9'),'seat-9',{type:'REGISTER_SHOT',targetSeatId:'seat-7'}));
  state=window(d,state);for(const actor of ['seat-3',...(n>=8?['seat-8']:[])])state=select(d,state,actor);
  return {d,state,expectedBlocks:n===7?2:n===8?3:4};
}
function syntheticInjured(state,admittedRound=state.round) {
  const next=copy(state),alien=seat(next);alien.health='Injured';alien.captain=false;alien.location='Hospital';delete alien.slotId;
  alien.medicalEpisodeCount=1;alien.medicalEpisode={number:1,admittedRound,deathDueAfterRound:admittedRound===5?null:admittedRound+1};
  assignMissingBoardSlots(next);views(next);return next;
}

for(const n of [7,8,9]) {
  test(`${n}: native Clone initializes only Alien's private state and activation leaves public/other audience bytes unchanged`,()=>{
    const d=driver(n);let state=turn(d,d.initial,1);assert.deepEqual(seat(state).cloneStatus,unused);
    assert.ok(state.seats.filter(s=>s.role!=='Alien').every(s=>s.cloneStatus===null));
    const before=views(state),rooms=state.seats.map(s=>[s.location,s.slotId]),resources=seat(state);
    state=accepted(d.apply(state,'seat-7',{type:'ACTIVATE_CLONE'}));const after=views(state);
    assert.deepEqual(after.public,before.public);for(const id of Object.keys(before.players).filter(id=>id!=='seat-7'))assert.deepEqual(after.players[id],before.players[id]);
    assert.deepEqual(state.seats.map(s=>[s.location,s.slotId]),rooms);assert.equal(state.seats.length,n);
    assert.deepEqual(seat(state).cloneStatus,{used:true,activatedRound:1,expiresAfterRound:2,active:true});
    assert.equal(seat(state).ordinaryWeapons,resources.ordinaryWeapons);assert.equal(seat(state).hackUsed,resources.hackUsed);assert.equal(seat(state).movedInRound,resources.movedInRound);
    assert.equal(seat(state).mainActionUsedRound,1);assert.ok(after.players['seat-7'].legalTargets.ACTIVATE_CLONE===undefined);d.replay(state);
  });
  test(`${n}: native own-turn activation preserves independent MOVE, Shot and Hack and rejects second lifetime use`,()=>{
    const d=driver(n);let state=turn(d,supplyAlien(d),4);state=accepted(d.apply(state,'seat-7',{type:'ACTIVATE_CLONE'}));
    const status=copy(seat(state).cloneStatus);state=accepted(d.apply(state,'seat-7',{type:'REGISTER_SHOT',targetSeatId:'seat-3'}));
    state=accepted(d.apply(state,'seat-7',{type:'REQUEST_HACK',targetSeatId:'seat-2'}));
    state=accepted(d.apply(state,'seat-7',{type:'MOVE',destination:'Room B'}));assert.deepEqual(seat(state).cloneStatus,status);
    denied(d.apply(state,'seat-7',{type:'ACTIVATE_CLONE'}),state);assert.equal(seat(state).mainActionUsedRound,4);d.replay(state);
  });
  test(`${n}: native wrong actor/turn/prelude, jailed and late activation have no effect`,()=>{
    const d=driver(n);let state=d.initial;denied(d.apply(state,'seat-7',{type:'ACTIVATE_CLONE'}),state);denied(d.apply(state,'seat-1',{type:'ACTIVATE_CLONE'}),state);
    state=turn(d,state,1);denied(d.apply(state,'seat-7',{type:'ACTIVATE_CLONE'},state.phase.endsAt),state,'PHASE_CLOSED');
    state=accepted(d.apply(state,'seat-7',{type:'REQUEST_HACK',targetSeatId:'seat-2'}));state=d.tick(state);assert.equal(state.phase.kind,'HACK_DECLARE');
    denied(d.apply(state,'seat-7',{type:'ACTIVATE_CLONE'}),state);state=endRound(d,state,'seat-7');state=turn(d,state,2);
    assert.equal(seat(state).jailed,true);denied(d.apply(state,'seat-7',{type:'ACTIVATE_CLONE'}),state);assert.deepEqual(seat(state).cloneStatus,unused);d.replay(state);
  });
  for(const r of [1,2,3,4,5])test(`${n}: native R${r} activation lasts through original R+1 capped5 resolution and never restarts`,()=>{
    const d=driver(n);let state=activate(d,r>=4?showdownPredecessor(d):d.initial,r);const expected={used:true,activatedRound:r,expiresAfterRound:Math.min(r+1,5),active:true};
    assert.deepEqual(seat(state).cloneStatus,expected);const recovered=copy(state);initializeCloneState(recovered);assert.deepEqual(recovered,state);
    const dark=window(d,state);assert.equal(cloneBlocksAttack(dark,seat(dark),false),true);state=d.tick(dark);
    if(r<5){assert.equal(seat(state).cloneStatus.active,true);assert.equal(state.round,r+1);state=endRound(d,state);}
    assert.equal(seat(state).cloneStatus.active,false);assert.equal(seat(state).cloneStatus.activatedRound,r);assert.equal(seat(state).cloneStatus.expiresAfterRound,Math.min(r+1,5));
    if(r>=4)assert.equal(state.phase.kind,'SHOWDOWN');else assert.equal(state.round,r+2);d.replay(state);
  });
  test(`${n}: native multiple Blackout/Shot hits use Clone before Protection; post-expiry Protection remains independent`,()=>{
    const {d,state:opened,expectedBlocks}=attacksWithProtection(n);let state=opened;const count=state.outcomes.length;
    assert.equal(seat(state).cloneStatus.active,true);state=d.tick(state);assert.equal(seat(state).health,'Healthy');assert.equal(seat(state).protection.consumed,false);assert.equal(seat(state).cloneStatus.active,false);
    const blocked=state.outcomes.slice(count).filter(o=>o.fact.type==='ATTACK_BLOCKED');assert.equal(blocked.length,expectedBlocks);
    assert.ok(blocked.every(o=>Object.keys(o.fact).sort().join(',')==='location,phaseId,round,seatId,slotId,type'));
    assert.equal(seat(state).cloneStatus.expiresAfterRound,4);
    state=accepted(d.apply(turn(d,state,5,'seat-5'),'seat-5',{type:'REGISTER_SHOT',targetSeatId:'seat-7'}));state=endRound(d,state);
    assert.equal(seat(state).health,'Healthy');assert.equal(seat(state).protection.consumed,true);assert.equal(seat(state).cloneStatus.expiresAfterRound,4);d.replay(state);
  });
  test(`${n}: native Jail detention and Captain RELEASE retain original Clone expiry without restoration or extension`,()=>{
    const d=driver(n);let state=activate(d,d.initial,1);state=endRound(d,state,'seat-7');assert.equal(seat(state).location,'Jail');assert.equal(seat(state).cloneStatus.active,true);
    state=elect(d,state);state=turn(d,state,2,'seat-4');state=accepted(d.apply(state,'seat-4',{type:'CAPTAIN_RELEASE'}));
    assert.equal(seat(state).jailed,false);assert.equal(seat(state).health,'Healthy');assert.deepEqual(seat(state).cloneStatus,{used:true,activatedRound:1,expiresAfterRound:2,active:true});
    state=turn(d,state,2);denied(d.apply(state,'seat-7',{type:'ACTIVATE_CLONE'}),state);state=endRound(d,state);assert.equal(seat(state).cloneStatus.active,false);d.replay(state);
  });
  test(`${n}: native Captain EJECT bypasses Clone and immediately clears only active effect, retaining original use`,()=>{
    const d=driver(n);let state=activate(d,d.initial,1);state=endRound(d,state,'seat-7');state=elect(d,state);state=turn(d,state,2,'seat-4');
    state=accepted(d.apply(state,'seat-4',{type:'CAPTAIN_EJECT'}));assert.equal(seat(state).health,'Eliminated');assert.equal(seat(state).location,null);
    assert.deepEqual(seat(state).cloneStatus,{used:true,activatedRound:1,expiresAfterRound:2,active:false});assert.equal(cloneBlocksAttack(state,seat(state),false),false);
    assert.ok(state.pendingCaptainReveal.seatIds.includes('seat-7'));assert.equal(views(state).public.seats.find(s=>s.seatId==='seat-7').revealedFaction,null);d.replay(state);
  });
  test(`${n}: SYNTHETIC injured active Clone neither heals nor cancels and actual due Hospital death bypasses it`,()=>{
    const d=driver(n);let state=activate(d,d.initial,1);state=endRound(d,state);state=syntheticInjured(state,1);
    assert.equal(cloneBlocksAttack(state,seat(state),false),true);assert.equal(seat(state).health,'Injured');
    state=endRound(d,state);assert.equal(seat(state).health,'Eliminated');assert.equal(seat(state).medicalEpisode,null);assert.equal(seat(state).cloneStatus.active,false);
    assert.equal(seat(state).cloneStatus.expiresAfterRound,2);
  });
  test(`${n}: SYNTHETIC medical predecessor actual Rescue preserves original Clone expiry, resources and occupant identity`,()=>{
    const d=driver(n);let state=activate(d,d.initial,1);state=endRound(d,state);state=syntheticInjured(state,2);state=turn(d,state,2,'seat-2');
    state=accepted(d.apply(state,'seat-2',{type:'RESCUE',targetSeatId:'seat-7'}));state=endRound(d,state);assert.equal(seat(state).health,'Healthy');
    assert.equal(seat(state).cloneStatus.active,false);assert.equal(seat(state).cloneStatus.expiresAfterRound,2);assert.equal(state.seats.length,n);
  });
  test(`${n}: native R5 Clone expires before showdown; valid Protection blocks one special shot and second injures`,()=>{
    const d=driver(n);let state=turn(d,showdownPredecessor(d),4,'seat-5');state=accepted(d.apply(state,'seat-5',{type:'PROTECT',targetSeatId:'seat-7'}));
    state=activate(d,state,5);state=endRound(d,state);assert.equal(state.phase.kind,'SHOWDOWN');assert.equal(seat(state).cloneStatus.active,false);
    state=accepted(d.apply(state,'seat-3',{type:'SHOWDOWN_SHOT',targetSeatId:'seat-7'}));state=accepted(d.apply(state,'seat-5',{type:'SHOWDOWN_SHOT',targetSeatId:'seat-7'}));
    state=d.tick(state);assert.equal(seat(state).protection.consumed,true);assert.equal(seat(state).health,'Injured');assert.equal(seat(state).cloneStatus.active,false);assert.equal(state.phase.kind,'FINISHED');d.replay(state);
  });
  test(`${n}: native R5 correct Code terminal checkpoint includes Clone expiry and produces no showdown`,()=>{
    const d=driver(n);let state=turn(d,d.initial,5,'seat-6');state=accepted(d.apply(state,'seat-6',{type:'SUBMIT_CODE',seatIds:state.code}));
    state=activate(d,state,5);state=endRound(d,state);assert.equal(state.phase.kind,'FINISHED');assert.equal(seat(state).cloneStatus.active,false);
    assert.equal(seat(state).cloneStatus.activatedRound,5);assert.equal(seat(state).cloneStatus.expiresAfterRound,5);d.replay(state);
  });
  test(`${n}: native abort stops Clone immediately and preserves its use, expiry and health after JSON recovery`,()=>{
    const d=driver(n),state=activate(d,d.initial,1),ctx=d.context(state.phase.startedAt+2),before=copy(state);
    const aborted=abortFullGame(state,ctx);assert.deepEqual(state,before);assert.equal(aborted.phase.kind,'ABORTED');assert.equal(seat(aborted).cloneStatus.active,false);
    assert.equal(seat(aborted).health,'Healthy');assert.equal(seat(aborted).cloneStatus.expiresAfterRound,2);assert.deepEqual(abortFullGame(copy(state),copy(ctx)),aborted);views(aborted);
  });
  test(`${n}: SYNTHETIC early terminal survivor stage clears Clone before original expiry without changing health`,()=>{
    const d=driver(n);let state=activate(d,d.initial,1);state=copy(state);for(const s of state.seats.filter(s=>s.faction==='Red'))s.health='Eliminated';
    views(state);state=endRound(d,state);assert.equal(state.phase.kind,'FINISHED');assert.equal(seat(state).health,'Healthy');assert.equal(seat(state).cloneStatus.active,false);assert.equal(seat(state).cloneStatus.expiresAfterRound,2);
  });
  test(`${n}: SYNTHETIC helper isolation rejects status/actor/clock corruption and leaves blocks pure`,()=>{
    const d=driver(n),state=activate(d,d.initial,1),before=copy(state);
    assert.equal(cloneBlocksAttack(state,seat(state),false),true);assert.equal(cloneBlocksAttack(state,seat(state),false),true);assert.equal(cloneBlocksAttack(state,seat(state),true),false);
    assert.equal(cloneBlocksAttack(state,seat(state,'seat-1'),false),false);assert.equal(cloneBlocksAttack(state,copy(seat(state)),false),false);assert.deepEqual(state,before);
    assert.equal(cloneActivationAllowed(state,copy(seat(state))),false);assert.throws(()=>activateClone(state,seat(state)),/not allowed/);
    const mutations=[s=>delete seat(s).cloneStatus,s=>seat(s,'seat-1').cloneStatus=copy(unused),s=>seat(s).cloneStatus={...seat(s).cloneStatus,extra:true},
      s=>seat(s).cloneStatus.used=false,s=>seat(s).cloneStatus.activatedRound=2,s=>seat(s).cloneStatus.expiresAfterRound=3,
      s=>seat(s).cloneStatus.active=false,s=>seat(s).mainActionUsedRound=null,s=>s.round=0,s=>s.queued.push({commandId:'forged',actorSeatId:'seat-7',command:{type:'ACTIVATE_CLONE'}})];
    for(const mutate of mutations){const broken=copy(state);mutate(broken);assert.throws(()=>assertCloneState(broken));assert.throws(()=>projectFullGame(broken));}
    const dead=copy(state);seat(dead).health='Eliminated';assert.throws(()=>assertCloneState(dead));clearEliminatedCloneEffects(dead);assert.equal(seat(dead).cloneStatus.active,false);assertCloneState(dead);
    const cleanup=copy(state);cleanup.round=2;finishCloneCheckpoint(cleanup);assert.equal(seat(cleanup).cloneStatus.active,false);assert.throws(()=>assertCloneState(cleanup));
    stopCloneEffects(cleanup);cleanup.phase={...cleanup.phase,kind:'FINISHED',endsAt:null};assertCloneState(cleanup);
  });
  test(`${n}: native injured Alien cannot activate after an actual Blackout hit; no Main/lifetime spend`,()=>{
    const d=driver(n);let state=turn(d,d.initial,1,'seat-3');state=accepted(d.apply(state,'seat-3',{type:'REQUEST_BLACKOUT'}));
    state=select(d,window(d,state),'seat-3');state=d.tick(state);assert.equal(seat(state).health,'Injured');
    state=turn(d,state,2);denied(d.apply(state,'seat-7',{type:'ACTIVATE_CLONE'}),state);assert.deepEqual(seat(state).cloneStatus,unused);
    assert.equal(seat(state).mainActionUsedRound,null);d.replay(state);
  });
  test(`${n}: native activation at final ordinary millisecond still expires at original complete R+1 checkpoint`,()=>{
    const d=driver(n);let state=turn(d,d.initial,1);state=accepted(d.apply(state,'seat-7',{type:'ACTIVATE_CLONE'},state.phase.endsAt-1));
    state=endRound(d,state);assert.equal(seat(state).cloneStatus.active,true);state=endRound(d,state);assert.equal(seat(state).cloneStatus.active,false);
    assert.deepEqual(seat(state).cloneStatus,{used:true,activatedRound:1,expiresAfterRound:2,active:false});d.replay(state);
  });
  test(`${n}: SYNTHETIC occupied Main Action denies unused Clone without consuming other resources`,()=>{
    const d=driver(n),state=copy(turn(d,d.initial,1));seat(state).mainActionUsedRound=1;const before=copy(state);
    assert.equal(cloneActivationAllowed(state,seat(state)),false);denied(d.apply(state,'seat-7',{type:'ACTIVATE_CLONE'}),state);
    assert.deepEqual(state,before);assert.deepEqual(seat(state).cloneStatus,unused);
  });
  for(const pins of OLD)test(`${n}: exact historical ${pins.engineVersion} omits/rejects Clone and preserves original action history`,()=>{
    const d=driver(n,pins);let state=turn(d,d.initial,1);assert.ok(state.seats.every(s=>!Object.hasOwn(s,'cloneStatus')));
    denied(d.apply(state,'seat-7',{type:'ACTIVATE_CLONE'}),state);const forged=copy(state);seat(forged).cloneStatus=null;assert.throws(()=>assertCloneState(forged));assert.throws(()=>projectFullGame(forged));
    state=accepted(d.apply(state,'seat-7',{type:'REQUEST_HACK',targetSeatId:'seat-2'}));state=d.tick(state);assert.ok(['HACK','HACK_DECLARE'].includes(state.phase.kind));
    assert.ok(state.seats.every(s=>!Object.hasOwn(s,'cloneStatus')));d.replay(state);
  });
}
