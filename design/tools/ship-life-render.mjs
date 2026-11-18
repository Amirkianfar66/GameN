// mothership:dev-only
//
// Ship life's render tool (docs/design/ship-life.md). Draws in a browser what the package's files
// are made from and what the owner and Frontend look at:
//   --extend   samples each approved room picture (room-drawing-1.0.0) along its top and bottom
//              edges and writes design/ship-life/assets/<room>.extend.svg (./ship-life/extend.mjs);
//   --sheets   writes the review sheets into design/ship-life/review/ (the framings, the activity
//              and visit storyboards, the devices) and their record, renders.json;
//   --films    writes the silent review films (H.264, ffmpeg on the PATH) into design/ship-life/review/;
//   --only <names>   with --sheets or --films: only these (comma-separated).
//   node design/tools/ship-life-render.mjs --extend --sheets --films
// Needs a Chromium-based browser (CHROME_PATH). A review render is a picture of a page in desktop
// Chrome: it proves nothing about phones or performance, and a film proves nothing about timing on
// a phone.

import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { DESIGN_ROOT } from './lib/static-server.mjs';
// The repository's root, as the phone pack's tools serve it: the framing reads the pack's art.mjs,
// which draws with the game's hosted modules (apps/game/hosted).
import { startServer } from './phone-ui-render.mjs';
import { REACH, SEAM, extensionSvg } from '../ship-life/extend.mjs';

const ROOT = join(DESIGN_ROOT, '..');
const SHIP = join(DESIGN_ROOT, 'ship-life');
const ASSETS = join(SHIP, 'assets');
const REVIEW = join(SHIP, 'review');
const ROOMS = ['command-room', 'room-a', 'room-b', 'hospital', 'jail'];
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const rel = file => relative(ROOT, file).split('\\').join('/');
const args = process.argv.slice(2);
const flag = name => args.includes(name);
const only = (() => { const i = args.indexOf('--only'); return i >= 0 ? new Set(args[i + 1].split(',').map(s => s.trim())) : null; })();
const chosen = name => !only || only.has(name);

/** In the page: a room's picture drawn at its own size, and its colours along two rows, a column every 16 units. */
const SAMPLE = `async (src, rows) => {
  const im = new Image(); im.src = src; await im.decode();
  const canvas = new OffscreenCanvas(1024, 768), context = canvas.getContext('2d');
  context.drawImage(im, 0, 0, 1024, 768);
  const out = {};
  for (const [name, y] of Object.entries(rows)) {
    const data = context.getImageData(0, y - 2, 1024, 5).data;
    const row = [];
    for (let x = 0; x <= 1024; x += 16) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = 0; dy < 5; dy += 1) for (let dx = -6; dx <= 6; dx += 1) {
        const cx = Math.max(0, Math.min(1023, x + dx)), i = (dy * 1024 + cx) * 4;
        if (data[i + 3] < 200) continue;
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n += 1;
      }
      row.push(n ? [r / n, g / n, b / n] : [21, 25, 35]);
    }
    out[name] = row;
  }
  return out;
}`;

const header = room => `  mothership:dev-only · ship life · ${room}: the ceiling above and the deck below the approved picture (room-drawing-1.0.0), for the wider room views · generated, do not edit by hand
  Each band starts in the picture's own colours along its edge (sampled at y ${SEAM.top.sample} and ${SEAM.bottom.sample}, a column every 16 units, in desktop Chrome), feathered
  over the picture's last rows, and falls into the room's shadow. ${REACH} units each way. Written by design/tools/ship-life-render.mjs (its extend step) from design/ship-life/extend.mjs.`;

