// mothership:dev-only
//
// The Room ↔ Board zoom's check (design/phone-ui/components/view-zoom). It bundles the component's preview the way
// the game bundles a component (Vite: ordinary bundling, no copy), serves the bundle with the hosted game's
// production response headers (scripts/prepare-hosted-preview.mjs: the Content Security Policy of
// scripts/hosted-preview-policy.mjs and the six other headers), and captures a switch held at moments of it: Room →
// Board at its start, halfway and its end, Board → Room halfway, and the crossfade with no room halfway, at the two
// development phone sizes, 390 × 844 and 430 × 932 (the stage between the shell's bars), in desktop Chromium at 2×
// pixels. A capture passes with no policy violation but the known Zod probe, no failed or refused request and no page
// error, with both views drawn and the switch's animations held where asked.
// It then runs the probe (preview/probe.mjs) in the same bundle under the same headers, once as the page comes and
// once with the device's Reduce motion emulated: frames, timing, crossfade, direct, taps, partway, clean, inputs.
// It writes design/phone-ui/components/view-zoom/review/: one JPEG per capture, and check.json (the headers and
// their SHA-256, the source commit, what each capture drew and its SHA-256, and each probe check with what it saw).
// It exits non-zero when any check fails, and says which.
//   node design/tools/view-zoom-check.mjs [--keep]
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone, not Safari,
// not a performance measure.

import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/view-zoom');
const REVIEW = join(COMPONENT, 'review');
/** The stage between the shell's bars at each size (preview.mjs STAGES). */
const STAGES = { '390x844': [390, 653], '430x932': [430, 741] };
/** The moments captured: [name, direction, ms, no room]. */
const MOMENTS = [['to-board-0', 'board', 0, false], ['to-board-225', 'board', 225, false], ['to-board-450', 'board', 450, false],
  ['to-room-225', 'room', 225, false], ['crossfade-110', 'board', 110, true]];

async function bundle() {
  const out = await bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'view-zoom-check' });
  // The pack's board finds the capsule's pictures and the Hospital's from its own place at run time (as board-tags-check.mjs).
  await cp(join(REPO, 'design/board-v2/assets'), join(out, 'board-v2/assets'), { recursive: true });
  for (const part of ['scenes', 'lighting']) await cp(join(REPO, 'apps/game/hosted/board-v2-film-art', part), join(out, 'apps/game/hosted/board-v2-film-art', part), { recursive: true });
  return out;
}

const { sourceCommit, sourceClean } = sourceState(REPO, ['design/phone-ui/components', 'apps/game/hosted', 'design/board-motion/assets', 'design/board-v2/assets',
  'design/room-drawing/assets', 'design/crew-drawing/assets', 'design/tools/view-zoom-check.mjs']);
const out = await bundle();
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const results = {};
const probes = {};
let failed = 0;
try {
  await mkdir(REVIEW, { recursive: true });
  for (const name of await readdir(REVIEW)) if (/\.jpg$/.test(name)) await rm(join(REVIEW, name));
  for (const sizeKey of Object.keys(STAGES)) {
    const [width, height] = STAGES[sizeKey];
    for (const [moment, to, t, noRoom] of MOMENTS) {
      const page = await openPage(browser, { width, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/index.html?single=1&size=${sizeKey}&to=${to}&t=${t}${noRoom ? '&panel=none' : ''}`, 'window.__viewZoom !== undefined');
      await page.evaluate('window.__viewZoom.ready');
      await sleep(900);
      const seen = await page.evaluate(`(() => {
        const s = window.__stage?.s;
        const anims = s ? [...s.room.getAnimations(), ...s.board.getAnimations()] : [];
        return { violations: window.__policy, views: s ? [s.room, s.board].filter(v => !v.hidden).length : 0,
          held: anims.length > 0 && anims.every(a => a.playState === 'paused' && Math.abs(a.currentTime - ${t}) < 1),
          animations: anims.length, room: s ? getComputedStyle(s.room).transform + ' / ' + getComputedStyle(s.room).opacity : null,
          board: s ? getComputedStyle(s.board).transform + ' / ' + getComputedStyle(s.board).opacity : null,
          figures: document.querySelectorAll('.ms-room-scene .ms-rs-fig svg, .board-panel .fig svg').length };
      })()`);
      const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
      for (const v of seen.violations) v.kind = await classify(out, v);
      const file = join(REVIEW, `${sizeKey}-${moment}.jpg`);
      const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 72, clip: { x: 0, y: 0, width, height, scale: 1 } });
      const bytes = Buffer.from(data, 'base64');
      await writeFile(file, bytes);
      const ok = seen.violations.every(v => v.kind !== 'unexpected') && problems.length === 0 && seen.views === 2 && seen.held && seen.figures > 0;
      if (!ok) failed += 1;
      results[`${sizeKey}/${moment}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), ok, ...seen, problems };
      await page.close();
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${moment}: views ${seen.views}, held ${seen.held}, animations ${seen.animations}, people ${seen.figures}, unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}`);
    }
  }
  for (const [mode, media] of [['full', null], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }]]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?single=1&probe=1`, 'window.__viewZoom !== undefined');
    const outcome = await page.evaluate('window.__viewZoom.probe');
    const violations = await page.evaluate('window.__policy');
    for (const v of violations) v.kind = await classify(out, v);
    const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
    const ok = outcome.ok && outcome.mode === mode && outcome.checks.length > 0 && problems.length === 0 && violations.every(v => v.kind !== 'unexpected');
    if (!ok) failed += 1;
    probes[mode] = { emulated: media ?? {}, ...outcome, ok, violations, problems };
    await page.close();
    for (const c of outcome.checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'} probe ${mode} · ${c.id}${c.ok ? '' : ` ${JSON.stringify(c.detail).slice(0, 1500)}`}`);
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
  tool: 'design/tools/view-zoom-check.mjs',
  component: 'design/phone-ui/components/view-zoom',
  sourceCommit, sourceClean,
  environment: 'Desktop Chromium (headless), each stage at 2x pixels; the preview bundled by Vite and served with the production headers below. Not a phone, not Safari, not a performance measure.',
  ...recordedHeaders(),
  captures: results,
  probe: probes,
};
await writeFile(join(REVIEW, 'check.json'), `${JSON.stringify(record, null, 2)}\n`);
const passedCaptures = Object.values(results).filter(r => r.ok).length;
const probeChecks = Object.values(probes).flatMap(p => p.checks ?? []);
console.log(`${passedCaptures} of ${Object.keys(results).length} captures passed; probe ${probeChecks.filter(c => c.ok).length} of ${probeChecks.length} checks; wrote ${REVIEW.slice(REPO.length + 1)}/check.json`);
if (failed) process.exitCode = 1;
