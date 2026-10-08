// mothership:dev-only
//
// Captures and measures the board-motion prototype (design/board-motion/, issue #87):
//   node design/tools/board-motion-capture.mjs                    everything, then the contact sheets
//   node design/tools/board-motion-capture.mjs --only=shot.choose,w320-code
//                                                    a quick look at scenarios or matrix checks; no report
//   node design/tools/board-motion-capture.mjs --contacts  only the contact sheets, from the last run's pictures
//
// Needs a Chromium-based browser (CHROME_PATH overrides the search). Node built-ins only.
//
// What it writes, all under design/board-motion/review/:
//   states/<scenario>.png      every scenario at 390 x 844 CSS px
//   matrix/<check>.png         320 x 568, 360 x 740, 430 x 932, 150% and 200% text, long names,
//                              simulated safe areas, reduced motion, 7/8/9 players, crowded rooms,
//                              and the centered column on a desktop width
//   motion/<row>-<t>ms.png     storyboards: the real CSS and timelines held at moments of a cue
//   secrecy/<scenario>.png     the acting phone beside what every other screen draws
//   vocabulary.png             nine characters in eleven states
//   contact-*.png, index.json, report.json
//
// What it measures, on every phone capture: the page does not scroll; the board fits its row at
// the default text size (at enlarged text it may scroll inside itself, never clip); the status
// bar and navigation are whole on screen; every character target is at least 44 x 44, on
// screen, inside its room, hit at its center by itself, and overlaps no other target and no
// room tag's press area; every other control is at least 44 x 44; no role or team hook and no
// role name outside the private card; art requested only as whole bundle stylesheets; no page
// error. On every secrecy pair: the other screens' board holds no private mark. These are
// statements about desktop Chromium laying out the prototype, not measurements of a phone.

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { boardMotionInputsSha256 } from './lib/board-motion-inputs.mjs';

export const BASE = '94a49ce0c5220b814ec56333b028fbe6180b257e';
const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const reviewDir = resolve(repoRoot, 'design/board-motion/review');
const only = (process.argv.find(arg => arg.startsWith('--only='))?.slice(7).split(',').filter(Boolean)) ?? null;
const { SCENARIOS } = await import(pathToFileURL(resolve(repoRoot, 'design/board-motion/js/fixtures.js')).href);
const KEY = new Set(['board.idle', 'board.crowded', 'crowd.vote', 'crowd.rescue', 'board.final-zone', 'tray.open', 'shot.choose', 'shot.confirm', 'shot.registered', 'protect.choose', 'rescue.choose', 'scan.faction', 'supply.second', 'code.two', 'vote.election', 'vote.tally', 'release.choice', 'release.vote', 'move.confirm', 'move.accepted', 'pass.confirm', 'pass.passed', 'hack.phase', 'showdown.choose', 'shot.unknown', 'shot.rejected']);

