// mothership:dev-only
//
// Display settings' check (design/phone-ui/components/display-settings). It bundles the component's preview the
// way the game bundles the components (Vite: ordinary bundling, no copy), serves the bundle with the hosted game's
// production response headers (design/tools/lib/component-check.mjs), and captures every state of the Display
// page and of Settings in a match (sheet 32), with the lock, reconnecting and the Larger texts, at the two
// development phone sizes, 390 × 844 and 430 × 932, in desktop Chromium at 2× pixels.
// A capture passes with no policy violation, no failed or refused request and no page error, with the component
// drawn as the state asks.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce motion
//   emulated: reports, the lock, refusals, reconnecting, the Host group, focus, the names, the layout at both
//   sizes and the Larger texts, dispose, motion;
//   the agreement (preview/agree.mjs): both mounts beside the frozen pack's settings screen, the same words,
//   states, look and boxes to within half a pixel.
// Every check must pass. It writes design/phone-ui/components/display-settings/review/: one JPEG per state and
// size, and check.json (the headers and their SHA-256, the source commit, what each capture drew and its SHA-256,
// and each probe and agreement check with what it saw).
//   node design/tools/display-settings-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone,
// not Safari, not a performance measure.

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/display-settings');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
/** Each state at the two development sizes (preview.mjs PREVIEW_STATES). */
const STATES = ['page', 'page-on', 'page-locked', 'page-large', 'page-largest', 'sheet', 'sheet-host', 'sheet-locked', 'sheet-stale', 'sheet-largest'];
const LINE = 'Films become stills; no shake or travel';
const LOCKED = 'On, because this phone asks for less motion';
const NOTE = 'These stay on this phone. They never change the match.';

/** The preview bundled as the game bundles the component (component-check.mjs). */
const bundle = () => bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'display-settings-check' });

// The source the captures show, read before anything is written: the components' files and the room pictures, without the review folders.
const { sourceCommit, sourceClean } = sourceState(REPO, ['design/phone-ui/components', 'design/room-drawing/assets']);
const out = await bundle();
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const results = {};
const probes = {};
let agreement = null;
let failed = 0;
/** What every state shows, and what each one adds, from the component's own DOM. */
const options = s => s.motion === 'Reduce motion' && s.note === NOTE && s.sizes === 'Standard|Large|Largest' && s.seg === 'radiogroup:Text size' && s.toggleName === 'switch:Reduce motion' && s.cut.length === 0;
const page = s => options(s) && s.view === 'page' && s.title === 'Display' && s.back === 'Menu' && s.canvas === 'rgb(16, 20, 28)' && s.labels === 'Text size';
const sheet = (s, host) => options(s) && s.view === 'sheet' && s.sheetTitle === 'Settings' && s.labels === (host ? 'Display|Text size|Host' : 'Display|Text size')
  && (host ? s.host === 'Host controls Bots, deadlines, recovery, abort' : s.host === null);
