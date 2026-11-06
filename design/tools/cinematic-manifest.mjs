// mothership:dev-only
//
// The cinematic library's export manifest: every editable source and every export, with its
// SHA-256 and size, and for pictures, videos and sounds what ffprobe measures (dimensions, frame
// rate, duration, codecs, pixel format, alpha), the render record that made it (stage address,
// browser, encoder, poster time), its class (runtime-eligible or review-only) and the audience it
// may be shown to. Re-hashes every file: a render record whose hash no longer matches fails.
//   node design/tools/cinematic-manifest.mjs
// Writes design/cinematic/exports/manifest.json. Needs ffprobe.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const EX = resolve(repoRoot, 'design/cinematic/exports');
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const rel = file => relative(repoRoot, file).split('\\').join('/');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(path));
    else out.push(path);
  }
  return out;
}

/** A WebP's canvas size and, when animated, its frame count and total duration, from its RIFF chunks (ffprobe cannot decode animated WebP). */
function webpInfo(bytes) {
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') return {};
  const u24 = at => bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);
  let width = null, height = null, frames = 0, durationMs = 0;
  for (let at = 12; at + 8 <= bytes.length;) {
    const id = bytes.toString('ascii', at, at + 4), size = bytes.readUInt32LE(at + 4), body = at + 8;
    if (id === 'VP8X') { width = 1 + u24(body + 4); height = 1 + u24(body + 7); }
    else if (id === 'VP8 ' && width === null) { width = bytes.readUInt16LE(body + 6) & 0x3fff; height = bytes.readUInt16LE(body + 8) & 0x3fff; }
    else if (id === 'VP8L' && width === null) { const b = bytes.readUInt32LE(body + 1); width = (b & 0x3fff) + 1; height = ((b >> 14) & 0x3fff) + 1; }
    else if (id === 'ANMF') { frames += 1; durationMs += u24(body + 12); }
    at = body + size + (size % 2);
  }
  return { width, height, codec: 'webp', ...(frames ? { frames, durationMs, animated: true } : { animated: false }) };
}

function probe(file) {
  try {
    const raw = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt,duration,nb_frames,sample_rate,channels:format=duration', '-of', 'json', file]).toString());
    const streams = raw.streams ?? [];
    const v = streams.find(s => s.codec_type === 'video');
    const a = streams.find(s => s.codec_type === 'audio');
    const fps = v?.r_frame_rate && v.r_frame_rate !== '0/0' ? Number(v.r_frame_rate.split('/')[0]) / Number(v.r_frame_rate.split('/')[1]) : null;
    return {
      ...(v ? { width: v.width, height: v.height, codec: v.codec_name, pixelFormat: v.pix_fmt ?? null, alpha: /a|rgba|yuva/.test(v.pix_fmt ?? '') && !/^yuv420p$/.test(v.pix_fmt ?? '') } : {}),
      ...(fps && fps < 1000 && !/^(png|mjpeg|webp)$/.test(v?.codec_name ?? '') ? { fps: Math.round(fps * 1000) / 1000 } : {}),
      ...(raw.format?.duration ? { durationMs: Math.round(Number(raw.format.duration) * 1000) } : {}),
      ...(a ? { audio: { codec: a.codec_name, sampleRate: Number(a.sample_rate), channels: a.channels } } : {}),
    };
  } catch {
    return {};
  }
}

