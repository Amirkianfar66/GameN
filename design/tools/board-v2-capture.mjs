// mothership:dev-only
//
// Captures and measures the board-v2 proposal (design/board-v2/: the fixed slots and the
// Hospital ward) on its review page:
//   node design/tools/board-v2-capture.mjs
//   npm run capture:board-v2 --workspace @mothership/design-tokens
//
// Needs a Chromium-based browser (CHROME_PATH overrides the search). Node built-ins only.
// Writes design/board-v2/review/<name>.png, contact.png, index.json (what was captured, from which
// inputs) and report.json (what was measured). On every board it measures, from the page's own
// DOM: every slot's press area is at least 44 x 44, whole inside its room, below the caption and
// apart from every other, and is where design/board-v2/js/fit.mjs puts it; every position number
// sits on its own press area; the page does not scroll; the board does not run under the
// navigation (or, where it does, by exactly what fit.mjs reports); the navigation's raised Pass
// is where fit.mjs puts it for the phone's shell and covers no press area; the page draws the
// shell and the fallback fit.mjs chooses; and a real pointer at the centre and at each inner
// corner of every slot's press area lands on that slot (document.elementFromPoint), not on the
// navigation, the Pass, a caption or another slot. It probes the same at every phone width
// around each shell's boundary (the heights where a shell starts or stops fitting), with and
// without safe-area insets. On every frame of the Blackout's lighting window it measures that
// the page is at the film's stage, that every marker is where fit.mjs puts it (shake or no
// shake), that only the eligible Disabler's screen has press areas, each a slot's whole press
// area, that the board never moves, that the window's line is in the top bar (inside it, above
// the board, never cut, the words the view gives), that no name is on the page in the dark, and
// that everyone is where the outcome leaves them (a hit patient in the Hospital). It presses the
// page with a real pointer (Input.dispatchMouseEvent): every position of every room a Disabler
// can be bound to, at both ends of the dark (4 999, 5 000, 5 100, 14 999 and 15 000 ms, in both
// motion modes), and a sent position's answers (late, lost, rejected, never sent). On every frame
// of ATTACK BLOCKED it measures that only the target's room's occupants' screens hold the film,
// each part on the page exactly while the film draws it and nothing after its end, the label
// inside its panel and off the caption, only the target's figure braced, and the live region's
// words. It places the label for every slot of every room at every phone and roster. Then it
// compares whole pages: a strike that missed against a round with no strike, a Blue Disabler's
// screen against a Red one's, the display's against a player's, the top bar's box on every screen,
// a block by either defense, and an outsider's or the display's screen with a block and without,
// which must be the same. With the private-talk capsule (?capsule=1 and &film=capsule) it measures
// that the capsule is where fit.mjs puts it, beside the Command Room and half its width, and every
// room where fit.mjs puts it at every stage; that every slot keeps its press area and a pointer
// lands on it, and in the capsule only each seated participant's own target, whole, 44 px, below
// the caption and apart from the other's, where a pointer lands too; that the capsule's door, light, people
// and tags are the film's, the people dressed as the board dresses them; that each participant's
// place keeps its name tag, with its away marker and badge as the film says, and nobody else is
// touched; that the top bar keeps its box and says the stage and the server's countdown; that no
// side or role is on the page; and that a participant's claim panel is never under the film. It
// compares the display's page with a player's, a reconnect's board with the film's settled one, and
// the board after the exit with the idle board. With the real controls' places (&ui=, the owner's
// "controls take turns", design/board-v2/js/turns.mjs) it measures that every room is where
// turns.mjs puts it below the match's top bar (124 px at 200% text); that while a character choice
// is open the choosing row is the navigation's box, the navigation and the Pass give way, every
// offered seat is ringed on each of its targets and a pointer lands on every target and on every
// control in the row; that otherwise the sheet is its box over the Hospital and the Jail, covers no
// other room or target, keeps its pinned actions 44 px, clear of the Pass and pressable, scrolls
// inside by exactly what turns.mjs plans, and shows the private claim whole in the result stage;
// and where no board fits, the too-short page. It compares each page's board with the same page
// without the controls, which must be the same. With the Hospital's medical films (&film=critical,
// rescue and flatline; storyboards S9, S5 and S10) it measures that every patient's berth shows what
// its public facts say (the monitor, the lamp, the bed light, the rescue tag from the server's values
// and the detention tag) where the ward draws them, each tag where tagBox() puts it, whole in the
// panel, out of the caption's band and off every name tag; that a film's parts are on the page
// exactly while its frame draws them, where the frame puts them (the drone's lens to the pixel, at
// the size droneFit() allows, the inset where insetBox() puts it), never over the caption or a
// press area another seat holds, and nothing after its end; that no film is drawn where another seat
// holds its berth; that its subject is drawn once, by the film, and everyone else where the snapshot
// has them; that the room's light dips on its art alone; the client's words in the live region; and
// a pointer on every slot meanwhile. It compares the display's page with a player's, the page after
// each film with the page before it, every other room during a film with the same room before it,
// and the top bar's box with the plain board's. With the Captain's films (&film=release and eject;
// storyboards S6 and S7) it measures that the console inset is where consoleBox() puts it, over no
// caption and off the Captain's place, its plate and cover as the frame has them; that the pulse's
// way passes under no caption and its head is where the frame puts it; that the Jail's door is the
// room's own at its scene frame, as the frame has it; that every subject is drawn once, where and
// as its state says (in the Jail, crossing the board, landing in the room's clothes, a silhouette,
// a grey cut-out), the released marked away at their new places until they land and everyone else
// where the snapshot has them; the emergency light, the airlock (its rim whole in the panel and
// below the caption), the suction, EJECTED and the exterior as the frame says; nothing of a film
// before or after it, and the memorial plaque the board's own; the client's words; and a pointer on
// every slot meanwhile. It compares the display's page with a player's, the page after each film
// with the page before it, the rooms a film never touches with the same rooms before it, and the
// top bar's box with the plain board's. These are statements about desktop Chromium laying
// out a review page from synthetic fixtures and stand-ins sized from Frontend's measurements, not
// measurements of a phone or of Frontend's controls, and nothing about a match.

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { boardV2InputsSha256 } from './lib/board-v2-inputs.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const OUT = 'design/board-v2/review';
const { CAPSULE, SHELL, fitBoardV2, boardRects, insetsOf, slotRects } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/js/fit.mjs')).href);
const { BLACKOUT, blackoutFrame, lightsBackAt } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/films/blackout.mjs')).href);
const { BLACKOUT_OUTCOMES, fixtureSeats, settledSeats } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/js/fixtures.mjs')).href);
const { addressSelection, lineText } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/js/blackout-view.mjs')).href);
const { BOARD_ROOMS, sceneOf } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/scenes/slots.mjs')).href);
const { blockedFrame, blockedStartInBlackout } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/films/blocked.mjs')).href);
const { LABEL_MARGIN } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/fx/label-box.mjs')).href);
const { blockedTargets } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/js/blocked-view.mjs')).href);
const { CREW } = await import(pathToFileURL(resolve(repoRoot, 'design/board-motion/figures/crew.mjs')).href);
const NAMES = Object.values(CREW).map(member => member.sign);
const { CAPSULE_FILM, capsuleFrame } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/films/capsule.mjs')).href);
const { CAPSULE_SEATS } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/scenes/capsule.mjs')).href);
const { SHEET_ROOMS, boardTargets, turnsLayout } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/js/turns.mjs')).href);
const { ENLARGED } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/js/turns-view.mjs')).href);
const { berthState, criticalFrame, filmBerth, flatlineEnd, flatlineFrame, rescueEnd, rescueFrame } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/films/medical.mjs')).href);
const { DRONE, DRONE_SCENE, PULSE_BOX, PULSE_FLASH_RADIUS, berthKit, droneFit, insetBox, tagBox } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/fx/medical.mjs')).href);
const { medicalOutcome, medicalSeats } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/js/medical-fixtures.mjs')).href);
const { outcomeWords } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/js/medical-view.mjs')).href);
const { frameScene, pressPoint } = await import(pathToFileURL(resolve(repoRoot, 'design/board-motion/scenes/frame.mjs')).href);
const { FRAME } = await import(pathToFileURL(resolve(repoRoot, 'design/board-motion/figures/body.mjs')).href);
const { skeletonOf } = await import(pathToFileURL(resolve(repoRoot, 'design/board-motion/figures/gestures.mjs')).href);
const { AIRLOCK, CONSOLE, JAIL_DOOR, conduitAt, conduitPoints, consoleBox, plaqueBox } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/fx/captain.mjs')).href);
const { captainWords, ejectEnd, ejectFrame, releaseEnd, releaseFrame } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/films/captain.mjs')).href);
const { captainOutcome } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/js/captain-fixtures.mjs')).href);
const fitFour = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/js/fit-four.mjs')).href);
const slotsFour = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/scenes/slots-four.mjs')).href);
const turnsFour = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/js/turns-four.mjs')).href);
const { fourBerthKit, fourFilmBerth, fourRescueFrame } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/fx/medical-four.mjs')).href);
const { fullStampBox, overflowWay, spinePlaqueBox } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/fx/overflow.mjs')).href);
const { overflowEnd, overflowFrame } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/films/overflow.mjs')).href);
const { overflowOutcome, overflowWords } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/js/overflow-fixtures.mjs')).href);
const { FIGURE_SPAN, PASS_GAP, cloneBodyHeight, cloneCardLayout } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/fx/clone.mjs')).href);
const { cloneFilmFor, cloneFrame, cloneWords } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/films/clone.mjs')).href);
const { cloneCase } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/js/clone-fixtures.mjs')).href);
const { SHEET } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/js/turns.mjs')).href);
/**
 * The layout a shot's page draws (js/layout.mjs's rule): the current board's, or with &beds=4 the successor's four-berth
 * one, whose bands and panels are the current board's and whose Hospital is the four-berth ward. Every measurement of a
 * shot takes its expectations from it.
 */
const isFour = shot => new URLSearchParams(shot.query ?? '').get('beds') === '4';
const CURRENT_LAYOUT = Object.freeze({ fitBoardV2, slotRects, boardRects, sceneOf, boardTargets, turnsLayout, berthKit, filmBerth, rescueFrame });
const FOUR_LAYOUT = Object.freeze({
  fitBoardV2: fitFour.fitBoardV2, slotRects: fitFour.slotRects, boardRects: fitFour.boardRects, sceneOf: slotsFour.sceneOf, boardTargets: turnsFour.boardTargets, turnsLayout: turnsFour.turnsLayout,
  berthKit: fourBerthKit, filmBerth: (anchor, roster, seats, subject) => fourFilmBerth(anchor, seats, subject), rescueFrame: fourRescueFrame,
});
const layoutOf = shot => (isFour(shot) ? FOUR_LAYOUT : CURRENT_LAYOUT);
/** Words of a side or a role: never on a capsule, medical or Captain page, which is public. */
const PRIVATE_WORDS = /\b(?:Blue|Red|Officer|Insider|Cracker|Disabler|Supplier|Undercover|Hacker|Alien|faction)\b/;

/** The phones the board is drawn on: the four the board-motion prototype is measured at. */
export const VIEWPORTS = [[320, 568], [360, 740], [390, 844], [430, 932]];
const vp = ([w, h]) => `${w}x${h}`;

