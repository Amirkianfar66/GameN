// mothership:dev-only
//
// Captures and measures the phone-first V1 journey prototype (design/v1-phone/, issue #76):
//   node design/tools/v1-phone-capture.mjs            every state, the viewport matrix, the contact sheets
//   node design/tools/v1-phone-capture.mjs --only=host.lobby-empty,game.waiting   a quick look; writes no report
//
// Needs a Chromium-based browser (CHROME_PATH overrides the search). Node built-ins only.
//
// What it writes, all under design/v1-phone/review/:
//   states/<state>.png          every state at 390 x 844 CSS px, the first screenful
//   matrix/<check>.png          320, 360 and 430 widths, a short viewport, 200% text, long names,
//                               a keyboard-height viewport with a field focused, nine seats in one room
//   contact-*.png               contact sheets of the above
//   index.json                  what was captured, from which inputs, in which browser
//   report.json                 the measurements and every failure
//
// What it measures, on every capture: no horizontal overflow; every visible control at least
// 44 x 44 CSS px; on a public or host state, no role name, device hook, team hook or private
// container anywhere in the document; on a private state, role hooks only inside .j-private;
// the art requested as three whole bundles (or one, for host and display) and never a single
// picture; no page error. These are statements about desktop Chromium laying out the
// prototype. They are not measurements of a phone, and say nothing about touch accuracy,
// readability at arm's length, a screen reader or performance.

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { v1PhoneInputsSha256 } from './lib/v1-phone-inputs.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const root = resolve(repoRoot, 'design/v1-phone');
const reviewDir = resolve(root, 'review');
const only = (process.argv.find(arg => arg.startsWith('--only='))?.slice(7).split(',').filter(Boolean)) ?? null;
const journey = JSON.parse(await readFile(resolve(root, 'contract/journey.json'), 'utf8'));
const STATES = journey.screens.flatMap(screen => screen.states.map(state => ({ ...state, screen: screen.id, screenTitle: screen.title, priority: screen.priority })));
const ROLE_WORDS = ['Officer', 'Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Red Disabler', 'Alien'];
const PRIVATE_STATES = new Set(STATES.filter(state => state.audience === 'private').map(state => state.id));
// The end reveal is public at the end of a match (V1-18): roles may be named there, and only there.
const REVEAL_STATES = new Set(['end.winner', 'end.draw', 'end.next', 'display.result']);

// The checks that run inside the page. Returns { overflow, smallTargets, leaks, ... }.
const MEASURE = `(() => {
  const vw = document.documentElement.clientWidth;
  const visible = node => { const r = node.getBoundingClientRect(); const s = getComputedStyle(node); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !node.closest('.j-vh, [hidden], .j-nav, .j-notes'); };
  const overflow = [];
  if (document.documentElement.scrollWidth > vw + 1) overflow.push('page scrolls sideways: ' + document.documentElement.scrollWidth + ' > ' + vw);
  for (const node of document.querySelectorAll('.j-screen *')) {
    if (!visible(node)) continue;
    const r = node.getBoundingClientRect();
    if (r.right > vw + 1.5 && !node.closest('.j-piece, .j-room__cap, .j-cap, .j-crewtile__state')) overflow.push((node.className || node.tagName) + ' ends at ' + Math.round(r.right));
  }
  const smallTargets = [];
  for (const node of document.querySelectorAll('.j-screen button, .j-screen a[href], .j-screen input:not([type=radio]), .j-screen select, .j-screen summary, .j-screen label:has(> input[type=radio])')) {
    if (!visible(node)) continue;
    const r = node.getBoundingClientRect();
    if (r.width < 43.5 || r.height < 43.5) smallTargets.push((node.textContent.trim().slice(0, 30) || node.className) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  }
  const text = document.body.innerText;
  const roleWords = ${JSON.stringify(ROLE_WORDS)}.filter(word => new RegExp('\\\\b' + word + '\\\\b').test(text));
  const outsideHooks = [...document.querySelectorAll('[data-device], [data-team]')].filter(node => !node.closest('.j-private') && !node.classList.contains('j-swatch')).map(node => node.className);
  const privateContainers = document.querySelectorAll('.j-private').length;
  const clippedCaptions = [...document.querySelectorAll('.j-cap, .j-sheet__title, .j-strip__what')].filter(node => node.scrollWidth > node.clientWidth + 1).map(node => node.textContent.trim().slice(0, 40));
  const active = document.activeElement;
  const focus = active && active !== document.body ? (() => { const r = active.getBoundingClientRect(); return { tag: active.tagName, inView: r.top >= 0 && r.bottom <= innerHeight }; })() : null;
  const primary = document.querySelector('.j-dock .j-btn--primary');
  const primaryInView = primary ? (() => { const r = primary.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })() : null;
  return { overflow, smallTargets, roleWords, outsideHooks, privateContainers, clippedCaptions, focus, primaryInView, height: document.documentElement.scrollHeight };
})()`;

