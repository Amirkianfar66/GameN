// mothership:dev-only
//
// Clicks through the board-motion prototype (design/board-motion/, issue #87) to show that it
// works as a prototype and keeps its promises: every action is chosen in the tray and played
// on the board; players are picked by tapping their characters; selection, progress,
// confirmation and the receipt stay on the board's screen; a move is a room tag, Pass the
// middle of navigation; the other screens never see a private mark; replays and reconnects
// play nothing; reduced motion keeps the facts and drops the travel; a cue never takes a tap
// or changes the state. It tests the prototype, not the game:
//   node design/tools/board-motion-flows.mjs       (needs a Chromium-based browser)
//   npm run flows:board-motion --workspace @mothership/design-tokens

import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { startStaticServer } from './lib/static-server.mjs';

const server = await startStaticServer({ port: 0 });
const launched = await launchBrowser({});
const browser = await connect(launched.endpoint);
const results = [];
const ok = (name, cond, extra = '') => results.push(`${cond ? 'ok  ' : 'FAIL'}  ${name}${!cond && extra !== '' ? ` — ${typeof extra === 'string' ? extra : JSON.stringify(extra)}` : ''}`);

async function open(scenario, extra = '') {
  const page = await openPage(browser, { width: 1440, height: 1000 });
  await page.goto(`${server.origin}/board-motion/?scenario=${scenario}${extra ? `&${extra}` : ''}`, 'window.__designReady === true');
  await sleep(150);
  return page;
}
const js = value => JSON.stringify(value);
const click = (page, selector) => page.evaluate(`(() => { const n = document.querySelector(${js(selector)}); if (!n) return false; n.click(); return true; })()`);
const flow = page => page.evaluate('window.__bmState.flow');
const stripLine = page => page.evaluate(`document.querySelector('#bm-app #bm-strip-line')?.textContent ?? null`);
const stamp = page => page.evaluate(`document.querySelector('#bm-app .bm-stamp')?.textContent ?? null`);
const seatsWith = (page, scope, attr, value) => page.evaluate(`[...document.querySelectorAll(${js(`${scope} .bm-piece[${attr}="${value}"]`)})].map(n => Number(n.dataset.seat)).sort((a, b) => a - b)`);
const OWN = '#bm-app .bm-board';
const OBS = '[data-observer] .bm-board';
const roomOf = (page, scope, seat) => page.evaluate(`document.querySelector(${js(`${scope} .bm-piece[data-seat="${seat}"]`)})?.closest('.bm-room')?.dataset.room ?? null`);
/** Anything private on the other screens' board: a cue hook, a press area, a pick, a tentative place, a stamp, a role. */
const observerPrivate = page => page.evaluate(`(() => {
  const board = document.querySelector('[data-observer] .bm-board');
  const marks = [...board.querySelectorAll('[data-target], .bm-piece__target, .bm-piece__pick, .bm-ghost, .bm-stamp, .bm-private, [data-device], [data-team]')].map(n => n.className || n.tagName);
  if (/\\b(Officer|Insider|Cracker|Disabler|Supplier|Undercover|Hacker)\\b/.test(board.textContent)) marks.push('a role name');
  return marks;
})()`);
const samePlaces = page => page.evaluate(`(() => {
  const at = scope => Object.fromEntries([...document.querySelectorAll(scope + ' .bm-piece')].map(n => [n.dataset.seat, n.closest('.bm-room').dataset.room + '/' + n.dataset.station]));
  return JSON.stringify(at('#bm-app .bm-board')) === JSON.stringify(at('[data-observer] .bm-board'));
})()`);
const notice = page => page.evaluate(`document.querySelector('#bm-app .bm-notice')?.textContent ?? null`);
const cues = page => page.evaluate('window.__bmCues.map(c => c.board + ":" + c.cue + ":" + (c.seat ?? "") + ":" + (c.variant ?? ""))');
const hide = page => page.evaluate(`(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); })()`);
/** A real key press, as the browser's input pipeline delivers it to the focused element. */
async function key(page, name, code = name, keyCode = 0, text = undefined) {
  await page.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, ...(text ? { text, unmodifiedText: text } : {}) });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
  await sleep(60);
}

