import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPlayerShellModel, buildTableShellModel, formatClock } from '@mothership/presentation';
import { fixture, playerInput, playerVariant, publicVariant, tableInput } from './support/inputs.mjs';

const { before, afterRegistration } = fixture();

test('the Officer phone states identity, phase, location and shot status from its own view only', () => {
  const model = buildPlayerShellModel(playerInput(before.officer));
  assert.equal(model.surface, 'player');
  assert.equal(model.screen, 'match');
  assert.equal(model.title, 'Mothership — Player 1');
  assert.deepEqual(model.match.identity, { seatId: 'seat-1', number: 1, label: 'Player 1' });
  assert.equal(model.match.phase.roundLabel, 'Round 2');
  assert.equal(model.match.phase.phaseLabel, 'Your turn');
  assert.equal(model.match.location.name, 'Room A');
  assert.deepEqual(model.match.location.others.map(seat => seat.label), ['Player 2', 'Player 3', 'Player 4', 'Player 6']);
  assert.deepEqual(model.match.actions.cards, [{ id: 'shot', title: 'Shot', status: 'available', statusLabel: 'Available' }]);
});

test('the target phone names the active player and never claims a turn it does not have', () => {
  const model = buildPlayerShellModel(playerInput(before.target));
  assert.equal(model.title, 'Mothership — Player 2');
  assert.equal(model.match.phase.phaseLabel, 'Player 1’s turn');
  assert.equal(model.match.actions.cards[0].status, 'unavailable');
  assert.equal(model.match.actions.cards[0].statusLabel, 'Not available');
  const self = model.match.location.self;
  assert.equal(self.label, 'Player 2 (you)');
  assert.equal(self.isActive, false);
});

test('both phones get the same action cards so a layout never reveals the role dealt to it', () => {
  const officer = buildPlayerShellModel(playerInput(before.officer)).match.actions.cards;
  const target = buildPlayerShellModel(playerInput(before.target)).match.actions.cards;
  assert.deepEqual(officer.map(card => [card.id, card.title]), target.map(card => [card.id, card.title]));
});

test('seat markers keep health, Jail, Captain and turn as separate labeled facts', () => {
  const view = publicVariant(v => {
    v.seats[1].health = 'Injured';
    v.seats[1].jailed = true;
    v.seats[2].health = 'Eliminated';
  });
  const seats = buildTableShellModel(tableInput(view)).match.roster.rows.map(row => row.seat);
  const labels = number => seats.find(seat => seat.number === number).markers.map(marker => `${marker.kind}:${marker.label}`);
  assert.deepEqual(labels(1), ['turn:Active turn', 'health:Healthy']);
  assert.deepEqual(labels(2), ['health:Injured', 'jail:Jailed']);
  assert.deepEqual(labels(3), ['health:Eliminated']);
  assert.deepEqual(labels(5), ['health:Healthy', 'captain:Captain']);
  // Jail is a flag of its own: the seat keeps the location the view gave it.
  assert.equal(seats.find(seat => seat.number === 2).location, 'Room A');
});

