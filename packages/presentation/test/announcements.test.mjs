import assert from 'node:assert/strict';
import test from 'node:test';
import { describePlayerTransition, describeTableTransition } from '@mothership/presentation';
import { fixture, playerInput, playerVariant, publicVariant, ROLE_PATTERN, tableInput } from './support/inputs.mjs';

const { before, afterRegistration } = fixture();
const texts = announcements => announcements.map(item => item.text);
const connecting = { connection: 'connecting', deadline: { kind: 'unsynced' } };

test('the first readable view is announced once with where the match stands', () => {
  const first = describePlayerTransition(playerInput(null, connecting), playerInput(before.officer));
  assert.deepEqual(first, [{ politeness: 'polite', text: 'Connected. Round 2. Your turn.' }]);
  assert.deepEqual(texts(describePlayerTransition(null, playerInput(before.target))), ['Connected. Round 2. Player 1’s turn.']);
  assert.deepEqual(texts(describeTableTransition(null, tableInput(before.public))), ['Connected. Round 2. Player 1’s turn.']);
  assert.deepEqual(describePlayerTransition(playerInput(before.officer), playerInput(before.officer)), []);
});

test('losing and regaining the connection is spoken; what happened in between is not replayed', () => {
  const live = tableInput(before.public);
  const stale = tableInput(before.public, { connection: 'stale' });
  assert.deepEqual(texts(describeTableTransition(live, stale)), ['Connection lost. Showing the last known state.']);
  assert.deepEqual(describeTableTransition(stale, stale), []);
  const later = publicVariant(v => {
    v.round = 3; v.viewRevision += 5; v.phase.id = 'phase-k'; v.activeSeatId = 'seat-4';
    v.seats[1].health = 'Injured'; v.seats[2].location = 'Room B'; v.seats[6].jailed = true;
  });
  assert.deepEqual(texts(describeTableTransition(stale, tableInput(later))), ['Reconnected. Round 3. Player 4’s turn.']);
});

test('a new phase is announced from the listener’s own point of view', () => {
  const next = base => playerVariant(base, v => { v.viewRevision += 1; v.phase = { ...v.phase, id: 'phase-b' }; v.activeSeatId = 'seat-2'; });
  assert.deepEqual(texts(describePlayerTransition(playerInput(before.officer), playerInput(next(before.officer)))), ['Round 2. Player 2’s turn.']);
  assert.deepEqual(texts(describePlayerTransition(playerInput(before.target), playerInput(next(before.target)))), ['Round 2. Your turn.']);
});

test('public seat changes are read as plain status; a health change never names a cause', () => {
  const changed = publicVariant(v => { v.viewRevision += 1; v.seats[1].health = 'Injured'; v.seats[2].location = 'Room B'; });
  const spoken = texts(describeTableTransition(tableInput(before.public), tableInput(changed)));
  assert.deepEqual(spoken, ['Player 2 is now Injured.', 'Player 3 is now in Room B.']);
  for (const text of spoken) assert.doesNotMatch(text, /shot|hit|attack|block|protect/i);

  const flags = publicVariant(v => { v.viewRevision += 1; v.seats[4].captain = false; v.seats[6].jailed = true; });
  assert.deepEqual(texts(describeTableTransition(tableInput(before.public), tableInput(flags))), ['Player 5 is no longer Captain.', 'Player 7 is now jailed.']);
});

test('many simultaneous changes are summarized instead of flooding the listener', () => {
  const many = publicVariant(v => { v.viewRevision += 1; for (const index of [0, 1, 2, 3]) v.seats[index].health = 'Injured'; });
  assert.deepEqual(texts(describeTableTransition(tableInput(before.public), tableInput(many))), ['Several players changed status. Review the player list.']);
});

test('time running out is announced once, and the last seconds only to the player whose turn it is', () => {
  const at = (view, remainingMs) => playerInput(view, { deadline: remainingMs === null ? { kind: 'expired' } : { kind: 'running', remainingMs } });
  assert.deepEqual(texts(describePlayerTransition(at(before.officer, 11_000), at(before.officer, 10_000))), ['10 seconds left.']);
  assert.deepEqual(describePlayerTransition(at(before.officer, 10_000), at(before.officer, 9_000)), []);
  // Returning from the background part-way through still warns, with the true figure.
  assert.deepEqual(texts(describePlayerTransition(at(before.officer, 30_000), at(before.officer, 6_200))), ['7 seconds left.']);
  assert.deepEqual(describePlayerTransition(at(before.target, 11_000), at(before.target, 10_000)), []);
  assert.deepEqual(describeTableTransition(tableInput(before.public, { deadline: { kind: 'running', remainingMs: 11_000 } }), tableInput(before.public, { deadline: { kind: 'running', remainingMs: 10_000 } })), []);
  assert.deepEqual(texts(describePlayerTransition(at(before.officer, 1_000), at(before.officer, null))), ['Time is up. Waiting for phase update.']);
  assert.deepEqual(describePlayerTransition(at(before.officer, null), at(before.officer, null)), []);
});

