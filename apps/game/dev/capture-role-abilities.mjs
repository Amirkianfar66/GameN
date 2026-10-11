// mothership:dev-only
//
// Evidence for the role-ability states (issue #99) in the board simulation (dev/board/: the
// release's own screen, controller, host, styles and art over synthetic, schema-checked views
// and a scripted command desk). Two kinds of journey:
//   - the card: what each role's own view states, read in "What you know" and the Supply results;
//   - the strip: an ability played on the board through to the desk's answer, registered or not.
// Each step is measured and photographed. This is browser simulation: it proves nothing about
// real devices, the backend or multiplayer behavior.
//
// With `npx vite --config apps/game/dev/board/vite.config.mjs` running (port 5178):
//   CHROME_PATH=/path/to/chrome node apps/game/dev/capture-role-abilities.mjs <output-directory>
// A browser run as root also needs --no-sandbox: point CHROME_PATH at a wrapper that adds it.

import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { connect, launchBrowser, openPage, sleep } from './capture/browser.mjs';
import { MEASURE, problemsOf } from './capture/board-measure.mjs';

// A statement, not only a comment: it survives bundling and comment stripping, so the
// production-exclusion check finds this module wherever it ends up.
globalThis[Symbol.for('mothership:dev-only')] = true;

const BASE = 'http://127.0.0.1:5178/';
const SIZES = [[320, 568], [390, 844]];
const output = resolve(process.argv[2] ?? 'role-ability-evidence');
await mkdir(output, { recursive: true });
const facts = [];
const lines = [];
const note = (...parts) => { const line = `${new Date().toISOString().slice(11, 19)} ${parts.join(' ')}`.trimEnd(); lines.push(line); console.log(line); };

const browserProcess = await launchBrowser();
const browser = await connect(browserProcess.endpoint);

// What the card says, and whether any of it shows outside the card. (No comments inside the
// page scripts: they are strings, and would survive the comment stripping checked for dev files.)
const CARD = `(() => {
  const app = document.getElementById('app');
  const card = document.querySelector('.ms-private');
  const all = [...(app?.children ?? [])].map(node => node.innerText).join(' ');
  const outside = card ? all.replace(card.innerText, '') : all;
  const sheet = document.querySelector('.ms-private[data-open="true"]');
  return {
    pageScrolls: document.scrollingElement.scrollHeight > innerHeight + 0.5,
    pageOverflowsSideways: document.scrollingElement.scrollWidth > innerWidth + 0.5,
    sheetOpen: Boolean(sheet),
    knowledge: [...document.querySelectorAll('.ms-knowledge__item')].filter(item => item.getClientRects().length > 0).map(item => item.textContent),
    results: [...document.querySelectorAll('.ms-acknowledgments p')].filter(line => line.getClientRects().length > 0).map(line => line.textContent),
    privateWordsOutside: ['Protection', 'Rescue', 'scanned', 'The Code', 'Supply', 'Undercover', 'Hacker', 'Alien', 'Supplier', 'Cracker', 'Officer'].filter(word => outside.includes(word)),
  };
})()`;
const STRIP = `(() => {
  const state = document.querySelector('.phone-action-dock .phone-strip > .ms-card__state');
  return state ? { kind: state.dataset.kind ?? null, status: state.dataset.status, text: state.querySelector('.phone-strip__text')?.innerText.replace(/\\s+/g, ' ').trim() ?? '' } : null;
})()`;

async function open(scenario, [width, height], query = '') {
  const page = await openPage(browser, { width, height, scale: 1, mobile: true, ownContext: true });
  await page.goto(`${BASE}?scenario=${scenario}${query}`, "document.querySelector('.ms-board .ms-seat[data-station]')", 20_000);
  await page.foreground();
  await sleep(500);
  return page;
}

async function cardStep(page, name, scenario, size, expected) {
  await sleep(350);
  const measured = await page.evaluate(CARD);
  const missing = expected.filter(line => !measured.knowledge.includes(line) && !measured.results.includes(line));
  const problems = [
    measured.pageScrolls && 'page scrolls', measured.pageOverflowsSideways && 'sideways overflow', !measured.sheetOpen && 'card not open',
    ...missing.map(line => `missing: ${line}`),
    measured.privateWordsOutside.length > 0 && `private words outside the card: ${measured.privateWordsOutside}`,
  ].filter(Boolean);
  facts.push({ name, scenario, size, ...measured, problems });
  await page.screenshot(join(output, `${name}.png`), { viewport: true });
  note(name, size.join('x'), problems.length ? `PROBLEMS: ${problems.join('; ')}` : 'clean');
}

