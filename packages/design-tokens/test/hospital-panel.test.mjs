// The Hospital panel (design/phone-ui/components/hospital-panel): a runtime source the game imports as it is, so its
// module graph, its styles' scope, its inputs, its privacy rules and its words are checked here; its drawing,
// lifecycle and agreement with the pinned pack in a browser under the production headers by
// design/tools/hospital-panel-check.mjs, whose record is checked last.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HOSPITAL_PANEL_VERSION, PANEL_KEYPAD_DEFAULTS, PANEL_RESULTS, PANEL_STATUS_DEFAULTS, PANEL_WORDS,
  checkPanelKeypad, checkPanelStatus, panelSheet,
} from '../../../design/phone-ui/components/hospital-panel/hospital-panel.mjs';
import { ICON_NAMES } from '../../../design/phone-ui/components/icons.mjs';
import { PACK_FRAMES, PANEL_STATES, keysFor } from '../../../design/phone-ui/components/hospital-panel/preview/states.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/hospital-panel';
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
const CHECKS = { keypad: checkPanelKeypad, status: checkPanelStatus };
/** The pack's own .display-num colours (screens.css), the one place the component has literal colours. */
const DISPLAY_COLOURS = ['#0A1A1A', '#1F8A80', '#A6DFD0'];
/** The shell's glass (its docked sheet marks itself data-ms-surface="glass"), an ancestor of the component's root. */
const GLASS = ':where([data-ms-surface="glass"]) ';
/** The one rule of one class: as the kit's own, border-box for the component's elements (nothing else sets it on them). */
const BOX_SIZING = '.ms-hospital-panel :where([class^="ms-hp-"], [class*=" ms-hp-"]) { box-sizing: border-box; }';

