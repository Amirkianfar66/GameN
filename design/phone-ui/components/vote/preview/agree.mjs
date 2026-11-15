// mothership:dev-only
//
// The ballot and the result window beside the pack: the pinned prototype's own drawing of each vote and
// result frame (design/phone-ui/prototype/screens-vote.mjs with ui.mjs, kit.css and screens.css; the
// frozen Food release pins ui.mjs and kit.css, so they stay as they are) and the runtime component
// (../vote.mjs) in the phone shell, drawn in the same page from the same synthetic fixtures, compared
// frame by frame. Compared: the words (the sheet's title and footer, the notes above the roster, the
// stamp, the headline, its line and the foot), each seat's cell (its state, note, count, "You" and mark)
// and where each part sits, to within half a pixel. It is how the component shows it draws the pack's
// ballot and results and not a second design of them. The one accepted difference, the owner's T3 words under
// a cell that can't be chosen, is amended in the pack's drawing first and recorded (amendForT3 below).

import { VOTE_SCREENS } from '../../../prototype/screens-vote.mjs';
import { mountBallot, mountVoteResult } from '../vote.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { PACK_FRAMES } from './states.mjs';

const TOLERANCE = 0.5;

/**
 * The one accepted difference from the pinned pack, the owner's T3 (docs/design/owner-decisions.md, 11 November
 * 2026; the Lead's review of #267): a cell that can't be chosen shows the server's reason, or "Not available
 * now", never a reason worked out on the phone. The pack writes the person's public status there ("Injured",
 * "In Jail", "Out"), which under exactly those cells reads as one. Before comparing, the pack's drawing in this
 * page (never its source) is amended to the T3 words: on the ballot, "Not available now"; on the result, where
 * nothing is being chosen, no note. Each amendment is recorded; everything else is compared as the pack draws it.
 */
const STATUS_WORDS = Object.freeze(['Injured', 'In Jail', 'Out']);
const T3 = 'The owner\'s T3 (11 November 2026): the server\'s reason or "Not available now", never a reason worked out on the phone; the pack\'s public status under a cell that can\'t be chosen reads as one';
function amendForT3(pack, ballot) {
  const accepted = [];
  const grid = pack.querySelector(ballot ? '.sheet .grid9' : '.result-window .grid9');
  [...(grid?.children ?? [])].forEach((cell, i) => {
    const note = cell.querySelector('.cell-note');
    if (cell.dataset.state !== 'ineligible' || !note || !STATUS_WORDS.includes(note.textContent)) return;
    const amended = ballot ? 'Not available now' : null;
    accepted.push({ part: `seat ${i + 1}`, what: 'note', pack: note.textContent, amended, why: T3 });
    if (amended) note.textContent = amended; else note.remove();
  });
  return accepted;
}

/** Loads the pack's own stylesheets into this page, for the pack's half of the comparison. */
function loadPack() {
  // Literal URLs, so the bundler carries both files (a computed one would be left for run time).
  return Promise.all([new URL('../../../prototype/kit.css', import.meta.url), new URL('../../../prototype/screens.css', import.meta.url)].map(url => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url.href;
    const loaded = new Promise((done, fail) => { link.onload = done; link.onerror = () => fail(new Error(`${url.pathname} did not load`)); });
    document.head.append(link);
    return loaded;
  }));
}

/** Each case: a preview state, the pack's frame of it, and the size and text it is drawn at. */
const LARGE = { 'large-result-jailed': 'result-jailed', 'large-result-elected': 'result-elected', 'large-result-runoff': 'result-runoff',
  'large-jail-selected': 'jail-selected', 'large-captain': 'captain-open', 'large-runoff': 'captain-runoff' };
const CASES = [
  ...Object.keys(PACK_FRAMES).map(state => ({ state, frame: PACK_FRAMES[state], size: '390x844' })),
  ...Object.entries(LARGE).map(([state, like]) => ({ state, frame: PACK_FRAMES[like], size: '320x568', text: 200 })),
];

