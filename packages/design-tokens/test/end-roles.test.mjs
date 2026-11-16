// Sheet 44's Roles list and "Return to lobby" (design/phone-ui/components/end-roles): a runtime source the game
// imports as it is, so its module graph, its styles' scope and colours, its words, its inputs and its preview's states
// are checked here; its drawing, lifecycle, larger text and agreement with the pinned pack's end screen in a browser
// under the production headers by design/tools/end-roles-check.mjs, whose record is checked last.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  END_ROLES_DEFAULTS, END_ROLES_MOTION, END_ROLES_VERSION, END_ROLES_WORDS, TEAMS, checkEndRoles,
} from '../../../design/phone-ui/components/end-roles/end-roles.mjs';
import { END_BEATS } from '../../../design/phone-ui/components/end-scene/end-scene.mjs';
import { ICON_NAMES } from '../../../design/phone-ui/components/icons.mjs';
import { PREVIEW_SIZES, PREVIEW_STATES, REVEAL, ROLES_ROSTER, TEAMS as PACK_TEAMS, inputsFor } from '../../../design/phone-ui/components/end-roles/preview/states.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/end-roles';
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
const clock = { now: () => 0 };
const base = { reveal: REVEAL, roster: ROLES_ROSTER, teams: PACK_TEAMS, window: { id: 'w1', startedAt: 0 }, clock, showAt: 3900, viewer: 'seat-4' };

