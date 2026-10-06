import assert from 'node:assert/strict';
import test from 'node:test';
import { PlayerViewSchema, PublicViewSchema } from '@mothership/contracts';
import { createOfficerFixture } from '@mothership/contracts/fixtures';
import { createPlayerScreen, createPlayerSession, createTableScreen, DEFAULT_SHOT_FLOW_TIMING } from '@mothership/game';
import { createFakeHost, createFakeTransport } from './support/fakes.mjs';

// Cues as a screen issues them: views and events in, frames out, against a transport whose
// every delivery the test scripts. The events are frontend-authored and synthetic, apart
// from the one authored registration event. No fixture scenario and no rule is involved.

const { before, afterRegistration } = createOfficerFixture('protected');
const matchId = before.public.matchId;
const SERVER_EPOCH = before.public.phase.startedAt;
const TOGGLE = { type: 'private/toggle' };
const registrationEvent = afterRegistration.officerEvents[0];
const COMMAND = registrationEvent.fact.commandId;

function variant(view, change) {
  const copy = structuredClone(view);
  change(copy);
  return ('self' in copy ? PlayerViewSchema : PublicViewSchema).parse(copy);
}
/** The view one revision on, in the next phase, with whatever else a test changes. */
const next = (view, phaseId, change = () => {}) => variant(view, v => {
  v.viewRevision += 1;
  v.phase = { ...v.phase, id: phaseId };
  change(v);
});
let eventNumber = 0;
const eventFor = (view, fact) => ({ protocolVersion: 1, matchId, eventId: `event-${++eventNumber}`, audience: view.audience, viewRevision: view.viewRevision, fact });
const phaseChanged = view => eventFor(view, { type: 'PHASE_CHANGED', phaseId: view.phase.id });

function setup(surface) {
  const host = createFakeHost({ serverStart: SERVER_EPOCH });
  const fake = createFakeTransport(host, { audience: surface === 'player' ? 'player' : 'public' });
  const create = surface === 'player' ? createPlayerScreen : createTableScreen;
  const screen = create({ transport: fake.transport, matchId, ports: host.ports, host: { reload() {} } });
  const frames = [];
  screen.subscribe(() => frames.push(screen.getFrame()));
  const cues = () => screen.getFrame().cues;
  const kinds = () => cues().map(item => item.cue.kind);
  return { host, fake, screen, frames, cues, kinds, frame: () => screen.getFrame() };
}

test('before anything has happened a frame carries no cue', async () => {
  for (const [surface, view] of [['table', before.public], ['player', before.officer]]) {
    const s = setup(surface);
    assert.deepEqual([s.frame().cues, s.frame().privateCues], [[], []]);
    s.screen.start();
    await s.fake.connectWith(view);
    assert.deepEqual([s.frame().cues, s.frame().privateCues], [[], []], 'The first view is where things stand, not news');
  }
});

test('a public event is a numbered cue in the very frame that shows its fact, whichever arrives first', async () => {
  for (const [surface, view] of [['table', before.public], ['player', before.target]]) {
    const turn = next(view, 'phase-b', v => { v.activeSeatId = 'seat-2'; });

    const viewFirst = setup(surface);
    viewFirst.screen.start();
    await viewFirst.fake.connectWith(view);
    await viewFirst.fake.deliver(turn);
    assert.deepEqual(viewFirst.cues(), [], 'The view alone is no reason for emphasis');
    await viewFirst.fake.deliverEvent(phaseChanged(turn));
    assert.deepEqual(viewFirst.cues(), [{ seq: 1, cue: { kind: 'phase-change' } }]);

    const eventFirst = setup(surface);
    eventFirst.screen.start();
    await eventFirst.fake.connectWith(view);
    const count = eventFirst.frames.length;
    await eventFirst.fake.deliverEvent(phaseChanged(turn));
    assert.equal(eventFirst.frames.length, count, 'An event ahead of the screen draws nothing');
    await eventFirst.fake.deliver(turn);
    const shown = eventFirst.frames.find(frame => frame.cues.length > 0);
    assert.deepEqual(shown.cues, [{ seq: 1, cue: { kind: 'phase-change' } }]);
    assert.match(shown.model.match.phase.phaseLabel, surface === 'player' ? /^Your turn$/ : /^Player 2’s turn$/, 'The same frame already shows the new phase');
    assert.deepEqual(eventFirst.frame().privateCues, []);
  }
});

