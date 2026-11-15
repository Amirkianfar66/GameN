// The phone shell component (design/phone-ui/components/phone-shell): a runtime source the game imports as
// it is, so its module graph, its styles' scope, its inputs, its privacy rules and its words are checked
// here; its drawing, lifecycle and agreement with the pinned pack in a browser under the production
// headers by design/tools/phone-shell-check.mjs, whose record is checked last.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PHONE_SHELL_DEFAULTS, PHONE_SHELL_VERSION, HERO_WORDS, RECONNECTING, TOAST_MS, GAME_TABS, TALK_BUTTONS,
  checkBar, checkTabs, clockText, nextPhoneShellInput, seatNumber,
} from '../../../design/phone-ui/components/phone-shell/phone-shell.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/phone-shell';
const read = path => readFileSync(join(REPO, path), 'utf8');
const sha256 = path => createHash('sha256').update(readFileSync(join(REPO, path))).digest('hex');

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

const SELF = 4;
const turn = (extra = {}) => ({ kind: 'turn', who: { seat: SELF, name: 'Dev', character: 'c1' }, self: true, round: 3, timer: { remainingMs: 42000 }, promises: { count: 1 }, menu: {}, ...extra });
const live = (extra = {}) => nextPhoneShellInput(PHONE_SHELL_DEFAULTS, {
  viewer: SELF, bar: turn(), tabs: { variant: 'game', hero: { mode: 'pass' } }, target: { title: 'Rescue' }, chip: { id: 'other', label: 'Other rooms · 1' },
  sheet: { id: 'pass', title: 'Pass your turn?', actions: [{ id: 'pass', label: 'Pass', kind: 'primary' }] }, toast: { id: 't', text: 'Turn passed' }, ...extra,
});

test('the component is a runtime source: its whole graph is runtime-safe and in the hosted graph', () => {
  const files = new Map([...graph(join(REPO, COMPONENT, 'phone-shell.mjs')), ...graph(join(REPO, COMPONENT, 'phone-shell.css'))]);
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through crew-runtime.mjs)');
  for (const path of [`${COMPONENT}/phone-shell.mjs`, `${COMPONENT}/phone-shell.css`, 'design/phone-ui/components/icons.mjs', 'apps/game/hosted/crew-runtime.mjs']) {
    assert.ok(local.includes(path), `${path} is in the graph`);
  }
  assert.ok(!local.some(p => p.includes('/room-scene/')), 'the shell does not depend on the room scene: Frontend mounts that in the stage');
  // The preview and its probes are development-only, and say so.
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/phone-shell-check.mjs'), /^\/\/ mothership:dev-only/);
});

test('its styles reach nothing outside the shell: every rule is scoped under .ms-phone-shell', () => {
  const css = read(`${COMPONENT}/phone-shell.css`).replace(/\/\*[\s\S]*?\*\//g, '');
  const keyframes = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]);
  assert.ok(keyframes.every(name => name.startsWith('ms-ps-')), `keyframes are the shell's own: ${keyframes}`);
  // Every selector list before a block, outside @keyframes bodies and at-rule preludes.
  const body = css.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  const selectors = [...body.matchAll(/(^|[{}])([^{}]*?)\{/g)].map(m => m[2].trim()).filter(s => s && !s.startsWith('@'));
  assert.ok(selectors.length > 100, `found the rules (${selectors.length})`);
  /** A selector list's selectors: its commas outside any parentheses (:is(), :not(), :has()). */
  const split = list => {
    const out = [''];
    let depth = 0;
    for (const ch of list) {
      if (ch === '(') depth += 1;
      if (ch === ')') depth -= 1;
      if (ch === ',' && depth === 0) out.push(''); else out[out.length - 1] += ch;
    }
    return out.map(s => s.trim());
  };
  for (const list of selectors) {
    for (const selector of split(list)) {
      assert.match(selector, /^\.ms-phone-shell(?:[\s.:\[]|$)/, `"${selector}" is scoped`);
    }
  }
  // Nor does anything reach into the stage (the room scene's) or a sheet's body (its content's): no
  // universal selector, no bare element outside the shell's own parts, nothing under those two.
  for (const list of selectors) {
    for (const selector of split(list)) {
      assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
      assert.doesNotMatch(selector, /\.ms-ps-(?:stage|sheet-body)[\s>+~]/, `"${selector}": nothing inside the stage or a sheet's body`);
      assert.doesNotMatch(selector, /^\.ms-phone-shell(?:\[[^\]]*\])?\s+(?::is\()?(?:button|div|span|b|p|h2|svg|nav|header|section)\b/, `"${selector}": no bare element straight under the shell`);
    }
  }
  // Custom properties are the shell's own, besides --ic-knock, which the shared icons read.
  const declared = [...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))];
  assert.deepEqual(declared.filter(p => !p.startsWith('--ms-ps-') && p !== '--ic-knock' && p !== '--p'), []);
});

