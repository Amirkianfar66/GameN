// Office decisions (design/phone-ui/components/office-decisions): a runtime source the game imports as it is, so its
// module graph, its styles' scope, its inputs, the contract's positions and commands, the sheet it gives the shell, the
// offices' privacy and its words are checked here; its drawing and lifecycle in a browser under the production headers
// by design/tools/office-decisions-check.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DIRECTIONS, OFFICE_DECISIONS_DEFAULTS, OFFICE_DECISIONS_VERSION, OFFICE_SHEET_ID, OFFICE_WORDS, ROUTE_POSITIONS, nextOfficeDecisionsInput, officeDecisionsSheet,
} from '../../../design/phone-ui/components/office-decisions/office-decisions.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/office-decisions';
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

const NAMES = ['Ava', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ike'];
const SEATS = NAMES.map((name, i) => ({ seat: i + 1, name, character: `c${i + 1}`, note: null }));
const appoint = (extra = {}) => ({ view: 'appoint', viewer: 4, seats: SEATS, choices: [1, 3, 7, 8], chosen: 3, command: { enabled: true }, offices: { captain: 4, officer: null }, ...extra });
const nav = (navigation = {}, extra = {}) => ({ view: 'navigation', viewer: 4, offices: { captain: 4, officer: 3 }, command: { enabled: true }, navigation: { position: 'B1', ...navigation }, ...extra });
const live = input => nextOfficeDecisionsInput(OFFICE_DECISIONS_DEFAULTS, input);

test('the component is a runtime source: its whole graph is runtime-safe, and it sends nothing', () => {
  const files = new Map(['office-decisions.mjs', 'office-decisions.css'].flatMap(f => [...graph(join(REPO, COMPONENT, f))]));
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview|pregame-films)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the kit\'s crew-runtime.mjs)');
  const own = graph(join(REPO, COMPONENT, 'office-decisions.mjs')).get(join(REPO, COMPONENT, 'office-decisions.mjs'));
  assert.deepEqual(own, ['../kit/kit.mjs'], 'the kit only: no runtime import of the contracts, and the sheet\'s frame is the shell\'s');
  const source = read(`${COMPONENT}/office-decisions.mjs`).replace(/^\s*\/\/.*$/gm, '').replace(/^\s*\*.*$/gm, '');
  assert.doesNotMatch(source, /fetch\(|navigator|localStorage|sessionStorage|Date\.now|setInterval|setTimeout|console\./, 'it sends, stores, counts and logs nothing');
  assert.doesNotMatch(source, /innerHTML|outerHTML|insertAdjacentHTML|DOMParser/, 'the route map is made element by element: no markup');
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/office-decisions-check.mjs'), /mothership:dev-only/);
});

test('its styles reach nothing outside its root, and restyle no kit part', () => {
  const file = `${COMPONENT}/office-decisions.css`;
  const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
  const list = selectors(file);
  assert.ok(list.length >= 5, `found the rules (${list.length})`);
  for (const selector of list) {
    assert.match(selector, /^\.ms-office-decisions(?:[\s.:[]|$)/, `"${selector}" is scoped`);
    assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
    assert.doesNotMatch(selector, /\.ms-(?:phone-shell|ps-|role-stage|rst-|char-select|cs-|display-settings|settings-sheet|ds-|host-controls|hc-|panels|pn-|pp-|promises|pr-|windows|wn-|room-scene)/, `"${selector}" reaches no other component`);
    assert.doesNotMatch(selector, /\.ms-k-/, `"${selector}": no kit part restyled`);
  }
  assert.deepEqual([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]), [], 'no motion of its own');
  assert.doesNotMatch(css, /transition|animation/, 'no transition or animation');
  assert.match(read(file), /^@import url\("\.\.\/kit\/kit\.css"\);/, 'it starts from the kit\'s stylesheet');
  assert.deepEqual([...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))], [], 'no custom properties of its own');
  for (const value of ['height: 210px', 'margin: 4px 0 6px', 'border-radius: 16px', 'background: #0B1220', 'grid-template-columns: 1fr 1fr']) assert.ok(css.includes(value), `office-decisions.css: ${value}`);
  // Decision 2: the block's notice is the kit's (0.7.0), not a copy.
  assert.match(read(`${COMPONENT}/office-decisions.mjs`), /kit\.notice\(/, 'the kit\'s notice');
  assert.doesNotMatch(read(`${COMPONENT}/office-decisions.mjs`) + css, /ms-od-notice/, 'no notice of its own');
});

