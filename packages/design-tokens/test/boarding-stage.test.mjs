// The boarding stage (design/phone-ui/components/boarding-stage): a runtime source the game imports as it is,
// so its module graph, its styles' scope, its inputs and its words are checked here; its drawing, lifecycle
// and agreement with the pack in a browser under the production headers by design/tools/boarding-stage-check.mjs,
// whose record is checked last.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BOARDING_STAGE_DEFAULTS, BOARDING_STAGE_VERSION, BOARDING_WORDS, CROSSFADE_MS, CROSSFADE_REDUCED_MS, boardingWait, nextBoardingStageInput,
} from '../../../design/phone-ui/components/boarding-stage/boarding-stage.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/boarding-stage';
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

const clock = t => ({ elapsedMs: t, endsAtMs: 10000 });

test('the component is a runtime source: its whole graph is runtime-safe', () => {
  const files = new Map(['boarding-stage.mjs', 'boarding-stage.css'].flatMap(f => [...graph(join(REPO, COMPONENT, f))]));
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview|pregame-films)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the shell\'s and the kit\'s crew-runtime.mjs)');
  for (const path of [`${COMPONENT}/boarding-stage.mjs`, 'design/phone-ui/components/phone-shell/phone-shell.mjs', 'design/phone-ui/components/kit/kit.mjs', 'design/phone-ui/components/kit/kit.css']) {
    assert.ok(local.includes(path), `${path} is in the graph`);
  }
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/boarding-stage-check.mjs'), /^\/\/ mothership:dev-only/);
});

test('its styles reach nothing outside it: every rule under its root, kit controls placed only through its own parts', () => {
  const path = `${COMPONENT}/boarding-stage.css`;
  const raw = read(path);
  assert.match(raw, /^@import url\("\.\.\/kit\/kit\.css"\);/, 'it starts from the shared kit');
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]*;/g, '');
  const list = [...css.matchAll(/(^|[{}])([^{}]*?)\{/g)].map(m => m[2].trim()).filter(s => s && !s.startsWith('@')).flatMap(split);
  assert.ok(list.length > 10, `found the rules (${list.length})`);
  for (const selector of list) {
    assert.match(selector, /^\.ms-boarding-stage(?:[\s.:\[]|$)/, `"${selector}" is scoped`);
    assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
    assert.doesNotMatch(selector, /\.ms-(?:phone-shell|ps-|role-stage|rst-|own-card|rc-)/, `"${selector}" reaches no other component`);
    assert.doesNotMatch(selector, /\.ms-bst-picture[\s>+~]/, `"${selector}": nothing inside the film's player`);
    if (/\.ms-k-/.test(selector)) assert.match(selector, /\.ms-bst-[\w-]+[^,]*\.ms-k-/, `"${selector}": a kit part styled only inside its own parts`);
    assert.doesNotMatch(selector, /^\.ms-boarding-stage(?:\[[^\]]*\])?\s+(?::is\()?(?:button|div|span|b|p|h2|svg)\b/, `"${selector}": no bare element straight under the root`);
  }
  assert.deepEqual([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]), [], 'no keyframes of its own');
  const declared = [...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))];
  assert.deepEqual(declared.filter(p => !p.startsWith('--ms-bst-')), [], 'custom properties are its own');
});

test('its words are the pack\'s: the boarding screen of sheet 19', () => {
  const pregame = read('design/phone-ui/prototype/screens-pregame.mjs');
  for (const words of [`'${BOARDING_WORDS.skip}'`, `'${BOARDING_WORDS.holding}'`, `'${BOARDING_WORDS.waiting}'`, BOARDING_WORDS.ship, 'Round 1 in 0:']) {
    assert.ok(pregame.includes(words), `screens-pregame.mjs: ${words}`);
  }
  // The film's accessible name is today's game's (apps/game/hosted/planet/pregame.mjs).
  assert.ok(read('apps/game/hosted/planet/pregame.mjs').includes(`'${BOARDING_WORDS.film}'`));
  assert.equal(BOARDING_WORDS.roundIn('0:04'), 'Round 1 in 0:04');
  assert.equal(CROSSFADE_MS, 220, 'the handoff: a state change crossfades in 220 ms');
  assert.equal(CROSSFADE_REDUCED_MS, 80, 'the handoff: with Reduce motion, 80 ms');
  assert.equal(BOARDING_STAGE_VERSION, 'boarding-stage-0.1.0');
});

