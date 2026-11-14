import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, symlinkSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {FOOD_CONSUMER_SOURCE, readFoodConsumerSource, acceptsFoodConsumerSource} from '../../scripts/food-consumer-source.mjs';
import {FOOD_STATIC_ART} from '../../scripts/food-supply-art.mjs';
import {readRuntimeArtRelease} from '../../scripts/runtime-art-release.mjs';
import {readHostedArtReleases} from '../../scripts/hosted-art-releases.mjs';
import {prototypeReferences} from '../../design/tools/lib/drawing-port-fence.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const record = JSON.parse(readFileSync(resolve(root, FOOD_CONSUMER_SOURCE)));
function fixture(t) {
  const folder = mkdtempSync(resolve(tmpdir(), 'gamen-food-consumer-'));
  t.after(() => rmSync(folder, {recursive:true, force:true}));
  const art = JSON.parse(readFileSync(resolve(root, FOOD_STATIC_ART)));
  const paths = [FOOD_CONSUMER_SOURCE, ...[record.parentApproval, record.baseArt, record.closure, record.staticArt].map(r => r.path),
    ...Object.keys(record.sourcePins), ...Object.keys(art.inputs), ...art.assets.map(a => a.source)];
  for (const [path, entry] of Object.entries(record.files))
    paths.push(path, entry.candidateBlob, ...entry.acceptedPreviousHashes.map(h => `design/releases/historical-blobs/${h}`));
  for (const path of new Set(paths)) {
    mkdirSync(dirname(resolve(folder, path)), {recursive:true});
    writeFileSync(resolve(folder, path), readFileSync(resolve(root, path)));
  }
  return folder;
}

test('Food registration preserves defaults; explicit selection requires native acceptance', t => {
  const source = readFoodConsumerSource(root);
  assert.equal(Object.keys(source.files).length, 30);
  assert.equal(source.status, 'reviewed-source-candidate');
  const food = readRuntimeArtRelease(root, 'design-0.9.0');
  assert.equal(food.staticAssets.length, 37);
  assert.equal(food.gameplayPins.engineVersion, 'planet-game-1.4.0');
  assert.equal(readHostedArtReleases(root).planetRelease.assetManifestVersion, 'design-0.8.0');
  // Source registration by itself still cannot select Food. This fixture has
  // the registered sources but deliberately omits the independent acceptance.
  assert.throws(() => readHostedArtReleases(fixture(t), {engineProfile:'food-task-1.4'}), /requires the reviewed production consumer/);
  const selected = readHostedArtReleases(root, {engineProfile:'food-task-1.4'});
  assert.equal(selected.planetRelease.assetManifestVersion, 'design-0.9.0');
  assert.equal(selected.planetRelease.gameplayPins.engineVersion, 'planet-game-1.4.0');
  assert.equal(selected.planetRelease.selectionScope, 'new-matches-only');
});

test('only a verified record can accept an exact path, predecessor and current hash', () => {
  const source = readFoodConsumerSource(root), path = 'apps/game/hosted/planet/app.mjs', entry = source.files[path];
  assert.ok(entry.acceptedPreviousHashes.length > 0);
  const previous = entry.acceptedPreviousHashes[0];
  assert.equal(acceptsFoodConsumerSource(source, path, previous, entry.sha256), true);
  assert.equal(acceptsFoodConsumerSource(structuredClone(source), path, previous, entry.sha256), false);
  assert.equal(acceptsFoodConsumerSource(source, path+'x', previous, entry.sha256), false);
  assert.equal(acceptsFoodConsumerSource(source, path, '0'.repeat(64), entry.sha256), false);
  assert.equal(acceptsFoodConsumerSource(source, path, previous, '0'.repeat(64)), false);
});

test('changing a registered source cannot be authorized by editing its record too', t => {
  const folder = fixture(t), candidate = structuredClone(record);
  const path = 'apps/game/hosted/planet/food-app.mjs';
  writeFileSync(resolve(folder, path), 'export const bypass = true;');
  assert.throws(() => readFoodConsumerSource(folder), /content differs/);
  candidate.files[path].bytes = 32;
  writeFileSync(resolve(folder, FOOD_CONSUMER_SOURCE), JSON.stringify(candidate));
  assert.throws(() => readFoodConsumerSource(folder), /independent registration hash differs/);
});

test('current bytes cannot be substituted by a symlink or omit preserved predecessor evidence', t => {
  const folder = fixture(t), path = 'apps/game/src/planet/session.ts';
  unlinkSync(resolve(folder, path)); symlinkSync(resolve(root, path), resolve(folder, path));
  assert.throws(() => readFoodConsumerSource(folder), /regular file required/);
  unlinkSync(resolve(folder, path)); writeFileSync(resolve(folder, path), readFileSync(resolve(root, path)));
  const previous = record.files[path].acceptedPreviousHashes[0];
  writeFileSync(resolve(folder, `design/releases/historical-blobs/${previous}`), 'replacement');
  assert.throws(() => readFoodConsumerSource(folder), /previous content differs/);
});

test('historical checkouts without Food registration remain readable; prototype imports stay forbidden', t => {
  const folder = mkdtempSync(resolve(tmpdir(), 'gamen-no-food-')); t.after(() => rmSync(folder,{recursive:true,force:true}));
  assert.equal(readFoodConsumerSource(folder), null);
  for (const path of ['design/food-supply/task.mjs', 'design/food-supply/phone.mjs', 'design/phone-ui/prototype/fixtures.mjs'])
    assert.deepEqual(prototypeReferences('probe.mjs', `import '/${path}';`), ['/'+path]);
});
