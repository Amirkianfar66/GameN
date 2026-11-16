import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {foodInboxScopeKey} from './planet-food-inbox.js';
import type {createPlanetFoodInbox} from './planet-food-inbox.js';
import type {PlanetFoodInboxOwner,PlanetFoodInboxScope,PlanetFoodInboxWake} from './planet-food-inbox-types.js';
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
export class LostFoodInboxAuthority extends Error {}
export const foodInboxRouteKey=(matchId:string)=>'foodInboxRoute/'+matchId;
const scopedRouteKey=(scope:PlanetFoodInboxScope)=>'foodInboxScopeRoute/'+foodInboxScopeKey(scope);
const ownerKey=(scope:PlanetFoodInboxScope)=>'foodInboxOwner/'+foodInboxScopeKey(scope);
const LEASE_MS=8_000;
const MAX_WALL_MS=5_000,MAX_PASSES=48;
const wakeId=(parts:unknown)=>createHash('sha256').update(JSON.stringify(parts)).digest('hex');

export function createPlanetFoodInboxWorker(d:{
  store:PlanetPersistence;inbox:ReturnType<typeof createPlanetFoodInbox>;clock:()=>number;newId:()=>string;
  step:(authority:PlanetFoodInboxAuthority)=>Promise<'again'|'idle'>;
}){
  const {store,inbox,clock}=d;
  const scopeMatches=(a:PlanetFoodInboxScope,b:PlanetFoodInboxScope)=>foodInboxScopeKey(a)===foodInboxScopeKey(b);
  const route=(tx:PlanetReadTransaction,matchId:string)=>tx.get<PlanetFoodInboxRoute>(foodInboxRouteKey(matchId));
  function setRoute(tx:PlanetTransaction,current:PlanetFoodInboxRoute):void{
    tx.set(foodInboxRouteKey(current.scope.matchId),current);
    tx.set(scopedRouteKey(current.scope),current);
  }
  function stage(tx:PlanetTransaction,scope:PlanetFoodInboxScope,identity:string,wakeAt:number,watchdogFor?:string):void{
    inbox.stageWake(tx,{kind:'food-inbox',id:wakeId([foodInboxScopeKey(scope),identity,wakeAt]),scope,wakeAt},watchdogFor);
  }
  async function requireOwner(tx:PlanetReadTransaction,authority:PlanetFoodInboxAuthority):Promise<PlanetFoodInboxRoute>{
    const current=await tx.get<PlanetFoodInboxRoute>(scopedRouteKey(authority.scope));
    const stored=await tx.get<PlanetFoodInboxOwner>(ownerKey(authority.scope));
    if(!current||!scopeMatches(current.scope,authority.scope)||!stored||stored.id!==authority.owner.id
      ||stored.epoch!==authority.owner.epoch||stored.expiresAt<=clock())throw new LostFoodInboxAuthority();
    return current;
  }
  async function claim(wake:PlanetFoodInboxWake,id:string):Promise<PlanetFoodInboxAuthority|null>{
    return store.transaction(async tx=>{
      const payload=await inbox.loadWake(tx,wake);
      if(!payload)return null;
      const current=await tx.get<PlanetFoodInboxRoute>(scopedRouteKey(wake.scope));
      if(!current||!scopeMatches(current.scope,wake.scope))return null;
      const path=ownerKey(wake.scope),previous=await tx.get<PlanetFoodInboxOwner>(path);
      if(payload.watchdogFor&&(previous?.id!==payload.watchdogFor||previous.expiresAt===0))return null;
      const at=clock();
      if(wake.wakeAt>at)throw new Error('Food inbox wake arrived before its saved time');
      if(previous&&previous.expiresAt>at)throw new Error('Food inbox wake is waiting for current ownership');
      const owner:PlanetFoodInboxOwner={id,epoch:(previous?.epoch??0)+1,expiresAt:at+LEASE_MS};
      if(!Number.isSafeInteger(owner.epoch)||!Number.isSafeInteger(owner.expiresAt))throw new Error('Invalid Food inbox owner');
      tx.set(path,owner);
      stage(tx,wake.scope,'owner-expiry:'+owner.id,owner.expiresAt,owner.id);
      return {scope:wake.scope,owner};
    });
  }
  async function release(authority:PlanetFoodInboxAuthority,continues:boolean):Promise<void>{
    await store.transaction(async tx=>{
      await requireOwner(tx,authority);
      tx.set(ownerKey(authority.scope),{...authority.owner,expiresAt:0} satisfies PlanetFoodInboxOwner);
      if(continues)stage(tx,authority.scope,'continued:'+authority.owner.id,clock());
    });
  }
  async function runFoodInbox(wake:PlanetFoodInboxWake):Promise<void>{
    const started=performance.now(),authority=await claim(wake,d.newId());
    if(!authority)return;
    let next:'again'|'idle'='again',passes=0;
    // Exceptions preserve the independent lease-expiry wake and propagate to the
    // transport's retry policy. A normal return means no work was detached.
    while(next==='again'&&passes++<MAX_PASSES&&performance.now()-started<MAX_WALL_MS)
      next=await d.step(authority);
    await release(authority,next==='again');
  }
  return {route,setRoute,stage,requireOwner,runFoodInbox};
}
