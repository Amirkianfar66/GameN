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
 * The viewports the board is laid out at, each in its shell: up to 600 px tall the compact one the
 * owner approved on 13 October 2026, up to 640 px the phone kit's short phone, and above its own
 * (docs/design/board-v2-slots.md, section 4). The board fits every one of them.
 */
const VIEWPORTS = [[320, 568], [360, 640], [360, 740], [375, 667], [390, 844], [393, 852], [414, 896], [430, 932]];
const TIER_OF = { '320x568': 'compact', '360x640': 'short' };

const { slotsOf, slotProblems, entrySlot, sceneOf, BOARD_ROOMS, ROSTERS } = await load('design/board-v2/scenes/slots.mjs');
const { WARD_BERTHS, wardBerths, wardScene } = await load('design/board-v2/scenes/hospital-ward.mjs');
const { SHELL, fitBoardV2, passClearance, shellFor, slotRects, slotsFit } = await load('design/board-v2/js/fit.mjs');
const { SCENES } = await load('design/board-motion/scenes/index.mjs');
const { frameScene } = await load('design/board-motion/scenes/frame.mjs');
const { BLACKOUT, blackoutContract, blackoutFlashes, blackoutFrame } = await load('design/board-v2/films/blackout.mjs');
const { FIXTURES, IMPACT_BOX, IMPACT_FLASH_RADIUS, sparkPlan } = await load('design/board-v2/scenes/lighting.mjs');

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
  const lighting = planned.has('design/board-v2/assets/manifest.json') ? JSON.parse(planned.get('design/board-v2/assets/manifest.json')).lighting.files : [];
  for (const [path, content] of planned) {
    if (!path.endsWith('.svg')) continue;
    if (/<text\b|<image\b|<script\b|<foreignObject\b|href=["']https?:/i.test(content)) problems.push(`${path}: outside the drawing vocabulary`);
    // A room is drawn in its scene's 1024 x 768 box; a sprite in the box its manifest entry gives.
    const sprite = lighting.find(entry => entry.file === path && entry.kind !== 'dark-room');
    const box = sprite ? sprite.viewBox : '0 0 1024 768';
    if (!content.includes(`viewBox="${box}"`)) problems.push(`${path}: not in its ${box} box`);
  }
  check('the ward and the lighting art are built from the approved rooms, current, and inside the drawing vocabulary', problems);
}

// ---------- The Blackout's lighting window ----------
{
  const problems = [];
  const B = BLACKOUT;
  // The server's window: five seconds lit, ten dark, the lights out at the preview's end.
  if (B.previewMs !== 5000 || B.windowMs !== 15000) problems.push(`the window is ${B.previewMs} + ${B.windowMs - B.previewMs} ms, not 5 000 + 10 000`);
  if (B.lightsOut[0] !== B.previewMs) problems.push('the lights do not go out at the preview\'s end');
  if (B.flicker[0] < B.markersIn[1] || B.flicker[1] > B.previewMs) problems.push('the flicker is not inside the lit preview');
  if (B.reduced.darkAt + B.reduced.fadeMs !== B.previewMs) problems.push('reduced motion is not dark at the preview\'s end');
  const opts = { outcomeAt: 15400, hits: ['B2', 'A3'], windowId: 'w-check' };
  for (const reduced of [false, true]) {
    for (let t = -500; t <= 17500; t += 10) {
      const frame = blackoutFrame(t, { ...opts, reduced });
      const where = `${reduced ? 'reduced, ' : ''}${t} ms`;
      // The full five seconds lit: the people on the board until the preview ends.
      if (t >= 0 && t < (reduced ? B.reduced.darkAt : B.previewMs) && frame.people !== 'shown') problems.push(`${where}: people leave before the preview ends`);
      // The full ten seconds dark: nobody on the page, the markers dark, the selection open.
      if (t >= (reduced ? B.previewMs : B.lightsOut[1]) && t < B.windowMs && (frame.darkness < 1 || frame.people !== 'gone' || frame.markers.style !== 'dark' || frame.markers.opacity < 1)) problems.push(`${where}: not fully dark with the markers up`);
      if (frame.selection !== (t >= B.previewMs && t < B.windowMs)) problems.push(`${where}: the selection is ${frame.selection ? 'open' : 'closed'}`);
      // Reduced motion: no flicker, sparks, impact frames or shake; no fade longer than 80 ms.
      if (reduced && (frame.sparks.frame || frame.impact.frame || frame.shake[0] || frame.shake[1] || (t < B.reduced.darkAt && frame.darkness > 0))) problems.push(`${where}: motion in the reduced variant`);
      // Shake moves the art by 3 px at most, and only where a position was hit.
      if (Math.max(Math.abs(frame.shake[0]), Math.abs(frame.shake[1])) > 3) problems.push(`${where}: a shake over 3 px`);
    }
    // The lights come back with the outcome, or at the cap without it.
    if (blackoutFrame(B.windowMs + B.holdCapMs + 600, { windowId: 'w-check', reduced }).darkness !== 0) problems.push(`${reduced ? 'reduced: ' : ''}the dark outlasts its cap with no outcome`);
  }
  // A strike that missed and a round with no strike are the same film: the outcome's hits are the only input that differs, and a miss has none.
  for (let t = 0; t <= 17000; t += 50) if (JSON.stringify(blackoutFrame(t, { outcomeAt: 15400, hits: [], windowId: 'w-check' })) !== JSON.stringify(blackoutFrame(t, { outcomeAt: 15400, hits: [], windowId: 'w-check', side: 'red', request: true }))) problems.push(`${t} ms: something besides the published outcome changes the film`);
  // The sparks: from the window's id alone, from each room's right-hand light.
  const plan = sparkPlan('w-check');
  if (JSON.stringify(plan) !== JSON.stringify(sparkPlan('w-check'))) problems.push('the same window sparks differently');
  for (const [room, entry] of Object.entries(plan)) if (entry.fixture !== FIXTURES[room].length - 1) problems.push(`${room}: sparks from a light other than its right-hand one`);
  // Flashes: three a second at most, the bright part of each a quarter of its panel at most.
  const flashes = blackoutFlashes(opts);
  for (let from = -1000; from <= 17000; from += 10) {
    const count = flashes.filter(flash => flash.at >= from && flash.at < from + 1000).reduce((sum, flash) => sum + 1, 0);
    if (count > B.flashLimit.perSecond) { problems.push(`${count} flashes in the second from ${from} ms`); break; }
  }
  for (const [width, height] of VIEWPORTS) {
    for (const roster of ROSTERS) {
      const board = fitBoardV2({ width, height }, roster);
      for (const room of BOARD_ROOMS) {
        const panel = board.panels[room];
        const area = panel.width * panel.height;
        const k = frameScene(sceneOf(room, roster), panel).k;
        const spark = Math.PI * (17 * k) ** 2;
        if (spark / area > B.flashLimit.panelShare) problems.push(`${width}x${height} ${room}: a spark's flash is ${Math.round((100 * spark) / area)}% of the panel`);
        // Every position of the room hit at once: the worst case.
        const impacts = slotRects(room, roster, panel).reduce((sum, rect) => sum + Math.PI * ((IMPACT_FLASH_RADIUS / IMPACT_BOX) * 1.6 * rect.side) ** 2, 0);
        if (impacts / area > B.flashLimit.panelShare) problems.push(`${width}x${height}, ${roster} players, ${room}: every position hit at once flashes ${Math.round((100 * impacts) / area)}% of the panel`);
      }
    }
  }
  // The film's contract is what the module says.
  const films = await json('design/board-v2/contract/films.json').catch(() => null);
  if (!films || JSON.stringify(films.films?.[0]) !== JSON.stringify(blackoutContract())) problems.push('contract/films.json is not the film\'s: run design/tools/board-v2-assets.mjs');
  for (const word of ROLE_WORDS) if (JSON.stringify(films ?? {}).includes(word)) problems.push(`contract/films.json names ${word}`);
  check('the Blackout\'s window: five seconds lit and ten dark, its film only public inputs, three flashes a second at most and none over a quarter of a panel', problems);
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

// ---------- Every slot is a whole, separate press area on every phone, clear of the Pass ----------
{
  const problems = [];
  // The shell: the compact tier is the short one 22 px smaller, and its Pass rises no higher than the board's clear foot.
  const [compact, short] = ['compact', 'short'].map(tier => SHELL.tiers.find(entry => entry.tier === tier));
  const chrome = tier => tier.top + tier.nav + 2 * tier.boardPadY;
  if (!compact || !short || compact.upTo !== 600 || short.upTo !== 640) problems.push('the shell tiers are not compact up to 600 px and short up to 640 px');
  else if (chrome(short) - chrome(compact) !== 22) problems.push(`the compact shell is ${chrome(short) - chrome(compact)} px smaller than the short one, not 22`);
  for (const tier of SHELL.tiers) if (tier.nav < 44 || tier.pass < 44) problems.push(`the ${tier.tier} shell: a navigation or a Pass under 44 px`);
  // The compact Pass stays below the lowest press areas whatever its shape; the phone kit's own is checked by its circle, below.
  if (compact && compact.passRise >= compact.boardPadY + SHELL.border + SHELL.pad) problems.push(`the compact shell: the Pass rises ${compact.passRise} px, into the lowest rooms' press areas`);
  for (const [width, height] of VIEWPORTS) {
    const tier = TIER_OF[`${width}x${height}`] ?? 'tall';
    if (shellFor(height).tier !== tier) problems.push(`${width}x${height}: the ${shellFor(height).tier} shell, not the ${tier} one`);
    for (const roster of ROSTERS) {
      const board = fitBoardV2({ width, height }, roster);
      if (!board.fits || board.deficit > 0) problems.push(`${width}x${height}, ${roster} players: ${board.problems.join('; ')}`);
      for (const room of BOARD_ROOMS) {
        const panel = board.panels[room];
        if (!slotsFit(room, roster, panel)) problems.push(`${width}x${height}, ${roster} players, ${room}: its slots' press areas do not fit its ${panel.width} x ${panel.height} panel`);
        for (const rect of slotRects(room, roster, panel)) if (rect.side < 44) problems.push(`${width}x${height}, ${rect.id}: a press area of ${rect.side} px`);
      }
      for (const slot of passClearance({ width, height }, roster)) if (slot.clearance <= 0) problems.push(`${width}x${height}, ${roster} players, ${slot.id}: under the Pass`);
    }
  }
  check('every slot of every room is a whole press area of 44 px at least, apart from every other and clear of the raised Pass, at every phone size (320 x 568 in the compact shell)', problems);
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
