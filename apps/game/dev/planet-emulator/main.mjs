globalThis[Symbol.for('mothership:dev-only')]=true;
import {mountPlanetApp} from '../../hosted/planet/app.mjs';
if(location.protocol!=='http:'||!['127.0.0.1','localhost'].includes(location.hostname)||location.port!=='5173')throw Error('Loopback emulator preview only');
const authUrl='http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-only',endpoint='http://127.0.0.1:5101/demo-mothership/us-central1/planetApi';
let identity=null,lastRead=null;const operations=[],requestStarts=[],transportTimings=[],pointerEvents=[],foodModelUpdates=[],foodDomUpdates=[];
const timingContext={domain:'performance.now in this document; not host/CDP, another page or server time',timeOriginMs:performance.timeOrigin};
const observationDrops={pointerEvents:0,foodModelUpdates:0,foodDomUpdates:0},append=(name,list,value)=>{if(list.length<4096)list.push(value);else observationDrops[name]++;};
const controlFacts=n=>({id:n.id,action:n.dataset.act,disabled:n.disabled||n.getAttribute('aria-disabled')==='true',busy:n.getAttribute('aria-busy')==='true',sending:n.hasAttribute('data-sending'),next:n.hasAttribute('data-next'),hazard:n.hasAttribute('data-hazard'),inert:!!n.closest('[inert]')});
const contacts=new Map();
for(const type of ['pointerdown','pointerup','pointercancel'])window.addEventListener(type,e=>{
 const n=e.target?.closest?.('.planet-food.ph .fs-ctl'),control=n?controlFacts(n):contacts.get(e.pointerId);
 if(!control||!['hold','release','lock','key'].includes(control.action))return;
 if(type==='pointerdown')contacts.set(e.pointerId,control);else contacts.delete(e.pointerId);
 append('pointerEvents',pointerEvents,{type,observedAtMs:performance.now(),trusted:e.isTrusted,pointerType:['mouse','touch','pen'].includes(e.pointerType)?e.pointerType:'other',control});
},{capture:true,passive:true});
const connection={mode:'authenticated',currentUid:()=>identity?.uid??null,
 async signIn(){if(!identity){const response=await fetch(authUrl,{method:'POST',credentials:'omit',headers:{'content-type':'application/json'},body:JSON.stringify({returnSecureToken:true})});if(!response.ok)throw Error('Local Auth unavailable');const value=await response.json();identity={uid:value.localId,idToken:value.idToken};}return identity.uid;},
 async request(request){
  if(!identity)throw Error('Local identity unavailable');
  const sequence=requestStarts.length+1;
  const c=request.operation==='foodCommand'?request.request?.command:null,k=c?.input?.kind;const action={commandType:['TASK_PRESS','TASK_ASK','TASK_ANSWER','TASK_ASK_WITHDRAW'].includes(c?.type)?c.type:null,inputKind:['HOLD','HOLD_RECOVER_OFF','PANEL_RELEASE','PANEL_LOCK','KEY'].includes(k)?k:null,inputEdge:k==='HOLD'&&['UP','DOWN'].includes(c.input.edge)?c.input.edge:null};
  const body=JSON.stringify(request),headers={'content-type':'application/json',authorization:`Bearer ${identity.idToken}`};
  const began=performance.now();let headersObservedAtMs=null;
  requestStarts.push({operation:request.operation,sequence,fetchStartedAtMs:began});
  try{
   const response=await fetch(endpoint,{method:'POST',credentials:'omit',cache:'no-store',redirect:'error',headers,body});headersObservedAtMs=performance.now();
   const answer=await response.json(),jsonCompletedAtMs=performance.now(),httpMs=headersObservedAtMs-began;
   operations.push({operation:request.operation,status:response.status,ok:answer.ok,code:answer.error?.code??null});
   const receipt=answer.result?.receipt;
   transportTimings.push({operation:request.operation,sequence,...action,fetchStartedAtMs:began,headersObservedAtMs,jsonCompletedAtMs,httpMs:Math.round(httpMs),totalMs:Math.round(jsonCompletedAtMs-began),status:response.status,ok:answer.ok,code:answer.error?.code??null,
    receiptStatus:receipt?.status??null,receiptReceivedAt:typeof receipt?.receivedAt==='number'?receipt.receivedAt:null,receiptEffect:receipt?.result?.effect??null,receiptCode:receipt?.code??null});
   if(request.operation==='read'&&answer.ok){const v=answer.result;lastRead={status:v.status,matchId:v.matchId,setup:v.setup,admission:v.admission,selfSeatId:v.selfSeatId,memberCount:v.members.length,privateRolePresent:v.privateRole!==null,playerViewPresent:v.playerView!==null};}return answer;
  }catch(error){const failedAtMs=performance.now();transportTimings.push({operation:request.operation,sequence,...action,fetchStartedAtMs:began,headersObservedAtMs,failedAtMs,totalMs:Math.round(failedAtMs-began),transportOrParseError:true});throw error;}

 },dispose(){identity=null;lastRead=null;},
};
const app=await mountPlanetApp(document.getElementById('planet-root'),{connection});
let observedFood=null,unsubscribeFood=null,lastModel=null,lastDom=null;
function observeFood(){
 const food=app.food;if(!food||food===observedFood)return;
 unsubscribeFood?.();observedFood=food;lastModel=null;let initial=true;
 unsubscribeFood=food.subscribe(m=>{const f=m.feedback,value={visible:m.visible,fresh:m.fresh,clockStatus:m.clock.status,pendingCount:m.pendingCount,physicalHolding:m.physicalHolding,
  canHold:m.canHold,canPanelRelease:m.canPanelRelease,canPanelLock:m.canPanelLock,canKey:m.canKey,canCheck:m.canCheck,
  feedback:f?{status:f.status,name:f.name,recovered:f.recovered,receiptStatus:f.receipt?.status??null,receiptReceivedAt:f.receipt?.receivedAt??null,receiptEffect:f.receipt?.result?.effect??null,receiptCode:f.receipt?.code??null}:null};
  const signature=JSON.stringify(value);if(signature!==lastModel){append('foodModelUpdates',foodModelUpdates,{observedAtMs:performance.now(),observer:initial?'initial subscription snapshot':'model subscriber',...value});lastModel=signature;}initial=false;
 });
}
const domObserver=new MutationObserver(records=>{
 observeFood();
 if(!records.some(r=>r.target instanceof Element&&(r.target.matches('.fs-controls,.fs-dock')||r.target.closest('.fs-ctl'))))return;
 const controls=[...document.querySelectorAll('.planet-food.ph .fs-ctl')].map(controlFacts),signature=JSON.stringify(controls);
 if(signature!==lastDom){append('foodDomUpdates',foodDomUpdates,{observedAtMs:performance.now(),observer:'MutationObserver callback; not paint',controls});lastDom=signature;}
});
domObserver.observe(document.getElementById('planet-root'),{subtree:true,childList:true,attributes:true,attributeFilter:['aria-disabled','aria-busy','data-act','data-next','data-hazard','data-sending','inert','hidden']});observeFood();
// No token, recovery code or raw private service snapshot is exposed or persisted here.
window.planetEmulator={app,operations,requestStarts,transportTimings,timingContext,pointerEvents,foodModelUpdates,foodDomUpdates,observationDrops,get lastRead(){return lastRead;}};
