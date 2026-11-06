import {CrewDisplayNameSchema,IdentifierSchema,PlanetServiceRequestSchema,PlanetSessionSnapshotSchema,PlanetRecoveryResultSchema,TimestampSchema} from '@mothership/contracts';
import type {PlanetServiceRequest,PlanetSessionSnapshot} from '@mothership/contracts';
import type {PlayerPorts,UnresolvedCommandStore} from '../ports.js';
import {createServerClock} from '../clock/server-clock.js';
import {planetSupportsAssets} from '@mothership/presentation';
import type {PlanetTransport,PlanetSnapshot} from './transport.js';

export interface PlanetServiceConnection {
 readonly mode:'authenticated'|'synthetic';
 currentUid():string|null;
 signIn():Promise<string>;
 /** Integration supplies the authenticated planetApi request; no UID is accepted in its body. */
 request(request:PlanetServiceRequest):Promise<unknown>;
 dispose?():Promise<void>;
}
type SessionAction=Exclude<PlanetServiceRequest,{operation:'read'|'command'|'receipt'}>;
export type PlanetSessionAction=SessionAction extends infer R ? R extends {requestId:string} ? Omit<R,'requestId'> : R : never;
export interface PlanetSessionModel {
 readonly mode:PlanetServiceConnection['mode'];readonly connection:'connecting'|'live'|'stale'|'error';readonly message:string|null;
 readonly matchId:string|null;readonly roomCode:string|null;readonly status:PlanetSessionSnapshot['status']|null;
 readonly versions:PlanetSessionSnapshot['versions']|null;
 readonly isHost:boolean;readonly selfSeatId:PlanetSessionSnapshot['selfSeatId'];readonly playerCount:7|8|9|null;
 readonly members:PlanetSessionSnapshot['members'];readonly pendingAdmissions:PlanetSessionSnapshot['pendingAdmissions'];
 readonly remainingMs:number|null;readonly canChoose:boolean;readonly canReady:boolean;readonly canReturnToLobby:boolean;readonly busy:boolean;readonly uncertain:boolean;
 readonly ownRole:PlanetSessionSnapshot['privateRole'];readonly recoveryCode:string|null;
 /** A registered request is context for waiting, never evidence of admission. */
 readonly pendingAdmission:Readonly<{kind:'player'|'display';roomCode:string;status:NonNullable<PlanetSessionSnapshot['admission']>['status']|null}>|null;
}
export interface PlanetSessionController {
 start(matchId?:string):Promise<void>;
 subscribe(listener:(model:PlanetSessionModel)=>void):()=>void;
 getModel():PlanetSessionModel;
 operate(action:PlanetSessionAction):Promise<void>;
 retry():Promise<void>;
 refresh():Promise<void>;
 returnToLobby():boolean;
 revealRole(open:boolean):void;
 setVisible(visible:boolean):void;
 gameTransport(surface:'player'|'display'):PlanetTransport;
 dispose():void;
}
interface Answer {ok:boolean;serverTimeMs:number;result:unknown;code:string|null}
export function readPlanetServiceAnswer(value:unknown):Answer|null {
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const r=value as Record<string,unknown>;
 if(typeof r.ok!=='boolean'||!TimestampSchema.safeParse(r.serverTimeMs).success)return null;
 if(r.ok){if(Object.keys(r).sort().join(',')!=='ok,result,serverTimeMs')return null;return {ok:true,serverTimeMs:r.serverTimeMs as number,result:r.result,code:null};}
 if(!r.error||typeof r.error!=='object'||Array.isArray(r.error)||Object.keys(r.error).join(',')!=='code')return null;
 const code=(r.error as Record<string,unknown>).code;
 const codes=['UNAUTHENTICATED','FORBIDDEN','INVALID_REQUEST','NOT_FOUND','NOT_ALLOWED','REQUEST_ID_CONFLICT','COMMAND_ID_CONFLICT','UNAVAILABLE','RATE_LIMITED'];
 return typeof code==='string'&&codes.includes(code)?{ok:false,serverTimeMs:r.serverTimeMs as number,result:null,code}:null;
}

