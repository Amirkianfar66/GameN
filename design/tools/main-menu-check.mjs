// mothership:dev-only
//
// The main menu's check (design/phone-ui/components/main-menu). It bundles the component's preview the way
// the game bundles the component (Vite: ordinary bundling, no copy), serves the bundle with the hosted
// game's production response headers (design/tools/lib/component-check.mjs), and captures every state of
// sheet 10 and the Largest text at the two development phone sizes, 390 × 844 and 430 × 932, in desktop
// Chromium at 2× pixels. The hero's place shows a still of the approved brand film at 1.65 s (Motion &
// Cinematics', dev-only in the preview), where the game's player draws its held frame.
// A capture passes with no policy violation, no failed or refused request and no page error, with the menu
// drawn as the state asks.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce
//   motion emulated: the parts, taps, offline, busy, refusals, focus, the safe areas, layout, the Largest
//   text, input, dispose, motion;
//   the agreement (preview/agree.mjs): the menu beside the frozen pack's main menu, the same words, states,
//   look and boxes to within half a pixel.
// Every check must pass. It writes design/phone-ui/components/main-menu/review/: one JPEG per state and
// size, and check.json (the headers and their SHA-256, the source commit, what each capture drew and its
// SHA-256, and each probe and agreement check with what it saw).
//   node design/tools/main-menu-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone,
// not Safari, not a performance measure.

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/main-menu');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
/** Each state at the two development sizes (preview.mjs PREVIEW_STATES). */
const STATES = ['menu', 'offline', 'large', 'large-offline'];
const OFFLINE = 'No connection. Join, Host and Recover return when you are back online.';

/** The preview bundled as the game bundles the component (component-check.mjs). */
const bundle = () => bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'main-menu-check' });

// The source the captures show, read before anything is written: the components' files and the film the
// preview draws, without the review folders.
const { sourceCommit, sourceClean } = sourceState(REPO, ['design/phone-ui/components', 'design/pregame-films']);
const out = await bundle();
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const results = {};
const probes = {};
let agreement = null;
let failed = 0;
/** What every state shows, and what each one adds, from the menu's own DOM. */
const drawn = s => s.join === 'Join Enter a room code' && s.host === 'Host Open a room for 7–9 players' && s.recover === 'Recover my seat'
  && s.settings === 'Display settings' && s.hero > 0 && s.canvas === 'rgb(16, 20, 28)' && s.settingsTop === 51 && s.choicesBottom === 52 && s.clear;
