// Writing and reading the materialized acceptance matrix of the next version: one JSON file per
// number of players beside the catalogue, for whoever binds tests to the cases, and one Markdown
// document per number of players under docs/balance/next-version/, for whoever reads them.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { AREAS, BASES, LAYERS, LAYOUTS, MODES, NEXT_VERSION_FILES, STATUS_TEXT, VERSION, casesOf, roster } from './catalog.mjs';
import { CONTROLS, RULESETS, RULESET_SOURCES, controlId } from './controls.mjs';
import { QUESTIONS, SECTIONS, SPEC } from './spec.mjs';

export const ACCEPTANCE_SCHEMA = 'mothership.balance.acceptance/1';
export const SUITE = 'next-version';
export const AUDIT_PATH = 'docs/balance/next-version/README.md';
export const EVIDENCE_PATH = 'docs/balance/evidence/2026-10-14-next-version.md';

const here = new URL('./', import.meta.url);
const repository = new URL('../../../', import.meta.url);
export const acceptanceFileUrl = mode => new URL(NEXT_VERSION_FILES[mode], here);
export const matrixPath = mode => `docs/balance/next-version/matrix-${mode}.md`;
export const matrixFileUrl = mode => new URL(matrixPath(mode), repository);

const WORD = { 7: 'seven', 8: 'eight', 9: 'nine' };

/** A layout for one number of players, with the positions the starting players hold (NV-F-06). */
export function layoutOf(name, mode) {
  const order = new Map(roster(mode).map(item => [item.role, item.seat]));
  const rooms = LAYOUTS[name].rooms(mode);
  return Object.fromEntries(Object.entries(rooms).map(([room, roles]) => [room,
    [...roles].sort((a, b) => order.get(a) - order.get(b)).map((role, index) => ({ position: index + 1, role, player: order.get(role) }))]));
}
// PAIRS exists for nine players only, SPLIT for eight and nine.
export const layoutsOf = mode => Object.keys(LAYOUTS).filter(name => (name === 'PAIRS' ? mode === 9 : name === 'SPLIT' ? mode >= 8 : true));

export const CONVENTIONS = [
  'Players are named by role. The table of players gives each role its player number; where an order matters the case says "player n".',
  'A layout is a starting draw. Every assignment with at most five players in a room is a legal one.',
  'Turns are taken in order of player number in every round, unless the case gives another order.',
  'Nobody acts, moves or votes unless the case says so. A vote without stated ballots jails or elects nobody.',
  '"The vote jails X" means: enough ballots name X, and X alone has the most. With everybody voting that is 4 of 7, 4 of 8, 5 of 9.',
  'Commands are named by what they do. Backend allocates their real names with the version.',
  'Times are the server\'s. An interval [a, b) contains a and does not contain b.',
  'V is the commit that closes the Jail vote, W the commit that closes its result and opens the window, X the commit that closes the window and resolves the round.',
  '"Selects slot n" is the Disabler\'s selection, in darkness, of position n of the room their request is bound to.',
];

