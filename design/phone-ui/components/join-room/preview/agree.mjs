// mothership:dev-only
//
// The screens beside the pack: the frozen prototype's join and waiting screens (design/phone-ui/prototype/
// screens-entry.mjs ENTRY_SCREENS.join and ['join-wait'], with kit.css and screens.css) and the runtime screens
// (../join-form.mjs, ../join-wait.mjs), drawn in the same page at the same size, compared case by case: the
// words, the states, the look and where each part sits, to within half a pixel. It is how the screens show they
// draw sheets 12 and 13 and not a second design of them.
//
// The pack draws its text boxes as pictures (a span for the value or the placeholder, and a caret); the form's
// are real ones. So the boxes are compared, and the value and the placeholder by their words.
//
// One accepted difference, at the Largest text only: the device choice stacks one option per row (kit 0.5.0's
// `stack`, #228's .seg[data-stack], as the Lead asked on #289); the frozen pack keeps the two side by side,
// squeezed, as the kit's own check records. For that case the pack is drawn with the same rule, so everything
// else is compared as usual, and the case records the stacking against the pack as it is.

import { ENTRY_SCREENS } from '../../../prototype/screens-entry.mjs';

const TOLERANCE = 0.5;
/** Kit 0.5.0's stacking of a word segmented control at the Largest text (kit.css, the .ms-k-phone container query), applied to the pack. */
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

/** The parts compared, every match in order: [name, the pack's selector, the screen's selector, words, look]. */
const COMMON = [
  ['screen', '.screen', '.ms-ep-screen', false, null],
  ['nav bar', '.nav-bar', '.ms-ep-nav', false, null],
  ['back', '.nav-bar .btn', '.ms-ep-back', true, ['color', 'fontSize', 'fontWeight', 'opacity']],
  ['back icon', '.nav-bar .btn svg', '.ms-ep-back svg', false, null],
  ['title', '.nav-bar h1', '.ms-ep-nav-title', true, ['fontSize', 'fontWeight', 'color']],
  ['group labels', '.group-label', '.ms-k-group-label', true, ['fontSize', 'fontWeight', 'color', 'textTransform', 'letterSpacing']],
  ['errors', '.error', '.ms-k-error', true, ['backgroundColor', 'color', 'fontSize', 'borderRadius']],
  ['error icons', '.error svg', '.ms-k-error svg', false, ['color']],
  ['foot', '.screen-foot', '.ms-ep-foot', false, null],
  ['foot buttons', '.screen-foot .btn', '.ms-ep-foot .ms-k-btn', true, ['backgroundColor', 'color', 'opacity', 'fontSize', 'fontWeight']],
  ['foot button icons', '.screen-foot .btn svg', '.ms-ep-foot .ms-k-btn svg', false, null],
];
const FORM = [
  ['large title', '.large-title', '.ms-ep-large-title', true, ['fontSize', 'fontWeight', 'letterSpacing']],
  ['fields', '.field', '.ms-k-field', false, null],
  ['field labels', '.field > span', '.ms-k-field > .ms-k-field-label', true, ['fontSize', 'fontWeight', 'color']],
  ['code boxes', '.code-boxes', '.ms-k-code', false, null],
  ['code box', '.code-boxes b', '.ms-k-code-box', true, ['backgroundColor', 'boxShadow', 'borderRadius', 'fontSize', 'fontWeight', 'fontFamily']],
  ['name box', '.input', '.ms-k-input', false, ['backgroundColor', 'boxShadow', 'borderRadius', 'fontSize']],
  ['name count', '.input .count', '.ms-k-input-count', true, ['fontSize', 'color']],
  ['seg', '.seg', '.ms-k-seg', false, ['backgroundColor', 'borderRadius']],
  ['seg buttons', '.seg button', '.ms-k-seg-btn', true, ['backgroundColor', 'color', 'fontSize', 'fontWeight']],
  ['seg icons', '.seg button svg', '.ms-k-seg-btn svg', false, null],
];
const WAIT = [
  ['wait', '.wait', '.ms-k-wait', false, null],
  ['wait tile', '.wait .big-icon', '.ms-k-wait-tile', false, ['backgroundColor', 'color', 'borderRadius']],
  ['wait icon', '.wait .big-icon svg', '.ms-k-wait-tile svg', false, null],
  ['wait title', '.wait h2', '.ms-k-wait-title', true, ['fontSize', 'fontWeight']],
  ['wait line', '.wait p', '.ms-k-wait-line', true, ['fontSize', 'color']],
  ['check again', '.wait .btn', '.ms-k-wait .ms-k-btn', true, ['color', 'fontSize', 'fontWeight']],
  ['seat badge', '.seat-badge', '.ms-ep-seat-badge', true, ['backgroundColor', 'color', 'fontSize', 'fontWeight', 'borderRadius']],
  ['seat badge number', '.seat-badge .num', '.ms-ep-seat-badge .ms-k-num', true, ['backgroundColor', 'color', 'fontSize']],
  ['lists', '.list', '.ms-k-list', false, ['backgroundColor', 'borderRadius']],
  ['rows', '.row', '.ms-k-row', true, null],
  ['seat numbers', '.row .num', '.ms-k-row .ms-k-num', true, ['backgroundColor', 'color', 'fontSize']],
  ['foot note', '.screen-foot .group-note', '.ms-ep-foot .ms-k-group-note', true, ['fontSize', 'color', 'textAlign']],
  ['spinner', '.screen-foot .spinner', '.ms-ep-foot .ms-k-spinner', false, null],
];

