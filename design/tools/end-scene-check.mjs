// mothership:dev-only
//
// The end scene's check (design/phone-ui/components/end-scene). It bundles the component's preview the way the game
// bundles a component (Vite: ordinary bundling, no copy), serves it with the hosted game's production response headers
// (lib/component-check.mjs: the Content Security Policy of scripts/hosted-preview-policy.mjs and the six other
// headers), and:
//   captures every preview state at the two development phone sizes, 390 × 844 and 430 × 932, in full motion and with
//   the device's Reduce motion emulated, the scene in the phone shell's stage, edge to edge with no bar and no tabs
//   (sheet 44), the hero the top half, the title block at the top safe area + 34 %;
//   runs the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce motion;
//   compares the still's hero with each approved poster (apps/game/candidates/planet-library/arrival-{red,blue}.poster
//   .webp, whose SHA-256 must be the ones Integration approved) at the poster's own 1920 × 1080, in the ship's box and
//   the whole frame, with two controls that a redrawn ship would fail (preview/compare.mjs);
//   draws the pinned pack's own `end` screen (design/phone-ui/prototype/index.html?s=end, served unchanged by
//   phone-ui-render.mjs's reference server) for each case it draws, at each size, and compares the scene with it: the
//   words exactly, where the hero, the title block, the stamp, the title and the line lie (to half a pixel), and the
//   pixels of the hero (its picture and the fade), of the ship's box in it and of the title block, with controls. Red with the Alien is not on
//   the pack's screens: it is composed from their words, captured and recorded as composed;
//   draws the beats, the scene at ten moments side by side, for the arrival and for no winner, for review.
// A page passes with no policy report but the known one, no failed request and no page error, showing what its state
// asks. Every check must pass. It writes design/phone-ui/components/end-scene/review/: a JPEG per state, size and
// motion, the comparisons' pictures, and check.json (the headers and their SHA-256, the source commit, what each
// capture showed and its SHA-256, each probe check and each comparison's numbers).
//   node design/tools/end-scene-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone, not Safari, not
// a performance measure.

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';
import { startServer } from './phone-ui-render.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/end-scene');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
/** The pack's review frames' safe areas (design/phone-ui/prototype/app.mjs `safe=47,34`), as the preview gives the shell. */
const SAFE = { top: 47, bottom: 34 };
const POSTERS = { Red: 'apps/game/candidates/planet-library/arrival-red.poster.webp', Blue: 'apps/game/candidates/planet-library/arrival-blue.poster.webp' };
const APPROVAL = 'docs/integration/planet-library-art-approval-2026-11-06.json';
const PACK_FILES = ['design/phone-ui/prototype/app.mjs', 'design/phone-ui/prototype/screens-more.mjs', 'design/phone-ui/prototype/screens.css', 'design/phone-ui/prototype/kit.css', 'design/phone-ui/prototype/ui.mjs'];
const { END_SCENE_VERSION, END_WORDS, endWords } = await import(pathToFileURL(join(COMPONENT, 'end-scene.mjs')).href);
const { ARRIVAL_POSTERS } = await import(pathToFileURL(join(COMPONENT, 'arrival-art.mjs')).href);

/**
 * How far the scene may sit from the approved posters and from the pack's screen, in 0–255 levels per channel
 * (preview/compare.mjs). The posters are lossy WebP files, so the same drawing never matches them exactly; a scene 3 px
 * off or 2 % larger does not come near these (the controls in the record), and each control must stay at least twice as
 * far. Boxes agree with the pack's to half a CSS pixel.
 */
export const LIMITS = Object.freeze({ ship: 3, frame: 3, hero: 3, title: 3, box: 0.5, controlFactor: 2 });

