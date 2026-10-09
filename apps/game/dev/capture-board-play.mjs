// mothership:dev-only
//
// Evidence capture for the board as the place the game is played (issue #87), in a local
// headless browser against the board simulation (dev/board/: the release's own screen,
// controller, host, styles and art over synthetic, schema-checked views and a scripted
// command desk). Every action is played through real touch and key input; each step is
// measured and photographed. This is browser simulation: it proves nothing about real
// devices, the backend or multiplayer behavior. The emulator flow is a separate capture.
//
// With `npx vite --config apps/game/dev/board/vite.config.mjs` running (port 5178):
//   CHROME_PATH=/path/to/chrome node apps/game/dev/capture-board-play.mjs <output-directory> [--all-sizes]
// A browser run as root also needs --no-sandbox: point CHROME_PATH at a wrapper that adds it.

import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { connect, launchBrowser, openPage, sleep } from './capture/browser.mjs';
import { MEASURE, problemsOf } from './capture/board-measure.mjs';

// A statement, not only a comment: it survives bundling and comment stripping, so the
// production-exclusion check finds this module wherever it ends up.
globalThis[Symbol.for('mothership:dev-only')] = true;

const BASE = 'http://127.0.0.1:5178/';
const SIZES = [[320, 568], [360, 740], [390, 844], [430, 932]];
const output = resolve(process.argv[2] ?? 'board-play-evidence');
const allSizes = process.argv.includes('--all-sizes');
await mkdir(output, { recursive: true });
const facts = [];
const lines = [];
const note = (...parts) => { const line = `${new Date().toISOString().slice(11, 19)} ${parts.join(' ')}`.trimEnd(); lines.push(line); console.log(line); };

const browserProcess = await launchBrowser();
const browser = await connect(browserProcess.endpoint);

async function open(scenario, [width, height], query = '') {
  const page = await openPage(browser, { width, height, scale: 1, mobile: !query.includes('as=display'), ownContext: true });
  // The display's board has no stations: only a player's own board is laid out by them.
  const ready = query.includes('as=display') ? "document.querySelector('.ms-shell[data-screen=\"match\"] .ms-board .ms-seat')" : "document.querySelector('.ms-board .ms-seat[data-station]')";
  await page.goto(`${BASE}?scenario=${scenario}${query}`, ready, 20_000);
  await page.foreground();
  await sleep(500);
  return page;
}
async function step(page, name, scenario, size, { shot = true, settle = 350 } = {}) {
  await sleep(settle);
  const measured = await page.evaluate(MEASURE);
  facts.push({ name, scenario, size, ...measured });
  if (shot) await page.screenshot(join(output, `${name}.png`), { viewport: true });
  const problems = problemsOf(measured, { phone: !scenario.startsWith('display') && size[0] < 600 });
  note(name, `${size.join('x')}`, problems.length ? `PROBLEMS: ${problems.join('; ')}` : 'clean', measured.strip ? `| ${measured.strip.slice(0, 90)}` : '');
  return measured;
}
const tapSeat = (page, n) => page.tap(`.phone-character-target[data-value="seat-${n}"]`);
const tapAnswer = (page, value) => page.tap(`.phone-strip .ms-target[data-value="${value}"]`);
async function openAction(page, kind) {
  await page.tap('#ms-phone-actions');
  await page.waitFor(`document.querySelector('#ms-action-open-${kind}')`, `tray offers ${kind}`, 5000);
  await page.tap(`#ms-action-open-${kind}`);
  await page.waitFor("document.querySelector('.phone-strip > .ms-card__state[data-step=\"choosing\"]')", 'choosing', 5000);
}
async function confirm(page) {
  await sleep(450); // the controller's double-tap guard
  await page.tap('#ms-action-confirm');
}