test('zones list every supplied seat once, in seat order, and show the Final Zone only when occupied', () => {
  const zones = buildTableShellModel(tableInput(before.public)).match.board.zones;
  assert.deepEqual(zones.map(zone => [zone.name, zone.seats.map(seat => seat.number)]), [
    ['Room A', [1, 2, 3, 4, 6]], ['Room B', [7, 8, 9]], ['Command Room', [5]], ['Hospital', []], ['Jail', []],
  ]);
  const shuffled = publicVariant(v => { v.seats.reverse(); v.seats[0].location = 'Final Zone'; });
  const withFinal = buildTableShellModel(tableInput(shuffled)).match.board.zones;
  assert.deepEqual(withFinal.at(-1).name, 'Final Zone');
  assert.deepEqual(withFinal.at(-1).seats.map(seat => seat.number), [9]);
  assert.deepEqual(withFinal.flatMap(zone => zone.seats.map(seat => seat.number)).sort(), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test('the countdown rounds up, never shows zero while time remains, and distinguishes every non-running state', () => {
  const timer = deadline => buildTableShellModel(tableInput(before.public, { deadline })).match.phase.timer;
  assert.deepEqual(timer({ kind: 'running', remainingMs: 60_000 }), { state: 'running', display: '1:00', spoken: '60 seconds remaining', finalSeconds: false });
  assert.equal(timer({ kind: 'running', remainingMs: 59_999 }).display, '1:00');
  assert.equal(timer({ kind: 'running', remainingMs: 59_000 }).display, '0:59');
  assert.deepEqual(timer({ kind: 'running', remainingMs: 10_000 }), { state: 'running', display: '0:10', spoken: '10 seconds remaining', finalSeconds: true });
  assert.deepEqual(timer({ kind: 'running', remainingMs: 1 }), { state: 'running', display: '0:01', spoken: '1 second remaining', finalSeconds: true });
  assert.deepEqual(timer({ kind: 'expired' }), { state: 'expired', display: '0:00', spoken: 'Time is up', note: 'Waiting for phase update' });
  assert.deepEqual(timer({ kind: 'unsynced' }), { state: 'syncing', display: '–:––', spoken: 'Syncing time with the server' });
  assert.deepEqual(timer({ kind: 'none' }), { state: 'none', spoken: 'This phase has no timer' });
  assert.equal(formatClock(125), '2:05');
});

test('round resolution has no countdown and names nobody as active', () => {
  const view = publicVariant(v => {
    v.phase = { id: 'phase-c', kind: 'ROUND_RESOLUTION', startedAt: v.phase.endsAt, endsAt: null };
    v.activeSeatId = null;
  });
  const model = buildTableShellModel(tableInput(view, { deadline: { kind: 'none' } }));
  assert.equal(model.match.phase.phaseLabel, 'Round resolution');
  assert.equal(model.match.phase.detail, 'The round is being resolved.');
  assert.equal(model.match.phase.timer.state, 'none');
  assert.equal(model.match.roster.rows.some(row => row.seat.isActive), false);
});

test('an ordinary turn without an active seat is shown as given, not guessed', () => {
  const view = publicVariant(v => { v.activeSeatId = null; });
  assert.equal(buildTableShellModel(tableInput(view)).match.phase.phaseLabel, 'Turn in progress');
});

test('a closed or concealed role drawer contains no role anywhere in the model', () => {
  const closed = buildPlayerShellModel(playerInput(before.officer));
  assert.equal(closed.match.roleDrawer.open, false);
  assert.equal(closed.match.roleDrawer.role, null);
  assert.equal(JSON.stringify(closed).includes('Officer'), false);

  const open = buildPlayerShellModel(playerInput(before.officer, { privacy: { concealed: false, roleDrawerOpen: true } }));
  assert.deepEqual(open.match.roleDrawer.role, { label: 'Your role', name: 'Officer' });
  assert.equal(open.match.roleDrawer.toggleLabel, 'Hide my role');

  const concealed = buildPlayerShellModel(playerInput(before.officer, { privacy: { concealed: true, roleDrawerOpen: true } }));
  assert.equal(concealed.match.roleDrawer.open, false);
  assert.equal(concealed.match.roleDrawer.role, null);
  assert.deepEqual(concealed.match.actions.cards, []);
  assert.equal(concealed.match.actions.concealedText, 'Private controls are hidden while the app is in the background.');
  assert.equal(JSON.stringify(concealed).includes('Officer'), false);
  assert.equal(JSON.stringify(concealed).includes('Available'), false);
});

test('stale and expired states pause actions with a reason and keep the last view readable', () => {
  const stale = buildPlayerShellModel(playerInput(before.officer, { connection: 'stale' }));
  assert.equal(stale.screen, 'match');
  assert.equal(stale.match.actions.notice, 'Actions are paused until the connection is restored.');
  assert.deepEqual(stale.banners.map(banner => banner.variant), ['fixture', 'stale']);
  assert.deepEqual(stale.banners[1].action, { intent: 'session/reconnect', label: 'Reconnect now' });
  assert.equal(stale.match.location.name, 'Room A');

  const expired = buildPlayerShellModel(playerInput(before.officer, { deadline: { kind: 'expired' } }));
  assert.equal(expired.match.actions.notice, 'This phase has ended. Waiting for phase update.');
  assert.equal(expired.match.phase.timer.note, 'Waiting for phase update');

  const unreadable = buildPlayerShellModel(playerInput(before.officer, { problem: 'unreadable-update' }));
  assert.equal(unreadable.screen, 'match');
  assert.deepEqual(unreadable.banners.map(banner => banner.variant), ['fixture', 'unreadable']);
  assert.equal(unreadable.match.actions.notice, 'Actions are paused until the connection is restored.');
});

test('the data source is always labeled unless it is the live server', () => {
  const variants = mode => buildTableShellModel(tableInput(before.public, { mode })).banners.map(banner => banner.variant);
  assert.deepEqual(variants('fixture'), ['fixture']);
  assert.deepEqual(variants('emulator'), ['emulator']);
  assert.deepEqual(variants('production'), []);
  const details = mode => buildTableShellModel(tableInput(before.public, { mode })).match.details.entries.find(entry => entry.term === 'Data source').value;
  assert.equal(details('fixture'), 'Fixture (synthetic)');
  assert.equal(details('emulator'), 'Local emulator');
});

test('blocking problems replace the match entirely; nothing from the view is carried along', () => {
  for (const [problem, heading] of [['incompatible-protocol', 'Update required'], ['integrity', 'Match data check failed']]) {
    const player = buildPlayerShellModel(playerInput(before.officer, { problem, privacy: { concealed: false, roleDrawerOpen: true } }));
    assert.equal(player.screen, 'blocked');
    assert.equal(player.match, null);
    assert.equal(player.blocked.heading, heading);
    assert.deepEqual(player.blocked.action, { intent: 'app/reload', label: 'Reload' });
    assert.equal(JSON.stringify(player).includes('Officer'), false);
    assert.equal(player.title, 'Mothership — Player');
    const table = buildTableShellModel(tableInput(before.public, { problem }));
    assert.equal(table.screen, 'blocked');
    assert.equal(table.match, null);
  }
});

test('with no view yet the shell says it is connecting and invents nothing', () => {
  const model = buildPlayerShellModel(playerInput(null, { connection: 'connecting', deadline: { kind: 'unsynced' } }));
  assert.equal(model.screen, 'connecting');
  assert.equal(model.match, null);
  assert.equal(model.connectingText, 'Connecting to the match…');
  const unreadable = buildTableShellModel(tableInput(null, { connection: 'connecting', problem: 'unreadable-update' }));
  assert.equal(unreadable.screen, 'connecting');
  assert.equal(unreadable.banners.at(-1).text, 'The latest update could not be read. Waiting for a readable update.');
});

test('the motion setting reports its source truthfully', () => {
  const settings = motion => buildTableShellModel(tableInput(before.public, { motion })).settings.reduceMotion;
  assert.deepEqual(settings({ reducedMotion: false, followsDevice: true }), { label: 'Reduce motion', checked: false, hint: 'Follows this device’s setting.' });
  assert.equal(settings({ reducedMotion: true, followsDevice: true }).hint, 'On because this device asks for reduced motion.');
  assert.equal(settings({ reducedMotion: true, followsDevice: false }).hint, 'Set on this device for this session.');
  assert.equal(buildTableShellModel(tableInput(before.public, { motion: { reducedMotion: true, followsDevice: false } })).motion, 'reduced');
});

test('registering a hidden shot changes nothing in the table model or the target phone model', () => {
  assert.deepEqual(buildTableShellModel(tableInput(afterRegistration.public)), buildTableShellModel(tableInput(before.public)));
  assert.deepEqual(buildPlayerShellModel(playerInput(afterRegistration.target)), buildPlayerShellModel(playerInput(before.target)));
  const officerBefore = buildPlayerShellModel(playerInput(before.officer));
  const officerAfter = buildPlayerShellModel(playerInput(afterRegistration.officer));
  assert.equal(officerAfter.match.actions.cards[0].status, 'unavailable');
  // Only the Officer's own action status differs; every public part of the phone is identical.
  assert.deepEqual({ ...officerAfter.match, actions: null }, { ...officerBefore.match, actions: null });
});

test('Protection truth never reaches a model: both fixture variants render identically for every audience', () => {
  const guarded = fixture('protected');
  const open = fixture('unprotected');
  for (const stage of ['before', 'afterRegistration']) {
    assert.deepEqual(buildTableShellModel(tableInput(guarded[stage].public)), buildTableShellModel(tableInput(open[stage].public)));
    for (const seat of ['officer', 'target']) {
      const privacy = { concealed: false, roleDrawerOpen: true };
      assert.deepEqual(buildPlayerShellModel(playerInput(guarded[stage][seat], { privacy })), buildPlayerShellModel(playerInput(open[stage][seat], { privacy })));
    }
  }
});

test('match details quote the pinned versions and truncate the hash for display', () => {
  const entries = Object.fromEntries(buildTableShellModel(tableInput(before.public)).match.details.entries.map(entry => [entry.term, entry.value]));
  assert.equal(entries.Match, 'fixture-match-a');
  assert.equal(entries.Protocol, '1');
  assert.equal(entries.Ruleset, 'fixture-source-2026-09-26');
  assert.equal(entries['Ruleset hash'], '34e7c08cda13…');
  assert.equal(entries.Engine, '0.0.0-bootstrap-no-engine');
});

test('a Captain who is not in the Command Room keeps the marker without any location inference', () => {
  const view = playerVariant(before.officer, v => { v.seats[4].location = 'Room B'; });
  const captain = buildPlayerShellModel(playerInput(view)).match.roster.zones.find(zone => zone.name === 'Room B').seats.find(seat => seat.number === 5);
  assert.deepEqual(captain.markers.map(marker => marker.label), ['Healthy', 'Captain']);
});
