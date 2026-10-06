import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlayerScreen, createTableScreen, DEFAULT_SHOT_FLOW_TIMING } from '@mothership/game';
import { renderPlayerShell, renderTableShell, toHtml } from '@mothership/presentation';
import { createFixtureTransport } from '../dev/fixture/fixture-transport.mjs';
import { createScenario } from '../dev/fixture/scenario.mjs';
import { createFakeHost, flush } from './support/fakes.mjs';

// The acceptance journeys of docs/frontend/first-slice.md that concern a command, run with
// the real client core for three audiences against one scripted fixture scenario.
//
// FIXTURE BEHAVIOR, NOT INTEGRATION. The scenario is a scripted double that follows the
// command contract as stated and applies no game rule. Nothing here exercises a backend,
// an emulator, authentication, Security Rules or a real network.

const MATCH = 'fixture-match-a';
const GUARD = DEFAULT_SHOT_FLOW_TIMING.confirmGuardMs;
const [FIRST, SECOND, THIRD] = DEFAULT_SHOT_FLOW_TIMING.recheckDelaysMs;
const TOGGLE = { type: 'private/toggle' };
const OPEN = { type: 'shot/open' };
const CONFIRM = { type: 'shot/confirm' };
const DISMISS = { type: 'shot/dismiss' };
const choose = seatId => ({ type: 'shot/choose-target', seatId });

/** A feed whose payloads can be held back, as when a view lags behind the answer to a request. */
function lagging(transport) {
  let held = null;
  return {
    transport: {
      ...transport,
      subscribe: listener => transport.subscribe({
        onConnectionChange: state => listener.onConnectionChange(state),
        onPayload: payload => (held === null ? listener.onPayload(payload) : held.push(payload)),
      }),
    },
    hold() { held = []; },
    listener: null,
    release(deliver) {
      const queued = held ?? [];
      held = null;
      for (const payload of queued) deliver(payload);
    },
  };
}

async function world({ variant, wait } = {}) {
  const host = createFakeHost({ localStart: 0 });
  const scenario = createScenario({ now: () => host.localNow(), variant });
  const sent = [];
  const looked = [];

  // One phone for the Officer's seat. "Reloading" it makes a new screen over the same seat.
  function officerPhone() {
    let deliver = null;
    const base = createFixtureTransport(scenario, 'seat-1', { wait });
    const feed = lagging({
      ...base,
      subscribe: listener => { deliver = payload => listener.onPayload(payload); return base.subscribe(listener); },
      submitCommand: command => { sent.push(structuredClone(command)); return base.submitCommand(command); },
      lookupReceipt: request => { looked.push(structuredClone(request)); return base.lookupReceipt(request); },
    });
    const screen = createPlayerScreen({ transport: feed.transport, matchId: MATCH, ports: host.ports, host: { reload() {} } });
    return { screen, holdFeed: () => feed.hold(), releaseFeed: () => feed.release(payload => deliver(payload)) };
  }
  const phone = officerPhone();
  const target = createPlayerScreen({ transport: createFixtureTransport(scenario, 'seat-2'), matchId: MATCH, ports: host.ports, host: { reload() {} } });
  const table = createTableScreen({ transport: createFixtureTransport(scenario, 'public'), matchId: MATCH, ports: host.ports, host: { reload() {} } });
  for (const screen of [phone.screen, target, table]) screen.start();
  await flush();
  phone.screen.dispatch(TOGGLE);
  target.dispatch(TOGGLE);

  const cardOf = screen => screen.getFrame().model.match?.privateArea.content?.actions.cards[0] ?? null;
  const w = {
    host, scenario, sent, looked, target, table, officerPhone,
    officer: phone.screen, holdFeed: phone.holdFeed, releaseFeed: phone.releaseFeed,
    card: () => cardOf(w.officer),
    cardOf,
    /** Chooses a target and waits out the double-tap guard, leaving the confirm step on screen. */
    async toConfirm(seatId = 'seat-2') {
      w.officer.dispatch(OPEN);
      w.officer.dispatch(choose(seatId));
      await host.advance(GUARD);
    },
    async confirm(seatId) {
      await w.toConfirm(seatId);
      w.officer.dispatch(CONFIRM);
      await flush();
    },
    html: () => ({
      officer: toHtml(renderPlayerShell(w.officer.getFrame().model)),
      target: toHtml(renderPlayerShell(target.getFrame().model)),
      table: toHtml(renderTableShell(table.getFrame().model)),
    }),
  };
  return w;
}

