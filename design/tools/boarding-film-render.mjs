// mothership:dev-only
//
// Renders the boarding film's review videos (design/phone-ui/components/boarding-film/review/): the pilot
// (pregame-boarding-2.0.0) drawn frame by frame from its preview (the same files the game imports) in a headless
// Chromium, captured, and encoded with ffmpeg to exactly its ten seconds (60 frames a second; H.264, no audio stream):
//   pilot-390x844.mp4, pilot-430x932.mp4                    full motion, a crew of 8
//   pilot-390x844-reduced.mp4, pilot-430x932-reduced.mp4    Reduce motion: the five held pictures
//   compare-as-drawn.mp4     today's film (pregame-boarding-1.0.0, drawn by the live game's own scene) beside the
//                            pilot, both at every sixtieth of a second: what each film is
//   compare-as-played.mp4    the same two, each showing only the pictures it reached when it was played in real time
//                            with the browser's CPU slowed four times (a rough stand-in for a phone): what each film
//                            does. The times each film's pictures came are measured here, first, and recorded.
//   pilot-sheet.jpg          twelve moments of the pilot side by side
// renders.json records each file's hash, size, length and frames, and the measured cadence.
//   node design/tools/boarding-film-render.mjs [--only <name>[,<name>...]]
// Needs a Chromium-based browser (CHROME_PATH) and ffmpeg. A render is a picture of the film in desktop Chrome: it
// proves nothing about a phone's frame rate, decode time or memory.

import { spawn, spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { bundlePreview, serve, sha256, sourceState } from './lib/component-check.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/boarding-film');
const REVIEW = join(COMPONENT, 'review');
const FPS = 60, MS = 10000, FRAMES = Math.round(MS / 1000 * FPS);
const { BOARDING_FILM_VERSION } = await import(pathToFileURL(join(COMPONENT, 'boarding-film.mjs')).href);
const only = process.argv.includes('--only') ? new Set(process.argv[process.argv.indexOf('--only') + 1].split(',')) : null;
const wanted = name => !only || only.has(name);

function probe(file) {
  const res = spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,nb_read_frames,r_frame_rate:format=duration,nb_streams', '-of', 'json', file], { encoding: 'utf8' });
  const data = JSON.parse(res.stdout), s = data.streams[0];
  return { width: s.width, height: s.height, frames: Number(s.nb_read_frames), fps: s.r_frame_rate, durationS: Number(data.format.duration), streams: Number(data.format.nb_streams) };
}

/** Encodes `FRAMES` screenshots of `page`, one for each sixtieth of a second, `seek(i)` holding the page at each. */
async function encode(page, name, [width, height], seek) {
  const file = join(REVIEW, `${name}.mp4`);
  const ffmpeg = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-an', '-movflags', '+faststart', file], { stdio: ['pipe', 'ignore', 'pipe'] });
  let errors = '';
  ffmpeg.stderr.on('data', chunk => { errors += chunk; });
  const done = new Promise((ok, fail) => ffmpeg.on('close', code => (code === 0 ? ok() : fail(new Error(`ffmpeg: ${errors}`)))));
  for (let i = 0; i < FRAMES; i += 1) {
    await seek(i);
    const { data } = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 } });
    if (!ffmpeg.stdin.write(Buffer.from(data, 'base64'))) await new Promise(ok => ffmpeg.stdin.once('drain', ok));
  }
  ffmpeg.stdin.end();
  await done;
  const bytes = await readFile(file), info = probe(file);
  if (info.frames !== FRAMES || info.streams !== 1) throw new Error(`${name}: ${info.frames} frames, ${info.streams} streams`);
  console.log(`rendered ${name}.mp4: ${info.width}x${info.height}, ${info.frames} frames, ${(bytes.length / 1048576).toFixed(2)} MB`);
  return { file: file.slice(REPO.length + 1), sha256: sha256(bytes), bytes: bytes.length, ...info };
}

