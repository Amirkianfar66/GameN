import assert from 'node:assert/strict';
import {test} from 'node:test';
import {advancePlanetDeadline,planetDeadlineAt,projectPlanetPlayer,projectPlanetPublic,assertPlanetGameState,encodePlanetGameState,decodePlanetGameState} from '../dist/index.js';
import {planetWorldDriver,prepareBlackholeRound,moveAcross,currentWorld,worldSeat} from './planet-world-helper.mjs';

// Positive histories use only the constructor, accepted commands and actual deadlines.
// Direct deadline probes below are refusal controls and never replace the driver's authority.
const physicalWorld = world => {
  const {events,...physical}=world;
  return structuredClone(physical);
};
const eventPackets = d => ({
  public:projectPlanetPublic(d.state).events,
  players:Object.fromEntries(d.ids.map(id=>[id,projectPlanetPlayer(d.state,id).events])),
});
function refuseDeadline(d,label,patch) {
  const before=structuredClone(d.state),ctx={now:d.state.phase.endsAt,nextPhaseId:`presentation-probe-${label}`,
    nextDeadlineToken:`presentation-token-${label}`,phaseId:d.state.phase.id,deadlineToken:d.state.deadlineToken,
    random:Array(32).fill(.999999),...patch};
  const result=advancePlanetDeadline(d.state,ctx);
  assert.equal(result.advanced,false,label);assert.deepEqual(result.state,before,label);assert.deepEqual(d.state,before,'A refused callback cannot mutate its input');
}
function pairStatus(d,statuses) {
  assert.deepEqual(d.state.global.promises.map(p=>p.status),statuses);
  for(const id of d.ids)assert.deepEqual(projectPlanetPlayer(d.state,id).promises,['seat-3','seat-5'].includes(id)?d.state.global.promises:[]);
  assert.deepEqual([...d.state.global.promiseGiven].sort(),['seat-3','seat-5']);
  assert.deepEqual([...d.state.global.promiseReceived].sort(),['seat-3','seat-5']);
}

