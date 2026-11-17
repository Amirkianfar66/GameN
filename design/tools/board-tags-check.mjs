// mothership:dev-only
//
// The board tags' check (design/phone-ui/components/board-tags). It bundles the component's preview the way the
// game bundles a component (Vite: ordinary bundling, no copy), serves the bundle with the hosted game's production
// response headers (scripts/prepare-hosted-preview.mjs: the Content Security Policy of
// scripts/hosted-preview-policy.mjs and the six other headers), and captures the board in the game's own panels
// (Board V2's turnsLayout, each panel drawn by the pack's paintRoom and paintCapsule, the component in each) at the
// Lead's sizes (Q2): 390 × 844 and 430 × 932 at Standard, Large and Largest text, and 320 × 568 at Standard (with no
// status bar: with one, Board V2 draws no board there), in desktop Chromium at 2× pixels.
// A capture passes with no policy violation but the known Zod probe, no failed or refused request and no page error,
// with every person's tag drawn, each panel's tags inside it and apart (the layer's own measure), no tag's words cut
// or ended in "…", and, concealed, no name in the page.
// It then runs, in the same bundle under the same headers:
//   the probe (preview/probe.mjs): whole, apart, deterministic, still, layer, privacy, inputs, kept, rules, dispose;
//   the agreement (preview/agree.mjs): the component beside the pinned pack's own sheet 26 tags, the same words,
//   looks and boxes (to within half a pixel), except where the pack's own tags meet, where rule 4 moves them apart.
// It writes design/phone-ui/components/board-tags/review/: one JPEG per capture, and check.json (the headers and
// their SHA-256, the source commit, what each capture drew and its SHA-256, and each probe and agreement check with
// what it saw). It exits non-zero when any check fails, and says which.
//   node design/tools/board-tags-check.mjs [--keep]
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone, not Safari,
// not a performance measure.

import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { BOARD_STATES, CAPTURES } from '../phone-ui/components/board-tags/preview/states.mjs';
import { SELF, board } from '../phone-ui/prototype/fixtures.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/board-tags');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932], '320x568': [320, 568] };

/** How many tags each board draws: everyone placed (nine), and the capsule's two when they talk. */
const tagsOf = state => (BOARD_STATES[state].status === 'concealed' ? 0 : (BOARD_STATES[state].scene.seats ?? board({ roster: 9 })).length + (BOARD_STATES[state].scene.talk?.length ?? 0));
/** The names that must never be in a concealed page. */
const NAMES = board({ roster: 9 }).filter(s => s.seat !== SELF).map(s => s.name);

/**
 * The preview bundled as the game bundles a component (lib/component-check.mjs). The pack's board finds the
 * capsule's pictures (design/board-v2/assets/) and the Hospital's (apps/game/hosted/board-v2-film-art/) from its
 * own place at run time, which no bundle carries; they are copied to where it looks from the bundle, as the pack's
 * own pages serve them. In the game, Board V2's art bundles carry them.
 */
async function bundle() {
  const out = await bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'board-tags-check' });
  await cp(join(REPO, 'design/board-v2/assets'), join(out, 'board-v2/assets'), { recursive: true });
  for (const part of ['scenes', 'lighting']) {
    await cp(join(REPO, 'apps/game/hosted/board-v2-film-art', part), join(out, 'apps/game/hosted/board-v2-film-art', part), { recursive: true });
  }
  return out;
}

// The source the captures show, read before anything is written: the components' files, the hosted drawings they
// use, the rooms' and the crew's pictures, without the review folders checks write.
const { sourceCommit, sourceClean } = sourceState(REPO, ['design/phone-ui/components', 'apps/game/hosted', 'design/board-motion/assets', 'design/board-v2/assets',
  'design/room-drawing/assets', 'design/crew-drawing/assets', 'design/tools/board-tags-check.mjs']);
