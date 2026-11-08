import {createHash,randomBytes,randomInt,randomUUID} from 'node:crypto';
import {
  PLANET_GAME_PINS,PLANET_SETUP_FLOW_VERSION,PLANET_BOARDING_DURATION_MS,IdentifierSchema,
  PlanetServiceRequestSchema,PlanetSessionSnapshotSchema,PlanetReceiptSchema,
  PlanetPublicViewSchema,PlanetPlayerViewSchema,PlanetVersionsSchema,PlanetRecoveryResultSchema,CrewCharacterIdSchema,
} from '@mothership/contracts';
import type {
  PlanetCommandRequest,PlanetReceipt,PlanetPublicView,PlanetPlayerView,PlanetRole,PlanetVersions,
  PlanetServiceRequest,PlanetServiceResponse,PlanetServiceFailure,PlanetSessionSnapshot,SeatId,
} from '@mothership/contracts';

export interface PlanetStateEnvelope {matchId:string;versions:PlanetVersions;round:number;phase:{id:string;kind:string;startedAt:number;endsAt:number|null};deadlineToken:string|null}
export interface PlanetSetup {
  matchId:string;playerCount:7|8|9;roleOrder:PlanetRole[];initialRooms:Record<string,'Room A'|'Room B'>;
  initialTurnOrder:SeatId[];assetManifestVersion:string;versions?:PlanetVersions;
}
export interface PlanetContext {now:number;nextPhaseId:string;nextDeadlineToken:string;random:number[];phaseId?:string;deadlineToken?:string}
export interface PlanetEnginePort<S extends PlanetStateEnvelope> {
  createPlanetGame(setup:PlanetSetup,context:PlanetContext):S;
  applyPlanetCommand(state:S,actor:SeatId,request:PlanetCommandRequest,context:PlanetContext):{state:S;receipt:PlanetReceipt};
  advancePlanetDeadline(state:S,context:PlanetContext):{state:S;advanced:boolean};
  planetDeadlineAt(state:S):number|null;
  assertPlanetGameState(state:unknown):asserts state is S;
  abortPlanetGame(state:S,context:PlanetContext):S;
  projectPlanetPublic(state:S):PlanetPublicView;
  projectPlanetPlayer(state:S,seatId:SeatId):PlanetPlayerView;
}
export interface PlanetTransaction {
  get<T>(key:string):Promise<T|null>;
  set(key:string,value:unknown):void;
  delete(key:string):void;
}
export interface PlanetPersistence {
  transaction<T>(operation:(tx:PlanetTransaction)=>Promise<T>):Promise<T>;
  listKeys(namespace:string,limit:number):Promise<string[]>;
}
interface Member {
  seatId:SeatId;uid:string|null;bindingRevision:number;displayName:string;characterId:string|null;
  controller:'human'|'bot';ready:boolean;
}
interface Admission {id:string;requestId:string;uid:string;kind:'player'|'display';displayName:string;approved:boolean}
interface Session<S> {
  matchId:string;roomCode:string;hostUid:string;versions:PlanetVersions;playerCount:7|8|9;journalSequence:number;
  setupFlowVersion?:2;
  status:PlanetSessionSnapshot['status'];members:Member[];displays:string[];admissions:Admission[];
  setup:{id:string;endsAt:number;token:string;startedAt?:number}|null;prepared:PlanetSetup|null;preparedState:S|null;state:S|null;
}
interface StoredReceipt {fingerprint:string;response:PlanetServiceResponse}
export interface PlanetDeadlineJob {
  matchId:string;phaseId:string;deadlineToken:string;endsAt:number;kind:'setup'|'game';
  taskId:string;status:'pending'|'dispatched'|'complete';nextAttemptAt:number;
}
type FailureCode=PlanetServiceFailure['error']['code'];
class Rejected extends Error {constructor(readonly code:FailureCode){super(code);}}
function reject(code:FailureCode):never{throw new Rejected(code);}
const safeUid=(uid:unknown):uid is string=>typeof uid==='string' && /^[A-Za-z0-9_-]{1,128}$/.test(uid);
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const key=(scope:string,value:unknown)=>scope+'/'+hash(value);
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const roles=(count:7|8|9):PlanetRole[]=>['Insider','Doctor','Blue Disabler','Supplier','Undercover','Hacker','Alien',...(count>=8?['Red Disabler' as const]:[]),...(count===9?['Engineer' as const]:[])];
const seatId=(n:number)=>`seat-${n}` as SeatId;
const characters=[...CrewCharacterIdSchema.options];
function shuffle<T>(values:readonly T[],samples:number[]):T[] {
  const result=[...values];
  for(let i=result.length-1;i>0;i--){const r=samples.shift();if(r===undefined || r<0 || r>=1)throw new Error('Recorded random input exhausted');const j=Math.floor(r*(i+1));[result[i],result[j]]=[result[j]!,result[i]!];}
  return result;
}

