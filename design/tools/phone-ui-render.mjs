// mothership:dev-only
//
// Renders the phone UI pack's review sheets (design/phone-ui/review/): every sheet in
// design/phone-ui/sheets/catalog.mjs is drawn on its sheet page in a headless Chromium-based
// browser, each phone frame being the prototype at that frame's exact viewport; then the numbered
// contact sheet. While drawing, it measures each frame (horizontal overflow, controls under 44 px,
// text under 11 px, text cut off for good, text contrast letter by letter over the rooms' ambient
// motion, page errors) and writes design/phone-ui/review/checks.json.
//
//   node design/tools/phone-ui-render.mjs                 every sheet and the contact sheet
//   node design/tools/phone-ui-render.mjs --only 07,12    some sheets (by number)
//   node design/tools/phone-ui-render.mjs --shot '<query>' --size 390x844 [--out file.png]
//
// Needs a Chromium-based browser (CHROME_PATH). A review image is a picture of desktop Chrome:
// it proves nothing about a phone's browser, safe areas, frame rate, screen reader or touch.

import { createServer } from 'node:http';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const OUT = join(REPO, 'design/phone-ui/review');
const ROOTS = ['design/', 'apps/game/hosted/', 'apps/game/candidates/planet-library/', 'docs/frontend/evidence/planet-approved-art-shell/', 'docs/frontend/evidence/pregame-runtime-2026-11-08/hosted/'];
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

/** A loopback, read-only, GET-only server for design/ and the runtime ports the pack imports. */
export async function startServer() {
  const server = createServer(async (request, response) => {
    const send = (status, body, type = 'text/plain; charset=utf-8') => { response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' }); response.end(body); };
    if (request.method !== 'GET' && request.method !== 'HEAD') return send(405, 'Method not allowed');
    let path;
    try { path = decodeURIComponent(new URL(request.url, 'http://x').pathname).replace(/^\/+/, ''); } catch { return send(400, 'Bad request'); }
    if (!ROOTS.some(root => path.startsWith(root)) || path.includes('..')) return send(404, 'Not found');
    const file = resolve(REPO, path);
    if (!file.startsWith(REPO + sep)) return send(404, 'Not found');
    try {
      if (!(await stat(file)).isFile()) return send(404, 'Not found');
      send(200, await readFile(file), TYPES[extname(file)] ?? 'application/octet-stream');
    } catch { send(404, 'Not found'); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(done => server.close(done)) };
}

/** A sheet page's width: its frames side by side, or a fixed width for a diagram. */
export function sheetWidth(sheet) {
  const fixed = { flow: 1640, phases: 1900, matrix: 2140, foundations: 1840, icons: 1840, controls: 1960, art: 1960, compare: 1800 };
  if (fixed[sheet.kind]) return fixed[sheet.kind];
  const frames = sheet.frames ?? [];
  const widths = frames.map(f => Number((f.size ?? '390x844').split('x')[0]) + 18);
  return Math.max(1240, 112 + widths.reduce((a, b) => a + b, 0) + 34 * Math.max(0, frames.length - 1));
}

/** A JPEG of the whole page (quality 84): review sheets are pictures, kept small for the repository. */
async function jpeg(page, file) {
  const { cssContentSize } = await page.send('Page.getLayoutMetrics');
  const clip = { x: 0, y: 0, width: Math.ceil(cssContentSize.width), height: Math.ceil(cssContentSize.height), scale: 1 };
  const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 84, captureBeyondViewport: true, clip });
  await writeFile(file, Buffer.from(data, 'base64'));
  return { width: clip.width, height: clip.height };
}

/** The moments of the 240-second voyage at which the rooms' ambient motion is held for the contrast check: every 15 s. */
export const CONTRAST_MOMENTS = Object.freeze(Array.from({ length: 16 }, (_, k) => k * 15));

/** A lossless capture of the whole page at 1 px per CSS px. */
async function png(page) {
  const { cssContentSize } = await page.send('Page.getLayoutMetrics');
  const clip = { x: 0, y: 0, width: Math.ceil(cssContentSize.width), height: Math.ceil(cssContentSize.height), scale: 1 };
  const { data } = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, optimizeForSpeed: true, clip });
  return data;
}

/**
 * Each frame's text contrast, letter by letter, against what is drawn behind it (sheet.mjs, "Text
 * contrast"): the letters, four captures (as drawn, text black, text white, text transparent) for each
 * letter's ink and background, then the transparent-text capture again with the rooms' ambient motion
 * held at each of CONTRAST_MOMENTS. Also counts text cut off for good. Run after the sheet's picture: it
 * changes the page.
 */
