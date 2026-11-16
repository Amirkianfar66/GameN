import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {foodInboxScopeKey,hasFoodWakeRecovery} from './planet-food-inbox.js';
import type {createPlanetFoodInbox,FoodInboxWakeRole} from './planet-food-inbox.js';
import type {EnqueuePlanetFoodInboxWake,PlanetFoodInboxOwner,PlanetFoodInboxScope,PlanetFoodInboxWake} from './planet-food-inbox-types.js';
import type {PlanetPersistence,PlanetReadTransaction,PlanetTransaction} from './planet-game.js';

export interface PlanetFoodInboxRoute {
  readonly scope:PlanetFoodInboxScope;
  readonly cutoverThrough:number;
  readonly bindingEpoch:number;
  readonly closedAt:number|null;
}
export interface PlanetFoodInboxAuthority {
  readonly scope:PlanetFoodInboxScope;
  readonly owner:PlanetFoodInboxOwner;
}
export type PlanetFoodInboxStep='again'|{readonly closed:boolean;readonly nextAt:number|null};
export class LostFoodInboxAuthority extends Error {}
export const foodInboxRouteKey=(matchId:string)=>'foodInboxRoute/'+matchId;
const scopedRouteKey=(scope:PlanetFoodInboxScope)=>'foodInboxScopeRoute/'+foodInboxScopeKey(scope);
const listenerGateKey=(scope:PlanetFoodInboxScope)=>'foodInboxListenerGate/'+foodInboxScopeKey(scope);
const ownerKey=(scope:PlanetFoodInboxScope)=>'foodInboxOwner/'+foodInboxScopeKey(scope);
const LEASE_MS=8_000;
// A normal 32.5 s Task fits one private invocation below the 60 s handler cap.
const MAX_WALL_MS=45_000,MAX_PASSES=1_024;
const wakeId=(parts:unknown)=>createHash('sha256').update(JSON.stringify(parts)).digest('hex');

