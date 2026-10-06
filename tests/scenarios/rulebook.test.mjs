// The rulebook is the single authored copy of the rules. These checks keep it honest: every
// citation resolves in a pinned source, every open question is registered, and every number in
// the documents is recomputed.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import {
  damageBudget, durationBound, factionCounts, jailThreshold, parseDecisionRegister, parseRulebook, resolvePointer, scanInformationBound, wilson,
} from '@mothership/balance';
import { V1_OVERLAY_PATH, loadGroup } from './v1/files.mjs';

const root = new URL('../../', import.meta.url);
const text = path => readFileSync(new URL(path, root), 'utf8');
const SOURCES = {
  baseline: 'rules/sources/v2.1-decisions.json',
  consolidated: 'rules/overlays/consolidated-decisions-2026-09-26.json',
  direct_shot: 'rules/overlays/direct-shot-decision.json',
  showdown: 'rules/overlays/final-showdown-decision.json',
  board: 'rules/overlays/location-board-layout-v1.json',
  movement: 'rules/overlays/movement-decision.json',
  modes: 'rules/overlays/player-modes-officer.json',
};
const documents = Object.fromEntries(Object.entries(SOURCES).map(([key, path]) => [key, JSON.parse(text(path))]));
const rulebook = parseRulebook(text('docs/balance/game-rules.md'));
const audit = text('docs/balance/rules-audit-v1.md');
const register = parseDecisionRegister(audit);
const rules = new Map(rulebook.entries.map(entry => [entry.id, entry]));
const decisions = new Map(register.entries.map(entry => [entry.id, entry]));
const V1_IDS = Array.from({ length: 21 }, (_, index) => `V1-${String(index + 1).padStart(2, '0')}`);

test('the rulebook parses cleanly and covers every section', () => {
  assert.deepEqual(rulebook.issues, []);
  assert.ok(rulebook.entries.length >= 120, `only ${rulebook.entries.length} rules found`);
  const prefixes = new Set(rulebook.entries.map(entry => entry.id.split('-')[1]));
  for (const prefix of ['SETUP', 'FLOW', 'STATE', 'MOVE', 'CAPT', 'ACT', 'ROLE', 'SHOT', 'PROT', 'HACK', 'VOTE', 'RES', 'WIN', 'SHOW', 'VIEW', 'OPS', 'POW']) {
    assert.ok(prefixes.has(prefix), `no ${prefix} rules`);
  }
});

test('every source pointer resolves in the pinned rule sources', () => {
  for (const entry of rulebook.entries) {
    for (const ref of entry.refs.filter(item => item.kind === 'pointer')) {
      assert.ok(ref.key in documents, `${entry.id}: unknown source key ${ref.key}`);
      assert.ok(resolvePointer(documents[ref.key], ref.pointer).found, `${entry.id}: ${ref.raw} does not resolve`);
    }
  }
});

test('owner-decision citations name real decisions, and resolve when the overlay is present', t => {
  const cited = rulebook.entries.flatMap(entry => entry.refs.filter(ref => ref.kind === 'v1').map(ref => ref.pointer));
  for (const id of cited) assert.ok(V1_IDS.includes(id), `unknown owner decision ${id}`);
  for (const id of V1_IDS) assert.ok(cited.includes(id), `owner decision ${id} is carried by no rule`);
  if (!existsSync(new URL(V1_OVERLAY_PATH, root))) {
    t.diagnostic('The owner-decision overlay is absent at this commit; decision text was not compared here.');
    return;
  }
  const overlay = JSON.parse(text(V1_OVERLAY_PATH));
  for (const id of cited) assert.ok(overlay.decisions.some(decision => decision.id === id), `${id} is missing from the overlay`);
});

test('the decision register is complete and consistent with rule statuses', () => {
  assert.deepEqual(register.issues, []);
  assert.deepEqual(register.entries.map(entry => entry.id), Array.from({ length: 29 }, (_, index) => `D${String(index + 1).padStart(2, '0')}`));
  for (const entry of rulebook.entries) {
    for (const ref of entry.refs.filter(item => item.kind === 'decision')) {
      const decision = decisions.get(ref.key);
      assert.ok(decision, `${entry.id}: unknown decision ${ref.key}`);
      assert.equal(decision.status, entry.status === 'OPEN' ? 'OPEN' : 'CONFIRM', `${entry.id} (${entry.status}) cites ${ref.key} (${decision.status})`);
    }
  }
  const citedBy = id => rulebook.entries.filter(entry => entry.refs.some(ref => ref.kind === 'decision' && ref.key === id));
  for (const decision of register.entries) {
    if (decision.status === 'RESOLVED') assert.equal(citedBy(decision.id).length, 0, `${decision.id} is resolved but still cited as undecided`);
    else assert.ok(citedBy(decision.id).length > 0, `${decision.id} (${decision.status}) is cited by no rule`);
    // The register names the rules that carry each decision; they must exist.
    for (const id of decision.resolution.match(/R-[A-Z]+-\d{2}/g) ?? []) assert.ok(rules.has(id), `${decision.id}: names unknown rule ${id}`);
  }
});

