// Static integrity of the scenario fixtures. These checks need no engine. They do not show
// that any engine is correct; they show that the fixtures are well formed, traceable to rules,
// kept apart by mode, and honest about what is undecided.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { deepEqual, parseDecisionRegister, parseRulebook, validateScenario } from '@mothership/balance';
import { buildCatalog, setupFromSeed } from './v1/catalog.mjs';
import { GROUPS, RULEBOOK_VERSION, SCENARIO_SCHEMA, loadGroup, renderFile, scenarioFileUrl } from './v1/files.mjs';

const root = new URL('../../', import.meta.url);
const text = path => readFileSync(new URL(path, root), 'utf8');
const rules = new Map(parseRulebook(text('docs/balance/game-rules.md')).entries.map(entry => [entry.id, entry]));
const decisions = new Map(parseDecisionRegister(text('docs/balance/rules-audit-v1.md')).entries.map(entry => [entry.id, entry]));
const files = Object.fromEntries(GROUPS.map(group => [group, loadGroup(group)]));
const all = GROUPS.flatMap(group => files[group].scenarios);
const byMode = mode => files[String(mode)].scenarios;

test('the committed scenario files are exactly what the catalogue produces', () => {
  const catalog = buildCatalog();
  for (const group of GROUPS) assert.equal(readFileSync(scenarioFileUrl(group), 'utf8'), renderFile(group, catalog[group]), `${group}: run npm run materialize --workspace @mothership/balance`);
});

test('every scenario is well formed and identifiers are unique', () => {
  const issues = all.flatMap(validateScenario);
  assert.deepEqual(issues, []);
  assert.equal(new Set(all.map(scenario => scenario.id)).size, all.length);
});

test('the 7-, 8- and 9-player cases are separate files, each with its own roles and setups', () => {
  for (const mode of [7, 8, 9]) {
    const file = files[String(mode)];
    assert.equal(file.header.schema, SCENARIO_SCHEMA);
    assert.equal(file.header.mode, mode);
    assert.equal(file.header.rulebook, RULEBOOK_VERSION);
    assert.equal(file.header.optionalPowers, false);
    for (const setup of Object.values(file.setups)) assert.equal(setup.playerCount, mode);
    for (const scenario of file.scenarios) {
      assert.equal(scenario.mode, mode);
      assert.ok(scenario.id.startsWith(`V1-M${mode}-`));
      assert.equal(scenario.optionalPowers, false);
    }
    const counts = { total: file.scenarios.length, ready: 0, blocked: 0, manual: 0 };
    for (const scenario of file.scenarios) counts[scenario.status] += 1;
    assert.deepEqual(file.header.counts, counts);
    // Role-specific cases exist only where the role exists.
    assert.equal(file.scenarios.some(scenario => scenario.id.includes('-OFF-')), mode === 9, 'Officer cases belong to mode 9 only');
    const text = JSON.stringify(file.scenarios);
    assert.equal(text.includes('@Officer'), mode === 9);
    assert.equal(text.includes('@Red Disabler'), mode !== 7);
  }
  assert.ok(files.unsupported.scenarios.every(scenario => scenario.mode === null && scenario.steps.length === 1 && scenario.steps[0].op === 'createRejected'));
});

test('every expectation names rules that exist, and ready cases rest only on decided rules', () => {
  for (const scenario of all) {
    for (const id of scenario.ruleRefs) assert.ok(rules.has(id), `${scenario.id}: unknown rule ${id}`);
    for (const id of scenario.dependsOn) assert.ok(rules.has(id) && rules.get(id).status !== 'OPEN', `${scenario.id}: lead-up uses the unknown or undecided rule ${id}`);
    const statuses = scenario.ruleRefs.map(id => rules.get(id).status);
    if (scenario.status === 'blocked') {
      assert.ok(statuses.includes('OPEN'), `${scenario.id}: a blocked case must cite the OPEN rule it waits for`);
      for (const id of scenario.decisionIds) assert.ok(['OPEN', 'DEFERRED'].includes(decisions.get(id)?.status), `${scenario.id}: ${id} is neither an open rule edge nor deferred`);
      const waiting = scenario.ruleRefs.flatMap(id => rules.get(id).refs.filter(ref => ref.kind === 'decision').map(ref => ref.key));
      for (const id of waiting) assert.ok(scenario.decisionIds.includes(id), `${scenario.id}: cites a rule waiting on ${id} without naming it`);
    } else {
      assert.ok(!statuses.includes('OPEN'), `${scenario.id}: a ${scenario.status} case cites an undecided rule`);
    }
  }
});

test('every open decision has a blocked case in each mode, and no blocked case asserts an outcome', () => {
  const withStatus = status => [...decisions.values()].filter(decision => decision.status === status).map(decision => decision.id);
  // The nine open rule edges named by the integration review of 6 October, and the one deferred topic.
  const open = withStatus('OPEN');
  assert.deepEqual(open, ['D11', 'D12', 'D16', 'D17', 'D18', 'D19', 'D20', 'D34', 'D35']);
  assert.deepEqual(withStatus('DEFERRED'), ['D10']);
  for (const mode of [7, 8, 9]) {
    const blocked = byMode(mode).filter(scenario => scenario.status === 'blocked');
    for (const id of [...open, 'D10']) assert.ok(blocked.some(scenario => scenario.decisionIds.includes(id)), `mode ${mode}: no blocked case for ${id}`);
    for (const scenario of blocked) assert.ok(!scenario.steps.some(step => step.op === 'assert'), `${scenario.id} asserts an outcome`);
  }
});

