// mothership:dev-only
//
// Clicks through the phone kit (design/phone-kit/, issue #121) on the board-motion prototype to show
// that it keeps its promises: the vote result arrives once, the same on every screen, never replays, is
// drawn settled on a late join, and leaves at once for the next phase; the private Hack offers every
// target the same three sides, sends one declaration, says "accepted" only on the server's answer, and
// vanishes from the page on the background, a stale view, an audience change or the match's end while a
// sent declaration keeps its recovery; the other screens never hold it; every phone loads the same
// files; and the clothes follow the public location. It tests the prototype, not the game:
//   node design/tools/phone-kit-flows.mjs          (needs a Chromium-based browser)
//   npm run flows:phone-kit --workspace @mothership/design-tokens

import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { startStaticServer } from './lib/static-server.mjs';

const server = await startStaticServer({ port: 0 });
const launched = await launchBrowser({});
const browser = await connect(launched.endpoint);
const results = [];
const ok = (name, cond, extra = '') => results.push(`${cond ? 'ok  ' : 'FAIL'}  ${name}${!cond && extra !== '' ? ` — ${typeof extra === 'string' ? extra : JSON.stringify(extra)}` : ''}`);
const js = value => JSON.stringify(value);

async function open(scenario, extra = '') {
  const page = await openPage(browser, { width: 1440, height: 1000 });
  await page.goto(`${server.origin}/board-motion/?scenario=${scenario}${extra ? `&${extra}` : ''}`, 'window.__designReady === true');
  await sleep(150);
  return page;
}
const click = (page, selector) => page.evaluate(`(() => { const n = document.querySelector(${js(selector)}); if (!n) return false; n.click(); return true; })()`);
const event = (page, id) => click(page, `[data-event="${id}"]`);
const privateEvent = (page, id) => click(page, `[data-private-event="${id}"]`);
const state = page => page.evaluate('window.__bmState');
const hack = page => page.evaluate(`(() => { const n = document.querySelector('#bm-app #pk-hack'); return n ? { stage: n.dataset.stage, step: n.dataset.step ?? null, audience: n.dataset.audience, compact: n.dataset.compact === 'true', beat: n.dataset.beat ?? null, heading: n.querySelector('#pk-hack-heading')?.textContent ?? null, html: n.outerHTML } : null; })()`);
const result = page => page.evaluate(`(() => { const n = document.querySelector('#bm-app #pk-vote-result'); return n ? { id: n.dataset.resultId, variant: n.dataset.variant, beat: n.dataset.beat } : null; })()`);
const observerPrivate = page => page.evaluate(`(() => { const o = document.querySelector('[data-observer]'); if (!o) return ['no observer']; return [...o.querySelectorAll('.pk-hack, [data-private], [data-art^="hack-"]')].map(n => n.className || n.tagName).concat(/claims|declared|Declare your side/i.test(o.textContent) ? ['a claim in the words'] : []); })()`);
const notice = page => page.evaluate(`document.querySelector('#bm-app .bm-notice')?.textContent ?? null`);
const livePublic = page => page.evaluate(`[...document.querySelectorAll('#bm-live p')].map(p => p.textContent)`);
const livePrivate = page => page.evaluate(`[...document.querySelectorAll('#bm-live-private p')].map(p => p.textContent)`);
const panelAnimations = (page, selector) => page.evaluate(`document.getAnimations().filter(a => a.effect?.target instanceof Element && a.effect.target.closest(${js(selector)})).map(a => ({ props: [...new Set(a.effect.getKeyframes().flatMap(k => Object.keys(k).filter(p => !['offset', 'easing', 'composite', 'computedOffset'].includes(p))))], start: a.startTime, target: a.effect.target.className }))`);
const hide = page => page.evaluate(`(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); })()`);
const show = page => page.evaluate(`(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); })()`);
const timer = page => page.evaluate(`document.querySelector('#bm-app .bm-timer')?.textContent ?? null`);

