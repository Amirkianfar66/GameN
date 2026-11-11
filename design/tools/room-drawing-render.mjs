// mothership:dev-only
//
// Renders the room drawing release's review files (DSN-REQ-18, docs/design/room-drawing-release.md)
// into design/room-drawing/review/:
//   night.png     each room's release pictures, lit and with the lights out, beside today's
//                 lights-out picture (design/room-drawing/review.html);
//   films.png     the films' pieces of the rooms, today and redrawn (review.html?view=films);
//   renders.json  what was rendered, with what, each file's SHA-256, and the trim's evidence: each
//                 export and its untrimmed picture drawn in desktop Chrome at twice their pixels
//                 (2048 x 1536), with how many pixels differ by 8 or more and by 32 or more (of 255,
//                 in any channel); and the Jail door's overlay at rest, drawn over the release's
//                 Jail, against the Jail alone, the same way.
//   node design/tools/room-drawing-render.mjs
// Needs a Chromium-based browser (CHROME_PATH). A review render is a picture of a page in desktop
// Chrome: it proves nothing about phones or performance.

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { DESIGN_ROOT, startStaticServer } from './lib/static-server.mjs';
import { build } from './room-drawing-export.mjs';
import { JAIL_DOOR, jailDoorSvg } from '../room-drawing/source/captain.mjs';

const ROOT = join(DESIGN_ROOT, '..');
const OUT = join(DESIGN_ROOT, 'room-drawing', 'review');
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const rel = file => relative(ROOT, file);

/**
 * In the page: two pictures drawn at twice their pixels, and how many pixels differ. Each is an SVG,
 * or [svg, overlay, box]: an overlay drawn over the picture in its box (scene units).
 */
const COMPARE = `async (a, b, w = 1024, h = 768) => {
  const image = async svg => { const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); const im = new Image(); im.src = url; await im.decode(); URL.revokeObjectURL(url); return im; };
  const draw = async picture => {
    const [svg, overlay, box] = Array.isArray(picture) ? picture : [picture];
    const canvas = new OffscreenCanvas(w * 2, h * 2), context = canvas.getContext('2d');
    context.drawImage(await image(svg), 0, 0, w * 2, h * 2);
    if (overlay) context.drawImage(await image(overlay), box[0] * 2, box[1] * 2, box[2] * 2, box[3] * 2);
    return context.getImageData(0, 0, w * 2, h * 2).data;
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
let doorAtRest = null;
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
    const result = await page.evaluate(`(${COMPARE})(${JSON.stringify(item.drawn)}, ${JSON.stringify(item.content)}, ${item.entry.width}, ${item.entry.height})`);
    trim[item.path] = { ...result, over8Share: Number((result.over8 / result.pixels).toFixed(5)), over32Share: Number((result.over32 / result.pixels).toFixed(5)) };
  }
  // The Jail door at rest over the release's Jail, against the Jail alone.
  const jail = exports.find(item => item.entry.room === 'jail' && item.entry.layer === 'back').content;
  const rest = await page.evaluate(`(${COMPARE})(${JSON.stringify(jail)}, ${JSON.stringify([jail, jailDoorSvg({ prefix: 'rest' }), JAIL_DOOR.box])})`);
  doorAtRest = { ...rest, over8Share: Number((rest.over8 / rest.pixels).toFixed(5)), over32Share: Number((rest.over32 / rest.pixels).toFixed(5)) };
  await page.close();
  const films = await openPage(browser, { width: 1640, height: 400, scale: 1 });
  await films.goto(`${server.origin}/room-drawing/review.html?view=films`);
  await films.fitHeight();
  const filmsFile = join(OUT, 'films.png');
  const filmsSize = await films.screenshot(filmsFile);
  const filmProblems = films.problems();
  if (filmProblems.length) throw new Error(filmProblems.join('; '));
  await films.close();
  const filmBytes = await readFile(filmsFile);
  outputs[rel(filmsFile)] = { kind: 'image', page: 'design/room-drawing/review.html?view=films', ...filmsSize, bytes: filmBytes.length, sha256: sha256(filmBytes) };
} finally {
  await chrome.close?.();
  await server.close();
}
const worst = Math.max(...Object.values(trim).map(entry => entry.over32Share));
const record = {
  tool: 'design/tools/room-drawing-render.mjs', browser: browserName, outputs,
  trim: { scale: 2, worstOver32Share: worst, exports: trim },
  doorAtRest: { what: 'design/room-drawing/source/captain.mjs jailDoorSvg() at rest, over the release\'s Jail in JAIL_DOOR.box, against the Jail alone, at twice its pixels', ...doorAtRest },
};
await writeFile(join(OUT, 'renders.json'), `${JSON.stringify(record, null, 2)}\n`);
console.log(`design/room-drawing/review/night.png and films.png; trim compared for ${exports.length} exports, at most ${(worst * 100).toFixed(2)}% of pixels differing by 32 or more; the door at rest differs from the room in ${(doorAtRest.over32Share * 100).toFixed(3)}%`);
