// mothership:dev-only
//
// The Card sheet's check (design/phone-ui/components/card). It bundles the component's preview the way the
// game bundles the component (Vite: ordinary bundling, no copy), serves the bundle with the hosted game's
// production response headers (scripts/prepare-hosted-preview.mjs: the Content Security Policy of
// scripts/hosted-preview-policy.mjs and the six other headers), and captures every preview state at the two
// development phone sizes, 390 × 844 and 430 × 932, and three at 320 × 568 with the Largest text (200%), in
// desktop Chromium at 2× pixels. The component sits in the phone shell's sheet, with the room scene in the
// shell's stage, as in the game.
// A capture passes with no policy violation, no failed or refused request and no page error, with the view,
// the card or its back, the segmented control and the rows as the state asks, and the room's crew behind.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce motion
//   emulated: view, hide, refused, private, knowledge, resources, fit, dispose and motion;
//   the agreement (preview/agree.mjs): the component beside the pinned pack's own drawing of sheet 31's
//   frames, the same words and boxes to within half a pixel.
// It writes design/phone-ui/components/card/review/: one JPEG per state and size, and check.json (the headers
// and their SHA-256, the source commit, what each capture drew and its SHA-256, and each probe and agreement
// check with what it saw). It exits non-zero when any check fails, and says which.
//   node design/tools/card-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone, not
// Safari, not a performance measure.
// The bundling, the headers and the policy reports are every component check's (lib/component-check.mjs).

import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/card');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932], '320x568': [320, 568] };
// The moment of the voyage the captures hold, as the shell's do (2:10).
const AT = 130;

/** What each state must draw, from its fixture (preview/states.mjs). */
const EXPECT = {
  card: { view: 'card', card: 'Doctor', open: 'Card', rows: [] },
  'knowledge-hacker': { view: 'knowledge', open: 'Knowledge', rows: ['Undercover', 'Round 2 · Player 7'], label: 'Scans' },
  resources: { view: 'resources', open: 'Resources', rows: ['Weapons', 'Role Action', 'Move', 'Shared injections', 'Promises'] },
  hidden: { view: 'hidden', back: 'Hidden', open: null, rows: [] },
  'knowledge-empty': { view: 'knowledge', open: 'Knowledge', rows: [], note: 'You have no knowledge of other players.' },
  'knowledge-insider': { view: 'knowledge', open: 'Knowledge', rows: ['Unmapped trio'] },
  'card-hacker': { view: 'card', card: 'Hacker', open: 'Card', rows: [] },
  stale: { view: 'card', card: 'Doctor', open: 'Card', rows: [], banner: 'Connection lost', local: true },
  concealed: { concealed: true },
  'large-card-150': { view: 'card', card: 'Doctor', open: 'Card', rows: [] },
  'large-card': { view: 'card', card: 'Doctor', open: 'Card', rows: [] },
  'large-knowledge': { view: 'knowledge', open: 'Knowledge', rows: ['Undercover', 'Round 2 · Player 7'], label: 'Scans' },
  'large-resources': { view: 'resources', open: 'Resources', rows: ['Weapons', 'Role Action', 'Move', 'Shared injections', 'Promises'] },
};
const LARGE = new Set(Object.keys(EXPECT).filter(k => k.startsWith('large-')));
/** The private words that must never be in a concealed page. */
const PRIVATE = ['Doctor', 'Blue team', 'Two shared injections', 'Weapons', 'Undercover', 'Your role'];

/**
 * The preview bundled as the game bundles a component (lib/component-check.mjs). The preview finds the card's
 * pictures (the person and the held device) from their own place at run time (design/crew-drawing/assets/),
 * and the agreement's pack finds the rooms' pictures (design/board-v2/assets/), which no bundle carries; they
 * are copied to where they look from the bundle, as the pack's own pages serve them (the library copies the
 * crew's portraits). In the game, the art bundles' CSS properties carry them.
 */
async function bundle() {
  const out = await bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'card-check' });
  for (const folder of ['cards', 'roles']) await cp(join(REPO, `design/crew-drawing/assets/${folder}`), join(out, `crew-drawing/assets/${folder}`), { recursive: true });
  await cp(join(REPO, 'design/board-v2/assets'), join(out, 'board-v2/assets'), { recursive: true });
  return out;
}

