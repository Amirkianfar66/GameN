// mothership:dev-only
//
// Character selection's check (design/phone-ui/components/character-select). It bundles the component's
// preview the way the game bundles the components (Vite: ordinary bundling, no copy), serves the bundle with
// the hosted game's production response headers (design/tools/lib/component-check.mjs), and captures every
// state of sheet 16, the ones around it and the Larger texts at the two development phone sizes, 390 × 844
// and 430 × 932, in desktop Chromium at 2× pixels.
// A capture passes with no policy violation, no failed or refused request and no page error, with the screen
// drawn as the state asks.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce
//   motion emulated: choosing, refusals, focus, this viewer's inputs, the clock and "Time is up", the
//   words, the layout at both sizes and the Larger texts, dispose, motion;
//   the agreement (preview/agree.mjs): the screen beside the frozen pack's, the same words, states, look
//   and boxes to within half a pixel.
// Every check must pass. It writes design/phone-ui/components/character-select/review/: one JPEG per state
// and size, and check.json (the headers and their SHA-256, the source commit, what each capture drew and
// its SHA-256, and each probe and agreement check with what it saw).
//   node design/tools/character-select-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone,
// not Safari, not a performance measure.

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/character-select');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
/** Each state at the two development sizes (preview.mjs PREVIEW_STATES). */
const STATES = ['open', 'selected', 'confirmed', 'closing', 'auto', 'closed', 'not-offered', 'stale', 'large', 'largest'];
const SUB = 'Assigned for you if time runs out';
const NAMES = 'Vega|Rigel|Lyra|Atlas|Orion|Nova|Juno|Mira|Echo';
/** The grid's states in the pack's order, as sheet 16 draws them (a: available, t: taken, s: selected, c: confirmed). */
const GRID = { open: 'aaataaata', later: 'atttacatt', closed: 'tttttcttt', auto: 'ttttttctt' };

