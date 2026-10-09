// mothership:dev-only
// Actual hosted screen/controller/renderer/motion over the schema-checked synthetic desk.
// Faults are arranged in dev/board, never in production. No device/multiplayer acceptance.
// With the board Vite server on 5178:
//   node apps/game/dev/capture-board-recovery.mjs <output-directory>
// Add --explicit-full to run only the no-redraw OS preference regression at three sizes.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { connect, launchBrowser, openPage, sleep } from './capture/browser.mjs';
import { MEASURE, problemsOf } from './capture/board-measure.mjs';

globalThis[Symbol.for('mothership:dev-only')] = true;
const output = resolve(process.argv[2] ?? 'board-recovery-evidence');
await mkdir(output, { recursive: true });
const facts = [];
const lines = [];
const note = message => { lines.push(message); console.log(message); };
const browserProcess = await launchBrowser();
const browser = await connect(browserProcess.endpoint);
const SIZES = [[320, 568], [390, 844]];
const explicitFullOnly = process.argv.includes('--explicit-full');
const state = status => `document.querySelector('.phone-strip [data-status="${status}"]')`;
const marksEmpty = measured => measured.targets.length === 0 && measured.ghost === null && Object.values(measured.marks).every(seats => seats.length === 0);

async function open(scenario, size, query = '', display = false, fontSize = null) {
  const page = await openPage(browser, { width: size[0], height: size[1], scale: 1, mobile: !display, ownContext: true });
  // Observe native media-query ownership, forwarding registration/removal unchanged.
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
    const listeners = new Map();
    window.__mediaProbe = { count: () => [...listeners.values()].reduce((n, set) => n + set.size, 0) };
    for (const method of ['addEventListener', 'removeEventListener']) {
      const native = MediaQueryList.prototype[method];
      MediaQueryList.prototype[method] = function(type, listener, ...args) {
        if (type === 'change' && this.media === '(prefers-reduced-motion: reduce)') {
          if (!listeners.has(this)) listeners.set(this, new Set());
          if (method === 'addEventListener') listeners.get(this).add(listener);
          else listeners.get(this).delete(listener);
        }
        return native.call(this, type, listener, ...args);
      };
    }
  })()` });
  if (fontSize) await page.send('Page.setFontSizes', { fontSizes: { standard: fontSize } });
  await page.goto(`http://127.0.0.1:5178/?scenario=${scenario}${query}${display ? '&as=display' : ''}`, "window.__simulation && document.querySelector('.ms-board .ms-seat')", 20_000);
  await page.foreground();
  await page.waitFor("document.querySelector('.ms-shell[data-connection=\"live\"] .ms-timer[data-state=\"running\"]')", 'initial trusted running clock');
  await sleep(100);
  return page;
}
async function measure(page, name, { display = false, empty = false, screenshot = false } = {}) {
  const measured = await page.evaluate(MEASURE);
  const problems = problemsOf(measured, { phone: !display });
  assert.deepEqual(problems, [], name);
  assert.equal(await page.evaluate("[...document.querySelectorAll('.ms-phase__labels, .ms-timer')].some(node => node.scrollWidth > node.clientWidth + 1)"), false, `${name}: status words fit their own boxes`);
  if (empty) assert.ok(marksEmpty(measured), `${name}: no private board marks/targets/ghost`);
  if (display) {
    assert.deepEqual(measured.privateHooks, [], `${name}: public-only display`);
    assert.deepEqual(measured.roleWords, []);
  }
  // The only seat picker is the character button in its room, including during recovery.
  assert.equal(await page.evaluate("document.querySelectorAll('.phone-strip .ms-target[data-value^=\"seat-\"], .phone-action-dock .ms-targets').length"), 0, `${name}: no secondary player picker`);
  const record = { name, ...measured, problems };
  facts.push(record);
  if (screenshot) await page.screenshot(join(output, `${name}.png`), { viewport: true });
  note(`${name}: clean`);
  return record;
}
async function send(page, kind) {
  if (kind === 'move') await page.tap('#phone-move-room-b');
  else {
    await page.tap('#ms-phone-actions');
    await page.waitFor(`document.querySelector('#ms-action-open-${kind}')`, 'server offer in the tray');
    await page.tap(`#ms-action-open-${kind}`);
    await page.waitFor("document.querySelector('.phone-character-target[data-value=\"seat-6\"]')", 'offered character');
    await page.tap('.phone-character-target[data-value="seat-6"]');
  }
  await page.waitFor(state('confirming'), 'confirmation');
  await sleep(450);
  await page.tap('#ms-action-confirm');
}
const commandCount = page => page.evaluate('window.__simulation.log.length');

