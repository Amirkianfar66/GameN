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
  ACTIONS_DEFAULTS, ACTIONS_VERSION, ACTION_LOOKS, ACTION_WORDS, actionWords, actionsSheet, afterSheet, afterWords, blackoutBar, checkActionCheck, checkActions, checkAfterRegister,
  checkOutcomeUnknown, checkPassNote, checkSheet, checkTargetList, moveBar, moveChip, movedToast, nextActionsInput, passSheet, passedToast, registeredToast, targetBar,
  targetChip, targetListSheet, tileLine, unknownSheet,
} from '../../../design/phone-ui/components/actions/actions.mjs';
import { ICON_NAMES } from '../../../design/phone-ui/components/icons.mjs';
import { ACTIONS_STATES, PACK_FRAMES } from '../../../design/phone-ui/components/actions/preview/states.mjs';
import { afterRegister } from '../../../design/phone-ui/prototype/screens-game.mjs';
import { SELF, seatOf as packSeat } from '../../../design/phone-ui/prototype/fixtures.mjs';

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
  assert.equal(ACTIONS_VERSION, 'actions-0.2.5');
});

test('its styles reach nothing outside the component: every rule is under its root, weighs two classes, and places the kit\'s and the parts\' only inside its own', () => {
  const css = read(`${COMPONENT}/actions.css`).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /^\s*@import url\("\.\.\/kit\/kit\.css"\);\s*@import url\("\.\.\/play-parts\/play-parts\.css"\);/, 'it starts from the kit and the parts');
  assert.deepEqual([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]), ['ms-ac-stamp-in'], 'its one motion, the stamp\'s snap');
  // Every rule's prelude, those inside @container and @media too.
  const selectors = [...css.matchAll(/([^{}]+)\{/g)].map(m => m[1].trim()).filter(s => s && !s.startsWith('@') && !/^(?:from|to|\d+%)$/.test(s));
  assert.ok(selectors.length >= 22, `found the rules (${selectors.length})`);
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
    W.passTitle, 'The turn goes to', W.pass, W.passed, W.stale, W.toast.captured(), ...Object.values(W.stamps),
    // Move (screens-game.mjs room() and board()): the room's bar and chip, the board's bar, the picked words.
    'Move within ', W.moveChoose, W.moveOrBoard, W.moveBoard, W.moveChip, 'Move to ',
    // The Disabler's position during a Blackout (screens-more.mjs blackout(), sheet 30), word for word.
    W.positionChoose, W.positionAny('Room A'), W.positionFixed('A3'), W.positionLater,
    // After Register (the handoff's table, as screens-game.mjs afterRegister() writes it): every line and step.
    ...((A = W.after) => [A.registered, A.accepted, A.activeNow, A.captured, A.yourTurn(3), A.whenAccepted(3), A.endOfRound(4), A.round(4), A.rescueResolved,
      A.withTheRound, 'Protection for ', ': active', A.oneWeaponEach, A.shotResolved, A.laterThisRound, A.litThenDark, A.whileDark, A.frozenPosition,
      A.afterThisTurn, 'Up to 15 s for ', ' to declare a side', A.then, A.claimThenTalk, A.cloneEnds, A.navigation, A.weightRemoved,
      A.blackout, A.blackoutDetail, 'Private talk with ', A.clone, A.cloneDetail(4), A.suppress,
      'Captured now: the ', ' players in Room B. Their navigation weight is removed this round. Only you are told.'])()];
  // Move's Register is the Lead's Q1 (the pack draws no check for Move): in the form of the others', recorded below.
  // "Panel request" is the Lead's Q3 (the pack draws no "Outcome unknown" for the Hospital panel), recorded below.
  const added = new Set([ACTION_LOOKS.MOVE.register, ACTION_LOOKS.PANEL_CODE.verb]);
  for (const [type, l] of Object.entries(ACTION_LOOKS)) {
    words.push(...[l.tile, l.title, l.verb, l.register, l.sending, l.noun].filter(w => w && !added.has(w)));
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
  // Move's undrawn steps, as the Lead answered them (16 November): the full room (Q3), the toast (Q2), Register (Q1).
  for (const w of [W.moveFull('Room A'), W.moved('A3'), ACTION_LOOKS.MOVE.register]) {
    assert.ok(!pack.includes(w), `"${w}" is not the pack's`);
    assert.ok(doc.includes(`"${w}"`), `"${w}" is recorded in the interface`);
  }
  // The Hospital panel's "Outcome unknown" (the Lead's Q3, 16 November): the request, with no number.
  assert.ok(!pack.includes('Panel request'), '"Panel request" is not the pack\'s');
  assert.ok(doc.includes(`"${W.noAnswer(ACTION_LOOKS.PANEL_CODE.verb)}"`), 'the Hospital panel\'s "Outcome unknown" is recorded in the interface');
  // The Lead's decisions of 17 November: Pass's and the Disabler's "Outcome unknown" (A13); and After Register's lines
  // without what the model lacks: the Clone's without its end, the Engineer's without whom it captured.
  for (const w of [W.noAnswer(ACTION_LOOKS.PASS_TURN.verb), W.noAnswer(W.position('A3')), W.after.cloneDetail(null), W.after.suppressDetail(null)]) {
    assert.ok(!pack.includes(w), `"${w}" is not the pack's`);
    assert.ok(doc.includes(`"${w}"`), `"${w}" is recorded in the interface`);
  }
  assert.match(read('AGENTS.md'), /\*\*Not available now\*\*/, 'T3\'s words are the owner\'s');
});

