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
// without safe-area insets. These are statements about desktop Chromium laying out a review
// page from synthetic fixtures, not measurements of a phone and nothing about a match.

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { boardV2InputsSha256 } from './lib/board-v2-inputs.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const OUT = 'design/board-v2/review';
const { SHELL, fitBoardV2, boardRects, insetsOf } = await import(pathToFileURL(resolve(repoRoot, 'design/board-v2/js/fit.mjs')).href);

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
  const probes = [];
  try {
    const browser = await connect(chrome.endpoint);
    for (const shot of shots) {
      const [width, height] = shot.viewport;
      const page = await openPage(browser, { width, height, scale: shot.scale ?? 2 });
      await page.goto(`${server.origin}/board-v2/index.html?${shot.query}`, 'document.readyState === "complete" && window.__designReady === true');
      const measured = shot.measure ? await page.evaluate(MEASURE) : null;
      await page.screenshot(resolve(repoRoot, OUT, shot.file), { selector: shot.selector ?? null, viewport: !shot.selector });
      const problems = [...(measured ? problemsOf(shot, measured) : []), ...page.problems()];
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
    const inputsSha256 = await boardV2InputsSha256(repoRoot);
    const index = { devOnly: 'mothership:dev-only', inputsSha256, note: 'Desktop Chromium laying out design/board-v2/index.html from synthetic fixtures. Not a phone measurement and nothing about a match.', captures: shots.map(({ file, group, query, about, sheetHeight }) => ({ file, group, query, about, sheetHeight })) };
    await writeFile(resolve(repoRoot, OUT, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
    await writeFile(resolve(repoRoot, OUT, 'report.json'), `${JSON.stringify({ devOnly: 'mothership:dev-only', inputsSha256, shots: report, probes }, null, 2)}\n`);
    const page = await openPage(browser, { width: 1600, height: 900, scale: 1 });
    await page.goto(`${server.origin}/board-v2/contact.html`, 'document.readyState === "complete" && window.__designReady === true');
    await page.fitHeight();
    await page.screenshot(resolve(repoRoot, OUT, 'contact.png'));
    browser.close();
  } finally {
    await chrome.close();
    await server.close();
  }
  const failing = report.filter(entry => entry.problems.length);
  const probing = probes.filter(entry => entry.problems.length);
  console.log(`Board-v2 captures: ${report.length} pictures and a contact sheet, ${failing.length} with problems; ${probes.length} pointer probes, ${probing.length} with problems`);
  if (failing.length || probing.length) process.exitCode = 1;
}
