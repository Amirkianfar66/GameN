import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
import { checkDependency, checkSourceImports, checkWorkspace } from '../../scripts/check-workspace.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const check = (workspace, text, extension = 'tsx') => checkSourceImports(root, workspace, resolve(root, workspace, `src/probe.${extension}`), text);

test('TSX static, export, dynamic and type imports reject fixture and unreviewed subpaths', () => {
  for (const source of [
    "import { createOfficerFixture } from '@mothership/contracts/fixtures'; const view = <div />;",
    "export * from '@mothership/contracts/fixtures';",
    "void import('@mothership/contracts/fixtures');",
    "type Fixture = import('@mothership/contracts/fixtures').Fixture;",
    "import Fixture = require('@mothership/contracts/fixtures');",
    "require('@mothership/contracts/fixtures');",
    "import 'firebase/compat/app';",
    "import 'firebase/analytics';",
    "import 'react-dom/server';",
    "import 'react/internal';",
  ]) assert.throws(() => check('apps/game', source), /Unreviewed source dependency/);
});

test('runtime accepts only the reviewed React and Firebase modular specifiers', () => {
  for (const name of ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom/client', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/app-check']) {
    assert.doesNotThrow(() => check('apps/game', `import '${name}'; const text = <div />;`));
  }
  for (const name of ['vite', '@vitejs/plugin-react', '@types/react', 'firebase', 'react-dom', 'three', '@react-three/fiber', 'gsap']) {
    assert.throws(() => check('apps/game', `import '${name}';`), /Unreviewed source dependency/);
  }
});

test('development-only dependencies do not grant a runtime import or runtime manifest permission', () => {
  for (const name of ['vite', '@vitejs/plugin-react', '@types/react', '@types/react-dom']) {
    assert.doesNotThrow(() => checkDependency('apps/game', 'devDependencies', name, '1.2.3'));
    assert.throws(() => checkDependency('apps/game', 'dependencies', name, '1.2.3'), /Unreviewed dependencies/);
    assert.throws(() => check('apps/game', `import '${name}';`), /Unreviewed source dependency/);
  }
  assert.throws(() => checkDependency('apps/game', 'dependencies', 'react', '^19.3.0'), /Unpinned/);
});

test('pure presentation, engine and service cannot import browser dependencies even as types', () => {
  for (const workspace of ['packages/presentation', 'packages/engine', 'services/game-api']) {
    for (const name of ['react', 'firebase/app', 'react-dom/client']) {
      assert.throws(() => check(workspace, `type T = import('${name}').Thing;`, 'ts'), /Unreviewed source dependency/);
    }
  }
  assert.throws(() => check('packages/engine', "import 'firebase-admin/firestore';", 'ts'), /Unreviewed source dependency/);
  assert.throws(() => check('packages/presentation', "import '@mothership/engine';", 'ts'), /Unreviewed source dependency/);
});

test('relative traversal and nonliteral imports cannot bypass exact runtime permissions', () => {
  assert.throws(() => check('apps/game', "import '../../../packages/contracts/src/fixtures.js';"), /Cross-package relative import/);
  assert.throws(() => check('apps/game', 'void import(packageName);'), /Unreviewed dynamic import/);
  assert.throws(() => check('apps/game', 'require(packageName);'), /Unreviewed dynamic import/);
  assert.doesNotThrow(() => check('apps/game', "import './screen.js';"));
});

