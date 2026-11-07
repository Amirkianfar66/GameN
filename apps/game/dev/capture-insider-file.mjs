// mothership:dev-only
//
// Evidence for the Insider's file (the Designer's ability art abilities-0.1.0, PR #102 at
// 1453500) in the board simulation (dev/board/: the release's own screen, controller, host,
// styles and art over synthetic, schema-checked views). The file is opened, assembled, inspected,
// shown on the board, put back with Escape, hidden by losing focus and by a view the server no
// longer confirms (which keeps the card, the file at rest), drawn at doubled text, with reduced
// motion and without the kit, and looked for on other roles' cards and on the shared display. Each step is measured against the
// Designer's checks and photographed. This is browser simulation: it proves nothing about real
// devices, the backend or multiplayer behavior.
//
// With `npx vite --config apps/game/dev/board/vite.config.mjs` running (port 5178):
//   CHROME_PATH=/path/to/chrome node apps/game/dev/capture-insider-file.mjs <output-directory>
// A browser run as root also needs --no-sandbox: point CHROME_PATH at a wrapper that adds it.

import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { connect, launchBrowser, openPage, sleep } from './capture/browser.mjs';

// A statement, not only a comment: it survives bundling and comment stripping, so the
// production-exclusion check finds this module wherever it ends up.
globalThis[Symbol.for('mothership:dev-only')] = true;

const BASE = process.env.MOTHERSHIP_BOARD_URL ?? 'http://127.0.0.1:5178/';
const ROLES = ['Undercover', 'Alien', 'Cracker'];
const ROLE_SET = 'Their roles, one each: Undercover, Alien and Cracker. Which of them holds which is not known.';
const output = resolve(process.argv[2] ?? 'insider-file-evidence');
await mkdir(output, { recursive: true });
const facts = [];
const lines = [];
const note = (...parts) => { const line = `${new Date().toISOString().slice(11, 19)} ${parts.join(' ')}`.trimEnd(); lines.push(line); console.log(line); };

const browserProcess = await launchBrowser();
const browser = await connect(browserProcess.endpoint);

