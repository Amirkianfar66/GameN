globalThis[Symbol.for('mothership:dev-only')]=true;
import {mountPlanetApp} from '../../hosted/planet/app.mjs';
import {sessionScenario,makePlanetScenario,publicPlanet} from './scenarios.mjs';
const name=new URL(location.href).searchParams.get('scenario')??'board';
const count=Number(new URL(location.href).searchParams.get('count')??9);
let value=sessionScenario(name,{now:Date.now(),count}),lost=false;
const requests=[];
const connection={mode:'synthetic',currentUid:()=> 'planet-synthetic-uid',signIn:async()=> 'planet-synthetic-uid',async request(request){
 requests.push(structuredClone(request));
 const answer=result=>({ok:true,serverTimeMs:Date.now(),result});
 if(request.operation==='read')return answer(structuredClone(value));
 if(request.operation==='receipt')return answer({receipt:null});
 if(request.operation==='command'){
  if(lost)return null;
  return answer({receipt:{protocolVersion:3,matchId:value.matchId,phaseId:request.request.phaseId,commandId:request.request.commandId,status:'accepted',code:'REGISTERED'}});
 }
 if(request.operation==='chooseCharacter'){value.members.find(m=>m.seatId===value.selfSeatId).characterId=request.characterId;return answer({matchId:value.matchId});}
 if(request.operation==='ready'){value.members.find(m=>m.seatId===value.selfSeatId).ready=true;return answer({matchId:value.matchId});}
 return answer({matchId:value.matchId});
}};
const app=await mountPlanetApp(document.getElementById('planet-root'),{connection,matchId:'planet-local',allowSynthetic:true});
// Only this excluded harness exposes synthetic authority and inspection controls.
window.planetHarness={app,requests,get value(){return value;},setLost(next){lost=next;},
 async replace(next){value=structuredClone(next);await app.session.refresh();},
 async scene(scenario){value=sessionScenario(scenario,{now:Date.now()});await app.session.refresh();},
 async expired(){if(value.playerView){value.playerView.phase.startedAt=Date.now()-61000;value.playerView.phase.endsAt=value.playerView.phase.startedAt+60000;value.playerView.viewRevision++;value.publicView=publicPlanet(value.playerView);}await app.session.refresh();},
 async setupExpired(){value.setup.endsAt=Date.now()-1000;await app.session.refresh();},
 makePlanetScenario,publicPlanet};
