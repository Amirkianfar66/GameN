// mothership:dev-only
// Rendered regression for the live Card tab. Production screen/controller/styles over
// schema-checked synthetic views; no multiplayer or physical Safari acceptance implied.
// Start: node node_modules/vite/bin/vite.js --config apps/game/dev/board/vite.config.mjs
// Run: node apps/game/dev/capture-role-card.mjs /private/tmp/gamen-role-card
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { launchBrowser, connect, openPage } from './capture/browser.mjs';

globalThis[Symbol.for('mothership:dev-only')] = true;
const output = resolve(process.argv[2] ?? '/private/tmp/gamen-role-card');
await mkdir(output, { recursive: true });
const base = process.env.MOTHERSHIP_BOARD_URL ?? 'http://127.0.0.1:5178/';
const roles = ['Insider', 'Cracker', 'Officer', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Red Disabler', 'Alien'];
const sizes = [[320, 568], [390, 700], [390, 844], [1280, 800]];
const records = [];
const handle = await launchBrowser(), browser = await connect(handle.endpoint);
const read = `(() => {
  const rect = n => n?.getBoundingClientRect().toJSON() ?? null;
  const panel = document.querySelector('.ms-private__panel'), card = panel?.querySelector('.ms-role-card');
  const art = card?.querySelector('.ms-role-card__art');
  return {
    card: rect(card), panel: rect(panel), art: art && getComputedStyle(art).display !== 'none' ? rect(art) : null,
    words: [...(card?.querySelectorAll('.ms-role-card__name,.ms-role-card__team') ?? [])].map(n => ({text:n.textContent, ...rect(n)})),
    rowHeights: panel ? getComputedStyle(panel).gridTemplateRows : null,
    pageOverflow: document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1,
    panelOverflowX: panel ? panel.scrollWidth - panel.clientWidth : null,
    horizontalScroll: panel ? getComputedStyle(panel).overflowX : null,
    nav: rect(document.querySelector('.phone-nav')),
    artworkLoaded: document.documentElement.dataset.art?.includes('roles') ?? document.body.dataset.art?.includes('roles') ?? false
  };
})()`;
const contains = (outer, inner) => inner.left >= outer.left - 1 && inner.right <= outer.right + 1
  && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1;
try {
  for (const [width, height] of sizes) {
    const page = await openPage(browser, {width, height, mobile:true, ownContext:true});
    try {
      for (const role of roles) {
        const reduced = width === 320;
        const url = new URL(base);
        for (const [key, value] of Object.entries({scenario:'board-v2', 'hack-stage':'idle', profile:'four', role, motion:reduced?'reduced':'full'})) url.searchParams.set(key,value);
        await page.goto(url.href, 'document.querySelector("[data-renderer=board-v2]")', 15000);
        await page.foreground();
        assert.equal(await page.evaluate('Boolean(document.querySelector(".ms-role-card"))'), false, 'Card starts concealed');
        await page.tap('#ms-private-toggle');
        const record = {width, height, role, reduced, ...await page.evaluate(read)};
        records.push(record);
        const label = `${width}x${height}-${role.toLowerCase().replaceAll(' ','-')}`;
        assert.ok(record.artworkLoaded, `${label}: common role-art bundle loaded`);
        assert.ok(record.card?.height >= 44, `${label}: role card must not collapse to its border (${record.card?.height}px)`);
        assert.equal(record.words.length, 2, `${label}: role and team present`);
        for (const word of record.words) {
          assert.ok(contains(record.card,word), `${label}: ${word.text} clipped by the card`);
          assert.ok(contains(record.panel,word), `${label}: ${word.text} should be visible on opening`);
        }
        if (record.art) assert.ok(contains(record.card, record.art), `${label}: artwork clipped by the card`);
        assert.equal(record.pageOverflow, false, `${label}: document must not scroll`);
        assert.ok(record.panelOverflowX <= 1 || record.horizontalScroll === 'hidden', `${label}: private sheet must not scroll sideways`);
        assert.ok(record.panel.bottom <= record.nav.top + 1, `${label}: navigation remains outside the private body`);
        if (['Officer','Hacker'].includes(role)) await page.screenshot(join(output,`${label}.png`), {viewport:true});
        await page.tap('.phone-panel-close');
        assert.equal(await page.evaluate('Boolean(document.querySelector(".ms-role-card"))'), false, 'Close removes private card');
        await page.tap('#ms-private-toggle');
        assert.ok((await page.evaluate(read)).card.height >= 44, 'Reopening keeps the card sized');
        await page.evaluate('window.__simulation.stale()');
        await page.waitFor('!document.querySelector(".ms-role-card")', 'Unconfirmed view conceals the role');
      }
    } finally { await page.close(); }
  }
  console.log(`PASS: ${records.length} role/viewport layouts; artwork and role text unclipped, no page overflow, close/reopen and stale concealment.`);
} finally {
  await writeFile(join(output,'results.json'),JSON.stringify({scope:'Local Chromium rendering of production code over synthetic views. No physical iPhone/Safari test.',records,exceptions:browser.events.filter(event=>event.method==='Runtime.exceptionThrown')},null,2)+'\n');
  browser.close(); await handle.close();
}