// What a step measures. No comments inside: page scripts are strings, and a comment would survive
// the comment stripping checked for development files.
const READ = `(() => {
  const box = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const round = b => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, Math.round(v)]));
  const inside = (a, b) => a.x >= b.x - 0.5 && a.y >= b.y - 0.5 && a.x + a.w <= b.x + b.w + 0.5 && a.y + a.h <= b.y + b.h + 0.5;
  const drawn = node => Boolean(node) && getComputedStyle(node).display !== 'none' && node.getClientRects().length > 0;
  const sheet = document.querySelector('.ms-private[data-open="true"]');
  const head = sheet?.querySelector('.phone-panel-head');
  const shown = sheet ? (() => { const r = sheet.getBoundingClientRect(); const top = Math.max(r.y + sheet.clientTop, head ? head.getBoundingClientRect().bottom : 0); return { x: r.x + sheet.clientLeft, y: top, w: sheet.clientWidth, h: r.y + sheet.clientTop + sheet.clientHeight - top }; })() : null;
  const file = document.querySelector('.ab-file');
  const photos = [...document.querySelectorAll('.ab-photo')];
  const roles = document.querySelector('.ab-roles');
  const app = document.getElementById('app');
  const text = app ? app.innerText : '';
  const card = document.querySelector('.ms-private');
  const words = ${JSON.stringify(['Insider', ...ROLES])};
  const art = (document.documentElement.dataset.art ?? '').split(' ').filter(Boolean);
  const kitRequests = performance.getEntriesByType('resource').filter(entry => /abilities\.art\./.test(entry.name)).length;
  const running = document.getAnimations().filter(a => a.playState === 'running' && a.effect?.target instanceof Element && a.effect.target.closest('.ab-file')).length;
  const controls = [...(file?.querySelectorAll('button') ?? [])].filter(drawn).map(button => ({ id: button.id || button.className, ...round(box(button)) }));
  return {
    viewport: [innerWidth, innerHeight],
    pageScrolls: document.scrollingElement.scrollHeight > innerHeight + 0.5,
    pageOverflowsSideways: document.scrollingElement.scrollWidth > innerWidth + 0.5,
    sheetOpen: Boolean(sheet), sheetScroll: sheet ? { top: Math.round(sheet.scrollTop), height: sheet.scrollHeight, client: sheet.clientHeight } : null,
    sheetOverflowsSideways: sheet ? sheet.scrollWidth > sheet.clientWidth + 0.5 && !['hidden', 'clip'].includes(getComputedStyle(sheet).overflowX) : null,
    sheetClipsSideways: sheet ? Math.max(0, Math.round(sheet.scrollWidth - sheet.clientWidth)) : null,
    art, kitRequests, running,
    file: file ? round(box(file)) : null,
    fileShown: file && shown ? inside(box(file), shown) : null,
    thread: Boolean(file?.querySelector(':scope > .ab-thread path[d^="M"]')),
    photos: photos.map(photo => ({
      seat: photo.dataset.seat, label: photo.getAttribute('aria-label'), pressed: photo.getAttribute('aria-pressed'),
      shape: [...photo.querySelectorAll('*')].map(node => node.className).join('|'),
      pairing: ['aria-describedby', 'aria-labelledby', 'aria-controls', 'aria-owns'].filter(name => photo.hasAttribute(name) || photo.querySelector('[' + name + ']')),
      roleWord: words.some(word => photo.textContent.includes(word) || (photo.getAttribute('aria-label') ?? '').includes(word)),
      number: [...photo.querySelectorAll('.ab-photo__seat, .ab-photo__numeral, .ab-photo__caption-seat')].some(node => drawn(node) && node.textContent === photo.dataset.seat),
      name: (() => { const node = photo.querySelector('.ab-photo__name'); return node ? { text: node.textContent, cut: node.scrollWidth > node.clientWidth + 0.5, ellipsis: getComputedStyle(node).textOverflow === 'ellipsis' } : null; })(),
      transform: getComputedStyle(photo).transform,
      layout: [photo.offsetWidth, photo.offsetHeight].join('x'),
      frame: (() => { const frame = photo.querySelector('.ab-photo__frame'); return frame ? [frame.offsetWidth, frame.offsetHeight].join('x') : null; })(),
      ...round(box(photo)),
    })),
    roleGroups: [...(file?.querySelectorAll('[role="img"]') ?? [])].map(node => node.getAttribute('aria-label')),
    roleNames: [...document.querySelectorAll('.ab-roles__name')].map(node => node.textContent),
    rolesBelowPhotos: roles && photos.length ? box(roles).y >= Math.max(...photos.map(photo => { const b = box(photo.querySelector('.ab-photo__frame') ?? photo); return b.y + b.h; })) - 0.5 : null,
    rolesShown: roles && shown ? inside(box(roles), shown) : null,
    inspect: (() => {
      const node = document.querySelector('.ab-inspect__card:not([hidden])');
      if (!node) return null;
      const b = box(node);
      const seen = shown ? inside(b, shown) || (b.h > shown.h && Math.abs(b.y - shown.y) <= 8) : false;
      return { text: node.innerText.replace(/\\s+/g, ' ').trim(), shown: seen };
    })(),
    controls,
    focus: document.activeElement?.id || null,
    folder: Boolean(document.querySelector('.ab-folder')),
    outOfDate: Boolean(document.getElementById('ms-banner-connection')),
    headUnderBanner: (() => {
      const banner = document.getElementById('ms-banner-connection');
      if (!banner || !head) return null;
      const b = banner.getBoundingClientRect(), h = head.getBoundingClientRect();
      return b.bottom > h.top + 0.5 && b.top < h.bottom - 0.5;
    })(),
    roleCard: Boolean(document.querySelector('.ms-role-card')),
    hideReachable: (() => {
      const close = sheet?.querySelector('#phone-private-close');
      if (!close) return null;
      const b = close.getBoundingClientRect();
      const top = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return b.width >= 44 - 0.01 && b.height >= 44 - 0.01 && b.top >= -0.5 && b.bottom <= innerHeight + 0.5 && (top === close || close.contains(top));
    })(),
    spot: [...document.querySelectorAll('.ms-board[data-board="own"] .ms-seat[data-spot]')].map(node => node.dataset.seat),
    sentence: text.includes('hold the roles'),
    roleWordsOutsideCard: words.filter(word => text.replace(card ? card.innerText : '', '').includes(word)),
    roleWordsInPage: words.filter(word => text.includes(word)),
    hooks: app ? app.innerHTML.includes('ab-file') : false,
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
  const problems = [
    size[0] < 600 && measured.pageScrolls && 'page scrolls', measured.pageOverflowsSideways && 'sideways overflow',
    measured.sheetOverflowsSideways && 'the card scrolls sideways',
    measured.sheetOpen && measured.hideReachable !== true && 'hide control is not reachable',
    ...measured.controls.filter(control => control.h < 44 - 0.01).map(control => `control ${control.id} under 44 px (${control.h})`),
    measured.roleWordsOutsideCard.length > 0 && `role words outside the card: ${measured.roleWordsOutsideCard}`,
    ...expect(measured),
  ].filter(Boolean);
  facts.push({ name, size, ...measured, problems });
  if (shot) await page.screenshot(join(output, `${name}.png`), { viewport: true });
  note(name, size.join('x'), problems.length ? `PROBLEMS: ${problems.join('; ')}` : 'clean');
  return measured;
}

/** The Designer's checks of a drawn file (docs/design/abilities-handoff.md, section 11). */
const fileChecks = (m, { seats = ['1', '2', '4'], fits = true } = {}) => [
  !m.file && 'no file',
  JSON.stringify(m.photos.map(photo => photo.seat)) !== JSON.stringify(seats) && `snapshots ${m.photos.map(photo => photo.seat)}, not in seat order ${seats}`,
  new Set(m.photos.map(photo => photo.shape)).size !== 1 && 'the snapshots are not built alike',
  new Set(m.photos.map(photo => photo.frame)).size > 1 && `the snapshots' frames differ in size: ${m.photos.map(photo => photo.frame)}`,
  fits && new Set(m.photos.map(photo => photo.layout)).size > 1 && `the snapshots differ in size: ${m.photos.map(photo => photo.layout)}`,
  m.photos.some(photo => photo.roleWord) && 'a role word on a snapshot or in its name',
  m.photos.some(photo => photo.pairing.length > 0) && 'a snapshot points somewhere',
  m.photos.some(photo => !photo.number) && 'a snapshot does not show its seat number',
  JSON.stringify(m.roleGroups) !== JSON.stringify([ROLE_SET]) && `role groups: ${JSON.stringify(m.roleGroups)}`,
  JSON.stringify(m.roleNames) !== JSON.stringify(ROLES) && `role names ${m.roleNames}`,
  m.rolesBelowPhotos !== true && 'the roles are not below every snapshot',
  !m.thread && 'no string drawn',
  fits && m.fileShown !== true && 'the file is not wholly in view in the card',
  !m.art.includes('public-board') && 'no crew cards',
];