test('browser gets document while pure programs and package builds reject document', () => {
  const temp = mkdtempSync(resolve(tmpdir(), 'mothership-types-'));
  try {
    writeFileSync(resolve(temp, 'package.json'), '{"type":"module"}');
    const probe = resolve(temp, 'probe.tsx');
    writeFileSync(probe, 'const element = document.body; export { element };\n');
    const diagnostics = path => {
      const configPath = resolve(root, path);
      const source = ts.readConfigFile(configPath, ts.sys.readFile);
      assert.equal(source.error, undefined);
      const parsed = ts.parseJsonConfigFileContent(source.config, ts.sys, dirname(configPath));
      assert.equal(parsed.errors.length, 0);
      // Compile the probe with the actual effective ambient configuration. Keep ambient types and anchor their resolution at the repository; override output/project bookkeeping.
      const options = { ...parsed.options, noEmit: true, composite: false, declaration: false, typeRoots: [resolve(root, 'node_modules/@types')], rootDir: temp, tsBuildInfoFile: undefined };
      const program = ts.createProgram([probe], options);
      return ts.getPreEmitDiagnostics(program).filter(error => error.file?.fileName === probe);
    };
    assert.deepEqual(diagnostics('tsconfig.check.browser.json'), []);
    for (const path of ['tsconfig.check.json', 'packages/engine/tsconfig.json', 'services/game-api/tsconfig.json', 'packages/presentation/tsconfig.json']) {
      const errors = diagnostics(path);
      assert.ok(errors.some(error => error.code === 2584 && ts.flattenDiagnosticMessageText(error.messageText, '\n').includes('document')), `${path} must reject document`);
    }
    // Demonstrate the actual compiler bypass that the source guard closes.
    writeFileSync(probe, '/// <reference lib="dom" />\nconst element = document.body; export { element };\n');
    assert.deepEqual(diagnostics('packages/engine/tsconfig.json'), []);
    assert.throws(() => check('packages/engine', readFileSync(probe, 'utf8'), 'ts'), /Unreviewed source reference directive/);
    const core = JSON.parse(readFileSync(resolve(root, 'tsconfig.check.json'), 'utf8'));
    assert.ok(core.include.every(path => !path.startsWith('apps/game/')));
  } finally { rmSync(temp, { recursive: true, force: true }); }
});


test('workspace discovery checks TSX even when a build include accidentally omits it', () => {
  const temporary = mkdtempSync(resolve(tmpdir(), 'mothership-workspace-'));
  const json = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
  const writeJson = (path, value) => writeFileSync(resolve(temporary, path), JSON.stringify(value));
  try {
    const manifest = json('package.json');
    writeJson('package.json', manifest);
    for (const path of ['tsconfig.json', 'tsconfig.base.json', 'tsconfig.check.json', 'tsconfig.check.browser.json']) writeJson(path, json(path));
    writeJson('package-lock.json', { packages: { '': { workspaces: manifest.workspaces } } });
    for (const workspace of manifest.workspaces) {
      mkdirSync(resolve(temporary, workspace, 'src'), { recursive: true });
      writeJson(`${workspace}/package.json`, json(`${workspace}/package.json`));
      const buildConfig = json(`${workspace}/tsconfig.json`);
      if (workspace === 'apps/game') buildConfig.include = buildConfig.include.filter(path => !path.endsWith('.tsx'));
      writeJson(`${workspace}/tsconfig.json`, buildConfig);
      writeFileSync(resolve(temporary, workspace, 'src/index.ts'), 'export const probe = 1;');
    }
    assert.doesNotThrow(() => checkWorkspace(temporary));
    const probe = resolve(temporary, 'apps/game/src/hidden.tsx');
    writeFileSync(probe, "import '@mothership/contracts/fixtures'; const element = <div />;");
    assert.throws(() => checkWorkspace(temporary), /Unreviewed source dependency/);
    writeFileSync(probe, 'const element = <div />;');
    assert.throws(() => checkWorkspace(temporary), /Source omitted from build/);
    rmSync(probe);
    const config = json('tsconfig.check.json');
    config.compilerOptions.lib = ['ES2022', 'DOM'];
    writeJson('tsconfig.check.json', config);
    assert.throws(() => checkWorkspace(temporary), /Browser libraries in pure program/);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});


test('source reference directives cannot inject ambient browser types or bypass source boundaries', () => {
  const directives = [
    '/// <reference lib="dom" />',
    '/// <reference lib="dom.iterable" />',
    '/// <reference types="react" />',
    '/// <reference types="vite/client" />',
    '/// <reference path="../../../packages/contracts/src/fixtures.ts" />',
    '/// <reference path="./ambient.d.ts" />',
    '/// <reference no-default-lib="true" />',
    '/// <amd-dependency path="firebase/app" />',
  ];
  for (const workspace of ['packages/engine', 'services/game-api', 'packages/presentation', 'apps/game']) {
    for (const directive of directives) assert.throws(() => check(workspace, `${directive}\nexport const value = 1;`, 'ts'), /Unreviewed source reference directive/);
  }
  // Ordinary comments do not activate TypeScript reference directives.
  assert.doesNotThrow(() => check('packages/engine', '// ambient libraries belong in compiler config\nexport const value = 1;', 'ts'));
});
