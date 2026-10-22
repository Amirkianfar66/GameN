// mothership:dev-only
//
// Measures the reference shells in a real browser:
//   node design/tools/check-layout.mjs
//   npm run check:layout --workspace @mothership/design-tokens
//
// For every surface, width, height, default text size and state in the matrix below it
// asserts what the list at the end of this file says, in the same words the report uses.
//
//   node design/tools/check-layout.mjs --match=<text>    only the cases whose label contains
//                                                        the text; the report says so
//
// It needs a Chromium-based browser (CHROME_PATH overrides the search), so it is not part of
// `npm run verify`. What it measures is desktop Chrome on this machine laying out the
// Designer's hand-built copy of the shell markup. It is not a phone, not Frontend's
// runtime, and not a substitute for the named-device checks.

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { reviewInputsSha256 } from './lib/inputs.mjs';
import { startStaticServer } from './lib/static-server.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const tokens = JSON.parse(await readFile(resolve(repoRoot, 'packages/design-tokens/src/tokens-0.4.0.json'), 'utf8'));
const modes = JSON.parse(await readFile(resolve(repoRoot, 'rules/overlays/player-modes-officer.json'), 'utf8'));
const kit = await import(pathToFileURL(resolve(repoRoot, 'design/prototypes/js/kit.js')).href);
const minimumTarget = tokens.interaction.minimumTargetCssPx;
const ROLE_NAMES = [...modes.modes['9'].blue_roles, ...modes.modes['9'].red_roles, 'Alien'];

const PLAYER_WIDTHS = [320, 360, 414, 599, 600, 768];
const TABLE_WIDTHS = [600, 960, 1279, 1280, 1440, 1920];
const TEXT_SIZES = [16, 32];
const SPECIMENS = Object.keys(kit.SHOT_SPECIMENS);

const cases = [];
for (const defaultFontPx of TEXT_SIZES) {
  const add = (width, height, query) => cases.push({ defaultFontPx, width, height, query });
  for (const width of PLAYER_WIDTHS) {
    // The public layer: the usual seating, a jailed seat, the stress seating, nine in one room,
    // a stale view, no art, and no seat with a name or a character yet.
    add(width, 760, 'surface=player');
    add(width, 760, 'surface=player&state=C&viewer=8');
    add(width, 760, 'surface=player&state=D&viewer=9');
    add(width, 760, 'surface=player&state=E&viewer=3');
    add(width, 760, 'surface=player&connection=stale');
    add(width, 760, 'surface=player&art=none');
    add(width, 760, 'surface=player&identity=none');
    add(width, 760, 'surface=player&identity=none&art=none');
    // The open sheet in every picture of the Shot card, then the edges.
    for (const specimen of SPECIMENS) add(width, 760, `surface=player&open=1&status=${specimen}`);
    add(width, 760, 'surface=player&open=1&status=available&about=open');
    add(width, 760, 'surface=player&open=1&status=targeting&state=D&viewer=1');
    add(width, 760, 'surface=player&open=1&status=available&role=Red%20Disabler');
    add(width, 760, 'surface=player&open=1&status=available&role=Undercover&about=open');
    add(width, 760, 'surface=player&open=1&status=targeting&identity=none');
    add(width, 760, 'surface=player&open=1&status=registered&art=none');
  }
  // Short phones: the first screenful has to stay usable.
  for (const [width, height] of [[320, 568], [360, 640]]) {
    add(width, height, 'surface=player');
    add(width, height, 'surface=player&open=1&status=available');
    add(width, height, 'surface=player&open=1&status=targeting');
  }
  for (const width of TABLE_WIDTHS) {
    for (const state of ['A', 'B', 'C', 'D', 'E']) add(width, 760, `surface=table&state=${state}`);
    add(width, 760, 'surface=table&state=B&connection=stale');
    add(width, 760, 'surface=table&state=B&art=none');
    add(width, 760, 'surface=table&state=D&art=none');
    add(width, 760, 'surface=table&state=C&identity=none');
    add(width, 760, 'surface=table&state=D&identity=none');
  }
}

