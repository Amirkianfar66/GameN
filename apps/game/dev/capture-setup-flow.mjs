// mothership:dev-only
//
// Optional evidence capture of the staged start as it stands, for design work: the real
// hosted client on the local practice harness (isolated Auth/Firestore emulators and the
// loopback service of dev/practice/). Two scenarios, each in its own browser contexts:
//
//   1. Seven seats, six bots: a player joins, is seated, confirms a character, reveals the
//      dealt role, presses Ready and plays the first turn; the host then ends the match.
//   2. Nine seats, eight bots and an admitted shared display: the player types a name that is
//      too long and never confirms, so the server assigns a character and a name.
//
// Writes screenshots, the measured facts of each, and a log. It is not part of any check and
// proves nothing about real devices, Cloud Tasks, App Check or a deployed project.
//
// With the three practice processes of docs/frontend/practice-bots.md running:
//   CHROME_PATH=/path/to/chrome node apps/game/dev/capture-setup-flow.mjs <output-directory>
// A browser run as root also needs --no-sandbox: point CHROME_PATH at a wrapper that adds it.

import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { connect, launchBrowser, openPage, sleep } from './capture/browser.mjs';

// A statement, not only a comment: it survives bundling and comment stripping, so the
// production-exclusion check finds this module wherever it ends up.
globalThis[Symbol.for('mothership:dev-only')] = true;

const BASE = 'http://127.0.0.1:5176/';
const PHONE = { width: 390, height: 844, scale: 1, mobile: true, ownContext: true };
const ROLES = ['Officer', 'Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Red Disabler', 'Alien'];

// Read from the page; a fact here is an observation of one run, not a test oracle.
const FACTS = `(() => {
  const visible = node => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
  const controls = [...document.querySelectorAll('button, a[href], input, select, summary')].filter(visible);
  return {
    viewport: [innerWidth, innerHeight],
    documentHeight: document.documentElement.scrollHeight,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    focus: document.activeElement?.id || document.activeElement?.tagName || null,
    roleNamesInDocument: ${JSON.stringify(ROLES)}.filter(role => document.body.innerHTML.includes(role)),
    controlsUnder44: controls.map(node => ({ node, box: node.getBoundingClientRect() }))
      .filter(({ box }) => box.width < 44 || box.height < 44)
      .map(({ node, box }) => ({ id: node.id || null, text: (node.textContent || '').trim().slice(0, 48), width: Math.round(box.width), height: Math.round(box.height) })),
    statusLine: document.querySelector('#connected-status')?.textContent || null,
  };
})()`;

const output = resolve(process.argv[2] ?? 'setup-flow-evidence');
await mkdir(output, { recursive: true });
const log = [];
const facts = {};
const note = (...parts) => {
  const line = `${new Date().toISOString().slice(11, 19)} ${parts.join(' ')}`;
  log.push(line);
  console.log(line);
};

