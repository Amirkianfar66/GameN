// Recover (design/phone-ui/components/recover): a runtime source the game imports as it is, so its module graph,
// its styles' scope, its inputs, its words and how it keeps the recovery code are checked here; its drawing,
// lifecycle and agreement with the pack in a browser under the production headers by
// design/tools/recover-check.mjs, whose record is checked last.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RECOVER_DEFAULTS, RECOVER_VERSION, RECOVER_WORDS, nextRecoverInput } from '../../../design/phone-ui/components/recover/recover.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/recover';
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

test('recover is a runtime source: the whole graph is runtime-safe', () => {
  const files = new Map(['recover.mjs', 'recover.css'].flatMap(f => [...graph(join(REPO, COMPONENT, f))]));
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the kit\'s crew-runtime.mjs)');
  for (const path of [`${COMPONENT}/recover.mjs`, 'design/phone-ui/components/entry-parts/entry-parts.mjs', 'design/phone-ui/components/kit/kit.mjs', 'design/phone-ui/components/kit/kit.css', 'design/phone-ui/components/icons.mjs']) {
    assert.ok(local.includes(path), `${path} is in the graph`);
  }
  assert.ok(!local.some(p => /phone-shell|main-menu|host-room|join-room/.test(p)), 'no shell or other entry screen: the screen stands alone');
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/recover-check.mjs'), /^\/\/ mothership:dev-only/);
});

test('its styles reach nothing outside it: the screen\'s root only', () => {
  const raw = read(`${COMPONENT}/recover.css`);
  assert.match(raw, /^@import url\("\.\.\/kit\/kit\.css"\);\n@import url\("\.\.\/entry-parts\/entry-parts\.css"\);/, 'it starts from the shared kit and the entry parts');
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]*;/g, '');
  const selectors = [...css.matchAll(/([^{}]+)\{[^{}]*\}/g)].flatMap(m => m[1].split(',').map(s => s.trim()));
  assert.deepEqual(selectors, ['.ms-recover', '.ms-recover:focus'], 'only the screen itself: every part is the kit\'s or the entry parts\'');
  assert.doesNotMatch(css, /@keyframes|cursor|--[\w-]+\s*:/, 'no motion, cursor or custom property of its own');
});

test('the code stays in its box: it is read in three places only, and only onRecover carries it out', () => {
  const source = read(`${COMPONENT}/recover.mjs`);
  const uses = [...source.matchAll(/codeBox\.value[^;\n]*/g)].map(m => m[0].trim());
  assert.deepEqual(uses, [
    'codeBox.value })', // onRecover({ matchId, recoveryCode: codeBox.value }), at the tap
    'codeBox.value].length })', // onCode({ length }), at each keystroke
    "codeBox.value = ''", // clearCode(): once recovered, on dispose, or when Frontend asks
  ], 'the code box\'s value is handed over at the tap, counted at a keystroke, and emptied; nowhere else');
  assert.match(source, /on\.onRecover\?\.\(\{ matchId: state\.matchId, recoveryCode: codeBox\.value \}\)/);
  assert.match(source, /on\.onCode\?\.\(\{ length: \[\.\.\.codeBox\.value\]\.length \}\)/);
  assert.doesNotMatch(source, /setAttribute\([^)]*codeBox|dataset\.[\w]+\s*=\s*codeBox|console\./, 'never in an attribute or a log');
  // The box is emptied when the seat is recovered and when the screen goes.
  assert.match(source, /\/\/ Recovered: the secret leaves the page\.\n\s+clearCode\(\);/);
  assert.match(source, /\/\/ The secret leaves the page with the screen\.\n\s+clearCode\(\);/);
  // The kit's secret field: a password box, no autocomplete, autocapitalize or spellcheck.
  assert.match(source, /kit\.field\(\{ label: RECOVER_WORDS\.code, value: '', secret: true, autocomplete: 'off' \}\)/);
  const kit = read('design/phone-ui/components/kit/kit.mjs');
  assert.match(kit, /type: props\.secret \? 'password' : 'text', autocomplete: props\.autocomplete \?\? 'off', spellcheck: 'false',\s*autocapitalize: props\.secret \|\| props\.mono \? 'off' : null/);
});

