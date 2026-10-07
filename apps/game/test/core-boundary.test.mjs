import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// The client core was free of browser globals by construction while the compiler did not
// know them. With DOM libraries in the app's program that is no longer enforced by the
// compiler, so it is enforced here: everything outside browser/ stays loadable without a
// browser and without the Firebase client, and browser/ imports exactly what was reviewed.

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const modules = directory => readdirSync(directory, { withFileTypes: true })
  .flatMap(entry => (entry.isDirectory() ? modules(join(directory, entry.name)) : entry.name.endsWith('.js') ? [join(directory, entry.name)] : []));
const SPECIFIER = /\b(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
/** Every module a compiled file names, static or dynamic. Comments are not code. */
function imports(file) {
  const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  return [...code.matchAll(SPECIFIER)].map(match => match[1] ?? match[2] ?? match[3]);
}
const name = file => relative(dist, file).split(sep).join('/');
const inBrowser = file => name(file).startsWith('browser/');
const all = modules(dist);

test('the client core imports only workspace modules and the reviewed portable digest', () => {
  const core = all.filter(file => !inBrowser(file));
  assert.equal(core.length >= 20, true, 'The compiled core is where this test looks for it');
  const packages = new Set();
  for (const file of core) {
    for (const specifier of imports(file)) {
      if (specifier.startsWith('.')) assert.equal(inBrowser(resolve(dirname(file), specifier)), false, `${name(file)} reaches into browser/ (${specifier})`);
      else packages.add(specifier);
    }
  }
  assert.deepEqual([...packages].sort(), ['@mothership/contracts', '@mothership/presentation', '@noble/hashes/sha2.js'], 'No Firebase, no rendering library, no bundler, no schema library of its own');
});

test('the browser directory imports the reviewed Firebase entry points and nothing else from outside', () => {
  const browser = all.filter(inBrowser);
  assert.equal(browser.length >= 1, true);
  const packages = new Set();
  for (const file of browser) {
    for (const specifier of imports(file)) {
      if (specifier.startsWith('.')) assert.equal(resolve(dirname(file), specifier).startsWith(dist), true, `${name(file)} leaves the package (${specifier})`);
      else packages.add(specifier);
    }
  }
  // Firebase 12.18.0. Hosted preview adds the App Check entry already covered by the
  // integration dependency probe; the headless package still cannot import any of these.
  assert.deepEqual([...packages].sort(), ['firebase/app', 'firebase/app-check', 'firebase/auth', 'firebase/firestore']);
});

test('nothing in browser/ is reachable from the package entry', () => {
  const seen = new Set();
  const walk = file => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const specifier of imports(file)) if (specifier.startsWith('.')) walk(resolve(dirname(file), specifier));
  };
  walk(join(dist, 'index.js'));
  // The walk really followed the entry's imports, two levels down at least.
  for (const reached of ['connected/screens.js', 'connected/action-flow.js', 'screens/screen.js']) assert.equal(seen.has(join(dist, reached)), true, reached);
  assert.deepEqual([...seen].filter(inBrowser).map(name), []);
});
