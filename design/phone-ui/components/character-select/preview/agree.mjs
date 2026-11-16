// mothership:dev-only
//
// The screen beside the pack: the frozen prototype's character selection (design/phone-ui/prototype/
// screens-entry.mjs ENTRY_SCREENS.choose, with kit.css and screens.css) and the runtime screen
// (../character-select.mjs), drawn in the same page at the same size, compared case by case: the words, the
// states, the look and where each part sits, to within half a pixel. It is how the screen shows it draws
// sheet 16 and not a second design of it.
//
// One accepted difference, at the Largest text only: the kit's 3 × 3 sits in its container (kit.css
// .ms-k-grid-wrap, the pack's own .grid-wrap rule), so where it has under 13 of its em across it becomes a
// list, every name whole, as the pack's rosters do; the pack's choose grid is not in a .grid-wrap, so it keeps
// the 3 × 3 with each name cut to a letter or two. For that case the pack's grid is put in a .grid-wrap, so its
// own list rule applies and everything else is compared as usual, and the case records the list against the
// pack as it is.

import { ENTRY_SCREENS } from '../../../prototype/screens-entry.mjs';
import { mountState } from './preview.mjs';

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

/** The parts compared, every match in order: [name, the pack's selector, the screen's selector, words, look]. */
const PARTS = [
  ['bar', '.tb', '.ms-ps-tb', false, null],
  ['title', '.tb-name', '.ms-ps-name', true, ['fontSize', 'fontWeight', 'color']],
  ['sub', '.tb-sub', '.ms-ps-sub', true, ['fontSize', 'color']],
  ['glyph', '.tb-glyph', '.ms-ps-glyph', false, ['backgroundColor', 'color']],
  ['glyph icon', '.tb-glyph svg', '.ms-ps-glyph svg', false, null],
  ['timer', '.timer', '.ms-ps-timer', true, ['backgroundColor', 'color', 'fontSize', 'fontWeight']],
  ['timer icon', '.timer svg', '.ms-ps-timer svg', false, null],
  ['grid', '.choose-grid', '.ms-cs-grid', false, null],
  ['cells', '.choose-grid .cell', '.ms-cs-grid .ms-k-cell', true, ['backgroundColor', 'boxShadow', 'borderRadius', 'padding']],
  ['portraits', '.choose-grid .cell .pt', '.ms-cs-grid .ms-k-cell .ms-k-pt', false, ['opacity']],
  ['names', '.choose-grid .cell-name', '.ms-cs-grid .ms-k-cell-name', true, ['opacity']],
  ['name words', '.choose-grid .cell-name > span:last-child', '.ms-cs-grid .ms-k-cell-label', true, ['fontSize', 'fontWeight', 'fontFamily', 'letterSpacing', 'textTransform', 'color']],
  ['notes', '.choose-grid .cell-note', '.ms-cs-grid .ms-k-cell-note', true, ['fontSize', 'fontWeight', 'color']],
  ['marks', '.choose-grid .cell-mark', '.ms-cs-grid .ms-k-cell-mark', false, ['backgroundColor', 'color', 'borderRadius']],
  ['mark icons', '.choose-grid .cell-mark svg', '.ms-cs-grid .ms-k-cell-mark svg', false, null],
  ['foot', '.choose-foot', '.ms-cs-foot', false, null],
  ['foot portrait', '.choose-foot > .pt', '.ms-cs-foot > .ms-k-pt', false, ['backgroundColor', 'borderRadius', 'boxShadow']],
  ['foot tile icon', '.choose-foot > .pt svg', '.ms-cs-foot > .ms-k-pt svg', false, ['color']],
  ['foot name', '.choose-foot .who b', '.ms-cs-foot .ms-cs-name', true, ['fontSize', 'fontWeight', 'color']],
  ['foot line', '.choose-foot .who > span', '.ms-cs-foot .ms-cs-line', true, ['fontSize', 'fontWeight', 'color']],
  ['spinner', '.choose-foot .spinner', '.ms-cs-foot .ms-k-spinner', false, ['borderTopColor', 'borderRightColor', 'borderTopWidth']],
  ['pill', '.choose-foot .pill', '.ms-cs-foot .ms-k-pill', true, ['backgroundColor', 'color', 'fontSize', 'fontWeight']],
  ['pill icon', '.choose-foot .pill svg', '.ms-cs-foot .ms-k-pill svg', false, null],
  ['toast', '.toast', '.ms-ps-toast', true, ['backgroundColor', 'color', 'fontSize', 'fontWeight']],
  ['toast icon', '.toast svg', '.ms-ps-toast svg', false, null],
];

