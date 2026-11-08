import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {readHostedArtReleases} from '../../scripts/hosted-art-releases.mjs';
import {readPregameConsumerApproval} from '../../scripts/pregame-consumer-approval.mjs';
import {assertRuntimeArtOutput, RUNTIME_ART_VERSION} from '../../scripts/runtime-art-release.mjs';
import {comicAssetsPlugin} from '../../apps/game/hosted/comic-assets.mjs';
import {planetLibraryAssetsPlugin} from '../../apps/game/hosted/build/planet-library-art.mjs';
import {crewDrawingAssetsPlugin} from '../../scripts/crew-drawing-art.mjs';
import {pregameAssetsPlugin} from '../../scripts/pregame-art-release.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));

// Final-adoption integration cases: use only the actual reviewed production record.
// This file belongs in the final-adoption PR after that record has been accepted.
test('verified final adoption reports08 while retaining the root V1 identity and historical validation', () => {
  assert.notEqual(process.env.MOTHERSHIP_PREGAME_CONSUMER_REVIEW, '1', 'production verification must not use local-review mode');
  assert.ok(readPregameConsumerApproval(root), 'the actual final approval is required; no synthetic acceptance');
  const releases = readHostedArtReleases(root);
  assert.equal(RUNTIME_ART_VERSION, 'design-0.5.0');
  assert.equal(releases.rootArt.manifestVersion, RUNTIME_ART_VERSION);
  assert.equal(releases.planetArt.manifestVersion, 'design-0.8.0');
  assert.deepEqual(releases.validationReleases.map(release => release.manifestVersion),
    ['design-0.5.0', 'design-0.6.0', 'design-0.7.0', 'design-0.8.0']);
  assert.deepEqual(releases.planetRelease, {entryPath: '/planet/', assetManifestVersion: 'design-0.8.0',
    artManifestSha256: releases.planetArt.manifestSha256, gameplayPins: releases.planetArt.gameplayPins});
});

test('real emitted output retains all27 Planet assets for06,07 and08 and rejects damage to each release', t => {
  const releases = readHostedArtReleases(root), output = mkdtempSync(join(tmpdir(), 'gamen-hosted-art-release-'));
  t.after(() => rmSync(output, {recursive: true, force: true}));
  const context = {emitFile(file) {
    const path = join(output, file.fileName); mkdirSync(dirname(path), {recursive: true}); writeFileSync(path, file.source);
  }};
  for (const plugin of [comicAssetsPlugin(root), planetLibraryAssetsPlugin(root), crewDrawingAssetsPlugin(root), pregameAssetsPlugin(root)])
    plugin.buildStart.call(context);
  for (const release of releases.validationReleases) {
    assert.equal(assertRuntimeArtOutput(release, output), release === releases.rootArt ? 9 : 27);
    const path = join(output, release.bundles['public-board'].url.slice(1)), previous = readFileSync(path);
    writeFileSync(path, 'truncated');
    assert.throws(() => assertRuntimeArtOutput(release, output), /published output differs: public-board/);
    writeFileSync(path, previous);
  }
});
