globalThis[Symbol.for('mothership:dev-only')]=true;
import {mountPlanetApp} from '../../hosted/planet/app.mjs';
import {loadArt} from '../../hosted/art.mjs';
import {planetBlackholePresentation} from '@mothership/presentation';
import {sessionScenario,makePlanetScenario,publicPlanet} from './scenarios.mjs';
import candidateArt from 'virtual:planet-library-candidates';
const name=new URL(location.href).searchParams.get('scenario')??'board';
const count=Number(new URL(location.href).searchParams.get('count')??9);
let value=sessionScenario(name==='join'?'display':name,{now:Date.now(),count}),lost=false,admissionRead=name==='join'?'forbidden':null;
const requests=[];
const connection={mode:'synthetic',currentUid:()=> 'planet-synthetic-uid',signIn:async()=> 'planet-synthetic-uid',async request(request){
 requests.push(structuredClone(request));
 const answer=result=>({ok:true,serverTimeMs:Date.now(),result});
 if(request.operation==='read')return admissionRead==='forbidden'?{ok:false,serverTimeMs:Date.now(),error:{code:'FORBIDDEN'}}:answer(structuredClone(value));
 if(request.operation==='receipt')return answer({receipt:null});
 if(request.operation==='command'){
  if(lost)return null;
  return answer({receipt:{protocolVersion:3,matchId:value.matchId,phaseId:request.request.phaseId,commandId:request.request.commandId,status:'accepted',code:'REGISTERED'}});
 }
 if(request.operation==='chooseCharacter'){value.members.find(m=>m.seatId===value.selfSeatId).characterId=request.characterId;return answer({matchId:value.matchId});}
 if(request.operation==='ready'){value.members.find(m=>m.seatId===value.selfSeatId).ready=true;return answer({matchId:value.matchId});}
 return answer({matchId:value.matchId});
}};
let candidateCinematics=null,candidateReady=Promise.resolve();
if(new URL(location.href).searchParams.get('art')==='library'){
 candidateReady=Promise.all(candidateArt.groups.map(group=>new Promise(done=>{const link=document.createElement('link'),timer=setTimeout(done,8000);link.rel='stylesheet';link.href=group.url;link.onload=()=>{clearTimeout(timer);const tokens=new Set((document.documentElement.dataset.art??'').split(' ').filter(Boolean));tokens.add(group.token);document.documentElement.dataset.art=[...tokens].join(' ');document.dispatchEvent(new Event('mothership:art-ready'));done();};link.onerror=()=>{clearTimeout(timer);done();};document.head.append(link);})));candidateCinematics=candidateArt.cinematics;
}
const app=await mountPlanetApp(document.getElementById('planet-root'),{connection,matchId:name==='join'?undefined:'planet-local',allowSynthetic:true,candidateCinematics});
let phaseSequence=0;
const applyPlayer=async player=>{value.publicView=publicPlanet(player);if(value.selfSeatId!==null)value.playerView=player;await app.session.refresh();};
const currentPlayer=()=>value.playerView?structuredClone(value.playerView):{...makePlanetScenario('board',{now:Date.now(),count:value.playerCount}),...structuredClone(value.publicView),board:{...structuredClone(value.publicView.board),kind:'PLAYER_CURRENT'}};
// Only this excluded harness exposes synthetic authority and inspection controls.
window.planetHarness={app,requests,candidateReady,get value(){return value;},setLost(next){lost=next;},
 async admission(mode){admissionRead=mode==='forbidden'?'forbidden':null;value=sessionScenario(mode==='player'?'board':'display',{now:Date.now(),count});await app.session.refresh();},
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
 async scene(scenario){value=sessionScenario(scenario,{now:Date.now(),count});await app.session.refresh();},
 async expired(){if(value.playerView){value.playerView.phase.startedAt=Date.now()-61000;value.playerView.phase.endsAt=value.playerView.phase.startedAt+60000;value.playerView.viewRevision++;value.publicView=publicPlanet(value.playerView);}await app.session.refresh();},
 async setupExpired(){value.setup.endsAt=Date.now()-1000;await app.session.refresh();},
 makePlanetScenario,publicPlanet};
