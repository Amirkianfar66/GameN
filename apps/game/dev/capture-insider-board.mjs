// mothership:dev-only
//
// Evidence for the Insider's investigation board (interim treatment, pending the Designer's)
// in the board simulation (dev/board/: the release's own screen, controller, host, styles and
// art over synthetic, schema-checked views). The board is opened, closed by Escape, cleared by
// losing focus, hidden by a view the server no longer confirms, and looked for on the shared
// display. Each step is measured and photographed. This is browser simulation: it proves
// nothing about real devices, the backend or multiplayer behavior.
//
// With `npx vite --config apps/game/dev/board/vite.config.mjs` running (port 5178):
//   CHROME_PATH=/path/to/chrome node apps/game/dev/capture-insider-board.mjs <output-directory>
// A browser run as root also needs --no-sandbox: point CHROME_PATH at a wrapper that adds it.

import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { connect, launchBrowser, openPage, sleep } from './capture/browser.mjs';

// A statement, not only a comment: it survives bundling and comment stripping, so the
// production-exclusion check finds this module wherever it ends up.
globalThis[Symbol.for('mothership:dev-only')] = true;

const BASE = 'http://127.0.0.1:5178/';
const output = resolve(process.argv[2] ?? 'insider-board-evidence');
await mkdir(output, { recursive: true });
const facts = [];
const lines = [];
const note = (...parts) => { const line = `${new Date().toISOString().slice(11, 19)} ${parts.join(' ')}`.trimEnd(); lines.push(line); console.log(line); };

const browserProcess = await launchBrowser();
const browser = await connect(browserProcess.endpoint);

const READ = `(() => {
  const box = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const round = b => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, Math.round(v)]));
  const inside = (a, b) => a.x >= b.x - 0.5 && a.y >= b.y - 0.5 && a.x + a.w <= b.x + b.w + 0.5 && a.y + a.h <= b.y + b.h + 0.5;
  const sheet = document.querySelector('.ms-private[data-open="true"]');
  const shown = sheet ? (() => { const r = sheet.getBoundingClientRect(); return { x: r.x + sheet.clientLeft, y: r.y + sheet.clientTop, w: sheet.clientWidth, h: sheet.clientHeight }; })() : null;
  const board = document.querySelector('#phone-investigation');
  const toggle = document.querySelector('#phone-investigation-toggle');
  const players = [...document.querySelectorAll('.phone-investigation__player')];
  const roles = document.querySelector('.phone-investigation__roles');
  const app = document.getElementById('app');
  return {
    viewport: [innerWidth, innerHeight],
    pageScrolls: document.scrollingElement.scrollHeight > innerHeight + 0.5,
    pageOverflowsSideways: document.scrollingElement.scrollWidth > innerWidth + 0.5,
    sheetOpen: Boolean(sheet), sheetScrolls: sheet ? sheet.scrollHeight > sheet.clientHeight + 1 : null,
    toggle: toggle ? { ...round(box(toggle)), expanded: toggle.getAttribute('aria-expanded'), big: box(toggle).h >= 44 - 0.01 } : null,
    boardOpen: Boolean(board) && !board.hidden,
    players: players.map(player => ({ text: player.innerText.replace(/\\s+/g, ' ').trim(), character: player.querySelector('.phone-investigation__portrait')?.dataset.character ?? null,
      shown: shown ? inside(box(player), shown) : false, ...round(box(player)) })),
    rolesShown: roles && shown ? inside(box(roles), shown) : null,
    roles: [...document.querySelectorAll('.phone-investigation__role')].map(node => node.textContent),
    focus: document.activeElement?.id || null,
    sentence: document.body.innerText.includes('hold the roles'),
    hooks: app ? app.innerHTML.includes('phone-investigation') : false,
    roleWordsOutsideCard: (() => {
      const card = document.querySelector('.ms-private');
      const text = [...(app?.children ?? [])].map(node => node.innerText).join(' ');
      const inCard = card ? card.innerText : '';
      return ['Undercover', 'Alien', 'Cracker', 'Insider'].filter(word => text.replace(inCard, '').includes(word));
    })(),
  };
})()`;

