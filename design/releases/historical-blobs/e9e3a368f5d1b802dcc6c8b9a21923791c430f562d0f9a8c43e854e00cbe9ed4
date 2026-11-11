import type {PlanetRole} from '@mothership/contracts';
import type {MonotonicClock,UnresolvedCommandStore} from '../ports.js';
import type {PlanetSessionModel} from './session.js';

export const PREGAME_ASSET_VERSION='design-0.8.0';
export const PREGAME_ROLE_IDS:Readonly<Record<PlanetRole,string>>=Object.freeze({Doctor:'doctor',Insider:'insider','Blue Disabler':'blue-disabler','Red Disabler':'red-disabler',Supplier:'supplier',Engineer:'engineer',Undercover:'undercover',Hacker:'hacker',Alien:'alien'});
export interface PublicFilmMember {readonly seat:number;readonly character:string}
interface FilmBase {readonly t:number;readonly durationMs:number;readonly key:string}
export type PregameFilm=
 | FilmBase&{readonly kind:'brand'}
 | FilmBase&{readonly kind:'role';readonly role:string;readonly character:string;readonly seat:number}
 | FilmBase&{readonly kind:'boarding';readonly roster:readonly PublicFilmMember[]};
export interface PregameVisibility {readonly visible:boolean;readonly focused:boolean;readonly uid:string|null}
export interface PregameController {
 update(model:PlanetSessionModel,visibility:PregameVisibility):void;
 sample():PregameFilm|null;
 skip():void;
 suppressRolePlayback():void;
 dispose():void;
}

/** Extract exactly the public art inputs, in deterministic seat order, with no hidden fields. */
export function publicFilmRoster(model:Pick<PlanetSessionModel,'playerCount'|'members'>):readonly PublicFilmMember[]|null{
 const count=model.playerCount;if(count!==7&&count!==8&&count!==9||model.members.length!==count)return null;
 const out:PublicFilmMember[]=[],seats=new Set<number>(),characters=new Set<string>();
 for(const member of model.members){
  if(typeof member.seatId!=='string'||!/^seat-[1-9]$/.test(member.seatId)||typeof member.characterId!=='string'||!/^c[1-9]$/.test(member.characterId))return null;
  const seat=Number(member.seatId.slice(5));if(seat>count||seats.has(seat)||characters.has(member.characterId))return null;
  seats.add(seat);characters.add(member.characterId);out.push(Object.freeze({seat,character:member.characterId}));
 }
 return Object.freeze(out.sort((a,b)=>a.seat-b.seat));
}

/**
 * Presentation only. It has no service/Ready/start callback. Seen markers contain opaque audience
 * and setup identifiers, never roles, characters, captions or knowledge. Storage failure keeps the
 * ordinary role card. Refresh/recovery eligibility is decided before any private film can start.
 */
