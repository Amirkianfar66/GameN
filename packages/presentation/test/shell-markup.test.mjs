import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPlayerShellModel, buildTableShellModel, renderPlayerShell, renderTableShell, SHELL_IDS, splitRegions, textOf, toHtml,
} from '@mothership/presentation';
import { fixture, playerInput, playerVariant, publicVariant, ROLE_NAMES, ROLE_PATTERN, tableInput } from './support/inputs.mjs';
import { auditMarkup, byClass, byId, byRegion, byTag, find, findAll, identifierValues } from './support/markup-audit.mjs';

const { before, afterRegistration } = fixture();
const player = (view, overrides) => renderPlayerShell(buildPlayerShellModel(playerInput(view, overrides)));
const table = (view, overrides) => renderTableShell(buildTableShellModel(tableInput(view, overrides)));
const open = { privacy: { concealed: false, revealed: true } };

const screens = {
  'player match': () => player(before.officer),
  'player match, private panel open': () => player(before.officer, open),
  'player match, concealed': () => player(before.officer, { privacy: { concealed: true, revealed: true } }),
  'player stale': () => player(before.target, { connection: 'stale' }),
  'player stale, private panel open': () => player(before.target, { connection: 'stale', ...open }),
  'player connecting': () => player(null, { connection: 'connecting', deadline: { kind: 'unsynced' } }),
  'player blocked': () => player(before.officer, { problem: 'incompatible-protocol' }),
  'player integrity': () => player(before.officer, { problem: 'integrity' }),
  'table match': () => table(before.public),
  'table expired': () => table(before.public, { deadline: { kind: 'expired' } }),
  'table resolution': () => table(publicVariant(v => { v.phase = { id: 'phase-c', kind: 'ROUND_RESOLUTION', startedAt: v.phase.endsAt, endsAt: null }; v.activeSeatId = null; }), { deadline: { kind: 'none' } }),
  'table connecting': () => table(null, { connection: 'connecting', problem: 'unreadable-update' }),
  'table blocked': () => table(before.public, { problem: 'integrity' }),
};

test('every screen passes the structural accessibility audit', () => {
  for (const [name, render] of Object.entries(screens)) {
    assert.deepEqual(auditMarkup(render()), [], name);
  }
});

test('every screen has a skip link, one main landmark that can take focus, and a visible data-source note', () => {
  for (const [name, render] of Object.entries(screens)) {
    const root = render();
    assert.equal(find(root, byTag('a')).attrs.href, `#${SHELL_IDS.main}`, name);
    assert.equal(find(root, byTag('main')).attrs.tabindex, '-1', name);
    assert.match(textOf(find(root, byId('ms-banner-source'))), /^Fixture data\./, name);
  }
});

test('the table display never renders a role, a private control or an intent that could act for a player', () => {
  for (const view of [before.public, afterRegistration.public]) {
    const root = table(view);
    const html = toHtml(root);
    for (const role of ROLE_NAMES) assert.equal(html.includes(role), false, role);
    assert.equal(findAll(root, byRegion('private')).length, 0);
    assert.equal(findAll(root, byClass('ms-card')).length, 0);
    const intents = findAll(root, element => element.attrs['data-intent'] !== undefined).map(element => element.attrs['data-intent']);
    assert.deepEqual(intents, ['settings/reduce-motion']);
  }
});

test('a hidden registration leaves the table and the target phone byte-for-byte unchanged', () => {
  assert.equal(toHtml(table(afterRegistration.public)), toHtml(table(before.public)));
  assert.equal(toHtml(player(afterRegistration.target, open)), toHtml(player(before.target, open)));
});

