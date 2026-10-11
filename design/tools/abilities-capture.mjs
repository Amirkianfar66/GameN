// mothership:dev-only
//
// Review pictures of the ability treatments, measured as they are taken, into design/abilities/review/.
// The Insider's file on the board-motion phone: at 320 x 568 and 390 x 844, at rest, inspecting,
// with twelve-character names, shown on the board, reduced motion, twice the default text size,
// without its art, hidden, and the frames of its assembly; then one contact sheet. Each picture is
// measured in the page: the three snapshots alike and in seat order, each with its seat number,
// nothing of a role in a snapshot, the three role names one group below the three, nothing wider
// than the phone, no scrolling at the default text size, controls at least 44 px, names cut only
// with an ellipsis and said whole, never cut at large text, nothing private while hidden.
// Desktop Chromium with simulated viewports: not a device measurement.
//
//   node design/tools/abilities-capture.mjs

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { abilitiesInputsSha256 } from './lib/abilities-inputs.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const OUT = 'design/abilities/review';
const PHONES = { w390: { width: 390, height: 844 }, w320: { width: 320, height: 568 } };
const SCALE = 1.5;
const FRAMES = [0, 120, 260, 420, 600, 780, 1020];

/** In the page: what the open file shows, measured. Returns the problems found. */
const MEASURE = `(() => {
  const problems = [];
  const sheet = document.querySelector('#bm-card, .bm-sheet:not([hidden])');
  const file = document.querySelector('.ab-file');
  const phone = document.querySelector('.bm-app');
  if (phone && phone.scrollWidth > phone.clientWidth + 1) problems.push('the phone is wider than its screen');
  // The tape on the file's corners may lie over the card's edge; the card itself never scrolls sideways.
  if (sheet && sheet.scrollWidth > sheet.clientWidth + 1) problems.push('the card scrolls sideways: ' + (sheet.scrollWidth - sheet.clientWidth) + ' px');
  if (file) {
    const photos = [...file.querySelectorAll('.ab-photo')];
    if (photos.length !== 3) problems.push(photos.length + ' snapshots, not three');
    const seats = photos.map(photo => Number(photo.dataset.seat));
    if (seats.join() !== [...seats].sort((a, b) => a - b).join()) problems.push('the snapshots are not in seat order');
    const resting = photos.filter(photo => photo.getAttribute('aria-pressed') !== 'true');
    // Sizes as laid out, before each position's fixed tilt.
    const sizes = resting.map(photo => photo.querySelector('.ab-photo__frame')).map(frame => frame.offsetWidth + 'x' + frame.offsetHeight);
    if (new Set(sizes).size > 1) problems.push('the snapshots are not drawn alike: ' + sizes.join(', '));
    const shape = photo => [...photo.querySelectorAll('*')].map(node => node.className + '|' + (node.getAttribute('aria-hidden') ?? '')).join(';');
    if (new Set(resting.map(shape)).size > 1) problems.push('the snapshots are not built alike');
    for (const photo of photos) {
      const words = (photo.textContent + ' ' + (photo.getAttribute('aria-label') ?? '')).toLowerCase();
      if (/undercover|alien|cracker/.test(words)) problems.push('a snapshot names a role');
      for (const attribute of ['aria-describedby', 'aria-labelledby', 'aria-controls', 'aria-owns']) if (photo.hasAttribute(attribute)) problems.push('a snapshot points at something with ' + attribute);
      if (photo.getBoundingClientRect().height < 44 || photo.getBoundingClientRect().width < 44) problems.push('a snapshot is smaller than 44 px to press');
    }
    const groups = file.querySelectorAll('.ab-roles');
    if (groups.length !== 1) problems.push(groups.length + ' groups of role names, not one');
    const group = groups[0];
    if (group && (group.getAttribute('role') !== 'img' || !/Undercover, Alien and Cracker/.test(group.getAttribute('aria-label') ?? ''))) problems.push('the role names are not one picture with one accessible name');
    if (group && group.querySelectorAll('.ab-roles__name').length !== 3) problems.push('the slip does not hold the three names');
    for (const button of file.querySelectorAll('.ab-button')) { const box = button.getBoundingClientRect(); if (box.height < 44) problems.push('a control is shorter than 44 px'); }
    for (const node of file.querySelectorAll('.ab-roles__name, .ab-file__note, .ab-file__title, .ab-inspect__name')) {
      if (node.scrollWidth > node.clientWidth + 1) problems.push('words are cut off: ' + node.textContent.trim());
    }
    // A name too long for a small snapshot may end in an ellipsis there, marked, and only while the button
    // says it whole; at large text the name is never cut.
    const largeText = parseFloat(getComputedStyle(document.documentElement).fontSize) >= 20;
    for (const photo of photos) {
      const name = photo.querySelector('.ab-photo__name');
      if (!name || name.scrollWidth <= name.clientWidth + 1) continue;
      if (largeText) problems.push('at large text a name is cut off: ' + name.textContent);
      else if (getComputedStyle(name).textOverflow !== 'ellipsis') problems.push('a name is cut off without an ellipsis: ' + name.textContent);
      if (!(photo.getAttribute('aria-label') ?? '').includes(name.textContent)) problems.push('a cut name is not said whole by its button: ' + name.textContent);
    }
    // Every snapshot shows its seat number: the sticker or the caption's number, or without portraits the window's numeral.
    for (const photo of photos) {
      const seat = [...photo.querySelectorAll('.ab-seat, .ab-photo__numeral')].find(node => node.getClientRects().length && getComputedStyle(node).display !== 'none');
      if (!seat || seat.textContent.trim() !== photo.dataset.seat) problems.push('Player ' + photo.dataset.seat + ' has no seat number on the snapshot');
    }
    // The role names stand below all three snapshots, beside none of them.
    if (group && !file.dataset.inspect) {
      const top = group.querySelector('.ab-roles__slip').getBoundingClientRect().top;
      const lowest = Math.max(...photos.map(photo => photo.getBoundingClientRect().bottom));
      if (top < lowest - 1) problems.push('the role names stand beside a snapshot, not below the three');
    }
    // At the default text size the file fits the card: nothing to scroll, the open inspect card included.
    if (!largeText && sheet && sheet.scrollHeight > sheet.clientHeight + 1) problems.push('the card scrolls: ' + (sheet.scrollHeight - sheet.clientHeight) + ' px more than it shows');
    const card = file.querySelector('.ab-inspect:not([hidden])');
    if (card && sheet) {
      const box = card.getBoundingClientRect(), view = sheet.getBoundingClientRect();
      if (box.bottom > view.bottom + 1 || box.top < view.top - 1) problems.push('the inspect card is not in view');
    }
  }
  if (sheet && !file && !document.querySelector('.ab-folder') && /Insider/.test(sheet.textContent)) problems.push('the sheet shows the role without its file');
  return problems;
})()`;
/** In the page: a hidden card holds nothing private. With folder, the card is open on the closed folder; without, it is closed. */
const hidden = ({ folder }) => `(() => {
  const problems = [];
  if (document.querySelector('.ab-file')) problems.push('the private file is in the page while the card is hidden');
  const text = document.querySelector('.bm-app')?.innerText ?? '';
  if (/Insider|Undercover|Cracker|One each|Classified|Blue team|Red team/.test(text)) problems.push('a private word is in the page while the card is hidden');
  const shown = document.querySelector('#bm-card:not([hidden]) .ab-folder');
  if (${folder} && !shown) problems.push('no closed folder in the card');
  if (!${folder} && !document.querySelector('#bm-card')?.hidden) problems.push('the card stayed open');
  return problems;
})()`;
/** In the page: the file is back, at rest: it does not assemble again. */
const REOPENED = `(() => {
  const problems = ${MEASURE};
  if (!document.querySelector('.ab-file')) problems.push('the file did not open again');
  const moving = document.getAnimations().filter(animation => animation.effect?.target?.closest?.('.ab-file') && animation.playState === 'running');
  if (moving.length) problems.push('the file assembles again: ' + moving.length + ' animations');
  return problems;
})()`;

