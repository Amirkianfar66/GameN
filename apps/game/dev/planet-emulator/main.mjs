globalThis[Symbol.for('mothership:dev-only')]=true;
import {mountPlanetApp} from '../../hosted/planet/app.mjs';
if(location.protocol!=='http:'||!['127.0.0.1','localhost'].includes(location.hostname)||location.port!=='5173')throw Error('Loopback emulator preview only');
const authUrl='http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-only',endpoint='http://127.0.0.1:5101/demo-mothership/us-central1/planetApi';
let identity=null,lastRead=null;const operations=[];
const connection={mode:'authenticated',currentUid:()=>identity?.uid??null,
 async signIn(){if(!identity){const response=await fetch(authUrl,{method:'POST',credentials:'omit',headers:{'content-type':'application/json'},body:JSON.stringify({returnSecureToken:true})});if(!response.ok)throw Error('Local Auth unavailable');const value=await response.json();identity={uid:value.localId,idToken:value.idToken};}return identity.uid;},
 async request(request){if(!identity)throw Error('Local identity unavailable');const response=await fetch(endpoint,{method:'POST',credentials:'omit',cache:'no-store',redirect:'error',headers:{'content-type':'application/json',authorization:`Bearer ${identity.idToken}`},body:JSON.stringify(request)}),answer=await response.json();operations.push({operation:request.operation,status:response.status,ok:answer.ok,code:answer.error?.code??null});
  if(request.operation==='read'&&answer.ok){const s=answer.result;lastRead={status:s.status,matchId:s.matchId,setup:s.setup,admission:s.admission,selfSeatId:s.selfSeatId,memberCount:s.members.length,privateRolePresent:s.privateRole!==null,playerViewPresent:s.playerView!==null};}return answer;
 },dispose(){identity=null;lastRead=null;},
};
const app=await mountPlanetApp(document.getElementById('planet-root'),{connection});
// No token, recovery code or raw private service snapshot is exposed or persisted here.
window.planetEmulator={app,operations,get lastRead(){return lastRead;}};
