// Panels (design/phone-ui/components/panels): a runtime source the game imports as it is, so its module graph, its
// styles' scope, its inputs, the sheet it gives the shell, the players' public facts and its words are checked here;
// its drawing and lifecycle in a browser under the production headers by design/tools/panels-check.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PANELS_DEFAULTS, PANELS_SHEET_ID, PANELS_VERSION, PANELS_WORDS, PANEL_DESTINATIONS, ROUND_STEP_ICONS, nextPanelsInput, panelsSheet, playerLine, roundOrderLine,
} from '../../../design/phone-ui/components/panels/panels.mjs';
import { ICON_NAMES } from '../../../design/phone-ui/components/icons.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/panels';
const read = path => readFileSync(join(REPO, path), 'utf8');

/** The static imports of a module, resolved: relative ones to files, the rest as package names. */
function graph(entry) {
  const seen = new Map();
  const visit = file => {
    if (seen.has(file)) return;
    const source = readFileSync(file, 'utf8');
    const specifiers = [...source.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s+'([^']+)'|^\s*import\s+'([^']+)'|@import url\("([^"]+)"\)/gm)].map(m => m[1] ?? m[2] ?? m[3]);
    seen.set(file, specifiers);
    for (const s of specifiers) if (s.startsWith('.')) visit(resolve(dirname(file), s));
  };
  visit(entry);
  return seen;
}
function split(list) {
  const out = [''];
  let depth = 0;
  for (const ch of list) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) out.push(''); else out[out.length - 1] += ch;
  }
  return out.map(s => s.trim());
}
function selectors(path) {
  const css = read(path).replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]*;/g, '').replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  return [...css.matchAll(/(^|[{}])([^{}]*?)\{/g)].map(m => m[2].trim()).filter(s => s && !s.startsWith('@')).flatMap(split);
}

const player = (extra = {}) => ({ seat: 1, name: 'Ava', character: 'c8', location: 'Room A', health: 'Healthy', jailed: false, captain: false, officer: false, ...extra });
const live = (extra = {}) => nextPanelsInput(PANELS_DEFAULTS, { viewer: 4, windows: { enabled: true, rooms: [['Room A', 'Room B']] }, navigation: { enabled: false }, hospital: { enabled: false }, players: [player()], ...extra });

test('the component is a runtime source: its whole graph is runtime-safe, and it sends nothing', () => {
  const files = new Map(['panels.mjs', 'panels.css'].flatMap(f => [...graph(join(REPO, COMPONENT, f))]));
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview|pregame-films)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the kit\'s crew-runtime.mjs)');
  const own = graph(join(REPO, COMPONENT, 'panels.mjs')).get(join(REPO, COMPONENT, 'panels.mjs'));
  assert.deepEqual(own, ['../kit/kit.mjs'], 'the kit only: the sheet\'s frame is the shell\'s, which Frontend opens');
  const source = read(`${COMPONENT}/panels.mjs`).replace(/^\s*\/\/.*$/gm, '').replace(/^\s*\*.*$/gm, '');
  assert.doesNotMatch(source, /fetch\(|navigator|localStorage|Date\.now|setInterval|setTimeout|console\./, 'it sends, stores, counts and logs nothing');
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/panels-check.mjs'), /mothership:dev-only/);
});

test('its styles reach nothing outside its root', () => {
  const file = `${COMPONENT}/panels.css`;
  const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
  const list = selectors(file);
  assert.ok(list.length >= 4, `found the rules (${list.length})`);
  for (const selector of list) {
    assert.match(selector, /^\.ms-panels(?:[\s.:[]|$)/, `"${selector}" is scoped`);
    assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
    assert.doesNotMatch(selector, /\.ms-(?:phone-shell|ps-|role-stage|rst-|char-select|cs-|display-settings|settings-sheet|ds-|host-controls|hc-|room-scene)/, `"${selector}" reaches no other component`);
    assert.doesNotMatch(selector, /\.ms-k-/, `"${selector}": no kit part restyled`);
  }
  assert.deepEqual([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]), [], 'no motion of its own');
  assert.match(read(file), /^@import url\("\.\.\/kit\/kit\.css"\);/, 'it starts from the kit\'s stylesheet');
  assert.deepEqual([...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))], [], 'no custom properties of its own');
});