/** Deterministic text of one acceptance file. */
export function renderAcceptanceFile(mode, cases = casesOf(mode)) {
  const header = {
    schema: ACCEPTANCE_SCHEMA,
    suite: SUITE,
    mode,
    specification: { name: SPEC.name, recordedOn: SPEC.recordedOn, packetSha256: SPEC.packetSha256, files: SPEC.files, sourceBasis: SPEC.sourceBasis },
    version: VERSION,
    optionalPowers: false,
    generatedFrom: 'tests/scenarios/next-version/catalog.mjs',
    execution: 'Specifications of cases. None has been run: no engine plays the specification they are written against. A case is not a result, and none of these counts as passed.',
    statuses: STATUS_TEXT,
    bases: BASES,
    layers: LAYERS,
    conventions: CONVENTIONS,
    players: roster(mode),
    layouts: Object.fromEntries(layoutsOf(mode).map(name => [name, { title: LAYOUTS[name].title, rooms: layoutOf(name, mode) }])),
    counts: { total: cases.length, run: 0 },
  };
  // One line for each field of the header and one for each case, as the fixture files are written,
  // so that a change to one case is a change to one line.
  const head = Object.entries(header).map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`).join(',\n');
  return `{\n${head},\n  "cases": [\n${cases.map(item => `    ${JSON.stringify(item)}`).join(',\n')}\n  ]\n}\n`;
}

export function loadAcceptance(mode) {
  return JSON.parse(readFileSync(acceptanceFileUrl(mode), 'utf8'));
}

// ---------------------------------------------------------------------------------------------
// The evidence of 14 October 2026: reports of the controls on the existing versions.
// ---------------------------------------------------------------------------------------------
export const BUILDS = Object.freeze({
  abb6839: { commit: 'abb6839524b6dc3e5225e600f2f067c3fa3f9501', engineVersion: 'full-game-1.3.0', what: 'the integration baseline, head of PR #114' },
  bd4d77c: { commit: 'bd4d77ccc1c46d90c5beafb770252fdae6f086ae', engineVersion: 'full-game-1.4.0', what: 'Backend, head of draft PR #125' },
  a9b77a7: { commit: 'a9b77a7bd535efc8bdb5041cee18fd6526c0e354', engineVersion: 'full-game-1.5.0', what: 'Backend, head of draft PR #131' },
});
// Every run: which controls, through which build. A ruleset is run on the build that introduced
// it and on every later build, which must still play it as it was.
export const CONTROL_RUNS = Object.freeze([
  { version: 'V13', build: 'abb6839' }, { version: 'V13', build: 'bd4d77c' }, { version: 'V13', build: 'a9b77a7' },
  { version: 'V14', build: 'bd4d77c' }, { version: 'V14', build: 'a9b77a7' },
  { version: 'V15', build: 'a9b77a7' },
]);
export const CONTRAST_BUILD = 'a9b77a7';
// True from the commit that carries the reports. Before it the matrix says "not run" for every
// control, and a test refuses a report that is lying about.
export const EVIDENCE_COMMITTED = true;
const evidence = new URL('docs/balance/evidence/', repository);
export const controlReportName = ({ version, build }) => `2026-10-14-next-controls-${version.toLowerCase()}-engine-${build}.json`;
export const contrastReportName = () => `2026-10-14-next-controls-contrast-engine-${CONTRAST_BUILD}.json`;
const read = name => { const url = new URL(name, evidence); return existsSync(url) ? JSON.parse(readFileSync(url, 'utf8')) : null; };

/** The committed reports, or null where a report is not committed. */
export function loadControlEvidence() {
  return { runs: CONTROL_RUNS.map(run => ({ ...run, name: controlReportName(run), report: read(controlReportName(run)) })), contrast: read(contrastReportName()) };
}

// ---------------------------------------------------------------------------------------------
// The Markdown matrix
// ---------------------------------------------------------------------------------------------
const line = cells => `| ${cells.join(' | ')} |`;
const bullets = (label, items) => (items.length === 1 ? [`- **${label}:** ${items[0]}`] : [`- **${label}:**`, ...items.map(item => `  - ${item}`)]);
const numbered = (label, items) => (items.length === 1 ? [`- **${label}:** ${items[0]}`] : [`- **${label}:**`, ...items.map((item, index) => `  ${index + 1}. ${item}`)]);

function controlResult(mode, code, evidenceSet) {
  const version = code.split('-')[0];
  const parts = [];
  for (const run of evidenceSet.runs.filter(item => item.version === version)) {
    if (run.report === null) continue;
    const found = run.report.runs.find(item => item.id === controlId(mode, code));
    if (found === undefined) continue;
    parts.push(`${found.status === 'recorded' ? 'recorded' : found.status} on the build of \`${run.build}\` (${BUILDS[run.build].engineVersion})`);
  }
  return parts.length === 0 ? 'Not run: no report is committed with this matrix.' : `Run under \`${RULESETS[version]}\`: ${parts.join('; ')}.`;
}

