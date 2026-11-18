// The phase bars (design/phone-ui/components/phone-shell/phase-bars.mjs, shell 0.2.10): the top bar's words
// for each game step, a runtime source the game imports as it is. Checked here: its module graph, that every
// word is the pack's, each row of the words table, the amber rule, what is refused and what is missing, the
// privacy of its inputs, and that the agreement's pack inputs are the pack's own. The bars are drawn beside
// the pack in a browser by design/tools/phone-shell-check.mjs, whose record phone-shell.test.mjs holds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PHASE_WORDS, PHASE_BAR_PHASES, PHASE_BAR_REFUSED, phaseBar, movedBar, loadingBar, reconnectingBar, phaseClosedToast,
} from '../../../design/phone-ui/components/phone-shell/phase-bars.mjs';
import { checkBar, clockText, nextPhoneShellInput, PHONE_SHELL_DEFAULTS, PHONE_SHELL_VERSION } from '../../../design/phone-ui/components/phone-shell/phone-shell.mjs';
import { PHASE_CASES, NOT_REPRODUCED } from '../../../design/phone-ui/components/phone-shell/preview/phase-cases.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/phone-shell';
const read = path => readFileSync(join(REPO, path), 'utf8');
const PACK = { 'screens-game.mjs': read('design/phone-ui/prototype/screens-game.mjs'), 'screens-more.mjs': read('design/phone-ui/prototype/screens-more.mjs') };

