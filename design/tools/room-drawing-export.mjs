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
import { CAPSULE_PICTURES, DRONE_FRAMES, capsuleArt, jailDoorArt, jailDoorArtModule, medicalArt, medicalArtModule } from '../room-pilot/films.mjs';
import { nightRoomSvg } from '../room-pilot/night.mjs';
import { FAMILIES, ROOMS, redrawRoom } from '../room-pilot/rooms.mjs';
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
const ART_CATALOG = 'design/releases/board-v2-art-candidate.json';
/** Today's film art the films' pieces are drawn from: the medical drone's poses, kept in the release snapshot; the capsule's pictures. */
const SNAPSHOT = 'design/releases/source-snapshots/cb9386bd716dc346160509d5e49d7348fdaf4f84';
const DRONES = DRONE_FRAMES.map(frame => `${SNAPSHOT}/design/board-v2/assets/medical/drone-${frame}.svg`);
const CAPSULE = 'design/board-v2/assets/capsule';

/**
 * The films' code: drop-ins for two of the board's film art modules, with the same exports and
 * geometry (design/room-drawing/source/), and the art they draw, generated here. A port drops the
 * first line (// mothership:dev-only) and rewrites the import specifiers given, nothing else, into a
 * runtime directory of the release's own, so a board dispatches by exact release; the board-v2
 * drawing modules it imports stay where they are.
 */
export const RUNTIME_DIRECTORY = 'apps/game/hosted/room-drawing';
const KIT = { '../../board-motion/scenes/kit.mjs': '../board-v2-drawing/scene-kit.mjs', '../../board-v2/fx/blocked.mjs': '../board-v2-drawing/blocked-fx.mjs', '../../board-v2/fx/label-box.mjs': '../board-v2-drawing/label-box.mjs' };
export const PORTS = Object.freeze([
  { source: `${OUT}/source/captain.mjs`, runtime: `${RUNTIME_DIRECTORY}/captain-fx.mjs`, today: 'apps/game/hosted/board-v2-drawing/captain-fx.mjs', canonical: `${SNAPSHOT}/design/board-v2/fx/captain.mjs`, imports: KIT },
  { source: `${OUT}/source/jail-door-art.mjs`, runtime: `${RUNTIME_DIRECTORY}/jail-door-art.mjs`, today: null, canonical: null, imports: {} },
  { source: `${OUT}/source/medical.mjs`, runtime: `${RUNTIME_DIRECTORY}/medical-fx.mjs`, today: 'apps/game/hosted/board-v2-drawing/medical-fx.mjs', canonical: `${SNAPSHOT}/design/board-v2/fx/medical.mjs`, imports: { ...KIT, '../../board-v2/scenes/hospital-ward.mjs': '../board-v2-drawing/hospital-ward.mjs' } },
  { source: `${OUT}/source/medical-art.mjs`, runtime: `${RUNTIME_DIRECTORY}/medical-art.mjs`, today: null, canonical: null, imports: {} },
]);
/** A source's port: its first line dropped, its import specifiers rewritten, nothing else. */
export function portOf(source, imports) {
  if (!source.startsWith('// mothership:dev-only\n')) throw new Error('A port\'s source starts with the development mark');
  let port = source.slice(source.indexOf('\n') + 1);
  for (const [from, to] of Object.entries(imports)) port = port.replaceAll(`'${from}'`, `'${to}'`);
  return port;
}

/** The generated art modules of the films' code, as { path: text }. */
export function filmModules() {
  return {
    [`${OUT}/source/jail-door-art.mjs`]: jailDoorArtModule(jailDoorArt(text(ROOMS.find(r => r.id === 'jail').today.back), FAMILIES.jail)),
    [`${OUT}/source/medical-art.mjs`]: medicalArtModule(medicalArt(Object.fromEntries(DRONE_FRAMES.map((frame, i) => [frame, text(DRONES[i])])))),
  };
}

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
  // The private-talk capsule beside the Command Room (board-v2-art), redrawn with the rooms.
  const catalog = JSON.parse(text(ART_CATALOG)).assets;
  const capsule = capsuleArt(Object.fromEntries(CAPSULE_PICTURES.map(name => [name, text(`${CAPSULE}/${name}.svg`)])), nightRoomSvg);
  for (const name of [...CAPSULE_PICTURES, 'dark']) {
    const entry = catalog.find(asset => asset.id === `capsule-${name}`);
    if (!entry) throw new Error(`${ART_CATALOG} has no capsule-${name}`);
    const content = capsule.trimmed[name], drawn = capsule.drawn[name], path = `${OUT}/assets/capsule.${name}.svg`;
    exports.push({
      path, content, drawn,
      entry: {
        path, sha256: sha(content), bytes: Buffer.byteLength(content), gzipBytes: gzipBytes(content),
        kind: name === 'dark' ? 'dark' : name === 'back' ? 'back' : 'layer', room: 'capsule', layer: name, depth: null, audience: 'public', viewBox: '0 0 512 768', width: 512, height: 768,
        drawn: { bytes: Buffer.byteLength(drawn), gzipBytes: gzipBytes(drawn) },
        replaces: { bundle: 'board-v2-art', cssVariable: entry.cssVariable, catalog: ART_CATALOG, path: entry.source, sha256: sha(readFileSync(resolve(root, entry.source))) },
      },
    });
  }
  return exports;
}

