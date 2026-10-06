import assert from 'node:assert/strict';
import test from 'node:test';
import { PlayerViewSchema, PublicViewSchema } from '@mothership/contracts';
import { createOfficerFixture } from '@mothership/contracts/fixtures';
import { createPlayerScreen, createPlayerSession, createTableScreen, DEFAULT_CUE_TIMING, DEFAULT_SHOT_FLOW_TIMING } from '@mothership/game';
import { createFakeHost, createFakeTransport } from './support/fakes.mjs';

// Cues as a screen issues them: views and events in, frames out, against a transport whose
// every delivery the test scripts. The events are frontend-authored and synthetic, apart
// from the one authored registration event. No fixture scenario and no rule is involved.

const { before, afterRegistration } = createOfficerFixture('protected');
const matchId = before.public.matchId;
const SERVER_EPOCH = before.public.phase.startedAt;
const TOGGLE = { type: 'private/toggle' };
const { lifetimeMs: LIFETIME, maxLatenessMs: LATENESS } = DEFAULT_CUE_TIMING;
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

test('every cue of the view on screen is in the latest frame, in whichever order its facts arrived', async () => {
  // Three facts at one revision. A consumer that reads only the latest frame, as a
  // renderer sampling once per paint does, must get the same cues either way.
  const second = next(before.public, 'phase-b', v => { v.seats[2].location = 'Room B'; v.seats[3].health = 'Injured'; });
  const facts = () => [
    phaseChanged(second),
    eventFor(second, { type: 'PUBLIC_MOVE', seatId: 'seat-3', from: 'Room A', to: 'Room B' }),
    eventFor(second, { type: 'PUBLIC_HEALTH_CHANGED', seatId: 'seat-4', health: 'Injured' }),
  ];
  const all = [
    { seq: 1, cue: { kind: 'phase-change' } },
    { seq: 2, cue: { kind: 'public-move', seatId: 'seat-3', from: 'Room A', to: 'Room B' } },
    { seq: 3, cue: { kind: 'status-change', seatId: 'seat-4', health: 'Injured' } },
  ];

  const viewFirst = setup('table');
  viewFirst.screen.start();
  await viewFirst.fake.connectWith(before.public);
  await viewFirst.fake.deliver(second);
  for (const event of facts()) await viewFirst.fake.deliverEvent(event);
  assert.deepEqual(viewFirst.frame().cues, all, 'View first: the last frame still holds the first cue');

  const eventsFirst = setup('table');
  eventsFirst.screen.start();
  await eventsFirst.fake.connectWith(before.public);
  for (const event of facts()) await eventsFirst.fake.deliverEvent(event);
  await eventsFirst.fake.deliver(second);
  assert.deepEqual(eventsFirst.frame().cues, all, 'Events first: the same list');

  // Mixed: one event before the view and two after it.
  const mixed = setup('table');
  mixed.screen.start();
  await mixed.fake.connectWith(before.public);
  const [phase, move, status] = facts();
  await mixed.fake.deliverEvent(phase);
  await mixed.fake.deliver(second);
  await mixed.fake.deliverEvent(move);
  await mixed.fake.deliverEvent(status);
  assert.deepEqual(mixed.frame().cues, all);

  // A redraw that changes no public fact leaves the list exactly as it was: the same object.
  const list = viewFirst.cues();
  viewFirst.screen.dispatch({ type: 'settings/reduce-motion', checked: true });
  assert.equal(viewFirst.cues(), list);

  // A newer view takes out only the cues whose own fact changed again. Here the phase
  // changes and Player 7 moves: the earlier phase cue goes, the cues about Players 3 and 4
  // stay where they were with their numbers, and the new ones follow in stream order.
  const third = next(second, 'phase-c', v => { v.round += 1; v.seats[6].location = 'Hospital'; });
  await viewFirst.fake.deliverEvent(eventFor(third, { type: 'PUBLIC_MOVE', seatId: 'seat-7', from: 'Room B', to: 'Hospital' }));
  await viewFirst.fake.deliverEvent(phaseChanged(third));
  await viewFirst.fake.deliver(third);
  assert.deepEqual(viewFirst.cues(), [
    all[1],
    all[2],
    { seq: 4, cue: { kind: 'public-move', seatId: 'seat-7', from: 'Room B', to: 'Hospital' } },
    { seq: 5, cue: { kind: 'round-transition', round: before.public.round + 1 } },
  ]);
  // A view that changes no public fact leaves all of them as they were.
  const kept = viewFirst.cues();
  await viewFirst.fake.deliver(variant(third, v => { v.viewRevision += 1; }));
  assert.equal(viewFirst.cues(), kept);
  // A seat's own fact changing again takes that seat's cue out, and no other seat's.
  await viewFirst.fake.deliver(variant(third, v => { v.viewRevision += 2; v.seats[2].location = 'Command Room'; }));
  assert.deepEqual(viewFirst.cues().map(item => item.seq), [3, 4, 5], 'Player 3 moved again: only the cue about Player 3 is gone');
  await viewFirst.fake.deliver(variant(third, v => { v.viewRevision += 3; v.seats[2].location = 'Command Room'; v.seats[3].health = 'Healthy'; }));
  assert.deepEqual(viewFirst.cues().map(item => item.seq), [4, 5], 'Player 4 is Healthy again: the cue that said Injured is gone');
  // And every one of them still leaves when its window is over.
  await viewFirst.host.advance(LIFETIME);
  assert.deepEqual(viewFirst.cues(), []);
});

