// mothership:dev-only
//
// Builds the board-motion proposal's derived art (issue #87): front-prop layers lifted out of
// the approved room sources, so that a character can stand behind the Command Room's chart
// table, behind the laboratory counter or lie in a Hospital bed. Nothing is drawn here: each
// layer is a run of elements copied from an approved editable source, printed in its room's
// colors by the same recolor map the reviewed export recipe uses, in the room's own
// 1024 x 768 box so that it stacks exactly over the room picture.
//
//   node design/tools/board-motion-assets.mjs           writes design/board-motion/assets/
//   node design/tools/board-motion-assets.mjs --check   exits 1 if what is on disk differs
//
// The reviewed manifest (design-0.2.0) and its bundles are not touched. These layers are a
// versioned proposal (board-motion-0.1.0) for a later export revision; adopting them is an
// Integration step (see docs/design/board-motion-handoff.md).

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const OUT = 'design/board-motion/assets';
const sha = content => createHash('sha256').update(content).digest('hex');

/**
 * Each layer: a run of the top-level elements of one group of an approved room source, from
 * the element that starts with `first` to the one that starts with `last`, inclusive.
 */
export const LAYERS = [
  {
    id: 'command-room.prop-table', room: 'command-room', group: 'command-room-props-back',
    first: '<ellipse cx="522" cy="600"', last: '<g clip-path="url(#clip-command-room-table)"',
    purpose: 'The round chart table, in front of the station behind it (the Command Room\'s first station).',
  },
  {
    id: 'room-b.prop-counter', room: 'room-b', group: 'room-b-props-back',
    first: '<polygon points="176,482 852,482 868,496 176,496"', last: '<path d="M708 326 V372 H756 V326" fill="none"',
    purpose: 'The laboratory counter with everything standing on it, in front of the station behind it (Room B\'s first station).',
  },
  {
    id: 'hospital.prop-bed', room: 'hospital', group: 'hospital-props-back',
    first: '<polygon points="160,392 306,392 300,498 118,498"', last: '<circle cx="284" cy="556"',
    purpose: 'The blanket, side and feet of the left bed, in front of the station lying in it (the Hospital\'s first station).',
  },
];

/** The top-level elements of a group, as [start, end) offsets into its inner markup. */
function topLevel(inner) {
  const items = [];
  const tag = /<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>/g;
  let depth = 0, start = null, match;
  while ((match = tag.exec(inner)) !== null) {
    const text = match[0];
    if (text.startsWith('<!--')) continue;
    const closing = text.startsWith('</');
    const selfClosing = text.endsWith('/>');
    if (depth === 0 && !closing) start = match.index;
    if (closing) depth -= 1; else if (!selfClosing) depth += 1;
    if (depth === 0 && start !== null) { items.push([start, match.index + text.length]); start = null; }
    if (depth < 0) throw new Error('Unbalanced group markup');
  }
  return items;
}

function groupInner(source, id) {
  const open = source.indexOf(`<g id="${id}"`);
  if (open < 0) throw new Error(`No group ${id}`);
  const startInner = source.indexOf('>', open) + 1;
  // The matching close: walk the tags from the group's own start.
  const tag = /<\/?g\b[^>]*>/g;
  tag.lastIndex = open;
  let depth = 0, match;
  while ((match = tag.exec(source)) !== null) {
    if (match[0].startsWith('</')) depth -= 1; else if (!match[0].endsWith('/>')) depth += 1;
    if (depth === 0) return source.slice(startInner, match.index);
  }
  throw new Error(`Group ${id} is not closed`);
}

const recolorOf = (markup, map) => Object.entries(map).reduce((text, [from, to]) => text.replace(new RegExp(from, 'gi'), to), markup);

