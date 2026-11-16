// mothership:dev-only
//
// Windows' check (design/phone-ui/components/windows). It bundles the component's preview the way the game bundles
// the components (Vite: ordinary bundling, no copy), serves the bundle with the hosted game's production response
// headers (design/tools/lib/component-check.mjs), and captures every state of sheet 34 (the room's windows, drawing at
// a station, a drawing just shown, no window here) and the ones around them (nothing drawn yet, Show in flight, the
// keyboard's pen, reconnecting, the Largest text), in the phone shell's sheet over Room A with the Panels tab open, at
// the two development phone sizes, 390 × 844 and 430 × 932, in desktop Chromium at 2× pixels.
// A capture passes with no policy violation, no failed or refused request and no page error, with the sheet drawn as
// the state asks.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce motion
//   emulated: drawing by finger and by keyboard, the inks, Undo and Clear, the contract's limits, the footer's
//   command and local action, the views, privacy, a stroke through updates, reconnecting, focus, the layout at both
//   sizes and the Largest text, dispose, motion;
//   the agreement (preview/agree.mjs): the sheet beside the frozen pack's windows screen in each of its states, the
//   same words, states, look and boxes to within half a pixel.
// Every check must pass. It writes design/phone-ui/components/windows/review/: one JPEG per state and size, and
// check.json (the headers and their SHA-256, the source commit, what each capture drew and its SHA-256, and each
// probe and agreement check with what it saw).
//   node design/tools/windows-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone,
// not Safari, not a performance measure.

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/windows');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
/** Each state at the two development sizes (preview.mjs PREVIEW_STATES). */
const STATES = ['view', 'draw', 'shown', 'none', 'blank', 'showing', 'keyboard', 'stale', 'largest'];
const RECONNECTING = 'Controls return when the match is current';
const STATION = 'Room A ↔ Hospital|Your station · A2';
const ELI = '1 · Eli · Round 3|Unverified';

