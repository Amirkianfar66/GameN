import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { checkProductionExclusion, DEV_ONLY_SENTINEL, FORBIDDEN_MARKERS, workspaceOptions } from '../scripts/check-production-exclusion.mjs';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const script = fileURLToPath(new URL('../scripts/check-production-exclusion.mjs', import.meta.url));

const manifest = (extra = {}) => JSON.stringify({ name: 'x', files: ['dist'], exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' } }, ...extra });
const labeled = `globalThis[Symbol.for('${DEV_ONLY_SENTINEL}')] = true;\n`;

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

const problemsOf = (t, overrides) => checkProductionExclusion(sandbox(t, overrides).options).problems;
const startModule = body => ({ 'app/dist/screens/start.js': `${body}\n` });

test('a clean workspace passes and its fixture module is simply never reached', t => {
  const { options } = sandbox(t);
  const result = checkProductionExclusion(options);
  assert.deepEqual(result.problems, []);
  assert.deepEqual(result.reachable, ['app/dist/index.js', 'app/dist/screens/start.js', 'contracts/dist/index.js', 'lib/dist/index.js']);
  assert.equal(result.scanned, 4);
});

test('importing the fixture subpath is refused, statically or dynamically', t => {
  for (const line of ["import { createOfficerFixture } from '@t/contracts/fixtures';", "export const load = () => import('@t/contracts/fixtures');"]) {
    const problems = problemsOf(t, startModule(line));
    assert.equal(problems.some(problem => problem.includes('imports the subpath "@t/contracts/fixtures"')), true, line);
  }
});

test('a relative import cannot reach a development or test module', t => {
  const problems = problemsOf(t, {
    ...startModule("import { serve } from '../../dev/serve.js';\nexport const start = serve;"),
    'app/dev/serve.js': `${labeled}export const serve = 1;\n`,
  });
  assert.equal(problems.some(problem => problem.includes('app/dev/serve.js: production code reaches a module outside its package\'s build output')), true);
  assert.equal(problems.some(problem => problem.includes('app/dev/serve.js: fixture, test or development module is reachable')), true);
  assert.equal(problems.some(problem => problem.includes(`contains the fixture/development marker "${DEV_ONLY_SENTINEL}"`)), true);

  for (const name of ['fixtures.js', 'Fixtures.js', 'officer-fixture.mjs', 'start.test.js', 'start.spec.js']) {
    const nested = problemsOf(t, { 'app/dist/index.js': `export * from './${name}';\n`, [`app/dist/${name}`]: 'export const a = 1;\n' });
    assert.equal(nested.some(problem => problem.includes(`app/dist/${name}: fixture, test or development module is reachable`)), true, name);
  }
  const directory = problemsOf(t, { 'app/dist/index.js': "export * from './Dev/tool.js';\n", 'app/dist/Dev/tool.js': 'export const a = 1;\n' });
  assert.equal(directory.some(problem => problem.includes('fixture, test or development module is reachable')), true, 'directory names are matched whatever their case');
});

test('imports the check cannot follow are failures, not blind spots', t => {
  const dynamic = problemsOf(t, startModule('const name = "./x.js";\nexport const start = () => import(name);'));
  assert.equal(dynamic.some(problem => problem.includes('dynamic import that cannot be followed statically')), true);
  const missing = problemsOf(t, { 'app/dist/screens/start.js': null });
  assert.equal(missing.some(problem => problem.includes('app/dist/screens/start.js: reachable module does not exist')), true);
});

test('a module kind the check cannot parse is refused, as is a directory import', t => {
  const commonjs = problemsOf(t, { ...startModule("import legacy from './legacy.cjs';\nexport const start = legacy;"), 'app/dist/screens/legacy.cjs': "module.exports = require('../../dev/serve.js');\n" });
  assert.deepEqual(commonjs, ['app/dist/screens/legacy.cjs: imported module of a kind this check cannot follow (".cjs")']);
  const bare = problemsOf(t, { ...startModule("import x from './blob';\nexport const start = x;"), 'app/dist/screens/blob': 'export default 1;\n' });
  assert.deepEqual(bare, ['app/dist/screens/blob: imported module of a kind this check cannot follow ("no extension")']);
  const directory = problemsOf(t, { ...startModule("import x from './parts';\nexport const start = x;"), 'app/dist/screens/parts/index.js': 'export default 1;\n' });
  assert.deepEqual(directory, ['app/dist/screens/parts: a directory is referenced; this check cannot tell which file a resolver would pick']);
  // Plain data is allowed, and is still scanned.
  const data = { ...startModule("import data from './data.json' with { type: 'json' };\nexport const start = data;") };
  assert.deepEqual(problemsOf(t, { ...data, 'app/dist/screens/data.json': '{"ok":true}\n' }), []);
  assert.deepEqual(problemsOf(t, { ...data, 'app/dist/screens/data.json': '{"matchId":"fixture-match-a"}\n' }), ['app/dist/screens/data.json: contains the fixture/development marker "fixture-match-"']);
});

test('a file reached by URL instead of by import is followed too', t => {
  const dev = { 'app/dev/serve.js': `${labeled}export const serve = 1;\n` };
  const escape = problemsOf(t, { ...startModule("export const start = new URL('../../dev/serve.js', import.meta.url);"), ...dev });
  assert.equal(escape.some(problem => problem.includes('app/dev/serve.js: production code reaches a module outside its package\'s build output')), true);
  assert.equal(escape.some(problem => problem.includes('app/dev/serve.js: fixture, test or development module is reachable')), true);

  const worker = problemsOf(t, {
    ...startModule("export const start = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });"),
    'app/dist/screens/worker.js': "import { createOfficerFixture } from '@t/contracts/fixtures';\nexport default createOfficerFixture;\n",
  });
  assert.equal(worker.some(problem => problem.includes('app/dist/screens/worker.js: imports the subpath "@t/contracts/fixtures"')), true);

  const computed = problemsOf(t, startModule('const name = "./worker.js";\nexport const start = new URL(name, import.meta.url);'));
  assert.deepEqual(computed, ['app/dist/screens/start.js: file URL that cannot be followed statically']);
  const resolved = problemsOf(t, { ...startModule("export const start = import.meta.resolve('../../dev/serve.js');"), ...dev });
  assert.equal(resolved.some(problem => problem.includes('app/dev/serve.js: fixture, test or development module is reachable')), true);
  assert.deepEqual(problemsOf(t, startModule('const name = "x";\nexport const start = import.meta.resolve(name);')), ['app/dist/screens/start.js: import.meta.resolve that cannot be followed statically']);

  // An ordinary asset inside the build output is fine; one that is missing is reported.
  assert.deepEqual(problemsOf(t, { ...startModule("export const start = new URL('./logo.svg', import.meta.url);"), 'app/dist/screens/logo.svg': '<svg/>\n' }), []);
  assert.deepEqual(problemsOf(t, startModule("export const start = new URL('./logo.svg', import.meta.url);")), ['app/dist/screens/logo.svg: reachable file does not exist; build before running this check']);
  // A URL that is not relative to the module is not a way into the package.
  assert.deepEqual(problemsOf(t, startModule("export const start = new URL('/api/time', 'https://example.test');")), []);
});

test('only reviewed production dependencies may be imported, and never by a deep path', t => {
  const unknown = problemsOf(t, startModule("import pad from 'left-pad';\nexport const start = pad;"));
  assert.equal(unknown.some(problem => problem.includes('imports "left-pad", which is not a reviewed production dependency')), true);
  const deep = problemsOf(t, startModule("import x from 'zod/v4/core/index.js';\nexport const start = x;"));
  assert.equal(deep.some(problem => problem.includes('imports the subpath "zod/v4/core/index.js" of an external package')), true);
  const builtin = problemsOf(t, startModule("import { readFileSync } from 'node:fs';\nexport const start = readFileSync;"));
  assert.equal(builtin.some(problem => problem.includes('production client code references "node:fs"')), true);
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

test('a package may have only one way in: no extra condition, legacy entry field or nested target', t => {
  const withExports = main => manifest({ exports: { '.': main } });
  for (const condition of ['browser', 'default', 'development', 'production', 'require', 'node']) {
    const problems = problemsOf(t, { 'app/package.json': withExports({ import: './dist/index.js', [condition]: './dev/serve.js' }) });
    assert.deepEqual(problems, [`@t/app: export "." uses the "${condition}" condition; a bundler could resolve it to a file this check does not follow`], condition);
  }
  for (const field of ['main', 'module', 'browser', 'imports', 'bin']) {
    assert.deepEqual(problemsOf(t, { 'app/package.json': manifest({ [field]: './dev/serve.js' }) }), [`@t/app: package.json field "${field}" gives a resolver a second way into the package`], field);
  }
  assert.deepEqual(problemsOf(t, { 'app/package.json': withExports({ import: { default: './dist/index.js' } }) }), [
    '@t/app: export "." nests conditions under "import"', '@t/app: package.json has no "." import entry to check',
  ]);
  assert.deepEqual(problemsOf(t, { 'app/package.json': manifest({ exports: { import: './dist/index.js' } }) }), ['@t/app: package.json "exports" must be a map of subpaths']);
  assert.deepEqual(problemsOf(t, { 'app/package.json': manifest({ exports: './dist/index.js' }) }), ['@t/app: package.json "exports" must be a map of subpaths']);

  // The same holds for a package that is not an entry but is reached through one.
  const reached = problemsOf(t, { 'contracts/package.json': manifest({ module: './dist/fixtures.js', exports: { '.': { import: './dist/index.js', browser: './dist/fixtures.js' } } }) });
  assert.deepEqual(reached, [
    '@t/contracts: package.json field "module" gives a resolver a second way into the package',
    '@t/contracts: export "." uses the "browser" condition; a bundler could resolve it to a file this check does not follow',
  ]);
});

test('a production package may expose only its main entry and ship only its build', t => {
  const subpath = problemsOf(t, { 'app/package.json': manifest({ exports: { '.': { import: './dist/index.js' }, './dev': { import: './dev/serve.js' } } }) });
  assert.equal(subpath.some(problem => problem.includes('@t/app: production package must export only "."')), true);
  const files = problemsOf(t, { 'lib/package.json': manifest({ files: ['dist', 'dev'] }) });
  assert.equal(files.some(problem => problem.includes('@t/lib: production package must ship only "dist"')), true);
});

test('a development file must carry the sentinel in code, where minification cannot remove it', t => {
  const missing = name => [`app/dev/${name}: development file does not carry the "${DEV_ONLY_SENTINEL}" sentinel in code`];
  // A comment is not enough for anything that can be bundled or minified.
  assert.deepEqual(problemsOf(t, { 'app/dev/tool.mjs': `// ${DEV_ONLY_SENTINEL}\nexport const a = 1;\n` }), missing('tool.mjs'));
  assert.deepEqual(problemsOf(t, { 'app/dev/tool.js': `/* ${DEV_ONLY_SENTINEL} */\nexport const a = 1;\n` }), missing('tool.js'));
  assert.deepEqual(problemsOf(t, { 'app/dev/page.html': `<!doctype html><!-- ${DEV_ONLY_SENTINEL} --><title>harness</title>\n` }), missing('page.html'));
  assert.deepEqual(problemsOf(t, { 'app/dev/page.css': `/* ${DEV_ONLY_SENTINEL} */\nbody { margin: 0; }\n` }), missing('page.css'));
  assert.deepEqual(problemsOf(t, { 'app/dev/unlabeled.mjs': 'export const a = 1;\n' }), missing('unlabeled.mjs'));

  assert.deepEqual(problemsOf(t, {
    'app/dev/tool.mjs': `${labeled}export const a = 1;\n`,
    'app/dev/page.html': `<!doctype html><meta name="${DEV_ONLY_SENTINEL}" content="harness"><title>harness</title>\n`,
    'app/dev/page.css': `html { --label: "${DEV_ONLY_SENTINEL}"; }\n`,
    'app/dev/README.md': `<!-- ${DEV_ONLY_SENTINEL} -->\nNotes.\n`,
  }), []);
});

test('the real development modules stay labeled with every comment stripped, and are caught in a bundle', t => {
  const devDirectory = join(repositoryRoot, 'apps/game/dev');
  const list = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => (entry.isDirectory() ? list(join(directory, entry.name)) : [join(directory, entry.name)]));
  const modules = list(devDirectory).filter(file => ['.js', '.mjs'].includes(extname(file)));
  assert.equal(modules.length >= 9, true);
  const bundle = mkdtempSync(join(tmpdir(), 'mothership-stripped-'));
  t.after(() => rmSync(bundle, { recursive: true, force: true }));
  modules.forEach((file, index) => {
    const stripped = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { removeComments: true, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText;
    assert.equal(/^\s*\/\//m.test(stripped), false, `${file} still has comments`);
    assert.equal(stripped.includes(DEV_ONLY_SENTINEL), true, `${file} loses its label without comments`);
    writeFileSync(join(bundle, `chunk-${index}.js`), stripped);
  });
  const result = checkProductionExclusion(workspaceOptions(repositoryRoot, [bundle]));
  const flagged = new Set(result.problems.filter(problem => problem.includes(`marker "${DEV_ONLY_SENTINEL}"`)).map(problem => problem.split(':')[0]));
  assert.equal(flagged.size, modules.length, 'every stripped development module is reported');
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
  assert.equal(result.devFiles >= 15, true);
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
