// mothership:dev-only
//
// Host controls' check (design/phone-ui/components/host-controls). It bundles the component's preview the way the game
// bundles the components (Vite: ordinary bundling, no copy), serves the bundle with the hosted game's production
// response headers (design/tools/lib/component-check.mjs), and captures every state of sheet 15 (the list, the code
// hidden and revealed, the copy's toast, the abort's confirm) and the ones around it (a command in flight and refused,
// the abort in flight, reconnecting, the Largest text), in the phone shell's sheet over Room A, at the two development
// phone sizes, 390 × 844 and 430 × 932, in desktop Chromium at 2× pixels.
// A capture passes with no policy violation, no failed or refused request and no page error, with the sheet drawn as
// the state asks, and the recovery code in the page only while revealed.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce motion
//   emulated: reports, commands in flight and refused, reconnecting, the code's privacy, the minutes, focus, the
//   frame and footer for each view, the layout at both sizes and the Largest text, dispose, motion;
//   the agreement (preview/agree.mjs): the sheet beside the frozen pack's host-controls screen, the same words,
//   states, look and boxes to within half a pixel.
// Every check must pass. It writes design/phone-ui/components/host-controls/review/: one JPEG per state and size, and
// check.json (the headers and their SHA-256, the source commit, what each capture drew and its SHA-256, and each
// probe and agreement check with what it saw).
//   node design/tools/host-controls-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone,
// not Safari, not a performance measure.

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/host-controls');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
/** Each state at the two development sizes (preview.mjs PREVIEW_STATES). */
const STATES = ['list', 'busy', 'refused', 'code', 'revealed', 'copied', 'abort', 'aborting', 'retry', 'stale', 'largest'];
/** The preview's sample code (preview.mjs SAMPLE_CODE): in the page only while revealed. */
const SAMPLE_CODE = 'q7Hc2-Lm9xT-4ZpWd-8rVnK-2bYs6-Jt';
const MASK = '•••••• •••••• •••••• •••••• ••••••';
const ROWS = 'Check the deadline|Run bots|1 · Ava|2 · Ben|3 · Cleo|4 · Dev|5 · Eli|Abort match';
const RECONNECTING = 'Controls return when the match is current';
/** The session's words for its request's unknown outcome (preview.mjs UNSURE), on every refused row while Retry shows (0.1.1). */
const UNSURE = 'Session request outcome unknown. Retry the original request.';

/** The preview bundled as the game bundles the component (component-check.mjs). */
const bundle = () => bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'host-controls-check' });

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
const common = s => s.name === 'group:Host controls' && s.cut.length === 0 && s.detent === 'large' && s.back;
const list = s => common(s) && s.title === 'Host controls' && s.sub === null && s.rows === ROWS && s.labels === 'Recovery codes' && s.foot === '' && !s.codeInPage;
const card = (s, revealed) => common(s) && s.title === 'Recovery code' && s.sub === 'Private to this phone' && s.cardLabel === 'Recovery for Player 4 · Dev' && s.matchId === 'mtch-8f2c4e'
  && s.codeText === (revealed ? SAMPLE_CODE : MASK) && s.codeInPage === revealed && s.meta === 'Works once · 15 minutes' && s.note === 'Show it only to Player 4. It never appears on the shared display.'
  && s.foot === (revealed ? 'Hide|Copy' : 'Reveal|Copy') && s.footLocal;
