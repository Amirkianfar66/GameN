// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import {mountPlanetApp} from '../../hosted/planet/app.mjs';
import {PREGAME_ROLE_IDS} from '@mothership/game';
import {sessionScenario} from '../planet/scenarios.mjs';
import {PLANET_GAME_PINS,PLANET_FOOD_TASK_PINS,PlanetSessionSnapshotSchema} from '@mothership/contracts';

const historicalVersions={...PLANET_GAME_PINS,assetManifestVersion:'design-0.8.0'};
const foodVersions={...PLANET_FOOD_TASK_PINS,assetManifestVersion:'design-0.9.0'};
const fixtureVersions={
 historical:historicalVersions,
 food:foodVersions,
 mixed:{...foodVersions,assetManifestVersion:historicalVersions.assetManifestVersion},
 invalid:{...foodVersions,rulesetHash:historicalVersions.rulesetHash},
 'older-art':{...historicalVersions,assetManifestVersion:'design-0.7.0'},
};

const root=document.getElementById('planet-root');let app=null,value=null,uid='synthetic-pregame-owner',lost=false,denied=false,sequence=0;
const requests=[];
const connection=()=>({mode:'synthetic',currentUid:()=>uid,signIn:async()=>uid,async request(request){
 requests.push(structuredClone(request));const stamp=Date.now(),answer=result=>({ok:true,serverTimeMs:stamp,result});
 if(request.operation==='read'){
  if(lost)return null;
  if(denied)return {ok:false,serverTimeMs:stamp,error:{code:'FORBIDDEN'}};
  const snapshot=structuredClone(value);
  for(const view of [snapshot.foodPublicView,snapshot.foodPlayerView])if(view)view.serverNowMs=stamp;
  return answer(snapshot);
 }
 if(request.operation==='requestAdmission'){value.admission={requestId:request.requestId,kind:request.kind,status:'admitted'};return answer({matchId:value.matchId,admissionId:'synthetic-pregame-admission'});}
 if(request.operation==='ready'){value.members.find(m=>m.seatId===value.selfSeatId).ready=true;return answer({matchId:value.matchId});}
 if(request.operation==='issueRecovery')return answer({recoveryCode:'SYNTHETIC'+'X'.repeat(120),expiresAt:Date.now()+900000});
 if(request.operation==='redeemRecovery')return answer({matchId:value.matchId,seatId:value.selfSeatId});
 return answer({matchId:value.matchId});
}});

async function startCase({kind='role',role='hacker',character='c8',count=9,reduced=false,textScale=1,elapsed=0,display=false,keepStorage=false,release='historical'}={}){
 if(!Object.hasOwn(fixtureVersions,release))throw new Error('Unknown synthetic release case');
 const versions=fixtureVersions[release],food=versions.engineVersion===PLANET_FOOD_TASK_PINS.engineVersion;
 app?.dispose();root.replaceChildren();requests.length=0;uid='synthetic-pregame-owner';lost=false;denied=false;
 if(!keepStorage)for(const key of ['resume','requests','command','films-seen','role-privacy'])sessionStorage.removeItem(`mothership:planet:${key}`);
 localStorage.setItem('mothership:planet:presentation-preferences',JSON.stringify({reduced,textScale}));
 const now=Date.now(),startedAt=now-elapsed;
 value=sessionScenario('reading',{now,count});
 value.versions={...versions};value.matchId=`synthetic-pregame-${++sequence}`;value.setupFlowVersion=food?3:2;
 value.setup={id:`synthetic-reading-${sequence}`,endsAt:startedAt+30000,...(food?{startedAt,roleFilmStartsAt:startedAt+20000}:{})};
 if(food)Object.assign(value,{foodPublicView:null,foodPlayerView:null});
 const roleName=Object.entries(PREGAME_ROLE_IDS).find(([,id])=>id===role)?.[0];if(!roleName||!/^c[1-9]$/.test(character)||![7,8,9].includes(count))throw new Error('Unknown synthetic case');
 const own=value.members.find(m=>m.seatId===value.selfSeatId),other=value.members.find(m=>m.characterId===character),old=own.characterId;if(other)other.characterId=old;own.characterId=character;own.ready=false;
 value.privateRole={role:roleName,faction:roleName==='Alien'?'Alien':['Hacker','Undercover','Red Disabler'].includes(roleName)?'Red':'Blue',knowledge:{insiderSeatIds:roleName==='Insider'?['seat-1','seat-2','seat-5']:[],knownUndercoverSeatId:['Hacker','Red Disabler'].includes(roleName)?'seat-5':null,scanResults:[]}};
 if(kind==='boarding'){
  value.status='boarding';value.privateRole=null;value.setup={id:`synthetic-boarding-${sequence}`,startedAt,endsAt:startedAt+10000};for(const member of value.members)member.ready=true;
 }
 if(display){value.selfSeatId=null;value.privateRole=null;}
 app=await mountPlanetApp(root,{connection:connection(),allowSynthetic:true});
 if(kind!=='brand')await app.session.operate({operation:'requestAdmission',roomCode:'PLANET',kind:display?'display':'player',displayName:'SYNTHETIC'});
 return {kind,role,character,count,reduced,textScale,display,release,provenance:'Synthetic transport through actual hosted app/session/presentation; no multiplayer/device acceptance'};
}

window.pregameHarness={startCase,get app(){return app},get value(){return value},requests,
 diagnostic(){return {model:app.session.getModel(),validation:PlanetSessionSnapshotSchema.safeParse(value),body:document.body.textContent};},
 reveal(open=true){
  const button=document.getElementById('planet-role-reveal');
  if(button&&button.getAttribute('aria-expanded')!==String(open))button.click();
 },
 async refresh(){await app.session.refresh();},
 async reloadApp({forgetSeen=false}={}){app.dispose();if(forgetSeen)sessionStorage.removeItem('mothership:planet:films-seen');app=await mountPlanetApp(root,{connection:connection(),allowSynthetic:true});},
 async revoke(){denied=true;await app.session.refresh();},
 async disconnect(){lost=true;await app.session.refresh();},
 async reconnect(){lost=false;await app.session.refresh();},
 async expire(){await new Promise(done=>setTimeout(done,Math.max(0,value.setup.endsAt-Date.now())+40));await app.session.refresh();},
 async serverRunning(views){
  const s=views?{...value,...views,status:'running',setup:null,privateRole:null}:sessionScenario(value.selfSeatId===null?'display':'board',{now:Date.now(),count:value.playerCount});
  for(const key of ['matchId','versions','setupFlowVersion','admission','members','selfSeatId'])s[key]=value[key];
  for(const view of [s.publicView,s.playerView,s.foodPublicView,s.foodPlayerView])if(view){view.matchId=s.matchId;view.versions=s.versions;}
  value=s;
  await app.session.refresh();
 },
 setUid(next){uid=next;},
 dispose(){app?.dispose();app=null;},
};
const query=new URL(location.href).searchParams;
await startCase({kind:query.get('kind')??'role',role:query.get('role')??'hacker',character:query.get('character')??'c8',count:Number(query.get('count')??9),reduced:query.get('reduced')==='1',textScale:Number(query.get('textScale')??1),elapsed:Number(query.get('elapsed')??0),display:query.get('display')==='1',release:query.get('release')??'historical'});
window.pregameHarness.ready=true;
