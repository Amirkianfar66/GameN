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
// - the Hospital's medical art (design/board-v2/fx/medical.mjs): the drone's four frames, the vitals
//   inset and a berth's small screen for each trace, the status lamp's states, the rescue and
//   detention tags, the scan line, the hologram and the revival pulse's two frames; and the
//   critical state's, the rescue's and the flatline's timelines (design/board-v2/films/medical.mjs)
//   in contract/films.json;
// - the Captain's art (design/board-v2/fx/captain.mjs): S8's command plates in every state, the safety
//   cover's frames, the glove, the press accents and the console inset's frame; the command pulse's
//   heads; the Jail's door, lamp and keypad at each moment of a film; the airlock's moments, the
//   suction, the debris, the emergency light and the exterior; the memorial plaque and the history's
//   grey cut-outs; and the RELEASE, EJECT and button timelines (design/board-v2/films/captain.mjs) in
//   contract/films.json;
// - the Clone's private art (design/board-v2/fx/clone.mjs): the tray's mark, a scan band and the
//   card's stage at a phone's size, and each character's dotted outline and halftone duplicate, as
//   the card draws them; and the activation's and the expiry's timelines (design/board-v2/films/
//   clone.mjs) in contract/films.json;
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
import { MEDICAL_FILMS_VERSION, medicalContracts } from '../board-v2/films/medical.mjs';
import { CAPTAIN_FILMS_VERSION, CAPTAIN_BUTTONS, EJECT_FILM, RELEASE_FILM, captainContracts } from '../board-v2/films/captain.mjs';
import { AIRLOCK, CAPTAIN, CAPTAIN_VERSION, COMMANDS, CONSOLE, COVER, EXTERIOR, GLOVE, JAIL_DOOR, PLATE, PLATE_STATES, airlockSvg, captainColorDistances, clickSvg, consoleSvg, coverSvg, debrisSvg, emergencySvg, exteriorSvg, gloveSvg, jailDoorSvg, memorialSvg, plaqueSvg, plateSvg, pulseHeadSvg, ringSvg, suctionSvg } from '../board-v2/fx/captain.mjs';
import { FRAME } from '../board-motion/figures/body.mjs';
import { CREW } from '../board-motion/figures/crew.mjs';
import { skeletonOf } from '../board-motion/figures/gestures.mjs';
import { dressedFigureSvg } from '../board-motion/figures/wardrobe.mjs';
import { DOCK, DRONE, DRONE_SCENE, INSET, LAMP_STATES, MEDICAL, MEDICAL_VERSION, PULSE_BOX, PULSE_FLASH_RADIUS, RESCUE_TONES, TRACE_KINDS, berthKit, berthScreenSvg, detentionTagSvg, droneSvg, hologramSvg, lampSvg, medicalColorDistances, pulseSvg, rescueCrossSvg, scanLineSvg, vitalsInsetSvg } from '../board-v2/fx/medical.mjs';
import { BADGE_SIZE, BESIDE, CAPSULE_ACCENTS, CAPSULE_RECOLOR, CAPSULE_SEATS, CAPSULE_SIZE, CAPSULE_VERSION, CAPSULE_VIEW, DOOR, DOOR_FRAMES, DOORWAY, PATHS, capsuleBadgeSvg, capsuleLayers } from '../board-v2/scenes/capsule.mjs';
import { BLOCKED_VERSION, PARTICLE_FRAMES, SHIELD, SHIELD_BOX, SHIELD_FLASH_RADIUS, SHIELD_RADIUS, SHIELD_SIZE, FACTION_ACCENTS, MIN_ACCENT_DISTANCE, blockParticlesSvg, blockRingSvg, shieldColorDistances, shieldSvg } from '../board-v2/fx/blocked.mjs';
import { WARD_BERTHS, WARD_ROSTERS, wardScene } from '../board-v2/scenes/hospital-ward.mjs';
import { FIXTURES, IMPACT_BOX, IMPACT_FLASH_RADIUS, LIGHTING_VERSION, NIGHT, SPARK_BOX, SPARK_LIGHT, SPARK_ORIGIN, boltIconSvg, impactSvg, markerSvg, nightMarkup, sparkSvg } from '../board-v2/scenes/lighting.mjs';
import { BOARD_ROOMS, ROSTERS, SLOTS_VERSION, SLOT_TABLE_VERSION, slotsOf } from '../board-v2/scenes/slots.mjs';
import { FOUR_BEDS, FOUR_BERTHS, FOUR_ROSTERS, wardFourScene } from '../board-v2/scenes/hospital-ward-four.mjs';
import { SLOTS_VERSION as FOUR_SLOTS_VERSION, SLOT_TABLE_VERSION as FOUR_TABLE_VERSION, slotsOf as fourSlotsOf } from '../board-v2/scenes/slots-four.mjs';
import { MEDICAL_FOUR_VERSION, fourBerthKits } from '../board-v2/fx/medical-four.mjs';
import { overflowContract } from '../board-v2/films/overflow.mjs';
import { CLONE_FILM, CLONE_FILMS_VERSION, cloneContract } from '../board-v2/films/clone.mjs';
import { CLONE, CLONE_CARD, CLONE_FX_VERSION, CLONE_MIN_DISTANCE, FIGURE_SPAN, PASS_GAP, cloneCardLayout, cloneColorDistances, halftoneSvg, markSvg, outlineSvg, scanSvg, stageSvg } from '../board-v2/fx/clone.mjs';
import { groupOuter } from './lib/svg-lift.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const OUT = 'design/board-v2/assets';
const SLOTS_FILE = 'design/board-v2/contract/slots.json';
const SLOTS_FOUR_FILE = 'design/board-v2/contract/slots-four.json';
const FILMS_FILE = 'design/board-v2/contract/films.json';
/** The board-v2 art set's version: 0.1.0 the slots and the ward, 0.2.0 with the Blackout's lighting, 0.3.0 with ATTACK BLOCKED, 0.4.0 with the private-talk capsule, 0.5.0 with the Hospital's medical films, 0.6.0 with the Captain's films, 0.7.0 with the four-berth ward of the successor, 0.8.0 with the Clone's private card. */
export const ASSETS_VERSION = 'board-v2-0.8.0';
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
  const four = await planFour(root, files);
  const lighting = await planLighting(root, files);
  const fx = planBlocked(files);
  const capsule = planCapsule(files);
  const medical = planMedical(files);
  const captain = await planCaptain(root, files);
  const clone = planClone(files);
  const films = { devOnly: 'mothership:dev-only', version: FILMS_VERSION, status: 'proposal', note: 'The board-v2 films as data, from design/board-v2/films/. Durations are targets for drawing; the server\'s deadlines are the only clock. Not a rule and not an adopted contract.', films: [blackoutContract(), blockedContract(), capsuleContract(), ...medicalContracts(), ...captainContracts(), overflowContract(), cloneContract()] };
  const filmsJson = `${JSON.stringify(films, null, 2)}\n`;
  files.set(FILMS_FILE, filmsJson);
  const recipes = JSON.parse(await readFile(resolve(root, 'design/source/export-recipes.json'), 'utf8'));
  const manifest = {
    devOnly: 'mothership:dev-only',
    manifestVersion: ASSETS_VERSION,
    status: 'proposal',
    baseBoard: 'board-motion-0.3.0',
    baseManifest: 'design-0.2.0',
    note: 'The Hospital as a ward with one berth per seat (7, 8 or 9), the board\'s fixed slot table, the Blackout\'s lighting art, the shared ATTACK BLOCKED effects, the private-talk capsule, the Hospital\'s medical films (the critical state, the drone\'s rescue and the flatline), the Captain\'s films (RELEASE, EJECT and the command plates), the successor\'s four-berth ward and the Clone\'s private card, for the owner\'s motion specification of 13 October 2026, the owner\'s capsule request of 14 October 2026 and the owner\'s four-bed decision of 18 October 2026. The reviewed manifest, the board-motion proposal and every pinned drawing source are unchanged; this art is proposed for a later export revision and is adopted only through Integration.',
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
    medical,
    captain,
    four,
    clone,
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
  {
    // The successor's four-berth ward (issue #155): its back, then its layers in depth order, so
    // that the front berths' headboards stand over the back berths' blankets.
    const scene = wardFourScene(FOUR_ROSTERS[0]);
    const ordered = Object.entries(scene.layers).sort(([, a], [, b]) => a.depth - b.depth).map(([id]) => id);
    const paths = [`${OUT}/scenes/hospital-ward-four.back.svg`, ...ordered.map(id => `${OUT}/scenes/hospital-ward-four.${id}.svg`)];
    const layers = paths.map(path => ({ path, text: files.get(path) }));
    if (layers.some(layer => !layer.text)) throw new Error('The four-berth ward\'s lit files are planned before its dark one');
    const content = header('hospital ward, four berths · dark', 'The successor\'s four-berth ward with its lights out, drawn empty, by the night rule. The same for 7, 8 and 9 players.', `${paths.join(', ')} and design/board-v2/scenes/lighting.mjs`) + darkRoom('hospital', layers);
    add(`${OUT}/lighting/hospital-ward-four.dark.svg`, content, { id: 'lighting.hospital-ward-four.dark', room: 'hospital', rosters: [...FOUR_ROSTERS], beds: FOUR_BEDS, kind: 'dark-room', from: paths, viewBox: '0 0 1024 768' });
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

/**
 * The Hospital's medical art: the drone's frames, the vitals inset and a berth's small screen for
 * each trace, the status lamp's states, the rescue and detention tags, the scan line, the hologram
 * and the revival pulse. Adds the files to `files`; returns the manifest's medical section.
 */
function planMedical(files) {
  const header = (name, purpose) => `<?xml version="1.0" encoding="UTF-8"?>
<!--
  mothership:dev-only · board-v2 medical proposal ${MEDICAL_VERSION} · ${name} · generated, do not edit by hand
  ${purpose}
  Built by design/tools/board-v2-assets.mjs from design/board-v2/fx/medical.mjs. Public: the same on every phone and the display; it reads no role, side, attacker, healer or cause. Not in the reviewed manifest design-0.2.0.
-->
`;
  const entries = [];
  const add = (file, content, entry) => {
    files.set(file, content);
    entries.push({ ...entry, file, bytes: Buffer.byteLength(content), sha256: sha(content), audience: 'public' });
  };
  for (const frame of DRONE.frames) {
    const what = { folded: 'arriving or leaving, its three arms tucked under', open: 'over the bed, its arms unfolded', charge: 'its probes and lens charging', pulse: 'the revival pulse leaving its probes' }[frame];
    add(`${OUT}/medical/drone-${frame}.svg`, header(`drone, ${frame}`, `The medical drone, ${what}. It leaves the Hospital's ceiling dock (${DOCK.join(', ')} in the ward's scene) and returns to it; its lens is at (${DRONE.lens.join(', ')}) of the ${DRONE.w} x ${DRONE.h} box, drawn ${DRONE_SCENE.width} scene units wide at a berth of scale 1.`) + droneSvg(frame),
      { id: `medical.drone-${frame}`, kind: 'drone', frame, viewBox: `0 0 ${DRONE.w} ${DRONE.h}`, anchor: DRONE.lens });
  }
  for (const kind of TRACE_KINDS) {
    const what = { off: 'powered down: the screen dark', boot: 'booting: a bright line', unstable: 'an Injured patient: uneven beats, one dropped', stable: 'a stable heartbeat', slowing: 'failing: two weak beats far apart', flat: 'the flatline' }[kind];
    add(`${OUT}/medical/vitals-${kind}.svg`, header(`vitals inset, ${kind}`, `The vitals inset, ${what}: a comic panel that shows the berth's monitor large while a film plays. The film draws the trace up to its sweep; this is the whole trace.`) + vitalsInsetSvg(kind),
      { id: `medical.vitals-${kind}`, kind: 'vitals-inset', trace: kind, viewBox: `0 0 ${INSET.w} ${INSET.h}` });
    add(`${OUT}/medical/berth-screen-${kind}.svg`, header(`berth screen, ${kind}`, `A berth's own small monitor, ${what}, drawn over the ward's dark monitor at its headboard (berthKit().monitor).`) + berthScreenSvg(kind),
      { id: `medical.berth-screen-${kind}`, kind: 'berth-screen', trace: kind, viewBox: '0 0 40 24' });
  }
  for (const state of LAMP_STATES) {
    add(`${OUT}/medical/lamp-${state}.svg`, header(`lamp, ${state}`, { off: 'The status lamp off: a body\'s equipment, or a blink\'s dark beat.', amber: 'The warning amber of an Injured patient.', red: 'The critical red: the due round in progress, or a failing heart.', calm: 'The calm cyan of a revived patient.' }[state] + ' Centred on the berth\'s lamp (berthKit().lamp).') + lampSvg(state),
      { id: `medical.lamp-${state}`, kind: 'lamp', state, viewBox: '0 0 40 40', anchor: [20, 20] });
  }
  for (const tone of RESCUE_TONES) {
    add(`${OUT}/medical/rescue-${tone}.svg`, header(`rescue tag, ${tone}`, { next: 'A later normal round is still to come.', current: 'The due round is in progress.', none: 'No Rescue round left (a new injury in round 5 or the showdown): a struck cross, no round.' }[tone] + ' The round number beside it is the page\'s text, from the seat\'s rescueDueAfterRound; never in the art.') + rescueCrossSvg(tone),
      { id: `medical.rescue-${tone}`, kind: 'rescue-tag', tone, viewBox: '0 0 16 16' });
  }
  add(`${OUT}/medical/detention.svg`, header('detention tag', 'A detained patient\'s neutral tag: a slate wristband with the Jail\'s stripes, beside the rescue tag on the berth\'s plate. The patient keeps the gown.') + detentionTagSvg(),
    { id: 'medical.detention', kind: 'detention-tag', viewBox: '0 0 16 16' });
  add(`${OUT}/medical/scan-line.svg`, header('scan line', 'The drone\'s scan line, going down the patient and back.') + scanLineSvg(),
    { id: 'medical.scan-line', kind: 'scan-line', viewBox: '0 0 140 16' });
  add(`${OUT}/medical/hologram.svg`, header('hologram', 'The faint diagnostic hologram over the patient during the scan: a torso outline, a cross and three ticks. No words.') + hologramSvg(),
    { id: 'medical.hologram', kind: 'hologram', viewBox: '0 0 64 64' });
  for (const frame of [1, 2]) {
    add(`${OUT}/medical/pulse-${frame}.svg`, header(`revival pulse, frame ${frame}`, ['One controlled pulse: a white-hot core, the only part bright enough to count as a flash, and four short arcs.', 'The ring and the arcs fading out.'][frame - 1] + ' Centred on the patient\'s chest (berthKit().chest).') + pulseSvg(frame),
      { id: `medical.pulse-${frame}`, kind: 'pulse', frame, viewBox: `0 0 ${PULSE_BOX} ${PULSE_BOX}`, anchor: [PULSE_BOX / 2, PULSE_BOX / 2], flashRadius: frame === 1 ? PULSE_FLASH_RADIUS : null });
  }
  return {
    version: MEDICAL_VERSION,
    films: { version: MEDICAL_FILMS_VERSION, ids: medicalContracts().map(film => film.id), file: FILMS_FILE },
    colors: MEDICAL,
    colorDistances: { method: 'CIE76 in L*a*b*, rounded, to the nearest of color.factionPrivateOrRevealed in tokens-0.4.0', atLeast: 30, toNearestFactionAccent: medicalColorDistances() },
    dock: DOCK,
    drone: { box: [DRONE.w, DRONE.h], lens: DRONE.lens, sceneWidth: DRONE_SCENE.width, reach: DRONE_SCENE.reach },
    inset: { box: [INSET.w, INSET.h], screen: INSET.screen, placement: 'fx/label-box.mjs labelBox() with the inset\'s size: above the berth\'s press area, else below its name tag; never over the room\'s caption' },
    berths: Object.fromEntries(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9'].map(id => [id, berthKit(id)])),
    files: entries,
  };
}

/**
 * The Captain's art: S8's plates and the cover, the glove and the accents, the console inset's frame,
 * the pulse's heads, the Jail's door at each moment, the airlock's moments, the suction, the debris,
 * the emergency light, the exterior, the plaque and the history's cut-outs. Adds the files to `files`;
 * returns the manifest's captain section.
 */
async function planCaptain(root, files) {
  const header = (name, purpose) => `<?xml version="1.0" encoding="UTF-8"?>
<!--
  mothership:dev-only · board-v2 Captain proposal ${CAPTAIN_VERSION} · ${name} · generated, do not edit by hand
  ${purpose}
  Built by design/tools/board-v2-assets.mjs from design/board-v2/fx/captain.mjs. Public: the same on every phone and the display (the plates: the Captain's own controls); it reads no role, side, faction or cause. Not in the reviewed manifest design-0.2.0.
-->
`;
  const entries = [];
  const add = (file, content, entry) => {
    files.set(file, content);
    entries.push({ ...entry, file, bytes: Buffer.byteLength(content), sha256: sha(content), audience: entry.audience ?? 'public' });
  };
  const plateWhat = { available: 'Available: lit, a solid rim.', unavailable: 'Unavailable: dull, a dashed rim (no reason is drawn; the server gives none in 1.8).', pressed: 'Activated (sending): the button 3 units down under an inner shadow, its rim brightest.', used: 'Used: no rim, the button dark; the page writes USED across it.' };
  for (const kind of COMMANDS) {
    for (const state of PLATE_STATES) {
      add(`${OUT}/captain/plate-${kind}-${state}.svg`, header(`${kind} plate, ${state}`, `${kind === 'release' ? 'RELEASE (green, an open padlock)' : 'EJECT (red, the eject sign, under its clear cover)'}: ${plateWhat[state]} The command's word is the page's text on the label strip (${PLATE.label.x}, ${PLATE.label.y}, ${PLATE.label.w} x ${PLATE.label.h}).`) + plateSvg(kind, state),
        { id: `captain.plate-${kind}-${state}`, kind: 'plate', command: kind, state, viewBox: `0 0 ${PLATE.w} ${PLATE.h}`, audience: 'the current Captain (S8) and public (the console inset)' });
    }
  }
  for (const frame of COVER.frames) {
    add(`${OUT}/captain/cover-${frame}.svg`, header(`cover, ${frame}`, `EJECT's clear safety cover, ${frame}, drawn with its (${-COVER.at[0]}, ${-COVER.at[1]}) on the plate's (0, 0).`) + coverSvg(frame),
      { id: `captain.cover-${frame}`, kind: 'cover', frame, viewBox: `0 0 ${COVER.w} ${COVER.h}`, at: COVER.at });
  }
  add(`${OUT}/captain/glove.svg`, header('glove', `The Captain's gloved hand, its index finger out, its tip at (${GLOVE.tip.join(', ')}). The same glove whoever is Captain.`) + gloveSvg(), { id: 'captain.glove', kind: 'glove', viewBox: `0 0 ${GLOVE.w} ${GLOVE.h}`, anchor: GLOVE.tip });
  add(`${OUT}/captain/click.svg`, header('click', 'EJECT\'s press: a hard click as a red comic burst round the button, no lettering.') + clickSvg(), { id: 'captain.click', kind: 'accent', viewBox: '0 0 80 80', anchor: [40, 40] });
  add(`${OUT}/captain/ring.svg`, header('ring', 'RELEASE\'s press: a green ring round the button, which the film grows and fades.') + ringSvg(), { id: 'captain.ring', kind: 'accent', viewBox: '0 0 80 80', anchor: [40, 40] });
  add(`${OUT}/captain/console.svg`, header('console inset', `The console inset's frame: the plate goes at (${CONSOLE.plate.join(', ')}). consoleBox() places it on the board.`) + consoleSvg(), { id: 'captain.console', kind: 'console', viewBox: `0 0 ${CONSOLE.w} ${CONSOLE.h}` });
  for (const kind of COMMANDS) {
    add(`${OUT}/captain/pulse-head-${kind}.svg`, header(`pulse head, ${kind}`, `The command pulse's head, ${kind === 'release' ? 'green' : 'red'}, centred on its point of conduitPoints()'s way; its dotted tail is drawn by the page.`) + pulseHeadSvg(kind), { id: `captain.pulse-head-${kind}`, kind: 'pulse-head', command: kind, viewBox: '0 0 24 24', anchor: [12, 12] });
  }
  const doors = [
    ['rest', {}, 'At rest: exactly the room\'s own door, lamp and keypad.'],
    ['unlocked', { wheel: 90, lamp: 'green', keypad: 'green' }, 'RELEASE: the keypad and the lamp green, the lock\'s wheel turned.'],
    ['half', { open: 0.5, wheel: 90, lamp: 'green', keypad: 'green' }, 'RELEASE: the leaves half open, the corridor behind.'],
    ['open', { open: 1, wheel: 90, lamp: 'green', keypad: 'green' }, 'RELEASE: open.'],
    ['lockdown', { wheel: -90, lamp: 'red', keypad: 'amber' }, 'EJECT: locked down, the lamp red, the keypad striped red and amber.'],
  ];
  for (const [name, door, what] of doors) {
    add(`${OUT}/captain/jail-door-${name}.svg`, header(`Jail door, ${name}`, `${what} Over the Jail's art at its scene frame, box ${JAIL_DOOR.box.join(' ')}; the film draws jailDoorSvg() at every moment.`) + jailDoorSvg({ ...door, prefix: `jd-${name}` }),
      { id: `captain.jail-door-${name}`, kind: 'jail-door', state: door, viewBox: JAIL_DOOR.box.join(' ') });
  }
  const hatches = [['revealed', { glow: 1 }, 'Revealed in the wall, its rim glowing red.'], ['released', { clamps: 1, glow: 1 }, 'Its clamps released.'], ['half', { clamps: 1, open: 0.5, glow: 1 }, 'Its iris half open.'], ['open', { clamps: 1, open: 1, glow: 1 }, 'Open onto space.']];
  for (const [name, hatch, what] of hatches) {
    add(`${OUT}/captain/airlock-${name}.svg`, header(`airlock, ${name}`, `${what} In the Jail's back wall left of the blast door (centre ${AIRLOCK.c.join(', ')}, box ${AIRLOCK.box.join(' ')}), drawn only while an EJECT plays.`) + airlockSvg({ ...hatch, prefix: `al-${name}` }),
      { id: `captain.airlock-${name}`, kind: 'airlock', state: hatch, viewBox: AIRLOCK.box.join(' ') });
  }
  for (const frame of [1, 2, 3]) {
    add(`${OUT}/captain/suction-${frame}.svg`, header(`suction, frame ${frame}`, 'Paper streaks over the Jail, converging on the hatch: the air rushing out. Over the Jail\'s art at its scene frame.') + suctionSvg(frame), { id: `captain.suction-${frame}`, kind: 'suction', frame, viewBox: '0 0 1024 768' });
  }
  for (const kind of ['paper', 'cup']) add(`${OUT}/captain/debris-${kind}.svg`, header(`debris, ${kind}`, 'A loose thing the air takes to the hatch.') + debrisSvg(kind), { id: `captain.debris-${kind}`, kind: 'debris', item: kind, viewBox: '0 0 24 24' });
  add(`${OUT}/captain/emergency.svg`, header('emergency light', `A red wash over a room's art and people, pulsed by the film under 2 Hz between ${EJECT_FILM.emergency.low} and ${EJECT_FILM.emergency.high} opacity, multiplied; never over a caption, a tag or a press area.`) + emergencySvg(), { id: 'captain.emergency', kind: 'emergency', viewBox: '0 0 100 100' });
  add(`${OUT}/captain/exterior.svg`, header('exterior', `The hull from outside, the hatch open (at ${EXTERIOR.hatch.join(', ')}), its inside lit red; covers the Jail's panel. The film draws the ejected drifting away from the hatch, small, as silhouettes.`) + exteriorSvg(), { id: 'captain.exterior', kind: 'exterior', viewBox: `0 0 ${EXTERIOR.w} ${EXTERIOR.h}`, hatch: EXTERIOR.hatch });
  add(`${OUT}/captain/plaque.svg`, header('memorial plaque', 'The plaque\'s mark beside the Jail\'s caption; the count of seats off the board is the page\'s text.') + plaqueSvg(), { id: 'captain.plaque', kind: 'plaque', viewBox: '0 0 18 18' });
  for (const [id, c] of Object.entries(CREW)) {
    const art = memorialSvg(dressedFigureSvg(c, skeletonOf('stand'), { outfit: 'crew', prefix: `mem-${id}` }));
    add(`${OUT}/captain/memorial-${id}.svg`, header(`memorial, ${c.sign}`, `${c.sign} as a grey paper cut-out (memorialSvg() of the approved figure, standing): the history's mark for a character taken off the board, the same whatever its side.`) + art, { id: `captain.memorial-${id}`, kind: 'memorial', character: id, viewBox: FRAME.box.join(' ') });
  }
  // The door's elements are the Jail scene's own: every one of them in the scene the board draws.
  const scene = await readFile(resolve(root, 'design/board-motion/assets/scenes/jail.back.svg'), 'utf8');
  return {
    version: CAPTAIN_VERSION,
    films: { version: CAPTAIN_FILMS_VERSION, ids: captainContracts().map(film => film.id), file: FILMS_FILE, release: RELEASE_FILM.end, eject: EJECT_FILM.end, buttons: CAPTAIN_BUTTONS },
    colors: CAPTAIN,
    colorDistances: { method: 'CIE76 in L*a*b*, rounded, to the nearest of color.factionPrivateOrRevealed in tokens-0.4.0', atLeast: 30, toNearestFactionAccent: captainColorDistances() },
    plate: PLATE, cover: COVER, glove: GLOVE, console: CONSOLE,
    door: { box: JAIL_DOOR.box, doorway: JAIL_DOOR.doorway, leaf: JAIL_DOOR.leaf, lamp: JAIL_DOOR.lamp, screen: JAIL_DOOR.screen, liftedFrom: 'design/board-motion/assets/scenes/jail.back.svg', sceneSha256: sha(scene) },
    airlock: AIRLOCK, exterior: EXTERIOR,
    placement: { console: 'fx/captain.mjs consoleBox()', pulse: 'fx/captain.mjs conduitPoints()', plaque: 'fx/captain.mjs plaqueBox()' },
    reuses: ['design/exports/public-board/fx-ink-trail.paper.fdbb7f4fce.svg', 'design/exports/public-board/fx-landing-puff.paper.8d5f3998bd.svg'],
    files: entries,
  };
}

/**
 * The Clone's private art (storyboard S3): the tray's mark, a scan band and the card's stage at the
 * card's size on a 390 px phone, and each character's dotted outline and halftone duplicate in the
 * crew's clothes: samples of fx/clone.mjs's functions, which draw the card from the Alien's character
 * in the clothes of its place. Adds the files to `files`; returns the manifest's clone section.
 */
function planClone(files) {
  const header = (name, purpose) => `<?xml version="1.0" encoding="UTF-8"?>
<!--
  mothership:dev-only · board-v2 Clone proposal ${CLONE_FX_VERSION} · ${name} · generated, do not edit by hand
  ${purpose}
  Built by design/tools/board-v2-assets.mjs from design/board-v2/fx/clone.mjs. Owner-private: drawn only on its owner's own phone, in its sheet, never on the board; every phone's bundle ships it whatever its seat, and nothing in it names a role or a side. Not in the reviewed manifest design-0.2.0.
-->
`;
  const entries = [];
  const add = (file, content, entry) => {
    files.set(file, content);
    entries.push({ ...entry, file, bytes: Buffer.byteLength(content), sha256: sha(content), audience: entry.audience ?? 'owner-private: its owner\'s phone, in its sheet' });
  };
  add(`${OUT}/clone/mark.svg`, header('the tray\'s mark', 'The Actions tray\'s mark for the Clone, beside its English label: a character\'s bust and its dashed double. One ink, a 32 x 32 cell, a 2.6 stroke, as the kit\'s other marks (design/abilities/source/actions.svg).') + markSvg(),
    { id: 'clone.mark', kind: 'mark', viewBox: '0 0 32 32', audience: 'its owner\'s Actions tray; every phone loads the kit' });
  // The card on a 390 px phone (the sheet's body 364 px wide): the scan band and the stage at its sizes.
  const card = cloneCardLayout({ width: 364 });
  const span = (FIGURE_SPAN.feet - FIGURE_SPAN.top) * card.real.unit;
  const band = { width: Math.round(card.real.size), height: Math.round(span * 0.3) };
  add(`${OUT}/clone/scan.svg`, header('scan band', `The scan lines, one pixel every three, brightest at the leading edge: drawn over a figure by the films (${band.width} x ${band.height} here, the card's on a 390 px phone; the films draw scanSvg() at the figure's size).`) + scanSvg({ ...band, prefix: 'scan' }),
    { id: 'clone.scan', kind: 'scan', viewBox: `0 0 ${band.width} ${band.height}` });
  const { portrait } = card;
  const stage = { width: portrait.width, height: portrait.height, real: card.real.feet[0] - portrait.left, clone: card.clone.feet[0] - portrait.left, floor: card.real.feet[1] - portrait.top };
  add(`${OUT}/clone/stage.svg`, header('stage', `The card's portrait window: a dark stage, a faint grid, the floor and the two projector pads, the duplicate's lit (stageSvg(), ${portrait.width} x ${portrait.height} here).`) + stageSvg({ ...stage, lit: 1, prefix: 'stage' }),
    { id: 'clone.stage', kind: 'stage', viewBox: `0 0 ${portrait.width} ${portrait.height}` });
  for (const [id, c] of Object.entries(CREW)) {
    const figure = dressedFigureSvg(c, skeletonOf('stand'), { outfit: 'crew', prefix: `cl-${id}` });
    add(`${OUT}/clone/outline-${id}.svg`, header(`outline, ${c.sign}`, `${c.sign}'s dotted outline (outlineSvg() of the approved figure, standing, in the crew's clothes): the real character once hidden, on its own card.`) + outlineSvg(figure, { prefix: `ol-${id}` }),
      { id: `clone.outline-${id}`, kind: 'outline', character: id, viewBox: FRAME.box.join(' ') });
    add(`${OUT}/clone/halftone-${id}.svg`, header(`halftone, ${c.sign}`, `${c.sign}'s duplicate as it forms, fully screened (halftoneSvg() of the approved figure, density 1): the same drawing's silhouette in the deep green's dots, with a pale rim.`) + halftoneSvg(figure, { density: 1, prefix: `ht-${id}` }),
      { id: `clone.halftone-${id}`, kind: 'halftone', character: id, viewBox: FRAME.box.join(' ') });
  }
  return {
    version: CLONE_FX_VERSION,
    status: 'proposal',
    audience: 'owner-private: its owner\'s own phone alone, in its sheet\'s private area, from its own view (self.cloneStatus, full-game-1.10.0, #153: null for every other seat). Never on the board, on any phone; the display, other players and the host draw nothing of it. A block by the Clone is S4\'s, exactly as Protection\'s',
    films: { version: CLONE_FILMS_VERSION, ids: [CLONE_FILM.id], file: FILMS_FILE, activate: CLONE_FILM.activate.end, expire: CLONE_FILM.expire.end, reduced: CLONE_FILM.reduced },
    colors: CLONE,
    colorDistances: { method: 'CIE76 in L*a*b*, rounded, to the nearest of color.factionPrivateOrRevealed in tokens-0.4.0', atLeast: CLONE_MIN_DISTANCE, toNearestFactionAccent: cloneColorDistances() },
    card: CLONE_CARD, figureSpan: FIGURE_SPAN, passGap: PASS_GAP,
    placement: { card: 'fx/clone.mjs cloneCardLayout(), the sheet\'s private claim (js/turns.mjs turnsLayout()); its body down to cloneBodyHeight(), never under the raised Pass' },
    contract: { from: 'full-game-1.10.0 (#153, a9dd543)', field: 'self.cloneStatus: null for every seat but its owner\'s; { used, activatedRound, expiresAfterRound, active } for its owner\'s (packages/contracts/src/clone.ts)' },
    words: {
      source: 'Frontend\'s hosted board at the full-game-1.10.0 baseline 6ca4b51d5acd1454daec68c5108c8f12ee2286bf: packages/presentation/src/model/connected-player.ts, line 361',
      sourceSha256: 'be6dab5b5343536ddd7fb321dccf8ab980999e964f67b544d0f8156aa813b76a',
      active: 'Clone active through Round {expiresAfterRound}.', ended: 'Clone inactive; its once-only use is spent.', unused: 'Clone unused.',
      stamps: 'CLONE ACTIVE and CLONE ENDED: the page\'s text, hidden from assistive technology (the status line says it)',
    },
    files: entries,
  };
}

/**
 * The successor's four-berth ward (the owner's four-bed decision of 18 October 2026, issue #155):
 * its back and its layers, the same drawing for 7, 8 and 9 players (checked), and its slot table.
 * The roster-sized ward and its table are unchanged. Adds the files to `files`; returns the
 * manifest's four section.
 */
async function planFour(root, files) {
  const scenes = FOUR_ROSTERS.map(roster => wardFourScene(roster));
  const composed = await Promise.all(scenes.map(scene => composeScene(scene, root)));
  for (const out of composed.slice(1)) {
    if (out.back !== composed[0].back || JSON.stringify(out.layers) !== JSON.stringify(composed[0].layers)) throw new Error('The four-berth ward is not the same drawing for every roster');
  }
  const [scene, out] = [scenes[0], composed[0]];
  const header = (name, purpose) => `<?xml version="1.0" encoding="UTF-8"?>
<!--
  mothership:dev-only · board-v2 four-berth proposal ${FOUR_SLOTS_VERSION} · ${name} · generated, do not edit by hand
  ${purpose}
  Built by design/tools/board-v2-assets.mjs from design/board-v2/scenes/hospital-ward-four.mjs and ${out.sourcePath} (lifted unchanged:
  ${[...scene.under, ...scene.over].join(', ')}), printed in the room's colors by ${out.recipe}. For the successor's four-bed Hospital
  (the owner's decision of 18 October 2026, issue #155); the roster-sized ward is unchanged. Not in the reviewed manifest design-0.2.0.
-->
`;
  const entries = [];
  const add = (file, content, entry) => {
    files.set(file, content);
    entries.push({ ...entry, file, viewBox: '0 0 1024 768', bytes: Buffer.byteLength(content), sha256: sha(content), audience: 'public' });
  };
  add(`${OUT}/scenes/hospital-ward-four.back.svg`, header('hospital ward, four berths · back', 'The successor\'s Hospital as a ward of four berths: the approved room, the deck, the back row\'s headboards, pillows, monitors and lamps, and their light.') + out.back,
    { id: 'scene.hospital-ward-four.back', room: 'hospital', rosters: [...FOUR_ROSTERS], layer: 'back', depth: null, source: out.sourcePath, sourceSha256: sha(out.source), recolor: out.recipe, lifted: [...scene.under, ...scene.over] });
  for (const [id, layer] of Object.entries(out.layers)) {
    const head = id.endsWith('-head');
    add(`${OUT}/scenes/hospital-ward-four.${id}.svg`, header(`hospital ward, four berths · ${id}`, head
      ? `Drawn in front of the back row and behind its own patient (depth ${layer.depth}): the front berth's headboard, with its plate, lamp and monitor, its pillow and the far end of its mattress.`
      : `Drawn again in front of its patient (depth ${layer.depth}): the blanket, the rail and the foot of the berth.`) + layer.svg,
    { id: `scene.hospital-ward-four.${id}`, room: 'hospital', rosters: [...FOUR_ROSTERS], layer: id, depth: layer.depth });
  }
  const table = {
    devOnly: 'mothership:dev-only',
    version: FOUR_TABLE_VERSION,
    status: 'proposal',
    note: 'The successor board\'s fixed slots for each roster, as design/board-v2/scenes/slots-four.mjs gives them: contract/slots.json\'s, with a Hospital of four berths (H1 to H4) whatever the roster, for the owner\'s four-bed decision of 18 October 2026 (issue #155). The roster stays 7, 8 or 9. The table allocates nothing, and its version is a proposal for Integration to allocate with the successor\'s tuple. Not a rule and not an adopted contract.',
    beds: FOUR_BEDS,
    anchors: { feet: 'where the figure stands', press: 'centre of the press area (the place\'s gesture\'s press point; never moves)', badge: 'status tag (detention, rescue deadline)', fx: 'impact or shield centre' },
    rosters: Object.fromEntries(FOUR_ROSTERS.map(roster => [roster, Object.fromEntries(BOARD_ROOMS.map(room => [room, fourSlotsOf(room, roster).map(slot => ({
      id: slot.id, feet: slot.feet, press: slot.press, badge: slot.badge, fx: slot.fx,
      depth: slot.depth, scale: slot.scale, mirror: slot.mirror, gesture: slot.gesture, down: slot.down, front: slot.front, about: slot.about,
    }))]))])),
  };
  const tableJson = `${JSON.stringify(table, null, 2)}\n`;
  files.set(SLOTS_FOUR_FILE, tableJson);
  return {
    version: FOUR_SLOTS_VERSION,
    status: 'proposal: the successor\'s four-bed Hospital (issue #155), beside the roster-sized ward, which is unchanged',
    beds: FOUR_BEDS,
    rosters: [...FOUR_ROSTERS],
    berths: FOUR_BERTHS.map(berth => ({ id: berth.id, row: berth.row, column: berth.column, gesture: berth.gesture, scale: berth.scale, mirror: berth.mirror, about: berth.about })),
    berthKits: { version: MEDICAL_FOUR_VERSION, module: 'design/board-v2/fx/medical-four.mjs fourBerthKit()', kits: fourBerthKits() },
    slotTable: { file: SLOTS_FOUR_FILE, version: FOUR_TABLE_VERSION, sha256: sha(tableJson), bytes: Buffer.byteLength(tableJson) },
    layout: { slots: 'design/board-v2/scenes/slots-four.mjs', fit: 'design/board-v2/js/fit-four.mjs (fit.mjs\'s fitBoardV2 itself: the current board panel for panel; its four slot functions fit.mjs\'s code over the successor\'s table)', turns: 'design/board-v2/js/turns-four.mjs (turns.mjs with its two imports alone changed)' },
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