// The source the captures show, read before anything is written: the components' files, the room pictures and
// the crew's, without the review folders checks write.
const { sourceCommit, sourceClean } = sourceState(REPO, ['design/phone-ui/components', 'design/room-drawing/assets', 'design/crew-drawing/assets']);
const out = await bundle();
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const results = {};
const probes = {};
let agreement = null;
let failed = 0;
try {
  await mkdir(REVIEW, { recursive: true });
  // A clean review folder: captures of states that no longer exist do not linger.
  for (const name of await readdir(REVIEW)) if (/\.jpg$/.test(name)) await rm(join(REVIEW, name));
  for (const state of Object.keys(EXPECT)) {
    for (const sizeKey of LARGE.has(state) ? ['320x568'] : ['390x844', '430x932']) {
      const [width, height] = SIZES[sizeKey];
      const page = await openPage(browser, { width, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/index.html?single=1&size=${sizeKey}&state=${state}&at=${AT}`, 'window.__card !== undefined');
      await page.evaluate('window.__card.ready');
      // The shell's sheet slides in (220 ms): capture it where it rests.
      await sleep(700);
      const seen = await page.evaluate(`(() => {
        const q = s => document.querySelector(s), shown = n => !!n && n.getClientRects().length > 0;
        const t = s => { const n = q(s); return shown(n) ? n.innerText.replace(/\\s+/g, ' ').trim() : null; };
        const root = q('.ms-card-sheet'), room = q('.ms-room-scene');
        const seg = root?.querySelector('.ms-card-views');
        return { violations: window.__policy, view: root?.dataset.view ?? null,
          card: t('.ms-card-sheet .ms-rc-card .ms-rc-name') ?? (shown(q('.ms-card-sheet .ms-rc-card')) ? q('.ms-card-sheet .ms-rc-card').getAttribute('aria-label') : null),
          back: t('.ms-card-sheet .ms-rc-back p'),
          open: shown(seg) ? seg.querySelector('[aria-checked="true"]')?.textContent ?? null : null,
          local: shown(seg) ? [...seg.querySelectorAll('button')].every(b => b.getAttribute('aria-disabled') !== 'true') : null,
          rows: root ? [...root.querySelectorAll('.ms-card-panel .ms-k-row-title')].map(n => n.textContent) : [],
          // The words as the page holds them (the kit draws the group label in capitals).
          label: shown(q('.ms-card-sheet .ms-card-panel .ms-k-group-label')) ? q('.ms-card-sheet .ms-card-panel .ms-k-group-label').textContent : null,
          note: shown(q('.ms-card-sheet .ms-card-panel .ms-k-group-note')) ? q('.ms-card-sheet .ms-card-panel .ms-k-group-note').textContent : null,
          banner: t('.ms-ps-banner b'), sheet: t('.ms-ps-sheet-title h2'),
          page: document.body.innerText, figures: room ? room.querySelectorAll('.ms-rs-fig svg').length : 0 };
      })()`);
      const art = page.requests().filter(url => /\.svg$/.test(url)).map(url => url.slice(origin.length + 1));
      // The browser asks for /favicon.ico by itself; the preview has none, as the live site has none.
      const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
      for (const v of seen.violations) v.kind = await classify(out, v);
      const file = join(REVIEW, `${sizeKey}-${state}.jpg`);
      const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width, height, scale: 1 } });
      const bytes = Buffer.from(data, 'base64');
      await writeFile(file, bytes);
      const want = EXPECT[state];
      const leaked = PRIVATE.filter(w => seen.page.includes(w));
      const drawn = want.concealed
        ? seen.view === null && seen.sheet === null && leaked.length === 0 && seen.figures === 0
        : seen.view === want.view && (want.card === undefined || (seen.card ?? '').toLowerCase().includes(want.card.toLowerCase()))
          && (want.back === undefined || seen.back === want.back) && seen.open === want.open && JSON.stringify(seen.rows) === JSON.stringify(want.rows)
          && (want.label === undefined || seen.label === want.label) && (want.note === undefined || seen.note === want.note)
          && (want.banner === undefined || seen.banner === want.banner) && (!want.local || seen.local === true) && seen.sheet === 'Your role' && seen.figures > 0;
      const ok = seen.violations.every(v => v.kind !== 'unexpected') && problems.length === 0 && drawn;
      if (!ok) failed += 1;
      delete seen.page;
      results[`${sizeKey}/${state}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), ok, drawn, ...seen, leaked, art, problems };
      await page.close();
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${state}: view ${seen.view ?? '—'}, open ${seen.open ?? '—'}, rows ${seen.rows.length}, crew ${seen.figures}, unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}${drawn ? '' : ', NOT AS EXPECTED'}`);
    }
  }
  // The lifecycle probe, as the page comes and with the device's Reduce motion; then the agreement with the pack.
  for (const [mode, media, query] of [['full', null, 'probe=1'], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }, 'probe=1'], ['agree', null, 'agree=1']]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__card !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__card.agree' : 'window.__card.probe');
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
    if (problems.length) console.log(`FAIL ${mode}: problems ${JSON.stringify(problems).slice(0, 1500)}`);
  }
} finally {
  browser.close();
  chrome.close?.();
  server.close();
  if (process.argv.includes('--keep')) console.log(`kept the bundle in ${out}`); else await rm(out, { recursive: true, force: true });
}
const record = {
  tool: 'design/tools/card-check.mjs',
  component: 'design/phone-ui/components/card',
  sourceCommit, sourceClean,
  environment: 'Desktop Chromium (headless), each phone size at 2x pixels; the preview bundled by Vite and served with the production headers below. Not a phone, not Safari, not a performance measure.',
  ...recordedHeaders(),
  voyageAt: AT,
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
