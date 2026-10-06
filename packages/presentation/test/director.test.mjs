import assert from 'node:assert/strict';
import test from 'node:test';
import { PlayerPresentationEventSchema, PublicPresentationEventSchema } from '@mothership/contracts';
import { createPlayerDirector, createPublicDirector } from '@mothership/presentation';
import { fixture, playerVariant, publicVariant } from './support/inputs.mjs';

// Synthetic views and events built on the authored contract fixture. Each still satisfies
// the contract schema; none of them is the result of an engine transition.
const { before, afterRegistration } = fixture();
const MATCH = before.public.matchId;
const BASE = before.public.viewRevision;

let eventNumber = 0;
const envelope = (viewRevision, fact) => ({ protocolVersion: 1, matchId: MATCH, eventId: `test-event-${++eventNumber}`, viewRevision, fact });
const publicEvent = (viewRevision, fact, overrides = {}) =>
  PublicPresentationEventSchema.parse({ ...envelope(viewRevision, fact), audience: { kind: 'public' }, ...overrides });
const playerEvent = (seatId, viewRevision, fact, overrides = {}) =>
  PlayerPresentationEventSchema.parse({ ...envelope(viewRevision, fact), audience: { kind: 'player', seatId }, ...overrides });

/** The public view some revisions on, with whatever else a test changes. */
const publicAt = (step, change = () => {}) => publicVariant(view => {
  view.viewRevision = BASE + step;
  change(view);
});
const nextPhase = (step, phaseId = `phase-${step}`, change = () => {}) => publicAt(step, view => {
  view.phase = { ...view.phase, id: phaseId };
  change(view);
});
const phaseChanged = (step, phaseId = `phase-${step}`) => publicEvent(BASE + step, { type: 'PHASE_CHANGED', phaseId });
const PHASE_CUE = { cue: { kind: 'phase-change' }, privacy: 'public' };

test('the first current view is where things stand: nothing it already reflects is played', () => {
  const director = createPublicDirector();
  assert.deepEqual(director.onEvent(phaseChanged(1)), []);
  assert.deepEqual(director.onView(nextPhase(1)), []);
  assert.deepEqual(director.onEvent(phaseChanged(1)), []);
  assert.deepEqual(director.onEvent(phaseChanged(0, before.public.phase.id)), []);
});

test('an event is played when the view it names is on screen, whichever of the two arrives first', () => {
  const eventLast = createPublicDirector();
  eventLast.onView(before.public);
  assert.deepEqual(eventLast.onView(nextPhase(1)), []);
  assert.deepEqual(eventLast.onEvent(phaseChanged(1)), [PHASE_CUE]);

  const eventFirst = createPublicDirector();
  eventFirst.onView(before.public);
  assert.deepEqual(eventFirst.onEvent(phaseChanged(1)), []);
  assert.deepEqual(eventFirst.onView(nextPhase(1)), [PHASE_CUE]);
});

test('an event delivered twice is played once', () => {
  const event = phaseChanged(1);
  const afterItsView = createPublicDirector();
  afterItsView.onView(before.public);
  afterItsView.onView(nextPhase(1));
  assert.equal(afterItsView.onEvent(event).length, 1);
  assert.deepEqual(afterItsView.onEvent(event), []);
  assert.deepEqual(afterItsView.onEvent(structuredClone(event)), []);

  const beforeItsView = createPublicDirector();
  beforeItsView.onView(before.public);
  beforeItsView.onEvent(event);
  beforeItsView.onEvent(event);
  assert.equal(beforeItsView.onView(nextPhase(1)).length, 1);
  assert.deepEqual(beforeItsView.onEvent(event), []);
});

test('the same view told again changes nothing', () => {
  const director = createPublicDirector();
  director.onView(before.public);
  director.onEvent(phaseChanged(1));
  const view = nextPhase(1, 'phase-1', v => { v.seats[2].location = 'Room B'; });
  assert.equal(director.onView(view).length, 1);
  assert.deepEqual(director.onView(view), []);
  assert.deepEqual(director.onView(structuredClone(view)), []);
  // It is still judged against the view that came before it, not against itself.
  assert.equal(director.onEvent(publicEvent(BASE + 1, { type: 'PUBLIC_MOVE', seatId: 'seat-3', from: 'Room A', to: 'Room B' })).length, 1);
  // An older view never takes the screen back.
  assert.deepEqual(director.onView(before.public), []);
  assert.deepEqual(director.onEvent(phaseChanged(2)), []);
  assert.deepEqual(director.onView(nextPhase(2)), [PHASE_CUE]);
});

