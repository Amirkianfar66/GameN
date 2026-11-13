import type { ClinicalPresentationAnchor, PlanetCommand, PlanetOffer, PlanetSeatView, PlanetSlotId, SeatId } from '@mothership/contracts';
import { registerPlanetPanelRequest, resolvePlanetPanelReservation } from './feedback.js';
import { hungerCandidates } from './food-meals.js';
import { alive, canRoleAction, copyPlanet, freeHealthy, ordinaryStage, ownTurn, planetFaction, planetSeat, planetSeatView, planetWorld, seatIds, storePlanetEvent, planetHasPrivateFeedback, planetHasPhoneOffers, planetHasPreVoteBlackout, planetHasFoodTask } from './model.js';
import type { PlanetGameState, PlanetPhysicalSeat, PlanetRegisteredAction, PlanetWorld, PlanetBlackoutAttempt, PlanetBlackoutBatch } from './model.js';

type PlanetLocation = NonNullable<PlanetSeatView['location']>;
const numeric = (id:SeatId):number => Number(id.slice(5));
const clinicalKinds=new Set(['INJURED','RESCUED','ELIMINATED']);
type Placement=Pick<PlanetPhysicalSeat,'location'|'slotId'>;
const placements=(world:PlanetWorld):Map<SeatId,Placement>=>new Map(world.seats.map(s=>[s.seatId,{location:s.location,slotId:s.slotId}]));
function recordPlacementChanges(state:PlanetGameState,world:PlanetWorld,before:Map<SeatId,Placement>):void {
  for(const seat of [...world.seats].sort((a,b)=>numeric(a.seatId)-numeric(b.seatId))){
    const old=before.get(seat.seatId);
    if(old&&(old.location!==seat.location||old.slotId!==seat.slotId)){
      storePlanetEvent(state,world,'PLACEMENT_CHANGED',[seat.seatId],seat.location);
      world.events[world.events.length-1]!.event.slotId=seat.slotId;
    }
  }
}
/** Reserve actual starting Hospital places, including bodies; clinical anchors never allocate beds. */
function sealClinicalAnchors(state:PlanetGameState,world:PlanetWorld,offset:number,before:Map<SeatId,Placement>):void {
  const anchors=new Map<SeatId,string>(),used=new Set<string>();
  for(const [id,place]of before)if(place.location==='Hospital'&&place.slotId!==null){const anchor=`HV${place.slotId.slice(1)}`;anchors.set(id,anchor);used.add(anchor);}
  const records=world.events.slice(offset).filter(r=>clinicalKinds.has(r.event.kind));
  const subjects=[...new Set(records.flatMap(r=>r.event.seatIds))].sort((a,b)=>numeric(a)-numeric(b));
  for(const id of subjects)if(!anchors.has(id)){
    const anchor=Array.from({length:state.playerCount},(_,i)=>`HV${i+1}`).find(value=>!used.has(value));
    if(!anchor)throw Error('Clinical presentation namespace exhausted');anchors.set(id,anchor);used.add(anchor);
  }
  for(const record of records){
    const id=record.event.seatIds[0];if(record.event.seatIds.length!==1||id===undefined)throw Error('Clinical subject must be exact');
    const subject=planetSeat(world,id),anchorId=anchors.get(id)!;
    record.event.location=subject.location;record.event.slotId=subject.slotId;
    record.event.clinicalAnchor={kind:'CLINICAL_VIGNETTE',batchId:`${state.phase.id.slice(0,100)}-clinical`,anchorId,slotCount:state.playerCount} as ClinicalPresentationAnchor;
  }
}
/**
 * Publication only. The caller owns the fixed common return boundary and durable once-only guard,
 * and has already restored current physical placements under the approved return rules. In
 * particular, this helper chooses no Captain-loss return placement and changes no seat/resource.
 */