function plan() {
  const shots = [];
  for (const viewport of VIEWPORTS) {
    const [w, h] = viewport;
    shots.push({ file: `board-${vp(viewport)}-ward.png`, group: 'board', viewport, query: 'roster=9&fixture=ward&hit=1', about: `Every seat Injured: the nine-berth ward full, at ${w} x ${h}`, measure: true });
    shots.push({ file: `board-${vp(viewport)}-mixed.png`, group: 'board', viewport, query: 'roster=9&fixture=mixed&hit=1', about: `A third-round board: a Captain, people in A, B and the Jail, two patients (one detained), one patient who died, at ${w} x ${h}`, measure: true });
    shots.push({ file: `slots-${vp(viewport)}.png`, group: 'slots', viewport, query: 'roster=9&fixture=empty&markers=1&press=1&ids=1', about: `Every fixed slot of every room: its press area, its position number and its id, nobody there, at ${w} x ${h}`, measure: true });
    shots.push({ file: `slots-${vp(viewport)}-stress.png`, group: 'slots', viewport, query: 'roster=9&fixture=stress&markers=1&press=1', about: `Every slot taken (characters repeat; layout only), with press areas and position numbers, at ${w} x ${h}`, measure: true });
    shots.push({ file: `hospital-${vp(viewport)}.png`, group: 'hospital', viewport, query: 'roster=9&fixture=ward', selector: '.v2-room[data-room=hospital]', scale: 3, about: `The Hospital panel alone, nine patients, at ${w} x ${h} (3x); the edge of the raised Pass shows at its lower right, as on the phone` });
  }
  for (const roster of [7, 8]) {
    shots.push({ file: `hospital-390x844-r${roster}.png`, group: 'hospital', viewport: [390, 844], query: `roster=${roster}&fixture=ward`, selector: '.v2-room[data-room=hospital]', scale: 3, about: `The ${roster}-berth ward full, at 390 x 844 (3x); the edge of the raised Pass shows at its lower right` });
    shots.push({ file: `slots-390x844-r${roster}.png`, group: 'slots', viewport: [390, 844], query: `roster=${roster}&fixture=empty&markers=1&press=1&ids=1`, about: `Every fixed slot for ${roster} players, at 390 x 844`, measure: true });
  }
  // The shell chosen by what fits: where the phone kit's shell for the height would not fit, the next
  // smaller one; where none fits at the screen's width, a narrower board; where none fits at all, a message.
  shots.push({ file: 'board-430x601-mixed.png', group: 'board', viewport: [430, 601], query: 'roster=9&fixture=mixed&hit=1', about: 'At 430 x 601 the short shell would leave the rooms 21 px short: the compact shell, every target clear of the navigation', measure: true });
  shots.push({ file: 'board-390x844-safe-mixed.png', group: 'board', viewport: [390, 844], query: 'roster=9&fixture=mixed&hit=1&safe=47,0,34,0', about: 'At 390 x 844 with safe-area insets of 47 px above and 34 px below: the bars fill them, the board fits the 763 px between', measure: true });
  shots.push({ file: 'board-1024x768-narrow.png', group: 'board', viewport: [1024, 768], query: 'roster=9&fixture=mixed&hit=1', about: 'A wide, short window (1024 x 768): no shell fits the full width, so the compact shell and a centred board 852 px wide (fallback narrow)', measure: true });
  shots.push({ file: 'board-844x390-too-short.png', group: 'board', viewport: [844, 390], query: 'roster=9&fixture=mixed&hit=1', about: 'A phone on its side (844 x 390): no board fits 390 px, so no board and a message (fallback too-short); never a board under the navigation', measure: true });
  shots.push({ file: 'board-280x653-too-narrow.png', group: 'board', viewport: [280, 653], query: 'roster=9&fixture=mixed&hit=1', about: 'A folding phone\'s cover screen (280 x 653): Rooms B and the Hospital cannot hold their slots at 121 px, so no board and a message (fallback too-narrow)', measure: true });
  for (const [roster, fixture, about] of [[9, 'ward', 'nine patients, Injured'], [9, 'mixed', 'a patient lying, one detained sitting up, one who died, empty berths made up'], [8, 'empty', 'eight berths, empty and made up; the vitals board in the ninth\'s place'], [7, 'empty', 'seven berths; the approved medicine cabinet and the vitals board in the upper places']]) {
    shots.push({ file: `scene-hospital-r${roster}-${fixture}.png`, group: 'scene', viewport: [1024, 768], query: `scene=hospital&roster=${roster}&fixture=${fixture}`, scale: 1, sheetHeight: 300, about: `The whole ward scene, ${roster} players: ${about}` });
  }
  // The Blackout's lighting window: its storyboard frames on the mixed board, the outcome a hit at B2 published at 15 400 ms.
  const film = (name, viewport, t, extra, about, roster = 9) => shots.push({ file: `blackout-${vp(viewport)}-${name}.png`, group: 'blackout', viewport, query: `roster=${roster}&fixture=mixed&film=blackout&t=${t}${extra}`, about, film: { t } });
  const at390 = [390, 844];
  film('0150-markers', at390, 150, '', 'Markers fading in at every slot of every room, empty ones included; the top bar\'s clock and its line, "Remember who is where." (150 ms)');
  film('1000-preview', at390, 1000, '', 'The preview: lights on, people, name tags and position markers (1 s)');
  film('4360-dip', at390, 4360, '', 'The flicker\'s first dip: every room at about 60% (4 360 ms)');
  film('4760-sparks', at390, 4760, '', 'Each room\'s own light sparking, which light from the window\'s id; the second dip (4 760 ms)');
  film('4999-last-lit', at390, 4999, '', 'The preview\'s last millisecond: everyone still on the page, and no selection open (4 999 ms)');
  film('5000-lights-out', at390, 5000, '', 'previewEndsAt exactly: every room dark, nobody and no name on the page, markers dark, the line "Wait for the lights."; the selection opens in this instant (5 000 ms)');
  film('8000-dark', at390, 8000, '', 'The dark on any player\'s screen: faint line work, dark markers, captions at 70%, the window\'s line in the top bar and nothing over any room (8 s)');
  film('8000-disabler-choose', at390, 8000, '&viewer=disabler&bound=room-b&step=choose', 'The eligible Disabler\'s screen, bound to Room B: the same top bar, its line theirs; Room B\'s press areas live (8 s)');
  film('8000-disabler-confirm', at390, 8000, '&viewer=disabler&bound=room-b&step=confirm&pick=2', 'The Disabler chose position 2: its marker gold on their screen only; a second tap on it strikes (8 s)');
  film('8000-disabler-command', at390, 8000, '&viewer=disabler&bound=command-room&step=confirm&pick=1', 'A Disabler bound to the Command Room chose C1, its one position: nothing covers it (8 s)');
  film('9200-disabler-sending', at390, 9200, '&viewer=disabler&bound=room-b&step=sent&pick=2&sentAt=9000', 'The second tap sent position 2 as one command; the press areas gone; sending (9.2 s)');
  film('12000-disabler-registered', at390, 12000, '&viewer=disabler&bound=room-b&step=sent&pick=2', 'Registered: no answer about the target until the outcome (12 s)');
  film('15200-disabler-waiting', at390, 15200, '&viewer=disabler&bound=room-b&step=sent&pick=2&sentAt=14800&replyAt=15300', 'Sent at 14.8 s, no answer yet at the deadline: waiting, never a rejection the server did not give (15.2 s)');
  film('15350-disabler-late-answer', at390, 15350, '&viewer=disabler&bound=room-b&step=sent&pick=2&sentAt=14800&replyAt=15300', 'The answer arrives after the deadline: registered, as it was before the deadline (15.35 s)');
  film('15450-disabler-lost', at390, 15450, '&viewer=disabler&bound=room-b&step=sent&pick=2&sentAt=14800&lost=1', 'The answer was lost: still waiting as the outcome lands; the receipt is recovered with the same command id, and nothing is sent again (15.45 s)');
  film('15250-disabler-rejected', at390, 15250, '&viewer=disabler&bound=room-b&step=sent&pick=2&sentAt=14990&reply=rejected&replyAt=15200', 'The server answered that position 2 was not registered (it arrived after the deadline): said only once the server says it (15.25 s)');
  film('15200-disabler-timeout', at390, 15200, '&viewer=disabler&bound=room-b&step=confirm&pick=2', 'Chosen and never sent by the deadline: time is up, no position was sent (15.2 s)');
  film('15000-hold', at390, 15000, '', 'The window\'s end: dark until the outcome is published (15 s)');
  film('15440-impact', at390, 15440, '', 'The outcome published at 15 400: the flash at the hit position, B2 (15 440 ms)');
  film('15560-star', at390, 15560, '', 'The comic star at B2; the lights coming back together in every room, on the resolved board; B2\'s room art shaking 3 px, its markers and press areas still (15 560 ms)');
  film('15760-back', at390, 15760, '', 'The lights back: Orion Injured in the Hospital at H3, in the gown; B2 empty; markers still up (15 760 ms)');
  film('16300-settled', at390, 16300, '', 'Settled: markers gone, the board normal, Orion in the Hospital (16 300 ms)');
  film('15560-double', at390, 15560, '&outcome=double', 'Two strikes, two hits (B2 and A3): one star each, identical (15 560 ms)');
  film('16300-double', at390, 16300, '&outcome=double', 'Two hits settled: Lyra and Orion Injured in the Hospital at H3 and H5, as the after-state names them (16 300 ms)');
  film('16300-double-r7', at390, 16300, '&outcome=double', 'Seven players, two hits settled: Lyra and Orion at H2 and H3 (16 300 ms)', 7);
  film('15560-miss', at390, 15560, '&outcome=miss', 'A strike that missed: nothing anywhere, the same as a round with no strike (15 560 ms)');
  for (const [name, t, about] of [['0040-markers', 40, 'markers in with an 80 ms fade'], ['5000-dark', 5000, 'the same cut at previewEndsAt as full motion: no flicker, no sparks, nobody on the page'], ['8000-dark', 8000, 'the static dark, a still bolt in each caption'], ['15420-back', 15420, 'one 80 ms fade back on the resolved board; a still burst at B2'], ['15700-burst', 15700, 'the burst held 600 ms beside the position, then gone']]) {
    film(`reduced-${name}`, at390, t, '&motion=reduced', `Reduced motion: ${about} (${t} ms)`);
  }
  const at320 = [320, 568];
  film('1000-preview', at320, 1000, '', 'The preview on the smallest phone, compact shell (1 s)');
  film('8000-dark', at320, 8000, '', 'The dark on the smallest phone: the line in the compact top bar (8 s)');
  film('8000-disabler-confirm', at320, 8000, '&viewer=disabler&bound=room-b&step=confirm&pick=2', 'The Disabler\'s choice on the smallest phone: tap it again to strike (8 s)');
  film('8000-disabler-command', at320, 8000, '&viewer=disabler&bound=command-room&step=confirm&pick=1', 'C1 chosen on the smallest phone: nothing covers it (8 s)');
  film('15200-disabler-waiting', at320, 15200, '&viewer=disabler&bound=room-b&step=sent&pick=2&sentAt=14800&replyAt=15300', 'Waiting for the answer after the deadline, on the smallest phone (15.2 s)');
  film('15560-star', at320, 15560, '', 'The star on the smallest phone (15 560 ms)');
  // ATTACK BLOCKED: on the mixed board, Orion at B2, on a Room B occupant's screen unless the shot says otherwise.
  const blocked = (name, viewport, t, extra, about) => shots.push({ file: `blocked-${vp(viewport)}-${name}.png`, group: 'blocked', viewport, query: `roster=9&fixture=mixed&film=blocked&t=${t}${extra}`, about, blocked: { t } });
  blocked('0060-incoming', at390, 60, '', 'Incoming: a source-free star at Orion\'s chest, as a hit\'s; nothing yet says blocked (60 ms)');
  blocked('0160-flash', at390, 160, '', 'The shield flashes on: a white-hot core in a pale hexagon (160 ms)');
  blocked('0280-bubble', at390, 280, '', 'The bubble blooming towards 1.05 of its size; Orion braced 2 px, the art only (280 ms)');
  blocked('0480-absorb', at390, 480, '', 'The ring absorbing the attack, eight particles scattering, the shield spent (480 ms)');
  blocked('0760-label', at390, 760, '', 'ATTACK BLOCKED above Orion, who is back in place; the words in the live region (760 ms)');
  blocked('2320-fading', at390, 2320, '', 'The label fading (2 320 ms)');
  blocked('2500-done', at390, 2500, '', 'Done: nothing the film added is left on the page (2 500 ms)');
  // The already-Injured example: the fixture's Injured patient in the Hospital, Rigel at H1 in the gown, on a Hospital occupant's screen.
  blocked('0280-injured', at390, 280, '&injured=1', 'The already-Injured example: the bubble round Rigel, a patient at H1 in the Hospital, braced 2 px in the gown (280 ms)');
  blocked('0760-injured', at390, 760, '&injured=1', 'The already-Injured example: ATTACK BLOCKED over Rigel, still Injured at H1 in the gown: bandage kept, no healing glow (760 ms)');
  blocked('2500-injured-done', at390, 2500, '&injured=1', 'After the block: Rigel still Injured at H1 in the gown; nothing the film added is left (2 500 ms)');
  blocked('reduced-0800-injured', at390, 800, '&injured=1&motion=reduced', 'Reduced motion, the already-Injured example: a still ring and the label over Rigel at H1 (800 ms)');
  blocked('0280-injured-outsider', at390, 280, '&injured=1&viewer=outsider', 'The already-Injured example on a screen outside the Hospital: nothing at all (280 ms)');
  blocked('0280-double', at390, 280, '&targets=B2,B4', 'Two blocks at one checkpoint, each on its own target (280 ms)');
  blocked('0280-outsider', at390, 280, '&viewer=outsider', 'A player in another room at the same moment: nothing at all (280 ms)');
  blocked('0280-display', at390, 280, '&viewer=display', 'The shared display at the same moment: nothing at all (280 ms)');
  for (const [name, t, about] of [['0040-in', 40, 'a still ring and the label, in over 80 ms'], ['0800-hold', 800, 'held 1 600 ms: no star, bloom, brace or particles'], ['1800-done', 1800, 'gone at 1 760 ms']]) {
    blocked(`reduced-${name}`, at390, t, '&motion=reduced', `Reduced motion: ${about} (${t} ms)`);
  }
  blocked('0280-bubble', at320, 280, '', 'The bubble on the smallest phone, clipped to Room B\'s panel (280 ms)');
  blocked('0760-label', at320, 760, '', 'The label on the smallest phone: the two words stacked to fit the panel (760 ms)');
  blocked('0760-injured', at320, 760, '&injured=1', 'The already-Injured example on the smallest phone: the label over Rigel at H1 (760 ms)');
  blocked('art-0280', at390, 280, '&viewer=art&targets=A1,C1,H1,J2,B4', 'Art review only, which no screen ever receives: a block in every room at once, on each room\'s colors (280 ms)');
  blocked('art-0760', at390, 760, '&viewer=art&targets=A1,C1,H1,J2,B4', 'Art review only: the label in every room, above its target or below its name tag, never over a caption (760 ms)');
  // In the Blackout: a blocked strike published at 15 400, a miss on every screen but Room B's occupants'.
  const inBlackout = (name, viewport, t, extra, about) => shots.push({ file: `blocked-${vp(viewport)}-blackout-${name}.png`, group: 'blocked', viewport, query: `roster=9&fixture=mixed&film=blackout&outcome=blocked&t=${t}${extra}`, about, film: { t }, blocked: { t } });
  inBlackout('16200-occupant', at390, 16200, '&in=room-b', 'The Blackout, a blocked strike: on a Room B occupant\'s screen the shield once the lights are fully back (16 200 ms; the outcome at 15 400)');
  inBlackout('16700-occupant', at390, 16700, '&in=room-b', 'The Blackout: ATTACK BLOCKED on the Room B occupant\'s screen (16 700 ms)');
  inBlackout('16700-outsider', at390, 16700, '&in=room-a', 'The Blackout at the same moment on a Room A player\'s screen: a miss (16 700 ms)');
  inBlackout('16700-occupant', at320, 16700, '&in=room-b', 'The Blackout\'s block on the smallest phone (16 700 ms)');
  // The private-talk capsule (storyboard S2): the Hack's public pair on the mixed board, Vega (1, at A1) and Orion (5, at B2)
  // unless the shot says otherwise, on a player's screen; t from the stage's authoritative start.
  const capsule = (name, viewport, query, about, { roster = 9, measure = false } = {}) => shots.push({ file: `capsule-${vp(viewport)}-${name}.png`, group: 'capsule', viewport, query: `roster=${roster}&fixture=mixed&film=capsule${query}${measure ? '&hit=1' : ''}`, about, capsule: true, measure });
  for (const viewport of VIEWPORTS) capsule('idle', viewport, '&stage=idle', `Idle: the capsule beside the Command Room, half its width, empty, its door shut and its light off; every slot's press area pressable, C1 included, at ${viewport[0]} x ${viewport[1]}`, { measure: true });
  capsule('declare-4000', at390, '&stage=declare&t=4000', 'The declaration, once the projection names the pair: Vega and Orion outlined at their places with the capsule\'s badge; the declaration\'s time in the top bar (4 s)');
  capsule('result-0400', at390, '&stage=result&t=400', 'The result stage: the outline and the badge; the claim card is on the participants\' own phones (400 ms)');
  capsule('result-1200', at390, '&stage=result&t=1200', 'Each has stood and is stepping toward the capsule\'s side, fading out of its room; its away marker (gray, faint, the badge, its name tag) at its slot (1 200 ms)');
  capsule('result-2000', at390, '&stage=result&t=2000', 'The door open; Vega walking behind the table toward the far chair (2 000 ms)');
  capsule('result-2400', at390, '&stage=result&t=2400', 'Vega coming forward beside the far chair; Orion walking in to the near one (2 400 ms)');
  capsule('result-2750', at390, '&stage=result&t=2750', 'Vega turning and sitting; Orion at his chair (2 750 ms)');
  capsule('result-3600', at390, '&stage=result&t=3600', 'Settled: both seated, the door shut, its light lit; 1 400 ms to spare before the conversation (3 600 ms); each seated participant a 44 px target for its own seat', { measure: true });
  capsule('talk-0000', at390, '&stage=talk&t=0', 'The conversation\'s authoritative start: the top bar at 1:00 from the server; both seated');
  capsule('talk-30000', at390, '&stage=talk&t=30000', 'Halfway: the quiet variations, seeded by the exchange\'s public id, unrelated to speech (0:30); every slot, C1 and both seated participants\' own targets pressed', { measure: true });
  capsule('exit-0360', at390, '&stage=exit&t=360', 'The conversation\'s end: the light out, the door open, both standing (360 ms)');
  capsule('exit-0800', at390, '&stage=exit&t=800', 'Both walking their paths back to the doorway (800 ms)');
  capsule('exit-1250', at390, '&stage=exit&t=1250', 'Orion back at B2, stepping in; Vega fading in the doorway, then back at A1 (1 250 ms)');
  for (const [name, query, about] of [
    ['result-0760', '&stage=result&t=760', 'the people faded (80 ms) to their away markers and seated in the capsule, its door shown open (760 ms)'],
    ['result-1100', '&stage=result&t=1100', 'the door shut and the light lit: settled (1 100 ms)'],
    ['talk-30000', '&stage=talk&t=30000', 'both seated, still: no variations (0:30)'],
    ['exit-0040', '&stage=exit&t=40', 'the door shown open while the people fade back to their places (40 ms)'],
    ['exit-0400', '&stage=exit&t=400', 'the door shut, everyone at their places (400 ms)'],
  ]) capsule(`reduced-${name}`, at390, `${query}&motion=reduced`, `Reduced motion: ${about}`);
  capsule('talk-20000-patient-prisoner', at390, '&stage=talk&t=20000&pair=2,4', 'Rigel, a patient (H1), in the gown with the bandage and a hunch, and Atlas, a prisoner (J2), in the prison suit, hands together: seated (20 s)', { measure: true });
  capsule('result-2400-patient-prisoner', at390, '&stage=result&t=2400&pair=2,4', 'Rigel walking in with the approved stagger, in the gown; Atlas in the prison suit (2 400 ms)');
  capsule('talk-20000-captain-detainee', at390, '&stage=talk&t=20000&pair=7,8', 'Juno, the Captain (C1), beside her own Command Room, and Mira, detained in the Hospital (H2), in the gown, hands together (20 s)');
  capsule('result-1200-captain-detainee', at390, '&stage=result&t=1200&pair=7,8', 'Juno stepping out of the Command Room and Mira out of the Hospital, their slots kept (1 200 ms)');
  capsule('loading-0', at390, '&stage=result&t=2400&known=0', 'The projection names nobody yet: the stage\'s top bar; the capsule as when idle; nobody invented (2 400 ms)');
  capsule('loading-1', at390, '&stage=result&t=2400&known=1', 'The projection names one: Vega\'s film alone; Orion untouched at B2 (2 400 ms)');
  capsule('late', at390, '&stage=result&t=2400&late=1', 'Orion named after his part began: drawn settled, seated, while Vega still walks (2 400 ms)');
  capsule('reconnect-result-2400', at390, '&stage=result&t=2400&settled=1', 'A reconnect in the result stage: the settled state, nothing replayed (2 400 ms)');
  capsule('reconnect-exit-0800', at390, '&stage=exit&t=800&settled=1', 'A reconnect during the exit: everyone at their places, the capsule empty, nothing replayed (800 ms)');
  capsule('moved-exit-1250', at390, '&stage=exit&t=1250&moved=5:B5', 'Orion\'s latest authoritative place is B5: he steps back in there, not at B2 (1 250 ms)');
  capsule('participant-result-2400', at390, '&stage=result&t=2400&viewer=participant', 'A participant\'s screen: the stand-in for their own claim panel where the phone puts it, never under the film (2 400 ms)');
  capsule('result-2400', at320, '&stage=result&t=2400', 'The entrance on the smallest phone (2 400 ms)');
  capsule('talk-30000', at320, '&stage=talk&t=30000', 'The conversation on the smallest phone: both tags whole in the capsule, both seated participants\' targets 44 px beside C1\'s (0:30)', { measure: true });
  capsule('exit-0800', at320, '&stage=exit&t=800', 'The exit on the smallest phone (800 ms)');
  capsule('participant-result-2400', at320, '&stage=result&t=2400&viewer=participant', 'A participant\'s screen on the smallest phone: the claim panel\'s stand-in clear of the film (2 400 ms)');
  for (const roster of [7, 8]) capsule(`talk-30000-r${roster}`, at390, '&stage=talk&t=30000', `${roster} players: the capsule beside the Command Room, the conversation (0:30)`, { roster });
  shots.push({ file: 'capsule-sheet.png', group: 'capsule', viewport: [1240, 920], query: 'sheet=capsule', scale: 1, sheetHeight: 460, about: 'The capsule\'s art for review: its layers (empty, the door\'s four positions, occupied, dark), the badge, the seats\' anchors and the paths, and every pose by public status' });
  // The real controls by the owner's "controls take turns" (js/turns.mjs), with stand-ins sized from Frontend's
  // measurements (js/turns-view.mjs), on the mixed board with the capsule; Vega (1) and Orion (5) the pair.
  const turns = (name, viewport, query, about) => shots.push({ file: `turns-${vp(viewport)}-${name}.png`, group: 'turns', viewport, query: `roster=9&fixture=mixed&film=capsule${query}&hit=1`, about, turns: true });
  const talk = '&stage=talk&t=30000';
  turns('choosing', at390, `${talk}&ui=choosing&chosen=5,8`, 'A character choice open (a Code, during the conversation): the board is the chooser. Every living character ringed where it is, Vega and Orion at their slots and in the capsule; Orion and Mira chosen. The choosing row in the navigation\'s box, the Pass hidden; the top bar says what is chosen');
  turns('choosing', at320, `${talk}&ui=choosing&chosen=5&viewer=participant&tab=1`, 'A participant choosing on the smallest phone: the sheet folded to its tab at the row\'s start; every target pressable');
  turns('choosing-safe', at390, `${talk}&ui=choosing&safe=47,0,34,0`, 'With 47/34 px safe areas: the choosing row takes the navigation\'s box, its inset included');
  for (const t of [400, 2400, 3600]) turns(`result-${String(t).padStart(4, '0')}`, at390, `&stage=result&t=${t}&viewer=participant&ui=sheet&claim=result`, `A participant's private result whole in the sheet over the Hospital and the Jail while the pair walks in (${t} ms): the capsule never under it`);
  turns('result-2400', at320, '&stage=result&t=2400&viewer=participant&ui=sheet&claim=result', 'The private result through the entrance on the smallest phone (2 400 ms)');
  for (const viewport of [at390, at320]) {
    turns('talk-receipt', viewport, `${talk}&viewer=participant&ui=sheet&claim=conversation&receipt=1`, 'The conversation: the claim, and a sent command\'s recovery row with its 44 px Check again');
    turns('talk-code-confirm', viewport, `${talk}&viewer=participant&ui=sheet&claim=conversation&command=code-confirm`, 'A participant confirming a Code in the conversation: the claim folded to its row, the confirmation\'s words, Cancel and Confirm pinned either side of the Pass');
    turns('declare-offer', viewport, '&stage=declare&t=4000&viewer=participant&ui=sheet&claim=declare&command=declare-offer', 'The declaration: its claim and the offer');
    turns('declare-side-choice', viewport, '&stage=declare&t=4000&viewer=participant&ui=sheet&claim=declare&command=side-choice', 'The side choice: three stand-in choices; the claim folded where both do not fit');
  }
  turns('declare-side-confirm', at390, '&stage=declare&t=4000&viewer=participant&ui=sheet&claim=declare&command=side-confirm', 'The declaration\'s confirmation, the claim folded');
  turns('rescue-confirm', at390, '&stage=idle&ui=sheet&command=rescue-confirm', 'Another player\'s confirmation: no claim; the capsule idle');
  // Enlarged text (200%): the top bar measured once for the match at 124 px, the board laid out below it.
  turns('text2-choosing', at390, `${talk}&ui=choosing&chosen=5&viewer=participant&tab=1&text=2`, '200% text: the top bar 124 px, chosen before the board is laid out; every target still 44 px; the choosing row\'s words at 200%');
  turns('text2-result-2400', at390, '&stage=result&t=2400&viewer=participant&ui=sheet&claim=result&text=2', '200% text: the private result whole in the sheet through the entrance (2 400 ms)');
  turns('text2-code-confirm', at390, `${talk}&viewer=participant&ui=sheet&claim=conversation&command=code-confirm&text=2`, '200% text: the confirmation scrolls inside the sheet; its 64 px actions stay pinned');
  turns('text2-side-choice', [375, 667], '&stage=declare&t=4000&viewer=participant&ui=sheet&claim=declare&command=side-choice&text=2', '200% text at 375 x 667: the narrower board (fallback narrow); the side choice scrolls inside the sheet');
  turns('text2-too-short', at320, `${talk}&ui=sheet&claim=conversation&text=2`, '200% text at 320 x 568: no board fits below the 124 px top bar, so the explicit too-short page with the navigation, as the owner decided');
  turns('safe-too-short', at320, `${talk}&ui=choosing&safe=20,0,16,0`, '320 x 568 with 20/16 px safe areas: 36 px short at any text size, so the too-short page, as the owner decided');
  // The Hospital's medical films (storyboards S9, S5 and S10, js/medical-view.mjs) on the mixed board: Rigel (2) Injured
  // at H1 since round 2, Mira (8) Injured and detained at H2 since round 3, a body at H4; each outcome's film over the
  // snapshot published with it, t from the outcome's presentation start. Every slot pressed with a real pointer meanwhile.
  const medical = (name, viewport, query, about, { roster = 9, panel = false } = {}) => shots.push({ file: `medical-${vp(viewport)}-${name}.png`, group: 'medical', viewport, query: `roster=${roster}${query}&hit=1`, about, medical: true, measure: true, ...(panel ? { selector: '.v2-room[data-room=hospital]', scale: 3 } : {}) });
  medical('critical-r3', at390, '&film=critical&round=3', 'S9 in round 3: Rigel (H1), admitted in round 2, in his due round: the red lamp and an amber R3; Mira (H2, detained), admitted in round 3: the amber lamp, a cyan R4 and the detention tag; the body at H4, its equipment off and its bed light down');
  medical('critical-r3-panel', at390, '&film=critical&round=3', 'S9: the Hospital panel alone (3x): the berths\' unstable traces, the lamps, the rescue tags and the detention tag', { panel: true });
  medical('critical-r5', at390, '&film=critical&round=5', 'S9 in round 5: every patient a new round-5 injury, with no Rescue round left: a struck grey cross, no round and no deadline');
  medical('critical-r5-panel', at390, '&film=critical&round=5', 'S9 in round 5: the Hospital panel alone (3x)', { panel: true });
  medical('critical-entry-0150', at390, '&film=critical&round=3&entry=2&t=150', 'S9, an admission: Rigel\'s monitor booting, one bright line; no lamp or tag yet (150 ms after the INJURY outcome)');
  medical('critical-entry-0300', at390, '&film=critical&round=3&entry=2&t=300', 'S9, an admission: the lamp on, the tag popping in (300 ms)');
  medical('critical-r3-r7', at390, '&film=critical&round=3', 'S9, seven players: Rigel alone in the ward', { roster: 7 });
  medical('critical-r3-r8', at390, '&film=critical&round=3', 'S9, eight players: Rigel and Mira', { roster: 8 });
  medical('reduced-critical-r3', at390, '&film=critical&round=3&motion=reduced', 'S9, reduced motion: the same states, still: no sweep, no lamp pulse, no breath');
  medical('critical-r3', at320, '&film=critical&round=3', 'S9 on the smallest phone: every tag whole in the Hospital\'s panel');
  for (const viewport of VIEWPORTS) medical('critical-ward', viewport, '&film=critical&fixture=ward&round=3', `S9 with every seat Injured: a tag at every berth; the upper berths' plates are in the caption's band, so their tags go just below the caption, at ${viewport[0]} x ${viewport[1]}`);
  for (const roster of [7, 8]) medical(`critical-ward-r${roster}`, at390, '&film=critical&fixture=ward&round=3', `S9, ${roster} patients: a tag at every berth`, { roster });
  for (const [t, about] of [
    [400, 'the alert: the lamp\'s second amber blink; the vitals inset open on the unstable trace'],
    [1300, 'the drone coming down from the Hospital\'s ceiling dock, arms tucked; Rigel marked away at A2, where the snapshot has him, his name tag carried to the berth'],
    [2000, 'over the bed, its arms unfolding'],
    [2600, 'the scan line going down Rigel under the faint hologram'],
    [3300, 'the probes and the lens charging'],
    [3550, 'the revival pulse at the chest; Rigel\'s art jolting 2.5 px'],
    [4000, 'the trace steadying, the lamp calm; the client\'s words, "Player 2: Healed.", in the live region'],
    [4500, 'Rigel sitting up, Healthy, in the gown'],
    [5200, 'the drone going back up to its dock; the inset closing'],
    [5700, 'done: the snapshot, Rigel Healthy at A2; nothing the film added is left'],
  ]) medical(`rescue-${String(t).padStart(4, '0')}`, at390, `&film=rescue&t=${t}`, `S5, Rigel (H1) healed: ${about} (${t} ms)`);
  for (const [t, about] of [[40, 'the drone still over the bed and the inset fading in over 80 ms'], [900, 'switched once at 800 ms: the trace steady, the lamp calm, Rigel sitting up'], [1720, 'fading out'], [1800, 'done at 1 760 ms']]) {
    medical(`reduced-rescue-${String(t).padStart(4, '0')}`, at390, `&film=rescue&t=${t}&motion=reduced`, `S5, reduced motion: ${about} (${t} ms)`);
  }
  medical('rescue-2600', at320, '&film=rescue&t=2600', 'S5 on the smallest phone: the scan (2 600 ms)');
  medical('rescue-4500', at320, '&film=rescue&t=4500', 'S5 on the smallest phone: Rigel recovered (4 500 ms)');
  for (const [t, about] of [[2600, 'the scan over Mira at H2, the detention tag kept on the berth'], [4500, 'Mira sitting up, Healthy, in the gown, still detained'], [5700, 'done: Mira in the Jail at J1, as the snapshot has her']]) {
    medical(`rescue-detained-${String(t).padStart(4, '0')}`, at390, `&film=rescue&outcome=rescue-detained&t=${t}`, `S5, a detained patient healed: ${about} (${t} ms)`);
  }
  medical('vignette-2600', at390, '&film=rescue&outcome=vignette&t=2600', 'S5, injured and healed in one batch: Orion is in the Hospital in no snapshot; the film plays at the anchor the event names, the lowest free one, HV3 (berth H3); Orion marked away at B2 (2 600 ms)');
  medical('vignette-5700', at390, '&film=rescue&outcome=vignette&t=5700', 'Done: Orion at B2, Healthy, as the snapshot has him (5 700 ms)');
  medical('vignette-2600-r7', at390, '&film=rescue&outcome=vignette&t=2600', 'Seven players: the lowest free anchor is HV2, berth H2 (2 600 ms)', { roster: 7 });
  medical('taken-2600', at390, '&film=rescue&outcome=rescue-taken&t=2600', 'Rigel healed while Lyra, injured in the same batch, takes H1, the berth he left and his anchor\'s: no film over Lyra; the client\'s words alone (2 600 ms)');
  for (const viewport of [at390, at320]) {
    medical('ward-2600', viewport, '&film=rescue&outcome=rescue-ward&t=2600', 'Every other berth holds a living patient: the inset in the band beside the caption, over no press area (2 600 ms)');
    medical('upper-2600', viewport, '&film=rescue&outcome=rescue-upper&t=2600', 'A film at an upper berth (H8), the ward full: the drone below the caption\'s band, the inset beside the caption (2 600 ms)');
  }
  medical('rescue-2600-panel', at390, '&film=rescue&t=2600', 'S5: the scan, the Hospital panel alone (3x)', { panel: true });
  medical('rescue-3550-panel', at390, '&film=rescue&t=3550', 'S5: the pulse, the Hospital panel alone (3x)', { panel: true });
  medical('rescue-4500-panel', at390, '&film=rescue&t=4500', 'S5: recovered, the Hospital panel alone (3x)', { panel: true });
  for (const [t, about] of [
    [800, 'the inset open, the heartbeat slowing and thinning; the lamp\'s slow red pulse'],
    [2000, 'the flatline; the Hospital\'s light dipped to 0.72, never dark; the client\'s words, "Player 2: Eliminated.", in the live region'],
    [2700, 'the shutdown: the trace collapsing to a dot, the lamp and the bed light going out; Rigel still'],
    [3600, 'the light back; the inset closing'],
    [4300, 'done: the body at H1, its equipment off; nothing the film added is left'],
  ]) medical(`flatline-${String(t).padStart(4, '0')}`, at390, `&film=flatline&t=${t}`, `S10, Rigel (H1) dies: ${about} (${t} ms)`);
  medical('reduced-flatline-0040', at390, '&film=flatline&t=40&motion=reduced', 'S10, reduced motion: the flat trace and Rigel still, fading in over 80 ms (40 ms)');
  medical('reduced-flatline-0900', at390, '&film=flatline&t=900&motion=reduced', 'S10, reduced motion: switched once at 800 ms, the screen and the lamp off; no dip, no pulse (900 ms)');
  medical('flatline-2000', at320, '&film=flatline&t=2000', 'S10 on the smallest phone: the flatline (2 000 ms)');
  medical('flatline-2000-panel', at390, '&film=flatline&t=2000', 'S10: the flatline, the Hospital panel alone (3x)', { panel: true });
  medical('flatline-2700-panel', at390, '&film=flatline&t=2700', 'S10: the shutdown, the Hospital panel alone (3x)', { panel: true });
  // The Captain's films (storyboards S6 and S7, js/captain-view.mjs) on the Captain board: Lyra (3) and Atlas (4) prisoners
  // at J1 and J2, Echo's body at J5, Mira (8) Injured and detained at H2, Juno (7) the Captain at C1; with the capsule
  // beside the Command Room. Each outcome's film over the snapshot published with it, t from its presentation start.
  // Every slot pressed with a real pointer meanwhile.
  const captain = (name, viewport, query, about, { roster = 9, capsule = true, measure = true } = {}) => shots.push({ file: `captain-${vp(viewport)}-${name}.png`, group: 'captain', viewport, query: `roster=${roster}${capsule ? '&capsule=1' : ''}${query}&hit=1`, about, captain: true, measure });
  const ms = t => String(t).padStart(4, '0');
  for (const [t, about] of [
    [250, 'the console inset opens on the RELEASE plate; Juno lifts a hand over the console in the chart table'],
    [650, 'the press: the button down, a green ring; Juno\'s shoulders dip'],
    [1050, 'the green pulse down the board\'s spine, in the gutters'],
    [1500, 'the keypad and the lamp green, the lock\'s wheel turned'],
    [1950, 'the door sliding open onto the corridor'],
    [2500, 'Lyra and Atlas up and walking to the door; their new places (A2, B1) marked away'],
    [3000, 'through the door; Lyra crossing the board in the prison suit'],
    [3350, 'Atlas crossing; Lyra landing at A2 in the crew suit, the puff'],
    [3700, 'Atlas landing at B1; the door shutting'],
    [4100, 'everyone settled; the plate used; Juno back at the table'],
    [4300, 'done: the board is the snapshot'],
  ]) captain(`release-${ms(t)}`, at390, `&film=release&t=${t}`, `S6, Lyra and Atlas released: ${about} (${t} ms)`);
  for (const [t, about] of [[40, 'the console fading in'], [300, 'the console, RELEASE pressed'], [700, 'the door open'], [1250, 'Lyra and Atlas at their new places'], [1800, 'the door shut'], [2300, 'done']]) {
    captain(`reduced-release-${ms(t)}`, at390, `&film=release&t=${t}&motion=reduced`, `S6, reduced motion: ${about} (${t} ms)`);
  }
  captain('release-0650', at320, '&film=release&t=650', 'S6 on the smallest phone: the console inset at half size, right of Juno, below the captions (650 ms)');
  captain('release-3000', at320, '&film=release&t=3000', 'S6 on the smallest phone: through the door and across (3 000 ms)');
  for (const viewport of [[360, 740], [430, 932]]) captain('release-0650', viewport, '&film=release&t=650', 'S6: the console inset (650 ms)');
  captain('nocapsule-release-0650', at390, '&film=release&t=650', 'S6 on a board without the capsule: the inset right of Juno in the Command Room (650 ms)', { capsule: false });
  captain('nocapsule-release-3000', at390, '&film=release&t=3000', 'S6 without the capsule: across the board (3 000 ms)', { capsule: false });
  for (const [t, about] of [[2700, 'five prisoners up, 80 ms apart in slot order'], [3300, 'through the door one after another, the first crossing'], [3700, 'landing in Room A and Room B, the door shutting']]) {
    captain(`release-full-${ms(t)}`, at390, `&film=release&outcome=release-full&t=${t}`, `S6, a full Jail released (synthetic places): ${about} (${t} ms)`);
  }
  captain('release-full-3500', at320, '&film=release&outcome=release-full&t=3500', 'S6, a full Jail released, on the smallest phone (3 500 ms)');
  captain('release-3000-r7', at390, '&film=release&t=3000', 'S6, seven players (no detainee, no body) (3 000 ms)', { roster: 7 });
  for (const [t, about] of [
    [300, 'a short push on Juno; the EJECT plate, its cover lifting'],
    [650, 'the press under the open cover: a hard click, a red burst'],
    [1200, 'the emergency light in the Command Room and the Jail; the red pulse down the spine'],
    [1900, 'lockdown: the door locked, the keypad striped; the hatch revealed in the wall; Lyra and Atlas brace'],
    [2600, 'the clamps released'],
    [3000, 'the iris opening onto space; the suction building'],
    [3500, 'Lyra pulled out as a silhouette, Atlas leaning; Echo\'s body rising as a grey cut-out; EJECTED'],
    [3900, 'Atlas into the hatch; papers and a cup'],
    [4900, 'the exterior: the hull, the open hatch, Lyra and Atlas drifting away, small'],
    [6000, 'the iris shutting'],
    [6500, 'the final panel: EJECT used under its shut cover; the memorial plaque'],
    [7000, 'the light settling, the hatch gone'],
    [7300, 'done: the Jail empty, the plaque beside its caption'],
  ]) captain(`eject-${ms(t)}`, at390, `&film=eject&t=${t}`, `S7, Lyra and Atlas ejected and Echo's body cleared: ${about} (${t} ms)`);
  for (const [t, about] of [[40, 'the console fading in'], [300, 'the console, EJECT pressed, its cover open'], [800, 'the hatch open and EJECTED'], [1400, 'the empty Jail'], [2000, 'the memorial plaque'], [2600, 'done']]) {
    captain(`reduced-eject-${ms(t)}`, at390, `&film=eject&t=${t}&motion=reduced`, `S7, reduced motion: ${about} (${t} ms)`);
  }
  captain('eject-0650', at320, '&film=eject&t=650', 'S7 on the smallest phone: the press (650 ms)');
  captain('eject-full-3600', at320, '&film=eject&outcome=eject-full&t=3600', 'S7, a full Jail ejected, on the smallest phone (3 600 ms)');
  captain('eject-full-4900', at320, '&film=eject&outcome=eject-full&t=4900', 'S7, a full Jail: the exterior, five drifting (4 900 ms)');
  captain('nocapsule-eject-0650', at390, '&film=eject&t=650', 'S7 on a board without the capsule (650 ms)', { capsule: false });
  for (const t of [3600, 4000]) captain(`eject-full-${ms(t)}`, at390, `&film=eject&outcome=eject-full&t=${t}`, `S7, a full Jail ejected, 100 ms apart in slot order (${t} ms)`);
  captain('eject-3500-r8', at390, '&film=eject&t=3500', 'S7, eight players: no body in the Jail (3 500 ms)', { roster: 8 });
  // After the EJECT, a Code choice that offers the characters off the board: their cards in the sheet the choosing row's
  // tab opens over the Hospital and the Jail (synthetic offer: every seat, as a Code may name any).
  const offboard = '&film=eject&t=7300&ui=choosing&offboard=1&offered=1,2,3,4,5,6,7,8,9&chosen=4';
  // The sheet covers the Hospital's and the Jail's targets by design while it shows (turns.mjs): no board pointer probe here.
  captain('offboard-choosing', at390, offboard, 'After the EJECT, a Code choice offering every seat: Lyra, Atlas and Echo off the board, a card each in the sheet the tab opened, ringed; Atlas chosen', { measure: false });
  captain('offboard-choosing', at320, offboard, 'The same on the smallest phone: three cards in one row', { measure: false });
  captain('offboard-full-choosing', at320, '&film=eject&outcome=eject-full&t=7300&ui=choosing&offboard=1&offered=1,2,3,4,5,6,7,8,9&chosen=2,6', 'A full Jail ejected: five cards in one row at 320 px, two chosen', { measure: false });
  captain('offboard-choosing-text2', at390, `${offboard}&text=2`, '200% text: the top bar 124 px; the cards in the sheet as before', { measure: false });
  shots.push({ file: 'captain-sheet.png', group: 'captain', viewport: [1240, 1260], query: 'sheet=captain', scale: 1, sheetHeight: 630, about: 'The Captain\'s art for review: S8\'s plates in every state at a phone\'s size and the cover\'s frames; the console inset at its moments; the Jail\'s door, the airlock, the suction and the debris over the Jail; the exterior; the plaque and the history\'s grey cut-outs; the poses' });
  // The successor's four-berth Hospital (the owner's four-bed decision of 18 October 2026, #155; &beds=4): the current board
  // panel for panel, its Hospital the four-berth ward. The same measurements, with fit-four.mjs's expectations.
  const four = (name, viewport, query, about, flags = {}) => shots.push({ file: `four-${vp(viewport)}-${name}.png`, group: 'four', viewport, query: `roster=${flags.roster ?? 9}&beds=4${query}`, about, ...flags });
  for (const viewport of VIEWPORTS) {
    four('ward', viewport, '&fixture=ward&hit=1', `Four beds: four patients, the ward full; the current board's rooms and press areas everywhere else, at ${vp(viewport)}`, { measure: true });
    four('mixed', viewport, '&fixture=mixed&hit=1', `Four beds on a third-round board: Rigel at H1, Mira detained at H2, a body at H4, at ${vp(viewport)}`, { measure: true });
  }
  four('mixed-capsule', at390, '&fixture=mixed&capsule=1&hit=1', 'Four beds with the capsule beside the Command Room', { measure: true });
  for (const viewport of [at390, at320]) four('slots', viewport, '&fixture=empty&markers=1&press=1&ids=1', 'Every slot: the Hospital\'s four, H1 to H4, their press areas and position numbers, nobody there', { measure: true });
  four('stress', at390, '&fixture=stress&markers=1&press=1', 'Every slot taken (layout only): four patients in the ward', { measure: true });
  for (const roster of [7, 8]) four(`ward-r${roster}`, at390, '&fixture=ward&hit=1', `Four beds for ${roster} players: the same four berths`, { measure: true, roster });
  for (const viewport of [at390, at320]) four('hospital', viewport, '&fixture=ward', 'The four-berth ward alone (3x): larger berths in two rows of two, none under the caption', { selector: '.v2-room[data-room=hospital]', scale: 3 });
  shots.push({ file: 'four-scene-hospital.png', group: 'four', viewport: [1024, 768], query: 'scene=hospital&roster=9&beds=4&fixture=ward', scale: 1, sheetHeight: 300, about: 'The whole four-berth ward scene: the approved back wall whole (its monitor, medicine cabinet and window), the back row at its foot, the front row cut by the panel' });
  // The Blackout's dark on the four-berth board: the ward's dark art, and a Disabler bound to the Hospital choosing among its four positions.
  four('blackout-8000-dark', at390, '&fixture=mixed&film=blackout&t=8000', 'The Blackout\'s dark on the four-berth board: the ward\'s own dark art, its four positions\' markers', { film: { t: 8000 } });
  four('blackout-8000-disabler-hospital', at390, '&fixture=mixed&film=blackout&t=8000&viewer=disabler&bound=hospital&step=choose', 'A Disabler bound to the Hospital: its four positions live in the dark, H1 to H4', { film: { t: 8000 } });
  four('blackout-16300-settled', at390, '&fixture=mixed&film=blackout&t=16300', 'Lights back after a hit at B2: Orion admitted at H3, the free bed', { film: { t: 16300 } });
  // #158's medical films on the four berths, the films unchanged (fx/medical-four.mjs).
  const fourMedical = (name, viewport, query, about, flags = {}) => four(name, viewport, `${query}&hit=1`, about, { medical: true, measure: true, ...flags });
  fourMedical('critical-r3', at390, '&film=critical&round=3', 'S9 on four berths: Rigel (H1) in his due round, Mira (H2) detained, the body at H4');
  fourMedical('critical-r3', at320, '&film=critical&round=3', 'S9 on four berths, the smallest phone: every tag whole in the panel');
  for (const [t, about] of [[1300, 'the drone coming down from the ceiling dock'], [2600, 'the scan over Rigel at H1'], [3550, 'the revival pulse'], [4500, 'Rigel sitting up, Healthy']]) fourMedical(`rescue-${ms(t)}`, at390, `&film=rescue&t=${t}`, `S5 on four berths: ${about} (${t} ms)`);
  fourMedical('rescue-2600', at320, '&film=rescue&t=2600', 'S5 on four berths, the smallest phone (2 600 ms)');
  fourMedical('reduced-rescue-0900', at390, '&film=rescue&t=900&motion=reduced', 'S5 on four berths, reduced motion: switched once (900 ms)');
  fourMedical('rescue-detained-2600', at390, '&film=rescue&outcome=rescue-detained&t=2600', 'S5 on four berths: Mira, detained, at H2 (2 600 ms)');
  fourMedical('vignette-2600', at390, '&film=rescue&outcome=vignette&t=2600', 'S5 on four berths, injured and healed in one batch: the anchor HV3 names bed H3, the free one (synthetic anchor, the Designer\'s proposal on #155) (2 600 ms)');
  fourMedical('taken-2600', at390, '&film=rescue&outcome=rescue-taken&t=2600', 'Rigel healed while Lyra takes H1 in the same batch: no film over Lyra, the words alone (2 600 ms)');
  for (const [t, about] of [[2000, 'the flatline, the light dipped to 0.72'], [2700, 'the shutdown']]) fourMedical(`flatline-${ms(t)}`, at390, `&film=flatline&t=${t}`, `S10 on four berths: ${about} (${t} ms)`);
  fourMedical('rescue-2600-panel', at390, '&film=rescue&t=2600', 'S5 on four berths: the scan, the Hospital panel alone (3x)', { selector: '.v2-room[data-room=hospital]', scale: 3 });
  // The controls take turns on the four-berth board: the same choosing row and sheet, the Hospital's four targets.
  const fourTurns = (name, viewport, query, about) => four(name, viewport, `&fixture=mixed&film=capsule${query}&hit=1`, about, { turns: true });
  fourTurns('turns-choosing', at390, '&stage=talk&t=30000&ui=choosing&chosen=5,8', 'A character choice on the four-berth board: every target ringed, the Hospital\'s at its four berths');
  fourTurns('turns-choosing', at320, '&stage=talk&t=30000&ui=choosing&chosen=5&viewer=participant&tab=1', 'The same on the smallest phone');
  fourTurns('turns-result-2400', at390, '&stage=result&t=2400&viewer=participant&ui=sheet&claim=result', 'The private result whole in the sheet over the Hospital and the Jail: the same sheet as the current board\'s');
  fourTurns('turns-talk-code-confirm', at320, '&stage=talk&t=30000&viewer=participant&ui=sheet&claim=conversation&command=code-confirm', 'A Code confirmation on the smallest phone: the same sheet');
  // The Captain's films on the four-berth board: the plaque in the spine between the Hospital and the Jail.
  const fourCaptain = (name, viewport, query, about, flags = {}) => four(name, viewport, `&capsule=1${query}&hit=1`, about, { captain: true, measure: true, ...flags });
  fourCaptain('release-3000', at390, '&film=release&t=3000', 'S6 on the four-berth board: Mira stays in her berth (3 000 ms)');
  fourCaptain('eject-3500', at390, '&film=eject&t=3500', 'S7 on the four-berth board (3 500 ms)');
  fourCaptain('eject-7300', at390, '&film=eject&t=7300', 'S7 done: the plaque in the spine between the Hospital and the Jail, counting the three off the board');
  fourCaptain('offboard-choosing', at390, '&film=eject&t=7300&ui=choosing&offboard=1&offered=1,2,3,4,5,6,7,8,9&chosen=4', 'After the EJECT, the off-board cards in the same sheet', { measure: false });
  // The overflow victim's beat (films/overflow.mjs): the four beds full, Orion at B2 struck and off the board (synthetic, labelled).
  const overflow = (name, viewport, t, about, extra = '') => four(`overflow-${name}`, viewport, `&film=overflow&t=${t}${extra}&hit=1`, about, { overflow: true, measure: true });
  for (const [t, about] of [[150, 'the Hospital\'s FULL stamp appearing; Orion at B2'], [700, 'Orion turning into the grey cut-out at his place'], [1600, 'the cut-out leaving the board on its arc to the spine; the client\'s words'], [2350, 'the plaque taking it: its count 1'], [2900, 'done: Orion nowhere on the board, the plaque in the spine']]) overflow(ms(t), at390, t, `The overflow beat: ${about} (${t} ms)`);
  for (const t of [1600, 2900]) overflow(ms(t), at320, t, `The overflow beat on the smallest phone (${t} ms)`);
  for (const [t, about] of [[40, 'the cut-out at its place with FULL, fading in'], [900, 'the place empty, the plaque counting it'], [1600, 'done']]) overflow(`reduced-${ms(t)}`, at390, t, `The overflow beat, reduced motion: ${about} (${t} ms)`, '&motion=reduced');
  // The Clone, privately (storyboard S3): the card in the Alien's own sheet at every beat of its two films, in both motion
  // modes, at the phones and the enlarged text, at rest after a Jail vote and in Round 5; nothing on anyone else's screen.
  const clone = (name, viewport, query, about, flags = {}) => shots.push({ file: `clone-${vp(viewport)}-${name}.png`, group: 'clone', viewport, query: `roster=${flags.roster ?? 9}&film=clone&capsule=1${query}&hit=1`, about, clone: true, ...flags });
  for (const [t, about] of [[200, 'the scan lines sweeping up Lyra'], [650, 'a halftone duplicate forming beside her'], [1100, 'the duplicate resolving into the same drawing'], [1550, 'the real Lyra fading to a dotted outline as the lines sweep back down'], [1720, 'CLONE ACTIVE stamped'], [1900, 'at rest: the dotted outline, the duplicate, CLONE ACTIVE and the status line']]) clone(`activate-${ms(t)}`, at390, `&case=activate&t=${t}`, `S3, the activation, on the Alien's own phone alone (synthetic: seat 3, Lyra): ${about} (${t} ms). The board is everyone's, unchanged`);
  for (const [t, about] of [[150, 'the scan lines sweeping down the duplicate; CLONE ACTIVE fading'], [450, 'the duplicate breaking up into its halftone'], [750, 'the outline filling back into Lyra; CLONE ENDED'], [950, 'at rest: Lyra alone, CLONE ENDED and the status line']]) clone(`expire-${ms(t)}`, at390, `&case=expire&t=${t}`, `S3, the expiry: ${about} (${t} ms)`);
  for (const kind of ['activate', 'expire']) for (const [t, about] of [[200, 'the card before, held'], [440, 'the 80 ms cross-fade'], [600, 'the card after']]) clone(`reduced-${kind}-${ms(t)}`, at390, `&case=${kind}&t=${t}&motion=reduced`, `S3, the ${kind === 'activate' ? 'activation' : 'expiry'} with reduced motion: ${about} (${t} ms)`);
  clone('activate-1100', at320, '&case=activate&t=1100', 'The activation on the smallest phone (1 100 ms)');
  clone('activate-1900', at320, '&case=activate&t=1900', 'The active card on the smallest phone');
  clone('expire-0450', at320, '&case=expire&t=450', 'The expiry on the smallest phone (450 ms)');
  for (const viewport of [at320, at390]) clone('jailed', viewport, '&case=jailed&state=active', 'After a Jail vote: the Clone still active through Round 3, its card at rest, Lyra in the prison suit');
  clone('r5', at390, '&case=r5&state=active', 'Activated in Round 5: active through Round 5, its card at rest');
  for (const roster of [7, 8]) clone(`activate-1900-r${roster}`, at390, '&case=activate&t=1900', `The active card for ${roster} players`, { roster });
  clone('four-activate-1900', at390, '&beds=4&case=activate&t=1900', 'On the successor\'s four-berth board: the same card in the same sheet');
  clone('text2-active', [360, 740], '&case=activate&state=active&text=2', '200% text: the card taller, whole in the sheet and clear of the raised Pass');
  clone('text2-ended', [375, 667], '&case=expire&state=ended&text=2', '200% text, the ended card: the status line on three lines');
  clone('text2-activate-1100', at390, '&case=activate&t=1100&text=2', '200% text during the activation (1 100 ms)');
  for (const viewer of ['player', 'display']) clone(`${viewer}-1100`, at390, `&case=activate&t=1100&viewer=${viewer}`, `The same moment on ${viewer === 'player' ? 'another player\'s phone' : 'the display'}: the board alone, nothing of the Clone`);
  shots.push({ file: 'clone-sheet.png', group: 'clone', viewport: [1240, 760], query: 'sheet=clone', scale: 1, sheetHeight: 380, about: 'The Clone\'s art for review: each character, its halftone duplicate forming and formed, and its dotted outline; the clothes of its place; the scan band, the stage and the tray\'s mark' });
  return shots;
}

