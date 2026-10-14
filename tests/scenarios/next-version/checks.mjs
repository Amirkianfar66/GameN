// Static checks of the acceptance cases of the next version: that the cases are well formed, that
// every reference in them resolves, that the three numbers of players are kept apart, that nothing
// claims to have been run, and that the documents print what the catalogue and the reports hold.
// No engine is run here.
//
// They are registered from tests/scenarios/scenarios.test.mjs, not from a test file of their own:
// the integration gate (tests/tooling/balance-runner.test.mjs) counts the test files of that
// directory, and a seventh would turn it red. See BAL-REQ-17. This module only collects them;
// the test file itself calls the test runner, so that each check is reported, counted and, if it
// were ever skipped, noticed under the file that the static check lists.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { ENGINE_COMMIT_BASIS, parseRulebook } from '@mothership/balance';
import { AREAS, BASES, LAYERS, LAYOUTS, MODES, NEXT_VERSION_FILES, STATUS_TEXT, casesOf, roster } from './catalog.mjs';
import { CONTROLS, LATER_DECISIONS, RULESETS, RULESET_SOURCES, controlId, runControls, tupleFor } from './controls.mjs';
import {
  ACCEPTANCE_SCHEMA, AUDIT_PATH, BUILDS, CONTRAST_BUILD, CONTROL_RUNS, EVIDENCE_COMMITTED, EVIDENCE_PATH, acceptanceFileUrl, contrastReportName, controlReportName, layoutOf, layoutsOf,
  loadAcceptance, loadControlEvidence, matrixFileUrl, matrixPath, renderAcceptanceFile, renderMatrix,
} from './files.mjs';
import { ASSUMPTIONS, FINDINGS, NEEDS, casesNaming } from './register.mjs';
import { QUESTIONS, SECTIONS, SPEC, isSpecReference, packetDigest } from './spec.mjs';
import { AUDIT_TABLES, EVIDENCE_TABLES, fillGenerated, rosterArithmetic } from './tables.mjs';

const root = new URL('../../../', import.meta.url);
const text = path => readFileSync(new URL(path, root), 'utf8');
const sha256 = path => createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex');
const all = Object.fromEntries(MODES.map(mode => [mode, casesOf(mode)]));
const wording = item => [item.title, ...item.preconditions, ...item.sequence, ...item.expected.state, ...item.expected.visibility, ...item.expected.timing].join('\n');

// Register entries that concern two Disablers, which seven players do not have.
const NOT_AT = { 7: ['Q-B03c'], 8: [], 9: [] };

