import {randomUUID} from 'node:crypto';
import {PlanetFoodClockResponseSchema,PlanetFoodStreamFrameSchema,PlanetSessionSnapshotSchema} from '@mothership/contracts';
import type {PlanetFoodTransportRequest,PlanetFoodStreamScope,PlanetSessionSnapshot} from '@mothership/contracts';

export interface PlanetFoodDelivery {
  snapshot:PlanetSessionSnapshot;
  fresh:boolean;
  /** Server-private boundary at which freshness must be checked again. */
  recheckAt?:number;
}
export interface PlanetFoodStreamService {
  projectFoodInboxDelivery(uid:string,matchId:string):Promise<PlanetFoodDelivery|null>;
  subscribeFoodInboxMatch(uid:string,matchId:string,changed:()=>void,failed:(error:unknown)=>void):Promise<(()=>void)|null>;
}
export interface PlanetFoodHttpResponse {
  set(field:string,value:string):unknown;
  status(code:number):PlanetFoodHttpResponse;
  json(body:unknown):unknown;
  write?(chunk:string):boolean;
  end?():unknown;
  on?(event:'close'|'drain',listener:()=>void):unknown;
  off?(event:'close'|'drain',listener:()=>void):unknown;
  flushHeaders?():unknown;
  destroyed?:boolean;
  writableEnded?:boolean;
}
const sameScope=(snapshot:PlanetSessionSnapshot,scope:PlanetFoodStreamScope)=>snapshot.matchId===scope.matchId
  &&snapshot.foodStream?.version===scope.version&&snapshot.foodStream.phaseId===scope.phaseId
  &&snapshot.foodStream.foodStepId===scope.foodStepId;
const audience=(s:PlanetSessionSnapshot)=>JSON.stringify([s.selfSeatId,s.isHost,s.admission?.kind??null]);
/** Do not turn private storage notifications or a sampled clock into public event cadence. */
const semantic=(s:PlanetSessionSnapshot,fresh:boolean)=>JSON.stringify({snapshot:{...s,
  ...(s.foodPublicView?{foodPublicView:{...s.foodPublicView,serverNowMs:0}}:{}),
  ...(s.foodPlayerView?{foodPlayerView:{...s.foodPlayerView,serverNowMs:0}}:{}),
},fresh});