test('a private-only update leaves the public cues exactly as they were: the same cues, the same numbers, the same frame list', async () => {
  // Review finding R6. A public cue is live on a phone; then this seat's own view changes in
  // nothing but something private. Two phones are taken through the same public moments, and
  // one of them also registers a command in between. Nothing an onlooker could see of the
  // public cues may differ between the two.
  const moved = next(before.officer, before.officer.phase.id, v => { v.seats[7].location = 'Room A'; });
  const run = async privately => {
    const s = setup('player');
    s.screen.start();
    await s.fake.connectWith(before.officer);
    s.screen.dispatch(TOGGLE);
    await s.fake.deliver(moved);
    await s.fake.deliverEvent(eventFor(moved, { type: 'PUBLIC_MOVE', seatId: 'seat-8', from: 'Room B', to: 'Room A' }));
    assert.deepEqual(s.cues(), [{ seq: 1, cue: { kind: 'public-move', seatId: 'seat-8', from: 'Room B', to: 'Room A' } }]);
    const list = s.cues();
    if (privately) {
      // The same public facts, one revision on, with a command of this seat's now pending.
      const registered = variant(moved, v => { v.viewRevision += 1; v.ownPendingCommandIds = [COMMAND]; });
      assert.deepEqual([registered.seats, registered.phase, registered.round], [moved.seats, moved.phase, moved.round], 'Nothing public differs');
      await s.fake.deliver(registered);
      await s.fake.deliverEvent({ ...registrationEvent, viewRevision: registered.viewRevision, audience: registered.audience });
      assert.deepEqual(s.frame().privateCues.map(item => item.cue.kind), ['registration'], 'The private cue is there, in its own list');
    }
    return { s, list };
  };
  const quiet = await run(false);
  const busy = await run(true);
  assert.equal(busy.s.cues(), busy.list, 'The public list is the very same object after the private update');
  assert.deepEqual(busy.s.cues(), quiet.s.cues(), 'and it is what a phone that did nothing in private shows');
  // Later public cues take the same numbers on both, and time takes the first cue out of both at the same moment.
  for (const { s } of [quiet, busy]) {
    await s.host.advance(LIFETIME - 1);
    assert.deepEqual(s.cues().map(item => item.seq), [1]);
    const turn = next(s.frame().model.match === null ? moved : variant(moved, v => { v.viewRevision += 1; v.ownPendingCommandIds = s === busy.s ? [COMMAND] : []; }), 'phase-next');
    await s.fake.deliver(turn);
    await s.fake.deliverEvent(phaseChanged(turn));
    assert.deepEqual(s.cues().map(item => [item.seq, item.cue.kind]), [[1, 'public-move'], [2, 'phase-change']]);
    await s.host.advance(1);
    assert.deepEqual(s.cues().map(item => [item.seq, item.cue.kind]), [[2, 'phase-change']]);
  }
});