export function restorePlanetFoodCaptainLoss(state:PlanetGameState,world:PlanetWorld,originalSeats:PlanetSeatView[]):void {
  if(!planetHasFoodTask(state.versions))throw Error('Food Captain return requires Food ruleset');
  for(const original of originalSeats)if(original.captain&&original.location==='Command Room'){
    const target=planetSeat(world,original.seatId);
    if(target.health==='Eliminated'){
      target.location=null;target.slotId=null;returnOrdinary(world,target);
    }
  }
}
export function publishPlanetFoodReturnDeaths(state:PlanetGameState,world:PlanetWorld,originalSeats:PlanetSeatView[]):void {
  if(!planetHasFoodTask(state.versions))throw Error('Food return publication requires Food ruleset');
  const original=new Map(originalSeats.map(seat=>[seat.seatId,seat]));
  if(original.size!==originalSeats.length||original.size!==world.seats.length||world.seats.some(seat=>!original.has(seat.seatId)))throw Error('Food return requires the complete original roster');
  const before=new Map<SeatId,Placement>(originalSeats.map(seat=>[seat.seatId,{location:seat.location,slotId:seat.slotId}]));
  const offset=world.events.length;
  for(const seat of [...world.seats].sort((a,b)=>numeric(a.seatId)-numeric(b.seatId))){
    if(original.get(seat.seatId)!.health!=='Eliminated'&&seat.health==='Eliminated')storePlanetEvent(state,world,'ELIMINATED',[seat.seatId]);
  }
  sealClinicalAnchors(state,world,offset,before);
  recordPlacementChanges(state,world,before);
}
export function planetSlotIds(location:PlanetLocation):PlanetSlotId[] {
  const prefix=({'Room A':'A','Room B':'B','Command Room':'C',Hospital:'H',Jail:'J'} as const)[location];
  return Array.from({length:location==='Hospital'?4:location==='Command Room'?1:5},(_,i)=>`${prefix}${i+1}` as PlanetSlotId);
}
export const planetJailOccupancy=(world:PlanetWorld):number=>world.seats.filter(s=>s.location==='Jail'||(s.location==='Hospital'&&s.jailed&&alive(s))).length;
const freeSlot=(world:PlanetWorld,location:PlanetLocation):PlanetSlotId|undefined=>planetSlotIds(location).find(id=>!world.seats.some(s=>s.slotId===id));
function movePhysical(world:PlanetWorld,seat:PlanetPhysicalSeat,location:PlanetLocation):void {
  if(seat.location===location && seat.slotId!==null)return;
  const slot=freeSlot(world,location);if(!slot)throw Error('No canonical physical place');seat.location=location;seat.slotId=slot;
}
function returnOrdinary(world:PlanetWorld,seat:PlanetPhysicalSeat):void {
  let destination=seat.lastRoom;
  if(!freeSlot(world,destination)){destination=destination==='Room A'?'Room B':'Room A';if(!freeSlot(world,destination))throw Error('No ordinary return place');}
  movePhysical(world,seat,destination);seat.lastRoom=destination;
}
/** Offices are physical-world state. Never change global election state from a speculative world. */
export function clearPlanetOffices(_state:PlanetGameState,world:PlanetWorld):void {
  const eligible=(id:SeatId|null)=>id!==null && world.seats.some(s=>s.seatId===id&&freeHealthy(s));
  if(world.captainSeatId!==null&&!eligible(world.captainSeatId)){world.captainSeatId=null;world.officerSeatId=null;}
  if(world.officerSeatId!==null&&!eligible(world.officerSeatId))world.officerSeatId=null;
  for(const seat of world.seats)if(seat.health==='Eliminated')seat.clone.active=false;
}
/** Ordinary registration range is evaluated only inside the actor's complete world. */
export function planetLocalTarget(state:PlanetGameState,_world:PlanetWorld,actor:PlanetPhysicalSeat,target:PlanetPhysicalSeat,selfAllowed=false,remoteRescue=false):boolean {
  return alive(target)&&target.location!==null&&target.location!=='Command Room'&&(selfAllowed||actor.seatId!==target.seatId)
    && (actor.location===target.location || (remoteRescue&&state.roles[actor.seatId]==='Doctor'&&actor.location!==null&&['Room A','Room B'].includes(actor.location)&&target.location==='Hospital'));
}
export function planetBlackoutRequest(world:PlanetWorld,actorId:SeatId):PlanetRegisteredAction|undefined {
  const actor=world.seats.find(s=>s.seatId===actorId);
  return actor&&freeHealthy(actor)?world.actions.find(a=>a.actorSeatId===actorId&&a.command.type==='REQUEST_BLACKOUT'):undefined;
}
function register(state:PlanetGameState,world:PlanetWorld,actorId:SeatId,command:PlanetCommand,commandId:string):PlanetRegisteredAction {
  const action={actorSeatId:actorId,commandId,command:copyPlanet(command),order:state.turnOrder.indexOf(actorId)};
  world.actions.push(action);return action;
}
function captainAvailable(state:PlanetGameState,world:PlanetWorld,actor:PlanetPhysicalSeat,kind:'CAPTAIN_RELEASE'|'CAPTAIN_EJECT'):boolean {
  return ownTurn(state,actor.seatId)&&freeHealthy(actor)&&world.captainSeatId===actor.seatId&&actor.location==='Command Room'
    && !(kind==='CAPTAIN_RELEASE'?world.releaseUsed:world.ejectUsed)
    && world.seats.some(s=>s.location==='Jail'&&s.jailed&&alive(s));
}

