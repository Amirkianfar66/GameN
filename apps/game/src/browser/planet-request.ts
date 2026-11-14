import {readPlanetRequest} from '../planet/request.js';
import type {PlanetServiceRequest} from '../planet/request.js';
import {hostedFunctionsOrigin,readHostedConfiguration} from './hosted-config.js';
import type {HostedConfiguration} from './hosted-config.js';
import type {HostedRequestPorts} from './hosted-request.js';
import type {ClientPorts} from '../ports.js';

// The session still conceals after its existing eight-second freshness wait. Allow one
// further wait window for a finite late read, then cancel the actual transport.
const READ_LIFETIME_MS=16_000;

function credentialsUntilAbort(tokens:Promise<[string,string]>,signal:AbortSignal):Promise<[string,string]>{
 if(signal.aborted)return Promise.reject(signal.reason);
 return new Promise((resolve,reject)=>{
  const abort=()=>reject(signal.reason);
  signal.addEventListener('abort',abort,{once:true});
  tokens.then(value=>{signal.removeEventListener('abort',abort);resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});
 });
}

/** The Integration-owned protocol-3 endpoint. Historical V1 operation allowlists are untouched. */
export async function postHostedPlanetRequest(config:HostedConfiguration,ports:HostedRequestPorts,request:PlanetServiceRequest,timing?:ClientPorts):Promise<unknown>{
 const pinned=readHostedConfiguration(config),body=readPlanetRequest(request);
 const dispatch=(idToken:string,appCheckToken:string,signal?:AbortSignal)=>{
  if(!idToken||!appCheckToken)throw new Error('Identity verification unavailable');
  return ports.fetch(`${hostedFunctionsOrigin(pinned)}/planetApi`,{
   method:'POST',cache:'no-store',redirect:'error',credentials:'omit',
   headers:{'content-type':'application/json',authorization:`Bearer ${idToken}`,'X-Firebase-AppCheck':appCheckToken},body:JSON.stringify(body),
   ...(signal?{signal}:{}),
  });
 };
 // A cancelled read may already have had server-side effects. Mutations retain
 // their original lifetime and unknown-outcome/receipt-recovery semantics.
 if(body.operation!=='read'){
  const [idToken,appCheckToken]=await Promise.all([ports.getIdToken(),ports.getAppCheckToken()]);
  const response=await dispatch(idToken,appCheckToken);return JSON.parse(await response.text()) as unknown;
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
  const [idToken,appCheckToken]=await credentialsUntilAbort(Promise.all([
   Promise.resolve().then(async()=>{check();const token=await ports.getIdToken();check();return token;}),
   Promise.resolve().then(async()=>{check();const token=await ports.getAppCheckToken();check();return token;}),
  ]),controller.signal);
  check();
  const response=await dispatch(idToken,appCheckToken,controller.signal);
  // Retain ownership until native fetch/body actually settles, even on abort.
  // Do not race HTTP against the timer and release the session's single flight.
  expireIfDue();
  const text=await response.text();check();return JSON.parse(text) as unknown;
 }finally{scheduler.clearTimeout(handle);}
}
