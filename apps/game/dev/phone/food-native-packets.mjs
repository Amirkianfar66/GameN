// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
// Node-only comparison preparation. The approved storyboards supply input
// times; the actual candidate engine supplies every native projection. Neither
// the design simulator nor the engine is imported into the phone consumer.
import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PLANET_FOOD_TASK_PINS,PlanetSessionSnapshotSchema,foodTaskHoldRelease} from '@mothership/contracts';
import {createPlanetGame,applyPlanetFoodCommand,advancePlanetDeadline,planetDeadlineAt,setPlanetFoodPresence,
 projectPlanetPublic,projectPlanetPlayer,projectPlanetFoodPublic,projectPlanetFoodPlayer,assertPlanetGameState} from '../../../../packages/engine/dist/index.js';
import {finishFoodOrdinaryTurn} from '../../../../packages/engine/dist/planet-game/food-meals.js';
import {planetSeatView} from '../../../../packages/engine/dist/planet-game/model.js';
import {BOARDS} from '../../../../design/food-supply/boards.mjs';
import {ROSTER,board as fixtureBoard} from '../../../../design/phone-ui/prototype/fixtures.mjs';

const T=100_000,copy=v=>structuredClone(v),ids=ROSTER.map(p=>`seat-${p.seat}`),pins={...PLANET_FOOD_TASK_PINS,assetManifestVersion:'design-0.9.0'};
const roles=['Insider','Doctor','Blue Disabler','Supplier','Undercover','Hacker','Alien','Red Disabler','Engineer'];
function driver(boardName='cooperation'){
 let serial=0,lastDown=null;
 const context=(now,roll=.99)=>({now,nextPhaseId:`review-phase-${++serial}`,nextDeadlineToken:`review-token-${serial}`,random:Array(64).fill(roll),
  foodIds:{requestId:`review-request-${serial}`,taskId:`review-task-${serial}`,winchControlSessionId:`review-winch-${serial}`,panelControlSessionId:`review-panel-${serial}`}});
 let state=createPlanetGame({matchId:'native-food-review',playerCount:9,roleOrder:roles,initialRooms:Object.fromEntries(ids.map((id,i)=>[id,i<4?'Room A':'Room B'])),initialTurnOrder:ids,assetManifestVersion:pins.assetManifestVersion,versions:pins},context(T-1000));
 // Explicitly constructed pre-Task prefix matching the existing design roster.
 // It is not a claim of a lobby-to-round-three or multiplayer journey.
 state=copy(state);state.round=3;state.turnOrder=['seat-7',...ids.filter(id=>id!=='seat-7')];state.global.roundOrders['3']=[...state.turnOrder];state.food.completedThroughRound=2;state.food.step.round=3;
 state.food.lastTaskRound={'seat-1':2,'seat-7':2};
 const world=state.worlds[state.currentWorldId];world.captainSeatId='seat-2';world.officerSeatId='seat-3';
 for(const p of fixtureBoard()){const seat=world.seats.find(s=>s.seatId===`seat-${p.seat}`);Object.assign(seat,{location:p.location,slotId:p.slot,health:p.health,jailed:p.jailed});
  if(p.health==='Injured'){seat.rescueDueAfterRound=3;seat.medical={admittedRound:2,rescueDueAfterRound:3,rescueOpportunity:'CURRENT_NORMAL_ROUND'};}}
 let ledger=world.food;
 for(let i=0;i<8;i++)ledger=finishFoodOrdinaryTurn(ledger,{matchId:state.matchId,round:2,seatId:ids[i],sourcePhaseId:`prior-turn-${i}`,order:i+1,endedAt:T-2000+i,health:'Healthy',location:'Room A',placement:{location:'Room A',slotId:'A1'}}).ledger;
 world.food=ledger;state.food.turnEnds=ledger.turnEnds.map(t=>({...t,placement:null}));state.food.nextCompletionOrder=9;state.food.publicStock={doses:ledger.doses,publicationRound:2};
 state.finalized={round:2,seats:world.seats.map(s=>planetSeatView(world,s)),events:[],checkpoint:'ROUND_FINALIZED'};
 const board=BOARDS.find(b=>b.id===boardName);assert.ok(board);
 for(const role of ['winch','panel'])if(board.protection[role]){const seat=world.seats.find(s=>s.seatId===(role==='winch'?'seat-8':'seat-3'));seat.protection={donorSeatId:'seat-5',activeFromRound:2,consumed:false};seat.protectionEver=true;}
 assertPlanetGameState(state);
 function advance(now){for(let i=0;i<500;i++){const at=planetDeadlineAt(state);if(at===null||at>now)return;const ctx=context(at);state=advancePlanetDeadline(state,{...ctx,phaseId:state.phase.id,deadlineToken:state.deadlineToken}).state;}throw Error('Unbounded fixture deadline');}
 function food(actor,command,now,original=null){advance(now);const request=original??{schemaVersion:1,protocolVersion:3,matchId:state.matchId,phaseId:state.phase.id,foodStepId:state.food.step.id,round:state.round,commandId:`review-command-${++serial}`,command};
  const result=applyPlanetFoodCommand(state,actor,request,context(now,command?.type==='TASK_ANSWER'?.1:.99));state=result.state;return {request,receipt:result.receipt};}
 function ask(){return food('seat-8',{type:'TASK_ASK',partnerSeatId:'seat-3'},T-100);}
 function answer(choice='JOIN',now=T){const r=state.food.step.invitation;return food('seat-3',{type:'TASK_ANSWER',requestId:r.requestId,requestRevision:r.revision,answer:choice},now);}
 function press(row){const actor=`seat-${row.seat}`,now=T+row.at;advance(now);
  if(row.seat===undefined)return;
  if(row.online!==undefined){state=setPlanetFoodPresence(state,actor,row.online,context(now));return;}
  const t=projectPlanetFoodPlayer(state,actor,now).participantTask;assert.ok(t);
  if(row.act==='lower'){assert.ok(lastDown);return food(actor,null,now,foodTaskHoldRelease(lastDown,`review-release-${++serial}`));}
  const input=row.act==='raise'?{kind:'HOLD',edge:'DOWN',gestureSequence:(lastDown?.command.input.gestureSequence??0)+1,crateId:t.crate.id}:{kind:({release:'PANEL_RELEASE',lock:'PANEL_LOCK',key:'KEY'})[row.act]};
  assert.ok(input.kind);const result=food(actor,{type:'TASK_PRESS',taskId:t.taskId,controlSessionId:t.controlSessionId,expectedControlRevision:t.controlRevision,input},now);assert.equal(result.receipt.status,'accepted',JSON.stringify(row));if(row.act==='raise')lastDown=result.request;return result;
 }
 function packet(seatId,now){advance(now);const value={matchId:state.matchId,roomCode:'K7Q2XM',versions:pins,status:state.phase.kind==='FINISHED'?'finished':'running',playerCount:9,isHost:false,selfSeatId:seatId,admission:null,
  members:ROSTER.map(p=>({seatId:`seat-${p.seat}`,displayName:p.name,characterId:p.character,controller:'human',ready:true})),pendingAdmissions:[],setup:null,privateRole:null,
  publicView:projectPlanetPublic(state),playerView:seatId?projectPlanetPlayer(state,seatId):null,foodPublicView:projectPlanetFoodPublic(state,now),foodPlayerView:seatId?projectPlanetFoodPlayer(state,seatId,now):null};
  return {now,value:PlanetSessionSnapshotSchema.parse(value)};
 }
 function rejectedLock(seatId,now){
  const t=projectPlanetFoodPlayer(state,seatId,now).participantTask;
  assert.ok(t.controlRevision>0);
  // Explicit synthetic recovery setup: an original LOCK carrying an older
  // control revision. The real candidate engine, rather than the capture
  // transport, determines and stores its rejection. This is not a claim that
  // the current phone submitted that stale revision through its controls.
  const result=food(seatId,{type:'TASK_PRESS',taskId:t.taskId,controlSessionId:t.controlSessionId,
   expectedControlRevision:t.controlRevision-1,input:{kind:'PANEL_LOCK'}},now);
  assert.equal(result.receipt.status,'rejected');assert.equal(result.receipt.code,'STALE_CONTEXT');
  return {...result,construction:'Constructed original stale-revision LOCK, rejected by the actual candidate engine. The native recovery store first has no receipt, then reads this exact authoritative receipt; no rejection is synthesized in the capture transport.'};
 }
 return {board,ask,answer,food,packet,advance,press,rejectedLock,get state(){return state;}};
}

