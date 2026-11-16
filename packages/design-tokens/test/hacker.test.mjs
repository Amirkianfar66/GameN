// The Hacker's Scan and final Code (design/phone-ui/components/hacker): a runtime source the game imports as it is,
// so its module graph, its styles' scope, its inputs, its privacy rules and its words are checked here; its
// drawing, lifecycle and agreement with the pinned pack in a browser under the production headers by
// design/tools/hacker-check.mjs, whose record is checked last.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CODE_RESULT_DEFAULTS, FINAL_CODE_DEFAULTS, HACKER_VERSION, HACKER_WORDS, SCAN_GUESS_DEFAULTS, SCAN_RESULT_DEFAULTS, SIDES,
  checkCodeResult, checkFinalCode, checkScanGuess, checkScanResult, codeSheet, scanBar, scanSheet,
} from '../../../design/phone-ui/components/hacker/hacker.mjs';
import { ICON_NAMES } from '../../../design/phone-ui/components/icons.mjs';
import { HACKER_STATES, PACK_FRAMES } from '../../../design/phone-ui/components/hacker/preview/states.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/hacker';
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
/** A selector list split at its top-level commas. */
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
const CHECKS = { guess: checkScanGuess, result: checkScanResult, code: checkFinalCode, outcome: checkCodeResult };
const people = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({ seat: `seat-${n}`, name: `P${n}` }));
const seats = people.map(p => p.seat);
const gus = { seat: 'seat-7', name: 'Gus', character: 'c7' };

test('the component is a runtime source: its whole graph is runtime-safe and in the hosted graph', () => {
  const files = new Map([...graph(join(REPO, COMPONENT, 'hacker.mjs')), ...graph(join(REPO, COMPONENT, 'hacker.css'))]);
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the kit\'s crew-runtime.mjs)');
  for (const path of [`${COMPONENT}/hacker.mjs`, `${COMPONENT}/hacker.css`, 'design/phone-ui/components/kit/kit.mjs', 'design/phone-ui/components/kit/kit.css', 'design/phone-ui/components/icons.mjs']) {
    assert.ok(local.includes(path), `${path} is in the graph`);
  }
  // On the kit alone (its notice since 0.7.0). Neither Actions nor play-parts nor any other component: the Scan
  // bar's words exist once, here (the Lead's note 2).
  assert.ok(!local.some(p => /\/(?:actions|play-parts|room-scene|phone-shell|vote|card|role-stage|private-talk)\//.test(p)), 'no other component: Frontend mounts each part in the shell\'s sheet body');
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs', 'preview/states.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/hacker-check.mjs'), /^\/\/ mothership:dev-only/);
  assert.equal(HACKER_VERSION, 'hacker-0.1.0');
});

test('its styles reach nothing outside the component: every rule is under its root, weighs two classes and places the kit\'s only inside its own; its one motion is the results\' stamp snap', () => {
  const css = read(`${COMPONENT}/hacker.css`).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /^\s*@import url\("\.\.\/kit\/kit\.css"\);\s*\.ms-hacker/, 'it starts from the kit alone');
  // Q-a (the Lead, 16 November; the handoff's motion table): MATCHED, NO MATCH, CODE CORRECT and CODE WRONG snap in
  // as REGISTERED does, 120 ms, and are there at once with the game's or the device's Reduce motion.
  assert.deepEqual([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]), ['ms-hk-stamp-in'], 'its one motion, the results\' stamp snap');
  assert.deepEqual([...css.matchAll(/animation:\s*([^;}]+)/g)].map(m => m[1].trim()), ['ms-hk-stamp-in 120ms var(--ms-k-ease) both', 'none', 'none'], 'the snap is REGISTERED\'s 120 ms, and stops with Reduce motion');
  assert.doesNotMatch(css, /transition/, 'nothing else moves');
  assert.match(css, /\.ms-hacker\.ms-kit\[data-motion="reduced"\] \.ms-hk-result \.ms-k-stamp \{ animation: none; \}/, 'the game\'s Reduce motion');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.ms-hacker \.ms-hk-result \.ms-k-stamp \{ animation: none; \} \}/, 'the device\'s Reduce motion');
  // The imports first, or the first rule's prelude would take them in; the keyframes' steps are not rules.
  const selectors = [...css.replace(/@import[^;]*;/g, '').matchAll(/([^{}]+)\{/g)].map(m => m[1].trim()).filter(s => s && !s.startsWith('@') && !/^(?:from|to|\d+%)$/.test(s));
  assert.ok(selectors.length >= 8, `found the rules (${selectors.length})`);
  for (const list of selectors) {
    for (const selector of split(list)) {
      assert.match(selector, /^\.ms-hacker(?:\.ms-kit)?(?:\[data-motion="reduced"\]|:focus)?(?:\s|$)/, `"${selector}" is under the component's root`);
      assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
      assert.ok((selector.match(/\.[\w-]+/g) ?? []).length >= 2, `"${selector}": two classes, so it outranks the kit in any order`);
      for (const part of selector.split(/\s+|>|\+|~/).slice(1).filter(Boolean)) assert.match(part, /^(?:\.ms-(?:hk|k)-|\[hidden\]$)/, `"${selector}": "${part}" is its own, or the kit's`);
      if (/\.ms-k-/.test(selector)) assert.match(selector, /\.ms-hk-[\w-]+\s[^,]*\.ms-k-/, `"${selector}": a kit part placed only inside the component's own`);
    }
  }
  assert.deepEqual([...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))], [], 'no kit token or other component\'s property is declared');
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i, 'no colour of its own');
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