/** The preview bundled as the game bundles the component (component-check.mjs). */
const bundle = () => bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'character-select-check' });

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
const drawn = s => s.title === 'Choose a character' && s.names === NAMES && s.cells === 9 && s.group === 'Characters' && s.backdrop === 'rgb(16, 20, 28)' && s.cut.length === 0 && s.tabs === 0;
const nova = (s, line = 'Tap another to change') => s.foot.name === 'Nova' && s.foot.line === line && !s.foot.empty;
const EXPECT = {
  open: s => drawn(s) && s.sub === SUB && s.timer === '0:21' && !s.urgent && s.grid === GRID.open && s.notes === 'Taken · 2|Taken · 1' && s.foot.name === 'No character yet' && s.foot.line === 'Tap one to choose' && s.foot.empty && s.root === 16,
  selected: s => drawn(s) && s.grid === 'atttasatt' && s.notes.includes('Saving…') && s.busy === 'c6' && nova(s, 'Saving your choice') && s.foot.spinner && s.foot.pill === null,
  confirmed: s => drawn(s) && s.grid === GRID.later && s.marks === 1 && nova(s) && s.foot.pill === 'Yours' && !s.urgent,
  closing: s => drawn(s) && s.timer === '0:04' && s.urgent && s.grid === GRID.later && nova(s) && s.foot.pill === 'Yours',
  auto: s => drawn(s) && s.sub === 'Time is up' && s.timer === '0:00' && s.urgent && s.grid === GRID.auto && s.foot.name === 'Juno' && s.foot.line === 'Assigned automatically' && s.foot.pill === null && s.toast === 'Assigned: Juno',
  closed: s => drawn(s) && s.sub === 'Time is up' && s.grid === GRID.closed && s.refused === 8 && nova(s),
  'not-offered': s => drawn(s) && s.grid === GRID.open && s.refused === 9 && s.reasons.includes('Opens when every seat is filled'),
  stale: s => drawn(s) && s.banner && s.refused === 9 && s.grid === GRID.later && nova(s),
  large: s => drawn(s) && s.root === 24 && s.grid === GRID.later && !s.list && (s.footInView || s.scrolls),
  largest: s => drawn(s) && s.root === 32 && s.grid === GRID.later && s.list && (s.footInView || s.scrolls),
};
try {
  await mkdir(REVIEW, { recursive: true });
  for (const state of STATES) {
    for (const sizeKey of ['390x844', '430x932']) {
      const [width, height] = SIZES[sizeKey];
      const query = `size=${sizeKey}&state=${state}`;
      const page = await openPage(browser, { width, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__charSelect !== undefined');
      await page.evaluate('window.__charSelect.ready');
      await sleep(400);
      const seen = await page.evaluate(`(() => {
        const root = document.querySelector('.ms-char-select'), q = s => root.querySelector(s), qa = s => [...root.querySelectorAll(s)];
        const shown = n => !!n && !n.hidden && n.getClientRects().length > 0;
        const grid = q('.ms-cs-grid'), cells = qa('.ms-cs-grid .ms-k-cell'), screen = q('.ms-cs-screen'), foot = q('.ms-cs-foot'), timer = q('.ms-ps-timer');
        const code = { available: 'a', taken: 't', selected: 's', confirmed: 'c' };
        const reasons = cells.map(c => c.getAttribute('aria-describedby')).filter(Boolean).map(id => document.getElementById(id)?.textContent ?? '');
        return { violations: window.__policy, root: parseFloat(getComputedStyle(document.documentElement).fontSize),
          backdrop: getComputedStyle(q('.ms-phone-shell')).backgroundColor, tabs: qa('.ms-ps-tabs').filter(shown).length,
          title: q('.ms-ps-name')?.textContent ?? null, sub: q('.ms-ps-sub')?.textContent ?? null,
          timer: shown(timer) ? timer.textContent.trim() : null, urgent: shown(timer) && timer.hasAttribute('data-urgent'),
          group: grid.getAttribute('role') === 'group' ? grid.getAttribute('aria-label') : null, cells: cells.length,
          names: cells.map(c => c.querySelector('.ms-k-cell-label').textContent).join('|'), grid: cells.map(c => code[c.dataset.state] ?? '?').join(''),
          notes: cells.map(c => c.querySelector('.ms-k-cell-note')).filter(shown).map(n => n.textContent).join('|'),
          marks: qa('.ms-cs-grid .ms-k-cell-mark').filter(shown).length, busy: cells.filter(c => c.getAttribute('aria-busy') === 'true').map(c => c.dataset.value).join(),
          refused: cells.filter(c => c.getAttribute('aria-disabled') === 'true').length, reasons,
          cut: qa('.ms-cs-grid .ms-k-cell-label').filter(n => n.scrollWidth > n.clientWidth + 0.5).map(n => n.textContent),
          list: cells[1].getBoundingClientRect().top > cells[0].getBoundingClientRect().bottom - 0.5,
          foot: { name: q('.ms-cs-name').textContent, line: q('.ms-cs-line').textContent.trim(), spinner: shown(q('.ms-cs-line .ms-k-spinner')),
            pill: shown(q('.ms-cs-foot .ms-k-pill')) ? q('.ms-cs-foot .ms-k-pill').textContent : null, empty: !!q('.ms-cs-foot > .ms-k-pt-empty') },
          toast: shown(q('.ms-ps-toast')) ? q('.ms-ps-toast').textContent : null, banner: shown(q('.ms-ps-banner')),
          scrolls: screen.scrollHeight > screen.clientHeight + 0.5, footInView: foot.getBoundingClientRect().bottom <= screen.getBoundingClientRect().bottom + 0.5,
          layout: window.__charSelect.mounted[0]?.layout?.() ?? null };
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
      // The nine portraits came from the crew release (the bundle's copies of design/crew-drawing/assets/portraits).
      const portraits = requests.filter(url => /portrait-c\d/.test(url)).length >= 9;
      const ok = seen.violations.every(v => v.kind !== 'unexpected') && problems.length === 0 && asked && portraits;
      if (!ok) failed += 1;
      results[`${sizeKey}/${state}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), ok, drawn: asked, portraits, ...seen, requests, problems };
      await page.close();
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${state}: ${seen.grid} "${seen.sub}" ${seen.timer ?? 'no clock'}, root ${seen.root}px, unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}${asked && portraits ? '' : `, NOT AS EXPECTED ${JSON.stringify(seen).slice(0, 900)}`}`);
    }
  }
  // The lifecycle probe, as the page comes and with the device's Reduce motion; then the agreement with the pack.
  for (const [mode, media, query] of [['full', null, 'probe=1'], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }, 'probe=1'], ['agree', null, 'agree=1']]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__charSelect !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__charSelect.agree' : 'window.__charSelect.probe');
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
  tool: 'design/tools/character-select-check.mjs',
  component: 'design/phone-ui/components/character-select',
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
