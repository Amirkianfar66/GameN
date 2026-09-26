import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const json = path => JSON.parse(read(path));
const hash = path => createHash('sha256').update(read(path)).digest('hex');
const lock = json('docs/bootstrap-source-lock.json');
for (const entry of lock.files) assert.equal(hash(entry.path), entry.sha256, `Changed source: ${entry.path}`);
const rules = json('rules/source-manifest.json');
for (const source of rules.sources) assert.equal(hash(source.path), source.sha256, `Rule source hash: ${source.path}`);

const manifest = json('reference/source-export-manifest.json');
const included = manifest.files.filter(file => file.included);
assert.equal(included.length, manifest.copied_unchanged_file_count);
for (const file of included) assert.equal(hash(file.package_path), file.source_sha256, `Canvas snapshot: ${file.package_path}`);
function filesIn(path) {
  return readdirSync(new URL(path, root), { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? filesIn(`${path}/${entry.name}`) : [`${path}/${entry.name}`]);
}
const expectedPaths = [...included.map(file => file.package_path), ...manifest.generated_files].sort();
assert.deepEqual(filesIn('reference/design-canvas').sort(), expectedPaths, 'Canvas snapshot inventory changed');
assert.equal(hash('packages/design-tokens/src/tokens.json'), hash('docs/design/design-tokens.json'), 'Proposed token export must match its source');
console.log(`Source integrity: ${included.length} original Canvas files + ${manifest.generated_files.length} unbound example; ${rules.sources.length} rule sources; ${lock.files.length} pinned source files; token proposal unchanged`);
