// mothership:dev-only
//
// Review pictures of the painted room test, into review/. Run by hand, with a Chromium-based
// browser on the machine:
//   node design/explorations/painted-room/render.mjs
//
// These are pictures of an exploration in desktop Chrome. They are not the review images of
// the design (design/review/), no check reads them, and they measure nothing.

import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage } from '../../tools/lib/chrome.mjs';
import { startStaticServer } from '../../tools/lib/static-server.mjs';

const here = '/explorations/painted-room';
const out = fileURLToPath(new URL('./review/', import.meta.url));
const jobs = [
  // The two looks side by side, with the page's own note of what each is.
  { name: 'room-b-compare', path: '/index.html', width: 1640, height: 800, scale: 1, selector: '#page' },
  // The painted room alone, at the scene's own size.
  { name: 'room-b-painted', path: '/index.html?view=painted&scale=1', width: 1100, height: 900, scale: 1, selector: '.pr-frame' },
  // The three places on the deck and the tank, closer.
  { name: 'room-b-detail', path: '/index.html?crop=300,300,620,420&scale=1', width: 1340, height: 700, scale: 1, selector: '.pr-row' },
  // Both looks in a phone panel's framing of Room B (180 x 330 CSS pixels), at a phone's pixel density.
  { name: 'room-b-phone-panels', path: '/index.html?panel=180x330&scale=1', width: 520, height: 600, scale: 2, selector: '.pr-row' },
];

await mkdir(out, { recursive: true });
const server = await startStaticServer();
const chrome = await launchBrowser();
let failed = false;
try {
  const browser = await connect(chrome.endpoint);
  for (const job of jobs) {
    const page = await openPage(browser, { width: job.width, height: job.height, scale: job.scale });
    await page.goto(server.origin + here + job.path, 'document.readyState === "complete" && window.__designReady === true');
    const size = await page.screenshot(resolve(out, `${job.name}.png`), { selector: job.selector, margin: job.selector === '.pr-frame' ? 0 : 12 });
    for (const problem of page.problems()) { console.error(`${job.name}: page problem: ${problem}`); failed = true; }
    console.log(`${job.name}.png ${size.width}x${size.height}`);
    await page.close();
  }
  browser.close();
} finally {
  await chrome.close();
  await server.close();
}
if (failed) process.exitCode = 1;