// ---------- B: the vote result ----------
{
  const page = await open('vote.election', 'freeze=1');
  await click(page, '#bm-nav-card');
  await event(page, 'close-vote');
  await sleep(120);
  const first = await result(page);
  ok('result: the vote closes into its five-second result, played as it arrives', first?.variant === 'captain' && first.beat === 'live', first);
  ok('result: the other screens draw the same public panel', await page.evaluate(`Boolean(document.querySelector('[data-observer] .pk-vr[data-result-id="${first?.id}"]'))`));
  ok('result: the card closes when the result opens (a sent command keeps its recovery)', (await state(page)).view === 'board');
  const said = (await livePublic(page)).filter(text => /Elected Captain/.test(text));
  ok('result: the release\'s sentence is said once', said.length === 1, said);
  const before = await panelAnimations(page, '#pk-vote-result');
  await event(page, 'replay');
  await sleep(80);
  const after = await panelAnimations(page, '#pk-vote-result');
  ok('result: a duplicate snapshot replays nothing', (await result(page))?.id === first?.id && JSON.stringify(after.map(a => a.start)) === JSON.stringify(before.map(a => a.start)), { before: before.length, after: after.length });
  ok('result: still said once after the duplicate', (await livePublic(page)).filter(text => /Elected Captain/.test(text)).length === 1);
  await click(page, '#bm-app [data-move-room="Room B"]');
  ok('result: nothing on the board is offered meanwhile (no target; a room tag says it cannot move)', await page.evaluate(`document.querySelectorAll('#bm-app .bm-piece__target').length === 0`) && (await notice(page)) === 'You cannot move to that room right now.' && (await state(page)).flow.step === 'idle');
  await event(page, 'result-ends');
  await sleep(80);
  ok('result: the next phase removes it at once and opens with its own full minute', (await result(page)) === null && (await timer(page)) === '1:00' && !(await page.evaluate(`Boolean(document.querySelector('[data-observer] .pk-vr'))`)));
  await page.close();
}
{
  const page = await open('result.late', 'freeze=1');
  const late = await result(page);
  const animations = await panelAnimations(page, '#pk-vote-result');
  ok('result: a late join (3.2 s) is drawn settled, with its exit only', late?.beat === 'settled' && animations.length === 1, { late, animations });
  await page.close();
}
{
  const page = await open('result.captain', 'freeze=1&motion=reduced&play=result');
  await sleep(80);
  const props = (await panelAnimations(page, '#pk-vote-result')).flatMap(a => a.props);
  ok('result: reduced motion fades it only (no travel, no scale)', props.length > 0 && props.every(prop => prop === 'opacity'), props);
  await page.close();
}

