// mothership:dev-only
//
// Office decisions' check (design/phone-ui/components/office-decisions). It bundles the component's preview the way the
// game bundles the components (Vite: ordinary bundling, no copy), serves the bundle with the hosted game's production
// response headers (design/tools/lib/component-check.mjs), and captures every state of sheets 40 and 41 that is the
// offices' (the Captain choosing an Officer, everyone else waiting, the Officer choosing a block, the block made, and
// Navigation's route, tie and acknowledgement) and the ones around them (Appoint in flight, reconnecting, the Largest
// text), in the phone shell's sheet over the room the pack draws, at the two development phone sizes, 390 × 844 and
// 430 × 932, in desktop Chromium at 2× pixels.
// A capture passes with no policy violation, no failed or refused request and no page error, with the sheet drawn as
// the state asks.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce motion
//   emulated: the choices and their notes, the footer's commands and Skip, the words, the tie, the route map, the
//   offices' privacy, reconnecting, focus, the layout at both sizes and the Largest text, dispose, motion;
//   the agreement (preview/agree.mjs): the sheet beside the frozen pack's captain, officer and nav screens in each of
//   their states, the same words, states, look and boxes to within half a pixel, the route map shape by shape.
// Every check must pass. It writes design/phone-ui/components/office-decisions/review/: one JPEG per state and size,
// and check.json (the headers and their SHA-256, the source commit, what each capture drew and its SHA-256, and each
// probe and agreement check with what it saw).
//   node design/tools/office-decisions-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone,
// not Safari, not a performance measure.

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/office-decisions');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
/** Each state at the two development sizes (preview.mjs PREVIEW_STATES). */
const STATES = ['appoint', 'appointing', 'sending', 'block', 'blocked', 'route', 'tie', 'confirm', 'stale', 'largest'];
const RECONNECTING = 'Controls return when the match is current';
const APPOINT_NOTES = 'In Hospital|Selected|You are Captain|Injured|In Jail|Out';

