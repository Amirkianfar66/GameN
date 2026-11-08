import test from 'node:test';
import assert from 'node:assert/strict';
import {planetServiceHarness} from './planet-service-helper.mjs';
import {enterPlanetBoarding} from './planet-boarding-helper.mjs';

for(const corruption of ['wrong-duration','missing-token','unsupported-version'])test(`a corrupt active boarding save (${corruption}) cannot initialize or acknowledge its durable deadline`,async()=>{
  const h=await planetServiceHarness({setupFlowVersion:2});await enterPlanetBoarding(h);
  const job=await h.currentJob(),session=await h.current(),jobKey='deadline/'+job.taskId;
  const beforeJob=await h.store.transaction(tx=>tx.get(jobKey));
  if(corruption==='wrong-duration')session.setup.endsAt++;
  else if(corruption==='missing-token')delete session.setup.token;
  else session.setupFlowVersion=99;
  await h.store.transaction(tx=>tx.set('session/'+h.matchId,session));h.setTime(session.setup.endsAt+1000);
  await assert.rejects(h.service.runDeadline(job),/Unsupported saved Planet setup flow version|Invalid saved Planet boarding stage/);
  assert.deepEqual(await h.current(),session);assert.equal((await h.current()).state,null);
  assert.deepEqual(await h.store.transaction(tx=>tx.get(jobKey)),beforeJob,'Corrupt authority cannot mark its task complete');
});
