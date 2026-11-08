import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { CREW_APPROVAL, readCrewDrawingApproval, prepareCrewDrawingArt, verifyCrewDrawingPorts, crewDrawingAssetsPlugin } from '../../scripts/crew-drawing-art.mjs';
import { CREW_ART_VERSION, CREW_CONSUMER_APPROVAL, readCrewConsumerApproval, readRuntimeArtRelease, assertRuntimeArtOutput } from '../../scripts/runtime-art-release.mjs';
import { comicAssetsPlugin } from '../../apps/game/hosted/comic-assets.mjs';
import { planetLibraryAssetsPlugin } from '../../apps/game/hosted/build/planet-library-art.mjs';
import { prepareBoardV2FilmsArt } from '../../apps/game/hosted/build/board-v2-films-art.mjs';
import { readDrawingPolicy, productionDrawingProblems } from '../../design/tools/lib/drawing-port-fence.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => readFileSync(join(root, path));
function temporary(t) {
  const dir = mkdtempSync(join(tmpdir(), 'gamen-crew-registration-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function seed(t) {
  const dir = temporary(t), release = readRuntimeArtRelease(root, CREW_ART_VERSION), policy = readDrawingPolicy(root);
  const paths = new Set([
    'design/releases/design-0.7.0.json', 'design/releases/design-0.6.0.json',
    'design/releases/design-0.5.0.json', 'design/exports/asset-manifest.json',
    'design/tools/lib/reviewed-drawing-ports.json', 'design/releases/board-v2-four-drawing-approval.json',
    'design/releases/planet-drawing-approval.json', 'design/releases/crew-drawing-approval.json',
    'design/releases/crew-consumer-drawing-approval.json',
    CREW_CONSUMER_APPROVAL, ...Object.keys(readCrewConsumerApproval(root).requiredFiles),
    CREW_APPROVAL, release.libraryIntegrationApproval.path,
    ...Object.keys(release.sources), ...Object.keys(release.runtimeFiles),
    ...Object.keys(policy.requiredFiles), ...Object.keys(policy.sourceHashes),
    ...Object.keys(policy.ports), ...Object.keys(policy.styles), ...Object.keys(policy.metadataFiles),
    ...Object.keys(policy.buildFiles), ...Object.values(policy.styles).map(entry => entry.source),
    ...Object.values(policy.buildFiles).flatMap(entry => Object.keys(entry.assetHashes)),
    ...readCrewDrawingApproval(root).assets.filter(asset => asset.replaces).map(asset => asset.replaces.path),
  ]);
  for (const path of paths) { mkdirSync(dirname(join(dir, path)), { recursive: true }); cpSync(join(root, path), join(dir, path)); }
  return dir;
}

test('DSN-REQ-17 binds exact source, 17 exact-copy ports and explicit tokens without replacing historical exports', async () => {
  assert.equal(verifyCrewDrawingPorts(root), 17);
  const release = readRuntimeArtRelease(root, CREW_ART_VERSION), previous = readRuntimeArtRelease(root, 'design-0.6.0');
  assert.deepEqual(release.gameplayPins, previous.gameplayPins);
  assert.equal(release.designerHead, '8cee39d89798390d03c2a4a9fe457fa6de387bda');
  assert.equal(release.tokens.version, '0.5.0');
  const tokens = await import('../../packages/design-tokens/dist/index.js');
  assert.deepEqual(tokens.crewDesignTokens, JSON.parse(read(release.tokens.path)));
  assert.deepEqual(tokens.nextDesignTokens, JSON.parse(read('packages/design-tokens/src/tokens-0.4.0.json')));
  assert.deepEqual(release.media, previous.media);
  const changed = ['public-board', 'roles', 'board-v2-films-art'];
  for (const [name, entry] of Object.entries(previous.bundles)) {
    if (changed.includes(name)) assert.notDeepEqual(release.bundles[name], entry);
    else assert.deepEqual(release.bundles[name], entry);
  }
});

test('published Planet manifest and original consumer bytes survive exact successor adoption', () => {
  const approval = readCrewConsumerApproval(root);
  assert.equal(hash(read('design/releases/design-0.6.0.json')), 'eeb4a88c7b71166a1c9782231ccd7fa81931cb50eed112e3d6153a862751bec4');
  assert.equal(hash(read(approval.registrationSnapshot.path)), '5cd0a792c780a937fee6aee918c133567ecdf2a1ef801251d209209c24e49cc0');
  const old = readRuntimeArtRelease(root, 'design-0.6.0'), current = readRuntimeArtRelease(root, CREW_ART_VERSION);
  const overrides = Object.entries(approval.historicalRuntimeOverrides['design-0.6.0']);
  assert.equal(overrides.length, 3);
  for (const [path, pin] of overrides) {
    assert.equal(old.runtimeFiles[path], pin.previousSha256, 'published inventory is not repinned');
    assert.equal(hash(read(`design/releases/historical-blobs/${pin.previousSha256}`)), pin.previousSha256);
    assert.equal(current.runtimeFiles[path], pin.sha256);
    assert.equal(hash(read(path)), pin.sha256);
  }
});

test('compatibility cannot substitute changed current code, erase historical evidence or approve itself', t => {
  const dir = seed(t), approval = readCrewConsumerApproval(root);
  const [path, pin] = Object.entries(approval.historicalRuntimeOverrides['design-0.6.0'])[0];
  const historical = `design/releases/historical-blobs/${pin.previousSha256}`;
  const verifyBoth = () => {
    for (const version of ['design-0.6.0', CREW_ART_VERSION]) {
      assert.throws(() => readRuntimeArtRelease(dir, version), /crew consumer content differs|crew consumer approval differs/);
    }
  };
  writeFileSync(join(dir, path), '// unreviewed current consumer'); verifyBoth();
  cpSync(join(root, path), join(dir, path));
  writeFileSync(join(dir, historical), '// erased historical evidence'); verifyBoth();
  cpSync(join(root, historical), join(dir, historical));
  const changed = JSON.parse(readFileSync(join(dir, CREW_CONSUMER_APPROVAL)));
  changed.historicalRuntimeOverrides['design-0.6.0'][path].sha256 = '0'.repeat(64);
  writeFileSync(join(dir, CREW_CONSUMER_APPROVAL), JSON.stringify(changed)); verifyBoth();
});

test('new uniform bundles contain exactly the 36 approved exports and retire only the 27 obsolete film properties', () => {
  const approval = readCrewDrawingApproval(root), files = prepareCrewDrawingArt(root);
  for (const file of files) {
    assert.match(file.stylesheet, /\[data-crew-art="crew-drawing-1.0.0"\] \{/);
    assert.doesNotMatch(file.stylesheet, /^:root\s*\{/m, 'preloading must not restyle a historical match');
  }
  for (const asset of approval.assets) {
    const name = asset.replaces?.bundle ?? asset.proposedBundle;
    const variable = asset.replaces?.cssVariable ?? asset.proposedCssVariable;
    const file = files.find(item => item.name === name);
    const matches = [...file.stylesheet.matchAll(new RegExp(`  ${variable}: url\\("data:image/svg\\+xml,([^"\\n]+)"\\);`, 'g'))];
    assert.equal(matches.length, 1, variable);
    assert.equal(hash(Buffer.from(decodeURIComponent(matches[0][1]))), asset.sha256);
  }
  const old = prepareBoardV2FilmsArt(root), current = files.find(item => item.name === 'board-v2-films-art');
  const properties = sheet => [...sheet.matchAll(/^  (--[a-z0-9-]+): /gm)].map(match => match[1]);
  const removed = properties(old.stylesheet).filter(name => !properties(current.stylesheet).includes(name));
  assert.deepEqual(removed.sort(), approval.retiredFilmAssets.map(item => item.cssVariable).sort());
  assert.equal(properties(current.stylesheet).length, 73);
  assert.equal(properties(files.find(item => item.name === 'public-board').stylesheet).length, 110);
  assert.equal(properties(files.find(item => item.name === 'roles').stylesheet).length, 9);
  for (const asset of approval.retiredFilmAssets) assert.equal(hash(read(asset.path)), asset.sha256, 'old files remain intact');
});

test('build emits complete historical and new release output side by side; a damaged new bundle is rejected', t => {
  const output = temporary(t), context = { emitFile(file) {
    const path = join(output, file.fileName); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, file.source);
  } };
  for (const plugin of [comicAssetsPlugin(root), planetLibraryAssetsPlugin(root), crewDrawingAssetsPlugin(root)]) plugin.buildStart.call(context);
  assert.equal(assertRuntimeArtOutput(readRuntimeArtRelease(root, 'design-0.6.0'), output), 27);
  const release = readRuntimeArtRelease(root, CREW_ART_VERSION);
  assert.equal(assertRuntimeArtOutput(release, output), 27);
  writeFileSync(join(output, release.bundles['public-board'].url.slice(1)), 'truncated');
  assert.throws(() => assertRuntimeArtOutput(release, output), /published output differs: public-board/);
});

test('changed source, runtime port or asset cannot authorize itself through the candidate manifest', t => {
  const dir = seed(t), approval = readCrewDrawingApproval(root), port = approval.ports[0];
  writeFileSync(join(dir, port.runtime), '// edited port');
  assert.throws(() => verifyCrewDrawingPorts(dir), /Crew input differs/);
  cpSync(join(root, port.runtime), join(dir, port.runtime));
  writeFileSync(join(dir, port.source), '// edited source');
  assert.throws(() => verifyCrewDrawingPorts(dir), /Crew input differs/);
  cpSync(join(root, port.source), join(dir, port.source));
  writeFileSync(join(dir, approval.assets[0].path), '<svg/>');
  assert.throws(() => prepareCrewDrawingArt(dir), /Crew input differs/);
  const manifestPath = join(dir, 'design/releases/design-0.7.0.json');
  const manifest = JSON.parse(readFileSync(manifestPath)); manifest.tokens.version = '0.4.0';
  writeFileSync(manifestPath, JSON.stringify(manifest));
  assert.throws(() => readRuntimeArtRelease(dir, CREW_ART_VERSION), /approved manifest differs/);
});

test('the fence rejects unknown, changed and missing crew ports, and a self-edited approval', async t => {
  const dir = seed(t), file = 'apps/game/hosted/crew-drawing/crew.mjs';
  assert.deepEqual(await productionDrawingProblems(dir), []);
  writeFileSync(join(dir, 'apps/game/hosted/crew-drawing/extra.mjs'), 'export const extra = 1;');
  assert.match((await productionDrawingProblems(dir)).join('\n'), /extra.mjs: unreviewed file/);
  rmSync(join(dir, 'apps/game/hosted/crew-drawing/extra.mjs'));
  writeFileSync(join(dir, file), '// changed');
  assert.match((await productionDrawingProblems(dir)).join('\n'), /crew.mjs: reviewed drawing port content hash differs/);
  rmSync(join(dir, file));
  assert.match((await productionDrawingProblems(dir)).join('\n'), /crew.mjs: required candidate drawing input differs/);
  writeFileSync(join(dir, 'design/releases/crew-drawing-approval.json'), '{}');
  assert.match((await productionDrawingProblems(dir)).join('\n'), /Crew drawing approval content hash differs/);
});