test('its words are the pack\'s (sheet 32), and it holds no step words (the Lead\'s answer 5)', () => {
  const game = read('design/phone-ui/prototype/screens-game.mjs'), more = read('design/phone-ui/prototype/screens-more.mjs');
  const W = PANELS_WORDS;
  for (const words of [W.panels, W.windows, W.navigation, W.navigationLine, W.hospital, W.hospitalLine, W.players, W.playersLine, W.roundOrder, W.roundOrderLine]) {
    assert.ok(game.includes(`'${words}'`), `screens-game.mjs: ${words}`);
  }
  for (const words of [W.players, W.roundOrder, W.captain, W.officer, W.playersNote, W.noWindow, W.inJail, W.injured, W.eliminated]) assert.ok(more.includes(`'${words}'`), `screens-more.mjs: ${words}`);
  assert.ok(game.includes(`'${[W.pair('Room A', 'Room B'), W.pair('Room A', 'Hospital')].join(W.join)}'`), 'the Windows line as the pack writes it');
  assert.ok(more.includes('`${s.name} (you)`') && W.seat(4, 'Dev', true) === '4 · Dev (you)' && W.seat(1, 'Ava', false) === '1 · Ava');
  // The steps are Frontend's, from the ruleset: none of the pack's step words, nor its note, are the component's.
  const source = read(`${COMPONENT}/panels.mjs`);
  for (const words of ['Before turns', 'Ship synchronized', 'Jail vote', 'Officer block', '5 s lit', 'then the offices acknowledge', 'Current order', 'Blackout-before-voting']) {
    assert.ok(!source.includes(words), `no step words of its own: ${words}`);
  }
  // The one line of the Lead's own (18 November): Round order's while no step has its timing. It is not the pack's.
  assert.equal(W.roundOrderPhases, 'The phases, in order');
  assert.ok(!game.includes(W.roundOrderPhases) && !more.includes(W.roundOrderPhases));
  assert.equal(PANELS_VERSION, 'panels-0.2.0');
});

test('the Round order row\'s line follows the steps given: "Phases and timings" once one has its timing, else "The phases, in order"', () => {
  const step = (timing = null) => ({ kind: 'turns', title: 'Player turns', timing });
  assert.equal(roundOrderLine([step('60 s each'), step('15 s')]), 'Phases and timings');
  assert.equal(roundOrderLine([step(), step('15 s')]), 'Phases and timings', 'one timing is enough');
  for (const steps of [[step(), step()], [step('')], [], null, undefined]) assert.equal(roundOrderLine(steps), 'The phases, in order', JSON.stringify(steps));
  // From the component's own normalized input, as mountPanels paints it.
  assert.equal(roundOrderLine(live().steps), 'The phases, in order');
  assert.equal(roundOrderLine(live({ steps: [step('60 s each')] }).steps), 'Phases and timings');
});

test('each step\'s icon is the component\'s by kind, from the shared set, with the Round order icon for an unknown kind', () => {
  for (const [kind, icon] of Object.entries(ROUND_STEP_ICONS)) assert.ok(ICON_NAMES.includes(icon), `${kind}: ${icon} is in the shared icon set`);
  // The pack's six steps (screens-more.mjs rules) draw with the pack's icons.
  assert.deepEqual(['pre-turn', 'turns', 'sync', 'jail-vote', 'blackout', 'navigation'].map(k => ROUND_STEP_ICONS[k]), ['hourglass', 'actions', 'blackhole', 'vote', 'dark', 'course']);
  assert.ok(ICON_NAMES.includes('rules') && !('rules' in ROUND_STEP_ICONS), 'an unknown kind gets the Round order row\'s own icon');
});