const SOURCES = [
  'design/cinematic/README.md',
  'design/cinematic/stage.html', 'design/cinematic/stage.mjs', 'design/cinematic/gallery.html', 'design/cinematic/gallery.mjs',
  'design/cinematic/lib/ease.mjs', 'design/cinematic/lib/comic.mjs', 'design/cinematic/lib/lettering.mjs', 'design/cinematic/lib/scene.mjs', 'design/cinematic/lib/audio.mjs', 'design/cinematic/lib/stage-kit.mjs', 'design/cinematic/lib/visibility.mjs',
  'design/cinematic/pilots/index.mjs',
  ...['hospital-rescue/film.mjs', 'hospital-rescue/art.mjs', 'hospital-rescue/compose.mjs', 'hospital-rescue/stage.mjs', 'blackhole/film.mjs', 'blackhole/art.mjs', 'blackhole/compose.mjs', 'blackhole/stage.mjs', 'private-talk/film.mjs', 'private-talk/compose.mjs', 'private-talk/stage.mjs', 'eject/film.mjs', 'eject/compose.mjs', 'eject/stage.mjs'].map(p => `design/cinematic/pilots/${p}`),
  'design/cinematic/catalogue/catalogue.mjs',
  'design/tools/cinematic-inventory.mjs', 'design/tools/cinematic-contact.mjs', 'design/tools/cinematic-render.mjs', 'design/tools/cinematic-exports.mjs', 'design/tools/cinematic-audio.mjs', 'design/tools/cinematic-manifest.mjs', 'design/tools/cinematic-docs.mjs', 'design/tools/cinematic-serve.mjs',
];

const AUDIENCE = { 'hospital-rescue': 'public (RESCUED)', blackhole: 'public (BLACKHOLE_SYNCED)', 'private-talk': 'public pair and transitions (hackSession); no pair-private content', eject: 'public (the Captain\'s EJECT outcome: its kind and seatIds)' };

