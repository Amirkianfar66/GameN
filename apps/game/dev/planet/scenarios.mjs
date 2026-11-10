globalThis[Symbol.for('mothership:dev-only')]=true;
// Explicit synthetic authority. These are contract exercises, never multiplayer/balance evidence.
import {PLANET_GAME_PINS,PLANET_PHONE_OFFER_PINS,PLANET_ORIGINAL_PINS,PLANET_SYNC_PINS,PlanetPlayerViewSchema,PlanetPublicViewSchema} from '@mothership/contracts';
const ids=Array.from({length:9},(_,i)=>`seat-${i+1}`);
const roleSeat={Insider:1,Doctor:2,'Blue Disabler':3,Supplier:4,Undercover:5,Hacker:6,Alien:7,'Red Disabler':8,Engineer:9};
export const SCENARIOS=['board','hacker','engineer','alien','doctor','hospital','promises','promise-results','windows','movement','navigation','tie','appointment','block','blackout','display','vote','finished','reading','choosing','host'];
const strokes={strokes:[{color:'#F7D886',width:4,points:[[.12,.7],[.4,.2],[.7,.7],[.12,.7]]}]};
export function makePlanetScenario(name='board',{now=1_000_000,count=9,tuple='current'}={}){
 const pins=tuple==='original'?PLANET_ORIGINAL_PINS:tuple==='sync'?PLANET_SYNC_PINS:tuple==='phone'?PLANET_PHONE_OFFER_PINS:PLANET_GAME_PINS;
 const role=name==='engineer'?'Engineer':name==='alien'?'Alien':name==='doctor'?'Doctor':name==='blackout'?'Blue Disabler':'Hacker';
 const own=`seat-${roleSeat[role]}`;
 const seats=ids.slice(0,count).map((seatId,i)=>({seatId,health:'Healthy',location:i<5?'Room A':'Room B',slotId:i<5?`A${i+1}`:`B${i-4}`,jailed:false,captain:false,officer:false,revealedFaction:null,rescueDueAfterRound:null,medical:null}));
 const v={versions:{...pins,assetManifestVersion:tuple==='phone'?'design-0.8.0':tuple==='crew'?'design-0.7.0':pins===PLANET_GAME_PINS?'design-0.6.0':'design-0.5.0'},matchId:'planet-local',viewRevision:1,round:6,playerCount:count,phase:{id:'planet-phase-turn',kind:'ORDINARY_TURN',startedAt:now-1000,endsAt:now+59000},activeSeatId:own,offices:{captainSeatId:null,officerSeatId:null,blockedSeatId:null},board:{kind:'PLAYER_CURRENT',finalizedRound:5,seats},hackSession:null,blackout:null,ballot:{eligibleVoters:ids.slice(0,count),eligibleTargets:ids.slice(0,count)},lastTally:null,navigation:{lastMovedRound:5,arrivedAt:null},events:[],result:null,endReveal:null,
 self:{seatId:own,role,faction:role==='Alien'?'Alien':role==='Hacker'?'Red':'Blue',ordinaryWeapons:0,movementSpent:false,roleActionSpent:false,shotSpent:false,standardHackSpent:false},
 abilities:{codeAttempted:false,shipHackUnlocked:false,shipHackSpent:false,scanBlockedThroughRound:null,blackholeSpent:false,blackoutSpent:false,engineerSpent:false,...(pins===PLANET_GAME_PINS||pins===PLANET_PHONE_OFFER_PINS?{engineerCapture:null,panelRequest:null}:{}),clone:role==='Alien'?{used:true,active:true,expiresAfterRound:7}:null,injectionsRemaining:role==='Doctor'?1:null,panelAttemptSpent:false,protectionGrants:[],captainCommands:null},knowledge:{insiderSeatIds:[],knownUndercoverSeatId:role==='Hacker'?'seat-5':null,scanResults:[]},offers:[],privateNavigation:null,hackFeedback:null,blackoutTargeting:null,promises:[],promiseQuota:{given:false,received:false},ownBallot:null,windows:[]};
 const offer=(type,targets=[],slots=[],windows=[],promiseTargets=[])=>({type,targetSeatIds:targets,slotIds:slots,windowIds:windows,promiseTargetSeatIds:promiseTargets});
 const phase=(kind,ms)=>{v.phase={id:`planet-phase-${kind}`,kind,startedAt:now-1000,endsAt:now-1000+ms};};
 const seat=id=>seats.find(s=>s.seatId===id);
 v.offers=[offer('PASS_TURN'),offer('MOVE',[],['B5'])];
 if(role==='Hacker')v.offers.push(offer('SCAN',ids.slice(0,count)),offer('SUBMIT_CODE',ids.slice(0,count)));
 if(name==='engineer')v.offers.push(offer('ENGINEER_SUPPRESS'));
 if(name==='alien'){
  phase('PRE_TURN',15000);v.offices.captainSeatId=own;seat(own).captain=true;seat(own).location='Command Room';seat(own).slotId='C1';v.offers=[offer('ACTIVATE_BLACKHOLE')];v.privateNavigation={position:'B2',direction:null,tieChoice:false,confirmation:null};v.abilities.captainCommands={releaseUsed:false,ejectUsed:false};
 }
 if(name==='doctor'){
  Object.assign(seat('seat-3'),{health:'Injured',location:'Hospital',slotId:'H1',rescueDueAfterRound:6,medical:{admittedRound:5,rescueDueAfterRound:6,rescueOpportunity:'CURRENT_NORMAL_ROUND'}});v.offers.push(offer('RESCUE',['seat-3']));
 }
 if(name==='hospital'){
  Object.assign(seat(own),{health:'Injured',location:'Hospital',slotId:'H1',jailed:true,rescueDueAfterRound:7,medical:{admittedRound:6,rescueDueAfterRound:7,rescueOpportunity:'NEXT_NORMAL_ROUND'}});v.activeSeatId='seat-1';v.offers=[offer('PANEL_CODE',ids.slice(0,count)),offer('SUBMIT_CODE',ids.slice(0,count))];v.windows=[{windowId:'A_HOSPITAL',canDraw:false,drawings:[]}];
 }
 if(name==='promises'||name==='promise-results'){
  phase('HACK',60000);v.hackSession={id:'planet-talk',actorSeatId:own,targetSeatId:'seat-1'};
  if(name==='promises'){
   v.offers=[offer('OFFER_PROMISE',['seat-1'],[],[],ids.slice(0,count)),offer('ACCEPT_PROMISE'),offer('DECLINE_PROMISE')];
   v.promises=[{id:'incoming-promise',giverSeatId:'seat-1',recipientSeatId:own,kind:'MEET_A',targetSeatId:null,round:6,electionId:null,accepted:false,status:'Pending',offerStatus:'offered'}];
  }else{
   v.offers=[];v.promiseQuota={given:true,received:true};v.promises=[{id:'given-promise',giverSeatId:own,recipientSeatId:'seat-1',kind:'MEET_B',targetSeatId:null,round:6,electionId:null,accepted:true,status:'Pending',offerStatus:'accepted'},{id:'received-promise',giverSeatId:'seat-3',recipientSeatId:own,kind:'JAIL_VOTE',targetSeatId:'seat-2',round:5,electionId:null,accepted:true,status:'Not fulfilled',offerStatus:'accepted'}];
  }
 }
 if(name==='windows'){
  v.self.movementSpent=true;v.offices.blockedSeatId=own;v.offers=[offer('SHOW_WINDOW',[],[],['A_B'])];v.windows=[{windowId:'A_B',canDraw:true,drawings:[{id:'shown-1',windowId:'A_B',authorSeatId:'seat-1',round:6,order:0,drawing:strokes},{id:'shown-2',windowId:'A_B',authorSeatId:own,round:6,order:1,drawing:strokes}]},{windowId:'B_JAIL',canDraw:false,drawings:[]}];
 }
 if(['navigation','tie','block'].includes(name)){
  v.offices.captainSeatId='seat-1';seat('seat-1').captain=true;v.offices.officerSeatId=own;seat(own).officer=true;
  if(name==='block'){phase('PRE_TURN',15000);v.offers=[offer('BLOCK_MOVE',['seat-1','seat-2','seat-3'])];}
  else{phase(name==='tie'?(pins===PLANET_GAME_PINS?'NAV_SETTING':'NAV_TIE'):'NAV_OFFICER_CONFIRM',15000);v.privateNavigation={position:'R1',direction:name==='tie'?null:'Red',tieChoice:name==='tie',confirmation:name==='tie'?null:'OFFICER'};v.offers=[offer(name==='tie'?'CHOOSE_NAV_DIRECTION':'CONFIRM_NAVIGATION')];}
 }
 if(name==='appointment'){
  phase('OFFICER_APPOINTMENT',30000);v.offices.captainSeatId=own;seat(own).captain=true;seat(own).location='Command Room';seat(own).slotId='C1';v.abilities.captainCommands={releaseUsed:true,ejectUsed:false};v.offers=[offer('APPOINT_OFFICER',ids.slice(0,count).filter(id=>id!==own))];
 }
 if(name==='blackout'){
  phase('BLACKOUT',15000);v.phase.startedAt=now-6000;v.phase.endsAt=now+9000;v.blackout={windowId:'planet-blackout',previewEndsAt:now-1000,endsAt:now+9000};v.blackoutTargeting={windowId:'planet-blackout',boundRoom:'Room A',selectable:true,selectedSlotId:null,slotIds:['A1','A2','A3','A4','A5']};v.offers=[offer('SELECT_BLACKOUT_SLOT',[],['A1','A2','A3','A4','A5'])];
 }
 if(name==='vote'){phase('VOTE_RESULT',5000);v.activeSeatId=null;v.offers=[];v.lastTally={kind:'JAIL_VOTE',phaseId:'prior-ballot',counts:{'seat-2':5,'seat-4':2},eligibleVoterCount:count,selectedSeatId:'seat-2',tiedSeatIds:[],outcome:'JAIL_FULL'};}
 if(name==='supply-before'){v.round=3;v.board.finalizedRound=2;v.navigation.lastMovedRound=2;v.phase={id:'supply-preview',kind:'BLACKOUT',startedAt:now-5000,endsAt:now+10000};v.blackout={windowId:v.phase.id,previewEndsAt:now,endsAt:v.phase.endsAt};v.activeSeatId=null;v.offers=[];}
 if(name==='finished'){v.phase={id:'planet-finished',kind:'FINISHED',startedAt:now-1000,endsAt:null};v.activeSeatId=null;v.offers=[];v.result={winner:'Red',reason:'ARRIVAL',alienCoWinner:true};v.navigation.arrivedAt='Red';v.board.finalizedRound=v.round;v.endReveal={roles:['Insider','Doctor','Blue Disabler','Supplier','Undercover','Hacker','Alien','Red Disabler','Engineer'].slice(0,count).map((role,i)=>({seatId:`seat-${i+1}`,role})),code:['seat-1','seat-2','seat-5','seat-7']};}
 return PlanetPlayerViewSchema.parse(v);
}
export function publicPlanet(view){
 const keys=['versions','matchId','viewRevision','round','playerCount','phase','activeSeatId','offices','board','hackSession','blackout','ballot','lastTally','navigation','events','result','endReveal'];
 return PlanetPublicViewSchema.parse({...Object.fromEntries(keys.map(key=>[key,structuredClone(view[key])])),board:{...structuredClone(view.board),kind:'FINALIZED'},events:view.events.filter(e=>e.audience.kind==='public')});
}
export function sessionScenario(name='board',options={}){
 const view=makePlanetScenario(name,options),publicView=publicPlanet(view);
 const setup=['choosing','reading','host'].includes(name),members=Array.from({length:view.playerCount},(_,i)=>({seatId:`seat-${i+1}`,displayName:`Crew ${i+1}`,characterId:name==='choosing'?i===5?null:`c${i+1}`:`c${i+1}`,controller:i===5?'human':'bot',ready:name==='reading'?i!==5:true}));
 return {matchId:view.matchId,roomCode:'PLANET',versions:view.versions,status:name==='choosing'?'choosing':name==='reading'?'reading':name==='host'?'lobby':name==='finished'?'finished':name==='aborted'?'aborted':'running',playerCount:view.playerCount,isHost:name==='host',admission:name==='host'?null:{requestId:name==='display'?'synthetic-display-request':'synthetic-player-request',kind:name==='display'?'display':'player',status:'admitted'},selfSeatId:name==='display'||name==='host'?null:view.self.seatId,members,pendingAdmissions:[],setup:setup&&name!=='host'?{id:'planet-setup',endsAt:(options.now??1_000_000)+30000}:null,privateRole:name==='reading'?{role:view.self.role,faction:view.self.faction,knowledge:view.knowledge}:null,publicView:setup||name==='aborted'?null:publicView,playerView:setup||name==='display'||name==='aborted'?null:view};
}
