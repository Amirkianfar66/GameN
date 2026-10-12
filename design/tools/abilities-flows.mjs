// mothership:dev-only
//
// Clicks through the ability art's setup prototype (design/abilities/setup.html, slice 8) to show
// that it keeps its promises: a taken character is stamped with its taker's seat, the same as its
// name says; the seat's own pick is on its way, then confirmed, popped and checked once; the timer's
// end settles every card; the role card is dealt face down with the same back for every role, turned
// up only by the player with the reviewed turn and its device put into the hand, hidden at once, and
// put away once Ready with READY stamped; nothing of a role is in the page while the card is face
// down; nothing plays for a page that loads or a fresh view; reduced motion keeps the facts and
// drops the travel. It tests the prototype, not the game:
//   node design/tools/abilities-flows.mjs       (needs a Chromium-based browser)
//   npm run flows:abilities --workspace @mothership/design-tokens

import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { startStaticServer } from './lib/static-server.mjs';

const server = await startStaticServer({ port: 0 });
const launched = await launchBrowser({});
const browser = await connect(launched.endpoint);
const results = [];
const ok = (name, cond, extra = '') => results.push(`${cond ? 'ok  ' : 'FAIL'}  ${name}${!cond && extra !== '' ? ` — ${typeof extra === 'string' ? extra : JSON.stringify(extra)}` : ''}`);

async function open(scenario, extra = '') {
  const page = await openPage(browser, { width: 1200, height: 1000 });
  await page.goto(`${server.origin}/abilities/setup.html?scenario=${scenario}${extra ? `&${extra}` : ''}`, 'window.__designReady === true');
  await sleep(150);
  return page;
}
const js = value => JSON.stringify(value);
const click = (page, selector) => page.evaluate(`(() => { const n = document.querySelector(${js(selector)}); if (!n) return false; n.click(); return true; })()`);
const tile = id => `.crew-option[data-character="${id}"]`;
const state = page => page.evaluate('({ ...window.__suState, holders: [...window.__suState.holders] })');
// The animations running in the phone, by what they move: their targets' classes, and the pseudo-element if any.
const moving = page => page.evaluate(`document.getElementById('su-app').getAnimations({ subtree: true }).filter(a => a.playState === 'running').map(a => (a.effect.target.id || a.effect.target.className) + (a.effect.pseudoElement || ''))`);
const settled = page => page.evaluate(`Promise.all(document.getElementById('su-app').getAnimations({ subtree: true }).map(a => a.finished.catch(() => null))).then(() => true)`);
// Each text and each accessible name on its own: the page's whole text runs one element's words into the next.
const roleInPage = page => page.evaluate(`(() => {
  const app = document.getElementById('su-app');
  const said = [];
  for (const walker = document.createTreeWalker(app, NodeFilter.SHOW_TEXT); walker.nextNode();) said.push(walker.currentNode.nodeValue);
  for (const node of app.querySelectorAll('[aria-label]')) said.push(node.getAttribute('aria-label'));
  return { words: said.flatMap(words => words.match(/\\b(Officer|Insider|Cracker|Disabler|Supplier|Undercover|Hacker|Alien)\\b/g) || []), hooks: app.querySelectorAll('[data-device], [data-team]').length };
})()`);
const until = async (page, expression, label, ms = 4000) => { try { await page.waitFor(expression, label, ms); return true; } catch { return false; } };