const measure = `(() => {
  const minimum = ${minimumTarget};
  const roleWords = new RegExp(${JSON.stringify(`\\b(${ROLE_NAMES.join('|')}|Blue team|Red team|Independent)\\b`)}, 'i');
  const smallestPiece = ${tokens.component.piece.minWidthPx};
  const viewport = document.documentElement.clientWidth;
  const height = window.innerHeight;
  const shell = document.querySelector('.ms-shell');
  const art = (document.documentElement.dataset.art ?? '').split(' ').filter(Boolean);
  const describe = node => (node.id ? '#' + node.id : node.tagName.toLowerCase() + (node.className ? '.' + String(node.className).split(' ').join('.') : ''));
  const shown = node => { const box = node.getBoundingClientRect(); return box.width > 1 && box.height > 1; };

  const sideways = [];
  for (const node of shell.querySelectorAll('*')) {
    const box = node.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    if (box.right > viewport + 0.5 || box.left < -0.5) sideways.push(describe(node) + ' ' + Math.round(box.left) + '..' + Math.round(box.right));
  }

  // Nothing a person has to read or press may be cut off: not by a box that clips, and not
  // by its own box being too small for its words.
  const clipped = [];
  const READ = '.ms-marker, .ms-seat__name, .ms-seat__number, .ms-button, .ms-token, .ms-card__status, .ms-card__text, .ms-card__prompt, .ms-card__result, .ms-zone__name, .ms-zone__empty, .ms-timer__value, .ms-timer__note, .ms-phase__round, .ms-phase__label, .ms-phase__detail, .ms-banner__text, .ms-notice, .ms-role-card, .ms-role-card__name, .ms-role-card__team, .ms-target__name, .ms-target__detail, .ms-location__name, .ms-table th, .ms-table td';
  for (const node of shell.querySelectorAll(READ)) {
    if (!shown(node)) continue;
    const box = node.getBoundingClientRect();
    if (node.scrollWidth > node.clientWidth + 1 && getComputedStyle(node).overflowX !== 'visible') clipped.push(describe(node) + ' is narrower than its own words');
    for (let parent = node.parentElement; parent && parent !== shell; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (!['hidden', 'clip'].includes(style.overflowY) && !['hidden', 'clip'].includes(style.overflowX)) continue;
      const frame = parent.getBoundingClientRect();
      if (box.bottom > frame.bottom + 1 || box.top < frame.top - 1 || box.right > frame.right + 1 || box.left < frame.left - 1) clipped.push(describe(node) + ' in ' + describe(parent));
      break;
    }
  }
  // A roster cell holds its own words: a name that runs into the next column covers what is there.
  for (const cell of shell.querySelectorAll('.ms-table th, .ms-table td')) {
    if (cell.scrollWidth > cell.clientWidth + 1) clipped.push(describe(cell) + ' "' + cell.textContent.trim().slice(0, 24) + '" holds something wider than its cell');
  }
  // A roster that has to be scrolled sideways hides status words.
  const roster = shell.querySelector('.ms-roster');
  const table = shell.querySelector('.ms-table');
  if (roster && roster.scrollWidth > roster.clientWidth + 1) clipped.push('the roster is wider than its panel (' + roster.scrollWidth + ' > ' + roster.clientWidth + ')');
  if (roster && table && table.getBoundingClientRect().right > roster.getBoundingClientRect().right + 0.5) clipped.push('the roster table runs past its panel');

  const small = [];
  for (const node of shell.querySelectorAll('button, summary, a[href], input')) {
    // A checkbox is pressed through the label it sits in.
    const target = node.matches('input') ? node.closest('label') ?? node : node;
    const box = target.getBoundingClientRect();
    if (box.width === 0 && box.height === 0) continue;
    if (box.width < minimum - 0.5 || box.height < minimum - 0.5) small.push(describe(node) + ' ' + Math.round(box.width) + 'x' + Math.round(box.height));
  }

  // A name that is not on a board panel is never shortened: it wraps instead.
  for (const node of shell.querySelectorAll('.ms-seat__player')) {
    if (!shown(node) || node.closest('.ms-board')) continue;
    if (node.scrollWidth > node.clientWidth + 1 && getComputedStyle(node).overflowX !== 'visible') clipped.push(describe(node) + ' "' + node.textContent + '" is shortened outside the board');
  }

  // Pieces: with art, a seat with a character is one picture, its character; a seat without
  // one is a numeral picture over a body. Without art, the numeral is live text that can be seen.
  const tokens = [];
  for (const node of shell.querySelectorAll('[data-seat] > .ms-token, [data-target-seat] > .ms-token')) {
    const style = getComputedStyle(node);
    if (art.includes('public-board')) {
      const pictures = (style.backgroundImage.match(/url\\("data:image/g) ?? []).length;
      if (node.parentElement.hasAttribute('data-character')) {
        if (pictures !== 1) tokens.push(describe(node.parentElement) + ' piece is not one picture of its character');
      } else if (pictures !== 2) tokens.push(describe(node.parentElement) + ' token is not a numeral over a body');
    } else {
      const visible = style.color !== 'rgba(0, 0, 0, 0)' && parseFloat(style.fontSize) >= 12 && node.textContent.trim() !== '';
      if (!visible) tokens.push(describe(node.parentElement) + ' token shows no numeral');
    }
  }
  // Without art no word may be hidden: every name and every marker is there to read.
  const hiddenWords = [];
  if (!art.includes('public-board')) {
    for (const node of shell.querySelectorAll('.ms-seat__name, .ms-marker')) {
      if (!shown(node) || parseFloat(getComputedStyle(node).fontSize) < 12) hiddenWords.push(describe(node) + ' "' + node.textContent + '"');
    }
  }

  // On a board panel: every piece and every tag is inside its room, no piece is under the
  // smallest size a face can be told at, no two tags lie on each other, every tag shows its
  // seat number whole, and a name the tag shortens is whole in the roster beside the board.
  const board = [];
  const touching = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
  for (const zone of art.includes('public-board') ? shell.querySelectorAll('.ms-board .ms-zone') : []) {
    const room = zone.getBoundingClientRect();
    const inside = box => box.left >= room.left - 1 && box.right <= room.right + 1 && box.top >= room.top - 1 && box.bottom <= room.bottom + 1;
    const tags = [];
    for (const seat of zone.querySelectorAll('.ms-seat[data-character]')) {
      const who = describe(zone) + '[' + zone.dataset.zone + '] ' + seat.dataset.seat;
      const piece = seat.querySelector('.ms-token').getBoundingClientRect();
      const tag = seat.querySelector('.ms-seat__name');
      const number = seat.querySelector('.ms-seat__number');
      const name = seat.querySelector('.ms-seat__player');
      if (!tag || !number || !name) { board.push(who + ' has a character and no tag'); continue; }
      if (zone.dataset.zone === 'final-zone') continue;
      if (piece.width < smallestPiece - 0.5) board.push(who + ' piece is ' + piece.width.toFixed(1) + ' px wide');
      if (piece.left < room.left - 1 || piece.right > room.right + 1 || piece.bottom > room.bottom + 1) board.push(who + ' piece stands outside its room');
      const box = tag.getBoundingClientRect();
      if (!inside(box)) board.push(who + ' tag is outside its room');
      const digits = number.getBoundingClientRect();
      if (digits.width < 4 || digits.height < 8 || digits.left < box.left - 1 || digits.right > box.right + 1) board.push(who + ' tag does not show its seat number whole');
      if (parseFloat(getComputedStyle(tag).fontSize) < 9.5) board.push(who + ' tag is set in ' + getComputedStyle(tag).fontSize);
      if (name.scrollWidth > name.clientWidth + 1) {
        const whole = shell.querySelector('.ms-roster tr[data-seat="' + seat.dataset.seat + '"] .ms-seat__player');
        if (!whole || !shown(whole) || whole.textContent !== name.textContent || whole.scrollWidth > whole.clientWidth + 1) board.push(who + ' name is shortened in its tag and is not whole in the roster');
      }
      tags.push([who, box]);
    }
    for (let i = 0; i < tags.length; i += 1) for (let j = i + 1; j < tags.length; j += 1) if (touching(tags[i][1], tags[j][1])) board.push(tags[i][0] + ' tag lies on the tag of ' + tags[j][0].split(' ').at(-1));
  }

  // How much of the first screenful the parts that hold an edge leave to the page.
  const phase = shell.querySelector('.ms-shell--player .ms-phase');
  const dock = shell.querySelector('.ms-private--docked');
  const toggle = shell.querySelector('#ms-private-toggle');
  let free = null;
  let toggleInView = null;
  if (dock && getComputedStyle(dock).position === 'sticky' && getComputedStyle(dock).bottom === '0px') {
    const open = dock.dataset.open === 'true';
    if (!open) {
      window.scrollTo(0, Math.max(0, (document.documentElement.scrollHeight - height) / 2));
      const top = getComputedStyle(phase).position === 'sticky' ? Math.max(0, phase.getBoundingClientRect().bottom) : 0;
      const bottom = Math.max(0, height - dock.getBoundingClientRect().top);
      free = (height - top - bottom) / height;
    }
    const inView = () => { const box = toggle.getBoundingClientRect(); return box.top >= -0.5 && box.bottom <= height + 0.5; };
    toggleInView = inView();
    // With the sheet open and its cards scrolled to the end, hiding is still one tap away.
    if (open) {
      dock.scrollTop = dock.scrollHeight;
      toggleInView = toggleInView && inView() && document.elementFromPoint(toggle.getBoundingClientRect().left + 4, toggle.getBoundingClientRect().top + 4) === toggle;
      dock.scrollTop = 0;
    }
  }

  const privateSheet = shell.querySelector('[data-region="private"]');
  const privatePanel = shell.querySelector('.ms-private__panel');
  const outside = shell.cloneNode(true);
  outside.querySelector('.ms-private__panel')?.replaceChildren();
  return {
    scrollWidth: document.documentElement.scrollWidth,
    viewport,
    art,
    sideways: sideways.slice(0, 6),
    clipped: clipped.slice(0, 6),
    small: small.slice(0, 6),
    tokens: tokens.slice(0, 4),
    board: board.slice(0, 6),
    characters: shell.querySelectorAll('[data-character]').length,
    hiddenWords: hiddenWords.slice(0, 4),
    free,
    toggleInView,
    surface: shell.dataset.surface,
    hasPrivateSheet: privateSheet !== null,
    sheetOpen: privateSheet?.dataset.open === 'true',
    privateContent: privatePanel ? privatePanel.children.length : 0,
    // Everything outside the private panel: its words, its attributes and its inline styles.
    privateHooksOutside: outside.querySelectorAll('[data-status], [data-step], [data-selected], [data-pip], [data-action], [data-target-seat], .ms-card, .ms-role-card, .ms-pip, .ms-notice').length,
    roleWordsOutside: roleWords.test(outside.outerHTML) || /--ms-role-|--ms-team-accent|faction|device-/.test(outside.outerHTML),
    commandControls: shell.querySelectorAll('[data-intent^="shot/"], [data-intent="private/toggle"]').length,
  };
})()`;