test('the component is a runtime source: its whole graph is runtime-safe and in the hosted graph, on the kit alone', () => {
  const files = new Map([...graph(join(REPO, COMPONENT, 'end-roles.mjs')), ...graph(join(REPO, COMPONENT, 'end-roles.css'))]);
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the kit\'s crew-runtime.mjs)');
  for (const path of [`${COMPONENT}/end-roles.mjs`, `${COMPONENT}/end-roles.css`, 'design/phone-ui/components/kit/kit.mjs', 'design/phone-ui/components/kit/kit.css', 'design/phone-ui/components/icons.mjs']) {
    assert.ok(local.includes(path), `${path} is in the graph`);
  }
  // Neither imports the other: the list takes the scene's moment as `showAt` (the Lead's Q2), and Frontend mounts each.
  assert.ok(!local.some(p => /\/(?:end-scene|phone-shell|room-scene|actions|play-parts|vote|card|hacker|private-talk)\//.test(p)), 'no other component');
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/states.mjs', 'preview/probe.mjs', 'preview/agree.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/end-roles-check.mjs'), /^\/\/ mothership:dev-only/);
  assert.equal(END_ROLES_VERSION, 'end-roles-0.1.0');
});

test('its styles reach nothing outside the component; no colour of its own, the kit\'s faction colours; it rises with the scene\'s words', () => {
  const css = read(`${COMPONENT}/end-roles.css`).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /^\s*@import url\("\.\.\/kit\/kit\.css"\);\s*\.ms-end-roles/, 'it starts from the kit alone');
  const selectors = [...css.replace(/@import[^;]*;/g, '').matchAll(/([^{}]+)\{/g)].map(m => m[1].trim()).filter(s => s && !s.startsWith('@') && !/^(?:from|to|\d+%)$/.test(s));
  assert.ok(selectors.length >= 15, `found the rules (${selectors.length})`);
  for (const list of selectors) {
    for (const selector of split(list)) {
      assert.match(selector, /^\.ms-end-roles(?:\.ms-kit)?(?:\[data-motion="reduced"\]|:focus)?(?:\s|$)/, `"${selector}" is under the component's root`);
      assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
      for (const part of selector.split(/\s+|>|\+|~/).slice(1).filter(Boolean)) {
        assert.match(part, /^(?:\.ms-er-[\w-]+(?:\[data-team="(?:Blue|Red|Alien)"\]|:not\(\[data-team\]\)|\[hidden\])?|\.ms-k-pt|\[data-appear="(?:rise|fade)"\])$/, `"${selector}": "${part}" is its own, the kit's portrait in its row, or its appearance`);
      }
      if (/\.ms-k-/.test(selector)) assert.match(selector, /\.ms-er-row \.ms-k-pt/, `"${selector}": the kit's portrait only inside its own row`);
    }
  }
  // No colour of its own. Each team's square takes the kit's faction colour (component-kit-0.8.0), for a revealed
  // team only: the end reveal is an explicit reveal (the tokens' usage rule).
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i, 'no colour of its own');
  for (const team of ['Blue', 'Red', 'Alien']) {
    assert.match(css, new RegExp(`\\.ms-end-roles \\.ms-er-chip\\[data-team="${team}"\\] \\{ --ms-er-team: var\\(--ms-k-faction-${team.toLowerCase()}\\); \\}`), `${team}: the kit's colour`);
  }
  assert.deepEqual([...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))], ['--ms-er-team'], 'only its own property is declared');
  const tokens = JSON.parse(read('packages/design-tokens/src/tokens-0.5.0.json'));
  assert.ok(tokens.usageConstraints.includes('Faction accents require authorized private knowledge or an explicit reveal.'));
  // Its motion: the scene's words' rise (8 px, 400 ms, easeOutCubic), and the still's 80 ms fade with Reduce motion.
  assert.deepEqual([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]), ['ms-er-rise', 'ms-er-fade']);
  assert.match(css, /@keyframes ms-er-rise \{ from \{ opacity: 0; translate: 0 8px; \} \}/, 'from 8 px low and transparent');
  assert.deepEqual([...css.matchAll(/animation:\s*([^;}]+)/g)].map(m => m[1].trim()),
    ['ms-er-rise 400ms cubic-bezier(0.33, 1, 0.68, 1) both', 'ms-er-fade 80ms linear both', 'ms-er-fade 80ms linear both', 'ms-er-fade 80ms linear both']);
  assert.match(css, /\.ms-end-roles\.ms-kit\[data-motion="reduced"\] \[data-appear="rise"\] \{ animation: ms-er-fade 80ms linear both; \}/, 'the game\'s Reduce motion');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.ms-end-roles \[data-appear="rise"\] \{ animation: ms-er-fade 80ms linear both; \} \}/, 'the device\'s Reduce motion');
  assert.doesNotMatch(css, /transition/, 'nothing else moves');
  assert.deepEqual(END_ROLES_MOTION, { rise: END_BEATS.rise, lift: 8, fade: 80 }, 'the words\' rise and the still\'s fade');
  // Q3: 58 % down, or 13 px under the title block (the pack's own gap at the Standard text is 13.88 px); the pack's
  // 82 px and 18 px above the bottom safe area.
  assert.match(css, /top: max\(58%, calc\(var\(--ms-er-clear, 0px\) \+ 13px\)\); bottom: calc\(var\(--ms-er-safe-b, 0px\) \+ 82px\); overflow: auto;/);
  assert.match(css, /bottom: calc\(var\(--ms-er-safe-b, 0px\) \+ 18px\)/);
});

