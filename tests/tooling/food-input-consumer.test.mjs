import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {FOOD_INPUT_CONSUMER_APPROVAL, readFoodInputConsumerApproval, acceptsFoodInputConsumerFile}
  from '../../scripts/food-input-consumer-approval.mjs';
import {readFoodConsumerSource, acceptsFoodConsumerSource} from '../../scripts/food-consumer-source.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const record = JSON.parse(readFileSync(resolve(root, FOOD_INPUT_CONSUMER_APPROVAL)));
function fixture(t) {
  const folder = mkdtempSync(resolve(tmpdir(), 'gamen-food-input-admission-'));
  t.after(() => rmSync(folder, {recursive:true, force:true}));
  const references = [...record.parents, record.designerAcceptance, record.captureReport,
    ...record.captures, ...Object.values(record.files).flatMap(entry => entry.predecessors)];
  const paths = new Set([FOOD_INPUT_CONSUMER_APPROVAL, ...Object.keys(record.files), ...references.map(r => r.path)]);
  for (const path of paths) {
    mkdirSync(dirname(resolve(folder, path)), {recursive:true});
    writeFileSync(resolve(folder, path), readFileSync(resolve(root, path)));
  }
  return folder;
}

test('only the two reviewed scheduling files are admitted through historical Food source pins', () => {
  const approval = readFoodInputConsumerApproval(root), source = readFoodConsumerSource(root);
  assert.ok(Object.isFrozen(approval) && Object.isFrozen(approval.files));
  for (const [path, entry] of Object.entries(approval.files)) {
    for (const previous of entry.predecessors) {
      assert.equal(acceptsFoodInputConsumerFile(approval, path, previous.sha256, entry.sha256), true);
      assert.equal(acceptsFoodConsumerSource(source, path, previous.sha256, entry.sha256), true);
    }
    assert.equal(acceptsFoodInputConsumerFile(structuredClone(approval), path, entry.predecessors[0].sha256, entry.sha256), false);
    assert.equal(acceptsFoodInputConsumerFile(approval, path, '0'.repeat(64), entry.sha256), false);
    assert.equal(acceptsFoodInputConsumerFile(approval, path, entry.predecessors[0].sha256, '0'.repeat(64)), false);
  }
  assert.equal(acceptsFoodInputConsumerFile(approval, '__proto__', undefined, undefined), false);
});

test('unreviewed source, acceptance, report, capture and predecessor bytes fail closed', t => {
  const folder = fixture(t);
  const paths = [...Object.keys(record.files), record.parents[0].path, record.designerAcceptance.path,
    record.captureReport.path, record.captures[0].path,
    record.files['apps/game/src/planet/session.ts'].predecessors[0].path];
  for (const path of paths) {
    const bytes = readFileSync(resolve(folder, path));
    writeFileSync(resolve(folder, path), 'unreviewed replacement');
    assert.throws(() => readFoodInputConsumerApproval(folder), /content differs/, path);
    writeFileSync(resolve(folder, path), bytes);
  }
});

test('an edited approval cannot broaden scope and symlinks cannot replace reviewed sources', t => {
  const folder = fixture(t), path = resolve(folder, FOOD_INPUT_CONSUMER_APPROVAL);
  const bytes = readFileSync(path);
  writeFileSync(path, JSON.stringify({...record, files:{...record.files, 'extra.mjs':{}}}));
  assert.throws(() => readFoodInputConsumerApproval(folder), /independent approval hash/);
  writeFileSync(path, bytes);
  const source = Object.keys(record.files)[0];
  unlinkSync(resolve(folder, source)); symlinkSync(resolve(root, source), resolve(folder, source));
  assert.throws(() => readFoodInputConsumerApproval(folder), /regular file required/);
});

test('historical checkouts without the follow-up do not acquire new admission', t => {
  const folder = fixture(t);
  unlinkSync(resolve(folder, FOOD_INPUT_CONSUMER_APPROVAL));
  assert.equal(readFoodInputConsumerApproval(folder), null);
  assert.equal(acceptsFoodInputConsumerFile(null, Object.keys(record.files)[0], 'a', 'b'), false);
});
