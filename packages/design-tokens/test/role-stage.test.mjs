// The role stage and the role card (design/phone-ui/components/role-stage): runtime sources the game
// imports as they are, so their module graph, their styles' scope, their inputs, their privacy rules and
// their words are checked here; their drawing and lifecycle in a browser under the production headers
// by design/tools/role-stage-check.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROLE_STAGE_DEFAULTS, ROLE_STAGE_VERSION, STAGE_WORDS, CROSSFADE_MS, CROSSFADE_REDUCED_MS, nextRoleStageInput, stageNote,
} from '../../../design/phone-ui/components/role-stage/role-stage.mjs';
import {
  ROLE_CARD_DEFAULTS, ROLE_CARD_VERSION, CARD_WORDS, checkRoleCard, deviceVariable, personVariable,
} from '../../../design/phone-ui/components/role-stage/role-card.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/role-stage';
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

const SELF = 4;
const doctor = { role: 'Doctor', team: 'Blue', facts: ['Two shared injections', 'Rescue a player in your room or, from Room A or B, in Hospital'], character: 'c3', device: 'cracker' };
const clock = t => ({ elapsedMs: t, filmAtMs: 20000, endsAtMs: 30000 });
const live = (extra = {}) => nextRoleStageInput(ROLE_STAGE_DEFAULTS, {
  viewer: SELF, clock: clock(12000), view: 'card', film: 'pending', card: doctor, ready: { mode: 'ready', enabled: false, reason: 'Opens when your film ends' },
  roster: { ready: 2, total: 9 }, toast: { id: 'rejoined', text: STAGE_WORDS.rejoined }, ...extra,
});

test('the components are runtime sources: their whole graph is runtime-safe', () => {
  const files = new Map(['role-stage.mjs', 'role-stage.css', 'role-card.mjs', 'role-card.css'].flatMap(f => [...graph(join(REPO, COMPONENT, f))]));
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview|pregame-films)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the shell\'s crew-runtime.mjs)');
  for (const path of [`${COMPONENT}/role-stage.mjs`, `${COMPONENT}/role-card.mjs`, 'design/phone-ui/components/phone-shell/phone-shell.mjs', 'design/phone-ui/components/icons.mjs',
    'design/phone-ui/components/kit/kit.mjs', 'design/phone-ui/components/kit/kit.css']) {
    assert.ok(local.includes(path), `${path} is in the graph`);
  }
  // The card stands alone: the Card sheet can mount it without the stage or the shell (the kit's portraits
  // bring the hosted game's crew runtime with them).
  const card = [...graph(join(REPO, COMPONENT, 'role-card.mjs')).keys()].map(f => relative(REPO, f));
  assert.ok(!card.some(p => /phone-shell|role-stage\.mjs/.test(p)), `the card needs neither the shell nor the stage: ${card}`);
  assert.ok(card.includes('design/phone-ui/components/kit/kit.mjs'), 'the card\'s Show is the kit\'s');
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
});

test('their styles reach nothing outside them: every rule under its own root, nothing into the film or another component', () => {
  for (const [file, rootClass, prefix, others] of [
    ['role-card.css', 'ms-own-card', 'ms-rc', /\.ms-(?:phone-shell|ps-|role-stage|rst-)/],
    ['role-stage.css', 'ms-role-stage', 'ms-rst', /\.ms-(?:phone-shell|ps-|own-card|rc-)/],
  ]) {
    const css = read(`${COMPONENT}/${file}`).replace(/\/\*[\s\S]*?\*\//g, '');
    const list = selectors(`${COMPONENT}/${file}`);
    assert.ok(list.length > 15, `${file}: found the rules (${list.length})`);
    for (const selector of list) {
      assert.match(selector, new RegExp(`^\\.${rootClass}(?:[\\s.:\\[]|$)`), `${file}: "${selector}" is scoped`);
      assert.doesNotMatch(selector, /\*(?!=)/, `${file}: "${selector}": no universal selector`);
      assert.doesNotMatch(selector, others, `${file}: "${selector}" reaches no other component`);
      // The kit's controls are placed only through the component's own parts, never restyled at large.
      if (/\.ms-k-/.test(selector)) assert.match(selector, new RegExp(`\\.${prefix}-[\\w-]+[^,]*\\.ms-k-`), `${file}: "${selector}": a kit control styled only inside its own parts`);
      assert.doesNotMatch(selector, /\.ms-rst-picture[\s>+~]/, `${file}: "${selector}": nothing inside the film's player`);
      assert.doesNotMatch(selector, new RegExp(`^\\.${rootClass}(?:\\[[^\\]]*\\])?\\s+(?::is\\()?(?:button|div|span|b|p|h2|svg|ul|li|i|article)\\b`), `${file}: "${selector}": no bare element straight under the root`);
    }
    const keyframes = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]);
    assert.ok(keyframes.every(name => name.startsWith(`${prefix}-`)), `${file}: keyframes are its own: ${keyframes}`);
    assert.match(read(`${COMPONENT}/${file}`), /^@import url\("\.\.\/kit\/kit\.css"\);/, `${file} starts from the shared kit`);
    const declared = [...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))];
    assert.deepEqual(declared.filter(p => !p.startsWith(`--${prefix}-`) && p !== '--ic-knock'), [], `${file}: custom properties are its own`);
  }
});

