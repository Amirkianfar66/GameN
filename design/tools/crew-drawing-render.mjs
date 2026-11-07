// mothership:dev-only
//
// Renders the crew drawing release's review files (design/crew-drawing/review.html) into
// design/crew-drawing/review/:
//   node design/tools/crew-drawing-render.mjs [--only full|reduced|compare]
//   preview-full.mp4            the nine for 12 s, full motion: idle (blinks, drift, hair), a move
//                               with the rig's walk at the game's timings, then places, views and
//                               health; exactly 360 frames at 30 fps, H.264, no audio stream;
//   preview-full-poster.png     one frame of it;
//   preview-reduced.mp4         the same clock with reduced motion; its poster beside it;
//   compare.png                 today's drawing and the release's, surface by surface;
//   renders.json                what was rendered, with what, each file's SHA-256, and the
//                               desktop timings of the three ways to draw a frame.
// Needs a Chromium-based browser (CHROME_PATH) and ffmpeg on PATH. A review render is a picture
// of a page in desktop Chrome: it proves nothing about phones or their performance.

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { skeletonOf } from '../board-motion/figures/gestures.mjs';
import { CREW } from '../crew-drawing/source/crew.mjs';
import { dressedFigureSvg } from '../crew-drawing/source/wardrobe.mjs';
import { memorialSvg } from '../../apps/game/hosted/board-v2-drawing/captain-fx.mjs';
import { halftoneSvg, outlineSvg } from '../../apps/game/hosted/board-v2-drawing/clone-fx.mjs';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { DESIGN_ROOT, startStaticServer } from './lib/static-server.mjs';

const FPS = 30;
const MOTION_MS = 12000;
const OUT = join(DESIGN_ROOT, 'crew-drawing', 'review');
const REPO = join(DESIGN_ROOT, '..');
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const rel = file => relative(REPO, file);

async function renderMotion(browser, origin, reduced) {
  const name = reduced ? 'preview-reduced' : 'preview-full';
  const page = await openPage(browser, { width: 1280, height: 720, scale: 1.5 });
  await page.goto(`${origin}/crew-drawing/review.html?view=motion${reduced ? '&reduced=1' : ''}`, 'window.__crew && window.__crew.ready');
  const frames = Math.round((MOTION_MS / 1000) * FPS);
  const file = join(OUT, `${name}.mp4`);
  const ffmpeg = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', file], { stdio: ['pipe', 'ignore', 'pipe'] });
  let errors = '';
  ffmpeg.stderr.on('data', chunk => { errors += chunk; });
  const done = new Promise((resolve, reject) => ffmpeg.on('close', code => (code === 0 ? resolve() : reject(new Error(`ffmpeg: ${errors}`)))));
  let poster = null;
  for (let i = 0; i < frames; i += 1) {
    const t = (i * 1000) / FPS;
    await page.evaluate(`window.__crew.seek(${t})`);
    const { data } = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1280, height: 720, scale: 1 } });
    const png = Buffer.from(data, 'base64');
    if (i === Math.round(5.0 * FPS)) poster = png;
    if (!ffmpeg.stdin.write(png)) await new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
  }
  ffmpeg.stdin.end();
  await done;
  const posterFile = join(OUT, `${name}-poster.png`);
  await writeFile(posterFile, poster);
  const measured = reduced ? null : await page.evaluate('window.__crew.measure()');
  const problems = page.problems();
  await page.close();
  if (problems.length) throw new Error(`${name}: ${problems.join('; ')}`);
  return { outputs: [{ kind: 'video', file, width: 1920, height: 1080, fps: FPS, frames, durationMs: MOTION_MS, reducedMotion: reduced }, { kind: 'poster', file: posterFile, width: 1920, height: 1080, atMs: 5000 }], measured };
}

/** The films' effects, today's (the shipped files) and the release's (the runtime's effects on the release figure). */
async function filmMarkup() {
  const ids = ['c8', 'c6', 'c4'];
  const old = [], next = [];
  for (const id of ids) {
    const sign = CREW[id].sign;
    for (const [kind, dir] of [['memorial', 'captain'], ['outline', 'clone'], ['halftone', 'clone']]) {
      old.push([`${sign}: ${kind}`, await readFile(join(REPO, `apps/game/hosted/board-v2-film-art/${dir}/${kind}-${id}.svg`), 'utf8')]);
    }
    const stand = skeletonOf('stand');
    next.push([`${sign}: memorial`, memorialSvg(dressedFigureSvg(CREW[id], stand, { outfit: 'crew', prefix: `rmem-${id}` }))]);
    const figure = dressedFigureSvg(CREW[id], stand, { outfit: 'crew', prefix: `rcl-${id}` });
    next.push([`${sign}: outline`, outlineSvg(figure, { prefix: `rol-${id}` })]);
    next.push([`${sign}: halftone`, halftoneSvg(figure, { density: 1, prefix: `rht-${id}` })]);
  }
  return { old, release: next };
}

async function renderCompare(browser, origin) {
  const page = await openPage(browser, { width: 1560, height: 900, scale: 1.5 });
  await page.goto(`${origin}/crew-drawing/review.html?view=compare`, 'window.__crew && window.__crew.ready');
  await page.evaluate(`window.__crew.films(${JSON.stringify(await filmMarkup())})`);
  await page.fitHeight();
  const file = join(OUT, 'compare.png');
  const size = await page.screenshot(file);
  const problems = page.problems();
  await page.close();
  if (problems.length) throw new Error(`compare: ${problems.join('; ')}`);
  return { kind: 'sheet', file, ...size };
}

await mkdir(OUT, { recursive: true });
const server = await startStaticServer();
const chrome = await launchBrowser();
const outputs = [];
let measured = null, browserName = '';
try {
  const browser = await connect(chrome.endpoint);
  browserName = (await browser.send('Browser.getVersion')).product;
  if (!only || only === 'full') { const r = await renderMotion(browser, server.origin, false); outputs.push(...r.outputs); measured = r.measured; }
  if (!only || only === 'reduced') outputs.push(...(await renderMotion(browser, server.origin, true)).outputs);
  if (!only || only === 'compare') outputs.push(await renderCompare(browser, server.origin));
} finally {
  await chrome.close?.();
  await server.close();
}
const encoder = (spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' }).stdout ?? '').split('\n')[0];
const recordFile = join(OUT, 'renders.json');
let record = { tool: 'design/tools/crew-drawing-render.mjs', page: 'design/crew-drawing/review.html', outputs: {} };
try { record = JSON.parse(await readFile(recordFile, 'utf8')); } catch { /* the first render */ }
record.browser = browserName;
record.encoder = encoder;
record.note = 'Review media, not runtime assets: a picture of a page in desktop Chrome, silent. Nothing here is measured on a phone.';
if (measured) record.desktopTimings = measured;
for (const output of outputs) {
  const bytes = await readFile(output.file);
  record.outputs[rel(output.file)] = { ...output, file: undefined, bytes: bytes.length, sha256: sha256(bytes) };
}
record.outputs = Object.fromEntries(Object.entries(record.outputs).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(recordFile, `${JSON.stringify(record, null, 2)}\n`);
for (const output of outputs) console.log(`${rel(output.file)}: ${output.kind}${output.frames ? `, ${output.frames} frames` : ''}`);
if (measured) console.log(JSON.stringify(measured));