test('an event the view has moved past is never played', () => {
  const late = createPublicDirector();
  late.onView(before.public);
  late.onView(nextPhase(1));
  late.onView(nextPhase(2));
  assert.deepEqual(late.onEvent(phaseChanged(1)), []);

  // The view skipped a revision: what was waiting for the skipped one is dropped with it.
  const skipped = createPublicDirector();
  skipped.onView(before.public);
  skipped.onEvent(phaseChanged(1));
  assert.deepEqual(skipped.onView(nextPhase(2)), []);
  assert.deepEqual(skipped.onEvent(phaseChanged(2)), [PHASE_CUE]);

  // Even when what the passed-over event says is still true on screen and was not before:
  // its moment is over, whether it was waiting or arrives late.
  const stillTrue = step => publicAt(step, view => { view.seats[2].location = 'Room B'; });
  const move = step => publicEvent(BASE + step, { type: 'PUBLIC_MOVE', seatId: 'seat-3', from: 'Room A', to: 'Room B' });
  const waited = createPublicDirector();
  waited.onView(before.public);
  waited.onEvent(move(1));
  assert.deepEqual(waited.onView(stillTrue(2)), []);
  const arrivedLate = createPublicDirector();
  arrivedLate.onView(before.public);
  arrivedLate.onView(stillTrue(2));
  assert.deepEqual(arrivedLate.onEvent(move(1)), []);
  assert.equal(arrivedLate.onEvent(move(2)).length, 1, 'The event of the view on screen is the one that is played');
});

test('while a feed is not current nothing is played, not even for the view still on screen', () => {
  const director = createPublicDirector();
  director.onView(before.public);
  director.onView(nextPhase(1));
  director.suspend();
  assert.deepEqual(director.onEvent(phaseChanged(1)), []);
  // The feed resumes on that same view: it is where things stand, and the event stays unplayed.
  assert.deepEqual(director.onView(nextPhase(1)), []);
  assert.deepEqual(director.onEvent(phaseChanged(1)), []);
});

test('when a feed becomes current again, what its first view reflects is history', () => {
  const director = createPublicDirector();
  director.onView(before.public);
  director.suspend();
  // Arrives while the feed is not current: held, not played.
  const missed = phaseChanged(1);
  assert.deepEqual(director.onEvent(missed), []);
  assert.deepEqual(director.onView(nextPhase(1)), []);
  assert.deepEqual(director.onEvent(missed), []);
  assert.deepEqual(director.onEvent(phaseChanged(1)), []);
  // From here on the feed is current and plays as before.
  assert.deepEqual(director.onEvent(phaseChanged(2)), []);
  assert.deepEqual(director.onView(nextPhase(2)), [PHASE_CUE]);
});

test('an event ahead of the view the feed resumes on still waits for its own view', () => {
  const director = createPublicDirector();
  director.onView(before.public);
  director.suspend();
  director.onEvent(phaseChanged(1));
  director.onEvent(phaseChanged(2));
  assert.deepEqual(director.onView(nextPhase(1)), []);
  assert.deepEqual(director.onView(nextPhase(2)), [PHASE_CUE]);
});

test('suspending twice, or with nothing on screen, is harmless', () => {
  const director = createPublicDirector();
  director.suspend();
  director.suspend();
  assert.deepEqual(director.onView(before.public), []);
  director.onEvent(phaseChanged(1));
  assert.deepEqual(director.onView(nextPhase(1)), [PHASE_CUE]);
});

test('a cue shows only what the screen states', () => {
  const view = publicAt(1, v => {
    v.phase = { ...v.phase, id: 'phase-b' };
    v.seats[2].location = 'Room B';
    v.seats[3].health = 'Injured';
  });
  const disagreeing = [
    publicEvent(BASE + 1, { type: 'PHASE_CHANGED', phaseId: 'phase-z' }),
    publicEvent(BASE + 1, { type: 'PUBLIC_MOVE', seatId: 'seat-3', from: 'Room A', to: 'Hospital' }),
    publicEvent(BASE + 1, { type: 'PUBLIC_MOVE', seatId: 'seat-2', from: 'Room A', to: 'Room B' }),
    publicEvent(BASE + 1, { type: 'PUBLIC_HEALTH_CHANGED', seatId: 'seat-4', health: 'Eliminated' }),
    publicEvent(BASE + 1, { type: 'PUBLIC_HEALTH_CHANGED', seatId: 'seat-3', health: 'Injured' }),
  ];
  const eventsFirst = createPublicDirector();
  eventsFirst.onView(before.public);
  for (const event of disagreeing) eventsFirst.onEvent(event);
  assert.deepEqual(eventsFirst.onView(view), []);

  const viewFirst = createPublicDirector();
  viewFirst.onView(before.public);
  viewFirst.onView(view);
  for (const event of disagreeing) assert.deepEqual(viewFirst.onEvent(structuredClone({ ...event, eventId: `${event.eventId}-again` })), []);
});

