// mothership:dev-only
//
// Measures each pilot's stage in a local headless Chromium: the time a seek takes to redraw a
// frame (the frame function, the SVG markup, the DOM update, style and layout; the two animation
// frames every seek waits for are measured separately and subtracted), the markup size and the
// number of nodes the film adds. Desktop evidence only: not a phone, a GPU budget or a battery.
//   node design/tools/cinematic-perf.mjs   ->  design/cinematic/exports/perf.json

import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpus } from 'node:os';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { startCinematicServer } from './cinematic-serve.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const CASES = [
  ['hospital-rescue', 'display', 'full', '', 1920, 1080], ['hospital-rescue', 'phone', 'full', '', 390, 844], ['hospital-rescue', 'phone', 'full', '', 320, 568], ['hospital-rescue', 'insert', 'full', '', 1920, 1080],
  ['blackhole', 'display', 'full', '', 1920, 1080], ['blackhole', 'phone', 'full', '', 390, 844], ['blackhole', 'insert', 'full', '', 1920, 1080],
  ['private-talk', 'display', 'full', 'entrance', 1920, 1080], ['private-talk', 'display', 'full', 'exit', 1920, 1080],
];
const server = await startCinematicServer();
const handle = await launchBrowser();
const browser = await connect(handle.endpoint);
const results = [];
try {
  for (const [pilot, surface, variant, caseName, w, h] of CASES) {
    const page = await openPage(browser, { width: w, height: h, scale: 1 });
    const q = new URLSearchParams({ pilot, surface, variant, beds: '4', t: '-1' });
    if (surface === 'phone') { q.set('w', String(w)); q.set('h', String(h)); }
    if (caseName) q.set('case', caseName);
    await page.goto(`${server.origin}/cinematic/stage.html?${q}`, 'window.__cine && (window.__cine.ready === true || window.__cine.error)');
    const r = await page.evaluate(`(async () => {
      const cine = window.__cine;
      const film = () => {
        const doc = document.querySelector('#stage iframe')?.contentDocument;
        const inFrame = doc ? [...doc.querySelectorAll('[data-film]')] : [];
        const overlay = [...document.querySelectorAll('#stage > div svg, #stage > svg')].filter(el => !el.closest('svg:not(:scope)') || el.parentElement.tagName === 'DIV');
        const roots = [...inFrame, ...overlay];
        return { nodes: roots.reduce((sum, el) => sum + el.querySelectorAll('*').length + 1, 0), bytes: roots.reduce((sum, el) => sum + el.outerHTML.length, 0) };
      };
      const times = [];
      for (let t = 0; t <= cine.end; t += 1000 / 30) times.push(t);
      // 1. Script, style and layout: the seek with its frame waits short-circuited, then a forced layout.
      const realRaf = window.requestAnimationFrame;
      window.requestAnimationFrame = cb => { Promise.resolve().then(() => cb(performance.now())); return 0; };
      const sync = []; let nodes = 0, bytes = 0;
      for (const t of times) {
        const a = performance.now();
        await cine.seek(t);
        document.body.getBoundingClientRect();
        document.querySelector('#stage iframe')?.contentDocument?.body?.getBoundingClientRect();
        sync.push(performance.now() - a);
        const f = film(); nodes = Math.max(nodes, f.nodes); bytes = Math.max(bytes, f.bytes);
      }
      window.requestAnimationFrame = realRaf;
      // 2. With paint: the real two animation frames each seek waits for, against an idle pair.
      const raf2 = () => new Promise(d => requestAnimationFrame(() => requestAnimationFrame(d)));
      const idle = []; for (let i = 0; i < 20; i += 1) { const a = performance.now(); await raf2(); idle.push(performance.now() - a); }
      const painted = [];
      for (const t of times) { const a = performance.now(); await cine.seek(t); painted.push(performance.now() - a); }
      const pct = (list, p) => [...list].sort((x, y) => x - y)[Math.min(list.length - 1, Math.floor(p * list.length))];
      const r1 = v => Math.round(v * 10) / 10;
      return { frames: times.length, scriptLayoutMedianMs: r1(pct(sync, 0.5)), scriptLayoutP95Ms: r1(pct(sync, 0.95)), seekWithPaintMedianMs: r1(pct(painted, 0.5)), seekWithPaintP95Ms: r1(pct(painted, 0.95)), idleFramePairMs: r1(pct(idle, 0.5)), maxFilmNodes: nodes, maxFilmMarkupBytes: bytes };
    })()`);
    results.push({ pilot, surface, variant, case: caseName || null, viewport: [w, h], ...r });
    console.log(pilot, surface, caseName, w, h, JSON.stringify(r));
    await page.close();
  }
} finally {
  browser.close();
  await handle.close();
  await server.close();
}
await writeFile(resolve(repoRoot, 'design/cinematic/exports/perf.json'), `${JSON.stringify({
  tool: 'design/tools/cinematic-perf.mjs', browser: handle.version, machine: `${cpus().length} x ${cpus()[0]?.model ?? 'cpu'} (cloud VM, headless, software rendering)`,
  caveat: 'Desktop headless Chromium on a cloud VM with software rendering. Not a phone, not a GPU budget, not battery or thermal evidence. scriptLayout: a seek with its frame waits short-circuited plus a forced layout (frame function, markup, DOM update, style, layout; no paint). seekWithPaint: a seek with its two real animation frames (includes paint and raster), against idleFramePairMs for an idle pair. The review stage rebuilds every film layer per seek; a runtime keeps static layers mounted and updates only what moves.',
  results,
}, null, 2)}\n`);
