// mothership:dev-only
//
// Optional evidence capture for the shot flow. Drives a locally installed Chromium-based
// browser with real key presses and touch taps against a private instance of the fixture
// server, and writes screenshots plus a file of measured facts.
//
// FIXTURE BEHAVIOR, NOT INTEGRATION. The server is a scripted double. Nothing here
// exercises a backend, an emulator, authentication or a real network, and a headless
// desktop browser is not a phone. It is not part of any check.
//
//   CHROME_PATH=/path/to/chrome node apps/game/dev/capture-shot-flow.mjs <output-directory>

import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { connect, launchBrowser, openPage, sleep } from './capture/browser.mjs';
import { createDevServer } from './serve.mjs';

// A statement, not only a comment: it survives bundling and comment stripping, so the
// production-exclusion check finds this module wherever it ends up.
globalThis[Symbol.for('mothership:dev-only')] = true;

// Everything below reads the page; nothing here is trusted as a test oracle on its own.
const CARD = `(() => {
  const state = document.querySelector('.ms-card__state');
  const active = document.activeElement;
  const base = {
    visibilityState: document.visibilityState,
    connection: document.querySelector('.ms-shell').dataset.connection,
    phase: document.querySelector('.ms-phase__label')?.textContent ?? null,
    privatePanelExpanded: document.getElementById('ms-private-toggle')?.getAttribute('aria-expanded') ?? null,
    focus: active?.id || active?.tagName || null,
    focusIsAControl: active instanceof HTMLButtonElement || active instanceof HTMLInputElement,
    focusRingShown: active?.matches(':focus-visible') ?? false,
    spoken: [...document.querySelectorAll('#ms-live-polite p, #ms-live-assertive p')].map(node => (node.dataset.private === 'true' ? '[private] ' : '') + (node.parentElement.id === 'ms-live-assertive' ? '[assertive] ' : '') + node.textContent),
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
  };
  if (!state) return { ...base, card: null };
  return {
    ...base,
    card: {
      status: state.dataset.status, step: state.dataset.step, selected: state.dataset.selected,
      statusLabel: state.querySelector('.ms-card__status').textContent,
      lines: [...state.querySelectorAll('p:not(.ms-card__status)')].map(node => node.textContent),
      controls: [...state.querySelectorAll('button')].map(node => node.id + ': ' + node.textContent + (node.getAttribute('aria-disabled') === 'true' ? ' (not active yet)' : '')),
      notice: document.querySelector('.ms-actions .ms-notice')?.textContent ?? null,
    },
  };
})()`;

const SIZES = `[...document.querySelectorAll('.ms-card__state button')].map(node => {
  const box = node.getBoundingClientRect();
  return { control: node.id, width: Math.round(box.width), height: Math.round(box.height), withinViewport: box.left >= 0 && box.right <= innerWidth };
})`;

/** Everything on the page except the countdown, which ticks by itself. */
const WITHOUT_TIMER = `[...document.querySelectorAll('[data-region]')].filter(node => node.dataset.region !== 'timer').map(node => node.outerHTML).join('')`;

/** What a closed or backgrounded phone must not contain, anywhere in its document. */
const PRIVATE_LEFTOVERS = `(() => {
  const html = document.body.innerHTML;
  return {
    words: ['Officer', 'Shot', 'egistered', 'Register', 'Submitting', 'Sending', 'Checking', 'target', 'ms-card', 'shot/'].filter(word => html.includes(word)),
    privateSpokenLines: document.querySelectorAll('[data-private]').length,
  };
})()`;