test('only a change this device itself showed is emphasized', () => {
  // The screen already showed these facts one revision earlier; an event that calls them new finds nothing to point at.
  const already = publicAt(1, v => {
    v.seats[2].location = 'Room B';
    v.seats[3].health = 'Injured';
  });
  const same = publicAt(2, v => {
    v.seats[2].location = 'Room B';
    v.seats[3].health = 'Injured';
  });
  const director = createPublicDirector();
  director.onView(before.public);
  director.onView(already);
  director.onView(same);
  assert.deepEqual(director.onEvent(publicEvent(BASE + 2, { type: 'PHASE_CHANGED', phaseId: before.public.phase.id })), []);
  assert.deepEqual(director.onEvent(publicEvent(BASE + 2, { type: 'PUBLIC_MOVE', seatId: 'seat-3', from: 'Room A', to: 'Room B' })), []);
  assert.deepEqual(director.onEvent(publicEvent(BASE + 2, { type: 'PUBLIC_HEALTH_CHANGED', seatId: 'seat-4', health: 'Injured' })), []);
});

test('a public move is a cue for that token, drawn from where it was on this screen', () => {
  const moved = publicAt(1, v => { v.seats[2].location = 'Room B'; });
  const director = createPublicDirector();
  director.onView(before.public);
  director.onView(moved);
  assert.deepEqual(director.onEvent(publicEvent(BASE + 1, { type: 'PUBLIC_MOVE', seatId: 'seat-3', from: 'Room A', to: 'Room B' })), [
    { cue: { kind: 'public-move', seatId: 'seat-3', from: 'Room A', to: 'Room B' }, privacy: 'public' },
  ]);

  // This screen went from Room A straight to the Hospital. The event speaks of a stop in
  // between that was never shown here, and the cue does not show it either.
  const skipped = createPublicDirector();
  skipped.onView(before.public);
  skipped.onView(publicAt(2, v => { v.seats[2].location = 'Hospital'; }));
  assert.deepEqual(skipped.onEvent(publicEvent(BASE + 2, { type: 'PUBLIC_MOVE', seatId: 'seat-3', from: 'Room B', to: 'Hospital' })), [
    { cue: { kind: 'public-move', seatId: 'seat-3', from: 'Room A', to: 'Hospital' }, privacy: 'public' },
  ]);
});

test('a health change is a status change and nothing more', () => {
  const director = createPublicDirector();
  director.onView(before.public);
  director.onView(publicAt(1, v => { v.seats[1].health = 'Injured'; }));
  const cues = director.onEvent(publicEvent(BASE + 1, { type: 'PUBLIC_HEALTH_CHANGED', seatId: 'seat-2', health: 'Injured' }));
  assert.deepEqual(cues, [{ cue: { kind: 'status-change', seatId: 'seat-2', health: 'Injured' }, privacy: 'public' }]);
  assert.deepEqual(Object.keys(cues[0].cue).sort(), ['health', 'kind', 'seatId']);
});

test('a phase change that raises the round number is a round transition', () => {
  const director = createPublicDirector();
  director.onView(before.public);
  director.onEvent(phaseChanged(1));
  assert.deepEqual(director.onView(nextPhase(1)), [PHASE_CUE]);
  director.onEvent(phaseChanged(2));
  const newRound = publicAt(2, v => {
    v.phase = { ...v.phase, id: 'phase-2' };
    v.round = before.public.round + 1;
  });
  assert.deepEqual(director.onView(newRound), [{ cue: { kind: 'round-transition', round: before.public.round + 1 }, privacy: 'public' }]);
});

test('a round that changed while the feed was away is not turned into a transition afterwards', () => {
  const director = createPublicDirector();
  director.onView(before.public);
  director.suspend();
  const newRound = publicAt(4, v => {
    v.phase = { ...v.phase, id: 'phase-4' };
    v.round = before.public.round + 1;
  });
  director.onEvent(phaseChanged(4));
  assert.deepEqual(director.onView(newRound), []);
  // The next phase of that round is an ordinary phase change.
  director.onEvent(phaseChanged(5));
  assert.deepEqual(director.onView(publicAt(5, v => {
    v.phase = { ...v.phase, id: 'phase-5' };
    v.round = before.public.round + 1;
  })), [PHASE_CUE]);
});

