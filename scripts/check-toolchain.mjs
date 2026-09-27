import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
assert.equal(process.versions.node, manifest.engines.node, 'Use the Node version in .nvmrc');
const npm = execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--version'], { encoding: 'utf8' }).trim();
assert.equal(npm, manifest.engines.npm, 'Use the pinned npm version');
for (const file of ['.nvmrc', '.node-version']) {
  assert.equal(readFileSync(new URL(file, root), 'utf8').trim(), manifest.engines.node);
}
assert.equal(manifest.packageManager, `npm@${npm}`);
console.log(`Toolchain: Node ${process.versions.node}, npm ${npm}`);
