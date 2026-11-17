// The Captain console (design/phone-ui/components/captain-console): a runtime source the game imports as it is, so its
// module graph, its styles' scope, its inputs, the plates' art, the contract's commands, the sheet it gives the shell,
// the Captain's privacy and its words are checked here; its drawing and lifecycle in a browser under the production
// headers by design/tools/captain-console-check.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CAPTAIN_CONSOLE_DEFAULTS, CAPTAIN_CONSOLE_SHEET_ID, CAPTAIN_CONSOLE_VERSION, CAPTAIN_CONSOLE_WORDS, PLATE_KINDS, PLATE_STATES, captainConsoleSheet, nextCaptainConsoleInput, plateProperty,
} from '../../../design/phone-ui/components/captain-console/captain-console.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/captain-console';
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

const ON = { enabled: true };
const live = (extra = {}) => nextCaptainConsoleInput(CAPTAIN_CONSOLE_DEFAULTS, { viewer: 4, captain: 4, jailed: ['Fay', 'Ike'], command: ON,
  plates: { release: { state: 'available' }, eject: { state: 'available' } }, ...extra });

test('the component is a runtime source: its whole graph is runtime-safe, and it sends nothing', () => {
  const files = new Map(['captain-console.mjs', 'captain-console.css'].flatMap(f => [...graph(join(REPO, COMPONENT, f))]));
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview|pregame-films)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the kit\'s crew-runtime.mjs)');
  const own = graph(join(REPO, COMPONENT, 'captain-console.mjs')).get(join(REPO, COMPONENT, 'captain-console.mjs'));
  assert.deepEqual(own, ['../kit/kit.mjs'], 'the kit only: the plate is the kit\'s tile, and the sheet\'s frame is the shell\'s');
  const source = read(`${COMPONENT}/captain-console.mjs`).replace(/^\s*\/\/.*$/gm, '').replace(/^\s*\*.*$/gm, '');
  assert.doesNotMatch(source, /fetch\(|navigator|localStorage|sessionStorage|Date\.now|setInterval|setTimeout|console\./, 'it sends, stores, counts and logs nothing');
  assert.doesNotMatch(source, /innerHTML|url\(|\.svg|https?:/, 'no markup and no picture fetched: the art comes through the bundle\'s properties');
  assert.match(source, /kit\.tile\(/, 'each plate is the kit\'s tile (decision 1)');
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/captain-console-check.mjs'), /mothership:dev-only/);
});

test('its styles reach nothing outside its root; its own are the plates\' grid and art, as the pack sizes them', () => {
  const file = `${COMPONENT}/captain-console.css`;
  const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
  const list = selectors(file);
  assert.ok(list.length >= 9, `found the rules (${list.length})`);
  for (const selector of list) {
    assert.match(selector, /^\.ms-captain-console(?:[\s.:[]|$)/, `"${selector}" is scoped`);
    assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
    assert.doesNotMatch(selector, /\.ms-(?:phone-shell|ps-|role-stage|rst-|char-select|cs-|display-settings|settings-sheet|ds-|host-controls|hc-|panels|pn-|pp-|promises|pr-|windows|wn-|office-decisions|od-|room-scene)/, `"${selector}" reaches no other component`);
    // A kit part only laid out as sheet 22's inline styles set the plates.
    if (/\.ms-k-/.test(selector)) assert.equal(selector, '.ms-captain-console .ms-cc-plates > .ms-k-tile', `"${selector}": only the plates' height`);
  }
  assert.deepEqual([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]), [], 'no motion of its own');
  assert.doesNotMatch(css, /transition|animation/, 'no transition or animation');
  assert.match(read(file), /^@import url\("\.\.\/kit\/kit\.css"\);/, 'it starts from the kit\'s stylesheet');
  assert.deepEqual([...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))], [], 'no custom properties of its own');
  for (const value of ['grid-template-columns: 1fr 1fr', 'gap: 10px', 'min-height: 150px', 'max-width: 140px', 'height: 78px', 'contain']) assert.ok(css.includes(value), `captain-console.css: ${value}`);
  // Each plate and state draws the film bundle's own property (decision 1), and the pressed art stays unused (decision 2).
  const catalog = JSON.parse(read('apps/game/hosted/board-v2-film-art/catalog.json')).assets;
  for (const kind of PLATE_KINDS) {
    for (const state of PLATE_STATES) {
      const property = plateProperty(kind, state);
      assert.ok(catalog.some(a => a.cssVariable === property && existsSync(join(REPO, a.runtimePath))), `the bundle defines ${property}`);
      assert.ok(css.includes(`[data-plate="${kind}-${state}"] { background-image: var(${property}); }`), `captain-console.css draws ${kind}-${state}`);
    }
  }
  assert.doesNotMatch(css, /pressed/, 'the pressed art stays unused');
});

