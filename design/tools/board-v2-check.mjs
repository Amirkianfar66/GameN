// mothership:dev-only
//
// The checks of the board-v2 proposal (design/board-v2/: the fixed slots and the Hospital ward)
// that need no browser:
//   node design/tools/board-v2-check.mjs
//   npm run check:board-v2 --workspace @mothership/design-tokens
//
// Each is a statement about files in this repository. None says anything about a phone, how the
// art looks or whether people can remember positions in the dark. The browser measurements are
// design/tools/board-v2-capture.mjs; this refuses captures made before an edit.

import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { planAssets } from './board-v2-assets.mjs';
import { boardV2InputsSha256 } from './lib/board-v2-inputs.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const text = path => readFile(resolve(repoRoot, path), 'utf8');
const json = async path => JSON.parse(await text(path));
const sha = content => createHash('sha256').update(content).digest('hex');
const load = path => import(pathToFileURL(resolve(repoRoot, path)).href);
const failures = [];
const passed = [];
const check = (name, problems) => { if (problems.length === 0) passed.push(name); else for (const problem of problems) failures.push(`${name}: ${problem}`); };
async function filesUnder(path) {
  const entries = await readdir(resolve(repoRoot, path), { withFileTypes: true, recursive: true }).catch(() => []);
  return entries.filter(entry => entry.isFile()).map(entry => `${entry.parentPath ?? entry.path}/${entry.name}`.replace(`${repoRoot}/`, '')).sort();
}

const ROLE_WORDS = ['Officer', 'Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Red Disabler', 'Alien'];
const TOOLS = ['design/tools/board-v2-assets.mjs', 'design/tools/board-v2-capture.mjs', 'design/tools/board-v2-check.mjs', 'design/tools/lib/board-v2-inputs.mjs'];
/**
 * The viewports the board is laid out at, and what is known not to fit: on a 320 x 568 phone the
 * rooms need more height than the phone kit's shell leaves the board (docs/design/board-v2-slots.md).
 * A change to that number is a change to the proposal: record it here and in the handoff.
 */
const VIEWPORTS = [[320, 568], [360, 640], [360, 740], [375, 667], [390, 844], [393, 852], [414, 896], [430, 932]];
const KNOWN_DEFICIT = { '320x568': 22 };

const { slotsOf, slotProblems, entrySlot, BOARD_ROOMS, ROSTERS } = await load('design/board-v2/scenes/slots.mjs');
const { WARD_BERTHS, wardBerths, wardScene } = await load('design/board-v2/scenes/hospital-ward.mjs');
const { fitBoardV2, slotRects, slotsFit } = await load('design/board-v2/js/fit.mjs');
const { SCENES } = await load('design/board-motion/scenes/index.mjs');

