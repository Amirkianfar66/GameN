// Character selection (design/phone-ui/components/character-select): a runtime source the game imports as it
// is, so its module graph, its styles' scope, its inputs, its rules for this viewer's own choice and its words
// are checked here; its drawing and lifecycle in a browser under the production headers by
// design/tools/character-select-check.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHARACTER_SELECT_DEFAULTS, CHARACTER_SELECT_VERSION, CHARACTER_COUNT, CHOOSE_URGENT_MS, CHOOSE_WORDS, characterCell, chooseFoot, nextCharacterSelectInput,
} from '../../../design/phone-ui/components/character-select/character-select.mjs';
import { CREW } from '../../../apps/game/hosted/crew-drawing/crew.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/character-select';
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
/** The nine as Frontend gives them: the game's character data, in the grid's order. */
const NINE = Object.freeze(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9'].map(id => ({ id, name: CREW[id].sign })));
const live = (extra = {}) => nextCharacterSelectInput(CHARACTER_SELECT_DEFAULTS, {
  viewer: SELF, characters: NINE, holders: { c4: 2, c8: 1 }, timer: { remainingMs: 21000 }, mine: { id: 'c6', state: 'saving' }, choose: { enabled: true },
  toast: { id: 'assigned', text: CHOOSE_WORDS.assigned(CREW.c7.sign) }, ...extra,
});

test('the component is a runtime source: its whole graph is runtime-safe, and it looks nothing up', () => {
  const files = new Map(['character-select.mjs', 'character-select.css'].flatMap(f => [...graph(join(REPO, COMPONENT, f))]));
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview|pregame-films)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the kit\'s crew-runtime.mjs)');
  for (const path of [`${COMPONENT}/character-select.mjs`, `${COMPONENT}/character-select.css`, 'design/phone-ui/components/phone-shell/phone-shell.mjs', 'design/phone-ui/components/phone-shell/phone-shell.css',
    'design/phone-ui/components/kit/kit.mjs', 'design/phone-ui/components/kit/kit.css', 'design/phone-ui/components/icons.mjs']) {
    assert.ok(local.includes(path), `${path} is in the graph`);
  }
  // The names are Frontend's, given; the screen imports only the shell and the kit (the portraits come
  // through the kit, by id, from the hosted crew runtime), never the crew's data.
  const own = graph(join(REPO, COMPONENT, 'character-select.mjs')).get(join(REPO, COMPONENT, 'character-select.mjs'));
  assert.deepEqual(own, ['../phone-shell/phone-shell.mjs', '../kit/kit.mjs']);
  assert.doesNotMatch(read(`${COMPONENT}/character-select.mjs`).replace(/^\s*\/\/.*$/gm, ''), /\bCREW\b|\.sign\b|crew-runtime|crewPortrait/, 'the screen itself reads no crew data: the names are given');
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/character-select-check.mjs'), /mothership:dev-only/);
});

test('its styles reach nothing outside it: every rule under its root, the kit\'s parts only inside its own', () => {
  const file = `${COMPONENT}/character-select.css`;
  const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
  const list = selectors(file);
  assert.ok(list.length > 10, `found the rules (${list.length})`);
  for (const selector of list) {
    assert.match(selector, /^\.ms-char-select(?:[\s.:[]|$)/, `"${selector}" is scoped`);
    assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
    assert.doesNotMatch(selector, /\.ms-(?:phone-shell|ps-|role-stage|rst-|own-card|rc-|entry-parts|ep-|room-scene)/, `"${selector}" reaches no other component`);
    if (/\.ms-k-/.test(selector)) assert.match(selector, /\.ms-cs-[\w-]+[^,]*\.ms-k-/, `"${selector}": a kit part styled only inside the screen's own`);
    assert.doesNotMatch(selector, /^\.ms-char-select(?:\[[^\]]*\])?\s+(?::is\()?(?:button|div|span|b|p|h2|svg|ul|li|i|img)\b/, `"${selector}": no bare element straight under the root`);
  }
  assert.deepEqual([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]), [], 'no motion of its own: the spinner and the toast are the kit\'s and the shell\'s');
  assert.match(read(file), /^@import url\("\.\.\/phone-shell\/phone-shell\.css"\);/, 'it starts from the phone shell\'s stylesheet, which starts from the kit\'s');
  assert.match(read('design/phone-ui/components/phone-shell/phone-shell.css'), /@import url\("\.\.\/kit\/kit\.css"\);/);
  const declared = [...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))];
  assert.deepEqual(declared.filter(p => !p.startsWith('--ms-cs-')), [], 'custom properties are its own');
});

