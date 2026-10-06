// mothership:dev-only
//
// Optional evidence capture for the player and table shells. Drives a locally installed
// Chromium-based browser against a private instance of the fixture server, and writes
// screenshots plus a file of measured facts. It is not part of any check, and proves
// nothing about real devices: record those separately.
//
//   CHROME_PATH=/path/to/chrome node apps/game/dev/capture-evidence.mjs <output-directory>

import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { connect, launchBrowser, openPage, sleep } from './capture/browser.mjs';
import { createDevServer } from './serve.mjs';

// A statement, not only a comment: it survives bundling and comment stripping, so the
// production-exclusion check finds this module wherever it ends up.
globalThis[Symbol.for('mothership:dev-only')] = true;

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

    // 2. Keyboard only: walk the focus order, then open and close the private panel.
    await playerOne.foreground();
    const order = [];
    for (let step = 0; step < 4; step += 1) {
      await playerOne.press('Tab');
      order.push(await playerOne.evaluate('document.activeElement.id || document.activeElement.className'));
    }
    await playerOne.tabTo('ms-private-toggle');
    await playerOne.press(' ');
    await playerOne.waitFor("document.getElementById('ms-private-panel').textContent !== ''", 'private panel opened by keyboard');
    await sleep(300);
    await playerOne.screenshot(join(out, '03-player-1-private-panel-open.png'), { selector: '[data-region="private"]' });
    await record('03-player-1-private-panel-open', playerOne, { focusOrder: order, focusVisible: await playerOne.evaluate("document.activeElement.matches(':focus-visible')") });
    // Another tab comes to the front while the panel is open: this page is now really hidden.
    await table.foreground();
    await playerOne.waitFor("document.visibilityState === 'hidden' && document.getElementById('ms-private-panel').textContent === ''", 'private content withdrawn when the tab is backgrounded');
    await record('03b-player-1-backgrounded-while-panel-was-open', playerOne);
    await playerOne.foreground();
    await record('03c-player-1-back-in-foreground', playerOne, { privatePanelExpanded: await playerOne.evaluate("document.getElementById('ms-private-toggle').getAttribute('aria-expanded')") });
    // Opened and closed again with the keyboard alone.
    await playerOne.tabTo('ms-private-toggle');
    await playerOne.press('Enter');
    await playerOne.waitFor("document.getElementById('ms-private-panel').textContent !== ''", 'private panel reopened by keyboard');
    await playerOne.press('Enter');
    await playerOne.waitFor("document.getElementById('ms-private-panel').textContent === ''", 'private panel closed by keyboard');
    await record('03d-player-1-private-panel-closed-again', playerOne);

    // 3. A hidden registration: only the registering phone may change, and only what is private.
    const REGIONS = "Object.fromEntries([...document.querySelectorAll('[data-region]')].filter(node => node.dataset.region !== 'timer').map(node => [node.dataset.region, node.outerHTML]))";
    const changedRegions = async (page, earlier) => page.evaluate(`(() => { const now = ${REGIONS}; const before = ${JSON.stringify(earlier)}; return Object.keys(now).filter(id => now[id] !== before[id]); })()`);
    const before = { table: await table.evaluate(WITHOUT_TIMER), target: await playerTwo.evaluate(WITHOUT_TIMER), closedPhone: await playerOne.evaluate(REGIONS) };
    scenario.advance();
    await sleep(400);
    const closedPhoneChanged = await changedRegions(playerOne, before.closedPhone);
    await playerOne.evaluate("document.getElementById('ms-private-toggle').click()");
    await playerOne.waitFor("document.querySelector('.ms-card__state')?.dataset.status === 'registered'", 'registration reflected inside the open private panel');
    await sleep(300);
    await playerOne.screenshot(join(out, '04-player-1-after-registration.png'), { selector: '[data-region="private"]' });
    await record('04-player-1-after-registration', playerOne);
    facts.hiddenRegistration = {
      step: scenario.step(),
      tableDocumentUnchanged: (await table.evaluate(WITHOUT_TIMER)) === before.table,
      targetPhoneDocumentUnchanged: (await playerTwo.evaluate(WITHOUT_TIMER)) === before.target,
      registeringPhoneRegionsChangedWhileItsPanelWasClosed: closedPhoneChanged,
      revisions: scenario.status().revisions,
    };
    await playerOne.evaluate("document.getElementById('ms-private-toggle').click()");
    await playerOne.waitFor("document.getElementById('ms-private-panel').textContent === ''", 'private panel closed');

    // 4. Reduced motion: from the device setting, then the player's own choice overriding it.
    const transition = "getComputedStyle(document.getElementById('ms-private-toggle')).transitionDuration + ' / ' + getComputedStyle(document.getElementById('ms-private-toggle')).transitionProperty";
    const motion = { default: await playerOne.evaluate(transition) };
    await playerOne.media({ 'prefers-reduced-motion': 'reduce' });
    await playerOne.waitFor("document.querySelector('.ms-shell').dataset.motion === 'reduced'", 'device reduced-motion setting picked up');
    motion.deviceSetting = await playerOne.evaluate(transition);
    motion.deviceSettingHint = await playerOne.evaluate("document.getElementById('ms-reduce-motion-hint').textContent");
    await playerOne.evaluate("document.getElementById('ms-private-toggle').click()");
    await playerOne.waitFor("document.getElementById('ms-private-panel').textContent !== ''", 'panel open under reduced motion');
    motion.panelAnimationUnderReducedMotion = await playerOne.evaluate("getComputedStyle(document.getElementById('ms-private-panel')).animationName + ' ' + getComputedStyle(document.getElementById('ms-private-panel')).animationDuration");
    await playerOne.evaluate("document.getElementById('ms-private-toggle').click()");
    // The device still asks for reduced motion; the player unchecks the setting in the app.
    await playerOne.evaluate("document.getElementById('ms-reduce-motion').click()");
    await playerOne.waitFor("document.querySelector('.ms-shell').dataset.motion === 'full'", 'in-app choice of full motion');
    motion.playerChoseFullWhileDeviceAsksReduced = await playerOne.evaluate(transition);
    motion.playerChoiceHint = await playerOne.evaluate("document.getElementById('ms-reduce-motion-hint').textContent");
    await playerOne.media({ 'prefers-reduced-motion': 'no-preference' });
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

    // 7. A payload in another protocol version, then a readable one. The private panel is
    // open beforehand, to show that it does not come back open by itself.
    await playerOne.evaluate("document.getElementById('ms-private-toggle').click()");
    await playerOne.waitFor("document.getElementById('ms-private-panel').textContent !== ''", 'private panel open before the interruption');
    scenario.inject('seat-1', 'incompatible-protocol');
    await playerOne.waitFor("document.querySelector('.ms-shell').dataset.screen === 'blocked'", 'update-required screen');
    await playerOne.screenshot(join(out, '08-player-1-update-required.png'), { viewport: true });
    await record('08-player-1-update-required', playerOne);
    scenario.redeliver('seat-1');
    await playerOne.waitFor("document.querySelector('.ms-shell').dataset.screen === 'match'", 'recovery from update-required');
    await record('08b-player-1-recovered', playerOne, { privatePanelExpanded: await playerOne.evaluate("document.getElementById('ms-private-toggle').getAttribute('aria-expanded')") });

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
