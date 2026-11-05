import assert from 'node:assert/strict';
import {test} from 'node:test';
import {projectPlanetPlayer,projectPlanetPublic} from '../dist/index.js';
import {planetWorldDriver} from './planet-world-helper.mjs';

// Native constructor/commands/deadlines only; no replacement authority or direct Promise callbacks.
function assertPair(d,statuses) {
  const records=d.state.global.promises;
  assert.deepEqual(records.map(p=>p.status),statuses);
  assert.equal(records.every(p=>p.accepted && p.offerStatus==='accepted'),true);
  assert.deepEqual([...d.state.global.promiseGiven].sort(),['seat-1','seat-2']);
  assert.deepEqual([...d.state.global.promiseReceived].sort(),['seat-1','seat-2']);
  for(const id of d.ids) {
    const view=projectPlanetPlayer(d.state,id),participant=['seat-1','seat-2'].includes(id);
    assert.deepEqual(view.promises,participant?records:[],`${id}: Promise records/results remain pair-private`);
    assert.deepEqual(view.promiseQuota,{given:participant,received:participant});
  }
  const shared=projectPlanetPublic(d.state);
  assert.equal(Object.hasOwn(shared,'promises'),false);
  assert.equal(Object.hasOwn(shared,'promiseQuota'),false);
}

for(const count of [7,8,9])test(`${count}: native accepted election Promises wait through Jail, count the runoff, and settle at election/appointment with exact replay`,()=>{
  const d=planetWorldDriver(count);
  d.until(s=>s.round===1 && s.phase.kind==='ORDINARY_TURN' && s.activeSeatId==='seat-1');
  d.command('seat-1',{type:'REQUEST_HACK',targetSeatId:'seat-2'});d.deadline();
  d.command('seat-2',{type:'DECLARE_HACK_SIDE',declaredSide:'Blue'});d.deadline();
  assert.equal(d.state.phase.kind,'HACK');
  const sharedBefore=projectPlanetPublic(d.state),bystandersBefore=d.ids.slice(2).map(id=>projectPlanetPlayer(d.state,id));
  for(const [giver,recipient,kind] of [
    ['seat-1','seat-2','CAPTAIN_SUPPORT'],['seat-2','seat-1','OFFICER_SELECTION'],
  ]) {
    const offered=d.command(giver,{type:'OFFER_PROMISE',recipientSeatId:recipient,kind,targetSeatId:null});
    d.command(recipient,{type:'ACCEPT_PROMISE',promiseId:offered.receipt.commandId});
  }
  assertPair(d,['Pending','Pending']);
  assert.deepEqual(projectPlanetPublic(d.state),sharedBefore,'Private offers/acceptance cannot change the shared view or its revision');
  assert.deepEqual(d.ids.slice(2).map(id=>projectPlanetPlayer(d.state,id)),bystandersBefore,'Private offer/acceptance cannot change any bystander view/revision');
  const acceptedRecords=structuredClone(d.state.global.promises);
  for(const [giver,recipient] of [['seat-1','seat-2'],['seat-2','seat-1']])
    d.command(giver,{type:'OFFER_PROMISE',recipientSeatId:recipient,kind:'MEET_A',targetSeatId:null},{accepted:false});
  d.command('seat-2',{type:'ACCEPT_PROMISE',promiseId:acceptedRecords[0].id},{accepted:false});
  d.command('seat-1',{type:'DECLINE_PROMISE',promiseId:acceptedRecords[1].id},{accepted:false});
  assert.deepEqual(d.state.global.promises,acceptedRecords,'Accepted terms/quotas cannot be replaced in the same conversation');

  d.until(s=>s.phase.kind==='JAIL_VOTE');
  assert.equal(d.state.round,1);assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,60_000);
  assertPair(d,['Pending','Pending']);
  d.deadline();assert.equal(d.state.phase.kind,'VOTE_RESULT');assertPair(d,['Pending','Pending']);
  d.until(s=>s.round===2 && s.phase.kind==='CAPTAIN_ELECTION');
  assertPair(d,['Pending','Pending']);
  assert.equal(d.state.navigation.lastMovedRound,1);
  const electionId=d.state.ballot.electionId,firstBallotId=d.state.phase.id;
  // A positive 2-2 tie, with the giver supporting the recipient in this ballot.
  for(const id of d.state.ballot.eligibleVoters)
    d.command(id,{type:'VOTE',targetSeatId:['seat-1','seat-2'].includes(id)?'seat-2':['seat-3','seat-4'].includes(id)?'seat-3':null});
  assertPair(d,['Pending','Pending']);
  d.deadline();assert.equal(d.state.phase.kind,'VOTE_RESULT');
  assert.equal(d.state.phase.endsAt-d.state.phase.startedAt,5_000);
  assert.equal(d.state.lastTally.outcome,'RUNOFF_REQUIRED');
  assert.equal(d.state.lastTally.counts['seat-2'],2);assert.equal(d.state.lastTally.counts['seat-3'],2);
  assertPair(d,['Pending','Pending']);
  assert.equal(d.state.global.promiseEvaluation[acceptedRecords[0].id].candidateBallots,1);
  assert.equal(d.state.global.promises.every(p=>p.electionId===electionId),true);

  d.deadline();assert.equal(d.state.phase.kind,'CAPTAIN_ELECTION');
  assert.equal(d.state.ballot.runoff,true);assert.equal(d.state.ballot.electionId,electionId);
  assert.deepEqual(d.state.ballot.eligibleTargets,['seat-2','seat-3']);
  const runoffBallotId=d.state.phase.id;assert.notEqual(runoffBallotId,firstBallotId);
  assertPair(d,['Pending','Pending']);
  for(const id of d.state.ballot.eligibleVoters)d.command(id,{type:'VOTE',targetSeatId:'seat-2'});
  assertPair(d,['Pending','Pending']);
  d.deadline();assert.equal(d.state.phase.kind,'VOTE_RESULT');
  assert.equal(d.state.lastTally.outcome,'CAPTAIN_ELECTED');assert.equal(d.state.lastTally.selectedSeatId,'seat-2');
  assertPair(d,['Fulfilled','Pending']);
  const supportEvaluation=d.state.global.promiseEvaluation[acceptedRecords[0].id];
  assert.equal(supportEvaluation.candidateBallots,2);assert.equal(supportEvaluation.missedRequiredBallot,false);
  assert.deepEqual(supportEvaluation.ballotPhaseIds,[firstBallotId,runoffBallotId]);
  assert.equal(d.state.global.promiseEvaluation[acceptedRecords[1].id].captainWon,true);

  d.deadline();assert.equal(d.state.phase.kind,'OFFICER_APPOINTMENT');assertPair(d,['Fulfilled','Pending']);
  d.command('seat-2',{type:'APPOINT_OFFICER',targetSeatId:'seat-1'});
  assert.equal(d.state.phase.kind,'PRE_TURN');assertPair(d,['Fulfilled','Fulfilled']);
  const completedRecords=structuredClone(d.state.global.promises);
  d.until(s=>s.round===3 && s.phase.kind==='PRE_TURN');
  assert.deepEqual(d.state.global.promises,completedRecords,'Later Jail/round-end opportunities cannot rewrite completed election results');
  assertPair(d,['Fulfilled','Fulfilled']);
  d.replay();
});
