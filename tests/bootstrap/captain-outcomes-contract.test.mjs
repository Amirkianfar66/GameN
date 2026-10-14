import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAPTAIN_OUTCOMES_VERSION_PINS as PINS, BOARD_MEDICAL_VERSION_PINS as OLD,
  validClinicalAnchorForPlayerCount, FullEventSchema, FullPublicViewSchema, FullPlayerViewSchema, FullCommandSchema } from '@mothership/contracts';
import { createFullGame, projectFullGame } from '@mothership/engine';
const roles=['Insider','Cracker','Blue Disabler','Supplier','Undercover','Hacker','Alien','Red Disabler','Officer'];
const copy=value=>structuredClone(value);
for(const count of [7,8,9]) {
  const ids=roles.slice(0,count).map((_,i)=>`seat-${i+1}`);
  const state=createFullGame({matchId:'captain-contract-fixture',now:1,phaseId:'phase-fixture',deadlineToken:'token-fixture',assetManifestVersion:'contract-fixture',
    versions:{...PINS,assetManifestVersion:'contract-fixture'},setup:{playerCount:count,roleOrder:roles.slice(0,count),codeExtraSeatIds:['seat-1','seat-2','seat-3'],
      initialRooms:Object.fromEntries(ids.map((id,i)=>[id,i<5?'Room A':'Room B'])),roundOrders:Array.from({length:5},()=>ids)}});
  test(`${count}: strict future-only offboard placement retains identity without a fake room or premature faction`,()=>{
    const view=copy(projectFullGame(state).public),seat=view.seats.find(s=>s.seatId==='seat-4');
    Object.assign(seat,{health:'Eliminated',location:null,slotId:null,jailed:false,captain:false,medical:null, revealedFaction:null});
    assert.equal(FullPublicViewSchema.safeParse(view).success,true);
    assert.equal(FullPublicViewSchema.safeParse({...view,versions:{...OLD,assetManifestVersion:'contract-fixture'}}).success,false);
    for(const patch of [{health:'Healthy'},{slotId:'J1'},{jailed:true},{captain:true},{location:'Final Zone'},{medical:{admittedRound:1,rescueDueAfterRound:2,rescueOpportunity:'NEXT_NORMAL_ROUND'}}]) {
      const bad=copy(view);Object.assign(bad.seats.find(s=>s.seatId==='seat-4'),patch);assert.equal(FullPublicViewSchema.safeParse(bad).success,false);
    }
  });
  test(`${count}: future Captain uses are required private state, null for every non-Captain, and absent from historical readers`,()=>{
    const view=copy(projectFullGame(state).players['seat-1']);assert.equal(view.self.captainCommandUses,null);
    const missing=copy(view);delete missing.self.captainCommandUses;assert.equal(FullPlayerViewSchema.safeParse(missing).success,false);
    const fake=copy(view);fake.self.captainCommandUses={releaseUsed:false,ejectUsed:false};assert.equal(FullPlayerViewSchema.safeParse(fake).success,false);
    const old=copy(view);old.versions={...OLD,assetManifestVersion:'contract-fixture'};assert.equal(FullPlayerViewSchema.safeParse(old).success,false);
    delete old.self.captainCommandUses;assert.equal(FullPlayerViewSchema.safeParse(old).success,true);
  });
}
test('Outcome envelope accepts dotted exact engine pin and rejects secrets, historical/mixed pins and malformed clinical consequences',()=>{
  const event={protocolVersion:2,versions:PINS,matchId:'captain-contract-fixture',eventId:'a'.repeat(64),outcomeId:'a'.repeat(64),viewRevision:2,
    audience:{kind:'public'},publishedAt:1,expiresAt:30001,fact:{type:'MEDICAL_OUTCOME',phaseId:'closed-phase',round:1,kind:'HEALED',seatId:'seat-4',health:'Healthy',presentationAnchor:{kind:'CLINICAL_VIGNETTE',batchId:'b'.repeat(64),anchorId:'HV1',slotCount:7}}};
  assert.equal(FullEventSchema.safeParse(event).success,true);
  for(const patch of [{versions:OLD},{versions:{...PINS,rulesetHash:OLD.rulesetHash}},{outcomeId:'other'},{expiresAt:30000},
    {fact:{...event.fact,health:'Eliminated'}},{fact:{...event.fact,attackerSeatId:'seat-3'}},{fact:{...event.fact,healerSeatId:'seat-2'}},
    {fact:{...event.fact,presentationAnchor:{...event.fact.presentationAnchor,anchorId:'HV8'}}},
    {fact:{...event.fact,presentationAnchor:{...event.fact.presentationAnchor,anchorId:'H1'}}},
    {fact:{...event.fact,cause:'RESCUE'}},{fact:{...event.fact,role:'Cracker'}}])assert.equal(FullEventSchema.safeParse({...event,...patch}).success,false);
  assert.equal(validClinicalAnchorForPlayerCount(event.fact.presentationAnchor,7),true);assert.equal(validClinicalAnchorForPlayerCount(event.fact.presentationAnchor,8),false);
  const legacy={protocolVersion:2,matchId:'captain-contract-fixture',eventId:'legacy-event',viewRevision:2,audience:{kind:'public'},fact:{type:'PUBLIC_MOVE',seatId:'seat-4',location:'Room A'}};
  assert.equal(FullEventSchema.safeParse(legacy).success,true);assert.equal(FullEventSchema.safeParse({...legacy,fact:{...legacy.fact,location:null}}).success,false);
  assert.equal(FullEventSchema.safeParse({...legacy,versions:PINS}).success,false);
});
test('Captain commands remain targetless strict intents',()=>{
  for(const type of ['CAPTAIN_RELEASE','CAPTAIN_EJECT']) {assert.equal(FullCommandSchema.safeParse({type}).success,true);assert.equal(FullCommandSchema.safeParse({type,targetSeatId:'seat-4'}).success,false);}
});
