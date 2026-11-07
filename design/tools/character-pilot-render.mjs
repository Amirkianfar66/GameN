// mothership:dev-only
//
// Renders the character pilot's review files (design/character-pilot/review.html) for the owner:
//   node design/tools/character-pilot-render.mjs [--only sheet|motion]
// into design/character-pilot/review/:
//   sheet.png          the still review sheet (portraits, today and the pilot, sizes, colours);
//   motion.mp4         the three characters idling, walking and waving: exactly 288 frames at
//                      30 fps (9.6 s), H.264, no audio stream;
//   motion-poster.png  one frame of it;
//   renders.json       what was rendered, with what, and each file's SHA-256.
// Needs a Chromium-based browser (CHROME_PATH) and ffmpeg on PATH. A review render is a picture
// of a page in desktop Chrome: it proves nothing about phones or performance.

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { DESIGN_ROOT, startStaticServer } from './lib/static-server.mjs';

const FPS = 30;
const MOTION_MS = 9600;
const OUT = join(DESIGN_ROOT, 'character-pilot', 'review');
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const rel = file => relative(join(DESIGN_ROOT, '..'), file);

async function renderSheet(browser, origin) {
  const page = await openPage(browser, { width: 1560, height: 900, scale: 1.5 });
  await page.goto(`${origin}/character-pilot/review.html?view=sheet`);
  await page.fitHeight();
  const file = join(OUT, 'sheet.png');
  const size = await page.screenshot(file);
  const problems = page.problems();
  await page.close();
  if (problems.length) throw new Error(`sheet: ${problems.join('; ')}`);
  return { kind: 'sheet', file, ...size };
}

async function renderMotion(browser, origin) {
  const page = await openPage(browser, { width: 1280, height: 720, scale: 1.5 });
  await page.goto(`${origin}/character-pilot/review.html?view=motion&play=0`, 'window.__pilot && window.__pilot.ready');
  const frames = Math.round((MOTION_MS / 1000) * FPS);
  const file = join(OUT, 'motion.mp4');
  const ffmpeg = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', file], { stdio: ['pipe', 'ignore', 'pipe'] });
  let errors = '';
  ffmpeg.stderr.on('data', chunk => { errors += chunk; });
  const done = new Promise((resolve, reject) => ffmpeg.on('close', code => (code === 0 ? resolve() : reject(new Error(`ffmpeg: ${errors}`)))));
  let poster = null;
  for (let i = 0; i < frames; i += 1) {
    const t = (i * 1000) / FPS;
    await page.evaluate(`window.__pilot.seek(${t})`);
    const { data } = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1280, height: 720, scale: 1 } });
    const png = Buffer.from(data, 'base64');
    if (i === Math.round(7.4 * FPS)) poster = png;
    if (!ffmpeg.stdin.write(png)) await new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
  }
  ffmpeg.stdin.end();
  await done;
  const posterFile = join(OUT, 'motion-poster.png');
  await writeFile(posterFile, poster);
  const problems = page.problems();
  await page.close();
  if (problems.length) throw new Error(`motion: ${problems.join('; ')}`);
  return [{ kind: 'video', file, width: 1920, height: 1080, fps: FPS, frames, durationMs: MOTION_MS }, { kind: 'poster', file: posterFile, width: 1920, height: 1080 }];
}

await mkdir(OUT, { recursive: true });
const server = await startStaticServer();
const chrome = await launchBrowser();
const outputs = [];
let browserName = '';
try {
  const browser = await connect(chrome.endpoint);
  browserName = (await browser.send('Browser.getVersion')).product;
  if (!only || only === 'sheet') outputs.push(await renderSheet(browser, server.origin));
  if (!only || only === 'motion') outputs.push(...await renderMotion(browser, server.origin));
} finally {
  await chrome.close?.();
  await server.close();
}
const encoder = (spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' }).stdout ?? '').split('\n')[0];
const recordFile = join(OUT, 'renders.json');
let record = { tool: 'design/tools/character-pilot-render.mjs', page: 'design/character-pilot/review.html', outputs: {} };
try { record = JSON.parse(await readFile(recordFile, 'utf8')); } catch { /* the first render */ }
record.browser = browserName;
record.encoder = encoder;
for (const output of outputs) {
  const bytes = await readFile(output.file);
  record.outputs[rel(output.file)] = { ...output, file: undefined, bytes: bytes.length, sha256: sha256(bytes) };
}
record.outputs = Object.fromEntries(Object.entries(record.outputs).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(recordFile, `${JSON.stringify(record, null, 2)}\n`);
for (const output of outputs) console.log(`${rel(output.file)}: ${output.kind}${output.frames ? `, ${output.frames} frames` : ''}`);
