import {
  FoodTaskCommandRequestSchema, FoodTaskReceiptSchema, FoodTaskPublicViewSchema, FoodTaskPlayerViewSchema, FoodTaskRequestViewSchema, FoodTaskRequestClosureSchema, IdentifierSchema,
  FOOD_TASK_PARAMETERS as P,
  type FoodTaskCommandRequest, type FoodTaskReceipt,
  type FoodTaskPublicView, type FoodTaskPlayerView, type FoodTaskParticipant, type SeatId,
} from '@mothership/contracts';
import {
  copyPlanet, seatIds, planetWorld, planetSeat, planetSeatView, planetHasFoodTask,
  type PlanetGameContext, type PlanetGameState, type PlanetWorld,
} from './model.js';
import {clearPlanetOffices,restorePlanetFoodCaptainLoss} from './physical.js';
import {addFoodDeliveryOnce, finishFoodOrdinaryTurn, ownFoodMeals, assertFoodWorldLedger} from './food-meals.js';
import {
  createFoodTaskMachine, applyFoodTaskPress, advanceFoodTaskMachine, projectFoodTaskParticipant,
  foodTaskMachineDeadlineAt, foodTaskMachineInputs, setFoodTaskPresence,
  type FoodTaskMachine, type FoodTaskMachineEffect,
} from './food-machine.js';