export const MEASURE = `(() => {
  const vw = innerWidth, vh = innerHeight, doc = document.documentElement;
  const app = document.getElementById('bm-app');
  const problems = [];
  const largeText = parseFloat(getComputedStyle(doc).fontSize) >= 20;
  if (doc.scrollWidth > vw + 1) problems.push('page scrolls sideways: ' + doc.scrollWidth + ' > ' + vw);
  if (doc.scrollHeight > vh + 1) problems.push('page scrolls: ' + doc.scrollHeight + ' > ' + vh);
  const board = app.querySelector('.bm-board');
  const boardOverflow = board.scrollHeight - board.clientHeight;
  if (boardOverflow > 1 && !largeText) problems.push('the board does not fit its row: ' + boardOverflow + ' px more');
  if (boardOverflow > 1 && largeText && getComputedStyle(board).overflowY !== 'auto') problems.push('at enlarged text the board is clipped instead of scrolling inside itself');
  for (const sel of ['.bm-status', '.bm-nav']) { const r = app.querySelector(sel).getBoundingClientRect(); if (r.top < -0.5 || r.bottom > vh + 0.5) problems.push(sel + ' is not whole on screen'); }
  const rect = r => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
  const visible = n => { const r = n.getBoundingClientRect(); const s = getComputedStyle(n); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !n.closest('[hidden]'); };
  const targets = [...app.querySelectorAll('.bm-piece__target')].filter(visible).map(b => ({ b, r: rect(b.getBoundingClientRect()), room: rect(b.closest('.bm-room').getBoundingClientRect()), seat: b.dataset.value }));
  for (const t of targets) {
    if (t.r.width < 43.5 || t.r.height < 43.5) problems.push(t.seat + ' target is ' + Math.round(t.r.width) + 'x' + Math.round(t.r.height));
    if (t.r.left < -0.5 || t.r.right > vw + 0.5 || t.r.top < -0.5 || t.r.bottom > vh + 0.5) problems.push(t.seat + ' target is off screen');
    if (!largeText && (t.r.left < t.room.left - 1 || t.r.right > t.room.right + 1 || t.r.top < t.room.top - 1 || t.r.bottom > t.room.bottom + 1)) problems.push(t.seat + ' target leaves its room');
    const cx = t.r.left + t.r.width / 2, cy = t.r.top + t.r.height / 2;
    const hit = cy >= 0 && cy <= vh ? document.elementFromPoint(cx, cy) : null;
    if (!largeText && (!hit || !(hit === t.b || t.b.contains(hit)))) problems.push(t.seat + ' target center is covered by ' + (hit ? (hit.className || hit.tagName) : 'nothing'));
  }
  const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  for (let i = 0; i < targets.length; i++) for (let j = i + 1; j < targets.length; j++) if (overlap(targets[i].r, targets[j].r) > 1) problems.push(targets[i].seat + ' and ' + targets[j].seat + ' targets overlap');
  const tags = [...app.querySelectorAll('button.bm-tag__move')].filter(visible).map(b => ({ name: b.dataset.moveRoom, r: rect(b.getBoundingClientRect()) }));
  for (const tag of tags) {
    if (tag.r.right - tag.r.left < 43.5 || tag.r.bottom - tag.r.top < 43.5) problems.push('the ' + tag.name + ' tag press area is under 44 px');
    for (const t of targets) if (overlap(tag.r, t.r) > 1) problems.push('the ' + tag.name + ' tag press area overlaps ' + t.seat);
  }
  for (const c of app.querySelectorAll('.bm-nav button, .bm-strip button, .bm-tray button, .bm-sheet button')) {
    if (!visible(c)) continue;
    const r = c.getBoundingClientRect();
    if (r.width < 43.5 || r.height < 43.5) problems.push('control "' + c.textContent.trim().slice(0, 24) + '" is ' + Math.round(r.width) + 'x' + Math.round(r.height));
  }
  const hooks = [...app.querySelectorAll('[data-device], [data-team]')].filter(n => !n.closest('.bm-private'));
  if (hooks.length) problems.push('a role or team hook outside the private card: ' + hooks.map(n => n.className).join(', '));
  const copy = app.cloneNode(true);
  for (const n of copy.querySelectorAll('.bm-private')) n.remove();
  const roleWord = (copy.textContent.match(/\\b(Officer|Insider|Cracker|Blue Disabler|Supplier|Undercover|Hacker|Red Disabler)\\b/) || [])[0];
  if (roleWord) problems.push('a role name outside the private card: ' + roleWord);
  const roomOf = n => n.closest('.bm-room')?.dataset.room;
  const places = Object.fromEntries([...app.querySelectorAll('.bm-board .bm-piece')].map(n => [n.dataset.seat, roomOf(n) + '/' + n.dataset.station]));
  return { problems, targets: targets.length, boardOverflow, largeText, places };
})()`;

/** On a secrecy pair: the other screens' board holds nothing private. */
const OBSERVER = `(() => {
  const obs = document.querySelector('[data-observer] .bm-board');
  const problems = [];
  if (!obs) return { problems: ['no observer board'] };
  const marks = obs.querySelectorAll('[data-target], .bm-piece__target, .bm-piece__pick, .bm-ghost, .bm-stamp, .bm-private, [data-device], [data-team]');
  if (marks.length) problems.push('the other screens show a private mark: ' + [...marks].map(n => n.className || n.tagName).join(', '));
  if (/\\b(Officer|Insider|Cracker|Blue Disabler|Supplier|Undercover|Hacker|Red Disabler)\\b/.test(obs.textContent)) problems.push('the other screens show a role name');
  const own = Object.fromEntries([...document.querySelectorAll('#bm-app .bm-board .bm-piece')].map(n => [n.dataset.seat, n.closest('.bm-room').dataset.room]));
  const other = Object.fromEntries([...obs.querySelectorAll('.bm-piece')].map(n => [n.dataset.seat, n.closest('.bm-room').dataset.room]));
  if (JSON.stringify(own) !== JSON.stringify(other)) problems.push('the two boards disagree about where someone is');
  return { problems };
})()`;

