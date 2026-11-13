import {FoodTaskCommandRequestSchema, foodTaskHoldRelease, foodTaskRevisionBody, parseFoodTaskView, parseFoodTaskReceipt,TimestampSchema} from '@mothership/contracts';
import type {FoodTaskCommand, FoodTaskCommandRequest, FoodTaskParticipant, FoodTaskPlayerView, FoodTaskReceipt, FoodTaskVersions, SeatId} from '@mothership/contracts';
import type {ClientPorts, IdSource, UnresolvedCommandStore} from '../ports.js';
import type {ClockReading} from '../clock/server-clock.js';
import {FOOD_RECOVERY_LIMIT, foodStoredRequest, readFoodRecovery, readFoodRecoveryReceipt} from './food-recovery.js';
import type {FoodBinding, FoodContactMemory, FoodStoredRequest} from './food-recovery.js';

export type FoodReceiptContext = Pick<FoodTaskCommandRequest,'schemaVersion'|'protocolVersion'|'matchId'|'phaseId'|'foodStepId'|'round'|'commandId'>;
export interface FoodTaskTransport {
 currentUid():string|null;
 command(request:FoodTaskCommandRequest):Promise<{readonly receipt:unknown;readonly serverTimeMs:number}|null>;
 receipt(context:FoodReceiptContext):Promise<{readonly receipt:unknown|null;readonly serverTimeMs:number}|null>;
 refresh():void;
}
export interface FoodTaskPorts extends ClientPorts {readonly ids:IdSource;readonly recovery:UnresolvedCommandStore}
export interface FoodSnapshotContext {readonly matchId:string;readonly versions:FoodTaskVersions;readonly phaseId:string;readonly round:number;readonly serverNowMs:number}
export type FoodPressName = 'Hold'|'let-go'|'LOCK'|'RELEASE'|'key'|'request'|'Join'|'Decline'|'Cancel';
export interface FoodFeedback {readonly commandId:string;readonly name:FoodPressName;readonly status:'sending'|'unknown'|'accepted'|'rejected';readonly receipt:FoodTaskReceipt|null;readonly recovered:boolean}
export interface FoodTaskModel {
 readonly visible:boolean;readonly fresh:boolean;readonly message:string|null;readonly view:FoodTaskPlayerView|null;
 readonly clock:ClockReading;readonly feedback:FoodFeedback|null;readonly pendingCount:number;
 readonly canAsk:boolean;readonly canAnswer:boolean;readonly canWithdraw:boolean;
 readonly canHold:boolean;readonly canPanelRelease:boolean;readonly canPanelLock:boolean;readonly canKey:boolean;
 readonly physicalHolding:boolean;readonly needsContactOff:boolean;readonly canCheck:boolean;
}
export interface FoodTaskController {
 observe(value:unknown,context:FoodSnapshotContext,fresh?:boolean):boolean;
 getModel():FoodTaskModel;subscribe(listener:(model:FoodTaskModel)=>void):()=>void;
 ask(partnerSeatId:SeatId):Promise<void>;answer(answer:'JOIN'|'DECLINE'):Promise<void>;withdraw():Promise<void>;
 press(input:'PANEL_RELEASE'|'PANEL_LOCK'|'KEY'):Promise<void>;
 holdDown():boolean;holdUp():void;recoverOff():Promise<void>;
 checkReceipts():Promise<void>;retry():Promise<void>;
 setVisible(visible:boolean):void;disconnect(kind?:'network'|'authorization'):void;dispose():void;
}
interface Entry {original:FoodStoredRequest;request:FoodTaskCommandRequest|null;status:'sending'|'unknown'|'checking';order:number;closedByRecovery:boolean;observedRevision:number}
const isHold=(q:FoodStoredRequest)=>q.command.type==='TASK_PRESS'&&q.command.input.kind==='HOLD';
function pressName(q:FoodStoredRequest):FoodPressName {
 const c=q.command;
 if(c.type==='TASK_ASK')return 'request';
 if(c.type==='TASK_ANSWER')return c.answer==='JOIN'?'Join':'Decline';
 if(c.type==='TASK_ASK_WITHDRAW')return 'Cancel';
 return c.input.kind==='HOLD'?c.input.edge==='DOWN'?'Hold':'let-go':c.input.kind==='HOLD_RECOVER_OFF'?'let-go':c.input.kind==='KEY'?'key':c.input.kind==='PANEL_LOCK'?'LOCK':'RELEASE';
}