type Closure=FoodTaskPlayerView['requestClosures'][number];
type Invitation=NonNullable<FoodTaskPlayerView['invitation']>;
export interface PlanetFoodIds {
  requestId:string;taskId:string;winchControlSessionId:string;panelControlSessionId:string;
}
export interface PlanetFoodData {
  completedThroughRound:number;
  lastTaskRound:Partial<Record<SeatId,number>>;
  refusedRound:Partial<Record<SeatId,number>>;
  closures:Closure[];
  receipts:Record<string,{fingerprint:string;receipt:FoodTaskReceipt}>;
  appliedEffects:string[];
  nextCompletionOrder:number;
  turnEnds:FoodTaskPublicView['turnEnds'];
  publicStock:{doses:number;publicationRound:number};
  revisions:{public:number;players:Record<SeatId,number>};
  step:{id:string;round:number;startedAt:number;askingEndsAt:number;askingClosed:boolean;completedAt:number|null;
    invitation:Invitation|null;task:FoodTaskMachine|null;frozenWorld:PlanetWorld|null}|null;
}
const numeric=(a:SeatId,b:SeatId)=>Number(a.slice(5))-Number(b.slice(5));
export function createPlanetFoodData(ids:SeatId[]):PlanetFoodData {
  return {completedThroughRound:0,lastTaskRound:{},refusedRound:{},closures:[],receipts:{},appliedEffects:[],nextCompletionOrder:1,
    turnEnds:[],publicStock:{doses:P.initialDoses,publicationRound:0},
    revisions:{public:0,players:Object.fromEntries(ids.map(id=>[id,0])) as Record<SeatId,number>},step:null};
}
function eligible(state:PlanetGameState,id:SeatId):boolean {
  const s=planetSeat(planetWorld(state),id);
  return s.health!=='Eliminated'&&!s.jailed&&s.location!=='Hospital'&&s.location!=='Jail'
    &&state.food!.lastTaskRound[id]!==state.round-1;
}
/** Central entry used after an election/appointment, or directly when no election is required. */
export function openPlanetFoodStep(state:PlanetGameState,ctx:PlanetGameContext):boolean {
  if(!planetHasFoodTask(state.versions))return false;
  const f=state.food!;
  if(f.completedThroughRound>=state.round||seatIds(state).filter(id=>eligible(state,id)).length<2){f.completedThroughRound=state.round;return false;}
  f.step={id:ctx.nextPhaseId,round:state.round,startedAt:ctx.now,askingEndsAt:ctx.now+P.askingMs,askingClosed:false,completedAt:null,
    invitation:null,task:null,frozenWorld:null};
  state.phase={id:ctx.nextPhaseId,kind:'FOOD_SUPPLY',startedAt:ctx.now,endsAt:ctx.now+P.askingMs};
  state.deadlineToken=ctx.nextDeadlineToken;state.activeSeatId=null;state.panelOpen=false;return true;
}
/** Every ordinary publication, including a participant's donor state, stays at Task start until return. */
export function planetFoodPublicationWorld(state:PlanetGameState,id?:SeatId):PlanetWorld {
  return state.food?.step?.task&&state.food.step.frozenWorld?state.food.step.frozenWorld:planetWorld(state,id);
}
function closeInvitation(state:PlanetGameState,kind:Closure['state'],at:number):Closure {
  const f=state.food!,r=f.step!.invitation!;
  const closure:Closure={foodStepId:r.foodStepId,round:r.round,requestId:r.requestId,requestRevision:r.revision+1,
    volunteerSeatId:r.volunteerSeatId,partnerSeatId:r.partnerSeatId,askedAt:r.askedAt,answerEndsAt:r.answerEndsAt,closedAt:at,state:kind};
  f.closures.push(closure);f.step!.invitation=null;
  if(kind!=='JOINED'){f.refusedRound[r.volunteerSeatId]=state.round;if(at>=f.step!.askingEndsAt)f.step!.completedAt=at;}
  return closure;
}
function applyEffects(state:PlanetGameState,effects:readonly FoodTaskMachineEffect[]):void {
  const f=state.food!,world=planetWorld(state);
  for(const effect of effects){
    if(f.appliedEffects.includes(effect.id))continue;
    if(effect.type==='DELIVER'){
      world.food=addFoodDeliveryOnce(world.food!,f.step!.task!.options.taskId);
      f.publicStock={doses:world.food.doses,publicationRound:state.round};
    }else{
      const target=planetSeat(world,effect.seatId as SeatId);
      if(effect.type==='CONSUME_PROTECTION'){
        if(!target.protection||target.protection.consumed||target.protection.activeFromRound>state.round)throw Error('Missing retained Task defense');
        target.protection.consumed=true;
      }else{
        target.health='Eliminated';target.medical=null;target.rescueDueAfterRound=null;target.clone.active=false;
        clearPlanetOffices(state,world);
      }
    }
    f.appliedEffects.push(effect.id);
  }
}
/** Public phase expiry never exposes an internal motion, catch, presence or early ending deadline. */
function stampDeadline(state:PlanetGameState,ctx:PlanetGameContext):void {
  const step=state.food!.step!;
  state.phase.endsAt=step.task?step.task.returnsAt:step.askingEndsAt;
  state.deadlineToken=ctx.nextDeadlineToken;
}
export function planetFoodDeadlineAt(state:PlanetGameState):number|null {
  const step=state.food?.step;if(!step||state.phase.kind!=='FOOD_SUPPLY')return null;
  if(step.task)return foodTaskMachineDeadlineAt(step.task);
  if(step.askingClosed&&!step.invitation)return step.completedAt??step.askingEndsAt;
  return Math.min(...[!step.askingClosed?step.askingEndsAt:Infinity,step.invitation?.answerEndsAt??Infinity]);
}
/** Drains each due original boundary, returning its common return time for the lifecycle to publish. */
export function advancePlanetFood(state:PlanetGameState,ctx:PlanetGameContext):{completedAt:number|null} {
  const f=state.food!,step=f.step!;
  if(step.task){
    const advanced=advanceFoodTaskMachine(step.task,ctx.now);step.task=advanced.machine;applyEffects(state,advanced.effects);
    if(step.task.returnedAt!==null)return {completedAt:step.task.returnsAt};
  }else{
    if(step.invitation&&step.invitation.answerEndsAt<=ctx.now)closeInvitation(state,'EXPIRED',step.invitation.answerEndsAt);
    if(step.askingEndsAt<=ctx.now)step.askingClosed=true;
    if(step.askingClosed&&!step.invitation)return {completedAt:step.completedAt??step.askingEndsAt};
  }
  stampDeadline(state,ctx);return {completedAt:null};
}
export function completePlanetFood(state:PlanetGameState):PlanetWorld|null {
  const f=state.food!,frozen=f.step?.frozenWorld??null;
  f.completedThroughRound=state.round;f.step=null;state.panelOpen=true;return frozen;
}
function receipt(request:FoodTaskCommandRequest,now:number,result:unknown):FoodTaskReceipt {
  const {command:_command,...context}=request;return FoodTaskReceiptSchema.parse({...context,receivedAt:now,...(result as object)});
}
/** The lifecycle owns state copying, boundary draining and audience revisions around this transition. */
export function applyPlanetFoodRequest(state:PlanetGameState,actor:SeatId,raw:FoodTaskCommandRequest,ctx:PlanetGameContext):FoodTaskReceipt {
  const q=FoodTaskCommandRequestSchema.parse(raw),f=state.food!;
  const reject=(code:Extract<FoodTaskReceipt,{status:'rejected'}>['code'],closure:Closure|null=null)=>receipt(q,ctx.now,{status:'rejected',code,requestClosure:closure});
  const key=JSON.stringify([actor,q.commandId]),fingerprint=JSON.stringify(q),previous=f.receipts[key];
  if(previous)return previous.fingerprint===fingerprint?copyPlanet(previous.receipt):reject('STALE_CONTEXT');
  const finish=(r:FoodTaskReceipt)=>{f.receipts[key]={fingerprint,receipt:copyPlanet(r)};return r;};
  if(q.matchId!==state.matchId||!Object.hasOwn(state.roles,actor))return finish(reject('NOT_ALLOWED'));
  const c=q.command;
  if(c.type==='TASK_ANSWER'||c.type==='TASK_ASK_WITHDRAW'){
    const closure=f.closures.find(r=>r.requestId===c.requestId&&r.foodStepId===q.foodStepId&&r.round===q.round
      &&(c.type==='TASK_ANSWER'?r.partnerSeatId:r.volunteerSeatId)===actor);
    if(closure)return finish(reject('REQUEST_CLOSED',closure));
  }
  const step=f.step;
  // Uniform closed-step denial precedes all live health/Task checks for outsiders.
  if(!step||state.phase.kind!=='FOOD_SUPPLY'||q.phaseId!==state.phase.id||q.foodStepId!==step.id||q.round!==state.round)
    return finish(reject('PHASE_CLOSED'));
  if(step.task){
    if(c.type!=='TASK_PRESS')return finish(reject('PHASE_CLOSED'));
    const world=planetWorld(state),protectionBySeat=Object.fromEntries(world.seats.map(s=>[s.seatId,
      s.protection!==null&&!s.protection.consumed&&s.protection.activeFromRound<=state.round]));
    let randomIndex=0;
    const applied=applyFoodTaskPress(step.task,actor,q,{now:ctx.now,protectionBySeat,roll:()=>{
      const value=ctx.random[randomIndex++];if(value===undefined)throw Error('Recorded Task randomness exhausted');return value;
    }});
    step.task=applied.machine;applyEffects(state,applied.effects);stampDeadline(state,ctx);return finish(applied.receipt);
  }
  if(c.type==='TASK_PRESS')return finish(reject('NOT_ALLOWED'));
  if(c.type==='TASK_ASK'){
    if(step.askingClosed||ctx.now>=step.askingEndsAt||step.invitation||!eligible(state,actor)||f.refusedRound[actor]===state.round
      ||actor===c.partnerSeatId||!Object.hasOwn(state.roles,c.partnerSeatId)||!eligible(state,c.partnerSeatId))return finish(reject('NOT_ALLOWED'));
    const ids=ctx.foodIds;if(!ids)throw Error('Recorded opaque Food identities required');
    step.invitation={foodStepId:step.id,round:state.round,requestId:ids.requestId,revision:0,volunteerSeatId:actor,
      partnerSeatId:c.partnerSeatId,askedAt:ctx.now,answerEndsAt:ctx.now+P.answerMs,state:'PENDING'};
    stampDeadline(state,ctx);return finish(receipt(q,ctx.now,{status:'accepted',result:{kind:'REQUEST',requestId:ids.requestId,requestRevision:0,state:'PENDING'}}));
  }
  const r=step.invitation;
  if(!r||r.requestId!==c.requestId||r.revision!==c.requestRevision||ctx.now>=r.answerEndsAt
    ||(c.type==='TASK_ANSWER'?r.partnerSeatId:r.volunteerSeatId)!==actor)return finish(reject('NOT_ALLOWED'));
  if(c.type==='TASK_ASK_WITHDRAW'){
    const closed=closeInvitation(state,'WITHDRAWN',ctx.now);stampDeadline(state,ctx);
    return finish(receipt(q,ctx.now,{status:'accepted',result:{kind:'REQUEST',requestId:r.requestId,requestRevision:closed.requestRevision,state:'WITHDRAWN'}}));
  }
  if(c.answer==='DECLINE'){
    const closed=closeInvitation(state,'DECLINED',ctx.now);f.refusedRound[r.volunteerSeatId]=state.round;stampDeadline(state,ctx);
    return finish(receipt(q,ctx.now,{status:'accepted',result:{kind:'REQUEST',requestId:r.requestId,requestRevision:closed.requestRevision,state:'DECLINED'}}));
  }
  if(!eligible(state,r.volunteerSeatId)||!eligible(state,r.partnerSeatId))return finish(reject('NOT_ALLOWED'));
  const ids=ctx.foodIds;if(!ids)throw Error('Recorded opaque Food identities required');
  const random=ctx.random[0];if(random===undefined)throw Error('Recorded Task assignment required');
  const pair=[r.volunteerSeatId,r.partnerSeatId],winch=pair[random<.5?0:1]!,panel=pair.find(id=>id!==winch)!;
  const closed=closeInvitation(state,'JOINED',ctx.now);step.frozenWorld=copyPlanet(planetWorld(state));
  f.lastTaskRound[winch]=state.round;f.lastTaskRound[panel]=state.round;
  step.task=createFoodTaskMachine({matchId:state.matchId,phaseId:state.phase.id,foodStepId:step.id,round:state.round,
    taskId:ids.taskId,winchSeatId:winch,panelSeatId:panel,winchControlSessionId:ids.winchControlSessionId,
    panelControlSessionId:ids.panelControlSessionId,startedAt:ctx.now});
  stampDeadline(state,ctx);
  return finish(receipt(q,ctx.now,{status:'accepted',result:{kind:'REQUEST',requestId:r.requestId,requestRevision:closed.requestRevision,state:'JOINED'}}));
}
export function setPlanetFoodConnection(state:PlanetGameState,id:SeatId,online:boolean,ctx:PlanetGameContext):void {
  const step=state.food?.step;if(!step?.task||!step.task.people.some(p=>p.seatId===id))return;
  const next=setFoodTaskPresence(step.task,id,online,ctx.now);step.task=next.machine;applyEffects(state,next.effects);stampDeadline(state,ctx);
}
export function finishPlanetFoodMeal(state:PlanetGameState,ctx:PlanetGameContext):void {
  if(!planetHasFoodTask(state.versions)||state.activeSeatId===null)return;
  const f=state.food!,world=planetWorld(state,state.activeSeatId),s=planetSeat(world,state.activeSeatId);
  const done=finishFoodOrdinaryTurn(world.food!,{matchId:state.matchId,round:state.round,seatId:s.seatId,sourcePhaseId:state.phase.id,
    order:f.nextCompletionOrder,endedAt:ctx.now,health:s.health,location:s.location,
    placement:s.location&&s.slotId?{location:s.location,slotId:s.slotId}:null});
  world.food=done.ledger;
  if(done.applied&&done.turnEnd){f.nextCompletionOrder++;f.turnEnds.push({...done.turnEnd,placement:null});}
}
function header(state:PlanetGameState,now:number){return {schemaVersion:1 as const,versions:state.versions,matchId:state.matchId,round:state.round,
  phaseId:state.phase.id,serverNowMs:now,playerCount:state.playerCount,rosterSeatIds:seatIds(state).sort(numeric),turnEnds:state.food!.turnEnds.slice(-18)};}
