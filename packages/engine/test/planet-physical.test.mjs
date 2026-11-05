import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PLANET_GAME_PINS, PlanetEventSchema } from '@mothership/contracts';
import { storePlanetEvent } from '../dist/planet-game/model.js';
import { physicalPlanetCommand as command, resolvePlanetPhysical as resolve, jailPlanetSeat as jail, planetJailOccupancy, canPlanetPhysicalCommand, planetPhysicalOffers, planetSlotIds } from '../dist/planet-game/physical.js';

// All fixtures here are CONSTRUCTED complete-world predecessors. These are real
// physical-handler/resolution calls, not native lifecycle, receipt, Sync, service,
// browser, deadline or balance evidence. Synthetic preregistered queues deliberately
// isolate stages whose ordinary-turn reachability is tested by the lifecycle owner.
const copy=v=>structuredClone(v),ids=n=>Array.from({length:n},(_,i)=>`seat-${i+1}`);
const get=(world,id)=>world.seats.find(s=>s.seatId===id),world=s=>s.worlds.Original;
function fixture(n,round=4){
  const roster=['Insider','Doctor','Blue Disabler','Supplier','Undercover','Hacker','Alien',...(n>=8?['Red Disabler']:[]),...(n===9?['Engineer']:[])];
  const list=ids(n),roles=Object.fromEntries(list.map((id,i)=>[id,roster[i]]));
  const seats=list.map((seatId,i)=>({seatId,health:'Healthy',location:i<5?'Room A':'Room B',slotId:i<5?`A${i+1}`:`B${i-4}`,lastRoom:i<5?'Room A':'Room B',jailed:false,revealedFaction:null,rescueDueAfterRound:null,medical:null,
    ordinaryWeapons:i===4?1:0,roleActionSpent:false,shotSpent:false,protection:null,protectionEver:false,clone:{used:false,active:false,expiresAfterRound:null},blackoutSpent:false,engineerSpent:false}));
  const w={seats,actions:[],injectionsRemaining:2,captainSeatId:null,officerSeatId:null,releaseUsed:false,ejectUsed:false,shipHackSpent:false,shipHackOverride:false,suppressedSeatIds:[],events:[]};
  return {matchId:'planet-physical-fixture',versions:{...PLANET_GAME_PINS,assetManifestVersion:'planet-physical-fixture'},playerCount:n,round,evaluatedAt:1,phase:{id:'physical-phase',kind:'ORDINARY_TURN',startedAt:0,endsAt:60000},deadlineToken:'deadline',roles,code:['seat-1','seat-2','seat-5','seat-7'],worlds:{Original:w},realityOf:Object.fromEntries(list.map(id=>[id,'Original'])),currentWorldId:'Original',blackholeActive:false,blackoutPreviewComplete:false,nextWorldNumber:1,
    global:{promiseEvaluation:{},movementSpent:[],blockedSeatId:null,lastBlockedSeatId:null,blackholeSpent:false,blackholeRound:null,panelAttempts:[],scanResults:[],scanUsedRound:null,scanBlockedThroughRound:null,codeAttempted:false,shipHackUnlocked:false,hackCounts:{},hackSpent:[],promises:[],promiseGiven:[],promiseReceived:[],declinedPromiseIds:[],drawings:[],roundOrders:{[round]:list}},
    turnOrder:list,turnIndex:0,activeSeatId:'seat-1',hack:null,panelOpen:true,ballot:null,lastTally:null,afterVote:null,electionNeeded:false,navigation:{position:'Junction',direction:null,lastMovedRound:1,arrivedAt:null,started:true},result:null,finalized:{round:0,seats:[],events:[]},eventPublications:{},revisions:{public:0,players:Object.fromEntries(list.map(id=>[id,0]))}};
}
function own(state,id){state.activeSeatId=id;state.turnIndex=state.turnOrder.indexOf(id);state.phase.kind='ORDINARY_TURN';return state;}
function accept(state,id,payload){assert.equal(command(state,id,payload,`registered-${world(state).actions.length}-${id}`),true);return state;}
function reject(state,id,payload){const before=copy(state);assert.equal(command(state,id,payload,'denied'),false);assert.deepEqual(state,before);}
function assign(w,id,location,slot,health='Healthy',jailed=false,due=null){Object.assign(get(w,id),{location,slotId:slot,health,jailed,rescueDueAfterRound:due,medical:health==='Injured'?{admittedRound:due-1,rescueDueAfterRound:due,rescueOpportunity:'NEXT_NORMAL_ROUND'}:null});}
function rooms(w,a){const b=w.seats.filter(s=>!a.includes(s.seatId));a.forEach((id,i)=>assign(w,id,'Room A',`A${i+1}`));b.forEach((s,i)=>assign(w,s.seatId,'Room B',`B${i+1}`));}
function patients(state,patientIds,health='Eliminated',due=null){patientIds.forEach((id,i)=>{assign(world(state),id,'Hospital',`H${i+1}`,health,false,due);if(get(world(state),id).medical)get(world(state),id).medical.rescueOpportunity=due===state.round?'CURRENT_NORMAL_ROUND':'NEXT_NORMAL_ROUND';});return state;}
function queue(state,entries){world(state).actions=entries.map(([actorSeatId,payload],i)=>({actorSeatId,commandId:`constructed-${i}`,command:payload,order:state.turnOrder.indexOf(actorSeatId)}));return state;}
function invariant(state,w=world(state)){
  assert.equal(w.seats.length,state.playerCount);const slots=w.seats.flatMap(s=>s.slotId===null?[]:[s.slotId]);assert.equal(new Set(slots).size,slots.length);assert.ok(w.seats.filter(s=>s.location==='Hospital').length<=4);assert.ok(planetJailOccupancy(w)<=5);
  for(const s of w.seats){assert.equal(s.location===null,s.slotId===null);if(s.location!==null)assert.ok(planetSlotIds(s.location).includes(s.slotId));if(s.health==='Injured'){assert.equal(s.location,'Hospital');assert.ok(s.medical);assert.equal(s.medical.rescueDueAfterRound,s.rescueDueAfterRound);assert.equal(s.medical.rescueDueAfterRound,s.medical.admittedRound+1);}else assert.equal(s.medical,null);if(s.location===null)assert.equal(s.health,'Eliminated');}
  for(const o of w.events){PlanetEventSchema.parse(o.event);if(o.event.kind==='ATTACK_BLOCKED'){assert.ok(o.recipients.includes(o.event.seatIds[0]));assert.equal(o.event.actorSeatId,null);}else assert.equal(o.recipients,null);}
}
for(const n of [7,8,9]){
  test(`${n}: constructed shots require R4+, own eligible turn, ammunition and same-room living nonself target; denial is immutable`,()=>{
    const state=own(fixture(n,3),'seat-5');reject(state,'seat-5',{type:'REGISTER_SHOT',targetSeatId:'seat-1'});state.round=4;
    reject(state,'seat-5',{type:'REGISTER_SHOT',targetSeatId:'seat-6'});reject(state,'seat-5',{type:'REGISTER_SHOT',targetSeatId:'seat-5'});
    assign(world(state),'seat-1','Command Room','C1');reject(state,'seat-5',{type:'REGISTER_SHOT',targetSeatId:'seat-1'});assign(world(state),'seat-1','Room A','A1');
    accept(state,'seat-5',{type:'REGISTER_SHOT',targetSeatId:'seat-1'});assert.equal(get(world(state),'seat-5').ordinaryWeapons,0);assert.equal(get(world(state),'seat-5').shotSpent,true);reject(state,'seat-5',{type:'REGISTER_SHOT',targetSeatId:'seat-2'});
    const before=copy(state);assert.equal(canPlanetPhysicalCommand(state,'seat-5',{type:'REGISTER_SHOT',targetSeatId:'seat-2'}),false);planetPhysicalOffers(state,'seat-5');assert.deepEqual(state,before);
  });
  test(`${n}: constructed actor-world registration locks target despite later movement and different target reality membership`,()=>{
    const state=own(fixture(n),'seat-5');state.worlds.Beta=copy(world(state));state.realityOf['seat-1']='Beta';const other=copy(state.worlds.Beta);
    accept(state,'seat-5',{type:'REGISTER_SHOT',targetSeatId:'seat-1'});assign(world(state),'seat-1','Room B','B5');resolve(state,world(state));
    assert.equal(get(world(state),'seat-1').health,'Injured');assert.deepEqual(state.worlds.Beta,other);invariant(state);
  });
  test(`${n}: constructed Protection reserves lifetime at registration, activates next round and blocks only one later strike`,()=>{
    const state=own(fixture(n),'seat-5');accept(state,'seat-5',{type:'PROTECT',targetSeatId:'seat-1'});assert.equal(get(world(state),'seat-1').protectionEver,true);assert.equal(get(world(state),'seat-1').protection,null);
    resolve(state,world(state));assert.equal(get(world(state),'seat-1').protection.activeFromRound,5);state.round=5;get(world(state),'seat-5').roleActionSpent=false;reject(state,'seat-5',{type:'PROTECT',targetSeatId:'seat-1'});
    queue(state,[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}],['seat-4',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}]]);resolve(state,world(state));assert.equal(get(world(state),'seat-1').health,'Injured');assert.equal(get(world(state),'seat-1').protection.consumed,true);assert.equal(world(state).events.filter(o=>o.event.kind==='ATTACK_BLOCKED').length,1);invariant(state);
  });
  test(`${n}: constructed Doctor preserves healthy preregistration and remote Hospital exception; Injured Doctor can only self-treat while free`,()=>{
    const state=own(fixture(n),'seat-2');assign(world(state),'seat-6','Hospital','H1','Injured',false,5);accept(state,'seat-2',{type:'RESCUE',targetSeatId:'seat-6'});assert.equal(world(state).injectionsRemaining,1);
    const self=own(fixture(n),'seat-2');assign(world(self),'seat-2','Hospital','H1','Injured',false,5);assign(world(self),'seat-6','Hospital','H2','Injured',false,5);reject(self,'seat-2',{type:'RESCUE',targetSeatId:'seat-6'});accept(self,'seat-2',{type:'RESCUE',targetSeatId:'seat-2'});
    const jailed=own(fixture(n),'seat-2');assign(world(jailed),'seat-2','Hospital','H1','Injured',true,5);reject(jailed,'seat-2',{type:'RESCUE',targetSeatId:'seat-2'});
    const early=own(fixture(n),'seat-2');accept(early,'seat-2',{type:'RESCUE',targetSeatId:'seat-1'});assert.equal(get(world(early),'seat-1').health,'Healthy');
  });
  test(`${n}: constructed Doctor/panel share exactly two immediately reserved injections; empty pool is no code oracle`,()=>{
    const state=own(fixture(n),'seat-2');patients(state,['seat-6','seat-7'],'Injured',5);accept(state,'seat-2',{type:'RESCUE',targetSeatId:'seat-1'});accept(state,'seat-6',{type:'PANEL_CODE',doctorSeatId:'seat-2'});
    assert.equal(world(state).injectionsRemaining,0);assert.deepEqual(state.global.panelAttempts,['seat-6']);assert.equal(get(world(state),'seat-6').health,'Injured');
    const before=copy(state);reject(state,'seat-7',{type:'PANEL_CODE',doctorSeatId:'seat-2'});reject(state,'seat-7',{type:'PANEL_CODE',doctorSeatId:'seat-1'});assert.deepEqual(state,before);
  });
  test(`${n}: constructed wrong panel consumes only global attempt; correct panel respects cutoff, detention and no Role Action`,()=>{
    const state=fixture(n);patients(state,['seat-1'],'Injured',5);accept(state,'seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-3'});assert.equal(world(state).injectionsRemaining,2);assert.equal(world(state).actions.length,0);assert.equal(get(world(state),'seat-1').roleActionSpent,false);reject(state,'seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-2'});
    const heal=fixture(n);assign(world(heal),'seat-1','Hospital','H1','Injured',true,5);accept(heal,'seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-2'});resolve(heal,world(heal));assert.equal(get(world(heal),'seat-1').health,'Healthy');assert.equal(get(world(heal),'seat-1').jailed,true);assert.equal(get(world(heal),'seat-1').location,'Jail');invariant(heal);
    const closed=fixture(n);patients(closed,['seat-1'],'Injured',5);closed.panelOpen=false;reject(closed,'seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-2'});closed.panelOpen=true;closed.phase.kind='JAIL_VOTE';reject(closed,'seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-2'});
  });
  test(`${n}: constructed no-effect Doctor/panel reservations survive second-hit death without refunds or revival`,()=>{
    const state=own(fixture(n),'seat-2');accept(state,'seat-2',{type:'RESCUE',targetSeatId:'seat-1'});const reservation=copy(world(state).actions[0]);queue(state,[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}],['seat-4',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}]]);world(state).actions.push(reservation);resolve(state,world(state));
    assert.equal(get(world(state),'seat-1').health,'Eliminated');assert.equal(world(state).injectionsRemaining,1);assert.equal(world(state).events.filter(o=>o.event.kind==='RESCUED').length,0);invariant(state);
  });
  test(`${n}: constructed branch inherits reservations and costs while patient attempt remains global even if that world is discarded`,()=>{
    const state=fixture(n);patients(state,['seat-1'],'Injured',5);world(state).injectionsRemaining=1;state.worlds.Beta=copy(world(state));accept(state,'seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-2'});
    assert.equal(world(state).injectionsRemaining,0);assert.equal(state.worlds.Beta.injectionsRemaining,1);assert.equal(state.global.panelAttempts.includes('seat-1'),true);
    state.worlds.Gamma=copy(world(state));assert.equal(state.worlds.Gamma.injectionsRemaining,0);assert.equal(state.worlds.Gamma.actions.length,1);state.realityOf['seat-1']='Beta';reject(state,'seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-2'});
    assert.equal(planetPhysicalOffers(state,'seat-1').some(o=>o.type==='PANEL_CODE'),false);
  });
  test(`${n}: constructed Jail counts retained bodies and living Hospital reservations; excess admission preserves ballot and full state`,()=>{
    const state=fixture(n),w=world(state);assign(w,'seat-2','Jail','J1','Eliminated',true);assign(w,'seat-3','Jail','J2','Healthy',true);assign(w,'seat-4','Jail','J3','Healthy',true);assign(w,'seat-5','Hospital','H1','Injured',true,5);assign(w,'seat-6','Hospital','H2','Injured',true,5);
    state.ballot={kind:'JAIL_VOTE',eligibleVoters:['seat-1'],eligibleTargets:['seat-1'],votes:{'seat-1':'seat-1'},runoff:false,electionId:'actual-ballot'};assert.equal(planetJailOccupancy(w),5);const before=copy(state);assert.equal(jail(state,w,'seat-1'),false);assert.deepEqual(state,before);invariant(state);
  });
  for(const type of ['CAPTAIN_RELEASE','CAPTAIN_EJECT'])test(`${n}: constructed ${type} scopes physical Jail, preserves Hospital reservations, queues and resources`,()=>{
    const state=own(fixture(n),'seat-4'),w=world(state);assign(w,'seat-4','Command Room','C1');w.captainSeatId='seat-4';w.officerSeatId='seat-3';assign(w,'seat-1','Jail','J1','Healthy',true);assign(w,'seat-2','Jail','J2','Eliminated',true);assign(w,'seat-5','Hospital','H1','Injured',true,5);
    queue(state,[['seat-1',{type:'REGISTER_SHOT',targetSeatId:'seat-6'}]]);const retained=copy(w.actions),resources=get(w,'seat-1').ordinaryWeapons,patient=copy(get(w,'seat-5'));accept(state,'seat-4',{type});assert.deepEqual(get(w,'seat-5'),patient);assert.deepEqual(w.actions,retained);assert.equal(get(w,'seat-1').ordinaryWeapons,resources);
    assert.equal(w.releaseUsed,type==='CAPTAIN_RELEASE');assert.equal(w.ejectUsed,type==='CAPTAIN_EJECT');if(type==='CAPTAIN_EJECT'){assert.equal(get(w,'seat-1').location,null);assert.equal(get(w,'seat-2').location,null);assert.equal(get(w,'seat-1').revealedFaction,null);}else{assert.equal(get(w,'seat-1').jailed,false);assert.equal(get(w,'seat-2').location,'Jail');}
    const event=w.events.find(o=>o.event.kind===type);assert.equal(event.event.actorSeatId,'seat-4');resolve(state,w);assert.equal(get(w,'seat-6').health,'Injured');if(type==='CAPTAIN_EJECT')assert.equal(get(w,'seat-1').revealedFaction,'Blue');invariant(state);
  });
  test(`${n}: constructed Captain RELEASE uses numeric ordinary fallback without spending movement or role`,()=>{
    const state=own(fixture(n),'seat-4'),w=world(state);assign(w,'seat-4','Command Room','C1');w.captainSeatId='seat-4';assign(w,'seat-1','Jail','J1','Healthy',true);const others=w.seats.filter(s=>!['seat-1','seat-4'].includes(s.seatId));others.slice(0,5).forEach((s,i)=>assign(w,s.seatId,'Room A',`A${i+1}`));others.slice(5).forEach((s,i)=>assign(w,s.seatId,'Room B',`B${i+1}`));
    accept(state,'seat-4',{type:'CAPTAIN_RELEASE'});assert.equal(get(w,'seat-1').location,'Room B');assert.equal(get(w,'seat-1').lastRoom,'Room B');assert.equal(get(w,'seat-4').roleActionSpent,false);assert.deepEqual(state.global.movementSpent,[]);invariant(state);
  });
  test(`${n}: constructed Blackout freezes two same-slot effects before attacks and retains Main before Shot`,()=>{
    const state=fixture(n),w=world(state);rooms(w,n>=8?['seat-1','seat-3','seat-5','seat-8']:['seat-1','seat-3','seat-5']);
    own(state,'seat-3');accept(state,'seat-3',{type:'REQUEST_BLACKOUT'});const a=w.actions[0];a.boundRoom='Room A';a.selectedSlotId=get(w,'seat-1').slotId;
    if(n>=8){own(state,'seat-8');accept(state,'seat-8',{type:'REQUEST_BLACKOUT'});w.actions.at(-1).boundRoom='Room A';w.actions.at(-1).selectedSlotId=a.selectedSlotId;}else{get(w,'seat-3').ordinaryWeapons=1;accept(state,'seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-1'});w.actions.reverse();}
    resolve(state,w);assert.equal(get(w,'seat-1').health,'Eliminated');assert.equal(get(w,'seat-1').location,'Hospital');assert.equal(get(w,'seat-3').blackoutSpent,true);if(n>=8)assert.equal(get(w,'seat-8').blackoutSpent,true);invariant(state);
  });
  test(`${n}: constructed admitted Blackout empty/self/Command misses consume use, cancellation preserves it`,()=>{
    for(const mode of ['timeout','empty','self','command','cancel']){
      const state=own(fixture(n),'seat-3'),w=world(state);accept(state,'seat-3',{type:'REQUEST_BLACKOUT'});const action=w.actions[0];action.selectedSlotId=mode==='self'?get(w,'seat-3').slotId:mode==='empty'?'A5':null;
      if(mode==='empty')assign(w,'seat-5','Room B','B5');if(mode==='command'){assign(w,'seat-3','Command Room','C1');w.captainSeatId='seat-3';action.boundRoom='Command Room';action.selectedSlotId='C1';}
      if(mode==='cancel')jail(state,w,'seat-3');resolve(state,w);assert.equal(get(w,'seat-3').blackoutSpent,mode!=='cancel');assert.ok(w.seats.every(s=>s.health==='Healthy'));invariant(state);
    }
  });
  test(`${n}: constructed Clone blocks repeated strikes before Protection, lasts through R+1 beyond R5 and does not extend`,()=>{
    const state=own(fixture(n,8),'seat-7'),w=world(state);accept(state,'seat-7',{type:'ACTIVATE_CLONE'});get(w,'seat-7').protection={donorSeatId:'seat-5',activeFromRound:8,consumed:false};get(w,'seat-7').protectionEver=true;
    queue(state,[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-7'}],['seat-4',{type:'REGISTER_SHOT',targetSeatId:'seat-7'}]]);resolve(state,w);assert.equal(get(w,'seat-7').clone.expiresAfterRound,9);assert.equal(get(w,'seat-7').clone.active,true);assert.equal(get(w,'seat-7').protection.consumed,false);assert.equal(w.events.filter(o=>o.event.kind==='ATTACK_BLOCKED').length,2);
    state.round=9;get(w,'seat-7').roleActionSpent=false;reject(state,'seat-7',{type:'ACTIVATE_CLONE'});resolve(state,w);assert.equal(get(w,'seat-7').clone.active,false);assert.equal(get(w,'seat-7').clone.used,true);invariant(state);
  });
  test(`${n}: constructed global Blackhole Role Action consumption prevents same-round Clone even in fresh branch`,()=>{
    const state=own(fixture(n,9),'seat-7');state.global.blackholeRound=9;state.global.blackholeSpent=true;reject(state,'seat-7',{type:'ACTIVATE_CLONE'});state.worlds.Beta=copy(world(state));state.realityOf['seat-7']='Beta';reject(state,'seat-7',{type:'ACTIVATE_CLONE'});
  });
  test(`${n}: constructed healed departure precedes numeric patients and existing bodies keep their holes`,()=>{
    const state=fixture(n),w=world(state);patients(state,['seat-4','seat-5','seat-6']);assign(w,'seat-7','Hospital','H4','Injured',false,5);queue(state,[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}],['seat-2',{type:'RESCUE',targetSeatId:'seat-7'}]]);resolve(state,w);
    assert.equal(get(w,'seat-1').slotId,'H4');assert.equal(get(w,'seat-7').health,'Healthy');assert.notEqual(get(w,'seat-7').location,'Hospital');assert.deepEqual(['seat-4','seat-5','seat-6'].map(id=>get(w,id).slotId),['H1','H2','H3']);invariant(state);
  });
  test(`${n}: constructed lower new second-hit body wins last bed before a higher living candidate; overflow preserves identity and resources`,()=>{
    const state=fixture(n),w=world(state);patients(state,['seat-5','seat-6','seat-7']);get(w,'seat-2').ordinaryWeapons=2;queue(state,[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-2'}],['seat-4',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}],['seat-5',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}]]);const code=copy(state.code);resolve(state,w);
    assert.equal(get(w,'seat-1').health,'Eliminated');assert.equal(get(w,'seat-1').slotId,'H4');assert.equal(get(w,'seat-2').health,'Eliminated');assert.equal(get(w,'seat-2').location,null);assert.equal(get(w,'seat-2').ordinaryWeapons,2);assert.deepEqual(state.code,code);assert.equal(w.ejectUsed,false);invariant(state);
  });
  test(`${n}: constructed same-batch Rescue saves a fresh candidate at full ward; R3 Supply precedes later overflow without refund`,()=>{
    const saved=fixture(n),w=world(saved);patients(saved,['seat-4','seat-5','seat-6','seat-7']);queue(saved,[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}],['seat-2',{type:'RESCUE',targetSeatId:'seat-1'}]]);resolve(saved,w);assert.equal(get(w,'seat-1').health,'Healthy');assert.notEqual(get(w,'seat-1').location,null);invariant(saved);
    const state=fixture(n,3);patients(state,['seat-5','seat-6','seat-7']);queue(state,[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-2'}],['seat-4',{type:'SUPPLY',targetSeatIds:['seat-2','seat-3']}],['seat-5',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}]]);resolve(state,world(state));assert.equal(get(world(state),'seat-2').location,null);assert.equal(get(world(state),'seat-2').ordinaryWeapons,1);invariant(state);
  });
  test(`${n}: constructed attacks precede Rescue and Rescue precedes uncapped due death; Clone never prevents aging`,()=>{
    const state=fixture(n,9);patients(state,['seat-1','seat-7'],'Injured',9);get(world(state),'seat-7').clone={used:true,active:true,expiresAfterRound:10};queue(state,[['seat-2',{type:'RESCUE',targetSeatId:'seat-1'}]]);resolve(state,world(state));assert.equal(get(world(state),'seat-1').health,'Healthy');assert.equal(get(world(state),'seat-7').health,'Eliminated');assert.equal(get(world(state),'seat-7').clone.active,false);invariant(state);
  });
  test(`${n}: constructed frozen neutral defense recipients include pending origin patient and retained body, without hidden cause or post-admission recomputation`,()=>{
    const state=fixture(n),w=world(state);get(w,'seat-5').health='Eliminated';get(w,'seat-2').protection={donorSeatId:'seat-5',activeFromRound:4,consumed:false};get(w,'seat-2').protectionEver=true;
    queue(state,[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}],['seat-4',{type:'REGISTER_SHOT',targetSeatId:'seat-2'}]]);resolve(state,w);const event=w.events.find(o=>o.event.kind==='ATTACK_BLOCKED');assert.equal(event.event.location,'Room A');assert.ok(event.recipients.includes('seat-1'));assert.ok(event.recipients.includes('seat-5'));assert.equal(get(w,'seat-1').location,'Hospital');assert.equal(event.event.slotId,'A2');assert.equal(event.event.clinicalAnchor,null);PlanetEventSchema.parse(event.event);assert.equal(event.event.actorSeatId,null);invariant(state);
  });
  test(`${n}: constructed offices clear on Hospital/Jail without undoing accepted global movement block`,()=>{
    const state=fixture(n),w=world(state);w.captainSeatId='seat-1';w.officerSeatId='seat-2';state.global.blockedSeatId='seat-6';assert.equal(jail(state,w,'seat-1'),true);assert.equal(w.captainSeatId,null);assert.equal(w.officerSeatId,null);assert.equal(state.global.blockedSeatId,'seat-6');invariant(state);
  });
  test(`${n}: constructed fresh R9 injury carries full next-round medical opportunity and independent real placement`,()=>{
    const state=fixture(n,9),w=world(state);queue(state,[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}]]);resolve(state,w);
    assert.deepEqual(get(w,'seat-1').medical,{admittedRound:9,rescueDueAfterRound:10,rescueOpportunity:'NEXT_NORMAL_ROUND'});
    const injury=w.events.find(o=>o.event.kind==='INJURED').event;assert.equal(injury.slotId,'H1');assert.equal(injury.clinicalAnchor.anchorId,'HV1');assert.equal(injury.clinicalAnchor.slotCount,n);assert.equal(injury.actorSeatId,null);assert.equal(injury.expiresAt-injury.publishedAt,30000);
    assert.ok(w.events.some(o=>o.event.kind==='PLACEMENT_CHANGED'&&o.event.location==='Hospital'&&o.event.slotId==='H1'));invariant(state);
  });
  test(`${n}: constructed transient injury and Rescue at four occupied beds keeps HV5 words without a fabricated physical bed`,()=>{
    const state=fixture(n),w=world(state);patients(state,['seat-4','seat-5','seat-6','seat-7']);queue(state,[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}],['seat-2',{type:'RESCUE',targetSeatId:'seat-1'}]]);resolve(state,w);
    const clinical=w.events.filter(o=>['INJURED','RESCUED','ELIMINATED'].includes(o.event.kind)&&o.event.seatIds.includes('seat-1')).map(o=>o.event);
    assert.deepEqual(clinical.map(e=>e.kind),['INJURED','RESCUED']);assert.ok(clinical.every(e=>e.clinicalAnchor.anchorId==='HV5'&&e.location==='Room A'&&e.slotId==='A1'));assert.equal(get(w,'seat-1').medical,null);assert.equal(w.events.some(o=>o.event.kind==='HOSPITAL_OVERFLOW_REMOVED'),false);invariant(state);
  });
  test(`${n}: constructed denied incoming candidate emits overflow plus actual offboard placement and no clinical anchor or medical Elimination`,()=>{
    const state=fixture(n),w=world(state);patients(state,['seat-4','seat-5','seat-6','seat-7']);queue(state,[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}]]);resolve(state,w);
    const subject=w.events.filter(o=>o.event.seatIds.includes('seat-1')).map(o=>o.event);assert.deepEqual(subject.map(e=>e.kind),['HOSPITAL_OVERFLOW_REMOVED','PLACEMENT_CHANGED']);assert.ok(subject.every(e=>e.clinicalAnchor===null&&e.location===null&&e.slotId===null));assert.equal(get(w,'seat-1').medical,null);assert.equal(get(w,'seat-1').rescueDueAfterRound,null);invariant(state);
  });
  test(`${n}: constructed lower admitted new body keeps INJURED then medical Elimination while denied higher patient has only overflow`,()=>{
    const state=fixture(n),w=world(state);patients(state,['seat-5','seat-6','seat-7']);queue(state,[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-2'}],['seat-4',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}],['seat-5',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}]]);resolve(state,w);
    const body=w.events.filter(o=>o.event.seatIds.includes('seat-1')&&['INJURED','ELIMINATED'].includes(o.event.kind)).map(o=>o.event);assert.deepEqual(body.map(e=>e.kind),['INJURED','ELIMINATED']);assert.ok(body.every(e=>e.clinicalAnchor.anchorId==='HV4'&&e.slotId==='H4'));
    assert.equal(w.events.some(o=>o.event.seatIds.includes('seat-2')&&['INJURED','RESCUED','ELIMINATED'].includes(o.event.kind)),false);assert.equal(get(w,'seat-1').medical,null);invariant(state);
  });
  test(`${n}: constructed healed H4 departure reserves HV4 while the admitted entrant uses HV5 and actual H4`,()=>{
    const state=fixture(n),w=world(state);patients(state,['seat-4','seat-5','seat-6']);assign(w,'seat-7','Hospital','H4','Injured',false,5);queue(state,[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}],['seat-2',{type:'RESCUE',targetSeatId:'seat-7'}]]);resolve(state,w);
    const injury=w.events.find(o=>o.event.kind==='INJURED').event,rescue=w.events.find(o=>o.event.kind==='RESCUED').event;assert.equal(injury.slotId,'H4');assert.equal(injury.clinicalAnchor.anchorId,'HV5');assert.equal(rescue.clinicalAnchor.anchorId,'HV4');assert.equal(rescue.slotId,get(w,'seat-7').slotId);assert.equal(rescue.location,get(w,'seat-7').location);assert.equal(get(w,'seat-7').medical,null);invariant(state);
  });
  test(`${n}: constructed Captain EJECT produces only its public command and real removal facts, never medical Elimination or a clinical anchor`,()=>{
    const state=own(fixture(n),'seat-4'),w=world(state);assign(w,'seat-4','Command Room','C1');w.captainSeatId='seat-4';assign(w,'seat-1','Jail','J1','Healthy',true);accept(state,'seat-4',{type:'CAPTAIN_EJECT'});resolve(state,w);
    const subject=w.events.filter(o=>o.event.seatIds.includes('seat-1')).map(o=>o.event);assert.deepEqual(subject.map(e=>e.kind),['CAPTAIN_EJECT','PLACEMENT_CHANGED']);assert.ok(subject.every(e=>e.clinicalAnchor===null));assert.equal(get(w,'seat-1').medical,null);invariant(state);
  });
  test(`${n}: constructed overflow suppression preserves prefix receipts and unique unpublished IDs around a surviving room-defense fact`,()=>{
    const state=fixture(n),w=world(state);patients(state,['seat-4','seat-5','seat-6','seat-7']);storePlanetEvent(state,w,'MOVEMENT_COMPLETED',[]);const prefix=copy(w.events);
    get(w,'seat-2').protection={donorSeatId:'seat-5',activeFromRound:4,consumed:false};get(w,'seat-2').protectionEver=true;
    queue(state,[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}],['seat-4',{type:'REGISTER_SHOT',targetSeatId:'seat-2'}]]);resolve(state,w);
    assert.deepEqual(w.events.slice(0,prefix.length),prefix);assert.equal(new Set(w.events.map(o=>o.event.id)).size,w.events.length);
    assert.equal(w.events.filter(o=>o.event.kind==='ATTACK_BLOCKED').length,1);assert.equal(w.events.filter(o=>o.event.kind==='HOSPITAL_OVERFLOW_REMOVED').length,1);
    assert.ok(w.events.find(o=>o.event.kind==='ATTACK_BLOCKED').recipients.includes('seat-1'));assert.equal(w.events.some(o=>['INJURED','RESCUED','ELIMINATED'].includes(o.event.kind)&&o.event.seatIds.includes('seat-1')),false);invariant(state);
  });
  test(`${n}: constructed combined healed Jail returns allocate numerically after freeing Hospital and preserve retained Jail body slots`,()=>{
    const state=fixture(n),w=world(state);assign(w,'seat-1','Jail','J2','Healthy',true);assign(w,'seat-5','Jail','J3','Eliminated',true);assign(w,'seat-7','Hospital','H1','Injured',true,5);
    // Saved Rescue1 was registered before the Jail transfer; the second reserved
    // treatment is the detained Hospital patient's permitted panel self-Rescue.
    w.injectionsRemaining=0;get(w,'seat-2').roleActionSpent=true;state.global.panelAttempts=['seat-7'];
    queue(state,[['seat-3',{type:'REGISTER_SHOT',targetSeatId:'seat-1'}],['seat-2',{type:'RESCUE',targetSeatId:'seat-1'}],['seat-7',{type:'PANEL_CODE',doctorSeatId:'seat-2'}]]);resolve(state,w);
    assert.equal(get(w,'seat-1').slotId,'J1');assert.equal(get(w,'seat-7').slotId,'J2');assert.equal(get(w,'seat-5').slotId,'J3');assert.equal(get(w,'seat-5').health,'Eliminated');assert.equal(planetJailOccupancy(w),3);assert.equal(w.injectionsRemaining,0);assert.ok(['seat-1','seat-7'].every(id=>get(w,id).health==='Healthy'&&get(w,id).jailed&&get(w,id).medical===null));invariant(state);
  });
  if(n===9)test('9: constructed Engineer captures fixed opposite-room identities, spends its world lifetime use and emits no target notification',()=>{
    const state=own(fixture(n),'seat-9'),w=world(state);accept(state,'seat-9',{type:'ENGINEER_SUPPRESS'});assert.deepEqual(w.suppressedSeatIds,['seat-1','seat-2','seat-3','seat-4','seat-5']);assert.equal(get(w,'seat-9').engineerSpent,true);assert.equal(w.events.length,0);
    assign(w,'seat-1','Room B','B5');assign(w,'seat-6','Room A','A1');assert.ok(w.suppressedSeatIds.includes('seat-1'));assert.equal(w.suppressedSeatIds.includes('seat-6'),false);state.round++;get(w,'seat-9').roleActionSpent=false;reject(state,'seat-9',{type:'ENGINEER_SUPPRESS'});
  });else test(`${n}: constructed roster has no Engineer and cannot invoke its action`,()=>{const state=own(fixture(n),'seat-1');reject(state,'seat-1',{type:'ENGINEER_SUPPRESS'});});
}