test('cue numbers only go up, and a frame keeps its cues until newer ones replace them', async () => {
  const s = setup('table');
  s.screen.start();
  await s.fake.connectWith(before.public);
  const second = next(before.public, 'phase-b', v => { v.seats[2].location = 'Room B'; v.seats[3].health = 'Injured'; });
  await s.fake.deliver(second);
  await s.fake.deliverEvent(phaseChanged(second));
  const first = s.cues();
  assert.deepEqual(first.map(item => item.seq), [1]);
  // A countdown tick redraws the screen and leaves the cues exactly as they were.
  await s.host.advance(1_000);
  assert.equal(s.cues(), first);

  // Two more events for the view on screen, one at a time.
  await s.fake.deliverEvent(eventFor(second, { type: 'PUBLIC_MOVE', seatId: 'seat-3', from: 'Room A', to: 'Room B' }));
  assert.deepEqual(s.cues(), [{ seq: 2, cue: { kind: 'public-move', seatId: 'seat-3', from: 'Room A', to: 'Room B' } }]);
  await s.fake.deliverEvent(eventFor(second, { type: 'PUBLIC_HEALTH_CHANGED', seatId: 'seat-4', health: 'Injured' }));
  assert.deepEqual(s.cues(), [{ seq: 3, cue: { kind: 'status-change', seatId: 'seat-4', health: 'Injured' } }]);

  // Several events that were waiting for one view come out together, in stream order.
  const third = next(second, 'phase-c', v => { v.round += 1; v.seats[6].location = 'Hospital'; });
  await s.fake.deliverEvent(eventFor(third, { type: 'PUBLIC_MOVE', seatId: 'seat-7', from: 'Room B', to: 'Hospital' }));
  await s.fake.deliverEvent(phaseChanged(third));
  await s.fake.deliver(third);
  assert.deepEqual(s.cues(), [
    { seq: 4, cue: { kind: 'public-move', seatId: 'seat-7', from: 'Room B', to: 'Hospital' } },
    { seq: 5, cue: { kind: 'round-transition', round: before.public.round + 1 } },
  ]);
});

test('a cue schedules nothing and holds nothing up: input is taken in the same instant', async () => {
  const s = setup('player');
  s.screen.start();
  await s.fake.connectWith(before.officer);
  const moved = variant(before.officer, v => { v.viewRevision += 1; v.seats[2].location = 'Room B'; });
  await s.fake.deliver(moved);
  const timers = s.host.pendingTimers();
  await s.fake.deliverEvent(eventFor(moved, { type: 'PUBLIC_MOVE', seatId: 'seat-3', from: 'Room A', to: 'Room B' }));
  assert.deepEqual(s.kinds(), ['public-move']);
  assert.equal(s.host.pendingTimers(), timers, 'No timer belongs to a cue');

  // The player opens the panel and starts a shot with the cue still in the frame.
  s.screen.dispatch(TOGGLE);
  s.screen.dispatch({ type: 'shot/open' });
  const card = s.frame().model.match.privateArea.content.actions.cards[0];
  assert.equal(card.status, 'targeting');
  assert.deepEqual(card.body.targets.map(target => target.label), ['Player 2', 'Player 4', 'Player 6'], 'And the targets offered already follow the new view');
  assert.deepEqual(s.kinds(), ['public-move']);
});

test('an event delivered again is not played again', async () => {
  const s = setup('table');
  s.screen.start();
  await s.fake.connectWith(before.public);
  const turn = next(before.public, 'phase-b');
  const event = phaseChanged(turn);
  await s.fake.deliverEvent(event);
  await s.fake.deliverEvent(event);
  await s.fake.deliver(turn);
  assert.deepEqual(s.cues().map(item => item.seq), [1]);
  const frame = s.frame();
  const count = s.frames.length;
  await s.fake.deliverEvent(event);
  await s.fake.deliver(turn);
  await s.fake.deliverEvent(structuredClone(event));
  assert.equal(s.frame(), frame);
  assert.equal(s.frames.length, count, 'A repeat does not even redraw');
});