try {
  // ---------- choosing a character ----------
  let page = await open('select.open');
  ok('choose: two cards taken by others are stamped with their takers\' seats, as their names say',
    await page.evaluate(`[...document.querySelectorAll('.crew-option[data-taken="true"]')].map(n => n.getAttribute('aria-label') + '|' + n.querySelector('.ab-taken')?.textContent).join(';')`) === 'Atlas, taken by Player 2|Player 2;Juno, taken by Player 6|Player 6');
  ok('choose: a taken card cannot be picked', await page.evaluate(`document.querySelector('${tile('c4')}').disabled`));
  ok('choose: nothing of a role is in the page while choosing', js(await roleInPage(page)) === js({ words: [], hooks: 0 }));
  ok('choose: a page that loads plays nothing', (await moving(page)).length === 0);
  await page.evaluate(`window.__suState.answer = 'slow'`);
  await click(page, tile('c2'));
  ok('choose: the seat\'s own pick, on its way: pressed, its ring dashed, every card held', await page.evaluate(`(() => { const t = document.querySelector('${tile('c2')}'); return t.getAttribute('aria-pressed') === 'true' && t.dataset.sending === 'true' && [...document.querySelectorAll('.crew-option')].every(n => n.disabled); })()`));
  ok('choose: on its way, nothing is checked yet', await page.evaluate(`document.querySelectorAll('.crew-option[data-confirmed="true"]').length === 0`));
  await until(page, `document.querySelector('${tile('c2')}').dataset.confirmed === 'true'`, 'confirmed');
  ok('choose: confirmed: checked once, the ring solid, every other card held', await page.evaluate(`(() => { const t = document.querySelector('${tile('c2')}'); return t.dataset.confirmed === 'true' && !t.dataset.sending && document.querySelectorAll('.crew-option[data-confirmed="true"]').length === 1 && [...document.querySelectorAll('.crew-option')].every(n => n.disabled); })()`));
  const pop = await moving(page);
  ok('choose: confirmed, it pops once on its burst and its check lands', pop.filter(name => name === 'crew-option').length === 1 && pop.includes('ab-burst') && pop.includes('crew-option::after'), pop);
  await settled(page);
  await click(page, '#su-fresh');
  ok('choose: a fresh view after a gap plays nothing again, the check at rest', (await moving(page)).length === 0 && await page.evaluate(`document.querySelector('${tile('c2')}').dataset.confirmed === 'true'`));
  await click(page, '#su-other-pick');
  const stamped = await page.evaluate(`[...document.querySelectorAll('.crew-option[data-taken="true"]')].map(n => n.getAttribute('aria-label'))`);
  ok('choose: another seat\'s confirmation arrives: its card stamped with that seat, on this phone too', stamped.length === 3 && stamped.some(label => /taken by Player 1$/.test(label)), stamped);
  const stampMoving = await moving(page);
  ok('choose: that stamp lands once, and nothing else moves', stampMoving.length === 1 && stampMoving[0] === 'ab-taken', stampMoving);
  await settled(page);
  await click(page, '#su-fresh');
  ok('choose: a duplicate of the same facts plays nothing', (await moving(page)).length === 0);
  await page.close();

  page = await open('select.open');
  await page.evaluate(`window.__suState.answer = 'taken'`);
  await click(page, tile('c2'));
  await until(page, `document.getElementById('crew-status').textContent !== ''`, 'refused');
  ok('choose: taken first: the release\'s words, and the card stamped with the seat that took it, not checked',
    await page.evaluate(`document.getElementById('crew-status').textContent === 'Taken. Choose another character.' && /taken by Player \\d$/.test(document.querySelector('${tile('c2')}').getAttribute('aria-label')) && Boolean(document.querySelector('${tile('c2')} .ab-taken')) && document.querySelectorAll('.crew-option[data-confirmed="true"]').length === 0`));
  ok('choose: after a refusal another free card can be picked', await page.evaluate(`!document.querySelector('${tile('c3')}').disabled`));
  await page.close();

  page = await open('select.open');
  await page.evaluate(`window.__suState.answer = 'lose'`);
  await click(page, tile('c2'));
  await until(page, `!document.getElementById('crew-save').hidden`, 'retry');
  ok('choose: the answer lost: the release\'s words and Retry selection; the pick kept, its ring dashed',
    await page.evaluate(`document.getElementById('crew-status').textContent === 'Connection interrupted. Retry your selection.' && !document.getElementById('crew-save').hidden && document.querySelector('${tile('c2')}').dataset.sending === 'kept'`));
  await page.evaluate(`window.__suState.answer = 'accept'`);
  await click(page, '#crew-save');
  await until(page, `document.querySelector('${tile('c2')}').dataset.confirmed === 'true'`, 'retried');
  ok('choose: Retry selection sends the same pick, and it is confirmed', await page.evaluate(`document.querySelector('${tile('c2')}').dataset.confirmed === 'true' && document.getElementById('crew-save').hidden`));
  await page.close();

  page = await open('select.open');
  await page.evaluate(`window.__suState.answer = 'slow'`);
  await click(page, tile('c2'));
  await click(page, '#su-other-pick');
  await click(page, '#su-expire');
  ok('choose: the timer\'s end settles every card at once and holds them', (await moving(page)).length === 0 && await page.evaluate(`[...document.querySelectorAll('.crew-option')].every(n => n.disabled)`));
  ok('choose: the timer says so in the release\'s words', await page.evaluate(`document.getElementById('setup-countdown').getAttribute('aria-label') === 'Selection time has ended. Waiting for the server…'`));
  await page.close();

  page = await open('select.open', 'motion=reduced');
  await click(page, tile('c2'));
  await until(page, `document.querySelector('${tile('c2')}').dataset.confirmed === 'true'`, 'confirmed reduced');
  const reducedPop = await page.evaluate(`document.getElementById('su-app').getAnimations({ subtree: true }).map(a => ({ what: (a.effect.target.className) + (a.effect.pseudoElement || ''), props: Object.keys(a.effect.getKeyframes()[0]).filter(k => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)) }))`);
  ok('choose: reduced motion: no pop and no burst, the check with the 80 ms fade only', reducedPop.length === 1 && reducedPop[0].what === 'crew-option::after' && js(reducedPop[0].props) === js(['opacity']), reducedPop);
  await page.close();

  // ---------- the role card ----------
  page = await open('select.confirmed');
  await click(page, '#su-deal');
  const dealt = await moving(page);
  ok('deal: the reading stage: the card comes up face down, once', js(dealt) === js(['phone-role-surface']), dealt);
  ok('deal: face down, nothing of a role is in the page', js(await roleInPage(page)) === js({ words: [], hooks: 0 }));
  ok('deal: the release\'s words: Tap to reveal, Reveal my role; Ready not offered before the card is seen',
    await page.evaluate(`document.querySelector('.phone-role-surface .phone-role-back').textContent === 'Tap to reveal' && document.getElementById('setup-role-toggle').getAttribute('aria-label') === 'Reveal my role' && document.getElementById('setup-role-ready').hidden`));
  await settled(page);
  await click(page, '#setup-role-toggle');
  const turn = (await moving(page)).sort();
  ok('reveal: the reviewed turn: the back turns away, the face turns in, the device is put into the hand and its colour comes on',
    js(turn) === js(['ms-role-card ms-role-card--full', 'ms-role-card__art::after', 'ms-role-card__art::after', 'phone-role-back']), turn);
  ok('reveal: turned up, the card says its role and side, its device in the seat\'s own panel',
    await page.evaluate(`document.querySelector('#setup-role-card .ms-role-card__name')?.textContent === 'Insider' && document.querySelector('#setup-role-card .ms-role-card__team')?.textContent === 'Blue team' && document.querySelectorAll('#su-app [data-device]').length === 1 && Boolean(document.querySelector('#setup-role-card [data-device="insider"]'))`));
  ok('reveal: Hide my role, expanded; Ready offered once seen', await page.evaluate(`document.getElementById('setup-role-toggle').getAttribute('aria-label') === 'Hide my role' && document.getElementById('setup-role-toggle').getAttribute('aria-expanded') === 'true' && !document.getElementById('setup-role-ready').hidden`));
  await settled(page);
  await sleep(60);
  ok('reveal: the turn over, the back is put away', await page.evaluate(`document.querySelector('.phone-role-surface .phone-role-back').hidden`));
  await click(page, '#setup-role-toggle');
  ok('hide: at once: face down, nothing moving, nothing of a role in the page', (await moving(page)).length === 0 && js(await roleInPage(page)) === js({ words: [], hooks: 0 })
    && await page.evaluate(`!document.querySelector('.phone-role-surface .phone-role-back').hidden`));
  await click(page, '#setup-role-toggle');
  await click(page, '#setup-role-toggle');
  ok('hide mid-turn: the turn ends at once, face down, nothing of a role left', (await moving(page)).length === 0 && js(await roleInPage(page)) === js({ words: [], hooks: 0 })
    && await page.evaluate(`!document.querySelector('.phone-role-surface .phone-role-back').hidden && !document.querySelector('#setup-role-card').firstChild`));
  await click(page, '#setup-role-toggle');
  await page.evaluate(`(() => { const box = document.getElementById('su-reduced'); box.checked = true; box.dispatchEvent(new Event('change')); return true; })()`);
  ok('reduced switched on mid-turn: the turn finishes at once, face up', (await moving(page)).length === 0 && await page.evaluate(`Boolean(document.querySelector('#setup-role-card .ms-role-card'))`));
  await page.evaluate(`(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); return true; })()`);
  ok('background: the card is hidden at once, nothing of a role left', js(await roleInPage(page)) === js({ words: [], hooks: 0 }));
  await page.evaluate(`(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); return true; })()`);
  ok('background: back again, it stays face down until the player turns it up', js(await roleInPage(page)) === js({ words: [], hooks: 0 }));
  await page.close();

  page = await open('role.back', 'motion=reduced');
  await click(page, '#setup-role-toggle');
  const reducedTurn = await page.evaluate(`document.getElementById('su-app').getAnimations({ subtree: true }).map(a => Object.keys(a.effect.getKeyframes()[0]).filter(k => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)).join())`);
  ok('reduced: turned up, the face at once with the 80 ms fade: nothing rises, turns or is put anywhere', js(reducedTurn) === js(['opacity']) && await page.evaluate(`document.querySelector('.phone-role-surface .phone-role-back').hidden`), reducedTurn);
  await page.close();

  // The same back for every role: the Insider's and the Supplier's, face down, are the same element and picture.
  const backOf = async scenario => { const p = await open(scenario); const value = await p.evaluate(`(() => { const b = document.querySelector('.phone-role-surface .phone-role-back'); return [b.outerHTML, getComputedStyle(b).backgroundImage]; })()`); await p.close(); return value; };
  const [insiderBack, supplierBack] = [await backOf('role.back'), await backOf('role.assigned')];
  ok('back: the same back for every role: the Insider\'s and the Supplier\'s are the same markup and the same picture', js(insiderBack) === js(supplierBack) && insiderBack[1].includes('url('));

  page = await open('role.seen');
  await page.evaluate(`window.__suState.answer = 'slow'`);
  await click(page, '#setup-role-ready');
  ok('ready: pressed, the card is put away face down at once; Confirming…', js(await roleInPage(page)) === js({ words: [], hooks: 0 })
    && await page.evaluate(`document.getElementById('setup-role-ready').textContent === 'Confirming…' && document.getElementById('setup-role-ready').disabled`));
  await until(page, `!document.getElementById('setup-ready-waiting').hidden`, 'ready');
  const readyMoving = await moving(page);
  ok('ready: accepted: the card put away, READY lands once; nothing of a role in the page', js(readyMoving) === js(['ab-ready-stamp']) && js(await roleInPage(page)) === js({ words: [], hooks: 0 }), readyMoving);
  ok('ready: focus on the note, which says it in the release\'s words', await page.evaluate(`document.activeElement?.id === 'setup-ready-waiting' && document.activeElement.getAttribute('aria-label') === 'Ready. Waiting for the timer and other players.'`));
  await settled(page);
  await click(page, '#su-fresh');
  ok('ready: a fresh view plays nothing again', (await moving(page)).length === 0);
  await page.close();

  page = await open('role.seen');
  await page.evaluate(`window.__suState.answer = 'lose'`);
  await click(page, '#setup-role-ready');
  await until(page, `document.getElementById('setup-role-ready').textContent === 'Retry Ready'`, 'retry ready');
  ok('ready: the answer lost: Retry Ready, and the release\'s words', await page.evaluate(`document.getElementById('setup-role-status').textContent === 'Your Ready answer is uncertain. Send the same request again.'`));
  await page.evaluate(`window.__suState.answer = 'taken'`);
  await click(page, '#setup-role-ready');
  await until(page, `document.getElementById('setup-role-status').textContent === 'Ready not confirmed. Try again.'`, 'not confirmed');
  ok('ready: refused: the release\'s words, shown', await page.evaluate(`document.getElementById('setup-role-status').className === 'phone-role-error'`));
  ok('no page error', page.problems().length === 0, page.problems());
  await page.close();
} catch (error) {
  results.push(`FAIL  the flows stopped: ${error.message}`);
} finally {
  console.log(results.join('\n'));
  const failed = results.filter(line => line.startsWith('FAIL')).length;
  console.log(`Ability-art flows: ${results.length - failed} passed, ${failed} failed`);
  if (failed || results.length === 0) process.exitCode = 1;
  browser.close(); await launched.close(); await server.close();
}
