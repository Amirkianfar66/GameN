// mothership:dev-only
//
// Captures and measures the phone kit (design/phone-kit/, issue #121) on the board-motion prototype:
//   node design/tools/phone-kit-capture.mjs                  everything, then the contact sheets
//   node design/tools/phone-kit-capture.mjs --only=d320-declare,b390-captain   a quick look; no report
//   npm run capture:phone-kit --workspace @mothership/design-tokens
//
// Needs a Chromium-based browser (CHROME_PATH overrides the search). Node built-ins only.
// Writes design/phone-kit/review/<group>/<name>.png, contact-<group>.png and report.json:
//   shell/    A: the navy and gold shell, before (?kit=0) and after, targeting, confirmation, long names,
//             crowded rooms, simulated safe areas, 150% and 200% text, at 320 x 568 and 390 x 844
//   result/   B: every vote outcome at both sizes, a late (reconnect) join, long names, 200% text, the
//             five seconds as storyboard frames, reduced motion, and the phone beside the other screens
//   clothes/  C: five in the Hospital, five in the Jail, the released player waiting in the Jail, and the
//             wardrobe sheets (nine characters, front and back, every Hospital and Jail place)
//   hack/     D: every declaration, claim and conversation state at 320 x 568, the key ones at 390 x 844,
//             a move open beside it (compact), 200% text, the claim's storyboard, reduced motion, and the
//             participant's phone beside the other screens
// What it measures on every phone: the page does not scroll; the board fits its row at the default text
// size (at enlarged text it may scroll inside itself, never clip); the bars are whole; every control is
// at least 44 x 44; the kit's panels sit between the bars, overlap nothing and clip nothing; the three
// side buttons are alike; the other screens hold no private panel; and every phone requests the same
// files whatever its state (nothing is loaded for a claim, a side or a role). These are statements about
// desktop Chromium laying out the prototype, not measurements of a phone.

import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { phoneKitInputsSha256 } from './lib/phone-kit-inputs.mjs';

export const BASE = 'abb6839524b6dc3e5225e600f2f067c3fa3f9501';
const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const reviewDir = resolve(repoRoot, 'design/phone-kit/review');
const only = process.argv.find(arg => arg.startsWith('--only='))?.slice(7).split(',').filter(Boolean) ?? null;
const sha = content => createHash('sha256').update(content).digest('hex');

const SHOTS = [];
const add = (group, name, label, scenario, options = {}) => SHOTS.push({ group, name, label, scenario, w: 320, h: 568, font: null, extra: '', action: null, pair: false, reduced: false, ...options });
const at390 = { w: 390, h: 844 };
const tapRoomB = `document.querySelector('[data-move-room="Room B"]').click()`;

// ---------- A: the shell ----------
for (const [w, h] of [[320, 568], [390, 844]]) {
  const s = `${w}`;
  add('shell', `a${s}-idle`, `${w} x ${h}: the board, nine players, your turn`, 'board.idle', { w, h });
  add('shell', `a${s}-idle-before`, `${w} x ${h}: the same, before the kit (?kit=0)`, 'board.idle', { w, h, extra: '&kit=0' });
  add('shell', `a${s}-target`, `${w} x ${h}: a Shot, targets on the characters`, 'shot.choose', { w, h });
  add('shell', `a${s}-confirm`, `${w} x ${h}: a Shot, the confirmation on the board`, 'shot.confirm', { w, h });
  add('shell', `a${s}-confirm-before`, `${w} x ${h}: the same, before the kit`, 'shot.confirm', { w, h, extra: '&kit=0' });
  add('shell', `a${s}-vote`, `${w} x ${h}: a Captain election, candidates on the board`, 'vote.election', { w, h });
  add('shell', `a${s}-long`, `${w} x ${h}: twelve-character names`, 'board.long-names', { w, h });
  add('shell', `a${s}-move`, `${w} x ${h}: a move by its room tag, confirmed on the board`, 'board.idle', { w, h, action: tapRoomB });
}
add('shell', 'a320-crowded', '320 x 568: seven in Room A (layout stress)', 'board.crowded');
add('shell', 'a320-other-turn', '320 x 568: someone else\'s turn, Pass unavailable', 'board.other-turn');
add('shell', 'a320-tray', '320 x 568: the Actions tray', 'tray.open');
add('shell', 'a390-safe', '390 x 844: simulated safe areas (47 px top, 34 px bottom)', 'board.idle', { ...at390, extra: '&safe=1' });
add('shell', 'a320-safe', '320 x 568: simulated safe areas, a Shot confirmed', 'shot.confirm', { extra: '&safe=1' });
add('shell', 'a390-text150', '390 x 844 at 150% text: a Shot', 'shot.choose', { ...at390, font: 24 });
add('shell', 'a390-text200', '390 x 844 at 200% text: the confirmation', 'shot.confirm', { ...at390, font: 32 });
add('shell', 'a320-text200', '320 x 568 at 200% text: the board', 'board.idle', { font: 32 });

