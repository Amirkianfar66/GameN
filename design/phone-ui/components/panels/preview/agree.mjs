// mothership:dev-only
//
// The sheet beside the pack: the frozen prototype's Panels, Players and Round order screens (design/phone-ui/prototype/
// screens-game.mjs GAME_SCREENS.panels; screens-more.mjs MORE_SCREENS.players and MORE_SCREENS.rules; with kit.css and
// screens.css), and the runtime component (../panels.mjs) in the phone shell's sheet, with its frame from
// panelsSheet(), drawn in the same page at the same size, compared case by case: the words, the states, the look and
// where each part sits, to within half a pixel. It is how the component shows it draws sheet 32 and not a second
// design of it.
//
// Not compared: the room behind the sheet (the room scene's own agreement), the top bar and the tabs (the phone
// shell's), and what the pack does not draw: a destination this player can use (the Captain's Navigation), no window,
// a jailed player and reconnecting (the probe and the captures check them).
//
// One recorded difference, in Round order only (the Lead's review of #296, answer 5): the pack's note under the steps
// ("Current order. The owner's Blackout-before-voting order is an Integration proposal, pending the rules update.") is
// the rules' business, not the component's, so the component draws no note. Those cases record the note's absence;
// everything else is compared as usual.
//
// One named departure, in the Panels list only (the owner, 19 November 2026: "i want all follow a shared system"; on
// draft 4, "As you recommended"; the Lead's option A): the destinations the pack draws as rows are cells on the Actions
// grid. Each such row is compared with its cell by its words, in order (its title as the cell's name, its line as the
// note), and is left out of the rows' and lists' own comparison, as the cells are out of everything else; where the
// sheet is shorter for it, a part that only moved up or down is counted under the departure. Everything else is
// compared as usual.

import { GAME_SCREENS } from '../../../prototype/screens-game.mjs';
import { MORE_SCREENS } from '../../../prototype/screens-more.mjs';
import { splitLook090 } from '../../kit/preview/look-0-9-0.mjs';

const TOLERANCE = 0.5;

function loadPack() {
  return Promise.all(['kit.css', 'screens.css'].map(file => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL(`../../../prototype/${file}`, import.meta.url).href;
    const loaded = new Promise((done, fail) => { link.onload = done; link.onerror = () => fail(new Error(`${file} did not load`)); });
    document.head.append(link);
    return loaded;
  }));
}

/** The parts compared, every match in order: [name, the pack's selector, the component's selector, words, look]. */
const FRAME = [
  ['sheet', '.sheet', '.ms-ps-sheet', false, null],
  ['sheet title', '.sheet-title h2', '.ms-ps-sheet-title h2', true, ['fontSize', 'fontWeight']],
  ['sheet line', '.sheet-title p', '.ms-ps-sheet-title p', true, ['fontSize', 'color']],
  ['sheet body', '.sheet-body', '.ms-ps-sheet-body', false, null],
  ['footer', '.sheet-foot', '.ms-ps-sheet-foot', false, null],
];
const BODY = [
  ['lists', '.list', '.ms-k-list', false, ['backgroundColor', 'borderRadius', 'boxShadow']],
  ['rows', '.row', '.ms-k-row', true, ['minHeight', 'opacity']],
  ['row mains', '.row-main', '.ms-k-row-main', false, ['opacity']],
  ['row icons', '.row-icon', '.ms-k-row-icon', false, ['backgroundColor', 'color', 'borderRadius', 'opacity']],
  ['row icon drawings', '.row-icon svg', '.ms-k-row-icon svg', false, null],
  ['row portraits', '.row > .pt', '.ms-k-row .ms-k-pt', false, null],
  ['row titles', '.row-title', '.ms-k-row-title', true, ['fontSize', 'fontWeight', 'color']],
  ['row lines', '.row-sub', '.ms-k-row-sub', true, ['fontSize', 'fontWeight', 'color']],
  ['row chevrons', '.row-chev', '.ms-k-row-chev', false, ['color']],
  ['row chevron drawings', '.row-chev svg', '.ms-k-row-chev svg', false, null],
  ['badges', '.row .pill', '.ms-k-row .ms-k-pill', true, ['backgroundColor', 'color', 'fontSize', 'fontWeight', 'borderRadius']],
  ['badge icons', '.row .pill svg', '.ms-k-row .ms-k-pill svg', false, ['color']],
  ['note', '.group-note', '.ms-k-group-note', true, ['fontSize', 'color']],
];

