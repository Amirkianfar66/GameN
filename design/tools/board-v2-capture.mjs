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
// area, that the strip is where it belongs, and that no name is on the page in the dark. Then it
// compares whole pages: a strike that missed against a round with no strike, and a Blue
// Disabler's screen against a Red one's, which must be the same. These are statements about
// desktop Chromium laying out a review page from synthetic fixtures, not measurements of a phone
// and nothing about a match.

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { boardV2InputsSha256 } from './lib/board-v2-inputs.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const OUT = 'design/board-v2/review';
const { SHELL, fitBoardV2, boardRects, insetsOf } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/js/fit.mjs')).href);
const { BLACKOUT, blackoutFrame } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/films/blackout.mjs')).href);
const { BLACKOUT_OUTCOMES } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/js/fixtures.mjs')).href);
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
  const film = (name, viewport, t, extra, about) => shots.push({ file: `blackout-${vp(viewport)}-${name}.png`, group: 'blackout', viewport, query: `roster=9&fixture=mixed&film=blackout&t=${t}${extra}`, about, film: { t } });
  const at390 = [390, 844];
  film('0150-markers', at390, 150, '', 'Markers fading in at every slot of every room, empty ones included (150 ms)');
  film('1000-preview', at390, 1000, '', 'The preview: lights on, people, name tags and position markers (1 s)');
  film('4360-dip', at390, 4360, '', 'The flicker\'s first dip: every room at about 60% (4 360 ms)');
  film('4760-sparks', at390, 4760, '', 'Each room\'s own light sparking, which light from the window\'s id; the second dip (4 760 ms)');
  film('5100-lights-out', at390, 5100, '', 'Lights out: the rooms going dark, people and tags fading, markers turning dark, the strip coming up (5 100 ms)');
  film('8000-dark', at390, 8000, '', 'The dark, any player\'s screen: faint line work, dark markers, captions at 70%, the strip over the Command band (8 s)');
  film('8000-display', at390, 8000, '&viewer=display', 'The dark on the shared display: no strip; the Command Room dark with its marker (8 s)');
  film('8000-disabler-choose', at390, 8000, '&viewer=disabler&bound=room-b&step=choose', 'The eligible Disabler\'s screen, bound to Room B: the same strip, its line theirs; Room B\'s press areas live (8 s)');
  film('8000-disabler-confirm', at390, 8000, '&viewer=disabler&bound=room-b&step=confirm&pick=2', 'The Disabler chose position 2: its marker gold on their screen only; Strike or Choose again (8 s)');
  film('12000-disabler-registered', at390, 12000, '&viewer=disabler&bound=room-b&step=registered&pick=2', 'Registered: no answer about the target until the outcome (12 s)');
  film('15200-disabler-timeout', at390, 15200, '&viewer=disabler&bound=room-b&step=choose', 'The window closed with nothing registered: a consuming miss, said only on the Disabler\'s screen (15.2 s)');
  film('15000-hold', at390, 15000, '', 'The window\'s end: dark until the outcome is published (15 s)');
  film('15440-impact', at390, 15440, '', 'The outcome published at 15 400: the flash at the hit position, B2 (15 440 ms)');
  film('15560-star', at390, 15560, '', 'The comic star; the lights coming back together in every room; B2\'s room art shaking 3 px, its marker and press area still (15 560 ms)');
  film('15760-back', at390, 15760, '', 'The lights back: Orion, at B2, Injured; markers still up (15 760 ms)');
  film('16300-settled', at390, 16300, '', 'Settled: markers gone, the board normal (16 300 ms)');
  film('15560-double', at390, 15560, '&outcome=double', 'Two strikes, two hits (B2 and A3): one star each, identical (15 560 ms)');
  film('15560-miss', at390, 15560, '&outcome=miss', 'A strike that missed: nothing anywhere, the same as a round with no strike (15 560 ms)');
  for (const [name, t, about] of [['0040-markers', 40, 'markers in with an 80 ms fade'], ['4960-fade', 4960, 'one 80 ms fade to the dark: no flicker, no sparks'], ['8000-dark', 8000, 'the static dark, a still spark in each caption'], ['15420-back', 15420, 'one 80 ms fade back; a still burst at B2'], ['15700-burst', 15700, 'the burst held 600 ms beside the position, then gone']]) {
    film(`reduced-${name}`, at390, t, '&motion=reduced', `Reduced motion: ${about} (${t} ms)`);
  }
  const at320 = [320, 568];
  film('1000-preview', at320, 1000, '', 'The preview on the smallest phone, compact shell (1 s)');
  film('8000-dark', at320, 8000, '', 'The dark on the smallest phone: the strip fills the Command band (8 s)');
  film('8000-disabler-confirm', at320, 8000, '&viewer=disabler&bound=room-b&step=confirm&pick=2', 'The Disabler\'s confirmation on the smallest phone: 44 px buttons (8 s)');
  film('15560-star', at320, 15560, '', 'The star on the smallest phone (15 560 ms)');
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

