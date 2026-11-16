// Host controls (design/phone-ui/components/host-controls): a runtime source the game imports as it is, so its module
// graph, its styles' scope, its inputs, the sheet it gives the shell, the code's privacy and its words are checked
// here; its drawing and lifecycle in a browser under the production headers by design/tools/host-controls-check.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CODE_MASK, HOST_CONTROLS_DEFAULTS, HOST_CONTROLS_VERSION, HOST_SHEET_ID, HOST_WORDS, hostControlsSheet, nextHostControlsInput,
} from '../../../design/phone-ui/components/host-controls/host-controls.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/host-controls';
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

const CODE = 'q7Hc2-Lm9xT-4ZpWd-8rVnK-2bYs6-Jt';
const SEATS = [{ seat: 1, name: 'Ava', character: 'c1' }, { seat: 4, name: 'Dev', character: 'c4' }];
const code = (revealed, extra = {}) => ({ seat: 4, name: 'Dev', matchId: 'mtch-8f2c4e', revealed, value: revealed ? CODE : null, minutes: 15, ...extra });
const live = (extra = {}) => nextHostControlsInput(HOST_CONTROLS_DEFAULTS, { viewer: 4, deadline: { enabled: true }, bots: { enabled: true }, abort: { enabled: true }, seats: SEATS, ...extra });

test('the component is a runtime source: its whole graph is runtime-safe, and it sends nothing', () => {
  const files = new Map(['host-controls.mjs', 'host-controls.css'].flatMap(f => [...graph(join(REPO, COMPONENT, f))]));
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview|pregame-films)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the kit\'s crew-runtime.mjs)');
  const own = graph(join(REPO, COMPONENT, 'host-controls.mjs')).get(join(REPO, COMPONENT, 'host-controls.mjs'));
  assert.deepEqual(own, ['../kit/kit.mjs'], 'the kit only: the sheet\'s frame is the shell\'s, which Frontend opens');
  // The commands are Frontend's to send, the clipboard Frontend's to write, the clock the server's.
  const source = read(`${COMPONENT}/host-controls.mjs`).replace(/^\s*\/\/.*$/gm, '').replace(/^\s*\*.*$/gm, '');
  assert.doesNotMatch(source, /fetch\(|navigator|clipboard|localStorage|Date\.now|setInterval|setTimeout|console\./, 'it sends, stores, copies, counts and logs nothing');
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/host-controls-check.mjs'), /mothership:dev-only/);
});

test('its styles reach nothing outside its root', () => {
  const file = `${COMPONENT}/host-controls.css`;
  const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
  const list = selectors(file);
  assert.ok(list.length >= 8, `found the rules (${list.length})`);
  for (const selector of list) {
    assert.match(selector, /^\.ms-host-controls(?:[\s.:[]|$)/, `"${selector}" is scoped`);
    assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
    assert.doesNotMatch(selector, /\.ms-(?:phone-shell|ps-|role-stage|rst-|char-select|cs-|display-settings|settings-sheet|ds-|room-scene)/, `"${selector}" reaches no other component`);
    if (/\.ms-k-/.test(selector)) assert.match(selector, /^\.ms-host-controls :is\(/, `"${selector}": a kit part only hidden with the component's own`);
  }
  assert.deepEqual([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]), [], 'no motion of its own: the spinner is the kit\'s');
  assert.match(read(file), /^@import url\("\.\.\/kit\/kit\.css"\);/, 'it starts from the kit\'s stylesheet');
  const declared = [...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))];
  assert.deepEqual(declared.filter(p => !p.startsWith('--ms-hc-')), [], 'custom properties are its own');
});

