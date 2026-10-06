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
import { ENGINE_COMMIT_BASIS, exceptionProblems } from '@mothership/balance';
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
  assert.match(broken(r => { r.information.hackAnswer = 'yes'; }), /must not be collected/);
  assert.match(broken(r => { r.participants[0].email = 'someone@example.com'; }), /must not be collected/);
  assert.match(broken(r => { r.officer = {}; }), /Officer section exists only in mode 9/);
  assert.match(broken(r => { r.experience = [{ clarity: 6 }]; }), /must be 1\.\.5/);
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
