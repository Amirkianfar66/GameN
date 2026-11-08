globalThis[Symbol.for('mothership:dev-only')]=true;
import {mountPlanetApp} from '../../hosted/planet/app.mjs';
import {loadArt} from '../../hosted/art.mjs';
import {planetBlackholePresentation} from '@mothership/presentation';
import {sessionScenario,makePlanetScenario,publicPlanet} from './scenarios.mjs';
const name=new URL(location.href).searchParams.get('scenario')??'board';
const tuple=new URL(location.href).searchParams.get('tuple')??'current';
const count=Number(new URL(location.href).searchParams.get('count')??9);
// Optional public character assignment for the excluded hair-motion review video.
function reviewSession(...args){
 const value=sessionScenario(...args);
 if(new URL(location.href).searchParams.get('crewPair')==='hair'){
  const swapped={c1:'c9',c9:'c1',c6:'c8',c8:'c6'};
  for(const member of value.members)member.characterId=swapped[member.characterId]??member.characterId;
 }
 return value;
}
let value=reviewSession(name==='join'?'display':name,{now:Date.now(),count,tuple}),lost=false,admissionRead=name==='join'?'forbidden':null;
const requests=[];let rejectNextPanel=false,originalAdmission=null,authUid='planet-synthetic-uid',sessionReplies=null,receipt=null;
const connection={mode:'synthetic',currentUid:()=>authUid,signIn:async()=>authUid,async request(request){
 requests.push(structuredClone(request));
 const answer=result=>({ok:true,serverTimeMs:Date.now(),result});
 if(sessionReplies?.operation===request.operation&&sessionReplies.replies.length){const reply=sessionReplies.replies.shift();if(reply==='missing-code')return answer({});if(reply!=='success')return {ok:false,serverTimeMs:Date.now(),error:{code:reply}};}
 if(request.operation==='read')return admissionRead?{ok:false,serverTimeMs:Date.now(),error:{code:admissionRead==='forbidden'?'FORBIDDEN':'UNAVAILABLE'}}:answer(structuredClone(value));
 if(request.operation==='requestAdmission'){originalAdmission={requestId:request.requestId,kind:request.kind};return answer({matchId:value.matchId,admissionId:'synthetic-admission'});}
 if(request.operation==='redeemRecovery'){value=reviewSession('board',{now:Date.now(),count,tuple});value.admission=null;admissionRead=null;return answer({matchId:request.matchId,seatId:value.selfSeatId});}
 if(request.operation==='receipt')return answer({receipt});
 if(request.operation==='issueRecovery')return answer({recoveryCode:'SYNTHETICRECOVERY'+'X'.repeat(111),expiresAt:Date.now()+900000});
 if(request.operation==='command'){
  if(lost)return null;
  if(rejectNextPanel&&request.request.command.type==='PANEL_CODE'){rejectNextPanel=false;return answer({receipt:{protocolVersion:3,matchId:value.matchId,phaseId:request.request.phaseId,commandId:request.request.commandId,status:'rejected',code:'NO_INJECTION'}});}
  return answer({receipt:{protocolVersion:3,matchId:value.matchId,phaseId:request.request.phaseId,commandId:request.request.commandId,status:'accepted',code:'REGISTERED'}});
 }
 if(request.operation==='chooseCharacter'){value.members.find(m=>m.seatId===value.selfSeatId).characterId=request.characterId;return answer({matchId:value.matchId});}
 if(request.operation==='ready'){value.members.find(m=>m.seatId===value.selfSeatId).ready=true;return answer({matchId:value.matchId});}
 return answer({matchId:value.matchId});
}};
const app=await mountPlanetApp(document.getElementById('planet-root'),{connection,matchId:name==='join'||new URL(location.href).searchParams.has('resumeOnly')?undefined:'planet-local',allowSynthetic:true});
const candidateReady=app.artReady;
let phaseSequence=0;
const applyPlayer=async player=>{value.publicView=publicPlanet(player);if(value.selfSeatId!==null)value.playerView=player;await app.session.refresh();};
const currentPlayer=()=>value.playerView?structuredClone(value.playerView):{...makePlanetScenario('board',{now:Date.now(),count:value.playerCount}),...structuredClone(value.publicView),board:{...structuredClone(value.publicView.board),kind:'PLAYER_CURRENT'}};
// Only this excluded harness exposes synthetic authority and inspection controls.
window.planetHarness={app,requests,candidateReady,setReceipt(next){receipt=next;},setSessionReplies(operation,replies){sessionReplies={operation,replies:[...replies]};},setUid(uid){authUid=uid;},rejectPanel(){rejectNextPanel=true;},get value(){return value;},setLost(next){lost=next;},
 async admission(mode,context=originalAdmission){
  admissionRead=['forbidden','unavailable'].includes(mode)?mode:null;if(admissionRead){await app.session.refresh();return;}
  if(!context)throw Error('Synthetic admission needs its original request binding');originalAdmission=context;
  value=reviewSession(mode==='player'?'board':'display',{now:Date.now(),count,tuple});
  value.admission={...context,status:['pending','closed','declined','seatless'].includes(mode)?mode==='seatless'?'pending':mode:'admitted'};
  if(value.admission.status!=='admitted')Object.assign(value,{isHost:false,selfSeatId:null,members:[],pendingAdmissions:[],setup:null,privateRole:null,publicView:null,playerView:null});
  await app.session.refresh();
 },
 presentation:()=>app.game?planetBlackholePresentation(app.game.getModel()):null,
 setVisible(visible){app.game?.setVisible(visible);app.session.setVisible(visible);},
 reloadArt:()=>loadArt('player',document),
 async startPresentation(elapsedMs=0){
  const p=currentPlayer(),start=Date.now()-elapsedMs;p.viewRevision++;p.phase={id:`synthetic-sync-${++phaseSequence}`,kind:'BLACKHOLE_PRESENTATION',startedAt:start,endsAt:start+6000};p.activeSeatId=null;p.hackSession=null;p.offers=[];p.ballot={eligibleVoters:[],eligibleTargets:[]};p.board.finalizedRound=p.round;
  p.events=[{id:`synthetic-sync-event-${phaseSequence}`,round:p.round,phaseId:p.phase.id,viewRevision:p.viewRevision,publishedAt:start,expiresAt:start+30000,audience:{kind:'public'},kind:'BLACKHOLE_SYNCED',seatIds:[],actorSeatId:null,location:null,slotId:null,clinicalAnchor:null}];await applyPlayer(p);
 },
 async openJailVote({fulfillMeetings=false}={}){
  const p=currentPlayer(),start=Date.now(),ids=p.board.seats.filter(s=>s.health!=='Eliminated').map(s=>s.seatId);p.viewRevision++;p.phase={id:`synthetic-vote-${++phaseSequence}`,kind:'JAIL_VOTE',startedAt:start,endsAt:start+60000};p.activeSeatId=null;p.hackSession=null;p.ballot={eligibleVoters:ids,eligibleTargets:ids};p.offers=[{type:'VOTE',targetSeatIds:ids,slotIds:[],windowIds:[],promiseTargetSeatIds:[]}];
  if(fulfillMeetings)p.promises=p.promises.map(x=>['MEET_A','MEET_B'].includes(x.kind)?{...x,status:'Fulfilled'}:x);await applyPlayer(p);
 },
 async replace(next){value=structuredClone(next);await app.session.refresh();},
 async scene(scenario){value=reviewSession(scenario,{now:Date.now(),count,tuple});await app.session.refresh();},
 async expired(){if(value.playerView){value.playerView.phase.startedAt=Date.now()-61000;value.playerView.phase.endsAt=value.playerView.phase.startedAt+60000;value.playerView.viewRevision++;value.publicView=publicPlanet(value.playerView);}await app.session.refresh();},
 async setupExpired(){value.setup.endsAt=Date.now()-1000;await app.session.refresh();},
 makePlanetScenario,publicPlanet};
