// The tables the audit and the evidence report print. They are computed here, written into the
// documents between markers by `npm run materialize --workspace @mothership/balance`, and held to
// the documents by a test, so that no count and no result is typed by hand.
import { AREAS, MODES, casesOf, roster } from './catalog.mjs';
import { CONTROLS, RULESETS, RULESET_SOURCES, controlsOf } from './controls.mjs';
import { BUILDS, CONTRAST_BUILD, loadControlEvidence } from './files.mjs';
import { ASSUMPTIONS, FINDINGS, NEEDS, casesNaming } from './register.mjs';
import { SPEC } from './spec.mjs';

const line = cells => `| ${cells.join(' | ')} |`;
const table = (head, rows) => [line(head), line(head.map(() => '---')), ...rows.map(line)].join('\n');
const short = commit => `\`${commit.slice(0, 7)}\``;
const KIND = { contradiction: 'Contradiction', gap: 'Gap', consequence: 'Consequence', information: 'Information' };

export function provenanceTable() {
  return table(['File of the packet', 'SHA-256'], [
    ...Object.entries(SPEC.files).map(([name, hash]) => [`\`${name}\``, `\`${hash}\``]),
    ['All six, as one digest', `\`${SPEC.packetSha256}\``],
  ]);
}

export function versionsTable() {
  return table(['Version', 'Ruleset', 'Engine', 'Where it is', 'What this audit did with it'], [
    ...Object.entries(RULESETS).map(([key, ruleset]) => [
      { V13: '1.3', V14: '1.4', V15: '1.5' }[key], `\`${ruleset}\``, RULESET_SOURCES[key].engineVersion, RULESET_SOURCES[key].published,
      `${controlsOf(key).length} controls for each number of players, run`,
    ]),
    ['next', 'none allocated', 'none', `the packet \`${SPEC.name}\`, not committed`, 'Cases specified. None run'],
  ]);
}

export function countsTable() {
  const cases = Object.fromEntries(MODES.map(mode => [mode, casesOf(mode)]));
  const cells = filter => MODES.map(mode => cases[mode].filter(filter).length);
  return table(['', '7 players', '8 players', '9 players'], [
    ...Object.entries(AREAS).map(([area, title]) => [`${area}: ${title}`, ...cells(item => item.area === area)]),
    ['**All cases of the next version**', ...cells(() => true)],
    ['Specified, not run', ...cells(item => item.status === 'specified' || item.status === 'synthetic')],
    ['Of them, reachable only from a constructed state', ...cells(item => item.status === 'synthetic')],
    ['Not run, people or devices', ...cells(item => item.status === 'manual')],
    ['Run', 0, 0, 0],
    ['Expectation stated by the packet', ...cells(item => item.basis === 'stated')],
    ['Stated by an earlier rule that the packet keeps', ...cells(item => item.basis === 'kept')],
    ['Derived from the packet and the kept rules together', ...cells(item => item.basis === 'derived')],
    ['A reading, with the other outcome beside it and a finding that reports the point', ...cells(item => item.basis === 'reading')],
    ['Evidence must come from the rules engine', ...cells(item => item.layer === 'engine')],
    ['From the service', ...cells(item => item.layer === 'service')],
    ['From the phone and the shared display', ...cells(item => item.layer === 'client')],
    ['From people at a table', ...cells(item => item.layer === 'table')],
  ]);
}

export function findingsTable() {
  return table(['Finding', 'Kind', 'What it is about', 'Cases that depend on it'], FINDINGS.map(item => [item.id, KIND[item.kind], item.title, casesNaming('findings', item.id).join(', ') || 'none']));
}

export function assumptionsTable() {
  return table(['Assumption', 'What the matrix assumes'], ASSUMPTIONS.map(item => [item.id, item.text]));
}

export function needsTable(owner) {
  return table(['Need', `What ${owner} provides`, 'Cases that wait for it'], NEEDS.filter(item => item.owner === owner).map(item => [item.id, item.text, casesNaming('needs', item.id).join(', ') || 'every case']));
}