export function createPlanetFoodInboxWorker(d:{
  store:PlanetPersistence;inbox:ReturnType<typeof createPlanetFoodInbox>;clock:()=>number;newId:()=>string;
  step:(authority:PlanetFoodInboxAuthority)=>Promise<PlanetFoodInboxStep>;
}){
  const {store,inbox,clock}=d;
  const scopeMatches=(a:PlanetFoodInboxScope,b:PlanetFoodInboxScope)=>foodInboxScopeKey(a)===foodInboxScopeKey(b);
  const route=(tx:PlanetReadTransaction,matchId:string)=>tx.get<PlanetFoodInboxRoute>(foodInboxRouteKey(matchId));
  const owner=(tx:PlanetReadTransaction,scope:PlanetFoodInboxScope)=>tx.get<PlanetFoodInboxOwner>(ownerKey(scope));
  function setRoute(tx:PlanetTransaction,current:PlanetFoodInboxRoute):void{
    tx.set(foodInboxRouteKey(current.scope.matchId),current);
    tx.set(scopedRouteKey(current.scope),current);
  }
  function stage(tx:PlanetTransaction,scope:PlanetFoodInboxScope,identity:string,wakeAt:number,
    role?:FoodInboxWakeRole):void{
    inbox.stageWake(tx,{kind:'food-inbox',id:wakeId([foodInboxScopeKey(scope),identity,wakeAt]),scope,wakeAt},role);
  }
  async function liveListener(tx:PlanetReadTransaction,scope:PlanetFoodInboxScope):Promise<PlanetFoodInboxOwner|null>{
    if(!store.watchFoodInbox)return null;
    const previous=await owner(tx,scope);
    return previous&&previous.expiresAt>clock()?previous:null;
  }
  async function needsIntakeWake(tx:PlanetReadTransaction,scope:PlanetFoodInboxScope,observed:PlanetFoodInboxOwner|null):Promise<boolean>{
    if(!observed||observed.expiresAt<=clock())return true;
    // Intake reads the generation gate, never the renewed owner record in its
    // write transaction. Claim/release advance the gate and its wake atomically.
    const gate=await tx.get<{ownerId:string;epoch:number}>(listenerGateKey(scope));
    return !gate||gate.ownerId!==observed.id||gate.epoch!==observed.epoch;
  }
  async function requireOwner(tx:PlanetReadTransaction,authority:PlanetFoodInboxAuthority):Promise<PlanetFoodInboxRoute>{
    const current=await tx.get<PlanetFoodInboxRoute>(scopedRouteKey(authority.scope));
    const stored=await owner(tx,authority.scope);
    if(!current||!scopeMatches(current.scope,authority.scope)||!stored||stored.id!==authority.owner.id
      ||stored.epoch!==authority.owner.epoch||stored.expiresAt!==authority.owner.expiresAt||stored.expiresAt<=clock())
      throw new LostFoodInboxAuthority();
    return current;
  }
  function saveAuthority(tx:PlanetTransaction,scope:PlanetFoodInboxScope,claim:PlanetFoodInboxOwner):PlanetFoodInboxAuthority{
    if(!Number.isSafeInteger(claim.epoch)||!Number.isSafeInteger(claim.expiresAt))throw new Error('Invalid Food inbox owner');
    tx.set(ownerKey(scope),claim);
    stage(tx,scope,'owner-expiry:'+claim.id,claim.expiresAt,{watchdogFor:claim.id});
    return {scope,owner:claim};
  }
  function wakeOwnerMatches(stored:FoodInboxWakeRole&{wake:PlanetFoodInboxWake},previous:PlanetFoodInboxOwner|null):boolean{
    if(stored.bootstrap===true)return previous===null;
    if(stored.continuationFor!==undefined)return previous?.id===stored.continuationFor&&previous.expiresAt===0;
    return stored.watchdogFor===undefined||previous?.id===stored.watchdogFor&&previous.expiresAt===stored.wake.wakeAt;
  }
  const repairWakes=(enqueue:EnqueuePlanetFoodInboxWake)=>inbox.repair(enqueue,async(tx,stored)=>{
    const {scope}=stored.wake;
    const current=await tx.get<PlanetFoodInboxRoute>(scopedRouteKey(scope));
    if(!current||current.closedAt!==null||!scopeMatches(current.scope,scope))return false;
    const previous=await owner(tx,scope);
    return wakeOwnerMatches(stored,previous);
  });
  async function claim(wake:PlanetFoodInboxWake,id:string):Promise<PlanetFoodInboxAuthority|null>{
    const read=store.readOnly?.bind(store)??store.transaction.bind(store);
    // Ordinary intake wakes keep their immutable read outside the claim.
    // Recoverable wakes must also check their generation inside the fence.
    const payload=await read(tx=>inbox.loadWake(tx,wake));
    if(!payload)return null;
    return store.transaction(async tx=>{
      const tracked=hasFoodWakeRecovery(payload);
      const stored=tracked?await inbox.loadWake(tx,wake):payload;
      if(!stored)return null;
      const current=await tx.get<PlanetFoodInboxRoute>(scopedRouteKey(wake.scope));
      if(!current||!scopeMatches(current.scope,wake.scope)){
        if(tracked)inbox.handleWake(tx,stored);
        return null;
      }
      const previous=await owner(tx,wake.scope);
      if(!wakeOwnerMatches(stored,previous)||stored.bootstrap===true&&current.closedAt!==null){
        if(tracked)inbox.handleWake(tx,stored);
        return null;
      }
      const at=clock();
      if(wake.wakeAt>at)throw new Error('Food inbox wake arrived before its saved time');
      if(tracked)inbox.handleWake(tx,stored);
      // A live listener either handles the input or atomically schedules the
      // next owner. A crash leaves the most recent lease-expiry wake durable.
      if(previous&&previous.expiresAt>at)return null;
      const claimed=saveAuthority(tx,wake.scope,{id,epoch:(previous?.epoch??0)+1,expiresAt:at+LEASE_MS});
      if(store.watchFoodInbox)tx.set(listenerGateKey(wake.scope),{ownerId:id,epoch:claimed.owner.epoch});
      return claimed;
    });
  }
  async function renew(authority:PlanetFoodInboxAuthority):Promise<PlanetFoodInboxAuthority>{
    return store.transaction(async tx=>{
      await requireOwner(tx,authority);
      return saveAuthority(tx,authority.scope,{...authority.owner,expiresAt:clock()+LEASE_MS});
    });
  }
  async function release(authority:PlanetFoodInboxAuthority,continues:boolean):Promise<void>{
    await store.transaction(async tx=>{
      await requireOwner(tx,authority);
      tx.set(ownerKey(authority.scope),{...authority.owner,expiresAt:0} satisfies PlanetFoodInboxOwner);
      if(store.watchFoodInbox)tx.delete(listenerGateKey(authority.scope));
      if(continues)stage(tx,authority.scope,'continued:'+authority.owner.id,clock(),{continuationFor:authority.owner.id});
    });
  }
  async function runFoodInbox(wake:PlanetFoodInboxWake):Promise<void>{
    const started=performance.now();
    let authority=await claim(wake,d.newId());
    if(!authority)return;
    let changed=false,failure:Error|null=null,wakeWaiter:(()=>void)|undefined;
    const stop=store.watchFoodInbox?.(foodInboxScopeKey(wake.scope),()=>{
      changed=true;wakeWaiter?.();
    },cause=>{failure=new Error('Food inbox listener failed',{cause});wakeWaiter?.();});
    async function wait(delay:number):Promise<void>{
      if(!changed&&failure===null&&delay>0){
        let timer:ReturnType<typeof setTimeout>|undefined;
        try{
          await new Promise<void>(resolve=>{
            wakeWaiter=resolve;
            timer=setTimeout(resolve,delay);
          });
        }finally{
          if(timer!==undefined)clearTimeout(timer);
          wakeWaiter=undefined;
        }
      }
      changed=false;
      if(failure)throw failure;
    }
    let next:PlanetFoodInboxStep='again',passes=0;
    try{
      // Ordered append, apply and renewal are all awaited on this one lane.
      // Neither a task acknowledgement nor request cleanup leaves a running loop.
      while(passes++<MAX_PASSES&&performance.now()-started<MAX_WALL_MS){
        if(failure)throw failure;
        if(authority.owner.expiresAt-clock()<=LEASE_MS/2)authority=await renew(authority);
        next=await d.step(authority);
        if(next==='again')continue;
        if(next.closed||!stop)break;
        const budget=MAX_WALL_MS-(performance.now()-started);
        const due=next.nextAt===null?Infinity:next.nextAt-clock();
        const renewAt=authority.owner.expiresAt-clock()-LEASE_MS/2;
        await wait(Math.max(0,Math.min(budget,due,renewAt)));
      }
      await release(authority,next==='again'||!!stop&&!next.closed);
    }finally{
      stop?.();
    }
  }
  return {route,setRoute,stage,requireOwner,liveListener,needsIntakeWake,readOwner:owner,ownerWatchKey:ownerKey,runFoodInbox,repairWakes};
}
