// Tests of the balance tooling itself: that the runner never reports an unexecuted or blocked
// case as passed, that the invariants fire, and that the statistics and the record validator
// behave as the playtest plan says.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  MATCH_RECORD_SCHEMA, buildReport, checkSetup, checkState, checkTransition, controlVerdict, controlsFor, damageBudget, deriveSetup, runControls,
  runScenario, scanInformationBound, startLedger, summarize, summarizeOutcomes, toEvidence, validateMatchRecord, walk, wilson,
} from '@mothership/balance';
import { ENGINE_COMMIT_BASIS, audiencesToldApart, exceptionProblems, expectedCode, factionOf, hasTwin, judgeLeak, twinSetup, unexercised, validateScenario } from '@mothership/balance';
import { LEAKS, leakModes, withSupplyDisclosure } from './support/disclosing.mjs';
import {
  MANIFEST, TREE_COMMIT, allowlist, catalogue, cleanReports, copy, disk, eachIsNamed, everyReport, first, judge, probed, runOf, unprobed,
} from './support/gate-reports.mjs';
import { openingObservation, stubAdapter } from './support/stub.mjs';

const root = new URL('../../', import.meta.url);
const setup = deriveSetup(7, 'v1-A-1', { roles: 'canonical', rooms: 'all-a', orders: 'seeded' });
const scenario = (status, steps, extra = {}) => ({
  id: 'V1-M7-SETUP-01', group: 'mode-7', mode: 7, title: 'tooling test', status, kind: 'rules_correctness', areas: ['mode-setup'],
  ruleRefs: ['R-SETUP-01'], dependsOn: [], lineage: [], decisionIds: status === 'blocked' ? ['D11'] : [], optionalPowers: false, setup, steps, note: '', ...extra,
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
  // An engine that refuses the setup cannot be probed. The case is still blocked, not failed.
  const unprobed = runScenario(scenario('blocked', steps), stubAdapter({ refuseSetup: true }), '');
  assert.equal(unprobed.status, 'blocked');
  assert.match(unprobed.reason, /probe could not be completed: the engine refused a legal setup/);
  assert.deepEqual(unprobed.probes, []);
});

test('a controls run fails when a baseline does not pass, when a control is missed and when nothing ran', () => {
  // Integration review finding R2: a failing baseline used to be counted and skipped, and the run still succeeded.
  const ready = scenario('ready', [refused, roundOne]);
  const controls = controlsFor(ready);
  assert.deepEqual(controls.map(control => control.kind), ['command expectation', 'asserted fact']);
  assert.equal(controls[0].scenario.steps[0].expect, 'REGISTERED');
  assert.equal(controls[1].scenario.steps[1].checks[0].equals, 2);
  assert.deepEqual(ready.steps, [refused, roundOne], 'a control is a copy; the scenario itself is untouched');

  const healthy = runControls([ready, scenario('blocked', []), scenario('manual', [], { setup: null })], stubAdapter());
  assert.deepEqual(healthy.stats, { scenarios: 1, controls: 2, detected: 2, undetected: 0, baselineNotPassing: 0 });
  assert.deepEqual(controlVerdict([healthy]), { passed: true, problems: [] });

  const refusing = runControls([ready], stubAdapter({ refuseSetup: true }));
  assert.deepEqual(refusing.stats, { scenarios: 1, controls: 0, detected: 0, undetected: 0, baselineNotPassing: 1 });
  assert.match(refusing.baselineFailures[0], /V1-M7-SETUP-01: the engine refused a legal setup/);
  const verdict = controlVerdict([refusing]);
  assert.equal(verdict.passed, false);
  assert.match(verdict.problems.join(' | '), /1 of 1 ready scenarios do not pass unmodified.*no control was executed/);
  // One mode failing its baselines fails the whole run, however well the others did.
  assert.equal(controlVerdict([healthy, refusing]).passed, false);

  // A stand-in that refuses the command while the baseline runs (twice, for the replay) and accepts
  // it afterwards: the control with the flipped expectation then passes, which is a missed control.
  let calls = 0;
  const drifting = { ...stubAdapter(), createMatch: (...args) => ({ ...stubAdapter().createMatch(...args), command: () => { calls += 1; return calls <= 2 ? 'NOT_ALLOWED' : 'REGISTERED'; } }) };
  const missed = runControls([scenario('ready', [refused])], drifting);
  assert.deepEqual(missed.stats, { scenarios: 1, controls: 1, detected: 0, undetected: 1, baselineNotPassing: 0 });
  assert.deepEqual(missed.undetected, ['V1-M7-SETUP-01 step 0 (command expectation)']);
  assert.match(controlVerdict([missed]).problems.join(' | '), /1 of 1 controls were not detected/);
  assert.match(controlVerdict([]).problems.join(' | '), /no control was executed/);
});

