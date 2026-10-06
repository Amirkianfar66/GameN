import assert from 'node:assert/strict';
import test from 'node:test';
import { PlayerViewSchema, RegisterShotSchema } from '@mothership/contracts';
import { createOfficerFixture } from '@mothership/contracts/fixtures';
import { createPlayerScreen, createTableScreen, DEFAULT_SHOT_FLOW_TIMING } from '@mothership/game';
import { renderPlayerShell, SHELL_IDS, toHtml } from '@mothership/presentation';
import { auditMarkup } from '../../../packages/presentation/test/support/markup-audit.mjs';
import { createFakeHost, createFakeTransport, flush } from './support/fakes.mjs';

// The shot flow as a player's phone runs it: intents in, frames out, against a transport
// whose every answer the test scripts. No fixture scenario and no rule is involved here.

const { before } = createOfficerFixture('protected');
const matchId = before.public.matchId;
const SERVER_EPOCH = before.public.phase.startedAt;
const GUARD = DEFAULT_SHOT_FLOW_TIMING.confirmGuardMs;
const [FIRST, SECOND, THIRD] = DEFAULT_SHOT_FLOW_TIMING.recheckDelaysMs;
const TOGGLE = { type: 'private/toggle' };
const OPEN = { type: 'shot/open' };
const CONFIRM = { type: 'shot/confirm' };
const choose = seatId => ({ type: 'shot/choose-target', seatId });

function variant(view, change) {
  const copy = structuredClone(view);
  change(copy);
  return PlayerViewSchema.parse(copy);
}
const listing = (view, commandId) => variant(view, v => { v.viewRevision += 1; v.self.shotAvailable = false; v.ownPendingCommandIds = [commandId]; });

function setup() {
  const host = createFakeHost({ serverStart: SERVER_EPOCH });
  const fake = createFakeTransport(host);
  const screen = createPlayerScreen({ transport: fake.transport, matchId, ports: host.ports, host: { reload() {} } });
  const frames = [];
  screen.subscribe(() => frames.push(screen.getFrame()));
  const receipt = (command, status, code) => ({ protocolVersion: 1, matchId: command.matchId, phaseId: command.phaseId, commandId: command.commandId, status, code });
  const answers = {
    accepted: command => ({ ok: true, serverTimeMs: host.serverNow(), receipt: receipt(command, 'accepted', 'REGISTERED') }),
    rejected: code => command => ({ ok: true, serverTimeMs: host.serverNow(), receipt: receipt(command, 'rejected', code) }),
    lost: () => Promise.reject(new Error('connection lost')),
    unknown: () => ({ status: 'unknown', serverTimeMs: host.serverNow() }),
  };
  const onSubmit = answer => { fake.respond.submitCommand = async command => answer(command); };
  const onLookup = answer => { fake.respond.lookupReceipt = async request => answer(request); };
  const frame = () => screen.getFrame();
  const card = () => frame().model.match?.privateArea.content?.actions.cards[0] ?? null;
  const html = () => toHtml(renderPlayerShell(frame().model));

  /** The Officer's phone on its own turn with the private panel open. */
  async function ready() {
    screen.start();
    await fake.connectWith(before.officer);
    screen.dispatch(TOGGLE);
  }
  /** Chooses Player 2 and waits out the double-tap guard, leaving the confirm step on screen. */
  async function toConfirm(seatId = 'seat-2') {
    screen.dispatch(OPEN);
    screen.dispatch(choose(seatId));
    await host.advance(GUARD);
  }
  return { host, fake, screen, frames, frame, card, html, answers, onSubmit, onLookup, ready, toConfirm, sent: () => fake.calls.submitCommand, looked: () => fake.calls.lookupReceipt };
}