try {
  // ---------- A Shot, from the tray to the receipt, and what everyone else sees ----------
  let page = await open('board.idle');
  ok('nav: Pass is the middle of five', await page.evaluate(`[...document.querySelectorAll('#bm-app .bm-nav > *')].indexOf(document.getElementById('bm-pass')) === 2`));
  ok('nav: Pass is available on the viewer\'s own turn', await page.evaluate(`document.getElementById('bm-pass').getAttribute('aria-disabled') === 'false'`));
  await click(page, '#bm-nav-actions');
  const chips = await page.evaluate(`[...document.querySelectorAll('#bm-tray [data-act^="open:"]')].map(n => n.dataset.act)`);
  ok('tray: lists what the view opens, and Move is not in it', chips.includes('open:shot') && !chips.includes('open:move'), chips);
  ok('tray: the board stays visible above it', await page.evaluate(`(() => { const t = document.getElementById('bm-tray').getBoundingClientRect(); const b = document.querySelector('#bm-app .bm-board').getBoundingClientRect(); return t.top > b.top + b.height * 0.3; })()`));
  await click(page, '[data-act="open:shot"]');
  ok('shot: the tray closes and the strip opens on the board', (await page.evaluate(`document.getElementById('bm-tray').hidden && !document.getElementById('bm-strip').hidden`)) && (await flow(page)).step === 'choosing');
  ok('shot: exactly the offered characters are eligible', js(await seatsWith(page, OWN, 'data-target', 'eligible')) === js([1, 5]), await seatsWith(page, OWN, 'data-target', 'eligible'));
  ok('shot: each eligible character carries its own press area', js(await page.evaluate(`[...document.querySelectorAll('#bm-app [data-intent="action/choose"]')].map(n => n.dataset.value).sort()`)) === js(['seat-1', 'seat-5']));
  ok('shot: the other screens show no private mark while choosing', (await observerPrivate(page)).length === 0, await observerPrivate(page));
  await click(page, '#bm-app [data-intent="action/choose"][data-value="seat-5"]');
  ok('shot: a tap asks to confirm in the release\'s words', (await stripLine(page)) === 'Register a shot at Player 5?', await stripLine(page));
  ok('shot: the chosen character is marked selected', js(await seatsWith(page, OWN, 'data-target', 'selected')) === js([5]));
  await click(page, '#bm-app [data-act="confirm"]');
  ok('shot: Confirm sends, and says so', (await flow(page)).step === 'submitting' && (await stamp(page)) === 'Sending');
  ok('shot: still nothing private on the other screens while sending', (await observerPrivate(page)).length === 0);
  await sleep(900);
  ok('shot: the receipt is the neutral Registered stamp', (await stamp(page)) === 'Registered' && (await stripLine(page)) === 'Shot at Player 5 registered.', await stripLine(page));
  ok('shot: the receipt says it is not a result', await page.evaluate(`document.querySelector('#bm-app .bm-strip__detail').textContent.startsWith('This is not a result.')`));
  ok('shot: no private mark stays on the board after the receipt', (await page.evaluate(`document.querySelectorAll('#bm-app .bm-board [data-target], #bm-app .bm-piece__target').length`)) === 0);
  ok('shot: both boards agree where everyone stands', await samePlaces(page));
  ok('shot: no public cue was played by a private action', (await cues(page)).length === 0, await cues(page));
  await click(page, '#bm-app [data-act="dismiss"]');
  ok('shot: Done returns to the board with nothing open', (await flow(page)).step === 'idle');
  await page.close();

  // ---------- Keyboard: a focused character is picked with Enter; Escape goes back ----------
  page = await open('shot.choose');
  await page.evaluate(`document.querySelector('#bm-app [data-intent="action/choose"][data-value="seat-8"]').focus()`);
  await key(page, 'Enter', 'Enter', 13, '\r');
  ok('keyboard: Enter on a focused character picks it', (await stripLine(page)) === 'Register a shot at Player 8?', await stripLine(page));
  ok('keyboard: focus moves to the strip\'s question', await page.evaluate(`document.activeElement?.id === 'bm-strip-line'`));
  await key(page, 'Escape', 'Escape', 27);
  ok('keyboard: Escape goes back to choosing', (await flow(page)).step === 'choosing');
  ok('keyboard: every press area is a button with a name', await page.evaluate(`[...document.querySelectorAll('#bm-app .bm-piece__target')].every(n => n.tagName === 'BUTTON' && /^Select Player \\d/.test(n.getAttribute('aria-label') ?? ''))`));
  await page.close();

  // ---------- A Code attempt: four distinct characters, Take back, confirm ----------
  page = await open('code.two');
  ok('code: two picked, numbered 1 and 2 on the board', js(await page.evaluate(`[...document.querySelectorAll('#bm-app .bm-piece__pick')].map(n => n.closest('.bm-piece').dataset.seat + '=' + n.textContent).sort()`)) === js(['2=2', '6=1']));
  ok('code: a picked character offers no second press', await page.evaluate(`!document.querySelector('#bm-app [data-value="seat-6"]') && !document.querySelector('#bm-app [data-value="seat-2"]')`));
  await click(page, '#bm-app [data-value="seat-9"]');
  await click(page, '#bm-app [data-value="seat-7"]');
  ok('code: the fourth pick asks to confirm, naming all four', (await stripLine(page)) === 'Submit this Code attempt: Player 2, Player 6, Player 7, Player 9?', await stripLine(page));
  await click(page, '#bm-app [data-act="back"]');
  ok('code: Choose again takes back the last pick only', js((await flow(page)).picked) === js([6, 2, 9]), (await flow(page)).picked);
  await click(page, '#bm-app [data-act="back"]');
  ok('code: Take back removes one more', js((await flow(page)).picked) === js([6, 2]));
  await page.close();

  // ---------- Supply, Scan, ballots: the inline answers ----------
  page = await open('supply.first');
  await click(page, '#bm-app [data-value="seat-1"]');
  ok('supply: the first pick fills one of two', await page.evaluate(`[...document.querySelectorAll('#bm-app .bm-strip__progress [data-done="true"]')].length === 1`));
  await click(page, '#bm-app [data-value="seat-8"]');
  ok('supply: two distinct, then confirm', (await stripLine(page)) === 'Register a weapon each for Player 1 and Player 8?', await stripLine(page));
  await page.close();
  page = await open('scan.choose');
  await click(page, '#bm-app [data-value="seat-8"]');
  ok('scan: the factions are answers in the strip', js(await page.evaluate(`[...document.querySelectorAll('#bm-app [data-act^="answer:"]')].map(n => n.textContent)`)) === js(['Blue', 'Red', 'Alien']));
  await click(page, '#bm-app [data-act="answer:Red"]');
  ok('scan: target and guess confirmed together', (await stripLine(page)) === 'Scan Player 8, guessing Red?', await stripLine(page));
  await page.close();
  page = await open('vote.election');
  ok('vote: all nine candidates are tappable on the board', (await seatsWith(page, OWN, 'data-target', 'eligible')).length === 9);
  await click(page, '#bm-app [data-act="answer:none"]');
  ok('vote: Abstain is an answer in the strip', (await stripLine(page)) === 'Abstain from this vote?', await stripLine(page));
  await page.close();
  page = await open('release.vote');
  ok('release vote: the subject is marked on both boards (public)', js(await seatsWith(page, OWN, 'data-subject', '')) === js([9]) && js(await seatsWith(page, OBS, 'data-subject', '')) === js([9]));
  ok('release vote: nobody is picked; Yes, No and Abstain are answers', (await page.evaluate(`document.querySelectorAll('#bm-app .bm-piece__target').length`)) === 0
    && js(await page.evaluate(`[...document.querySelectorAll('#bm-app [data-act^="answer:"]')].map(n => n.dataset.act)`)) === js(['answer:yes', 'answer:no', 'answer:none']));
  await click(page, '#bm-app [data-act="answer:yes"]');
  ok('release vote: confirm names the subject', (await stripLine(page)) === 'Vote yes to releasing Player 9?', await stripLine(page));
  await page.close();
  page = await open('release.choice');
  ok('release request: only the jailed character is eligible, in the Jail', js(await seatsWith(page, OWN, 'data-target', 'eligible')) === js([9]) && (await roomOf(page, OWN, 9)) === 'jail');
  await click(page, '#bm-app [data-value="seat-9"]');
  ok('release request: confirm in the release\'s words', (await stripLine(page)) === 'Ask for a vote on releasing Player 9 from Jail?', await stripLine(page));
  await page.close();
  page = await open('crowd.vote');
  ok('crowd: all nine in one room are eligible, each with its own press area', (await page.evaluate(`document.querySelectorAll('#bm-app .bm-piece__target').length`)) === 9);
  await page.close();

  // ---------- Moving: a room tag, a tentative place, the authoritative move ----------
  page = await open('board.idle');
  ok('move: Hospital and Jail tags are not buttons', await page.evaluate(`!document.querySelector('[data-move-room="Hospital"], [data-move-room="Jail"]')`));
  await click(page, '#bm-app [data-move-room="Command Room"]');
  ok('move: a room the view does not offer says so, and opens nothing', (await notice(page)) === 'You cannot move to that room right now.' && (await flow(page)).step === 'idle', await notice(page));
  await click(page, '#bm-app [data-move-room="Room B"]');
  ok('move: a legal tag opens the confirmation with a tentative place', (await stripLine(page)) === 'Move to Room B?' && await page.evaluate(`Boolean(document.querySelector('#bm-app .bm-room[data-room="room-b"] .bm-ghost'))`));
  ok('move: the piece itself has not moved', (await roomOf(page, OWN, 3)) === 'room-a');
  ok('move: the other screens see no tentative place', (await observerPrivate(page)).length === 0);
  await click(page, '#bm-app [data-act="confirm"]');
  await sleep(1500);
  ok('move: the piece moves with the public update, on every screen', (await roomOf(page, OWN, 3)) === 'room-b' && (await roomOf(page, OBS, 3)) === 'room-b');
  ok('move: the tentative place is gone', await page.evaluate(`!document.querySelector('#bm-app .bm-ghost')`));
  ok('move: each board played the move once', (await cues(page)).filter(c => c.includes(':cue-public-move:3:')).length === 2, await cues(page));
  await page.close();
  page = await open('shot.choose');
  await click(page, '#bm-app [data-move-room="Room B"]');
  ok('move: a tag pressed during an open action opens nothing', (await notice(page)) === 'Finish or cancel the current action first.' && (await flow(page)).kind === 'shot', await notice(page));
  await page.close();

  // ---------- Pass: the middle of navigation ----------
  page = await open('board.idle');
  await click(page, '#bm-pass');
  ok('pass: confirm on the board', (await stripLine(page)) === 'End your turn now?', await stripLine(page));
  await click(page, '#bm-app [data-act="confirm"]');
  await sleep(1700);
  ok('pass: a neutral receipt', (await stripLine(page)) === 'Turn passed.', await stripLine(page));
  ok('pass: the next phase is in the status bar, and Pass is no longer available', (await page.evaluate(`document.querySelector('#bm-app .bm-status__line').textContent !== 'Your turn' && document.getElementById('bm-pass').getAttribute('aria-disabled') === 'true'`)));
  await page.close();
  page = await open('board.other-turn');
  ok('pass: unavailable on another player\'s turn', await page.evaluate(`document.getElementById('bm-pass').getAttribute('aria-disabled') === 'true'`));
  await click(page, '#bm-pass');
  ok('pass: pressing it opens nothing', (await flow(page)).step === 'idle');
  await page.close();
  page = await open('pass.legacy');
  ok('pass: a legacy match has no Pass', await page.evaluate(`!document.getElementById('bm-pass')`));
  await page.close();
  page = await open('hack.phase');
  ok('hack: the Hack phase has its own full minute', await page.evaluate(`document.querySelector('#bm-app .bm-timer').textContent === '1:00'`));
  await page.close();

  // ---------- Public facts: the same on every screen; replays, reconnects and reduced motion ----------
  page = await open('board.idle');
  const before = await page.evaluate('JSON.stringify(window.__bmState)');
  await click(page, '[data-event="move"]');
  await sleep(120);
  ok('public move: carried in the cue layer on both boards', (await page.evaluate(`document.querySelectorAll('#bm-app .bm-fx .bm-flyer').length === 1 && document.querySelectorAll('[data-observer] .bm-fx .bm-flyer').length === 1`)));
  ok('public move: the cue layer takes no tap', await page.evaluate(`(() => { const f = document.querySelector('#bm-app .bm-flyer'); if (!f) return false; const r = f.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return hit && !hit.closest('.bm-fx') && getComputedStyle(document.querySelector('#bm-app .bm-fx')).pointerEvents === 'none'; })()`));
  const moved = await cues(page);
  await click(page, '[data-event="replay"]');
  await sleep(100);
  ok('replay: the same snapshot again plays nothing', (await cues(page)).length === moved.length, await cues(page));
  await sleep(1100);
  ok('public move: the flight ends, and changed nothing', (await page.evaluate(`document.querySelectorAll('.bm-flyer').length`)) === 0 && (await page.evaluate('JSON.stringify(window.__bmState)')) !== before
    && (await page.evaluate('window.__bmState.revision')) === JSON.parse(before).revision + 1);
  const settled = await page.evaluate('JSON.stringify(window.__bmState)');
  await sleep(400);
  ok('public move: nothing is advanced when the animation ends', (await page.evaluate('JSON.stringify(window.__bmState)')) === settled);
  await click(page, '[data-event="move-back"]');
  await sleep(50);
  await click(page, '[data-event="move"]');
  await sleep(80);
  ok('latest state wins: a newer move withdraws the flight in progress', (await page.evaluate(`document.querySelectorAll('#bm-app .bm-flyer').length`)) === 1 && (await roomOf(page, OWN, 2)) === 'room-a');
  const beforeReconnect = (await cues(page)).length;
  await click(page, '[data-event="reconnect"]');
  await sleep(60);
  ok('reconnect: a fresh snapshot plays nothing and stops what was in flight', (await cues(page)).length === beforeReconnect && (await page.evaluate(`document.querySelectorAll('.bm-flyer').length`)) === 0);
  await click(page, '[data-event="injure"]');
  await sleep(60);
  ok('health: drawn on both boards, without a cause', (await page.evaluate(`document.querySelector('#bm-app .bm-piece[data-seat="5"]').dataset.health === 'Injured' && document.querySelector('[data-observer] .bm-piece[data-seat="5"]').dataset.health === 'Injured'`))
    && !(await page.evaluate(`/\\b(BANG|shot|shooter|attack|weapon)\\b/i.test(document.querySelector('[data-observer]').textContent)`)));
  await page.close();
  page = await open('board.idle', 'motion=reduced');
  await click(page, '[data-event="move"]');
  await sleep(60);
  ok('reduced motion: no flight, the same fact', (await page.evaluate(`document.querySelectorAll('.bm-flyer, .bm-trail').length`)) === 0 && (await roomOf(page, OWN, 2)) === 'room-a' && (await roomOf(page, OBS, 2)) === 'room-a');
  ok('reduced motion: the cue is the settled variant', (await cues(page)).some(c => c === 'own:cue-public-move:2:reduced'), await cues(page));
  await page.close();

  // ---------- Private surfaces close; the card exists only while open ----------
  page = await open('shot.choose');
  await hide(page);
  ok('background: an unsent choice is dropped and said so', (await flow(page)).step === 'idle' && (await notice(page)) === 'Your choice was not sent.', await notice(page));
  ok('background: no private mark stays on the board', (await page.evaluate(`document.querySelectorAll('#bm-app [data-target], #bm-app .bm-piece__target').length`)) === 0);
  await page.close();
  page = await open('robust.stale');
  await click(page, '#bm-nav-actions');
  ok('stale view: actions paused, in the release\'s words', await page.evaluate(`document.getElementById('bm-tray').textContent.includes('Actions are paused until the connection is restored.')`));
  await page.close();
  page = await open('board.idle');
  ok('card: nothing private in the document while it is closed', await page.evaluate(`!document.querySelector('.bm-private, [data-device], [data-team]')`));
  await click(page, '#bm-nav-card');
  ok('card: the role and its device only inside the open card', await page.evaluate(`Boolean(document.querySelector('#bm-card .bm-private[data-device]')) && !document.querySelector('[data-observer] .bm-private')`));
  await click(page, '#bm-nav-board');
  ok('card: closed again, gone from the document', await page.evaluate(`!document.querySelector('.bm-private, [data-device]')`));
  const t0 = await page.evaluate(`document.querySelector('#bm-app .bm-timer').textContent`);
  await sleep(2200);
  ok('timer: counts down locally and changes nothing else', (await page.evaluate(`document.querySelector('#bm-app .bm-timer').textContent`)) !== t0 && (await flow(page)).step === 'idle');
  ok('no page error in any of it', page.problems().length === 0, page.problems());
  await page.close();
} catch (error) {
  results.push(`FAIL  the flows stopped: ${error.message}`);
} finally {
  console.log(results.join('\n'));
  const failed = results.filter(line => line.startsWith('FAIL')).length;
  console.log(`Board-motion flows: ${results.length - failed} passed, ${failed} failed`);
  if (failed || results.length === 0) process.exitCode = 1;
  browser.close(); await launched.close(); await server.close();
}