const online = s => s.note === null && s.refused.every(v => v === null) && s.opacity.every(v => v === '1');
const offline = s => s.note === OFFLINE && s.refused.every(v => v === 'true') && JSON.stringify(s.opacity) === '["1","1","0.4"]';
const EXPECT = {
  menu: s => drawn(s) && online(s) && s.root === 16,
  offline: s => drawn(s) && offline(s) && s.root === 16,
  large: s => drawn(s) && online(s) && s.root === 32,
  'large-offline': s => drawn(s) && offline(s) && s.root === 32,
};
try {
  await mkdir(REVIEW, { recursive: true });
  for (const state of STATES) {
    for (const sizeKey of ['390x844', '430x932']) {
      const [width, height] = SIZES[sizeKey];
      const query = `size=${sizeKey}&state=${state}`;
      const page = await openPage(browser, { width, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__mainMenu !== undefined');
      await page.evaluate('window.__mainMenu.ready');
      await sleep(400);
      const seen = await page.evaluate(`(() => {
        const root = document.querySelector('.ms-main-menu'), q = s => root.querySelector(s);
        const f = root.getBoundingClientRect(), rel = n => n.getBoundingClientRect();
        const words = n => n ? n.innerText.replace(/\\s+/g, ' ').trim() : null;
        const choices = [q('.ms-ep-entry[data-tone="primary"]'), q('.ms-ep-entry:not([data-tone])'), q('.ms-mm-recover')];
        const settings = q('.ms-mm-settings .ms-k-icon-btn'), actions = q('.ms-mm-actions');
        return { violations: window.__policy, root: parseFloat(getComputedStyle(document.documentElement).fontSize),
          join: words(choices[0]), host: words(choices[1]), recover: words(choices[2]), settings: settings.getAttribute('aria-label'),
          note: words(q('.ms-k-error')), refused: choices.map(n => n.getAttribute('aria-disabled')), opacity: choices.map(n => getComputedStyle(n).opacity),
          hero: q('.ms-mm-hero').childElementCount, canvas: getComputedStyle(root).backgroundColor,
          settingsTop: rel(settings).top - f.top, choicesBottom: f.bottom - rel(actions).bottom, clear: rel(actions).top > rel(settings).bottom,
          layout: window.__mainMenu.mounted[0]?.layout?.() ?? null };
      })()`);
      const requests = page.requests().filter(url => /\.svg$/.test(url)).map(url => url.slice(origin.length + 1));
      // The browser asks for /favicon.ico by itself; the preview has none, as the live site has none.
      const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
      for (const v of seen.violations) v.kind = await classify(out, v);
      const file = join(REVIEW, `${sizeKey}-${state}.jpg`);
      const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width, height, scale: 1 } });
      const bytes = Buffer.from(data, 'base64');
      await writeFile(file, bytes);
      const asked = EXPECT[state](seen);
      const ok = seen.violations.every(v => v.kind !== 'unexpected') && problems.length === 0 && asked;
      if (!ok) failed += 1;
      results[`${sizeKey}/${state}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), ok, drawn: asked, ...seen, requests, problems };
      await page.close();
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${state}: "${seen.join}", note "${seen.note}", refused ${seen.refused.filter(Boolean).length}, root ${seen.root}px, unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}${asked ? '' : `, NOT AS EXPECTED ${JSON.stringify(seen).slice(0, 600)}`}`);
    }
  }
  // The lifecycle probe, as the page comes and with the device's Reduce motion; then the agreement with the pack.
  for (const [mode, media, query] of [['full', null, 'probe=1'], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }, 'probe=1'], ['agree', null, 'agree=1']]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__mainMenu !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__mainMenu.agree' : 'window.__mainMenu.probe');
    const violations = await page.evaluate('window.__policy');
    for (const v of violations) v.kind = await classify(out, v);
    const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
    const ok = outcome.ok && outcome.mode === mode && outcome.checks.length > 0 && problems.length === 0 && violations.every(v => v.kind !== 'unexpected');
    if (!ok) failed += 1;
    // The run's own verdict last, so the page's (outcome.ok) never stands in for it.
    const entry = { emulated: media ?? {}, ...outcome, ok, violations, problems };
    if (mode === 'agree') agreement = entry; else probes[mode] = entry;
    await page.close();
    for (const c of outcome.checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'} ${mode === 'agree' ? '' : `probe ${mode} · `}${c.id}${c.ok ? '' : ` ${JSON.stringify(c.detail).slice(0, 1500)}`}`);
    if (outcome.error) console.log(`FAIL ${mode}: ${outcome.error}`);
  }
} finally {
  browser.close();
  chrome.close?.();
  server.close();
  if (process.argv.includes('--keep')) console.log(`kept the bundle in ${out}`); else await rm(out, { recursive: true, force: true });
}
const record = {
  tool: 'design/tools/main-menu-check.mjs',
  component: 'design/phone-ui/components/main-menu',
  sourceCommit, sourceClean,
  environment: 'Desktop Chromium (headless), each phone size at 2x pixels; the preview bundled by Vite and served with the production headers below. Not a phone, not Safari, not a performance measure.',
  ...recordedHeaders(),
  captures: results,
  probe: probes,
  agree: agreement,
};
await writeFile(join(REVIEW, 'check.json'), `${JSON.stringify(record, null, 2)}\n`);
const passedCaptures = Object.values(results).filter(r => r.ok).length;
const probeChecks = Object.values(probes).flatMap(p => p.checks ?? []);
const agreeChecks = agreement?.checks ?? [];
console.log(`${passedCaptures} of ${Object.keys(results).length} captures passed; probe ${probeChecks.filter(c => c.ok).length} of ${probeChecks.length} checks; agreement ${agreeChecks.filter(c => c.ok).length} of ${agreeChecks.length}; wrote ${REVIEW.slice(REPO.length + 1)}/check.json`);
if (failed) process.exitCode = 1;
