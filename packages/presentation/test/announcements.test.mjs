import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlayerAnnouncer, createTableAnnouncer } from '@mothership/presentation';
import { fixture, IDLE_SHOT, openInput, playerInput, playerVariant, publicVariant, ROLE_PATTERN, tableInput } from './support/inputs.mjs';

const { before, afterRegistration } = fixture();
const connecting = { connection: 'connecting', deadline: { kind: 'unsynced' } };
const running = remainingMs => ({ kind: 'running', remainingMs });
const expired = { kind: 'expired' };
const unsynced = { kind: 'unsynced' };

/** Feeds a sequence of inputs to a fresh announcer, as a screen would, and returns what was spoken at each step. */
function spoken(createAnnouncer, inputs) {
  const announcer = createAnnouncer();
  return inputs.map(input => announcer.next(input).map(item => item.text));
}
const player = inputs => spoken(createPlayerAnnouncer, inputs);
const table = inputs => spoken(createTableAnnouncer, inputs);
const last = steps => steps.at(-1);

test('the first readable view is announced once with where the match stands', () => {
  const announcer = createPlayerAnnouncer();
  assert.deepEqual(announcer.next(playerInput(null, connecting)), []);
  assert.deepEqual(announcer.next(playerInput(before.officer)), [{ politeness: 'polite', text: 'Connected. Round 2. Your turn.' }]);
  assert.deepEqual(announcer.next(playerInput(before.officer)), []);
  assert.deepEqual(player([playerInput(before.target)]), [['Connected. Round 2. Player 1’s turn.']]);
  assert.deepEqual(table([tableInput(before.public)]), [['Connected. Round 2. Player 1’s turn.']]);
});

test('losing and regaining the connection is spoken; what happened in between is not replayed', () => {
  const later = publicVariant(v => {
    v.round = 3; v.viewRevision += 5; v.phase.id = 'phase-k'; v.activeSeatId = 'seat-4';
    v.seats[1].health = 'Injured'; v.seats[2].location = 'Room B'; v.seats[6].jailed = true;
  });
  assert.deepEqual(table([
    tableInput(before.public),
    tableInput(before.public, { connection: 'stale' }),
    tableInput(before.public, { connection: 'stale' }),
    tableInput(later),
  ]), [
    ['Connected. Round 2. Player 1’s turn.'],
    ['Connection lost. Showing the last known state.'],
    [],
    ['Reconnected. Round 3. Player 4’s turn.'],
  ]);
});

test('a new phase is announced from the listener’s own point of view', () => {
  const next = base => playerVariant(base, v => { v.viewRevision += 1; v.phase = { ...v.phase, id: 'phase-b' }; v.activeSeatId = 'seat-2'; });
  assert.deepEqual(last(player([playerInput(before.officer), playerInput(next(before.officer))])), ['Round 2. Player 2’s turn.']);
  assert.deepEqual(last(player([playerInput(before.target), playerInput(next(before.target))])), ['Round 2. Your turn.']);
});

test('public seat changes are read as plain status; a health change never names a cause', () => {
  const changed = publicVariant(v => { v.viewRevision += 1; v.seats[1].health = 'Injured'; v.seats[2].location = 'Room B'; });
  const said = last(table([tableInput(before.public), tableInput(changed)]));
  assert.deepEqual(said, ['Player 2 is now Injured.', 'Player 3 is now in Room B.']);
  for (const text of said) assert.doesNotMatch(text, /shot|hit|attack|block|protect/i);

  const flags = publicVariant(v => { v.viewRevision += 1; v.seats[4].captain = false; v.seats[6].jailed = true; });
  assert.deepEqual(last(table([tableInput(before.public), tableInput(flags)])), ['Player 5 is no longer Captain.', 'Player 7 is now jailed.']);
});

test('many simultaneous changes are summarized instead of flooding the listener', () => {
  const many = publicVariant(v => { v.viewRevision += 1; for (const index of [0, 1, 2, 3]) v.seats[index].health = 'Injured'; });
  assert.deepEqual(last(table([tableInput(before.public), tableInput(many)])), ['Several players changed status. Review the player list.']);
});