/** No Firebase globals: the same transactional orchestration is exercised by emulator and unit tests. */
export function createPlanetService<S extends PlanetStateEnvelope>(dependencies:{
  store:PlanetPersistence;engine:PlanetEnginePort<S>;clock?:()=>number;newId?:()=>string;
  randomSamples?:()=>number[];newRecoveryCode?:()=>string;assetManifestVersion?:string;enabled?:boolean;setupFlowVersion?:1|2;
}){
  if(dependencies.setupFlowVersion!==undefined&&dependencies.setupFlowVersion!==1&&dependencies.setupFlowVersion!==2)
    throw new Error('Unsupported Planet setup flow version');
  const engine:PlanetEnginePort<S>=dependencies.engine;
  const {store}=dependencies,clock=dependencies.clock??Date.now,newId=dependencies.newId??randomUUID;
  const randomSamples=dependencies.randomSamples??(()=>Array.from({length:64},()=>randomInt(0x1_0000_0000)/0x1_0000_0000));
  const newRecoveryCode=dependencies.newRecoveryCode??(()=>randomBytes(24).toString('base64url'));
  const versions=PlanetVersionsSchema.parse({...PLANET_GAME_PINS,assetManifestVersion:dependencies.assetManifestVersion??'design-0.5.0'});
  const context=():PlanetContext=>({now:clock(),nextPhaseId:newId(),nextDeadlineToken:newId(),random:randomSamples()});
  const success=(result:unknown):PlanetServiceResponse=>({ok:true,serverTimeMs:clock(),result});
  const failure=(code:FailureCode):PlanetServiceResponse=>({ok:false,serverTimeMs:clock(),error:{code}});
  const member=(s:Session<S>,uid:string)=>s.members.find(m=>m.controller==='human' && m.uid===uid);
  const isParticipant=(s:Session<S>,uid:string)=>s.hostUid===uid || member(s,uid)!==undefined || s.displays.includes(uid);
  const requireHost=(s:Session<S>,uid:string)=>{if(s.hostUid!==uid)reject('FORBIDDEN');};
  const requireMember=(s:Session<S>,uid:string)=>member(s,uid)??reject('FORBIDDEN');
  const matchKey=(matchId:string)=>'session/'+matchId;
  async function load(tx:PlanetTransaction,matchId:string):Promise<Session<S>> {
    const s=await tx.get<Session<S>>(matchKey(matchId));
    if(!s)reject('FORBIDDEN');
    if(s.matchId!==matchId)throw new Error('Saved session identity mismatch');
    // Absence is the historical flow. A new deployment must never reinterpret a
    // saved lobby, deal or running match using its current creation configuration.
    if(Object.hasOwn(s,'setupFlowVersion')&&s.setupFlowVersion!==PLANET_SETUP_FLOW_VERSION)throw new Error('Unsupported saved Planet setup flow version');
    if(s.status==='boarding'){
      if(s.setupFlowVersion!==PLANET_SETUP_FLOW_VERSION||!s.setup||!Number.isSafeInteger(s.setup.startedAt)||s.setup.startedAt!<0
        ||!Number.isSafeInteger(s.setup.endsAt)||s.setup.endsAt!==s.setup.startedAt!+PLANET_BOARDING_DURATION_MS
        ||!IdentifierSchema.safeParse(s.setup.id).success||!IdentifierSchema.safeParse(s.setup.token).success
        ||!s.prepared||!s.preparedState||s.state!==null
        ||s.members.length!==s.playerCount||!s.members.every(m=>m.ready&&m.characterId!==null))
        throw new Error('Invalid saved Planet boarding stage');
    }else if(s.setup&&Object.hasOwn(s.setup,'startedAt'))throw new Error('Boarding timestamp outside boarding stage');
    PlanetVersionsSchema.parse(s.versions);
    for(const state of [s.state,s.preparedState])if(state){engine.assertPlanetGameState(state);
      if(state.matchId!==s.matchId||!same(state.versions,s.versions))throw new Error('Saved session identity or version mismatch');}
    if(s.prepared){if(s.prepared.matchId!==s.matchId||s.prepared.assetManifestVersion!==s.versions.assetManifestVersion
      ||(s.prepared.versions&&!same(s.prepared.versions,s.versions)))throw new Error('Saved setup identity or version mismatch');s.prepared.versions=s.versions;}
    return s;
  }
  const deadlineAt=(state:S):number|null=>engine.planetDeadlineAt(state);
  function record(tx:PlanetTransaction,s:Session<S>,event:Record<string,unknown>):void{
    s.journalSequence=(s.journalSequence??0)+1;
    tx.set('journal/'+s.matchId+'/'+String(s.journalSequence).padStart(12,'0'),{...event,matchId:s.matchId,sequence:s.journalSequence,versions:s.versions,
      ...(s.setupFlowVersion===2?{setupFlowVersion:2}:{})});
  }
  async function publish(tx:PlanetTransaction,s:Session<S>):Promise<void>{
    // Keep full authority server-only. The HTTP read path constructs the caller's audience.
    tx.set(matchKey(s.matchId),s);
    const timer=s.status==='choosing'||s.status==='reading'||s.status==='boarding'
      ? s.setup && {phaseId:s.setup.id,deadlineToken:s.setup.token,endsAt:s.setup.endsAt,kind:'setup' as const}
      : s.status==='running' && s.state && deadlineAt(s.state)!==null && s.state.deadlineToken
        ? {phaseId:s.state.phase.id,deadlineToken:s.state.deadlineToken,endsAt:deadlineAt(s.state)!,kind:'game' as const}:null;
    if(timer){
      const taskId=hash([s.matchId,timer.phaseId,timer.deadlineToken]);
      const path='deadline/'+taskId,prior=await tx.get<PlanetDeadlineJob>(path);
      // Never reset dispatched/completed work or generate metadata updates for a private choice.
      if(!prior){const job:PlanetDeadlineJob={...timer,matchId:s.matchId,taskId,status:'pending',nextAttemptAt:Math.min(clock(),timer.endsAt)};tx.set(path,job);}
    }
  }
  function snapshot(s:Session<S>,uid:string):PlanetSessionSnapshot{
    const own=member(s,uid),isHost=s.hostUid===uid;
    const admission=s.admissions.find(a=>a.uid===uid),participant=isParticipant(s,uid);
    if(!participant&&!admission)reject('FORBIDDEN');
    const standing=admission&&!isHost?{requestId:admission.requestId,kind:admission.kind,
      status:admission.approved&&participant?'admitted':s.status==='lobby'?'pending':'closed'}:null;
    const denied=!participant;
    const running=!denied&&s.state!==null&&['running','finished'].includes(s.status);
    const prepared=!denied&&s.status==='reading'&&own&&s.preparedState?engine.projectPlanetPlayer(s.preparedState,own.seatId):null;
    return PlanetSessionSnapshotSchema.parse({
      matchId:s.matchId,roomCode:s.roomCode,versions:s.versions,status:s.status,playerCount:s.playerCount,isHost:!denied&&isHost,selfSeatId:denied?null:own?.seatId??null,
      ...(s.setupFlowVersion===2?{setupFlowVersion:2}:{}),
      admission:standing,
      members:denied?[]:s.members.map(({seatId,displayName,characterId,controller,ready})=>({seatId,displayName,characterId,controller,ready})),
      pendingAdmissions:!denied&&isHost?s.admissions.filter(a=>!a.approved).map(({id,kind,displayName})=>({id,kind,displayName})):[],
      setup:!denied&&s.setup?{id:s.setup.id,endsAt:s.setup.endsAt,
        ...(s.status==='boarding'?{startedAt:s.setup.startedAt}:{})}:null,
      privateRole:prepared?{role:prepared.self.role,faction:prepared.self.faction,knowledge:prepared.knowledge}:null,
      publicView:running?PlanetPublicViewSchema.parse(engine.projectPlanetPublic(s.state!)):null,
      playerView:running&&own?PlanetPlayerViewSchema.parse(engine.projectPlanetPlayer(s.state!,own.seatId)):null,
    });
  }
  function prepare(s:Session<S>,ctx:PlanetContext,tx:PlanetTransaction):void{
    const samples=[...ctx.random],available=shuffle(characters,samples);
    for(const m of s.members)if(!m.characterId)m.characterId=available.find(c=>!s.members.some(p=>p.characterId===c))!;
    // Uniformly sample all valid A/B room assignments instead of independent draws that can overflow five places.
    const assignments:Array<Record<string,'Room A'|'Room B'>>=[];
    for(let bits=0;bits<(1<<s.playerCount);bits++){
      const a=Array.from({length:s.playerCount},(_,i)=>(bits>>i)&1).reduce((n,v)=>n+v,0);
      if(a>5 || s.playerCount-a>5)continue;
      assignments.push(Object.fromEntries(s.members.map((m,i)=>[m.seatId,((bits>>i)&1)?'Room A':'Room B'])));
    }
    const random=samples.shift();if(random===undefined)throw new Error('Missing recorded random sample');
    const initialRooms=assignments[Math.floor(random*assignments.length)]!;
    s.prepared={matchId:s.matchId,playerCount:s.playerCount,roleOrder:shuffle(roles(s.playerCount),samples),initialRooms,
      initialTurnOrder:shuffle(s.members.map(m=>m.seatId),samples),assetManifestVersion:s.versions.assetManifestVersion,versions:s.versions};
    s.preparedState=engine.createPlanetGame(s.prepared,ctx);
    s.status='reading';s.setup={id:ctx.nextPhaseId,endsAt:ctx.now+30_000,token:ctx.nextDeadlineToken};
    for(const m of s.members)m.ready=m.controller==='bot';
    record(tx,s,{kind:'PREPARE',setup:s.prepared,context:ctx});
  }
  function initialize(s:Session<S>,ctx:PlanetContext,tx:PlanetTransaction):void{
    if(!s.prepared)throw new Error('Missing prepared setup');
    s.state=engine.createPlanetGame(s.prepared,ctx);s.preparedState=null;s.status='running';s.setup=null;
    record(tx,s,{kind:'INITIALIZE',setup:s.prepared,context:ctx});
  }
  function startIfReady(s:Session<S>,ctx:PlanetContext,tx:PlanetTransaction):boolean{
    if(s.status!=='reading'||!s.setup||ctx.now<s.setup.endsAt||!s.members.every(m=>m.ready))return false;
    if(s.setupFlowVersion===2){
      if(!s.prepared||!s.preparedState||s.state!==null)throw new Error('Missing prepared boarding deal');
      if(ctx.nextPhaseId===s.setup.id||ctx.nextDeadlineToken===s.setup.token)throw new Error('Fresh boarding identities required');
      s.status='boarding';s.setup={id:ctx.nextPhaseId,startedAt:ctx.now,endsAt:ctx.now+PLANET_BOARDING_DURATION_MS,token:ctx.nextDeadlineToken};
      record(tx,s,{kind:'BOARDING_STARTED',setup:{id:s.setup.id,startedAt:s.setup.startedAt,endsAt:s.setup.endsAt},context:ctx});
    }else initialize(s,ctx,tx);
    return true;
  }
  async function limit(tx:PlanetTransaction,uid:string,now:number):Promise<void>{
    const k=key('rate',uid),previous=await tx.get<{since:number;count:number}>(k);
    const value=!previous||now-previous.since>=60_000?{since:now,count:0}:previous;
    if(value.count>=120)reject('RATE_LIMITED');
    tx.set(k,{...value,count:value.count+1});
  }
  async function handle(uid:string,raw:unknown):Promise<PlanetServiceResponse>{
    if(!safeUid(uid))return failure('UNAUTHENTICATED');
    const parsed=PlanetServiceRequestSchema.safeParse(raw);
    if(!parsed.success)return failure('INVALID_REQUEST');
    const request=parsed.data;
    // Sample once outside transaction retries, and journal only private server evidence.
    const ctx=context(),generatedId=newId(),recoveryCode=newRecoveryCode(),fingerprint=hash(request);
    try{
      // Failure must not roll back the caller's rate counter.
      await store.transaction(tx=>limit(tx,uid,ctx.now));
      return await store.transaction(async tx=>{
      ctx.now=clock();
      if(request.operation==='create'){
        const receiptKey=key('operation',[uid,request.requestId]),previous=await tx.get<StoredReceipt>(receiptKey);
        if(previous){if(previous.fingerprint!==fingerprint)reject('REQUEST_ID_CONFLICT');return previous.response;}
        if(dependencies.enabled===false)reject('NOT_ALLOWED');
        const matchId=generatedId,roomCode=hash([generatedId,ctx.random]).slice(0,6).toUpperCase();
        if(await tx.get('room/'+roomCode))reject('UNAVAILABLE');
        const s:Session<S>={matchId,roomCode,hostUid:uid,versions,playerCount:request.playerCount,journalSequence:0,status:'lobby',members:[],displays:[],admissions:[],setup:null,prepared:null,preparedState:null,state:null,
          ...(dependencies.setupFlowVersion===2?{setupFlowVersion:2 as const}:{})};
        const response=success({matchId,roomCode});
        tx.set('room/'+roomCode,{matchId});record(tx,s,{kind:'CREATE',context:ctx});await publish(tx,s);tx.set(receiptKey,{fingerprint,response});
        return response;
      }
      if(request.operation==='requestAdmission'){
        const rk=key('operation',[uid,request.requestId]),prior=await tx.get<StoredReceipt>(rk);
        if(prior){if(prior.fingerprint!==fingerprint)reject('REQUEST_ID_CONFLICT');return prior.response;}
        const lookup=await tx.get<{matchId:string}>('room/'+request.roomCode);
        if(!lookup)reject('NOT_FOUND');
        const s=await load(tx,lookup.matchId);
        if(s.status!=='lobby')reject('NOT_ALLOWED');
        const current=s.admissions.find(a=>a.uid===uid);
        if(current && (current.requestId!==request.requestId||current.kind!==request.kind||current.displayName!==request.displayName))reject('NOT_ALLOWED');
        const admission=current??{id:generatedId,requestId:request.requestId,uid,kind:request.kind,displayName:request.displayName,approved:false};
        if(!current){
          if(s.admissions.filter(a=>!a.approved).length>=32)reject('RATE_LIMITED');
          s.admissions.push(admission);
        }
        const response=success({matchId:s.matchId,admissionId:admission.id});
        await publish(tx,s);tx.set(rk,{fingerprint,response});return response;
      }
      const matchId=request.operation==='command'?request.request.matchId:request.matchId;
      const s=await load(tx,matchId);
      if(request.operation==='redeemRecovery'){
        const rk=key('operation',[uid,request.requestId]),previous=await tx.get<StoredReceipt>(rk);
        if(previous){if(previous.fingerprint!==fingerprint)reject('REQUEST_ID_CONFLICT');return previous.response;}
        const recoveryKey=key('recovery',[matchId,request.recoveryCode]);
        const token=await tx.get<{seatId:SeatId;bindingRevision:number;expiresAt:number;used:boolean}>(recoveryKey);
        if(!token||token.used||ctx.now>=token.expiresAt||member(s,uid))reject('FORBIDDEN');
        const seat=s.members.find(m=>m.seatId===token.seatId);
        if(!seat||seat.controller!=='human'||seat.bindingRevision!==token.bindingRevision)reject('FORBIDDEN');
        const oldUid=seat.uid;seat.uid=uid;seat.bindingRevision++;
        s.admissions=s.admissions.filter(a=>a.uid!==oldUid&&a.uid!==uid);
        s.displays=s.displays.filter(id=>id!==oldUid&&id!==uid);
        if(s.hostUid===oldUid)s.hostUid=uid;
        token.used=true;tx.set(recoveryKey,token);record(tx,s,{kind:'RECOVER',seatId:seat.seatId,bindingRevision:seat.bindingRevision});await publish(tx,s);
        const response=success(PlanetRecoveryResultSchema.parse({matchId:s.matchId,seatId:seat.seatId}));tx.set(rk,{fingerprint,response});return response;
      }
      if(request.operation==='read')return success(snapshot(s,uid));
      if(!isParticipant(s,uid))reject('FORBIDDEN');
      if(request.operation==='receipt'){
        const actor=requireMember(s,uid);
        const receipt=await tx.get<StoredReceipt>(key('command',[matchId,actor.seatId,request.commandId]));
        return success({receipt:receipt?.response.ok?(receipt.response.result as {receipt:PlanetReceipt}).receipt:null});
      }
      if(request.operation==='command'){
        const actor=requireMember(s,uid),rk=key('command',[matchId,actor.seatId,request.request.commandId]);
        const previous=await tx.get<StoredReceipt>(rk);
        if(previous){if(previous.fingerprint!==fingerprint)reject('COMMAND_ID_CONFLICT');return previous.response;}
        if(s.status!=='running'||!s.state)reject('NOT_ALLOWED');
        const applied=engine.applyPlanetCommand(s.state,actor.seatId,request.request,ctx);
        const receipt=PlanetReceiptSchema.parse(applied.receipt);
        s.state=applied.state;if(s.state.phase.kind==='FINISHED')s.status='finished';
        const response=success({receipt});
        record(tx,s,{actorSeatId:actor.seatId,kind:'COMMAND',request:request.request,context:ctx,receipt});
        await publish(tx,s);tx.set(rk,{fingerprint,response});
        return response;
      }
      if(request.operation==='advance'){
        requireHost(s,uid);const advanced=advanceSession(s,ctx,tx);
        if(advanced)await publish(tx,s);
        return success({advanced});
      }
      if(request.operation==='runBots'){
        requireHost(s,uid);const count=await driveBots(s,ctx,tx);
        if(count)await publish(tx,s);
        return success({accepted:count});
      }
      const rk=key('operation',[uid,request.requestId]),previous=await tx.get<StoredReceipt>(rk);
      if(previous){if(previous.fingerprint!==fingerprint)reject('REQUEST_ID_CONFLICT');return previous.response;}
      let result:unknown={matchId};
      switch(request.operation){
        case 'approveAdmission':{
          requireHost(s,uid);const a=s.admissions.find(p=>p.id===request.admissionId)??reject('NOT_FOUND');
          if(a.approved)break;
          if(s.status!=='lobby')reject('NOT_ALLOWED');
          if(a.kind==='display'){if(!s.displays.includes(a.uid))s.displays.push(a.uid);}
          else{
            if(s.status!=='lobby'||s.members.length>=s.playerCount||member(s,a.uid))reject('NOT_ALLOWED');
            const available=Array.from({length:s.playerCount},(_,i)=>seatId(i+1)).find(id=>!s.members.some(m=>m.seatId===id))!;
            s.members.push({seatId:available,uid:a.uid,bindingRevision:1,displayName:a.displayName,characterId:null,controller:'human',ready:false});
            s.members.sort((a,b)=>Number(a.seatId.slice(5))-Number(b.seatId.slice(5)));
          }a.approved=true;break;
        }
        case 'setBots':{
          requireHost(s,uid);if(s.status!=='lobby')reject('NOT_ALLOWED');
          const humans=s.members.filter(m=>m.controller==='human');
          if(humans.length+request.count>s.playerCount)reject('NOT_ALLOWED');
          const oldBots=s.members.filter(m=>m.controller==='bot');s.members=humans;
          for(let n=0;n<request.count;n++){
            const id=Array.from({length:s.playerCount},(_,i)=>seatId(i+1)).find(id=>!s.members.some(m=>m.seatId===id))!;
            const old=oldBots.find(b=>b.seatId===id);
            s.members.push(old??{seatId:id,uid:null,bindingRevision:1,displayName:'Bot '+id.slice(5),characterId:null,controller:'bot',ready:true});
          }s.members.sort((a,b)=>Number(a.seatId.slice(5))-Number(b.seatId.slice(5)));break;
        }
        case 'beginSetup':
          requireHost(s,uid);if(s.status!=='lobby'||s.members.length!==s.playerCount)reject('NOT_ALLOWED');
          s.status='choosing';s.setup={id:generatedId,endsAt:ctx.now+30_000,token:ctx.nextDeadlineToken};break;
        case 'chooseCharacter':{
          const own=requireMember(s,uid);
          if(s.status!=='choosing'||!s.setup||ctx.now>=s.setup.endsAt||s.members.some(m=>m.seatId!==own.seatId&&m.characterId===request.characterId))reject('NOT_ALLOWED');
          own.characterId=request.characterId;break;
        }
        case 'ready':{
          const own=requireMember(s,uid);if(s.status!=='reading')reject('NOT_ALLOWED');own.ready=true;startIfReady(s,ctx,tx);break;
        }
        case 'abort':
          requireHost(s,uid);if(s.status==='finished')reject('NOT_ALLOWED');if(s.state)s.state=engine.abortPlanetGame(s.state,ctx);s.status='aborted';s.setup=null;break;
        case 'issueRecovery':{
          requireHost(s,uid);const own=s.members.find(m=>m.seatId===request.seatId&&m.controller==='human')??reject('NOT_ALLOWED');
          tx.set(key('recovery',[matchId,recoveryCode]),{seatId:own.seatId,bindingRevision:own.bindingRevision,expiresAt:ctx.now+15*60_000,used:false});
          result={recoveryCode,expiresAt:ctx.now+15*60_000};break;
        }
      }
      record(tx,s,{kind:'OPERATION',operation:request.operation,requestId:request.requestId,context:ctx});
      await publish(tx,s);const response=success(result);tx.set(rk,{fingerprint,response});return response;
    });}catch(error){return failure(error instanceof Rejected?error.code:'UNAVAILABLE');}
  }
  function advanceSession(s:Session<S>,ctx:PlanetContext,tx:PlanetTransaction):boolean{
    if(s.status==='choosing'&&s.setup&&ctx.now>=s.setup.endsAt){prepare(s,ctx,tx);return true;}
    if(s.status==='reading')return startIfReady(s,ctx,tx);
    if(s.status==='boarding'){
      if(!s.setup||ctx.now<s.setup.endsAt)return false;
      // Delayed delivery starts fresh engine time now; the scheduled presentation
      // end never consumes PRE_TURN or the first ordinary turn's budget.
      initialize(s,ctx,tx);return true;
    }
    if(s.status!=='running'||!s.state)return false;
    const dueAt=deadlineAt(s.state);
    if(dueAt===null||ctx.now<dueAt)return false;
    const input={...ctx,phaseId:s.state.phase.id,...(s.state.deadlineToken?{deadlineToken:s.state.deadlineToken}:{})};
    const advanced=engine.advancePlanetDeadline(s.state,input);s.state=advanced.state;
    if(advanced.advanced)record(tx,s,{kind:'DEADLINE',context:input});
    if(s.state.phase.kind==='FINISHED')s.status='finished';
    return advanced.advanced;
  }
  async function driveBots(s:Session<S>,ctx:PlanetContext,tx:PlanetTransaction):Promise<number>{
    if(s.status!=='running'||!s.state)return 0;
    let accepted=0,attempt=0;
    for(let pass=0;pass<32&&accepted<32&&s.status==='running';pass++){
      let progressed=false;
      for(const bot of s.members.filter(m=>m.controller==='bot')){
        if(!s.state||accepted>=32)break;
        const view=engine.projectPlanetPlayer(s.state,bot.seatId),command=choosePlanetBotCommand(view);
        if(!command)continue;
        const commandId='bot-'+hash([s.matchId,bot.seatId,s.state.phase.id,view.viewRevision,command]).slice(0,32);
        const receiptKey=key('command',[s.matchId,bot.seatId,commandId]);
        if(await tx.get(receiptKey))continue;
        const index=attempt++;
        // Domain-separated deterministic streams from the recorded secure seed. Each engine
        // transition gets unique identities and its exact derived samples in the journal.
        const random=Array.from({length:64},(_,n)=>parseInt(hash(['planet-bot',ctx.random,index,n]).slice(0,13),16)/0x10000000000000);
        const next={...ctx,nextPhaseId:ctx.nextPhaseId+'-b'+index,nextDeadlineToken:ctx.nextDeadlineToken+'-b'+index,random};
        const request:PlanetCommandRequest={protocolVersion:3,matchId:s.matchId,phaseId:s.state.phase.id,commandId,command};
        const applied=engine.applyPlanetCommand(s.state,bot.seatId,request,next);
        const receipt=PlanetReceiptSchema.parse(applied.receipt);
        tx.set(receiptKey,{fingerprint:hash({operation:'command',request}),response:success({receipt})});
        if(receipt.status==='accepted'){
          record(tx,s,{actorSeatId:bot.seatId,kind:'COMMAND',controller:'bot',request,context:next,receipt});
          s.state=applied.state;accepted++;progressed=true;
          if(s.state.phase.kind==='FINISHED'){s.status='finished';break;}
        }
      }
      if(!progressed)break;
    }return accepted;
  }
  async function runDeadline(job:Pick<PlanetDeadlineJob,'matchId'|'phaseId'|'deadlineToken'|'kind'>):Promise<{status:'advanced'|'unchanged'|'too-early';retryAfterMs?:number}>{
    const ctx=context();
    return store.transaction(async tx=>{
      ctx.now=clock();
      const jobKey='deadline/'+hash([job.matchId,job.phaseId,job.deadlineToken]);
      const stored=await tx.get<PlanetDeadlineJob>(jobKey);
      if(!stored||stored.kind!==job.kind||stored.status==='complete')return {status:'unchanged' as const};
      const complete=()=>tx.set(jobKey,{...stored,status:'complete'});
      const exists=await tx.get<Session<S>>(matchKey(job.matchId));
      const s=exists?await load(tx,job.matchId):null;
      if(!s||!['choosing','reading','boarding','running'].includes(s.status)){complete();return {status:'unchanged' as const};}
      const timer=job.kind==='setup'?s.setup:s.state?{id:s.state.phase.id,token:s.state.deadlineToken,endsAt:deadlineAt(s.state)}:null;
      if(!timer||timer.id!==job.phaseId||timer.token!==job.deadlineToken||timer.endsAt===null){complete();return {status:'unchanged' as const};}
      if(ctx.now<timer.endsAt)return {status:'too-early' as const,retryAfterMs:timer.endsAt-ctx.now};
      const advanced=advanceSession(s,ctx,tx);await driveBots(s,{...ctx,nextPhaseId:ctx.nextPhaseId+'-bots',nextDeadlineToken:ctx.nextDeadlineToken+'-bots'},tx);
      await publish(tx,s);
      complete();
      return {status:advanced?'advanced' as const:'unchanged' as const};
    });
  }
  async function repairDeadlines(enqueue:(job:PlanetDeadlineJob)=>Promise<void>):Promise<{dispatched:number;advanced:number;failed:number}>{
    const counts={dispatched:0,advanced:0,failed:0};
    for(const path of await store.listKeys('deadline',100)){
      const job=await store.transaction(tx=>tx.get<PlanetDeadlineJob>(path));
      if(!job||job.status==='complete'||clock()<job.nextAttemptAt)continue;
      try{
        if(clock()>=job.endsAt){
          const result=await runDeadline(job);if(result.status==='too-early')continue;if(result.status==='advanced')counts.advanced++;
        }else{
          await enqueue(job);
          await store.transaction(async tx=>{const current=await tx.get<PlanetDeadlineJob>(path);if(current&&current.status!=='complete')tx.set(path,{...current,status:'dispatched',nextAttemptAt:job.endsAt+10_000});});
          counts.dispatched++;
        }
      }catch{
        counts.failed++;
        // A failing entry must not permanently occupy the first page ahead of other
        // due matches. Keep it repairable and give the next scan a bounded backoff.
        await store.transaction(async tx=>{const current=await tx.get<PlanetDeadlineJob>(path);
          if(current&&current.status!=='complete')tx.set(path,{...current,nextAttemptAt:clock()+30_000});});
      }
    }return counts;
  }
  async function dispatchDeadline(taskId:string,enqueue:(job:PlanetDeadlineJob)=>Promise<void>):Promise<void>{
    const path='deadline/'+taskId,job=await store.transaction(tx=>tx.get<PlanetDeadlineJob>(path));
    if(!job||job.status==='complete')return;
    await enqueue(job);
    await store.transaction(async tx=>{const current=await tx.get<PlanetDeadlineJob>(path);if(current&&current.status!=='complete')tx.set(path,{...current,status:'dispatched',nextAttemptAt:job.endsAt+10_000});});
  }
  async function runBots(matchId:string):Promise<{accepted:number}>{
    const ctx=context();return store.transaction(async tx=>{ctx.now=clock();const s=await load(tx,matchId);
      const accepted=await driveBots(s,ctx,tx);if(accepted)await publish(tx,s);return {accepted};});
  }
  return {handle,runDeadline,repairDeadlines,dispatchDeadline,runBots};
}

