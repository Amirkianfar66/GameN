// Runs the static test files of the Balance workstream and fails unless they all ran and passed.
//
//   node scripts/static-tests.mjs [--dir <directory of *.test.mjs files>]
//
// `node --test` alone exits 0 when a test was skipped or marked todo, when its file pattern
// matches nothing, and for a file that defines no test at all, which it counts as one passed test.
// A required check must not: a test that did not run has shown nothing.
//
// Exit status: 0 only when every file ran at least one test and there was no failure,
// cancellation, skip or todo; otherwise 1.
import { readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { finished } from 'node:stream/promises';
import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const option = name => { const index = args.indexOf(name); return index < 0 ? null : args[index + 1] ?? null; };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const directory = resolve(process.env.INIT_CWD ?? process.cwd(), option('--dir') ?? join(root, 'tests/scenarios'));
const fail = message => { console.error(`Static checks: FAILED. ${message}`); process.exit(1); };

const files = readdirSync(directory).filter(name => name.endsWith('.test.mjs')).sort().map(name => join(directory, name));
if (files.length === 0) fail(`There is no test file in ${directory}.`);

let counts = null;
const stream = run({ files });
// The last summary without a file is the total over all files.
stream.on('test:summary', summary => { if (summary.file === undefined) counts = summary.counts; });
// The tests each file really ran. The runner reports a file without tests as a passed test that
// bears the file's own name; that entry and the suites are not counted.
const ranIn = new Map(files.map(file => [basename(file), 0]));
for (const kind of ['test:pass', 'test:fail']) {
  stream.on(kind, event => {
    if (event.details?.type === 'suite' || event.name === event.file || typeof event.file !== 'string') return;
    ranIn.set(basename(event.file), (ranIn.get(basename(event.file)) ?? 0) + 1);
  });
}
const output = stream.compose(spec);
output.pipe(process.stdout);
await finished(output);

if (counts === null) fail('The test runner gave no summary, so nothing is known to have run.');
const problems = [];
const tests = [...ranIn.values()].reduce((sum, value) => sum + value, 0);
if (tests < 1) problems.push('no test ran');
for (const [file, number] of ranIn) if (number === 0) problems.push(`${file} ran no test`);
for (const [key, label] of [['failed', 'failed'], ['cancelled', 'cancelled'], ['skipped', 'skipped'], ['todo', 'marked todo']]) {
  if (counts[key] !== 0) problems.push(`${counts[key]} ${label}`);
}
if (problems.length === 0 && counts.passed !== counts.tests) problems.push(`${counts.passed} of ${counts.tests} passed`);
const ran = `${tests} test${tests === 1 ? '' : 's'} in ${files.length} file${files.length === 1 ? '' : 's'}`;
if (problems.length > 0) fail(`Of ${ran}: ${problems.join(', ')}.`);
console.log(`Static checks: ${ran}, all passed; none failed, cancelled, skipped or marked todo.`);
