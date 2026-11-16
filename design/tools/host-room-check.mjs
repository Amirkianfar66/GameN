// mothership:dev-only
//
// The host setup and host lobby's check (design/phone-ui/components/host-room). It bundles the components'
// preview the way the game bundles the components (Vite: ordinary bundling, no copy), serves the bundle with
// the hosted game's production response headers (design/tools/lib/component-check.mjs), and captures every
// state of sheet 11, the ones around it and the Largest text at the two development phone sizes, 390 × 844
// and 430 × 932, in desktop Chromium at 2× pixels.
// A capture passes with no policy violation, no failed or refused request and no page error, with the screen
// drawn as the state asks.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce
//   motion emulated: setup, the lobby, the stepper, keyed rows and focus, offline, the toast, refusals, the
//   safe areas, the Largest text, input, dispose, motion;
//   the agreement (preview/agree.mjs): each screen beside the frozen pack's, the same words, states, look
//   and boxes to within half a pixel, the toast's included.
// Every check must pass. It writes design/phone-ui/components/host-room/review/: one JPEG per state and
// size, and check.json (the headers and their SHA-256, the source commit, what each capture drew and its
// SHA-256, and each probe and agreement check with what it saw).
//   node design/tools/host-room-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone,
// not Safari, not a performance measure.

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/host-room');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
/** Each state at the two development sizes (preview.mjs PREVIEW_STATES). */
const STATES = ['setup', 'setup-7', 'opening', 'setup-error', 'lobby', 'requests', 'copied', 'full', 'offline', 'setup-large', 'lobby-large'];
const OFFLINE = 'No connection. Admit, Bots and Start return when you are back online.';

/** The preview bundled as the game bundles the component (component-check.mjs). */
const bundle = () => bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'host-room-check' });

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
const setupDrawn = (s, count, mix) => s.screen === 'setup' && s.title === 'Host' && s.back === 'Menu' && s.heading === 'New room' && s.checked === String(count) && s.mix === mix
  && s.rows.join('|') === 'Players ask to join You admit each one|Bots fill empty seats Set them in the lobby';
const lobbyDrawn = s => s.screen === 'lobby' && s.title === 'Lobby' && s.back === 'Leave' && s.code === 'K7Q2XM' && s.codeName === 'Room code K 7 Q 2 X M';
const EXPECT = {
  setup: s => setupDrawn(s, 9, '5 Blue · 3 Red · 1 Alien') && s.open === 'Open room' && !s.openRefused && s.root === 16,
  'setup-7': s => setupDrawn(s, 7, '4 Blue · 2 Red · 1 Alien') && s.open === 'Open room',
  opening: s => setupDrawn(s, 9, '5 Blue · 3 Red · 1 Alien') && s.openBusy && s.open === 'Opening…',
  'setup-error': s => setupDrawn(s, 9, '5 Blue · 3 Red · 1 Alien') && s.error === 'The room did not open. Try again.',
  lobby: s => lobbyDrawn(s) && s.seats === '5 of 9 seats' && s.members === 5 && s.requests === 0 && s.startRefused && s.startNote === '4 more seats to fill' && s.toast === null && s.copy === 'Copy',
  requests: s => lobbyDrawn(s) && s.requests === 2 && s.admits === 2 && s.asking === 'Asking to join · 2',
  copied: s => lobbyDrawn(s) && s.copy === 'Copied' && s.toast === 'Copied' && s.toastTop === 109,
  full: s => lobbyDrawn(s) && s.seats === '9 of 9 seats' && s.members === 9 && !s.startRefused && s.startNote === null && s.moreRefused,
  offline: s => lobbyDrawn(s) && s.note === OFFLINE && s.startRefused && s.admitsRefused === 2,
  'setup-large': s => setupDrawn(s, 9, '5 Blue · 3 Red · 1 Alien') && s.root === 32,
  'lobby-large': s => lobbyDrawn(s) && s.root === 32 && s.scrolls,
};
try {
  await mkdir(REVIEW, { recursive: true });
  for (const state of STATES) {
    for (const sizeKey of ['390x844', '430x932']) {
      const [width, height] = SIZES[sizeKey];
      const query = `size=${sizeKey}&state=${state}`;
      const page = await openPage(browser, { width, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__hostRoom !== undefined');
      await page.evaluate('window.__hostRoom.ready');
      await sleep(400);
      const seen = await page.evaluate(`(() => {
        const root = document.querySelector('.ms-host-setup, .ms-host-lobby'), q = s => root.querySelector(s), qa = s => [...root.querySelectorAll(s)];
        const words = n => n && !n.hidden && n.getClientRects().length ? n.innerText.replace(/\\s+/g, ' ').trim() : null;
        const lobby = root.classList.contains('ms-host-lobby'), screen = q('.ms-ep-screen');
        const lists = qa('.ms-k-list'), toast = q('.ms-ep-toast');
        return { violations: window.__policy, screen: lobby ? 'lobby' : 'setup', root: parseFloat(getComputedStyle(document.documentElement).fontSize),
          canvas: getComputedStyle(root).backgroundColor, title: q('.ms-ep-nav-title')?.textContent ?? null, back: q('.ms-ep-back .ms-k-btn-label')?.textContent ?? null,
          heading: q('.ms-ep-large-title')?.textContent ?? null, checked: q('.ms-k-seg-btn[aria-checked="true"]')?.textContent ?? null,
          mix: words(q('.ms-k-seg + .ms-k-group-note')), rows: lobby ? [] : qa('.ms-k-row').map(words),
          open: q('.ms-hs-open .ms-k-btn-label')?.textContent ?? null, openRefused: q('.ms-hs-open')?.getAttribute('aria-disabled') === 'true', openBusy: q('.ms-hs-open')?.getAttribute('aria-busy') === 'true',
          error: q('.ms-ep-foot > .ms-k-error .ms-k-error-text')?.textContent ?? null,
          code: q('.ms-ep-code')?.textContent ?? null, codeName: q('.ms-ep-code')?.getAttribute('aria-label') ?? null, copy: q('.ms-ep-copy .ms-k-btn-label')?.textContent ?? null,
          seats: q('.ms-ep-code-seats')?.textContent ?? null, asking: lists.length === 3 && !lists[0].hidden ? q('.ms-k-group-label')?.textContent : null,
          requests: lobby ? lists[0].children.length : 0, admits: qa('[data-intent="admit"]').length, admitsRefused: qa('[data-intent="admit"][aria-disabled="true"]').length,
          members: lobby ? lists[1].children.length : 0, startRefused: q('.ms-hl-start')?.getAttribute('aria-disabled') === 'true', startNote: words(q('.ms-ep-foot .ms-k-group-note')),
          moreRefused: q('.ms-k-stepper-btn:last-of-type')?.getAttribute('aria-disabled') === 'true', note: q('.ms-hl-note .ms-k-error-text')?.textContent ?? null,
          toast: toast?.textContent ?? null, toastTop: toast ? toast.getBoundingClientRect().top - root.getBoundingClientRect().top : null,
          scrolls: screen.scrollHeight > screen.clientHeight, layout: window.__hostRoom.mounted[0]?.layout?.() ?? null };
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
      const ok = seen.violations.every(v => v.kind !== 'unexpected') && problems.length === 0 && asked && seen.canvas === 'rgb(16, 20, 28)';
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
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__hostRoom !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__hostRoom.agree' : 'window.__hostRoom.probe');
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
  tool: 'design/tools/host-room-check.mjs',
  component: 'design/phone-ui/components/host-room',
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
