// mothership:dev-only
// Strict synthetic wire fixtures for actual production DOM checks. No engine/native-service
// acceptance is claimed by these records; real service journeys are recorded separately.
globalThis[Symbol.for('mothership:dev-only')]=true;
import {BOARD_MEDICAL_VERSION_PINS,CLONE_VERSION_PINS,blackoutSlotIds,FullPlayerViewSchema,FullPublicViewSchema} from '@mothership/contracts';
export function boardV2View({stage='ORDINARY_TURN',startedAt=Date.now(),count=9,revision=1,publicOnly=false,side='Red',overrides=new Map(),profile='medical',seatId='seat-6',role='Hacker'}) {
 const hack=['HACK_DECLARE','HACK_RESULT','HACK'].includes(stage),hackId='synthetic-native-field-exchange';
 const slots=['A4','H1','A1','J1','B2','A2','C1','H3','H9'];
 const locations=['Room A','Hospital','Room A','Jail','Room B','Room A','Command Room','Hospital','Hospital'];
 const seats=Array.from({length:count},(_,i)=>{
  const health=[1,7].includes(i)?'Injured':i===8?'Eliminated':'Healthy';
  return {seatId:`seat-${i+1}`,location:locations[i],slotId:slots[i],health,jailed:[3,7].includes(i),captain:i===6,revealedFaction:i===8?'Blue':null,
   medical:health==='Injured'?{admittedRound:5,rescueDueAfterRound:null,rescueOpportunity:'NO_ADDITIONAL_ROUND'}:null,...overrides.get(`seat-${i+1}`)};
 });
 const duration=stage==='BLACKOUT'?15000:stage==='HACK_DECLARE'?15000:stage==='HACK_RESULT'?5000:60000;
 const view={versions:{...(profile==='clone'?CLONE_VERSION_PINS:BOARD_MEDICAL_VERSION_PINS),assetManifestVersion:profile==='clone'?'design-0.4.0':'0.0.0-no-assets'},matchId:'board-simulation',viewRevision:revision,playerCount:count,round:5,
  phase:{id:stage==='HACK_DECLARE'?hackId:`phase-${stage}`,kind:stage,startedAt,endsAt:startedAt+duration},activeSeatId:stage==='BLACKOUT'?null:hack?'seat-1':seatId,
  seats,ballot:{eligibleVoters:[],eligibleTargets:[],releaseTargetSeatId:null},lastTally:null,result:null,endReveal:null,voteResult:null,
  hackSession:hack?{hackId,actorSeatId:'seat-1',targetSeatId:'seat-6'}:null,audience:publicOnly?{kind:'public'}:{kind:'player',seatId}};
 if(profile==='clone')view.blackout=stage==='BLACKOUT'?{snapshotId:view.phase.id,layoutRevision:'board-v2-0.1.1',darkStartsAt:startedAt+5000}:null;
 if(publicOnly)return FullPublicViewSchema.parse(view);
 Object.assign(view,{self:{seatId,role,movementDestinations:stage==='HACK_RESULT'||stage==='HACK_DECLARE'||stage==='BLACKOUT'?[]:['Room B'],releaseVoteAvailable:false,ordinaryWeapons:1,
  shotAvailable:!hack&&stage!=='BLACKOUT',rescuesRemaining:0,disablerAvailable:false,hackAvailable:!hack,scanAvailable:!hack,codeAttemptAvailable:role==='Hacker'&&!['HACK_DECLARE','HACK_RESULT'].includes(stage)},
  knowledge:{insiderCandidates:[],undercoverSeatId:role==='Hacker'?'seat-5':null,code:role==='Alien'?['seat-1','seat-2','seat-3','seat-5']:[],scanResults:[],protections:[]},
  legalTargets:stage==='HACK_DECLARE'?{DECLARE_HACK_SIDE:['seat-6']}:hack?{}:{REGISTER_SHOT:['seat-1','seat-3'],PASS_TURN:['seat-6'],REQUEST_HACK:['seat-1','seat-3'],SCAN:['seat-1','seat-3']},
  ownPendingCommandIds:[],ownBallot:null,hasVoted:false,hackPartnerSeatId:hack?'seat-1':null,
  hackFeedback:hack?{hackId,phaseId:view.phase.id,round:5,status:stage==='HACK_DECLARE'?'AWAITING_DECLARATION':'DECLARED',declaredSide:stage==='HACK_DECLARE'?null:side}:null});
 if(profile==='clone'){view.self.captainCommandUses=seats.find(s=>s.seatId===seatId).captain?{releaseUsed:false,ejectUsed:false}:null;view.self.cloneStatus=role==='Alien'?{used:false,activatedRound:null,expiresAfterRound:null,active:false}:null;
  view.self.blackoutTargeting=stage==='BLACKOUT'&&role.includes('Disabler')?{snapshotId:view.phase.id,room:'Room B',slotIds:blackoutSlotIds('Room B',count),darkStartsAt:startedAt+5000,endsAt:startedAt+15000,selectedSlotId:null}:null;
  if(stage==='BLACKOUT'){view.legalTargets=view.self.blackoutTargeting?{SELECT_BLACKOUT_SLOT:[seatId]}:{};view.self.hackAvailable=false;view.self.scanAvailable=false;}
  else if(!hack){view.legalTargets={PASS_TURN:[seatId],...(seats.find(s=>s.seatId===seatId).captain?{CAPTAIN_RELEASE:[seatId],CAPTAIN_EJECT:[seatId]}:{}),...(role==='Alien'?{ACTIVATE_CLONE:[seatId]}:{}),...(role.includes('Disabler')?{REQUEST_BLACKOUT:[seatId]}:{})};}
 }
 return FullPlayerViewSchema.parse(view);
}
