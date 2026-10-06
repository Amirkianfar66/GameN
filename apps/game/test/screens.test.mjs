import assert from 'node:assert/strict';
import test from 'node:test';
import { PlayerViewSchema, PublicViewSchema, RoleSchema } from '@mothership/contracts';
import { createOfficerFixture } from '@mothership/contracts/fixtures';
import { createPlayerScreen, createTableScreen } from '@mothership/game';
import { renderPlayerShell, renderTableShell, toHtml } from '@mothership/presentation';
import { auditMarkup } from '../../../packages/presentation/test/support/markup-audit.mjs';
import { createFakeHost, createFakeTransport, flush } from './support/fakes.mjs';

const { before, afterRegistration } = createOfficerFixture('protected');
const matchId = before.public.matchId;
const SERVER_EPOCH = before.public.phase.startedAt;
const TOGGLE = { type: 'private/toggle' };

/** Frontend-authored synthetic variations, each still valid against the contract schema. */
function variant(view, change) {
  const copy = structuredClone(view);
  change(copy);
  return ('self' in copy ? PlayerViewSchema : PublicViewSchema).parse(copy);
}
const nextTurn = (view, startedAt) => variant(view, v => {
  v.viewRevision += 1;
  v.phase = { id: 'phase-b', kind: 'ORDINARY_TURN', startedAt, endsAt: startedAt + 60_000 };
  v.activeSeatId = 'seat-2';
});
const resolution = view => variant(view, v => {
  v.viewRevision += 2;
  v.phase = { id: 'phase-c', kind: 'ROUND_RESOLUTION', startedAt: v.phase.endsAt, endsAt: null };
  v.activeSeatId = null;
});
const otherProtocol = view => ({ ...structuredClone(view), versions: { ...view.versions, protocolVersion: 2 } });

function setup(surface, hostOptions = {}) {
  const host = createFakeHost({ serverStart: SERVER_EPOCH, ...hostOptions });
  const fake = createFakeTransport(host, { audience: surface === 'player' ? 'player' : 'public' });
  let reloads = 0;
  const create = surface === 'player' ? createPlayerScreen : createTableScreen;
  const screen = create({ transport: fake.transport, matchId, ports: host.ports, host: { reload: () => { reloads += 1; } } });
  const frames = [];
  screen.subscribe(() => frames.push(screen.getFrame()));
  return { host, fake, screen, frames, reloads: () => reloads };
}
const timer = screen => screen.getFrame().model.match.phase.timer;
const spoken = screen => screen.getFrame().announcement?.text ?? null;
const privateArea = screen => screen.getFrame().model.match.privateArea;

test('before it starts a screen shows that it is connecting and asks the transport for nothing', () => {
  const { fake, screen } = setup('player');
  assert.equal(screen.getFrame().model.screen, 'connecting');
  assert.equal(screen.getFrame().announcement, null);
  assert.equal(screen.getFrame().focus, null);
  assert.equal(fake.calls.subscribe, 0);
});

test('the Officer phone goes from connecting to its own turn with a full minute on the clock and nothing private showing', async () => {
  const { fake, screen } = setup('player');
  screen.start();
  await fake.connectWith(before.officer);
  const { model, announcement } = screen.getFrame();
  assert.equal(model.screen, 'match');
  assert.equal(model.title, 'Mothership — Player 1');
  assert.equal(model.match.phase.phaseLabel, 'Your turn');
  assert.deepEqual(timer(screen), { state: 'running', display: '1:00', spoken: '60 seconds remaining', finalSeconds: false });
  assert.deepEqual(announcement, { seq: 1, politeness: 'polite', text: 'Connected. Round 2. Your turn.' });
  assert.equal(model.match.privateArea.open, false);
  assert.equal(model.match.privateArea.content, null);
  assert.deepEqual(auditMarkup(renderPlayerShell(model)), []);
});