const manifest = {
  version: 'cinematic-exports-0.1.0',
  generatedBy: 'design/tools/cinematic-manifest.mjs',
  contract: 'protocol 3 candidate, packages/contracts/src/planet-game.ts at 79418e72dba99ba99afe047ecb97467fb5e73b62',
  classes: {
    runtime: 'identity-free: no player name, character, role, outcome, control or variable text; eligible as a prerendered runtime movie with its poster and animated alternative, after Integration review',
    review: 'synthetic fixture identities drawn in (board-v2 review fixtures); for review only, never a runtime asset: a runtime draws its own match from the frame functions',
    stills: 'storyboard frames for the live-action studies (review only)',
    audio: 'public cue mixes, procedurally synthesized; a runtime plays the cue sheet itself under the device sound setting',
  },
  sources: [],
  exports: [],
};
for (const path of SOURCES) {
  try {
    const bytes = await readFile(resolve(repoRoot, path));
    manifest.sources.push({ path, sha256: sha256(bytes), bytes: bytes.length });
  } catch {
    manifest.sources.push({ path, missing: true });
  }
}
const records = new Map();
for (const file of (await walk(EX)).filter(f => f.endsWith('.render.json'))) {
  const record = JSON.parse(await readFile(file, 'utf8'));
  for (const out of record.outputs) records.set(out.file, { record, out });
}
const problems = [];
for (const file of (await walk(EX)).sort()) {
  if (file.endsWith('manifest.json')) continue;
  const path = rel(file);
  const bytes = await readFile(file);
  const hash = sha256(bytes);
  const [pilot, kind] = path.replace('design/cinematic/exports/', '').split('/');
  const entry = { path, pilot: pilot.endsWith('.json') ? null : pilot, class: kind ?? 'record', sha256: hash, bytes: bytes.length };
  if (path.endsWith('.webp')) Object.assign(entry, webpInfo(bytes));
  else if (/\.(mp4|webm|png|wav|m4a|opus)$/.test(path)) Object.assign(entry, probe(file));
  const made = records.get(path);
  if (made) {
    if (made.out.sha256 !== hash) problems.push(`${path}: render record says ${made.out.sha256}`);
    Object.assign(entry, { kind: made.out.kind, surface: made.record.surface, variant: made.record.variant, stage: made.record.stage, browser: made.record.browser, encoder: made.record.encoder, deviceScale: made.record.deviceScale, ...(made.out.t !== undefined ? { posterT: made.out.t } : {}), ...(made.out.frames ? { frames: made.out.frames, timelineMs: [made.out.from, made.out.to] } : {}), ...(made.out.audio ? { audioMix: made.out.audio } : {}) });
  }
  if (entry.pilot && AUDIENCE[entry.pilot]) entry.audience = AUDIENCE[entry.pilot];
  manifest.exports.push(entry);
}
manifest.totals = { sources: manifest.sources.length, exports: manifest.exports.length, bytes: manifest.exports.reduce((sum, e) => sum + e.bytes, 0) };
await writeFile(join(EX, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${manifest.sources.length} sources, ${manifest.exports.length} exports, ${(manifest.totals.bytes / 1e6).toFixed(1)} MB`);
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

// ---------- the readable export manifest (docs/design/cinematic/export-manifest.md) ----------

const { mkdir: mkdirDoc } = await import('node:fs/promises');
const docPath = resolve(repoRoot, 'docs/design/cinematic/export-manifest.md');
await mkdirDoc(resolve(repoRoot, 'docs/design/cinematic'), { recursive: true });
const mb = bytes => (bytes / 1e6).toFixed(2);
const dims = e => (e.width ? `${e.width}×${e.height}` : '');
const timing = e => [e.fps ? `${e.fps} fps` : '', e.durationMs ? `${(e.durationMs / 1000).toFixed(2)} s` : '', e.frames && e.animated ? `${e.frames} frames` : ''].filter(Boolean).join(', ');
const codec = e => [e.codec, e.pixelFormat, e.alpha ? 'alpha' : (e.codec && e.codec !== 'webp' ? 'no alpha' : ''), e.audio ? `${e.audio.codec} ${e.audio.sampleRate / 1000} kHz` : ''].filter(Boolean).join(', ');
const row = e => `| \`${e.path.replace('design/cinematic/exports/', '')}\` | \`${e.sha256}\` | ${mb(e.bytes)} | ${dims(e)} | ${timing(e)} | ${codec(e)} |`;
const head = ['| File | SHA-256 | MB | Size | Timing | Codec |', '| --- | --- | --- | --- | --- | --- |'];
const section = (title, note, filter) => {
  const list = manifest.exports.filter(filter);
  return list.length ? [`## ${title}`, '', note, '', ...head, ...list.map(row), ''] : [];
};
const lines = [
  '# Cinematic export manifest',
  '',
  `Generated by \`node design/tools/cinematic-manifest.mjs\` from the files themselves (every hash re-computed; a render record that disagrees fails the tool). Machine-readable twin: \`design/cinematic/exports/manifest.json\` (render records, stage addresses, browser and encoder per file). ${manifest.totals.exports} files, ${mb(manifest.totals.bytes)} MB; contract: ${manifest.contract}.`,
  '',
  'Classes: **runtime** = identity-free, eligible as prerendered movies after Integration review; **review** = synthetic fixture identities drawn in, review only; **stills** = storyboard frames for the live-action studies; **audio** = public cue mixes (procedural).',
  '',
  ...section('Runtime-eligible (identity-free)', 'No name, character, role, outcome, control or variable text. Each video has a poster (PNG and WebP) and a lightweight animated WebP alternative; none carries audio (a runtime plays the cue sheet under the device sound setting).', e => e.class === 'runtime'),
  ...section('Audio (public cue mixes)', 'Synthesized by `design/cinematic/lib/audio.mjs`; no samples, recordings or licences. WAV is the editable master; AAC (m4a) and Opus encodes for runtime use.', e => e.class === 'audio'),
  ...section('Review renders', 'Synthetic fixtures from the board-v2 review page (Rigel, Mira, Echo; Vega and Orion). Review only: a runtime draws its own match from the frame functions.', e => e.class === 'review'),
  ...section('Storyboard stills', 'Full-size frames of the cinematic forms (the Rescue cut, the Blackhole stage cut, the capsule page) at the beats the live-action studies name.', e => e.class === 'stills'),
  '## Editable sources',
  '',
  '| File | SHA-256 | Bytes |',
  '| --- | --- | --- |',
  ...manifest.sources.map(s => `| \`${s.path}\` | ${s.missing ? 'missing' : `\`${s.sha256}\``} | ${s.bytes ?? ''} |`),
  '',
];
await writeFile(docPath, `${lines.join('\n')}\n`);
console.log(`export-manifest.md: ${manifest.exports.length} files`);
