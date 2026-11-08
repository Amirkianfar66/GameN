// mothership:dev-only
//
// Renders the pre-game films' review videos and contact sheets (design/pregame-films/review/): each
// film on each surface is drawn frame by frame on the review stage (design/pregame-films/stage.html)
// in a headless Chromium, captured, and encoded with ffmpeg to exactly its length (60 frames a
// second; H.264, no audio stream). A contact sheet (JPEG) tiles moments of each full-motion render.
// records/<render>.json records each file's hash, size, length and frames, the stage address, the
// browser and the encoder (one file a render, so several renders can run at once).
//
//   node design/tools/pregame-films-render.mjs [--only <name>[,<name>...]]
//
// Needs a Chromium-based browser (CHROME_PATH) and ffmpeg. A review render is a picture of the films
// in desktop Chrome: it proves nothing about a phone's frame rate, decode time or memory.

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { startStaticServer } from './lib/static-server.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const OUT = join(REPO, 'design/pregame-films/review');
const FPS = 60;

import { RENDERS } from '../pregame-films/renders.mjs';

export { RENDERS };

const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const rel = file => relative(REPO, file).split('\\').join('/');

function probe(file) {
  const res = spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,nb_read_frames,r_frame_rate:format=duration,nb_streams', '-of', 'json', file], { encoding: 'utf8' });
  const data = JSON.parse(res.stdout);
  const s = data.streams[0];
  return { width: s.width, height: s.height, frames: Number(s.nb_read_frames), fps: s.r_frame_rate, durationS: Number(data.format.duration), streams: Number(data.format.nb_streams) };
}

async function render(browser, origin, job) {
  const page = await openPage(browser, { width: job.width, height: job.height, scale: job.scale });
  const url = `${origin}/pregame-films/stage.html?${job.query}`;
  await page.goto(url, 'window.__films && window.__films.ready');
  const frames = Math.round((job.ms / 1000) * FPS);
  const file = join(OUT, `${job.name}.mp4`);
  const ffmpeg = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-an', '-movflags', '+faststart', file], { stdio: ['pipe', 'ignore', 'pipe'] });
  let errors = '';
  ffmpeg.stderr.on('data', chunk => { errors += chunk; });
  const done = new Promise((ok, fail) => ffmpeg.on('close', code => (code === 0 ? ok() : fail(new Error(`ffmpeg: ${errors}`)))));
  const sheetAt = new Set((job.sheet ?? []).map(t => Math.round((t * FPS) / 1000)));
  const sheetDir = job.sheet ? mkdtempSync(join(tmpdir(), 'pregame-sheet-')) : null;
  const started = Date.now();
  for (let i = 0; i < frames; i += 1) {
    const t = (i * 1000) / FPS;
    await page.evaluate(`window.__films.seek(${t})`);
    const { data } = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: job.width, height: job.height, scale: 1 } });
    const png = Buffer.from(data, 'base64');
    if (sheetDir && sheetAt.has(i)) writeFileSync(join(sheetDir, `s${String([...sheetAt].sort((a, b) => a - b).indexOf(i)).padStart(2, '0')}.png`), png);
    if (!ffmpeg.stdin.write(png)) await new Promise(ok => ffmpeg.stdin.once('drain', ok));
  }
  ffmpeg.stdin.end();
  await done;
  const problems = page.problems();
  await page.close();
  if (problems.length) throw new Error(`${job.name}: the stage had problems: ${problems.join(' | ')}`);
  const outputs = [];
  const bytes = readFileSync(file);
  outputs.push({ kind: 'video', file: rel(file), sha256: sha256(bytes), bytes: bytes.length, stage: `pregame-films/stage.html?${job.query}`, css: [job.width, job.height], deviceScale: job.scale, fps: FPS, framesRendered: frames, durationMs: job.ms, msPerFrame: Math.round((Date.now() - started) / frames), probe: probe(file) });
  if (sheetDir) {
    const sheet = join(OUT, `${job.name}.sheet.jpg`);
    const cols = job.width > job.height ? 3 : 6;
    const thumb = job.width > job.height ? 640 : 260;
    const res = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', join(sheetDir, 's%02d.png'), '-vf', `scale=${thumb}:-1,tile=${cols}x${Math.ceil(job.sheet.length / cols)}:padding=6:color=0x1A1A1A`, '-frames:v', '1', '-q:v', '4', sheet]);
    rmSync(sheetDir, { recursive: true, force: true });
    if (res.status !== 0) throw new Error(`${job.name}: contact sheet: ${res.stderr}`);
    const sb = readFileSync(sheet);
    outputs.push({ kind: 'sheet', file: rel(sheet), sha256: sha256(sb), bytes: sb.length, moments: job.sheet });
  }
  return outputs;
}

const only = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? new Set(process.argv[i + 1].split(',')) : null; })();
const RECORDS = join(OUT, 'records');
mkdirSync(RECORDS, { recursive: true });
const server = await startStaticServer();
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const encoder = (spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' }).stdout ?? '').split('\n')[0];
try {
  for (const job of RENDERS) {
    if (only && !only.has(job.name)) continue;
    const outputs = await render(browser, server.origin, job);
    const record = { render: job.name, film: job.film, outputs, browser: chrome.version, encoder, note: 'A review render: frames captured in desktop Chromium from the review stage and encoded with ffmpeg. Not a device measurement.' };
    writeFileSync(join(RECORDS, `${job.name}.json`), `${JSON.stringify(record, null, 2)}\n`);
    console.log(`${job.name}: ${outputs.map(o => `${o.file} ${o.bytes} B${o.kind === 'video' ? ` ${o.probe.frames} frames ${o.probe.durationS} s ${o.msPerFrame} ms/frame` : ''}`).join('; ')}`);
  }
} finally {
  browser.close();
  await chrome.close();
  await server.close();
}
