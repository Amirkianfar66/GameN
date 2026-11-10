// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import {mountPlanetApp} from '../../hosted/planet/app.mjs';
import {sessionScenario,makePlanetScenario,publicPlanet} from '../planet/scenarios.mjs';

// Explicit synthetic authority around the actual native consumer. The harness can change
// server time and deliver authorized snapshots; production modules have no such controls.
const query=new URL(location.href).searchParams,name=query.get('scenario')??'board',count=Number(query.get('count')??9),tuple=query.get('tuple')??'phone';
let offset=0,uid='phone-review-owner',nextCreated=null,lost=false,receipt=null,readFailure=false;
const now=()=>Date.now()+offset;
function fixture(scenario,options={}){
 const value=sessionScenario(scenario,{now:now(),count,tuple,...options});
 if(query.get('flow')==='2')value.setupFlowVersion=2;
 if(query.get('flow')==='3'||options.flow===3){value.setupFlowVersion=3;if(value.status==='reading'){const stamp=now()-Number(query.get('elapsed')??0);value.setup={id:'phone-reading',startedAt:stamp,roleFilmStartsAt:stamp+20000,endsAt:stamp+30000};}}
 return value;
}
let value=fixture(name==='join'?'display':name),requests=[];
const answer=result=>({ok:true,serverTimeMs:now(),result});
const connection={mode:'synthetic',currentUid:()=>uid,signIn:async()=>uid,async request(request){
 requests.push(structuredClone(request));
 if(request.operation==='read')return readFailure?{ok:false,serverTimeMs:now(),error:{code:'UNAVAILABLE'}}:answer(structuredClone(value));
 if(request.operation==='create'){value=nextCreated??fixture('host',{count:request.playerCount});nextCreated=null;return answer({matchId:value.matchId,roomCode:value.roomCode});}
 if(request.operation==='requestAdmission'){
  value={...value,status:'lobby',selfSeatId:null,isHost:false,members:[],setup:null,privateRole:null,publicView:null,playerView:null,pendingAdmissions:[],admission:{requestId:request.requestId,kind:request.kind,status:'pending'}};return answer({matchId:value.matchId,admissionId:'phone-admission'});
 }
 if(request.operation==='redeemRecovery'){value=fixture('board');value.admission=null;return answer({matchId:value.matchId,seatId:value.selfSeatId});}
 if(request.operation==='command'){
  if(lost)return null;
  receipt={protocolVersion:3,matchId:value.matchId,phaseId:request.request.phaseId,commandId:request.request.commandId,status:'accepted',code:'REGISTERED'};return answer({receipt});
 }
 if(request.operation==='receipt')return answer({receipt});
 if(request.operation==='chooseCharacter'){value.members.find(m=>m.seatId===value.selfSeatId).characterId=request.characterId;return answer({matchId:value.matchId});}
 if(request.operation==='ready'){value.members.find(m=>m.seatId===value.selfSeatId).ready=true;return answer({matchId:value.matchId});}
 if(request.operation==='issueRecovery')return answer({recoveryCode:'SYNTHETIC-RECOVERY-CODE',expiresAt:now()+900000});
 return answer({matchId:value.matchId});
}};
const app=await mountPlanetApp(document.getElementById('planet-root'),{connection,matchId:name==='join'?undefined:value.matchId,allowSynthetic:true});
window.planetHarness={app,requests,candidateReady:app.artReady,makePlanetScenario,publicPlanet,get value(){return value;},now,
 fixture,setReadFailure(next){readFailure=next;},setNextCreated(next){nextCreated=next;},setLost(next){lost=next;},setReceipt(next){receipt=next;},setUid(next){uid=next;},
 async replace(next){value=structuredClone(next);await app.session.refresh();},
 async advanceClock(ms){offset+=ms;await app.session.refresh();},
 async scene(scenario){const next=fixture(scenario);if(next.playerView&&value.playerView)next.playerView.viewRevision=value.playerView.viewRevision+1;if(next.playerView)next.publicView=publicPlanet(next.playerView);value=next;await app.session.refresh();},
 async openJailVote(){const p=structuredClone(value.playerView),stamp=now(),ids=p.board.seats.filter(s=>s.health!=='Eliminated').map(s=>s.seatId);p.viewRevision++;p.phase={id:'phone-jail-vote',kind:'JAIL_VOTE',startedAt:stamp,endsAt:stamp+60000};p.activeSeatId=null;p.hackSession=null;p.ballot={eligibleVoters:ids,eligibleTargets:ids};p.offers=[{type:'VOTE',targetSeatIds:ids,slotIds:[],windowIds:[],promiseTargetSeatIds:[]}];value.playerView=p;value.publicView=publicPlanet(p);await app.session.refresh();}
};