try {
  // Both effective preferences, on phones and display, during an actual native 900 ms flight.
  // Instrumentation counts native Animation.cancel calls; it does not replace animations.
  for (const size of [...SIZES, [1280, 720]]) for (const preference of explicitFullOnly ? ['system-explicit-full'] : ['in-app', 'system', 'system-explicit-full']) {
    const display = size[0] > 600;
    const page = await open('spread', size, '', display);
    const tag = `${size.join('x')}-${preference}`;
    try {
      if (preference === 'system-explicit-full') {
        // Real checkbox changes select reduced, then explicitly full. This prevents the
        // screen's effective model changing on an OS event; no snapshot/redraw is forced.
        await page.evaluate(`(() => {
          document.querySelector('#ms-phone-more')?.click();
          document.querySelector('#ms-reduce-motion').click();
          document.querySelector('#ms-reduce-motion').click();
          document.querySelector('#ms-phone-board')?.click();
          const media = matchMedia('(prefers-reduced-motion: reduce)');
          window.__systemProbe = { events: 0 };
          media.onchange = () => { window.__systemProbe.events++; };
        })()`);
        const frames = await page.evaluate('window.__simulation.frames');
        // Start just after a real timer frame, so the preference is observed before the
        // next timer boundary rather than accidentally settled by that unrelated redraw.
        await page.waitFor(`window.__simulation.frames > ${frames}`, 'timer boundary before the flight');
      }
      await page.evaluate(`(() => {
        const animate = Element.prototype.animate;
        window.__motionProbe = { starts: 0, cancellations: 0 };
        Element.prototype.animate = function(...args) {
          const animation = animate.apply(this, args);
          if (this.matches('.phone-fx__flyer, .ms-board .ms-seat')) {
            window.__motionProbe.starts++;
            const cancel = animation.cancel.bind(animation);
            animation.cancel = () => { window.__motionProbe.cancellations++; cancel(); };
          }
          return animation;
        };
        window.__simulation.move('Room B');
      })()`);
      await page.waitFor("document.querySelector('.phone-fx__flyer') && document.querySelector('.ms-seat[data-moving]')", 'active flight');
      const during = await page.evaluate("({ ...window.__motionProbe, fx: document.querySelectorAll('.phone-fx > *').length, frames: window.__simulation.frames, mediaListeners: window.__mediaProbe.count() })");
      assert.equal(during.fx, 3);
      if (preference.startsWith('system')) await page.media({ 'prefers-reduced-motion': 'reduce' });
      else await page.evaluate(`(() => {
        document.querySelector('#ms-phone-more')?.click();
        document.querySelector('#ms-reduce-motion').click();
      })()`);
      if (preference === 'system-explicit-full') {
        await page.waitFor('window.__systemProbe.events === 1', 'native OS preference delivered');
        assert.equal(await page.evaluate('window.__simulation.frames'), during.frames, 'OS reduction with explicit full emits no screen frame');
        assert.equal(await page.evaluate("document.querySelector('.phone-fx > *, .ms-seat[data-moving]') !== null"), false, 'native event settles travel without a redraw');
      } else await page.waitFor("!document.querySelector('.phone-fx > *, .ms-seat[data-moving]')", 'settled on preference change');
      const landed = await page.evaluate(`(() => {
        const piece = document.querySelector('.ms-board .ms-seat[data-seat="seat-3"]');
        return { ...window.__motionProbe, frames: window.__simulation.frames, room: piece.closest('.ms-zone').dataset.zone, visibility: getComputedStyle(piece).visibility };
      })()`);
      assert.ok(landed.cancellations > during.cancellations);
      assert.equal(landed.room, 'room-b');
      assert.equal(landed.visibility, 'visible');
      if (preference !== 'system-explicit-full') await page.evaluate('window.__simulation.redeliver()');
      await measure(page, `${tag}-settled`, { display, empty: true, screenshot: true });
      if (preference.startsWith('system')) await page.media({ 'prefers-reduced-motion': 'no-preference' });
      else await page.evaluate("document.querySelector('#ms-reduce-motion').click(); document.querySelector('#ms-phone-board')?.click()");
      // Native media-query change delivery is asynchronous. A genuinely later move must
      // begin after the screen has consumed the preference, rather than race that callback.
      await page.waitFor("document.querySelector('.ms-shell[data-motion=\"full\"]')", 'motion preference restored');
      if (preference === 'system-explicit-full') await page.waitFor('window.__systemProbe.events === 2', 'native OS reduction turned off');
      else await page.evaluate('window.__simulation.redeliver()');
      assert.equal(await page.evaluate('window.__motionProbe.starts'), landed.starts, 'same facts never replay when motion returns');
      await page.evaluate("window.__simulation.move('Room A')");
      await page.waitFor("document.querySelector('.phone-fx__flyer')", 'later move works');
      const beforeDispose = await page.evaluate('window.__motionProbe.cancellations');
      await page.evaluate('window.__simulation.dispose(); window.__simulation.dispose(); window.__simulation.redeliver()');
      assert.ok(await page.evaluate('window.__motionProbe.cancellations') > beforeDispose);
      assert.equal(await page.evaluate("document.querySelectorAll('#app > *, .phone-fx').length"), 0, 'disposal clears owned DOM/listeners');
      assert.equal(await page.evaluate('window.__mediaProbe.count()'), 0, 'all mounted media-query listeners are removed');
      await page.media({ 'prefers-reduced-motion': 'reduce' });
      await sleep(100);
      assert.equal(await page.evaluate("document.querySelectorAll('#app > *, .phone-fx').length"), 0, 'OS changes after disposal cannot revive the mounted host');
      facts.push({ name: `${tag}-lifecycle`, during, landed, disposed: true, replayed: false,
        ...(preference === 'system-explicit-full' ? { noRedrawOnReduction: landed.frames === during.frames } : {}), mediaListenersAfterDispose: 0 });
    } finally { await page.close(); }
  }

  if (!explicitFullOnly) {
  // Every reproduced in-flight combination: Rescue submitting/checking, Move
  // submitting/checking/accepted awaiting a view, each stale and expired, at both sizes.
  for (const size of SIZES) for (const paused of ['stale', 'expired']) {
    for (const [kind, status, answer] of [
      ['rescue', 'submitting', 'hang'], ['rescue', 'checking', 'lost'],
      ['move', 'submitting', 'hang'], ['move', 'checking', 'lost'], ['move', 'accepted', 'accept'],
    ]) {
      const query = `&answer=${answer}&latency=30&hold-move${paused === 'expired' ? '&time-left=5000' : ''}`;
      const page = await open(kind === 'move' ? 'spread' : 'rescue', size, query);
      const tag = `${size.join('x')}-${paused}-${kind}-${status}`;
      try {
        await send(page, kind);
        await page.waitFor(state(status), status);
        const active = await measure(page, `${tag}-current`);
        assert.ok(kind === 'move' ? active.ghost !== null : active.marks.pending.length > 0, 'the regression begins with a real mark');
        if (paused === 'stale') await page.evaluate('window.__simulation.stale()');
        else await page.waitFor("document.querySelector('.ms-timer[data-state=\"expired\"]')", 'trusted deadline expires', 7_000);
        await page.waitFor(state(status), `held ${status}`);
        await measure(page, `${tag}-paused`, { empty: true, screenshot: kind === 'move' && status === 'accepted' });
        assert.equal(await commandCount(page), 1);
        if (status === 'checking') {
          await page.evaluate('window.__simulation.recover()');
          await page.waitFor(state('accepted'), 'stored receipt recovers', 7_000);
          await measure(page, `${tag}-receipt`, { empty: true });
          assert.equal(await commandCount(page), 1, 'receipt lookup never duplicates the command');
        }
        if (status === 'accepted' && paused === 'stale') {
          await page.evaluate('window.__simulation.redeliver()');
          await page.waitFor("document.querySelector('.phone-move-ghost')", 'current view restores the held tentative place');
          await page.evaluate("window.__simulation.move('Room B')");
          await page.waitFor("!document.querySelector('.phone-move-ghost')", 'authoritative arrival removes ghost');
          assert.equal(await commandCount(page), 1);
        }
      } finally { await page.close(); }
    }
  }

  for (const size of SIZES) {
    // An unknown result and identifier-only reload: the synthetic desk holds its recorded
    // receipt outside the browser, like a server. The client never stores its private choice.
    const page = await open('rescue', size, '&answer=lost&latency=30');
    const tag = size.join('x');
    try {
      await send(page, 'rescue');
      await page.waitFor(state('unknown'), 'bounded checks become unknown', 12_000);
      await measure(page, `${tag}-unknown`, { empty: true, screenshot: true });
      const receipt = await page.evaluate('window.__simulation.receipt()');
      const kept = await page.evaluate("Object.values(sessionStorage).filter(value => { try { return JSON.parse(value).commandId; } catch { return false; } }).map(value => JSON.parse(value))");
      assert.equal(kept.length, 1);
      assert.deepEqual(Object.keys(kept[0]).sort(), ['commandId', 'matchId', 'phaseId', 'seatId']);
      assert.equal(await commandCount(page), 1);
      await page.reload("window.__simulation && document.querySelector('.ms-board .ms-seat')", 20_000);
      await page.tap('#ms-phone-actions');
      await page.waitFor(state('checking'), 'identifier-only checking after reload');
      await measure(page, `${tag}-reloaded-checking`, { empty: true });
      await page.evaluate(`window.__simulation.recover(${JSON.stringify(receipt)})`);
      await page.waitFor(state('accepted'), 'recovered durable receipt', 8_000);
      await measure(page, `${tag}-reloaded-accepted`, { empty: true, screenshot: true });
      assert.equal(await commandCount(page), 0, 'the reloaded client has no payload to resend');
      const lookups = await page.evaluate("window.__simulation.operations.filter(entry => entry.operation === 'v1Receipt')");
      assert.ok(lookups.length > 0);
      assert.ok(lookups.every(entry => entry.commandId === kept[0].commandId));
      facts.push({ name: `${tag}-identifier-recovery`, commandSendsBeforeReload: 1, commandSendsAfterReload: 0, sameCommandId: true });
    } finally { await page.close(); }

    // Explicitly synthetic visibility events through the actual host/controller. The clock
    // must resync after foregrounding; an expired sent command stays recoverable and unmarked.
    const background = await open('rescue', size, '&answer=hang&time-left=5000');
    try {
      await send(background, 'rescue');
      await background.waitFor(state('submitting'), 'submitting before hiding');
      await background.evaluate("Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange'))");
      await measure(background, `${tag}-hidden-submitting`, { empty: true });
      assert.equal(await background.evaluate("document.querySelector('.phone-strip')"), null);
      await sleep(5_100);
      await background.evaluate("Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); window.__simulation.redeliver()");
      await background.waitFor("document.querySelector('.ms-timer[data-state=\"expired\"]')", 'foreground clock resynced');
      await background.tap('#ms-phone-actions');
      await measure(background, `${tag}-foreground-expired`, { empty: true, screenshot: true });
      assert.equal(await commandCount(background), 1);
    } finally { await background.close(); }
  }
  // An expired timer retains its waiting words beside the digits in the fixed bar.
  // Check longer voting labels too, and the existing internal reflow at doubled text.
  for (const scenario of ['rescue', 'election', 'jail', 'release-vote']) {
    const page = await open(scenario, SIZES[0], '&time-left=1500');
    try {
      await page.waitFor("document.querySelector('.ms-timer[data-state=\"expired\"]')", 'expired status words');
      await measure(page, `320x568-expired-${scenario}-status`, { empty: true });
    } finally { await page.close(); }
  }
  const enlarged = await open('rescue', SIZES[0], '&time-left=1500', false, 32);
  try {
    await enlarged.waitFor("document.querySelector('.ms-timer[data-state=\"expired\"]')", 'expired status at doubled default text');
    await measure(enlarged, '320x568-expired-enlarged-text', { empty: true, screenshot: true });
  } finally { await enlarged.close(); }
  }
  note(explicitFullOnly ? `PASS: ${facts.length} records; explicit-full OS change without a frame, native cancellation and teardown`
    : `PASS: ${facts.length} records; native motion cancellation, in-flight marks and receipt recovery`);
} finally {
  await writeFile(join(output, 'facts.json'), `${JSON.stringify(facts, null, 2)}\n`);
  await writeFile(join(output, 'capture-log.txt'), `${lines.join('\n')}\n`);
  await browser.close();
  await browserProcess.close();
}
