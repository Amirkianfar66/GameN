// Proves that fixture truth, fixture transports and development controls cannot reach a
// production bundle of the game client.
//
// Four independent checks, because any one of them alone can be defeated by a mistake:
//   0. Shape: a production package has exactly one way in. No second export, no export
//      condition or legacy entry field that a bundler could resolve to a different file
//      than this script follows.
//   1. Reachability: the module graph from the production entry points contains no
//      fixture, test or development module, and nothing this script cannot follow.
//   2. Content: no shipped file contains an identifier that only fixture or development
//      code uses, even if it arrived by copy-paste rather than by import.
//   3. Labeling: every development file carries the sentinel that check 2 looks for, in
//      code rather than in a comment, so it survives minification and is caught wherever
//      a development file ends up.
//
// Limits: the graph is followed through import, export-from, dynamic import, require,
// `new URL(literal, import.meta.url)` and `import.meta.resolve(literal)`. Code that builds
// a path at run time some other way is not followed; scanning the real bundle with
// --bundle is the backstop for that.
//
// Run after a build:  node scripts/check-production-exclusion.mjs [--bundle <dir> ...]
// --bundle adds a bundler output directory whose every file is scanned (check 2).

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

/** Marks a file as development-only. Every file under a development directory must contain it. */
export const DEV_ONLY_SENTINEL = 'mothership:dev-only';

/** Strings that only fixture or development code may contain. */
export const FORBIDDEN_MARKERS = [
  DEV_ONLY_SENTINEL,
  '@mothership/contracts/fixtures',
  'createOfficerFixture',
  'fixtureProvenance',
  'fixtureOnly',
  'serverOnly',
  'resolutionExpectation',
  'officerOrdinaryShotsRemaining',
  'fixture-match-',
  'fixture-command-',
  'fixture-source-',
];

/** A production module may not live in, or be loaded from, a directory with one of these names. */
const NON_PRODUCTION_SEGMENTS = new Set(['dev', 'test', 'tests', 'fixtures', '__fixtures__', '__tests__', 'scripts']);
const NON_PRODUCTION_FILES = /(^|[./-])(fixtures?|test|spec)\.[cm]?js$/i;
const TEXT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.json', '.css', '.html', '.htm', '.ts', '.tsx', '.map', '.txt', '.svg', '.md']);
/** Module kinds this script can parse and follow. Anything else imported is refused. */
const FOLLOWED_MODULES = new Set(['.js', '.mjs']);
const DATA_MODULES = new Set(['.json']);
/** The only export conditions a production package may use. */
const ALLOWED_CONDITIONS = new Set(['types', 'import']);
/** Manifest fields that give a resolver another way into a package. */
const SECOND_ENTRY_FIELDS = ['main', 'module', 'browser', 'imports', 'bin', 'unpkg', 'jsdelivr'];

function listFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

const isImportMeta = node => ts.isMetaProperty(node) && node.keywordToken === ts.SyntaxKind.ImportKeyword;
const isImportMetaUrl = node => ts.isPropertyAccessExpression(node) && node.name.text === 'url' && isImportMeta(node.expression);

