// Actions (design/phone-ui/components/actions): a runtime source the game imports as it is, so its module graph,
// its styles' scope, its inputs, its privacy rules and its words are checked here; its drawing, lifecycle and
// agreement with the pinned pack in a browser under the production headers by design/tools/actions-check.mjs,
// whose record is checked last. Its parts module has its own test (play-parts.test.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACTIONS_DEFAULTS, ACTIONS_VERSION, ACTION_LOOKS, ACTION_WORDS, actionWords, actionsSheet, afterSheet, checkActionCheck, checkActions, checkAfterRegister,
  checkOutcomeUnknown, checkPassNote, checkSheet, checkTargetList, nextActionsInput, passSheet, registeredToast, targetBar, targetChip, targetListSheet, tileLine, unknownSheet,
} from '../../../design/phone-ui/components/actions/actions.mjs';
import { ICON_NAMES } from '../../../design/phone-ui/components/icons.mjs';
import { ACTIONS_STATES, PACK_FRAMES } from '../../../design/phone-ui/components/actions/preview/states.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/actions';
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
const CHECKS = { tiles: checkActions, list: checkTargetList, check: checkActionCheck, after: checkAfterRegister, unknown: checkOutcomeUnknown, pass: checkPassNote };

test('the component is a runtime source: its whole graph is runtime-safe and in the hosted graph', () => {
  const files = new Map([...graph(join(REPO, COMPONENT, 'actions.mjs')), ...graph(join(REPO, COMPONENT, 'actions.css'))]);
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the kit\'s crew-runtime.mjs)');
  for (const path of [`${COMPONENT}/actions.mjs`, `${COMPONENT}/actions.css`, 'design/phone-ui/components/play-parts/play-parts.mjs', 'design/phone-ui/components/play-parts/play-parts.css',
    'design/phone-ui/components/kit/kit.mjs', 'design/phone-ui/components/kit/kit.css', 'design/phone-ui/components/icons.mjs']) {
    assert.ok(local.includes(path), `${path} is in the graph`);
  }
  assert.ok(!local.some(p => /\/(?:room-scene|phone-shell|vote|card|role-stage)\//.test(p)), 'no other component: Frontend mounts each part in the shell\'s sheet body');
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs', 'preview/states.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/actions-check.mjs'), /^\/\/ mothership:dev-only/);
  assert.equal(ACTIONS_VERSION, 'actions-0.1.0');
});

test('its styles reach nothing outside the component: every rule is under its root, weighs two classes, and places the kit\'s and the parts\' only inside its own', () => {
  const css = read(`${COMPONENT}/actions.css`).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /^\s*@import url\("\.\.\/kit\/kit\.css"\);\s*@import url\("\.\.\/play-parts\/play-parts\.css"\);/, 'it starts from the kit and the parts');
  assert.deepEqual([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]), ['ms-ac-stamp-in'], 'its one motion, the stamp\'s snap');
  // Every rule's prelude, those inside @container and @media too.
  const selectors = [...css.matchAll(/([^{}]+)\{/g)].map(m => m[1].trim()).filter(s => s && !s.startsWith('@') && !/^(?:from|to|\d+%)$/.test(s));
  assert.ok(selectors.length >= 25, `found the rules (${selectors.length})`);
  for (const list of selectors) {
    for (const selector of split(list)) {
      assert.match(selector, /^\.ms-actions(?:\.ms-kit)?(?:\[[^\]]+\]|:focus)?(?:\s|$)/, `"${selector}" is under the component's root`);
      assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
      assert.ok((selector.match(/\.[\w-]+/g) ?? []).length >= 2, `"${selector}": two classes, so it outranks the kit and the parts in any order`);
      for (const part of selector.split(/\s+|>|\+|~/).slice(1).filter(Boolean)) {
        assert.match(part, /^(?:\.ms-(?:ac|k|pp)-|\[hidden\]$|h3$|span$)/, `"${selector}": "${part}" is a class (or the section head's own h3 and span)`);
      }
      if (/\.ms-(?:k|pp)-/.test(selector)) assert.match(selector, /\.ms-ac-[\w-]+[^,]*\.ms-(?:k|pp)-/, `"${selector}": a kit control or a part placed only inside the component's own parts`);
    }
  }
  assert.deepEqual([...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))], [], 'no kit token or other component\'s property is declared');
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i, 'every colour is a kit token');
  // The stamp's snap stops for the game's Reduce motion and the device's.
  assert.match(css, /\.ms-actions\.ms-kit\[data-motion="reduced"\] \.ms-ac-after-head \.ms-k-stamp \{ animation: none; \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.ms-actions \.ms-ac-after-head \.ms-k-stamp \{ animation: none; \} \}/);
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

