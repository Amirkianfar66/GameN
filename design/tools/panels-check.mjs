// mothership:dev-only
//
// Panels' check (design/phone-ui/components/panels). It bundles the component's preview the way the game bundles the
// components (Vite: ordinary bundling, no copy), serves the bundle with the hosted game's production response headers
// (design/tools/lib/component-check.mjs), and captures every state of sheet 32's Panels, Players and Round order, and
// the ones around them (the Captain's Navigation, no window, players in Jail, reconnecting, the Largest text), in the
// phone shell's sheet over Room A with the Panels tab open, at the two development phone sizes, 390 × 844 and
// 430 × 932, in desktop Chromium at 2× pixels.
// A capture passes with no policy violation, no failed or refused request and no page error, with the sheet drawn as
// the state asks.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce motion
//   emulated: reports, refusals, the Windows line, reconnecting, the players' lines, privacy, the steps, focus, the
//   frame for each view, the layout at both sizes and the Largest text, dispose, motion;
//   the agreement (preview/agree.mjs): the sheet beside the frozen pack's panels, players and rules screens, the same
//   words, states, look and boxes to within half a pixel, with Round order's note recorded as absent.
// Every check must pass. It writes design/phone-ui/components/panels/review/: one JPEG per state and size, and
// check.json (the headers and their SHA-256, the source commit, what each capture drew and its SHA-256, and each
// probe and agreement check with what it saw).
//   node design/tools/panels-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone,
// not Safari, not a performance measure.

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/panels');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
/** Each state at the two development sizes (preview.mjs PREVIEW_STATES). */
const STATES = ['list', 'captain', 'nowindow', 'players', 'jailed', 'order', 'stale', 'largest'];
const DESTINATIONS = 'Windows|Navigation|Hospital panel|Players|Round order';
const LINES = 'Room A ↔ Room B · Room A ↔ Hospital|Captain and Officer only|Patients only|Seats, rooms and public status|Phases and timings';
const PLAYERS = '1 · Ava|2 · Ben|3 · Cleo|4 · Dev (you)|5 · Eli|6 · Fay|7 · Gus|8 · Hana|9 · Ike';
const NOTE = 'Public facts only: seats, rooms, health and offices.';