test('several events for one view come out in the order their stream delivered them', () => {
  const view = publicAt(1, v => {
    v.phase = { ...v.phase, id: 'phase-b' };
    v.seats[6].location = 'Hospital';
    v.seats[7].health = 'Injured';
  });
  const events = [
    publicEvent(BASE + 1, { type: 'PUBLIC_HEALTH_CHANGED', seatId: 'seat-8', health: 'Injured' }),
    publicEvent(BASE + 1, { type: 'PHASE_CHANGED', phaseId: 'phase-b' }),
    publicEvent(BASE + 1, { type: 'PUBLIC_MOVE', seatId: 'seat-7', from: 'Room B', to: 'Hospital' }),
  ];
  const director = createPublicDirector();
  director.onView(before.public);
  for (const event of events) director.onEvent(event);
  assert.deepEqual(director.onView(view).map(issued => issued.cue.kind), ['status-change', 'phase-change', 'public-move']);
});

const registrationEvent = afterRegistration.officerEvents[0];
const COMMAND = registrationEvent.fact.commandId;
const stamp = { cue: { kind: 'registration' }, privacy: 'private' };

test('the authored registration event is one private cue, once the seat’s own view lists the command', () => {
  assert.ok(PlayerPresentationEventSchema.safeParse(registrationEvent).success);
  const eventFirst = createPlayerDirector();
  eventFirst.onView(before.officer);
  assert.deepEqual(eventFirst.onEvent(registrationEvent), []);
  assert.deepEqual(eventFirst.onView(afterRegistration.officer), [stamp]);

  const viewFirst = createPlayerDirector();
  viewFirst.onView(before.officer);
  assert.deepEqual(viewFirst.onView(afterRegistration.officer), []);
  assert.deepEqual(viewFirst.onEvent(registrationEvent), [stamp]);
});

test('a receipt and the event for the same command are one cue, in either order', () => {
  const receiptFirst = createPlayerDirector();
  receiptFirst.onView(before.officer);
  assert.deepEqual(receiptFirst.onRegistered(COMMAND), [stamp]);
  assert.deepEqual(receiptFirst.onRegistered(COMMAND), []);
  receiptFirst.onEvent(registrationEvent);
  assert.deepEqual(receiptFirst.onView(afterRegistration.officer), []);

  const eventFirst = createPlayerDirector();
  eventFirst.onView(before.officer);
  eventFirst.onView(afterRegistration.officer);
  assert.deepEqual(eventFirst.onEvent(registrationEvent), [stamp]);
  assert.deepEqual(eventFirst.onRegistered(COMMAND), []);
  // Another command is another registration.
  assert.deepEqual(eventFirst.onRegistered('another-command'), [stamp]);
  assert.deepEqual(eventFirst.onRegistered('another-command'), []);
});

test('a registration this page did not see happen is history', () => {
  const director = createPlayerDirector();
  assert.deepEqual(director.onView(afterRegistration.officer), []);
  assert.deepEqual(director.onEvent(registrationEvent), []);
  // Still listed in a later view: it did not become pending on this screen.
  const later = playerVariant(afterRegistration.officer, v => { v.viewRevision += 1; });
  director.onEvent(playerEvent('seat-1', later.viewRevision, { type: 'COMMAND_REGISTERED', commandId: COMMAND }));
  assert.deepEqual(director.onView(later), []);
});

test('a registration event is never a cue unless the seat’s own view lists that command', () => {
  const director = createPlayerDirector();
  director.onView(before.officer);
  director.onView(afterRegistration.officer);
  assert.deepEqual(director.onEvent(playerEvent('seat-1', afterRegistration.officer.viewRevision, { type: 'COMMAND_REGISTERED', commandId: 'not-this-seats' })), []);
});

