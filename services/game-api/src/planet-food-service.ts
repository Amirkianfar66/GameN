import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {parseFoodTaskReceipt,PlanetReceiptSchema,PLANET_FOOD_TASK_PINS,FOOD_TASK_TRANSPORT} from '@mothership/contracts';
import type {FoodTaskCommandRequest,FoodTaskReceipt,FoodTaskPublicView,FoodTaskPlayerView,
  PlanetCommandRequest,PlanetReceipt,PlanetServiceRequest,PlanetServiceResponse,PlanetSessionSnapshot,PlanetVersions,SeatId} from '@mothership/contracts';
import type {PlanetContext,PlanetDeadlineJob,PlanetEnginePort,PlanetPersistence,PlanetReadTransaction,PlanetStateEnvelope,PlanetTransaction} from './planet-game.js';
import {chooseFoodBotInput} from './food-bot-policy.js';

export const FOOD_PRESENCE_LEASE_MS=FOOD_TASK_TRANSPORT.presenceLeaseMs;
export const FOOD_HEARTBEAT_INTERVAL_MS=FOOD_TASK_TRANSPORT.heartbeatMs;
export const FOOD_SNAPSHOT_INTERVAL_MS=FOOD_TASK_TRANSPORT.snapshotMs;
/** Technical single-driver lease, independent of gameplay deadlines and human presence. */
export const FOOD_BOT_WORKER_LEASE_MS=8_000;
export const FOOD_BOT_WALL_BUDGET_MS=20_000;
const MAX_BOUNDARIES_PER_COMMIT=32,MAX_PREFIX_COMMITS=128,MAX_BOT_INPUTS=32;
type FailureCode=Extract<PlanetServiceResponse,{ok:false}>['error']['code'];
type Request=PlanetServiceRequest;
type FoodOperation=Extract<Request,{operation:'foodCommand'|'foodReceipt'|'foodHeartbeat'}>;
type Engine<S extends PlanetStateEnvelope>=PlanetEnginePort<S>&{
  applyPlanetFoodCommand:(state:S,actor:SeatId,request:FoodTaskCommandRequest,context:PlanetContext)=>{state:S;receipt:FoodTaskReceipt};
  setPlanetFoodPresence:(state:S,actor:SeatId,online:boolean,context:PlanetContext)=>S;
  projectPlanetFoodPublic:(state:S,serverNowMs:number)=>FoodTaskPublicView;
  projectPlanetFoodPlayer:(state:S,actor:SeatId,serverNowMs:number)=>FoodTaskPlayerView;
};
interface Lease {taskId:string;expiresAt:number;offline:boolean}
interface Scheduler {phaseId:string;token:string;endsAt:number}
export interface FoodServiceState {leases:Partial<Record<SeatId,Lease>>;botWakes:Partial<Record<SeatId,number>>;scheduler:Scheduler|null}
export interface FoodServiceSession<S extends PlanetStateEnvelope> {
  matchId:string;versions:PlanetVersions;hostUid:string;status:PlanetSessionSnapshot['status'];state:S|null;
  members:Array<{seatId:SeatId;uid:string|null;bindingRevision:number;controller:'human'|'bot'}>;
  displays:string[];admissions:Array<{uid:string}>;
  setup:unknown;foodService?:FoodServiceState;
}
interface Control {nextSequence:number;processedSequence:number;lastAdmittedAt:number;advancedThroughAt:number}
interface Stored {fingerprint:string;response:PlanetServiceResponse}
interface Entry {
  sequence:number;matchId:string;uid:string|null;actorSeatId:SeatId|null;bindingRevision:number|null;
  request:Request|null;fingerprint:string;context:PlanetContext;boundaryOrdinal:number;
  receiptPath:string|null;botIntentPath:string|null;recoveryCode:string|null;
  job:Pick<PlanetDeadlineJob,'phaseId'|'deadlineToken'|'kind'>|null;
  response:PlanetServiceResponse|null;
}
interface Pending {sequence:number;fingerprint:string}
interface AdmissionResult {sequence:number;response:PlanetServiceResponse|null;refresh?:true}
interface BotIntent {sequence:number;request:Request;retryAt:number|null;done:boolean}
interface BotWorkerLease {owner:string;expiresAt:number}
class LostBotWorkerLease extends Error {}
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const key=(scope:string,value:unknown)=>scope+'/'+hash(value);
const controlKey=(matchId:string)=>'foodIngressControl/'+matchId;
const workerKey=(matchId:string)=>'foodBotWorker/'+matchId;
const entryKey=(matchId:string,n:number)=>'foodIngress/'+matchId+'/'+String(n).padStart(16,'0');
const freshControl=():Control=>({nextSequence:1,processedSequence:0,lastAdmittedAt:0,advancedThroughAt:0});
const isFood=(s:{versions:PlanetVersions})=>s.versions.engineVersion===PLANET_FOOD_TASK_PINS.engineVersion;
const foodOperation=(q:Request):q is FoodOperation=>q.operation==='foodCommand'||q.operation==='foodReceipt'||q.operation==='foodHeartbeat';
const matchOf=(q:Request):string|null=>q.operation==='create'||q.operation==='requestAdmission'?null:
  q.operation==='command'||q.operation==='foodCommand'?q.request.matchId:q.matchId;
const uuid=(value:unknown)=>{const h=hash(value);return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};

