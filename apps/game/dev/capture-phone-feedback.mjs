// mothership:dev-only — production screen and art over synthetic, schema-checked views.
// Run the isolated board server, then:
// node apps/game/dev/capture-phone-feedback.mjs <output-directory> [http://127.0.0.1:5192/]
// This measures Chromium phone emulation, not physical devices or multiplayer correctness.
globalThis[Symbol.for('mothership:dev-only')] = true;

import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { launchBrowser, connect, openPage, sleep } from './capture/browser.mjs';
import { MEASURE, REACHABLE, problemsOf } from './capture/board-measure.mjs';

const output = resolve(process.argv[2] ?? 'phone-feedback-evidence');
const base = process.argv[3] ?? 'http://127.0.0.1:5192/';
const facts = [];
const cases = [
  ['phone-full-room', 'shot', [1]],
  ['phone-full-hospital', 'rescue', [6]],
  ['phone-full-jail', 'code', [1, 2, 4, 9]],
  ['phone-released-waiting', 'code', [1, 2, 4, 9]],
];
await mkdir(output, { recursive: true });
const processHandle = await launchBrowser();
const browser = await connect(processHandle.endpoint);

async function record(page, name, size, enlarged) {
  await sleep(200);
  const measurement = await page.evaluate(MEASURE);
  const unreachable = await page.evaluate(REACHABLE);
  const problems = problemsOf(measurement);
  if (!enlarged && measurement.boardScrollsInside) problems.push('normal-size board scrolls inside');
  if (unreachable.length) problems.push(`unreachable targets: ${unreachable.join(', ')}`);
  const clothes = await page.evaluate(`Array.from(document.querySelectorAll('.ms-seat')).map(node => ({seat:node.dataset.seat, costume:node.querySelector('.ms-token')?.dataset.figure ?? null, jailed:!!node.querySelector('.ms-marker--jail')}))`);
  const stripBox = await page.evaluate(`(() => { const node = document.querySelector('.phone-strip'); if (!node) return null; const b=node.getBoundingClientRect(); return {x:b.x,y:b.y,w:b.width,h:b.height}; })()`);
  facts.push({ name, size, enlarged, ...measurement, stripBox, unreachable, clothes, problems });
  // Keep representative evidence in the repository; all cases retain measured facts.
  const photographed = name.includes('normal-phone-full-room') || name.includes('safe-area-phone-released-waiting')
    || name.includes('safe-area-phone-full-jail-confirm') || name.includes('enlarged-phone-full-room-confirm');
  if (photographed) await page.screenshot(join(output, `${name}.png`), { viewport: true });
  console.log(`${name}: ${problems.length ? problems.join('; ') : 'clean'}`);
}

try {
  for (const size of [[320, 568], [390, 844]]) for (const mode of ['normal', 'safe-area', 'enlarged']) {
    for (const [scenario, action, picks] of cases) {
      const page = await openPage(browser, { width: size[0], height: size[1], mobile: true, ownContext: true });
      try {
        if (mode === 'safe-area') await page.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 20, bottom: 16, left: 0, right: 0 } });
        if (mode === 'enlarged') await page.send('Page.setFontSizes', { fontSizes: { standard: 28 } });
        const name = `${size.join('x')}-${mode}-${scenario}`;
        await page.goto(`${base}?scenario=${scenario}`, "document.querySelector('.ms-board[data-scenes=\"true\"] .ms-token[data-figure]')", 20_000);
        await page.foreground();
        await record(page, `${name}-board`, size, mode === 'enlarged');
        await page.tap('#ms-phone-actions');
        await page.tap(`#ms-action-open-${action}`);
        await record(page, `${name}-targeting`, size, mode === 'enlarged');
        for (const n of picks) { await page.tap(`.phone-character-target[data-value="seat-${n}"]`); await sleep(160); }
        await record(page, `${name}-confirm`, size, mode === 'enlarged');
        if (scenario === 'phone-released-waiting') {
          const jailed = await page.evaluate("!!document.querySelector('.ms-seat[data-seat=\"seat-9\"] .ms-marker--jail')");
          if (jailed) throw new Error('Released Injured occupant acquired a Jailed marker');
        }
      } finally { await page.close(); }
    }
  }
} finally {
  await writeFile(join(output, 'facts.json'), JSON.stringify({ scope: 'Chromium fixture browser emulation; no engine/backend evidence', facts }, null, 2) + '\n');
  browser.close();
  await processHandle.close();
}
const failures = facts.filter(row => row.problems.length && !row.enlarged);
console.log(`${facts.length} measurements; ${failures.length} normal-size failures; enlarged text reported separately`);
if (failures.length) process.exitCode = 1;