for (const size of [[320, 568], [390, 844]]) {
  const tag = size.join('x');
  const page = await open('insider', size);
  await step(page, `${tag}-board`, size, { shot: false, expect: m => [!m.art.includes('abilities') && 'kit not loaded', m.kitRequests !== 1 && `kit requested ${m.kitRequests} times`, m.hooks && 'file hooks before the card is opened', m.sentence && 'the set written'] });
  await page.tap('#ms-private-toggle');
  await page.waitFor("document.querySelector('.ab-file')", 'the file in the card', 5000);
  await step(page, `${tag}-assembling`, size, { settle: 150, expect: m => [m.running === 0 && 'the file did not assemble'] });
  await step(page, `${tag}-file`, size, { settle: 1100, expect: m => [...fileChecks(m), m.running > 0 && `${m.running} animations still running`, m.focus !== 'ms-private-heading' && `focus on ${m.focus}`, m.kitRequests !== 1 && `kit requested ${m.kitRequests} times`] });
  await page.tap('.ab-photo[data-seat="2"]');
  await step(page, `${tag}-inspect`, size, { expect: m => [
    JSON.stringify(m.photos.map(photo => photo.pressed)) !== JSON.stringify(['false', 'true', 'false']) && 'snapshot 2 is not the one pressed',
    !m.inspect && 'no inspect card', m.inspect && !m.inspect.shown && 'the inspect card is not in view', m.inspect && !/Room|Command|Hospital|Jail/.test(m.inspect.text) && `inspect says ${m.inspect?.text}`,
    m.inspect && m.inspect.text.split(' ').some(word => ROLES.includes(word.replace(/\W/g, ''))) && 'a role word in the inspect card',
    m.focus !== 'ab-photo-2' && `focus on ${m.focus}`] });
  await page.press('Escape');
  await step(page, `${tag}-escape`, size, { shot: false, expect: m => [m.photos.some(photo => photo.pressed !== 'false') && 'a snapshot still pressed', m.inspect && 'inspect card still shown', m.focus !== 'ab-photo-2' && `focus on ${m.focus}`] });
  await page.tap('.ab-photo[data-seat="4"]');
  await sleep(250);
  await page.tap('[data-file-act="show"]');
  await step(page, `${tag}-show-on-board`, size, { settle: 250, expect: m => [m.sheetOpen && 'the card is still open', m.hooks && 'file hooks still in the page', JSON.stringify(m.spot) !== JSON.stringify(['seat-4']) && `ringed: ${m.spot}`, m.focus !== 'ms-private-toggle' && `focus on ${m.focus}`] });
  await step(page, `${tag}-ring-over`, size, { shot: false, settle: 1700, expect: m => [m.spot.length > 0 && 'still ringed after 1.6 s'] });
  await page.tap('#ms-private-toggle');
  await page.waitFor("document.querySelector('.ab-file')", 'the file again', 5000);
  await step(page, `${tag}-reopened`, size, { shot: false, settle: 80, expect: m => [m.running > 0 && 'the file assembled again', ...fileChecks(m)] });
  // Losing focus closes the card, and with it the file.
  await page.evaluate("window.dispatchEvent(new Event('blur'))");
  await step(page, `${tag}-blurred`, size, { shot: false, expect: m => [m.sheetOpen && 'card still open', m.hooks && 'file hooks still in the page', m.roleWordsInPage.length > 0 && `role words in the page: ${m.roleWordsInPage}`] });
  // Current-view loss removes private DOM. Recovery does not reopen it by itself.
  await page.tap('#ms-private-toggle');
  await page.waitFor("document.querySelector('.ab-file')", 'the file before the stale view', 5000);
  await page.tap('.ab-photo[data-seat="1"]');
  await sleep(250);
  await page.evaluate('window.__simulation.stale()');
  await step(page, `${tag}-stale`, size, { expect: m => [!m.outOfDate && 'no out-of-date banner', m.roleCard && 'role card on a stale view',
    m.hooks && 'private file remains', m.sheetOpen && 'private sheet stays open', m.running > 0 && 'private motion remains', m.roleWordsInPage.length > 0 && 'private role words remain'] });
  await page.evaluate('window.__simulation.redeliver()');
  await step(page, `${tag}-live-again`, size, { shot: false, settle: 500, expect: m => [m.sheetOpen && 'private sheet reopened', m.hooks && 'file reopened automatically'] });
  await page.tap('#ms-private-toggle');
  await step(page, `${tag}-deliberate-reopen`, size, { shot: false, expect: m => [...fileChecks(m), m.running > 0 && 'the file assembled again after recovery'] });
  await page.close();
}