test('its words are the pack\'s (screens-game.mjs, screens-more.mjs, icons.mjs, the sheets\' catalog), and the few the decisions add', () => {
  const pack = ['design/phone-ui/prototype/screens-game.mjs', 'design/phone-ui/prototype/screens-more.mjs', 'design/phone-ui/prototype/icons.mjs', 'design/phone-ui/sheets/catalog.mjs'].map(read).join('\n');
  const W = ACTION_WORDS;
  const words = [W.yourTurn, W.notYourTurn, W.tilesLabel, W.actions, W.list, '· everyone you can reach', W.listButton, W.check, W.onlyYou, W.yourself, W.cancel, W.done,
    W.choosePlayer, W.chooseTwo, 'every room', 'Other rooms · ', W.unknown, W.retrySame, W.checkReceipt, 'was sent, but no answer came back.', W.checkFirst,
    W.passTitle, 'The turn goes to', W.pass, W.stale, W.toast.captured(), ...Object.values(W.stamps)];
  for (const [type, l] of Object.entries(ACTION_LOOKS)) {
    words.push(...[l.tile, l.title, l.verb, l.register, l.sending, l.noun].filter(Boolean));
    assert.ok(ICON_NAMES.includes(l.icon), `${type}: ${l.icon} is in the game's icon family`);
  }
  for (const w of words) assert.ok(pack.includes(w), `"${w}" is the pack's`);
  for (const icon of ['warning', 'info', 'check', 'hourglass', 'retry', 'pass', 'board', 'players']) assert.ok(ICON_NAMES.includes(icon), `${icon} is in the game's icon family`);
  // Added by the decisions, each recorded in the interface: T3's "Not available now" (the owner, 11 November
  // 2026), Supply's second pick and its marked row (the Lead's L4), and the shell's toasts (L5).
  const doc = read('docs/design/components/actions.md');
  for (const w of [W.notAvailable, W.chooseSecond, W.picked]) {
    assert.ok(!pack.includes(w), `"${w}" is not the pack's`);
    assert.ok(doc.includes(`"${w}"`), `"${w}" is recorded in the interface`);
  }
  for (const w of [W.toast.registered('Rescue'), W.toast.accepted('Private talk'), W.toast.active('Clone')]) assert.ok(doc.includes(`"${w}"`), `"${w}" is recorded in the interface`);
  assert.match(read('AGENTS.md'), /\*\*Not available now\*\*/, 'T3\'s words are the owner\'s');
});