test('its words are the pack\'s (sheet 16), its clock turns amber from 0:05, and the names are the game\'s', () => {
  const entry = read('design/phone-ui/prototype/screens-entry.mjs');
  for (const words of [CHOOSE_WORDS.title, CHOOSE_WORDS.sub, CHOOSE_WORDS.closed, CHOOSE_WORDS.group, CHOOSE_WORDS.saving, CHOOSE_WORDS.yours, CHOOSE_WORDS.assignedNote,
    CHOOSE_WORDS.none, CHOOSE_WORDS.tapOne, CHOOSE_WORDS.savingLine, CHOOSE_WORDS.change, CHOOSE_WORDS.auto, 'Taken · ', ', taken by player ', ', yours', CHOOSE_WORDS.assigned('Juno')]) {
    assert.ok(entry.includes(words), `screens-entry.mjs: ${words}`);
  }
  assert.equal(CHOOSE_WORDS.taken(2), 'Taken · 2');
  // The reason a taken one is refused, as the interface (#292) says it.
  assert.equal(CHOOSE_WORDS.takenBy(2), 'Taken by player 2');
  assert.match(entry, /urgentAt: 5\b/);
  assert.equal(CHOOSE_URGENT_MS, 5000);
  assert.equal(CHARACTER_COUNT, 9);
  assert.equal(CHARACTER_SELECT_VERSION, 'character-select-0.1.0');
  // The sheet's "Assigned: Juno" is c7 by the game's own name for it, which Frontend gives.
  assert.equal(CREW.c7.sign, 'Juno');
  assert.deepEqual(NINE.map(c => c.name), ['Vega', 'Rigel', 'Lyra', 'Atlas', 'Orion', 'Nova', 'Juno', 'Mira', 'Echo']);
});