/** What follows from the roles of each game and the rules, by counting. */
export function rosterArithmetic(mode) {
  const roles = roster(mode).map(item => item.role);
  const blackouts = roles.filter(role => role.endsWith('Disabler')).length;
  const officer = roles.includes('Officer') ? 1 : 0;
  const weapons = 1 + 2; // Undercover's own, and the two Supplier gives in Round 3
  const attacks = blackouts + weapons + officer;
  return {
    blackouts, weapons, officer, attacks,
    early: blackouts + officer,            // attacks that can land in Rounds 1 to 3
    rescues: 2,
    hospital: mode,
    jail: Math.ceil(mode / 2),
    eliminatedBefore: Math.floor(attacks / 2), // two hits for one elimination, and nothing else eliminated
    deathsWithoutRescue: attacks,              // every attack on a different player by Round 4
    deathsWithBothRescues: attacks - 2,
    ejectedAtMost: 4,                          // one new prisoner a round, and the Captain acts before the vote
    blue: roles.filter(role => ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Officer'].includes(role)).length,
    red: roles.filter(role => ['Undercover', 'Hacker', 'Red Disabler'].includes(role)).length,
  };
}

export function arithmeticTable() {
  const facts = MODES.map(rosterArithmetic);
  const row = (label, value) => [label, ...facts.map(value)];
  return table(['', '7 players', '8 players', '9 players'], [
    row('Blue, Red, Alien', item => `${item.blue}, ${item.red}, 1`),
    row('Blackouts in a match', item => item.blackouts),
    row('Ordinary weapons, usable in Rounds 4 and 5', item => item.weapons),
    row('Officer\'s shot, usable from Round 1', item => item.officer),
    row('Attacks before the showdown', item => item.attacks),
    row('Of them, able to land in Rounds 1 to 3', item => item.early),
    row('Rescues in a match, one a round', item => item.rescues),
    row('Hospital positions', item => item.hospital),
    row('Ballots that jail when everybody votes', item => item.jail),
    row('Version 1.3: most players Eliminated before the showdown (two hits each, nothing else eliminates)', item => item.eliminatedBefore),
    row('Specification: most players who can die of their injuries by the end of Round 5, nobody rescued', item => item.deathsWithoutRescue),
    row('The same with both Rescues used on them', item => item.deathsWithBothRescues),
    row('Specification: most players one EJECT can eliminate (Round 5, a prisoner from each earlier vote)', item => item.ejectedAtMost),
    row('Specification: seconds between the closing of the Jail vote and the resolution (1.3: none; 1.4 and 1.5: five)', () => 20),
  ]);
}

// ---------------------------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------------------------
const tally = report => (report === null ? ['not run', '', '', '', ''] : [report.totals.total, report.totals.passed, report.totals.failed, report.totals.recorded, report.totals.notRun]);

/** Every run of the controls: which ruleset, through which build, and what came of it. */
export function controlRunsTable(evidenceSet = loadControlEvidence()) {
  return table(['Ruleset', 'Build', 'What the build is', 'Controls run', 'Passed', 'Failed', 'Recorded, nothing expected', 'Not run'], evidenceSet.runs.map(run => [
    `\`${RULESETS[run.version]}\``, short(BUILDS[run.build].commit), `${BUILDS[run.build].engineVersion}, ${BUILDS[run.build].what}`, ...tally(run.report),
  ]));
}

/** The same by number of players, for the build that introduced each ruleset. */
export function controlModesTable(evidenceSet = loadControlEvidence()) {
  const own = { V13: 'abb6839', V14: 'bd4d77c', V15: 'a9b77a7' };
  const rows = [];
  for (const [version, build] of Object.entries(own)) {
    const report = evidenceSet.runs.find(run => run.version === version && run.build === build)?.report ?? null;
    for (const mode of MODES) {
      const cell = key => (report === null ? 'not run' : report.byMode[mode][key]);
      rows.push([`\`${RULESETS[version]}\``, short(BUILDS[build].commit), `${mode} players`, cell('total'), cell('passed'), cell('failed'), cell('recorded'), cell('notRun')]);
    }
  }
  return table(['Ruleset', 'Build', '', 'Controls', 'Passed', 'Failed', 'Recorded', 'Not run'], rows);
}

/** Each control once: what it shows about today, and the result on every build it was run on. */
export function controlDetailTable(evidenceSet = loadControlEvidence()) {
  const rows = CONTROLS.map(item => {
    const results = evidenceSet.runs.filter(run => run.version === item.version).map(run => {
      if (run.report === null) return `${short(BUILDS[run.build].commit)} not run`;
      const mine = run.report.runs.filter(result => result.code === item.code);
      const statuses = [...new Set(mine.map(result => result.status))];
      return `${short(BUILDS[run.build].commit)} ${statuses.length === 1 ? `${statuses[0]} with 7, 8 and 9` : mine.map(result => `${result.mode}: ${result.status}`).join(', ')}`;
    });
    return [item.code, item.title, item.sources.join(', '), item.changes.join(', '), results.join('; ')];
  });
  return table(['Control', 'What it holds the version to', 'Read from', 'Cases of the next version at the same point', 'Result on each build'], rows);
}

/** What the engine did where a control expects nothing. */
export function recordedTable(evidenceSet = loadControlEvidence()) {
  const rows = [];
  for (const run of evidenceSet.runs) {
    if (run.report === null) continue;
    for (const result of run.report.runs.filter(item => item.status === 'recorded')) {
      for (const record of result.records) rows.push([result.id, short(BUILDS[run.build].commit), record.label, JSON.stringify(record.observed)]);
    }
  }
  return rows.length === 0 ? 'No report is committed.' : table(['Control', 'Build', 'What is recorded', 'What the engine did'], rows);
}

/** The controls of the controls: each run on purpose under the ruleset it is contrasted with. */
export function contrastTable(evidenceSet = loadControlEvidence()) {
  const report = evidenceSet.contrast;
  if (report === null) return 'No report is committed.';
  const rows = CONTROLS.filter(item => item.contrast !== undefined).map(item => {
    const mine = report.runs.filter(run => run.code === item.code);
    const detected = mine.filter(run => run.detected).length;
    return [item.code, `\`${RULESETS[item.version]}\``, `\`${RULESETS[item.contrast]}\``, `${detected} of ${mine.length}`, mine.find(run => run.mode === 7)?.firstDifference ?? 'not run'];
  });
  return table(['Control', 'Written for', 'Run on purpose under', 'Failed there, as it must', 'The first difference, with seven players'], rows);
}

/** One paragraph on what the committed reports show. It says "not run" where no report is committed. */
export function controlVerdict(evidenceSet = loadControlEvidence()) {
  const reports = evidenceSet.runs.filter(run => run.report !== null);
  if (reports.length === 0) return 'No report is committed with this document: the controls have not been run for it.';
  if (reports.length !== evidenceSet.runs.length) return `Only ${reports.length} of the ${evidenceSet.runs.length} runs have a committed report.`;
  const sum = key => reports.reduce((total, run) => total + run.report.totals[key], 0);
  const days = [...new Set(reports.map(run => run.report.pins.generatedAt.slice(0, 10)))].sort();
  const failed = reports.flatMap(run => run.report.runs.filter(result => result.status === 'failed').map(result => `${result.id} on \`${run.build}\``));
  const own = { V13: 'abb6839', V14: 'bd4d77c', V15: 'a9b77a7' };
  const first = Object.entries(own).map(([version, build]) => evidenceSet.runs.find(run => run.version === version && run.build === build).report.totals);
  return [
    `Run on ${days.join(' and ')}, in ${reports.length} runs: ${sum('total')} control runs, ${sum('passed')} passed, ${sum('failed')} failed, ${sum('recorded')} recorded with nothing expected, ${sum('notRun')} not run.`,
    `On the build that introduced each ruleset: ${first.map((totals, index) => `${['1.3', '1.4', '1.5'][index]}, ${totals.passed} of ${totals.total - totals.recorded} passed`).join('; ')}.`,
    failed.length === 0 ? 'No control failed on any build, so nothing was found against the vote-result ruleset or the declared-Hack ruleset, nor against a later build playing an earlier ruleset.' : `Failed: ${failed.join(', ')}.`,
  ].join(' ');
}

export function contrastSummary(evidenceSet = loadControlEvidence()) {
  const report = evidenceSet.contrast;
  if (report === null) return 'The contrast has not been run.';
  return `Through the build of ${short(BUILDS[CONTRAST_BUILD].commit)}: ${report.controlsWithAContrast} of the ${CONTROLS.length} controls have a ruleset to be contrasted with; each was run under it with 7, 8 and 9 players, ${report.totals.run} runs; ${report.totals.detected} failed, as they must, and ${report.totals.undetected} did not. The other ${report.controlsWithout.length} controls (${report.controlsWithout.join(', ')}) state nothing that a later ruleset changes and have no contrast.`;
}

/** The deliberate leaks: the engine made to publish one hidden fact, and the control that must notice. */
export function leakTable(evidenceSet = loadControlEvidence()) {
  const report = evidenceSet.contrast;
  if (report === null) return 'No report is committed.';
  const groups = new Map();
  for (const run of report.leaks) groups.set(`${run.code}|${run.leak}`, [...(groups.get(`${run.code}|${run.leak}`) ?? []), run]);
  return table(['Control', 'What the engine was made to publish', 'Noticed, with 7, 8 and 9 players', 'The check that failed, with seven players'], [...groups.entries()].map(([key, runs]) => {
    const [code, leak] = key.split('|');
    return [code, leak, `${runs.filter(run => run.detected).length} of ${runs.length}`, runs.find(run => run.mode === 7)?.where ?? 'not run'];
  }));
}

// ---------------------------------------------------------------------------------------------
// Writing the tables into a document
// ---------------------------------------------------------------------------------------------
export const AUDIT_TABLES = () => ({
  provenance: provenanceTable(), versions: versionsTable(), counts: countsTable(), findings: findingsTable(), assumptions: assumptionsTable(),
  arithmetic: arithmeticTable(), 'needs-backend': needsTable('Backend'), 'needs-frontend': needsTable('Frontend'), 'control-runs': controlRunsTable(), 'control-verdict': controlVerdict(),
});
export const EVIDENCE_TABLES = () => ({
  'control-runs': controlRunsTable(), 'control-modes': controlModesTable(), 'control-detail': controlDetailTable(), recorded: recordedTable(),
  contrast: contrastTable(), 'contrast-summary': contrastSummary(), leaks: leakTable(),
});

const OPEN = name => `<!-- generated:${name} -->`;
const CLOSE = name => `<!-- /generated:${name} -->`;

/** Replace what stands between each pair of markers with its table. Every marker must be known and every table used. */
export function fillGenerated(text, tables) {
  let filled = text;
  const used = new Set();
  for (const match of text.matchAll(/<!-- generated:([a-z-]+) -->/g)) {
    const name = match[1];
    if (!(name in tables)) throw new Error(`no generated table is called ${name}`);
    const from = filled.indexOf(OPEN(name));
    const to = filled.indexOf(CLOSE(name));
    if (to < from) throw new Error(`the block ${name} is not closed`);
    filled = `${filled.slice(0, from)}${OPEN(name)}\n${tables[name]}\n${filled.slice(to)}`;
    used.add(name);
  }
  const unused = Object.keys(tables).filter(name => !used.has(name));
  if (unused.length > 0) throw new Error(`the document prints no block for: ${unused.join(', ')}`);
  return filled;
}