test('inputs: checked and normalized, an error for anything unknown; this viewer\'s dropped when concealed or for a new viewer', () => {
  const input = { viewer: 'seat-4', turn: 'own', round: 3, tiles: [{ type: 'RESCUE', state: 'available', note: '2 injections', badge: 2 }, { type: 'REGISTER_SHOT', state: 'unavailable', reason: 'From Round 4' }], note: null };
  const once = checkActions(input);
  assert.equal(once.viewer, 4, 'the viewer\'s seat, as a number');
  assert.deepEqual(checkActions(once), once, 'checking a checked input changes nothing');
  assert.deepEqual(Object.keys(ACTIONS_DEFAULTS).sort(), ['interactive', 'note', 'reducedMotion', 'round', 'status', 'tiles', 'turn', 'versions', 'viewer']);
  for (const [what, bad, pattern] of [['an unknown key', { colour: 'red' }, /Unknown input "colour"/], ['a type twice', { tiles: [{ type: 'MOVE' }, { type: 'MOVE' }] }, /lists MOVE twice/],
    ['an unknown type', { tiles: [{ type: 'FLY' }] }, /tiles\[0\]\.type is one of RESCUE/], ['an unknown state', { tiles: [{ type: 'MOVE', state: 'spent' }] }, /state is available, selected, sending, registered, unavailable/],
    ['a badge that is not a whole number', { tiles: [{ type: 'MOVE', badge: 1.5 }] }, /badge is a whole number/], ['an unknown turn', { turn: 'mine' }, /turn is own or other/],
    ['an unknown status', { status: 'away' }, /Status is live, stale, concealed/], ['a viewer that is not a seat', { viewer: 'seat-10' }, /viewer is a seat/]]) {
    assert.throws(() => checkActions({ ...input, ...bad }), pattern, what);
  }
  const concealed = nextActionsInput(once, { status: 'concealed' });
  assert.deepEqual([concealed.tiles, concealed.note], [[], null], 'concealed: no tile and no line kept');
  assert.deepEqual(nextActionsInput(concealed, { status: 'live' }).tiles, [], 'shown again: nothing comes back until given again');
  assert.deepEqual(nextActionsInput(concealed, { tiles: input.tiles }).tiles, [], 'given while concealed, nothing is kept');
  assert.deepEqual(nextActionsInput(once, { viewer: 'seat-7' }).tiles, [], 'a new viewer: none of the last viewer\'s tiles');
  assert.equal(nextActionsInput(once, { viewer: 'seat-7', tiles: [{ type: 'MOVE' }] }).tiles.length, 1, 'a new viewer with their own tiles');
  assert.equal(nextActionsInput(once, { viewer: 4 }).tiles.length, 2, 'the same viewer, named the other way, is the same viewer');
  // The other parts: too many people, a check for an action that takes no one, a step of no kind, a seat twice.
  assert.throws(() => checkActionCheck({ type: 'RESCUE', targets: [{ seat: 'seat-1', name: 'Ava' }, { seat: 'seat-7', name: 'Gus' }] }), /RESCUE takes one person/);
  assert.throws(() => checkActionCheck({ type: 'REQUEST_BLACKOUT', targets: [{ seat: 'seat-1', name: 'Ava' }] }), /REQUEST_BLACKOUT takes no one/);
  assert.equal(checkActionCheck({ type: 'SUPPLY', targets: [{ seat: 'seat-1', name: 'Ava' }, { seat: 'seat-7', name: 'Gus' }] }).targets.length, 2);
  assert.throws(() => checkActionCheck({ type: 'RESCUE', error: { detail: 'No reason' } }), /error is \{ text, detail \}/);
  assert.throws(() => checkAfterRegister({ type: 'RESCUE', kind: 'won' }), /kind is registered, accepted, active, captured/);
  assert.throws(() => checkAfterRegister({ type: 'RESCUE', steps: [{ state: 'soon', title: 'Later' }] }), /steps\[0\]/);
  assert.throws(() => checkTargetList({ type: 'RESCUE', groups: [{ room: 'Room A', people: [{ seat: 'seat-1', name: 'Ava' }, { seat: 1, name: 'Ava' }] }] }), /seat 1 twice/);
  assert.throws(() => checkTargetList({ type: 'RESCUE', picked: ['Ava'] }), /picked is a list of seats/);
  assert.throws(() => checkPassNote({ note: 3 }), /note is text/);
  // Each part keeps only its own inputs.
  assert.throws(() => checkActionCheck({ tiles: [] }), /Unknown input "tiles"/);
  assert.throws(() => checkOutcomeUnknown({ facts: [] }), /Unknown input "facts"/);
});

