// mothership:dev-only
//
// Optional evidence capture. Drives a locally installed Chromium-based browser over the
// DevTools protocol against a private instance of the fixture server, and writes
// screenshots plus a file of measured facts. It uses only Node built-ins, is not part of
// any check, and proves nothing about real devices: record those separately.
//
//   CHROME_PATH=/path/to/chrome node apps/game/dev/capture-evidence.mjs <output-directory>

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createDevServer } from './serve.mjs';

// A statement, not only a comment: it survives bundling and comment stripping, so the
// production-exclusion check finds this module wherever it ends up.
globalThis[Symbol.for('mothership:dev-only')] = true;

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

const sleep = ms => new Promise(resolveSleep => setTimeout(resolveSleep, ms));

async function launchBrowser() {
  const executable = CANDIDATES.find(candidate => existsSync(candidate));
  if (!executable) throw new Error('No Chromium-based browser found. Set CHROME_PATH.');
  const profile = await mkdtemp(join(tmpdir(), 'mothership-capture-'));
  const child = spawn(executable, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--disable-gpu', '--hide-scrollbars', '--disable-background-networking', '--disable-component-update', '--disable-sync', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  const endpoint = await new Promise((resolveEndpoint, rejectEndpoint) => {
    let output = '';
    const timer = setTimeout(() => rejectEndpoint(new Error('Browser did not report a DevTools endpoint')), 20_000);
    child.stderr.on('data', chunk => {
      output += chunk;
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(output);
      if (match) {
        clearTimeout(timer);
        resolveEndpoint(match[1]);
      }
    });
    child.once('exit', () => rejectEndpoint(new Error('Browser exited before it was ready')));
  });
  return {
    endpoint,
    async close() {
      child.kill('SIGTERM');
      await sleep(300);
      await rm(profile, { recursive: true, force: true }).catch(() => {});
    },
  };
}

async function connect(endpoint) {
  const socket = new WebSocket(endpoint);
  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener('open', resolveOpen, { once: true });
    socket.addEventListener('error', () => rejectOpen(new Error('Could not connect to the browser')), { once: true });
  });
  let nextId = 1;
  const pending = new Map();
  /** Every protocol event the browser reported, e.g. console entries and uncaught exceptions. */
  const events = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id === undefined) {
      events.push(message);
      return;
    }
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(`${waiter.method}: ${message.error.message}`));
    else waiter.resolve(message.result);
  });
  const send = (method, params = {}, sessionId) => new Promise((resolveSend, rejectSend) => {
    const id = nextId++;
    pending.set(id, { resolve: resolveSend, reject: rejectSend, method });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  return { send, events, close: () => socket.close() };
}

/** One browser tab with the handful of operations this script needs. */
async function openPage(browser, { width, height, scale = 1, mobile = false }) {
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params) => browser.send(method, params, sessionId);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile });
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true });

  async function evaluate(expression) {
    const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error(`Page script failed: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
    return result.value;
  }
  async function waitFor(expression, label, timeoutMs = 10_000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (await evaluate(`Boolean(${expression})`).catch(() => false)) return;
      await sleep(100);
    }
    throw new Error(`Timed out waiting for: ${label}`);
  }
  return {
    send,
    evaluate,
    waitFor,
    async goto(url) {
      await send('Page.navigate', { url });
      await waitFor("document.querySelector('.ms-shell[data-screen=\"match\"]') || document.querySelector('.harness-page')", `page ready: ${url}`);
    },
    media: features => send('Emulation.setEmulatedMedia', { features: Object.entries(features).map(([name, value]) => ({ name, value })) }),
    /** Only the frontmost tab is visible to its page; a background tab conceals private panels. */
    async foreground() {
      await send('Page.bringToFront');
      await waitFor("document.visibilityState === 'visible'", 'tab in the foreground');
      await sleep(250);
    },
    async press(key) {
      const keys = { Tab: { code: 'Tab', keyCode: 9 }, Enter: { code: 'Enter', keyCode: 13, text: '\r' }, ' ': { code: 'Space', keyCode: 32, text: ' ' } };
      const { code, keyCode, text } = keys[key];
      const base = { key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode };
      await send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', ...base, ...(text ? { text } : {}) });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    },
    /** Presses Tab until the element with this id has focus, as a keyboard user would. */
    async tabTo(id) {
      for (let presses = 0; presses < 12; presses += 1) {
        if (await evaluate(`document.activeElement?.id === ${JSON.stringify(id)}`)) return presses;
        await this.press('Tab');
      }
      throw new Error(`Could not reach #${id} with the Tab key`);
    },
    /**
     * PNG of the whole page by default, of the first screenful with { viewport: true },
     * or of one element (with a small margin) with { selector }.
     */
    async screenshot(file, { viewport = false, selector = null } = {}) {
      await evaluate('window.scrollTo(0, 0)');
      const { cssContentSize, cssLayoutViewport } = await send('Page.getLayoutMetrics');
      let clip = { x: 0, y: 0, width: cssContentSize.width, height: viewport ? cssLayoutViewport.clientHeight : cssContentSize.height };
      if (selector !== null) {
        const box = await evaluate(`(() => { const b = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; })()`);
        const margin = 12;
        clip = { x: Math.max(0, box.x - margin), y: Math.max(0, box.y - margin), width: box.width + margin * 2, height: box.height + margin * 2 };
      }
      const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...clip, scale: 1 } });
      await writeFile(file, Buffer.from(data, 'base64'));
    },
    close: () => browser.send('Target.closeTarget', { targetId }),
  };
}

