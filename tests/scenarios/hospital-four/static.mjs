// The static checks of the four-bed Hospital record. They read no engine. node:test reports a
// test under the module that registers it, and the static suite is held to its six files, so the
// checks are collected here and registered from scenarios.test.mjs.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { LINES, MODES, REQUIREMENTS, SOURCES, linesFor } from './checks.mjs';
import { CHECK_SOURCES, EVIDENCE_COMMITTED, REPORT_PATH, REPORT_SCHEMA, loadRecord, loadReport, repositoryUrl } from './files.mjs';

const text = path => readFileSync(repositoryUrl(path), 'utf8');
const sha = path => createHash('sha256').update(readFileSync(repositoryUrl(path))).digest('hex');
const checks = [];
const check = (name, run) => checks.push([name, run]);

check('four-bed record: the pins are those of the overlay and the contracts, and every file it names has the recorded bytes', () => {
  const record = loadRecord();
  const overlay = JSON.parse(text(record.canonical.overlay.path));
  assert.equal(sha(record.canonical.overlay.path), record.canonical.overlay.sha256);
  assert.equal(record.pins.rulesetHash, record.canonical.overlay.sha256, 'the ruleset hash is the SHA-256 of the overlay');
  assert.deepEqual([overlay.protocol_version, overlay.engine_version, overlay.ruleset_version, overlay.parent_ruleset.version],
    [record.pins.protocolVersion, record.pins.engineVersion, record.pins.rulesetVersion, record.pins.parentRuleset]);
  assert.deepEqual(overlay.decisions.map(item => item.id), record.canonical.overlay.decisions);
  assert.equal(overlay.owner_decision.id, record.decision.id);
  assert.ok(record.decision.ownerAnswers.includes(overlay.owner_decision.clarification), 'the clarification is the overlay\'s');
  assert.ok(record.decision.ownerAnswers.includes(overlay.ordering_owner_reply.answer), 'the ordering answer is the overlay\'s');
  const versions = text('packages/contracts/src/full-game-versions.ts');
  const pins = versions.match(/HOSPITAL_FOUR_VERSION_PINS = Object\.freeze\(\{protocolVersion:(\d) as const,engineVersion:'([^']+)',rulesetVersion:'([^']+)',rulesetHash:'([a-f0-9]{64})'\}\)/);
  assert.ok(pins, 'the contracts name the tuple');
  assert.deepEqual([Number(pins[1]), pins[2], pins[3], pins[4]], [record.pins.protocolVersion, record.pins.engineVersion, record.pins.rulesetVersion, record.pins.rulesetHash]);
  assert.match(versions, new RegExp(`HOSPITAL_FOUR_LAYOUT_REVISION = '${record.pins.layout}'`));
  assert.match(versions, new RegExp(`HOSPITAL_FOUR_ASSET_MANIFEST_VERSION = '${record.pins.art}'`));
  for (const key of ['ownerEvidence', 'runtimeContract', 'backendVerification']) assert.equal(sha(record.canonical[key].path), record.canonical[key].sha256, `${key} changed`);
  const kept = JSON.parse(text(record.canonical.keptRules.path)).decisions.map(item => item.id);
  for (const id of record.canonical.keptRules.decisions) assert.ok(kept.includes(id), `${id} is not in ${record.canonical.keptRules.path}`);
  for (const commit of [record.implementation.finalHead, record.implementation.testedSource, record.implementation.base, record.historical.head]) assert.match(commit, /^[a-f0-9]{40}$/);
});

