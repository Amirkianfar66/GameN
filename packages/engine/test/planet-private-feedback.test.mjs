import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createPlanetGame,projectPlanetPlayer,projectPlanetPublic} from '../dist/index.js';
import {physicalPlanetCommand,resolvePlanetPhysical,panelExhaustedForEligibleRequest} from '../dist/planet-game/physical.js';
import {finalizePlanetPanelSync,planetPanelReservationKey} from '../dist/planet-game/feedback.js';
import {planetWorldDriver,prepareBlackholeRound,moveAcross,currentWorld,worldSeat,toSync} from './planet-world-helper.mjs';

const copy=value=>structuredClone(value),legacy={protocolVersion:3,engineVersion:'planet-game-1.0.1',rulesetVersion:'in-person-planet-sync-six-2026-11-05',rulesetHash:'4f26343641fcff00480bb3c0ba852703418f772bb677117a272828ad229c8b1c'};
function constructed(n){
  // CONSTRUCTED R4 predecessor over a legal original deal. Direct physical/helper
  // controls below do not claim native lifecycle, service receipt or Sync proof.
  const roles=['Insider','Doctor','Blue Disabler','Supplier','Undercover','Hacker','Alien',...(n>=8?['Red Disabler']:[]),...(n===9?['Engineer']:[])],ids=roles.map((_,i)=>`seat-${i+1}`);
  const s=createPlanetGame({matchId:`private-feedback-${n}`,playerCount:n,roleOrder:roles,initialRooms:Object.fromEntries(ids.map((id,i)=>[id,i<5?'Room A':'Room B'])),initialTurnOrder:ids,assetManifestVersion:'private-feedback-fixture'},
    {now:1000,nextPhaseId:'feedback-initial',nextDeadlineToken:'feedback-token',random:Array(32).fill(.99)});
  assert.equal(s.versions.engineVersion,'planet-game-1.1.0');s.round=4;s.global.roundOrders['4']=[...ids];s.phase={id:'feedback-r4',kind:'ORDINARY_TURN',startedAt:2000,endsAt:62000};s.evaluatedAt=2001;s.activeSeatId='seat-2';s.turnIndex=1;s.navigation.lastMovedRound=3;s.navigation.started=false;
  return s;
}
const w=s=>s.worlds[s.currentWorldId],seat=(s,id)=>worldSeat(w(s),id),req=(s,id)=>s.global.panelRequests[id];
function patient(s,id,slot='H1'){Object.assign(seat(s,id),{health:'Injured',location:'Hospital',slotId:slot,jailed:false,rescueDueAfterRound:s.round+1,medical:{admittedRound:s.round,rescueDueAfterRound:s.round+1,rescueOpportunity:'NEXT_NORMAL_ROUND'}});}
function accept(s,id,command,commandId=`accepted-${id}`){assert.equal(physicalPlanetCommand(s,id,command,commandId),true);return s;}
function choose(s,id){const selected=s.worlds[id];s.currentWorldId=id;s.worlds={[id]:selected};for(const seatId of Object.keys(s.realityOf))s.realityOf[seatId]=id;s.blackholeActive=false;finalizePlanetPanelSync(s,selected);}
function nativePatient(n,id='seat-1',{spendFirst=false}={}){
  const d=planetWorldDriver(n);assert.equal(d.state.versions.engineVersion,'planet-game-1.1.0');
  if(spendFirst){d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-2');d.command('seat-2',{type:'RESCUE',targetSeatId:'seat-2'});}
  d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-3');d.command('seat-3',{type:'REQUEST_BLACKOUT'});d.until(s=>s.phase.kind==='BLACKOUT');d.deadline({now:d.state.phase.startedAt+5000});
  const target=worldSeat(currentWorld(d),id);d.command('seat-3',{type:'SELECT_BLACKOUT_SLOT',windowId:d.state.phase.id,slotId:target.slotId},{now:d.state.phase.startedAt+5001});d.until(s=>s.round===2&&s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-2');
  assert.equal(worldSeat(currentWorld(d),id).health,'Injured');assert.equal(worldSeat(currentWorld(d),id).location,'Hospital');return d;
}
for(const n of [7,8,9]){
  test(`${n}: native new tuple initializes private feedback books and exposes no unused record to other roles`,()=>{
    const d=planetWorldDriver(n);assert.equal(d.state.versions.engineVersion,'planet-game-1.1.0');assert.deepEqual(d.state.global.panelRequests,{});assert.deepEqual(currentWorld(d).panelReservations,{});
    for(const id of d.ids){assert.equal(worldSeat(currentWorld(d),id).engineerCapture,null);const view=projectPlanetPlayer(d.state,id);assert.equal(view.abilities.engineerCapture,null);assert.equal(view.abilities.panelRequest,null);}
    assert.equal(Object.hasOwn(projectPlanetPublic(d.state),'panelRequests'),false);d.replay();
  });
  test(`${n}: native correct patient request queues once, resolves TREATED only at Rescue and survives exact replay`,()=>{
    const d=nativePatient(n),accepted=d.command('seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-2'}),id=accepted.receipt.commandId;
    assert.deepEqual(req(d.state,'seat-1'),{commandId:id,round:2,status:'QUEUED'});assert.deepEqual(currentWorld(d).panelReservations[planetPanelReservationKey('seat-1',id)],{seatId:'seat-1',round:2,status:'QUEUED'});assert.equal(worldSeat(currentWorld(d),'seat-1').health,'Injured');
    d.command('seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-2'},{accepted:false});assert.equal(currentWorld(d).injectionsRemaining,1);
    for(const other of d.ids.filter(x=>x!=='seat-1'))assert.equal(projectPlanetPlayer(d.state,other).abilities.panelRequest,null);
    d.until(s=>s.round===3);assert.equal(req(d.state,'seat-1').status,'TREATED');assert.equal(worldSeat(currentWorld(d),'seat-1').health,'Healthy');assert.equal(currentWorld(d).injectionsRemaining,1);assert.equal(projectPlanetPlayer(d.state,'seat-1').abilities.panelRequest.status,'TREATED');d.replay();
  });
  test(`${n}: native wrong number spends only the attempt and remains WRONG after actual Doctor healing`,()=>{
    const d=nativePatient(n),before=projectPlanetPublic(d.state),others=Object.fromEntries(d.ids.filter(id=>id!=='seat-1').map(id=>[id,projectPlanetPlayer(d.state,id)])),accepted=d.command('seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-3'});
    assert.deepEqual(req(d.state,'seat-1'),{commandId:accepted.receipt.commandId,round:2,status:'WRONG'});assert.equal(currentWorld(d).injectionsRemaining,2);assert.deepEqual(currentWorld(d).panelReservations,{});assert.deepEqual(projectPlanetPublic(d.state),before);
    for(const [id,view]of Object.entries(others))assert.deepEqual(projectPlanetPlayer(d.state,id),view);
    d.command('seat-2',{type:'RESCUE',targetSeatId:'seat-1'});d.until(s=>s.round===3);assert.equal(worldSeat(currentWorld(d),'seat-1').health,'Healthy');assert.equal(req(d.state,'seat-1').status,'WRONG');d.replay();
  });
  test(`${n}: native exhausted eligible patient gets the same NO_INJECTION for correct and wrong numbers without spending anything`,()=>{
    const d=nativePatient(n,'seat-1',{spendFirst:true});d.command('seat-2',{type:'RESCUE',targetSeatId:'seat-2'});assert.equal(currentWorld(d).injectionsRemaining,0);const before=copy(d.state);
    for(const doctorSeatId of ['seat-2','seat-3']){const result=d.command('seat-1',{type:'PANEL_CODE',doctorSeatId},{accepted:false});assert.equal(result.receipt.code,'NO_INJECTION');assert.deepEqual(d.state,before);}
    assert.equal(req(d.state,'seat-1'),undefined);assert.equal(d.state.global.panelAttempts.includes('seat-1'),false);d.replay();
  });
  test(`${n}: native Doctor treatment before patient panel produces NO_EFFECT with both shared reservations retained`,()=>{
    const d=nativePatient(n,'seat-6');d.command('seat-2',{type:'RESCUE',targetSeatId:'seat-6'});const accepted=d.command('seat-6',{type:'PANEL_CODE',doctorSeatId:'seat-2'}),id=accepted.receipt.commandId;assert.equal(currentWorld(d).injectionsRemaining,0);
    d.until(s=>s.round===3);assert.equal(worldSeat(currentWorld(d),'seat-6').health,'Healthy');assert.equal(req(d.state,'seat-6').status,'NO_EFFECT');assert.equal(currentWorld(d).panelReservations[planetPanelReservationKey('seat-6',id)].status,'NO_EFFECT');assert.equal(currentWorld(d).injectionsRemaining,0);d.replay();
  });
  test(`${n}: native inherited panel command stays QUEUED when its descendant world is selected, then becomes TREATED`,()=>{
    const d=prepareBlackholeRound(planetWorldDriver(n),{patient:true}),id=d.command('seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-2'}).receipt.commandId;
    const branch=moveAcross(d,'seat-2');assert.equal(d.state.worlds[branch].panelReservations[planetPanelReservationKey('seat-1',id)].status,'QUEUED');toSync(d);assert.equal(d.state.currentWorldId,branch);assert.equal(req(d.state,'seat-1').status,'QUEUED');
    d.until(s=>s.round===3);assert.equal(req(d.state,'seat-1').status,'TREATED');assert.equal(currentWorld(d).injectionsRemaining,0);d.replay();
  });
  test(`${n}: native discarded panel stays DISCARDED even when selected Doctor Rescue heals the same patient`,()=>{
    const d=prepareBlackholeRound(planetWorldDriver(n),{patient:true}),branch=moveAcross(d,'seat-2');d.command('seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-2'});d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-2');d.command('seat-2',{type:'RESCUE',targetSeatId:'seat-1'});
    toSync(d);assert.equal(d.state.currentWorldId,branch);assert.equal(req(d.state,'seat-1').status,'DISCARDED');assert.deepEqual(currentWorld(d).panelReservations,{});assert.equal(d.state.global.panelAttempts.includes('seat-1'),true);
    d.until(s=>s.round===3);assert.equal(worldSeat(currentWorld(d),'seat-1').health,'Healthy');assert.equal(req(d.state,'seat-1').status,'DISCARDED');assert.equal(currentWorld(d).injectionsRemaining,0);d.replay();
  });
  test(`${n}: constructed two patients may reuse the same actor-scoped command ID without reservation collision or false discard`,()=>{
    const s=constructed(n);patient(s,'seat-1');patient(s,'seat-6','H2');for(const id of ['seat-1','seat-6'])accept(s,id,{type:'PANEL_CODE',doctorSeatId:'seat-2'},'same-command');
    assert.deepEqual(Object.keys(w(s).panelReservations).sort(),['seat-1:same-command','seat-6:same-command']);assert.equal(w(s).injectionsRemaining,0);finalizePlanetPanelSync(s,w(s));assert.equal(req(s,'seat-1').status,'QUEUED');assert.equal(req(s,'seat-6').status,'QUEUED');resolvePlanetPhysical(s,w(s));
    for(const id of ['seat-1','seat-6']){assert.equal(req(s,id).status,'TREATED');assert.equal(w(s).panelReservations[planetPanelReservationKey(id,'same-command')].status,'TREATED');assert.equal(seat(s,id).health,'Healthy');}assert.equal(w(s).injectionsRemaining,0);
  });
  test(`${n}: constructed second-hit-before-panel-Rescue cannot revive and settles NO_EFFECT without refund`,()=>{
    // Deliberately injected old locked hit to a Hospital patient: a defensive
    // resolution-stage control, not a claim that a fresh remote shot is legal.
    const s=constructed(n);patient(s,'seat-6');accept(s,'seat-6',{type:'PANEL_CODE',doctorSeatId:'seat-2'},'panel-victim');w(s).actions.push({actorSeatId:'seat-3',commandId:'constructed-locked-hit',order:2,command:{type:'REGISTER_SHOT',targetSeatId:'seat-6'}});resolvePlanetPhysical(s,w(s));
    assert.equal(seat(s,'seat-6').health,'Eliminated');assert.equal(req(s,'seat-6').status,'NO_EFFECT');assert.equal(w(s).injectionsRemaining,1);assert.equal(w(s).events.some(r=>r.event.kind==='RESCUED'),false);
  });
  test(`${n}: constructed exhaustion predicate checks ordinary eligibility before stock without reading submitted-number correctness`,()=>{
    const s=constructed(n);patient(s,'seat-1');w(s).injectionsRemaining=0;const probe={type:'PANEL_CODE',get doctorSeatId(){throw Error('Number correctness must not be inspected');}},before=copy(s);
    assert.equal(panelExhaustedForEligibleRequest(s,'seat-1',probe),true);assert.equal(physicalPlanetCommand(s,'seat-1',probe,'empty'),false);assert.deepEqual(s,before);
    const cases=[x=>x.panelOpen=false,x=>x.phase.kind='JAIL_VOTE',x=>x.global.panelAttempts.push('seat-1'),x=>seat(x,'seat-1').health='Eliminated',x=>Object.assign(seat(x,'seat-1'),{health:'Healthy',location:'Room A',slotId:'A1',medical:null,rescueDueAfterRound:null})];
    for(const mutate of cases){const x=copy(s);mutate(x);assert.equal(panelExhaustedForEligibleRequest(x,'seat-1',probe),false);}assert.equal(panelExhaustedForEligibleRequest(s,'seat-1',{type:'ACTIVATE_CLONE'}),false);
  });
  test(`${n}: constructed feedback Sync and Rescue refuse speculative or mismatched selected reservations without partial global mutation`,()=>{
    const s=constructed(n);patient(s,'seat-1');patient(s,'seat-6','H2');accept(s,'seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-2'},'one');accept(s,'seat-6',{type:'PANEL_CODE',doctorSeatId:'seat-2'},'six');s.worlds.Beta=copy(w(s));s.blackholeActive=true;const before=copy(s);assert.throws(()=>finalizePlanetPanelSync(s,s.worlds.Beta));assert.deepEqual(s,before);
    s.blackholeActive=false;delete s.worlds.Beta;delete w(s).panelReservations[planetPanelReservationKey('seat-1','one')];w(s).panelReservations[planetPanelReservationKey('seat-6','six')].seatId='seat-1';const broken=copy(s);assert.throws(()=>finalizePlanetPanelSync(s,w(s)));assert.deepEqual(s,broken);
  });
  test(`${n}: constructed global WRONG and settled statuses never turn into DISCARDED on a later selected-state check`,()=>{
    const s=constructed(n);patient(s,'seat-1');patient(s,'seat-6','H2');accept(s,'seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-3'},'wrong');accept(s,'seat-6',{type:'PANEL_CODE',doctorSeatId:'seat-2'},'right');resolvePlanetPhysical(s,w(s));const before=copy(s.global.panelRequests);finalizePlanetPanelSync(s,w(s));assert.deepEqual(s.global.panelRequests,before);assert.equal(req(s,'seat-1').status,'WRONG');assert.equal(req(s,'seat-6').status,'TREATED');
  });
  test(`${n}: constructed legacy1.0.1 physical handlers retain generic exhaustion and omit all new feedback fields`,()=>{
    const s=constructed(n);s.versions={...legacy,assetManifestVersion:s.versions.assetManifestVersion};delete s.global.panelRequests;delete w(s).panelReservations;for(const value of w(s).seats)delete value.engineerCapture;
    patient(s,'seat-1');w(s).injectionsRemaining=0;const before=copy(s);assert.equal(panelExhaustedForEligibleRequest(s,'seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-2'}),false);assert.equal(physicalPlanetCommand(s,'seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-2'},'old-empty'),false);finalizePlanetPanelSync(s,w(s));assert.deepEqual(s,before);
    w(s).injectionsRemaining=1;accept(s,'seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-2'},'old-panel');resolvePlanetPhysical(s,w(s));assert.equal(Object.hasOwn(s.global,'panelRequests'),false);assert.equal(Object.hasOwn(w(s),'panelReservations'),false);assert.ok(w(s).seats.every(value=>!Object.hasOwn(value,'engineerCapture')));assert.equal(seat(s,'seat-1').health,'Healthy');
  });
}
test('9: native Engineer receives fixed server capture privately, movement does not alter it and next round retains the record after effect expiration',()=>{
  const d=planetWorldDriver(9);d.until(s=>s.phase.kind==='ORDINARY_TURN'&&s.activeSeatId==='seat-9');const before=projectPlanetPublic(d.state),others=Object.fromEntries(d.ids.filter(id=>id!=='seat-9').map(id=>[id,projectPlanetPlayer(d.state,id)]));
  const actor=worldSeat(currentWorld(d),'seat-9'),opposite=actor.location==='Room A'?'Room B':'Room A',captured=currentWorld(d).seats.filter(s=>s.location===opposite).map(s=>s.seatId).sort();d.command('seat-9',{type:'ENGINEER_SUPPRESS'});
  assert.deepEqual(worldSeat(currentWorld(d),'seat-9').engineerCapture,{round:1,seatIds:captured});assert.deepEqual(projectPlanetPlayer(d.state,'seat-9').abilities.engineerCapture,{round:1,seatIds:captured});assert.deepEqual(projectPlanetPublic(d.state),before);for(const [id,view]of Object.entries(others))assert.deepEqual(projectPlanetPlayer(d.state,id),view);
  moveAcross(d,'seat-2');moveAcross(d,'seat-4');assert.deepEqual(worldSeat(currentWorld(d),'seat-9').engineerCapture.seatIds,captured);d.until(s=>s.round===2);assert.deepEqual(currentWorld(d).suppressedSeatIds,[]);assert.deepEqual(projectPlanetPlayer(d.state,'seat-9').abilities.engineerCapture,{round:1,seatIds:captured});d.replay();
});
test('9: constructed empty opposite room is a spent empty capture rather than an unused record',()=>{
  const s=constructed(9);s.activeSeatId='seat-9';s.turnIndex=8;for(const [i,id]of ['seat-1','seat-2','seat-3','seat-4'].entries())Object.assign(seat(s,id),{health:'Eliminated',location:'Hospital',slotId:`H${i+1}`,medical:null,rescueDueAfterRound:null});
  ['seat-5','seat-6','seat-7','seat-8','seat-9'].forEach((id,i)=>Object.assign(seat(s,id),{location:'Room B',slotId:`B${i+1}`}));accept(s,'seat-9',{type:'ENGINEER_SUPPRESS'},'empty-capture');assert.deepEqual(seat(s,'seat-9').engineerCapture,{round:4,seatIds:[]});assert.equal(seat(s,'seat-9').engineerSpent,true);assert.deepEqual(w(s).suppressedSeatIds,[]);
});