test('the component is a runtime source: its whole graph is runtime-safe and in the hosted graph', () => {
  const files = new Map([...graph(join(REPO, COMPONENT, 'hospital-panel.mjs')), ...graph(join(REPO, COMPONENT, 'hospital-panel.css'))]);
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the kit\'s crew-runtime.mjs)');
  for (const path of [`${COMPONENT}/hospital-panel.mjs`, `${COMPONENT}/hospital-panel.css`, 'design/phone-ui/components/kit/kit.mjs', 'design/phone-ui/components/kit/kit.css', 'design/phone-ui/components/icons.mjs']) {
    assert.ok(local.includes(path), `${path} is in the graph`);
  }
  // On the kit alone, as the Hacker: neither Actions nor play-parts nor any other component. Frontend mounts each
  // part in the shell's sheet body.
  assert.ok(!local.some(p => /\/(?:actions|play-parts|hacker|room-scene|phone-shell|vote|card|role-stage|private-talk)\//.test(p)), 'no other component');
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs', 'preview/states.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/hospital-panel-check.mjs'), /^\/\/ mothership:dev-only/);
  assert.equal(HOSPITAL_PANEL_VERSION, 'hospital-panel-0.1.0');
});

test('its styles reach nothing outside the component: every rule is under its root, weighs two classes and places the kit\'s only inside its own; its colours are the pack\'s display; its one motion is the results\' stamp snap', () => {
  const css = read(`${COMPONENT}/hospital-panel.css`).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /^\s*@import url\("\.\.\/kit\/kit\.css"\);\s*\.ms-hospital-panel/, 'it starts from the kit alone');
  // Q4 (the Lead, 16 November): REGISTERED, WRONG NUMBER, TREATED, NO EFFECT and DISCARDED snap in as REGISTERED
  // does in the handoff's motion table, 120 ms, and are there at once with the game's or the device's Reduce motion.
  assert.deepEqual([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]), ['ms-hp-stamp-in'], 'its one motion, the results\' stamp snap');
  assert.deepEqual([...css.matchAll(/animation:\s*([^;}]+)/g)].map(m => m[1].trim()), ['ms-hp-stamp-in 120ms var(--ms-k-ease) both', 'none', 'none'], 'the snap is REGISTERED\'s 120 ms, and stops with Reduce motion');
  assert.doesNotMatch(css, /transition/, 'nothing else moves');
  assert.match(css, /\.ms-hospital-panel\.ms-kit\[data-motion="reduced"\] \.ms-hp-result \.ms-k-stamp \{ animation: none; \}/, 'the game\'s Reduce motion');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.ms-hospital-panel \.ms-hp-result \.ms-k-stamp \{ animation: none; \} \}/, 'the device\'s Reduce motion');
  // As the kit's own rule for its elements (kit.css), and the pack's `* { box-sizing: border-box }`: the one rule
  // of one class, which sets nothing else.
  assert.equal(css.split(BOX_SIZING).length, 2, 'border-box for the component\'s own elements, once');
  const rest = css.replace(BOX_SIZING, '');
  assert.doesNotMatch(rest, /box-sizing/, 'set nowhere else');
  // The imports first, or the first rule's prelude would take them in; the keyframes' steps are not rules.
  const selectors = [...rest.replace(/@import[^;]*;/g, '').matchAll(/([^{}]+)\{/g)].map(m => m[1].trim()).filter(s => s && !s.startsWith('@') && !/^(?:from|to|\d+%)$/.test(s));
  assert.ok(selectors.length >= 12, `found the rules (${selectors.length})`);
  let glass = 0;
  for (const list of selectors) {
    for (const full of split(list)) {
      // On the shell's glass (its docked sheet), as the pack's `.sheet .key`: the glass is an ancestor of the root,
      // named with no weight, so the rule still weighs the component's two classes.
      const selector = full.startsWith(GLASS) ? full.slice(GLASS.length) : full;
      if (selector !== full) glass += 1;
      assert.match(selector, /^\.ms-hospital-panel(?:\.ms-kit)?(?:\[data-motion="reduced"\]|:focus)?(?:\s|$)/, `"${full}" is under the component's root`);
      assert.doesNotMatch(selector, /\*(?!=)/, `"${full}": no universal selector`);
      assert.ok((selector.match(/\.[\w-]+/g) ?? []).length >= 2, `"${full}": two classes, so it outranks the kit in any order`);
      for (const part of selector.split(/\s+|>|\+|~/).slice(1).filter(Boolean)) assert.match(part, /^(?:\.ms-(?:hp|k)-|\[hidden\]$)/, `"${full}": "${part}" is its own, or the kit's`);
      if (/\.ms-k-/.test(selector)) assert.match(selector, /\.ms-hp-[\w-]+\s[^,]*\.ms-k-/, `"${full}": a kit part placed only inside the component's own`);
    }
  }
  assert.equal(glass, 1, 'one rule on glass: the keys');
  assert.match(css, /:where\(\[data-ms-surface="glass"\]\) \.ms-hospital-panel \.ms-hp-key \{ background: var\(--ms-k-glass-fill\); box-shadow: inset 0 0 0 1px var\(--ms-k-glass-line\); \}/, 'the keys on glass, as the pack\'s .sheet .key');
  assert.deepEqual([...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))], [], 'no kit token or other component\'s property is declared');
  // The display's three colours are the pack's own .display-num (screens.css), which no token carries; no other.
  const screens = read('design/phone-ui/prototype/screens.css');
  const packDisplay = screens.match(/\.display-num \{[^}]*\}/)?.[0] ?? '';
  for (const colour of DISPLAY_COLOURS) assert.ok(packDisplay.includes(colour), `${colour} is the pack's .display-num`);
  const display = rest.match(/\.ms-hospital-panel \.ms-hp-display \{[^}]*\}/)?.[0] ?? '';
  assert.deepEqual([...display.matchAll(/#[0-9a-f]{3,8}\b/gi)].map(m => m[0]), DISPLAY_COLOURS, 'the display\'s background, edge and number, in the pack\'s order');
  assert.doesNotMatch(rest.replace(display, ''), /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i, 'no other colour of its own');
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

test('its words are the pack\'s (screens-more.mjs panel(), screens-game.mjs, ui.mjs), and the few the Lead\'s answers add', () => {
  const pack = ['design/phone-ui/prototype/screens-more.mjs', 'design/phone-ui/prototype/screens-game.mjs', 'design/phone-ui/prototype/ui.mjs'].map(read).join('\n');
  const W = PANEL_WORDS;
  for (const w of [W.title, W.onlyHere, W.note, W.submit(3), W.registered, W.queued, W.nothingYet, W.wrong, W.used, W.unavailable, W.stale]) {
    assert.ok(pack.includes(w), `"${w}" is the pack's`);
  }
  assert.ok(read('design/phone-ui/prototype/screens-more.mjs').includes("digit ?? '_'") && W.empty === '_', 'the display\'s "_" before a key is pressed');
  for (const icon of ['panel', 'lock']) assert.ok(ICON_NAMES.includes(icon), `${icon} is in the game's icon family`);
  // Added by the Lead's answers of 16 November, each recorded in the interface: Q1's sending word and Q4's three
  // records, which the pack does not draw.
  const doc = read('docs/design/components/hospital-panel.md');
  for (const w of [W.submitting, W.treated, W.treatedLine, W.noEffect, W.noEffectLine, W.discarded, W.discardedLine]) {
    assert.ok(!pack.includes(w), `"${w}" is not the pack's`);
    assert.ok(doc.includes(`"${w}"`), `"${w}" is recorded in the interface`);
  }
  // Sheet 43: "An empty injection pool must not confirm the Doctor's number", and its Unavailable frame's "Neutral
  // words: no hint about the pool or the number". The records state themselves and nothing else.
  for (const [key, w] of Object.entries(W)) {
    if (typeof w !== 'string' || key === 'note') continue;
    assert.doesNotMatch(w, /injection|pool|doctor|\d|reason|because/i, `${key}: "${w}" names no pool, Doctor, number or reason`);
  }
  assert.equal(W.unavailable, 'The panel is unavailable right now', 'one sentence, whatever the reason');
});

test('inputs: checked and normalized, an error for anything unknown; the pick in Frontend\'s own form, never named in an error', () => {
  assert.deepEqual(Object.keys(PANEL_KEYPAD_DEFAULTS).sort(), ['error', 'interactive', 'keys', 'phase', 'picked', 'reducedMotion', 'status', 'versions', 'viewer']);
  assert.deepEqual(Object.keys(PANEL_STATUS_DEFAULTS).sort(), ['interactive', 'reducedMotion', 'result', 'status', 'versions', 'viewer']);
  assert.deepEqual(PANEL_RESULTS, ['QUEUED', 'WRONG', 'TREATED', 'NO_EFFECT', 'DISCARDED', 'spent', 'unavailable'], 'the record\'s five statuses, an attempt used with no record, and unavailable');
  const keypad = checkPanelKeypad({ viewer: 'seat-4', keys: keysFor(9), picked: 3 });
  assert.equal(keypad.viewer, 4, 'the viewer\'s seat, as a number');
  assert.equal(keypad.picked, 'seat-3', 'the pick as the matching key\'s seat, the form Frontend gave the keys in');
  assert.deepEqual(keypad.keys.map(k => [k.seat, k.number]), keysFor(9).map(k => [k.seat, k.number]), 'the keys as given');
  assert.deepEqual(checkPanelKeypad(keypad), keypad, 'checking a checked input changes nothing');
  assert.deepEqual(checkPanelKeypad({ viewer: 4, keys: keysFor(7), picked: 'seat-7', phase: 'sending' }).picked, 'seat-7');
  const status = checkPanelStatus({ viewer: 4, result: 'NO_EFFECT' });
  assert.deepEqual(checkPanelStatus(status), status);
  assert.equal(checkPanelStatus({}).result, null, 'no result, nothing drawn');
  for (const [what, fn, pattern] of [
    ['an unknown key', () => checkPanelKeypad({ keys: keysFor(9), doctor: 'seat-2' }), /Unknown input "doctor"/],
    ['more than nine keys', () => checkPanelKeypad({ keys: [...keysFor(9), { seat: 'seat-1', number: 1 }] }), /up to nine/],
    ['a number out of 1–9', () => checkPanelKeypad({ keys: [{ seat: 'seat-1', number: 10 }] }), /the number 1 to 9/],
    ['a key that is not a seat', () => checkPanelKeypad({ keys: [{ seat: 'doctor', number: 1 }] }), /keys\[0\] is \{ seat, number \}/],
    ['a number twice', () => checkPanelKeypad({ keys: [{ seat: 'seat-1', number: 1 }, { seat: 'seat-2', number: 1 }] }), /repeats a number or a seat/],
    ['a seat twice', () => checkPanelKeypad({ keys: [{ seat: 'seat-1', number: 1 }, { seat: 1, number: 2 }] }), /repeats a number or a seat/],
    ['a pick not among the keys, never named', () => checkPanelKeypad({ keys: keysFor(8), picked: 'seat-9' }), /^TypeError: picked is a seat from keys, or null$/],
    ['a pick that is not a seat, never named', () => checkPanelKeypad({ keys: keysFor(9), picked: 'nine' }), /^TypeError: picked is a seat from keys, or null$/],
    ['sending with no pick', () => checkPanelKeypad({ keys: keysFor(9), phase: 'sending' }), /sending needs picked/],
    ['a phase that is not one', () => checkPanelKeypad({ keys: keysFor(9), phase: 'done' }), /phase is ready or sending/],
    ['an error with no words', () => checkPanelKeypad({ keys: keysFor(9), error: { detail: 'Try again.' } }), /error is \{ text, detail \}/],
    ['a result that is not one', () => checkPanelStatus({ result: 'HEALED' }), /result is QUEUED, WRONG, TREATED, NO_EFFECT, DISCARDED, spent, unavailable, or null/],
    ['an unknown status', () => checkPanelStatus({ status: 'away' }), /Status is live, stale, concealed/],
    ['a viewer that is not a seat', () => checkPanelStatus({ viewer: 'doctor' }), /viewer is a seat, or null/],
  ]) assert.throws(fn, pattern, what);
  // No error names the pick: the patient's own number stays on the patient's phone.
  for (const picked of ['seat-9', 9]) {
    try { checkPanelKeypad({ keys: keysFor(8), picked }); assert.fail('a pick not offered is an error'); } catch (error) { assert.doesNotMatch(error.message, /9/, 'the error names no number'); }
  }
});

test('every preview state is a valid input of its part, and every compared pack frame has its state', () => {
  const kinds = new Set();
  for (const [key, state] of Object.entries(PANEL_STATES)) {
    assert.ok(state.part, `${key} has a part`);
    kinds.add(state.part.kind);
    assert.doesNotThrow(() => CHECKS[state.part.kind]({ viewer: 'seat-4', ...state.part.input }), key);
  }
  assert.deepEqual([...kinds].sort(), Object.keys(CHECKS).sort(), 'every part has a preview state');
  assert.equal(Object.keys(PANEL_STATES).length, 19);
  for (const key of Object.keys(PACK_FRAMES)) assert.ok(PANEL_STATES[key], `${key} is a preview state`);
  assert.deepEqual(Object.values(PACK_FRAMES).map(f => f.frame).sort(), ['panel&state=enter', 'panel&state=entered', 'panel&state=queued', 'panel&state=spent', 'panel&state=unavailable', 'panel&state=wrong'],
    'the pack\'s six frames of panel()');
  // Q5: the offer's keys are every original player's number, 1 to N (the contract checks exactly seat-1…seat-N).
  assert.deepEqual(PANEL_STATES.eight.part.input.keys.map(k => k.number), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(PANEL_STATES.seven.part.input.keys.map(k => k.number), [1, 2, 3, 4, 5, 6, 7]);
  // Every result has a preview state.
  assert.deepEqual([...new Set(Object.values(PANEL_STATES).filter(s => s.part.kind === 'status').map(s => s.part.input.result))].sort(), [...PANEL_RESULTS].sort());
});

test('the sheet\'s frame (sheets 23 and 43): "Hospital panel · Only on this phone", large, with ✕; "Submit 3", then "Submitting…" (Q1); no footer otherwise', () => {
  const frame = { id: 'hospital-panel', title: 'Hospital panel', sub: 'Only on this phone', detent: 'large', close: true };
  assert.deepEqual(panelSheet(), { ...frame, actions: [] }, 'the keypad with no number: no footer');
  assert.deepEqual(panelSheet({ step: 'keypad', picked: 3 }), { ...frame, actions: [{ id: 'submit', label: 'Submit 3', kind: 'primary', icon: 'panel', busy: false }] });
  assert.deepEqual(panelSheet({ step: 'keypad', picked: 3, phase: 'sending' }), { ...frame, actions: [{ id: 'submit', label: 'Submitting…', kind: 'primary', icon: 'panel', busy: true }] }, 'busy while it sends; ✕ only closes (Q1)');
  assert.deepEqual(panelSheet({ step: 'status' }), { ...frame, actions: [] }, 'a status: no footer, ✕ back to the room');
  assert.equal(panelSheet({ step: 'keypad', picked: 7 }).actions[0].label, 'Submit 7');
  // Submit stands for the command, so it is not local: the shell refuses it while reconnecting. ✕ is local.
  assert.ok(!('local' in panelSheet({ picked: 3 }).actions[0]), 'Submit is a command');
  assert.throws(() => panelSheet({ step: 'result' }), /step is keypad or status/);
  assert.throws(() => panelSheet({ picked: 10 }), /the number on the picked key, 1 to 9/);
  assert.throws(() => panelSheet({ picked: 'seat-3' }), /the number on the picked key/);
  assert.throws(() => panelSheet({ phase: 'sending' }), /sending needs picked/);
  assert.throws(() => panelSheet({ picked: 3, phase: 'done' }), /phase is ready or sending/);
});

test('the check\'s record: every capture, the probe and the agreement passed, on clean committed source, under the production headers', () => {
  const path = `${COMPONENT}/review/check.json`;
  assert.ok(existsSync(join(REPO, path)), 'the check has been recorded');
  const record = JSON.parse(read(path));
  assert.equal(record.tool, 'design/tools/hospital-panel-check.mjs');
  assert.equal(record.sourceClean, true, 'recorded on committed source');
  assert.match(record.sourceCommit, /^[0-9a-f]{40}$/);
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 34, 'every state at both phone sizes, the small phone\'s and the text sizes\' at their own');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn, `${key} passed and drew what its state asks`);
    assert.deepEqual(c.mismatched, [], `${key}: nothing differs from what its state asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
    assert.equal(sha256(c.file), c.sha256, `${key}: ${c.file} is the capture the record names`);
  }
  for (const size of ['390x844', '430x932']) {
    assert.deepEqual(record.captures[`${size}/concealed`].leaked, [], `${size}: concealed, no private word in the page`);
    // Q5: every number in its place; the missing places empty, not keys.
    assert.equal(record.captures[`${size}/eight`].gaps, '9', `${size}: eight players, 9's place empty`);
    assert.equal(record.captures[`${size}/seven`].gaps, '8,9', `${size}: seven players, 8's and 9's places empty`);
    // Q1: while it sends, "Submitting…", busy, and every key refused.
    assert.ok(record.captures[`${size}/sending`].busy === 'Submitting…' && record.captures[`${size}/sending`].refused === true, `${size}: sending`);
  }
  // Q6: the 3 × 3 at every text size.
  for (const key of ['320x568/small-enter', '390x844/large-entered', '320x568/largest-entered']) assert.equal(record.captures[key].perRow, 3, `${key}: three keys to a row`);
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  assert.deepEqual(record.probe.full.checks.map(c => c.id), ['keys', 'refused', 'status', 'words', 'footer', 'audience', 'leaks', 'inputs', 'private', 'focus', 'text', 'dispose', 'motion']);
  assert.deepEqual(record.probe['device-reduced'].checks.map(c => c.id), ['motion'], 'with the device\'s Reduce motion, the motion check');
  const agree = record.agree;
  assert.ok(agree.ok, 'the agreement with the pack');
  assert.deepEqual(agree.problems, [], 'agreement: no page problem');
  assert.equal(agree.checks.length, 6, 'the pack\'s six frames');
  for (const c of agree.checks) assert.ok(c.ok, `${c.id} agrees with the pack`);
  // The Lead's privacy note: the picked number never appears in an attribute's value. From a pick of 3 to a pick of
  // 5, the only attributes that change are the two keys' pressed states.
  const leaks = record.probe.full.checks.find(c => c.id === 'leaks').detail;
  assert.equal(leaks.changed.length, 2, 'two attributes change with the pick');
  assert.ok(leaks.changed.every(c => / aria-pressed=(?:true|false)$/.test(c)), 'each a key\'s pressed state');
  assert.deepEqual([leaks.secret, leaks.statusSecret, leaks.callbacks, leaks.layouts, leaks.logs], [[], [], [], [], []], 'no record\'s words in an attribute, no other callback, nothing in the layout or the console');
  // Q4: each record's stamp snaps in over 120 ms, and is there at once with Reduce motion; nothing else moves.
  const motion = record.probe.full.checks.find(c => c.id === 'motion').detail;
  for (const key of ['queued', 'wrong', 'treated', 'no-effect', 'discarded']) {
    assert.deepEqual(motion.stamps[key], [['ms-hp-stamp-in', 120, true]], `${key}: the stamp snaps in`);
    assert.deepEqual(motion.reduced[key], [], `${key}: with the game's Reduce motion, at once`);
  }
  assert.deepEqual(motion.others, [0, 0, 0, 0, 0], 'the icons, the display and the keys don\'t move');
  const still = record.probe['device-reduced'].checks[0].detail;
  assert.ok(Object.values(still.stamps).every(list => list.length === 0) && still.others.every(n => n === 0), 'with the device\'s Reduce motion, nothing moves');
});