function panelEligibleWithoutInventory(state:PlanetGameState,actorId:SeatId):boolean {
  if(!state.roles[actorId]||state.result||!state.panelOpen||!ordinaryStage(state)||state.global.panelAttempts.includes(actorId))return false;
  const actor=planetWorld(state,actorId).seats.find(s=>s.seatId===actorId);
  return actor!==undefined&&alive(actor)&&actor.location==='Hospital';
}
/** P21/R12: an eligible unused patient learns exhaustion, never submitted-number correctness. */
export function panelExhaustedForEligibleRequest(state:PlanetGameState,actorId:SeatId,command:PlanetCommand):boolean {
  return planetHasPrivateFeedback(state.versions)&&command.type==='PANEL_CODE'&&panelEligibleWithoutInventory(state,actorId)
    &&planetWorld(state,actorId).injectionsRemaining===0;
}

/** All rejection paths precede mutation. The enclosing engine owns authentication/time/phase identity. */
export function physicalPlanetCommand(state:PlanetGameState,actorId:SeatId,command:PlanetCommand,commandId:string):boolean {
  if(!state.roles[actorId] || typeof commandId!=='string'||commandId.length===0)return false;
  const world=planetWorld(state,actorId),actor=world.seats.find(s=>s.seatId===actorId);if(!actor||!alive(actor))return false;
  const role=state.roles[actorId],target='targetSeatId'in command?world.seats.find(s=>s.seatId===command.targetSeatId):undefined;
  switch(command.type){
    case 'REGISTER_SHOT':
      if(!ownTurn(state,actorId)||!freeHealthy(actor)||state.round<4||actor.shotSpent||actor.ordinaryWeapons<1||!target||!planetLocalTarget(state,world,actor,target))return false;
      actor.ordinaryWeapons--;actor.shotSpent=true;register(state,world,actorId,command,commandId);return true;
    case 'PROTECT':
      if(role!=='Undercover'||!canRoleAction(state,actorId)||!target||target.protectionEver||!planetLocalTarget(state,world,actor,target,true))return false;
      actor.roleActionSpent=true;target.protectionEver=true;register(state,world,actorId,command,commandId);return true;
    case 'RESCUE':
      if(role!=='Doctor'||!ownTurn(state,actorId)||actor.roleActionSpent||actor.jailed||world.injectionsRemaining<1||!target
        ||!planetLocalTarget(state,world,actor,target,true,true)||(!freeHealthy(actor)&&target.seatId!==actorId))return false;
      actor.roleActionSpent=true;world.injectionsRemaining--;register(state,world,actorId,command,commandId);return true;
    case 'SUPPLY': {
      const targets=command.targetSeatIds.map(id=>world.seats.find(s=>s.seatId===id));
      if(role!=='Supplier'||state.round!==3||!canRoleAction(state,actorId)||command.targetSeatIds.length!==2||new Set(command.targetSeatIds).size!==2
        ||targets.some(s=>!s||!planetLocalTarget(state,world,actor,s,true)))return false;
      actor.roleActionSpent=true;register(state,world,actorId,command,commandId);return true;
    }
    case 'ACTIVATE_CLONE':
      if(role!=='Alien'||!canRoleAction(state,actorId)||actor.clone.used)return false;
      if(!Number.isSafeInteger(state.round+1))throw Error('Clone round exhausted');
      actor.roleActionSpent=true;actor.clone={used:true,active:true,expiresAfterRound:state.round+1};return true;
    case 'REQUEST_BLACKOUT': {
      if(!['Blue Disabler','Red Disabler'].includes(role)||!canRoleAction(state,actorId)||actor.blackoutSpent
        ||world.actions.some(a=>a.actorSeatId===actorId&&a.command.type==='REQUEST_BLACKOUT'))return false;
      actor.roleActionSpent=true;const action=register(state,world,actorId,command,commandId);
      action.boundRoom=actor.location as 'Room A'|'Room B'|'Command Room';action.selectedSlotId=null;return true;
    }
    case 'ENGINEER_SUPPRESS': {
      if(role!=='Engineer'||!canRoleAction(state,actorId)||actor.engineerSpent||!['Room A','Room B'].includes(actor.location??''))return false;
      const opposite=actor.location==='Room A'?'Room B':'Room A';
      const captured=world.seats.filter(s=>s.location===opposite).map(s=>s.seatId);
      actor.roleActionSpent=true;actor.engineerSpent=true;world.suppressedSeatIds=[...new Set([...world.suppressedSeatIds,...captured])];
      if(planetHasPrivateFeedback(state.versions))actor.engineerCapture={round:state.round,seatIds:[...captured].sort((a,b)=>numeric(a)-numeric(b))};return true;
    }
    case 'PANEL_CODE': {
      // P21: an empty shared pool is rejected before looking at the Doctor answer.
      if(!panelEligibleWithoutInventory(state,actorId)||world.injectionsRemaining<1)return false;
      const correct=state.roles[command.doctorSeatId]==='Doctor';
      registerPlanetPanelRequest(state,world,actorId,commandId,correct);state.global.panelAttempts.push(actorId);
      if(correct){world.injectionsRemaining--;register(state,world,actorId,command,commandId);}return true;
    }
    case 'CAPTAIN_RELEASE': case 'CAPTAIN_EJECT': {
      if(!captainAvailable(state,world,actor,command.type))return false;
      const before=placements(world);
      if(command.type==='CAPTAIN_RELEASE'){
        const living=world.seats.filter(s=>s.location==='Jail'&&alive(s)).sort((a,b)=>numeric(a.seatId)-numeric(b.seatId));
        world.releaseUsed=true;for(const s of living){s.jailed=false;returnOrdinary(world,s);}
        storePlanetEvent(state,world,'CAPTAIN_RELEASE',living.map(s=>s.seatId),null,null,actorId);
      }else{
        const removed=world.seats.filter(s=>s.location==='Jail');world.ejectUsed=true;
        for(const s of removed){s.health='Eliminated';s.location=null;s.slotId=null;s.jailed=false;s.rescueDueAfterRound=null;s.medical=null;s.clone.active=false;}
        storePlanetEvent(state,world,'CAPTAIN_EJECT',removed.map(s=>s.seatId),null,null,actorId);
      }
      recordPlacementChanges(state,world,before);clearPlanetOffices(state,world);return true;
    }
    default:return false;
  }
}