// Each journey: a scenario, how far to play it, and what to photograph on the way.
const JOURNEYS = [
  ['spread', async (page, size, tag) => {
    await step(page, `${tag}-board`, 'spread', size);
    await page.tap('#ms-phone-actions');
    await step(page, `${tag}-tray`, 'spread', size);
    await page.tap('#ms-phone-board');
    await page.tap('#phone-move-room-b');
    await step(page, `${tag}-move-confirm`, 'spread', size);
    await confirm(page);
    await step(page, `${tag}-move-pending`, 'spread', size, { settle: 120 });
    await step(page, `${tag}-move-flight`, 'spread', size, { settle: 300 });
    await step(page, `${tag}-move-landed`, 'spread', size, { settle: 1400 });
    await page.tap('#ms-action-dismiss');
    await sleep(500);
    await page.tap('#ms-phone-pass');
    await step(page, `${tag}-pass-receipt`, 'spread', size, { settle: 900 });
  }],
  ['tray', async (page, size, tag) => { await page.tap('#ms-phone-actions'); await step(page, `${tag}-tray-many`, 'tray', size); }],
  ['tray-empty', async (page, size, tag) => { await page.tap('#ms-phone-actions'); await step(page, `${tag}-tray-empty`, 'tray-empty', size); }],
  ['shot', async (page, size, tag) => {
    await openAction(page, 'shot');
    await step(page, `${tag}-shot-choose`, 'shot', size);
    await tapSeat(page, 5);
    await step(page, `${tag}-shot-confirm`, 'shot', size);
    await confirm(page);
    await step(page, `${tag}-shot-pending`, 'shot', size, { settle: 150 });
    await step(page, `${tag}-shot-registered`, 'shot', size, { settle: 700 });
  }],
  ['disable', async (page, size, tag) => { await openAction(page, 'disable'); await step(page, `${tag}-disable-choose`, 'disable', size); await tapSeat(page, 8); await step(page, `${tag}-disable-confirm`, 'disable', size); }],
  ['protect', async (page, size, tag) => { await openAction(page, 'protect'); await step(page, `${tag}-protect-choose`, 'protect', size); await tapSeat(page, 3); await step(page, `${tag}-protect-confirm-self`, 'protect', size); }],
  ['rescue', async (page, size, tag) => { await openAction(page, 'rescue'); await step(page, `${tag}-rescue-choose`, 'rescue', size); await tapSeat(page, 6); await step(page, `${tag}-rescue-confirm`, 'rescue', size); }],
  ['hack', async (page, size, tag) => { await openAction(page, 'hack'); await step(page, `${tag}-hack-choose`, 'hack', size); await tapSeat(page, 1); await step(page, `${tag}-hack-confirm`, 'hack', size); }],
  ['scan', async (page, size, tag) => {
    await openAction(page, 'scan');
    await step(page, `${tag}-scan-choose`, 'scan', size);
    await tapSeat(page, 8);
    await step(page, `${tag}-scan-faction`, 'scan', size);
    await tapAnswer(page, 'Red');
    await step(page, `${tag}-scan-confirm`, 'scan', size);
  }],
  ['supply', async (page, size, tag) => {
    await openAction(page, 'supply');
    await step(page, `${tag}-supply-first`, 'supply', size);
    await tapSeat(page, 1);
    await step(page, `${tag}-supply-second`, 'supply', size);
    await tapSeat(page, 8);
    await step(page, `${tag}-supply-confirm`, 'supply', size);
    await confirm(page);
    await step(page, `${tag}-supply-registered`, 'supply', size, { settle: 900 });
  }],
  ['code', async (page, size, tag) => {
    await openAction(page, 'code');
    for (const [index, n] of [6, 2, 9, 7].entries()) {
      if (index === 2) await step(page, `${tag}-code-two`, 'code', size);
      await tapSeat(page, n);
    }
    await step(page, `${tag}-code-confirm`, 'code', size);
    await page.tap('#ms-action-back');
    await step(page, `${tag}-code-choose-again`, 'code', size);
  }],
  ['showdown', async (page, size, tag) => { await openAction(page, 'showdown-shot'); await step(page, `${tag}-showdown-choose`, 'showdown', size); await tapSeat(page, 2); await step(page, `${tag}-showdown-confirm`, 'showdown', size); }],
  ['election', async (page, size, tag) => {
    await openAction(page, 'vote');
    await step(page, `${tag}-election-choose`, 'election', size);
    await tapAnswer(page, 'none');
    await step(page, `${tag}-election-abstain`, 'election', size);
    await page.tap('#ms-action-back');
    await page.waitFor("document.querySelector('.phone-strip > .ms-card__state[data-step=\"choosing\"]')", 'choosing again', 5000);
    await tapSeat(page, 7);
    await confirm(page);
    await step(page, `${tag}-election-recorded`, 'election', size, { settle: 900 });
  }],
  ['jail', async (page, size, tag) => { await openAction(page, 'vote'); await step(page, `${tag}-jail-choose`, 'jail', size); await tapSeat(page, 4); await step(page, `${tag}-jail-confirm`, 'jail', size); }],
  ['release-choice', async (page, size, tag) => { await openAction(page, 'release-choice'); await step(page, `${tag}-release-choice`, 'release-choice', size); await tapSeat(page, 9); await step(page, `${tag}-release-choice-confirm`, 'release-choice', size); }],
  ['release-vote', async (page, size, tag) => { await openAction(page, 'release-vote'); await step(page, `${tag}-release-vote`, 'release-vote', size); await tapAnswer(page, 'yes'); await step(page, `${tag}-release-vote-confirm`, 'release-vote', size); }],
  ['crowd-shot', async (page, size, tag) => { await openAction(page, 'shot'); await step(page, `${tag}-crowd-shot`, 'crowd-shot', size); }],
  ['crowd-protect', async (page, size, tag) => { await openAction(page, 'protect'); await step(page, `${tag}-crowd-protect`, 'crowd-protect', size); }],
  ['crowd-vote', async (page, size, tag) => { await openAction(page, 'vote'); await step(page, `${tag}-crowd-vote`, 'crowd-vote', size); }],
  ['crowd-command', async (page, size, tag) => { await openAction(page, 'vote'); await step(page, `${tag}-crowd-command`, 'crowd-command', size); }],
  ['crowd-jail', async (page, size, tag) => { await openAction(page, 'code'); await step(page, `${tag}-crowd-jail`, 'crowd-jail', size); }],
  ['crowd-hospital', async (page, size, tag) => { await openAction(page, 'rescue'); await step(page, `${tag}-crowd-hospital`, 'crowd-hospital', size); }],
  ['crowd-room-b-supply', async (page, size, tag) => { await openAction(page, 'supply'); await tapSeat(page, 2); await step(page, `${tag}-crowd-room-b-supply`, 'crowd-room-b-supply', size); }],
  ['crowd-hospital-6', async (page, size, tag) => { await step(page, `${tag}-crowd-hospital-6`, 'crowd-hospital-6', size); }],
  ['long-names', async (page, size, tag) => { await step(page, `${tag}-long-names`, 'long-names', size); }],
  ['seven', async (page, size, tag) => { await step(page, `${tag}-seven`, 'seven', size); }],
  ['other-turn', async (page, size, tag) => { await step(page, `${tag}-other-turn`, 'other-turn', size); }],
  ['legacy', async (page, size, tag) => { await step(page, `${tag}-legacy`, 'legacy', size); }],
  ['shot', async (page, size, tag) => {
    // The page loses focus mid-choice: the choice is dropped and every private mark with it.
    await openAction(page, 'shot');
    await tapSeat(page, 5);
    await page.evaluate("window.dispatchEvent(new Event('blur'))");
    await step(page, `${tag}-background-drops-choice`, 'shot', size);
  }],
  ['shot', async (page, size, tag) => {
    // A snapshot the server has not confirmed: actions pause and the marks go.
    await openAction(page, 'shot');
    await page.evaluate('window.__simulation.stale()');
    await step(page, `${tag}-stale-pauses`, 'shot', size);
  }],
  ['spread', async (page, size, tag) => {
    await page.tap('#ms-private-toggle');
    await step(page, `${tag}-card`, 'spread', size, { settle: 600 });
    await page.tap('#ms-phone-more');
    await step(page, `${tag}-menu`, 'spread', size);
  }],
];