/** The static imports of a module, resolved: relative ones to files, the rest as package names. */
function graph(entry) {
  const seen = new Map();
  const visit = file => {
    if (seen.has(file)) return;
    const source = readFileSync(file, 'utf8');
    const specifiers = [...source.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s+'([^']+)'|^\s*import\s+'([^']+)'/gm)].map(m => m[1] ?? m[2]);
    seen.set(file, specifiers);
    for (const s of specifiers) if (s.startsWith('.')) visit(resolve(dirname(file), s));
  };
  visit(entry);
  return seen;
}
/** A pack input as the pack's source writes it: `{ kind: 'phase', icon: 'lit', …, seconds: 13 }`. */
const literal = input => `{ ${Object.entries(input).map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : v}`).join(', ')} }`;
/** Promises and ⋮ as a player's phone gives them. */
const PLAYER = { promises: { count: 2 }, menu: {} };

test('the phase bars are a runtime source of the shell: runtime-safe, under its version, and nothing more in the graph', () => {
  const files = graph(join(REPO, COMPONENT, 'phase-bars.mjs'));
  const local = [...files.keys()].map(f => relative(REPO, f));
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(files.get(join(REPO, COMPONENT, 'phase-bars.mjs')), ['./phone-shell.mjs'], 'its one import is the shell, for the clock\'s text');
  const shell = [...graph(join(REPO, COMPONENT, 'phone-shell.mjs')).keys()].map(f => relative(REPO, f));
  assert.deepEqual(local.filter(p => p !== `${COMPONENT}/phase-bars.mjs`).sort(), shell.sort(), 'it adds no file to the shell\'s graph');
  assert.ok(!shell.includes(`${COMPONENT}/phase-bars.mjs`), 'the shell does not import the words: it draws the bar it is given');
  assert.equal(PHONE_SHELL_VERSION, 'phone-shell-0.3.2', 'the phase bars share the shell\'s version');
  // The functions are pure: no page, no clock, no timer, no chance, no network, no storage.
  const source = read(`${COMPONENT}/phase-bars.mjs`).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(source, /\b(?:document|window|globalThis|navigator|localStorage|sessionStorage|fetch|setTimeout|setInterval|requestAnimationFrame|Date|performance|Math\.random|crypto|import\()/, 'pure functions of their input');
  assert.match(read(`${COMPONENT}/preview/phase-cases.mjs`), /^\/\/ mothership:dev-only/, 'the agreement\'s cases are development-only, and say so');
});

test('every word is the pack\'s: each is found in the pack\'s own screens, as the fixture draws it', () => {
  const W = PHASE_WORDS;
  const game = PACK['screens-game.mjs'], more = PACK['screens-more.mjs'];
  // Sheet 07's specimens (screens-game.mjs topbars) and the screens of sheets 21, 30, 40, 41, 44 and 45 (screens-more.mjs).
  const words = [
    [game, W.before.title, '07'], [game, W.before.open, '07'], [more, W.before.start, '21'],
    [more, W.block.title, '40'], [more, W.block.sub, '40'],
    [game, W.appointment.title, '07'], [game, W.appointment.chooses('Ben'), '07'], [more, W.appointment.chooses('Ben'), '40'],
    [more, W.appoint.title, '40'], [more, W.appoint.sub, '40'],
    [game, W.blackout.title, '07'], [game, W.blackout.lit('0:03'), '07'], [game, W.blackout.dark, '07'], [more, W.blackout.lit('0:03'), '30'], [more, W.blackout.dark, '30'],
    [game, W.synchronized.title, '07'], [more, W.synchronized.title, '44'],
    [game, W.course.title, '07'], [more, W.course.everyone, '41'], [more, W.course.captain, '41'], [more, W.course.officer, '41'],
    [more, W.moved.title, '41'], [more, W.moved.complete(3), '41'],
    [more, W.loading.title, '45'], [more, W.loading.room(3, 5), '45'],
    [game, W.reconnecting.title, '07'], [game, W.reconnecting.lastSeen(3), '07'],
    [more, W.closed, '45'],
  ];
  for (const [source, text, sheet] of words) assert.ok(source.includes(`'${text}'`), `sheet ${sheet}: '${text}'`);
  // The toast is the pack's info toast, and the words hold nothing that is not checked above.
  assert.ok(more.includes(`toast('${W.closed}', 'info')`), 'sheet 45: the toast and its icon');
  const flat = [];
  const walk = value => { if (typeof value === 'string') flat.push(value); else if (typeof value === 'function') flat.push(null); else for (const v of Object.values(value)) walk(v); };
  walk(W);
  assert.equal(flat.filter(v => v !== null).length, 19, 'nineteen fixed lines');
  assert.equal(flat.filter(v => v === null).length, 5, 'five that name a player, a time, a round or a count');
  for (const text of flat.filter(v => v !== null)) assert.ok(words.some(w => w[1] === text), `'${text}' is held to the pack`);
  assert.ok(Object.isFrozen(W) && Object.values(W).every(v => typeof v === 'string' || Object.isFrozen(v)), 'the words are frozen');
});

test('each row of the words table: the pack\'s icon, title and line, and the shell takes every bar', () => {
  const rows = [
    // Before turns: the Officer's own first, then a block shown, then whether there is an Officer.
    [{ phase: 'PRE_TURN', hasOfficer: true }, { icon: 'hourglass', title: 'Before turns', sub: 'Officer block · Blackhole' }],
    [{ phase: 'PRE_TURN', hasOfficer: true, blocked: true }, { icon: 'hourglass', title: 'Before turns', sub: 'Turns start at 0:00' }],
    [{ phase: 'PRE_TURN' }, { icon: 'hourglass', title: 'Before turns', sub: 'Turns start at 0:00' }],
    [{ phase: 'PRE_TURN', hasOfficer: false, blocked: false }, { icon: 'hourglass', title: 'Before turns', sub: 'Turns start at 0:00' }],
    [{ phase: 'PRE_TURN', own: true, hasOfficer: true }, { icon: 'officer', title: 'Block a move', sub: 'Before turns · Officer' }],
    [{ phase: 'PRE_TURN', own: true, hasOfficer: true, blocked: true }, { icon: 'officer', title: 'Block a move', sub: 'Before turns · Officer' }],
    // The Officer's appointment.
    [{ phase: 'OFFICER_APPOINTMENT', chooser: { name: 'Ben' } }, { icon: 'officer', title: 'New Officer', sub: 'Ben chooses' }],
    [{ phase: 'OFFICER_APPOINTMENT', own: true, chooser: { name: 'Dev' } }, { icon: 'officer', title: 'Appoint Officer', sub: 'Random if time runs out' }],
    // The Blackout.
    [{ phase: 'BLACKOUT', lightsOutMs: 3000 }, { icon: 'lit', title: 'Blackout', sub: 'Lights out in 0:03' }],
    [{ phase: 'BLACKOUT', lightsOutMs: 2001 }, { icon: 'lit', title: 'Blackout', sub: 'Lights out in 0:03' }],
    [{ phase: 'BLACKOUT', lightsOutMs: 2000 }, { icon: 'lit', title: 'Blackout', sub: 'Lights out in 0:02' }],
    [{ phase: 'BLACKOUT', lightsOutMs: 0 }, { icon: 'lit', title: 'Blackout', sub: 'Lights out in 0:00' }],
    [{ phase: 'BLACKOUT', dark: true }, { icon: 'dark', title: 'Blackout', sub: 'Dark · positions fixed', tone: 'dark' }],
    [{ phase: 'BLACKOUT', dark: true, lightsOutMs: 3000 }, { icon: 'dark', title: 'Blackout', sub: 'Dark · positions fixed', tone: 'dark' }],
    // The six seconds after a Sync.
    [{ phase: 'BLACKHOLE_PRESENTATION' }, { icon: 'blackhole', title: 'Ship synchronized' }],
    // Navigation: one neutral window for everyone through all four phases, and the offices' own.
    ...['NAV_SETTING', 'NAV_TIE', 'NAV_CAPTAIN_CONFIRM', 'NAV_OFFICER_CONFIRM'].flatMap(phase => [
      [{ phase }, { icon: 'course', title: 'Setting course', sub: 'The offices are setting it' }],
      [{ phase, office: 'captain' }, { icon: 'course', title: 'Setting course', sub: 'Captain · private' }],
      [{ phase, office: 'officer' }, { icon: 'course', title: 'Setting course', sub: 'Officer · private' }],
    ]),
  ];
  for (const [input, expected] of rows) {
    const bar = phaseBar(input);
    assert.deepEqual(bar, { kind: 'phase', ...expected }, JSON.stringify(input));
    assert.doesNotThrow(() => checkBar(bar), `the shell takes ${JSON.stringify(input)}`);
    assert.equal(bar.short, undefined, 'the pack gives a short title only to the vote results');
  }
  assert.equal(phaseBar({ phase: 'BLACKOUT', lightsOutMs: 3000 }).sub, `Lights out in ${clockText(3000)}`, 'the time is the shell\'s clock text');
  // The three that are not a phase of the projection.
  assert.deepEqual(movedBar({ round: 3 }), { kind: 'phase', icon: 'course', title: 'The ship moved', sub: 'Round 3 complete', round: 3 });
  assert.deepEqual(loadingBar({ index: 3, total: 5 }), { kind: 'phase', icon: 'hourglass', title: 'Loading the ship', sub: 'Room 3 of 5' }, 'index counts from 1');
  assert.deepEqual(loadingBar({ index: 1, total: 5 }).sub, 'Room 1 of 5');
  assert.deepEqual(loadingBar({ index: 5, total: 5 }).sub, 'Room 5 of 5');
  assert.deepEqual(reconnectingBar({ round: 3 }), { kind: 'phase', icon: 'retry', title: 'Reconnecting…', sub: 'Showing Round 3 as last seen', round: 3 });
  for (const bar of [movedBar({ round: 3 }), loadingBar({ index: 3, total: 5 }), reconnectingBar({ round: 3 })]) assert.doesNotThrow(() => checkBar(bar));
});

test('the round, the clock, Promises and ⋮: as given, and dropped only where the pack\'s bar has none', () => {
  const full = phaseBar({ phase: 'PRE_TURN', hasOfficer: true, round: 3, remainingMs: 12000, ...PLAYER });
  assert.deepEqual(full, { kind: 'phase', icon: 'hourglass', title: 'Before turns', sub: 'Officer block · Blackhole', round: 3, timer: { remainingMs: 12000 }, promises: { count: 2 }, menu: {} });
  assert.equal(full.promises, PLAYER.promises, 'Promises is passed through as it is');
  // Nothing given, nothing drawn: a shared display gives neither Promises nor ⋮.
  const bare = phaseBar({ phase: 'PRE_TURN' });
  for (const key of ['round', 'timer', 'promises', 'menu']) assert.ok(!Object.hasOwn(bare, key), `${key} only when given`);
  assert.deepEqual(checkBar(bare).timer, null);
  assert.equal(phaseBar({ phase: 'PRE_TURN', remainingMs: -40 }).timer.remainingMs, 0, 'a clock past its end reads 0:00');
  assert.ok(!Object.hasOwn(phaseBar({ phase: 'PRE_TURN', remainingMs: Number.NaN }), 'timer'));
  assert.ok(!Object.hasOwn(phaseBar({ phase: 'PRE_TURN', round: 2.5 }), 'round'));
  // Ship synchronized: a brief fixed presentation, so no Promises; ⋮ stays (ui.mjs topBar()).
  const sync = phaseBar({ phase: 'BLACKHOLE_PRESENTATION', round: 4, remainingMs: 4000, durationMs: 6000, ...PLAYER });
  assert.deepEqual(sync, { kind: 'phase', icon: 'blackhole', title: 'Ship synchronized', round: 4, timer: { remainingMs: 4000, urgentAtMs: -1, ring: 1 / 3 }, menu: {} });
  assert.match(read('design/phone-ui/prototype/ui.mjs'), /A brief fixed presentation \(a ring timer: the 5 s vote result,\n \* the 6 s Ship synchronized\) has no time for Promises, so it keeps only ⋮\./, 'the pack\'s own rule');
  // Loading the ship: before the match, so no round, clock, Promises or ⋮, whatever is given.
  assert.deepEqual(loadingBar({ index: 3, total: 5, round: 3, remainingMs: 9000, ...PLAYER }), { kind: 'phase', icon: 'hourglass', title: 'Loading the ship', sub: 'Room 3 of 5' });
  // The ship moved and Reconnecting: no clock; the round, Promises and ⋮ as given (sheets 41, 07 and 45).
  assert.deepEqual(movedBar({ round: 3, remainingMs: 9000, ...PLAYER }), { kind: 'phase', icon: 'course', title: 'The ship moved', sub: 'Round 3 complete', round: 3, ...PLAYER });
  assert.deepEqual(reconnectingBar({ round: 3, remainingMs: 9000, ...PLAYER }), { kind: 'phase', icon: 'retry', title: 'Reconnecting…', sub: 'Showing Round 3 as last seen', round: 3, ...PLAYER });
});

test('amber means act now: a bar under which someone may act keeps it, and a public one under which no one acts never has it', () => {
  const clock = input => checkBar(phaseBar({ round: 3, remainingMs: 8000, durationMs: 15000, ...input })).timer;
  const amber = input => { const t = clock(input); return t.remainingMs <= t.urgentAtMs; };
  // The deciding player's own bar.
  for (const input of [{ phase: 'OFFICER_APPOINTMENT', own: true }, { phase: 'PRE_TURN', own: true }, { phase: 'NAV_SETTING', office: 'captain' }, { phase: 'NAV_SETTING', office: 'officer' },
    { phase: 'NAV_CAPTAIN_CONFIRM', office: 'captain' }, { phase: 'NAV_OFFICER_CONFIRM', office: 'officer' }]) assert.ok(amber(input), `amber: ${JSON.stringify(input)}`);
  // Everyone's bar while a hidden player may act: the Alien's Blackhole before turns, a Disabler's position in the Blackout.
  for (const input of [{ phase: 'PRE_TURN' }, { phase: 'PRE_TURN', hasOfficer: true }, { phase: 'PRE_TURN', hasOfficer: true, blocked: true }, { phase: 'BLACKOUT', lightsOutMs: 3000 }, { phase: 'BLACKOUT', dark: true }]) {
    assert.ok(amber(input), `amber for everyone: ${JSON.stringify(input)}`);
    assert.ok(!Object.hasOwn(phaseBar({ remainingMs: 8000, ...input }).timer, 'urgentAtMs'), 'the shell\'s own default');
  }
  // A public bar under which no one acts.
  for (const input of [{ phase: 'OFFICER_APPOINTMENT', chooser: { name: 'Ben' } }, { phase: 'OFFICER_APPOINTMENT' }, { phase: 'BLACKHOLE_PRESENTATION' },
    { phase: 'NAV_SETTING' }, { phase: 'NAV_TIE' }, { phase: 'NAV_CAPTAIN_CONFIRM' }, { phase: 'NAV_OFFICER_CONFIRM' }, { phase: 'NAV_SETTING', office: 'engineer' }]) {
    assert.equal(clock(input).urgentAtMs, -1, `never amber: ${JSON.stringify(input)}`);
    assert.ok(!amber({ ...input, remainingMs: 0 }), 'not even at 0:00');
  }
  // The rule is written once, in the file's own comment.
  const source = read(`${COMPONENT}/phase-bars.mjs`);
  assert.equal(source.match(/^\/\/ Amber\./gm)?.length, 1);
  assert.match(source, /Their bar must be\n\/\/   everyone's bar, so everyone keeps the amber\./);
});

test('Ship synchronized\'s ring is the share of the phase gone, as the pack draws it', () => {
  const ring = (remainingMs, durationMs = 6000) => phaseBar({ phase: 'BLACKHOLE_PRESENTATION', remainingMs, durationMs }).timer.ring;
  assert.equal(ring(6000), 0);
  assert.equal(ring(4000), 1 / 3, 'sheet 44: 4 s left, a third gone');
  assert.equal(Math.round(ring(5000) * 100) / 100, 0.17, 'sheet 07: 5 s left, 0.17');
  assert.equal(ring(0), 1);
  assert.equal(ring(9000), 0, 'never under 0');
  assert.equal(ring(-500), 1, 'never over 1');
  assert.ok(PACK['screens-more.mjs'].includes("title: 'Ship synchronized', round: 4, seconds: 4, ring: 1 / 3, urgentAt: -1"), 'sheet 44');
  // Without the phase's length there is no ring to draw: a clock, still never amber.
  assert.deepEqual(phaseBar({ phase: 'BLACKHOLE_PRESENTATION', remainingMs: 4000 }).timer, { remainingMs: 4000, urgentAtMs: -1 });
  assert.deepEqual(phaseBar({ phase: 'BLACKHOLE_PRESENTATION', remainingMs: 4000, durationMs: 0 }).timer, { remainingMs: 4000, urgentAtMs: -1 });
  // No other phase draws a ring, whatever is given.
  for (const phase of PHASE_BAR_PHASES.filter(p => p !== 'BLACKHOLE_PRESENTATION')) assert.ok(!Object.hasOwn(phaseBar({ phase, remainingMs: 4000, durationMs: 6000 }).timer, 'ring'), phase);
});

test('a missing fact draws the title alone; only true counts for a flag', () => {
  assert.deepEqual(phaseBar({ phase: 'OFFICER_APPOINTMENT' }), { kind: 'phase', icon: 'officer', title: 'New Officer' }, 'no chooser');
  for (const chooser of [{}, { name: '' }, { name: 7 }, 'Ben']) assert.ok(!Object.hasOwn(phaseBar({ phase: 'OFFICER_APPOINTMENT', chooser }), 'sub'), JSON.stringify(chooser));
  assert.deepEqual(phaseBar({ phase: 'BLACKOUT' }), { kind: 'phase', icon: 'lit', title: 'Blackout' }, 'no time to lights-out');
  assert.deepEqual(loadingBar(), { kind: 'phase', icon: 'hourglass', title: 'Loading the ship' }, 'no count');
  for (const count of [{ index: 0, total: 5 }, { index: 6, total: 5 }, { index: 3 }, { total: 5 }, { index: 1.5, total: 5 }, { index: '3', total: 5 }]) assert.ok(!Object.hasOwn(loadingBar(count), 'sub'), JSON.stringify(count));
  assert.deepEqual(reconnectingBar(), { kind: 'phase', icon: 'retry', title: 'Reconnecting…' }, 'no round seen yet');
  assert.deepEqual(movedBar(), { kind: 'phase', icon: 'course', title: 'The ship moved' });
  assert.ok(!Object.hasOwn(movedBar({ round: 0 }), 'sub'), 'no round has completed before the first');
  for (const bar of [phaseBar({ phase: 'OFFICER_APPOINTMENT' }), phaseBar({ phase: 'BLACKOUT' }), loadingBar(), reconnectingBar(), movedBar()]) assert.doesNotThrow(() => checkBar(bar));
  // A flag left out, or anything but true, reads as false: the line that is always true, and everyone's bar.
  for (const value of [undefined, null, false, 0, 1, 'true', {}]) {
    assert.equal(phaseBar({ phase: 'PRE_TURN', hasOfficer: value }).sub, 'Turns start at 0:00', `hasOfficer ${JSON.stringify(value)}`);
    assert.equal(phaseBar({ phase: 'PRE_TURN', hasOfficer: true, blocked: value }).sub, 'Officer block · Blackhole', `blocked ${JSON.stringify(value)}`);
    assert.equal(phaseBar({ phase: 'PRE_TURN', hasOfficer: true, own: value }).title, 'Before turns', `own ${JSON.stringify(value)}`);
    assert.equal(phaseBar({ phase: 'OFFICER_APPOINTMENT', own: value }).title, 'New Officer', `own ${JSON.stringify(value)}`);
    assert.equal(phaseBar({ phase: 'BLACKOUT', dark: value }).icon, 'lit', `dark ${JSON.stringify(value)}`);
  }
});

test('every phase of the contract is drawn here or refused by name; an unknown phase throws', () => {
  const kinds = read('packages/contracts/src/planet-game.ts').match(/PlanetPhaseKindSchema = z\.enum\(\[([\s\S]*?)\]\)/)[1].match(/'([A-Z_]+)'/g).map(k => k.slice(1, -1));
  assert.equal(kinds.length, 18, 'the contract\'s phases');
  assert.deepEqual([...PHASE_BAR_PHASES, ...Object.keys(PHASE_BAR_REFUSED)].sort(), [...kinds].sort(), 'each is drawn or refused, and none is both');
  for (const phase of PHASE_BAR_PHASES) assert.equal(phaseBar({ phase }).kind, 'phase');
  for (const [phase, owner] of Object.entries(PHASE_BAR_REFUSED)) {
    assert.throws(() => phaseBar({ phase, round: 3, remainingMs: 9000 }), error => error instanceof TypeError && error.message === `${owner}, not phaseBar()`, phase);
  }
  assert.match(PHASE_BAR_REFUSED.ORDINARY_TURN, /the shell's turn bar/);
  for (const phase of ['CAPTAIN_ELECTION', 'JAIL_VOTE']) assert.match(PHASE_BAR_REFUSED[phase], /ballotBar\(\)/);
  assert.match(PHASE_BAR_REFUSED.VOTE_RESULT, /resultBar\(\)/);
  for (const phase of ['HACK_DECLARE', 'HACK_RESULT', 'HACK']) assert.match(PHASE_BAR_REFUSED[phase], /talkBar\(\)/);
  assert.match(PHASE_BAR_REFUSED.FOOD_SUPPLY, /its own bar/);
  for (const phase of ['FINISHED', 'ABORTED']) assert.match(PHASE_BAR_REFUSED[phase], /bar: null/);
  for (const phase of [undefined, null, '', 'pre_turn', 'MOVED', 'LOADING', 7]) assert.throws(() => phaseBar({ phase }), TypeError, `unknown: ${JSON.stringify(phase)}`);
  assert.throws(() => phaseBar(), TypeError);
});

test('the bar is public: it reads no offer, role or rule, and says nothing an input did not say', () => {
  // What is not one of its inputs changes nothing: a role, an offer, a direction, a tie, who asked for the Blackout.
  const secrets = { role: 'Alien', faction: 'Red', offers: [{ type: 'ACTIVATE_BLACKHOLE' }, { type: 'BLOCK_MOVE' }], privateNavigation: { direction: 'Red', tieChoice: true }, blackoutTargeting: { selectable: true },
    self: { seatId: 'seat-4' }, direction: 'Red', tie: true, requester: 'seat-4' };
  for (const phase of PHASE_BAR_PHASES) {
    const facts = { phase, round: 3, remainingMs: 9000, durationMs: 15000, chooser: { name: 'Ben' }, hasOfficer: true, lightsOutMs: 3000, ...PLAYER };
    assert.deepEqual(phaseBar({ ...facts, ...secrets }), phaseBar(facts), phase);
  }
  // No bar names a role, a side, a direction or a count of anything hidden.
  const every = [...PHASE_BAR_PHASES.flatMap(phase => [{}, { own: true }, { blocked: true, hasOfficer: true }, { hasOfficer: true }, { dark: true }, { office: 'captain' }, { office: 'officer' }]
    .map(extra => phaseBar({ phase, chooser: { name: 'Ben' }, lightsOutMs: 3000, ...extra }))), movedBar({ round: 3 }), loadingBar({ index: 3, total: 5 }), reconnectingBar({ round: 3 })];
  for (const bar of every) {
    assert.doesNotMatch(`${bar.title} ${bar.sub ?? ''}`, /\b(?:Alien|Undercover|Insider|Doctor|Supplier|Hacker|Engineer|Disabler|Blue|Red|tie|Code)\b/i, JSON.stringify(bar));
  }
  // The Blackout and the minute before turns are one bar for everyone, whoever acts under it: no input tells them apart.
  assert.deepEqual(Object.keys(phaseBar({ phase: 'BLACKOUT', dark: true, round: 3, remainingMs: 8000 })).sort(), ['icon', 'kind', 'round', 'sub', 'timer', 'title', 'tone']);
  // Concealed, the shell drops this viewer's Promises from the bar, as for every bar; the words here change nothing of that.
  const concealed = nextPhoneShellInput(PHONE_SHELL_DEFAULTS, { viewer: 4, status: 'concealed', bar: phaseBar({ phase: 'OFFICER_APPOINTMENT', own: true, round: 2, remainingMs: 22000, ...PLAYER }) });
  assert.equal(concealed.bar.promises, null, 'concealed, Promises is dropped');
});

test('the toast for a phase that closed: the pack\'s words and icon, once per closed phase', () => {
  assert.deepEqual(phaseClosedToast({ id: 'phase-41' }), { id: 'phase-41', text: 'That phase closed · choices cleared', icon: 'info' });
  assert.deepEqual(phaseClosedToast({ id: 41 }), { id: '41', text: 'That phase closed · choices cleared', icon: 'info' });
  for (const input of [undefined, {}, { id: null }, { id: '' }]) assert.throws(() => phaseClosedToast(input), TypeError, JSON.stringify(input));
  // The shell takes it as it is, and shows it once per id.
  const next = nextPhoneShellInput(PHONE_SHELL_DEFAULTS, { viewer: 4, toast: phaseClosedToast({ id: 'phase-41' }) });
  assert.deepEqual(next.toast, { id: 'phase-41', text: 'That phase closed · choices cleared', icon: 'info' });
});

test('the agreement compares the pack\'s own inputs: each is the pack\'s source, and each row of the table has its case', () => {
  assert.equal(PHASE_CASES.length, 15);
  assert.equal(new Set(PHASE_CASES.map(c => c.id)).size, PHASE_CASES.length, 'each id once');
  for (const c of PHASE_CASES) {
    const source = PACK[c.source];
    assert.ok(source, `${c.id}: ${c.source}`);
    if (c.literal) assert.ok(source.includes(`topBar(${literal(c.pack)})`), `${c.id}: sheet ${c.sheet} writes topBar(${literal(c.pack)})`);
    else for (const key of ['icon', 'title', 'sub']) if (c.pack[key]) assert.ok(source.includes(`'${c.pack[key]}'`), `${c.id}: sheet ${c.sheet} writes '${c.pack[key]}'`);
    // The bar drawn beside it says the same words, with the same icon, tone, round and time.
    const bar = checkBar(c.bar());
    assert.deepEqual({ kind: bar.kind, icon: bar.icon, title: bar.title, sub: bar.sub, tone: bar.tone, round: bar.round, seconds: bar.timer ? bar.timer.remainingMs / 1000 : null },
      { kind: 'phase', icon: c.pack.icon, title: c.pack.title, sub: c.pack.sub ?? null, tone: c.pack.tone ?? null, round: c.pack.round ?? null, seconds: c.pack.seconds }, c.id);
    // Amber as the pack's own default draws it at that time, a ring where the pack draws one, and Promises and ⋮ by the pack's rule.
    const packAmber = c.pack.seconds !== null && c.pack.seconds <= (c.pack.urgentAt ?? 10);
    assert.equal(bar.timer ? bar.timer.remainingMs <= bar.timer.urgentAtMs : false, packAmber, `${c.id}: amber`);
    assert.equal(bar.timer?.ring ?? null, c.pack.ring === undefined ? null : bar.timer.ring, `${c.id}: a ring only where the pack draws one`);
    if (c.pack.ring !== undefined) assert.ok(Math.abs(bar.timer.ring - c.pack.ring) < 0.005, `${c.id}: the ring's share`);
    const inMatch = c.pack.round !== undefined && c.pack.round !== null;
    assert.equal(bar.promises !== null, inMatch && c.pack.ring === undefined, `${c.id}: Promises`);
    assert.equal(bar.menu !== null, inMatch, `${c.id}: ⋮`);
  }
  // Every specimen of sheet 07 that is a phase bar of this file is compared, but for the one the Lead set aside.
  const specimens = [...PACK['screens-game.mjs'].matchAll(/\['([^']+)', topBar\((\{ kind: 'phase'[^}]*\})\)\]/g)].map(m => ({ label: m[1], input: m[2] }));
  assert.deepEqual(specimens.map(s => s.label), ['Before turns (no active player)', 'Captain election', 'Officer appointment', 'Jail vote', 'Vote result (5 s)', 'Blackout, lit', 'Blackout, dark',
    'Ship synchronized (6 s)', 'Navigation', 'Reconnecting'], 'sheet 07\'s phase specimens');
  const votes = ['Captain election', 'Jail vote', 'Vote result (5 s)'];   // #267's ballotBar() and resultBar()
  const compared = PHASE_CASES.filter(c => c.literal && c.source === 'screens-game.mjs').map(c => literal(c.pack));
  for (const s of specimens.filter(s => !votes.includes(s.label))) {
    if (s.label === 'Navigation') assert.deepEqual(NOT_REPRODUCED.map(n => literal(n.pack)), [s.input], 'the one specimen not reproduced, named');
    else assert.ok(compared.includes(s.input), `sheet 07's ${s.label} is compared`);
  }
  // Sheet 41, the navigation screen's own sheet, draws that line under "The ship moved", and its own under "Setting course".
  const not = NOT_REPRODUCED[0].pack;
  assert.notEqual(phaseBar({ phase: 'NAV_SETTING' }).sub, not.sub);
  assert.ok(PACK['screens-more.mjs'].includes("title: state === 'moved' ? 'The ship moved' : 'Setting course', sub: state === 'moved' ? 'Round 3 complete' : 'The offices are setting it'"), 'sheet 41');
  // The agreement and the preview draw these cases and these functions, and no words of their own for a phase.
  const agree = read(`${COMPONENT}/preview/agree.mjs`), preview = read(`${COMPONENT}/preview/preview.mjs`);
  assert.match(agree, /\.\.\.PHASE_CASES\.flatMap\(/);
  assert.doesNotMatch(agree, /sub: 'Lights out'/, 'the dark case is the pack\'s specimen now');
  for (const words of ['Lights out', 'Reconnecting…', 'Setting course', 'Before turns', 'New Officer', 'Ship synchronized']) assert.ok(!preview.includes(`title: '${words}'`) && !preview.includes(`sub: '${words}'`), `the preview holds no copy of "${words}"`);
});