test('its words are the pack\'s (screens-more.mjs scan() and code(), ui.mjs), and the few the decisions add', () => {
  const pack = ['design/phone-ui/prototype/screens-more.mjs', 'design/phone-ui/prototype/screens-game.mjs', 'design/phone-ui/prototype/ui.mjs'].map(read).join('\n');
  const W = HACKER_WORDS;
  const words = [W.scan, W.chooseInRoom, W.onlyHere, W.scanWho('Gus'), W.guessLine, W.guess, W.matched, W.noMatch, W.guessed('Gus', 'Blue'), W.inCode, W.yes, W.blocked(4),
    W.cancel, W.done, W.code, W.pickLine, W.confirmLine, W.next, W.back, W.submit, W.correct, W.wrong, W.unlocked, W.separate, W.used, ...SIDES];
  for (const w of words) assert.ok(pack.includes(w), `"${w}" is the pack's`);
  // "Pick 1"–"Pick 4", as code() writes them; a cell's name, as the pack's cell() words its aria-label.
  assert.ok(pack.includes('`Pick ${k + 1}`') && W.pick(3) === 'Pick 3', 'the pack\'s Pick n');
  assert.ok(pack.includes('`Player ${p.seat}, ${p.name}${note ? `, ${note}` : \'\'}`'), 'the pack\'s cell name');
  assert.equal(W.cell(2, 'Ben', 'Pick 1'), 'Player 2, Ben, Pick 1');
  assert.equal(W.cell(1, 'Ava', ''), 'Player 1, Ava');
  for (const icon of ['scan', 'code', 'lock', 'check']) assert.ok(ICON_NAMES.includes(icon), `${icon} is in the game's icon family`);
  // Added by the decisions, each recorded in the interface: Q2's "No", Q3's two sending words, and T3's
  // "Not available now" (the owner's, 11 November 2026).
  const doc = read('docs/design/components/hacker.md');
  for (const w of [W.scanning, W.submitting, W.notAvailable]) {
    assert.ok(!read('design/phone-ui/prototype/screens-more.mjs').includes(w), `"${w}" is not the pack's scan() or code()`);
    assert.ok(doc.includes(`"${w}"`), `"${w}" is recorded in the interface`);
  }
  assert.ok(doc.includes('"In the Code · No"'), 'Q2\'s row is recorded');
  // Q-b (the Lead, 16 November; the handoff): CODE WRONG says only "Your one attempt is used". The pack's "Scan stays
  // available" states a rule the planet-navigation overlay leaves open, so the component does not say it.
  assert.ok(read('design/phone-ui/prototype/screens-more.mjs').includes("h('p', 'Scan stays available')"), 'the pack draws the line the Lead dropped');
  assert.ok(!Object.values(W).includes('Scan stays available'), 'the component does not say it');
  const overlay = JSON.parse(read('rules/overlays/planet-navigation-code-owner-decisions-2026-10-25.json'));
  assert.match(overlay.open_integration_details[5]?.question ?? '', /continued Scan availability was not decided/, 'Scan after the failed Code is open (CODE-OPEN-02)');
  assert.ok(doc.includes('**Q-b.') && doc.includes('CODE-OPEN-02'), 'Q-b is recorded with its reason');
  assert.match(read('AGENTS.md'), /\*\*Not available now\*\*/, 'T3\'s words are the owner\'s');
});

