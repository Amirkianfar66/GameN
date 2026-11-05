// mothership:dev-only
//
// Renders a cinematic pilot from its stage (design/cinematic/stage.html) frame by frame in a local
// Chromium and encodes it with the local ffmpeg: stills, or a video with its poster and its
// lightweight animated alternative. Every frame is the pilot's frame function at an exact moment
// (the stage's seek), so a render is the same art the stage and the gallery draw, at a fixed rate.
//
//   node design/tools/cinematic-render.mjs --pilot hospital-rescue --surface display --variant full \
//     --out design/cinematic/exports/hospital-rescue --name display-full [--fps 30] [--scale 1] \
//     [--w 390 --h 844] [--stills 0,1500,3550] [--video] [--poster 3600] [--preview-width 480] \
//     [--param case=... --param audience=...] [--formats mp4,webm,preview] [--crf 18] [--vp9-crf 33]
//     [--audio path/to/cues.wav] [--poster-formats png,webp]
//
// Writes <name>.mp4 (H.264, yuv420p, faststart), <name>.webm (VP9), <name>.preview.webp (animated,
// small), <name>.poster.png and .poster.webp, <name>-<t>.png stills, and <name>.render.json (what
// was rendered, from which stage address, with which browser and encoder). Needs CHROME_PATH (or a
// found Chromium) and ffmpeg on PATH. Writes nothing outside --out.

import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { startStaticServer } from './lib/static-server.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));

function args(argv) {
  const out = { fps: 30, scale: 1, params: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const name = argv[i].replace(/^--/, '');
    if (name === 'video') { out.video = true; continue; }
    const value = argv[i + 1];
    i += 1;
    if (name === 'param') out.params.push(value);
    else out[name] = value;
  }
  for (const name of ['fps', 'scale', 'w', 'h', 'poster', 'preview-width', 'from', 'to', 'crf', 'vp9-crf']) if (out[name] !== undefined) out[name] = Number(out[name]);
  out.formats = (out.formats ?? 'mp4,webm,preview').split(',');
  out['poster-formats'] = (out['poster-formats'] ?? 'png,webp').split(',');
  if (!out.pilot || !out.surface || !out.out || !out.name) throw new Error('Needs --pilot, --surface, --out and --name');
  return out;
}

const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');

