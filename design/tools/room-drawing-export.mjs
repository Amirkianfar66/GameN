// mothership:dev-only
//
// The room drawing release's exports and handoff record (DSN-REQ-18,
// docs/design/room-drawing-release.md). The owner approved the five rooms redrawn to match the
// crew (design/room-pilot/, PR #197) on 8 November 2026. For every room picture the board shows
// today, this writes its replacement to design/room-drawing/assets/:
// - <room>.back.svg: the room behind every place (the scene art's --bm-scene-<room>-back; the
//   Hospital's four-berth ward is the films art's --board-v2-film-scenes-hospital-ward-four-back);
// - <room>.<layer>.svg: each layer drawn in front of the places behind it (Room B's bench, the
//   Command Room's table, the ward's berths);
// - <room>.dark.svg: the room with its lights out, the back and its layers together, for the
//   Blackout (the motion art's --board-v2-motion-<room>-dark; the ward's is the films art's).
// Each is the redrawn picture (design/room-pilot/rooms.mjs), its lights-out picture drawn from it
// (design/room-pilot/night.mjs), trimmed for release (design/room-pilot/trim.mjs). It writes
// assets/manifest.json (each export's hash, size, depth and the shipped picture and property it
// replaces) and release-candidate.json (the approval, the sources and inputs with their hashes, the
// trim, the consumers and their exact-release dispatch, what is not replaced, the size).
//
// Usage: node design/tools/room-drawing-export.mjs [--check]
//   --check: draws everything and compares it with the files on disk; writes nothing; exits 1 on any difference.

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nightRoomSvg } from '../room-pilot/night.mjs';
import { ROOMS, redrawRoom } from '../room-pilot/rooms.mjs';
import { SMALL, TOLERANCE, trimSvg } from '../room-pilot/trim.mjs';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
export const RELEASE = 'room-drawing-1.0.0';
export const OUT = 'design/room-drawing';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const text = path => readFileSync(resolve(root, path), 'utf8');
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const gzipBytes = value => gzipSync(value, { level: 9 }).length;

/** The approval this release packages, and the commit it is built on. */
export const APPROVAL = Object.freeze({
  owner: Object.freeze([
    Object.freeze({ date: '2026-11-07', words: 'can you also improve each room match with he quality of the new characters? lets start with 1 room image as a test? what do you think?' }),
    Object.freeze({ date: '2026-11-08', words: 'I am really happy with rooms let do it for all', on: 'Room A, redrawn by hand' }),
    Object.freeze({ date: '2026-11-08', words: 'yes I am happy', on: 'the five rooms' }),
  ]),
  record: 'docs/design/owner-decisions.md',
  review: 'https://github.com/Amirkianfar66/GameN/pull/197',
  baseCommit: 'a1ad3e541f3b7ea0789b4ec2f2dd777c7764f414',
  designRelease: 'design-0.7.0',
  tokens: '0.5.0',
});

export const PROVENANCE = Object.freeze({
  drawn: "Drawn in code for this repository by the Visual and Motion Designer (Claude Code): Room A by hand (design/room-pilot/room-a.mjs), the other four shape for shape from today's pictures (design/room-pilot/ink-room.mjs), all with the approved crew's ink canvas (design/crew-drawing/source/ink.mjs) in each room's colour family (tokens 0.5.0 color.room.*). The lights-out pictures follow the reviewed night rule (design/board-v2/scenes/lighting.mjs).",
  rights: 'Original work for the Mothership project. No third-party artwork, font, stock asset or photograph. Use inside the project only.',
});

/** The scene layers' stylesheet the scene art bundle is built from, and the two catalogs. */
const SCENES_CSS = 'design/board-motion/assets/board-motion.scenes.css';
const MOTION_CATALOG = 'design/releases/board-v2-motion-art.json';
const FILMS_CATALOG = 'apps/game/hosted/board-v2-film-art/catalog.json';

