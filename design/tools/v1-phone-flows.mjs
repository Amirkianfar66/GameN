// mothership:dev-only
//
// Clicks through the phone-first V1 journey prototype's own flows, to show it works as a
// prototype: choosing and confirming a character, revealing and Ready, opening the private
// card, choosing and registering, moving by pressing a room, ending a match in two presses,
// and a countdown that only changes words. It tests the prototype, not the game:
//   node design/tools/v1-phone-flows.mjs        (needs a Chromium-based browser)

import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { startStaticServer } from './lib/static-server.mjs';
const server = await startStaticServer({ port: 0 });
const launched = await launchBrowser({});
const browser = await connect(launched.endpoint);
const results = [];
const ok = (name, cond, extra = '') => results.push(`${cond ? 'ok  ' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
async function page(state) {
  const p = await openPage(browser, { width: 390, height: 844, mobile: true });
  await p.goto(`${server.origin}/v1-phone/?state=${state}`, 'window.__designReady === true');
  return p;
}
const click = (p, sel) => p.evaluate(`(() => { const n = document.querySelector(${JSON.stringify(sel)}); if (!n) return false; n.click(); return true; })()`);
const loc = p => p.evaluate('new URLSearchParams(location.search).get("state")');
try {
  // Selection: pick, name, confirm -> submitting -> confirmed
  let p = await page('select.open');
  ok('select: Confirm disabled at first', await p.evaluate(`document.querySelector('[data-act="confirm-crew"]').getAttribute('aria-disabled') === 'true'`));
  await click(p, '[data-character="c6"]');
  ok('select: tile pressed', await p.evaluate(`document.querySelector('[data-character="c6"]').getAttribute('aria-pressed') === 'true'`));
  await p.evaluate(`(() => { const i = document.getElementById('j-name'); i.value = 'Zoë'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  ok('select: counter counts code points', await p.evaluate(`document.querySelector('.j-field__count').textContent === '3/12'`));
  ok('select: Confirm enabled', await p.evaluate(`document.querySelector('[data-act="confirm-crew"]').getAttribute('aria-disabled') === 'false'`));
  await click(p, '[data-act="confirm-crew"]');
  await sleep(1800);
  ok('select: lands on confirmed', (await loc(p)) === 'select.confirmed', await loc(p));
  await p.close();
  // Reveal: reveal -> revealed; Ready -> sending
  p = await page('reveal.concealed');
  ok('reveal: no role word while concealed', !(await p.evaluate(`/Officer|Insider|Hacker|Alien|Supplier|Cracker|Undercover|Disabler/.test(document.body.innerText)`)));
  await click(p, '[data-to="reveal.revealed"]');
  await p.waitFor('document.querySelector(".j-private .j-rolecard")', 'revealed card');
  ok('reveal: card face up inside .j-private', await p.evaluate(`Boolean(document.querySelector('.j-private [data-device]'))`));
  await click(p, '[data-to="reveal.ready-sending"]');
  await p.waitFor('new URLSearchParams(location.search).get("state") === "reveal.ready-sending"', 'ready sending');
  ok('reveal: Ready goes to sending', true);
  await p.close();
  // Game: open card -> choose target -> confirm -> registered
  p = await page('game.own-turn');
  ok('game: no private container while closed', await p.evaluate(`!document.querySelector('.j-private')`));
  await click(p, '[data-act="open-private"]');
  ok('game: private card opens', await p.evaluate(`Boolean(document.querySelector('.j-private .j-card'))`));
  ok('game: focus moves into the card', await p.evaluate(`Boolean(document.activeElement && document.activeElement.closest('.j-sheet'))`));
  await click(p, '[data-act="hide-private"]');
  ok('game: Hide removes the private container', await p.evaluate(`!document.querySelector('.j-private')`));
  await p.close();
  p = await page('game.choose-target');
  await click(p, '[data-value="seat-7"]');
  ok('game: confirming card', await p.evaluate(`document.querySelector('.j-card__prompt').textContent.includes('Register a shot at Player 7')`));
  await click(p, '[data-act="confirm"]');
  ok('game: sending', await p.evaluate(`document.querySelector('.j-card__status').textContent === 'Submitting'`));
  await sleep(1600);
  ok('game: registered', (await loc(p)) === 'game.registered', await loc(p));
  await p.close();
  // Move by pressing the room on the board
  p = await page('game.choose-room');
  await click(p, '.j-room__go[data-room="Room A"]');
  ok('move: room picked on the board', await p.evaluate(`document.querySelector('.j-room[data-room="room-a"]').hasAttribute('data-picked') && document.querySelector('.j-card__prompt').textContent === 'Move to Room A?'`));
  await click(p, '[data-act="confirm"]');
  await sleep(1600);
  ok('move: accepted state', (await loc(p)) === 'game.move-accepted', await loc(p));
  await p.close();
  // Host: end in two presses, focus on the way back
  p = await page('host.running');
  await click(p, '[data-to="host.end-confirm"]');
  await p.waitFor('new URLSearchParams(location.search).get("state") === "host.end-confirm"', 'end confirm');
  await sleep(300);
  ok('host: focus on "No, keep the match"', await p.evaluate(`document.activeElement && document.activeElement.textContent.includes('No, keep the match')`));
  await p.close();
  // Countdown only changes words
  p = await openPage(browser, { width: 390, height: 844, mobile: true });
  await p.goto(`${server.origin}/v1-phone/?state=select.retry`, 'window.__designReady === true');
  const before = await p.evaluate(`document.querySelector('.j-timer__value').textContent`);
  await sleep(2300);
  const after = await p.evaluate(`document.querySelector('.j-timer__value').textContent`);
  ok('countdown ticks locally', before !== after, `${before} -> ${after}`);
  ok('countdown never navigates', (await loc(p)) === 'select.retry');
  await p.close();
} finally {
  console.log(results.join('\n'));
  const failed = results.filter(line => line.startsWith('FAIL')).length;
  console.log(`V1 phone flows: ${results.length - failed} passed, ${failed} failed`);
  if (failed || results.length === 0) process.exitCode = 1;
  browser.close(); await launched.close(); await server.close();
}