// ---------- B: the vote result ----------
const OUTCOMES = ['captain', 'runoff', 'no-captain', 'jailed', 'no-jail-tie', 'no-jail', 'released', 'denied'];
for (const outcome of OUTCOMES) {
  add('result', `b320-${outcome}`, `320 x 568: result.${outcome}`, `result.${outcome}`);
  add('result', `b390-${outcome}`, `390 x 844: result.${outcome}`, `result.${outcome}`, at390);
}
add('result', 'b320-late', '320 x 568: joined at 3.2 s (a reconnect): settled, exit only', 'result.late');
add('result', 'b320-long-names', '320 x 568: a three-way tie, long names', 'result.long-names');
add('result', 'b390-text200', '390 x 844 at 200% text: Captain elected', 'result.captain', { ...at390, font: 32 });
add('result', 'b320-text200', '320 x 568 at 200% text: a release denied', 'result.denied', { font: 32 });
for (const t of [0, 160, 320, 500, 760, 1000, 1260, 4860]) add('result', `b390-story-captain-${String(t).padStart(4, '0')}`, `Captain elected at ${t} ms`, 'result.captain', { ...at390, extra: `&play=result&t=${t}` });
for (const t of [0, 360, 620, 1260]) add('result', `b390-story-jailed-${String(t).padStart(4, '0')}`, `Jailed at ${t} ms`, 'result.jailed', { ...at390, extra: `&play=result&t=${t}` });
for (const t of [40, 2500, 4960]) add('result', `b390-reduced-${String(t).padStart(4, '0')}`, `Reduced motion at ${t} ms: an 80 ms fade only`, 'result.captain', { ...at390, extra: `&motion=reduced&play=result&t=${t}`, reduced: true });
add('result', 'b-pair-captain', 'This phone and every other screen: the same public result', 'result.captain', { w: 1440, h: 920, pair: true });

// ---------- C: the room clothes ----------
for (const [w, h] of [[320, 568], [390, 844]]) {
  add('clothes', `c${w}-hospital-five`, `${w} x ${h}: five in the Hospital in gowns`, 'clothes.hospital-five', { w, h });
  add('clothes', `c${w}-jail-five`, `${w} x ${h}: five in the Jail in stripes`, 'clothes.jail-five', { w, h });
  add('clothes', `c${w}-waiting`, `${w} x ${h}: released, Injured, waiting in the Jail: stripes, no Jailed badge`, 'clothes.waiting', { w, h });
}
for (const page of ['lineup', 'hospital', 'jail']) add('clothes', `c-sheet-${page}`, `Wardrobe sheet: ${page}`, null, { w: 1500, h: 900, page: `phone-kit/wardrobe.html?page=${page}` });

// ---------- D: the private Hack ----------
const HACK = ['declare', 'declare-undercover', 'declare-confirm', 'declare-sending', 'declare-not-accepted', 'declare-unknown', 'declare-accepted', 'declare-five', 'declare-long-names',
  'waiting', 'claim-blue', 'claim-red', 'claim-alien', 'claim-none', 'claim-late', 'own-claim', 'own-none', 'talk', 'talk-target', 'talk-none', 'public'];
