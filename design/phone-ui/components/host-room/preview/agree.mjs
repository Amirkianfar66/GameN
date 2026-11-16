// mothership:dev-only
//
// The screens beside the pack: the frozen prototype's host setup and host lobby (design/phone-ui/prototype/
// screens-entry.mjs ENTRY_SCREENS['host-setup'] and ['host-lobby'], with kit.css and screens.css) and the
// runtime screens (../host-setup.mjs, ../host-lobby.mjs), drawn in the same page at the same size, compared
// case by case: the words, the states, the look and where each part sits, to within half a pixel. It is how
// the screens show they draw sheet 11 and not a second design of it.
//
// One recorded difference, from the interface the Lead approved on #287: at the most bots, + is refused (and
// dimmed, as the kit's stepper is); the pack's Full state leaves it as it is. The case records it.
// One improvement, with the larger text only: the pack's code row pushes Copy past the card, and the code
// card's row wraps instead (entry-parts.css). For those cases the pack is drawn with the same two rules, so
// everything else is compared as usual, and the case records the improvement against the pack as it is.

import { ENTRY_SCREENS } from '../../../prototype/screens-entry.mjs';

const TOLERANCE = 0.5;
/** The code card's larger-text rules (entry-parts.css), applied to the pack for the cases that show them. */
const IMPROVED = '.ph .code-card .code-row { flex-wrap: wrap; container-type: inline-size; } .ph .code-card .code { flex: 1 0 auto; font-size: min(2.5rem, 21cqi); }';

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
  ['group notes', '.group-note', '.ms-k-group-note', true, ['fontSize', 'color', 'textAlign']],
  ['lists', '.list', '.ms-k-list', false, ['backgroundColor', 'borderRadius']],
  ['rows', '.row', '.ms-k-row', true, null],
  ['row icons', '.row-icon', '.ms-k-row-icon', false, ['backgroundColor', 'color']],
  ['row icon pictures', '.row-icon svg', '.ms-k-row-icon svg', false, null],
  ['row titles', '.row-title', '.ms-k-row-title', true, ['fontSize', 'fontWeight']],
  ['row subs', '.row-sub', '.ms-k-row-sub', true, ['fontSize', 'color']],
  ['foot', '.screen-foot', '.ms-ep-foot', false, null],
  ['foot buttons', '.screen-foot .btn', '.ms-ep-foot .ms-k-btn', true, ['backgroundColor', 'color', 'opacity', 'fontSize', 'fontWeight']],
];
const SETUP = [
  ['large title', '.large-title', '.ms-ep-large-title', true, ['fontSize', 'fontWeight', 'letterSpacing']],
  ['seg', '.seg', '.ms-k-seg', false, ['backgroundColor', 'borderRadius']],
  ['seg buttons', '.seg button', '.ms-k-seg-btn', true, ['backgroundColor', 'color', 'fontSize', 'fontWeight']],
];
const LOBBY = [
  ['code card', '.code-card', '.ms-ep-code-card', false, ['backgroundColor', 'borderRadius', 'boxShadow']],
  ['code label', '.code-label', '.ms-ep-code-label', true, ['fontSize', 'fontWeight', 'letterSpacing', 'color']],
  ['code', '.code', '.ms-ep-code', true, ['fontSize', 'fontWeight', 'letterSpacing', 'color']],
  ['copy', '.code-row .btn', '.ms-ep-copy', true, ['backgroundColor', 'color', 'fontSize']],
  ['copy icon', '.code-row .btn svg', '.ms-ep-copy svg', false, null],
  ['seats', '.meta > span:first-child', '.ms-ep-code-seats', true, ['fontSize', 'color']],
  ['bar', '.progress', '.ms-ep-progress', false, ['backgroundColor']],
  ['bar fill', '.progress i', '.ms-ep-progress i', false, ['backgroundColor']],
  ['seat numbers', '.num', '.ms-k-num', true, ['backgroundColor', 'color', 'fontSize']],
  ['row buttons', '.row .btn', '.ms-k-row .ms-k-btn', true, ['backgroundColor', 'color', 'fontSize']],
  ['stepper', '.stepper', '.ms-k-stepper', false, ['backgroundColor', 'borderRadius']],
  ['stepper value', '.stepper output', '.ms-k-stepper-value', true, ['fontSize', 'fontWeight']],
  ['stepper −', '.stepper button:first-of-type', '.ms-k-stepper-btn:first-of-type', false, ['opacity']],
  ['stepper +', '.stepper button:last-of-type', '.ms-k-stepper-btn:last-of-type', false, ['opacity']],
  ['toast', '.toast', '.ms-ep-toast', true, ['backgroundColor', 'color', 'borderRadius', 'boxShadow', 'fontSize', 'fontWeight', 'paddingLeft', 'paddingTop']],
  ['toast icon', '.toast svg', '.ms-ep-toast svg', false, null],
];

