// mothership:dev-only
//
// The boarding film's check (design/phone-ui/components/boarding-film, pregame-boarding-2.0.0). It bundles the
// component's preview the way the game bundles a component (Vite: ordinary bundling, no copy), serves it with the
// hosted game's production response headers (lib/component-check.mjs: the Content Security Policy of
// scripts/hosted-preview-policy.mjs and the six other headers), and:
//   captures every named moment of the film (preview/preview.mjs STATES: each shot and beat, the five held pictures,
//   crews of 7 and 9) at the two development phone sizes, 390 × 844 and 430 × 932, in full motion; and six of them
//   with the device's Reduce motion emulated, where each must be a held picture;
//   runs the probe (preview/probe.mjs: time, seeking, a late join, Reduce motion, suspend, resume, dispose, the
//   pictures' boxes, the memory budget, the roster), once as the page comes and once with the device's Reduce motion;
//   plays both films in real time, driven as the live player drives a film (a paint at most thirty times a second),
//   and counts the pictures each reaches a second: today's film (pregame-boarding-1.0.0, drawn by the live game's
//   own scene, apps/game/hosted/planet/pregame-scene.mjs) and this one, at the browser's own speed and with its CPU
//   slowed four times (Chromium's throttle: a rough stand-in for a phone, not a phone);
//   measures what the film's pictures hold in memory at each phone size at 2 and 3 pixels a point, all drawn at once.
// A page passes with no policy report but the known one, no failed request and no page error, showing what its state
// asks. Every check must pass. It writes design/phone-ui/components/boarding-film/review/: a JPEG per state, size and
// motion, and check.json (the headers and their SHA-256, the source commit, what each capture showed and its SHA-256,
// each probe check, the measurements).
//   node design/tools/boarding-film-check.mjs [--quick]     (--quick: no real-time measurement)
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size, drawing in software: not a
// phone, not Safari. No phone's frame rate or memory was measured.

import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/boarding-film');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
const QUICK = process.argv.includes('--quick');
const { BOARDING_FILM_VERSION, MEMORY_BUDGET, STILLS, TITLE, boardingFrame } = await import(pathToFileURL(join(COMPONENT, 'boarding-film.mjs')).href);

/** The named moments (preview/preview.mjs STATES, which needs a page to import): the time, the crew's size, the game's Reduce motion. */
const STATES = {
  dusk: { t: 1200 }, arrive: { t: 1950 }, foot: { t: 2800 }, faces: { t: 4600 }, glare: { t: 5320 }, look: { t: 5990 }, sealed: { t: 6520 }, wake: { t: 6760 },
  dark: { t: 7300 }, lit: { t: 8600 }, mark: { t: 9450 }, tide: { t: 9800 }, night: { t: 9980 },
  seven: { t: 8600, n: 7 }, nine: { t: 5990, n: 9 },
  ...Object.fromEntries(STILLS.map((still, i) => [`still${i + 1}`, { t: still.at + 200, motion: 'reduced' }])),
};
/** The moments drawn again with the device's Reduce motion: each must be a held picture. */
const DEVICE_REDUCED = ['dusk', 'foot', 'look', 'lit', 'mark', 'night'];
const LAYERS = ['canvas', 'canvas.ms-bf-light', 'div.ms-bf-shade', 'div.ms-bf-grain'];

/** What a capture must show, from the scene's own account (preview.mjs seen()). */
function expected(state, seen, [width, height], deviceReduced) {
  const spec = STATES[state], reduced = deviceReduced || spec.motion === 'reduced', frame = boardingFrame(spec.t, { variant: reduced ? 'reduced' : 'full' });
  const s = seen;
  const faults = [];
  if (s.frame.t !== frame.t || s.frame.shot !== frame.shot || s.frame.reduced !== reduced || s.frame.still !== frame.still) faults.push(`frame ${JSON.stringify(s.frame)}`);
  if (s.held.variant !== (reduced ? 'reduced' : 'full')) faults.push(`variant ${s.held.variant}`);
  if (!s.root || s.root.hidden !== 'true' || s.root.pointer !== 'none' || s.root.width !== width || s.root.height !== height) faults.push(`root ${JSON.stringify(s.root)}`);
  if (JSON.stringify(s.layers) !== JSON.stringify(LAYERS)) faults.push(`layers ${s.layers}`);
  if (s.canvas.width !== width * 2 || s.canvas.height !== height * 2) faults.push(`canvas ${s.canvas.width}x${s.canvas.height}`);
  if (s.tappable !== 0) faults.push(`tappable ${s.tappable}`);
  if (s.stats.version !== BOARDING_FILM_VERSION) faults.push(`version ${s.stats.version}`);
  const night = frame.night || frame.fade === 0;
  if (night ? s.brightness > 14 : s.brightness < 10) faults.push(`brightness ${s.brightness}`);
  if (!night && s.held.keys.length === 0) faults.push('no pictures held');
  return faults;
}