test('the last seconds are announced once, to the player whose turn it is, with the true figure', () => {
  const at = (view, deadline) => playerInput(view, { deadline });
  assert.deepEqual(player([at(before.officer, running(30_000)), at(before.officer, running(11_000)), at(before.officer, running(10_000)), at(before.officer, running(9_000)), at(before.officer, running(1_000))]), [
    ['Connected. Round 2. Your turn.'], [], ['10 seconds left.'], [], [],
  ]);
  // Returning part-way through the last seconds still warns, once.
  assert.deepEqual(player([at(before.officer, running(30_000)), at(before.officer, running(6_200)), at(before.officer, running(5_000))]).slice(1), [['7 seconds left.'], []]);
  // Not the player's turn, or not a player at all: no warning.
  assert.deepEqual(player([at(before.target, running(11_000)), at(before.target, running(10_000))])[1], []);
  assert.deepEqual(table([tableInput(before.public, { deadline: running(11_000) }), tableInput(before.public, { deadline: running(10_000) })])[1], []);
});

test('the last-seconds notice does not depend on whether the view or the time arrives first', () => {
  const at = deadline => playerInput(before.officer, { deadline });
  // View first, then the time measurement.
  assert.deepEqual(player([playerInput(null, connecting), at(unsynced), at(running(8_000))]), [[], ['Connected. Round 2. Your turn.'], ['8 seconds left.']]);
  // Time already measured when the first view arrives.
  assert.deepEqual(player([playerInput(null, connecting), at(running(8_000))]), [[], ['Connected. Round 2. Your turn.', '8 seconds left.']]);
});

test('expiry is announced exactly once per phase, however often the clock is re-measured', () => {
  const live = deadline => playerInput(before.officer, { deadline });
  const stale = deadline => playerInput(before.officer, { connection: 'stale', deadline });
  // Three returns from the background after time ran out: each passes through "syncing".
  assert.deepEqual(player([live(running(1_000)), live(expired), live(unsynced), live(expired), live(unsynced), live(expired), live(unsynced), live(expired)]), [
    ['Connected. Round 2. Your turn.', '1 second left.'], ['Time is up. Waiting for phase update.'], [], [], [], [], [], [],
  ]);
  // A feed drop and restore after expiry: the reconnect is announced, the expiry is not repeated.
  assert.deepEqual(player([live(running(20_000)), live(expired), stale(expired), stale(unsynced), live(unsynced), live(expired)]), [
    ['Connected. Round 2. Your turn.'], ['Time is up. Waiting for phase update.'], ['Connection lost. Showing the last known state.'], [], ['Reconnected. Round 2. Your turn.'], [],
  ]);
  // Time runs out while the connection is down: both countdown notices are voiced then, once each.
  assert.deepEqual(player([live(running(20_000)), stale(running(900)), stale(expired), stale(unsynced), live(unsynced), live(expired)]).slice(1), [
    ['Connection lost. Showing the last known state.', '1 second left.'], ['Time is up. Waiting for phase update.'], [], ['Reconnected. Round 2. Your turn.'], [],
  ]);
});

test('a phase that has already run out when it is first seen says so, and a new phase starts afresh', () => {
  assert.deepEqual(table([tableInput(before.public, { deadline: expired })]), [['Connected. Round 2. Player 1’s turn.', 'Time is up. Waiting for phase update.']]);
  const nextPhase = playerVariant(before.officer, v => { v.viewRevision += 1; v.phase = { ...v.phase, id: 'phase-b' }; });
  assert.deepEqual(player([
    playerInput(before.officer, { deadline: running(5_000) }),
    playerInput(before.officer, { deadline: expired }),
    playerInput(nextPhase, { deadline: running(60_000) }),
    playerInput(nextPhase, { deadline: running(9_000) }),
    playerInput(nextPhase, { deadline: expired }),
  ]), [
    ['Connected. Round 2. Your turn.', '5 seconds left.'], ['Time is up. Waiting for phase update.'],
    ['Round 2. Your turn.'], ['9 seconds left.'], ['Time is up. Waiting for phase update.'],
  ]);
});