function collect(test) {
  test('next version: the committed case files and matrices are exactly what the catalogue produces', () => {
    for (const mode of MODES) {
      assert.equal(readFileSync(acceptanceFileUrl(mode), 'utf8'), renderAcceptanceFile(mode), `${NEXT_VERSION_FILES[mode]}: run npm run materialize --workspace @mothership/balance`);
      assert.equal(readFileSync(matrixFileUrl(mode), 'utf8'), renderMatrix(mode), `${matrixPath(mode)}: run npm run materialize --workspace @mothership/balance`);
      const file = loadAcceptance(mode);
      assert.equal(file.schema, ACCEPTANCE_SCHEMA);
      assert.equal(file.mode, mode);
      assert.equal(file.optionalPowers, false);
      assert.equal(file.specification.packetSha256, SPEC.packetSha256);
      assert.equal(file.cases.length, all[mode].length);
    }
  });

  test('next version: the packet is recorded whole, and its digest is the digest of its six hashes', () => {
    assert.equal(Object.keys(SPEC.files).length, 6);
    for (const hash of Object.values(SPEC.files)) assert.match(hash, /^[0-9a-f]{64}$/);
    assert.equal(packetDigest(), SPEC.packetSha256);
    assert.match(SPEC.sourceBasis.commit, /^[0-9a-f]{40}$/);
    assert.equal(Object.keys(SECTIONS).length, 9, 'the packet has nine sections');
    assert.equal(Object.keys(QUESTIONS).length, 36, 'the packet\'s register has 36 entries');
    assert.deepEqual(Object.entries(QUESTIONS).reduce((sum, [, authority]) => ({ ...sum, [authority]: (sum[authority] ?? 0) + 1 }), {}), { owner: 23, integration: 8, blanket: 5 });
    // The base of the suite is the packet's own source basis, and the 1.3 ruleset is the one this checkout pins.
    assert.equal(SPEC.sourceBasis.rulesetVersion, RULESETS.V13);
    assert.equal(SPEC.sourceBasis.rulesetHash, sha256(RULESET_SOURCES.V13.overlay));
  });

  test('next version: every case is well formed, and identifiers are unique', () => {
    for (const mode of MODES) {
      const ids = new Set();
      for (const item of all[mode]) {
        assert.match(item.id, new RegExp(`^NV-M${mode}-(${Object.keys(AREAS).join('|')})-\\d{2}$`));
        assert.ok(!ids.has(item.id), `${item.id} is written twice`);
        ids.add(item.id);
        assert.equal(item.mode, mode);
        assert.ok(item.title.length > 0 && item.title.length <= 140, `${item.id}: a title of at most 140 characters`);
        for (const [name, list] of [['specification', item.specification], ['preconditions', item.preconditions], ['sequence', item.sequence], ['expected state', item.expected.state], ['visibility', item.expected.visibility], ['timing', item.expected.timing]]) {
          assert.ok(Array.isArray(list) && list.length > 0, `${item.id}: ${name} is empty`);
          for (const entry of list) assert.ok(typeof entry === 'string' && entry.trim().length > 0, `${item.id}: an empty line in ${name}`);
        }
        assert.ok(item.basis in BASES, `${item.id}: basis ${item.basis}`);
        assert.ok(item.layer in LAYERS, `${item.id}: layer ${item.layer}`);
        assert.ok(item.status in STATUS_TEXT, `${item.id}: status ${item.status}`);
        assert.equal(new Set(item.specification).size, item.specification.length, `${item.id}: a reference twice`);
      }
    }
    // A case that exists with several numbers of players is the same case: same references, same basis.
    for (const item of all[9]) {
      for (const mode of [7, 8]) {
        const other = all[mode].find(candidate => candidate.code === item.code);
        if (other === undefined) continue;
        assert.deepEqual([other.specification, other.rules, other.basis, other.status, other.layer, other.findings, other.needs, other.otherOutcome.length], [item.specification, item.rules, item.basis, item.status, item.layer, item.findings, item.needs, item.otherOutcome.length], item.code);
      }
    }
  });

  test('next version: no case is run, and no case says it was', () => {
    for (const mode of MODES) {
      for (const item of all[mode]) {
        assert.equal(item.execution, 'not-run', `${item.id} claims an execution`);
        assert.equal(item.version, 'next');
        assert.match(STATUS_TEXT[item.status], /[Nn]ot run/);
      }
      const matrix = text(matrixPath(mode));
      assert.ok(matrix.includes('**No case of the next version has been run.**'));
      assert.ok(matrix.includes(`| All | ${all[mode].length} |`));
      assert.ok(!/\b(passed|failed)\b/.test(matrix.slice(matrix.indexOf('## Cases of the next version'), matrix.indexOf('## Controls on the versions that exist'))), `${matrixPath(mode)}: a verdict among the cases of the next version`);
    }
    // No ruleset of the next version exists, so no control and no case can be asked to run under one.
    assert.ok(!Object.values(RULESETS).some(ruleset => /next|2026-10-13|owner-motion/.test(ruleset)));
  });

  test('next version: every reference to the packet resolves, and every section and entry of the packet has a case with each number of players', () => {
    for (const mode of MODES) {
      for (const item of all[mode]) for (const reference of item.specification) assert.ok(isSpecReference(reference), `${item.id} cites ${reference}, which the packet does not have`);
      const used = new Set(all[mode].flatMap(item => item.specification));
      const missing = [...Object.keys(SECTIONS), ...Object.keys(QUESTIONS)].filter(reference => !used.has(reference));
      assert.deepEqual(missing, NOT_AT[mode], `${mode} players: references without a case`);
    }
  });

  test('next version: every kept rule a case names exists where it is said to be', () => {
    const rulebook = new Set(parseRulebook(text('docs/balance/game-rules.md')).entries.map(entry => entry.id));
    const capacity = new Set(text('docs/balance/capacity-audit.md').match(/^\| R-CAP-\d{2} /gm).map(row => row.slice(2).trim()));
    const pass = new Set(JSON.parse(text('rules/overlays/ordinary-turn-pass-owner-decision-2026-10-08.json')).decisions.map(decision => decision.id));
    // BAL-C nn: an item of the contract review, with Backend's answer in the integration requests.
    const reviewed = new Set(text('docs/balance/contract-review.md').match(/BAL-C\d{2}/g));
    const exists = rule => {
      if (/^BAL-C\d{2}$/.test(rule)) return reviewed.has(rule);
      if (/^R-CAP-\d{2}$/.test(rule)) return capacity.has(rule);
      if (/^R-[A-Z]+-\d{2}$/.test(rule)) return rulebook.has(rule);
      const later = /^(PASS|VOTE-RESULT|HACK-DECLARE)-(\d{2})$/.exec(rule);
      if (later === null) return false;
      const number = Number(later[2]);
      return number >= 1 && number <= LATER_DECISIONS[later[1]] && (later[1] !== 'PASS' || pass.has(rule));
    };
    for (const mode of MODES) for (const item of all[mode]) for (const rule of item.rules) assert.ok(exists(rule), `${item.id} names ${rule}`);
    for (const item of CONTROLS) for (const rule of item.sources) assert.ok(exists(rule), `${item.code} reads its expectation from ${rule}`);
    assert.equal(pass.size, LATER_DECISIONS.PASS);
  });

  test('next version: findings, needs, twins and controls that a case names exist, and a reading always names its finding', () => {
    const findings = new Map(FINDINGS.map(item => [item.id, item]));
    const needs = new Set(NEEDS.map(item => item.id));
    const controls = new Set(CONTROLS.map(item => item.code));
    for (const mode of MODES) {
      const codes = new Set(all[mode].map(item => item.code));
      for (const item of all[mode]) {
        for (const id of item.findings) assert.ok(findings.has(id), `${item.id} names ${id}`);
        for (const id of item.needs) assert.ok(needs.has(id), `${item.id} names ${id}`);
        for (const code of item.controls) assert.ok(controls.has(code), `${item.id} names control ${code}`);
        if (item.pair !== null) assert.ok(codes.has(item.pair), `${item.id} is to be read beside ${item.pair}, which ${mode} players do not have`);
        assert.ok(item.needs.length > 0, `${item.id} names nothing it waits for`);
        if (item.basis === 'reading') assert.ok(item.findings.length > 0, `${item.id} rests on a reading and names no finding`);
        // A reading says what the other outcome is, and keeps it out of what a test would assert.
        if (item.basis === 'reading') assert.ok(item.otherOutcome.length > 0, `${item.id} rests on a reading and does not give the other outcome`);
        for (const line of [...item.expected.state, ...item.expected.visibility]) assert.ok(!/^(Other reading|Other outcome|If a player eliminated in the stage)/.test(line), `${item.id}: the other outcome stands among the expectations`);
        if (item.otherOutcome.length > 0) assert.ok(item.findings.length > 0, `${item.id} gives another outcome and names no finding`);
        if (item.status === 'synthetic') assert.ok(item.findings.includes('NV-F-09'), `${item.id} has no legal line and does not say so in NV-F-09`);
        // A case that gives two readings says which one is recommended.
        if (item.basis === 'reading') assert.ok(/[Rr]ecommended reading|is a reading/.test([...item.expected.state, ...item.expected.visibility, ...item.expected.timing].join('\n')), `${item.id}: a reading that the expectation does not mark as one`);
        // A note is context. It must not hide an outcome or a precondition.
        for (const line of item.notes) assert.ok(!/^(Recommended reading|Other reading)/.test(line), `${item.id}: a reading among the notes`);
      }
    }
    for (const item of FINDINGS) if (item.kind !== 'information') assert.ok(casesNaming('findings', item.id).length > 0, `${item.id} has no case`);
    for (const item of CONTROLS) for (const code of item.changes) for (const mode of MODES) assert.ok(all[mode].some(candidate => candidate.code === code), `${item.code} points to ${code}, which ${mode} players do not have`);
    assert.equal(new Set([...FINDINGS, ...NEEDS, ...ASSUMPTIONS].map(item => item.id)).size, FINDINGS.length + NEEDS.length + ASSUMPTIONS.length);
  });

  test('next version: the three games are kept apart, and each case speaks only of roles its game has', () => {
    for (const mode of MODES) {
      const roles = new Set(roster(mode).map(item => item.role));
      assert.equal(roles.size, mode);
      for (const item of all[mode]) {
        const said = wording(item);
        for (const role of ['Red Disabler', 'Officer']) if (!roles.has(role)) assert.ok(!said.includes(role), `${item.id} speaks of the ${role}, which ${mode} players do not have`);
        for (const other of MODES.filter(candidate => candidate !== mode)) assert.ok(!said.includes(`NV-M${other}-`), `${item.id} points into the matrix of ${other} players`);
        // A case that builds on another names one that its own game has.
        for (const match of said.matchAll(/(?<![A-Z-])((?:BLK|MOV|SLOT|CLN|CAP|HSP|DEF|VOT|HCK|SHW|INT)-\d{2})\b/g)) assert.ok(all[mode].some(candidate => candidate.code === match[1]), `${item.id} builds on ${match[1]}, which ${mode} players do not have`);
      }
      // Two Disablers exist from eight players on: no case of seven is about two.
      if (mode === 7) assert.ok(!all[7].some(item => /[Bb]oth Disablers|two Disablers|Two Disablers/.test(wording(item))));
    }
    assert.ok(all[8].length > all[7].length && all[9].length >= all[8].length);
  });

  test('next version: every layout is a legal starting draw of its game', () => {
    for (const mode of MODES) {
      for (const name of layoutsOf(mode)) {
        const rooms = LAYOUTS[name].rooms(mode);
        const placed = Object.values(rooms).flat();
        assert.deepEqual([...placed].sort(), roster(mode).map(item => item.role).sort(), `${name} with ${mode} players places every role once`);
        assert.deepEqual(Object.keys(rooms).sort(), ['Room A', 'Room B']);
        for (const [room, roles] of Object.entries(rooms)) assert.ok(roles.length <= 5, `${name} with ${mode} players: ${roles.length} in ${room}`);
        for (const occupants of Object.values(layoutOf(name, mode))) assert.deepEqual(occupants.map(item => item.position), occupants.map((_, index) => index + 1));
      }
      // A case names only layouts its game has.
      for (const item of all[mode]) for (const match of wording(item).matchAll(/Layout ([A-Z]+)/g)) assert.ok(layoutsOf(mode).includes(match[1]), `${item.id} starts from layout ${match[1]}`);
    }
  });

  test('next version: the arithmetic of the three games is what their roles give', () => {
    assert.deepEqual(MODES.map(mode => rosterArithmetic(mode).attacks), [4, 5, 6]);
    assert.deepEqual(MODES.map(mode => rosterArithmetic(mode).blackouts), [1, 2, 2]);
    assert.deepEqual(MODES.map(mode => rosterArithmetic(mode).early), [1, 2, 3]);
    assert.deepEqual(MODES.map(mode => rosterArithmetic(mode).eliminatedBefore), [2, 2, 3]);
    assert.deepEqual(MODES.map(mode => [rosterArithmetic(mode).blue, rosterArithmetic(mode).red]), [[4, 2], [4, 3], [5, 3]]);
    // The case that fills Hospital in one round hurts exactly as many players as the game has attacks.
    for (const mode of MODES) {
      const item = all[mode].find(candidate => candidate.code === 'HSP-04');
      const count = { Four: 4, Five: 5, Six: 6 }[/^(Four|Five|Six) players are Injured/.exec(item.expected.state[0])?.[1]];
      assert.equal(count, rosterArithmetic(mode).attacks, item.id);
    }
  });

  test('next version: the controls are written for existing rulesets only, and an engine that does nothing right passes none of them', () => {
    assert.deepEqual(Object.keys(RULESETS), ['V13', 'V14', 'V15']);
    assert.equal(new Set(CONTROLS.map(item => item.code)).size, CONTROLS.length);
    for (const item of CONTROLS) {
      assert.match(item.code, /^V1[345]-\d{2}$/);
      assert.ok(item.version in RULESETS);
      assert.ok(item.sources.length > 0 && item.changes.length > 0 && item.note.length > 0, item.code);
      if (item.contrast !== undefined) assert.ok(item.contrast in RULESETS && item.contrast !== item.version, `${item.code}: contrast`);
    }
    // An engine that names the tuples and never closes a phase. Every control must fail on it.
    const tuples = Object.fromEntries(Object.entries(RULESETS).map(([key, ruleset]) => [`${key}_PINS`, { protocolVersion: 2, engineVersion: RULESET_SOURCES[key].engineVersion, rulesetVersion: ruleset, rulesetHash: RULESET_SOURCES[key].rulesetHash }]));
    const inert = {
      ...tuples,
      createFullGame: ({ matchId, setup, now, phaseId, deadlineToken, versions }) => ({
        matchId, versions, round: 1, activeSeatId: 'seat-1', deadlineToken, eligibleVoters: [], eligibleTargets: [], codeSubmitted: false,
        phase: { id: phaseId, kind: 'ORDINARY_TURN', startedAt: now, endsAt: now + 60000 },
        seats: setup.roleOrder.map((role, index) => ({ seatId: `seat-${index + 1}`, role, health: 'Healthy', location: setup.initialRooms[`seat-${index + 1}`], jailed: false, captain: false })),
      }),
      executeFullGame: (state, actor, request) => ({ state, receipt: { ...request, status: 'rejected', code: 'NOT_ALLOWED' } }),
      advanceFullGame: state => ({ state, advanced: false }),
      projectFullGame: state => ({ public: { activeSeatId: state.activeSeatId, seats: state.seats }, players: Object.fromEntries(state.seats.map(seat => [seat.seatId, { self: { movementDestinations: [] }, hackPartnerSeatId: null }])) }),
    };
    assert.deepEqual(tupleFor(inert, RULESETS.V14), tuples.V14_PINS);
    assert.equal(tupleFor(inert, 'in-person-v1-of-no-engine'), null);
    for (const version of Object.keys(RULESETS)) {
      for (const mode of MODES) {
        const runs = runControls(inert, version, mode);
        assert.equal(runs.length, CONTROLS.filter(item => item.version === version).length);
        for (const run of runs) {
          assert.equal(run.id, controlId(mode, run.code));
          assert.equal(run.status, 'failed', `${run.id} did not fail on an engine that does nothing`);
        }
      }
    }
    assert.throws(() => runControls({ ...inert, V15_PINS: undefined }, 'V15', 7), /does not name/);
  });

  test('next version: the audit prints the tables of the catalogue, names every finding, and states no rate', () => {
    const audit = text(AUDIT_PATH);
    assert.equal(fillGenerated(audit, AUDIT_TABLES()), audit, `${AUDIT_PATH}: run npm run materialize --workspace @mothership/balance`);
    for (const item of FINDINGS) assert.ok(audit.includes(`### ${item.id}: `), `the audit has no part for ${item.id}`);
    // The audit says in words how many findings there are of each kind.
    assert.deepEqual(FINDINGS.reduce((sum, item) => ({ ...sum, [item.kind]: (sum[item.kind] ?? 0) + 1 }), {}), { contradiction: 3, consequence: 2, gap: 6, information: 1 });
    assert.ok(audit.includes('three places where two passages cannot both hold, six where neither the packet nor a kept rule says what an implementation needs, two where the rules do answer'));
    assert.deepEqual([...audit.matchAll(/^### (NV-F-\d{2}): /gm)].map(match => match[1]), FINDINGS.map(item => item.id));
    // Hypotheses are numbered in order, and each row says how it could be tested.
    const hypotheses = [...audit.matchAll(/^\| (NV-H-\d{2}) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|$/gm)];
    assert.ok(hypotheses.length >= 8, 'the audit lists its hypotheses');
    assert.deepEqual(hypotheses.map(match => match[1]), hypotheses.map((_, index) => `NV-H-${String(index + 1).padStart(2, '0')}`));
    for (const match of hypotheses) assert.ok(match[4].trim().length > 20, `${match[1]} does not say what would test it`);
    // Every identifier the audit uses exists.
    const known = new Set([...FINDINGS, ...NEEDS, ...ASSUMPTIONS].map(item => item.id));
    for (const match of audit.matchAll(/\b(NV-[FA]-\d{2}|[BF]E-\d{2})\b/g)) assert.ok(known.has(match[1]), `the audit names ${match[1]}`);
    const codes = new Set(all[9].map(item => item.code));
    for (const match of audit.matchAll(/(?<![A-Z-])((?:BLK|MOV|SLOT|CLN|CAP|HSP|DEF|VOT|HCK|SHW|INT)-\d{2})\b/g)) assert.ok(codes.has(match[1]), `the audit names case ${match[1]}`);
    for (const match of audit.matchAll(/\b(V1[345]-\d{2})\b/g)) assert.ok(CONTROLS.some(item => item.code === match[1]), `the audit names control ${match[1]}`);
    // No win rate, and no percentage of anything: nothing here was measured on people.
    for (const path of [AUDIT_PATH, ...MODES.map(matrixPath)]) assert.ok(!text(path).includes('%'), `${path} states a percentage`);
    for (const mode of MODES) assert.ok(audit.includes(`matrix-${mode}.md`));
  });

  test('next version: the reports of the controls are what the documents say, and each was made from a clean, named build', () => {
    const evidence = loadControlEvidence();
    if (!EVIDENCE_COMMITTED) {
      // Before the runs: no report may be lying about, or the matrix would print results nobody reviewed.
      for (const run of evidence.runs) assert.equal(run.report, null, `${run.name} is committed, but the suite says no evidence is`);
      assert.equal(evidence.contrast, null);
      assert.ok(!existsSync(new URL(EVIDENCE_PATH, root)));
      return;
    }
    const controlsHash = sha256('tests/scenarios/next-version/controls.mjs');
    assert.equal(evidence.runs.length, CONTROL_RUNS.length);
    for (const run of evidence.runs) {
      const report = run.report;
      assert.ok(report !== null, `${controlReportName(run)} is missing`);
      assert.equal(report.schema, 'mothership.balance.next-controls/1');
      const pins = report.pins;
      assert.equal(pins.engineCommit, BUILDS[run.build].commit, run.name);
      assert.equal(pins.engineTreeClean, true, `${run.name}: the engine tree was not clean`);
      assert.equal(pins.engineCommitBasis, ENGINE_COMMIT_BASIS.there, `${run.name}: the engine commit was not read from the engine's own checkout`);
      assert.ok(!pins.workingTreeCommit.includes('uncommitted'), `${run.name}: the Balance tree was not clean`);
      assert.equal(pins.node, 'v22.21.1');
      assert.equal(pins.rulesetAskedFor, RULESETS[run.version]);
      assert.equal(pins.engine.rulesetVersion, RULESETS[run.version]);
      assert.equal(pins.engine.rulesetHash, RULESET_SOURCES[run.version].rulesetHash);
      assert.equal(pins.engine.engineVersion, RULESET_SOURCES[run.version].engineVersion);
      assert.equal(pins.engine.binaryEngineVersion, BUILDS[run.build].engineVersion);
      assert.equal(pins.controlsSha256, controlsHash, `${run.name} was made with other controls than the committed ones`);
      assert.equal(pins.specification.packetSha256, SPEC.packetSha256);
      const expected = CONTROLS.filter(item => item.version === run.version);
      assert.deepEqual(report.runs.map(result => result.id), MODES.flatMap(mode => expected.map(item => controlId(mode, item.code))));
      for (const result of report.runs) {
        assert.ok(['passed', 'failed', 'recorded'].includes(result.status), `${result.id}: ${result.status}`);
        assert.equal(result.status === 'passed', result.error === null && result.checks.length > 0 && result.checks.every(check => check.ok), result.id);
        assert.equal(result.status === 'recorded', result.error === null && result.checks.length === 0 && result.records.length > 0, result.id);
        assert.ok(result.phasesClosed > 0, `${result.id} closed no phase`);
      }
      const count = status => report.runs.filter(result => result.status === status).length;
      assert.deepEqual(report.totals, { total: report.runs.length, passed: count('passed'), failed: count('failed'), recorded: count('recorded'), notRun: 0 });
    }
    const contrast = evidence.contrast;
    assert.ok(contrast !== null, `${contrastReportName()} is missing`);
    assert.equal(contrast.pins.engineCommit, BUILDS[CONTRAST_BUILD].commit);
    assert.equal(contrast.pins.engineTreeClean, true);
    assert.equal(contrast.pins.engineCommitBasis, ENGINE_COMMIT_BASIS.there);
    assert.ok(!contrast.pins.workingTreeCommit.includes('uncommitted'));
    assert.deepEqual(contrast.runs.map(run => run.id), MODES.flatMap(mode => CONTROLS.filter(item => item.contrast !== undefined).map(item => controlId(mode, item.code))));
    assert.deepEqual(contrast.totals, { run: contrast.runs.length, detected: contrast.runs.filter(run => run.detected).length, undetected: contrast.runs.filter(run => !run.detected).length });
    // Every contrast and every deliberate leak was noticed, with each number of players.
    assert.equal(contrast.totals.undetected, 0);
    assert.deepEqual(contrast.leakTotals, { run: contrast.leaks.length, detected: contrast.leaks.length, undetected: 0 });
    assert.deepEqual([...new Set(contrast.leaks.map(run => run.code))].sort(), ['V13-02', 'V14-01', 'V15-04']);
    assert.equal(contrast.leaks.length, 3 * MODES.length);
    const report = text(EVIDENCE_PATH);
    assert.equal(fillGenerated(report, EVIDENCE_TABLES()), report, `${EVIDENCE_PATH}: run npm run materialize --workspace @mothership/balance`);
    for (const run of evidence.runs) assert.ok(report.includes(run.name), `${EVIDENCE_PATH} does not name ${run.name}`);
    assert.ok(report.includes(contrastReportName()));
    for (const build of Object.values(BUILDS)) assert.ok(report.includes(build.commit), `${EVIDENCE_PATH} does not give ${build.commit} in full`);
  });
}

const collected = [];
collect((name, run) => { collected.push([name, run]); });
/** The checks, as [name, function] pairs for the test file to register. */
export const NEXT_VERSION_CHECKS = Object.freeze(collected);
