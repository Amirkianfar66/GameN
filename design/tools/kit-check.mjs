// mothership:dev-only
//
// The component kit's check (design/phone-ui/components/kit). It bundles the kit's two comparison pages
// (preview/pack.html and preview/kit.html) as the game bundles a component, serves them with the hosted game's
// production response headers (lib/component-check.mjs), and draws every case of preview/cases.mjs twice, in two
// separate pages: with the pinned pack's builders and only the pack's styles, and with the kit and only its own
// (and the phone shell's, whose sheet is the glass a component's content sits on). At 390 px wide, at 100 % and
// 200 % text, on a plain surface and on glass, it compares every part (preview/compare.mjs): its box to within
// half a pixel, its computed type, colours, spacing and shape, its ::before and ::after, each icon's drawing and
// the words. A difference passes only where compare.mjs's ACCEPTED names it, with why; a page passes with no
// policy report but the known one, no failed request and no page error. Every case must agree.
// It writes design/phone-ui/components/kit/review/: a picture of each half at each text size, and check.json.
//   node design/tools/kit-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at a phone's width: not a phone, not Safari.

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const KIT = join(REPO, 'design/phone-ui/components/kit');
const REVIEW = join(KIT, 'review');
const WIDTH = 390;
const TEXTS = [100, 200];
const { COMPONENT_KIT_VERSION } = await import(pathToFileURL(join(KIT, 'kit.mjs')).href);
const { CASES } = await import(pathToFileURL(join(KIT, 'preview/cases.mjs')).href);
const { ACCEPTED, TOLERANCE, compareCase } = await import(pathToFileURL(join(KIT, 'preview/compare.mjs')).href);

// The source the record shows, read before anything is written: the components (the kit, the shell whose
// sheet it is drawn on, the icons), the pinned pack it is compared with and the crew's portraits.
const { sourceCommit, sourceClean } = sourceState(REPO, ['design/phone-ui/components', 'design/phone-ui/prototype', 'design/crew-drawing/assets/portraits']);
const out = await bundlePreview({ repo: REPO, root: join(KIT, 'preview'), name: 'kit-check', pages: { pack: 'pack.html', kit: 'kit.html' } });
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const pages = {}, agreement = {};
let failed = 0;
try {
  await mkdir(REVIEW, { recursive: true });
  for (const text of TEXTS) {
    const measured = {};
    for (const side of ['pack', 'kit']) {
      const page = await openPage(browser, { width: WIDTH, height: 844, scale: 1 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/${side}.html?text=${text}`, 'window.__kitPage !== undefined');
      measured[side] = await page.evaluate('window.__kitPage.measure()');
      const violations = await page.evaluate('window.__policy');
      for (const v of violations) v.kind = await classify(out, v);
      // The browser asks for /favicon.ico by itself; the preview has none, as the live site has none.
      const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
      const height = await page.fitHeight();
      const file = join(REVIEW, `${side}-${text}.jpg`);
      const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 80, captureBeyondViewport: true, clip: { x: 0, y: 0, width: WIDTH, height, scale: 1 } });
      const bytes = Buffer.from(data, 'base64');
      await writeFile(file, bytes);
      const ok = measured[side].side === side && violations.every(v => v.kind !== 'unexpected') && problems.length === 0;
      if (!ok) failed += 1;
      pages[`${side}-${text}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), size: { width: WIDTH, height }, ok, violations, problems,
        measurementSha256: sha256(JSON.stringify(measured[side].sections)) };
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${side} half at ${text}% text: ${height} px, unexpected reports ${violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}`);
      await page.close();
    }
    agreement[text] = {};
    for (const section of ['plain', 'glass']) {
      const cases = {};
      for (const c of CASES.filter(x => section === 'plain' || x.where === 'both')) {
        const result = compareCase({ section, text }, c, measured.pack.sections[section].cases[c.id], measured.kit.sections[section].cases[c.id]);
        const parts = Object.values(measured.pack.sections[section].cases[c.id] ?? {}).filter(Boolean).length;
        cases[c.id] = { ok: result.ok, parts, differences: result.differences, accepted: result.accepted.map(({ why, ...rest }) => ({ ...rest, rule: ACCEPTED.findIndex(a => a.why === why) })) };
        if (!result.ok) failed += 1;
        console.log(`${result.ok ? 'ok  ' : 'FAIL'} ${text}% ${section} · ${c.id}: ${parts} parts${result.accepted.length ? `, ${result.accepted.length} accepted` : ''}${result.ok ? '' : ` ${JSON.stringify(result.differences).slice(0, 1200)}`}`);
      }
      agreement[text][section] = cases;
    }
  }
} finally {
  browser.close();
  chrome.close?.();
  server.close();
  if (process.argv.includes('--keep')) console.log(`kept the bundle in ${out}`); else await rm(out, { recursive: true, force: true });
}
const all = Object.values(agreement).flatMap(t => Object.values(t).flatMap(s => Object.values(s)));
const record = {
  tool: 'design/tools/kit-check.mjs',
  component: 'design/phone-ui/components/kit',
  version: COMPONENT_KIT_VERSION,
  sourceCommit, sourceClean,
  environment: `Desktop Chromium (headless), ${WIDTH} px wide at 1x pixels; the pages bundled by Vite and served with the production headers below. Not a phone, not Safari.`,
  ...recordedHeaders(),
  tolerance: TOLERANCE,
  accepted: ACCEPTED.map(a => ({ cases: String(a.cases), parts: a.parts ?? [a.part], keys: a.keys, sections: a.sections ?? null, texts: a.texts ?? null, why: a.why })),
  pages,
  agreement,
  summary: { cases: all.length, agree: all.filter(c => c.ok).length, parts: all.reduce((n, c) => n + c.parts, 0), accepted: all.reduce((n, c) => n + c.accepted.length, 0) },
};
await writeFile(join(REVIEW, 'check.json'), `${JSON.stringify(record, null, 2)}\n`);
console.log(`${record.summary.agree} of ${record.summary.cases} cases agree (${record.summary.parts} parts, ${record.summary.accepted} accepted differences); pages ${Object.values(pages).filter(p => p.ok).length} of ${Object.keys(pages).length} clean; wrote ${REVIEW.slice(REPO.length + 1)}/check.json`);
if (failed) process.exitCode = 1;
