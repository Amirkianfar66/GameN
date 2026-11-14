globalThis[Symbol.for('mothership:dev-only')]=true;
import {mountPlanetApp} from '../../hosted/planet/app.mjs';
if(location.protocol!=='http:'||!['127.0.0.1','localhost'].includes(location.hostname)||location.port!=='5173')throw Error('Loopback emulator preview only');
const authUrl='http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-only',endpoint='http://127.0.0.1:5101/demo-mothership/us-central1/planetApi';
let identity=null,lastRead=null;const operations=[],requestStarts=[],transportTimings=[];
const connection={mode:'authenticated',currentUid:()=>identity?.uid??null,
 async signIn(){if(!identity){const response=await fetch(authUrl,{method:'POST',credentials:'omit',headers:{'content-type':'application/json'},body:JSON.stringify({returnSecureToken:true})});if(!response.ok)throw Error('Local Auth unavailable');const value=await response.json();identity={uid:value.localId,idToken:value.idToken};}return identity.uid;},
 async request(request){
  if(!identity)throw Error('Local identity unavailable');
  const sequence=requestStarts.length+1,began=performance.now();requestStarts.push({operation:request.operation,sequence});
  const c=request.operation==='foodCommand'?request.request?.command:null,k=c?.input?.kind;const action={commandType:['TASK_PRESS','TASK_ASK','TASK_ANSWER','TASK_ASK_WITHDRAW'].includes(c?.type)?c.type:null,inputKind:['HOLD','HOLD_RECOVER_OFF','PANEL_RELEASE','PANEL_LOCK','KEY'].includes(k)?k:null,inputEdge:k==='HOLD'&&['UP','DOWN'].includes(c.input.edge)?c.input.edge:null};
  try{
   const response=await fetch(endpoint,{method:'POST',credentials:'omit',cache:'no-store',redirect:'error',headers:{'content-type':'application/json',authorization:`Bearer ${identity.idToken}`},body:JSON.stringify(request)}),httpMs=performance.now()-began,answer=await response.json();
   operations.push({operation:request.operation,status:response.status,ok:answer.ok,code:answer.error?.code??null});
   const receipt=answer.result?.receipt;
   transportTimings.push({operation:request.operation,sequence,...action,httpMs:Math.round(httpMs),totalMs:Math.round(performance.now()-began),status:response.status,ok:answer.ok,code:answer.error?.code??null,
    receiptStatus:receipt?.status??null,receiptReceivedAt:typeof receipt?.receivedAt==='number'?receipt.receivedAt:null,receiptEffect:receipt?.result?.effect??null,receiptCode:receipt?.code??null});
   if(request.operation==='read'&&answer.ok){const v=answer.result;lastRead={status:v.status,matchId:v.matchId,setup:v.setup,admission:v.admission,selfSeatId:v.selfSeatId,memberCount:v.members.length,privateRolePresent:v.privateRole!==null,playerViewPresent:v.playerView!==null};}return answer;
  }catch(error){transportTimings.push({operation:request.operation,sequence,...action,totalMs:Math.round(performance.now()-began),transportOrParseError:true});throw error;}

 },dispose(){identity=null;lastRead=null;},
};
const app=await mountPlanetApp(document.getElementById('planet-root'),{connection});
// No token, recovery code or raw private service snapshot is exposed or persisted here.
window.planetEmulator={app,operations,requestStarts,transportTimings,get lastRead(){return lastRead;}};
