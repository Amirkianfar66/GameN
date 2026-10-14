import assert from 'node:assert/strict';
import test from 'node:test';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { prepareSetupArt, SETUP_ART_CATALOG } from '../../scripts/setup-art-candidate.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
test('the role-card back is one static common bundle, with no private input', () => {
  const art = prepareSetupArt(root);
  assert.equal(art.assetCount, 1);
  assert.match(art.stylesheet, /--ab-asset-setup-back:/);
  assert.match(art.url, /^\/art\/setup\.art\.[a-f0-9]{10}\.css$/);
  assert.equal(prepareSetupArt.length, 1);
  assert.deepEqual(prepareSetupArt(root), art);
});
for (const changed of ['catalog', 'source', 'asset', 'reference-css']) test(`setup art rejects changed ${changed}`, t => {
  const destination = mkdtempSync(join(tmpdir(), 'gamen-setup-art-'));
  t.after(() => rmSync(destination, { recursive: true, force: true }));
  const catalog = JSON.parse(readFileSync(join(root, SETUP_ART_CATALOG), 'utf8'));
  for (const path of [SETUP_ART_CATALOG, ...catalog.sources.map(source => source.path)]) {
    mkdirSync(dirname(join(destination, path)), { recursive: true }); cpSync(join(root, path), join(destination, path));
  }
  const target = changed === 'catalog' ? SETUP_ART_CATALOG : catalog.sources[{ source: 0, asset: 1, 'reference-css': 2 }[changed]].path;
  writeFileSync(join(destination, target), readFileSync(join(destination, target), 'utf8') + '\nchanged');
  assert.throws(() => prepareSetupArt(destination), /Setup art:/);
});