const m = (id, scenario, width, height, about, extra = {}) => ({ id, scenario, width, height, about, ...extra });
export const MATRIX = [
  m('w320-idle', 'board.idle', 320, 568, '320 x 568: the board, nine players'),
  m('w320-shot', 'shot.choose', 320, 568, '320 x 568: a Shot, eligible characters'),
  m('w320-code', 'code.two', 320, 568, '320 x 568: a Code attempt, two of four'),
  m('w320-vote', 'vote.election', 320, 568, '320 x 568: nine candidates on the board'),
  m('w320-crowded', 'board.crowded', 320, 568, '320 x 568: seven in Room A'),
  m('w320-all', 'board.all-one-room', 320, 568, '320 x 568: all nine in Room A'),
  m('w320-tightest', 'board.tightest', 320, 568, '320 x 568: the tallest board, with a Shot open'),
  m('w320-tray', 'tray.open', 320, 568, '320 x 568: the actions tray'),
  m('w320-release', 'release.vote', 320, 568, '320 x 568: a release vote'),
  m('w320-move', 'move.confirm', 320, 568, '320 x 568: a tentative move'),
  m('w320-showdown', 'showdown.choose', 320, 568, '320 x 568: the Final Zone'),
  m('w320-hospital', 'board.crowded-hospital', 320, 568, '320 x 568: six in the Hospital'),
  m('w320-crowd-vote', 'crowd.vote', 320, 568, '320 x 568: all nine in Room A, all nine candidates'),
  m('w320-crowd-shot', 'crowd.shot', 320, 568, '320 x 568: all nine in Room A, a Shot at any of eight'),
  m('w320-crowd-rescue', 'crowd.rescue', 320, 568, '320 x 568: eight in the Hospital, a Rescue for any'),
  m('w320-crowd-supply', 'crowd.supply', 320, 568, '320 x 568: all nine in Room A, a Supply under way'),
  m('w360-idle', 'board.idle', 360, 740, '360 x 740: the board'),
  m('w360-shot', 'shot.choose', 360, 740, '360 x 740: a Shot'),
  m('w360-crowded', 'board.crowded', 360, 740, '360 x 740: seven in Room A'),
  m('w360-crowd-vote', 'crowd.vote', 360, 740, '360 x 740: all nine candidates in Room A'),
  m('w430-crowd-vote', 'crowd.vote', 430, 932, '430 x 932: all nine candidates in Room A'),
  m('text200-crowd', 'crowd.vote', 390, 844, '200% text: all nine candidates in Room A', { fontPx: 32 }),
  m('w430-idle', 'board.idle', 430, 932, '430 x 932: the board'),
  m('w430-code', 'code.four', 430, 932, '430 x 932: a Code attempt, confirm'),
  m('w390-crowded', 'board.all-one-room', 390, 844, '390 x 844: all nine in Room A'),
  m('w390-seven', 'board.seven', 390, 844, '390 x 844: seven players'),
  m('w390-eight', 'board.eight', 390, 844, '390 x 844: eight players'),
  m('long-names', 'board.long-names', 390, 844, 'Twelve-character names'),
  m('long-names-vote', 'vote.election', 390, 844, 'Twelve-character names, every character a candidate', { names: 'long' }),
  m('long-names-320', 'board.long-names', 320, 568, '320 x 568, twelve-character names'),
  m('text150-shot', 'shot.choose', 390, 844, '150% text (default font 24 px): a Shot', { fontPx: 24 }),
  m('text200-idle', 'board.idle', 390, 844, '200% text (default font 32 px): the board', { fontPx: 32 }),
  m('text200-shot', 'shot.choose', 390, 844, '200% text: a Shot', { fontPx: 32 }),
  m('text200-release', 'release.vote', 390, 844, '200% text: a release vote', { fontPx: 32 }),
  m('text200-320', 'shot.choose', 320, 568, '320 x 568 at 200% text: a Shot', { fontPx: 32 }),
  m('safe-idle', 'board.idle', 390, 844, 'Simulated safe areas (47 px top, 34 px bottom): the board', { safe: true }),
  m('safe-shot', 'shot.choose', 390, 844, 'Simulated safe areas: a Shot', { safe: true }),
  m('reduced-move', 'board.idle', 390, 844, 'Reduced motion: a public move, settled with the 80 ms fade', { motion: 'reduced', play: 'move' }),
  m('reduced-registered', 'shot.registered', 390, 844, 'Reduced motion: registered', { motion: 'reduced' }),
  m('desktop-idle', 'board.idle', 1280, 800, 'Desktop 1280 x 800: the same design, one centered column'),
  m('desktop-shot', 'shot.choose', 1280, 800, 'Desktop 1280 x 800: a Shot'),
];

