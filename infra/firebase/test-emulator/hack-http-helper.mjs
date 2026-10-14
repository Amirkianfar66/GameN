import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import {
  CLONE_VERSION_PINS, DECLARED_HACK_VERSION_PINS, sameFullGameplayPins,
  FullCommandResponseSchema, FullLookupResponseSchema, FullPublicViewSchema, FullPlayerViewSchema,
} from '@mothership/contracts';
import { firestoreRequest } from '../test/helpers.mjs';

// Real Functions smoke only. Admin is used for local journal/outbox READS.
// No clock injection, engine write, Pass, advance, task dispatch or worker call
// supplies any transition. The caller explicitly selects the reviewed 1.5 or 1.10 gameplay/art mode.
export async function exerciseAutomaticDeclaredHack({ base, players, display, invoke, readView, expectedPins = DECLARED_HACK_VERSION_PINS }) {
  assert.ok([DECLARED_HACK_VERSION_PINS,CLONE_VERSION_PINS].some(pins=>sameFullGameplayPins(pins,expectedPins)));
  const publicCapsule=sameFullGameplayPins(expectedPins,CLONE_VERSION_PINS);
  const matchId = base.id, publicPath = `${base.path}/views/public`;
  const expires = performance.now() + 210_000;
  const pause = () => new Promise(resolve => setTimeout(resolve, 200));
  const publicView = () => readView(publicPath, display, FullPublicViewSchema);
  const playerView = identity => readView(`${base.path}/playerViews/${identity.uid}`, identity, FullPlayerViewSchema);
  const playerFor = seatId => {
    const identity = players[Number(seatId.slice(5)) - 1];
    assert.ok(identity, 'The HTTP fixture must provide each admitted seat identity');
    return identity;
  };
  const initial = await publicView();
  assert.ok(sameFullGameplayPins(initial.versions, expectedPins),
    'Automatic declared-Hack acceptance must execute its explicitly reviewed gameplay tuple');
  assert.equal(initial.phase.kind, 'ORDINARY_TURN');
  const initiator = initial.activeSeatId;
  assert.ok(initiator);
  const actor = playerFor(initiator), own = await playerView(actor);
  assert.equal(own.self.seatId, initiator);
  assert.equal(own.phase.id, initial.phase.id, 'Choose the Hack only from the current ordinary phase');
  const target = own.legalTargets.REQUEST_HACK?.[0];
  assert.ok(target, 'The current active player must have a legal same-room Hack partner');
  assert.notEqual(target, initiator);
  const command = { protocolVersion: 2, matchId, phaseId: initial.phase.id, commandId: randomUUID(),
    command: { type: 'REQUEST_HACK', targetSeatId: target } };
  const submitted = await invoke('v1Command', command, actor);
  assert.equal(submitted.status, 200, JSON.stringify(submitted.body));
  const accepted = FullCommandResponseSchema.parse(submitted.body);
  assert.equal(accepted.ok, true, JSON.stringify(accepted));
  assert.equal(accepted.receipt.status, 'accepted'); assert.equal(accepted.receipt.code, 'REGISTERED');
  assert.equal(accepted.receipt.phaseId, initial.phase.id); assert.equal(accepted.receipt.commandId, command.commandId);

  async function recoverOriginalReceipt() {
    // Reuse the exact body and identity: no replacement intent after response loss.
    const retried = await invoke('v1Command', command, actor);
    assert.equal(retried.status, 200, JSON.stringify(retried.body));
    assert.deepEqual(FullCommandResponseSchema.parse(retried.body).receipt, accepted.receipt);
    const lookedUp = await invoke('v1Receipt', { protocolVersion: 2, matchId, commandId: command.commandId }, actor);
    assert.equal(lookedUp.status, 200, JSON.stringify(lookedUp.body));
    const receipt = FullLookupResponseSchema.parse(lookedUp.body);
    assert.equal(receipt.status, 'found'); assert.deepEqual(receipt.receipt, accepted.receipt);
  }
  await recoverOriginalReceipt();

  async function intentFor(phase) {
    const entries = (await base.collection('outbox').where('phaseId', '==', phase.id).get()).docs;
    assert.equal(entries.length, 1, 'Every observed live phase has exactly one durable deadline intent');
    const intent = entries[0].data();
    assert.equal(intent.protocolVersion, 2); assert.equal(intent.matchId, matchId);
    assert.equal(intent.phaseId, phase.id); assert.equal(intent.endsAt, phase.endsAt);
    const taskId = createHash('sha256').update(JSON.stringify([matchId, phase.id, intent.deadlineToken])).digest('hex');
    assert.equal(intent.taskId, taskId); assert.equal(entries[0].id, taskId);
    return intent;
  }

  async function observeNext(previous, kind, duration) {
    const limit = Math.min(expires, performance.now() + Math.max(0, previous.phase.endsAt - Date.now()) + 30_000);
    do {
      const next = await publicView();
      assert.deepEqual(next.versions, initial.versions, 'Automatic progression preserves all five stored pins');
      if (next.phase.id !== previous.phase.id) {
        assert.equal(next.phase.kind, kind, 'Observe every persisted phase without skipping the short private result');
        assert.ok(next.phase.startedAt >= previous.phase.endsAt, 'An automatic deadline cannot shorten its predecessor');
        assert.ok(next.phase.startedAt <= Date.now(), 'New windows use actual server transition time');
        assert.equal(next.phase.endsAt - next.phase.startedAt, duration, 'The next phase receives its complete duration');
        const [oldIntent, nextIntent] = await Promise.all([intentFor(previous.phase), intentFor(next.phase)]);
        assert.notEqual(nextIntent.deadlineToken, oldIntent.deadlineToken);
        const records = (await base.collection('events').where('kind', '==', 'DEADLINE').get()).docs
          .map(doc => doc.data()).filter(record => record.phaseId === previous.phase.id);
        assert.equal(records.length, 1, 'Automatic task delivery commits each predecessor exactly once');
        assert.equal(records[0].now, next.phase.startedAt);
        assert.equal(records[0].nextPhaseId, next.phase.id);
        assert.equal(records[0].deadlineToken, oldIntent.deadlineToken);
        assert.equal(records[0].nextDeadlineToken, nextIntent.deadlineToken);
        return next;
      }
      assert.deepEqual(next.phase, previous.phase, 'Waiting and duplicate deliveries cannot restart a live window');
      await pause();
    } while (performance.now() < limit);
    assert.fail(`Automatic ${previous.phase.kind} deadline did not reach ${kind} within its bounded delivery wait`);
  }

  async function assertPrivateFeedback(phase, hackId, status) {
    // Separate REST reads can cross a legitimate five-second commit. Reobserve
    // one current phase before comparing, rather than mixing old/new snapshots.
    const limit = Math.min(expires, performance.now() + 5000);
    do {
      const views = await Promise.all(players.map(playerView)), current = await publicView();
      assert.equal(current.phase.id, phase.id, 'The expected private stage must still be current when observed');
      if (views.every(view => view.phase.id === current.phase.id)) {
        assert.equal(Object.hasOwn(current, 'hackFeedback'), false);
        if(publicCapsule) assert.deepEqual(current.hackSession,status===null?null:{hackId,actorSeatId:initiator,targetSeatId:target});
        assert.equal(Object.hasOwn(current, 'hackPartnerSeatId'), false);
        for (const view of views) {
          assert.deepEqual(view.versions, initial.versions);
          const participant = [initiator, target].includes(view.self.seatId);
          assert.equal(view.hackPartnerSeatId,
            status === null || !participant ? null : view.self.seatId === initiator ? target : initiator);
          assert.deepEqual(view.hackFeedback, status === null || !participant ? null : {
            hackId, phaseId: current.phase.id, round: current.round, status, declaredSide: null,
          });
          assert.deepEqual(view.legalTargets.DECLARE_HACK_SIDE,
            current.phase.kind === 'HACK_DECLARE' && view.self.seatId === target ? [target] : undefined);
        }
        return;
      }
      await pause();
    } while (performance.now() < limit);
    assert.fail('Participant views did not converge to the current private Hack stage');
  }

  await intentFor(initial.phase);
  const declared = await observeNext(initial, 'HACK_DECLARE', 15_000), hackId = declared.phase.id;
  assert.equal(declared.activeSeatId, initiator);
  await assertPrivateFeedback(declared.phase, hackId, 'AWAITING_DECLARATION');
  // No declaration command is sent. Actual server/task time decides the result.
  const result = await observeNext(declared, 'HACK_RESULT', 5000);
  assert.equal(result.activeSeatId, initiator);
  await assertPrivateFeedback(result.phase, hackId, 'NO_DECLARATION');
  assert.equal((await firestoreRequest(`${base.path}/playerViews/${playerFor(target).uid}`,
    { idToken: display.idToken })).status, 403, 'A display cannot read the private claim result');
  const talk = await observeNext(result, 'HACK', 60_000);
  assert.equal(talk.activeSeatId, initiator);
  await assertPrivateFeedback(talk.phase, hackId, 'NO_DECLARATION');
  const following = await observeNext(talk, 'ORDINARY_TURN', 60_000);
  assert.notEqual(following.activeSeatId, initiator);
  await assertPrivateFeedback(following.phase, hackId, null);

  const records = (await base.collection('events').get()).docs.map(doc => doc.data());
  const registrations = records.filter(record => record.kind === 'COMMAND' && record.request.commandId === command.commandId);
  assert.equal(registrations.length, 1, 'Identical HTTP retries have one durable decision');
  assert.deepEqual(registrations[0].receipt, accepted.receipt);
  assert.equal(records.some(record => record.kind === 'COMMAND' && record.sequence > registrations[0].sequence), false,
    'No declaration, Pass, client advancement or other gameplay command supplied automatic progression');
  const beforeReplay = await publicView();
  await recoverOriginalReceipt();
  const afterReplay = await publicView();
  assert.deepEqual(afterReplay, beforeReplay, 'Recovered old receipt cannot replay the conversation or restart its timers');
  return { hackId, commandId: command.commandId, phases: [initial.phase, declared.phase, result.phase, talk.phase, following.phase] };
}
