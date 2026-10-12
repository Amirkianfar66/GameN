// mothership:dev-only
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { after, test } from 'node:test';
import { contentSha256, productionDrawingProblems, prototypeReferences, REVIEWED_DRAWING_PORTS as pins } from '../../../design/tools/lib/drawing-port-fence.mjs';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const roots = [];
after(async () => { for (const root of roots) await rm(root, { recursive: true, force: true }); });
async function write(root, path, content) { await mkdir(dirname(resolve(root, path)), { recursive: true }); await writeFile(resolve(root, path), content); }
async function seed() {
  const root = await mkdtemp(resolve(tmpdir(), 'mothership-drawing-fence-')); roots.push(root);
  for (const path of Object.keys(pins.sourceHashes)) {
    await mkdir(dirname(resolve(root, path)), { recursive: true }); await cp(resolve(repo, path), resolve(root, path));
  }
  for (const path of Object.keys(pins.buildFiles['apps/game/hosted/comic-assets.mjs'].assetHashes)) {
    await mkdir(dirname(resolve(root, path)), { recursive: true }); await cp(resolve(repo, path), resolve(root, path));
  }
  for (const pin of Object.values(pins.styles)) {
    assert.equal(contentSha256(await readFile(resolve(repo, pin.source))), pin.sourceSha256);
    await mkdir(dirname(resolve(root, pin.source)), { recursive: true }); await cp(resolve(repo, pin.source), resolve(root, pin.source));
  }
  // Independently reproduce Frontend's pinned port recipe; the checker compares fixed
  // reviewed hashes, never approves what this recipe or a provenance file claims.
  const original = async path => {
    const source = await readFile(resolve(root, path), 'utf8');
    assert.equal(contentSha256(source), pins.sourceHashes[path]); return source;
  };
  const port = async (source, file, adapt = value => value) => {
    const body = adapt((await original(source)).replace(/^\/\/ mothership:dev-only\r?\n/, ''));
    const value = `// Runtime drawing port; Designer ${pins.sourceCommit}; source SHA256 ${pins.sourceHashes[source]}.\n${body}`;
    assert.equal(contentSha256(value), pins.ports['apps/game/hosted/scene-drawing/' + file].sha256);
    await write(root, 'apps/game/hosted/scene-drawing/' + file, value);
  };
  for (const file of ['body.mjs', 'crew.mjs', 'parts.mjs', 'rig.mjs', 'gestures.mjs', 'motion.mjs']) await port('design/board-motion/figures/' + file, file);
  await port('design/board-motion/scenes/frame.mjs', 'frame.mjs', value => value.replaceAll('../figures/', './'));
  await port('design/board-motion/js/layout.js', 'layout.mjs', value => value.replace("'../scenes/index.mjs'", "'./scenes.mjs'").replace("'../figures/gestures.mjs'", "'./gestures.mjs'"));
  const { SCENES } = await import(pathToFileURL(resolve(root, 'design/board-motion/scenes/index.mjs')).href);
  const scenes = Object.fromEntries(Object.entries(SCENES).map(([id, scene]) => [id, { room: scene.room, inner: scene.inner, focus: scene.focus, slots: scene.slots,
    layers: Object.fromEntries(Object.entries(scene.layers ?? {}).map(([key, value]) => [key, { depth: value.depth }])) }]));
  const sceneSource = `// Selected public scene geometry from Designer ${pins.sourceCommit}.\nexport const SCENES = ${JSON.stringify(scenes, null, 2)};\n`;
  assert.equal(contentSha256(sceneSource), pins.ports['apps/game/hosted/scene-drawing/scenes.mjs'].sha256);
  await write(root, 'apps/game/hosted/scene-drawing/scenes.mjs', sceneSource);
  const board = await original('design/board-motion/js/board.js');
  const geometry = board.slice(board.indexOf('export function geometry('), board.indexOf('/**\n * Lays a piece out'));
  const geometrySource = `// Runtime geometry port; Designer ${pins.sourceCommit}; source SHA256 ${pins.sourceHashes['design/board-motion/js/board.js']}.\n
import { FRAME } from './body.mjs';
import { skeletonOf } from './gestures.mjs';
import { PRESS, frameScene, pressPoint, toScene } from './frame.mjs';
import { SCENES } from './scenes.mjs';
const [BOX_X, BOX_Y, BOX] = FRAME.box;
const [ANCHOR_X, ANCHOR_Y] = FRAME.anchor;
const STAND_HEIGHT = ANCHOR_Y - 19;
const JOINTS = ['head', 'neck', 'pelvis', 'sN', 'eN', 'wN', 'sF', 'eF', 'wF', 'hipN', 'kN', 'aN', 'hipF', 'kF', 'aF'];
const pressSize = unit => Math.max(PRESS, Math.min(64, 0.26 * STAND_HEIGHT * unit));
${geometry}`;
  assert.equal(contentSha256(geometrySource), pins.ports['apps/game/hosted/scene-drawing/geometry.mjs'].sha256);
  await write(root, 'apps/game/hosted/scene-drawing/geometry.mjs', geometrySource);
  const plugin = await readFile(resolve(repo, 'packages/design-tokens/test/fixtures/reviewed-comic-assets.txt'));
  assert.equal(contentSha256(plugin), pins.buildFiles['apps/game/hosted/comic-assets.mjs'].sha256);
  await write(root, 'apps/game/hosted/comic-assets.mjs', plugin);
  const style = await readFile(resolve(repo, 'packages/design-tokens/test/fixtures/reviewed-ability-drawing.txt'));
  assert.equal(contentSha256(style), pins.styles['apps/game/hosted/ability-drawing.css'].sha256);
  await write(root, 'apps/game/hosted/ability-drawing.css', style);
  return root;
}
async function append(root, path, text) { await write(root, path, await readFile(resolve(root, path), 'utf8') + '\n' + text); }
const refuses = async (root, pattern) => assert.match((await productionDrawingProblems(root)).join('\n'), pattern);