test('available to registered by keyboard or tap alone: each step is focused on its own line and the result is spoken privately', async () => {
  const s = setup();
  await s.ready();
  assert.equal(s.card().status, 'available');
  assert.equal(s.frame().focus, null);
  const connected = s.frame().announcement;

  s.screen.dispatch(OPEN);
  assert.equal(s.card().status, 'targeting');
  assert.equal(s.card().selected, true);
  assert.deepEqual(s.card().body.targets.map(target => target.label), ['Player 2', 'Player 3', 'Player 4', 'Player 6']);
  assert.deepEqual(s.frame().focus, { seq: 1, targetId: SHELL_IDS.shotStep });
  assert.deepEqual(auditMarkup(renderPlayerShell(s.frame().model)), []);

  s.screen.dispatch(choose('seat-2'));
  assert.equal(s.card().status, 'confirming');
  assert.equal(s.card().body.prompt, 'Register a shot at Player 2?');
  // Focus is on the question, never on the control that would send the answer.
  assert.deepEqual(s.frame().focus, { seq: 2, targetId: SHELL_IDS.shotStep });
  assert.equal(s.frame().announcement, connected, 'Steps the player takes are read from focus, not announced');
  assert.equal(s.sent().length, 0);

  await s.host.advance(GUARD);
  s.onSubmit(s.answers.accepted);
  s.screen.dispatch(CONFIRM);
  assert.equal(s.card().status, 'submitting');
  assert.deepEqual(s.card().body, { step: 'busy', text: 'Sending your shot to the server…' });
  // Focus rests on the card title, which is not redrawn while the answer is awaited.
  assert.deepEqual(s.frame().focus, { seq: 3, targetId: SHELL_IDS.shotTitle });
  assert.deepEqual(s.frame().announcement, { seq: connected.seq + 1, politeness: 'polite', text: 'Sending your shot to the server…', private: true });
  assert.equal(s.sent().length, 1);

  await flush();
  assert.equal(s.card().status, 'registered');
  assert.equal(s.card().body.text, 'Shot at Player 2 registered.');
  assert.deepEqual(s.frame().announcement, { seq: connected.seq + 2, politeness: 'polite', text: 'Shot at Player 2 registered.', private: true });
  assert.deepEqual(s.frame().focus, { seq: 3, targetId: SHELL_IDS.shotTitle }, 'An answer from the server does not move focus');
  assert.deepEqual(auditMarkup(renderPlayerShell(s.frame().model)), []);

  // The player's own view catches up; the acknowledged card then follows it.
  await s.fake.deliver(listing(before.officer, s.sent()[0].commandId));
  s.screen.dispatch({ type: 'shot/dismiss' });
  assert.equal(s.card().status, 'registered');
  assert.deepEqual(s.card().body, { step: 'idle', open: null, reason: null, note: 'Your shot at Player 2 is registered. It is resolved at the end of the round.' });
  assert.deepEqual(s.frame().focus, { seq: 4, targetId: SHELL_IDS.shotStep });

  const [command] = s.sent();
  assert.deepEqual(RegisterShotSchema.parse(command), command);
  assert.deepEqual([command.matchId, command.phaseId, command.command.targetSeatId], [matchId, before.officer.phase.id, 'seat-2']);
  assert.equal(s.sent().length, 1);
  assert.equal(s.fake.calls.advanceIfExpired.length, 0, 'The client never tries to move the phase');
});

test('nothing is registered on screen until the server says so, and a registration is never drawn as an outcome', async () => {
  const s = setup();
  await s.ready();
  const publicFacts = () => structuredClone({ roster: s.frame().model.match.roster, location: s.frame().model.match.location });
  const untouched = publicFacts();
  let release;
  s.fake.respond.submitCommand = command => new Promise(resolve => { release = () => resolve(s.answers.accepted(command)); });
  await s.toConfirm();
  s.screen.dispatch(CONFIRM);
  for (let waited = 0; waited < 3; waited += 1) {
    await s.host.advance(1_000);
    assert.equal(s.card().status, 'submitting');
    assert.equal(/registered/i.test(s.html()), false, 'Asking is not the same as being registered');
  }
  release();
  await flush();
  assert.equal(s.card().status, 'registered');
  assert.match(s.html(), /This is not a result\./);
  // The registration changed no seat's health, location or status on this screen.
  assert.deepEqual(publicFacts(), untouched);
  assert.doesNotMatch(JSON.stringify(s.card()), /\b(hit|miss|damag|injur|eliminat|block|protect|wound)/i);
});