/** The preview bundled as the game bundles the component (component-check.mjs). */
const bundle = () => bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'windows-check' });

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
/** What every state shows, and what each one adds, from the sheet's own DOM. */
const common = s => s.cut.length === 0 && s.name === 'group:Windows' && s.title === 'Windows' && s.back && s.detent === 'large' && s.openTab === 'panels';
const station = (s, foot) => common(s) && s.heads === STATION && s.foot === foot && s.labels === 'Shown this round' && s.metas === ELI && s.inks === 'Gold:true|Paper:false|Teal:false|Pink:false' && s.pad === 'application:Drawing for Room A ↔ Hospital';
const EXPECT = {
  view: s => common(s) && s.heads === 'Room A ↔ Room B|Ends with the round|Room A ↔ Hospital|Ends with the round' && s.metas === '1 · Hana · Round 3|Unverified|1 · Eli · Round 3|Unverified' && s.strokes === 6 && s.foot === '' && s.labels === '' && s.root === 16,
  draw: s => station(s, 'Show') && s.strokes === 4 && s.showOn && !s.showBusy && !s.pen && s.root === 16,
  shown: s => common(s) && s.heads === STATION && s.foot === 'Done' && s.stamp === 'SHOWN' && s.metas === `2 · Dev · Round 3|Can’t be changed|${ELI}` && s.labels === 'Shown this round' && s.strokes === 5 && s.pad === null,
  none: s => common(s) && s.wait === 'No window here|The Command Room has no window' && s.foot === '' && s.heads === '',
  // Nothing drawn yet: Show off, Undo and Clear dimmed.
  blank: s => station(s, 'Show') && s.strokes === 2 && !s.showOn && s.undoOff,
  showing: s => station(s, 'Show') && s.showBusy,
  keyboard: s => station(s, 'Show') && s.pen && s.strokes === 5,
  // Reconnecting: drawing still works; Show waits with the banner's words.
  stale: s => station(s, 'Show') && s.banner && s.showWaits === RECONNECTING && !s.undoOff,
  largest: s => station(s, 'Show') && s.root === 32,
};
try {
  await mkdir(REVIEW, { recursive: true });
  for (const state of STATES) {
    for (const sizeKey of ['390x844', '430x932']) {
      const [width, height] = SIZES[sizeKey];
      const query = `size=${sizeKey}&state=${state}`;
      const page = await openPage(browser, { width, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__windows !== undefined');
      await page.evaluate('window.__windows.ready');
      await sleep(500);
      const seen = await page.evaluate(`(() => {
        const root = document.querySelector('.ms-windows'), q = s => root.querySelector(s), qa = s => [...root.querySelectorAll(s)];
        const shell = document.querySelector('.ms-phone-shell'), sheet = shell.querySelector('.ms-ps-sheet');
        const shown = n => !!n && !n.hidden && n.getClientRects().length > 0 && !n.closest('[hidden]');
        const describedBy = n => { const id = n?.getAttribute('aria-describedby'); return id ? document.getElementById(id)?.textContent ?? null : null; };
        const foot = [...sheet.querySelectorAll('.ms-ps-sheet-foot .ms-k-btn')];
        const pad = q('.ms-wn-pad'), wait = q('.ms-k-wait');
        return { violations: window.__policy, root: parseFloat(getComputedStyle(document.documentElement).fontSize),
          name: [root.getAttribute('role'), root.getAttribute('aria-label')].join(':'), detent: sheet.dataset.detent, back: !!sheet.querySelector('[data-intent="sheet-back"]'),
          title: sheet.querySelector('.ms-ps-sheet-title h2').textContent, openTab: shell.querySelector('[data-intent="tab"][aria-expanded="true"]')?.dataset.value ?? null,
          heads: qa('.ms-wn-head').filter(shown).map(h => [...h.children].map(c => c.textContent).join('|')).join('|'),
          metas: qa('.ms-wn-meta').filter(shown).map(m => [...m.children].map(c => c.textContent).join('|')).join('|'),
          labels: qa('.ms-k-group-label').filter(shown).map(n => n.textContent).join('|'),
          strokes: qa('.ms-wn-stroke').filter(shown).length, stamp: q('.ms-wn-stamp .ms-k-stamp')?.textContent ?? null,
          inks: qa('.ms-wn-swatch').map(b => [b.getAttribute('aria-label'), b.getAttribute('aria-checked')].join(':')).join('|'),
          pad: pad ? [pad.getAttribute('role'), pad.getAttribute('aria-label')].join(':') : null, pen: !!pad && getComputedStyle(pad.querySelector('.ms-wn-pen')).display !== 'none',
          undoOff: q('[data-intent="undo"]')?.hasAttribute('data-off') ?? null,
          wait: wait ? [wait.querySelector('.ms-k-wait-title').textContent, wait.querySelector('.ms-k-wait-line').textContent].join('|') : null,
          foot: foot.map(b => b.textContent.trim()).join('|'), showOn: !!foot[0] && foot[0].getAttribute('aria-disabled') !== 'true', showBusy: foot[0]?.getAttribute('aria-busy') === 'true',
          showWaits: foot[0]?.getAttribute('aria-disabled') === 'true' ? describedBy(foot[0]) : null,
          banner: shown(shell.querySelector('.ms-ps-banner')),
          cut: qa('.ms-wn-head-title, .ms-wn-head-aside, .ms-wn-meta > span, .ms-k-group-label, .ms-k-stamp, .ms-k-wait-title, .ms-k-wait-line').filter(shown).filter(n => n.scrollWidth > n.clientWidth + 0.5).map(n => n.textContent) };
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
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${state}: "${seen.title}" ${seen.foot || 'no footer'}, root ${seen.root}px, unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}${asked ? '' : `, NOT AS EXPECTED ${JSON.stringify(seen).slice(0, 900)}`}`);
    }
  }
  // The lifecycle probe, as the page comes and with the device's Reduce motion; then the agreement with the pack.
  for (const [mode, media, query] of [['full', null, 'probe=1'], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }, 'probe=1'], ['agree', null, 'agree=1']]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__windows !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__windows.agree' : 'window.__windows.probe');
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
  tool: 'design/tools/windows-check.mjs',
  component: 'design/phone-ui/components/windows',
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