test('inputs: checked and normalized, an error for anything unknown; this viewer\'s dropped when concealed or for a new viewer', () => {
  assert.deepEqual(Object.keys(SCAN_GUESS_DEFAULTS).sort(), ['error', 'guess', 'interactive', 'phase', 'reducedMotion', 'status', 'target', 'versions', 'viewer']);
  assert.deepEqual(Object.keys(SCAN_RESULT_DEFAULTS).sort(), ['blockedRound', 'guess', 'inCode', 'interactive', 'matched', 'reducedMotion', 'status', 'target', 'versions', 'viewer']);
  assert.deepEqual(Object.keys(FINAL_CODE_DEFAULTS).sort(), ['error', 'interactive', 'offered', 'people', 'phase', 'picks', 'reducedMotion', 'status', 'step', 'versions', 'viewer']);
  assert.deepEqual(Object.keys(CODE_RESULT_DEFAULTS).sort(), ['correct', 'interactive', 'reducedMotion', 'status', 'versions', 'viewer']);
  const code = checkFinalCode({ viewer: 'seat-4', people, offered: seats, picks: ['seat-8', 2, 'seat-5', 6], step: 'confirm' });
  assert.equal(code.viewer, 4, 'the viewer\'s seat, as a number');
  assert.deepEqual(code.picks, [8, 2, 5, 6], 'the picks in the order picked, as numbers');
  assert.equal(code.people[0].seat, 'seat-1', 'a person\'s seat as Frontend gave it, which onPick reports back');
  assert.deepEqual(checkFinalCode(code), code, 'checking a checked input changes nothing');
  const guess = checkScanGuess({ viewer: 4, target: gus, guess: 'Red' });
  assert.deepEqual(checkScanGuess(guess), guess);
  for (const [what, fn, pattern] of [
    ['an unknown key', () => checkScanGuess({ target: gus, colour: 'red' }), /Unknown input "colour"/],
    ['a guess that is not a side, never echoed', () => checkScanGuess({ target: gus, guess: 'Green' }), /^TypeError: guess is Blue, Red or Alien, or null$/],
    ['a phase that is not one', () => checkScanGuess({ target: gus, phase: 'done' }), /phase is ready or sending/],
    ['a match without inCode', () => checkScanResult({ target: gus, guess: 'Blue', matched: true }), /inCode is true or false/],
    ['inCode without a match', () => checkScanResult({ target: gus, guess: 'Blue', matched: false, inCode: false }), /inCode is null/],
    ['a match that blocks a round', () => checkScanResult({ target: gus, guess: 'Blue', matched: true, inCode: true, blockedRound: 4 }), /blockedRound is null/],
    ['a result without its target', () => checkScanResult({ guess: 'Blue', matched: true, inCode: true }), /needs its target/],
    ['five picks', () => checkFinalCode({ people, offered: seats, picks: seats.slice(0, 5) }), /at most four/],
    ['a pick not offered, never named', () => checkFinalCode({ people, offered: seats.slice(1), picks: ['seat-1'] }), /^TypeError: picks lists a seat that is not offered$/],
    ['a pick twice', () => checkFinalCode({ people, offered: seats, picks: ['seat-1', 1] }), /picks lists a seat twice/],
    ['the confirm step without four', () => checkFinalCode({ people, offered: seats, picks: seats.slice(0, 2), step: 'confirm' }), /needs four picks/],
    ['a person twice', () => checkFinalCode({ people: [...people.slice(0, 8), people[0]] }), /lists Player 1 twice/],
    ['an unknown status', () => checkCodeResult({ status: 'away' }), /Status is live, stale, concealed/],
  ]) assert.throws(fn, pattern, what);
});

