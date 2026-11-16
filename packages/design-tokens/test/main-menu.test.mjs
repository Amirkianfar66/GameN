// The main menu (design/phone-ui/components/main-menu) and its entry parts (design/phone-ui/components/
// entry-parts): runtime sources the game imports as they are, so their module graph, their styles' scope,
// their inputs and their words are checked here; their drawing, lifecycle and agreement with the pack in a
// browser under the production headers by design/tools/main-menu-check.mjs, whose record is checked last.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAIN_MENU_DEFAULTS, MAIN_MENU_VERSION, MENU_WORDS, brandWordsBox, nextMainMenuInput } from '../../../design/phone-ui/components/main-menu/main-menu.mjs';
import { layout as hostedBrandLayout } from '../../../apps/game/hosted/pregame-films/brand/brand.mjs';
import { layout as designBrandLayout } from '../../../design/pregame-films/brand/brand.mjs';
import { ENTRY_PARTS_VERSION, ENTRY_TONES, createEntryParts } from '../../../design/phone-ui/components/entry-parts/entry-parts.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/main-menu';
const PARTS = 'design/phone-ui/components/entry-parts';
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
/** A selector list's selectors: its commas outside any parentheses. */
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
/** A stylesheet's rules, as [selectors, declarations], comments and imports left out. */
function rules(path) {
  const css = read(path).replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]*;/g, '');
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => [split(m[1].trim()), m[2]]).filter(([s]) => s[0] && !s[0].startsWith('@'));
}

test('the menu and its entry parts are runtime sources: the whole graph is runtime-safe', () => {
  const files = new Map(['main-menu.mjs', 'main-menu.css'].flatMap(f => [...graph(join(REPO, COMPONENT, f))]));
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview)(?:\/|\.)/, `${path}: nothing development-only`);
    assert.ok(!path.startsWith('design/pregame-films/'), `${path}: not the films' development source; the hosted game's runtime copy`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the kit\'s crew-runtime.mjs)');
  for (const path of [`${COMPONENT}/main-menu.mjs`, `${PARTS}/entry-parts.mjs`, `${PARTS}/entry-parts.css`, 'design/phone-ui/components/kit/kit.mjs', 'design/phone-ui/components/kit/kit.css', 'design/phone-ui/components/icons.mjs']) {
    assert.ok(local.includes(path), `${path} is in the graph`);
  }
  assert.ok(!local.some(p => p.includes('phone-shell')), 'no phone shell: the menu has no bar, tabs or match status');
  assert.ok(local.includes('apps/game/hosted/pregame-films/brand/brand.mjs'), 'the brand frame\'s own layout, from the hosted game\'s film (brandWordsBox)');
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/main-menu-check.mjs'), /^\/\/ mothership:dev-only/);
});

test('the menu\'s styles reach nothing outside it: every rule under its root, kit and entry parts placed only through its own parts', () => {
  const path = `${COMPONENT}/main-menu.css`;
  const raw = read(path);
  assert.match(raw, /^@import url\("\.\.\/kit\/kit\.css"\);\n@import url\("\.\.\/entry-parts\/entry-parts\.css"\);/, 'it starts from the shared kit and its entry parts');
  const list = rules(path).flatMap(([s]) => s);
  assert.ok(list.length >= 7, `found the rules (${list.length})`);
  for (const selector of list) {
    assert.match(selector, /^\.ms-main-menu(?:[\s.:\[]|$)/, `"${selector}" is scoped`);
    assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
    assert.doesNotMatch(selector, /\.ms-(?:phone-shell|ps-|role-stage|rst-|own-card|rc-|boarding-stage|bst-)/, `"${selector}" reaches no other component`);
    assert.doesNotMatch(selector, /\.ms-mm-hero[\s>+~]/, `"${selector}": nothing inside the hero's player`);
    if (/\.ms-(?:k|ep)-/.test(selector)) assert.match(selector, /\.ms-mm-[\w-]+[^,]*\.ms-(?:k|ep)-/, `"${selector}": a kit or entry part styled only inside the menu's own parts`);
  }
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.deepEqual([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]), [], 'no keyframes: the menu has no motion of its own');
  assert.deepEqual([...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))].filter(p => !p.startsWith('--ms-mm-')), [], 'custom properties are its own');
});

