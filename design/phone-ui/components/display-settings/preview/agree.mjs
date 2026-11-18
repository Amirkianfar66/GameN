// mothership:dev-only
//
// Both mounts beside the pack: the frozen prototype's settings screen (design/phone-ui/prototype/screens-more.mjs
// MORE_SCREENS.settings, with kit.css and screens.css), with `from=menu` (the Display page) and without it (Settings
// in a match, `host=1` for the host), and the runtime component (../display-settings.mjs; the sheet's content in
// the phone shell's sheet), drawn in the same page at the same size, compared case by case: the words, the states,
// the look and where each part sits, to within half a pixel. It is how the component shows it draws sheet 32's
// Settings and the pack's Display page, and not a second design of them.
//
// Not compared: the room behind the sheet (the room scene's own agreement), the top bar and the tabs (the phone
// shell's), and the lock's line, which is Frontend's words (the Lead's review of #294, question 3; the probe checks it).
//
// One accepted difference, at the Largest text only (the Lead's review of #294, question 5): the three sizes stack,
// one a row (kit 0.5.0's `stack`, #228's .seg[data-stack]); the frozen pack keeps them side by side. For those
// cases the pack is drawn with the same rule, so everything else is compared as usual, and the case records the
// stacking against the pack as it is.

import { MORE_SCREENS } from '../../../prototype/screens-more.mjs';

const TOLERANCE = 0.5;
/** Kit 0.5.0's stacking of a word segmented control at the Largest text, applied to the pack. */
const STACKED = '.ph .seg { grid-auto-flow: row; }';

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
const OPTIONS = [
  ['group labels', '.group-label', '.ms-k-group-label', true, ['fontSize', 'fontWeight', 'color', 'textTransform', 'letterSpacing']],
  ['lists', '.list', '.ms-k-list', false, ['backgroundColor', 'borderRadius', 'boxShadow']],
  ['rows', '.row', '.ms-k-row', true, ['minHeight']],
  ['row icons', '.row-icon', '.ms-k-row-icon', false, ['backgroundColor', 'color', 'borderRadius']],
  ['row icon drawings', '.row-icon svg', '.ms-k-row-icon svg', false, null],
  ['row titles', '.row-title', '.ms-k-row-title', true, ['fontSize', 'fontWeight', 'color']],
  ['row lines', '.row-sub', '.ms-k-row-sub', true, ['fontSize', 'fontWeight', 'color']],
  ['row chevrons', '.row-chev', '.ms-k-row-chev', false, ['color']],
  ['row chevron drawings', '.row-chev svg', '.ms-k-row-chev svg', false, null],
  ['switch', '.switch', '.ms-k-switch', false, ['backgroundColor', 'borderRadius', 'opacity']],
  ['sizes', '.seg', '.ms-k-seg', false, ['backgroundColor', 'borderRadius', 'boxShadow']],
  ['size buttons', '.seg button', '.ms-k-seg-btn', true, ['backgroundColor', 'color', 'fontSize', 'fontWeight', 'boxShadow']],
  ['note', '.group-note', '.ms-k-group-note', true, ['fontSize', 'color']],
];
const PAGE = [
  ['screen', '.screen', '.ms-ep-screen', false, null],
  ['nav bar', '.nav-bar', '.ms-ep-nav', false, null],
  ['back', '.nav-bar .btn', '.ms-ep-back', true, ['color', 'fontSize', 'fontWeight']],
  ['back icon', '.nav-bar .btn svg', '.ms-ep-back svg', false, null],
  ['title', '.nav-bar h1', '.ms-ep-nav-title', true, ['fontSize', 'fontWeight', 'color']],
];
const SHEET = [
  ['sheet', '.sheet', '.ms-ps-sheet', false, null],
  ['sheet title', '.sheet-title h2', '.ms-ps-sheet-title h2', true, ['fontSize', 'fontWeight']],
  ['sheet body', '.sheet-body', '.ms-ps-sheet-body', false, null],
];