const MATRIX = [
  { id: 'w320-game-crowded', state: 'game.crowded', width: 320, height: 640, about: '320 CSS px: nine seats, seven in one room' },
  { id: 'w320-select-open', state: 'select.open', width: 320, height: 640, about: '320 CSS px: character selection' },
  { id: 'w320-host-requests', state: 'host.requests', width: 320, height: 640, about: '320 CSS px: host with two requests' },
  { id: 'w320-reveal-revealed', state: 'reveal.revealed', width: 320, height: 640, about: '320 CSS px: role card face up' },
  { id: 'w360-game-waiting', state: 'game.waiting', width: 360, height: 740, about: '360 CSS px: someone else’s turn' },
  { id: 'w360-host-full', state: 'host.full', width: 360, height: 740, about: '360 CSS px: full roster, Start setup' },
  { id: 'w430-game-private', state: 'game.private-open', width: 430, height: 932, about: '430 CSS px: private card open' },
  { id: 'w430-select-picked', state: 'select.picked', width: 430, height: 932, about: '430 CSS px: character picked' },
  { id: 'short-game-own-turn', state: 'game.own-turn', width: 390, height: 600, about: 'Short viewport 390 x 600: your turn' },
  { id: 'short-reveal-concealed', state: 'reveal.concealed', width: 390, height: 600, about: 'Short viewport 390 x 600: role card face down' },
  { id: 'text200-game-waiting', state: 'game.waiting', width: 390, height: 844, fontPx: 32, about: '200% text (default font 32 px): game' },
  { id: 'text200-select-open', state: 'select.open', width: 390, height: 844, fontPx: 32, about: '200% text: character selection' },
  { id: 'text200-host-lobby', state: 'host.requests', width: 390, height: 844, fontPx: 32, about: '200% text: host lobby' },
  { id: 'text200-reveal', state: 'reveal.revealed', width: 390, height: 844, fontPx: 32, about: '200% text: role card face up' },
  { id: 'text200-game-readable', state: 'game.readable', width: 390, height: 844, fontPx: 32, full: true, about: '200% text: the readable list, whole page' },
  { id: 'long-names-game', state: 'game.crowded', width: 390, height: 844, names: 'long', about: 'Twelve-character names, nine seats' },
  { id: 'long-names-select', state: 'select.confirmed', width: 390, height: 844, names: 'long', about: 'Twelve-character names, crew progress' },
  { id: 'long-names-end', state: 'end.winner', width: 390, height: 844, names: 'long', full: true, about: 'Twelve-character names, final reveal' },
  { id: 'keyboard-join', state: 'join.code', width: 390, height: 450, focus: '#j-code', type: '4F2A9C', about: 'Keyboard up (390 x 450 left): room code field focused' },
  { id: 'keyboard-name', state: 'select.picked', width: 390, height: 450, focus: '#j-name', about: 'Keyboard up (390 x 450 left): name field focused' },
  { id: 'reduced-motion-reveal', state: 'reveal.revealed', width: 390, height: 844, motion: 'reduced', about: 'Reduced motion: the card is shown without the turn' },
  { id: 'desktop-host', state: 'host.requests', width: 1280, height: 800, about: 'Desktop 1280: host, same hierarchy, comfortable width' },
  { id: 'desktop-select', state: 'select.picked', width: 1280, height: 800, about: 'Desktop 1280: character selection' },
  { id: 'desktop-game', state: 'game.private-open', width: 1280, height: 800, about: 'Desktop 1280: game with the private card' },
  { id: 'display-board', state: 'display.board', width: 1280, height: 800, about: 'Shared display 1280: public board' },
  { id: 'display-setup', state: 'display.setup', width: 1280, height: 800, about: 'Shared display 1280: neutral setup progress' },
  { id: 'display-result', state: 'display.result', width: 1280, height: 800, full: true, about: 'Shared display 1280: result and permitted reveal' },
];