/** Each case: the pack's screen, the preview's state, a size, and the text size if not the Standard. */
const CASES = [
  { id: 'Panels at 390 × 844', screen: () => GAME_SCREENS.panels, state: 'list', size: '390x844', cells: true },
  { id: 'Panels at 430 × 932', screen: () => GAME_SCREENS.panels, state: 'list', size: '430x932', cells: true },
  { id: 'Players at 390 × 844', screen: () => MORE_SCREENS.players, state: 'players', size: '390x844' },
  { id: 'Players at 430 × 932', screen: () => MORE_SCREENS.players, state: 'players', size: '430x932' },
  { id: 'Round order at 390 × 844', screen: () => MORE_SCREENS.rules, state: 'order', size: '390x844', noNote: true },
  { id: 'Round order at 430 × 932', screen: () => MORE_SCREENS.rules, state: 'order', size: '430x932', noNote: true },
  { id: 'Players with the Largest text (200 %) at 390 × 844', screen: () => MORE_SCREENS.players, state: 'largest', size: '390x844', text: 200 },
];

const visible = node => !!node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden' && !node.closest('[hidden]');
function box(frame, node) {
  const f = frame.getBoundingClientRect(), r = node.getBoundingClientRect();
  return { x: r.left - f.left, y: r.top - f.top, w: r.width, h: r.height };
}
const textOf = node => (node.innerText ?? node.textContent).replace(/\s+/g, ' ').trim();
const near = (a, b) => ['x', 'y', 'w', 'h'].every(k => Math.abs(a[k] - b[k]) <= TOLERANCE);
const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
const looks = (node, props) => Object.fromEntries(props.map(p => [p, getComputedStyle(node)[p]]));
const STATE_ATTRS = ['aria-disabled', 'aria-busy', 'aria-label', 'role'];
/** A box that only moved up or down, or grew or shrank in height. */
const movedVertically = (a, b) => Math.abs(a.x - b.x) <= TOLERANCE && Math.abs(a.w - b.w) <= TOLERANCE;
const DEPARTURE = 'the destinations are cells on the Actions grid, not rows (the owner, 19 November 2026, draft 4; the Lead\'s option A)';
/**
 * The owner's cells: the component's cells in `grid`, and the pack's rows whose titles are those cells' names, in
 * order. A row whose words differ stays a row, and fails as one.
 */
function cellsOf(pack, host, grid) {
  const node = host.querySelector(grid);
  const cells = node ? [...node.querySelectorAll(':scope > .ms-k-tile')].filter(visible) : [];
  if (!cells.length) return null;
  const names = new Set(cells.map(c => textOf(c.querySelector('.ms-k-tile-name'))));
  const rows = [...pack.querySelectorAll('.sheet .row')].filter(visible).filter(r => names.has(textOf(r.querySelector('.row-title'))));
  const words = (n, title, line) => { const l = n.querySelector(line); return { title: textOf(n.querySelector(title)), line: l && visible(l) ? textOf(l) : null }; };
  return {
    grid: node, cells, rows,
    inRows: n => rows.some(r => r === n || r.contains(n)),
    // A list all of whose rows are now cells: it has no counterpart.
    listGone: n => n.matches('.list') && (() => { const own = [...n.querySelectorAll('.row')].filter(visible); return own.length > 0 && own.every(r => rows.includes(r)); })(),
    inGrid: n => node === n || node.contains(n),
    pairs: { pack: rows.map(r => words(r, '.row-title', '.row-sub')), screen: cells.map(c => words(c, '.ms-k-tile-name', '.ms-k-tile-note')) },
  };
}
/** A node's accessible name from its own attributes: aria-label, or the words of what aria-labelledby names. */
const nameOf = node => node.getAttribute('aria-label') ?? (node.getAttribute('aria-labelledby')?.split(/\s+/).map(id => document.getElementById(id)?.textContent ?? '').join(' ').trim() || null);
/** An icon's drawing: its paths and shapes, without the class each side gives it. */
const drawing = svg => svg.innerHTML.replace(/\s+/g, ' ').trim();
/** Every picture in a part has loaded (the pack's are <img>; the component's are backgrounds on the crew bundle's properties). */
const pictures = root => Promise.all([...root.querySelectorAll('img')].map(img => (img.complete ? null : new Promise(done => { img.onload = done; img.onerror = done; }))));