test('the audit maps every owner decision to exactly the rules that cite it', () => {
  const rows = new Map();
  for (const line of audit.split('\n')) {
    const match = /^\|\s*(V1-\d{2})\s*\|\s*(.+?)\s*\|$/.exec(line);
    if (match !== null) rows.set(match[1], match[2].split(',').map(item => item.trim()));
  }
  assert.deepEqual([...rows.keys()], V1_IDS);
  for (const [id, listed] of rows) {
    const citing = rulebook.entries.filter(entry => entry.refs.some(ref => ref.kind === 'v1' && ref.pointer === id)).map(entry => entry.id);
    assert.deepEqual([...listed].sort(), [...citing].sort(), `${id}: audit lists ${listed.join(', ')}; rulebook cites it from ${citing.join(', ')}`);
  }
});

test('rules mentioned inside rule text and in the archived table exist', () => {
  const body = text('docs/balance/game-rules.md');
  for (const id of body.match(/R-[A-Z]+-\d{2}/g) ?? []) assert.ok(rules.has(id), `the rulebook mentions unknown rule ${id}`);
  for (const id of audit.match(/R-[A-Z]+-\d{2}/g) ?? []) assert.ok(rules.has(id), `the audit mentions unknown rule ${id}`);
});

test('every rule, decision, invariant and scenario named in a balance document exists', () => {
  const paths = [
    'docs/balance/README.md', 'docs/balance/game-rules.md', 'docs/balance/rules-audit-v1.md', 'docs/balance/invariants.md',
    'docs/balance/contract-review.md', 'docs/balance/integration-requests.md', 'docs/balance/telemetry-spec.md',
    'docs/balance/scenario-traceability.md', 'docs/balance/playtest/protocol.md',
    'docs/balance/playtest/analysis-plan.md', 'docs/balance/playtest/rule-problem-log.md', 'docs/balance/playtest/facilitator-session-form.md',
    'docs/balance/playtest/participant-questionnaire.md', 'tests/scenarios/README.md',
  ];
  const source = text('tools/balance/src/invariants.ts') + text('tools/balance/src/runner.ts');
  const implemented = new Set(source.match(/INV-[A-Z]+-\d{2}/g));
  const scenarioCodes = new Set(['7', '8', '9', 'unsupported'].flatMap(group => loadGroup(group).scenarios.map(scenario => scenario.id.replace(/^V1-(M\d|UX)-/, ''))));
  const areas = [...new Set([...scenarioCodes].map(code => code.split('-')[0]))].join('|');
  for (const path of paths) {
    const body = text(path);
    for (const id of body.match(/R-[A-Z]+-\d{2}/g) ?? []) assert.ok(rules.has(id), `${path} names unknown rule ${id}`);
    for (const id of body.match(/\bD\d{2}\b/g) ?? []) assert.ok(decisions.has(id), `${path} names unknown decision ${id}`);
    for (const id of body.match(/INV-[A-Z]+-\d{2}/g) ?? []) assert.ok(implemented.has(id), `${path} names an invariant that is not implemented: ${id}`);
    for (const code of body.match(new RegExp(`(?<![A-Z-])(?:${areas})-\\d{2}[a-z]?(?![\\d-])`, 'g')) ?? []) assert.ok(scenarioCodes.has(code), `${path} names unknown scenario ${code}`);
  }
  // The catalogue of invariants documents exactly what the code checks.
  const documented = new Set(text('docs/balance/invariants.md').match(/INV-[A-Z]+-\d{2}/g));
  assert.deepEqual([...documented].sort(), [...implemented].sort());
});

test('the interval table in the analysis plan equals the computed Wilson intervals', () => {
  const plan = text('docs/balance/playtest/analysis-plan.md');
  for (const n of [6, 8, 10, 20, 30, 50, 100]) {
    const interval = wilson(n / 2, n);
    const row = `| ${n} | ${n / 2} of ${n} | ${Math.round(interval.low * 100)}% to ${Math.round(interval.high * 100)}% |`;
    assert.ok(plan.includes(row), `analysis plan lacks the row ${row}`);
  }
});

