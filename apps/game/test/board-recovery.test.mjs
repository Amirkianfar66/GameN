import assert from 'node:assert/strict';
import test from 'node:test';
import { createConnectedPlayerScreen, DEFAULT_ACTION_FLOW_TIMING } from '@mothership/game';
import { renderComicPlayerShell, toHtml } from '@mothership/presentation';
import { createFakeHost, flush } from './support/fakes.mjs';
import { createFakeConnectedTransport, EPOCH, MATCH, playerView } from './support/connected.mjs';

// Actual connected screen/controller/renderer, with only transport and host time scripted.
// A paused board must conceal marks without discarding or reissuing an uncertain command.
const OWN = { kind: 'player-view', matchId: MATCH };
const GUARD = DEFAULT_ACTION_FLOW_TIMING.controlGuardMs;
const MARKS = /data-board-target|phone-character-target|phone-pick-order|phone-move-ghost/;

function setup(t) {
  const host = createFakeHost({ serverStart: EPOCH });
  const fake = createFakeConnectedTransport(host, { mode: 'emulator' });
  fake.respond.v1ServerTime = async () => ({ protocolVersion: 2, serverTimeMs: host.serverNow() });
  const screen = createConnectedPlayerScreen({ transport: fake.transport, matchId: MATCH, ports: host.ports, host: { reload() {} }, seatId: 'seat-1' });
  t.after(() => screen.dispose());
  const card = () => screen.getFrame().model.match?.privateArea.content?.actions.card;
  const page = () => toHtml(renderComicPlayerShell(screen.getFrame().model, { phoneView: 'actions' }));
  const view = (revision = 5) => playerView('seat-1', own => {
    own.viewRevision = revision;
    own.legalTargets.RESCUE = ['seat-1', 'seat-3'];
    // The phone opens near the end of the normal 60-second turn. Expiry must happen
    // before the HTTP timeout, while the real controller is still submitting/checking.
    own.phase.startedAt = EPOCH - 58_000;
    own.phase.endsAt = EPOCH + 2_000;
  });
  const receipt = request => ({ ok: true, serverTimeMs: host.serverNow(), receipt: {
    protocolVersion: 2, matchId: MATCH, phaseId: request.phaseId, commandId: request.commandId, status: 'accepted', code: 'REGISTERED',
  } });
  return { host, fake, screen, card, page, view, receipt };
}

async function send(s, kind) {
  s.screen.start();
  await s.fake.deliver(OWN, s.view());
  for (const intent of [
    { type: 'private/toggle' }, { type: 'action/open', kind },
    { type: 'action/choose', value: kind === 'move' ? 'Room B' : 'seat-3' },
  ]) s.screen.dispatch(intent);
  await s.host.advance(GUARD);
  s.screen.dispatch({ type: 'action/confirm' });
  await flush();
  assert.equal(s.fake.callsTo('v1Command').length, 1);
}

for (const paused of ['stale', 'expired']) {
  const pause = async s => {
    if (paused === 'stale') await s.fake.deliver(OWN, s.view(), false);
    else await s.host.advance(2_000);
  };
  test(`${paused} submitting Move: the strip survives a late receipt without a ghost or second send`, async t => {
    const s = setup(t);
    let reply;
    s.fake.respond.v1Command = request => new Promise(resolve => { reply = () => resolve(s.receipt(request)); });
    await send(s, 'move');
    assert.equal(s.card().status, 'submitting');
    assert.match(s.page(), /phone-move-ghost/);
    const ids = JSON.parse(s.host.kept);
    assert.deepEqual(Object.keys(ids).sort(), ['commandId', 'matchId', 'phaseId', 'seatId']);
    await pause(s);
    assert.equal(s.card().status, 'submitting');
    assert.doesNotMatch(s.page(), MARKS);
    assert.match(s.page(), /\bphone-strip\b/);
    s.screen.dispatch({ type: 'action/confirm' });
    reply();
    await flush();
    assert.equal(s.card().status, 'accepted');
    assert.doesNotMatch(s.page(), MARKS, 'accepted Move still awaits its own view, under the same paused gate');
    assert.equal(s.host.kept, null, 'only the receipt settles the stored identifiers');
    assert.equal(s.fake.callsTo('v1Command').length, 1);
    await s.fake.deliver(OWN, s.view(6));
    assert.equal(/phone-move-ghost/.test(s.page()), paused === 'stale', 'a fresh view cannot revive an expired ghost');
    const arrived = s.view(7);
    arrived.seats[0].location = 'Room B';
    arrived.self.movementDestinations = [];
    await s.fake.deliver(OWN, arrived);
    assert.doesNotMatch(s.page(), /phone-move-ghost/);
    assert.equal(s.fake.callsTo('v1Command').length, 1, 'view refresh and arrival never send a new Move');
  });

  test(`${paused} checking Rescue: receipt lookup settles the same command while marks stay concealed`, async t => {
    const s = setup(t);
    let found;
    s.fake.respond.v1Receipt = () => new Promise(resolve => { found = () => resolve({
      status: 'found', serverTimeMs: s.host.serverNow(), receipt: s.receipt(s.fake.callsTo('v1Command')[0]).receipt,
    }); });
    await send(s, 'rescue'); // Default command response is UNAVAILABLE, so recovery starts.
    assert.equal(s.card().status, 'checking');
    assert.match(s.page(), /data-board-target="pending"/);
    const kept = s.host.kept;
    await s.host.advance(DEFAULT_ACTION_FLOW_TIMING.recheckDelaysMs[0]);
    assert.equal(typeof found, 'function');
    await pause(s);
    assert.equal(s.card().status, 'checking');
    assert.doesNotMatch(s.page(), MARKS);
    assert.match(s.page(), /\bphone-strip\b/);
    assert.equal(s.host.kept, kept);
    for (const intent of [{ type: 'action/open', kind: 'move' }, { type: 'action/confirm' }, { type: 'action/check-again' }]) s.screen.dispatch(intent);
    found();
    await flush();
    assert.equal(s.card().status, 'accepted');
    assert.doesNotMatch(s.page(), MARKS);
    assert.equal(s.fake.callsTo('v1Command').length, 1, 'recovering a stored receipt does not resubmit');
    assert.equal(s.fake.callsTo('v1Receipt').length, 1);
    assert.equal(s.fake.callsTo('v1Receipt')[0].commandId, JSON.parse(kept).commandId);
    assert.equal(s.host.kept, null);
    await s.fake.deliver(OWN, s.view(6));
    assert.equal(s.card().status, 'accepted');
    assert.doesNotMatch(s.page(), MARKS, 'an accepted Rescue never asserts a result on its target');
    assert.equal(s.fake.callsTo('v1Command').length, 1);
  });
}
