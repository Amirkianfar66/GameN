// mothership:dev-only
//
// Renders every pilot's public cue sheets (each pilot's film.mjs AUDIO) to sound files with the
// cinematic library's procedural cues (design/cinematic/lib/audio.mjs: synthesized, no samples):
//   node design/tools/cinematic-audio.mjs
// Writes design/cinematic/exports/<pilot>/audio/<pilot>-<sheet>.cues.{wav,m4a,opus} and an
// audio.json record (cue sheet, length, hashes). Needs ffmpeg for the AAC and Opus encodes.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RATE, mix, wav } from '../cinematic/lib/audio.mjs';
import { AUDIO as HOSPITAL, pilotEnd } from '../cinematic/pilots/hospital-rescue/film.mjs';
import { AUDIO as BLACKHOLE, filmEnd } from '../cinematic/pilots/blackhole/film.mjs';
import { AUDIO as TALK, pageEnd } from '../cinematic/pilots/private-talk/film.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const out = resolve(repoRoot, 'design/cinematic/exports');
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');

const SHEETS = [
  ['hospital-rescue', 'full', HOSPITAL.full, pilotEnd('full')],
  ['hospital-rescue', 'short', HOSPITAL.short, pilotEnd('short')],
  ['hospital-rescue', 'reduced', HOSPITAL.reduced, pilotEnd('reduced')],
  ['blackhole', 'full', BLACKHOLE.full, filmEnd('display', 'full')],
  ['blackhole', 'short', BLACKHOLE.short, filmEnd('phone', 'full')],
  ['blackhole', 'reduced', BLACKHOLE.reduced, filmEnd('display', 'reduced')],
  ['private-talk', 'entrance', TALK.entrance, pageEnd('entrance', 'full')],
  ['private-talk', 'exit', TALK.exit, pageEnd('exit', 'full')],
  ['private-talk', 'reduced', TALK.reduced, pageEnd('entrance', 'reduced')],
];

const record = { tool: 'design/tools/cinematic-audio.mjs', synthesis: 'design/cinematic/lib/audio.mjs (procedural; no samples, recordings or licences)', rate: RATE, encoder: execFileSync('ffmpeg', ['-hide_banner', '-version']).toString().split('\n')[0], sheets: [] };
for (const [pilot, name, sheet, lengthMs] of SHEETS) {
  const dir = join(out, pilot, 'audio');
  await mkdir(dir, { recursive: true });
  const base = join(dir, `${pilot}-${name}.cues`);
  await writeFile(`${base}.wav`, wav(mix(sheet, lengthMs + 400)));
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', `${base}.wav`, '-c:a', 'aac', '-b:a', '128k', `${base}.m4a`]);
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', `${base}.wav`, '-c:a', 'libopus', '-b:a', '96k', `${base}.opus`]);
  const files = [];
  for (const ext of ['wav', 'm4a', 'opus']) {
    const bytes = await readFile(`${base}.${ext}`);
    files.push({ file: relative(repoRoot, `${base}.${ext}`), sha256: sha256(bytes), bytes: bytes.length });
  }
  record.sheets.push({ pilot, sheet: name, lengthMs: lengthMs + 400, cues: sheet, files });
  console.log(`${pilot}-${name}: ${files.map(entry => `${entry.file} ${entry.bytes}`).join(', ')}`);
}
await writeFile(join(out, 'audio.json'), `${JSON.stringify(record, null, 2)}\n`);
