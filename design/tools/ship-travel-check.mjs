// mothership:dev-only
//
// The ship travel's check (design/phone-ui/components/ship-travel). It bundles the component's preview the way the
// game bundles a component (Vite: ordinary bundling, no copy), serves it with the hosted game's production response
// headers (lib/component-check.mjs: the Content Security Policy of scripts/hosted-preview-policy.mjs and the six
// other headers), and:
//   captures every preview state at the two development phone sizes, 390 × 844 and 430 × 932, in full motion and
//   with the device's Reduce motion emulated, the film in the phone shell's stage with the tabs hidden (sheet 41);
//   runs the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce motion;
//   compares the film's still with the approved poster (apps/game/candidates/planet-library/transit.poster.webp,
//   whose SHA-256 must be the one Integration approved): at the poster's own 1920 × 1080, in the ship's box and the
//   whole frame, and at each phone size beside the poster as the pack's nav screen draws it (a full-phone cover),
//   each with two controls that a redrawn ship would fail (preview/compare.mjs);
//   draws the beats, the film at ten moments of its window side by side, for review.
// A page passes with no policy report but the known one, no failed request and no page error, showing what its
// state asks. Every check must pass. It writes design/phone-ui/components/ship-travel/review/: a JPEG per state, size
// and motion, the comparisons' pictures, and check.json (the headers and their SHA-256, the source commit, what each
// capture showed and its SHA-256, each probe check and each comparison's numbers).
//   node design/tools/ship-travel-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone, not Safari,
// not a performance measure.

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/ship-travel');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
/** The moments of the beats strip (preview.mjs STRIP). */
const STRIP = Object.freeze([0, 150, 400, 700, 1200, 7500, 13800, 14300, 14800, 15000]);
const POSTER = 'apps/game/candidates/planet-library/transit.poster.webp';
const APPROVAL = 'docs/integration/planet-library-art-approval-2026-11-06.json';
const { SHIP_TRAVEL_VERSION, CAPTIONS, LABELS } = await import(pathToFileURL(join(COMPONENT, 'ship-travel.mjs')).href);
const { TRANSIT_POSTER } = await import(pathToFileURL(join(COMPONENT, 'ship-art.mjs')).href);

/**
 * How far the still may sit from the approved poster, in 0–255 levels per channel (preview/compare.mjs). The poster
 * is a lossy WebP (21 KB for 1920 × 1080), so the same drawing never matches it exactly; a ship 3 px off or 2 %
 * larger does not come near these (the controls in the record), and each control must stay at least twice as far.
 */
export const LIMITS = Object.freeze({ ship: 3, frame: 3, phone: 3, controlFactor: 2 });

/** What each state must show, from the film's own snapshot and DOM (and the shell's banner). */
const EXPECT = {
  setting: s => s.frame.t === 4000 && s.frame.beat === 'cruise' && !s.frame.still && s.label === LABELS.setting && s.pill === CAPTIONS.setting,
  enter: s => s.frame.t === 600 && s.frame.beat === 'enter' && s.pill === CAPTIONS.setting,
  settle: s => s.frame.t === 14400 && s.frame.beat === 'settle',
  moved: s => s.frame.still && s.frame.state === 'moved' && s.label === LABELS.moved && s.pill === CAPTIONS.moved,
  reduced: s => s.frame.still && s.frame.reduced && s.motion === 'reduced' && s.pill === CAPTIONS.setting,
  stale: s => s.frame.status === 'stale' && s.frame.t === 9000 && !s.frame.still && s.banner === 'Connection lost',
  concealed: s => !s.frame.shown && s.label === LABELS.concealed && !s.pillShown && s.layersShown === 0,
  noclock: s => s.frame.still && !s.frame.running && s.pill === CAPTIONS.setting,
};
/** With the device's Reduce motion, every state that shows the film shows the still. */
const EXPECT_REDUCED = {
  ...Object.fromEntries(Object.keys(EXPECT).map(state => [state, s => s.frame.still && s.frame.reduced && !s.frame.running && s.layersShown === 3])),
  concealed: EXPECT.concealed,
};

