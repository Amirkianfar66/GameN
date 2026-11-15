// mothership:dev-only
//
// The boarding stage's check (design/phone-ui/components/boarding-stage). It bundles the component's preview
// the way the game bundles the component (Vite: ordinary bundling, no copy), serves the bundle with the
// hosted game's production response headers (design/tools/lib/component-check.mjs), and captures every
// state of sheet 19 and the ones around it at the two development phone sizes, 390 × 844 and 430 × 932, in
// desktop Chromium at 2× pixels. The film's place shows a still of the approved boarding film (Motion &
// Cinematics', dev-only in the preview), where the game mounts its player.
// A capture passes with no policy violation, no failed or refused request and no page error, with the stage
// drawn as the state asks.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce
//   motion emulated: focus, refused taps, the clock, concealment, the film's element, dispose, motion;
//   the agreement (preview/agree.mjs): the stage beside the frozen pack's boarding screen, the same words,
//   states and boxes to within half a pixel.
// Every check must pass. It writes design/phone-ui/components/boarding-stage/review/: one JPEG per state and
// size, and check.json (the headers and their SHA-256, the source commit, what each capture drew and its
// SHA-256, and each probe and agreement check with what it saw).
//   node design/tools/boarding-stage-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone,
// not Safari, not a performance measure.

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/boarding-stage');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
/** Each state at the two development sizes (preview.mjs PREVIEW_STATES). */
const STATES = ['film15', 'film6', 'holding', 'waiting', 'display', 'reduced', 'noclock', 'stale', 'concealed', 'large'];

/** The preview bundled as the game bundles the component (component-check.mjs). */
const bundle = () => bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'boarding-stage-check' });

// The source the captures show, read before anything is written: the components' files and the films and crew
// the preview draws, without the review folders.
const { sourceCommit, sourceClean } = sourceState(REPO, ['design/phone-ui/components', 'design/crew-drawing', 'design/pregame-films']);
const out = await bundle();
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const results = {};
const probes = {};
let agreement = null;
let failed = 0;
/** What a state must show, from the stage's own DOM. */
const EXPECT = {
  film15: s => s.view === 'film' && s.filmShown && s.skip === 'Skip' && s.film > 0 && s.skipBottom === 48,
  film6: s => s.view === 'film' && s.filmShown && s.skip === 'Skip' && s.film > 0,
  holding: s => s.view === 'holding' && !s.filmShown && s.title === 'Boarding' && s.line === 'Round 1 in 0:04' && s.role === 'timer' && s.canvas,
  waiting: s => s.view === 'waiting' && s.title === 'Starting Round 1' && s.line === 'Waiting for the ship' && s.spinner && s.role === 'status' && s.canvas,
  display: s => s.view === 'film' && s.filmShown && s.skip === null && s.film > 0,
  reduced: s => s.view === 'film' && s.motion === 'reduced' && s.film > 0,
  noclock: s => s.view === 'holding' && s.title === 'Boarding' && s.line === null,
  stale: s => s.status === 'stale' && s.banner === 'Connection lost' && s.title === 'Boarding',
  concealed: s => s.status === 'concealed' && s.name === 'Hidden' && s.covered && !s.filmShown,
  large: s => s.view === 'waiting' && s.title === 'Starting Round 1',
};
try {
  await mkdir(REVIEW, { recursive: true });
  for (const state of STATES) {
    for (const sizeKey of ['390x844', '430x932']) {
      const [width, height] = SIZES[sizeKey];
      const query = `size=${sizeKey}&state=${state}`;
      const page = await openPage(browser, { width, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__boardingStage !== undefined');
      await page.evaluate('window.__boardingStage.ready');
      await sleep(500);
      const seen = await page.evaluate(`(() => {
        const root = document.querySelector('.ms-boarding-stage'), q = s => root.querySelector(s);
        const shown = n => !!n && !n.hidden && n.getClientRects().length > 0 && getComputedStyle(n).visibility !== 'hidden' && getComputedStyle(n).opacity !== '0';
        const film = q('.ms-bst-film'), line = q('.ms-k-wait-line'), skip = q('.ms-bst-skip'), cover = q('.ms-bst-cover');
        const f = root.getBoundingClientRect(), k = skip.getBoundingClientRect();
        const hold = getComputedStyle(q('.ms-bst-hold')).backgroundColor;
        const mid = document.elementFromPoint(f.left + f.width / 2, f.top + f.height * 0.6);
        return { violations: window.__policy, status: root.dataset.status, view: root.dataset.view, motion: root.dataset.motion, name: root.getAttribute('aria-label'),
          filmShown: shown(film), film: q('.ms-bst-picture').childElementCount, skip: shown(film) && shown(skip) ? skip.textContent.trim() : null,
          skipBottom: Math.round((f.bottom - k.bottom) * 100) / 100,
          title: shown(film) ? null : q('.ms-k-wait-title')?.textContent ?? null, line: !shown(film) && shown(line) ? line.textContent.trim() : null,
          role: line?.getAttribute('role') ?? null, spinner: !!line?.querySelector('.ms-k-spinner'), canvas: hold === 'rgb(16, 20, 28)',
          covered: shown(cover) && (cover === mid || cover.contains(mid)), banner: q('.ms-ps-banner b')?.textContent ?? null,
          layout: window.__boardingStage.mounted[0]?.layout?.() ?? null };
      })()`);
      const requests = page.requests().filter(url => /\.svg$/.test(url)).map(url => url.slice(origin.length + 1));
      // The browser asks for /favicon.ico by itself; the preview has none, as the live site has none.
      const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
      for (const v of seen.violations) v.kind = await classify(out, v);
      const file = join(REVIEW, `${sizeKey}-${state}.jpg`);
      const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width, height, scale: 1 } });
      const bytes = Buffer.from(data, 'base64');
      await writeFile(file, bytes);
      const drawn = EXPECT[state](seen);
      const ok = seen.violations.every(v => v.kind !== 'unexpected') && problems.length === 0 && drawn;
      if (!ok) failed += 1;
      results[`${sizeKey}/${state}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), ok, drawn, ...seen, requests, problems };
      await page.close();
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${state}: view ${seen.view}, "${seen.title ?? seen.skip ?? seen.name}", line "${seen.line}", unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}${drawn ? '' : ', NOT AS EXPECTED'}`);
    }
  }
  // The lifecycle probe, as the page comes and with the device's Reduce motion; then the agreement with the pack.
  for (const [mode, media, query] of [['full', null, 'probe=1'], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }, 'probe=1'], ['agree', null, 'agree=1']]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__boardingStage !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__boardingStage.agree' : 'window.__boardingStage.probe');
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
  tool: 'design/tools/boarding-stage-check.mjs',
  component: 'design/phone-ui/components/boarding-stage',
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
