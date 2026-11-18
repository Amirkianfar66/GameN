// mothership:dev-only
// Supplemental evidence for #295's real-largest state, under #311. The existing
// preview uses the canonical component. Scroll its sheet body to the complete code;
// never change the component, fixture, shared shell, or historical review record.
// node design/tools/host-controls-scroll-check.mjs --out <new evidence directory>

import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256 } from './lib/component-check.mjs';

const repo = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const at = process.argv.indexOf('--out');
if (at < 0 || !process.argv[at + 1]) throw new Error('Use --out <new evidence directory>.');
const output = resolve(process.argv[at + 1]);
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
const dirty = git('status', '--porcelain');
if (dirty) throw new Error('Capture from a clean commit; put output outside the checkout until the run finishes.');
const head = git('rev-parse', 'HEAD');
const sourceTrees = Object.fromEntries([
  'design/phone-ui/components', 'design/phone-ui/prototype', 'design/room-drawing/assets',
  'design/crew-drawing/assets', 'design/tools/lib', 'packages/design-tokens/src',
].map(path => [path, git('rev-parse', `${head}:${path}`)]));
const bundle = await bundlePreview({ repo, root: join(repo, 'design/phone-ui/components/host-controls/preview'), name: 'host-controls-scroll-check' });
let server, chrome, browser;
try {
  const hosted = await serve(bundle);
  server = hosted.server;
  const { origin } = hosted;
  const expected = recordedHeaders();
  const response = await fetch(`${origin}/index.html`);
  const responseHeaders = expected.headers.map(({ key }) => ({ key, value: response.headers.get(key) }));
  if (!response.ok || JSON.stringify(responseHeaders) !== JSON.stringify(expected.headers)) throw new Error('The served response headers differ from production.');
  chrome = await launchBrowser();
  browser = await connect(chrome.endpoint);
  await mkdir(output, { recursive: true });
  const captures = {};
  for (const [width, height] of [[390, 844], [430, 932]]) {
    const size = `${width}x${height}`;
    const url = `${origin}/index.html?single=1&size=${size}&state=real-largest`;
    const page = await openPage(browser, { width, height, scale: 2 });
    try {
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(url, 'window.__hostControls !== undefined');
      await page.evaluate('window.__hostControls.ready');
      const before = await page.evaluate(`document.querySelector('.ms-ps-sheet-body').scrollTop`);
      await page.evaluate(`document.querySelector('.ms-hc-code').scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })`);
      await page.evaluate('new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))');
      const seen = await page.evaluate(`(() => {
        const q = s => document.querySelector(s);
        const box = n => { const r = n.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
        const body = q('.ms-ps-sheet-body'), code = q('.ms-hc-code'), groups = [...code.children].filter(n => n.matches('.ms-hc-group'));
        const b = box(body), c = box(code), footer = box(q('.ms-ps-sheet-foot'));
        const visible = r => r.left >= b.left - 0.5 && r.right <= b.right + 0.5 && r.top >= b.top - 0.5 && r.bottom <= b.bottom + 0.5;
        return {
          textSizePx: parseFloat(getComputedStyle(document.documentElement).fontSize),
          scrollTop: body.scrollTop, body: b, code: c, footer,
          codeFullyVisible: visible(c), groupsFullyVisible: groups.every(n => visible(box(n))),
          splitGroups: groups.filter(n => n.getClientRects().length !== 1).length,
          horizontalOverflow: code.scrollWidth > code.clientWidth + 0.5 || document.documentElement.scrollWidth > innerWidth,
          codeText: code.textContent, matchIdText: q('.ms-hc-match-id').textContent,
          privacyCue: q('.ms-ps-sheet-title p').textContent,
          footerLabels: [...q('.ms-ps-sheet-foot').querySelectorAll('button')].map(n => n.textContent.trim()),
          footerFullyVisible: footer.top >= 0 && footer.bottom <= innerHeight,
          violations: window.__policy,
        };
      })()`);
      for (const violation of seen.violations) violation.kind = await classify(bundle, violation);
      const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
      const ok = seen.textSizePx === 32 && seen.scrollTop > before && seen.codeFullyVisible && seen.groupsFullyVisible
        && seen.splitGroups === 0 && !seen.horizontalOverflow && seen.footerFullyVisible
        && seen.privacyCue === 'Private to this phone' && seen.footerLabels.join('|') === 'Hide|Copy'
        && seen.codeText === 'Zq3x_9Lk-T2vWm8RbYc4N7hJ-pQs0FdE'
        && seen.matchIdText === '3f2a1b4c-9d8e-4f7a-b6c5-1234567890ab'
        && seen.violations.every(v => v.kind !== 'unexpected') && problems.length === 0;
      const file = `${size}-real-largest-scrolled.jpg`;
      const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 85, clip: { x: 0, y: 0, width, height, scale: 1 } });
      const bytes = Buffer.from(data, 'base64');
      await writeFile(join(output, file), bytes);
      captures[size] = { file, url, viewport: { width, height }, pixels: [width * 2, height * 2], sha256: sha256(bytes), ok, scrollBefore: before, ...seen, problems };
      console.log(`${ok ? 'ok' : 'FAIL'} ${size}: complete code visible after scrolling to ${seen.scrollTop}px; ${seen.splitGroups} split groups`);
    } finally {
      await page.close();
    }
  }
  if (git('rev-parse', 'HEAD') !== head || git('status', '--porcelain')) throw new Error('The checkout changed during capture.');
  const record = {
    tool: 'design/tools/host-controls-scroll-check.mjs', toolSha256: sha256(await readFile(fileURLToPath(import.meta.url))),
    createdAt: new Date().toISOString(), sourceCommit: head, sourceClean: true, sourceTrees,
    browser: chrome.version, ...expected, responseHeaders, captures,
    scope: 'Supplemental canonical-component preview, not the integrated app. Existing real-largest fixture; synthetic code and Match ID. Desktop Chromium at 2x pixels, 200% text, safe areas 47px/34px. Only the sheet body was scrolled. No physical-phone, Safari, screen-reader, live-match, or performance claim.',
  };
  await writeFile(join(output, 'scroll-check.json'), `${JSON.stringify(record, null, 2)}\n`);
  if (Object.values(captures).some(c => !c.ok)) process.exitCode = 1;
} finally {
  browser?.close();
  await chrome?.close();
  await new Promise(done => server ? server.close(done) : done());
  await rm(bundle, { recursive: true, force: true });
}