test('its words are the pack\'s (sheets 40 and 41); the rule-stating ones are listed in the doc; names and moves are Frontend\'s', () => {
  const more = read('design/phone-ui/prototype/screens-more.mjs');
  const W = OFFICE_WORDS;
  for (const words of [W.appointTitle, W.appoint('Cleo'), W.selected, W.appointingTitle, W.choosing('Ben'), W.random, W.blockTitle, W.blockLine, W.skip, W.block('Gus'), W.blockedStamp,
    W.cantMove('Gus'), W.everyoneSees, W.navTitle, W.navLine, W.position, W.nextMove, W.beingSet, W.nextValue('Blue', 'B2'), W.acknowledge, W.noVeto, W.tieNote, W.tieMap, W.route('B1')]) {
    assert.ok(more.includes(`'${words}'`), `screens-more.mjs: ${words}`);
  }
  for (const d of DIRECTIONS) assert.ok(more.includes(`button('${d}'`), `the pack's ${d}`);
  // Decision 7: the fixed words that state a rule, listed in the doc as changing with the rules.
  const doc = read('docs/design/components/office-decisions.md');
  for (const words of [W.random, W.blockLine, W.noVeto, W.tieNote, W.tieMap]) assert.ok(doc.includes(`"${words.replaceAll('’', '\'')}"`) || doc.includes(`"${words}"`), `the doc lists: ${words}`);
  // Decision 3: the dimmed cells' notes are Frontend's.
  const source = read(`${COMPONENT}/office-decisions.mjs`).replace(/^\s*\/\/.*$/gm, '');
  for (const words of ['In Hospital', 'Injured', 'In Jail', '\'Out\'', 'Blocked last round', 'You are Captain']) assert.ok(!source.includes(words), `no note of its own: ${words}`);
  assert.equal(W.route('R2'), 'Route: the ship is at R2 on the Red arm');
  assert.equal(W.route('Junction'), 'Route: the ship is at Junction');
  assert.equal(OFFICE_DECISIONS_VERSION, 'office-decisions-0.1.0');
});

