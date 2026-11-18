// mothership:dev-only
// Focused mounting/recovery regression check. Preserves the pilot's historical review records.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';

const repo = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const component = 'design/phone-ui/components/boarding-film';
const output = resolve(process.argv[2] ?? join(repo, component, 'review/playback-2026-11-18/check.json'));
const source = sourceState(repo, [component, 'design/tools/boarding-playback-check.mjs', 'apps/game/hosted/crew-drawing', 'apps/game/hosted/scene-drawing', 'apps/game/hosted/pregame-films']);
const out = await bundlePreview({ repo, root: join(repo, component, 'preview'), name: 'boarding-playback', pages: { playback: 'playback.html', index: 'index.html' } });
const { server, origin } = await serve(out);
let chrome, browser;
const runs = [], captures = [];
await mkdir(resolve(output, '..'), { recursive: true });
const response = await fetch(`${origin}/playback.html`);
const actualHeaders = recordedHeaders().headers.map(({ key }) => ({ key, value: response.headers.get(key) }));
const actualHeadersSha256 = sha256(JSON.stringify(actualHeaders));
if (actualHeadersSha256 !== recordedHeaders().headersSha256) throw new Error('Served headers differ from the production policy');
try {
  chrome = await launchBrowser(); browser = await connect(chrome.endpoint);
  for (const [width, height] of [[390, 844], [430, 932]]) for (const reduced of [false, true]) {
    const page = await openPage(browser, { width, height, scale: 2, mobile: true });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (reduced) await page.media({ 'prefers-reduced-motion': 'reduce' });
    const url = `${origin}/playback.html`;
    await page.goto(url, 'window.__boardingPlaybackProbe');
    const result = await page.evaluate(`window.__boardingPlaybackProbe(${JSON.stringify({ width, height })})`);
    const violations = await page.evaluate('window.__policy');
    for (const violation of violations) violation.kind = await classify(out, violation);
    const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
    const ok = result.checks.every(c => c.ok) && result.deviceReduced === reduced && !problems.length && violations.every(v => v.kind !== 'unexpected');
    runs.push({ width, height, reduced, url, ...result, violations, problems, ok });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${width}x${height} ${reduced ? 'device reduced' : 'full'}: ${result.checks.filter(c => c.ok).length}/${result.checks.length}`);
    for (const check of result.checks.filter(c => !c.ok)) console.log(`  ${check.name}: ${JSON.stringify(check.detail)}`);
    await page.close();
    for (const count of [7, 8, 9]) {
      const capture = await openPage(browser, { width, height, scale: 2, mobile: true });
      await capture.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      if (reduced) await capture.media({ 'prefers-reduced-motion': 'reduce' });
      const captureUrl = `${origin}/index.html?size=${width}x${height}&t=8600&n=${count}&bar=0`;
      await capture.goto(captureUrl, 'window.__boardingFilm');
      await capture.evaluate('window.__boardingFilm.ready');
      const seen = await capture.evaluate('window.__boardingFilm.seen()');
      const policy = await capture.evaluate('window.__policy');
      for (const violation of policy) violation.kind = await classify(out, violation);
      const errors = capture.problems().filter(p => !/\/favicon\.ico$/.test(p));
      const { data } = await capture.send('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width, height, scale: 1 } });
      const bytes = Buffer.from(data, 'base64'), name = `${width}x${height}-${count}-${reduced ? 'reduced' : 'full'}.jpg`;
      await writeFile(resolve(output, '..', name), bytes);
      const ok = seen.roster === count && seen.held.variant === (reduced ? 'reduced' : 'full') && seen.held.keys.length > 0 && seen.brightness > 10 && !errors.length && policy.every(v => v.kind !== 'unexpected');
      captures.push({ file: name, sha256: sha256(bytes), url: captureUrl, count, width, height, reduced, seen, violations: policy, problems: errors, ok });
      console.log(`${ok ? 'PASS' : 'FAIL'} capture ${name}`);
      await capture.close();
    }
  }
} finally {
  browser?.close(); await chrome?.close(); server.close(); await rm(out, { recursive: true, force: true });
}
const record = { tool: 'design/tools/boarding-playback-check.mjs', ...source, browser: chrome?.version,
  environment: 'Desktop headless Chrome, phone CSS sizes at 2x. Synthetic scheduling/cost checks are not performance measurements. No physical phone, Safari or screen-reader test.',
  ...recordedHeaders(), actualHeaders, actualHeadersSha256, runs, captures };
await writeFile(output, JSON.stringify(record, null, 2) + '\n');
if (runs.length !== 4 || runs.some(r => !r.ok) || captures.length !== 12 || captures.some(c => !c.ok)) process.exitCode = 1;
