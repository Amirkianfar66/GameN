// mothership:dev-only
//
// Optional evidence capture for the drawn cues and the motion gallery. Drives a locally
// installed Chromium-based browser against a private instance of the fixture server, with
// each audience's screen in a window of its own so that all of them are visible at once,
// and writes screenshots plus a file of measured facts.
//
// FIXTURE BEHAVIOR, NOT INTEGRATION, AND PLACEHOLDER MOTION. The server is a scripted
// double, its phase-change, move and status events are frontend-authored and synthetic,
// and the treatments are built from the token proposal: they are not approved art. A
// headless desktop browser is not a phone and measures no frame rate. To photograph a cue
// in mid-motion the script pauses it at a stated fraction of its own duration; nothing is
// paused in the runs whose timing is reported. It is not part of any check.
//
//   CHROME_PATH=/path/to/chrome node apps/game/dev/capture-cues.mjs <output-directory>

import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { connect, launchBrowser, openPage, sleep } from './capture/browser.mjs';
import { createDevServer } from './serve.mjs';

// A statement, not only a comment: it survives bundling and comment stripping, so the
// production-exclusion check finds this module wherever it ends up.
globalThis[Symbol.for('mothership:dev-only')] = true;

// Put into each page once: a log of every cue mark put on or taken off an element, and a
// switch that pauses a cue's animations at a fraction of their duration as they start.
const INSTALL = `(() => {
  if (window.__cues) return;
  const state = window.__cues = { log: [], freezeAt: null, frozen: [], clicks: [] };
  new MutationObserver(records => {
    for (const record of records) {
      const element = record.target;
      const now = element.getAttribute('data-cue');
      if (now === record.oldValue) continue;
      state.log.push({ ms: Math.round(performance.now()), at: element.getAttribute('data-cue-at'), tag: element.tagName.toLowerCase(), cue: now, inPrivatePanel: Boolean(element.closest('#ms-private-panel')) });
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-cue'], attributeOldValue: true, subtree: true });
  document.addEventListener('animationstart', event => {
    if (state.freezeAt === null || !/^(ms-cue|gallery)-/.test(event.animationName)) return;
    for (const animation of event.target.getAnimations({ subtree: true })) {
      if (!/^(ms-cue|gallery)-/.test(animation.animationName ?? '') || animation.playState === 'paused') continue;
      animation.pause();
      animation.currentTime = animation.effect.getComputedTiming().duration * state.freezeAt;
      state.frozen.push(animation.animationName);
    }
  }, true);
  document.addEventListener('click', event => state.clicks.push({ ms: Math.round(performance.now()), id: event.target.closest('[id]')?.id ?? null }), true);
})()`;

/** Every element marked for a cue right now, with what the stylesheet is doing to it. */
const MARKS = `[...document.querySelectorAll('[data-cue]')].map(node => {
  const style = getComputedStyle(node);
  return {
    at: node.getAttribute('data-cue-at'), tag: node.tagName.toLowerCase(), cue: node.dataset.cue,
    animation: style.animationName, duration: style.animationDuration,
    layers: [getComputedStyle(node, '::before').content, getComputedStyle(node, '::after').content].filter(content => content !== 'none' && content !== 'normal').length,
    inPrivatePanel: Boolean(node.closest('#ms-private-panel')),
  };
})`;
const ADDED = "window.__cues.log.filter(entry => entry.cue !== null)";
/** Everything on the page except the countdown, which ticks by itself. */
const WITHOUT_TIMER = "[...document.querySelectorAll('[data-region]')].filter(node => node.dataset.region !== 'timer').map(node => node.outerHTML).join('')";
/** The same without the private region, to see whether anything outside it changed. */
const PUBLIC_PART = "[...document.querySelectorAll('[data-region]')].filter(node => !['timer', 'private'].includes(node.dataset.region) && !node.closest('[data-region=\"private\"]')).map(node => node.outerHTML).join('')";
const OVERFLOW = 'document.documentElement.scrollWidth > innerWidth';
const PLACE_OF = seat => `document.querySelector('li[data-cue-at="${seat}/place"]')?.closest('.ms-zone')?.dataset.zone ?? null`;

