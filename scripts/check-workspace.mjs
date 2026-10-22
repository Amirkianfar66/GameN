import assert from 'node:assert/strict';
import { readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { workspaces, runtimeDependencies, developmentDependencies, runtimeSpecifiers } from './workspace-policy.mjs';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const inside = (file, directory) => file.startsWith(`${directory}/`);
export function checkDependency(workspace, kind, name, version) {
  assert.match(version, /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/, `Unpinned ${workspace}: ${name}`);
  if (workspace === '.') return;
  const allowed = kind === 'devDependencies' ? developmentDependencies[workspace] ?? [] : runtimeDependencies[workspace];
  assert.ok(allowed.includes(name), `Unreviewed ${kind}: ${workspace} -> ${name}`);
}
export function checkSourceImports(root, workspace, file, contents = readFileSync(file, 'utf8')) {
  const directory = resolve(root, workspace, 'src');
  const source = ts.createSourceFile(file, contents, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  // References can inject DOM/types or load files without an import declaration. Ambient
  // libraries/types belong in reviewed compiler configs, including browser Vite types.
  assert.ok(source.libReferenceDirectives.length === 0 && source.typeReferenceDirectives.length === 0 && source.referencedFiles.length === 0 && !source.hasNoDefaultLib && source.amdDependencies.length === 0, `Unreviewed source reference directive: ${relative(root, file)}`);
  function checkImport(specifier) {
    if (specifier.startsWith('.')) {
      const target = resolve(dirname(file), specifier);
      assert.ok(inside(target, directory), `Cross-package relative import: ${relative(root, file)} -> ${specifier}`);
    } else {
      assert.ok(runtimeSpecifiers[workspace].includes(specifier), `Unreviewed source dependency: ${workspace} -> ${specifier}`);
    }
  }
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) checkImport(node.moduleSpecifier.text);
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      const arg = node.moduleReference.expression;
      assert.ok(arg && ts.isStringLiteral(arg), `Unreviewed import assignment: ${relative(root, file)}`);
      checkImport(arg.text);
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(source) === 'require')) {
      const arg = node.arguments[0];
      assert.ok(arg && ts.isStringLiteral(arg), `Unreviewed dynamic import: ${relative(root, file)}`);
      checkImport(arg.text);
    }
    // A type-only import may pull browser/cloud declarations into a pure package.
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) checkImport(node.argument.literal.text);
    ts.forEachChild(node, visit);
  }
  visit(source);
}
function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    assert.ok(!entry.isSymbolicLink(), `Symlink in source tree: ${path}`);
    return entry.isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(path) ? [path] : [];
  });
}
export function checkWorkspace(root = repositoryRoot) {
  const json = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
  const manifest = json('package.json');
  assert.deepEqual(manifest.workspaces, workspaces, 'Explicit workspace allowlist changed');
  assert.deepEqual(json('tsconfig.json').references.map(ref => ref.path), workspaces);
  const lock = json('package-lock.json');
  assert.deepEqual(lock.packages[''].workspaces, workspaces);
  assert.ok(!Object.keys(lock.packages).some(path => path.includes('reference/')), 'Reference dependencies in root lock');
  for (const path of ['.', ...workspaces]) {
    const pkg = path === '.' ? manifest : json(`${path}/package.json`);
    assert.equal(pkg.private, true, `Package must remain private: ${path}`);
    for (const kind of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const [name, version] of Object.entries(pkg[kind] ?? {})) checkDependency(path, kind, name, version);
    }
  }
  function config(path) {
    const configPath = resolve(root, path);
    const source = ts.readConfigFile(configPath, ts.sys.readFile);
    assert.equal(source.error, undefined);
    const parsed = ts.parseJsonConfigFileContent(source.config, ts.sys, dirname(configPath));
    assert.equal(parsed.errors.length, 0);
    return parsed;
  }
  function requirePure(options, path) {
    assert.deepEqual(options.lib, ['lib.es2022.d.ts'], `Browser libraries in pure program: ${path}`);
    assert.ok(!(options.types ?? []).some(name => /react|vite|firebase/.test(name)), `Browser ambient types in pure program: ${path}`);
  }
  const pure = config('tsconfig.check.json');
  const browser = config('tsconfig.check.browser.json');
  requirePure(pure.options, 'tsconfig.check.json');
  assert.ok(pure.fileNames.length > 0 && browser.fileNames.length > 0);
  for (const file of pure.fileNames) assert.ok(workspaces.filter(path => path !== 'apps/game').some(path => inside(file, resolve(root, path, 'src'))), `Unscoped pure typecheck input: ${file}`);
  for (const file of browser.fileNames) assert.ok(inside(file, resolve(root, 'apps/game/src')), `Unscoped browser typecheck input: ${file}`);
  assert.deepEqual(browser.options.lib, ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts']);
  assert.equal(browser.options.jsx, ts.JsxEmit.ReactJSX);
  for (const workspace of workspaces) {
    const build = config(`${workspace}/tsconfig.json`);
    if (workspace !== 'apps/game') requirePure(build.options, workspace);
    for (const file of build.fileNames) assert.ok(inside(file, resolve(root, workspace, 'src')), `Unscoped build input: ${file}`);
    // Walk the source tree as well as configured inputs, so a forgotten .tsx include cannot bypass the guard.
    for (const file of sourceFiles(resolve(root, workspace, 'src'))) {
      assert.ok(inside(realpathSync(file), realpathSync(resolve(root, workspace, 'src'))), `Source escapes its workspace: ${file}`);
      checkSourceImports(root, workspace, file);
      const checked = workspace === 'apps/game' ? browser.fileNames : pure.fileNames;
      assert.ok(checked.includes(file), `Source omitted from typecheck: ${relative(root, file)}`);
      assert.ok(build.fileNames.includes(file), `Source omitted from build: ${relative(root, file)}`);
    }
  }
  console.log(`Workspace boundaries: ${workspaces.length} explicit packages; TS/TSX imports checked; pure and browser programs separated; exact runtime subpaths; fixture and reference imports excluded`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) checkWorkspace();
