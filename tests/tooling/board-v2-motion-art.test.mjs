import assert from 'node:assert/strict';
import test from 'node:test';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { prepareBoardV2MotionArt, BOARD_V2_MOTION_CATALOG } from '../../scripts/board-v2-motion-art.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const catalog = JSON.parse(readFileSync(join(root, BOARD_V2_MOTION_CATALOG)));
test('S1/S4 share one static common bundle with no viewer or gameplay input', () => {
  const art = prepareBoardV2MotionArt(root);
  assert.equal(art.assetCount, 24);
  assert.equal(art.sha256, '7793869d6bef7d4a851ba5d5aa12e686544c3ae3f842409ac70598d864532677');
  assert.equal(prepareBoardV2MotionArt.length, 1);
  for (const asset of catalog.assets) assert.ok(art.stylesheet.includes(asset.cssVariable));
});
for (const changed of [BOARD_V2_MOTION_CATALOG, ...catalog.assets.map(asset => asset.source)]) {
  test(`S1/S4 refuse changed reviewed input ${changed}`, t => {
    const destination = mkdtempSync(join(tmpdir(), 'gamen-motion-art-'));
    t.after(() => rmSync(destination, { recursive: true, force: true }));
    for (const path of [BOARD_V2_MOTION_CATALOG, ...catalog.assets.map(asset => asset.source)]) {
      mkdirSync(dirname(join(destination, path)), { recursive: true }); cpSync(join(root, path), join(destination, path));
    }
    writeFileSync(join(destination, changed), readFileSync(join(destination, changed), 'utf8') + '\nchanged');
    assert.throws(() => prepareBoardV2MotionArt(destination), /Board V2 motion art:/);
  });
}
