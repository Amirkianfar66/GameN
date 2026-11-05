// mothership:dev-only
//
// Review captures of library group 1 (design/library/hack-engineer/index.html) in a local
// Chromium: every state card at 390 and 320 px sheets, the Hacker's group at 200% text, every
// motion as a strip of frames (full and reduced), and contact sheets. Each capture is measured: no
// sideways overflow on the page or a sheet, every game button (.ab-button) at least 44 px tall (the
// review page's own Play controls are tools, not game controls), no page error. 1x device pixels.
//   node design/tools/library-capture.mjs
// Writes design/library/hack-engineer/review/*.png and review/report.json. Needs CHROME_PATH.

import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { MOTION } from '../library/hack-engineer/motion.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const out = resolve(repoRoot, 'design/library/hack-engineer/review');
const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

async function main() {
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  const server = await startStaticServer();
  const handle = await launchBrowser();
  const browser = await connect(handle.endpoint);
  const report = { tool: 'design/tools/library-capture.mjs', browser: handle.version, page: 'design/library/hack-engineer/index.html', captures: [], problems: [] };
  const record = async (file, meta) => { const bytes = await readFile(file); report.captures.push({ file: relative(repoRoot, file), sha256: sha256(bytes), bytes: bytes.length, ...meta }); };
  try {
    for (const [w, text, only] of [[390, '1', null], [320, '1', null], [390, '2', 'hacker'], [390, '2', 'engineer']]) {
      const page = await openPage(browser, { width: w === 390 ? 900 : 760, height: 900, scale: 1 });
      const query = new URLSearchParams({ w: String(w), text, ...(only ? { only } : {}) });
      await page.goto(`${server.origin}/library/hack-engineer/index.html?${query}`, 'window.__lib && (window.__lib.ready || window.__lib.error)');
      const probe = await page.evaluate(`(() => ({
        error: window.__lib.error ?? null,
        overflow: document.documentElement.scrollWidth > innerWidth,
        cards: [...document.querySelectorAll('.lib-card')].map(c => ({ state: c.dataset.state, overflow: c.querySelector('.lib-card__sheet').scrollWidth > c.querySelector('.lib-card__sheet').clientWidth + 1 })),
        shortButtons: [...document.querySelectorAll('.lib-card__sheet .ab-button')].filter(b => b.getBoundingClientRect().height < 44).length,
      }))()`);
      if (probe.error) report.problems.push(`w${w} text${text}: ${probe.error}`);
      if (probe.overflow) report.problems.push(`w${w} text${text}: the page scrolls sideways`);
      for (const c of probe.cards.filter(c => c.overflow)) report.problems.push(`w${w} text${text}: ${c.state} overflows its sheet`);
      if (probe.shortButtons) report.problems.push(`w${w} text${text}: ${probe.shortButtons} buttons under 44 px`);
      report.problems.push(...page.problems().map(p => `w${w} text${text}: ${p}`));
      const tag = `w${w}${text === '2' ? '-text200' : ''}`;
      for (const { state } of probe.cards.filter(c => !c.state.startsWith('motion'))) {
        const file = join(out, `${tag}-${slug(state)}.png`);
        await page.screenshot(file, { selector: `.lib-card[data-state=${JSON.stringify(state)}]`, margin: 4 });
        await record(file, { state, width: w, text: text === '2' ? '200%' : '100%' });
      }
      const sheet = join(out, `contact-${tag}.png`);
      await page.screenshot(sheet);
      await record(sheet, { kind: 'contact', width: w, text: text === '2' ? '200%' : '100%' });
      await page.close();
    }
    // Motion strips: six frames of each motion, full and reduced.
    const page = await openPage(browser, { width: 900, height: 900, scale: 1 });
    await page.goto(`${server.origin}/library/hack-engineer/index.html?w=390&only=motion`, 'window.__lib && window.__lib.ready');
    for (const reduced of [false, true]) {
      await page.evaluate(`window.__lib.setReduced(${reduced})`);
      for (const kind of ['unlock', 'wrong', 'insert', 'capture']) {
        const end = reduced ? MOTION.reduced.end : MOTION[kind].end;
        for (const t of [0, 0.2, 0.4, 0.6, 0.8, 1].map(v => Math.round(v * end))) {
          await page.evaluate(`window.__lib.seek(${JSON.stringify(kind)}, ${t})`);
          const file = join(out, `motion-${kind}${reduced ? '-reduced' : ''}-${String(t).padStart(4, '0')}.png`);
          await page.screenshot(file, { selector: `.lib-card[data-state="motion: ${kind}"] .lib-card__sheet`, margin: 2 });
          await record(file, { motion: kind, reduced, t });
        }
      }
    }
    report.problems.push(...page.problems().map(p => `motion: ${p}`));
    await page.close();
  } finally {
    browser.close();
    await handle.close();
    await server.close();
  }
  await writeFile(join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`${report.captures.length} captures, ${report.problems.length} problems${report.problems.length ? `:\n${report.problems.join('\n')}` : ''}`);
  if (report.problems.length) process.exit(1);
}

main().catch(error => { console.error(error); process.exit(1); });
