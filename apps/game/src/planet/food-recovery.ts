import {FoodTaskCommandRequestSchema, parseFoodTaskReceipt, IdentifierSchema} from '@mothership/contracts';
import type {FoodTaskCommandRequest, FoodTaskReceipt, SeatId} from '@mothership/contracts';

export interface FoodBinding {readonly uid:string; readonly matchId:string; readonly seatId:SeatId}
export type FoodStoredRequest = Omit<FoodTaskCommandRequest,'command'> & {
 readonly command: FoodTaskCommandRequest['command'] | {readonly type:'TASK_ASK'};
};
export interface FoodContactMemory {
 readonly phaseId:string; readonly foodStepId:string; readonly round:number;
 readonly taskId:string; readonly controlSessionId:string;
 readonly highestSequence:number; readonly offObserved:boolean;
}
export interface FoodRecoveryData {
 readonly schemaVersion:1; readonly ownerUid:string; readonly matchId:string; readonly seatId:SeatId;
 readonly entries:readonly FoodStoredRequest[]; readonly contact:FoodContactMemory|null;
}
export const FOOD_RECOVERY_LIMIT = 8;
const keys=(value:object)=>Object.keys(value).sort().join(',');
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const revision=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;

/** Only command identity/correlation metadata; an Ask's selected player never enters storage. */
export function foodStoredRequest(q:FoodTaskCommandRequest):FoodStoredRequest {
 return q.command.type==='TASK_ASK'?{...q,command:{type:'TASK_ASK'}}:structuredClone(q);
}
function structuralRequest(value:unknown):FoodTaskCommandRequest {
 if(!object(value)||!object(value.command))throw TypeError('Invalid Food recovery');
 const command=value.command;
 if(command.type==='TASK_ASK'){
  if(keys(command)!=='type')throw TypeError('Ask recovery contains a private target');
  // The receipt parser never reads Ask's target. This placeholder validates only
  // its envelope/family and is never exposed as a command or sent to a transport.
  return FoodTaskCommandRequestSchema.parse({...value,command:{type:'TASK_ASK',partnerSeatId:'seat-1'}});
 }
 return FoodTaskCommandRequestSchema.parse(value);
}
export function readFoodRecovery(raw:string,binding:FoodBinding):FoodRecoveryData {
 if(raw.length>32_768)throw TypeError('Food recovery exceeds its bound');
 const value:unknown=JSON.parse(raw);
 if(!object(value)||keys(value)!=='contact,entries,matchId,ownerUid,schemaVersion,seatId'
  ||value.schemaVersion!==1||value.ownerUid!==binding.uid||value.matchId!==binding.matchId||value.seatId!==binding.seatId
  ||!Array.isArray(value.entries)||value.entries.length>FOOD_RECOVERY_LIMIT)throw TypeError('Food recovery audience mismatch');
 const entries=value.entries.map(v=>foodStoredRequest(structuralRequest(v)));
 if(entries.some(q=>q.matchId!==binding.matchId)||new Set(entries.map(q=>q.commandId)).size!==entries.length)throw TypeError('Food recovery identity mismatch');
 let contact:FoodContactMemory|null=null;
 if(value.contact!==null){
  const c=value.contact;
  if(!object(c)||keys(c)!=='controlSessionId,foodStepId,highestSequence,offObserved,phaseId,round,taskId'
   ||!revision(c.highestSequence)||typeof c.offObserved!=='boolean'||!Number.isSafeInteger(c.round)||Number(c.round)<1
   ||['phaseId','foodStepId','taskId','controlSessionId'].some(k=>!IdentifierSchema.safeParse(c[k]).success))throw TypeError('Invalid Food contact recovery');
  contact={phaseId:c.phaseId as string,foodStepId:c.foodStepId as string,round:c.round as number,
   taskId:c.taskId as string,controlSessionId:c.controlSessionId as string,highestSequence:c.highestSequence,offObserved:c.offObserved};
 }
 return {schemaVersion:1,ownerUid:binding.uid,matchId:binding.matchId,seatId:binding.seatId,entries,contact};
}
export function readFoodRecoveryReceipt(value:unknown,original:FoodStoredRequest,seatId:SeatId):FoodTaskReceipt|null {
 return parseFoodTaskReceipt(value,structuralRequest(original),seatId);
}
