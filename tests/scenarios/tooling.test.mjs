// Tests of the balance tooling itself: that the runner never reports an unexecuted or blocked
// case as passed, that the invariants fire, and that the statistics and the record validator
// behave as the playtest plan says.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  MATCH_RECORD_SCHEMA, buildReport, checkSetup, checkState, checkTransition, damageBudget, deriveSetup, runScenario, scanInformationBound,
  startLedger, summarize, summarizeOutcomes, toEvidence, validateMatchRecord, wilson,
} from '@mothership/balance';
import { openingObservation, stubAdapter } from './support/stub.mjs';

const root = new URL('../../', import.meta.url);
const setup = deriveSetup(7, 'v1-A-1', { roles: 'canonical', rooms: 'all-a', orders: 'seeded' });
const scenario = (status, steps, extra = {}) => ({
  id: 'V1-M7-SETUP-01', group: 'mode-7', mode: 7, title: 'tooling test', status, kind: 'rules_correctness', areas: ['mode-setup'],
  ruleRefs: ['R-SETUP-01'], lineage: [], decisionIds: status === 'blocked' ? ['D11'] : [], optionalPowers: false, setup, steps, note: '', ...extra,
});
const refused = { op: 'command', actor: '@Insider', command: { type: 'MOVE', destination: 'Room B' }, expect: 'NOT_ALLOWED' };
const roundOne = { op: 'assert', checks: [{ match: 'round', equals: 1 }] };

test('without an engine nothing is executed and nothing is reported as passed', () => {
  const ready = runScenario(scenario('ready', [refused, roundOne]), null, 'no engine');
  assert.equal(ready.status, 'not-run');
  assert.equal(ready.reason, 'no engine');
  assert.equal(runScenario(scenario('blocked', []), null, 'no engine').status, 'blocked');
  assert.equal(runScenario(scenario('manual', [], { setup: null }), stubAdapter(), '').status, 'not-run');
  assert.deepEqual(toEvidence(ready, 'evidence.json'), { status: 'not-run', scenarioId: 'V1-M7-SETUP-01' });
});

test('an executed case passes only when every expectation holds', () => {
  const passed = runScenario(scenario('ready', [refused, roundOne]), stubAdapter(), '');
  assert.equal(passed.status, 'passed');
  assert.equal(passed.commands, 1);
  assert.deepEqual(toEvidence(passed, 'evidence.json'), { status: 'passed', scenarioId: 'V1-M7-SETUP-01', evidencePath: 'evidence.json' });
  const wrongOutcome = runScenario(scenario('ready', [{ ...refused, expect: 'REGISTERED' }]), stubAdapter(), '');
  assert.equal(wrongOutcome.status, 'failed');
  assert.match(wrongOutcome.failure.message, /expected REGISTERED, engine returned NOT_ALLOWED/);
  const wrongFact = runScenario(scenario('ready', [{ op: 'assert', checks: [{ match: 'round', equals: 2 }] }]), stubAdapter(), '');
  assert.equal(wrongFact.status, 'failed');
  const refusedSetup = runScenario(scenario('ready', [roundOne]), stubAdapter({ refuseSetup: true }), '');
  assert.equal(refusedSetup.status, 'failed');
  assert.match(refusedSetup.failure.message, /refused a legal setup/);
  const expectedRefusal = runScenario(scenario('ready', [{ op: 'createRejected' }]), stubAdapter({ refuseSetup: true }), '');
  assert.equal(expectedRefusal.status, 'passed');
  assert.equal(runScenario(scenario('ready', [{ op: 'createRejected' }]), stubAdapter(), '').status, 'failed');
});

test('a blocked case stays blocked whatever the engine does, and only records what it observed', () => {
  const steps = [{ op: 'probe', actor: '@Supplier', command: { type: 'SUPPLY', targets: ['@Supplier', '@Insider'] }, label: 'self supply' }, { op: 'note', label: 'phase', match: 'phase' }];
  const run = runScenario(scenario('blocked', steps), stubAdapter({ outcomes: ['REGISTERED'] }), '');
  assert.equal(run.status, 'blocked');
  assert.deepEqual(run.probes, [{ label: 'self supply', outcome: 'REGISTERED' }, { label: 'phase', outcome: 'ORDINARY_TURN' }]);
  assert.deepEqual(toEvidence(run, 'evidence.json'), { status: 'blocked', scenarioId: 'V1-M7-SETUP-01', decisionIds: ['D11'] });
});