const approval = JSON.parse(await readFile(join(REPO, APPROVAL), 'utf8'));
const approvedPoster = approval.approvedFiles.find(entry => entry.consumerCandidate === POSTER);
const posterBytes = await readFile(join(REPO, POSTER));
const poster = {
  file: POSTER, sha256: sha256(posterBytes), approvalRecord: APPROVAL, approvedSha256: approvedPoster?.sha256 ?? null,
  frame: TRANSIT_POSTER,
};
poster.ok = poster.sha256 === poster.approvedSha256 && poster.sha256 === TRANSIT_POSTER.sha256;

// The source the record shows, read before anything is written: the components (the film, the kit, the shell it is
// previewed in, the icons) and the approved poster it is compared with.
const { sourceCommit, sourceClean } = sourceState(REPO, ['design/phone-ui/components', POSTER]);
const out = await bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'ship-travel-check' });
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const captures = {}, probes = {}, comparisons = { full: null, phones: {} };
let strip = null;
let failed = poster.ok ? 0 : 1;
const report = async (page, violations) => {
  for (const v of violations) v.kind = await classify(out, v);
  // The browser asks for /favicon.ico by itself; the preview has none, as the live site has none.
  return page.problems().filter(p => !/\/favicon\.ico$/.test(p));
};
const SEEN = `(() => {
  const root = document.querySelector('.ms-ship-travel'), film = window.__shipTravel.mounted[0].film;
  const pill = root.querySelector('.ms-k-pill');
  return { violations: window.__policy, frame: film.frame(), label: root.getAttribute('aria-label'), motion: root.dataset.motion ?? null,
    pill: pill?.textContent ?? null, pillShown: !!pill && getComputedStyle(root.querySelector('.ms-st-caption')).display !== 'none',
    layersShown: [...root.querySelectorAll('.ms-st-layer')].filter(n => getComputedStyle(n).display !== 'none').length,
    banner: document.querySelector('.ms-ps-banner b')?.textContent ?? null, shell: document.querySelector('.ms-ps-tb .ms-ps-name')?.textContent ?? null };
})()`;