// The preview's results and states (preview/preview.mjs, which needs a page to import).
const RESULTS = {
  Blue: { winner: 'Blue', reason: 'ARRIVAL', alienCoWinner: false },
  Red: { winner: 'Red', reason: 'ARRIVAL', alienCoWinner: false },
  alien: { winner: 'Blue', reason: 'ARRIVAL', alienCoWinner: true },
  redAlien: { winner: 'Red', reason: 'ARRIVAL', alienCoWinner: true },
  none: { winner: null, reason: 'NO_SURVIVORS', alienCoWinner: false },
  aborted: { winner: null, reason: 'ABORTED', alienCoWinner: false },
};
/** The states drawn after the pack's own end screen (?s=end&winner=…), and the one composed from its words. */
const PACK_CASES = { blue: 'Blue', red: 'Red', alien: 'alien', none: 'none', aborted: 'aborted' };
const COMPOSED = { redAlien: 'Red with the Alien: the Red arrival with the pack\'s "· ALIEN TOO" stamp and Alien line (the pack draws Blue with the Alien only)' };
const STILLS = { blue: RESULTS.Blue, red: RESULTS.Red, alien: RESULTS.alien, redAlien: RESULTS.redAlien, none: RESULTS.none, aborted: RESULTS.aborted };
const sameWords = (s, result) => {
  const w = endWords(result, 6);
  return s.words.stamp === w.stamp && s.words.tone === w.tone && s.words.title === w.title && s.words.line === w.line && s.label === w.label;
};
/** What each state must show, from the scene's own snapshot and DOM (and the shell's banner). */
const EXPECT = {
  ...Object.fromEntries(Object.entries(STILLS).map(([state, result]) => [state, s => s.frame.still && !s.frame.running && sameWords(s, result)
    && (result.reason === 'ARRIVAL' ? s.frame.kind === 'arrival' && s.frame.side === result.winner && s.frame.tau === ARRIVAL_POSTERS[result.winner].t && s.bodyShown && s.field === 'arrival'
      : s.frame.kind === 'none' && !s.bodyShown && s.field === 'none')])),
  film: s => s.frame.t === 1500 && s.frame.beat === 'film' && s.frame.tau === 1500 && !s.frame.still && s.bodyShown && sameWords(s, RESULTS.Red),
  settle: s => s.frame.t === 4000 && s.frame.beat === 'settle' && !s.frame.still && s.bodyShown,
  reduced: s => s.frame.still && s.frame.reduced && s.motion === 'reduced' && s.frame.tau === 4100,
  stale: s => s.frame.status === 'stale' && s.frame.t === 2600 && !s.frame.still && s.banner === 'Connection lost',
  concealed: s => !s.frame.shown && s.label === END_WORDS.label.concealed && !s.heroShown && s.boxes.title === null,
  noclock: s => s.frame.still && !s.frame.running && s.frame.tau === 4100 && sameWords(s, RESULTS.Red),
  noresult: s => s.frame.kind === 'empty' && s.frame.still && s.boxes.title === null && s.field === 'none' && s.label === `${END_WORDS.label.over}.`,
};
/** With the device's Reduce motion, every state that shows the scene shows the still. */
const EXPECT_REDUCED = Object.fromEntries(Object.keys(EXPECT).map(state => [state, state === 'concealed' ? EXPECT.concealed
  : s => s.frame.still && s.frame.reduced && !s.frame.running && (STILLS[state] || state === 'noresult' ? EXPECT[state](s) : true)]));

const approval = JSON.parse(await readFile(join(REPO, APPROVAL), 'utf8'));
const posters = {};
for (const [side, file] of Object.entries(POSTERS)) {
  const approved = approval.approvedFiles.find(entry => entry.consumerCandidate === file);
  const bytes = await readFile(join(REPO, file));
  posters[side] = { file, sha256: sha256(bytes), approvalRecord: APPROVAL, approvedSha256: approved?.sha256 ?? null, frame: ARRIVAL_POSTERS[side] };
  posters[side].ok = posters[side].sha256 === posters[side].approvedSha256 && posters[side].sha256 === ARRIVAL_POSTERS[side].sha256;
}
const pack = { page: 'design/phone-ui/prototype/index.html?s=end&winner=<case>&safe=47,34&chrome=0', files: {} };
for (const file of PACK_FILES) pack.files[file] = sha256(await readFile(join(REPO, file)));