const sizes = allSizes ? SIZES : [[320, 568], [390, 844]];
for (const size of sizes) {
  for (const [scenario, journey] of JOURNEYS) {
    const page = await open(scenario, size);
    try { await journey(page, size, `${size[0]}x${size[1]}`); }
    catch (error) { note(scenario, size.join('x'), `FAILED: ${error.message}`); facts.push({ scenario, size, failed: error.message }); }
    finally { await page.close(); }
  }
}

// Keyboard: reach a character from the strip with Tab, pick with Enter, step back with Escape.
{
  const size = [390, 844];
  const page = await open('shot', size);
  await page.press('Tab');
  await page.tap('#ms-phone-actions');
  await page.waitFor("document.querySelector('#ms-action-open-shot')", 'tray', 5000);
  await page.evaluate("document.querySelector('#ms-action-open-shot').focus()");
  await page.press('Enter');
  await page.waitFor("document.activeElement?.id === 'ms-action-step'", 'focus on the strip line', 5000);
  const presses = await page.tabTo('ms-action-choice-seat-1', 30);
  await step(page, 'keyboard-focus-target', 'shot', size);
  await page.press('Enter');
  await page.waitFor("document.querySelector('.phone-strip > .ms-card__state[data-step=\"confirming\"]')", 'confirming by Enter', 5000);
  const afterEnter = await page.evaluate('document.activeElement?.id');
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await page.waitFor("document.querySelector('.phone-strip > .ms-card__state[data-step=\"choosing\"]')", 'back by Escape', 5000);
  const keyboard = { tabPressesToFirstTarget: presses, focusAfterEnter: afterEnter, stepAfterEscape: await page.evaluate("document.querySelector('.phone-strip > .ms-card__state')?.dataset.step") };
  facts.push({ name: 'keyboard', scenario: 'shot', size, keyboard });
  note('keyboard', JSON.stringify(keyboard));
  await page.close();
}

// Reduced motion: the same move, no flight, no trail; the character is drawn where the view has it.
{
  const size = [390, 844];
  const page = await open('spread', size, '&motion=reduced');
  await page.tap('#phone-move-room-b');
  await confirm(page);
  const reduced = await step(page, 'reduced-motion-move', 'spread', size, { settle: 700 });
  facts.push({ name: 'reduced-motion', fxNodesDuringMove: reduced.fxNodes, moving: reduced.moving });
  await page.close();
}

// The shared display while a phone acts: public facts only, and the public move flies there too.
// The display is a shared screen, not a phone; it is shown at a common display size.
{
  const size = [1280, 720];
  const page = await open('shot', size, '&as=display');
  await step(page, 'display-public', 'shot', size);
  await page.evaluate("window.__simulation.move('Room B')");
  await step(page, 'display-move-flight', 'shot', size, { settle: 250 });
  await page.close();
}

await writeFile(join(output, 'facts.json'), `${JSON.stringify(facts, null, 2)}\n`);
await writeFile(join(output, 'capture-log.txt'), `${lines.join('\n')}\n`);
await browser.close();
await browserProcess.close();
note('done', output);