test('every preview state is a valid input of its part, and every compared pack frame has its state', () => {
  const kinds = new Set();
  for (const [key, state] of Object.entries(HACKER_STATES)) {
    if (!state.part) continue;
    kinds.add(state.part.kind);
    assert.doesNotThrow(() => CHECKS[state.part.kind]({ viewer: 'seat-4', ...state.part.input }), key);
  }
  assert.deepEqual([...kinds].sort(), Object.keys(CHECKS).sort(), 'every part has a preview state');
  assert.equal(Object.keys(HACKER_STATES).length, 26);
  for (const key of Object.keys(PACK_FRAMES)) assert.ok(HACKER_STATES[key], `${key} is a preview state`);
  assert.deepEqual(Object.values(PACK_FRAMES).map(f => f.frame).sort(), ['code&state=confirm', 'code&state=correct', 'code&state=pick', 'code&state=wrong', 'scan&state=guess', 'scan&state=result', 'scan&state=target', 'scan&state=wrong'],
    'the pack\'s eight frames of scan() and code()');
});

test('the target bar and the sheets\' frames (the Lead\'s note 1): no ✕, their footers, "Only on this phone"', () => {
  assert.deepEqual(scanBar(), { icon: 'scan', title: 'Scan', sub: 'Choose a player in your room' });
  const buttons = sheet => sheet.actions.map(a => [a.id, a.label, a.icon ?? null, a.busy ?? false, a.enabled ?? true, a.local ?? false]);
  for (const sheet of [scanSheet(), scanSheet({ step: 'result' }), codeSheet(), codeSheet({ step: 'confirm' }), codeSheet({ step: 'result' })]) {
    assert.equal(sheet.close, false, `${sheet.id}: no ✕`);
    assert.equal(sheet.sub, 'Only on this phone');
  }
  assert.deepEqual(buttons(scanSheet()), [['cancel', 'Cancel', null, false, true, true], ['scan', 'Scan', 'scan', false, false, false]], 'Scan off until a guess is given');
  assert.deepEqual(buttons(scanSheet({ guess: 'Alien' })), [['cancel', 'Cancel', null, false, true, true], ['scan', 'Scan', 'scan', false, true, false]]);
  assert.deepEqual(buttons(scanSheet({ guess: 'Alien', phase: 'sending' })), [['cancel', 'Cancel', null, false, false, true], ['scan', 'Scanning…', 'scan', true, true, false]]);
  assert.deepEqual(buttons(scanSheet({ step: 'result' })), [['done', 'Done', null, false, true, true]]);
  assert.equal(codeSheet().detent, 'large');
  assert.deepEqual(buttons(codeSheet({ count: 3 })), [['next', 'Next', null, false, false, true]], 'Next off until four are picked');
  assert.deepEqual(buttons(codeSheet({ count: 4 })), [['next', 'Next', null, false, true, true]]);
  assert.deepEqual(buttons(codeSheet({ step: 'confirm' })), [['back', 'Back', null, false, true, true], ['submit', 'Submit Code', 'code', false, true, false]]);
  assert.deepEqual(buttons(codeSheet({ step: 'confirm', phase: 'sending' })), [['back', 'Back', null, false, false, true], ['submit', 'Submitting…', 'code', true, true, false]]);
  assert.deepEqual(buttons(codeSheet({ step: 'result' })), [['done', 'Done', null, false, true, true]]);
  assert.throws(() => scanSheet({ step: 'check' }), /step is guess or result/);
  assert.throws(() => scanSheet({ guess: 'Green' }), /guess is Blue, Red or Alien/);
  assert.throws(() => codeSheet({ count: 5 }), /count is how many are picked/);
});

