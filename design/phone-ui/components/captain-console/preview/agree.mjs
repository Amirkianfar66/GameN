// mothership:dev-only
//
// The sheet beside the pack: the frozen prototype's captain screen in its console, used, release and eject states
// (design/phone-ui/prototype/screens-more.mjs MORE_SCREENS.captain, with kit.css and screens.css; sheets 22 and 24),
// and the runtime component (../captain-console.mjs) in the phone shell's sheet, with its frame and footer from
// captainConsoleSheet(), drawn in the same page at the same size, compared case by case: the words, the states, the
// look and where each part sits, to within half a pixel, and each plate's picture by its file. It is how the component
// shows it draws sheets 22 and 24 and not a second design of them.
//
// Recorded, not a difference: a used or unavailable plate is the kit's tile, a button refused with aria-disabled and
// kept focusable (the control policy); the pack draws it as a plain <div>. Its look, words and box are compared as
// they are.
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

/** The parts compared, every match in order: [name, the pack's selector, the component's selector, words, look, options]. */
const FRAME = [
  ['sheet', '.sheet', '.ms-ps-sheet', false, null],
  ['sheet title', '.sheet-title h2', '.ms-ps-sheet-title h2', true, ['fontSize', 'fontWeight']],
  ['sheet line', '.sheet-title p', '.ms-ps-sheet-title p', true, ['fontSize', 'color']],
  ['sheet body', '.sheet-body', '.ms-ps-sheet-body', false, null],
  ['footer', '.sheet-foot', '.ms-ps-sheet-foot', false, null],
  ['footer buttons', '.sheet-foot .btn', '.ms-ps-sheet-foot .ms-k-btn', true, ['backgroundColor', 'color', 'boxShadow', 'fontSize', 'fontWeight', 'borderRadius']],
];
const BODY = [
  ['plates', '.sheet-body > div:has(> .tile)', '.ms-cc-plates', false, null],
  ['plate tiles', '.sheet-body .tile', '.ms-cc-plates .ms-k-tile', true, ['backgroundColor', 'boxShadow', 'borderRadius', 'minHeight'], { refusedDiv: true }],
  ['plate art', '.sheet-body .tile img', '.ms-cc-plate-art', false, null],
  // The art's fade: the pack's <img> is drawn as it is; the component's picture sits in the kit's art box.
  ['plate art fade', '.sheet-body .tile img', '.ms-cc-plates .ms-k-tile-art', false, ['opacity', 'filter'], { attrs: false, box: false }],
  ['plate names', '.sheet-body .tile b', '.ms-k-tile-name', true, ['fontSize', 'fontWeight', 'color']],
  ['plate lines', '.sheet-body .tile small', '.ms-k-tile-note', true, ['fontSize', 'fontWeight', 'color']],
  ['notes', '.group-note', '.ms-k-group-note', true, ['fontSize', 'color']],
  ['who', '.confirm-who', '.ms-k-who', false, null],
  ['who icon', '.confirm-who .tile-icon', '.ms-k-who-lead', false, ['backgroundColor', 'color', 'borderRadius']],
  ['who icon drawing', '.confirm-who .tile-icon svg', '.ms-k-who-lead svg', false, null],
  ['who title', '.confirm-who b', '.ms-k-who-title', true, ['fontSize', 'fontWeight', 'color']],
  ['who line', '.confirm-who span:not(.tile-icon)', '.ms-k-who-sub', true, ['fontSize', 'fontWeight', 'color']],
  ['facts', '.facts', '.ms-k-facts', false, null],
  ['fact lines', '.facts li', '.ms-k-fact', true, ['fontSize', 'fontWeight', 'color']],
  ['fact icons', '.facts li svg', '.ms-k-fact svg', false, ['color']],
];