test('reconnecting replays nothing: what the stream still holds is history', async () => {
  const s = setup('table');
  s.screen.start();
  await s.fake.connectWith(before.public);
  const second = next(before.public, 'phase-b');
  const third = next(second, 'phase-c', v => { v.seats[2].location = 'Room B'; });
  const stream = [phaseChanged(second), phaseChanged(third), eventFor(third, { type: 'PUBLIC_MOVE', seatId: 'seat-3', from: 'Room A', to: 'Room B' })];
  await s.fake.deliver(second);
  await s.fake.deliverEvent(stream[0]);
  assert.deepEqual(s.cues().map(item => item.seq), [1]);
  const played = s.cues();

  // The feed drops. The match moves on to the third view meanwhile, and on return the
  // stream delivers everything it holds, old and missed alike, before and after the view.
  await s.fake.disconnect();
  await s.fake.connect();
  await s.fake.deliverEvent(stream[0]);
  await s.fake.deliverEvent(stream[1]);
  await s.fake.deliver(third);
  await s.fake.deliverEvent(stream[2]);
  for (const event of stream) await s.fake.deliverEvent(event);
  assert.equal(s.frame().model.connection, 'live');
  assert.equal(s.cues(), played, 'Nothing was played for what happened while away');

  // What happens from here on is played as before.
  const fourth = next(third, 'phase-d');
  await s.fake.deliver(fourth);
  await s.fake.deliverEvent(phaseChanged(fourth));
  assert.deepEqual(s.cues(), [{ seq: 2, cue: { kind: 'phase-change' } }]);
});

test('the reconnect control and a view the feed cannot vouch for play nothing either', async () => {
  const s = setup('table');
  s.screen.start();
  await s.fake.connectWith(before.public);
  const second = next(before.public, 'phase-b');
  // A view that arrives while the feed reports itself down is kept but not called current.
  await s.fake.disconnect();
  await s.fake.deliverEvent(phaseChanged(second));
  await s.fake.deliver(second);
  assert.equal(s.frame().model.connection, 'stale');
  assert.deepEqual(s.cues(), []);
  await s.fake.connectWith(second);
  assert.deepEqual(s.cues(), []);

  s.screen.dispatch({ type: 'session/reconnect' });
  const third = next(second, 'phase-c');
  await s.fake.deliverEvent(phaseChanged(third));
  await s.fake.connectWith(third);
  assert.deepEqual(s.cues(), [], 'The first view of the new subscription is where things stand');
});

test('an unreadable update pauses cues until a readable view says where things stand', async () => {
  const s = setup('table');
  s.screen.start();
  await s.fake.connectWith(before.public);
  await s.fake.deliver({ note: 'not a view' });
  assert.equal(s.frame().model.banners.some(banner => banner.variant === 'unreadable'), true);
  const second = next(before.public, 'phase-b');
  await s.fake.deliverEvent(phaseChanged(second));
  await s.fake.deliver(second);
  assert.deepEqual(s.cues(), [], 'Whatever was missed in between is not replayed');
  const third = next(second, 'phase-c');
  await s.fake.deliver(third);
  await s.fake.deliverEvent(phaseChanged(third));
  assert.deepEqual(s.kinds(), ['phase-change']);
});

test('nothing is emphasized that nobody is looking at, and it is not kept for later', async () => {
  // In the background.
  const hidden = setup('player');
  hidden.screen.start();
  await hidden.fake.connectWith(before.target);
  hidden.screen.setPageVisible(false);
  const second = next(before.target, 'phase-b');
  await hidden.fake.deliver(second);
  await hidden.fake.deliverEvent(phaseChanged(second));
  assert.deepEqual(hidden.cues(), []);
  hidden.screen.setPageVisible(true);
  await hidden.host.advance(5_000);
  assert.deepEqual(hidden.cues(), [], 'Coming back plays nothing that was missed');
  const third = next(second, 'phase-c');
  await hidden.fake.deliver(third);
  await hidden.fake.deliverEvent(phaseChanged(third));
  assert.deepEqual(hidden.kinds(), ['phase-change'], 'The next change in front of the player is played');

  // Behind a recovery screen.
  const blocked = setup('table');
  blocked.screen.start();
  await blocked.fake.connectWith(before.public);
  await blocked.fake.deliver({ ...structuredClone(before.public), versions: { ...before.public.versions, protocolVersion: 2 } });
  assert.equal(blocked.frame().model.screen, 'blocked');
  const turn = next(before.public, 'phase-b');
  await blocked.fake.deliverEvent(phaseChanged(turn));
  assert.deepEqual(blocked.cues(), []);
  await blocked.fake.deliver(turn);
  assert.equal(blocked.frame().model.screen, 'match');
  assert.deepEqual(blocked.cues(), [], 'The view that brings the match back is where things stand');
});