async function main(outputDirectory) {
  const out = resolve(outputDirectory);
  await mkdir(out, { recursive: true });
  const devServer = createDevServer();
  const origin = await devServer.listen(0);
  const { scenario } = devServer;
  const chrome = await launchBrowser();
  const browser = await connect(chrome.endpoint);
  const facts = {
    note: 'Fixture evidence from a headless desktop browser. Placeholder motion, synthetic events, a scripted server. Not a device measurement and not backend integration. Images marked "paused" show a cue stopped at the stated fraction of its duration so that it can be photographed.',
    harness: {},
    gallery: {},
  };
  const freeze = (page, fraction) => page.evaluate(`window.__cues.freezeAt = ${fraction === null ? 'null' : fraction}; window.__cues.frozen = []`);
  /** Lets every paused cue run out, as it would have. */
  const release = page => page.evaluate("window.__cues.freezeAt = null; for (const animation of document.getAnimations()) if (animation.playState === 'paused') animation.finish()");
  const cueSeen = (page, selector = '[data-cue]') => page.waitFor(`document.querySelector(${JSON.stringify(selector)})`, `a cue mark: ${selector}`, 5_000);
  const noMarks = page => page.waitFor("document.querySelectorAll('[data-cue]').length === 0", 'cue marks taken off again', 4_000);

  try {
    const { product, userAgent } = await browser.send('Browser.getVersion');
    facts.browser = { product, userAgent, headless: true };

    const phoneSize = { width: 390, height: 844, scale: 2, mobile: true, ownWindow: true };
    const table = await openPage(browser, { width: 1280, height: 800, ownWindow: true });
    const playerOne = await openPage(browser, phoneSize);
    const playerTwo = await openPage(browser, phoneSize);
    await table.goto(`${origin}/harness/table.html`);
    await playerOne.goto(`${origin}/harness/player.html?seat=seat-1`);
    await playerTwo.goto(`${origin}/harness/player.html?seat=seat-2`);
    const screens = { table, playerOne, playerTwo };
    const each = async read => Object.fromEntries(await Promise.all(Object.entries(screens).map(async ([name, page]) => [name, await read(page, name)])));
    for (const page of Object.values(screens)) await page.evaluate(INSTALL);
    await sleep(600);
    facts.harness.allVisibleAtOnce = await each(page => page.evaluate('document.visibilityState'));
    facts.harness.durationsFromTheTokenStylesheet = await table.evaluate("Object.fromEntries(['--ms-motion-selection', '--ms-motion-card', '--ms-motion-stamp', '--ms-motion-move', '--ms-motion-round', '--ms-motion-reduced-fade', '--ms-motion-beat-max'].map(name => [name, getComputedStyle(document.documentElement).getPropertyValue(name).trim()]))");

    // 1. A registration: a stamp inside the registering player's open private panel, and
    // nothing at all on the table or on the other phone.
    const before = { table: await table.evaluate(WITHOUT_TIMER), playerTwo: await playerTwo.evaluate(WITHOUT_TIMER) };
    await playerOne.tap('#ms-private-toggle');
    await playerOne.waitFor("document.getElementById('ms-private-panel').textContent !== ''", 'private panel open');
    await playerOne.tap('#ms-shot-open');
    await playerOne.waitFor("document.querySelector('.ms-card__state')?.dataset.step === 'targeting'", 'target list');
    await playerOne.tap('#ms-shot-target-seat-2');
    await playerOne.waitFor("document.getElementById('ms-shot-confirm')?.getAttribute('aria-disabled') !== 'true' && document.getElementById('ms-shot-confirm')", 'confirm control active');
    const publicPartBefore = await playerOne.evaluate(PUBLIC_PART);
    await freeze(playerOne, 0.35);
    await playerOne.tap('#ms-shot-confirm');
    await cueSeen(playerOne, '[data-cue="registration"]');
    await playerOne.screenshot(join(out, '01-registration-stamp-paused-at-35-percent.png'), { selector: '[data-action="shot"]' });
    facts.harness.registration = {
      marksOnTheRegisteringPhone: await playerOne.evaluate(MARKS),
      cardSays: await playerOne.evaluate("document.querySelector('.ms-card__status').textContent + ' / ' + document.getElementById('ms-shot-step').textContent"),
      spokenPrivately: await playerOne.evaluate("[...document.querySelectorAll('[data-private=\"true\"]')].map(node => node.textContent)"),
      publicPartOfTheRegisteringPhoneUnchanged: (await playerOne.evaluate(PUBLIC_PART)) === publicPartBefore,
      tableDocumentUnchanged: (await table.evaluate(WITHOUT_TIMER)) === before.table,
      otherPhoneDocumentUnchanged: (await playerTwo.evaluate(WITHOUT_TIMER)) === before.playerTwo,
      marksEverPutOnTheTable: (await table.evaluate(ADDED)).length,
      marksEverPutOnTheOtherPhone: (await playerTwo.evaluate(ADDED)).length,
      commandIdentifierInAnyDocument: await each(page => page.evaluate("/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(document.documentElement.outerHTML)")),
    };
    await release(playerOne);
    // Closing the panel takes the place for the cue, and anything on it, out of the document.
    await playerOne.tap('#ms-private-toggle');
    await playerOne.waitFor("document.getElementById('ms-private-panel').textContent === ''", 'private panel closed');
    facts.harness.registration.afterClosingThePanel = {
      marks: (await playerOne.evaluate(MARKS)).length,
      placesForARegistrationCue: await playerOne.evaluate("document.querySelectorAll('[data-cue-at=\"registration\"]').length"),
    };

    // 2. A public phase change: one mark on the phase labels of every screen. The countdown
    // beside them is not marked and goes on showing the time.
    for (const page of Object.values(screens)) await freeze(page, 0.5);
    scenario.endFirstTurn();
    for (const page of Object.values(screens)) await cueSeen(page);
    await table.screenshot(join(out, '02-table-phase-change-paused-at-50-percent.png'), { selector: '.ms-phase' });
    await playerTwo.screenshot(join(out, '03-phone-phase-change-paused-at-50-percent.png'), { selector: '.ms-phase' });
    facts.harness.phaseChange = await each(async page => ({
      marks: await page.evaluate(MARKS),
      phaseSays: await page.evaluate("document.querySelector('.ms-phase__label').textContent"),
      countdownShows: await page.evaluate("document.querySelector('.ms-timer__digits')?.textContent ?? null"),
      countdownIsMarked: await page.evaluate("Boolean(document.querySelector('.ms-timer [data-cue], .ms-timer[data-cue]'))"),
      spoken: await page.evaluate("[...document.querySelectorAll('#ms-live-polite p')].at(-1)?.textContent ?? null"),
    }));
    for (const page of Object.values(screens)) await release(page);

    // 3. A synthetic public move: the token's own list item on every screen, and the
    // location cell in the table's roster.
    for (const page of Object.values(screens)) {
      await noMarks(page);
      await freeze(page, 0.25);
    }
    scenario.synthetic('move');
    for (const page of Object.values(screens)) await cueSeen(page);
    await table.screenshot(join(out, '04-table-public-move-paused-at-25-percent.png'), { selector: '.ms-board' });
    await table.screenshot(join(out, '05-table-roster-location-cell-lit.png'), { selector: '#ms-roster' });
    await playerTwo.screenshot(join(out, '06-phone-public-move-paused-at-25-percent.png'), { selector: '.ms-roster' });
    facts.harness.publicMove = await each(async page => ({
      marks: await page.evaluate(MARKS),
      playerEightIsListedUnder: await page.evaluate(PLACE_OF('seat-8')),
      horizontalOverflowWhileTheCueIsAtItsStart: await page.evaluate(OVERFLOW),
      spoken: await page.evaluate("[...document.querySelectorAll('#ms-live-polite p')].at(-1)?.textContent ?? null"),
    }));
    for (const page of Object.values(screens)) await release(page);

    // 4. A synthetic public status change: the status itself, and the health cell in the roster.
    for (const page of Object.values(screens)) {
      await noMarks(page);
      await freeze(page, 0.25);
    }
    scenario.synthetic('status');
    for (const page of Object.values(screens)) await cueSeen(page);
    await table.screenshot(join(out, '07-table-status-change-paused-at-25-percent.png'), { selector: '.ms-board' });
    facts.harness.statusChange = await each(async page => ({
      marks: await page.evaluate(MARKS),
      playerNineReads: await page.evaluate("document.querySelector('span[data-cue-at=\"seat-9/health\"]').textContent"),
      wordsOfAnAttackAnywhereOnScreen: await page.evaluate("/shot at|was hit|attack|BANG|BLOCKED|blocked by/i.test(document.querySelector('.ms-main').textContent)"),
    }));
    for (const page of Object.values(screens)) await release(page);

    // 5. Left alone, every mark is taken off again.
    for (const page of Object.values(screens)) await noMarks(page);
    facts.harness.marksLeftAfterTheLongestBeat = await each(page => page.evaluate("document.querySelectorAll('[data-cue]').length"));

    // 6. Everything sent again: no cue is played a second time.
    const counted = () => each(async page => (await page.evaluate(ADDED)).length);
    let marksBefore = await counted();
    for (const audience of ['public', 'seat-1', 'seat-2']) {
      scenario.redeliverEvents(audience);
      scenario.redeliver(audience);
      scenario.redeliverEvents(audience);
    }
    await sleep(600);
    facts.harness.everythingSentAgain = { marksBefore, marksAfter: await counted() };

    // 7. Every feed drops, the match moves on, the feeds come back and hand over their
    // whole streams. The screens show the new facts and play nothing for them.
    marksBefore = await counted();
    for (const audience of ['public', 'seat-1', 'seat-2']) scenario.setConnected(audience, false);
    for (const page of Object.values(screens)) await page.waitFor("document.querySelector('.ms-shell').dataset.connection === 'stale'", 'connection lost');
    scenario.synthetic('move');
    scenario.synthetic('status');
    const whileAway = await each(page => page.evaluate(PLACE_OF('seat-8')));
    for (const audience of ['public', 'seat-1', 'seat-2']) scenario.setConnected(audience, true);
    for (const page of Object.values(screens)) await page.waitFor("document.querySelector('.ms-shell').dataset.connection === 'live'", 'reconnected', 15_000);
    await sleep(500);
    facts.harness.reconnect = {
      playerEightWasListedUnderWhileAway: whileAway,
      playerEightIsListedUnderAfterwards: await each(page => page.evaluate(PLACE_OF('seat-8'))),
      playerNineReadsAfterwards: await each(page => page.evaluate("document.querySelector('span[data-cue-at=\"seat-9/health\"]').textContent")),
      eventsEachStreamHandedOverAgain: scenario.status().events.stored,
      marksBefore,
      marksAfter: await counted(),
      spoken: await each(page => page.evaluate("[...document.querySelectorAll('#ms-live-polite p')].at(-1)?.textContent ?? null")),
    };

    // 8. Events delivered before the view they belong to: still one mark per place.
    marksBefore = await counted();
    scenario.setEventOrder('event-first');
    scenario.synthetic('move');
    for (const page of Object.values(screens)) await cueSeen(page);
    facts.harness.eventsBeforeTheirView = { marksBefore, marksAfter: await counted(), marks: await each(page => page.evaluate(MARKS)) };
    scenario.setEventOrder('view-first');
    for (const page of Object.values(screens)) await noMarks(page);

    // 9. Nothing waits for a cue: a tap made while one plays is taken at once. Nothing is paused here.
    await playerTwo.evaluate('window.__cues.clicks = []');
    const logBefore = (await playerTwo.evaluate('window.__cues.log')).length;
    scenario.synthetic('status');
    await playerTwo.tap('#ms-private-toggle');
    await playerTwo.waitFor("document.getElementById('ms-private-toggle').getAttribute('aria-expanded') === 'true'", 'panel opened during a cue');
    const cueAt = (await playerTwo.evaluate('window.__cues.log')).slice(logBefore).find(entry => entry.cue === 'status-change')?.ms ?? null;
    const tapAt = (await playerTwo.evaluate('window.__cues.clicks')).find(click => click.id === 'ms-private-toggle')?.ms ?? null;
    facts.harness.tapDuringACue = {
      cueMarkedAtMs: cueAt,
      tapTakenAtMs: tapAt,
      tapTakenThisLongAfterTheCueStartedMs: cueAt === null || tapAt === null ? null : tapAt - cueAt,
      cueLastsMs: 220,
      privatePanelOpened: await playerTwo.evaluate("document.getElementById('ms-private-toggle').getAttribute('aria-expanded') === 'true'"),
      countdownStillShows: await playerTwo.evaluate("document.querySelector('.ms-timer__digits')?.textContent ?? null"),
    };
    await playerTwo.tap('#ms-private-toggle');
    for (const page of Object.values(screens)) await noMarks(page);

    // 10. Reduced motion as the device asks for it: the same marks, the short fade, no layers.
    await table.media({ 'prefers-reduced-motion': 'reduce' });
    await table.waitFor("document.querySelector('.ms-shell').dataset.motion === 'reduced'", 'device setting honored');
    await freeze(table, 0.5);
    scenario.synthetic('move');
    await cueSeen(table);
    facts.harness.reducedMotionFromTheDevice = { shellSays: await table.evaluate("document.querySelector('.ms-shell').dataset.motion"), marks: await table.evaluate(MARKS), playerEightIsListedUnder: await table.evaluate(PLACE_OF('seat-8')) };
    await release(table);
    await table.media({ 'prefers-reduced-motion': 'no-preference' });
    await table.waitFor("document.querySelector('.ms-shell').dataset.motion === 'full'", 'device setting withdrawn');
    for (const page of Object.values(screens)) await noMarks(page);

    // 11. Reduced motion chosen in the app while a cue is in mid-travel: the travel is
    // replaced by the fade at once, on the element that was moving.
    await freeze(playerTwo, 0.1);
    scenario.synthetic('move');
    await cueSeen(playerTwo, 'li[data-cue="public-move"]');
    const travelling = await playerTwo.evaluate(MARKS);
    await playerTwo.tap('#ms-reduce-motion');
    await playerTwo.waitFor("document.querySelector('.ms-shell').dataset.motion === 'reduced'", 'in-app choice applied');
    facts.harness.reducedMotionChosenWhileACuePlays = { before: travelling, after: await playerTwo.evaluate(MARKS) };
    await release(playerTwo);
    await playerTwo.tap('#ms-reduce-motion');
    await playerTwo.waitFor("document.querySelector('.ms-shell').dataset.motion === 'full'", 'in-app choice undone');
    for (const page of Object.values(screens)) await noMarks(page);

    // 12. A screen nobody is looking at: its window is minimized, a fact changes, and the
    // window comes back. The fact is there; no cue was played for it, then or afterwards.
    const { targetInfos } = await browser.send('Target.getTargets');
    const tableTarget = targetInfos.find(target => target.url.includes('/harness/table.html'));
    const { windowId } = await browser.send('Browser.getWindowForTarget', { targetId: tableTarget.targetId });
    marksBefore = (await table.evaluate(ADDED)).length;
    await browser.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'minimized' } });
    await table.waitFor("document.visibilityState === 'hidden'", 'table window minimized');
    scenario.synthetic('status');
    await sleep(500);
    const whileHidden = { visibility: await table.evaluate('document.visibilityState'), playerNineReads: await table.evaluate("document.querySelector('span[data-cue-at=\"seat-9/health\"]').textContent") };
    await browser.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
    await table.waitFor("document.visibilityState === 'visible'", 'table window back');
    await sleep(1_200);
    facts.harness.hiddenScreen = { whileHidden, marksBefore, marksAfterComingBack: (await table.evaluate(ADDED)).length };

    // 13. A narrow phone with text doubled, with the move cue held at its very start, where
    // the token is furthest from its place.
    const narrow = await openPage(browser, { width: 320, height: 640, scale: 2, mobile: true, ownWindow: true });
    await narrow.goto(`${origin}/harness/player.html?seat=seat-2`);
    await narrow.evaluate(INSTALL);
    await narrow.evaluate("document.documentElement.style.fontSize = '200%'");
    await sleep(400);
    await freeze(narrow, 0);
    scenario.synthetic('move');
    await cueSeen(narrow, 'li[data-cue="public-move"]');
    await narrow.screenshot(join(out, '08-narrow-200-percent-public-move-paused-at-its-start.png'), { selector: '.ms-roster' });
    facts.harness.narrowPhoneWithTextDoubled = {
      rootFontSize: await narrow.evaluate('getComputedStyle(document.documentElement).fontSize'),
      marks: await narrow.evaluate(MARKS),
      horizontalOverflowWhileTheCueIsAtItsStart: await narrow.evaluate(OVERFLOW),
    };
    await release(narrow);

    // The motion gallery: every specimen, each cue paused part-way for its picture.
    const gallery = await openPage(browser, { width: 1100, height: 1000, scale: 2, ownWindow: true });
    await gallery.goto(`${origin}/harness/gallery.html`);
    await gallery.evaluate(INSTALL);
    const choose = (name, value) => gallery.evaluate(`(() => { const input = document.querySelector('input[name="${name}"][value="${value}"]'); input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    const replay = () => gallery.evaluate("document.getElementById('gallery-replay').click()");
    const ABOUT = "Object.fromEntries([...document.querySelectorAll('#gallery-about dt')].map(term => [term.textContent, term.nextElementSibling.textContent]))";
    const READY = { 'card-selection': '.ms-card__state[data-selected="true"]', 'resolved-shot': '.gallery-overlay', 'blocked-outcome': '.gallery-overlay' };
    const specimens = await gallery.evaluate("[...document.querySelectorAll('input[name=\"specimen\"]')].map(input => input.value)");
    facts.gallery.pageSaysItIsDevelopmentOnly = await gallery.evaluate("document.querySelector('.harness-warning').textContent");
    facts.gallery.specimens = {};
    let image = 9;
    for (const id of specimens) {
      await freeze(gallery, 0.35);
      await choose('specimen', id);
      await cueSeen(gallery, READY[id] ?? '[data-cue]');
      await sleep(id === 'card-selection' ? 200 : 60);
      facts.gallery.specimens[id] = {
        about: await gallery.evaluate(ABOUT),
        issued: await gallery.evaluate("document.getElementById('gallery-issued').textContent"),
        marks: await gallery.evaluate(MARKS),
        pausedAnimations: await gallery.evaluate('[...new Set(window.__cues.frozen)]'),
        drawnByTheGalleryItself: await gallery.evaluate("[...document.querySelectorAll('.gallery-overlay')].map(node => ({ kind: node.dataset.kind, lettering: node.textContent, hiddenFromAssistiveTechnology: node.getAttribute('aria-hidden') === 'true', takesPointerEvents: getComputedStyle(node).pointerEvents !== 'none', insideTheShell: Boolean(node.closest('.ms-shell')) }))"),
        shellsInTheDocument: await gallery.evaluate("document.querySelectorAll('.ms-shell').length"),
        duplicateIds: await gallery.evaluate("(() => { const ids = [...document.querySelectorAll('[id]')].map(node => node.id); return ids.filter((id, index) => ids.indexOf(id) !== index); })()"),
        labeledAsSyntheticOnScreen: await gallery.evaluate("document.getElementById('ms-banner-source')?.textContent ?? null"),
        shellMarkupMentionsTheTreatment: await gallery.evaluate("/BANG|BLOCKED/.test(document.querySelector('.ms-shell').outerHTML)"),
      };
      const where = id === 'registration' || id === 'card-selection' ? '[data-action="shot"]' : id.includes('phase') || id.includes('round') ? '.ms-phase' : '.ms-board';
      await gallery.screenshot(join(out, `${String(image).padStart(2, '0')}-gallery-${id}-paused-at-35-percent.png`), { selector: where });
      image += 1;
      await release(gallery);
      await sleep(1_300);
    }
    await gallery.screenshot(join(out, `${image}-gallery-whole-page.png`));

    // The two settings, on the specimen with the most layers and on one drawn by the gallery alone.
    facts.gallery.settings = {};
    for (const [id, ready] of [['public-move', 'li[data-cue="public-move"]'], ['round-transition', '[data-cue="round-transition"]']]) {
      const variants = {};
      for (const [label, motion, effects] of [['normal', 'full', 'full'], ['reducedMotion', 'reduced', 'full'], ['reducedEffects', 'full', 'reduced'], ['both', 'reduced', 'reduced']]) {
        await choose('motion', motion);
        await choose('effects', effects);
        await freeze(gallery, 0.3);
        await choose('specimen', id);
        await replay();
        await cueSeen(gallery, ready);
        variants[label] = {
          shellSays: await gallery.evaluate("document.querySelector('.ms-shell').dataset.motion"),
          stageSays: await gallery.evaluate("document.getElementById('gallery-stage').dataset.effects"),
          marks: await gallery.evaluate(MARKS),
          headingAnimation: await gallery.evaluate("getComputedStyle(document.querySelector('.ms-phase__round')).animationName"),
        };
        await release(gallery);
        await sleep(1_100);
      }
      facts.gallery.settings[id] = variants;
    }
    await choose('motion', 'full');
    await choose('effects', 'full');

    // Picking a card up, unpaused: what the stylesheet does to the card.
    await freeze(gallery, null);
    await choose('specimen', 'card-selection');
    await gallery.waitFor("document.querySelector('.ms-card__state[data-selected=\"true\"]')", 'card picked up', 6_000);
    await sleep(250);
    facts.gallery.cardSelection = await gallery.evaluate("(() => { const style = getComputedStyle(document.querySelector('.ms-card')); return { transform: style.transform, transition: style.transitionProperty + ' ' + style.transitionDuration, cardSays: document.querySelector('.ms-card__status').textContent }; })()");

    const problems = browser.events.filter(event => event.method === 'Runtime.exceptionThrown' || (event.method === 'Log.entryAdded' && ['error', 'warning'].includes(event.params.entry.level)));
    const expected = problem => problem.method === 'Log.entryAdded' && (/favicon\.ico/.test(problem.params.entry.url ?? '') || (problem.params.entry.source === 'network' && /\/api\/fixture\/stream/.test(problem.params.entry.url ?? '')));
    facts.browserLog = {
      uncaughtExceptions: problems.filter(problem => problem.method === 'Runtime.exceptionThrown').length,
      consoleErrorsAndWarnings: problems.filter(problem => problem.method === 'Log.entryAdded' && !expected(problem)).map(problem => problem.params.entry.text),
      securityPolicyViolations: problems.filter(problem => /Content Security Policy/i.test(problem.params?.entry?.text ?? '')).length,
      failedFeedConnectionsTheScriptArranged: problems.filter(problem => expected(problem) && !/favicon/.test(problem.params.entry.url ?? '')).length,
    };
    await writeFile(join(out, 'facts.json'), `${JSON.stringify(facts, null, 2)}\n`);
    console.log(`Wrote cue evidence to ${out}`);
  } finally {
    browser.close();
    await chrome.close();
    await devServer.close();
  }
}

const [outputDirectory] = process.argv.slice(2);
if (!outputDirectory) {
  console.error('Usage: node apps/game/dev/capture-cues.mjs <output-directory>');
  process.exit(2);
}
await main(outputDirectory);