/** Clone the full authority for offer probing; no resource, global attempt or event escapes. */
export function canPlanetPhysicalCommand(state:PlanetGameState,actorId:SeatId,command:PlanetCommand):boolean {
  return physicalPlanetCommand(copyPlanet(state),actorId,command,'physical-offer');
}
export function planetPhysicalOffers(state:PlanetGameState,actorId:SeatId):PlanetOffer[] {
  if(!state.roles[actorId])return [];
  const out:PlanetOffer[]=[],ids=seatIds(state);
  const add=(type:PlanetOffer['type'],targets:SeatId[]=[])=>out.push({type,targetSeatIds:targets,slotIds:[],windowIds:[],promiseTargetSeatIds:[]});
  for(const type of ['REGISTER_SHOT','PROTECT','RESCUE'] as const){const targets=ids.filter(targetSeatId=>canPlanetPhysicalCommand(state,actorId,{type,targetSeatId} as PlanetCommand));if(targets.length)add(type,targets);}
  const supply=new Set<SeatId>();for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++)if(canPlanetPhysicalCommand(state,actorId,{type:'SUPPLY',targetSeatIds:[ids[a]!,ids[b]!]})){supply.add(ids[a]!);supply.add(ids[b]!);}
  if(supply.size)add('SUPPLY',[...supply]);
  for(const type of ['ACTIVATE_CLONE','REQUEST_BLACKOUT','ENGINEER_SUPPRESS','CAPTAIN_RELEASE','CAPTAIN_EJECT'] as const)if(canPlanetPhysicalCommand(state,actorId,{type}))add(type,[actorId]);
  if(planetHasPhoneOffers(state.versions)){
    // Original public numbers are keypad choices, not correctness or stock feedback.
    if(panelEligibleWithoutInventory(state,actorId))add('PANEL_CODE',[...ids].sort((a,b)=>numeric(a)-numeric(b)));
  }else{
    // Preserve historical availability probing and its empty metadata exactly.
    if(canPlanetPhysicalCommand(state,actorId,{type:'PANEL_CODE',doctorSeatId:ids[0]!}))add('PANEL_CODE');
  }
  return out;
}