test('a shot intent does nothing where no shot control is on screen', async () => {
  const s = setup();
  // Before a match is showing.
  s.screen.dispatch(OPEN);
  s.screen.start();
  await s.fake.connectWith(before.officer);
  const closed = s.frame();
  // With the private panel closed there is no control it could have come from.
  for (const intent of [OPEN, choose('seat-2'), CONFIRM, { type: 'shot/back' }, { type: 'shot/check-again' }, { type: 'shot/dismiss' }]) s.screen.dispatch(intent);
  assert.equal(s.frame(), closed, 'Not even a redraw');
  s.screen.dispatch(TOGGLE);
  assert.equal(s.card().status, 'available', 'Nothing was started behind the closed panel');
  // Out of order: confirming before choosing, choosing a seat that was not offered.
  s.screen.dispatch(CONFIRM);
  s.screen.dispatch(choose('seat-2'));
  assert.equal(s.card().status, 'available');
  s.screen.dispatch(OPEN);
  s.screen.dispatch(choose('seat-9'));
  s.screen.dispatch(choose('seat-1'));
  assert.equal(s.card().status, 'targeting');
  assert.equal(s.sent().length, 0);

  // A result the player has not seen cannot be acknowledged from behind a closed panel, and
  // an unknown one cannot be re-checked from there either.
  const unseen = setup();
  await unseen.ready();
  unseen.onSubmit(unseen.answers.rejected('NOT_ALLOWED'));
  await unseen.toConfirm();
  unseen.screen.dispatch(CONFIRM);
  await flush();
  unseen.screen.dispatch(TOGGLE);
  unseen.screen.dispatch({ type: 'shot/dismiss' });
  unseen.screen.dispatch(TOGGLE);
  assert.equal(unseen.card().body.text, 'Not registered. The server did not allow this shot.', 'Still there to be read');
  const lost = setup();
  await lost.ready();
  lost.onSubmit(lost.answers.lost);
  lost.onLookup(lost.answers.lost);
  await lost.toConfirm();
  lost.screen.dispatch(CONFIRM);
  await flush();
  await lost.host.advance(FIRST + SECOND + THIRD);
  lost.screen.dispatch(TOGGLE);
  const asked = lost.looked().length;
  lost.screen.dispatch({ type: 'shot/check-again' });
  assert.equal(lost.looked().length, asked);
  lost.screen.dispatch(TOGGLE);
  assert.equal(lost.card().status, 'unknown');

  // The table display has no command at all, whatever it is told.
  const host = createFakeHost({ serverStart: SERVER_EPOCH });
  const fake = createFakeTransport(host, { audience: 'public' });
  const table = createTableScreen({ transport: fake.transport, matchId, ports: host.ports, host: { reload() {} } });
  table.start();
  await fake.connectWith(before.public);
  const tableFrame = table.getFrame();
  for (const intent of [OPEN, choose('seat-2'), CONFIRM]) table.dispatch(intent);
  assert.equal(table.getFrame(), tableFrame);
  assert.equal(fake.transport.submitCommand, undefined);
  assert.deepEqual(fake.calls.submitCommand, []);
});

test('two confirmations in a row, or a confirmation that is the tail of a double tap, send one command or none', async () => {
  const s = setup();
  await s.ready();
  s.onSubmit(s.answers.accepted);
  s.screen.dispatch(OPEN);
  s.screen.dispatch(choose('seat-2'));
  // The second tap of a double tap on the target lands on the confirm control that replaced it.
  s.screen.dispatch(CONFIRM);
  assert.equal(s.card().status, 'confirming');
  assert.equal(s.sent().length, 0);
  await s.host.advance(GUARD);
  s.screen.dispatch(CONFIRM);
  s.screen.dispatch(CONFIRM);
  s.screen.dispatch(CONFIRM);
  await flush();
  assert.equal(s.sent().length, 1);
  assert.deepEqual(s.host.issuedIds, ['command-1']);
});

