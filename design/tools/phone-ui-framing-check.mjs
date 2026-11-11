// mothership:dev-only
//
// Checks the phone room view's framing the way Frontend checks it (#222): opens
// design/phone-ui/prototype/framing-check.html, where every room is painted full (7, 8 and 9
// players, the nine characters turned through its places, standing and Eliminated in place; and
// Frontend's own failing case) on Frontend's native panel and the pack's phones, and each figure's
// painted pixels, both layers, are counted inside the panel: as drawn, and at every corner of the
// crew's own motion. Writes design/phone-ui/review/framing-check.jpg and
// framing-check.json, and exits 1 if any figure shows less than all of its painted pixels.
//   node design/tools/phone-ui-framing-check.mjs              every case, written to design/phone-ui/review
//   node design/tools/phone-ui-framing-check.mjs --turns 1 --out <dir>   the first turn only, elsewhere
// Needs a Chromium-based browser (CHROME_PATH). A desktop Chrome measurement, not a phone's.

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { startServer } from './phone-ui-render.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1]; };
const OUT = resolve(flag('--out') ?? resolve(REPO, 'design/phone-ui/review'));
const TURNS = flag('--turns');
/** The cases are measured in this many parts, each on a fresh page. */
const PARTS = 24;
const server = await startServer();
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
try {
  let page = null;
  const seen = [];
  const base = `${server.origin}/design/phone-ui/prototype/framing-check.html?${TURNS ? `turns=${Number(TURNS)}&` : ''}`;
  // Each part in a new tab, the last one closed, so the browser's memory stays bounded.
  const load = async query => {
    if (page) { seen.push(...page.problems()); await page.close(); }
    page = await openPage(browser, { width: 1560, height: 900 });
    // The page measures as it loads (its module awaits each case), so it is ready when it says so.
    await page.send('Page.navigate', { url: `${base}${query}` });
    await page.waitFor('window.__framingReady === true', `cases measured: ${query}`, 1_800_000);
    await page.evaluate('document.fonts.ready.then(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))))');
  };
  const results = [];
  for (let part = 0; part < PARTS; part += 1) {
    await load(`part=${part}&of=${PARTS}`);
    results.push(...await page.evaluate('window.__framingCheck'));
  }
  // The page's picture: the cases it shows, painted and measured once more on a page of their own.
  await load('shown=1');
  const shown = await page.evaluate('window.__framingCheck');
  for (const r of shown) {
    const same = results.find(x => x.name === r.name && x.width === r.width && x.height === r.height);
    if (!same || same.leastVisible !== r.leastVisible || same.leastVisibleMoving !== r.leastVisibleMoving) throw new Error(`The picture's case differs from its measurement: ${r.name} ${r.label}`);
  }
  await page.fitHeight();
  // The picture as a JPEG, as the pack's sheets are (phone-ui-render.mjs).
  const picture = resolve(OUT, 'framing-check.jpg');
  const { cssContentSize } = await page.send('Page.getLayoutMetrics');
  const clip = { x: 0, y: 0, width: Math.ceil(cssContentSize.width), height: Math.ceil(cssContentSize.height), scale: 1 };
  const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 84, captureBeyondViewport: true, clip });
  await writeFile(picture, Buffer.from(data, 'base64'));
  const problems = [...seen, ...page.problems()].filter(p => !/favicon/.test(p));
  const worst = Math.min(...results.map(r => r.leastVisible));
  const worstMoving = Math.min(...results.map(r => r.leastVisibleMoving));
  const report = {
    generatedBy: 'design/tools/phone-ui-framing-check.mjs',
    browser: (await browser.send('Browser.getVersion')).product,
    note: 'Desktop headless Chromium: each figure (both layers) of each full room painted by the pack\'s paintRoom, drawn again past its own box, as drawn and at every corner of the crew\'s own motion (FIGURE_MOTION_RANGE), and its painted pixels counted inside the room view\'s panel. Not a phone.',
    image: { file: 'framing-check.jpg', sha256: createHash('sha256').update(await readFile(picture)).digest('hex') },
    cases: results.length, figures: results.reduce((n, r) => n + r.figures, 0), layers: results.reduce((n, r) => n + r.layers, 0),
    leastVisible: worst, leastVisibleMoving: worstMoving, problems,
    // Every figure layer of the cases on the page (Frontend's, and each room's first turn); the least visible of the rest.
    results: results.map(({ measured, ...r }) => {
      const rows = measured.map(m => ({ place: m.place, character: m.character, gesture: m.gesture, layer: m.layer,
        visible: Math.round(m.still.ratio * 1e5) / 1e5, bounds: m.still.bounds, visibleMoving: Math.round(m.moving.ratio * 1e5) / 1e5, boundsMoving: m.moving.bounds }));
      return r.turn === 0 || r.turn === null ? { ...r, measured: rows } : { ...r, least: rows.reduce((a, b) => (b.visibleMoving < a.visibleMoving ? b : a)) };
    }),
  };
  await writeFile(resolve(OUT, 'framing-check.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`${report.cases} cases, ${report.figures} figures (${report.layers} layers); least visible ${(worst * 100).toFixed(3)} % as drawn, ${(worstMoving * 100).toFixed(3)} % moving${problems.length ? `; page problems: ${problems.join(' | ')}` : ''}`);
  if (worst < 1 || worstMoving < 1 || problems.length) process.exitCode = 1;
} finally {
  browser.close();
  await chrome.close();
  await server.close();
}