const SOURCES = [
  'design/room-pilot/rooms.mjs', 'design/room-pilot/room-a.mjs', 'design/room-pilot/ink-room.mjs', 'design/room-pilot/ward-four.mjs',
  'design/room-pilot/night.mjs', 'design/room-pilot/trim.mjs', 'design/room-pilot/films.mjs', 'design/tools/room-drawing-export.mjs',
];
const DEPENDENCIES = ['design/crew-drawing/source/ink.mjs', 'design/board-v2/scenes/lighting.mjs', 'design/board-motion/scenes/index.mjs', 'design/board-motion/scenes/kit.mjs', 'design/board-motion/figures/body.mjs', 'design/board-motion/figures/gestures.mjs', 'design/board-motion/scenes/frame.mjs', 'design/board-v2/fx/blocked.mjs', 'design/board-v2/fx/label-box.mjs', 'design/board-v2/scenes/hospital-ward.mjs'];

export function manifestOf(exports) {
  return {
    schema: 'mothership.room-drawing-assets/1',
    release: RELEASE,
    status: 'Designer candidate (DSN-REQ-18), for an art release after design-0.7.0. Not registered: no shipped manifest, bundle or catalog is changed; Integration builds bundles from these.',
    generatedBy: 'design/tools/room-drawing-export.mjs',
    provenance: PROVENANCE,
    conventions: {
      box: 'Every picture has the box of the picture it replaces in its scene units (a room 0 0 1024 768, the capsule 0 0 512 768), drawn in the same camera, so every place, slot, focus, frame and press area is unchanged.',
      layers: 'A back picture is drawn behind every place; a layer at its depth (the board paints it at z 2 * depth + 1, over the places behind it); a dark picture is the back and its layers together, as the lights-out pictures it replaces are.',
      markup: 'Each export is an SVG element (no XML declaration or comment), static: no script, style, foreign object, image or external reference; every url() and href points inside the file.',
      audience: 'Public art, the same on every screen: nothing drawn depends on a role, team, ability, private choice or seat.',
    },
    assets: exports.map(item => item.entry),
  };
}

export function releaseCandidate(exports, manifestText, generated = filmModules()) {
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
    inputs: [...ROOMS.flatMap(r => [r.today.back, ...Object.values(r.today.layers)]), ...DRONES, ...CAPSULE_PICTURES.map(name => `${CAPSULE}/${name}.svg`)].map(path => ({ path, sha256: sha(readFileSync(resolve(root, path))) })),
    ports: PORTS.map(({ source, runtime, today, canonical, imports }) => {
      const body = generated[source] ?? readFileSync(resolve(root, source), 'utf8');
      return {
        source, sha256: sha(body), runtime, portSha256: sha(portOf(body, imports)), imports,
        ...(today ? { replacesUnderThisRelease: today, todaySha256: sha(readFileSync(resolve(root, today))), dropInFor: canonical, canonicalSha256: sha(readFileSync(resolve(root, canonical))) } : { generated: 'design/tools/room-drawing-export.mjs (design/room-pilot/films.mjs)' }),
      };
    }),
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
      { module: 'apps/game/hosted/board-v2-scene.mjs', reads: 'The private-talk capsule: --board-v2-art-capsule-<back|door-0..3|busy|dark> (the board-v2 art bundle); its badge stays.' },
      { module: 'apps/game/hosted/board-v2-films.mjs', reads: 'The Captain\'s films: jailDoorSvg() and airlockSvg() from board-v2-drawing/captain-fx.mjs; the Hospital\'s: droneSvg(), berthScreenSvg() and lampSvg() from board-v2-drawing/medical-fx.mjs. Under this release they come from the ports in apps/game/hosted/room-drawing/, with the same exports and geometry.' },
    ],
    dispatch: 'Exact release only. These pictures belong to the art release that registers them (after design-0.7.0); every earlier release keeps its bundles byte for byte. A board draws the new rooms only under that release, as the crew\'s exact-release dispatch does, and draws the new crew and the new rooms together.',
    notReplaced: [
      { what: 'The films\' other art: the Captain\'s console inset, plates, cover, glove, click, suction, debris, emergency light, exterior view and plaque; the medical vitals inset, tags, scan line, hologram and pulse; the clone card; the Blackout\'s sparks, impact and markers; the shield', why: 'no room behind them: insets, tags and effects drawn over any room, in the board\'s comic hand; the crew in every film is the crew release\'s, drawn live' },
      { what: '--board-v2-art-capsule-badge', why: 'a tag, not the room' },
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
  const generated = filmModules();
  const files = new Map([...exports.map(item => [item.path, item.content]), ...Object.entries(generated)]);
  files.set(`${OUT}/assets/manifest.json`, manifestText);
  files.set(`${OUT}/release-candidate.json`, json(releaseCandidate(exports, manifestText, generated)));
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
  console.log(`${check ? 'Checked' : 'Wrote'} ${files.size} files (${exports.length} exports, ${PORTS.length} ports).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