test('backgrounding drops a choice that was not sent and takes everything private out of the frame', async () => {
  const s = setup();
  await s.ready();
  await s.toConfirm();
  const epoch = s.frame().privacyEpoch;
  s.screen.setPageVisible(false);
  assert.equal(s.frame().model.match.privateArea.content, null);
  assert.equal(s.frame().privacyEpoch, epoch + 1, 'The host is told to withdraw whatever private text it holds');
  for (const word of ['Officer', 'Shot', 'Player 2?', 'Register', 'ms-card']) assert.equal(s.html().includes(word), false, word);
  s.screen.setPageVisible(true);
  assert.equal(s.card(), null, 'Coming back does not reopen the panel');
  s.screen.dispatch(TOGGLE);
  assert.equal(s.card().status, 'available', 'The choice is gone, not waiting to be confirmed');
  s.screen.dispatch(CONFIRM);
  assert.equal(s.sent().length, 0);
});

test('a command in flight survives backgrounding; its result waits unseen and unspoken until the panel is opened again', async () => {
  const s = setup();
  await s.ready();
  let release;
  s.fake.respond.submitCommand = command => new Promise(resolve => { release = () => resolve(s.answers.accepted(command)); });
  await s.toConfirm();
  s.screen.dispatch(CONFIRM);
  const submitting = s.frame().announcement;
  assert.equal(submitting.private, true);

  s.screen.setPageVisible(false);
  // The private line that was just spoken leaves the frame with the panel.
  assert.equal(s.frame().announcement, null);
  release();
  await flush();
  assert.equal(s.frame().model.match.privateArea.content, null);
  assert.equal(s.frame().announcement, null, 'Nothing is spoken while nobody may be looking at the right screen');
  assert.equal(JSON.stringify(s.frame()).includes('egistered'), false);
  assert.equal(s.html().includes('egistered'), false);

  s.screen.setPageVisible(true);
  await flush();
  assert.equal(s.card(), null);
  assert.equal(s.frame().announcement, null, 'Returning says nothing about the command either');

  s.screen.dispatch(TOGGLE);
  assert.equal(s.card().status, 'registered');
  assert.deepEqual(s.frame().announcement, { seq: submitting.seq + 1, politeness: 'polite', text: 'Shot at Player 2 registered.', private: true });
  const said = s.frame().announcement;
  s.screen.dispatch(TOGGLE);
  s.screen.dispatch(TOGGLE);
  assert.equal(s.frame().announcement, null, 'Said once: reopening the panel again repeats nothing');
  assert.equal(said.seq > submitting.seq, true, 'A sequence number is never reused, so a host cannot mistake a new line for an old one');
  assert.equal(s.sent().length, 1);
});

test('closing the private panel withdraws private speech from the host, every time', async () => {
  const s = setup();
  await s.ready();
  s.onSubmit(s.answers.accepted);
  await s.toConfirm();
  s.screen.dispatch(CONFIRM);
  await flush();
  assert.equal(s.frame().announcement.private, true);
  const epoch = s.frame().privacyEpoch;
  s.screen.dispatch(TOGGLE);
  assert.equal(s.frame().privacyEpoch, epoch + 1);
  assert.equal(s.frame().announcement, null);
  assert.equal(JSON.stringify(s.frame()).includes('Player 2 registered'), false, 'Closed, the frame holds nothing private in any field');
  s.screen.dispatch(TOGGLE);
  assert.equal(s.frame().privacyEpoch, epoch + 1, 'Opening withdraws nothing');
  s.screen.dispatch(TOGGLE);
  assert.equal(s.frame().privacyEpoch, epoch + 2);
  // A recovery screen closes the panel too.
  s.screen.dispatch(TOGGLE);
  await s.fake.deliver({ ...structuredClone(before.officer), versions: { ...before.officer.versions, protocolVersion: 2 } });
  assert.equal(s.frame().model.screen, 'blocked');
  assert.equal(s.frame().privacyEpoch, epoch + 3);
});

