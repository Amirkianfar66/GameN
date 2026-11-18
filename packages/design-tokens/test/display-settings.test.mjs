// Display settings (design/phone-ui/components/display-settings): a runtime source the game imports as it is, so
// its module graph, its styles' scope, its inputs and its words are checked here; its drawing and lifecycle in a
// browser under the production headers by design/tools/display-settings-check.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DISPLAY_SETTINGS_DEFAULTS, DISPLAY_SETTINGS_VERSION, SETTINGS_WORDS, TEXT_SCALES, motionOn, nextDisplaySettingsInput,
} from '../../../design/phone-ui/components/display-settings/display-settings.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/display-settings';
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
/** A selector list's selectors: its commas outside any parentheses (:is(), :not(), :has()). */
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
/** Every selector of a stylesheet, outside @keyframes bodies and at-rule preludes. */
function selectors(path) {
  const css = read(path).replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]*;/g, '').replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  return [...css.matchAll(/(^|[{}])([^{}]*?)\{/g)].map(m => m[2].trim()).filter(s => s && !s.startsWith('@')).flatMap(split);
}

const LOCK = Object.freeze({ reason: 'On, because this phone asks for less motion' });

test('the component is a runtime source: its whole graph is runtime-safe, and it imports neither the shell nor a setting store', () => {
  const files = new Map(['display-settings.mjs', 'display-settings.css'].flatMap(f => [...graph(join(REPO, COMPONENT, f))]));
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview|pregame-films)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the kit\'s crew-runtime.mjs)');
  for (const path of [`${COMPONENT}/display-settings.mjs`, `${COMPONENT}/display-settings.css`, 'design/phone-ui/components/kit/kit.mjs', 'design/phone-ui/components/kit/kit.css',
    'design/phone-ui/components/entry-parts/entry-parts.mjs', 'design/phone-ui/components/entry-parts/entry-parts.css', 'design/phone-ui/components/icons.mjs']) {
    assert.ok(local.includes(path), `${path} is in the graph`);
  }
  // The sheet's frame is the shell's, which Frontend opens: the component draws only its content.
  const own = graph(join(REPO, COMPONENT, 'display-settings.mjs')).get(join(REPO, COMPONENT, 'display-settings.mjs'));
  assert.deepEqual(own, ['../kit/kit.mjs', '../entry-parts/entry-parts.mjs']);
  assert.ok(!local.some(p => /phone-shell/.test(p)), 'the shell is not in the graph');
  // Storing and applying are Frontend's (the Lead's review of #294, question 2).
  assert.doesNotMatch(read(`${COMPONENT}/display-settings.mjs`).replace(/^\s*\/\/.*$/gm, ''), /localStorage|sessionStorage|documentElement|fontSize|matchMedia/, 'the component stores and applies nothing');
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/display-settings-check.mjs'), /mothership:dev-only/);
});

test('its styles reach nothing outside its two roots', () => {
  const file = `${COMPONENT}/display-settings.css`;
  const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
  const list = selectors(file);
  assert.ok(list.length >= 3, `found the rules (${list.length})`);
  for (const selector of list) {
    assert.match(selector, /^\.ms-(?:display-settings|settings-sheet)(?:[\s.:[]|$)/, `"${selector}" is scoped`);
    assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
    assert.doesNotMatch(selector, /\.ms-(?:phone-shell|ps-|role-stage|rst-|char-select|cs-|room-scene)/, `"${selector}" reaches no other component`);
    if (/\.ms-k-/.test(selector)) assert.match(selector, /\.ms-ds-[\w-]+[^,]*\.ms-k-/, `"${selector}": a kit part styled only inside the component's own`);
  }
  assert.deepEqual([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]), [], 'no motion of its own: the switch\'s is the kit\'s');
  assert.match(read(file), /^@import url\("\.\.\/kit\/kit\.css"\);\n@import url\("\.\.\/entry-parts\/entry-parts\.css"\);/, 'it starts from the kit\'s and the entry parts\' stylesheets');
  const declared = [...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))];
  assert.deepEqual(declared.filter(p => !p.startsWith('--ms-ds-')), [], 'custom properties are its own');
});

test('its words are the pack\'s (sheet 32 and the settings screen), and its sizes the game\'s', () => {
  const more = read('design/phone-ui/prototype/screens-more.mjs');
  for (const words of [SETTINGS_WORDS.back, SETTINGS_WORDS.page, SETTINGS_WORDS.display, SETTINGS_WORDS.motion, SETTINGS_WORDS.motionLine, SETTINGS_WORDS.textSize,
    ...Object.values(SETTINGS_WORDS.sizes), SETTINGS_WORDS.note, SETTINGS_WORDS.host, SETTINGS_WORDS.hostControls, SETTINGS_WORDS.hostLine, SETTINGS_WORDS.sheet]) {
    assert.ok(more.includes(`'${words}'`), `screens-more.mjs: ${words}`);
  }
  assert.match(more, /\[\['1', 'Standard'\], \['1\.5', 'Large'\], \['2', 'Largest'\]\]/, 'the pack\'s three sizes and their values');
  // The game keeps the same three (apps/game/hosted/planet/preferences.mjs textScale).
  assert.match(read('apps/game/hosted/planet/preferences.mjs'), /\[\[1,'Standard'\],\[1\.5,'Large'\],\[2,'Largest'\]\]/);
  assert.deepEqual(TEXT_SCALES, [1, 1.5, 2]);
  assert.equal(DISPLAY_SETTINGS_VERSION, 'display-settings-0.1.1');
});