test('blocking problems interrupt; an unreadable update is reported without replacing the view', () => {
  const blocked = createPlayerAnnouncer();
  blocked.next(playerInput(before.officer));
  assert.deepEqual(blocked.next(playerInput(before.officer, { problem: 'incompatible-protocol' })), [{ politeness: 'assertive', text: 'Update required.' }]);
  assert.deepEqual(blocked.next(playerInput(before.officer, { problem: 'incompatible-protocol' })), []);
  assert.deepEqual(last(table([tableInput(before.public), tableInput(before.public, { problem: 'integrity' })])), ['Match data check failed.']);
  assert.deepEqual(table([tableInput(before.public), tableInput(before.public, { problem: 'unreadable-update' }), tableInput(before.public)]).slice(1), [
    ['The latest update could not be read.'],
    // Recovering from an unreadable update is not a reconnection, and is not described as one.
    ['Up to date again. Round 2. Player 1’s turn.'],
  ]);
  assert.deepEqual(last(table([tableInput(before.public), tableInput(before.public, { connection: 'stale', problem: 'unreadable-update' }), tableInput(before.public)])), ['Reconnected. Round 2. Player 1’s turn.']);
  assert.deepEqual(last(table([tableInput(null, connecting), tableInput(null, { ...connecting, problem: 'unreadable-update' })])), ['The latest update could not be read.']);
});

test('nothing is spoken because of a hidden registration, and no announcement can name a role', () => {
  assert.deepEqual(last(table([tableInput(before.public), tableInput(afterRegistration.public)])), []);
  assert.deepEqual(last(player([playerInput(before.target), playerInput(afterRegistration.target)])), []);
  // The registering phone stays silent too: registration feedback belongs to the command flow.
  assert.deepEqual(last(player([playerInput(before.officer), playerInput(afterRegistration.officer)])), []);
  const revealed = { privacy: { concealed: false, revealed: true } };
  const everything = player([
    playerInput(before.officer, revealed),
    playerInput(before.officer, { connection: 'stale', ...revealed }),
    playerInput(afterRegistration.officer, revealed),
    playerInput(afterRegistration.officer, { ...revealed, deadline: expired }),
  ]).flat();
  assert.equal(everything.length >= 4, true);
  for (const text of everything) {
    assert.doesNotMatch(text, ROLE_PATTERN);
    assert.doesNotMatch(text, /shot|available|registered/i);
  }
});

// The shot flow. Everything it says is private to the seat that acted.
const SHOT = {
  targeting: { step: 'targeting' },
  confirming: { step: 'confirming', targetSeatId: 'seat-2', armed: true },
  submitting: { step: 'submitting' },
  checking: { step: 'checking', recovered: false },
  unknown: { step: 'unknown', recovered: false, phaseOver: false, armed: true },
  registered: { step: 'registered', targetSeatId: 'seat-2', pending: true, armed: true },
  rejected: code => ({ step: 'rejected', code, armed: true }),
  notRegistered: reason => ({ step: 'not-registered', reason, armed: true }),
  reminder: targetSeatId => ({ step: 'idle', registered: { targetSeatId } }),
};
const shotSteps = steps => {
  const announcer = createPlayerAnnouncer();
  announcer.next(openInput(before.officer));
  return steps.map(input => announcer.next(input));
};
const said = (politeness, text) => ({ politeness, text, private: true });
const closed = { privacy: { concealed: false, revealed: false } };

test('what the server did with a command is spoken, privately, as it becomes known', () => {
  const [submitting, registered, again] = shotSteps([
    openInput(before.officer, SHOT.submitting),
    openInput(before.officer, SHOT.registered),
    openInput(before.officer, SHOT.registered),
  ]);
  assert.deepEqual(submitting, [said('polite', 'Sending your shot to the server…')]);
  assert.deepEqual(registered, [said('polite', 'Shot at Player 2 registered.')]);
  assert.deepEqual(again, [], 'A result is said once');

  const [, checking, unknown] = shotSteps([
    openInput(before.officer, SHOT.submitting),
    openInput(before.officer, SHOT.checking),
    openInput(before.officer, SHOT.unknown),
  ]);
  assert.deepEqual(checking, [said('polite', 'Checking whether your shot was registered…')]);
  // The player believes they acted. Being told the outcome is not known does not wait its turn.
  assert.deepEqual(unknown, [said('assertive', 'Result unknown. The app could not confirm whether your shot was registered.')]);

  const failures = [
    [SHOT.rejected('PHASE_CLOSED'), 'Not registered. It reached the server after the turn had ended.'],
    [SHOT.rejected('NOT_ALLOWED'), 'Not registered. The server did not allow this shot.'],
    [SHOT.notRegistered('NOT_SENT'), 'Not registered. The request could not be sent.'],
    [SHOT.notRegistered('PHASE_OVER'), 'Not registered. The turn ended before the server received your shot.'],
  ];
  for (const [shot, text] of failures) {
    assert.deepEqual(shotSteps([openInput(before.officer, SHOT.submitting), openInput(before.officer, shot)])[1], [said('assertive', text)]);
  }
});

