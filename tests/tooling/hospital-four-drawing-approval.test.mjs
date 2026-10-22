import assert from 'node:assert/strict';
import test from 'node:test';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { CANDIDATE_DRAWING_POLICY, readDrawingPolicy, productionDrawingProblems,
  abilityPrototypeReferences, reviewedAbilityProse } from '../../design/tools/lib/drawing-port-fence.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const policy = readDrawingPolicy(root);
function fixture(t) {
  const target = mkdtempSync(join(tmpdir(), 'mothership-current-drawing-'));
  t.after(() => rmSync(target, { recursive: true, force: true }));
  const paths = new Set([CANDIDATE_DRAWING_POLICY, 'design/tools/lib/reviewed-drawing-ports.json',
    ...Object.keys(policy.sourceHashes), ...Object.keys(policy.ports), ...Object.keys(policy.styles),
    ...Object.keys(policy.metadataFiles), ...Object.keys(policy.buildFiles),
    ...Object.values(policy.styles).map(pin => pin.source),
    ...Object.values(policy.buildFiles).flatMap(pin => Object.keys(pin.assetHashes))]);
  for (const path of paths) {
    mkdirSync(dirname(join(target, path)), { recursive: true });
    cpSync(join(root, path), join(target, path));
  }
  return target;
}
function append(target, path, value) { writeFileSync(join(target, path), readFileSync(join(target, path), 'utf8') + value); }
const refuses = async (target, expected) => assert.match((await productionDrawingProblems(target)).join('\n'), expected);

test('the exact current candidate passes alongside the unchanged historical drawing policy', async t => {
  assert.deepEqual(await productionDrawingProblems(root), []);
  assert.deepEqual(await productionDrawingProblems(fixture(t)), []);
});
test('a candidate cannot approve itself by changing its supplement', async t => {
  const target = fixture(t);
  append(target, CANDIDATE_DRAWING_POLICY, '\n');
  await refuses(target, /Candidate drawing approval content hash differs/);
});
test('the candidate cannot substitute a different historical policy', async t => {
  const target = fixture(t);
  append(target, 'design/tools/lib/reviewed-drawing-ports.json', '\n');
  await refuses(target, /Historical drawing approval content hash differs/);
});
test('removing the supplement cannot certify the new ports under historical approval', async t => {
  const target = fixture(t);
  rmSync(join(target, CANDIDATE_DRAWING_POLICY));
  await refuses(target, /clone-fx\.mjs: unreviewed file/);
});
test('missing or changed candidate ports remain rejected', async t => {
  const target = fixture(t);
  rmSync(join(target, 'apps/game/hosted/board-v2-drawing/medical-four.mjs'));
  await refuses(target, /medical-four\.mjs: required candidate drawing input differs/);
  append(target, 'apps/game/hosted/board-v2-drawing/clone-fx.mjs', '\n');
  await refuses(target, /clone-fx\.mjs: reviewed drawing port content hash differs/);
});
test('the reviewed clone comment never permits a prototype import or copied module', async t => {
  const target = fixture(t), path = 'apps/game/hosted/board-v2-drawing/clone-fx.mjs';
  cpSync(join(target, path), join(target, 'apps/game/hosted/copied-clone.mjs'));
  await refuses(target, /copied-clone\.mjs: production code refers to the ability-art prototype/);
  append(target, path, "\nimport '../../../design/abilities/js/app.js';\n");
  await refuses(target, /clone-fx\.mjs: production code refers to the ability-art prototype/);
});
test('exact catalog source metadata does not permit copied catalogs', async t => {
  const target = fixture(t);
  cpSync(join(target, 'apps/game/hosted/board-v2-film-art/catalog.json'), join(target, 'apps/game/hosted/copied-catalog.json'));
  await refuses(target, /copied-catalog\.json: production code refers to the board-v2 prototype/);
});
test('native metadata changes and injected prototype imports lose their exception', async t => {
  const target = fixture(t);
  append(target, 'apps/game/hosted/board-v2-host.mjs', "\nimport 'board-v2';\n");
  await refuses(target, /board-v2-host\.mjs: reviewed native metadata file content hash differs/);
  await refuses(target, /board-v2-host\.mjs: production code refers to the board-v2 prototype/);
});
test('candidate source snapshots and common-art assets remain hash-bound', async t => {
  const target = fixture(t), source = policy.ports['apps/game/hosted/board-v2-drawing/clone-fx.mjs'].source;
  append(target, source, '\n');
  await refuses(target, /frozen drawing source hash differs/);
  const asset = Object.keys(policy.buildFiles['apps/game/hosted/comic-assets.mjs'].assetHashes)
    .find(path => path.startsWith('apps/game/hosted/board-v2-film-art/') && path.endsWith('.svg'));
  assert.ok(asset);
  append(target, asset, '<!-- changed -->');
  await refuses(target, /reviewed build asset input differs: apps\/game\/hosted\/board-v2-film-art/);
});
test('ability references are detected through escaped, split and encoded paths', () => {
  for (const value of ["import 'design/abilities/js/app.js';", "import('design/' + 'abilities/js/app.js');",
    "import 'design/\\u0061bilities/js/app.js';", "fetch('/design/%61bilities/js/app.js');"]) {
    assert.equal(abilityPrototypeReferences('unreviewed.mjs', value).length, 1);
    assert.equal(reviewedAbilityProse(policy, 'unreviewed.mjs', value), false);
  }
  const path = 'apps/game/hosted/board-v2-drawing/clone-fx.mjs';
  assert.equal(reviewedAbilityProse(policy, path, readFileSync(join(root, path), 'utf8')), true);
});