const usual = s => s.checked === 'false' && !s.locked && s.line === LINE && s.refused === 0;
const EXPECT = {
  page: s => page(s) && usual(s) && s.chosen === '1' && !s.stacked && s.root === 16,
  'page-on': s => page(s) && s.checked === 'true' && !s.locked && s.line === LINE && s.chosen === '1',
  'page-locked': s => page(s) && s.checked === 'true' && s.locked && s.dimmed && s.line === LOCKED && s.why === LOCKED,
  'page-large': s => page(s) && usual(s) && s.root === 24 && s.chosen === '1.5' && !s.stacked,
  'page-largest': s => page(s) && usual(s) && s.root === 32 && s.chosen === '2' && s.stacked,
  sheet: s => sheet(s, false) && usual(s) && s.chosen === '1' && !s.banner,
  'sheet-host': s => sheet(s, true) && usual(s) && !s.banner,
  'sheet-locked': s => sheet(s, true) && s.checked === 'true' && s.locked && s.dimmed && s.line === LOCKED && s.why === LOCKED,
  // Reconnecting: the shell's banner, and nothing of this phone's refused.
  'sheet-stale': s => sheet(s, true) && usual(s) && s.banner,
  'sheet-largest': s => sheet(s, true) && usual(s) && s.root === 32 && s.chosen === '2' && s.stacked,
};
try {
  await mkdir(REVIEW, { recursive: true });
  for (const state of STATES) {
    for (const sizeKey of ['390x844', '430x932']) {
      const [width, height] = SIZES[sizeKey];
      const query = `size=${sizeKey}&state=${state}`;
      const page = await openPage(browser, { width, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__displaySettings !== undefined');
      await page.evaluate('window.__displaySettings.ready');
      await sleep(500);
      const seen = await page.evaluate(`(() => {
        const root = document.querySelector('.ms-display-settings, .ms-settings-sheet'), q = s => root.querySelector(s), qa = s => [...root.querySelectorAll(s)];
        const shown = n => !!n && !n.hidden && n.getClientRects().length > 0;
        const words = n => shown(n) ? n.innerText.replace(/\\s+/g, ' ').trim() : null;
        const toggle = q('.ms-k-switch'), seg = q('.ms-k-seg'), hostRow = q('[data-intent="host-controls"]'), shell = document.querySelector('.ms-phone-shell');
        const describedBy = n => { const id = n?.getAttribute('aria-describedby'); return id ? document.getElementById(id)?.textContent ?? null : null; };
        const controls = [toggle, ...seg.children, hostRow, q('.ms-ep-back')].filter(Boolean);
        return { violations: window.__policy, root: parseFloat(getComputedStyle(document.documentElement).fontSize),
          view: root.classList.contains('ms-display-settings') ? 'page' : 'sheet',
          canvas: root.classList.contains('ms-display-settings') ? getComputedStyle(root).backgroundColor : null,
          title: q('.ms-ep-nav-title')?.textContent ?? null, back: q('.ms-ep-back .ms-k-btn-label')?.textContent ?? null,
          sheetTitle: shell?.querySelector('.ms-ps-sheet-title h2')?.textContent ?? null, banner: shown(shell?.querySelector('.ms-ps-banner')),
          labels: qa('.ms-k-group-label').map(n => n.textContent).join('|'), motion: q('.ms-ds-motion .ms-k-row-title')?.textContent ?? null,
          line: q('.ms-ds-motion .ms-k-row-sub')?.textContent ?? null, note: q('.ms-k-group-note')?.textContent ?? null,
          toggleName: [toggle.getAttribute('role'), toggle.getAttribute('aria-label')].join(':'), checked: toggle.getAttribute('aria-checked'),
          locked: toggle.getAttribute('aria-disabled') === 'true', dimmed: toggle.hasAttribute('data-off'), why: describedBy(toggle),
          seg: [seg.getAttribute('role'), seg.getAttribute('aria-label')].join(':'), sizes: [...seg.children].map(b => b.textContent).join('|'),
          chosen: [...seg.children].find(b => b.getAttribute('aria-checked') === 'true')?.dataset.value ?? null,
          stacked: seg.children[1].getBoundingClientRect().top > seg.children[0].getBoundingClientRect().bottom - 0.5,
          host: words(hostRow), refused: controls.filter(n => n.getAttribute('aria-disabled') === 'true').length - (toggle.getAttribute('aria-disabled') === 'true' ? 1 : 0),
          cut: qa('.ms-k-row-title, .ms-k-row-sub, .ms-k-seg-label, .ms-k-group-label, .ms-k-group-note, .ms-ep-nav-title').filter(n => n.scrollWidth > n.clientWidth + 0.5).map(n => n.textContent),
          layout: window.__displaySettings.mounted[0]?.settings?.layout?.() ?? null };
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
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${state}: ${seen.view} switch ${seen.checked}${seen.locked ? ' locked' : ''}, size ${seen.chosen}${seen.stacked ? ' stacked' : ''}, root ${seen.root}px, unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}${asked ? '' : `, NOT AS EXPECTED ${JSON.stringify(seen).slice(0, 900)}`}`);
    }
  }
  // The lifecycle probe, as the page comes and with the device's Reduce motion; then the agreement with the pack.
  for (const [mode, media, query] of [['full', null, 'probe=1'], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }, 'probe=1'], ['agree', null, 'agree=1']]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__displaySettings !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__displaySettings.agree' : 'window.__displaySettings.probe');
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
  tool: 'design/tools/display-settings-check.mjs',
  component: 'design/phone-ui/components/display-settings',
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