for (const state of HACK) add('hack', `d320-${state}`, `320 x 568: hack.${state}`, `hack.${state}`);
for (const state of ['declare', 'declare-confirm', 'declare-sending', 'declare-not-accepted', 'waiting', 'claim-red', 'claim-none', 'own-claim', 'own-none', 'talk', 'talk-target', 'public']) add('hack', `d390-${state}`, `390 x 844: hack.${state}`, `hack.${state}`, at390);
add('hack', 'd320-declare-move', '320 x 568: a move open in the prelude: the panel keeps one line', 'hack.declare', { action: tapRoomB });
add('hack', 'd320-claim-move', '320 x 568: a move open during the claim', 'hack.claim-red', { action: tapRoomB });
add('hack', 'd390-declare-move', '390 x 844: a move open in the prelude', 'hack.declare', { ...at390, action: tapRoomB });
add('hack', 'd390-text200-declare', '390 x 844 at 200% text: declare', 'hack.declare', { ...at390, font: 32 });
add('hack', 'd320-text200-declare', '320 x 568 at 200% text: declare', 'hack.declare', { font: 32 });
add('hack', 'd390-text200-claim', '390 x 844 at 200% text: the claim', 'hack.claim-red', { ...at390, font: 32 });
for (const t of [0, 160, 300, 520, 800, 4860]) add('hack', `d390-story-claim-${String(t).padStart(4, '0')}`, `The claim at ${t} ms`, 'hack.claim-red', { ...at390, extra: `&play=claim&t=${t}` });
for (const t of [40, 2500]) add('hack', `d390-reduced-${String(t).padStart(4, '0')}`, `Reduced motion at ${t} ms`, 'hack.claim-red', { ...at390, extra: `&motion=reduced&play=claim&t=${t}`, reduced: true });
add('hack', 'd-pair-claim', 'The initiator\'s phone and every other screen: the claim is on one phone only', 'hack.claim-red', { w: 1440, h: 920, pair: true });
add('hack', 'd-pair-declare', 'The target\'s phone and every other screen', 'hack.declare', { w: 1440, h: 920, pair: true });