test('the two windows are the ones agreed with the Designer: a second to start a cue, and a second for an event to be late', () => {
  // docs/design/motion-storyboards.md, "Cue freshness". Neither is a game rule and neither is measured on a device.
  assert.deepEqual(DEFAULT_CUE_TIMING, { lifetimeMs: 1_000, maxLatenessMs: 1_000 });
});

test('a cue leaves the frame when its time is up, so a frame read late offers nothing old', async () => {
  const s = setup('table');
  s.screen.start();
  await s.fake.connectWith(before.public);
  const second = next(before.public, 'phase-b');
  await s.fake.deliver(second);
  await s.fake.deliverEvent(phaseChanged(second));
  assert.deepEqual(s.cues(), [{ seq: 1, cue: { kind: 'phase-change' } }]);
  await s.host.advance(LIFETIME - 1);
  assert.deepEqual(s.cues().map(item => item.seq), [1], 'Still due');
  const notified = s.frames.length;
  await s.host.advance(1);
  assert.deepEqual(s.cues(), [], 'Its time is up');
  assert.equal(s.frames.length > notified, true, 'and whoever is listening is told the frame changed');
  // A consumer that mounts now, or minutes from now, finds nothing to play.
  await s.host.advance(200_000);
  assert.deepEqual([s.frame().cues, s.frame().privateCues], [[], []]);
  assert.equal(s.frame().model.match.phase.phaseLabel, 'Player 1’s turn', 'The fact itself is still on screen');
  // Each cue has its own time: one issued later outlives one issued earlier.
  const third = next(second, 'phase-c', v => { v.seats[2].location = 'Room B'; });
  await s.fake.deliver(third);
  await s.fake.deliverEvent(phaseChanged(third));
  await s.host.advance(LIFETIME - 500);
  await s.fake.deliverEvent(eventFor(third, { type: 'PUBLIC_MOVE', seatId: 'seat-3', from: 'Room A', to: 'Room B' }));
  assert.deepEqual(s.kinds(), ['phase-change', 'public-move']);
  await s.host.advance(500);
  assert.deepEqual(s.kinds(), ['public-move']);
  await s.host.advance(LIFETIME - 500);
  assert.deepEqual(s.kinds(), []);
});

test('an event that comes long after its view is no longer a moment: it plays nothing', async () => {
  const s = setup('table');
  s.screen.start();
  await s.fake.connectWith(before.public);
  const second = next(before.public, 'phase-b', v => { v.seats[2].location = 'Room B'; });
  await s.fake.deliver(second);
  await s.host.advance(LATENESS);
  await s.fake.deliverEvent(phaseChanged(second));
  assert.deepEqual(s.kinds(), ['phase-change'], 'Just in time');
  await s.host.advance(1);
  await s.fake.deliverEvent(eventFor(second, { type: 'PUBLIC_MOVE', seatId: 'seat-3', from: 'Room A', to: 'Room B' }));
  assert.deepEqual(s.kinds(), ['phase-change'], 'A moment later the move, long since drawn where it is, is not emphasized');
  // It took no number: the next cue follows the last one that was shown.
  const third = next(second, 'phase-c');
  await s.fake.deliver(third);
  await s.fake.deliverEvent(phaseChanged(third));
  assert.deepEqual(s.cues(), [{ seq: 2, cue: { kind: 'phase-change' } }]);
});

