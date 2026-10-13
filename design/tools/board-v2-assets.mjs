// mothership:dev-only
//
// Builds the board-v2 proposal's art and slot table (the owner's motion specification of
// 13 October 2026; docs/design/board-v2-slots.md):
// - the Hospital ward for 7, 8 and 9 players: the approved sick bay's shell, back wall and
//   window lifted unchanged from design/source/board/board-hospital.svg around a new deck and
//   the berths, printed in the Hospital's colors by the reviewed export recipe; and, as layers
//   of their own, each berth's blanket and rail, drawn in front of its patient;
// - the slot table: every room's fixed slots for each roster, with their anchors, as JSON for
//   anyone who cannot import the modules;
// - the Blackout's lighting art (design/board-v2/scenes/lighting.mjs): each room with its lights
//   out, drawn from its lit scene by the night rule, the ward once per roster; a light's sparks,
//   the impact on a hit position and the position markers; and the film's timeline as JSON
//   (design/board-v2/films/blackout.mjs, contract/films.json);
// - the manifest, with every file's size and hash.
//
//   node design/tools/board-v2-assets.mjs           writes design/board-v2/assets/, contract/slots.json and contract/films.json
//   node design/tools/board-v2-assets.mjs --check   exits 1 if what is on disk differs
//
// Nothing of design/board-motion/, the reviewed manifest (design-0.2.0) or its bundles is
// touched. This art is a versioned proposal (board-v2-0.1.0) for a later export revision;
// adopting it is an Integration step.

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeScene } from '../board-motion/scenes/compose.mjs';
import { SCENES } from '../board-motion/scenes/index.mjs';
import { BLACKOUT, FILMS_VERSION, blackoutContract } from '../board-v2/films/blackout.mjs';
import { WARD_BERTHS, WARD_ROSTERS, wardScene } from '../board-v2/scenes/hospital-ward.mjs';
import { FIXTURES, IMPACT_BOX, IMPACT_FLASH_RADIUS, LIGHTING_VERSION, NIGHT, SPARK_BOX, SPARK_LIGHT, SPARK_ORIGIN, boltIconSvg, impactSvg, markerSvg, nightMarkup, sparkSvg } from '../board-v2/scenes/lighting.mjs';
import { BOARD_ROOMS, ROSTERS, SLOTS_VERSION, slotsOf } from '../board-v2/scenes/slots.mjs';
import { groupOuter } from './lib/svg-lift.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const OUT = 'design/board-v2/assets';
const SLOTS_FILE = 'design/board-v2/contract/slots.json';
const FILMS_FILE = 'design/board-v2/contract/films.json';
/** The board-v2 art set's version: 0.1.0 the slots and the ward, 0.2.0 with the Blackout's lighting. */
export const ASSETS_VERSION = 'board-v2-0.2.0';
const kebab = id => id.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
const kebabAll = ids => ids.map(kebab);
const sha = content => createHash('sha256').update(content).digest('hex');