const ASSERTIONS = [
  'no sideways scrolling, and nothing drawn past either side of the screen',
  'no token, name, marker, status word, caption, card line, roster cell or control cut off by a clipping box or by its own box',
  'the table roster never wider than its panel, and no roster cell holding anything wider than itself',
  `every control at least ${minimumTarget} x ${minimumTarget} CSS px`,
  'with art, every seat with a character is drawn as one picture of that character and every seat without one as a numeral picture over a body picture; without art, every token shows its numeral as text and no name or marker is hidden',
  'on a board panel every piece and every tag is inside its room, no piece is under the smallest size in the tokens, no two tags lie on each other, every tag shows its seat number whole, and a name a tag shortens is whole in the roster; nowhere else is a name shortened',
  'a page asked for without names and characters draws none, and every other page draws one for every seat',
  'with the sheet closed on a docked phone layout, at least half of the screen height is left free by the phase caption and the dock',
  'on a docked phone layout the control that opens and closes the sheet is inside the screen and on top, closed, open, and open with the cards scrolled to their end',
  'outside the private panel: no private hook, no role or team word, no role or team style and no device, whatever the sheet holds',
  'nothing in the private panel while the sheet is closed',
  'no private sheet, command control, private hook or role word on the table display',
  'no page error, failed request or refused request',
];

