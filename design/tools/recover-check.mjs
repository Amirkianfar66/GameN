// mothership:dev-only
//
// Recover's check (design/phone-ui/components/recover). It bundles the component's
// preview the way the game bundles the components (Vite: ordinary bundling, no copy), serves the bundle with
// the hosted game's production response headers (design/tools/lib/component-check.mjs), and captures every
// state of sheet 14, the ones around it and the Largest text at the two development phone sizes, 390 × 844
// and 430 × 932, in desktop Chromium at 2× pixels.
// A capture passes with no policy violation, no failed or refused request and no page error, with the screen
// drawn as the state asks.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce
//   motion emulated: the form, the secret code (it stays in its box), typing, the refusal, Recover seat,
//   recovered, offline, refusals, the safe areas, the Largest text, input, dispose, motion;
//   the agreement (preview/agree.mjs): the screen beside the frozen pack's, the same words, states, look
//   and boxes to within half a pixel.
// Every check must pass. It writes design/phone-ui/components/recover/review/: one JPEG per state and
// size, and check.json (the headers and their SHA-256, the source commit, what each capture drew and its
// SHA-256, and each probe and agreement check with what it saw).
//   node design/tools/recover-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone,
// not Safari, not a performance measure.

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/recover');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
/** Each state at the two development sizes (preview.mjs PREVIEW_STATES). */
const STATES = ['entry', 'ready', 'refused', 'checking', 'recovered', 'offline', 'no-hint', 'refused-large', 'recovered-large'];
const OFFLINE = 'No connection. Recover returns when you are back online.';
const REFUSED = 'That code was not accepted. A code works once, for 15 minutes. Ask the host for a new one.';
/** The preview's synthetic code (preview.mjs SAMPLE_CODE), which must never appear in the page. */
const SAMPLE_CODE = 'x'.repeat(32);

/** The preview bundled as the game bundles the component (component-check.mjs). */
const bundle = () => bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'recover-check' });

// The source the captures show, read before anything is written: the components' files, without the review folders.
const { sourceCommit, sourceClean } = sourceState(REPO, ['design/phone-ui/components']);
const out = await bundle();
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const results = {};
const probes = {};
let agreement = null;
let failed = 0;
/** What every state shows, and what each one adds, from the screen's own DOM. */
const formDrawn = s => s.view === 'form' && s.title === 'Recover' && s.back === 'Menu' && s.heading === 'Recover your seat' && s.labels === 'Match ID|Recovery code'
  && s.idMono && s.codeType === 'password' && s.codeAttrs === 'off|off|false' && s.note === 'The host makes a code for your seat in Host controls. It is never shown on the shared display.'
  && !s.secretInPage;