const shots = [];
async function shoot(browser, server, { name, title, group, phone, path, scale = SCALE, before = null, measure = MEASURE, block = [], selector = null, wait = 1300 }) {
  const page = await openPage(browser, { ...PHONES[phone], scale, mobile: true });
  if (block.length) await page.block(block);
  await page.goto(`${server.origin}/board-motion/index.html${path}`, 'document.readyState === "complete" && window.__designReady === true');
  await page.evaluate(`new Promise(done => setTimeout(done, ${wait}))`);
  if (before) { await page.evaluate(before); await page.evaluate('new Promise(done => setTimeout(done, 450))'); }
  const problems = await page.evaluate(measure);
  const file = `${OUT}/${name}.png`;
  const size = await page.screenshot(resolve(repoRoot, file), { selector, viewport: selector === null });
  for (const problem of page.problems()) problems.push(`page: ${problem}`);
  shots.push({ name, title, group, file, phone, size: `${size.width}x${size.height}`, problems });
  console.log(`${problems.length ? 'FAIL ' : 'ok   '} ${name}${problems.length ? `: ${problems.join('; ')}` : ''}`);
  await page.close();
}

await rm(resolve(repoRoot, OUT), { recursive: true, force: true });
await mkdir(resolve(repoRoot, OUT), { recursive: true });
const server = await startStaticServer();
const chrome = await launchBrowser();
const large = await launchBrowser({ defaultFontPx: 32 });
let browserName = '';
try {
  const browser = await connect(chrome.endpoint);
  const big = await connect(large.endpoint);
  browserName = (await browser.send('Browser.getVersion')).product;
  const INSPECT = "document.querySelectorAll('.ab-photo')[1].click()";
  const LAST = "document.querySelectorAll('.ab-photo')[2].click()";
  const SHOW = "document.querySelectorAll('.ab-photo')[1].click(); await new Promise(done => setTimeout(done, 260)); document.querySelector('[data-file-act=\"show\"]').click()";
  const BACKGROUND = "Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange'))";
  for (const phone of ['w390', 'w320']) {
    const px = PHONES[phone];
    await shoot(browser, server, { name: `insider-${phone}-rest`, title: `The file at rest, ${px.width} x ${px.height}`, group: 'The Insider\'s file', phone, path: '?scenario=file.insider&chrome=0' });
    await shoot(browser, server, { name: `insider-${phone}-inspect`, title: `Inspecting Player 5, ${px.width} x ${px.height}`, group: 'The Insider\'s file', phone, path: '?scenario=file.insider&chrome=0', before: INSPECT });
    await shoot(browser, server, { name: `insider-${phone}-long-names`, title: `Twelve-character names, ${px.width} x ${px.height}`, group: 'The Insider\'s file', phone, path: '?scenario=file.insider&chrome=0&names=long' });
    await shoot(browser, server, { name: `insider-${phone}-long-inspect`, title: `A long name inspected, ${px.width} x ${px.height}`, group: 'The Insider\'s file', phone, path: '?scenario=file.insider&chrome=0&names=long', before: LAST });
    await shoot(big, server, { name: `insider-${phone}-text200`, title: `Twice the default text size, ${px.width} x ${px.height}`, group: 'Text size, motion, art', phone, path: '?scenario=file.insider&chrome=0' });
    await shoot(big, server, { name: `insider-${phone}-text200-inspect`, title: `Twice the text size, inspecting, ${px.width} x ${px.height}`, group: 'Text size, motion, art', phone, path: '?scenario=file.insider&chrome=0&names=long', before: LAST });
  }
  const SPOT = `(() => { const problems = []; if (document.querySelector('.ab-file')) problems.push('the file is still in the page on the board');
    const piece = document.querySelector('[data-board="own"] .bm-piece[data-seat="5"]'); if (!piece || !piece.hasAttribute('data-spot')) problems.push('Player 5 is not ringed on the own board');
    if (document.querySelectorAll('[data-spot]').length !== 1) problems.push('more than one character ringed'); return problems; })()`;
  await shoot(browser, server, { name: 'insider-w390-show-on-board', title: 'Show on board: Player 5 ringed on the own board', group: 'The Insider\'s file', phone: 'w390', path: '?scenario=file.insider&chrome=0', before: `(async () => { ${SHOW}; })()`, measure: SPOT });
  await shoot(browser, server, { name: 'insider-w390-reduced', title: 'Reduced motion: at rest, nothing flies', group: 'Text size, motion, art', phone: 'w390', path: '?scenario=file.insider&chrome=0&motion=reduced', before: INSPECT });
  await shoot(browser, server, { name: 'insider-w390-no-art', title: 'Without the ability art or the crew cards', group: 'Text size, motion, art', phone: 'w390', path: '?scenario=file.insider&chrome=0', block: ['*abilities.art.css*', '*public-board.art.*'] });
  const CARD = "document.querySelector('.bm-nav button[data-view=\"card\"]').click()";
  await shoot(browser, server, { name: 'hidden-w390-stale', title: 'Card pressed while the view is out of date: the closed folder', group: 'Hidden', phone: 'w390', path: '?scenario=file.hidden&chrome=0', before: CARD, measure: hidden({ folder: true }) });
  await shoot(browser, server, { name: 'hidden-w320-stale', title: 'The closed folder, 320 x 568', group: 'Hidden', phone: 'w320', path: '?scenario=file.hidden&chrome=0', before: CARD, measure: hidden({ folder: true }) });
  await shoot(browser, server, { name: 'hidden-w390-background', title: 'Back from the background: the board, the card closed', group: 'Hidden', phone: 'w390', path: '?scenario=file.insider&chrome=0', before: BACKGROUND, measure: hidden({ folder: false }) });
  await shoot(browser, server, { name: 'hidden-w390-reopened', title: 'Card pressed again: the file at rest, not assembled again', group: 'Hidden', phone: 'w390', path: '?scenario=file.insider&chrome=0', before: `${BACKGROUND}; ${CARD}`, measure: REOPENED });
  for (const t of FRAMES) {
    await shoot(browser, server, { name: `assembly-${String(t).padStart(4, '0')}ms`, title: `${t} ms`, group: 'Assembly, frame by frame', phone: 'w390', path: `?scenario=file.insider&chrome=0&t=${t}`, selector: '.bm-sheet:not([hidden])', measure: '[]', wait: 200 });
  }
  // The contact sheet: every picture above, with its caption.
  await writeFile(resolve(repoRoot, `${OUT}/report.json`), `${JSON.stringify({ inputsSha256: await abilitiesInputsSha256(), browser: browserName, scale: SCALE, shots }, null, 2)}\n`);
  const page = await openPage(browser, { width: 1500, height: 1000, scale: 1, mobile: false });
  await page.goto(`${server.origin}/abilities/contact.html`, 'window.__designReady === true');
  await page.fitHeight();
  await page.screenshot(resolve(repoRoot, `${OUT}/contact-insider.png`), { selector: '#sheet' });
  for (const problem of page.problems()) shots.push({ name: 'contact', file: `${OUT}/contact-insider.png`, problems: [`page: ${problem}`] });
  await page.close();
  browser.close(); big.close();
} finally {
  await chrome.close(); await large.close(); await server.close();
}
await writeFile(resolve(repoRoot, `${OUT}/report.json`), `${JSON.stringify({ inputsSha256: await abilitiesInputsSha256(), browser: browserName, scale: SCALE, shots }, null, 2)}\n`);
const failed = shots.filter(shot => shot.problems.length);
console.log(`Ability captures: ${shots.length} pictures and a contact sheet, ${failed.length} with problems; ${browserName}`);
process.exitCode = failed.length ? 1 : 0;
