import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PLANET_ORIGINAL_PINS,PLANET_SYNC_PINS} from '@mothership/contracts';
import {createPlanetGame,advancePlanetDeadline,encodePlanetGameState,decodePlanetGameState} from '@mothership/engine';
import {planetServiceHarness,digest} from './planet-service-helper.mjs';

for(const count of [7,8,9])for(const pins of [PLANET_ORIGINAL_PINS,PLANET_SYNC_PINS]){
  test(`${count}: service reload and deadline dispatch honor saved ${pins.engineVersion} tuple and artwork rather than creation defaults`,async()=>{
    const h=await planetServiceHarness({count,humans:count}),s=await h.current(),versions={...pins,assetManifestVersion:'design-0.5.0'};
    const ids=s.members.map(m=>m.seatId),roleOrder=['Insider','Doctor','Blue Disabler','Supplier','Undercover','Hacker','Alien',...(count>=8?['Red Disabler']:[]),...(count===9?['Engineer']:[])];
    const setup={matchId:h.matchId,playerCount:count,roleOrder,initialTurnOrder:ids,
      initialRooms:Object.fromEntries(ids.map((id,i)=>[id,i<4?'Room A':'Room B'])),assetManifestVersion:versions.assetManifestVersion,versions};
    const context={now:h.now(),nextPhaseId:h.nextId(),nextDeadlineToken:h.nextId(),random:Array(64).fill(.42)};
    // Explicit old constructor: never relabel a current1.1 state as a historical game.
    const original=createPlanetGame(setup,context);s.versions=versions;s.status='running';s.state=decodePlanetGameState(encodePlanetGameState(original));
    s.prepared=null;s.preparedState=null;s.setup=null;
    const taskId=digest([h.matchId,original.phase.id,original.deadlineToken]);
    await h.store.transaction(tx=>{tx.set('session/'+h.matchId,s);tx.set('deadline/'+taskId,{matchId:h.matchId,phaseId:original.phase.id,
      deadlineToken:original.deadlineToken,endsAt:original.phase.endsAt,kind:'game',taskId,status:'pending',nextAttemptAt:h.now()});});
    h.reload({assetManifestVersion:'design-0.6.0'});const view=await h.read(h.players[0]);assert.deepEqual(view.versions,versions);assert.deepEqual(view.playerView.versions,versions);
    assert.equal(Object.hasOwn(view.playerView.abilities,'panelRequest'),false);assert.equal(Object.hasOwn(view.playerView.abilities,'engineerCapture'),false);
    await h.deadline();const after=(await h.current()).state;assert.deepEqual(after.versions,versions);assert.equal(after.phase.kind,'ORDINARY_TURN');assert.equal(after.activeSeatId,'seat-1');
    // The same saved old state can still be advanced directly under its original API.
    const expected=advancePlanetDeadline(original,{...context,now:original.phase.endsAt,phaseId:original.phase.id,deadlineToken:original.deadlineToken,
      nextPhaseId:after.phase.id,nextDeadlineToken:after.deadlineToken}).state;
    assert.deepEqual(after,expected);
  });
}