test('inputs: checked and normalized, an error for anything unknown; this viewer\'s dropped when concealed or for a new viewer', () => {
  const input = { viewer: 'seat-4', turn: 'own', round: 3, tiles: [{ type: 'RESCUE', state: 'available', note: '2 injections', badge: 2 }, { type: 'REGISTER_SHOT', state: 'unavailable', reason: 'From Round 4' }], note: null };
  const once = checkActions(input);
  assert.equal(once.viewer, 4, 'the viewer\'s seat, as a number');
  assert.deepEqual(checkActions(once), once, 'checking a checked input changes nothing');
  assert.deepEqual(Object.keys(ACTIONS_DEFAULTS).sort(), ['interactive', 'note', 'reducedMotion', 'round', 'status', 'tiles', 'turn', 'versions', 'viewer']);
  for (const [what, bad, pattern] of [['an unknown key', { colour: 'red' }, /Unknown input "colour"/], ['a type twice', { tiles: [{ type: 'MOVE' }, { type: 'MOVE' }] }, /lists MOVE twice/],
    ['an unknown type', { tiles: [{ type: 'FLY' }] }, /tiles\[0\]\.type is one of RESCUE/], ['an unknown state', { tiles: [{ type: 'MOVE', state: 'done' }] }, /state is available, selected, sending, registered, unavailable, spent/],
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
  // Move's check takes a position, never a person; a position is Move's alone; a move has no After Register (Q2).
  assert.deepEqual(checkActionCheck({ type: 'MOVE', position: { slot: 'A3', room: 'Room A' } }).position, { slot: 'A3', room: 'Room A' });
  assert.equal(checkActionCheck({ type: 'MOVE', position: { slot: 'B4' } }).position.room, null, 'no room given, none said');
  assert.throws(() => checkActionCheck({ type: 'MOVE' }), /Move needs its position/);
  assert.throws(() => checkActionCheck({ type: 'MOVE', position: { slot: 'A3' }, targets: [{ seat: 'seat-1', name: 'Ava' }] }), /MOVE takes no one/);
  assert.throws(() => checkActionCheck({ type: 'RESCUE', position: { slot: 'A3' } }), /position is Move's and the Disabler's alone/);
  assert.throws(() => checkOutcomeUnknown({ type: 'MOVE' }), /Move needs its position/);
  assert.throws(() => checkAfterRegister({ type: 'MOVE' }), /A move has no After Register/);
  // The Hospital panel's request (the Lead's Q3): only "Outcome unknown" takes it, and with no one, so it never names
  // the number the patient entered; every other part refuses it and names the Hospital panel component.
  const HOSPITAL_PANEL = /PANEL_CODE .*the Hospital panel component's \(design\/phone-ui\/components\/hospital-panel\); Actions draws only its "Outcome unknown"/;
  assert.throws(() => checkActions({ ...input, tiles: [{ type: 'PANEL_CODE' }] }), HOSPITAL_PANEL, 'not an action tile');
  assert.throws(() => checkTargetList({ type: 'PANEL_CODE' }), HOSPITAL_PANEL, 'no list');
  assert.throws(() => checkActionCheck({ type: 'PANEL_CODE' }), HOSPITAL_PANEL, 'no check');
  assert.throws(() => checkAfterRegister({ type: 'PANEL_CODE' }), HOSPITAL_PANEL, 'no After Register');
  assert.equal(checkOutcomeUnknown({ type: 'PANEL_CODE' }).targets.length, 0);
  for (const seat of ['seat-3', 3]) {
    assert.throws(() => checkOutcomeUnknown({ type: 'PANEL_CODE', targets: [{ seat, name: 'Cleo' }] }), /^TypeError: PANEL_CODE's "Outcome unknown" names no number: it takes no targets$/, 'no number, and the error names none');
  }
  // Pass and the Disabler's position (0.2.3, A13): only "Outcome unknown" takes them, the position as Move's; every
  // other part refuses them and names their own sheet or bar.
  assert.equal(checkOutcomeUnknown({ type: 'PASS_TURN' }).position, null);
  assert.throws(() => checkOutcomeUnknown({ type: 'PASS_TURN', targets: [{ seat: 'seat-5', name: 'Eli' }] }), /PASS_TURN takes no one/);
  assert.deepEqual(checkOutcomeUnknown({ type: 'SELECT_BLACKOUT_SLOT', position: { slot: 'A3', room: 'Room A' } }).position, { slot: 'A3', room: 'Room A' });
  assert.throws(() => checkOutcomeUnknown({ type: 'SELECT_BLACKOUT_SLOT' }), /The Disabler's position needs its position/);
  for (const [type, place] of [['PASS_TURN', /PASS_TURN .*: it is the round button's passSheet\(\) and passedToast\(\); Actions draws only its "Outcome unknown"/],
    ['SELECT_BLACKOUT_SLOT', /SELECT_BLACKOUT_SLOT .*: it is blackoutBar\(\); Actions draws only its "Outcome unknown"/]]) {
    assert.throws(() => checkActions({ ...input, tiles: [{ type }] }), place, `${type}: not an action tile`);
    assert.throws(() => checkTargetList({ type }), place, `${type}: no list`);
    assert.throws(() => checkActionCheck({ type }), place, `${type}: no check`);
    assert.throws(() => checkAfterRegister({ type }), place, `${type}: no After Register`);
  }
});

test('every preview state is a valid input of its part, and every compared pack frame has its state', () => {
  const kinds = new Set();
  for (const [key, state] of Object.entries(ACTIONS_STATES)) {
    if (!state.part) continue;
    kinds.add(state.part.kind);
    assert.doesNotThrow(() => CHECKS[state.part.kind]({ viewer: 'seat-4', ...state.part.input }), key);
  }
  assert.deepEqual([...kinds].sort(), Object.keys(CHECKS).sort(), 'every part has a preview state');
  assert.equal(Object.keys(ACTIONS_STATES).length, 63, '61, and the refusal at both sizes and at the Largest text (0.2.5, R2)');
  for (const key of Object.keys(PACK_FRAMES)) assert.ok(ACTIONS_STATES[key], `${key} is a preview state`);
  assert.equal(Object.keys(PACK_FRAMES).length, 31, 'the 31 frames compared with the pack');
  // Sheet 30: the Disabler choosing a position in the dark, and the position fixed.
  assert.deepEqual(['blackout-pick', 'blackout-fixed'].map(k => PACK_FRAMES[k].frame), ['blackout&state=pick', 'blackout&state=chosen']);
  // Move's frames: sheet 20's bar and chip, the board's bar (26 and 27.1), and 27.3's "Turn passed".
  assert.deepEqual(['move-room', 'move-board', 'passed'].map(k => PACK_FRAMES[k].frame), ['room&room=room-a&state=move', 'board&state=move', 'room&room=room-a&state=passed']);
});

test('the frames and the shell\'s words, from the type alone', () => {
  assert.deepEqual(actionsSheet({ role: 'Doctor', room: 'Room A' }), { id: 'actions', title: 'Actions', sub: 'Doctor · Room A', close: true });
  assert.equal(actionsSheet().sub, null);
  assert.deepEqual(targetListSheet({ type: 'PROTECT' }), { id: 'action-list', title: 'Choose from a list', sub: 'Grant Protection · everyone you can reach', back: true, close: false });
  // Cancel and Done only close their sheet on this phone: local, so the shell takes them while reconnecting (0.2.4).
  assert.deepEqual(checkSheet({ type: 'RESCUE' }).actions.map(a => [a.id, a.label, a.busy ?? false, a.enabled ?? true, a.local ?? false]), [['cancel', 'Cancel', false, true, true], ['register', 'Register Rescue', false, true, false]]);
  assert.deepEqual(checkSheet({ type: 'ACTIVATE_CLONE', phase: 'sending' }).actions[1], { id: 'register', label: 'Activating…', kind: 'primary', busy: true, enabled: true });
  assert.equal(checkSheet({ type: 'RESCUE', canRegister: false }).actions[1].enabled, false, 'Register only while the server still offers the action');
  assert.throws(() => checkSheet({ type: 'SCAN' }), /SCAN has no check of this component's/, 'Scan\'s check is the Hacker component\'s');
  // Move's check (the Lead's Q1): Cancel and Register move; no list, no After Register.
  assert.deepEqual(checkSheet({ type: 'MOVE' }).actions.map(a => [a.id, a.label, a.local ?? false]), [['cancel', 'Cancel', true], ['register', 'Register move', false]]);
  assert.equal(checkSheet({ type: 'MOVE', phase: 'sending' }).actions[1].label, 'Registering…');
  assert.throws(() => targetListSheet({ type: 'MOVE' }), /Move has no list/);
  assert.throws(() => afterSheet({ type: 'MOVE' }), /A move has no After Register/);
  assert.deepEqual(afterSheet({ type: 'ENGINEER_SUPPRESS' }), { id: 'action-after', title: 'Suppress navigation', close: false, actions: [{ id: 'done', label: 'Done', kind: 'secondary', local: true }] });
  assert.deepEqual(unknownSheet({ type: 'RESCUE', busy: 'check' }).actions.map(a => [a.id, a.label, a.busy, a.enabled, a.local ?? false]), [['retry', 'Retry the same', false, false, false], ['check', 'Check receipt', true, true, false]]);
  // The name keeps its "·" and "Player" its number, with no-break spaces (the Lead's polish, approved by the owner on 18 November).
  assert.equal(passSheet({ next: { seat: 'seat-5', name: 'Eli' } }).sub, 'The turn goes to Eli\u00a0· Player\u00a05');
  assert.equal(passSheet({}).sub, null, 'without the next player (B5), no sub');
  assert.deepEqual(passSheet({ busy: true }).actions.map(a => [a.id, a.busy ?? false, a.enabled ?? true, a.local ?? false]), [['cancel', false, false, true], ['pass', true, true, false]]);
  // The projection's own allowance (0.2.3, A14): a button it does not allow now keeps its place, unusable; while a
  // button asks, it stays itself.
  assert.deepEqual(unknownSheet({ type: 'RESCUE', canRetry: false }).actions.map(a => [a.id, a.enabled]), [['retry', false], ['check', true]]);
  assert.deepEqual(unknownSheet({ type: 'RESCUE', canCheck: false }).actions.map(a => [a.id, a.enabled]), [['retry', true], ['check', false]]);
  assert.deepEqual(unknownSheet({ type: 'RESCUE', busy: 'retry', canRetry: false }).actions.map(a => [a.id, a.busy, a.enabled]), [['retry', true, true], ['check', false, false]]);
  assert.deepEqual(passSheet({ canPass: false }).actions.map(a => [a.id, a.enabled]), [['cancel', true], ['pass', false]]);
  assert.equal(passSheet({ busy: true, canPass: false }).actions[1].enabled, true, 'while it sends, Pass is busy, not refused');
  // Pass and the Disabler's position (A13): sheet 45 is theirs here; every other frame and word refuses them.
  for (const [type, place] of [['PASS_TURN', /passSheet\(\) and passedToast\(\)/], ['SELECT_BLACKOUT_SLOT', /blackoutBar\(\)/]]) {
    assert.equal(unknownSheet({ type }).title, 'Outcome unknown');
    for (const fn of [() => targetBar({ type }), () => targetListSheet({ type }), () => checkSheet({ type }), () => afterSheet({ type }), () => registeredToast({ type, id: 'cmd-1' }), () => afterWords({ type, round: 3 })]) {
      assert.throws(fn, place, `${type}: refused, naming its own place`);
    }
  }
  assert.deepEqual(targetBar({ type: 'RESCUE' }), { icon: 'rescue', title: 'Rescue', sub: 'Choose a player' });
  assert.deepEqual(targetBar({ type: 'SUPPLY' }).sub, 'Choose two players');
  assert.deepEqual(targetBar({ type: 'SUPPLY', picked: ['seat-1'] }), { icon: 'supply', title: 'Supply', sub: 'Choose the second player' });
  assert.deepEqual(targetBar({ type: 'REQUEST_HACK', where: 'board' }), { icon: 'talk', title: 'Private talk', sub: 'Choose a player · every room' });
  // The Hacker's bar and the Code are the Hacker component's: no second copy here (the Lead's note 2).
  assert.throws(() => targetBar({ type: 'SCAN' }), /the Hacker component's scanBar\(\)/);
  assert.throws(() => targetBar({ type: 'SUBMIT_CODE' }), /the Hacker component's codeSheet\(\)/);
  // The Disabler's position bar during a Blackout (sheet 30; the owner's decision of 16 November): its room while
  // choosing, then the position the server has, with the pack's position mark.
  assert.deepEqual(blackoutBar({ room: 'Room A' }), { icon: 'position', title: 'Choose a position', sub: 'Room A · any position, even empty' });
  // Once fixed the bar is final, with no Cancel (0.2.4: the owner's approval of 17 November, #280 at f0066a7c); while
  // choosing it keeps the shell's Cancel (T2), so it gives no `cancel`.
  assert.deepEqual(blackoutBar({ room: 'Room B', fixed: 'B2' }), { icon: 'position', title: 'Position B2 fixed', sub: 'Resolves after the window · no effect shown now', cancel: false });
  assert.equal('cancel' in blackoutBar({ room: 'Room A' }), false);
  assert.equal(blackoutBar({ fixed: 'A3' }).title, 'Position A3 fixed', 'once fixed, the room is not needed');
  assert.throws(() => blackoutBar(), /names the room/);
  assert.throws(() => blackoutBar({ room: 'Room A', fixed: '' }), /fixed is the position/);
  assert.ok(ICON_NAMES.includes('position'), 'the position mark is in the game\'s icon family');
  // The Hospital panel's keypad, Submit and records are the Hospital panel component's (the Lead's Q3): only sheet 45
  // is Actions', and both its buttons stand for commands, as for every action.
  for (const [what, fn] of [['target bar', () => targetBar({ type: 'PANEL_CODE' })], ['list', () => targetListSheet({ type: 'PANEL_CODE' })], ['check', () => checkSheet({ type: 'PANEL_CODE' })],
    ['After Register', () => afterSheet({ type: 'PANEL_CODE' })], ['toast', () => registeredToast({ type: 'PANEL_CODE', id: 'cmd-1' })]]) {
    assert.throws(fn, /PANEL_CODE has no .*the Hospital panel component's \(design\/phone-ui\/components\/hospital-panel\)/, `PANEL_CODE: no ${what} here`);
  }
  assert.deepEqual(unknownSheet({ type: 'PANEL_CODE' }).actions.map(a => [a.id, a.label, a.local ?? false]), [['retry', 'Retry the same', false], ['check', 'Check receipt', false]]);
  assert.deepEqual(targetChip({ kind: 'other-rooms', count: 2 }), { id: 'other-rooms', label: 'Other rooms · 2', icon: 'board', tone: 'paper' });
  assert.deepEqual(targetChip({ kind: 'list' }), { id: 'list', label: 'List', icon: 'players', tone: 'paper' });
  assert.throws(() => targetChip({ kind: 'other-rooms', count: 0 }), /how many people are elsewhere/);
  assert.deepEqual(registeredToast({ type: 'PROTECT', id: 'cmd-9' }), { id: 'cmd-9', text: 'Protection registered', icon: 'check' });
  assert.equal(registeredToast({ type: 'REQUEST_HACK', kind: 'accepted', id: 'cmd-1' }).text, 'Private talk accepted');
  assert.equal(registeredToast({ type: 'ACTIVATE_CLONE', kind: 'active', id: 'cmd-2' }).text, 'Clone active');
  assert.equal(registeredToast({ type: 'ENGINEER_SUPPRESS', kind: 'captured', id: 'cmd-3' }).text, 'Navigation suppressed');
  assert.throws(() => registeredToast({ type: 'RESCUE' }), /the command's id/, 'a toast needs the command\'s id, so it shows once');
  // Move chooses a position (sheets 20, 26 and 27.1; the Lead's Q3 and Q4): its own bar and chip, never a person's.
  assert.throws(() => targetBar({ type: 'MOVE' }), /its target bar is moveBar\(\)/);
  const room = (here, elsewhere) => moveBar({ where: 'room', room: 'Room A', here, elsewhere });
  assert.deepEqual(room(true, true), { icon: 'move', title: 'Move within Room A', sub: 'Choose an empty position · or another room on the Board' });
  assert.deepEqual(room(true, false), { icon: 'move', title: 'Move within Room A', sub: 'Choose an empty position' }, 'positions only here (Q3)');
  assert.deepEqual(room(false, true), { icon: 'move', title: 'Move', sub: 'No empty position in Room A · choose one on the Board' }, 'this room full (Q3)');
  assert.equal(room(false, false), null, 'no position anywhere: no bar (Q3)');
  assert.deepEqual(moveBar({ where: 'board', here: true, elsewhere: true }), { icon: 'move', title: 'Move', sub: 'Choose an empty position · uses this round’s move' });
  assert.equal(moveBar({ where: 'room', room: 'Room A', here: true, elsewhere: true, picked: 'A3' }), null, 'picked: the check takes the bar\'s place (Q1)');
  assert.throws(() => moveBar({ where: 'room', here: true }), /names the viewer's room/);
  assert.deepEqual(moveChip({ elsewhere: true }), { id: 'move-board', label: 'Other rooms on the Board', icon: 'board', tone: 'paper' });
  assert.equal(moveChip({ elsewhere: false }), null);
  // Once accepted (Q2): "Moved to A3", the shell's info toast; and Pass's "Turn passed" (27.3).
  assert.deepEqual(movedToast({ slot: 'A3', id: 'cmd-5' }), { id: 'cmd-5', text: 'Moved to A3', icon: 'info' });
  assert.throws(() => registeredToast({ type: 'MOVE', id: 'cmd-5' }), /movedToast\(\)/);
  assert.deepEqual(passedToast({ id: 'cmd-6' }), { id: 'cmd-6', text: 'Turn passed', icon: 'info' });
  assert.throws(() => passedToast({}), /the command's id/);
});

test('the words of a check and of "Outcome unknown": the person, yourself, both people, or the action alone; a tile\'s line (T3)', () => {
  const eli = { seat: 5, name: 'Eli', room: 'Hospital' }, dev = { seat: 4, name: 'Dev', room: 'Room A' };
  assert.deepEqual(actionWords({ type: 'RESCUE', targets: [eli], viewer: 4 }), { title: 'Rescue Eli', sub: 'Player\u00a05\u00a0· Hospital', what: 'Rescue Eli' }, '"Player" keeps its number, and the seat its "·" (0.2.5)');
  assert.equal(actionWords({ type: 'RESCUE', targets: [dev], viewer: 4 }).title, 'Rescue yourself');
  assert.equal(actionWords({ type: 'RESCUE', targets: [{ seat: 5, name: 'Eli', room: null }], viewer: 4 }).sub, 'Player\u00a05', 'no room given, none said');
  assert.deepEqual(actionWords({ type: 'SUPPLY', targets: [{ seat: 1, name: 'Ava' }, { seat: 7, name: 'Gus' }], viewer: 4 }), { title: 'Supply Ava and Gus', sub: 'Players\u00a01 and\u00a07', what: 'Supply Ava and Gus' });
  assert.equal(actionWords({ type: 'REQUEST_HACK', targets: [{ seat: 1, name: 'Ava', room: 'Room A' }], viewer: 4 }).title, 'Talk with Ava');
  assert.deepEqual(actionWords({ type: 'ACTIVATE_SHIP_HACK', targets: [], viewer: 4 }), { title: 'Hack Spaceship', sub: 'Only you see this', what: 'Hack Spaceship' });
  // The Hospital panel's request: "Panel request was sent, but no answer came back." (the Lead's Q3), never a number.
  assert.equal(actionWords({ type: 'PANEL_CODE', viewer: 4 }).what, 'Panel request');
  assert.equal(ACTION_WORDS.noAnswer(actionWords({ type: 'PANEL_CODE' }).what), 'Panel request was sent, but no answer came back.');
  // A move names its position, and its room under it, as a person's room is under them (Q1 and Q4).
  assert.deepEqual(actionWords({ type: 'MOVE', position: { slot: 'A3', room: 'Room A' } }), { title: 'Move to A3', sub: 'Room A', what: 'Move to A3' });
  assert.equal(actionWords({ type: 'MOVE', position: { slot: 'B4', room: null } }).sub, null);
  // Pass and the Disabler's position (0.2.3, A13): "Pass was sent, …", and the position as Move's is named.
  assert.equal(ACTION_WORDS.noAnswer(actionWords({ type: 'PASS_TURN' }).what), 'Pass was sent, but no answer came back.');
  assert.equal(ACTION_WORDS.noAnswer(actionWords({ type: 'SELECT_BLACKOUT_SLOT', position: { slot: 'A3', room: 'Room A' } }).what), 'Position A3 was sent, but no answer came back.');
  assert.throws(() => actionWords({ type: 'SELECT_BLACKOUT_SLOT' }), /The Disabler's position needs its position/);
  assert.equal(tileLine({ state: 'unavailable', reason: null, note: 'Once a round' }), 'Not available now', 'not offered, no reason: T3\'s words, never the offered line');
  assert.equal(tileLine({ state: 'unavailable', reason: 'From Round 4', note: null }), 'From Round 4', 'the server\'s reason, as given');
  assert.equal(tileLine({ state: 'spent', reason: 'Used', note: 'Once a match' }), 'Used', 'used up (kit 0.7.1): the server\'s reason');
  assert.equal(tileLine({ state: 'spent', reason: null, note: null }), 'Not available now', 'used up, no reason: T3\'s words');
  assert.equal(tileLine({ state: 'registered', reason: null, note: 'Eli · end of round' }), 'Eli · end of round');
  assert.equal(tileLine({ state: 'available', reason: 'ignored', note: null }), null, 'an offered tile says only its note');
});

test('After Register\'s words (0.2.3): the pack\'s own afterRegister(), given its facts; Frontend\'s lines left to Frontend; what is not given, left out', () => {
  const ACT = { RESCUE: 'rescue', PROTECT: 'protect', SUPPLY: 'supply', REGISTER_SHOT: 'shoot', REQUEST_HACK: 'talk', REQUEST_BLACKOUT: 'blackout', ENGINEER_SUPPRESS: 'suppress', ACTIVATE_CLONE: 'clone' };
  const STAMP = { REGISTERED: 'registered', ACCEPTED: 'accepted', ACTIVE: 'active', CAPTURED: 'captured' };
  const FRONTEND = new Set(['RESCUE', 'PROTECT', 'SUPPLY', 'REGISTER_SHOT']);
  // Every action of the handoff's table, for another player and for the viewer, word for word with the pack.
  for (const [type, act] of Object.entries(ACT)) for (const n of [1, 5, 7, SELF]) {
    const t = packSeat(n), A = afterRegister(act, t, 'room-a');
    const w = afterWords({ type, round: type === 'REGISTER_SHOT' ? 4 : 3, viewer: SELF,
      targets: ['RESCUE', 'PROTECT', 'REGISTER_SHOT', 'REQUEST_HACK'].includes(type) ? [{ seat: t.seat, name: t.name }] : [],
      expiresAfterRound: type === 'ACTIVATE_CLONE' ? 4 : null, activeFromRound: type === 'PROTECT' ? 4 : null,
      capture: type === 'ENGINEER_SUPPRESS' ? { room: 'Room B', count: A.people.length } : null });
    // A private talk's detail is Frontend's too (acceptedDetail.hack; the Lead, 17 November): its headline is the pack's.
    assert.deepEqual(w, { kind: STAMP[A.stamp], title: FRONTEND.has(type) ? null : A.title, detail: FRONTEND.has(type) || type === 'REQUEST_HACK' ? null : A.detail,
      steps: A.steps.map(([state, title, sub]) => ({ state, title, sub })) }, `${type}, player ${n}`);
  }
  // What the projection gives and a screen's model may not carry stays out (the Lead, 17 November).
  assert.deepEqual(afterWords({ type: 'ACTIVATE_CLONE', round: 6 }), { kind: 'active', title: 'Clone active.', detail: 'Active from now. It used your main action for this round.',
    steps: [{ state: 'done', title: 'Active now', sub: 'Round 6 · when the server accepted it' }] }, 'no Clone end: no end in the line or the time line');
  assert.equal(afterWords({ type: 'ENGINEER_SUPPRESS', round: 6 }).detail, 'Captured now: the players in the other room. Their navigation weight is removed this round. Only you are told.');
  assert.equal(afterWords({ type: 'ENGINEER_SUPPRESS', round: 6, capture: { room: 'Room B', count: 1 } }).detail.startsWith('Captured now: the 1 player in Room B.'), true);
  assert.deepEqual(afterWords({ type: 'PROTECT', round: 6, targets: [{ seat: 7, name: 'Gus' }] }).steps.map(s => s.title), ['Registered', 'End of Round 6'], 'no Protection start: no later step');
  // No round, no time line (L6); the private talk's words name the other player once there is a time line.
  assert.deepEqual(afterWords({ type: 'REQUEST_HACK' }), { kind: 'accepted', title: null, detail: null, steps: [] });
  assert.throws(() => afterWords({ type: 'REQUEST_HACK', round: 3 }), /names the other player/);
  assert.throws(() => afterWords({ type: 'PROTECT', round: 3, activeFromRound: 4 }), /names who it protects/);
  // Each fact is its action's alone; the round is a round.
  assert.throws(() => afterWords({ type: 'RESCUE', round: 3, expiresAfterRound: 4 }), /the Clone's alone/);
  assert.throws(() => afterWords({ type: 'RESCUE', round: 3, activeFromRound: 4 }), /Protection's alone/);
  assert.throws(() => afterWords({ type: 'RESCUE', round: 3, capture: { room: 'Room B', count: 2 } }), /the Engineer's alone/);
  assert.throws(() => afterWords({ type: 'RESCUE', round: 0 }), /round is a round number/);
  // No After Register here: a move (Q2), Hack Ship and Blackhole (L7), the Hacker's, the Hospital panel's.
  assert.throws(() => afterWords({ type: 'MOVE', round: 3 }), /movedToast\(\)/);
  for (const type of ['ACTIVATE_SHIP_HACK', 'ACTIVATE_BLACKHOLE']) assert.throws(() => afterWords({ type, round: 3 }), /\(L7\)/);
  for (const type of ['SCAN', 'SUBMIT_CODE']) assert.throws(() => afterWords({ type, round: 3 }), /the Hacker component's/);
  assert.throws(() => afterWords({ type: 'PANEL_CODE', round: 3 }), /the Hospital panel component's/);
  // Its output is mountAfterRegister()'s input as it is.
  assert.doesNotThrow(() => checkAfterRegister({ type: 'RESCUE', ...afterWords({ type: 'RESCUE', round: 3 }), title: 'Rescue of Eli registered.' }));
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
  assert.equal(captures.length, 117, 'every state at both phone sizes, the small phone\'s and the text sizes\' at their own');
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
  assert.deepEqual(record.probe.full.checks.map(c => c.id), ['tiles', 'refused', 't3', 'list', 'check', 'after', 'words', 'footer', 'unknown', 'move', 'inputs', 'private', 'focus', 'text', 'dispose', 'motion']);
  assert.deepEqual(record.probe['device-reduced'].checks.map(c => c.id), ['motion'], 'with the device\'s Reduce motion, the motion check');
  const agree = record.agree;
  assert.ok(agree.ok, 'the agreement with the pack');
  assert.deepEqual(agree.problems, [], 'agreement: no page problem');
  assert.equal(agree.checks.length, 31, 'every compared frame');
  for (const c of agree.checks) assert.ok(c.ok, `${c.id} agrees with the pack`);
  // Move as drawn: the room's bar, chip and offered position; the check with the position marked; the toast.
  const at = key => record.captures[`390x844/${key}`];
  assert.deepEqual([at('move-room').target, at('move-room').chip, at('move-room').slots], ['Move within Room A|Choose an empty position · or another room on the Board', 'Other rooms on the Board', 'A5']);
  assert.deepEqual([at('move-check').who, at('move-check').slots, at('move-check').footer], ['Move to A5|Room A', 'A5*', 'Cancel|Register move']);
  assert.deepEqual([at('move-moved').toast, at('passed').toast], ['Moved to A5', 'Turn passed']);
  // A refusal (0.2.5, R2): Frontend's words, the check kept open with Register off, the words last and in view; at
  // 320 × 568 with the Largest text they start in view (the owner accepted the note as drawn there, 18 November).
  for (const c of [at('check-refused'), record.captures['430x932/check-refused'], record.captures['320x568/largest-check-refused']]) {
    assert.ok(c.error === 'The server did not allow that command.' && c.registerOff && c.errorLast && c.errorStarts && c.footer === 'Cancel|Register Rescue', `${c.file}: the refusal, Register off`);
  }
  assert.ok(at('check-refused').errorWhole && record.captures['430x932/check-refused'].errorWhole, 'whole in view at both development sizes');
  // The joins as drawn: "Player" with its number and the seat with its "·" in the check, and the Pass line.
  assert.ok(['check', 'check-ava', 'sending', 'check-supply', 'check-refused'].every(k => at(k).whoJoined) && at('pass').subJoined, 'the joins as drawn');
  // The Disabler during a Blackout (sheet 30): the dark room, every position offered, then A3 fixed.
  assert.deepEqual([at('blackout-pick').target, at('blackout-pick').slots, at('blackout-pick').lighting], ['Choose a position|Room A · any position, even empty', 'A1,A2,A3,A4,A5', 'dark']);
  assert.deepEqual([at('blackout-fixed').target, at('blackout-fixed').slots], ['Position A3 fixed|Resolves after the window · no effect shown now', 'A1,A2,A3*,A4,A5']);
  // Choosing keeps Cancel (T2); the fixed bar has none (0.2.4, the owner's approval, #280 at f0066a7c), at 200 % too.
  assert.deepEqual([at('blackout-pick').targetCancel, at('blackout-fixed').targetCancel, record.captures['320x568/largest-blackout'].targetCancel], [true, false, false]);
  // Pass's and the Disabler's "Outcome unknown" (0.2.3, A13), the position's in the dark room; and the probe draws both.
  assert.deepEqual([at('unknown-pass').notice, at('unknown-position').notice, at('unknown-position').lighting], ['Pass was sent, but no answer came back.', 'Position A3 was sent, but no answer came back.', 'dark']);
  assert.deepEqual(['pass', 'position'].map(k => record.probe.full.checks.find(c => c.id === 'unknown').detail[k][0]), ['Pass was sent, but no answer came back.', 'Position A3 was sent, but no answer came back.']);
  // After Register from afterWords() (0.2.3), as drawn: each headline and its time line's length, the pack's own
  // (screens-game.mjs afterRegister()), which the agreement compares with sheets 29.1 and 29.2.
  const AFTER_DRAWN = { 'after-rescue': ['Rescue of Eli registered.', 2], 'after-protect': ['Protection for Gus registered.', 3], 'after-blackout': ['Blackout registered.', 3],
    'after-talk': ['Private talk with Ava accepted.', 3], 'after-clone': ['Clone active.', 2], 'after-suppress': ['Navigation suppressed.', 2], 'after-reload': ['The server accepted your action.', 0] };
  for (const [key, drawn] of Object.entries(AFTER_DRAWN)) assert.deepEqual([at(key).headline, at(key).steps], drawn, key);
  // The pack's room shows its own control on 27.3's third frame: the room scene's, named, not compared here.
  assert.deepEqual(agree.checks.find(c => c.id.startsWith('agree: passed')).detail.notCompared, ['chip "Window · Hospital": the room\'s own control, the room scene\'s (#261)']);
});