test('its inputs are checked, and refused with a reason', () => {
  const refuses = (input, pattern) => assert.throws(() => nextDisplaySettingsInput(DISPLAY_SETTINGS_DEFAULTS, input), pattern);
  refuses({ reducedMotion: 'yes' }, /reducedMotion is true or false/);
  refuses({ textScale: 1.25 }, /textScale is 1, 1\.5, 2/);
  refuses({ textScale: '1.5' }, /textScale is 1, 1\.5, 2/);
  refuses({ motionLock: {} }, /motionLock is null, or \{ reason \} in Frontend's words/);
  refuses({ motionLock: { reason: '' } }, /motionLock is null/);
  refuses({ hostControls: { enabled: true, reason: 5 } }, /hostControls is null, or \{ enabled, reason \}/);
  refuses({ insets: { top: '47px' } }, /insets are null/);
  const d = nextDisplaySettingsInput(DISPLAY_SETTINGS_DEFAULTS, {});
  assert.deepEqual(d, { ...DISPLAY_SETTINGS_DEFAULTS }, 'Standard text, motion as usual, no lock, no host row');
  assert.deepEqual(nextDisplaySettingsInput(d, { hostControls: {} }).hostControls, { enabled: true, reason: null });
  assert.deepEqual(nextDisplaySettingsInput(d, { hostControls: { enabled: false, reason: 'Opens when the round ends' } }).hostControls, { enabled: false, reason: 'Opens when the round ends' });
  assert.equal(nextDisplaySettingsInput(d, { interactive: 0 }).interactive, true, 'only false refuses');
  assert.equal(nextDisplaySettingsInput(d, { interactive: false }).interactive, false);
  const once = nextDisplaySettingsInput(d, { reducedMotion: true, motionLock: LOCK, textScale: 2 });
  assert.deepEqual(nextDisplaySettingsInput(once, {}), once, 'the checked form is stable');
});

test('the switch shows the motion as the phone keeps it, and on while the phone\'s own setting locks it', () => {
  const at = input => motionOn(nextDisplaySettingsInput(DISPLAY_SETTINGS_DEFAULTS, input));
  assert.equal(at({}), false);
  assert.equal(at({ reducedMotion: true }), true);
  assert.equal(at({ reducedMotion: false, motionLock: LOCK }), true, 'locked by the phone: on');
});

test('the check\'s record: every capture, probe check and agreement case passed under the production headers', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/display-settings-check.mjs');
  assert.ok(record.sourceClean, 'recorded against a clean source');
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 20, 'the page (off, on, locked, Large, Largest) and Settings (as sheet 32, host, locked, reconnecting, Largest), at two sizes');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn, `${key} passed and drew what its state asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
    assert.deepEqual(c.cut, [], `${key}: every word whole`);
  }
  for (const size of ['390x844', '430x932']) {
    for (const state of ['page-locked', 'sheet-locked']) {
      const c = record.captures[`${size}/${state}`];
      assert.ok(c.checked === 'true' && c.locked && c.dimmed && c.line === LOCK.reason && c.why === LOCK.reason, `${size}/${state}: on, dimmed, refused, and the reason shown and given`);
    }
    assert.ok(record.captures[`${size}/sheet-stale`].banner && record.captures[`${size}/sheet-stale`].refused === 0, `${size}: reconnecting refuses nothing`);
    assert.ok(record.captures[`${size}/page-largest`].stacked && !record.captures[`${size}/page-large`].stacked, `${size}: one a row at the Largest text only`);
    assert.equal(record.captures[`${size}/sheet`].host, null, `${size}: no Host group without hostControls`);
  }
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const groups = record.probe.full.checks.map(c => c.id.split(':')[0]);
  for (const group of ['report', 'lock', 'refused', 'host', 'focus', 'words', 'layout', 'dispose', 'motion']) assert.ok(groups.includes(group), `probe group ${group}`);
  const agree = record.agree;
  assert.ok(agree.ok && agree.checks.length === 8 && agree.checks.every(c => c.ok && c.detail.differences.length === 0), 'both mounts agree with the frozen pack\'s settings screen');
  assert.deepEqual(agree.problems, [], 'agreement: no page problem');
  // The one accepted difference: the three sizes one a row at the Largest text, recorded against the pack as it is.
  const stacked = agree.checks.filter(c => c.detail.accepted);
  assert.equal(stacked.length, 2);
  assert.ok(stacked.every(c => c.detail.accepted.screenStacked && !c.detail.accepted.packStacked));
});
