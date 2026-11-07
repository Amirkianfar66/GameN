// mothership:dev-only
//
// Renders the room pilot's review files (design/room-pilot/review.html) for the owner:
//   node design/tools/room-pilot-render.mjs
// into design/room-pilot/review/:
//   compare.png   Room A today and redrawn, the crew in its five places; the focus of each (the
//                 part every panel shows whole); the redrawn room empty;
//   room-a.png    the redrawn room with the crew, 1024 x 768 at twice the pixels;
//   room-a.svg    the redrawn room's picture itself (room-a.mjs), to look at closely in a browser;
//   renders.json  what was rendered, with what, and each file's SHA-256.
// Needs a Chromium-based browser (CHROME_PATH). A review render is a picture of a page in desktop
// Chrome: it proves nothing about phones or performance. Nothing here is a release or an export.

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { DESIGN_ROOT, startStaticServer } from './lib/static-server.mjs';
import { roomAPilotFile } from '../room-pilot/room-a.mjs';

const OUT = join(DESIGN_ROOT, 'room-pilot', 'review');
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const rel = file => relative(join(DESIGN_ROOT, '..'), file);

async function render(browser, origin, view, name, { width, height, scale, selector = null }) {
  const page = await openPage(browser, { width, height, scale });
  await page.goto(`${origin}/room-pilot/review.html?view=${view}`);
  if (!selector) await page.fitHeight();
  const file = join(OUT, name);
  const size = await page.screenshot(file, { selector });
  const problems = page.problems();
  await page.close();
  if (problems.length) throw new Error(`${view}: ${problems.join('; ')}`);
  return { kind: 'image', view, file, ...size };
}

await mkdir(OUT, { recursive: true });
const svgFile = join(OUT, 'room-a.svg');
await writeFile(svgFile, roomAPilotFile());
const outputs = [{ kind: 'picture', file: svgFile, width: 1024, height: 768 }];
const server = await startStaticServer();
const chrome = await launchBrowser();
let browserName = '';
try {
  const browser = await connect(chrome.endpoint);
  browserName = (await browser.send('Browser.getVersion')).product;
  outputs.push(await render(browser, server.origin, 'compare', 'compare.png', { width: 1640, height: 900, scale: 1.25 }));
  outputs.push(await render(browser, server.origin, 'room', 'room-a.png', { width: 1024, height: 768, scale: 2, selector: '.frame' }));
} finally {
  await chrome.close?.();
  await server.close();
}
const record = { tool: 'design/tools/room-pilot-render.mjs', page: 'design/room-pilot/review.html', drawing: 'design/room-pilot/room-a.mjs', browser: browserName, outputs: {} };
for (const output of outputs) {
  const bytes = await readFile(output.file);
  record.outputs[rel(output.file)] = { ...output, file: undefined, bytes: bytes.length, sha256: sha256(bytes) };
}
record.outputs = Object.fromEntries(Object.entries(record.outputs).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(join(OUT, 'renders.json'), `${JSON.stringify(record, null, 2)}\n`);
for (const output of outputs) console.log(`${rel(output.file)}: ${output.kind} ${output.width} x ${output.height}`);