test('the positions, directions and commands are the contract\'s; Skip has no command', () => {
  const ts = read('packages/contracts/src/planet-game.ts');
  const positions = ts.match(/PlanetRoutePositionSchema = z\.enum\(\[([^\]]+)\]\)/)[1].split(',').map(s => s.trim().replace(/'/g, ''));
  const directions = ts.match(/PlanetDirectionSchema = z\.enum\(\[([^\]]+)\]\)/)[1].split(',').map(s => s.trim().replace(/'/g, ''));
  assert.deepEqual(ROUTE_POSITIONS, positions, 'the contract\'s route positions, in its order');
  assert.deepEqual(DIRECTIONS, directions, 'the contract\'s directions');
  for (const command of ["type:z.literal('APPOINT_OFFICER'),targetSeatId", "type:z.literal('BLOCK_MOVE'),targetSeatId", "type:z.literal('CHOOSE_NAV_DIRECTION'),direction", "type:z.literal('CONFIRM_NAVIGATION')"]) {
    assert.ok(ts.includes(command), `the contract's ${command}`);
  }
  assert.ok(!/SKIP_BLOCK|SKIP_MOVE|type:z\.literal\('SKIP/.test(ts), 'no skip command: Skip is this phone\'s own (decision 4)');
});

test('its inputs are checked, and refused with a reason', () => {
  const refuses = (input, pattern) => assert.throws(() => live({ viewer: 4, ...input }), pattern);
  refuses({ view: 'captain' }, /view is appoint, appointing, block, blocked, navigation/);
  refuses({ status: 'offline' }, /Status is live, stale, concealed/);
  refuses({ seats: [...SEATS, { seat: 1, name: 'Ava' }] }, /up to nine/);
  refuses({ seats: [SEATS[0], SEATS[0]] }, /Seat 1 is given twice/);
  refuses({ seats: [{ ...SEATS[0], note: 5 }] }, /note is words/);
  refuses({ seats: SEATS, choices: [10] }, /Choice 10 is one of the given seats/);
  refuses({ seats: SEATS, choices: [3, 3] }, /Choice 3 is given twice/);
  refuses({ seats: SEATS, choices: [1], chosen: 3 }, /chosen is one of the choices/);
  refuses({ command: 'go' }, /command is \{ enabled, busy, reason \}/);
  refuses({ captain: { seat: 2 } }, /captain is \{ seat, name, character \}/);
  refuses({ offices: { captain: 12 } }, /offices\.captain is a seat/);
  refuses({ navigation: { position: 'B3' } }, /navigation\.position is Start, Junction/);
  refuses({ navigation: { position: 'B1', direction: 'Green' } }, /direction is Blue, Red, or null/);
  refuses({ navigation: { position: 'B1', confirmation: true, direction: 'Blue' } }, /confirmation names its direction and next position/);
  const d = live({});
  assert.deepEqual([d.view, d.seats, d.choices, d.chosen, d.command.enabled, d.captain, d.navigation], ['appointing', [], [], null, false, null, null], 'nothing to choose until Frontend gives it');
  const once = live(appoint({ seats: SEATS.map(s => (s.seat === 2 ? { ...s, note: 'In Hospital' } : s)) }));
  assert.deepEqual(nextOfficeDecisionsInput(once, {}), once, 'the checked form is stable');
  assert.equal(once.seats[1].note, 'In Hospital', 'a note exactly as given');
});

test('the offices\' privacy (decision 6): Navigation is the Captain\'s and the Officer\'s only, and what is the office\'s leaves with the view, the viewer, or when concealed', () => {
  assert.throws(() => live(nav({}, { viewer: 6 })), /the offices' only/);
  assert.throws(() => live(nav({}, { viewer: null })), /the offices' only/);
  assert.equal(live(nav({}, { viewer: 3 })).navigation.position, 'B1', 'the Officer');
  const s = live(nav({ tie: true }, { offices: { captain: 2, officer: 4 } }));
  const moved = nextOfficeDecisionsInput(s, { viewer: 2 });
  assert.deepEqual([moved.navigation, moved.command.enabled], [null, false], 'a new viewer: the direction and the tie are dropped');
  const viewed = nextOfficeDecisionsInput(s, { view: 'blocked' });
  assert.equal(viewed.navigation, null, 'a new view: dropped');
  const hidden = nextOfficeDecisionsInput(s, { status: 'concealed' });
  assert.equal(hidden.navigation, null, 'concealed: dropped');
  assert.equal(nextOfficeDecisionsInput(hidden, { status: 'live' }).navigation, null, 'nothing comes back by itself');
  const chosen = live(appoint());
  assert.deepEqual([nextOfficeDecisionsInput(chosen, { viewer: 5 }).chosen, nextOfficeDecisionsInput(chosen, { viewer: 5 }).choices], [null, []], 'the choices and the choice too');
  assert.equal(nextOfficeDecisionsInput(chosen, { viewer: 4 }).chosen, 3, 'the same viewer again drops nothing');
});

test('the sheet it gives the shell: the pack\'s titles and lines, no ✕, large; the commands with Frontend\'s state; Skip this phone\'s own', () => {
  const frame = { id: OFFICE_SHEET_ID, back: false, close: false, detent: 'large' };
  assert.deepEqual(officeDecisionsSheet(appoint()), { ...frame, title: 'Choose your Officer', actions: [{ id: 'appoint', label: 'Appoint Cleo', kind: 'primary', icon: 'officer', enabled: true, busy: false, reason: null }] });
  assert.deepEqual(officeDecisionsSheet(appoint({ chosen: null })).actions[0], { id: 'appoint', label: 'Appoint', kind: 'primary', icon: 'officer', enabled: false, busy: false, reason: null }, 'it waits for a choice');
  assert.deepEqual(officeDecisionsSheet({ view: 'appointing', viewer: 4, captain: { seat: 2, name: 'Ben' } }), { ...frame, title: 'Officer appointment', actions: [] });
  assert.deepEqual(officeDecisionsSheet({ view: 'block', viewer: 4, seats: SEATS, choices: [7], chosen: 7, command: { enabled: true, busy: true }, offices: { captain: 2, officer: 4 } }), { ...frame, title: 'Block movement', sub: 'Optional · once a round', actions: [
    { id: 'skip', label: 'Skip', kind: 'secondary', local: true },
    { id: 'block', label: 'Block Gus', kind: 'primary', icon: 'block', enabled: true, busy: true, reason: null },
  ] }, 'Skip is this phone\'s own; Block is the command');
  assert.deepEqual(officeDecisionsSheet({ view: 'blocked', viewer: 4, blocked: { seat: 7, name: 'Gus' } }), { ...frame, title: 'Block movement', sub: 'Optional · once a round', actions: [] });
  assert.deepEqual(officeDecisionsSheet(nav()), { ...frame, title: 'Navigation', sub: 'Only the Captain and Officer see this', actions: [] });
  assert.deepEqual(officeDecisionsSheet(nav({ direction: 'Blue', next: 'B2', confirmation: true }, { command: { enabled: false, reason: 'Acknowledged' } })).actions,
    [{ id: 'acknowledge', label: 'Acknowledge', kind: 'primary', icon: 'acknowledge', enabled: false, busy: false, reason: 'Acknowledged' }], 'Acknowledge, with Frontend\'s reason as given');
  assert.deepEqual(officeDecisionsSheet(nav({ tie: true }, { offices: { captain: 2, officer: 4 } })).actions, [], 'the tie\'s Blue and Red are in the sheet\'s body');
});

test('the check\'s record: every capture, probe check and agreement case passed under the production headers', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/office-decisions-check.mjs');
  assert.ok(record.sourceClean, 'recorded against a clean source');
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 20, 'the offices\' states of sheets 40 and 41, Appoint in flight, reconnecting and the Largest text, at two sizes');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn, `${key} passed and drew what its state asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
    assert.deepEqual(c.cut, [], `${key}: every word whole`);
    assert.ok(!c.close, `${key}: no ✕`);
  }
  for (const size of ['390x844', '430x932']) {
    assert.equal(record.captures[`${size}/stale`].directionsWait, 'Controls return when the match is current', `${size}: reconnecting, Blue and Red wait with the banner's words`);
    assert.equal(record.captures[`${size}/appointing`].portrait, 44, `${size}: the Captain's portrait at 44 px, as drawn`);
    assert.equal(record.captures[`${size}/largest`].list, true, `${size}: the 3 × 3's list form at the Largest text`);
  }
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const ids = record.probe.full.checks.map(c => c.id);
  for (const group of ['choose', 'footer', 'words', 'tie', 'route', 'privacy', 'reconnect', 'focus', 'layout', 'dispose', 'motion']) assert.ok(ids.some(id => id.startsWith(`${group}:`)), `probe group ${group}`);
  const agree = record.agree;
  assert.ok(agree.ok && agree.checks.length === 15 && agree.checks.every(c => c.ok && c.detail.differences.length === 0), 'the sheet agrees with the frozen pack\'s captain, officer and nav screens in each state');
  assert.deepEqual(agree.problems, [], 'agreement: no page problem');
});