export async function planAssets(root = repoRoot) {
  const files = new Map();
  const scenes = [];
  const header = (name, purpose, out, scene) => `<?xml version="1.0" encoding="UTF-8"?>
<!--
  mothership:dev-only · board-v2 proposal ${SLOTS_VERSION} · ${name} · generated, do not edit by hand
  ${purpose}
  Built by design/tools/board-v2-assets.mjs from design/board-v2/scenes/hospital-ward.mjs and ${out.sourcePath} (lifted unchanged:
  ${[...scene.under, ...scene.over].join(', ')}), printed in the room's colors by ${out.recipe}. Not in the reviewed manifest design-0.2.0.
-->
`;
  const berthLayers = new Map();
  for (const roster of WARD_ROSTERS) {
    const scene = wardScene(roster);
    const out = await composeScene(scene, root);
    const back = header(`hospital ward, ${roster} players · back`, `The Hospital as a ward of ${roster} berths: the approved room, a new deck, the berths' headboards, pillows, monitors and lamps, and their light.`, out, scene) + out.back;
    const file = `${OUT}/scenes/hospital-ward-${roster}.back.svg`;
    files.set(file, back);
    scenes.push({ id: `scene.hospital-ward-${roster}.back`, room: 'hospital', roster, layer: 'back', depth: null, file, source: out.sourcePath, sourceSha256: sha(out.source), recolor: out.recipe, lifted: [...scene.under, ...scene.over], viewBox: '0 0 1024 768', bytes: Buffer.byteLength(back), sha256: sha(back), audience: 'public' });
    // A berth's layer is the same in every roster that has it: written once, checked to agree.
    for (const [id, layer] of Object.entries(out.layers)) {
      const content = header(`hospital ward · ${id}`, `Drawn again in front of its patient (depth ${layer.depth}): the blanket, the rail and the foot of the berth.`, out, scene) + layer.svg;
      if (berthLayers.has(id) && berthLayers.get(id).content !== content) throw new Error(`${id}: its layer differs between rosters`);
      berthLayers.set(id, { content, depth: layer.depth, rosters: [...(berthLayers.get(id)?.rosters ?? []), roster] });
    }
  }
  for (const [id, { content, depth, rosters }] of berthLayers) {
    const file = `${OUT}/scenes/hospital-ward.${id}.svg`;
    files.set(file, content);
    scenes.push({ id: `scene.hospital-ward.${id}`, room: 'hospital', rosters, layer: id, depth, file, viewBox: '0 0 1024 768', bytes: Buffer.byteLength(content), sha256: sha(content), audience: 'public' });
  }
  const slots = {
    devOnly: 'mothership:dev-only',
    version: SLOTS_VERSION,
    status: 'proposal',
    note: 'The board\'s fixed slots for each roster, as design/board-v2/scenes/slots.mjs gives them: proposed authoritative slot ids (assigned by the server on entry, kept while the seat stays) and normalized anchors in each room\'s 1024 x 768 scene ([x / 1024, y / 768]). Not a rule and not an adopted contract.',
    anchors: { feet: 'where the figure stands', press: 'centre of the press area (the place\'s gesture\'s press point; never moves)', badge: 'status tag (detention, rescue deadline)', fx: 'impact or shield centre' },
    positionNumber: 'A Blackout position number is the slot\'s index in its room (1 to n, in id order), drawn inside the upper right corner of the slot\'s press area: never over the face it numbers, always on the target.',
    rosters: Object.fromEntries(ROSTERS.map(roster => [roster, Object.fromEntries(BOARD_ROOMS.map(room => [room, slotsOf(room, roster).map(slot => ({
      id: slot.id, feet: slot.feet, press: slot.press, badge: slot.badge, fx: slot.fx,
      depth: slot.depth, scale: slot.scale, mirror: slot.mirror, gesture: slot.gesture, down: slot.down, front: slot.front, about: slot.about,
    }))]))])),
  };
  const slotsJson = `${JSON.stringify(slots, null, 2)}\n`;
  files.set(SLOTS_FILE, slotsJson);
  const lighting = await planLighting(root, files);
  const films = { devOnly: 'mothership:dev-only', version: FILMS_VERSION, status: 'proposal', note: 'The board-v2 films as data, from design/board-v2/films/. Durations are targets for drawing; the server\'s deadlines are the only clock. Not a rule and not an adopted contract.', films: [blackoutContract()] };
  const filmsJson = `${JSON.stringify(films, null, 2)}\n`;
  files.set(FILMS_FILE, filmsJson);
  const recipes = JSON.parse(await readFile(resolve(root, 'design/source/export-recipes.json'), 'utf8'));
  const manifest = {
    devOnly: 'mothership:dev-only',
    manifestVersion: ASSETS_VERSION,
    status: 'proposal',
    baseBoard: 'board-motion-0.3.0',
    baseManifest: 'design-0.2.0',
    note: 'The Hospital as a ward with one berth per seat (7, 8 or 9), the board\'s fixed slot table and the Blackout\'s lighting art, for the owner\'s motion specification of 13 October 2026. The reviewed manifest, the board-motion proposal and every pinned drawing source are unchanged; this art is proposed for a later export revision and is adopted only through Integration.',
    rights: {
      origin: 'The approved Hospital\'s groups copied element for element from the repository\'s original vector source design/source/board/board-hospital.svg, recolored by the reviewed export recipe, around new vector drawing generated for this repository by design/board-v2/scenes/hospital-ward.mjs. No third-party artwork, font, photograph, traced image or generated raster image.',
      author: 'Visual and Motion Designer workstream: a Claude Code session working for the game owner.',
      license: recipes.rights.license,
      reuse: recipes.rights.reuse,
    },
    berths: WARD_BERTHS.map(berth => ({ id: berth.id, row: berth.row, column: berth.column, gesture: berth.gesture, scale: berth.scale, mirror: berth.mirror, rosters: berth.rosters, about: berth.about })),
    slotTable: { file: SLOTS_FILE, version: SLOTS_VERSION, sha256: sha(slotsJson), bytes: Buffer.byteLength(slotsJson) },
    scenes,
    lighting,
    films: { file: FILMS_FILE, version: FILMS_VERSION, sha256: sha(filmsJson), bytes: Buffer.byteLength(filmsJson) },
  };
  files.set(`${OUT}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  return files;
}

/** A lit scene's markup without its file header: from its <svg> on. */
const svgOf = text => text.slice(text.indexOf('<svg'));
/** The markup of a scene file between its </defs> and </svg>: what it draws. */
const bodyOf = text => text.slice(text.indexOf('</defs>') + '</defs>'.length, text.lastIndexOf('</svg>'));
const defsOf = text => text.match(/<defs>[\s\S]*?<\/defs>/)?.[0] ?? '';

/**
 * The Blackout's lighting art: each room with its lights out (its lit scene, back and front
 * layers together, as it looks empty, by the night rule), a light's sparks, the impact and the
 * markers. Adds the files to `files`; returns the manifest's lighting section.
 */
async function planLighting(root, files) {
  const header = (name, purpose, from) => `<?xml version="1.0" encoding="UTF-8"?>
<!--
  mothership:dev-only · board-v2 lighting proposal ${LIGHTING_VERSION} · ${name} · generated, do not edit by hand
  ${purpose}
  Built by design/tools/board-v2-assets.mjs from ${from}. Not in the reviewed manifest design-0.2.0.
-->
`;
  const entries = [];
  const add = (file, content, entry) => {
    files.set(file, content);
    entries.push({ ...entry, file, bytes: Buffer.byteLength(content), sha256: sha(content), audience: entry.audience ?? 'public' });
  };
  // A room's lit layers, in drawing order: the back, then each layer drawn over its places.
  const litLayers = async room => {
    if (room === 'hospital') return null;
    const scene = SCENES[room];
    const paths = [`design/board-motion/assets/scenes/${room}.back.svg`, ...kebabAll(Object.keys(scene.layers ?? {})).map(id => `design/board-motion/assets/scenes/${room}.${id}.svg`)];
    return Promise.all(paths.map(async path => ({ path, text: await readFile(resolve(root, path), 'utf8') })));
  };
  const darkRoom = (room, layers) => {
    const [back, ...fronts] = layers;
    for (const front of fronts) if (defsOf(front.text) !== defsOf(back.text)) throw new Error(`${front.path}: its definitions differ from its room's back`);
    const lit = svgOf(back.text).replace(/<\/svg>\s*$/, `${fronts.map(front => `  <g data-from="${front.path.split('/').pop()}">${bodyOf(front.text)}</g>\n`).join('')}</svg>\n`);
    // The view through its windows, where it has any (the Jail has none).
    if (!lit.includes(`<g id="${room}-space"`)) return nightMarkup(lit);
    const space = groupOuter(lit, `${room}-space`);
    const start = lit.indexOf(space);
    return nightMarkup(lit, [[start, start + space.length]]);
  };
  for (const room of BOARD_ROOMS.filter(room => room !== 'hospital')) {
    const layers = await litLayers(room);
    const content = header(`${room} · dark`, `The room with its lights out: its scene drawn empty, back and front layers together, every fill almost ink and every line faint steel (night rule: low ${NIGHT.low}, high ${NIGHT.high}, line ${NIGHT.line}); the view through its windows dimmed.`, `${layers.map(layer => layer.path).join(', ')} and design/board-v2/scenes/lighting.mjs`) + darkRoom(room, layers);
    add(`${OUT}/lighting/${room}.dark.svg`, content, { id: `lighting.${room}.dark`, room, rosters: [...ROSTERS], kind: 'dark-room', from: layers.map(layer => layer.path), viewBox: '0 0 1024 768' });
  }
  for (const roster of WARD_ROSTERS) {
    const scene = wardScene(roster);
    const paths = [`${OUT}/scenes/hospital-ward-${roster}.back.svg`, ...Object.keys(scene.layers).map(id => `${OUT}/scenes/hospital-ward.${id}.svg`)];
    // The ward's lit files are this plan's own: read them from the plan, not the disk.
    const layers = paths.map(path => ({ path, text: files.get(path) }));
    const content = header(`hospital ward, ${roster} players · dark`, `The ward of ${roster} berths with its lights out, drawn empty, by the night rule.`, `${paths.join(', ')} and design/board-v2/scenes/lighting.mjs`) + darkRoom('hospital', layers);
    add(`${OUT}/lighting/hospital-ward-${roster}.dark.svg`, content, { id: `lighting.hospital-ward-${roster}.dark`, room: 'hospital', rosters: [roster], kind: 'dark-room', from: paths, viewBox: '0 0 1024 768' });
  }
  for (const frame of [1, 2, 3]) {
    add(`${OUT}/lighting/fx-spark-${frame}.svg`, header(`spark, frame ${frame}`, ['It shorts: a white-hot star at the light and three bolts.', 'It bursts: longer bolts, the first embers.', 'The embers fall; smoke at the light.'][frame - 1] + ` Drawn at a room's light (lighting.mjs FIXTURES), its lower edge at (${SPARK_ORIGIN.join(', ')}) of the ${SPARK_BOX} x ${SPARK_BOX} box. The same in every room and for every window.`, 'design/board-v2/scenes/lighting.mjs') + sparkSvg(frame),
      { id: `lighting.fx-spark-${frame}`, kind: 'spark', frame, ms: BLACKOUT.sparkFrames[frame - 1], viewBox: `0 0 ${SPARK_BOX} ${SPARK_BOX}`, anchor: SPARK_ORIGIN });
    add(`${OUT}/lighting/fx-impact-${frame}.svg`, header(`impact, frame ${frame}`, ['The flash: a white-hot disc, the only part bright enough to count as a flash.', 'The comic star.', 'Its rays breaking.'][frame - 1] + ` Centred on a hit position's press point (${IMPACT_BOX} x ${IMPACT_BOX}); symmetric, so it points at no one. The same for every cause.`, 'design/board-v2/scenes/lighting.mjs') + impactSvg(frame),
      { id: `lighting.fx-impact-${frame}`, kind: 'impact', frame, ms: BLACKOUT.impactFrames[frame - 1], viewBox: `0 0 ${IMPACT_BOX} ${IMPACT_BOX}`, anchor: [IMPACT_BOX / 2, IMPACT_BOX / 2], flashRadius: frame === 1 ? IMPACT_FLASH_RADIUS : null });
  }
  add(`${OUT}/lighting/fx-bolt.svg`, header('still bolt', 'Reduced motion: the power failure as a still bolt in each room\'s caption, in place of the flicker and the sparks. The same in every room.', 'design/board-v2/scenes/lighting.mjs') + boltIconSvg(),
    { id: 'lighting.fx-bolt', kind: 'reduced-icon', viewBox: '0 0 24 24' });
  for (const state of ['preview', 'dark', 'chosen']) {
    add(`${OUT}/lighting/marker-${state}.svg`, header(`position marker, ${state}`, { preview: 'Lights on: the ink disc and paper ring of the board\'s tokens.', dark: 'Lights out: a dark disc, a faint steel ring.', chosen: 'The eligible Disabler\'s own choice, on their phone only: a gold ring.' }[state] + ' Drawn at 22 px in the upper right corner of its slot\'s press area; its numeral is the page\'s text, never in the art.', 'design/board-v2/scenes/lighting.mjs') + markerSvg(state),
      { id: `lighting.marker-${state}`, kind: 'marker', state, viewBox: '0 0 44 44', audience: state === 'chosen' ? 'owner-private' : 'public' });
  }
  return { version: LIGHTING_VERSION, fixtures: FIXTURES, sparkLight: SPARK_LIGHT, night: NIGHT, files: entries };
}