/** Reads the drawn board back: each room's press areas and position numbers, and whether the page scrolls. */
const MEASURE = `(() => {
  const rooms = {};
  for (const room of document.querySelectorAll('.v2-room[data-room]')) {
    const box = room.getBoundingClientRect();
    const inner = { left: box.left + room.clientLeft, top: box.top + room.clientTop, width: room.clientWidth, height: room.clientHeight };
    const rect = node => { const b = node.getBoundingClientRect(); return { left: b.left - inner.left, top: b.top - inner.top, width: b.width, height: b.height }; };
    rooms[room.dataset.room] = { panel: inner, press: [...room.querySelectorAll('.v2-press')].map(rect), markers: [...room.querySelectorAll('.v2-marker')].map(rect) };
  }
  const nav = document.querySelector('.v2-nav')?.getBoundingClientRect();
  const board = document.querySelector('.v2-board')?.getBoundingClientRect();
  const pass = document.querySelector('.v2-pass')?.getBoundingClientRect();
  const lowest = Math.max(...[...document.querySelectorAll('.v2-room')].map(node => node.getBoundingClientRect().bottom));
  // A real pointer at each slot's press area: its centre and its four corners 3 px inside.
  const pointer = [...document.querySelectorAll('.v2-slot-hit')].map(button => {
    const b = button.getBoundingClientRect();
    const points = [[b.left + b.width / 2, b.top + b.height / 2], [b.left + 3, b.top + 3], [b.right - 3, b.top + 3], [b.left + 3, b.bottom - 3], [b.right - 3, b.bottom - 3]];
    const missed = points.flatMap(([x, y]) => {
      const hit = document.elementFromPoint(x, y);
      return hit && hit.closest('.v2-slot-hit') === button ? [] : [{ x: Math.round(x), y: Math.round(y), hit: hit ? String(hit.className || hit.tagName) : 'nothing' }];
    });
    return { slot: button.dataset.slot, side: Math.min(b.width, b.height), missed };
  });
  return { rooms, pointer, unfit: Boolean(document.querySelector('.v2-unfit')), scrolls: document.documentElement.scrollHeight > innerHeight + 1, navTop: nav?.top ?? null, boardBottom: board?.bottom ?? null, lowest, shell: document.documentElement.dataset.shell ?? null, fallback: document.documentElement.dataset.fallback ?? null, pass: pass ? { left: pass.left, top: pass.top, width: pass.width, height: pass.height } : null };
})()`;

/** Reads a film frame back: its stage, every marker, press area and seat, the board's place, the top bar and its line, and any name on the page. */
const MEASURE_FILM = `(() => {
  const rooms = {};
  const box = node => { const b = node.getBoundingClientRect(); return { left: b.left, top: b.top, width: b.width, height: b.height }; };
  for (const room of document.querySelectorAll('.v2-room[data-room]')) {
    const b = room.getBoundingClientRect();
    const inner = { left: b.left + room.clientLeft, top: b.top + room.clientTop };
    const rect = node => { const r = node.getBoundingClientRect(); return { left: r.left - inner.left, top: r.top - inner.top, width: r.width, height: r.height }; };
    rooms[room.dataset.room] = {
      box: box(room),
      markers: [...room.querySelectorAll('.v2-marker')].filter(node => !node.hidden).map(node => ({ ...rect(node), style: node.dataset.style, label: node.getAttribute('aria-label') })),
      hits: [...room.querySelectorAll('.v2-hit')].map(rect),
      people: room.querySelectorAll('.v2-fig, .v2-tag').length,
      tags: [...room.querySelectorAll('.v2-tag[data-seat]')].map(node => ({ seat: Number(node.dataset.seat), x: rect(node).left + rect(node).width / 2 })),
      figures: [...room.querySelectorAll('.v2-fig[data-seat]')].map(node => Number(node.dataset.seat)),
      spark: room.querySelector('.v2-spark') ? rect(room.querySelector('.v2-spark')) : null,
      caption: room.querySelector('.v2-cap') ? rect(room.querySelector('.v2-cap')) : null,
      panel: { width: room.clientWidth, height: room.clientHeight },
    };
  }
  const top = document.querySelector('.v2-top');
  const line = document.querySelector('.v2-top__line');
  const app = document.getElementById('v2-app');
  const labels = [...app.querySelectorAll('[aria-label]')].map(node => node.getAttribute('aria-label')).join(' ');
  return {
    stage: document.documentElement.dataset.stage, rooms,
    board: box(document.querySelector('.v2-board')),
    top: { ...box(top), overflows: top.scrollHeight > top.clientHeight + 0.5 },
    line: line && !line.hidden ? { ...box(line), text: line.textContent, cut: line.scrollWidth > line.clientWidth + 0.5 } : null,
    text: app.textContent + ' ' + labels, scrolls: document.documentElement.scrollHeight > innerHeight + 1,
  };
})()`;

/** Reads ATTACK BLOCKED back: each room's film nodes, labels (layout boxes), caption and braced figures, and the live region. */
const MEASURE_BLOCKED = `(() => {
  const rooms = {};
  for (const room of document.querySelectorAll('.v2-room[data-room]')) {
    const box = node => ({ left: node.offsetLeft, top: node.offsetTop, width: node.offsetWidth, height: node.offsetHeight });
    const caption = room.querySelector('.v2-cap');
    rooms[room.dataset.room] = {
      parts: [...room.querySelectorAll('.v2-block')].map(node => [...node.classList].find(name => name.startsWith('v2-block__')).slice('v2-block__'.length)).sort(),
      labels: [...room.querySelectorAll('.v2-block__label')].map(node => ({ ...box(node), place: node.dataset.place, stacked: node.classList.contains('v2-block__label--stack') })),
      caption: caption ? box(caption) : null,
      panel: { width: room.clientWidth, height: room.clientHeight },
      braced: [...room.querySelectorAll('.v2-fig')].filter(node => node.style.translate).map(node => ({ seat: Number(node.dataset.seat), translate: node.style.translate })),
      // Who is drawn here, as the figure's own ids say it (s<seat><slot><health initial>), and whether in the gown.
      figures: [...room.querySelectorAll('.v2-fig[data-seat]')].map(node => ({ seat: Number(node.dataset.seat), id: node.querySelector('[id]')?.id ?? '', gown: node.innerHTML.includes('-print)') })),
      tags: [...room.querySelectorAll('.v2-tag[data-seat]')].map(node => Number(node.dataset.seat)),
    };
  }
  return { stage: document.documentElement.dataset.stage, film: document.documentElement.dataset.film, rooms, live: document.querySelector('[data-live=room]')?.textContent ?? null, scrolls: document.documentElement.scrollHeight > innerHeight + 1 };
})()`;

/** A label's layout box: inside its panel by the margin, and off its room's caption. */
function labelProblems(where, label, room) {
  const problems = [];
  const m = LABEL_MARGIN - 0.5;
  if (label.left < m || label.top < m || label.left + label.width > room.panel.width - m || label.top + label.height > room.panel.height - m) problems.push(`${where}: the label leaves its panel`);
  const c = room.caption;
  if (c && label.left < c.left + c.width && c.left < label.left + label.width && label.top < c.top + c.height && c.top < label.top + label.height) problems.push(`${where}: the label is over the caption`);
  return problems;
}

/** What ATTACK BLOCKED should draw on a shot's screen, from its query alone. */
function blockedExpected(shot) {
  const query = new URLSearchParams(shot.query);
  const roster = Number(query.get('roster') ?? 9);
  const seats = fixtureSeats(query.get('fixture') ?? 'ward', roster);
  const reduced = query.get('motion') === 'reduced';
  const viewer = query.get('viewer') ?? (query.get('film') === 'blackout' ? 'observer' : 'occupant');
  const blackout = query.get('film') === 'blackout';
  const targets = blackout ? BLACKOUT_OUTCOMES[query.get('outcome') ?? 'hit'].blocks.map(id => seats.find(entry => entry.slot === id)) : blockedTargets(query, seats);
  const blocks = targets.filter(seat => {
    if (blackout) return viewer !== 'display' && seat.room === query.get('in');
    return viewer === 'occupant' || viewer === 'art';
  });
  const t = blackout ? shot.blocked.t - blockedStartInBlackout(Number(query.get('r') ?? 15400), { reduced }) : shot.blocked.t;
  return { blocks, targets, frame: blockedFrame(t, { reduced }), blackout };
}

function problemsOfBlocked(shot, measured) {
  const problems = [];
  const { blocks, targets, frame, blackout } = blockedExpected(shot);
  // Every target, on every screen and at every moment, is the fixture's: in its room, at its slot, in its health, a patient in the gown.
  for (const seat of targets) {
    for (const [room, drawn] of Object.entries(measured.rooms)) {
      const figures = drawn.figures.filter(figure => figure.seat === seat.seat);
      if (room !== seat.room && (figures.length || drawn.tags.includes(seat.seat))) problems.push(`target seat ${seat.seat} drawn in ${room}; the fixture has it in ${seat.room}`);
      if (room !== seat.room) continue;
      if (!figures.length || !drawn.tags.includes(seat.seat)) problems.push(`target seat ${seat.seat} is not drawn in ${room}`);
      for (const figure of figures) {
        const [, slot, health] = /^s\d+([A-Z]\d+)([HIE])/.exec(figure.id) ?? [];
        if (slot !== seat.slot || health !== seat.health[0]) problems.push(`target seat ${seat.seat} drawn as ${figure.id}; the fixture has ${seat.slot}, ${seat.health}`);
        if (seat.room === 'hospital' && !figure.gown) problems.push(`target seat ${seat.seat} is not in the gown`);
      }
    }
  }
  if (measured.scrolls) problems.push('the page scrolls');
  if (!blackout && measured.stage !== (blocks.length ? frame.stage : 'none')) problems.push(`the page is at ${measured.stage}; the film says ${blocks.length ? frame.stage : 'none'}`);
  // Each part on the page exactly while the film draws it, on the recipients' screens alone; nothing after the end.
  const parts = [frame.star.on && 'star', frame.shield.frame && 'shield', frame.ring.opacity > 0 && 'ring', frame.particles.frame && 'particles', frame.label.opacity > 0 && 'label'].filter(Boolean);
  for (const [room, drawn] of Object.entries(measured.rooms)) {
    const here = blocks.filter(seat => seat.room === room);
    const want = here.flatMap(() => parts).sort();
    if (drawn.parts.join() !== want.join()) problems.push(`${room}: the film draws ${drawn.parts.join(', ') || 'nothing'}; it should draw ${want.join(', ') || 'nothing'}`);
    drawn.labels.forEach((label, i) => problems.push(...labelProblems(`${room} label ${i + 1}`, label, drawn)));
    // The brace: the targets' figures alone, by the film's offset; never anyone else.
    const braces = frame.brace[0] !== 0 || frame.brace[1] !== 0;
    for (const figure of drawn.braced) {
      const [dx, dy] = figure.translate.split(' ').map(parseFloat);
      if (!here.some(seat => seat.seat === figure.seat)) problems.push(`${room}: seat ${figure.seat} moved, who was not attacked`);
      else if (!braces || Math.abs(dx - frame.brace[0]) > 0.005 || Math.abs((dy || 0) - frame.brace[1]) > 0.005) problems.push(`${room}: seat ${figure.seat} braced by ${figure.translate}; the film says ${braces ? frame.brace.join(', ') : 'nothing'}`);
    }
    if (braces && here.length && !drawn.braced.length) problems.push(`${room}: the target does not brace`);
  }
  // The words: in the live region while a label is up, naming the character alone; the region on every screen, empty elsewhere.
  const words = frame.announce ? blocks.map(seat => `Attack blocked on ${CREW[seat.character].sign}.`).join(' ') : '';
  if (measured.live === null) problems.push('no live region for room facts');
  else if (measured.live !== words) problems.push(`the live region says "${measured.live}"; it should say "${words}"`);
  return problems;
}

/** Reads the capsule back: every room's box and caption, the capsule's door, light, people and tags, each place's own figures, film figures and badges, the bars, the stand-in and the page's words. */
const MEASURE_CAPSULE = `(() => {
  const box = node => { const b = node.getBoundingClientRect(); return { left: b.left, top: b.top, width: b.width, height: b.height, right: b.right, bottom: b.bottom }; };
  const rooms = {};
  const captions = [];
  const homes = {};
  for (const room of document.querySelectorAll('.v2-room[data-room]')) {
    rooms[room.dataset.room] = box(room);
    const caption = room.querySelector('.v2-cap');
    if (caption) captions.push({ room: room.dataset.room, right: caption.offsetLeft + caption.offsetWidth, bottom: caption.offsetTop + caption.offsetHeight, panelWidth: room.clientWidth, panelHeight: room.clientHeight, cut: caption.scrollWidth > caption.clientWidth + 0.5 });
    if (room.classList.contains('v2-capsule')) continue;
    homes[room.dataset.room] = {
      tags: [...room.querySelectorAll('.v2-tag[data-seat]')].map(node => Number(node.dataset.seat)),
      own: [...room.querySelectorAll('.v2-fig[data-seat]:not(.v2-fig--film)')].map(node => ({ seat: Number(node.dataset.seat), away: node.classList.contains('v2-fig--away'), pair: node.classList.contains('v2-fig--pair'), opacity: node.style.opacity, hidden: node.style.visibility === 'hidden' })),
      moving: [...room.querySelectorAll('.v2-fig--film[data-home]')].map(node => ({ seat: Number(node.dataset.seat), state: node.dataset.home, outfit: node.dataset.outfit })),
      badges: [...room.querySelectorAll('.v2-capsule-badge')].map(node => Number(node.dataset.seat)),
    };
  }
  const capsule = document.querySelector('.v2-capsule');
  const inner = capsule ? (() => { const b = capsule.getBoundingClientRect(); return { left: b.left + capsule.clientLeft, top: b.top + capsule.clientTop, right: b.left + capsule.clientLeft + capsule.clientWidth, bottom: b.top + capsule.clientTop + capsule.clientHeight }; })() : null;
  const standin = document.querySelector('.v2-private-standin');
  const app = document.getElementById('v2-app');
  const labels = [...app.querySelectorAll('[aria-label]')].map(node => node.getAttribute('aria-label')).join(' ');
  return {
    stage: document.documentElement.dataset.stage ?? null,
    scrolls: document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1,
    rooms, captions, homes,
    capsule: capsule ? {
      inner, state: capsule.dataset.state ?? null, label: capsule.getAttribute('aria-label'),
      caption: box(capsule.querySelector('.v2-cap')),
      door: capsule.querySelector('[data-layer^="door-"]')?.dataset.layer ?? null,
      busy: Boolean(capsule.querySelector('[data-layer="busy"]')),
      figures: [...capsule.querySelectorAll('.v2-fig[data-capsule]')].map(node => ({ id: node.dataset.capsule, seat: Number(node.dataset.seat), state: node.dataset.state, outfit: node.dataset.outfit })),
      tags: [...capsule.querySelectorAll('.v2-tag')].map(node => ({ seat: Number(node.dataset.seat), ...box(node) })),
      targets: [...capsule.querySelectorAll('[data-capsule-target]')].map(node => ({ id: node.dataset.capsuleTarget, seat: Number(node.dataset.seat), ...box(node) })),
      press: capsule.querySelectorAll('button:not([data-capsule-target]), a, input, [tabindex]:not([data-capsule-target]), .v2-press, .v2-hit, .v2-slot-hit:not([data-capsule-target])').length,
    } : null,
    top: box(document.querySelector('.v2-top')),
    nav: box(document.querySelector('.v2-nav')),
    phase: document.querySelector('.v2-top__phase')?.textContent ?? null,
    timer: document.querySelector('.v2-top__timer')?.textContent ?? null,
    standin: standin && !standin.hidden ? box(standin) : null,
    standinDrawn: Boolean(standin),
    text: app.textContent + ' ' + labels,
  };
})()`;

const overlap = (a, b) => a.left < b.right - 0.1 && b.left < a.right - 0.1 && a.top < b.bottom - 0.1 && b.top < a.bottom - 0.1;
const LETTER_ROOM = { A: 'room-a', B: 'room-b', C: 'command-room', H: 'hospital', J: 'jail' };
const clock = ms => { const sec = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; };

/** What the capsule should draw on a shot's screen, from its query alone: the board's seats, the pair the projection names and the film's frame. */
function capsuleExpected(shot) {
  const query = new URLSearchParams(shot.query);
  const roster = Number(query.get('roster') ?? 9);
  const seats = fixtureSeats(query.get('fixture') ?? 'ward', roster).map(seat => ({ ...seat }));
  const moved = query.get('moved');
  if (moved) { const [seat, slot] = moved.split(':'); Object.assign(seats.find(entry => entry.seat === Number(seat)), { room: LETTER_ROOM[slot[0]], slot }); }
  const ids = CAPSULE_SEATS.map(seat => seat.id);
  const named = (query.get('pair') ?? '1,5').split(',').map(Number).sort((a, b) => a - b).slice(0, Math.min(2, Math.max(0, Number(query.get('known') ?? 2))));
  const known = Object.fromEntries(named.map((seat, index) => [ids[index], query.get('settled') === '1' || (query.get('late') === '1' && index === 1) ? 'settled' : 'live']));
  const stage = query.get('stage') ?? 'result';
  const t = Number(query.get('t') ?? 2300);
  return { roster, seats, ids, named, stage, t, viewer: query.get('viewer') ?? 'player', frame: capsuleFrame(stage, t, { known, reduced: query.get('motion') === 'reduced' }) };
}

function problemsOfCapsule(shot, measured) {
  const problems = [];
  const { roster, seats, ids, named, stage, t, viewer, frame } = capsuleExpected(shot);
  const [width, height] = shot.viewport;
  const board = fitBoardV2({ width, height }, roster, { capsule: true });
  if (measured.scrolls) problems.push('the page scrolls');
  if (measured.stage !== stage) problems.push(`the page is at ${measured.stage}; the shot asks for ${stage}`);
  // Every room and the capsule where fit.mjs puts them, whatever the stage: nothing shifts or grows when a conversation begins or ends.
  for (const room of [...BOARD_ROOMS, CAPSULE.id]) {
    const drawn = measured.rooms[room], want = board.boxes[room];
    if (!drawn || ['left', 'top', 'width', 'height'].some(key => Math.abs(drawn[key] - want[key]) > 0.6)) problems.push(`${room}: not at fit.mjs's box`);
  }
  if (Math.abs(board.panels['command-room'].width - 2 * board.panels[CAPSULE.id].width) > 1) problems.push(`the Command Room's panel is ${board.panels['command-room'].width} px and the capsule's ${board.panels[CAPSULE.id].width}: not 2:1`);
  // The bars keep their boxes; the top bar says the stage and the server's countdown, nothing else.
  if (Math.abs(measured.top.top) > 0.6 || Math.abs(measured.top.height - board.shell.top) > 0.6 || Math.abs(measured.top.width - width) > 0.6) problems.push('the top bar is not its shell\'s');
  if (Math.abs(measured.nav.top - board.navTop) > 0.6) problems.push('the navigation is not where fit.mjs puts it');
  const timer = { declare: clock(CAPSULE_FILM.server.declareMaxMs - t), result: clock(CAPSULE_FILM.server.resultMs - t), talk: clock(CAPSULE_FILM.server.talkMs - t) }[stage] ?? '';
  if (measured.timer !== timer) problems.push(`the top bar's timer says "${measured.timer}"; the server's time is ${timer || 'none'}`);
  // Every caption on one line, inside its panel: the Command Room's at its 2:1 width, the capsule's stacked where it must be.
  for (const caption of measured.captions) if (caption.cut || caption.right > caption.panelWidth + 0.5 || caption.bottom > caption.panelHeight + 0.5) problems.push(`${caption.room}: its caption is cut or leaves its panel`);
  const c = measured.capsule;
  if (!c) return [...problems, 'no capsule drawn'];
  // The capsule: its door and light as the film says, the people it says and no one else, dressed as the board dresses them;
  // nothing to press but each seated participant's own target, with &hit=1: 44 px, inside, below the caption, apart.
  if (c.door !== `door-${frame.door}`) problems.push(`the door is ${c.door}; the film says door-${frame.door}`);
  if (c.busy !== frame.busy) problems.push(`the light is ${c.busy ? 'lit' : 'out'}; the film says ${frame.busy ? 'lit' : 'out'}`);
  if (c.press) problems.push(`${c.press} things to press in the capsule besides its seated participants' targets`);
  const seatedIds = ids.filter(id => frame.people[id]?.capsule.state === 'seated');
  const hits = new URLSearchParams(shot.query).get('hit') === '1';
  if (c.targets.map(target => target.id).sort().join() !== (hits ? seatedIds : []).join()) problems.push(`targets in the capsule for ${c.targets.map(target => target.id).join(', ') || 'nobody'}; seated: ${seatedIds.join(', ') || 'nobody'}`);
  for (const target of c.targets) {
    if (target.seat !== named[ids.indexOf(target.id)]) problems.push(`${target.id}'s target is seat ${target.seat}`);
    if (Math.min(target.width, target.height) < 43.5) problems.push(`${target.id}'s target is ${Math.min(target.width, target.height).toFixed(1)} px`);
    if (target.left < c.inner.left - 0.5 || target.right > c.inner.right + 0.5 || target.top < c.inner.top - 0.5 || target.bottom > c.inner.bottom + 0.5) problems.push(`${target.id}'s target leaves the capsule`);
    if (overlap(target, c.caption)) problems.push(`${target.id}'s target is under the caption`);
  }
  if (c.targets.length === 2 && overlap(c.targets[0], c.targets[1])) problems.push('the two targets in the capsule overlap');
  const inside = ids.filter(id => frame.people[id] && frame.people[id].capsule.state !== 'empty' && frame.people[id].capsule.opacity > 0);
  if (c.figures.map(figure => figure.id).sort().join() !== inside.join()) problems.push(`in the capsule: ${c.figures.map(figure => figure.id).join(', ') || 'nobody'}; the film has ${inside.join(', ') || 'nobody'}`);
  const seatOf = number => seats.find(entry => entry.seat === number);
  const outfitOf = seat => (seat.room === 'hospital' ? 'gown' : seat.room === 'jail' ? 'prison' : 'crew');
  for (const figure of c.figures) {
    const number = named[ids.indexOf(figure.id)];
    if (figure.seat !== number) problems.push(`${figure.id} is drawn as seat ${figure.seat}; the projection names ${number}`);
    if (frame.people[figure.id] && figure.state !== frame.people[figure.id].capsule.state) problems.push(`${figure.id} is ${figure.state}; the film says ${frame.people[figure.id].capsule.state}`);
    if (seatOf(figure.seat) && figure.outfit !== outfitOf(seatOf(figure.seat))) problems.push(`seat ${figure.seat} wears ${figure.outfit} in the capsule; the board dresses it in ${outfitOf(seatOf(figure.seat))}`);
  }
  const names = inside.map(id => { const seat = seatOf(named[ids.indexOf(id)]); return `${seat.seat} ${CREW[seat.character].sign}`; });
  if (c.label !== (names.length ? `Private talk: ${names.join(' and ')}` : 'Private talk')) problems.push(`the capsule is named "${c.label}"`);
  if (c.state !== (frame.busy ? 'busy' : names.length ? 'occupied' : 'empty')) problems.push(`the capsule is ${c.state}`);
  // The tags in the capsule: whole inside its panel, apart from each other and off its caption.
  for (const tag of c.tags) {
    if (!c.figures.some(figure => figure.seat === tag.seat)) problems.push(`a tag in the capsule for seat ${tag.seat}, who is not drawn there`);
    if (tag.left < c.inner.left - 0.5 || tag.right > c.inner.right + 0.5 || tag.top < c.inner.top - 0.5 || tag.bottom > c.inner.bottom + 0.5) problems.push(`seat ${tag.seat}'s tag leaves the capsule`);
    if (overlap(tag, c.caption)) problems.push(`seat ${tag.seat}'s tag is over the caption`);
  }
  if (c.tags.length === 2 && overlap(c.tags[0], c.tags[1])) problems.push('the two tags in the capsule overlap');
  if (stage === 'talk' && named.length && c.tags.length !== named.length) problems.push(`${c.tags.length} tags in the capsule in the conversation, ${named.length} seated`);
  // At the places: every seat's tag where the board has it, the participants' included; each participant's away marker, badge and moving figure as the film says; nobody else touched.
  for (const [room, home] of Object.entries(measured.homes)) {
    const here = seats.filter(seat => seat.room === room).map(seat => seat.seat).sort((a, b) => a - b);
    if (JSON.stringify([...home.tags].sort((a, b) => a - b)) !== JSON.stringify(here)) problems.push(`${room}: tags for ${home.tags.join(',') || 'nobody'}; the board has ${here.join(',') || 'nobody'}`);
    for (const own of home.own) {
      const index = named.indexOf(own.seat);
      const person = index >= 0 ? frame.people[ids[index]] : null;
      if (!person) { if (own.away || own.pair || own.opacity || own.hidden) problems.push(`${room}: seat ${own.seat}, not in the pair, is changed`); continue; }
      const rest = person.home.state === 'present';
      if (own.away !== (!rest && person.home.ghost > 0)) problems.push(`${room}: seat ${own.seat}'s away marker is ${own.away ? 'on' : 'off'}; the film says ${!rest && person.home.ghost > 0 ? 'on' : 'off'}`);
      if (own.pair !== (frame.highlight > 0 && rest)) problems.push(`${room}: seat ${own.seat}'s outline is ${own.pair ? 'on' : 'off'}`);
    }
    for (const moving of home.moving) {
      const index = named.indexOf(moving.seat);
      const person = index >= 0 ? frame.people[ids[index]] : null;
      if (!person || person.home.state === 'present' || person.home.figure <= 0) problems.push(`${room}: a moving figure of seat ${moving.seat} the film does not draw`);
      else if (moving.state !== person.home.state) problems.push(`${room}: seat ${moving.seat} is ${moving.state}; the film says ${person.home.state}`);
      if (seatOf(moving.seat) && moving.outfit !== outfitOf(seatOf(moving.seat))) problems.push(`${room}: seat ${moving.seat} wears ${moving.outfit}`);
    }
    for (const badge of home.badges) {
      const index = named.indexOf(badge);
      const person = index >= 0 ? frame.people[ids[index]] : null;
      if (!person || Math.max(frame.highlight, person.home.ghost) <= 0 || seatOf(badge).room !== room) problems.push(`${room}: a badge on seat ${badge}`);
    }
    for (const [index, number] of named.entries()) {
      const person = frame.people[ids[index]];
      if (!person || seatOf(number).room !== room) continue;
      if (Math.max(frame.highlight, person.home.ghost) > 0 && !home.badges.includes(number)) problems.push(`${room}: no badge on seat ${number}`);
      if (person.home.state !== 'present' && person.home.figure > 0 && !home.moving.some(moving => moving.seat === number)) problems.push(`${room}: seat ${number} is not drawn on its way`);
    }
  }
  // A participant's own claim panel (its stand-in) is never under the film, and the film never under it.
  const standinUp = viewer === 'participant' && ['declare', 'result', 'talk'].includes(stage);
  if (Boolean(measured.standin) !== standinUp) problems.push(standinUp ? 'no stand-in for the claim panel' : 'a stand-in on a screen that has none');
  if (measured.standinDrawn && viewer !== 'participant') problems.push('a stand-in on a screen that is not a participant\'s');
  if (measured.standin && overlap(measured.standin, measured.rooms[CAPSULE.id])) problems.push('the claim panel\'s stand-in is over the capsule');
  // Public: no side and no role on the page.
  const words = measured.text.match(PRIVATE_WORDS);
  if (words) problems.push(`"${words[0]}" is on the page`);
  return problems;
}

