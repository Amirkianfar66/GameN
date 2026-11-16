// mothership:dev-only
//
// The sheet beside the pack: the frozen prototype's windows screen (design/phone-ui/prototype/screens-more.mjs
// MORE_SCREENS.windows, with kit.css and screens.css) in its view, draw, shown and none states (sheet 34), and the
// runtime component (../windows.mjs) in the phone shell's sheet, with its frame and footer from windowsSheet(), drawn
// in the same page at the same size, compared case by case: the words, the states, the look and where each part sits,
// to within half a pixel. It is how the component shows it draws sheet 34 and not a second design of it.
//
// The drawings: the pack's sketches are SVG paths written by hand; the component draws the contract's strokes, which
// the preview makes from those same paths (a line's corners exactly, a curve sampled along it). So each stroke is
// compared by where it lies (its box, to half a pixel), its ink, width, ends and joins, not by its path's letters.
//
// Not compared: the room behind the sheet (the room scene's own agreement), the top bar and the tabs (the phone
// shell's), and what the pack does not draw: Show off or in flight, the keyboard's pen, and reconnecting (the probe
// and the captures check them).
//
// Recorded, not differences (each checked as it is):
//   - the inks' radio group holds the four inks only, as radios do (the pack's group also holds Undo and Clear, which
//     aren't radios); the row they sit in is compared by its box, and the group by its role and name;
//   - the inks are radios with aria-checked only (the pack also sets aria-pressed, which a radio doesn't take).

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
  ['sheet body', '.sheet-body', '.ms-ps-sheet-body', false, null],
  ['footer', '.sheet-foot', '.ms-ps-sheet-foot', false, null],
  ['footer buttons', '.sheet-foot .btn', '.ms-ps-sheet-foot .ms-k-btn', true, ['backgroundColor', 'color', 'boxShadow', 'fontSize', 'fontWeight', 'borderRadius']],
  ['footer button icons', '.sheet-foot .btn svg', '.ms-ps-sheet-foot .ms-k-btn svg', false, null],
];
const BODY = [
  ['section heads', '.section-head', '.ms-wn-head', true, null],
  ['section head rooms', '.section-head h3', '.ms-wn-head-title', true, ['fontSize', 'fontWeight', 'color', 'textTransform', 'letterSpacing']],
  ['section head lines', '.section-head span', '.ms-wn-head-aside', true, ['fontSize', 'fontWeight', 'color']],
  ['drawing boxes', '.canvas-box', '.ms-wn-box', false, ['backgroundColor', 'borderRadius', 'boxShadow']],
  ['drawing pictures', '.canvas-box svg', '.ms-wn-box > svg', false, null, { strokes: true }],
  ['strokes', '.canvas-box svg path', '.ms-wn-box .ms-wn-stroke', false, ['stroke', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin', 'fill']],
  ['drawing lines', '.drawing-meta', '.ms-wn-meta', true, ['fontSize', 'fontWeight', 'color']],
  ['drawing line parts', '.drawing-meta span', '.ms-wn-meta > span', true, null],
  ['ink row', '.swatches', '.ms-wn-tools', false, null, { attrs: false }],
  ['inks', '.swatch', '.ms-wn-swatch', false, ['backgroundColor', 'borderTopWidth', 'borderTopColor', 'boxShadow', 'borderRadius']],
  ['icon buttons', '.sheet-body .icon-btn', '.ms-ps-sheet-body .ms-k-icon-btn', false, ['color']],
  ['icon button drawings', '.sheet-body .icon-btn svg', '.ms-ps-sheet-body .ms-k-icon-btn svg', false, null],
  ['stamps', '.sheet-body .stamp', '.ms-ps-sheet-body .ms-k-stamp', true, ['backgroundColor', 'color', 'fontSize', 'fontWeight', 'borderRadius', 'transform']],
  ['group labels', '.group-label', '.ms-k-group-label', true, ['fontSize', 'fontWeight', 'color', 'textTransform', 'letterSpacing']],
  ['waiting block', '.sheet-body .wait', '.ms-ps-sheet-body .ms-k-wait', false, null],
  ['waiting tile', '.wait .big-icon', '.ms-k-wait-tile', false, ['backgroundColor', 'color', 'borderRadius', 'boxShadow']],
  ['waiting tile drawing', '.wait .big-icon svg', '.ms-k-wait-tile svg', false, null],
  ['waiting title', '.wait h2', '.ms-k-wait-title', true, ['fontSize', 'fontWeight', 'color']],
  ['waiting line', '.wait p', '.ms-k-wait-line', true, ['fontSize', 'fontWeight', 'color']],
];

/** Each case: the pack's parameters, the preview's state, a size, and the text size if not the Standard. */
const CASES = [
  { id: 'Windows, the room\'s two windows, at 390 × 844', pack: { state: 'view' }, state: 'view', size: '390x844' },
  { id: 'Windows, the room\'s two windows, at 430 × 932', pack: { state: 'view' }, state: 'view', size: '430x932' },
  { id: 'Draw at your station at 390 × 844', pack: { state: 'draw' }, state: 'draw', size: '390x844' },
  { id: 'Draw at your station at 430 × 932', pack: { state: 'draw' }, state: 'draw', size: '430x932' },
  { id: 'Shown at 390 × 844', pack: { state: 'shown' }, state: 'shown', size: '390x844' },
  { id: 'Shown at 430 × 932', pack: { state: 'shown' }, state: 'shown', size: '430x932' },
  { id: 'No window here at 390 × 844', pack: { state: 'none' }, state: 'none', size: '390x844' },
  { id: 'No window here at 430 × 932', pack: { state: 'none' }, state: 'none', size: '430x932' },
  { id: 'Draw at your station with the Largest text (200 %) at 390 × 844', pack: { state: 'draw' }, state: 'largest', size: '390x844', text: 200 },
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
const STATE_ATTRS = ['aria-disabled', 'aria-busy', 'aria-label', 'aria-checked', 'role'];
/** A node's accessible name from its own attributes: aria-label, or the words of what aria-labelledby names. */
const nameOf = node => node.getAttribute('aria-label') ?? (node.getAttribute('aria-labelledby')?.split(/\s+/).map(id => document.getElementById(id)?.textContent ?? '').join(' ').trim() || null);
/** An icon's drawing: its paths and shapes, without the class each side gives it. */
const drawing = svg => svg.innerHTML.replace(/\s+/g, ' ').trim();

export async function runWindowsAgreement({ sizes, mountState, disposeState }) {
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
    MORE_SCREENS.windows(pack, c.pack);
    const host = document.createElement('div');
    host.className = 'pv-agree-host';
    Object.assign(host.style, { position: 'absolute', left: `${size.width + 20}px`, top: '0', width: `${size.width}px`, height: `${size.height}px` });
    document.body.append(host);
    const mounted = mountState(host, c.state, size.insets);
    await document.fonts.ready;
    await frames();
    // The sheet's and the toast's arrivals end where they rest.
    for (const a of [...pack.getAnimations({ subtree: true }), ...host.getAnimations({ subtree: true })]) {
      try { a.finish(); } catch { a.pause(); a.currentTime = 0; }
    }
    await frames();
    const differences = [], parts = {};
    for (const [name, packSel, mineSel, compareWords, props, options = {}] of [...FRAME, ...BODY]) {
      const a = [...pack.querySelectorAll(packSel)].filter(visible), b = [...host.querySelectorAll(mineSel)].filter(visible);
      parts[name] = { pack: a.length, screen: b.length };
      if (a.length !== b.length) { differences.push({ part: name, what: 'count', pack: a.length, screen: b.length }); continue; }
      a.forEach((na, i) => {
        const nb = b[i], pa = box(pack, na), pb = box(host, nb);
        if (!near(pa, pb)) differences.push({ part: `${name} ${i + 1}`, what: 'box', pack: pa, screen: pb });
        if (compareWords && textOf(na) !== textOf(nb)) differences.push({ part: `${name} ${i + 1}`, what: 'words', pack: textOf(na), screen: textOf(nb) });
        if (props) { const la = looks(na, props), lb = looks(nb, props); if (JSON.stringify(la) !== JSON.stringify(lb)) differences.push({ part: `${name} ${i + 1}`, what: 'look', pack: la, screen: lb }); }
        // A drawing's strokes are compared one by one (the strokes part); an icon's drawing by its shapes.
        if (na.tagName === 'svg' && !options.strokes && drawing(na) !== drawing(nb)) differences.push({ part: `${name} ${i + 1}`, what: 'drawing', pack: drawing(na).slice(0, 160), screen: drawing(nb).slice(0, 160) });
        if (options.attrs === false) return;
        for (const attr of STATE_ATTRS) {
          // A name is compared as a name: the shell names its sheet by its title (aria-labelledby), the pack by aria-label.
          const va = attr === 'aria-label' ? nameOf(na) : na.getAttribute(attr), vb = attr === 'aria-label' ? nameOf(nb) : nb.getAttribute(attr);
          if (va !== null && va !== vb) differences.push({ part: `${name} ${i + 1}`, what: attr, pack: va, screen: vb });
          if (va === null && vb !== null && attr === 'aria-disabled' && vb === 'true') differences.push({ part: `${name} ${i + 1}`, what: attr, pack: va, screen: vb });
        }
      });
    }
    // Recorded: the inks' radio group, by its role and name (the pack's holds Undo and Clear too).
    const recorded = {};
    const packGroup = pack.querySelector('.swatches'), mineGroup = host.querySelector('.ms-wn-inks');
    if (packGroup || mineGroup) {
      recorded.inkGroup = { pack: packGroup && [packGroup.getAttribute('role'), packGroup.getAttribute('aria-label'), packGroup.querySelectorAll('[role="radio"]').length],
        screen: mineGroup && [mineGroup.getAttribute('role'), mineGroup.getAttribute('aria-label'), mineGroup.querySelectorAll('[role="radio"]').length] };
      if (JSON.stringify(recorded.inkGroup.pack) !== JSON.stringify(recorded.inkGroup.screen)) differences.push({ part: 'ink group', what: 'role, name and radios', ...recorded.inkGroup });
      recorded.pressed = { pack: [...pack.querySelectorAll('.swatch')].map(s => s.getAttribute('aria-pressed')), screen: [...host.querySelectorAll('.ms-wn-swatch')].map(s => s.getAttribute('aria-pressed')) };
    }
    checks.push({ id: `agree: ${c.id}`, ok: differences.length === 0, detail: { differences, parts, recorded } });
    disposeState(mounted);
    pack.remove();
    host.remove();
  }
  document.documentElement.style.fontSize = '';
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}