export async function runPanelsAgreement({ sizes, mountState, disposeState }) {
  await loadPack();
  const checks = [];
  for (const c of CASES) {
    const size = sizes[c.size];
    document.documentElement.style.fontSize = c.text ? `${c.text}%` : '';
    const pack = document.createElement('div');
    pack.className = 'ph';
    Object.assign(pack.style, { position: 'absolute', left: '0', top: '0', width: `${size.width}px`, height: `${size.height}px` });
    pack.style.setProperty('--safe-t', `${size.insets.top}px`);
    pack.style.setProperty('--safe-b', `${size.insets.bottom}px`);
    document.body.append(pack);
    c.screen()(pack, {});
    const host = document.createElement('div');
    host.className = 'pv-agree-host';
    Object.assign(host.style, { position: 'absolute', left: `${size.width + 20}px`, top: '0', width: `${size.width}px`, height: `${size.height}px` });
    document.body.append(host);
    const mounted = mountState(host, c.state, size.insets);
    await document.fonts.ready;
    await pictures(pack);
    await frames();
    // The sheet's arrival ends where it rests.
    for (const a of [...pack.getAnimations({ subtree: true }), ...host.getAnimations({ subtree: true })]) {
      try { a.finish(); } catch { a.pause(); a.currentTime = 0; }
    }
    await frames();
    const differences = [], parts = {};
    let recorded = null;
    // The owner's cells (the departure above): the rows they were, compared by their words; out of the rest.
    const own = cellsOf(pack, host, '.ms-pn-tiles');
    let departure = null;
    if (own) {
      if (JSON.stringify(own.pairs.pack) !== JSON.stringify(own.pairs.screen)) differences.push({ part: 'cells', what: 'words', pack: own.pairs.pack, screen: own.pairs.screen });
      departure = { what: DEPARTURE, rows: own.rows.length, cells: own.cells.length, movedVertically: 0 };
    }
    for (const [name, packSel, mineSel, compareWords, props] of [...FRAME, ...BODY]) {
      let a = [...pack.querySelectorAll(packSel)].filter(visible), b = [...host.querySelectorAll(mineSel)].filter(visible);
      if (own) { a = a.filter(n => !own.inRows(n) && !own.listGone(n)); b = b.filter(n => !own.inGrid(n)); }
      parts[name] = { pack: a.length, screen: b.length };
      // Round order: the pack's note is the rules' business; its absence is recorded, not compared (answer 5).
      if (c.noNote && name === 'note' && a.length === 1 && b.length === 0) {
        recorded = { what: 'no note: the pending Blackout-before-voting order is the rules\' business, not the component\'s (the Lead\'s review of #296, answer 5)', pack: textOf(a[0]) };
        continue;
      }
      if (a.length !== b.length) { differences.push({ part: name, what: 'count', pack: a.length, screen: b.length }); continue; }
      a.forEach((na, i) => {
        const nb = b[i], pa = box(pack, na), pb = box(host, nb);
        if (!near(pa, pb)) {
          // With the cells the list is shorter: what only moved up or down, the sheet with it, is the departure's.
          if (departure && movedVertically(pa, pb)) departure.movedVertically += 1;
          else differences.push({ part: `${name} ${i + 1}`, what: 'box', pack: pa, screen: pb });
        }
        if (compareWords && textOf(na) !== textOf(nb)) differences.push({ part: `${name} ${i + 1}`, what: 'words', pack: textOf(na), screen: textOf(nb) });
        if (props) { const la = looks(na, props), lb = looks(nb, props); if (JSON.stringify(la) !== JSON.stringify(lb)) differences.push({ part: `${name} ${i + 1}`, what: 'look', pack: la, screen: lb }); }
        if (na.tagName === 'svg' && drawing(na) !== drawing(nb)) differences.push({ part: `${name} ${i + 1}`, what: 'drawing', pack: drawing(na).slice(0, 160), screen: drawing(nb).slice(0, 160) });
        for (const attr of STATE_ATTRS) {
          // A name is compared as a name: the shell names its sheet by its title (aria-labelledby), the pack by aria-label.
          const va = attr === 'aria-label' ? nameOf(na) : na.getAttribute(attr), vb = attr === 'aria-label' ? nameOf(nb) : nb.getAttribute(attr);
          if (va !== null && va !== vb) differences.push({ part: `${name} ${i + 1}`, what: attr, pack: va, screen: vb });
          if (va === null && vb !== null && attr === 'aria-disabled' && vb === 'true') differences.push({ part: `${name} ${i + 1}`, what: attr, pack: va, screen: vb });
        }
      });
    }
    // The pack's portraits are the crew release's pictures; the component's, the same files through the crew bundle's properties.
    const pictureOf = node => (node.tagName === 'IMG' ? node.src.replace(/^.*\//, '') : (getComputedStyle(node).backgroundImage.match(/([^/"]+\.svg)/)?.[1]?.replace(/-[A-Za-z0-9_-]{8}\.svg$/, '.svg') ?? null));
    const packPictures = [...pack.querySelectorAll('.sheet .row > .pt')].map(pictureOf), minePictures = [...host.querySelectorAll('.ms-panels .ms-k-row .ms-k-pt')].map(pictureOf);
    if (JSON.stringify(packPictures) !== JSON.stringify(minePictures)) differences.push({ part: 'portraits', what: 'files', pack: packPictures, screen: minePictures });
    checks.push({ id: `agree: ${c.id}`, ok: splitLook090(differences).kept.length === 0 && (!c.noNote || recorded !== null) && (!c.cells || departure !== null), detail: { differences: splitLook090(differences).kept, look090: splitLook090(differences).look, parts, recorded, departure } });
    disposeState(mounted);
    pack.remove();
    host.remove();
  }
  document.documentElement.style.fontSize = '';
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}
