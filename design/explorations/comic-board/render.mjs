// mothership:dev-only
//
// Review pictures of the comic-board exploration, into review/. Run by hand, with a
// Chromium-based browser on the machine:
//   node design/explorations/comic-board/render.mjs
//
// These are pictures of an exploration in desktop Chrome. They are not the review images of
// the design (design/review/), no check reads them, and they measure nothing.

import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage } from '../../tools/lib/chrome.mjs';
import { startStaticServer } from '../../tools/lib/static-server.mjs';

const here = '/explorations/comic-board';
const out = fileURLToPath(new URL('./review/', import.meta.url));
const phone = { width: 390, height: 844, scale: 1.5, viewport: true };
const jobs = [
  { name: 'phone-choose-character', path: '/index.html?motion=reduced', ...phone },
  { name: 'phone-board', path: '/index.html?motion=reduced&skip', ...phone },
  { name: 'phone-role-card', path: '/index.html?motion=reduced&skip&peek=hacker&crew=6', ...phone },
  { name: 'shared-display', path: '/index.html?motion=reduced&surface=table', width: 1440, height: 900, scale: 1, viewport: true },
  { name: 'shared-display-other-colors', path: '/index.html?motion=reduced&surface=table&set=apart', width: 1440, height: 900, scale: 1, viewport: true },
  { name: 'crew', path: '/crew-sheet.html', width: 1220, height: 400, scale: 1, selector: '#page' },
  { name: 'role-devices', path: '/device-sheet.html', width: 1220, height: 400, scale: 1, selector: '#page' },
  { name: 'rooms', path: '/art-sheet.html?set=picture', width: 1220, height: 400, scale: 1, selector: '#page' },
  { name: 'storyboard-move', path: '/storyboard.html?kind=move', width: 1280, height: 500, scale: 1, selector: '#page' },
  { name: 'storyboard-role-card', path: '/storyboard.html?kind=card', width: 1100, height: 500, scale: 1, selector: '#page' },
];

await mkdir(out, { recursive: true });
const server = await startStaticServer();
const chrome = await launchBrowser();
let failed = false;
try {
  const browser = await connect(chrome.endpoint);
  for (const job of jobs) {
    const page = await openPage(browser, { width: job.width, height: job.height, scale: job.scale });
    await page.goto(server.origin + here + job.path);
    const size = await page.screenshot(resolve(out, `${job.name}.png`), { selector: job.selector ?? null, viewport: job.viewport ?? false });
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
