import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {RELEASE_PRESERVATION_APPROVAL, readReleasePreservationApproval, acceptsReleasePreservationFile}
  from '../../scripts/release-preservation-consumer.mjs';
import {readFoodConsumerSource, acceptsFoodConsumerSource} from '../../scripts/food-consumer-source.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const record = JSON.parse(readFileSync(resolve(root, RELEASE_PRESERVATION_APPROVAL)));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture(t) {
  const folder = mkdtempSync(resolve(tmpdir(), 'gamen-preservation-admission-'));
  t.after(() => rmSync(folder, {recursive:true, force:true}));
  const references = [...record.parents, ...record.dependencies, record.designerAcceptance, record.captureReport,
    ...record.captures, ...Object.values(record.files).flatMap(entry => entry.predecessors)];
  const paths = new Set([RELEASE_PRESERVATION_APPROVAL, ...Object.keys(record.files), ...references.map(r => r.path)]);
  for (const path of paths) {
    mkdirSync(dirname(resolve(folder, path)), {recursive:true});
    writeFileSync(resolve(folder, path), readFileSync(resolve(root, path)));
  }
  return folder;
}

test('exact reviewed follow-up works through the existing Food and historical consumer chain', () => {
  const approval = readReleasePreservationApproval(root), food = readFoodConsumerSource(root);
  assert.ok(Object.isFrozen(approval) && Object.isFrozen(approval.files));
  for (const [path, entry] of Object.entries(approval.files)) {
    assert.equal(sha(readFileSync(resolve(root, path))), entry.sha256);
    for (const previous of entry.predecessors) {
      assert.equal(acceptsReleasePreservationFile(approval, path, previous.sha256, entry.sha256), true);
      assert.equal(acceptsFoodConsumerSource(food, path, previous.sha256, entry.sha256), true);
    }
    assert.equal(acceptsReleasePreservationFile(structuredClone(approval), path, entry.predecessors[0].sha256, entry.sha256), false);
    assert.equal(acceptsReleasePreservationFile(approval, path, '0'.repeat(64), entry.sha256), false);
    assert.equal(acceptsReleasePreservationFile(approval, path, entry.predecessors[0].sha256, '0'.repeat(64)), false);
  }
  assert.equal(acceptsReleasePreservationFile(approval, '__proto__', undefined, undefined), false);
});

test('unreviewed source, dependency, acceptance or capture fails closed even with a valid record', t => {
  const folder = fixture(t);
  const paths = [...Object.keys(record.files), ...record.dependencies.map(r => r.path),
    record.designerAcceptance.path, record.captureReport.path, record.captures[0].path, record.parents[0].path,
    record.files['apps/game/src/planet/pregame.ts'].predecessors[0].path];
  for (const path of paths) {
    const original = readFileSync(resolve(folder, path));
    writeFileSync(resolve(folder, path), 'unreviewed replacement');
    assert.throws(() => readReleasePreservationApproval(folder), /content differs/, path);
    writeFileSync(resolve(folder, path), original);
  }
});

test('an edited approval cannot broaden scope and no symlink can substitute reviewed inputs', t => {
  const folder = fixture(t), path = resolve(folder, RELEASE_PRESERVATION_APPROVAL);
  const bytes = readFileSync(path);
  writeFileSync(path, JSON.stringify({...record, files:{...record.files, 'extra.mjs':{}}}));
  assert.throws(() => readReleasePreservationApproval(folder), /independent approval hash/);
  writeFileSync(path, bytes);
  const source = Object.keys(record.files)[0];
  unlinkSync(resolve(folder, source)); symlinkSync(resolve(root, source), resolve(folder, source));
  assert.throws(() => readReleasePreservationApproval(folder), /regular file required/);
});

test('historical checkouts do not acquire a correction when its acceptance is absent', t => {
  const folder = fixture(t);
  unlinkSync(resolve(folder, RELEASE_PRESERVATION_APPROVAL));
  assert.equal(readReleasePreservationApproval(folder), null);
  assert.equal(acceptsReleasePreservationFile(null, Object.keys(record.files)[0], 'a', 'b'), false);
});
