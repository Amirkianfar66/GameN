// mothership:dev-only
//
// The Game N wordmark as standalone vector files (issue #188: no approved wordmark existed, so the
// brand intro draws its own; design/cinematic/pilots/openings/wordmark.mjs), at its finished state:
//   node design/tools/cinematic-wordmark.mjs
// Writes design/cinematic/exports/brand-intro/runtime/wordmark.svg (the paper plate, "Game N" and the
// "by Plan B" tab: the brand intro's held frame) and wordmark-name.svg (the plate and the name alone:
// the boarding's closing mark). Identity-free and fixed: candidate runtime assets. Run
// cinematic-manifest.mjs after.

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fxDefs } from '../cinematic/lib/comic.mjs';
import { markSvg } from '../cinematic/pilots/openings/wordmark.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const out = resolve(repoRoot, 'design/cinematic/exports/brand-intro/runtime');
await mkdir(out, { recursive: true });
// The plate is 860 x 330 about its centre, turned 2 degrees, its shadow 14 x 16 down and right; the
// credit's tab hangs under its right half.
const files = {
  'wordmark.svg': { credit: 1, box: [-462, -200, 924, 460] },
  'wordmark-name.svg': { credit: 0, box: [-462, -200, 924, 400] },
};
for (const [name, { credit, box }] of Object.entries(files)) {
  const [x, y, w, h] = box;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${credit ? 'Game N, by Plan B' : 'Game N'}">`
    + `<title>${credit ? 'Game N, by Plan B' : 'Game N'}</title>${fxDefs('gn')}${markSvg('gn', { cx: 0, cy: 0, scale: 1, slam: 1, draw: 1, fill: 1, credit, sweep: 0 })}</svg>\n`;
  await writeFile(resolve(out, name), svg);
  console.log(`${name}: ${svg.length} bytes`);
}