/** Jail capacity includes physical bodies and living detained Hospital reservations. */
export function jailPlanetSeat(state:PlanetGameState,world:PlanetWorld,targetId:SeatId):boolean {
  const target=world.seats.find(s=>s.seatId===targetId);
  if(!target||!alive(target)||target.jailed||planetJailOccupancy(world)>=5)return false;
  const before=placements(world);
  if(target.health==='Healthy'){
    const place=freeSlot(world,'Jail');if(!place)return false;
    target.location='Jail';target.slotId=place;
  }else if(target.location!=='Hospital')return false;
  target.jailed=true;recordPlacementChanges(state,world,before);clearPlanetOffices(state,world);return true;
}

/** Admission occurs only after whole-state Sync and fixes one common neutral board. */
export function openPlanetBlackoutBatch(state:PlanetGameState):void {
  if(!planetHasPreVoteBlackout(state.versions)||state.phase.kind!=='BLACKOUT'||state.blackholeActive||state.blackoutBatch!==null)throw Error('Invalid Blackout admission checkpoint');
  const world=planetWorld(state),attempts:PlanetBlackoutAttempt[]=[];
  world.actions=world.actions.filter(action=>{
    if(action.command.type!=='REQUEST_BLACKOUT')return true;
    const actor=planetSeat(world,action.actorSeatId);
    if(!freeHealthy(actor)||actor.blackoutSpent)return false;
    action.boundRoom=actor.location as PlanetBlackoutAttempt['boundRoom'];action.selectedSlotId=null;
    attempts.push({actorSeatId:actor.seatId,commandId:action.commandId,order:action.order,boundRoom:action.boundRoom,
      selection:'PENDING',selectedSlotId:null,selectedAt:null,targetSeatId:null,outcome:null});return true;
  });
  attempts.sort((a,b)=>a.order-b.order);
  state.blackoutBatch={round:state.round,windowId:state.phase.id,startedAt:state.phase.startedAt,endsAt:state.phase.endsAt!,
    completedAt:null,status:'OPEN',snapshot:world.seats.map(seat=>planetSeatView(world,seat)),attempts};
}
/** No later live-slot lookup may acquire another occupant or reveal a frozen miss. */
export function planetFrozenBlackoutTarget(batch:PlanetBlackoutBatch,attempt:PlanetBlackoutAttempt,slotId:NonNullable<PlanetSeatView['slotId']>):SeatId|null {
  const target=batch.snapshot.find(seat=>seat.location===attempt.boundRoom&&seat.slotId===slotId);
  return target&&target.health!=='Eliminated'&&target.seatId!==attempt.actorSeatId&&target.location!=='Command Room'?target.seatId:null;
}

