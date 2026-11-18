// mothership:dev-only
//
// The sheet beside the pack: the frozen prototype's host-controls screen (design/phone-ui/prototype/screens-more.mjs
// MORE_SCREENS['host-controls'], with kit.css and screens.css), its list, its code hidden and revealed, the copy's
// toast and the abort's confirm, and the runtime component (../host-controls.mjs) in the phone shell's sheet, with
// the frame and footer from hostControlsSheet(), drawn in the same page at the same size, compared case by case:
// the words, the states, the look and where each part sits, to within half a pixel. It is how the component shows
// it draws sheet 15 and not a second design of it.
//
// Not compared: the room behind the sheet (the room scene's own agreement), the top bar and the tabs (the phone
// shell's), and what the pack does not draw: a command in flight or refused, and reconnecting (the probe checks them).
//
// One accepted difference, at the Largest text only: beside the long "Works once · 15 minutes" the pack's timer
// icon shrinks to under its 24 px (its .ic may shrink); the card's keeps its 24 px, as the kit's icons never shrink
// (.ms-k-ic, flex: none). That case compares the icon's place and height, and records its width.
//
// And the code's wrap (0.1.2, the Lead's rule of 17 November): the pack's code line breaks anywhere (word-break:
// break-all), which can leave one dot, or one character of a code, on a line of its own. The component's wraps only
// between the code's groups, each whole. Each code case compares that line's look but its word-break, records the
// two as `wrap`, and holds that every group is whole; where keeping a group whole takes more lines (the Largest
// text), the line is taller by whole lines and everything under it sits lower by just that much, which is compared.

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
  ['footer icons', '.sheet-foot .btn svg', '.ms-ps-sheet-foot .ms-k-btn svg', false, ['color']],
  ['toast', '.toast', '.ms-ps-toast', true, ['backgroundColor', 'color', 'fontSize', 'fontWeight']],
  ['toast icon', '.toast svg', '.ms-ps-toast svg', false, null],
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
  ['row chevrons', '.row-chev', '.ms-k-row-chev', false, ['color']],
  ['row chevron drawings', '.row-chev svg', '.ms-k-row-chev svg', false, null],
  ['code card', '.code-card', '.ms-hc-card', false, ['backgroundColor', 'borderRadius', 'boxShadow', 'padding']],
  ['code card lines', '.code-card > *', '.ms-hc-card > *', true, ['fontSize', 'fontWeight', 'fontFamily', 'color', 'letterSpacing', 'textTransform', 'wordBreak']],
  ['code card icon', '.code-card .meta svg', '.ms-hc-meta svg', false, ['color']],
  ['note', '.group-note', '.ms-k-group-note', true, ['fontSize', 'color']],
  ['confirm', '.wait', '.ms-k-wait', false, null],
  ['confirm tile', '.wait .big-icon', '.ms-k-wait-tile', false, ['backgroundColor', 'color', 'borderRadius']],
  ['confirm icon', '.wait .big-icon svg', '.ms-k-wait-tile svg', false, null],
  ['confirm title', '.wait h2', '.ms-k-wait-title', true, ['fontSize', 'fontWeight']],
  ['confirm line', '.wait p', '.ms-k-wait-line', true, ['fontSize', 'color']],
];