test('journey: the Officer picks a numbered player in the same room, confirms and is told it is registered; no other screen is even redrawn', async () => {
  const pages = {};
  for (const variant of ['protected', 'unprotected']) {
    const w = await world({ variant });
    assert.deepEqual(w.cardOf(w.target).statusLabel, 'Not available');
    await w.toConfirm('seat-2');
    assert.equal(w.card().body.prompt, 'Register a shot at Player 2?');
    // From here to the answer no time passes, so any redraw elsewhere could only come from the registration.
    const tableFrame = w.table.getFrame();
    const targetFrame = w.target.getFrame();
    w.officer.dispatch(CONFIRM);
    await flush();
    assert.equal(w.card().body.text, 'Shot at Player 2 registered.');
    assert.equal(w.card().body.detail, 'This is not a result. Registered shots are resolved at the end of the round.');
    assert.equal(w.table.getFrame(), tableFrame, 'The table display did not redraw');
    assert.equal(w.target.getFrame(), targetFrame, 'The target phone did not redraw, even with its private panel open');
    assert.equal(tableFrame.announcement?.text.includes('shot') ?? false, false);

    assert.equal(w.sent.length, 1);
    assert.deepEqual(w.scenario.viewFor('seat-1').ownPendingCommandIds, [w.sent[0].commandId]);
    assert.equal(w.scenario.viewFor('seat-2').seats[1].health, 'Healthy', 'Registration is not damage: nobody’s health moved');
    w.officer.dispatch(DISMISS);
    assert.equal(w.card().body.note, 'Your shot at Player 2 is registered. It is resolved at the end of the round.');
    pages[variant] = w.html();
  }
  // Whether the target holds Protection is server-only truth. No screen differs because of it.
  assert.deepEqual(pages.protected, pages.unprotected);
});

test('journey: duplicate submission. Repeated confirmations and a replayed request register one shot', async () => {
  const w = await world();
  await w.toConfirm();
  for (let tap = 0; tap < 5; tap += 1) w.officer.dispatch(CONFIRM);
  await flush();
  assert.equal(w.sent.length, 1);
  assert.equal(w.scenario.status().commands.receipts, 1);
  // The very same request sent again by a retrying network layer changes nothing.
  const revision = w.scenario.viewFor('seat-1').viewRevision;
  const replay = w.scenario.submitCommand('seat-1', w.sent[0]);
  assert.equal(replay.body.receipt.status, 'accepted');
  assert.equal(w.scenario.viewFor('seat-1').viewRevision, revision);
  assert.equal(w.scenario.status().commands.receipts, 1);
  assert.equal(w.card().status, 'registered');
});

test('journey: lost acknowledgment. The shot was registered but the answer never arrived; the receipt is recovered, not guessed', async () => {
  const w = await world();
  w.scenario.planNextCommand('lose-acknowledgment');
  // The player's view lags too, so nothing on the phone can know yet.
  w.holdFeed();
  await w.confirm('seat-3');
  assert.equal(w.card().status, 'checking');
  assert.equal(w.card().body.text, 'Checking whether your shot was registered…');
  assert.equal(JSON.stringify(w.card()).includes('shot/'), false, 'Locked: no way to pick someone else meanwhile');
  await w.host.advance(FIRST);
  assert.equal(w.card().body.text, 'Shot at Player 3 registered.');
  assert.deepEqual(w.looked, [{ protocolVersion: 1, matchId: MATCH, commandId: w.sent[0].commandId }]);
  assert.equal(w.sent.length, 1, 'A receipt was found, so the command was not sent a second time');

  // Acknowledged before the view arrived: the stale view still says "available", and the
  // card does not offer the shot again on its word.
  w.officer.dispatch(DISMISS);
  assert.equal(w.card().status, 'registered');
  assert.equal(w.card().body.open, null);
  w.releaseFeed();
  await flush();
  assert.equal(w.card().body.note, 'Your shot at Player 3 is registered. It is resolved at the end of the round.');
  assert.equal(w.scenario.status().commands.receipts, 1);
});