async function main(outputDirectory) {
  const out = resolve(outputDirectory);
  await mkdir(out, { recursive: true });
  const requests = [];
  const devServer = createDevServer({ onRequest: entry => requests.push({ ...entry, at: Date.now() }) });
  const origin = await devServer.listen(0);
  const { scenario } = devServer;
  const chrome = await launchBrowser();
  const browser = await connect(chrome.endpoint);
  const facts = {
    note: 'Fixture evidence from a headless desktop browser driven by real key and touch input. Not a device measurement and not backend integration: the server is a scripted double.',
    captures: {},
  };
  const record = async (name, page, extra = {}) => {
    facts.captures[name] = { ...(await page.evaluate(CARD)), ...extra };
  };
  const commandCalls = since => {
    const calls = requests.slice(since).map(entry => entry.path);
    return { submit: calls.filter(path => path.startsWith('/api/fixture/submit-command')).length, lookup: calls.filter(path => path.startsWith('/api/fixture/lookup-receipt')).length };
  };
  const status = name => `document.querySelector('.ms-card__state')?.dataset.status === ${JSON.stringify(name)}`;
  const step = name => `document.querySelector('.ms-card__state')?.dataset.step === ${JSON.stringify(name)}`;

  /** A control that has just appeared is not active for a moment. Waits until it is, as a person would have to. */
  const untilActive = (page, id) => page.waitFor(`document.getElementById(${JSON.stringify(id)}) && document.getElementById(${JSON.stringify(id)}).getAttribute('aria-disabled') !== 'true'`, `#${id} active`);

  /** Opens the private panel with the keyboard alone. */
  async function openPanel(page) {
    await page.tabTo('ms-private-toggle');
    await page.press(' ');
    await page.waitFor("document.getElementById('ms-private-panel').textContent !== ''", 'private panel open');
    await sleep(300);
  }
  /** Starts the script again; open pages reload themselves when told. */
  async function restart(pages) {
    for (const page of pages) await page.evaluate('window.__beforeRestart = true');
    scenario.restart();
    for (const page of pages) await page.waitFor("window.__beforeRestart === undefined && document.querySelector('.ms-shell[data-screen=\"match\"]')", 'page reloaded after restart');
  }
  /** Walks to the confirm step for a seat by keyboard and waits out the double-tap guard. */
  async function keyboardToConfirm(page, seatId) {
    await page.tabTo('ms-shot-open');
    await page.press('Enter');
    await page.waitFor(step('targeting'), 'target list');
    await page.tabTo(`ms-shot-target-${seatId}`);
    await page.press('Enter');
    await page.waitFor(step('confirming'), 'confirm step');
    await untilActive(page, 'ms-shot-confirm');
  }

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
    const all = [playerOne, playerTwo, table];

    // 1. The other phone: the same card, the server's "not available", nothing to press.
    await playerTwo.foreground();
    await openPanel(playerTwo);
    await playerTwo.screenshot(join(out, '01-player-2-shot-not-available.png'), { selector: '[data-region="private"]' });
    await record('01-player-2-shot-not-available', playerTwo);

    // 2. Keyboard only, on the Officer's phone: available, choosing, confirming.
    await playerOne.foreground();
    await record('02a-player-1-panel-closed', playerOne, { privateLeftovers: await playerOne.evaluate(PRIVATE_LEFTOVERS) });
    await openPanel(playerOne);
    await playerOne.screenshot(join(out, '02-player-1-shot-available.png'), { selector: '[data-region="private"]' });
    await record('02-player-1-shot-available', playerOne, { controlSizes: await playerOne.evaluate(SIZES) });
    // These nodes must survive every step of the card: redrawing them would restart the
    // panel's reveal and make a screen reader lose its place.
    await playerOne.evaluate("window.__kept = { panel: document.getElementById('ms-private-panel'), role: document.querySelector('.ms-role-card'), title: document.getElementById('ms-shot-title') }");
    const kept = "({ panel: window.__kept.panel === document.getElementById('ms-private-panel'), roleCard: window.__kept.role === document.querySelector('.ms-role-card'), cardTitle: window.__kept.title === document.getElementById('ms-shot-title') })";

    let mark = requests.length;
    await playerOne.tabTo('ms-shot-open');
    await playerOne.press('Enter');
    await playerOne.waitFor(step('targeting'), 'target list');
    await sleep(200);
    await playerOne.screenshot(join(out, '03-choosing-a-target.png'), { selector: '[data-region="private"]' });
    await record('03-choosing-a-target', playerOne, { controlSizes: await playerOne.evaluate(SIZES), nodesKept: await playerOne.evaluate(kept) });

    await playerOne.tabTo('ms-shot-target-seat-2');
    await playerOne.press('Enter');
    await playerOne.waitFor(step('confirming'), 'confirm step');
    // Enter again at once, as an impatient or accidental second press would be.
    await playerOne.press('Enter');
    await sleep(300);
    await playerOne.screenshot(join(out, '04-confirming.png'), { selector: '[data-region="private"]' });
    await record('04-confirming-after-a-second-enter', playerOne, { controlSizes: await playerOne.evaluate(SIZES), commandRequestsSoFar: commandCalls(mark), nodesKept: await playerOne.evaluate(kept) });

    // 3. Touch: a double tap on a target. The second tap lands wherever the confirm step was drawn.
    await playerOne.tap('#ms-shot-back');
    await playerOne.waitFor(step('targeting'), 'back to the target list');
    const point = await playerOne.tap('#ms-shot-target-seat-3', { times: 2 });
    await sleep(400);
    await record('05-double-tap-on-a-target', playerOne, {
      tappedTwiceAt: point,
      elementUnderTheSecondTap: await playerOne.evaluate(`(() => { const node = document.elementFromPoint(${point.x}, ${point.y})?.closest('button, p, li, div'); return node?.id || node?.className || null; })()`),
      commandRequestsSoFar: commandCalls(mark),
    });

    // 4. Touch: choose Player 2, then tap the confirm control the moment it appears, as the
    // tail of a double tap would if the control were drawn under the finger.
    await playerOne.tap('#ms-shot-back');
    await playerOne.waitFor(step('targeting'), 'back to the target list');
    const chosenAt = Date.now();
    await playerOne.tap('#ms-shot-target-seat-2');
    await playerOne.evaluate("new Promise(resolve => { const look = () => (document.getElementById('ms-shot-confirm') ? resolve(true) : requestAnimationFrame(look)); look(); })");
    await playerOne.tap('#ms-shot-confirm');
    const secondTapWithinMs = Date.now() - chosenAt;
    await sleep(200);
    await record('05b-confirm-tapped-the-moment-it-appeared', playerOne, { secondTapWithinMs, commandRequestsSoFar: commandCalls(mark) });

    // Then, once the control is active, deliberately. The request is arranged to be slow to arrive.
    await untilActive(playerOne, 'ms-shot-confirm');
    scenario.planNextCommand('slow');
    const others = { table: await table.evaluate(WITHOUT_TIMER), target: await playerTwo.evaluate(WITHOUT_TIMER) };
    const tappedAt = Date.now();
    await playerOne.tap('#ms-shot-confirm');
    await playerOne.waitFor(status('submitting'), 'submitting');
    // An upper bound from outside the page, including the round trips of this script. Not a
    // device measurement of selection feedback.
    const submittingSeenWithinMs = Date.now() - tappedAt;
    await sleep(250);
    await playerOne.screenshot(join(out, '06-submitting.png'), { selector: '[data-region="private"]' });
    await record('06-submitting', playerOne, { nodesKept: await playerOne.evaluate(kept), submittingSeenWithinMs, receiptsStoredWhileSubmitting: scenario.status().commands.receipts });
    await playerOne.waitFor(status('registered'), 'registered', 8_000);
    await sleep(300);
    await playerOne.screenshot(join(out, '07-registered.png'), { selector: '[data-region="private"]' });
    await playerOne.screenshot(join(out, '07b-registered-whole-phone.png'));
    await record('07-registered', playerOne, { commandRequests: commandCalls(mark), nodesKept: await playerOne.evaluate(kept), controlSizes: await playerOne.evaluate(SIZES) });
    facts.hiddenRegistration = {
      tableDocumentUnchanged: (await table.evaluate(WITHOUT_TIMER)) === others.table,
      targetPhoneDocumentUnchanged: (await playerTwo.evaluate(WITHOUT_TIMER)) === others.target,
      revisions: scenario.status().revisions,
      tableControls: await table.evaluate("[...document.querySelectorAll('[data-intent]')].map(node => node.dataset.intent)"),
    };

    // 5. Another tab comes to the front while the result is showing.
    await table.foreground();
    await playerOne.waitFor("document.visibilityState === 'hidden' && document.getElementById('ms-private-panel').textContent === ''", 'private content withdrawn when backgrounded');
    await record('08-backgrounded-with-the-result-showing', playerOne, { privateLeftovers: await playerOne.evaluate(PRIVATE_LEFTOVERS) });
    await playerOne.foreground();
    await record('08b-back-in-the-foreground', playerOne, { privateLeftovers: await playerOne.evaluate(PRIVATE_LEFTOVERS) });
    await openPanel(playerOne);
    await record('08c-panel-reopened', playerOne);
    await untilActive(playerOne, 'ms-shot-dismiss');
    await playerOne.tabTo('ms-shot-dismiss');
    await playerOne.press('Enter');
    await playerOne.waitFor(step('idle'), 'acknowledged');
    await sleep(200);
    await playerOne.screenshot(join(out, '09-registered-reminder.png'), { selector: '[data-region="private"]' });
    await record('09-registered-reminder', playerOne);
    await playerOne.media({ 'forced-colors': 'active' });
    await sleep(200);
    await playerOne.screenshot(join(out, '10-registered-reminder-forced-colors.png'), { selector: '[data-region="private"]' });
    await playerOne.media({ 'forced-colors': 'none' });

    // 6. The command service stops answering: checking, then an honest "unknown", then a check on request.
    await restart(all);
    await playerOne.foreground();
    await openPanel(playerOne);
    await keyboardToConfirm(playerOne, 'seat-4');
    scenario.setCommandService('silent');
    mark = requests.length;
    await playerOne.tabTo('ms-shot-confirm');
    await playerOne.press('Enter');
    await playerOne.waitFor(status('checking'), 'checking');
    await sleep(200);
    await playerOne.screenshot(join(out, '11-checking.png'), { selector: '[data-region="private"]' });
    await record('11-checking', playerOne);
    await playerOne.waitFor(status('unknown'), 'result unknown', 20_000);
    await sleep(200);
    await playerOne.screenshot(join(out, '12-result-unknown.png'), { selector: '[data-region="private"]' });
    await record('12-result-unknown', playerOne, { commandRequestsWhileSilent: commandCalls(mark), controlSizes: await playerOne.evaluate(SIZES) });
    scenario.setCommandService('answering');
    mark = requests.length;
    await untilActive(playerOne, 'ms-shot-check');
    await playerOne.tabTo('ms-shot-check');
    await playerOne.press('Enter');
    await playerOne.waitFor(status('registered'), 'settled after checking again', 8_000);
    await record('12b-settled-after-check-again', playerOne, { commandRequests: commandCalls(mark), receiptsStored: scenario.status().commands.receipts });

    // 7. A rejection, shown as the server gave it; then back to the start.
    await restart(all);
    await playerOne.foreground();
    await openPanel(playerOne);
    await keyboardToConfirm(playerOne, 'seat-6');
    scenario.planNextCommand('reject-not-allowed');
    await playerOne.tabTo('ms-shot-confirm');
    await playerOne.press('Enter');
    await playerOne.waitFor(status('not-registered'), 'rejection shown');
    await sleep(200);
    await playerOne.screenshot(join(out, '13-not-registered.png'), { selector: '[data-region="private"]' });
    await record('13-not-registered', playerOne);
    await untilActive(playerOne, 'ms-shot-dismiss');
    await playerOne.tabTo('ms-shot-dismiss');
    await playerOne.press('Enter');
    await playerOne.waitFor(status('available'), 'back to available');
    await record('13b-acknowledged', playerOne);

    // 8. The turn ends while a choice is on screen.
    await keyboardToConfirm(playerOne, 'seat-2');
    mark = requests.length;
    scenario.endFirstTurn();
    await playerOne.waitFor(`${step('idle')} && document.querySelector('.ms-phase__label').textContent.includes('Player 2')`, 'choice dropped when the turn ended');
    await sleep(200);
    await playerOne.screenshot(join(out, '14-turn-ended-while-confirming.png'), { selector: '[data-region="private"]' });
    await record('14-turn-ended-while-confirming', playerOne, { commandRequests: commandCalls(mark) });

    // 9. The connection drops while a choice is on screen.
    await restart(all);
    await playerOne.foreground();
    await openPanel(playerOne);
    await keyboardToConfirm(playerOne, 'seat-2');
    mark = requests.length;
    scenario.setConnected('seat-1', false);
    await playerOne.waitFor("document.querySelector('.ms-shell').dataset.connection === 'stale'", 'stale');
    await sleep(200);
    await playerOne.screenshot(join(out, '15-connection-lost-while-confirming.png'), { selector: '[data-region="private"]' });
    await record('15-connection-lost-while-confirming', playerOne, { commandRequests: commandCalls(mark) });
    scenario.setConnected('seat-1', true);
    await playerOne.waitFor("document.querySelector('.ms-shell').dataset.connection === 'live'", 'reconnected');
    await record('15b-reconnected', playerOne);

    // 10. A double tap on "Register shot". The first tap sends; the second lands on whatever
    // replaced the control. With a server that answers at once that is the result's own
    // control, and the result must still be there to be read afterwards.
    for (const [name, plan] of [['16-double-tap-on-register-accepted', 'scripted'], ['17-double-tap-on-register-rejected', 'reject-not-allowed']]) {
      await restart(all);
      await playerOne.foreground();
      await openPanel(playerOne);
      await playerOne.tap('#ms-shot-open');
      await playerOne.waitFor(step('targeting'), 'target list');
      await playerOne.tap('#ms-shot-target-seat-2');
      await playerOne.waitFor(step('confirming'), 'confirm step');
      await untilActive(playerOne, 'ms-shot-confirm');
      scenario.planNextCommand(plan);
      mark = requests.length;
      const where = await playerOne.tap('#ms-shot-confirm', { times: 2, gapMs: 150 });
      await sleep(700);
      await record(name, playerOne, {
        tappedTwiceAt: where,
        elementUnderTheSecondTap: await playerOne.evaluate(`document.elementFromPoint(${where.x}, ${where.y})?.closest('button, p, li, div')?.id || null`),
        commandRequests: commandCalls(mark),
        receiptsStored: scenario.status().commands.receipts,
      });
      if (plan !== 'scripted') await playerOne.screenshot(join(out, '17-rejection-still-shown-after-a-double-tap.png'), { selector: '[data-region="private"]' });
    }

    // 11. The page is reloaded while its request is still on its way. Only the command's
    // identifiers were kept; the reloaded page asks about it and offers no new target.
    await restart(all);
    await playerOne.foreground();
    await openPanel(playerOne);
    await keyboardToConfirm(playerOne, 'seat-3');
    scenario.planNextCommand('slow');
    mark = requests.length;
    await playerOne.tabTo('ms-shot-confirm');
    await playerOne.press('Enter');
    await playerOne.waitFor(status('submitting'), 'submitting before the reload');
    const KEPT = "Object.fromEntries(Object.keys(sessionStorage).map(key => [key, Object.keys(JSON.parse(sessionStorage.getItem(key))).sort()]))";
    const keptWhileUnresolved = await playerOne.evaluate(KEPT);
    const keptMentionsTheTarget = await playerOne.evaluate("Object.values(sessionStorage).some(value => /seat-3|REGISTER_SHOT|Officer|target/.test(value))");
    await playerOne.reload();
    await playerOne.foreground();
    await record('18-reloaded-while-the-request-was-on-its-way', playerOne, { privateLeftovers: await playerOne.evaluate(PRIVATE_LEFTOVERS) });
    await openPanel(playerOne);
    await playerOne.screenshot(join(out, '18-reloaded-checking.png'), { selector: '[data-region="private"]' });
    await record('18b-reloaded-panel-open', playerOne, { receiptsStoredSoFar: scenario.status().commands.receipts });
    await playerOne.waitFor(status('registered'), 'the earlier request landed', 8_000);
    await sleep(500);
    await playerOne.screenshot(join(out, '19-reloaded-registered.png'), { selector: '[data-region="private"]' });
    await record('19-reloaded-registered', playerOne, { commandRequests: commandCalls(mark), receiptsStored: scenario.status().commands.receipts });
    facts.keptAcrossAReload = {
      whileUnresolved: keptWhileUnresolved,
      mentionsTargetRoleOrCommandKind: keptMentionsTheTarget,
      afterTheOutcomeIsKnown: await playerOne.evaluate(KEPT),
    };

    // 12. A narrow phone with text doubled, through the whole flow by touch.
    await restart(all);
    const narrow = await openPage(browser, { width: 320, height: 640, scale: 2, mobile: true });
    await narrow.goto(`${origin}/harness/player.html?seat=seat-1`);
    await narrow.foreground();
    await narrow.evaluate("document.documentElement.style.fontSize = '200%'");
    await sleep(200);
    await narrow.tap('#ms-private-toggle');
    await narrow.waitFor("document.getElementById('ms-private-panel').textContent !== ''", 'panel open on the narrow phone');
    await narrow.tap('#ms-shot-open');
    await narrow.waitFor(step('targeting'), 'target list on the narrow phone');
    await sleep(200);
    await narrow.screenshot(join(out, '20-narrow-200-percent-choosing.png'), { selector: '[data-region="private"]' });
    await record('20-narrow-200-percent-choosing', narrow, { controlSizes: await narrow.evaluate(SIZES), rootFontSize: await narrow.evaluate('getComputedStyle(document.documentElement).fontSize') });
    await narrow.tap('#ms-shot-target-seat-6');
    await narrow.waitFor(step('confirming'), 'confirm step on the narrow phone');
    await untilActive(narrow, 'ms-shot-confirm');
    await narrow.screenshot(join(out, '21-narrow-200-percent-confirming.png'), { selector: '[data-region="private"]' });
    await record('21-narrow-200-percent-confirming', narrow, { controlSizes: await narrow.evaluate(SIZES) });
    await narrow.tap('#ms-shot-confirm');
    await narrow.waitFor(status('registered'), 'registered on the narrow phone', 8_000);
    await sleep(200);
    await narrow.screenshot(join(out, '22-narrow-200-percent-registered.png'), { selector: '[data-region="private"]' });
    await record('22-narrow-200-percent-registered', narrow, { controlSizes: await narrow.evaluate(SIZES) });
    // The first phone, same seat, learns of it from its own view and knows no target.
    await playerOne.foreground();
    await openPanel(playerOne);
    await playerOne.waitFor(status('registered'), 'the other device of the same seat sees a registration');
    await record('22b-same-seat-other-device', playerOne);

    // 13. What the pages kept, what the browser complained about, and what was asked of the server.
    facts.storage = await playerOne.evaluate(`(async () => ({
      localStorageKeys: Object.keys(localStorage), sessionStorageKeys: Object.keys(sessionStorage), cookie: document.cookie,
      indexedDatabases: (await indexedDB.databases()).map(database => database.name),
      cacheNames: await caches.keys(),
    }))()`);
    const logged = browser.events.filter(event => event.method === 'Log.entryAdded').map(event => event.params.entry);
    // A request the fixture leaves unanswered shows up in the browser's log as a 504.
    const arranged = entry => entry.source === 'network' && /submit-command|lookup-receipt|stream\?audience=seat-1/.test(entry.url ?? '');
    facts.browserLog = {
      uncaughtExceptions: browser.events.filter(event => event.method === 'Runtime.exceptionThrown').length,
      consoleErrors: browser.events.filter(event => event.method === 'Runtime.consoleAPICalled' && event.params.type === 'error').length,
      securityPolicyViolations: logged.filter(entry => entry.source === 'security' || /Content Security Policy/i.test(entry.text)).map(entry => entry.text),
      failedRequestsTheFixtureArranged: logged.filter(arranged).length,
      otherEntries: logged.filter(entry => !arranged(entry) && entry.level !== 'verbose' && entry.level !== 'info' && !/favicon\.ico/.test(entry.url ?? '')).map(entry => `${entry.level} ${entry.source}: ${entry.text}`),
    };
    const paths = requests.map(entry => `${entry.method} ${entry.path}`);
    facts.requests = {
      apiAndStyles: [...new Set(paths.filter(path => !path.includes('/modules/') && !path.includes('/harness/')))].sort(),
      fixtureModuleRequested: paths.some(path => /fixtures?\.(js|ts)/.test(path)),
      operatorEndpointsCalledByPages: paths.filter(path => path.includes('/api/operator/')),
      advanceIfExpiredCalls: paths.filter(path => path.includes('advance-if-expired')).length,
    };
  } finally {
    browser.close();
    await chrome.close();
    await devServer.close();
  }
  await writeFile(join(out, 'facts.json'), `${JSON.stringify(facts, null, 2)}\n`);
  console.log(`Wrote shot-flow fixture evidence to ${out}`);
}

const [outputDirectory] = process.argv.slice(2);
if (!outputDirectory) {
  console.error('Usage: node apps/game/dev/capture-shot-flow.mjs <output-directory>');
  process.exit(2);
}
await main(outputDirectory);