function tableRow(markdown, label) {
  const line = markdown.split('\n').find(candidate => candidate.startsWith(`| ${label} |`));
  assert.ok(line, `row "${label}" not found`);
  return line.split('|').slice(2, 5).map(cell => cell.trim());
}

test('the mode sheets restate the sources and the arithmetic that follows from them', () => {
  const sheet = text('docs/balance/game-rules.md');
  const modes = [7, 8, 9];
  assert.deepEqual(tableRow(sheet, 'Blue, Red, Alien'), modes.map(mode => { const c = factionCounts(mode); return `${c.Blue}, ${c.Red}, ${c.Alien}`; }));
  assert.deepEqual(tableRow(sheet, 'Starting Blue Power and Red Power'), modes.map(mode => { const c = factionCounts(mode); return `${c.Blue + 1} and ${c.Red}`; }));
  assert.deepEqual(tableRow(sheet, 'Votes needed to jail with everyone voting'), modes.map(mode => `${jailThreshold(mode)} of ${mode}`));
  assert.deepEqual(tableRow(sheet, 'Attacks available before the showdown'), modes.map(mode => String(damageBudget(mode).attacksBeforeShowdown)));
  assert.deepEqual(tableRow(sheet, 'Players Hacker cannot rule out of the Code at the start'), modes.map(mode => String(mode - 1)));
  for (const mode of modes) {
    const listed = documents.modes.modes[String(mode)];
    const counts = factionCounts(mode);
    assert.deepEqual([listed.blue, listed.red, listed.alien], [counts.Blue, counts.Red, counts.Alien], `mode ${mode} counts differ from the overlay`);
  }
  const thresholds = Array.from({ length: 9 }, (_, index) => jailThreshold(index + 1));
  assert.deepEqual(thresholds, [1, 1, 2, 2, 3, 3, 4, 4, 5]);
  assert.match(sheet, /1 of 1 or 2, 2 of 3 or 4, 3 of 5 or 6, 4 of 7 or 8, 5 of 9/);
});

test('the structural tables in the audit equal the computed values', () => {
  const modes = [7, 8, 9];
  const budgets = modes.map(damageBudget);
  assert.deepEqual(tableRow(audit, 'Attacks before the showdown'), budgets.map(item => String(item.attacksBeforeShowdown)));
  assert.deepEqual(tableRow(audit, 'Most eliminations possible before the showdown'), budgets.map(item => String(item.maxEliminationsBeforeShowdown)));
  assert.deepEqual(tableRow(audit, 'Attacks Red needs to eliminate every Blue player'), modes.map(mode => String(factionCounts(mode).Blue * 2)));
  assert.deepEqual(tableRow(audit, 'Attacks needed to eliminate every Red player'), modes.map(mode => String(factionCounts(mode).Red * 2)));
  assert.deepEqual(tableRow(audit, 'Damage needed to eliminate every player except Alien'), budgets.map(item => String(item.hitPointsOfNonAlienPlayers)));
  assert.deepEqual(tableRow(audit, 'Most damage a whole match can deal, showdown included'), budgets.map(item => String(item.maxTotalDamageIncludingShowdown)));
  // S-03 and S-05 as stated in the audit.
  assert.deepEqual(budgets.map(item => item.alienSoloReachable), [false, false, false]);
  assert.deepEqual(budgets.map(item => item.redEliminationWinBeforeShowdown), ['impossible', 'impossible', 'impossible']);
  assert.deepEqual(budgets.map(item => item.blueEliminationWinBeforeShowdown), ['needs-red-held-attacks', 'impossible', 'needs-red-held-attacks']);
  for (let scans = 0; scans <= 5; scans += 1) {
    const expected = modes.map(mode => {
      const row = scanInformationBound(mode)[scans];
      const percent = row.probability === 1 ? '100%' : `${(row.probability * 100).toFixed(1)}%`;
      return `${row.correctStates} in ${row.hiddenStates} (${percent})`;
    });
    assert.deepEqual(tableRow(audit, String(scans)), expected, `Scan table row ${scans}`);
  }
  const clocks = modes.map(durationBound);
  assert.deepEqual(tableRow(audit, 'Shortest match with nobody eliminated and one election'), clocks.map(item => `${item.minimumSeconds / 60} min`));
  assert.deepEqual(tableRow(audit, 'With a Hack per player, an election before each of Rounds 2 to 5, four release choices, one release vote and a showdown'), clocks.map(item => `${item.typicalUpperSeconds / 60} min`));
});
