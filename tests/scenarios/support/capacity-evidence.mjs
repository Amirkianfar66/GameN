// The evidence of 11 October 2026 on the room-capacity rule (issue #96): where its reports are,
// and the tables the documents print from them. A test holds the documents to these tables and
// the reports to the fixtures, so that no result is typed by hand.
import { readFileSync } from 'node:fs';

const directory = new URL('../../../docs/balance/evidence/', import.meta.url);
const read = name => JSON.parse(readFileSync(new URL(name, directory), 'utf8'));

// Backend's implementation, the head of draft PR #98, and the engine before the rule.
export const IMPLEMENTATION = 'dd04f68ee5af887b01761a03eca644f7a67e84dd';
export const BEFORE_THE_RULE = '1a92f3790e45622196014cc008544fc33c359c0a';
export const PASS_RULESET = 'in-person-v1-pass-2026-10-08';
export const EARLIER_RULESETS = [PASS_RULESET, 'in-person-v1-2026-10-06'];
export const EVIDENCE_REPORT = 'docs/balance/evidence/2026-10-11-capacity.md';
export const EVIDENCE_FILES = {
  scenarios: '2026-10-11-capacity-scenarios-engine-dd04f68.json',
  control: '2026-10-11-capacity-scenarios-control-1a92f37.json',
  controls: '2026-10-11-capacity-controls-engine-dd04f68.json',
  playouts: '2026-10-11-capacity-playouts-engine-dd04f68.json',
  compatibility: '2026-10-11-capacity-compatibility.json',
};
// The cases that fail against the implementation, and the finding of the audit each one is.
export const KNOWN_DEFECTS = { 'CAP-28': 'F1' };
export const caseOf = scenarioId => scenarioId.replace(/^V1-M\d-/, '');
// Ready cases that assert nothing the rule changes and in which no room ever holds five: a Captain
// who lost the title returns to a last room that has a place, with seven and eight players. They
// pass on an engine without the rule as well, and the control says so.
export const HOLDS_WITHOUT_THE_RULE = ['V1-M7-CAP-29', 'V1-M8-CAP-29'];

export function loadEvidence() {
  return Object.fromEntries(Object.entries(EVIDENCE_FILES).map(([key, name]) => [key, read(name)]));
}

const MODES = ['7', '8', '9'];
const short = commit => `\`${commit.slice(0, 7)}\``;
const line = cells => `| ${cells.join(' | ')} |`;
const totals = summary => [summary.passed, summary.failed, summary.blocked, summary.notRun];

/** Every scenario run of the evidence, one row each. */
export function resultsTable({ scenarios, control, compatibility }) {
  const earlier = EARLIER_RULESETS.flatMap(ruleset => [
    line([`The Version 1 catalogue under \`${ruleset}\`, on the implementation`, short(compatibility.after), ...totals(compatibility.rulesets[ruleset].after.scenarios.totals)]),
    line([`The same, on the engine before the rule`, short(compatibility.before), ...totals(compatibility.rulesets[ruleset].before.scenarios.totals)]),
  ]);
  const underDefault = compatibility.catalogueUnderTheDefaultOfTheLaterBuild;
  return [
    '| Run | Engine | Passed | Failed | Blocked | Not run |',
    '| --- | --- | --- | --- | --- | --- |',
    line([`The capacity fixtures under \`${scenarios.pins.engine.rulesetVersion}\`, on the implementation`, short(scenarios.pins.engineCommit), ...totals(scenarios.totals)]),
    line([`Control: the same fixtures under \`${control.pins.engine.rulesetVersion}\`, on the engine before the rule`, short(control.pins.engineCommit), ...totals(control.totals)]),
    ...earlier,
    line([`The Version 1 catalogue under \`${underDefault.engine.rulesetVersion}\`, the implementation's own default`, short(compatibility.after), ...totals(underDefault.totals)]),
  ].join('\n');
}

/** The capacity fixtures by number of players, against the implementation and against the control. */
export function modeTable({ scenarios, control }) {
  const cells = (report, key) => MODES.map(mode => report.byGroup[`mode-${mode}`][key]);
  return [
    '| | 7 players | 8 players | 9 players |',
    '| --- | --- | --- | --- |',
    line(['Fixtures', ...cells(scenarios, 'total')]),
    line(['Implementation: passed', ...cells(scenarios, 'passed')]),
    line(['Implementation: failed', ...cells(scenarios, 'failed')]),
    line(['Implementation: blocked, with what the engine does recorded', ...cells(scenarios, 'blocked')]),
    line(['Implementation: not run (manual)', ...cells(scenarios, 'notRun')]),
    line(['Control: passed', ...cells(control, 'passed')]),
    line(['Control: failed', ...cells(control, 'failed')]),
  ].join('\n');
}