test('their words are the pack\'s: the role screen, the card and its back', () => {
  const pregame = read('design/phone-ui/prototype/screens-pregame.mjs');
  for (const words of [STAGE_WORDS.title, STAGE_WORDS.sub, STAGE_WORDS.missing, STAGE_WORDS.skipped, STAGE_WORDS.hide, STAGE_WORDS.skip, STAGE_WORDS.rejoined, STAGE_WORDS.strip,
    'Your film starts in ', 'Ready opens at ', ' of 9 ready', CARD_WORDS.missing, CARD_WORDS.missingSub, CARD_WORDS.hidden, CARD_WORDS.show]) {
    assert.ok(pregame.includes(words), `screens-pregame.mjs: ${words}`);
  }
  assert.equal(STAGE_WORDS.filmIn('0:19'), 'Your film starts in 0:19');
  assert.equal(STAGE_WORDS.count(6, 9), '6 of 9 ready');
  // Sheet 31's card back.
  const sheet31 = read('design/phone-ui/prototype/screens-game.mjs');
  for (const words of [`'${CARD_WORDS.hiddenShort}'`, `'${CARD_WORDS.showShort}'`]) assert.ok(sheet31.includes(words), `screens-game.mjs: ${words}`);
  assert.equal(CROSSFADE_MS, 700, 'the handoff: role card to film, a 700 ms crossfade');
  assert.equal(CROSSFADE_REDUCED_MS, 80, 'the handoff: with Reduce motion, 80 ms fades');
  assert.equal(ROLE_STAGE_VERSION, 'role-stage-0.1.0');
  assert.equal(ROLE_CARD_VERSION, 'role-card-0.1.0');
});

