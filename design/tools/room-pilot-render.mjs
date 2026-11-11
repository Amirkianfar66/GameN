// mothership:dev-only
//
// Writes the room pilot's pictures and review files (design/room-pilot/, docs/design/room-pilot.md):
//   node design/tools/room-pilot-render.mjs [--pictures]
// into design/room-pilot/review/:
//   <room>.back.svg, <room>.<layer>.svg   each room redrawn (design/room-pilot/rooms.mjs): its back
//                                         picture and each layer drawn in front of its places;
//   compare-<room>.png                    the room today and redrawn, the crew in its places;
//   board.png                             the five redrawn rooms together;
//   renders.json                          what was written, with what, and each file's SHA-256.
// --pictures writes the pictures and the record only. The images need a Chromium-based browser
// (CHROME_PATH). A review render is a picture of a page in desktop Chrome: it proves nothing about
// phones or performance. Nothing here is a release or an export.

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { DESIGN_ROOT, startStaticServer } from './lib/static-server.mjs';
import { ROOMS, redrawRoom } from '../room-pilot/rooms.mjs';

const ROOT = join(DESIGN_ROOT, '..');
const OUT = join(DESIGN_ROOT, 'room-pilot', 'review');
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const rel = file => relative(ROOT, file);
const picturesOnly = process.argv.includes('--pictures');

async function render(browser, origin, query, name, { width, height, scale, selector = null }) {
  const page = await openPage(browser, { width, height, scale });
  await page.goto(`${origin}/room-pilot/review.html?${query}`);
  if (!selector) await page.fitHeight();
  const file = join(OUT, name);
  const size = await page.screenshot(file, { selector });
  const problems = page.problems();
  await page.close();
  if (problems.length) throw new Error(`${query}: ${problems.join('; ')}`);
  return { kind: 'image', view: query, file, ...size };
}

await mkdir(OUT, { recursive: true });
const recordFile = join(OUT, 'renders.json');
let previous = { outputs: {} };
try { previous = JSON.parse(await readFile(recordFile, 'utf8')); } catch { /* the first render */ }
const outputs = [];
for (const r of ROOMS) {
  const art = redrawRoom(r, path => readFileSync(join(ROOT, path), 'utf8'), { file: true });
  await writeFile(join(ROOT, r.redrawn.back), art.back);
  outputs.push({ kind: 'picture', room: r.id, file: join(ROOT, r.redrawn.back), width: 1024, height: 768 });
  for (const [layer, svg] of Object.entries(art.layers)) {
    await writeFile(join(ROOT, r.redrawn.layers[layer]), svg);
    outputs.push({ kind: 'picture', room: r.id, layer, file: join(ROOT, r.redrawn.layers[layer]), width: 1024, height: 768 });
  }
}
let browserName = previous.browser ?? '';
if (!picturesOnly) {
  const server = await startStaticServer();
  const chrome = await launchBrowser();
  try {
    const browser = await connect(chrome.endpoint);
    browserName = (await browser.send('Browser.getVersion')).product;
    for (const r of ROOMS) outputs.push(await render(browser, server.origin, `view=compare&room=${r.id}`, `compare-${r.id}.png`, { width: 1640, height: 400, scale: 1 }));
    outputs.push(await render(browser, server.origin, 'view=board', 'board.png', { width: 1660, height: 400, scale: 1 }));
  } finally {
    await chrome.close?.();
    await server.close();
  }
}
const record = { tool: 'design/tools/room-pilot-render.mjs', page: 'design/room-pilot/review.html', drawing: ['design/room-pilot/rooms.mjs', 'design/room-pilot/ink-room.mjs', 'design/room-pilot/room-a.mjs'], browser: browserName, outputs: picturesOnly ? { ...previous.outputs } : {} };
for (const output of outputs) {
  const bytes = await readFile(output.file);
  record.outputs[rel(output.file)] = { ...output, file: undefined, bytes: bytes.length, sha256: sha256(bytes) };
}
record.outputs = Object.fromEntries(Object.entries(record.outputs).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(recordFile, `${JSON.stringify(record, null, 2)}\n`);
for (const output of outputs) console.log(`${rel(output.file)}: ${output.kind} ${output.width} x ${output.height}`);
