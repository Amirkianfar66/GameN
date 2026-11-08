// mothership:dev-only
//
// Renders the room drawing release's review files (DSN-REQ-18, docs/design/room-drawing-release.md)
// into design/room-drawing/review/:
//   night.png     each room's release pictures, lit and with the lights out, beside today's
//                 lights-out picture (design/room-drawing/review.html);
//   renders.json  what was rendered, with what, each file's SHA-256, and the trim's evidence: each
//                 export and its untrimmed picture drawn in desktop Chrome at twice their pixels
//                 (2048 x 1536), with how many pixels differ by 8 or more and by 32 or more (of 255,
//                 in any channel).
//   node design/tools/room-drawing-render.mjs
// Needs a Chromium-based browser (CHROME_PATH). A review render is a picture of a page in desktop
// Chrome: it proves nothing about phones or performance.

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { DESIGN_ROOT, startStaticServer } from './lib/static-server.mjs';
import { build } from './room-drawing-export.mjs';

const ROOT = join(DESIGN_ROOT, '..');
const OUT = join(DESIGN_ROOT, 'room-drawing', 'review');
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const rel = file => relative(ROOT, file);

/** In the page: two SVG pictures drawn at twice their pixels, and how many pixels differ. */
const COMPARE = `async (a, b) => {
  const draw = async svg => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const image = new Image(); image.src = url; await image.decode();
    const canvas = new OffscreenCanvas(2048, 1536), context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, 2048, 1536); URL.revokeObjectURL(url);
    return context.getImageData(0, 0, 2048, 1536).data;
  };
  const [x, y] = [await draw(a), await draw(b)];
  let over8 = 0, over32 = 0;
  for (let i = 0; i < x.length; i += 4) {
    const d = Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]), Math.abs(x[i + 2] - y[i + 2]), Math.abs(x[i + 3] - y[i + 3]));
    if (d >= 8) over8 += 1; if (d >= 32) over32 += 1;
  }
  return { pixels: x.length / 4, over8, over32 };
}`;

await mkdir(OUT, { recursive: true });
const exports = build();
const server = await startStaticServer();
const chrome = await launchBrowser();
const outputs = {};
const trim = {};
let browserName = '';
try {
  const browser = await connect(chrome.endpoint);
  browserName = (await browser.send('Browser.getVersion')).product;
  const page = await openPage(browser, { width: 1640, height: 400, scale: 1 });
  await page.goto(`${server.origin}/room-drawing/review.html`);
  await page.fitHeight();
  const file = join(OUT, 'night.png');
  const size = await page.screenshot(file);
  const problems = page.problems();
  if (problems.length) throw new Error(problems.join('; '));
  const bytes = await readFile(file);
  outputs[rel(file)] = { kind: 'image', page: 'design/room-drawing/review.html', ...size, bytes: bytes.length, sha256: sha256(bytes) };
  for (const item of exports) {
    const result = await page.evaluate(`(${COMPARE})(${JSON.stringify(item.drawn)}, ${JSON.stringify(item.content)})`);
    trim[item.path] = { ...result, over8Share: Number((result.over8 / result.pixels).toFixed(5)), over32Share: Number((result.over32 / result.pixels).toFixed(5)) };
  }
  await page.close();
} finally {
  await chrome.close?.();
  await server.close();
}
const worst = Math.max(...Object.values(trim).map(entry => entry.over32Share));
const record = {
  tool: 'design/tools/room-drawing-render.mjs', browser: browserName, outputs,
  trim: { scale: 2, size: [2048, 1536], worstOver32Share: worst, exports: trim },
};
await writeFile(join(OUT, 'renders.json'), `${JSON.stringify(record, null, 2)}\n`);
console.log(`design/room-drawing/review/night.png; trim compared for ${exports.length} exports, at most ${(worst * 100).toFixed(2)}% of pixels differing by 32 or more`);