test('its inputs are checked, and refused with a reason: a name it is not given is refused, never looked up', () => {
  const refuses = (input, pattern) => assert.throws(() => nextCharacterSelectInput(CHARACTER_SELECT_DEFAULTS, input), pattern);
  refuses({ status: 'offline' }, /Status is live, stale, concealed/);
  refuses({ insets: { top: '47px' } }, /insets are null/);
  refuses({ characters: NINE.slice(0, 8) }, /the 9 as \[\{ id, name \}\]/);
  refuses({ characters: NINE.map((c, i) => (i === 2 ? { id: c.id } : c)) }, /Character c3 needs its name: the screen never looks one up/);
  refuses({ characters: NINE.map((c, i) => (i === 2 ? { id: c.id, name: '' } : c)) }, /needs its name/);
  refuses({ characters: NINE.map((c, i) => (i === 2 ? { name: c.name } : c)) }, /needs its id/);
  refuses({ characters: NINE.map((c, i) => (i === 2 ? NINE[1] : c)) }, /c2 is given twice/);
  refuses({ characters: NINE, timer: { remainingMs: -1 } }, /timer is \{ remainingMs \}/);
  refuses({ characters: NINE, timer: { remainingMs: '21s' } }, /timer is \{ remainingMs \}/);
  refuses({ characters: NINE, closed: 'yes' }, /closed is true or false, from the server/);
  refuses({ characters: NINE, holders: { c10: 2 } }, /holders name "c10", which is not one of the characters given/);
  refuses({ characters: NINE, holders: { c4: 0 } }, /a seat number \(1 or more\)/);
  refuses({ characters: NINE, holders: { c4: '2' } }, /a seat number/);
  refuses({ characters: NINE, holders: [2] }, /holders are \{ \[characterId\]: seat \}/);
  refuses({ characters: NINE, mine: { id: 'c10', state: 'confirmed' } }, /mine is "c10", which is not one of the characters given/);
  refuses({ characters: NINE, mine: { id: 'c6', state: 'chosen' } }, /mine's state is saving, confirmed, assigned/);
  refuses({ characters: NINE, choose: { enabled: true, reason: 5 } }, /choose.reason is text, or null/);
  refuses({ characters: NINE, toast: { id: 'x' } }, /A toast needs its text/);
  // Nothing is offered, chosen or shown until it is given; the checked forms are stable.
  const d = nextCharacterSelectInput(CHARACTER_SELECT_DEFAULTS, {});
  assert.deepEqual([d.characters, d.holders, d.mine, d.timer, d.closed, d.toast], [[], {}, null, null, false, null]);
  assert.deepEqual(d.choose, { enabled: false, reason: null }, 'choosing not offered by default');
  assert.equal(nextCharacterSelectInput(CHARACTER_SELECT_DEFAULTS, { choose: { enabled: 'yes' } }).choose.enabled, false, 'only true offers it');
  const once = live();
  assert.deepEqual(nextCharacterSelectInput(once, {}), once);
  assert.equal(once.toast.icon, 'info', 'the toast\'s info icon, as sheet 16 draws "Assigned: Juno"');
});

test('a new viewer drops this phone\'s choice, its saving state, the offer and the toast; the public grid stays', () => {
  const shown = live();
  const other = nextCharacterSelectInput(shown, { viewer: 5 });
  assert.equal(other.mine, null, 'this phone\'s choice, saving, dropped');
  assert.equal(other.toast, null, 'the toast dropped');
  assert.deepEqual(other.choose, CHARACTER_SELECT_DEFAULTS.choose, 'the offer dropped');
  for (const key of ['characters', 'holders', 'timer', 'closed']) assert.deepEqual(other[key], shown[key], `the public ${key} stays`);
  assert.equal(chooseFoot(other).name, CHOOSE_WORDS.none);
  assert.ok(NINE.every(c => !characterCell(other, c).mine), 'no cell is this phone\'s');
  // What the same update gives the new viewer is kept; the same viewer again drops nothing.
  const given = nextCharacterSelectInput(shown, { viewer: 5, mine: { id: 'c2', state: 'confirmed' }, choose: { enabled: true } });
  assert.deepEqual(given.mine, { id: 'c2', state: 'confirmed' });
  assert.equal(given.choose.enabled, true);
  assert.equal(given.toast, null);
  assert.deepEqual(nextCharacterSelectInput(shown, { viewer: SELF }).mine, shown.mine, 'the same viewer again drops nothing');
  // Concealed: dropped too, refused while concealed, and nothing comes back by itself.
  const hidden = nextCharacterSelectInput(shown, { status: 'concealed' });
  assert.deepEqual([hidden.mine, hidden.toast, hidden.choose.enabled], [null, null, false]);
  assert.deepEqual(hidden.holders, shown.holders, 'the public holders stay');
  assert.equal(nextCharacterSelectInput(hidden, { mine: { id: 'c6', state: 'confirmed' }, choose: { enabled: true } }).mine, null);
  assert.equal(nextCharacterSelectInput(hidden, { status: 'live' }).mine, null, 'shown again, the choice comes back only when given');
});

test('each cell follows the server\'s word: free, taken, closed, this phone\'s saving, yours or assigned', () => {
  const cell = (s, id) => { const { state, note, mark, label, mine, busy, off, reason } = characterCell(s, NINE.find(c => c.id === id)); return { state, note, mark, label, mine, busy, off, reason }; };
  const s = live();
  assert.deepEqual(cell(s, 'c1'), { state: 'available', note: '', mark: null, label: 'Vega', mine: false, busy: false, off: false, reason: null });
  assert.deepEqual(cell(s, 'c4'), { state: 'taken', note: 'Taken · 2', mark: null, label: 'Atlas, taken by player 2', mine: false, busy: false, off: true, reason: 'Taken by player 2' });
  assert.deepEqual(cell(s, 'c6'), { state: 'selected', note: 'Saving…', mark: null, label: 'Nova, yours', mine: true, busy: true, off: false, reason: null });
  const yours = nextCharacterSelectInput(s, { mine: { id: 'c6', state: 'confirmed' } });
  assert.deepEqual(cell(yours, 'c6'), { state: 'confirmed', note: 'Yours', mark: 'check', label: 'Nova, yours', mine: true, busy: false, off: false, reason: null });
  // Time is up, from the server only: every character but this phone's dimmed and refused.
  const closed = nextCharacterSelectInput(s, { closed: true, mine: { id: 'c7', state: 'assigned' }, timer: { remainingMs: 0 } });
  assert.deepEqual(cell(closed, 'c7'), { state: 'confirmed', note: 'Assigned', mark: 'check', label: 'Juno, yours', mine: true, busy: false, off: false, reason: null });
  assert.deepEqual(cell(closed, 'c1'), { state: 'taken', note: '', mark: null, label: 'Vega', mine: false, busy: false, off: true, reason: 'Time is up' });
  assert.equal(cell(closed, 'c4').note, 'Taken · 2', 'a held one still says who holds it');
  // The clock at 0:00 is not "Time is up".
  assert.equal(cell(nextCharacterSelectInput(s, { timer: { remainingMs: 0 } }), 'c1').off, false);
  // Choosing not offered: refused with Frontend's reason, or none, and not dimmed.
  const off = nextCharacterSelectInput(s, { choose: { enabled: false, reason: 'Opens when every seat is filled' } });
  assert.deepEqual([cell(off, 'c1').state, cell(off, 'c1').off, cell(off, 'c1').reason], ['available', true, 'Opens when every seat is filled']);
  assert.equal(cell(nextCharacterSelectInput(s, { choose: { enabled: false } }), 'c1').reason, null);
  // This phone's choice is drawn as its own even if a holder is given for it (the server's answer is Frontend's to give).
  assert.equal(cell(nextCharacterSelectInput(s, { holders: { c6: 3 } }), 'c6').state, 'selected');
});

test('the foot says how this phone\'s choice stands, and invites no tap once time is up', () => {
  const foot = s => { const { name, line, busy, pill } = chooseFoot(s); return [name, line, busy, pill]; };
  assert.deepEqual(foot(live({ mine: null })), ['No character yet', 'Tap one to choose', false, false]);
  assert.deepEqual(foot(live()), ['Nova', 'Saving your choice', true, false]);
  assert.deepEqual(foot(live({ mine: { id: 'c6', state: 'confirmed' } })), ['Nova', 'Tap another to change', false, true]);
  assert.deepEqual(foot(live({ mine: { id: 'c7', state: 'assigned' }, closed: true })), ['Juno', 'Assigned automatically', false, false]);
  // Once time is up the foot invites no tap it refuses (the Lead, #292): "Time is up", sheet 16's words for the
  // closed state; the character and "Yours" stay; "Assigned automatically" and "Saving your choice" keep their words.
  assert.deepEqual(foot(live({ mine: { id: 'c6', state: 'confirmed' }, closed: true })), ['Nova', 'Time is up', false, true]);
  assert.deepEqual(foot(live({ mine: null, closed: true })), ['No character yet', 'Time is up', false, false]);
  assert.deepEqual(foot(live({ closed: true })), ['Nova', 'Saving your choice', true, false]);
  assert.equal(CHOOSE_WORDS.closed, 'Time is up');
  assert.equal(chooseFoot(live({ mine: null })).character, null, 'none yet: the empty tile');
  assert.equal(chooseFoot(live()).character, 'c6');
});

test('the check\'s record: every capture, probe check and agreement case passed under the production headers', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/character-select-check.mjs');
  assert.ok(record.sourceClean, 'recorded against a clean source');
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 20, 'the five states of sheet 16, time up after a choice, not offered, reconnecting, and the Large and Largest text, at two sizes');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn && c.portraits, `${key} passed, drew what its state asks, with the crew release's portraits`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
    assert.equal(c.backdrop, 'rgb(16, 20, 28)', `${key}: the pack's phone canvas`);
    assert.deepEqual(c.cut, [], `${key}: every name whole`);
  }
  for (const size of ['390x844', '430x932']) {
    assert.equal(record.captures[`${size}/auto`].toast, 'Assigned: Juno');
    assert.ok(record.captures[`${size}/closing`].urgent && !record.captures[`${size}/confirmed`].urgent, `${size}: amber at 0:04, not at 0:21`);
    assert.ok(record.captures[`${size}/largest`].list && !record.captures[`${size}/large`].list, `${size}: a list at the Largest text only`);
  }
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const groups = record.probe.full.checks.map(c => c.id.split(':')[0]);
  for (const group of ['choose', 'refused', 'focus', 'private', 'time', 'words', 'layout', 'dispose', 'motion']) assert.ok(groups.includes(group), `probe group ${group}`);
  assert.ok(record.probe.full.checks.some(c => /^private: a new viewer drops this phone's choice, its saving state/.test(c.id) && c.ok), 'the viewer-change rule, tested in the browser');
  const agree = record.agree;
  assert.ok(agree.ok && agree.checks.length === 10 && agree.checks.every(c => c.ok && c.detail.differences.length === 0), 'the screen agrees with the frozen pack\'s sheet 16');
  assert.deepEqual(agree.problems, [], 'agreement: no page problem');
  // The one accepted difference: the list at the Largest text, recorded against the pack as it is.
  const listed = agree.checks.filter(c => c.detail.accepted);
  assert.equal(listed.length, 1);
  assert.ok(listed[0].detail.accepted.screenList && !listed[0].detail.accepted.packList);
  // The bar's glyph is compared box for box (shell 0.2.2 draws it at the pack's 24 px).
  assert.ok(agree.checks.some(c => c.detail.parts['glyph icon'].screen === 1), 'the glyph\'s icon compared');
  for (const size of ['390x844', '430x932']) {
    const c = record.captures[`${size}/closed`];
    assert.ok(c.foot.line === 'Time is up' && c.foot.pill === 'Yours', `${size}: time up after a choice, the foot invites no tap`);
  }
});
