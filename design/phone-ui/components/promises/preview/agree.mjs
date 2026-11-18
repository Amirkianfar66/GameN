// mothership:dev-only
//
// The sheet beside the pack: the frozen prototype's promises screen (design/phone-ui/prototype/screens-more.mjs
// MORE_SCREENS.promises, with kit.css and screens.css) in its list, offered, kinds, confirm, incoming and results
// states (sheets 33 and 33.1), and the runtime component (../promises.mjs) in the phone shell's sheet, with its frame
// and footer from promisesSheet(), drawn in the same page at the same size, compared case by case: the words, the
// states, the look and where each part sits, to within half a pixel. It is how the component shows it draws sheets
// 33 and 33.1 and not a second design of them.
//
// Not compared: the room behind the sheet (the room scene's own agreement), the top bar and the tabs (the phone
// shell's), and what the pack does not draw: Jail Vote's player (an undrawn state, the Lead's answer 4), a command in
// flight or refused, and reconnecting (the probe and the captures check them).
//
// A result's badge sits in the row's value, in the pack (.row-value > .pill) as in the kit (0.6.1: a row's value takes
// a node), so the values are compared as they are, and the badges by their own boxes, words and looks too.

import { MORE_SCREENS } from '../../../prototype/screens-more.mjs';

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
  ['footer buttons', '.sheet-foot .btn', '.ms-ps-sheet-foot .ms-k-btn', true, ['backgroundColor', 'color', 'boxShadow', 'fontSize', 'fontWeight', 'borderRadius']],
];
const BODY = [
  ['group labels', '.group-label', '.ms-k-group-label', true, ['fontSize', 'fontWeight', 'color', 'textTransform', 'letterSpacing']],
  ['lists', '.list', '.ms-k-list', false, ['backgroundColor', 'borderRadius', 'boxShadow']],
  ['rows', '.row', '.ms-k-row', true, ['minHeight', 'opacity']],
  ['row icons', '.row-icon', '.ms-k-row-icon', false, ['backgroundColor', 'color', 'borderRadius']],
  ['row icon drawings', '.row-icon svg', '.ms-k-row-icon svg', false, null],
  ['row portraits', '.row > .pt', '.ms-k-row .ms-k-pt', false, null],
  ['row titles', '.row-title', '.ms-k-row-title', true, ['fontSize', 'fontWeight', 'color']],
  ['row lines', '.row-sub', '.ms-k-row-sub', true, ['fontSize', 'fontWeight', 'color']],
  ['row values', '.row-value', '.ms-k-row-value', true, ['fontSize', 'color']],
  ['row chevrons', '.row-chev', '.ms-k-row-chev', false, ['color']],
  ['row chevron drawings', '.row-chev svg', '.ms-k-row-chev svg', false, null],
  ['badges', '.row .pill', '.ms-k-row .ms-k-pill', true, ['backgroundColor', 'color', 'fontSize', 'fontWeight', 'borderRadius']],
  ['badge icons', '.row .pill svg', '.ms-k-row .ms-k-pill svg', false, ['color']],
  ['tiles', '.tiles', '.ms-k-tiles', false, null],
  ['tile', '.tile', '.ms-k-tile', false, ['backgroundColor', 'boxShadow', 'borderRadius', 'minHeight']],
  ['tile icons', '.tile .tile-icon', '.ms-k-tile-icon', false, ['backgroundColor', 'color', 'borderRadius']],
  ['tile icon drawings', '.tile .tile-icon svg', '.ms-k-tile-icon svg', false, null],
  ['tile names', '.tile b', '.ms-k-tile-name', true, ['fontSize', 'fontWeight', 'color']],
  ['tile lines', '.tile small', '.ms-k-tile-note', true, ['fontSize', 'fontWeight', 'color']],
  ['paper card', '.comic', '.ms-k-comic', false, ['backgroundColor', 'color', 'borderTopWidth', 'borderTopColor', 'borderRadius', 'boxShadow', 'padding']],
  ['card icon', '.comic .tile-icon', '.ms-pr-card-icon', false, ['backgroundColor', 'color', 'borderRadius']],
  ['card icon drawing', '.comic .tile-icon svg', '.ms-pr-card-icon svg', false, null],
  ['card portrait', '.comic .pt', '.ms-k-comic .ms-k-pt', false, null],
  ['card name', '.comic b', '.ms-pr-card-name', true, ['fontSize', 'fontWeight', 'fontFamily', 'letterSpacing', 'textTransform', 'color']],
  ['card terms', '.comic p', '.ms-pr-card-terms', true, ['fontSize', 'fontWeight', 'color', 'lineHeight']],
  ['facts', '.facts', '.ms-k-facts', false, null],
  ['fact lines', '.facts li', '.ms-k-fact', true, ['fontSize', 'fontWeight', 'color']],
  ['fact icons', '.facts li svg', '.ms-k-fact svg', false, ['color']],
  ['notes', '.group-note', '.ms-k-group-note', true, ['fontSize', 'color']],
];