/** Private candidate coordinator. No Firebase globals, nested transactions or historical clock changes. */
export function createPlanetFoodCoordinator<S extends PlanetStateEnvelope,T extends FoodServiceSession<S>>(d:{
  store:PlanetPersistence;engine:PlanetEnginePort<S>;clock:()=>number;newId:()=>string;
  newContext:()=>PlanetContext;newRecoveryCode:()=>string;
  waitForBotWake?:(delayMs:number)=>Promise<void>;
  load:(tx:PlanetReadTransaction,matchId:string)=>Promise<T>;
  publish:(tx:PlanetTransaction,s:T,ctx?:PlanetContext)=>Promise<void>;
  record:(tx:PlanetTransaction,s:T,event:Record<string,unknown>)=>void;
  snapshot:(s:T,uid:string,serverNowMs?:number)=>PlanetSessionSnapshot;
  chooseOrdinaryBot:(view:ReturnType<PlanetEnginePort<S>['projectPlanetPlayer']>)=>PlanetCommandRequest['command']|null;
  limit:(tx:PlanetTransaction,uid:string,now:number)=>Promise<void>;
  reject:(code:FailureCode)=>never;
}){
  const {store,clock}=d;
  const readOnly=<R>(operation:(tx:PlanetReadTransaction)=>Promise<R>):Promise<R>=>
    store.readOnly?store.readOnly(operation):store.transaction(operation);
  const engine=()=>{
    for(const name of ['applyPlanetFoodCommand','setPlanetFoodPresence','projectPlanetFoodPublic','projectPlanetFoodPlayer'] as const)
      if(typeof d.engine[name]!=='function')throw new Error('Food runtime ports required');
    return d.engine as Engine<S>;
  };
  const response=(result:unknown,at:number):PlanetServiceResponse=>({ok:true,serverTimeMs:at,result});
  const member=(s:T,uid:string)=>s.members.find(m=>m.controller==='human'&&m.uid===uid);
  const own=(s:T,uid:string)=>member(s,uid)??d.reject('FORBIDDEN');
  const participant=(s:T,uid:string)=>s.hostUid===uid||!!member(s,uid)||s.displays.includes(uid);
  const host=(s:T,uid:string)=>{if(s.hostUid!==uid)d.reject('FORBIDDEN');};
  const service=(s:T)=>s.foodService??=( {leases:{},botWakes:{},scheduler:null} );
  const receiptPath=(q:Request,uid:string,actor:SeatId|null):string|null=>q.operation==='foodCommand'
    ?key('food-command',[q.request.matchId,actor,q.request.commandId]):q.operation==='command'
      ?key('command',[q.request.matchId,actor,q.request.commandId]):'requestId' in q?key('operation',[uid,q.requestId]):null;
  function derived(root:PlanetContext,n:number,at:number):PlanetContext{
    const base=[root.nextPhaseId,root.nextDeadlineToken,root.random,n];
    return {now:at,nextPhaseId:uuid([...base,'phase']),nextDeadlineToken:uuid([...base,'deadline']),
      random:Array.from({length:64},(_,i)=>parseInt(hash([...base,'random',i]).slice(0,13),16)/0x10000000000000),
      foodIds:{requestId:uuid([...base,'request']),taskId:uuid([...base,'task']),
        winchControlSessionId:uuid([...base,'winch']),panelControlSessionId:uuid([...base,'panel'])}};
  }
  async function inspect(matchId:string):Promise<T|null>{return readOnly(tx=>tx.get<T>('session/'+matchId));}
  const technicalContext=(owner:string,now:number):PlanetContext=>({now,nextPhaseId:owner,nextDeadlineToken:d.newId(),random:[]});
  async function acquireWorker(matchId:string):Promise<string|null>{
    const owner=d.newId();
    return store.transaction(async tx=>{
      // Every multi-key Food transaction locks the session before worker/control/entry records.
      const s=await d.load(tx,matchId);
      const previous=await tx.get<BotWorkerLease>(workerKey(matchId)),now=clock();
      if(previous&&previous.expiresAt>now)return null;
      if(s.status!=='running'||!s.state)return null;
      tx.set(workerKey(matchId),{owner,expiresAt:now+FOOD_BOT_WORKER_LEASE_MS} satisfies BotWorkerLease);
      // Acquiring and its recovery wake commit together; this namespace does not trigger runBots.
      await d.publish(tx,s,technicalContext(owner,now));
      return owner;
    });
  }
  async function refreshWorker(matchId:string,owner:string):Promise<boolean>{
    return store.transaction(async tx=>{
      const s=await d.load(tx,matchId);
      const lease=await tx.get<BotWorkerLease>(workerKey(matchId)),now=clock();
      if(!lease||lease.owner!==owner||lease.expiresAt<=now)return false;
      if(s.status!=='running'||!s.state)return false;
      if(lease.expiresAt-now>FOOD_BOT_WORKER_LEASE_MS/2)return true;
      tx.set(workerKey(matchId),{owner,expiresAt:now+FOOD_BOT_WORKER_LEASE_MS} satisfies BotWorkerLease);
      await d.publish(tx,s,technicalContext(owner,now));
      return true;
    });
  }
  async function releaseWorker(matchId:string,owner:string):Promise<void>{
    await store.transaction(async tx=>{
      const s=await d.load(tx,matchId);
      const lease=await tx.get<BotWorkerLease>(workerKey(matchId));
      if(!lease||lease.owner!==owner)return;
      tx.delete(workerKey(matchId));
      // Re-arm any bot window suppressed while owned, in the same commit as release.
      await d.publish(tx,s,technicalContext(owner,clock()));
    });
  }
  async function limitFood(tx:PlanetTransaction,uid:string,q:Request|null,at:number):Promise<void>{
    const c=q?.operation==='foodCommand'?q.request.command:null;
    const closure=c?.type==='TASK_PRESS'&&(c.input.kind==='HOLD_RECOVER_OFF'||c.input.kind==='HOLD'&&c.input.edge==='UP');
    const budget=q?.operation==='read'?'snapshot':q?.operation==='foodHeartbeat'?'presence':closure?'closure'
      :q?.operation==='foodCommand'||q?.operation==='command'?'input':'control';
    const path=key('foodTransportRate',[uid,budget]),old=await tx.get<{since:number;count:number}>(path);
    const current=!old||at-old.since>=60_000?{since:at,count:0}:old;
    if(current.count>=FOOD_TASK_TRANSPORT.requestsPerMinute[budget])d.reject('RATE_LIMITED');
    tx.set(path,{...current,count:current.count+1});
  }
  function renewOwnConnection(s:T,actor:SeatId|null,ctx:PlanetContext,tx:PlanetTransaction,sequence:number):void{
    if(actor===null||!s.state||s.status!=='running')return;
    const e=engine(),p=e.projectPlanetFoodPlayer(s.state,actor,ctx.now).participantTask;
    if(!p||p.stage==='ENDED'||!p.people.find(person=>person.seatId===actor)?.alive)return;
    const f=service(s),lease=f.leases[actor];
    if(!lease||lease.taskId!==p.taskId)return;
    if(lease.offline){
      s.state=e.setPlanetFoodPresence(s.state,actor,true,ctx);
      d.record(tx,s,{kind:'FOOD_PRESENCE',actorSeatId:actor,online:true,context:ctx,ingressSequence:sequence});
    }
    f.leases[actor]={taskId:p.taskId,expiresAt:ctx.now+FOOD_PRESENCE_LEASE_MS,offline:false};
  }

  /** Called by the enclosing publisher. Wrapper timing is private and never overwrites public phase time/token. */
  async function schedule(tx:PlanetTransaction,s:T,ctx:PlanetContext):Promise<void>{
    if(!isFood(s)||!s.state)return;
    const f=service(s),control=await tx.get<Control>(controlKey(s.matchId));
    const worker=await tx.get<BotWorkerLease>(workerKey(s.matchId)),technicalNow=clock();
    const live=s.status==='running'&&worker!==null&&worker.expiresAt>technicalNow;
    const times=[...(s.status==='running'?[d.engine.planetDeadlineAt(s.state),...Object.values(f.leases).filter(l=>l&&!l.offline).map(l=>l!.expiresAt),
      ...Object.values(f.botWakes).filter(at=>!live||at!==undefined&&at>technicalNow)]:[]),
      ...(live?[worker.expiresAt]:[]),...(control&&control.processedSequence<control.nextSequence-1?[ctx.now]:[])]
      .filter((v):v is number=>typeof v==='number');
    const at=times.length?Math.min(...times):null;
    if(at===null){f.scheduler=null;return;}
    const prior=f.scheduler;
    const old=prior?await tx.get<PlanetDeadlineJob>('deadline/'+hash([s.matchId,prior.phaseId,prior.token])):null;
    if(prior&&prior.phaseId===s.state.phase.id&&prior.endsAt===at&&old?.status!=='complete')return;
    const token=uuid(['food-scheduler',ctx.nextDeadlineToken,s.state.phase.id,at]);
    f.scheduler={phaseId:s.state.phase.id,token,endsAt:at};
    const taskId=hash([s.matchId,s.state.phase.id,token]);
    const path='deadline/'+taskId,existing=await tx.get<PlanetDeadlineJob>(path);
    if(!existing)tx.set(path,{matchId:s.matchId,phaseId:s.state.phase.id,deadlineToken:token,endsAt:at,kind:'game',
      taskId,status:'pending',nextAttemptAt:Math.min(ctx.now,at)} satisfies PlanetDeadlineJob);
  }
  function authorize(s:T,uid:string,q:Request):SeatId|null{
    if(q.operation==='redeemRecovery')return member(s,uid)?.seatId??null;
    if(!participant(s,uid))d.reject('FORBIDDEN');
    if(q.operation==='foodCommand'||q.operation==='foodReceipt'||q.operation==='foodHeartbeat'||q.operation==='command'||q.operation==='receipt')return own(s,uid).seatId;
    if(q.operation==='advance'||q.operation==='runBots'||q.operation==='abort'||q.operation==='issueRecovery')host(s,uid);
    return member(s,uid)?.seatId??null;
  }
  async function admit(matchId:string,uid:string|null,q:Request|null,options:{
    bot?:SeatId;job?:Entry['job'];dedup?:string;workerOwner?:string;
  }={}):Promise<AdmissionResult>{
    let sampled:PlanetContext|undefined,recoveryCode:string|undefined;
    return store.transaction(async tx=>{
      const s=await d.load(tx,matchId);if(!isFood(s))d.reject('NOT_ALLOWED');engine();
      let actor:SeatId|null=null,binding:number|null=null;
      if(options.bot){
        const bot=s.members.find(m=>m.controller==='bot'&&m.seatId===options.bot)??d.reject('FORBIDDEN');
        actor=bot.seatId;binding=bot.bindingRevision;
        const prior=await tx.get<BotIntent>(key('foodBotIntent',[matchId,options.bot]));
        if(prior&&!prior.done){const pending=await tx.get<Entry>(entryKey(matchId,prior.sequence));
          if(!pending)throw new Error('Missing bot input');return {sequence:prior.sequence,response:pending.response};}
      }else if(uid!==null&&q){actor=authorize(s,uid,q);binding=actor?s.members.find(m=>m.seatId===actor)!.bindingRevision:null;}
      const fingerprint=hash(q??{clock:options.job??'read'});
      const rk=q?receiptPath(q,uid??'server-bot',actor):null;
      if(rk){
        const previous=await tx.get<Stored>(rk);
        if(previous){if(previous.fingerprint!==fingerprint)d.reject(q?.operation==='foodCommand'||q?.operation==='command'?'COMMAND_ID_CONFLICT':'REQUEST_ID_CONFLICT');
          return {sequence:0,response:previous.response};}
      }
      const dk=rk?key('foodPending',rk):options.dedup??null;
      if(dk){const previous=await tx.get<Pending>(dk);if(previous){
        if(previous.fingerprint!==fingerprint)d.reject('COMMAND_ID_CONFLICT');
        const entry=await tx.get<Entry>(entryKey(matchId,previous.sequence));
        if(!entry)throw new Error('Missing admitted Food input');
        return {sequence:previous.sequence,response:entry.response};}}
      let sourceJob:PlanetDeadlineJob|null=null;
      if(options.job){
        const current=service(s).scheduler;
        sourceJob=await tx.get<PlanetDeadlineJob>('deadline/'+hash([matchId,options.job.phaseId,options.job.deadlineToken]));
        if(!sourceJob||sourceJob.status==='complete'||!s.state||!current
          ||current.phaseId!==options.job.phaseId||current.token!==options.job.deadlineToken)
          return {sequence:0,response:response({advanced:false},clock())};
      }
      const control=await tx.get<Control>(controlKey(matchId))??freshControl();
      // Only a committed attempt's sample becomes authority. A failed SDK attempt has no receipt point.
      const at=clock();if(!Number.isSafeInteger(at)||at<control.lastAdmittedAt||at<control.advancedThroughAt)throw new Error('Backward Food admission clock');
      if(options.workerOwner!==undefined){
        const lease=await tx.get<BotWorkerLease>(workerKey(matchId));
        if(!lease||lease.owner!==options.workerOwner||lease.expiresAt<=at)throw new LostBotWorkerLease();
      }
      if(options.bot&&q?.operation==='foodCommand'&&q.request.command.type==='TASK_PRESS'){
        const due=s.state?engine().planetDeadlineAt(s.state):null;
        const presenceDue=Object.values(service(s).leases).some(l=>l&&!l.offline&&l.expiresAt<=at);
        // This is still an uncommitted proposal. Recheck after every SDK retry at
        // the actual admission clock, never retime an already-admitted input.
        if(!s.state||s.status!=='running'||control.processedSequence<control.nextSequence-1
          ||due!==null&&due<=at||presenceDue)return {sequence:0,response:null,refresh:true};
        const fresh=chooseFoodBotInput(engine().projectPlanetFoodPlayer(s.state,options.bot,at)).command;
        if(fresh===null||hash(fresh)!==hash(q.request.command))return {sequence:0,response:null,refresh:true};
      }
      if(sourceJob){
        const lease=await tx.get<BotWorkerLease>(workerKey(matchId));
        const physical=s.state?engine().planetDeadlineAt(s.state):null;
        const presenceDue=Object.values(service(s).leases).some(l=>l&&!l.offline&&l.expiresAt<=at);
        if(lease&&lease.expiresAt>at&&!(physical!==null&&physical<=at)&&!presenceDue){
          // Atomic with the lease check: a bot-only delivery cannot race a newly
          // acquired owner and amplify the queue with another redundant CLOCK.
          tx.set('deadline/'+sourceJob.taskId,{...sourceJob,status:'complete'});
          await d.publish(tx,s,technicalContext(lease.owner,at));
          const pending=control.processedSequence<control.nextSequence-1;
          return {sequence:pending?control.nextSequence-1:0,response:pending?null:response({advanced:false},at)};
        }
      }
      // Exact own retries/lookup have already returned; only a genuinely new authenticated admission spends rate budget.
      if(uid!==null)await limitFood(tx,uid,q,at);
      sampled??=d.newContext();
      if(!sampled.foodIds)sampled.foodIds={requestId:d.newId(),taskId:d.newId(),winchControlSessionId:d.newId(),panelControlSessionId:d.newId()};
      const ctx={...structuredClone(sampled),now:at};
      if(q?.operation==='redeemRecovery'){
        const token=await tx.get<{seatId:SeatId;bindingRevision:number;expiresAt:number;used:boolean}>(key('recovery',[matchId,q.recoveryCode]));
        if(!token||token.used||at>=token.expiresAt||member(s,uid!))d.reject('FORBIDDEN');
        const target=s.members.find(m=>m.seatId===token.seatId&&m.controller==='human'&&m.bindingRevision===token.bindingRevision);
        if(!target)d.reject('FORBIDDEN');actor=target.seatId;binding=target.bindingRevision;
      }
      if(q?.operation==='issueRecovery')recoveryCode??=d.newRecoveryCode();
      const sequence=control.nextSequence;
      if(!Number.isSafeInteger(sequence+1))throw new Error('Food ingress sequence exhausted');
      const entry:Entry={sequence,matchId,uid,actorSeatId:actor,bindingRevision:binding,request:q,fingerprint,context:ctx,
        boundaryOrdinal:0,receiptPath:rk,botIntentPath:options.bot?key('foodBotIntent',[matchId,options.bot]):null,
        recoveryCode:recoveryCode??null,job:options.job??null,response:null};
      tx.set(entryKey(matchId,sequence),entry);
      tx.set(controlKey(matchId),{...control,nextSequence:sequence+1,lastAdmittedAt:at});
      if(dk)tx.set(dk,{sequence,fingerprint} satisfies Pending);
      if(entry.botIntentPath&&q)tx.set(entry.botIntentPath,{sequence,request:q,retryAt:null,done:false} satisfies BotIntent);
      // Admission itself has no gameplay publication; the private pending prefix still gets a durable wake.
      await d.publish(tx,s,ctx);
      return {sequence,response:null};
    });
  }

  function syncParticipants(s:T,at:number):void{
    if(!s.state||s.status!=='running'){if(s.foodService){s.foodService.leases={};s.foodService.botWakes={};}return;}
    const e=engine(),f=service(s),pub=e.projectPlanetFoodPublic(s.state,at);
    const active=new Set<SeatId>();
    if(pub.step?.kind==='AWAY')for(const id of pub.step.awaySeatIds){
      const m=s.members.find(m=>m.seatId===id);if(!m||m.controller==='bot')continue;
      const p=e.projectPlanetFoodPlayer(s.state,id,at).participantTask;
      if(!p||p.stage==='ENDED'||!p.people.find(person=>person.seatId===id)?.alive)continue;
      active.add(id);
      if(f.leases[id]?.taskId!==p.taskId)f.leases[id]={taskId:p.taskId,expiresAt:p.startedAt+FOOD_PRESENCE_LEASE_MS,offline:false};
    }
    for(const id of Object.keys(f.leases) as SeatId[])if(!active.has(id))delete f.leases[id];
  }
  function drainBoundaries(s:T,entry:Entry,tx:PlanetTransaction):boolean{
    if(!s.state||s.status!=='running')return true;
    syncParticipants(s,entry.context.now);
    const f=service(s),e=engine();
    for(let pass=0;pass<MAX_BOUNDARIES_PER_COMMIT;pass++){
      const due=e.planetDeadlineAt(s.state!);
      const absence=Object.entries(f.leases).filter(([,l])=>l&&!l.offline).sort(([a,x],[b,y])=>x!.expiresAt-y!.expiresAt||Number(a.slice(5))-Number(b.slice(5)))[0];
      const absentAt=absence?.[1]?.expiresAt??null;
      const earliest=due===null?absentAt:absentAt===null?due:Math.min(due,absentAt);
      if(earliest===null||earliest>entry.context.now)return true;
      const ctx=derived(entry.context,entry.boundaryOrdinal++,earliest);
      if(due!==null&&due===earliest){
        ctx.phaseId=s.state!.phase.id;if(s.state!.deadlineToken)ctx.deadlineToken=s.state!.deadlineToken;
        const advanced=e.advancePlanetDeadline(s.state!,ctx);
        if(!advanced.advanced)throw new Error('Due Food boundary made no progress');
        s.state=advanced.state;d.record(tx,s,{kind:'DEADLINE',context:ctx,ingressSequence:entry.sequence});
        if(s.state.phase.kind==='FINISHED')s.status='finished';
      }else{
        const id=absence![0] as SeatId,lease=f.leases[id]!;
        lease.offline=true;
        s.state=e.setPlanetFoodPresence(s.state!,id,false,ctx);
        d.record(tx,s,{kind:'FOOD_PRESENCE',actorSeatId:id,online:false,context:ctx,ingressSequence:entry.sequence});
      }
      syncParticipants(s,earliest);
      if(s.status!=='running')return true;
    }
    return false;
  }
  async function apply(s:T,entry:Entry,tx:PlanetTransaction):Promise<PlanetServiceResponse>{
    const q=entry.request,ctx=entry.context,e=engine();
    if(!q)return response({advanced:entry.boundaryOrdinal>0},ctx.now);
    // A queued recovery is itself ordered. Later inputs admitted against its old committed
    // binding cannot acquire authority after that earlier recovery has revoked the identity.
    if(entry.uid!==null&&q.operation!=='redeemRecovery'){
      const current=authorize(s,entry.uid,q);
      if(current!==entry.actorSeatId||current!==null&&s.members.find(m=>m.seatId===current)?.bindingRevision!==entry.bindingRevision)d.reject('FORBIDDEN');
    }else if(entry.botIntentPath&&!s.members.some(m=>m.controller==='bot'&&m.seatId===entry.actorSeatId&&m.bindingRevision===entry.bindingRevision))d.reject('FORBIDDEN');
    if(q.operation==='read'){renewOwnConnection(s,entry.actorSeatId,ctx,tx,entry.sequence);return response(d.snapshot(s,entry.uid!,ctx.now),ctx.now);}
    if(q.operation==='advance'||q.operation==='runBots')return response(q.operation==='advance'?{advanced:entry.boundaryOrdinal>0}:{accepted:0},ctx.now);
    if(q.operation==='foodCommand'){
      if(!s.state)d.reject('NOT_ALLOWED');
      const applied=e.applyPlanetFoodCommand(s.state,entry.actorSeatId!,q.request,ctx);
      const receipt=parseFoodTaskReceipt(applied.receipt,q.request,entry.actorSeatId!);if(!receipt)throw new Error('Missing Food receipt');s.state=applied.state;
      if(receipt.receivedAt!==ctx.now)throw new Error('Food engine retimed admitted input');
      d.record(tx,s,{kind:'FOOD_COMMAND',actorSeatId:entry.actorSeatId,request:q.request,context:ctx,receipt,ingressSequence:entry.sequence,
        ...(entry.botIntentPath?{controller:'bot'}:{})});
      renewOwnConnection(s,entry.actorSeatId,ctx,tx,entry.sequence);
      return response({receipt},ctx.now);
    }
    if(q.operation==='command'){
      if(s.status!=='running'||!s.state)d.reject('NOT_ALLOWED');
      const applied=e.applyPlanetCommand(s.state,entry.actorSeatId!,q.request,ctx),receipt=PlanetReceiptSchema.parse(applied.receipt);
      if(receipt.matchId!==q.request.matchId||receipt.phaseId!==q.request.phaseId||receipt.commandId!==q.request.commandId)throw new Error('Ordinary receipt binding mismatch');
      s.state=applied.state;
      d.record(tx,s,{kind:'COMMAND',actorSeatId:entry.actorSeatId,request:q.request,context:ctx,receipt,
        ingressSequence:entry.sequence,...(entry.botIntentPath?{controller:'bot'}:{})});
      renewOwnConnection(s,entry.actorSeatId,ctx,tx,entry.sequence);
      return response({receipt},ctx.now);
    }
    if(q.operation==='foodHeartbeat'){
      if(s.status!=='running'||!s.state)d.reject('NOT_ALLOWED');
      const p=e.projectPlanetFoodPlayer(s.state,entry.actorSeatId!,ctx.now).participantTask;
      if(!p||p.taskId!==q.taskId||p.stage==='ENDED'||!p.people.find(x=>x.seatId===entry.actorSeatId)?.alive)d.reject('NOT_ALLOWED');
      const f=service(s),lease=f.leases[entry.actorSeatId!];
      if(!lease||lease.taskId!==q.taskId)d.reject('NOT_ALLOWED');
      if(lease.offline){
        s.state=e.setPlanetFoodPresence(s.state,entry.actorSeatId!,true,ctx);
        d.record(tx,s,{kind:'FOOD_PRESENCE',actorSeatId:entry.actorSeatId,online:true,context:ctx,ingressSequence:entry.sequence});
      }
      f.leases[entry.actorSeatId!]={taskId:q.taskId,expiresAt:ctx.now+FOOD_PRESENCE_LEASE_MS,offline:false};
      d.record(tx,s,{kind:'FOOD_HEARTBEAT',actorSeatId:entry.actorSeatId,taskId:q.taskId,
        leaseExpiresAt:ctx.now+FOOD_PRESENCE_LEASE_MS,context:ctx,ingressSequence:entry.sequence});
      return response({renewed:true},ctx.now);
    }
    if(q.operation==='abort'){
      if(s.status==='finished')d.reject('NOT_ALLOWED');
      if(s.state)s.state=e.abortPlanetGame(s.state,ctx);s.status='aborted';s.setup=null;
    }else if(q.operation==='issueRecovery'){
      const m=s.members.find(m=>m.seatId===q.seatId&&m.controller==='human')??d.reject('NOT_ALLOWED');
      tx.set(key('recovery',[s.matchId,entry.recoveryCode]),{seatId:m.seatId,bindingRevision:m.bindingRevision,expiresAt:ctx.now+15*60_000,used:false});
      d.record(tx,s,{kind:'OPERATION',operation:q.operation,requestId:q.requestId,context:ctx,ingressSequence:entry.sequence});
      return response({recoveryCode:entry.recoveryCode,expiresAt:ctx.now+15*60_000},ctx.now);
    }else if(q.operation==='redeemRecovery'){
      const path=key('recovery',[s.matchId,q.recoveryCode]);
      const token=await tx.get<{seatId:SeatId;bindingRevision:number;expiresAt:number;used:boolean}>(path);
      if(!token||token.used||ctx.now>=token.expiresAt)d.reject('FORBIDDEN');
      const m=s.members.find(m=>m.seatId===token.seatId&&m.controller==='human'&&m.bindingRevision===token.bindingRevision);
      if(!m||member(s,entry.uid!))d.reject('FORBIDDEN');
      const oldUid=m.uid;m.uid=entry.uid;m.bindingRevision++;
      s.admissions=s.admissions.filter(a=>a.uid!==oldUid&&a.uid!==entry.uid);
      s.displays=s.displays.filter(id=>id!==oldUid&&id!==entry.uid);
      if(s.hostUid===oldUid)s.hostUid=entry.uid!;
      token.used=true;tx.set(path,token);
      d.record(tx,s,{kind:'RECOVER',seatId:m.seatId,bindingRevision:m.bindingRevision,ingressSequence:entry.sequence});
      return response({matchId:s.matchId,seatId:m.seatId},ctx.now);
    }else d.reject('NOT_ALLOWED');
    d.record(tx,s,{kind:'OPERATION',operation:q.operation,context:ctx,ingressSequence:entry.sequence});
    return response({matchId:s.matchId},ctx.now);
  }
  async function updateBotWakes(s:T,at:number,tx:PlanetTransaction):Promise<void>{
    if(!s.state||s.status!=='running')return;
    const f=service(s),e=engine();
    for(const m of s.members.filter(m=>m.controller==='bot')){
      const intent=await tx.get<BotIntent>(key('foodBotIntent',[s.matchId,m.seatId]));
      if(intent?.retryAt!==null&&intent?.retryAt!==undefined&&intent.retryAt>at){f.botWakes[m.seatId]=intent.retryAt;continue;}
      const v=e.projectPlanetFoodPlayer(s.state,m.seatId,at),decision=chooseFoodBotInput(v);
      if(decision.command)f.botWakes[m.seatId]=at;
      else if(decision.nextWakeAt!==null&&decision.nextWakeAt>at)f.botWakes[m.seatId]=decision.nextWakeAt;
      else if(v.step===null&&d.chooseOrdinaryBot(e.projectPlanetPlayer(s.state,m.seatId)))f.botWakes[m.seatId]=at;
      else delete f.botWakes[m.seatId];
    }
  }
  async function processOne(matchId:string):Promise<void>{
    await store.transaction(async tx=>{
      const s=await d.load(tx,matchId);
      const control=await tx.get<Control>(controlKey(matchId));
      if(!control||control.processedSequence===control.nextSequence-1)return;
      const path=entryKey(matchId,control.processedSequence+1),entry=await tx.get<Entry>(path);
      if(!entry||entry.response)throw new Error('Invalid Food ingress prefix');
      const complete=drainBoundaries(s,entry,tx);
      if(complete){
        try{entry.response=await apply(s,entry,tx);}
        catch(error){
          // Only explicit semantic service rejections are durable; infrastructure/authority errors retry unchanged.
          const code=error!==null&&typeof error==='object'&&'code' in error?error.code:null;
          if(!['NOT_ALLOWED','FORBIDDEN','NOT_FOUND'].includes(String(code)))throw error;
          entry.response={ok:false,serverTimeMs:entry.context.now,error:{code:code as FailureCode}};
        }
        if(s.state?.phase.kind==='FINISHED')s.status='finished';
        syncParticipants(s,entry.context.now);
        tx.set(controlKey(matchId),{...control,processedSequence:entry.sequence,advancedThroughAt:entry.context.now});
        if(entry.receiptPath)tx.set(entry.receiptPath,{fingerprint:entry.fingerprint,response:entry.response} satisfies Stored);
        if(entry.botIntentPath&&entry.request){
          const receipt=entry.response.ok?(entry.response.result as {receipt?:FoodTaskReceipt|PlanetReceipt}).receipt:null;
          tx.set(entry.botIntentPath,{sequence:entry.sequence,request:entry.request,done:true,
            retryAt:!entry.response.ok||receipt?.status==='rejected'?entry.context.now+250:null} satisfies BotIntent);
        }
        await updateBotWakes(s,entry.context.now,tx);
        if(entry.job){const jobKey='deadline/'+hash([matchId,entry.job.phaseId,entry.job.deadlineToken]);
          const old=await tx.get<PlanetDeadlineJob>(jobKey);if(old)tx.set(jobKey,{...old,status:'complete'});}
      }
      tx.set(path,entry);await d.publish(tx,s,entry.context);
    });
  }
  async function drainThrough(matchId:string,sequence:number):Promise<PlanetServiceResponse>{
    for(let n=0;n<MAX_PREFIX_COMMITS;n++){
      const entry=await readOnly(tx=>tx.get<Entry>(entryKey(matchId,sequence)));
      if(entry?.response)return entry.response;
      await processOne(matchId);
    }
    throw new Error('Food prefix requires a later durable continuation');
  }
  async function fastRead(matchId:string,uid:string):Promise<PlanetServiceResponse|null>{
    return store.transaction(async tx=>{
      const s=await d.load(tx,matchId);
      if(!isFood(s)||s.status!=='running'||!s.state)return null;
      const actor=authorize(s,uid,{operation:'read',matchId});
      const control=await tx.get<Control>(controlKey(matchId));
      // The first processed entry initializes bot wakes. Never bypass it or an admitted prefix.
      if(!control||control.processedSequence===0||control.processedSequence!==control.nextSequence-1)return null;
      const at=clock(),due=engine().planetDeadlineAt(s.state),f=s.foodService;
      if(!Number.isSafeInteger(at)||at<control.lastAdmittedAt||at<control.advancedThroughAt
        ||due!==null&&due<=at||!f)return null;
      if(Object.values(f.leases).some(l=>l&&!l.offline&&l.expiresAt<=at))return null;
      const lease=actor===null?undefined:f.leases[actor];
      const task=actor===null?null:engine().projectPlanetFoodPlayer(s.state,actor,at).participantTask;
      const person=task?.people.find(p=>p.seatId===actor);
      const livingActive=task!==null&&task.stage!=='ENDED'&&person?.alive===true;
      if(lease&&(lease.offline||lease.expiresAt<=at||!livingActive||!person?.online||lease.taskId!==task!.taskId)
        ||!lease&&livingActive)return null;
      // No engine boundary or online transition is skipped: only transport watermarks and
      // an already-online own lease change. Fallbacks above spend no rate budget or writes.
      await limitFood(tx,uid,{operation:'read',matchId},at);
      tx.set(controlKey(matchId),{...control,lastAdmittedAt:at,advancedThroughAt:at});
      if(lease&&actor!==null){
        f.leases[actor]={...lease,expiresAt:at+FOOD_PRESENCE_LEASE_MS};
        await d.publish(tx,s,technicalContext('food-read',at));
      }
      return response(d.snapshot(s,uid,at),at);
    });
  }
  async function tryHandle(uid:string,q:Request):Promise<PlanetServiceResponse|undefined>{
    const matchId=matchOf(q);if(matchId===null)return undefined;
    const initial=await inspect(matchId);
    if(!initial||!isFood(initial)){
      if(foodOperation(q))d.reject('NOT_ALLOWED');return undefined;
    }
    engine();
    if(!initial.state||!['running','finished','aborted'].includes(initial.status)){
      if(foodOperation(q))d.reject('NOT_ALLOWED');return undefined;
    }
    if(q.operation==='foodReceipt'||q.operation==='receipt')return readOnly(async tx=>{
      const s=await d.load(tx,matchId),actor=own(s,uid);
      const stored=await tx.get<Stored>(key(q.operation==='foodReceipt'?'food-command':'command',[matchId,actor.seatId,q.commandId]));
      return response({receipt:stored?.response.ok?(stored.response.result as {receipt:unknown}).receipt:null},clock());
    });
    if(q.operation==='read'&&!participant(initial,uid))return undefined;
    if(q.operation==='read'){const fast=await fastRead(matchId,uid);if(fast!==null)return fast;}
    if(!['read','command','foodCommand','foodHeartbeat','advance','runBots','abort','issueRecovery','redeemRecovery'].includes(q.operation))d.reject('NOT_ALLOWED');
    const admitted=await admit(matchId,uid,q);
    const result=admitted.response??await drainThrough(matchId,admitted.sequence);
    if(q.operation==='runBots'&&result.ok)return response(await runBots(matchId),clock());
    return result;
  }
  async function tryRunDeadline(job:Pick<PlanetDeadlineJob,'matchId'|'phaseId'|'deadlineToken'|'kind'>):Promise<{
    status:'advanced'|'unchanged'|'too-early';retryAfterMs?:number;
  }|undefined>{
    const s=await inspect(job.matchId);if(!s||!isFood(s)||!s.state)return undefined;
    const stored=await readOnly(tx=>tx.get<PlanetDeadlineJob>('deadline/'+hash([job.matchId,job.phaseId,job.deadlineToken])));
    if(!stored||stored.status==='complete')return {status:'unchanged'};
    const schedule=service(s).scheduler;
    if(!schedule||schedule.phaseId!==job.phaseId||schedule.token!==job.deadlineToken){
      await store.transaction(tx=>{tx.set('deadline/'+stored.taskId,{...stored,status:'complete'});return Promise.resolve();});
      return {status:'unchanged'};
    }
    const now=clock();if(now<stored.endsAt)return {status:'too-early',retryAfterMs:stored.endsAt-now};
    const admitted=await admit(job.matchId,null,null,{job,dedup:key('foodClock',[job.matchId,job.phaseId,job.deadlineToken])});
    const result=admitted.response??await drainThrough(job.matchId,admitted.sequence);
    await runBots(job.matchId);
    return {status:result.ok&&(result.result as {advanced:boolean}).advanced?'advanced':'unchanged'};
  }
  async function runBots(matchId:string):Promise<{accepted:number}>{
    let accepted=0,waitedMs=0,workPasses=0,inputs=0;
    const started=performance.now();
    const remaining=()=>Math.floor(Math.min(FOOD_BOT_WALL_BUDGET_MS-(performance.now()-started),FOOD_BOT_WALL_BUDGET_MS-waitedMs));
    const probe=()=>readOnly(async tx=>{
        const s=await d.load(tx,matchId),control=await tx.get<Control>(controlKey(matchId));
        if(control&&control.processedSequence<control.nextSequence-1)return {prefix:control.nextSequence-1,work:false,nextWakeAt:null};
        if(s.status!=='running'||!s.state)return {prefix:null,work:false,nextWakeAt:null};
        const at=clock(),f=service(s),due=engine().planetDeadlineAt(s.state);
        if(due!==null&&due<=at||Object.values(f.leases).some(l=>l&&!l.offline&&l.expiresAt<=at)
          ||Object.values(f.botWakes).some(wake=>wake!==undefined&&wake<=at))return {prefix:null,work:true,nextWakeAt:null};
        let nextWakeAt:number|null=null;
        for(const bot of s.members.filter(m=>m.controller==='bot')){
          const intent=await tx.get<BotIntent>(key('foodBotIntent',[matchId,bot.seatId]));
          if(intent?.retryAt!==null&&intent?.retryAt!==undefined&&intent.retryAt>at){
            nextWakeAt=Math.min(nextWakeAt??Infinity,intent.retryAt);continue;
          }
          const view=engine().projectPlanetFoodPlayer(s.state,bot.seatId,at);
          const decision=chooseFoodBotInput(view);
          if(decision.command||view.step===null&&d.chooseOrdinaryBot(engine().projectPlanetPlayer(s.state,bot.seatId)))return {prefix:null,work:true,nextWakeAt:null};
          if(decision.nextWakeAt!==null&&decision.nextWakeAt>at)nextWakeAt=Math.min(nextWakeAt??Infinity,decision.nextWakeAt);
        }
        return {prefix:null,work:false,nextWakeAt};
      });
    // Do not create a lease or scheduler write for an idle session trigger.
    const initial=await probe();
    if(initial.prefix===null&&!initial.work&&(!d.waitForBotWake||initial.nextWakeAt===null))return {accepted};
    const owner=await acquireWorker(matchId);
    if(owner===null)return {accepted};
    try{while(workPasses<MAX_BOT_INPUTS&&inputs<MAX_BOT_INPUTS&&remaining()>0){
      if(!await refreshWorker(matchId,owner))break;
      const pending=await probe();
      if(pending.prefix!==null){workPasses++;await drainThrough(matchId,pending.prefix);continue;}
      // A session trigger that finds no due work must perform no writes, or it retriggers itself forever.
      if(!pending.work){
        if(!d.waitForBotWake||pending.nextWakeAt===null)break;
        const delay=Math.min(1000,Math.max(0,pending.nextWakeAt-clock()),remaining());
        if(delay<=0)continue;
        waitedMs+=delay;await d.waitForBotWake(delay);
        continue; // Waiting never consumes an input/work pass or supplies an admission timestamp.
      }
      workPasses++;
      const clockInput=await admit(matchId,null,null,{workerOwner:owner});
      await drainThrough(matchId,clockInput.sequence);
      const s=await readOnly(tx=>d.load(tx,matchId));
      if(!s.state||s.status!=='running')break;
      let progressed=false,needsRefresh=false;
      for(const bot of s.members.filter(m=>m.controller==='bot')){
        if(inputs>=MAX_BOT_INPUTS||remaining()<=0)break;
        const intentPath=key('foodBotIntent',[matchId,bot.seatId]);
        const intent=await readOnly(tx=>tx.get<BotIntent>(intentPath));
        if(intent&&!intent.done){const result=await drainThrough(matchId,intent.sequence);
          if(result.ok&&(result.result as {receipt?:{status:string}}).receipt?.status==='accepted')accepted++;progressed=true;continue;}
        const state=await inspect(matchId);if(!state?.state||state.status!=='running')break;
        const now=clock();if(intent?.retryAt!==null&&intent?.retryAt!==undefined&&now<intent.retryAt)continue;
        const food=engine().projectPlanetFoodPlayer(state.state,bot.seatId,now),decision=chooseFoodBotInput(food);
        let foodCommand=decision.command;
        if(foodCommand?.type==='TASK_ASK'){
          // Practice preference only: invite an eligible human instead of occupying the
          // sole Task with two bots before that human's phone has finished loading.
          // Controller is existing public roster metadata; eligibility remains the own offer.
          const offered=food.offers.find(o=>o.type==='TASK_ASK')?.partnerSeatIds??[];
          const human=food.rosterSeatIds.find(id=>offered.includes(id)
            &&state.members.some(member=>member.seatId===id&&member.controller==='human'));
          if(human)foodCommand={type:'TASK_ASK',partnerSeatId:human};
        }
        const ordinary=food.step===null?d.chooseOrdinaryBot(engine().projectPlanetPlayer(state.state,bot.seatId)):null;
        if(!foodCommand&&!ordinary)continue;
        const request:Request=foodCommand?{operation:'foodCommand',request:{schemaVersion:1,protocolVersion:3,
          matchId,phaseId:food.phaseId,foodStepId:food.step!.stepId,round:food.round,commandId:d.newId(),command:foodCommand}}:
          {operation:'command',request:{protocolVersion:3,matchId,phaseId:state.state.phase.id,commandId:d.newId(),command:ordinary!}};
        const admitted=await admit(matchId,null,request,{bot:bot.seatId,workerOwner:owner});
        if(admitted.refresh){needsRefresh=true;break;}
        inputs++;
        const result=admitted.response??await drainThrough(matchId,admitted.sequence);
        const receipt=result.ok?(result.result as {receipt?:{status:string}}).receipt:null;
        if(receipt?.status==='accepted')accepted++;
        progressed=true;
      }
      if(needsRefresh)continue;
      if(!progressed&&!d.waitForBotWake)break;
    }}catch(error){if(!(error instanceof LostBotWorkerLease))throw error;}
    finally{await releaseWorker(matchId,owner);}
    return {accepted};
  }
  return {tryHandle,tryRunDeadline,runBots,schedule};
}
