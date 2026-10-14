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
/** Phone widths, and safe-area insets (top, right, bottom, left), at which every shell boundary is checked. */
const WIDTHS = [320, 340, 360, 375, 390, 393, 400, 412, 414, 428, 430];
const INSETS = [null, '20,0,0,0', '44,0,34,0', '47,0,34,0', '59,0,34,0'];

const slotsModule = await load('design/board-v2/scenes/slots.mjs');
const { slotsOf, slotProblems, sceneOf, BOARD_ROOMS, ROSTERS } = slotsModule;
const { WARD_BERTHS, wardBerths, wardScene } = await load('design/board-v2/scenes/hospital-ward.mjs');
const { CAPSULE, MIN_BOARD_WIDTH, SHELL, fitBoardV2, insetsOf, passClearance, shellFor, slotRects, slotsFit } = await load('design/board-v2/js/fit.mjs');
const { FIXTURES: FIXTURE_NAMES, fixtureSeats } = await load('design/board-v2/js/fixtures.mjs');
const { SCENES } = await load('design/board-motion/scenes/index.mjs');
const { frameScene } = await load('design/board-motion/scenes/frame.mjs');
const { BLACKOUT, blackoutContract, blackoutFlashes, blackoutFrame } = await load('design/board-v2/films/blackout.mjs');
const { FIXTURES, IMPACT_BOX, IMPACT_FLASH_RADIUS, sparkPlan } = await load('design/board-v2/scenes/lighting.mjs');
const { BLOCKED, STAR_SIZE, blockedContract, blockedEnd, blockedFrame, blockedStartInBlackout } = await load('design/board-v2/films/blocked.mjs');
const { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, SHIELD_BOX, SHIELD_FLASH_RADIUS, SHIELD_SIZE, shieldColorDistances } = await load('design/board-v2/fx/blocked.mjs');
const { BLACKOUT_OUTCOMES } = await load('design/board-v2/js/fixtures.mjs');
const { blockedTargets } = await load('design/board-v2/js/blocked-view.mjs');
const { CAPSULE_FILM, CAPSULE_STAGES, capsuleContract, capsuleEnd, capsuleFrame, seatedPose } = await load('design/board-v2/films/capsule.mjs');
const { BESIDE, CAPSULE_ACCENTS, CAPSULE_KEEP, CAPSULE_SEATS, CAPSULE_SIZE, CAPSULE_VIEW, DECK, DOOR, DOOR_FRAMES, DOORWAY, PATHS, TABLE, TAG_STRIP, frameCapsule } = await load('design/board-v2/scenes/capsule.mjs');
const { LOOP, POSE_NAMES, capsuleLoop, sittingPose, walkingPose } = await load('design/board-v2/figures/capsule.mjs');
const { cie76 } = await load('design/board-v2/fx/blocked.mjs');

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
  const manifest = planned.has('design/board-v2/assets/manifest.json') ? JSON.parse(planned.get('design/board-v2/assets/manifest.json')) : null;
  const sprites = manifest ? [...manifest.lighting.files, ...manifest.fx.files, ...(manifest.capsule?.files ?? [])] : [];
  for (const [path, content] of planned) {
    if (!path.endsWith('.svg')) continue;
    if (/<text\b|<image\b|<script\b|<foreignObject\b|href=["']https?:/i.test(content)) problems.push(`${path}: outside the drawing vocabulary`);
    // A room is drawn in its scene's 1024 x 768 box; a sprite in the box its manifest entry gives.
    const sprite = sprites.find(entry => entry.file === path && entry.kind !== 'dark-room');
    const box = sprite ? sprite.viewBox : '0 0 1024 768';
    if (!content.includes(`viewBox="${box}"`)) problems.push(`${path}: not in its ${box} box`);
  }
  check('the ward, the lighting, the effects and the capsule art are built from the approved rooms or their own modules, current, and inside the drawing vocabulary', problems);
}

// ---------- The Blackout's lighting window ----------
{
  const problems = [];
  const B = BLACKOUT;
  // The server's window: five seconds lit, ten dark (Q-B03a); the selection in [previewEndsAt, endsAt) only.
  if (B.previewMs !== 5000 || B.windowMs !== 15000) problems.push(`the window is ${B.previewMs} + ${B.windowMs - B.previewMs} ms, not 5 000 + 10 000`);
  if (B.flicker[0] < B.markersIn[1] || B.flicker[1] > B.previewMs) problems.push('the flicker is not inside the lit preview');
  const opts = { outcomeAt: 15400, hits: ['B2', 'A3'], windowId: 'w-check' };
  for (const reduced of [false, true]) {
    // Every millisecond either side of the two boundaries, and every 10 ms of the rest.
    const moments = [...new Set([...Array.from({ length: 1801 }, (_, i) => -500 + i * 10), 4998, 4999, 5000, 5001, 5100, 14998, 14999, 15000, 15001])].sort((a, b) => a - b);
    for (const t of moments) {
      const frame = blackoutFrame(t, { ...opts, reduced });
      const where = `${reduced ? 'reduced, ' : ''}${t} ms`;
      // The full five seconds lit: the people on the board until previewEndsAt, in both modes.
      if (t >= 0 && t < B.previewMs && (frame.people !== 'shown' || frame.peopleOpacity !== 1)) problems.push(`${where}: people leave before the preview ends`);
      // From previewEndsAt exactly, in both modes, the full ten seconds dark: nobody on the page, the markers dark, the selection open.
      if (t >= B.previewMs && t < B.windowMs && (frame.darkness !== 1 || frame.people !== 'gone' || frame.peopleOpacity !== 0 || frame.markers.style !== 'dark' || frame.markers.opacity < 1)) problems.push(`${where}: not fully dark with nobody on the page and the markers up`);
      if (frame.selection !== (t >= B.previewMs && t < B.windowMs)) problems.push(`${where}: the selection is ${frame.selection ? 'open' : 'closed'}`);
      // No selection while anyone is on the page, and nobody back on it before the outcome.
      if (frame.selection && frame.people !== 'gone') problems.push(`${where}: a selection with people on the page`);
      if (t >= B.previewMs && t < opts.outcomeAt && frame.people !== 'gone') problems.push(`${where}: people back before the outcome`);
      // The top bar's line: from the window's opening until the lights start back, with the clock.
      if (frame.line !== (t >= 0 && (frame.clock !== null))) problems.push(`${where}: the line and the clock disagree`);
      // Reduced motion: no flicker, sparks, impact frames or shake; no fade longer than 80 ms.
      if (reduced && (frame.sparks.frame || frame.impact.frame || frame.shake[0] || frame.shake[1] || (t < B.previewMs && frame.darkness > 0))) problems.push(`${where}: motion in the reduced variant`);
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

// ---------- ATTACK BLOCKED (S4) ----------
{
  const problems = [];
  const B = BLOCKED;
  // The storyboard's beats: incoming 0-120, the shield 120-360 from 0.8 to 1.05, absorbed 360-620,
  // the figure home by 900, the label from 620 held 1 600 and faded over 200; reduced 80 / 1 600 / 80.
  const beats = [B.incoming.join(), B.shieldFlash[0], B.shieldBubble[1], B.shieldScale.join(), B.absorb.join(), B.brace.to, B.label.from, B.label.holdMs, B.label.fadeMs, B.reduced.fadeMs, B.reduced.holdMs].join(' ');
  if (beats !== '0,120 120 360 0.8,1.05 360,620 900 620 1600 200 80 1600') problems.push(`the beats are ${beats}, not the storyboard's`);
  if (blockedEnd(false) !== 2420 || blockedEnd(true) !== 1760) problems.push(`the film ends at ${blockedEnd(false)} ms (reduced ${blockedEnd(true)}), not 2 420 (1 760)`);
  for (const reduced of [false, true]) {
    const end = blockedEnd(reduced);
    for (let t = -200; t <= 3000; t += 5) {
      const frame = blockedFrame(t, { reduced });
      const where = `${reduced ? 'reduced, ' : ''}${t} ms`;
      // Its only inputs are t and the setting: a defense, an attacker, a grantor, a count or a direction changes nothing.
      const json = JSON.stringify(frame);
      for (const extra of [{ cause: 'clone' }, { cause: 'protection' }, { defense: 'other', attacker: 3, grantor: 6, count: 2, usesLeft: 0, direction: 'left' }]) if (JSON.stringify(blockedFrame(t, { reduced, ...extra })) !== json) problems.push(`${where}: ${Object.keys(extra).join(', ')} changes the film`);
      // Reduced motion: a still ring and the label, no star, shield, particles or brace, no fade over 80 ms.
      if (reduced && (frame.star.on || frame.shield.frame || frame.particles.frame || frame.brace[0] || frame.brace[1] || frame.ring.scale !== 1)) problems.push(`${where}: motion in the reduced variant`);
      // The brace: a reduced jolt of 2 px at most, home by 900 ms.
      if (Math.hypot(...frame.brace) > Math.hypot(...B.brace.offset) + 0.01) problems.push(`${where}: a brace over ${Math.hypot(...B.brace.offset).toFixed(1)} px`);
      if (t >= B.brace.to && (frame.brace[0] || frame.brace[1])) problems.push(`${where}: the figure is not home`);
      // The words while the label is up, and only then; and nothing at all before the start or after the end.
      if (frame.announce !== frame.label.opacity > 0) problems.push(`${where}: the words and the label disagree`);
      const drawn = frame.star.on || frame.shield.frame || frame.ring.opacity > 0 || frame.particles.frame || frame.label.opacity > 0 || frame.brace[0] || frame.brace[1];
      if ((t < 0 || t >= end) && drawn) problems.push(`${where}: something drawn outside the film`);
      if (frame.done !== t >= end) problems.push(`${where}: done is ${frame.done}`);
    }
  }
  // In the Blackout: a block is a miss in public and starts once the lights are fully back.
  if (BLACKOUT_OUTCOMES.blocked.hits.length) problems.push('the Blackout\'s blocked outcome publishes a hit');
  if (blockedStartInBlackout(15400) !== 15400 + BLACKOUT.lightsReturn[1] || blockedStartInBlackout(15400, { reduced: true }) !== 15400 + BLACKOUT.reduced.fadeMs) problems.push('a block in the Blackout does not start once the lights are back');
  if (blockedStartInBlackout(20000) !== 20000 || blockedStartInBlackout(null) !== null) problems.push('a late outcome or no outcome starts a block');
  for (let t = 0; t <= 19000; t += 50) if (JSON.stringify(blackoutFrame(t, { outcomeAt: 15400, hits: BLACKOUT_OUTCOMES.blocked.hits, windowId: 'w-check' })) !== JSON.stringify(blackoutFrame(t, { outcomeAt: 15400, hits: BLACKOUT_OUTCOMES.miss.hits, windowId: 'w-check' }))) { problems.push(`${t} ms: the Blackout's public film differs for a block and a miss`); break; }
  // The review page's examples: the already-Injured target is the fixture's Injured patient in the Hospital at every roster,
  // and no example target is ever Injured outside the Hospital (G-05). The page reads the fixture and changes nobody.
  for (const roster of ROSTERS) {
    const seats = fixtureSeats('mixed', roster);
    const [patient] = blockedTargets(new URLSearchParams('injured=1'), seats);
    if (patient?.room !== 'hospital' || patient?.health !== 'Injured') problems.push(`${roster} players: the already-Injured example is not a patient in the Hospital`);
    for (const query of ['', 'targets=B2,B4', 'injured=1', 'targets=A1,C1,H1,J2,B4']) {
      for (const seat of blockedTargets(new URLSearchParams(query), seats)) if (seat.health === 'Injured' && seat.room !== 'hospital') problems.push(`${roster} players, ${query || 'the default'}: an Injured target in ${seat.room}`);
    }
    for (const outcome of Object.values(BLACKOUT_OUTCOMES)) for (const id of outcome.blocks) { const seat = seats.find(entry => entry.slot === id); if (seat?.health === 'Injured' && seat.room !== 'hospital') problems.push(`${roster} players: a Blackout block on an Injured target in ${seat.room}`); }
  }
  // Its colors are far from every faction accent, and those are the tokens'.
  const tokens = await json('packages/design-tokens/src/tokens-0.4.0.json');
  if (JSON.stringify(FACTION_ACCENTS) !== JSON.stringify(tokens.color?.factionPrivateOrRevealed)) problems.push('the faction accents measured against are not tokens-0.4.0\'s');
  for (const [name, { nearest, distance }] of Object.entries(shieldColorDistances())) if (distance < MIN_ACCENT_DISTANCE) problems.push(`the shield's ${name} is ${distance} from the ${nearest} accent`);
  // Flashes: the shield's one, with the Blackout's, three a second at most; its white core, with every
  // slot of a room blocked at once at the largest the flash frame draws it, a quarter of the panel at most.
  const flashScale = Math.max(...Array.from({ length: B.shieldFlash[1] - B.shieldFlash[0] }, (_, i) => blockedFrame(B.shieldFlash[0] + i).shield.scale));
  const withBlock = [...blackoutFlashes({ outcomeAt: 15400, hits: ['A3'] }), { at: blockedStartInBlackout(15400) + B.shieldFlash[0] }];
  for (let from = -1000; from <= 19000; from += 10) if (withBlock.filter(flash => flash.at >= from && flash.at < from + 1000).length > BLACKOUT.flashLimit.perSecond) { problems.push(`more than ${BLACKOUT.flashLimit.perSecond} flashes in the second from ${from} ms with a hit and a block`); break; }
  for (const [width, height] of VIEWPORTS) {
    for (const roster of ROSTERS) {
      const board = fitBoardV2({ width, height }, roster);
      for (const room of BOARD_ROOMS) {
        const panel = board.panels[room];
        const cores = slotRects(room, roster, panel).reduce((sum, rect) => sum + Math.PI * ((SHIELD_FLASH_RADIUS / SHIELD_BOX) * SHIELD_SIZE * rect.side * flashScale) ** 2, 0);
        if (cores / (panel.width * panel.height) > BLACKOUT.flashLimit.panelShare) problems.push(`${width}x${height}, ${roster} players, ${room}: every slot blocked at once flashes ${Math.round((100 * cores) / (panel.width * panel.height))}% of the panel`);
      }
    }
  }
  // The contract is the module's, and names no role.
  const films = await json('design/board-v2/contract/films.json').catch(() => null);
  if (!films || JSON.stringify(films.films?.[1]) !== JSON.stringify(blockedContract())) problems.push('contract/films.json does not hold the film\'s contract: run design/tools/board-v2-assets.mjs');
  if (blockedContract().audience.film.indexOf('room-visible') !== 0) problems.push('the film is not room-visible');
  if (STAR_SIZE !== 1.6) problems.push(`the incoming star is ${STAR_SIZE} press sides, not the Blackout impact's 1.6`);
  check('ATTACK BLOCKED: the storyboard\'s beats, the same film for every defense, a miss to everyone outside the room, its colors apart from the faction accents, its flash under a quarter of a panel, and the already-Injured example a patient in the Hospital', problems);
}

// ---------- The private-talk capsule (S2) ----------
{
  const problems = [];
  const F = CAPSULE_FILM;
  const ids = CAPSULE_SEATS.map(seat => seat.id);
  // The layout: on a phone, every room where it is without the capsule and the Command Room in its
  // place, the capsule on its right, as tall, 2:1 within a pixel, its right edge the band's; C1 a
  // whole press area of 44 px and clear of the Pass; at every phone width, inset and height.
  let layouts = 0;
  for (const width of WIDTHS) {
    for (const safe of INSETS) {
      for (let height = 540; height <= 960; height += 3) {
        for (const roster of ROSTERS) {
          layouts += 1;
          const where = `${width}x${height}${safe ? ` (insets ${safe})` : ''}, ${roster} players`;
          const insets = insetsOf(safe);
          const plain = fitBoardV2({ width, height }, roster, { insets });
          const board = fitBoardV2({ width, height }, roster, { insets, capsule: true });
          const same = ['fits', 'fallback', 'boardTop', 'boardLeft', 'boardWidth', 'bands', 'navTop', 'pass'].every(key => JSON.stringify(plain[key]) === JSON.stringify(board[key])) && plain.shell.tier === board.shell.tier;
          if (!same) { problems.push(`${where}: the capsule changes the board's shell, fallback or bands`); continue; }
          for (const room of BOARD_ROOMS.filter(name => name !== 'command-room')) if (JSON.stringify(plain.boxes[room]) !== JSON.stringify(board.boxes[room])) problems.push(`${where}: ${room} moves with the capsule`);
          if (!board.fits) continue;
          const command = board.boxes['command-room'], capsule = board.boxes[CAPSULE.id];
          if (['left', 'top', 'height'].some(key => command[key] !== plain.boxes['command-room'][key])) problems.push(`${where}: the Command Room moves with the capsule`);
          if (Math.abs(capsule.left - (command.left + command.width + board.shell.gap)) > 0.01 || capsule.top !== command.top || capsule.height !== command.height) problems.push(`${where}: the capsule is not beside the Command Room, as tall`);
          if (Math.abs(capsule.left + capsule.width - (plain.boxes['command-room'].left + plain.boxes['command-room'].width)) > 0.01) problems.push(`${where}: the capsule does not end where the band ends`);
          if (Math.abs(board.panels['command-room'].width - 2 * board.panels[CAPSULE.id].width) > 1) problems.push(`${where}: ${board.panels['command-room'].width} and ${board.panels[CAPSULE.id].width} px are not 2:1`);
          if (!slotsFit('command-room', roster, board.panels['command-room'])) problems.push(`${where}: C1 does not fit the Command Room's panel`);
          for (const rect of slotRects('command-room', roster, board.panels['command-room'])) if (rect.side < 44) problems.push(`${where}: C1 is ${rect.side} px`);
          for (const slot of passClearance({ width, height }, roster, { insets, capsule: true })) if (slot.clearance <= 0) problems.push(`${where}, ${slot.id}: under the Pass`);
        }
      }
    }
  }
  // The cabin in its panel: it covers the panel, and the seated pair's heads are whole and above their
  // name tags' strip at every phone size; at the phones measured the status light over the doorway is
  // whole too and the view's sides within 2 px (a short panel crops the floor first).
  const cutOf = (box, { k, tx, ty }, panel, foot = 0) => ({ left: -(box.left * k + tx), right: box.right * k + tx - panel.width, top: -(box.top * k + ty), bottom: box.bottom * k + ty - (panel.height - foot) });
  const head = sittingPose('sit', {}).head;
  const heads = { left: CAPSULE_SEATS[0].at[0] + (62 - head[0]) * CAPSULE_SEATS[0].scale - 30, right: CAPSULE_SEATS[1].at[0] + (head[0] - 62) * CAPSULE_SEATS[1].scale + 30, top: CAPSULE_KEEP.bottom - 62, bottom: CAPSULE_KEEP.bottom };
  const light = { left: DOOR.x0, right: DOOR.x1, top: CAPSULE_KEEP.top, bottom: DOOR.top };
  let framings = 0;
  for (const width of WIDTHS) {
    for (const safe of INSETS) {
      for (let height = 480; height <= 1000; height += 4) {
        for (const roster of ROSTERS) {
          const board = fitBoardV2({ width, height }, roster, { insets: insetsOf(safe), capsule: true });
          if (!board.fits) continue;
          framings += 1;
          const panel = board.panels[CAPSULE.id];
          const frame = frameCapsule(panel);
          if (frame.k * CAPSULE_SIZE[0] < panel.width - 0.01 || frame.k * CAPSULE_SIZE[1] < panel.height - 0.01) problems.push(`${width}x${height}: the cabin does not cover its panel`);
          const where = `${width}x${height}${safe ? ` (insets ${safe})` : ''}, ${roster} players`;
          if (Math.max(...Object.values(cutOf(heads, frame, panel, TAG_STRIP))) > 0.01) problems.push(`${where}: the seated pair's heads are cut or under their name tags`);
        }
      }
    }
  }
  for (const [width, height] of VIEWPORTS) {
    for (const roster of ROSTERS) {
      const panel = fitBoardV2({ width, height }, roster, { capsule: true }).panels[CAPSULE.id];
      const frame = frameCapsule(panel);
      const cut = cutOf(CAPSULE_VIEW, frame, panel);
      if (Math.max(cut.left, cut.right) > 2 || Math.max(...Object.values(cutOf(light, frame, panel))) > 0.01) problems.push(`${width}x${height}, ${roster} players: the cabin's view is cut by ${Object.entries(cut).map(([side, px]) => `${side} ${px.toFixed(1)}`).join(', ')} px, or its light`);
    }
  }
  if (BOARD_ROOMS.includes(CAPSULE.id) || (await text('design/board-v2/contract/slots.json')).includes('"capsule"')) problems.push('the capsule is a room or has slots');
  // The clock: the server's stages; the entrance over inside the result stage with a second to spare; the minute the server's.
  if (JSON.stringify(F.server) !== JSON.stringify({ declareMaxMs: 15000, resultMs: 5000, talkMs: 60000 })) problems.push(`the server's stages are ${JSON.stringify(F.server)}`);
  for (const reduced of [false, true]) if (capsuleEnd('result', { reduced }) > F.server.resultMs - 1000) problems.push(`the entrance ends at ${capsuleEnd('result', { reduced })} ms, less than a second before the conversation`);
  if (F.exit.endAt !== Math.max(...ids.map(id => F.exit.leave[id][1])) + F.exit.stepIn + F.exit.settle) problems.push('the exit\'s end is not its last return');
  const transitional = ['entering', 'sitting', 'standing', 'leaving', 'stepping', 'returning', 'settling'];
  const statesOf = frame => Object.values(frame.people).flatMap(person => [person.home.state, person.capsule.state]);
  for (const reduced of [false, true]) {
    const mode = reduced ? 'reduced, ' : '';
    for (const [stage, end] of [['declare', 15000], ['result', 5000], ['talk', 60000], ['exit', 4000]]) {
      for (let t = 0; t <= end; t += stage === 'talk' ? 250 : 10) {
        const where = `${mode}${stage} ${t} ms`;
        const frame = capsuleFrame(stage, t, { reduced });
        // Its only inputs: the stage, t, the named seats and the setting; a side, a claim, who asked or who speaks changes nothing.
        if (JSON.stringify(capsuleFrame(stage, t, { reduced, side: 'blue', claim: 'red', asked: 'P2', speaking: 'P1', role: 'Hacker', microphone: true })) !== JSON.stringify(frame)) problems.push(`${where}: something besides the public inputs changes the film`);
        // Reduced motion's one cross-fade (fadeMs): the only moment anyone is at both places.
        const swap = { result: F.reduced.entrance.swapAt, exit: F.reduced.exit.swapAt }[stage];
        const fading = reduced && swap !== undefined && t >= swap && t < swap + F.reduced.fadeMs;
        for (const id of ids) {
          const person = frame.people[id];
          if (!person) { problems.push(`${where}: ${id} is not drawn`); continue; }
          if (fading) continue;
          // Never in two places: never at its place and in the capsule at once; its place shows its away marker while it is away.
          if (person.home.figure > 0 && person.capsule.opacity > 0) problems.push(`${where}: ${id} is drawn at its place and in the capsule`);
          if (person.home.state !== 'present' && person.home.figure < 1 && person.home.ghost <= 0 && person.capsule.opacity <= 0 && !['standing', 'stepping'].includes(person.home.state)) problems.push(`${where}: ${id} is nowhere`);
          if (person.capsule.opacity > 0 && person.home.ghost < 1) problems.push(`${where}: ${id} is in the capsule without its away marker`);
        }
        // The door is open whenever someone walks through it; the light is lit only with both seated inside.
        if (Object.values(frame.people).some(person => ['entering', 'leaving'].includes(person.capsule.state) && person.capsule.opacity > 0) && frame.door !== DOOR_FRAMES - 1) problems.push(`${where}: someone walks through a shut door`);
        if (frame.busy && !Object.values(frame.people).every(person => person.capsule.state === 'seated')) problems.push(`${where}: the light is lit with someone not seated`);
        if (stage === 'talk' && (!frame.busy || frame.door !== 0 || Object.values(frame.people).some(person => person.capsule.state !== 'seated'))) problems.push(`${where}: not both seated behind a shut door, the light lit`);
        if (stage === 'result' && t >= capsuleEnd('result', { reduced }) && (!frame.busy || frame.door !== 0)) problems.push(`${where}: not settled after the entrance`);
        if (stage === 'exit' && t >= capsuleEnd('exit', { reduced }) && (frame.door !== 0 || frame.busy || Object.values(frame.people).some(person => person.home.state !== 'present' || person.capsule.state !== 'empty'))) problems.push(`${where}: not everyone back at their places after the exit`);
        if (stage === 'exit' && frame.busy) problems.push(`${where}: the light is lit during the exit`);
        // Reduced motion: no walking, no steps, no turning; the seated pose still.
        if (reduced && statesOf(frame).some(state => transitional.includes(state))) problems.push(`${where}: motion in the reduced variant`);
        // Nobody named: the capsule as when idle; every named seat settled (a reconnect): the stage's settled state, nothing played.
        const nobody = capsuleFrame(stage, t, { reduced, known: {} });
        if (nobody.door !== 0 || nobody.busy || nobody.highlight || Object.keys(nobody.people).length) problems.push(`${where}: something drawn with nobody named`);
        const one = capsuleFrame(stage, t, { reduced, known: { P1: 'live' } });
        if (Object.keys(one.people).join() !== 'P1') problems.push(`${where}: someone invented while one is named`);
        const reconnect = capsuleFrame(stage, t, { reduced, known: { P1: 'settled', P2: 'settled' } });
        if (statesOf(reconnect).some(state => transitional.includes(state)) || (stage !== 'declare' && reconnect.door !== 0)) problems.push(`${where}: a reconnect replays part of the film`);
      }
    }
    for (let t = 0; t <= F.server.talkMs; t += 500) if (reduced && JSON.stringify(seatedPose('P1', t, {}, { exchangeId: 'x', reduced })) !== JSON.stringify(sittingPose('sit', {}))) { problems.push(`reduced, talk ${t} ms: a variation in the reduced variant`); break; }
    if (reduced && (F.reduced.fadeMs > 80)) problems.push(`reduced motion fades over ${F.reduced.fadeMs} ms`);
  }
  // The paths: from the doorway to the stop beside the chair, on the deck, the feet never within 10 units of the table's span at its depth.
  const onDeck = ([x, y]) => DECK.every((a, i) => { const b = DECK[(i + 1) % DECK.length]; return (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]) >= -0.01; });
  for (const id of ids) {
    const path = PATHS[id];
    if (JSON.stringify(path[0]) !== JSON.stringify(DOORWAY.at) || JSON.stringify(path.at(-1)) !== JSON.stringify(BESIDE[id])) problems.push(`${id}: its path does not run from the doorway to its chair`);
    for (let i = 1; i < path.length; i += 1) {
      for (let u = 0; u <= 1; u += 0.01) {
        const x = path[i - 1][0] + (path[i][0] - path[i - 1][0]) * u, y = path[i - 1][1] + (path[i][1] - path[i - 1][1]) * u;
        if (Math.abs(x - TABLE.cx) < TABLE.rx + 10 && y > TABLE.top - TABLE.ry && y < TABLE.foot + 10) { problems.push(`${id}: its path crosses the table at ${x.toFixed(0)},${y.toFixed(0)}`); break; }
        if (!onDeck([x, y])) { problems.push(`${id}: its path leaves the deck at ${x.toFixed(0)},${y.toFixed(0)}`); break; }
      }
    }
  }
  // The poses: what the board already shows, kept; the variations a public schedule.
  for (const status of [{}, { injured: true }, { jailed: true }, { injured: true, jailed: true }]) {
    const poses = [...POSE_NAMES.map(name => [name, sittingPose(name, status)]), ...[0, 0.25, 0.5, 0.75].map(phase => [`walk ${phase}`, walkingPose(phase, status)])];
    for (const [name, sk] of poses) {
      const where = `${JSON.stringify(status)} ${name}`;
      if (status.injured && !sk.bandage) problems.push(`${where}: the bandage is gone`);
      if (!status.injured && sk.bandage) problems.push(`${where}: a bandage on someone not Injured`);
      if (status.jailed && Math.hypot(sk.wF[0] - sk.wN[0], sk.wF[1] - sk.wN[1]) > 8) problems.push(`${where}: a prisoner's hands apart`);
    }
  }
  for (const id of ids) {
    const { keys, blinks } = capsuleLoop('x-check', id);
    if (JSON.stringify(capsuleLoop('x-check', id)) !== JSON.stringify({ keys, blinks })) problems.push(`${id}: the schedule is not the same on every screen`);
    if (keys[0].pose !== 'sit' || keys[0].at !== 0 || keys.some(key => !POSE_NAMES.includes(key.pose))) problems.push(`${id}: the schedule starts elsewhere or names a pose that is not drawn`);
    keys.slice(2).forEach((key, i) => { const hold = key.at - keys[i + 1].at; if (hold < LOOP.hold[0] || hold > LOOP.hold[1]) problems.push(`${id}: a pose held ${hold} ms`); });
  }
  if (JSON.stringify(capsuleLoop('x-check', 'P1')) === JSON.stringify(capsuleLoop('x-check', 'P2'))) problems.push('the two participants move together');
  // The colors an exchange adds (the status light, the badge, the outline) far from every faction accent, and tokens'.
  const tokens = await json('packages/design-tokens/src/tokens-0.4.0.json');
  const eventColors = { busy: CAPSULE_ACCENTS.busy, busyGlow: CAPSULE_ACCENTS.busyGlow, badge: CAPSULE_ACCENTS.lamp, outline: '#F7C52B' };
  for (const [name, hex] of Object.entries(eventColors)) for (const [faction, accent] of Object.entries(FACTION_ACCENTS)) if (cie76(hex, accent) < MIN_ACCENT_DISTANCE) problems.push(`the capsule's ${name} ${hex} is ${Math.round(cie76(hex, accent))} from the ${faction} accent`);
  if (CAPSULE_ACCENTS.lamp !== tokens.color.caption || CAPSULE_ACCENTS.busy !== tokens.color.caption || CAPSULE_ACCENTS.glow !== tokens.color.room.commandRoom.pale || CAPSULE_ACCENTS.busyGlow !== tokens.color.room.commandRoom.pale) problems.push('the capsule\'s accents are not tokens-0.4.0\'s');
  if (!(await text('design/board-v2/css/page.css')).includes('rgba(247, 197, 43, var(--pair, 1))')) problems.push('the pair\'s outline is not caption yellow');
  // The contract: the module's, public, and no role in it.
  const films = await json('design/board-v2/contract/films.json').catch(() => null);
  const contract = capsuleContract();
  if (!films || JSON.stringify(films.films?.[2]) !== JSON.stringify(contract)) problems.push('contract/films.json does not hold the capsule\'s contract: run design/tools/board-v2-assets.mjs');
  if (!contract.audience.film.startsWith('public') || !contract.audience.claim.startsWith('participant-private')) problems.push('the capsule\'s audiences are not public film and private claim');
  for (const word of ROLE_WORDS) if (JSON.stringify(contract).includes(word)) problems.push(`the capsule's contract names ${word}`);
  for (const input of ['the declared side', 'who is speaking', 'an animation\'s completion']) if (!contract.notInputs.some(entry => entry.includes(input))) problems.push(`the contract does not rule out ${input}`);
  if (CAPSULE_STAGES.join() !== 'idle,declare,result,talk,exit') problems.push(`the stages are ${CAPSULE_STAGES.join(', ')}`);
  check(`the private-talk capsule: beside the Command Room at 2:1, every other room where it is without it (${layouts} phone layouts), the seated pair's heads always in view (${framings} framings); the entrance inside the result stage with a second to spare, the minute the server's, the exit blocking nothing; only public inputs; never in two places; a reconnect and the reduced variant play nothing; the paths clear of the table; patients and prisoners as the board draws them; no faction color`, problems);
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
  // The table allocates nothing: which slot a seat holds is Backend's stored slotId, by the
  // specification's lowest-free rule in the table's numbering (rules-contracts.md). No function of
  // the drawing module picks a slot, and the table says where the rule lives.
  for (const name of Object.keys(slotsModule)) if (/entry|alloc|assign|pick|take/i.test(name)) problems.push(`slots.mjs exports ${name}: the drawing module allocates no slot`);
  const tableJson = await json('design/board-v2/contract/slots.json');
  if (!/allocates nothing/.test(tableJson.note) || !/lowest-free/.test(tableJson.note)) problems.push('the slot table does not say that it allocates nothing and that Backend\'s lowest-free rule does');
  // Every synthetic fixture holds one seat per slot and one slot per seat, in slots that exist.
  for (const roster of ROSTERS) {
    for (const name of FIXTURE_NAMES) {
      const seats = fixtureSeats(name, roster);
      const ids = seats.map(seat => seat.slot);
      if (new Set(ids).size !== ids.length) problems.push(`${name}, ${roster} players: two seats share a slot`);
      if (new Set(seats.map(seat => seat.seat)).size !== seats.length) problems.push(`${name}, ${roster} players: a seat holds two slots`);
      for (const seat of seats) if (!slotsOf(seat.room, roster).some(slot => slot.id === seat.slot)) problems.push(`${name}, ${roster} players: seat ${seat.seat} at ${seat.slot}, not a slot of ${seat.room}`);
    }
  }
  // Nothing of a role is in the slot table or the ward's art.
  const table = await text('design/board-v2/contract/slots.json');
  const manifest = await text('design/board-v2/assets/manifest.json');
  for (const word of ROLE_WORDS) {
    if (table.includes(word)) problems.push(`the slot table names ${word}`);
    if (manifest.includes(word)) problems.push(`the ward's manifest names ${word}`);
  }
  if (WARD_BERTHS.some(berth => !['bedLying', 'bedSitting'].includes(berth.gesture))) problems.push('a berth uses a gesture other than the approved Hospital beds\'');
  check('every room has its fixed slots, the reviewed places unmoved, the ward one berth per seat, in drawing order; the table allocates nothing', problems);
}

// ---------- Every slot is a whole, separate press area on every phone, clear of the Pass ----------
{
  const problems = [];
  // The shell: the compact tier is the short one 22 px smaller, and its Pass rises no higher than the board's clear foot.
  const [compact, short] = ['compact', 'short'].map(tier => SHELL.tiers.find(entry => entry.tier === tier));
  const chrome = tier => tier.top + tier.nav + 2 * tier.boardPadY;
  if (!compact || !short || compact.upTo !== 600 || short.upTo !== 640) problems.push('the shell tiers are not compact up to 600 px and short up to 640 px');
  else if (chrome(short) - chrome(compact) !== 22) problems.push(`the compact shell is ${chrome(short) - chrome(compact)} px smaller than the short one, not 22`);
  if (compact && (compact.top !== 36 || compact.nav !== 48 || compact.boardPadY !== 2)) problems.push(`the compact shell is ${compact.top}/${compact.nav}/${compact.boardPadY} px, not the approved 36/48/2`);
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

// ---------- The shell is chosen by what fits, at every boundary, with and without safe areas ----------
{
  const problems = [];
  const chrome = tier => tier.top + tier.nav + 2 * tier.boardPadY;
  const order = SHELL.tiers.map(tier => tier.tier);
  let boards = 0;
  for (const width of WIDTHS) {
    const rooms = fitBoardV2({ width, height: 2000 }, 9).needs.reduce((a, b) => a + b, 0) + 2 * SHELL.gap;
    for (const safe of INSETS) {
      const insets = insetsOf(safe);
      const extra = insets.top + insets.bottom;
      // One pixel either side of every height where a shell starts to fit, and of the phone kit's steps.
      const edges = SHELL.tiers.flatMap(tier => [rooms + chrome(tier) - 1, rooms + chrome(tier), rooms + chrome(tier) + 1]).map(h => Math.ceil(h + extra));
      const heights = [...new Set([...edges, ...[599, 600, 601, 602, 639, 640, 641, 642].map(h => h + extra), 560 + extra, 900])].sort((a, b) => a - b);
      for (const height of heights) {
        for (const roster of ROSTERS) {
          boards += 1;
          const where = `${width}x${height}${safe ? ` (insets ${safe})` : ''}, ${roster} players`;
          const board = fitBoardV2({ width, height }, roster, { insets });
          const usable = height - extra;
          const ceiling = shellFor(usable);
          if (board.ceiling !== ceiling.tier) problems.push(`${where}: the ceiling is ${board.ceiling}, not ${ceiling.tier}`);
          if (order.indexOf(board.shell.tier) > order.indexOf(ceiling.tier)) problems.push(`${where}: the ${board.shell.tier} shell is larger than the phone kit's ${ceiling.tier}`);
          // The largest shell up to the ceiling that fits the full width is the one chosen; none, a fallback.
          // rooms: the bands' needs and the two gaps between them; a shell fits where its bars and padding leave that.
          const fitting = SHELL.tiers.filter(tier => order.indexOf(tier.tier) <= order.indexOf(ceiling.tier) && usable - chrome(tier) >= rooms - 0.01);
          const best = fitting.at(-1)?.tier ?? null;
          if (best && (board.fallback || board.shell.tier !== best)) problems.push(`${where}: the ${board.shell.tier} shell${board.fallback ? ` (${board.fallback})` : ''}, though the ${best} one fits`);
          if (!best && !board.fallback) problems.push(`${where}: no shell fits, and no fallback`);
          if (board.fallback === 'narrow' && (board.shell.tier !== 'compact' || board.boardWidth >= width - insets.left - insets.right || board.boardWidth < MIN_BOARD_WIDTH)) problems.push(`${where}: a narrow board of ${board.boardWidth} px`);
          if ((board.fallback === 'too-short' || board.fallback === 'too-narrow') && board.fits) problems.push(`${where}: ${board.fallback}, yet said to fit`);
          if (board.fallback === 'too-narrow' && width - insets.left - insets.right >= MIN_BOARD_WIDTH) problems.push(`${where}: too narrow at ${width - insets.left - insets.right} px`);
          if (board.fallback !== 'too-short' && board.fallback !== 'too-narrow') {
            if (!board.fits || board.deficit > 0) problems.push(`${where}: drawn ${board.deficit.toFixed(1)} px short: ${board.problems.join('; ')}`);
            for (const room of BOARD_ROOMS) {
              const panel = board.panels[room];
              if (!slotsFit(room, roster, panel)) problems.push(`${where}, ${room}: its slots do not fit its panel`);
              for (const rect of slotRects(room, roster, panel)) if (rect.side < 44) problems.push(`${where}, ${rect.id}: a ${rect.side} px press area`);
            }
            // The lowest room's foot is above the navigation, less the board's padding.
            const lowest = Math.max(...BOARD_ROOMS.map(room => board.boxes[room].top + board.boxes[room].height));
            if (lowest > board.navTop - board.shell.boardPadY + 0.01) problems.push(`${where}: the rooms run ${(lowest - board.navTop + board.shell.boardPadY).toFixed(1)} px under the navigation`);
            for (const slot of passClearance({ width, height }, roster, { insets })) if (slot.clearance <= 0) problems.push(`${where}, ${slot.id}: under the Pass`);
          }
        }
      }
    }
  }
  // Under the narrowest board, a board that does not fit says so as too narrow.
  for (const [width, height] of [[280, 653], [300, 640], [310, 700]]) {
    const board = fitBoardV2({ width, height }, 9);
    if (board.fallback !== 'too-narrow' || board.fits) problems.push(`${width}x${height}: ${board.fallback ?? 'no fallback'}, not too-narrow`);
  }
  check(`the shell is the largest that fits the usable height, never larger than the phone kit's for it; where none fits at the width, a narrower board; where none fits at all, the explicit too-short or too-narrow fallback (${boards} boards at ${WIDTHS.length} widths, ${INSETS.length} inset cases, every shell boundary)`, problems);
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
    for (const probe of report.probes ?? []) if (probe.problems.length) problems.push(`probe ${probe.viewport}, ${probe.roster} players: ${probe.problems.join('; ')}`);
    for (const entry of report.interactions ?? []) if (entry.problems.length) problems.push(`${entry.test}: ${entry.problems.join('; ')}`);
    for (const entry of report.disclosure ?? []) if (!entry.same) problems.push(`differs: ${entry.compare}`);
    for (const entry of report.labels ?? []) if (entry.problems.length) problems.push(`labels ${entry.viewport}, ${entry.roster} players: ${entry.problems.join('; ')}`);
    // The capsule's every stage, mode, status, loading state, viewer and roster is pictured.
    const files = index.captures.map(shot => shot.file);
    for (const name of ['390x844-idle', '320x568-idle', '390x844-declare-4000', '390x844-result-2400', '390x844-result-3600', '390x844-talk-0000', '390x844-talk-30000', '390x844-exit-0800', '390x844-reduced-result-0760', '390x844-reduced-exit-0040', '390x844-talk-20000-patient-prisoner', '390x844-talk-20000-captain-detainee', '390x844-loading-0', '390x844-loading-1', '390x844-late', '390x844-reconnect-result-2400', '390x844-reconnect-exit-0800', '390x844-moved-exit-1250', '390x844-participant-result-2400', '320x568-talk-30000', '390x844-talk-30000-r7', '390x844-talk-30000-r8', 'sheet']) if (!files.includes(`capsule-${name}.png`)) problems.push(`capsule-${name}.png: not captured`);
  }
  check('the captures are current, every measured board passed, every pointer probe and press landed, every compared page is the same, and the capsule is pictured in every state', problems);
}

for (const name of passed) console.log(`ok    ${name}`);
for (const failure of failures) console.error(`FAIL  ${failure}`);
console.log(`Board-v2 checks: ${passed.length} passed, ${failures.length} failures`);
if (failures.length) process.exitCode = 1;