/** Each case: the pack's screen and parameters, the preview's state, a size, and the text size if not the Standard. */
const CASES = [
  { id: 'join · empty, typing the code, at 390 × 844', pack: ['join', { state: 'empty' }], state: 'empty', size: '390x844' },
  { id: 'join · no such room at 390 × 844', pack: ['join', { state: 'no-room' }], state: 'no-room', size: '390x844' },
  { id: 'join · already started at 430 × 932', pack: ['join', { state: 'started' }], state: 'started', size: '430x932' },
  { id: 'join · name too long at 390 × 844', pack: ['join', { state: 'name' }], state: 'name', size: '390x844' },
  { id: 'join · sending at 430 × 932', pack: ['join', { state: 'sending' }], state: 'sending', size: '430x932' },
  { id: 'join · busy at 390 × 844', pack: ['join', { state: 'busy' }], state: 'busy', size: '390x844' },
  { id: 'waiting for the host at 390 × 844', pack: ['join-wait', { state: 'pending' }], state: 'pending', size: '390x844' },
  { id: 'admitted · the lobby at 430 × 932', pack: ['join-wait', { state: 'admitted' }], state: 'admitted', size: '430x932' },
  { id: 'room started without you at 390 × 844', pack: ['join-wait', { state: 'closed' }], state: 'closed', size: '390x844' },
  { id: 'join · no such room with the Largest text (200 %) at 390 × 844', pack: ['join', { state: 'no-room' }], state: 'form-large', size: '390x844', text: 200, stacked: true },
  { id: 'admitted · the lobby with the Largest text (200 %) at 430 × 932', pack: ['join-wait', { state: 'admitted' }], state: 'wait-large', size: '430x932', text: 200 },
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
/** An icon's drawing: its paths and shapes, without the class each side gives it. */
const drawing = svg => svg.innerHTML.replace(/\s+/g, ' ').trim();

export async function runJoinRoomAgreement({ sizes, states }) {
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
    ENTRY_SCREENS[c.pack[0]](pack, c.pack[1]);
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'absolute', left: `${size.width + 20}px`, top: '0', width: `${size.width}px`, height: `${size.height}px` });
    document.body.append(pack, host);
    const screen = mountScreen(host, s, size.insets, {});
    await document.fonts.ready;
    await frames();
    // The spinners turn: their first frame is compared, as the boxes are.
    for (const a of [...pack.getAnimations({ subtree: true }), ...host.getAnimations({ subtree: true })]) { a.pause(); a.currentTime = 0; }
    await frames();
    const root = screen.element;
    // The stacked device choice: the pack as it is, then (for that case) drawn with the kit's rule.
    let accepted = null, patch = null;
    if (c.pack[0] === 'join') {
      const packSeg = box(pack, pack.querySelector('.seg')), mineSeg = box(host, root.querySelector('.ms-k-seg'));
      const stacked = root.querySelector('.ms-k-seg').children[1].getBoundingClientRect().top > root.querySelector('.ms-k-seg').children[0].getBoundingClientRect().bottom - TOLERANCE;
      if (c.stacked) {
        patch = document.createElement('style');
        patch.textContent = STACKED;
        document.head.append(patch);
        await frames();
        accepted = { what: 'the device choice stacks, one option per row (kit 0.5.0\'s stack, #228\'s .seg[data-stack])', pack: packSeg, screen: mineSeg, stacked };
      } else if (stacked) accepted = { what: 'the device choice stacked at the Standard text', pack: packSeg, screen: mineSeg, stacked };
    }
    const differences = [], parts = {};
    for (const [name, packSel, mineSel, compareWords, props] of [...COMMON, ...(c.pack[0] === 'join' ? FORM : WAIT)]) {
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
    // The text boxes: the pack's picture of a value or a placeholder against the real box's value or placeholder.
    if (c.pack[0] === 'join') {
      const field = pack.querySelector('label.field .input'), value = field.querySelector('span:not(.count):not(.ph-text)'), placeholder = field.querySelector('.ph-text');
      const input = root.querySelector('.ms-k-input-text');
      const said = [['name value', value?.textContent ?? '', input.value], ['name placeholder', placeholder?.textContent ?? null, input.value ? null : input.placeholder],
        ['code', [...pack.querySelectorAll('.code-boxes b')].map(b => b.textContent).join(''), root.querySelector('.ms-jf-code-input').value]];
      for (const [what, a, b] of said) if (a !== b) differences.push({ part: what, what: 'words', pack: a, screen: b });
    }
    // A stacked case shows the screen's options one per row; a Standard case shows them side by side, as the pack.
    const fits = c.stacked ? accepted.stacked && accepted.screen.h > accepted.pack.h : accepted === null;
    checks.push({ id: `agree: ${c.id}`, ok: differences.length === 0 && fits, detail: { differences, parts, accepted } });
    patch?.remove();
    screen.dispose();
    pack.remove();
    host.remove();
  }
  document.documentElement.style.fontSize = '';
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}