/** Everything under assets/ that the plan no longer makes: removed when writing, reported when checking. */
async function leftovers(files) {
  const found = [];
  const walk = async dir => {
    for (const entry of await readdir(resolve(repoRoot, dir), { withFileTypes: true }).catch(() => [])) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) await walk(path); else if (!files.has(path)) found.push(path);
    }
  };
  await walk(OUT);
  return found;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = await planAssets();
  const extra = await leftovers(files);
  if (process.argv.includes('--check')) {
    let stale = 0;
    for (const [path, content] of files) {
      const current = await readFile(resolve(repoRoot, path), 'utf8').catch(() => null);
      if (current !== content) { console.error(`stale: ${path}`); stale += 1; }
    }
    for (const path of extra) { console.error(`not made by the plan: ${path}`); stale += 1; }
    console.log(stale ? `Board-v2 assets: ${stale} stale` : `Board-v2 assets: ${files.size} files current`);
    if (stale) process.exitCode = 1;
  } else {
    for (const path of extra) await rm(resolve(repoRoot, path));
    for (const [path, content] of files) {
      await mkdir(dirname(resolve(repoRoot, path)), { recursive: true });
      await writeFile(resolve(repoRoot, path), content);
    }
    console.log(`Board-v2 assets: wrote ${files.size} files`);
  }
}