test('reduced motion changes how a cue may be drawn, never whether its fact is shown', async () => {
  const s = setup('table');
  s.screen.setDeviceReducedMotion(true);
  s.screen.start();
  await s.fake.connectWith(before.public);
  const turn = next(before.public, 'phase-b', v => { v.activeSeatId = 'seat-2'; });
  await s.fake.deliver(turn);
  await s.fake.deliverEvent(phaseChanged(turn));
  assert.equal(s.frame().model.motion, 'reduced');
  assert.equal(s.frame().model.match.phase.phaseLabel, 'Player 2’s turn');
  assert.deepEqual(s.kinds(), ['phase-change'], 'The renderer is told, and decides what little to do with it');
});

test('a registration is a private cue: inside the open private panel only, and gone when it closes', async () => {
  const open = setup('player');
  open.screen.start();
  await open.fake.connectWith(before.officer);
  open.screen.dispatch(TOGGLE);
  await open.fake.deliver(afterRegistration.officer);
  assert.deepEqual(open.frame().privateCues, [], 'The view alone is no reason for emphasis');
  await open.fake.deliverEvent(registrationEvent);
  assert.deepEqual(open.frame().privateCues, [{ seq: 1, cue: { kind: 'registration' } }]);
  assert.deepEqual(open.cues(), [], 'It is never a public cue');
  assert.equal(JSON.stringify(open.frame()).includes(COMMAND), false, 'The identifier that tells one registration from another never reaches a frame');

  const epoch = open.frame().privacyEpoch;
  open.screen.dispatch(TOGGLE);
  assert.deepEqual(open.frame().privateCues, []);
  assert.equal(open.frame().privacyEpoch, epoch + 1);
  open.screen.dispatch(TOGGLE);
  assert.deepEqual(open.frame().privateCues, [], 'Opening the panel again does not play it again');

  // Backgrounding the page withdraws it the same way.
  const backgrounded = setup('player');
  backgrounded.screen.start();
  await backgrounded.fake.connectWith(before.officer);
  backgrounded.screen.dispatch(TOGGLE);
  await backgrounded.fake.deliverEvent(registrationEvent);
  await backgrounded.fake.deliver(afterRegistration.officer);
  assert.equal(backgrounded.frame().privateCues.length, 1);
  backgrounded.screen.setPageVisible(false);
  assert.deepEqual(backgrounded.frame().privateCues, []);
});

test('with the private panel closed a registration changes nothing on the phone at all', async () => {
  const s = setup('player');
  s.screen.start();
  await s.fake.connectWith(before.officer);
  const frame = s.frame();
  const count = s.frames.length;
  await s.fake.deliverEvent(registrationEvent);
  await s.fake.deliver(afterRegistration.officer);
  await s.fake.deliverEvent(registrationEvent);
  assert.equal(s.frame(), frame, 'Not a redraw, not a cue, not a word');
  assert.equal(s.frames.length, count);
  // Opening the panel afterwards shows the registration as a fact and plays nothing.
  s.screen.dispatch(TOGGLE);
  assert.equal(s.frame().model.match.privateArea.content.actions.cards[0].status, 'registered');
  assert.deepEqual([s.frame().cues, s.frame().privateCues], [[], []]);
});

