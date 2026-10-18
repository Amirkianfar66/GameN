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
const { BESIDE, CAPSULE_ACCENTS, CAPSULE_KEEP, CAPSULE_SEATS, CAPSULE_SIZE, CAPSULE_VIEW, CAPTION_CLEAR, DECK, DOOR, DOOR_FRAMES, DOORWAY, PATHS, TABLE, TAG_STRIP, capsuleTargets, frameCapsule } = await load('design/board-v2/scenes/capsule.mjs');
const { LOOP, POSE_NAMES, capsuleLoop, sittingPose, walkingPose } = await load('design/board-v2/figures/capsule.mjs');
const { cie76 } = await load('design/board-v2/fx/blocked.mjs');
const { SHEET, SHEET_ROOMS, barsShell, boardTargets, sheetPlan, turnsLayout } = await load('design/board-v2/js/turns.mjs');
const { ENLARGED, MEASURED, WORDS_CHROME } = await load('design/board-v2/js/turns-view.mjs');
const { CRITICAL, FLATLINE, RESCUE, clinicalBerth, criticalFrame, dronePosition, filmBerth, flatlineEnd, flatlineFrame, medicalContracts, rescueEnd, rescueFrame, rescueTag } = await load('design/board-v2/films/medical.mjs');
const { DOCK, DRONE, DRONE_MIN_FIT, DRONE_SCENE, INSET, INSET_MIN_WIDTH, PULSE_BOX, PULSE_FLASH_RADIUS, berthKit, droneFit, hoverAt, insetBox, medicalColorDistances, tagBox } = await load('design/board-v2/fx/medical.mjs');
const { LABEL_MARGIN } = await load('design/board-v2/fx/label-box.mjs');
const { medicalOutcome, medicalSeats } = await load('design/board-v2/js/medical-fixtures.mjs');
const { outcomeWords } = await load('design/board-v2/js/medical-view.mjs');
const { AIRLOCK, CAPTAIN, CARD, CONSOLE, JAIL_DOOR, JAIL_DOOR_ELEMENTS, captainColorDistances, conduitAt, conduitPoints, conduitSegment, consoleBox, jailDoorSvg, offBoardCards } = await load('design/board-v2/fx/captain.mjs');
const { CAPTAIN_BUTTONS, EJECT_FILM, RELEASE_FILM, captainButtonStates, captainContracts, captainWords, ejectEnd, ejectFrame, releaseEnd, releaseFrame } = await load('design/board-v2/films/captain.mjs');
const { CAPTAIN_OUTCOMES, captainOutcome } = await load('design/board-v2/js/captain-fixtures.mjs');
const { FOUR_BACK, FOUR_BEDS, FOUR_BERTHS, FOUR_FRONT, FOUR_ROSTERS, fourBerths, wardFourScene } = await load('design/board-v2/scenes/hospital-ward-four.mjs');
const slotsFour = await load('design/board-v2/scenes/slots-four.mjs');
const fitFour = await load('design/board-v2/js/fit-four.mjs');
const turnsFour = await load('design/board-v2/js/turns-four.mjs');
const { fourBerthKit, fourClinicalBerth, fourDronePosition, fourFilmBerth, fourRescueFrame } = await load('design/board-v2/fx/medical-four.mjs');
const { fullStampBox, overflowWay, spinePlaqueBox } = await load('design/board-v2/fx/overflow.mjs');
const { OVERFLOW_FILM, overflowContract, overflowEnd, overflowFrame } = await load('design/board-v2/films/overflow.mjs');
const { OVERFLOW_OCCURRENCE, overflowOutcome } = await load('design/board-v2/js/overflow-fixtures.mjs');
const { CLONE, CLONE_CARD, CLONE_MIN_DISTANCE, FIGURE_SPAN, PASS_GAP, cloneBodyHeight, cloneCardLayout, cloneColorDistances, halftoneSvg, markSvg, outlineSvg } = await load('design/board-v2/fx/clone.mjs');
const { CLONE_FILM, CLONE_FILMS, cloneCard, cloneContract, cloneEnd, cloneFilmFor, cloneFrame, cloneWords } = await load('design/board-v2/films/clone.mjs');
const { CLONE_CASES, CLONE_SEAT, CLONE_STATUSES, cloneCase } = await load('design/board-v2/js/clone-fixtures.mjs');
const { FRAME } = await load('design/board-motion/figures/body.mjs');
/** The Clone's captures (clone-<name>.png) and its page comparisons: the plan of design/tools/board-v2-capture.mjs. */
const CLONE_SHOTS = ['390x844-activate-0200', '390x844-activate-0650', '390x844-activate-1100', '390x844-activate-1550', '390x844-activate-1720', '390x844-activate-1900', '390x844-expire-0150', '390x844-expire-0450', '390x844-expire-0750', '390x844-expire-0950', '390x844-reduced-activate-0200', '390x844-reduced-activate-0440', '390x844-reduced-activate-0600', '390x844-reduced-expire-0200', '390x844-reduced-expire-0440', '390x844-reduced-expire-0600', '320x568-activate-1100', '320x568-activate-1900', '320x568-expire-0450', '320x568-jailed', '390x844-jailed', '390x844-r5', '390x844-activate-1900-r7', '390x844-activate-1900-r8', '390x844-four-activate-1900', '360x740-text2-active', '375x667-text2-ended', '390x844-text2-activate-1100', '390x844-player-1100', '390x844-display-1100', 'sheet'];
const CLONE_COMPARISONS = 9;

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
  const sprites = manifest ? [...manifest.lighting.files, ...manifest.fx.files, ...(manifest.capsule?.files ?? []), ...(manifest.medical?.files ?? []), ...(manifest.captain?.files ?? []), ...(manifest.clone?.files ?? [])] : [];
  for (const [path, content] of planned) {
    if (!path.endsWith('.svg')) continue;
    if (/<text\b|<image\b|<script\b|<foreignObject\b|href=["']https?:/i.test(content)) problems.push(`${path}: outside the drawing vocabulary`);
    // A room is drawn in its scene's 1024 x 768 box; a sprite in the box its manifest entry gives.
    const sprite = sprites.find(entry => entry.file === path && entry.kind !== 'dark-room');
    const box = sprite ? sprite.viewBox : '0 0 1024 768';
    if (!content.includes(`viewBox="${box}"`)) problems.push(`${path}: not in its ${box} box`);
  }
  check('the ward, the lighting, the effects, the capsule, the medical, the Captain\'s and the Clone\'s art are built from the approved rooms or their own modules, current, and inside the drawing vocabulary', problems);
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
  // place, the capsule on its right, as tall, exactly 2:1, its right edge the band's; C1 and each
  // seated participant's own target a whole 44 px press area, clear of the Pass; at every phone
  // width, inset and height.
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
          if (Math.abs(board.panels['command-room'].width - 2 * board.panels[CAPSULE.id].width) > 1e-6) problems.push(`${where}: ${board.panels['command-room'].width} and ${board.panels[CAPSULE.id].width} px are not exactly 2:1`);
          // Each seated participant's own target: 44 px, whole inside the panel, below the caption, apart from the other's and clear of the Pass.
          const panel = board.panels[CAPSULE.id];
          const targets = capsuleTargets(panel);
          for (const target of targets) {
            if (target.side < 44 || target.left < -0.01 || target.left + target.side > panel.width + 0.01 || target.top < CAPTION_CLEAR - 0.01 || target.top + target.side > panel.height + 0.01) problems.push(`${where}: ${target.id}'s target is not a whole 44 px square below the caption`);
            const left = capsule.left + board.shell.border + target.left, top = capsule.top + board.shell.border + target.top;
            const dx = Math.max(left - board.pass.cx, 0, board.pass.cx - (left + target.side)), dy = Math.max(top - board.pass.cy, 0, board.pass.cy - (top + target.side));
            if (Math.hypot(dx, dy) <= board.pass.r) problems.push(`${where}: ${target.id}'s target is under the Pass`);
          }
          if (targets[0].left + targets[0].side > targets[1].left + 0.01) problems.push(`${where}: the two targets in the capsule overlap`);
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
  check(`the private-talk capsule: beside the Command Room at exactly 2:1, every other room where it is without it, each seated participant a whole 44 px target apart from the other's (${layouts} phone layouts), the seated pair's heads always in view (${framings} framings); the entrance inside the result stage with a second to spare, the minute the server's, the exit blocking nothing; only public inputs; never in two places; a reconnect and the reduced variant play nothing; the paths clear of the table; patients and prisoners as the board draws them; no faction color`, problems);
}

// ---------- The real controls take turns (the owner's decision of 14 October 2026) ----------
{
  const problems = [];
  const meet = (a, b) => a.left < b.left + b.width - 0.01 && b.left < a.left + a.width - 0.01 && a.top < b.top + b.height - 0.01 && b.top < a.top + a.height - 0.01;
  const square = target => ({ left: target.left, top: target.top, width: target.side, height: target.side });
  // At every phone layout, in normal and 200% text: the choosing row is the navigation's box and covers no target;
  // the sheet covers the Hospital and the Jail and nothing else, its actions either side of the Pass; the board is
  // fitBoardV2's with the capsule (below the match's top bar), every target 44 px; where it does not fit, nothing.
  let layouts = 0, enlargedFits = 0, minCapacity = Infinity;
  for (const width of WIDTHS) {
    for (const safe of [...INSETS, '20,0,16,0']) {
      for (let height = 540; height <= 960; height += 3) {
        for (const roster of ROSTERS) {
          for (const enlarged of [false, true]) {
            layouts += 1;
            const where = `${width}x${height}${safe ? ` +${safe}` : ''} ${roster}p${enlarged ? ' 200%' : ''}`;
            const options = { insets: insetsOf(safe), bars: enlarged ? ENLARGED.bars : null, actions: enlarged ? ENLARGED.actions : SHEET.actions };
            const layout = turnsLayout({ width, height }, roster, options);
            const plain = fitBoardV2({ width, height }, roster, { insets: insetsOf(safe), capsule: true, shell: barsShell(options.bars) });
            if (JSON.stringify(layout.board) !== JSON.stringify(plain)) problems.push(`${where}: the board is not fitBoardV2's`);
            if (!enlarged && JSON.stringify(layout.board) !== JSON.stringify(fitBoardV2({ width, height }, roster, { insets: insetsOf(safe), capsule: true }))) problems.push(`${where}: without bars, not the capsule's board`);
            if (!layout.fits) { if (layout.choosing || layout.sheet) problems.push(`${where}: controls where no board fits`); continue; }
            if (enlarged) enlargedFits += 1;
            const { board, choosing, sheet } = layout;
            if (board.boardTop < (enlarged ? ENLARGED.bars.top : 0)) problems.push(`${where}: the board under the top bar`);
            if (choosing.left !== 0 || choosing.top !== board.navTop || choosing.width !== width || choosing.height !== height - board.navTop || choosing.row.height !== board.shell.nav || choosing.row.height < 44) problems.push(`${where}: the choosing row is not the navigation's box`);
            const targets = boardTargets(board, roster);
            for (const target of targets) {
              if (target.side < 44) problems.push(`${where}: ${target.room} ${target.id} is ${target.side} px`);
              if (target.top + target.side > choosing.top + 0.01) problems.push(`${where}: ${target.room} ${target.id} under the choosing row`);
              if (meet(sheet, square(target)) && !SHEET_ROOMS.includes(target.room)) problems.push(`${where}: the sheet covers ${target.room} ${target.id}`);
            }
            for (const [room, box] of Object.entries(board.boxes)) if (!SHEET_ROOMS.includes(room) && meet(sheet, box)) problems.push(`${where}: the sheet covers ${room}`);
            if (Math.abs(sheet.top + sheet.height - board.navTop) > 1e-9 || sheet.top !== Math.min(...SHEET_ROOMS.map(room => board.boxes[room].top))) problems.push(`${where}: the sheet is not the Hospital's and the Jail's band down to the navigation`);
            const { actions } = sheet;
            if (actions.start.width < 88 || actions.end.width < 88) problems.push(`${where}: an actions part under 88 px (${actions.start.width}, ${actions.end.width})`);
            if (actions.start.left + actions.start.width > board.pass.cx - board.pass.r - SHEET.passMargin + 1e-9 || actions.end.left < board.pass.cx + board.pass.r + SHEET.passMargin - 1e-9) problems.push(`${where}: the actions under the Pass`);
            if (Math.abs(sheet.capacity - (sheet.body.height + SHEET.gap + actions.height)) > 1e-9) problems.push(`${where}: the sheet's capacity`);
            if (!enlarged) minCapacity = Math.min(minCapacity, sheet.capacity);
          }
        }
      }
    }
  }
  if (minCapacity < 160) problems.push(`the sheet holds ${minCapacity} px somewhere in normal text: under 160`);
  // The owner's too-short cases: 320 x 568 with 20/16 px safe areas at any text size; at 200% text the smallest phones.
  for (const enlarged of [false, true]) if (turnsLayout({ width: 320, height: 568 }, 9, { insets: insetsOf('20,0,16,0'), bars: enlarged ? ENLARGED.bars : null }).fits) problems.push('320 x 568 with 20/16 px safe areas: a board');
  for (const [width, height] of [[320, 568], [360, 640]]) if (turnsLayout({ width, height }, 9, { bars: ENLARGED.bars }).board.fallback !== 'too-short') problems.push(`${width}x${height} at 200% text: not too short`);
  for (const [width, height] of [[375, 667], [390, 664], [390, 844]]) if (!turnsLayout({ width, height }, 9, { bars: ENLARGED.bars }).fits) problems.push(`${width}x${height} at 200% text: no board`);
  // The plan: the claim alone is never folded, and the private result fits whole at every phone in normal text.
  for (const [width, height] of VIEWPORTS) {
    const { sheet } = turnsLayout({ width, height }, 9);
    const column = width < 360 ? 320 : 390;
    if (sheetPlan(sheet, { claim: MEASURED.claims.result[column][0] }).scroll > 0) problems.push(`${width}x${height}: the private result does not fit the sheet whole`);
    for (const kind of Object.keys(MEASURED.claims)) if (sheetPlan(sheet, { claim: MEASURED.claims[kind][column][1], receipt: 64 }).claim !== 'full') problems.push(`${width}x${height}: a claim alone folded`);
    for (const [name, command] of Object.entries(MEASURED.commands)) {
      const words = command.words[column][0];
      const plan = sheetPlan(sheet, { claim: MEASURED.claims.declare[column][0], command: (words ? words + WORDS_CHROME + SHEET.gap : 0) + SHEET.actions });
      if (plan.claim === 'none') problems.push(`${width}x${height} ${name}: the claim dropped`);
    }
  }
  check(`the real controls take turns: the choosing row the navigation's box and over no target, the sheet over the Hospital and the Jail and nothing else, its actions either side of the Pass, the board fitBoardV2's with the capsule below the match's top bar (${layouts} layouts in normal and 200% text, ${enlargedFits} fitting at 200%; the sheet holds ${minCapacity} px at least); the owner's too-short cases`, problems);
}

// ---------- The Hospital's medical films (S9, S5, S10) ----------
{
  const problems = [];
  // A berth's furniture is the ward's own: its monitor, lamp and plate where the ward draws them (to the ward's
  // 0.1-unit rounding), its plate the slot's badge anchor, and the drone's dock the ward's.
  const near = (a, b) => Math.abs(a - b) <= 0.051;
  const numbers = (tag, attrs) => [...tag.matchAll(new RegExp(`<${attrs[0]}\\b[^>]*>`, 'g'))].map(([element]) => attrs.slice(1).map(name => Number(new RegExp(`\\b${name}="([-\\d.]+)"`).exec(element)?.[1])));
  for (const roster of ROSTERS) {
    const svg = await text(`design/board-v2/assets/scenes/hospital-ward-${roster}.back.svg`).catch(() => '');
    const rects = numbers(svg, ['rect', 'x', 'y', 'width', 'height']);
    const circles = numbers(svg, ['circle', 'cx', 'cy', 'r']);
    for (const berth of wardBerths(roster)) {
      const { monitor: m, plate: p, lamp: l } = berthKit(berth.id);
      if (!rects.some(([x, y, w, h]) => near(x, m.x) && near(y, m.y) && near(w, m.w) && near(h, m.h))) problems.push(`${roster} players, ${berth.id}: its monitor is not the ward's`);
      if (!rects.some(([x, y, w, h]) => near(x, p.x) && near(y, p.y) && near(w, p.w) && near(h, p.h))) problems.push(`${roster} players, ${berth.id}: its plate is not the ward's`);
      if (!circles.some(([cx, cy, r]) => near(cx, l.cx) && near(cy, l.cy) && near(r, l.r))) problems.push(`${roster} players, ${berth.id}: its lamp is not the ward's`);
    }
  }
  for (const berth of WARD_BERTHS) {
    const kit = berthKit(berth.id);
    const { plate: p } = kit;
    const slot = slotsOf('hospital', 9).find(entry => entry.id === berth.id);
    if (Math.abs(slot.badgeAt[0] - (p.x + p.w / 2)) > 0.1 || Math.abs(slot.badgeAt[1] - (p.y + p.h / 2)) > 0.1) problems.push(`${berth.id}: its badge anchor is not its plate`);
    if (kit.chest[0] !== slot.pressAt[0] || kit.chest[1] !== slot.pressAt[1]) problems.push(`${berth.id}: the chest is not the berth's press point`);
  }
  for (const roster of ROSTERS) if (!numbers(await text(`design/board-v2/assets/scenes/hospital-ward-${roster}.back.svg`).catch(() => ''), ['ellipse', 'cx', 'cy']).some(([cx, cy]) => cx === DOCK[0] && cy === DOCK[1])) problems.push(`${roster} players: the drone's dock is not the ward's`);
  // The critical state: its values from the server's alone; the round to come or in progress, a struck cross with no round left, nothing when closed.
  const tags = [[{ rescueOpportunity: 'NEXT_NORMAL_ROUND', rescueDueAfterRound: 3 }, 'next R3'], [{ rescueOpportunity: 'CURRENT_NORMAL_ROUND', rescueDueAfterRound: 4 }, 'current R4'], [{ rescueOpportunity: 'NO_ADDITIONAL_ROUND', rescueDueAfterRound: null }, 'none '], [{ rescueOpportunity: 'CLOSED', rescueDueAfterRound: null }, 'null'], [null, 'null']];
  for (const [medical, want] of tags) { const tag = rescueTag(medical); if ((tag ? `${tag.tone} ${tag.text}` : 'null') !== want) problems.push(`${JSON.stringify(medical)}: the tag is ${JSON.stringify(tag)}`); }
  for (const bad of [{ rescueOpportunity: 'NO_ADDITIONAL_ROUND', rescueDueAfterRound: 5 }, { rescueOpportunity: 'NEXT_NORMAL_ROUND', rescueDueAfterRound: null }, { rescueOpportunity: 'SOON', rescueDueAfterRound: 3 }]) { try { rescueTag(bad); problems.push(`${JSON.stringify(bad)} makes a tag`); } catch { /* refused */ } }
  for (const t of [0, 700, 1999, 4000]) if (JSON.stringify(criticalFrame(t, { reduced: true })) !== JSON.stringify(criticalFrame(0, { reduced: true }))) problems.push(`the reduced critical state moves at ${t} ms`);
  // On admission the patient arrives in the berth as the monitor boots, before the lamp and the tag.
  if (criticalFrame(0, { entryT: 0 }).figure.opacity !== 0 || criticalFrame(120, { entryT: 120 }).figure.opacity !== 0.5 || criticalFrame(240, { entryT: 240 }).figure.opacity !== 1 || criticalFrame(120, { entryT: 120 }).lamp.on) problems.push('the admission does not bring the patient in as the monitor boots');
  // The films: the storyboards' lengths, nothing drawn outside them, their words once, no input but t, the berth, the fit and the setting.
  if (rescueEnd(false) < 5000 || rescueEnd(false) > 6000) problems.push(`the rescue lasts ${rescueEnd(false)} ms, not 5 to 6 s`);
  for (const [name, frameOf, end] of [['rescue', (t, o) => rescueFrame(t, 'H1', o), rescueEnd], ['flatline', (t, o) => flatlineFrame(t, o), flatlineEnd]]) {
    for (const reduced of [false, true]) {
      let said = false;
      for (let t = -200; t <= end(reduced) + 400; t += 10) {
        const frame = frameOf(t, { reduced });
        const where = `${name}${reduced ? ', reduced' : ''}, ${t} ms`;
        for (const extra of [{ cause: 'shot' }, { healer: 3, attacker: 5, role: 'x', side: 'y' }]) if (JSON.stringify(frameOf(t, { reduced, ...extra })) !== JSON.stringify(frame)) problems.push(`${where}: ${Object.keys(extra).join(', ')} changes the film`);
        if (frame.done !== t >= end(reduced)) problems.push(`${where}: done is ${frame.done}`);
        const drawn = frame.inset.opacity > 0 || frame.drone?.at || frame.scan?.opacity > 0 || frame.hologram?.opacity > 0 || frame.pulse?.frame > 0 || (frame.room ?? 1) < 1;
        if ((t < 0 || t >= end(reduced)) && drawn) problems.push(`${where}: something drawn outside the film`);
        if (said && !frame.announce && t < end(reduced)) problems.push(`${where}: the words withdrawn`);
        said = said || frame.announce;
        if (reduced && (frame.patient.offset[0] || frame.patient.offset[1] || frame.pulse?.frame || (frame.room ?? 1) < 1 || (frame.drone?.at && JSON.stringify(frame.drone.at) !== JSON.stringify(berthKit('H1').hover)))) problems.push(`${where}: motion in the reduced variant`);
        if (name === 'flatline' && t >= FLATLINE.fail[1] && (frame.patient.offset[0] || frame.patient.offset[1])) problems.push(`${where}: the patient still breathing after the heart failed`);
        if (Math.hypot(...frame.patient.offset) > Math.max(2.5, CRITICAL.breathPx) + 0.001) problems.push(`${where}: the patient moved more than 2.5 px`);
        if ((frame.room ?? 1) < FLATLINE.dim.level - 0.001) problems.push(`${where}: the room darker than ${FLATLINE.dim.level}`);
      }
      if (!said) problems.push(`${name}${reduced ? ', reduced' : ''}: no words`);
    }
  }
  // The drone: from the ward's dock and back to it, whatever berth; at its hover point over the berth, its probes on the chest.
  for (const berth of WARD_BERTHS) {
    const start = dronePosition(RESCUE.arrive[0], berth.id), back = dronePosition(RESCUE.depart[1] - 1, berth.id);
    if (!start || Math.hypot(start[0] - DOCK[0], start[1] - DOCK[1]) > 0.01 || !back || Math.hypot(back[0] - DOCK[0], back[1] - DOCK[1]) > 3) problems.push(`${berth.id}: the drone does not come from the dock and go back to it`);
    for (const fit of [1, 0.75, DRONE_MIN_FIT]) {
      const at = dronePosition(RESCUE.scan[0], berth.id, fit), hover = hoverAt(berthKit(berth.id), fit);
      if (!at || Math.abs(at[0] - hover[0]) > 0.01 || Math.abs(at[1] - hover[1]) > DRONE_SCENE.bob + 0.01) problems.push(`${berth.id}, fit ${fit}: the drone is not over the berth while it scans`);
      if (Math.abs(berthKit(berth.id).chest[1] - hover[1] - DRONE_SCENE.reach * berth.scale * fit) > 0.01) problems.push(`${berth.id}, fit ${fit}: its probes are not on the chest`);
    }
  }
  // Where things go, at every phone and roster, the ward full or empty: every tag whole in the panel, below the caption's
  // band and off the name tags; every inset, where there is one, off the caption, the berth and every held press area;
  // the drone, at its fit, below the caption and every held press area; the pulse's core a small part of the panel.
  const CAPTION = { left: 3, top: 3, width: 100, height: 26 };
  const meets = (a, b) => a.left < b.left + b.width - 0.01 && b.left < a.left + a.width - 0.01 && a.top < b.top + b.height - 0.01 && b.top < a.top + a.height - 0.01;
  let insets = 0, bands = 0, none = 0, fits = 0;
  for (const [width, height] of VIEWPORTS) {
    for (const roster of ROSTERS) {
      const panel = fitBoardV2({ width, height }, roster).panels.hospital;
      const frame = frameScene(sceneOf('hospital', roster), panel);
      const rects = slotRects('hospital', roster, panel);
      const press = r => ({ left: r.left, top: r.top, width: r.side, height: r.side });
      const names = r => ({ left: r.press[0] - 30, top: Math.min(panel.height - 16, r.top + r.side - 14), width: 60, height: 17 });
      for (const rect of rects) {
        const where = `${width}x${height}, ${roster} players, ${rect.id}`;
        for (const size of [[34, 13], [52, 13]]) {
          const box = tagBox({ plate: rect.badge, size, panel, keepClear: rects.filter(other => other !== rect).map(names) });
          const tag = { left: box.left, top: box.top, width: size[0], height: size[1] };
          if (tag.left < LABEL_MARGIN - 0.01 || tag.left + tag.width > panel.width - LABEL_MARGIN + 0.01 || tag.top + tag.height > panel.height - LABEL_MARGIN + 0.01) problems.push(`${where}: a tag leaves the panel`);
          if (tag.top < panel.cap - 0.01) problems.push(`${where}: a tag in the caption's band`);
          for (const other of rects.filter(entry => entry !== rect)) if (meets(tag, names(other))) problems.push(`${where}: a tag over ${other.id}'s name tag`);
        }
        for (const full of [true, false]) {
          const held = full ? rects.filter(other => other !== rect).map(press) : [];
          const inset = insetBox({ rect, panel, width: Math.max(60, Math.min(84, Math.round(panel.width * 0.42))), caption: CAPTION, keepClear: held });
          if (!inset) none += 1;
          else {
            insets += 1;
            if (inset.place === 'band') bands += 1;
            if (inset.left < LABEL_MARGIN - 0.01 || inset.top < LABEL_MARGIN - 0.01 || inset.left + inset.width > panel.width - LABEL_MARGIN + 0.01 || inset.top + inset.height > panel.height - LABEL_MARGIN + 0.01) problems.push(`${where}: the inset leaves the panel`);
            if (inset.width < INSET_MIN_WIDTH - 0.01 || Math.abs(inset.height / inset.width - INSET.h / INSET.w) > 0.001) problems.push(`${where}: an inset ${inset.width.toFixed(1)} x ${inset.height.toFixed(1)}`);
            for (const box of [CAPTION, press(rect), ...held]) if (meets(inset, box)) problems.push(`${where}${full ? ', the ward full' : ''}: the inset meets ${JSON.stringify(box)}`);
          }
          const kit = berthKit(rect.id);
          const fit = droneFit({ kit, frame, keepClear: [{ left: CAPTION.left - LABEL_MARGIN, top: CAPTION.top - LABEL_MARGIN, width: CAPTION.width + 2 * LABEL_MARGIN, height: CAPTION.height + 2 * LABEL_MARGIN }, ...held] });
          if (fit < 1) fits += 1;
          const w = DRONE_SCENE.width * kit.scale * frame.k * fit;
          const [lx, ly] = hoverAt(kit, fit);
          const drone = { left: frame.tx + lx * frame.k - w / 2, top: frame.ty + (ly - DRONE_SCENE.bob) * frame.k - (DRONE.lens[1] / DRONE.w) * w, width: w, height: (w * DRONE.h) / DRONE.w };
          if (fit > DRONE_MIN_FIT) for (const box of [CAPTION, ...held]) if (box.top + box.height <= frame.ty + kit.chest[1] * frame.k && meets(drone, box)) problems.push(`${where}${full ? ', the ward full' : ''}: the drone meets ${JSON.stringify(box)} at fit ${fit}`);
          if (drone.top < -0.01 && fit > DRONE_MIN_FIT) problems.push(`${where}: the drone leaves the panel's top`);
          // The pulse: its white-hot core at its largest, a quarter of the panel at most.
          const core = (PULSE_FLASH_RADIUS / PULSE_BOX) * w * 0.9 * 1.2;
          if (Math.PI * core * core > BLACKOUT.flashLimit.panelShare * panel.width * panel.height) problems.push(`${where}: the pulse's core over a quarter of the panel`);
        }
      }
    }
  }
  // Where the film plays: the anchor's berth, unless another seat holds it in the snapshot; an anchor names a berth of the match's roster only.
  if (clinicalBerth({ anchorId: 'HV3', slotCount: 9 }, 9) !== 'H3') problems.push('HV3 is not berth H3');
  for (const [anchor, roster] of [[{ anchorId: 'HV9', slotCount: 8 }, 8], [{ anchorId: 'HV2', slotCount: 9 }, 8], [{ anchorId: 'H2', slotCount: 9 }, 9]]) { try { clinicalBerth(anchor, roster); problems.push(`${JSON.stringify(anchor)} plays in a ${roster}-berth ward`); } catch { /* refused */ } }
  const placed = filmBerth({ anchorId: 'HV1', slotCount: 9 }, 9, [{ seat: 2, slotId: null }, { seat: 3, slotId: 'H1' }], 2);
  if (placed.plays || placed.holder !== 3) problems.push('a film plays over a berth another seat holds');
  if (!filmBerth({ anchorId: 'HV1', slotCount: 9 }, 9, [{ seat: 2, slotId: 'H1' }], 2).plays) problems.push('a film does not play at its subject\'s own berth');
  // The review page's synthetic outcomes: each anchor as Backend's rule gives it, each after-state possible.
  const anchors = { rescue: 'HV1', 'rescue-detained': 'HV2', vignette: 'HV3', death: 'HV1', 'rescue-taken': 'HV1', 'rescue-ward': 'HV1', 'rescue-upper': 'HV8' };
  for (const [name, anchorId] of Object.entries(anchors)) {
    const outcome = medicalOutcome(name, 9);
    if (outcome.anchor.anchorId !== anchorId) problems.push(`${name}: anchor ${outcome.anchor.anchorId}, not ${anchorId}`);
    const slots = outcome.after.map(seat => seat.slot);
    if (new Set(slots).size !== slots.length) problems.push(`${name}: two seats share a slot afterwards`);
    const subject = outcome.after.find(seat => seat.seat === outcome.subject.seat);
    if (outcome.kinds.at(-1) === 'HEALED' && (subject.health !== 'Healthy' || subject.room === 'hospital')) problems.push(`${name}: a healed subject left Injured or in the Hospital`);
    if (outcome.kinds.at(-1) === 'DEATH' && (subject.health !== 'Eliminated' || subject.room !== 'hospital')) problems.push(`${name}: a dead subject not in the Hospital`);
    if (outcome.subject.health === 'Eliminated') problems.push(`${name}: an Eliminated patient revived`);
    for (const seat of medicalSeats(outcome.after)) if ((seat.health === 'Injured') !== (seat.medical !== null) || (seat.health === 'Injured' && seat.location !== 'Hospital')) problems.push(`${name}: seat ${seat.seat}'s medical facts do not follow its health`);
  }
  if (medicalOutcome('vignette', 7).anchor.anchorId !== 'HV2') problems.push('the seven-player vignette is not at HV2');
  // The words are the client's; the colors far from every faction accent; the contract the module's, naming no role.
  if (outcomeWords(2, 'HEALED') !== 'Player 2: Healed.' || outcomeWords(2, 'DEATH') !== 'Player 2: Eliminated.' || outcomeWords(4, 'INJURY') !== 'Player 4: Injured.') problems.push('the words are not the hosted board\'s');
  for (const [name, { nearest, distance }] of Object.entries(medicalColorDistances())) if (distance < MIN_ACCENT_DISTANCE) problems.push(`the medical ${name} is ${distance} from the ${nearest} accent`);
  const films = await json('design/board-v2/contract/films.json').catch(() => null);
  if (!films || JSON.stringify(films.films?.slice(3, 6)) !== JSON.stringify(medicalContracts())) problems.push('contract/films.json does not hold the medical films\' contracts: run design/tools/board-v2-assets.mjs');
  for (const word of ROLE_WORDS) if (JSON.stringify(medicalContracts()).includes(word)) problems.push(`the medical contracts name ${word}`);
  check(`the Hospital's medical films: the ward's own furniture and dock, the rescue tag from the server's values, beats within the storyboards with nothing drawn outside them and one set of words, no input but the moment, the berth and the setting, the drone from the dock to the chest, every tag, inset (${insets} placed, ${bands} beside the caption, ${none} none) and drone (${fits} drawn smaller) clear of the caption and every held press area at every phone, no film over another seat's berth, and the examples' anchors Backend's`, problems);
}

// ---------- The Captain's films (S6, S7, S8) ----------
{
  const problems = [];
  // The door, the lamp and the keypad are the Jail's own: every element in the scene the board draws, and at rest the
  // overlay draws them exactly as the room does, in its order.
  const scene = await text('design/board-motion/assets/scenes/jail.back.svg').catch(() => '');
  const E = JAIL_DOOR_ELEMENTS;
  for (const [name, value] of Object.entries(E)) for (const element of [value].flat()) if (!scene.includes(element)) problems.push(`the door's ${name} is not the Jail's: ${element.slice(0, 60)}`);
  const tight = markup => markup.replace(/>\s+</g, '><').trim();
  const from = scene.indexOf(E.surface);
  const to = scene.indexOf(E.rivets, from) + E.rivets.length;
  const door = tight(scene.slice(from, to)).replaceAll('clip-jail-door', 'jd-door').replaceAll('halftone-ink-s-jail', 'jd-ht');
  const rest = jailDoorSvg({});
  if (from < 0 || !rest.includes(door)) problems.push('at rest the door overlay does not draw the Jail\'s door as the room does');
  if (!rest.includes(E.lamp.replace(' id="jail-lamp"', '')) || !rest.includes(E.screen)) problems.push('at rest the overlay\'s lamp or keypad is not the room\'s');
  if (/url\(#(?!jd-)/.test(rest) || /id="(?!jd-)/.test(rest)) problems.push('the overlay uses an id that is not its own');
  // Where the console inset, the pulse and the hatch go, at every phone, with the capsule and without, for every roster.
  const meets = (a, b) => a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
  let placed = 0, none = 0, ways = 0;
  for (const [width, height] of VIEWPORTS) {
    for (const capsule of [true, false]) {
      for (const roster of ROSTERS) {
        const board = fitBoardV2({ width, height }, roster, { capsule });
        const where = `${width}x${height}${capsule ? ' with the capsule' : ''}, ${roster} players`;
        const border = board.shell.border;
        const commandPanel = board.panels['command-room'];
        const c1 = slotRects('command-room', roster, commandPanel)[0];
        const command = board.boxes['command-room'];
        const right = capsule ? board.boxes[CAPSULE.id].left + board.boxes[CAPSULE.id].width - border : command.left + command.width - border;
        const band = { left: command.left + border, top: command.top + border, width: right - command.left - border, height: commandPanel.height };
        const captain = { left: band.left + c1.left, top: band.top + c1.top, width: c1.side, height: c1.side };
        const tag = { left: band.left + c1.press[0] - 30, top: band.top + Math.min(commandPanel.height - 16, c1.top + c1.side - 14), width: 60, height: 17 };
        const inset = consoleBox({ band, cap: commandPanel.cap, captain, tag });
        if (!inset) none += 1;
        else {
          placed += 1;
          if (inset.top < band.top + commandPanel.cap - 0.01 || inset.left < band.left - 0.01 || inset.left + inset.width > band.left + band.width + 0.01 || inset.top + inset.height > band.top + band.height + 0.01) problems.push(`${where}: the console inset leaves the band below its captions`);
          if (meets(inset, captain) || meets(inset, tag)) problems.push(`${where}: the console inset meets the Captain's place or name tag`);
          if (inset.scale > 1 || inset.width < CONSOLE.minWidth || Math.abs(inset.height / inset.width - CONSOLE.h / CONSOLE.w) > 0.002) problems.push(`${where}: the console inset is ${inset.width} x ${inset.height}`);
        }
        // The pulse's way: in the board's gutters, but for its start under the inset and its drop into the Jail's caption
        // band to the lamp; over no press area of any room, ever.
        const jail = frameScene(sceneOf('jail', roster), board.panels.jail);
        const start = inset ? [inset.left + inset.width / 2, inset.top + inset.height] : [band.left + c1.press[0], band.top + c1.press[1]];
        const way = conduitPoints({ boxes: board.boxes, border, jail, start });
        const presses = BOARD_ROOMS.flatMap(room => slotRects(room, roster, board.panels[room]).map(rect => ({ id: rect.id, left: board.boxes[room].left + border + rect.left, top: board.boxes[room].top + border + rect.top, width: rect.side, height: rect.side })));
        const panels = Object.entries(board.boxes).map(([room, box]) => ({ room, left: box.left, top: box.top, width: box.width, height: box.height }));
        const { total } = conduitAt(way, 1);
        for (let d = 0; d <= total; d += 1) {
          const [x, y] = conduitAt(way, d / total).head;
          const dot = { left: x - 1.5, top: y - 1.5, width: 3, height: 3 };
          for (const press of presses) if (meets(dot, press)) { problems.push(`${where}: the pulse's way crosses ${press.id}'s press area at ${x.toFixed(1)},${y.toFixed(1)}`); break; }
          const segment = way.findIndex((p, i) => i > 0 && conduitAt(way, d / total).drawn.length - 1 === i);
          const inside = panels.find(panel => x > panel.left + 0.5 && x < panel.left + panel.width - 0.5 && y > panel.top + 0.5 && y < panel.top + panel.height - 0.5);
          const jailBand = board.boxes.jail.top + border + board.panels.jail.cap;
          const allowed = segment === 1 || (inside?.room === 'jail' && segment === way.length - 1 && y <= jailBand);
          if (inside && !allowed) { problems.push(`${where}: the pulse's way runs over ${inside.room} at ${x.toFixed(1)},${y.toFixed(1)}`); break; }
        }
        ways += 1;
        if (roster !== 9) continue;
        // The hatch: its rim whole in every phone's Jail panel, below its caption's band, clear of the pillar.
        const [cx, cy] = AIRLOCK.c;
        const rim = AIRLOCK.r + 6 + 2.5;
        const panel = board.panels.jail;
        if (jail.tx + (cx - rim) * jail.k < -0.01 || jail.tx + (cx + rim) * jail.k > panel.width + 0.01) problems.push(`${where}: the hatch's rim leaves the Jail's panel`);
        if (jail.ty + (cy - rim) * jail.k < panel.cap) problems.push(`${where}: the hatch's rim reaches the Jail's caption band`);
        if (cx + AIRLOCK.r + 6 > 332) problems.push('the hatch overlaps the Jail\'s pillar');
      }
    }
  }
  // The characters off the board as targets: the cards of one to five (all an EJECT can take) in the sheet's body at every
  // phone the controls' layout fits, in normal and 200% text: each 44 px at least, inside the body, apart.
  let decks = 0;
  for (const [width, height] of VIEWPORTS) {
    for (const enlarged of [false, true]) {
      for (const roster of ROSTERS) {
        const layout = turnsLayout({ width, height }, roster, { bars: enlarged ? ENLARGED.bars : null, actions: enlarged ? ENLARGED.actions : undefined });
        if (!layout.fits) continue;
        const body = layout.sheet.body;
        for (let count = 1; count <= 5; count += 1) {
          const cards = offBoardCards(body, count);
          const where = `${width}x${height}${enlarged ? ', 200% text' : ''}, ${roster} players, ${count} off the board`;
          if (!cards) { problems.push(`${where}: the cards do not fit the sheet`); continue; }
          decks += 1;
          cards.forEach((card, i) => {
            if (card.width < CARD.min - 0.01 || card.height < CARD.min - 0.01) problems.push(`${where}: a card ${card.width} x ${card.height}`);
            if (card.left < body.left - 0.01 || card.top < body.top - 0.01 || card.left + card.width > body.left + body.width + 0.01 || card.top + card.height > body.top + body.height + 0.01) problems.push(`${where}: a card leaves the sheet's body`);
            for (const other of cards.slice(i + 1)) if (meets(card, other)) problems.push(`${where}: two cards overlap`);
          });
        }
      }
    }
  }
  // The films: the storyboards' lengths; nothing drawn outside them; the words once; the reduced variants still; the
  // emergency light under 2 Hz and low; a full Jail's last prisoner through the door before it shuts and landed
  // before the film ends; a full Jail's last living one gone before the exterior.
  if (RELEASE_FILM.end !== 4200 || EJECT_FILM.end !== 7200) problems.push('the films are not the storyboards\' 4.2 and 7.2 s');
  const W = RELEASE_FILM.walk;
  const through = W.start + 4 * W.stagger + W.up + W.toDoor + W.through;
  if (through > RELEASE_FILM.close[0]) problems.push(`the fifth prisoner is through the door at ${through} ms, after it starts to shut`);
  if (through + W.across + W.land > RELEASE_FILM.end) problems.push('the fifth prisoner lands after the film ends');
  const X = EJECT_FILM.eject;
  if (X.start + 4 * X.stagger + X.lean + X.pull + X.last > EJECT_FILM.exterior.in[0]) problems.push('the fifth prisoner is not gone before the exterior');
  if (1000 / EJECT_FILM.emergency.periodMs >= 2 || EJECT_FILM.emergency.high > 0.35) problems.push('the emergency light pulses at 2 Hz or more, or too bright');
  if (EJECT_FILM.push.scale > 1.06) problems.push('the push is more than 6%');
  const subjects = captainOutcome('eject-full', 9).subjects;
  for (const [name, frameOf, end, count] of [['release', (t, o) => releaseFrame(t, { ...o, count: 5 }), releaseEnd, 5], ['eject', (t, o) => ejectFrame(t, { ...o, subjects: [...subjects, { body: true }] }), ejectEnd, 6]]) {
    for (const reduced of [false, true]) {
      let said = false;
      for (let t = -200; t <= end(reduced) + 400; t += 10) {
        const frame = frameOf(t, { reduced });
        const where = `${name}${reduced ? ', reduced' : ''}, ${t} ms`;
        if (frame.people.length !== count) problems.push(`${where}: ${frame.people.length} subjects`);
        if (t < 0 || t >= end(reduced)) {
          if (frame.inset.opacity || frame.pulse || frame.door.open || frame.door.wheel || frame.door.lamp !== 'normal' || frame.announce || (frame.emergency ?? 0) || (frame.airlock?.reveal ?? 0) || (frame.label?.opacity ?? 0) || (frame.exterior?.opacity ?? 0)) problems.push(`${where}: drawn outside the film`);
          continue;
        }
        if (frame.announce) said = true; else if (said) problems.push(`${where}: the words withdrawn`);
        if (frame.door.open < 0 || frame.door.open > 1 || frame.inset.opacity < 0 || frame.inset.opacity > 1) problems.push(`${where}: out of range`);
        if (name === 'eject' && (frame.emergency > EJECT_FILM.emergency.high + 0.001 || frame.push < 1 || frame.push > EJECT_FILM.push.scale)) problems.push(`${where}: the light or the push out of range`);
        if (reduced) {
          if (frame.people.some(person => !['jail', 'settled', 'gone'].includes(person.state))) problems.push(`${where}: someone moves in the reduced variant`);
          if (frame.pulse || frame.inset.ring || frame.inset.click || frame.inset.glove || (frame.push ?? 1) !== 1 || (frame.suction?.opacity ?? 0) || (frame.debris?.opacity ?? 0) || ![0, 1].includes(frame.door.open) || ![0, 1].includes(frame.airlock?.open ?? 0) || ![0, 0.2].includes(frame.emergency ?? 0)) problems.push(`${where}: motion in the reduced variant`);
        }
      }
      if (!said) problems.push(`${name}${reduced ? ', reduced' : ''}: the words never said`);
    }
  }
  // The review page's synthetic outcomes: the listed seats as Backend lists them; the released in Rooms A and B, apart;
  // the ejected off the board; a Hospital detainee and, for RELEASE, a body in the Jail untouched.
  for (const name of Object.keys(CAPTAIN_OUTCOMES)) {
    for (const roster of ROSTERS) {
      const outcome = captainOutcome(name, roster);
      const where = `${name}, ${roster} players`;
      const jailed = outcome.before.filter(seat => seat.room === 'jail' && (outcome.kind === 'EJECT' || seat.health !== 'Eliminated')).map(seat => seat.seat);
      if (JSON.stringify(outcome.seatIds) !== JSON.stringify(jailed.sort((a, b) => a - b))) problems.push(`${where}: seatIds ${outcome.seatIds}, not the Jail's ${jailed}`);
      const slots = outcome.after.filter(seat => seat.slot).map(seat => seat.slot);
      if (new Set(slots).size !== slots.length) problems.push(`${where}: two seats share a slot afterwards`);
      for (const seat of outcome.after) {
        const was = outcome.before.find(entry => entry.seat === seat.seat);
        if (!outcome.seatIds.includes(seat.seat)) { if (JSON.stringify(seat) !== JSON.stringify(was)) problems.push(`${where}: seat ${seat.seat}, not listed, moved`); continue; }
        if (outcome.kind === 'RELEASE' && (!['room-a', 'room-b'].includes(seat.room) || seat.jailed || seat.health !== 'Healthy')) problems.push(`${where}: seat ${seat.seat} released to ${seat.room}`);
        if (outcome.kind === 'EJECT' && (seat.room !== null || seat.slot !== null || seat.health !== 'Eliminated')) problems.push(`${where}: seat ${seat.seat} not off the board`);
      }
    }
  }
  if (captainOutcome('release', 9).after.find(seat => seat.seat === 9).slot !== 'J5' || captainOutcome('eject', 9).after.find(seat => seat.seat === 8).slot !== 'H2') problems.push('a body or a Hospital detainee is moved');
  // The words are the client's; S8's states come from the Captain's own view alone; the colors far from every faction accent.
  if (captainWords('RELEASE', [3, 4]) !== 'Player 3, Player 4: released from detention.' || captainWords('EJECT', [3, 4, 9]) !== 'Player 3, Player 4, Player 9: ejected.') problems.push('the words are not the hosted board\'s');
  const view = (uses, offered = []) => ({ self: { seatId: 'seat-7', captainCommandUses: uses }, legalTargets: Object.fromEntries(offered.map(name => [name, ['seat-7']])) });
  const states = [
    [view(null, ['CAPTAIN_RELEASE']), null, 'null'],
    [view({ releaseUsed: false, ejectUsed: false }, ['CAPTAIN_RELEASE', 'CAPTAIN_EJECT']), null, 'available/available'],
    [view({ releaseUsed: true, ejectUsed: false }, ['CAPTAIN_EJECT']), null, 'used/available'],
    [view({ releaseUsed: false, ejectUsed: false }, []), null, 'unavailable/unavailable'],
    [view({ releaseUsed: false, ejectUsed: true }, ['CAPTAIN_RELEASE']), 'release', 'sending/used'],
  ];
  for (const [input, pending, want] of states) { const got = captainButtonStates(input, pending); if ((got ? `${got.release}/${got.eject}` : 'null') !== want) problems.push(`S8: ${JSON.stringify(input)} is ${JSON.stringify(got)}, not ${want}`); }
  if (CAPTAIN_BUTTONS.glow.maxLuminanceChange > 0.15 || CAPTAIN_BUTTONS.press.px !== 3) problems.push('S8\'s glow or press is not the storyboard\'s');
  for (const [name, { nearest, distance }] of Object.entries(captainColorDistances())) if (distance < MIN_ACCENT_DISTANCE) problems.push(`the Captain's ${name} is ${distance} from the ${nearest} accent`);
  // The memorial cut-outs: every color the ink or a memorial grey, so that no side, role or outfit shows.
  const ramp = [CAPTAIN.memorialDark, CAPTAIN.memorialLight].map(hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)));
  for (const path of (await filesUnder('design/board-v2/assets/captain')).filter(file => file.includes('/memorial-'))) {
    for (const hex of new Set((await text(path)).match(/#[0-9A-Fa-f]{6}\b/g) ?? [])) {
      if (hex.toUpperCase() === '#151923') continue;
      const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
      const v = (rgb[0] - ramp[0][0]) / (ramp[1][0] - ramp[0][0]);
      if (v < -0.01 || v > 1.01 || rgb.some((c, i) => Math.abs(c - (ramp[0][i] + (ramp[1][i] - ramp[0][i]) * v)) > 1.5)) { problems.push(`${path}: ${hex} is not a memorial grey`); break; }
    }
  }
  const films = await json('design/board-v2/contract/films.json').catch(() => null);
  if (!films || JSON.stringify(films.films?.slice(6, 9)) !== JSON.stringify(captainContracts())) problems.push('contract/films.json does not hold the Captain films\' contracts: run design/tools/board-v2-assets.mjs');
  for (const word of ROLE_WORDS) if (JSON.stringify(captainContracts()).includes(word)) problems.push(`the Captain contracts name ${word}`);
  check(`the Captain's films: the characters off the board a 44 px card each in the sheet (${decks} layouts); the Jail's own door, lamp and keypad; the console inset (${placed} placed, ${none} none) below the captions and off the Captain's place, the pulse's way (${ways} ways) in the gutters and over no press area, the hatch whole below the caption at every phone; the storyboards' lengths, nothing drawn outside them, one set of words, still reduced variants, a full Jail through the door and out in time, the light under 2 Hz; Backend's listed seats, detainees and bodies untouched; S8 from the Captain's own view; memorial greys; no faction color`, problems);
}

// ---------- The successor's four-berth Hospital (the owner's decision of 18 October 2026, #155) ----------
{
  const problems = [];
  // The successor's layout is the current one: fit-four.mjs re-exports fit.mjs (fitBoardV2 itself, so every band, panel and
  // box is the current board's) and redefines its four slot functions with fit.mjs's own code; turns-four.mjs is turns.mjs,
  // line for line, but a header after the first line and the import lines named here.
  const fitCurrent = await load('design/board-v2/js/fit.mjs');
  for (const name of ['BANDS', 'CAPSULE', 'FALLBACKS', 'MARKER_RADIUS', 'MIN_BOARD_WIDTH', 'SHELL', 'SHELL_TIERS', 'capsuleSplit', 'fitBoardV2', 'insetsOf', 'pressSide', 'shellFor']) if (fitFour[name] !== fitCurrent[name]) problems.push(`fit-four.mjs: ${name} is not fit.mjs's`);
  for (const name of ['slotRects', 'slotsFit', 'boardRects', 'passClearance']) if (typeof fitFour[name] !== 'function' || fitFour[name] === fitCurrent[name] || String(fitFour[name]) !== String(fitCurrent[name])) problems.push(`fit-four.mjs: ${name} is not fit.mjs's code over the successor's table`);
  if ('needHeight' in fitFour) problems.push('fit-four.mjs exports a need of its own: the successor\'s bands are the current board\'s');
  const derived = async (name, swaps) => {
    const [one, four] = await Promise.all([text(`design/board-v2/js/${name}.mjs`), text(`design/board-v2/js/${name}-four.mjs`)]);
    const a = one.split('\n'), b = four.split('\n');
    const header = b.slice(1, b.length - a.length + 1);
    if (!header.length || header.some(line => !line.startsWith('//')) || !header.join(' ').includes('#155')) return [`${name}-four.mjs: no header saying what it is`];
    const rest = [b[0], ...b.slice(header.length + 1)];
    const out = [];
    let swapped = 0;
    rest.forEach((line, i) => {
      if (line === a[i]) return;
      const swap = swaps.find(([from, to]) => a[i] === line.replace(to, from) && line.includes(to));
      if (swap) swapped += 1; else out.push(`${name}-four.mjs, line ${i + header.length + 1}: not ${name}.mjs's`);
    });
    if (swapped !== swaps.length) out.push(`${name}-four.mjs: ${swapped} of its ${swaps.length} imports changed`);
    return out;
  };
  problems.push(...await derived('turns', [["'./fit.mjs'", "'./fit-four.mjs'"], ["'../scenes/slots.mjs'", "'../scenes/slots-four.mjs'"]]));
  // The successor's slot table: four berths, H1 to H4, whatever the roster; every other room the current table's own.
  for (const roster of FOUR_ROSTERS) {
    problems.push(...slotsFour.slotProblems(roster).map(problem => `four beds, ${roster} players: ${problem}`));
    const ward = slotsFour.slotsOf('hospital', roster).map(slot => slot.id).join();
    if (ward !== 'H1,H2,H3,H4' || fourBerths(roster).length !== FOUR_BEDS) problems.push(`four beds, ${roster} players: the ward's berths are ${ward}`);
    for (const room of BOARD_ROOMS.filter(room => room !== 'hospital')) if (slotsFour.slotsOf(room, roster) !== slotsOf(room, roster)) problems.push(`four beds, ${roster} players, ${room}: not the current table's slots`);
    const scene = wardFourScene(roster);
    for (const slot of scene.slots) {
      const front = scene.layers[slot.front];
      if (!front || !(front.depth > slot.depth)) problems.push(`four beds: ${slot.id}'s blanket is not drawn over its patient`);
      for (const other of scene.slots) if (other.row !== slot.row && other.depth > slot.depth && front && !(front.depth < other.depth)) problems.push(`four beds: ${slot.id}'s blanket is drawn over ${other.id}`);
      // A front berth's headboard stands over the back row and under its own patient.
      const head = scene.layers[`${slot.front}-head`];
      if (slot.row === 'front' && (!head || !(head.depth < slot.depth) || scene.slots.filter(s => s.row === 'back').some(s => !(head.depth > scene.layers[s.front].depth)))) problems.push(`four beds: ${slot.id}'s headboard is not between the back row and its patient`);
    }
    if (JSON.stringify(scene.slots.map(slot => slot.at)) !== JSON.stringify(wardFourScene(FOUR_ROSTERS[0]).slots.map(slot => slot.at))) problems.push(`four beds, ${roster} players: not the same berths as for ${FOUR_ROSTERS[0]}`);
  }
  for (const name of Object.keys(slotsFour)) if (/entry|alloc|assign|pick|take/i.test(name)) problems.push(`slots-four.mjs exports ${name}: the drawing module allocates no slot`);
  if (FOUR_BERTHS.some(berth => !['bedLying', 'bedSitting'].includes(berth.gesture))) problems.push('a four-berth ward\'s berth uses a gesture other than the approved Hospital beds\'');
  const tableFour = await json('design/board-v2/contract/slots-four.json').catch(() => null);
  if (!tableFour || tableFour.beds !== 4 || !/allocates nothing/.test(tableFour.note) || !/#155/.test(tableFour.note)) problems.push('contract/slots-four.json does not say it is the four-bed table that allocates nothing');
  for (const word of ROLE_WORDS) if (JSON.stringify(tableFour ?? {}).includes(word)) problems.push(`the four-bed table names ${word}`);
  // The berths' furniture is the four-berth ward's own: monitor, plate and lamp where its back (H3, H4) or its front
  // berths' headboard layers (H1, H2) draw them; the plate the slot's badge; the chest its press point; the dock the ward's.
  const near = (a, b) => Math.abs(a - b) <= 0.051;
  const numbers = (tag, attrs) => [...tag.matchAll(new RegExp(`<${attrs[0]}\\b[^>]*>`, 'g'))].map(([element]) => attrs.slice(1).map(name => Number(new RegExp(`\\b${name}="([-\\d.]+)"`).exec(element)?.[1])));
  const backSvg = await text('design/board-v2/assets/scenes/hospital-ward-four.back.svg').catch(() => '');
  for (const berth of FOUR_BERTHS) {
    const svg = berth.row === 'back' ? backSvg : await text(`design/board-v2/assets/scenes/hospital-ward-four.berth-four-${berth.id.toLowerCase()}-head.svg`).catch(() => '');
    const rects = numbers(svg, ['rect', 'x', 'y', 'width', 'height']);
    const circles = numbers(svg, ['circle', 'cx', 'cy', 'r']);
    const kit = fourBerthKit(berth.id);
    const { monitor: m, plate: p, lamp: l } = kit;
    if (!rects.some(([x, y, w, h]) => near(x, m.x) && near(y, m.y) && near(w, m.w) && near(h, m.h))) problems.push(`four beds, ${berth.id}: its monitor is not the ward's`);
    if (!rects.some(([x, y, w, h]) => near(x, p.x) && near(y, p.y) && near(w, p.w) && near(h, p.h))) problems.push(`four beds, ${berth.id}: its plate is not the ward's`);
    if (!circles.some(([cx, cy, r]) => near(cx, l.cx) && near(cy, l.cy) && near(r, l.r))) problems.push(`four beds, ${berth.id}: its lamp is not the ward's`);
    const slot = slotsFour.slotsOf('hospital', 9).find(entry => entry.id === berth.id);
    if (Math.abs(slot.badgeAt[0] - (p.x + p.w / 2)) > 0.1 || Math.abs(slot.badgeAt[1] - (p.y + p.h / 2)) > 0.1) problems.push(`four beds, ${berth.id}: its badge anchor is not its plate`);
    if (kit.chest[0] !== slot.pressAt[0] || kit.chest[1] !== slot.pressAt[1]) problems.push(`four beds, ${berth.id}: the chest is not the berth's press point`);
    for (const fit of [1, 0.75, DRONE_MIN_FIT]) {
      const at = fourDronePosition(RESCUE.scan[0], berth.id, fit), hover = hoverAt(kit, fit);
      if (!at || Math.abs(at[0] - hover[0]) > 0.01 || Math.abs(at[1] - hover[1]) > DRONE_SCENE.bob + 0.01) problems.push(`four beds, ${berth.id}, fit ${fit}: the drone is not over the berth while it scans`);
    }
    const start = fourDronePosition(RESCUE.arrive[0], berth.id), back = fourDronePosition(RESCUE.depart[1] - 1, berth.id);
    if (!start || Math.hypot(start[0] - DOCK[0], start[1] - DOCK[1]) > 0.01 || !back || Math.hypot(back[0] - DOCK[0], back[1] - DOCK[1]) > 3) problems.push(`four beds, ${berth.id}: the drone does not come from the dock and go back to it`);
  }
  if (!numbers(backSvg, ['ellipse', 'cx', 'cy']).some(([cx, cy]) => cx === DOCK[0] && cy === DOCK[1])) problems.push('four beds: the drone\'s dock is not the ward\'s');
  if (FOUR_FRONT.k <= FOUR_BACK.k) problems.push('four beds: the front row is not drawn larger than the back');
  // #158's rescue, frame for frame, on the four berths: every field but the drone's lens as #158 gives it.
  for (const reduced of [false, true]) for (const berth of FOUR_BERTHS) for (let t = -200; t <= rescueEnd(reduced) + 400; t += 10) {
    const a = rescueFrame(t, 'H1', { reduced }), b = fourRescueFrame(t, berth.id, { reduced });
    const strip = frame => JSON.stringify({ ...frame, drone: { ...frame.drone, at: frame.drone.at === null } });
    if (strip(a) !== strip(b)) { problems.push(`four beds, ${berth.id}${reduced ? ', reduced' : ''}, ${t} ms: the rescue is not #158's`); break; }
    if (reduced && b.drone.at && JSON.stringify(b.drone.at) !== JSON.stringify(fourBerthKit(berth.id).hover)) { problems.push(`four beds, ${berth.id}: the reduced drone moves`); break; }
  }
  // An anchor names one of the four beds; a film plays there unless another seat holds it.
  if (fourClinicalBerth({ anchorId: 'HV3' }) !== 'H3' || fourClinicalBerth('HV1') !== 'H1') problems.push('four beds: HVn is not bed Hn');
  for (const bad of ['HV5', 'HV9', 'H2']) { try { fourClinicalBerth(bad); problems.push(`four beds: ${bad} plays on a four-berth ward`); } catch { /* refused */ } }
  const taken = fourFilmBerth('HV4', [{ seat: 7, slotId: null }, { seat: 1, slotId: 'H4' }], 7);
  if (taken.plays || taken.holder !== 1 || !fourFilmBerth('HV4', [{ seat: 7, slotId: 'H4' }], 7).plays) problems.push('four beds: a film plays over a bed another seat holds, or not at its subject\'s own');
  // The board: the current one, so the four berths must fit every Hospital panel it draws: at every width, inset case and
  // shell boundary the shell check visits, with the capsule and without, every roster. Every other room's press areas
  // are the current board's, and nothing is under the Pass.
  let boards = 0;
  for (const width of WIDTHS) {
    const rooms = fitBoardV2({ width, height: 2000 }, 9).needs.reduce((a, b) => a + b, 0) + 2 * SHELL.gap;
    for (const safe of INSETS) {
      const insets = insetsOf(safe);
      const extra = insets.top + insets.bottom;
      const heights = [...new Set([...SHELL.tiers.flatMap(tier => [-1, 0, 1].map(d => Math.ceil(rooms + tier.top + tier.nav + 2 * tier.boardPadY + d + extra))), ...[568, 599, 600, 601, 640, 667, 740, 844, 932].map(h => h + extra)])];
      for (const height of heights) for (const capsule of [false, true]) for (const roster of FOUR_ROSTERS) {
        const options = { insets, capsule };
        const board = fitBoardV2({ width, height }, roster, options);
        if (!board.fits) continue;
        boards += 1;
        const where = `four beds, ${width}x${height}${safe ? ` (insets ${safe})` : ''}${capsule ? ', capsule' : ''}, ${roster} players`;
        if (!fitFour.slotsFit('hospital', roster, board.panels.hospital)) problems.push(`${where}: the four berths do not fit the Hospital's ${board.panels.hospital.width} x ${board.panels.hospital.height} panel`);
        for (const rect of fitFour.slotRects('hospital', roster, board.panels.hospital)) if (rect.side < 44) problems.push(`${where}, ${rect.id}: a ${rect.side} px press area`);
        for (const room of BOARD_ROOMS.filter(room => room !== 'hospital')) if (JSON.stringify(fitFour.slotRects(room, roster, board.panels[room])) !== JSON.stringify(slotRects(room, roster, board.panels[room]))) problems.push(`${where}, ${room}: not the current board's press areas`);
        for (const slot of fitFour.passClearance({ width, height }, roster, options)) if (slot.clearance <= 0) problems.push(`${where}, ${slot.id}: under the Pass`);
      }
    }
  }
  // The medical films' placement on the four berths, at every phone and roster, the ward full or empty (#158's rules).
  const CAPTION = { left: 3, top: 3, width: 100, height: 26 };
  const meets = (a, b) => a.left < b.left + b.width - 0.01 && b.left < a.left + a.width - 0.01 && a.top < b.top + b.height - 0.01 && b.top < a.top + a.height - 0.01;
  let insetsPlaced = 0;
  for (const [width, height] of VIEWPORTS) for (const roster of FOUR_ROSTERS) {
    const panel = fitFour.fitBoardV2({ width, height }, roster).panels.hospital;
    const frame = frameScene(slotsFour.sceneOf('hospital', roster), panel);
    const rects = fitFour.slotRects('hospital', roster, panel);
    const press = r => ({ left: r.left, top: r.top, width: r.side, height: r.side });
    const names = r => ({ left: r.press[0] - 30, top: Math.min(panel.height - 16, r.top + r.side - 14), width: 60, height: 17 });
    for (const rect of rects) {
      const where = `four beds, ${width}x${height}, ${roster} players, ${rect.id}`;
      for (const size of [[34, 13], [52, 13]]) {
        const box = tagBox({ plate: rect.badge, size, panel, keepClear: rects.filter(other => other !== rect).map(names) });
        const tag = { left: box.left, top: box.top, width: size[0], height: size[1] };
        if (tag.left < LABEL_MARGIN - 0.01 || tag.left + tag.width > panel.width - LABEL_MARGIN + 0.01 || tag.top + tag.height > panel.height - LABEL_MARGIN + 0.01) problems.push(`${where}: a tag leaves the panel`);
        if (tag.top < panel.cap - 0.01) problems.push(`${where}: a tag in the caption's band`);
        for (const other of rects.filter(entry => entry !== rect)) if (meets(tag, names(other))) problems.push(`${where}: a tag over ${other.id}'s name tag`);
      }
      for (const full of [true, false]) {
        const held = full ? rects.filter(other => other !== rect).map(press) : [];
        const inset = insetBox({ rect, panel, width: Math.max(60, Math.min(84, Math.round(panel.width * 0.42))), caption: CAPTION, keepClear: held });
        if (inset) {
          insetsPlaced += 1;
          for (const box of [CAPTION, press(rect), ...held]) if (meets(inset, box)) problems.push(`${where}${full ? ', the ward full' : ''}: the inset meets ${JSON.stringify(box)}`);
        }
        const kit = fourBerthKit(rect.id);
        const fit = droneFit({ kit, frame, keepClear: [{ left: CAPTION.left - LABEL_MARGIN, top: CAPTION.top - LABEL_MARGIN, width: CAPTION.width + 2 * LABEL_MARGIN, height: CAPTION.height + 2 * LABEL_MARGIN }, ...held] });
        const w = DRONE_SCENE.width * kit.scale * frame.k * fit;
        const [lx, ly] = hoverAt(kit, fit);
        const drone = { left: frame.tx + lx * frame.k - w / 2, top: frame.ty + (ly - DRONE_SCENE.bob) * frame.k - (DRONE.lens[1] / DRONE.w) * w, width: w, height: (w * DRONE.h) / DRONE.w };
        if (fit > DRONE_MIN_FIT) for (const box of [CAPTION, ...held]) if (box.top + box.height <= frame.ty + kit.chest[1] * frame.k && meets(drone, box)) problems.push(`${where}${full ? ', the ward full' : ''}: the drone meets ${JSON.stringify(box)} at fit ${fit}`);
      }
    }
  }
  // The controls take turns on the successor board too, and the cards of the characters off the board fit its sheet:
  // up to eight (an EJECT's five and three overflows) at every phone the controls' layout fits, in normal and 200% text.
  let sheets = 0, decks = 0;
  for (const [width, height] of VIEWPORTS) for (const enlarged of [false, true]) for (const roster of FOUR_ROSTERS) {
    const bars = enlarged ? ENLARGED.bars : null;
    const one = turnsLayout({ width, height }, roster, { insets: insetsOf(null), bars });
    const four = turnsFour.turnsLayout({ width, height }, roster, { insets: insetsOf(null), bars });
    const where = `four beds, ${width}x${height}${enlarged ? ', 200% text' : ''}, ${roster} players`;
    if (JSON.stringify(one.sheet) !== JSON.stringify(four.sheet) || JSON.stringify(one.choosing) !== JSON.stringify(four.choosing)) problems.push(`${where}: the controls' layout is not the current board's`);
    const targets = four.fits ? turnsFour.boardTargets(four.board, roster).filter(target => target.room === 'hospital').map(target => target.id).join() : 'H1,H2,H3,H4';
    if (targets !== 'H1,H2,H3,H4') problems.push(`${where}: the Hospital's targets are ${targets}`);
    if (!four.fits || !four.sheet) continue;
    sheets += 1;
    for (let count = 1; count <= 8; count += 1) {
      const cards = offBoardCards({ left: four.sheet.body.left - four.sheet.left, top: four.sheet.body.top - four.sheet.top, width: four.sheet.body.width, height: four.sheet.body.height }, count);
      if (!cards) { if (count <= 5) problems.push(`${where}: ${count} off-board cards do not fit the sheet`); continue; }
      decks += 1;
      if (cards.some(card => card.width < 44)) problems.push(`${where}: an off-board card under 44 px`);
    }
  }
  // The overflow victim's beat: its length, nothing drawn outside it, its words once, still reduced panels, no input but the
  // moment and the setting; the plaque in the spine and the stamp in the Hospital's band at every phone.
  for (const reduced of [false, true]) {
    let said = false;
    const end = overflowEnd(reduced);
    for (let t = -200; t <= end + 400; t += 10) {
      const frame = overflowFrame(t, { reduced });
      const where = `the overflow beat${reduced ? ', reduced' : ''}, ${t} ms`;
      for (const extra of [{ cause: 'shot' }, { attacker: 5, role: 'x', side: 'y', bed: 'H5' }]) if (JSON.stringify(overflowFrame(t, { reduced, ...extra })) !== JSON.stringify(frame)) problems.push(`${where}: ${Object.keys(extra).join(', ')} changes the beat`);
      if (frame.done !== t >= end) problems.push(`${where}: done is ${frame.done}`);
      const drawn = frame.full.opacity > 0 || frame.flyer || (t >= 0 && t < end && frame.figure.grey > 0);
      if ((t < 0 || t >= end) && (frame.full.opacity > 0 || frame.flyer || frame.figure.grey > 0)) problems.push(`${where}: something drawn outside the beat`);
      if (said && !frame.announce && t < end) problems.push(`${where}: the words withdrawn`);
      said = said || frame.announce;
      if (reduced && (frame.flyer || frame.full.scale !== 1 || frame.plaque.scale !== 1)) problems.push(`${where}: motion in the reduced variant`);
      if (drawn && t < 0) problems.push(`${where}: drawn before the beat`);
    }
    if (!said) problems.push(`the overflow beat${reduced ? ', reduced' : ''}: no words`);
  }
  if (overflowEnd(false) !== OVERFLOW_FILM.end || OVERFLOW_FILM.end > 3000) problems.push(`the overflow beat lasts ${overflowEnd(false)} ms`);
  for (const v of [0, 0.5, 1]) { const at = overflowWay([10, 100], [200, 20], v); if (v === 0 && (at[0] !== 10 || at[1] !== 100)) problems.push('the way does not start at the victim'); if (v === 1 && (at[0] !== 200 || at[1] !== 20)) problems.push('the way does not end at the plaque'); }
  let plaques = 0;
  for (const [width, height] of VIEWPORTS) for (const capsule of [false, true]) for (const roster of FOUR_ROSTERS) {
    const board = fitFour.fitBoardV2({ width, height }, roster, { capsule });
    const at = spinePlaqueBox({ hospital: board.boxes.hospital, jail: board.boxes.jail, border: board.shell.border, cap: board.panels.hospital.cap, size: [18, 30] });
    if (!at) { problems.push(`four beds, ${width}x${height}: no room for the plaque in the spine`); continue; }
    plaques += 1;
    const spine = { left: board.boxes.hospital.left + board.boxes.hospital.width, right: board.boxes.jail.left };
    if (at.left < spine.left - 0.01 || at.left + at.width > spine.right + 0.01 || at.top < board.boxes.hospital.top - 0.01 || at.top + at.height > board.boxes.hospital.top + board.boxes.hospital.height) problems.push(`four beds, ${width}x${height}: the plaque leaves the spine`);
    // The FULL stamp beside the caption, or just under its left end on the smallest phones: whole in the panel, over neither
    // the caption nor a bed's press area. The caption is drawn up to 104 px wide (HOSPITAL at the caption's size).
    const presses = fitFour.slotRects('hospital', roster, board.panels.hospital).map(rect => ({ left: rect.left, top: rect.top, width: rect.side, height: rect.side }));
    const caption = { left: 2, top: 2, width: 104, height: 28 };
    const stamp = fullStampBox({ caption, size: [42, 19], panel: board.panels.hospital, keepClear: presses });
    const meetsBox = (a, b) => a.left < b.left + b.width - 0.01 && b.left < a.left + a.width - 0.01 && a.top < b.top + b.height - 0.01 && b.top < a.top + a.height - 0.01;
    if (!stamp) problems.push(`four beds, ${width}x${height}: no room for the FULL stamp`);
    else {
      const box = { left: stamp.left, top: stamp.top, width: 42, height: 19 };
      if (box.left + box.width > board.panels.hospital.width || box.top + box.height > board.panels.hospital.height) problems.push(`four beds, ${width}x${height}: the FULL stamp leaves the panel`);
      for (const other of [caption, ...presses]) if (meetsBox(box, other)) problems.push(`four beds, ${width}x${height}: the FULL stamp meets ${JSON.stringify(other)}`);
    }
  }
  // The review page's synthetic occurrence: the four beds full, the victim off the board afterwards, nobody else moved.
  for (const roster of FOUR_ROSTERS) {
    const { subject, before, after } = overflowOutcome(roster);
    if (before.filter(seat => seat.room === 'hospital').length !== FOUR_BEDS) problems.push(`the overflow example, ${roster} players: the ward is not full`);
    if (subject.seat !== OVERFLOW_OCCURRENCE.seatId || subject.room === 'hospital' || subject.health !== 'Healthy') problems.push(`the overflow example, ${roster} players: the victim is not an incoming Healthy player`);
    const victim = after.find(seat => seat.seat === subject.seat);
    if (victim.room !== null || victim.slot !== null || victim.health !== 'Eliminated') problems.push(`the overflow example, ${roster} players: the victim is not off the board`);
    for (const seat of after) if (seat.seat !== subject.seat && JSON.stringify(seat) !== JSON.stringify(before.find(entry => entry.seat === seat.seat))) problems.push(`the overflow example, ${roster} players: seat ${seat.seat} moved`);
  }
  const contract = JSON.stringify(overflowContract());
  for (const word of ROLE_WORDS) if (contract.includes(word)) problems.push(`the overflow contract names ${word}`);
  const films = await json('design/board-v2/contract/films.json').catch(() => null);
  if (!films || JSON.stringify(films.films?.[9]) !== JSON.stringify(overflowContract())) problems.push('contract/films.json does not hold the overflow beat\'s contract: run design/tools/board-v2-assets.mjs');
  check(`the successor's four-berth Hospital: fit-four.mjs the current layout with the successor's slots and turns-four.mjs turns.mjs but its imports; four berths H1 to H4 for every roster, every other room the current table's; the berths' furniture, dock and plates the ward's own; #158's rescue frame for frame on them; the current board panel for panel, the four berths whole in every Hospital panel it draws (${boards} boards); #158's tags, insets (${insetsPlaced} placed) and drone clear at every phone; the controls' sheet (${sheets} layouts) holding up to eight off-board cards (${decks} decks); the overflow beat's length, words and still reduced panels, its plaque in the spine (${plaques} boards) and its example the server's shape`, problems);
}

// ---------- The Clone, privately (storyboard S3) ----------
{
  const problems = [];
  // The films: their lengths; every 10 ms, in both motion modes, nothing but the moment, the film and the setting as input;
  // an activation's card only from its start; the real character fading out and the duplicate in, and the reverse on expiry;
  // the reduced variants a held card and one 80 ms cross-fade, with no scan, no halftone and no pop.
  if (cloneEnd('activate') !== 1800 || cloneEnd('expire') !== 900 || cloneEnd('activate', true) !== 480 || cloneEnd('expire', true) !== 480) problems.push(`the films last ${cloneEnd('activate')} and ${cloneEnd('expire')} ms (reduced ${cloneEnd('activate', true)} and ${cloneEnd('expire', true)})`);
  for (const kind of CLONE_FILMS) for (const reduced of [false, true]) {
    const end = cloneEnd(kind, reduced);
    let last = null;
    for (let t = -200; t <= end + 400; t += 10) {
      const f = cloneFrame(kind, t, { reduced });
      const where = `the ${kind}${reduced ? ', reduced' : ''}, ${t} ms`;
      for (const extra of [{ attacker: 5 }, { role: 'x', side: 'y' }, { target: 2, block: true }]) if (JSON.stringify(cloneFrame(kind, t, { reduced, ...extra })) !== JSON.stringify(f)) problems.push(`${where}: ${Object.keys(extra).join(', ')} changes the film`);
      if (f.done !== t >= end) problems.push(`${where}: done is ${f.done}`);
      if (kind === 'activate' && t < 0 && (f.card || f.clone.opacity || f.halftone.opacity || f.scan)) problems.push(`${where}: drawn before its start`);
      if (kind === 'activate' && t >= 0 && !f.card) problems.push(`${where}: no card during the film`);
      for (const value of [f.real.opacity, f.outline.opacity, f.clone.opacity, f.halftone.opacity, f.halftone.density, f.pad, f.stamps.active.opacity, f.stamps.ended.opacity]) if (!(value >= 0 && value <= 1)) problems.push(`${where}: a value ${value} outside 0 to 1`);
      if (t >= end && JSON.stringify({ ...f, done: true }) !== JSON.stringify({ ...cloneFrame(kind, Infinity, { reduced }), done: true })) problems.push(`${where}: still moving after its end`);
      if (reduced && (f.scan || f.halftone.opacity > 0 || f.stamps.active.scale !== 1 || f.stamps.ended.scale !== 1)) problems.push(`${where}: motion in the reduced variant`);
      if (reduced && last && t > 0 && (t < CLONE_FILM.reduced.holdMs || t > CLONE_FILM.reduced.holdMs + CLONE_FILM.reduced.fadeMs) && JSON.stringify({ ...f, stage: '', done: false }) !== JSON.stringify({ ...last, stage: '', done: false })) problems.push(`${where}: the reduced card changes outside its cross-fade`);
      if (last && t > 0 && t <= end) {
        const up = kind === 'activate';
        if (up ? f.real.opacity > last.real.opacity + 1e-9 || f.outline.opacity < last.outline.opacity - 1e-9 || f.clone.opacity < last.clone.opacity - 1e-9
          : f.real.opacity < last.real.opacity - 1e-9 || f.outline.opacity > last.outline.opacity + 1e-9 || f.clone.opacity > last.clone.opacity + 1e-9) problems.push(`${where}: the ${up ? 'character returns or the duplicate goes' : 'duplicate returns or the character goes'}`);
      }
      if (f.scan && (f.scan.y < 0 || f.scan.y > 1 || !['real', 'clone'].includes(f.scan.over))) problems.push(`${where}: the scan band is off its figure`);
      last = f;
    }
  }
  const settledActive = cloneFrame('activate', Infinity), settledEnded = cloneFrame('expire', Infinity);
  if (settledActive.real.opacity !== 0 || settledActive.outline.opacity !== 1 || settledActive.clone.opacity !== 1 || settledActive.stamps.active.opacity !== 1 || settledActive.stamps.ended.opacity !== 0) problems.push('the active card is not the dotted outline, the duplicate and CLONE ACTIVE');
  if (settledEnded.real.opacity !== 1 || settledEnded.outline.opacity !== 0 || settledEnded.clone.opacity !== 0 || settledEnded.stamps.ended.opacity !== 1 || settledEnded.stamps.active.opacity !== 0) problems.push('the ended card is not the character alone and CLONE ENDED');
  if (JSON.stringify({ ...cloneFrame('expire', -1), done: true }) !== JSON.stringify({ ...settledActive, done: true })) problems.push('the expiry does not start from the active card');
  // The triggers and the card, from the own view alone: an activation only on a live change from unused to active, an
  // expiry only on a live change from active to ended; never on a baseline, a reconnect, for an Eliminated Alien or
  // for the view that ends the match (1.10 ends an active Clone when the match finishes or is aborted).
  const { unused, active, ended, r5 } = CLONE_STATUSES;
  const cases = [
    [{ before: unused, after: active, live: true }, 'activate'], [{ before: unused, after: r5, live: true }, 'activate'], [{ before: active, after: ended, live: true }, 'expire'],
    [{ before: unused, after: active, live: false }, null], [{ before: active, after: ended, live: false }, null], [{ before: active, after: ended, live: true, eliminated: true }, null],
    [{ before: active, after: ended, live: true, matchEnded: true }, null], [{ before: unused, after: active, live: true, matchEnded: true }, null],
    [{ before: active, after: active, live: true }, null], [{ before: ended, after: ended, live: true }, null], [{ before: null, after: active, live: true }, null], [{ before: unused, after: unused, live: true }, null],
  ];
  for (const [input, want] of cases) if (cloneFilmFor(input) !== want) problems.push(`cloneFilmFor(${JSON.stringify(input)}) is ${cloneFilmFor(input)}, not ${want}`);
  if (cloneCard({ status: active }) !== 'active' || cloneCard({ status: ended }) !== 'ended' || cloneCard({ status: unused }) !== null || cloneCard({ status: null }) !== null || cloneCard({ status: active, eliminated: true }) !== null) problems.push('the card is not active, ended or none as the own view says');
  // The words are the hosted board's private status line, quoted (Frontend at the 1.10 baseline 6ca4b51).
  if (cloneWords(active) !== 'Clone active through Round 3.' || cloneWords(r5) !== 'Clone active through Round 5.' || cloneWords(ended) !== 'Clone inactive; its once-only use is spent.' || cloneWords(unused) !== 'Clone unused.' || cloneWords(null) !== null) problems.push('the words are not the hosted board\'s');
  // The review's statuses have 1.10's shape: once-only, the fixed expiry the round after activation, Round 5 its own.
  for (const [name, status] of Object.entries(CLONE_STATUSES)) {
    const ok = status.used ? status.activatedRound !== null && status.expiresAfterRound === Math.min(status.activatedRound + 1, 5) : status.activatedRound === null && status.expiresAfterRound === null && !status.active;
    if (!ok || (status.active && !status.used) || JSON.stringify(Object.keys(status).sort()) !== JSON.stringify(['activatedRound', 'active', 'expiresAfterRound', 'used'])) problems.push(`the ${name} status is not 1.10's shape`);
  }
  for (const roster of ROSTERS) for (const name of Object.keys(CLONE_CASES)) {
    const c = cloneCase(name, roster);
    if (c.own.seat !== CLONE_SEAT || c.own.health !== 'Healthy') problems.push(`the ${name} case, ${roster} players: the Alien is not a Healthy seat ${CLONE_SEAT}`);
    if ((name === 'jailed') !== (c.own.room === 'jail' && c.own.jailed)) problems.push(`the ${name} case, ${roster} players: the Alien is ${c.own.jailed ? '' : 'not '}in the Jail`);
    if (new Set(c.seats.map(seat => `${seat.room}:${seat.slot}`)).size !== c.seats.length) problems.push(`the ${name} case, ${roster} players: two seats at one place`);
  }
  // The card fits the sheet at every phone and roster the controls' layout fits, normal and 200% text: the body clear of the
  // raised Pass and tall enough for the card at normal text; the portrait whole in the card, the words' column wide enough.
  let cards = 0;
  for (const [width, height] of VIEWPORTS) for (const enlarged of [false, true]) for (const roster of ROSTERS) {
    const layout = turnsLayout({ width, height }, roster, { insets: insetsOf(null), bars: enlarged ? ENLARGED.bars : null, actions: enlarged ? ENLARGED.actions : SHEET.actions });
    if (!layout.fits) continue;
    cards += 1;
    const where = `${width}x${height}${enlarged ? ', 200% text' : ''}, ${roster} players`;
    const body = cloneBodyHeight(layout.sheet, layout.board.pass);
    if (layout.sheet.body.top + body > layout.board.pass.cy - layout.board.pass.r - PASS_GAP + 0.01) problems.push(`${where}: the card's body reaches the raised Pass`);
    if (body < CLONE_CARD.height) problems.push(`${where}: the card's body is ${body} px, under the card's ${CLONE_CARD.height}`);
    const card = cloneCardLayout({ width: layout.sheet.body.width });
    const p = card.portrait;
    if (p.left < 0 || p.top < 0 || p.left + p.width > card.width || p.top + p.height > card.height) problems.push(`${where}: the portrait leaves the card`);
    for (const place of [card.real, card.clone]) {
      const head = place.top + (FIGURE_SPAN.top - FRAME.box[1]) * place.unit;
      if (head < p.top - 0.01 || place.feet[1] > p.top + p.height + 0.01) problems.push(`${where}: a figure leaves the portrait`);
    }
    if (card.real.feet[0] + 20 > card.clone.feet[0]) problems.push(`${where}: the duplicate is not beside the character`);
    if (card.words.width < 150) problems.push(`${where}: the words' column is ${card.words.width} px`);
  }
  // Its colors far from every faction accent; the card's CSS uses the palette alone; the shipped art names no role.
  for (const [name, { nearest, distance }] of Object.entries(cloneColorDistances())) if (distance < CLONE_MIN_DISTANCE) problems.push(`the Clone's ${name} is ${distance} from the ${nearest} accent`);
  const css = await text('design/board-v2/css/page.css');
  const rules = css.split('\n').filter(line => /^\.v2-clone/.test(line)).join('\n');
  for (const hex of rules.match(/#[0-9A-Fa-f]{6}\b/g) ?? []) if (!Object.values(CLONE).includes(hex.toUpperCase())) problems.push(`the card's styles use ${hex}, not the Clone's palette`);
  for (const path of await filesUnder('design/board-v2/assets/clone')) for (const word of ROLE_WORDS) if ((await text(path)).includes(word)) problems.push(`${path} names ${word}`);
  const art = [markSvg(), halftoneSvg('<svg viewBox="0 0 1 1"></svg>'), outlineSvg('<svg viewBox="0 0 1 1"></svg>')].join('');
  for (const word of ROLE_WORDS) if (art.includes(word)) problems.push(`the Clone's art names ${word}`);
  // The controller draws in the sheet alone: it neither reads nor writes a room, a figure or the board's surface.
  const view = await text('design/board-v2/js/clone-view.mjs');
  for (const selector of ['.v2-room', '.v2-art', '.v2-fig', '.v2-board', '.v2-tag', 'v2-slot-hit']) if (view.includes(selector)) problems.push(`clone-view.mjs reaches ${selector}: the Clone is never on the board`);
  const films = await json('design/board-v2/contract/films.json').catch(() => null);
  if (!films || JSON.stringify(films.films?.[10]) !== JSON.stringify(cloneContract()) || films.films.length !== 11) problems.push('contract/films.json does not hold the Clone\'s contract: run design/tools/board-v2-assets.mjs');
  check(`the Clone (S3): its activation 1.8 s and expiry 0.9 s, their only inputs the moment, the film and the setting, the reduced variants one 80 ms cross-fade; its films started only by a live change of the own view, never for an Eliminated Alien or at the match's end; the hosted board's words; the review's statuses 1.10's shape; its card in the sheet clear of the raised Pass at every phone (${cards} layouts); its palette apart from the faction accents; its art naming no role; and its controller never on the board`, problems);
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
    // The real controls in every turn, at both phones, in normal and 200% text, and the owner's too-short cases.
    for (const name of ['390x844-choosing', '320x568-choosing', '390x844-choosing-safe', '390x844-result-0400', '390x844-result-2400', '390x844-result-3600', '320x568-result-2400', '390x844-talk-receipt', '320x568-talk-receipt', '390x844-talk-code-confirm', '320x568-talk-code-confirm', '390x844-declare-offer', '390x844-declare-side-choice', '390x844-declare-side-confirm', '390x844-rescue-confirm', '390x844-text2-choosing', '390x844-text2-result-2400', '390x844-text2-code-confirm', '375x667-text2-side-choice', '320x568-text2-too-short', '320x568-safe-too-short']) if (!files.includes(`turns-${name}.png`)) problems.push(`turns-${name}.png: not captured`);
    if ((report.probes ?? []).filter(probe => probe.turns).length !== 2 * 3 * 4) problems.push('the controls\' pointer probes did not all run');
    // The medical films at every beat, in both motion modes, at both phones, with every placement rule pictured.
    for (const name of ['390x844-critical-r3', '390x844-critical-r5', '390x844-critical-entry-0150', '390x844-reduced-critical-r3', '320x568-critical-r3', '320x568-critical-ward', '430x932-critical-ward', '390x844-rescue-0400', '390x844-rescue-1300', '390x844-rescue-2600', '390x844-rescue-3550', '390x844-rescue-4500', '390x844-rescue-5700', '390x844-reduced-rescue-0900', '320x568-rescue-2600', '390x844-rescue-detained-4500', '390x844-vignette-2600', '390x844-vignette-2600-r7', '390x844-taken-2600', '390x844-ward-2600', '320x568-upper-2600', '390x844-flatline-0800', '390x844-flatline-2000', '390x844-flatline-2700', '390x844-flatline-4300', '390x844-reduced-flatline-0900', '320x568-flatline-2000']) if (!files.includes(`medical-${name}.png`)) problems.push(`medical-${name}.png: not captured`);
    if ((report.disclosure ?? []).filter(entry => /^(the Hospital's (critical|rescue|flatline) on the display|the page after the (rescue|rescue-detained|vignette|death) film|every room but the Hospital(?! on the four-berth board)|the top bar's box on the plain board and in each medical film)/.test(entry.compare)).length !== 2 * 20) problems.push('the medical films\' page comparisons did not all run');
    // The Captain's films at every beat, in both motion modes, at both phones, with and without the capsule, a full Jail.
    for (const name of ['390x844-release-0250', '390x844-release-0650', '390x844-release-1050', '390x844-release-1500', '390x844-release-1950', '390x844-release-2500', '390x844-release-3000', '390x844-release-3350', '390x844-release-3700', '390x844-release-4100', '390x844-release-4300', '390x844-reduced-release-0300', '390x844-reduced-release-0700', '390x844-reduced-release-1250', '390x844-reduced-release-1800', '320x568-release-0650', '320x568-release-3000', '390x844-nocapsule-release-0650', '390x844-release-full-3300', '320x568-release-full-3500', '390x844-release-3000-r7', '390x844-eject-0300', '390x844-eject-0650', '390x844-eject-1200', '390x844-eject-1900', '390x844-eject-2600', '390x844-eject-3000', '390x844-eject-3500', '390x844-eject-3900', '390x844-eject-4900', '390x844-eject-6000', '390x844-eject-6500', '390x844-eject-7300', '390x844-reduced-eject-0300', '390x844-reduced-eject-0800', '390x844-reduced-eject-1400', '390x844-reduced-eject-2000', '320x568-eject-0650', '320x568-eject-full-3600', '320x568-eject-full-4900', '390x844-nocapsule-eject-0650', '390x844-eject-full-3600', '390x844-eject-3500-r8', '390x844-offboard-choosing', '320x568-offboard-choosing', '320x568-offboard-full-choosing', '390x844-offboard-choosing-text2', 'sheet']) if (!files.includes(`captain-${name}.png`)) problems.push(`captain-${name}.png: not captured`);
    if ((report.disclosure ?? []).filter(entry => /^(the Captain's (release|eject) film on the display|the page after the (release|release-full|eject|eject-full) film|(hospital|room-a, room-b, hospital) during the (release|eject) film|the top bar's box on the plain board and in each Captain film)/.test(entry.compare)).length !== 2 * 16) problems.push('the Captain films\' page comparisons did not all run');
    // The successor's four-berth board: its boards at every phone, the Blackout's dark, #158's films on it, the controls, the
    // Captain's plaque in the spine and the overflow beat at every beat in both motion modes.
    for (const name of ['320x568-ward', '360x740-ward', '390x844-ward', '430x932-ward', '320x568-mixed', '390x844-mixed', '390x844-mixed-capsule', '390x844-slots', '320x568-slots', '390x844-stress', '390x844-ward-r7', '390x844-ward-r8', '390x844-hospital', '320x568-hospital', 'scene-hospital', '390x844-blackout-8000-dark', '390x844-blackout-8000-disabler-hospital', '390x844-blackout-16300-settled', '390x844-critical-r3', '320x568-critical-r3', '390x844-rescue-2600', '390x844-rescue-3550', '320x568-rescue-2600', '390x844-reduced-rescue-0900', '390x844-vignette-2600', '390x844-taken-2600', '390x844-flatline-2000', '390x844-turns-choosing', '320x568-turns-choosing', '390x844-turns-result-2400', '390x844-eject-7300', '390x844-offboard-choosing', '390x844-overflow-0150', '390x844-overflow-0700', '390x844-overflow-1600', '390x844-overflow-2350', '390x844-overflow-2900', '320x568-overflow-1600', '390x844-overflow-reduced-0040', '390x844-overflow-reduced-0900']) if (!files.includes(`four-${name}.png`)) problems.push(`four-${name}.png: not captured`);
    if ((report.disclosure ?? []).filter(entry => !/^the Clone's/.test(entry.compare) && /four-berth board|the overflow beat|during the overflow beat|on four berths/.test(entry.compare)).length !== 15) problems.push('the four-berth board\'s page comparisons did not all run');
    // The Clone's card at every beat of both films, in both motion modes, at the phones and text sizes, in its cases, and on nobody else's screen.
    for (const name of CLONE_SHOTS) if (!files.includes(`clone-${name}.png`)) problems.push(`clone-${name}.png: not captured`);
    if ((report.disclosure ?? []).filter(entry => /^the Clone's|Clone's card/.test(entry.compare)).length !== CLONE_COMPARISONS) problems.push('the Clone\'s page comparisons did not all run');
  }
  check('the captures are current, every measured board passed, every pointer probe and press landed, every compared page is the same, and the capsule, the real controls, the medical films, the Captain\'s films, the four-berth board and the Clone\'s card are pictured in every state', problems);
}

for (const name of passed) console.log(`ok    ${name}`);
for (const failure of failures) console.error(`FAIL  ${failure}`);
console.log(`Board-v2 checks: ${passed.length} passed, ${failures.length} failures`);
if (failures.length) process.exitCode = 1;
