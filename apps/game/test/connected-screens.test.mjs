import assert from 'node:assert/strict';
import test from 'node:test';
import { FullCommandRequestSchema } from '@mothership/contracts';
import { createConnectedPlayerScreen, createConnectedTableScreen, DEFAULT_ACTION_FLOW_TIMING, DEFAULT_CATCH_UP_TIMING } from '@mothership/game';
import { renderConnectedPlayerShell, SHELL_IDS, toHtml } from '@mothership/presentation';
import { createFakeHost, flush } from './support/fakes.mjs';
import { createFakeConnectedTransport, EPOCH, MATCH, playerView, publicView } from './support/connected.mjs';

// The connected phone and table as their controllers run them: snapshots and intents in,
// frames out, against a transport whose every delivery and answer the test scripts. No
// backend is involved; the emulator-connected tests are a separate suite.

const GUARD = DEFAULT_ACTION_FLOW_TIMING.controlGuardMs;
const TOGGLE = { type: 'private/toggle' };
const OWN = { kind: 'player-view', matchId: MATCH };
const PUBLIC = { kind: 'public-view', matchId: MATCH };

function setup(surface = 'player', { kept = null } = {}) {
  const host = createFakeHost({ serverStart: EPOCH });
  host.kept = kept;
  const fake = createFakeConnectedTransport(host);
  fake.respond.v1ServerTime = async () => ({ protocolVersion: 2, serverTimeMs: host.serverNow() });
  const options = { transport: fake.transport, matchId: MATCH, ports: host.ports, host: { reload() {} } };
  const screen = surface === 'player' ? createConnectedPlayerScreen({ ...options, seatId: 'seat-1' }) : createConnectedTableScreen(options);
  const frames = [];
  screen.subscribe(() => frames.push(screen.getFrame()));
  const frame = () => screen.getFrame();
  const card = () => frame().model.match?.privateArea.content?.actions.card ?? null;
  const receipt = (request, status = 'accepted', code = 'REGISTERED') => ({ ok: true, serverTimeMs: host.serverNow(), receipt: { protocolVersion: 2, matchId: request.matchId, phaseId: request.phaseId, commandId: request.commandId, status, code } });
  return { host, fake, screen, frames, frame, card, receipt, html: () => toHtml(renderConnectedPlayerShell(frame().model)) };
}

test('a connected phone is connecting until the server confirms its own view, then shows the match labeled as the emulator', async () => {
  const s = setup();
  assert.equal(s.frame().model.screen, 'connecting');
  s.screen.start();
  assert.equal(s.fake.listeners(OWN), 1, 'It listens to its own private view and nothing else');
  assert.equal(s.fake.listeners(PUBLIC), 0);
  await s.fake.deliver(OWN, null);
  assert.equal(s.frame().model.screen, 'connecting', 'No view yet, before the match starts');
  await s.fake.deliver(OWN, playerView());
  const { model } = s.frame();
  assert.deepEqual([model.screen, model.connection, model.mode, model.match.identity.label], ['match', 'live', 'emulator', 'Player 1']);
  assert.equal(model.banners.some(banner => banner.variant === 'emulator'), true);
  assert.equal(model.banners.some(banner => banner.variant === 'fixture'), false, 'Never labeled as the fixture');
  assert.equal(model.match.roster.zones.flatMap(zone => zone.seats).length, 7, 'Seven seats, as the view says');
  // Server time is asked for this match, and the countdown comes from it.
  assert.deepEqual(s.fake.callsTo('v1ServerTime')[0], { protocolVersion: 2, matchId: MATCH });
  assert.equal(model.match.phase.timer.display, '1:00');
  assert.equal(model.match.privateArea.content, null, 'Nothing private until the player asks');
});