const sb = (cue, title, scenario, frames, extra = {}) => ({ cue, title, scenario, frames, ...extra });
export const STORYBOARD = [
  sb('cue-tray-open', 'The actions tray rises over the board', 'board.idle', [0, 110, 220], { play: 'tray', token: 'motionMs.cardTransition 220 ms', audience: 'local', trigger: 'Actions pressed.', proposal: true }),
  sb('cue-strip-enter', 'Shot chosen: the strip rises above navigation', 'board.idle', [0, 110, 220], { play: 'strip', crop: '.bm-app', token: 'motionMs.cardTransition 220 ms', audience: 'local', trigger: 'An action is chosen in the tray.', proposal: true }),
  sb('cue-target-eligible', 'Eligible characters for a Shot', 'shot.choose', [0], { crop: '.bm-board', token: 'state, no motion', audience: 'local (own open action)', trigger: 'Shot chosen in the tray.', proposal: true }),
  sb('cue-selection', 'A character is chosen: lift and stamp', 'shot.choose', [0, 60, 120], { play: 'pick', crop: '.bm-room[data-room="room-a"]', token: 'motionMs.selection 120 ms', audience: 'local', trigger: 'Tap on an eligible character.' }),
  sb('cue-target-pick', 'Supply: the first pick is numbered', 'supply.first', [0, 60, 120], { play: 'pick', crop: '.bm-room[data-room="room-a"]', token: 'motionMs.registrationStamp 120 ms', audience: 'local', trigger: 'Tap on an eligible character, several to pick.', proposal: true }),
  sb('cue-pending', 'Sending: dotted ring, nothing moves', 'shot.pending', [0], { crop: '.bm-app', token: 'state, no motion', audience: 'local', trigger: 'Confirm pressed.', proposal: true }),
  sb('cue-registration', 'Registered: the same neutral stamp for every action', 'shot.confirm', [0, 60, 120], { play: 'register', crop: '.bm-strip', token: 'motionMs.registrationStamp 120 ms', audience: 'private (own receipt)', trigger: 'Accepted receipt.' }),
  sb('cue-not-accepted', 'Not accepted: a short nudge of the strip', 'shot.confirm', [0, 60, 120], { play: 'reject', crop: '.bm-strip', token: 'motionMs.selection 120 ms', audience: 'private (own receipt)', trigger: 'Rejected receipt.', proposal: true }),
  sb('cue-room-press', 'A room tag is pressed; a tentative place appears', 'board.idle', [0, 110, 220], { play: 'tag', also: ['cue-move-tentative'], crop: '.bm-room[data-room="room-b"]', token: 'motionMs.selection 120 ms; motionMs.cardTransition 220 ms', audience: 'local', trigger: 'Room B tag pressed.', proposal: true }),
  sb('cue-public-move', 'A public move: carried between stations', 'board.idle', [0, 225, 450, 675, 900], { play: 'move', crop: '.bm-board', token: 'motionMs.pieceMove 900 ms', audience: 'public: every screen', trigger: 'A view that shows Player 2 in Room A.' }),
  sb('cue-public-move', 'Your own move, when the public update arrives', 'board.idle', [0, 300, 600, 900], { play: 'self', crop: '.bm-board', token: 'motionMs.pieceMove 900 ms', audience: 'public: every screen', trigger: 'The accepted move, then a view that shows Player 3 in Room B.' }),
  sb('cue-status-change', 'Now Injured: the marker is stamped on', 'board.idle', [0, 110, 220], { play: 'injure', crop: '.bm-room[data-room="room-a"]', token: 'motionMs.cardTransition 220 ms', audience: 'public: every screen', trigger: 'A view that shows Player 5 Injured.' }),
  sb('cue-status-change', 'Now Eliminated: grey, and the faction the rules reveal', 'board.idle', [0, 110, 220], { play: 'eliminate', crop: '.bm-room[data-room="room-b"]', token: 'motionMs.cardTransition 220 ms', audience: 'public: every screen', trigger: 'A view that shows Player 4 Eliminated.' }),
  sb('cue-status-change', 'A new Captain', 'board.idle', [0, 110, 220], { play: 'captain', crop: '.bm-board', token: 'motionMs.cardTransition 220 ms', audience: 'public: every screen', trigger: 'A view that shows Player 1 as Captain.' }),
  sb('cue-phase-change', 'The next turn: the status words and the turn marker', 'board.idle', [0, 110, 220], { play: 'phase', also: ['cue-turn-accent'], token: 'motionMs.cardTransition 220 ms', audience: 'public: every screen', trigger: 'PHASE_CHANGED to the next player.' }),
  sb('cue-round-transition', 'A new round', 'board.idle', [0, 230, 470, 700], { play: 'round', crop: '.bm-status', token: 'motionMs.roundTransition 700 ms', audience: 'public: every screen', trigger: 'PHASE_CHANGED with a higher round.' }),
  sb('cue-sheet-open', 'The private card opens over the board', 'hack.phase', [0], { token: 'motionMs.cardTransition 220 ms', audience: 'private', trigger: 'Card pressed.', proposal: true }),
  sb('cue-tally', 'The published count of a closed vote', 'vote.tally', [0], { crop: '.bm-board', token: 'motionMs.cardTransition 220 ms', audience: 'public: every screen', trigger: 'The view carries lastTally.', proposal: true }),
  sb('cue-ballot-subject', 'The subject of a release vote', 'release.vote', [0], { crop: '.bm-board', token: 'state, no motion', audience: 'public: every screen', trigger: 'A release vote opens.', proposal: true }),
];