test('the pack it is drawn from stays pinned: ui.mjs, kit.css, icons.mjs and art.mjs are unchanged for the frozen Food release', () => {
  const inventory = JSON.parse(read('docs/integration/food-consumer-source-2026-11-13.json'));
  const pins = new Map();
  const walk = value => {
    if (!value || typeof value !== 'object') return;
    for (const [key, entry] of Object.entries(value)) {
      if (key.startsWith('design/phone-ui/prototype/') && entry?.sha256) pins.set(key, entry.sha256);
      walk(entry);
    }
  };
  walk(inventory);
  for (const path of ['design/phone-ui/prototype/ui.mjs', 'design/phone-ui/prototype/kit.css', 'design/phone-ui/prototype/icons.mjs', 'design/phone-ui/prototype/art.mjs']) {
    assert.ok(pins.has(path), `${path} is pinned`);
    assert.equal(sha256(path), pins.get(path), `${path} is as the Food release pinned it`);
  }
});

test('its words are the pack\'s: the hero, the tabs, the bar and the reconnecting banner', () => {
  const ui = read('design/phone-ui/prototype/ui.mjs');
  for (const words of Object.values(HERO_WORDS)) {
    assert.ok(ui.includes(`'${words.aria}'`), `the hero's "${words.aria}" is ui.mjs's`);
    assert.ok(ui.includes(`'${words.label}'`), `the hero's "${words.label}" is ui.mjs's`);
  }
  for (const words of ['Show the whole board', 'Show my room', 'Your turn', 'Private talk', 'Match status', 'Settings', "'Promises'"]) assert.ok(ui.includes(words), words);
  const game = read('design/phone-ui/prototype/screens-game.mjs');
  for (const words of [RECONNECTING.title, RECONNECTING.sub, `'${RECONNECTING.action}'`]) assert.ok(game.includes(words), `sheet 45: ${words}`);
  assert.ok(read('design/phone-ui/prototype/screens-more.mjs').includes("'My card'"), 'sheet 25: My card');
  assert.deepEqual(GAME_TABS, ['switch', 'actions', 'hero', 'card', 'panels'], 'the pack\'s tab order');
  assert.deepEqual(TALK_BUTTONS, ['promises', 'my-card']);
  assert.equal(PHONE_SHELL_VERSION, 'phone-shell-0.1.0');
  assert.ok(TOAST_MS > 0);
});

test('the clock shows what it is given: m:ss of the whole seconds left, rounded up', () => {
  assert.equal(clockText(42000), '0:42');
  assert.equal(clockText(41001), '0:42');
  assert.equal(clockText(999), '0:01');
  assert.equal(clockText(0), '0:00');
  assert.equal(clockText(125000), '2:05');
  assert.equal(seatNumber({ seat: 'seat-4' }), 4);
  assert.equal(seatNumber({ seat: 7 }), 7);
  assert.equal(seatNumber({ seat: 'seat-4', number: 9 }), 9);
});