test('the entry parts\' styles: scoped under their root class at one class\'s weight, and a hand cursor never without the tap highlight off', () => {
  const path = `${PARTS}/entry-parts.css`;
  const all = rules(path);
  assert.ok(all.length >= 10, `found the rules (${all.length})`);
  for (const [selectors] of all) for (const selector of selectors) {
    assert.match(selector, /^\.ms-entry-parts :where\(\.ms-ep-[^()]*(?:\([^()]*\))?[^()]*\)$/, `"${selector}" is under .ms-entry-parts, in :where()`);
  }
  for (const file of [path, `${COMPONENT}/main-menu.css`]) {
    for (const [selectors, body] of rules(file)) {
      if (/cursor:\s*pointer/.test(body)) assert.match(body, /-webkit-tap-highlight-color:\s*transparent/, `${file} "${selectors.join(', ')}": the kit's rule for a hand cursor`);
    }
  }
  assert.match(read(path), /cursor: pointer; -webkit-tap-highlight-color: transparent;/, 'the entry choice sets both, in the same rule');
  const css = read(path).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.deepEqual([...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))], ['--ic-knock'], 'only the icons\' knock-out colour, as the kit sets it');
  assert.doesNotMatch(css, /\[aria-disabled|\[data-off|opacity/, 'a refused choice keeps its look, as sheet 10 draws Join and Host offline');
  assert.equal(ENTRY_PARTS_VERSION, 'entry-parts-0.1.0');
  assert.deepEqual(ENTRY_TONES, [null, 'primary']);
  assert.throws(() => createEntryParts(null), /need a document/);
  assert.doesNotMatch(read(`${PARTS}/entry-parts.mjs`), /mothership:dev-only/);
});

test('the brand words\' box is the held frame\'s: from the hosted film\'s own layout, which the preview\'s still shares', () => {
  for (const [W, H] of [[390, 844 * 0.58], [430, 932 * 0.58], [320, 568 * 0.58]]) {
    assert.deepEqual(JSON.stringify(hostedBrandLayout(W, H)), JSON.stringify(designBrandLayout(W, H)), `${W} × ${H}: the hosted film lays the words out as the preview's still`);
    const L = hostedBrandLayout(W, H), box = brandWordsBox(W, H);
    // The ink reaches past the lines' boxes: half a stroke above "Game N", and "by"'s descender below "by Plan B".
    assert.ok(box.top < L.y1 && box.top > L.y1 - L.k1, `${W} × ${H}: the top half a stroke over the name`);
    assert.ok(box.bottom > L.y2 + L.cap * 0.4 && box.bottom < L.y2 + L.cap * 0.4 + 3 * L.k2, `${W} × ${H}: the bottom under the credit's descender`);
  }
});

test('its words are the pack\'s: the main menu of sheet 10', () => {
  const entry = read('design/phone-ui/prototype/screens-entry.mjs');
  for (const words of [MENU_WORDS.join, MENU_WORDS.joinSub, MENU_WORDS.host, MENU_WORDS.hostSub, MENU_WORDS.recover, MENU_WORDS.settings, MENU_WORDS.offline]) {
    assert.ok(entry.includes(`'${words}'`), `screens-entry.mjs: ${words}`);
  }
  assert.equal(MAIN_MENU_VERSION, 'main-menu-0.1.0');
});