/** Deterministic text of the matrix of one number of players. `evidenceSet` is what loadControlEvidence returns. */
export function renderMatrix(mode, cases = casesOf(mode), evidenceSet = loadControlEvidence()) {
  const out = [];
  const say = text => { out.push(text); };
  const count = (list, status) => list.filter(item => item.status === status).length;
  say(`# Acceptance matrix for ${WORD[mode]} players: the specification of 13 October 2026`);
  say('');
  say('Generated by `npm run materialize --workspace @mothership/balance` from `tests/scenarios/next-version/catalog.mjs` and `controls.mjs`. Do not edit by hand; `npm run check --workspace @mothership/balance` fails when it is out of date. The same cases, for programs, are in `tests/scenarios/next-version/' + NEXT_VERSION_FILES[mode] + '`.');
  say('');
  say(`**No case of the next version has been run.** No engine plays the specification of 13 October 2026, and none of the ${cases.length} cases below counts as passed, failed or covered. What has been run is in the last part: controls on the three versions that exist, each under its own ruleset. The audit that goes with this matrix, with its findings and what Backend and Frontend need to provide, is [README.md](README.md).`);
  say('');
  say(`This is the matrix for ${WORD[mode]} players only. The three numbers of players are three games; their cases and their evidence are kept apart.`);
  say('');
  say('## What the cases are written against');
  say('');
  say(`The packet \`${SPEC.name}\`, six Markdown files that were local and uncommitted when they were read. Its digest is \`${SPEC.packetSha256}\`; the six hashes are in the audit. Its source basis, and the base of this branch, is \`${SPEC.sourceBasis.commit}\` (${SPEC.sourceBasis.engineVersion}, \`${SPEC.sourceBasis.rulesetVersion}\`).`);
  say('');
  say(`Version of every case: ${VERSION}`);
  say('');
  say('## How to read a case');
  say('');
  for (const item of CONVENTIONS) say(`- ${item}`);
  say('');
  say('Each case names the sections (G) and register entries (Q) of the packet it rests on, and the rules of the earlier versions that the packet keeps and the case uses: rows of [the rulebook](../game-rules.md) (R-), rows of [the capacity audit](../capacity-audit.md) (R-CAP-), and decisions of the three later overlays (PASS-, VOTE-RESULT-, HACK-DECLARE-).');
  say('');
  say(line(['Basis', 'Meaning']));
  say(line(['---', '---']));
  for (const [key, meaning] of Object.entries(BASES)) say(line([key, meaning]));
  say('');
  say('## The players');
  say('');
  say(line(['Player', 'Role', 'Side']));
  say(line(['---', '---', '---']));
  for (const item of roster(mode)) say(line([item.seat, item.role, item.faction]));
  say('');
  say('## Layouts');
  say('');
  say('The positions assume that the players of a starting room hold its lowest positions in order of player number. The packet does not say so (finding NV-F-06).');
  say('');
  for (const name of layoutsOf(mode)) {
    const rooms = layoutOf(name, mode);
    say(`**${name}**: ${LAYOUTS[name].title}. ${Object.entries(rooms).map(([room, occupants]) => `${room}: ${occupants.map(item => `${item.position} ${item.role}`).join(', ')}`).join('. ')}.`);
    say('');
  }
  say('## Summary');
  say('');
  say(line(['Area', 'Cases', 'Specified, not run', 'Of them, constructed state only', 'Not run, people or devices', 'Run']));
  say(line(['---', '---', '---', '---', '---', '---']));
  for (const [area, title] of Object.entries(AREAS)) {
    const mine = cases.filter(item => item.area === area);
    say(line([`${area}: ${title}`, mine.length, count(mine, 'specified') + count(mine, 'synthetic'), count(mine, 'synthetic'), count(mine, 'manual'), 0]));
  }
  say(line(['All', cases.length, count(cases, 'specified') + count(cases, 'synthetic'), count(cases, 'synthetic'), count(cases, 'manual'), 0]));
  say('');
  say(line(['Basis of the expectation', 'Cases']));
  say(line(['---', '---']));
  for (const key of Object.keys(BASES)) say(line([key, cases.filter(item => item.basis === key).length]));
  say('');
  say('Every section and register entry of the packet, and the cases that rest on it:');
  say('');
  say(line(['Reference', 'What it is', 'Cases']));
  say(line(['---', '---', '---']));
  const using = reference => cases.filter(item => item.specification.includes(reference)).map(item => item.code);
  for (const [reference, title] of Object.entries(SECTIONS)) say(line([reference, title, using(reference).join(', ') || 'none']));
  const AUTHORITY = { owner: 'Answered by the owner', blanket: 'Recommendation closed by the owner\'s blanket approval', integration: 'Completed by Integration under that approval' };
  for (const [reference, authority] of Object.entries(QUESTIONS)) say(line([reference, AUTHORITY[authority], using(reference).join(', ') || 'none']));
  say('');
  say('## Cases of the next version');
  say('');
  for (const [area, title] of Object.entries(AREAS)) {
    const mine = cases.filter(item => item.area === area);
    if (mine.length === 0) continue;
    say(`### ${area}: ${title}`);
    say('');
    for (const item of mine) {
      say(`#### ${item.id}: ${item.title}`);
      say('');
      say(`- **Specification:** ${item.specification.join(', ')}`);
      if (item.rules.length > 0) say(`- **Rules it keeps:** ${item.rules.join(', ')}`);
      for (const text of numbered('Start', item.preconditions)) say(text);
      for (const text of numbered('Sequence', item.sequence)) say(text);
      for (const text of bullets('Expected state', item.expected.state)) say(text);
      if (item.otherOutcome.length > 0) for (const text of bullets('The other outcome, not expected here', item.otherOutcome)) say(text);
      if (item.notes.length > 0) for (const text of bullets('Note', item.notes)) say(text);
      for (const text of bullets('Who sees what', item.expected.visibility)) say(text);
      for (const text of bullets('Timing', item.expected.timing)) say(text);
      say(`- **Basis:** ${item.basis}. **Evidence must come from:** ${LAYERS[item.layer].toLowerCase()}.`);
      say(`- **Execution:** ${STATUS_TEXT[item.status]}`);
      const also = [];
      if (item.pair !== null) also.push(`read beside NV-M${mode}-${item.pair}`);
      if (item.controls.length > 0) also.push(`today's behaviour: ${item.controls.map(code => controlId(mode, code)).join(', ')}`);
      if (item.findings.length > 0) also.push(`findings ${item.findings.join(', ')}`);
      if (item.needs.length > 0) also.push(`needs ${item.needs.join(', ')}`);
      if (also.length > 0) say(`- **See also:** ${also.join('; ')}.`);
      say('');
    }
  }
  say('## Controls on the versions that exist');
  say('');
  say('Each control plays a fixed line through a built engine under one named ruleset and holds the engine to what that ruleset\'s own sources say. They show what a version does today where the next version will differ or agree. They are not cases of the next version and say nothing about it. A control whose rule is open holds the engine to nothing and is reported as recorded, not as passed.');
  say('');
  for (const [version, ruleset] of Object.entries(RULESETS)) {
    const source = RULESET_SOURCES[version];
    say(`### \`${ruleset}\``);
    say('');
    say(`Engine version ${source.engineVersion}, ruleset hash \`${source.rulesetHash}\`, from ${source.published}.`);
    say('');
    for (const item of CONTROLS.filter(candidate => candidate.version === version)) {
      say(`#### ${controlId(mode, item.code)}: ${item.title}`);
      say('');
      say(`- **Expectation read from:** ${item.sources.join(', ')}`);
      say(`- **The next version at this point:** ${item.changes.map(code => `NV-M${mode}-${code}`).join(', ')}. ${item.note}`);
      say(`- **Execution:** ${controlResult(mode, item.code, evidenceSet)}`);
      say('');
    }
  }
  return `${out.join('\n').replace(/\n+$/, '')}\n`;
}

export { MODES };