/** Each case: the pack's parameters, the preview's state, a size, and the text size if not the Standard. */
const CASES = [
  { id: 'Promises in a talk at 390 × 844', pack: { state: 'list' }, state: 'list', size: '390x844' },
  { id: 'Promises in a talk at 430 × 932', pack: { state: 'list' }, state: 'list', size: '430x932' },
  { id: 'Promises with Dev\'s offer waiting at 390 × 844', pack: { state: 'offered' }, state: 'offered', size: '390x844' },
  { id: 'Offer to Ava, the six kinds, at 390 × 844', pack: { state: 'kinds' }, state: 'kinds', size: '390x844' },
  { id: 'Offer to Ava, the six kinds, at 430 × 932', pack: { state: 'kinds' }, state: 'kinds', size: '430x932' },
  { id: 'Check the terms at 390 × 844', pack: { state: 'confirm' }, state: 'confirm', size: '390x844' },
  { id: 'Check the terms at 430 × 932', pack: { state: 'confirm' }, state: 'confirm', size: '430x932' },
  { id: 'Offer from Ava at 390 × 844', pack: { state: 'incoming' }, state: 'incoming', size: '390x844' },
  { id: 'Offer from Ava at 430 × 932', pack: { state: 'incoming' }, state: 'incoming', size: '430x932' },
  { id: 'Results: Pending at 390 × 844', pack: { state: 'results', case: 'pending' }, state: 'pending', size: '390x844' },
  { id: 'Results: Fulfilled at 390 × 844', pack: { state: 'results', case: 'fulfilled' }, state: 'fulfilled', size: '390x844' },
  { id: 'Results: Not fulfilled at 390 × 844', pack: { state: 'results', case: 'not-fulfilled' }, state: 'not-fulfilled', size: '390x844' },
  { id: 'Results: Condition not met at 390 × 844', pack: { state: 'results', case: 'condition' }, state: 'condition', size: '390x844' },
  { id: 'Offer from Ava with the Largest text (200 %) at 390 × 844', pack: { state: 'incoming' }, state: 'largest', size: '390x844', text: 200 },
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
/** A node's accessible name from its own attributes: aria-label, or the words of what aria-labelledby names. */
const nameOf = node => node.getAttribute('aria-label') ?? (node.getAttribute('aria-labelledby')?.split(/\s+/).map(id => document.getElementById(id)?.textContent ?? '').join(' ').trim() || null);
/** An icon's drawing: its paths and shapes, without the class each side gives it. */
const drawing = svg => svg.innerHTML.replace(/\s+/g, ' ').trim();
/** Every picture in a part has loaded (the pack's are <img>; the component's are backgrounds on the crew bundle's properties). */
const pictures = root => Promise.all([...root.querySelectorAll('img')].map(img => (img.complete ? null : new Promise(done => { img.onload = done; img.onerror = done; }))));

export async function runPromisesAgreement({ sizes, mountState, disposeState }) {
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
    MORE_SCREENS.promises(pack, c.pack);
    const host = document.createElement('div');
    host.className = 'pv-agree-host';
    Object.assign(host.style, { position: 'absolute', left: `${size.width + 20}px`, top: '0', width: `${size.width}px`, height: `${size.height}px` });
    document.body.append(host);
    const mounted = mountState(host, c.state, size.insets);
    await document.fonts.ready;
    await pictures(pack);
    await frames();
    // The sheet's and the toast's arrivals end where they rest.
    for (const a of [...pack.getAnimations({ subtree: true }), ...host.getAnimations({ subtree: true })]) {
      try { a.finish(); } catch { a.pause(); a.currentTime = 0; }
    }
    await frames();
    const differences = [], parts = {};
    for (const [name, packSel, mineSel, compareWords, props] of [...FRAME, ...BODY]) {
      const a = [...pack.querySelectorAll(packSel)].filter(visible), b = [...host.querySelectorAll(mineSel)].filter(visible);
      parts[name] = { pack: a.length, screen: b.length };
      if (a.length !== b.length) { differences.push({ part: name, what: 'count', pack: a.length, screen: b.length }); continue; }
      a.forEach((na, i) => {
        const nb = b[i], pa = box(pack, na), pb = box(host, nb);
        if (!near(pa, pb)) differences.push({ part: `${name} ${i + 1}`, what: 'box', pack: pa, screen: pb });
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
    const packPictures = [...pack.querySelectorAll('.sheet .row > .pt, .sheet .comic .pt')].map(pictureOf), minePictures = [...host.querySelectorAll('.ms-promises .ms-k-pt')].map(pictureOf);
    if (JSON.stringify(packPictures) !== JSON.stringify(minePictures)) differences.push({ part: 'portraits', what: 'files', pack: packPictures, screen: minePictures });
    checks.push({ id: `agree: ${c.id}`, ok: differences.length === 0, detail: { differences, parts } });
    disposeState(mounted);
    pack.remove();
    host.remove();
  }
  document.documentElement.style.fontSize = '';
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}
