import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkProductionExclusion, DEV_ONLY_SENTINEL, FORBIDDEN_MARKERS, workspaceOptions } from '../scripts/check-production-exclusion.mjs';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const script = fileURLToPath(new URL('../scripts/check-production-exclusion.mjs', import.meta.url));

const manifest = (extra = {}) => JSON.stringify({ name: 'x', files: ['dist'], exports: { '.': { import: './dist/index.js' } }, ...extra });

/** Builds a throwaway workspace: an app, a library it depends on, and a contracts-like package. */
function sandbox(t, overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'mothership-exclusion-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const files = {
    'app/package.json': manifest(),
    'app/dist/index.js': "import { model } from '@t/lib';\nimport { parse } from '@t/contracts';\nexport { start } from './screens/start.js';\nexport const value = [model, parse];\n",
    'app/dist/screens/start.js': "import { z } from 'zod';\nexport const start = () => z;\n",
    'lib/package.json': manifest(),
    'lib/dist/index.js': "export const model = 'fixture';\n",
    'contracts/package.json': manifest({ exports: { '.': { import: './dist/index.js' }, './fixtures': { import: './dist/fixtures.js' } } }),
    'contracts/dist/index.js': "export const parse = () => true;\n",
    'contracts/dist/fixtures.js': "export const createOfficerFixture = () => ({ fixtureOnly: true, serverOnly: {} });\n",
    ...overrides,
  };
  for (const [path, content] of Object.entries(files)) {
    if (content === null) continue;
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  const at = path => join(root, path);
  return {
    root,
    options: {
      root,
      packages: { '@t/app': at('app'), '@t/lib': at('lib'), '@t/contracts': at('contracts') },
      entries: ['@t/app', '@t/lib'],
      external: ['zod'],
      scanDirectories: [at('app/dist'), at('lib/dist')],
      sourceDirectories: [at('app/src'), at('lib/src')],
      devDirectories: [at('app/dev')],
    },
  };
}

const problemsOf = (t, overrides, adjust = options => options) => checkProductionExclusion(adjust(sandbox(t, overrides).options)).problems;

test('a clean workspace passes and its fixture module is simply never reached', t => {
  const { options } = sandbox(t);
  const result = checkProductionExclusion(options);
  assert.deepEqual(result.problems, []);
  assert.deepEqual(result.reachable, ['app/dist/index.js', 'app/dist/screens/start.js', 'contracts/dist/index.js', 'lib/dist/index.js']);
  assert.equal(result.scanned, 4);
});

test('importing the fixture subpath is refused, statically or dynamically', t => {
  for (const line of ["import { createOfficerFixture } from '@t/contracts/fixtures';", "export const load = () => import('@t/contracts/fixtures');"]) {
    const problems = problemsOf(t, { 'app/dist/screens/start.js': `${line}\n` });
    assert.equal(problems.some(problem => problem.includes('imports the subpath "@t/contracts/fixtures"')), true, line);
    assert.equal(problems.some(problem => problem.includes('"@mothership/contracts/fixtures"') || problem.includes('"createOfficerFixture"')), line.includes('createOfficerFixture'), line);
  }
});

test('a relative import cannot reach a development or test module', t => {
  const problems = problemsOf(t, {
    'app/dist/screens/start.js': "import { serve } from '../../dev/serve.js';\nexport const start = serve;\n",
    'app/dev/serve.js': `// ${DEV_ONLY_SENTINEL}\nexport const serve = 1;\n`,
  });
  assert.equal(problems.some(problem => problem.includes('app/dev/serve.js: production code reaches a module outside its package\'s build output')), true);
  assert.equal(problems.some(problem => problem.includes('app/dev/serve.js: fixture, test or development module is reachable')), true);
  assert.equal(problems.some(problem => problem.includes(`contains the fixture/development marker "${DEV_ONLY_SENTINEL}"`)), true);

  const nested = problemsOf(t, { 'app/dist/index.js': "export * from './fixtures.js';\n", 'app/dist/fixtures.js': 'export const a = 1;\n' });
  assert.equal(nested.some(problem => problem.includes('app/dist/fixtures.js: fixture, test or development module is reachable')), true);
});

test('imports the check cannot follow are failures, not blind spots', t => {
  const dynamic = problemsOf(t, { 'app/dist/screens/start.js': 'const name = "./x.js";\nexport const start = () => import(name);\n' });
  assert.equal(dynamic.some(problem => problem.includes('dynamic import that cannot be followed statically')), true);
  const missing = problemsOf(t, { 'app/dist/screens/start.js': null });
  assert.equal(missing.some(problem => problem.includes('app/dist/screens/start.js: reachable module does not exist')), true);
});