// Doubled reader text: the file reflows to one column inside the card, which scrolls. Everything
// must be reachable by scrolling it, nothing cut sideways, and no name shortened.
const REACH = `(() => {
  const sheet = document.querySelector('.ms-private[data-open="true"]');
  if (!sheet) return ['no card'];
  const start = sheet.scrollTop, missed = [];
  for (const node of [...document.querySelectorAll('.ab-photo'), document.querySelector('.ab-roles'), document.querySelector('.ab-file__note')]) {
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
for (const [size, scenario, tag] of [[[320, 568], 'insider', '320x568-text'], [[390, 844], 'insider', '390x844-text'], [[320, 568], 'insider-long-names', '320x568-text-long-names']]) {
  const page = await open(scenario, size, { fontSize: 32 });
  await page.tap('#ms-private-toggle');
  await page.waitFor("document.querySelector('.ab-file')", 'the file in the card', 5000);
  await sleep(1100);
  const missed = await page.evaluate(REACH);
  await step(page, `${tag}-file`, size, { expect: m => [...fileChecks(m, { fits: false }), missed.length > 0 && `not reachable by scrolling the card: ${missed.join(', ')}`, m.photos.some(photo => photo.name?.cut) && 'a name is cut at large text'] });
  await page.tap('.ab-photo[data-seat="2"]');
  await step(page, `${tag}-inspect`, size, { expect: m => [!m.inspect && 'no inspect card', m.inspect && !m.inspect.shown && 'the inspect card is not in view', m.focus !== 'ab-photo-2' && `focus on ${m.focus}`] });
  await page.close();
}

// Twelve-character names on the smallest phone: shortened only with an ellipsis, and said whole by the button.
{
  const size = [320, 568];
  const page = await open('insider-long-names', size);
  await page.tap('#ms-private-toggle');
  await page.waitFor("document.querySelector('.ab-file')", 'the file in the card', 5000);
  await step(page, '320x568-long-names', size, { settle: 1200, expect: m => [...fileChecks(m),
    m.photos.some(photo => photo.name?.cut && !photo.name.ellipsis) && 'a name is cut without an ellipsis',
    m.photos.some(photo => photo.name && !photo.label.includes(photo.name.text)) && 'a button does not say its whole name'] });
  await page.tap('.ab-photo[data-seat="1"]');
  await step(page, '320x568-long-names-inspect', size, { expect: m => [!m.inspect && 'no inspect card', m.inspect && !m.inspect.text.includes(m.photos[0].name.text) && 'the inspect card does not say the whole name'] });
  await page.close();
}

// Reduced motion: the file appears at rest with an 80 ms fade, and an inspected snapshot is ringed, not lifted.
{
  const size = [390, 844];
  const page = await open('insider', size, { query: '&motion=reduced' });
  await page.tap('#ms-private-toggle');
  await page.waitFor("document.querySelector('.ab-file')", 'the file in the card', 5000);
  await step(page, '390x844-reduced-opening', size, { shot: false, settle: 20, expect: m => [m.running > 1 && `${m.running} animations: more than the fade`] });
  await page.tap('.ab-photo[data-seat="2"]');
  await step(page, '390x844-reduced-inspect', size, { expect: m => [m.photos[1]?.transform !== 'none' && `the inspected snapshot moved: ${m.photos[1]?.transform}`, !m.inspect && 'no inspect card'] });
  await page.close();
}

// Without the kit (the hosted build until Integration adopts it): the file is complete in paper, ink and words.
for (const size of [[320, 568], [390, 844]]) {
  const tag = size.join('x');
  const page = await open('insider', size, { query: '&kit=off' });
  await page.tap('#ms-private-toggle');
  await page.waitFor("document.querySelector('.ab-file')", 'the file in the card', 5000);
  await step(page, `${tag}-no-kit`, size, { settle: 1200, expect: m => [...fileChecks(m), m.art.includes('abilities') && 'kit loaded', m.kitRequests !== 0 && 'kit requested'] });
  await page.close();
}

// Other roles: the same kit arrives on every player phone, and staleness conceals their cards.
for (const [scenario, role] of [['seven', 'Cracker'], ['disable', 'Red Disabler'], ['tray', 'Hacker']]) {
  const size = [390, 844];
  const page = await open(scenario, size);
  await page.tap('#ms-private-toggle');
  await page.waitFor("document.querySelector('.ms-private[data-open=\"true\"] .ms-role-card')", 'the card', 5000);
  await step(page, `390x844-${scenario}-card`, size, { shot: false, expect: m => [m.hooks && `a file on the ${role}'s card`, !m.art.includes('abilities') && 'kit not loaded', m.kitRequests !== 1 && `kit requested ${m.kitRequests} times`] });
  await page.evaluate('window.__simulation.stale()');
  await step(page, `390x844-${scenario}-stale`, size, { shot: scenario === 'seven', expect: m => [!m.outOfDate && 'no out-of-date banner', m.roleCard && 'role card on a stale view', m.hooks && `a file on the ${role}'s card`, m.folder && 'a folder'] });
  await page.close();
}

// The shared display: built from the public view, it loads no kit and has no file and no role words.
{
  const size = [1280, 720];
  const page = await open('insider', size, { query: '&as=display' });
  await step(page, 'display', size, { expect: m => [m.hooks && 'file hooks on the display', m.sentence && 'the set on the display', m.art.includes('abilities') && 'kit loaded on the display', m.kitRequests !== 0 && 'kit requested by the display', m.roleWordsInPage.length > 0 && `role words: ${m.roleWordsInPage}`] });
  await page.close();
}

await writeFile(join(output, 'facts.json'), `${JSON.stringify(facts, null, 2)}\n`);
await writeFile(join(output, 'capture-log.txt'), `${lines.join('\n')}\n`);
const failed = facts.filter(fact => fact.problems.length > 0).length;
note('done', output, `${facts.length} steps, ${failed} with problems`);
await browser.close();
await browserProcess.close();
process.exitCode = failed > 0 ? 1 : 0;