async function open(scenario, [width, height], { query = '', fontSize = null } = {}) {
  const page = await openPage(browser, { width, height, scale: 1, mobile: !query.includes('as=display'), ownContext: true });
  if (fontSize) await page.send('Page.setFontSizes', { fontSizes: { standard: fontSize } });
  const ready = query.includes('as=display') ? "document.querySelector('.ms-shell[data-screen=\"match\"] .ms-board .ms-seat')" : "document.querySelector('.ms-board .ms-seat[data-station]')";
  await page.goto(`${BASE}?scenario=${scenario}${query}`, ready, 20_000);
  await page.foreground();
  await sleep(500);
  return page;
}

async function step(page, name, size, { shot = true, settle = 300, expect = () => [] } = {}) {
  await sleep(settle);
  const measured = await page.evaluate(READ);
  // The shared display is not a phone: like the board capture, page scroll is a phone rule.
  const problems = [
    size[0] < 600 && measured.pageScrolls && 'page scrolls', measured.pageOverflowsSideways && 'sideways overflow',
    measured.toggle && !measured.toggle.big && `toggle under 44 px (${measured.toggle.h})`,
    ...expect(measured),
  ].filter(Boolean);
  facts.push({ name, size, ...measured, problems });
  if (shot) await page.screenshot(join(output, `${name}.png`), { viewport: true });
  note(name, size.join('x'), problems.length ? `PROBLEMS: ${problems.join('; ')}` : 'clean');
  return measured;
}

const opened = m => [
  !m.boardOpen && 'board not open',
  m.players.length !== 3 && `${m.players.length} players`,
  m.players.some(player => !player.shown) && 'a player is not in view in the card',
  m.rolesShown === false && 'the roles are not in view in the card',
  JSON.stringify(m.roles) !== JSON.stringify(['Undercover', 'Alien', 'Cracker']) && `roles ${m.roles}`,
  m.toggle?.expanded !== 'true' && 'toggle not expanded',
  m.roleWordsOutsideCard.length > 0 && `role words outside the card: ${m.roleWordsOutsideCard}`,
];
// At enlarged text the card scrolls inside itself: everything on the board must be reachable
// by scrolling it, and nothing may be cut off sideways. Something taller than the card cannot
// be seen whole, so its top and its bottom must each be reachable. (No comments inside the
// page scripts: they are strings, and would survive the comment stripping checked for dev files.)
const REACH = `(() => {
  const sheet = document.querySelector('.ms-private[data-open="true"]');
  if (!sheet) return ['no card'];
  const start = sheet.scrollTop, missed = [];
  for (const node of [...document.querySelectorAll('.phone-investigation__player'), document.querySelector('.phone-investigation__roles')]) {
    const s = sheet.getBoundingClientRect();
    node.scrollIntoView({ block: 'start' });
    const top = node.getBoundingClientRect();
    node.scrollIntoView({ block: 'end' });
    const bottom = node.getBoundingClientRect();
    if (top.top < s.top - 0.5 || bottom.bottom > s.bottom + 0.5 || top.left < s.left - 0.5 || top.right > s.right + 0.5) missed.push(node.className);
  }
  sheet.scrollTop = start;
  return missed;
})()`;
const enlarged = (m, missed) => [
  !m.boardOpen && 'board not open',
  m.players.length !== 3 && `${m.players.length} players`,
  missed.length > 0 && `not reachable by scrolling the card: ${missed.join(', ')}`,
  JSON.stringify(m.roles) !== JSON.stringify(['Undercover', 'Alien', 'Cracker']) && `roles ${m.roles}`,
];
const cleared = m => [
  m.players.length > 0 && 'players still drawn',
  m.sentence && 'the set still written',
];

