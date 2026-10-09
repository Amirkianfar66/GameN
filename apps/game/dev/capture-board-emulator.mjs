// mothership:dev-only
//
// Emulator evidence for the board as the place the game is played (issue #87): the real
// hosted client on the local practice harness (isolated Auth/Firestore emulators and the
// loopback service of dev/practice/, with its local deadline and bot tick). A host, one human
// player among bots, and an admitted shared display, each in its own browser context. The
// player plays a turn on the board: the tray, a character action if the dealt role has one,
// a move by keyboard through a room tag, Pass, and the Jail vote by tapping a character. The
// display is checked for private hooks at every step and photographed during public moves.
//
// It proves nothing about real devices, deployed services, App Check or Cloud Tasks; the bots'
// roles are dealt at random, so which character action appears differs from run to run.
//
// With the three practice processes of docs/frontend/practice-bots.md running:
//   CHROME_PATH=/path/to/chrome node apps/game/dev/capture-board-emulator.mjs <output-directory> [players]
// A browser run as root also needs --no-sandbox: point CHROME_PATH at a wrapper that adds it.

import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { connect, launchBrowser, openPage, sleep } from './capture/browser.mjs';
import { MEASURE, problemsOf } from './capture/board-measure.mjs';

// A statement, not only a comment: it survives bundling and comment stripping, so the
// production-exclusion check finds this module wherever it ends up.
globalThis[Symbol.for('mothership:dev-only')] = true;

const BASE = 'http://127.0.0.1:5176/';
const PHONE = { width: 390, height: 844, scale: 1, mobile: true, ownContext: true };
const DISPLAY = { width: 1280, height: 720, scale: 1, mobile: false, ownContext: true };
const MATCH = "document.querySelector('.ms-shell[data-screen=\"match\"]')";
const PRIVATE_ON_DISPLAY = `(() => {
  const html = document.getElementById('app')?.innerHTML ?? '';
  return ['data-board-target', 'phone-character-target', 'phone-pick-order', 'phone-move-ghost', 'phone-strip', 'data-device', 'data-team', 'ms-private__panel']
    .filter(hook => html.includes(hook));
})()`;

const output = resolve(process.argv[2] ?? 'board-emulator-evidence');
const players = Number(process.argv[3] ?? 7);
await mkdir(output, { recursive: true });
const facts = [];
const lines = [];
const note = (...parts) => { const line = `${new Date().toISOString().slice(11, 19)} ${parts.join(' ')}`.trimEnd(); lines.push(line); console.log(line); };
const finish = async () => {
  await writeFile(join(output, 'facts.json'), `${JSON.stringify(facts, null, 2)}\n`);
  await writeFile(join(output, 'capture-log.txt'), `${lines.join('\n')}\n`);
};