/** Each case: the pack's state, the preview's state, a size, and the text size if not the Standard. */
const CASES = [
  { id: 'open at 390 × 844', pack: { state: 'open' }, state: 'open', size: '390x844' },
  { id: 'selected · saving at 390 × 844', pack: { state: 'selected' }, state: 'selected', size: '390x844' },
  { id: 'confirmed · taken at 390 × 844', pack: { state: 'confirmed' }, state: 'confirmed', size: '390x844' },
  { id: 'last seconds at 390 × 844', pack: { state: 'closing' }, state: 'closing', size: '390x844' },
  { id: 'assigned automatically, its toast, at 390 × 844', pack: { state: 'auto' }, state: 'auto', size: '390x844' },
  { id: 'open at 430 × 932', pack: { state: 'open' }, state: 'open', size: '430x932' },
  { id: 'confirmed · taken at 430 × 932', pack: { state: 'confirmed' }, state: 'confirmed', size: '430x932' },
  { id: 'assigned automatically at 430 × 932', pack: { state: 'auto' }, state: 'auto', size: '430x932' },
  { id: 'confirmed with the Large text (150 %) at 390 × 844', pack: { state: 'confirmed' }, state: 'large', size: '390x844', text: 150 },
  { id: 'confirmed with the Largest text (200 %) at 430 × 932', pack: { state: 'confirmed' }, state: 'largest', size: '430x932', text: 200, list: true },
];

const visible = node => !!node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden' && !node.closest('[hidden]');
function box(frame, node) {
  const f = frame.getBoundingClientRect(), r = node.getBoundingClientRect();
  return { x: r.left - f.left, y: r.top - f.top, w: r.width, h: r.height };
}
const textOf = node => node.innerText.replace(/\s+/g, ' ').trim();
const near = (a, b) => ['x', 'y', 'w', 'h'].every(k => Math.abs(a[k] - b[k]) <= TOLERANCE);
const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
const looks = (node, props) => Object.fromEntries(props.map(p => [p, getComputedStyle(node)[p]]));
const STATE_ATTRS = ['aria-disabled', 'aria-busy', 'aria-pressed', 'aria-label', 'role', 'data-state', 'data-urgent'];
/** An icon's drawing: its paths and shapes, without the class each side gives it. */
const drawing = svg => svg.innerHTML.replace(/\s+/g, ' ').trim();
/** Every picture in a part has loaded (the pack's are <img>; the screen's are backgrounds on the crew bundle's properties). */
const pictures = root => Promise.all([...root.querySelectorAll('img')].map(img => (img.complete ? null : new Promise(done => { img.onload = done; img.onerror = done; }))));
/** Whether the 3 × 3 is a list: its second cell under its first. */
const isList = grid => grid.children[1].getBoundingClientRect().top > grid.children[0].getBoundingClientRect().bottom - TOLERANCE;