// Storyboards: each cue held at moments of its own timeline (?t=<ms>) in the state where it plays,
// clipped to the part that moves; then the same state under reduced motion. Frames of the real CSS.
const STORYBOARD = [
  { cue: 'cue-stage-change', title: 'A new setup stage: the caption lands', state: 'select.open', selector: '.j-head', only: '.j-cap', frames: [0, 70, 140, 220], token: 'motion.cardTransition 220 ms', trigger: 'The setup document reports a new stage (choosing, awaiting-ready, running).', proposal: true },
  { cue: 'cue-role-deal', title: 'The role card is dealt, face down', state: 'reveal.concealed', selector: '.j-cardslot', only: '.j-rolecard', frames: [0, 140, 280, 420], token: 'motionMs.roleDeal 420 ms', trigger: 'This seat’s own setup preview first arrives for the current deal. Not after a reload or a recovery.', proposal: true },
  { cue: 'cue-role-card-turn', title: 'The card is turned up and the device added (private)', state: 'reveal.revealed', selector: '.j-main > .j-cardslot', only: '.j-rolecard, .j-rolecard__art', frames: [0, 225, 450, 675, 900], token: 'motionMs.roleCardTurn 900 ms', trigger: 'The player presses Reveal my role. Local; inside the private container only.' },
  { cue: 'cue-registration', title: 'Ready is stamped on the card back', state: 'reveal.ready-early', selector: '.j-cardslot', only: '.j-rolecard__stamp', frames: [0, 60, 120], token: 'motion.registrationStamp 120 ms', trigger: 'The server accepts this seat’s Ready (the answer to its own request).' },
  { cue: 'cue-registration', title: 'A command is registered: stamp in the private card', state: 'game.registered', selector: '.j-card', only: '.j-card__status', frames: [0, 60, 120], token: 'motion.registrationStamp 120 ms', trigger: 'The server’s receipt accepts this seat’s command. Never a public cue.' },
  { cue: 'cue-sheet-open', title: 'The private card opens', state: 'game.private-open', selector: null, only: '.j-sheet', frames: [0, 110, 220], token: 'motion.cardTransition 220 ms', trigger: 'The player presses Private card.', proposal: true },
  { cue: 'cue-public-move', title: 'A piece is carried to its new room', state: 'game.move-accepted', selector: '.j-board', only: '.j-piece', frames: [0, 225, 450, 780, 900], token: 'motionMs.pieceMove 900 ms', trigger: 'A public location change in the view (PUBLIC_MOVE); the same on every screen.' },
  { cue: 'cue-phase-change', title: 'A new phase: the words slide in', state: 'phase.jail-vote', selector: '.j-strip', only: '.j-strip__what', frames: [0, 110, 220], token: 'motion.cardTransition 220 ms', trigger: 'The view reports a new phase (PHASE_CHANGED).' },
  { cue: 'cue-round-transition', title: 'A new round: the ink band sweeps under the strip', state: 'phase.resolution', selector: '.j-strip', only: '.j-strip__box', frames: [0, 230, 470, 700], token: 'motion.roundTransition 700 ms', trigger: 'The view reports a new round.' },
  { cue: 'cue-request-arrives', title: 'Host: a request to join drops in', state: 'host.requests', selector: '.j-requests', only: '.j-request', frames: [0, 110, 220], token: 'motion.cardTransition 220 ms', trigger: 'A new pending admission appears in the host’s list.', proposal: true },
  { cue: 'cue-choice-taken', title: 'Selection: the character was just taken', state: 'select.conflict', selector: '.j-crew', only: '.j-crewtile', frames: [0, 70, 140, 220], token: 'motion.cardTransition 220 ms', trigger: 'The server refuses the choice (CHARACTER_TAKEN) and the identity document shows the holder.', proposal: true },
  { cue: 'cue-result-cover', title: 'The result arrives as a comic cover', state: 'end.winner', selector: '.j-result', only: '.j-result', frames: [0, 300, 600, 900], token: 'motion.comicBeatMaximum 900 ms', trigger: 'The view first carries a finished or aborted match.', proposal: true },
];

