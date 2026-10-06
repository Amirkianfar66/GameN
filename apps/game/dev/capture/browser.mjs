// mothership:dev-only
//
// A minimal driver for a locally installed Chromium-based browser over the DevTools
// protocol, using only Node built-ins. Shared by the evidence-capture scripts. It is not
// part of any check and proves nothing about real devices.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

export const sleep = ms => new Promise(resolveSleep => setTimeout(resolveSleep, ms));

export async function launchBrowser() {
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

export async function connect(endpoint) {
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

/**
 * One browser tab with the handful of operations this script needs. With `ownWindow` the
 * tab gets a window to itself, so it stays visible to its page while other tabs are used:
 * a tab that is not frontmost in its window is hidden, and a hidden page shows no cue.
 */
export async function openPage(browser, { width, height, scale = 1, mobile = false, ownWindow = false }) {
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', newWindow: ownWindow });
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
    /** Reloads the page as a person would, and waits for the match to be back on screen. */
    async reload() {
      await evaluate('window.__beforeReload = true');
      await send('Page.reload');
      await waitFor("window.__beforeReload === undefined && document.querySelector('.ms-shell[data-screen=\"match\"]')", 'page reloaded');
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
      // No native key code. With one, headless Chrome on macOS re-delivers a key the page does
      // not handle (Enter on plain text, say) thousands of times, as if it were held down.
      const base = { key, code, windowsVirtualKeyCode: keyCode };
      await send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', ...base, ...(text ? { text } : {}) });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    },
    /** Presses Tab until the element with this id has focus, as a keyboard user would. */
    async tabTo(id) {
      for (let presses = 0; presses < 16; presses += 1) {
        if (await evaluate(`document.activeElement?.id === ${JSON.stringify(id)}`)) return presses;
        await this.press('Tab');
      }
      throw new Error(`Could not reach #${id} with the Tab key`);
    },
    /**
     * A finger tap at the middle of an element, through the browser's own touch input, so the
     * page receives what a phone would send. Needs a page opened with mobile emulation.
     * `times` taps land on the same spot in quick succession, whatever is under it by then.
     */
    async tap(selector, { times = 1, gapMs = 60 } = {}) {
      const point = await evaluate(`(() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        node.scrollIntoView({ block: 'center' });
        const box = node.getBoundingClientRect();
        return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
      })()`);
      for (let count = 0; count < times; count += 1) {
        await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
        await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        if (count < times - 1) await sleep(gapMs);
      }
      return point;
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
