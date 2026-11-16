import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {planetServiceHarness, ok} from '../../test/planet-service-helper.mjs';
import {enterTimedPlanetBoarding} from '../../test/planet-timed-reading-helper.mjs';

export function envelope(view, command, commandId = randomUUID()) {
  return {schemaVersion: 1, protocolVersion: 3, matchId: view.matchId, phaseId: view.phaseId,
    foodStepId: view.step.stepId, round: view.round, commandId, command};
}

export async function seedTwoHumanTask(store, count = 7, {assetManifestVersion,foodAuthorityProfile,submitJoin,humans = count} = {}) {
  const h = await planetServiceHarness({count, humans, store, assetManifestVersion, foodAuthorityProfile,
    setupFlowVersion: 3, engineProfile: 'food-task-1.4', sample: .2});
  const display = await h.admission(h.display, 'display', 'Table');
  ok(await h.approve(display));
  const {session: boarding} = await enterTimedPlanetBoarding(h);
  h.setTime(boarding.setup.endsAt);
  await h.service.runDeadline(await h.currentJob());
  const asker = (await h.read(h.players[0])).foodPlayerView;
  const partnerSeatId = (await h.read(h.players[1])).selfSeatId;
  assert.ok(asker.offers.some(offer => offer.type === 'TASK_ASK' && offer.partnerSeatIds.includes(partnerSeatId)));
  const asked = await h.invoke(h.players[0], 'foodCommand', {request: envelope(asker, {type: 'TASK_ASK', partnerSeatId})});
  assert.equal(ok(asked).receipt.status, 'accepted');
  const view = (await h.read(h.players[1])).foodPlayerView;
  const {requestId, requestRevision} = view.offers.find(offer => offer.type === 'TASK_ANSWER');
  const request = envelope(view, {type: 'TASK_ANSWER', requestId, requestRevision, answer: 'JOIN'});
  const joined = await (submitJoin ? submitJoin(h,h.players[1],request) : h.invoke(h.players[1], 'foodCommand', {request}));
  assert.equal(ok(joined).receipt.status, 'accepted');
  const session = await h.current();
  const {task} = session.state.food.step;
  const bySeat = seatId => session.members.find(member => member.seatId === seatId).uid;
  return {h, session, task, winch: bySeat(task.options.winchSeatId), panel: bySeat(task.options.panelSeatId)};
}