// A partial run is for trying one thing out. Its report says it is partial, and
// check-assets.mjs refuses a partial report.
const match = process.argv.slice(2).find(arg => arg.startsWith('--match='))?.slice('--match='.length) ?? null;
const labelOf = item => `${item.query} at ${item.width} x ${item.height}, default text ${item.defaultFontPx} px`;
const selected = match === null ? cases : cases.filter(item => labelOf(item).includes(match));
if (selected.length === 0) throw new Error(`No case matches ${match}`);

const server = await startStaticServer();
const failures = [];
let checked = 0;
let version = 'unknown';
let leastFree = { free: 1, label: '' };
try {
  for (const defaultFontPx of TEXT_SIZES.filter(size => selected.some(item => item.defaultFontPx === size))) {
    const chrome = await launchBrowser({ defaultFontPx: defaultFontPx === 16 ? null : defaultFontPx });
    version = chrome.version;
    try {
      const browser = await connect(chrome.endpoint);
      for (const item of selected.filter(candidate => candidate.defaultFontPx === defaultFontPx)) {
        const page = await openPage(browser, { width: item.width, height: item.height });
        await page.goto(`${server.origin}/prototypes/shell.html?${item.query}`);
        const result = await page.evaluate(measure);
        const label = labelOf(item);
        const fail = message => failures.push(`${label}: ${message}`);
        const wantsArt = !item.query.includes('art=none');
        if (wantsArt !== result.art.includes('public-board')) fail(`art is ${result.art.join(' ') || 'absent'}, which is not what the case asked for`);
        if (result.scrollWidth > result.viewport) fail(`scrolls sideways (${result.scrollWidth} > ${result.viewport})`);
        if (result.sideways.length > 0) fail(`drawn past the side of the screen: ${result.sideways.join('; ')}`);
        if (result.clipped.length > 0) fail(`cut off: ${result.clipped.join('; ')}`);
        if (result.small.length > 0) fail(`controls under ${minimumTarget} px: ${result.small.join('; ')}`);
        if (result.tokens.length > 0) fail(`tokens: ${result.tokens.join('; ')}`);
        if (result.board.length > 0) fail(`on the board: ${result.board.join('; ')}`);
        if (item.query.includes('identity=none') ? result.characters > 0 : result.characters === 0) fail(`${result.characters} seats are drawn with a character, which is not what the case asked for`);
        if (result.hiddenWords.length > 0) fail(`words hidden without art: ${result.hiddenWords.join('; ')}`);
        if (result.free !== null) {
          if (result.free < leastFree.free) leastFree = { free: result.free, label };
          if (result.free < 0.5) fail(`the phase caption and the dock leave ${Math.round(result.free * 100)}% of the screen height free`);
        }
        if (result.toggleInView === false) fail('the control that opens the private sheet is outside the screen');
        if (result.privateHooksOutside > 0) fail('a private hook is outside the private panel');
        if (result.roleWordsOutside) fail('a role, a team or a role style is outside the private panel');
        if (result.surface === 'table') {
          if (result.hasPrivateSheet) fail('the table display has a private sheet');
          if (result.commandControls > 0) fail('the table display has a control that sends a command or opens private information');
        } else if (!result.sheetOpen && result.privateContent > 0) fail('private content is in the document while the sheet is closed');
        for (const problem of page.problems()) fail(`page problem: ${problem}`);
        checked += 1;
        await page.close();
      }
      browser.close();
    } finally {
      await chrome.close();
    }
  }
} finally {
  await server.close();
}