for(const count of [7,8,9]) {
  test(`${count}: native branched Sync keeps the six-second presentation separate from a delayed full vote and Promise opportunities`,()=>{
    const d=prepareBlackholeRound(planetWorldDriver(count),{patient:true});
    assert.equal(worldSeat(currentWorld(d),'seat-1').health,'Injured');
    assert.equal(currentWorld(d).injectionsRemaining,1);
    const original=d.state.currentWorldId,branch=moveAcross(d,'seat-2');
    d.command('seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-2'});
    assert.equal(d.state.worlds[original].injectionsRemaining,0);
    d.until(s=>s.phase.kind==='ORDINARY_TURN' && s.activeSeatId==='seat-2');
    d.command('seat-2',{type:'RESCUE',targetSeatId:'seat-1'});
    assert.equal(d.state.worlds[branch].injectionsRemaining,0);
    d.until(s=>s.phase.kind==='ORDINARY_TURN' && s.activeSeatId==='seat-3');
    d.command('seat-3',{type:'REQUEST_HACK',targetSeatId:'seat-5'});d.deadline();
    d.command('seat-5',{type:'DECLARE_HACK_SIDE',declaredSide:'Red'});d.deadline();
    for(const [giver,recipient,kind,targetSeatId] of [
      ['seat-3','seat-5','MEET_A',null],['seat-5','seat-3','JAIL_VOTE','seat-4'],
    ]) {
      const offered=d.command(giver,{type:'OFFER_PROMISE',recipientSeatId:recipient,kind,targetSeatId});
      d.command(recipient,{type:'ACCEPT_PROMISE',promiseId:offered.receipt.commandId});
    }
    d.until(s=>s.phase.kind==='ORDINARY_TURN' && s.activeSeatId===d.ids.at(-1));
    const previousPhase=structuredClone(d.state.phase),previousToken=d.state.deadlineToken;
    const selectedPhysical=physicalWorld(d.state.worlds[branch]),promisesBefore=structuredClone(d.state.global.promises);
    const navigationBefore=structuredClone(d.state.navigation);
    d.deadline();
    assert.equal(d.state.phase.kind,'BLACKHOLE_PRESENTATION');
    assert.equal(d.state.phase.startedAt,previousPhase.endsAt);
    assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,6_000);
    assert.equal(planetDeadlineAt(d.state),d.state.phase.endsAt);
    assert.equal(d.state.currentWorldId,branch);assert.deepEqual(Object.keys(d.state.worlds),[branch]);
    assert.equal(d.state.blackholeActive,false);assert.equal(d.state.global.blackholeSpent,true);
    assert.equal(d.state.ballot,null);assert.equal(d.state.activeSeatId,null);assert.equal(d.state.panelOpen,false);
    assert.deepEqual(physicalWorld(currentWorld(d)),selectedPhysical,'Sync retains the selected queue/resources without resolving it');
    assert.equal(currentWorld(d).actions.some(a=>a.command.type==='RESCUE'),true);
    assert.equal(currentWorld(d).actions.some(a=>a.command.type==='PANEL_CODE'),false);
    assert.deepEqual(d.state.global.panelAttempts,['seat-1']);assert.equal(currentWorld(d).injectionsRemaining,0);
    assert.equal(worldSeat(currentWorld(d),'seat-1').health,'Injured','Presentation cannot run queued Rescue');
    assert.deepEqual(d.state.global.promises,promisesBefore);pairStatus(d,['Pending','Pending']);
    assert.deepEqual(d.state.navigation,navigationBefore);assert.equal(d.state.result,null);
    const presentation=structuredClone(d.state.phase),presentationToken=d.state.deadlineToken,eventsAtSync=eventPackets(d);
    const restored=decodePlanetGameState(encodePlanetGameState(d.state));
    assert.deepEqual(restored,d.state,'Reconnect restores the same authoritative phase interval and selected state');
    assert.notEqual(restored,d.state);assert.equal(planetDeadlineAt(restored),presentation.endsAt);
    assert.deepEqual(projectPlanetPublic(restored),projectPlanetPublic(d.state));
    for(const id of d.ids)assert.deepEqual(projectPlanetPlayer(restored,id),projectPlanetPlayer(d.state,id));
    for(const corrupt of [
      s=>{s.global.blackholeSpent=false;},s=>{s.global.blackholeRound=s.round-1;},
      s=>{s.blackholeActive=true;},s=>{s.panelOpen=true;},s=>{s.activeSeatId='seat-3';},
      s=>{s.ballot={kind:'JAIL_VOTE',eligibleVoters:['seat-3'],eligibleTargets:['seat-4'],votes:{},runoff:false,electionId:s.phase.id};},
      s=>{s.navigation.started=true;},s=>{s.finalized.round=s.round-1;},
      s=>{s.worlds[s.currentWorldId].events=s.worlds[s.currentWorldId].events.filter(r=>r.event.kind!=='BLACKHOLE_SYNCED');},
      s=>{s.global.promises[0].status='Fulfilled';},
    ]){const invalid=structuredClone(restored);corrupt(invalid);assert.throws(()=>assertPlanetGameState(invalid));}

    assert.equal(eventsAtSync.public.filter(e=>e.kind==='BLACKHOLE_SYNCED').length,1);
    d.command('seat-5',{type:'VOTE',targetSeatId:'seat-4'},{accepted:false});
    d.command('seat-4',{type:'MOVE',destination:'Room A',slotId:'A2'},{accepted:false});
    d.command('seat-1',{type:'PANEL_CODE',doctorSeatId:'seat-2'},{accepted:false});
    // P18 remains available before navigation; this global information action does not open the vote or resolve physical work.
    d.command('seat-6',{type:'SUBMIT_CODE',seatIds:[...d.state.code]});
    assert.equal(d.state.global.codeAttempted,true);assert.equal(d.state.global.shipHackUnlocked,true);
    assert.equal(d.state.phase.kind,'BLACKHOLE_PRESENTATION');assert.deepEqual(physicalWorld(currentWorld(d)),selectedPhysical);
    pairStatus(d,['Pending','Pending']);assert.deepEqual(eventPackets(d),eventsAtSync);
    refuseDeadline(d,'one-ms-early',{now:presentation.endsAt-1});
    refuseDeadline(d,'stale-phase',{now:presentation.endsAt,phaseId:previousPhase.id});
    refuseDeadline(d,'stale-token',{now:presentation.endsAt,deadlineToken:previousToken});
    const actualOpen=presentation.endsAt+41_000;
    d.deadline({now:actualOpen});
    const openingCallback=structuredClone(d.history.at(-1).context);
    assert.equal(d.state.phase.kind,'JAIL_VOTE');assert.equal(d.state.phase.startedAt,actualOpen);
    assert.equal(d.state.phase.endsAt,actualOpen+60_000,'Late processing opens a fresh complete vote');
    assert.notEqual(d.state.phase.id,presentation.id);assert.notEqual(d.state.deadlineToken,presentationToken);
    assert.deepEqual(d.state.ballot.votes,{});assert.deepEqual(physicalWorld(currentWorld(d)),selectedPhysical);
    pairStatus(d,['Fulfilled','Pending']);assert.deepEqual(eventPackets(d),eventsAtSync,'The same Sync occurrence is not republished/restamped at vote open');
    refuseDeadline(d,'duplicate-presentation',{...openingCallback});
    assert.equal(d.state.result,null);assert.equal(worldSeat(currentWorld(d),'seat-1').health,'Injured');
    const voteStart=d.state.phase.startedAt,voteEnd=d.state.phase.endsAt;
    d.command('seat-5',{type:'VOTE',targetSeatId:'seat-4'},{now:voteStart});pairStatus(d,['Fulfilled','Pending']);
    d.command('seat-3',{type:'VOTE',targetSeatId:null},{now:voteEnd-1});
    d.command('seat-4',{type:'VOTE',targetSeatId:'seat-4'},{now:voteEnd,accepted:false});
    d.deadline();assert.equal(d.state.phase.kind,'VOTE_RESULT');pairStatus(d,['Fulfilled','Fulfilled']);
    assert.equal(worldSeat(currentWorld(d),'seat-1').health,'Injured','Ballot closure still precedes queued attack/Rescue resolution');
    d.until(s=>s.round===3);assert.equal(worldSeat(currentWorld(d),'seat-1').health,'Healthy');
    assert.equal(currentWorld(d).injectionsRemaining,0);assert.deepEqual(d.state.global.panelAttempts,['seat-1']);
    pairStatus(d,['Fulfilled','Fulfilled']);d.replay();
  });

  test(`${count}: native authorized Blackhole with no crossing still gives one full presentation even after a delayed Sync`,()=>{
    const d=prepareBlackholeRound(planetWorldDriver(count));
    d.until(s=>s.phase.kind==='ORDINARY_TURN' && s.activeSeatId===d.ids.at(-1));
    assert.equal(d.state.blackholeActive,true);assert.equal(Object.keys(d.state.worlds).length,1);
    const onlyWorld=d.state.currentWorldId,physicalBefore=physicalWorld(currentWorld(d));
    const actualSync=d.state.phase.endsAt+23_000;
    d.deadline({now:actualSync});
    assert.equal(d.state.phase.kind,'BLACKHOLE_PRESENTATION');assert.equal(d.state.phase.startedAt,actualSync);
    assert.equal(d.state.phase.endsAt,actualSync+6_000);assert.equal(d.state.currentWorldId,onlyWorld);
    assert.deepEqual(Object.keys(d.state.worlds),[onlyWorld]);assert.deepEqual(physicalWorld(currentWorld(d)),physicalBefore);
    assert.equal(d.state.ballot,null);assert.equal(d.state.result,null);
    const syncEvents=eventPackets(d);assert.equal(syncEvents.public.filter(e=>e.kind==='BLACKHOLE_SYNCED').length,1);
    refuseDeadline(d,'single-world-early',{now:actualSync+5_999});
    d.deadline({now:actualSync+6_000});
    assert.equal(d.state.phase.kind,'JAIL_VOTE');assert.equal(d.state.phase.startedAt,actualSync+6_000);
    assert.equal(d.state.phase.endsAt,d.state.phase.startedAt+60_000);assert.deepEqual(eventPackets(d),syncEvents);
    assert.deepEqual(physicalWorld(currentWorld(d)),physicalBefore);d.replay();
  });

  test(`${count}: native round without Blackhole skips presentation and immediately opens the full vote at processing time`,()=>{
    const d=planetWorldDriver(count);
    d.until(s=>s.phase.kind==='ORDINARY_TURN' && s.activeSeatId===d.ids.at(-1));
    const physicalBefore=physicalWorld(currentWorld(d)),actualClose=d.state.phase.endsAt+17_000;
    assert.equal(d.state.blackholeActive,false);assert.equal(d.state.global.blackholeSpent,false);
    d.deadline({now:actualClose});
    assert.equal(d.state.phase.kind,'JAIL_VOTE');assert.equal(d.state.phase.startedAt,actualClose);
    assert.equal(d.state.phase.endsAt,actualClose+60_000);assert.equal(d.state.round,1);
    assert.deepEqual(physicalWorld(currentWorld(d)),physicalBefore);assert.equal(d.state.result,null);
    assert.equal(projectPlanetPublic(d.state).events.some(e=>e.kind==='BLACKHOLE_SYNCED'),false);
    for(const id of d.ids)assert.equal(projectPlanetPlayer(d.state,id).events.some(e=>e.kind==='BLACKHOLE_SYNCED'),false);
    d.replay();
  });
}
