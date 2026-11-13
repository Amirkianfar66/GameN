import assert from 'node:assert/strict';
import {test} from 'node:test';
import {planetSeatView} from '../dist/planet-game/model.js';
import {PLANET_FOOD_TASK_PINS,FOOD_TASK_VERTICAL} from '@mothership/contracts';
import {createPlanetGame,applyPlanetCommand,advancePlanetDeadline,planetDeadlineAt,applyPlanetFoodCommand,
  projectPlanetPublic,projectPlanetPlayer,projectPlanetFoodPublic,projectPlanetFoodPlayer,
  encodePlanetGameState,decodePlanetGameState,assertPlanetGameState,abortPlanetGame} from '../dist/index.js';

const copy=v=>structuredClone(v);
const foodBody=v=>{const x=copy(v);delete x.serverNowMs;return x;};
function driver(n) {
  let sequence=0;
  const context=(now,sample=.99)=>({now,nextPhaseId:`food-phase-${++sequence}`,nextDeadlineToken:`food-token-${sequence}`,
    random:Array(64).fill(sample),foodIds:{requestId:`food-request-${sequence}`,taskId:`food-task-${sequence}`,
      winchControlSessionId:`winch-session-${sequence}`,panelControlSessionId:`panel-session-${sequence}`}});
  const ids=Array.from({length:n},(_,i)=>`seat-${i+1}`),roles=['Insider','Doctor','Blue Disabler','Supplier','Undercover','Hacker','Alien','Red Disabler','Engineer'].slice(0,n);
  const setup={matchId:`native-food-${n}`,playerCount:n,roleOrder:roles,initialRooms:Object.fromEntries(ids.map((id,i)=>[id,i<4?'Room A':'Room B'])),
    initialTurnOrder:ids,assetManifestVersion:'food-runtime-test',versions:{...PLANET_FOOD_TASK_PINS,assetManifestVersion:'food-runtime-test'}};
  const initial=context(0),history=[];let state=createPlanetGame(setup,initial);
  const commit=(result,record)=>{state=result.state;history.push(record);assertPlanetGameState(state);return result;};
  const food=(actor,command,now=state.evaluatedAt+1,{sample=.99,raw}={})=>{
    const request=raw??{schemaVersion:1,protocolVersion:3,matchId:state.matchId,phaseId:state.phase.id,
      foodStepId:state.food.step.id,round:state.round,commandId:`food-command-${++sequence}`,command};
    const ctx=context(now,sample),before=copy(state),result=applyPlanetFoodCommand(state,actor,request,ctx);
    assert.deepEqual(state,before);commit(result,{kind:'FOOD',actor,request,ctx,receipt:result.receipt});return {...result,request};
  };
  const ordinary=(actor,command,now=state.evaluatedAt+1)=>{
    const request={protocolVersion:3,matchId:state.matchId,phaseId:state.phase.id,commandId:`ordinary-${++sequence}`,command},ctx=context(now);
    const result=applyPlanetCommand(state,actor,request,ctx);commit(result,{kind:'ORDINARY',actor,request,ctx,receipt:result.receipt});return result;
  };
  const deadline=(now=planetDeadlineAt(state))=>{
    const ctx={...context(now),phaseId:state.phase.id,deadlineToken:state.deadlineToken},before=copy(state),result=advancePlanetDeadline(state,ctx);
    assert.deepEqual(state,before);assert.equal(result.advanced,true);commit(result,{kind:'CLOCK',ctx});return state;
  };
  const press=(actor,input,now,{revision,...rest}={})=>{
    const task=projectPlanetFoodPlayer(state,actor).participantTask;
    return food(actor,{type:'TASK_PRESS',taskId:task.taskId,controlSessionId:task.controlSessionId,
      expectedControlRevision:revision??task.controlRevision,input},now,rest);
  };
  const start=(at=1,joinedAt=at+1)=>{
    food('seat-1',{type:'TASK_ASK',partnerSeatId:'seat-2'},at);
    const r=state.food.step.invitation;
    food('seat-2',{type:'TASK_ANSWER',requestId:r.requestId,requestRevision:r.revision,answer:'JOIN'},joinedAt);
    return state.food.step.task;
  };
  const until=predicate=>{for(let i=0;!predicate(state);i++){assert.ok(i<500&&!state.result);if(state.phase.kind==='ORDINARY_TURN')ordinary(state.activeSeatId,{type:'PASS_TURN'});else deadline();}return state;};
  const replay=()=>{
    let restored=createPlanetGame(copy(setup),copy(initial));
    for(const row of history){
      const r=row.kind==='CLOCK'?advancePlanetDeadline(restored,copy(row.ctx))
        :row.kind==='FOOD'?applyPlanetFoodCommand(restored,row.actor,copy(row.request),copy(row.ctx))
          :applyPlanetCommand(restored,row.actor,copy(row.request),copy(row.ctx));
      if(row.receipt)assert.deepEqual(r.receipt,row.receipt);restored=r.state;
    }
    assert.deepEqual(restored,state);assert.deepEqual(decodePlanetGameState(encodePlanetGameState(state)),state);
  };
  return {ids,food,ordinary,deadline,press,start,until,replay,installConstructedState(value){state=value;assertPlanetGameState(state);},get state(){return state;}};
}
for(const n of [7,8,9]) {
  for(const stage of ['ASKING','RUNNING','ENDED','KILLED'])test(`${n}: abort archives ${stage} without early ordinary disclosure or active Food controls`,()=>{
    const d=driver(n);
    if(stage!=='ASKING'){
      const m=d.start();
      if(stage==='RUNNING')d.deadline(m.runningAt);
      else if(stage==='KILLED'){
        const t=m.options.startedAt,w=m.options.winchSeatId,p=m.options.panelSeatId;
        d.press(w,{kind:'HOLD',edge:'DOWN',gestureSequence:1,crateId:null},t+4000);d.deadline(t+4450);
        d.press(p,{kind:'PANEL_RELEASE'},t+4500);d.press(p,{kind:'PANEL_LOCK'},t+5251);
        d.press(w,{kind:'HOLD',edge:'UP',gestureSequence:1,crateId:null},t+5252);
        assert.equal(d.state.worlds[d.state.currentWorldId].seats.find(s=>s.seatId===p).health,'Eliminated');
      }else d.deadline(m.deadlineAt);
    }
    const before=projectPlanetPublic(d.state),saved=copy(d.state),now=d.state.evaluatedAt+1;
    const aborted=abortPlanetGame(d.state,{now,nextPhaseId:'abort-food',nextDeadlineToken:'abort-token',random:Array(64).fill(.99)});
    assert.deepEqual(d.state,saved);assert.equal(aborted.phase.kind,'ABORTED');assert.equal(planetDeadlineAt(aborted),null);
    assert.deepEqual(projectPlanetPublic(aborted).board,before.board);
    assert.deepEqual(projectPlanetPublic(aborted).offices,before.offices);
    assert.equal(projectPlanetFoodPublic(aborted).step,null);
    for(const id of d.ids){const v=projectPlanetFoodPlayer(aborted,id);assert.equal(v.participantTask,null);assert.deepEqual(v.offers,[]);}
    assert.deepEqual(decodePlanetGameState(encodePlanetGameState(aborted)),aborted);
  });
  test(`${n}: native final-millisecond request keeps all15 answer seconds and common return`,()=>{
    const d=driver(n);assert.equal(d.state.phase.kind,'FOOD_SUPPLY');
    assert.deepEqual(projectPlanetPlayer(d.state,'seat-6').offers,[]);
    assert.equal(d.ordinary('seat-6',{type:'SUBMIT_CODE',seatIds:d.state.code},1).receipt.code,'PHASE_CLOSED');
    const task=d.start(29999,44998);assert.equal(task.options.startedAt,44998);
    const returns=task.returnsAt;
    d.deadline(100000);assert.equal(d.state.phase.kind,'PRE_TURN');assert.equal(d.state.phase.startedAt,returns);
    assert.equal(projectPlanetPublic(d.state).board.checkpoint,'FOOD_RETURNED');d.replay();
  });
  test(`${n}: native cooperative Task, independent keys, old receipt and exactly-one Pass meal`,()=>{
    const d=driver(n),m=d.start(),t=m.options.startedAt,w=m.options.winchSeatId,p=m.options.panelSeatId;
    d.press(w,{kind:'HOLD',edge:'DOWN',gestureSequence:1,crateId:null},t+3999);
    d.deadline(t+4000);d.deadline(t+4450);
    d.press(p,{kind:'PANEL_RELEASE'},t+4500);d.press(p,{kind:'PANEL_LOCK'},t+5501);
    d.press(w,{kind:'HOLD',edge:'UP',gestureSequence:1,crateId:null},t+5502);d.deadline(t+5802);
    assert.equal(d.state.food.step.task.crate.state,'LANDED');assert.equal(d.state.food.step.task.crate.height,FOOD_TASK_VERTICAL.platform);
    const observed=projectPlanetFoodPlayer(d.state,p).participantTask.controlRevision;
    assert.equal(d.press(w,{kind:'KEY'},t+5810,{revision:observed}).receipt.status,'accepted');
    const last=d.press(p,{kind:'KEY'},t+5811,{revision:observed});assert.equal(last.receipt.status,'accepted');
    assert.equal(d.state.worlds[d.state.currentWorldId].food.doses,20);
    assert.equal(projectPlanetFoodPublic(d.state).stock.doses,20);
    const end=d.state.food.step.task.returnsAt;d.deadline(end);
    const repeated=d.food(p,last.request.command,end+1,{raw:last.request});assert.deepEqual(repeated.receipt,last.receipt);
    assert.equal(d.state.worlds[d.state.currentWorldId].food.doses,20);
    d.deadline();const actor=d.state.activeSeatId;assert.equal(d.ordinary(actor,{type:'PASS_TURN'}).receipt.status,'accepted');
    const ledger=d.state.worlds[d.state.currentWorldId].food;
    assert.equal(ledger.doses,19);assert.equal(ledger.meals.length,1);assert.equal(ledger.meals[0].seatId,actor);
    assert.equal(projectPlanetFoodPublic(d.state).stock.doses,20);d.replay();
  });
  test(`${n}: private early lethal drop leaves complete outsider/ordinary views unchanged through common return`,()=>{
    const d=driver(n),m=d.start(),t=m.options.startedAt,w=m.options.winchSeatId,p=m.options.panelSeatId;
    d.press(w,{kind:'HOLD',edge:'DOWN',gestureSequence:1,crateId:null},t+4000);d.deadline(t+4450);
    d.press(p,{kind:'PANEL_RELEASE'},t+4500);d.press(p,{kind:'PANEL_LOCK'},t+5251);
    const before={public:projectPlanetPublic(d.state),food:foodBody(projectPlanetFoodPublic(d.state)),
      others:d.ids.filter(id=>![w,p].includes(id)).map(id=>[projectPlanetPlayer(d.state,id),foodBody(projectPlanetFoodPlayer(d.state,id))])};
    d.press(w,{kind:'HOLD',edge:'UP',gestureSequence:1,crateId:null},t+5252);
    assert.equal(d.state.food.step.task.outcome.kind,'LOST');
    assert.deepEqual({public:projectPlanetPublic(d.state),food:foodBody(projectPlanetFoodPublic(d.state)),
      others:d.ids.filter(id=>![w,p].includes(id)).map(id=>[projectPlanetPlayer(d.state,id),foodBody(projectPlanetFoodPlayer(d.state,id))])},before);
    const end=d.state.food.step.task.returnsAt;d.deadline(end);
    assert.equal(projectPlanetPublic(d.state).board.seats.find(s=>s.seatId===p).health,'Eliminated');
    for(const e of projectPlanetPublic(d.state).events){assert.equal(e.actorSeatId,null);assert.equal(Object.hasOwn(e,'mechanism'),false);}
    d.replay();
  });
  test(`${n}: no-Task ordinary turns exhaust food once, then native hunger uses four beds without revival`,()=>{
    const d=driver(n);d.until(s=>s.round===2&&s.phase.kind==='NAV_SETTING');
    const world=d.state.worlds[d.state.currentWorldId],hungry=2*n-10;
    assert.equal(world.food.meals.length,2*n);assert.equal(world.food.doses,0);
    assert.equal(world.seats.filter(s=>s.health==='Injured').length,Math.min(4,hungry));
    assert.equal(world.seats.filter(s=>s.health==='Eliminated').length,Math.max(0,hungry-4));
    for(const s of world.seats.filter(s=>s.health==='Injured')){assert.equal(s.location,'Hospital');assert.equal(s.rescueDueAfterRound,3);}
    assert.equal(projectPlanetFoodPublic(d.state).stock.doses,0);d.replay();
  });
}

