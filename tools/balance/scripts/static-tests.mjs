// Runs the static test files of the Balance workstream and fails unless they all ran and passed.
//
//   node scripts/static-tests.mjs [--dir <directory of *.test.mjs files>] [--allow-missing-overlay]
//
// `node --test` alone exits 0 when a test or a whole suite was skipped or marked todo, when its
// file pattern matches nothing, for a file that defines no test at all (it counts that file as one
// passed test), and for a file that ends the process before all its tests have finished. A
// required check must not: a test that did not run has shown nothing.
//
//   --allow-missing-overlay   Three tests compare the rulebook with the owner-decision file, which
//                             belongs to the engine and is not on a branch that has no engine. On
//                             such a branch they skip, and without this switch the check fails.
//                             With it those three skips, and no other, are accepted and reported.
//                             It is refused where the file is present, so that it cannot be left
//                             in a command that is meant to check everything.
//
// Exit status: 0 only when every file ran at least one test, every test that was started
// finished, and there was no failure, cancellation, skip or todo; otherwise 1. 2 when the command
// line cannot be understood.
//
// What it cannot see: a test that decides for itself to return before it asserts anything, and a
// test that its file never registers because the file ends the process first. The runner is told
// of neither. A test that cannot run where it is must say so by skipping.
import { existsSync, readdirSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { finished } from 'node:stream/promises';
import { run } from 'node:test';
import { spec, tap } from 'node:test/reporters';
import { fileURLToPath } from 'node:url';
import { OVERLAY_ABSENT, V1_OVERLAY_PATH } from '../../../tests/scenarios/v1/files.mjs';
import { invocationPath, readArgs } from './args.mjs';

const fail = message => { console.error(`Static checks: FAILED. ${message}`); process.exit(1); };
const { values, flags } = readArgs({ values: ['dir'], flags: ['allow-missing-overlay'] }, message => {
  console.error(`Static checks: NOT RUN. ${message}`);
  process.exit(2);
});
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const directory = values.dir === null ? join(root, 'tests/scenarios') : invocationPath(values.dir);
const overlayPresent = existsSync(join(root, V1_OVERLAY_PATH));
if (flags['allow-missing-overlay'] && overlayPresent) fail(`--allow-missing-overlay was given, but ${V1_OVERLAY_PATH} is in this checkout. Remove the switch: every test must run here.`);
// Options of the test runner can arrive through the environment, where nobody reading the command
// sees them, and some of them filter tests without reporting a skip.
if (/(^|\s)--test-/.test(process.env.NODE_OPTIONS ?? '')) fail('NODE_OPTIONS carries an option of the test runner. Tests are run as this command runs them, or not at all.');

const entries = readdirSync(directory, { withFileTypes: true, recursive: true }).filter(entry => entry.isFile());
const files = entries.filter(entry => (entry.parentPath ?? entry.path) === directory && entry.name.endsWith('.test.mjs')).map(entry => join(directory, entry.name)).sort();
if (files.length === 0) fail(`There is no test file in ${directory}.`);
// A file that looks like a test and is not run would be a check that silently does not happen.
const unrun = entries.map(entry => join(entry.parentPath ?? entry.path, entry.name))
  .filter(path => /\.(test|spec)\.[cm]?[jt]sx?$/.test(path) && !files.includes(path) && !path.includes(`${join('node_modules', '')}`));
if (unrun.length > 0) fail(`These look like test files and are not run by this check, which runs *.test.mjs directly in ${directory}: ${unrun.map(path => relative(directory, path)).join(', ')}.`);

let counts = null;
const stream = run({ files });
// The last summary without a file is the total over all files.
stream.on('test:summary', summary => { if (summary.file === undefined) counts = summary.counts; });
// What each file really did. The runner reports a file without tests as a passed test that bears
// the file's own name, and it counts a skipped suite under suites and not under skipped: both are
// read from the events here and not from its totals.
const perFile = new Map(files.map(file => [basename(file), { ran: 0, started: 0, finished: 0 }]));
const of = event => (typeof event.file === 'string' && event.name !== event.file ? perFile.get(basename(event.file)) : undefined);
const skipped = [];
const todo = [];
stream.on('test:enqueue', event => { const file = of(event); if (file !== undefined) file.started += 1; });
stream.on('test:complete', event => { const file = of(event); if (file !== undefined) file.finished += 1; });
for (const kind of ['test:pass', 'test:fail']) {
  stream.on(kind, event => {
    const file = of(event);
    if (file === undefined) return;
    if (event.skip !== undefined && event.skip !== false) skipped.push({ name: event.name, reason: typeof event.skip === 'string' ? event.skip : '' });
    else if (event.todo !== undefined && event.todo !== false) todo.push(event.name);
    if (event.details?.type !== 'suite') file.ran += 1;
  });
}
// The same choice `node --test` makes: readable on a terminal, TAP when the output is captured.
// A caller that reads the totals, as the integration gate does, finds the lines it knows.
const output = stream.compose(process.stdout.isTTY ? spec : tap);
output.pipe(process.stdout);
await finished(output);

if (counts === null) fail('The test runner gave no summary, so nothing is known to have run.');
const problems = [];
const tests = [...perFile.values()].reduce((sum, file) => sum + file.ran, 0);
if (tests < 1) problems.push('no test ran');
for (const [name, file] of perFile) {
  if (file.ran === 0) problems.push(`${name} ran no test`);
  if (file.finished < file.started) problems.push(`${name} started ${file.started} tests and suites and finished ${file.finished}`);
}
// The only skips that can be accepted are the named ones, on a branch where the file they need is absent.
const accepted = flags['allow-missing-overlay'] ? skipped.filter(item => item.reason === OVERLAY_ABSENT) : [];
const refused = skipped.filter(item => !accepted.includes(item));
if (refused.length > 0) problems.push(`${refused.length} skipped (${refused.slice(0, 5).map(item => (item.reason === '' ? item.name : `${item.name}: ${item.reason}`)).join('; ')})`);
if (todo.length > 0) problems.push(`${todo.length} marked todo`);
if (counts.failed !== 0) problems.push(`${counts.failed} failed`);
if (counts.cancelled !== 0) problems.push(`${counts.cancelled} cancelled`);
const ran = `${tests} test${tests === 1 ? '' : 's'} in ${files.length} file${files.length === 1 ? '' : 's'}`;
if (problems.length > 0) {
  const hint = refused.some(item => item.reason === OVERLAY_ABSENT) ? ` On a branch without the engine, where ${V1_OVERLAY_PATH} does not exist, pass --allow-missing-overlay; the tests that need it then stay skipped and are reported so.` : '';
  fail(`Of ${ran}: ${problems.join(', ')}.${hint}`);
}
if (accepted.length > 0) {
  console.log(`Static checks: ${ran}; ${tests - accepted.length} passed and ${accepted.length} were NOT RUN because ${OVERLAY_ABSENT} (--allow-missing-overlay); none failed, was cancelled or was marked todo.`);
  for (const item of accepted) console.log(`  not run: ${item.name}`);
} else console.log(`Static checks: ${ran}, all passed; none failed, cancelled, skipped or marked todo.`);
