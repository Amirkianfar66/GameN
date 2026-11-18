import assert from 'node:assert/strict';
import test from 'node:test';
import {withPlanetRequestTiming} from '../dist/index.js';
import {beginPlanetTiming, timePlanetStage} from '../dist/planet-request-timing.js';
import {planetServiceHarness, ok} from './planet-service-helper.mjs';
import {enterTimedPlanetBoarding} from './planet-timed-reading-helper.mjs';

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return {promise, resolve};
}

test('timing is opt-in and isolates concurrent and nested requests', async () => {
  assert.equal(beginPlanetTiming('admission'), undefined);
  const gate = deferred(), summaries = new Map();
  const first = withPlanetRequestTiming(async () => {
    await timePlanetStage('drain', () => gate.promise);
    return 'first result';
  }, summary => summaries.set('first', summary));
  const second = await withPlanetRequestTiming(async () => {
    const end = beginPlanetTiming('classification');
    await withPlanetRequestTiming(async () => {
      await timePlanetStage('finalReceipt', async () => {});
    }, summary => summaries.set('nested', summary));
    end();
    end();
    return 'second result';
  }, summary => summaries.set('second', summary));
  assert.equal(second, 'second result');
  assert.deepEqual(Object.keys(summaries.get('second').stages), ['classification']);
  assert.deepEqual(Object.keys(summaries.get('nested').stages), ['finalReceipt']);
  assert.equal(summaries.get('second').stages.classification.count, 1);
  assert.equal(summaries.has('first'), false);
  gate.resolve();
  assert.equal(await first, 'first result');
  assert.deepEqual(Object.keys(summaries.get('first').stages), ['drain']);
  for (const {elapsedMs, stages} of summaries.values()) {
    assert.ok(Number.isFinite(elapsedMs) && elapsedMs >= 0);
    for (const {count, totalMs, maxMs} of Object.values(stages)) {
      assert.equal(count, 1);
      assert.ok(totalMs === maxMs && maxMs >= 0);
    }
  }
});

test('summary contains only fixed stage aggregates and observer failure preserves the original result', async () => {
  const response = {private: 'private-response-content'};
  let finishLate, reported, calls = 0;
  const returned = await withPlanetRequestTiming(async () => {
    assert.equal(beginPlanetTiming('private-identifier'), undefined);
    finishLate = beginPlanetTiming('cleanup');
    await timePlanetStage('admission', async () => {});
    return response;
  }, summary => {
    reported = summary;
    calls++;
    throw Error('logger failed');
  });
  assert.equal(returned, response);
  assert.equal(calls, 1);
  assert.deepEqual(Object.keys(reported).sort(), ['elapsedMs', 'stages']);
  assert.deepEqual(Object.keys(reported.stages), ['admission']);
  assert.deepEqual(Object.keys(reported.stages.admission).sort(), ['count', 'maxMs', 'totalMs']);
  finishLate();
  assert.deepEqual(Object.keys(reported.stages), ['admission']);
  const original = Error('original failure');
  await assert.rejects(withPlanetRequestTiming(async () => { throw original; },
    async () => { throw Error('async observer failure'); }), error => error === original);
});

test('Food timing follows an applied original receipt and the exact duplicate path', async () => {
  const h = await planetServiceHarness({count: 7, humans: 1, setupFlowVersion: 3,
    engineProfile: 'food-task-1.4', assetManifestVersion: 'design-0.9.0', sample: .999999});
  const {session: boarding} = await enterTimedPlanetBoarding(h);
  h.setTime(boarding.setup.endsAt);
  await h.service.runDeadline(await h.currentJob());
  await h.service.runBots(h.matchId);
  const view = (await h.read(h.players[0])).foodPlayerView;
  const offer = view.offers.find(row => row.type === 'TASK_ANSWER');
  assert.ok(offer);
  const request = {schemaVersion: 1, protocolVersion: 3, matchId: h.matchId, phaseId: view.phaseId,
    foodStepId: view.step.stepId, round: view.round, commandId: h.nextId(),
    command: {type: 'TASK_ANSWER', requestId: offer.requestId, requestRevision: offer.requestRevision, answer: 'JOIN'}};
  const summaries = [];
  const submit = () => withPlanetRequestTiming(() => h.invoke(h.players[0], 'foodCommand', {request}),
    summary => summaries.push(summary));
  const original = await submit(), duplicate = await submit();
  assert.equal(ok(original).receipt.status, 'accepted');
  assert.deepEqual(duplicate, original);
  for (const stage of ['classification', 'admission', 'drain', 'drainLeaseWait', 'drainProbe',
    'authority', 'cleanup', 'finalReceipt']) assert.ok(summaries[0].stages[stage]?.count > 0, stage);
  assert.deepEqual(Object.keys(summaries[1].stages), ['classification', 'admission', 'finalReceipt']);
  const json = JSON.stringify(summaries);
  for (const privateValue of [h.matchId, request.commandId, h.players[0], offer.requestId]) {
    assert.equal(json.includes(privateValue), false);
  }
});