/** Deliberately simple practice policy. It sees only its own authorized player projection. */
export function choosePlanetBotCommand(view:PlanetPlayerView):PlanetCommandRequest['command']|null{
  const offer=(type:PlanetCommandRequest['command']['type'])=>view.offers.find(o=>o.type===type);
  const first=(type:PlanetCommandRequest['command']['type'])=>offer(type)?.targetSeatIds[0];
  if(offer('DECLARE_HACK_SIDE'))return {type:'DECLARE_HACK_SIDE',declaredSide:view.self.faction};
  const officer=first('APPOINT_OFFICER');if(officer)return {type:'APPOINT_OFFICER',targetSeatId:officer};
  const block=first('BLOCK_MOVE');if(block)return {type:'BLOCK_MOVE',targetSeatId:block};
  if(offer('ACTIVATE_BLACKHOLE'))return {type:'ACTIVATE_BLACKHOLE'};
  if(offer('CHOOSE_NAV_DIRECTION'))return {type:'CHOOSE_NAV_DIRECTION',direction:view.self.faction==='Red'?'Red':'Blue'};
  if(offer('CONFIRM_NAVIGATION'))return {type:'CONFIRM_NAVIGATION'};
  if(offer('VOTE'))return {type:'VOTE',targetSeatId:first('VOTE')??null};
  if(offer('SELECT_BLACKOUT_SLOT')&&view.blackoutTargeting?.selectable){
    const slotId=offer('SELECT_BLACKOUT_SLOT')!.slotIds[0];
    if(slotId)return {type:'SELECT_BLACKOUT_SLOT',windowId:view.blackoutTargeting.windowId,slotId};
  }
  if(view.activeSeatId!==view.self.seatId||view.phase.kind!=='ORDINARY_TURN')return null;
  if(offer('ACTIVATE_SHIP_HACK'))return {type:'ACTIVATE_SHIP_HACK'};
  if(offer('ENGINEER_SUPPRESS'))return {type:'ENGINEER_SUPPRESS'};
  if(offer('ACTIVATE_CLONE'))return {type:'ACTIVATE_CLONE'};
  if(offer('REQUEST_BLACKOUT'))return {type:'REQUEST_BLACKOUT'};
  const rescue=first('RESCUE');if(rescue)return {type:'RESCUE',targetSeatId:rescue};
  const protect=first('PROTECT');if(protect)return {type:'PROTECT',targetSeatId:protect};
  const supply=offer('SUPPLY')?.targetSeatIds;if(supply&&supply.length>=2)return {type:'SUPPLY',targetSeatIds:supply.slice(0,2)};
  const scan=offer('SCAN')?.targetSeatIds.find(id=>!view.knowledge.scanResults.some(s=>s.targetSeatId===id))??first('SCAN');
  if(scan)return {type:'SCAN',targetSeatId:scan,guess:scan===view.self.seatId?view.self.faction:scan===view.knowledge.knownUndercoverSeatId?'Red':'Blue'};
  const shot=first('REGISTER_SHOT');if(shot)return {type:'REGISTER_SHOT',targetSeatId:shot};
  const talk=first('REQUEST_HACK');if(talk)return {type:'REQUEST_HACK',targetSeatId:talk};
  if(offer('PASS_TURN'))return {type:'PASS_TURN'};
  return null;
}
