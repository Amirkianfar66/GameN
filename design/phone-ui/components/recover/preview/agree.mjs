// mothership:dev-only
//
// The screen beside the pack: the frozen prototype's recover screen (design/phone-ui/prototype/screens-entry.mjs
// ENTRY_SCREENS.recover, with kit.css and screens.css) and the runtime screen (../recover.mjs), drawn in the same
// page at the same size, compared case by case: the words, the states, the look and where each part sits, to
// within half a pixel. It is how the screen shows it draws sheet 14 and not a second design of it.
//
// The pack draws its boxes as pictures (a span for the value, the placeholder or the code's dots, and a caret);
// the screen's are real ones. So the boxes are compared, the Match ID and the placeholders by their words, and the
// code by whether the box holds one (the pack's dots against the password box's).

import { ENTRY_SCREENS } from '../../../prototype/screens-entry.mjs';

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
const COMMON = [
  ['screen', '.screen', '.ms-ep-screen', false, null],
  ['nav bar', '.nav-bar', '.ms-ep-nav', false, null],
  ['back', '.nav-bar .btn', '.ms-ep-back', true, ['color', 'fontSize', 'fontWeight', 'opacity']],
  ['back icon', '.nav-bar .btn svg', '.ms-ep-back svg', false, null],
  ['title', '.nav-bar h1', '.ms-ep-nav-title', true, ['fontSize', 'fontWeight', 'color']],
  ['errors', '.error', '.ms-k-error', true, ['backgroundColor', 'color', 'fontSize', 'borderRadius']],
  ['error icons', '.error svg', '.ms-k-error svg', false, ['color']],
  ['group notes', '.group-note', '.ms-k-group-note', true, ['fontSize', 'color', 'textAlign']],
  ['foot', '.screen-foot', '.ms-ep-foot', false, null],
  ['foot buttons', '.screen-foot .btn', '.ms-ep-foot .ms-k-btn', true, ['backgroundColor', 'color', 'opacity', 'fontSize', 'fontWeight']],
  ['foot button icons', '.screen-foot .btn svg', '.ms-ep-foot .ms-k-btn svg', false, null],
];
const FORM = [
  ['large title', '.large-title', '.ms-ep-large-title', true, ['fontSize', 'fontWeight', 'letterSpacing']],
  ['fields', '.field', '.ms-k-field', false, null],
  ['field labels', '.field > span', '.ms-k-field > .ms-k-field-label', true, ['fontSize', 'fontWeight', 'color']],
  ['boxes', '.input', '.ms-k-input', false, ['backgroundColor', 'boxShadow', 'borderRadius', 'fontSize', 'fontFamily', 'letterSpacing']],
];
const RECOVERED = [
  ['wait', '.wait', '.ms-k-wait', false, null],
  ['wait tile', '.wait .big-icon', '.ms-k-wait-tile', false, ['backgroundColor', 'color', 'borderRadius']],
  ['wait icon', '.wait .big-icon svg', '.ms-k-wait-tile svg', false, null],
  ['wait title', '.wait h2', '.ms-k-wait-title', true, ['fontSize', 'fontWeight']],
  ['wait line', '.wait p', '.ms-k-wait-line', true, ['fontSize', 'color']],
];

/** Each case: the pack's state, the preview's state, a size, and the text size if not the Standard. */
const CASES = [
  { id: 'entry, typing the Match ID, at 390 × 844', pack: { state: 'entry' }, state: 'entry', size: '390x844' },
  { id: 'refused at 390 × 844', pack: { state: 'refused' }, state: 'refused', size: '390x844' },
  { id: 'refused at 430 × 932', pack: { state: 'refused' }, state: 'refused', size: '430x932' },
  { id: 'checking at 430 × 932', pack: { state: 'sending' }, state: 'checking', size: '430x932' },
  { id: 'seat recovered at 390 × 844', pack: { state: 'success' }, state: 'recovered', size: '390x844' },
  { id: 'refused with the Largest text (200 %) at 390 × 844', pack: { state: 'refused' }, state: 'refused-large', size: '390x844', text: 200 },
  { id: 'seat recovered with the Largest text (200 %) at 430 × 932', pack: { state: 'success' }, state: 'recovered-large', size: '430x932', text: 200 },
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
const STATE_ATTRS = ['aria-disabled', 'aria-busy', 'aria-label', 'role'];
/** An icon's drawing: its paths and shapes, without the class each side gives it. */
const drawing = svg => svg.innerHTML.replace(/\s+/g, ' ').trim();

export async function runRecoverAgreement({ sizes, states }) {
  await loadPack();
  const { mountScreen } = await import('./preview.mjs');
  const checks = [];
  for (const c of CASES) {
    const size = sizes[c.size], s = states[c.state];
    document.documentElement.style.fontSize = c.text ? `${c.text}%` : '';
    const pack = document.createElement('div');
    pack.className = 'ph';
    Object.assign(pack.style, { position: 'absolute', left: '0', top: '0', width: `${size.width}px`, height: `${size.height}px` });
    pack.style.setProperty('--safe-t', `${size.insets.top}px`);
    pack.style.setProperty('--safe-b', `${size.insets.bottom}px`);
    ENTRY_SCREENS.recover(pack, c.pack);
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'absolute', left: `${size.width + 20}px`, top: '0', width: `${size.width}px`, height: `${size.height}px` });
    document.body.append(pack, host);
    const screen = mountScreen(host, s, size.insets, {});
    await document.fonts.ready;
    await frames();
    for (const a of [...pack.getAnimations({ subtree: true }), ...host.getAnimations({ subtree: true })]) { a.pause(); a.currentTime = 0; }
    await frames();
    const root = screen.element, form = c.pack.state !== 'success';
    const differences = [], parts = {};
    for (const [name, packSel, mineSel, compareWords, props] of [...COMMON, ...(form ? FORM : RECOVERED)]) {
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
    // The boxes' words: the pack's picture of a value or a placeholder against the real box's; the code by whether it holds one.
    if (form) {
      const [idPic, codePic] = [...pack.querySelectorAll('.input')];
      const pictured = pic => ({ value: pic.querySelector('span:not(.ph-text):not(.count)')?.textContent ?? '', placeholder: pic.querySelector('.ph-text')?.textContent ?? null });
      const [idBox, codeBox] = [...root.querySelectorAll('.ms-k-input-text')];
      const real = input => ({ value: input.value, placeholder: input.value ? null : input.placeholder });
      const said = [['Match ID', pictured(idPic), real(idBox)], ['code placeholder', pictured(codePic).placeholder, real(codeBox).placeholder],
        ['code typed', pictured(codePic).value.length > 0, codeBox.value.length > 0], ['code hidden', true, codeBox.type === 'password']];
      for (const [what, a, b] of said) if (JSON.stringify(a) !== JSON.stringify(b)) differences.push({ part: what, what: 'words', pack: a, screen: b });
    }
    checks.push({ id: `agree: ${c.id}`, ok: differences.length === 0, detail: { differences, parts } });
    screen.dispose();
    pack.remove();
    host.remove();
  }
  document.documentElement.style.fontSize = '';
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}