// ---------- D: the private Hack ----------
{
  // One page at a time: a second page would send the first to the background, which conceals its private panel.
  const requests = page => page.requests().map(address => new URL(address).pathname).sort().join('\n');
  const a = await open('hack.declare', 'freeze=1');
  const one = await hack(a);
  ok('hack: the order is Blue, Red, Alien', await a.evaluate(`[...document.querySelectorAll('.pk-hack__side')].map(n => n.textContent).join(',') === 'Blue,Red,Alien'`));
  ok('hack: the other screens hold nothing of it', (await observerPrivate(a)).length === 0, await observerPrivate(a));
  const hackRequests = requests(a);
  await a.close();
  const b = await open('hack.declare-undercover', 'freeze=1');
  const other = await hack(b);
  await b.close();
  ok('hack: every target gets the same panel and the same three sides, whatever its role', Boolean(one) && one.html === other?.html && (one.html.match(/class="pk-hack__side"/g) ?? []).length === 3, { one: one?.html.length, other: other?.html.length });
  const plain = await open('board.idle', 'freeze=1');
  ok('hack: a participant\'s phone loads exactly the files of any other phone (nothing for a claim, a side or a role)', hackRequests === requests(plain), { hack: hackRequests.split('\n').length, plain: plain.requests().length });
  await plain.close();
  // One command at a time: a side chosen blocks a move; a move open keeps the panel to one line, without its controls.
  const c = await open('hack.declare', 'freeze=1');
  await click(c, '[data-act="declare:Red"]');
  await click(c, '[data-move-room="Room B"]');
  ok('hack: a side chosen and not sent blocks a room-tag move', (await notice(c)) === 'Finish or cancel the current action first.' && (await state(c)).flow.step === 'idle');
  await click(c, '[data-act="declare-back"]');
  await click(c, '[data-move-room="Room B"]');
  const compact = await hack(c);
  ok('hack: a move open in the prelude keeps the panel to one line, its controls out of the way', compact?.compact === true && (await state(c)).flow.kind === 'move' && await c.evaluate(`getComputedStyle(document.querySelector('.pk-hack__sides')).display === 'none'`), compact);
  await click(c, '#bm-strip [data-act="back"]');
  ok('hack: the move cancelled, the panel is whole again', (await hack(c))?.compact === false);
  await c.close();
}
{
  const page = await open('hack.declare');
  await click(page, '[data-act="declare:Alien"]');
  ok('hack: choosing asks to confirm and sends nothing', (await hack(page))?.step === 'confirming' && (await state(page)).requests.sent === 0);
  await click(page, '[data-act="declare-confirm"]');
  ok('hack: confirmed, one declaration is on its way', (await hack(page))?.step === 'sending' && (await state(page)).requests.sent === 1);
  await click(page, '[data-act="declare-confirm"]');
  ok('hack: nothing is sent twice', (await state(page)).requests.sent === 1);
  await sleep(800);
  ok('hack: "declared" only once the server accepted', (await hack(page))?.step === 'accepted' && (await livePrivate(page)).includes('You declared Alien.'));
  await sleep(700);
  const own = await hack(page);
  ok('hack: the accepted declaration ends the window early: the target sees what it declared, privately', (await state(page)).phase === 'HACK_RESULT' && own?.stage === 'result' && /You declared Alien/.test(own.heading ?? ''), own?.heading);
  ok('hack: the other screens see the phase only', (await observerPrivate(page)).length === 0);
  await page.close();
}
for (const [answer, step] of [['reject', 'not-accepted'], ['lose', 'unknown']]) {
  const page = await open('hack.declare', `answer=${answer}`);
  await click(page, '[data-act="declare:Red"]');
  await click(page, '[data-act="declare-confirm"]');
  await sleep(800);
  const now = await hack(page);
  ok(`hack: a ${answer === 'reject' ? 'refused' : 'lost'} answer is ${step}, never "declared"`, now?.step === step && (await state(page)).phase === 'HACK_DECLARE', now);
  if (answer === 'reject') ok('hack: not accepted, the three sides are offered again', await page.evaluate(`document.querySelectorAll('.pk-hack__side[aria-disabled="false"]').length === 3`));
  await page.close();
}
{
  // The background: the panel leaves the page; a sent declaration keeps its recovery; the foreground does not bring it back by itself.
  const page = await open('hack.declare', 'answer=slow');
  await click(page, '[data-act="declare:Blue"]');
  await click(page, '[data-act="declare-confirm"]');
  await hide(page);
  ok('hack/background: nothing of the panel is in the page', (await hack(page)) === null && (await page.evaluate(`document.querySelectorAll('#bm-app .pk-hack, #bm-app [data-art^="hack-"]').length`)) === 0);
  ok('hack/background: the sent declaration keeps its recovery', (await state(page)).hackFlow.step === 'sending');
  await show(page);
  ok('hack/background: back in the foreground it stays hidden until the player asks', (await hack(page)) === null);
  await click(page, '#bm-nav-actions');
  ok('hack/background: Actions brings it back, as it is now', (await hack(page))?.step === 'sending');
  await page.close();
}
{
  const page = await open('hack.declare', 'freeze=1');
  await click(page, '[data-act="declare:Red"]');
  await hide(page);
  await show(page);
  ok('hack/background: a side chosen and not sent is dropped and said so', (await state(page)).hackFlow.step === 'idle' && (await notice(page)) === 'Your choice was not sent.');
  await page.close();
}
{
  const page = await open('hack.claim-red', 'freeze=1');
  await click(page, '#bm-stale');
  ok('hack/stale: an out-of-date view removes the claim', (await hack(page)) === null);
  await click(page, '#bm-fresh');
  ok('hack/stale: a fresh view does not bring it back by itself', (await hack(page)) === null);
  await click(page, '#bm-nav-card');
  await click(page, '#bm-card [data-act="close"]');
  const back = await hack(page);
  ok('hack/stale: reopened, the claim is drawn settled, not played again', back?.stage === 'result' && back.beat === 'settled', back);
  await privateEvent(page, 'hack-audience');
  ok('hack: an audience change (no hackFeedback) removes it at once', (await hack(page)) === null);
  await page.close();
}
{
  const page = await open('hack.waiting', 'freeze=1');
  ok('hack: the initiator waits for the declaration, no control offered', (await hack(page))?.stage === 'declare' && (await page.evaluate(`document.querySelectorAll('#pk-hack button').length`)) === 0);
  await privateEvent(page, 'hack-declared-red');
  await sleep(80);
  const claim = await hack(page);
  ok('hack: the claim arrives and plays once, as a claim', claim?.stage === 'result' && claim.beat === 'live' && /Player 5 claims Red/.test(claim.heading ?? '') && /not a verified side/.test(claim.html));
  ok('hack: the claim is said once, privately', (await livePrivate(page)).filter(text => /claims Red/.test(text)).length === 1 && !(await livePublic(page)).some(text => /claims/.test(text)));
  const before = await panelAnimations(page, '#pk-hack');
  await event(page, 'replay');
  await sleep(60);
  ok('hack: a duplicate snapshot does not play the claim again', JSON.stringify((await panelAnimations(page, '#pk-hack')).map(a => a.start)) === JSON.stringify(before.map(a => a.start)) && (await livePrivate(page)).filter(text => /claims Red/.test(text)).length === 1);
  ok('hack: the other screens see the phase only', (await observerPrivate(page)).length === 0);
  await event(page, 'hack-result-ends');
  ok('hack: the claim\'s five seconds end into the full minute\'s talk', (await hack(page))?.stage === 'talk' && (await timer(page)) === '1:00' && /Claimed: Red, not verified/.test((await hack(page))?.html ?? ''));
  await event(page, 'hack-ends');
  ok('hack: the talk ends: the panel and the claim leave the page', (await hack(page)) === null && (await state(page)).phase === 'ORDINARY_TURN');
  await page.close();
}
{
  const page = await open('hack.declare', 'freeze=1');
  await event(page, 'hack-declare-ends');
  const none = await hack(page);
  ok('hack: no declaration in time is "No side declared", never a side', none?.stage === 'result' && /No side declared/.test(none.heading ?? '') && !/Blue|Red|Alien/.test((none.heading ?? '').replace('No side declared', '')));
  await event(page, 'abort');
  ok('hack: the match\'s end removes it', (await hack(page)) === null && (await state(page)).hackFlow.step === 'idle');
  await page.close();
}
{
  const page = await open('hack.claim-late', 'freeze=1');
  ok('hack: a late join (3.2 s) draws the claim settled', (await hack(page))?.beat === 'settled');
  await page.close();
  const reduced = await open('hack.claim-red', 'freeze=1&motion=reduced&play=claim');
  await sleep(60);
  const props = (await panelAnimations(reduced, '#pk-hack')).flatMap(a => a.props);
  ok('hack: reduced motion fades the claim only', props.length > 0 && props.every(prop => prop === 'opacity'), props);
  await reduced.close();
}
{
  const page = await open('hack.declare', 'freeze=1');
  await click(page, '#bm-nav-actions');
  ok('hack: the Actions tray names the declaration', await page.evaluate(`Boolean(document.querySelector('#bm-open-declare'))`));
  await click(page, '#bm-open-declare');
  ok('hack: the tray\'s chip leads to the panel, its heading focused', (await state(page)).view === 'board' && (await page.evaluate(`document.activeElement?.id`)) === 'pk-hack-heading');
  await page.evaluate(`window.dispatchEvent(new Event('pagehide'))`);
  ok('hack: the page disposed, nothing of it is left', (await hack(page)) === null && (await state(page)).disposed === true);
  await page.close();
  const outsider = await open('hack.public', 'freeze=1');
  await click(outsider, '#bm-nav-actions');
  ok('hack: a phone outside the Hack draws no panel and offers no declaration', (await hack(outsider)) === null && !(await outsider.evaluate(`Boolean(document.querySelector('#bm-open-declare'))`)));
  await outsider.close();
}

