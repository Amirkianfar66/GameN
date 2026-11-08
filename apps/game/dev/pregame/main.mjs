// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import {mountPlanetApp} from '../../hosted/planet/app.mjs';
import {PREGAME_ROLE_IDS} from '@mothership/game';
import {sessionScenario} from '../planet/scenarios.mjs';

const root=document.getElementById('planet-root');let app=null,value=null,uid='synthetic-pregame-owner',lost=false,denied=false,sequence=0;
const requests=[];
const connection=()=>({mode:'synthetic',currentUid:()=>uid,signIn:async()=>uid,async request(request){
 requests.push(structuredClone(request));const answer=result=>({ok:true,serverTimeMs:Date.now(),result});
 if(request.operation==='read')return lost?null:denied?{ok:false,serverTimeMs:Date.now(),error:{code:'FORBIDDEN'}}:answer(structuredClone(value));
 if(request.operation==='requestAdmission'){value.admission={requestId:request.requestId,kind:request.kind,status:'admitted'};return answer({matchId:value.matchId,admissionId:'synthetic-pregame-admission'});}
 if(request.operation==='ready'){value.members.find(m=>m.seatId===value.selfSeatId).ready=true;return answer({matchId:value.matchId});}
 if(request.operation==='issueRecovery')return answer({recoveryCode:'SYNTHETIC'+'X'.repeat(120),expiresAt:Date.now()+900000});
 if(request.operation==='redeemRecovery')return answer({matchId:value.matchId,seatId:value.selfSeatId});
 return answer({matchId:value.matchId});
}});

async function startCase({kind='role',role='hacker',character='c8',count=9,reduced=false,textScale=1,elapsed=0,display=false,keepStorage=false}={}){
 app?.dispose();root.replaceChildren();requests.length=0;uid='synthetic-pregame-owner';lost=false;denied=false;
 if(!keepStorage)for(const key of ['resume','requests','command','films-seen'])sessionStorage.removeItem(`mothership:planet:${key}`);
 localStorage.setItem('mothership:planet:presentation-preferences',JSON.stringify({reduced,textScale}));
 value=sessionScenario('reading',{now:Date.now(),count});value.versions.assetManifestVersion='design-0.8.0';value.matchId=`synthetic-pregame-${++sequence}`;value.setup={id:`synthetic-reading-${sequence}`,endsAt:Date.now()+30000};value.setupFlowVersion=2;value.pendingAdmissions=[];
 const roleName=Object.entries(PREGAME_ROLE_IDS).find(([,id])=>id===role)?.[0];if(!roleName||!/^c[1-9]$/.test(character)||![7,8,9].includes(count))throw new Error('Unknown synthetic case');
 const own=value.members.find(m=>m.seatId===value.selfSeatId),other=value.members.find(m=>m.characterId===character),old=own.characterId;if(other)other.characterId=old;own.characterId=character;own.ready=false;
 value.privateRole={role:roleName,faction:roleName==='Alien'?'Alien':['Hacker','Undercover','Red Disabler'].includes(roleName)?'Red':'Blue',knowledge:{insiderSeatIds:roleName==='Insider'?['seat-1','seat-2','seat-5']:[],knownUndercoverSeatId:['Hacker','Red Disabler'].includes(roleName)?'seat-5':null,scanResults:[]}};
 if(kind==='boarding'){
  value.status='boarding';value.privateRole=null;value.setup={id:`synthetic-boarding-${sequence}`,startedAt:Date.now()-elapsed,endsAt:Date.now()-elapsed+10000};for(const member of value.members)member.ready=true;
  if(display)value.selfSeatId=null;
 }
 app=await mountPlanetApp(root,{connection:connection(),allowSynthetic:true});
 if(kind!=='brand')await app.session.operate({operation:'requestAdmission',roomCode:'PLANET',kind:display?'display':'player',displayName:'SYNTHETIC REVIEW'});
 return {kind,role,character,count,reduced,textScale,display,provenance:'Synthetic transport through actual hosted app/session/presentation; no multiplayer/device acceptance'};
}

window.pregameHarness={startCase,get app(){return app},get value(){return value},requests,
 reveal(){document.getElementById('planet-role-reveal')?.click();},
 async refresh(){await app.session.refresh();},
 async revoke(){denied=true;await app.session.refresh();},
 async disconnect(){lost=true;await app.session.refresh();},
 async reconnect(){lost=false;await app.session.refresh();},
 async expire(){value.setup.startedAt=Date.now()-11000;value.setup.endsAt=value.setup.startedAt+10000;await app.session.refresh();},
 async serverRunning(){const s=sessionScenario(value.selfSeatId===null?'display':'board',{now:Date.now(),count:value.playerCount});s.matchId=value.matchId;s.versions=value.versions;s.setupFlowVersion=2;s.admission=value.admission;s.members=value.members;s.selfSeatId=value.selfSeatId;for(const view of [s.publicView,s.playerView])if(view){view.matchId=s.matchId;view.versions=s.versions;}value=s;await app.session.refresh();},
 setUid(next){uid=next;},
 dispose(){app?.dispose();app=null;},
};
const query=new URL(location.href).searchParams;
await startCase({kind:query.get('kind')??'role',role:query.get('role')??'hacker',character:query.get('character')??'c8',count:Number(query.get('count')??9),reduced:query.get('reduced')==='1',textScale:Number(query.get('textScale')??1),elapsed:Number(query.get('elapsed')??0),display:query.get('display')==='1'});
window.pregameHarness.ready=true;