check('four-bed checks: every source a claim can name exists, and every requirement is covered with each number of players', () => {
  const record = loadRecord();
  const overlay = JSON.parse(text(record.canonical.overlay.path)).decisions.map(item => item.id);
  const kept = JSON.parse(text(record.canonical.keptRules.path)).decisions.map(item => item.id);
  const contract = text(record.canonical.runtimeContract.path);
  const rulebook = text('docs/balance/game-rules.md');
  for (const id of Object.keys(SOURCES)) {
    if (id.startsWith('H4-')) assert.ok(overlay.includes(id), `${id} is not a decision of the overlay`);
    else if (id.startsWith('BOARD-MEDICAL-')) assert.ok(kept.includes(id), `${id} is not a kept decision`);
    else if (id.startsWith('R-')) assert.ok(rulebook.includes(`| ${id} |`), `${id} is not a rule of the rulebook`);
  }
  for (const heading of ['## Atomic checkpoint', 'Constructed regression expectations', '## Consumer boundary']) assert.ok(contract.includes(heading), `the contract has no "${heading}"`);
  assert.equal(new Set(LINES.map(line => line.id)).size, LINES.length);
  for (const line of LINES) {
    assert.ok(line.modes.length > 0 && line.modes.every(mode => MODES.includes(mode)), line.id);
    assert.ok(['contract', 'native', 'constructed'].includes(line.kind), line.id);
    assert.ok(line.covers.every(id => REQUIREMENTS.some(item => item.id === id)), line.id);
  }
  for (const mode of MODES) for (const requirement of REQUIREMENTS) {
    const lines = linesFor(mode).filter(line => line.covers.includes(requirement.id) || (line.kind !== 'contract' && ['beds', 'replay'].includes(requirement.id)));
    assert.ok(lines.length > 0, `nothing verifies "${requirement.text}" with ${mode} players`);
  }
  // Where a native line exists for a requirement with eight and nine players but not with seven, the reason is in the document.
  const document = text('docs/balance/hospital-four.md');
  assert.ok(document.includes('With seven players no legal play'), 'the document says why seven players need constructed controls');
});

check('four-bed evidence: the committed report was made from a clean commit whose engine, contracts and service are the tested source, with the committed checks', () => {
  const report = loadReport();
  if (!EVIDENCE_COMMITTED) {
    assert.equal(existsSync(repositoryUrl(REPORT_PATH)), false, 'a report is committed before the evidence commit');
    return;
  }
  const record = loadRecord();
  assert.ok(report, `${REPORT_PATH} is missing`);
  assert.equal(report.schema, REPORT_SCHEMA);
  assert.match(report.pins.commit, /^[a-f0-9]{40}$/);
  assert.equal(report.pins.treeClean, true, 'the run was made from a tree with changes');
  assert.equal(report.pins.node, 'v22.21.1');
  assert.equal(report.pins.testedSource, record.implementation.testedSource);
  assert.deepEqual(Object.keys(report.pins.sourceTrees), record.implementation.sourceTrees);
  for (const [path, tree] of Object.entries(report.pins.sourceTrees)) assert.ok(tree.same && tree.here === tree.tested, `${path} is not the tested source`);
  assert.deepEqual(report.pins.tuple, { protocolVersion: record.pins.protocolVersion, engineVersion: record.pins.engineVersion, rulesetVersion: record.pins.rulesetVersion, rulesetHash: record.pins.rulesetHash });
  assert.equal(report.pins.overlaySha256, record.canonical.overlay.sha256);
  for (const path of CHECK_SOURCES) assert.equal(report.pins.checkSources[path], sha(path), `${path} changed after the run`);
  assert.equal(report.pins.recordSha256, sha('tests/scenarios/hospital-four/record.json'), 'the record changed after the run');
  for (const mode of MODES) {
    assert.deepEqual(report.modes[mode].lines.map(line => line.line), linesFor(mode).map(line => line.id), `the lines run with ${mode} players`);
    for (const line of report.modes[mode].lines) {
      assert.equal(line.status, 'passed', `${line.line} with ${mode} players: ${line.error ?? line.claims.filter(item => !item.passed).map(item => item.id).join(', ')}`);
      assert.ok(line.claims.length > 0 && line.claims.every(item => item.passed && JSON.stringify(item.expected) === JSON.stringify(item.actual)), `${line.line} with ${mode} players`);
    }
  }
  assert.equal(report.totals.lines, MODES.reduce((sum, mode) => sum + linesFor(mode).length, 0));
  assert.equal(report.totals.passed, report.totals.lines);
  assert.equal(report.totals.claimsPassed, report.totals.claims);
});

export const HOSPITAL_FOUR_CHECKS = Object.freeze(checks);
