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
const show = page => page.evaluate(`(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); })()`);
const privateDOM = page => page.evaluate(`(() => {
  const app = document.getElementById('bm-app');
  return [...app.querySelectorAll('[data-target], .bm-piece__target, .bm-piece__pick, .bm-ghost, .bm-stamp, .bm-private, .bm-know, [data-device], [data-team], #bm-strip[data-step], #bm-live-private > *')].map(n => n.className || n.id);
})()`);
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
  ok('code: two picked, checked alike on the board, never numbered', js(await page.evaluate(`[...document.querySelectorAll('#bm-app .bm-piece__pick')].map(n => n.closest('.bm-piece').dataset.seat + '=' + n.textContent).sort()`)) === js(['2=✓', '6=✓']));
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
  ok('supply: the first pick fills one of two tags', await page.evaluate(`[...document.querySelectorAll('#bm-app .ab-tags .ab-tag[data-filled="true"]')].length === 1`));
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
  ok('vote: only the seven Healthy, unjailed candidates are tappable', js(await seatsWith(page, OWN, 'data-target', 'eligible')) === js([1, 2, 3, 4, 5, 7, 8]));
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
  // The owner's capacity of five (11 October 2026): a full room says so on every screen, and is never a destination.
  page = await open('move.full');
  ok('capacity: a full room says FULL on its tag, on both boards, and the other room does not', await page.evaluate(`[...document.querySelectorAll('#bm-app .bm-board, [data-observer] .bm-board')].every(b => { const full = b.querySelector('.bm-room[data-room="room-a"] .bm-tag__full'); const other = b.querySelector('.bm-room[data-room="room-b"] .bm-tag__full'); return full && getComputedStyle(full).display !== 'none' && other && getComputedStyle(other).display === 'none'; })`));
  ok('capacity: the full room\'s tag is named full', await page.evaluate(`document.querySelector('#bm-app [data-move-room="Room A"]').getAttribute('aria-label') === 'Move to Room A, full' && document.querySelector('#bm-app [data-move-room="Room B"]').getAttribute('aria-label') === 'Move to Room B'`));
  await click(page, '#bm-app [data-move-room="Room A"]');
  ok('capacity: pressing a full room says the release\'s words and opens nothing', (await notice(page)) === 'You cannot move to that room right now.' && (await flow(page)).step === 'idle', await notice(page));
  await page.close();
  page = await open('board.crowded-hospital');
  ok('capacity: a full Hospital says FULL on both boards, and its heading reads full', await page.evaluate(`[...document.querySelectorAll('#bm-app .bm-board, [data-observer] .bm-board')].every(b => { const tag = b.querySelector('.bm-room[data-room="hospital"] .bm-tag'); const chip = tag?.querySelector('.bm-tag__full'); return chip && getComputedStyle(chip).display !== 'none' && tag.querySelector('.bm-tag__fullvh').textContent === ', full' && b.querySelector('.bm-room[data-room="jail"] .bm-tag__fullvh').textContent === ''; })`));
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
  for (const reason of ['background', 'stale', 'expired', 'disposed']) {
    for (const scenario of ['shot.confirm', 'shot.pending', 'shot.unknown', 'move.confirm', 'move.pending', 'shot.checking']) {
      page = await open(scenario === 'shot.checking' ? 'shot.unknown' : scenario, 'freeze=1');
      if (scenario === 'shot.checking') await click(page, '#bm-app [data-act="check"]');
      const before = await page.evaluate('structuredClone(window.__bmState)');
      if (reason === 'background') await hide(page);
      else if (reason === 'disposed') await page.evaluate(`window.dispatchEvent(new Event('pagehide'))`);
      else await click(page, reason === 'stale' ? '#bm-stale' : '#bm-expire');
      const after = await page.evaluate('window.__bmState');
      ok(`${reason}/${scenario}: all private DOM is removed`, (await privateDOM(page)).length === 0, await privateDOM(page));
      ok(`${reason}/${scenario}: unsent choice drops; sent/recovery flow and request counts survive`,
        (before.flow.step === 'confirming' ? after.flow.step === 'idle' : js(after.flow) === js(before.flow)) && js(after.requests) === js(before.requests), after);
      if (reason === 'background') await show(page);
      if (reason === 'stale') await click(page, '#bm-fresh');
      ok(`${reason}/${scenario}: foreground/fresh/disposed redraw never reopens private content`, (await privateDOM(page)).length === 0 && (await observerPrivate(page)).length === 0);
      ok(`${reason}/${scenario}: no browser errors`, page.problems().length === 0, page.problems());
      await page.close();
    }
  }

  // Real prototype send -> lost answer -> explicit lookup, including a Move awaiting its
  // public update. Reopening cannot itself submit, check or replay a receipt/card animation.
  for (const kind of ['shot', 'move']) {
    page = await open(kind === 'shot' ? 'shot.confirm' : 'move.confirm', 'answer=lose&freeze=1');
    await click(page, '#bm-app [data-act="confirm"]');
    await hide(page);
    await sleep(800);
    ok(`${kind}/lost answer: recovery is retained while hidden`, (await flow(page)).step === 'unknown' && (await privateDOM(page)).length === 0);
    await show(page);
    const requests = await page.evaluate('window.__bmState.requests');
    await click(page, '#bm-nav-actions');
    ok(`${kind}/reopen: Unknown with Check again, no automatic request`, (await flow(page)).step === 'unknown'
      && Boolean(await page.evaluate(`document.querySelector('#bm-app [data-act="check"]')`)) && js(await page.evaluate('window.__bmState.requests')) === js(requests));
    await click(page, '#bm-app [data-act="check"]');
    ok(`${kind}/lookup: Checking is an explicit receipt lookup`, (await flow(page)).step === 'checking'
      && (await page.evaluate('window.__bmState.requests.lookups')) === requests.lookups + 1);
    await hide(page);
    await sleep(750);
    ok(`${kind}/lookup answer: accepted state stays internal while hidden`, (await flow(page)).step === 'accepted' && (await privateDOM(page)).length === 0);
    if (kind === 'move') {
      await show(page); await click(page, '#bm-nav-actions');
      ok('accepted Move awaiting public view: stale removes the pending ghost and keeps the receipt', (await page.evaluate(`Boolean(document.querySelector('#bm-app .bm-ghost'))`)));
      await click(page, '#bm-stale');
      ok('accepted Move awaiting public view: all private content removed', (await flow(page)).step === 'accepted' && (await privateDOM(page)).length === 0);
      await sleep(550); await click(page, '#bm-fresh');
    } else await show(page);
    const settledRequests = await page.evaluate('window.__bmState.requests');
    const settledCues = (await cues(page)).length;
    await click(page, '#bm-nav-actions');
    ok(`${kind}/recovered reopen: same accepted receipt and no extra send/lookup/cue`, (await flow(page)).step === 'accepted'
      && js(await page.evaluate('window.__bmState.requests')) === js(settledRequests) && (await cues(page)).length === settledCues);
    ok(`${kind}/recovered reopen: no strip/card animation replay`, await page.evaluate(`document.getElementById('bm-app').getAnimations({ subtree: true }).filter(a => a.effect?.target?.closest('.bm-strip, .bm-sheet, .bm-tray')).length === 0`));
    await page.close();
  }

  page = await open('shot.confirm', 'answer=slow&freeze=1');
  await click(page, '#bm-app [data-act="confirm"]');
  await page.evaluate(`window.dispatchEvent(new Event('pagehide'))`);
  await sleep(2700);
  ok('dispose: a late answer cannot redraw private content or settle the disposed controller', (await flow(page)).step === 'submitting' && (await privateDOM(page)).length === 0);
  await page.close();

  page = await open('board.idle');
  await click(page, '#bm-nav-card');
  await hide(page); await show(page);
  ok('card/background: role, knowledge and device stay absent after foreground', (await privateDOM(page)).length === 0);
  await click(page, '#bm-nav-card');
  ok('card/explicit reopen: authorized card restored without replay', Boolean(await page.evaluate(`document.querySelector('#bm-card .bm-private')`))
    && await page.evaluate(`document.getElementById('bm-card').getAnimations({ subtree: true }).length === 0`));
  await click(page, '#bm-stale');
  ok('card/stale: role and card cues removed', (await privateDOM(page)).length === 0);
  await page.close();

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

  // ---------- The Insider's file (design/abilities/): private, in seat order, inspected without new evidence ----------
  page = await open('file.insider');
  ok('file: three snapshots in seat order, not the order the view lists them in', js(await page.evaluate(`[...document.querySelectorAll('#bm-card .ab-photo')].map(n => Number(n.dataset.seat))`)) === js([2, 5, 8]));
  ok('file: the three role names one picture, below the three snapshots', await page.evaluate(`(() => {
    const groups = document.querySelectorAll('#bm-card .ab-roles[role="img"]');
    const lowest = Math.max(...[...document.querySelectorAll('#bm-card .ab-photo')].map(n => n.getBoundingClientRect().bottom));
    return groups.length === 1 && groups[0].querySelectorAll('.ab-roles__name').length === 3 && groups[0].querySelector('.ab-roles__slip').getBoundingClientRect().top >= lowest - 1;
  })()`));
  ok('file: private content of the own open card, nowhere else', await page.evaluate(`Boolean(document.querySelector('#bm-card .ab-file.bm-private')) && document.querySelectorAll('.ab-file').length === 1`) && (await observerPrivate(page)).length === 0);
  await page.evaluate(`document.querySelector('#bm-card .ab-photo[data-seat="5"]').focus()`);
  await click(page, '#bm-card .ab-photo[data-seat="5"]');
  ok('file/inspect: the pressed snapshot and its public facts, no role word, no other snapshot pressed', await page.evaluate(`(() => {
    const card = document.querySelector('#bm-card .ab-inspect');
    const pressed = [...document.querySelectorAll('#bm-card .ab-photo[aria-pressed="true"]')].map(n => n.dataset.seat);
    return pressed.join() === '5' && !card.hidden && card.textContent.includes('Room A') && !/Undercover|Alien|Cracker/.test(card.textContent);
  })()`));
  await key(page, 'Escape', 'Escape', 27);
  ok('file/inspect: Escape puts the snapshot back, keeps the card open and returns focus to it', await page.evaluate(`document.querySelector('#bm-card .ab-inspect').hidden && document.querySelectorAll('#bm-card .ab-photo[aria-pressed="true"]').length === 0 && document.activeElement?.dataset?.seat === '5' && document.getElementById('bm-card').hidden === false`));
  await hide(page); await show(page);
  ok('file/background: gone from the document, and the foreground does not reopen it', (await privateDOM(page)).length === 0 && !(await page.evaluate(`Boolean(document.querySelector('.ab-file'))`)));
  await click(page, '#bm-nav-card');
  ok('file/explicit reopen: back at rest, not assembled again', await page.evaluate(`Boolean(document.querySelector('#bm-card .ab-file')) && document.getElementById('bm-card').getAnimations({ subtree: true }).length === 0`));
  await click(page, '#bm-stale');
  ok('file/stale: gone with the card', (await privateDOM(page)).length === 0 && !(await page.evaluate(`Boolean(document.querySelector('.ab-file'))`)));
  await click(page, '#bm-nav-card');
  ok('file/stale: Card shows the closed folder and nothing private', await page.evaluate(`Boolean(document.querySelector('#bm-card .ab-folder')) && !document.querySelector('.ab-file, .bm-private')`));
  ok('file: no page error', page.problems().length === 0, page.problems());
  await page.close();

  // ---------- Slice 2: the Hacker's file, a Scan printed once, the Alien's Code, the Code card ----------
  page = await open('file.hacker');
  ok('hacker file: one snapshot, the known Undercover, labelled on its frame', await page.evaluate(`(() => {
    const photos = [...document.querySelectorAll('#bm-card .ab-file[data-file="hacker"] .ab-photo')];
    return photos.length === 1 && photos[0].dataset.seat === '4' && photos[0].querySelector('.ab-photo__tape')?.textContent === 'Undercover';
  })()`));
  ok('hacker file: the Scans in the view\'s order; a wrong guess shows nothing of the Code', await page.evaluate(`(() => {
    const items = [...document.querySelectorAll('#bm-card .ab-printout')];
    return items.map(n => n.dataset.scan).join() === '1:8,2:5' && !items[0].querySelector('.ab-code-mark') && !/code/i.test(items[0].textContent) && items[1].querySelectorAll('.ab-code-mark').length === 1;
  })()`));
  ok('hacker file: private content of the own open card, nowhere else', await page.evaluate(`Boolean(document.querySelector('#bm-card .ab-file.bm-private')) && document.querySelectorAll('.ab-file').length === 1`) && (await observerPrivate(page)).length === 0);
  ok('hacker file: no page error', page.problems().length === 0, page.problems());
  await page.close();

  page = await open('scan.fresh', 'scan=in');
  await click(page, '#bm-nav-card');
  await sleep(1300);
  await click(page, '#bm-card [data-act="close"]');
  await click(page, '#bm-nav-actions');
  await click(page, '#bm-open-scan');
  await click(page, '#bm-target-seat-8');
  await click(page, '#bm-app [data-act="answer:Red"]');
  await click(page, '#bm-app [data-act="confirm"]');
  await sleep(1000);
  ok('scan: the receipt says registered, and nothing of the result', (await flow(page)).step === 'accepted' && !/in the code|wrong|right/i.test(await page.evaluate(`document.getElementById('bm-strip').textContent`)));
  await click(page, '#bm-nav-card');
  ok('scan: the new result is printed once in the Hacker\'s file', await page.evaluate(`(() => {
    const item = document.querySelector('#bm-card .ab-printout[data-scan="2:8"]');
    return Boolean(item) && item.dataset.result === 'in-code' && item.getAnimations().length > 0;
  })()`));
  await sleep(800);
  await click(page, '#bm-card [data-act="close"]');
  await click(page, '#bm-nav-card');
  ok('scan: opened again, the result is at rest, not printed again', await page.evaluate(`(() => {
    const item = document.querySelector('#bm-card .ab-printout[data-scan="2:8"]');
    return Boolean(item) && item.getAnimations({ subtree: true }).length === 0;
  })()`));
  ok('scan: no page error', page.problems().length === 0, page.problems());
  await page.close();

  page = await open('file.alien');
  ok('alien file: the Code\'s four in seat order, the own one marked, an unordered list', await page.evaluate(`(() => {
    const seats = [...document.querySelectorAll('#bm-card .ab-code-set .ab-photo')].map(n => n.dataset.seat).join();
    const own = [...document.querySelectorAll('#bm-card .ab-photo__own')].map(n => n.closest('.ab-photo').dataset.seat).join();
    return seats === '1,3,5,9' && own === '3' && document.querySelector('#bm-card .ab-code-set').tagName === 'UL';
  })()`));
  ok('alien file: no page error', page.problems().length === 0, page.problems());
  await page.close();

  page = await open('code.four');
  ok('code: the card filled in seat order, every pick on the board checked alike', await page.evaluate(`(() => {
    const filled = [...document.querySelectorAll('#bm-strip .ab-code-card .ab-chip')].map(n => n.dataset.seat).join();
    const marks = [...document.querySelectorAll('#bm-app [data-board="own"] .bm-piece__pick')].map(n => n.textContent);
    return filled === '2,6,7,9' && marks.length === 4 && marks.every(mark => mark === '✓');
  })()`));
  await page.close();

  // ---------- Slice 3: a Rescue registered is not a recovery; the two Disablers alike; Supply's tags and slips ----------
  const vialsFull = page => page.evaluate(`[...document.querySelectorAll('#bm-app .ab-vials .ab-vial[data-full="true"]')].length`);
  const beats = (page, scope) => page.evaluate(`document.querySelector(${js(scope)})?.getAnimations({ subtree: true }).filter(a => a.id === 'ab-beat').map(a => a.effect.target.className) ?? []`);
  page = await open('rescue.choose');
  ok('rescue: two vials while choosing; a player in the Hospital is reachable from Room A', (await vialsFull(page)) === 2 && js(await seatsWith(page, OWN, 'data-target', 'eligible')) === js([6]));
  await click(page, '#bm-app [data-value="seat-6"]');
  ok('rescue: the target in the medical cross beside the question', await page.evaluate(`Boolean(document.querySelector('#bm-strip .ab-target[data-mark="cross"] .ab-chip[data-seat="6"]'))`) && (await stripLine(page)) === 'Register a Rescue of Player 6?');
  await page.close();
  // Held 100 ms into the receipt: the one beat playing is the vial that emptied as the count fell.
  page = await open('rescue.confirm', 'play=register&t=100');
  ok('rescue: on the receipt one vial empties, once, as the count falls', (await vialsFull(page)) === 1 && js(await beats(page, '#bm-strip')) === js(['ab-vial']), await beats(page, '#bm-strip'));
  await page.close();
  page = await open('rescue.confirm');
  await click(page, '#bm-app [data-act="confirm"]');
  await sleep(900);
  ok('rescue: the receipt is registered and says nothing of a recovery', (await stamp(page)) === 'Registered' && !(await page.evaluate(`/\\b(heal|heals|healed|healthy|recover|recovered|saved)\\b/i.test(document.getElementById('bm-strip').textContent)`)));
  ok('rescue: the other screens show nothing of it', (await observerPrivate(page)).length === 0, await observerPrivate(page));
  const beforeRecovery = (await cues(page)).length;
  await click(page, '[data-event="recover"]');
  await sleep(80);
  const recoveryCues = (await cues(page)).slice(beforeRecovery);
  const sides = side => recoveryCues.filter(cue => cue.startsWith(side + ':')).map(cue => cue.slice(side.length)).sort();
  ok('rescue/recovery: a public health change, the same cue on both boards, naming no one', await page.evaluate(`document.querySelector('#bm-app .bm-piece[data-seat="6"]').dataset.health === 'Healthy' && document.querySelector('[data-observer] .bm-piece[data-seat="6"]').dataset.health === 'Healthy'`)
    && recoveryCues.length > 0 && js(sides('own')) === js(sides('observer')) && !(await page.evaluate(`/\\b(rescue|rescued|cracker|vial)\\b/i.test(document.querySelector('[data-observer]').textContent)`)), recoveryCues);
  ok('rescue/recovery: nothing private plays on this phone for it', (await beats(page, '#bm-app')).length === 0);
  await click(page, '#bm-app [data-act="dismiss"]');
  await click(page, '#bm-nav-card');
  ok('rescue: the card says the Rescues left in the release\'s words, with its vials', await page.evaluate(`document.querySelector('#bm-card .ab-kit__words')?.textContent === 'Rescues you have left: 1.' && document.querySelectorAll('#bm-card .ab-kit .ab-vial[data-full="true"]').length === 1`));
  ok('rescue: no page error', page.problems().length === 0, page.problems());
  await page.close();

  // One page at a time: a second page would send the first to the background, which hides its private strip.
  const stripOf = p => p.evaluate(`document.getElementById('bm-strip').outerHTML`);
  const disabler = async scenario => {
    const p = await open(scenario);
    const confirming = await stripOf(p);
    const marked = await p.evaluate(`Boolean(document.querySelector('#bm-strip .ab-target[data-mark="spark"] .ab-chip[data-seat="5"]')) && document.querySelector('#bm-strip .ab-cell').dataset.spent === 'false'`);
    await click(p, '#bm-app [data-act="confirm"]');
    await sleep(700);
    const receipt = await stripOf(p);
    const spent = await p.evaluate(`document.querySelector('#bm-strip .ab-cell').dataset.spent === 'true' && document.querySelector('#bm-strip .bm-strip__detail').textContent.includes('This is not a result.')`) && (await stamp(p)) === 'Registered';
    const quiet = (await observerPrivate(p)).length === 0 && (await cues(p)).length === 0;
    await p.close();
    return { confirming, marked, receipt, spent, quiet };
  };
  const blue = await disabler('disable.confirm');
  const red = await disabler('disable.red-confirm');
  ok('disable: the Blue and the Red Disabler see the same strip, part for part', blue.confirming === red.confirming && !/data-device|data-team/.test(red.confirming));
  ok('disable: the target in its sparks, the one charge full', blue.marked && red.marked);
  ok('disable: the receipt spends the charge and is not a result', blue.spent && red.spent);
  ok('disable: the two receipts are the same; the other screens see neither, and no public cue plays', blue.receipt === red.receipt && blue.quiet && red.quiet);

  page = await open('supply.first');
  await click(page, '#bm-app [data-value="seat-8"]');
  await click(page, '#bm-app [data-value="seat-1"]');
  ok('supply: the two tags hold the picks in seat order, whatever the picking order', js(await page.evaluate(`[...document.querySelectorAll('#bm-strip .ab-tags .ab-chip')].map(n => Number(n.dataset.seat))`)) === js([1, 8]) && (await stripLine(page)) === 'Register a weapon each for Player 1 and Player 8?');
  await click(page, '#bm-app [data-act="confirm"]');
  await sleep(700);
  ok('supply: the receipt ties the tags; registered, not delivered', await page.evaluate(`document.querySelector('#bm-strip .ab-tags').dataset.tied === 'true' && !/deliver/i.test(document.getElementById('bm-strip').textContent)`) && (await stamp(page)) === 'Registered');
  ok('supply: the other screens show nothing of it', (await observerPrivate(page)).length === 0);
  await page.close();
  // Held 100 ms in: the slip dropping into the card the first time it is shown.
  page = await open('supply.ack', 't=100');
  ok('supply/slip: the Supplier\'s own slip, in the release\'s words, its tags in seat order', await page.evaluate(`(() => {
    const slip = document.querySelector('#bm-card .ab-deliveries .ab-slip');
    return document.querySelector('#bm-card .ab-deliveries__title').textContent === 'Supply results' && slip.querySelector('.ab-slip__words').textContent === 'Your Round 3 Supply granted one weapon each to Player 1 and Player 8.'
      && [...slip.querySelectorAll('.ab-chip')].map(n => n.dataset.seat).join() === '1,8' && slip.querySelector('[data-stamp="delivered"]') !== null;
  })()`));
  ok('supply/slip: dropped in once, the first time the card shows it', js(await beats(page, '#bm-card')) === js(['ab-slip']), await beats(page, '#bm-card'));
  await click(page, '#bm-card .bm-close');
  await click(page, '#bm-nav-card');
  ok('supply/slip: opened again, at rest', (await beats(page, '#bm-card')).length === 0 && await page.evaluate(`Boolean(document.querySelector('#bm-card .ab-slip'))`));
  ok('supply/slip: private content of the own open card, nowhere else', (await observerPrivate(page)).length === 0);
  await page.close();
  page = await open('supply.received');
  ok('supply/received: a recipient\'s own slip names no Supplier, its tag addressed to the recipient', await page.evaluate(`(() => {
    const slip = document.querySelector('#bm-card .ab-slip');
    const words = slip.querySelector('.ab-slip__words').textContent;
    return words === 'You received one ordinary weapon from Supply in Round 3.' && !/Player/.test(words) && [...slip.querySelectorAll('.ab-chip')].map(n => n.dataset.seat).join() === '3';
  })()`));
  await page.close();

  // ---------- Slice 4: one shot strip for every seat that shoots; Protection the Undercover's own ----------
  const roundsIn = (p, scope) => p.evaluate(`(() => { const g = document.querySelector(${js(scope)}); return g ? { full: g.querySelectorAll('.ab-round[data-spent="false"]').length, spent: g.querySelectorAll('.ab-round[data-spent="true"]').length } : null; })()`);
  /** Any piece of the ability art on the other screens. */
  const observerArt = p => p.evaluate(`[...document.querySelectorAll('[data-observer] *')].filter(n => typeof n.className === 'string' && /\\bab-/.test(n.className)).length`);
  page = await open('shot.officer');
  ok('shot/officer: Round 1, the Officer\'s one round, the players in the same room eligible', await page.evaluate(`document.querySelector('#bm-app .bm-status__round').textContent`) === 'Round 1'
    && js(await roundsIn(page, '#bm-strip .ab-rounds')) === js({ full: 1, spent: 0 }) && js(await seatsWith(page, OWN, 'data-target', 'eligible')) === js([1, 5, 8]));
  await click(page, '#bm-app [data-value="seat-5"]');
  ok('shot/officer: the target in the reticle beside the question', await page.evaluate(`Boolean(document.querySelector('#bm-strip .ab-target[data-mark="reticle"] .ab-chip[data-seat="5"]'))`) && (await stripLine(page)) === 'Register a shot at Player 5?');
  await click(page, '#bm-app [data-act="confirm"]');
  await sleep(900);
  ok('shot/officer: the receipt spends the round and is not a result', (await stamp(page)) === 'Registered' && js(await roundsIn(page, '#bm-strip .ab-rounds')) === js({ full: 0, spent: 1 })
    && await page.evaluate(`document.querySelector('#bm-strip .bm-strip__detail').textContent.includes('This is not a result.') && !/\\b(hit|injur|damage|eliminat)/i.test(document.getElementById('bm-strip').textContent)`));
  ok('shot/officer: the other screens see nothing of it, and no public cue plays', (await observerPrivate(page)).length === 0 && (await observerArt(page)) === 0 && (await cues(page)).length === 0, await cues(page));
  await click(page, '#bm-app [data-act="dismiss"]');
  await click(page, '#bm-nav-card');
  ok('shot/officer: the card then holds none, in the release\'s words, with no round', await page.evaluate(`document.querySelector('#bm-card .ab-kit[data-kit="weapons"] .ab-kit__words')?.textContent === 'Ordinary weapons you hold: 0.' && document.querySelectorAll('#bm-card .ab-kit[data-kit="weapons"] .ab-round').length === 0`));
  ok('shot/officer: no page error', page.problems().length === 0, page.problems());
  await page.close();

  const shooter = async scenario => {
    const p = await open(scenario);
    const confirming = await stripOf(p);
    await click(p, '#bm-app [data-act="confirm"]');
    await sleep(700);
    const receipt = await stripOf(p);
    const quiet = (await observerPrivate(p)).length === 0 && (await observerArt(p)) === 0 && (await cues(p)).length === 0;
    await p.close();
    return { confirming, receipt, quiet };
  };
  const officer = await shooter('shot.confirm');
  const undercover = await shooter('shot.undercover-confirm');
  const alien = await shooter('shot.alien-confirm');
  ok('shot: the Officer, the Undercover and an Alien with a supplied weapon see the same strip, part for part', officer.confirming === undercover.confirming && officer.confirming === alien.confirming
    && !/data-device|data-team|officer|undercover|alien/i.test(officer.confirming));
  ok('shot: the same receipt for each; the other screens see none of them, and no public cue plays', officer.receipt === undercover.receipt && officer.receipt === alien.receipt && officer.quiet && undercover.quiet && alien.quiet);
  // Held 100 ms into the receipt: the one beat playing is the round that left as the count fell.
  page = await open('shot.confirm', 'play=register&t=100');
  ok('shot: on the receipt the round leaves the rack, once, as the count falls', js(await beats(page, '#bm-strip')) === js(['ab-round']), await beats(page, '#bm-strip'));
  await page.close();
  page = await open('shot.confirm', 'motion=reduced&play=register&t=100');
  ok('shot: with reduced motion the round is drawn spent, with no beat', (await beats(page, '#bm-strip')).length === 0 && js(await roundsIn(page, '#bm-strip .ab-rounds')) === js({ full: 0, spent: 1 }));
  await page.close();

  page = await open('protect.confirm');
  ok('protect: the target on the shield beside the question', await page.evaluate(`Boolean(document.querySelector('#bm-strip .ab-target[data-mark="shield"] .ab-chip[data-seat="5"]'))`) && (await stripLine(page)) === 'Register Protection for Player 5?');
  await click(page, '#bm-app [data-act="confirm"]');
  await sleep(900);
  ok('protect: the receipt is registered, and not a grant', (await stamp(page)) === 'Registered' && !(await page.evaluate(`/\\b(active|protected|granted|shielded|used)\\b/i.test(document.getElementById('bm-strip').textContent)`)));
  await click(page, '#bm-app [data-act="dismiss"]');
  await click(page, '#bm-nav-card');
  ok('protect: the card has no note until the view carries one', await page.evaluate(`document.querySelectorAll('#bm-card .ab-guard').length === 0`));
  const cuesBefore = (await cues(page)).length;
  await click(page, '[data-private-event="guard-granted"]');
  await sleep(60);
  ok('protect/granted: the Undercover\'s own note, in the release\'s words, its shield whole', await page.evaluate(`(() => {
    const note = document.querySelector('#bm-card .ab-guard');
    return note?.querySelector('.ab-guard__words').textContent === 'Protection for Player 5: active from round 3.' && note.querySelector('.ab-target').dataset.mark === 'shield' && note.querySelector('.ab-chip').dataset.seat === '5';
  })()`));
  ok('protect/granted: nothing public changes, and no cue plays on any screen', (await cues(page)).length === cuesBefore && (await observerPrivate(page)).length === 0 && (await observerArt(page)) === 0 && await samePlaces(page));
  await click(page, '[data-private-event="guard-used"]');
  await sleep(60);
  ok('protect/used: the note says used up, the shield split, the player drawn whole', await page.evaluate(`(() => {
    const note = document.querySelector('#bm-card .ab-guard');
    return note.querySelector('.ab-guard__words').textContent === 'Protection for Player 5: used up.' && note.querySelector('.ab-target').dataset.mark === 'shield-used' && getComputedStyle(note.querySelector('.ab-chip')).opacity === '1';
  })()`));
  ok('protect/used: the shield shakes once, as the view changes', js(await beats(page, '#bm-card')) === js(['ab-target__mark']), await beats(page, '#bm-card'));
  await sleep(400);
  await click(page, '[data-event="replay"]');
  await sleep(60);
  ok('protect/used: a duplicate snapshot plays nothing again', (await beats(page, '#bm-card')).length === 0, await beats(page, '#bm-card'));
  await click(page, '#bm-card .bm-close');
  await click(page, '#bm-nav-card');
  ok('protect/used: opened again, at rest', (await beats(page, '#bm-card')).length === 0 && await page.evaluate(`document.querySelector('#bm-card .ab-guard')?.dataset.used === 'true'`));
  ok('protect/used: nothing public changes, and no cue plays on any screen', (await cues(page)).length === cuesBefore && (await observerArt(page)) === 0);
  ok('protect: no page error', page.problems().length === 0, page.problems());
  await page.close();
  page = await open('guard.self');
  ok('protect/card: the notes in the view\'s order, the own one as "yourself", and the weapon held', await page.evaluate(`(() => {
    const notes = [...document.querySelectorAll('#bm-card .ab-guard')];
    return notes.map(n => n.dataset.guard).join() === '8,3' && notes[1].querySelector('.ab-guard__words').textContent === 'Protection for yourself: active from round 4.'
      && document.querySelector('#bm-card .ab-kit[data-kit="weapons"] .ab-kit__words').textContent === 'Ordinary weapons you hold: 1.' && document.querySelectorAll('#bm-card .ab-kit[data-kit="weapons"] .ab-round[data-spent="false"]').length === 1;
  })()`));
  ok('protect/card: a used-up note drawn at rest on a fresh page', (await beats(page, '#bm-card')).length === 0);
  await page.close();
  page = await open('alien.weapon');
  ok('alien/weapon: the Code file, the recipient\'s slip naming no Supplier, and the weapon in the release\'s words', await page.evaluate(`(() => {
    const words = document.querySelector('#bm-card .ab-slip .ab-slip__words')?.textContent;
    return Boolean(document.querySelector('#bm-card .ab-code-set')) && words === 'You received one ordinary weapon from Supply in Round 3.'
      && document.querySelector('#bm-card .ab-kit[data-kit="weapons"] .ab-kit__words')?.textContent === 'Ordinary weapons you hold: 1.';
  })()`));
  ok('alien/weapon: nothing of it on the other screens', (await observerPrivate(page)).length === 0 && (await observerArt(page)) === 0);
  await page.close();

  // ---------- Slice 5: the seat's own ballot, the Captain's release request, a Hack and Pass ----------
  const slipOf = p => p.evaluate(`(() => { const slip = document.querySelector('#bm-strip .ab-ballot'); return slip ? { vote: slip.dataset.vote, seat: Number(slip.querySelector('.ab-chip')?.dataset.seat) || null, pencil: slip.querySelector('.ab-ballot__pencil')?.dataset.pencil } : null; })()`);
  const posted = p => p.evaluate(`document.querySelector('#bm-strip .ab-box')?.dataset.posted ?? null`);
  page = await open('vote.election');
  ok('ballot: the box waits, empty, while the seat chooses', (await posted(page)) === 'false' && (await slipOf(page)) === null);
  await click(page, '#bm-app [data-value="seat-5"]');
  ok('ballot: the pick on the seat\'s own slip, ticked, beside the question', js(await slipOf(page)) === js({ vote: 'for', seat: 5, pencil: 'tick' }) && (await stripLine(page)) === 'Vote for Player 5 as Captain?');
  await click(page, '#bm-app [data-act="confirm"]');
  await sleep(900);
  ok('ballot: the receipt posts the slip into the box; registered, and no count', (await posted(page)) === 'true' && (await stamp(page)) === 'Registered' && !(await page.evaluate(`/\\b\\d+ votes?\\b|Yes: \\d/.test(document.getElementById('bm-strip').textContent)`)));
  ok('ballot: the other screens see nothing of it, and no public cue plays', (await observerPrivate(page)).length === 0 && (await observerArt(page)) === 0 && (await cues(page)).length === 0, await cues(page));
  await page.close();
  page = await open('vote.confirm', 'play=register&t=100');
  ok('ballot: on the receipt the slip drops into the box, once', js(await beats(page, '#bm-strip')) === js(['ab-box']), await beats(page, '#bm-strip'));
  await page.close();
  page = await open('vote.jail');
  await click(page, '#bm-app [data-act="answer:none"]');
  ok('ballot: an abstention is a blank slip that names nobody', js(await slipOf(page)) === js({ vote: 'abstain', seat: null, pencil: 'dash' }));
  await page.close();
  page = await open('release.vote');
  await click(page, '#bm-app [data-act="answer:yes"]');
  ok('release ballot: Yes, ticked on the subject\'s slip', js(await slipOf(page)) === js({ vote: 'yes', seat: 9, pencil: 'tick' }));
  await click(page, '#bm-app [data-act="back"]');
  await click(page, '#bm-app [data-act="answer:no"]');
  ok('release ballot: No, crossed', js(await slipOf(page)) === js({ vote: 'no', seat: 9, pencil: 'x-mark' }));
  await page.close();
  page = await open('release.choice');
  await click(page, '#bm-app [data-value="seat-9"]');
  ok('release request: the jailed player in the key ring, at the start of the detail line', await page.evaluate(`Boolean(document.querySelector('#bm-strip .bm-strip__detail > .ab-target[data-mark="key"] .ab-chip[data-seat="9"]'))`));
  await click(page, '#bm-app [data-act="confirm"]');
  await sleep(900);
  ok('release request: registered; the other screens see nothing of it until the vote opens', (await stamp(page)) === 'Registered' && (await observerPrivate(page)).length === 0 && (await observerArt(page)) === 0);
  await page.close();

  page = await open('hack.choose');
  await click(page, '#bm-app [data-value="seat-5"]');
  ok('hack: the asked player in the comms ring beside the question', await page.evaluate(`Boolean(document.querySelector('#bm-strip .ab-target[data-mark="comms"] .ab-chip[data-seat="5"]'))`) && (await stripLine(page)) === 'Request a Hack with Player 5?');
  await click(page, '#bm-app [data-act="confirm"]');
  await sleep(900);
  ok('hack: the request accepted is not the Hack; the other screens see nothing of it', /accepted\.$/.test(await stripLine(page)) && (await observerPrivate(page)).length === 0 && (await observerArt(page)) === 0);
  await page.close();
  const noteOf = p => p.evaluate(`document.querySelector('#bm-card .ab-kit[data-kit="hack"]')?.outerHTML ?? null`);
  page = await open('hack.phase', 't=100');
  ok('hack/note: the seat\'s own chip joined to its partner\'s, in the release\'s words', await page.evaluate(`(() => {
    const note = document.querySelector('#bm-card .ab-kit[data-kit="hack"]');
    return note?.querySelector('.ab-kit__words').textContent === 'Hack: you and Player 5.' && [...note.querySelectorAll('.ab-link .ab-chip')].map(n => n.dataset.seat).join() === '3,5';
  })()`));
  ok('hack/note: the cord runs once, the first time the card shows it', js(await beats(page, '#bm-card')) === js(['ab-link__cord']), await beats(page, '#bm-card'));
  await page.close();
  page = await open('hack.phase');
  await sleep(500);
  const asking = await noteOf(page);
  await click(page, '[data-event="replay"]');
  await sleep(60);
  ok('hack/note: a duplicate snapshot runs nothing again', (await beats(page, '#bm-card')).length === 0);
  await click(page, '#bm-card .bm-close');
  await click(page, '#bm-nav-card');
  ok('hack/note: opened again, at rest', (await beats(page, '#bm-card')).length === 0 && (await noteOf(page)) === asking);
  ok('hack/note: nothing of it on the other screens, which show the Hack phase alone', (await observerPrivate(page)).length === 0 && (await observerArt(page)) === 0);
  await page.close();
  page = await open('hack.partner');
  await sleep(500);
  ok('hack/note: the asked partner sees the same note as the asking one', (await noteOf(page)) === asking && asking !== null);
  await page.close();

  page = await open('pass.confirm');
  ok('pass: the speaking turn\'s microphone, held', await page.evaluate(`document.querySelector('#bm-strip .ab-mic')?.dataset.passed === 'false'`));
  await click(page, '#bm-app [data-act="confirm"]');
  await sleep(900);
  ok('pass: on the receipt the microphone is handed on', await page.evaluate(`document.querySelector('#bm-strip .ab-mic')?.dataset.passed === 'true'`) && (await stamp(page)) === 'Registered');
  await page.close();
  page = await open('pass.confirm', 'play=register&t=100');
  ok('pass: the microphone is handed on once, on the receipt', js(await beats(page, '#bm-strip')) === js(['ab-mic']), await beats(page, '#bm-strip'));
  await page.close();
  page = await open('pass.confirm', 'motion=reduced&play=register&t=100');
  ok('pass: with reduced motion the microphone is drawn handed on, with no beat', (await beats(page, '#bm-strip')).length === 0 && await page.evaluate(`document.querySelector('#bm-strip .ab-mic')?.dataset.passed === 'true'`));
  ok('pass: no page error', page.problems().length === 0, page.problems());
  await page.close();

  // ---------- Slice 6: the showdown's special shot; the match's end, the same on every screen ----------
  page = await open('showdown.choose');
  ok('showdown: the special shot, full, at the start of the strip while it is offered', await page.evaluate(`document.querySelector('#bm-strip .ab-special')?.dataset.spent === 'false'`));
  await click(page, '#bm-app [data-value="seat-5"]');
  ok('showdown: the target in the reticle of an ordinary shot, in the release\'s words', await page.evaluate(`Boolean(document.querySelector('#bm-strip .ab-target[data-mark="reticle"] .ab-chip[data-seat="5"]'))`) && (await stripLine(page)) === 'Register a showdown shot at Player 5?', await stripLine(page));
  await click(page, '#bm-app [data-act="confirm"]');
  ok('showdown: still full while it is on its way', await page.evaluate(`document.querySelector('#bm-strip .ab-special')?.dataset.spent === 'false'`));
  await sleep(900);
  ok('showdown: spent on the receipt, which is not a result', await page.evaluate(`document.querySelector('#bm-strip .ab-special')?.dataset.spent === 'true'`) && (await stamp(page)) === 'Registered'
    && (await stripLine(page)) === 'Showdown shot at Player 5 registered.' && await page.evaluate(`document.querySelector('#bm-app .bm-strip__detail').textContent.endsWith('This is not a result.')`));
  ok('showdown: the other screens see nothing of it, and no public cue plays', (await observerPrivate(page)).length === 0 && (await observerArt(page)) === 0 && (await cues(page)).length === 0, await cues(page));
  await page.close();
  page = await open('showdown.confirm', 'play=register&t=100');
  ok('showdown: the shot is spent once, on the receipt', js(await beats(page, '#bm-strip')) === js(['ab-special']), await beats(page, '#bm-strip'));
  await page.close();
  page = await open('showdown.confirm', 'motion=reduced&play=register&t=100');
  ok('showdown: with reduced motion the shot is drawn spent, with no beat', (await beats(page, '#bm-strip')).length === 0 && await page.evaluate(`document.querySelector('#bm-strip .ab-special')?.dataset.spent === 'true'`));
  await page.close();

  const resultOf = (p, scope) => p.evaluate(`(() => {
    const sheet = document.querySelector(${js(scope)});
    if (!sheet || sheet.hidden) return null;
    return { ended: sheet.dataset.ended, winner: sheet.dataset.winner ?? null, outcome: sheet.querySelector('.bm-result__outcome')?.textContent ?? null,
      lines: [...sheet.querySelectorAll('.bm-result__line')].map(n => n.textContent),
      rows: [...sheet.querySelectorAll('.bm-cast__row')].map(n => [n.querySelector('.bm-cast__label').textContent, n.querySelector('.bm-cast__name').textContent, n.dataset.endFaction, n.dataset.code]),
      code: sheet.querySelector('.bm-result__code')?.textContent ?? null };
  })()`);
  const OWN_RESULT = '#bm-app .bm-result', OBS_RESULT = '[data-observer] .bm-result';
  const CAST = [['Insider', 'blue', 'true'], ['Hacker', 'red', 'false'], ['Officer', 'blue', 'false'], ['Red Disabler', 'red', 'true'], ['Undercover', 'red', 'false'], ['Cracker', 'blue', 'true'], ['Supplier', 'blue', 'false'], ['Alien', 'alien', 'true'], ['Blue Disabler', 'blue', 'false']];
  const resultRunning = p => p.evaluate(`document.querySelectorAll('.bm-result').length && [...document.querySelectorAll('.bm-result')].flatMap(n => n.getAnimations({ subtree: true })).filter(a => a.playState === 'running').length`);
  page = await open('board.idle');
  ok('end: nothing of the end before it comes', (await resultOf(page, OWN_RESULT)) === null && (await page.evaluate(`document.querySelectorAll('.bm-cast, [data-end-faction]').length`)) === 0);
  await click(page, '[data-event="finish"]');
  await sleep(60);
  const own = await resultOf(page, OWN_RESULT);
  const other = await resultOf(page, OBS_RESULT);
  ok('end: the winner the server names, in the release\'s words', own?.ended === 'finished' && own.winner === 'Blue' && own.outcome === 'Blue wins.' && own.lines.length === 0, own);
  ok('end: every role in seat order, each in its side\'s colour, the Code\'s four pinned', js(own?.rows) === js(CAST.map(([role, side, code], index) => [index + 1 === 3 ? 'Player 3 (you)' : `Player ${index + 1}`, role, side, code])), own?.rows);
  ok('end: the Code in seat order, whatever order the view lists it in', own?.code === 'The Code was: Player 1, Player 4, Player 6, Player 8.', own?.code);
  ok('end: the other screens draw the same, naming nobody "(you)"', other?.outcome === own?.outcome && js(other?.rows) === js(CAST.map(([role, side, code], index) => [`Player ${index + 1}`, role, side, code])) && other?.code === own?.code, other);
  ok('end: one reveal cue on each screen, with the phase\'s', js((await cues(page)).filter(c => /end-reveal/.test(c))) === js(['own:cue-end-reveal::reveal', 'observer:cue-end-reveal::reveal']) && (await cues(page)).some(c => c === 'own:cue-phase-change::'), await cues(page));
  ok('end: the roles are never on the board, and no piece carries an end hook', (await observerPrivate(page)).length === 0
    && !(await page.evaluate(`/\\b(Officer|Insider|Cracker|Disabler|Supplier|Undercover|Hacker)\\b/.test(document.querySelector('#bm-app .bm-board').textContent)`))
    && (await page.evaluate(`document.querySelectorAll('.bm-board [data-end-faction], .bm-board [data-code]').length`)) === 0);
  ok('end: the timer says the phase has none, and runs no more', await page.evaluate(`(() => { const t = document.querySelector('#bm-app .bm-timer'); return t.dataset.state === 'none' && !t.hasAttribute('role') && t.textContent.includes('This phase has no timer'); })()`));
  ok('end: the status bar says the match finished', await page.evaluate(`document.querySelector('#bm-app .bm-status__line').textContent === 'Match finished' && document.querySelector('[data-observer] .bm-status__line').textContent === 'Match finished'`));
  ok('end: said once to a screen reader, in the release\'s words', await page.evaluate(`[...document.querySelectorAll('#bm-live p')].filter(n => n.textContent === 'Blue wins.').length === 1`));
  ok('end: the card and the actions are closed for good; Pass is not offered', await page.evaluate(`['bm-nav-card', 'bm-nav-actions'].every(id => document.getElementById(id).getAttribute('aria-disabled') === 'true') && document.getElementById('bm-pass').getAttribute('aria-disabled') === 'true'`));
  await click(page, '#bm-nav-card');
  await click(page, '#bm-nav-actions');
  ok('end: pressing them opens nothing, and nothing private is in the page', (await page.evaluate('window.__bmState.view')) === 'board' && (await privateDOM(page)).length === 0, await privateDOM(page));
  await sleep(1000);
  ok('end: the reveal is over within the comic beat maximum', (await resultRunning(page)) === 0 && await page.evaluate(`!document.querySelector('#bm-app .bm-result').dataset.cue`));
  const cuesAtEnd = (await cues(page)).length;
  await click(page, '[data-event="replay"]');
  await click(page, '[data-event="reconnect"]');
  await sleep(60);
  ok('end: a duplicate snapshot or a reconnect plays nothing again, and the sheet stays', (await cues(page)).length === cuesAtEnd && (await resultRunning(page)) === 0 && js(await resultOf(page, OWN_RESULT)) === js(own), (await cues(page)).slice(cuesAtEnd));
  await click(page, '#bm-nav-menu');
  ok('end: the menu covers it on this phone, as in the release; the other screens keep it', (await resultOf(page, OWN_RESULT)) === null && (await resultOf(page, OBS_RESULT)) !== null);
  await click(page, '#bm-menu .bm-close');
  ok('end: closing the menu shows it again, at rest', js(await resultOf(page, OWN_RESULT)) === js(own) && (await resultRunning(page)) === 0);
  ok('end: no page error', page.problems().length === 0, page.problems());
  await page.close();
  page = await open('shot.choose');
  await click(page, '[data-event="finish"]');
  await sleep(60);
  ok('end: a choice in progress leaves with the match, and nothing private stays', (await flow(page)).step === 'idle' && (await page.evaluate(`document.getElementById('bm-strip').hidden`)) && (await privateDOM(page)).length === 0, await privateDOM(page));
  await page.close();
  page = await open('shot.registered');
  await click(page, '[data-event="finish"]');
  await sleep(60);
  ok('end: even a receipt leaves the strip, as the release closes the actions', (await page.evaluate(`document.getElementById('bm-strip').hidden`)) && (await privateDOM(page)).length === 0);
  await page.close();
  page = await open('hack.phase');
  await click(page, '[data-event="finish"]');
  await sleep(60);
  ok('end: an open card closes, and no private word is left in the page', (await page.evaluate('window.__bmState.view')) === 'board' && (await page.evaluate(`!document.querySelector('.bm-private, .ab-kit, [data-device]')`)));
  await page.close();
  page = await open('board.idle');
  await click(page, '[data-event="abort"]');
  await sleep(60);
  const ended = await resultOf(page, OWN_RESULT);
  ok('end/aborted: the host\'s sentence, no winner, nothing revealed', ended?.ended === 'aborted' && ended.winner === null && ended.outcome === 'The host ended this match. There is no winner.' && ended.rows.length === 0 && ended.code === null, ended);
  ok('end/aborted: the other screens the same, and no role named anywhere', js(await resultOf(page, OBS_RESULT)) === js(ended)
    && !(await page.evaluate(`/\\b(Officer|Insider|Cracker|Disabler|Supplier|Undercover|Hacker)\\b/.test(document.querySelector('#bm-app').textContent + document.querySelector('[data-observer]').textContent)`)));
  ok('end/aborted: its cue is the sheet\'s rise alone', js((await cues(page)).filter(c => /end-reveal/.test(c))) === js(['own:cue-end-reveal::ended', 'observer:cue-end-reveal::ended']), await cues(page));
  ok('end/aborted: the status bar says the host ended it', await page.evaluate(`document.querySelector('#bm-app .bm-status__line').textContent === 'Match ended by the host'`));
  await page.close();
  page = await open('board.idle', 'motion=reduced');
  // Read in the same step as the fact: the fade's mark lasts its 80 ms only.
  const fadeMark = await page.evaluate(`(() => { document.querySelector('[data-event="finish"]').click(); return document.querySelector('#bm-app .bm-result').dataset.cue ?? null; })()`);
  ok('end/reduced: the sheet fades in; nothing is struck or turned up', js((await cues(page)).filter(c => /end-reveal/.test(c))) === js(['own:cue-end-reveal::reduced', 'observer:cue-end-reveal::reduced'])
    && fadeMark === 'fade'
    && (await page.evaluate(`[...document.querySelectorAll('.bm-cast__row, .bm-result__outcome')].flatMap(n => n.getAnimations()).length`)) === 0, { cues: await cues(page), fadeMark });
  await page.close();
  page = await open('board.idle');
  await click(page, '[data-event="finish"]');
  await sleep(200);
  await page.evaluate(`(() => { const box = [...document.querySelectorAll('.bm-panel label')].find(n => n.textContent.includes('Reduced motion')).querySelector('input'); box.click(); })()`);
  await sleep(30);
  ok('end/reduced: switched on mid-reveal, the sheet stands as it is at once', (await resultRunning(page)) === 0 && await page.evaluate(`!document.querySelector('#bm-app .bm-result').dataset.cue && !document.querySelector('[data-observer] .bm-result').dataset.cue`));
  await page.close();
  page = await open('end.blue');
  await sleep(200);
  ok('end: a page that loads at the end plays nothing', (await cues(page)).length === 0 && (await resultRunning(page)) === 0 && js((await resultOf(page, OWN_RESULT))?.rows) === js(own?.rows));
  await page.close();
  page = await open('end.alien-co');
  ok('end: the Alien\'s co-win, in the release\'s words', js((await resultOf(page, OWN_RESULT))?.lines) === js(['The Alien wins with Blue.']));
  await page.close();

  // ---------- Slice 7: each action's mark in the tray; out of date and back; the card kept (DSN-REQ-16) ----------
  const chipArt = p => p.evaluate(`[...document.querySelectorAll('#bm-tray .bm-chip__icon')].map(n => n.dataset.kind + ':' + (getComputedStyle(n).backgroundImage.startsWith('url(') ? 'art' : 'none') + ':' + (getComputedStyle(n).color === 'rgba(0, 0, 0, 0)' ? 'glyph hidden' : 'glyph shown'))`);
  const chipImage = (p, kind) => p.evaluate(`getComputedStyle(document.querySelector('#bm-tray .bm-chip__icon[data-kind="${kind}"]')).backgroundImage`);
  for (const [scenario, kinds] of [['tray.open', ['shot', 'scan', 'hack', 'code']], ['tray.undercover', ['shot', 'protect', 'hack']], ['tray.cracker', ['rescue', 'hack']], ['tray.disabler', ['disable', 'hack']],
    ['tray.supplier', ['supply', 'hack']], ['tray.showdown', ['showdown-shot']], ['tray.vote', ['vote']], ['tray.release', ['release-choice']], ['tray.release-vote', ['release-vote']]]) {
    page = await open(scenario);
    ok(`icons/${scenario}: each chip draws its own action's mark, its glyph hidden`, js(await chipArt(page)) === js(kinds.map(kind => `${kind}:art:glyph hidden`)), await chipArt(page));
    await page.close();
  }
  page = await open('tray.vote');
  const ballotIcon = await chipImage(page, 'vote');
  await page.close();
  page = await open('tray.release-vote');
  ok('icons: every ballot has the same mark, a release vote too', (await chipImage(page, 'release-vote')) === ballotIcon && ballotIcon.startsWith('url('));
  await page.close();
  page = await open('tray.open');
  const shotIcon = await chipImage(page, 'shot');
  const marks = new Set();
  for (const scenario of ['tray.open', 'tray.undercover', 'tray.cracker', 'tray.disabler', 'tray.supplier', 'tray.showdown', 'tray.vote', 'tray.release']) {
    const other = scenario === 'tray.open' ? page : await open(scenario);
    for (const image of await other.evaluate(`[...document.querySelectorAll('#bm-tray .bm-chip__icon')].map(n => n.dataset.kind + '|' + getComputedStyle(n).backgroundImage)`)) marks.add(image);
    if (other !== page) await other.close();
  }
  const byKind = new Map([...marks].map(entry => entry.split('|')));
  ok('icons: eleven actions, eleven marks, the Shot the reviewed one', byKind.size === 11 && new Set(byKind.values()).size === 11 && /icon-action-shot|svg/.test(shotIcon), [...byKind.keys()]);
  await page.close();

  const bannerOf = p => p.evaluate(`(() => { const b = document.querySelector('#bm-app .bm-banner'); return b && !b.hidden ? { variant: b.dataset.variant, words: b.querySelector('.bm-banner__text').textContent, act: b.querySelector('[data-act="reconnect"]')?.textContent ?? null, waiting: b.querySelector('[data-act="reconnect"]')?.getAttribute('aria-disabled') } : null; })()`);
  const said = p => p.evaluate(`[...document.querySelectorAll('#bm-live p')].map(n => n.textContent)`);
  page = await open('board.idle');
  await click(page, '#bm-stale');
  ok('stale: the banner in the release\'s words, with Reconnect now', js(await bannerOf(page)) === js({ variant: 'stale', words: 'Connection lost. Showing the last known state, which may be out of date. Reconnecting…', act: 'Reconnect now', waiting: 'false' }), await bannerOf(page));
  ok('stale: said once, in the release\'s words', (await said(page)).filter(text => text === 'Connection lost. Showing the last known state.').length === 1, await said(page));
  const cuesAtStale = (await cues(page)).length;
  await click(page, '#bm-app [data-act="reconnect"]');
  ok('reconnect: pressed, it waits; pressed again, nothing more is asked', (await bannerOf(page))?.waiting === 'true');
  await sleep(900);
  ok('reconnect: the banner leaves and the fresh view is said once: "Reconnected. Round 2. Your turn."', (await bannerOf(page)) === null && (await said(page)).filter(text => text === 'Reconnected. Round 2. Your turn.').length === 1, await said(page));
  ok('reconnect: nothing plays, and nothing private comes back by itself', (await cues(page)).length === cuesAtStale && (await privateDOM(page)).length === 0);
  await page.close();
  page = await open('board.idle');
  await click(page, '#bm-unreadable');
  ok('unreadable: its own banner, in the release\'s words, the same control', js(await bannerOf(page)) === js({ variant: 'unreadable', words: 'The latest update could not be read. Showing the last known state, which may be out of date.', act: 'Reconnect now', waiting: 'false' })
    && (await said(page)).includes('The latest update could not be read.'));
  ok('unreadable: the actions pause, as when the connection is lost', await page.evaluate(`document.getElementById('bm-pass').getAttribute('aria-disabled') === 'true'`));
  await click(page, '#bm-fresh');
  ok('unreadable: readable again, said once: "Up to date again. Round 2. Your turn."', (await bannerOf(page)) === null && (await said(page)).includes('Up to date again. Round 2. Your turn.'));
  await page.close();
  const clear = p => p.evaluate(`(() => {
    const b = document.querySelector('#bm-app .bm-banner').getBoundingClientRect();
    return [...document.querySelectorAll('#bm-app .bm-sheet:not([hidden]) .bm-sheet__head, #bm-app .bm-tray:not([hidden]) .bm-sheet__head')].every(head => head.getBoundingClientRect().top >= b.bottom);
  })()`);
  page = await open('board.idle', 'w=320&h=568');
  await click(page, '#bm-stale');
  await click(page, '#bm-nav-menu');
  ok('clearance: at 320 x 568 the menu opens below the banner, its heading and Close in view', await clear(page));
  await click(page, '#bm-menu .bm-close');
  await click(page, '#bm-nav-actions');
  ok('clearance: the paused actions too', await clear(page) && /paused until the connection is restored/.test(await page.evaluate(`document.getElementById('bm-tray').textContent`)));
  // The reader's text doubled while a sheet is open: the banner's words grow with it, and the sheet follows the banner's new edge.
  await page.evaluate(`(() => { document.documentElement.style.fontSize = '32px'; return true; })()`);
  await page.evaluate('new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))');
  ok('clearance: at twice the text size the banner\'s words grow, and the open sheet stays below it', await clear(page)
    && await page.evaluate(`!document.getElementById('bm-tray').hidden && parseFloat(getComputedStyle(document.querySelector('#bm-app .bm-banner__text')).fontSize) >= 26`));
  await page.close();

  const kept = p => p.evaluate(`(() => {
    const file = document.querySelector('#bm-card .ab-file');
    return { mark: document.querySelector('#bm-card .bm-card-stale')?.textContent ?? null, role: document.querySelector('#bm-card .bm-card__name')?.textContent ?? null,
      paused: file?.dataset.paused ?? null, disabled: file ? [...file.querySelectorAll('.ab-photo')].every(n => n.getAttribute('aria-disabled') === 'true') : null,
      moving: file ? file.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length : null };
  })()`);
  page = await open('stale.card');
  ok('kept card: the card stays on an out-of-date view, marked, the file at rest and not pressable', js(await kept(page)) === js({ mark: 'May be out of date', role: 'Insider', paused: 'true', disabled: true, moving: 0 }), await kept(page));
  await click(page, '#bm-card .ab-photo');
  ok('kept card: a snapshot pressed while out of date inspects nothing', await page.evaluate(`!document.querySelector('#bm-card .ab-file').dataset.inspect`));
  ok('kept card: the actions stay paused, nothing private elsewhere', await page.evaluate(`document.getElementById('bm-strip').hidden && document.getElementById('bm-pass').getAttribute('aria-disabled') === 'true'`) && (await observerPrivate(page)).length === 0);
  await click(page, '#bm-fresh');
  ok('kept card: current again, the mark leaves and the file can be pressed; nothing assembles again', js(await kept(page)) === js({ mark: null, role: 'Insider', paused: 'false', disabled: false, moving: 0 }), await kept(page));
  await click(page, '#bm-card .ab-photo');
  const inspected = await page.evaluate(`document.querySelector('#bm-card .ab-file').dataset.inspect`);
  // Focus on the inspect card's Back (a programmatic click moves no focus: it is put there).
  await page.evaluate(`(() => { document.querySelector('#bm-card .ab-inspect [data-file-act="back"]').focus(); return true; })()`);
  await click(page, '#bm-stale');
  ok('kept card: going out of date puts the inspected snapshot back at once, focus on it as Back does, nothing left moving', Boolean(inspected) && await page.evaluate(`!document.querySelector('#bm-card .ab-file').dataset.inspect && document.activeElement?.closest('.ab-photo')?.dataset.seat === ${js(inspected)}`)
    && (await kept(page)).moving === 0, await kept(page));
  await click(page, '#bm-fresh');
  await page.evaluate(`(() => { document.querySelector('#bm-card .bm-close').focus(); return true; })()`);
  await click(page, '#bm-stale');
  ok('kept card: going out of date redraws nothing else in the card: focus stays where it was, the mark put in place', await page.evaluate(`document.activeElement === document.querySelector('#bm-card .bm-close') && Boolean(document.querySelector('#bm-card > .bm-card-stale'))`));
  await click(page, '#bm-fresh');
  await click(page, '#bm-expire');
  ok('kept card: time up, the card stays at rest with no mark: the view is not out of date', js(await kept(page)) === js({ mark: null, role: 'Insider', paused: 'true', disabled: true, moving: 0 }), await kept(page));
  await page.close();
  page = await open('stale.card');
  await hide(page);
  ok('kept card: the background still conceals it: nothing private in the page', (await privateDOM(page)).length === 0);
  await show(page);
  ok('kept card: back from the background, the card stays closed until opened', (await privateDOM(page)).length === 0);
  await page.close();
  page = await open('stale.card-notes');
  ok('kept card: the Undercover\'s notes, marked, the same mark for every role', await page.evaluate(`document.querySelector('#bm-card .bm-card-stale')?.textContent === 'May be out of date' && Boolean(document.querySelector('#bm-card .ab-guards'))`));
  ok('kept card: no page error', page.problems().length === 0, page.problems());
  await page.close();
  page = await open('file.hidden');
  await click(page, '#bm-nav-card');
  ok('default (PR #88): an out-of-date view still shows the closed folder, the same for every role', await page.evaluate(`Boolean(document.querySelector('#bm-card .ab-folder')) && !document.querySelector('#bm-card .bm-card-stale, #bm-card .ab-file')`));
  await page.close();

  // ---------- An update replays nothing it has already played: the strip's stamp and art, a pick's mark ----------
  const strikes = page => page.evaluate(`document.getAnimations().filter(a => a.effect?.target?.closest?.('#bm-strip, [data-board="own"] .bm-piece__pick') && a.playState === 'running').map(a => a.effect.target.className)`);
  for (const scenario of ['shot.registered', 'code.two', 'code.registered', 'supply.second']) {
    page = await open(scenario);
    await sleep(700);
    await click(page, '[data-event="replay"]');
    await sleep(30);
    ok(`replay/${scenario}: a duplicate snapshot plays nothing again in the strip or on a pick`, (await strikes(page)).length === 0, await strikes(page));
    await click(page, '[data-event="injure"]');
    await sleep(30);
    ok(`replay/${scenario}: a public fact about someone else leaves the strip as it is`, (await strikes(page)).length === 0, await strikes(page));
    await page.close();
  }
  page = await open('code.two');
  await sleep(700);
  await click(page, '#bm-app [data-value="seat-9"]');
  ok('code: a new pick clips only its own chip into the card', js(await page.evaluate(`document.getElementById('bm-strip').getAnimations({ subtree: true }).filter(a => a.id === 'ab-beat').map(a => a.effect.target.dataset.seat)`)) === js(['9']));
  await click(page, '#bm-app [data-value="seat-4"]');
  await click(page, '#bm-app [data-act="confirm"]');
  await sleep(700);
  ok('code: the receipt punches the card once', js(await page.evaluate(`document.getElementById('bm-strip').getAnimations({ subtree: true }).filter(a => a.id === 'ab-beat').map(a => a.effect.target.className)`)) === js(['ab-code-card']));
  await page.close();
  // ---------- An update keeps what it does not change: focus stays, an inspected player's facts follow the board ----------
  page = await open('file.insider');
  await sleep(1200);
  await page.evaluate(`document.querySelector('#bm-card .ab-photo[data-seat="5"]').focus()`);
  await click(page, '[data-event="move"]');
  await sleep(60);
  ok('card: a public fact about someone else keeps focus on the snapshot', await page.evaluate(`document.activeElement?.dataset?.seat === '5' && document.activeElement.closest('#bm-card') !== null`));
  await page.evaluate(`document.querySelector('#bm-card .ab-photo[data-seat="5"]').click()`);
  await click(page, '[data-event="injure"]');
  await sleep(60);
  ok('card: the inspected player\'s public facts follow the board, focus kept', await page.evaluate(`document.querySelector('#bm-card .ab-inspect__facts').textContent === 'Room A · Injured' && document.activeElement?.dataset?.seat === '5'`),
    await page.evaluate(`document.querySelector('#bm-card .ab-inspect__facts')?.textContent`));
  await page.evaluate(`document.querySelector('#bm-card .bm-close').focus()`);
  await click(page, '[data-event="replay"]');
  await sleep(60);
  ok('card: a duplicate snapshot keeps focus on Close', await page.evaluate(`document.activeElement?.classList.contains('bm-close') && document.activeElement.closest('#bm-card') !== null`));
  await page.close();
  page = await open('board.other-turn');
  await page.evaluate(`document.getElementById('bm-nav-actions').focus()`);
  await click(page, '[data-event="injure"]');
  await sleep(60);
  ok('nav: a public fact keeps focus where it was', await page.evaluate(`document.activeElement?.id === 'bm-nav-actions'`));
  await click(page, '#bm-nav-menu');
  await page.evaluate(`document.querySelector('#bm-menu [data-act="motion"]').focus()`);
  await page.evaluate(`document.querySelector('#bm-menu [data-act="motion"]').click()`);
  await sleep(60);
  ok('menu: Reduce motion keeps focus on its box, and the box says it is on', await page.evaluate(`document.activeElement?.dataset?.act === 'motion' && document.activeElement.checked === true && document.getElementById('bm-app').dataset.motion === 'reduced'`));
  await page.close();
  page = await open('move.confirm');
  await click(page, '#bm-app [data-act="confirm"]');
  await sleep(1400);
  ok('move: the arrival changes the receipt\'s words without stamping it again', (await flow(page)).arrived === true
    && await page.evaluate(`document.getElementById('bm-strip').hasAttribute('data-settled') && document.querySelector('#bm-strip .bm-stamp').getAnimations().length === 0`));
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