const out = await bundle();
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const results = {};
const probes = {};
let agreement = null;
let failed = 0;
try {
  await mkdir(REVIEW, { recursive: true });
  // A clean review folder: captures of states that no longer exist do not linger.
  for (const name of await readdir(REVIEW)) if (/\.jpg$/.test(name)) await rm(join(REVIEW, name));
  for (const c of CAPTURES) {
    const [width, height] = SIZES[c.size];
    const page = await openPage(browser, { width, height, scale: 2 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    await page.goto(`${origin}/index.html?single=1&state=${c.state}&size=${c.size}&text=${c.text}`, 'window.__boardTags !== undefined');
    await page.evaluate('window.__boardTags.ready');
    // The rooms' pictures load: capture them drawn.
    await sleep(900);
    const seen = await page.evaluate(`(() => {
      const all = s => [...document.querySelectorAll(s)];
      const layers = all('.ms-board-tags');
      const tags = all('.ms-bt-tag');
      const cut = tags.filter(t => [t, ...t.querySelectorAll('.ms-bt-name, .ms-bt-status')].some(n => n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1));
      return { violations: window.__policy, fits: document.querySelector('.pv-phone')?.dataset.fits === 'true', panels: all('.board-panel').length, layers: layers.length,
        tags: tags.length, words: tags.map(t => t.innerText.replace(/\\s+/g, ' ').trim()).join('|'),
        inside: layers.every(l => l.dataset.inside === 'true'), apart: layers.every(l => l.dataset.apart === 'true'),
        cut: cut.map(t => t.dataset.seat), ellipsis: tags.some(t => t.innerText.includes('…')), twoLines: tags.filter(t => t.offsetHeight > 22).length,
        figures: all('.board-panel .fig svg').length, page: document.body.innerText };
    })()`);
    const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
    for (const v of seen.violations) v.kind = await classify(out, v);
    const name = `${c.size}-${c.text}-${c.state}.jpg`;
    const file = join(REVIEW, name);
    const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 72, clip: { x: 0, y: 0, width, height, scale: 1 } });
    const bytes = Buffer.from(data, 'base64');
    await writeFile(file, bytes);
    const concealed = BOARD_STATES[c.state].status === 'concealed';
    const leaked = concealed ? NAMES.filter(n => seen.page.includes(n)) : [];
    const mismatched = [];
    if (!seen.fits) mismatched.push('fits');
    if (seen.tags !== tagsOf(c.state)) mismatched.push(`tags ${seen.tags} ≠ ${tagsOf(c.state)}`);
    if (!concealed && (!seen.inside || !seen.apart || seen.cut.length || seen.ellipsis)) mismatched.push('whole and apart');
    if (concealed && (seen.tags || leaked.length)) mismatched.push('concealed');
    if (!concealed && seen.figures === 0) mismatched.push('people');
    const ok = seen.violations.every(v => v.kind !== 'unexpected') && problems.length === 0 && mismatched.length === 0;
    if (!ok) failed += 1;
    delete seen.page;
    results[`${c.size}@${c.text}/${c.state}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), ok, mismatched, ...seen, leaked, problems };
    await page.close();
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${c.size} ${c.text}% ${c.state}: tags ${seen.tags}, two-line ${seen.twoLines}, inside ${seen.inside}, apart ${seen.apart}${mismatched.length ? `, differs: ${mismatched.join('; ')}` : ''}, unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}`);
  }
  // The probe, as the page comes; then the agreement with the pack.
  for (const [mode, query] of [['full', 'probe=1'], ['agree', 'agree=1']]) {
    const page = await openPage(browser, { width: 1000, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__boardTags !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__boardTags.agree' : 'window.__boardTags.probe');
    const violations = await page.evaluate('window.__policy');
    for (const v of violations) v.kind = await classify(out, v);
    const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
    const ok = outcome.ok && outcome.mode === mode && outcome.checks.length > 0 && problems.length === 0 && violations.every(v => v.kind !== 'unexpected');
    if (!ok) failed += 1;
    // The run's own verdict last, so the page's (outcome.ok) never stands in for it.
    const entry = { ...outcome, ok, violations, problems };
    if (mode === 'agree') agreement = entry; else probes[mode] = entry;
    await page.close();
    for (const c of outcome.checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'} ${mode === 'agree' ? '' : `probe · `}${c.id}${c.ok ? '' : ` ${JSON.stringify(c.detail).slice(0, 1500)}`}`);
    if (outcome.error) console.log(`FAIL ${mode}: ${outcome.error}`);
    if (problems.length) console.log(`FAIL ${mode}: problems ${JSON.stringify(problems).slice(0, 1500)}`);
  }
} finally {
  browser.close();
  chrome.close?.();
  server.close();
  if (process.argv.includes('--keep')) console.log(`kept the bundle in ${out}`); else await rm(out, { recursive: true, force: true });
}
const record = {
  tool: 'design/tools/board-tags-check.mjs',
  component: 'design/phone-ui/components/board-tags',
  sourceCommit, sourceClean,
  environment: 'Desktop Chromium (headless), each phone size at 2x pixels; the preview bundled by Vite and served with the production headers below. The board in the game\'s own panels (Board V2\'s turnsLayout), each drawn by the pack. Not a phone, not Safari, not a performance measure.',
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