test('all exact reviewed pure ports, source identifier/prose, style and build-only asset inputs pass', async () => {
  assert.deepEqual(await productionDrawingProblems(await seed()), []);
});
test('ordinary frontend files without adoption remain valid', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'mothership-no-adoption-')); roots.push(root);
  await write(root, 'apps/game/hosted/main.mjs', 'export const ordinary = true;');
  assert.deepEqual(await productionDrawingProblems(root), []);
});
for (const [label, injection] of [
  ['static app import', "import '../../../design/board-motion/js/app.js';"],
  ['dynamic fixture import', "export const bad = () => import('../../../design/board-motion/js/fixtures.js');"],
  ['director re-export', "export * from '../../../design/board-motion/js/director.js';"],
  ['prototype URL', "export const bad = new URL('/board-motion/', import.meta.url);"],
  ['split path', "export const bad = () => import('design/' + 'board' + '-motion/js/app.js');"],
  ['escaped path', "export const bad = () => import('design/\\u0062oard-\\u006dotion/js/app.js');"],
  ['encoded path', "export const bad = () => fetch('/design/%62oard-motion/js/fixtures.js');"],
]) {
  test('prototype isolation refuses ' + label + ' outside any exception', async () => {
    const root = await seed(); await write(root, 'apps/game/hosted/leak.mjs', injection);
    await refuses(root, /leak\.mjs: production code refers to the board-motion prototype/);
  });
}
test('an import injected into a reviewed port fails its hash and prototype isolation', async () => {
  const root = await seed(); await append(root, 'apps/game/hosted/scene-drawing/body.mjs', "import '../../../design/board-motion/js/app.js';");
  await refuses(root, /body\.mjs: reviewed drawing port content hash differs/);
  await refuses(root, /body\.mjs: production code refers to the board-motion prototype/);
});
test('arbitrary code and a copied prototype cannot hide in the drawing directory', async () => {
  const root = await seed(); await write(root, 'apps/game/hosted/scene-drawing/controller.mjs', 'export const ordinaryLooking = true;');
  await refuses(root, /controller\.mjs: unreviewed file in the adopted drawing ports/);
});
test('an altered port is rejected even if it removes every prototype word and issues its own provenance', async () => {
  const root = await seed(); await write(root, 'apps/game/hosted/scene-drawing/crew.mjs', 'export const geometry = {};');
  await write(root, 'docs/frontend/scene-drawing-provenance.json', JSON.stringify({ ports: { 'crew.mjs': { sha256: contentSha256('export const geometry = {};') } } }));
  await refuses(root, /crew\.mjs: reviewed drawing port content hash differs/);
});
test('reviewed source drift cannot silently update a port approval', async () => {
  const root = await seed(); await append(root, 'design/board-motion/figures/crew.mjs', '// changed source');
  await refuses(root, /crew\.mjs: frozen drawing source hash differs/);
});
test('a changed build manifest or source CSS fails despite an unchanged approved plugin', async () => {
  const root = await seed(); await append(root, 'design/board-motion/assets/manifest.json', ' ');
  await append(root, 'design/abilities/assets/abilities.art.css', '/* drift */');
  await refuses(root, /reviewed build asset input differs: design\/board-motion\/assets\/manifest\.json/);
  await refuses(root, /reviewed build asset input differs: design\/abilities\/assets\/abilities\.art\.css/);
});
test('the corrected stylesheet source cannot revert while the geometry stays frozen', async () => {
  const root = await seed(); await append(root, 'design/abilities/css/abilities.css', '/* unreviewed source */');
  await refuses(root, /corrected stylesheet source hash differs from d871633/);
});
test('the build-only exception neither travels with a copied file nor allows injected imports', async () => {
  const root = await seed(); const plugin = await readFile(resolve(root, 'apps/game/hosted/comic-assets.mjs'));
  await write(root, 'apps/game/hosted/copied-plugin.mjs', plugin);
  await append(root, 'apps/game/hosted/comic-assets.mjs', "import '../../../design/board-motion/assets/manifest.json';");
  await refuses(root, /copied-plugin\.mjs: production code refers to the board-motion prototype/);
  await refuses(root, /comic-assets\.mjs: production code refers to the board-motion prototype/);
});
test('even a claimed approved hash does not permit app/fixture/director paths', () => {
  for (const name of ['app', 'fixtures', 'director']) assert.equal(prototypeReferences('body.mjs', `import 'design/board-motion/js/${name}.js';`).length, 1);
});
