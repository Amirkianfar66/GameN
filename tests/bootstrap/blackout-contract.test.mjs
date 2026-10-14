import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FullPublicViewSchema,FullPlayerViewSchema,FullEventSchema,FullOutcomePlayerEventSchema,BLACKOUT_VERSION_PINS as PINS,
  CAPTAIN_OUTCOMES_VERSION_PINS as OLD } from '@mothership/contracts';
import { createFullGame,advanceFullGame,executeFullGame,projectFullGame } from '@mothership/engine';
const roles=['Insider','Cracker','Blue Disabler','Supplier','Undercover','Hacker','Alien','Red Disabler','Officer'];
for(const count of [7,8,9]) {
  let seq=0;
  const ids=roles.slice(0,count).map((_,i)=>`seat-${i+1}`),context=now=>({now,nextPhaseId:`contract-phase-${++seq}`,nextDeadlineToken:`contract-token-${seq}`});
  let state=createFullGame({matchId:'blackout-contract-fixture',now:1000,phaseId:'phase-initial',deadlineToken:'token-initial',assetManifestVersion:'synthetic-contract-assets',
    versions:{...PINS,assetManifestVersion:'synthetic-contract-assets'},setup:{playerCount:count,roleOrder:roles.slice(0,count),codeExtraSeatIds:['seat-1','seat-2','seat-3'],
      initialRooms:Object.fromEntries(ids.map((id,i)=>[id,i<5?'Room A':'Room B'])),roundOrders:Array.from({length:5},()=>ids)}});
  const tick=()=>{state=advanceFullGame(state,{...context(state.phase.endsAt),phaseId:state.phase.id,deadlineToken:state.deadlineToken}).state;};
  while(state.activeSeatId!=='seat-3')tick();
  state=executeFullGame(state,'seat-3',{protocolVersion:2,matchId:state.matchId,phaseId:state.phase.id,commandId:'request-blackout',command:{type:'REQUEST_BLACKOUT'}},context(state.phase.startedAt+1)).state;
  while(state.phase.kind!=='BLACKOUT')tick();
  test(`${count}: exact Blackout public clocks and neutral private positions reject hints/omission/historical readers`,()=>{
    const views=projectFullGame(state),view=views.public,own=views.players['seat-3'];
    assert.equal(view.phase.endsAt-view.phase.startedAt,15000);assert.equal(view.blackout.darkStartsAt-view.phase.startedAt,5000);
    assert.deepEqual(own.self.blackoutTargeting.slotIds,['A1','A2','A3','A4','A5']);
    for(const [id,p] of Object.entries(views.players))if(id!=='seat-3')assert.equal(p.self.blackoutTargeting,null);
    const missing=structuredClone(view);delete missing.blackout;assert.equal(FullPublicViewSchema.safeParse(missing).success,false);
    for(const patch of [{darkStartsAt:view.blackout.darkStartsAt+1},{snapshotId:'wrong-window'},{requesterSeatId:'seat-3'},{requestCount:1},{faction:'Blue'}]) {
      assert.equal(FullPublicViewSchema.safeParse({...view,blackout:{...view.blackout,...patch}}).success,false);
    }
    assert.equal(FullPublicViewSchema.safeParse({...view,versions:{...OLD,assetManifestVersion:'synthetic-contract-assets'}}).success,false);
    for(const patch of [{snapshotId:'old'},{slotIds:['B1']},{occupants:[{slotId:'A1',seatId:'seat-1'}]},{sourceSeatId:'seat-3'}])assert.equal(FullPlayerViewSchema.safeParse({...own,self:{...own.self,blackoutTargeting:{...own.self.blackoutTargeting,...patch}}}).success,false);
    const non=views.players['seat-1'];assert.equal(FullPlayerViewSchema.safeParse({...non,self:{...non.self,blackoutTargeting:own.self.blackoutTargeting}}).success,false);
  });
}
test('versioned generic block events are player-only, source-free and strictly unavailable to1.8',()=>{
  const id='a'.repeat(64),event={protocolVersion:2,versions:PINS,matchId:'blackout-contract-fixture',eventId:id,outcomeId:id,viewRevision:1,publishedAt:1,expiresAt:30001,
    audience:{kind:'player',seatId:'seat-4'},fact:{type:'ATTACK_BLOCKED',phaseId:'completed-blackout',round:1,seatId:'seat-4',location:'Room A',slotId:'A2'}};
  assert.equal(FullEventSchema.safeParse(event).success,true);
  assert.equal(FullEventSchema.safeParse({...event,audience:{kind:'public'}}).success,false);
  assert.equal(FullEventSchema.safeParse({...event,versions:OLD}).success,false);
  assert.equal(FullOutcomePlayerEventSchema.safeParse({...event,versions:OLD}).success,false);
  for(const patch of [{cause:'Protection'},{defense:'Clone'},{actorSeatId:'seat-3'},{grantorSeatId:'seat-5'},{role:'Alien'},{slotId:'B1'},{location:null},{recipientSeatIds:['seat-4']}])assert.equal(FullEventSchema.safeParse({...event,fact:{...event.fact,...patch}}).success,false);
});