test('the role and the action status exist in the document only while the private panel is open in the foreground', () => {
  for (const view of [before.officer, before.target]) {
    const closed = player(view);
    const html = toHtml(closed);
    for (const word of [...ROLE_NAMES, 'Available', 'Not available', 'Shot', 'Choose a target', 'data-status', 'data-step', 'ms-card', 'ms-shot', 'shot/']) assert.equal(html.includes(word), false, word);
    const panel = find(closed, byId(SHELL_IDS.privatePanel));
    assert.equal(panel.attrs.hidden, true);
    assert.deepEqual(panel.children, []);
    const toggle = find(closed, byId(SHELL_IDS.privateToggle));
    assert.equal(toggle.attrs['aria-expanded'], 'false');
    assert.equal(toggle.attrs['aria-controls'], SHELL_IDS.privatePanel);
    assert.equal(textOf(toggle), 'Show private information');
  }

  const shown = player(before.officer, open);
  assert.equal(textOf(find(shown, byId(SHELL_IDS.privatePanel))), 'Your roleOfficerActionsShotAvailableChoose a target');
  assert.equal(find(shown, byId(SHELL_IDS.privatePanel)).attrs.hidden, undefined);
  assert.equal(find(shown, byId(SHELL_IDS.privateToggle)).attrs['aria-expanded'], 'true');
  assert.equal(textOf(find(shown, byId(SHELL_IDS.privateToggle))), 'Hide private information');
  assert.equal(toHtml(shown).split('Officer').length - 1, 1, 'The role is stated once, inside the panel');

  const concealed = player(before.officer, { privacy: { concealed: true, revealed: true } });
  assert.equal(toHtml(concealed).includes('Officer'), false);
  assert.equal(findAll(concealed, byClass('ms-card')).length, 0);
  assert.equal(find(concealed, byId(SHELL_IDS.privateToggle)).attrs['aria-expanded'], 'false');
});

test('identifiers, classes and data attributes are role-neutral even with the private panel open', () => {
  for (const view of [before.officer, before.target, afterRegistration.officer]) {
    for (const value of identifierValues(player(view, open))) assert.doesNotMatch(value, ROLE_PATTERN, value);
  }
  for (const value of identifierValues(table(before.public))) assert.doesNotMatch(value, ROLE_PATTERN, value);
});

test('a closed phone is the same document whatever role it holds or what it can do; open, only the supplied facts differ', () => {
  for (const role of ROLE_NAMES) {
    for (const shotAvailable of [true, false]) {
      const reassigned = playerVariant(before.officer, v => { v.self.role = role; v.self.shotAvailable = shotAvailable; });
      assert.equal(toHtml(player(reassigned)), toHtml(player(before.officer)), `${role} ${shotAvailable}`);
    }
    const reassigned = playerVariant(before.officer, v => { v.self.role = role; });
    assert.equal(toHtml(player(reassigned, open)), toHtml(player(before.officer, open)).replace('Officer', role), role);
  }
});

test('status is never carried by color alone: every seat marker and action state has visible text', () => {
  const root = player(playerVariant(before.officer, v => { v.seats[1].health = 'Injured'; v.seats[1].jailed = true; }));
  for (const marker of findAll(root, byClass('ms-marker'))) assert.notEqual(textOf(marker).trim(), '');
  const injured = findAll(root, element => element.attrs['data-seat'] === 'seat-2')[0];
  assert.equal(textOf(injured), '2Player 2: Injured, Jailed');
  const shown = player(before.officer, open);
  assert.equal(textOf(find(shown, byClass('ms-card__status'))), 'Available');
  assert.equal(find(shown, byClass('ms-card__state')).attrs['data-status'], 'available');
  assert.equal(textOf(find(player(before.target, open), byClass('ms-card__status'))), 'Not available');
});

test('the countdown is a timer that is not announced every second, with a spoken equivalent', () => {
  const root = table(before.public, { deadline: { kind: 'running', remainingMs: 9_500 } });
  const timer = find(root, element => element.attrs.role === 'timer');
  assert.equal(timer.attrs['aria-live'], 'off');
  assert.equal(timer.attrs['aria-label'], 'Time remaining');
  assert.equal(textOf(timer), '0:1010 seconds remaining');
  assert.equal(find(timer, byClass('ms-timer__digits')).attrs['aria-hidden'], 'true');
  assert.equal(find(root, byRegion('timer')).attrs['data-final'], 'true');
  assert.match(textOf(find(table(before.public, { deadline: { kind: 'expired' } }), byRegion('timer'))), /Waiting for phase update$/);
  const none = find(table(before.public, { deadline: { kind: 'none' } }), byRegion('timer'));
  assert.equal(textOf(none), 'This phase has no timer');
  assert.equal(findAll(none, element => element.attrs.role === 'timer').length, 0);
});