test('a control becoming active, or the same step seen again, is not spoken', () => {
  const steps = shotSteps([
    openInput(before.officer, { ...SHOT.confirming, armed: false }),
    openInput(before.officer, SHOT.confirming),
    openInput(before.officer, SHOT.submitting),
    openInput(before.officer, { ...SHOT.registered, armed: false }),
    openInput(before.officer, SHOT.registered),
  ]);
  assert.deepEqual(steps.map(lines => lines.map(line => line.text)), [[], [], ['Sending your shot to the server…'], ['Shot at Player 2 registered.'], []]);
});

test('after a reload the listener is told what the page is doing, and never a target', () => {
  const lines = shotSteps([
    openInput(before.officer, { step: 'checking', recovered: true }),
    openInput(before.officer, { step: 'registered', targetSeatId: null, pending: true, armed: false }),
  ]);
  assert.deepEqual(lines, [
    [said('polite', 'This page was reloaded before the server answered. Checking whether your shot was registered…')],
    [said('polite', 'Your shot is registered.')],
  ]);
});

test('steps the player takes are not narrated; focus reads them', () => {
  const lines = shotSteps([
    openInput(before.officer, SHOT.targeting),
    openInput(before.officer, SHOT.confirming),
    openInput(before.officer, SHOT.targeting),
    openInput(before.officer, IDLE_SHOT),
  ]);
  assert.deepEqual(lines, [[], [], [], []]);
  // Acknowledging a result the listener has already heard adds nothing.
  assert.deepEqual(shotSteps([openInput(before.officer, SHOT.submitting), openInput(before.officer, SHOT.registered), openInput(afterRegistration.officer, SHOT.reminder('seat-2'))])[2], []);
});

test('nothing about a command is put into words unless the private panel is open in the foreground', () => {
  const hidden = { privacy: { concealed: true, revealed: true } };
  for (const privacy of [closed, hidden]) {
    const lines = shotSteps([
      openInput(before.officer, SHOT.submitting, privacy),
      openInput(before.officer, SHOT.checking, privacy),
      openInput(before.officer, SHOT.registered, privacy),
      openInput(afterRegistration.officer, SHOT.registered, privacy),
    ]);
    assert.deepEqual(lines, [[], [], [], []]);
  }
  // A result that arrived while the panel was closed is said when the player opens it again, once.
  const [, , , reopened, after] = shotSteps([
    openInput(before.officer, SHOT.submitting),
    openInput(before.officer, SHOT.submitting, closed),
    openInput(before.officer, SHOT.registered, closed),
    openInput(before.officer, SHOT.registered),
    openInput(before.officer, SHOT.registered),
  ]);
  assert.deepEqual(reopened, [said('polite', 'Shot at Player 2 registered.')]);
  assert.deepEqual(after, []);
  // Not on a recovery screen either, where the panel is gone.
  assert.deepEqual(shotSteps([openInput(before.officer, SHOT.registered, { problem: 'integrity' })])[0].filter(item => item.private), []);
});

test('an answer that came unseen, after which the card went back to the view, is still told on opening', () => {
  // The player sent the command and closed the panel. The receipt came, the phase moved on,
  // and the card now only carries the reminder. The listener last heard "sending".
  const later = playerVariant(afterRegistration.officer, v => { v.viewRevision += 1; v.phase = { ...v.phase, id: 'phase-b' }; v.activeSeatId = 'seat-2'; });
  const reminded = shotSteps([
    openInput(before.officer, SHOT.submitting),
    openInput(before.officer, SHOT.registered, closed),
    openInput(later, SHOT.reminder('seat-2'), closed),
    openInput(later, SHOT.reminder('seat-2')),
    openInput(later, SHOT.reminder('seat-2')),
  ]);
  assert.deepEqual(reminded[3].filter(line => line.private), [said('polite', 'Shot at Player 2 registered.')]);
  assert.deepEqual(reminded[4], []);
  // With nothing registered behind it there is nothing to tell: the view no longer lists a command.
  const gone = shotSteps([
    openInput(before.officer, SHOT.submitting),
    openInput(later, IDLE_SHOT, closed),
    openInput(later, IDLE_SHOT),
  ]);
  assert.deepEqual(gone[2].filter(line => line.private), []);
  // Opened only after the view has stopped listing the shot: it is told as something that happened.
  const resolved = playerVariant(later, v => { v.viewRevision += 1; v.ownPendingCommandIds = []; });
  const past = shotSteps([
    openInput(before.officer, SHOT.submitting),
    openInput(resolved, { ...SHOT.registered, pending: false }, closed),
    openInput(resolved, { ...SHOT.registered, pending: false }),
  ]);
  assert.deepEqual(past[2].filter(line => line.private), [said('polite', 'Your shot at Player 2 was registered.')]);
  // A reloaded page knows no target and says none.
  const reloaded = shotSteps([openInput(before.officer, { step: 'checking', recovered: true }), openInput(later, SHOT.reminder(null), closed), openInput(later, SHOT.reminder(null))]);
  assert.deepEqual(reloaded[2].filter(line => line.private), [said('polite', 'Your shot is registered.')]);
});