// The source the record shows, read before anything is written: the components (the scene, the kit, the shell it is
// previewed in, the ship travel's drawing it uses), the pinned pack it is compared with, and the approved posters.
const { sourceCommit, sourceClean } = sourceState(REPO, ['design/phone-ui/components', 'design/phone-ui/prototype', ...Object.values(POSTERS)]);
const out = await bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'end-scene-check' });
const { server, origin } = await serve(out);
const reference = await startServer();
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const captures = {}, probes = {}, comparisons = { full: {}, agree: {} }, beats = {};
let failed = Object.values(posters).every(p => p.ok) ? 0 : 1;
const report = async (page, violations) => {
  for (const v of violations) v.kind = await classify(out, v);
  // The browser asks for /favicon.ico by itself; the preview has none, as the live site has none.
  return page.problems().filter(p => !/\/favicon\.ico$/.test(p));
};
const round2 = v => Math.round(v * 100) / 100;
const SEEN = `(() => {
  const root = document.querySelector('.ms-end-scene'), { scene, shell, standin } = window.__endScene.mounted[0];
  const phone = document.querySelector('.pv-phone').getBoundingClientRect();
  const shown = node => !!node && getComputedStyle(node).display !== 'none';
  const r2 = v => Math.round(v * 100) / 100;
  const box = node => { if (!shown(node)) return null; const b = node.getBoundingClientRect(); return { x: r2(b.left - phone.left), y: r2(b.top - phone.top), w: r2(b.width), h: r2(b.height) }; };
  const t = root.querySelector('.ms-es-title'), stamp = t.querySelector('.ms-k-stamp'), heading = t.querySelector('.ms-es-heading'), line = t.querySelector('.ms-es-line');
  const layout = shell.layout();
  return { violations: window.__policy, frame: scene.frame(), label: root.getAttribute('aria-label'), motion: root.dataset.motion ?? null,
    words: { stamp: shown(t) ? stamp.textContent : null, tone: shown(t) ? stamp.dataset.tone ?? null : null, title: shown(t) ? heading.textContent : null, line: shown(t) && shown(line) ? line.textContent : null },
    boxes: { scene: box(root), hero: box(root.querySelector('.ms-es-hero')), title: box(t), stamp: box(stamp), heading: box(heading), line: box(line) },
    heroShown: shown(root.querySelector('.ms-es-hero')), bodyShown: shown(root.querySelector('.ms-es-body')), field: root.querySelector('.ms-es-hero').dataset.field ?? null,
    banner: document.querySelector('.ms-ps-banner b')?.textContent ?? null,
    edge: layout.bars.top === 0 && layout.bars.bottom === 0 && layout.stage.height === layout.size.height && layout.stage.width === layout.size.width,
    safe: layout.safe, standin: !!standin?.isConnected };
})()`;
const PACK_READY = `(async () => {
  await document.fonts.ready;
  const hero = document.querySelector('.end-hero');
  const url = /url\\("?(.*?)"?\\)/.exec(getComputedStyle(hero).backgroundImage)?.[1];
  if (url) { const img = new Image(); img.src = url; await img.decode(); }
  await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
  return true;
})()`;
const PACK_SEEN = `(() => {
  const ph = document.querySelector('.ph').getBoundingClientRect();
  const r2 = v => Math.round(v * 100) / 100;
  const box = node => { if (!node) return null; const b = node.getBoundingClientRect(); return { x: r2(b.left - ph.left), y: r2(b.top - ph.top), w: r2(b.width), h: r2(b.height) }; };
  const t = document.querySelector('.end-title'), stamp = t.querySelector('.stamp');
  return { phone: { w: r2(ph.width), h: r2(ph.height) },
    words: { stamp: stamp?.textContent ?? null, tone: stamp?.dataset.tone ?? null, title: t.querySelector('h1')?.textContent ?? null, line: t.querySelector('p')?.textContent ?? null },
    boxes: { hero: box(document.querySelector('.end-hero')), title: box(t), stamp: box(stamp), heading: box(t.querySelector('h1')), line: box(t.querySelector('p')) } };
})()`;
const shots = {};