test('inputs are checked, and refused with a reason', () => {
  const refuses = (input, pattern) => assert.throws(() => nextMainMenuInput(MAIN_MENU_DEFAULTS, input), pattern);
  refuses({ notice: 'down' }, /notice is null or "offline"/);
  refuses({ insets: { top: '47px' } }, /insets are null/);
  refuses({ join: null }, /join is \{ enabled, busy, reason \}/);
  refuses({ settings: 'on' }, /settings is \{ enabled \}/);
  const d = nextMainMenuInput(MAIN_MENU_DEFAULTS, {});
  assert.equal(d.notice, null);
  assert.deepEqual(d.join, { enabled: true, busy: false, reason: null });
  assert.deepEqual(d.settings, { enabled: true });
  const off = nextMainMenuInput(d, { notice: 'offline', join: { enabled: false, reason: MENU_WORDS.offline }, host: { enabled: false, reason: '' } });
  assert.deepEqual(off.join, { enabled: false, busy: false, reason: MENU_WORDS.offline });
  assert.equal(off.host.reason, null, 'an empty reason is no reason');
  assert.deepEqual(off.recover, d.recover, 'a key not given stays');
  assert.deepEqual(nextMainMenuInput(off, {}), off, 'the checked forms are stable');
});

test('the check\'s record: every capture, probe check and agreement case passed under the production headers', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/main-menu-check.mjs');
  assert.ok(record.sourceClean, 'recorded against a clean source');
  assert.match(record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '', /default-src 'none'/);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 8, 'four states at two sizes');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn, `${key} passed and drew what its state asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
    assert.equal(c.canvas, 'rgb(16, 20, 28)', `${key}: on the pack's canvas`);
    assert.equal(c.settingsTop, 51, `${key}: the settings button 4 px under the 47 px safe area`);
    assert.equal(c.choicesBottom, 52, `${key}: the choices 18 px over the 34 px safe area`);
  }
  for (const size of ['390x844', '430x932']) {
    // Nothing of the choices sits on the hero: no cover at the Standard text, as in the pack; at the Largest
    // text offline, the choices rise into the hero and the canvas covers it from 24 px above them, or from 24 px
    // above the brand words where that would cut them, so the words go whole or not at all.
    for (const state of ['menu', 'offline']) assert.ok(!record.captures[`${size}/${state}`].cover && record.captures[`${size}/${state}`].stackTop >= record.captures[`${size}/${state}`].hero, `${size}/${state}: no cover at the Standard text`);
    for (const state of ['menu', 'offline', 'large', 'large-offline']) {
      const c = record.captures[`${size}/${state}`];
      assert.ok(Math.abs(c.words.top - c.ink.top) < 0.5 && Math.abs(c.words.bottom - c.ink.bottom) < 0.5, `${size}/${state}: the words' box holds the drawn ink`);
      assert.ok(!c.cover || c.ink.bottom <= c.coverTop + 0.05 || c.ink.top >= c.coverTop + 24 - 0.05, `${size}/${state}: the words whole or hidden whole`);
    }
    const raised = record.captures[`${size}/large-offline`];
    const lifted = size === '390x844';
    assert.ok(raised.cover && Math.abs(raised.coverTop - (lifted ? raised.words.top - 24 : raised.stackTop - 24)) < 0.05,
      `${size}/large-offline: the cover from 24 px above ${lifted ? 'the brand words, which the note\'s would cut' : 'the note, under the words'}`);
    assert.equal(record.captures[`${size}/offline`].note, MENU_WORDS.offline, `${size}: sheet 10's offline note`);
    assert.deepEqual(record.captures[`${size}/offline`].opacity, ['1', '1', '0.4'], `${size}: Join and Host keep their look, Recover dimmed`);
    assert.equal(record.captures[`${size}/large-offline`].root, 32, `${size}: the Largest text`);
  }
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const groups = record.probe.full.checks.map(c => c.id.split(':')[0]);
  for (const group of ['mount', 'taps', 'offline', 'online again', 'busy', 'not interactive', 'focus', 'insets', 'layout', 'words', 'text', 'input', 'dispose', 'motion']) assert.ok(groups.includes(group), `probe group ${group}`);
  assert.ok(record.agree.ok && record.agree.checks.length === 6 && record.agree.checks.every(c => c.ok && c.detail.differences.length === 0), 'the menu agrees with the frozen pack\'s main menu');
  // The one difference from the pack, recorded where it is drawn: the cover, at the Largest text only.
  for (const c of record.agree.checks) assert.equal(c.detail.improvement !== null, c.id.includes('Largest'), `${c.id}: the cover only with the Largest text`);
});