test('each of the 35 specifications of the pinned matrix is carried into every mode it names', () => {
  const matrix = JSON.parse(text('docs/balance/scenario-matrix.json'));
  assert.equal(matrix.scenarios.length, 35);
  for (const specification of matrix.scenarios) {
    for (const mode of specification.modes) {
      const carried = byMode(mode).filter(scenario => scenario.lineage.includes(specification.id));
      assert.ok(carried.length > 0, `${specification.id} has no mode-${mode} scenario`);
      // BAL-110 stays blocked (D10). The other nine blocked specifications are now decided by V1.
      if (specification.id === 'BAL-110') assert.ok(carried.every(scenario => scenario.status === 'blocked'));
      else assert.ok(carried.some(scenario => scenario.status !== 'blocked'), `${specification.id} has only blocked mode-${mode} scenarios`);
    }
  }
});

test('the assignment areas are covered by ready cases in every mode', () => {
  for (const mode of [7, 8, 9]) {
    for (const area of ['resources', 'phase-transitions', 'mode-setup', 'elimination', 'authorized-views']) {
      const ready = byMode(mode).filter(scenario => scenario.status === 'ready' && scenario.areas.includes(area));
      assert.ok(ready.length >= 5, `mode ${mode}: only ${ready.length} ready cases for ${area}`);
    }
  }
});

test('every recorded setup is reproduced by its seed label', () => {
  for (const mode of [7, 8, 9]) {
    for (const [seed, setup] of Object.entries(files[String(mode)].setups)) {
      assert.ok(deepEqual(setupFromSeed(mode, seed), setup), `mode ${mode} setup ${seed} is not reproducible`);
    }
  }
  assert.ok(Object.keys(files.unsupported.setups).every(seed => seed.startsWith('invalid-')));
});

// The evidence report is prose around three machine-written artifacts. It must repeat their
// numbers exactly, and the artifacts must belong to the fixtures that are committed now.
test('the evidence report repeats its artifacts, and they belong to the committed fixtures', () => {
  const evidence = name => JSON.parse(text(`docs/balance/evidence/2026-10-06-${name}-engine-8d4a2e5.json`));
  const report = text('docs/balance/evidence/2026-10-06-baseline.md');
  const has = row => assert.ok(report.includes(row), `the evidence report lacks the row: ${row}`);
  const run = evidence('scenarios');
  for (const group of GROUPS) {
    const file = scenarioFileUrl(group);
    const name = file.pathname.split('/').pop();
    assert.equal(run.pins.scenarioFileHashes[name], createHash('sha256').update(readFileSync(file)).digest('hex'),
      `${name} changed after the evidence was produced: run the scenarios again and write a new report`);
  }
  assert.equal(run.runs.length, all.length);
  const label = { 'mode-7': '7 players', 'mode-8': '8 players', 'mode-9': '9 players', unsupported: 'Unsupported configurations' };
  for (const [group, summary] of Object.entries(run.byGroup)) has(`| ${label[group]} | ${summary.total} | ${summary.passed} | ${summary.failed} | ${summary.blocked} | ${summary.notRun} |`);
  has(`| All | ${run.totals.total} | ${run.totals.passed} | ${run.totals.failed} | ${run.totals.blocked} | ${run.totals.notRun} |`);
  // No executed result may exist for a blocked or manual fixture, and none may be missing for a ready one.
  for (const result of run.runs) {
    const scenario = all.find(item => item.id === result.scenarioId);
    assert.ok(scenario, `evidence for unknown scenario ${result.scenarioId}`);
    if (scenario.status === 'ready') assert.ok(['passed', 'failed'].includes(result.status), `${scenario.id} is ready but was not executed`);
    else assert.equal(result.status, scenario.status === 'blocked' ? 'blocked' : 'not-run', `${scenario.id} is ${scenario.status} but was reported ${result.status}`);
  }
  const controls = evidence('controls');
  const playouts = evidence('playouts');
  for (const mode of [7, 8, 9]) {
    const control = controls.modes[mode];
    has(`| ${mode} players | ${control.scenarios} | ${control.controls} | ${control.detected} | ${control.undetected} |`);
    const walk = playouts.modes[mode];
    has(`| ${mode} players | ${walk.playouts} | ${walk.completed} | ${walk.phases} | ${walk.commandsAccepted} | ${walk.commandsRejected} | ${walk.invariantViolations} | ${walk.hintMismatches} | ${walk.replayMismatches} |`);
    // A random policy's outcome frequencies are deliberately not stored.
    assert.equal('terminal' in walk, false);
    assert.equal('alienCoWin' in walk, false);
  }
  for (const artifact of [run.pins.engineCommit, controls.engineCommit, playouts.engineCommit]) assert.equal(artifact, '8d4a2e5dc47eb827dbcbfd8382755db2fa3b0bde');
});