try {
  await rm(REVIEW, { recursive: true, force: true });
  await mkdir(REVIEW, { recursive: true });
  for (const motion of ['full', 'reduced']) {
    for (const state of Object.keys(EXPECT)) {
      for (const [sizeKey, [width, height]] of Object.entries(SIZES)) {
        const page = await openPage(browser, { width, height, scale: 2 });
        await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
        if (motion === 'reduced') await page.media({ 'prefers-reduced-motion': 'reduce' });
        await page.goto(`${origin}/index.html?single=1&size=${sizeKey}&state=${state}`, 'window.__endScene !== undefined');
        await page.evaluate('window.__endScene.ready');
        await sleep(400);
        const seen = await page.evaluate(SEEN);
        const problems = await report(page, seen.violations);
        const file = join(REVIEW, `${sizeKey}-${state}${motion === 'reduced' ? '-reduced' : ''}.jpg`);
        const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width, height, scale: 1 } });
        const bytes = Buffer.from(data, 'base64');
        await writeFile(file, bytes);
        if (motion === 'full' && PACK_CASES[state]) {
          const png = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 } });
          await writeFile(join(out, `shot-${sizeKey}-${state}.png`), Buffer.from(png.data, 'base64'));
          shots[`${sizeKey}/${state}`] = seen;
        }
        // Edge to edge, the scene covers the whole phone; the hero is its top half and the title block sits at the
        // shell's top safe area + 34 % (sheet 44); the stand-in marks the Roles list's place in the cover.
        const near = (a, b) => Math.abs(a - b) < LIMITS.box;
        const b = seen.boxes;
        const placed = seen.edge && seen.standin && near(seen.safe.top, SAFE.top) && (!seen.heroShown || (b.scene && near(b.scene.x, 0) && near(b.scene.y, 0) && near(b.scene.w, width) && near(b.scene.h, height)
          && b.hero && near(b.hero.y, 0) && near(b.hero.h, height / 2) && near(b.hero.w, width)))
          && (b.title === null || near(b.title.y, SAFE.top + 0.34 * height));
        const drawn = (motion === 'reduced' ? EXPECT_REDUCED : EXPECT)[state](seen) && placed;
        const ok = seen.violations.every(v => v.kind !== 'unexpected') && problems.length === 0 && drawn;
        if (!ok) failed += 1;
        captures[`${sizeKey}/${state}/${motion}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), ok, drawn, placed, ...seen, problems,
          ...(COMPOSED[state] ? { composed: COMPOSED[state] } : {}) };
        await page.close();
        console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${state} ${motion}: t ${seen.frame.t}, ${seen.frame.beat}${seen.frame.still ? ', still' : ''}, "${seen.words.stamp}" / "${seen.words.title}" / "${seen.words.line}", unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}${drawn ? '' : ', NOT AS EXPECTED'}`);
      }
    }
  }

  // The lifecycle probe, as the page comes and with the device's Reduce motion.
  for (const [mode, media] of [['full', null], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }]]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?probe=1`, 'window.__endScene !== undefined');
    const outcome = await page.evaluate('window.__endScene.probe');
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

  // The still's hero against each approved poster, at the poster's own size.
  for (const side of ['Red', 'Blue']) {
    const page = await openPage(browser, { width: 1920, height: 1080, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    await page.goto(`${origin}/index.html?compare=full&side=${side}`, 'window.__endScene !== undefined');
    await page.evaluate('window.__endScene.ready');
    await sleep(400);
    const { data } = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 } });
    const shot = Buffer.from(data, 'base64');
    await writeFile(join(out, `shot-full-${side}.png`), shot);
    const still = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 85, clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 } });
    await writeFile(join(REVIEW, `compare-still-${side.toLowerCase()}-1920x1080.jpg`), Buffer.from(still.data, 'base64'));
    const result = await page.evaluate(`window.__endScene.compare.then(c => c.full({ shot: "shot-full-${side}.png" }))`);
    await sleep(200);
    const diff = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 85, clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 } });
    await writeFile(join(REVIEW, `compare-diff-${side.toLowerCase()}-1920x1080.jpg`), Buffer.from(diff.data, 'base64'));
    const violations = await page.evaluate('window.__policy');
    const problems = await report(page, violations);
    const controlsFar = Object.values(result.controls).every(c => c.mean > LIMITS.ship && c.mean >= result.ship.mean * LIMITS.controlFactor);
    const ok = result.poster.width === 1920 && result.shot.width === 1920 && result.ship.mean <= LIMITS.ship && result.frame.mean <= LIMITS.frame && controlsFar
      && problems.length === 0 && violations.every(v => v.kind !== 'unexpected');
    if (!ok) failed += 1;
    comparisons.full[side] = { poster: POSTERS[side], ...result, shotSha256: sha256(shot), limits: LIMITS, controlsFar, ok, violations, problems,
      files: [`compare-still-${side.toLowerCase()}-1920x1080.jpg`, `compare-diff-${side.toLowerCase()}-1920x1080.jpg`].map(f => `design/phone-ui/components/end-scene/review/${f}`) };
    await page.close();
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${side} poster 1920 × 1080: ship box ${result.ship.mean} (far ${result.ship.far}), frame ${result.frame.mean}; controls: 3 px ${result.controls.shifted3px.mean}, 2 % ${result.controls.scaled2pct.mean}`);
  }

  // Beside the pinned pack's own end screen, at each size: the words, the boxes and the pixels.
  for (const [state, winner] of Object.entries(PACK_CASES)) {
    for (const [sizeKey, [width, height]] of Object.entries(SIZES)) {
      const packPage = await openPage(browser, { width, height, scale: 2 });
      await packPage.goto(`${reference.origin}/design/phone-ui/prototype/index.html?s=end&winner=${winner}&safe=${SAFE.top},${SAFE.bottom}&chrome=0`, 'window.__phoneReady === true');
      await packPage.evaluate(PACK_READY);
      await sleep(300);
      const theirs = await packPage.evaluate(PACK_SEEN);
      const png = await packPage.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 } });
      await writeFile(join(out, `pack-${sizeKey}-${state}.png`), Buffer.from(png.data, 'base64'));
      const packProblems = packPage.problems().filter(p => !/\/favicon\.ico$/.test(p));
      await packPage.close();
      const ours = shots[`${sizeKey}/${state}`];
      const words = ['stamp', 'tone', 'title', 'line'].every(key => theirs.words[key] === ours.words[key]);
      const boxes = Object.fromEntries(['hero', 'title', 'stamp', 'heading', 'line'].map(key => {
        const a = theirs.boxes[key], b = ours.boxes[key];
        const delta = a && b ? Math.max(...['x', 'y', 'w', 'h'].map(k => Math.abs(a[k] - b[k]))) : null;
        return [key, { pack: a, scene: b, delta: delta === null ? null : round2(delta), ok: delta !== null && delta <= LIMITS.box }];
      }));
      const page = await openPage(browser, { width: width * 2, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/index.html?compare=agree`, 'window.__endScene !== undefined');
      const result = await page.evaluate(`window.__endScene.compare.then(c => c.agree(${JSON.stringify({ pack: `pack-${sizeKey}-${state}.png`, shot: `shot-${sizeKey}-${state}.png`, scale: 2, hero: theirs.boxes.hero, title: theirs.boxes.title, width, height })}))`);
      await sleep(200);
      const pair = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: width * 2, height, scale: 1 } });
      const file = join(REVIEW, `agree-${sizeKey}-${state}.jpg`);
      const bytes = Buffer.from(pair.data, 'base64');
      await writeFile(file, bytes);
      const violations = await page.evaluate('window.__policy');
      const problems = await report(page, violations);
      await page.close();
      // An arrival's ship has the ink a 3 px shift shows; the dark field is a smooth gradient with no ship, so there only
      // the words are controlled.
      const arrival = STILLS[state].reason === 'ARRIVAL';
      const controlsFar = result.controls.title3px.mean > LIMITS.title && result.controls.title3px.mean >= result.title.mean * LIMITS.controlFactor
        && (!arrival || (result.controls.ship3px.mean > LIMITS.ship && result.controls.ship3px.mean >= result.ship.mean * LIMITS.controlFactor));
      const ok = words && Object.values(boxes).every(b => b.ok) && result.hero.mean <= LIMITS.hero && result.title.mean <= LIMITS.title && (!arrival || result.ship.mean <= LIMITS.ship) && controlsFar
        && packProblems.length === 0 && problems.length === 0 && violations.every(v => v.kind !== 'unexpected');
      if (!ok) failed += 1;
      comparisons.agree[`${sizeKey}/${state}`] = { pack: `${pack.page.replace('<case>', winner)}`, file: file.slice(REPO.length + 1), sha256: sha256(bytes), words: { pack: theirs.words, scene: ours.words, ok: words },
        boxes, pixels: result, controlsFar, ok, packProblems, violations, problems };
      console.log(`${ok ? 'ok  ' : 'FAIL'} beside the pack's end screen (${winner}) at ${sizeKey}: words ${words ? 'the same' : 'DIFFER'}, boxes ${Object.entries(boxes).map(([k, v]) => `${k} ${v.delta}`).join(', ')}; hero ${result.hero.mean}${arrival ? `, ship box ${result.ship.mean}` : ''}, title ${result.title.mean}; controls: ${arrival ? `ship 3 px ${result.controls.ship3px.mean}, ` : ''}title 3 px ${result.controls.title3px.mean}`);
    }
  }

  // The beats, for review: the scene at ten moments, side by side, at 390 × 844, for the arrival and for no winner.
  for (const kind of ['arrival', 'none']) {
    const [width, height] = SIZES['390x844'];
    const moments = kind === 'arrival' ? [0, 300, 1200, 2400, 3000, 3500, 3700, 3760, 4100, 4500] : [0, 300, 380, 460, 540, 600, 700, 800, 900, 1000];
    const page = await openPage(browser, { width: width * moments.length, height, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    await page.goto(`${origin}/index.html?strip=${kind}&size=390x844`, 'window.__endScene !== undefined');
    await page.evaluate('window.__endScene.ready');
    await sleep(400);
    const seen = await page.evaluate('window.__endScene.mounted.map(m => m.scene.frame())');
    const violations = await page.evaluate('window.__policy');
    const problems = await report(page, violations);
    const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: width * moments.length, height, scale: 0.5 } });
    const file = join(REVIEW, `beats-${kind}-390x844.jpg`);
    const bytes = Buffer.from(data, 'base64');
    await writeFile(file, bytes);
    const ok = seen.length === moments.length && seen.every((fr, i) => fr.t === moments[i] && fr.kind === kind) && problems.length === 0 && violations.every(v => v.kind !== 'unexpected');
    if (!ok) failed += 1;
    beats[kind] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), moments, beats: seen.map(fr => fr.beat), tau: seen.map(fr => fr.tau), ok, violations, problems };
    await page.close();
    console.log(`${ok ? 'ok  ' : 'FAIL'} beats strip (${kind}): ${seen.map(fr => `${fr.t} ${fr.beat}`).join(', ')}`);
  }
} finally {
  browser.close();
  chrome.close?.();
  server.close();
  await reference.close();
  if (process.argv.includes('--keep')) console.log(`kept the bundle in ${out}`); else await rm(out, { recursive: true, force: true });
}

