// mothership:dev-only
//
// The sheet beside the pack: the frozen prototype's captain screen in its appoint and waiting states, its officer
// screen in its pick and done states, and its nav screen in its route, tie and confirm states (design/phone-ui/
// prototype/screens-more.mjs, with kit.css and screens.css; sheets 40 and 41), and the runtime component
// (../office-decisions.mjs) in the phone shell's sheet, with its frame and footer from officeDecisionsSheet(), drawn in
// the same page at the same size, compared case by case: the words, the states, the look and where each part sits, to
// within half a pixel; the route map by its drawing, shape by shape. It is how the component shows it draws sheets 40
// and 41 and not a second design of them.
//
// Recorded, not a difference: at the Largest text the 3 × 3 takes the pack's own list form (kit.css .grid-wrap, as
// the pack's vote sheet draws it, and the kit's grid9() always wraps its grid). The pack's appoint sheet leaves its
// grid unwrapped, so at that size it keeps three columns and cuts the names; that case compares the pack with its
// grid in its own .grid-wrap, and says so in its record.
//
// Not compared: the room behind the sheet (the room scene's own agreement), the top bar and the tabs (the phone
// shell's), and what the pack does not draw: a command in flight or refused, and reconnecting (the probe and the
// captures check them).

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
  ['footer button icons', '.sheet-foot .btn svg', '.ms-ps-sheet-foot .ms-k-btn svg', false, null],
];
const BODY = [
  ['3 × 3', '.grid9', '.ms-k-grid9', false, null],
  ['cells', '.grid9 .cell', '.ms-k-grid9 .ms-k-cell', true, ['backgroundColor', 'boxShadow', 'borderRadius']],
  ['cell portraits', '.cell .pt', '.ms-k-cell .ms-k-pt', false, ['opacity']],
  ['cell names', '.cell-name', '.ms-k-cell-name', true, ['fontSize', 'fontWeight', 'color', 'opacity']],
  ['cell notes', '.cell-note', '.ms-k-cell-note', true, ['fontSize', 'fontWeight', 'color']],
  ['cell "You"', '.cell .you', '.ms-k-cell .ms-k-you', true, ['backgroundColor', 'color', 'fontSize']],
  ['waiting block', '.sheet-body .wait', '.ms-ps-sheet-body .ms-k-wait', false, null],
  ['waiting portrait', '.wait .pt', '.ms-k-wait .ms-k-pt', false, null],
  ['waiting title', '.wait h2', '.ms-k-wait-title', true, ['fontSize', 'fontWeight', 'color']],
  ['waiting line', '.wait p', '.ms-k-wait-line', true, ['fontSize', 'fontWeight', 'color']],
  ['notice', '.registered', '.ms-od-notice', false, null],
  ['notice lines', '.registered p', '.ms-od-notice p', true, ['fontSize', 'fontWeight', 'color', 'textAlign']],
  ['stamps', '.sheet-body .stamp', '.ms-ps-sheet-body .ms-k-stamp', true, ['backgroundColor', 'color', 'fontSize', 'fontWeight', 'borderRadius', 'transform']],
  ['route map', '.route', '.ms-od-route', false, ['backgroundColor', 'borderRadius', 'boxShadow', 'height']],
  ['route drawing', '.route svg', '.ms-od-route svg', false, null],
  ['lists', '.sheet-body .list', '.ms-ps-sheet-body .ms-k-list', false, ['backgroundColor', 'borderRadius', 'boxShadow']],
  ['rows', '.row', '.ms-k-row', true, ['minHeight', 'opacity']],
  ['row icons', '.row-icon', '.ms-k-row-icon', false, ['backgroundColor', 'color', 'borderRadius']],
  ['row icon drawings', '.row-icon svg', '.ms-k-row-icon svg', false, null],
  ['row titles', '.row-title', '.ms-k-row-title', true, ['fontSize', 'fontWeight', 'color']],
  ['row lines', '.row-sub', '.ms-k-row-sub', true, ['fontSize', 'fontWeight', 'color']],
  ['row values', '.row-value', '.ms-k-row-value', true, ['fontSize', 'color']],
  ['notes', '.group-note', '.ms-k-group-note', true, ['fontSize', 'color']],
  ['tie buttons', '.sheet-body .btn', '.ms-ps-sheet-body .ms-k-btn', true, ['backgroundColor', 'color', 'boxShadow', 'fontSize', 'fontWeight', 'borderRadius']],
  ['tie button icons', '.sheet-body .btn svg', '.ms-ps-sheet-body .ms-k-btn svg', false, null],
];

