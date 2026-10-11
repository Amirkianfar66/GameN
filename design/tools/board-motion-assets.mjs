// mothership:dev-only
//
// Builds the board-motion proposal's art (issue #87; the owner's decisions of 9 October 2026:
// full-body comic characters, and each room a scene with five fixed places):
// - the five room scenes: each the approved room's walls, viewport, fittings and props lifted
//   unchanged from its editable source under design/source/board/, around a new deck, the props
//   of its places and its light, printed in the room's colors by the recolor map of the
//   reviewed export recipe, in the room's own 1024 x 768 box; and, as layers of their own, what
//   is drawn in front of a place (the chart table, the laboratory bench, the beds' blankets);
// - one stylesheet holding every scene layer, loaded once whatever the seat's role or state;
// - the manifest, with every place and, for every gesture, the colors and hash of the sheet of the
//   nine characters the figure rig draws in it (the prototype draws its figures live from the
//   same rig and loads no figure art; the sheets are written on request).
//
//   node design/tools/board-motion-assets.mjs                 writes design/board-motion/assets/
//   node design/tools/board-motion-assets.mjs --check         exits 1 if what is on disk differs
//   node design/tools/board-motion-assets.mjs --sheets <dir>  writes the figure sheets to <dir>
//
// The reviewed manifest (design-0.2.0) and its bundles are not touched. This art is a
// versioned proposal (board-motion-0.3.0) for a later export revision; adopting it is an
// Integration step (see docs/design/board-motion-handoff.md).

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIGURE_VERSION, planFigures } from '../board-motion/figures/plan.mjs';
import { composeScene } from '../board-motion/scenes/compose.mjs';
import { SCENES } from '../board-motion/scenes/index.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const OUT = 'design/board-motion/assets';
const sha = content => createHash('sha256').update(content).digest('hex');
/** A layer's file and custom-property name: bedLeft -> bed-left. */
export const kebab = id => id.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
/**
 * An SVG as the body of a data URI: no header or comment, single quotes for its attributes,
 * and only the characters a URL cannot carry escaped, which keeps the bundle near the files' size.
 */