function planetDamageBatch(state:PlanetGameState,world:PlanetWorld) {
  const candidates=new Set<SeatId>(),before=placements(world),offset=world.events.length;
  const eliminate=(target:PlanetPhysicalSeat)=>{
    const wasAlive=alive(target);target.health='Eliminated';target.rescueDueAfterRound=null;target.medical=null;target.clone.active=false;
    if(wasAlive)storePlanetEvent(state,world,'ELIMINATED',[target.seatId]);
  };
  const strike=(id:SeatId):NonNullable<PlanetBlackoutAttempt['outcome']>=>{
    const target=planetSeat(world,id);if(!alive(target))return 'NO_EFFECT';
    const blocked=target.clone.active||(target.protection!==null&&!target.protection.consumed&&target.protection.activeFromRound<=state.round);
    if(blocked){
      if(!target.clone.active)target.protection!.consumed=true;
      const room=target.location;if(room===null)throw Error('Missing impact room');
      storePlanetEvent(state,world,'ATTACK_BLOCKED',[target.seatId],room,world.seats.filter(seat=>seat.location===room).map(seat=>seat.seatId));
      world.events[world.events.length-1]!.event.slotId=target.slotId;return 'BLOCKED';
    }
    const outcome=target.health==='Healthy'?'INJURED':'ELIMINATED';
    if(target.health==='Healthy'){candidates.add(target.seatId);target.health='Injured';target.rescueDueAfterRound=state.round+1;target.medical={admittedRound:state.round,rescueDueAfterRound:state.round+1,rescueOpportunity:'NEXT_NORMAL_ROUND'};storePlanetEvent(state,world,'INJURED',[target.seatId]);}
    else eliminate(target);
    clearPlanetOffices(state,world);return outcome;
  };
  return {candidates,before,offset,eliminate,strike};
}
type PlanetDamageBatch=ReturnType<typeof planetDamageBatch>;