try {
  await rm(REVIEW, { recursive: true, force: true });
  await mkdir(REVIEW, { recursive: true });
  for (const motion of ['full', 'reduced']) {
    for (const state of Object.keys(EXPECT)) {
      for (const [sizeKey, [width, height]] of Object.entries(SIZES)) {
        const page = await openPage(browser, { width, height, scale: 2 });
        await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
        if (motion === 'reduced') await page.media({ 'prefers-reduced-motion': 'reduce' });
        await page.goto(`${origin}/index.html?single=1&size=${sizeKey}&state=${state}`, 'window.__shipTravel !== undefined');
        await page.evaluate('window.__shipTravel.ready');
        await sleep(400);
        const seen = await page.evaluate(SEEN);
        const problems = await report(page, seen.violations);
        const file = join(REVIEW, `${sizeKey}-${state}${motion === 'reduced' ? '-reduced' : ''}.jpg`);
        const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width, height, scale: 1 } });
        const bytes = Buffer.from(data, 'base64');
        await writeFile(file, bytes);
        const drawn = (motion === 'reduced' ? EXPECT_REDUCED : EXPECT)[state](seen);
        const ok = seen.violations.every(v => v.kind !== 'unexpected') && problems.length === 0 && drawn;
        if (!ok) failed += 1;
        captures[`${sizeKey}/${state}/${motion}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), ok, drawn, ...seen, problems };
        await page.close();
        console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${state} ${motion}: t ${seen.frame.t}, ${seen.frame.beat}${seen.frame.still ? ', still' : ''}, "${seen.pill}", unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}${drawn ? '' : ', NOT AS EXPECTED'}`);
      }
    }
  }

  // The lifecycle probe, as the page comes and with the device's Reduce motion.
  for (const [mode, media] of [['full', null], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }]]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?probe=1`, 'window.__shipTravel !== undefined');
    const outcome = await page.evaluate('window.__shipTravel.probe');
    const violations = await page.evaluate('window.__policy');
    const problems = await report(page, violations);
    const ok = outcome.ok && outcome.mode === mode && outcome.checks.length > 0 && problems.length === 0 && violations.every(v => v.kind !== 'unexpected');
    if (!ok) failed += 1;
    // The run's own verdict last, so the page's (outcome.ok) never stands in for it.
    probes[mode] = { emulated: media ?? {}, ...outcome, ok, violations, problems };
    await page.close();
    for (const c of outcome.checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'} probe ${mode} · ${c.id}${c.ok ? '' : ` ${JSON.stringify(c.detail).slice(0, 1500)}`}`);
    if (outcome.error) console.log(`FAIL probe ${mode}: ${outcome.error}`);
  }

  // The still against the approved poster, at the poster's own size.
  {
    const page = await openPage(browser, { width: 1920, height: 1080, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    await page.goto(`${origin}/index.html?compare=full`, 'window.__shipTravel !== undefined');
    await page.evaluate('window.__shipTravel.ready');
    await sleep(400);
    const { data } = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 } });
    const shot = Buffer.from(data, 'base64');
    await writeFile(join(out, 'shot-full.png'), shot);
    const still = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 85, clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 } });
    await writeFile(join(REVIEW, 'compare-still-1920x1080.jpg'), Buffer.from(still.data, 'base64'));
    const result = await page.evaluate('window.__shipTravel.compare.then(c => c.full({ shot: "shot-full.png" }))');
    await sleep(200);
    const diff = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 85, clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 } });
    await writeFile(join(REVIEW, 'compare-diff-1920x1080.jpg'), Buffer.from(diff.data, 'base64'));
    const violations = await page.evaluate('window.__policy');
    const problems = await report(page, violations);
    const controlsFar = Object.values(result.controls).every(c => c.mean > LIMITS.ship && c.mean >= result.ship.mean * LIMITS.controlFactor);
    const ok = result.poster.width === 1920 && result.shot.width === 1920 && result.ship.mean <= LIMITS.ship && result.frame.mean <= LIMITS.frame && controlsFar
      && problems.length === 0 && violations.every(v => v.kind !== 'unexpected');
    if (!ok) failed += 1;
    comparisons.full = { ...result, shotSha256: sha256(shot), limits: LIMITS, controlsFar, ok, violations, problems,
      files: ['compare-still-1920x1080.jpg', 'compare-diff-1920x1080.jpg'].map(f => `design/phone-ui/components/ship-travel/review/${f}`) };
    await page.close();
    console.log(`${ok ? 'ok  ' : 'FAIL'} poster 1920 × 1080: ship box ${result.ship.mean} (far ${result.ship.far}), frame ${result.frame.mean}; controls: 3 px ${result.controls.shifted3px.mean}, 2 % ${result.controls.scaled2pct.mean}`);
  }

  // At each phone size: the pack's poster (a full-phone cover) beside the shell and the film's still.
  for (const [sizeKey, [width, height]] of Object.entries(SIZES)) {
    const page = await openPage(browser, { width: width * 2, height, scale: 2 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    await page.goto(`${origin}/index.html?compare=phone&size=${sizeKey}`, 'window.__shipTravel !== undefined');
    await page.evaluate('window.__shipTravel.ready');
    await sleep(400);
    const png = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: width * 2, height, scale: 1 } });
    await writeFile(join(out, `shot-${sizeKey}.png`), Buffer.from(png.data, 'base64'));
    const jpg = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: width * 2, height, scale: 1 } });
    const file = join(REVIEW, `compare-${sizeKey}.jpg`);
    const bytes = Buffer.from(jpg.data, 'base64');
    await writeFile(file, bytes);
    const result = await page.evaluate(`window.__shipTravel.compare.then(c => c.phone({ shot: "shot-${sizeKey}.png", scale: 2 }))`);
    const violations = await page.evaluate('window.__policy');
    const problems = await report(page, violations);
    const ok = result.film.mean <= LIMITS.phone && result.shipBox.mean <= LIMITS.ship
      && result.controls.shifted3px.mean > LIMITS.ship && result.controls.shifted3px.mean >= result.shipBox.mean * LIMITS.controlFactor
      && problems.length === 0 && violations.every(v => v.kind !== 'unexpected');
    if (!ok) failed += 1;
    comparisons.phones[sizeKey] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), ...result, ok, violations, problems };
    await page.close();
    console.log(`${ok ? 'ok  ' : 'FAIL'} poster beside the film at ${sizeKey}: film area ${result.film.mean} (far ${result.film.far}), ship box ${result.shipBox.mean}; control 3 px ${result.controls.shifted3px.mean}`);
  }

  // The beats, for review: the film at ten moments of its window, side by side, at 390 × 844.
  {
    const [width, height] = SIZES['390x844'];
    const page = await openPage(browser, { width: width * STRIP.length, height, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    await page.goto(`${origin}/index.html?strip=1&size=390x844`, 'window.__shipTravel !== undefined');
    await page.evaluate('window.__shipTravel.ready');
    await sleep(400);
    const seen = await page.evaluate('window.__shipTravel.mounted.map(m => m.film.frame())');
    const violations = await page.evaluate('window.__policy');
    const problems = await report(page, violations);
    const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: width * STRIP.length, height, scale: 0.5 } });
    const file = join(REVIEW, 'beats-390x844.jpg');
    const bytes = Buffer.from(data, 'base64');
    await writeFile(file, bytes);
    const ok = seen.length === STRIP.length && seen.every((fr, i) => fr.t === Math.min(STRIP[i], 15000)) && problems.length === 0 && violations.every(v => v.kind !== 'unexpected');
    if (!ok) failed += 1;
    strip = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), moments: STRIP, beats: seen.map(fr => fr.beat), ok, violations, problems };
    await page.close();
    console.log(`${ok ? 'ok  ' : 'FAIL'} beats strip: ${seen.map(fr => `${fr.t} ${fr.beat}`).join(', ')}`);
  }
} finally {
  browser.close();
  chrome.close?.();
  server.close();
  if (process.argv.includes('--keep')) console.log(`kept the bundle in ${out}`); else await rm(out, { recursive: true, force: true });
}