test('an invariant violation fails a case even when every scripted expectation holds', () => {
  const leak = observation => { observation.raw.public.seats[0].role = 'Hacker'; observation.revisions.public += 1; return observation; };
  const run = runScenario(scenario('ready', [{ ...refused, expect: 'REGISTERED' }]), stubAdapter({ outcomes: ['REGISTERED'], mutate: leak }), '');
  assert.equal(run.status, 'failed');
  assert.ok(run.invariantViolations.some(item => item.invariant === 'INV-VIEW-01'));
});

test('the report keeps modes apart and never counts blocked or not-run as passed', () => {
  const runs = [
    runScenario(scenario('ready', [refused]), stubAdapter(), ''),
    runScenario(scenario('ready', [refused]), null, 'no engine'),
    runScenario(scenario('blocked', []), null, 'no engine'),
    { ...runScenario(scenario('ready', [{ ...refused, expect: 'REGISTERED' }]), stubAdapter(), ''), group: 'mode-9', mode: 9 },
  ];
  assert.deepEqual(summarize(runs), { total: 4, passed: 1, failed: 1, blocked: 1, notRun: 1 });
  const report = buildReport(runs, {});
  assert.deepEqual(report.byGroup['mode-7'], { total: 3, passed: 1, failed: 0, blocked: 1, notRun: 1 });
  assert.deepEqual(report.byGroup['mode-9'], { total: 1, passed: 0, failed: 1, blocked: 0, notRun: 0 });
  assert.deepEqual(report.byGroup['mode-8'], { total: 0, passed: 0, failed: 0, blocked: 0, notRun: 0 });
});

test('state invariants accept a rule-consistent opening and name what is wrong otherwise', () => {
  const opening = openingObservation(setup);
  assert.deepEqual([...checkSetup(setup, opening), ...checkState(setup, opening, startLedger(opening))], []);
  const violations = change => {
    const next = openingObservation(setup);
    change(next);
    return checkTransition(setup, opening, next, { kind: 'advance', atMs: opening.phaseEndsAt, advanced: false }, startLedger(opening)).map(item => item.invariant);
  };
  assert.ok(violations(next => { next.truth.seats[0].health = 'Injured'; }).includes('INV-EL-02'));
  assert.ok(violations(next => { next.truth.seats[0].ordinaryWeapons = -1; }).includes('INV-RES-01'));
  assert.ok(violations(next => { next.truth.seats[0].captain = true; next.truth.seats[1].captain = true; }).includes('INV-LOC-01'));
  assert.ok(violations(next => { next.truth.seats[0].location = 'Command Room'; }).includes('INV-LOC-01'));
  assert.ok(violations(next => { next.truth.seats[0].jailed = true; }).includes('INV-JAIL-01'));
  assert.ok(violations(next => { next.publicView.seats[0].revealedFaction = 'Red'; }).includes('INV-EL-04'));
  assert.ok(violations(next => { next.playerViews['seat-2'].knowledge.code = ['seat-1', 'seat-2', 'seat-3', 'seat-5']; }).includes('INV-VIEW-02'));
  assert.ok(violations(next => { next.result = { winner: 'Blue', alienCoWinner: true }; }).includes('INV-WIN-01'));
  assert.ok(violations(next => { next.phaseEndsAt = next.phaseStartedAt + 30_000; }).includes('INV-PH-03'));
  assert.ok(violations(next => { next.round = 3; }).includes('INV-PH-02'));
  const eliminated = openingObservation(setup);
  eliminated.truth.seats[0].health = 'Eliminated';
  eliminated.publicView.seats[0].health = 'Eliminated';
  eliminated.publicView.seats[0].revealedFaction = eliminated.truth.seats[0].faction;
  for (const view of Object.values(eliminated.playerViews)) view.publicFacts = structuredClone(eliminated.publicView);
  const revived = openingObservation(setup);
  assert.ok(checkTransition(setup, eliminated, revived, { kind: 'advance', atMs: 0, advanced: false }, startLedger(eliminated)).some(item => item.invariant === 'INV-EL-01'));
});