test('its inputs are checked, and refused with a reason; a player takes only the public facts', () => {
  const refuses = (input, pattern) => assert.throws(() => nextPanelsInput(PANELS_DEFAULTS, input), pattern);
  refuses({ view: 'windows' }, /view is list, players, round-order/);
  refuses({ status: 'offline' }, /Status is live, stale, concealed/);
  refuses({ viewer: 0 }, /viewer is this phone's seat number/);
  refuses({ navigation: 'yes' }, /navigation is null, or \{ enabled, reason \}/);
  refuses({ windows: { enabled: true, rooms: ['Room A ↔ Room B'] } }, /windows\.rooms are the windows of this player's room/);
  refuses({ players: {} }, /players are \[/);
  refuses({ players: [player({ seat: 0 })] }, /needs their seat number/);
  refuses({ players: [player({ name: '' })] }, /Seat 1 needs its name/);
  refuses({ players: [player(), player()] }, /Seat 1 is given twice/);
  refuses({ players: [player({ health: 'Hurt' })] }, /health is Healthy, Injured, Eliminated/);
  refuses({ players: [player({ jailed: 'yes' })] }, /jailed is true or false/);
  // Public facts only (the Lead's answer 4): a role, a revealed faction or anything else is refused, never kept.
  refuses({ players: [player({ role: 'Doctor' })] }, /only the public facts .* not role/);
  refuses({ players: [player({ revealedFaction: 'Red' })] }, /not revealedFaction/);
  refuses({ steps: [{ kind: 'turns' }] }, /Step 1 needs its kind and its name/);
  refuses({ steps: [{ kind: 'turns', title: 'Turns', timing: 60 }] }, /Step 1's timing is words/);
  const d = nextPanelsInput(PANELS_DEFAULTS, {});
  assert.deepEqual([d.view, d.status, d.windows, d.navigation, d.hospital, d.players, d.steps], ['list', 'live', null, null, null, [], []], 'no destination, player or step until Frontend gives it');
  assert.deepEqual(live().windows, { enabled: true, reason: null, rooms: [['Room A', 'Room B']] });
  assert.deepEqual(live().players[0], player(), 'the eight public facts, as given');
  assert.deepEqual(nextPanelsInput(PANELS_DEFAULTS, { navigation: {} }).navigation, { enabled: true, reason: null }, 'a destination given is enabled unless Frontend says otherwise');
  const once = live({ steps: [{ kind: 'turns', title: 'Turns', timing: '60 s each' }] });
  assert.deepEqual(nextPanelsInput(once, {}), once, 'the checked form is stable');
  assert.deepEqual(PANEL_DESTINATIONS, ['windows', 'navigation', 'hospital', 'players', 'round-order']);
});

test('a player\'s line (the Lead\'s answer 4): "In Jail" in the room\'s place; then Injured or Eliminated; with no room, the health word alone', () => {
  const lineOf = extra => playerLine(nextPanelsInput(PANELS_DEFAULTS, { players: [player(extra)] }).players[0]);
  assert.equal(lineOf({}), 'Room A');
  assert.equal(lineOf({ location: 'Hospital', health: 'Injured' }), 'Hospital · Injured');
  assert.equal(lineOf({ location: 'Room B', health: 'Eliminated' }), 'Room B · Eliminated');
  assert.equal(lineOf({ location: 'Jail', jailed: true }), 'In Jail', 'jailed stays distinct from being in that room: never "Jail · In Jail"');
  assert.equal(lineOf({ location: 'Jail', jailed: true, health: 'Injured' }), 'In Jail · Injured');
  assert.equal(lineOf({ location: 'Jail', jailed: false }), 'Jail', 'in the Jail\'s room without being jailed: the room, as given');
  assert.equal(lineOf({ location: null, health: 'Eliminated' }), 'Eliminated');
  assert.equal(lineOf({ location: null }), '', 'no room and healthy: no line');
});

test('the sheet it gives the shell: "Panels" with ✕ at the shell\'s height; Players and Round order with Back, large', () => {
  assert.deepEqual(panelsSheet(live()), { id: PANELS_SHEET_ID, title: 'Panels', back: false, close: true, detent: 'auto', actions: [] });
  assert.deepEqual(panelsSheet(live({ view: 'players' })), { id: PANELS_SHEET_ID, title: 'Players', back: true, close: true, detent: 'large', actions: [] });
  assert.deepEqual(panelsSheet(live({ view: 'round-order' })), { id: PANELS_SHEET_ID, title: 'Round order', back: true, close: true, detent: 'large', actions: [] });
  assert.equal(PANELS_SHEET_ID, 'panels', 'one id for the three views, so the shell keeps its body through them');
});

test('the check\'s record: every capture, probe check and agreement case passed under the production headers', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/panels-check.mjs');
  assert.ok(record.sourceClean, 'recorded against a clean source');
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 16, 'sheet 32\'s three views, the Captain\'s Navigation, no window, players in Jail, reconnecting and the Largest text, at two sizes');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn, `${key} passed and drew what its state asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
    assert.deepEqual(c.cut, [], `${key}: every word whole`);
    assert.equal(c.openTab, 'panels', `${key}: the Panels tab open under its sheets`);
  }
  for (const size of ['390x844', '430x932']) assert.equal(record.captures[`${size}/jailed`].lines, 'Room A|Command Room|Room B|Room A|Hospital · Injured|In Jail|Room A|Room B|In Jail', `${size}: "In Jail" in the room's place for Fay and Ike; Dev, the viewer, in Room A as the room behind shows`);
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const ids = record.probe.full.checks.map(c => c.id);
  for (const group of ['report', 'refuse', 'windows', 'reconnect', 'players', 'privacy', 'steps', 'focus', 'words', 'layout', 'dispose', 'motion']) assert.ok(ids.some(id => id.startsWith(`${group}:`)), `probe group ${group}`);
  // The Lead's answers (#296), each its own check.
  for (const pattern of [/only Frontend's `enabled` decides, never the line/, /"No window here", still enabled/, /"In Jail" in the room's place/, /only the public facts/, /an unknown kind the Round order icon; no note/, /rows keep taking taps/, /"The phases, in order"/]) {
    assert.ok(ids.some(id => pattern.test(id)), `probe: ${pattern}`);
  }
  const agree = record.agree;
  assert.ok(agree.ok && agree.checks.length === 7 && agree.checks.every(c => c.ok && c.detail.differences.length === 0), 'the sheet agrees with the frozen pack\'s panels, players and rules screens');
  assert.deepEqual(agree.problems, [], 'agreement: no page problem');
  // The one recorded difference: Round order's note, the rules' business (answer 5), at both sizes, and nothing else.
  const recorded = agree.checks.filter(c => c.detail.recorded);
  assert.deepEqual(recorded.map(c => c.id), ['agree: Round order at 390 × 844', 'agree: Round order at 430 × 932']);
  assert.ok(recorded.every(c => /Blackout-before-voting/.test(c.detail.recorded.pack) && c.detail.parts.note.screen === 0));
});