test('inputs are checked, and refused with a reason', () => {
  const refuses = (input, pattern) => assert.throws(() => nextPhoneShellInput(PHONE_SHELL_DEFAULTS, input), pattern);
  refuses({ status: 'offline' }, /Status is live, stale, concealed/);
  refuses({ bar: { kind: 'hero' } }, /A bar's kind is turn, phase, pair/);
  refuses({ bar: { kind: 'turn' } }, /who is \{ seat, name, character \}/);
  refuses({ bar: { kind: 'turn', who: { seat: 4 } } }, /needs a name/);
  refuses({ bar: { kind: 'pair', pair: [{ seat: 1, name: 'Ava' }] } }, /names the two people talking/);
  refuses({ bar: { kind: 'phase', title: 'Jail vote', timer: { remainingMs: -1 } } }, /time left in milliseconds/);
  refuses({ bar: { kind: 'phase', title: 'Jail vote', timer: { remainingMs: 3000, ring: 2 } } }, /ring is 0…1/);
  refuses({ bar: { kind: 'phase', title: 'x', round: 2.5 } }, /round is a whole number/);
  refuses({ tabs: { variant: 'menu' } }, /variant is game or talk/);
  refuses({ tabs: { variant: 'game', open: 'promises' } }, /An open tab is one of switch, actions, card, panels/);
  refuses({ tabs: { variant: 'talk', open: 'panels' } }, /An open tab is one of promises, my-card/);
  refuses({ tabs: { hero: { mode: 'cancel' } } }, /hero's mode is pass, vote, voted/);
  refuses({ banner: { kind: 'error' } }, /kind: 'reconnecting'/);
  refuses({ toast: { id: 'x' } }, /A toast needs its text/);
  refuses({ chip: { id: 'x' } }, /A chip needs a label/);
  refuses({ sheet: { title: 'Pass' } }, /A sheet is \{ id, title/);
  refuses({ insets: { top: '47px' } }, /insets are null/);
  // Defaults: a live, interactive phase bar, no tab bar, nothing over the stage.
  const d = nextPhoneShellInput(PHONE_SHELL_DEFAULTS, {});
  assert.equal(d.status, 'live');
  assert.equal(d.interactive, true);
  assert.equal(d.bar.kind, 'phase');
  assert.equal(d.tabs, null);
  assert.equal(d.shape, 'none');
  // The checked forms are stable: checking them again changes nothing.
  const once = live();
  assert.deepEqual(nextPhoneShellInput(once, {}), once);
  assert.deepEqual(checkBar(once.bar), once.bar);
  assert.deepEqual(checkTabs(once.tabs), once.tabs);
  // An unavailable hero by default, as the pack's 'pass-off'.
  assert.deepEqual(checkTabs({ variant: 'game' }).hero, { mode: 'pass', enabled: false, busy: false, reason: null });
});

test('this viewer\'s inputs are dropped while concealed, and when the viewer changes unless the update gives the new viewer\'s', () => {
  const shown = live();
  assert.ok(shown.tabs && shown.target && shown.chip && shown.sheet && shown.toast && shown.bar.promises);
  const hidden = nextPhoneShellInput(shown, { status: 'concealed' });
  for (const key of ['tabs', 'target', 'chip', 'sheet', 'toast']) assert.equal(hidden[key], null, `${key} dropped while concealed`);
  assert.equal(hidden.bar.promises, null, 'the Promises count dropped while concealed');
  assert.equal(hidden.bar.who.name, 'Dev', 'the public bar is kept (and not drawn)');
  assert.equal(hidden.shape, 'game', 'the tab bar keeps its shape, so nothing moves');
  // Shown again, nothing of this viewer's comes back by itself.
  const again = nextPhoneShellInput(hidden, { status: 'live' });
  for (const key of ['tabs', 'target', 'chip', 'sheet', 'toast']) assert.equal(again[key], null, `${key} not restored`);
  // Offers given while concealed are refused too.
  assert.equal(nextPhoneShellInput(hidden, { tabs: { variant: 'game' }, sheet: { id: 's', title: 'x' } }).tabs, null);
  // A new viewer.
  const other = nextPhoneShellInput(shown, { viewer: 5 });
  for (const key of ['tabs', 'target', 'chip', 'sheet', 'toast']) assert.equal(other[key], null, `${key} dropped for a new viewer`);
  assert.equal(other.bar.promises, null);
  const given = nextPhoneShellInput(shown, { viewer: 5, tabs: { variant: 'game', hero: { mode: 'vote' } }, bar: turn({ promises: { count: 2 } }) });
  assert.equal(given.tabs.hero.mode, 'vote');
  assert.equal(given.bar.promises.count, 2);
  assert.equal(given.sheet, null);
  // The same viewer again drops nothing.
  assert.ok(nextPhoneShellInput(shown, { viewer: SELF }).tabs);
});

test('the check\'s record: every capture, probe check and agreement case passed under the production headers', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/phone-shell-check.mjs');
  assert.ok(record.sourceClean, 'recorded against a clean source');
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /img-src 'self' data:/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 27, 'thirteen states at two sizes, and the Largest text at 320 × 568');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn, `${key} passed and drew what its state asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
  }
  for (const size of ['390x844', '430x932']) {
    assert.deepEqual(record.captures[`${size}/own`].layout.bars, size === '390x844' ? { top: 99, bottom: 92 } : { top: 99, bottom: 92 }, `${size}: the pack's bars`);
    assert.equal(record.captures[`${size}/concealed`].buttons, 0, `${size}: concealed, no control`);
    assert.equal(record.captures[`${size}/concealed`].name, null, `${size}: concealed, no name`);
    assert.equal(record.captures[`${size}/concealed`].layout.stage.height, record.captures[`${size}/own`].layout.stage.height, `${size}: concealed, the stage keeps its size`);
  }
  // The lifecycle probe, as the page comes and with the device's Reduce motion; the agreement with the pack.
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const groups = record.probe.full.checks.map(c => c.id.split(':')[0]);
  for (const group of ['focus', 'refused', 'stale', 'private', 'time', 'layout', 'toast', 'hud', 'dispose', 'motion']) assert.ok(groups.includes(group), `probe group ${group}`);
  assert.ok(record.agree.ok && record.agree.checks.length >= 7 && record.agree.checks.every(c => c.ok && c.detail.differences.length === 0), 'the shell agrees with the pinned pack');
  assert.deepEqual(record.agree.problems, [], 'agreement: no page problem');
});
