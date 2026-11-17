// mothership:dev-only
//
// Join and waiting's check (design/phone-ui/components/join-room). It bundles the components'
// preview the way the game bundles the components (Vite: ordinary bundling, no copy), serves the bundle with
// the hosted game's production response headers (design/tools/lib/component-check.mjs), and captures every
// state of sheets 12 and 13, the ones around them and the Largest text at the two development phone sizes, 390 × 844
// and 430 × 932, in desktop Chromium at 2× pixels.
// A capture passes with no policy violation, no failed or refused request and no page error, with the screen
// drawn as the state asks.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce
//   motion emulated: the form, typing, the code's ring, errors, Ask, the views, offline, refusals, the safe
//   areas, the Largest text, input, dispose, motion;
//   the agreement (preview/agree.mjs): each screen beside the frozen pack's, the same words, states, look
//   and boxes to within half a pixel; at the Largest text the device choice stacks (kit 0.5.0), recorded
//   as the one accepted difference.
// Every check must pass. It writes design/phone-ui/components/join-room/review/: one JPEG per state and
// size, and check.json (the headers and their SHA-256, the source commit, what each capture drew and its
// SHA-256, and each probe and agreement check with what it saw).
//   node design/tools/join-room-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone,
// not Safari, not a performance measure.

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/join-room');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
/** Each state at the two development sizes (preview.mjs PREVIEW_STATES). */
const STATES = ['empty', 'no-room', 'started', 'name', 'sending', 'busy', 'display', 'offline', 'pending', 'admitted', 'closed', 'declined', 'wait-offline', 'wait-noexit', 'form-large', 'wait-large'];
const FORM_OFFLINE = 'No connection. Ask to join returns when you are back online.';
const WAIT_OFFLINE = 'No connection. Check again returns when you are back online.';

/** The preview bundled as the game bundles the component (component-check.mjs). */
const bundle = () => bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'join-room-check' });

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
const formDrawn = (s, code, device = 'player') => s.screen === 'form' && s.title === 'Join' && s.back === 'Menu' && s.heading === 'Join a room' && s.codeLabel === 'Room code'
  && s.boxes === code && s.codeValue === code && s.boxesHidden && s.nameLabel === 'Your name' && s.deviceLabel === 'This device' && s.checked === device && s.options === 'Player phone|Shared display';