test('its words are the pack\'s: Recover of sheet 14', () => {
  const entry = read('design/phone-ui/prototype/screens-entry.mjs');
  for (const words of [RECOVER_WORDS.back, RECOVER_WORDS.title, RECOVER_WORDS.heading, RECOVER_WORDS.matchId, RECOVER_WORDS.matchIdHint, RECOVER_WORDS.code, RECOVER_WORDS.codeHint(32),
    RECOVER_WORDS.note, RECOVER_WORDS.refused, RECOVER_WORDS.recover, RECOVER_WORDS.checking, RECOVER_WORDS.recovered(4), RECOVER_WORDS.recoveredLine, RECOVER_WORDS.continue]) {
    assert.ok(entry.includes(words), `screens-entry.mjs: ${words}`);
  }
  // The one sentence the pack does not have: a lost connection (the Lead's review of #291, question 2), in the menu's form.
  assert.equal(RECOVER_WORDS.offline, 'No connection. Recover returns when you are back online.');
  assert.equal(RECOVER_VERSION, 'recover-0.1.0');
});

test('its inputs are checked, and refused with a reason; Frontend never gives the code back', () => {
  const refuses = (input, pattern) => assert.throws(() => nextRecoverInput(RECOVER_DEFAULTS, input), pattern);
  refuses({ recoveryCode: 'x' }, /stays in its box/);
  refuses({ code: 'x' }, /stays in its box/);
  refuses({ view: 'done' }, /The view is "form" or "recovered"/);
  refuses({ matchId: null }, /The Match ID is text/);
  refuses({ codeLength: 0 }, /codeLength is null/);
  refuses({ codeError: 3 }, /codeError is null or words/);
  refuses({ recover: null }, /recover is \{ enabled, busy, reason \}/);
  refuses({ view: 'recovered' }, /needs the seat/);
  const d = nextRecoverInput(RECOVER_DEFAULTS, {});
  assert.deepEqual([d.view, d.matchId, d.codeLength, d.codeError, d.error, d.seat], ['form', '', null, null, null, null], 'no length is guessed');
  const offline = nextRecoverInput(d, { error: RECOVER_WORDS.offline });
  assert.deepEqual(offline.recover, { enabled: true, busy: false, reason: null }, 'the words leave Recover seat as Frontend gave it');
  assert.deepEqual(nextRecoverInput(offline, {}), offline, 'the checked forms are stable');
});

test('the check\'s record: every capture, probe check and agreement case passed under the production headers, the code nowhere in the page', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/recover-check.mjs');
  assert.ok(record.sourceClean, 'recorded against a clean source');
  assert.match(record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '', /default-src 'none'/);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 18, 'nine states at two sizes');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn, `${key} passed and drew what its state asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
    assert.equal(c.canvas, 'rgb(16, 20, 28)', `${key}: on the pack's canvas`);
    assert.equal(c.secretInPage, false, `${key}: the typed code is in no attribute`);
  }
  for (const size of ['390x844', '430x932']) {
    const at = state => record.captures[`${size}/${state}`];
    assert.equal(at('entry').codeHint, '32 characters', `${size}: the hint from Frontend's length`);
    assert.equal(at('no-hint').codeHint, null, `${size}: no length given, no count guessed`);
    assert.ok(at('refused').codeInvalid && at('refused').codeLength === 32, `${size}: refused, the code kept in its box`);
    assert.equal(at('recovered').waitTitle, 'Seat 4 is yours again', `${size}: recovered`);
  }
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const groups = record.probe.full.checks.map(c => c.id.split(':')[0]);
  for (const group of ['form', 'secret', 'typing', 'refused', 'recover', 'recovered', 'offline', 'not interactive', 'insets', 'text', 'input', 'dispose', 'motion']) assert.ok(groups.includes(group), `probe group ${group}`);
  // The Lead's ask: no callback but onRecover carries the code, in the browser.
  const secret = record.probe.full.checks.find(c => c.id.startsWith('secret'));
  assert.ok(secret.ok && secret.detail.seen.others === false && secret.detail.seen.handed.length === 1 && secret.detail.seen.inPage === false && secret.detail.seen.inLayout === false
    && secret.detail.seen.afterRecovered === '' && secret.detail.seen.afterDispose === '', 'only onRecover carries the code, once; it leaves the page');
  assert.ok(record.agree.ok && record.agree.checks.length === 7 && record.agree.checks.every(c => c.ok && c.detail.differences.length === 0), 'the screen agrees with the frozen pack\'s');
});