test('every preview state is a valid input of its part, and every compared pack frame has its state', () => {
  const kinds = new Set();
  for (const [key, state] of Object.entries(ACTIONS_STATES)) {
    if (!state.part) continue;
    kinds.add(state.part.kind);
    assert.doesNotThrow(() => CHECKS[state.part.kind]({ viewer: 'seat-4', ...state.part.input }), key);
  }
  assert.deepEqual([...kinds].sort(), Object.keys(CHECKS).sort(), 'every part has a preview state');
  assert.equal(Object.keys(ACTIONS_STATES).length, 40);
  for (const key of Object.keys(PACK_FRAMES)) assert.ok(ACTIONS_STATES[key], `${key} is a preview state`);
  assert.equal(Object.keys(PACK_FRAMES).length, 26, 'the 26 frames compared with the pack');
});

test('the frames and the shell\'s words, from the type alone', () => {
  assert.deepEqual(actionsSheet({ role: 'Doctor', room: 'Room A' }), { id: 'actions', title: 'Actions', sub: 'Doctor · Room A', close: true });
  assert.equal(actionsSheet().sub, null);
  assert.deepEqual(targetListSheet({ type: 'PROTECT' }), { id: 'action-list', title: 'Choose from a list', sub: 'Grant Protection · everyone you can reach', back: true, close: false });
  assert.deepEqual(checkSheet({ type: 'RESCUE' }).actions.map(a => [a.id, a.label, a.busy ?? false, a.enabled ?? true]), [['cancel', 'Cancel', false, true], ['register', 'Register Rescue', false, true]]);
  assert.deepEqual(checkSheet({ type: 'ACTIVATE_CLONE', phase: 'sending' }).actions[1], { id: 'register', label: 'Activating…', kind: 'primary', busy: true, enabled: true });
  assert.equal(checkSheet({ type: 'RESCUE', canRegister: false }).actions[1].enabled, false, 'Register only while the server still offers the action');
  assert.throws(() => checkSheet({ type: 'MOVE' }), /MOVE has no check of this component's/, 'Move\'s choosing is not this component\'s');
  assert.deepEqual(afterSheet({ type: 'ENGINEER_SUPPRESS' }), { id: 'action-after', title: 'Suppress navigation', close: false, actions: [{ id: 'done', label: 'Done', kind: 'secondary' }] });
  assert.deepEqual(unknownSheet({ type: 'RESCUE', busy: 'check' }).actions.map(a => [a.id, a.label, a.busy, a.enabled]), [['retry', 'Retry the same', false, false], ['check', 'Check receipt', true, true]]);
  assert.equal(passSheet({ next: { seat: 'seat-5', name: 'Eli' } }).sub, 'The turn goes to Eli · Player 5');
  assert.equal(passSheet({}).sub, null, 'without the next player (B5), no sub');
  assert.deepEqual(passSheet({ busy: true }).actions.map(a => [a.id, a.busy ?? false, a.enabled ?? true]), [['cancel', false, false], ['pass', true, true]]);
  assert.deepEqual(targetBar({ type: 'RESCUE' }), { icon: 'rescue', title: 'Rescue', sub: 'Choose a player' });
  assert.deepEqual(targetBar({ type: 'SUPPLY' }).sub, 'Choose two players');
  assert.deepEqual(targetBar({ type: 'SUPPLY', picked: ['seat-1'] }), { icon: 'supply', title: 'Supply', sub: 'Choose the second player' });
  assert.deepEqual(targetBar({ type: 'REQUEST_HACK', where: 'board' }), { icon: 'talk', title: 'Private talk', sub: 'Choose a player · every room' });
  assert.deepEqual(targetChip({ kind: 'other-rooms', count: 2 }), { id: 'other-rooms', label: 'Other rooms · 2', icon: 'board', tone: 'paper' });
  assert.deepEqual(targetChip({ kind: 'list' }), { id: 'list', label: 'List', icon: 'players', tone: 'paper' });
  assert.throws(() => targetChip({ kind: 'other-rooms', count: 0 }), /how many people are elsewhere/);
  assert.deepEqual(registeredToast({ type: 'PROTECT', id: 'cmd-9' }), { id: 'cmd-9', text: 'Protection registered', icon: 'check' });
  assert.equal(registeredToast({ type: 'REQUEST_HACK', kind: 'accepted', id: 'cmd-1' }).text, 'Private talk accepted');
  assert.equal(registeredToast({ type: 'ACTIVATE_CLONE', kind: 'active', id: 'cmd-2' }).text, 'Clone active');
  assert.equal(registeredToast({ type: 'ENGINEER_SUPPRESS', kind: 'captured', id: 'cmd-3' }).text, 'Navigation suppressed');
  assert.throws(() => registeredToast({ type: 'RESCUE' }), /the command's id/, 'a toast needs the command\'s id, so it shows once');
});

