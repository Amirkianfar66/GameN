// mothership:dev-only
//
// Clicks through the phone-first V1 journey prototype's own flows, to show it works as a
// prototype: tap-to-confirm selection and explicit retries, revealing and Ready, opening the private
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
  // Joining is code-only; the persisted starting room is a server result.
  let p = await page('join.code');
  ok('join: one room-code field, no starting-room choice', await p.evaluate(`Boolean(document.querySelector('#j-code')) && !document.querySelector('[name="room"], .j-roomtile')`));
  await p.close();
  // One tile tap sends the selection; a second tap cannot replace it.
  p = await page('select.open');
  ok('select: nine tiles, no name field or separate confirmation', await p.evaluate(`document.querySelectorAll('.j-crewtile').length === 9 && !document.querySelector('#j-name, [data-act="confirm-crew"]')`));
  await click(p, '[data-character="c6"]');
  ok('select: tile tap immediately enters submitting', await p.evaluate(`document.querySelector('.j-crew').dataset.selectionState === 'submitting' && document.querySelector('[data-character="c6"]').getAttribute('aria-pressed') === 'true'`));
  ok('select: an empty name becomes the call sign', await p.evaluate(`window.__v1Selection().name === 'Nova' && window.__v1Selection().sends === 1`));
  await click(p, '[data-character="c4"]');
  ok('select: a second tap cannot replace or resend an in-flight choice', await p.evaluate(`window.__v1Selection().selected === 'c6' && window.__v1Selection().sends === 1`));
  await sleep(1800);
  ok('select: same tile stays pressed and read-only after acknowledgment', await p.evaluate(`document.querySelector('.j-crew').dataset.selectionState === 'confirmed' && document.querySelector('[data-character="c6"]').dataset.confirmed === 'true' && [...document.querySelectorAll('.j-crewtile')].every(n => n.getAttribute('aria-disabled') === 'true')`));
  ok('select: acknowledgment does not deal roles or advance the window', (await loc(p)) === 'select.open' && await p.evaluate(`!document.querySelector('.j-private, .j-rolecard')`));
  await p.close();
  // Kept choice recovery requires the explicit current retry control.
  p = await page('select.retry');
  ok('select retry: current exact wording and frozen tiles', await p.evaluate(`document.body.innerText.includes('Connection interrupted. Retry your selection.') && document.querySelector('[data-act="retry-crew"]').textContent === 'Retry selection' && [...document.querySelectorAll('.j-crewtile')].every(n => n.getAttribute('aria-disabled') === 'true')`));
  await click(p, '[data-character="c6"]');
  ok('select retry: no replacement or implicit retry', await p.evaluate(`window.__v1Selection().selected === 'c1' && window.__v1Selection().sends === 0`));
  await click(p, '[data-act="retry-crew"]');
  ok('select retry: preserves the kept choice and existing name', await p.evaluate(`window.__v1Selection().selected === 'c1' && window.__v1Selection().name === 'Cleo' && window.__v1Selection().sends === 1`));
  await sleep(1800);
  ok('select retry: confirmed without leaving the selection window', (await loc(p)) === 'select.retry' && await p.evaluate(`window.__v1Selection().phase === 'confirmed'`));
  await p.close();
  p = await page('select.conflict');
  ok('select conflict: current exact wording and unavailable holder tile', await p.evaluate(`document.body.innerText.includes('Taken. Choose another character.') && document.querySelector('[data-character="c1"]').getAttribute('aria-label') === 'Vega, taken by Player 6' && document.querySelector('[data-character="c1"]').getAttribute('aria-disabled') === 'true'`));
  await click(p, '[data-character="c1"]');
  ok('select conflict: taken tile sends nothing', await p.evaluate(`window.__v1Selection().sends === 0`));
  await click(p, '[data-character="c6"]');
  ok('select conflict: another tile confirms while preserving the existing name', await p.evaluate(`window.__v1Selection().selected === 'c6' && window.__v1Selection().name === 'Cleo' && window.__v1Selection().phase === 'submitting'`));
  await p.close();
  p = await page('select.unavailable');
  ok('select unavailable: current generic refusal replaces obsolete name-conflict screen', await p.evaluate(`document.body.innerText.includes('Selection unavailable. Try again.') && !document.querySelector('#j-name')`));
  await p.close();
  for (const state of ['select.expired', 'select.unsynced']) {
    p = await page(state);
    await click(p, '[data-character="c6"]');
    ok(`${state}: no send while time is closed or uncalibrated`, await p.evaluate(`window.__v1Selection().sends === 0 && [...document.querySelectorAll('.j-crewtile')].every(n => n.getAttribute('aria-disabled') === 'true')`));
    await p.close();
  }
  // The card is the reveal surface. No steps, guide or setup progress paragraph.
  p = await page('reveal.concealed');
  ok('reveal: no role word while concealed', !(await p.evaluate(`/Officer|Insider|Hacker|Alien|Supplier|Cracker|Undercover|Disabler/.test(document.body.innerText)`)));
  ok('reveal: Tap to reveal is the card with the current accessible name', await p.evaluate(`document.querySelector('.j-reveal-tap').getAttribute('aria-label') === 'Reveal my role' && document.querySelector('.j-reveal-tap').textContent.includes('Tap to reveal') && !document.querySelector('.j-steps, .j-slots')`));
  await click(p, '[data-to="reveal.revealed"]');
  await p.waitFor('document.querySelector(".j-private .j-rolecard")', 'revealed card');
  ok('reveal: card face up inside .j-private', await p.evaluate(`Boolean(document.querySelector('.j-private [data-device]'))`));
  ok('reveal: card surface hides the role, no separate guide paragraph', await p.evaluate(`document.querySelector('.j-reveal-toggle').getAttribute('aria-label') === 'Hide my role' && !document.querySelector('.j-guide')`));
  await click(p, '.j-reveal-toggle');
  await p.waitFor('new URLSearchParams(location.search).get("state") === "reveal.concealed"', 'concealed card');
  ok('reveal: explicit Hide removes role content', await p.evaluate(`!document.querySelector('.j-private, [data-device], [data-team]')`));
  await click(p, '[data-to="reveal.revealed"]');
  await p.waitFor('document.querySelector(".j-private .j-rolecard")', 'revealed again');
  await click(p, '[data-to="reveal.ready-sending"]');
  await p.waitFor('new URLSearchParams(location.search).get("state") === "reveal.ready-sending"', 'ready sending');
  ok('reveal: Ready goes to sending and conceals the role', await p.evaluate(`!document.querySelector('.j-private') && document.body.innerText.includes('Confirming…')`));
  await p.close();
  p = await page('reveal.ready-retry');
  ok('reveal retry: current Retry Ready control', await p.evaluate(`document.querySelector('[data-to="reveal.ready-early"]').textContent === 'Retry Ready'`));
  await p.close();
  for (const state of ['reveal.ready-early', 'reveal.waiting-others', 'reveal.everyone-ready']) {
    p = await page(state);
    ok(`${state}: checkmark with current accessible waiting status`, await p.evaluate(`document.querySelector('.j-ready-mark').getAttribute('aria-label') === 'Ready. Waiting for the timer and other players.' && document.querySelector('.j-ready-mark').textContent === '✓' && !document.querySelector('.j-private, .j-steps, .j-slots')`));
    ok(`${state}: no early transition into play`, (await loc(p)) === state);
    await p.close();
  }
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
