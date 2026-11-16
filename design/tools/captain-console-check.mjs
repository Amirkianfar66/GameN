// mothership:dev-only
//
// The Captain console's check (design/phone-ui/components/captain-console). It bundles the component's preview the way
// the game bundles the components (Vite: ordinary bundling, no copy), serves the bundle with the hosted game's
// production response headers (design/tools/lib/component-check.mjs), and captures every state of sheets 22 and 24
// (the console, the commands used, and each confirm) and the ones around them (Release in flight, reconnecting, the
// Largest text), in the phone shell's sheet over the Command Room on the Captain's turn, at the two development phone
// sizes, 390 × 844 and 430 × 932, in desktop Chromium at 2× pixels.
// A capture passes with no policy violation, no failed or refused request and no page error, with the sheet drawn as
// the state asks.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce motion
//   emulated: the plates and their lines, the art, the footer's Cancel and commands, the confirm's words, the
//   Captain's privacy, reconnecting, focus, the layout at both sizes and the Largest text, dispose, motion;
//   the agreement (preview/agree.mjs): the sheet beside the frozen pack's captain screen in each of its console states,
//   the same words, states, look and boxes to within half a pixel, and each plate's picture by its file.
// Every check must pass. It writes design/phone-ui/components/captain-console/review/: one JPEG per state and size,
// and check.json (the headers and their SHA-256, the source commit, what each capture drew and its SHA-256, and each
// probe and agreement check with what it saw).
//   node design/tools/captain-console-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone,
// not Safari, not a performance measure.

import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/captain-console');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
/** Each state at the two development sizes (preview.mjs PREVIEW_STATES). */
const STATES = ['console', 'used', 'release', 'eject', 'sending', 'stale', 'largest'];
const RECONNECTING = 'Controls return when the match is current';
const FACTS = (line) => `Once a match, on your turn in the Command Room|${line}|Hospital detention is not affected`;

/** The pack's plates: its screen finds them from its own place at run time (apps/game/hosted/), which no bundle carries. */
const PLATES = 'apps/game/hosted/board-v2-film-art/captain';
/**
 * The preview bundled as the game bundles the component (component-check.mjs), with the pack's plate pictures copied to
 * where the frozen pack looks for them, as its own pages serve them. The component's own plates are bundled as the
 * preview's images.
 */
async function bundle() {
  const out = await bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'captain-console-check' });
  await cp(join(REPO, PLATES), join(out, PLATES), { recursive: true });
  return out;
}