async function shot(page, name, { viewport = false, settle = 400 } = {}) {
  await sleep(settle);
  facts[name] = await page.evaluate(FACTS);
  await page.screenshot(join(output, `${name}.png`), { viewport });
  note('shot', name);
}
const text = (page, selector) => page.evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? null`);
async function choose(page, selector, value) {
  await page.evaluate(`(() => {
    const select = document.querySelector(${JSON.stringify(selector)});
    select.value = ${JSON.stringify(value)};
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
}
async function typeInto(page, selector, value) {
  await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  await page.type(value);
  await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new Event('input', { bubbles: true }))`);
}
async function resize(page, width, height = 844, mobile = true) {
  await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  await sleep(300);
}

/** Creates a lobby, fills every seat but one with bots, and returns the host page and its ids. */
async function hostLobby(browser, playerCount) {
  const host = await openPage(browser, PHONE);
  await host.goto(`${BASE}?as=host`, "document.querySelector('#connected-create')", 20_000);
  await choose(host, '#connected-player-count', String(playerCount));
  return {
    host,
    async create() {
      await host.click('#connected-create');
      await host.waitFor("/^[A-F0-9]{12}$/.test(document.querySelector('#connected-room-code')?.textContent ?? '')", 'room code', 20_000);
      await host.waitFor("document.querySelector('#connected-bots-save') && !document.querySelector('#connected-bots-save').disabled", 'bot control', 20_000);
      // The default count leaves one seat for a human.
      await host.click('#connected-bots-save');
      await host.waitFor(`document.querySelectorAll('#connected-bots-roster li').length === ${playerCount - 1}`, 'bots seated', 20_000);
      return { roomCode: await text(host, '#connected-room-code'), matchId: await text(host, '#connected-match-id') };
    },
  };
}

async function joinAndSeat(browser, host, roomCode, { onPending = async () => {} } = {}) {
  const player = await openPage(browser, PHONE);
  await player.goto(`${BASE}?as=player`, "document.querySelector('#connected-join')", 20_000);
  const join = { player, async ask() {
    await typeInto(player, '#connected-room-code-input', roomCode);
    await choose(player, '#connected-initial-room', 'Room B');
    await player.click('#connected-join');
    await player.waitFor("document.querySelector('#connected-waiting')?.textContent.includes('Waiting for the host')", 'waiting for admission', 20_000);
  } };
  return { ...join, async seat() {
    await host.foreground();
    await host.waitFor("document.querySelector('#connected-requests button[data-approve]')", 'admission request', 20_000);
    await onPending();
    await host.click('#connected-requests button[data-approve]');
    await host.waitFor("!document.querySelector('#connected-start').disabled", 'start enabled', 20_000);
  } };
}

const firstAvailable = page => page.evaluate("[...document.querySelectorAll('.crew-option')].find(button => !button.disabled)?.dataset.character ?? null");
const PICKER_OPEN = "!document.querySelector('.connected-identity')?.hidden && document.querySelector('#setup-countdown')?.textContent.includes('Character selection')";
const ROLE_DEALT = "document.querySelector('#setup-role-toggle') && !document.querySelector('#setup-role-toggle').disabled";
const MATCH_ON_SCREEN = "document.querySelector('.ms-shell[data-screen=\"match\"]')";

async function confirmedSevenSeats(browser) {
  note('scenario 1: seven seats, confirmed character');
  const entry = await openPage(browser, PHONE);
  await entry.goto(BASE, "document.querySelector('#connected-as-host')", 20_000);
  await shot(entry, '00-entry', { viewport: true });
  await entry.close();

  const { host, create } = await hostLobby(browser, 7);
  await shot(host, '01-host-create', { viewport: true });
  const { roomCode } = await create();
  const { player, ask, seat } = await joinAndSeat(browser, host, roomCode, { onPending: () => shot(host, '02-host-request-pending') });
  await shot(player, '04-join-form', { viewport: true });
  await ask();
  await shot(player, '05-join-waiting-admission', { viewport: true });
  await seat();
  await shot(host, '03-host-ready-to-start');
  await player.foreground();
  await player.waitFor("document.querySelector('#setup-progress-status')?.textContent.includes('Waiting for the host to start setup')", 'seated', 20_000);
  await shot(player, '06-seated-waiting-setup');

  await host.foreground();
  await host.click('#connected-start');
  await host.waitFor("document.querySelector('#setup-countdown')?.textContent.includes('Character selection')", 'host countdown', 20_000);
  await shot(host, '07-host-choosing');
  await player.foreground();
  await player.waitFor(PICKER_OPEN, 'picker open', 20_000);
  await shot(player, '08-select-open');
  await player.click(`.crew-option[data-character="${await firstAvailable(player)}"]`);
  await typeInto(player, '#crew-name', 'Ava');
  await resize(player, 320);
  await shot(player, '09-select-picked-320');
  await resize(player, 390);
  await player.click('#crew-save');
  await player.waitFor("document.querySelector('#crew-status')?.textContent.includes('Character confirmed')", 'confirmed', 20_000);
  await shot(player, '10-select-confirmed');

  // The interval between the deadline and the deal is short on this harness and may be missed.
  await player.waitFor(`document.querySelector('#setup-countdown')?.textContent.includes('Selection time has ended') || (${ROLE_DEALT})`, 'selection end', 45_000);
  if (await player.evaluate("document.querySelector('#setup-countdown')?.textContent.includes('Selection time has ended')")) await shot(player, '11-select-ended');
  await player.waitFor(ROLE_DEALT, 'role dealt', 45_000);
  await shot(player, '12-role-concealed');
  await player.click('#setup-role-toggle');
  await player.waitFor("document.querySelector('#setup-role-card .ms-role-card')", 'role revealed', 10_000);
  await shot(player, '13-role-revealed', { settle: 1200 });
  await resize(player, 320);
  await shot(player, '14-role-revealed-320', { settle: 600 });
  await resize(player, 390);
  await player.click('#setup-role-ready');
  await player.waitFor("!document.querySelector('#setup-ready-waiting').hidden", 'ready accepted', 20_000);
  await shot(player, '15-ready-waiting');

  await player.waitFor(MATCH_ON_SCREEN, 'first turn', 60_000);
  await shot(player, '16-game-first-turn', { settle: 1500 });
  await host.foreground();
  await host.click('#connected-end');
  await shot(host, '17-host-running-end-confirm');
  await host.click('#connected-end-confirm');
  await host.waitFor("document.querySelector('#connected-match-status')?.textContent === 'aborted'", 'ended by the host', 20_000);
  await player.foreground();
  await sleep(2500);
  await shot(player, '18-game-host-ended', { settle: 800 });
  for (const page of [player, host]) await page.close();
}

async function assignedNineSeats(browser) {
  note('scenario 2: nine seats, shared display, automatic assignment');
  const { host, create } = await hostLobby(browser, 9);
  const { roomCode, matchId } = await create();
  const display = await openPage(browser, PHONE);
  await display.goto(`${BASE}?as=display`, "document.querySelector('#connected-watch')", 20_000);
  await shot(display, '19-display-entry', { viewport: true });
  const displayUid = await text(display, '#connected-uid');
  await typeInto(display, '#connected-match-input', matchId);
  await display.click('#connected-watch');
  await display.waitFor("document.querySelector('#connected-waiting')", 'display waiting', 20_000);
  await host.foreground();
  await typeInto(host, '#connected-display-uid', displayUid);
  await host.click('#connected-admit-display');
  await host.waitFor("document.querySelector('#connected-status')?.textContent.includes('Admitting the display: done')", 'display admitted', 20_000);

  const { player, ask, seat } = await joinAndSeat(browser, host, roomCode);
  await ask();
  await seat();
  await display.foreground();
  await shot(display, '20-display-waiting');

  await host.foreground();
  await host.click('#connected-start');
  await player.foreground();
  await player.waitFor(PICKER_OPEN, 'picker open', 20_000);
  await player.click(`.crew-option[data-character="${await firstAvailable(player)}"]`);
  await typeInto(player, '#crew-name', 'Commander Shepard');
  await resize(player, 320);
  await shot(player, '21-select-name-too-long-320');
  await resize(player, 390);

  await player.waitFor(ROLE_DEALT, 'role dealt after automatic assignment', 50_000);
  await shot(player, '22-auto-assigned-no-notice');
  await player.click('#setup-role-toggle');
  await player.waitFor("document.querySelector('#setup-role-card .ms-role-card')", 'role revealed', 10_000);
  await player.click('#setup-role-ready');
  await player.waitFor("!document.querySelector('#setup-ready-waiting').hidden", 'ready accepted', 20_000);

  await player.waitFor(MATCH_ON_SCREEN, 'first turn', 60_000);
  await resize(player, 320);
  await shot(player, '23-game-nine-seats-320', { settle: 1500 });
  await resize(player, 390);
  await player.click('#ms-private-toggle');
  await player.waitFor("document.querySelector('#ms-private-panel') && !document.querySelector('#ms-private-panel').hidden", 'private panel open', 10_000);
  await shot(player, '24-game-private-open', { settle: 1200 });
  await player.click('#ms-private-toggle');

  await display.foreground();
  await display.waitFor(MATCH_ON_SCREEN, 'display board', 30_000);
  await resize(display, 1280, 800, false);
  await shot(display, '25-display-board-1280', { viewport: true, settle: 1200 });
  await host.foreground();
  await host.click('#connected-end');
  await host.click('#connected-end-confirm');
  await host.waitFor("document.querySelector('#connected-match-status')?.textContent === 'aborted'", 'ended by the host', 20_000);
  for (const page of [player, display, host]) await page.close();
}

const launched = await launchBrowser();
const browser = await connect(launched.endpoint);
try {
  await confirmedSevenSeats(browser);
  await assignedNineSeats(browser);
  note('done');
} catch (error) {
  note('FAILED', error.message);
  process.exitCode = 1;
} finally {
  await writeFile(join(output, 'facts.json'), `${JSON.stringify(facts, null, 2)}\n`);
  await writeFile(join(output, 'capture-log.txt'), `${log.join('\n')}\n`);
  browser.close();
  await launched.close();
}