const record = {
  tool: 'design/tools/ship-travel-check.mjs',
  component: 'design/phone-ui/components/ship-travel',
  version: SHIP_TRAVEL_VERSION,
  sourceCommit, sourceClean,
  environment: 'Desktop Chromium (headless), each phone size at 2x pixels, the poster comparison at 1x; the preview bundled by Vite and served with the production headers below. Not a phone, not Safari, not a performance measure.',
  ...recordedHeaders(),
  poster,
  captures,
  probe: probes,
  compare: comparisons,
  beats: strip,
};
await writeFile(join(REVIEW, 'check.json'), `${JSON.stringify(record, null, 2)}\n`);
const passed = Object.values(captures).filter(c => c.ok).length;
const checks = Object.values(probes).flatMap(p => p.checks ?? []);
console.log(`poster ${poster.ok ? 'is the approved file' : 'IS NOT THE APPROVED FILE'}; ${passed} of ${Object.keys(captures).length} captures passed; probe ${checks.filter(c => c.ok).length} of ${checks.length} checks; comparisons ${[comparisons.full, ...Object.values(comparisons.phones)].filter(c => c?.ok).length} of ${1 + Object.keys(SIZES).length}; wrote ${REVIEW.slice(REPO.length + 1)}/check.json`);
if (failed) process.exitCode = 1;
