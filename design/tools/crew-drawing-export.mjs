// mothership:dev-only
//
// The crew drawing release's exports and handoff record (DSN-REQ-17,
// docs/design/crew-drawing-release.md). From the release's own sources (design/crew-drawing/source)
// it draws every baked picture of a character that the game ships today, so that no shipped file
// keeps the old crew:
// - assets/cards: each character's card (the public board bundle's piece-crew card-cN: lists,
//   chips, the picker, the lobby, the phase bar, the role card and files crop their face from it);
// - assets/standees: the card in the board's stand (piece-crew standee-cN);
// - assets/portraits: the app-icon portraits the owner approved (new: nothing ships one yet);
// - assets/roles: the held devices, with the sleeve and glove in the new suit's canvas instead of
//   the old suit's grey (the device and its colours unchanged).
// The films art catalog's 27 baked crew drawings (memorial-cN, outline-cN, halftone-cN) are not
// redrawn: no runtime file shows them (the films draw each character live, through the drop-in),
// so the record proposes retiring them and gives the recipe that would redraw them.
// It writes assets/manifest.json (every export's hash, box, anchors and the shipped file it
// replaces) and release-candidate.json (the sources, their hashes, where they go and how their
// imports are rewritten, the rig modules they depend on, the tokens candidate).
//
// Usage: node design/tools/crew-drawing-export.mjs [--check]
//   --check: draws everything and compares it with the files on disk; writes nothing; exits 1 on any difference.

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FACTION_ACCENTS, cie76 } from '../board-v2/fx/blocked.mjs';
import { CREW, CREW_DRAWING_VERSION, CREW_ORDER, SUIT } from '../crew-drawing/source/crew.mjs';
import { CARD, PORTRAIT, STANDEE, STANDEE_ANCHORS, crewCardSvg, crewPortraitSvg, crewStandeeSvg } from '../crew-drawing/source/portrait.mjs';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const OUT = 'design/crew-drawing/assets';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => readFile(resolve(root, path));
const json = value => `${JSON.stringify(value, null, 2)}\n`;

/** The approval this release packages, and the commit it is built on. */
export const APPROVAL = Object.freeze({
  owner: '2026-11-07',
  record: 'docs/design/owner-decisions.md',
  pullRequests: Object.freeze([
    Object.freeze({ number: 191, merge: '5f1a1ce97570ddc3304b7b286ddd8ebbc3d8b0be', what: 'the pilot: Mira, Nova and Atlas' }),
    Object.freeze({ number: 192, merge: 'd2933b08eff0e5bd00cfbdf1730b81a007f1c646', what: 'the other six' }),
  ]),
  baseCommit: 'd2933b08eff0e5bd00cfbdf1730b81a007f1c646',
});

/** Where the release's modules go, and the only rewrite a port makes besides dropping the dev-only mark. */
export const RUNTIME_DIRECTORY = 'apps/game/hosted/crew-drawing';
export const IMPORT_REWRITES = Object.freeze({
  '../../board-motion/figures/body.mjs': '../scene-drawing/body.mjs',
  '../../board-motion/figures/wardrobe.mjs': '../scene-drawing/wardrobe.mjs',
});
/** The release's modules, in the order they import one another; heads/ by call sign. */
const SOURCE_FILES = ['crew.mjs', 'ink.mjs', ...CREW_ORDER.map(id => `heads/${CREW[id].sign.toLowerCase()}.mjs`), 'head.mjs', 'figure.mjs', 'wardrobe.mjs', 'motion.mjs', 'mount.mjs', 'portrait.mjs'];
/** The old suit's grey, in the held devices' sleeve and glove. */
const OLD_SUIT = '#C6CDD4';
/** The rig's modules the release imports, at the hashes design-0.6.0 pins, and their runtime copies. */
const DEPENDENCIES = Object.freeze([
  Object.freeze({ path: 'design/board-motion/figures/body.mjs', runtime: 'apps/game/hosted/scene-drawing/body.mjs', why: "FRAME (the figure's box) and ORDER (the parts' order)" }),
  Object.freeze({ path: 'design/board-motion/figures/wardrobe.mjs', runtime: 'apps/game/hosted/scene-drawing/wardrobe.mjs', why: 'OUTFITS and outfitFor, re-exported unchanged (what is worn where)' }),
]);
/** The runtime modules that draw a character today, and the two imports each swaps. */
const CONSUMERS = Object.freeze(['apps/game/hosted/scene-board.mjs', 'apps/game/hosted/comic-motion.mjs', 'apps/game/hosted/phone-kit.mjs', 'apps/game/hosted/board-v2-scene.mjs', 'apps/game/hosted/board-v2-films.mjs']);