const report = {
  note: 'Desktop Chrome on one machine laying out the Designer\'s hand-built copy of the shell markup. Not a phone, not Frontend\'s runtime, not a device measurement.',
  browser: version,
  inputsSha256: await reviewInputsSha256(repoRoot),
  minimumTargetCssPx: minimumTarget,
  casesChecked: checked,
  casesInTheMatrix: cases.length,
  ...(match === null ? {} : { partial: `only cases matching "${match}"` }),
  sizesCssPx: { playerWidths: PLAYER_WIDTHS, playerHeights: [760, 640, 568], tableWidths: TABLE_WIDTHS },
  browserDefaultTextPx: TEXT_SIZES,
  shotCardPictures: SPECIMENS,
  leastFreeScreenHeight: { share: Math.round(leastFree.free * 100) / 100, where: leastFree.label },
  assertions: ASSERTIONS,
  failures,
};
await writeFile(resolve(repoRoot, 'design/review/layout-check.json'), `${JSON.stringify(report, null, 2)}\n`);
for (const failure of failures.slice(0, 60)) console.error(`FAIL ${failure}`);
if (failures.length > 60) console.error(`… and ${failures.length - 60} more`);
console.log(`Layout check: ${checked} cases in ${version}; ${failures.length} failures; least free screen height ${Math.round(leastFree.free * 100)}% (${leastFree.label})`);
if (failures.length > 0) process.exitCode = 1;