/** The preview bundled as the game bundles the component (component-check.mjs). */
const bundle = () => bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'office-decisions-check' });

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
const common = (s, title, line = null) => s.cut.length === 0 && s.name === `group:${title}` && s.title === title && (s.line || null) === line && !s.back && !s.close && s.detent === 'large' && s.openTab === null;
const appoint = s => common(s, 'Choose your Officer') && s.cells === 9 && s.selected === '3' && s.choosable === '1,3,7,8' && s.notes === APPOINT_NOTES && s.you === '4';
const nav = s => common(s, 'Navigation', 'Only the Captain and Officer see this') && s.map === 'img:Route: the ship is at B1 on the Blue arm';
const EXPECT = {
  appoint: s => appoint(s) && s.foot === 'Appoint Cleo' && !s.footBusy && s.list === false && s.root === 16,
  appointing: s => common(s, 'Officer appointment') && s.wait === 'Ben is choosing an Officer|Chosen at random if time runs out' && s.portrait === 44 && s.foot === '',
  sending: s => appoint(s) && s.foot === 'Appoint Cleo' && s.footBusy,
  block: s => common(s, 'Block movement', 'Optional · once a round') && s.cells === 9 && s.selected === '7' && s.choosable === '1,2,3,4,5,6,7' && s.notes === 'Selected|Blocked last round|Out' && s.foot === 'Skip|Block Gus',
  blocked: s => common(s, 'Block movement', 'Optional · once a round') && s.notice === 'BLOCKED|Gus can’t move this round|Everyone sees the block' && s.foot === '',
  route: s => nav(s) && s.rows === 'Position::B1|Next move::Being set' && s.foot === '' && s.dashed === 0 && !s.tieLine,
  tie: s => nav(s) && s.note === 'A genuine tie. Choose the direction; no choice means a random draw.' && s.directions === 'Blue|Red' && s.tieLine && s.foot === '' && s.directionsWait === null,
  confirm: s => nav(s) && s.rows === 'Next move::Blue · to B2|Acknowledge:You can’t change or veto it:' && s.foot === 'Acknowledge' && s.dashed === 1,
  // Reconnecting: Blue and Red wait with the banner's words.
  stale: s => nav(s) && s.banner && s.directions === 'Blue|Red' && s.directionsWait === RECONNECTING,
  largest: s => appoint(s) && s.foot === 'Appoint Cleo' && s.list === true && s.root === 32,
};
try {
  await mkdir(REVIEW, { recursive: true });
  for (const state of STATES) {
    for (const sizeKey of ['390x844', '430x932']) {
      const [width, height] = SIZES[sizeKey];
      const query = `size=${sizeKey}&state=${state}`;
      const page = await openPage(browser, { width, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__offices !== undefined');
      await page.evaluate('window.__offices.ready');
      await sleep(500);
      const seen = await page.evaluate(`(() => {
        const root = document.querySelector('.ms-office-decisions'), q = s => root.querySelector(s), qa = s => [...root.querySelectorAll(s)];
        const shell = document.querySelector('.ms-phone-shell'), sheet = shell.querySelector('.ms-ps-sheet');
        const shown = n => !!n && !n.hidden && n.getClientRects().length > 0 && !n.closest('[hidden]');
        const describedBy = n => { const id = n?.getAttribute('aria-describedby'); return id ? document.getElementById(id)?.textContent ?? null : null; };
        const foot = [...sheet.querySelectorAll('.ms-ps-sheet-foot .ms-k-btn')];
        const cells = qa('.ms-k-cell'), map = q('.ms-od-route'), wait = q('.ms-k-wait'), dirs = qa('[data-intent="direction"]');
        return { violations: window.__policy, root: parseFloat(getComputedStyle(document.documentElement).fontSize),
          name: [root.getAttribute('role'), root.getAttribute('aria-label')].join(':'), detent: sheet.dataset.detent,
          back: !!sheet.querySelector('[data-intent="sheet-back"]'), close: !!sheet.querySelector('[data-intent="sheet-close"]'),
          title: sheet.querySelector('.ms-ps-sheet-title h2').textContent, line: sheet.querySelector('.ms-ps-sheet-title p')?.textContent ?? null,
          openTab: shell.querySelector('[data-intent="tab"][aria-expanded="true"]')?.dataset.value ?? null,
          cells: cells.length, selected: cells.filter(c => c.dataset.state === 'selected').map(c => c.dataset.value).join(','),
          choosable: cells.filter(c => c.getAttribute('aria-disabled') !== 'true').map(c => c.dataset.value).join(','),
          notes: qa('.ms-k-cell-note').filter(shown).map(n => n.textContent).join('|'), you: qa('.ms-k-you').filter(shown).map(n => n.closest('.ms-k-cell').dataset.value).join(','),
          list: q('.ms-k-grid9') ? getComputedStyle(q('.ms-k-grid9')).gridTemplateColumns.split(' ').length === 1 : null,
          wait: wait ? [wait.querySelector('.ms-k-wait-title').textContent, wait.querySelector('.ms-k-wait-line').textContent].join('|') : null,
          portrait: wait ? Math.round(wait.querySelector('.ms-k-pt').getBoundingClientRect().width) : null,
          notice: q('.ms-k-notice') ? [...q('.ms-k-notice').children].map(n => n.textContent).join('|') : null,
          map: map && shown(map) ? [map.getAttribute('role'), map.getAttribute('aria-label')].join(':') : null,
          dashed: map ? map.querySelectorAll('line[stroke-dasharray]').length : 0, tieLine: !!map && [...map.querySelectorAll('text')].some(t => t.textContent === 'Genuine tie · the Officer chooses'),
          rows: qa('.ms-k-row').map(r => [r.querySelector('.ms-k-row-title')?.textContent, r.querySelector('.ms-k-row-sub')?.hidden === false ? r.querySelector('.ms-k-row-sub').textContent : '', r.querySelector('.ms-k-row-value')?.textContent ?? ''].join(':')).join('|'),
          note: q('.ms-k-group-note')?.textContent ?? null, directions: dirs.map(d => d.textContent.trim()).join('|'),
          directionsWait: dirs[0]?.getAttribute('aria-disabled') === 'true' ? describedBy(dirs[0]) : null,
          foot: foot.map(b => b.textContent.trim()).join('|'), footBusy: foot.some(b => b.getAttribute('aria-busy') === 'true'),
          banner: shown(shell.querySelector('.ms-ps-banner')),
          cut: qa('.ms-k-cell-label, .ms-k-cell-note, .ms-k-row-title, .ms-k-row-sub, .ms-k-row-value, .ms-k-group-note, .ms-k-btn-label, .ms-k-notice > p, .ms-k-wait-title, .ms-k-wait-line').filter(shown).filter(n => n.scrollWidth > n.clientWidth + 0.5).map(n => n.textContent) };
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
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${state}: "${seen.title}" ${seen.foot || 'no footer'}, root ${seen.root}px, unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}${asked ? '' : `, NOT AS EXPECTED ${JSON.stringify(seen).slice(0, 1200)}`}`);
    }
  }
  // The lifecycle probe, as the page comes and with the device's Reduce motion; then the agreement with the pack.
  for (const [mode, media, query] of [['full', null, 'probe=1'], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }, 'probe=1'], ['agree', null, 'agree=1']]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__offices !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__offices.agree' : 'window.__offices.probe');
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
  tool: 'design/tools/office-decisions-check.mjs',
  component: 'design/phone-ui/components/office-decisions',
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