/** Actual physical settlement only; full-round aging/Rescue/expiry are separate. */
function settlePlanetDamage(state:PlanetGameState,world:PlanetWorld,batch:PlanetDamageBatch,finalize:boolean,hungerOrder:readonly SeatId[]=[]):void {
  const {candidates,before,offset,eliminate}=batch,denied=new Set<SeatId>();
  const returners=world.seats.filter(s=>s.health==='Healthy'&&!s.jailed&&(candidates.has(s.seatId)||s.location==='Hospital'||s.location==='Jail'||(s.location==='Command Room'&&world.captainSeatId!==s.seatId))).sort((a,b)=>numeric(a.seatId)-numeric(b.seatId));
  const candidatesNumeric=world.seats.filter(s=>candidates.has(s.seatId)).sort((a,b)=>numeric(a.seatId)-numeric(b.seatId));
  // Food is a successor-only ordered suffix. Existing attack candidates keep their exact
  // numeric priority; hungry seats compete in retained ordinary completion order afterward.
  const hungry=planetHasFoodTask(state.versions)?new Set(hungerOrder):new Set<SeatId>();
  const candidatesSorted=hungry.size===0?candidatesNumeric:[...candidatesNumeric.filter(s=>!hungry.has(s.seatId)),...hungerOrder.map(id=>planetSeat(world,id))];
  const jailReturners=world.seats.filter(s=>s.health==='Healthy'&&s.jailed&&(s.location==='Hospital'||candidates.has(s.seatId))).sort((a,b)=>numeric(a.seatId)-numeric(b.seatId));
  for(const target of [...returners,...candidatesSorted,...jailReturners]){target.location=null;target.slotId=null;}
  for(const target of candidatesSorted){
    if(returners.includes(target)||jailReturners.includes(target))continue;
    if(target.health==='Healthy')throw Error('Missing healed return placement');
    const bed=freeSlot(world,'Hospital');
    if(bed){target.location='Hospital';target.slotId=bed;}
    else{eliminate(target);target.location=null;target.slotId=null;target.jailed=false;denied.add(target.seatId);}
  }
  for(const target of jailReturners)movePhysical(world,target,'Jail');
  for(const target of returners)returnOrdinary(world,target);
  if(finalize)for(const target of world.seats){
    if(target.health==='Eliminated')target.revealedFaction=planetFaction(state.roles[target.seatId]!);
    if(target.clone.active&&target.clone.expiresAfterRound!==null&&target.clone.expiresAfterRound<=state.round)target.clone.active=false;
  }
  // Earlier published batches are immutable; only this unpublished suffix is resealed.
  const retained=world.events.slice(offset).filter(record=>!(clinicalKinds.has(record.event.kind)&&record.event.seatIds.some(id=>denied.has(id))));
  world.events=world.events.slice(0,offset);
  for(const record of retained){const event=record.event;storePlanetEvent(state,world,event.kind,event.seatIds,event.location,record.recipients,event.actorSeatId,event.slotId,event.clinicalAnchor);}
  sealClinicalAnchors(state,world,offset,before);
  for(const id of [...denied].sort((a,b)=>numeric(a)-numeric(b)))storePlanetEvent(state,world,'HOSPITAL_OVERFLOW_REMOVED',[id]);
  recordPlacementChanges(state,world,before);clearPlanetOffices(state,world);
}

/** Resolve a complete admitted batch once, before voting, without running unrelated actions. */
export function resolvePlanetBlackoutBatch(state:PlanetGameState):void {
  const batch=state.blackoutBatch,world=planetWorld(state);
  if(!planetHasPreVoteBlackout(state.versions)||state.phase.kind!=='BLACKOUT'||state.blackholeActive||!batch||batch.status!=='OPEN'
    ||batch.windowId!==state.phase.id||state.evaluatedAt<batch.endsAt)throw Error('Invalid Blackout resolution checkpoint');
  const damage=planetDamageBatch(state,world);
  for(const attempt of batch.attempts){
    if(attempt.selection==='PENDING')attempt.selection='TIMED_OUT';
    planetSeat(world,attempt.actorSeatId).blackoutSpent=true;
    attempt.outcome=attempt.targetSeatId===null?'MISS':damage.strike(attempt.targetSeatId);
  }
  settlePlanetDamage(state,world,damage,false);
  world.actions=world.actions.filter(action=>action.command.type!=='REQUEST_BLACKOUT');
  batch.status='RESOLVED';batch.completedAt=state.evaluatedAt;
}