export const MEASURE = `(() => {
  const vw = innerWidth, vh = innerHeight, doc = document.documentElement;
  const app = document.getElementById('bm-app');
  const problems = [], notes = [];
  const largeText = parseFloat(getComputedStyle(doc).fontSize) >= 20;
  const pair = Boolean(app.closest('.bm-frame'));
  if (!pair && doc.scrollWidth > vw + 1) problems.push('the page scrolls sideways: ' + doc.scrollWidth + ' > ' + vw);
  if (!pair && doc.scrollHeight > vh + 1) problems.push('the page scrolls: ' + doc.scrollHeight + ' > ' + vh);
  const box = app.getBoundingClientRect();
  const visible = n => { const r = n.getBoundingClientRect(); const s = getComputedStyle(n); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !n.closest('[hidden], [aria-hidden="true"]'); };
  const board = app.querySelector('.bm-board');
  const overflow = board.scrollHeight - board.clientHeight;
  if (overflow > 1 && !largeText) problems.push('the board does not fit its row: ' + overflow + ' px more');
  if (overflow > 1 && largeText && getComputedStyle(board).overflowY !== 'auto') problems.push('at enlarged text the board is clipped instead of scrolling inside itself');
  const status = app.querySelector('.bm-status').getBoundingClientRect(), nav = app.querySelector('.bm-nav').getBoundingClientRect();
  if (status.top < box.top - 0.5 || nav.bottom > box.bottom + 0.5) problems.push('a bar is not whole on screen');
  for (const n of app.querySelectorAll('button, [role="button"], a[href], input, select, .bm-piece__target')) {
    if (!visible(n)) continue;
    const r = n.getBoundingClientRect();
    if (r.width < 43.5 || r.height < 43.5) problems.push('a control is ' + Math.round(r.width) + ' x ' + Math.round(r.height) + ': ' + (n.id || n.dataset.act || n.dataset.view || n.className));
  }
  // Where a part is laid out in the phone, without the transforms of a motion in progress (a storyboard frame).
  const laid = n => { let top = 0; for (let el = n; el && el !== app; el = el.offsetParent) top += el.offsetTop; return { top, bottom: top + n.offsetHeight }; };
  const statusBox = laid(app.querySelector('.bm-status')), navBox = laid(app.querySelector('.bm-nav'));
  const panels = {};
  for (const [key, selector] of [['hack', '#pk-hack'], ['result', '#pk-vote-result'], ['strip', '#bm-strip']]) {
    const n = app.querySelector(selector);
    if (!n || n.closest('[hidden]') || !n.offsetHeight) continue;
    const r = laid(n);
    panels[key] = { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(n.offsetHeight) };
    if (r.top < statusBox.bottom - 0.5 || r.bottom > navBox.top + 0.5) problems.push(key + ' panel is not between the bars');
    const s = getComputedStyle(n);
    if (['hidden', 'clip'].includes(s.overflowY) && n.scrollHeight > n.clientHeight + 1) problems.push(key + ' panel clips its content: ' + n.scrollHeight + ' > ' + n.clientHeight);
    for (const inner of n.querySelectorAll('*')) {
      if (!visible(inner) || inner.matches('.pk-vh, .bm-vh, .pk-vr__said')) continue;
      const t = getComputedStyle(inner);
      if (['hidden', 'clip'].includes(t.overflowX) && inner.scrollWidth > inner.clientWidth + 1) (t.textOverflow === 'ellipsis' ? notes : problems).push((t.textOverflow === 'ellipsis' ? 'shortened: ' : 'clipped: ') + inner.className + ' “' + inner.textContent.trim().slice(0, 24) + '”');
    }
  }
  if (panels.hack && panels.strip && panels.hack.bottom > panels.strip.top + 0.5) problems.push('the Hack panel overlaps the strip');
  // No panel scrolls inside itself at the normal text size; at enlarged text one may, and that is noted.
  for (const n of app.querySelectorAll('.bm-tray, .bm-sheet, .bm-result, #pk-hack, #pk-vote-result')) {
    if (!visible(n) || n.scrollHeight <= n.clientHeight + 1) continue;
    (largeText ? notes : problems).push((n.id || n.className) + ' scrolls inside itself: ' + n.scrollHeight + ' > ' + n.clientHeight);
  }
  const sides = [...app.querySelectorAll('.pk-hack__side')].filter(visible).map(n => n.getBoundingClientRect());
  if (sides.length && (sides.length !== 3 || new Set(sides.map(r => Math.round(r.width) + 'x' + Math.round(r.height))).size !== 1)) problems.push('the side buttons are not three alike');
  const observer = document.querySelector('[data-observer]');
  if (pair && (!observer || getComputedStyle(observer.closest('.bm-observer') ?? observer).display === 'none')) problems.push('the other screens are not shown beside the phone');
  if (observer && observer.querySelector('.pk-hack, [data-private], [data-art^="hack-"], .bm-private')) problems.push('the other screens hold something private');
  if (observer && app.querySelector('#pk-vote-result') && !observer.querySelector('.pk-vr')) problems.push('the other screens do not show the public result');
  if (window.__bmState?.scenario === 'hack.public' && app.querySelector('.pk-hack')) problems.push('a phone outside the Hack draws its panel');
  const ellipsed = [...app.querySelectorAll('.bm-piece__name')].filter(n => n.scrollWidth > n.clientWidth + 1).length;
  if (ellipsed) notes.push(ellipsed + ' name plate(s) shortened on the board');
  return { problems, notes, largeText, boardOverflow: overflow, panels, board: Math.round(board.getBoundingClientRect().height) };
})()`;