function problemsOfFilm(shot, measured) {
  const { fitBoardV2, boardRects } = layoutOf(shot);
  const problems = [];
  const query = new URLSearchParams(shot.query);
  const [width, height] = shot.viewport;
  const roster = Number(query.get('roster') ?? 9);
  const outcome = BLACKOUT_OUTCOMES[query.get('outcome') ?? 'hit'];
  const viewer = query.get('viewer') ?? 'observer';
  const bound = query.get('bound') ?? 'room-b';
  const outcomeAt = Number(query.get('r') ?? 15400);
  const t = shot.film.t;
  const frame = blackoutFrame(t, { outcomeAt, hits: outcome.hits, reduced: query.get('motion') === 'reduced', windowId: query.get('window') ?? 'w-demo-r3' });
  const selection = addressSelection(query);
  const board = fitBoardV2({ width, height }, roster);
  const expected = boardRects({ width, height }, roster);
  if (measured.scrolls) problems.push('the page scrolls');
  if (measured.stage !== frame.stage) problems.push(`the page is at ${measured.stage}; the film says ${frame.stage}`);
  // The board never moves: the rooms are where fit.mjs puts them, whatever the top bar shows.
  if (Math.abs(measured.board.top - board.boardTop) > 0.6) problems.push(`the board starts at ${measured.board.top}; fit.mjs ${board.boardTop}`);
  for (const room of BOARD_ROOMS) {
    const drawnBox = measured.rooms[room]?.box;
    const want = board.boxes[room];
    if (!drawnBox || Math.abs(drawnBox.left - want.left) > 0.6 || Math.abs(drawnBox.top - want.top) > 0.6 || Math.abs(drawnBox.width - want.width) > 0.6 || Math.abs(drawnBox.height - want.height) > 0.6) problems.push(`${room}: not at fit.mjs's box`);
  }
  // Where everyone is: the frozen snapshot until the outcome settles, then the outcome's after-state.
  const settleAt = Math.max(outcomeAt, lightsBackAt(outcomeAt));
  const seats = t >= settleAt ? settledSeats(outcome, roster) : fixtureSeats('mixed', roster);
  for (const [room, drawn] of Object.entries(measured.rooms)) {
    const want = expected[room];
    if (frame.markers.opacity > 0 && drawn.markers.length !== want.length) problems.push(`${room}: ${drawn.markers.length} markers, ${want.length} slots`);
    drawn.markers.forEach((m, i) => {
      const r = want[i];
      // Every marker exactly where fit.mjs puts it, at every moment: the shake never moves one.
      if (Math.abs(m.left + m.width / 2 - r.marker[0]) > 0.6 || Math.abs(m.top + m.height / 2 - r.marker[1]) > 0.6) problems.push(`${room} marker ${i + 1} moved`);
      if (m.label !== `Position ${i + 1}`) problems.push(`${room} marker ${i + 1} is named ${m.label}`);
    });
    // Press areas: only the eligible Disabler's, in the bound room, while the selection is open and nothing is sent; each a whole slot press area.
    const live = viewer === 'disabler' && room === bound && frame.selection && selection.step !== 'sent';
    if (!live && drawn.hits.length) problems.push(`${room}: press areas on a screen that has none`);
    if (live && drawn.hits.length !== want.length) problems.push(`${room}: ${drawn.hits.length} press areas, ${want.length} slots`);
    if (live) drawn.hits.forEach((h, i) => { const r = want[i]; if (Math.abs(h.left - r.left) > 0.6 || Math.abs(h.top - r.top) > 0.6 || Math.abs(h.width - r.side) > 0.6) problems.push(`${room} press area ${i + 1} is not the slot's`); });
    if (frame.people === 'gone' && drawn.people) problems.push(`${room}: people on the page in the dark`);
    if (frame.people !== 'gone') {
      // Each seat's tag in its room, at its slot; a figure for it there; nobody else.
      const here = seats.filter(seat => seat.room === room);
      const tags = drawn.tags.map(tag => tag.seat).sort((a, b) => a - b);
      if (JSON.stringify(tags) !== JSON.stringify(here.map(seat => seat.seat).sort((a, b) => a - b))) problems.push(`${room}: seats ${tags.join(',') || 'none'}; expected ${here.map(seat => seat.seat).join(',') || 'none'}`);
      for (const seat of here) {
        const tag = drawn.tags.find(entry => entry.seat === seat.seat);
        const rect = want.find(entry => entry.id === seat.slot);
        if (tag && rect && Math.abs(tag.x - rect.press[0]) > 1) problems.push(`${room}: seat ${seat.seat}'s tag is not at ${seat.slot}`);
        if (!drawn.figures.includes(seat.seat)) problems.push(`${room}: no figure for seat ${seat.seat}`);
      }
      if (drawn.figures.some(seat => !here.some(entry => entry.seat === seat))) problems.push(`${room}: a figure of someone who is not there`);
    }
    // The sparks: in every room, from its own light, inside its panel and clear of its caption.
    if (frame.sparks.frame && !drawn.spark) problems.push(`${room}: no spark`);
    if (drawn.spark) {
      const cx = drawn.spark.left + drawn.spark.width / 2, top = drawn.spark.top + drawn.spark.height * 0.15;
      if (cx < 0 || cx > drawn.panel.width || top < -drawn.spark.height * 0.2) problems.push(`${room}: the spark is outside its panel`);
      const c = drawn.caption;
      if (c && cx > c.left && cx < c.left + c.width && top < c.top + c.height) problems.push(`${room}: the spark is under its caption`);
    }
  }
  // In the dark, no name anywhere on the page: not in its text, not in a label.
  if (frame.people === 'gone') for (const name of NAMES) if (measured.text.includes(name)) problems.push(`${name} is on the page in the dark`);
  // The top bar: its own height; the window's line while the window lasts, inside the bar, above the board, never cut, in the view's words.
  if (Math.abs(measured.top.height - board.shell.top) > 0.6) problems.push(`the top bar is ${measured.top.height} px; the shell's is ${board.shell.top}`);
  if (measured.top.overflows) problems.push('the top bar overflows');
  if (frame.line !== Boolean(measured.line)) problems.push(frame.line ? 'no line in the top bar' : 'a line outside the window');
  if (measured.line) {
    const want = lineText(frame, t, { viewer, bound, selection });
    if (measured.line.text !== want) problems.push(`the line says "${measured.line.text}"; the view's words are "${want}"`);
    // Inside the bar, above its 2 px gold rule.
    if (measured.line.top + measured.line.height > measured.top.top + measured.top.height - 2 + 0.6) problems.push('the line runs out of the top bar');
    if (measured.line.top + measured.line.height > measured.board.top + 0.01) problems.push('the line is over the board');
    if (measured.line.cut) problems.push(`the line is cut: ${measured.line.text}`);
  }
  return problems;
}

/** Reads the Hospital's medical state back: the stage, every berth's monitor, lamp, bed light and tags, the film's inset, drone, light and name tag, every figure, the art's filter, the top bar and the live region. */
const MEASURE_MEDICAL = `(() => {
  const box = node => { const b = node.getBoundingClientRect(); return { left: b.left, top: b.top, width: b.width, height: b.height, right: b.right, bottom: b.bottom }; };
  // A node's layout box in its panel (offsets, before any transform).
  const layout = node => ({ left: node.offsetLeft, top: node.offsetTop, width: node.offsetWidth, height: node.offsetHeight });
  const room = document.querySelector('.v2-room[data-room="hospital"]');
  if (!room) return null;
  const outer = room.getBoundingClientRect();
  const art = room.querySelector('.v2-art');
  const shown = node => getComputedStyle(node).visibility !== 'hidden';
  const part = node => ({ ...box(node), layout: layout(node), file: (node.getAttribute('src') ?? '').split('/').pop(), opacity: Number(getComputedStyle(node).opacity), lamp: node.dataset.lamp ?? null, berth: node.dataset.berth ?? null, film: node.dataset.film ?? null, place: node.dataset.place ?? null, art: node.parentElement === art });
  const parts = name => [...room.querySelectorAll('.v2-med__' + name)].filter(shown).map(part);
  const caption = room.querySelector('.v2-cap');
  const app = document.getElementById('v2-app');
  const labels = [...app.querySelectorAll('[aria-label]')].map(node => node.getAttribute('aria-label')).join(' ');
  return {
    film: document.documentElement.dataset.film ?? null, stage: document.documentElement.dataset.stage ?? null,
    scrolls: document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1,
    panel: { left: outer.left + room.clientLeft, top: outer.top + room.clientTop, width: room.clientWidth, height: room.clientHeight },
    caption: caption ? { ...box(caption), layout: layout(caption) } : null,
    screen: parts('screen'), lamp: parts('lamp'), bedlight: parts('bedlight'), inset: parts('inset'), drone: parts('drone'), scan: parts('scan'), hologram: parts('hologram'), pulse: parts('pulse'),
    tags: [...room.querySelectorAll('.v2-medtag')].filter(shown).map(node => ({
      ...box(node), layout: layout(node), berth: node.dataset.berth ?? null, film: node.dataset.film ?? null, opacity: Number(getComputedStyle(node).opacity),
      tones: [...node.querySelectorAll('.v2-medtag__rescue')].map(rescue => [...rescue.classList].find(name => name.startsWith('v2-medtag__rescue--')).slice('v2-medtag__rescue--'.length)),
      text: [...node.querySelectorAll('.v2-medtag__rescue b')].map(round => round.textContent),
      detention: node.querySelectorAll('.v2-medtag__detention').length,
      words: [...node.querySelectorAll('.v2-sr')].map(words => words.textContent),
    })),
    nameTags: [...room.querySelectorAll('.v2-tag[data-seat]')].filter(shown).map(node => ({ ...box(node), seat: Number(node.dataset.seat), film: node.dataset.film ?? null })),
    // Who is drawn where, as the figure's own ids say it (s<seat><slot><health initial>), in the gown or not, and how a film marks it.
    figures: [...app.querySelectorAll('.v2-fig[data-seat]')].map(node => ({ seat: Number(node.dataset.seat), room: node.closest('.v2-room')?.dataset.room ?? null, id: node.querySelector('[id]')?.id ?? '', gown: node.innerHTML.includes('-print)'), film: node.dataset.film ?? null, away: node.classList.contains('v2-fig--away'), hidden: getComputedStyle(node).visibility === 'hidden', translate: node.style.translate, opacity: node.style.opacity })),
    filmNodes: app.querySelectorAll('[data-film]').length,
    filter: art.style.filter,
    live: document.querySelector('[data-live=public]')?.textContent ?? null,
    phase: document.querySelector('.v2-top__phase')?.textContent ?? null,
    text: app.textContent + ' ' + labels,
  };
})()`;

/** What a medical page should show, from its query alone: the snapshot's seats with their medical facts, the outcome, its berth, whether its film plays, and the film's frame. */
function medicalExpected(shot) {
  const { filmBerth, rescueFrame } = layoutOf(shot);
  const query = new URLSearchParams(shot.query);
  const roster = Number(query.get('roster') ?? 9);
  const film = query.get('film');
  const reduced = query.get('motion') === 'reduced';
  const round = Number(query.get('round') ?? 3);
  const t = Number(query.get('t') ?? (film === 'critical' ? 1200 : film === 'flatline' ? 2000 : 2600));
  const outcome = film === 'critical' ? null : medicalOutcome(query.get('outcome') ?? (film === 'flatline' ? 'death' : 'rescue'), roster);
  const seats = medicalSeats(outcome ? outcome.after : fixtureSeats(query.get('fixture') ?? 'mixed', roster), { round });
  const placed = outcome ? filmBerth(outcome.anchor, roster, outcome.after.map(seat => ({ seat: seat.seat, slotId: seat.room === 'hospital' ? seat.slot : null })), outcome.subject.seat) : null;
  const end = film === 'rescue' ? rescueEnd(reduced) : film === 'flatline' ? flatlineEnd(reduced) : 0;
  const frame = film === 'rescue' ? rescueFrame(t, placed.berth, { reduced }) : film === 'flatline' ? flatlineFrame(t, { reduced }) : null;
  const during = Boolean(outcome) && t >= 0 && t < end;
  return { roster, film, reduced, round, t, outcome, seats, berth: placed?.berth ?? null, plays: placed?.plays ?? false, frame, entry: query.has('entry') ? Number(query.get('entry')) : null, during, live: during && placed.plays };
}

const FIGURE_ID = /^s\d+([A-Z]\d+)([HIE])/;

function problemsOfMedical(shot, m) {
  const { fitBoardV2, slotRects, sceneOf, berthKit, rescueFrame } = layoutOf(shot);
  if (!m) return ['no Hospital on the page'];
  const problems = [];
  const { roster, film, reduced, round, t, outcome, seats, berth, plays, entry, during, live } = medicalExpected(shot);
  let { frame } = medicalExpected(shot);
  const [width, height] = shot.viewport;
  const panel = fitBoardV2({ width, height }, roster).panels.hospital;
  const scene = frameScene(sceneOf('hospital', roster), panel);
  // A point of the ward's scene on the page, and how far a drawn box's centre is from one.
  const at = ([x, y]) => [m.panel.left + scene.tx + x * scene.k, m.panel.top + scene.ty + y * scene.k];
  const off = (node, [x, y]) => Math.hypot(node.left + node.width / 2 - x, node.top + node.height / 2 - y);
  const inside = (node, margin = 0) => node.left >= m.panel.left + margin - 0.5 && node.top >= m.panel.top + margin - 0.5 && node.right <= m.panel.left + m.panel.width - margin + 0.5 && node.bottom <= m.panel.top + m.panel.height - margin + 0.5;
  const onCaption = node => Boolean(m.caption) && overlap(node, m.caption);
  const same = (a, b) => ['left', 'top', 'width', 'height'].every(key => Math.abs(a[key] - b[key]) <= 0.6);
  const rects = new Map(slotRects('hospital', roster, panel).map(rect => [rect.id, rect]));
  const caption = m.caption?.layout ?? null;
  // Where the review page's name tag for every other slot can be (medical-view.mjs nameTagBand()), which a berth's tags keep clear of.
  const nameBands = id => [...rects.values()].filter(r => r.id !== id).map(r => ({ left: r.press[0] - 30, top: Math.min(panel.height - 16, r.top + r.side - 14), width: 60, height: 17 }));
  // A slot's press area on the page.
  const pressBox = id => { const r = rects.get(id); return { left: m.panel.left + r.left, top: m.panel.top + r.top, right: m.panel.left + r.left + r.side, bottom: m.panel.top + r.top + r.side }; };
  if (m.scrolls) problems.push('the page scrolls');
  if (Math.abs(m.panel.width - panel.width) > 0.6 || Math.abs(m.panel.height - panel.height) > 0.6) problems.push('the Hospital is not fit.mjs\'s panel');
  if (m.film !== film) problems.push(`the page plays ${m.film}; the query ${film}`);
  const stage = film === 'critical' ? 'critical' : plays ? frame.stage : 'none';
  if (m.stage !== stage) problems.push(`the page is at ${m.stage}; the film says ${stage}`);
  if (m.phase !== (film === 'critical' ? `Round ${round}` : `Round ${round}: results`)) problems.push(`the top bar says "${m.phase}"`);
  const words = m.text.match(PRIVATE_WORDS);
  if (words) problems.push(`"${words[0]}" is on the page`);

  // Everyone where the snapshot published with the outcome has them, in their health: a film moves nobody.
  for (const seat of seats) {
    const drawn = m.figures.filter(figure => !figure.film && figure.seat === seat.seat);
    if (!drawn.length) problems.push(`seat ${seat.seat} is not drawn`);
    for (const figure of drawn) {
      const [, slot, health] = FIGURE_ID.exec(figure.id) ?? [];
      if (figure.room !== seat.room || slot !== seat.slot || health !== seat.health[0]) problems.push(`seat ${seat.seat} drawn as ${figure.id} in ${figure.room}; the snapshot has ${seat.slot}, ${seat.health}`);
    }
  }

  // Every Hospital occupant's berth, from the snapshot's public facts alone; nothing at a berth nobody holds. The
  // film's own berth is the film's while it plays.
  const patients = seats.filter(seat => seat.location === 'Hospital');
  const held = new Set(patients.map(seat => seat.slotId));
  for (const kind of ['screen', 'lamp', 'bedlight']) {
    for (const node of m[kind].filter(entry => !entry.film)) {
      if (!held.has(node.berth)) problems.push(`a ${kind} at ${node.berth}, which nobody holds`);
      if (!node.art) problems.push(`${node.berth}'s ${kind} is not in the room's art`);
    }
  }
  for (const tag of m.tags.filter(entry => !entry.film)) if (!held.has(tag.berth)) problems.push(`a tag at ${tag.berth}, which nobody holds`);
  for (const seat of patients) {
    const id = seat.slotId;
    const state = berthState(seat);
    const kit = berthKit(id);
    const own = kind => m[kind].filter(node => !node.film && node.berth === id);
    const tags = m.tags.filter(tag => !tag.film && tag.berth === id);
    if (live && id === berth) {
      if (own('screen').length + own('lamp').length + own('bedlight').length + tags.length) problems.push(`${id}: its state drawn under the film`);
      continue;
    }
    const critical = state.monitor === 'unstable' ? criticalFrame(t, { reduced, entryT: entry === seat.seat ? t : null }) : null;
    // The monitor: an Injured patient's unstable trace (booting on admission), on the ward's own monitor.
    const screens = own('screen');
    if (screens.length !== (critical ? 1 : 0)) problems.push(`${id}: ${screens.length} monitors lit`);
    for (const screen of screens) {
      const want = `berth-screen-${critical.monitor.kind === 'boot' ? 'boot' : 'unstable'}.svg`;
      if (screen.file !== want) problems.push(`${id}: the monitor shows ${screen.file}, not ${want}`);
      if (off(screen, at([kit.monitor.x + kit.monitor.w / 2, kit.monitor.y + kit.monitor.h / 2])) > 0.6 || Math.abs(screen.width - kit.monitor.w * scene.k) > 0.6) problems.push(`${id}: the monitor is not the ward's`);
    }
    // The lamp: red while the due round is in progress, else amber, pulsing slowly; off for a body.
    const lamps = own('lamp');
    if (lamps.length !== 1) problems.push(`${id}: ${lamps.length} lamps`);
    for (const lamp of lamps) {
      if (lamp.lamp !== state.lamp || lamp.file !== `lamp-${state.lamp}.svg`) problems.push(`${id}: the lamp is ${lamp.lamp} (${lamp.file}); the facts say ${state.lamp}`);
      if (off(lamp, at([kit.lamp.cx, kit.lamp.cy])) > 0.6) problems.push(`${id}: the lamp is not the ward's`);
      const opacity = critical ? (critical.lamp.on ? critical.lamp.opacity : 0) : 1;
      if (Math.abs(lamp.opacity - opacity) > 0.01) problems.push(`${id}: the lamp at ${lamp.opacity}; the frame says ${opacity}`);
    }
    // The patient's figure: arriving in the berth on admission, as the frame says; its breath on its art alone.
    for (const figure of m.figures.filter(entry => !entry.film && entry.seat === seat.seat)) {
      const opacity = critical ? critical.figure.opacity : 1;
      if ((figure.opacity === '' ? 1 : Number(figure.opacity)) !== opacity) problems.push(`${id}: the patient at opacity ${figure.opacity || 1}; the frame says ${opacity}`);
      const breath = critical?.breath ? `0px ${critical.breath}px` : '';
      if (!figure.hidden && figure.translate !== breath && !(live && id === berth)) problems.push(`${id}: the patient moved by "${figure.translate}"; the frame says "${breath}"`);
    }
    // The bed light: down for a body alone.
    const bedlights = own('bedlight');
    if (bedlights.length !== (state.bedLight === 'off' ? 1 : 0)) problems.push(`${id}: ${bedlights.length} bed lights down`);
    for (const light of bedlights) if (off(light, at([kit.bedLight.cx, kit.bedLight.cy])) > 0.6) problems.push(`${id}: the bed light is not the berth's`);
    // The tags: the rescue tag from the server's values, then the detention tag; where tagBox() puts them (on the
    // berth's plate, or below the caption), whole in the panel and off the caption.
    const want = { tones: state.tag ? [state.tag.tone] : [], text: state.tag?.text ? [state.tag.text] : [], detention: state.detention ? 1 : 0, words: [...(state.tag ? [`${state.tag.label}.`] : []), ...(state.detention ? ['Detained.'] : [])] };
    if (tags.length !== (state.tag || state.detention ? 1 : 0)) problems.push(`${id}: ${tags.length} tags`);
    for (const tag of tags) {
      const got = { tones: tag.tones, text: tag.text, detention: tag.detention, words: tag.words };
      if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${id}: the tag is ${JSON.stringify(got)}; the facts say ${JSON.stringify(want)}`);
      if (!inside(tag, 2)) problems.push(`${id}: the tag leaves the panel`);
      if (onCaption(tag)) problems.push(`${id}: the tag is over the caption`);
      const place = tagBox({ plate: rects.get(id).badge, size: [tag.layout.width, tag.layout.height], panel, keepClear: nameBands(id) });
      if (Math.abs(tag.layout.left - place.left) > 0.6 || Math.abs(tag.layout.top - place.top) > 0.6) problems.push(`${id}: the tag is at ${tag.layout.left.toFixed(1)},${tag.layout.top.toFixed(1)}; tagBox() puts it at ${place.left.toFixed(1)},${place.top.toFixed(1)}`);
      const opacity = critical ? critical.tag.opacity : 1;
      if (Math.abs(tag.opacity - opacity) > 0.01) problems.push(`${id}: the tag at ${tag.opacity}; the frame says ${opacity}`);
      // Never over a name tag.
      for (const name of m.nameTags) if (overlap(tag, name)) problems.push(`${id}: the tag is over seat ${name.seat}'s name tag by ${(Math.min(tag.bottom, name.bottom) - Math.max(tag.top, name.top)).toFixed(1)} px`);
    }
  }

  // The words: the client's for the outcome (outcomeWords()), at the film's announce beat, or at once where no film plays.
  const sentence = during && (plays ? frame.announce : true) ? outcomeWords(outcome.subject.seat, film === 'rescue' ? 'HEALED' : 'DEATH') : '';
  if (m.live === null) problems.push('no public live region');
  else if (m.live !== sentence) problems.push(`the live region says "${m.live}"; it should say "${sentence}"`);

  // The film: on the page exactly while it plays, each part where the frame puts it; nothing it added after its end,
  // and nothing at all where another seat holds the berth.
  if (!live) {
    if (m.filmNodes) problems.push(`${m.filmNodes} nodes of the film on the page ${frame?.done ? 'after its end' : plays ? 'outside it' : 'where it cannot play'}`);
    if (m.filter) problems.push(`the Hospital's art is filtered (${m.filter}) outside the film`);
    for (const figure of m.figures) if (figure.away || figure.hidden) problems.push(`seat ${figure.seat} is ${figure.away ? 'marked away' : 'hidden'} outside the film`);
    return problems;
  }
  const kit = berthKit(berth);
  const subject = outcome.subject.seat;
  const after = outcome.after.find(seat => seat.seat === subject);
  const ownBerth = after.room === 'hospital' && after.slot === berth;
  const parts = kind => m[kind].filter(node => node.film).map(node => ({ kind, ...node }));
  // The berth's own monitor, lamp and bed light, as the frame has them, in the room's art.
  const screenKind = frame.inset.kind === 'off' ? null : frame.inset.kind;
  const screens = parts('screen');
  if (screens.length !== (screenKind ? 1 : 0) || (screenKind && screens[0].file !== `berth-screen-${screenKind}.svg`)) problems.push(`the film's monitor shows ${screens.map(node => node.file).join() || 'nothing'}; the frame ${screenKind ?? 'nothing'}`);
  for (const screen of screens) if (off(screen, at([kit.monitor.x + kit.monitor.w / 2, kit.monitor.y + kit.monitor.h / 2])) > 0.6) problems.push('the film\'s monitor is not the berth\'s');
  const lampState = frame.lamp.state === 'dark' ? 'off' : frame.lamp.state;
  const lamps = parts('lamp');
  if (lamps.length !== 1 || lamps[0].file !== `lamp-${lampState}.svg`) problems.push(`the film's lamp is ${lamps.map(node => node.file).join() || 'missing'}; the frame ${lampState}`);
  for (const lamp of lamps) {
    if (off(lamp, at([kit.lamp.cx, kit.lamp.cy])) > 0.6) problems.push('the film\'s lamp is not the berth\'s');
    const opacity = lampState === 'off' ? 1 : frame.lamp.opacity;
    if (Math.abs(lamp.opacity - opacity) > 0.01) problems.push(`the film's lamp at ${lamp.opacity}; the frame ${opacity}`);
  }
  const lights = parts('bedlight');
  if (lights.length !== ((frame.bedLight ?? 0) > 0 ? 1 : 0)) problems.push(`${lights.length} bed lights down; the frame ${frame.bedLight ?? 0}`);
  for (const light of lights) if (Math.abs(light.opacity - frame.bedLight) > 0.01 || off(light, at([kit.bedLight.cx, kit.bedLight.cy])) > 0.6) problems.push(`the film's bed light at ${light.opacity}; the frame ${frame.bedLight}`);
  for (const node of [...screens, ...lamps, ...lights]) if (!node.art) problems.push(`the film's ${node.kind} is not in the room's art`);
  // The vitals inset: where insetBox() puts it, never over the caption or over a press area another seat holds.
  const living = outcome.after.filter(seat => seat.room === 'hospital' && seat.slot !== berth).map(seat => rects.get(seat.slot));
  const livingBoxes = living.map(r => ({ left: r.left, top: r.top, width: r.side, height: r.side }));
  const place = insetBox({ rect: rects.get(berth), panel, width: Math.max(60, Math.min(84, Math.round(panel.width * 0.42))), caption, keepClear: livingBoxes });
  // The drone's size over the berth: the share droneFit() allows under the caption and the other seats' press areas.
  const fit = droneFit({ kit, frame: scene, keepClear: [...(caption ? [{ left: caption.left - LABEL_MARGIN, top: caption.top - LABEL_MARGIN, width: caption.width + 2 * LABEL_MARGIN, height: caption.height + 2 * LABEL_MARGIN }] : []), ...livingBoxes] });
  if (film === 'rescue') frame = rescueFrame(t, berth, { reduced, fit });
  const insets = parts('inset');
  if (insets.length !== (place && frame.inset.opacity > 0 ? 1 : 0)) problems.push(`${insets.length} insets; insetBox() ${place ? place.place : 'finds no room'}, the frame's at ${frame.inset.opacity}`);
  for (const inset of insets) {
    if (!place || !same(inset.layout, place) || inset.place !== place.place) problems.push(`the inset is at ${JSON.stringify(inset.layout)} (${inset.place}); insetBox() ${JSON.stringify(place)}`);
    if (Math.abs(inset.opacity - frame.inset.opacity) > 0.01) problems.push(`the inset at ${inset.opacity}; the frame ${frame.inset.opacity}`);
    if (!inside(inset, LABEL_MARGIN)) problems.push('the inset leaves the panel');
    if (onCaption(inset)) problems.push('the inset is over the caption');
    for (const id of [berth, ...living.map(r => r.id)]) if (overlap(inset, pressBox(id))) problems.push(`the inset is over ${id}'s press area`);
  }
  if (film === 'rescue') {
    // The drone: its lens where the frame puts it, from the Hospital's dock to the berth and back, drawn at the
    // berth's scale; whole in the panel and off the caption while it treats the patient.
    const drones = parts('drone');
    if (drones.length !== (frame.drone.at ? 1 : 0)) problems.push(`${drones.length} drones; the frame ${frame.drone.at ? 'one' : 'none'}`);
    for (const drone of frame.drone.at ? drones : []) {
      if (drone.file !== `drone-${frame.drone.frame}.svg`) problems.push(`the drone is ${drone.file}; the frame ${frame.drone.frame}`);
      const lens = [drone.left + (DRONE.lens[0] / DRONE.w) * drone.width, drone.top + (DRONE.lens[1] / DRONE.h) * drone.height];
      const want = at(frame.drone.at);
      if (Math.hypot(lens[0] - want[0], lens[1] - want[1]) > 1) problems.push(`the drone's lens at ${lens.map(Math.round).join(',')}; the frame ${want.map(Math.round).join(',')}`);
      if (Math.abs(drone.width - DRONE_SCENE.width * kit.scale * scene.k * fit) > 0.6) problems.push(`the drone is ${drone.width.toFixed(1)} px wide, not the berth's scale at fit ${fit}`);
      if (Math.abs(drone.opacity - frame.drone.opacity) > 0.01) problems.push(`the drone at ${drone.opacity}; the frame ${frame.drone.opacity}`);
      if (!['alert', 'arrive', 'depart'].includes(frame.stage) && (!inside(drone) || onCaption(drone))) problems.push('the drone leaves the panel or covers the caption while it treats the patient');
      // Over the berth, it covers no press area another seat holds.
      if (!['alert', 'arrive', 'depart'].includes(frame.stage)) for (const r of living) if (overlap(drone, pressBox(r.id))) problems.push(`the drone is over ${r.id}'s press area`);
    }
    const scans = parts('scan');
    if (scans.length !== (frame.scan.opacity > 0 ? 1 : 0)) problems.push(`${scans.length} scan lines; the frame's at ${frame.scan.opacity}`);
    for (const scan of scans) if (off(scan, at([kit.c, kit.bed.y + kit.bed.h * 0.7 * frame.scan.y])) > 0.6) problems.push('the scan line is not where the frame puts it');
    const holograms = parts('hologram');
    if (holograms.length !== (frame.hologram.opacity > 0 ? 1 : 0)) problems.push(`${holograms.length} holograms; the frame's at ${frame.hologram.opacity}`);
    for (const hologram of holograms) if (Math.abs(hologram.opacity - frame.hologram.opacity) > 0.01) problems.push(`the hologram at ${hologram.opacity}; the frame ${frame.hologram.opacity}`);
    // The pulse: at the chest; its white-hot core (frame 1) a small part of the panel, never a room-wide flash.
    const pulses = parts('pulse');
    if (pulses.length !== (frame.pulse.frame ? 1 : 0)) problems.push(`${pulses.length} pulses; the frame ${frame.pulse.frame}`);
    for (const pulse of pulses) {
      if (pulse.file !== `pulse-${frame.pulse.frame}.svg`) problems.push(`the pulse is ${pulse.file}; the frame ${frame.pulse.frame}`);
      if (off(pulse, at(kit.chest)) > 0.6) problems.push('the pulse is not at the chest');
      const core = (PULSE_FLASH_RADIUS / PULSE_BOX) * pulse.width;
      if (frame.pulse.frame === 1 && Math.PI * core * core > BLACKOUT.flashLimit.panelShare * m.panel.width * m.panel.height) problems.push('the pulse\'s core flashes over a quarter of the panel');
    }
    if (m.filter) problems.push(`the Hospital's art is filtered (${m.filter}) in a rescue`);
  } else {
    if (['drone', 'scan', 'hologram', 'pulse'].some(kind => parts(kind).length)) problems.push('the drone in a flatline');
    // The room's light dips on its art alone, never to darkness.
    const want = frame.room < 1 ? `brightness(${frame.room})` : '';
    if (m.filter !== want) problems.push(`the Hospital's art filter is "${m.filter}"; the frame ${want || 'none'}`);
  }
  // The subject: drawn by the film at the berth, in the frame's pose and the gown; where the snapshot has it, hidden at
  // its own berth or marked away elsewhere, so never in two places; nobody else touched.
  const health = { injured: 'I', healthy: 'H', still: 'E' }[frame.patient.pose];
  const [dx, dy] = frame.patient.offset;
  const moved = dx || dy ? `${dx}px ${dy}px` : '';
  const filmed = m.figures.filter(figure => figure.film);
  if (!filmed.length) problems.push('the film draws nobody');
  for (const figure of filmed) {
    const [, slot, initial] = FIGURE_ID.exec(figure.id) ?? [];
    if (figure.seat !== subject || figure.room !== 'hospital' || slot !== berth || initial !== health) problems.push(`the film draws ${figure.id} in ${figure.room}; the frame has seat ${subject} at ${berth}, ${frame.patient.pose}`);
    if (!figure.gown) problems.push('the film\'s patient is not in the gown');
    if (figure.translate !== moved) problems.push(`the film's patient moved by "${figure.translate}"; the frame "${moved}"`);
  }
  for (const figure of m.figures.filter(entry => !entry.film)) {
    if (figure.seat !== subject) { if (figure.away || figure.hidden) problems.push(`seat ${figure.seat}, not the film's, is ${figure.away ? 'marked away' : 'hidden'}`); continue; }
    if (ownBerth ? !figure.hidden : figure.hidden || !figure.away) problems.push(`seat ${subject} where the snapshot has it is ${figure.hidden ? 'hidden' : figure.away ? 'marked away' : 'drawn as it is'}; it should be ${ownBerth ? 'hidden at its own berth' : 'marked away'}`);
  }
  // Its name: the board's own tag at its berth, or, drawn away from its snapshot place, the film's tag at the berth.
  const filmTags = m.nameTags.filter(tag => tag.film);
  if (filmTags.length !== (ownBerth ? 0 : 1) || filmTags.some(tag => tag.seat !== subject)) problems.push(`the film carries ${filmTags.length} name tags; the subject is ${ownBerth ? 'at its own berth' : 'drawn away from its place'}`);
  for (const tag of filmTags) if (Math.abs(tag.left + tag.width / 2 - (m.panel.left + rects.get(berth).press[0])) > 1) problems.push('the film\'s name tag is not at its berth');
  // A detained subject keeps the detention tag on the berth's plate for the whole film.
  const kept = m.tags.filter(tag => tag.film);
  if (kept.length !== (after.jailed ? 1 : 0) || kept.some(tag => tag.detention !== 1 || tag.tones.length || tag.words.join() !== 'Detained.')) problems.push(`the film keeps ${kept.length} tags; the subject is ${after.jailed ? '' : 'not '}detained`);
  for (const tag of kept) {
    for (const name of m.nameTags) if (overlap(tag, name)) problems.push(`the detention tag is over seat ${name.seat}'s name tag`);
    const place = tagBox({ plate: rects.get(berth).badge, size: [tag.layout.width, tag.layout.height], panel, keepClear: nameBands(berth) });
    if (!inside(tag, 2) || Math.abs(tag.layout.left - place.left) > 0.6 || Math.abs(tag.layout.top - place.top) > 0.6) problems.push('the detention tag is not where tagBox() puts it');
  }
  return problems;
}