test('cues leave with the match: a recovery screen, a hidden page and a stale feed carry none, and none comes back', async () => {
  const withCue = async surface => {
    const s = setup(surface);
    s.screen.start();
    const view = surface === 'table' ? before.public : before.target;
    await s.fake.connectWith(view);
    const second = next(view, 'phase-b');
    await s.fake.deliver(second);
    await s.fake.deliverEvent(phaseChanged(second));
    assert.deepEqual(s.kinds(), ['phase-change']);
    return { s, second };
  };

  // A recovery screen. The frame that shows it carries no cue from the match it replaced.
  const blocked = await withCue('table');
  await blocked.s.fake.deliver({ ...structuredClone(blocked.second), viewRevision: blocked.second.viewRevision + 1, versions: { ...blocked.second.versions, protocolVersion: 2 } });
  assert.equal(blocked.s.frame().model.screen, 'blocked');
  assert.deepEqual(blocked.s.frame().cues, [], 'A consumer mounted on the recovery screen has nothing to play');
  for (const frame of blocked.s.frames.filter(frame => frame.model.screen !== 'match')) assert.deepEqual(frame.cues, []);

  // A hidden page, and the page back in front.
  const hidden = await withCue('player');
  hidden.s.screen.setPageVisible(false);
  assert.deepEqual(hidden.s.frame().cues, []);
  hidden.s.screen.setPageVisible(true);
  await hidden.s.host.advance(0);
  assert.deepEqual(hidden.s.frame().cues, [], 'Coming back does not bring it back');

  // The same for a private cue with the panel still open: it leaves with the feed.
  const stamped = setup('player');
  stamped.screen.start();
  await stamped.fake.connectWith(before.officer);
  stamped.screen.dispatch(TOGGLE);
  await stamped.fake.deliver(afterRegistration.officer);
  await stamped.fake.deliverEvent(registrationEvent);
  assert.deepEqual(stamped.frame().privateCues.map(item => item.cue.kind), ['registration']);
  await stamped.fake.disconnect();
  assert.notEqual(stamped.frame().model.match.privateArea.content, null, 'The panel is still open on the last known state');
  assert.deepEqual(stamped.frame().privateCues, []);

  // A feed that is no longer current: the last known state stays, its emphasis does not.
  const stale = await withCue('table');
  await stale.s.fake.disconnect();
  assert.equal(stale.s.frame().model.connection, 'stale');
  assert.equal(stale.s.frame().model.screen, 'match');
  assert.deepEqual(stale.s.frame().cues, []);
  await stale.s.fake.connect();
  await stale.s.fake.deliver(stale.second);
  assert.deepEqual(stale.s.frame().cues, [], 'Nor does reconnecting on the same view');
});

test('public and private cues are numbered apart: the public list is the same whether or not this seat was given a private cue', async () => {
  // Two phones of the same seat see the same public move. One of them registered a shot,
  // with its panel open, a moment before.
  const publicMove = async registerFirst => {
    const s = setup('player');
    s.screen.start();
    await s.fake.connectWith(before.officer);
    let view = before.officer;
    if (registerFirst) {
      s.screen.dispatch(TOGGLE);
      await s.fake.deliver(afterRegistration.officer);
      await s.fake.deliverEvent(registrationEvent);
      assert.deepEqual(s.frame().privateCues, [{ seq: 1, cue: { kind: 'registration' } }]);
      s.screen.dispatch(TOGGLE);
      view = afterRegistration.officer;
    }
    const moved = variant(view, v => { v.viewRevision += 1; v.seats[2].location = 'Room B'; });
    await s.fake.deliver(moved);
    await s.fake.deliverEvent(eventFor(moved, { type: 'PUBLIC_MOVE', seatId: 'seat-3', from: 'Room A', to: 'Room B' }));
    return s.frame();
  };
  const quiet = await publicMove(false);
  const registered = await publicMove(true);
  assert.deepEqual(quiet.cues, [{ seq: 1, cue: { kind: 'public-move', seatId: 'seat-3', from: 'Room A', to: 'Room B' } }]);
  assert.deepEqual(registered.cues, quiet.cues, 'Nothing in the public list records that a private cue was ever issued');
  assert.deepEqual([registered.privateCues, quiet.privateCues], [[], []]);

  // Both lists filled in one frame: each starts from 1, so a consumer with one mark per
  // list shows both, whichever list it reads first.
  const s = setup('player');
  s.screen.start();
  await s.fake.connectWith(before.officer);
  s.screen.dispatch(TOGGLE);
  const both = variant(afterRegistration.officer, v => { v.seats[2].location = 'Room B'; });
  await s.fake.deliverEvent(eventFor(both, { type: 'PUBLIC_MOVE', seatId: 'seat-3', from: 'Room A', to: 'Room B' }));
  await s.fake.deliverEvent({ ...registrationEvent, eventId: 'own-registration' });
  await s.fake.deliver(both);
  assert.deepEqual(s.frame().cues.map(item => [item.seq, item.cue.kind]), [[1, 'public-move']]);
  assert.deepEqual(s.frame().privateCues.map(item => [item.seq, item.cue.kind]), [[1, 'registration']]);
});

