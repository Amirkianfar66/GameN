import {createHash} from 'node:crypto';
import type {PlanetPersistence,PlanetReadTransaction,PlanetTransaction} from './planet-game.js';
import type {
  EnqueuePlanetFoodInboxWake,PlanetFoodInboxBinding,PlanetFoodInboxIntent,PlanetFoodInboxProgress,PlanetFoodInboxRequest,
  PlanetFoodInboxScope,PlanetFoodInboxWake,PlanetFoodIntakeReceipt,
} from './planet-food-inbox-types.js';

const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const foodInboxScopeKey=({version,matchId,phaseId,taskId}:PlanetFoodInboxScope)=>
  hash([version,matchId,phaseId,taskId]);
const intentKey=(scopeKey:string,id:string)=>`foodInboxIntent/${scopeKey}/${id}`;
const progressKey=(scopeKey:string,id:string)=>`foodInboxProgress/${scopeKey}/${id}`;
type StoredWake={wake:PlanetFoodInboxWake;status:'pending'|'dispatched';nextAttemptAt:number;watchdogFor?:string};
const wakeKey=(id:string)=>`foodInboxWake/${id}`;

// Contract-parsed orders may differ after transport retries. Arrays retain order.
function canonical(value:unknown):unknown{
  if(Array.isArray(value))return value.map(canonical);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0)
    .map(([key,item])=>[key,canonical(item)]));
}
function deepFreeze<T>(value:T):T{
  if(value&&typeof value==='object'){
    for(const child of Object.values(value))deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export class PlanetFoodInboxConflict extends Error {
  constructor(){super('The original Food inbox intent differs.');}
}

/** One trusted, immutable intent for a stable original. Each heartbeat uses its own ID. */
export function createFoodInboxIntent(scope:PlanetFoodInboxScope,binding:PlanetFoodInboxBinding,
  request:PlanetFoodInboxRequest,original:string):PlanetFoodInboxIntent{
  const id=hash([foodInboxScopeKey(scope),binding.uid,binding.seatId,binding.revision,request.operation,original]);
  return deepFreeze(structuredClone({id,scope,binding,request,fingerprint:hash(canonical(request))}));
}

export function createPlanetFoodInbox(store:PlanetPersistence){
  const first=store.nextFoodInboxIntent?.bind(store);
  if(!first)throw new Error('Food inbox pending index is required');
  const read=store.readOnly?.bind(store)??store.transaction.bind(store);
  async function loadWake(tx:PlanetReadTransaction,wake:PlanetFoodInboxWake):Promise<StoredWake|null>{
    const stored=await tx.get<StoredWake>(wakeKey(wake.id));
    if(!stored||stored.wake.id!==wake.id||stored.wake.wakeAt!==wake.wakeAt
      ||foodInboxScopeKey(stored.wake.scope)!==foodInboxScopeKey(wake.scope))return null;
    return stored;
  }
  function stageWake(tx:PlanetTransaction,wake:PlanetFoodInboxWake,watchdogFor?:string):void{
    if(!tx.create)throw new Error('Atomic Food inbox wake is required');
    tx.create(wakeKey(wake.id),{wake,status:'pending',nextAttemptAt:0,...(watchdogFor?{watchdogFor}:{})} satisfies StoredWake);
  }
  function stageIntake(tx:PlanetTransaction,intent:PlanetFoodInboxIntent,wakeAt:number,wakeRequired=true):void{
    if(!tx.create||!tx.foodInboxIndex)throw new Error('Atomic Food inbox intake is required');
    const scopeKey=foodInboxScopeKey(intent.scope);
    const wake:PlanetFoodInboxWake={kind:'food-inbox',id:intent.id,scope:intent.scope,wakeAt};
    tx.create(intentKey(scopeKey,intent.id),intent);
    if(wakeRequired)stageWake(tx,wake);
    tx.foodInboxIndex.create(scopeKey,intent.id);
  }
  async function intake(intent:PlanetFoodInboxIntent,wakeAt:number,
    verify?:(tx:PlanetReadTransaction)=>Promise<boolean>):Promise<PlanetFoodIntakeReceipt>{
    try{
      await store.transaction(async tx=>{
        const wakeRequired=verify?await verify(tx):true;
        stageIntake(tx,intent,wakeAt,wakeRequired);
      });
      return {kind:'queued',id:intent.id,duplicate:false};
    }catch(error){
      // The same read recovers a duplicate or a lost commit response. It never
      // turns a different original or a missing write into a success.
      const saved=await read(async tx=>{
        if(verify)await verify(tx);
        return tx.get<PlanetFoodInboxIntent>(intentKey(foodInboxScopeKey(intent.scope),intent.id));
      });
      if(!saved)throw error;
      if(saved.id!==intent.id||foodInboxScopeKey(saved.scope)!==foodInboxScopeKey(intent.scope)
        ||saved.fingerprint!==intent.fingerprint)throw new PlanetFoodInboxConflict();
      return {kind:'queued',id:intent.id,duplicate:true};
    }
  }
  async function next(scope:PlanetFoodInboxScope):Promise<PlanetFoodInboxIntent|null>{
    const scopeKey=foodInboxScopeKey(scope),id=await first!(scopeKey);
    if(!id)return null;
    const row=await read(tx=>tx.get<PlanetFoodInboxIntent>(intentKey(scopeKey,id)));
    if(!row||row.id!==id||foodInboxScopeKey(row.scope)!==scopeKey)throw new Error('Invalid Food inbox pending intent');
    return row;
  }
  function progress(tx:PlanetReadTransaction,intent:PlanetFoodInboxIntent){
    return tx.get<PlanetFoodInboxProgress>(progressKey(foodInboxScopeKey(intent.scope),intent.id));
  }
  function consume(tx:PlanetTransaction,intent:PlanetFoodInboxIntent,result:PlanetFoodInboxProgress):void{
    if(!tx.foodInboxIndex||!tx.create)throw new Error('Atomic Food inbox consumption is required');
    const scopeKey=foodInboxScopeKey(intent.scope);
    // A second owner cannot replace an existing consumption marker. The caller
    // writes the original ordered append or rejection in this transaction.
    tx.create(progressKey(scopeKey,intent.id),result);
    tx.foodInboxIndex.delete(scopeKey,intent.id);
  }
  async function dispatch(id:string,enqueue:EnqueuePlanetFoodInboxWake):Promise<boolean>{
    const path=wakeKey(id),stored=await read(tx=>tx.get<StoredWake>(path));
    if(!stored||stored.status!=='pending')return false;
    if(stored.wake.id!==id)throw new Error('Food inbox wake identity mismatch');
    // A missing or inconclusive external acknowledgement leaves a durable wake.
    await enqueue(stored.wake);
    await store.transaction(async tx=>{
      const current=await tx.get<StoredWake>(path);
      if(current?.status==='pending')tx.set(path,{...current,status:'dispatched'} satisfies StoredWake);
    });
    return true;
  }
  async function repair(enqueue:EnqueuePlanetFoodInboxWake,clock:()=>number):Promise<{dispatched:number;failed:number}>{
    const counts={dispatched:0,failed:0};
    for(const path of await store.listKeys('foodInboxWake',100)){
      const due=await read(tx=>tx.get<StoredWake>(path));
      if(!due||due.status!=='pending'||due.nextAttemptAt>clock())continue;
      try{
        if(await dispatch(due.wake.id,enqueue))counts.dispatched++;
      }catch{
        counts.failed++;
        await store.transaction(async tx=>{
          const current=await tx.get<StoredWake>(path);
          if(current?.status==='pending')tx.set(path,{...current,nextAttemptAt:clock()+5_000} satisfies StoredWake);
        });
      }
    }
    return counts;
  }
  return {intake,stageIntake,stageWake,loadWake,next,progress,consume,dispatch,repair};
}