// Everything below reads the page; nothing here is trusted as a test oracle on its own.
const SHELL_FACTS = `(() => {
  const shell = document.querySelector('.ms-shell');
  const text = selector => document.querySelector(selector)?.textContent ?? null;
  return {
    title: document.title,
    visibilityState: document.visibilityState,
    screen: shell.dataset.screen, connection: shell.dataset.connection, mode: shell.dataset.mode, motion: shell.dataset.motion,
    viewport: [innerWidth, innerHeight],
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    phase: text('.ms-phase__label'), timerState: document.querySelector('.ms-timer')?.dataset.state ?? null,
    banners: [...document.querySelectorAll('.ms-banner__text')].map(node => node.textContent),
    shot: text('.ms-card__status'),
    roleInDocument: ['Officer', 'Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Red Disabler', 'Alien'].filter(role => document.body.innerHTML.includes(role)),
    spoken: [...document.querySelectorAll('#ms-live-polite p, #ms-live-assertive p')].map(node => node.textContent),
    focus: document.activeElement?.id || document.activeElement?.tagName,
  };
})()`;

const WITHOUT_TIMER = `[...document.querySelectorAll('[data-region]')].filter(node => node.dataset.region !== 'timer').map(node => node.outerHTML).join('')`;

const TARGETS = `[...document.querySelectorAll('.ms-shell button, .ms-shell a, .ms-shell summary, .ms-shell label')].map(node => {
  const box = node.getBoundingClientRect();
  return { control: node.id || node.getAttribute('for') || node.tagName.toLowerCase(), width: Math.round(box.width), height: Math.round(box.height) };
})`;