test('the check\'s record: every capture, the probe and the agreement passed, on clean committed source, under the production headers', () => {
  const path = `${COMPONENT}/review/check.json`;
  assert.ok(existsSync(join(REPO, path)), 'the check has been recorded');
  const record = JSON.parse(read(path));
  assert.equal(record.tool, 'design/tools/hacker-check.mjs');
  assert.equal(record.sourceClean, true, 'recorded on committed source');
  assert.match(record.sourceCommit, /^[0-9a-f]{40}$/);
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 46, 'every state at both phone sizes, the small phone\'s and the text sizes\' at their own');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn, `${key} passed and drew what its state asks`);
    assert.deepEqual(c.mismatched, [], `${key}: nothing differs from what its state asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
    assert.equal(sha256(c.file), c.sha256, `${key}: ${c.file} is the capture the record names`);
  }
  for (const size of ['390x844', '430x932']) assert.deepEqual(record.captures[`${size}/concealed`].leaked, [], `${size}: concealed, no private word in the page`);
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  assert.deepEqual(record.probe.full.checks.map(c => c.id), ['guess', 'picks', 'refused', 'results', 'words', 'footer', 'audience', 'leaks', 'inputs', 'private', 'focus', 'text', 'dispose', 'motion']);
  assert.deepEqual(record.probe['device-reduced'].checks.map(c => c.id), ['motion'], 'with the device\'s Reduce motion, the motion check');
  const agree = record.agree;
  assert.ok(agree.ok, 'the agreement with the pack');
  assert.deepEqual(agree.problems, [], 'agreement: no page problem');
  assert.equal(agree.checks.length, 8, 'the pack\'s eight frames');
  for (const c of agree.checks) assert.ok(c.ok, `${c.id} agrees with the pack`);
  // Q-b: one line is taken out of the pack's frame before it is measured, and only there.
  assert.deepEqual(agree.checks.filter(c => c.detail.dropped).map(c => [c.id.split(' ')[1], c.detail.dropped]), [['code-wrong', ['Scan stays available']]]);
  for (const size of ['390x844', '430x932']) assert.equal(record.captures[`${size}/code-wrong`].lines, 'Your one attempt is used', `${size}: CODE WRONG's one line`);
  // Q-a: each result's stamp snaps in over 120 ms, and is there at once with Reduce motion; nothing else moves.
  const motion = record.probe.full.checks.find(c => c.id === 'motion').detail.seen;
  for (const key of ['scan-matched', 'scan-nomatch', 'code-correct', 'code-wrong']) {
    assert.deepEqual(motion[key], [{ name: 'ms-hk-stamp-in', duration: 120, stamp: true }], `${key}: the stamp snaps in`);
    assert.deepEqual(motion[`${key} reduced`], [], `${key}: with the game's Reduce motion, at once`);
  }
  for (const key of ['scan-guess', 'code-pick']) assert.deepEqual(motion[key], [], `${key}: nothing moves`);
  assert.ok(Object.values(record.probe['device-reduced'].checks[0].detail.seen).every(list => list.length === 0), 'with the device\'s Reduce motion, nothing moves');
  // The Code's visually hidden names leave the page with the rest, concealed or handed to another viewer.
  const names = record.probe.full.checks.find(c => c.id === 'leaks').detail.names;
  assert.ok(names.checked >= 14 && names.stayed.length === 0, 'the hidden names leave with the rest');
});