test('returning from the background voices what the countdown shows once time is re-measured', () => {
  const syncing = playerInput(before.officer, { deadline: { kind: 'unsynced' } });
  const running = remainingMs => playerInput(before.officer, { deadline: { kind: 'running', remainingMs } });
  assert.deepEqual(texts(describePlayerTransition(syncing, running(6_500))), ['7 seconds left.']);
  assert.deepEqual(describePlayerTransition(syncing, running(40_000)), []);
  assert.deepEqual(texts(describePlayerTransition(syncing, playerInput(before.officer, { deadline: { kind: 'expired' } }))), ['Time is up. Waiting for phase update.']);
  assert.deepEqual(describePlayerTransition(running(40_000), syncing), []);
});

test('expiry is voiced while stale, and reconnecting does not repeat it', () => {
  const stale = deadline => tableInput(before.public, { connection: 'stale', deadline });
  const live = deadline => tableInput(before.public, { deadline });
  assert.deepEqual(texts(describeTableTransition(stale({ kind: 'running', remainingMs: 900 }), stale({ kind: 'expired' }))), ['Time is up. Waiting for phase update.']);
  assert.deepEqual(texts(describeTableTransition(stale({ kind: 'expired' }), live({ kind: 'expired' }))), ['Reconnected. Round 2. Player 1’s turn.']);
  assert.deepEqual(texts(describeTableTransition(stale({ kind: 'unsynced' }), live({ kind: 'expired' }))), ['Reconnected. Round 2. Player 1’s turn. Time is up. Waiting for phase update.']);
});

test('connecting to a phase that has already run out says so', () => {
  assert.deepEqual(texts(describeTableTransition(null, tableInput(before.public, { deadline: { kind: 'expired' } }))), ['Connected. Round 2. Player 1’s turn. Time is up. Waiting for phase update.']);
});

test('blocking problems interrupt; an unreadable update is reported without replacing the view', () => {
  assert.deepEqual(describePlayerTransition(playerInput(before.officer), playerInput(before.officer, { problem: 'incompatible-protocol' })), [{ politeness: 'assertive', text: 'Update required.' }]);
  assert.deepEqual(describeTableTransition(tableInput(before.public), tableInput(before.public, { problem: 'integrity' })), [{ politeness: 'assertive', text: 'Match data check failed.' }]);
  const blocked = playerInput(before.officer, { problem: 'integrity' });
  assert.deepEqual(describePlayerTransition(blocked, blocked), []);
  assert.deepEqual(texts(describeTableTransition(tableInput(before.public), tableInput(before.public, { problem: 'unreadable-update' }))), ['The latest update could not be read.']);
  // Recovering from an unreadable update is not a reconnection, and is not described as one.
  assert.deepEqual(texts(describeTableTransition(tableInput(before.public, { problem: 'unreadable-update' }), tableInput(before.public))), ['Up to date again. Round 2. Player 1’s turn.']);
  assert.deepEqual(texts(describeTableTransition(tableInput(before.public, { connection: 'stale', problem: 'unreadable-update' }), tableInput(before.public))), ['Reconnected. Round 2. Player 1’s turn.']);
  assert.deepEqual(texts(describeTableTransition(tableInput(null, connecting), tableInput(null, { ...connecting, problem: 'unreadable-update' }))), ['The latest update could not be read.']);
});

test('nothing is spoken because of a hidden registration, and no announcement can name a role', () => {
  assert.deepEqual(describeTableTransition(tableInput(before.public), tableInput(afterRegistration.public)), []);
  assert.deepEqual(describePlayerTransition(playerInput(before.target), playerInput(afterRegistration.target)), []);
  // The Officer's own phone stays silent too: registration feedback belongs to the command flow.
  const officer = describePlayerTransition(playerInput(before.officer), playerInput(afterRegistration.officer));
  assert.deepEqual(officer, []);
  const everything = [
    ...describePlayerTransition(null, playerInput(before.officer, { privacy: { concealed: false, roleDrawerOpen: true } })),
    ...describePlayerTransition(playerInput(before.officer, { connection: 'stale' }), playerInput(afterRegistration.officer)),
  ];
  for (const item of everything) assert.doesNotMatch(item.text, ROLE_PATTERN);
});