test('the card draws the art the bundles carry, and the preview\'s devices are Frontend\'s', () => {
  assert.equal(personVariable('c3'), 'var(--ms-asset-piece-crew-card-c3, none)');
  assert.equal(personVariable(null), 'none');
  assert.equal(deviceVariable('cracker'), 'var(--ms-asset-device-cracker-held, none)');
  assert.equal(deviceVariable('engineer'), 'var(--sw-asset-sw-device-engineer, none)');
  // The preview's role → device table is Frontend's (packages/presentation planetRoleLook), plus the
  // Engineer's successor device, which Frontend gives where the match carries that art.
  const model = read('packages/presentation/src/planet/model.ts');
  const frontend = JSON.parse(model.match(/const DEVICES[^=]*=\s*Object\.freeze\((\{[^}]*\})\)/)[1].replace(/'/g, '"').replace(/([{,])\s*([A-Za-z]+)\s*:/g, '$1"$2":'));
  const preview = read(`${COMPONENT}/preview/preview.mjs`).match(/PREVIEW_DEVICES = Object\.freeze\((\{[^}]*\})\)/)[1];
  const parsed = JSON.parse(preview.replace(/'/g, '"').replace(/([{,])\s*([A-Za-z]+)\s*:/g, '$1"$2":'));
  assert.deepEqual({ ...parsed, Engineer: undefined }, { ...frontend, Engineer: undefined });
  assert.equal(parsed.Engineer, 'engineer');
});

test('the card\'s input is checked, and face down keeps nothing private', () => {
  const up = checkRoleCard({ face: 'up', ...doctor });
  assert.equal(up.face, 'up');
  assert.deepEqual(up.facts, doctor.facts);
  assert.equal(up.art, 'ok');
  // No character, no person: the text card.
  assert.equal(checkRoleCard({ face: 'up', ...doctor, character: null }).art, 'missing');
  const down = checkRoleCard({ face: 'down', ...doctor });
  for (const key of ['role', 'team', 'character', 'device', 'stamp']) assert.equal(down[key], null, `face down: no ${key}`);
  assert.deepEqual(down.facts, []);
  assert.deepEqual(checkRoleCard({}), { ...ROLE_CARD_DEFAULTS, show: { enabled: true, reason: null } });
  const refuses = (input, pattern) => assert.throws(() => checkRoleCard({ face: 'up', ...doctor, ...input }), pattern);
  refuses({ face: 'sideways' }, /face is up or down/);
  refuses({ role: '' }, /needs its role/);
  refuses({ team: 'Green' }, /team is Blue, Red, Alien/);
  refuses({ facts: ['a', 'b', 'c', 'd'] }, /up to three lines/);
  refuses({ character: 'c10' }, /character is c1–c9/);
  refuses({ device: 'wrench' }, /device is one of/);
  refuses({ art: 'blurry' }, /art is ok or missing/);
  refuses({ stamp: 'voted' }, /stamp is ready/);
  refuses({ back: 'table' }, /stage or sheet/);
});

test('the stage\'s inputs are checked, and refused with a reason', () => {
  const refuses = (input, pattern) => assert.throws(() => nextRoleStageInput(ROLE_STAGE_DEFAULTS, input), pattern);
  refuses({ status: 'offline' }, /Status is live, stale, concealed/);
  refuses({ view: 'boarding' }, /view is card, film, after/);
  refuses({ film: 'paused' }, /film is pending, playing, missing, skipped/);
  refuses({ clock: { elapsedMs: 1000, filmAtMs: 30000, endsAtMs: 20000 } }, /0 < filmAtMs < endsAtMs/);
  refuses({ clock: { elapsedMs: '1s', filmAtMs: 20000, endsAtMs: 30000 } }, /clock is \{ elapsedMs/);
  refuses({ ready: { mode: 'voted' } }, /Ready's mode is ready or done/);
  refuses({ roster: { ready: 10, total: 9 } }, /ready ≤ total/);
  refuses({ toast: { id: 'x' } }, /A toast needs its text/);
  refuses({ insets: { top: '47px' } }, /insets are null/);
  refuses({ card: { role: 'Doctor', team: 'Green' } }, /team is Blue, Red, Alien/);
  const d = nextRoleStageInput(ROLE_STAGE_DEFAULTS, {});
  assert.equal(d.status, 'live');
  assert.equal(d.card, null);
  assert.deepEqual(d.ready, { mode: 'ready', enabled: false, busy: false, reason: null }, 'Ready not offered by default');
  // The clock is never past the stage's end, and the checked forms are stable.
  assert.equal(nextRoleStageInput(ROLE_STAGE_DEFAULTS, { clock: clock(31500) }).clock.elapsedMs, 30000);
  const once = live();
  assert.deepEqual(nextRoleStageInput(once, {}), once);
  // Once ready, Ready is spent: never usable or busy again.
  assert.deepEqual(live({ ready: { mode: 'done', enabled: true, busy: true } }).ready, { mode: 'done', enabled: false, busy: false, reason: null });
});

test('this viewer\'s inputs are dropped while concealed and for a new viewer; the clock and the count stay', () => {
  const shown = live({ view: 'film', film: 'playing' });
  const hidden = nextRoleStageInput(shown, { status: 'concealed' });
  assert.equal(hidden.card, null, 'the card dropped');
  assert.equal(hidden.toast, null, 'the toast dropped');
  assert.equal(hidden.view, 'card', 'the film\'s view dropped');
  assert.equal(hidden.film, 'pending', 'the film\'s state dropped');
  assert.deepEqual(hidden.ready, ROLE_STAGE_DEFAULTS.ready, 'Ready\'s offer dropped');
  assert.deepEqual(hidden.clock, shown.clock, 'the public clock stays (sheet 18: the clock keeps running)');
  assert.deepEqual(hidden.roster, shown.roster, 'the public count stays');
  // Offers given while concealed are refused too, and nothing comes back by itself.
  assert.equal(nextRoleStageInput(hidden, { card: doctor, ready: { enabled: true } }).card, null);
  assert.equal(nextRoleStageInput(hidden, { status: 'live' }).card, null, 'shown again, the card comes back only when given');
  // A new viewer.
  const other = nextRoleStageInput(shown, { viewer: 5 });
  assert.equal(other.card, null);
  assert.equal(other.view, 'card');
  const given = nextRoleStageInput(shown, { viewer: 5, card: { ...doctor, role: 'Hacker', team: 'Red', device: 'hacker' }, ready: { mode: 'done' } });
  assert.equal(given.card.role, 'Hacker');
  assert.equal(given.ready.mode, 'done', 'what the update gives for the new viewer is kept');
  assert.equal(given.toast, null);
  assert.equal(nextRoleStageInput(shown, { viewer: SELF }).card.role, 'Doctor', 'the same viewer again drops nothing');
});

test('the line under the card follows the stage and the viewer\'s own state', () => {
  assert.equal(stageNote(live({ clock: clock(1000) })), 'Your film starts in 0:19');
  assert.equal(stageNote(live({ clock: clock(12000) })), 'Your film starts in 0:08');
  assert.equal(stageNote(live({ clock: clock(24000), film: 'missing' })), STAGE_WORDS.missing);
  assert.equal(stageNote(live({ clock: clock(22000), film: 'skipped' })), STAGE_WORDS.skipped);
  assert.equal(stageNote(live({ clock: clock(23000), film: 'pending' })), 'Ready opens at 0:30');
  assert.equal(stageNote(live({ clock: clock(30000), view: 'after', ready: { enabled: true } })), STAGE_WORDS.hide);
  assert.equal(stageNote(live({ clock: clock(30000), view: 'after', ready: { mode: 'done' }, roster: { ready: 6, total: 9 } })), '6 of 9 ready');
  assert.equal(stageNote(live({ clock: null })), '', 'without a trusted clock, no time is shown');
  // Concealed: the public timing only, never the viewer's film or Ready state.
  assert.equal(stageNote(nextRoleStageInput(live({ clock: clock(9000), film: 'skipped' }), { status: 'concealed' })), 'Your film starts in 0:11');
});

test('the check\'s record: every capture, probe check and agreement case passed under the production headers', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/role-stage-check.mjs');
  assert.ok(record.sourceClean, 'recorded against a clean source');
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 30, 'twelve states of sheets 17 and 18 and the 0:12 card at the Large and Largest text, at two sizes, and sheet 31\'s card face up and hidden');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn, `${key} passed and drew what its state asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
  }
  // The pack's phone canvas outside the art (sheets 17 and 18 sample #10141C): the shell's backdrop, and a pixel.
  for (const [key, c] of captures.filter(([key]) => !key.startsWith('card/'))) {
    assert.equal(c.backdrop, 'rgb(16, 20, 28)', `${key}: the shell's backdrop is the canvas`);
    if (c.canvasPixel) assert.ok(c.canvasPixel.every((v, i) => Math.abs(v - [16, 20, 28][i]) <= 2), `${key}: a pixel outside the art is the canvas (${c.canvasPixel})`);
  }
  assert.equal(captures.filter(([, c]) => c.canvasPixel).length, 18, 'the canvas sampled in every card view: 0:01, 0:12, 0:30, missing, waiting, skipped, stale, Large and Largest, at two sizes');
  // The card ends where the foot begins: the pack's 120 px at the Standard text, higher as larger text grows the foot.
  for (const [key, c] of captures.filter(([, c]) => c.clear !== null && c.clear !== undefined)) assert.equal(c.clear, true, `${key}: the note never runs into the card`);
  for (const size of ['390x844', '430x932']) {
    assert.equal(record.captures[`${size}/t12`].cardBottom, 120, `${size}: at the Standard text, the pack's 120 px`);
    for (const [state, root] of [['large', 24], ['largest', 32]]) {
      const c = record.captures[`${size}/${state}`];
      assert.ok(c.root === root && c.clear === true && c.cardBottom > 120, `${size}/${state}: the card above the note at ${root} px text (${c.cardBottom} px)`);
    }
  }
  for (const size of ['390x844', '430x932']) {
    assert.ok(record.captures[`${size}/late`].toastOnTop && record.captures[`${size}/late`].toastClearOfChip, `${size}: the rejoined toast over the film, under its clock chip (sheet 18)`);
    assert.equal(record.captures[`${size}/concealed`].name, null, `${size}: concealed, no role`);
  }
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const groups = record.probe.full.checks.map(c => c.id.split(':')[0]);
  for (const group of ['focus', 'refused', 'private', 'time', 'film', 'layout', 'dispose', 'motion']) assert.ok(groups.includes(group), `probe group ${group}`);
  assert.ok(record.agree.ok && record.agree.checks.length === 9 && record.agree.checks.every(c => c.ok && c.detail.differences.length === 0), 'the stage agrees with the frozen pack\'s role screen');
  assert.deepEqual(record.agree.problems, [], 'agreement: no page problem');
});