/** Reads a Captain film's page back: the stage, the console inset and its parts, the pulse, the Jail's door and airlock, the suction, the emergency light, the exterior, the label, the plaque, every figure, the captions, the top bar and the live region. */
const MEASURE_CAPTAIN = `(() => {
  const box = node => { const b = node.getBoundingClientRect(); return { left: b.left, top: b.top, width: b.width, height: b.height, right: b.right, bottom: b.bottom }; };
  const layout = node => ({ left: node.offsetLeft, top: node.offsetTop, width: node.offsetWidth, height: node.offsetHeight });
  const app = document.getElementById('v2-app');
  const room = id => document.querySelector('.v2-room[data-room="' + id + '"]');
  const panel = id => { const node = room(id); if (!node) return null; const b = node.getBoundingClientRect(); return { left: b.left + node.clientLeft, top: b.top + node.clientTop, width: node.clientWidth, height: node.clientHeight }; };
  const opacity = node => Number(getComputedStyle(node).opacity);
  const one = selector => { const node = app.querySelector(selector); return node ? { ...box(node), layout: layout(node), opacity: opacity(node), data: { ...node.dataset }, files: [...node.querySelectorAll('img')].map(img => (img.getAttribute('src') ?? '').split('/').pop()), text: node.textContent } : null; };
  const all = selector => [...app.querySelectorAll(selector)].map(node => ({ ...box(node), layout: layout(node), opacity: opacity(node), data: { ...node.dataset }, room: node.closest('.v2-room')?.dataset.room ?? null, file: (node.getAttribute('src') ?? '').split('/').pop(), text: node.textContent, style: node.getAttribute('style') ?? '' }));
  const captions = Object.fromEntries([...app.querySelectorAll('.v2-room .v2-cap')].map(node => [node.closest('.v2-room').dataset.room, { ...box(node), layout: layout(node) }]));
  const conduit = app.querySelector('.v2-cpt__conduit polyline');
  const labels = [...app.querySelectorAll('[aria-label]')].map(node => node.getAttribute('aria-label')).join(' ');
  const commandArt = room('command-room')?.querySelector('.v2-art');
  return {
    film: document.documentElement.dataset.film ?? null, stage: document.documentElement.dataset.stage ?? null,
    scrolls: document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1,
    board: box(document.querySelector('.v2-board')),
    panels: Object.fromEntries(['command-room', 'room-a', 'room-b', 'hospital', 'jail'].map(id => [id, panel(id)])),
    captions, tags: [...app.querySelectorAll('.v2-tag[data-seat]')].map(node => ({ ...box(node), seat: Number(node.dataset.seat), room: node.closest('.v2-room')?.dataset.room ?? null })),
    hits: [...app.querySelectorAll('.v2-slot-hit')].map(node => ({ ...box(node), slot: node.dataset.slot })),
    console: one('.v2-cpt__console'), word: one('.v2-cpt__word'), stamp: one('.v2-cpt__stamp'),
    conduit: conduit ? conduit.getAttribute('points') : null, head: one('.v2-cpt__head'),
    door: one('.v2-cpt__door'), airlock: one('.v2-cpt__airlock'), suction: all('.v2-cpt__suction'), debris: all('.v2-cpt__debris'),
    emergency: all('.v2-cpt__emergency'), exterior: one('.v2-cpt__exterior'), label: one('.v2-cpt__label'), plaque: one('.v2-plaque'),
    trail: all('.v2-cpt__trail'), puff: all('.v2-cpt__puff'),
    offboard: (() => {
      const sheet = app.querySelector('.v2-offboard');
      if (!sheet) return null;
      // A real pointer at each card's centre and at its four corners 3 px inside: how many land on it.
      const hits = node => { const b = node.getBoundingClientRect(); return [[b.left + b.width / 2, b.top + b.height / 2], [b.left + 3, b.top + 3], [b.right - 3, b.top + 3], [b.left + 3, b.bottom - 3], [b.right - 3, b.bottom - 3]].filter(([x, y]) => { const at = document.elementFromPoint(x, y); return at === node || node.contains(at); }).length; };
      return { sheet: box(sheet), tab: one('.v2-offboard__tab'), cards: [...sheet.querySelectorAll('.v2-offboard__card')].map(node => ({ ...box(node), seat: Number(node.dataset.seat), offered: node.dataset.offered === 'true', ring: Boolean(node.querySelector('.v2-ring')), chosen: Boolean(node.querySelector('.v2-ring--chosen')), name: node.querySelector('.v2-offboard__name')?.textContent ?? '', hits: hits(node) })) };
    })(),
    figures: [...app.querySelectorAll('.v2-fig[data-seat]')].map(node => ({ seat: Number(node.dataset.seat), room: node.closest('.v2-room')?.dataset.room ?? null, id: node.querySelector('[id]')?.id ?? '', film: node.dataset.film ?? null, outfit: node.dataset.outfit ?? null, away: node.classList.contains('v2-fig--away'), silhouette: node.classList.contains('v2-fig--silhouette'), memorial: node.classList.contains('v2-fig--memorial'), hidden: getComputedStyle(node).visibility === 'hidden', opacity: node.style.opacity, flyer: node.classList.contains('v2-cpt__flyer'), exterior: Boolean(node.closest('.v2-cpt__exterior')) })),
    filmNodes: app.querySelectorAll('[data-film]').length,
    push: commandArt ? commandArt.style.transform : null,
    live: document.querySelector('[data-live=public]')?.textContent ?? null,
    phase: document.querySelector('.v2-top__phase')?.textContent ?? null,
    text: app.textContent + ' ' + labels,
  };
})()`;

/** What a Captain film's page should show, from its query alone: the outcome, the board, the frame, and where the console inset and the pulse go. */
function captainExpected(shot) {
  const { fitBoardV2, slotRects, sceneOf } = layoutOf(shot);
  const query = new URLSearchParams(shot.query);
  const roster = Number(query.get('roster') ?? 9);
  const film = query.get('film');
  const kind = film === 'release' ? 'RELEASE' : 'EJECT';
  const reduced = query.get('motion') === 'reduced';
  const t = Number(query.get('t') ?? (film === 'release' ? 2600 : 3700));
  const outcome = captainOutcome(query.get('outcome') ?? film, roster);
  const [width, height] = shot.viewport;
  const board = fitBoardV2({ width, height }, roster, { capsule: query.get('capsule') === '1' });
  const end = kind === 'RELEASE' ? releaseEnd(reduced) : ejectEnd(reduced);
  const frame = kind === 'RELEASE' ? releaseFrame(t, { reduced, count: outcome.subjects.length }) : ejectFrame(t, { reduced, subjects: outcome.subjects });
  const border = board.shell.border;
  const commandPanel = board.panels['command-room'];
  const c1 = slotRects('command-room', roster, commandPanel)[0];
  const command = board.boxes['command-room'];
  const bandRight = board.capsule ? board.boxes[CAPSULE.id].left + board.boxes[CAPSULE.id].width - border : command.left + command.width - border;
  const band = { left: command.left + border, top: command.top + border, width: bandRight - command.left - border, height: commandPanel.height };
  const captainBox = { left: band.left + c1.left, top: band.top + c1.top, width: c1.side, height: c1.side };
  const tag = { left: band.left + c1.press[0] - 30, top: band.top + Math.min(commandPanel.height - 16, c1.top + c1.side - 14), width: 60, height: 17 };
  const place = consoleBox({ band, cap: commandPanel.cap, captain: captainBox, tag });
  const jailFrame = frameScene(sceneOf('jail', roster), board.panels.jail);
  const start = place ? [place.left + place.width / 2, place.top + place.height] : [band.left + c1.press[0], band.top + c1.press[1]];
  const conduit = conduitPoints({ boxes: board.boxes, border, jail: jailFrame, start });
  return { roster, film, kind, reduced, t, outcome, board, end, frame, band, captainBox, tag, place, jailFrame, conduit, during: t >= 0 && t < end };
}

function problemsOfCaptain(shot, m) {
  const { turnsLayout } = layoutOf(shot);
  if (!m) return ['nothing measured'];
  const problems = [];
  const { roster, kind, reduced, t, outcome, board, end, frame, band, captainBox, tag, place, jailFrame, conduit, during } = captainExpected(shot);
  const near = (a, b, tolerance = 0.6) => Math.abs(a - b) <= tolerance;
  const sameBox = (a, b, tolerance = 0.6) => ['left', 'top', 'width', 'height'].every(key => near(a[key], b[key], tolerance));
  const toBox = b => ({ left: b.left, top: b.top, right: b.left + b.width, bottom: b.top + b.height });
  const jail = m.panels.jail;
  const inJail = ([x, y, w, h]) => ({ left: jail.left + jailFrame.tx + x * jailFrame.k, top: jail.top + jailFrame.ty + y * jailFrame.k, width: w * jailFrame.k, height: h * jailFrame.k });
  if (m.scrolls) problems.push('the page scrolls');
  if (m.film !== shot.query.match(/film=(\w+)/)[1]) problems.push(`the page plays ${m.film}`);
  if (m.stage !== frame.stage) problems.push(`the page is at ${m.stage}; the film says ${frame.stage}`);
  const query = new URLSearchParams(shot.query);
  const choosing = query.get('ui') === 'choosing';
  const phase = choosing ? `Code: choose ${query.get('choose') ?? 4}` : 'Round 3: turns';
  if (m.phase !== phase) problems.push(`the top bar says "${m.phase}"`);
  const words = m.text.match(PRIVATE_WORDS);
  if (words) problems.push(`"${words[0]}" is on the page`);
  // The characters off the board as targets: a card each, in the sheet's body, 44 px at least, apart, a pointer landing
  // on each; ringed when offered, marked when chosen; the tab saying how many.
  if (query.get('offboard') === '1') {
    const off = outcome.after.filter(seat => seat.room === null).sort((a, b) => a.seat - b.seat);
    const options = { insets: insetsOf(query.get('safe')), bars: query.get('text') === '2' ? ENLARGED.bars : null, actions: query.get('text') === '2' ? ENLARGED.actions : undefined };
    const { sheet } = turnsLayout({ width: shot.viewport[0], height: shot.viewport[1] }, roster, options);
    const offered = (query.get('offered') ?? '').split(',').filter(Boolean).map(Number);
    const chosen = (query.get('chosen') ?? '').split(',').filter(Boolean).map(Number);
    const o = m.offboard;
    if (!o) problems.push('no cards for the characters off the board');
    else {
      if (!sameBox(o.sheet, sheet)) problems.push('the cards\' sheet is not turns.mjs\'s');
      if (!o.tab || o.tab.text !== String(off.length)) problems.push(`the tab says ${o.tab?.text}; ${off.length} are off the board`);
      if (JSON.stringify(o.cards.map(card => card.seat)) !== JSON.stringify(off.map(seat => seat.seat))) problems.push(`cards for ${o.cards.map(card => card.seat)}; off the board: ${off.map(seat => seat.seat)}`);
      o.cards.forEach((card, i) => {
        if (card.width < 43.5 || card.height < 43.5) problems.push(`seat ${card.seat}'s card is ${card.width.toFixed(1)} x ${card.height.toFixed(1)}`);
        if (card.left < sheet.body.left - 0.5 || card.top < sheet.body.top - 0.5 || card.right > sheet.body.left + sheet.body.width + 0.5 || card.bottom > sheet.body.top + sheet.body.height + 0.5) problems.push(`seat ${card.seat}'s card leaves the sheet's body`);
        for (const other of o.cards.slice(i + 1)) if (overlap(card, other)) problems.push(`seats ${card.seat} and ${other.seat}: cards overlap`);
        if (card.hits !== 5) problems.push(`a pointer misses seat ${card.seat}'s card`);
        if (card.offered !== offered.includes(card.seat) || card.ring !== card.offered || card.chosen !== chosen.includes(card.seat)) problems.push(`seat ${card.seat}'s card is ${card.offered ? 'offered' : 'not offered'}${card.chosen ? ', chosen' : ''}; the offer says otherwise`);
        if (!card.name.startsWith(String(card.seat))) problems.push(`seat ${card.seat}'s card is named ${card.name}`);
      });
    }
  } else if (m.offboard) problems.push('cards for the characters off the board outside a choice');
  const sentence = during && frame.announce ? captainWords(kind, outcome.seatIds) : '';
  if (m.live === null) problems.push('no public live region');
  else if (m.live !== sentence) problems.push(`the live region says "${m.live}"; it should say "${sentence}"`);

  // The snapshot published with the outcome: everyone on the board where it has them, in their health; the released
  // marked away at their new places until they land, hidden while they settle; the ejected drawn nowhere by it.
  const subjects = new Map(outcome.subjects.map((subject, i) => [subject.seat, { ...subject, person: frame.people[i] }]));
  for (const seat of outcome.after) {
    const drawn = m.figures.filter(figure => !figure.film && figure.seat === seat.seat);
    if (seat.room === null) { if (drawn.length) problems.push(`seat ${seat.seat}, off the board, is drawn by the board`); continue; }
    if (!drawn.length) problems.push(`seat ${seat.seat} is not drawn`);
    const subject = subjects.get(seat.seat);
    const state = subject?.person.state;
    for (const figure of drawn) {
      const [, slot, health] = FIGURE_ID.exec(figure.id) ?? [];
      if (figure.room !== seat.room || slot !== seat.slot || health !== seat.health[0]) problems.push(`seat ${seat.seat} drawn as ${figure.id} in ${figure.room}; the snapshot has ${seat.slot}, ${seat.health}`);
      const captainHidden = during && seat.room === 'command-room' && seat.captain;
      const away = during && subject && state !== 'land' && state !== 'settled';
      const hidden = captainHidden || (during && subject && state === 'land');
      if (figure.away !== Boolean(away) || figure.hidden !== Boolean(hidden)) problems.push(`seat ${seat.seat} is ${figure.hidden ? 'hidden' : figure.away ? 'marked away' : 'drawn as it is'}; it should be ${hidden ? 'hidden' : away ? 'marked away' : 'drawn as it is'}`);
    }
  }

  // Outside the film: nothing of it on the page; the plaque, if anyone is off the board, the board's own.
  const off = outcome.after.filter(seat => seat.room === null).length;
  if (!during) {
    if (m.filmNodes) problems.push(`${m.filmNodes} nodes of the film on the page ${t >= end ? 'after its end' : 'before it'}`);
    if (m.push) problems.push(`the Command Room's art is transformed (${m.push}) outside the film`);
    if (Boolean(m.plaque) !== off > 0) problems.push(`the plaque is ${m.plaque ? 'drawn' : 'missing'} with ${off} seats off the board`);
  }
  if (m.plaque) {
    if (m.plaque.text !== String(off)) problems.push(`the plaque says ${m.plaque.text}; ${off} seats are off the board`);
    // Placed by the caption's layout box (as the page lays it out, before its slant), kept clear of its slanted edge.
    const caption = m.captions.jail;
    if (isFour(shot)) {
      // On the successor's board the plaque is in the spine between the Hospital and the Jail (fx/overflow.mjs).
      const at = spinePlaqueBox({ hospital: board.boxes.hospital, jail: board.boxes.jail, border: board.shell.border, cap: board.panels.hospital.cap, size: [m.plaque.layout.width, m.plaque.layout.height] });
      if (!at || !near(m.plaque.layout.left, at.left - board.boardLeft, 1) || !near(m.plaque.layout.top, at.top - board.boardTop, 1)) problems.push('the plaque is not where spinePlaqueBox() puts it');
    } else {
      const at = plaqueBox({ caption: caption.layout, size: [m.plaque.layout.width, m.plaque.layout.height], panel: board.panels.jail });
      if (!near(m.plaque.layout.left, at.left, 1) || !near(m.plaque.layout.top, at.top, 1)) problems.push('the plaque is not where plaqueBox() puts it');
    }
    if (overlap(m.plaque, caption)) problems.push('the plaque is over the Jail\'s caption');
  }
  if (!during) return problems;

  // The console inset: where consoleBox() puts it, over no caption and not over the Captain's place or name tag.
  if (Boolean(m.console) !== Boolean(place && frame.inset.opacity > 0)) problems.push(`the console inset is ${m.console ? 'drawn' : 'missing'}; consoleBox() ${place ? 'has room' : 'finds none'}, the frame's at ${frame.inset.opacity}`);
  if (m.console) {
    const offset = { left: m.console.layout.left + m.board.left, top: m.console.layout.top + m.board.top, width: m.console.layout.width, height: m.console.layout.height };
    if (!sameBox(offset, place)) problems.push(`the inset is at ${JSON.stringify(offset)}; consoleBox() ${JSON.stringify(place)}`);
    if (!near(m.console.opacity, frame.inset.opacity, 0.011)) problems.push(`the inset at ${m.console.opacity}; the frame ${frame.inset.opacity}`);
    const which = kind === 'RELEASE' ? 'release' : 'eject';
    if (m.console.data.plate !== frame.inset.plate || !m.console.files.includes(`plate-${which}-${frame.inset.plate}.svg`)) problems.push(`the plate is ${m.console.data.plate}; the frame ${frame.inset.plate}`);
    if ((m.console.data.cover ?? null) !== (frame.inset.cover ?? null)) problems.push(`the cover is ${m.console.data.cover}; the frame ${frame.inset.cover}`);
    if (Boolean(m.stamp) !== frame.inset.stamp > 0) problems.push('the USED stamp is not as the frame says');
    for (const [name, caption] of Object.entries(m.captions)) if (caption && overlap(toBox(offset), caption)) problems.push(`the inset is over ${name}'s caption`);
    if (overlap(toBox(offset), toBox(captainBox)) || overlap(toBox(offset), toBox(tag))) problems.push('the inset is over the Captain\'s place or name tag');
    if (offset.left < band.left - 0.5 || offset.top < band.top - 0.5 || offset.left + offset.width > band.left + band.width + 0.5 || offset.top + offset.height > band.top + band.height + 0.5) problems.push('the inset leaves the top band');
    for (const hit of m.hits) if (overlap(toBox(offset), hit)) problems.push(`the inset is over ${hit.slot}'s press area`);
  }
  // The pulse's way: under no caption, as the page lays the captions out (its drop into the Jail passes right of its caption).
  const { total } = conduitAt(conduit, 1);
  for (let d = 0; d <= total; d += 1) {
    const [x, y] = conduitAt(conduit, d / total).head;
    const caption = Object.entries(m.captions).find(([, b]) => x > b.left - 1.5 && x < b.right + 1.5 && y > b.top - 1.5 && y < b.bottom + 1.5);
    if (caption) { problems.push(`the pulse's way crosses ${caption[0]}'s caption at ${x.toFixed(1)},${y.toFixed(1)}`); break; }
  }
  // The pulse: its head on its way down the gutters, where the frame puts it.
  if (Boolean(m.head) !== Boolean(frame.pulse && frame.pulse.opacity > 0)) problems.push(`the pulse is ${m.head ? 'drawn' : 'missing'}; the frame ${frame.pulse ? frame.pulse.opacity : 'none'}`);
  if (m.head && frame.pulse) {
    const [x, y] = conduitAt(conduit, frame.pulse.v).head;
    if (Math.hypot(m.head.left + m.head.width / 2 - x, m.head.top + m.head.height / 2 - y) > 1) problems.push(`the pulse's head at ${Math.round(m.head.left + 12)},${Math.round(m.head.top + 12)}; the way puts it at ${Math.round(x)},${Math.round(y)}`);
    for (const hit of m.hits) if (overlap(m.head, hit)) problems.push(`the pulse's head is over ${hit.slot}'s press area`);
  }
  // The Jail's door: over the room's own, at its scene frame, as the frame has it.
  if (!m.door) problems.push('no door over the Jail');
  else {
    if (!sameBox(m.door, inJail(JAIL_DOOR.box))) problems.push('the door is not where the Jail draws its own');
    const want = { open: String(frame.door.open), wheel: String(frame.door.wheel), lamp: frame.door.lamp, keypad: frame.door.keypad };
    const got = { open: m.door.data.open, wheel: m.door.data.wheel, lamp: m.door.data.lamp, keypad: m.door.data.keypad };
    if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`the door is ${JSON.stringify(got)}; the frame ${JSON.stringify(want)}`);
  }
  // C1: the Captain drawn by the film, in the Command Room, while it plays; the art pushed as the frame says.
  const captainSeat = outcome.after.find(seat => seat.room === 'command-room' && seat.captain);
  const c1 = m.figures.filter(figure => figure.film && figure.room === 'command-room');
  if (captainSeat && (c1.length < 1 || c1.some(figure => figure.seat !== captainSeat.seat))) problems.push(`the film draws ${c1.length} Captains`);
  const push = kind === 'EJECT' && frame.push !== 1 ? `scale(${frame.push})` : '';
  if ((m.push ?? '') !== push) problems.push(`the Command Room's art is "${m.push}"; the frame "${push}"`);

  // The subjects, each as its state says, where it says.
  const filmed = seat => m.figures.filter(figure => figure.film && figure.seat === seat && !figure.exterior);
  for (const [seat, subject] of subjects) {
    const { person } = subject;
    const drawn = filmed(seat);
    const want = person.state === 'settled' || person.state === 'gone' ? [] : person.state === 'across' ? ['board'] : person.state === 'land' ? [subject.to.room] : ['jail'];
    const rooms = drawn.map(figure => (figure.flyer ? 'board' : figure.room));
    if (JSON.stringify(rooms) !== JSON.stringify(want)) problems.push(`seat ${seat} (${person.state}) drawn in ${rooms.join(',') || 'nothing'}; the frame ${want.join(',') || 'nothing'}`);
    for (const figure of drawn) {
      const outfit = person.state === 'land' ? 'crew' : 'prison';
      if (figure.outfit !== outfit) problems.push(`seat ${seat} (${person.state}) in the ${figure.outfit} clothes; the board dresses it in ${outfit}`);
      if (figure.silhouette !== (person.state === 'pulled')) problems.push(`seat ${seat} (${person.state}) is ${figure.silhouette ? '' : 'not '}a silhouette`);
      if (figure.memorial !== (person.state === 'dissolve')) problems.push(`seat ${seat} (${person.state}) is ${figure.memorial ? '' : 'not '}a grey cut-out`);
    }
  }
  if (m.figures.some(figure => figure.film && !subjects.has(figure.seat) && !(captainSeat && figure.seat === captainSeat.seat))) problems.push('the film draws someone it is not about');
  if (kind === 'RELEASE') {
    for (const key of ['airlock', 'exterior', 'label']) if (m[key]) problems.push(`a ${key} in a RELEASE`);
    if (m.suction.length || m.emergency.length || m.debris.length) problems.push('suction, debris or the emergency light in a RELEASE');
    const crossing = frame.people.filter(person => person.state === 'across').length;
    if (m.trail.length !== crossing) problems.push(`${m.trail.length} trails for ${crossing} crossing`);
    const landing = frame.people.filter(person => person.state === 'land').length;
    if (m.puff.length !== landing) problems.push(`${m.puff.length} landing puffs for ${landing} landing`);
    return problems;
  }
  // EJECT: the emergency light over the Command Room's and the Jail's art; the airlock, the suction, the debris, the
  // label and the exterior as the frame says.
  const emergencyRooms = m.emergency.map(node => node.room).sort().join();
  if (emergencyRooms !== (frame.emergency > 0 ? 'command-room,jail' : '')) problems.push(`the emergency light over ${emergencyRooms || 'nothing'}; the frame ${frame.emergency}`);
  for (const node of m.emergency) if (!near(node.opacity, frame.emergency * (reduced ? frame.opacity : 1), 0.011)) problems.push(`the emergency light at ${node.opacity}; the frame ${frame.emergency}`);
  if (Boolean(m.airlock) !== frame.airlock.reveal > 0) problems.push(`the airlock is ${m.airlock ? 'drawn' : 'missing'}; the frame ${frame.airlock.reveal}`);
  if (m.airlock) {
    if (!sameBox(m.airlock, inJail(AIRLOCK.box))) problems.push('the airlock is not where AIRLOCK puts it');
    if (m.airlock.data.open !== String(frame.airlock.open) || m.airlock.data.clamps !== String(frame.airlock.clamps)) problems.push(`the airlock is ${m.airlock.data.open}/${m.airlock.data.clamps}; the frame ${frame.airlock.open}/${frame.airlock.clamps}`);
    // Its rim whole in the Jail's panel and below its caption.
    const [cx, cy] = AIRLOCK.c;
    const rim = { left: jail.left + jailFrame.tx + (cx - AIRLOCK.r - 6) * jailFrame.k, top: jail.top + jailFrame.ty + (cy - AIRLOCK.r - 6) * jailFrame.k, right: jail.left + jailFrame.tx + (cx + AIRLOCK.r + 6) * jailFrame.k };
    if (rim.left < jail.left - 0.5 || rim.right > jail.left + jail.width + 0.5) problems.push('the airlock\'s rim leaves the Jail\'s panel');
    if (rim.top < m.captions.jail.bottom) problems.push('the airlock\'s rim is in the caption\'s band');
  }
  if (m.suction.length !== (frame.suction.opacity > 0 ? 1 : 0) || (m.suction[0] && m.suction[0].file !== `suction-${frame.suction.frame}.svg`)) problems.push(`the suction is ${m.suction.map(node => node.file).join() || 'missing'}; the frame ${frame.suction.opacity > 0 ? frame.suction.frame : 'none'}`);
  if (frame.debris.opacity <= 0 && m.debris.length) problems.push('debris outside its beat');
  if (Boolean(m.label) !== frame.label.opacity > 0) problems.push(`EJECTED is ${m.label ? 'drawn' : 'missing'}; the frame ${frame.label.opacity}`);
  if (m.label) {
    if (m.label.text !== 'Ejected') problems.push(`the label says ${m.label.text}`);
    if (m.label.left < jail.left - 0.5 || m.label.right > jail.left + jail.width + 0.5 || m.label.bottom > jail.top + jail.height + 0.5) problems.push('EJECTED leaves the Jail\'s panel');
    if (overlap(m.label, m.captions.jail)) problems.push('EJECTED is over the Jail\'s caption');
  }
  if (Boolean(m.exterior) !== frame.exterior.opacity > 0) problems.push(`the exterior is ${m.exterior ? 'drawn' : 'missing'}; the frame ${frame.exterior.opacity}`);
  if (m.exterior) {
    if (!sameBox(m.exterior, jail)) problems.push('the exterior does not cover the Jail\'s panel');
    const drifting = m.figures.filter(figure => figure.exterior);
    const living = outcome.subjects.filter(subject => !subject.body).length;
    if (drifting.length !== living || drifting.some(figure => !figure.silhouette)) problems.push(`${drifting.length} silhouettes drifting; ${living} living ejected`);
  }
  if (Boolean(m.plaque) !== (off > 0 && frame.plaque > 0)) problems.push(`the plaque is ${m.plaque ? 'drawn' : 'missing'} during the film; the frame ${frame.plaque}`);
  return problems;
}