for (const [size, fontSize, tag] of [[[320, 568], null, '320x568'], [[390, 844], null, '390x844'], [[320, 568], 32, '320x568-text'], [[390, 844], 32, '390x844-text']]) {
  const page = await open('insider', size, { fontSize });
  await page.tap('#ms-private-toggle');
  await page.waitFor("document.querySelector('#phone-investigation-toggle')", 'the board toggle in the card', 5000);
  await step(page, `${tag}-card`, size, { expect: m => [m.toggle?.expanded !== 'false' && 'toggle open by itself', m.boardOpen && 'board open by itself', m.sentence && 'the set written in the card'] });
  await page.tap('#phone-investigation-toggle');
  await page.waitFor("document.querySelectorAll('.phone-investigation__player').length === 3", 'the board', 5000);
  if (fontSize === null) await step(page, `${tag}-board`, size, { expect: m => [...opened(m), m.focus !== 'phone-investigation-heading' && `focus on ${m.focus}`] });
  else {
    const missed = await page.evaluate(REACH);
    await step(page, `${tag}-board`, size, { expect: m => [...enlarged(m, missed), m.focus !== 'phone-investigation-heading' && `focus on ${m.focus}`] });
  }
  if (fontSize === null) {
    // Escape closes the board, back to its toggle.
    await page.press('Escape');
    await step(page, `${tag}-escape`, size, { shot: false, expect: m => [...cleared(m), m.focus !== 'phone-investigation-toggle' && `focus on ${m.focus}`, m.toggle?.expanded !== 'false' && 'toggle still expanded'] });
    // Losing focus closes the card, and with it the board; opening the card again does not reopen the board.
    await page.tap('#phone-investigation-toggle');
    await page.waitFor("document.querySelectorAll('.phone-investigation__player').length === 3", 'the board again', 5000);
    await page.evaluate("window.dispatchEvent(new Event('blur'))");
    await step(page, `${tag}-blurred`, size, { expect: m => [...cleared(m), m.sheetOpen && 'card still open', m.hooks && 'board hooks still in the page'] });
    await page.tap('#ms-private-toggle');
    await page.waitFor("document.querySelector('#phone-investigation-toggle')", 'the board toggle again', 5000);
    await step(page, `${tag}-reopened-card`, size, { shot: false, expect: m => [...cleared(m), m.toggle?.expanded !== 'false' && 'the board reopened by itself'] });
    // A view the server no longer confirms: no board and no toggle.
    await page.tap('#phone-investigation-toggle');
    await page.waitFor("document.querySelectorAll('.phone-investigation__player').length === 3", 'the board before the stale view', 5000);
    await page.evaluate('window.__simulation.stale()');
    await step(page, `${tag}-stale`, size, { expect: m => [...cleared(m), m.toggle !== null && 'toggle still offered on a stale view'] });
  }
  await page.close();
}

// Twelve-character names on a 320 px phone: each plate stays inside its player's column.
{
  const size = [320, 568];
  const page = await open('insider-long-names', size);
  await page.tap('#ms-private-toggle');
  await page.waitFor("document.querySelector('#phone-investigation-toggle')", 'the board toggle', 5000);
  await page.tap('#phone-investigation-toggle');
  await page.waitFor("document.querySelectorAll('.phone-investigation__player').length === 3", 'the board', 5000);
  const overflow = await page.evaluate(`[...document.querySelectorAll('.phone-investigation__player')].some(player => [...player.querySelectorAll('*')].some(node => node.scrollWidth > node.clientWidth + 1 && getComputedStyle(node).overflow === 'visible'))`);
  await step(page, '320x568-long-names-board', size, { expect: m => [...opened(m), overflow && 'a name overflows its column'] });
  await page.close();
}

// The shared display: built from the public view, it has no board, no toggle and no role words.
{
  const size = [1280, 720];
  const page = await open('insider', size, { query: '&as=display' });
  await step(page, 'display', size, { expect: m => [m.hooks && 'board hooks on the display', m.sentence && 'the set on the display', m.roleWordsOutsideCard.length > 0 && `role words: ${m.roleWordsOutsideCard}`] });
  await page.close();
}

await writeFile(join(output, 'facts.json'), `${JSON.stringify(facts, null, 2)}\n`);
await writeFile(join(output, 'capture-log.txt'), `${lines.join('\n')}\n`);
const failed = facts.filter(fact => fact.problems.length > 0).length;
note('done', output, `${facts.length} steps, ${failed} with problems`);
await browser.close();
await browserProcess.close();
process.exitCode = failed > 0 ? 1 : 0;
