// The Card sheet (design/phone-ui/components/card): a runtime source the game imports as it is, so its module
// graph, its styles' scope, its inputs, its privacy rules and its words are checked here; its drawing,
// lifecycle and agreement with the pinned pack in a browser under the production headers by
// design/tools/card-check.mjs, whose record is checked last.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CARD_SHEET_DEFAULTS, CARD_SHEET_VERSION, CARD_SHEET_WORDS, RESOURCE_KINDS,
  cardSheet, checkCardSheet, knowledgeRows, nextCardSheetInput,
} from '../../../design/phone-ui/components/card/card.mjs';
import { CARD_STATES } from '../../../design/phone-ui/components/card/preview/states.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/card';
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
const input = (key, extra = {}) => ({ ...CARD_STATES[key].card, ...extra });

test('the component is a runtime source: its whole graph is runtime-safe and in the hosted graph', () => {
  const files = new Map([...graph(join(REPO, COMPONENT, 'card.mjs')), ...graph(join(REPO, COMPONENT, 'card.css'))]);
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the kit\'s crew-runtime.mjs)');
  for (const path of [`${COMPONENT}/card.mjs`, `${COMPONENT}/card.css`, 'design/phone-ui/components/role-stage/role-card.mjs', 'design/phone-ui/components/role-stage/role-card.css',
    'design/phone-ui/components/kit/kit.mjs', 'design/phone-ui/components/kit/kit.css', 'design/phone-ui/components/icons.mjs']) {
    assert.ok(local.includes(path), `${path} is in the graph`);
  }
  assert.ok(!local.some(p => /\/(?:room-scene|phone-shell)\/|role-stage\.(?:mjs|css)$/.test(p)), 'neither the shell, the room scene nor the role stage: Frontend mounts the sheet in the shell\'s sheet body');
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs', 'preview/states.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/card-check.mjs'), /^\/\/ mothership:dev-only/);
  assert.equal(CARD_SHEET_VERSION, 'card-sheet-0.1.0');
});