test('a hidden registration that touches another view, or a refusal that changes state, is caught', () => {
  const opening = openingObservation(setup);
  const touched = openingObservation(setup);
  touched.raw.players['seat-2'].hint = 'something changed';
  touched.revisions.players['seat-2'] += 1;
  const accepted = { kind: 'command', actor: 'seat-1', command: { type: 'SCAN', target: 'seat-2', guess: 'Blue' }, outcome: 'REGISTERED' };
  assert.ok(checkTransition(setup, opening, touched, accepted, startLedger(opening)).some(item => item.invariant === 'INV-VIEW-03'));
  const refusal = { ...accepted, outcome: 'NOT_ALLOWED' };
  assert.ok(checkTransition(setup, opening, touched, refusal, startLedger(opening)).some(item => item.invariant === 'INV-VIEW-05'));
});

test('Wilson intervals match the examples in the role brief and refuse impossible counts', () => {
  const thirty = wilson(15, 30);
  assert.ok(Math.abs(thirty.low - 0.33) < 0.01 && Math.abs(thirty.high - 0.67) < 0.01);
  const hundred = wilson(50, 100);
  assert.ok(Math.abs(hundred.low - 0.40) < 0.01 && Math.abs(hundred.high - 0.60) < 0.01);
  assert.deepEqual(wilson(0, 0), { numerator: 0, denominator: 0, point: null, low: null, high: null });
  assert.equal(wilson(0, 8).low, 0);
  assert.equal(wilson(8, 8).high, 1);
  assert.throws(() => wilson(5, 4));
  assert.throws(() => wilson(1.5, 4));
});

test('outcome summaries keep modes apart, keep exclusions visible and count distinct groups', () => {
  // Validator input only. These rows are not match results.
  const rows = [
    { mode: 7, groupId: 'G1', outcome: 'Blue', alienCoWin: true, included: true },
    { mode: 7, groupId: 'G1', outcome: 'Red', alienCoWin: false, included: true },
    { mode: 7, groupId: 'G2', outcome: 'Draw', alienCoWin: false, included: false },
    { mode: 9, groupId: 'G3', outcome: 'Blue', alienCoWin: false, included: true },
  ];
  const [seven, eight, nine] = summarizeOutcomes(rows);
  assert.deepEqual([seven.recorded, seven.included, seven.excluded, seven.distinctGroups], [3, 2, 1, 1]);
  assert.equal(seven.largestGroupShare, 1);
  assert.equal(seven.outcomes.Blue.numerator, 1);
  assert.equal(seven.outcomes.Blue.denominator, 2);
  assert.equal(seven.alienCoWin.numerator, 1);
  assert.deepEqual([eight.recorded, eight.outcomes.Blue.point], [0, null]);
  assert.deepEqual([nine.included, nine.outcomes.Blue.numerator], [1, 1]);
});

test('the scan bound and damage budget have the properties the audit relies on', () => {
  for (const mode of [7, 8, 9]) {
    const rows = scanInformationBound(mode);
    assert.equal(rows.length, 6);
    for (let index = 1; index < rows.length; index += 1) assert.ok(rows[index].correctStates >= rows[index - 1].correctStates);
    assert.equal(rows[5].probability === 1, mode === 7);
    assert.equal(damageBudget(mode).alienSoloReachable, false);
  }
});

test('setups derive deterministically from their seed', () => {
  const plan = { roles: 'seeded', rooms: 'seeded', orders: 'seeded' };
  assert.deepEqual(deriveSetup(9, 'walk-1', plan), deriveSetup(9, 'walk-1', plan));
  assert.notDeepEqual(deriveSetup(9, 'walk-1', plan).roundOrders, deriveSetup(9, 'walk-2', plan).roundOrders);
});