test('a countdown tick replaces only the timer region', () => {
  const split = remainingMs => splitRegions(player(before.officer, { deadline: { kind: 'running', remainingMs } }));
  const first = split(42_000);
  const second = split(41_000);
  assert.equal(first.frameHtml, second.frameHtml);
  assert.deepEqual(first.rootAttrs, second.rootAttrs);
  const changed = [...first.regions.keys()].filter(id => first.regions.get(id) !== second.regions.get(id));
  assert.deepEqual(changed, ['timer']);
  assert.deepEqual([...first.regions.keys()], ['banners', 'phase', 'timer', 'location', 'private', 'roster', 'settings', 'details']);
});

test('opening the private panel replaces only its own region, so focus elsewhere is untouched', () => {
  const closed = splitRegions(player(before.officer));
  const shown = splitRegions(player(before.officer, open));
  assert.equal(closed.frameHtml, shown.frameHtml);
  assert.deepEqual([...closed.regions.keys()].filter(id => closed.regions.get(id) !== shown.regions.get(id)), ['private']);
  // What the open panel holds is drawn in regions of its own, listed after the panel they sit in.
  assert.deepEqual([...shown.regions.keys()], ['banners', 'phase', 'timer', 'location', 'private', 'actions', 'shot', 'shot-controls', 'roster', 'settings', 'details']);
});

test('a hidden registration touches only the Shot card of the registering phone, and only while the panel is open', () => {
  const regions = (view, overrides) => splitRegions(player(view, overrides)).regions;
  const changed = (a, b) => [...a.keys()].filter(id => a.get(id) !== b.get(id));
  assert.deepEqual(changed(regions(before.officer), regions(afterRegistration.officer)), []);
  // The card, and the row of controls inside it, which the registered card no longer has.
  assert.deepEqual(changed(regions(before.officer, open), regions(afterRegistration.officer, open)), ['shot', 'shot-controls']);
});

test('the shell root states surface, screen, connection, data source and motion for styling and tests', () => {
  assert.deepEqual(splitRegions(player(before.officer, { connection: 'stale', motion: { reducedMotion: true, followsDevice: false } })).rootAttrs, {
    class: 'ms-shell ms-shell--player', 'data-surface': 'player', 'data-screen': 'match', 'data-connection': 'stale', 'data-mode': 'fixture', 'data-motion': 'reduced',
  });
});

test('the reduce-motion control is a labeled checkbox with a described state', () => {
  const root = table(before.public, { motion: { reducedMotion: true, followsDevice: true } });
  const checkbox = find(root, byId(SHELL_IDS.reduceMotion));
  assert.equal(checkbox.attrs.type, 'checkbox');
  assert.equal(checkbox.attrs.checked, true);
  assert.equal(checkbox.attrs['data-intent'], 'settings/reduce-motion');
  assert.equal(textOf(find(root, element => element.attrs.for === SHELL_IDS.reduceMotion)), 'Reduce motion');
  assert.equal(textOf(find(root, byId(checkbox.attrs['aria-describedby']))), 'On because this device asks for reduced motion.');
  assert.equal(find(table(before.public), byId(SHELL_IDS.reduceMotion)).attrs.checked, undefined);
});