const recovering = s => s.action === 'Recover seat' && !s.actionRefused && !s.actionBusy;
const EXPECT = {
  entry: s => formDrawn(s) && s.matchId === '' && s.idFocused && s.codeLength === 0 && s.codeHint === '32 characters' && s.actionRefused && s.errors.length === 0 && s.root === 16,
  ready: s => formDrawn(s) && s.matchId === 'mtch-8f2c4e' && s.codeLength === 32 && recovering(s) && s.errors.length === 0,
  refused: s => formDrawn(s) && s.codeLength === 32 && s.codeInvalid && s.errors.join('|') === REFUSED && recovering(s),
  checking: s => formDrawn(s) && s.actionBusy && s.actionLabel === 'Checking…',
  recovered: s => s.view === 'recovered' && s.title === 'Recover' && s.waitTitle === 'Seat 4 is yours again' && s.line === 'Back to the match where it is now' && s.action === 'Continue' && s.fields === 0 && s.root === 16,
  offline: s => formDrawn(s) && s.errors.join('|') === OFFLINE && s.actionRefused,
  'no-hint': s => formDrawn(s) && s.codeHint === null && s.actionRefused,
  'refused-large': s => formDrawn(s) && s.root === 32 && s.codeInvalid && s.errors.join('|') === REFUSED && (s.scrolls || s.actionInView),
  'recovered-large': s => s.view === 'recovered' && s.root === 32 && s.waitTitle === 'Seat 4 is yours again',
};
try {
  await mkdir(REVIEW, { recursive: true });
  for (const state of STATES) {
    for (const sizeKey of ['390x844', '430x932']) {
      const [width, height] = SIZES[sizeKey];
      const query = `size=${sizeKey}&state=${state}`;
      const page = await openPage(browser, { width, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__recover !== undefined');
      await page.evaluate('window.__recover.ready');
      await sleep(400);
      const seen = await page.evaluate(`(() => {
        const root = document.querySelector('.ms-recover'), q = s => root.querySelector(s), qa = s => [...root.querySelectorAll(s)];
        const words = n => n && !n.hidden && n.getClientRects().length ? n.innerText.replace(/\\s+/g, ' ').trim() : null;
        const screen = q('.ms-ep-screen'), boxes = qa('.ms-k-input-text'), id = boxes[0] ?? null, code = boxes[1] ?? null, action = q('.ms-ep-foot .ms-k-btn');
        const form = !!id;
        return { violations: window.__policy, view: form ? 'form' : 'recovered', root: parseFloat(getComputedStyle(document.documentElement).fontSize),
          canvas: getComputedStyle(root).backgroundColor, title: q('.ms-ep-nav-title')?.textContent ?? null, back: q('.ms-ep-back .ms-k-btn-label')?.textContent ?? null,
          heading: q('.ms-ep-large-title')?.textContent ?? null, labels: qa('.ms-k-field-label').map(n => n.textContent).join('|'), fields: qa('.ms-k-field').length,
          matchId: id?.value ?? null, idMono: q('.ms-k-input')?.hasAttribute('data-mono') ?? false, idFocused: !!id && document.activeElement === id,
          codeType: code?.type ?? null, codeAttrs: code ? [code.getAttribute('autocomplete'), code.getAttribute('autocapitalize'), code.getAttribute('spellcheck')].join('|') : null,
          codeLength: code ? code.value.length : null, codeHint: code?.getAttribute('placeholder') ?? null, codeInvalid: qa('.ms-k-input')[1]?.hasAttribute('data-invalid') ?? false,
          note: q('.ms-k-group-note')?.textContent ?? null, errors: qa('.ms-k-error-text').map(n => n.textContent),
          action: action?.querySelector('.ms-k-btn-label')?.textContent ?? null, actionLabel: action?.querySelector('.ms-k-btn-label')?.textContent ?? null,
          actionRefused: action?.getAttribute('aria-disabled') === 'true', actionBusy: action?.getAttribute('aria-busy') === 'true',
          waitTitle: words(q('.ms-k-wait-title')), line: words(q('.ms-k-wait-line')),
          secretInPage: root.outerHTML.includes(${JSON.stringify(SAMPLE_CODE)}),
          scrolls: screen.scrollHeight > screen.clientHeight, actionInView: action ? action.getBoundingClientRect().bottom <= root.getBoundingClientRect().bottom - 34 : null,
          layout: window.__recover.mounted[0]?.layout?.() ?? null };
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
      // The code never appears in the page: not in an attribute, not in the record.
      const ok = seen.violations.every(v => v.kind !== 'unexpected') && problems.length === 0 && asked && seen.canvas === 'rgb(16, 20, 28)' && !seen.secretInPage;
      if (!ok) failed += 1;
      results[`${sizeKey}/${state}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), ok, drawn: asked, ...seen, requests, problems };
      await page.close();
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${state}: ${seen.view} "${seen.title}", root ${seen.root}px, unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}${asked ? '' : `, NOT AS EXPECTED ${JSON.stringify(seen).slice(0, 900)}`}`);
    }
  }
  // The lifecycle probe, as the page comes and with the device's Reduce motion; then the agreement with the pack.
  for (const [mode, media, query] of [['full', null, 'probe=1'], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }, 'probe=1'], ['agree', null, 'agree=1']]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__recover !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__recover.agree' : 'window.__recover.probe');
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
  tool: 'design/tools/recover-check.mjs',
  component: 'design/phone-ui/components/recover',
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