test('only a snapshot the server confirmed makes the view current; a cached one is shown as the last known state', async () => {
  const s = setup();
  s.screen.start();
  // From a cache: readable, kept, and not current.
  await s.fake.deliver(OWN, playerView(), false);
  assert.deepEqual([s.frame().model.screen, s.frame().model.connection], ['match', 'stale']);
  assert.equal(s.frame().model.banners.some(banner => banner.variant === 'stale'), true);
  s.screen.dispatch(TOGGLE);
  assert.equal(s.card().body.offers.every(offer => offer.open === null), true, 'Nothing can be started on it');
  s.screen.dispatch({ type: 'action/open', kind: 'move' });
  assert.equal(s.card().status, 'idle');
  // The server's confirmation arrives without the bytes changing.
  await s.fake.deliver(OWN, playerView(), true);
  assert.equal(s.frame().model.connection, 'live');
  assert.notEqual(s.card().body.offers[0].open, null);
  // The listener fails: stale again, and actions are withdrawn.
  await s.fake.fail(OWN);
  assert.equal(s.frame().model.connection, 'stale');
  assert.equal(s.card().body.offers.every(offer => offer.open === null), true);
  assert.equal(s.frame().model.match.privateArea.content.actions.notice, 'Actions are paused until the connection is restored.');
});

test('a view for another seat, or a public view, never becomes this phone’s view', async () => {
  const other = setup();
  other.screen.start();
  await other.fake.deliver(OWN, playerView('seat-2'));
  assert.equal(other.frame().model.screen, 'connecting');
  assert.equal(other.frame().model.banners.some(banner => banner.variant === 'unreadable'), true);
  await other.fake.deliver(OWN, publicView());
  assert.equal(other.frame().model.match, null);
  // Once it holds its own view, another seat's is refused and nothing of it is shown.
  const s = setup();
  s.screen.start();
  await s.fake.deliver(OWN, playerView());
  await s.fake.deliver(OWN, playerView('seat-2', view => { view.viewRevision += 1; }));
  assert.equal(s.frame().model.match.identity.label, 'Player 1');
  assert.equal(s.frame().model.banners.some(banner => banner.variant === 'unreadable'), true);
});

test('a move by intents alone: the server’s destination, one command, the receipt, and private words for it', async () => {
  const s = setup();
  s.screen.start();
  await s.fake.deliver(OWN, playerView());
  s.screen.dispatch(TOGGLE);
  assert.equal(s.card().status, 'idle');
  s.screen.dispatch({ type: 'action/open', kind: 'move' });
  assert.deepEqual([s.card().status, s.frame().focus.targetId], ['choosing', SHELL_IDS.actionStep]);
  // A name the server does not offer is not a choice.
  s.screen.dispatch({ type: 'action/choose', value: 'Command Room' });
  s.screen.dispatch({ type: 'action/choose', value: 'seat-2' });
  assert.equal(s.card().status, 'choosing');
  s.screen.dispatch({ type: 'action/choose', value: 'Room B' });
  assert.deepEqual([s.card().status, s.card().body.prompt, s.card().body.confirm.disabled], ['confirming', 'Move to Room B?', true]);
  s.screen.dispatch({ type: 'action/confirm' });
  assert.deepEqual(s.fake.callsTo('v1Command'), [], 'Not before the control is active');
  await s.host.advance(GUARD);
  assert.equal(s.card().body.confirm.disabled, false);

  s.fake.respond.v1Command = async request => s.receipt(request);
  s.screen.dispatch({ type: 'action/confirm' });
  s.screen.dispatch({ type: 'action/confirm' });
  await flush();
  const sent = s.fake.callsTo('v1Command');
  assert.equal(sent.length, 1, 'One confirmation, one command');
  assert.deepEqual(FullCommandRequestSchema.parse(sent[0]), sent[0]);
  assert.deepEqual([sent[0].phaseId, sent[0].command], ['phase-one', { type: 'MOVE', destination: 'Room B' }]);
  assert.deepEqual([s.card().status, s.card().body.text], ['accepted', 'Move to Room B accepted.']);
  assert.equal(s.frame().privateAnnouncement.text, 'Move to Room B accepted.');
  assert.doesNotMatch(s.frame().announcement?.text ?? '', /Moved|Room B/, 'Nothing about it on the public channel');
  // The authoritative view then shows the move; the card goes back to what the server offers.
  await s.fake.deliver(OWN, playerView('seat-1', view => { view.viewRevision += 1; view.seats[0].location = 'Room B'; view.self.movementDestinations = []; }));
  await s.host.advance(GUARD);
  s.screen.dispatch({ type: 'action/dismiss' });
  assert.deepEqual(s.card().body.offers[0], { kind: 'move', label: 'Move', statusLabel: 'Not available', open: null });
  assert.equal(s.frame().model.match.location.name, 'Room B');
});