test('the countdown follows server time second by second, warns once, and stops at zero', async () => {
  const { host, fake, screen, frames } = setup('player');
  screen.start();
  await fake.connectWith(before.officer);
  screen.dispatch(TOGGLE);
  const shown = [];
  const said = [];
  for (let second = 0; second < 60; second += 1) {
    await host.advance(1_000);
    shown.push(timer(screen).state === 'running' ? timer(screen).display : timer(screen).state);
    const text = spoken(screen);
    if (text !== said.at(-1)) said.push(text);
  }
  assert.deepEqual(shown.slice(0, 3), ['0:59', '0:58', '0:57']);
  assert.deepEqual(shown.slice(48), ['0:11', '0:10', '0:09', '0:08', '0:07', '0:06', '0:05', '0:04', '0:03', '0:02', '0:01', 'expired']);
  assert.deepEqual(said, ['Connected. Round 2. Your turn.', '10 seconds left.', 'Time is up. Waiting for phase update.']);
  assert.deepEqual(timer(screen), { state: 'expired', display: '0:00', spoken: 'Time is up', note: 'Waiting for phase update' });
  assert.equal(privateArea(screen).content.actions.notice, 'This phase has ended. Waiting for phase update.');
  assert.equal(host.pendingTimers(), 0, 'Nothing keeps ticking after zero');

  // Reaching zero changes nothing by itself: the same phase is shown until the server moves on.
  const before60 = frames.length;
  await host.advance(30_000);
  assert.equal(frames.length, before60);
  assert.equal(screen.getFrame().model.match.phase.phaseLabel, 'Your turn');
  assert.deepEqual([fake.calls.advanceIfExpired, fake.calls.submitCommand], [[], []]);
});

test('the device clock has no say: the same countdown appears whatever the local time origin is', async () => {
  for (const localStart of [0, 7_777, 1_900_000_000_000]) {
    const { host, fake, screen } = setup('table', { localStart });
    screen.start();
    await fake.connectWith(before.public);
    await host.advance(17_250);
    assert.equal(timer(screen).display, '0:43', String(localStart));
  }
});

test('joining late shows the time that is actually left, or that the phase has run out', async () => {
  const late = setup('table', { serverStart: SERVER_EPOCH + 48_500 });
  late.screen.start();
  await late.fake.connectWith(before.public);
  assert.equal(timer(late.screen).display, '0:12');
  const over = setup('table', { serverStart: SERVER_EPOCH + 61_000 });
  over.screen.start();
  await over.fake.connectWith(before.public);
  assert.equal(timer(over.screen).state, 'expired');
  assert.equal(spoken(over.screen), 'Connected. Round 2. Player 1’s turn. Time is up. Waiting for phase update.');
  assert.equal(over.host.pendingTimers(), 0);
});

test('a player who joins in the last seconds of their own turn is warned, whichever arrives first', async () => {
  // The time measurement completes before the first view (the usual order here).
  const first = setup('player', { serverStart: SERVER_EPOCH + 52_000 });
  first.screen.start();
  await first.fake.connectWith(before.officer);
  assert.equal(spoken(first.screen), 'Connected. Round 2. Your turn. 8 seconds left.');

  // The view arrives while the time request is still in flight.
  const second = setup('player', { serverStart: SERVER_EPOCH + 52_000 });
  let answerTime;
  second.fake.respond.serverTime = () => new Promise(resolve => { answerTime = resolve; });
  second.screen.start();
  await second.fake.connectWith(before.officer);
  assert.equal(spoken(second.screen), 'Connected. Round 2. Your turn.');
  assert.equal(timer(second.screen).state, 'syncing');
  answerTime({ protocolVersion: 1, serverTimeMs: second.host.serverNow() });
  await flush();
  assert.equal(spoken(second.screen), '8 seconds left.');
});

test('only an authoritative view moves the phase on, and the next turn gets its own full minute', async () => {
  const { host, fake, screen } = setup('player');
  screen.start();
  await fake.connectWith(before.officer);
  screen.dispatch(TOGGLE);
  await host.advance(75_000);
  assert.equal(timer(screen).state, 'expired');
  // The server opens the next turn late; that turn still runs its whole minute from then.
  await fake.deliver(nextTurn(before.officer, host.serverNow()));
  assert.equal(screen.getFrame().model.match.phase.phaseLabel, 'Player 2’s turn');
  assert.equal(timer(screen).display, '1:00');
  assert.equal(spoken(screen), 'Round 2. Player 2’s turn.');
  assert.equal(privateArea(screen).content.actions.notice, null);
  await host.advance(1_000);
  assert.equal(timer(screen).display, '0:59');
});

test('round resolution shows no timer and schedules nothing', async () => {
  const { host, fake, screen } = setup('table');
  screen.start();
  await fake.connectWith(before.public);
  await fake.deliver(resolution(before.public));
  assert.deepEqual(timer(screen), { state: 'none', spoken: 'This phase has no timer' });
  assert.equal(screen.getFrame().model.match.phase.phaseLabel, 'Round resolution');
  assert.equal(host.pendingTimers(), 0);
  assert.deepEqual(auditMarkup(renderTableShell(screen.getFrame().model)), []);
});