/** The Captain's films' page comparisons, with pageAt(viewport, query) loading a page's markup. */
/** Reads the overflow beat's page back (&film=overflow&beds=4): its stage, the FULL stamp, the victim's figures, the flyer, the plaque and the live region. */
const MEASURE_OVERFLOW = `(() => {
  const app = document.getElementById('v2-app');
  const box = node => { const b = node.getBoundingClientRect(); return { left: b.left, top: b.top, width: b.width, height: b.height }; };
  const layout = node => ({ left: node.offsetLeft, top: node.offsetTop, width: node.offsetWidth, height: node.offsetHeight });
  const opacity = node => Number(getComputedStyle(node).opacity);
  const one = selector => { const node = app.querySelector(selector); return node ? { ...box(node), layout: layout(node), opacity: opacity(node), text: node.textContent, data: { ...node.dataset } } : null; };
  return {
    stage: document.documentElement.dataset.stage ?? null,
    live: app.querySelector('[data-live]')?.textContent ?? '',
    stamp: one('.v2-ovf__stamp'),
    flyer: one('.v2-ovf__flyer'),
    plaque: one('.v2-plaque'),
    plaques: app.querySelectorAll('.v2-plaque').length,
    victim: [...app.querySelectorAll('.v2-room .v2-fig[data-seat="5"]')].map(node => ({ room: node.closest('.v2-room').dataset.room, memorial: node.classList.contains('v2-fig--memorial'), opacity: opacity(node), film: node.dataset.film ?? null, layout: layout(node) })),
    caption: one('.v2-room[data-room=hospital] .v2-cap'),
    filmNodes: app.querySelectorAll('[data-film=overflow]').length,
    words: document.body.innerText,
  };
})()`;

/** What is wrong with an overflow beat's page: each part where and as overflowFrame() and fx/overflow.mjs put it, and nothing outside the beat. */
function problemsOfOverflow(shot, m) {
  const problems = [];
  const query = new URLSearchParams(shot.query);
  const roster = Number(query.get('roster') ?? 9);
  const reduced = query.get('motion') === 'reduced';
  const t = Number(query.get('t'));
  const [width, height] = shot.viewport;
  const frame = overflowFrame(t, { reduced });
  const end = overflowEnd(reduced);
  const during = t >= 0 && t < end;
  const board = FOUR_LAYOUT.fitBoardV2({ width, height }, roster);
  const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
  const { subject } = overflowOutcome(roster);
  if (m.stage !== frame.stage) problems.push(`the page is at ${m.stage}; the frame at ${frame.stage}`);
  const words = during && frame.announce ? overflowWords(subject.seat) : '';
  if (m.live !== words) problems.push(`the live region says ${JSON.stringify(m.live)}, not ${JSON.stringify(words)}`);
  if (PRIVATE_WORDS.test(m.words)) problems.push(`a side or role word on the page: ${PRIVATE_WORDS.exec(m.words)[0]}`);
  if (!during && m.filmNodes) problems.push(`${m.filmNodes} nodes of the beat on the page ${t >= end ? 'after its end' : 'before it'}`);
  // The FULL stamp: beside the Hospital's caption, in its band, as the frame has it.
  const presses = FOUR_LAYOUT.slotRects('hospital', roster, board.panels.hospital).map(rect => ({ left: rect.left, top: rect.top, width: rect.side, height: rect.side }));
  const meets = (a, b) => a.left < b.left + b.width - 0.01 && b.left < a.left + a.width - 0.01 && a.top < b.top + b.height - 0.01 && b.top < a.top + a.height - 0.01;
  const stampAt = m.caption && m.stamp ? fullStampBox({ caption: m.caption.layout, size: [m.stamp.layout.width, m.stamp.layout.height], panel: board.panels.hospital, keepClear: presses }) : null;
  const stampOn = during && frame.full.opacity > 0;
  if (m.stamp && !stampOn) problems.push(`the FULL stamp is drawn; the frame's at ${frame.full.opacity}`);
  if (!m.stamp && stampOn && m.caption && fullStampBox({ caption: m.caption.layout, size: [40, 18], panel: board.panels.hospital, keepClear: presses })) problems.push('the FULL stamp is missing where there is room for it');
  if (m.stamp && m.caption) {
    const at = stampAt;
    if (!at || !near(m.stamp.layout.left, at.left) || !near(m.stamp.layout.top, at.top)) problems.push('the FULL stamp is not where fullStampBox() puts it');
    for (const box of [m.caption.layout, ...presses]) if (meets(m.stamp.layout, box)) problems.push(`the FULL stamp meets ${JSON.stringify(box)}`);
    if (!near(m.stamp.opacity, frame.full.opacity, 0.02)) problems.push(`the FULL stamp at ${m.stamp.opacity}; the frame's ${frame.full.opacity}`);
    if (m.stamp.text.trim().toLowerCase() !== 'full') problems.push(`the stamp says ${m.stamp.text}`);
  }
  // The victim: at its place only while the frame draws it there, its own figure and its grey cut-out as the frame has them.
  const own = m.victim.filter(figure => !figure.memorial), grey = m.victim.filter(figure => figure.memorial);
  if (m.victim.some(figure => figure.room !== subject.room)) problems.push(`the victim drawn in ${m.victim.map(figure => figure.room).join(', ')}, not only at ${subject.room}`);
  if ((own.length > 0) !== (during && frame.figure.opacity > 0)) problems.push(`the victim's own figure ${own.length ? 'drawn' : 'missing'}; the frame's at ${frame.figure.opacity}`);
  if ((grey.length > 0) !== (during && frame.figure.grey > 0)) problems.push(`the victim's grey cut-out ${grey.length ? 'drawn' : 'missing'}; the frame's at ${frame.figure.grey}`);
  for (const [figures, want] of [[own, frame.figure.opacity], [grey, frame.figure.grey]]) for (const figure of figures) if (!near(figure.opacity, want, 0.02)) problems.push(`a victim figure at ${figure.opacity}, the frame's ${want}`);
  // The plaque: in the spine between the Hospital and the Jail, counting the published snapshot's seats off the board.
  const count = !during || frame.plaque.counted ? 1 : 0;
  if (m.plaques !== (count > 0 ? 1 : 0)) problems.push(`${m.plaques} plaques; ${count} off the board`);
  let center = null;
  if (m.plaque) {
    if (m.plaque.text !== String(count)) problems.push(`the plaque says ${m.plaque.text}, not ${count}`);
    const at = spinePlaqueBox({ hospital: board.boxes.hospital, jail: board.boxes.jail, border: board.shell.border, cap: board.panels.hospital.cap, size: [m.plaque.layout.width, m.plaque.layout.height] });
    if (!at || !near(m.plaque.layout.left, at.left - board.boardLeft) || !near(m.plaque.layout.top, at.top - board.boardTop)) problems.push('the plaque is not where spinePlaqueBox() puts it');
    if (at) center = [at.left + at.width / 2, at.top + at.height / 2];
  }
  // The flyer: on overflowWay() from the victim's press point to the plaque's centre (where the plaque is, or will be once
  // it counts the victim: in the spine's middle, in the caption band), at the frame's share of the way.
  if (Boolean(m.flyer) !== Boolean(during && frame.flyer)) problems.push(`the flyer is ${m.flyer ? 'drawn' : 'missing'}; the frame ${frame.flyer ? 'has one' : 'has none'}`);
  if (m.flyer && frame.flyer) {
    const to = (m.flyer.data.to ?? '').split(',').map(Number);
    const spineMiddle = board.boxes.hospital.left + board.boxes.hospital.width + (board.boxes.jail.left - board.boxes.hospital.left - board.boxes.hospital.width) / 2;
    const bandTop = board.boxes.hospital.top + board.shell.border;
    if (to.length !== 2 || !near(to[0], spineMiddle, 0.6) || to[1] < bandTop - 0.5 || to[1] > bandTop + board.panels.hospital.cap + 4) problems.push(`the flyer heads for ${to.join(',')}, not the plaque's place in the spine`);
    if (center && (!near(to[0], center[0], 0.6) || !near(to[1], center[1], 0.6))) problems.push('the flyer heads elsewhere than the plaque');
    center = to;
  }
  if (m.flyer && frame.flyer && center) {
    const room = subject.room;
    const slot = slotsFour.slotsOf(room, roster).find(entry => entry.id === subject.slot);
    const scene = frameScene(slotsFour.sceneOf(room, roster), board.panels[room]);
    const press = [board.boxes[room].left + board.shell.border + scene.tx + slot.pressAt[0] * scene.k, board.boxes[room].top + board.shell.border + scene.ty + slot.pressAt[1] * scene.k];
    const [BX, BY] = FRAME.box, [AX] = FRAME.anchor;
    const unit = slot.scale * scene.k;
    const [pxF, pyF] = pressPoint(skeletonOf(slot.gesture));
    const pressIn = [slot.mirror ? (2 * (AX - BX) - (pxF - BX)) * unit : (pxF - BX) * unit, (pyF - BY) * unit];
    const [x, y] = overflowWay(press, center, frame.flyer.v);
    if (!near(m.flyer.layout.left, x - board.boardLeft - pressIn[0], 1.5) || !near(m.flyer.layout.top, y - board.boardTop - pressIn[1], 1.5)) problems.push(`the flyer is at ${m.flyer.layout.left.toFixed(1)},${m.flyer.layout.top.toFixed(1)}; overflowWay() puts it at ${(x - board.boardLeft - pressIn[0]).toFixed(1)},${(y - board.boardTop - pressIn[1]).toFixed(1)}`);
    if (!near(m.flyer.opacity, frame.flyer.opacity, 0.02)) problems.push(`the flyer at ${m.flyer.opacity}; the frame's ${frame.flyer.opacity}`);
  }
  return problems;
}

/** Reads the Clone's card back (&film=clone): its parts, their opacity and place, the stamps, the sheet's body, the Pass and a pointer at every target. */
const MEASURE_CLONE = `(() => {
  const box = node => { if (!node) return null; const b = node.getBoundingClientRect(); return { left: b.left, top: b.top, width: b.width, height: b.height }; };
  const hits = node => { const b = node.getBoundingClientRect(); return [[b.left + b.width / 2, b.top + b.height / 2], [b.left + 3, b.top + 3], [b.right - 3, b.top + 3], [b.left + 3, b.bottom - 3], [b.right - 3, b.bottom - 3]].filter(([x, y]) => { const hit = document.elementFromPoint(x, y); return hit && (hit === node || node.contains(hit)); }).length; };
  const card = document.querySelector('.v2-clone');
  const body = card ? card.closest('.v2-sheet-ui__body') : null;
  const part = name => { const node = card && card.querySelector('[data-part="' + name + '"]'); if (!node) return null; const style = getComputedStyle(node); return { ...box(node), opacity: Number(style.opacity), display: style.display, density: node.dataset.density ?? null, over: node.dataset.over ?? null, edge: node.dataset.edge ? Number(node.dataset.edge) : null, drawn: node.innerHTML.length }; };
  return {
    stage: document.documentElement.dataset.stage ?? null,
    scrolls: document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1,
    turns: document.querySelectorAll('.v2-turns').length,
    card: card ? { ...box(card), hidden: card.hidden, border: card.clientLeft, borderTop: card.clientTop, line: card.querySelector('.v2-clone__line')?.textContent ?? null, label: card.getAttribute('aria-label'),
      portrait: box(card.querySelector('.v2-clone__portrait')),
      parts: Object.fromEntries(['real', 'outline', 'halftone', 'clone', 'scan'].map(name => [name, part(name)])),
      stamps: Object.fromEntries([...card.querySelectorAll('[data-stamp]')].map(node => [node.dataset.stamp, { ...box(node), opacity: Number(getComputedStyle(node).opacity), text: node.textContent }])) } : null,
    body: body ? { ...box(body), scroll: body.scrollHeight - body.clientHeight } : null,
    pass: box(document.querySelector('.v2-pass')),
    targets: [...document.querySelectorAll('.v2-slot-hit')].map(node => ({ room: node.closest('[data-room]')?.dataset.room ?? null, slot: node.dataset.slot, hits: hits(node) })),
    words: document.body.innerText,
  };
})()`;

/** The Clone's card measured against its frame and its layout; on anyone else's screen, nothing of it. */
function problemsOfClone(shot, m) {
  const problems = [];
  const query = new URLSearchParams(shot.query);
  const viewer = query.get('viewer') ?? 'own';
  const roster = Number(query.get('roster') ?? 9);
  const reduced = query.get('motion') === 'reduced';
  const state = query.get('state');
  const c = cloneCase(query.get('case') ?? 'activate', roster);
  const near = (a, b, tol = 0.6) => Math.abs(a - b) <= tol;
  const inside = (a, b, tol = 0.6) => a.left >= b.left - tol && a.top >= b.top - tol && a.left + a.width <= b.left + b.width + tol && a.top + a.height <= b.top + b.height + tol;
  if (m.scrolls) problems.push('the page scrolls');
  if (PRIVATE_WORDS.test(m.words)) problems.push(`a side or role word on the page: ${PRIVATE_WORDS.exec(m.words)[0]}`);
  // Every target live: a real pointer lands on each, but on the Hospital's and the Jail's under the Alien's sheet (the controls take turns).
  for (const target of m.targets) if (!(viewer === 'own' && SHEET_ROOMS.includes(target.room)) && target.hits !== 5) problems.push(`${target.room} ${target.slot}: a pointer lands on it ${target.hits} times in 5`);
  if (viewer !== 'own') {
    if (m.card || m.turns) problems.push(`the ${viewer}'s screen draws ${m.card ? 'the Clone\'s card' : 'a sheet'}`);
    return problems;
  }
  const film = state ? null : cloneFilmFor({ before: c.before, after: c.after, live: true });
  const f = film ? cloneFrame(film, Number(query.get('t')), { reduced }) : cloneFrame(state === 'active' ? 'activate' : 'expire', Infinity, { reduced });
  if (!m.card) return [...problems, 'no card on the Alien\'s own screen'];
  if (m.card.hidden !== !f.card) problems.push(`the card is ${m.card.hidden ? 'hidden' : 'shown'}; the frame ${f.card ? 'draws' : 'does not draw'} it`);
  if (m.stage !== f.stage) problems.push(`the page is at ${m.stage}; the frame at ${f.stage}`);
  if (m.card.line !== cloneWords(c.after)) problems.push(`the status line says ${JSON.stringify(m.card.line)}, not the client's ${JSON.stringify(cloneWords(c.after))}`);
  if (m.card.label !== 'Your Clone') problems.push(`the card is labelled ${m.card.label}`);
  // The sheet's body where turnsLayout() and cloneBodyHeight() put it; the card whole in it, never scrolled, clear of the Pass.
  const enlarged = query.get('text') === '2';
  const layout = layoutOf(shot).turnsLayout({ width: shot.viewport[0], height: shot.viewport[1] }, roster, { insets: insetsOf(null), bars: enlarged ? ENLARGED.bars : null, actions: enlarged ? ENLARGED.actions : SHEET.actions });
  const { sheet } = layout;
  const bodyHeight = cloneBodyHeight(sheet, layout.board.pass);
  if (!m.body || !near(m.body.left, sheet.body.left) || !near(m.body.top, sheet.body.top) || !near(m.body.width, sheet.body.width) || !near(m.body.height, bodyHeight)) problems.push('the sheet\'s body is not where turnsLayout() and cloneBodyHeight() put it');
  if (m.body && m.body.scroll > 0.5) problems.push(`the card is ${m.body.scroll.toFixed(1)} px taller than its body: it scrolls`);
  if (m.body && m.pass && m.body.top + m.body.height > m.pass.top - PASS_GAP + 0.6) problems.push('the sheet\'s body reaches the raised Pass');
  if (m.body && !inside(m.card, m.body)) problems.push('the card leaves the sheet\'s body');
  // Its parts where cloneCardLayout() puts them for the card's height, in the card's padding box.
  const card = cloneCardLayout({ width: sheet.body.width, height: m.card.height });
  const ox = m.card.left + m.card.border, oy = m.card.top + m.card.borderTop;
  const at = (rect, want, name) => { if (!rect || !near(rect.left - ox, want.left) || !near(rect.top - oy, want.top) || !near(rect.width, want.width) || !near(rect.height, want.height)) problems.push(`the ${name} is not where cloneCardLayout() puts it`); };
  at(m.card.portrait, card.portrait, 'portrait');
  const boxOf = place => ({ left: place.left, top: place.top, width: place.size, height: place.size });
  for (const [name, place] of [['real', card.real], ['outline', card.real], ['halftone', card.clone], ['clone', card.clone]]) at(m.card.parts[name], boxOf(place), name === 'real' ? 'character' : name);
  // Each part as the frame has it.
  for (const name of ['real', 'outline', 'clone', 'halftone']) if (!near(m.card.parts[name]?.opacity ?? -1, f[name].opacity, 0.02)) problems.push(`the ${name} at ${m.card.parts[name]?.opacity}; the frame's ${f[name].opacity}`);
  if (f.halftone.opacity > 0 && (Number(m.card.parts.halftone.density) !== f.halftone.density || !m.card.parts.halftone.drawn)) problems.push(`the halftone at density ${m.card.parts.halftone.density}; the frame's ${f.halftone.density}`);
  // The scan band over its figure, its leading edge where the frame puts it (to 1 px).
  const scan = m.card.parts.scan;
  if (Boolean(f.scan) !== (scan.display !== 'none')) problems.push(`the scan band is ${scan.display !== 'none' ? 'drawn' : 'missing'}; the frame ${f.scan ? 'has one' : 'has none'}`);
  if (f.scan && scan.display !== 'none') {
    const place = f.scan.over === 'real' ? card.real : card.clone;
    const head = place.top + (FIGURE_SPAN.top - FRAME.box[1]) * place.unit - card.portrait.top, feet = place.feet[1] - card.portrait.top;
    const edge = feet - f.scan.y * (feet - head);
    if (scan.over !== f.scan.over || !near(scan.edge, edge, 1)) problems.push(`the scan band is over the ${scan.over} at ${scan.edge}; the frame's over the ${f.scan.over} at ${edge.toFixed(2)}`);
    if (!near(scan.opacity, f.scan.opacity, 0.02)) problems.push(`the scan band at ${scan.opacity}; the frame's ${f.scan.opacity}`);
  }
  // The stamps: as the frame has them, the page's text, whole in the card and clear of the portrait.
  for (const key of ['active', 'ended']) {
    const stamp = m.card.stamps[key];
    if (!stamp) { problems.push(`no ${key} stamp`); continue; }
    if (!near(stamp.opacity, f.stamps[key].opacity, 0.02)) problems.push(`CLONE ${key.toUpperCase()} at ${stamp.opacity}; the frame's ${f.stamps[key].opacity}`);
    if (stamp.text !== (key === 'active' ? 'Clone active' : 'Clone ended')) problems.push(`the ${key} stamp says ${stamp.text}`);
    if (stamp.opacity > 0 && !inside(stamp, m.card)) problems.push(`CLONE ${key.toUpperCase()} leaves the card`);
    if (stamp.opacity > 0 && stamp.left < m.card.portrait.left + m.card.portrait.width + 2) problems.push(`CLONE ${key.toUpperCase()} meets the portrait`);
  }
  return problems;
}

/**
 * The Clone (S3): nothing of it outside the Alien's own sheet. The Alien's page without its sheet is another player's
 * page, at both phones, in both films, in the Jail and on the four-berth board; another player's page is the display's;
 * the Alien's board does not change through the film; and the Alien's page asks for nothing another player's does not.
 * open(viewport, query) gives a page's { html, requests }.
 */
async function cloneComparisons(open) {
  const out = [];
  const MARK = '<div class="v2-turns" data-ui="sheet" data-film="clone">';
  const without = page => (page.html.includes(MARK) ? page.html.slice(0, page.html.indexOf(MARK)) : null);
  const base = 'roster=9&film=clone&capsule=1';
  for (const [viewport, query, what] of [[[390, 844], '&case=activate&t=1100', 'during the activation (1100 ms)'], [[320, 568], '&case=activate&t=1100', 'during the activation (1100 ms)'], [[390, 844], '&case=expire&t=450', 'during the expiry (450 ms)'], [[390, 844], '&case=jailed&state=active', 'in the Jail, the card at rest'], [[390, 844], '&beds=4&case=activate&t=1100', 'on the four-berth board, during the activation (1100 ms)']]) {
    const [own, player] = await Promise.all(['own', 'player'].map(viewer => open(viewport, `${base}${query}&viewer=${viewer}`)));
    out.push({ compare: `the Clone's card: the Alien's own page without its sheet and another player's page, ${what}, ${vp(viewport)}`, same: without(own) !== null && without(own) === player.html });
  }
  const at390 = [390, 844];
  const [player, display] = await Promise.all(['player', 'display'].map(viewer => open(at390, `${base}&case=activate&t=1100&viewer=${viewer}`)));
  out.push({ compare: 'the Clone\'s card: another player\'s page and the display\'s, during the activation (1100 ms), 390x844', same: player.html === display.html });
  const [during, after] = await Promise.all([1100, 1900].map(t => open(at390, `${base}&case=activate&t=${t}`)));
  out.push({ compare: 'the Clone\'s card: the Alien\'s own page without its sheet during the activation (1100 ms) and after it (1900 ms), 390x844', same: without(during) !== null && without(during) === without(after) });
  for (const [query, what] of [['&case=activate&t=1100', 'the activation (1100 ms)'], ['&case=expire&t=450', 'the expiry (450 ms)']]) {
    const [own, other] = await Promise.all(['own', 'player'].map(viewer => open(at390, `${base}${query}&viewer=${viewer}`)));
    out.push({ compare: `the Clone's card: the requests of the Alien's own page and of another player's, during ${what}, 390x844`, same: own.requests.length > 0 && JSON.stringify(own.requests) === JSON.stringify(other.requests) });
  }
  return out;
}

/**
 * The successor's four-berth board: outside the Hospital, the current board's rooms exactly; the overflow beat public, nothing
 * left of it once over, and no room touched but the victim's and the Hospital; #158's rescue public on four berths, touching
 * no room but the Hospital and the room its subject is marked away in.
 */
async function fourComparisons(pageAt) {
  const out = [];
  const rooms = (page, keep) => JSON.stringify(Object.entries(JSON.parse(page.rooms)).filter(([room]) => keep.includes(room)));
  const notHospital = ['command-room', 'room-a', 'room-b', 'jail'];
  for (const viewport of [[390, 844], [320, 568]]) {
    for (const extra of ['', '&capsule=1']) {
      const [current, four] = await Promise.all(['', '&beds=4'].map(beds => pageAt(viewport, `roster=9&fixture=mixed${extra}${beds}`)));
      out.push({ compare: `every room but the Hospital on the four-berth board and on the current one, ${vp(viewport)}${extra ? ', with the capsule' : ''}`, same: rooms(current, notHospital) === rooms(four, notHospital) });
    }
    for (const reducedMotion of ['', '&motion=reduced']) {
      const after = reducedMotion ? overflowEnd(true) + 50 : 2900;
      const [done, ahead] = await Promise.all([after, -1].map(t => pageAt(viewport, `roster=9&beds=4&film=overflow&t=${t}${reducedMotion}`)));
      out.push({ compare: `the page after the overflow beat (${after} ms) and before it, ${vp(viewport)}${reducedMotion ? ', reduced motion' : ''}`, same: done.html === ahead.html });
    }
  }
  const at390 = [390, 844];
  for (const t of [700, 1600]) {
    const [player, display] = await Promise.all(['', '&viewer=display'].map(viewer => pageAt(at390, `roster=9&beds=4&film=overflow&t=${t}${viewer}`)));
    out.push({ compare: `the overflow beat on the display and on a player's screen, 390x844, ${t} ms`, same: player.html === display.html });
  }
  for (const t of [700, 1600, 2350]) {
    const [during, ahead] = await Promise.all([t, -1].map(time => pageAt(at390, `roster=9&beds=4&film=overflow&t=${time}`)));
    const keep = ['command-room', 'room-a', 'jail'];
    out.push({ compare: `${keep.join(', ')} during the overflow beat (${t} ms) and before it, 390x844`, same: rooms(during, keep) === rooms(ahead, keep) });
  }
  const [player, display] = await Promise.all(['', '&viewer=display'].map(viewer => pageAt(at390, `roster=9&beds=4&film=rescue&t=2600${viewer}`)));
  out.push({ compare: 'the rescue on four berths on the display and on a player\'s screen, 390x844, 2600 ms', same: player.html === display.html });
  const [during, ahead] = await Promise.all([2600, -1].map(time => pageAt(at390, `roster=9&beds=4&film=rescue&t=${time}`)));
  out.push({ compare: 'command-room, room-b, jail during the rescue on four berths (2600 ms) and before it, 390x844', same: rooms(during, ['command-room', 'room-b', 'jail']) === rooms(ahead, ['command-room', 'room-b', 'jail']) });
  return out;
}