function problemsFor(state, measured, requests, pageProblems) {
  const problems = [];
  for (const line of measured.overflow) problems.push(`overflow: ${line}`);
  for (const line of measured.smallTargets) problems.push(`control under 44 CSS px: ${line}`);
  const isPrivate = PRIVATE_STATES.has(state.id);
  if (!isPrivate && !REVEAL_STATES.has(state.id) && state.id !== 'reveal.devices') {
    if (measured.roleWords.length) problems.push(`public state names a role: ${measured.roleWords.join(', ')}`);
    if (measured.privateContainers) problems.push('public state holds a private container');
  }
  if (measured.outsideHooks.length) problems.push(`role or team hook outside .j-private: ${measured.outsideHooks.join(', ')}`);
  if (measured.clippedCaptions.length) problems.push(`clipped title: ${measured.clippedCaptions.join(' | ')}`);
  const art = requests.filter(url => url.includes('/exports/'));
  const single = art.filter(url => !url.endsWith('.css'));
  if (single.length) problems.push(`a single picture was requested: ${single.join(', ')}`);
  const surface = state.surface === 'player' ? ['public-board', 'player-ui', 'roles'] : ['public-board'];
  for (const bundle of surface) if (!art.some(url => url.includes(`/exports/${bundle}/`))) problems.push(`bundle ${bundle} was not requested`);
  if (state.surface !== 'player' && art.some(url => url.includes('/exports/roles/') || url.includes('/exports/player-ui/'))) problems.push('a host, display or entry page requested a phone-only bundle');
  for (const line of pageProblems) problems.push(`page: ${line}`);
  return problems;
}

const server = await startStaticServer({ port: 0 });
const browserSizes = new Map();
const results = [];
const images = [];
let version = 'unknown';
async function withBrowser(fontPx, run) {
  if (!browserSizes.has(fontPx)) {
    const launched = await launchBrowser({ defaultFontPx: fontPx });
    version = launched.version;
    browserSizes.set(fontPx, { launched, browser: await connect(launched.endpoint) });
  }
  return run(browserSizes.get(fontPx).browser);
}

async function capture({ id, state, width, height, file, fontPx = null, names = null, motion = null, focus = null, type = null, full = false, matrix = false, hold = null, only = null, selector = null, frame = null }) {
  return withBrowser(fontPx, async browser => {
    const page = await openPage(browser, { width, height, scale: 1, mobile: width < 600 });
    const query = new URLSearchParams({ state: state.id, chrome: '0' });
    if (names) query.set('names', names);
    if (motion) query.set('motion', motion);
    if (hold !== null) query.set('t', String(hold));
    if (hold !== null && only) query.set('only', only);
    await page.goto(`${server.origin}/v1-phone/?${query}`, 'window.__designReady === true && document.readyState === "complete"');
    // Let entrance motion settle so the picture is the state, not a frame of its arrival.
    await page.evaluate(`new Promise(done => setTimeout(done, ${hold !== null ? 150 : 1100}))`);
    if (focus) {
      await page.evaluate(`(() => { const node = document.querySelector(${JSON.stringify(focus)}); node.focus(); ${type ? `node.value = ${JSON.stringify(type)};` : ''} node.scrollIntoView({ block: 'center' }); })()`);
      await page.evaluate('new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))');
    }
    const measured = await page.evaluate(MEASURE);
    const problems = problemsFor(STATES.find(entry => entry.id === state.id), measured, page.requests(), page.problems());
    if (focus && measured.focus && !measured.focus.inView) problems.push('the focused field is not in view with the keyboard up');
    if (focus && measured.primaryInView === false) {
      const inline = await page.evaluate(`(() => { const b = document.querySelector('.j-dock .j-btn--primary'); const r = b.getBoundingClientRect(); return getComputedStyle(document.querySelector('.j-dock')).position; })()`);
      if (inline !== 'static') problems.push('with the keyboard up the dock stays fixed over the content');
    }
    const shot = await page.screenshot(file, selector ? { selector, margin: 10 } : { viewport: !full, keepScroll: Boolean(focus) });
    await page.close();
    const relative = file.replace(`${repoRoot}/`, '');
    images.push({ id, state: state.id, file: relative, width: shot.width, height: shot.height, viewport: `${width}x${height}`, fontPx, names, motion, matrix, ...(frame ? { frame } : {}) });
    results.push({ id, state: state.id, viewport: `${width}x${height}`, fontPx, problems, measured: { height: measured.height, primaryInView: measured.primaryInView, focus: measured.focus } });
    return problems;
  });
}