test('the blocked screen moves a focusable heading into place and offers exactly one way forward', () => {
  const root = player(before.officer, { problem: 'incompatible-protocol', ...open });
  const heading = find(root, byId(SHELL_IDS.blockedHeading));
  assert.equal(heading.tag, 'h1');
  assert.equal(heading.attrs.tabindex, '-1');
  assert.equal(textOf(heading), 'Update required');
  const buttons = findAll(root, byTag('button'));
  assert.deepEqual(buttons.map(button => [textOf(button), button.attrs['data-intent']]), [['Reload', 'app/reload']]);
  assert.equal(toHtml(root).includes('Officer'), false);
  assert.equal(findAll(root, byClass('ms-seat')).length, 0);
});

test('the stale banner offers a keyboard-reachable reconnect and the last view stays readable', () => {
  const root = player(before.officer, { connection: 'stale' });
  const banner = find(root, byId('ms-banner-connection'));
  assert.match(textOf(banner), /^Connection lost\. Showing the last known state/);
  const action = find(banner, byTag('button'));
  assert.equal(action.attrs['data-intent'], 'session/reconnect');
  assert.equal(textOf(action), 'Reconnect now');
  assert.equal(findAll(root, byClass('ms-seat')).length > 0, true);
  assert.equal(findAll(root, byClass('ms-notice')).length, 0, 'the paused notice is private-panel content');
  assert.equal(textOf(find(player(before.officer, { connection: 'stale', ...open }), byClass('ms-notice'))), 'Actions are paused until the connection is restored.');
});

test('the table roster is a real table: caption, column and row headers, one row per seat', () => {
  const root = table(before.public);
  const roster = find(root, byTag('table'));
  assert.equal(textOf(find(roster, byTag('caption'))), 'Public status of every player');
  assert.deepEqual(findAll(roster, element => element.tag === 'th' && element.attrs.scope === 'col').map(textOf), ['Player', 'Location', 'Health', 'Status']);
  const rows = findAll(find(roster, byTag('tbody')), byTag('tr'));
  assert.equal(rows.length, 9);
  assert.deepEqual(rows[0].children.map(textOf), ['Player 1', 'Room A', 'Healthy', 'Active turn']);
  assert.deepEqual(rows[1].children.map(textOf), ['Player 2', 'Room A', 'Healthy', 'None']);
  assert.deepEqual(rows[4].children.map(textOf), ['Player 5', 'Command Room', 'Healthy', 'Captain']);
  // A sideways-scrollable region must be reachable and scrollable from the keyboard.
  const region = find(root, byRegion('roster'));
  assert.deepEqual([region.attrs.tabindex, region.attrs.id, region.attrs['aria-labelledby']], ['0', 'ms-roster', 'ms-roster-heading']);
});

test('the roster keeps Jail, Captain and turn as separately named facts beside health', () => {
  const view = publicVariant(v => { v.seats[0].jailed = true; v.seats[0].captain = true; v.seats[0].health = 'Injured'; });
  const row = findAll(find(table(view), byTag('tbody')), byTag('tr'))[0];
  assert.deepEqual(row.children.map(textOf), ['Player 1', 'Room A', 'Injured', 'Active turn, Jailed, Captain']);
});

test('text supplied by the server is escaped, including free-form version strings', () => {
  const view = publicVariant(v => { v.versions.engineVersion = '<script>alert(1)</script>'; });
  const html = toHtml(table(view));
  assert.equal(html.includes('<script>'), false);
  assert.equal(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), true);
});

test('the board gives each zone a heading that names its token list', () => {
  const root = table(before.public);
  const zones = findAll(find(root, byRegion('board')), byClass('ms-zone'));
  assert.deepEqual(zones.map(zone => textOf(find(zone, byTag('h3')))), ['Room A', 'Room B', 'Command Room', 'Hospital', 'Jail']);
  const roomA = zones[0];
  assert.equal(find(roomA, byClass('ms-seats')).attrs['aria-labelledby'], find(roomA, byTag('h3')).attrs.id);
  assert.equal(textOf(find(zones[3], byClass('ms-zone__empty'))), 'No players here.');
  assert.equal(find(roomA, byClass('ms-token')).attrs['aria-hidden'], 'true');
});