test('its words are the pack\'s (sheet 15)', () => {
  const more = read('design/phone-ui/prototype/screens-more.mjs');
  for (const words of [HOST_WORDS.title, HOST_WORDS.deadline, HOST_WORDS.deadlineLine, HOST_WORDS.bots, HOST_WORDS.botsLine, HOST_WORDS.recovery, HOST_WORDS.newCode,
    HOST_WORDS.abort, HOST_WORDS.abortLine, HOST_WORDS.codeTitle, HOST_WORDS.codeSub, HOST_WORDS.codeFor(4, 'Dev'), HOST_WORDS.matchId, HOST_WORDS.code, HOST_WORDS.terms(15),
    HOST_WORDS.codeNote(4), HOST_WORDS.reveal, HOST_WORDS.hide, HOST_WORDS.copy, HOST_WORDS.confirm, HOST_WORDS.confirmLine, HOST_WORDS.keep, HOST_WORDS.abortConfirm, CODE_MASK]) {
    assert.ok(more.includes(`'${words}'`), `screens-more.mjs: ${words}`);
  }
  assert.ok(read('design/phone-ui/prototype/ui.mjs').includes(`toast = (text, icon = 'check')`) && more.includes(`toast('${HOST_WORDS.copied}')`), 'the pack\'s "Copied" toast, with the check');
  assert.equal(HOST_WORDS.seat(3, 'Cleo'), '3 · Cleo');
  assert.equal(HOST_WORDS.terms(1), 'Works once · 1 minute');
  assert.equal(HOST_CONTROLS_VERSION, 'host-controls-0.1.0');
});