test('the blank match record is valid as a template and names every section', () => {
  const template = JSON.parse(readFileSync(new URL('docs/balance/playtest/match-record.template.json', root), 'utf8'));
  assert.equal(template.schema, MATCH_RECORD_SCHEMA);
  assert.equal(template.recordStatus, 'template');
  assert.deepEqual(validateMatchRecord(template), []);
  const schema = JSON.parse(readFileSync(new URL('docs/balance/telemetry-export.schema.json', root), 'utf8'));
  for (const section of schema.required) assert.ok(section in template, `template lacks ${section}`);
  assert.deepEqual(Object.keys(template).sort(), Object.keys(schema.properties).sort());
});

test('the record validator enforces separation by mode, consent, exclusions and the collection limits', () => {
  // A synthetic record for the validator only. It is not a played match.
  const roles = setup.roleOrder;
  const factionOf = role => (role === 'Alien' ? 'Alien' : ['Undercover', 'Hacker', 'Red Disabler'].includes(role) ? 'Red' : 'Blue');
  const record = () => ({
    schema: MATCH_RECORD_SCHEMA, classification: 'restricted-research', recordStatus: 'complete',
    provenance: { matchId: 'validator-fixture', playedOn: '2026-10-06', mode: 7, optionalPowers: false, rulesetVersion: 'in-person-v1-2026-10-06', rulesetHash: 'a'.repeat(64), sourceManifestSha256: 'b'.repeat(64), engineVersion: 'x', engineCommit: 'y', protocolVersion: 2, groupId: 'G', facilitatorId: 'F', cohort: 'direct-shot-v1' },
    session: {}, participants: roles.map((role, index) => ({ participantId: `P-AAA${index}`, seat: `seat-${index + 1}`, role, faction: factionOf(role), priorMatches: 0, consentRecorded: true })),
    rulesDeviations: [], outcome: { terminal: 'Finished', result: 'Blue', alienCoWin: true, victoryCause: 'blue-power', round: 5, checkpoint: 'normal-resolution' },
    pace: {}, agency: [], combat: [], officer: null, information: { hackContentRecorded: false }, endgame: {}, experience: [], ruleProblems: [],
    exclusion: { excluded: false, reasons: [], note: '' }, facilitatorNotes: '',
  });
  assert.deepEqual(validateMatchRecord(record()), []);
  const broken = change => { const next = record(); change(next); return validateMatchRecord(next).join(' | '); };
  assert.match(broken(r => { r.participants.pop(); }), /needs exactly 7 participants/);
  assert.match(broken(r => { r.participants[0].role = 'Officer'; }), /roles must be exactly the mode-7 roles/);
  assert.match(broken(r => { r.provenance.optionalPowers = true; }), /optionalPowers: false/);
  assert.match(broken(r => { r.participants[0].consentRecorded = false; }), /consent must be recorded/);
  assert.match(broken(r => { r.participants[0].participantId = 'amir@example.com'; }), /must be a pseudonym/);
  assert.match(broken(r => { r.outcome.result = 'Draw'; r.outcome.victoryCause = 'draw'; }), /Draw is recorded only at the showdown/);
  assert.match(broken(r => { r.outcome.alienCoWin = true; r.outcome.result = 'Red'; r.outcome.victoryCause = 'red-code'; }), /co-win is recorded only with a Blue win/);
  assert.match(broken(r => { r.outcome.terminal = 'Aborted'; r.outcome.result = null; }), /must be excluded from outcome rates and stay visible/);
  assert.match(broken(r => { r.exclusion.excluded = true; }), /needs at least one reason/);
  assert.match(broken(r => { r.information.hackContentRecorded = true; }), /not collected by default/);
  assert.match(broken(r => { r.information.hackAnswer = 'yes'; }), /must not be collected/);
  assert.match(broken(r => { r.participants[0].email = 'someone@example.com'; }), /must not be collected/);
  assert.match(broken(r => { r.officer = {}; }), /Officer section exists only in mode 9/);
  assert.match(broken(r => { r.experience = [{ clarity: 6 }]; }), /must be 1\.\.5/);
});
