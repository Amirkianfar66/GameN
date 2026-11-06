// mothership:dev-only
//
// Review captures of library group 1 (design/library/hack-engineer/index.html) in a local
// Chromium: every state card at 390 and 320 px sheets, both groups at 200% text, every motion as a
// strip of frames (full and reduced), and contact sheets. 200% text is the page's &text=2 in a browser
// started at a 32 px default text size, as a phone's text setting sets it (rem and the dossier's em
// media rules answer to it). Each capture is measured: no sideways overflow on the page, no sheet
// wider than its phone width and nothing overflowing a sheet, every game button (.ab-button) at least
// 44 px tall (the review page's own Play controls are tools, not game controls), no page error, and at
// 200% text no visible sheet text under 24 px (13 px, the smallest size, doubled is 26). 1x pixels.
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
  const largeHandle = await launchBrowser({ defaultFontPx: 32 });
  const largeBrowser = await connect(largeHandle.endpoint);
  const report = { tool: 'design/tools/library-capture.mjs', browser: handle.version, page: 'design/library/hack-engineer/index.html', captures: [], problems: [] };
  const record = async (file, meta) => { const bytes = await readFile(file); report.captures.push({ file: relative(repoRoot, file), sha256: sha256(bytes), bytes: bytes.length, ...meta }); };
  try {
    for (const [w, text, only] of [[390, '1', null], [320, '1', null], [390, '2', 'hacker'], [390, '2', 'engineer']]) {
      // At 200% the viewport is the phone's width plus the page's 16 px gutters, so width media rules answer as on the phone.
      const page = await openPage(text === '2' ? largeBrowser : browser, { width: text === '2' ? w + 32 : (w === 390 ? 900 : 760), height: 900, scale: 1 });
      const query = new URLSearchParams({ w: String(w), text, ...(only ? { only } : {}) });
      await page.goto(`${server.origin}/library/hack-engineer/index.html?${query}`, 'window.__lib && (window.__lib.ready || window.__lib.error)');
      const probe = await page.evaluate(`(() => ({
        error: window.__lib.error ?? null,
        overflow: document.documentElement.scrollWidth > innerWidth,
        cards: [...document.querySelectorAll('.lib-card')].map(c => { const sheet = c.querySelector('.lib-card__sheet'); return { state: c.dataset.state, overflow: sheet.scrollWidth > sheet.clientWidth + 1, width: Math.round(sheet.getBoundingClientRect().width) }; }),
        shortButtons: [...document.querySelectorAll('.lib-card__sheet .ab-button')].filter(b => b.getBoundingClientRect().height < 44).length,
        // Visible text that did not double: an element with its own words, outside aria-hidden art, under 24 px.
        smallText: ${text === '2'} ? Object.entries([...document.querySelectorAll('.lib-card__sheet *')]
          .filter(e => !e.closest('[aria-hidden="true"]') && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.getBoundingClientRect().height > 0 && parseFloat(getComputedStyle(e).fontSize) < 24)
          .reduce((found, e) => { const key = String(e.className || e.tagName.toLowerCase()); found[key] = (found[key] ?? 0) + 1; return found; }, {})) : [],
      }))()`);
      if (probe.error) report.problems.push(`w${w} text${text}: ${probe.error}`);
      if (probe.overflow) report.problems.push(`w${w} text${text}: the page scrolls sideways`);
      for (const c of probe.cards.filter(c => c.overflow)) report.problems.push(`w${w} text${text}: ${c.state} overflows its sheet`);
      for (const c of probe.cards.filter(c => c.width !== w)) report.problems.push(`w${w} text${text}: ${c.state} is ${c.width} px wide, not the ${w} px sheet`);
      if (probe.shortButtons) report.problems.push(`w${w} text${text}: ${probe.shortButtons} buttons under 44 px`);
      for (const [cls, count] of probe.smallText) report.problems.push(`w${w} text${text}: ${count} x .${cls} under 24 px at 200% text`);
      report.problems.push(...page.problems().map(p => `w${w} text${text}: ${p}`));
      const tag = `w${w}${text === '2' ? '-text200' : ''}`;
      for (const { state } of probe.cards.filter(c => !c.state.startsWith('motion'))) {
        const file = join(out, `${tag}-${slug(state)}.png`);
        await page.screenshot(file, { selector: `.lib-card[data-state=${JSON.stringify(state)}]`, margin: 4 });
        await record(file, { state, width: w, text: text === '2' ? '200%' : '100%' });
      }
      // One contact sheet per page load: the 200% loads are one section each, so each is named by its section.
      const sheet = join(out, `contact-${tag}${only ? `-${only}` : ''}.png`);
      await page.screenshot(sheet);
      await record(sheet, { kind: 'contact', width: w, text: text === '2' ? '200%' : '100%', ...(only ? { section: only } : {}) });
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
    largeBrowser.close();
    await handle.close();
    await largeHandle.close();
    await server.close();
  }
  await writeFile(join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`${report.captures.length} captures, ${report.problems.length} problems${report.problems.length ? `:\n${report.problems.join('\n')}` : ''}`);
  if (report.problems.length) process.exit(1);
}

main().catch(error => { console.error(error); process.exit(1); });