// ---------- Development material, fenced ----------
{
  const problems = [];
  for (const path of await filesUnder('design/board-v2')) {
    if (path.endsWith('.png')) {
      if (!path.startsWith('design/board-v2/review/')) problems.push(`${path}: a picture outside review/`);
      continue;
    }
    const content = await text(path);
    if (!content.includes('mothership:dev-only')) problems.push(`${path}: no development-only mark`);
    if (content.includes('explorations/')) problems.push(`${path}: reaches into design/explorations/`);
    if (/\b(?:fetch|import)\s*\(?\s*['"`]https?:|url\(\s*['"]?https?:|(?:src|href)=["']https?:/.test(content)) problems.push(`${path}: loads something from the network`);
    if (/(?:from|import\()\s*['"][^'"]*\/(?:apps|packages)\//.test(content)) problems.push(`${path}: imports production code`);
  }
  for (const path of TOOLS) if (!(await text(path).catch(() => '')).includes('mothership:dev-only')) problems.push(`${path}: no development-only mark`);
  check('the proposal is development material and reaches nowhere it should not', problems);
}

// ---------- What is pinned or proposed for adoption is untouched ----------
{
  const problems = [];
  const ports = await json('design/tools/lib/reviewed-drawing-ports.json');
  for (const [path, expected] of Object.entries(ports.sourceHashes)) {
    if (sha(await readFile(resolve(repoRoot, path))) !== expected) problems.push(`${path}: differs from the reviewed drawing source at ${ports.sourceCommit}`);
  }
  // Frontend's adoption proposal (bc92e58) pins these sources of PR #127; the pinned stylesheet of the ability art.
  const proposed = {
    'design/board-motion/figures/wardrobe.mjs': '1c30862d77ce7fa94275934467c5b596e68dbe0d41f3d102bd0c040bc5feca6f',
    'design/phone-kit/source/art.mjs': 'c86770765e06f487b5fa0f3b2be57c824d114a796a5930f96ff35c7358f95761',
    'design/abilities/css/abilities.css': 'cfcc1e29239840a22210df26a8c09439101f658f1e11f5fd7ab89f21b2e6b808',
  };
  for (const [path, expected] of Object.entries(proposed)) if (sha(await readFile(resolve(repoRoot, path))) !== expected) problems.push(`${path}: differs from the hash proposed for adoption`);
  check('every pinned drawing source and every source proposed for adoption is byte for byte as reviewed', problems);
}

// ---------- The ward is built from the approved source, in the drawing vocabulary ----------
{
  const problems = [];
  const source = await text('design/source/board/board-hospital.svg');
  for (const roster of ROSTERS) {
    const scene = wardScene(roster);
    for (const group of [...scene.under, ...scene.over]) if (!source.includes(`id="${group}"`)) problems.push(`${roster}: the approved group ${group} is not in board-hospital.svg`);
    if (scene.under.includes('hospital-props-back') || scene.over.includes('hospital-props-back')) problems.push(`${roster}: the sick bay's beds are lifted into the ward`);
  }
  let planned = new Map();
  try { planned = await planAssets(repoRoot); } catch (error) { problems.push(`the ward cannot be built: ${String(error.message).split('\n')[0]}`); }
  for (const [path, content] of planned) if ((await text(path).catch(() => null)) !== content) problems.push(`${path}: not what design/tools/board-v2-assets.mjs makes: run it`);
  for (const path of await filesUnder('design/board-v2/assets')) if (!planned.has(path)) problems.push(`${path}: not made by design/tools/board-v2-assets.mjs`);
  for (const [path, content] of planned) {
    if (!path.endsWith('.svg')) continue;
    if (/<text\b|<image\b|<script\b|<foreignObject\b|href=["']https?:/i.test(content)) problems.push(`${path}: outside the drawing vocabulary`);
    if (!content.includes('viewBox="0 0 1024 768"')) problems.push(`${path}: not in the room's 1024 x 768 box`);
  }
  check('the ward is built from the approved Hospital, its art is current and inside the drawing vocabulary', problems);
}

// ---------- The slots ----------
{
  const problems = [];
  for (const roster of ROSTERS) {
    problems.push(...slotProblems(roster).map(problem => `${roster} players: ${problem}`));
    const ward = slotsOf('hospital', roster).map(slot => slot.id);
    const expected = Array.from({ length: roster }, (_, index) => `H${index + 1}`);
    if (ward.join() !== expected.join()) problems.push(`${roster} players: the ward's berths are ${ward.join(' ')}`);
    if (wardBerths(roster).length !== roster) problems.push(`${roster} players: ${wardBerths(roster).length} berths`);
  }
  // The reviewed rooms' places are the slots, unmoved.
  for (const room of BOARD_ROOMS.filter(room => room !== 'hospital')) {
    const places = SCENES[room].slots;
    slotsOf(room, 9).forEach((slot, index) => {
      const place = places[index];
      if (!place || place.id !== slot.id || place.at[0] !== slot.at[0] || place.at[1] !== slot.at[1] || place.scale !== slot.scale || place.gesture !== slot.gesture || Boolean(place.mirror) !== slot.mirror) problems.push(`${slot.id}: not the reviewed place ${place?.id ?? '(none)'}`);
    });
  }
  // A berth's layer is drawn over its own patient and under the row in front.
  for (const roster of ROSTERS) {
    const scene = wardScene(roster);
    for (const slot of scene.slots) {
      const front = scene.layers[slot.front];
      if (!front) { problems.push(`${roster}: ${slot.id} has no front layer`); continue; }
      if (!(front.depth > slot.depth)) problems.push(`${roster}: ${slot.id}'s blanket is drawn under its patient`);
      for (const other of scene.slots) if (other.row !== slot.row && other.depth > slot.depth && !(front.depth < other.depth)) problems.push(`${roster}: ${slot.id}'s blanket is drawn over ${other.id}`);
    }
  }
  // The Designer's proposal for entry: nobody already there moves, the ward fills front row first.
  if (entrySlot('hospital', 9, 5, ['H1', 'H2']) !== 'H3') problems.push('the ward does not fill in its berths\' order');
  if (entrySlot('hospital', 7, 1, ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7']) !== null) problems.push('a full ward still takes someone');
  if (entrySlot('room-a', 9, 6, ['A1']) !== 'A2') problems.push('a seat does not go on to the next slot when its own is taken');
  if (entrySlot('room-a', 9, 2, []) !== 'A2') problems.push('seat 2 does not first try A2');
  if (entrySlot('command-room', 9, 4, []) !== 'C1') problems.push('the Captain does not take C1');
  // Nothing of a role is in the slot table or the ward's art.
  const table = await text('design/board-v2/contract/slots.json');
  const manifest = await text('design/board-v2/assets/manifest.json');
  for (const word of ROLE_WORDS) {
    if (table.includes(word)) problems.push(`the slot table names ${word}`);
    if (manifest.includes(word)) problems.push(`the ward's manifest names ${word}`);
  }
  if (WARD_BERTHS.some(berth => !['bedLying', 'bedSitting'].includes(berth.gesture))) problems.push('a berth uses a gesture other than the approved Hospital beds\'');
  check('every room has its fixed slots, the reviewed places unmoved, the ward one berth per seat, in drawing order', problems);
}

// ---------- Every slot is a whole, separate press area on every phone ----------
{
  const problems = [];
  for (const [width, height] of VIEWPORTS) {
    for (const roster of ROSTERS) {
      const board = fitBoardV2({ width, height }, roster);
      const known = KNOWN_DEFICIT[`${width}x${height}`] ?? 0;
      if (Math.round(board.deficit) !== known) problems.push(`${width}x${height}, ${roster} players: the rooms need ${Math.round(board.deficit)} px more than the board has (recorded: ${known})`);
      for (const room of BOARD_ROOMS) {
        const panel = board.panels[room];
        if (!slotsFit(room, roster, panel)) problems.push(`${width}x${height}, ${roster} players, ${room}: its slots' press areas do not fit its ${panel.width} x ${panel.height} panel`);
        for (const rect of slotRects(room, roster, panel)) if (rect.side < 44) problems.push(`${width}x${height}, ${rect.id}: a press area of ${rect.side} px`);
      }
    }
  }
  check('every slot of every room is a whole press area of 44 px at least, apart from every other, at every phone size (320 x 568: the recorded shortfall)', problems);
}

// ---------- The captures were made from the current pages ----------
{
  const problems = [];
  const index = await json('design/board-v2/review/index.json').catch(() => null);
  const report = await json('design/board-v2/review/report.json').catch(() => null);
  if (!index || !report) problems.push('no captures: run design/tools/board-v2-capture.mjs');
  else {
    if (index.inputsSha256 !== await boardV2InputsSha256(repoRoot)) problems.push('the pages changed since the last capture: run design/tools/board-v2-capture.mjs');
    for (const shot of index.captures) if (!(await filesUnder('design/board-v2/review')).includes(`design/board-v2/review/${shot.file}`)) problems.push(`${shot.file}: listed but missing`);
    for (const shot of report.shots) if (shot.problems.length) problems.push(`${shot.file}: ${shot.problems.join('; ')}`);
  }
  check('the captures are current and every measured board passed', problems);
}

for (const name of passed) console.log(`ok    ${name}`);
for (const failure of failures) console.error(`FAIL  ${failure}`);
console.log(`Board-v2 checks: ${passed.length} passed, ${failures.length} failures`);
if (failures.length) process.exitCode = 1;