/** Called only after the ordinary endpoint's origin, Auth, App Check and input-size checks. */
export async function handlePlanetFoodTransport(d:{
  service:PlanetFoodStreamService;uid:string;request:PlanetFoodTransportRequest;response:PlanetFoodHttpResponse;
  receivedAt:number;clock:()=>number;maxStreamMs?:number;monotonicClock?:()=>number;
}):Promise<void>{
  const {service,uid,request,response,clock}=d;
  const monotonic=d.monotonicClock??(()=>performance.now());
  const {operation,...scope}=request;
  const fail=(status:number,code:string)=>{response.status(status).json({ok:false,serverTimeMs:clock(),error:{code}});};
  let initial:PlanetFoodDelivery|null;
  const initialReadAt=monotonic();
  try{initial=await service.projectFoodInboxDelivery(uid,scope.matchId);}
  catch{fail(503,'UNAVAILABLE');return;}
  if(!initial){fail(403,'FORBIDDEN');return;}
  const checked=PlanetSessionSnapshotSchema.safeParse(initial.snapshot);
  if(!checked.success||checked.data.matchId!==scope.matchId){fail(503,'UNAVAILABLE');return;}
  if(operation==='foodClock'){
    if(!sameScope(checked.data,scope)){fail(409,'NOT_ALLOWED');return;}
    const paired=PlanetFoodClockResponseSchema.safeParse({ok:true,scope,receivedAt:d.receivedAt,serverTimeMs:clock()});
    if(!paired.success){fail(503,'UNAVAILABLE');return;}
    response.status(200).json(paired.data);return;
  }
  if(!response.write||!response.end||!response.on||!response.off){fail(503,'UNAVAILABLE');return;}
  if(response.destroyed||response.writableEnded)return;
  const frameEpoch=randomUUID(),originalAudience=audience(checked.data);
  let sequence=0,done=false,busy=false,dirty=false,blocked=false,unsubscribe:(()=>void)|null=null;
  let boundary:ReturnType<typeof setTimeout>|undefined,timeout:ReturnType<typeof setTimeout>|undefined;
  let stalled:ReturnType<typeof setTimeout>|undefined,pulseTimer:ReturnType<typeof setTimeout>|undefined;
  let lastValidatedReadAt=-Infinity;
  let finish!:()=>void;
  const completed=new Promise<void>(resolve=>{finish=resolve;});
  const cleanup=()=>{
    if(done)return;done=true;
    clearTimeout(boundary);clearTimeout(timeout);clearTimeout(stalled);clearTimeout(pulseTimer);
    try{unsubscribe?.();}catch{/* Closing a failed listener cannot retain the response. */}
    unsubscribe=null;response.off!('close',cleanup);response.off!('drain',drained);finish();
  };
  const end=()=>{cleanup();try{response.end!();}catch{/* Connection is already closed. */}};
  const send=(line:string)=>{
    if(done)return false;
    try{
      // A false write still accepted this frame. Coalesce later signals until
      // drain instead of buffering a history or reconnecting on every large view.
      if(!response.write!(line)){
        blocked=true;stalled=setTimeout(end,2_000);
      }
      return true;
    }catch{end();return false;}
  };
  const write=(value:Record<string,unknown>)=>{
    if(done)return false;
    const parsed=PlanetFoodStreamFrameSchema.safeParse({...scope,frameEpoch,frameSequence:++sequence,...value});
    if(!parsed.success){end();return false;}
    return send('data: '+JSON.stringify(parsed.data)+'\n\n');
  };
  const close=(reason:'phase-ended'|'unavailable'|'authorization',snapshot?:PlanetSessionSnapshot)=>{
    write({kind:'closed',reason,serverTimeMs:snapshot?.foodPublicView?.serverNowMs??clock(),...(snapshot?{snapshot}:{})});end();
  };
  function drained():void{
    if(done||!blocked)return;
    blocked=false;clearTimeout(stalled);void refresh();
  }
  let lastSemantic:string|null=null;
  const publish=(delivery:PlanetFoodDelivery,requestedAt:number)=>{
    if(done)return;
    const validated=PlanetSessionSnapshotSchema.safeParse(delivery.snapshot);
    if(!validated.success||validated.data.matchId!==scope.matchId){close('unavailable');return;}
    const snapshot=validated.data;
    if(audience(snapshot)!==originalAudience){close('authorization');return;}
    if(!sameScope(snapshot,scope)){close('phase-ended',snapshot);return;}
    lastValidatedReadAt=requestedAt;
    // The technical owner/presence state is only the actual operator's feedback.
    const fresh=snapshot.foodPlayerView?.participantTask?delivery.fresh:true;
    const key=semantic(snapshot,fresh);
    if(key!==lastSemantic){
      if(!write({kind:'snapshot',snapshot,fresh,serverTimeMs:snapshot.foodPublicView!.serverNowMs}))return;
      lastSemantic=key;
    }
    clearTimeout(boundary);
    if(delivery.recheckAt!==undefined&&Number.isSafeInteger(delivery.recheckAt))
      boundary=setTimeout(refresh,Math.max(25,Math.min(45_000,delivery.recheckAt-clock())));
  };
  async function refresh():Promise<void>{
    if(done)return;
    dirty=true;if(busy||blocked)return;busy=true;
    try{
      while(dirty&&!done&&!blocked){
        dirty=false;
        const requestedAt=monotonic();
        const next=await service.projectFoodInboxDelivery(uid,scope.matchId);
        if(done)return;
        if(!next){close('authorization');return;}
        publish(next,requestedAt);
      }
    }catch{if(!done)close('unavailable');}
    finally{busy=false;}
  }
  function pulse():void{
    if(done)return;
    // Fixed transport cadence, never a gameplay event, clock sample or fresh
    // snapshot. A stalled authority read must not keep this channel looking live.
    const age=monotonic()-lastValidatedReadAt;
    if(!blocked&&age>=0&&age<=2_000)send(': food-alive\n\n');
    if(!done){void refresh();pulseTimer=setTimeout(pulse,1_000);}
  }
  response.status(200);response.set('Content-Type','text/event-stream; charset=utf-8');
  response.set('X-Accel-Buffering','no');response.on('close',cleanup);response.on('drain',drained);response.flushHeaders?.();
  timeout=setTimeout(()=>close('unavailable'),Math.min(45_000,Math.max(1,d.maxStreamMs??45_000)));
  publish(initial,initialReadAt);
  if(!done)pulseTimer=setTimeout(pulse,1_000);
  if(!done){
    try{
      // A second projection after subscribing closes the initial-read/listen race.
      const stop=await service.subscribeFoodInboxMatch(uid,scope.matchId,()=>{void refresh();},()=>close('unavailable'));
      if(done)stop?.();
      else if(!stop)close('authorization');
      else{unsubscribe=stop;await refresh();}
    }catch{if(!done)close('unavailable');}
  }
  await completed;
}
