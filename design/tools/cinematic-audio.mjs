// mothership:dev-only
//
// Renders every pilot's public cue sheets (each pilot's film.mjs AUDIO) to sound files with the
// cinematic library's procedural cues (design/cinematic/lib/audio.mjs: synthesized, no samples):
//   node design/tools/cinematic-audio.mjs [--only <pilot>|<pilot>/<sheet>]
// --only renders those sheets alone and merges their records into audio.json, leaving every other
// sheet's files as they are (the Opus encoder does not repeat its bytes from run to run). A record
// for a sheet no longer listed here is dropped.
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
import { AUDIO as TALK, exitEnd, pageEnd } from '../cinematic/pilots/private-talk/film.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const out = resolve(repoRoot, 'design/cinematic/exports');
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');

const SHEETS = [
  ['hospital-rescue', 'full', HOSPITAL.full, pilotEnd('full')],
  ['hospital-rescue', 'short', HOSPITAL.short, pilotEnd('short')],
  ['hospital-rescue', 'reduced', HOSPITAL.reduced, pilotEnd('reduced')],
  ['blackhole', 'full', BLACKHOLE.full, filmEnd('display', 'full')],
  ['blackhole', 'stage', BLACKHOLE.stage, filmEnd('display', 'stage')],
  ['blackhole', 'reduced', BLACKHOLE.reduced, filmEnd('display', 'reduced')],
  ['private-talk', 'entrance', TALK.entrance, pageEnd('entrance', 'full')],
  ['private-talk', 'exit', TALK.exit, exitEnd('full')],
  ['private-talk', 'reduced', TALK.reduced, pageEnd('entrance', 'reduced')],
];

const at = process.argv.indexOf('--only');
const only = at > 0 ? process.argv[at + 1] : null;
const picked = (pilot, name) => !only || pilot === only || `${pilot}/${name}` === only;
const record = { tool: 'design/tools/cinematic-audio.mjs', synthesis: 'design/cinematic/lib/audio.mjs (procedural; no samples, recordings or licences)', rate: RATE, encoder: execFileSync('ffmpeg', ['-hide_banner', '-version']).toString().split('\n')[0], sheets: [] };
if (only) {
  // Keep every other listed sheet's record as it is.
  const kept = JSON.parse(await readFile(join(out, 'audio.json'), 'utf8')).sheets
    .filter(entry => !picked(entry.pilot, entry.sheet) && SHEETS.some(([pilot, name]) => pilot === entry.pilot && name === entry.sheet));
  record.sheets.push(...kept);
}
for (const [pilot, name, sheet, lengthMs] of SHEETS.filter(([pilot, name]) => picked(pilot, name))) {
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
const order = SHEETS.map(([pilot, name]) => `${pilot}/${name}`);
record.sheets.sort((a, b) => order.indexOf(`${a.pilot}/${a.sheet}`) - order.indexOf(`${b.pilot}/${b.sheet}`));
await writeFile(join(out, 'audio.json'), `${JSON.stringify(record, null, 2)}\n`);