/** Every place a module names another file: [{ specifier, kind: 'import' | 'url' }]. */
function references(file, text, problems, label) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const found = [];
  const literal = (argument, kind, what) => {
    if (argument && ts.isStringLiteralLike(argument)) found.push({ specifier: argument.text, kind });
    else problems.push(`${label}: ${what} that cannot be followed statically`);
  };
  const visit = node => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) literal(node.moduleSpecifier, 'import', 'import');
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (callee.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(callee) && callee.text === 'require')) literal(node.arguments[0], 'import', 'dynamic import');
      if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'resolve' && isImportMeta(callee.expression)) literal(node.arguments[0], 'url', 'import.meta.resolve');
    }
    // new URL('./file', import.meta.url) is how a module reaches a file without importing it.
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'URL' && node.arguments?.[1] && isImportMetaUrl(node.arguments[1])) {
      literal(node.arguments[0], 'url', 'file URL');
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

/** True when the sentinel appears in code (a string literal), not merely in a comment. */
function hasSentinelInCode(file, text) {
  const extension = extname(file);
  if (extension === '.js' || extension === '.mjs') {
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    let found = false;
    const visit = node => {
      if (ts.isStringLiteralLike(node) && node.text.includes(DEV_ONLY_SENTINEL)) found = true;
      if (!found) ts.forEachChild(node, visit);
    };
    visit(source);
    return found;
  }
  if (extension === '.html' || extension === '.htm') return new RegExp(`<meta\\s+name="${DEV_ONLY_SENTINEL}"`).test(text.replace(/<!--[\s\S]*?-->/g, ''));
  if (extension === '.css') return text.replace(/\/\*[\s\S]*?\*\//g, '').includes(DEV_ONLY_SENTINEL);
  // Prose is never bundled; a visible or commented label is enough.
  return text.includes(DEV_ONLY_SENTINEL);
}

function splitBareSpecifier(specifier) {
  const parts = specifier.split('/');
  const nameLength = specifier.startsWith('@') ? 2 : 1;
  return { name: parts.slice(0, nameLength).join('/'), subpath: parts.slice(nameLength).join('/') };
}

function readManifest(directory) {
  return JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
}

// Returns the file the "." export resolves to, after refusing every shape that would let
// another resolver pick a different one.
function checkManifest(name, directory, { entry }, problems) {
  const manifest = readManifest(directory);
  for (const field of SECOND_ENTRY_FIELDS) {
    if (field in manifest) problems.push(`${name}: package.json field "${field}" gives a resolver a second way into the package`);
  }
  const exported = manifest.exports;
  if (typeof exported !== 'object' || exported === null || Array.isArray(exported) || !Object.keys(exported).every(key => key.startsWith('.'))) {
    problems.push(`${name}: package.json "exports" must be a map of subpaths`);
    return null;
  }
  for (const [subpath, target] of Object.entries(exported)) {
    if (typeof target === 'string') continue;
    if (typeof target !== 'object' || target === null || Array.isArray(target)) {
      problems.push(`${name}: export "${subpath}" has a target this check cannot read`);
      continue;
    }
    for (const [condition, value] of Object.entries(target)) {
      if (!ALLOWED_CONDITIONS.has(condition)) problems.push(`${name}: export "${subpath}" uses the "${condition}" condition; a bundler could resolve it to a file this check does not follow`);
      else if (typeof value !== 'string') problems.push(`${name}: export "${subpath}" nests conditions under "${condition}"`);
    }
  }
  if (entry) {
    const subpaths = Object.keys(exported);
    if (subpaths.length !== 1 || subpaths[0] !== '.') problems.push(`${name}: production package must export only ".", found ${JSON.stringify(subpaths)}`);
    if (JSON.stringify(manifest.files) !== JSON.stringify(['dist'])) problems.push(`${name}: production package must ship only "dist", found ${JSON.stringify(manifest.files)}`);
  }
  const main = exported['.'];
  const target = typeof main === 'string' ? main : main?.import;
  if (typeof target !== 'string') {
    problems.push(`${name}: package.json has no "." import entry to check`);
    return null;
  }
  return resolve(directory, target);
}

/**
 * @param {object} options
 * @param {string} options.root Directory that reported paths are shown relative to.
 * @param {Record<string, string>} options.packages Workspace package name to its directory.
 * @param {string[]} options.entries Names of the packages whose "." entry ships to players.
 * @param {string[]} [options.external] Exact third-party package roots or subpaths production code may import. Not followed.
 * @param {string[]} [options.scanDirectories] Directories whose every file ships (build or bundler output).
 * @param {string[]} [options.sourceDirectories] Production source trees, scanned for markers too.
 * @param {string[]} [options.devDirectories] Development-only trees; every file must carry the sentinel in code.
 * @returns {{ problems: string[], reachable: string[], scanned: number, devFiles: number }}
 */
export function checkProductionExclusion(options) {
  const { root, packages, entries } = options;
  const external = new Set(options.external ?? []);
  const problems = [];
  const show = file => relative(root, file).split(sep).join('/');
  const packageOf = file => Object.entries(packages).find(([, directory]) => file.startsWith(resolve(directory) + sep));

  // 0 and 1. Shape of every package entered, and reachability from the production entries.
  const reachable = new Set();
  const queue = [];
  const entered = new Map();
  const enter = (name, entry) => {
    if (!entered.has(name)) entered.set(name, checkManifest(name, packages[name], { entry }, problems));
    const file = entered.get(name);
    if (file) queue.push({ file, kind: 'import' });
  };
  for (const name of entries) {
    if (packages[name]) enter(name, true);
    else problems.push(`${name}: not a known workspace package`);
  }

  while (queue.length > 0) {
    const { file, kind } = queue.pop();
    if (reachable.has(file)) continue;
    reachable.add(file);
    const label = show(file);
    if (!existsSync(file)) {
      problems.push(`${label}: reachable ${kind === 'url' ? 'file' : 'module'} does not exist; build before running this check`);
      continue;
    }
    if (statSync(file).isDirectory()) {
      problems.push(`${label}: a directory is referenced; this check cannot tell which file a resolver would pick`);
      continue;
    }
    const owner = packageOf(file);
    if (!owner) {
      problems.push(`${label}: reachable module is outside every known workspace package`);
      continue;
    }
    const inside = relative(resolve(owner[1]), file).split(sep);
    if (inside[0] !== 'dist') problems.push(`${label}: production code reaches a module outside its package's build output`);
    if (inside.slice(0, -1).some(segment => NON_PRODUCTION_SEGMENTS.has(segment.toLowerCase())) || NON_PRODUCTION_FILES.test(inside.at(-1))) {
      problems.push(`${label}: fixture, test or development module is reachable from a production entry`);
    }
    const extension = extname(file);
    if (!FOLLOWED_MODULES.has(extension)) {
      // A file reached by URL may be any asset. A file reached by import must be one this
      // script can parse, or plain data; otherwise its own imports would go unseen.
      if (kind === 'import' && !DATA_MODULES.has(extension)) problems.push(`${label}: imported module of a kind this check cannot follow ("${extension || 'no extension'}")`);
      continue;
    }

    for (const { specifier, kind: referenceKind } of references(file, readFileSync(file, 'utf8'), problems, label)) {
      if (specifier.startsWith('.')) {
        queue.push({ file: resolve(dirname(file), specifier), kind: referenceKind });
        continue;
      }
      if (specifier.startsWith('node:') || specifier.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(specifier)) {
        problems.push(`${label}: production client code references "${specifier}"`);
        continue;
      }
      const { name, subpath } = splitBareSpecifier(specifier);
      if (packages[name]) {
        // Only a package's main entry is production surface. Any subpath, the fixture one
        // above all, is refused rather than resolved.
        if (subpath !== '') problems.push(`${label}: imports the subpath "${specifier}"; only package main entries are allowed in production`);
        else enter(name, false);
      } else if (!external.has(name) && !external.has(specifier)) {
        problems.push(`${label}: imports "${specifier}", which is not a reviewed production dependency`);
      } else if (subpath !== '' && !external.has(specifier)) {
        problems.push(`${label}: imports the subpath "${specifier}" of an external package`);
      }
    }
  }

  // 2. No shipped file contains a fixture-only or development-only marker.
  const toScan = new Set([...reachable].filter(file => existsSync(file) && statSync(file).isFile()));
  for (const directory of [...(options.scanDirectories ?? []), ...(options.sourceDirectories ?? [])]) {
    for (const file of listFiles(directory)) toScan.add(file);
  }
  let scanned = 0;
  for (const file of toScan) {
    if (!TEXT_EXTENSIONS.has(extname(file))) continue;
    scanned += 1;
    const text = readFileSync(file, 'utf8');
    for (const marker of FORBIDDEN_MARKERS) {
      if (text.includes(marker)) problems.push(`${show(file)}: contains the fixture/development marker "${marker}"`);
    }
  }

  // 3. Every development file is labeled in code, so check 2 would catch it wherever it was
  // copied or bundled, even with its comments removed.
  let devFiles = 0;
  for (const directory of options.devDirectories ?? []) {
    for (const file of listFiles(directory)) {
      if (!TEXT_EXTENSIONS.has(extname(file))) continue;
      devFiles += 1;
      if (!hasSentinelInCode(file, readFileSync(file, 'utf8'))) problems.push(`${show(file)}: development file does not carry the "${DEV_ONLY_SENTINEL}" sentinel in code`);
    }
  }

  return { problems, reachable: [...reachable].map(show).sort(), scanned, devFiles };
}

/** The real workspace configuration for the game client. */
export function workspaceOptions(repositoryRoot, bundleDirectories = []) {
  const at = path => resolve(repositoryRoot, path);
  return {
    root: repositoryRoot,
    packages: {
      '@mothership/game': at('apps/game'),
      '@mothership/presentation': at('packages/presentation'),
      '@mothership/contracts': at('packages/contracts'),
      '@mothership/design-tokens': at('packages/design-tokens'),
    },
    entries: ['@mothership/game', '@mothership/presentation'],
    external: ['zod', '@noble/hashes/sha2.js'],
    scanDirectories: [at('apps/game/dist'), at('packages/presentation/dist'), ...bundleDirectories.map(directory => resolve(directory))],
    sourceDirectories: [at('apps/game/src'), at('packages/presentation/src')],
    devDirectories: [at('apps/game/dev')],
  };
}

function main(argv) {
  const bundles = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--bundle' && argv[index + 1]) bundles.push(argv[++index]);
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  for (const bundle of bundles) {
    if (!existsSync(bundle)) throw new Error(`Bundle directory does not exist: ${bundle}`);
  }
  const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
  const result = checkProductionExclusion(workspaceOptions(repositoryRoot, bundles));
  if (result.problems.length > 0) {
    console.error(`Production exclusion check failed:\n${result.problems.map(problem => `  - ${problem}`).join('\n')}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Production exclusion: ${result.reachable.length} modules reachable from 2 production entries, ${result.scanned} shipped or source files scanned, ${result.devFiles} development files labeled; no fixture, test or development module or marker found`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2));
