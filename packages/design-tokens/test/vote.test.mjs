// The ballot and its result window (design/phone-ui/components/vote): a runtime source the game imports as
// it is, so its module graph, its styles' scope, its inputs, its privacy rules, its cells and its words are
// checked here; its drawing, lifecycle and agreement with the pinned pack in a browser under the production
// headers by design/tools/vote-check.mjs, whose record is checked last.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BALLOT_DEFAULTS, RESULT_DEFAULTS, VOTE_VERSION, VOTE_WORDS,
  ballotBar, ballotCells, ballotSheet, checkBallot, checkResult, nextBallotInput, nextResultInput, resultBar, resultWords,
} from '../../../design/phone-ui/components/vote/vote.mjs';
import { VOTE_STATES } from '../../../design/phone-ui/components/vote/preview/states.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/vote';
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

const ballot = key => VOTE_STATES[key].ballot;
const result = key => VOTE_STATES[key].result;
const letters = cells => cells.map(c => ({ available: 'a', selected: 's', confirmed: 'c', faded: 'f', ineligible: 'i', empty: 'e' })[c.state]).join('');

test('the component is a runtime source: its whole graph is runtime-safe and in the hosted graph', () => {
  const files = new Map([...graph(join(REPO, COMPONENT, 'vote.mjs')), ...graph(join(REPO, COMPONENT, 'vote.css'))]);
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the kit\'s crew-runtime.mjs)');
  for (const path of [`${COMPONENT}/vote.mjs`, `${COMPONENT}/vote.css`, 'design/phone-ui/components/kit/kit.mjs', 'design/phone-ui/components/kit/kit.css',
    'design/phone-ui/components/icons.mjs', 'apps/game/hosted/crew-runtime.mjs', 'apps/game/hosted/scene-drawing/phone-kit-art.mjs']) {
    assert.ok(local.includes(path), `${path} is in the graph`);
  }
  assert.ok(!local.some(p => /\/(?:room-scene|phone-shell)\//.test(p)), 'it depends on neither the room scene nor the shell: Frontend mounts it in the shell\'s sheet body or stage');
  // The preview and its probes are development-only, and say so.
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs', 'preview/states.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/vote-check.mjs'), /^\/\/ mothership:dev-only/);
  assert.equal(VOTE_VERSION, 'vote-0.1.0');
});

test('its styles reach nothing outside the component: every rule is under its own root, and kit controls only inside its parts', () => {
  const css = read(`${COMPONENT}/vote.css`).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /^\s*@import url\("\.\.\/kit\/kit\.css"\);/, 'it starts from the kit');
  assert.deepEqual([...css.matchAll(/@keyframes\s+([\w-]+)/g)], [], 'no motion of its own: the window\'s arrival is Motion\'s');
  const selectors = [...css.matchAll(/(^|[{}])([^{}]*?)\{/g)].map(m => m[2].trim()).filter(s => s && !s.startsWith('@'));
  assert.ok(selectors.length > 20, `found the rules (${selectors.length})`);
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
      assert.match(selector, /^(?:\.ms-vote-(?:ballot|result)|:where\(\.ms-vote-ballot\))(?:[\s.:\[]|$)/, `"${selector}" is under the component's root`);
      assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
      // Every compound after the root names one of the component's classes or a kit class: no bare element.
      for (const part of selector.split(/\s+|>|\+|~/).slice(1).filter(Boolean)) {
        assert.match(part, /^(?::is\()?\.ms-(?:ballot|result|vote|k)-/, `"${selector}": "${part}" is a class, not a bare element`);
      }
      // The kit's controls are placed and sized only inside the component's own parts.
      if (/\.ms-k-/.test(selector)) assert.match(selector, /\.ms-(?:ballot|result|vote)-[\w-]+[^,]*\.ms-k-/, `"${selector}": a kit control styled only inside the component's own parts`);
    }
  }
  // Custom properties are the component's own; never a kit token.
  const declared = [...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))];
  assert.deepEqual(declared.filter(p => !p.startsWith('--ms-vote-')), []);
  // And no colour, type or state of the kit's is restyled: kit selectors only set layout and size.
  for (const [, selector, body] of css.matchAll(/([^{}]*\.ms-k-[^{}]*)\{([^}]*)\}/g)) {
    for (const [, property] of body.matchAll(/([\w-]+)\s*:/g)) {
      assert.ok(['padding-top', 'gap', 'margin', 'width', 'height', 'flex', 'display'].includes(property), `"${selector.trim()}" sets only layout, not ${property}`);
    }
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

test('its words are the pack\'s (screens-vote.mjs), and the owner\'s T3 words where the pack has none', () => {
  const pack = read('design/phone-ui/prototype/screens-vote.mjs');
  for (const words of [VOTE_WORDS.title.jail, VOTE_WORDS.title.captain, VOTE_WORDS.title.runoff, VOTE_WORDS.private, VOTE_WORDS.candidates.jail, VOTE_WORDS.candidates.captain,
    VOTE_WORDS.selected, VOTE_WORDS.yourVote, VOTE_WORDS.notInRunoff, VOTE_WORDS.abstained, VOTE_WORDS.closed, VOTE_WORDS.watch, VOTE_WORDS.abstain,
    VOTE_WORDS.registered, VOTE_WORDS.abstainedFoot, VOTE_WORDS.votingClosed, VOTE_WORDS.cannotFoot, VOTE_WORDS.result.jail, VOTE_WORDS.result.captain,
    VOTE_WORDS.result.short, VOTE_WORDS.ballotsPrivate, VOTE_WORDS.resultRoster]) {
    assert.ok(pack.includes(words), `"${words}" is the pack's`);
  }
  // The window's name, which the pack writes as a template: "Jail vote result", "Captain election result".
  assert.ok(pack.includes("${kind === 'captain' ? 'Captain election' : 'Jail vote'} result`"));
  assert.deepEqual(VOTE_WORDS.resultName, { jail: 'Jail vote result', captain: 'Captain election result' });
  assert.ok(pack.includes('Vote for ${'), 'the pack\'s "Vote for Ava"');
  assert.match(read('AGENTS.md'), /\*\*Not available now\*\*/, 'T3: "Not available now" where the projection gives no reason');
  assert.equal(VOTE_WORDS.notAvailable, 'Not available now');
  assert.ok(read('design/phone-ui/prototype/screens-game.mjs').includes(VOTE_WORDS.stale), 'sheet 45: "Controls return when the match is current"');
  // Each outcome's stamp, headline and line, as the pack's results (sheet 37 and 38) write them.
  const want = {
    'result-elected': ['CAPTAIN', 'Ben is Captain', '8 votes · 8 could vote'], 'result-runoff': ['RUNOFF', 'Tie · runoff', '8 votes · 8 could vote'],
    'result-no-captain': ['NO CAPTAIN', 'No Captain', '0 votes · 8 could vote'], 'result-jailed': ['JAILED', 'Gus goes to Jail', '7 votes · 4 needed of 8'],
    'result-jail-full': ['NO ROOM', 'Gus chosen · Jail full', 'Chosen, but every Jail place is taken. Gus stays.'],
    'result-no-one': ['NO ONE', 'No one goes to Jail', 'No one reached 4 votes.'],
  };
  for (const [key, [stamp, title, line]] of Object.entries(want)) {
    const w = resultWords(result(key));
    assert.equal(w.stamp.toUpperCase(), stamp, `${key}: the stamp`);
    assert.equal(w.title, title, `${key}: the headline`);
    assert.equal(w.line, line, `${key}: its line`);
    assert.ok(pack.includes(`'${stamp}'`) && pack.includes(`'${title}'`), `${key}: the pack's own words`);
  }
  assert.equal(resultWords(result('result-jailed')).announce, 'Gus goes to Jail. 7 votes, 4 needed of 8.');
});

test('it claims nothing the tally does not hold: no threshold without one, no "no one reached" at a tie, 1 vote', () => {
  assert.equal(resultWords({ ...result('result-jailed'), needed: null }).line, '7 votes · 8 could vote');
  assert.equal(resultWords({ ...result('result-no-one'), needed: null }).line, 'No one was chosen.');
  const tie = { ...result('result-no-one'), tally: { ...result('result-no-one').tally, counts: { 'seat-1': 4, 'seat-7': 4 } } };
  assert.equal(resultWords(tie).line, 'No one was chosen.');
  const one = { ...result('result-elected'), tally: { ...result('result-elected').tally, counts: { 'seat-2': 1 }, eligibleVoterCount: 1 } };
  assert.equal(resultWords(one).line, '1 vote · 1 could vote');
  assert.deepEqual(resultBar(result('result-jailed')), { kind: 'phase', icon: 'jail', title: 'Jail vote · result', short: 'Vote result' });
  assert.deepEqual(resultBar(result('result-elected')), { kind: 'phase', icon: 'captain', title: 'Election · result', short: 'Vote result' });
});

test('each seat\'s cell follows the inputs alone: candidates from the public ballot, the pick and the ballot from Frontend', () => {
  assert.equal(letters(ballotCells(ballot('jail-open'))), 'aaaaaiaai');
  assert.equal(letters(ballotCells(ballot('jail-selected'))), 'saaaaiaai');
  assert.equal(letters(ballotCells(ballot('jail-submitted'))), 'cffffiffi');
  assert.equal(letters(ballotCells(ballot('jail-abstained'))), 'fffffiffi');
  assert.equal(letters(ballotCells(ballot('jail-closed'))), 'fffffiffi');
  assert.equal(letters(ballotCells(ballot('captain-open'))), 'aaaaiiaai');
  assert.equal(letters(ballotCells(ballot('captain-runoff'))), 'aaiiiiiii');
  assert.equal(letters(ballotCells(ballot('captain-8-selected'))), 'saaaiiaae');
  assert.equal(letters(ballotCells(ballot('jail-7'))), 'aaaaaiaee');
  assert.equal(letters(ballotCells(ballot('jail-cannot'))), 'fffffiffi');
  // A note that can't be chosen: the projection's reason, the runoff's words, the public status, then T3's words.
  const notes = cells => cells.map(c => c.note);
  assert.deepEqual(notes(ballotCells(ballot('captain-open'))), [null, null, null, null, 'Injured', 'In Jail', null, null, 'Out']);
  assert.deepEqual(notes(ballotCells(ballot('captain-runoff'))).slice(2), Array(7).fill('Not in runoff'));
  const withReason = { ...ballot('jail-open'), roster: ballot('jail-open').roster.map(p => (p.seat === 6 ? { ...p, reason: 'Already in Jail' } : p.seat === 9 ? { ...p, note: null } : p)) };
  assert.deepEqual(notes(ballotCells(withReason)).filter(Boolean), ['Already in Jail', 'Not available now']);
  assert.deepEqual(ballotCells(ballot('jail-selected'))[0], { seat: 1, state: 'selected', note: 'Selected', mark: 'check', off: false });
  assert.deepEqual(ballotCells(ballot('jail-submitted'))[0], { seat: 1, state: 'confirmed', note: 'Your vote', mark: 'check', off: true });
  assert.ok(ballotCells(ballot('jail-submitted')).every(c => c.off), 'a ballot sent: nothing more to choose');
});

test('the sheet\'s words and footer follow the ballot: Abstain and "Vote for Ava", or what is done', () => {
  const foot = key => ballotSheet(ballot(key)).actions.map(a => `${a.id}:${a.label}${a.enabled === false ? ':off' : ''}`).join(' | ');
  assert.equal(foot('jail-open'), 'abstain:Abstain | vote:Vote:off');
  assert.equal(foot('jail-selected'), 'abstain:Abstain | vote:Vote for Ava');
  assert.equal(foot('jail-submitted'), 'registered:Ballot registered:off');
  assert.equal(foot('jail-abstained'), 'abstained:Abstained:off');
  assert.equal(foot('jail-closed'), 'closed:Voting closed:off');
  assert.equal(foot('jail-cannot'), 'cannot:You can’t vote:off');
  assert.equal(ballotSheet(ballot('jail-open')).actions[1].reason, 'Choose a player first');
  const busy = ballotSheet({ ...ballot('jail-selected'), busy: 'vote' }).actions;
  assert.deepEqual(busy.map(a => [a.enabled, a.busy]), [[false, false], [false, true]], 'one request at a time');
  assert.deepEqual(ballotSheet(ballot('captain-8-selected')), { id: 'ballot', title: 'Captain election', sub: '8 players', back: false, close: true, detent: 'large',
    actions: ballotSheet(ballot('captain-8-selected')).actions });
  assert.equal(ballotSheet(ballot('captain-runoff')).title, 'Captain runoff');
  assert.deepEqual(ballotBar(ballot('captain-runoff')), { kind: 'phase', icon: 'captain', title: 'Captain runoff', sub: 'Ava and Ben tied' });
  assert.deepEqual(ballotBar(ballot('jail-open')), { kind: 'phase', icon: 'vote', title: 'Jail vote', sub: 'Your ballot is private' });
});

test('inputs are checked, and refused with a reason', () => {
  const refusesBallot = (input, pattern) => assert.throws(() => checkBallot({ ...ballot('jail-open'), ...input }), pattern);
  refusesBallot({ status: 'offline' }, /Status is live, stale, concealed/);
  refusesBallot({ kind: 'release' }, /kind is jail or captain/);
  refusesBallot({ roster: null }, /lists the match's seats/);
  refusesBallot({ roster: [{ seat: 1, name: 'Ava' }, { seat: 'seat-1', name: 'Ava' }] }, /seat 1 twice/);
  refusesBallot({ roster: [{ seat: 10, name: 'X' }] }, /seat is 1–9/);
  refusesBallot({ roster: [{ seat: 1 }] }, /is \{ seat, name, character/);
  refusesBallot({ runoff: { tied: [1, 2] } }, /Only a Captain election has a runoff/);
  refusesBallot({ kind: 'captain', runoff: { tied: [1] } }, /two or more seats/);
  refusesBallot({ mode: 'paused' }, /mode is open, closed, cannot/);
  refusesBallot({ selected: 6 }, /selected is a candidate's seat/);
  refusesBallot({ own: { seat: 12 } }, /own is \{ seat \}/);
  refusesBallot({ busy: 'pass' }, /busy is/);
  refusesBallot({ reason: 3 }, /reason is text/);
  const refusesResult = (input, pattern) => assert.throws(() => checkResult({ ...result('result-jailed'), ...input }), pattern);
  const tally = result('result-jailed').tally;
  refusesResult({ tally: null }, /tally is the projection's lastTally/);
  refusesResult({ tally: { ...tally, kind: 'RELEASE_VOTE' } }, /A tally's kind is JAIL_VOTE or CAPTAIN_ELECTION/);
  refusesResult({ tally: { ...tally, outcome: 'CAPTAIN_ELECTED' } }, /is not an outcome of a JAIL_VOTE/);
  refusesResult({ tally: { ...tally, counts: { 'seat-10': 1 } } }, /not in the roster/);
  refusesResult({ tally: { ...tally, counts: { 'seat-1': -1 } } }, /whole number of votes/);
  refusesResult({ tally: { ...tally, selectedSeatId: null } }, /names the chosen seat/);
  refusesResult({ needed: 0 }, /needed is a whole number/);
  refusesResult({ round: 2.5 }, /round is a whole number/);
  // The checked forms are stable: checking them again changes nothing.
  const once = checkBallot(ballot('jail-submitted'));
  assert.deepEqual(checkBallot(once), once);
  assert.deepEqual(nextBallotInput(once, {}), once);
  const r = checkResult(result('result-runoff'));
  assert.deepEqual([...nextResultInput(r, {}).result.counts], [...r.result.counts]);
  // Defaults: live, interactive, no choice until one is given.
  assert.equal(BALLOT_DEFAULTS.mode, 'closed');
  assert.equal(RESULT_DEFAULTS.needed, null);
  // The tally is taken as the projection gives it, 'seat-n' ids and all.
  assert.equal(r.result.selected, null);
  assert.deepEqual(r.result.tied, [1, 2]);
});

test('this viewer\'s inputs are dropped while concealed, and when the viewer changes unless the update gives the new viewer\'s; the result holds no ballot', () => {
  const shown = nextBallotInput(BALLOT_DEFAULTS, ballot('jail-selected'));
  assert.equal(shown.selected, 1);
  const hidden = nextBallotInput(shown, { status: 'concealed' });
  assert.deepEqual([hidden.selected, hidden.own, hidden.mode, hidden.busy, hidden.reason], [null, null, 'closed', null, null], 'dropped while concealed');
  assert.deepEqual(ballotSheet(hidden).actions, [], 'concealed, no footer');
  // Shown again, nothing of this viewer's comes back by itself; given while concealed, nothing is kept.
  assert.equal(nextBallotInput(hidden, { status: 'live' }).selected, null);
  assert.equal(nextBallotInput(hidden, { selected: 1, mode: 'open' }).selected, null);
  // A new viewer.
  const other = nextBallotInput(shown, { viewer: 7 });
  assert.deepEqual([other.selected, other.mode], [null, 'closed']);
  const given = nextBallotInput(shown, { viewer: 7, mode: 'open', own: { seat: 2 } });
  assert.deepEqual([given.selected, given.mode, given.own.seat], [null, 'open', 2]);
  // The same viewer again drops nothing.
  assert.equal(nextBallotInput(shown, { viewer: 4 }).selected, 1);
  // The result's input has nothing per voter: a tally of totals only.
  const r = checkResult(result('result-jailed'));
  assert.deepEqual(Object.keys(r.result).sort(), ['counts', 'kind', 'outcome', 'selected', 'tied', 'voters']);
  assert.ok([...r.result.counts.values()].every(n => Number.isInteger(n)), 'counts are totals');
});

/**
 * Waiting on the shared kit (the Lead's, design/phone-ui/components/kit/): the cells on the result's paper
 * card (the pack's screens.css .result-body .cell: 74 px portraits, its padding and colours, and "You" in
 * the top-right beside the count). Until it lands, the agreement's result frames at 390 × 844 differ in
 * those boxes only, never in a word, a state or a count; this list says so and must shrink, not grow.
 */
const AWAITING_KIT = new Set(['result-elected', 'result-runoff', 'result-no-captain', 'result-jailed', 'result-jail-full', 'result-no-one', 'result-jailed-8']);

test('the check\'s record: every capture and probe check passed under the production headers, and the agreement differs only where the kit is awaited', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/vote-check.mjs');
  assert.ok(record.sourceClean, 'recorded against a clean source');
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /img-src 'self' data:/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 46, 'twenty states at two sizes, and sheet 56\'s six at 320 × 568 with the Largest text');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn, `${key} passed and drew what its state asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
  }
  for (const size of ['390x844', '430x932']) {
    for (const state of ['jail-concealed', 'result-concealed']) {
      const c = record.captures[`${size}/${state}`];
      assert.deepEqual([c.cells.length, c.window, c.sheet, c.names], [0, false, null, 0], `${size} ${state}: nothing drawn`);
    }
    assert.ok(record.captures[`${size}/jail-stale`].refused, `${size}: reconnecting, every cell refused`);
  }
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const groups = record.probe.full.checks.map(c => c.id);
  for (const group of ['select', 'refused', 'stale', 'focus', 'private', 'result', 'words', 'compact', 'dispose', 'motion']) assert.ok(groups.includes(group), `probe ${group}`);
  // The agreement with the pinned pack: 23 frames, every word, state and count the same.
  const agree = record.agree;
  assert.deepEqual(agree.problems, [], 'agreement: no page problem');
  assert.equal(agree.checks.length, 23);
  for (const c of agree.checks) {
    const state = c.id.match(/^agree: ([\w-]+)/)[1];
    const words = c.detail.differences.filter(d => d.what !== 'box');
    assert.deepEqual(words, [], `${state}: the same words, states and counts as the pack`);
    if (AWAITING_KIT.has(state)) {
      assert.ok(c.detail.differences.every(d => /^(?:body|seat \d( (?:count|you|mark))?)$/.test(d.part)), `${state}: only the cells' boxes differ, awaiting the kit`);
    } else {
      assert.ok(c.ok, `${state}: agrees with the pack to within half a pixel`);
    }
  }
});