test('only the flow’s own lines are marked private, and none of them names a role or an outcome', () => {
  const announcer = createPlayerAnnouncer();
  const lines = [
    openInput(null, IDLE_SHOT, connecting),
    openInput(before.officer),
    openInput(before.officer, SHOT.submitting),
    openInput(before.officer, SHOT.checking, { connection: 'stale' }),
    openInput(before.officer, SHOT.registered),
    openInput(playerVariant(afterRegistration.officer, v => { v.seats[1].health = 'Injured'; }), IDLE_SHOT),
  ].flatMap(input => announcer.next(input));
  assert.deepEqual(lines.map(line => [line.text, line.private === true]), [
    ['Connected. Round 2. Your turn.', false],
    ['Sending your shot to the server…', true],
    ['Connection lost. Showing the last known state.', false],
    ['Checking whether your shot was registered…', true],
    ['Reconnected. Round 2. Your turn.', false],
    ['Shot at Player 2 registered.', true],
    // A later health change is public status. It is never tied to the registration.
    ['Player 2 is now Injured.', false],
  ]);
  for (const line of lines) {
    assert.doesNotMatch(line.text, ROLE_PATTERN);
    if (line.private) assert.doesNotMatch(line.text, /hit|injur|damag|eliminat|block|protect/i);
  }
  // The table display has no command and says nothing about one.
  assert.deepEqual(table([tableInput(before.public), tableInput(afterRegistration.public)]).flat(), ['Connected. Round 2. Player 1’s turn.']);
});

test('a choice taken away by circumstances is said to be unsent; one the player put down is not', () => {
  const choosing = openInput(before.officer, SHOT.confirming);
  const idle = overrides => openInput(before.officer, IDLE_SHOT, overrides);
  const dropped = said('polite', 'Your choice was not sent.');
  // The connection is lost with the confirmation on screen.
  assert.deepEqual(shotSteps([choosing, idle({ connection: 'stale' })])[1], [{ politeness: 'polite', text: 'Connection lost. Showing the last known state.' }, dropped]);
  // The turn's clock runs out.
  assert.deepEqual(shotSteps([choosing, idle({ deadline: expired })])[1], [{ politeness: 'polite', text: 'Time is up. Waiting for phase update.' }, dropped]);
  // The next turn opens while the player is still choosing a target.
  const othersTurn = playerVariant(before.officer, v => { v.viewRevision += 1; v.phase = { ...v.phase, id: 'phase-b' }; v.activeSeatId = 'seat-2'; });
  assert.deepEqual(shotSteps([openInput(before.officer, SHOT.targeting), openInput(othersTurn, IDLE_SHOT)])[1].map(line => line.text), ['Round 2. Player 2’s turn.', 'Your choice was not sent.']);
  // The player cancels: nothing to tell them.
  assert.deepEqual(shotSteps([choosing, idle()])[1], []);
  assert.deepEqual(shotSteps([openInput(before.officer, SHOT.targeting), idle()])[1], []);
  // Dropped because the panel closed: nothing is said then, and nothing about it later.
  assert.deepEqual(shotSteps([choosing, openInput(before.officer, IDLE_SHOT, closed), idle({ connection: 'stale' })]).slice(1).flat().filter(line => line.private), []);
  // A command that was sent is never described this way.
  assert.deepEqual(shotSteps([openInput(before.officer, SHOT.submitting), idle({ connection: 'stale' })])[1].filter(line => line.private), []);
});