/** What a redrawn picture replaces: the bundle, its property, and the picture shipped today. */
function replaced(r, layer) {
  const dark = layer === 'dark';
  if (r.id === 'hospital') {
    const films = JSON.parse(text(FILMS_CATALOG)).assets;
    const runtimePath = dark ? 'apps/game/hosted/board-v2-film-art/lighting/hospital-ward-four.dark.svg' : `apps/game/hosted/board-v2-film-art/scenes/hospital-ward-four.${layer}.svg`;
    const entry = films.find(asset => asset.runtimePath === runtimePath);
    if (!entry) throw new Error(`The films catalog has no ${runtimePath}`);
    return { bundle: 'board-v2-films-art', cssVariable: entry.cssVariable, catalog: FILMS_CATALOG, path: runtimePath, sha256: sha(readFileSync(resolve(root, runtimePath))), source: entry.sourcePath, sourceCommit: entry.sourceCommit };
  }
  if (dark) {
    const entry = JSON.parse(text(MOTION_CATALOG)).assets.find(asset => asset.id === `${r.id}-dark`);
    if (!entry) throw new Error(`The motion catalog has no ${r.id}-dark`);
    return { bundle: 'board-v2-motion-art', cssVariable: entry.cssVariable, catalog: MOTION_CATALOG, path: entry.source, sha256: sha(readFileSync(resolve(root, entry.source))) };
  }
  const path = layer === 'back' ? r.today.back : r.today.layers[layer];
  const cssVariable = `--bm-scene-${r.id}-${layer}`;
  if (!text(SCENES_CSS).includes(`${cssVariable}:`)) throw new Error(`${SCENES_CSS} has no ${cssVariable}`);
  return { bundle: 'scene-art', cssVariable, stylesheet: SCENES_CSS, path, sha256: sha(readFileSync(resolve(root, path))) };
}

/** Every export: { path, content (trimmed), drawn (untrimmed), entry } for the manifest. */
export function build() {
  const exports = [];
  for (const r of ROOMS) {
    const art = redrawRoom(r, text);
    const byDepth = Object.entries(r.scene.layers ?? {}).sort(([, a], [, b]) => a.depth - b.depth).map(([id]) => id);
    const pictures = [
      ['back', 'back', null, art.back],
      ...byDepth.map(id => ['layer', id, r.scene.layers[id].depth, art.layers[id]]),
      ['dark', 'dark', null, nightRoomSvg([art.back, ...byDepth.map(id => art.layers[id])])],
    ];
    for (const [kind, layer, depth, drawn] of pictures) {
      const content = trimSvg(drawn);
      const path = `${OUT}/assets/${r.id}.${layer}.svg`;
      exports.push({
        path, content, drawn,
        entry: {
          path, sha256: sha(content), bytes: Buffer.byteLength(content), gzipBytes: gzipBytes(content),
          kind, room: r.id, layer, depth, audience: 'public', viewBox: '0 0 1024 768', width: 1024, height: 768,
          drawn: { bytes: Buffer.byteLength(drawn), gzipBytes: gzipBytes(drawn) },
          replaces: replaced(r, layer),
        },
      });
    }
  }
  return exports;
}

const SOURCES = [
  'design/room-pilot/rooms.mjs', 'design/room-pilot/room-a.mjs', 'design/room-pilot/ink-room.mjs', 'design/room-pilot/ward-four.mjs',
  'design/room-pilot/night.mjs', 'design/room-pilot/trim.mjs', 'design/tools/room-drawing-export.mjs',
];
const DEPENDENCIES = ['design/crew-drawing/source/ink.mjs', 'design/board-v2/scenes/lighting.mjs', 'design/board-motion/scenes/index.mjs', 'design/board-motion/scenes/kit.mjs', 'design/board-motion/figures/body.mjs', 'design/board-motion/figures/gestures.mjs', 'design/board-motion/scenes/frame.mjs'];

export function manifestOf(exports) {
  return {
    schema: 'mothership.room-drawing-assets/1',
    release: RELEASE,
    status: 'Designer candidate (DSN-REQ-18), for an art release after design-0.7.0. Not registered: no shipped manifest, bundle or catalog is changed; Integration builds bundles from these.',
    generatedBy: 'design/tools/room-drawing-export.mjs',
    provenance: PROVENANCE,
    conventions: {
      box: 'Every picture is 1024 x 768 in the scene units of the picture it replaces (viewBox 0 0 1024 768), drawn in the same camera, so every place, slot, focus, frame and press area is unchanged.',
      layers: 'A back picture is drawn behind every place; a layer at its depth (the board paints it at z 2 * depth + 1, over the places behind it); a dark picture is the back and its layers together, as the lights-out pictures it replaces are.',
      markup: 'Each export is an SVG element (no XML declaration or comment), static: no script, style, foreign object, image or external reference; every url() and href points inside the file.',
      audience: 'Public art, the same on every screen: nothing drawn depends on a role, team, ability, private choice or seat.',
    },
    assets: exports.map(item => item.entry),
  };
}

