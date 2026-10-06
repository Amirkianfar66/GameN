// Copy only the reviewed, committed consumer into a fresh scratch worktree.
// Never run against the Frontend active checkout or a shared project checkout.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
assert.equal(process.argv.length, 4, 'Usage: node scripts/overlay-frontend-candidate.mjs --target /private/tmp/<fresh-worktree>');
assert.equal(process.argv[2], '--target');
const target = realpathSync(resolve(process.argv[3]));
assert.ok(target.startsWith('/private/tmp/') && target !== root, 'Candidate must be a separate /private/tmp worktree');
const git = (cwd, ...args) => execFileSync('git', args, { cwd });
assert.equal(realpathSync(git(target, 'rev-parse', '--show-toplevel').toString().trim()), target, 'Target must be a worktree root');
assert.equal(git(root, 'rev-parse', '--path-format=absolute', '--git-common-dir').toString(), git(target, 'rev-parse', '--path-format=absolute', '--git-common-dir').toString(), 'Target must belong to the same repository');
assert.equal(git(target, 'status', '--porcelain', '--untracked-files=normal').toString().trim(), '', 'Use a fresh, clean candidate; refusing to overwrite local changes');
const pin = JSON.parse(readFileSync(resolve(root, 'docs/backend/frontend-consumer-pin.json'), 'utf8'));
assert.match(pin.frontendCommit, /^[a-f0-9]{40}$/);
const files = git(root, 'ls-tree', '-r', '--name-only', pin.frontendCommit, '--', ...pin.ownedPrefixes).toString().trim().split('\n').sort();
assert.equal(files.length, pin.trackedFileCount);
const current = git(target, 'ls-files', '--', ...pin.ownedPrefixes).toString().trim().split('\n');
for (const file of current) assert.ok(files.includes(file), `Candidate has a tracked Frontend file outside the consumer pin: ${file}`);
const rows = [];
for (const file of files) {
  assert.ok(pin.ownedPrefixes.some(prefix => file.startsWith(`${prefix}/`)) && !file.split('/').includes('..'), `Unexpected consumer path: ${file}`);
  const path = resolve(target, file);
  assert.ok(path.startsWith(`${target}/`));
  const content = git(root, 'show', `${pin.frontendCommit}:${file}`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  rows.push(`${file}\t${createHash('sha256').update(content).digest('hex')}\n`);
}
assert.equal(createHash('sha256').update(rows.join('')).digest('hex'), pin.contentHash, 'Pinned consumer content hash mismatch');
console.log(`Frontend candidate: ${files.length} committed files from ${pin.frontendCommit}; aggregate SHA256 ${pin.contentHash}; active Frontend checkout untouched`);
