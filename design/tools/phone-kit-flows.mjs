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
// The window losing focus, and getting it back, while the document stays visible (another window or a system sheet in front).
const blur = page => page.evaluate(`(() => { window.dispatchEvent(new FocusEvent('blur')); return document.visibilityState; })()`);
const focus = page => page.evaluate(`(() => { window.dispatchEvent(new FocusEvent('focus')); return document.visibilityState; })()`);
/** Every trace of the private Hack in this phone: its panel, its pictures, its controls, its words and live lines, its running animations. */
const hackTraces = page => page.evaluate(`(() => {
  const app = document.querySelector('#bm-app');
  const found = [...app.querySelectorAll('.pk-hack, [data-art^="hack-"], [data-act^="declare"]')].map(n => n.id || n.className || n.tagName);
  const words = app.cloneNode(true); words.querySelector('#bm-live')?.remove();
  if (/claims|You declared|Claimed:|No side declared|Declare your side|Declare (Blue|Red|Alien)|Sending your declaration|No answer yet|Waiting for Player/.test(words.textContent)) found.push('Hack words');
  const running = document.getAnimations().filter(a => a.playState !== 'finished' && a.effect?.target instanceof Element && a.effect.target.closest('.pk-hack')).length;
  if (running) found.push(running + ' animations');
  return found;
})()`);
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