async function measureContrast(page) {
  const letters = await page.evaluate('window.__sheetLetters ? window.__sheetLetters() : 0');
  if (!letters) return [];
  await page.evaluate('window.__sheetFreeze()');
  const frame = 'new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))';
  for (const mode of ['drawn', 'black', 'white', 'hidden']) {
    await page.evaluate(`window.__sheetTextFill(${JSON.stringify(mode)})`);
    await page.evaluate(frame);
    await page.evaluate(`window.__sheetDecode(${JSON.stringify(mode)}, ${JSON.stringify(await png(page))})`);
  }
  await page.evaluate('window.__sheetLetterInk()');
  let moments = 0;
  if (await page.evaluate('window.__sheetHasAmbient()')) {
    for (const t of CONTRAST_MOMENTS) {
      await page.evaluate(`window.__sheetAmbientAt(${t})`);
      await page.evaluate(`window.__sheetLetterContrast(${JSON.stringify(await png(page))}, ${JSON.stringify(`${t} s`)})`);
      moments += 1;
    }
  }
  const results = await page.evaluate('window.__sheetLetterResults()');
  await page.evaluate('window.__sheetTextFill(null)');
  return results.map(r => ({ ...r, moments }));
}

const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1]; };

async function main() {
  const server = await startServer();
  const chrome = await launchBrowser();
  const browser = await connect(chrome.endpoint);
  try {
    if (flag('--shot') !== null) {
      const [w, hgt] = (flag('--size') ?? '390x844').split('x').map(Number);
      const page = await openPage(browser, { width: w, height: hgt, scale: Number(flag('--scale') ?? 1) });
      await page.goto(`${server.origin}/design/phone-ui/prototype/index.html?${flag('--shot')}`, 'window.__phoneReady === true');
      await page.evaluate('new Promise(done => setTimeout(done, Number(' + JSON.stringify(flag('--wait') ?? '600') + ')))');
      const out = flag('--out') ?? join(REPO, '..', 'phone-shot.png');
      await page.screenshot(out, { viewport: true });
      const problems = page.problems();
      console.log(out, problems.length ? `problems: ${problems.join(' | ')}` : 'no page problems');
      return;
    }
    const { SHEETS } = await import('../phone-ui/sheets/catalog.mjs');
    const only = flag('--only')?.split(',').map(s => s.trim());
    const chosen = SHEETS.filter(sheet => !only || only.includes(sheet.id));
    await mkdir(join(OUT, 'sheets'), { recursive: true });
    const checks = [];
    for (const sheet of chosen) {
      const page = await openPage(browser, { width: sheetWidth(sheet), height: 900, scale: 1 });
      await page.goto(`${server.origin}/design/phone-ui/sheets/sheet.html?id=${encodeURIComponent(sheet.id)}`, 'window.__sheetReady === true');
      await page.evaluate('new Promise(done => setTimeout(done, 1200))');
      const frames = await page.evaluate('window.__sheetChecks ? window.__sheetChecks() : []');
      await page.fitHeight();
      const file = join(OUT, 'sheets', `${sheet.id}-${sheet.slug}.jpg`);
      const size = await jpeg(page, file);
      const contrast = await measureContrast(page);
      frames.forEach((f, i) => {
        const { clipped = null, clippedText = [], ...c } = contrast[i] ?? { error: 'not measured' };
        Object.assign(f, { clipped, clippedText, contrast: c });
      });
      const bytes = await readFile(file);
      checks.push({ id: sheet.id, slug: sheet.slug, title: sheet.title, file: `design/phone-ui/review/sheets/${sheet.id}-${sheet.slug}.jpg`, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, size, frames, problems: page.problems().filter(p => !/favicon/.test(p)) });
      console.log(`${sheet.id} ${sheet.slug}: ${frames.length} frames${page.problems().length ? `, problems: ${page.problems().join(' | ')}` : ''}`);
      await page.close();
    }
    if (!only) {
      const page = await openPage(browser, { width: 1800, height: 900, scale: 1 });
      await page.goto(`${server.origin}/design/phone-ui/sheets/contact.html`, 'window.__sheetReady === true');
      await page.evaluate('new Promise(done => setTimeout(done, 400))');
      await page.fitHeight();
      await jpeg(page, join(OUT, 'contact-sheet.jpg'));
      await page.close();
    }
    const record = { generatedBy: 'design/tools/phone-ui-render.mjs', browser: chrome.version, note: 'Desktop headless Chromium. Measurements are of this browser at each frame’s CSS size, not of a phone.',
      contrast: { method: 'letter by letter: each letter’s ink from black- and white-text captures; its background from a transparent-text capture as drawn and with the rooms’ ambient motion held at each moment; the lowest WCAG 2 ratio at every ink pixel and the pixels touching it', moments: CONTRAST_MOMENTS, thresholds: { text: 4.5, large: 3 } }, sheets: checks };
    const previous = only ? JSON.parse(await readFile(join(OUT, 'checks.json'), 'utf8').catch(() => '{"sheets":[]}')) : { sheets: [] };
    const merged = only ? { ...record, sheets: [...previous.sheets.filter(s => !only.includes(s.id)), ...checks].sort((a, b) => a.id.localeCompare(b.id)) } : record;
    await writeFile(join(OUT, 'checks.json'), `${JSON.stringify(merged, null, 2)}\n`);
  } finally {
    browser.close();
    await chrome.close();
    await server.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