const { sourceCommit, sourceClean } = sourceState(REPO, ['design/phone-ui/components/boarding-film', 'apps/game/hosted/pregame-films', 'apps/game/hosted/crew-drawing', 'apps/game/hosted/scene-drawing', 'apps/game/hosted/planet/pregame-scene.mjs']);
const out = await bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'boarding-film-check', pages: { index: 'index.html', baseline: 'baseline.html' } });
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const captures = {}, probes = {}, measured = [], memory = [];
let failed = 0;
const report = async (page, violations) => {
  for (const v of violations) v.kind = await classify(out, v);
  // The browser asks for /favicon.ico by itself; the preview has none, as the live site has none.
  return page.problems().filter(p => !/\/favicon\.ico$/.test(p));
};
const open = async ({ width, height, scale = 2, reduced = false, path }) => {
  const page = await openPage(browser, { width, height, scale, mobile: true });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
  if (reduced) await page.media({ 'prefers-reduced-motion': 'reduce' });
  await page.goto(`${origin}/${path}`, path.startsWith('baseline') ? 'window.__baseline && window.__baseline.ready' : 'window.__boardingFilm');
  return page;
};

// Its own files only: the review videos in the same folder are the renderer's (boarding-film-render.mjs).
await mkdir(REVIEW, { recursive: true });
for (const name of await readdir(REVIEW)) if (/^\d+x\d+-[\w-]+\.jpg$/.test(name) || name === 'check.json') await rm(join(REVIEW, name), { force: true });
try {
  // ── Captures ──
  for (const [size, [width, height]] of Object.entries(SIZES)) {
    for (const deviceReduced of [false, true]) {
      for (const state of deviceReduced ? DEVICE_REDUCED : Object.keys(STATES)) {
        const spec = STATES[state], name = `${size}-${state}${deviceReduced ? '-device-reduced' : ''}`;
        const page = await open({ width, height, reduced: deviceReduced, path: `index.html?size=${size}&state=${state}&bar=0` });
        await page.evaluate('window.__boardingFilm.ready');
        const seen = await page.evaluate('window.__boardingFilm.seen()');
        const violations = await page.evaluate('window.__policy');
        const problems = await report(page, violations);
        const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width, height, scale: 1 } });
        const bytes = Buffer.from(data, 'base64'), file = join(REVIEW, `${name}.jpg`);
        await writeFile(file, bytes);
        const faults = expected(state, seen, [width, height], deviceReduced);
        const ok = faults.length === 0 && problems.length === 0 && violations.every(v => v.kind !== 'unexpected');
        if (!ok) failed += 1;
        captures[name] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), state, t: spec.t, crew: spec.n ?? 8, motion: deviceReduced ? 'device reduced' : spec.motion ?? 'full', shot: seen.frame.shot, still: seen.frame.still, pictures: seen.held.keys.length, brightness: seen.brightness, ok, faults, violations, problems };
        console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${seen.frame.shot}${seen.frame.still === null ? '' : ` (held picture ${seen.frame.still + 1})`}${faults.length ? ` — ${faults.join('; ')}` : ''}${problems.length ? ` — ${problems.join('; ')}` : ''}`);
        await page.close();
      }
    }
  }

  // ── The probe ──
  for (const deviceReduced of [false, true]) {
    const page = await open({ width: 390, height: 844, reduced: deviceReduced, path: 'index.html?size=390x844&t=0&bar=0' });
    await page.evaluate('window.__boardingFilm.ready');
    const result = await page.evaluate('window.__boardingFilm.probe()');
    const violations = await page.evaluate('window.__policy');
    const problems = await report(page, violations);
    const ok = result.checks.every(c => c.ok) && result.deviceReduced === deviceReduced && problems.length === 0 && violations.every(v => v.kind !== 'unexpected');
    if (!ok) failed += 1;
    probes[deviceReduced ? 'deviceReduced' : 'asThePageComes'] = { ...result, ok, violations, problems };
    for (const c of result.checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'} probe${deviceReduced ? ' (device Reduce motion)' : ''}: ${c.name}${c.ok ? '' : ` — ${JSON.stringify(c.detail)}`}`);
    if (problems.length) console.log(`FAIL probe page: ${problems.join('; ')}`);
    await page.close();
  }

  // ── Memory: what the pictures hold, all drawn at once ──
  for (const [size, [width, height]] of Object.entries(SIZES)) for (const scale of [2, 3]) {
    const page = await open({ width, height, scale, path: `index.html?size=${size}&t=0&bar=0` });
    await page.evaluate('window.__boardingFilm.ready');
    const result = await page.evaluate('window.__boardingFilm.memory(8)');
    const nine = await page.evaluate('window.__boardingFilm.memory(9)');
    const ok = result.failed === 0 && result.bytes <= MEMORY_BUDGET * 1.06 && nine.bytes <= MEMORY_BUDGET * 1.06;
    if (!ok) failed += 1;
    memory.push({ ...result, nine: { bytes: nine.bytes, plannedBytes: nine.plannedBytes, sharp: nine.sharp, pictures: nine.pictures }, budgetBytes: MEMORY_BUDGET, ok });
    console.log(`${ok ? 'ok  ' : 'FAIL'} memory ${size} at ${scale}x: ${(result.bytes / 1048576).toFixed(1)} MB in ${result.pictures} pictures (crew of 8; ${(nine.bytes / 1048576).toFixed(1)} MB for 9), sharpness ${result.sharp.toFixed(2)}, drawn in ${result.drawMs} ms`);
    await page.close();
  }

  // ── Both films, played in real time ──
  if (!QUICK) for (const rate of [1, 4]) {
    for (const [film, path, call] of [
      ['today', 'baseline.html?size=390x844', 'window.__baseline.measure()'],
      ['pilot, pictures drawn first', 'index.html?size=390x844&t=0&bar=0', 'window.__boardingFilm.measure({ prepare: true })'],
      ['pilot, pictures drawn as it plays', 'index.html?size=390x844&t=0&bar=0', 'window.__boardingFilm.measure({ prepare: false })'],
    ]) {
      const page = await open({ width: 390, height: 844, path });
      if (film !== 'today') await page.evaluate('window.__boardingFilm.ready');
      await page.send('Emulation.setCPUThrottlingRate', { rate });
      const { drawnAt, ...result } = await page.evaluate(call); // when each picture came: the renderer's business, not the record's
      await page.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const problems = await report(page, await page.evaluate('window.__policy'));
      if (problems.length) failed += 1;
      measured.push({ run: film, cpuSlowdown: rate, ...result, problems });
      console.log(`     ${film}, CPU ${rate}x: ${result.picturesASecond} pictures a second (frame gap median ${result.frameGapMs.median} ms, 90th ${result.frameGapMs.p90} ms)${result.quality !== undefined ? `, frame at ${result.pixels} (${result.quality} of the screen's sharpness)` : ''}`);
      await page.close();
    }
  }
} finally {
  browser.close();
  chrome.close?.();
  server.close();
  if (process.argv.includes('--keep')) console.log(`kept the bundle in ${out}`); else await rm(out, { recursive: true, force: true });
}

const rateOf = (run, rate) => measured.find(m => m.run === run && m.cpuSlowdown === rate)?.picturesASecond ?? null;
const faster = QUICK ? null : [1, 4].every(rate => rateOf('pilot, pictures drawn first', rate) > rateOf('today', rate));
if (faster === false) failed += 1;
const record = {
  tool: 'design/tools/boarding-film-check.mjs',
  component: 'design/phone-ui/components/boarding-film',
  version: BOARDING_FILM_VERSION,
  sourceCommit, sourceClean,
  environment: 'Desktop Chromium (headless, drawing in software), each phone size at 2x pixels (memory also at 3x); the preview bundled by Vite and served with the production headers below. The CPU slowdown is Chromium\'s throttle of the page\'s main thread, a rough stand-in for a slower phone. Not a phone, not Safari: no phone\'s frame rate or memory was measured.',
  ...recordedHeaders(),
  captures,
  probe: probes,
  memory,
  measured: QUICK ? 'not run (--quick)' : measured,
  pilotFasterThanToday: faster,
  mark: { hit: TITLE.hit, night: TITLE.night },
};
await writeFile(join(REVIEW, 'check.json'), `${JSON.stringify(record, null, 2)}\n`);
const passed = Object.values(captures).filter(c => c.ok).length, checks = Object.values(probes).flatMap(p => p.checks ?? []);
console.log(`${passed} of ${Object.keys(captures).length} captures passed; probe ${checks.filter(c => c.ok).length} of ${checks.length} checks; memory ${memory.filter(m => m.ok).length} of ${memory.length}; ${QUICK ? 'no measurement (--quick)' : `the pilot is ${faster ? 'faster' : 'NOT FASTER'} than today's film at both speeds`}; wrote ${REVIEW.slice(REPO.length + 1)}/check.json`);
if (failed) process.exitCode = 1;