// ---------- D: the window losing focus while the page stays visible (review of PR #127) ----------
{
  // The review's reproduction: hack.claim-red, then a window blur with the document still visible.
  const page = await open('hack.claim-red', 'freeze=1');
  const before = await hack(page);
  ok('hack/blur: the claim is drawn before the blur', before?.stage === 'result' && /Player 5 claims/.test(before.heading ?? ''), before?.heading);
  const visibility = await blur(page);
  ok('hack/blur: the document is still visible', visibility === 'visible');
  ok('hack/blur: nothing of the panel, its pictures, its words or its animations is left in the page', (await hackTraces(page)).length === 0, await hackTraces(page));
  ok('hack/blur: the private live lines are cleared', (await livePrivate(page)).length === 0, await livePrivate(page));
  ok('hack/blur: the page is concealed', (await state(page)).concealed === true && (await state(page)).hack === null);
  await focus(page);
  ok('hack/blur: focus coming back does not bring it back', (await hackTraces(page)).length === 0 && (await state(page)).concealed === true, await hackTraces(page));
  await sleep(1000);
  ok('hack/blur: nothing scheduled brings it back', (await hackTraces(page)).length === 0);
  await click(page, '#bm-nav-actions');
  const back = await hack(page);
  ok('hack/blur: the player\'s own tap (Actions) brings it back, settled, as the view is now', back?.stage === 'result' && back.beat === 'settled' && /Player 5 claims/.test(back.heading ?? ''), back);
  ok('hack/blur: reopened, the claim is not said again', (await livePrivate(page)).filter(text => /claims Red/.test(text)).length === 0, await livePrivate(page));
  ok('hack/blur: the other screens never hold it', (await observerPrivate(page)).length === 0, await observerPrivate(page));
  await page.close();
}
{
  // A claim arriving live: its animations and its settle are running when the window loses focus; the server's own
  // continuation (the claim's five seconds ending into the talk) still comes, and still draws nothing private.
  const page = await open('hack.waiting');
  await privateEvent(page, 'hack-declared-red');
  await sleep(60);
  const live = await hack(page);
  const running = (await panelAnimations(page, '#pk-hack')).length;
  ok('hack/blur: a claim arriving live plays', live?.beat === 'live' && running > 0, { beat: live?.beat, running });
  await blur(page);
  ok('hack/blur: mid-play, the claim and its animations leave at once', (await hackTraces(page)).length === 0 && (await livePrivate(page)).length === 0, await hackTraces(page));
  await sleep(1100);
  ok('hack/blur: past the claim\'s settle, nothing has come back', (await hackTraces(page)).length === 0, await hackTraces(page));
  await sleep(4600);
  const later = await state(page);
  ok('hack/blur: the server\'s next phase (the talk) arrives, and draws nothing private while concealed', later.phase === 'HACK' && (await hackTraces(page)).length === 0 && (await livePrivate(page)).length === 0, { phase: later.phase, traces: await hackTraces(page) });
  await focus(page);
  await click(page, '#bm-nav-card');
  await click(page, '#bm-card [data-act="close"]');
  const talk = await hack(page);
  ok('hack/blur: reopened with Card, the panel is the current phase\'s (the talk)', talk?.stage === 'talk' && /Claimed: Red, not verified/.test(talk.html), talk?.stage);
  await page.close();
}
{
  // Reopening needs a current view: out of date, the tap is refused; up to date again, it still waits for a tap.
  const page = await open('hack.claim-red', 'freeze=1');
  await blur(page);
  await click(page, '#bm-stale');
  await focus(page);
  await click(page, '#bm-nav-actions');
  ok('hack/blur: an out-of-date view keeps it hidden even on the player\'s tap', (await hackTraces(page)).length === 0, await hackTraces(page));
  await click(page, '#bm-fresh');
  ok('hack/blur: the view current again, it still waits for a tap', (await hackTraces(page)).length === 0);
  await click(page, '#bm-nav-card');
  await click(page, '#bm-card [data-act="close"]');
  ok('hack/blur: tapped on a current view, it is back', (await hack(page))?.stage === 'result');
  await page.close();
}
{
  // Feedback that stops being this phase's while concealed: the tap on a current view still draws nothing of it.
  const page = await open('hack.claim-red', 'freeze=1');
  await blur(page);
  await privateEvent(page, 'hack-stale-other');
  await focus(page);
  await click(page, '#bm-nav-actions');
  ok('hack/blur: reopened on another exchange\'s feedback, nothing is drawn (no other claim, no "No side declared")', (await hackTraces(page)).length === 0, await hackTraces(page));
  await privateEvent(page, 'hack-current');
  const back = await hack(page);
  ok('hack/blur: this phase\'s own feedback again, the claim is back, settled', back?.beat === 'settled' && /claims/.test(back.heading ?? ''), back?.heading);
  await page.close();
}
{
  const page = await open('hack.declare', 'freeze=1');
  await click(page, '[data-act="declare:Red"]');
  ok('hack/blur: Red chosen, not sent', (await hack(page))?.step === 'confirming' && (await state(page)).requests.sent === 0);
  await blur(page);
  ok('hack/blur: a side chosen and not sent is dropped and said so; nothing is sent', (await state(page)).hackFlow.step === 'idle' && (await notice(page)) === 'Your choice was not sent.' && (await state(page)).requests.sent === 0);
  ok('hack/blur: the unsent choice leaves no trace', (await hackTraces(page)).length === 0, await hackTraces(page));
  await focus(page);
  await click(page, '#bm-nav-actions');
  await click(page, '#bm-open-declare');
  ok('hack/blur: reopened, the three sides are offered again, nothing chosen', (await hack(page))?.step === 'idle' && await page.evaluate(`document.querySelectorAll('.pk-hack__side[aria-disabled="false"]').length === 3`));
  await page.close();
}
{
  // Sent: the declaration keeps its recovery while concealed; the server's answer arrives unseen; nothing is resent.
  const page = await open('hack.declare', 'answer=slow');
  await click(page, '[data-act="declare:Red"]');
  await click(page, '[data-act="declare-confirm"]');
  ok('hack/blur: sending', (await hack(page))?.step === 'sending' && (await state(page)).requests.sent === 1);
  await blur(page);
  ok('hack/blur: sending, concealed: no panel, no words, the request kept', (await hackTraces(page)).length === 0 && (await state(page)).hackFlow.step === 'sending', await hackTraces(page));
  await sleep(3300);
  const after = await state(page);
  ok('hack/blur: the answer arrives while concealed: the claim\'s phase opens, nothing is drawn or said', after.phase === 'HACK_RESULT' && (await hackTraces(page)).length === 0 && (await livePrivate(page)).length === 0, { phase: after.phase, traces: await hackTraces(page), said: await livePrivate(page) });
  ok('hack/blur: nothing was sent again', after.requests.sent === 1 && after.requests.lookups === 0, after.requests);
  await focus(page);
  ok('hack/blur: focus back, still hidden', (await hackTraces(page)).length === 0);
  await click(page, '#bm-nav-actions');
  const own = await hack(page);
  ok('hack/blur: reopened, the target sees what it declared, settled', own?.stage === 'result' && own.beat === 'settled' && /You declared/.test(own.heading ?? ''), own?.heading);
  ok('hack/blur: still sent once', (await state(page)).requests.sent === 1);
  await page.close();
}
{
  const page = await open('hack.declare', 'answer=lose');
  await click(page, '[data-act="declare:Red"]');
  await click(page, '[data-act="declare-confirm"]');
  await sleep(800);
  ok('hack/blur: the answer lost: unknown', (await hack(page))?.step === 'unknown');
  await blur(page);
  ok('hack/blur: unknown, concealed: no panel, no words, the unknown outcome kept', (await hackTraces(page)).length === 0 && (await state(page)).hackFlow.step === 'unknown', await hackTraces(page));
  await focus(page);
  await sleep(900);
  const kept = await state(page);
  ok('hack/blur: focus back: still hidden, nothing resent or checked by itself', (await hackTraces(page)).length === 0 && kept.requests.sent === 1 && kept.requests.lookups === 0, kept.requests);
  await click(page, '#bm-nav-actions');
  const unknown = await hack(page);
  ok('hack/blur: reopened, the unknown outcome is where it was', unknown?.step === 'unknown' && /No answer yet/.test(unknown.heading ?? ''), unknown?.heading);
  await page.close();
}
{
  // Only the private surfaces go on a blur: the public board is still in sight, and its motion plays on, on this phone and
  // on the other screens; the background (nobody watching) still settles it at once.
  const running = `(sel => document.getAnimations().filter(a => a.playState === 'running' && a.effect?.target instanceof Element && a.effect.target.closest(sel)).length)`;
  const counts = action => `(() => { const n = ${running}; const before = { phone: n('#bm-app .bm-board'), other: n('[data-observer] .bm-board') }; ${action}; return { before, after: { phone: n('#bm-app .bm-board'), other: n('[data-observer] .bm-board') }, concealed: window.__bmState.concealed }; })()`;
  const page = await open('board.idle');
  await event(page, 'move');
  await sleep(150);
  const kept = await page.evaluate(counts(`window.dispatchEvent(new FocusEvent('blur'))`));
  ok('hack/blur: the public board\'s motion plays on, on this phone and the other screens', kept.concealed && kept.before.phone > 0 && kept.before.other > 0 && kept.after.phone === kept.before.phone && kept.after.other === kept.before.other, kept);
  await page.close();
  const hidden = await open('board.idle');
  await event(hidden, 'move');
  await sleep(150);
  const settled = await hidden.evaluate(counts(`Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange'))`));
  ok('hack/background: the background still settles the public motion at once', settled.before.phone > 0 && settled.after.phone === 0 && settled.after.other === 0, settled);
  await hidden.close();
}
{
  // Reduced motion: concealed and reopened the same way; reopened, the claim only fades.
  const page = await open('hack.claim-red', 'freeze=1&motion=reduced&play=claim');
  await sleep(40);
  await blur(page);
  ok('hack/blur: reduced motion: concealed the same way', (await hackTraces(page)).length === 0, await hackTraces(page));
  await focus(page);
  await click(page, '#bm-nav-actions');
  const props = (await panelAnimations(page, '#pk-hack')).flatMap(a => a.props);
  ok('hack/blur: reduced motion: reopened, settled, fades only', (await hack(page))?.beat === 'settled' && props.every(prop => prop === 'opacity'), props);
  // Disposed: the page stops listening; a later blur changes nothing.
  await page.evaluate(`window.dispatchEvent(new Event('pagehide'))`);
  const disposed = await state(page);
  await blur(page);
  ok('hack/blur: after the page is disposed, a blur changes nothing', JSON.stringify(await state(page)) === JSON.stringify(disposed) && disposed.disposed === true);
  await page.close();
}