const browserProcess = await launchBrowser();
const browser = await connect(browserProcess.endpoint);
const text = (page, selector) => page.evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? null`);
async function choose(page, selector, value) {
  await page.evaluate(`(() => { const s = document.querySelector(${JSON.stringify(selector)}); s.value = ${JSON.stringify(value)}; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
}
async function typeInto(page, selector, value) {
  await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  await page.type(value);
  await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new Event('input', { bubbles: true }))`);
}
/** Opens, as a person would, every closed disclosure around a control: the host's Menu and the section inside it. */
async function reveal(page, selector) {
  for (let depth = 0; depth < 4; depth += 1) {
    const closed = await page.evaluate(`(() => {
      const chain = [];
      for (let node = document.querySelector(${JSON.stringify(selector)}); node; node = node.parentElement) if (node.tagName === 'DETAILS' && !node.open) chain.push(node);
      chain.at(-1)?.querySelector(':scope > summary')?.setAttribute('data-capture-open', '');
      return chain.length;
    })()`);
    if (closed === 0) return;
    await page.click('summary[data-capture-open]');
    await page.evaluate("document.querySelector('summary[data-capture-open]')?.removeAttribute('data-capture-open')");
    await sleep(200);
  }
}
/** A real click; if the page did not take it, says so in the log and clicks the element itself. */
async function press(page, selector, took, label) {
  await reveal(page, selector);
  await page.click(selector);
  try { await page.waitFor(took, label, 5000); }
  catch {
    const under = await page.evaluate(`(() => { const b = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); const top = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return top ? (top.id || top.className || top.tagName) : 'nothing'; })()`);
    note(`note: a pointer click on ${selector} did not register (topmost element there: ${under}); clicking the element directly`);
    await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    await page.waitFor(took, label, 20_000);
  }
}
async function step(page, name, { shot = true, settle = 350, display = false } = {}) {
  await sleep(settle);
  const measured = await page.evaluate(MEASURE);
  facts.push({ name, ...measured });
  if (shot) await page.screenshot(join(output, `${name}.png`), { viewport: true });
  const problems = problemsOf(measured, { phone: !display });
  note(name, problems.length ? `PROBLEMS: ${problems.join('; ')}` : 'clean', measured.phase ? `| ${measured.phase}` : '', measured.strip ? `| ${measured.strip.slice(0, 100)}` : '');
  return measured;
}
async function displayPrivacy(display, when) {
  const hooks = await display.evaluate(PRIVATE_ON_DISPLAY);
  const roles = await display.evaluate(`${JSON.stringify(['Officer', 'Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Red Disabler', 'Alien'])}.filter(role => document.body.innerText.includes(role))`);
  facts.push({ name: `display-privacy-${when}`, hooks, roles });
  note(`display privacy (${when}):`, hooks.length || roles.length ? `FOUND ${[...hooks, ...roles].join(', ')}` : 'no private hook or role word');
}

try {
  // ---------- lobby: host, bots, shared display, one human player ----------
  const host = await openPage(browser, PHONE);
  await host.goto(`${BASE}?as=host`, "document.querySelector('#connected-create')", 30_000);
  await choose(host, '#connected-player-count', String(players));
  await host.click('#connected-create');
  await host.waitFor("/^[A-F0-9]{12}$/.test(document.querySelector('#connected-room-code')?.textContent ?? '')", 'room code', 20_000);
  await host.waitFor("document.querySelector('#connected-bots-save') && !document.querySelector('#connected-bots-save').disabled", 'bot control', 20_000);
  await press(host, '#connected-bots-save', `document.querySelectorAll('#connected-bots-roster li').length === ${players - 1}`, 'bots seated');
  const roomCode = await text(host, '#connected-room-code');
  const matchId = await text(host, '#connected-match-id');
  note(`lobby ${roomCode}, ${players} seats, ${players - 1} bots`);

  const display = await openPage(browser, DISPLAY);
  await display.goto(`${BASE}?as=display`, "document.querySelector('#connected-watch')", 30_000);
  const displayUid = await text(display, '#connected-uid');
  await typeInto(display, '#connected-match-input', matchId);
  await display.click('#connected-watch');
  await display.waitFor("document.querySelector('#connected-waiting')", 'display waiting', 20_000);
  await host.foreground();
  await reveal(host, '#connected-display-uid');
  await typeInto(host, '#connected-display-uid', displayUid);
  await press(host, '#connected-admit-display', "/Admitting the display/.test(document.querySelector('#connected-status')?.textContent ?? '')", 'display admission sent');
  await host.waitFor("/Admitting the display: done/.test(document.querySelector('#connected-status')?.textContent ?? '')", 'display admitted', 20_000);

  const player = await openPage(browser, PHONE);
  await player.goto(`${BASE}?as=player`, "document.querySelector('#connected-join')", 30_000);
  await typeInto(player, '#connected-room-code-input', roomCode);
  await player.click('#connected-join');
  await player.waitFor("document.querySelector('#connected-waiting')", 'waiting for admission', 20_000);
  await host.foreground();
  await host.waitFor("document.querySelector('#connected-requests button[data-approve]')", 'admission request', 20_000);
  await host.click('#connected-requests button[data-approve]');
  await host.waitFor("!document.querySelector('#connected-start').disabled", 'start enabled', 20_000);
  await host.click('#connected-start');

  // ---------- staged start, unchanged: character, role, Ready ----------
  await player.foreground();
  await player.waitFor("[...document.querySelectorAll('.crew-option')].some(button => !button.disabled)", 'character selection', 30_000);
  const character = await player.evaluate("[...document.querySelectorAll('.crew-option')].find(button => !button.disabled).dataset.character");
  await player.tap(`.crew-option[data-character="${character}"]`);
  note(`player chose ${character}`);
  await player.waitFor("document.querySelector('#setup-role-toggle') && !document.querySelector('#setup-role-toggle').disabled", 'role dealt', 90_000);
  await player.tap('#setup-role-toggle');
  await player.waitFor("document.querySelector('#setup-role-ready') && !document.querySelector('#setup-role-ready').hidden && !document.querySelector('#setup-role-ready').disabled", 'Ready offered', 20_000);
  await player.tap('#setup-role-ready');
  await player.waitFor(MATCH, 'match on the phone', 120_000);
  await display.waitFor(MATCH, 'match on the display', 60_000);
  note('match running on the phone and the display');
  await step(player, 'emulator-01-board', { settle: 1500 });
  await display.foreground();
  await step(display, 'emulator-02-display', { display: true, settle: 800 });
  await displayPrivacy(display, 'start');

  // ---------- the player's turn ----------
  await player.foreground();
  const flights = [];
  const started = Date.now();
  while (!(await player.evaluate("document.querySelector('.ms-phase__label')?.textContent === 'Your turn'"))) {
    if (Date.now() - started > 12 * 60_000) throw new Error('No turn of the player within twelve minutes');
    const moving = await display.evaluate("[...document.querySelectorAll('.ms-board .ms-seat[data-moving]')].map(seat => seat.dataset.seat)");
    if (moving.length && flights.length < 3) {
      flights.push(moving);
      await display.screenshot(join(output, `emulator-03-display-bot-move-${flights.length}.png`), { viewport: true });
      note(`display: public move in flight for ${moving.join(', ')}`);
    }
    await sleep(400);
  }
  note(`the player's turn after ${Math.round((Date.now() - started) / 1000)} s`);
  await step(player, 'emulator-04-your-turn');
  await player.tap('#ms-phone-actions');
  const tray = await step(player, 'emulator-05-tray');
  const offers = await player.evaluate("[...document.querySelectorAll('[data-intent=\"action/open\"]')].map(button => button.dataset.kind)");
  note(`tray offers: ${offers.join(', ') || 'none'}`);
  facts.push({ name: 'offers', offers, tray: tray.tray });
  const seatAction = ['shot', 'hack', 'disable', 'protect', 'rescue', 'scan', 'supply'].find(kind => offers.includes(kind));
  if (seatAction) {
    await player.tap(`#ms-action-open-${seatAction}`);
    await player.waitFor("document.querySelector('.phone-strip > .ms-card__state[data-step=\"choosing\"]')", 'choosing', 5000);
    const choosing = await step(player, `emulator-06-${seatAction}-choose`);
    await displayPrivacy(display, `${seatAction}-choosing`);
    const first = choosing.targets[0]?.seat;
    if (first) {
      await player.tap(`.phone-character-target[data-value="${first}"]`);
      await step(player, `emulator-07-${seatAction}-picked`);
      if (seatAction === 'shot') {
        await sleep(450);
        if (await player.evaluate("document.querySelector('#ms-action-confirm')")) {
          await player.tap('#ms-action-confirm');
          await player.waitFor("document.querySelector('.phone-strip > .ms-card__state[data-step=\"result\"]')", 'shot receipt', 20_000);
          await step(player, 'emulator-08-shot-registered');
          await displayPrivacy(display, 'shot-registered');
        }
      }
    }
    // Put it down: back to the board with nothing in progress.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const id = await player.evaluate("document.querySelector('#ms-action-dismiss, #ms-action-back')?.id ?? null");
      if (!id) break;
      await sleep(450);
      await player.tap(`#${id}`);
      await sleep(300);
    }
  }
  if (await player.evaluate("document.querySelector('.ms-shell').dataset.phoneView !== 'board'")) await player.tap('#ms-phone-board');

  // A move by keyboard alone: Tab to a room tag, Enter, Tab to the confirmation, Enter.
  const room = await player.evaluate(`(() => {
    const own = document.querySelector('.ms-board .ms-seat[data-self="true"]')?.closest('.ms-zone')?.dataset.zone;
    return ['room-a', 'room-b'].find(zone => zone !== own) ?? null;
  })()`);
  if (room) {
    // A click on the status bar, which holds no control, puts the keyboard's starting point
    // at the top of the page; from there Tab walks the board's room tags.
    await player.click('.ms-phase__labels');
    const presses = await player.tabTo(`phone-move-${room}`, 40);
    await player.press('Enter');
    await player.waitFor("document.querySelector('.phone-strip > .ms-card__state[data-step=\"confirming\"]') || document.querySelector('.phone-panel-notice')", 'move confirmation or notice', 5000);
    const confirmStep = await step(player, 'emulator-09-move-confirm');
    facts.push({ name: 'keyboard-move', tabPressesToRoomTag: presses, focus: confirmStep.focus, ghost: confirmStep.ghost });
    if (await player.evaluate("document.querySelector('#ms-action-confirm')")) {
      await sleep(450);
      await player.tabTo('ms-action-confirm', 10);
      await player.press('Enter');
      let seen = false;
      for (let tries = 0; tries < 40 && !seen; tries += 1) {
        const [phone, shared] = await Promise.all([
          player.evaluate("document.querySelectorAll('.ms-board .ms-seat[data-moving]').length"),
          display.evaluate("document.querySelectorAll('.ms-board .ms-seat[data-moving]').length"),
        ]);
        if (phone || shared) {
          seen = true;
          await player.screenshot(join(output, 'emulator-10-move-flight-phone.png'), { viewport: true });
          await display.screenshot(join(output, 'emulator-11-move-flight-display.png'), { viewport: true });
          note(`own move in flight: phone ${phone}, display ${shared}`);
        }
        await sleep(50);
      }
      await player.waitFor("document.querySelector('.phone-strip > .ms-card__state[data-step=\"result\"]')", 'move receipt', 20_000);
      await step(player, 'emulator-12-move-accepted', { settle: 1300 });
      await displayPrivacy(display, 'after-move');
      await sleep(450);
      await player.tap('#ms-action-dismiss');
    }
  }
  // Pass, from the middle of navigation.
  await sleep(600);
  if (await player.evaluate("document.querySelector('#ms-phone-pass') && !document.querySelector('#ms-phone-pass').disabled")) {
    await player.tap('#ms-phone-pass');
    await player.waitFor("document.querySelector('.phone-pass-status .ms-card__state[data-step=\"result\"]')", 'Pass receipt', 20_000);
    await step(player, 'emulator-13-pass-receipt');
    // A receipt stays until the player puts it away, as in the release.
    await sleep(500);
    await player.tap('#ms-action-dismiss');
  } else note('Pass was not available at this point');

  // ---------- the Jail vote at the end of the round: tap a character ----------
  const voteStarted = Date.now();
  await player.waitFor("document.querySelector('.ms-phase__label')?.textContent?.includes('Jail vote')", 'Jail vote', 12 * 60_000);
  note(`Jail vote after ${Math.round((Date.now() - voteStarted) / 1000)} s`);
  await step(player, 'emulator-14-jail-vote-board');
  await player.tap('#ms-phone-actions');
  await player.waitFor("document.querySelector('#ms-action-open-vote')", 'vote offered', 10_000);
  await player.tap('#ms-action-open-vote');
  await player.waitFor("document.querySelector('.phone-strip > .ms-card__state[data-step=\"choosing\"]')", 'choosing a ballot', 5000);
  const ballot = await step(player, 'emulator-15-jail-vote-choose');
  await displayPrivacy(display, 'vote-choosing');
  const candidate = ballot.targets.find(target => target.seat !== undefined)?.seat;
  await player.tap(`.phone-character-target[data-value="${candidate}"]`);
  await step(player, 'emulator-16-jail-vote-confirm');
  await sleep(450);
  await player.tap('#ms-action-confirm');
  await player.waitFor("document.querySelector('.phone-strip > .ms-card__state[data-step=\"result\"]')", 'ballot receipt', 20_000);
  await step(player, 'emulator-17-jail-vote-recorded');
  await displayPrivacy(display, 'vote-recorded');
  await display.foreground();
  await step(display, 'emulator-18-display-during-vote', { display: true });
  // The count and whoever goes to Jail are public: both screens draw them when the vote closes.
  await player.waitFor("!document.querySelector('.ms-phase__label')?.textContent?.includes('Jail vote')", 'vote closed', 3 * 60_000);
  await sleep(300);
  await display.screenshot(join(output, 'emulator-19-display-after-vote.png'), { viewport: true });
  await player.foreground();
  await step(player, 'emulator-20-after-vote', { settle: 1200 });

  await host.foreground();
  await reveal(host, '#connected-end');
  await host.click('#connected-end');
  await host.waitFor("document.querySelector('#connected-end-confirm')?.closest('dialog')?.open", 'end confirmation', 10_000);
  await host.click('#connected-end-confirm');
  await host.waitFor("document.querySelector('#connected-match-status')?.textContent === 'aborted'", 'ended by the host', 20_000);
  note('host ended the match');
} catch (error) {
  note(`FAILED: ${error.message}`);
  process.exitCode = 1;
} finally {
  await finish();
  await browser.close();
  await browserProcess.close();
}
