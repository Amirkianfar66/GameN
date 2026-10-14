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
// - the shared ATTACK BLOCKED art (design/board-v2/fx/blocked.mjs): the shield, its ring and its
//   particles, and that film's timeline (design/board-v2/films/blocked.mjs) in contract/films.json;
// - the private-talk capsule (design/board-v2/scenes/capsule.mjs): its empty cabin, its door's four
//   positions, its door-status light, its badge and its dark drawing for the Blackout, and its
//   film's timeline (design/board-v2/films/capsule.mjs) in contract/films.json;
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
import { BLOCKED, blockedContract } from '../board-v2/films/blocked.mjs';
import { CAPSULE_FILM, capsuleContract } from '../board-v2/films/capsule.mjs';
import { BADGE_SIZE, BESIDE, CAPSULE_ACCENTS, CAPSULE_RECOLOR, CAPSULE_SEATS, CAPSULE_SIZE, CAPSULE_VERSION, CAPSULE_VIEW, DOOR, DOOR_FRAMES, DOORWAY, PATHS, capsuleBadgeSvg, capsuleLayers } from '../board-v2/scenes/capsule.mjs';
import { BLOCKED_VERSION, PARTICLE_FRAMES, SHIELD, SHIELD_BOX, SHIELD_FLASH_RADIUS, SHIELD_RADIUS, SHIELD_SIZE, FACTION_ACCENTS, MIN_ACCENT_DISTANCE, blockParticlesSvg, blockRingSvg, shieldColorDistances, shieldSvg } from '../board-v2/fx/blocked.mjs';
import { WARD_BERTHS, WARD_ROSTERS, wardScene } from '../board-v2/scenes/hospital-ward.mjs';
import { FIXTURES, IMPACT_BOX, IMPACT_FLASH_RADIUS, LIGHTING_VERSION, NIGHT, SPARK_BOX, SPARK_LIGHT, SPARK_ORIGIN, boltIconSvg, impactSvg, markerSvg, nightMarkup, sparkSvg } from '../board-v2/scenes/lighting.mjs';
import { BOARD_ROOMS, ROSTERS, SLOTS_VERSION, SLOT_TABLE_VERSION, slotsOf } from '../board-v2/scenes/slots.mjs';
import { groupOuter } from './lib/svg-lift.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const OUT = 'design/board-v2/assets';
const SLOTS_FILE = 'design/board-v2/contract/slots.json';
const FILMS_FILE = 'design/board-v2/contract/films.json';
/** The board-v2 art set's version: 0.1.0 the slots and the ward, 0.2.0 with the Blackout's lighting, 0.3.0 with ATTACK BLOCKED, 0.4.0 with the private-talk capsule. */
export const ASSETS_VERSION = 'board-v2-0.4.0';
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
    version: SLOT_TABLE_VERSION,
    status: 'proposal',
    note: 'The board\'s fixed slots for each roster, as design/board-v2/scenes/slots.mjs gives them: their ids, in each room\'s numbering, and normalized anchors in each room\'s 1024 x 768 scene ([x / 1024, y / 768]). The table allocates nothing: a seat\'s slot is Backend\'s stored slotId, given by the specification\'s lowest-free rule in this numbering (rules-contracts.md, Blackout validation and resolution), and a screen reads it. Not a rule and not an adopted contract.',
    anchors: { feet: 'where the figure stands', press: 'centre of the press area (the place\'s gesture\'s press point; never moves)', badge: 'status tag (detention, rescue deadline)', fx: 'impact or shield centre' },
    positionNumber: 'A slot\'s number is its index in its room (1 to n, in id order): the order the lowest-free rule fills the room in, and the Blackout position number, drawn inside the upper right corner of the slot\'s press area: never over the face it numbers, always on the target.',
    rosters: Object.fromEntries(ROSTERS.map(roster => [roster, Object.fromEntries(BOARD_ROOMS.map(room => [room, slotsOf(room, roster).map(slot => ({
      id: slot.id, feet: slot.feet, press: slot.press, badge: slot.badge, fx: slot.fx,
      depth: slot.depth, scale: slot.scale, mirror: slot.mirror, gesture: slot.gesture, down: slot.down, front: slot.front, about: slot.about,
    }))]))])),
  };
  const slotsJson = `${JSON.stringify(slots, null, 2)}\n`;
  files.set(SLOTS_FILE, slotsJson);
  const lighting = await planLighting(root, files);
  const fx = planBlocked(files);
  const capsule = planCapsule(files);
  const films = { devOnly: 'mothership:dev-only', version: FILMS_VERSION, status: 'proposal', note: 'The board-v2 films as data, from design/board-v2/films/. Durations are targets for drawing; the server\'s deadlines are the only clock. Not a rule and not an adopted contract.', films: [blackoutContract(), blockedContract(), capsuleContract()] };
  const filmsJson = `${JSON.stringify(films, null, 2)}\n`;
  files.set(FILMS_FILE, filmsJson);
  const recipes = JSON.parse(await readFile(resolve(root, 'design/source/export-recipes.json'), 'utf8'));
  const manifest = {
    devOnly: 'mothership:dev-only',
    manifestVersion: ASSETS_VERSION,
    status: 'proposal',
    baseBoard: 'board-motion-0.3.0',
    baseManifest: 'design-0.2.0',
    note: 'The Hospital as a ward with one berth per seat (7, 8 or 9), the board\'s fixed slot table, the Blackout\'s lighting art, the shared ATTACK BLOCKED effects and the private-talk capsule, for the owner\'s motion specification of 13 October 2026 and the owner\'s capsule request of 14 October 2026. The reviewed manifest, the board-motion proposal and every pinned drawing source are unchanged; this art is proposed for a later export revision and is adopted only through Integration.',
    rights: {
      origin: 'The approved Hospital\'s groups copied element for element from the repository\'s original vector source design/source/board/board-hospital.svg, recolored by the reviewed export recipe, around new vector drawing generated for this repository by design/board-v2/scenes/hospital-ward.mjs. No third-party artwork, font, photograph, traced image or generated raster image.',
      author: 'Visual and Motion Designer workstream: a Claude Code session working for the game owner.',
      license: recipes.rights.license,
      reuse: recipes.rights.reuse,
    },
    berths: WARD_BERTHS.map(berth => ({ id: berth.id, row: berth.row, column: berth.column, gesture: berth.gesture, scale: berth.scale, mirror: berth.mirror, rosters: berth.rosters, about: berth.about })),
    slotTable: { file: SLOTS_FILE, version: SLOT_TABLE_VERSION, sha256: sha(slotsJson), bytes: Buffer.byteLength(slotsJson) },
    scenes,
    lighting,
    fx,
    capsule,
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

/**
 * The shared ATTACK BLOCKED art: the shield's three frames, the ring and the particles' three
 * frames. Adds the files to `files`; returns the manifest's fx section.
 */
function planBlocked(files) {
  const header = (name, purpose) => `<?xml version="1.0" encoding="UTF-8"?>
<!--
  mothership:dev-only · board-v2 effects proposal ${BLOCKED_VERSION} · ${name} · generated, do not edit by hand
  ${purpose} The same for every defense that blocks an attack.
  Built by design/tools/board-v2-assets.mjs from design/board-v2/fx/blocked.mjs. Not in the reviewed manifest design-0.2.0.
-->
`;
  const entries = [];
  const add = (file, content, entry) => {
    files.set(file, content);
    entries.push({ ...entry, file, viewBox: `0 0 ${SHIELD_BOX} ${SHIELD_BOX}`, anchor: [SHIELD_BOX / 2, SHIELD_BOX / 2], bytes: Buffer.byteLength(content), sha256: sha(content), audience: 'room-visible' });
  };
  const shieldMs = [BLOCKED.shieldFlash, BLOCKED.shieldBubble, BLOCKED.absorb];
  for (const frame of [1, 2, 3]) {
    add(`${OUT}/fx/fx-shield-${frame}.svg`, header(`shield, frame ${frame}`, ['It flashes on: a white-hot core in a pale hexagon, the only part bright enough to count as a flash.', 'The bubble: translucent, an inner rim, halftone shading, a highlight.', 'Spent: the outline breaking up, a glint at each corner.'][frame - 1] + ` Centred on the target's press point, drawn at ${SHIELD_SIZE} times its press side.`) + shieldSvg(frame),
      { id: `fx.shield-${frame}`, kind: 'shield', frame, ms: shieldMs[frame - 1], flashRadius: frame === 1 ? SHIELD_FLASH_RADIUS : null });
    add(`${OUT}/fx/fx-block-particles-${frame}.svg`, header(`particles, frame ${frame}`, `Eight symmetric particles scattering from the shield, at ${PARTICLE_FRAMES[frame - 1].radius} of its ${SHIELD_BOX} box.`) + blockParticlesSvg(frame),
      { id: `fx.block-particles-${frame}`, kind: 'particles', frame, ms: BLOCKED.absorb });
  }
  add(`${OUT}/fx/fx-block-ring.svg`, header('ring', 'The energy ring that absorbs the attack; the film grows and fades it.') + blockRingSvg(),
    { id: 'fx.block-ring', kind: 'ring', ms: BLOCKED.absorb });
  return { version: BLOCKED_VERSION, colors: SHIELD, factionAccents: FACTION_ACCENTS, colorDistances: { method: 'CIE76 in L*a*b*, rounded, to the nearest of color.factionPrivateOrRevealed in tokens-0.4.0', atLeast: MIN_ACCENT_DISTANCE, toNearestFactionAccent: shieldColorDistances() }, shieldRadius: SHIELD_RADIUS, shieldSize: SHIELD_SIZE, flashRadius: SHIELD_FLASH_RADIUS, files: entries };
}

/**
 * The private-talk capsule: its empty cabin (back), its door at each of its positions (door-0 shut
 * to door-3 open), its door-status light lit (busy), its badge, and the cabin with its lights out
 * for the Blackout window (dark: back and the shut door, by the Blackout's night rule; the
 * capsule is empty whenever the window runs). Adds the files to `files`; returns the manifest's
 * capsule section.
 */
function planCapsule(files) {
  const header = (name, purpose) => `<?xml version="1.0" encoding="UTF-8"?>
<!--
  mothership:dev-only · board-v2 capsule proposal ${CAPSULE_VERSION} · ${name} · generated, do not edit by hand
  ${purpose}
  Built by design/tools/board-v2-assets.mjs from design/board-v2/scenes/capsule.mjs. Scenery, not a room: no slots, no press areas. Not in the reviewed manifest design-0.2.0.
-->
`;
  const entries = [];
  const add = (file, content, entry) => {
    files.set(file, content);
    entries.push({ ...entry, file, bytes: Buffer.byteLength(content), sha256: sha(content), audience: 'public' });
  };
  const [w, h] = CAPSULE_SIZE;
  const layers = capsuleLayers();
  add(`${OUT}/capsule/back.svg`, header('back', 'The capsule, empty: its cabin, the doorway (shut by door-0), the lamp over the table, the two chairs facing each other, the door-status light unlit.') + layers.back,
    { id: 'capsule.back', kind: 'back', viewBox: `0 0 ${w} ${h}` });
  for (let i = 0; i < DOOR_FRAMES; i += 1) {
    const what = i === 0 ? 'shut' : i === DOOR_FRAMES - 1 ? 'open (no leaf: the doorway clear)' : `${i} of ${DOOR_FRAMES - 1} open`;
    add(`${OUT}/capsule/door-${i}.svg`, header(`door ${i}`, `The door's two leaves, ${what}, drawn over the back and under the participants.`) + layers[`door-${i}`],
      { id: `capsule.door-${i}`, kind: 'door', position: i, viewBox: `0 0 ${w} ${h}` });
  }
  add(`${OUT}/capsule/busy.svg`, header('busy', 'The door-status light lit along the doorway\'s header in caption yellow, drawn over everything while the two are inside. Public: it says the capsule is in use, nothing more; never red or blue, so that no side can be read into it.') + layers.busy,
    { id: 'capsule.busy', kind: 'busy', viewBox: `0 0 ${w} ${h}` });
  add(`${OUT}/capsule/badge.svg`, header('badge', `The pair's badge: a capsule with two heads in it, at the participants' places while the board names them, ${BADGE_SIZE} units drawn 22 px square. No microphone, no sound, no side.`) + capsuleBadgeSvg(),
    { id: 'capsule.badge', kind: 'badge', viewBox: `0 0 ${BADGE_SIZE} ${BADGE_SIZE}` });
  const lit = layers.back.replace(/<\/svg>\s*$/, `  <g data-from="door-0.svg">${bodyOf(layers['door-0'])}</g>\n</svg>\n`);
  add(`${OUT}/capsule/dark.svg`, header('dark', `The capsule with its lights out, empty and shut, for the Blackout window: back and door-0 by the night rule of design/board-v2/scenes/lighting.mjs (low ${NIGHT.low}, high ${NIGHT.high}, line ${NIGHT.line}). Nobody is in the capsule while the window runs.`) + nightMarkup(lit),
    { id: 'capsule.dark', kind: 'dark', viewBox: `0 0 ${w} ${h}` });
  return {
    version: CAPSULE_VERSION,
    scenery: 'Not a room: no slots and no tag; it changes no location, occupancy, capacity, eligibility, movement or immunity (G-02). Its only targets are each seated participant\'s own seat (capsuleTargets()), as its slot is.',
    targets: 'capsuleTargets(panel): a 44 px square per seated participant, on its chest, inside the panel, below the caption (CAPTION_CLEAR) and apart; live only while that participant is drawn seated',
    layout: 'fit.mjs fitBoardV2(viewport, roster, { capsule: true }): beside the Command Room, on its right, in the top band; the band\'s inside width less the gap and the four borders shared 2:1.',
    recolor: CAPSULE_RECOLOR,
    accents: CAPSULE_ACCENTS,
    door: DOOR,
    doorway: DOORWAY,
    seats: CAPSULE_SEATS.map(seat => ({ id: seat.id, side: seat.side, at: seat.at, scale: seat.scale, mirror: seat.mirror, beside: BESIDE[seat.id], normalized: [Number((seat.at[0] / w).toFixed(4)), Number((seat.at[1] / h).toFixed(4))], path: PATHS[seat.id] })),
    paths: 'Each seat\'s path in: the points its feet pass, from the doorway to its stop beside its chair (scene units); the way out is the same path backward. Neither crosses the table.',
    view: CAPSULE_VIEW,
    film: { id: CAPSULE_FILM.id, file: FILMS_FILE },
    files: entries,
  };
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