/** HTTP snapshots are server-confirmed reads. They are not Firestore cache documents. */
export function createPlanetSession(connection:PlanetServiceConnection,ports:PlayerPorts,stores:{resume:UnresolvedCommandStore;requests:UnresolvedCommandStore}):PlanetSessionController {
 const clock=createServerClock(ports.clock),listeners=new Set<(value:PlanetSessionModel)=>void>();
 const feeds=new Set<{surface:'player'|'display';seatId:PlanetSessionSnapshot['selfSeatId'];snapshot(value:PlanetSnapshot):void;error():void}>();
 let knownRole:{role:string;faction:string}|null=null;
 let recoveredSeat:PlanetSessionSnapshot['selfSeatId']=null;
 let snapshot:PlanetSessionSnapshot|null=null,matchId:string|null=null,uid:string|null=null,visible=true,disposed=false,fresh=false,revealed=false;
 let join:{matchId:string;kind:'player'|'display';roomCode:string;requestId:string}|null=null;
 let busy=false,uncertain=false,pending:PlanetServiceRequest|null=null,code:string|null=null,message:string|null=null,connectionState:PlanetSessionModel['connection']='connecting';
 let poll:unknown=null,ticker:unknown=null,refreshing:Promise<void>|null=null,generation=0,started=false;
 const timeouts=new Set<unknown>();
 const bounded=<T>(run:()=>Promise<T>):Promise<T|null>=>new Promise(resolve=>{
  let done=false;const finish=(value:T|null)=>{if(done)return;done=true;ports.scheduler.clearTimeout(handle);timeouts.delete(handle);resolve(value);};
  const handle=ports.scheduler.setTimeout(()=>finish(null),8000);timeouts.add(handle);Promise.resolve().then(run).then(finish,()=>finish(null));
 });
 const auth=()=>uid!==null&&connection.currentUid()===uid;
 const live=()=>visible&&fresh&&auth();
 const standingMatches=(s:PlanetSessionSnapshot)=>join===null||s.matchId===join.matchId&&s.roomCode===join.roomCode&&s.admission?.requestId===join.requestId&&s.admission.kind===join.kind;
 const knownAdmitted=()=>!!snapshot&&standingMatches(snapshot)&&(snapshot.admission===null?snapshot.isHost||snapshot.selfSeatId!==null:snapshot.admission.status==='admitted'&&(snapshot.admission.kind==='display'?snapshot.selfSeatId===null:snapshot.selfSeatId!==null));
 const admitted=()=>live()&&knownAdmitted();
 function canReturnToLobby(){
  if(!admitted()||!snapshot||!['finished','aborted'].includes(snapshot.status)||busy||uncertain||pending!==null)return false;
  try{return stores.requests.load()===null&&ports.unresolved.load()===null;}catch{return false;}
 }
 function getModel():PlanetSessionModel{
  const s=admitted()?snapshot:null,t=clock.read(),remaining=s?.setup&&t.status==='synced'?s.setup.endsAt-t.serverNowMs:null;
  const own=s?.members.find(m=>m.seatId===s.selfSeatId);
  return {mode:connection.mode,connection:connectionState,message,matchId,versions:s?.versions??null,roomCode:s?.roomCode??null,status:s?.status??null,isHost:s?.isHost??false,selfSeatId:s?.selfSeatId??null,playerCount:s?.playerCount??null,
   members:s?.members??[],pendingAdmissions:s?.isHost?s.pendingAdmissions:[],remainingMs:remaining===null?null:Math.max(0,remaining),
   canChoose:!!s&&s.status==='choosing'&&!!own&&t.status==='synced'&&remaining!==null&&remaining>t.uncertaintyMs&&!busy&&!uncertain,
   canReady:!!s&&s.status==='reading'&&!!own&&!own.ready&&t.status==='synced'&&remaining!==null&&remaining<=-t.uncertaintyMs&&!busy&&!uncertain,
   canReturnToLobby:canReturnToLobby(),busy,uncertain,ownRole:s?.status==='reading'&&revealed&&!own?.ready?s.privateRole:null,recoveryCode:s?code:null,
   pendingAdmission:visible&&auth()&&join&&!knownAdmitted()?{kind:join.kind,roomCode:join.roomCode,status:snapshot&&standingMatches(snapshot)?snapshot.admission?.status??null:null}:null};
 }
 function emit(){if(disposed)return;const model=getModel();for(const listener of listeners)listener(model);}
 function conceal(text:string,error=false){fresh=false;revealed=false;code=null;message=text;connectionState=error?'error':'stale';for(const feed of feeds)feed.error();emit();}
 async function request(input:PlanetServiceRequest):Promise<Answer|null>{
  const startedAt=ports.clock.now();const raw=await bounded(()=>connection.request(input));if(disposed||!auth())return null;
  const result=readPlanetServiceAnswer(raw);if(result&&input.operation==='read')clock.addSample({requestedAt:startedAt,receivedAt:ports.clock.now(),serverTimeMs:result.serverTimeMs});return result;
 }
 function saveResume(){if(matchId)try{stores.resume.save(JSON.stringify({protocolVersion:3,matchId,ownerUid:uid,join}));}catch{message='Session resume could not be saved in this tab.';}}
 function projectFeeds(){
  if(!admitted()||!snapshot){for(const feed of feeds)feed.error();return;}
  for(const feed of feeds){
   if(feed.surface==='player'&&snapshot.selfSeatId!==feed.seatId){feed.error();continue;}
   const value=feed.surface==='player'?snapshot.playerView:snapshot.publicView;
   if(value)feed.snapshot({value,fresh:true});else feed.error();
  }
 }
 async function read(){
  if(!matchId||!visible||disposed)return;
  const token=generation,response=await request({operation:'read',matchId});if(token!==generation||disposed)return;
  if(!response?.ok){
   if(join&&auth()&&!knownAdmitted()){conceal('Your request is registered. Waiting for the server to confirm admission.');return;}
   conceal(response?.code==='FORBIDDEN'?'This identity can no longer read this session.':'Reconnecting to the authorized session.',response?.code==='FORBIDDEN');return;
  }
  const parsed=PlanetSessionSnapshotSchema.safeParse(response.result);
  if(!parsed.success||parsed.data.matchId!==matchId||!planetSupportsAssets(parsed.data.versions)){conceal('The session response could not be verified.',true);return;}
  const next=parsed.data;
  if(recoveredSeat!==null&&next.selfSeatId!==recoveredSeat){conceal('The recovered seat could not be verified.',true);return;}
  if([next.publicView,next.playerView].some(v=>v&&(v.matchId!==next.matchId||JSON.stringify(v.versions)!==JSON.stringify(next.versions)))){conceal('The session view versions could not be verified.',true);return;}
  if(!standingMatches(next)){conceal('The admission request could not be verified.',true);return;}
  if(next.admission===null&&!next.isHost&&next.selfSeatId===null||next.admission?.status==='admitted'&&next.admission.kind==='player'&&next.selfSeatId===null){conceal('The admission audience could not be verified.',true);return;}
  const denied=next.admission!==null&&next.admission.status!=='admitted';
  const nextRole=next.privateRole??next.playerView?.self;
  if(nextRole&&knownRole&&(knownRole.role!==nextRole.role||knownRole.faction!==nextRole.faction)){conceal('Your role identity changed unexpectedly.',true);return;}
  const characters=next.members.flatMap(m=>m.characterId?[m.characterId]:[]);
  if(new Set(characters).size!==characters.length||next.members.some(m=>Number(m.seatId.slice(5))>next.playerCount)){conceal('The crew identities could not be verified.',true);return;}
  if(new Set(next.members.map(m=>m.seatId)).size!==next.members.length||next.members.length>next.playerCount||
    (!next.isHost&&next.pendingAdmissions.length>0)||
    (next.selfSeatId===null&&(next.privateRole!==null||next.playerView!==null))||
    (next.selfSeatId!==null&&!next.members.some(m=>m.seatId===next.selfSeatId))||
    (next.playerView&&next.playerView.self.seatId!==next.selfSeatId)||
    (next.privateRole&&next.status!=='reading')||
    (snapshot?.selfSeatId&&next.selfSeatId!==snapshot.selfSeatId&&!denied)){
   conceal('The session audience could not be verified.',true);return;
  }
  if(snapshot&&JSON.stringify(snapshot.versions)!==JSON.stringify(next.versions)){conceal('The session version changed unexpectedly.',true);return;}
  if(snapshot?.setup?.id!==next.setup?.id||snapshot?.status!==next.status)revealed=false;
  // Keep the original caller/request binding across approval and reload. A recovered
  // member clears it only after the verified recovery response, before reading its seat.
  if(!join&&next.admission)join={matchId:next.matchId,roomCode:next.roomCode,requestId:next.admission.requestId,kind:next.admission.kind};
  if(nextRole)knownRole={role:nextRole.role,faction:nextRole.faction};
  snapshot=next;recoveredSeat=null;fresh=true;connectionState='live';if(!uncertain)message=null;saveResume();projectFeeds();emit();
 }
 async function refresh(){
  if(!started){await start(matchId??undefined);return;}
  if(refreshing)return refreshing;
  refreshing=read().finally(()=>{refreshing=null;});return refreshing;
 }
 function schedule(){
  if(disposed||!visible)return;
  poll=ports.scheduler.setTimeout(()=>{void refresh().finally(schedule);},2000);
 }
 function tick(){
  if(disposed||!visible)return;if(!auth()){conceal('Your signed-in identity changed. Reconnect the original session.',true);return;}emit();ticker=ports.scheduler.setTimeout(tick,250);
 }
 async function start(initialMatchId?:string){
  if(started||disposed)return;started=true;
  try{
   uid=await bounded(()=>connection.signIn());if(!uid||uid!==connection.currentUid())throw new Error('auth unavailable');
   const saved=stores.resume.load();if(initialMatchId)matchId=IdentifierSchema.parse(initialMatchId);
   if(saved){
    const value=JSON.parse(saved);if(value.protocolVersion===3){
     if(value.ownerUid!==undefined&&value.ownerUid!==uid)throw new Error('resume audience');
     const savedMatchId=IdentifierSchema.parse(value.matchId);if(!matchId)matchId=savedMatchId;
     if(value.join&&savedMatchId===matchId){
      const j=value.join;
      if(j.matchId!==matchId||!['player','display'].includes(j.kind)||typeof j.roomCode!=='string'||!/^[A-Z0-9]{6}$/.test(j.roomCode)||!IdentifierSchema.safeParse(j.requestId).success)throw new Error('invalid join context');
      join={matchId:savedMatchId,kind:j.kind,roomCode:j.roomCode,requestId:j.requestId};
     }
    }
   }
   const recovery=stores.requests.load();if(recovery){const value=JSON.parse(recovery);if(value.ownerUid!==uid)throw new Error('request audience');const parsed=PlanetServiceRequestSchema.safeParse(value.request);if(!parsed.success||['command','receipt','read','redeemRecovery'].includes(parsed.data.operation))throw new Error('invalid request recovery');pending=parsed.data;uncertain=true;message='A previous session request needs an exact retry.';}
   connectionState='live';await refresh();schedule();tick();emit();
  }catch{started=false;conceal('Authentication or saved session recovery could not be verified.',true);}
 }
 async function sendPending(){
  if(!pending||busy||!auth()||!visible)return;busy=true;code=null;emit();const item=pending,response=await request(item);if(disposed||pending!==item)return;busy=false;
  if(!response){uncertain=true;message='Session request outcome unknown. Retry the original request.';emit();return;}
  if(!response.ok){
   // UNAVAILABLE may follow a durable commit. No later preflight rejection can
   // settle that earlier unknown outcome; only a verified success settles it.
   if(response.code==='UNAVAILABLE'||uncertain){uncertain=true;message=response.code==='RATE_LIMITED'?'The original request is still unresolved. Please wait, then retry the same request.':'Session request outcome unknown. Retry the original request.';emit();return;}
   uncertain=false;pending=null;try{stores.requests.clear();}catch{/* Public request IDs remain harmless. */}
   message=response.code==='NOT_ALLOWED'?'That operation is not currently allowed.':response.code==='NOT_FOUND'?'The session was not found.':response.code==='RATE_LIMITED'?'Please wait before retrying.':'The session request was refused.';emit();return;
  }
  const result=response.result as Record<string,unknown>|null;
  if(item.operation==='create'||item.operation==='requestAdmission'){
   const parsed=IdentifierSchema.safeParse(result?.matchId);if(!parsed.success){uncertain=true;message='The session result could not be verified. Retry the original request.';emit();return;}
   if(matchId!==parsed.data){snapshot=null;knownRole=null;for(const feed of feeds)feed.error();}
   matchId=parsed.data;join=item.operation==='requestAdmission'?{matchId,kind:item.kind,roomCode:item.roomCode,requestId:item.requestId}:null;saveResume();
  }
  if(item.operation==='issueRecovery'){
   const value=result?.recoveryCode;
   if(typeof value!=='string'||value.length<16||value.length>128){uncertain=true;message='The issued recovery code could not be verified. Retry the original request.';emit();return;}
   code=value;
  }
  if(item.operation==='redeemRecovery'){
   const recovery=PlanetRecoveryResultSchema.safeParse(result);
   if(!recovery.success||recovery.data.matchId!==item.matchId){uncertain=true;message='The recovery result could not be verified. Retry the original request.';emit();return;}
   for(const feed of feeds)feed.error();snapshot=null;knownRole=null;matchId=item.matchId;recoveredSeat=recovery.data.seatId;join=null;saveResume();
  }
  pending=null;uncertain=false;try{stores.requests.clear();}catch{/* The settled request can be safely retried after reload. */}message='Request registered.';await refresh();emit();
 }
 async function operate(action:PlanetSessionAction){
  if(busy||uncertain||!auth()||!visible||snapshot!==null&&!live())return;
  if(action.operation==='requestAdmission'&&!CrewDisplayNameSchema.safeParse(action.displayName).success){message='Enter a name of 1–12 characters without control characters.';emit();return;}
  const noId=action.operation==='advance'||action.operation==='runBots';
  const parsed=PlanetServiceRequestSchema.safeParse({...action,...(noId?{}:{requestId:ports.ids.next()})});if(!parsed.success)return;
  if(parsed.data.operation==='chooseCharacter'&&!getModel().canChoose||parsed.data.operation==='ready'&&!getModel().canReady)return;
  const item=parsed.data;revealed=false;pending=item;
  try{
   // Only public lobby choices/operation IDs persist. Never a role, game command or recovery secret.
   if(item.operation!=='redeemRecovery')stores.requests.save(JSON.stringify({ownerUid:uid,request:item}));
  }catch{pending=null;message='Request recovery could not be saved. Nothing was sent.';emit();return;}
  await sendPending();
 }
 return {
  start,getModel,operate,refresh,retry:sendPending,
  returnToLobby(){
   if(!canReturnToLobby())return false;
   try{stores.requests.clear();ports.unresolved.clear();stores.resume.clear();}catch{message='The saved session could not be cleared. Try again.';emit();return false;}
   generation++;snapshot=null;matchId=null;join=null;knownRole=null;recoveredSeat=null;revealed=false;code=null;fresh=false;clock.invalidate();message=null;connectionState='live';
   for(const feed of feeds)feed.error();emit();return true;
  },
  subscribe(listener){listeners.add(listener);listener(getModel());return()=>listeners.delete(listener);},
  revealRole(open){revealed=open&&live()&&snapshot?.status==='reading';emit();},
  setVisible(next){
   if(next===visible||disposed)return;visible=next;generation++;revealed=false;code=null;fresh=false;clock.invalidate();
   if(poll!==null)ports.scheduler.clearTimeout(poll);if(ticker!==null)ports.scheduler.clearTimeout(ticker);emit();for(const feed of feeds)feed.error();
   if(next){void refresh().finally(()=>{schedule();tick();});}
  },
  gameTransport(surface){
   return {mode:connection.mode,currentUid:()=>connection.currentUid(),
    async authenticate(){if(!started)await start();if(!matchId||!snapshot||!admitted())throw new Error('session unavailable');const seatId=surface==='player'?snapshot.selfSeatId:null;if(surface==='player'&&seatId===null)throw new Error('not a player');return {uid:uid!,matchId,seatId};},
    async serverTime(){if(!matchId)throw new Error('session unavailable');const answer=await request({operation:'read',matchId});if(!answer?.ok)throw new Error('server time unavailable');return answer.serverTimeMs;},
    listen(audience,listener){const feed={surface,seatId:audience.seatId,...listener};if(audience.matchId!==matchId){listener.error();return()=>{};}feeds.add(feed);projectFeeds();return()=>feeds.delete(feed);},
    async command(command){const answer=await request({operation:'command',request:command});if(!answer?.ok)return null;void refresh();return {receipt:(answer.result as {receipt:unknown})?.receipt,serverTimeMs:answer.serverTimeMs};},
    async receipt(context){const answer=await request({operation:'receipt',matchId:context.matchId,commandId:context.commandId});if(!answer?.ok)return null;return {receipt:(answer.result as {receipt:unknown})?.receipt??null,serverTimeMs:answer.serverTimeMs};},
    identities:()=>admitted()?snapshot?.members.map(m=>({seatId:m.seatId,characterId:m.characterId,displayName:m.displayName}))??[]:[],
   };
  },
  dispose(){disposed=true;generation++;if(poll!==null)ports.scheduler.clearTimeout(poll);if(ticker!==null)ports.scheduler.clearTimeout(ticker);for(const timer of timeouts)ports.scheduler.clearTimeout(timer);timeouts.clear();listeners.clear();feeds.clear();snapshot=null;pending=null;code=null;},
 };
}