test('the words of a check and of "Outcome unknown": the person, yourself, both people, or the action alone; a tile\'s line (T3)', () => {
  const eli = { seat: 5, name: 'Eli', room: 'Hospital' }, dev = { seat: 4, name: 'Dev', room: 'Room A' };
  assert.deepEqual(actionWords({ type: 'RESCUE', targets: [eli], viewer: 4 }), { title: 'Rescue Eli', sub: 'Player 5 · Hospital', what: 'Rescue Eli' });
  assert.equal(actionWords({ type: 'RESCUE', targets: [dev], viewer: 4 }).title, 'Rescue yourself');
  assert.equal(actionWords({ type: 'RESCUE', targets: [{ seat: 5, name: 'Eli', room: null }], viewer: 4 }).sub, 'Player 5', 'no room given, none said');
  assert.deepEqual(actionWords({ type: 'SUPPLY', targets: [{ seat: 1, name: 'Ava' }, { seat: 7, name: 'Gus' }], viewer: 4 }), { title: 'Supply Ava and Gus', sub: 'Players 1 and 7', what: 'Supply Ava and Gus' });
  assert.equal(actionWords({ type: 'REQUEST_HACK', targets: [{ seat: 1, name: 'Ava', room: 'Room A' }], viewer: 4 }).title, 'Talk with Ava');
  assert.deepEqual(actionWords({ type: 'ACTIVATE_SHIP_HACK', targets: [], viewer: 4 }), { title: 'Hack Spaceship', sub: 'Only you see this', what: 'Hack Spaceship' });
  assert.equal(tileLine({ state: 'unavailable', reason: null, note: 'Once a round' }), 'Not available now', 'not offered, no reason: T3\'s words, never the offered line');
  assert.equal(tileLine({ state: 'unavailable', reason: 'From Round 4', note: null }), 'From Round 4', 'the server\'s reason, as given');
  assert.equal(tileLine({ state: 'registered', reason: null, note: 'Eli · end of round' }), 'Eli · end of round');
  assert.equal(tileLine({ state: 'available', reason: 'ignored', note: null }), null, 'an offered tile says only its note');
});

test('the check\'s record: every capture, the probe and the agreement passed, on clean committed source, under the production headers', () => {
  const path = `${COMPONENT}/review/check.json`;
  assert.ok(existsSync(join(REPO, path)), 'the check has been recorded');
  const record = JSON.parse(read(path));
  assert.equal(record.tool, 'design/tools/actions-check.mjs');
  assert.equal(record.sourceClean, true, 'recorded on committed source');
  assert.match(record.sourceCommit, /^[0-9a-f]{40}$/);
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 75, 'every state at both phone sizes, the small phone\'s and the text sizes\' at their own');
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
  assert.deepEqual(record.probe.full.checks.map(c => c.id), ['tiles', 'refused', 't3', 'list', 'check', 'after', 'words', 'unknown', 'inputs', 'private', 'focus', 'text', 'dispose', 'motion']);
  assert.deepEqual(record.probe['device-reduced'].checks.map(c => c.id), ['motion'], 'with the device\'s Reduce motion, the motion check');
  const agree = record.agree;
  assert.ok(agree.ok, 'the agreement with the pack');
  assert.deepEqual(agree.problems, [], 'agreement: no page problem');
  assert.equal(agree.checks.length, 26, 'every compared frame');
  for (const c of agree.checks) assert.ok(c.ok, `${c.id} agrees with the pack`);
});
