// mothership:dev-only
//
// Every export of the three cinematic pilots and the library groups' public films, rendered from
// their stages with the local Chromium
// and ffmpeg (design/tools/cinematic-render.mjs), two at a time:
//   node design/tools/cinematic-exports.mjs [--only <name-prefix>]
// Writes design/cinematic/exports/<pilot>/{review,runtime,stills}/. Run cinematic-audio.mjs first
// (the review videos carry the public cue mix), and cinematic-manifest.mjs after.
//
//   review    a synthetic fixture's identities drawn in (Rigel, Vega, Orion...): review only, never a
//             runtime asset (a runtime draws its own match's characters from the frame functions)
//   runtime   identity-free inserts with no name, role, outcome, control or text that varies:
//             eligible as prerendered runtime movies, each with its poster and animated alternative
//   stills    storyboard frames for the live-action studies (WebP)

import { execFile, execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const EX = 'design/cinematic/exports';
const audio = (pilot, sheet) => `${EX}/${pilot}/audio/${pilot}-${sheet}.cues.wav`;
const review = { formats: 'mp4,preview', crf: '22', 'poster-formats': 'webp' };
const runtime = { formats: 'mp4,webm,preview', crf: '18', 'vp9-crf': '32', 'poster-formats': 'png,webp', 'preview-width': '480' };
const display = { scale: '0.6667', 'preview-width': '480' };
const phone = (w, h) => ({ surface: 'phone', w: String(w), h: String(h), scale: '1.5', 'preview-width': '240' });

export const JOBS = [
  // Pilot 1: the Hospital's drone and recovery
  { pilot: 'hospital-rescue', name: 'review/display-full', surface: 'display', variant: 'full', ...display, ...review, audio: audio('hospital-rescue', 'full'), poster: '3800' },
  { pilot: 'hospital-rescue', name: 'review/display-short', surface: 'display', variant: 'short', ...display, ...review, audio: audio('hospital-rescue', 'short'), poster: '900' },
  { pilot: 'hospital-rescue', name: 'review/display-reduced', surface: 'display', variant: 'reduced', ...display, ...review, audio: audio('hospital-rescue', 'reduced'), poster: '1200' },
  { pilot: 'hospital-rescue', name: 'review/phone390-full', ...phone(390, 844), variant: 'full', ...review, audio: audio('hospital-rescue', 'full'), poster: '3700' },
  { pilot: 'hospital-rescue', name: 'review/phone390-short', ...phone(390, 844), variant: 'short', ...review, audio: audio('hospital-rescue', 'short'), poster: '900' },
  { pilot: 'hospital-rescue', name: 'review/phone390-reduced', ...phone(390, 844), variant: 'reduced', ...review, audio: audio('hospital-rescue', 'reduced'), poster: '1200' },
  { pilot: 'hospital-rescue', name: 'review/phone320-full', ...phone(320, 568), variant: 'full', ...review, audio: audio('hospital-rescue', 'full'), poster: '3700' },
  { pilot: 'hospital-rescue', name: 'runtime/drone-insert', surface: 'insert', variant: 'full', ...runtime, poster: '900' },
  // Pilot 2: the Blackhole reveal and the ship's passage
  { pilot: 'blackhole', name: 'review/display-full', surface: 'display', variant: 'full', ...display, ...review, audio: audio('blackhole', 'full'), poster: '2200' },
  { pilot: 'blackhole', name: 'review/display-short', surface: 'display', variant: 'short', ...display, ...review, audio: audio('blackhole', 'short'), poster: '1200' },
  { pilot: 'blackhole', name: 'review/display-reduced', surface: 'display', variant: 'reduced', ...display, ...review, audio: audio('blackhole', 'reduced'), poster: '700' },
  { pilot: 'blackhole', name: 'review/phone390-full', ...phone(390, 844), variant: 'full', ...review, audio: audio('blackhole', 'short'), poster: '1200' },
  { pilot: 'blackhole', name: 'review/phone390-reduced', ...phone(390, 844), variant: 'reduced', ...review, audio: audio('blackhole', 'reduced'), poster: '600' },
  { pilot: 'blackhole', name: 'runtime/space-insert-titled', surface: 'insert', variant: 'full', ...runtime, poster: '1600' },
  { pilot: 'blackhole', name: 'runtime/space-insert-textless', surface: 'insert', variant: 'full', params: ['case=textless'], ...runtime, poster: '1600' },
  // Pilot 3: the Private Talk capsule
  { pilot: 'private-talk', name: 'review/display-entrance-full', surface: 'display', variant: 'full', params: ['case=entrance'], ...display, ...review, audio: audio('private-talk', 'entrance'), poster: '3000' },
  { pilot: 'private-talk', name: 'review/display-talk-excerpt', surface: 'display', variant: 'full', params: ['case=talk'], ...display, ...review, poster: '3000' },
  { pilot: 'private-talk', name: 'review/display-exit-full', surface: 'display', variant: 'full', params: ['case=exit'], ...display, ...review, audio: audio('private-talk', 'exit'), poster: '1000' },
  { pilot: 'private-talk', name: 'review/display-entrance-reduced', surface: 'display', variant: 'reduced', params: ['case=entrance'], ...display, ...review, audio: audio('private-talk', 'reduced'), poster: '1000' },
  { pilot: 'private-talk', name: 'review/display-exit-reduced', surface: 'display', variant: 'reduced', params: ['case=exit'], ...display, ...review, poster: '500' },
  { pilot: 'private-talk', name: 'review/phone390-s2-entrance', ...phone(390, 844), variant: 'full', params: ['case=entrance'], ...review, audio: audio('private-talk', 'entrance'), poster: '3000' },
  { pilot: 'private-talk', name: 'review/phone390-s2-exit', ...phone(390, 844), variant: 'full', params: ['case=exit'], ...review, audio: audio('private-talk', 'exit'), poster: '1000' },
  // Library group 2 (design/library/navigation/): the neutral transit, the same for every movement, and both arrivals.
  { pilot: 'navigation', name: 'review/display-transit-full', surface: 'display', variant: 'full', params: ['case=transit'], ...display, ...review, audio: audio('navigation', 'transit'), poster: '1200' },
  { pilot: 'navigation', name: 'review/display-transit-reduced', surface: 'display', variant: 'reduced', params: ['case=transit'], ...display, ...review, poster: '600' },
  { pilot: 'navigation', name: 'review/phone390-transit-full', ...phone(390, 844), variant: 'full', params: ['case=transit'], ...review, audio: audio('navigation', 'transit-short'), poster: '900' },
  { pilot: 'navigation', name: 'review/display-arrival-blue-full', surface: 'display', variant: 'full', params: ['case=arrival-blue'], ...display, ...review, audio: audio('navigation', 'arrival'), poster: '4100' },
  { pilot: 'navigation', name: 'review/display-arrival-red-full', surface: 'display', variant: 'full', params: ['case=arrival-red'], ...display, ...review, audio: audio('navigation', 'arrival'), poster: '4100' },
  { pilot: 'navigation', name: 'review/display-arrival-red-reduced', surface: 'display', variant: 'reduced', params: ['case=arrival-red'], ...display, ...review, audio: audio('navigation', 'reduced'), poster: '1100' },
  { pilot: 'navigation', name: 'review/phone390-arrival-blue-full', ...phone(390, 844), variant: 'full', params: ['case=arrival-blue'], ...review, audio: audio('navigation', 'arrival-short'), poster: '3300' },
  { pilot: 'navigation', name: 'review/phone390-arrival-red-full', ...phone(390, 844), variant: 'full', params: ['case=arrival-red'], ...review, audio: audio('navigation', 'arrival-short'), poster: '3300' },
  { pilot: 'navigation', name: 'runtime/transit-insert', surface: 'insert', variant: 'full', params: ['case=transit'], ...runtime, poster: '1200' },
  { pilot: 'navigation', name: 'runtime/arrival-blue-insert', surface: 'insert', variant: 'full', params: ['case=arrival-blue'], ...runtime, poster: '4100' },
  { pilot: 'navigation', name: 'runtime/arrival-red-insert', surface: 'insert', variant: 'full', params: ['case=arrival-red'], ...runtime, poster: '4100' },
  // The Captain's EJECT as a display cut over the approved S7; the phones keep S7.
  { pilot: 'eject', name: 'review/display-full', surface: 'display', variant: 'full', ...display, ...review, audio: audio('eject', 'full'), poster: '3700' },
  { pilot: 'eject', name: 'review/display-reduced', surface: 'display', variant: 'reduced', ...display, ...review, audio: audio('eject', 'reduced'), poster: '900' },
  { pilot: 'eject', name: 'runtime/exterior-insert', surface: 'insert', variant: 'full', ...runtime, poster: '1200' },
];

/** Storyboard frames for the live-action studies: full-size display frames, kept as WebP. */
export const STILLS = [
  { pilot: 'hospital-rescue', surface: 'display', variant: 'full', ts: [300, 950, 1300, 2600, 3300, 3600, 4500, 5300] },
  { pilot: 'blackhole', surface: 'display', variant: 'full', ts: [500, 1000, 1500, 2700, 3150, 3550, 4100, 4700] },
  { pilot: 'private-talk', surface: 'display', variant: 'full', params: ['case=entrance'], ts: [150, 1100, 1300, 1800, 2400, 3000, 3700] },
];

async function render(job) {
  const args = ['design/tools/cinematic-render.mjs', '--pilot', job.pilot, '--out', `${EX}/${job.pilot}/${job.name.split('/')[0]}`, '--name', job.name.split('/')[1], '--video'];
  for (const [key, value] of Object.entries(job)) {
    if (['pilot', 'name', 'params'].includes(key)) continue;
    args.push(`--${key}`, value);
  }
  for (const param of job.params ?? []) args.push('--param', param);
  const started = Date.now();
  const { stdout } = await run(process.execPath, args, { cwd: repoRoot, maxBuffer: 1 << 24 });
  console.log(`${job.pilot}/${job.name}: ${((Date.now() - started) / 1000).toFixed(0)} s ${stdout.trim()}`);
}

async function stills(entry) {
  const scratch = await mkdtemp(join(tmpdir(), 'cine-stills-'));
  try {
    const args = ['design/tools/cinematic-render.mjs', '--pilot', entry.pilot, '--surface', entry.surface, '--variant', entry.variant, '--out', scratch, '--name', 'still', '--stills', entry.ts.join(',')];
    for (const param of entry.params ?? []) args.push('--param', param);
    await run(process.execPath, args, { cwd: repoRoot, maxBuffer: 1 << 24 });
    const dir = join(repoRoot, EX, entry.pilot, 'stills');
    await mkdir(dir, { recursive: true });
    for (const file of (await readdir(scratch)).filter(name => name.endsWith('.png'))) {
      execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', join(scratch, file), '-c:v', 'libwebp', '-q:v', '84', join(dir, file.replace(/^still-/, 'frame-').replace(/\.png$/, '.webp'))]);
    }
    console.log(`${entry.pilot}/stills: ${entry.ts.length}`);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const queue = [...JOBS.filter(job => !only || `${job.pilot}/${job.name}`.startsWith(only)).map(job => () => render(job)), ...(only ? [] : STILLS.map(entry => () => stills(entry)))];
const failures = [];
await Promise.all(Array.from({ length: 2 }, async () => {
  while (queue.length) {
    const next = queue.shift();
    try { await next(); } catch (error) { failures.push(error.message); console.error(error.message.split('\n').slice(0, 4).join('\n')); }
  }
}));
if (failures.length) { console.error(`${failures.length} failed`); process.exit(1); }
console.log('all exports rendered');
