// mothership:dev-only
//
// Builds the ability-art proposal's assets (design/abilities/): each asset is one layer of an
// editable source under design/abilities/source/, lifted alone into its own box with the
// patterns it uses, exactly as design/abilities/recipes.json says. Writes:
// - design/abilities/assets/<id>.svg, one file per asset, for editing tools and review;
// - design/abilities/assets/abilities.art.css, one stylesheet holding every asset as a custom
//   property (--ab-asset-<id>), which a player phone loads once, whole, with its other bundles,
//   whatever the seat's role, state or turn;
// - design/abilities/assets/manifest.json: ids, versions, boxes, anchors, sizes, hashes, colors.
//
//   node design/tools/abilities-assets.mjs           writes design/abilities/assets/
//   node design/tools/abilities-assets.mjs --check   exits 1 if what is on disk differs
//
// The reviewed manifest (design-0.2.0) and its bundles are not touched. This art is a
// versioned proposal (abilities-0.1.0) for a later export revision, adopted only through
// Integration (docs/design/abilities-handoff.md).

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { colors, findById, parseSvg, problemsIn, references, serialize } from './lib/svg.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const ROOT = 'design/abilities';
const OUT = `${ROOT}/assets`;
const sha = content => createHash('sha256').update(content).digest('hex');
/** An SVG as the body of a data URI: no header or comment, single quotes, only what a URL cannot carry escaped. */
const dataUri = svg => svg.replace(/<\?xml[^>]*>\n/, '').replace(/<!--[\s\S]*?-->\n?/, '').replace(/\s*\n\s*/g, ' ').replace(/"/g, "'")
  .replace(/%/g, '%25').replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E').trim();

/** Everything the recipes make, as path -> content, and the problems that stop a build. */
export async function planAbilityAssets(root = repoRoot) {
  const recipes = JSON.parse(await readFile(resolve(root, ROOT, 'recipes.json'), 'utf8'));
  const files = new Map();
  const problems = [];
  const sources = new Map();
  const entries = [];
  const variables = [];
  for (const recipe of recipes.assets) {
    if (!sources.has(recipe.source)) {
      const text = await readFile(resolve(root, ROOT, recipe.source), 'utf8');
      sources.set(recipe.source, { text, tree: parseSvg(text, recipe.source) });
    }
    const { tree } = sources.get(recipe.source);
    const found = findById(tree, recipe.layer);
    if (!found) { problems.push(`${recipe.id}: no layer ${recipe.layer} in ${recipe.source}`); continue; }
    // A layer carries its own paint: nothing above it on the sheet may give it fill, stroke, opacity or a clip.
    for (const ancestor of found.ancestors) {
      for (const [name] of ancestor.attrs) if (['fill', 'stroke', 'opacity', 'clip-path'].includes(name)) problems.push(`${recipe.id}: the layer would inherit ${name} from a wrapper`);
    }
    const layer = found.node;
    const defs = [...references(layer)].map(id => findById(tree, id)?.node).filter(Boolean);
    const missing = [...references(layer)].filter(id => !findById(tree, id));
    for (const id of missing) problems.push(`${recipe.id}: refers to #${id}, which is not in ${recipe.source}`);
    const [, , width, height] = recipe.viewBox.split(/\s+/).map(Number);
    const body = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${recipe.viewBox}" width="${width}" height="${height}">${defs.length ? `<defs>${defs.map(serialize).join('')}</defs>` : ''}${serialize(layer)}</svg>`;
    const exported = parseSvg(body, `${recipe.id}.svg`);
    for (const problem of problemsIn(exported)) problems.push(`${recipe.id}: ${problem}`);
    const palette = recipes.palettes[recipe.palette]?.colors ?? [];
    for (const color of colors(exported)) if (!palette.includes(color)) problems.push(`${recipe.id}: ${color} is not in the ${recipe.palette} palette`);
    const content = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  Mothership · ability art proposal ${recipes.manifestVersion} · ${recipe.id} ${recipe.version} · generated, do not edit by hand
  ${recipe.title}. ${recipe.use}
  Built by design/tools/abilities-assets.mjs from design/abilities/${recipe.source} (layer ${recipe.layer}). Not in the reviewed manifest ${recipes.baseManifest}.
-->
${body}
`;
    const file = `${OUT}/${recipe.id}.svg`;
    files.set(file, content);
    variables.push(`  --ab-asset-${recipe.id}: url("data:image/svg+xml,${dataUri(body)}");`);
    entries.push({
      id: recipe.id, version: recipe.version, status: recipe.status, title: recipe.title, file,
      source: `${ROOT}/${recipe.source}#${recipe.layer}`, viewBox: recipe.viewBox, width, height, anchors: recipe.anchors,
      palette: recipe.palette, colors: [...colors(exported)].sort(), bytes: Buffer.byteLength(content), sha256: sha(content), use: recipe.use,
      cssProperty: `--ab-asset-${recipe.id}`,
    });
  }
  const css = `/* mothership:dev-only · ability art proposal ${recipes.manifestVersion} · generated by design/tools/abilities-assets.mjs, do not edit.
   PRIVATE art: drawn only inside a seat's own open private sheet. ${recipes.bundle.loadPolicy}
   Every picture is a custom property; a page draws one only behind [data-art~="abilities"], set once this file has loaded. */
:root {
${variables.join('\n')}
}
`;
  files.set(`${OUT}/abilities.art.css`, css);
  const manifest = {
    devOnly: recipes.devOnly,
    manifestVersion: recipes.manifestVersion,
    status: recipes.status,
    note: 'Private art for the ability treatments of the board-motion prototype: the kit of a seat\'s own file (the Insider\'s investigation board first). Every piece is neutral: drawn once and used alike for every candidate, coloured for no role, team or character. A proposal outside the reviewed manifest, adopted only through Integration.',
    baseManifest: recipes.baseManifest,
    tokens: recipes.tokens,
    bundle: recipes.bundle,
    stylesheet: { file: `${OUT}/abilities.art.css`, sha256: sha(css), bytes: Buffer.byteLength(css) },
    rights: recipes.rights,
    assets: entries,
  };
  files.set(`${OUT}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  return { files, problems, manifest };
}

const run = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (run) {
  const check = process.argv.includes('--check');
  const { files, problems } = await planAbilityAssets();
  if (problems.length) {
    for (const problem of problems) console.error(`problem: ${problem}`);
    process.exit(1);
  }
  if (check) {
    const stale = [];
    for (const [path, content] of files) {
      const onDisk = await readFile(resolve(repoRoot, path), 'utf8').catch(() => null);
      if (onDisk !== content) stale.push(path);
    }
    const present = (await readdir(resolve(repoRoot, OUT)).catch(() => [])).map(name => `${OUT}/${name}`);
    for (const path of present) if (!files.has(path)) stale.push(`${path} (not made by the recipes)`);
    if (stale.length) { for (const path of stale) console.error(`out of date: ${path}`); process.exit(1); }
    console.log(`Ability assets are current: ${files.size} files.`);
  } else {
    await rm(resolve(repoRoot, OUT), { recursive: true, force: true });
    for (const [path, content] of files) {
      await mkdir(dirname(resolve(repoRoot, path)), { recursive: true });
      await writeFile(resolve(repoRoot, path), content);
    }
    console.log(`Wrote ${files.size} files to ${OUT}/.`);
  }
}