test('private information is shown only on request and is withdrawn the moment the app is backgrounded', async () => {
  const { host, fake, screen } = setup('player');
  const html = () => toHtml(renderPlayerShell(screen.getFrame().model));
  screen.start();
  await fake.connectWith(before.officer);
  assert.equal(privateArea(screen).content, null);
  for (const word of ['Officer', 'Available', 'Shot']) assert.equal(html().includes(word), false, word);

  screen.dispatch(TOGGLE);
  assert.deepEqual(privateArea(screen).content.role, { label: 'Your role', name: 'Officer' });
  assert.equal(privateArea(screen).content.actions.cards[0].statusLabel, 'Available');
  screen.dispatch(TOGGLE);
  assert.equal(privateArea(screen).content, null);
  screen.dispatch(TOGGLE);

  const timeCalls = fake.calls.serverTime;
  screen.setPageVisible(false);
  const hidden = screen.getFrame().model;
  assert.equal(hidden.match.privateArea.open, false);
  assert.equal(hidden.match.privateArea.content, null);
  for (const word of ['Officer', 'Available', 'Shot']) assert.equal(JSON.stringify(hidden).includes(word), false, word);
  assert.equal(host.pendingTimers(), 0, 'Nothing is redrawn while hidden');
  screen.dispatch(TOGGLE);
  assert.equal(privateArea(screen).content, null, 'Cannot be opened while hidden');

  screen.setPageVisible(true);
  await flush();
  assert.equal(privateArea(screen).open, false, 'It does not reopen by itself');
  assert.equal(privateArea(screen).content, null);
  assert.equal(fake.calls.serverTime, timeCalls + 1, 'Time is re-measured on return');
  screen.dispatch(TOGGLE);
  assert.equal(privateArea(screen).content.role.name, 'Officer', 'It opens again when asked');
});

test('time that passed in the background is accounted for on return, and its expiry is spoken once', async () => {
  const { host, fake, screen } = setup('player');
  screen.start();
  await fake.connectWith(before.officer);
  await host.advance(5_000);
  screen.setPageVisible(false);
  host.sleepDevice(35_000);
  screen.setPageVisible(true);
  assert.equal(timer(screen).state, 'syncing', 'Not a stale number while re-measuring');
  await flush();
  assert.equal(timer(screen).display, '0:20');
  screen.setPageVisible(false);
  host.sleepDevice(30_000);
  screen.setPageVisible(true);
  await flush();
  assert.equal(timer(screen).state, 'expired');
  assert.equal(spoken(screen), 'Time is up. Waiting for phase update.');
  const announced = screen.getFrame().announcement.seq;

  // Further trips to the background, and a dropped feed, do not announce the same expiry again.
  for (let trip = 0; trip < 3; trip += 1) {
    screen.setPageVisible(false);
    screen.setPageVisible(true);
    await flush();
  }
  assert.equal(screen.getFrame().announcement.seq, announced);
  await fake.disconnect();
  await fake.connectWith(before.officer);
  assert.equal(spoken(screen), 'Reconnected. Round 2. Your turn.');
  assert.equal(screen.getFrame().announcement.seq, announced + 2, 'connection lost, then reconnected; no third expiry');
  assert.equal(timer(screen).state, 'expired');
});

test('losing the connection keeps the screen readable, says so, and recovers without replaying anything', async () => {
  const { host, fake, screen } = setup('player');
  screen.start();
  await fake.connectWith(before.officer);
  screen.dispatch(TOGGLE);
  await host.advance(4_000);
  await fake.disconnect();
  let model = screen.getFrame().model;
  assert.equal(model.screen, 'match');
  assert.equal(model.connection, 'stale');
  assert.deepEqual(model.banners.map(banner => banner.variant), ['fixture', 'stale']);
  assert.equal(model.match.privateArea.content.actions.notice, 'Actions are paused until the connection is restored.');
  assert.equal(model.match.location.name, 'Room A');
  assert.equal(spoken(screen), 'Connection lost. Showing the last known state.');
  await host.advance(2_000);
  assert.equal(timer(screen).display, '0:54', 'The last known deadline keeps counting');
  assert.deepEqual(auditMarkup(renderPlayerShell(screen.getFrame().model)), []);

  await fake.connect();
  assert.equal(screen.getFrame().model.connection, 'stale');
  await fake.deliver(nextTurn(afterRegistration.officer, host.serverNow()));
  model = screen.getFrame().model;
  assert.equal(model.connection, 'live');
  assert.deepEqual(model.banners.map(banner => banner.variant), ['fixture']);
  assert.equal(spoken(screen), 'Reconnected. Round 2. Player 2’s turn.');
  assert.equal(model.title, 'Mothership — Player 1', 'Same seat');
  assert.equal(model.match.privateArea.content.role.name, 'Officer', 'Same role');
});