/** Own-seat Food consumer. Views decide effects; receipts decide only the fate
 * of their original input. Its release lane is independent of ordinary input. */
export function createFoodTaskController(transport:FoodTaskTransport,ports:FoodTaskPorts,
 options:{readonly binding:FoodBinding;readonly readClock:()=>ClockReading}):FoodTaskController {
 const {binding}=options,listeners=new Set<(model:FoodTaskModel)=>void>(),entries:Entry[]=[];
 let view:FoodTaskPlayerView|null=null,context:FoodSnapshotContext|null=null,visible=true,fresh=false,displayable=false,disposed=false,storageBlocked=false;
 let message:string|null=null,contact:FoodContactMemory|null=null,down:FoodTaskCommandRequest|null=null;
 let feedback:FoodFeedback|null=null,feedbackOrder=-1,order=0,checking:Promise<void>|null=null,recovering=false;
 let accepted:{phaseId:string;revision:number}|null=null;
 const finishes=new Set<()=>void>();
 const auth=()=>!disposed&&transport.currentUid()===binding.uid;
 const time=()=>options.readClock();
 const shown=()=>visible&&displayable&&auth()&&view!==null;
 const live=()=>{const r=time();return shown()&&fresh&&r.status==='synced'
  &&(view?.step===null||view?.step!==undefined&&r.serverNowMs-r.uncertaintyMs>=view.step.startedAt);};
 const task=():FoodTaskParticipant|null=>view?.participantTask??null;
 const sameContact=(t:FoodTaskParticipant)=>contact?.taskId===t.taskId&&contact.controlSessionId===t.controlSessionId;
 const taskOpen=()=>{
  const t=task(),r=time();return live()&&t!==null&&t.stage!=='ENDED'&&t.people.some(p=>p.seatId===binding.seatId&&p.alive)
   &&r.status==='synced'&&r.serverNowMs+r.uncertaintyMs<t.deadlineAt;
 };
 const pending=()=>entries.some(e=>!e.closedByRecovery&&e.original.phaseId===view?.phaseId);
 const base=()=>live()&&!storageBlocked&&!pending()&&!(accepted&&accepted.phaseId===view?.phaseId&&view.viewRevision<=accepted.revision)&&entries.length<FOOD_RECOVERY_LIMIT-2;
 const pressOffer=()=>view?.offers.find(o=>o.type==='TASK_PRESS');
 const offered=(kind:'HOLD'|'PANEL_RELEASE'|'PANEL_LOCK'|'KEY')=>{const r=time();return base()&&taskOpen()&&!!pressOffer()?.inputs.includes(kind)
  &&(kind==='HOLD'||r.status==='synced'&&r.serverNowMs-r.uncertaintyMs>=task()!.runningAt);};
 const orphan=()=>!!task()?.ownGesture&&(task()!.ownGesture!.currentHolder!==null||task()!.ownGesture!.pendingIntent!==null)&&down===null;
 const emit=()=>{if(!disposed)for(const listener of listeners)listener(getModel());};
 function save():boolean {
  try{
   if(entries.length===0&&contact===null)ports.recovery.clear();
   else ports.recovery.save(JSON.stringify({schemaVersion:1,ownerUid:binding.uid,matchId:binding.matchId,seatId:binding.seatId,entries:entries.map(e=>e.original),contact}));
   return true;
  }catch{storageBlocked=true;message='Command recovery could not be saved. Reconnect this seat.';return false;}
 }
 try{
  const raw=ports.recovery.load();
  if(raw!==null){const saved=readFoodRecovery(raw,binding);contact=saved.contact;
   for(const original of saved.entries)entries.push({original,request:null,status:'unknown',order:++order,closedByRecovery:false,observedRevision:-1});
   if(entries.length){const e=entries.at(-1)!;feedback={commandId:e.original.commandId,name:pressName(e.original),status:'unknown',receipt:null,recovered:false};feedbackOrder=e.order;}}
 }catch{storageBlocked=true;message='Command recovery could not be verified. Reconnect the original seat.';}
 function getModel():FoodTaskModel {
  const open=shown(),r=time(),v=open?view:null,now=r.status==='synced'?r.serverNowMs+r.uncertaintyMs:Infinity;
  const invite=v?.invitation;
  return {visible:visible&&auth(),fresh:open&&fresh,message,view:v,clock:open?r:{status:'unsynced'},feedback:visible&&auth()?feedback:null,pendingCount:entries.length,
   canAsk:base()&&v?.step?.kind==='ASKING'&&now<v.step.askingEndsAt&&v.ownAvailability.canAsk,
   canAnswer:base()&&!!invite&&now<invite.answerEndsAt&&!!v?.offers.some(o=>o.type==='TASK_ANSWER'),
   canWithdraw:base()&&!!invite&&now<invite.answerEndsAt&&!!v?.offers.some(o=>o.type==='TASK_ASK_WITHDRAW'),
   canHold:offered('HOLD')&&down===null&&!orphan(),canPanelRelease:offered('PANEL_RELEASE'),canPanelLock:offered('PANEL_LOCK'),canKey:offered('KEY'),
   physicalHolding:down!==null,needsContactOff:open&&orphan(),canCheck:visible&&auth()&&entries.some(e=>e.status==='unknown')};
 }
 function bounded<T>(run:()=>Promise<T>):Promise<T|null>{
  return new Promise(resolve=>{
   let done=false;const finish=(value:T|null)=>{if(done)return;done=true;ports.scheduler.clearTimeout(timer);finishes.delete(cancel);resolve(value);};
   const cancel=()=>finish(null),timer=ports.scheduler.setTimeout(cancel,8000);finishes.add(cancel);
   // Invoke now: a causal UP reaches the authenticated transport before conceal.
   try{run().then(finish,()=>finish(null));}catch{finish(null);}
  });
 }
 function request(command:FoodTaskCommand):FoodTaskCommandRequest {
  if(!view?.step)throw TypeError('No authorized Food step');
  return FoodTaskCommandRequestSchema.parse({schemaVersion:1,protocolVersion:3,matchId:binding.matchId,
   commandId:ports.ids.next(),phaseId:view.phaseId,foodStepId:view.step.stepId,round:view.round,command});
 }
 function announce(e:Entry,status:FoodFeedback['status'],receipt:FoodTaskReceipt|null=null,recovered=false){
  if(e.order<feedbackOrder)return;feedbackOrder=e.order;feedback={commandId:e.original.commandId,name:pressName(e.original),status,receipt,recovered};
 }
 function settle(e:Entry,payload:unknown,serverTimeMs:number,recovered=false){
  if(!auth()||!entries.includes(e))return;
  try{
   const receipt=e.request?parseFoodTaskReceipt(payload,e.request,binding.seatId):readFoodRecoveryReceipt(payload,e.original,binding.seatId);
   if(!TimestampSchema.safeParse(serverTimeMs).success||receipt&&receipt.receivedAt>serverTimeMs)throw TypeError('Invalid original receipt time');
   if(receipt===null){e.status='unknown';announce(e,'unknown');save();emit();return;}
   if(receipt.status==='accepted'&&receipt.result.kind==='INPUT'&&receipt.result.effect==='RECOVERED_CLOSED'){
    const q=e.original.command,through=receipt.result.closedThroughSequence!;
    if(q.type==='TASK_PRESS')for(const old of entries){const c=old.original.command;
     if(c.type==='TASK_PRESS'&&c.taskId===q.taskId&&c.controlSessionId===q.controlSessionId&&c.input.kind==='HOLD'&&c.input.gestureSequence<=through)old.closedByRecovery=true;}
   }
   if(receipt.status==='accepted'&&!isHold(e.original)&&!(e.original.command.type==='TASK_PRESS'&&e.original.command.input.kind==='HOLD_RECOVER_OFF')
    &&(receipt.result.kind==='REQUEST'||receipt.result.effect==='APPLIED')&&view?.phaseId===e.original.phaseId){
    const c=e.original.command,stillOffered=view.offers.some(o=>o.type===c.type&&(o.type!=='TASK_PRESS'||c.type==='TASK_PRESS'&&o.controlRevision===c.expectedControlRevision)
     &&(o.type!=='TASK_ANSWER'&&o.type!=='TASK_ASK_WITHDRAW'||'requestId' in c&&o.requestId===c.requestId&&o.requestRevision===c.requestRevision));
    if(e.observedRevision>=0||stillOffered)accepted={phaseId:e.original.phaseId,revision:e.observedRevision>=0?e.observedRevision:view.viewRevision};
   }
   entries.splice(entries.indexOf(e),1);announce(e,receipt.status==='accepted'?'accepted':'rejected',receipt,recovered);save();
   transport.refresh();emit();
  }catch{e.status='unknown';message='The original command answer could not be verified.';announce(e,'unknown');save();emit();}
 }
 async function send(e:Entry){
  if(!auth()||e.request===null)return;
  e.status='sending';announce(e,'sending');emit();
  const answer=await bounded(()=>transport.command(structuredClone(e.request!)));
  if(!auth())return;
  if(!answer||!Number.isFinite(answer.serverTimeMs)){e.status='unknown';announce(e,'unknown');save();emit();return;}
  settle(e,answer.receipt,answer.serverTimeMs);
 }
 function enqueue(q:FoodTaskCommandRequest,release=false):Promise<void> {
  if(!auth()||entries.length>=FOOD_RECOVERY_LIMIT&&!release)return Promise.resolve();
  const e:Entry={original:foodStoredRequest(q),request:q,status:'sending',order:++order,closedByRecovery:false,observedRevision:view?.viewRevision??-1};entries.push(e);
  // A storage failure closes new inputs. An already-held finger still releases.
  if(!save()&&!release){entries.splice(entries.indexOf(e),1);emit();return Promise.resolve();}
  return send(e);
 }
 async function checkReceipts(){
  if(checking)return checking;if(!auth()||!visible)return;
  checking=(async()=>{
   for(const e of [...entries]){
    if(!auth()||!visible)break;if(e.status!=='unknown')continue;e.status='checking';emit();
    const q=e.original,receiptContext:FoodReceiptContext={schemaVersion:q.schemaVersion,protocolVersion:q.protocolVersion,matchId:q.matchId,
     phaseId:q.phaseId,foodStepId:q.foodStepId,round:q.round,commandId:q.commandId};
    const answer=await bounded(()=>transport.receipt(receiptContext));
    if(!auth())break;
    if(answer&&Number.isFinite(answer.serverTimeMs))settle(e,answer.receipt,answer.serverTimeMs,true);
    else {e.status='unknown';announce(e,'unknown');emit();}
   }
  })().finally(()=>{checking=null;});return checking;
 }
 async function recoverOff(){
  if(recovering||!auth()||!visible||down!==null)return;recovering=true;
  try{
   await checkReceipts();const t=task();
   if(!taskOpen()||!t?.ownGesture||!sameContact(t)||!contact?.offObserved)return;
   if(entries.some(e=>e.original.command.type==='TASK_PRESS'&&e.original.command.input.kind==='HOLD_RECOVER_OFF'&&!e.closedByRecovery))return;
   const through=Math.max(t.ownGesture.highestSequence,contact.highestSequence);
   const uncertain=entries.some(e=>{const c=e.original.command;return !e.closedByRecovery&&c.type==='TASK_PRESS'&&c.taskId===t.taskId&&c.controlSessionId===t.controlSessionId&&isHold(e.original);});
   if(!t.ownGesture.currentHolder&&!t.ownGesture.pendingIntent&&!uncertain)return;
   await enqueue(request({type:'TASK_PRESS',taskId:t.taskId,controlSessionId:t.controlSessionId,expectedControlRevision:t.controlRevision,
    input:{kind:'HOLD_RECOVER_OFF',recoveryRevision:t.ownGesture.recoveryRevision,throughSequence:through}}),true);
  }finally{recovering=false;}
 }
 function holdDown():boolean {
  const t=task();if(!getModel().canHold||!t?.ownGesture)return false;
  const highest=Math.max(t.ownGesture.highestSequence,sameContact(t)?contact!.highestSequence:0);
  if(highest>=Number.MAX_SAFE_INTEGER)return false;
  const q=request({type:'TASK_PRESS',taskId:t.taskId,controlSessionId:t.controlSessionId,expectedControlRevision:t.controlRevision,
   input:{kind:'HOLD',edge:'DOWN',gestureSequence:highest+1,crateId:pressOffer()!.crateId}});
  contact={phaseId:q.phaseId,foodStepId:q.foodStepId,round:q.round,taskId:t.taskId,controlSessionId:t.controlSessionId,highestSequence:highest+1,offObserved:false};
  down=q;void enqueue(q);return true;
 }
 function holdUp(){
  const q=down;down=null;
  const t=task();
  if(!contact&&t?.ownGesture&&context)contact={phaseId:context.phaseId,foodStepId:t.foodStepId,round:t.round,taskId:t.taskId,
   controlSessionId:t.controlSessionId,highestSequence:t.ownGesture.highestSequence,offObserved:true};
  else if(contact)contact={...contact,offObserved:true};
  save();
  if(q){const up=foodTaskHoldRelease(q,ports.ids.next());void enqueue(up,true);}
  else void recoverOff();
  emit();
 }
 const controller:FoodTaskController={
  observe(payload,nextContext,isFresh=true){
   if(disposed||!visible||!auth()){fresh=false;displayable=false;emit();return false;}
   if(!isFresh){fresh=false;displayable=false;emit();return false;}
   try{
    const next=parseFoodTaskView(payload,{...nextContext,seatId:binding.seatId});
    if(next.audience!=='player'||next.matchId!==binding.matchId)throw TypeError('Wrong Food audience');
    if(view&&(next.viewRevision<view.viewRevision||next.round<view.round||JSON.stringify(next.versions)!==JSON.stringify(view.versions)
     ||next.viewRevision===view.viewRevision&&JSON.stringify(foodTaskRevisionBody(next))!==JSON.stringify(foodTaskRevisionBody(view))))throw TypeError('Conflicting Food revision');
    const old=task();
    if(old&&next.participantTask?.taskId===old.taskId&&(next.participantTask.controlSessionId!==old.controlSessionId
     ||next.participantTask.selfControl!==old.selfControl||JSON.stringify(next.participantTask.participantSeatIds)!==JSON.stringify(old.participantSeatIds)
     ||next.participantTask.startedAt!==old.startedAt||next.participantTask.runningAt!==old.runningAt||next.participantTask.deadlineAt!==old.deadlineAt
     ||next.participantTask.returnsAt!==old.returnsAt))throw TypeError('Changed Task assignment or interval');
    if(old&&next.participantTask?.taskId===old.taskId&&(old.outcome&&JSON.stringify(old.outcome)!==JSON.stringify(next.participantTask.outcome)
     ||old.people.some(p=>p.death&&JSON.stringify(next.participantTask!.people.find(n=>n.seatId===p.seatId)?.death)!==JSON.stringify(p.death))))throw TypeError('Changed terminal Task fact');
    view=next;context=nextContext;fresh=true;displayable=true;message=storageBlocked?message:null;
    if(accepted&&(accepted.phaseId!==next.phaseId||next.viewRevision>accepted.revision))accepted=null;
    if(contact&&next.participantTask&&!sameContact(next.participantTask)&&down===null)contact=null;
    emit();if(contact?.offObserved)void recoverOff();return true;
   }catch{fresh=false;displayable=false;message='This Food view could not be verified.';emit();return false;}
  },getModel,subscribe(listener){listeners.add(listener);listener(getModel());return()=>listeners.delete(listener);},
  async ask(partnerSeatId){if(!getModel().canAsk||!view?.offers.some(o=>o.type==='TASK_ASK'&&o.partnerSeatIds.includes(partnerSeatId)))return;await enqueue(request({type:'TASK_ASK',partnerSeatId}));},
  async answer(answer){const r=view?.invitation;if(!getModel().canAnswer||!r)return;await enqueue(request({type:'TASK_ANSWER',requestId:r.requestId,requestRevision:r.revision,answer}));},
  async withdraw(){const r=view?.invitation;if(!getModel().canWithdraw||!r)return;await enqueue(request({type:'TASK_ASK_WITHDRAW',requestId:r.requestId,requestRevision:r.revision}));},
  async press(input){const m=getModel(),t=task();if(!t||!(input==='KEY'?m.canKey:input==='PANEL_LOCK'?m.canPanelLock:m.canPanelRelease))return;
   await enqueue(request({type:'TASK_PRESS',taskId:t.taskId,controlSessionId:t.controlSessionId,expectedControlRevision:t.controlRevision,input:{kind:input}}));},
  holdDown,holdUp,recoverOff,checkReceipts,
  async retry(){if(!visible||!auth())return;const e=[...entries].reverse().find(e=>e.status==='unknown'&&e.request
   &&!(e.request.command.type==='TASK_PRESS'&&e.request.command.input.kind==='HOLD'&&e.request.command.input.edge==='DOWN'));
   if(e)await send(e);},
  setVisible(next){if(disposed||next===visible)return;if(!next)holdUp();visible=next;fresh=false;displayable=false;emit();},
  disconnect(kind='network'){fresh=false;if(kind==='authorization')displayable=false;emit();},
  dispose(){if(disposed)return;holdUp();disposed=true;for(const finish of [...finishes])finish();listeners.clear();view=null;down=null;},
 };
 return controller;
}