async function captainComparisons(pageAt) {
  const out = [];
  const rooms = (page, keep) => JSON.stringify(Object.entries(JSON.parse(page.rooms)).filter(([room]) => keep.includes(room)));
  const boxOf = page => JSON.stringify(JSON.parse(page.bar)[0]?.slice(0, 5) ?? null);
  for (const viewport of [[390, 844], [320, 568]]) {
    const base = 'roster=9&capsule=1';
    for (const query of ['film=release&t=2600', 'film=eject&t=3500']) {
      const [player, display] = await Promise.all([pageAt(viewport, `${base}&${query}`), pageAt(viewport, `${base}&${query}&viewer=display`)]);
      out.push({ compare: `the Captain's ${query.split('&')[0].slice(5)} film on the display and on a player's screen, ${vp(viewport)}, ${query}`, same: player.html === display.html });
    }
    for (const [film, outcome, after, before] of [['release', 'release', 4300, -1], ['release', 'release-full', 4300, -1], ['eject', 'eject', 7300, -1], ['eject', 'eject-full', 7300, -1]]) {
      for (const reducedMotion of ['', '&motion=reduced']) {
        const a = reducedMotion ? (film === 'release' ? releaseEnd(true) : ejectEnd(true)) + 50 : after;
        const [done, ahead] = await Promise.all([a, before].map(t => pageAt(viewport, `${base}&film=${film}&outcome=${outcome}&t=${t}${reducedMotion}`)));
        out.push({ compare: `the page after the ${outcome} film (${a} ms) and before it (${before} ms), ${vp(viewport)}${reducedMotion ? ', reduced motion' : ''}`, same: done.html === ahead.html });
      }
    }
    // The rooms a film never touches: during a RELEASE the Hospital (its detainee stays); during an EJECT the Hospital
    // and Rooms A and B.
    for (const [film, t, keep] of [['release', 1500, ['hospital']], ['release', 3000, ['hospital']], ['eject', 1200, ['room-a', 'room-b', 'hospital']], ['eject', 3500, ['room-a', 'room-b', 'hospital']], ['eject', 4900, ['room-a', 'room-b', 'hospital']]]) {
      const [during, ahead] = await Promise.all([t, -1].map(time => pageAt(viewport, `${base}&film=${film}&t=${time}`)));
      out.push({ compare: `${keep.join(', ')} during the ${film} film (${t} ms) and before it, ${vp(viewport)}`, same: rooms(during, keep) === rooms(ahead, keep) });
    }
    const bars = await Promise.all([`${base}&fixture=mixed`, `${base}&film=release&t=2600`, `${base}&film=eject&t=3500`].map(query => pageAt(viewport, query)));
    out.push({ compare: `the top bar's box on the plain board and in each Captain film, ${vp(viewport)}`, same: bars.every(page => boxOf(page) === boxOf(bars[0])) && boxOf(bars[0]) !== 'null' });
  }
  return out;
}

/** What a pointer measurement says is wrong: a slot's press area under something else, or smaller than 44 px. */
function pointerProblems(measured) {
  const problems = [];
  for (const slot of measured.pointer) {
    if (slot.side < 43.5) problems.push(`${slot.slot}: a ${slot.side.toFixed(1)} px button`);
    for (const miss of slot.missed) problems.push(`${slot.slot}: a pointer at ${miss.x},${miss.y} lands on ${miss.hit}`);
  }
  return problems;
}

/** Reads the real controls' places back (&ui=): the bars, every room, the choosing row or the sheet, the rings, and a pointer at every target and control. */
const MEASURE_TURNS = `(() => {
  const box = node => { if (!node) return null; const b = node.getBoundingClientRect(); return { left: b.left, top: b.top, width: b.width, height: b.height, right: b.right, bottom: b.bottom }; };
  const shown = node => Boolean(node) && getComputedStyle(node).display !== 'none';
  // A real pointer at the centre and at each corner 3 px inside: how many land on the node.
  const hits = (node, corners = true) => { const b = node.getBoundingClientRect(); const points = [[b.left + b.width / 2, b.top + b.height / 2], ...(corners ? [[b.left + 3, b.top + 3], [b.right - 3, b.top + 3], [b.left + 3, b.bottom - 3], [b.right - 3, b.bottom - 3]] : [])]; return points.filter(([x, y]) => { const hit = document.elementFromPoint(x, y); return hit && (hit === node || node.contains(hit)); }).length; };
  const sheet = document.querySelector('.v2-sheet-ui');
  const body = sheet ? sheet.querySelector('.v2-sheet-ui__body') : null;
  const claim = sheet ? sheet.querySelector('.v2-ui-claim, .v2-ui-claimrow') : null;
  const receipt = sheet ? sheet.querySelector('.v2-ui-receipt .v2-ui-button') : null;
  return {
    ui: document.documentElement.dataset.ui ?? null,
    fallback: document.documentElement.dataset.fallback ?? null,
    unfit: Boolean(document.querySelector('.v2-unfit')),
    scrolls: document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1,
    top: box(document.querySelector('.v2-top')),
    nav: shown(document.querySelector('.v2-nav')) ? box(document.querySelector('.v2-nav')) : null,
    pass: shown(document.querySelector('.v2-pass')) ? box(document.querySelector('.v2-pass')) : null,
    phase: document.querySelector('.v2-top__phase')?.textContent ?? null,
    rooms: Object.fromEntries([...document.querySelectorAll('.v2-room[data-room]')].map(node => [node.dataset.room, box(node)])),
    choosing: box(document.querySelector('.v2-choosing')),
    controls: [...document.querySelectorAll('.v2-choosing .v2-ui-button')].map(node => ({ ...box(node), label: node.textContent, hits: hits(node) })),
    count: document.querySelector('.v2-choosing__count')?.textContent ?? null,
    rings: [...document.querySelectorAll('.v2-ring')].map(node => ({ ...box(node), seat: Number(node.dataset.seat), target: node.dataset.target, chosen: node.classList.contains('v2-ring--chosen') })),
    sheet: sheet ? { ...box(sheet), claim: sheet.dataset.claim, scroll: Number(sheet.dataset.scroll), body: { ...box(body), overflow: body.scrollHeight - body.clientHeight },
      actions: [...sheet.querySelectorAll('.v2-sheet-ui__actions')].map(node => ({ part: node.dataset.part, ...box(node), buttons: [...node.querySelectorAll('.v2-ui-button')].map(button => ({ ...box(button), label: button.textContent, hits: hits(button) })) })),
      claimBlock: claim ? { ...box(claim), folded: claim.classList.contains('v2-ui-claimrow'), hits: hits(claim, false) } : null,
      receipt: receipt ? { ...box(receipt), hits: hits(receipt) } : null } : null,
    targets: [...document.querySelectorAll('.v2-slot-hit')].map(node => ({ room: node.closest('[data-room]')?.dataset.room ?? null, slot: node.dataset.capsuleTarget ?? node.dataset.slot, ...box(node), hits: hits(node) })),
    words: document.body.innerText,
  };
})()`;

/** The pair seated in the capsule at a page's stage and moment, as the film draws them: [{ id, seat }]. */
function seatedPair(query) {
  if (query.get('film') !== 'capsule') return [];
  const pair = (query.get('pair') ?? '1,5').split(',').map(Number).sort((a, b) => a - b);
  const ids = CAPSULE_SEATS.map(seat => seat.id).slice(0, Math.min(2, Math.max(0, Number(query.get('known') ?? 2))));
  const known = Object.fromEntries(ids.map((id, index) => [id, query.get('settled') === '1' || (query.get('late') === '1' && index === 1) ? 'settled' : 'live']));
  const frame = capsuleFrame(query.get('stage') ?? 'idle', Number(query.get('t') ?? 0), { known, reduced: query.get('motion') === 'reduced' });
  return ids.filter(id => frame.people[id]?.capsule.state === 'seated').map(id => ({ id, seat: pair[ids.indexOf(id)] }));
}

/** The real controls' places as turns.mjs lays them out for a page's viewport, roster, insets and text size. */
function turnsOf(viewport, query) {
  const { turnsLayout } = query.get('beds') === '4' ? FOUR_LAYOUT : CURRENT_LAYOUT;
  const enlarged = query.get('text') === '2';
  return turnsLayout({ width: viewport[0], height: viewport[1] }, Number(query.get('roster') ?? 9), { insets: insetsOf(query.get('safe')), bars: enlarged ? ENLARGED.bars : null, actions: enlarged ? ENLARGED.actions : undefined });
}

function problemsOfTurns(shot, m) {
  const { boardTargets } = layoutOf(shot);
  const problems = [];
  const query = new URLSearchParams(shot.query);
  const roster = Number(query.get('roster') ?? 9);
  const layout = turnsOf(shot.viewport, query);
  const near = (a, b) => Math.abs(a - b) <= 0.6;
  const at = (drawn, want) => Boolean(drawn) && ['left', 'top', 'width', 'height'].every(key => near(drawn[key], want[key]));
  const meet = (a, b) => a.left < b.left + b.width - 0.5 && b.left < a.left + a.width - 0.5 && a.top < b.top + b.height - 0.5 && b.top < a.top + a.height - 0.5;
  if (m.scrolls) problems.push('the page scrolls');
  // The top bar is the match's: its tier's, or taller where the text size needs it, and the same at every moment.
  const topWant = layout.board.insets.top + layout.board.shell.top;
  if (!m.top || !near(m.top.top, 0) || !near(m.top.height, topWant)) problems.push(`the top bar is ${m.top?.height?.toFixed(1)} px high; the match's is ${topWant}`);
  if (PRIVATE_WORDS.test(m.words)) problems.push(`a side or role word on the page: "${m.words.match(PRIVATE_WORDS)[0]}"`);
  if (!layout.fits) {
    if (m.fallback !== layout.board.fallback || !m.unfit) problems.push(`no too-short page where no board fits (${m.fallback})`);
    if (Object.keys(m.rooms).length || m.choosing || m.sheet || m.targets.length || m.rings.length) problems.push('a board or a control where no board fits');
    if (!m.nav) problems.push('no navigation on the too-short page');
    return problems;
  }
  // Every room, the capsule included, where turns.mjs puts it: no control moves the board.
  for (const [room, want] of Object.entries(layout.board.boxes)) if (!at(m.rooms[room], want)) problems.push(`${room} is not where turns.mjs puts it`);
  const targets = boardTargets(layout.board, roster);
  const square = target => ({ left: target.left, top: target.top, width: target.side, height: target.side });
  if (query.get('ui') === 'choosing') {
    if (!at(m.choosing, layout.choosing)) problems.push('the choosing row is not the navigation\'s box');
    if (m.nav || m.pass) problems.push('the navigation or the Pass shows while a character choice is open');
    if (m.sheet) problems.push('the sheet is up while a character choice is open');
    for (const control of m.controls) {
      if (Math.min(control.width, control.height) < 43.5) problems.push(`the row's ${control.label} is ${control.width.toFixed(1)} x ${control.height.toFixed(1)}`);
      if (control.top < layout.choosing.row.top - 0.5 || control.bottom > layout.choosing.row.top + layout.choosing.row.height + 0.5) problems.push(`the row's ${control.label} leaves the row above the inset`);
      if (control.hits !== 5) problems.push(`a pointer misses the row's ${control.label}`);
    }
    if (!['Cancel', 'Done'].every(label => m.controls.some(control => control.label === label))) problems.push('no Cancel or no Done in the choosing row');
    // Every target pressable; every offered seat ringed on each of its targets, at the target's own square.
    for (const target of m.targets) if (target.hits !== 5) problems.push(`${target.room} ${target.slot}: a pointer misses it while choosing`);
    const fixture = fixtureSeats(query.get('fixture') ?? 'mixed', roster);
    const offered = query.get('offered') ? query.get('offered').split(',').map(Number) : fixture.filter(seat => seat.health !== 'Eliminated').map(seat => seat.seat);
    const chosen = query.get('chosen') ? query.get('chosen').split(',').map(Number) : [];
    const seated = seatedPair(query);
    const want = offered.flatMap(number => {
      const seat = fixture.find(entry => entry.seat === number);
      return [`${seat.room}:${seat.slot}`, ...seated.filter(entry => entry.seat === number).map(entry => `capsule:${entry.id}`)].map(key => ({ seat: number, key }));
    });
    if (m.rings.length !== want.length) problems.push(`${m.rings.length} rings for ${want.length} offered targets`);
    for (const { seat, key } of want) {
      const ring = m.rings.find(entry => entry.target === key && entry.seat === seat);
      const target = targets.find(entry => `${entry.room}:${entry.id}` === key);
      if (!ring || !target || !at(ring, square(target))) problems.push(`seat ${seat}: no ring on its target ${key}`);
      else if (ring.chosen !== chosen.includes(seat)) problems.push(`seat ${seat}: its ring at ${key} is ${ring.chosen ? '' : 'not '}marked chosen`);
    }
    if (m.count !== `${chosen.length} of ${Number(query.get('choose') ?? 4)}`) problems.push(`the count says "${m.count}"`);
  } else if (query.get('ui') === 'sheet') {
    const { sheet } = layout;
    if (!at(m.sheet, sheet)) problems.push('the sheet is not its box over the Hospital and the Jail');
    if (!m.nav || !m.pass) problems.push('the navigation or the Pass is hidden while the sheet is up');
    if (m.choosing || m.rings.length) problems.push('a choosing row or a ring while no character choice is open');
    if (m.sheet) {
      for (const [room, drawn] of Object.entries(m.rooms)) if (!SHEET_ROOMS.includes(room) && meet(drawn, m.sheet)) problems.push(`the sheet covers ${room}`);
      for (const target of m.targets) {
        const under = SHEET_ROOMS.includes(target.room);
        if (!under && target.hits !== 5) problems.push(`${target.room} ${target.slot}: covered while the sheet is up`);
        if (under && target.hits !== 0) problems.push(`${target.room} ${target.slot}: pressable through the sheet`);
      }
      // The pinned actions: each control 44 px, inside its part, clear of the Pass's circle, pressable.
      const pass = m.pass ? { cx: m.pass.left + m.pass.width / 2, cy: m.pass.top + m.pass.height / 2, r: m.pass.width / 2 } : null;
      for (const part of m.sheet.actions) {
        const want = sheet.actions[part.part];
        if (!near(part.left, want.left) || !near(part.width, want.width) || !near(part.top, sheet.actions.top) || !near(part.height, sheet.actions.height)) problems.push(`the actions' ${part.part} part is not where turns.mjs puts it`);
        for (const button of part.buttons) {
          if (Math.min(button.width, button.height) < 43.5) problems.push(`the sheet's ${button.label} is ${button.width.toFixed(1)} x ${button.height.toFixed(1)}`);
          if (button.left < part.left - 0.5 || button.right > part.right + 0.5) problems.push(`the sheet's ${button.label} leaves its part`);
          if (button.hits !== 5) problems.push(`a pointer misses the sheet's ${button.label}`);
          if (pass) {
            const dx = Math.max(button.left - pass.cx, 0, pass.cx - button.right), dy = Math.max(button.top - pass.cy, 0, pass.cy - button.bottom);
            if (Math.hypot(dx, dy) < pass.r + 0.5) problems.push(`the sheet's ${button.label} is under the Pass`);
          }
        }
      }
      // The body scrolls inside by exactly what the plan says, never the page.
      if (Math.abs(Math.max(0, m.sheet.body.overflow) - m.sheet.scroll) > 1.5) problems.push(`the sheet's body overflows by ${m.sheet.body.overflow} px; the plan says ${m.sheet.scroll}`);
      // The claim: drawn as planned, whole on screen in the result stage, and not covered.
      if (query.get('claim')) {
        const block = m.sheet.claimBlock;
        if (!block) problems.push('no claim in the sheet');
        else {
          if (block.folded !== (m.sheet.claim === 'collapsed')) problems.push(`the claim is drawn ${block.folded ? 'folded' : 'whole'}; the plan says ${m.sheet.claim}`);
          if (block.hits !== 1) problems.push('the claim is covered');
          if (block.top < m.sheet.body.top - 0.5 || block.bottom > m.sheet.body.bottom + 0.5) problems.push('the claim is not whole in the sheet\'s view');
        }
        if (query.get('stage') === 'result' && m.sheet.claim !== 'full') problems.push('the claim is folded in the result stage');
        if (m.rooms.capsule && meet(m.rooms.capsule, m.sheet)) problems.push('the sheet covers the capsule');
      }
      if (query.get('receipt') === '1' && (!m.sheet.receipt || Math.min(m.sheet.receipt.width, m.sheet.receipt.height) < 43.5 || m.sheet.receipt.hits !== 5)) problems.push('the recovery row\'s control is missing, under 44 px or covered');
    }
  }
  return problems;
}

function problemsOf(shot, measured) {
  const { fitBoardV2, boardRects } = layoutOf(shot);
  const problems = [];
  const [width, height] = shot.viewport;
  const query = new URLSearchParams(shot.query);
  const roster = Number(query.get('roster') ?? 9);
  const options = { insets: insetsOf(query.get('safe')), capsule: query.get('capsule') === '1' || query.get('film') === 'capsule' };
  const board = fitBoardV2({ width, height }, roster, options);
  const expected = boardRects({ width, height }, roster, options);
  if (measured.scrolls) problems.push('the page scrolls');
  if (measured.shell !== board.shell.tier) problems.push(`the page draws the ${measured.shell} shell; fit.mjs has ${board.shell.tier}`);
  if (measured.fallback !== (board.fallback ?? 'none')) problems.push(`the page's fallback is ${measured.fallback}; fit.mjs has ${board.fallback ?? 'none'}`);
  // No board fits: the message, and no room and no target anywhere.
  if (board.fallback === 'too-short' || board.fallback === 'too-narrow') {
    if (!measured.unfit) problems.push('no message where no board fits');
    if (Object.keys(measured.rooms).length || measured.pointer.length) problems.push('rooms or targets drawn where no board fits');
    return problems;
  }
  if (query.get('hit') === '1') problems.push(...pointerProblems(measured));
  // Where the rooms need more height than the board has, they run under the navigation by exactly that much.
  const overrun = Math.max(0, measured.lowest - (measured.navTop - board.shell.boardPadY));
  if (Math.abs(overrun - board.deficit) > 1) problems.push(`the board runs ${overrun.toFixed(1)} px under the navigation; fit.mjs says ${board.deficit.toFixed(1)}`);
  // The raised Pass: where fit.mjs puts it, and on no press area (its circle, as it is pressed).
  const pass = measured.pass ? { cx: measured.pass.left + measured.pass.width / 2, cy: measured.pass.top + measured.pass.height / 2, r: measured.pass.width / 2 } : null;
  if (!pass) problems.push('no Pass drawn');
  else if (Math.abs(pass.cx - board.pass.cx) > 0.6 || Math.abs(pass.cy - board.pass.cy) > 0.6 || Math.abs(pass.r - board.pass.r) > 0.6) problems.push(`the Pass is drawn at ${pass.cx.toFixed(1)},${pass.cy.toFixed(1)} r ${pass.r.toFixed(1)}; fit.mjs ${board.pass.cx.toFixed(1)},${board.pass.cy.toFixed(1)} r ${board.pass.r.toFixed(1)}`);
  for (const [room, drawn] of Object.entries(measured.rooms)) {
    const rects = drawn.press;
    if (!rects.length) continue;
    const want = expected[room];
    if (rects.length !== want.length) problems.push(`${room}: ${rects.length} press areas drawn, ${want.length} slots`);
    rects.forEach((r, i) => {
      if (r.width < 43.5 || r.height < 43.5) problems.push(`${room} slot ${i + 1}: press area ${r.width.toFixed(1)} x ${r.height.toFixed(1)}`);
      if (r.left < -0.5 || r.top < -0.5 || r.left + r.width > drawn.panel.width + 0.5 || r.top + r.height > drawn.panel.height + 0.5) problems.push(`${room} slot ${i + 1}: press area leaves its room`);
      if (want[i] && (Math.abs(r.left - want[i].left) > 0.6 || Math.abs(r.top - want[i].top) > 0.6)) problems.push(`${room} slot ${i + 1}: drawn ${r.left.toFixed(1)},${r.top.toFixed(1)}, fit.mjs ${want[i].left.toFixed(1)},${want[i].top.toFixed(1)}`);
      // Two press areas may share an edge (fit.mjs allows it); 0.1 px absorbs the layout's sub-pixel rounding.
      rects.forEach((o, j) => { if (j > i && !(r.left + r.width <= o.left + 0.1 || o.left + o.width <= r.left + 0.1 || r.top + r.height <= o.top + 0.1 || o.top + o.height <= r.top + 0.1)) problems.push(`${room}: slots ${i + 1} and ${j + 1} overlap`); });
      const m = drawn.markers[i];
      if (m && !(m.left >= r.left - 0.5 && m.top >= r.top - 0.5 && m.left + m.width <= r.left + r.width + 0.5 && m.top + m.height <= r.top + r.height + 0.5)) problems.push(`${room} slot ${i + 1}: its position number is not on its press area`);
      if (pass) {
        const left = drawn.panel.left + r.left, top = drawn.panel.top + r.top;
        const dx = Math.max(left - pass.cx, 0, pass.cx - (left + r.width)), dy = Math.max(top - pass.cy, 0, pass.cy - (top + r.height));
        if (Math.hypot(dx, dy) < pass.r) problems.push(`${room} slot ${i + 1}: under the Pass`);
      }
    });
  }
  return problems;
}

/**
 * The pointer probes: at every phone width, the heights around each shell's boundary (one pixel
 * either side of where it starts to fit, and of the phone kit's 600 and 640 px steps), with and
 * without safe-area insets, for 7 and 9 players. No picture: the page's shell and fallback, and a
 * pointer at every slot.
 */
export function pointerProbes() {
  const probes = [];
  const chrome = tier => tier.top + tier.nav + 2 * tier.boardPadY;
  for (const width of [320, 360, 375, 390, 393, 412, 414, 428, 430]) {
    const needs = fitBoardV2({ width, height: 2000 }, 9).needs.reduce((a, b) => a + b, 0) + 2 * SHELL.gap;
    const edges = SHELL.tiers.flatMap(tier => [needs + chrome(tier) - 1, needs + chrome(tier)]);
    const heights = [...new Set([...edges, 600, 601, 640, 641].map(Math.ceil))].filter(h => h >= 560).sort((a, b) => a - b);
    for (const roster of [7, 9]) for (const height of heights) probes.push({ viewport: [width, height], roster, safe: '' });
  }
  for (const [width, safe] of [[390, '47,0,34,0'], [430, '59,0,34,0']]) {
    const [top, , bottom] = safe.split(',').map(Number);
    const needs = fitBoardV2({ width, height: 2000 }, 9).needs.reduce((a, b) => a + b, 0) + 2 * SHELL.gap;
    for (const tier of SHELL.tiers) for (const height of [needs + chrome(tier) + top + bottom - 1, needs + chrome(tier) + top + bottom]) probes.push({ viewport: [width, Math.ceil(height)], roster: 9, safe });
  }
  return probes;
}

/**
 * The Disabler's selection pressed with a real pointer: the browser hit-tests each press
 * (Input.dispatchMouseEvent), so a press lands on whatever is on top at that point, as a finger
 * would. Every position of every room a Disabler can be bound to, at the smallest phone and a
 * common one; the selection's two ends in both motion modes; and a sent position's answers.
 */
async function pressTests(browser, server) {
  const tests = [];
  const WAIT = 'Position 2 sent. Waiting for the answer.';
  const open = async (viewport, query) => {
    const page = await openPage(browser, { width: viewport[0], height: viewport[1], scale: 1 });
    await page.goto(`${server.origin}/board-v2/index.html?${query}`, 'document.readyState === "complete" && window.__designReady === true');
    return page;
  };
  const press = async (page, [x, y]) => {
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  };
  const state = page => page.evaluate('window.__blackoutState()');
  // Each slot's press area in the viewport, from fit.mjs rather than from the page: its centre and its corners 3 px inside.
  const areas = (viewport, room, roster = 9) => {
    const board = fitBoardV2({ width: viewport[0], height: viewport[1] }, roster);
    return slotRects(room, roster, board.panels[room]).map(rect => {
      const left = board.boxes[room].left + SHELL.border + rect.left, top = board.boxes[room].top + SHELL.border + rect.top;
      return { centre: [left + rect.side / 2, top + rect.side / 2], points: [[left + rect.side / 2, top + rect.side / 2], [left + 3, top + 3], [left + rect.side - 3, top + 3], [left + 3, top + rect.side - 3], [left + rect.side - 3, top + rect.side - 3]] };
    });
  };
  const base = 'roster=9&fixture=mixed&film=blackout&viewer=disabler';

  // Every position of every room: each point of its press area is its button; a press chooses it; a
  // second press on the chosen one sends one command; then nothing more can be pressed or sent.
  for (const viewport of [[320, 568], [390, 844]]) {
    for (const room of BOARD_ROOMS) {
      const problems = [];
      let presses = 0;
      const page = await open(viewport, `${base}&t=8000&bound=${room}`);
      const slots = areas(viewport, room);
      const landed = await page.evaluate(`(${JSON.stringify(slots.map(slot => slot.points))}).map(points => points.map(([x, y]) => { const node = document.elementFromPoint(x, y); const button = node && node.closest('.v2-hit'); return button ? Number(button.dataset.position) : String(node ? node.className || node.tagName : 'nothing'); }))`);
      landed.forEach((list, index) => list.forEach((where, n) => { if (where !== index + 1) problems.push(`position ${index + 1}, point ${n}: lands on ${where}`); }));
      for (const [index, slot] of slots.entries()) {
        await press(page, slot.centre);
        presses += 1;
        const now = await state(page);
        if (now.step !== 'confirm' || now.pick !== index + 1 || now.sends !== 0) problems.push(`a press on position ${index + 1} left ${now.step} ${now.pick}, ${now.sends} sent`);
        if (now.line !== `Position ${index + 1}: tap it again to strike.`) problems.push(`position ${index + 1}: the line says "${now.line}"`);
      }
      await press(page, slots.at(-1).centre);
      presses += 1;
      let now = await state(page);
      if (now.step !== 'sent' || now.pick !== slots.length || now.sends !== 1 || !now.commandId) problems.push(`a second press on position ${slots.length} left ${now.step}, ${now.sends} sent`);
      if (now.line !== `Sending position ${slots.length}…`) problems.push(`after the send the line says "${now.line}"`);
      if (await page.evaluate(`document.querySelectorAll('.v2-hit').length`)) problems.push('press areas after the send');
      const id = now.commandId;
      for (const slot of [slots[0], slots.at(-1)]) { await press(page, slot.centre); presses += 1; }
      now = await state(page);
      if (now.sends !== 1 || now.pick !== slots.length || now.commandId !== id) problems.push('a press after the send changed the selection or sent again');
      problems.push(...page.problems());
      await page.close();
      tests.push({ test: `every position of ${room} at ${vp(viewport)}: each press area's centre and corners are its button; a press chooses, a second press on it sends one command, later presses do nothing`, presses, problems });
    }
  }

  // The selection's two ends, in both motion modes: people and names on the page only before 5 000;
  // a press chooses only in [5 000, 15 000), in Room B and on C1.
  for (const viewport of [[320, 568], [390, 844]]) {
    for (const motion of ['', '&motion=reduced']) {
      for (const room of ['room-b', 'command-room']) {
        const problems = [];
        for (const t of [4999, 5000, 5100, 14999, 15000]) {
          const page = await open(viewport, `${base}&t=${t}&bound=${room}${motion}`);
          const seen = await page.evaluate(`(() => { const app = document.getElementById('v2-app'); const labels = [...app.querySelectorAll('[aria-label]')].map(node => node.getAttribute('aria-label')).join(' '); return { people: app.querySelectorAll('.v2-fig, .v2-tag').length, text: app.textContent + ' ' + labels }; })()`);
          const names = NAMES.filter(name => seen.text.includes(name));
          if (t < 5000 && (!seen.people || !names.length)) problems.push(`${t} ms: nobody on the page in the lit preview`);
          if (t >= 5000 && (seen.people || names.length)) problems.push(`${t} ms: ${seen.people} figures and tags on the page${names.length ? `, and ${names.join(', ')}` : ''}`);
          await press(page, areas(viewport, room)[0].centre);
          const now = await state(page);
          const selectable = t >= 5000 && t < 15000;
          if (selectable && (now.step !== 'confirm' || now.pick !== 1)) problems.push(`${t} ms: a press on position 1 did not choose it`);
          if (!selectable && now.step !== 'choose') problems.push(`${t} ms: a press chose position ${now.pick} with the selection closed`);
          problems.push(...page.problems().map(problem => `${t} ms: ${problem}`));
          await page.close();
        }
        tests.push({ test: `the selection's ends in ${room} at ${vp(viewport)}${motion ? ', reduced motion' : ''}: people and names until 4 999 ms only; a press chooses position 1 at 5 000, 5 100 and 14 999 ms, and nothing at 4 999 and 15 000`, presses: 5, problems });
      }
    }
  }

  // A sent position's answers: waiting after the deadline until an answer comes; registered or not
  // only as the answer says; one command, one id, throughout.
  const flows = [
    { name: 'an answer that arrives after the deadline', extra: '&replyAt=15300', sendAt: 14800, lines: [[14900, 'Sending position 2…'], [15000, WAIT], [15299, WAIT], [15300, 'Registered: position 2.']] },
    { name: 'a lost answer, its receipt recovered with the same command id', extra: '&lost=1&recoverAt=15450', sendAt: 14800, lines: [[15000, WAIT], [15300, WAIT], [15449, WAIT], [15450, 'Registered: position 2.']] },
    { name: 'a lost answer never recovered while the window lasts', extra: '&lost=1', sendAt: 14800, lines: [[15000, WAIT], [15400, WAIT], [15519, WAIT], [15520, null]] },
    { name: 'the server answering that the position was not registered', extra: '&reply=rejected&replyAt=15200', sendAt: 14990, lines: [[14995, 'Sending position 2…'], [15100, WAIT], [15199, WAIT], [15200, 'Position 2 was not registered.']] },
  ];
  for (const flow of flows) {
    const problems = [];
    const page = await open([390, 844], `${base}&t=${flow.sendAt}&bound=room-b${flow.extra}`);
    const slot = areas([390, 844], 'room-b')[1];
    await press(page, slot.centre);
    await press(page, slot.centre);
    const sent = await state(page);
    if (sent.step !== 'sent' || sent.sends !== 1 || sent.pick !== 2) problems.push(`the two presses left ${sent.step}, ${sent.sends} sent`);
    for (const [t, line] of flow.lines) {
      const now = await page.evaluate(`window.__blackoutAt(${t})`);
      if (now.line !== line) problems.push(`${t} ms: the line says "${now.line}"; expected "${line}"`);
      if (now.sends !== 1 || now.commandId !== sent.commandId) problems.push(`${t} ms: ${now.sends} commands, id ${now.commandId}`);
      if (await page.evaluate(`document.querySelectorAll('.v2-hit').length`)) problems.push(`${t} ms: press areas after the send`);
    }
    problems.push(...page.problems());
    await page.close();
    tests.push({ test: `a position sent at ${flow.sendAt} ms, ${flow.name}`, presses: 2, problems });
  }
  // Chosen and never sent: at the deadline the line says only that nothing was sent.
  {
    const problems = [];
    const page = await open([390, 844], `${base}&t=14900&bound=room-b`);
    await press(page, areas([390, 844], 'room-b')[1].centre);
    const now = await page.evaluate('window.__blackoutAt(15000)');
    if (now.line !== 'Time is up: no position was sent.' || now.sends !== 0) problems.push(`at 15 000 ms the line says "${now.line}", ${now.sends} sent`);
    if (await page.evaluate(`document.querySelectorAll('.v2-hit').length`)) problems.push('press areas after the deadline');
    if (await page.evaluate(`document.querySelectorAll('.v2-marker[data-style="chosen"]').length`)) problems.push('a chosen marker after the deadline with nothing sent');
    problems.push(...page.problems());
    await page.close();
    tests.push({ test: 'a position chosen at 14 900 ms and never sent: at 15 000 ms nothing was sent, the press areas and the chosen marker gone', presses: 1, problems });
  }
  return tests;
}