test('the kit carries the three faction colours it takes: the tokens\' revealed factions, the pack\'s', () => {
  const kit = read('design/phone-ui/components/kit/kit.css');
  const pack = read('design/phone-ui/prototype/kit.css');
  const faction = JSON.parse(read('packages/design-tokens/src/tokens-0.5.0.json')).color.factionPrivateOrRevealed;
  for (const team of ['blue', 'red', 'alien']) {
    assert.match(kit, new RegExp(`--ms-k-faction-${team}: ${faction[team]};`), `the kit's ${team} is the tokens' ${faction[team]}`);
    assert.match(pack, new RegExp(`--faction-${team}: ${faction[team]};`), `the pack's ${team} is the tokens' ${faction[team]}`);
  }
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

test('its words are the pack\'s end screen\'s (screens-more.mjs end()), and the team said beside the colour', () => {
  const pack = read('design/phone-ui/prototype/screens-more.mjs');
  const W = END_ROLES_WORDS;
  for (const w of [W.roles, W.back, W.code([2, 5, 6, 9])]) assert.ok(pack.includes(`'${w}'`), `"${w}" is the pack's`);
  assert.ok(pack.includes("`${s} · ${seatOf(s).name}${s === SELF ? ' (you)' : ''}`"), 'the pack\'s row');
  assert.equal(W.row(4, 'Dev', true), '4 · Dev (you)');
  assert.equal(W.row(1, 'Ava', false), '1 · Ava');
  assert.equal(W.code([1, 3, 5, 7]), 'Original Code: Players 1, 3, 5, 7');
  assert.ok(ICON_NAMES.includes('leave'), 'the pack\'s leave icon is in the game\'s icon family');
  assert.ok(pack.includes("button('Return to lobby', { block: true, kind: 'secondary', icon: 'leave'"), 'the pack\'s button: block, secondary, leave');
  // Added: the team, visually hidden, for the colour square (the chip shows a colour only).
  assert.equal(W.team('Blue'), ', Blue team');
  assert.ok(read('docs/design/components/end-roles.md').includes('", Blue team"'), 'the team\'s words are recorded in the interface');
  // It works nothing out: no role is named in its source, so no team is ever mapped from a role (the Lead's Q1).
  const source = read(`${COMPONENT}/end-roles.mjs`).replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '');
  assert.doesNotMatch(source, /Doctor|Insider|Disabler|Supplier|Engineer|Undercover|Hacker|'Alien' *:/, 'no role in its code');
  assert.deepEqual(TEAMS, ['Blue', 'Red', 'Alien'], 'the contract\'s PlanetFaction');
});

test('inputs: checked and normalized, an error for anything unknown or a reveal that does not hold together', () => {
  assert.deepEqual(Object.keys(END_ROLES_DEFAULTS).sort(), ['clear', 'clock', 'interactive', 'reducedMotion', 'reveal', 'roster', 'safe', 'showAt', 'status', 'teams', 'versions', 'viewer', 'window']);
  const s = checkEndRoles({ ...base, reveal: { roles: [...REVEAL.roles].reverse(), code: ['seat-9', 'seat-2', 'seat-6', 'seat-5'] } });
  assert.deepEqual(s.reveal.rows.map(r => r.seat), [1, 2, 3, 4, 5, 6, 7, 8, 9], 'rows in seat order');
  assert.deepEqual(s.reveal.code, [2, 5, 6, 9], 'the Code ascending');
  assert.equal(s.viewer, 4);
  assert.equal(s.teams.get(9), 'Alien');
  assert.equal(checkEndRoles({ ...base, viewer: 4 }).viewer, 4, 'a seat number is a seat too');
  assert.equal(checkEndRoles({ ...base, teams: null }).teams, null);
  assert.equal(checkEndRoles({ reveal: null, viewer: 'seat-1' }).reveal, null, 'an aborted match: no reveal');
  for (const [what, input, pattern] of [
    ['an unknown key', { ...base, winner: 'Red' }, /has no "winner"/],
    ['a seat outside 1–9', { ...base, reveal: { ...REVEAL, roles: [{ seatId: 'seat-0', role: 'Doctor' }, ...REVEAL.roles.slice(1)] } }, /seat id/],
    ['six seats', { ...base, reveal: { ...REVEAL, roles: REVEAL.roles.slice(0, 6) } }, /7 to 9/],
    ['a seat twice', { ...base, reveal: { ...REVEAL, roles: [REVEAL.roles[0], ...REVEAL.roles.slice(0, 8)] } }, /revealed twice/],
    ['a revealed seat not in the roster', { ...base, roster: ROLES_ROSTER.slice(1) }, /not in the roster/],
    ['a Code of three', { ...base, reveal: { ...REVEAL, code: ['seat-1', 'seat-2', 'seat-3'] } }, /four seats/],
    ['a Code seat twice', { ...base, reveal: { ...REVEAL, code: ['seat-1', 'seat-1', 'seat-2', 'seat-3'] } }, /four distinct revealed seats/],
    ['a team that is none of the three', { ...base, teams: { ...PACK_TEAMS, 'seat-1': 'Green' } }, /Blue, Red, Alien/],
    ['a team for a seat not revealed', { ...base, reveal: { roles: REVEAL.roles.slice(0, 7), code: ['seat-1', 'seat-2', 'seat-3', 'seat-4'] } }, /not revealed/],
    ['a status it does not know', { ...base, status: 'away' }, /status is live, stale, concealed/],
    ['a clock without now()', { ...base, clock: {} }, /clock is null, or \{ now\(\) \}/],
    ['clear.top in words', { ...base, clear: { top: '500px' } }, /clear\.top/],
  ]) assert.throws(() => checkEndRoles(input), pattern, what);
});

test('every preview state is a valid input, and each of the pack\'s five end screens has its state', () => {
  for (const [key, state] of Object.entries(PREVIEW_STATES)) {
    for (const size of Object.values(PREVIEW_SIZES)) assert.doesNotThrow(() => checkEndRoles({ ...inputsFor(key, size).roles, safe: { bottom: size.insets.bottom } }), key);
    if (state.result.reason === 'ARRIVAL') assert.equal(inputsFor(key, PREVIEW_SIZES['390x844']).roles.showAt, END_BEATS.arrival.words, `${key}: with the arrival's words`);
    else assert.equal(inputsFor(key, PREVIEW_SIZES['390x844']).roles.showAt, END_BEATS.none.words, `${key}: with no winner's words`);
  }
  assert.equal(Object.keys(PREVIEW_STATES).length, 13);
  assert.deepEqual(Object.values(PREVIEW_STATES).map(s => s.pack).filter(Boolean).sort(), ['Blue', 'Red', 'aborted', 'alien', 'none'], 'the pack\'s five end screens');
  assert.equal(PREVIEW_STATES.aborted.roles.reveal, null, 'aborted: no reveal');
});

test('the check\'s record: every capture, the probe and the agreement passed, on clean committed source, under the production headers', () => {
  const path = `${COMPONENT}/review/check.json`;
  assert.ok(existsSync(join(REPO, path)), 'the check has been recorded');
  const record = JSON.parse(read(path));
  assert.equal(record.tool, 'design/tools/end-roles-check.mjs');
  assert.equal(record.version, END_ROLES_VERSION);
  assert.equal(record.sourceClean, true, 'recorded on committed source');
  assert.match(record.sourceCommit, /^[0-9a-f]{40}$/);
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 64, 'every state at both phone sizes, in full motion and with the device\'s Reduce motion, and three results at 150 % and 200 %');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn && c.placed, `${key} passed, drew what its state asks, where it belongs`);
    assert.deepEqual(c.mismatched, [], `${key}: nothing differs from what its state asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
    assert.equal(sha256(c.file), c.sha256, `${key}: ${c.file} is the capture the record names`);
  }
  for (const size of ['390x844', '430x932']) for (const motion of ['full', 'reduced']) assert.deepEqual(record.captures[`${size}/concealed/${motion}`].leaked, [], `${size} ${motion}: concealed, nothing of the reveal in the page`);
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const groups = [...new Set(record.probe.full.checks.map(c => c.id.split(':')[0]))];
  assert.deepEqual(groups, ['words', 'teams', 'time', 'reduced', 'lifecycle', 'button', 'layout', 'larger', 'refusal']);
  assert.ok(record.probe['device-reduced'].checks.every(c => c.id.startsWith('device Reduce motion')), 'with the device\'s Reduce motion, its own checks');
  const agree = record.agree;
  assert.ok(agree.ok, 'the agreement with the pack');
  assert.deepEqual(agree.problems, [], 'agreement: no page problem');
  assert.equal(agree.checks.length, 30, 'the pack\'s five end screens at both sizes, at the Standard, Large and Largest text');
  for (const c of agree.checks) assert.ok(c.ok, `${c.id} agrees with the pack`);
  // One difference is accepted, and only at the larger text: the list's place under the title block (the Lead's Q3).
  for (const c of agree.checks) {
    const larger = / at (?:150|200)% text$/.test(c.id);
    for (const a of c.detail.accepted) {
      assert.ok(larger, `${c.id}: nothing is accepted at the Standard text`);
      assert.deepEqual([a.part, a.what], ['list', 'box'], `${c.id}: only the list's box`);
      assert.match(a.why, /^Q3: /, `${c.id}: for Q3`);
    }
  }
  assert.ok(agree.checks.some(c => c.detail.accepted.length > 0), 'the Q3 difference is there to accept');
});