test('a role action by intents alone: listed only when the view opens it, the server’s targets, one command, and words that name no outcome', async () => {
  const s = setup();
  s.screen.start();
  await s.fake.deliver(OWN, playerView());
  s.screen.dispatch(TOGGLE);
  assert.deepEqual(s.card().body.offers.map(offer => offer.kind), ['move', 'shot'], 'Nothing of any role’s action while the view opens none');
  s.screen.dispatch({ type: 'action/open', kind: 'protect' });
  assert.equal(s.card().status, 'idle', 'An action the view does not open cannot be opened');

  // The server opens Protection for this seat, with its own seat among the targets.
  await s.fake.deliver(OWN, playerView('seat-1', view => { view.viewRevision += 1; view.legalTargets = { PROTECT: ['seat-3', 'seat-1'] }; }));
  assert.deepEqual(s.card().body.offers.map(offer => [offer.kind, offer.statusLabel]), [['move', 'Available'], ['shot', 'Not available'], ['protect', 'Available']]);
  s.screen.dispatch({ type: 'action/open', kind: 'protect' });
  assert.deepEqual(s.card().body.choices.map(choice => choice.label), ['Player 1 (you)', 'Player 3']);
  s.screen.dispatch({ type: 'action/choose', value: 'seat-9' });
  assert.equal(s.card().status, 'choosing', 'A seat the server does not list is not a choice');
  s.screen.dispatch({ type: 'action/choose', value: 'seat-1' });
  assert.deepEqual([s.card().status, s.card().body.prompt], ['confirming', 'Register Protection for yourself?']);
  await s.host.advance(GUARD);
  s.fake.respond.v1Command = async request => s.receipt(request);
  s.screen.dispatch({ type: 'action/confirm' });
  await flush();
  const [sent] = s.fake.callsTo('v1Command');
  assert.equal(FullCommandRequestSchema.safeParse(sent).success, true);
  assert.deepEqual(sent.command, { type: 'PROTECT', targetSeatId: 'seat-1' });
  assert.deepEqual([s.card().status, s.card().body.text, s.card().body.detail], ['accepted', 'Protection for yourself registered.', 'This is not a result. Registered actions are resolved at the end of the round.']);
  assert.equal(s.frame().privateAnnouncement.text, 'Protection for yourself registered.');
  assert.equal(s.frame().announcement.text.includes('Protection'), false, 'Nothing of it is said on the public channel');
  // Closed, nothing of it is in the frame or the document.
  s.screen.dispatch(TOGGLE);
  assert.doesNotMatch(`${JSON.stringify(s.frame())} ${s.html()}`, /Protection|PROTECT|ms-action-open-protect/);
});

