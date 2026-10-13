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
// - the manifest, with every file's size and hash.
//
//   node design/tools/board-v2-assets.mjs           writes design/board-v2/assets/ and contract/slots.json
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
import { WARD_BERTHS, WARD_ROSTERS, wardScene } from '../board-v2/scenes/hospital-ward.mjs';
import { BOARD_ROOMS, ROSTERS, SLOTS_VERSION, slotsOf } from '../board-v2/scenes/slots.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const OUT = 'design/board-v2/assets';
const SLOTS_FILE = 'design/board-v2/contract/slots.json';
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
  const recipes = JSON.parse(await readFile(resolve(root, 'design/source/export-recipes.json'), 'utf8'));
  const manifest = {
    devOnly: 'mothership:dev-only',
    manifestVersion: SLOTS_VERSION,
    status: 'proposal',
    baseBoard: 'board-motion-0.3.0',
    baseManifest: 'design-0.2.0',
    note: 'The Hospital as a ward with one berth per seat (7, 8 or 9) and the board\'s fixed slot table, for the owner\'s motion specification of 13 October 2026. The reviewed manifest, the board-motion proposal and every pinned drawing source are unchanged; this art is proposed for a later export revision and is adopted only through Integration.',
    rights: {
      origin: 'The approved Hospital\'s groups copied element for element from the repository\'s original vector source design/source/board/board-hospital.svg, recolored by the reviewed export recipe, around new vector drawing generated for this repository by design/board-v2/scenes/hospital-ward.mjs. No third-party artwork, font, photograph, traced image or generated raster image.',
      author: 'Visual and Motion Designer workstream: a Claude Code session working for the game owner.',
      license: recipes.rights.license,
      reuse: recipes.rights.reuse,
    },
    berths: WARD_BERTHS.map(berth => ({ id: berth.id, row: berth.row, column: berth.column, gesture: berth.gesture, scale: berth.scale, mirror: berth.mirror, rosters: berth.rosters, about: berth.about })),
    slotTable: { file: SLOTS_FILE, sha256: sha(slotsJson), bytes: Buffer.byteLength(slotsJson) },
    scenes,
  };
  files.set(`${OUT}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  return files;
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