/** The medical films' page comparisons (see the main run), with pageAt(viewport, query) loading a page's markup. */
async function medicalComparisons(pageAt) {
  const out = [];
  const others = (page, ...skip) => JSON.stringify(Object.entries(JSON.parse(page.rooms)).filter(([room]) => room !== 'hospital' && !skip.includes(room)));
  const boxOf = page => JSON.stringify(JSON.parse(page.bar)[0]?.slice(0, 5) ?? null);
  for (const viewport of [[390, 844], [320, 568]]) {
    for (const query of ['film=critical&round=3', 'film=rescue&t=2600', 'film=flatline&t=2000']) {
      const [player, display] = await Promise.all([pageAt(viewport, `roster=9&${query}`), pageAt(viewport, `roster=9&${query}&viewer=display`)]);
      out.push({ compare: `the Hospital's ${query.split('&')[0].slice(5)} on the display and on a player's screen, ${vp(viewport)}, ${query}`, same: player.html === display.html });
    }
    for (const [outcome, film, after, before] of [['rescue', 'rescue', 5700, -2300], ['rescue-detained', 'rescue', 5700, -2300], ['vignette', 'rescue', 5700, -2300], ['death', 'flatline', 4300, -3700]]) {
      for (const reducedMotion of ['', '&motion=reduced']) {
        const [a, b] = reducedMotion ? [1800, -1] : [after, before];
        const [done, ahead] = await Promise.all([a, b].map(t => pageAt(viewport, `roster=9&film=${film}&outcome=${outcome}&t=${t}${reducedMotion}`)));
        out.push({ compare: `the page after the ${outcome} film (${a} ms) and before it (${b} ms), ${vp(viewport)}${reducedMotion ? ', reduced motion' : ''}`, same: done.html === ahead.html });
      }
    }
    for (const [outcome, film, t, away] of [['rescue', 'rescue', 2600, 'room-a'], ['rescue', 'rescue', 3550, 'room-a'], ['rescue-detained', 'rescue', 2600, 'jail'], ['vignette', 'rescue', 2600, 'room-b'], ['death', 'flatline', 2000, null], ['death', 'flatline', 2700, null]]) {
      const [during, ahead] = await Promise.all([t, t - 8000].map(time => pageAt(viewport, `roster=9&film=${film}&outcome=${outcome}&t=${time}`)));
      out.push({ compare: `every room but the Hospital${away ? ` and the subject's (${away})` : ''} during the ${outcome} film (${t} ms) and before it, ${vp(viewport)}`, same: others(during, away) === others(ahead, away) });
    }
    for (const round of [3, 5]) {
      const [critical, plain] = await Promise.all([pageAt(viewport, `roster=9&fixture=mixed&film=critical&round=${round}`), pageAt(viewport, 'roster=9&fixture=mixed')]);
      out.push({ compare: `every room but the Hospital in the critical state (round ${round}) and on the plain board, ${vp(viewport)}`, same: others(critical) === others(plain) });
    }
    const bars = await Promise.all(['roster=9&fixture=mixed', 'roster=9&film=critical', 'roster=9&film=rescue&t=2600', 'roster=9&film=flatline&t=2000'].map(query => pageAt(viewport, query)));
    out.push({ compare: `the top bar's box on the plain board and in each medical film, ${vp(viewport)}`, same: bars.every(page => boxOf(page) === boxOf(bars[0])) && boxOf(bars[0]) !== 'null' });
  }
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const shots = plan();
  await rm(resolve(repoRoot, OUT), { recursive: true, force: true });
  await mkdir(resolve(repoRoot, OUT), { recursive: true });
  const server = await startStaticServer();
  const chrome = await launchBrowser();
  const report = [];
  const disclosure = [];
  const labels = [];
  const probes = [];
  const interactions = [];
  try {
    const browser = await connect(chrome.endpoint);
    for (const shot of shots) {
      const [width, height] = shot.viewport;
      const page = await openPage(browser, { width, height, scale: shot.scale ?? 2 });
      await page.goto(`${server.origin}/board-v2/index.html?${shot.query}`, 'document.readyState === "complete" && window.__designReady === true');
      const measured = shot.measure ? await page.evaluate(MEASURE) : null;
      const filmed = shot.film ? await page.evaluate(MEASURE_FILM) : null;
      const blockedMeasured = shot.blocked ? await page.evaluate(MEASURE_BLOCKED) : null;
      const capsuleMeasured = shot.capsule ? await page.evaluate(MEASURE_CAPSULE) : null;
      const turnsMeasured = shot.turns ? await page.evaluate(MEASURE_TURNS) : null;
      const medicalMeasured = shot.medical ? await page.evaluate(MEASURE_MEDICAL) : null;
      const captainMeasured = shot.captain ? await page.evaluate(MEASURE_CAPTAIN) : null;
      const overflowMeasured = shot.overflow ? await page.evaluate(MEASURE_OVERFLOW) : null;
      const cloneMeasured = shot.clone ? await page.evaluate(MEASURE_CLONE) : null;
      await page.screenshot(resolve(repoRoot, OUT, shot.file), { selector: shot.selector ?? null, viewport: !shot.selector });
      const problems = [...(measured ? problemsOf(shot, measured) : []), ...(filmed ? problemsOfFilm(shot, filmed) : []), ...(blockedMeasured ? problemsOfBlocked(shot, blockedMeasured) : []), ...(capsuleMeasured ? problemsOfCapsule(shot, capsuleMeasured) : []), ...(turnsMeasured ? problemsOfTurns(shot, turnsMeasured) : []), ...(shot.medical ? problemsOfMedical(shot, medicalMeasured) : []), ...(shot.captain ? problemsOfCaptain(shot, captainMeasured) : []), ...(shot.overflow ? problemsOfOverflow(shot, overflowMeasured) : []), ...(shot.clone ? problemsOfClone(shot, cloneMeasured) : []), ...page.problems()];
      const fit = shot.measure ? layoutOf(shot).fitBoardV2({ width, height }, Number(new URLSearchParams(shot.query).get('roster') ?? 9), { insets: insetsOf(new URLSearchParams(shot.query).get('safe')), capsule: Boolean(shot.capsule) }) : null;
      report.push({ file: shot.file, viewport: `${width}x${height}`, query: shot.query, problems, shell: fit?.shell.tier ?? null, fallback: fit?.fallback ?? null, fits: fit?.fits ?? null, boardProblems: fit?.problems ?? [] });
      console.log(`${problems.length ? 'PROBLEM' : 'ok     '} ${shot.file}${problems.length ? `: ${problems.join('; ')}` : ''}`);
      await page.close();
    }
    // The pointer probes around every shell boundary.
    for (const probe of pointerProbes()) {
      const [width, height] = probe.viewport;
      const query = `roster=${probe.roster}&fixture=stress&hit=1${probe.safe ? `&safe=${probe.safe}` : ''}`;
      const page = await openPage(browser, { width, height, scale: 1 });
      await page.goto(`${server.origin}/board-v2/index.html?${query}`, 'document.readyState === "complete" && window.__designReady === true');
      const measured = await page.evaluate(MEASURE);
      await page.close();
      const problems = problemsOf({ viewport: probe.viewport, query }, measured);
      const board = fitBoardV2({ width, height }, probe.roster, { insets: insetsOf(probe.safe) });
      probes.push({ viewport: `${width}x${height}`, roster: probe.roster, safe: probe.safe || null, ceiling: board.ceiling, shell: board.shell.tier, fallback: board.fallback, slots: measured.pointer.length, problems });
      if (problems.length) console.log(`PROBLEM probe ${width}x${height} ${probe.roster}p ${probe.safe}: ${problems.join('; ')}`);
    }
    // The same with the capsule beside the Command Room: every slot of every roster at every phone, the
    // capsule empty; and while the film plays, its moving figures and badges over the board.
    const capsuleProbes = [
      ...VIEWPORTS.flatMap(viewport => [7, 8, 9].map(roster => ({ viewport, roster, query: `roster=${roster}&fixture=stress&hit=1&capsule=1` }))),
      ...[[320, 568], [390, 844]].flatMap(viewport => [['result', 1200], ['result', 2400], ['talk', 30000], ['exit', 1250]].map(([stage, t]) => ({ viewport, roster: 9, query: `roster=9&fixture=mixed&hit=1&film=capsule&stage=${stage}&t=${t}` }))),
    ];
    for (const probe of capsuleProbes) {
      const [width, height] = probe.viewport;
      const page = await openPage(browser, { width, height, scale: 1 });
      await page.goto(`${server.origin}/board-v2/index.html?${probe.query}`, 'document.readyState === "complete" && window.__designReady === true');
      const measured = await page.evaluate(MEASURE);
      const problems = [...problemsOf({ viewport: probe.viewport, query: probe.query }, measured), ...page.problems()];
      await page.close();
      if (!measured.rooms.capsule) problems.push('no capsule drawn');
      else if (measured.rooms.capsule.press.length || measured.rooms.capsule.markers.length) problems.push('press areas or position numbers in the capsule');
      const board = fitBoardV2({ width, height }, probe.roster, { capsule: true });
      probes.push({ viewport: `${width}x${height}`, roster: probe.roster, safe: null, capsule: probe.query.includes('film=capsule') ? probe.query.split('&').filter(part => /^(stage|t)=/.test(part)).join('&') : 'empty', ceiling: board.ceiling, shell: board.shell.tier, fallback: board.fallback, slots: measured.pointer.length, problems });
      if (problems.length) console.log(`PROBLEM probe ${width}x${height} ${probe.roster}p ${probe.query}: ${problems.join('; ')}`);
    }
    // The real controls at every phone and roster on the stress board (every slot taken): a character choice open,
    // every slot ringed and pressed; and the sheet up, the Hospital's and the Jail's covered and every other pressed.
    for (const viewport of VIEWPORTS) {
      for (const roster of [7, 8, 9]) {
        for (const ui of ['&ui=choosing', '&ui=sheet&claim=conversation&receipt=1']) {
          const query = `roster=${roster}&fixture=stress&hit=1${ui}`;
          const page = await openPage(browser, { width: viewport[0], height: viewport[1], scale: 1 });
          await page.goto(`${server.origin}/board-v2/index.html?${query}`, 'document.readyState === "complete" && window.__designReady === true');
          const measuredTurns = await page.evaluate(MEASURE_TURNS);
          const problems = [...problemsOfTurns({ viewport, query }, measuredTurns), ...page.problems()];
          await page.close();
          const board = fitBoardV2({ width: viewport[0], height: viewport[1] }, roster, { capsule: true });
          probes.push({ viewport: vp(viewport), roster, safe: null, turns: ui.slice(4).split('&')[0], ceiling: board.ceiling, shell: board.shell.tier, fallback: board.fallback, slots: measuredTurns.targets.length, problems });
          if (problems.length) console.log(`PROBLEM probe ${vp(viewport)} ${roster}p ${query}: ${problems.join('; ')}`);
        }
      }
    }
    console.log(`Pointer probes: ${probes.length} pages, ${probes.reduce((n, entry) => n + entry.slots, 0)} slots pressed at five points each, ${probes.filter(entry => entry.problems.length).length} with problems`);
    // The Disabler's selection pressed with a real pointer.
    interactions.push(...await pressTests(browser, server));
    for (const entry of interactions) if (entry.problems.length) console.log(`PROBLEM ${entry.test}: ${entry.problems.join('; ')}`);
    console.log(`Pointer presses: ${interactions.length} tests, ${interactions.reduce((n, entry) => n + entry.presses, 0)} presses, ${interactions.filter(entry => entry.problems.length).length} with problems`);
    // Whole pages that must be the same: a strike that missed and no strike, on any player's screen;
    // a Blue Disabler's screen and a Red one's; the shared display's and a player's. And the top bar:
    // the same box, rows and type on a player's screen, the Disabler's and the display.
    const pageAt = async (viewport, query) => {
      const page = await openPage(browser, { width: viewport[0], height: viewport[1], scale: 1 });
      await page.goto(`${server.origin}/board-v2/index.html?${query}`, 'document.readyState === "complete" && window.__designReady === true');
      const html = await page.evaluate(`document.getElementById('v2-app').innerHTML`);
      const surface = await page.evaluate(`document.querySelector('.v2-board')?.innerHTML ?? null`);
      const bar = await page.evaluate(`JSON.stringify(['.v2-top', '.v2-top__row', '.v2-top__line', '.v2-top__phase', '.v2-top__timer'].map(selector => { const node = document.querySelector(selector); if (!node || node.hidden) return null; const b = node.getBoundingClientRect(); const c = getComputedStyle(node); return [selector, b.left, b.top, b.width, b.height, c.backgroundColor, c.color, c.fontSize, c.fontWeight, c.lineHeight, c.borderColor, c.opacity]; }))`);
      const rooms = await page.evaluate(`JSON.stringify(Object.fromEntries([...document.querySelectorAll('.v2-room[data-room]')].map(node => [node.dataset.room, node.innerHTML])))`);
      await page.close();
      return { html, bar, surface, rooms };
    };
    const base = 'roster=9&fixture=mixed&film=blackout';
    for (const viewport of [[390, 844], [320, 568]]) {
      for (const t of [1000, 4360, 4760, 4999, 5000, 8000, 15000, 15440, 15560, 16300]) {
        for (const reducedMotion of ['', '&motion=reduced']) {
          const [miss, none] = await Promise.all(['miss', 'none'].map(outcome => pageAt(viewport, `${base}&t=${t}&outcome=${outcome}${reducedMotion}`)));
          disclosure.push({ compare: `a missed strike and no strike, ${vp(viewport)}, ${t} ms${reducedMotion ? ', reduced motion' : ''}`, same: miss.html === none.html });
        }
      }
      for (const [t, step] of [[8000, 'choose'], [8000, 'confirm'], [12000, 'sent'], [15200, 'confirm']]) {
        const [blue, red] = await Promise.all(['blue', 'red'].map(side => pageAt(viewport, `${base}&t=${t}&viewer=disabler&bound=room-b&step=${step}&pick=2&side=${side}`)));
        disclosure.push({ compare: `a Blue Disabler's screen and a Red one's, ${vp(viewport)}, ${t} ms, ${step}`, same: blue.html === red.html });
      }
      for (const t of [1000, 8000, 15560]) {
        const [player, display] = await Promise.all([pageAt(viewport, `${base}&t=${t}`), pageAt(viewport, `${base}&t=${t}&viewer=display`)]);
        disclosure.push({ compare: `the shared display's page and a player's, ${vp(viewport)}, ${t} ms`, same: player.html === display.html });
      }
      // The top bar while the line is up: the lit preview, the cut, the dark, and after the deadline.
      for (const t of [1000, 5000, 8000, 15200]) {
        const screens = await Promise.all([pageAt(viewport, `${base}&t=${t}`), pageAt(viewport, `${base}&t=${t}&viewer=disabler&bound=room-b&step=confirm&pick=2`), pageAt(viewport, `${base}&t=${t}&viewer=disabler&bound=command-room`), pageAt(viewport, `${base}&t=${t}&viewer=display`)]);
        disclosure.push({ compare: `the top bar's box, rows and type on a player's screen, two Disablers' and the display, ${vp(viewport)}, ${t} ms`, same: screens.every(screen => screen.bar === screens[0].bar) && JSON.parse(screens[0].bar)[2] !== null });
      }
    }
    // ATTACK BLOCKED: the same film whichever defense blocked the attack; on an outsider's screen and
    // the display, a block is nothing at all; in the Blackout, a miss everywhere but the target's room,
    // and the same as a miss there too until the lights are back.
    const blockedBase = 'roster=9&fixture=mixed&film=blocked';
    for (const viewport of [[390, 844], [320, 568]]) {
      for (const reducedMotion of ['', '&motion=reduced']) {
        for (const t of [60, 160, 280, 480, 760, 1700, 2320, 2500]) {
          const [clone, protection] = await Promise.all(['clone', 'protection'].map(cause => pageAt(viewport, `${blockedBase}&t=${t}&cause=${cause}${reducedMotion}`)));
          disclosure.push({ compare: `a block by either defense on an occupant's screen, ${vp(viewport)}, ${t} ms${reducedMotion ? ', reduced motion' : ''}`, same: clone.html === protection.html });
        }
        for (const viewer of ['outsider', 'display']) {
          for (const t of [60, 280, 760, 2500]) {
            const [block, none] = await Promise.all(['B2', ''].map(targets => pageAt(viewport, `${blockedBase}&t=${t}&viewer=${viewer}&targets=${targets}${reducedMotion}`)));
            disclosure.push({ compare: `${viewer === 'display' ? 'the display' : 'an outsider\'s screen'} with a block and with none, ${vp(viewport)}, ${t} ms${reducedMotion ? ', reduced motion' : ''}`, same: block.html === none.html });
          }
          // The already-Injured example: a block on Rigel in the Hospital is nothing at all off the Hospital's screens.
          for (const t of [280, 760]) {
            const [block, none] = await Promise.all([pageAt(viewport, `${blockedBase}&t=${t}&viewer=${viewer}&injured=1${reducedMotion}`), pageAt(viewport, `${blockedBase}&t=${t}&viewer=${viewer}&targets=${reducedMotion}`)]);
            disclosure.push({ compare: `${viewer === 'display' ? 'the display' : 'an outsider\'s screen'} with a block on the Hospital patient and with none, ${vp(viewport)}, ${t} ms${reducedMotion ? ', reduced motion' : ''}`, same: block.html === none.html });
          }
        }
        // The already-Injured example by either defense, on a Hospital occupant's screen.
        for (const t of [280, 760, 2500]) {
          const [clone, protection] = await Promise.all(['clone', 'protection'].map(cause => pageAt(viewport, `${blockedBase}&t=${t}&injured=1&cause=${cause}${reducedMotion}`)));
          disclosure.push({ compare: `a block on the Hospital patient by either defense, ${vp(viewport)}, ${t} ms${reducedMotion ? ', reduced motion' : ''}`, same: clone.html === protection.html });
        }
        for (const t of [15440, 15560, 16200, 16700, 17500]) {
          for (const [who, extra] of [['a Room A player\'s screen', '&in=room-a'], ['the display', '&viewer=display&in=room-b'], ['a screen with no room given', '']]) {
            const [block, miss] = await Promise.all(['blocked', 'miss'].map(outcome => pageAt(viewport, `${base}&t=${t}&outcome=${outcome}${extra}${reducedMotion}`)));
            disclosure.push({ compare: `the Blackout's blocked strike and a miss on ${who}, ${vp(viewport)}, ${t} ms${reducedMotion ? ', reduced motion' : ''}`, same: block.html === miss.html });
          }
        }
        // The target's room's occupant: nothing until the lights are fully back.
        for (const t of reducedMotion ? [15420] : [15440, 15560, 15900]) {
          const [block, miss] = await Promise.all(['blocked', 'miss'].map(outcome => pageAt(viewport, `${base}&t=${t}&outcome=${outcome}&in=room-b${reducedMotion}`)));
          disclosure.push({ compare: `the Blackout's blocked strike and a miss on a Room B occupant's screen before the lights are back, ${vp(viewport)}, ${t} ms${reducedMotion ? ', reduced motion' : ''}`, same: block.html === miss.html });
        }
      }
    }
    // The capsule: the display's page is a player's; a reconnect's board is the film's settled board, nothing
    // replayed; and after the exit, the page is the idle page.
    const capsuleBase = 'roster=9&fixture=mixed&film=capsule';
    for (const viewport of [[390, 844], [320, 568]]) {
      for (const reducedMotion of ['', '&motion=reduced']) {
        for (const [stage, t] of [['declare', 4000], ['result', 400], ['result', 1200], ['result', 2400], ['result', 3600], ['talk', 0], ['talk', 30000], ['exit', 800], ['exit', 1250]]) {
          const [player, display] = await Promise.all([pageAt(viewport, `${capsuleBase}&stage=${stage}&t=${t}${reducedMotion}`), pageAt(viewport, `${capsuleBase}&stage=${stage}&t=${t}&viewer=display${reducedMotion}`)]);
          disclosure.push({ compare: `the capsule on the display and on a player's screen, ${vp(viewport)}, ${stage} ${t} ms${reducedMotion ? ', reduced motion' : ''}`, same: player.html === display.html });
        }
        for (const [stage, t, settledAt] of [['result', 900, 4999], ['result', 2400, 4999], ['talk', 30000, 30000], ['exit', 300, 4000], ['exit', 1250, 4000]]) {
          const [reconnect, film] = await Promise.all([pageAt(viewport, `${capsuleBase}&stage=${stage}&t=${t}&settled=1${reducedMotion}`), pageAt(viewport, `${capsuleBase}&stage=${stage}&t=${settledAt}${reducedMotion}`)]);
          disclosure.push({ compare: `a reconnect at ${stage} ${t} ms and the film's settled board (${settledAt} ms), ${vp(viewport)}${reducedMotion ? ', reduced motion' : ''}`, same: reconnect.surface !== null && reconnect.surface === film.surface });
        }
        const [after, idle] = await Promise.all([pageAt(viewport, `${capsuleBase}&stage=exit&t=4000${reducedMotion}`), pageAt(viewport, `${capsuleBase}&stage=idle${reducedMotion}`)]);
        disclosure.push({ compare: `the page after the exit and the idle page, ${vp(viewport)}${reducedMotion ? ', reduced motion' : ''}`, same: after.html === idle.html });
      }
      // The top bar keeps its box through every stage.
      const bars = await Promise.all([['idle', 0], ['declare', 4000], ['result', 2400], ['talk', 30000], ['exit', 800]].map(([stage, t]) => pageAt(viewport, `${capsuleBase}&stage=${stage}&t=${t}`)));
      const boxOf = bar => JSON.stringify(JSON.parse(bar.bar)[0]?.slice(0, 5) ?? null);
      disclosure.push({ compare: `the top bar's box at every capsule stage, ${vp(viewport)}`, same: bars.every(bar => boxOf(bar) === boxOf(bars[0])) && boxOf(bars[0]) !== 'null' });
    }
    // The real controls never touch the board: each page's board, and its top bar's box, the same as the
    // same page's without its controls (the same film, the same viewer, the same text size).
    const withoutControls = query => query.split('&').filter(part => !/^(ui|chosen|offered|choose|prompt|tab|claim|command|receipt|viewer)=/.test(part)).join('&');
    const controlPages = [
      `${capsuleBase}&stage=talk&t=30000&ui=choosing&chosen=5,8`,
      `${capsuleBase}&stage=talk&t=30000&ui=choosing&chosen=5&viewer=participant&tab=1`,
      ...[400, 1200, 2400, 3600, 4999].map(t => `${capsuleBase}&stage=result&t=${t}&viewer=participant&ui=sheet&claim=result`),
      `${capsuleBase}&stage=talk&t=30000&viewer=participant&ui=sheet&claim=conversation&command=code-confirm`,
      `${capsuleBase}&stage=declare&t=4000&viewer=participant&ui=sheet&claim=declare&command=side-choice`,
    ];
    for (const viewport of [[390, 844], [320, 568]]) {
      for (const query of [...controlPages, ...(viewport[0] === 390 ? [`${capsuleBase}&stage=result&t=2400&viewer=participant&ui=sheet&claim=result&text=2`, `${capsuleBase}&stage=talk&t=30000&ui=choosing&chosen=5&text=2`] : [])]) {
        const [withControls, without] = await Promise.all([pageAt(viewport, query), pageAt(viewport, withoutControls(query))]);
        const box = bar => JSON.stringify(JSON.parse(bar)[0]?.slice(0, 5) ?? null);
        disclosure.push({ compare: `the board and the top bar's box with the controls and without, ${vp(viewport)}, ${query.replace(`${capsuleBase}&`, '')}`, same: withControls.surface !== null && withControls.surface === without.surface && box(withControls.bar) === box(without.bar) });
      }
    }
    // The Hospital's medical films: public, the display's page a player's; once a film is over, the page is the page
    // before it began, nothing left (full motion at the same phase of the decorative loops, 8 000 ms apart); while it
    // plays, no room touched but the Hospital and the room where the subject is marked away; the critical state no
    // room but the Hospital; and the top bar's box the plain board's.
    disclosure.push(...await medicalComparisons(pageAt));
    // The Captain's films: public, the display's page a player's; once a film is over, the page is the page before it
    // began (the plaque the board's own both times); while it plays, no room touched but the Command Room, the Jail and
    // the released' new rooms; and the top bar's box the plain board's.
    disclosure.push(...await captainComparisons(pageAt));
    // The successor's four-berth board: the current board outside the Hospital; the overflow beat public, leaving nothing, and
    // touching no room but the victim's and the Hospital; #158's rescue on four berths public and touching no other room.
    disclosure.push(...await fourComparisons(pageAt));
    // The Clone: nothing of it outside the Alien's own sheet, not even a request.
    const openForClone = async (viewport, query) => {
      const page = await openPage(browser, { width: viewport[0], height: viewport[1], scale: 1 });
      await page.goto(`${server.origin}/board-v2/index.html?${query}`, 'document.readyState === "complete" && window.__designReady === true');
      const html = await page.evaluate(`document.getElementById('v2-app').innerHTML`);
      const requests = page.requests().map(url => url.replace(server.origin, '').replace(/\?.*$/, '')).sort();
      await page.close();
      return { html, requests };
    };
    disclosure.push(...await cloneComparisons(openForClone));
    for (const entry of disclosure) console.log(`${entry.same ? 'same   ' : 'DIFFERS'} ${entry.compare}`);
    // The label for every slot of every room: every slot taken, each blocked at once (the art review's
    // screen, which no player receives), measured but not pictured.
    for (const viewport of VIEWPORTS) {
      for (const roster of [7, 8, 9]) {
        const targets = fixtureSeats('stress', roster).map(seat => seat.slot).join(',');
        const page = await openPage(browser, { width: viewport[0], height: viewport[1], scale: 1 });
        await page.goto(`${server.origin}/board-v2/index.html?roster=${roster}&fixture=stress&film=blocked&viewer=art&targets=${targets}&t=760`, 'document.readyState === "complete" && window.__designReady === true');
        const measuredLabels = await page.evaluate(MEASURE_BLOCKED);
        await page.close();
        const problems = [];
        let count = 0;
        for (const [room, drawn] of Object.entries(measuredLabels.rooms)) {
          count += drawn.labels.length;
          drawn.labels.forEach((label, i) => problems.push(...labelProblems(`${room} label ${i + 1}`, label, drawn)));
        }
        if (count !== targets.split(',').length) problems.push(`${count} labels for ${targets.split(',').length} slots`);
        labels.push({ viewport: vp(viewport), roster, labels: count, stacked: Object.values(measuredLabels.rooms).flatMap(drawn => drawn.labels).filter(label => label.stacked).length, problems });
        console.log(`${problems.length ? 'PROBLEM' : 'ok     '} every slot's label, ${vp(viewport)}, ${roster} players${problems.length ? `: ${problems.join('; ')}` : ''}`);
      }
    }
    const inputsSha256 = await boardV2InputsSha256(repoRoot);
    const index = { devOnly: 'mothership:dev-only', inputsSha256, note: 'Desktop Chromium laying out design/board-v2/index.html from synthetic fixtures. Not a phone measurement and nothing about a match.', captures: shots.map(({ file, group, query, about, sheetHeight }) => ({ file, group, query, about, sheetHeight })) };
    await writeFile(resolve(repoRoot, OUT, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
    await writeFile(resolve(repoRoot, OUT, 'report.json'), `${JSON.stringify({ devOnly: 'mothership:dev-only', inputsSha256, shots: report, probes, interactions, disclosure, labels }, null, 2)}\n`);
    for (const [file, query] of [['contact.png', ''], ['contact-blackout.png', '?group=blackout'], ['contact-blocked.png', '?group=blocked'], ['contact-capsule.png', '?group=capsule'], ['contact-turns.png', '?group=turns'], ['contact-medical.png', '?group=medical'], ['contact-captain.png', '?group=captain'], ['contact-four.png', '?group=four'], ['contact-clone.png', '?group=clone']]) {
      const page = await openPage(browser, { width: 1600, height: 900, scale: 1 });
      await page.goto(`${server.origin}/board-v2/contact.html${query}`, 'document.readyState === "complete" && window.__designReady === true');
      await page.fitHeight();
      await page.screenshot(resolve(repoRoot, OUT, file));
      await page.close();
    }
    browser.close();
  } finally {
    await chrome.close();
    await server.close();
  }
  const failing = report.filter(entry => entry.problems.length);
  const differing = disclosure.filter(entry => !entry.same);
  const probing = probes.filter(entry => entry.problems.length);
  const pressing = interactions.filter(entry => entry.problems.length);
  const misplaced = labels.filter(entry => entry.problems.length);
  console.log(`Board-v2 captures: ${report.length} pictures and nine contact sheets, ${failing.length} with problems; ${probes.length} pointer probes, ${probing.length} with problems; ${interactions.length} press tests, ${pressing.length} with problems; ${disclosure.length} page comparisons, ${differing.length} differing; ${labels.length} label placements, ${misplaced.length} with problems`);
  if (failing.length || probing.length || pressing.length || differing.length || misplaced.length) process.exitCode = 1;
}