const visible = node => !!node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden' && getComputedStyle(node).display !== 'none';
function box(origin, node) {
  if (!visible(node) || !origin) return null;
  const f = origin.getBoundingClientRect(), r = node.getBoundingClientRect();
  return { x: r.left - f.left, y: r.top - f.top, w: r.width, h: r.height };
}
const words = node => (visible(node) ? node.innerText.replace(/\s+/g, ' ').trim() : null);
const near = (a, b) => (a === null || b === null ? a === b : ['x', 'y', 'w', 'h'].every(k => Math.abs(a[k] - b[k]) <= TOLERANCE));
const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));

/** What a cell shows: its state, note, count, "You" and mark. */
function cellFacts(cell, kit) {
  if (!cell) return null;
  const q = sel => cell.querySelector(sel);
  return {
    state: cell.dataset.state ?? null,
    note: words(q(kit ? '.ms-k-cell-note' : '.cell-note')) || null,
    count: words(q(kit ? '.ms-k-count' : '.count')),
    you: visible(q(kit ? '.ms-k-you' : '.you')),
    mark: visible(q(kit ? '.ms-k-cell-mark' : '.cell-mark')),
    name: words(q(kit ? '.ms-k-cell-name' : '.cell-name')),
  };
}

export async function runVoteAgreement({ sizes, versions, inputsFor }) {
  await loadPack();
  const checks = [];
  for (const c of CASES) {
    const size = sizes[c.size], { width, height, insets } = size;
    document.documentElement.style.fontSize = c.text ? `${c.text}%` : '';
    const [screen, ...rest] = c.frame.split('&');
    const params = Object.fromEntries(rest.map(kv => kv.split('=')));
    // The pack's phone (kit.css .ph, its safe areas as the review frames set them), drawn by the pack itself.
    const pack = document.createElement('div');
    pack.className = 'ph';
    Object.assign(pack.style, { position: 'absolute', left: '0', top: '0', width: `${width}px`, height: `${height}px` });
    pack.style.setProperty('--safe-t', `${insets.top}px`);
    pack.style.setProperty('--safe-b', `${insets.bottom}px`);
    document.body.append(pack);
    VOTE_SCREENS[screen](pack, params);
    const accepted = amendForT3(pack, screen === 'vote');
    // The component's phone: the shell, with the ballot in its sheet or the result over its stage.
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'absolute', left: `${width + 20}px`, top: '0', width: `${width}px`, height: `${height}px` });
    document.body.append(host);
    const { state, shell: shellInput, component } = inputsFor(c.state, size);
    const shell = mountPhoneShell(host, shellInput, {});
    const part = state.ballot ? mountBallot(shell.sheetBody, component, {}) : mountVoteResult(shell.stage, component);
    await document.fonts.ready;
    await frames();
    const differences = [];
    const compare = (part, what, a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) differences.push({ part, what, pack: a ?? null, component: b ?? null }); };
    const compareBox = (part, a, b) => { if (!near(a, b)) differences.push({ part, what: 'box', pack: a, component: b }); };
    let packGrid, ownGrid, packOrigin, ownOrigin;
    if (state.ballot) {
      const sheetA = pack.querySelector('.sheet'), sheetB = shell.element.querySelector('.ms-ps-sheet');
      compare('sheet', 'title', words(sheetA?.querySelector('.sheet-title h2')), words(sheetB?.querySelector('.ms-ps-sheet-title h2')));
      compare('sheet', 'sub', words(sheetA?.querySelector('.sheet-title p')), words(sheetB?.querySelector('.ms-ps-sheet-title p')));
      const foot = (root, sel) => [...(root?.querySelectorAll(sel) ?? [])].map(b => ({ label: words(b), off: b.getAttribute('aria-disabled') === 'true' }));
      compare('sheet', 'footer', foot(sheetA, '.sheet-foot .btn'), foot(sheetB, '.ms-ps-sheet-foot .ms-k-btn'));
      compare('notes', 'pill', words(sheetA?.querySelector('.sheet-body .pill')), words(part.element.querySelector('.ms-ballot-notes .ms-k-pill')));
      compare('notes', 'note', words(sheetA?.querySelector('.sheet-body .group-note')), words(part.element.querySelector('.ms-ballot-notes .ms-k-group-note')));
      packGrid = sheetA?.querySelector('.grid9'); ownGrid = part.element.querySelector('.ms-vote-grid');
      packOrigin = packGrid; ownOrigin = ownGrid;
      compare('roster', 'name', packGrid?.getAttribute('aria-label') ?? null, ownGrid?.getAttribute('aria-label') ?? null);
      compareBox('roster', box(sheetA?.querySelector('.sheet-body'), packGrid), box(shell.sheetBody, ownGrid));
    } else {
      const winA = pack.querySelector('.result-window'), winB = part.element;
      compareBox('window', box(pack, winA), box(host, winB));
      compare('window', 'name', winA?.getAttribute('aria-label') ?? null, winB.getAttribute('aria-label'));
      compare('head', 'tone', winA?.querySelector('.result-head')?.dataset.tone ?? null, winB.querySelector('.ms-result-head')?.dataset.tone ?? null);
      compare('head', 'stamp', words(winA?.querySelector('.result-stamp .stamp')), words(winB.querySelector('.ms-result-stamp .ms-k-stamp')));
      compare('head', 'stamp tone', winA?.querySelector('.result-stamp .stamp')?.dataset.tone ?? null, winB.querySelector('.ms-result-stamp .ms-k-stamp')?.dataset.tone ?? null);
      compare('head', 'headline', words(winA?.querySelector('.result-head h2')), words(winB.querySelector('.ms-result-title')));
      compare('head', 'line', words(winA?.querySelector('.result-head p')), words(winB.querySelector('.ms-result-line')));
      compare('foot', 'words', words(winA?.querySelector('.result-foot')), words(winB.querySelector('.ms-result-foot')));
      for (const [name, a, b] of [['head', '.result-head', '.ms-result-head'], ['art', '.result-head .piece', '.ms-result-art'], ['stamp', '.result-stamp', '.ms-result-stamp'],
        ['headline', '.result-head h2', '.ms-result-title'], ['line', '.result-head p', '.ms-result-line'], ['body', '.result-body', '.ms-result-body'], ['foot', '.result-foot', '.ms-result-foot']]) {
        compareBox(name, box(winA, winA?.querySelector(a)), box(winB, winB.querySelector(b)));
      }
      packGrid = winA?.querySelector('.grid9'); ownGrid = winB.querySelector('.ms-k-grid9');
      packOrigin = winA; ownOrigin = winB;
    }
    // Seat by seat: seat n is cell n in both.
    const seats = [];
    for (let n = 1; n <= 9; n += 1) {
      const a = packGrid?.children[n - 1] ?? null, b = ownGrid?.children[n - 1] ?? null;
      const fa = cellFacts(a, false), fb = cellFacts(b, true);
      seats.push({ seat: n, pack: fa, component: fb });
      compare(`seat ${n}`, 'cell', fa, fb);
      compareBox(`seat ${n}`, box(packOrigin, a), box(ownOrigin, b));
      // The badges inside the cell: the count holds the top-left corner, "You" and the check the top-right.
      for (const [badge, sa, sb] of [['count', '.count', '.ms-k-count'], ['you', '.you', '.ms-k-you'], ['mark', '.cell-mark', '.ms-k-cell-mark']]) {
        if (a && b) compareBox(`seat ${n} ${badge}`, box(a, a.querySelector(sa)), box(b, b.querySelector(sb)));
      }
    }
    checks.push({ id: `agree: ${c.state} (${c.frame})${c.text ? ` at ${c.text}% text, ${width} × ${height}` : ''}`, ok: differences.length === 0, detail: { differences, accepted, seats } });
    part.dispose();
    shell.dispose();
    pack.remove();
    host.remove();
  }
  document.documentElement.style.fontSize = '';
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

