// mothership:dev-only
//
// The role stage's check (design/phone-ui/components/role-stage). It bundles the component's preview the
// way the game bundles the component (Vite: ordinary bundling, no copy), serves the bundle with the hosted
// game's production response headers (scripts/prepare-hosted-preview.mjs: the Content Security Policy of
// scripts/hosted-preview-policy.mjs and the six other headers), and captures every state of sheets 17 and
// 18 at the two development phone sizes, 390 × 844 and 430 × 932, and the card alone as sheet 31's Card
// sheet holds it, in desktop Chromium at 2× pixels. The film's view shows the approved role film's own
// still (Motion & Cinematics', dev-only in the preview), where the game mounts the film's player.
// A capture passes with no policy violation, no failed or refused request and no page error, with the
// stage and the card drawn as the state asks, and the card's pictures loaded where it is face up.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce
//   motion emulated: focus, refused taps, privacy, the clock, the film's element, layout, dispose, motion;
//   the agreement (preview/agree.mjs): the stage beside the frozen pack's role screen, the same words,
//   states and boxes to within half a pixel.
// Every check must pass. It writes design/phone-ui/components/role-stage/review/: one JPEG per state and
// size, and check.json (the headers and their SHA-256, the source commit, what each capture drew and its
// SHA-256, and each probe and agreement check with what it saw).
//   node design/tools/role-stage-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone,
// not Safari, not a performance measure.

import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/role-stage');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932], card: [358, 440] };
/** Each stage state at the two development sizes (preview.mjs STAGE_STATES); sheet 31's card alone (CARD_STATES). */
const STATES = { t01: 2, t12: 2, t20: 2, t26: 2, t30: 2, concealed: 2, reduced: 2, missing: 2, late: 2, waiting: 2, skipped: 2, stale: 2, large: 2, largest: 2, 'card-sheet': ['card'], 'card-sheet-down': ['card'] };

/**
 * The preview bundled as the game bundles the component (component-check.mjs). The preview and the agreement
 * find the card's pictures (and the pack's own) from their own place at run time (design/crew-drawing/assets/),
 * which no bundle carries; the cards and the held devices are copied to where they look from the bundle, beside
 * the portraits the shared bundler copies. In the game, the art bundles' CSS properties carry them.
 */
async function bundle() {
  const out = await bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'role-stage-check' });
  for (const folder of ['cards', 'roles']) {
    await cp(join(REPO, `design/crew-drawing/assets/${folder}`), join(out, `crew-drawing/assets/${folder}`), { recursive: true });
  }
  return out;
}