async function main(outputDirectory) {
  const out = resolve(outputDirectory);
  await mkdir(out, { recursive: true });
  const requests = [];
  const devServer = createDevServer({ onRequest: entry => requests.push(entry) });
  const origin = await devServer.listen(0);
  const { scenario } = devServer;
  const chrome = await launchBrowser();
  const browser = await connect(chrome.endpoint);
  const facts = { note: 'Fixture evidence from a headless desktop browser. Not a device measurement and not backend integration.', captures: {} };
  const record = async (name, page, extra = {}) => {
    facts.captures[name] = { ...(await page.evaluate(SHELL_FACTS)), ...extra };
  };

  try {
    const { product, userAgent } = await browser.send('Browser.getVersion');
    facts.browser = { product, userAgent, headless: true };

    const phone = { width: 390, height: 844, scale: 2, mobile: true };
    const playerOne = await openPage(browser, phone);
    const playerTwo = await openPage(browser, phone);
    const table = await openPage(browser, { width: 1280, height: 800 });
    await playerOne.goto(`${origin}/harness/player.html?seat=seat-1`);
    await playerTwo.goto(`${origin}/harness/player.html?seat=seat-2`);
    await table.goto(`${origin}/harness/table.html`);

    // 1. The authored starting point on all three audiences. A tab that is not frontmost is
    // hidden to its page, so each one is recorded in the background first, then brought forward.
    await record('00-player-1-in-background-tab', playerOne);
    await playerOne.foreground();
    await playerOne.screenshot(join(out, '01-player-1-own-turn.png'));
    await record('01-player-1-own-turn', playerOne, { targets: await playerOne.evaluate(TARGETS) });
    await table.foreground();
    await table.screenshot(join(out, '02-table-display.png'));
    await record('02-table-display', table, { controls: await table.evaluate("[...document.querySelectorAll('[data-intent]')].map(node => node.dataset.intent)") });
    await playerTwo.foreground();
    await record('03-player-2-waiting', playerTwo);

    // 2. Keyboard only: walk the focus order, then open and close the role drawer.
    await playerOne.foreground();
    const order = [];
    for (let step = 0; step < 4; step += 1) {
      await playerOne.press('Tab');
      order.push(await playerOne.evaluate('document.activeElement.id || document.activeElement.className'));
    }
    await playerOne.tabTo('ms-role-toggle');
    await playerOne.press(' ');
    await playerOne.waitFor("document.getElementById('ms-role-panel').textContent !== ''", 'role drawer opened by keyboard');
    await sleep(300);
    await playerOne.screenshot(join(out, '03-player-1-role-drawer-open.png'), { selector: '[data-region="role"]' });
    await record('03-player-1-role-drawer-open', playerOne, { focusOrder: order, focusVisible: await playerOne.evaluate("document.activeElement.matches(':focus-visible')") });
    await playerOne.press('Enter');
    await playerOne.waitFor("document.getElementById('ms-role-panel').textContent === ''", 'role drawer closed by keyboard');

    // 3. A hidden registration: only the registering phone may change.
    const before = { table: await table.evaluate(WITHOUT_TIMER), target: await playerTwo.evaluate(WITHOUT_TIMER) };
    scenario.advance();
    await playerOne.waitFor("document.querySelector('.ms-card').dataset.status === 'unavailable'", 'registration reflected on the registering phone');
    await sleep(300);
    await playerOne.screenshot(join(out, '04-player-1-after-registration.png'), { selector: '[data-region="actions"]' });
    await record('04-player-1-after-registration', playerOne);
    facts.hiddenRegistration = {
      step: scenario.step(),
      tableDocumentUnchanged: (await table.evaluate(WITHOUT_TIMER)) === before.table,
      targetPhoneDocumentUnchanged: (await playerTwo.evaluate(WITHOUT_TIMER)) === before.target,
      revisions: scenario.status().revisions,
    };

    // 4. Reduced motion, from the device setting and then from the in-app control.
    const transition = "getComputedStyle(document.getElementById('ms-role-toggle')).transitionDuration + ' / ' + getComputedStyle(document.getElementById('ms-role-toggle')).transitionProperty";
    const motion = { default: await playerOne.evaluate(transition) };
    await playerOne.media({ 'prefers-reduced-motion': 'reduce' });
    await playerOne.waitFor("document.querySelector('.ms-shell').dataset.motion === 'reduced'", 'device reduced-motion setting picked up');
    motion.deviceSetting = await playerOne.evaluate(transition);
    motion.deviceSettingHint = await playerOne.evaluate("document.getElementById('ms-reduce-motion-hint').textContent");
    await playerOne.evaluate("document.getElementById('ms-role-toggle').click()");
    await playerOne.waitFor("document.getElementById('ms-role-panel').textContent !== ''", 'drawer open under reduced motion');
    motion.drawerAnimationUnderReducedMotion = await playerOne.evaluate("getComputedStyle(document.getElementById('ms-role-panel')).animationName + ' ' + getComputedStyle(document.getElementById('ms-role-panel')).animationDuration");
    await playerOne.evaluate("document.getElementById('ms-role-toggle').click()");
    await playerOne.media({ 'prefers-reduced-motion': 'no-preference' });
    await playerOne.waitFor("document.querySelector('.ms-shell').dataset.motion === 'full'", 'device setting released');
    facts.reducedMotion = motion;

    // 5. Larger text on a narrow phone, and forced colors.
    const narrow = await openPage(browser, { width: 320, height: 640, scale: 1, mobile: true });
    await narrow.goto(`${origin}/harness/player.html?seat=seat-2`);
    await narrow.foreground();
    await narrow.evaluate("document.documentElement.style.fontSize = '200%'");
    await sleep(200);
    await narrow.screenshot(join(out, '05-player-2-narrow-200-percent-text.png'));
    await record('05-player-2-narrow-200-percent-text', narrow, { rootFontSize: await narrow.evaluate('getComputedStyle(document.documentElement).fontSize') });
    await narrow.close();
    await table.foreground();
    await table.media({ 'forced-colors': 'active' });
    await sleep(200);
    await table.screenshot(join(out, '06-table-display-forced-colors.png'));
    await record('06-table-display-forced-colors', table);
    await table.media({ 'forced-colors': 'none' });

    // 6. Connection loss and automatic recovery on the same seat.
    await playerOne.foreground();
    scenario.setConnected('seat-1', false);
    await playerOne.waitFor("document.querySelector('.ms-shell').dataset.connection === 'stale'", 'stale state shown');
    await playerOne.screenshot(join(out, '07-player-1-connection-lost.png'), { viewport: true });
    await record('07-player-1-connection-lost', playerOne);
    scenario.setConnected('seat-1', true);
    await playerOne.waitFor("document.querySelector('.ms-shell').dataset.connection === 'live'", 'automatic reconnect');
    await record('07b-player-1-reconnected', playerOne);

    // 7. A payload in another protocol version, then a readable one.
    scenario.inject('seat-1', 'incompatible-protocol');
    await playerOne.waitFor("document.querySelector('.ms-shell').dataset.screen === 'blocked'", 'update-required screen');
    await playerOne.screenshot(join(out, '08-player-1-update-required.png'), { viewport: true });
    await record('08-player-1-update-required', playerOne);
    scenario.redeliver('seat-1');
    await playerOne.waitFor("document.querySelector('.ms-shell').dataset.screen === 'match'", 'recovery from update-required');
    await record('08b-player-1-recovered', playerOne, { roleDrawerExpanded: await playerOne.evaluate("document.getElementById('ms-role-toggle').getAttribute('aria-expanded')") });

    // 8. The two frontend-authored steps.
    await table.foreground();
    scenario.advance();
    await table.waitFor("document.querySelector('.ms-phase__label').textContent.includes('Player 2')", 'next turn on the table');
    await record('09-table-next-turn', table);
    scenario.advance();
    await table.waitFor("document.querySelector('.ms-timer').dataset.state === 'none'", 'resolution phase on the table');
    await table.screenshot(join(out, '09-table-display-resolution.png'));
    await record('09-table-display-resolution', table);

    // 9. Anything the browser complained about. The only expected entries are the failed feed
    // requests during the deliberate connection drop in step 6.
    const logged = browser.events.filter(event => event.method === 'Log.entryAdded').map(event => event.params.entry);
    const expectedDrop = entry => entry.source === 'network' && /stream\?audience=seat-1/.test(entry.url ?? '');
    facts.browserLog = {
      uncaughtExceptions: browser.events.filter(event => event.method === 'Runtime.exceptionThrown').length,
      consoleErrors: browser.events.filter(event => event.method === 'Runtime.consoleAPICalled' && event.params.type === 'error').length,
      securityPolicyViolations: logged.filter(entry => entry.source === 'security' || /Content Security Policy/i.test(entry.text)).map(entry => entry.text),
      expectedFailedFeedRequestsDuringDrop: logged.filter(expectedDrop).length,
      otherEntries: logged.filter(entry => !expectedDrop(entry) && entry.level !== 'verbose' && entry.level !== 'info' && !/favicon\.ico/.test(entry.url ?? '')).map(entry => `${entry.level} ${entry.source}: ${entry.text}`),
    };

    // 10. What the three pages asked the server for during the whole run, from the server's side.
    const paths = requests.map(entry => `${entry.method} ${entry.path}`);
    facts.requests = {
      apiAndStyles: [...new Set(paths.filter(path => !path.includes('/modules/') && !path.includes('/harness/')))].sort(),
      moduleRequests: paths.filter(path => path.includes('/modules/')).length,
      fixtureModuleRequested: paths.some(path => /fixtures?\.(js|ts)/.test(path)),
      commandEndpointsCalled: paths.filter(path => /submit-command|lookup-receipt|advance-if-expired/.test(path)),
      operatorEndpointsCalledByPages: paths.filter(path => path.includes('/api/operator/')),
    };
  } finally {
    browser.close();
    await chrome.close();
    await devServer.close();
  }
  await writeFile(join(out, 'facts.json'), `${JSON.stringify(facts, null, 2)}\n`);
  console.log(`Wrote fixture evidence to ${out}`);
}

const [outputDirectory] = process.argv.slice(2);
if (!outputDirectory) {
  console.error('Usage: node apps/game/dev/capture-evidence.mjs <output-directory>');
  process.exit(2);
}
await main(outputDirectory);
