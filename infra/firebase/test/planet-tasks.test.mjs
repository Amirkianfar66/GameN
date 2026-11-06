import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createPlanetEnqueuer,createPlanetDeadlineHandler,createPlanetRepairHandler} from '../dist/planet.js';
const payload={matchId:'match-a',phaseId:'phase-a',deadlineToken:'token-a',kind:'game'};
const job={...payload,taskId:createHash('sha256').update(JSON.stringify([payload.matchId,payload.phaseId,payload.deadlineToken])).digest('hex'),endsAt:1_800_000_000_000,status:'pending',nextAttemptAt:0};
test('Planet task enqueues the exact private envelope at the absolute deadline using a stable ID',async()=>{
  const calls=[],enqueue=createPlanetEnqueuer({enqueue:async(data,options)=>calls.push({data,options})});
  await enqueue(job);await enqueue(job);
  for(const call of calls){assert.deepEqual(call.data,payload);assert.equal(call.options.id,job.taskId);assert.equal(call.options.scheduleTime.getTime(),job.endsAt);}
  assert.equal(calls.length,2);
});
test('Planet task refuses invalid IDs, kind, task digest and deadline before enqueue',async()=>{
  let calls=0;const enqueue=createPlanetEnqueuer({enqueue:async()=>calls++});
  for(const patch of [{matchId:'../escape'},{phaseId:''},{deadlineToken:'/'},{kind:'other'},{taskId:'incorrect'},{endsAt:-1},{endsAt:NaN},{endsAt:Number.MAX_SAFE_INTEGER}])await assert.rejects(enqueue({...job,...patch}),/Invalid Planet deadline intent/);
  assert.equal(calls,0);
});
test('Planet duplicate queue IDs acknowledge an earlier accepted task while outages remain retryable',async()=>{
  for(const code of ['functions/task-already-exists','ALREADY_EXISTS',6])await assert.doesNotReject(createPlanetEnqueuer({enqueue:async()=>{throw {code};}})(job));
  await assert.rejects(createPlanetEnqueuer({enqueue:async()=>{throw new Error('outage');}})(job),/outage/);
});
test('Planet task validates exact payload; early and failed delivery retry while stale delivery acknowledges',async()=>{
  let calls=0;
  const handler=createPlanetDeadlineHandler({runDeadline:async()=>{calls++;return {status:'unchanged'};}});
  for(const invalid of [null,[],{}, {...payload,uid:'host'},{...payload,kind:'unknown'},{...payload,phaseId:'../escape'}])await assert.rejects(handler(invalid),/Invalid Planet deadline payload/);
  assert.equal(calls,0);await handler(payload);assert.equal(calls,1);
  for(const status of ['advanced','unchanged'])await assert.doesNotReject(createPlanetDeadlineHandler({runDeadline:async()=>({status})})(payload));
  await assert.rejects(createPlanetDeadlineHandler({runDeadline:async()=>({status:'too-early',retryAfterMs:10})})(payload),/has not elapsed/);
  for(const result of [{status:'too-early',retryAfterMs:0},{status:'advanced',retryAfterMs:10},{status:'advanced',privateRole:'Alien'},{status:'failed'},null])await assert.rejects(createPlanetDeadlineHandler({runDeadline:async()=>result})(payload),/evaluation unavailable/);
  await assert.rejects(createPlanetDeadlineHandler({runDeadline:async()=>{throw new Error('secret');}})(payload),error=>error.message==='Planet deadline evaluation unavailable');
});
test('Planet repair fails retryably on partial failure and does not publish private error details',async()=>{
  const enqueue=async()=>{};
  await assert.doesNotReject(createPlanetRepairHandler({repairDeadlines:async()=>({dispatched:1,advanced:2,failed:0})},enqueue)());
  for(const result of [{dispatched:0,advanced:0,failed:1},{dispatched:0,advanced:-1,failed:0},null])await assert.rejects(createPlanetRepairHandler({repairDeadlines:async()=>result},enqueue)(),/repair unavailable/);
});
test('Planet SDK discovery declares private task invocation, bounded retries and isolated production exports',()=>{
  execFileSync(process.execPath,['--input-type=module','-e',`
    import assert from 'node:assert/strict';
    const endpoints=await import('./infra/firebase/dist/planet-production.js');
    assert.deepEqual(Object.keys(endpoints).sort(),['planetApi','planetDeadlineTask','planetDispatchDeadline','planetRepairDeadlines','planetRunBots'].sort());
    const task=endpoints.planetDeadlineTask.__endpoint;
    assert.equal(task.platform,'gcfv2');assert.deepEqual(task.region,['us-central1']);assert.deepEqual(task.taskQueueTrigger.invoker,['private']);
    assert.equal(task.taskQueueTrigger.retryConfig.maxAttempts,10);
    assert.equal(endpoints.planetDispatchDeadline.__endpoint.eventTrigger.eventFilterPathPatterns.document,'planetDocuments/{documentId}');
    assert.equal(endpoints.planetRunBots.__endpoint.eventTrigger.eventFilterPathPatterns.document,'planetDocuments/{documentId}');
  `],{stdio:'pipe'});
});
