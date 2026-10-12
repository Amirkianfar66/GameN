// mothership:dev-only
// Reproducible port of the owner's selected Designer drawing primitives. No prototype app,
// director, fixtures or tools enter the runtime. Original source remains under design/.
globalThis[Symbol.for('mothership:dev-only')] = true;
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const sourceCommit = '49f0db4d34d2a2a418f669a13bed660fc665b1b6';
const styleSourceCommit = 'd87163358ea85878fd3e9e4ffb347c4e71d6de5d';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const destination = resolve(root, 'apps/game/hosted/scene-drawing');
const sha = value => createHash('sha256').update(value).digest('hex');
const provenance = { sourceCommit, styleSourceCommit, boardVersion: 'board-motion-0.3.0', trial: 'unpainted-owner-trial-2026-10-12', sources: {}, ports: {} };
await mkdir(destination, { recursive: true });

async function source(path, commit = sourceCommit) {
  const committed = execFileSync('git', ['show', `${commit}:${path}`], { cwd: root });
  if (sha(await readFile(resolve(root, path))) !== sha(committed)) throw Error(`Designer source differs from the pinned commit: ${path}`);
  provenance.sources[path] = sha(committed);
  return committed.toString('utf8');
}
async function port(path, file, adapt = value => value) {
  const original = await source(path);
  // This is an explicitly reviewed production port of pure drawing code, not an import of
  // the development prototype. Replace its classification comment; preserve its geometry.
  const body = adapt(original.replace(/^\/\/ mothership:dev-only\r?\n/, ''));
  const result = `// Runtime drawing port; Designer ${sourceCommit}; source SHA256 ${provenance.sources[path]}.\n${body}`;
  await writeFile(resolve(destination, file), result);
  provenance.ports[file] = { source: path, sha256: sha(result) };
}
for (const file of ['body.mjs', 'crew.mjs', 'parts.mjs', 'rig.mjs', 'gestures.mjs', 'motion.mjs']) {
  await port(`design/board-motion/figures/${file}`, file);
}
await port('design/board-motion/scenes/frame.mjs', 'frame.mjs', value => value.replaceAll('../figures/', './'));
await port('design/board-motion/js/layout.js', 'layout.mjs', value => value
  .replace("'../scenes/index.mjs'", "'./scenes.mjs'").replace("'../figures/gestures.mjs'", "'./gestures.mjs'"));

// Export only scene geometry and layer depth. Generator functions and the prototype's
// rendering/data plumbing remain in Designer ownership and outside the runtime graph.
for (const file of ['index.mjs', 'kit.mjs', 'command-room.mjs', 'room-a.mjs', 'room-b.mjs', 'hospital.mjs', 'jail.mjs']) {
  await source(`design/board-motion/scenes/${file}`);
}
const { SCENES } = await import(pathToFileURL(resolve(root, 'design/board-motion/scenes/index.mjs')).href);
const scenes = Object.fromEntries(Object.entries(SCENES).map(([id, scene]) => [id, {
  room: scene.room, inner: scene.inner, focus: scene.focus, slots: scene.slots,
  layers: Object.fromEntries(Object.entries(scene.layers ?? {}).map(([key, value]) => [key, { depth: value.depth }])),
}]));
const sceneSource = `// Selected public scene geometry from Designer ${sourceCommit}.\nexport const SCENES = ${JSON.stringify(scenes, null, 2)};\n`;
await writeFile(resolve(destination, 'scenes.mjs'), sceneSource);
provenance.ports['scenes.mjs'] = { source: 'selected SCENES geometry', sha256: sha(sceneSource) };
const board = await source('design/board-motion/js/board.js');
const geometry = board.slice(board.indexOf('export function geometry('), board.indexOf('/**\n * Lays a piece out'));
if (!geometry.includes('export function pressRect(')) throw Error('Designer geometry boundary drift');
const geometrySource = `// Runtime geometry port; Designer ${sourceCommit}; source SHA256 ${provenance.sources['design/board-motion/js/board.js']}.\n
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
await writeFile(resolve(destination, 'geometry.mjs'), geometrySource);
provenance.ports['geometry.mjs'] = { source: 'selected board geometry functions', sha256: sha(geometrySource) };
const stylePath = 'design/abilities/css/abilities.css';
const styleSource = await source(stylePath, styleSourceCommit);
let style = styleSource.slice(styleSource.indexOf('/* ---------- slice 2:'));
style = style.slice(0, style.indexOf('/* A board seen from the file:')) + style.slice(style.indexOf('/* Reduced motion:', style.indexOf('/* A board seen from the file:')));
style = style.replace(/^\[data-motion="reduced"\] \[data-board="own"\][^\n]+\n/gm, '');
for (const [from, to] of [
  ['.bm-strip__detail', '.phone-strip__detail'], ['.bm-chip__icon', '.ability-offer-icon'],
  ['.bm-app[data-short="true"]', '#app .ms-shell--player[data-short="true"]'], ['#bm-card', '.ms-private[data-open="true"]'],
  ['.bm-hint', '.ms-private__hint'], ['.bm-card__art', '.ms-role-card__art'], ['.bm-card__name', '.ms-role-card__name'],
  ['.bm-card__team', '.ms-role-card__team'], ['.bm-card', '.ms-role-card'], ['.bm-strip ', '.phone-strip '],
]) style = style.replaceAll(from, to);
style = `/* Runtime stylesheet port; Designer PR #113 at ${styleSourceCommit}; source SHA256 ${sha(styleSource)}. Kit frozen at PR #111; selector adaptations and source paths are in Frontend provenance. */\n${style}`;
await writeFile(resolve(root, 'apps/game/hosted/ability-drawing.css'), style);
provenance.styles = { 'ability-drawing.css': { source: stylePath, sha256: sha(style), adaptations: 'Slice 2 onward; hosted selectors; existing owned board spotlight retained separately.' } };
await writeFile(resolve(root, 'docs/frontend/scene-drawing-provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`);
console.log(`Ported ${Object.keys(provenance.ports).length} drawing modules from ${sourceCommit}; original Designer bytes preserved.`);