// The source the captures show, read before anything is written: the components' files, the crew's
// pictures and the films the preview draws, without the review folders.
const { sourceCommit, sourceClean } = sourceState(REPO, ['design/phone-ui/components', 'design/crew-drawing/assets', 'design/pregame-films']);
const out = await bundle();
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const results = {};
const probes = {};
let agreement = null;
let failed = 0;
/** What a state must show, from the stage's own DOM. */
const cardUp = s => s.name === 'Doctor' && s.team === 'Blue team' && s.facts === 2;
const EXPECT = {
  t01: s => s.view === 'card' && cardUp(s) && s.note === 'Your film starts in 0:19' && s.timer === '0:29' && s.readyOff && s.strip === '1',
  t12: s => s.view === 'card' && cardUp(s) && s.note === 'Your film starts in 0:08' && s.timer === '0:18' && s.readyOff,
  t20: s => s.view === 'film' && s.chip === '0:10' && s.film > 0 && s.skip,
  t26: s => s.view === 'film' && s.chip === '0:04' && s.film > 0 && s.skip,
  t30: s => s.view === 'after' && cardUp(s) && s.note === 'Hide your phone, then tap Ready' && !s.readyOff && s.timer === null && s.strip === null,
  concealed: s => s.view === 'card' && s.back === 'Role hidden' && s.name === null && s.timer === '0:21' && s.note === 'Your film starts in 0:11',
  reduced: s => s.view === 'film' && s.chip === '0:07' && s.film > 0 && s.motion === 'reduced',
  missing: s => s.view === 'card' && s.missing && s.name === 'Doctor' && s.note === 'Film unavailable · your card stays up until Ready',
  late: s => s.view === 'film' && s.chip === '0:05' && s.toast === 'Rejoined · the stage carried on' && s.toastOnTop && s.toastClearOfChip,
  waiting: s => s.view === 'after' && cardUp(s) && s.stamp === 'Ready' && s.note === '6 of 9 ready' && s.readyMode === 'done',
  skipped: s => s.view === 'card' && cardUp(s) && s.note === 'Film skipped on this phone · the stage keeps time',
  stale: s => s.banner === 'Connection lost' && s.status === 'stale' && cardUp(s),
  // The same moment at the Large (150 %) and Largest (200 %) text: the card ends above the note.
  large: s => s.view === 'card' && cardUp(s) && s.note === 'Your film starts in 0:08' && s.root === 24 && s.clear === true && s.cardBottom > 120,
  largest: s => s.view === 'card' && cardUp(s) && s.note === 'Your film starts in 0:08' && s.root === 32 && s.clear === true && s.cardBottom > 120,
  'card-sheet': s => cardUp(s),
  'card-sheet-down': s => s.back === 'Hidden' && s.name === null,
};
try {
  await mkdir(REVIEW, { recursive: true });
  for (const [state, where] of Object.entries(STATES)) {
    for (const sizeKey of where === 2 ? ['390x844', '430x932'] : where) {
      const [width, height] = SIZES[sizeKey];
      const query = sizeKey === 'card' ? `state=${state}` : `size=${sizeKey}&state=${state}`;
      const page = await openPage(browser, { width, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__roleStage !== undefined');
      await page.evaluate('window.__roleStage.ready');
      await sleep(500);
      const seen = await page.evaluate(`(() => {
        const root = document.querySelector('.ms-role-stage') ?? document.querySelector('.ms-own-card').parentNode, q = s => root.querySelector(s), t = s => q(s)?.textContent ?? null;
        const shown = s => { const n = q(s); return n && !n.hidden && n.getClientRects().length > 0 ? n.textContent : null; };
        const pictures = [...root.querySelectorAll('.ms-rc-person, .ms-rc-device')].map(n => getComputedStyle(n).backgroundImage);
        return { violations: window.__policy, status: root.dataset.status ?? null, view: root.dataset.view ?? null, motion: root.dataset.motion ?? null,
          name: t('.ms-rc-name'), team: t('.ms-rc-team'), facts: root.querySelectorAll('.ms-rc-facts li').length, missing: !!q('.ms-rc-missing'),
          back: t('.ms-rc-back p'), stamp: t('.ms-rc-stamp'), note: shown('.ms-rst-note'), timer: q('.ms-ps-timer')?.lastChild?.textContent ?? null,
          chip: shown('.ms-rst-chip') && q('.ms-rst-chip').lastChild.textContent, strip: q('.ms-rst-strip:not([hidden])')?.getAttribute('aria-valuenow') ?? null,
          skip: !!q('.ms-rst-film[data-shown=""] .ms-rst-skip'), film: q('.ms-rst-picture')?.childElementCount ?? 0,
          readyOff: !!q('.ms-rst-ready[data-off]'), readyMode: q('.ms-rst-ready')?.dataset.mode ?? null,
          toast: t('.ms-ps-toast > span:last-child'), banner: t('.ms-ps-banner b'), pictures,
          // A toast counts only where it is on top, not hidden under the film.
          toastOnTop: (() => { const n = q('.ms-ps-toast'); if (!n) return false; const r = n.getBoundingClientRect(); return n.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); })(),
          // Sheet 18 draws the toast under the film's clock chip, never across it.
          toastClearOfChip: (() => { const a = q('.ms-ps-toast')?.getBoundingClientRect(), b = q('.ms-rst-chip')?.getBoundingClientRect(); return !!a && !!b && (a.top >= b.bottom || a.right <= b.left); })(),
          picturesDrawn: pictures.every(p => p.startsWith('url(')), layout: window.__roleStage.mounted[0]?.layout?.() ?? null,
          root: parseFloat(getComputedStyle(document.documentElement).fontSize),
          // The note never runs into the card: where both are drawn, the note's text starts at or below the card's bottom.
          clear: (() => { const c = q('.ms-own-card'), n = q('.ms-rst-note'); if (!c || !n || n.hidden || !c.getClientRects().length || !n.getClientRects().length || root.dataset.view === 'film') return null; return n.getBoundingClientRect().top >= c.getBoundingClientRect().bottom; })(),
          // The card area's bottom, from the bottom of the space between the bars (the pack's 120 px at the Standard text).
          cardBottom: (() => { const a = q('.ms-rst-card'), b = q('.ms-rst-body'); return a && b ? Math.round((b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom) * 100) / 100 : null; })(),
          // The pack's phone canvas (#10141C) behind and beside the art: the shell's backdrop, read at its root.
          backdrop: getComputedStyle(document.querySelector('.ms-phone-shell') ?? root).backgroundColor };
      })()`);
      const requests = page.requests().filter(url => /\.svg$/.test(url)).map(url => url.slice(origin.length + 1));
      // The browser asks for /favicon.ico by itself; the preview has none, as the live site has none.
      const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
      for (const v of seen.violations) v.kind = await classify(out, v);
      const file = join(REVIEW, `${sizeKey}-${state}.jpg`);
      const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width, height, scale: 1 } });
      const bytes = Buffer.from(data, 'base64');
      await writeFile(file, bytes);
      // Every state with the card and its note keeps them apart; at the Standard text, the card area keeps the pack's 120 px.
      const drawn = EXPECT[state](seen) && seen.clear !== false && (seen.root !== 16 || seen.cardBottom === null || seen.cardBottom === 120);
      // Outside the art (left of the card, below the foot) the screen is the canvas, as sheets 17 and 18 sample it.
      const canvasPixel = sizeKey === 'card' || seen.view === 'film' || seen.status === 'concealed' ? null
        : await page.evaluate(`(() => { const r = document.querySelector('.ms-role-stage').getBoundingClientRect(); return [r.left + 6, r.bottom - 8]; })()`);
      let canvasOk = true;
      if (canvasPixel) {
        const { data: px } = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: canvasPixel[0], y: canvasPixel[1], width: 1, height: 1, scale: 1 } });
        const rgb = await page.evaluate(`new Promise(done => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 1; const g = c.getContext('2d'); g.drawImage(i, 0, 0); done([...g.getImageData(0, 0, 1, 1).data.slice(0, 3)]); }; i.src = 'data:image/png;base64,${px}'; })`).catch(() => null);
        seen.canvasPixel = rgb;
        canvasOk = !!rgb && Math.abs(rgb[0] - 16) <= 2 && Math.abs(rgb[1] - 20) <= 2 && Math.abs(rgb[2] - 28) <= 2;
      }
      // Face up with the picture, the person and the device are drawn from the bundles' properties.
      const art = seen.name === null || seen.missing || (seen.pictures.length === 2 && seen.picturesDrawn);
      const ok = seen.violations.every(v => v.kind !== 'unexpected') && problems.length === 0 && drawn && art && canvasOk
        && (sizeKey === 'card' || seen.backdrop === 'rgb(16, 20, 28)');
      if (!ok) failed += 1;
      results[`${sizeKey}/${state}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), ok, drawn, ...seen, requests, problems };
      await page.close();
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${state}: view ${seen.view}, card "${seen.name ?? seen.back}", note "${seen.note}", clock ${seen.timer ?? seen.chip}, unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}${drawn ? '' : ', NOT AS EXPECTED'}${art ? '' : ', PICTURES MISSING'}${canvasOk ? '' : `, NOT ON THE CANVAS ${JSON.stringify(seen.canvasPixel)}`}${sizeKey === 'card' || seen.backdrop === 'rgb(16, 20, 28)' ? '' : `, BACKDROP ${seen.backdrop}`}`);
    }
  }
  // The lifecycle probe, as the page comes and with the device's Reduce motion; then the agreement with the pack.
  for (const [mode, media, query] of [['full', null, 'probe=1'], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }, 'probe=1'], ['agree', null, 'agree=1']]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__roleStage !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__roleStage.agree' : 'window.__roleStage.probe');
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
  tool: 'design/tools/role-stage-check.mjs',
  component: 'design/phone-ui/components/role-stage',
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