test('a registration puts no cue on the table or on any other phone, even if its event is misdelivered', async () => {
  const table = setup('table');
  table.screen.start();
  await table.fake.connectWith(before.public);
  const tableFrame = table.frame();
  await table.fake.deliver(afterRegistration.public);
  await table.fake.deliverEvent(registrationEvent);
  await table.fake.deliverEvent({ ...registrationEvent, audience: { kind: 'public' } });
  assert.equal(table.frame(), tableFrame);

  const target = setup('player');
  target.screen.start();
  await target.fake.connectWith(before.target);
  target.screen.dispatch(TOGGLE);
  const targetFrame = target.frame();
  await target.fake.deliver(afterRegistration.target);
  // Seat 1's event on seat 2's stream, at a revision seat 2's own view has.
  await target.fake.deliverEvent({ ...registrationEvent, viewRevision: before.target.viewRevision });
  await target.fake.deliverEvent({ ...registrationEvent, audience: { kind: 'player', seatId: 'seat-2' }, viewRevision: before.target.viewRevision });
  assert.equal(target.frame(), targetFrame);
});

const GUARD = DEFAULT_SHOT_FLOW_TIMING.controlGuardMs;

/** The Officer's phone at the confirm step for Player 2, with the double-tap guard waited out. */
async function atConfirm() {
  const s = setup('player');
  s.screen.start();
  await s.fake.connectWith(before.officer);
  s.screen.dispatch(TOGGLE);
  s.screen.dispatch({ type: 'shot/open' });
  s.screen.dispatch({ type: 'shot/choose-target', seatId: 'seat-2' });
  await s.host.advance(GUARD);
  const accepted = command => ({ ok: true, serverTimeMs: s.host.serverNow(), receipt: { protocolVersion: 1, matchId, phaseId: command.phaseId, commandId: command.commandId, status: 'accepted', code: 'REGISTERED' } });
  const listing = commandId => variant(before.officer, v => { v.viewRevision += 1; v.self.shotAvailable = false; v.ownPendingCommandIds = [commandId]; });
  const registered = (view, commandId) => eventFor(view, { type: 'COMMAND_REGISTERED', commandId });
  return { ...s, accepted, listing, registered, status: () => s.frame().model.match.privateArea.content.actions.cards[0].status };
}

test('the player’s own receipt, the view and the event are one registration cue, in whatever order they arrive', async () => {
  // Receipt, then view, then event.
  const receiptFirst = await atConfirm();
  receiptFirst.fake.respond.submitCommand = async command => receiptFirst.accepted(command);
  receiptFirst.screen.dispatch({ type: 'shot/confirm' });
  await receiptFirst.host.advance(0);
  const commandId = receiptFirst.fake.calls.submitCommand[0].commandId;
  assert.equal(receiptFirst.status(), 'registered');
  assert.deepEqual(receiptFirst.frame().privateCues, [{ seq: 1, cue: { kind: 'registration' } }]);
  const once = receiptFirst.frame().privateCues;
  const view = receiptFirst.listing(commandId);
  await receiptFirst.fake.deliver(view);
  await receiptFirst.fake.deliverEvent(receiptFirst.registered(view, commandId));
  assert.equal(receiptFirst.frame().privateCues, once);
  assert.deepEqual(receiptFirst.cues(), []);

  // Event and view first, while the answer to the command is still on its way.
  const eventFirst = await atConfirm();
  let answer;
  eventFirst.fake.respond.submitCommand = command => new Promise(resolve => { answer = () => resolve(eventFirst.accepted(command)); });
  eventFirst.screen.dispatch({ type: 'shot/confirm' });
  await eventFirst.host.advance(0);
  assert.equal(eventFirst.status(), 'submitting');
  const sent = eventFirst.fake.calls.submitCommand[0].commandId;
  const listed = eventFirst.listing(sent);
  await eventFirst.fake.deliverEvent(eventFirst.registered(listed, sent));
  assert.deepEqual(eventFirst.frame().privateCues, [], 'Not before the view lists the command');
  await eventFirst.fake.deliver(listed);
  assert.equal(eventFirst.status(), 'registered');
  assert.deepEqual(eventFirst.frame().privateCues, [{ seq: 1, cue: { kind: 'registration' } }]);
  assert.equal(JSON.stringify(eventFirst.frame()).includes(sent), false);
  const single = eventFirst.frame().privateCues;
  answer();
  await eventFirst.host.advance(0);
  assert.equal(eventFirst.frame().privateCues, single);
});