/** Each case: the pack's screen and parameters, the preview's state, a size, and what it records instead of comparing. */
const CASES = [
  { id: 'setup · 9 at 390 × 844', pack: ['host-setup', { count: 9 }], state: 'setup', size: '390x844' },
  { id: 'setup · 7 at 430 × 932', pack: ['host-setup', { count: 7 }], state: 'setup-7', size: '430x932' },
  { id: 'setup · opening at 390 × 844', pack: ['host-setup', { count: 9, state: 'creating' }], state: 'opening', size: '390x844' },
  { id: 'lobby · 5 of 9 at 390 × 844', pack: ['host-lobby', { state: 'waiting' }], state: 'lobby', size: '390x844' },
  { id: 'lobby · requests at 390 × 844', pack: ['host-lobby', { state: 'requests' }], state: 'requests', size: '390x844' },
  { id: 'lobby · copied, with the toast, at 390 × 844', pack: ['host-lobby', { state: 'copied' }], state: 'copied', size: '390x844' },
  { id: 'lobby · full at 430 × 932', pack: ['host-lobby', { state: 'full' }], state: 'full', size: '430x932', recorded: ['stepper +'] },
  { id: 'setup · 9 with the Largest text (200 %) at 390 × 844', pack: ['host-setup', { count: 9 }], state: 'setup-large', size: '390x844', text: 200 },
  { id: 'lobby · requests with the Large text (150 %) at 390 × 844', pack: ['host-lobby', { state: 'requests' }], state: 'requests', size: '390x844', text: 150, improved: true },
  { id: 'lobby · requests with the Largest text (200 %) at 390 × 844', pack: ['host-lobby', { state: 'requests' }], state: 'lobby-large', size: '390x844', text: 200, improved: true },
  { id: 'lobby · requests with the Largest text (200 %) at 430 × 932', pack: ['host-lobby', { state: 'requests' }], state: 'lobby-large', size: '430x932', text: 200, improved: true },
];

const visible = node => !!node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden' && !node.closest('[hidden]');
function box(frame, node) {
  const f = frame.getBoundingClientRect(), r = node.getBoundingClientRect();
  return { x: r.left - f.left, y: r.top - f.top, w: r.width, h: r.height };
}
const words = node => node.innerText.replace(/\s+/g, ' ').trim();
const near = (a, b) => ['x', 'y', 'w', 'h'].every(k => Math.abs(a[k] - b[k]) <= TOLERANCE);
const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
const looks = (node, props) => Object.fromEntries(props.map(p => [p, getComputedStyle(node)[p]]));
const STATE_ATTRS = ['aria-disabled', 'aria-busy', 'aria-checked', 'aria-label', 'role'];

export async function runHostRoomAgreement({ sizes, states }) {
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
    // The toast has arrived: its entrance (220 ms) is finished before it is measured.
    for (const a of host.getAnimations({ subtree: true })) if (Number.isFinite(a.effect?.getComputedTiming().endTime)) a.finish();
    await frames();
    const root = screen.element;
    // Copy against the card's content edge: the pack as it is, then (for the improved cases) with the rules.
    const copyFit = (frame, card, copy) => {
      const c = card.getBoundingClientRect(), b = copy.getBoundingClientRect(), pad = parseFloat(getComputedStyle(card).paddingRight);
      return { copyRight: Math.round((b.right - frame.getBoundingClientRect().left) * 100) / 100, contentRight: Math.round((c.right - pad - frame.getBoundingClientRect().left) * 100) / 100, inside: b.right <= c.right - pad + TOLERANCE };
    };
    let improvement = null, patch = null;
    if (c.pack[0] === 'host-lobby') {
      const before = copyFit(pack, pack.querySelector('.code-card'), pack.querySelector('.code-row .btn'));
      const mine = copyFit(host, root.querySelector('.ms-ep-code-card'), root.querySelector('.ms-ep-copy'));
      if (c.improved) {
        patch = document.createElement('style');
        patch.textContent = IMPROVED;
        document.head.append(patch);
        await frames();
        improvement = { what: 'the code card\'s row wraps: Copy under the code, inside the card', pack: before, screen: mine };
      } else if (!before.inside || !mine.inside) improvement = { what: 'Copy outside the card at the Standard text', pack: before, screen: mine };
    }
    const differences = [], recorded = [], parts = {};
    for (const [name, packSel, mineSel, compareWords, props] of [...COMMON, ...(c.pack[0] === 'host-setup' ? SETUP : LOBBY)]) {
      const a = [...pack.querySelectorAll(packSel)].filter(visible), b = [...root.querySelectorAll(mineSel)].filter(visible);
      const into = (c.recorded ?? []).includes(name) ? recorded : differences;
      parts[name] = { pack: a.length, screen: b.length };
      if (a.length !== b.length) { into.push({ part: name, what: 'count', pack: a.length, screen: b.length }); continue; }
      a.forEach((na, i) => {
        const nb = b[i], pa = box(pack, na), pb = box(host, nb);
        if (!near(pa, pb)) into.push({ part: `${name} ${i + 1}`, what: 'box', pack: pa, screen: pb });
        if (compareWords && words(na) !== words(nb)) into.push({ part: `${name} ${i + 1}`, what: 'words', pack: words(na), screen: words(nb) });
        if (props) { const la = looks(na, props), lb = looks(nb, props); if (JSON.stringify(la) !== JSON.stringify(lb)) into.push({ part: `${name} ${i + 1}`, what: 'look', pack: la, screen: lb }); }
        for (const attr of STATE_ATTRS) {
          const va = na.getAttribute(attr), vb = nb.getAttribute(attr);
          // The kit's stepper names its group and the room code is named a character at a time, as the pack's.
          if (va !== null && va !== vb) into.push({ part: `${name} ${i + 1}`, what: attr, pack: va, screen: vb });
          if (va === null && vb !== null && attr === 'aria-disabled' && vb === 'true') into.push({ part: `${name} ${i + 1}`, what: attr, pack: va, screen: vb });
        }
      });
    }
    // An improved case shows the pack's Copy outside the card and the screen's inside; a Standard case has none.
    const improved = c.improved ? !improvement.pack.inside && improvement.screen.inside : improvement === null;
    checks.push({ id: `agree: ${c.id}`, ok: differences.length === 0 && improved, detail: { differences, recorded, parts, improvement } });
    patch?.remove();
    screen.dispose();
    pack.remove();
    host.remove();
  }
  document.documentElement.style.fontSize = '';
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}