// ---------- D: Hack feedback bound to the current phase (review of PR #127) ----------
{
  // HACK_RESULT given another exchange's feedback (a claim of Blue, consistent in itself): nothing, never a wrong claim.
  const page = await open('hack.claim-red', 'freeze=1');
  ok('hack/phase: the current claim is drawn and said once', /claims/.test((await hack(page))?.heading ?? '') && (await livePrivate(page)).filter(text => /claims Red/.test(text)).length === 1);
  await privateEvent(page, 'hack-stale-other');
  ok('hack/phase: another exchange\'s feedback draws nothing: no panel, no Blue, no "No side declared"', (await hackTraces(page)).length === 0, await hackTraces(page));
  ok('hack/phase: and says nothing', !(await livePrivate(page)).some(text => /Blue|No side declared/.test(text)), await livePrivate(page));
  await privateEvent(page, 'hack-current');
  const back = await hack(page);
  ok('hack/phase: this phase\'s own feedback again: the claim, settled, not said again', back?.beat === 'settled' && /claims/.test(back.heading ?? '') && (await livePrivate(page)).filter(text => /claims Red/.test(text)).length === 0, back?.heading);
  await page.close();
}
{
  // HACK (the talk) given the claim's feedback (the same exchange's previous phase): refused by its phase id alone.
  const page = await open('hack.talk', 'freeze=1');
  ok('hack/phase: the talk is drawn', (await hack(page))?.stage === 'talk');
  await privateEvent(page, 'hack-stale-earlier');
  ok('hack/phase: the exchange\'s earlier phase\'s feedback draws nothing', (await hackTraces(page)).length === 0, await hackTraces(page));
  await privateEvent(page, 'hack-current');
  ok('hack/phase: the talk is back with its own feedback', (await hack(page))?.stage === 'talk');
  await page.close();
}
{
  // HACK_RESULT given the declaration window's feedback (AWAITING): no panel, never the declare stage again.
  const page = await open('hack.own-claim', 'freeze=1');
  await privateEvent(page, 'hack-stale-earlier');
  ok('hack/phase: the claim\'s phase given the declaration window\'s feedback draws nothing (no side buttons again)', (await hackTraces(page)).length === 0, await hackTraces(page));
  await page.close();
}
{
  // A side chosen and not sent does not outlive the feedback it was chosen on.
  const page = await open('hack.declare-confirm', 'freeze=1');
  await privateEvent(page, 'hack-stale-other');
  ok('hack/phase: refused feedback drops the unsent side and says so; nothing is sent', (await state(page)).hackFlow.step === 'idle' && (await notice(page)) === 'Your choice was not sent.' && (await state(page)).requests.sent === 0 && (await hackTraces(page)).length === 0);
  await privateEvent(page, 'hack-current');
  ok('hack/phase: its own feedback again: choosing, nothing chosen', (await hack(page))?.step === 'idle');
  await page.close();
}
{
  // A sent declaration keeps its recovery while its view holds refused feedback; the server's answer binds the claim.
  const page = await open('hack.declare', 'answer=slow');
  await click(page, '[data-act="declare:Alien"]');
  await click(page, '[data-act="declare-confirm"]');
  await privateEvent(page, 'hack-stale-other');
  ok('hack/phase: sending, refused feedback: no panel, the request kept', (await hackTraces(page)).length === 0 && (await state(page)).hackFlow.step === 'sending' && (await state(page)).requests.sent === 1);
  await sleep(3300);
  const own = await hack(page);
  ok('hack/phase: the server\'s answer opens the claim with this phase\'s feedback', (await state(page)).phase === 'HACK_RESULT' && own?.stage === 'result' && /You declared/.test(own.heading ?? '') && (await state(page)).requests.sent === 1, own?.heading);
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
