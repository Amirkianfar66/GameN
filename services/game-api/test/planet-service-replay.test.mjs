import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createPlanetGame,applyPlanetCommand,advancePlanetDeadline,abortPlanetGame,projectPlanetPublic,projectPlanetPlayer} from '@mothership/engine';
import {planetServiceHarness,startPlanetHarness,ok} from './planet-service-helper.mjs';

function replayServiceJournal(h,expected){
  const records=h.store.export().filter(([key])=>key.startsWith('journal/'+h.matchId+'/')).map(([,value])=>value).sort((a,b)=>a.sequence-b.sequence);
  assert.deepEqual(records.map(r=>r.sequence),Array.from({length:records.length},(_,i)=>i+1),'Server journal is contiguous and canonically ordered');
  let state=null;const observed=[];
  for(const r of records){
    assert.deepEqual(r.versions,expected.versions);
    if(r.kind==='INITIALIZE')state=createPlanetGame(r.setup,r.context);
    else if(r.kind==='COMMAND'){
      assert.ok(state);const applied=applyPlanetCommand(state,r.actorSeatId,r.request,r.context);assert.deepEqual(applied.receipt,r.receipt);state=applied.state;
    }else if(r.kind==='DEADLINE'){
      assert.ok(state);const applied=advancePlanetDeadline(state,r.context);assert.equal(applied.advanced,true);state=applied.state;
    }else if(r.kind==='OPERATION'&&r.operation==='abort'&&state){
      state=abortPlanetGame(state,r.context);
    }
    if(state)observed.push(state.phase.kind);
  }
  assert.deepEqual(state,expected,'Recorded initialization, randomness, commands and deadlines recover exact full authority');
  assert.deepEqual(projectPlanetPublic(state),projectPlanetPublic(expected));
  for(const id of Object.keys(state.roles))assert.deepEqual(projectPlanetPlayer(state,id),projectPlanetPlayer(expected,id));
  return {records,observed};
}

for(const count of [7,8,9])test(`${count}: all-bot real-engine batches cross Hack declaration with unique transition identities and exact journal replay`,async()=>{
  // This recorded seed previously reproduced two bots reusing a transition ID
  // within one batch when an ordinary turn opened a Hack declaration.
  const h=await startPlanetHarness(await planetServiceHarness({count,humans:0,sample:.42}));
  for(let step=0;step<8&&(await h.current()).status==='running';step++){
    await h.deadline();ok(await h.invoke(h.host,'runBots',{matchId:h.matchId}));
  }
  const current=await h.current(),{records,observed}=replayServiceJournal(h,current.state);
  const bots=records.filter(r=>r.kind==='COMMAND'&&r.controller==='bot');assert.ok(bots.length>20);
  assert.equal(new Set(bots.map(r=>r.context.nextPhaseId)).size,bots.length,'Every attempted bot transition has a fresh identity');
  assert.ok(observed.includes('HACK_DECLARE')||observed.includes('HACK'),'The regression actually reaches a Hack declaration/response');
  const before=structuredClone(current.state);h.reload();assert.deepEqual((await h.current()).state,before);
});

test('a host abort is an authoritative engine transition recoverable from the canonical journal',async()=>{
  const h=await startPlanetHarness(await planetServiceHarness({humans:7}));await h.deadline();
  const job=await h.currentJob();ok(await h.operation(h.host,'abort',{matchId:h.matchId}));
  const s=await h.current();assert.equal(s.status,'aborted');assert.equal(s.state.phase.kind,'ABORTED');assert.equal(s.state.result.reason,'ABORTED');
  replayServiceJournal(h,s.state);assert.equal((await h.service.runDeadline(job)).status,'unchanged');assert.deepEqual((await h.current()).state,s.state);
});
