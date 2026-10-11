// mothership:dev-only
//
// Review pictures of the ability treatments, measured as they are taken, into design/abilities/review/,
// on the board-motion phone at 320 x 568 and 390 x 844.
// - Slice 1, the Insider's file: at rest, inspecting, with twelve-character names, shown on the board,
//   reduced motion, twice the default text size, without its art, hidden, and the frames of its assembly.
// - Slice 2, the Hacker's file and the Alien's, the Code card and the Scan in the Hacker's strip: at
//   rest, inspecting, with long names, twice the text size, reduced motion, without art, and the strips
//   while choosing, confirming, sending and registered.
// - Slice 3, the Rescue, the Disable and the Supply: the strips while choosing, confirming and
//   registered, the Cracker's card, the Supplier's and a recipient's slips, at twice the text size, in
//   reduced motion, without art, and the beats frame by frame; the Blue and the Red Disabler's strips
//   compared part for part.
// Then one contact sheet per slice. Each picture is measured in the page: the snapshots alike and in
// seat order, each with its seat number; nothing of a role in a snapshot but the Hacker's own known
// pairing; the Insider's role names one group below the three; a wrong Scan with nothing of the Code;
// the Alien's four in seat order with no numbering but seat numbers; a Code attempt's picks in seat
// order and never numbered on the board; nothing wider than the phone; no scrolling at the default
// text size; controls at least 44 px; names cut only with an ellipsis and said whole, never cut at
// large text; nothing private while hidden; the vials as many as the view's count and nothing of a
// recovery on a Rescue's receipt; the Disable's cell spent only on its receipt; Supply's tags in seat
// order, tied only on the receipt; the slips in the release's words, their tags in seat order, a
// recipient's naming no Supplier. Desktop Chromium with simulated viewports: not a device measurement.
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
const SHEETS = { 1: 'contact-insider.png', 2: 'contact-hacker-alien.png', 3: 'contact-rescue-disable-supply.png' };