/** Reads a film frame back: its stage, every marker and press area, the strip, and any name on the page. */
const MEASURE_FILM = `(() => {
  const rooms = {};
  for (const room of document.querySelectorAll('.v2-room[data-room]')) {
    const box = room.getBoundingClientRect();
    const inner = { left: box.left + room.clientLeft, top: box.top + room.clientTop };
    const rect = node => { const b = node.getBoundingClientRect(); return { left: b.left - inner.left, top: b.top - inner.top, width: b.width, height: b.height }; };
    rooms[room.dataset.room] = {
      markers: [...room.querySelectorAll('.v2-marker')].filter(node => !node.hidden).map(node => ({ ...rect(node), style: node.dataset.style, label: node.getAttribute('aria-label') })),
      hits: [...room.querySelectorAll('.v2-hit')].map(rect),
      people: room.querySelectorAll('.v2-fig, .v2-tag').length,
      spark: room.querySelector('.v2-spark') ? rect(room.querySelector('.v2-spark')) : null,
      caption: room.querySelector('.v2-cap') ? rect(room.querySelector('.v2-cap')) : null,
      panel: { width: room.clientWidth, height: room.clientHeight },
    };
  }
  const strip = document.querySelector('.v2-strip:not([hidden])');
  const board = document.querySelector('.v2-board').getBoundingClientRect();
  const s = strip?.getBoundingClientRect();
  const app = document.getElementById('v2-app');
  const labels = [...app.querySelectorAll('[aria-label]')].map(node => node.getAttribute('aria-label')).join(' ');
  return { stage: document.documentElement.dataset.stage, rooms, strip: s ? { left: s.left, top: s.top - board.top, width: s.width, height: s.height, background: getComputedStyle(strip).backgroundColor } : null, text: app.textContent + ' ' + labels, scrolls: document.documentElement.scrollHeight > innerHeight + 1 };
})()`;