export function releaseCandidate(exports, manifestText) {
  const total = (list, key) => list.reduce((sum, item) => sum + item.entry[key], 0);
  const today = [...new Map(exports.map(item => [item.entry.replaces.path, item.entry.replaces.path])).values()].map(path => readFileSync(resolve(root, path)));
  return {
    schema: 'mothership.room-drawing-release/1',
    release: RELEASE,
    request: 'DSN-REQ-18',
    status: 'Designer candidate for Integration. Registration, bundles, consumer dispatch and device measurement are Integration\'s and Frontend\'s; nothing here is active.',
    approval: APPROVAL,
    sources: SOURCES.map(path => ({ path, sha256: sha(readFileSync(resolve(root, path))) })),
    dependencies: DEPENDENCIES.map(path => ({ path, sha256: sha(readFileSync(resolve(root, path))), note: 'read, not changed' })),
    inputs: ROOMS.flatMap(r => [r.today.back, ...Object.values(r.today.layers)]).map(path => ({ path, sha256: sha(readFileSync(resolve(root, path))) })),
    trim: {
      tolerance: TOLERANCE,
      small: SMALL,
      rule: `Each subpath the ink wrote (absolute M, L and Z only) keeps the fewest of its own points within ${TOLERANCE} units of every point it had (Ramer-Douglas-Peucker), in whole units when it is at least ${SMALL} units across and in tenths when smaller; a subpath that would close on fewer than four points is kept as drawn. Every other path, pattern tile and attribute is kept byte for byte.`,
      evidence: 'design/room-drawing/review/renders.json: each export and the untrimmed picture rendered in desktop Chrome at twice their pixels, compared.',
    },
    assets: {
      manifest: `${OUT}/assets/manifest.json`, manifestSha256: sha(manifestText), count: exports.length,
      bytes: total(exports, 'bytes'), gzipBytes: total(exports, 'gzipBytes'),
      untrimmed: { bytes: exports.reduce((sum, item) => sum + item.entry.drawn.bytes, 0), gzipBytes: exports.reduce((sum, item) => sum + item.entry.drawn.gzipBytes, 0) },
      today: { bytes: today.reduce((sum, bytes) => sum + bytes.length, 0), gzipBytes: today.reduce((sum, bytes) => sum + gzipBytes(bytes), 0), note: 'the pictures these replace, as files (with their headers)' },
    },
    consumers: [
      { module: 'apps/game/hosted/board-v2-host.mjs', reads: 'For each room: --bm-scene-<room>-back and its layers (the scene art bundle), the four-berth ward\'s --board-v2-film-scenes-hospital-ward-four-* (the films art bundle), and in a Blackout --board-v2-motion-<room>-dark or --board-v2-film-lighting-hospital-ward-four-dark.' },
      { module: 'apps/game/hosted/scene-board.mjs', reads: 'The comic board\'s scene mode: --bm-scene-<zone>-back and its layers.' },
    ],
    dispatch: 'Exact release only. These pictures belong to the art release that registers them (after design-0.7.0); every earlier release keeps its bundles byte for byte. A board draws the new rooms only under that release, as the crew\'s exact-release dispatch does, and draws the new crew and the new rooms together.',
    notReplaced: [
      { what: '--bm-scene-hospital-back, --bm-scene-hospital-bed-left and --bm-scene-hospital-bed-right', why: 'the two-bed sick bay of the scene art, which the board no longer draws: board-v2 draws the four-berth ward (HOSPITAL-4-2026-10-18), redrawn here' },
      { what: '--board-v2-art-ward-<7|8|9>-back, --board-v2-art-ward-berth-h<n> and --board-v2-motion-hospital-ward-<7|8|9>-dark', why: 'the roster-sized ward of the earlier ruleset (design-0.4.0); the four-berth successor is redrawn' },
    ],
    unverified: [
      'No phone has drawn these: frame time, decode time and memory on a low-end Android phone and an iPhone are Frontend\'s to measure.',
      'The scene art, motion art and films art bundles are not rebuilt here; their sizes after registration are Integration\'s to report.',
    ],
  };
}

async function main() {
  const check = process.argv.includes('--check');
  const exports = build();
  const manifestText = json(manifestOf(exports));
  const files = new Map(exports.map(item => [item.path, item.content]));
  files.set(`${OUT}/assets/manifest.json`, manifestText);
  files.set(`${OUT}/release-candidate.json`, json(releaseCandidate(exports, manifestText)));
  const problems = [];
  for (const [path, content] of files) {
    const target = resolve(root, path);
    if (check) {
      const disk = await readFile(target, 'utf8').catch(() => null);
      if (disk !== content) problems.push(`${path}: ${disk === null ? 'missing' : 'differs'}`);
    } else {
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content);
    }
  }
  if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; return; }
  console.log(`${check ? 'Checked' : 'Wrote'} ${files.size} files (${exports.length} exports).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