test('inputs are checked, and refused with a reason', () => {
  const refuses = (input, pattern) => assert.throws(() => nextBoardingStageInput(BOARDING_STAGE_DEFAULTS, input), pattern);
  refuses({ status: 'offline' }, /Status is live, stale, concealed/);
  refuses({ view: 'round1' }, /view is film, holding, waiting/);
  refuses({ clock: { elapsedMs: 1000, endsAtMs: 0 } }, /endsAtMs > 0/);
  refuses({ clock: { elapsedMs: '1s', endsAtMs: 10000 } }, /clock is \{ elapsedMs, endsAtMs \}/);
  refuses({ insets: { top: '47px' } }, /insets are null/);
  const d = nextBoardingStageInput(BOARDING_STAGE_DEFAULTS, {});
  assert.equal(d.view, 'holding');
  assert.equal(d.skip, null, 'no Skip unless Frontend gives it');
  assert.deepEqual(nextBoardingStageInput(d, { skip: {} }).skip, { enabled: true, reason: null });
  assert.equal(nextBoardingStageInput(d, { clock: clock(12000) }).clock.elapsedMs, 10000, 'never past the interval\'s end');
  const once = nextBoardingStageInput(d, { clock: clock(3000), view: 'film', skip: { enabled: false, reason: 'Not available now' } });
  assert.deepEqual(nextBoardingStageInput(once, {}), once, 'the checked forms are stable');
});

test('the holding block follows the view and the server\'s clock, and counts nothing itself', () => {
  const at = (t, view = 'holding') => boardingWait(nextBoardingStageInput(BOARDING_STAGE_DEFAULTS, { clock: t === null ? null : clock(t), view }));
  assert.deepEqual(at(6000), { icon: 'flag', filled: true, title: 'Boarding', line: 'Round 1 in 0:04', busy: false });
  assert.equal(at(6001).line, 'Round 1 in 0:04', 'whole seconds, rounded up');
  assert.equal(at(9999).line, 'Round 1 in 0:01');
  assert.equal(at(null).line, null, 'without a trusted clock, no countdown');
  assert.deepEqual(at(10000, 'waiting'), { icon: 'hourglass', filled: true, title: 'Starting Round 1', line: 'Waiting for the ship', busy: true });
});

test('the check\'s record: every capture, probe check and agreement case passed under the production headers', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/boarding-stage-check.mjs');
  assert.ok(record.sourceClean, 'recorded against a clean source');
  assert.match(record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '', /default-src 'none'/);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 20, 'ten states at two sizes');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn, `${key} passed and drew what its state asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
  }
  for (const size of ['390x844', '430x932']) {
    assert.equal(record.captures[`${size}/holding`].line, 'Round 1 in 0:04', `${size}: sheet 19's countdown`);
    assert.ok(record.captures[`${size}/holding`].canvas, `${size}: the holding screen on the pack's canvas`);
    assert.equal(record.captures[`${size}/display`].skip, null, `${size}: the shared display has no Skip`);
    assert.ok(record.captures[`${size}/concealed`].covered && !record.captures[`${size}/concealed`].filmShown, `${size}: concealed, a plain cover and nothing drawn`);
  }
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const groups = record.probe.full.checks.map(c => c.id.split(':')[0]);
  for (const group of ['focus', 'refused', 'time', 'conceal', 'film', 'dispose', 'motion']) assert.ok(groups.includes(group), `probe group ${group}`);
  assert.ok(record.agree.ok && record.agree.checks.length === 6 && record.agree.checks.every(c => c.ok && c.detail.differences.length === 0), 'the stage agrees with the frozen pack\'s boarding screen');
});