test('the reconnect control resubscribes and the reload control is left to the host', async () => {
  const { fake, screen, reloads } = setup('table');
  screen.start();
  await fake.connectWith(before.public);
  await fake.disconnect();
  screen.dispatch({ type: 'session/reconnect' });
  assert.deepEqual([fake.calls.subscribe, fake.calls.unsubscribe], [2, 1]);
  assert.equal(screen.getFrame().model.connection, 'stale');
  screen.dispatch({ type: 'app/reload' });
  assert.equal(reloads(), 1);
});

test('an incompatible protocol replaces the match with a recoverable screen and moves focus to it once', async () => {
  const { host, fake, screen, frames } = setup('player');
  screen.start();
  await fake.connectWith(before.officer);
  screen.dispatch(TOGGLE);
  await fake.deliver(otherProtocol(afterRegistration.officer));
  const frame = screen.getFrame();
  assert.equal(frame.model.screen, 'blocked');
  assert.equal(frame.model.match, null);
  assert.equal(frame.model.blocked.heading, 'Update required');
  assert.deepEqual(frame.focus, { seq: 1, targetId: 'ms-blocked-heading' });
  assert.deepEqual(frame.announcement, { seq: 2, politeness: 'assertive', text: 'Update required.' });
  assert.equal(JSON.stringify(frame.model).includes('Officer'), false);
  assert.deepEqual(auditMarkup(renderPlayerShell(frame.model)), []);

  // While blocked, time passing and repeated bad payloads cause no redraw, no timer and no
  // second request for focus: the heading would otherwise be re-focused every second.
  const drawn = frames.length;
  assert.equal(host.pendingTimers(), 0);
  await host.advance(5_000);
  await fake.deliver(otherProtocol(afterRegistration.officer));
  await host.advance(5_000);
  assert.equal(frames.length, drawn);
  assert.equal(screen.getFrame(), frame);
  assert.deepEqual(screen.getFrame().focus, { seq: 1, targetId: 'ms-blocked-heading' });
  // A legitimate redraw of the blocked screen (its settings changed) must not pull focus
  // back to the heading from wherever the player has moved it.
  screen.dispatch({ type: 'settings/reduce-motion', checked: true });
  screen.setPageVisible(false);
  screen.setPageVisible(true);
  await flush();
  assert.equal(frames.length > drawn, true);
  assert.equal(screen.getFrame().model.screen, 'blocked');
  assert.deepEqual(screen.getFrame().focus, { seq: 1, targetId: 'ms-blocked-heading' });

  await fake.deliver(afterRegistration.officer);
  assert.equal(screen.getFrame().model.screen, 'match');
  assert.deepEqual(screen.getFrame().focus, { seq: 1, targetId: 'ms-blocked-heading' }, 'Leaving the screen does not ask for focus again');
  assert.equal(privateArea(screen).open, false, 'A panel that was open before the interruption does not reopen by itself');
  assert.equal(JSON.stringify(screen.getFrame().model).includes('Officer'), false);
  screen.dispatch(TOGGLE);
  assert.equal(privateArea(screen).content.role.name, 'Officer', 'It opens again when asked');

  // A second, separate interruption asks for focus again.
  await fake.deliver(otherProtocol(afterRegistration.officer));
  assert.deepEqual(screen.getFrame().focus, { seq: 2, targetId: 'ms-blocked-heading' });
});

test('data for another seat blocks the phone for good and shows none of it', async () => {
  const { fake, screen } = setup('player');
  screen.start();
  await fake.connectWith(before.officer);
  screen.dispatch(TOGGLE);
  await fake.deliver(before.target);
  const { model } = screen.getFrame();
  assert.equal(model.screen, 'blocked');
  assert.equal(model.blocked.heading, 'Match data check failed');
  for (const role of RoleSchema.options) assert.equal(JSON.stringify(model).includes(role), false, role);
  await fake.deliver(afterRegistration.officer);
  assert.equal(screen.getFrame().model.screen, 'blocked');
});

test('the motion preference follows the device until the player chooses, then stays chosen', async () => {
  const { fake, screen } = setup('table');
  const setting = () => screen.getFrame().model.settings.reduceMotion;
  screen.start();
  await fake.connectWith(before.public);
  assert.deepEqual([screen.getFrame().model.motion, setting().checked, setting().hint], ['full', false, 'Follows this device’s setting.']);
  screen.setDeviceReducedMotion(true);
  assert.deepEqual([screen.getFrame().model.motion, setting().checked, setting().hint], ['reduced', true, 'On because this device asks for reduced motion.']);
  screen.dispatch({ type: 'settings/reduce-motion', checked: false });
  assert.deepEqual([screen.getFrame().model.motion, setting().checked, setting().hint], ['full', false, 'Set on this device for this session.']);
  screen.setDeviceReducedMotion(false);
  screen.setDeviceReducedMotion(true);
  assert.equal(screen.getFrame().model.motion, 'full');
  screen.dispatch({ type: 'settings/reduce-motion', checked: true });
  assert.equal(screen.getFrame().model.motion, 'reduced');
});