/** Each case: the pack's parameters, the preview's state, a size, and the text size if not the Standard. */
const CASES = [];
for (const [title, pack, state] of [
  ['Captain console', { state: 'console' }, 'console'],
  ['Commands used', { state: 'used' }, 'used'],
  ['Release · confirm', { state: 'release' }, 'release'],
  ['Eject from the console', { state: 'eject' }, 'eject'],
]) for (const size of ['390x844', '430x932']) CASES.push({ id: `${title} at ${size.replace('x', ' × ')}`, pack, state, size });
CASES.push({ id: 'Captain console with the Largest text (200 %) at 390 × 844', pack: { state: 'console' }, state: 'largest', size: '390x844', text: 200 });

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
/** A plate's picture: the pack's <img> file, or the file behind the component's background (the bundle's name without its hash). */
const pictureOf = node => (node.tagName === 'IMG' ? node.src.replace(/^.*\//, '') : (getComputedStyle(node).backgroundImage.match(/([^/"]+\.svg)/)?.[1]?.replace(/-[A-Za-z0-9_-]{8}\.svg$/, '.svg') ?? null));
const pictures = root => Promise.all([...root.querySelectorAll('img')].map(img => (img.complete ? null : new Promise(done => { img.onload = done; img.onerror = done; }))));

export async function runCaptainConsoleAgreement({ sizes, mountState, disposeState }) {
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
    MORE_SCREENS.captain(pack, c.pack);
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
    const differences = [], parts = {}, recorded = {};
    for (const [name, packSel, mineSel, compareWords, props, options = {}] of [...FRAME, ...BODY]) {
      const a = [...pack.querySelectorAll(packSel)].filter(visible), b = [...host.querySelectorAll(mineSel)].filter(visible);
      parts[name] = { pack: a.length, screen: b.length };
      if (a.length !== b.length) { differences.push({ part: name, what: 'count', pack: a.length, screen: b.length }); continue; }
      a.forEach((na, i) => {
        const nb = b[i], pa = box(pack, na), pb = box(host, nb);
        if (options.box !== false && !near(pa, pb)) differences.push({ part: `${name} ${i + 1}`, what: 'box', pack: pa, screen: pb });
        if (compareWords && textOf(na) !== textOf(nb)) differences.push({ part: `${name} ${i + 1}`, what: 'words', pack: textOf(na), screen: textOf(nb) });
        if (props) { const la = looks(na, props), lb = looks(nb, props); if (JSON.stringify(la) !== JSON.stringify(lb)) differences.push({ part: `${name} ${i + 1}`, what: 'look', pack: la, screen: lb }); }
        if (na.tagName === 'svg' && drawing(na) !== drawing(nb)) differences.push({ part: `${name} ${i + 1}`, what: 'drawing', pack: drawing(na).slice(0, 160), screen: drawing(nb).slice(0, 160) });
        if (options.attrs === false) return;
        for (const attr of STATE_ATTRS) {
          // A name is compared as a name: the shell names its sheet by its title (aria-labelledby), the pack by aria-label.
          const va = attr === 'aria-label' ? nameOf(na) : na.getAttribute(attr), vb = attr === 'aria-label' ? nameOf(nb) : nb.getAttribute(attr);
          if (va !== null && va !== vb) differences.push({ part: `${name} ${i + 1}`, what: attr, pack: va, screen: vb });
          if (va === null && vb !== null && attr === 'aria-disabled' && vb === 'true') {
            // Recorded: the pack's used or unavailable plate is a plain <div>; the kit's is a refused button.
            if (options.refusedDiv && na.tagName === 'DIV' && na.dataset.state !== 'available') (recorded.refusedPlates ??= []).push(`${name} ${i + 1}: ${na.dataset.state}`);
            else differences.push({ part: `${name} ${i + 1}`, what: attr, pack: va, screen: vb });
          }
        }
      });
    }
    const packPictures = [...pack.querySelectorAll('.sheet-body .tile img')].map(pictureOf), minePictures = [...host.querySelectorAll('.ms-cc-plate-art')].map(pictureOf);
    if (JSON.stringify(packPictures) !== JSON.stringify(minePictures)) differences.push({ part: 'plate pictures', what: 'files', pack: packPictures, screen: minePictures });
    recorded.pictures = minePictures;
    checks.push({ id: `agree: ${c.id}`, ok: differences.length === 0, detail: { differences, parts, recorded } });
    disposeState(mounted);
    pack.remove();
    host.remove();
  }
  document.documentElement.style.fontSize = '';
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}
