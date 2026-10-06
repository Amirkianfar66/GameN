import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const json = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const manifest = json('package.json');
const expected = ['apps/game', 'services/game-api', 'packages/engine', 'packages/contracts', 'packages/presentation', 'packages/design-tokens', 'infra/firebase', 'tools/balance'];
assert.deepEqual(manifest.workspaces, expected, 'Explicit workspace allowlist changed');
assert.deepEqual(json('tsconfig.json').references.map(ref => ref.path), expected);
const allowed = {
  'apps/game': ['@mothership/contracts', '@mothership/presentation', '@mothership/design-tokens'],
  'services/game-api': ['@mothership/contracts', '@mothership/engine', 'firebase-admin'],
  'packages/engine': ['@mothership/contracts'],
  'packages/contracts': ['zod'],
  'packages/presentation': ['@mothership/contracts'],
  'packages/design-tokens': [],
  'infra/firebase': ['@mothership/game-api', '@mothership/contracts', 'firebase-admin', 'firebase-functions'],
  'tools/balance': ['@mothership/contracts', '@mothership/engine'],
};
const lock = json('package-lock.json');
assert.deepEqual(lock.packages[''].workspaces, expected);
assert.ok(!Object.keys(lock.packages).some(path => path.includes('reference/')), 'Reference dependencies in root lock');
for (const path of ['.', ...expected]) {
  const pkg = path === '.' ? manifest : json(`${path}/package.json`);
  assert.equal(pkg.private, true, `Package must remain private: ${path}`);
  for (const kind of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    for (const [name, version] of Object.entries(pkg[kind] ?? {})) {
      assert.match(version, /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/, `Unpinned ${path}: ${name}`);
      if (path !== '.') assert.ok(allowed[path].includes(name), `Unreviewed dependency: ${path} -> ${name}`);
    }
  }
}
function configFiles(path) {
  const configPath = resolve(root, path);
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  assert.equal(config.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(configPath));
  assert.equal(parsed.errors.length, 0);
  return parsed.fileNames;
}
const checkedFiles = configFiles('tsconfig.check.json');
assert.ok(checkedFiles.length > 0);
for (const file of checkedFiles) assert.ok(expected.some(path => file.startsWith(resolve(root, `${path}/src`) + '/')), `Unscoped typecheck input: ${file}`);
for (const workspace of expected) {
  for (const file of configFiles(`${workspace}/tsconfig.json`)) {
    assert.ok(file.startsWith(resolve(root, `${workspace}/src`) + '/'), `Unscoped build input: ${file}`);
    if (!file.endsWith('.ts')) continue;
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    function checkImport(specifier) {
      if (specifier.startsWith('.')) {
        const target = resolve(dirname(file), specifier);
        assert.ok(target.startsWith(resolve(root, `${workspace}/src`) + '/'), `Cross-package relative import: ${file}`);
      } else {
        const adapterImports = {
          'services/game-api': ['node:crypto', 'firebase-admin/firestore'],
          'infra/firebase': ['node:crypto', 'node:buffer', 'firebase-admin/app', 'firebase-admin/auth', 'firebase-admin/app-check', 'firebase-admin/firestore', 'firebase-admin/functions', 'firebase-functions/v2/tasks', 'firebase-functions/v2/https', 'firebase-functions/v2/firestore', 'firebase-functions/v2/scheduler', 'firebase-functions/v2/core'],
        };
        assert.ok(allowed[workspace].includes(specifier) || (adapterImports[workspace] ?? []).includes(specifier), `Unreviewed source dependency: ${workspace} -> ${specifier}`);
      }
    }
    function visit(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) checkImport(node.moduleSpecifier.text);
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(source) === 'require')) {
        const arg = node.arguments[0];
        assert.ok(arg && ts.isStringLiteral(arg), `Unreviewed dynamic import: ${relative(root, file)}`);
        checkImport(arg.text);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
console.log(`Workspace boundaries: ${expected.length} explicit packages; engine has no cloud/rendering imports; reference and fixture subpaths excluded from runtime imports`);