const dataUri = svg => svg.replace(/<\?xml[^>]*>\n/, '').replace(/<!--[\s\S]*?-->\n?/, '').replace(/\s*\n\s*/g, ' ').replace(/"/g, "'")
  .replace(/%/g, '%25').replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E').trim();

export async function planAssets(root = repoRoot) {
  const files = new Map();
  const scenes = [];
  const places = [];
  const variables = [];
  for (const scene of Object.values(SCENES)) {
    const out = await composeScene(scene, root);
    const header = (layer, purpose) => `<?xml version="1.0" encoding="UTF-8"?>
<!--
  Mothership · board-motion proposal ${FIGURE_VERSION} · scene ${scene.room} · ${layer} · generated, do not edit by hand
  ${purpose}
  Built by design/tools/board-motion-assets.mjs from design/board-motion/scenes/ and ${out.sourcePath} (lifted unchanged:
  ${[...scene.under, ...scene.over].join(', ')}), printed in the room's colors by ${out.recipe}. Not in the reviewed manifest design-0.2.0.
-->
`;
    const layers = [['back', 'The room as a scene: its approved walls and fittings, a new deck, the props of its places and its light.', out.back, null],
      ...Object.entries(out.layers).map(([id, layer]) => [kebab(id), `Drawn again in front of the places behind it (depth ${layer.depth}).`, layer.svg, layer.depth])];
    for (const [layer, purpose, svg, depth] of layers) {
      const content = header(layer, purpose) + svg;
      const file = `${OUT}/scenes/${scene.room}.${layer}.svg`;
      files.set(file, content);
      variables.push([`--bm-scene-${scene.room}-${layer}`, content]);
      scenes.push({
        id: `scene.${scene.room}.${layer}`, room: scene.room, layer, depth, file, source: out.sourcePath, sourceSha256: sha(out.source), recolor: out.recipe,
        lifted: layer === 'back' ? [...scene.under, ...scene.over] : [], viewBox: '0 0 1024 768', bytes: Buffer.byteLength(content), sha256: sha(content),
        intendedBundle: 'public-board', audience: 'public', proposedExportVariant: `board-${scene.room}.scene-${layer}`,
      });
    }
    for (const slot of scene.slots) {
      places.push({ id: slot.id, room: scene.room, gesture: slot.gesture, down: slot.down ?? 'down', about: slot.about, at: slot.at, scale: slot.scale, depth: slot.depth ?? slot.at[1], mirror: Boolean(slot.mirror) });
    }
  }
  // One stylesheet holds every scene layer, as the reviewed bundles do: drawing one never fetches one.
  const css = `/* mothership:dev-only · board-motion proposal ${FIGURE_VERSION} · generated by design/tools/board-motion-assets.mjs, do not edit.
   Public art only: the five room scenes and the layers drawn in front of their places. Loaded once, with the public-board
   bundle, whatever the seat's role, state or turn; every rule that draws it waits for [data-art~="board-motion-scenes"]. */
:root {
${variables.map(([name, svg]) => `  ${name}: url("data:image/svg+xml,${dataUri(svg)}");`).join('\n')}
}
`;
  files.set(`${OUT}/board-motion.scenes.css`, css);
  const figures = planFigures();
  const recipes = JSON.parse(await readFile(resolve(root, 'design/source/export-recipes.json'), 'utf8'));
  const manifest = {
    devOnly: 'mothership:dev-only',
    manifestVersion: FIGURE_VERSION,
    status: 'proposal',
    baseManifest: 'design-0.2.0',
    note: 'Public art for the board-motion prototype (the owner\'s decisions of 9 October 2026): the five rooms as scenes with fixed places, built around the approved rooms, and the nine characters as full-body figures drawn by a rig in a gesture for every place. The reviewed manifest and bundles are unchanged; this art is proposed for a later export revision and is adopted only through Integration.',
    rights: {
      origin: 'Scenes: the approved rooms\' groups copied element for element from the repository\'s original vector sources under design/source/board/, recolored by the reviewed export recipes, around new vector drawing generated for this repository by design/board-motion/scenes/. Figures: original vector drawings generated for this repository by design/board-motion/figures/, after the approved standees under design/source/crew/ and in their colors (design tokens 0.4.0). No third-party artwork, font, photograph, traced image or generated raster image.',
      author: 'Visual and Motion Designer workstream, issue #87: a Claude Code session working for the game owner.',
      license: recipes.rights.license,
      reuse: recipes.rights.reuse,
    },
    stylesheet: { file: `${OUT}/board-motion.scenes.css`, sha256: sha(css), bytes: Buffer.byteLength(css), loadPolicy: 'Every device, with the public-board bundle, before the first match view, whatever the seat\'s role, state or turn. Contains public art only.' },
    figureDrawing: 'Live: the prototype draws every figure from the rig (design/board-motion/figures/) and public facts, so no figure art is fetched. node design/tools/board-motion-assets.mjs --sheets <dir> writes each gesture\'s sheet of the nine characters, exactly what the prototype draws, for editing and review; its colors and hash are below.',
    scenes,
    places,
    figures: figures.entries,
  };
  files.set(`${OUT}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  return files;
}

/** Everything under assets/ that the plan no longer makes: removed when writing, reported when checking. */
async function leftovers(files) {
  const found = [];
  const walk = async dir => {
    for (const entry of await readdir(resolve(repoRoot, dir), { withFileTypes: true }).catch(() => [])) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) await walk(path); else if (!files.has(path)) found.push(path);
    }
  };
  await walk(OUT);
  return found;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv.includes('--sheets')) {
  const dir = resolve(process.argv[process.argv.indexOf('--sheets') + 1] ?? '.');
  await mkdir(dir, { recursive: true });
  const { files } = planFigures();
  for (const [name, svg] of files) await writeFile(resolve(dir, name), svg);
  console.log(`Board-motion figure sheets: wrote ${files.size} to ${dir}`);
} else if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = await planAssets();
  const extra = await leftovers(files);
  if (process.argv.includes('--check')) {
    let stale = 0;
    for (const [path, content] of files) {
      const current = await readFile(resolve(repoRoot, path), 'utf8').catch(() => null);
      if (current !== content) { console.error(`stale: ${path}`); stale += 1; }
    }
    for (const path of extra) { console.error(`not made by the plan: ${path}`); stale += 1; }
    console.log(stale ? `Board-motion assets: ${stale} stale` : `Board-motion assets: ${files.size} files current`);
    if (stale) process.exitCode = 1;
  } else {
    for (const path of extra) await rm(resolve(repoRoot, path));
    for (const [path, content] of files) {
      await mkdir(dirname(resolve(repoRoot, path)), { recursive: true });
      await writeFile(resolve(repoRoot, path), content);
    }
    console.log(`Board-motion assets: wrote ${files.size} files to ${OUT}${extra.length ? `, removed ${extra.length} the plan no longer makes` : ''}`);
  }
}