const confirm = s => common(s) && s.title === 'Host controls' && s.confirm === 'Abort the match?|It ends now for everyone, with no winner.' && s.foot === 'Keep playing|Abort match' && s.abortWarn && !s.codeInPage;
const EXPECT = {
  list: s => list(s) && s.busy.length === 0 && s.refused.length === 0 && s.root === 16,
  busy: s => list(s) && s.busy.join() === 'bots' && s.spinners === 1 && s.refused.length === 0,
  refused: s => list(s) && s.refused.join() === 'deadline' && s.dimmed.join() === 'deadline' && s.deadlineLine === 'The deadline has not passed yet',
  code: s => card(s, false) && s.root === 16,
  revealed: s => card(s, true),
  copied: s => card(s, false) && s.toast === 'Copied',
  abort: s => confirm(s) && !s.abortBusy,
  aborting: s => confirm(s) && s.abortBusy,
  // 0.1.1: the session's request waits to be sent again: Retry in the list's footer, the kit's primary, a command (not local).
  retry: s => common(s) && s.title === 'Host controls' && s.rows === ROWS && s.foot === 'Retry' && s.retryPrimary && s.retryIntent === 'sheet-action' && !s.codeInPage
    && s.refused.join() === 'deadline,bots,issue-recovery,issue-recovery,issue-recovery,issue-recovery,issue-recovery,abort-ask' && s.dimmed.length === 8
    && s.reasons.every(r => r === UNSURE) && s.deadlineLine === UNSURE,
  // Reconnecting: the commands wait with the banner's words, not dimmed; the confirm still opens.
  stale: s => list(s) && s.banner && s.refused.join() === 'deadline,bots,issue-recovery,issue-recovery,issue-recovery,issue-recovery,issue-recovery' && s.dimmed.length === 0 && s.reasons.every(r => r === RECONNECTING),
  largest: s => card(s, true) && s.root === 32,
};
try {
  await mkdir(REVIEW, { recursive: true });
  for (const state of STATES) {
    for (const sizeKey of ['390x844', '430x932']) {
      const [width, height] = SIZES[sizeKey];
      const query = `size=${sizeKey}&state=${state}`;
      const page = await openPage(browser, { width, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__hostControls !== undefined');
      await page.evaluate('window.__hostControls.ready');
      await sleep(500);
      const seen = await page.evaluate(`(() => {
        const root = document.querySelector('.ms-host-controls'), q = s => root.querySelector(s), qa = s => [...root.querySelectorAll(s)];
        const shell = document.querySelector('.ms-phone-shell'), sheet = shell.querySelector('.ms-ps-sheet');
        const shown = n => !!n && !n.hidden && n.getClientRects().length > 0 && !n.closest('[hidden]');
        const words = n => shown(n) ? n.innerText.replace(/\\s+/g, ' ').trim() : null;
        const describedBy = n => { const id = n?.getAttribute('aria-describedby'); return id ? document.getElementById(id)?.textContent ?? null : null; };
        const rows = qa('.ms-k-row').filter(shown), commands = qa('[data-intent]').filter(n => n.dataset.intent !== 'abort-ask');
        const foot = [...sheet.querySelectorAll('.ms-ps-sheet-foot .ms-k-btn')];
        return { violations: window.__policy, root: parseFloat(getComputedStyle(document.documentElement).fontSize),
          name: [root.getAttribute('role'), root.getAttribute('aria-label')].join(':'), detent: sheet.dataset.detent, back: !!sheet.querySelector('[data-intent="sheet-back"]'),
          title: sheet.querySelector('.ms-ps-sheet-title h2').textContent, sub: words(sheet.querySelector('.ms-ps-sheet-title p')),
          rows: rows.map(n => n.querySelector('.ms-k-row-title').textContent).join('|'), labels: qa('.ms-k-group-label').filter(shown).map(n => n.textContent).join('|'),
          busy: qa('[aria-busy="true"]').map(n => n.dataset.intent), spinners: qa('.ms-k-row-trail > .ms-k-spinner').length,
          refused: qa('[data-intent][aria-disabled="true"]').map(n => n.dataset.intent), dimmed: qa('[data-intent][data-off]').map(n => n.dataset.intent),
          reasons: qa('[data-intent][aria-disabled="true"]').map(describedBy), deadlineLine: q('[data-intent="deadline"] .ms-k-row-sub')?.textContent ?? null,
          cardLabel: q('.ms-hc-card-label')?.textContent ?? null, matchId: q('.ms-hc-match-id')?.textContent ?? null, codeText: q('.ms-hc-code')?.textContent ?? null,
          meta: words(q('.ms-hc-meta')), note: words(q('.ms-k-group-note')), confirm: q('.ms-k-wait') ? [q('.ms-k-wait-title').textContent, q('.ms-k-wait-line').textContent].join('|') : null,
          foot: foot.map(b => b.textContent.trim()).join('|'), footLocal: foot.length === 2,
          abortWarn: foot[1]?.classList.contains('ms-k-btn-warn') ?? false, abortBusy: foot[1]?.getAttribute('aria-busy') === 'true',
          retryPrimary: foot.length === 1 && foot[0].classList.contains('ms-k-btn-primary'), retryIntent: foot[0]?.dataset.intent ?? null,
          toast: words(shell.querySelector('.ms-ps-toast')), banner: shown(shell.querySelector('.ms-ps-banner')),
          codeInPage: document.documentElement.outerHTML.includes(${JSON.stringify(SAMPLE_CODE)}),
          cut: qa('.ms-k-row-title, .ms-k-row-sub, .ms-k-group-label, .ms-k-group-note, .ms-hc-card > *, .ms-k-wait-title, .ms-k-wait-line').filter(shown).filter(n => n.scrollWidth > n.clientWidth + 0.5).map(n => n.textContent) };
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
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${state}: "${seen.title}" ${seen.foot || 'no footer'}, code in page ${seen.codeInPage}, root ${seen.root}px, unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}${asked ? '' : `, NOT AS EXPECTED ${JSON.stringify(seen).slice(0, 900)}`}`);
    }
  }
  // The lifecycle probe, as the page comes and with the device's Reduce motion; then the agreement with the pack.
  for (const [mode, media, query] of [['full', null, 'probe=1'], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }, 'probe=1'], ['agree', null, 'agree=1']]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__hostControls !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__hostControls.agree' : 'window.__hostControls.probe');
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
  tool: 'design/tools/host-controls-check.mjs',
  component: 'design/phone-ui/components/host-controls',
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