const server = await startStaticServer({ port: 0 });
const results = [];
let browserName = '';
const groups = [...new Set(SHOTS.map(shot => shot.font ?? 16))];
for (const font of groups) {
  const launched = await launchBrowser(font !== 16 ? { defaultFontPx: font } : {});
  const browser = await connect(launched.endpoint);
  browserName ||= (await browser.send('Browser.getVersion')).product;
  for (const shot of SHOTS.filter(item => (item.font ?? 16) === font && (!only || only.includes(item.name)))) {
    const page = await openPage(browser, { width: shot.w, height: shot.h, scale: 1, mobile: !shot.page && !shot.pair });
    if (shot.reduced) await page.media({ 'prefers-reduced-motion': 'reduce' });
    const url = shot.page ? `${server.origin}/${shot.page}`
      : shot.pair ? `${server.origin}/board-motion/index.html?panel=0&w=390&h=844&scenario=${shot.scenario}&freeze=1${shot.extra}`
        : `${server.origin}/board-motion/index.html?chrome=0&scenario=${shot.scenario}&freeze=1${shot.extra}`;
    await page.goto(url, 'document.readyState === "complete" && window.__designReady === true');
    await page.evaluate('new Promise(done => setTimeout(done, 400))');
    if (shot.action) { await page.evaluate(shot.action); await page.evaluate('new Promise(done => setTimeout(done, 500))'); }
    const measured = shot.page ? { problems: [], notes: [] } : await page.evaluate(MEASURE);
    const file = `design/phone-kit/review/${shot.group}/${shot.name}.png`;
    // A pair: the phone beside the other screens' frame, cropped to the two (the page hides the other screens below 900 px).
    await page.screenshot(resolve(repoRoot, file), shot.pair ? { selector: '.bm-proto' } : { viewport: !shot.page });
    const png = await readFile(resolve(repoRoot, file));
    const requests = page.requests().map(address => new URL(address).pathname).filter(path => !/favicon/.test(path)).sort();
    const problems = [...measured.problems, ...page.problems()];
    results.push({ group: shot.group, name: shot.name, label: shot.label, file, size: `${shot.w}x${shot.h}`, scenario: shot.scenario, font: shot.font, reduced: shot.reduced, pair: shot.pair,
      measures: { board: measured.board, boardOverflow: measured.boardOverflow, panels: measured.panels, largeText: measured.largeText }, notes: measured.notes, problems, requests, sha256: sha(png) });
    console.log(`${problems.length ? 'FAIL' : 'ok  '}  ${shot.name}${problems.length ? ` — ${problems.join('; ')}` : ''}`);
    await page.close();
  }
  browser.close();
  await launched.close();
}

if (!only) {
  // Every phone of the prototype requests the same files, whatever its state: nothing for a claim, a side, a role or a vote.
  const phones = results.filter(result => !result.file.includes('/c-sheet-') && !result.pair);
  const sets = new Map(phones.map(result => [result.name, JSON.stringify(result.requests.filter(path => !path.endsWith('index.html')))]));
  const reference = sets.get('a390-idle');
  const uniform = [...sets.entries()].filter(([, set]) => set !== reference).map(([name]) => name);
  // The page without the kit (?kit=0) does not request the kit's stylesheet; that is the only difference allowed.
  const allowed = new Set(results.filter(result => result.name.endsWith('-before')).map(result => result.name));
  for (const name of uniform.filter(name => !allowed.has(name))) results.find(result => result.name === name).problems.push('requested other files than every other phone');
  const report = {
    devOnly: 'mothership:dev-only', tool: 'design/tools/phone-kit-capture.mjs', base: BASE, inputsSha256: await phoneKitInputsSha256(repoRoot), browser: browserName, scale: 1,
    note: 'Desktop Chromium laying out the prototype at simulated phone viewports: not device measurements, and nothing here shows that a match works across phones.',
    shots: results,
  };
  await writeFile(resolve(reviewDir, 'report.json'), `${JSON.stringify(report, null, 1)}\n`);
  // The contact sheets, from the pictures just taken.
  const launched = await launchBrowser({});
  const browser = await connect(launched.endpoint);
  for (const group of ['shell', 'result', 'clothes', 'hack']) {
    const page = await openPage(browser, { width: 1600, height: 900, scale: 1 });
    await page.goto(`${server.origin}/phone-kit/contact.html?group=${group}`, 'document.readyState === "complete" && window.__designReady === true');
    await page.screenshot(resolve(reviewDir, `contact-${group}.png`));
    await page.close();
  }
  browser.close();
  await launched.close();
  const failed = results.filter(result => result.problems.length);
  console.log(`Phone-kit captures: ${results.length} pictures, ${failed.length} with problems.`);
  if (failed.length) process.exitCode = 1;
}
await server.close();