for(const n of [7,8,9])for(const full of [false,true])test(`${n}: constructed Task-killed Captain returns to ${full?'fallback':'last'} ordinary room only at common return`,()=>{
  const d=driver(n),s=copy(d.state),world=s.worlds[s.currentWorldId];world.captainSeatId='seat-1';
  const captain=world.seats[0];captain.location='Command Room';captain.slotId='C1';captain.lastRoom='Room A';
  let a=0,b=0;for(const [i,p]of world.seats.slice(1).entries()){
    p.location=i<(full?5:4)?'Room A':'Room B';p.slotId=p.location==='Room A'?`A${++a}`:`B${++b}`;p.lastRoom=p.location;
  }
  s.finalized.seats=world.seats.map(p=>planetSeatView(world,p));d.installConstructedState(s);
  const m=d.start(),t=m.options.startedAt,w=m.options.winchSeatId,p=m.options.panelSeatId;assert.equal(p,'seat-1');
  d.press(w,{kind:'HOLD',edge:'DOWN',gestureSequence:1,crateId:null},t+4000);d.deadline(t+4450);
  d.press(p,{kind:'PANEL_RELEASE'},t+4500);d.press(p,{kind:'PANEL_LOCK'},t+5251);
  d.press(w,{kind:'HOLD',edge:'UP',gestureSequence:1,crateId:null},t+5252);
  assert.equal(projectPlanetPublic(d.state).board.seats.find(p=>p.seatId==='seat-1').location,'Command Room');
  assert.equal(projectPlanetPublic(d.state).offices.captainSeatId,'seat-1');
  const beforeProjection=copy(d.state),own=projectPlanetFoodPlayer(d.state,'seat-1').participantTask.ownReturnPlacement;
  assert.equal(own.location,full?'Room B':'Room A');assert.ok(own.slotId.startsWith(full?'B':'A'));
  const reconnected=decodePlanetGameState(encodePlanetGameState(d.state));
  assert.deepEqual(projectPlanetFoodPlayer(reconnected,'seat-1'),projectPlanetFoodPlayer(d.state,'seat-1'));
  assert.deepEqual(projectPlanetPublic(reconnected),projectPlanetPublic(d.state));
  assert.deepEqual(d.state,beforeProjection,'Return preview is a read-only engine projection');
  assert.equal(projectPlanetFoodPlayer(d.state,'seat-2').participantTask.ownReturnPlacement.location,'Room A');
  assert.equal(projectPlanetFoodPlayer(d.state,'seat-3').participantTask,null);
  assert.equal(Object.hasOwn(projectPlanetFoodPlayer(d.state,'seat-3'),'ownReturnPlacement'),false);
  const end=d.state.food.step.task.returnsAt;d.deadline(end);
  const returned=d.state.worlds[d.state.currentWorldId].seats.find(p=>p.seatId==='seat-1');
  assert.equal(d.state.phase.startedAt,end);assert.equal(returned.health,'Eliminated');
  assert.equal(returned.location,full?'Room B':'Room A');assert.equal(returned.lastRoom,returned.location);
  assert.equal(d.state.worlds[d.state.currentWorldId].seats.some(p=>p.slotId==='C1'),false);
  assert.deepEqual(decodePlanetGameState(encodePlanetGameState(d.state)),d.state);
  d.until(s=>s.round===2&&s.phase.kind==='CAPTAIN_ELECTION');
  for(const id of d.state.ballot.eligibleVoters)assert.equal(d.ordinary(id,{type:'VOTE',targetSeatId:'seat-3'}).receipt.status,'accepted');
  d.deadline();assert.equal(d.state.worlds[d.state.currentWorldId].captainSeatId,'seat-3');
  assert.equal(d.state.worlds[d.state.currentWorldId].seats.filter(p=>p.slotId==='C1').length,1);
});