test('its words are the pack\'s (sheets 22 and 24); the rule-stating ones are listed in the doc; names, states and reasons are Frontend\'s', () => {
  const more = read('design/phone-ui/prototype/screens-more.mjs');
  const W = CAPTAIN_CONSOLE_WORDS;
  for (const words of [W.title, W.consoleLine, W.release, W.eject, W.used, W.onceAMatch, W.note, W.releaseTitle, W.ejectTitle, W.inJail(['Fay', 'Ike']), W.onYourTurn, W.frees, W.ejects, W.hospital, W.cancel]) {
    assert.ok(more.includes(`'${words}'`), `screens-more.mjs: ${words}`);
  }
  assert.equal(W.inJail(['Fay']), 'Fay is in Jail');
  assert.equal(W.inJail(['Fay', 'Ike', 'Gus']), 'Fay, Ike and Gus are in Jail', 'three or more (decision 3)');
  // Decision 4: the rule-stating fixed words, listed in the doc.
  const doc = read('docs/design/components/captain-console.md');
  for (const words of [W.onceAMatch, W.note, W.onYourTurn, W.frees, W.ejects, W.hospital]) assert.ok(doc.includes(`"${words}"`), `the doc lists: ${words}`);
  // Decision 3: an unavailable plate's reason is Frontend's, never worked out.
  const source = read(`${COMPONENT}/captain-console.mjs`).replace(/^\s*\/\/.*$/gm, '');
  for (const words of ['No one in Jail', 'Not available now']) assert.ok(!source.includes(words), `no reason of its own: ${words}`);
  assert.equal(CAPTAIN_CONSOLE_VERSION, 'captain-console-0.1.0');
});

test('the commands are the contract\'s, with nothing in them', () => {
  const ts = read('packages/contracts/src/planet-game.ts');
  for (const command of ["z.strictObject({type:z.literal('CAPTAIN_RELEASE')})", "z.strictObject({type:z.literal('CAPTAIN_EJECT')})"]) assert.ok(ts.includes(command), `the contract's ${command}`);
  assert.ok(ts.includes('captainCommands:z.strictObject({releaseUsed:z.boolean(),ejectUsed:z.boolean()}).nullable()'), 'used, from the Captain\'s projection');
  assert.ok(ts.includes("v.abilities.captainCommands!==null && v.offices.captainSeatId!==v.self.seatId"), 'the contract keeps the commands to the Captain');
});

