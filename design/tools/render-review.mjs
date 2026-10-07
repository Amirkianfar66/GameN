// mothership:dev-only
//
// Renders the Designer's review images into design/review/ from the review pages:
//   node design/tools/render-review.mjs            every image
//   node design/tools/render-review.mjs layout     only images whose name contains "layout"
//   npm run render:review --workspace @mothership/design-tokens
//
// Needs a Chromium-based browser on this machine (CHROME_PATH overrides the search) and
// nothing else. It is not part of any check: an image is a picture of a page in desktop
// Chrome, not a device measurement.

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { reviewInputsSha256 } from './lib/inputs.mjs';
import { startStaticServer } from './lib/static-server.mjs';

const designRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const repoRoot = resolve(designRoot, '..');
const outDir = resolve(designRoot, 'review');
const only = process.argv.slice(2).filter(arg => !arg.startsWith('--'));

const callouts = JSON.parse(await readFile(resolve(designRoot, 'contract/layout-callouts.json'), 'utf8'));
const cues = JSON.parse(await readFile(resolve(designRoot, 'contract/motion-cues.json'), 'utf8'));
const studies = JSON.parse(await readFile(resolve(designRoot, 'contract/synthetic-studies.json'), 'utf8'));

// One image per job. scale 2 for narrow boards, 1 for wide ones.
const jobs = [
  ...Object.entries(callouts.boards).map(([board, spec]) => ({
    name: `layout-${board}`, path: `/prototypes/layouts.html?board=${board}`, scale: board.startsWith('table') || board === 'reconnect' || board === 'missing-assets' || board === 'player-wide' ? 1 : 2,
    // The browser's own default text size, as a person sets it. Not a zoom and not a page style.
    defaultFontPx: spec.defaultFontPx ?? null,
  })),
  { name: 'states-shot-card', path: '/prototypes/states.html?sheet=cards', scale: 1 },
  { name: 'states-token-markers', path: '/prototypes/states.html?sheet=tokens', scale: 1 },
  { name: 'states-role-cards', path: '/prototypes/states.html?sheet=roles', scale: 1 },
  { name: 'states-controls', path: '/prototypes/states.html?sheet=controls', scale: 1 },
  ...cues.cues.map(cue => ({ name: `storyboard-${cue.id}`, path: `/prototypes/storyboards.html?cue=${cue.id}`, scale: 1 })),
  { name: 'storyboards-without-art', path: '/prototypes/storyboards.html?art=none', scale: 1 },
  { name: 'asset-rooms', path: '/prototypes/assets.html?sheet=rooms', scale: 1 },
  { name: 'asset-crew', path: '/prototypes/assets.html?sheet=crew', scale: 1 },
  { name: 'asset-devices', path: '/prototypes/assets.html?sheet=devices', scale: 1 },
  { name: 'asset-kit', path: '/prototypes/assets.html?sheet=kit', scale: 1 },
  { name: 'asset-all', path: '/prototypes/assets.html?sheet=all', scale: 1 },
  // The synthetic studies: their own page, their own images, never in a bundle.
  ...studies.studies.map(study => ({ name: study.id, path: `/prototypes/studies.html?study=${study.id}`, scale: 1 })),
].map(job => ({ defaultFontPx: null, ...job })).filter(job => only.length === 0 || only.some(part => job.name.includes(part)));

await mkdir(outDir, { recursive: true });
const server = await startStaticServer();
const rendered = [];
let failed = false;
let version = 'unknown';
try {
  // One browser per default text size: that size is a browser setting, not a page style.
  for (const defaultFontPx of [...new Set(jobs.map(job => job.defaultFontPx))]) {
    const chrome = await launchBrowser({ defaultFontPx });
    version = chrome.version;
    try {
      const browser = await connect(chrome.endpoint);
      for (const job of jobs.filter(candidate => candidate.defaultFontPx === defaultFontPx)) {
        const page = await openPage(browser, { width: 2200, height: 1200, scale: job.scale });
        await page.goto(server.origin + job.path);
        const size = await page.screenshot(resolve(outDir, `${job.name}.png`), { selector: '#page' });
        const problems = page.problems();
        for (const problem of problems) console.error(`${job.name}: page problem: ${problem}`);
        if (problems.length > 0) failed = true;
        rendered.push({ file: `design/review/${job.name}.png`, page: `design${job.path}`, width: size.width, height: size.height, scale: job.scale, ...(defaultFontPx ? { browserDefaultFontPx: defaultFontPx } : {}) });
        console.log(`${job.name}.png ${size.width}x${size.height}`);
        await page.close();
      }
      browser.close();
    } finally {
      await chrome.close();
    }
  }
} finally {
  await server.close();
}
rendered.sort((a, b) => a.file.localeCompare(b.file));

if (only.length === 0) {
  // An image no job makes any more is a picture of something that no longer exists.
  for (const name of await readdir(outDir)) {
    if (name.endsWith('.png') && !rendered.some(image => image.file.endsWith(`/${name}`))) await rm(resolve(outDir, name));
  }
  const index = {
    note: 'Review renders of the pages under design/prototypes/. Each is a picture of a synthetic page in desktop Chrome on one machine. None is a device measurement, a match or an engine result.',
    renderedWith: version,
    command: 'node design/tools/render-review.mjs',
    // What the pages drew from. check-assets.mjs refuses these images once that has changed.
    inputsSha256: await reviewInputsSha256(repoRoot),
    images: rendered,
  };
  await writeFile(resolve(outDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
}
if (failed) process.exitCode = 1;
console.log(`${rendered.length} review images in design/review/ (${version})`);
