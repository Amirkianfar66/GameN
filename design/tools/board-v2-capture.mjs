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
// which must be the same. These are statements about desktop Chromium laying out a review page
// from synthetic fixtures, not measurements of a phone and nothing about a match.

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { boardV2InputsSha256 } from './lib/board-v2-inputs.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const OUT = 'design/board-v2/review';
const { SHELL, fitBoardV2, boardRects, insetsOf, slotRects } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/js/fit.mjs')).href);
const { BLACKOUT, blackoutFrame, lightsBackAt } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/films/blackout.mjs')).href);
const { BLACKOUT_OUTCOMES, fixtureSeats, settledSeats } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/js/fixtures.mjs')).href);
const { addressSelection, lineText } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/js/blackout-view.mjs')).href);
const { BOARD_ROOMS } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/scenes/slots.mjs')).href);
const { blockedFrame, blockedStartInBlackout } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/films/blocked.mjs')).href);
const { LABEL_MARGIN } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/fx/label-box.mjs')).href);
const { blockedTargets } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/js/blocked-view.mjs')).href);
const { CREW } = await import(pathToFileURL(resolve(repoRoot, 'design/board-motion/figures/crew.mjs')).href);
const NAMES = Object.values(CREW).map(member => member.sign);

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

function problemsOfFilm(shot, measured) {
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

/** What a pointer measurement says is wrong: a slot's press area under something else, or smaller than 44 px. */
function pointerProblems(measured) {
  const problems = [];
  for (const slot of measured.pointer) {
    if (slot.side < 43.5) problems.push(`${slot.slot}: a ${slot.side.toFixed(1)} px button`);
    for (const miss of slot.missed) problems.push(`${slot.slot}: a pointer at ${miss.x},${miss.y} lands on ${miss.hit}`);
  }
  return problems;
}

function problemsOf(shot, measured) {
  const problems = [];
  const [width, height] = shot.viewport;
  const query = new URLSearchParams(shot.query);
  const roster = Number(query.get('roster') ?? 9);
  const options = { insets: insetsOf(query.get('safe')) };
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
      await page.screenshot(resolve(repoRoot, OUT, shot.file), { selector: shot.selector ?? null, viewport: !shot.selector });
      const problems = [...(measured ? problemsOf(shot, measured) : []), ...(filmed ? problemsOfFilm(shot, filmed) : []), ...(blockedMeasured ? problemsOfBlocked(shot, blockedMeasured) : []), ...page.problems()];
      const fit = shot.measure ? fitBoardV2({ width, height }, Number(new URLSearchParams(shot.query).get('roster') ?? 9), { insets: insetsOf(new URLSearchParams(shot.query).get('safe')) }) : null;
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
      const bar = await page.evaluate(`JSON.stringify(['.v2-top', '.v2-top__row', '.v2-top__line', '.v2-top__phase', '.v2-top__timer'].map(selector => { const node = document.querySelector(selector); if (!node || node.hidden) return null; const b = node.getBoundingClientRect(); const c = getComputedStyle(node); return [selector, b.left, b.top, b.width, b.height, c.backgroundColor, c.color, c.fontSize, c.fontWeight, c.lineHeight, c.borderColor, c.opacity]; }))`);
      await page.close();
      return { html, bar };
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
    for (const [file, query] of [['contact.png', ''], ['contact-blackout.png', '?group=blackout'], ['contact-blocked.png', '?group=blocked']]) {
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
  console.log(`Board-v2 captures: ${report.length} pictures and three contact sheets, ${failing.length} with problems; ${probes.length} pointer probes, ${probing.length} with problems; ${interactions.length} press tests, ${pressing.length} with problems; ${disclosure.length} page comparisons, ${differing.length} differing; ${labels.length} label placements, ${misplaced.length} with problems`);
  if (failing.length || probing.length || pressing.length || differing.length || misplaced.length) process.exitCode = 1;
}