test('its inputs are checked, and refused with a reason', () => {
  const refuses = (input, pattern) => assert.throws(() => live(input), pattern);
  refuses({ view: 'plates' }, /view is console, release, eject/);
  refuses({ status: 'offline' }, /Status is live, stale, concealed/);
  refuses({ plates: { release: { state: 'pressed' } } }, /plates\.release\.state is available, used, unavailable/);
  refuses({ plates: { eject: { state: 'unavailable', reason: 5 } } }, /plates\.eject\.reason is words/);
  refuses({ jailed: ['Fay', 2] }, /jailed is the names/);
  refuses({ command: 'go' }, /command is \{ enabled, busy, reason \}/);
  refuses({ captain: 12 }, /captain is the Captain's seat/);
  const s = live();
  assert.deepEqual([s.view, s.plates.release.state, s.plates.eject.state, s.jailed, s.command.enabled], ['console', 'available', 'available', ['Fay', 'Ike'], true]);
  const d = live({ plates: undefined });
  assert.deepEqual([d.plates.release.state, d.plates.eject.state], ['unavailable', 'unavailable'], 'nothing offered until Frontend says so');
  assert.equal(live({ plates: { release: { state: 'used', reason: 'x' } } }).plates.release.reason, null, 'a reason is an unavailable plate\'s only');
  assert.equal(live({ plates: { eject: { state: 'unavailable', reason: 'No one in Jail' } } }).plates.eject.reason, 'No one in Jail', 'Frontend\'s reason, as given');
  assert.equal(live({ jailed: [] }).plates.release.state, 'available', 'an empty jailed list changes no plate (decision 3)');
  assert.deepEqual(nextCaptainConsoleInput(s, {}), s, 'the checked form is stable');
});

test('the Captain\'s privacy (decision 5): every view is the Captain\'s only, and what is the Captain\'s leaves with the viewer or when concealed', () => {
  assert.throws(() => live({ viewer: 5 }), /the Captain's only/);
  assert.throws(() => live({ viewer: null }), /the Captain's only/);
  assert.throws(() => live({ captain: null }), /the Captain's only/);
  for (const view of ['console', 'release', 'eject']) assert.throws(() => captainConsoleSheet({ view, viewer: 5, captain: 4 }), /the Captain's only/, `${view}: refused`);
  const s = live({ view: 'release' });
  const moved = nextCaptainConsoleInput(s, { viewer: 5, captain: 5 });
  assert.deepEqual([moved.jailed, moved.plates.release.state, moved.command.enabled], [[], 'unavailable', false], 'a new viewer: the plates, the names and the command are dropped');
  assert.equal(nextCaptainConsoleInput(s, { viewer: 4 }).jailed.length, 2, 'the same viewer again drops nothing');
  const hidden = nextCaptainConsoleInput(s, { status: 'concealed' });
  assert.deepEqual([hidden.jailed, hidden.plates.release.state], [[], 'unavailable'], 'concealed: dropped');
  assert.deepEqual(nextCaptainConsoleInput(hidden, { status: 'live' }).jailed, [], 'nothing comes back by itself');
  assert.deepEqual(captainConsoleSheet({ ...s, status: 'concealed' }).actions, [], 'no footer while concealed');
});

test('the sheet it gives the shell: the console with its ✕; each confirm with Cancel this phone\'s own and its command', () => {
  const frame = { id: CAPTAIN_CONSOLE_SHEET_ID, title: 'Captain console', back: false, detent: 'auto' };
  assert.deepEqual(captainConsoleSheet(live()), { ...frame, sub: 'Command Room · your turn', close: true, actions: [] });
  assert.deepEqual(captainConsoleSheet(live({ view: 'release' })), { ...frame, close: false, actions: [
    { id: 'cancel', label: 'Cancel', kind: 'secondary', local: true },
    { id: 'release', label: 'Release', kind: 'primary', enabled: true, busy: false, reason: null },
  ] });
  assert.deepEqual(captainConsoleSheet(live({ view: 'eject', command: { enabled: false, reason: 'Not available now' } })).actions[1],
    { id: 'eject', label: 'Eject', kind: 'warn', enabled: false, busy: false, reason: 'Not available now' }, 'Eject, the warning button, with Frontend\'s reason as given');
  assert.equal(captainConsoleSheet(live({ view: 'release', command: { enabled: true, busy: true } })).actions[1].busy, true);
});

test('the check\'s record: every capture, probe check and agreement case passed under the production headers', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/captain-console-check.mjs');
  assert.ok(record.sourceClean, 'recorded against a clean source');
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 14, 'sheets 22 and 24\'s console states, Release in flight, reconnecting and the Largest text, at two sizes');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn, `${key} passed and drew what its state asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
    assert.deepEqual(c.cut, [], `${key}: every word whole`);
  }
  for (const size of ['390x844', '430x932']) {
    assert.equal(record.captures[`${size}/console`].covered, 0, `${size}: nothing covers the plates' art (#222 item 17)`);
    assert.equal(record.captures[`${size}/stale`].commandWaits, 'Controls return when the match is current', `${size}: reconnecting, Release waits with the banner's words`);
  }
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const ids = record.probe.full.checks.map(c => c.id);
  for (const group of ['plates', 'art', 'footer', 'confirm', 'privacy', 'reconnect', 'focus', 'layout', 'dispose', 'motion']) assert.ok(ids.some(id => id.startsWith(`${group}:`)), `probe group ${group}`);
  const agree = record.agree;
  assert.ok(agree.ok && agree.checks.length === 9 && agree.checks.every(c => c.ok && c.detail.differences.length === 0), 'the sheet agrees with the frozen pack\'s captain screen in each console state');
  assert.deepEqual(agree.problems, [], 'agreement: no page problem');
});
