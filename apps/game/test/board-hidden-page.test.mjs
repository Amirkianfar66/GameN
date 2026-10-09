import assert from 'node:assert/strict';
import test from 'node:test';
import { createConnectedPlayerScreen, DEFAULT_ACTION_FLOW_TIMING } from '@mothership/game';
import { renderComicPlayerShell, toHtml } from '@mothership/presentation';
import { createFakeHost, flush } from './support/fakes.mjs';
import { createFakeConnectedTransport, EPOCH, MATCH, playerView } from './support/connected.mjs';

// Backend's review of the board handoff (PR #90) found that the prototype kept a sent
// command's pending marks on a hidden page. On the phone, hiding the page must hide every mark
// of the player's own command, sent or not, while the command itself stays recoverable. This
// runs the real controller and screen against a scripted transport, and draws the board the
// hosted phone draws, with the action view open.

const GUARD = DEFAULT_ACTION_FLOW_TIMING.controlGuardMs;
const CHECKS = DEFAULT_ACTION_FLOW_TIMING.recheckDelaysMs.reduce((sum, delay) => sum + delay, 0);
const TOGGLE = { type: 'private/toggle' };
const OWN = { kind: 'player-view', matchId: MATCH };
const PRIVATE = /data-board-target|phone-character-target|phone-pick-order|phone-move-ghost|phone-strip/;

function setup() {
  const host = createFakeHost({ serverStart: EPOCH });
  const fake = createFakeConnectedTransport(host, { mode: 'emulator' });
  fake.respond.v1ServerTime = async () => ({ protocolVersion: 2, serverTimeMs: host.serverNow() });
  const screen = createConnectedPlayerScreen({ transport: fake.transport, matchId: MATCH, ports: host.ports, host: { reload() {} }, seatId: 'seat-1' });
  const card = () => screen.getFrame().model.match?.privateArea.content?.actions.card ?? null;
  const page = () => toHtml(renderComicPlayerShell(screen.getFrame().model, { phoneView: 'actions' }));
  return { host, fake, screen, card, page };
}

const rescueView = (revision = 5) => playerView('seat-1', view => { view.viewRevision = revision; view.legalTargets.RESCUE = ['seat-1', 'seat-3']; });

async function rescueSent(s) {
  s.screen.start();
  await s.fake.deliver(OWN, rescueView());
  for (const intent of [TOGGLE, { type: 'action/open', kind: 'rescue' }, { type: 'action/choose', value: 'seat-3' }]) s.screen.dispatch(intent);
  await s.host.advance(GUARD);
  s.screen.dispatch({ type: 'action/confirm' });
  await flush();
}

test('a command on its way leaves no mark on a hidden page, and is still there when the player looks again', async () => {
  const s = setup();
  s.fake.respond.v1Command = () => new Promise(() => {});
  await rescueSent(s);
  assert.equal(s.card().status, 'submitting');
  assert.match(s.page(), /data-seat="seat-3"[^>]*data-board-target="pending"/);

  s.screen.setPageVisible(false);
  assert.equal(s.screen.getFrame().model.match.privateArea.content, null);
  assert.doesNotMatch(s.page(), PRIVATE);
  s.screen.setPageVisible(true);
  assert.doesNotMatch(s.page(), PRIVATE, 'The panel stays closed until the player opens it');
  assert.match(s.host.kept, /"commandId"/, 'The command is still kept for recovery');
  // Foregrounding invalidates the clock. Marks may return only after the real
  // server-time response calibrates it again; the in-flight command is kept throughout.
  await flush();
  s.screen.dispatch(TOGGLE);
  assert.equal(s.card().status, 'submitting');
  assert.match(s.page(), /data-seat="seat-3"[^>]*data-board-target="pending"/);
  s.screen.dispose();
});

test('a command whose answer is lost leaves nothing on a hidden page while it is checked or unknown, and can still be asked about', async () => {
  const s = setup();
  // Every command and lookup goes unanswered: the receipt is lost.
  s.fake.respond.v1Receipt = async () => ({ protocolVersion: 2, status: 'unknown', serverTimeMs: s.host.serverNow() });
  await rescueSent(s);
  assert.equal(s.card().status, 'checking');
  assert.match(s.page(), /data-board-target="pending"/);
  s.screen.setPageVisible(false);
  assert.doesNotMatch(s.page(), PRIVATE);
  // Back in the foreground, the feed confirms the view again and checking starts over.
  s.screen.setPageVisible(true);
  await s.fake.deliver(OWN, rescueView(6));
  s.screen.dispatch(TOGGLE);
  // The bounded automatic checks run out, one wait at a time.
  for (let waited = 0; waited <= CHECKS * 2; waited += 1_000) await s.host.advance(1_000);
  assert.equal(s.card().status, 'unknown');
  assert.doesNotMatch(s.page(), /data-board-target/, 'An unknown result marks nobody');

  s.screen.setPageVisible(false);
  assert.doesNotMatch(s.page(), PRIVATE);
  s.screen.setPageVisible(true);
  await s.fake.deliver(OWN, rescueView(7));
  assert.doesNotMatch(s.page(), PRIVATE);
  s.screen.dispatch(TOGGLE);
  // Back again, the controller asks about it once more by itself; then it is the player's to ask about.
  assert.equal(s.card().status, 'checking');
  for (let waited = 0; waited <= CHECKS * 2; waited += 1_000) await s.host.advance(1_000);
  assert.equal(s.card().status, 'unknown');
  assert.match(s.page(), /id="ms-action-check" data-intent="action\/check-again"/);
  assert.match(s.host.kept, /"commandId"/, 'The command is still kept for recovery');
  s.screen.dispose();
});
