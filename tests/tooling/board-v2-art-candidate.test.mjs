import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync, mkdtempSync, mkdirSync, copyFileSync, appendFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareBoardV2Art, BOARD_V2_ART_CATALOG } from '../../scripts/board-v2-art-candidate.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const catalog = JSON.parse(readFileSync(resolve(root, BOARD_V2_ART_CATALOG), 'utf8'));
const sha = value => createHash('sha256').update(value).digest('hex');
function isolatedSource(run) {
  const temporary = mkdtempSync(resolve(tmpdir(), 'gamen-board-v2-art-test-'));
  try {
    for (const path of [BOARD_V2_ART_CATALOG, ...catalog.assets.map(asset => asset.source)]) {
      const destination = resolve(temporary, path);
      mkdirSync(dirname(destination), { recursive: true });
      copyFileSync(resolve(root, path), destination);
    }
    run(temporary);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

test('one deterministic common bundle includes all twenty original drawings, with no geometry changes', () => {
  const bundle = prepareBoardV2Art(root);
  assert.equal(bundle.assetCount, 20);
  assert.equal(catalog.assets.filter(asset => asset.id.startsWith('ward-')).length, 12);
  assert.equal(catalog.assets.filter(asset => asset.id.startsWith('capsule-')).length, 8);
  const embedded = [...bundle.stylesheet.matchAll(/  (--[\w-]+): url\("data:image\/svg\+xml,([^\n"]+)"\);/g)];
  assert.equal(embedded.length, 20);
  for (const asset of catalog.assets) {
    const source = readFileSync(resolve(root, asset.source), 'utf8');
    const found = embedded.find(entry => entry[1] === asset.cssVariable);
    assert.ok(found, asset.id);
    assert.equal(decodeURIComponent(found[2]), source.slice(source.indexOf('<svg')), asset.id);
    assert.equal(asset.audience, 'public');
  }
  assert.deepEqual(prepareBoardV2Art(root), bundle);
  assert.equal(bundle.sha256, sha(bundle.stylesheet));
  assert.equal(bundle.url, `/art/board-v2.art.${bundle.sha256.slice(0, 10)}.css`);
  assert.doesNotMatch(bundle.stylesheet, /mothership:dev-only|design\/board-v2|<script/i);
});

test('source drift is refused before an altered drawing can be published', () => isolatedSource(temporary => {
  appendFileSync(resolve(temporary, catalog.assets[0].source), '\n<!-- changed -->');
  assert.throws(() => prepareBoardV2Art(temporary), /source changed: ward-7-back/);
}));

test('missing art cannot silently create an incomplete common bundle', () => isolatedSource(temporary => {
  rmSync(resolve(temporary, catalog.assets.at(-1).source));
  assert.throws(() => prepareBoardV2Art(temporary), /ENOENT/);
}));

test('an edited catalog cannot approve new paths, bytes or a partial bundle itself', () => isolatedSource(temporary => {
  const altered = structuredClone(catalog); altered.assets.pop();
  writeFileSync(resolve(temporary, BOARD_V2_ART_CATALOG), JSON.stringify(altered));
  assert.throws(() => prepareBoardV2Art(temporary), /reviewed catalog changed/);
}));

test('ward layer metadata preserves Claude depth interleaving and roster-specific beds', () => {
  for (const roster of [7, 8, 9]) {
    const layers = catalog.assets.filter(asset => asset.rosters?.includes(roster));
    assert.equal(layers.length, roster + 1);
    assert.equal(layers.filter(asset => asset.layer === 'back').length, 1);
    for (const layer of layers.filter(asset => asset.layer !== 'back')) {
      assert.equal(layer.paintZIndex, 2 * Math.round(layer.sceneDepth) + 1);
    }
  }
});
