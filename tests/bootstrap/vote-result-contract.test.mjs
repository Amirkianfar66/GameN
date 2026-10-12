import assert from 'node:assert/strict';
import test from 'node:test';
import { FullPhaseSchema, FullPublicViewSchema, FullPlayerViewSchema, FullEventSchema, fullRoomCapacityForVersions } from '@mothership/contracts';
import { createFullGame, advanceFullGame, projectFullGame, FULL_GAME_VERSION_PINS, RESOLUTION_FULL_GAME_VERSION_PINS, CAPACITY_FULL_GAME_VERSION_PINS, PASS_FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS } from '@mothership/engine';

const assets='vote-contract-fixture';
const setup={playerCount:7,roleOrder:['Insider','Cracker','Blue Disabler','Supplier','Undercover','Hacker','Alien'],codeExtraSeatIds:['seat-1','seat-2','seat-3'],
  initialRooms:Object.fromEntries(Array.from({length:7},(_,i)=>[`seat-${i+1}`,i<5?'Room A':'Room B'])),
  roundOrders:Array.from({length:5},()=>Array.from({length:7},(_,i)=>`seat-${i+1}`))};
const initial=pins=>createFullGame({matchId:'vote-contract-match',setup,now:10_000,phaseId:'initial-phase',deadlineToken:'initial-deadline',assetManifestVersion:assets,versions:{...pins,assetManifestVersion:assets}});
function resultView(){
  let state=initial(FULL_GAME_VERSION_PINS),serial=0;
  while(state.phase.kind!=='VOTE_RESULT'){
    const next=advanceFullGame(state,{now:state.phase.endsAt,phaseId:state.phase.id,deadlineToken:state.deadlineToken,nextPhaseId:`phase-${++serial}`,nextDeadlineToken:`token-${serial}`});
    assert.equal(next.advanced,true);state=next.state;
  }
  return projectFullGame(state);
}

test('vote-result phase remains exactly five seconds while every existing live phase remains sixty',()=>{
  for(const duration of [4_999,5_001,60_000]) assert.equal(FullPhaseSchema.safeParse({id:'result',kind:'VOTE_RESULT',startedAt:10_000,endsAt:10_000+duration}).success,false);
  FullPhaseSchema.parse({id:'result',kind:'VOTE_RESULT',startedAt:10_000,endsAt:15_000});
  for(const kind of ['ORDINARY_TURN','HACK','CAPTAIN_ELECTION','RELEASE_CHOICE','RELEASE_VOTE','JAIL_VOTE','SHOWDOWN']){
    FullPhaseSchema.parse({id:'live',kind,startedAt:10_000,endsAt:70_000});
    assert.equal(FullPhaseSchema.safeParse({id:'live',kind,startedAt:10_000,endsAt:15_000}).success,false);
  }
});
test('new tuples require nullable voteResult while all four historical projections retain their exact omission',()=>{
  const view=projectFullGame(initial(FULL_GAME_VERSION_PINS)).public;
  assert.equal(view.voteResult,null);const missing=structuredClone(view);delete missing.voteResult;
  assert.equal(FullPublicViewSchema.safeParse(missing).success,false);
  for(const pins of [RESOLUTION_FULL_GAME_VERSION_PINS,CAPACITY_FULL_GAME_VERSION_PINS,PASS_FULL_GAME_VERSION_PINS,LEGACY_FULL_GAME_VERSION_PINS]){
    const projected=projectFullGame(initial(pins));assert.equal(Object.hasOwn(projected.public,'voteResult'),false);
    for(const own of Object.values(projected.players))assert.equal(Object.hasOwn(own,'voteResult'),false);
    assert.equal(FullPublicViewSchema.safeParse({...projected.public,voteResult:null}).success,false);
    assert.equal(FullPublicViewSchema.safeParse({...resultView().public,versions:{...pins,assetManifestVersion:assets}}).success,false);
  }
});
test('current finite display labels use the exact new gameplay tuple independently of art pins',()=>{
  for(const room of ['Room A','Room B','Hospital','Jail'])assert.equal(fullRoomCapacityForVersions(FULL_GAME_VERSION_PINS,room),5);
  assert.equal(fullRoomCapacityForVersions(FULL_GAME_VERSION_PINS,'Command Room'),1);
  assert.equal(fullRoomCapacityForVersions(FULL_GAME_VERSION_PINS,'Final Zone'),null);
});
for(const [name,mutate] of [
  ['missing result',v=>delete v.voteResult],['null current result',v=>v.voteResult=null],
  ['wrong identity',v=>v.voteResult.id='other'],['same original identity',v=>v.voteResult.votePhaseId=v.phase.id],
  ['wrong round',v=>v.voteResult.round=2],['wrong result timestamp',v=>{v.voteResult.startedAt++;v.voteResult.endsAt++;}],
  ['hidden winning selection',v=>{v.voteResult.selectedSeatId='seat-1';v.voteResult.outcome='PLAYER_JAILED';}],
  ['wrong tally',v=>v.voteResult.eligibleVoterCount--],['fake positive tie',v=>v.voteResult.tiedSeatIds=['seat-1','seat-2']],
  ['open ballot eligibility',v=>v.ballot.eligibleVoters=['seat-1']],['unexpected active seat',v=>v.activeSeatId='seat-1'],
  ['unknown engine',v=>v.versions.engineVersion='unknown'],['mixed ruleset',v=>v.versions.rulesetVersion=RESOLUTION_FULL_GAME_VERSION_PINS.rulesetVersion],
  ['mixed hash',v=>v.versions.rulesetHash=RESOLUTION_FULL_GAME_VERSION_PINS.rulesetHash],
  ['premature roles',v=>v.endReveal={roles:[],code:['seat-1','seat-2','seat-3','seat-7']}],
  ['private claim',v=>v.hackFeedback={declaredSide:'Blue'}],['individual ballots',v=>v.voteResult.ballots=[{voterSeatId:'seat-1',targetSeatId:'seat-2'}]],
])test(`vote result contract rejects ${name}`,()=>{const view=structuredClone(resultView().public);mutate(view);assert.equal(FullPublicViewSchema.safeParse(view).success,false);});
test('private result views cannot advertise extra gameplay or Code input',()=>{
  const original=resultView().players['seat-6'];FullPlayerViewSchema.parse(original);
  for(const change of [v=>v.self.codeAttemptAvailable=true,v=>v.legalTargets.PASS_TURN=['seat-6'],v=>v.self.movementDestinations=['Room B'],v=>v.hasVoted=true]){
    const view=structuredClone(original);change(view);assert.equal(FullPlayerViewSchema.safeParse(view).success,false);
  }
});
test('neutral strict events reject unreviewed tuple or private claim additions',()=>{
  const event={protocolVersion:2,matchId:'vote-contract-match',eventId:'event-neutral',viewRevision:1,audience:{kind:'public'},fact:{type:'PHASE_CHANGED',phaseId:'result'}};
  FullEventSchema.parse(event);
  for(const extra of [{engineVersion:'unknown'},{versions:{...FULL_GAME_VERSION_PINS,engineVersion:'unknown'}},{hackFeedback:{declaredSide:'Red'}}])
    assert.equal(FullEventSchema.safeParse({...event,...extra}).success,false);
});