async function extend(page, origin) {
  await mkdir(ASSETS, { recursive: true });
  await page.goto(`${origin}/ship-life/preview.html?room=hospital&take=life`, 'window.__designReady === true');
  const written = [];
  for (const room of ROOMS) {
    const sampled = await page.evaluate(`(${SAMPLE})(${JSON.stringify(`${origin}/room-drawing/assets/${room}.back.svg`)}, ${JSON.stringify({ top: SEAM.top.sample, bottom: SEAM.bottom.sample })})`);
    const file = join(ASSETS, `${room}.extend.svg`);
    await writeFile(file, extensionSvg(room, sampled, { header: header(room) }));
    written.push(rel(file));
  }
  return written;
}

/** Frames of a page's clock piped to ffmpeg: a silent H.264 film. */
async function film(page, out, { fps = 30, duration }) {
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => { ff.on('close', code => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))); ff.on('error', reject); });
  const frames = Math.ceil(duration / (1000 / fps));
  for (let i = 0; i <= frames; i += 1) {
    await page.evaluate(`window.__ship.set(${Math.min(duration, (i * 1000) / fps)})`);
    const { data } = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    if (!ff.stdin.write(Buffer.from(data, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await done;
  return frames + 1;
}

const server = await startServer();
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const record = { tool: 'design/tools/ship-life-render.mjs', outputs: {} };
try {
  const origin = `${server.origin}/design`;
  if (flag('--extend')) {
    const page = await openPage(browser, { width: 1024, height: 768 });
    for (const file of await extend(page, origin)) record.outputs[file] = sha256(await readFile(join(ROOT, file)));
    await page.close();
  }
  if (flag('--films')) {
    await mkdir(REVIEW, { recursive: true });
    const { FILMS } = await import('../ship-life/review-plan.mjs');
    for (const f of FILMS.filter(x => chosen(x.name))) {
      const page = await openPage(browser, { width: f.width, height: f.height, scale: f.scale ?? 1.5 });
      await page.goto(`${origin}/ship-life/${f.page}`, 'window.__designReady === true');
      const duration = await page.evaluate('window.__ship.duration');
      const out = join(REVIEW, `${f.name}.mp4`);
      const frames = await film(page, out, { duration });
      const problems = page.problems().filter(p => !/favicon/.test(p));
      if (problems.length) throw new Error(`${f.name}: ${problems.join(' | ')}`);
      record.outputs[rel(out)] = { sha256: sha256(await readFile(out)), frames, duration: Math.round(duration) };
      await page.close();
      console.log('wrote', rel(out), frames, 'frames');
    }
  }
  if (flag('--sheets')) {
    await mkdir(REVIEW, { recursive: true });
    const { SHEETS } = await import('../ship-life/review-plan.mjs');
    for (const s of SHEETS.filter(x => chosen(x.name))) {
      const page = await openPage(browser, { width: s.width, height: s.height ?? 800, scale: s.scale ?? 1 });
      await page.goto(`${origin}/ship-life/${s.page}`, 'window.__designReady === true');
      await page.fitHeight();
      const out = join(REVIEW, `${s.name}.png`);
      const size = await page.screenshot(out);
      const problems = page.problems().filter(p => !/favicon/.test(p));
      if (problems.length) throw new Error(`${s.name}: ${problems.join(' | ')}`);
      record.outputs[rel(out)] = { sha256: sha256(await readFile(out)), ...size };
      await page.close();
      console.log('wrote', rel(out), `${size.width}x${size.height}`);
    }
  }
  const version = await browser.send('Browser.getVersion');
  record.browser = version.product;
  if (flag('--sheets') || flag('--films')) {
    const file = join(REVIEW, 'renders.json');
    const previous = await readFile(file, 'utf8').then(JSON.parse).catch(() => ({ outputs: {} }));
    await writeFile(file, `${JSON.stringify({ ...previous, ...record, outputs: { ...previous.outputs, ...record.outputs } }, null, 2)}\n`);
  }
  for (const [file, value] of Object.entries(record.outputs)) if (typeof value === 'string') console.log('wrote', file);
} finally {
  browser.close();
  await chrome.close();
  await server.close();
}
