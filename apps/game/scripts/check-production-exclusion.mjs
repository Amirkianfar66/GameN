// Proves that fixture truth, fixture transports and development controls cannot reach a
// production bundle of the game client.
//
// Three independent checks, because any one of them alone can be defeated by a mistake:
//   1. Reachability: the module graph from the production entry points contains no
//      fixture, test or development module and no import this script cannot follow.
//   2. Content: no shipped file contains an identifier that only fixture or development
//      code uses, even if it arrived by copy-paste rather than by import.
//   3. Labeling: every development file carries the sentinel that check 2 looks for, so a
//      development file bundled by accident is caught wherever it ends up.
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
const NON_PRODUCTION_FILES = /(^|[./-])(fixtures?|test|spec)\.[cm]?js$/;
const TEXT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.json', '.css', '.html', '.htm', '.ts', '.tsx', '.map', '.txt', '.svg', '.md']);

function listFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

function importSpecifiers(file, text, problems, label) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const specifiers = [];
  const visit = node => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      if (ts.isStringLiteral(node.moduleSpecifier)) specifiers.push(node.moduleSpecifier.text);
      else problems.push(`${label}: import with a specifier that is not a string literal`);
    }
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const isDynamicImport = callee.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(callee) && callee.text === 'require';
      if (isDynamicImport || isRequire) {
        const [argument] = node.arguments;
        if (argument && ts.isStringLiteralLike(argument)) specifiers.push(argument.text);
        else problems.push(`${label}: dynamic import that cannot be followed statically`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return specifiers;
}

function splitBareSpecifier(specifier) {
  const parts = specifier.split('/');
  const nameLength = specifier.startsWith('@') ? 2 : 1;
  return { name: parts.slice(0, nameLength).join('/'), subpath: parts.slice(nameLength).join('/') };
}

function entryOf(packageDirectory, name, problems) {
  const manifest = JSON.parse(readFileSync(join(packageDirectory, 'package.json'), 'utf8'));
  const target = manifest.exports?.['.']?.import ?? manifest.exports?.['.'];
  if (typeof target !== 'string') {
    problems.push(`${name}: package.json has no "." import entry to check`);
    return null;
  }
  return resolve(packageDirectory, target);
}

/**
 * @param {object} options
 * @param {string} options.root Directory that reported paths are shown relative to.
 * @param {Record<string, string>} options.packages Workspace package name to its directory.
 * @param {string[]} options.entries Names of the packages whose "." entry ships to players.
 * @param {string[]} [options.external] Third-party packages production code may import. Not followed.
 * @param {string[]} [options.scanDirectories] Directories whose every file ships (build or bundler output).
 * @param {string[]} [options.sourceDirectories] Production source trees, scanned for markers too.
 * @param {string[]} [options.devDirectories] Development-only trees; every file must carry the sentinel.
 * @returns {{ problems: string[], reachable: string[], scanned: number, devFiles: number }}
 */
export function checkProductionExclusion(options) {
  const { root, packages, entries } = options;
  const external = new Set(options.external ?? []);
  const problems = [];
  const show = file => relative(root, file).split(sep).join('/');
  const packageOf = file => Object.entries(packages).find(([, directory]) => file.startsWith(resolve(directory) + sep));

  // 0. A production package exposes one entry and ships only its build output.
  for (const name of entries) {
    const directory = packages[name];
    if (!directory) {
      problems.push(`${name}: not a known workspace package`);
      continue;
    }
    const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
    const exported = Object.keys(manifest.exports ?? {});
    if (exported.length !== 1 || exported[0] !== '.') problems.push(`${name}: production package must export only ".", found ${JSON.stringify(exported)}`);
    if (JSON.stringify(manifest.files) !== JSON.stringify(['dist'])) problems.push(`${name}: production package must ship only "dist", found ${JSON.stringify(manifest.files)}`);
  }

  // 1. Reachability from the production entry points.
  const reachable = new Set();
  const queue = [];
  for (const name of entries) {
    const entry = packages[name] ? entryOf(packages[name], name, problems) : null;
    if (entry) queue.push(entry);
  }
  while (queue.length > 0) {
    const file = queue.pop();
    if (reachable.has(file)) continue;
    reachable.add(file);
    const label = show(file);
    if (!existsSync(file)) {
      problems.push(`${label}: reachable module does not exist; build before running this check`);
      continue;
    }
    const owner = packageOf(file);
    if (!owner) {
      problems.push(`${label}: reachable module is outside every known workspace package`);
      continue;
    }
    const inside = relative(resolve(owner[1]), file).split(sep);
    if (inside[0] !== 'dist') problems.push(`${label}: production code reaches a module outside its package's build output`);
    if (inside.slice(0, -1).some(segment => NON_PRODUCTION_SEGMENTS.has(segment)) || NON_PRODUCTION_FILES.test(inside.at(-1))) {
      problems.push(`${label}: fixture, test or development module is reachable from a production entry`);
    }
    if (!['.js', '.mjs'].includes(extname(file))) continue;

    for (const specifier of importSpecifiers(file, readFileSync(file, 'utf8'), problems, label)) {
      if (specifier.startsWith('.')) {
        queue.push(resolve(dirname(file), specifier));
        continue;
      }
      if (specifier.startsWith('node:') || specifier.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(specifier)) {
        problems.push(`${label}: production client code imports "${specifier}"`);
        continue;
      }
      const { name, subpath } = splitBareSpecifier(specifier);
      if (packages[name]) {
        // Only a package's main entry is production surface. Any subpath, the fixture one
        // above all, is refused rather than resolved.
        if (subpath !== '') problems.push(`${label}: imports the subpath "${specifier}"; only package main entries are allowed in production`);
        else {
          const entry = entryOf(packages[name], name, problems);
          if (entry) queue.push(entry);
        }
      } else if (!external.has(name)) {
        problems.push(`${label}: imports "${specifier}", which is not a reviewed production dependency`);
      } else if (subpath !== '') {
        problems.push(`${label}: imports the subpath "${specifier}" of an external package`);
      }
    }
  }

  // 2. No shipped file contains a fixture-only or development-only marker.
  const toScan = new Set([...reachable].filter(file => existsSync(file)));
  for (const directory of [...(options.scanDirectories ?? []), ...(options.sourceDirectories ?? [])]) {
    for (const file of listFiles(directory)) toScan.add(file);
  }
  let scanned = 0;
  for (const file of toScan) {
    if (!TEXT_EXTENSIONS.has(extname(file)) || !statSync(file).isFile()) continue;
    scanned += 1;
    const text = readFileSync(file, 'utf8');
    for (const marker of FORBIDDEN_MARKERS) {
      if (text.includes(marker)) problems.push(`${show(file)}: contains the fixture/development marker "${marker}"`);
    }
  }

  // 3. Every development file is labeled, so check 2 would catch it anywhere it was copied.
  let devFiles = 0;
  for (const directory of options.devDirectories ?? []) {
    for (const file of listFiles(directory)) {
      if (!TEXT_EXTENSIONS.has(extname(file))) continue;
      devFiles += 1;
      if (!readFileSync(file, 'utf8').includes(DEV_ONLY_SENTINEL)) problems.push(`${show(file)}: development file is missing the "${DEV_ONLY_SENTINEL}" sentinel`);
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
    external: ['zod'],
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