test('with the panel closed nothing of the command is in the frame or the document, and action intents are ignored', async () => {
  const s = setup();
  s.screen.start();
  await s.fake.deliver(OWN, playerView());
  s.screen.dispatch({ type: 'action/open', kind: 'move' });
  assert.equal(s.frame().model.match.privateArea.content, null);
  s.screen.dispatch(TOGGLE);
  s.screen.dispatch({ type: 'action/open', kind: 'move' });
  s.screen.dispatch({ type: 'action/choose', value: 'Room B' });
  await s.host.advance(GUARD);
  // Closing the panel drops the unsent choice and leaves nothing private behind.
  s.screen.dispatch(TOGGLE);
  assert.deepEqual([s.frame().model.match.privateArea.content, s.frame().privateAnnouncement, s.frame().focus], [null, null, null]);
  assert.doesNotMatch(s.html(), /Cracker|Move to|ms-card|action\//);
  s.screen.dispatch({ type: 'action/confirm' });
  assert.deepEqual(s.fake.callsTo('v1Command'), []);
  s.screen.dispatch(TOGGLE);
  assert.equal(s.card().status, 'idle', 'Opening again does not bring the choice back');
  // Backgrounding does the same.
  s.screen.dispatch({ type: 'action/open', kind: 'move' });
  s.screen.setPageVisible(false);
  assert.equal(s.frame().model.match.privateArea.content, null);
  s.screen.setPageVisible(true);
  assert.equal(s.frame().model.match.privateArea.open, false);
});

test('an unsent choice is cleared when the phase changes, and the player is told it was not sent', async () => {
  const s = setup();
  s.screen.start();
  const view = playerView();
  await s.fake.deliver(OWN, view);
  s.screen.dispatch(TOGGLE);
  s.screen.dispatch({ type: 'action/open', kind: 'move' });
  s.screen.dispatch({ type: 'action/choose', value: 'Room B' });
  await s.fake.deliver(OWN, playerView('seat-1', next => { next.viewRevision += 1; next.phase = { ...next.phase, id: 'phase-two', startedAt: EPOCH + 60_000, endsAt: EPOCH + 120_000 }; next.activeSeatId = 'seat-2'; }));
  assert.equal(s.card().status, 'idle');
  assert.equal(s.frame().privateAnnouncement.text, 'Your choice was not sent.');
  assert.deepEqual(s.fake.callsTo('v1Command'), []);
});

test('a reloaded phone asks about its unresolved command once it has a confirmed view, and sends nothing', async () => {
  const kept = JSON.stringify({ matchId: MATCH, seatId: 'seat-1', phaseId: 'phase-one', commandId: 'kept-command' });
  const s = setup('player', { kept });
  s.screen.start();
  s.fake.respond.v1Receipt = async request => ({ status: 'found', serverTimeMs: s.host.serverNow(), receipt: { protocolVersion: 2, matchId: MATCH, phaseId: 'phase-one', commandId: request.commandId, status: 'accepted', code: 'REGISTERED' } });
  await s.fake.deliver(OWN, playerView());
  assert.deepEqual(s.fake.callsTo('v1Receipt'), [{ protocolVersion: 2, matchId: MATCH, commandId: 'kept-command' }]);
  assert.deepEqual(s.fake.callsTo('v1Command'), []);
  assert.equal(s.host.kept, null);
  // The panel is closed after a reload, so nothing was said. Opened, it tells what it knows.
  assert.equal(s.frame().privateAnnouncement, null);
  s.screen.dispatch(TOGGLE);
  assert.deepEqual([s.card().status, s.card().title, s.card().body.text], ['accepted', 'Your action', 'The server accepted your action.']);
  assert.equal(s.frame().privateAnnouncement.text, 'The server accepted your action.');
});

test('the connected table shows public facts only, listens to the public view only, and can send no command', async () => {
  const s = setup('table');
  s.screen.start();
  assert.deepEqual([s.fake.listeners(PUBLIC), s.fake.listeners(OWN)], [1, 0]);
  await s.fake.deliver(PUBLIC, playerView());
  assert.equal(s.frame().model.match, null, 'A private view is unreadable to the table');
  await s.fake.deliver(PUBLIC, publicView());
  const { model } = s.frame();
  assert.deepEqual([model.screen, model.mode, model.match.roster.rows.length], ['match', 'emulator', 7]);
  assert.doesNotMatch(JSON.stringify(s.frame()), /Cracker|role|knowledge|legalTargets/);
  for (const intent of [TOGGLE, { type: 'action/open', kind: 'move' }, { type: 'action/confirm' }]) s.screen.dispatch(intent);
  await s.host.advance(120_000);
  assert.deepEqual(s.fake.callsTo('v1Command'), []);
  assert.deepEqual(s.fake.callsTo('v1Receipt'), []);
});

test('a snapshot the server confirmed with a lower revision is a match gone backwards: the screen stops, and nothing can be sent', async () => {
  for (const surface of ['player', 'table']) {
    const s = setup(surface);
    const [target, make] = surface === 'player' ? [OWN, change => playerView('seat-1', change)] : [PUBLIC, change => publicView(change)];
    s.screen.start();
    await s.fake.deliver(target, make(view => { view.viewRevision = 9; }));
    assert.deepEqual([s.frame().model.screen, s.frame().model.connection], ['match', 'live'], surface);
    // From a cache, a lower revision proves nothing and is dropped.
    await s.fake.deliver(target, make(view => { view.viewRevision = 4; }), false);
    assert.equal(s.frame().model.screen, 'match', `${surface}: a cached older copy changes nothing`);
    // Confirmed by the server, it is not a replay: the match was restored or replaced.
    await s.fake.deliver(target, make(view => { view.viewRevision = 4; }));
    assert.equal(s.frame().model.screen, 'blocked', surface);
    assert.equal(s.frame().model.blocked.heading, 'Match data check failed');
    assert.equal(s.frame().model.match, null, 'Nothing of the match is shown');
    if (surface === 'player') {
      for (const intent of [TOGGLE, { type: 'action/open', kind: 'move' }, { type: 'action/choose', value: 'Room B' }, { type: 'action/confirm' }]) s.screen.dispatch(intent);
      await s.host.advance(GUARD);
      s.screen.dispatch({ type: 'action/confirm' });
      await flush();
      assert.deepEqual(s.fake.callsTo('v1Command'), []);
    }
    // Later data does not clear it: the feed is not trusted again.
    await s.fake.deliver(target, make(view => { view.viewRevision = 12; }));
    assert.equal(s.frame().model.screen, 'blocked');
  }
});

test('without a trusted clock nothing can be started: not knowing the time is not permission', async () => {
  const s = setup();
  // The server's time cannot be had: the request never gets an answer.
  s.fake.respond.v1ServerTime = async () => { throw new Error('unreachable'); };
  s.screen.start();
  await s.fake.deliver(OWN, playerView());
  // Ten minutes into a sixty-second phase, as far as anyone can tell.
  await s.host.advance(600_000);
  assert.equal(s.frame().model.match.phase.timer.state, 'syncing');
  s.screen.dispatch(TOGGLE);
  assert.deepEqual(s.card().body.offers.map(offer => [offer.statusLabel, offer.open]), [['Paused', null], ['Not available', null]]);
  assert.equal(s.frame().model.match.privateArea.content.actions.notice, 'Actions are paused until this device has the server’s time.');
  for (const intent of [{ type: 'action/open', kind: 'move' }, { type: 'action/choose', value: 'Room B' }, { type: 'action/confirm' }]) s.screen.dispatch(intent);
  await s.host.advance(GUARD);
  s.screen.dispatch({ type: 'action/confirm' });
  await flush();
  assert.equal(s.card().status, 'idle');
  assert.deepEqual(s.fake.callsTo('v1Command'), []);
  // Nor does it ask the server to end a phase it cannot tell has ended. Neither does a display.
  assert.deepEqual(s.fake.callsTo('v1Advance'), []);
  const table = setup('table');
  table.fake.respond.v1ServerTime = async () => { throw new Error('unreachable'); };
  table.screen.start();
  await table.fake.deliver(PUBLIC, publicView());
  await table.host.advance(600_000);
  assert.deepEqual(table.fake.callsTo('v1Advance'), []);
});

const NEXT_PHASE = next => {
  next.viewRevision += 1;
  next.phase = { ...next.phase, id: 'phase-two', startedAt: EPOCH + 61_000, endsAt: EPOCH + 121_000 };
  next.activeSeatId = 'seat-2';
};

test('when its countdown ends the display asks the server to look at the deadline; only the next view changes the phase on screen', async () => {
  const s = setup('table');
  s.screen.start();
  await s.fake.deliver(PUBLIC, publicView());
  s.fake.respond.v1Advance = async request => ({ protocolVersion: 2, matchId: request.matchId, phaseId: request.phaseId, serverTimeMs: s.host.serverNow(), result: 'advanced' });
  const phase = () => s.frame().model.match.phase;
  await s.host.advance(59_999);
  assert.deepEqual(s.fake.callsTo('v1Advance'), [], 'Nothing is asked while the phase is running');
  await s.host.advance(1 + DEFAULT_CATCH_UP_TIMING.firstDelayMs - 1);
  assert.deepEqual(s.fake.callsTo('v1Advance'), [], 'nor at the instant the countdown reaches zero');
  await s.host.advance(1);
  assert.deepEqual(s.fake.callsTo('v1Advance'), [{ protocolVersion: 2, matchId: MATCH, phaseId: 'phase-one' }], 'It names the match and the phase on its screen');
  // The server answered "advanced". That is not a view: the screen still shows the phase it was sent, ended.
  assert.deepEqual([phase().phaseLabel, phase().timer.state], ['Player 1’s turn', 'expired']);
  await s.fake.deliver(PUBLIC, publicView(NEXT_PHASE));
  assert.deepEqual([phase().phaseLabel, phase().timer.state], ['Player 2’s turn', 'running']);
  await s.host.advance(30_000);
  assert.equal(s.fake.callsTo('v1Advance').length, 1, 'With the next phase on screen it has nothing more to ask');
});

test('a phone asks later than a display would, not at all once the next view is here, and never on a view it cannot trust', async () => {
  const late = setup();
  late.screen.start();
  await late.fake.deliver(OWN, playerView());
  await late.host.advance(60_000 + DEFAULT_CATCH_UP_TIMING.playerDelayMs - 1);
  assert.deepEqual(late.fake.callsTo('v1Advance'), [], 'A display on the table would have asked by now');
  await late.host.advance(1);
  assert.deepEqual(late.fake.callsTo('v1Advance'), [{ protocolVersion: 2, matchId: MATCH, phaseId: 'phase-one' }]);

  const beaten = setup();
  beaten.screen.start();
  await beaten.fake.deliver(OWN, playerView());
  await beaten.host.advance(60_000 + DEFAULT_CATCH_UP_TIMING.playerDelayMs - 1);
  await beaten.fake.deliver(OWN, playerView('seat-1', NEXT_PHASE));
  await beaten.host.advance(30_000);
  assert.deepEqual(beaten.fake.callsTo('v1Advance'), [], 'The next view arrived first');

  const stale = setup();
  stale.screen.start();
  await stale.fake.deliver(OWN, playerView());
  await stale.fake.fail(OWN);
  await stale.host.advance(300_000);
  assert.deepEqual(stale.fake.callsTo('v1Advance'), [], 'A countdown on a view the server no longer confirms is not a reason to ask');

  const hidden = setup();
  hidden.screen.start();
  await hidden.fake.deliver(OWN, playerView());
  hidden.screen.setPageVisible(false);
  await hidden.host.advance(300_000);
  assert.deepEqual(hidden.fake.callsTo('v1Advance'), [], 'nor does a page nobody is looking at');
});

test('dispose stops the listener, the timers and the command flow', async () => {
  const s = setup();
  s.screen.start();
  await s.fake.deliver(OWN, playerView());
  s.screen.dispose();
  assert.equal(s.fake.listeners(OWN), 0);
  assert.equal(s.host.pendingTimers(), 0);
  const count = s.frames.length;
  await s.fake.deliver(OWN, playerView('seat-1', view => { view.viewRevision += 1; }));
  assert.equal(s.frames.length, count);

  // Also with a deadline catch-up waiting to ask.
  const ended = setup('table');
  ended.screen.start();
  await ended.fake.deliver(PUBLIC, publicView());
  await ended.host.advance(60_000);
  ended.screen.dispose();
  assert.equal(ended.host.pendingTimers(), 0);
  await ended.host.advance(60_000);
  assert.deepEqual(ended.fake.callsTo('v1Advance'), []);
});