test('journey: lost request. Nothing reached the server; the identical command is sent again and decided then', async () => {
  const w = await world();
  w.scenario.planNextCommand('drop-request');
  await w.confirm('seat-4');
  assert.equal(w.card().status, 'checking');
  assert.equal(w.scenario.viewFor('seat-1').self.shotAvailable, true, 'Not registered yet');
  await w.host.advance(FIRST);
  assert.equal(w.card().body.text, 'Shot at Player 4 registered.');
  assert.equal(w.looked.length, 1);
  assert.equal(w.sent.length, 2);
  assert.deepEqual(w.sent[1], w.sent[0], 'Same identifier, same payload');
  assert.equal(w.scenario.status().commands.receipts, 1);
});

test('journey: the server answers "unavailable". The outcome of that attempt is unknown and is reconciled the same way', async () => {
  const w = await world();
  w.scenario.planNextCommand('unavailable');
  await w.confirm();
  assert.equal(w.card().status, 'checking');
  await w.host.advance(FIRST);
  assert.equal(w.card().status, 'registered');
  assert.deepEqual(w.sent[1], w.sent[0]);
});

test('journey: rejected targeting. The rejection is shown as the server gave it, and a new choice is a new command', async () => {
  const w = await world();
  w.scenario.planNextCommand('reject-not-allowed');
  await w.confirm('seat-6');
  assert.equal(w.card().statusLabel, 'Not registered');
  assert.equal(w.card().body.text, 'Not registered. The server did not allow this shot.');
  // No reason is invented: nothing about why, and nothing about anyone's defenses.
  assert.doesNotMatch(JSON.stringify(w.card()), /because|protect|immun|defen|jail|health/i);
  assert.equal(w.scenario.viewFor('seat-1').self.shotAvailable, true);
  w.officer.dispatch(DISMISS);
  await w.confirm('seat-2');
  assert.equal(w.card().body.text, 'Shot at Player 2 registered.');
  assert.notEqual(w.sent[1].commandId, w.sent[0].commandId);
  assert.deepEqual(w.sent.map(command => command.command.targetSeatId), ['seat-6', 'seat-2']);
  assert.equal(w.scenario.status().commands.receipts, 2);
});

test('journey: the command service is down. The app says the result is unknown, assumes nothing, and settles when asked again', async () => {
  const w = await world();
  w.scenario.setCommandService('silent');
  await w.confirm();
  assert.equal(w.card().status, 'checking');
  await w.host.advance(FIRST + SECOND + THIRD);
  assert.equal(w.card().statusLabel, 'Result unknown');
  assert.equal(w.card().body.detail, 'Do not assume either way. Check again when the connection is back.');
  assert.equal(w.officer.getFrame().model.connection, 'live', 'The feed is fine; only the request went unanswered');
  assert.equal(w.sent.length, 1, 'Nothing was sent into the silence');
  // Still down: asking again changes nothing and still claims nothing.
  w.officer.dispatch({ type: 'shot/check-again' });
  await flush();
  assert.equal(w.card().statusLabel, 'Result unknown');
  w.scenario.setCommandService('answering');
  w.officer.dispatch({ type: 'shot/check-again' });
  await flush();
  assert.equal(w.card().body.text, 'Shot at Player 2 registered.');
  assert.deepEqual(w.sent[1], w.sent[0]);
});