const asking = s => s.ask === 'Ask to join' && !s.askRefused && !s.askBusy;
const waitNav = (s, title, back) => s.screen === 'wait' && s.title === title && s.back === back;
const EXPECT = {
  empty: s => formDrawn(s, 'K7') && s.ring === 2 && s.name === '' && s.placeholder === '1–12 characters' && s.count === '0/12' && s.askRefused && s.errors.length === 0 && s.root === 16,
  'no-room': s => formDrawn(s, 'K7Q2XM') && s.codeInvalid && s.errors.join('|') === 'No room has this code. Check it with the host.' && s.name === 'Dev' && s.count === '3/12' && asking(s),
  started: s => formDrawn(s, 'K7Q2XM') && s.codeInvalid && s.errors.join('|') === 'This room has already started.' && asking(s),
  name: s => formDrawn(s, 'K7Q2XM') && !s.codeInvalid && s.name === 'Devendra Kumar' && s.count === '14/12' && s.nameInvalid && s.errors.join('|') === 'Use 1–12 characters.' && s.askRefused,
  sending: s => formDrawn(s, 'K7Q2XM') && s.askBusy && s.askLabel === 'Sending…' && s.errors.length === 0,
  busy: s => formDrawn(s, 'K7Q2XM') && s.errors.join('|') === 'Too many requests right now. Try again in a moment.' && asking(s),
  display: s => formDrawn(s, 'K7Q2XM', 'display') && asking(s),
  offline: s => formDrawn(s, 'K7Q2XM') && s.errors.join('|') === FORM_OFFLINE && s.askRefused,
  pending: s => waitNav(s, 'Join', 'Cancel') && s.waitTitle === 'Waiting for the host' && s.line === 'Room K7Q2XM · as Dev' && s.check === 'Check again' && !s.checkRefused,
  admitted: s => waitNav(s, 'Lobby', 'Leave') && s.badge === '4 You’re in · Seat 4' && s.line === 'Room K7Q2XM · waiting for the host' && s.players === 'Players · 5 of 9'
    && s.rows === '1 Ava|2 Ben|3 Cleo|4 Dev (you)|5 Eli' && s.footNote === 'Character selection starts when every seat is filled' && s.root === 16,
  closed: s => waitNav(s, 'Join', 'Menu') && s.waitTitle === 'This room started without you' && s.line === 'Room K7Q2XM' && s.backButton === 'Back to menu',
  declined: s => waitNav(s, 'Join', 'Menu') && s.waitTitle === 'The host didn’t admit you' && s.line === 'Room K7Q2XM' && s.backButton === 'Back to menu',
  'wait-offline': s => waitNav(s, 'Join', 'Cancel') && s.errors.join('|') === WAIT_OFFLINE && s.checkRefused,
  // The game's gap (#222 G6; the Lead's decision of 17 November): Leave unavailable, dimmed, with the connection's words.
  'wait-noexit': s => waitNav(s, 'Lobby', 'Leave') && s.navRefused && s.navDimmed && s.navReason === 'Not available in this test' && s.players === 'Players · 5 of 9',
  // With the Largest text the form scrolls where it doesn't fit (390 × 844) and fits where it does (430 × 932): Ask is reached either way.
  'form-large': s => formDrawn(s, 'K7Q2XM') && s.root === 32 && s.stacked && (s.scrolls || s.askInView) && s.codeInvalid,
  'wait-large': s => waitNav(s, 'Lobby', 'Leave') && s.root === 32 && s.rows === '1 Ava|2 Ben|3 Cleo|4 Dev (you)|5 Eli',
};
try {
  await mkdir(REVIEW, { recursive: true });
  for (const state of STATES) {
    for (const sizeKey of ['390x844', '430x932']) {
      const [width, height] = SIZES[sizeKey];
      const query = `size=${sizeKey}&state=${state}`;
      const page = await openPage(browser, { width, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__joinRoom !== undefined');
      await page.evaluate('window.__joinRoom.ready');
      await sleep(400);
      const seen = await page.evaluate(`(() => {
        const root = document.querySelector('.ms-join-form, .ms-join-wait'), q = s => root.querySelector(s), qa = s => [...root.querySelectorAll(s)];
        const words = n => n && !n.hidden && n.getClientRects().length ? n.innerText.replace(/\\s+/g, ' ').trim() : null;
        const form = root.classList.contains('ms-join-form'), screen = q('.ms-ep-screen');
        const code = q('.ms-jf-code-input'), name = q('.ms-k-input-text'), ask = q('.ms-jf-ask'), segs = qa('.ms-k-seg-btn'), check = q('.ms-jw-check');
        return { violations: window.__policy, screen: form ? 'form' : 'wait', root: parseFloat(getComputedStyle(document.documentElement).fontSize),
          canvas: getComputedStyle(root).backgroundColor, title: q('.ms-ep-nav-title')?.textContent ?? null, back: q('.ms-ep-back .ms-k-btn-label')?.textContent ?? null,
          heading: q('.ms-ep-large-title')?.textContent ?? null, codeLabel: q('.ms-jf-code-field .ms-k-field-label')?.textContent ?? null,
          boxes: qa('.ms-k-code-box').map(b => b.textContent).join(''), boxesHidden: q('.ms-k-code')?.getAttribute('aria-hidden') === 'true', codeValue: code?.value ?? null,
          ring: qa('.ms-k-code-box').findIndex(b => b.hasAttribute('data-focus')), codeInvalid: q('.ms-k-code')?.hasAttribute('data-invalid') ?? false,
          nameLabel: words(q('label.ms-k-field:not(.ms-jf-code-field) .ms-k-field-label')), name: name?.value ?? null, placeholder: name?.placeholder ?? null,
          count: q('.ms-k-input-count')?.textContent ?? null, nameInvalid: q('.ms-k-input')?.hasAttribute('data-invalid') ?? false,
          deviceLabel: q('.ms-k-group-label')?.textContent ?? null, options: segs.map(words).join('|'), checked: segs.find(b => b.getAttribute('aria-checked') === 'true')?.dataset.value ?? null,
          stacked: segs.length === 2 ? segs[1].getBoundingClientRect().top >= segs[0].getBoundingClientRect().bottom - 0.05 : null,
          ask: ask?.querySelector('.ms-k-btn-label')?.textContent ?? null, askLabel: ask?.querySelector('.ms-k-btn-label')?.textContent ?? null,
          askRefused: ask?.getAttribute('aria-disabled') === 'true', askBusy: ask?.getAttribute('aria-busy') === 'true',
          errors: qa('.ms-k-error-text').map(n => n.textContent),
          waitTitle: words(q('.ms-k-wait-title')), line: words(q('.ms-k-wait-line')), check: words(check), checkRefused: check?.getAttribute('aria-disabled') === 'true',
          badge: words(q('.ms-ep-seat-badge')), players: form ? null : q('.ms-k-group-label')?.textContent ?? null, rows: qa('.ms-k-row').map(words).join('|'),
          footNote: words(q('.ms-ep-foot .ms-k-group-note')), backButton: words(q('.ms-jw-back')),
          navRefused: q('.ms-ep-back')?.getAttribute('aria-disabled') === 'true', navDimmed: q('.ms-ep-back')?.hasAttribute('data-off') ?? false,
          navReason: (id => id ? document.getElementById(id)?.textContent ?? null : null)(q('.ms-ep-back')?.getAttribute('aria-describedby')),
          scrolls: screen.scrollHeight > screen.clientHeight, askInView: ask ? ask.getBoundingClientRect().bottom <= root.getBoundingClientRect().bottom - 34 : null,
          layout: window.__joinRoom.mounted[0]?.layout?.() ?? null };
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
      // The device choice stacks only at the Largest text (kit 0.5.0's stack).
      const ok = seen.violations.every(v => v.kind !== 'unexpected') && problems.length === 0 && asked && seen.canvas === 'rgb(16, 20, 28)'
        && (seen.screen === 'wait' || seen.stacked === (seen.root > 16));
      if (!ok) failed += 1;
      results[`${sizeKey}/${state}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), ok, drawn: asked, ...seen, requests, problems };
      await page.close();
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${state}: ${seen.screen} "${seen.title}", root ${seen.root}px, unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}${asked ? '' : `, NOT AS EXPECTED ${JSON.stringify(seen).slice(0, 900)}`}`);
    }
  }
  // The lifecycle probe, as the page comes and with the device's Reduce motion; then the agreement with the pack.
  for (const [mode, media, query] of [['full', null, 'probe=1'], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }, 'probe=1'], ['agree', null, 'agree=1']]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__joinRoom !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__joinRoom.agree' : 'window.__joinRoom.probe');
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
  tool: 'design/tools/join-room-check.mjs',
  component: 'design/phone-ui/components/join-room',
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