test('an event for another seat or another match is ignored, whatever it says', () => {
  // Seat 2's phone is handed seat 1's registration event, at a revision of its own.
  const target = createPlayerDirector();
  target.onView(before.target);
  const targetNext = playerVariant(before.target, v => {
    v.viewRevision += 1;
    v.ownPendingCommandIds = [COMMAND];
    v.phase = { ...v.phase, id: 'phase-b' };
  });
  target.onView(targetNext);
  const misdelivered = [
    { ...registrationEvent, viewRevision: targetNext.viewRevision },
    playerEvent('seat-1', targetNext.viewRevision, { type: 'PHASE_CHANGED', phaseId: 'phase-b' }),
    playerEvent('seat-2', targetNext.viewRevision, { type: 'PHASE_CHANGED', phaseId: 'phase-b' }, { matchId: 'another-match' }),
  ];
  for (const event of misdelivered) assert.deepEqual(target.onEvent(event), []);
  // The same fact addressed to this seat in this match is played.
  assert.equal(target.onEvent(playerEvent('seat-2', targetNext.viewRevision, { type: 'PHASE_CHANGED', phaseId: 'phase-b' })).length, 1);

  // A public event on a seat's stream is not that seat's either.
  assert.deepEqual(target.onEvent(publicEvent(targetNext.viewRevision, { type: 'PHASE_CHANGED', phaseId: 'phase-b' })), []);

  const table = createPublicDirector();
  table.onView(before.public);
  table.onView(nextPhase(1));
  assert.deepEqual(table.onEvent(publicEvent(BASE + 1, { type: 'PHASE_CHANGED', phaseId: 'phase-1' }, { matchId: 'another-match' })), []);
  // Nor is a seat's event the table's, even when the fact itself is public.
  assert.deepEqual(table.onEvent(playerEvent('seat-2', BASE + 1, { type: 'PHASE_CHANGED', phaseId: 'phase-1' })), []);
  assert.equal(table.onEvent(publicEvent(BASE + 1, { type: 'PHASE_CHANGED', phaseId: 'phase-1' })).length, 1);
});

test('the table’s director has no private cue to give', () => {
  const table = createPublicDirector();
  assert.deepEqual(Object.keys(table).sort(), ['onEvent', 'onView', 'suspend']);
  table.onView(before.public);
  table.onView(nextPhase(1));
  // Not a public event at all; a public view lists no pending command, so nothing can come of it.
  assert.deepEqual(table.onEvent({ ...registrationEvent, audience: { kind: 'public' }, viewRevision: BASE + 1 }), []);
});

test('a player’s director plays the public facts of its own stream like the table’s', () => {
  const next = playerVariant(before.target, v => {
    v.viewRevision += 1;
    v.seats[2].location = 'Room B';
  });
  const director = createPlayerDirector();
  director.onView(before.target);
  director.onView(next);
  assert.deepEqual(director.onEvent(playerEvent('seat-2', next.viewRevision, { type: 'PUBLIC_MOVE', seatId: 'seat-3', from: 'Room A', to: 'Room B' })), [
    { cue: { kind: 'public-move', seatId: 'seat-3', from: 'Room A', to: 'Room B' }, privacy: 'public' },
  ]);
});

test('the vocabulary has no attack, block, shooter or cause', () => {
  const director = createPlayerDirector();
  director.onView(before.officer);
  const next = playerVariant(afterRegistration.officer, v => {
    v.phase = { ...v.phase, id: 'phase-b' };
    v.seats[2].location = 'Hospital';
    v.seats[1].health = 'Injured';
    v.seats[3].health = 'Eliminated';
  });
  const facts = [
    { type: 'COMMAND_REGISTERED', commandId: COMMAND },
    { type: 'PHASE_CHANGED', phaseId: 'phase-b' },
    { type: 'PUBLIC_MOVE', seatId: 'seat-3', from: 'Room A', to: 'Hospital' },
    { type: 'PUBLIC_HEALTH_CHANGED', seatId: 'seat-2', health: 'Injured' },
    { type: 'PUBLIC_HEALTH_CHANGED', seatId: 'seat-4', health: 'Eliminated' },
  ];
  for (const fact of facts) director.onEvent(playerEvent('seat-1', next.viewRevision, fact));
  const cues = director.onView(next);
  assert.deepEqual(cues.map(issued => issued.cue.kind), ['registration', 'phase-change', 'public-move', 'status-change', 'status-change']);
  assert.deepEqual(cues.map(issued => issued.privacy), ['private', 'public', 'public', 'public', 'public']);
  assert.doesNotMatch(JSON.stringify(cues), /shot|shoot|bang|block|protect|attack|damage|target|cause|role|officer/i);
  // No identifier either, apart from the public seat a token belongs to: not the command's,
  // the phase's, the event's or the match's.
  assert.doesNotMatch(JSON.stringify(cues), /commandId|eventId|phaseId|matchId|fixture-command|fixture-match|phase-b|test-event/);
  assert.deepEqual(cues[0].cue, { kind: 'registration' });
  assert.deepEqual(cues[1].cue, { kind: 'phase-change' });
});