/** The port of a release source: the dev-only mark dropped, the rig's imports rewritten, nothing else. */
export function portOf(source) {
  let out = source.replace(/^\/\/ mothership:dev-only\n/, '');
  for (const [from, to] of Object.entries(IMPORT_REWRITES)) out = out.split(`'${from}'`).join(`'${to}'`);
  return out;
}

const colourSet = svg => [...new Set([...svg.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map(m => m[0].toUpperCase()))].sort();
/** A character drawing's colours, summed up: how many, and the least CIE76 distance from a faction accent (the palette rule: 30). */
function colours(svg, character) {
  const all = colourSet(svg);
  if (!character) return { count: all.length, list: all };
  const nearest = Math.min(...all.flatMap(hex => Object.values(FACTION_ACCENTS).map(accent => cie76(hex, accent))));
  return { count: all.length, nearestFactionAccentCie76: Math.round(nearest * 10) / 10 };
}

/** The old shipped file an export replaces, from the shipped manifests. */
async function shipped() {
  const manifest = JSON.parse(await read('design/exports/asset-manifest.json'));
  const films = JSON.parse(await read('apps/game/hosted/board-v2-film-art/catalog.json'));
  const variant = (id, name) => {
    const asset = manifest.assets.find(a => a.id === id);
    const v = asset.variants.find(x => x.variant === name);
    return { cssVariable: `--ms-asset-${id}-${name}`, bundle: asset.bundle, path: v.path, sha256: v.sha256, viewBox: v.viewBox, anchors: v.anchors ?? null };
  };
  const film = name => {
    const a = films.assets.find(x => x.runtimePath.endsWith(`/${name}.svg`));
    return { cssVariable: a.cssVariable, bundle: 'board-v2-films-art', path: a.runtimePath, sha256: a.runtimeSha256, viewBox: a.viewBox, anchors: null };
  };
  const devices = manifest.assets.filter(a => a.id.startsWith('device-')).map(a => a.id).sort();
  return { variant, film, devices, manifest };
}

/** Everything this tool writes: path -> text, and the asset manifest's entries. */
export async function build() {
  const files = new Map(), entries = [];
  const old = await shipped();
  const add = (path, svg, entry) => {
    if (!svg.startsWith('<svg') || !svg.trimEnd().endsWith('</svg>') || svg.indexOf('<svg', 1) !== -1) throw new Error(`${path}: not one SVG`);
    if (svg.includes('mothership:dev-only')) throw new Error(`${path}: an export carries the dev-only mark`);
    files.set(path, svg);
    entries.push({ path, sha256: sha(svg), bytes: Buffer.byteLength(svg), ...entry, colours: colours(svg, entry.character) });
  };
  for (const id of CREW_ORDER) {
    const c = CREW[id];
    const card = old.variant('piece-crew', `card-${id}`), standee = old.variant('piece-crew', `standee-${id}`);
    add(`${OUT}/cards/card-${id}.svg`, `${crewCardSvg(c, { prefix: `crew-${id}-card` })}\n`, {
      kind: 'card', character: id, audience: 'public', viewBox: CARD.box.join(' '), width: CARD.box[2], height: CARD.box[3],
      anchors: { faceCenter: card.anchors.faceCenter, note: "The face where the old card had it: every crop of the card's face (50% 22% / 175%) still holds it." },
      replaces: card,
    });
    add(`${OUT}/standees/standee-${id}.svg`, `${crewStandeeSvg(c, { prefix: `crew-${id}-standee` })}\n`, {
      kind: 'standee', character: id, audience: 'public', viewBox: STANDEE.box.join(' '), width: STANDEE.box[2], height: STANDEE.box[3],
      anchors: STANDEE_ANCHORS, replaces: standee,
    });
    add(`${OUT}/portraits/portrait-${id}.svg`, `${crewPortraitSvg(c, { prefix: `crew-${id}-portrait`, size: PORTRAIT.box[2] })}\n`, {
      kind: 'portrait', character: id, audience: 'public', viewBox: PORTRAIT.box.join(' '), width: PORTRAIT.box[2], height: PORTRAIT.box[3],
      anchors: { frame: 'A continuous-corner square (superellipse, n = 5) of half-size 54 round 0,0; its white rim reaches 57.5.' },
      replaces: null, proposedCssVariable: `--ms-asset-crew-portrait-${id}`, proposedBundle: 'public-board',
    });
  }
  for (const device of old.devices) {
    const was = old.variant(device, 'held');
    const before = (await read(was.path)).toString('utf8');
    if (!before.includes(OLD_SUIT)) throw new Error(`${was.path}: the old suit's grey is not in it`);
    add(`${OUT}/roles/${device}.held.svg`, before.split(OLD_SUIT).join(SUIT.light), {
      kind: 'device-held', character: null, audience: 'player (the roles bundle: every phone loads all of it)', viewBox: was.viewBox, width: 120, height: 140,
      anchors: was.anchors, replaces: was, change: `The sleeve and glove: ${OLD_SUIT} (the old suit) to ${SUIT.light} (the new suit's canvas). Nothing else.`,
    });
  }
  const manifest = {
    schema: 'mothership.crew-drawing-assets/1',
    release: CREW_DRAWING_VERSION,
    status: 'Designer candidate (DSN-REQ-17). Not registered: no shipped manifest, bundle or catalog is changed; Integration builds bundles from these.',
    generatedBy: 'design/tools/crew-drawing-export.mjs',
    conventions: {
      files: 'Each file is one SVG starting with <svg (no XML declaration, no comment), ids prefixed per file, no text, no script, no external reference. Cards, standees, portraits and devices end with a newline, as design/exports does; the films art does not, as the films catalog\'s runtime files do not.',
      replaces: "The shipped file it stands in for: its CSS custom property, bundle, path and SHA-256. A null replaces is new art with a proposed property. Swap a whole set (all nine), never one character's.",
      colours: "A character drawing's colour count and its least CIE76 distance from a faction accent (the palette rule keeps it at 30 or more; a test recomputes it). A device's colours are listed: they are its role's.",
    },
    assets: entries,
  };
  files.set(`${OUT}/manifest.json`, json(manifest));
  return { files, manifest };
}

/** The handoff record: sources, their ports, dependencies, consumers, assets and tokens. */
export async function releaseCandidate(files) {
  const sources = [];
  for (const name of SOURCE_FILES) {
    const path = `design/crew-drawing/source/${name}`;
    const text = (await read(path)).toString('utf8');
    const port = portOf(text);
    const rewrites = Object.fromEntries(Object.entries(IMPORT_REWRITES).filter(([from]) => text.includes(`'${from}'`)));
    sources.push({ source: path, sourceSha256: sha(text), runtime: `${RUNTIME_DIRECTORY}/${name}`, runtimeSha256: sha(port), imports: rewrites });
  }
  const release060 = await read('design/releases/design-0.6.0.json');
  const pins = JSON.parse(release060).sources;
  const dependencies = [];
  for (const d of DEPENDENCIES) {
    const hash = sha(await read(d.path)), runtimeHash = sha(await read(d.runtime));
    if (pins[d.path] !== hash) throw new Error(`${d.path}: not the design-0.6.0 pin`);
    dependencies.push({ ...d, sha256: hash, runtimeSha256: runtimeHash, pinnedIn: 'design/releases/design-0.6.0.json' });
  }
  const consumers = [];
  for (const path of CONSUMERS) {
    const text = (await read(path)).toString('utf8');
    const swaps = [];
    for (const [from, to] of [['./scene-drawing/crew.mjs', './crew-drawing/crew.mjs'], ['./scene-drawing/wardrobe.mjs', './crew-drawing/wardrobe.mjs']]) {
      if (text.includes(`'${from}'`)) swaps.push({ from, to });
    }
    if (swaps.length !== 2) throw new Error(`${path}: expected both imports`);
    consumers.push({ path, sha256AtBase: sha(text), swaps });
  }
  const tokensPath = 'packages/design-tokens/src/tokens-0.5.0.json';
  const tokens = await read(tokensPath);
  const assetManifest = files.get(`${OUT}/manifest.json`);
  return {
    schema: 'mothership.crew-drawing-release-candidate/1',
    release: CREW_DRAWING_VERSION,
    status: 'Designer candidate for Integration review (DSN-REQ-17). Integration owns final release registration, drawing-source pins, the drawing-port fence and shared manifests; nothing here registers, pins or publishes.',
    approval: APPROVAL,
    after: { manifestVersion: 'design-0.6.0', path: 'design/releases/design-0.6.0.json', sha256: sha(release060) },
    proposed: { manifestVersion: 'design-0.7.0', tokensVersion: '0.5.0', note: 'A proposal: Integration chooses the numbers when it registers the release.' },
    portRule: `A runtime file is its source with the first line "// mothership:dev-only" removed and the import specifiers in imports rewritten. Nothing else changes; runtimeSha256 is the result. The runtime directory is ${RUNTIME_DIRECTORY}/ (heads/ inside it), which the drawing-port fence's drawing directories do not list yet.`,
    importRewrites: IMPORT_REWRITES,
    sources,
    dependencies,
    consumers: { note: 'Each swaps two imports and nothing else; the calls are the same (dressedFigureSvg, outfitFor, CREW).', files: consumers },
    assets: { manifest: `${OUT}/manifest.json`, sha256: sha(assetManifest), count: JSON.parse(assetManifest).assets.length },
    tokens: { path: tokensPath, sha256: sha(tokens), status: 'candidate: not exported from index.ts; Integration adopts it' },
    filmArt: await filmArt(),
    notForRuntime: [
      { path: 'design/character-pilot/', why: 'The dev-only prototype the owner reviewed. Never imported or ported: the release has its own copies of everything it needs (heads/ is byte for byte the approved traces).' },
      { path: 'design/crew-drawing/review/', why: 'Review media: the watchable previews, comparison screenshots and their record.' },
      { path: 'design/phone-feedback/assets/', why: 'An archived prototype (its runtime ports were retired); it keeps the old crew as history.' },
      { path: 'design/source/crew/', why: "The old cards' sources, kept as history; the release's cards replace their exports." },
    ],
  };
}

/** The films art catalog's baked crew drawings: what ships, the evidence nothing shows them, and how to redraw them. */
async function filmArt() {
  const catalog = JSON.parse(await read('apps/game/hosted/board-v2-film-art/catalog.json'));
  const crew = catalog.assets.filter(a => /\/(memorial|outline|halftone)-c[1-9]\.svg$/.test(a.runtimePath));
  return {
    recommendation: 'Retire these 27 entries from the films art catalog (Frontend owns it; Integration re-pins the stylesheet), so no shipped stylesheet keeps the old crew.',
    shipped: crew.map(a => ({ cssVariable: a.cssVariable, path: a.runtimePath, sha256: a.runtimeSha256 })),
    evidence: 'No runtime file reads these properties: board-v2-films.mjs sets only the Captain pulse head, emergency, suction, debris and plate art, and the scenes and lighting of the four-bed ward. The films draw a character live, through dressedFigureSvg and the effects (memorialSvg, outlineSvg, halftoneSvg), which the drop-in serves (tested).',
    ifKept: 'Redraw them as they were made, with the runtime effects on the release figure standing in the crew suit: memorialSvg(dressedFigureSvg(CREW[id], skeletonOf("stand"), { outfit: "crew", prefix: `mem-${id}` })); with figure = dressedFigureSvg(CREW[id], skeletonOf("stand"), { outfit: "crew", prefix: `cl-${id}` }), outlineSvg(figure, { prefix: `ol-${id}` }) and halftoneSvg(figure, { density: 1, prefix: `ht-${id}` }). Measured: 3.96 MB for the 27, against 0.81 MB shipped.',
  };
}

async function main() {
  const check = process.argv.includes('--check');
  const { files } = await build();
  const candidate = await releaseCandidate(files);
  files.set('design/crew-drawing/release-candidate.json', json(candidate));
  const problems = [];
  for (const [path, text] of files) {
    const target = resolve(root, path);
    if (check) {
      const disk = await readFile(target, 'utf8').catch(() => null);
      if (disk !== text) problems.push(`${path}: ${disk === null ? 'missing' : 'differs'}`);
    } else {
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, text);
    }
  }
  if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; return; }
  console.log(`${check ? 'Checked' : 'Wrote'} ${files.size} files (${candidate.assets.count} exports, ${candidate.sources.length} sources).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