export const SECRECY = ['shot.pending', 'supply.second', 'code.four', 'scan.faction', 'protect.choose', 'vote.recorded', 'move.confirm', 'hack.phase'];

const server = await startStaticServer({ port: 0 });
const browsers = new Map();
const results = [];
const images = [];
let version = 'unknown';
async function withBrowser(fontPx, run) {
  if (!browsers.has(fontPx)) {
    const launched = await launchBrowser({ defaultFontPx: fontPx });
    version = launched.version;
    browsers.set(fontPx, { launched, browser: await connect(launched.endpoint) });
  }
  return run(browsers.get(fontPx).browser);
}

function artProblems(requests) {
  const problems = [];
  const art = requests.filter(url => url.includes('/exports/') || url.includes('/board-motion/assets/'));
  const single = art.filter(url => !url.endsWith('.css'));
  if (single.length) problems.push(`a single picture was requested: ${single.join(', ')}`);
  for (const bundle of ['public-board', 'player-ui', 'roles']) if (!art.some(url => url.includes(`/exports/${bundle}/`))) problems.push(`bundle ${bundle} was not requested`);
  return problems;
}

async function capture({ id, scenario, width, height, file, fontPx = null, names = null, motion = null, safe = false, play = null, hold = null, crop = null, chrome = false, measure = true, kind }) {
  return withBrowser(fontPx, async browser => {
    const page = await openPage(browser, { width, height, scale: 1, mobile: width < 600 });
    const query = new URLSearchParams({ scenario });
    if (!chrome) query.set('chrome', '0');
    else query.set('panel', '0');
    if (names) query.set('names', names);
    if (motion) query.set('motion', motion);
    if (safe) query.set('safe', '1');
    if (play) query.set('play', play);
    if (hold !== null) query.set('t', String(hold));
    await page.goto(`${server.origin}/board-motion/?${query}`, 'window.__designReady === true && document.readyState === "complete"');
    await page.evaluate(`new Promise(done => setTimeout(done, ${hold !== null ? 120 : 900}))`);
    const problems = [];
    let measured = null;
    if (measure) {
      measured = await page.evaluate(chrome ? OBSERVER : MEASURE);
      problems.push(...measured.problems);
    }
    problems.push(...artProblems(page.requests()), ...page.problems().map(line => `page: ${line}`));
    const shot = await page.screenshot(file, crop ? { selector: crop, margin: 6 } : { viewport: true });
    await page.close();
    const relative = file.replace(`${repoRoot}/`, '');
    images.push({ id, state: scenario, file: relative, width: shot.width, height: shot.height, viewport: `${width}x${height}`, fontPx, names, motion, kind, ...(kind === 'matrix' ? { matrix: true } : {}) });
    results.push({ id, scenario, viewport: `${width}x${height}`, fontPx, kind, problems, measured: measured ? { targets: measured.targets, boardOverflow: measured.boardOverflow, places: measured.places } : null });
    return problems;
  });
}