async function main() {
  const opt = args(process.argv.slice(2));
  const variant = opt.variant ?? 'full';
  const outDir = resolve(repoRoot, opt.out);
  await mkdir(outDir, { recursive: true });
  const server = await startStaticServer();
  const handle = await launchBrowser();
  const browser = await connect(handle.endpoint);
  const written = [];
  try {
    const query = new URLSearchParams({ pilot: opt.pilot, surface: opt.surface, variant, beds: '4' });
    if (opt.w) query.set('w', String(opt.w));
    if (opt.h) query.set('h', String(opt.h));
    for (const pair of opt.params) { const [k, v] = pair.split('='); query.set(k, v); }
    query.set('t', '-1');
    const url = `${server.origin}/cinematic/stage.html?${query}`;
    // The page's size: the surface's, read from the stage once it is mounted.
    const probe = await openPage(browser, { width: opt.w ?? 1920, height: opt.h ?? 1080, scale: opt.scale });
    await probe.goto(url, 'window.__cine && (window.__cine.ready === true || window.__cine.error)');
    const info = await probe.evaluate('({ error: window.__cine.error ?? null, end: window.__cine.end, size: window.__cine.size, fixture: window.__cine.fixture, version: window.__cine.version })');
    if (info.error) throw new Error(`Stage failed: ${info.error}`);
    const problems = probe.problems();
    if (problems.length) throw new Error(`Stage problems: ${problems.join('; ')}`);
    const [width, height] = info.size;
    await probe.close();
    const page = await openPage(browser, { width, height, scale: opt.scale });
    await page.goto(url, 'window.__cine && (window.__cine.ready === true || window.__cine.error)');
    const shot = async t => {
      await page.evaluate(`window.__cine.seek(${t}).then(() => true)`);
      const { data } = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 } });
      return Buffer.from(data, 'base64');
    };
    // Warm the pictures once (the first decode of a scene picture can land a frame late).
    await shot(0); await shot(0);
    const record = { tool: 'design/tools/cinematic-render.mjs', pilot: opt.pilot, version: info.version, surface: opt.surface, variant, stage: `design/cinematic/stage.html?${query}`.replace(/&t=-1$/, ''), size: [width, height], deviceScale: opt.scale, fixture: info.fixture, browser: handle.version, encoder: execFileSync('ffmpeg', ['-hide_banner', '-version']).toString().split('\n')[0], outputs: [] };
    for (const t of (opt.stills ?? '').split(',').filter(Boolean).map(Number)) {
      const png = await shot(t);
      const file = join(outDir, `${opt.name}-${String(t).padStart(4, '0')}.png`);
      await writeFile(file, png);
      written.push(file);
      record.outputs.push({ kind: 'still', t, file: relative(repoRoot, file), sha256: sha256(png), bytes: png.length });
    }
    if (opt.video) {
      const from = opt.from ?? 0, to = opt.to ?? info.end;
      const count = Math.round(((to - from) / 1000) * opt.fps) + 1;
      const base = join(outDir, opt.name);
      const previewWidth = opt['preview-width'] ?? (width >= 1000 ? 480 : 240);
      const even = v => Math.round((v * opt.scale) / 2) * 2;
      const audio = opt.audio ? resolve(repoRoot, opt.audio) : null;
      const outputs = [];
      const size = `scale=${even(width)}:${even(height)}:flags=lanczos`;
      if (opt.formats.includes('mp4')) outputs.push('-map', '0:v', ...(audio ? ['-map', '1:a', '-c:a', 'aac', '-b:a', '128k', '-shortest'] : []), '-vf', size, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(opt.crf ?? 18), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-r', String(opt.fps), `${base}.mp4`);
      if (opt.formats.includes('webm')) outputs.push('-map', '0:v', ...(audio ? ['-map', '1:a', '-c:a', 'libopus', '-b:a', '96k', '-shortest'] : []), '-vf', size, '-c:v', 'libvpx-vp9', '-crf', String(opt['vp9-crf'] ?? 33), '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4', '-pix_fmt', 'yuv420p', '-r', String(opt.fps), `${base}.webm`);
      if (opt.formats.includes('preview')) outputs.push('-map', '0:v', '-vf', `fps=12,scale=${previewWidth}:-2:flags=lanczos`, '-c:v', 'libwebp_anim', '-lossless', '0', '-q:v', '62', '-compression_level', '6', '-loop', '0', `${base}.preview.webp`);
      const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(opt.fps), '-c:v', 'png', '-i', '-', ...(audio ? ['-i', audio] : []), ...outputs], { stdio: ['pipe', 'inherit', 'inherit'] });
      const done = new Promise((ok, fail) => ff.once('exit', code => (code === 0 ? ok() : fail(new Error(`ffmpeg exited ${code}`)))));
      for (let i = 0; i < count; i += 1) {
        const t = Math.min(to, from + (i * 1000) / opt.fps);
        const png = await shot(t);
        if (!ff.stdin.write(png)) await new Promise(ok => ff.stdin.once('drain', ok));
      }
      ff.stdin.end();
      await done;
      const posterT = opt.poster ?? Math.round(info.end * 0.6);
      const poster = await shot(posterT);
      await writeFile(`${base}.poster.png`, poster);
      if (opt['poster-formats'].includes('webp')) execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', `${base}.poster.png`, '-c:v', 'libwebp', '-q:v', '82', `${base}.poster.webp`]);
      const kept = [
        ...opt.formats.filter(name => name !== 'preview').map(name => ['video', name]),
        ...(opt.formats.includes('preview') ? [['preview', 'preview.webp']] : []),
        ...opt['poster-formats'].map(name => ['poster', `poster.${name}`]),
      ];
      if (!opt['poster-formats'].includes('png')) await import('node:fs/promises').then(fs => fs.rm(`${base}.poster.png`));
      for (const [kind, ext] of kept) {
        const file = `${base}.${ext}`;
        const bytes = await readFile(file);
        written.push(file);
        record.outputs.push({ kind, file: relative(repoRoot, file), sha256: sha256(bytes), bytes: bytes.length, ...(kind === 'poster' ? { t: posterT } : {}), ...(kind === 'video' ? { fps: opt.fps, frames: count, durationMs: to - from, from, to, audio: audio ? relative(repoRoot, audio) : null } : {}) });
      }
    }
    await writeFile(join(outDir, `${opt.name}.render.json`), `${JSON.stringify(record, null, 2)}\n`);
    console.log(`${opt.name}: ${record.outputs.length} outputs in ${relative(repoRoot, outDir)}`);
    await page.close();
  } finally {
    browser.close();
    await handle.close();
    await server.close?.();
  }
}

main().catch(error => { console.error(error); process.exit(1); });
