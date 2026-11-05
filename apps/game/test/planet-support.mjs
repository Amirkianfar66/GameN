import {createPlanetController} from '../dist/index.js';
import {PLANET_GAME_PINS} from '@mothership/contracts';
export const ids=Array.from({length:9},(_,i)=>`seat-${i+1}`);
export function planetView(role='Hacker',count=9){
 const self=role==='Alien'?'seat-7':role==='Doctor'?'seat-2':'seat-6';
 const seats=ids.slice(0,count).map((seatId,i)=>({seatId,health:'Healthy',location:i<5?'Room A':'Room B',slotId:i<5?`A${i+1}`:`B${i-4}`,jailed:false,captain:false,officer:false,revealedFaction:null,rescueDueAfterRound:null,medical:null}));
 return {versions:{...PLANET_GAME_PINS,assetManifestVersion:'design-0.5.0'},matchId:'planet-local',viewRevision:1,round:6,playerCount:count,
  phase:{id:'phase-6-turn',kind:'ORDINARY_TURN',startedAt:1000,endsAt:61000},activeSeatId:self,offices:{captainSeatId:null,officerSeatId:null,blockedSeatId:null},board:{kind:'PLAYER_CURRENT',finalizedRound:5,seats},hackSession:null,blackout:null,ballot:{eligibleVoters:ids.slice(0,count),eligibleTargets:ids.slice(0,count)},lastTally:null,navigation:{lastMovedRound:5,arrivedAt:null},events:[],result:null,endReveal:null,
  self:{seatId:self,role,faction:role==='Alien'?'Alien':['Hacker','Undercover','Red Disabler'].includes(role)?'Red':'Blue',ordinaryWeapons:0,movementSpent:false,roleActionSpent:false,shotSpent:false,standardHackSpent:false},
  abilities:{codeAttempted:false,shipHackUnlocked:false,shipHackSpent:false,scanBlockedThroughRound:null,blackholeSpent:false,blackoutSpent:false,engineerSpent:false,clone:role==='Alien'?{used:false,active:false,expiresAfterRound:null}:null,injectionsRemaining:role==='Doctor'?2:null,panelAttemptSpent:false,protectionGrants:[],captainCommands:null},
  knowledge:{insiderSeatIds:[],knownUndercoverSeatId:role==='Hacker'?'seat-5':null,scanResults:[]},offers:['PASS_TURN','MOVE','SCAN','SUBMIT_CODE'].map(type=>({type,targetSeatIds:ids.slice(0,count),slotIds:type==='MOVE'?['A1','B5','C1']:[],windowIds:[]})),privateNavigation:null,hackFeedback:null,blackoutTargeting:null,promises:[],promiseQuota:{given:false,received:false},ownBallot:null,windows:[]};
}
export function rig(initial=planetView(),options={}){
 let now=options.now??1000,uid='local-uid',listener=null,saved=null,serial=0,reply=options.reply??'accepted',timerId=0;
 const timers=new Map(),sent=[],lookups=[];
 const response=request=>({receipt:{protocolVersion:3,matchId:request.matchId,phaseId:request.phaseId,commandId:request.commandId,status:'accepted',code:'REGISTERED'},serverTimeMs:now});
 const ports={clock:{now:()=>now},scheduler:{setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,due:now+ms});return id;},clearTimeout(id){timers.delete(id);}},ids:{next:()=>`planet-command-${++serial}`},unresolved:{load:()=>saved,save:value=>{saved=value;},clear:()=>{saved=null;}}};
 const transport={mode:'synthetic',currentUid:()=>uid,authenticate:async()=>({uid:'local-uid',matchId:'planet-local',seatId:options.display?null:initial.self.seatId}),serverTime:async()=>now,
  listen(audience,next){listener=next;next.snapshot({value:initial,fresh:true});return()=>{listener=null;};},
  async command(request){sent.push(structuredClone(request));if(reply==='lost')throw Error('lost');if(reply==='never')return new Promise(()=>{});return response(request);},
  async receipt(context){lookups.push(context);return reply==='lost'?null:response(context);},identities:()=>[]};
 const controller=createPlanetController(transport,ports,{matchId:'planet-local',surface:options.display?'display':'player'});
 return {controller,ports,transport,sent,lookups,read:()=>controller.getModel(),saved:()=>saved,setSaved:value=>{saved=value;},setUid:value=>{uid=value;},setReply:value=>{reply=value;},
  push(value,fresh=true){initial=value;listener?.snapshot({value,fresh});},
  async advance(ms){now+=ms;for(const [id,t]of [...timers])if(t.due<=now){timers.delete(id);t.fn();}await Promise.resolve();await Promise.resolve();},
 };
}