function publicStep(state:PlanetGameState):FoodTaskPublicView['step'] {
  const s=state.food!.step;if(!s||state.phase.kind!=='FOOD_SUPPLY')return null;
  return s.task?{kind:'AWAY',stepId:s.id,startedAt:s.task.options.startedAt,returnsAt:s.task.returnsAt,
    awaySeatIds:[s.task.options.winchSeatId,s.task.options.panelSeatId].sort(numeric) as [SeatId,SeatId]}
    :{kind:'ASKING',stepId:s.id,startedAt:s.startedAt,askingEndsAt:s.askingEndsAt,someoneAsking:s.invitation!==null};
}
export function projectPlanetFoodPublic(state:PlanetGameState,now=state.evaluatedAt):FoodTaskPublicView {
  const f=state.food!;
  return FoodTaskPublicViewSchema.parse({...header(state,now),audience:'public',viewRevision:f.revisions.public,
    step:publicStep(state),stock:{...f.publicStock,basis:'FINALIZED'}});
}
function ownAvailability(state:PlanetGameState,id:SeatId,now:number):FoodTaskPlayerView['ownAvailability'] {
  const f=state.food!,s=state.phase.kind==='FOOD_SUPPLY'?f.step:null;
  const reason=s?.task?'TASK_ALREADY_STARTED':!s||s.askingClosed||now>=s.askingEndsAt?'NOT_IN_STEP':s.invitation?'REQUEST_PENDING'
    :f.lastTaskRound[id]===state.round-1?'WENT_LAST_ROUND':f.refusedRound[id]===state.round?'REFUSED_THIS_ROUND':!eligible(state,id)?'NOT_AVAILABLE_NOW':null;
  return {canAsk:reason===null,reason};
}
export function projectPlanetFoodPlayer(state:PlanetGameState,id:SeatId,now=state.evaluatedAt):FoodTaskPlayerView {
  const f=state.food!,s=state.phase.kind==='FOOD_SUPPLY'?f.step:null,world=planetWorld(state,id),availability=ownAvailability(state,id,now);
  const choices=seatIds(state).sort(numeric).filter(other=>other!==id).map(other=>{
    const p=planetSeat(world,other);
    const reason=s?.task||!s||s.invitation||s.askingClosed||now>=s.askingEndsAt?'NOT_AVAILABLE_NOW':p.health==='Eliminated'?'ELIMINATED'
      :p.location==='Hospital'?'IN_HOSPITAL':p.jailed||p.location==='Jail'?'JAILED':f.lastTaskRound[other]===state.round-1?'WENT_LAST_ROUND':null;
    return {seatId:other,available:reason===null,reason};
  });
  const task=s?.task?.people.some(p=>p.seatId===id)?copyPlanet(projectFoodTaskParticipant(s.task,id)):null;
  if(task){
    task.revision=f.revisions.players[id];
    const original=s!.frozenWorld!,before=planetSeat(original,id);
    let returning=before;
    if(original.captainSeatId===id&&before.location==='Command Room'&&planetSeat(world,id).health==='Eliminated'){
      const preview=copyPlanet(world);restorePlanetFoodCaptainLoss(state,preview,original.seats.map(p=>planetSeatView(original,p)));returning=planetSeat(preview,id);
    }
    if(returning.location===null||returning.slotId===null)throw Error('Missing authorized Task return place');
    task.ownReturnPlacement={location:returning.location,slotId:returning.slotId};
  }
  const r=s?.invitation,pairRequest=r&&[r.volunteerSeatId,r.partnerSeatId].includes(id)?r:null;
  const offers:FoodTaskPlayerView['offers']=[];
  if(availability.canAsk&&choices.some(p=>p.available))offers.push({type:'TASK_ASK',partnerSeatIds:choices.filter(p=>p.available).map(p=>p.seatId)});
  if(pairRequest&&now<pairRequest.answerEndsAt)offers.push({type:pairRequest.partnerSeatId===id?'TASK_ANSWER':'TASK_ASK_WITHDRAW',requestId:pairRequest.requestId,requestRevision:pairRequest.revision});
  if(task&&task.stage!=='ENDED'&&now<task.deadlineAt&&task.people.some(p=>p.seatId===id&&p.alive)){
    const inputs=foodTaskMachineInputs(s!.task!,id);
    if(inputs.length)offers.push({type:'TASK_PRESS',taskId:task.taskId,controlSessionId:task.controlSessionId,controlRevision:task.controlRevision,inputs,crateId:task.crate.id});
  }
  return FoodTaskPlayerViewSchema.parse({...header(state,now),audience:'player',seatId:id,viewRevision:f.revisions.players[id],step:publicStep(state),
    stock:{doses:world.food!.doses,publicationRound:state.round,basis:'PLAYER_CURRENT'},ownAvailability:availability,
    partnerChoices:choices,invitation:pairRequest,participantTask:task,offers,privateCursor:f.revisions.players[id],
    requestClosures:f.closures.filter(r=>[r.volunteerSeatId,r.partnerSeatId].includes(id)).slice(-9),ownMeals:ownFoodMeals(world.food!,id)});
}
export function revisePlanetFood(before:PlanetGameState,after:PlanetGameState):void {
  if(!planetHasFoodTask(after.versions))return;
  const body=(value:FoodTaskPublicView|FoodTaskPlayerView)=>{
    const {viewRevision:_revision,serverNowMs:_clock,...rest}=value;
    if(rest.audience==='player'){rest.privateCursor=0;if(rest.participantTask)rest.participantTask.revision=0;}
    return JSON.stringify(rest);
  };
  if(body(projectPlanetFoodPublic(before))!==body(projectPlanetFoodPublic(after)))after.food!.revisions.public++;
  for(const id of seatIds(after))if(body(projectPlanetFoodPlayer(before,id))!==body(projectPlanetFoodPlayer(after,id)))after.food!.revisions.players[id]!++;
}

