// mothership:dev-only
//
// The Food Supply Task's review files (docs/design/food-supply.md), rendered in desktop Chrome
// from design/food-supply/review.html and film.html into design/food-supply/review/:
//   node design/tools/food-supply-render.mjs --sheets        every review sheet (PNG)
//   node design/tools/food-supply-render.mjs --films         every storyboard as a silent film (H.264, ffmpeg on the PATH)
//   node design/tools/food-supply-render.mjs --sheets --only=layout,board-drop
// review/renders.json records each file's SHA-256 and the browser; a page problem fails the render.
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chrome, not a phone.

import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { startServer } from './phone-ui-render.mjs';
import { BOARDS } from '../food-supply/boards.mjs';

const ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const REVIEW = join(ROOT, 'design/food-supply/review');
const flag = name => process.argv.includes(name);
const only = (process.argv.find(a => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
const chosen = name => !only.length || only.includes(name);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const rel = file => relative(ROOT, file).split('\\').join('/');

/** The sheets: name, address and width. */
export const SHEETS = Object.freeze([
  { name: 'layout', query: 'sheet=layout', width: 1660 },
  ...BOARDS.map(b => ({ name: `board-${b.id}`, query: `sheet=board&id=${b.id}`, width: 1240 })),
  { name: 'phones-hoist', query: 'sheet=phones&as=hoist', width: 1500 },
  { name: 'phones-boom', query: 'sheet=phones&as=boom', width: 1500 },
  { name: 'flow', query: 'sheet=flow', width: 1100 },
  { name: 'machine', query: 'sheet=machine', width: 1720 },
  { name: 'motion', query: 'sheet=motion', width: 2080 },
  { name: 'large-text', query: 'sheet=large', width: 1400 },
]);

/** The films: every storyboard, and two with Reduce motion. */
export const FILMS = Object.freeze([
  ...BOARDS.map(b => ({ name: `film-${b.id}`, query: `board=${b.id}` })),
  { name: 'film-cooperation-reduced', query: 'board=cooperation&reduced=1' },
  { name: 'film-drop-reduced', query: 'board=drop&reduced=1' },
]);

async function film(page, out, { fps = 30, duration }) {
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((ok, fail) => { ff.on('close', code => (code === 0 ? ok() : fail(new Error(`ffmpeg exited ${code}`)))); ff.on('error', fail); });
  const frames = Math.ceil(duration / (1000 / fps));
  for (let i = 0; i <= frames; i += 1) {
    await page.evaluate(`window.__fs.set(${Math.min(duration, (i * 1000) / fps)})`);
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
const file = join(REVIEW, 'renders.json');
const record = JSON.parse(await readFile(file, 'utf8').catch(() => '{"outputs":{}}'));
record.tool = 'design/tools/food-supply-render.mjs';
try {
  await mkdir(REVIEW, { recursive: true });
  const origin = `${server.origin}/design/food-supply`;
  if (flag('--sheets')) {
    for (const s of SHEETS.filter(x => chosen(x.name))) {
      const page = await openPage(browser, { width: s.width, height: 900 });
      await page.send('Page.navigate', { url: `${origin}/review.html?${s.query}` });
      await page.waitFor('window.__designReady === true', s.name, 180000);
      await page.fitHeight();
      const out = join(REVIEW, `${s.name}.png`);
      const size = await page.screenshot(out);
      const problems = [...page.problems().filter(x => !/favicon/.test(x)), ...await page.evaluate('window.__fsProblems ?? []')];
      if (problems.length) throw new Error(`${s.name}: ${problems.join(' | ')}`);
      record.outputs[rel(out)] = { sha256: sha256(await readFile(out)), ...size };
      await page.close();
      console.log('wrote', rel(out), `${size.width}x${size.height}`);
    }
  }
  if (flag('--films')) {
    for (const f of FILMS.filter(x => chosen(x.name))) {
      const page = await openPage(browser, { width: 1024, height: 860 });
      await page.send('Page.navigate', { url: `${origin}/film.html?${f.query}` });
      await page.waitFor('window.__designReady === true', f.name, 120000);
      const duration = await page.evaluate('window.__fs.duration');
      const out = join(REVIEW, `${f.name}.mp4`);
      const frames = await film(page, out, { duration });
      const problems = page.problems().filter(x => !/favicon/.test(x));
      if (problems.length) throw new Error(`${f.name}: ${problems.join(' | ')}`);
      record.outputs[rel(out)] = { sha256: sha256(await readFile(out)), frames, duration: Math.round(duration) };
      await page.close();
      console.log('wrote', rel(out), frames, 'frames');
    }
  }
  record.browser = (await browser.send('Browser.getVersion')).product;
  record.note = 'Desktop headless Chromium at each page\'s CSS size; not a phone. Films are silent.';
  record.outputs = Object.fromEntries(Object.entries(record.outputs).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(file, `${JSON.stringify(record, null, 2)}\n`);
} finally {
  browser.close();
  await chrome.close();
  await server.close();
}