test('a lost connection blocks new submissions and drops an unsent choice, without touching the last known state', async () => {
  const s = setup();
  await s.ready();
  await s.toConfirm();
  await s.fake.disconnect();
  assert.equal(s.frame().model.connection, 'stale');
  assert.equal(s.card().status, 'available');
  assert.deepEqual(s.card().body, { step: 'idle', open: null, reason: null, note: null });
  assert.equal(s.frame().model.match.privateArea.content.actions.notice, 'Actions are paused until the connection is restored.');
  for (const intent of [CONFIRM, OPEN, choose('seat-2')]) s.screen.dispatch(intent);
  assert.equal(s.sent().length, 0);
  // Reading and navigation stay: the role and the last known roster are still there.
  assert.equal(s.frame().model.match.privateArea.content.role.name, 'Officer');
  assert.equal(s.frame().model.match.roster.zones.length > 0, true);
  // Reconnected but not yet re-delivered is still not current.
  await s.fake.connect();
  s.screen.dispatch(OPEN);
  assert.equal(s.card().status, 'available');
  assert.equal(s.card().body.open, null);
  await s.fake.deliver(before.officer);
  assert.equal(s.card().body.open.intent, 'shot/open');
  s.screen.dispatch(OPEN);
  assert.equal(s.card().status, 'targeting', 'The choice was dropped; it is made again from the start');
});

test('an unanswered command is reconciled across a reconnect instead of being resent as something new', async () => {
  const s = setup();
  await s.ready();
  s.onSubmit(s.answers.lost);
  s.onLookup(s.answers.lost);
  await s.toConfirm();
  s.screen.dispatch(CONFIRM);
  await flush();
  assert.equal(s.card().status, 'checking');
  assert.equal(s.frame().announcement.text, 'Checking whether your shot was registered…');

  await s.fake.disconnect();
  assert.equal(s.card().status, 'checking', 'An unresolved command is not abandoned because the feed dropped');
  assert.equal(s.card().body.step, 'busy');
  assert.equal(s.html().includes('shot/open'), false);
  await s.host.advance(FIRST + SECOND + THIRD);
  assert.equal(s.card().status, 'unknown');
  assert.equal(s.frame().announcement.politeness, 'assertive');
  assert.match(s.frame().announcement.text, /Result unknown\. The app could not confirm whether your shot was registered\./);
  const asked = s.looked().length;

  // The same seat reconnects. The pending receipt is reconciled at once, by the same identifier.
  s.onLookup(s.answers.unknown);
  s.onSubmit(s.answers.accepted);
  await s.fake.connectWith(before.officer);
  assert.equal(s.looked().length, asked + 1);
  assert.equal(s.card().status, 'registered');
  assert.equal(s.sent().length, 2);
  assert.deepEqual(s.sent()[1], s.sent()[0]);
  assert.deepEqual(s.host.issuedIds, ['command-1']);
  assert.equal(s.frame().model.match.privateArea.content.role.name, 'Officer', 'Same seat, same role, nothing re-dealt');
});

test('Check again is one deliberate request; the card says plainly that the result is not known', async () => {
  const s = setup();
  await s.ready();
  s.onSubmit(s.answers.lost);
  s.onLookup(s.answers.lost);
  await s.toConfirm();
  s.screen.dispatch(CONFIRM);
  await flush();
  await s.host.advance(FIRST + SECOND + THIRD);
  assert.equal(s.card().statusLabel, 'Result unknown');
  assert.deepEqual(s.card().body.action, { id: 'ms-shot-check', label: 'Check again', intent: 'shot/check-again', primary: true });
  assert.deepEqual(auditMarkup(renderPlayerShell(s.frame().model)), []);

  const focusBefore = s.frame().focus.seq;
  const asked = s.looked().length;
  s.screen.dispatch({ type: 'shot/check-again' });
  assert.equal(s.card().status, 'checking');
  assert.deepEqual(s.frame().focus, { seq: focusBefore + 1, targetId: SHELL_IDS.shotTitle });
  assert.equal(s.looked().length, asked + 1);
  await flush();
  assert.equal(s.card().status, 'unknown');

  s.onLookup(request => ({ status: 'found', serverTimeMs: s.host.serverNow(), receipt: { protocolVersion: 1, matchId: request.matchId, phaseId: s.sent()[0].phaseId, commandId: request.commandId, status: 'rejected', code: 'PHASE_CLOSED' } }));
  s.screen.dispatch({ type: 'shot/check-again' });
  await flush();
  assert.equal(s.card().statusLabel, 'Not registered');
  assert.equal(s.card().body.text, 'Not registered. The turn had already ended.');
  assert.equal(s.sent().length, 1);
});