/** Each case: the pack's parameters, the preview's state, a size, and the text size if not the Standard. */
const CASES = [
  { id: 'Host controls at 390 × 844', pack: {}, state: 'list', size: '390x844' },
  { id: 'Host controls at 430 × 932', pack: {}, state: 'list', size: '430x932' },
  { id: 'the code, hidden, at 390 × 844', pack: { state: 'code' }, state: 'code', size: '390x844' },
  { id: 'the code, revealed, at 390 × 844', pack: { state: 'code', reveal: '1' }, state: 'revealed', size: '390x844' },
  { id: 'the code, revealed, at 430 × 932', pack: { state: 'code', reveal: '1' }, state: 'revealed', size: '430x932' },
  { id: 'the code, copied, with the toast, at 390 × 844', pack: { state: 'code', copied: '1' }, state: 'copied', size: '390x844' },
  { id: 'the abort\'s confirm at 390 × 844', pack: { state: 'abort' }, state: 'abort', size: '390x844' },
  { id: 'the abort\'s confirm at 430 × 932', pack: { state: 'abort' }, state: 'abort', size: '430x932' },
  { id: 'the code, revealed, with the Largest text (200 %) at 390 × 844', pack: { state: 'code', reveal: '1' }, state: 'largest', size: '390x844', text: 200, iconKept: true },
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

export async function runHostControlsAgreement({ sizes, mountState, disposeState }) {
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
    MORE_SCREENS['host-controls'](pack, c.pack);
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
    let accepted = null;
    // The code's wrap (0.1.2): the pack's code line is the card's line that breaks anywhere; the component's, .ms-hc-code.
    const packCode = [...pack.querySelectorAll('.code-card > *')].filter(visible).find(n => getComputedStyle(n).wordBreak === 'break-all') ?? null;
    const mineCode = host.querySelector('.ms-hc-code');
    let wrap = null, shift = 0, below = Infinity;
    if (packCode && visible(mineCode)) {
      const pa = box(pack, packCode), pb = box(host, mineCode), line = parseFloat(getComputedStyle(mineCode).lineHeight);
      const extra = pb.h - pa.h, lines = Math.round(extra / line);
      const whole = [...mineCode.querySelectorAll(':scope > .ms-hc-group')].every(g => g.getClientRects().length === 1);
      if (whole && lines >= 0 && Math.abs(extra - lines * line) <= TOLERANCE && ['x', 'y', 'w'].every(k => Math.abs(pa[k] - pb[k]) <= TOLERANCE)) {
        shift = extra; below = pa.y + pa.h - TOLERANCE;
        wrap = { what: 'the code wraps only between its groups, each whole (0.1.2); the pack\'s breaks anywhere', pack: { wordBreak: getComputedStyle(packCode).wordBreak, h: pa.h },
          screen: { wordBreak: getComputedStyle(mineCode).wordBreak, h: pb.h }, lines, shift };
      }
    }
    /**
     * Where a part of the sheet's body should sit once the code's wrap has taken `shift` more: the code line and its card
     * taller, the body's parts under it lower. The frame (the sheet, its head and footer) stays where it is.
     */
    const inBody = new Set(BODY.map(([name]) => name));
    const expected = (name, pa, na) => !shift || !inBody.has(name) ? pa : na === packCode || na.matches('.code-card') ? { ...pa, h: pa.h + shift } : pa.y >= below ? { ...pa, y: pa.y + shift } : pa;
    for (const [name, packSel, mineSel, compareWords, props] of [...FRAME, ...BODY]) {
      const a = [...pack.querySelectorAll(packSel)].filter(visible), b = [...host.querySelectorAll(mineSel)].filter(visible);
      parts[name] = { pack: a.length, screen: b.length };
      if (a.length !== b.length) { differences.push({ part: name, what: 'count', pack: a.length, screen: b.length }); continue; }
      a.forEach((na, i) => {
        const nb = b[i], pa = box(pack, na), pb = box(host, nb), ea = expected(name, pa, na);
        if (c.iconKept && name === 'code card icon' && pa.w < pb.w - TOLERANCE && Math.abs(pb.w - 24) <= TOLERANCE && ['x', 'y', 'h'].every(k => Math.abs(ea[k] - pb[k]) <= TOLERANCE)) {
          accepted = { what: 'the timer icon keeps its 24 px (the kit\'s icons never shrink); the pack\'s shrinks beside the long line', pack: pa, screen: pb };
        } else if (!near(ea, pb)) differences.push({ part: `${name} ${i + 1}`, what: 'box', pack: pa, screen: pb });
        if (compareWords && textOf(na) !== textOf(nb)) differences.push({ part: `${name} ${i + 1}`, what: 'words', pack: textOf(na), screen: textOf(nb) });
        if (props) {
          // The code line's word-break is its wrap (recorded above, while each group is whole); the rest of its look is compared.
          const kept = wrap && na === packCode ? props.filter(p => p !== 'wordBreak') : props;
          const la = looks(na, kept), lb = looks(nb, kept);
          if (JSON.stringify(la) !== JSON.stringify(lb)) differences.push({ part: `${name} ${i + 1}`, what: 'look', pack: la, screen: lb });
        }
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
    const packPictures = [...pack.querySelectorAll('.sheet .row > .pt')].map(pictureOf), minePictures = [...host.querySelectorAll('.ms-host-controls .ms-k-row .ms-k-pt')].map(pictureOf);
    if (JSON.stringify(packPictures) !== JSON.stringify(minePictures)) differences.push({ part: 'portraits', what: 'files', pack: packPictures, screen: minePictures });
    // A code case passes only with its wrap recorded: each group whole, and the lines it took.
    checks.push({ id: `agree: ${c.id}`, ok: differences.length === 0 && (!c.iconKept || accepted !== null) && (!packCode || wrap !== null), detail: { differences, parts, accepted, ...(packCode ? { wrap } : {}) } });
    disposeState(mounted);
    pack.remove();
    host.remove();
  }
  document.documentElement.style.fontSize = '';
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}