test('its styles reach nothing outside the component: every rule is under its root, the role card is only given a place', () => {
  const css = read(`${COMPONENT}/card.css`).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /^\s*@import url\("\.\.\/kit\/kit\.css"\);\s*@import url\("\.\.\/role-stage\/role-card\.css"\);/, 'it starts from the kit and the role card');
  assert.deepEqual([...css.matchAll(/@keyframes\s+([\w-]+)/g)], [], 'no motion of its own');
  const selectors = [...css.matchAll(/(^|[{}])([^{}]*?)\{/g)].map(m => m[2].trim()).filter(s => s && !s.startsWith('@'));
  assert.ok(selectors.length >= 8, `found the rules (${selectors.length})`);
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
      assert.match(selector, /^\.ms-card-sheet(?:[\s.:\[]|$)/, `"${selector}" is under the component's root`);
      assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
      for (const part of selector.split(/\s+|>|\+|~/).slice(1).filter(Boolean)) {
        assert.match(part, /^(?::is\()?\.ms-(?:card|k)-/, `"${selector}": "${part}" is a class, not a bare element`);
      }
      assert.doesNotMatch(selector, /\.ms-rc-|\.ms-own-card/, `"${selector}": the role card's own parts are the role card's`);
      if (/\.ms-k-/.test(selector)) assert.match(selector, /\.ms-card-[\w-]+[^,]*\.ms-k-/, `"${selector}": a kit control placed only inside the component's own parts`);
    }
  }
  const declared = [...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))];
  assert.deepEqual(declared.filter(p => !p.startsWith('--ms-card-')), [], 'no kit token or other component\'s property is declared');
  // Layout only: no colour, type or picture of its own (those are the kit's and the role card's).
  assert.doesNotMatch(css, /(?:^|[;{\s])(?:color|background|font|border|box-shadow|opacity)\s*:/, 'no colour, type or border of its own');
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

test('its words are the pack\'s (screens-game.mjs card()), and the one T3 amendment', () => {
  const pack = read('design/phone-ui/prototype/screens-game.mjs'), fixtures = read('design/phone-ui/prototype/fixtures.mjs');
  for (const words of [CARD_SHEET_WORDS.title, CARD_SHEET_WORDS.sub, CARD_SHEET_WORDS.hide, ...Object.values(CARD_SHEET_WORDS.views), CARD_SHEET_WORDS.scans,
    ...Object.values(RESOURCE_KINDS).map(k => k.title), 'Round 2 · Player 7', 'Guess Blue · matched · in the Code']) {
    assert.ok(pack.includes(words), `"${words}" is the pack's`);
  }
  for (const words of [CARD_SHEET_WORDS.undercover, CARD_SHEET_WORDS.trio]) assert.ok(fixtures.includes(`'${words}'`), `"${words}" is the pack's`);
  // The pack's icons and tints for each resource row.
  for (const [kind, { icon, tint, title }] of Object.entries(RESOURCE_KINDS)) {
    assert.ok(pack.includes(`icon: '${icon}', tint: '${tint}', title: '${title}'`), `${kind}: the pack's ${icon}, ${tint}, ${title}`);
  }
  // The empty Knowledge line: the pack's states a rule; the Lead's decision on #270 (T3's principle), confirmed by the owner on 15 November 2026.
  assert.ok(pack.includes('Your role starts with no knowledge of other players.'));
  assert.equal(CARD_SHEET_WORDS.noKnowledge, 'You have no knowledge of other players.');
});

test('the Knowledge rows are the projection\'s knowledge as it is, and nothing more', () => {
  const rows = k => knowledgeRows(k);
  assert.deepEqual(rows(null), { facts: [], scans: [], empty: false, given: false }, 'not given: nothing, not even the empty line');
  assert.deepEqual(rows({ insiderSeatIds: [], knownUndercoverSeatId: null, scanResults: [] }), { facts: [], scans: [], empty: true, given: true });
  assert.deepEqual(rows({ insiderSeatIds: [], knownUndercoverSeatId: 'seat-6', scanResults: [] }).facts, [{ id: 'undercover', title: 'Undercover', value: 'Player 6' }]);
  assert.deepEqual(rows({ insiderSeatIds: ['seat-2', 'seat-6', 'seat-8'], knownUndercoverSeatId: null, scanResults: [] }).facts, [{ id: 'trio', title: 'Unmapped trio', value: 'Players 2, 6, 8' }]);
  const scan = (matched, inCode) => rows({ insiderSeatIds: [], knownUndercoverSeatId: null, scanResults: [{ round: 2, targetSeatId: 'seat-7', guess: 'Blue', matched, inCode }] }).scans[0];
  assert.deepEqual(scan(true, true), { id: 'scan-0', title: 'Round 2 · Player 7', sub: 'Guess Blue · matched · in the Code' });
  assert.equal(scan(false, false).sub, 'Guess Blue · not matched · not in the Code');
  assert.equal(scan(true, null).sub, 'Guess Blue · matched', 'nothing about the Code when the projection says nothing');
  // Checking a checked form changes nothing.
  const once = checkCardSheet(input('knowledge-hacker'));
  assert.deepEqual(checkCardSheet(once).knowledge, once.knowledge);
  assert.deepEqual(knowledgeRows(once.knowledge), knowledgeRows(input('knowledge-hacker').knowledge));
});

test('the sheet\'s words: "Your role", Close, no footer, and "Hide card" in the head only while the card shows', () => {
  const sheet = cardSheet(input('card'));
  assert.deepEqual({ ...sheet, head: undefined }, { id: 'card', title: 'Your role', sub: 'Only on this phone', back: false, close: true, detent: 'large', head: undefined, actions: [] });
  assert.deepEqual(sheet.head, [{ id: 'hide', icon: 'hide', label: 'Hide card', enabled: true, reason: null }]);
  assert.deepEqual(cardSheet(input('hidden')).head, [], 'hidden: no Hide');
  assert.deepEqual(cardSheet(input('card', { status: 'concealed' })).head, [], 'concealed: nothing');
  assert.deepEqual(cardSheet(input('resources')).head.map(h => h.id), ['hide'], 'in every view while the card shows');
});

test('inputs are checked, and refused with a reason', () => {
  const refuses = (extra, pattern) => assert.throws(() => checkCardSheet(input('card', extra)), pattern);
  refuses({ status: 'offline' }, /Status is live, stale, concealed/);
  refuses({ view: 'promises' }, /view is card, knowledge, resources/);
  refuses({ card: { role: 'Doctor', team: 'Green' } }, /team is Blue, Red, Alien/);
  refuses({ card: { team: 'Blue' } }, /needs its role/);
  refuses({ knowledge: { insiderSeatIds: ['seat-12'] } }, /insiderSeatIds are seats/);
  refuses({ knowledge: { knownUndercoverSeatId: 'Player 6' } }, /knownUndercoverSeatId is a seat/);
  refuses({ knowledge: { scanResults: [{ round: 2, targetSeatId: 'seat-7', guess: 'Green', matched: true }] } }, /scanResults\[0\]/);
  refuses({ resources: [{ kind: 'gold', value: '3' }] }, /kind is one of weapons, role-action, move, injections, promises/);
  refuses({ resources: [{ kind: 'move', value: 'Used' }, { kind: 'move', value: 'Used' }] }, /lists move twice/);
  refuses({ resources: [{ kind: 'move', value: '' }] }, /value is Frontend's words/);
  const d = checkCardSheet({});
  assert.deepEqual([d.view, d.hidden, d.card, d.knowledge, d.resources], ['card', false, null, null, null], 'nothing of the viewer\'s until given');
  assert.equal(CARD_SHEET_DEFAULTS.status, 'live');
});

test('this viewer\'s inputs are dropped while concealed, and when the viewer changes unless the update gives the new viewer\'s', () => {
  const shown = nextCardSheetInput(CARD_SHEET_DEFAULTS, input('knowledge-hacker'));
  assert.ok(shown.card && shown.knowledge && shown.resources && shown.view === 'knowledge');
  const hidden = nextCardSheetInput(shown, { status: 'concealed' });
  assert.deepEqual([hidden.view, hidden.hidden, hidden.card, hidden.knowledge, hidden.resources], ['card', false, null, null, null], 'dropped while concealed');
  assert.equal(nextCardSheetInput(hidden, { status: 'live' }).card, null, 'nothing comes back by itself');
  assert.equal(nextCardSheetInput(hidden, { card: input('card').card }).card, null, 'given while concealed, nothing is kept');
  const other = nextCardSheetInput(shown, { viewer: 7 });
  assert.deepEqual([other.card, other.knowledge, other.resources, other.view], [null, null, null, 'card'], 'a new viewer: dropped');
  const given = nextCardSheetInput(shown, { viewer: 7, card: input('card').card, view: 'resources' });
  assert.deepEqual([given.card.role, given.view, given.knowledge], ['Doctor', 'resources', null]);
  assert.ok(nextCardSheetInput(shown, { viewer: 4 }).knowledge, 'the same viewer drops nothing');
});

test('the check\'s record: every capture and probe check passed under the production headers; every frame agrees with the pack', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/card-check.mjs');
  assert.ok(record.sourceClean, 'recorded against a clean source');
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 21, 'nine states at two sizes, and three at 320 × 568 with the Largest text');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn, `${key} passed and drew what its state asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
  }
  for (const size of ['390x844', '430x932']) assert.deepEqual(record.captures[`${size}/concealed`].leaked, [], `${size}: concealed, no private word in the page`);
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const groups = record.probe.full.checks.map(c => c.id);
  for (const group of ['view', 'hide', 'refused', 'private', 'knowledge', 'resources', 'fit', 'dispose', 'motion']) assert.ok(groups.includes(group), `probe ${group}`);
  const agree = record.agree;
  assert.deepEqual(agree.problems, [], 'agreement: no page problem');
  assert.equal(agree.checks.length, 6);
  // The one accepted difference: the empty Knowledge line, T3's principle, confirmed by the owner on 15 November 2026.
  const accepted = agree.checks.flatMap(c => c.detail.accepted);
  assert.equal(accepted.length, 1);
  assert.deepEqual([accepted[0].pack, accepted[0].amended], ['Your role starts with no knowledge of other players.', 'You have no knowledge of other players.']);
  assert.match(accepted[0].why, /T3.*confirmed by the owner on 15 November 2026/);
  // No part may differ: the shell's sheet.head (8cfebb68) draws "Hide card" where the pack does.
  for (const c of agree.checks) {
    const state = c.id.match(/^agree: ([\w-]+)/)[1];
    assert.ok(c.ok && c.detail.differences.length === 0, `${state}: agrees with the pack to within half a pixel`);
  }
});