test('journey: the turn ends while the outcome is unknown. The late command is rejected by the server and reported as not registered', async () => {
  const w = await world();
  // The request never reaches the server, and the server stays out of reach for a while.
  w.scenario.setCommandService('silent');
  await w.confirm();
  await w.host.advance(FIRST + SECOND + THIRD);
  assert.equal(w.card().status, 'unknown');
  // The backend opens the next turn. The client did not ask it to, and concludes nothing from it:
  // it asks, finds no receipt, sends the identical command, and the server rejects it for good.
  w.scenario.setCommandService('answering');
  assert.equal(w.scenario.endFirstTurn(), true);
  await flush();
  assert.equal(w.officer.getFrame().model.match.phase.phaseLabel, 'Player 2’s turn');
  assert.equal(w.card().statusLabel, 'Not registered');
  assert.equal(w.card().body.text, 'Not registered. The turn had already ended.');
  assert.equal(w.sent.length, 2);
  assert.deepEqual(w.sent[1], w.sent[0]);
  assert.deepEqual(w.scenario.viewFor('seat-1').ownPendingCommandIds, []);
  assert.equal(w.scenario.viewFor('seat-1').self.shotAvailable, true, 'Nothing was spent');
  // Acknowledged, the card goes back to what the view says: a shot, but not on this turn.
  w.officer.dispatch(DISMISS);
  assert.deepEqual(w.card().body, { step: 'idle', open: null, reason: 'You can register a shot during your own turn.', note: null });
});

test('journey: refresh during a pending registration. The reloaded phone recovers the registration from its view and restores nothing it should not', async () => {
  // The server has registered the shot, but neither the answer nor the updated view has
  // reached the phone when the page is reloaded.
  const w = await world();
  w.scenario.planNextCommand('lose-acknowledgment');
  w.holdFeed();
  await w.confirm('seat-2');
  assert.equal(w.card().status, 'checking');
  w.officer.dispose();

  const reloaded = w.officerPhone().screen;
  reloaded.start();
  await flush();
  // Same seat, same role, same resources; the private panel does not reopen by itself.
  assert.equal(reloaded.getFrame().model.match.identity.label, 'Player 1');
  assert.equal(reloaded.getFrame().model.match.privateArea.content, null);
  reloaded.dispatch(TOGGLE);
  const content = reloaded.getFrame().model.match.privateArea.content;
  assert.equal(content.role.name, 'Officer');
  const card = content.actions.cards[0];
  assert.equal(card.statusLabel, 'Registered');
  // The device kept nothing across the reload, so it does not know the target; the view does not carry it.
  assert.deepEqual(card.body, { step: 'idle', open: null, reason: null, note: 'A shot is registered. It is resolved at the end of the round.' });
  assert.equal(JSON.stringify(reloaded.getFrame()).includes('Player 2 is registered'), false);
  for (const intent of [OPEN, CONFIRM]) reloaded.dispatch(intent);
  assert.equal(w.sent.length, 1, 'Reloading sent nothing and offered nothing to send');
  assert.equal(w.scenario.status().commands.receipts, 1);
});

test('journey: refresh after a request that never arrived. Nothing is registered, nothing is replayed, and the player may choose again', async () => {
  const w = await world();
  w.scenario.setCommandService('silent');
  await w.confirm('seat-3');
  assert.equal(w.card().status, 'checking');
  w.officer.dispose();
  w.scenario.setCommandService('answering');

  const reloaded = w.officerPhone().screen;
  reloaded.start();
  await flush();
  reloaded.dispatch(TOGGLE);
  const card = () => reloaded.getFrame().model.match.privateArea.content.actions.cards[0];
  assert.equal(card().statusLabel, 'Available');
  await w.host.advance(30_000);
  assert.equal(w.sent.length, 1, 'No gameplay was queued to be replayed after the reload');
  reloaded.dispatch(OPEN);
  reloaded.dispatch(choose('seat-4'));
  await w.host.advance(GUARD);
  reloaded.dispatch(CONFIRM);
  await flush();
  assert.equal(card().body.text, 'Shot at Player 4 registered.');
  assert.notEqual(w.sent[1].commandId, w.sent[0].commandId);
});