/** Each case: the pack's screen and parameters, the preview's state, a size, and the text size if not the Standard. */
const CASES = [];
for (const [title, screen, pack, state] of [
  ['Choose your Officer', 'captain', { state: 'appoint' }, 'appoint'],
  ['Officer appointment', 'captain', { state: 'waiting' }, 'appointing'],
  ['Block movement', 'officer', { state: 'pick' }, 'block'],
  ['Blocked', 'officer', { state: 'done' }, 'blocked'],
  ['Navigation: the route', 'nav', { state: 'route' }, 'route'],
  ['Navigation: a genuine tie', 'nav', { state: 'tie' }, 'tie'],
  ['Navigation: acknowledge', 'nav', { state: 'confirm' }, 'confirm'],
]) for (const size of ['390x844', '430x932']) CASES.push({ id: `${title} at ${size.replace('x', ' × ')}`, screen, pack, state, size });
CASES.push({ id: 'Choose your Officer with the Largest text (200 %) at 390 × 844, the pack\'s list form', screen: 'captain', pack: { state: 'appoint' }, state: 'largest', size: '390x844', text: 200, wrapGrid: true });

const visible = node => !!node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden' && !node.closest('[hidden]');
function box(frame, node) {
  const f = frame.getBoundingClientRect(), r = node.getBoundingClientRect();
  return { x: r.left - f.left, y: r.top - f.top, w: r.width, h: r.height };
}
const textOf = node => (node.innerText ?? node.textContent).replace(/\s+/g, ' ').trim();
const near = (a, b) => ['x', 'y', 'w', 'h'].every(k => Math.abs(a[k] - b[k]) <= TOLERANCE);
const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
const looks = (node, props) => Object.fromEntries(props.map(p => [p, getComputedStyle(node)[p]]));
const STATE_ATTRS = ['aria-disabled', 'aria-busy', 'aria-label', 'aria-pressed', 'role'];
/** A node's accessible name from its own attributes: aria-label, or the words of what aria-labelledby names. */
const nameOf = node => node.getAttribute('aria-label') ?? (node.getAttribute('aria-labelledby')?.split(/\s+/).map(id => document.getElementById(id)?.textContent ?? '').join(' ').trim() || null);
/** A drawing: its paths and shapes, without the class each side gives it. */
const drawing = svg => svg.innerHTML.replace(/\s+/g, ' ').trim();
/** Every picture in a part has loaded (the pack's are <img>; the component's are backgrounds on the crew bundle's properties). */
const pictures = root => Promise.all([...root.querySelectorAll('img')].map(img => (img.complete ? null : new Promise(done => { img.onload = done; img.onerror = done; }))));

export async function runOfficeDecisionsAgreement({ sizes, mountState, disposeState }) {
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
    MORE_SCREENS[c.screen](pack, c.pack);
    const recorded = {};
    if (c.wrapGrid) {
      // The pack's own list form: its grid in the pack's .grid-wrap, as its vote sheet draws it.
      const grid = pack.querySelector('.grid9'), wrap = document.createElement('div');
      wrap.className = 'grid-wrap';
      grid.replaceWith(wrap);
      wrap.append(grid);
      recorded.listForm = 'the pack\'s .grid9 placed in its own .grid-wrap';
    }
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
        if (na.tagName === 'svg' && drawing(na) !== drawing(nb)) differences.push({ part: `${name} ${i + 1}`, what: 'drawing', pack: drawing(na).slice(0, 240), screen: drawing(nb).slice(0, 240) });
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
    const packPictures = [...pack.querySelectorAll('.sheet .pt')].filter(visible).map(pictureOf), minePictures = [...host.querySelectorAll('.ms-office-decisions .ms-k-pt')].filter(visible).map(pictureOf);
    if (JSON.stringify(packPictures) !== JSON.stringify(minePictures)) differences.push({ part: 'portraits', what: 'files', pack: packPictures, screen: minePictures });
    checks.push({ id: `agree: ${c.id}`, ok: differences.length === 0, detail: { differences, parts, recorded } });
    disposeState(mounted);
    pack.remove();
    host.remove();
  }
  document.documentElement.style.fontSize = '';
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}