export async function runCharacterSelectAgreement({ sizes, states }) {
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
    ENTRY_SCREENS.choose(pack, c.pack);
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'absolute', left: `${size.width + 20}px`, top: '0', width: `${size.width}px`, height: `${size.height}px` });
    document.body.append(pack, host);
    const screen = mountState(host, c.state, size.insets);
    await document.fonts.ready;
    await pictures(pack);
    await frames();
    // The toast's arrival ends where it rests; the spinners turn, and their first frame is compared.
    for (const a of [...pack.getAnimations({ subtree: true }), ...host.getAnimations({ subtree: true })]) {
      try { a.finish(); } catch { a.pause(); a.currentTime = 0; }
    }
    await frames();
    const root = screen.element;
    // The list at the Largest text: the pack as it is, then (for that case) its grid in the pack's own .grid-wrap.
    const packGrid = pack.querySelector('.choose-grid'), mineGrid = root.querySelector('.ms-cs-grid');
    const asIs = { pack: box(pack, packGrid), screen: box(host, mineGrid), packList: isList(packGrid), screenList: isList(mineGrid) };
    let accepted = null;
    if (c.list) {
      const wrap = document.createElement('div');
      wrap.className = 'grid-wrap';
      packGrid.replaceWith(wrap);
      wrap.append(packGrid);
      await frames();
      accepted = { what: 'the 3 × 3 becomes a list at the Largest text, every name whole (the kit\'s .ms-k-grid-wrap, the pack\'s own .grid-wrap rule)', ...asIs };
    }
    const differences = [], parts = {};
    for (const [name, packSel, mineSel, compareWords, props] of PARTS) {
      const a = [...pack.querySelectorAll(packSel)].filter(visible), b = [...root.querySelectorAll(mineSel)].filter(visible);
      parts[name] = { pack: a.length, screen: b.length };
      if (a.length !== b.length) { differences.push({ part: name, what: 'count', pack: a.length, screen: b.length }); continue; }
      a.forEach((na, i) => {
        const nb = b[i], pa = box(pack, na), pb = box(host, nb);
        if (!near(pa, pb)) differences.push({ part: `${name} ${i + 1}`, what: 'box', pack: pa, screen: pb });
        if (compareWords && textOf(na) !== textOf(nb)) differences.push({ part: `${name} ${i + 1}`, what: 'words', pack: textOf(na), screen: textOf(nb) });
        if (props) { const la = looks(na, props), lb = looks(nb, props); if (JSON.stringify(la) !== JSON.stringify(lb)) differences.push({ part: `${name} ${i + 1}`, what: 'look', pack: la, screen: lb }); }
        if (na.tagName === 'svg' && drawing(na) !== drawing(nb)) differences.push({ part: `${name} ${i + 1}`, what: 'drawing', pack: drawing(na).slice(0, 160), screen: drawing(nb).slice(0, 160) });
        for (const attr of STATE_ATTRS) {
          const va = na.getAttribute(attr), vb = nb.getAttribute(attr);
          if (va !== null && va !== vb) differences.push({ part: `${name} ${i + 1}`, what: attr, pack: va, screen: vb });
          if (va === null && vb !== null && attr === 'aria-disabled' && vb === 'true') differences.push({ part: `${name} ${i + 1}`, what: attr, pack: va, screen: vb });
        }
      });
    }
    // The pack's portraits are the crew release's pictures; the screen's, the same files through the crew bundle's properties.
    // The bundle names its copies with a hash (portrait-c1-VMeNAzm6.svg); the file is the same.
    const pictureOf = node => (node.tagName === 'IMG' ? node.src.replace(/^.*\//, '') : (getComputedStyle(node).backgroundImage.match(/([^/"]+\.svg)/)?.[1]?.replace(/-[A-Za-z0-9_-]{8}\.svg$/, '.svg') ?? null));
    const packPictures = [...pack.querySelectorAll('.choose-grid .cell .pt, .choose-foot > img.pt')].map(pictureOf);
    const minePictures = [...root.querySelectorAll('.ms-cs-grid .ms-k-cell .ms-k-pt, .ms-cs-foot > .ms-k-pt:not(.ms-k-pt-empty)')].map(pictureOf);
    if (JSON.stringify(packPictures) !== JSON.stringify(minePictures)) differences.push({ part: 'pictures', what: 'files', pack: packPictures, screen: minePictures });
    // A list case shows the screen's nine as a list, as the pack's own rule draws them; a Standard case, the 3 × 3 as the pack.
    const fits = c.list ? accepted.screenList && !accepted.packList && isList(packGrid) : !asIs.screenList && !asIs.packList;
    checks.push({ id: `agree: ${c.id}`, ok: differences.length === 0 && fits, detail: { differences, parts, accepted } });
    screen.dispose();
    pack.remove();
    host.remove();
  }
  document.documentElement.style.fontSize = '';
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}