export function nativeFoodCase(query){
 const result=buildNativeFoodCase(query);
 if(new URLSearchParams(query).get('names')==='long')for(const packet of [result.initial,result.next].filter(Boolean)){
  for(const member of packet.value.members)if(['seat-3','seat-8'].includes(member.seatId))member.displayName='WWWWWWWWWWWW';
  PlanetSessionSnapshotSchema.parse(packet.value);
 }
 return result;
}
function buildNativeFoodCase(query){
 const p=new URLSearchParams(query),s=p.get('s'),board=p.get('board')??'cooperation',as=p.get('as')??'winch',d=driver(board),seat=as==='panel'?'seat-3':as==='other'?'seat-6':'seat-8';
 if(s==='task'||s==='return'||s==='away'){
  d.ask();d.answer();const target=s==='away'?6900:s==='return'?32501:Number(p.get('t')??6000),limit=target-(p.get('before')==='1'?1:0);
  for(const row of d.board.steps)if(row.at<=limit)d.press(row);
  const prior=s==='return'?(as==='other'?nativeFoodCase(`s=task&board=${board}&t=6000&as=other`).initial:d.packet(seat,T+32000)):null;
  const current=prior??d.packet(s==='away'?'seat-6':seat,T+target);
  if(p.get('press')==='refused')return {initial:nativeFoodCase(`s=task&board=${board}&t=6650&as=${as}`).initial,next:current,screen:null,feedback:'refused',act:p.get('act')};
  if(p.get('press')==='lost'){
   const recovery=d.rejectedLock(seat,T+target);
   return {initial:d.packet(seat,T+target),next:null,screen:null,recovery};
  }
  return {initial:current,next:s==='return'?d.packet(seat,T+target):null,screen:null,feedback:p.get('press'),act:p.get('act')};
 }
 if(s==='stock'||s==='howto'){
  const at=T+62000,record=d.packet(s==='stock'?'seat-4':'seat-8',at);
  if(s==='stock'){const doses=Number(p.get('n'))*2;record.value.foodPublicView.stock.doses=doses;record.value.foodPlayerView.stock.doses=doses;PlanetSessionSnapshotSchema.parse(record.value);}
  return {initial:record,next:null,screen:s==='howto'?'howto':null};
 }
 const step=p.get('step')??'task',answer=p.get('answer');
 if(s==='called'||['asking','declined','withdrawn','starting','withdraw-late','busy'].includes(step))d.ask();
 const self=s==='called'?'seat-3':step==='busy'?'seat-6':'seat-8',initial=d.packet(self,T-50);
 if(s==='called'){
  if(['late-withdrawn','late-expired'].includes(answer)){
   const r=d.state.food.step.invitation;
   if(answer==='late-withdrawn')d.food('seat-8',{type:'TASK_ASK_WITHDRAW',requestId:r.requestId,requestRevision:r.revision},T+100);
   return {initial,next:d.packet(self,answer==='late-expired'?T+15000:T+200),screen:null};
  }
  return {initial,next:null,screen:null,action:answer==='join'||answer==='joining'?'JOIN':null,feedback:answer==='joining'?'sending':null};
 }
 if(step==='declined')d.answer('DECLINE',T+100);
 if(step==='withdrawn'){const r=d.state.food.step.invitation;d.food('seat-8',{type:'TASK_ASK_WITHDRAW',requestId:r.requestId,requestRevision:r.revision},T+100);}
 if(step==='withdraw-late'){
  const r=d.state.food.step.invitation;d.answer();const result=d.food('seat-8',{type:'TASK_ASK_WITHDRAW',requestId:r.requestId,requestRevision:r.revision},T+10);
  return {initial,next:null,screen:null,action:'WITHDRAW',actionAt:T+10,replyClosure:result.receipt.requestClosure};
 }
 if(step==='starting'){
  d.answer();const next=d.packet(self,T+10);next.value.foodPlayerView.participantTask=null;next.value.foodPlayerView.offers=[];PlanetSessionSnapshotSchema.parse(next.value);
  return {initial,next,screen:null,construction:'Contract-valid transient joined publication for visual review. Runtime normally supplies the briefing in this read; no client wait is introduced.'};
 }
 if(step==='closed')return {initial:d.packet(self,T+62000),next:null,screen:'tasks'};
 if(step==='rested'){const r=d.packet(self,T);r.value.foodPlayerView.ownAvailability={canAsk:false,reason:'WENT_LAST_ROUND'};r.value.foodPlayerView.offers=[];PlanetSessionSnapshotSchema.parse(r.value);return {initial:r,next:null,screen:'tasks'};}
 return {initial,next:['declined','withdrawn'].includes(step)?d.packet(self,T+200):null,screen:step==='partner'?'partners':['task','rested','busy'].includes(step)?'tasks':null};
}

if(process.argv[1]===new URL(import.meta.url).pathname){
 const map=JSON.parse(readFileSync(new URL('../../../../docs/frontend/food-supply-comparison-map.json',import.meta.url))),cases=map.cases.map(c=>({...c,native:nativeFoodCase(c.reference.query)}));
 const output={developmentOnly:'mothership:dev-only',scope:'Synthetic native comparison. Constructed pre-Task engine prefix matching the approved design roster; the real candidate engine produces Task/return packets from approved storyboard input times. Stock-count and own-availability variants are explicitly constructed contract-valid presentation cases. No API/multiplayer/device/Designer acceptance.',pins,cases};
 const path=new URL('./food/native-fixtures.json',import.meta.url);writeFileSync(path,JSON.stringify(output));console.log(`Prepared ${cases.length} native Food cases; sha256 ${createHash('sha256').update(readFileSync(path)).digest('hex')}`);
}