/** Each case: the pack's parameters, the preview's state, a size, the text size if not the Standard, and the stacking. */
const CASES = [
  { id: 'the Display page at 390 × 844', pack: { from: 'menu' }, state: 'page', size: '390x844' },
  { id: 'the Display page, Reduce motion on, at 430 × 932', pack: { from: 'menu', reduced: '1' }, state: 'page-on', size: '430x932' },
  { id: 'the Display page with the Large text (150 %) at 390 × 844', pack: { from: 'menu', size: '1.5' }, state: 'page-large', size: '390x844', text: 150 },
  { id: 'the Display page with the Largest text (200 %) at 430 × 932', pack: { from: 'menu', size: '2' }, state: 'page-largest', size: '430x932', text: 200, stacked: true },
  { id: 'Settings in a match at 390 × 844', pack: {}, state: 'sheet', size: '390x844' },
  { id: 'Settings · host at 390 × 844', pack: { host: '1' }, state: 'sheet-host', size: '390x844' },
  { id: 'Settings · host at 430 × 932', pack: { host: '1' }, state: 'sheet-host', size: '430x932' },
  { id: 'Settings · host with the Largest text (200 %) at 390 × 844', pack: { host: '1', size: '2' }, state: 'sheet-largest', size: '390x844', text: 200, stacked: true },
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
const STATE_ATTRS = ['aria-disabled', 'aria-busy', 'aria-checked', 'aria-label', 'role'];
/** A node's accessible name from its own attributes: aria-label, or the words of what aria-labelledby names. */
const nameOf = node => node.getAttribute('aria-label') ?? (node.getAttribute('aria-labelledby')?.split(/\s+/).map(id => document.getElementById(id)?.textContent ?? '').join(' ').trim() || null);
/** An icon's drawing: its paths and shapes, without the class each side gives it. */
const drawing = svg => svg.innerHTML.replace(/\s+/g, ' ').trim();
/** Whether the three sizes stand one a row: the second under the first. */
const stackedIn = seg => seg.children[1].getBoundingClientRect().top > seg.children[0].getBoundingClientRect().bottom - TOLERANCE;

export async function runDisplaySettingsAgreement({ sizes, states, mountState, disposeState }) {
  await loadPack();
  const checks = [];
  for (const c of CASES) {
    const size = sizes[c.size], s = states[c.state];
    document.documentElement.style.fontSize = c.text ? `${c.text}%` : '';
    const pack = document.createElement('div');
    pack.className = 'ph';
    Object.assign(pack.style, { position: 'absolute', left: '0', top: '0', width: `${size.width}px`, height: `${size.height}px` });
    pack.style.setProperty('--safe-t', `${size.insets.top}px`);
    pack.style.setProperty('--safe-b', `${size.insets.bottom}px`);
    document.body.append(pack);
    MORE_SCREENS.settings(pack, c.pack);
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'absolute', left: `${size.width + 20}px`, top: '0', width: `${size.width}px`, height: `${size.height}px` });
    document.body.append(host);
    const mounted = mountState(host, c.state, size.insets);
    await document.fonts.ready;
    await frames();
    // The sheet's arrival and the switch's slide end where they rest.
    for (const a of [...pack.getAnimations({ subtree: true }), ...host.getAnimations({ subtree: true })]) {
      try { a.finish(); } catch { a.pause(); a.currentTime = 0; }
    }
    await frames();
    const root = host;
    // The stacked sizes: the pack as it is, then (for those cases) drawn with the kit's rule.
    const packSeg = pack.querySelector('.seg'), mineSeg = root.querySelector('.ms-k-seg');
    const asIs = { pack: box(pack, packSeg), screen: box(host, mineSeg), packStacked: stackedIn(packSeg), screenStacked: stackedIn(mineSeg) };
    let patch = null, accepted = null;
    if (c.stacked) {
      patch = document.createElement('style');
      patch.textContent = STACKED;
      document.head.append(patch);
      await frames();
      accepted = { what: 'the three sizes stack, one a row (kit 0.5.0\'s stack, #228\'s .seg[data-stack]; the Lead\'s review of #294, question 5)', ...asIs };
    }
    const differences = [], parts = {};
    for (const [name, packSel, mineSel, compareWords, props] of [...(s.mount === 'page' ? PAGE : SHEET), ...OPTIONS]) {
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
          // A name is compared as a name: the shell names its sheet by its title (aria-labelledby), the pack by aria-label.
          const va = attr === 'aria-label' ? nameOf(na) : na.getAttribute(attr), vb = attr === 'aria-label' ? nameOf(nb) : nb.getAttribute(attr);
          if (va !== null && va !== vb) differences.push({ part: `${name} ${i + 1}`, what: attr, pack: va, screen: vb });
          if (va === null && vb !== null && attr === 'aria-disabled' && vb === 'true') differences.push({ part: `${name} ${i + 1}`, what: attr, pack: va, screen: vb });
        }
      });
    }
    // The switch's thumb: where its ::after rests (off at the left, on 20 px along).
    const thumb = node => getComputedStyle(node, '::after').transform;
    const ta = thumb(pack.querySelector('.switch')), tb = thumb(root.querySelector('.ms-k-switch'));
    if (ta !== tb) differences.push({ part: 'switch thumb', what: 'transform', pack: ta, screen: tb });
    // A stacked case shows the sizes one a row, and the pack's as drawn side by side; a Standard case, side by side as the pack.
    const fits = c.stacked ? asIs.screenStacked && !asIs.packStacked && stackedIn(packSeg) : !asIs.screenStacked && !asIs.packStacked;
    checks.push({ id: `agree: ${c.id}`, ok: differences.length === 0 && fits, detail: { differences, parts, accepted } });
    patch?.remove();
    disposeState(mounted);
    pack.remove();
    host.remove();
  }
  document.documentElement.style.fontSize = '';
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}