test('a rejection is shown and spoken at once; choosing again is a new command', async () => {
  const s = setup();
  await s.ready();
  s.onSubmit(s.answers.rejected('NOT_ALLOWED'));
  await s.toConfirm('seat-3');
  s.screen.dispatch(CONFIRM);
  await flush();
  assert.equal(s.card().status, 'not-registered');
  assert.equal(s.card().body.text, 'Not registered. The server did not allow this shot.');
  assert.deepEqual([s.frame().announcement.politeness, s.frame().announcement.text, s.frame().announcement.private], ['assertive', 'Not registered. The server did not allow this shot.', true]);
  assert.equal(s.html().includes('egistered.'), true);
  assert.equal(s.card().selected, false);

  s.screen.dispatch({ type: 'shot/dismiss' });
  assert.equal(s.card().status, 'available');
  // Back at the start, focus returns to the control that opens the flow.
  assert.equal(s.frame().focus.targetId, SHELL_IDS.shotOpen);
  s.onSubmit(s.answers.accepted);
  await s.toConfirm('seat-4');
  s.screen.dispatch(CONFIRM);
  await flush();
  assert.equal(s.card().body.text, 'Shot at Player 4 registered.');
  assert.deepEqual(s.sent().map(command => [command.commandId, command.command.targetSeatId]), [['command-1', 'seat-3'], ['command-2', 'seat-4']]);
});

test('when the turn’s clock runs out a choice is dropped and nothing can be sent; the phase is left to the server', async () => {
  const s = setup();
  await s.ready();
  await s.toConfirm();
  assert.equal(s.card().status, 'confirming');
  await s.host.advance(60_000);
  assert.equal(s.frame().model.match.phase.timer.state, 'expired');
  assert.equal(s.card().status, 'available');
  assert.equal(s.card().body.open, null);
  assert.equal(s.frame().model.match.privateArea.content.actions.notice, 'This phase has ended. Waiting for phase update.');
  for (const intent of [CONFIRM, OPEN]) s.screen.dispatch(intent);
  assert.equal(s.sent().length, 0);
  assert.equal(s.fake.calls.advanceIfExpired.length, 0);
  assert.equal(s.frame().model.match.phase.phaseLabel, 'Your turn', 'The same phase stays on screen until the server replaces it');
});

test('a confirmation made in the last moment is still the server’s to judge', async () => {
  const s = setup();
  await s.ready();
  await s.toConfirm();
  // One second left on the local estimate: the control is still there, and the request goes.
  await s.host.advance(60_000 - GUARD - 1_000);
  assert.equal(s.card().status, 'confirming');
  s.onSubmit(s.answers.rejected('PHASE_CLOSED'));
  s.screen.dispatch(CONFIRM);
  await flush();
  assert.equal(s.card().body.text, 'Not registered. The turn had already ended.');
});

test('the target list follows the view while the player is choosing', async () => {
  const s = setup();
  await s.ready();
  await s.toConfirm('seat-2');
  // Player 2 leaves the room while the confirmation is on screen.
  await s.fake.deliver(variant(before.officer, v => { v.viewRevision += 1; v.seats[1].location = 'Room B'; }));
  assert.equal(s.card().status, 'targeting');
  assert.deepEqual(s.card().body.targets.map(target => target.seatId), ['seat-3', 'seat-4', 'seat-6']);
  s.screen.dispatch(CONFIRM);
  assert.equal(s.sent().length, 0);
  // Somebody's public status changes: the list shows it, in the same words as the roster.
  await s.fake.deliver(variant(before.officer, v => { v.viewRevision += 2; v.seats[1].location = 'Room B'; v.seats[2].health = 'Injured'; }));
  assert.equal(s.card().body.targets[0].detail, 'Injured');
});

test('disposing the screen cancels what it was waiting for and leaves no timer behind', async () => {
  const s = setup();
  await s.ready();
  s.fake.respond.submitCommand = () => new Promise(() => {});
  await s.toConfirm();
  s.screen.dispatch(CONFIRM);
  assert.equal(s.host.pendingTimers() > 0, true);
  const count = s.frames.length;
  s.screen.dispose();
  assert.equal(s.host.pendingTimers(), 0);
  await s.host.advance(120_000);
  assert.equal(s.frames.length, count);
  assert.equal(s.looked().length, 0);
});
