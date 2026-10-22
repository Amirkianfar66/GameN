// mothership:dev-only
//
// Walks the comic-board exploration in a browser and says what it found. Run by hand, with a
// Chromium-based browser on the machine:
//   node design/explorations/comic-board/try.mjs
//
// It is a walk through an exploration on a fixture, in one desktop browser. It shows that the
// page does what its README says. It says nothing about a phone, about the game's own client,
// about the engine or about people at a table, and no other check reads its result.

import { connect, launchBrowser, openPage } from '../../tools/lib/chrome.mjs';
import { startStaticServer } from '../../tools/lib/static-server.mjs';

const here = '/explorations/comic-board/index.html';
const ROLE_WORDS = ['Officer', 'Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Red Disabler', 'Alien', 'Disabler'];
const ROLE_KEYS = ['officer', 'insider', 'cracker', 'blue-disabler', 'supplier', 'undercover', 'hacker', 'red-disabler', 'alien'];

const failures = [];
let count = 0;
const expect = (ok, what, detail = '') => {
  count += 1;
  if (!ok) failures.push(`${what}${detail === '' ? '' : `: ${detail}`}`);
};

// Run inside the page: where every piece stands, and whether two name tags touch.
const STANDING = `(() => {
  const key = { 'Room A': 'room-a', 'Room B': 'room-b', 'Command Room': 'command', Hospital: 'hospital', Jail: 'jail' };
  const outside = [];
  for (const token of document.querySelectorAll('.cb-token')) {
    const who = window.__board.state.seats.find(seat => seat.n === Number(token.dataset.n));
    const room = document.querySelector('.cb-panel[data-room="' + key[who.location] + '"]').getBoundingClientRect();
    const piece = token.getBoundingClientRect();
    const tag = token.querySelector('.cb-token__name').getBoundingClientRect();
    if (piece.left < room.left - 4 || piece.right > room.right + 4 || piece.top < room.top - 30 || tag.bottom > room.bottom + 8) outside.push(who.n);
  }
  const tags = [...document.querySelectorAll('.cb-token__name')].map(tag => tag.getBoundingClientRect());
  let touching = 0;
  for (let i = 0; i < tags.length; i += 1) for (let j = i + 1; j < tags.length; j += 1) {
    const a = tags[i], b = tags[j];
    if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) touching += 1;
  }
  const leftovers = document.querySelectorAll('.cb-puff, .cb-burst, .cb-shadow, .cb-trails path, [data-flying], [data-arriving]').length;
  return { pieces: document.querySelectorAll('.cb-token').length, outside, touching, leftovers };
})()`;

// Run inside the page: anything of a role outside the private sheet, in words, in markup
// (an attribute, a class, an address) or as a drawing.
const PUBLIC_LEAK = `(() => {
  const words = ${JSON.stringify([...ROLE_WORDS, 'officer', 'insider', 'cracker', 'disabler', 'supplier', 'undercover', 'hacker', 'alien'])};
  const markup = ['page', 'phase', 'hand', 'banner'].map(id => document.getElementById(id).outerHTML).join(' ').toLowerCase();
  const named = [...new Set(words.map(word => word.toLowerCase()).filter(word => markup.includes(word)))];
  const drawn = [...document.querySelectorAll('[id^="device-"]')].filter(node => !node.closest('.cb-private')).length
    + [...document.querySelectorAll('img, [style]')].filter(node => !node.closest('.cb-private') && /devices\\//.test((node.getAttribute('src') ?? '') + (node.getAttribute('style') ?? ''))).length;
  return { named, drawn };
})()`;

const offered = `[...document.querySelectorAll('.cb-panel')].filter(panel => panel.getAttribute('aria-disabled') === 'false').map(panel => panel.dataset.room).join(',')`;
const idle = `!window.__board.state.busy`;
const click = selector => `(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!node) throw new Error('Nothing matches ' + ${JSON.stringify(selector)}); node.click(); })()`;