/** In the page: what the open file and the strip's ability art show, measured. Returns the problems found. */
const MEASURE = `(() => {
  const problems = [];
  const sheet = document.querySelector('#bm-card:not([hidden])');
  const file = document.querySelector('.ab-file');
  const phone = document.querySelector('.bm-app');
  const largeText = parseFloat(getComputedStyle(document.documentElement).fontSize) >= 20;
  const shown = node => node && node.getClientRects().length > 0 && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden';
  if (phone && phone.scrollWidth > phone.clientWidth + 1) problems.push('the phone is wider than its screen');
  // The tape on the file's corners may lie over the card's edge; the card itself never scrolls sideways.
  if (sheet && sheet.scrollWidth > sheet.clientWidth + 1) problems.push('the card scrolls sideways: ' + (sheet.scrollWidth - sheet.clientWidth) + ' px');
  if (file) {
    const kind = file.dataset.file;
    const photos = [...file.querySelectorAll('.ab-photo')];
    const expected = { insider: 3, hacker: 1, alien: 4 }[kind];
    if (photos.length !== expected) problems.push(photos.length + ' snapshots in the ' + kind + ' file, not ' + expected);
    const seats = photos.map(photo => Number(photo.dataset.seat));
    if (seats.join() !== [...seats].sort((a, b) => a - b).join()) problems.push('the snapshots are not in seat order');
    const resting = photos.filter(photo => photo.getAttribute('aria-pressed') !== 'true');
    // Sizes as laid out, before each position's fixed tilt.
    const sizes = resting.map(photo => photo.querySelector('.ab-photo__frame')).map(frame => frame.offsetWidth + 'x' + frame.offsetHeight);
    if (new Set(sizes).size > 1) problems.push('the snapshots are not drawn alike: ' + sizes.join(', '));
    // Built alike: the same parts, the own seat's mark aside.
    const shape = photo => [...photo.querySelectorAll('*')].filter(node => !node.classList.contains('ab-photo__own')).map(node => node.className + '|' + (node.getAttribute('aria-hidden') ?? '')).join(';');
    if (new Set(resting.map(shape)).size > 1) problems.push('the snapshots are not built alike');
    for (const photo of photos) {
      // The Hacker's one snapshot may carry its known label; nothing else of a role is on any snapshot.
      const tape = photo.querySelector('.ab-photo__tape');
      const words = ((photo.textContent.replace(tape?.textContent ?? '', '')) + ' ' + (photo.getAttribute('aria-label') ?? '')).toLowerCase();
      if (/undercover|alien|cracker|hacker|insider|disabler|supplier|officer/.test(words)) problems.push('a snapshot names a role');
      if (tape && !(kind === 'hacker' && tape.textContent === 'Undercover')) problems.push('a snapshot carries a label it should not');
      for (const attribute of ['aria-describedby', 'aria-labelledby', 'aria-controls', 'aria-owns']) if (photo.hasAttribute(attribute)) problems.push('a snapshot points at something with ' + attribute);
      if (photo.getBoundingClientRect().height < 44 || photo.getBoundingClientRect().width < 44) problems.push('a snapshot is smaller than 44 px to press');
    }
    for (const button of file.querySelectorAll('.ab-button')) { const box = button.getBoundingClientRect(); if (box.height < 44) problems.push('a control is shorter than 44 px'); }
    for (const node of file.querySelectorAll('.ab-roles__name, .ab-file__note, .ab-file__title, .ab-inspect__name, .ab-known__code, .ab-printout__guess, .ab-code-tag')) {
      if (shown(node) && node.scrollWidth > node.clientWidth + 1) problems.push('words are cut off: ' + node.textContent.trim());
    }
    // A name too long for a small snapshot or printout may end in an ellipsis there, marked, and only while the
    // whole name is said elsewhere; at large text a name is never cut.
    for (const photo of photos) {
      const name = photo.querySelector('.ab-photo__name');
      if (!name || name.scrollWidth <= name.clientWidth + 1) continue;
      if (largeText) problems.push('at large text a name is cut off: ' + name.textContent);
      else if (getComputedStyle(name).textOverflow !== 'ellipsis') problems.push('a name is cut off without an ellipsis: ' + name.textContent);
      if (!(photo.getAttribute('aria-label') ?? '').includes(name.textContent)) problems.push('a cut name is not said whole by its button: ' + name.textContent);
    }
    // Every snapshot shows its seat number: the sticker or the caption's number, or without portraits the window's numeral.
    for (const photo of photos) {
      const seat = [...photo.querySelectorAll('.ab-seat, .ab-photo__numeral')].find(shown);
      if (!seat || seat.textContent.trim() !== photo.dataset.seat) problems.push('Player ' + photo.dataset.seat + ' has no seat number on the snapshot');
    }
    if (kind === 'insider') {
      const groups = file.querySelectorAll('.ab-roles');
      if (groups.length !== 1) problems.push(groups.length + ' groups of role names, not one');
      const group = groups[0];
      if (group && (group.getAttribute('role') !== 'img' || !/Undercover, Alien and Cracker/.test(group.getAttribute('aria-label') ?? ''))) problems.push('the role names are not one picture with one accessible name');
      if (group && group.querySelectorAll('.ab-roles__name').length !== 3) problems.push('the slip does not hold the three names');
      // The role names stand below all three snapshots, beside none of them.
      if (group && !file.dataset.inspect) {
        const top = group.querySelector('.ab-roles__slip').getBoundingClientRect().top;
        const lowest = Math.max(...photos.map(photo => photo.getBoundingClientRect().bottom));
        if (top < lowest - 1) problems.push('the role names stand beside a snapshot, not below the three');
      }
    }
    if (kind === 'hacker') {
      const label = [...file.querySelectorAll('.ab-photo__tape, .ab-known__role')].find(shown);
      if (!label || label.textContent !== 'Undercover') problems.push('the known Undercover is not labelled');
      for (const item of file.querySelectorAll('.ab-printout')) {
        const said = item.querySelector('.ab-vh')?.textContent ?? '';
        if (!/^Round \\d: you scanned (Player \\d|yourself) and guessed (Blue|Red|Alien)\\./.test(said)) problems.push('a Scan result does not say what was scanned, in the release words');
        if (item.dataset.result === 'wrong') {
          const seen = item.querySelector('.ab-printout__paper').textContent;
          if (item.querySelector('.ab-code-mark') || /code/i.test(seen) || /code/i.test(said)) problems.push('a wrong Scan says something of the Code');
        }
        if (item.querySelectorAll('.ab-code-mark').length > 1) problems.push('a Scan result shows more than one mark of the Code');
      }
    }
    if (kind === 'alien') {
      const own = [...file.querySelectorAll('.ab-photo__own')];
      if (own.length !== 1 || !own[0].closest('.ab-photo').getAttribute('aria-label').includes('(you)')) problems.push('the own snapshot is not the one marked');
      if (/\\b(1st|2nd|3rd|4th|first|second|third|fourth|position|#\\d)\\b/i.test(file.textContent)) problems.push('the Code is numbered or ordered');
      const said = [...(file.querySelector('.ab-vh')?.textContent ?? '').matchAll(/Player (\\d)/g)].map(match => Number(match[1]));
      if (said.length !== 4 || said.join() !== [...said].sort((a, b) => a - b).join()) problems.push('the Code is not said in seat order');
      if (!/The Code/.test(file.querySelector('.ab-code-tag')?.textContent ?? '')) problems.push('the set is not named the Code');
    }
    // At the default text size the file fits the card: nothing to scroll, the open inspect card included.
    if (!largeText && sheet && sheet.scrollHeight > sheet.clientHeight + 1) problems.push('the card scrolls: ' + (sheet.scrollHeight - sheet.clientHeight) + ' px more than it shows');
    const card = file.querySelector('.ab-inspect:not([hidden])');
    if (card && sheet) {
      const box = card.getBoundingClientRect(), view = sheet.getBoundingClientRect();
      if (box.bottom > view.bottom + 1 || box.top < view.top - 1) problems.push('the inspect card is not in view');
    }
  }
  if (sheet && !file && !document.querySelector('.ab-folder') && /Insider|Hacker|Alien/.test(sheet.querySelector('.bm-card__name')?.textContent ?? '')) problems.push('the sheet shows the role without its file');
  // The Code card in the strip: the picks in seat order, and on the board marked alike, never numbered.
  const codeCard = document.querySelector('#bm-strip .ab-code-card');
  if (codeCard) {
    const filled = [...codeCard.querySelectorAll('.ab-code-card__window[data-filled="true"] .ab-chip')].map(chip => Number(chip.dataset.seat));
    if (filled.join() !== [...filled].sort((a, b) => a - b).join()) problems.push('the Code card is not filled in seat order');
    const marks = [...document.querySelectorAll('[data-board="own"] .bm-piece__pick')];
    if (marks.some(mark => /\\d/.test(mark.textContent))) problems.push('a pick of the Code is numbered on the board');
    // The question and its detail name the picks; the Take back button names the last one picked, which is not a list.
    const words = [...document.querySelectorAll('#bm-strip .bm-strip__line, #bm-strip .bm-strip__detail')].map(node => node.textContent).join(' ');
    const listed = [...words.matchAll(/Player (\\d)/g)].map(match => Number(match[1]));
    if (listed.join() !== [...listed].sort((a, b) => a - b).join()) problems.push('the strip names the picks out of seat order');
  }
  // The Scan's target in the strip: swept only while the Scan is on its way, and never in reduced motion.
  const target = document.querySelector('#bm-strip .ab-scan-target');
  if (target) {
    const step = document.querySelector('#bm-strip')?.dataset.step;
    const sweeping = target.dataset.sweeping === 'true';
    if (sweeping !== (step === 'submitting' || step === 'checking')) problems.push('the scanner sweeps when nothing is on its way');
    const reduced = document.querySelector('.bm-app')?.dataset.motion === 'reduced';
    const running = target.querySelector('.ab-scan-target__sweep').getAnimations().length > 0;
    if (reduced && running) problems.push('the scanner sweeps in reduced motion');
  }
  // Slice 3, in the strip: the action's target, the vials, the cell, the tags.
  const strip = document.getElementById('bm-strip');
  const step = strip?.dataset.step;
  const flow = window.__bmState?.flow ?? {};
  const said = [...(strip?.querySelectorAll('.bm-strip__line, .bm-strip__detail') ?? [])].map(node => node.textContent).join(' ');
  const mark = strip?.querySelector('.ab-target');
  if (mark && Number(mark.querySelector('.ab-chip').dataset.seat) !== flow.picked?.[0]) problems.push('the target in the strip is not the player picked');
  for (const group of document.querySelectorAll('.ab-vials')) {
    const full = group.querySelectorAll('.ab-vial[data-full="true"]').length;
    if (group.querySelectorAll('.ab-vial').length !== 2) problems.push('not two vials, the Rescues a match gives');
    if (String(full) !== group.dataset.remaining) problems.push('the full vials are not the count');
    if ([...group.querySelectorAll('.ab-vial')].some((vial, index) => (vial.dataset.full === 'true') !== (index < full))) problems.push('a full vial stands after an empty one');
  }
  if (flow.kind === 'rescue' && step === 'accepted' && /\\b(heal|heals|healed|healthy|recover|recovers|recovered|saved|cured)\\b/i.test(strip.textContent)) problems.push("the Rescue's receipt speaks of a recovery");
  if (mark?.dataset.mark === 'cross' && flow.kind !== 'rescue') problems.push('the cross marks something that is not a Rescue');
  const charge = strip?.querySelector('.ab-cell');
  if (charge && (charge.dataset.spent === 'true') !== (step === 'accepted')) problems.push('the cell is spent when nothing was registered, or full after the receipt');
  if (flow.kind === 'disable' && strip && /data-device|data-team|\\bblue\\b|\\bred\\b/i.test(strip.innerHTML)) problems.push("the Disable's strip says which Disabler");
  const tags = strip?.querySelector('.ab-tags');
  if (tags) {
    const seats = [...tags.querySelectorAll('.ab-chip')].map(chip => Number(chip.dataset.seat));
    if (seats.join() !== [...seats].sort((a, b) => a - b).join()) problems.push("Supply's tags are not in seat order");
    if ((tags.dataset.tied === 'true') !== (step === 'accepted')) problems.push('the tags are tied before the receipt, or not on it');
    const named = [...said.matchAll(/Player (\\d)/g)].map(match => Number(match[1]));
    if (named.join() !== [...named].sort((a, b) => a - b).join()) problems.push("the strip names Supply's picks out of seat order");
  }
  // In the card: the Cracker's Rescues and Supply's slips, in the release's words.
  const kit = document.querySelector('#bm-card .ab-kit');
  if (kit) {
    const count = Number((kit.querySelector('.ab-kit__words')?.textContent.match(/^Rescues you have left: (\\d)\\.$/) ?? [])[1]);
    if (!(count > 0)) problems.push("the Rescues are not said in the release's words, or said at none");
    if (kit.querySelectorAll('.ab-vial[data-full="true"]').length !== count) problems.push('the vials do not show the count said');
  }
  for (const slip of document.querySelectorAll('#bm-card .ab-slip')) {
    const words = slip.querySelector('.ab-slip__words')?.textContent ?? '';
    const seats = [...slip.querySelectorAll('.ab-chip')].map(chip => Number(chip.dataset.seat));
    const kind = slip.dataset.slip.split(':')[0];
    const named = [...words.matchAll(/Player (\\d)/g)].map(match => Number(match[1]));
    if (kind === 'supplied') {
      if (!/^(Your Round 3 Supply granted one weapon each to Player \\d( and Player \\d)?\\.|No players received a weapon from your Round 3 Supply\\.)$/.test(words)) problems.push("a Supplier's slip is not in the release's words: " + words);
      if (named.join() !== seats.join()) problems.push("a Supplier's slip names other players than its tags");
    } else if (kind === 'received') {
      if (!/^You received one ordinary weapon from Supply in Round \\d\\.$/.test(words)) problems.push("a recipient's slip is not in the release's words");
      if (seats.join() !== String(window.__bmState?.viewer ?? 3)) problems.push("a recipient's tag is not addressed to the recipient");
    } else if (words !== 'Supply result history is unavailable for this match.') problems.push('an unexpected slip: ' + words);
    if (seats.join() !== [...seats].sort((a, b) => a - b).join()) problems.push("a slip's tags are not in seat order");
    if (Boolean(slip.querySelector('[data-stamp="delivered"]')) !== seats.length > 0) problems.push('a slip is stamped Delivered without a weapon, or a delivery without its stamp');
  }
  // A card with the Cracker's note or Supply's slips fits without scrolling at the default text size, as the files do.
  if (sheet && !file && sheet.querySelector('.ab-kit, .ab-deliveries') && !largeText && sheet.scrollHeight > sheet.clientHeight + 1) problems.push('the card scrolls: ' + (sheet.scrollHeight - sheet.clientHeight) + ' px more than it shows');
  // At large text the notes' words grow with the reader's text.
  for (const words of document.querySelectorAll('#bm-card .ab-slip__words, #bm-card .ab-kit__words')) if (largeText && parseFloat(getComputedStyle(words).fontSize) < 20) problems.push('at large text a note keeps its small words');
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
/** What each picture's page held, where a later comparison asks for it (the Disablers' strips). */
const kept = new Map();
async function shoot(browser, server, { name, title, group, phone, path, slice = 1, scale = SCALE, before = null, measure = MEASURE, block = [], selector = null, wait = 1300, keepStrip = false }) {
  const page = await openPage(browser, { ...PHONES[phone], scale, mobile: true });
  if (block.length) await page.block(block);
  await page.goto(`${server.origin}/board-motion/index.html${path}`, 'document.readyState === "complete" && window.__designReady === true');
  await page.evaluate(`new Promise(done => setTimeout(done, ${wait}))`);
  if (before) { await page.evaluate(before); await page.evaluate('new Promise(done => setTimeout(done, 450))'); }
  const problems = await page.evaluate(measure);
  if (keepStrip) kept.set(name, await page.evaluate(`document.getElementById('bm-strip').outerHTML`));
  const file = `${OUT}/${name}.png`;
  const size = await page.screenshot(resolve(repoRoot, file), { selector, viewport: selector === null });
  for (const problem of page.problems()) problems.push(`page: ${problem}`);
  shots.push({ name, title, group, slice, file, phone, size: `${size.width}x${size.height}`, problems });
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
  const FIRST = "document.querySelectorAll('.ab-photo')[0].click()";
  const LAST = "document.querySelectorAll('.ab-photo')[2].click()";
  const SHOW = "document.querySelectorAll('.ab-photo')[1].click(); await new Promise(done => setTimeout(done, 260)); document.querySelector('[data-file-act=\"show\"]').click()";
  const BACKGROUND = "Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange'))";
  const ART = ['*abilities.art.css*', '*public-board.art.*'];

  // ---------- slice 1: the Insider's file ----------
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
  await shoot(browser, server, { name: 'insider-w390-no-art', title: 'Without the ability art or the crew cards', group: 'Text size, motion, art', phone: 'w390', path: '?scenario=file.insider&chrome=0', block: ART });
  const CARD = "document.querySelector('.bm-nav button[data-view=\"card\"]').click()";
  await shoot(browser, server, { name: 'hidden-w390-stale', title: 'Card pressed while the view is out of date: the closed folder', group: 'Hidden', phone: 'w390', path: '?scenario=file.hidden&chrome=0', before: CARD, measure: hidden({ folder: true }) });
  await shoot(browser, server, { name: 'hidden-w320-stale', title: 'The closed folder, 320 x 568', group: 'Hidden', phone: 'w320', path: '?scenario=file.hidden&chrome=0', before: CARD, measure: hidden({ folder: true }) });
  await shoot(browser, server, { name: 'hidden-w390-background', title: 'Back from the background: the board, the card closed', group: 'Hidden', phone: 'w390', path: '?scenario=file.insider&chrome=0', before: BACKGROUND, measure: hidden({ folder: false }) });
  await shoot(browser, server, { name: 'hidden-w390-reopened', title: 'Card pressed again: the file at rest, not assembled again', group: 'Hidden', phone: 'w390', path: '?scenario=file.insider&chrome=0', before: `${BACKGROUND}; ${CARD}`, measure: REOPENED });
  for (const t of FRAMES) {
    await shoot(browser, server, { name: `assembly-${String(t).padStart(4, '0')}ms`, title: `${t} ms`, group: 'Assembly, frame by frame', phone: 'w390', path: `?scenario=file.insider&chrome=0&t=${t}`, selector: '.bm-sheet:not([hidden])', measure: '[]', wait: 200 });
  }

  // ---------- slice 2: the Hacker's file and the Alien's, the Code and the Scan in the strip ----------
  for (const phone of ['w390', 'w320']) {
    const px = PHONES[phone];
    const at = `${px.width} x ${px.height}`;
    await shoot(browser, server, { slice: 2, name: `hacker-${phone}-rest`, title: `The Hacker's file: the known Undercover, two Scans, ${at}`, group: 'The Hacker\'s file', phone, path: '?scenario=file.hacker&chrome=0' });
    await shoot(browser, server, { slice: 2, name: `hacker-${phone}-inspect`, title: `Inspecting the known Undercover, ${at}`, group: 'The Hacker\'s file', phone, path: '?scenario=file.hacker&chrome=0', before: FIRST });
    await shoot(browser, server, { slice: 2, name: `hacker-${phone}-long-names`, title: `Twelve-character names, ${at}`, group: 'The Hacker\'s file', phone, path: '?scenario=file.hacker&chrome=0&names=long' });
    await shoot(big, server, { slice: 2, name: `hacker-${phone}-text200`, title: `The Hacker's file at twice the text size, ${at}`, group: 'Slice 2: text size, motion, art', phone, path: '?scenario=file.hacker&chrome=0' });
    await shoot(browser, server, { slice: 2, name: `alien-${phone}-rest`, title: `The Alien's file: the Code, four in no order, ${at}`, group: 'The Alien\'s file', phone, path: '?scenario=file.alien&chrome=0' });
    await shoot(browser, server, { slice: 2, name: `alien-${phone}-inspect`, title: `Inspecting one of the four, ${at}`, group: 'The Alien\'s file', phone, path: '?scenario=file.alien&chrome=0', before: INSPECT });
    await shoot(browser, server, { slice: 2, name: `alien-${phone}-long-names`, title: `Twelve-character names, ${at}`, group: 'The Alien\'s file', phone, path: '?scenario=file.alien&chrome=0&names=long' });
    await shoot(big, server, { slice: 2, name: `alien-${phone}-text200`, title: `The Alien's file at twice the text size, ${at}`, group: 'Slice 2: text size, motion, art', phone, path: '?scenario=file.alien&chrome=0' });
    await shoot(browser, server, { slice: 2, name: `code-${phone}-two`, title: `Code attempt: two picked, the card in seat order, ${at}`, group: 'The Code and the Scan in the strip', phone, path: '?scenario=code.two&chrome=0' });
    await shoot(browser, server, { slice: 2, name: `code-${phone}-four`, title: `Code attempt: four picked, confirm, ${at}`, group: 'The Code and the Scan in the strip', phone, path: '?scenario=code.four&chrome=0' });
    await shoot(browser, server, { slice: 2, name: `scan-${phone}-guess`, title: `Scan: the target, guess a faction, ${at}`, group: 'The Code and the Scan in the strip', phone, path: '?scenario=scan.faction&chrome=0' });
  }
  await shoot(browser, server, { slice: 2, name: 'hacker-w390-start', title: 'The Hacker\'s file before any Scan', group: 'The Hacker\'s file', phone: 'w390', path: '?scenario=file.hacker-start&chrome=0' });
  await shoot(browser, server, { slice: 2, name: 'hacker-w390-one-result', title: 'One Scan result: right, not in the Code', group: 'The Hacker\'s file', phone: 'w390', path: '?scenario=scan.result&chrome=0' });
  await shoot(browser, server, { slice: 2, name: 'code-w390-registered', title: 'Code attempt registered: the card punched, not a result', group: 'The Code and the Scan in the strip', phone: 'w390', path: '?scenario=code.registered&chrome=0' });
  await shoot(browser, server, { slice: 2, name: 'scan-w390-sending', title: 'Scan on its way: the scanner sweeps its target', group: 'The Code and the Scan in the strip', phone: 'w390', path: '?scenario=scan.sending&chrome=0' });
  await shoot(browser, server, { slice: 2, name: 'scan-w390-sending-reduced', title: 'Reduced motion: no sweep, the target ringed', group: 'Slice 2: text size, motion, art', phone: 'w390', path: '?scenario=scan.sending&chrome=0&motion=reduced' });
  await shoot(browser, server, { slice: 2, name: 'hacker-w390-no-art', title: 'The Hacker\'s file without the ability art or the crew cards', group: 'Slice 2: text size, motion, art', phone: 'w390', path: '?scenario=file.hacker&chrome=0', block: ART });
  await shoot(browser, server, { slice: 2, name: 'alien-w390-no-art', title: 'The Alien\'s file without the ability art or the crew cards', group: 'Slice 2: text size, motion, art', phone: 'w390', path: '?scenario=file.alien&chrome=0', block: ART });
  await shoot(browser, server, { slice: 2, name: 'code-w390-no-art', title: 'The Code card without the ability art or the crew cards', group: 'Slice 2: text size, motion, art', phone: 'w390', path: '?scenario=code.four&chrome=0', block: ART });
  for (const t of [0, 260, 520, 780, 1100]) {
    await shoot(browser, server, { slice: 2, name: `hacker-assembly-${String(t).padStart(4, '0')}ms`, title: `Hacker's file, ${t} ms`, group: 'Slice 2: assembly, frame by frame', phone: 'w390', path: `?scenario=file.hacker&chrome=0&t=${t}`, selector: '.bm-sheet:not([hidden])', measure: '[]', wait: 200 });
  }
  for (const t of [0, 260, 520, 820, 1100]) {
    await shoot(browser, server, { slice: 2, name: `alien-assembly-${String(t).padStart(4, '0')}ms`, title: `Alien's file, ${t} ms`, group: 'Slice 2: assembly, frame by frame', phone: 'w390', path: `?scenario=file.alien&chrome=0&t=${t}`, selector: '.bm-sheet:not([hidden])', measure: '[]', wait: 200 });
  }

  // ---------- slice 3: the Rescue, the Disable, the Supply ----------
  for (const phone of ['w390', 'w320']) {
    const px = PHONES[phone];
    const at = `${px.width} x ${px.height}`;
    await shoot(browser, server, { slice: 3, name: `rescue-${phone}-choose`, title: `Rescue: a player in the Hospital, two vials left, ${at}`, group: 'The Rescue', phone, path: '?scenario=rescue.choose&chrome=0' });
    await shoot(browser, server, { slice: 3, name: `rescue-${phone}-confirm`, title: `Rescue: the target in the medical cross, ${at}`, group: 'The Rescue', phone, path: '?scenario=rescue.confirm&chrome=0' });
    await shoot(browser, server, { slice: 3, name: `rescue-${phone}-registered`, title: `Rescue registered: one vial spent, not a recovery, ${at}`, group: 'The Rescue', phone, path: '?scenario=rescue.registered&chrome=0' });
    await shoot(browser, server, { slice: 3, name: `rescue-${phone}-kit`, title: `The Cracker's card: one Rescue left, ${at}`, group: 'The Rescue', phone, path: '?scenario=rescue.kit&chrome=0' });
    await shoot(browser, server, { slice: 3, name: `disable-${phone}-confirm`, title: `Disable: the target in the sparks, the one charge, ${at}`, group: 'The Disable', phone, path: '?scenario=disable.confirm&chrome=0', keepStrip: true });
    await shoot(browser, server, { slice: 3, name: `disable-${phone}-registered`, title: `Disable registered: the charge spent, not a result, ${at}`, group: 'The Disable', phone, path: '?scenario=disable.registered&chrome=0', keepStrip: true });
    await shoot(browser, server, { slice: 3, name: `supply-${phone}-second`, title: `Supply: one tag filled, choose the second, ${at}`, group: 'The Supply', phone, path: '?scenario=supply.second&chrome=0' });
    await shoot(browser, server, { slice: 3, name: `supply-${phone}-registered`, title: `Supply registered: the tags tied, not a delivery, ${at}`, group: 'The Supply', phone, path: '?scenario=supply.registered&chrome=0' });
    await shoot(browser, server, { slice: 3, name: `supply-${phone}-ack`, title: `The Supplier's slip: delivered to both, ${at}`, group: 'The Supply', phone, path: '?scenario=supply.ack&chrome=0' });
    await shoot(browser, server, { slice: 3, name: `supply-${phone}-received`, title: `A recipient's slip: no Supplier named, ${at}`, group: 'The Supply', phone, path: '?scenario=supply.received&chrome=0' });
  }
  await shoot(browser, server, { slice: 3, name: 'rescue-w390-self', title: 'Rescue: yourself, injured, one vial left', group: 'The Rescue', phone: 'w390', path: '?scenario=rescue.self&chrome=0' });
  await shoot(browser, server, { slice: 3, name: 'disable-w390-red-confirm', title: 'The Red Disabler\'s strip: the same as the Blue\'s', group: 'The Disable', phone: 'w390', path: '?scenario=disable.red-confirm&chrome=0', keepStrip: true });
  await shoot(browser, server, { slice: 3, name: 'disable-w390-red-registered', title: 'The Red Disabler\'s receipt: the same as the Blue\'s', group: 'The Disable', phone: 'w390', path: '?scenario=disable.red-registered&chrome=0', keepStrip: true });
  await shoot(browser, server, { slice: 3, name: 'supply-w390-ack-one', title: 'Delivered to one of the two', group: 'The Supply', phone: 'w390', path: '?scenario=supply.ack-one&chrome=0' });
  await shoot(browser, server, { slice: 3, name: 'supply-w390-ack-none', title: 'No one received a weapon', group: 'The Supply', phone: 'w390', path: '?scenario=supply.ack-none&chrome=0' });
  await shoot(browser, server, { slice: 3, name: 'supply-w390-self', title: 'Supplied yourself and Player 8: two slips', group: 'The Supply', phone: 'w390', path: '?scenario=supply.self&chrome=0' });
  await shoot(browser, server, { slice: 3, name: 'supply-w390-history', title: 'The Supplier\'s history unavailable', group: 'The Supply', phone: 'w390', path: '?scenario=supply.history&chrome=0' });
  await shoot(big, server, { slice: 3, name: 'rescue-w390-text200-confirm', title: 'Rescue at twice the text size', group: 'Slice 3: text size, motion, art', phone: 'w390', path: '?scenario=rescue.confirm&chrome=0' });
  await shoot(big, server, { slice: 3, name: 'supply-w320-text200-registered', title: 'Supply registered at twice the text size, 320 x 568', group: 'Slice 3: text size, motion, art', phone: 'w320', path: '?scenario=supply.registered&chrome=0' });
  await shoot(big, server, { slice: 3, name: 'supply-w390-text200-self', title: 'Two slips at twice the text size', group: 'Slice 3: text size, motion, art', phone: 'w390', path: '?scenario=supply.self&chrome=0' });
  await shoot(big, server, { slice: 3, name: 'rescue-w320-text200-kit', title: 'The Cracker\'s card at twice the text size, 320 x 568', group: 'Slice 3: text size, motion, art', phone: 'w320', path: '?scenario=rescue.kit&chrome=0' });
  await shoot(browser, server, { slice: 3, name: 'rescue-w390-registered-reduced', title: 'Reduced motion: the receipt at rest', group: 'Slice 3: text size, motion, art', phone: 'w390', path: '?scenario=rescue.registered&chrome=0&motion=reduced' });
  for (const [scenario, label] of [['rescue.confirm', 'rescue'], ['disable.confirm', 'disable'], ['supply.second', 'supply'], ['supply.ack', 'slip']]) {
    await shoot(browser, server, { slice: 3, name: `${label}-w390-no-art`, title: `Without the ability art or the crew cards: ${scenario}`, group: 'Slice 3: text size, motion, art', phone: 'w390', path: `?scenario=${scenario}&chrome=0`, block: ART });
  }
  // The beats, held frame by frame: the vial draining and the cell discharging on the receipt, the tags tied, a slip dropping in.
  for (const [scenario, label, ends] of [['rescue.confirm', 'drain', 240], ['disable.confirm', 'discharge', 200], ['supply.confirm', 'tie', 200]]) {
    for (const t of [0, Math.round(ends / 2), ends]) {
      await shoot(browser, server, { slice: 3, name: `beat-${label}-${String(t).padStart(4, '0')}ms`, title: `${label[0].toUpperCase()}${label.slice(1)}, ${t} ms`, group: 'Slice 3: the beats, frame by frame', phone: 'w390', path: `?scenario=${scenario}&chrome=0&play=register&t=${t}`, selector: '#bm-strip', measure: '[]', wait: 200 });
    }
  }
  // Only the slip's own beat is held: the card's slide-in finishes, so that every frame shows the slip where it lands.
  for (const t of [0, 130, 260]) {
    await shoot(browser, server, { slice: 3, name: `beat-slip-${String(t).padStart(4, '0')}ms`, title: `A slip drops in, ${t} ms`, group: 'Slice 3: the beats, frame by frame', phone: 'w390', path: `?scenario=supply.ack&chrome=0&t=${t}&only=.ab-deliveries`, selector: '.ab-deliveries', measure: '[]', wait: 200 });
  }
  // The Blue and the Red Disabler see the same strip, part for part.
  for (const [blue, red] of [['disable-w390-confirm', 'disable-w390-red-confirm'], ['disable-w390-registered', 'disable-w390-red-registered']]) {
    if (kept.get(blue) !== kept.get(red)) shots.find(shot => shot.name === red).problems.push('the Red Disabler\'s strip differs from the Blue Disabler\'s');
  }

  // The contact sheets: every picture above, with its caption, one sheet per slice.
  await writeFile(resolve(repoRoot, `${OUT}/report.json`), `${JSON.stringify({ inputsSha256: await abilitiesInputsSha256(), browser: browserName, scale: SCALE, shots }, null, 2)}\n`);
  for (const [slice, name] of Object.entries(SHEETS)) {
    const page = await openPage(browser, { width: 1500, height: 1000, scale: 1, mobile: false });
    await page.goto(`${server.origin}/abilities/contact.html?slice=${slice}`, 'window.__designReady === true');
    await page.fitHeight();
    await page.screenshot(resolve(repoRoot, `${OUT}/${name}`), { selector: '#sheet' });
    for (const problem of page.problems()) shots.push({ name: 'contact', file: `${OUT}/${name}`, problems: [`page: ${problem}`] });
    await page.close();
  }
  browser.close(); big.close();
} finally {
  await chrome.close(); await large.close(); await server.close();
}
await writeFile(resolve(repoRoot, `${OUT}/report.json`), `${JSON.stringify({ inputsSha256: await abilitiesInputsSha256(), browser: browserName, scale: SCALE, shots }, null, 2)}\n`);
const failed = shots.filter(shot => shot.problems.length);
console.log(`Ability captures: ${shots.length} pictures and ${Object.keys(SHEETS).length} contact sheets, ${failed.length} with problems; ${browserName}`);
process.exitCode = failed.length ? 1 : 0;