/** The preview bundled as the game bundles the component (component-check.mjs). */
const bundle = () => bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'panels-check' });

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
const common = s => s.cut.length === 0 && s.buttons === s.opens && s.foot === '' && s.openTab === 'panels';
const list = s => common(s) && s.name === 'group:Panels' && s.title === 'Panels' && !s.back && s.detent === 'auto' && s.rows === DESTINATIONS && s.lists === 2;
const players = s => common(s) && s.name === 'group:Players' && s.title === 'Players' && s.back && s.detent === 'large' && s.rows === PLAYERS && s.note === NOTE && s.opens === 0;
const EXPECT = {
  list: s => list(s) && s.lines === LINES && s.refused.join() === 'navigation,hospital' && s.dimmed.join() === 'navigation,hospital' && s.root === 16,
  captain: s => list(s) && s.lines === LINES && s.refused.join() === 'hospital' && s.dimmed.join() === 'hospital',
  nowindow: s => list(s) && s.lines === LINES.replace('Room A ↔ Room B · Room A ↔ Hospital', 'No window here') && s.refused.join() === 'navigation,hospital',
  players: s => players(s) && s.lines === 'Room A|Command Room|Room B|Room A|Hospital · Injured|Room B|Room A|Room B|Room A' && s.badges === 'Captain|Officer' && s.root === 16,
  jailed: s => players(s) && s.lines === 'Room A|Command Room|Room B|In Jail|Hospital · Injured|In Jail|Room A|Room B|In Jail' && s.badges === 'Captain|Officer',
  order: s => common(s) && s.name === 'group:Round order' && s.title === 'Round order' && s.back && s.detent === 'large' && s.opens === 0 && s.note === null
    && s.rows === 'Before turns|Turns|Ship synchronized|Jail vote|Blackout|Navigation' && s.kinds === 'pre-turn|turns|sync|jail-vote|blackout|navigation',
  // Reconnecting: the rows keep taking taps (not refused by the reconnect); Navigation and the Hospital panel as Frontend says.
  stale: s => list(s) && s.banner && s.refused.join() === 'navigation,hospital' && s.dimmed.join() === 'navigation,hospital',
  largest: s => players(s) && s.badges === 'Captain|Officer' && s.root === 32,
};
try {
  await mkdir(REVIEW, { recursive: true });
  for (const state of STATES) {
    for (const sizeKey of ['390x844', '430x932']) {
      const [width, height] = SIZES[sizeKey];
      const query = `size=${sizeKey}&state=${state}`;
      const page = await openPage(browser, { width, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__panels !== undefined');
      await page.evaluate('window.__panels.ready');
      await sleep(500);
      const seen = await page.evaluate(`(() => {
        const root = document.querySelector('.ms-panels'), q = s => root.querySelector(s), qa = s => [...root.querySelectorAll(s)];
        const shell = document.querySelector('.ms-phone-shell'), sheet = shell.querySelector('.ms-ps-sheet');
        const shown = n => !!n && !n.hidden && n.getClientRects().length > 0 && !n.closest('[hidden]');
        const words = n => shown(n) ? n.innerText.replace(/\\s+/g, ' ').trim() : null;
        const rows = qa('.ms-k-row').filter(shown);
        return { violations: window.__policy, root: parseFloat(getComputedStyle(document.documentElement).fontSize),
          name: [root.getAttribute('role'), root.getAttribute('aria-label')].join(':'), detent: sheet.dataset.detent, back: !!sheet.querySelector('[data-intent="sheet-back"]'),
          title: sheet.querySelector('.ms-ps-sheet-title h2').textContent, lists: qa('.ms-k-list').filter(shown).length,
          rows: rows.map(n => n.querySelector('.ms-k-row-title').textContent).join('|'),
          lines: rows.map(n => { const sub = n.querySelector('.ms-k-row-sub'); return shown(sub) ? sub.textContent : ''; }).join('|'),
          kinds: rows.map(n => n.dataset.kind ?? '').join('|'), badges: qa('.ms-k-pill').filter(shown).map(n => n.textContent).join('|'),
          opens: qa('[data-intent="open"]').length, buttons: qa('button').length,
          refused: qa('[data-intent][aria-disabled="true"]').map(n => n.dataset.value), dimmed: qa('[data-intent][data-off]').map(n => n.dataset.value),
          note: words(q('.ms-k-group-note')), foot: [...sheet.querySelectorAll('.ms-ps-sheet-foot .ms-k-btn')].map(b => b.textContent.trim()).join('|'),
          banner: shown(shell.querySelector('.ms-ps-banner')), openTab: shell.querySelector('[data-intent="tab"][aria-expanded="true"]')?.dataset.value ?? null,
          cut: qa('.ms-k-row-title, .ms-k-row-sub, .ms-k-group-note, .ms-k-pill').filter(shown).filter(n => n.scrollWidth > n.clientWidth + 0.5).map(n => n.textContent) };
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
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${state}: "${seen.title}" ${seen.rows.split('|').length} rows, refused ${seen.refused.join(',') || 'none'}, root ${seen.root}px, unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}${asked ? '' : `, NOT AS EXPECTED ${JSON.stringify(seen).slice(0, 900)}`}`);
    }
  }
  // The lifecycle probe, as the page comes and with the device's Reduce motion; then the agreement with the pack.
  for (const [mode, media, query] of [['full', null, 'probe=1'], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }, 'probe=1'], ['agree', null, 'agree=1']]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__panels !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__panels.agree' : 'window.__panels.probe');
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
  tool: 'design/tools/panels-check.mjs',
  component: 'design/phone-ui/components/panels',
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
