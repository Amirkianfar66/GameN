// Writes everything that is generated from the editable sources:
//   node design/tools/build-exports.mjs
//   npm run build:assets --workspace @mothership/design-tokens
//
//   design/exports/   the assets, their per-bundle stylesheets and asset-manifest.json
//   design/studies/   the two synthetic disclosure studies and study-manifest.json
//   design/prototypes/css/tokens.css and js/*-index.js, for the review pages
//
// Both output directories are replaced whole. Nothing here is edited by hand.

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planExports, planStudies, reviewPageIndex } from './lib/exports.mjs';
import { tokenPaletteModule, tokenStylesheet } from './lib/token-css.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const designRoot = resolve(repoRoot, 'design');

const assets = await planExports({ designRoot });
const studies = await planStudies({ designRoot });
await rm(resolve(designRoot, 'exports'), { recursive: true, force: true });
await rm(resolve(designRoot, 'studies'), { recursive: true, force: true });
const tokens = JSON.parse(await readFile(resolve(repoRoot, 'packages/design-tokens/src/tokens-0.3.0.json'), 'utf8'));
const generated = new Map([
  ...assets.files,
  ...studies.files,
  ['design/prototypes/css/tokens.css', tokenStylesheet(tokens)],
  ['design/prototypes/js/token-index.js', tokenPaletteModule(tokens)],
  ...reviewPageIndex(assets.manifest, studies.manifest),
]);
for (const [path, content] of generated) {
  const target = resolve(repoRoot, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
}

const { manifest } = assets;
const svgCount = [...assets.files.keys()].filter(path => path.endsWith('.svg')).length;
const bytes = [...assets.files.values()].reduce((total, content) => total + Buffer.byteLength(content), 0);
console.log(`Exports ${manifest.manifestVersion}: ${manifest.assets.length} assets, ${svgCount} SVG files, ${manifest.sprites.length} sprites, ${Object.keys(manifest.bundles).length} bundle stylesheets, ${bytes} bytes including the manifest`);
for (const [name, bundle] of Object.entries(manifest.bundles)) console.log(`  ${name}: ${bundle.files.length} files, ${bundle.bytes} bytes; stylesheet ${bundle.stylesheet.bytes} bytes`);
console.log(`Studies ${studies.manifest.manifestVersion}: ${studies.manifest.studies.length} synthetic studies in design/studies/, in no bundle`);