test('spoken lines are numbered apart too: the public line’s number says nothing about private speech', async () => {
  const lost = async registerFirst => {
    const s = setup('player');
    s.screen.start();
    await s.fake.connectWith(before.officer);
    if (registerFirst) {
      // Something is said privately: the player starts choosing, and the turn then ends under the choice.
      s.screen.dispatch(TOGGLE);
      s.screen.dispatch({ type: 'shot/open' });
      await s.fake.deliver(next(before.officer, 'phase-b', v => { v.activeSeatId = 'seat-2'; }));
      assert.notEqual(s.frame().privateAnnouncement, null, 'A private line was spoken');
      s.screen.dispatch(TOGGLE);
    } else {
      await s.fake.deliver(next(before.officer, 'phase-b', v => { v.activeSeatId = 'seat-2'; }));
    }
    await s.fake.disconnect();
    return s.frame().announcement;
  };
  const quiet = await lost(false);
  const spoke = await lost(true);
  assert.match(quiet.text, /^Connection lost\./);
  assert.deepEqual(spoke, quiet, 'The same public line with the same number on both phones');
});

test('a cue holds nothing up: input is taken in the same instant, and the one timer a cue has only takes it out of the frame', async () => {
  const s = setup('player');
  s.screen.start();
  await s.fake.connectWith(before.officer);
  const moved = variant(before.officer, v => { v.viewRevision += 1; v.seats[2].location = 'Room B'; });
  await s.fake.deliver(moved);
  const timers = s.host.pendingTimers();
  await s.fake.deliverEvent(eventFor(moved, { type: 'PUBLIC_MOVE', seatId: 'seat-3', from: 'Room A', to: 'Room B' }));
  assert.deepEqual(s.kinds(), ['public-move']);
  assert.equal(s.host.pendingTimers(), timers + 1, 'One timer: the one that ends the cue’s time in the frame');

  // The player opens the panel and starts a shot with the cue still in the frame.
  s.screen.dispatch(TOGGLE);
  s.screen.dispatch({ type: 'shot/open' });
  const card = s.frame().model.match.privateArea.content.actions.cards[0];
  assert.equal(card.status, 'targeting');
  assert.deepEqual(card.body.targets.map(target => target.label), ['Player 2', 'Player 4', 'Player 6'], 'And the targets offered already follow the new view');
  assert.deepEqual(s.kinds(), ['public-move']);
  // When the cue's time is up it goes, and nothing else on the screen changes with it.
  const model = JSON.stringify(s.frame().model.match.privateArea);
  await s.host.advance(LIFETIME);
  assert.deepEqual(s.kinds(), []);
  assert.equal(JSON.stringify(s.frame().model.match.privateArea), model);
  // Disposed with a cue in the frame, the screen leaves no timer behind.
  await s.fake.deliver(variant(moved, v => { v.viewRevision += 1; v.seats[2].location = 'Room A'; }));
  await s.fake.deliverEvent(eventFor({ ...moved, viewRevision: moved.viewRevision + 1 }, { type: 'PUBLIC_MOVE', seatId: 'seat-3', from: 'Room B', to: 'Room A' }));
  assert.deepEqual(s.kinds(), ['public-move']);
  s.screen.dispose();
  assert.equal(s.host.pendingTimers(), 0);
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

  // The feed drops. The match moves on to the third view meanwhile, and on return the
  // stream delivers everything it holds, old and missed alike, before and after the view.
  await s.fake.disconnect();
  assert.deepEqual(s.cues(), [], 'A feed that is not current emphasizes nothing');
  await s.fake.connect();
  await s.fake.deliverEvent(stream[0]);
  await s.fake.deliverEvent(stream[1]);
  await s.fake.deliver(third);
  await s.fake.deliverEvent(stream[2]);
  for (const event of stream) await s.fake.deliverEvent(event);
  assert.equal(s.frame().model.connection, 'live');
  assert.deepEqual(s.cues(), [], 'Nothing was played for what happened while away, and nothing old came back');

  // What happens from here on is played as before, numbered after the last cue that was shown.
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

  // The audience check by itself: an event that says something true of this phone's own
  // screen, at the revision that just showed it, and that would be a cue in every other
  // respect. Addressed to another seat, it is not this phone's to play.
  const phone = setup('player');
  phone.screen.start();
  await phone.fake.connectWith(before.target);
  const turn = next(before.target, 'phase-b', v => { v.activeSeatId = 'seat-2'; });
  await phone.fake.deliver(turn);
  const own = phaseChanged(turn);
  await phone.fake.deliverEvent({ ...own, eventId: 'misdelivered', audience: { kind: 'player', seatId: 'seat-1' } });
  assert.deepEqual(phone.cues(), [], 'Seat 1’s event on seat 2’s stream plays nothing, though seat 2’s screen shows that very change');
  await phone.fake.deliverEvent({ ...own, eventId: 'misdelivered-public', audience: { kind: 'public' } });
  assert.deepEqual(phone.cues(), [], 'nor does the table’s');
  // Seat 2's own event, with the very identifier the misdelivered one carried, is still played.
  await phone.fake.deliverEvent({ ...own, eventId: 'misdelivered' });
  assert.deepEqual(phone.kinds(), ['phase-change']);
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

test('a registration is a cue only while it is still the present: learned late, on a reloaded page or on a stale feed, it is history', async () => {
  const RECHECK = DEFAULT_SHOT_FLOW_TIMING.recheckDelaysMs;
  const found = (s, commandId) => async () => ({
    status: 'found', serverTimeMs: s.host.serverNow(),
    receipt: { protocolVersion: 1, matchId, phaseId: before.officer.phase.id, commandId, status: 'accepted', code: 'REGISTERED' },
  });

  // The view has been on screen for a long time when the player confirms. That is the usual
  // case, and it is not lateness: nothing here came after its own view.
  const unhurried = await atConfirm();
  await unhurried.host.advance(LATENESS * 3);
  unhurried.fake.respond.submitCommand = async command => unhurried.accepted(command);
  unhurried.screen.dispatch({ type: 'shot/confirm' });
  await unhurried.host.advance(0);
  assert.deepEqual(unhurried.frame().privateCues.map(item => item.cue.kind), ['registration']);

  // The answer is lost and found by a lookup a moment later, in the same phase: still the present.
  const soon = await atConfirm();
  soon.fake.respond.submitCommand = () => Promise.reject(new Error('answer lost'));
  soon.screen.dispatch({ type: 'shot/confirm' });
  await soon.host.advance(0);
  soon.fake.respond.lookupReceipt = found(soon, soon.fake.calls.submitCommand[0].commandId);
  await soon.host.advance(RECHECK[0]);
  assert.equal(soon.status(), 'registered');
  assert.deepEqual(soon.frame().privateCues.map(item => item.cue.kind), ['registration']);

  // The same lookup answers only after the turn has ended: the report is shown, in the past
  // tense, and nothing is stamped.
  const late = await atConfirm();
  late.fake.respond.submitCommand = () => Promise.reject(new Error('answer lost'));
  late.screen.dispatch({ type: 'shot/confirm' });
  await late.host.advance(0);
  const sent = late.fake.calls.submitCommand[0].commandId;
  await late.host.advance(RECHECK.reduce((sum, delay) => sum + delay, 0));
  assert.equal(late.status(), 'unknown');
  // The turn ends, which makes the flow ask at once, and this time the server answers.
  late.fake.respond.lookupReceipt = found(late, sent);
  await late.fake.deliver(next(before.officer, 'phase-b', v => { v.activeSeatId = 'seat-2'; }));
  await late.host.advance(0);
  assert.equal(late.status(), 'was-registered');
  assert.deepEqual(late.frame().privateCues, [], 'A registration learned a phase later is not a moment any more');

  // A page that was reloaded did not see the command go: whatever it learns is history.
  const kept = JSON.stringify({ matchId, seatId: 'seat-1', phaseId: before.officer.phase.id, commandId: 'kept-command' });
  const reloaded = setup('player');
  reloaded.host.kept = kept;
  const fresh = createPlayerScreen({ transport: reloaded.fake.transport, matchId, ports: reloaded.host.ports, host: { reload() {} } });
  // The lookup answers only once the panel is open, so nothing but the freshness rule decides.
  let tell;
  reloaded.fake.respond.lookupReceipt = () => new Promise(resolve => { tell = async () => resolve(await found(reloaded, 'kept-command')()); });
  fresh.start();
  await reloaded.fake.connectWith(before.officer);
  fresh.dispatch(TOGGLE);
  const cardOf = () => fresh.getFrame().model.match.privateArea.content.actions.cards[0];
  assert.equal(cardOf().status, 'checking');
  await tell();
  await reloaded.host.advance(0);
  assert.match(cardOf().status, /registered/);
  assert.deepEqual(fresh.getFrame().privateCues, [], 'The reloaded page reports it and stamps nothing');
  fresh.dispose();

  // The receipt arrives while the feed is not current: the screen shows no cue on such a
  // feed, and does not play it afterwards either.
  const stale = await atConfirm();
  let answer;
  stale.fake.respond.submitCommand = command => new Promise(resolve => { answer = () => resolve(stale.accepted(command)); });
  stale.screen.dispatch({ type: 'shot/confirm' });
  await stale.host.advance(0);
  await stale.fake.disconnect();
  answer();
  await stale.host.advance(0);
  assert.equal(stale.frame().model.connection, 'stale');
  assert.match(stale.status(), /registered/);
  assert.deepEqual(stale.frame().privateCues, []);
  await stale.fake.connect();
  await stale.fake.deliver(before.officer);
  assert.deepEqual(stale.frame().privateCues, [], 'and it is not played when the feed comes back');
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

  // A refusal that is no receipt at all: the server did nothing, and nothing is stamped.
  for (const code of ['FORBIDDEN', 'UNAUTHENTICATED', 'INVALID_REQUEST']) {
    const refused = await atConfirm();
    refused.fake.respond.submitCommand = async () => ({ ok: false, serverTimeMs: refused.host.serverNow(), error: { code } });
    refused.screen.dispatch({ type: 'shot/confirm' });
    await refused.host.advance(0);
    assert.equal(refused.status(), 'not-registered', code);
    assert.deepEqual([refused.frame().cues, refused.frame().privateCues], [[], []], code);
    // Nor later, when the screen is redrawn for other reasons.
    await refused.host.advance(3_000);
    assert.deepEqual(refused.frame().privateCues, [], code);
  }

  const unknown = await atConfirm();
  unknown.fake.respond.submitCommand = () => Promise.reject(new Error('connection lost'));
  unknown.screen.dispatch({ type: 'shot/confirm' });
  await unknown.host.advance(0);
  await unknown.host.advance(DEFAULT_SHOT_FLOW_TIMING.recheckDelaysMs.reduce((sum, delay) => sum + delay, 0));
  assert.equal(unknown.status(), 'unknown');
  assert.deepEqual([unknown.frame().cues, unknown.frame().privateCues], [[], []]);
});

test('the screen itself keeps a private cue behind the open panel and any cue off a screen nobody is looking at, whatever issued it', async () => {
  // The directors already behave. This checks the screen's own rules with a source that
  // does not, reaching past the package entry for the generic controller on purpose.
  const { createScreen } = await import('../dist/screens/screen.js');
  const host = createFakeHost({ serverStart: SERVER_EPOCH });
  const fake = createFakeTransport(host);
  const session = createPlayerSession({ transport: fake.transport, matchId, ports: host.ports });
  let offered = 0;
  let offering = false;
  /** The model says a recovery screen is up, though the view is there and its feed is current. */
  let recovering = false;
  // Offers one private and one public cue on the next redraw, whatever the screen is showing.
  const both = () => {
    if (!offering) return [];
    offering = false;
    offered += 1;
    return [{ cue: { kind: 'registration', note: `secret-${offered}` }, privacy: 'private' }, { cue: { kind: 'phase-change' }, privacy: 'public' }];
  };
  const screen = createScreen({
    session,
    ports: host.ports,
    host: { reload() {} },
    phaseOf: view => view.phase,
    seatsOf: view => view.seats,
    buildInput: (environment, view, local) => ({ environment, view, local }),
    buildModel: input => ({ screen: input.view === null ? 'connecting' : recovering ? 'blocked' : 'match', revealed: input.local.privateRevealed }),
    announcer: { next: () => [] },
    director: { onView: () => [], onEvent: () => [], suspend() {} },
    moreCues: both,
    handleIntent: (intent, { local }) => (intent.type === 'private/toggle' ? { local: { ...local, privateRevealed: !local.privateRevealed } } : null),
  });
  const lists = () => [screen.getFrame().cues.map(item => [item.seq, item.cue.kind]), screen.getFrame().privateCues.map(item => [item.seq, item.cue.kind])];
  /** Has the source offer its two cues, and redraws without changing anything else. */
  const offer = () => {
    offering = true;
    screen.dispatch({ type: 'shot/back' });
    assert.equal(offering, false, 'The source was asked');
  };

  screen.start();
  offer();
  assert.deepEqual(lists(), [[], []], 'No match on screen: nothing at all');
  await fake.connectWith(before.officer);
  offer();
  assert.deepEqual(lists(), [[[1, 'phase-change']], []], 'Closed: the private cue is dropped, not carried. And what could not be shown before took no number');
  screen.dispatch(TOGGLE);
  assert.deepEqual(lists()[1], [], 'Opening the panel does not bring the dropped one back');
  offer();
  assert.deepEqual(lists(), [[[1, 'phase-change'], [2, 'phase-change']], [[1, 'registration']]], 'Open: each list has its own numbers, and the private one starts at 1');
  // A second one while the first is still due: both are in the list, in order.
  await host.advance(DEFAULT_CUE_TIMING.lifetimeMs - 500);
  offer();
  assert.deepEqual(lists()[1], [[1, 'registration'], [2, 'registration']]);
  await host.advance(500);
  assert.deepEqual(lists()[1], [[2, 'registration']], 'and each leaves when its own time is up');

  // A model that is not the match carries no cue and is issued none, whatever else is true.
  offer();
  assert.equal(lists()[0].length > 0, true);
  recovering = true;
  offer();
  assert.deepEqual(lists(), [[], []], 'A recovery screen: what was in the frame is gone, and what is offered now is dropped');
  recovering = false;
  screen.dispatch({ type: 'shot/back' });
  assert.deepEqual(lists(), [[], []], 'and nothing comes back with the match');

  screen.setPageVisible(false);
  assert.deepEqual(lists(), [[], []], 'Backgrounded: nothing is carried, public or private');
  offer();
  assert.deepEqual(lists(), [[], []], 'and nothing is issued to a hidden page, though the source still offers it');
  screen.setPageVisible(true);
  await host.advance(3_000);
  assert.deepEqual(lists(), [[], []], 'Coming back plays nothing that was offered while away');
  assert.equal(JSON.stringify(screen.getFrame()).includes('secret-'), false);
  // What was suppressed took no number on either list.
  screen.dispatch(TOGGLE);
  offer();
  assert.deepEqual(lists(), [[[5, 'phase-change']], [[4, 'registration']]]);
  screen.dispose();
  assert.equal(host.pendingTimers(), 0);
});