test('only reviewed production dependencies may be imported, and never by a deep path', t => {
  const unknown = problemsOf(t, { 'app/dist/screens/start.js': "import chalk from 'left-pad';\nexport const start = chalk;\n" });
  assert.equal(unknown.some(problem => problem.includes('imports "left-pad", which is not a reviewed production dependency')), true);
  const deep = problemsOf(t, { 'app/dist/screens/start.js': "import x from 'zod/v4/core/index.js';\nexport const start = x;\n" });
  assert.equal(deep.some(problem => problem.includes('imports the subpath "zod/v4/core/index.js" of an external package')), true);
  const builtin = problemsOf(t, { 'app/dist/screens/start.js': "import { readFileSync } from 'node:fs';\nexport const start = readFileSync;\n" });
  assert.equal(builtin.some(problem => problem.includes('production client code imports "node:fs"')), true);
});

test('fixture identifiers are caught in any shipped file, reachable or not', t => {
  for (const marker of FORBIDDEN_MARKERS) {
    const problems = problemsOf(t, { 'app/dist/unused.js': `export const leaked = ${JSON.stringify(marker)};\n` });
    assert.deepEqual(problems, [`app/dist/unused.js: contains the fixture/development marker "${marker}"`], marker);
  }
  const source = problemsOf(t, { 'lib/src/copy.ts': "export const id = 'fixture-match-a';\n" });
  assert.deepEqual(source, ['lib/src/copy.ts: contains the fixture/development marker "fixture-match-"']);
});

test('a bundler output directory is scanned in full', t => {
  const { root, options } = sandbox(t, { 'app/build/assets/chunk-abc.js': 'const a={fixtureOnly:!0,serverOnly:{seats:[]}};export{a};\n' });
  const result = checkProductionExclusion({ ...options, scanDirectories: [...options.scanDirectories, join(root, 'app/build')] });
  assert.deepEqual(result.problems, [
    'app/build/assets/chunk-abc.js: contains the fixture/development marker "fixtureOnly"',
    'app/build/assets/chunk-abc.js: contains the fixture/development marker "serverOnly"',
  ]);
});

test('every development file must carry the sentinel that the content scan looks for', t => {
  const problems = problemsOf(t, {
    'app/dev/labeled.mjs': `// ${DEV_ONLY_SENTINEL}\nexport const a = 1;\n`,
    'app/dev/harness/page.html': '<!doctype html><title>harness</title>\n',
  });
  assert.deepEqual(problems, [`app/dev/harness/page.html: development file is missing the "${DEV_ONLY_SENTINEL}" sentinel`]);
});

test('a production package may expose only its main entry and ship only its build', t => {
  const subpath = problemsOf(t, { 'app/package.json': manifest({ exports: { '.': { import: './dist/index.js' }, './dev': { import: './dev/serve.js' } } }) });
  assert.equal(subpath.some(problem => problem.includes('@t/app: production package must export only "."')), true);
  const files = problemsOf(t, { 'lib/package.json': manifest({ files: ['dist', 'dev'] }) });
  assert.equal(files.some(problem => problem.includes('@t/lib: production package must ship only "dist"')), true);
});

test('the real client passes, with the contract fixture present on disk but unreachable', () => {
  assert.equal(existsSync(join(repositoryRoot, 'packages/contracts/dist/fixtures.js')), true, 'Build the workspace before this test');
  const result = checkProductionExclusion(workspaceOptions(repositoryRoot));
  assert.deepEqual(result.problems, []);
  assert.equal(result.reachable.includes('apps/game/dist/index.js'), true);
  assert.equal(result.reachable.includes('packages/presentation/dist/index.js'), true);
  assert.equal(result.reachable.includes('packages/contracts/dist/index.js'), true);
  assert.equal(result.reachable.some(file => /fixture/i.test(file)), false);
  assert.equal(result.reachable.some(file => file.startsWith('apps/game/dev/') || file.includes('/test/')), false);
});

test('the command exits non-zero and names the file when a bundle leaks fixture truth', t => {
  const clean = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.equal(clean.status, 0, clean.stderr);
  assert.match(clean.stdout, /^Production exclusion: \d+ modules reachable from 2 production entries/);

  const bundle = mkdtempSync(join(tmpdir(), 'mothership-bundle-'));
  t.after(() => rmSync(bundle, { recursive: true, force: true }));
  writeFileSync(join(bundle, 'index-abc123.js'), 'export const f = { fixtureOnly: true };\n');
  const leaking = spawnSync(process.execPath, [script, '--bundle', bundle], { encoding: 'utf8' });
  assert.equal(leaking.status, 1);
  assert.match(leaking.stderr, /Production exclusion check failed:/);
  assert.match(leaking.stderr, /index-abc123\.js: contains the fixture\/development marker "fixtureOnly"/);

  const missing = spawnSync(process.execPath, [script, '--bundle', join(bundle, 'nope')], { encoding: 'utf8' });
  assert.notEqual(missing.status, 0);
});