/** Complete selected-world resolution. No attack, heal, Promise or ending runs before Sync. */
export function resolvePlanetPhysical(state:PlanetGameState,world:PlanetWorld):void {
  if(planetHasPreVoteBlackout(state.versions)&&(state.blackoutBatch?.status!=='RESOLVED'||world.actions.some(action=>action.command.type==='REQUEST_BLACKOUT')))throw Error('Remaining resolution requires completed Blackout');
  if(planetHasFoodTask(state.versions)&&!world.food)throw Error('Food resolution requires the retained world ledger');
  const damage=planetDamageBatch(state,world),{eliminate,strike}=damage;
  const ordered=state.turnOrder.flatMap(id=>world.actions.filter(a=>a.actorSeatId===id));
  if(ordered.length!==world.actions.length)throw Error('Unknown registered physical actor');
  // Freeze all admitted Blackout hits against the same pre-attack positions.
  const blackoutTargets=new Map<PlanetRegisteredAction,SeatId|null>();
  for(const action of ordered.filter(a=>a.command.type==='REQUEST_BLACKOUT')){
    const actor=planetSeat(world,action.actorSeatId);
    if(!freeHealthy(actor)){blackoutTargets.set(action,null);continue;}
    if(!action.boundRoom||!['Room A','Room B','Command Room'].includes(action.boundRoom))throw Error('Missing admitted Blackout room');
    actor.blackoutSpent=true;
    const target=world.seats.find(s=>s.location===action.boundRoom&&s.slotId===action.selectedSlotId);
    blackoutTargets.set(action,target&&alive(target)&&target.seatId!==actor.seatId&&target.location!=='Command Room'?target.seatId:null);
  }
  for(const actorId of state.turnOrder){
    const actions=ordered.filter(a=>a.actorSeatId===actorId);
    for(const action of [...actions.filter(a=>['PROTECT','REQUEST_BLACKOUT'].includes(a.command.type)),...actions.filter(a=>a.command.type==='REGISTER_SHOT')]){
      const command=action.command;
      if(command.type==='PROTECT'){const target=planetSeat(world,command.targetSeatId);if(alive(target))target.protection={donorSeatId:actorId,activeFromRound:state.round+1,consumed:false};}
      else if(command.type==='REQUEST_BLACKOUT'){const target=blackoutTargets.get(action);if(target)strike(target);}
      else if(command.type==='REGISTER_SHOT')strike(command.targetSeatId);
    }
  }
  const newlyHungryInjured=new Set<SeatId>(),hungerOrder:SeatId[]=[];
  if(planetHasFoodTask(state.versions)){
    if(!world.food)throw Error('Food resolution requires the retained world ledger');
    for(const id of hungerCandidates(world.food,state.round,world.seats,state.turnOrder)){
      const target=planetSeat(world,id);
      // Hunger is not a strike: do not inspect/consume Protection or Clone and never escalate
      // a prior injury, revive an eliminated player or extend an existing episode's deadline.
      if(target.health!=='Healthy')continue;
      target.health='Injured';target.rescueDueAfterRound=state.round+1;
      target.medical={admittedRound:state.round,rescueDueAfterRound:state.round+1,rescueOpportunity:'NEXT_NORMAL_ROUND'};
      damage.candidates.add(id);newlyHungryInjured.add(id);hungerOrder.push(id);
      storePlanetEvent(state,world,'INJURED',[id]);
    }
    if(hungerOrder.length>0)clearPlanetOffices(state,world);
  }
  // Registered treatment survives actor incapacity and has already reserved its injection.
  for(const action of ordered)if(action.command.type==='RESCUE'||action.command.type==='PANEL_CODE'){
    const id=action.command.type==='RESCUE'?action.command.targetSeatId:action.actorSeatId,target=planetSeat(world,id);
    const treated=target.health==='Injured'&&!newlyHungryInjured.has(id);
    if(action.command.type==='PANEL_CODE')resolvePlanetPanelReservation(state,world,action.actorSeatId,action.commandId,treated);
    if(treated){target.health='Healthy';target.rescueDueAfterRound=null;target.medical=null;storePlanetEvent(state,world,'RESCUED',[id]);}
  }
  if(state.round===3)for(const action of ordered)if(action.command.type==='SUPPLY')for(const id of action.command.targetSeatIds){const target=planetSeat(world,id);if(alive(target))target.ordinaryWeapons++;}
  for(const target of world.seats)if(target.health==='Injured'&&target.rescueDueAfterRound!==null&&target.rescueDueAfterRound<=state.round)eliminate(target);
  clearPlanetOffices(state,world);
  settlePlanetDamage(state,world,damage,true,hungerOrder);world.actions=[];
}