const server = await startStaticServer();
const chrome = await launchBrowser();
try {
  const browser = await connect(chrome.endpoint);
  const open = async (query, size = { width: 390, height: 844 }) => {
    const page = await openPage(browser, { ...size, scale: 1 });
    await page.goto(`${server.origin}${here}${query}`);
    return page;
  };
  const art = page => page.requests().map(url => url.replace(server.origin, '')).filter(path => /\/(crew|devices)\//.test(path));

  // ---------- a phone: choose, join, the deal ----------
  {
    const page = await open('');
    const start = await page.evaluate(`({ tiles: document.querySelectorAll('.cb-choose__tile').length, taken: document.querySelectorAll('.cb-choose__tile:disabled').length, join: document.querySelector('.cb-choose .cb-button').disabled, card: !!document.querySelector('.cb-rolecard'), role: window.__board.state.role })`);
    expect(start.tiles === 9 && start.taken === 4, 'the chooser offers nine characters, four of them taken', JSON.stringify(start));
    expect(start.join === true, 'Join waits for a choice');
    expect(start.card === false && start.role === null, 'no role card before a character is chosen');
    const atLoad = art(page);
    expect(new Set(atLoad.filter(path => path.includes('/devices/'))).size === 9, 'all nine devices are asked for at the start', String(new Set(atLoad.filter(path => path.includes('/devices/'))).size));
    expect(new Set(atLoad.filter(path => path.includes('/crew/'))).size === 9, 'all nine characters are asked for at the start');

    await page.evaluate(click('.cb-choose__tile:disabled'));
    expect(await page.evaluate(`document.querySelector('.cb-choose .cb-button').disabled`) === true, 'a taken character cannot be chosen');
    await page.evaluate(click('.cb-choose__tile[aria-label^="Character 7"]'));
    await page.evaluate(`(() => { document.querySelector('.cb-choose__name input').value = 'Sam <b>'; })()`);
    await page.evaluate(click('.cb-choose .cb-button'));
    await page.waitFor(`window.__board.state.role !== null && !document.querySelector('.cb-choose')`, 'the role card is dealt');
    await page.waitFor(`document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity && animation.playState === 'running').length === 0`, 'the opening has settled');
    const joined = await page.evaluate(`({ mine: window.__board.state.crew[1], name: document.querySelector('.cb-token[data-n="1"] .cb-token__name').textContent, markup: document.querySelector('.cb-token[data-n="1"] .cb-token__name').innerHTML.includes('<b>Sam'), crew: Object.values(window.__board.state.crew).sort().join(''), card: !!document.querySelector('.cb-rolecard'), back: document.querySelector('.cb-rolecard').textContent })`);
    expect(joined.mine === 7 && joined.crew === '123456789', 'the viewer has the character chosen, and every seat has a different one', JSON.stringify(joined));
    expect(joined.name === '1Sam <b>' && joined.markup === false, 'the tag carries the seat number and the name, as text', joined.name);
    expect(joined.card && joined.back === 'Private', 'a role card lies in the hand, and its back says only "Private"', joined.back);
    const stood = await page.evaluate(STANDING);
    expect(stood.pieces === 9 && stood.outside.length === 0, 'every piece stands inside its room', JSON.stringify(stood));
    expect(stood.touching === 0, 'no name tag touches another');
    const leak = await page.evaluate(PUBLIC_LEAK);
    expect(leak.named.length === 0 && leak.drawn === 0, 'nothing of a role is outside the private sheet', JSON.stringify(leak));

    // ---------- a move ----------
    expect(await page.evaluate(offered) === 'room-b', 'from Room A, and not Captain, the one room offered is Room B', await page.evaluate(offered));
    await page.evaluate(click('.cb-panel[data-room="hospital"]'));
    expect(await page.evaluate(`window.__board.state.mode`) === 'idle', 'the Hospital cannot be chosen');
    await page.evaluate(click('.cb-panel[data-room="room-b"]'));
    const picked = await page.evaluate(`({ mode: window.__board.state.mode, prompt: document.querySelector('.cb-card__prompt').textContent, selected: document.querySelector('.cb-panel[data-selected]')?.dataset.room })`);
    expect(picked.mode === 'confirming' && picked.prompt === 'Move to Room B?' && picked.selected === 'room-b', 'pressing a room asks before anything is sent', JSON.stringify(picked));
    expect(await page.evaluate(`window.__board.state.seats[0].location`) === 'Room A', 'nothing moves before the move is confirmed');
    await page.evaluate(click('.cb-card .cb-button--primary'));
    await page.waitFor(`window.__board.state.mode === 'accepted' && ${idle}`, 'the move is accepted and the cue has played');
    const moved = await page.evaluate(`({ where: window.__board.state.seats[0].location, here: document.querySelector('.cb-panel[data-here]').dataset.room, status: document.querySelector('.cb-card__status').textContent })`);
    expect(moved.where === 'Room B' && moved.here === 'room-b' && moved.status === 'Accepted', 'the piece is in Room B and the card says Accepted', JSON.stringify(moved));
    const after = await page.evaluate(STANDING);
    expect(after.outside.length === 0 && after.touching === 0 && after.leftovers === 0, 'after the move every piece is in its room and the cue left nothing behind', JSON.stringify(after));
    await page.evaluate(click('.cb-card .cb-button'));
    expect(await page.evaluate(offered) === '' && await page.evaluate(`document.querySelector('.cb-card__status').textContent`) === 'Not available', 'one move a round: nothing is offered after it');

    // Another player's move is the same cue, from the public fact.
    await page.evaluate(`window.__board.otherPlayerMoves()`);
    await page.waitFor(idle, "another player's move has played");
    const other = await page.evaluate(STANDING);
    expect(other.outside.length === 0 && other.leftovers === 0, "another player's move leaves every piece in its room", JSON.stringify(other));

    // A refused move, and a lost connection.
    await page.evaluate(`window.__board.nextRound()`);
    await page.evaluate(`(() => { window.__board.state.refuseNext = true; })()`);
    await page.evaluate(click('.cb-panel[data-room="room-a"]'));
    await page.evaluate(click('.cb-card .cb-button--primary'));
    await page.waitFor(`window.__board.state.mode === 'not-accepted'`, 'the move is refused');
    expect(await page.evaluate(`window.__board.state.seats[0].location`) === 'Room B', 'a refused move moves nothing');
    await page.evaluate(click('.cb-card .cb-button'));
    await page.evaluate(`(() => { window.__board.state.stale = true; window.__board.sync(); })()`);
    await page.evaluate(click('.cb-panel[data-room="room-a"]'));
    const stale = await page.evaluate(`({ mode: window.__board.state.mode, status: document.querySelector('.cb-card__status').textContent, banner: !document.getElementById('banner').hidden })`);
    expect(stale.mode === 'idle' && stale.status === 'Paused' && stale.banner, 'with the connection lost nothing can be chosen, and the page says so', JSON.stringify(stale));
    await page.evaluate(`(() => { window.__board.state.stale = false; window.__board.sync(); })()`);

    // ---------- the role card ----------
    const before = page.requests().length;
    await page.evaluate(click('.cb-rolecard'));
    await page.waitFor(`document.querySelector('.cb-private .cb-role__device svg')`, 'the role card is turned up');
    const up = await page.evaluate(`({ role: window.__board.state.role, device: document.querySelector('.cb-private .cb-role__device svg > g')?.id, person: !!document.querySelector('.cb-private .cb-role__person svg'), stand: getComputedStyle(document.querySelector('.cb-private [id$="-stand"]')).display })`);
    expect(up.device === `device-${up.role}-all` && up.person && up.stand === 'none', "the card shows the player's own character, without its stand, and the device of the role dealt", JSON.stringify(up));
    expect(page.requests().length === before, 'turning the card up asks for nothing', String(page.requests().length - before));
    for (const key of ROLE_KEYS) {
      await page.evaluate(`(() => { window.__board.closePrivate(); window.__board.state.roleWanted = ${JSON.stringify(key)}; window.__board.dealRole(); })()`);
      await page.evaluate(`window.__board.openPrivate()`);
      await page.waitFor(`document.querySelectorAll('.cb-private').length >= 1 && [...document.querySelectorAll('.cb-private .cb-role__device svg > g')].some(node => node.id === 'device-${key}-all')`, `the ${key} card is turned up`);
      const leakNow = await page.evaluate(PUBLIC_LEAK);
      expect(leakNow.named.length === 0 && leakNow.drawn === 0, `with the ${key} card up, nothing of the role is outside the private sheet`, JSON.stringify(leakNow));
    }
    expect(page.requests().length === before, 'dealing and turning up every role asks for nothing', String(page.requests().length - before));
    await page.evaluate(`(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); })()`);
    await page.waitFor(`!document.querySelector('.cb-private')`, 'the card turns face down when the page goes to the background');
    expect(true, 'the page going to the background turns the card face down');
    for (const problem of page.problems()) expect(false, 'the phone page had a problem', problem);
    await page.close();
  }

  // ---------- the Captain's phone ----------
  {
    const page = await open('?skip&viewer=5');
    expect(await page.evaluate(offered) === 'room-a,room-b', 'the Captain, in the Command Room, is offered Room A and Room B', await page.evaluate(offered));
    await page.evaluate(click('.cb-panel[data-room="room-a"]'));
    await page.evaluate(click('.cb-card .cb-button--primary'));
    await page.waitFor(`window.__board.state.mode === 'accepted' && ${idle}`, "the Captain's move has played");
    await page.evaluate(click('.cb-card .cb-button'));
    await page.evaluate(`window.__board.nextRound()`);
    expect(await page.evaluate(offered) === 'command,room-b', 'next round the Captain is offered the Command Room again', await page.evaluate(offered));
    for (const problem of page.problems()) expect(false, "the Captain's page had a problem", problem);
    await page.close();
  }

  // ---------- reduced motion ----------
  {
    const page = await open('?skip&motion=reduced&peek=officer');
    expect(await page.evaluate(`document.getAnimations().length`) === 0, 'under reduced motion nothing is animating, with the role card up', String(await page.evaluate(`document.getAnimations().length`)));
    await page.evaluate(`window.__board.closePrivate()`);
    await page.evaluate(click('.cb-panel[data-room="room-b"]'));
    await page.evaluate(click('.cb-card .cb-button--primary'));
    await page.waitFor(`window.__board.state.mode === 'accepted' && ${idle}`, 'the move is accepted under reduced motion');
    await page.waitFor(`document.getAnimations().length === 0`, 'the fade has ended');
    const still = await page.evaluate(STANDING);
    expect(still.outside.length === 0 && still.leftovers === 0 && await page.evaluate(`window.__board.state.seats[0].location`) === 'Room B', 'under reduced motion the piece is simply in Room B', JSON.stringify(still));
    for (const problem of page.problems()) expect(false, 'the reduced-motion page had a problem', problem);
    await page.close();
  }

  // ---------- the shared display ----------
  {
    const page = await open('?surface=table', { width: 1440, height: 900 });
    const table = await page.evaluate(`(() => { window.__board.dealRole(); return { chooser: !!document.querySelector('.cb-choose'), hand: document.getElementById('hand').childElementCount, you: document.querySelectorAll('.cb-token__you, .cb-token[data-mine]').length, here: document.querySelectorAll('.cb-panel[data-here]').length, role: window.__board.state.role, card: !!document.querySelector('.cb-rolecard, .cb-private') }; })()`);
    expect(!table.chooser && table.hand === 0 && table.you === 0 && table.here === 0, 'the shared display has no hand, no chooser and nothing that says whose it is', JSON.stringify(table));
    expect(table.role === null && !table.card, 'the shared display is never dealt a role and has no role card');
    const leak = await page.evaluate(PUBLIC_LEAK);
    expect(leak.named.length === 0 && leak.drawn === 0, 'nothing of a role is on the shared display', JSON.stringify(leak));
    await page.evaluate(`window.__board.otherPlayerMoves()`);
    await page.waitFor(idle, 'a move has played on the shared display');
    const stood = await page.evaluate(STANDING);
    expect(stood.pieces === 9 && stood.outside.length === 0 && stood.touching === 0 && stood.leftovers === 0, 'on the shared display every piece stands inside its room', JSON.stringify(stood));
    for (const problem of page.problems()) expect(false, 'the shared display had a problem', problem);
    await page.close();
  }

  browser.close();
} finally {
  await chrome.close();
  await server.close();
}

for (const failure of failures) console.error(`FAIL  ${failure}`);
console.log(`Comic-board walk: ${count} things looked for, ${failures.length} not found, in ${chrome.version}`);
if (failures.length > 0) process.exitCode = 1;