try {
  const targets = only ? STATES.filter(state => only.includes(state.id)) : STATES;
  if (!only) await rm(reviewDir, { recursive: true, force: true });
  await mkdir(resolve(reviewDir, 'states'), { recursive: true });
  await mkdir(resolve(reviewDir, 'matrix'), { recursive: true });
  for (const state of targets) {
    const problems = await capture({ id: state.id, state, width: 390, height: 844, file: resolve(reviewDir, 'states', `${state.id}.png`) });
    console.log(`${problems.length ? 'FAIL' : 'ok  '}  ${state.id}${problems.length ? `\n        ${problems.join('\n        ')}` : ''}`);
  }
  if (!only) {
    for (const check of MATRIX) {
      const state = STATES.find(entry => entry.id === check.state);
      const problems = await capture({ ...check, state, file: resolve(reviewDir, 'matrix', `${check.id}.png`), matrix: true });
      console.log(`${problems.length ? 'FAIL' : 'ok  '}  matrix ${check.id}${problems.length ? `\n        ${problems.join('\n        ')}` : ''}`);
    }
    await mkdir(resolve(reviewDir, 'motion'), { recursive: true });
    for (const [index, board] of STORYBOARD.entries()) {
      const state = STATES.find(entry => entry.id === board.state);
      const row = `${String(index + 1).padStart(2, '0')}-${board.cue}`;
      for (const at of board.frames) {
        const problems = await capture({ id: `${row}-${at}`, state, width: 390, height: 844, file: resolve(reviewDir, 'motion', `${row}-${at}ms.png`), hold: at, only: board.only, selector: board.selector, frame: { row, cue: board.cue, at } });
        if (problems.length) console.log(`FAIL  motion ${row} @${at}ms\n        ${problems.join('\n        ')}`);
      }
      const problems = await capture({ id: `${row}-reduced`, state, width: 390, height: 844, file: resolve(reviewDir, 'motion', `${row}-reduced.png`), motion: 'reduced', selector: board.selector, frame: { row, cue: board.cue, at: 'reduced' } });
      console.log(`${problems.length ? 'FAIL' : 'ok  '}  motion ${row} (${board.frames.length} frames + reduced)`);
    }
    const inputsSha256 = await v1PhoneInputsSha256(repoRoot);
    const browserVersion = version;
    const index = { devOnly: 'mothership:dev-only', tool: 'design/tools/v1-phone-capture.mjs', inputsSha256, browser: browserVersion, note: 'Desktop Chromium laying out the prototype with this machine’s fonts. Not a device measurement.', matrix: MATRIX.map(({ id, about }) => ({ id, about })), storyboard: STORYBOARD.map((board, index) => ({ row: `${String(index + 1).padStart(2, '0')}-${board.cue}`, ...board })), images };
    await writeFile(resolve(reviewDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
    // Contact sheets are pictures of contact.html, which lays out the captures listed in index.json.
    for (const [name, query] of [['contact-priority', 'set=priority'], ['contact-all', 'set=all'], ['contact-matrix', 'set=matrix'], ['contact-motion', 'set=motion']]) {
      await withBrowser(null, async browser => {
        const page = await openPage(browser, { width: 1600, height: 1000, scale: 1 });
        await page.goto(`${server.origin}/v1-phone/contact.html?${query}`, 'window.__designReady === true');
        await page.evaluate('Promise.all([...document.images].map(img => img.complete ? null : new Promise(done => { img.onload = img.onerror = done; })))');
        const shot = await page.screenshot(resolve(reviewDir, `${name}.png`));
        await page.close();
        images.push({ id: name, state: null, file: `design/v1-phone/review/${name}.png`, width: shot.width, height: shot.height, viewport: '1600', contact: true });
      });
    }
    index.images = images;
    await writeFile(resolve(reviewDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
    const failures = results.filter(result => result.problems.length).map(result => ({ id: result.id, problems: result.problems }));
    await writeFile(resolve(reviewDir, 'report.json'), `${JSON.stringify({ devOnly: 'mothership:dev-only', tool: 'design/tools/v1-phone-capture.mjs', inputsSha256, browser: browserVersion, captures: results.length, failures, results }, null, 2)}\n`);
    console.log(`\nV1 phone capture: ${results.length} captures, ${failures.length} with problems; browser ${browserVersion}`);
    if (failures.length) process.exitCode = 1;
  }
} finally {
  for (const { launched, browser } of browserSizes.values()) { browser.close(); await launched.close(); }
  await server.close();
}