export async function planAssets(root = repoRoot) {
  const recipes = JSON.parse(await readFile(resolve(root, 'design/source/export-recipes.json'), 'utf8'));
  const files = new Map();
  const entries = [];
  for (const layer of LAYERS) {
    const recipe = recipes.assets.find(asset => asset.id === `board-${layer.room}`);
    if (!recipe) throw new Error(`No export recipe for board-${layer.room}`);
    const sourcePath = `design/source/${recipe.source}`;
    const source = await readFile(resolve(root, sourcePath), 'utf8');
    const inner = groupInner(source, layer.group);
    const elements = topLevel(inner).map(([a, b]) => inner.slice(a, b));
    const from = elements.findIndex(element => element.startsWith(layer.first));
    const to = elements.findIndex(element => element.startsWith(layer.last));
    if (from < 0 || to < from) throw new Error(`${layer.id}: the selection does not match the source any more`);
    const picked = elements.slice(from, to + 1);
    const defs = source.match(/<defs>[\s\S]*?<\/defs>/)?.[0] ?? '';
    const body = recolorOf(`${defs}\n  <g id="${layer.id.replace('.', '-')}">\n    ${picked.join('\n    ')}\n  </g>`, recipe.common.recolor);
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  Mothership · board-motion proposal 0.1.0 · ${layer.id} · generated, do not edit
  ${layer.purpose}
  Lifted from ${sourcePath} (group ${layer.group}, ${picked.length} elements) by design/tools/board-motion-assets.mjs
  and printed in the room's colors by the recolor map of the reviewed export recipe board-${layer.room}.
  Nothing is drawn here that the approved source does not draw. Not in the reviewed manifest design-0.2.0.
-->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 768" width="1024" height="768">
  ${body}
</svg>
`;
    const file = `${OUT}/${layer.id}.svg`;
    files.set(file, svg);
    entries.push({
      id: layer.id, file, purpose: layer.purpose, source: sourcePath, sourceSha256: sha(source), group: layer.group,
      selection: { first: layer.first, last: layer.last, elements: picked.length }, recolor: `design/source/export-recipes.json#board-${layer.room}`,
      viewBox: '0 0 1024 768', bytes: Buffer.byteLength(svg), sha256: sha(svg), intendedBundle: 'public-board', audience: 'public',
      proposedExportVariant: `board-${layer.room}.layer-${layer.id.split('.')[1]}`,
    });
  }
  // One stylesheet holds every layer, as the reviewed bundles do: drawing one never fetches one.
  const css = `/* mothership:dev-only · board-motion proposal 0.1.0 · generated by design/tools/board-motion-assets.mjs, do not edit.
   Public art only. Loaded once, with the public-board bundle; every rule that draws it waits for [data-art~="board-motion"]. */
:root {
${[...files.entries()].map(([file, svg]) => `  --bm-asset-${file.split('/').pop().replace('.svg', '').replace('.', '-')}: url("data:image/svg+xml,${encodeURIComponent(svg.replace(/<!--[\s\S]*?-->\n?/, ''))}");`).join('\n')}
}
`;
  files.set(`${OUT}/board-motion.art.css`, css);
  const manifest = {
    devOnly: 'mothership:dev-only',
    manifestVersion: 'board-motion-0.1.0',
    status: 'proposal',
    baseManifest: 'design-0.2.0',
    note: 'Derived public layers for the board-motion prototype. The reviewed manifest and bundles are unchanged; these are proposed for a later export revision and are adopted only through Integration.',
    rights: {
      origin: 'Copied element for element from the repository\'s original vector sources under design/source/board/, recolored by the reviewed export recipes. No new drawing, no third-party artwork, font, photograph, traced image or generated raster image.',
      author: 'Visual and Motion Designer workstream, issue #87: a Claude Code session working for the game owner.',
      license: recipes.rights.license,
      reuse: recipes.rights.reuse,
    },
    stylesheet: { file: `${OUT}/board-motion.art.css`, sha256: sha(css), bytes: Buffer.byteLength(css), loadPolicy: 'Every device, with the public-board bundle, before the first match view. Contains public art only.' },
    assets: entries,
  };
  files.set(`${OUT}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  return files;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = await planAssets();
  if (process.argv.includes('--check')) {
    let stale = 0;
    for (const [path, content] of files) {
      const current = await readFile(resolve(repoRoot, path), 'utf8').catch(() => null);
      if (current !== content) { console.error(`stale: ${path}`); stale += 1; }
    }
    console.log(stale ? `Board-motion assets: ${stale} stale` : `Board-motion assets: ${files.size} files current`);
    if (stale) process.exitCode = 1;
  } else {
    await mkdir(resolve(repoRoot, OUT), { recursive: true });
    for (const [path, content] of files) await writeFile(resolve(repoRoot, path), content);
    console.log(`Board-motion assets: wrote ${files.size} files to ${OUT}`);
  }
}