/** The cases that failed against the implementation: what they expected and what the engine did. */
export function failureTable({ scenarios }) {
  const rows = scenarios.runs.filter(run => run.status === 'failed').map(run => line([
    `\`${run.scenarioId}\``, KNOWN_DEFECTS[caseOf(run.scenarioId)] ?? 'not explained', run.failure.message,
    run.invariantViolations.map(violation => `${violation.invariant}: ${violation.message}`).join('; ') || 'none',
  ]));
  return ['| Case | Finding | What the case expected and what the engine did | Invariants broken in the run |', '| --- | --- | --- | --- |', ...rows].join('\n');
}

/** The negative controls on the capacity fixtures: each makes one expectation of a passing case wrong, and the run must fail. */
export function controlsTable({ controls }) {
  const stats = MODES.map(mode => controls.modes[mode]);
  const row = (label, value) => line([label, ...stats.map(value)]);
  return [
    '| | 7 players | 8 players | 9 players |',
    '| --- | --- | --- | --- |',
    row('Ready cases', item => item.scenarios),
    row('Of them, not passing unchanged, so without controls', item => item.baselineNotPassing),
    row('Controls run', item => item.controls),
    row('Detected', item => item.detected),
    row('Not detected', item => item.undetected),
  ].join('\n');
}

/** What each engine did in the cases that are blocked on an open question. */
export function probeTable({ scenarios, control }) {
  const blocked = report => report.runs.filter(run => run.status === 'blocked');
  const rows = [];
  for (const run of blocked(scenarios)) {
    const before = blocked(control).find(item => item.scenarioId === run.scenarioId);
    for (const probe of run.probes) {
      const earlier = before?.probes.find(item => item.label === probe.label)?.outcome ?? 'not recorded';
      rows.push(line([`\`${run.scenarioId}\``, run.decisionIds.join(', '), probe.label, probe.outcome, earlier]));
    }
  }
  return ['| Case | Question | What is recorded | Implementation | Engine before the rule |', '| --- | --- | --- | --- | --- |', ...rows].join('\n');
}

/** The playouts under the capacity ruleset. */
export function playoutTable({ playouts }) {
  const stats = MODES.map(mode => playouts.modes[mode]);
  const row = (label, value) => line([label, ...stats.map(value)]);
  const share = (part, whole) => `${part} of ${whole} (${((100 * part) / whole).toFixed(1)}%)`;
  return [
    '| | 7 players | 8 players | 9 players |',
    '| --- | --- | --- | --- |',
    row('Playouts, each run twice', item => item.playouts),
    row('Finished', item => item.completed),
    row('Invariant violations', item => item.invariantViolations),
    row('Offers that disagree with what the engine accepted', item => item.hintMismatches),
    row('Second runs that ended differently', item => item.replayMismatches),
    row('Commands accepted', item => item.commandsAccepted),
    row('Commands refused', item => item.commandsRejected),
    row('Playouts that started with a room of five', item => share(item.occupancy.startsWithAFullRoom, item.playouts)),
    row('Phases that opened with a room of five', item => share(item.occupancy.phasesWithAFullRoom, item.occupancy.phasesOpened)),
    row('Phases that opened with more than five in a room, Hospital or Jail', item => item.occupancy.phasesOverCapacity),
    row('Moves sent towards a room of five', item => item.occupancy.movesTowardsAFullRoom),
    row('Of them, accepted', item => item.occupancy.movesIntoAFullRoom),
    row('Most players at once in Room A, Room B, Hospital, Jail, Command Room', item => ['Room A', 'Room B', 'Hospital', 'Jail', 'Command Room'].map(place => item.occupancy.most[place]).join(', ')),
    row('Returns from Hospital or Jail to a room', item => item.occupancy.returns),
    row('Of them, to the other room', item => item.occupancy.returnsToTheOtherRoom),
    row('Of those, the last room had a place when the round was over', item => item.occupancy.returnsToTheOtherRoomThoughTheLastHadAPlace),
    row('Most players waiting for Hospital at once', item => item.occupancy.mostWaiting),
  ].join('\n');
}

/** Whether the earlier rulesets play on the implementation as they did before it. */
export function compatibilityTable({ compatibility }) {
  const rows = EARLIER_RULESETS.map(ruleset => {
    const item = compatibility.rulesets[ruleset];
    const playouts = Object.values(item.after.playouts.modes).reduce((sum, stats) => sum + stats.playouts, 0);
    return line([`\`${ruleset}\``, `\`${item.after.scenarios.engine.engineVersion}\``, item.after.scenarios.totals.total, item.sameResults ? 'every one' : 'NOT every one',
      playouts, item.sameEndStates ? 'every one' : 'NOT every one']);
  });
  return [
    '| Earlier ruleset | Its engine version | Version 1 fixtures run on each build | With the same result on both builds | Playouts run on each build | Ending in the same state on both builds |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}