test('a playout against an engine that refuses the setup is reported as unfinished, not thrown and not passed', () => {
  const result = walk(stubAdapter({ refuseSetup: true }), 7, 'walk-1');
  assert.equal(result.completed, false);
  assert.equal(result.violations.length, 1);
  assert.match(result.violations[0].message, /the engine or its adapter threw: stub refuses this setup/);
  assert.equal(walk(stubAdapter({ refuseSetup: true }), 7, 'walk-1').endDigest, result.endDigest);
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

test('a command may close no window, and only the Captain\'s own release choice is left unjudged', () => {
  const inPhase = (kind, id) => {
    const observation = openingObservation(setup);
    observation.phaseKind = kind;
    observation.phaseId = id;
    observation.publicView.phaseKind = kind;
    observation.raw.public.phaseKind = kind;
    return observation;
  };
  const closes = 'a command changed the phase';
  const violations = (prev, next, event) => checkTransition(setup, prev, next, event, startLedger(prev));
  const choice = { kind: 'command', actor: 'seat-1', command: { type: 'RELEASE_CHOICE', target: 'seat-2' }, outcome: 'REGISTERED' };
  // D17: whether the choice closes its own window is undecided, so neither answer is a violation.
  const closed = violations(inPhase('RELEASE_CHOICE', 'phase-7'), inPhase('RELEASE_VOTE', 'phase-8'), choice);
  assert.ok(!closed.some(item => item.message.includes(closes) || item.invariant === 'INV-VIEW-03'));
  // With the window still open the same choice must stay invisible to everyone else.
  const leaked = inPhase('RELEASE_CHOICE', 'phase-7');
  leaked.raw.public.releaseTarget = 'seat-2';
  leaked.revisions.public += 1;
  assert.ok(violations(inPhase('RELEASE_CHOICE', 'phase-7'), leaked, choice).some(item => item.invariant === 'INV-VIEW-03'));
  // A ballot never closes a vote, and a refused choice never closes anything.
  const ballot = { kind: 'command', actor: 'seat-1', command: { type: 'VOTE', target: 'seat-2' }, outcome: 'REGISTERED' };
  assert.ok(violations(inPhase('JAIL_VOTE', 'phase-7'), inPhase('CAPTAIN_ELECTION', 'phase-8'), ballot).some(item => item.message.includes(closes)));
  const refusedChoice = { ...choice, outcome: 'NOT_ALLOWED' };
  assert.ok(violations(inPhase('RELEASE_CHOICE', 'phase-7'), inPhase('RELEASE_VOTE', 'phase-8'), refusedChoice).some(item => item.message.includes(closes)));
});

test('a window that nobody could use is reported (reading D37)', () => {
  const inPhase = (kind, id) => {
    const observation = openingObservation(setup);
    observation.phaseKind = kind;
    observation.phaseId = id;
    return observation;
  };
  const opened = (next, event = { kind: 'advance', atMs: 0, advanced: true }) => {
    const prev = inPhase('ORDINARY_TURN', 'phase-7');
    return checkTransition(setup, prev, next, event, startLedger(prev)).filter(item => item.invariant === 'INV-PH-07');
  };
  // The stand-in opening has no Captain and nobody in Jail, and lists no candidate.
  assert.equal(opened(inPhase('RELEASE_CHOICE', 'phase-8')).length, 1);
  assert.equal(opened(inPhase('CAPTAIN_ELECTION', 'phase-8')).length, 1);
  const usable = inPhase('RELEASE_CHOICE', 'phase-8');
  usable.truth.seats[0].captain = true;
  usable.truth.seats[1].jailed = true;
  assert.equal(opened(usable).length, 0);
  usable.truth.releaseUsed = true;
  assert.equal(opened(usable).length, 1);
  const contested = inPhase('CAPTAIN_ELECTION', 'phase-8');
  contested.publicView.eligibleTargets = ['seat-1'];
  assert.equal(opened(contested).length, 0);
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
  // The blank record must conform to the schema: required keys, no extra keys, types and enums.
  const kind = value => (value === null ? 'null' : Array.isArray(value) ? 'array' : Number.isInteger(value) ? 'integer' : typeof value);
  const fits = (value, spec) => {
    if ('const' in spec) return value === spec.const;
    if ('enum' in spec) return spec.enum.includes(value);
    if ('oneOf' in spec) return spec.oneOf.some(option => fits(value, option));
    if (spec.type === undefined) return true;
    const allowed = [spec.type].flat();
    return allowed.includes(kind(value)) || (kind(value) === 'integer' && allowed.includes('number'));
  };
  const problems = [];
  const walk = (value, spec, path) => {
    if (!fits(value, spec)) problems.push(`${path}: ${JSON.stringify(value)} does not fit the schema`);
    if (kind(value) !== 'object' || spec.properties === undefined) return;
    for (const key of spec.required ?? []) if (!(key in value)) problems.push(`${path}.${key} is required`);
    for (const [key, item] of Object.entries(value)) {
      if (key in spec.properties) walk(item, spec.properties[key], `${path}.${key}`);
      else if (spec.additionalProperties === false) problems.push(`${path}.${key} is not in the schema`);
    }
  };
  walk(template, schema, 'record');
  assert.deepEqual(problems, []);
});

test('consent and a pseudonym are required for every kept participant, whatever the record status', () => {
  const template = JSON.parse(readFileSync(new URL('docs/balance/playtest/match-record.template.json', root), 'utf8'));
  // The integration review's probe (R1): the blank record, one mode, marked incomplete and
  // excluded, holding fictional participants. Incomplete records are the normal case until the
  // server export exists, so nothing about a person may be waived for them.
  const incomplete = (...participants) => {
    const record = structuredClone(template);
    record.recordStatus = 'incomplete';
    record.provenance.mode = 7;
    record.exclusion = { ...record.exclusion, excluded: true, reasons: ['incomplete-record'] };
    record.participants = participants;
    return validateMatchRecord(record).join(' | ');
  };
  const person = { participantId: 'P-TEST1', seat: 'seat-1', role: 'Insider', faction: 'Blue', consentRecorded: true };
  const other = { participantId: 'P-TEST2', seat: 'seat-2', role: 'Cracker', faction: 'Blue', consentRecorded: true };
  assert.equal(incomplete(person), '');
  assert.equal(incomplete(person, other), '');
  assert.match(incomplete({ ...person, consentRecorded: false }), /participant P-TEST1: consent must be recorded/);
  const { consentRecorded: omitted, ...withoutConsent } = person;
  assert.equal(omitted, true);
  assert.match(incomplete(withoutConsent), /consent must be recorded/);
  assert.match(incomplete({ ...person, consentRecorded: 'yes' }), /consent must be recorded/);
  assert.match(incomplete(person, { ...other, consentRecorded: false }), /participant P-TEST2: consent must be recorded/);
  assert.match(incomplete({ ...person, participantId: 'Amir' }), /must be a pseudonym/);
  assert.match(incomplete({ ...person, participantId: 'P-1' }), /must be a pseudonym/);
  const { participantId: dropped, ...unnamed } = person;
  assert.equal(dropped, 'P-TEST1');
  assert.match(incomplete(unnamed), /must be a pseudonym/);
  assert.match(incomplete(person, { ...other, participantId: 'P-TEST1' }), /appears twice/);
  assert.match(incomplete('P-TEST1'), /participant 1 must be an object/);
  // What an incomplete record does say must still be possible in its mode.
  assert.match(incomplete(person, { ...other, seat: 'seat-1' }), /must occupy different seats/);
  assert.match(incomplete({ ...person, seat: 'seat-8' }), /must occupy different seats/);
  assert.match(incomplete({ ...person, role: 'Officer' }), /must hold different roles of the mode-7 game/);
  assert.match(incomplete({ ...person, faction: 'Red' }), /faction does not follow the role/);
  assert.match(incomplete({ ...person, priorMatches: -1 }), /priorMatches must be a whole number/);
  // Incompleteness relaxes what the table could not know yet, and nothing else.
  assert.equal(incomplete({ participantId: 'P-TEST3', seat: null, role: null, faction: null, priorMatches: null, consentRecorded: true }), '');
  // A template is blank. It cannot be used to keep a participant unchecked, with or without a mode.
  const smuggled = structuredClone(template);
  smuggled.participants = [{ ...person, consentRecorded: false }];
  assert.match(validateMatchRecord(smuggled).join(' | '), /a template holds no participants/);
  smuggled.provenance.mode = 7;
  assert.match(validateMatchRecord(smuggled).join(' | '), /a template holds no participants/);
  // A record of an unknown mode is refused, and its participants are still checked.
  const noMode = structuredClone(template);
  noMode.recordStatus = 'incomplete';
  noMode.participants = [{ ...person, consentRecorded: false }];
  assert.match(validateMatchRecord(noMode).join(' | '), /consent must be recorded.*provenance\.mode must be 7, 8 or 9/);
  // Calling a record a template does not excuse its shape: every section is still required.
  const hollow = { schema: template.schema, classification: template.classification, recordStatus: 'template', provenance: { mode: null }, information: { hackContentRecorded: false } };
  const missing = validateMatchRecord(hollow).join(' | ');
  for (const part of ['participants must be a list', 'outcome is required', 'exclusion.excluded and exclusion.reasons are required', 'experience must be a list', 'ruleProblems must be a list', 'rulesDeviations must be a list']) {
    assert.ok(missing.includes(part), `a hollow template should report: ${part}`);
  }
  assert.match(validateMatchRecord({ ...template, provenance: null }).join(' | '), /provenance is required/);
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
  // The name a player types in the lobby is a name, whatever a contract calls the field.
  for (const key of ['displayName', 'playerName', 'nickname']) assert.match(broken(r => { r.participants[0][key] = 'Ada'; }), new RegExp(`participants\\[0\\]\\.${key}: this field must not be collected`), key);
  assert.match(broken(r => { r.information.hackAnswer = 'yes'; }), /must not be collected/);
  assert.match(broken(r => { r.participants[0].email = 'someone@example.com'; }), /must not be collected/);
  assert.match(broken(r => { r.officer = {}; }), /Officer section exists only in mode 9/);
  assert.match(broken(r => { r.experience = [{ clarity: 6 }]; }), /must be 1\.\.5/);
});

// Paired cases. A stand-in engine with one made-up command, TELL: the player it names is told so
// in their own view, and nobody else is told anything. Two runs that name different players must
// then look different to those two players and the same to everyone else.
const telling = ({ refuse = null, where = 'view', turns = false } = {}) => stubAdapter({
  outcomes: Array(8).fill('REGISTERED'), turns,
  mutate(observation, actor, command) {
    if (command.target === refuse) throw new Error('the stand-in refuses to name this player');
    if (where === 'view') observation.raw.players[command.target] = { ...observation.raw.players[command.target], told: true };
    else observation.raw.also = { players: { ...(observation.raw.also?.players ?? {}), [command.target]: { told: true } } };
    observation.revisions.players[command.target] += 1;
    return observation;
  },
});
const tell = (target, twin) => ({ op: 'command', actor: '@Supplier', command: { type: 'TELL', target }, expect: 'REGISTERED', ...(twin === undefined ? {} : { twin: { type: 'TELL', target: twin } }) });
const compare = (...checks) => ({ op: 'assert', checks });
const same = audiences => ({ sameAsTwin: { audiences } });
const differs = audiences => ({ differsFromTwin: { audiences } });

test('a paired case compares what each audience can read in two runs that differ in one command', () => {
  const pair = [tell('@Insider', '@Cracker'), compare(same('public'), same({ allPlayersExcept: ['@Insider', '@Cracker'] }), differs({ players: ['@Insider', '@Cracker'] }))];
  const passed = runScenario(scenario('ready', pair), telling(), '');
  assert.equal(passed.status, 'passed', passed.failure?.message);

  // Told to look the same where the two runs differ: the audience that can tell is named.
  const insider = setup.roleOrder.indexOf('Insider') + 1;
  const leak = runScenario(scenario('ready', [tell('@Insider', '@Cracker'), compare(same({ players: ['@Insider', '@Hacker'] }))]), telling(), '');
  assert.equal(leak.status, 'failed');
  assert.equal(leak.failure.message, `the twin run does not look the same to: seat-${insider}`);
  // Told to differ where nothing depends on the difference: the audience that learns nothing is named.
  const silent = runScenario(scenario('ready', [tell('@Insider', '@Cracker'), compare(differs('public'), differs({ players: ['@Insider'] }))]), telling(), '');
  assert.equal(silent.status, 'failed');
  assert.equal(silent.failure.message, 'the twin run looks exactly the same to: public');

  // What an audience can read beside its view is compared as well: a further read cannot hide a difference.
  assert.equal(runScenario(scenario('ready', pair), telling({ where: 'beside the view' }), '').status, 'passed');
  const beside = runScenario(scenario('ready', [tell('@Insider', '@Cracker'), compare(same({ players: ['@Insider'] }))]), telling({ where: 'beside the view' }), '');
  assert.equal(beside.failure.message, `the twin run does not look the same to: seat-${insider}`);

  // A twin of nothing: the twin run does not send the command at all. The two runs then differ in
  // whether anybody was told, which is what the named player may see and nobody else.
  const once = { ...tell('@Insider'), twin: null };
  assert.ok(hasTwin(scenario('ready', [once])));
  const whether = runScenario(scenario('ready', [once, compare(differs({ players: ['@Insider'] }), same({ allPlayersExcept: ['@Insider', '@Supplier'] }))]), telling(), '');
  assert.equal(whether.status, 'passed', whether.failure?.message);
  // The sender can tell as well as the player named: a receipt came back in one run and none in the other.
  const supplier = setup.roleOrder.indexOf('Supplier') + 1;
  const everyone = runScenario(scenario('ready', [once, compare(same('all-players'))]), telling(), '');
  assert.deepEqual(audiencesToldApart(everyone.failure.message).sort(), [`seat-${insider}`, `seat-${supplier}`].sort());
  assert.equal(audiencesToldApart('view of @Supplier: something else'), null);
  // The step keeps its place in the twin run, so a later comparison is made at the same moment.
  const later = runScenario(scenario('ready', [roundOne, once, roundOne, compare(same('public'), differs({ players: ['@Insider'] }))]), telling(), '');
  assert.equal(later.status, 'passed', later.failure?.message);

  // The twin run is a run of its own: if it cannot be completed there is nothing sound to compare with.
  const broken = runScenario(scenario('ready', pair), telling({ refuse: `seat-${setup.roleOrder.indexOf('Cracker') + 1}` }), '');
  assert.equal(broken.status, 'failed');
  assert.match(broken.failure.message, /^the twin run could not be completed: adapter or engine error: the stand-in refuses to name this player/);

  // Each comparison has its control: the opposite claim must fail.
  const controls = controlsFor(scenario('ready', pair));
  assert.deepEqual(controls.map(control => control.kind), ['command expectation', 'asserted fact', 'asserted fact', 'asserted fact']);
  assert.ok('differsFromTwin' in controls[1].scenario.steps[1].checks[0] && 'sameAsTwin' in controls[3].scenario.steps[1].checks[2]);
  const run = runControls([scenario('ready', pair)], telling());
  assert.deepEqual(run.stats, { scenarios: 1, controls: 4, detected: 4, undetected: 0, baselineNotPassing: 0 });
});

test('a paired case with a twin setup shows that a fact does not give away who holds a role', () => {
  const swapped = scenario('ready', [compare(same({ allPlayersExcept: ['@Supplier', '@Blue Disabler'] }))], { twin: { swapRoles: ['Supplier', 'Blue Disabler'] } });
  assert.ok(hasTwin(swapped));
  const twin = twinSetup(swapped, setup);
  assert.equal(twin.roleOrder.indexOf('Supplier'), setup.roleOrder.indexOf('Blue Disabler'));
  assert.equal(twin.roleOrder.indexOf('Blue Disabler'), setup.roleOrder.indexOf('Supplier'));
  assert.deepEqual(twin.roleOrder.filter(role => role !== 'Supplier' && role !== 'Blue Disabler'), setup.roleOrder.filter(role => role !== 'Supplier' && role !== 'Blue Disabler'));
  assert.deepEqual(validateScenario(swapped), []);
  // The stand-in's views hold each player's own role and nothing about anyone else's.
  assert.equal(runScenario(swapped, stubAdapter(), '').status, 'passed');
  // The two players who changed roles do see a difference, which is why they are left out.
  const themselves = runScenario(scenario('ready', [compare(same({ players: ['@Insider', '@Supplier'] }))], { twin: { swapRoles: ['Supplier', 'Blue Disabler'] } }), stubAdapter(), '');
  assert.equal(themselves.status, 'failed');
  assert.match(themselves.failure.message, /^the twin run does not look the same to: seat-\d$/);
});

test('a paired case with a twin Code shows that a fact does not give away the Code', () => {
  // The stand-in's raw views hold no Code. This one puts the Code where Alien can read it, as an engine does.
  const knowing = () => {
    const inner = stubAdapter();
    return {
      pins: inner.pins,
      createMatch(given, id) {
        const match = inner.createMatch(given, id);
        const alien = `seat-${given.roleOrder.indexOf('Alien') + 1}`;
        return { ...match, observe() { const seen = match.observe(); seen.raw.players[alien] = { ...seen.raw.players[alien], code: seen.truth.code }; return seen; } };
      },
    };
  };
  const seatOf = role => `seat-${setup.roleOrder.indexOf(role) + 1}`;
  const code = expectedCode(setup);
  const spare = Object.keys(setup.initialRooms).find(seat => !code.includes(seat) && seat !== seatOf('Undercover'));
  const other = { twin: { codeExtras: [...setup.codeExtraSeatIds.slice(0, 2), spare].sort() } };
  const steps = [compare(differs({ players: ['@Alien'] }), same({ allPlayersExcept: ['@Alien'] }))];
  const paired = scenario('ready', steps, other);
  assert.ok(hasTwin(paired));
  assert.deepEqual(validateScenario(paired), []);
  const twin = twinSetup(paired, setup);
  assert.deepEqual(twin.codeExtraSeatIds, other.twin.codeExtras);
  assert.deepEqual({ ...twin, codeExtraSeatIds: setup.codeExtraSeatIds }, setup, 'nothing else changes');
  assert.notDeepEqual(expectedCode(twin), code);
  assert.equal(runScenario(paired, knowing(), '').status, 'passed');
  // Against a binding in which nobody is told the Code, the claim that Alien sees a difference fails.
  assert.equal(runScenario(paired, stubAdapter(), '').failure.message, `the twin run looks exactly the same to: ${seatOf('Alien')}`);
  // A mark on the seats that follows the Code, in a read that everyone has: the table can tell the two runs apart.
  assert.equal(runScenario(paired, withSupplyDisclosure(knowing(), 'code-mark-to-table'), '').failure.message, 'the twin run does not look the same to: public');

  const issues = (checks, extra = other) => validateScenario(scenario('ready', [compare(...checks)], extra)).join('\n');
  // Alien may be told the two runs apart. Nobody may be asked to see the same who knows the Code.
  for (const audiences of ['all-players', { players: ['@Alien'] }, { players: [seatOf('Alien')] }, { allPlayersExcept: ['@Hacker'] }]) {
    assert.match(issues([same(audiences)]), /a comparison with a twin Code must leave out Alien, who knows the Code/, JSON.stringify(audiences));
  }
  assert.equal(issues([same('public'), same({ allPlayersExcept: [seatOf('Alien')] }), differs('all-players')]), '');
  // The twin Code has to be another Code, and a legal one.
  const sameCode = { twin: { codeExtras: [...setup.codeExtraSeatIds].reverse() } };
  assert.match(issues([same('public')], sameCode), /a twin Code has three other numbers than the Code of this setup/);
  assert.match(issues([same('public')], { twin: { codeExtras: setup.codeExtraSeatIds.slice(0, 2) } }), /a twin Code has three other numbers than the Code of this setup/);
  for (const seat of [seatOf('Alien'), seatOf('Undercover'), setup.codeExtraSeatIds[0]]) {
    assert.match(issues([same('public')], { twin: { codeExtras: [...setup.codeExtraSeatIds.slice(0, 2), seat] } }), /the twin setup is not a legal setup|a twin Code has three other numbers/, seat);
  }
});

test('a watch compares the two runs in every phase on its way, and finds what a comparison at chosen moments steps over', () => {
  // A stand-in whose turns pass, and in which a TELL is shown to the table two turns later and for one turn only.
  const phaseOf = observation => Number(observation.phaseId.split('-')[1]);
  const briefly = () => stubAdapter({
    outcomes: Array(8).fill('REGISTERED'), turns: true,
    mutate(observation, actor, command) {
      observation.raw.players[command.target] = { ...observation.raw.players[command.target], told: true };
      observation.revisions.players[command.target] += 1;
      observation.toldAt = { target: command.target, phase: phaseOf(observation) };
      return observation;
    },
    onTurn(observation, phase) {
      delete observation.raw.public.heard;
      if (observation.toldAt !== undefined && phase === observation.toldAt.phase + 2) observation.raw.public.heard = observation.toldAt.target;
      return observation;
    },
  });
  const order = setup.roundOrders[0];
  const others = { allPlayersExcept: ['@Insider', '@Cracker'] };
  const tellNow = tell('@Insider', '@Cracker');
  // Compared at once and three turns later, the two runs look the same: the table was told in between.
  const sampled = [tellNow, compare(same(others)), { op: 'until', active: order[3] }, compare(same(others))];
  assert.equal(runScenario(scenario('ready', sampled), briefly(), '').status, 'passed');
  // Watched over the same three turns, it is found, with the turn in which it first showed.
  const watched = scenario('ready', [tellNow, { op: 'watch', active: order[3], sameAsTwin: { audiences: others } }]);
  assert.deepEqual(validateScenario(watched), []);
  const found = runScenario(watched, briefly(), '');
  assert.equal(found.status, 'failed');
  assert.equal(found.failure.op, 'watch');
  assert.equal(found.failure.message, `the twin run does not look the same to: public (first at Round 1, ORDINARY_TURN of ${order[2]})`);
  assert.deepEqual(audiencesToldApart(found.failure.message), ['public']);
  // Where nothing is told in between, the watch passes, and it has compared four phases.
  const quiet = () => telling({ turns: true });
  assert.equal(runScenario(watched, quiet(), '').status, 'passed', runScenario(watched, quiet(), '').failure?.message);
  // Its control is the opposite claim about the same span, and it fails in the first phase.
  const controls = controlsFor(watched);
  assert.deepEqual(controls.map(control => [control.kind, control.where]), [['command expectation', 'step 0'], ['asserted fact', 'step 1']]);
  assert.ok('differsFromTwin' in controls[1].scenario.steps[1] && !('sameAsTwin' in controls[1].scenario.steps[1]));
  assert.equal(runScenario(controls[1].scenario, quiet(), '').failure.message, `the twin run looks exactly the same to: ${['public', ...Object.keys(setup.initialRooms).filter(seat => seat !== `seat-${setup.roleOrder.indexOf('Insider') + 1}` && seat !== `seat-${setup.roleOrder.indexOf('Cracker') + 1}`)].join(', ')} (first at Round 1, ORDINARY_TURN of ${order[0]})`);
  assert.deepEqual(runControls([watched], quiet()).stats, { scenarios: 1, controls: 2, detected: 2, undetected: 0, baselineNotPassing: 0 });
  // A leak found by a watch counts as caught, with the audience it names.
  assert.deepEqual(judgeLeak('a-leak', 'x', [7], [{ scenario: watched, run: found }], new Set([watched.id])), { caughtBy: [{ scenario: watched.id, couldTell: ['public'] }], problems: [] });
  // A blocked case may not watch, as it may not assert.
  assert.match(validateScenario(scenario('blocked', [{ op: 'watch', active: order[1], sameAsTwin: { audiences: 'public' } }])).join('\n'), /a blocked scenario must not assert an outcome/);
});

test('two runs are compared only at the same moment, and by everything a player was given, receipts included', () => {
  const order = setup.roundOrders[0];
  const seatOf = role => `seat-${setup.roleOrder.indexOf(role) + 1}`;
  // In the twin run Supplier and Blue Disabler have changed seats, so "Supplier's turn" is another turn there.
  const swap = { twin: { swapRoles: ['Supplier', 'Blue Disabler'] } };
  const others = { allPlayersExcept: ['@Supplier', '@Blue Disabler'] };
  const elsewhere = runScenario(scenario('ready', [{ op: 'until', active: '@Supplier' }, compare(same(others))], swap), stubAdapter({ turns: true }), '');
  assert.equal(elsewhere.status, 'failed');
  assert.equal(elsewhere.failure.message, `the two runs are not at the same moment here: this run is at Round 1, ORDINARY_TURN of ${seatOf('Supplier')}, its twin at Round 1, ORDINARY_TURN of ${seatOf('Blue Disabler')}`);
  // A claim that the two runs differ fails there as well: a difference of moments is not one of knowledge.
  const differing = runScenario(scenario('ready', [{ op: 'until', active: '@Supplier' }, compare(differs({ players: ['@Insider'] }))], swap), stubAdapter({ turns: true }), '');
  assert.match(differing.failure.message, /^the two runs are not at the same moment here/);
  // At a turn that is the same player's in both runs the comparison is sound.
  const third = setup.roleOrder.find(role => role !== 'Supplier' && role !== 'Blue Disabler' && seatOf(role) !== order[0]);
  assert.equal(runScenario(scenario('ready', [{ op: 'until', active: `@${third}` }, compare(same(others))], swap), stubAdapter({ turns: true }), '').status, 'passed');

  // Receipts. Supplier names the same seat in both runs; in the twin run that seat is held by a player of another team.
  const named = seatOf('Insider');
  const teams = { twin: { swapRoles: ['Insider', 'Hacker'] } };
  const names = { op: 'command', actor: '@Supplier', command: { type: 'TELL', target: named }, expect: 'REGISTERED' };
  const toSupplier = [names, compare(same({ allPlayersExcept: ['@Insider', '@Hacker'] }))];
  const plain = () => stubAdapter({ outcomes: Array(4).fill('REGISTERED') });
  assert.equal(runScenario(scenario('ready', toSupplier, teams), plain(), '').status, 'passed');
  // A receipt that says which team the named player is on tells Supplier the two runs apart, although no view changed.
  const saying = () => stubAdapter({ outcomes: Array(4).fill('REGISTERED'), receipt: (actor, command, outcome, observation) => ({ outcome, team: observation.truth.seats.find(seat => seat.seat === command.target).faction }) });
  assert.equal(runScenario(scenario('ready', toSupplier, teams), saying(), '').failure.message, `the twin run does not look the same to: ${seatOf('Supplier')}`);
  // Within one run a receipt is not part of anybody's view: what a mark holds is compared without it.
  const within = [{ op: 'mark', name: 'before' }, names, compare({ unchanged: { since: 'before', audiences: 'all-players' } })];
  assert.equal(runScenario(scenario('ready', within), saying(), '').status, 'passed');
});

test('a paired case is refused unless its difference and its comparison are both declared', () => {
  const issues = (steps, extra) => validateScenario(scenario('ready', steps, extra)).join('\n');
  const pair = [tell('@Insider', '@Cracker'), compare(same('public'))];
  assert.equal(issues(pair), '');
  assert.match(issues([tell('@Insider', '@Cracker'), roundOne]), /a twin run is declared and nothing is compared with it/);
  assert.match(issues([{ ...tell('@Insider'), twin: null }, roundOne]), /a twin run is declared and nothing is compared with it/);
  assert.equal(issues([{ ...tell('@Insider'), twin: null }, compare(same('public'))]), '');
  // Four ways to write a comparison that could not fail, each refused.
  assert.match(issues([tell('@Insider', '@Cracker'), compare(same({ players: [] }))]), /a comparison with the twin run names nobody/);
  assert.match(issues([tell('@Insider', '@Cracker'), { op: 'watch', round: 2, sameAsTwin: { audiences: { players: [] } } }]), /a comparison with the twin run names nobody/);
  assert.match(issues([tell('@Insider', '@Cracker'), compare(same({ players: ['seat-9'] }))]), /names a seat that is not in this match/);
  assert.match(issues([tell('@Insider', '@Cracker'), compare(same({ allPlayersExcept: ['seat-0'] }))]), /names a seat that is not in this match/);
  assert.match(issues([tell('@Insider', '@Insider'), compare(same('public'))]), /a twin command is the command itself, so the two runs would not differ/);
  assert.match(issues([compare(same('public')), tell('@Insider', '@Cracker'), compare(same('public'))]), /a comparison stands before the first twin command, where the two runs do not differ yet/);
  assert.match(issues([{ op: 'watch', round: 2, sameAsTwin: { audiences: 'public' } }, tell('@Insider', '@Cracker')]), /a comparison stands before the first twin command/);
  // With a twin setup the two runs differ from the start, and a comparison may stand anywhere.
  assert.equal(issues([compare(same({ allPlayersExcept: ['@Supplier', '@Blue Disabler'] })), tell('@Insider', '@Cracker')], { twin: { swapRoles: ['Supplier', 'Blue Disabler'] } }), '');
  assert.match(issues([tell('@Insider'), compare(same('public'))]), /a comparison with a twin run needs a twin command or a twin setup/);
  assert.match(validateScenario(scenario('blocked', [tell('@Insider', '@Cracker')])).join('\n'), /only a ready scenario may have a twin run/);
  const swap = { twin: { swapRoles: ['Supplier', 'Blue Disabler'] } };
  assert.equal(issues([compare(same({ allPlayersExcept: ['@Supplier', '@Blue Disabler'] }))], swap), '');
  // A seat written as a number is the same player as the role that sits there.
  const seatOf = role => `seat-${setup.roleOrder.indexOf(role) + 1}`;
  assert.equal(issues([compare(same({ allPlayersExcept: [seatOf('Supplier'), seatOf('Blue Disabler')] }))], swap), '');
  for (const audiences of ['all-players', { players: ['@Insider', '@Supplier'] }, { allPlayersExcept: ['@Supplier'] }, { players: [seatOf('Blue Disabler')] }, { allPlayersExcept: ['@Supplier', seatOf('Insider')] }]) {
    assert.match(issues([compare(same(audiences))], swap), /must leave out the two players who change roles/, JSON.stringify(audiences));
  }
  assert.match(issues([compare(same('public'))], { twin: { swapRoles: ['Supplier', 'Supplier'] } }), /swaps two different roles of this setup/);
  assert.match(issues([compare(same('public'))], { twin: { swapRoles: ['Supplier', 'Officer'] } }), /swaps two different roles of this setup/);
  // Undercover may not sit on a number of the Code: a swap that puts them there is not a legal setup.
  const inCode = setup.roleOrder[Number(setup.codeExtraSeatIds[0].slice(5)) - 1];
  assert.match(issues([compare(same('public'))], { twin: { swapRoles: ['Undercover', inCode] } }), /the twin setup is not a legal setup/);
});

test('whom Supplier armed is read from the engine, and an engine that says nothing is not one that names nobody', () => {
  const armed = [{ op: 'assert', checks: [{ visible: '@Supplier', field: 'armedBySupply', sameSet: [] }] }];
  // The plain stand-in tells nobody anything about it, like the engine of finding G17.
  const untold = runScenario(scenario('ready', armed), stubAdapter(), '');
  assert.equal(untold.status, 'failed');
  assert.match(untold.failure.message, /armedBySupply: expected the set \[\], observed "nothing: this engine tells the player nothing about it"/);
  // Through the disclosure stand-in the fact exists: nobody is armed before the Supplier stage.
  const disclosing = withSupplyDisclosure(stubAdapter());
  assert.equal(runScenario(scenario('ready', armed), disclosing, '').status, 'passed');
  assert.match(disclosing.pins.adapter, /^stub with the stand-in supply-disclosure$/);
  assert.match(withSupplyDisclosure(stubAdapter(), 'armed-list-to-table').pins.adapter, /leaking: armed-list-to-table$/);
  assert.throws(() => withSupplyDisclosure(stubAdapter(), 'no-such-leak'), /unknown leak/);
  // Only Supplier's own view may name anyone.
  const observation = openingObservation(setup);
  const insider = observation.playerViews[`seat-${setup.roleOrder.indexOf('Insider') + 1}`];
  insider.knowledge.armedBySupply = ['seat-1'];
  assert.ok(checkState(setup, observation, startLedger(observation)).some(item => item.invariant === 'INV-VIEW-02' && /whom Supplier armed is given to a role other than Supplier/.test(item.message)));
});

test('the disclosure stand-in tells Supplier exactly who gained a weapon when Round 3 resolved, and each leak adds what it says', () => {
  // A scripted engine: Round 3, then Round 4 with a weapon more for two players, and after that
  // phases that only pass. It accepts Supplier's choice, a shot and a Code attempt without acting
  // on them, keeps a receipt for each command, and a test may say whose turn it is, which round
  // it is, whether a Code attempt has been made, and who has been hurt.
  const seats = Object.fromEntries(setup.roleOrder.map((role, index) => [role, `seat-${index + 1}`]));
  const scripted = (armedRoles = ['Insider', 'Cracker']) => {
    const turn = { of: null, attempt: null, round: null, hurt: null, shield: null };
    return {
      turn,
      pins: { adapter: 'scripted', engineVersion: 'none', rulesetVersion: 'none', rulesetHash: 'none', protocolVersion: 0 },
      createMatch() {
        const observation = openingObservation(setup);
        observation.round = 3;
        const receipts = {};
        return {
          observe() {
            const seen = { ...structuredClone(observation), ...(turn.of === null ? {} : { phaseKind: 'ORDINARY_TURN', activeSeat: turn.of }), ...(turn.round === null ? {} : { round: turn.round }) };
            if (turn.attempt !== null) seen.truth = { ...seen.truth, codeSubmitted: true, codeCorrect: turn.attempt };
            if (turn.hurt !== null) seen.truth.seats.find(seat => seat.seat === turn.hurt).health = 'Injured';
            if (turn.shield !== null) seen.truth.seats.find(seat => seat.seat === turn.shield).protection = 'pending';
            seen.raw = { ...seen.raw, receipts: structuredClone(receipts) };
            return seen;
          },
          command(actor, command) {
            const outcome = ['SUPPLY', 'REGISTER_SHOT', 'SUBMIT_CODE'].includes(command.type) ? 'REGISTERED' : 'NOT_ALLOWED';
            (receipts[actor] ??= []).push({ outcome });
            return outcome;
          },
          advance() {
            if (observation.round !== 3) return true;
            observation.round = 4;
            observation.phaseKind = 'JAIL_VOTE';
            observation.activeSeat = null;
            for (const role of armedRoles) observation.truth.seats.find(seat => seat.seat === seats[role]).ordinaryWeapons += 1;
            return true;
          },
          abort() {},
        };
      },
    };
  };
  const read = (leak, named = null, armedRoles = undefined) => {
    const engine = scripted(armedRoles);
    const match = withSupplyDisclosure(engine, leak).createMatch(setup, 'match');
    if (named !== null) assert.equal(match.command(seats.Supplier, { type: 'SUPPLY', targets: named }, 0), 'REGISTERED');
    const before = match.observe();
    assert.equal(match.advance(0), true);
    return { before, after: match.observe(), match, engine };
  };
  const also = (leak, role, named) => read(leak, named).after.raw.also.players[seats[role]];
  const { before, after } = read(null);
  const armed = [seats.Insider, seats.Cracker].sort();
  for (const seat of Object.values(seats)) {
    assert.deepEqual(before.playerViews[seat].knowledge.armedBySupply, []);
    assert.deepEqual([...after.playerViews[seat].knowledge.armedBySupply].sort(), seat === seats.Supplier ? armed : []);
  }
  assert.deepEqual([...after.raw.also.players[seats.Supplier].armed].sort(), armed);
  assert.deepEqual(after.raw.also.players[seats.Insider], { armed: [], received: true });
  assert.deepEqual(after.raw.also.players[seats.Hacker], { armed: [], received: false });
  assert.equal(after.raw.also.public, undefined);
  // The list keeps the order in which Supplier named them, so that a fault which depends on the order can be made.
  assert.deepEqual(also(null, 'Supplier', [seats.Cracker, seats.Insider]).armed, [seats.Cracker, seats.Insider]);

  assert.deepEqual(Object.keys(LEAKS), [
    'supplier-seat-to-recipient', 'supplier-seat-to-recipient-on-their-turn', 'other-recipient-to-recipient', 'first-recipient-to-second',
    'armed-list-to-table', 'weapons-given-count-to-table', 'recipient-team-to-supplier', 'usable-to-supplier', 'team-to-table', 'red-team-mates-to-red',
    'code-mark-to-table', 'code-verdict-to-hacker',
    'weapons-held-to-supplier', 'fired-to-supplier', 'supplier-seat-to-recipient-when-they-fire', 'supplier-seat-to-recipient-in-round-5', 'supplier-seat-to-recipient-not-blue',
    'armed-mark-when-hurt-to-table', 'registered-count-at-vote-to-table', 'alien-seat-mark-to-table', 'supplier-seat-mark-to-table', 'code-verdict-to-alien-next-phase', 'code-attempted-to-table-next-phase',
    'code-verdict-in-receipt', 'recipient-teams-in-receipt', 'protected-to-recipient-next-phase', 'scanned-to-target-next-phase',
  ]);
  // A recipient told who armed them: at once, or only once their own turn has come.
  assert.equal(also('supplier-seat-to-recipient', 'Insider').from, seats.Supplier);
  const delayed = read('supplier-seat-to-recipient-on-their-turn');
  assert.deepEqual(delayed.after.raw.also.players[seats.Insider], { armed: [], received: true });
  delayed.engine.turn.of = seats.Insider;
  const onTheirTurn = delayed.match.observe().raw.also.players;
  assert.equal(onTheirTurn[seats.Insider].from, seats.Supplier);
  assert.deepEqual(onTheirTurn[seats.Cracker], { armed: [], received: true }, 'the other recipient has not had a turn yet');
  // A recipient told about the other one: both of them, or only the one named second.
  assert.deepEqual(also('other-recipient-to-recipient', 'Insider').alsoArmed, [seats.Cracker]);
  assert.equal(also('first-recipient-to-second', 'Insider', [seats.Cracker, seats.Insider]).before, seats.Cracker);
  assert.deepEqual(also('first-recipient-to-second', 'Cracker', [seats.Cracker, seats.Insider]), { armed: [], received: true });
  // The table shown the list, or only how many.
  assert.deepEqual([...read('armed-list-to-table').after.raw.also.public.armed].sort(), armed);
  assert.deepEqual(read('weapons-given-count-to-table').after.raw.also.public, { given: 2 });
  assert.deepEqual(read('weapons-given-count-to-table').before.raw.also.public, { given: 0 });
  // Supplier told about the players they armed. Both are Blue here and neither is an Officer.
  assert.deepEqual(also('recipient-team-to-supplier', 'Supplier').marks, ['a', 'a']);
  assert.deepEqual(also('usable-to-supplier', 'Supplier').usable, [true, true]);
  // A mark that follows the team: on every seat for the table, or the other Red players for a Red player.
  const marks = Object.fromEntries(setup.roleOrder.map(role => [seats[role], { Blue: 'a', Red: 'b', Alien: 'c' }[factionOf(role)]]));
  assert.deepEqual(read('team-to-table').after.raw.also.public, { marks });
  assert.deepEqual(also('red-team-mates-to-red', 'Hacker').allies, [seats.Undercover]);
  assert.deepEqual(also('red-team-mates-to-red', 'Undercover').allies, [seats.Hacker]);
  // A mark that follows the Code, for the table. A verdict on a Code attempt, for Hacker and only once there is an attempt.
  const code = expectedCode(setup);
  assert.deepEqual(read('code-mark-to-table').after.raw.also.public, { marks: Object.fromEntries(Object.values(seats).map(seat => [seat, code.includes(seat) ? 'a' : 'b'])) });
  const attempt = read('code-verdict-to-hacker');
  assert.deepEqual(attempt.after.raw.also.players[seats.Hacker], { armed: [], received: false });
  attempt.engine.turn.attempt = true;
  assert.equal(attempt.match.observe().raw.also.players[seats.Hacker].attempt, 'a');
  attempt.engine.turn.attempt = false;
  assert.equal(attempt.match.observe().raw.also.players[seats.Hacker].attempt, 'b');
  assert.deepEqual(attempt.match.observe().raw.also.players[seats.Undercover], { armed: [], received: false });
  // The further leaks, each of which passed every paired case as the cases first stood.
  // Supplier told about the players they armed: what they then held, and who has fired, a phase after the shot.
  assert.deepEqual(also('weapons-held-to-supplier', 'Supplier').held, [1, 1]);
  const shot = read('fired-to-supplier');
  assert.equal(shot.match.command(seats.Insider, { type: 'REGISTER_SHOT', target: seats.Hacker }, 0), 'REGISTERED');
  assert.deepEqual(shot.match.observe().raw.also.players[seats.Supplier].fired, [], 'not in the phase of the shot');
  assert.equal(shot.match.advance(0), true);
  assert.deepEqual(shot.match.observe().raw.also.players[seats.Supplier].fired, [seats.Insider]);
  // A recipient told who armed them at other moments, or only when not Blue.
  const onFiring = read('supplier-seat-to-recipient-when-they-fire');
  assert.deepEqual(onFiring.after.raw.also.players[seats.Insider], { armed: [], received: true });
  onFiring.match.command(seats.Insider, { type: 'REGISTER_SHOT', target: seats.Hacker }, 0);
  assert.equal(onFiring.match.observe().raw.also.players[seats.Insider].from, seats.Supplier);
  assert.equal(onFiring.match.observe().raw.also.players[seats.Cracker].from, undefined);
  const inRound5 = read('supplier-seat-to-recipient-in-round-5');
  inRound5.engine.turn.of = seats.Insider;
  assert.equal(inRound5.match.observe().raw.also.players[seats.Insider].from, undefined, 'a Round 4 turn is not yet it');
  inRound5.engine.turn.round = 5;
  assert.equal(inRound5.match.observe().raw.also.players[seats.Insider].from, seats.Supplier);
  assert.deepEqual(also('supplier-seat-to-recipient-not-blue', 'Insider'), { armed: [], received: true });
  assert.equal(read('supplier-seat-to-recipient-not-blue', null, ['Hacker', 'Cracker']).after.raw.also.players[seats.Hacker].from, seats.Supplier);
  // The table shown something: a mark on an armed player who is hurt, a count of actions during a vote, a mark on Alien's seat.
  const hurt = read('armed-mark-when-hurt-to-table');
  assert.deepEqual(hurt.after.raw.also.public, { marked: [] });
  hurt.engine.turn.hurt = seats.Cracker;
  assert.deepEqual(hurt.match.observe().raw.also.public, { marked: [seats.Cracker] });
  hurt.engine.turn.hurt = seats.Hacker;
  assert.deepEqual(hurt.match.observe().raw.also.public, { marked: [] }, 'a player who was not armed is not marked');
  const counted = read('registered-count-at-vote-to-table', [seats.Insider, seats.Cracker]);
  assert.deepEqual(counted.before.raw.also.public, { registered: null }, 'not outside a vote');
  assert.deepEqual(counted.after.raw.also.public, { registered: 0 }, 'the count is of the round, and Round 4 has had none');
  counted.match.command(seats.Insider, { type: 'REGISTER_SHOT', target: seats.Hacker }, 0);
  assert.deepEqual(counted.match.observe().raw.also.public, { registered: 1 });
  assert.deepEqual(read('alien-seat-mark-to-table').after.raw.also.public, { marked: seats.Alien });
  assert.deepEqual(read('supplier-seat-mark-to-table').after.raw.also.public, { marked: seats.Supplier });
  // A Scan or a Protection shown to the player it concerns, from the phase after it.
  const looked = read('scanned-to-target-next-phase');
  assert.equal(looked.match.command(seats.Hacker, { type: 'SCAN', target: seats.Insider, guess: 'Blue' }, 0), 'NOT_ALLOWED');
  assert.equal(looked.match.advance(0), true);
  assert.equal(looked.match.observe().raw.also.players[seats.Insider].looked, undefined, 'a refused Scan scans nobody');
  const shielded = read('protected-to-recipient-next-phase');
  shielded.engine.turn.shield = seats.Cracker;
  assert.equal(shielded.match.observe().raw.also.players[seats.Cracker].shielded, undefined, 'not in the phase of the grant');
  assert.equal(shielded.match.advance(0), true);
  assert.equal(shielded.match.observe().raw.also.players[seats.Cracker].shielded, true);
  assert.equal(shielded.match.observe().raw.also.players[seats.Insider].shielded, undefined);
  // A Code attempt shown a phase later: its verdict to Alien, and that it was made to the table.
  for (const [leak, where, shown] of [['code-verdict-to-alien-next-phase', after => after.raw.also.players[seats.Alien].attempt, 'b'], ['code-attempted-to-table-next-phase', after => after.raw.also.public.attempted, true]]) {
    const later = read(leak);
    later.engine.turn.attempt = false;
    assert.ok([undefined, false].includes(where(later.match.observe())), `${leak}: not in the phase of the attempt`);
    assert.equal(later.match.advance(0), true);
    assert.equal(where(later.match.observe()), shown, leak);
  }
  // A receipt that says more than that the command was registered.
  const verdict = read('code-verdict-in-receipt');
  verdict.engine.turn.attempt = true;
  verdict.match.command(seats.Hacker, { type: 'SUBMIT_CODE', seats: code }, 0);
  assert.deepEqual(verdict.match.observe().raw.receipts[seats.Hacker], [{ outcome: 'REGISTERED', mark: 'a' }]);
  assert.deepEqual(read('recipient-teams-in-receipt', [seats.Hacker, seats.Cracker]).after.raw.receipts[seats.Supplier], [{ outcome: 'REGISTERED', marks: ['b', 'a'] }]);
  // Without a leak a receipt is what the engine returned, and a refused command has one too.
  const plain = read(null, [seats.Insider, seats.Cracker]);
  assert.equal(plain.match.command(seats.Insider, { type: 'MOVE', destination: 'Room B' }, 0), 'NOT_ALLOWED');
  assert.deepEqual(plain.match.observe().raw.receipts, { [seats.Supplier]: [{ outcome: 'REGISTERED' }], [seats.Insider]: [{ outcome: 'NOT_ALLOWED' }] });
  // No leak tells anything to a Blue player who was not armed and is not Supplier.
  for (const leak of Object.keys(LEAKS)) assert.deepEqual(also(leak, 'Blue Disabler'), { armed: [], received: false }, leak);
  // Every leak has to be caught with every number of players, except the one that needs an Officer.
  for (const leak of Object.keys(LEAKS)) assert.deepEqual(leakModes(leak), leak === 'usable-to-supplier' ? [9] : [7, 8, 9], leak);
});

test('a deliberate leak counts as caught only where a comparison names who could tell, and with every number of players asked for', () => {
  const insider = setup.roleOrder.indexOf('Insider') + 1;
  const at = (id, mode, steps) => ({ ...scenario('ready', steps), id, mode, group: `mode-${mode}` });
  const run = item => ({ scenario: item, run: runScenario(item, telling(), '') });
  // Three runs through the telling stand-in: one that the comparison fails, one that passes, and
  // one that cannot be completed because the stand-in throws in the twin run.
  const told = run(at('V1-M7-SUP-15', 7, [tell('@Insider', '@Cracker'), compare(same({ players: ['@Insider', '@Hacker'] }))]));
  const quiet = run(at('V1-M8-SUP-15', 8, [tell('@Insider', '@Cracker'), compare(same('public'))]));
  assert.equal(told.run.status, 'failed');
  assert.equal(quiet.run.status, 'passed');

  // The cases that pass when nothing leaks. Here every one is taken to.
  const sound = new Set(['V1-M7-SUP-15', 'V1-M8-SUP-15', 'V1-M7-SUP-16']);
  const caught = judgeLeak('a-leak', 'somebody is told something', [7], [told, quiet], sound);
  assert.deepEqual(caught, { caughtBy: [{ scenario: 'V1-M7-SUP-15', couldTell: [`seat-${insider}`] }], problems: [] });
  // Asked for with eight players as well, where every case passed: not caught there.
  assert.deepEqual(judgeLeak('a-leak', 'somebody is told something', [7, 8], [told, quiet], sound).problems, ['the leak "a-leak" (somebody is told something) was caught by no paired case with 8 players']);
  // A case that does not pass without the leak either says nothing about it, whatever it does with it.
  const unsound = judgeLeak('a-leak', 'somebody is told something', [7], [told, quiet], new Set(['V1-M8-SUP-15']));
  assert.deepEqual(unsound.caughtBy, []);
  assert.deepEqual(unsound.problems, ['with the leak "a-leak", V1-M7-SUP-15 was tried although it does not pass without the leak', 'the leak "a-leak" (somebody is told something) was caught by no paired case with 7 players']);
  // A case that fails for another reason has caught nothing, and says so.
  const thrown = { scenario: told.scenario, run: runScenario(told.scenario, telling({ refuse: `seat-${setup.roleOrder.indexOf('Cracker') + 1}` }), '') };
  assert.match(thrown.run.failure.message, /^the twin run could not be completed/);
  const other = judgeLeak('a-leak', 'somebody is told something', [7], [thrown], sound);
  assert.deepEqual(other.caughtBy, []);
  assert.equal(other.problems.length, 2);
  assert.match(other.problems[0], /^with the leak "a-leak", V1-M7-SUP-15 did not pass for a reason that is not a comparison: the twin run could not be completed/);
  assert.equal(other.problems[1], 'the leak "a-leak" (somebody is told something) was caught by no paired case with 7 players');
  // A step in which a comparison and something else fail together has not failed for the leak alone.
  const mixed = run(at('V1-M7-SUP-15', 7, [tell('@Insider', '@Cracker'), compare(same({ players: ['@Insider'] }), { match: 'round', equals: 2 })]));
  assert.match(mixed.run.failure.message, /^the twin run does not look the same to: seat-\d; match round: expected 2, observed 1$/);
  const beside = judgeLeak('a-leak', 'x', [7], [mixed], sound);
  assert.deepEqual(beside.caughtBy, []);
  assert.match(beside.problems[0], /did not pass for a reason that is not a comparison/);
  // Two comparisons failing in one step are one catch, and each audience is named once.
  const twice = run(at('V1-M7-SUP-15', 7, [tell('@Insider', '@Cracker'), compare(same({ players: ['@Insider'] }), same({ players: ['@Insider', '@Cracker'] }))]));
  assert.deepEqual(judgeLeak('a-leak', 'x', [7], [twice], sound), { caughtBy: [{ scenario: 'V1-M7-SUP-15', couldTell: [`seat-${insider}`, `seat-${setup.roleOrder.indexOf('Cracker') + 1}`] }], problems: [] });
  // An opposite claim that fails ("looks exactly the same") is a failed case and not a catch.
  const silent = run(at('V1-M7-SUP-16', 7, [tell('@Insider', '@Cracker'), compare(differs('public'))]));
  assert.match(judgeLeak('a-leak', 'x', [], [silent], sound).problems[0], /not a comparison: the twin run looks exactly the same to: public$/);
  // Tried on nothing, it has shown nothing.
  assert.deepEqual(judgeLeak('a-leak', 'x', [], [], sound).problems, ['the leak "a-leak" was tried on no paired case']);

  // The other way round. A paired case that says two runs look the same has to have failed for some
  // leak, or it has not been shown to watch anything. A case that only says they differ is not asked.
  const watching = at('V1-M7-SUP-21', 7, [tell('@Insider', '@Cracker'), { op: 'watch', round: 1, sameAsTwin: { audiences: 'public' } }]);
  const outcomes = [caught, judgeLeak('another', 'x', [], [quiet], sound)];
  assert.deepEqual(unexercised([told.scenario, quiet.scenario, silent.scenario, watching], outcomes), ['V1-M8-SUP-15', 'V1-M7-SUP-21']);
  assert.deepEqual(unexercised([told.scenario, silent.scenario], outcomes), []);
});

// The report gate and the reviewed exception list. The gate is given reports written from the
// catalogue: one clean set, and then that set with exactly one thing wrong at a time. Each wrong
// thing must be named. No engine is involved.
test('the fixtures that are not ready are exactly the reviewed exceptions', () => {
  assert.deepEqual(exceptionProblems(catalogue, allowlist), []);
  const waiting = catalogue.filter(scenario => scenario.status !== 'ready');
  const listed = allowlist.exceptions.reduce((sum, entry) => sum + entry.modes.length, 0);
  assert.equal(listed, waiting.length, 'the list and the catalogue count the same cases');
  // Each blocked exception names a decision that the register still holds open or deferred.
  const audit = readFileSync(new URL('docs/balance/rules-audit-v1.md', root), 'utf8');
  for (const entry of allowlist.exceptions) {
    for (const id of entry.decisionIds) assert.match(audit, new RegExp(`^\\| ${id} \\|[^\\n]*\\| (OPEN|DEFERRED) \\|`, 'm'), `${entry.code}: ${id} is not open or deferred in the register`);
  }
});

test('a difference between the fixtures and the exception list is named', () => {
  const without = entry => ({ ...allowlist, exceptions: allowlist.exceptions.filter(item => item !== entry) });
  const changed = (entry, change) => ({ ...allowlist, exceptions: allowlist.exceptions.map(item => (item === entry ? { ...entry, ...change } : item)) });
  const blocked = allowlist.exceptions.find(entry => entry.status === 'blocked' && entry.probe);
  const manual = allowlist.exceptions.find(entry => entry.status === 'manual');
  const ready = first('ready');
  const cases = [
    ['a blocked fixture that is not listed', catalogue, without(blocked), new RegExp(`V1-M7-${blocked.code} is blocked and is not in the reviewed exception list`)],
    ['a listed case that is a ready fixture', catalogue, { ...allowlist, exceptions: [...allowlist.exceptions, { code: ready.id.replace('V1-M7-', ''), modes: [7], status: 'blocked', decisionIds: ['D11'], probe: true, why: 'none' }] }, /which is not a blocked or manual fixture/],
    ['another status', catalogue, changed(manual, { status: 'blocked', decisionIds: ['D11'] }), /is manual; the exception list says blocked/],
    ['another decision', catalogue, changed(blocked, { decisionIds: ['D99'] }), /the exception list says D99/],
    ['a probe the list does not know', catalogue, changed(blocked, { probe: false }), /is probed; the exception list says otherwise/],
    ['a mode left out', catalogue, changed(blocked, { modes: [7, 8] }), new RegExp(`V1-M9-${blocked.code} is blocked and is not in the reviewed exception list`)],
    ['a case listed twice', catalogue, { ...allowlist, exceptions: [...allowlist.exceptions, manual] }, /names V1-M7-[A-Z]+-\d+ twice/],
    ['an entry without a reason', catalogue, changed(blocked, { why: ' ' }), /exception \d+ is malformed/],
    ['a blocked entry without a decision', catalogue, changed(blocked, { decisionIds: [] }), /is blocked and names no decision/],
    ['a list of another kind', catalogue, { exceptions: [] }, /must have the schema/],
    ['no list at all', catalogue, null, /must have the schema/],
    // A fixture quietly turned from ready to blocked is the case the list exists for.
    ['a ready fixture turned blocked', catalogue.map(scenario => (scenario === ready ? { ...scenario, status: 'blocked', decisionIds: ['D11'] } : scenario)), allowlist, new RegExp(`${ready.id} is blocked and is not in the reviewed exception list`)],
  ];
  for (const [name, fixtures, list, pattern] of cases) {
    const problems = exceptionProblems(fixtures, list);
    assert.ok(problems.some(problem => pattern.test(problem)), `${name}: ${JSON.stringify(problems.slice(0, 3))}`);
  }
});

test('a complete and clean set of reports passes the gate, and only that', () => {
  assert.deepEqual(judge(cleanReports()), []);
  assert.deepEqual(judge(cleanReports(), { candidateCommit: TREE_COMMIT }), []);
  assert.deepEqual(judge(cleanReports(200), { playoutsPerMode: 200 }), []);
  for (const missing of ['scenarios', 'controls', 'playouts']) {
    const reports = { ...cleanReports(), [missing]: null };
    assert.ok(judge(reports).includes(`${missing}: the report is missing or is not an object`), missing);
  }
  assert.ok(judge({ scenarios: null, controls: null, playouts: null }).length >= 3);
});

test('one wrong thing in the scenario report fails the gate and is named', () => {
  const ready = first('ready');
  const manual = first('manual');
  eachIsNamed([
    ['a missing case', reports => { reports.scenarios.runs = reports.scenarios.runs.filter(run => run.scenarioId !== ready.id); }, new RegExp(`${ready.id} is missing from the report`)],
    ['a case reported twice', reports => { reports.scenarios.runs.push(copy(runOf(reports, ready.id))); }, new RegExp(`${ready.id} is reported twice`)],
    ['a case that is not in the catalogue', reports => { reports.scenarios.runs.push({ ...copy(runOf(reports, ready.id)), scenarioId: 'V1-M7-NONE-01' }); }, /V1-M7-NONE-01 is reported and is not in the catalogue/],
    ['a run without an identifier', reports => { runOf(reports, ready.id).scenarioId = [ready.id]; }, /a run has no scenario identifier/],
    ['a ready case that failed', reports => { Object.assign(runOf(reports, ready.id), { status: 'failed', failure: { stepIndex: 1, op: 'assert', message: 'observed something else' } }); }, new RegExp(`${ready.id} is ready and was failed: observed something else`)],
    ['a ready case that was not run', reports => { Object.assign(runOf(reports, ready.id), { status: 'not-run', reason: 'engine adapter unavailable' }); }, new RegExp(`${ready.id} is ready and was not-run: engine adapter unavailable`)],
    ['a ready case reported blocked', reports => { runOf(reports, ready.id).status = 'blocked'; }, new RegExp(`${ready.id} is ready and was blocked`)],
    // A report that contradicts itself is not a pass, whoever wrote it.
    ['a pass that carries a failure', reports => { runOf(reports, ready.id).failure = { stepIndex: 1, op: 'assert', message: 'observed something else' }; }, new RegExp(`${ready.id} is reported passed and carries a failure`)],
    ['a pass that carries an invariant violation', reports => { runOf(reports, ready.id).invariantViolations = [{ invariant: 'INV-PH-07', message: 'a window nobody could use' }]; }, new RegExp(`${ready.id} is reported passed and carries`)],
    ['a pass without its list of violations', reports => { delete runOf(reports, ready.id).invariantViolations; }, new RegExp(`${ready.id} is reported passed and carries`)],
    ['a blocked case reported passed', reports => { runOf(reports, probed.id).status = 'passed'; }, new RegExp(`${probed.id} is blocked and was reported passed`)],
    ['a blocked case with another decision', reports => { runOf(reports, probed.id).decisionIds = ['D99']; }, new RegExp(`${probed.id} reports other decisions than its fixture`)],
    ['a probe that was not completed', reports => { runOf(reports, probed.id).reason = 'probe could not be completed: the engine refused a legal setup'; }, new RegExp(`${probed.id}: its probe was not completed`)],
    ['a probe that recorded nothing', reports => { runOf(reports, probed.id).probes = []; }, new RegExp(`${probed.id}: 0 observations recorded`)],
    ['a probe that recorded no outcome', reports => { const run = runOf(reports, probed.id); run.probes = run.probes.map(() => null); }, new RegExp(`${probed.id}: 0 observations recorded`)],
    ['an unprobed case with another reason', reports => { runOf(reports, unprobed.id).reason = null; }, new RegExp(`${unprobed.id}: unexpected reason null`)],
    ['a manual case reported passed', reports => { runOf(reports, manual.id).status = 'passed'; }, new RegExp(`${manual.id} is manual and was reported passed`)],
    ['totals that do not match the runs', reports => { reports.scenarios.totals.passed += 1; }, /the totals do not match the runs/],
    ['another kind of report', reports => { reports.scenarios.schema = 'something-else/1'; }, /scenarios: unexpected schema/],
  ]);
  // A whole mode left out cannot hide behind the other two.
  const reports = cleanReports();
  reports.scenarios.runs = reports.scenarios.runs.filter(run => run.mode !== 8);
  assert.ok(judge(reports).includes('scenarios: no scenario passed for 8 players'));
});

test('one wrong thing in the controls or playout report fails the gate and is named', () => {
  eachIsNamed([
    ['a run that judged itself failed', reports => { reports.controls.verdict = 'failed'; }, /controls: the run's own verdict is failed/],
    ['a run that did not happen', reports => { reports.controls = { schema: 'mothership.balance.controls/1', pins: reports.controls.pins, verdict: 'not-run', modes: {}, undetected: [], baselineFailures: [] }; }, /controls: the run's own verdict is not-run/],
    ['a baseline that did not pass', reports => { reports.controls.modes[7].baselineNotPassing = 1; }, /7 players: baselines that did not pass: 1/],
    ['fewer baselines than the catalogue has', reports => { reports.controls.modes[8].scenarios -= 1; }, /8 players: \d+ baselines reported, \d+ in the catalogue/],
    ['fewer controls than the catalogue generates', reports => { reports.controls.modes[9].controls -= 1; reports.controls.modes[9].detected -= 1; }, /9 players: \d+ controls executed, \d+ generated from the catalogue/],
    ['a control that was not detected', reports => { reports.controls.modes[7].detected -= 1; reports.controls.modes[7].undetected = 1; }, /7 players: controls not detected: 1/],
    ['an undetected control in the list', reports => { reports.controls.undetected.push('V1-M7-SETUP-01 step 1 (asserted fact)'); }, /the list of controls that were not detected has 1 entry/],
    ['a failing baseline in the list', reports => { reports.controls.baselineFailures.push('V1-M7-SETUP-01: refused', 'V1-M7-SETUP-02: refused'); }, /the list of baselines that did not pass has 2 entries/],
    ['something else where a list belongs', reports => { reports.controls.undetected = { 0: 'V1-M7-SETUP-01 step 1' }; }, /the list of controls that were not detected is missing/],
    ['no list of failing baselines', reports => { reports.controls.baselineFailures = 'none'; }, /the list of baselines that did not pass is missing/],
    ['a mode without controls', reports => { delete reports.controls.modes[9]; }, /controls: no result for 9 players/],
    ['another number of playouts asked for', reports => { reports.playouts.seedsPerMode = 5; }, /5 playouts per mode were asked for, 10 are required/],
    ['fewer playouts than required', reports => { reports.playouts.modes[7].playouts = 9; reports.playouts.modes[7].completed = 9; }, /7 players: 9 playouts executed, 10 required/],
    ['a playout that did not finish', reports => { reports.playouts.modes[8].completed = 9; }, /8 players: 9 of 10 playouts finished/],
    ['an unfinished playout in the terminal record', reports => { reports.playouts.modes[8].terminalReached.unfinished = 1; }, /8 players: unfinished playouts are reported/],
    ['an invariant violation', reports => { reports.playouts.modes[9].invariantViolations = 1; }, /9 players: invariant violations: 1/],
    ['a hint mismatch', reports => { reports.playouts.modes[9].hintMismatches = 2; }, /9 players: hint mismatches: 2/],
    ['a replay mismatch', reports => { reports.playouts.modes[7].replayMismatches = 1; }, /7 players: replay mismatches: 1/],
    ['a mode without playouts', reports => { delete reports.playouts.modes[7]; }, /playouts: no result for 7 players/],
    ['a playout run that did not happen', reports => { reports.playouts = { schema: 'mothership.balance.walk/1', pins: reports.playouts.pins, verdict: 'not-run', seedsPerMode: 10, modes: {} }; }, /playouts: no result for 8 players/],
  ]);
});

test('reports about another engine, other files or an unpinned tree fail the gate', () => {
  eachIsNamed([
    ['no engine', reports => { reports.scenarios.pins.engine = null; }, /scenarios: no engine was available when the report was made/],
    ['another engine commit', reports => { reports.controls.pins.engineCommit = 'c'.repeat(40); }, /controls: the engine commit is c{40}, not a{40}/],
    ['an engine commit that was not stated', reports => { reports.playouts.pins.engineCommit = 'not stated'; }, /playouts: the engine commit is not stated/],
    ['another ruleset', reports => { reports.scenarios.pins.engine.rulesetVersion = 'in-person-v0'; }, /the engine reports ruleset in-person-v0/],
    ['an engine with another owner decision', reports => { reports.scenarios.pins.engine.rulesetHash = 'd'.repeat(64); }, /a ruleset hash that is not the approved owner decision/],
    ['an owner-decision file that is not the approved one', reports => { reports.scenarios.pins.v1OverlaySha256 = 'd'.repeat(64); }, /the owner-decision file beside the engine is missing or is not the approved one/],
    ['no owner-decision file', reports => { reports.controls.pins.v1OverlaySha256 = null; }, /controls: the owner-decision file beside the engine is missing/],
    ['another source manifest', reports => { reports.scenarios.pins.sourceManifestSha256 = 'd'.repeat(64); }, /the rule-source manifest is not the pinned one/],
    ['a rule source that changed', reports => { const key = Object.keys(reports.scenarios.pins.ruleSourceHashes)[0]; reports.scenarios.pins.ruleSourceHashes[key] = 'd'.repeat(64); }, /the rule sources differ from the files on disk/],
    ['a scenario file that changed', reports => { reports.controls.pins.scenarioFileHashes['mode-7.scenarios.json'] = 'd'.repeat(64); }, /controls: the scenario files differ from the files on disk/],
    ['a rulebook that changed', reports => { reports.playouts.pins.rulebookSha256 = 'd'.repeat(64); }, /playouts: the rulebook differs from the file on disk/],
    ['uncommitted changes', reports => { everyReport(reports, report => { report.pins.workingTreeCommit = `${TREE_COMMIT} plus uncommitted changes`; }); }, /the working tree is not a clean commit/],
    ['no Git provenance', reports => { everyReport(reports, report => { report.pins.workingTreeCommit = 'unknown'; }); }, /the working tree is not a clean commit \(unknown\)/],
    ['reports from two trees', reports => { reports.playouts.pins.workingTreeCommit = 'c'.repeat(40); }, /playouts: not the same working tree as the scenario report/],
    ['reports about two engines', reports => { reports.controls.pins.engine.engineVersion = 'another'; }, /controls: not the same engine as the scenario report/],
    // A run through a stand-in says so where the adapter is named, and is not evidence about an engine.
    ['a run made through a stand-in', reports => { everyReport(reports, report => { report.pins.engine.adapter = withSupplyDisclosure(stubAdapter()).pins.adapter.replace('stub', 'full-game-v1'); }); }, /the run was made through "full-game-v1 with the stand-in supply-disclosure", not through the engine binding full-game-v1 alone/],
    ['reports about two builds of the engine', reports => { reports.playouts.pins.engineBuildSha256 = 'f'.repeat(64); }, /playouts: not the same engine build as the scenario report/],
    ['a report that does not say which build it ran', reports => { everyReport(reports, report => { report.pins.engineBuildSha256 = null; }); }, /the built engine modules were not found/],
    ['a report without pins', reports => { delete reports.playouts.pins; }, /playouts: the report carries no pins/],
    // An absent pin is not an agreement. Three reports without the combined manifest fail, whether
    // or not the engine's checkout is at hand to compare it with.
    ['no combined manifest in any report', reports => { everyReport(reports, report => { report.pins.v1ManifestSha256 = null; }); }, /the combined Version 1 manifest was not found beside the engine/],
    ['reports about two combined manifests', reports => { reports.controls.pins.v1ManifestSha256 = 'd'.repeat(64); }, /controls: not the same combined Version 1 manifest as the scenario report/],
    // The engine commit has to have been read from Git, from a clean tree. A label is not enough.
    ['an engine commit that was only stated', reports => { everyReport(reports, report => { report.pins.engineCommitBasis = ENGINE_COMMIT_BASIS.stated; report.pins.engineTreeClean = null; }); }, /the engine commit was only stated on the command line/],
    ['an engine commit of unknown origin', reports => { delete reports.scenarios.pins.engineCommitBasis; }, /scenarios: the engine commit was only stated on the command line/],
    ['an engine checkout with uncommitted changes', reports => { everyReport(reports, report => { report.pins.engineTreeClean = false; }); }, /the engine's checkout had uncommitted changes/],
    ["this checkout's engine under another commit", reports => { everyReport(reports, report => { report.pins.engineCommitBasis = ENGINE_COMMIT_BASIS.here; }); }, /the engine is this checkout's own, but its commit a{40} is not the working tree's/],
  ]);
  // The scenario files are pinned by name; a case above relies on this one being among them.
  assert.ok('mode-7.scenarios.json' in disk.scenarioFileHashes);
  // The same three without the checkout at hand: absent stays a failure.
  const absent = cleanReports();
  everyReport(absent, report => { report.pins.v1ManifestSha256 = null; });
  assert.equal(judge(absent, { v1Manifest: null }).filter(problem => /was not found beside the engine/.test(problem)).length, 3);
  const other = cleanReports();
  everyReport(other, report => { report.pins.v1ManifestSha256 = 'd'.repeat(64); });
  assert.deepEqual(judge(other, { v1Manifest: { sha256: MANIFEST } }), ['scenarios', 'controls', 'playouts'].map(name => `${name}: the combined Version 1 manifest differs from the file beside the engine`));
  assert.deepEqual(judge(other, { v1Manifest: null }), [], 'without the checkout at hand the reports only have to carry it and agree');

  // The engine of the checkout itself, at the checkout's commit, is the form a merge gate sees.
  const own = cleanReports();
  everyReport(own, report => { report.pins.engineCommitBasis = ENGINE_COMMIT_BASIS.here; report.pins.engineCommit = TREE_COMMIT; });
  assert.deepEqual(judge(own, { engineCommit: TREE_COMMIT, candidateCommit: TREE_COMMIT }), []);

  // A candidate commit pins the tree exactly. An unpinned tree and an unchecked engine commit are
  // accepted only when asked for, never beside a named candidate, and nothing else is relaxed.
  assert.ok(judge(cleanReports(), { candidateCommit: 'c'.repeat(40) }).some(problem => /not the clean candidate c{40}/.test(problem)));
  const trial = cleanReports();
  everyReport(trial, report => { Object.assign(report.pins, { workingTreeCommit: `${TREE_COMMIT} plus uncommitted changes`, engineCommitBasis: ENGINE_COMMIT_BASIS.stated, engineTreeClean: null }); });
  assert.deepEqual(judge(trial, { allowUnpinnedTree: true }), []);
  assert.ok(judge(trial).length >= 6);
  const named = judge(trial, { allowUnpinnedTree: true, candidateCommit: TREE_COMMIT });
  assert.ok(named.some(problem => /not the clean candidate/.test(problem)) && named.some(problem => /only stated on the command line/.test(problem)), 'a named candidate is never relaxed');
  trial.playouts.modes[7].invariantViolations = 1;
  assert.equal(judge(trial, { allowUnpinnedTree: true }).length, 1);
  // What the gate is told to expect has to be exact itself.
  assert.ok(judge(cleanReports(), { engineCommit: 'a3898b8' }).some(problem => /must be a full commit hash/.test(problem)));
  assert.ok(judge(cleanReports(), { candidateCommit: 'HEAD' }).some(problem => /candidate commit must be a full commit hash/.test(problem)));
  assert.ok(judge(cleanReports(), { playoutsPerMode: 0 }).some(problem => /whole number of at least 1/.test(problem)));
});