/** Candidate restore validation is separate from predecessor saves, which must omit every new field. */
export function assertPlanetFoodAuthority(state:PlanetGameState):void {
  const active=planetHasFoodTask(state.versions),ids=seatIds(state);
  const fail=(condition:unknown,label:string):void=>{if(!condition)throw Error('Invalid Food authority: '+label);};
  if(!active){fail(!Object.hasOwn(state,'food')&&Object.values(state.worlds).every(w=>!Object.hasOwn(w,'food')),'predecessor field absence');return;}
  const f=state.food;fail(f&&typeof f==='object','candidate ledger');if(!f)throw Error('Missing Food ledger');
  const natural=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>=0;
  fail(natural(f.completedThroughRound)&&f.completedThroughRound<=state.round,'completed round');
  fail(natural(f.nextCompletionOrder)&&f.nextCompletionOrder>0,'ordinary completion order');
  fail(natural(f.publicStock.doses)&&natural(f.publicStock.publicationRound)&&f.publicStock.publicationRound<=state.round,'finalized stock');
  fail(natural(f.revisions.public)&&Object.keys(f.revisions.players).length===ids.length&&ids.every(id=>natural(f.revisions.players[id])),'audience counters');
  for(const table of [f.lastTaskRound,f.refusedRound])fail(Object.entries(table).every(([id,r])=>ids.includes(id as SeatId)&&natural(r)&&r!>=1&&r!<=state.round),'participation/refusal evidence');
  fail(Array.isArray(f.closures)&&new Set(f.closures.map(c=>c.requestId)).size===f.closures.length,'unique original requests');
  for(const closure of f.closures){FoodTaskRequestClosureSchema.parse(closure);fail(closure.round<=state.round&&closure.closedAt<=state.evaluatedAt
    &&ids.includes(closure.volunteerSeatId)&&ids.includes(closure.partnerSeatId),'private closure context');}
  for(const [key,record]of Object.entries(f.receipts)){
    const binding=JSON.parse(key) as unknown;fail(Array.isArray(binding)&&binding.length===2&&ids.includes(binding[0])&&binding[1]===record.receipt.commandId,'own original receipt binding');
    const q=FoodTaskCommandRequestSchema.parse(JSON.parse(record.fingerprint));FoodTaskReceiptSchema.parse(record.receipt);
    fail(q.matchId===state.matchId&&record.receipt.matchId===state.matchId&&q.commandId===record.receipt.commandId&&record.receipt.receivedAt<=state.evaluatedAt,'durable receipt identity/time');
  }
  fail(Array.isArray(f.appliedEffects)&&f.appliedEffects.every(id=>typeof id==='string')&&new Set(f.appliedEffects).size===f.appliedEffects.length,'once-only world effects');
  fail(Array.isArray(f.turnEnds)&&new Set(f.turnEnds.map(t=>t.id)).size===f.turnEnds.length&&f.turnEnds.every((t,i)=>t.placement===null&&ids.includes(t.seatId)
    &&t.round<=state.round&&t.endedAt<=state.evaluatedAt&&t.order<f.nextCompletionOrder&&(i===0||t.order>f.turnEnds[i-1]!.order)),'neutral ordinary history');
  const settled=state.navigation.started||state.result?.reason==='ARRIVAL'||state.result?.reason==='NO_SURVIVORS';
  for(const w of Object.values(state.worlds)){
    assertFoodWorldLedger(w.food);fail(w.food!.matchId===null||w.food!.matchId===state.matchId,'world match binding');
    const unfinalized=settled?0:w.food!.meals.filter(m=>m.round===state.round&&m.result==='ATE').length;
    fail(w.food!.doses+unfinalized===f.publicStock.doses,'whole-world stock follows the finalized publication');
  }
  // An abort archives the private step and its frozen ordinary publication. It has
  // no offers/deadline and must not disclose a pending Task death by dropping that mask.
  const step=f.step,archived=state.phase.kind==='ABORTED'&&step!==null;
  fail(archived||(state.phase.kind==='FOOD_SUPPLY')===(step!==null),'exclusive phase/step');
  if(step){
    fail(IdentifierSchema.safeParse(step.id).success&&(archived||step.id===state.phase.id)&&step.round===state.round
      &&(archived||step.startedAt===state.phase.startedAt)&&step.askingEndsAt-step.startedAt===P.askingMs,'step context');
    fail(!state.blackholeActive&&Object.keys(state.worlds).length===1&&!state.panelOpen&&state.activeSeatId===null,'pre-fork exclusivity');
    fail((step.task===null)===(step.frozenWorld===null)&&!(step.task&&step.invitation),'one Task or original request');
    if(step.invitation){FoodTaskRequestViewSchema.parse(step.invitation);fail(step.invitation.state==='PENDING'&&step.invitation.foodStepId===step.id
      &&step.invitation.round===state.round&&step.invitation.askedAt<step.askingEndsAt&&step.invitation.askedAt<=state.evaluatedAt,'timely outstanding request');}
    if(step.task){
      const m=step.task,world=planetWorld(state);fail(m.options.matchId===state.matchId&&m.options.phaseId===step.id
        &&m.options.foodStepId===step.id&&m.options.round===state.round&&m.evaluatedAt<=state.evaluatedAt,'Task binding');
      fail(m.people.every(p=>ids.includes(p.seatId)&&p.alive===(planetSeat(world,p.seatId).health!=='Eliminated')),'Task/world living facts');
      fail(ids.every(id=>step.frozenWorld!.seats.some(s=>s.seatId===id)),'complete reserved original places');
      assertFoodWorldLedger(step.frozenWorld!.food);
      for(const p of m.people)projectFoodTaskParticipant(m,p.seatId);
      fail(archived||state.phase.endsAt===m.returnsAt,'fixed public return deadline');
    }else fail(archived||state.phase.endsAt===step.askingEndsAt,'original public asking deadline');
    fail(archived?planetFoodDeadlineAt(state)===null:Number.isSafeInteger(planetFoodDeadlineAt(state)),'finite pending work');
  }
  projectPlanetFoodPublic(state);for(const id of ids)projectPlanetFoodPlayer(state,id);
}
