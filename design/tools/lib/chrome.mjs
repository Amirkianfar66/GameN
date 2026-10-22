// mothership:dev-only
//
// Drives a locally installed Chromium-based browser over the DevTools protocol, to turn the
// Designer's pages into review images and to measure them. Node built-ins only: no
// dependency is added for it.
//
// A review image is a picture of a page on this machine's desktop Chrome. It is not a
// device measurement and proves nothing about phones, a television or performance.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

export const sleep = ms => new Promise(done => setTimeout(done, ms));

export function findBrowser() {
  return CANDIDATES.find(candidate => existsSync(candidate)) ?? null;
}

/**
 * `defaultFontPx` starts the browser with that default text size, which is what a person
 * changes in the browser's own settings: rem units and em media queries both answer to it.
 */
export async function launchBrowser({ defaultFontPx = null } = {}) {
  const executable = findBrowser();
  if (!executable) throw new Error('No Chromium-based browser found. Set CHROME_PATH to render review images.');
  const profile = await mkdtemp(join(tmpdir(), 'mothership-design-render-'));
  const child = spawn(executable, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', '--disable-background-networking', '--disable-component-update', '--disable-sync',
    // Text is drawn the same way on every run, which keeps a re-render of an unchanged page
    // close to identical. A few anti-aliased pixels of a scaled picture can still differ.
    '--font-render-hinting=none', '--force-color-profile=srgb',
    ...(defaultFontPx ? [`--blink-settings=defaultFontSize=${defaultFontPx},defaultFixedFontSize=${Math.round(defaultFontPx * 0.8125)}`] : []),
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  const endpoint = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Browser did not report a DevTools endpoint')), 20_000);
    child.stderr.on('data', chunk => {
      output += chunk;
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(output);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    child.once('exit', () => reject(new Error('Browser exited before it was ready')));
  });
  const version = await new Promise(resolve => {
    const probe = spawn(executable, ['--version']);
    let text = '';
    probe.stdout.on('data', chunk => { text += chunk; });
    probe.once('exit', () => resolve(text.trim()));
    probe.once('error', () => resolve('unknown'));
  });
  return {
    endpoint,
    version,
    async close() {
      child.kill('SIGTERM');
      await sleep(300);
      await rm(profile, { recursive: true, force: true }).catch(() => {});
    },
  };
}

export async function connect(endpoint) {
  const socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('Could not connect to the browser')), { once: true });
  });
  let nextId = 1;
  const pending = new Map();
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
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject, method });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  return { send, events, close: () => socket.close() };
}

/** One tab, sized like the surface being reviewed. */
export async function openPage(browser, { width, height, scale = 1, mobile = false }) {
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params) => browser.send(method, params, sessionId);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  // A cached answer would hide a request: every page load asks the server again.
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile });
  const own = method => browser.events.filter(event => event.sessionId === sessionId && event.method === method);

  async function evaluate(expression) {
    const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error(`Page script failed: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
    return result.value;
  }
  const thrown = () => browser.events.find(event => event.sessionId === sessionId && event.method === 'Runtime.exceptionThrown');
  async function waitFor(expression, label, timeoutMs = 15_000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (await evaluate(`Boolean(${expression})`).catch(() => false)) return;
      // A page that threw while building itself will never be ready: say why at once.
      const error = thrown();
      if (error) throw new Error(`${label}: the page threw: ${error.params.exceptionDetails?.exception?.description ?? error.params.exceptionDetails?.text}`);
      await sleep(50);
    }
    throw new Error(`Timed out waiting for: ${label}`);
  }
  return {
    send,
    evaluate,
    waitFor,
    /**
     * Problems the page had while it was open: uncaught errors, console errors, requests
     * that failed and answers of 400 or more. A request this tool blocked on purpose with
     * block() is not a problem and is not listed.
     */
    problems() {
      const scripts = browser.events
        .filter(event => event.sessionId === sessionId)
        .filter(event => event.method === 'Runtime.exceptionThrown' || (event.method === 'Runtime.consoleAPICalled' && event.params.type === 'error'))
        .map(event => event.params.exceptionDetails?.exception?.description ?? event.params.args?.map(arg => arg.value ?? arg.description).join(' ') ?? 'unknown page error')
        // The browser's own console line for a request this tool blocked says nothing new.
        .filter(text => !/ERR_BLOCKED_BY_CLIENT/.test(text));
      const urls = new Map(own('Network.requestWillBeSent').map(event => [event.params.requestId, event.params.request.url]));
      const failed = own('Network.loadingFailed')
        .filter(event => !event.params.blockedReason && !event.params.canceled)
        .map(event => `request failed (${event.params.errorText}): ${urls.get(event.params.requestId) ?? 'unknown address'}`);
      const refused = own('Network.responseReceived')
        .filter(event => event.params.response.status >= 400)
        .map(event => `HTTP ${event.params.response.status}: ${event.params.response.url}`);
      return [...scripts, ...failed, ...refused];
    },
    /** The address of every request this page has made so far, in order, without data: addresses. */
    requests() {
      return own('Network.requestWillBeSent').map(event => event.params.request.url).filter(url => !url.startsWith('data:'));
    },
    /** Refuses every request whose address matches one of the patterns, as a failed network would. */
    block: patterns => send('Network.setBlockedURLs', { urls: patterns }),
    async goto(url, ready = 'document.readyState === "complete" && window.__designReady !== false') {
      await send('Page.navigate', { url });
      await waitFor(ready, `page ready: ${url}`);
      // Fonts and images decode after load; a frame later the page is what a person would see.
      await evaluate('document.fonts.ready.then(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))))');
    },
    media: features => send('Emulation.setEmulatedMedia', { features: Object.entries(features).map(([name, value]) => ({ name, value })) }),
    /** The page's own height, so a sticky element can be seen where it rests at the end of the page. */
    async fitHeight() {
      const contentHeight = await evaluate('Math.ceil(document.documentElement.scrollHeight)');
      await send('Emulation.setDeviceMetricsOverride', { width, height: contentHeight, deviceScaleFactor: scale, mobile });
      await evaluate('new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))');
      return contentHeight;
    },
    /** PNG of the whole page, of the first screenful with { viewport: true }, or of one element with { selector }. */
    async screenshot(file, { selector = null, margin = 0, viewport = false, keepScroll = false } = {}) {
      if (!keepScroll) await evaluate('window.scrollTo(0, 0)');
      const { cssContentSize, cssLayoutViewport } = await send('Page.getLayoutMetrics');
      let clip = { x: 0, y: keepScroll ? cssLayoutViewport.pageY : 0, width: cssContentSize.width, height: viewport ? cssLayoutViewport.clientHeight : cssContentSize.height };
      if (selector !== null) {
        const box = await evaluate(`(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!node) return null; const b = node.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; })()`);
        if (box === null) throw new Error(`Nothing matches ${selector}`);
        clip = { x: Math.max(0, box.x - margin), y: Math.max(0, box.y - margin), width: box.width + margin * 2, height: box.height + margin * 2 };
      }
      const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...clip, scale: 1 } });
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, Buffer.from(data, 'base64'));
      return { width: Math.round(clip.width * scale), height: Math.round(clip.height * scale) };
    },
    close: () => browser.send('Target.closeTarget', { targetId }),
  };
}
