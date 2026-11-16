import {readPlanetFoodTransportRequest,readPlanetRequest} from '../planet/request.js';
import type {PlanetServiceRequest} from '../planet/request.js';
import type {PlanetFoodTransportRequest} from '@mothership/contracts';
import {hostedFunctionsOrigin,readHostedConfiguration} from './hosted-config.js';
import type {HostedConfiguration} from './hosted-config.js';
import type {HostedRequestPorts} from './hosted-request.js';
import type {ClientPorts} from '../ports.js';

// The session still conceals after its existing eight-second freshness wait. Allow one
// further wait window for a finite late read, then cancel the actual transport.
const READ_LIFETIME_MS=16_000;
const MAX_FOOD_EVENT_CHARS=8*1024*1024;

function credentialsUntilAbort(tokens:Promise<[string,string]>,signal:AbortSignal):Promise<[string,string]>{
 if(signal.aborted)return Promise.reject(signal.reason);
 return new Promise((resolve,reject)=>{
  const abort=()=>reject(signal.reason);
  signal.addEventListener('abort',abort,{once:true});
  tokens.then(value=>{signal.removeEventListener('abort',abort);resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});
 });
}

function dispatchPlanet(config:HostedConfiguration,ports:HostedRequestPorts,body:PlanetServiceRequest|PlanetFoodTransportRequest,
 tokens:[string,string],signal?:AbortSignal):Promise<Response>{
 const [idToken,appCheckToken]=tokens;
 if(!idToken||!appCheckToken)throw new Error('Identity verification unavailable');
 return ports.fetch(`${hostedFunctionsOrigin(config)}/planetApi`,{
  method:'POST',cache:'no-store',redirect:'error',credentials:'omit',
  headers:{'content-type':'application/json',authorization:`Bearer ${idToken}`,'X-Firebase-AppCheck':appCheckToken},body:JSON.stringify(body),
  ...(signal?{signal}:{}),
 });
}

async function dispatchUntilAbort(config:HostedConfiguration,ports:HostedRequestPorts,body:PlanetServiceRequest|PlanetFoodTransportRequest,signal:AbortSignal){
 signal.throwIfAborted();
 const tokens=await credentialsUntilAbort(Promise.all([ports.getIdToken(),ports.getAppCheckToken()]),signal);
 signal.throwIfAborted();
 return dispatchPlanet(config,ports,body,tokens,signal);
}

/** The Integration-owned protocol-3 endpoint. Historical V1 operation allowlists are untouched. */
export async function postHostedPlanetRequest(config:HostedConfiguration,ports:HostedRequestPorts,request:PlanetServiceRequest,timing?:ClientPorts,signal?:AbortSignal):Promise<unknown>{
 const pinned=readHostedConfiguration(config),body=readPlanetRequest(request);
 if(signal&&(body.operation==='foodReceipt'||body.operation==='foodHeartbeat')){
  const response=await dispatchUntilAbort(pinned,ports,body,signal);
  const value=JSON.parse(await response.text()) as unknown;signal.throwIfAborted();return value;
 }
 // A cancelled read may already have had server-side effects. Mutations retain
 // their original lifetime and unknown-outcome/receipt-recovery semantics.
 if(body.operation!=='read'){
  const tokens=await Promise.all([ports.getIdToken(),ports.getAppCheckToken()]);
  const response=await dispatchPlanet(pinned,ports,body,tokens);return JSON.parse(await response.text()) as unknown;
 }
 const clock=timing?.clock??{now:()=>globalThis.performance.now()};
 const scheduler=timing?.scheduler??{setTimeout:(fn:()=>void,ms:number)=>globalThis.setTimeout(fn,ms),clearTimeout:(handle:unknown)=>globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>)};
 const controller=new AbortController(),expiresAt=clock.now()+READ_LIFETIME_MS;
 const abort=()=>{if(!controller.signal.aborted)controller.abort(new DOMException('Planet read lifetime exceeded','TimeoutError'));};
 const expireIfDue=()=>{if(clock.now()>=expiresAt)abort();};
 const check=()=>{expireIfDue();controller.signal.throwIfAborted();};
 const handle=scheduler.setTimeout(abort,READ_LIFETIME_MS);
 try{
  // Token SDK promises cannot be cancelled. The abort race ends acquisition,
  // and the elapsed-budget fence prevents their late completion from sending.
  const tokens=await credentialsUntilAbort(Promise.all([
   Promise.resolve().then(async()=>{check();const token=await ports.getIdToken();check();return token;}),
   Promise.resolve().then(async()=>{check();const token=await ports.getAppCheckToken();check();return token;}),
  ]),controller.signal);
  check();
  const response=await dispatchPlanet(pinned,ports,body,tokens,controller.signal);
  // Retain ownership until native fetch/body actually settles, even on abort.
  // Do not race HTTP against the timer and release the session's single flight.
  expireIfDue();
  const text=await response.text();check();return JSON.parse(text) as unknown;
 }finally{scheduler.clearTimeout(handle);}
}

/** The authenticated Food watch uses POST headers and one JSON value per SSE event. */
export async function postHostedPlanetFoodDelivery(config:HostedConfiguration,ports:HostedRequestPorts,
 request:PlanetFoodTransportRequest,signal:AbortSignal,receive?:(frame:unknown)=>void):Promise<unknown>{
 const body=readPlanetFoodTransportRequest(request),pinned=readHostedConfiguration(config);
 const response=await dispatchUntilAbort(pinned,ports,body,signal);
 signal.throwIfAborted();
 if(body.operation==='foodClock'||!response.ok){
  const value=JSON.parse(await response.text()) as unknown;signal.throwIfAborted();return value;
 }
 if(!receive||!response.body||!/^(text\/event-stream)(?:\s*;|$)/i.test(response.headers.get('content-type')??'')){
  await response.body?.cancel();throw new TypeError('Expected authenticated Food event stream');
 }

 const reader=response.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});
 let buffer='',data:string|null=null,complete=false;
 try{
  while(!signal.aborted){
   const chunk=await reader.read();signal.throwIfAborted();
   if(chunk.done){decoder.decode();complete=true;return;}
   buffer+=decoder.decode(chunk.value,{stream:true});
   let lineStart=0;
   for(let lineEnd=buffer.indexOf('\n');lineEnd!==-1;lineEnd=buffer.indexOf('\n',lineStart)){
    const line=buffer.slice(lineStart,buffer[lineEnd-1]==='\r'?lineEnd-1:lineEnd);
    lineStart=lineEnd+1;
    if(line.length>MAX_FOOD_EVENT_CHARS)throw new TypeError('Food event is too large');
    if(!line&&data!==null){
     receive(JSON.parse(data) as unknown);data=null;signal.throwIfAborted();
    }else if(line.startsWith('data:')){
     if(data!==null)throw new TypeError('Expected one data line per Food event');
     data=line.slice(line[5]===' '?6:5);
    }
   }
   buffer=buffer.slice(lineStart);
   if(buffer.length>MAX_FOOD_EVENT_CHARS)throw new TypeError('Food event is too large');
  }
 }finally{
  if(!complete)try{await reader.cancel();}catch{/* The fetch may have already closed. */}
  reader.releaseLock();
 }
}