// ---------- C: the room clothes ----------
{
  const page = await open('clothes.waiting', 'freeze=1');
  const seat = n => page.evaluate(`(() => { const p = document.querySelector('#bm-app .bm-piece[data-seat="${n}"]'); return p ? { outfit: p.dataset.outfit, jailedBadge: Boolean(p.querySelector('[data-badge="jailed"], .bm-badge--jailed')), room: p.closest('.bm-room')?.dataset.room } : null; })()`);
  const waiting = await seat(9), jailed = await seat(2);
  ok('clothes: the released, Injured player waiting in the Jail wears the Jail suit, without a Jailed badge', waiting?.outfit === 'prison' && waiting.room === 'jail' && !waiting.jailedBadge, waiting);
  ok('clothes: the jailed player beside them wears the same suit, badges independent', jailed?.outfit === 'prison' && jailed.room === 'jail', jailed);
  ok('clothes: the Hospital in gowns, every other room in the crew suit', (await seat(1))?.outfit === 'gown' && (await seat(3))?.outfit === 'crew' && (await seat(7))?.outfit === 'crew');
  const same = await page.evaluate(`[...document.querySelectorAll('#bm-app .bm-piece')].every(p => document.querySelector('[data-observer] .bm-piece[data-seat="' + p.dataset.seat + '"]')?.dataset.outfit === p.dataset.outfit)`);
  ok('clothes: the other screens dress every character alike', same);
  await page.close();
}
{
  const page = await open('board.idle');
  const outfit = () => page.evaluate(`document.querySelector('#bm-app .bm-piece[data-seat="5"]')?.dataset.outfit`);
  await event(page, 'injure');
  await event(page, 'to-hospital');
  await sleep(250);
  // Mid-walk: the flyer is the figure on its way, drawn in the room it is leaving (the gown's print is its pattern "-print").
  const walking = await page.evaluate(`(() => { const f = document.querySelector('#bm-app .bm-fx .bm-flyer'); return f ? { drawn: Boolean(f.querySelector('svg')), gown: Boolean(f.querySelector('pattern[id$="-print"]')) } : null; })()`);
  ok('clothes: on the way to the Hospital the figure walks in its crew suit', walking?.drawn === true && walking.gown === false, walking);
  await sleep(2600);
  ok('clothes: arrived in the Hospital, it wears the gown', (await outfit()) === 'gown', await outfit());
  await page.close();
  const reduced = await open('board.idle', 'motion=reduced');
  await event(reduced, 'injure');
  await event(reduced, 'to-hospital');
  await sleep(200);
  ok('clothes: reduced motion: in the gown at once', (await reduced.evaluate(`document.querySelector('#bm-app .bm-piece[data-seat="5"]')?.dataset.outfit`)) === 'gown');
  await reduced.close();
}

browser.close();
await launched.close();
await server.close();
for (const line of results) console.log(line);
const failed = results.filter(line => line.startsWith('FAIL'));
console.log(`Phone-kit flows: ${results.length - failed.length} passed, ${failed.length} failed`);
if (failed.length) process.exitCode = 1;