const SHEETS = [['contact-key', 'key'], ['contact-all', 'all'], ['contact-matrix', 'matrix'], ['contact-motion', 'motion'], ['contact-secrecy', 'secrecy']];
/** The five contact sheets. A sheet with a picture that did not load and decode is refused, not shot as it is. */
async function contactSheets() {
  const problems = [];
  const made = [];
  for (const [name, set] of SHEETS) {
    await withBrowser(null, async browser => {
      const page = await openPage(browser, { width: 1600, height: 1000, scale: 1 });
      await page.goto(`${server.origin}/board-motion/contact.html?set=${set}`, 'window.__designReady === true');
      const broken = await page.evaluate('Promise.all([...document.images].map(img => img.decode().then(() => null, () => img.getAttribute("src")))).then(list => list.filter(Boolean))');
      problems.push(...broken.map(src => `${name}: a picture did not load: ${src}`), ...page.problems().map(line => `${name}: ${line}`));
      const shot = await page.screenshot(resolve(reviewDir, `${name}.png`));
      await page.close();
      made.push({ id: name, state: null, file: `design/board-motion/review/${name}.png`, width: shot.width, height: shot.height, viewport: '1600', contact: true });
    });
  }
  return { problems, made };
}

const say = (problems, label) => console.log(`${problems.length ? 'FAIL' : 'ok  '}  ${label}${problems.length ? `\n        ${problems.join('\n        ')}` : ''}`);
try {
  if (process.argv.includes('--contacts')) {
    // Rebuild only the contact sheets from the last run's pictures, and record the result in its report.
    const index = JSON.parse(await readFile(resolve(reviewDir, 'index.json'), 'utf8'));
    const report = JSON.parse(await readFile(resolve(reviewDir, 'report.json'), 'utf8'));
    if (index.inputsSha256 !== await boardMotionInputsSha256(repoRoot)) throw new Error('The pages changed since the last capture: run the whole capture');
    const sheets = await contactSheets();
    index.images = [...index.images.filter(image => !image.contact), ...sheets.made];
    report.results = [...report.results.filter(result => result.kind !== 'contact'), { id: 'contact-sheets', kind: 'contact', problems: sheets.problems }];
    report.failures = report.results.filter(result => result.problems.length).map(result => ({ id: result.id, problems: result.problems }));
    await writeFile(resolve(reviewDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
    await writeFile(resolve(reviewDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    say(sheets.problems, `contact sheets (${sheets.made.length})`);
    if (report.failures.length) process.exitCode = 1;
  }
  const targets = process.argv.includes('--contacts') ? [] : only ? SCENARIOS.filter(entry => only.includes(entry.id)) : SCENARIOS;
  if (!only && !process.argv.includes('--contacts')) await rm(reviewDir, { recursive: true, force: true });
  for (const sub of ['states', 'matrix', 'motion', 'secrecy']) await mkdir(resolve(reviewDir, sub), { recursive: true });
  for (const entry of targets) say(await capture({ id: entry.id, scenario: entry.id, width: 390, height: 844, file: resolve(reviewDir, 'states', `${entry.id}.png`), kind: 'state' }), entry.id);
  // --only also takes matrix ids, for a quick look at one size.
  if (only) for (const check of MATRIX.filter(entry => only.includes(entry.id))) say(await capture({ ...check, file: resolve(reviewDir, 'matrix', `${check.id}.png`), kind: 'matrix' }), `matrix ${check.id}`);
  if (!only && !process.argv.includes('--contacts')) {
    for (const check of MATRIX) say(await capture({ ...check, file: resolve(reviewDir, 'matrix', `${check.id}.png`), kind: 'matrix' }), `matrix ${check.id}`);
    const rows = [];
    for (const [index, board] of STORYBOARD.entries()) {
      const row = `${String(index + 1).padStart(2, '0')}-${board.cue}`;
      rows.push({ row, ...board });
      let failed = 0;
      for (const at of board.frames) {
        const problems = await capture({ id: `${row}-${at}`, scenario: board.scenario, width: 390, height: 844, play: board.play ?? null, hold: board.frames.length > 1 ? at : null, crop: board.crop ?? null, measure: false, file: resolve(reviewDir, 'motion', `${row}-${at}ms.png`), kind: 'frame' });
        images.at(-1).frame = { row, cue: board.cue, at };
        if (problems.length) { failed += 1; say(problems, `motion ${row} @${at}`); }
      }
      const problems = await capture({ id: `${row}-reduced`, scenario: board.scenario, width: 390, height: 844, play: board.play ?? null, motion: 'reduced', crop: board.crop ?? null, measure: false, file: resolve(reviewDir, 'motion', `${row}-reduced.png`), kind: 'frame' });
      images.at(-1).frame = { row, cue: board.cue, at: 'reduced' };
      say(problems, `motion ${row} (${board.frames.length} frames + reduced)${failed ? `, ${failed} frames failed` : ''}`);
    }
    for (const scenario of SECRECY) {
      const problems = await capture({ id: `secrecy-${scenario}`, scenario, width: 1440, height: 920, chrome: true, crop: '.bm-proto', file: resolve(reviewDir, 'secrecy', `${scenario}.png`), kind: 'secrecy' });
      Object.assign(images.at(-1), { secrecy: true, title: SCENARIOS.find(entry => entry.id === scenario).title });
      say(problems, `secrecy ${scenario}`);
    }
    // The vocabulary sheet: nine characters, eleven states.
    await withBrowser(null, async browser => {
      const page = await openPage(browser, { width: 1420, height: 1300, scale: 1 });
      await page.goto(`${server.origin}/board-motion/vocabulary.html`, 'window.__designReady === true');
      await page.evaluate('new Promise(done => setTimeout(done, 400))');
      const problems = [...artProblems(page.requests()), ...page.problems().map(line => `page: ${line}`)];
      const shot = await page.screenshot(resolve(reviewDir, 'vocabulary.png'), { viewport: false });
      await page.close();
      images.push({ id: 'vocabulary', state: null, file: 'design/board-motion/review/vocabulary.png', width: shot.width, height: shot.height, viewport: '1420', kind: 'vocabulary' });
      results.push({ id: 'vocabulary', kind: 'vocabulary', problems });
      say(problems, 'vocabulary sheet');
    });
    const inputsSha256 = await boardMotionInputsSha256(repoRoot);
    const index = {
      devOnly: 'mothership:dev-only', tool: 'design/tools/board-motion-capture.mjs', base: BASE, inputsSha256, browser: version,
      note: 'Desktop Chromium laying out the prototype with this machine’s fonts. Simulated viewports, not device measurements.',
      scenarios: SCENARIOS.map(entry => ({ id: entry.id, group: entry.group, title: entry.title, key: KEY.has(entry.id) })),
      matrix: MATRIX.map(({ id, about }) => ({ id, about })), storyboard: rows, images,
    };
    await writeFile(resolve(reviewDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
    const sheets = await contactSheets();
    images.push(...sheets.made);
    results.push({ id: 'contact-sheets', kind: 'contact', problems: sheets.problems });
    say(sheets.problems, `contact sheets (${sheets.made.length})`);
    index.images = images;
    await writeFile(resolve(reviewDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
    const failures = results.filter(result => result.problems.length).map(result => ({ id: result.id, problems: result.problems }));
    const captures = results.filter(result => result.kind !== 'contact').length;
    await writeFile(resolve(reviewDir, 'report.json'), `${JSON.stringify({ devOnly: 'mothership:dev-only', tool: 'design/tools/board-motion-capture.mjs', base: BASE, inputsSha256, browser: version, captures, failures, results }, null, 2)}\n`);
    console.log(`\nBoard-motion capture: ${captures} captures and ${sheets.made.length} contact sheets, ${failures.length} with problems; browser ${version}`);
    if (failures.length) process.exitCode = 1;
  }
} finally {
  for (const { launched, browser } of browsers.values()) { browser.close(); await launched.close(); }
  await server.close();
}