test('the table display has no private state to show and ignores private intents', async () => {
  const { fake, screen, frames } = setup('table');
  screen.start();
  await fake.connectWith(before.public);
  const { model } = screen.getFrame();
  assert.equal(model.surface, 'table');
  assert.equal(model.title, 'Mothership — Table display');
  assert.equal(model.match.phase.phaseLabel, 'Player 1’s turn');
  assert.equal('privateArea' in model.match, false);
  for (const role of RoleSchema.options) assert.equal(JSON.stringify(model).includes(role), false, role);
  const count = frames.length;
  screen.dispatch(TOGGLE);
  assert.equal(frames.length, count);
  assert.deepEqual(auditMarkup(renderTableShell(model)), []);
});

test('a hidden registration does not even redraw the table or the target phone', async () => {
  const table = setup('table');
  table.screen.start();
  await table.fake.connectWith(before.public);
  const tableFrame = table.screen.getFrame();
  const tableFrames = table.frames.length;
  await table.fake.deliver(afterRegistration.public);
  assert.equal(table.screen.getFrame(), tableFrame);
  assert.equal(table.frames.length, tableFrames);

  const target = setup('player');
  target.screen.start();
  await target.fake.connectWith(before.target);
  target.screen.dispatch(TOGGLE);
  const targetFrame = target.screen.getFrame();
  await target.fake.deliver(afterRegistration.target);
  assert.equal(target.screen.getFrame(), targetFrame);

  // The registering phone redraws only if its private panel is open, and says nothing either way.
  const closed = setup('player');
  closed.screen.start();
  await closed.fake.connectWith(before.officer);
  const closedFrame = closed.screen.getFrame();
  await closed.fake.deliver(afterRegistration.officer);
  assert.equal(closed.screen.getFrame(), closedFrame, 'closed panel: the new view changes nothing on screen');

  const open = setup('player');
  open.screen.start();
  await open.fake.connectWith(before.officer);
  open.screen.dispatch(TOGGLE);
  const said = open.screen.getFrame().announcement;
  await open.fake.deliver(afterRegistration.officer);
  assert.equal(privateArea(open.screen).content.actions.cards[0].statusLabel, 'Not available');
  assert.equal(open.screen.getFrame().announcement, said, 'Nothing is spoken by a snapshot alone');
});

test('a frame keeps its identity until something changes, and listeners hear of real changes only', async () => {
  const { host, fake, screen, frames } = setup('table');
  screen.start();
  await fake.connectWith(before.public);
  const frame = screen.getFrame();
  assert.equal(screen.getFrame(), frame);
  await host.advance(400);
  assert.equal(screen.getFrame(), frame, 'No redraw between whole seconds');
  const count = frames.length;
  await host.advance(600);
  assert.equal(frames.length, count + 1);
  assert.notEqual(screen.getFrame(), frame);

  // Input that changes nothing on screen tells nobody: the same setting, an ignored intent,
  // a repeated view.
  const settled = screen.getFrame();
  const heard = frames.length;
  screen.setDeviceReducedMotion(false);
  screen.dispatch({ type: 'settings/reduce-motion', checked: false });
  screen.dispatch({ type: 'settings/reduce-motion', checked: false });
  await fake.deliver(before.public);
  assert.equal(frames.length, heard + 1, 'only the first explicit choice changed the screen (its hint)');
  assert.notEqual(screen.getFrame(), settled);
});

test('dispose releases the feed, every timer and every listener', async () => {
  const { host, fake, screen, frames } = setup('player');
  screen.start();
  await fake.connectWith(before.officer);
  await host.advance(3_000);
  assert.equal(host.pendingTimers() > 0, true);
  const frame = screen.getFrame();
  const count = frames.length;
  screen.dispose();
  screen.dispose();
  assert.deepEqual([fake.subscribers(), fake.calls.unsubscribe, host.pendingTimers()], [0, 1, 0]);
  screen.dispatch(TOGGLE);
  screen.setPageVisible(false);
  screen.setDeviceReducedMotion(true);
  screen.start();
  await host.advance(120_000);
  assert.equal(screen.getFrame(), frame);
  assert.equal(frames.length, count);
  assert.equal(fake.calls.subscribe, 1);
});