export function createPlanetPregame(clock:MonotonicClock,seenStore:UnresolvedCommandStore,{skipEntry=false,skipRoleOnEntry=false}:{readonly skipEntry?:boolean;readonly skipRoleOnEntry?:boolean}={}):PregameController{
 let model:PlanetSessionModel|null=null,visibility:PregameVisibility={visible:false,focused:false,uid:null},receivedAt=clock.now(),disposed=false;
 let active:{film:PregameFilm;started:number;binding:string}|null=null,entryConsumed=skipEntry,suppressRole=skipRoleOnEntry,storageUsable=true;
 let boardingKey:string|null=null,maxBoardingElapsed=0;
 const seen=new Set<string>(),dismissedBoarding=new Set<string>();
 try{const raw=seenStore.load();if(raw!==null){const list:unknown=JSON.parse(raw);if(!Array.isArray(list)||list.length>128||list.some(s=>typeof s!=='string'||s.length>1024))throw new Error();for(const value of list)seen.add(value as string);}}catch{storageUsable=false;}
 const remember=(key:string)=>{if(seen.has(key))return true;if(!storageUsable)return false;try{seen.add(key);while(seen.size>128)seen.delete(seen.values().next().value!);seenStore.save(JSON.stringify([...seen]));return true;}catch{storageUsable=false;seen.delete(key);return false;}};
 const safe=()=>!!model&&!disposed&&visibility.visible&&visibility.focused&&visibility.uid!==null&&model.connection==='live'&&!model.uncertain;
 const release=()=>model?.versions?.assetManifestVersion===PREGAME_ASSET_VERSION;
 const readingKey=()=>model?.matchId&&model.setup&&model.selfSeatId&&visibility.uid?JSON.stringify(['role',visibility.uid,model.matchId,model.setup.id,model.selfSeatId]):null;
 function ownFilm():{role:string;character:string;seat:number;binding:string}|null{
  if(!safe()||!model||model.status!=='reading'||!release()||!model.ownRole||!model.selfSeatId)return null;
  const role=model.ownRole.role,own=model.members.find(m=>m.seatId===model!.selfSeatId);
  if(typeof role!=='string'||!Object.hasOwn(PREGAME_ROLE_IDS,role)||!own||own.ready||typeof own.characterId!=='string'||!/^c[1-9]$/.test(own.characterId)||!/^seat-[1-9]$/.test(model.selfSeatId))return null;
  const seat=Number(model.selfSeatId.slice(5));if(model.playerCount===null||seat>model.playerCount)return null;
  return {role:PREGAME_ROLE_IDS[role],character:own.characterId,seat,binding:JSON.stringify([readingKey(),role,own.characterId])};
 }
 function sample():PregameFilm|null{
  if(!safe()||!model){active=null;return null;}
  const now=clock.now();
  if(active){
   const t=Math.max(0,now-active.started);
   if(active.film.kind==='brand'){
    if(model.matchId!==null||model.pendingAdmission||model.status!==null||t>=2000)active=null;
   }else{
    const own=ownFilm();
    if(!own||own.binding!==active.binding||t>=10000||model.remainingMs===null||model.remainingMs-(now-receivedAt)<=0)active=null;
   }
   if(active)return {...active.film,t};
  }
  if(model.status!=='boarding'||model.setupFlowVersion!==2||!release()||model.setup===null||!('startedAt' in model.setup)||model.setupClock.status!=='synced')return null;
  const {id,startedAt,endsAt}=model.setup;
  if(typeof startedAt!=='number'||!Number.isFinite(startedAt)||!Number.isFinite(endsAt)||endsAt-startedAt!==10000)return null;
  const serverNow=model.setupClock.serverNowMs+Math.max(0,now-receivedAt),uncertainty=model.setupClock.uncertaintyMs;
  if(serverNow<startedAt||serverNow+uncertainty>=endsAt)return null;
  const roster=publicFilmRoster(model);if(!roster)return null;
  const key=JSON.stringify(['boarding',model.matchId,id,startedAt,endsAt]);
  if(boardingKey!==key){boardingKey=key;maxBoardingElapsed=0;}
  if(seen.has(key)||dismissedBoarding.has(key))return null;
  maxBoardingElapsed=Math.max(maxBoardingElapsed,serverNow-startedAt);
  return {kind:'boarding',key,t:maxBoardingElapsed,durationMs:10000,roster};
 }
 return {
  update(next,nextVisibility){
   if(disposed)return;
   const prior=visibility;model=next;visibility=nextVisibility;receivedAt=clock.now();
   if(!safe()){if(active?.film.kind==='brand'||next.matchId!==null||next.uncertain||next.pendingAdmission)entryConsumed=true;active=null;return;}
   if(prior.uid!==null&&prior.uid!==visibility.uid){active=null;suppressRole=true;}
   if(!entryConsumed){
    entryConsumed=true;
    if(model.matchId===null&&model.status===null&&!model.pendingAdmission)active={film:{kind:'brand',key:'entry',t:0,durationMs:2000},started:clock.now(),binding:'entry'};
   }
   if(model.status!=='reading'){
    if(active?.film.kind==='role')active=null;
   }else if(!active){
    const own=ownFilm(),key=readingKey(),time=model.setupClock;
    if(own&&key&&!seen.has(key)&&!suppressRole&&time.status==='synced'&&model.remainingMs!==null&&model.remainingMs-time.uncertaintyMs>=10000&&remember(key)){
     active={film:{kind:'role',key,t:0,durationMs:10000,role:own.role,character:own.character,seat:own.seat},started:clock.now(),binding:own.binding};
    }
   }
   sample();
  },sample,
  skip(){const film=sample();if(film?.kind==='boarding'){dismissedBoarding.add(film.key);remember(film.key);}active=null;},
  suppressRolePlayback(){suppressRole=true;active=null;},
  dispose(){disposed=true;model=null;active=null;seen.clear();dismissedBoarding.clear();boardingKey=null;},
 };
}