test('journey: background and resume across a deadline. A choice left on screen is gone, nothing was sent, and the phone shows the server’s present', async () => {
  const w = await world();
  await w.toConfirm();
  assert.equal(w.card().status, 'confirming');
  w.officer.setPageVisible(false);
  // The minute runs out and the backend opens the next turn while the phone is in a pocket.
  await w.host.advance(61_000);
  w.scenario.endFirstTurn();
  await flush();
  w.officer.setPageVisible(true);
  await flush();
  const model = w.officer.getFrame().model;
  assert.equal(model.match.phase.phaseLabel, 'Player 2’s turn');
  assert.equal(model.match.phase.timer.state, 'running');
  assert.equal(model.match.phase.timer.display, '1:00', 'The countdown is the new phase’s, measured afresh from the server');
  assert.equal(model.match.privateArea.content, null, 'The private panel stays closed after a return');
  w.officer.dispatch(TOGGLE);
  assert.deepEqual(w.card().body, { step: 'idle', open: null, reason: 'You can register a shot during your own turn.', note: null });
  for (const intent of [CONFIRM, OPEN]) w.officer.dispatch(intent);
  assert.equal(w.sent.length, 0, 'The choice that was on screen was never sent');
});

test('journey: resume with a command still unresolved. Returning to the foreground reconciles it before anything else is offered', async () => {
  const w = await world();
  w.scenario.planNextCommand('lose-acknowledgment');
  w.holdFeed();
  w.scenario.setCommandService('answering');
  await w.toConfirm();
  w.officer.dispatch(CONFIRM);
  w.officer.setPageVisible(false);
  w.scenario.setCommandService('silent');
  await flush();
  await w.host.advance(FIRST + SECOND + THIRD + 1_000);
  w.scenario.setCommandService('answering');
  const asked = w.looked.length;
  w.officer.setPageVisible(true);
  await flush();
  assert.equal(w.looked.length, asked + 1, 'Asked on return, without being told to');
  w.officer.dispatch(TOGGLE);
  assert.equal(w.card().body.text, 'Shot at Player 2 registered.');
  assert.equal(w.sent.length, 1);
});

test('journey: a registration is not a resolution. Stepping the script on shows no outcome on any screen', async () => {
  const w = await world();
  await w.confirm();
  w.officer.dispatch(DISMISS);
  while (w.scenario.advance()) await flush();
  await flush();
  assert.equal(w.officer.getFrame().model.match.phase.phaseLabel, 'Round resolution');
  for (const [name, page] of Object.entries(w.html())) {
    assert.doesNotMatch(page, /Injured|Eliminated|BANG|BLOCKED|blocked|was hit/, name);
  }
  // The fixture resolves nothing (recipients are undecided), so the registration is still listed.
  assert.equal(w.card().body.note, 'Your shot at Player 2 is registered. It is resolved at the end of the round.');
});

test('journey: a slow request. The phone says it is submitting, claims nothing, and registers only when the server has answered', async () => {
  let arrive;
  const w = await world({ wait: () => new Promise(resolve => { arrive = resolve; }) });
  w.scenario.planNextCommand('slow');
  await w.confirm('seat-2');
  for (let waited = 0; waited < 3; waited += 1) {
    await w.host.advance(1_000);
    assert.equal(w.card().status, 'submitting');
    assert.equal(w.card().body.text, 'Sending your shot to the server…');
    assert.equal(w.scenario.status().commands.receipts, 0, 'The server has not seen it yet');
  }
  arrive();
  await flush();
  assert.equal(w.card().body.text, 'Shot at Player 2 registered.');
  assert.equal(w.sent.length, 1);
});
