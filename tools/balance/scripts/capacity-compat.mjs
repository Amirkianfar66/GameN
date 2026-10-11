// Whether an engine that has the room-capacity rule (issue #96) still plays the earlier rulesets
// as the engine before it did. It reads reports that the scenario and playout commands wrote for
// two builds under each earlier ruleset, and writes one small summary of them.
//
//   node scripts/capacity-compat.mjs --dir <directory of reports> --before <commit> --after <commit> --out <summary.json>
//
// The directory holds, for each of the two commits (named by their first seven characters) and
// each earlier ruleset:
//   v1-scenarios-<commit>-<ruleset>.json   run-scenarios.mjs --ruleset <ruleset> --engine-root <build>
//   v1-playouts-<commit>-<ruleset>.json    walk.mjs --ruleset <ruleset> --digests --engine-root <build>
// and for the later commit, the Version 1 catalogue under that engine's own default ruleset:
//   v1-scenarios-<commit>-default.json     run-scenarios.mjs --engine-root <build>
//
// The reports themselves are large and are not kept. The summary keeps their pins, their totals
// and a digest of every result, so that "the same on both builds" is a comparison of two digests.
//
// Exit status: 0 when both builds gave the same results under every earlier ruleset and nothing
// failed there; 1 when they differ or something failed; 2 when a report is missing or is not
// what its name says.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { canonicalJson } from '@mothership/balance';
import { invocationPath, readArgs } from './args.mjs';

const refuse = message => { console.error(`FAILED: ${message} Nothing was summarized.`); process.exit(2); };
const { values } = readArgs({ values: ['dir', 'before', 'after', 'out'] }, refuse);
for (const name of ['dir', 'before', 'after', 'out']) if (values[name] === null) refuse(`--${name} is required.`);
for (const name of ['before', 'after']) if (!/^[0-9a-f]{40}$/.test(values[name])) refuse(`--${name} needs a full commit.`);
const directory = invocationPath(values.dir);
// The rulesets an engine played before the capacity rule, oldest last.
const EARLIER_RULESETS = ['in-person-v1-pass-2026-10-08', 'in-person-v1-2026-10-06'];

const sha256 = value => createHash('sha256').update(value).digest('hex');
const read = (name, commit) => {
  const path = join(directory, name);
  if (!existsSync(path)) refuse(`${name} is not in ${directory}.`);
  const report = JSON.parse(readFileSync(path, 'utf8'));
  if (report.pins?.engineCommit !== commit) refuse(`${name} was run against ${String(report.pins?.engineCommit)}, not ${commit}.`);
  if (report.pins?.engineTreeClean !== true) refuse(`${name} was run against a checkout with uncommitted changes.`);
  return report;
};
const scenarios = (commit, ruleset) => {
  const report = read(`v1-scenarios-${commit.slice(0, 7)}-${ruleset}.json`, commit);
  if (ruleset !== 'default' && report.pins.engine?.rulesetVersion !== ruleset) refuse(`the scenario report of ${commit.slice(0, 7)} under ${ruleset} names ${String(report.pins.engine?.rulesetVersion)}.`);
  return {
    engine: report.pins.engine, engineBuildSha256: report.pins.engineBuildSha256, scenarioFileHashes: report.pins.scenarioFileHashes, workingTreeCommit: report.pins.workingTreeCommit,
    totals: report.totals, resultsSha256: sha256(canonicalJson(report.runs)),
    refusedAtCreation: report.runs.filter(run => run.status === 'failed' && run.failure?.op === 'create').length,
    invariantViolations: report.runs.reduce((sum, run) => sum + run.invariantViolations.length, 0),
  };
};
const playouts = (commit, ruleset) => {
  const report = read(`v1-playouts-${commit.slice(0, 7)}-${ruleset}.json`, commit);
  if (report.pins.engine?.rulesetVersion !== ruleset) refuse(`the playout report of ${commit.slice(0, 7)} under ${ruleset} names ${String(report.pins.engine?.rulesetVersion)}.`);
  return {
    seedsPerMode: report.seedsPerMode,
    modes: Object.fromEntries(Object.entries(report.modes).map(([mode, stats]) => [mode, {
      playouts: stats.playouts, completed: stats.completed, invariantViolations: stats.invariantViolations, hintMismatches: stats.hintMismatches,
      replayMismatches: stats.replayMismatches, endStatesSha256: stats.endStatesSha256 ?? null,
    }])),
  };
};

const rulesets = {};
let problems = 0;
for (const ruleset of EARLIER_RULESETS) {
  const before = { scenarios: scenarios(values.before, ruleset), playouts: playouts(values.before, ruleset) };
  const after = { scenarios: scenarios(values.after, ruleset), playouts: playouts(values.after, ruleset) };
  const sameResults = before.scenarios.resultsSha256 === after.scenarios.resultsSha256;
  const digests = side => Object.values(side.playouts.modes).map(stats => stats.endStatesSha256);
  const sameEndStates = digests(before).every(digest => digest !== null) && canonicalJson(digests(before)) === canonicalJson(digests(after));
  const clean = [before, after].every(side => side.scenarios.totals.failed === 0 && side.scenarios.invariantViolations === 0
    && Object.values(side.playouts.modes).every(stats => stats.completed === stats.playouts && stats.invariantViolations + stats.hintMismatches + stats.replayMismatches === 0));
  if (!sameResults || !sameEndStates || !clean) problems += 1;
  rulesets[ruleset] = { before, after, sameResults, sameEndStates, clean };
  console.log(`${ruleset}: scenarios ${after.scenarios.totals.passed} passed, ${after.scenarios.totals.failed} failed on the later build; every result the same on both builds: ${sameResults}; playouts end in the same states on both: ${sameEndStates}`);
}
const underDefault = scenarios(values.after, 'default');
console.log(`Version 1 catalogue under the later build's own default (${underDefault.engine?.rulesetVersion}): ${underDefault.totals.passed} passed, ${underDefault.totals.failed} failed, of which ${underDefault.refusedAtCreation} because the engine refused the start`);

const summary = {
  schema: 'mothership.balance.capacity-compat/1', generatedAt: new Date().toISOString(), node: process.version,
  before: values.before, after: values.after, rulesets, catalogueUnderTheDefaultOfTheLaterBuild: underDefault,
  verdict: problems === 0 ? 'the-same' : 'different-or-failed',
};
const target = invocationPath(values.out);
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(summary, null, 1)}\n`);
console.log(`Summary written to ${target}`);
process.exit(problems === 0 ? 0 : 1);