for(const n of [7,8,9])test(`${n}: constructed applicable Protection and lucky stops give complete identical participant publications`,()=>{
  function stopped(protectedTarget){
    const d=driver(n),s=copy(d.state),world=s.worlds[s.currentWorldId];
    if(protectedTarget){world.seats[0].protection={donorSeatId:'seat-5',activeFromRound:1,consumed:false};world.seats[0].protectionEver=true;}
    d.installConstructedState(s);
    const m=d.start(),t=m.options.startedAt,w=m.options.winchSeatId,p=m.options.panelSeatId;
    d.press(w,{kind:'HOLD',edge:'DOWN',gestureSequence:1,crateId:null},t+4000);d.deadline(t+4450);
    d.press(p,{kind:'PANEL_RELEASE'},t+4500);d.press(p,{kind:'PANEL_LOCK'},t+5251);
    const donor=[projectPlanetPlayer(d.state,'seat-5'),foodBody(projectPlanetFoodPlayer(d.state,'seat-5'))];
    d.press(w,{kind:'HOLD',edge:'UP',gestureSequence:1,crateId:null},t+5252,{sample:protectedTarget?.99:.1});
    assert.deepEqual([projectPlanetPlayer(d.state,'seat-5'),foodBody(projectPlanetFoodPlayer(d.state,'seat-5'))],donor);
    assert.equal(d.state.food.step.task.crate.state,'BRAKED');
    return [w,p].map(id=>[projectPlanetPlayer(d.state,id),foodBody(projectPlanetFoodPlayer(d.state,id))]);
  }
  assert.deepEqual(stopped(true),stopped(false));
});
for(const n of [7,8,9])test(`${n}: native ordinary timeout creates one meal before Hack and none at continuation end`,()=>{
  const d=driver(n);d.deadline();d.deadline();assert.equal(d.state.phase.kind,'ORDINARY_TURN');
  const actor=d.state.activeSeatId,target=d.ids.find(id=>id!==actor);
  assert.equal(d.ordinary(actor,{type:'REQUEST_HACK',targetSeatId:target}).receipt.status,'accepted');
  d.deadline();assert.equal(d.state.phase.kind,'HACK_DECLARE');
  const world=()=>d.state.worlds[d.state.currentWorldId];assert.equal(world().food.meals.length,1);assert.equal(world().food.doses,9);
  d.deadline();d.deadline();d.deadline();assert.equal(d.state.phase.kind,'ORDINARY_TURN');
  assert.equal(world().food.meals.length,1);assert.equal(world().food.doses,9);d.replay();
});
for(const n of [7,8,9])test(`${n}: exact Food receipt recovery precedes late clock/death processing`,()=>{
  const d=driver(n),m=d.start(),t=m.options.startedAt,w=m.options.winchSeatId;
  const first=d.press(w,{kind:'HOLD',edge:'DOWN',gestureSequence:1,crateId:null},t+4000),before=copy(d.state);
  const retry=d.food(w,first.request.command,t+100000,{raw:first.request});
  assert.deepEqual(retry.receipt,first.receipt);assert.deepEqual(d.state,before);
});
for(const n of [7,8,9])test(`${n}: native A/B forks inherit prior meals and Sync keeps one whole food/hunger ledger`,()=>{
  const d=driver(n);d.until(s=>s.round===2&&s.phase.kind==='CAPTAIN_ELECTION');
  for(const id of d.state.ballot.eligibleVoters)d.ordinary(id,{type:'VOTE',targetSeatId:'seat-6'});
  d.deadline();d.deadline();assert.equal(d.state.phase.kind,'OFFICER_APPOINTMENT');
  d.ordinary('seat-6',{type:'APPOINT_OFFICER',targetSeatId:'seat-7'});assert.equal(d.state.phase.kind,'FOOD_SUPPLY');
  d.deadline();assert.equal(d.state.phase.kind,'PRE_TURN');
  d.ordinary('seat-7',{type:'ACTIVATE_BLACKHOLE'});d.deadline();
  assert.equal(d.state.activeSeatId,'seat-1');d.ordinary('seat-1',{type:'PASS_TURN'});
  const originalId=d.state.currentWorldId,originBefore=copy(d.state.worlds[originalId].food);
  for(const actor of ['seat-2','seat-3']){
    assert.equal(d.state.activeSeatId,actor);
    d.ordinary(actor,{type:'MOVE',destination:'Room B',slotId:'B2'});
    const assigned=d.state.realityOf[actor];assert.notEqual(assigned,originalId);
    assert.deepEqual(d.state.worlds[assigned].food,originBefore,'Fork inherits every already-spent meal exactly');
    d.ordinary(actor,{type:'PASS_TURN'});
    assert.deepEqual(d.state.worlds[originalId].food,originBefore,'A meal in the actor world does not spend another reality');
  }
  const selectedId=d.state.realityOf['seat-3'],selected=copy(d.state.worlds[selectedId].food);
  d.until(s=>s.phase.kind==='BLACKHOLE_PRESENTATION');
  assert.equal(d.state.currentWorldId,selectedId);assert.equal(Object.keys(d.state.worlds).length,1);
  assert.deepEqual(d.state.worlds[selectedId].food,selected,'Sync selects the complete retained ledger with no refill/recombination');
  d.until(s=>s.phase.kind==='NAV_SETTING');
  const world=d.state.worlds[d.state.currentWorldId];
  assert.equal(world.seats.filter(s=>s.health==='Injured').length,n===9?1:0,'Discarded-world hunger does not injure the retained reality');
  if(n===9)assert.equal(world.seats.find(s=>s.seatId==='seat-3').health,'Injured');
  assert.equal(projectPlanetFoodPublic(d.state).stock.doses,selected.doses);d.replay();
});