test('a registration learned behind a closed panel is not played when the panel is opened', async () => {
  const s = await atConfirm();
  let answer;
  s.fake.respond.submitCommand = command => new Promise(resolve => { answer = () => resolve(s.accepted(command)); });
  s.screen.dispatch({ type: 'shot/confirm' });
  await s.host.advance(0);
  s.screen.dispatch(TOGGLE);
  answer();
  await s.host.advance(0);
  assert.deepEqual([s.frame().cues, s.frame().privateCues], [[], []]);
  s.screen.dispatch(TOGGLE);
  assert.equal(s.status(), 'registered', 'The result is there to read');
  assert.match(s.frame().privateAnnouncement.text, /registered/i, 'and is spoken');
  assert.deepEqual(s.frame().privateCues, [], 'but a cue is for the moment itself');
});

test('a rejection and an unknown result are not cues', async () => {
  const rejected = await atConfirm();
  rejected.fake.respond.submitCommand = async command => ({ ok: true, serverTimeMs: rejected.host.serverNow(), receipt: { protocolVersion: 1, matchId, phaseId: command.phaseId, commandId: command.commandId, status: 'rejected', code: 'NOT_ALLOWED' } });
  rejected.screen.dispatch({ type: 'shot/confirm' });
  await rejected.host.advance(0);
  assert.equal(rejected.status(), 'not-registered');
  assert.deepEqual([rejected.frame().cues, rejected.frame().privateCues], [[], []]);

  const unknown = await atConfirm();
  unknown.fake.respond.submitCommand = () => Promise.reject(new Error('connection lost'));
  unknown.screen.dispatch({ type: 'shot/confirm' });
  await unknown.host.advance(0);
  await unknown.host.advance(DEFAULT_SHOT_FLOW_TIMING.recheckDelaysMs.reduce((sum, delay) => sum + delay, 0));
  assert.equal(unknown.status(), 'unknown');
  assert.deepEqual([unknown.frame().cues, unknown.frame().privateCues], [[], []]);
});

test('the screen itself keeps a private cue behind the open panel and any cue off a screen nobody is looking at, whatever issued it', async () => {
  // The directors already behave. This checks the screen's own rule with a director that
  // does not, reaching past the package entry for the generic controller on purpose.
  const { createScreen } = await import('../dist/screens/screen.js');
  const host = createFakeHost({ serverStart: SERVER_EPOCH });
  const fake = createFakeTransport(host);
  const session = createPlayerSession({ transport: fake.transport, matchId, ports: host.ports });
  let asked = 0;
  const both = () => {
    asked += 1;
    return [{ cue: { kind: 'registration', note: `secret-${asked}` }, privacy: 'private' }, { cue: { kind: 'phase-change' }, privacy: 'public' }];
  };
  const screen = createScreen({
    session,
    ports: host.ports,
    host: { reload() {} },
    phaseOf: view => view.phase,
    buildInput: (environment, view, local) => ({ environment, view, local }),
    buildModel: input => ({ screen: input.view === null ? 'connecting' : 'match', revealed: input.local.privateRevealed }),
    announcer: { next: () => [] },
    director: { onView: () => [], onEvent: () => [], suspend() {} },
    moreCues: both,
    handleIntent: (intent, { local }) => (intent.type === 'private/toggle' ? { local: { ...local, privateRevealed: !local.privateRevealed } } : null),
  });
  const kinds = () => [screen.getFrame().cues.map(item => item.cue.kind), screen.getFrame().privateCues.map(item => item.cue.kind)];
  screen.start();
  assert.deepEqual(kinds(), [[], []], 'No match on screen: nothing at all');
  await fake.connectWith(before.officer);
  assert.deepEqual(kinds(), [['phase-change'], []], 'Closed: the private cue is dropped, not carried');
  screen.dispatch(TOGGLE);
  assert.deepEqual(kinds(), [['phase-change'], ['registration']]);
  const seqs = [...screen.getFrame().cues, ...screen.getFrame().privateCues].map(item => item.seq);
  assert.equal(new Set(seqs).size, 2, 'One numbering across both lists');
  screen.setPageVisible(false);
  assert.deepEqual(kinds()[1], [], 'Backgrounded: nothing private is carried, though the source still offers it');
  const kept = screen.getFrame().cues;
  await host.advance(3_000);
  screen.dispatch(TOGGLE);
  assert.equal(screen.getFrame().cues, kept, 'and no public cue is issued to a hidden page');
  assert.equal(JSON.stringify(screen.getFrame()).includes('secret-'), false);
  screen.dispose();
});