test('an identifier is this audience’s own: an event misdelivered from another audience never makes its own event look like a repeat', () => {
  // The backend promises identifiers unique within one match and audience, and no more.
  const director = createPlayerDirector();
  const own = playerVariant(before.target, view => { view.viewRevision += 1; view.phase = { ...view.phase, id: 'phase-b' }; });
  director.onView(before.target);
  director.onView(own);
  const fact = { type: 'PHASE_CHANGED', phaseId: 'phase-b' };
  const shared = { eventId: 'stream-event-1' };
  // Seat 1's event, then the table's, each with the identifier seat 2's own event has.
  assert.deepEqual(director.onEvent(playerEvent('seat-1', own.viewRevision, fact, shared)), []);
  assert.deepEqual(director.onEvent(publicEvent(own.viewRevision, fact, shared)), []);
  assert.deepEqual(director.onEvent(playerEvent('seat-2', own.viewRevision, fact, { ...shared, matchId: 'another-match' })), []);
  assert.deepEqual(director.onEvent(playerEvent('seat-2', own.viewRevision, fact, shared)), [PHASE_CUE], 'Its own event is still played');
  assert.deepEqual(director.onEvent(playerEvent('seat-2', own.viewRevision, fact, shared)), [], 'and only once');
});

test('a stream handed over again in full replays nothing, however long it is', () => {
  for (const length of [10, 256, 257, 1_000]) {
    const director = createPublicDirector();
    director.onView(before.public);
    // A long match: one event a revision, each played as it happens.
    const stream = [];
    for (let step = 1; step <= length; step += 1) {
      const event = phaseChanged(step);
      stream.push(event);
      director.onView(nextPhase(step));
      assert.equal(director.onEvent(event).length, 1);
    }
    // The feed stays current and delivers everything it holds once more, twice over.
    for (let round = 0; round < 2; round += 1) {
      for (const event of stream) assert.deepEqual(director.onEvent(event), [], `${length} events: a repeat is never taken for something new`);
    }
    // What happens next is still played, once.
    director.onView(nextPhase(length + 1));
    const next = phaseChanged(length + 1);
    assert.equal(director.onEvent(next).length, 1);
    assert.deepEqual(director.onEvent(next), []);
  }
});

test('events waiting for a view still to come survive a feed that goes away and comes back', () => {
  const director = createPublicDirector();
  director.onView(before.public);
  // Ahead of the screen by two revisions when the feed stops being current.
  assert.deepEqual(director.onEvent(phaseChanged(2)), []);
  director.suspend();
  // It resumes on the revision in between: history, as every first view is.
  assert.deepEqual(director.onView(nextPhase(1)), []);
  // The view the waiting event belongs to then arrives, and the event is played with it.
  assert.deepEqual(director.onView(nextPhase(2)), [PHASE_CUE]);
});

test('memory stays bounded: a feed that floods loses emphasis, never plays a cue twice, and recovers when the screen moves on', () => {
  // A hundred events, each for a revision still to come. Only the most recent are kept.
  const ahead = createPublicDirector();
  ahead.onView(before.public);
  for (let step = 1; step <= 100; step += 1) ahead.onEvent(phaseChanged(step));
  assert.deepEqual(ahead.onView(nextPhase(1)), []);
  assert.deepEqual(ahead.onView(nextPhase(100)), [PHASE_CUE]);

  // Hundreds of distinct events for the view on screen: a feed no correct backend produces.
  const current = createPublicDirector();
  current.onView(before.public);
  current.onView(nextPhase(1));
  const first = phaseChanged(1);
  assert.equal(current.onEvent(first).length, 1);
  for (let count = 0; count < 300; count += 1) current.onEvent(phaseChanged(1, 'phase-elsewhere'));
  assert.deepEqual(current.onEvent(first), [], 'What was played is remembered through the flood: it is not played again');
  // Past the bound nothing more is taken in for this view, so a true event arriving now costs its emphasis.
  assert.deepEqual(current.onEvent(phaseChanged(1)), []);
  // The screen moves on, and the next view is served as usual.
  current.onView(nextPhase(2));
  assert.deepEqual(current.onEvent(phaseChanged(2)), [PHASE_CUE]);
  assert.deepEqual(current.onEvent(first), []);
});