async function stripStep(page, name, scenario, size, expected) {
  await sleep(350);
  const measured = await page.evaluate(MEASURE);
  const strip = await page.evaluate(STRIP);
  const problems = [
    ...problemsOf(measured, { phone: true }),
    !strip && 'no strip',
    strip && strip.kind !== expected.kind && `strip kind ${strip.kind}`,
    strip && strip.status !== expected.status && `strip status ${strip.status}`,
    strip && !strip.text.includes(expected.text) && `strip says "${strip.text}"`,
  ].filter(Boolean);
  facts.push({ name, scenario, size, strip, pageScrolls: measured.pageScrolls, pageOverflowsSideways: measured.pageOverflowsSideways, problems });
  await page.screenshot(join(output, `${name}.png`), { viewport: true });
  note(name, size.join('x'), problems.length ? `PROBLEMS: ${problems.join('; ')}` : 'clean', strip ? `| ${strip.status}: ${strip.text.slice(0, 80)}` : '');
}

// What each role's own view states, where the phone shows it: "What you know" in the card, and
// the Supply results with the actions. Only lines that are drawn (not hidden by style) count.
const CARDS = [
  ['protection-states', 'role', ['Protection for Player 2: used up.', 'Protection for Player 4: active.']],
  ['cracker-no-rescues', 'role', ['You have no Rescues left.']],
  ['scan-results', 'role', ['The Undercover is Player 5.', 'Round 1: you scanned Player 4 and guessed Red. The guess was wrong.', 'Round 2: you scanned Player 1 and guessed Blue. The guess was right, and that player is in the Code.']],
  ['alien-code', 'role', ['The Code is these four players: Player 1, Player 2, Player 3 (you), Player 4.']],
  ['supplier-results', 'actions', ['Your Round 3 Supply granted one weapon each to Player 1 and Player 5.']],
];

// An ability played on the board to the desk's answer: scenario, action, the character tapped, the query, and what the strip then says.
const STRIPS = [
  ['disable-registered', 'disable', 'disable', 8, '', { kind: 'disable', status: 'accepted', text: 'Disable at Player 8 registered.' }],
  ['disable-not-accepted', 'disable', 'disable', 8, '&answer=reject', { kind: 'disable', status: 'not-accepted', text: '' }],
  ['rescue-registered', 'rescue', 'rescue', 6, '', { kind: 'rescue', status: 'accepted', text: 'Rescue of Player 6 registered.' }],
  ['protect-registered', 'protect', 'protect', 3, '', { kind: 'protect', status: 'accepted', text: 'Protection for yourself registered.' }],
  ['officer-shot-registered', 'officer-round-1', 'shot', 5, '', { kind: 'shot', status: 'accepted', text: 'Shot at Player 5 registered.' }],
];

for (const size of SIZES) {
  const tag = size.join('x');
  for (const [scenario, view, expected] of CARDS) {
    const page = await open(scenario, size);
    if (view === 'role') {
      await page.tap('#ms-private-toggle');
      await page.waitFor("document.querySelector('.phone-knowledge > summary')", 'the card', 5000);
      await page.tap('.phone-knowledge > summary');
      await page.waitFor("document.querySelector('.phone-knowledge[open]')", 'what you know, open', 5000);
      await page.evaluate("document.querySelector('.phone-knowledge').scrollIntoView({ block: 'end' })");
    } else {
      await page.tap('#ms-phone-actions');
      await page.waitFor("document.querySelector('.ms-acknowledgments')?.getClientRects().length > 0", 'the Supply results with the actions', 5000);
      await page.evaluate("document.querySelector('.ms-acknowledgments').scrollIntoView({ block: 'end' })");
    }
    await cardStep(page, `${tag}-${scenario}`, scenario, size, expected);
    await page.close();
  }
  for (const [name, scenario, kind, seat, query, expected] of STRIPS) {
    const page = await open(scenario, size, query);
    await page.tap('#ms-phone-actions');
    await page.waitFor(`document.querySelector('#ms-action-open-${kind}')`, `tray offers ${kind}`, 5000);
    await page.tap(`#ms-action-open-${kind}`);
    await page.waitFor("document.querySelector('.phone-strip > .ms-card__state[data-step=\"choosing\"]')", 'choosing', 5000);
    await page.tap(`.phone-character-target[data-value="seat-${seat}"]`);
    await page.waitFor("document.querySelector('#ms-action-confirm')", 'confirming', 5000);
    await sleep(450); // the controller's double-tap guard
    await page.tap('#ms-action-confirm');
    await page.waitFor(`document.querySelector('.phone-strip > .ms-card__state[data-status="${expected.status}"]')`, expected.status, 8000);
    await stripStep(page, `${tag}-${name}`, scenario, size, expected);
    await page.close();
  }
}

await writeFile(join(output, 'facts.json'), `${JSON.stringify(facts, null, 2)}\n`);
await writeFile(join(output, 'capture-log.txt'), `${lines.join('\n')}\n`);
const failed = facts.filter(fact => fact.problems.length > 0).length;
note('done', `${facts.length} steps, ${failed} with problems`);
await browser.close();
await browserProcess.close();
process.exitCode = failed > 0 ? 1 : 0;