const { sourceCommit, sourceClean } = sourceState(REPO, ['design/phone-ui/components/boarding-film', 'apps/game/hosted/pregame-films', 'apps/game/hosted/crew-drawing', 'apps/game/hosted/scene-drawing', 'apps/game/hosted/planet/pregame-scene.mjs']);
const out = await bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'boarding-film-render', pages: { index: 'index.html', baseline: 'baseline.html', compare: 'compare.html' } });
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
await mkdir(REVIEW, { recursive: true });
const previous = existsSync(join(REVIEW, 'renders.json')) ? JSON.parse(await readFile(join(REVIEW, 'renders.json'), 'utf8')) : { renders: {} };
const renders = { ...previous.renders };
let cadence = previous.cadence ?? null;
try {
  // The pilot alone, at each phone size, in full motion and with Reduce motion.
  for (const [size, width, height] of [['390x844', 390, 844], ['430x932', 430, 932]]) for (const reduced of [false, true]) {
    const name = `pilot-${size}${reduced ? '-reduced' : ''}`;
    if (!wanted(name)) continue;
    const page = await openPage(browser, { width, height, scale: 1 });
    await page.goto(`${origin}/index.html?size=${size}&t=0&bar=0${reduced ? '&motion=reduced' : ''}`, 'window.__boardingFilm');
    await page.evaluate('window.__boardingFilm.ready');
    renders[name] = { ...(await encode(page, name, [width, height], i => page.evaluate(`window.__boardingFilm.seek(${(i * 1000) / FPS})`))), motion: reduced ? 'reduced' : 'full', crew: 8 };
    await page.close();
  }
  if (wanted('pilot-sheet')) {
    const moments = [700, 1900, 2500, 3300, 4300, 5250, 6040, 6480, 6760, 7350, 8600, 9450], dir = mkdtempSync(join(tmpdir(), 'boarding-sheet-'));
    const page = await openPage(browser, { width: 390, height: 844, scale: 1 });
    await page.goto(`${origin}/index.html?size=390x844&t=0&bar=0`, 'window.__boardingFilm');
    const files = [];
    for (const t of moments) {
      await page.evaluate(`window.__boardingFilm.seek(${t})`);
      const { data } = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 390, height: 844, scale: 1 } });
      files.push(join(dir, `${String(t).padStart(5, '0')}.png`));
      await writeFile(files.at(-1), Buffer.from(data, 'base64'));
    }
    await page.close();
    const file = join(REVIEW, 'pilot-sheet.jpg');
    const res = spawnSync('ffmpeg', ['-v', 'error', '-y', ...files.flatMap(f => ['-i', f]), '-filter_complex', `${files.map((_, i) => `[${i}:v]scale=260:562[v${i}]`).join(';')};${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % 6) * 260}_${Math.floor(i / 6) * 562}`).join('|')}`, '-frames:v', '1', '-q:v', '3', file], { encoding: 'utf8' });
    if (res.status !== 0) throw new Error(`ffmpeg sheet: ${res.stderr}`);
    await rm(dir, { recursive: true, force: true });
    const bytes = await readFile(file);
    renders['pilot-sheet'] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), bytes: bytes.length, moments };
    console.log(`rendered pilot-sheet.jpg: ${moments.length} moments`);
  }
  // The two films side by side.
  if (wanted('compare-as-played')) {
    // When each film's pictures come, played in real time as the live player drives a film, the CPU slowed four times.
    const measure = async (path, call) => {
      const page = await openPage(browser, { width: 390, height: 844, scale: 2, mobile: true });
      await page.goto(`${origin}/${path}`, path.startsWith('baseline') ? 'window.__baseline && window.__baseline.ready' : 'window.__boardingFilm');
      if (!path.startsWith('baseline')) await page.evaluate('window.__boardingFilm.ready');
      await page.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const result = await page.evaluate(call);
      await page.close();
      return result;
    };
    const today = await measure('baseline.html?size=390x844', 'window.__baseline.measure()');
    const pilot = await measure('index.html?size=390x844&t=0&bar=0', 'window.__boardingFilm.measure({ prepare: true })');
    cadence = { cpuSlowdown: 4, pixels: '780x1688', today: { picturesASecond: today.picturesASecond, drawnAt: today.drawnAt }, pilot: { picturesASecond: pilot.picturesASecond, quality: pilot.quality, drawnAt: pilot.drawnAt } };
    console.log(`measured at 4x CPU: today ${today.picturesASecond} pictures a second, pilot ${pilot.picturesASecond}`);
  }
  for (const mode of ['as-drawn', 'as-played']) {
    const name = `compare-${mode}`;
    if (!wanted(name)) continue;
    const played = mode === 'as-played';
    const notes = played
      ? [`as it plays, CPU slowed 4x: ${cadence.today.picturesASecond} pictures a second`, `as it plays, CPU slowed 4x: ${cadence.pilot.picturesASecond} pictures a second`]
      : ['as drawn, 60 frames a second', 'as drawn, 60 frames a second'];
    const page = await openPage(browser, { width: 828, height: 916, scale: 1 });
    await page.goto(`${origin}/compare.html?left=${encodeURIComponent(notes[0])}&right=${encodeURIComponent(notes[1])}`, 'window.__compare');
    await page.evaluate('window.__compare.ready');
    // As played, each side shows the last picture it had reached by this moment.
    const reached = (list, t) => { let at = 0; for (const d of list) { if (d > t) break; at = d; } return at; };
    renders[name] = await encode(page, name, [828, 916], i => {
      const t = (i * 1000) / FPS;
      return page.evaluate(played ? `window.__compare.seek(${reached(cadence.today.drawnAt, t)}, ${reached(cadence.pilot.drawnAt, t)})` : `window.__compare.seek(${t})`);
    });
    renders[name].note = played ? 'Each side holds the last picture its film had reached at that moment in a real-time run in desktop Chromium with the CPU slowed 4x (the times are in cadence). A reconstruction of measured timing, not a screen recording, and not a phone.' : 'Both films at every sixtieth of a second.';
    await page.close();
  }
} finally {
  browser.close();
  chrome.close?.();
  server.close();
  await rm(out, { recursive: true, force: true });
}
await writeFile(join(REVIEW, 'renders.json'), `${JSON.stringify({ tool: 'design/tools/boarding-film-render.mjs', version: BOARDING_FILM_VERSION, sourceCommit, sourceClean, browser: chrome.version, fps: FPS, ms: MS, environment: 'Desktop Chromium (headless). Not a phone: a render proves nothing about a phone\'s frame rate, decode time or memory.', renders, cadence }, null, 2)}\n`);
console.log(`wrote ${REVIEW.slice(REPO.length + 1)}/renders.json`);