function problemsOfFilm(shot, measured) {
  const problems = [];
  const query = new URLSearchParams(shot.query);
  const [width, height] = shot.viewport;
  const roster = Number(query.get('roster') ?? 9);
  const outcome = BLACKOUT_OUTCOMES[query.get('outcome') ?? 'hit'];
  const viewer = query.get('viewer') ?? 'observer';
  const bound = query.get('bound') ?? 'room-b';
  const frame = blackoutFrame(shot.film.t, { outcomeAt: Number(query.get('r') ?? 15400), hits: outcome.hits, reduced: query.get('motion') === 'reduced', windowId: query.get('window') ?? 'w-demo-r3' });
  const board = fitBoardV2({ width, height }, roster);
  const expected = boardRects({ width, height }, roster);
  if (measured.scrolls) problems.push('the page scrolls');
  if (measured.stage !== frame.stage) problems.push(`the page is at ${measured.stage}; the film says ${frame.stage}`);
  for (const [room, drawn] of Object.entries(measured.rooms)) {
    const want = expected[room];
    if (frame.markers.opacity > 0 && drawn.markers.length !== want.length) problems.push(`${room}: ${drawn.markers.length} markers, ${want.length} slots`);
    drawn.markers.forEach((m, i) => {
      const r = want[i];
      // Every marker exactly where fit.mjs puts it, at every moment: the shake never moves one.
      if (Math.abs(m.left + m.width / 2 - r.marker[0]) > 0.6 || Math.abs(m.top + m.height / 2 - r.marker[1]) > 0.6) problems.push(`${room} marker ${i + 1} moved`);
      if (m.label !== `Position ${i + 1}`) problems.push(`${room} marker ${i + 1} is named ${m.label}`);
    });
    // Press areas: only the eligible Disabler's, in the bound room, while the selection is open; each a whole slot press area.
    const live = viewer === 'disabler' && room === bound && frame.selection;
    if (!live && drawn.hits.length) problems.push(`${room}: press areas on a screen that has none`);
    if (live && drawn.hits.length !== want.length) problems.push(`${room}: ${drawn.hits.length} press areas, ${want.length} slots`);
    if (live) drawn.hits.forEach((h, i) => { const r = want[i]; if (Math.abs(h.left - r.left) > 0.6 || Math.abs(h.top - r.top) > 0.6 || Math.abs(h.width - r.side) > 0.6) problems.push(`${room} press area ${i + 1} is not the slot's`); });
    if (frame.people === 'gone' && drawn.people) problems.push(`${room}: people on the page in the dark`);
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
  // The strip: the Command band's box on every player's screen, none on the display.
  const box = board.boxes['command-room'];
  const wantStrip = viewer !== 'display' && frame.strip > 0;
  if (wantStrip !== Boolean(measured.strip)) problems.push(wantStrip ? 'no strip' : 'a strip where there is none');
  if (wantStrip && measured.strip && (Math.abs(measured.strip.left - box.left) > 0.6 || Math.abs(measured.strip.top - (box.top - board.shell.top)) > 0.6 || Math.abs(measured.strip.width - box.width) > 0.6 || Math.abs(measured.strip.height - box.height) > 0.6)) problems.push('the strip is not the Command band\'s box');
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

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const shots = plan();
  await rm(resolve(repoRoot, OUT), { recursive: true, force: true });
  await mkdir(resolve(repoRoot, OUT), { recursive: true });
  const server = await startStaticServer();
  const chrome = await launchBrowser();
  const report = [];
  const disclosure = [];
  const probes = [];
  try {
    const browser = await connect(chrome.endpoint);
    for (const shot of shots) {
      const [width, height] = shot.viewport;
      const page = await openPage(browser, { width, height, scale: shot.scale ?? 2 });
      await page.goto(`${server.origin}/board-v2/index.html?${shot.query}`, 'document.readyState === "complete" && window.__designReady === true');
      const measured = shot.measure ? await page.evaluate(MEASURE) : null;
      const filmed = shot.film ? await page.evaluate(MEASURE_FILM) : null;
      await page.screenshot(resolve(repoRoot, OUT, shot.file), { selector: shot.selector ?? null, viewport: !shot.selector });
      const problems = [...(measured ? problemsOf(shot, measured) : []), ...(filmed ? problemsOfFilm(shot, filmed) : []), ...page.problems()];
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
    // Whole pages that must be the same: a strike that missed and no strike, on any player's screen;
    // a Blue Disabler's screen and a Red one's. And the strip: the same box and the same dark for a
    // player and for the Disabler.
    const pageAt = async (viewport, query) => {
      const page = await openPage(browser, { width: viewport[0], height: viewport[1], scale: 1 });
      await page.goto(`${server.origin}/board-v2/index.html?${query}`, 'document.readyState === "complete" && window.__designReady === true');
      const html = await page.evaluate(`document.getElementById('v2-app').innerHTML`);
      const strip = await page.evaluate(`(() => { const s = document.querySelector('.v2-strip:not([hidden])'); if (!s) return null; const b = s.getBoundingClientRect(); const c = getComputedStyle(s); return [b.left, b.top, b.width, b.height, c.backgroundColor, c.borderColor, c.opacity].join(' '); })()`);
      await page.close();
      return { html, strip };
    };
    const base = 'roster=9&fixture=mixed&film=blackout';
    for (const viewport of [[390, 844], [320, 568]]) {
      for (const t of [1000, 4360, 4760, 5100, 8000, 15000, 15440, 15560, 16300]) {
        for (const reducedMotion of ['', '&motion=reduced']) {
          const [miss, none] = await Promise.all(['miss', 'none'].map(outcome => pageAt(viewport, `${base}&t=${t}&outcome=${outcome}${reducedMotion}`)));
          disclosure.push({ compare: `a missed strike and no strike, ${vp(viewport)}, ${t} ms${reducedMotion ? ', reduced motion' : ''}`, same: miss.html === none.html });
        }
      }
      for (const [t, step] of [[8000, 'choose'], [8000, 'confirm'], [12000, 'registered'], [15200, 'choose']]) {
        const [blue, red] = await Promise.all(['blue', 'red'].map(side => pageAt(viewport, `${base}&t=${t}&viewer=disabler&bound=room-b&step=${step}&pick=2&side=${side}`)));
        disclosure.push({ compare: `a Blue Disabler's screen and a Red one's, ${vp(viewport)}, ${t} ms, ${step}`, same: blue.html === red.html });
      }
      // While the strip is up: coming up, in the dark, and holding for the outcome.
      for (const t of [5180, 8000, 15200]) {
        const [player, disabler] = await Promise.all([pageAt(viewport, `${base}&t=${t}`), pageAt(viewport, `${base}&t=${t}&viewer=disabler&bound=room-b&step=confirm&pick=2`)]);
        disclosure.push({ compare: `the strip's box, color and opacity on a player's screen and the Disabler's, ${vp(viewport)}, ${t} ms`, same: player.strip !== null && player.strip === disabler.strip });
      }
    }
    for (const entry of disclosure) console.log(`${entry.same ? 'same   ' : 'DIFFERS'} ${entry.compare}`);
    const inputsSha256 = await boardV2InputsSha256(repoRoot);
    const index = { devOnly: 'mothership:dev-only', inputsSha256, note: 'Desktop Chromium laying out design/board-v2/index.html from synthetic fixtures. Not a phone measurement and nothing about a match.', captures: shots.map(({ file, group, query, about, sheetHeight }) => ({ file, group, query, about, sheetHeight })) };
    await writeFile(resolve(repoRoot, OUT, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
    await writeFile(resolve(repoRoot, OUT, 'report.json'), `${JSON.stringify({ devOnly: 'mothership:dev-only', inputsSha256, shots: report, probes, disclosure }, null, 2)}\n`);
    for (const [file, query] of [['contact.png', ''], ['contact-blackout.png', '?group=blackout']]) {
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
  console.log(`Board-v2 captures: ${report.length} pictures and two contact sheets, ${failing.length} with problems; ${probes.length} pointer probes, ${probing.length} with problems; ${disclosure.length} page comparisons, ${differing.length} differing`);
  if (failing.length || probing.length || differing.length) process.exitCode = 1;
}