const record = {
  tool: 'design/tools/end-scene-check.mjs',
  component: 'design/phone-ui/components/end-scene',
  version: END_SCENE_VERSION,
  sourceCommit, sourceClean,
  environment: 'Desktop Chromium (headless), each phone size at 2x pixels, the poster comparisons at 1x; the preview bundled by Vite and served with the production headers below; the pinned pack served unchanged by design/tools/phone-ui-render.mjs\'s reference server. Not a phone, not Safari, not a performance measure.',
  ...recordedHeaders(),
  posters,
  pack,
  composed: COMPOSED,
  captures,
  probe: probes,
  compare: comparisons,
  beats,
};
await writeFile(join(REVIEW, 'check.json'), `${JSON.stringify(record, null, 2)}\n`);
const passed = Object.values(captures).filter(c => c.ok).length;
const checks = Object.values(probes).flatMap(p => p.checks ?? []);
const compared = [...Object.values(comparisons.full), ...Object.values(comparisons.agree)];
console.log(`posters ${Object.values(posters).every(p => p.ok) ? 'are the approved files' : 'ARE NOT THE APPROVED FILES'}; ${passed} of ${Object.keys(captures).length} captures passed; probe ${checks.filter(c => c.ok).length} of ${checks.length} checks; comparisons ${compared.filter(c => c?.ok).length} of ${compared.length}; wrote ${REVIEW.slice(REPO.length + 1)}/check.json`);
if (failed) process.exitCode = 1;