// The source the captures show, read before anything is written: the components' files, the room pictures and the plates' art, without the review folders.
const { sourceCommit, sourceClean } = sourceState(REPO, ['design/phone-ui/components', 'design/room-drawing/assets', 'apps/game/hosted/board-v2-film-art/captain']);
const out = await bundle();
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const results = {};
const probes = {};
let agreement = null;
let failed = 0;
/** What every state shows, and what each one adds, from the sheet's own DOM. */
const common = s => s.cut.length === 0 && s.name === 'group:Captain console' && s.title === 'Captain console' && !s.back && s.detent === 'auto';
const consoleView = (s, plates, lines) => common(s) && s.line === 'Command Room · your turn' && s.close && s.plates === plates && s.lines === lines && s.note === 'Each command works once a match, whoever is Captain.' && s.foot === '' && s.openTab === 'actions' && s.covered === 0;
const confirm = (s, title, icon, foot, fact) => common(s) && !s.line && !s.close && s.who === `${title}|Fay and Ike are in Jail|${icon}` && s.facts === FACTS(fact) && s.foot === foot && s.openTab === null;
const EXPECT = {
  console: s => consoleView(s, 'release:available:available:on|eject:available:available:on', 'Once a match|Once a match') && s.root === 16,
  used: s => consoleView(s, 'release:spent:used:off|eject:unavailable:unavailable:off', 'Used|No one in Jail'),
  release: s => confirm(s, 'Release the Jail', 'release', 'Cancel|Release', 'Frees everyone physically in Jail now') && !s.footBusy,
  eject: s => confirm(s, 'Eject the Jail', 'eject', 'Cancel|Eject', 'Ejects everyone physically in Jail now') && s.commandKind === 'warn',
  sending: s => confirm(s, 'Release the Jail', 'release', 'Cancel|Release', 'Frees everyone physically in Jail now') && s.footBusy,
  // Reconnecting: Release waits with the banner's words; Cancel still works.
  stale: s => confirm(s, 'Release the Jail', 'release', 'Cancel|Release', 'Frees everyone physically in Jail now') && s.banner && s.commandWaits === RECONNECTING && !s.cancelRefused,
  largest: s => consoleView(s, 'release:available:available:on|eject:available:available:on', 'Once a match|Once a match') && s.root === 32,
};
try {
  await mkdir(REVIEW, { recursive: true });
  for (const state of STATES) {
    for (const sizeKey of ['390x844', '430x932']) {
      const [width, height] = SIZES[sizeKey];
      const query = `size=${sizeKey}&state=${state}`;
      const page = await openPage(browser, { width, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__console !== undefined');
      await page.evaluate('window.__console.ready');
      await sleep(500);
      const seen = await page.evaluate(`(() => {
        const root = document.querySelector('.ms-captain-console'), q = s => root.querySelector(s), qa = s => [...root.querySelectorAll(s)];
        const shell = document.querySelector('.ms-phone-shell'), sheet = shell.querySelector('.ms-ps-sheet');
        const shown = n => !!n && !n.hidden && n.getClientRects().length > 0 && !n.closest('[hidden]');
        const describedBy = n => { const id = n?.getAttribute('aria-describedby'); return id ? document.getElementById(id)?.textContent ?? null : null; };
        const foot = [...sheet.querySelectorAll('.ms-ps-sheet-foot .ms-k-btn')];
        const tiles = qa('[data-intent="plate"]'), who = q('.ms-k-who');
        return { violations: window.__policy, root: parseFloat(getComputedStyle(document.documentElement).fontSize),
          name: [root.getAttribute('role'), root.getAttribute('aria-label')].join(':'), detent: sheet.dataset.detent,
          back: !!sheet.querySelector('[data-intent="sheet-back"]'), close: !!sheet.querySelector('[data-intent="sheet-close"]'),
          title: sheet.querySelector('.ms-ps-sheet-title h2').textContent, line: sheet.querySelector('.ms-ps-sheet-title p')?.textContent || null,
          openTab: shell.querySelector('[data-intent="tab"][aria-expanded="true"]')?.dataset.value ?? null,
          plates: tiles.map(t => [t.dataset.value, t.dataset.state, t.querySelector('.ms-cc-plate-art').dataset.plate.replace(/^[a-z]+-/, ''), t.getAttribute('aria-disabled') === 'true' ? 'off' : 'on'].join(':')).join('|'),
          lines: tiles.map(t => { const n = t.querySelector('.ms-k-tile-note'); return shown(n) ? n.textContent : ''; }).join('|'),
          covered: tiles.filter(t => { const a = t.querySelector('.ms-cc-plate-art').getBoundingClientRect(); return [...t.querySelectorAll('.ms-k-tile-name, .ms-k-tile-note')].filter(shown).some(n => n.getBoundingClientRect().top < a.bottom - 0.5); }).length,
          note: q('.ms-k-group-note')?.textContent ?? null,
          who: who ? [q('.ms-k-who-title').textContent, shown(q('.ms-k-who-sub')) ? q('.ms-k-who-sub').textContent : '', q('.ms-k-who-lead').dataset.icon.split(':')[0]].join('|') : null,
          facts: qa('.ms-k-fact').map(f => f.textContent).join('|'),
          foot: foot.map(b => b.textContent.trim()).join('|'), footBusy: foot.some(b => b.getAttribute('aria-busy') === 'true'), commandKind: foot[1]?.className.match(/ms-k-btn-(\\w+)/)?.[1] ?? null,
          commandWaits: foot[1]?.getAttribute('aria-disabled') === 'true' ? describedBy(foot[1]) : null, cancelRefused: foot[0]?.getAttribute('aria-disabled') === 'true',
          banner: shown(shell.querySelector('.ms-ps-banner')),
          cut: qa('.ms-k-tile-name, .ms-k-tile-note, .ms-k-group-note, .ms-k-who-title, .ms-k-who-sub, .ms-k-fact-text').filter(shown).filter(n => n.scrollWidth > n.clientWidth + 0.5).map(n => n.textContent) };
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
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__console !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__console.agree' : 'window.__console.probe');
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
  tool: 'design/tools/captain-console-check.mjs',
  component: 'design/phone-ui/components/captain-console',
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