test('its inputs are checked, and refused with a reason', () => {
  const refuses = (input, pattern) => assert.throws(() => nextHostControlsInput(HOST_CONTROLS_DEFAULTS, input), pattern);
  refuses({ view: 'settings' }, /view is list, code, abort/);
  refuses({ status: 'offline' }, /Status is live, stale, concealed/);
  refuses({ bots: 'yes' }, /bots is \{ enabled, busy, reason \}/);
  refuses({ deadline: { enabled: false, reason: 5 } }, /deadline is \{ enabled, busy, reason \}/);
  refuses({ seats: {} }, /seats are \[/);
  refuses({ seats: [{ seat: 0, name: 'Ava' }] }, /needs its seat number/);
  refuses({ seats: [{ seat: 1 }] }, /Seat 1 needs its name/);
  refuses({ seats: [SEATS[0], SEATS[0]] }, /Seat 1 is given twice/);
  refuses({ code: { seat: 4, name: 'Dev' } }, /code is null, or \{ seat, name, matchId/);
  refuses({ code: code(true, { value: null }) }, /A revealed code needs its value/);
  refuses({ code: code(true, { minutes: 0 }) }, /minutes are the whole minutes left/);
  refuses({ code: code(true, { minutes: 2.5 }) }, /minutes are the whole minutes left/);
  const d = nextHostControlsInput(HOST_CONTROLS_DEFAULTS, {});
  for (const name of ['deadline', 'bots', 'abort']) assert.deepEqual(d[name], { enabled: false, busy: false, reason: null }, `${name} not offered until Frontend gives it`);
  assert.deepEqual([d.view, d.status, d.code, d.seats], ['list', 'live', null, []]);
  assert.deepEqual(live().seats[0], { seat: 1, name: 'Ava', character: 'c1', enabled: true, busy: false, reason: null }, 'a listed seat is offered unless Frontend says otherwise');
  const once = live({ view: 'code', code: code(true) });
  assert.deepEqual(nextHostControlsInput(once, {}), once, 'the checked form is stable');
});

test('the code: given only while revealed, dropped when the viewer changes or the sheet is concealed', () => {
  assert.throws(() => live({ code: code(false, { value: CODE }) }), /only while it is revealed/, 'the page never holds the code hidden');
  assert.equal(live({ code: code(false) }).code.value, null);
  const shown = live({ view: 'code', code: code(true) });
  assert.equal(nextHostControlsInput(shown, { viewer: 5 }).code, null, 'a new viewer: dropped');
  assert.equal(nextHostControlsInput(shown, { viewer: 5, code: code(true) }).code.value, CODE, 'what the same update gives is kept');
  assert.equal(nextHostControlsInput(shown, { viewer: 4 }).code.value, CODE, 'the same viewer again drops nothing');
  const hidden = nextHostControlsInput(shown, { status: 'concealed' });
  assert.equal(hidden.code, null, 'concealed: dropped');
  assert.equal(nextHostControlsInput(hidden, { code: code(true) }).code, null, 'refused while concealed');
  assert.equal(nextHostControlsInput(hidden, { status: 'live' }).code, null, 'nothing comes back by itself');
});

test('the sheet it gives the shell: the pack\'s frame and footer for each view; local buttons and the abort command', () => {
  const list = hostControlsSheet(live());
  assert.deepEqual(list, { id: HOST_SHEET_ID, back: true, close: true, detent: 'large', title: 'Host controls', actions: [] });
  const hidden = hostControlsSheet(live({ view: 'code', code: code(false) }));
  assert.deepEqual([hidden.id, hidden.title, hidden.sub, hidden.detent], [HOST_SHEET_ID, 'Recovery code', 'Private to this phone', 'large']);
  assert.deepEqual(hidden.actions, [
    { id: 'reveal', label: 'Reveal', kind: 'secondary', icon: 'show', local: true },
    { id: 'copy', label: 'Copy', kind: 'primary', icon: 'copy', local: true },
  ], 'Reveal and Copy are this phone\'s own: they work while reconnecting (the Lead\'s answer 5)');
  assert.deepEqual(hostControlsSheet(live({ view: 'code', code: code(true) })).actions.map(a => [a.id, a.icon, a.local]), [['hide', 'hide', true], ['copy', 'copy', true]]);
  assert.deepEqual(hostControlsSheet(live({ view: 'code', code: null })).actions, [], 'no code, no footer');
  assert.ok(!JSON.stringify(hostControlsSheet(live({ view: 'code', code: code(true) }))).includes(CODE), 'the code is never in the sheet\'s frame');
  const confirm = hostControlsSheet(live({ view: 'abort', abort: { enabled: true, busy: true } }));
  assert.deepEqual(confirm.actions, [
    { id: 'keep', label: 'Keep playing', kind: 'secondary', local: true },
    { id: 'abort', label: 'Abort match', kind: 'warn', enabled: true, busy: true, reason: null },
  ], 'Abort match is the command, the kit\'s warn button (the Lead\'s answer 3), with Frontend\'s state');
  assert.equal(hostControlsSheet(live({ view: 'abort', abort: { enabled: false, reason: 'Only between turns' } })).actions[1].reason, 'Only between turns');
  // One id for the three views, so the shell keeps its body (and this content) through them.
  assert.ok([list, hidden, confirm].every(s => s.id === 'host-controls'));
});

test('the check\'s record: every capture, probe check and agreement case passed under the production headers', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/host-controls-check.mjs');
  assert.ok(record.sourceClean, 'recorded against a clean source');
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 20, 'sheet 15\'s four states and the copy, a command in flight and refused, the abort in flight, reconnecting and the Largest text, at two sizes');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn, `${key} passed and drew what its state asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
    assert.deepEqual(c.cut, [], `${key}: every word whole`);
    assert.equal(c.codeInPage, /\/(?:revealed|largest)$/.test(key), `${key}: the code in the page only while revealed`);
  }
  for (const size of ['390x844', '430x932']) assert.ok(record.captures[`${size}/abort`].abortWarn, `${size}: Abort match is the warn button`);
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const ids = record.probe.full.checks.map(c => c.id);
  for (const group of ['report', 'command', 'reconnect', 'privacy', 'minutes', 'focus', 'words', 'layout', 'dispose', 'motion']) assert.ok(ids.some(id => id.startsWith(`${group}:`)), `probe group ${group}`);
  // The Lead's privacy checks (#295, answer 4), each its own.
  for (const pattern of [/only while revealed/, /never in an attribute, a report or the layout/, /when the viewer changes/, /while concealed/]) assert.ok(ids.some(id => pattern.test(id)), `probe: ${pattern}`);
  const agree = record.agree;
  assert.ok(agree.ok && agree.checks.length === 9 && agree.checks.every(c => c.ok && c.detail.differences.length === 0), 'the sheet agrees with the frozen pack\'s host-controls screen');
  assert.deepEqual(agree.problems, [], 'agreement: no page problem');
  // The shell's, recorded and raised with the Lead (the head with Back; the footer at the Larger text): nothing else.
  for (const c of agree.checks) for (const d of c.detail.shell) assert.match(d.part, /^sheet (?:head|footer)$/, `${c.id}: only the shell's head and footer are recorded as the shell's`);
  assert.ok(agree.checks.some(c => c.detail.shell.some(d => d.part === 'sheet head')), 'the head with Back is recorded');
  // The one accepted difference: the timer icon keeps its 24 px at the Largest text.
  const accepted = agree.checks.filter(c => c.detail.accepted);
  assert.equal(accepted.length, 1);
  assert.ok(/Largest/.test(accepted[0].id) && accepted[0].detail.accepted.screen.w === 24 && accepted[0].detail.accepted.pack.w < 24);
});
