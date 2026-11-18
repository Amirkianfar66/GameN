// mothership:dev-only
//
// The shell beside the pack: the pinned prototype's topBar(), tabs(), sheet() and banner() (design/phone-ui/prototype/ui.mjs
// with kit.css, which the frozen Food release pins, so they stay as they are) and the runtime shell
// (../phone-shell.mjs), drawn in the same page from the same inputs, compared case by case: the words,
// the states (open, unavailable, the hero's mode) and where each part sits, to within half a pixel. It
// is how the shell shows it draws the pack's bars and not a second design of them.
// The phase bars too (0.2.10): each bar the pack draws for a game step (phase-cases.mjs), the pack's own input
// to topBar() beside the shell drawing what ../phase-bars.mjs returns for that step.
// One departure (0.3.0, the owner's 18 November 2026 decision): Card and Panels change places. Each of the two is
// compared with the pack's tab of the same name for its words and state, and with the pack's other tab for its
// place: the shell's Card lies where the pack draws Panels, and its Panels where the pack draws Card. No case
// gives the shell a person, so its Card tab draws the pack's card icon here; the probe checks the portrait.

import { topBar, tabs, sheet, button, banner } from '../../../prototype/ui.mjs';
import { mountPhoneShell } from '../phone-shell.mjs';
import { seatOf } from '../../../prototype/fixtures.mjs';
import { PHASE_CASES } from './phase-cases.mjs';

const TOLERANCE = 0.5;

/** Loads the pack's own stylesheet into this page, for the pack's half of the comparison. */
function loadKit() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('../../../prototype/kit.css', import.meta.url).href;
  const loaded = new Promise((done, fail) => { link.onload = done; link.onerror = () => fail(new Error('kit.css did not load')); });
  document.head.append(link);
  return loaded;
}

/** The pack's input and the shell's, for one case. */
const CASES = [
  { id: 'turn', pack: { bar: { kind: 'turn', who: seatOf(6), self: false, round: 3, seconds: 42, promises: { badge: 1 } }, tabs: { view: 'room', hero: 'pass-off' } },
    shell: { bar: { kind: 'turn', who: seatOf(6), self: false, round: 3, timer: { remainingMs: 42000 }, promises: { count: 1 }, menu: {} }, tabs: { view: 'room', hero: { mode: 'pass', enabled: false } } } },
  { id: 'own', pack: { bar: { kind: 'turn', who: seatOf(4), self: true, round: 3, seconds: 8 }, tabs: { view: 'room', hero: 'pass' } },
    shell: { bar: { kind: 'turn', who: seatOf(4), self: true, round: 3, timer: { remainingMs: 8000 }, promises: { count: 0 }, menu: {} }, tabs: { view: 'room', hero: { mode: 'pass' } } } },
  { id: 'phase-result', pack: { bar: { kind: 'phase', icon: 'jail', title: 'Jail vote · result', short: 'Vote result', round: 3, seconds: 3, ring: 0.6 }, tabs: { view: 'room', hero: 'vote-off' } },
    shell: { bar: { kind: 'phase', icon: 'jail', title: 'Jail vote · result', short: 'Vote result', round: 3, timer: { remainingMs: 3000, ring: 0.6 }, menu: {} }, tabs: { view: 'room', hero: { mode: 'vote', enabled: false } } } },
  { id: 'pair', pack: { bar: { kind: 'pair', pair: [seatOf(1), seatOf(4)], sub: 'Private talk', round: 3, seconds: 47 }, tabs: { view: 'board', open: 'actions', hero: 'vote', badges: { panels: 2 } } },
    shell: { bar: { kind: 'pair', pair: [seatOf(1), seatOf(4)], sub: 'Private talk', round: 3, timer: { remainingMs: 47000 }, promises: { count: 0 }, menu: {} }, tabs: { view: 'board', open: 'actions', hero: { mode: 'vote' }, badges: { panels: 2 } } } },
  { id: 'large-own', text: 200, width: 320, height: 568, insets: { top: 20, bottom: 0 },
    pack: { bar: { kind: 'turn', who: seatOf(4), self: true, round: 3, seconds: 42, promises: { badge: 1 } }, tabs: { view: 'room', hero: 'pass' } },
    shell: { bar: { kind: 'turn', who: seatOf(4), self: true, round: 3, timer: { remainingMs: 42000 }, promises: { count: 1 }, menu: {} }, tabs: { view: 'room', hero: { mode: 'pass' } } } },
  { id: 'large-phase', text: 200, width: 320, height: 568, insets: { top: 20, bottom: 0 },
    pack: { bar: { kind: 'phase', icon: 'jail', title: 'Jail vote · result', short: 'Vote result', round: 3, seconds: 3, ring: 0.6 }, tabs: { view: 'room', hero: 'vote-off' } },
    shell: { bar: { kind: 'phase', icon: 'jail', title: 'Jail vote · result', short: 'Vote result', round: 3, timer: { remainingMs: 3000, ring: 0.6 }, menu: {} }, tabs: { view: 'room', hero: { mode: 'vote', enabled: false } } } },
  // A docked sheet with Back (0.2.5): the pack's sheet() as sheet 15 draws it. The code's view: its title and the
  // line under it, Back, Close, and Hide · Copy in the footer; the confirm: Keep playing · Abort match (warn).
  { id: 'sheet-code', pack: { bar: { kind: 'turn', who: seatOf(6), self: false, round: 3, seconds: 42, promises: { badge: 1 } }, tabs: { view: 'room', hero: 'pass-off' },
    sheet: { title: 'Recovery code', sub: 'Private to this phone', back: 's=host-controls', close: true, detent: 'large', foot: () => [button('Hide', { kind: 'secondary', icon: 'hide' }), button('Copy', { icon: 'copy' })] } },
    shell: { bar: { kind: 'turn', who: seatOf(6), self: false, round: 3, timer: { remainingMs: 42000 }, promises: { count: 1 }, menu: {} }, tabs: { view: 'room', hero: { mode: 'pass', enabled: false } },
      sheet: { id: 'code', title: 'Recovery code', sub: 'Private to this phone', back: true, close: true, detent: 'large', actions: [{ id: 'hide', label: 'Hide', icon: 'hide', local: true }, { id: 'copy', label: 'Copy', icon: 'copy', kind: 'primary', local: true }] } } },
  { id: 'sheet-abort', pack: { bar: { kind: 'turn', who: seatOf(6), self: false, round: 3, seconds: 42, promises: { badge: 1 } }, tabs: { view: 'room', hero: 'pass-off' },
    sheet: { title: 'Host controls', back: 's=host-controls', close: true, detent: 'large', foot: () => [button('Keep playing', { kind: 'secondary' }), button('Abort match', { kind: 'warn' })] } },
    shell: { bar: { kind: 'turn', who: seatOf(6), self: false, round: 3, timer: { remainingMs: 42000 }, promises: { count: 1 }, menu: {} }, tabs: { view: 'room', hero: { mode: 'pass', enabled: false } },
      sheet: { id: 'abort', title: 'Host controls', back: true, close: true, detent: 'large', actions: [{ id: 'keep', label: 'Keep playing', local: true }, { id: 'abort', label: 'Abort match', kind: 'warn' }] } } },
  // The same at 200 % text on the review frame: the title and its line wrap as the pack's, and Hide · Copy, which
  // fit side by side, keep the pack's equal halves.
  { id: 'large-sheet-code', text: 200, pack: { bar: { kind: 'turn', who: seatOf(6), self: false, round: 3, seconds: 42, promises: { badge: 1 } }, tabs: { view: 'room', hero: 'pass-off' },
    sheet: { title: 'Recovery code', sub: 'Private to this phone', back: 's=host-controls', close: true, detent: 'large', foot: () => [button('Hide', { kind: 'secondary', icon: 'hide' }), button('Copy', { icon: 'copy' })] } },
    shell: { bar: { kind: 'turn', who: seatOf(6), self: false, round: 3, timer: { remainingMs: 42000 }, promises: { count: 1 }, menu: {} }, tabs: { view: 'room', hero: { mode: 'pass', enabled: false } },
      sheet: { id: 'code', title: 'Recovery code', sub: 'Private to this phone', back: true, close: true, detent: 'large', actions: [{ id: 'hide', label: 'Hide', icon: 'hide', local: true }, { id: 'copy', label: 'Copy', icon: 'copy', kind: 'primary', local: true }] } } },
  // The banner (0.2.8), as the pack's one builder draws both kinds (ui.mjs banner()): reconnecting with Retry, as sheet
  // 45 draws it (screens-game.mjs), and an eliminated player's, words only, as sheet 44's Eliminated frame draws it
  // (screens-more.mjs); that one also at the Largest text on the small phone, where its words wrap.
  { id: 'banner-stale', pack: { bar: { kind: 'turn', who: seatOf(6), self: false, round: 3, seconds: 42, promises: { badge: 1 } }, tabs: { view: 'room', hero: 'pass-off' },
    banner: { icon: 'offline', title: 'Connection lost', sub: 'Controls return when the match is current', action: () => button('Retry', { kind: 'secondary', small: true }) } },
    shell: { bar: { kind: 'turn', who: seatOf(6), self: false, round: 3, timer: { remainingMs: 42000 }, promises: { count: 1 }, menu: {} }, tabs: { view: 'room', hero: { mode: 'pass', enabled: false } }, banner: { kind: 'reconnecting' } } },
  { id: 'banner-out', pack: { bar: { kind: 'turn', who: seatOf(6), self: false, round: 3, seconds: 42, promises: { badge: 1 } }, tabs: { view: 'room', hero: 'pass-off' },
    banner: { icon: 'eliminated', title: 'You’re out', sub: 'You can watch. Your role stays private.' } },
    shell: { bar: { kind: 'turn', who: seatOf(6), self: false, round: 3, timer: { remainingMs: 42000 }, promises: { count: 1 }, menu: {} }, tabs: { view: 'room', hero: { mode: 'pass', enabled: false } }, banner: { kind: 'out' } } },
  { id: 'large-banner-out', text: 200, width: 320, height: 568, insets: { top: 20, bottom: 0 },
    pack: { bar: { kind: 'turn', who: seatOf(6), self: false, round: 3, seconds: 42, promises: { badge: 1 } }, tabs: { view: 'room', hero: 'pass-off' },
      banner: { icon: 'eliminated', title: 'You’re out', sub: 'You can watch. Your role stays private.' } },
    shell: { bar: { kind: 'turn', who: seatOf(6), self: false, round: 3, timer: { remainingMs: 42000 }, promises: { count: 1 }, menu: {} }, tabs: { view: 'room', hero: { mode: 'pass', enabled: false } }, banner: { kind: 'out' } } },
  // The phase bars (0.2.10): the pack's own input for each game step, and the bar phase-bars.mjs returns for it. The
  // Blackout's dark, compared since 0.1.0 with words of the shell's own, is now the pack's specimen, "Dark · positions
  // fixed" at 8 s. Those marked for the Largest text are compared again at 200 % on the small phone.
  ...PHASE_CASES.flatMap(c => {
    const one = { id: c.id, pack: { bar: c.pack, tabs: c.tabs?.pack ?? { view: 'room', hero: 'pass-off' } },
      shell: { bar: c.bar(), tabs: c.tabs?.shell ?? { view: 'room', hero: { mode: 'pass', enabled: false } } } };
    return c.text ? [one, { ...one, id: `large-${c.id}`, text: c.text, width: 320, height: 568, insets: { top: 20, bottom: 0 } }] : [one];
  }),
];

/** The parts compared, as [name, the pack's selector, the shell's selector]. */
const PARTS = [
  ['bar', '.tb', '.ms-ps-tb'], ['name', '.tb-name', '.ms-ps-name'], ['sub', '.tb-sub', '.ms-ps-sub'], ['glyph', '.tb-glyph', '.ms-ps-glyph'], ['glyph icon', '.tb-glyph > svg', '.ms-ps-glyph svg'],
  ['portrait', '.tb-who > .pt', '.ms-ps-who > .ms-ps-pt'], ['pair', '.pt-pair', '.ms-ps-pair'],
  ['promises', '.tb-promises', '.ms-ps-promises'], ['promises-badge', '.tb-promises .badge-dot', '.ms-ps-promises .ms-ps-badge'],
  ['round', '.tb-round', '.ms-ps-round'], ['timer', '.timer', '.ms-ps-timer'], ['menu', '.tb-menu', '.ms-ps-menu'],
  ['tabs', '.tabs', '.ms-ps-tabs'], ['tab-switch', '.tab[data-tab="switch"]', '.ms-ps-tab[data-value="switch"]'],
  ['tab-actions', '.tab[data-tab="actions"]', '.ms-ps-tab[data-value="actions"]'], ['hero', '.hero', '.ms-ps-hero'],
  // The fourth entry is the pack's part whose place the shell's takes (0.3.0): Card and Panels change places.
  ['tab-card', '.tab[data-tab="card"]', '.ms-ps-tab[data-value="card"]', '.tab[data-tab="panels"]'], ['tab-panels', '.tab[data-tab="panels"]', '.ms-ps-tab[data-value="panels"]', '.tab[data-tab="card"]'],
  // The badge keeps its place inside its tab: each is measured from its own tab (the fifth entry, the two tabs).
  ['panels-badge', '.tab[data-tab="panels"] .badge-dot', '.ms-ps-tab[data-value="panels"] .ms-ps-badge:not([hidden])', null, ['.tab[data-tab="panels"]', '.ms-ps-tab[data-value="panels"]']],
  // A docked sheet, where a case draws one (none elsewhere, in both).
  ['sheet', '.sheet', '.ms-ps-sheet'], ['sheet-head', '.sheet-head', '.ms-ps-sheet-head'],
  ['sheet-back', '.sheet-head > .icon-btn[aria-label="Back"]', '.ms-ps-sheet-head > [data-intent="sheet-back"]'],
  ['sheet-title', '.sheet-title h2', '.ms-ps-sheet-title h2'], ['sheet-sub', '.sheet-title p', '.ms-ps-sheet-title p'],
  ['sheet-close', '.sheet-head > .icon-btn[aria-label="Close"]', '.ms-ps-sheet-head > [data-intent="sheet-close"]'],
  ['sheet-foot', '.sheet-foot', '.ms-ps-sheet-foot'],
  ['foot-1', '.sheet-foot > .btn:nth-child(1)', '.ms-ps-sheet-foot > .ms-k-btn:nth-child(1)'],
  ['foot-2', '.sheet-foot > .btn:nth-child(2)', '.ms-ps-sheet-foot > .ms-k-btn:nth-child(2)'],
  // A banner, where a case draws one (0.2.8): its box, its icon, its two lines and Retry where it has one.
  ['banner', '.banner', '.ms-ps-banner'], ['banner-icon', '.banner > svg', '.ms-ps-banner-icon svg'],
  ['banner-title', '.banner-text b', '.ms-ps-banner .ms-ps-text b'], ['banner-sub', '.banner-text span', '.ms-ps-banner .ms-ps-text span'],
  ['banner-action', '.banner > .btn', '.ms-ps-banner > .ms-k-btn'],
];
/** The parts whose words are compared besides the bar's and the tabs'. */
const SHEET_WORDS = new Set(['sheet-title', 'sheet-sub', 'foot-1', 'foot-2', 'banner-title', 'banner-sub', 'banner-action']);
/** A button's kind, from the pack's .btn-<kind> or the kit's .ms-k-btn-<kind>. */
const KINDS = ['primary', 'secondary', 'warn', 'tinted', 'plain', 'outline'];
const kindOf = (node, prefix) => (node ? ([...node.classList].map(c => (c.startsWith(prefix) ? c.slice(prefix.length) : null)).find(k => KINDS.includes(k)) ?? null) : null);
/** Waits for a part's finite animations to end (a sheet slides in), so it is measured where it rests. */
const settle = async node => {
  if (!node) return;
  await Promise.all(node.getAnimations().filter(a => Number.isFinite(a.effect?.getComputedTiming?.().endTime)).map(a => a.finished.catch(() => null)));
};

/** A ring's share, rounded to a hundredth; null where the clock has no ring. */
const ringOf = node => (node ? Math.round(Number(node.style.getPropertyValue('--p')) * 100) / 100 : null);
/** A part's computed colour, or null when the part is missing. */
const paint = (node, property) => (node ? node.ownerDocument.defaultView.getComputedStyle(node)[property] : null);

const visible = node => !!node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
function box(frame, node) {
  if (!visible(node)) return null;
  const f = frame.getBoundingClientRect(), r = node.getBoundingClientRect();
  return { x: r.left - f.left, y: r.top - f.top, w: r.width, h: r.height };
}
// An icon's svg has no innerText; its words are its textContent (none).
const words = node => (visible(node) ? (node.innerText ?? node.textContent ?? '').replace(/\s+/g, ' ').trim() : null);
const near = (a, b) => (a === null || b === null ? a === b : ['x', 'y', 'w', 'h'].every(k => Math.abs(a[k] - b[k]) <= TOLERANCE));

export async function runPhoneShellAgreement({ size, versions }) {
  await loadKit();
  const checks = [];
  for (const c of CASES) {
    const width = c.width ?? size.width, height = c.height ?? size.height, insets = c.insets ?? size.insets;
    document.documentElement.style.fontSize = c.text ? `${c.text}%` : '';
    // The pack's phone (kit.css .ph, its safe areas as the review frames set them) and the shell's, side by side.
    const pack = document.createElement('div');
    pack.className = 'ph';
    Object.assign(pack.style, { position: 'absolute', left: '0', top: '0', width: `${width}px`, height: `${height}px` });
    pack.style.setProperty('--safe-t', `${insets.top}px`);
    pack.style.setProperty('--safe-b', `${insets.bottom}px`);
    // A sheet docks between the bars, as the pack's game screens dock it (screens.mjs game()), before the tabs.
    const sheetNodes = c.pack.sheet ? sheet({ ...c.pack.sheet, foot: c.pack.sheet.foot?.() ?? null }) : [];
    for (const node of sheetNodes) node.dataset.docked = '';
    // A banner lies over the stage under the bar, as the pack's game screens lay their overlays (screens.mjs game()).
    const bannerNode = c.pack.banner ? banner({ ...c.pack.banner, action: c.pack.banner.action?.() ?? null }) : null;
    pack.append(topBar(c.pack.bar), ...(bannerNode ? [bannerNode] : []), ...sheetNodes, tabs(c.pack.tabs));
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'absolute', left: `${width + 20}px`, top: '0', width: `${width}px`, height: `${height}px` });
    document.body.append(pack, host);
    const shell = mountPhoneShell(host, { versions, insets, bar: c.shell.bar, tabs: { variant: 'game', ...c.shell.tabs }, sheet: c.shell.sheet ?? null, banner: c.shell.banner ?? null });
    await document.fonts.ready;
    await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
    const root = shell.element;
    await settle(pack.querySelector('.sheet'));
    await settle(root.querySelector('.ms-ps-sheet'));
    const differences = [];
    const parts = {};
    for (const [name, packSel, shellSel, placeSel = null, within = null] of PARTS) {
      const a = pack.querySelector(packSel), b = root.querySelector(shellSel);
      const pa = box(within ? pack.querySelector(within[0]) : pack, placeSel ? pack.querySelector(placeSel) : a), pb = box(within ? root.querySelector(within[1]) : host, b);
      const wa = name.endsWith('badge') || ['name', 'sub', 'round', 'timer', 'hero'].includes(name) || name.startsWith('tab-') ? words(a) : null;
      const wb = wa !== null || words(b) !== null ? words(b) : null;
      parts[name] = { pack: pa, shell: pb, words: wa };
      if (!near(pa, pb)) differences.push({ part: name, what: 'box', pack: pa, shell: pb });
      if (wa !== wb && (name.endsWith('badge') || ['name', 'sub', 'round', 'timer'].includes(name) || name.startsWith('tab-'))) differences.push({ part: name, what: 'words', pack: wa, shell: wb });
      if (SHEET_WORDS.has(name) && words(a) !== words(b)) differences.push({ part: name, what: 'words', pack: words(a), shell: words(b) });
    }
    // The states: open tabs, the hero's mode and whether it can be pressed, and the accessible names the pack sets.
    const states = [
      ['hero mode', pack.querySelector('.hero')?.dataset.mode, root.querySelector('.ms-ps-hero')?.dataset.mode],
      ['hero unavailable', pack.querySelector('.hero')?.getAttribute('aria-disabled') === 'true', root.querySelector('.ms-ps-hero')?.getAttribute('aria-disabled') === 'true'],
      ['hero name', pack.querySelector('.hero')?.getAttribute('aria-label'), root.querySelector('.ms-ps-hero')?.getAttribute('aria-label')],
      ['hero word', words(pack.querySelector('.hero b')), words(root.querySelector('.ms-ps-hero-label'))],
      // The round button's fill and ink (0.2.10): an unavailable Vote is paper with dimmed words, as the pack's cascade draws it.
      ['hero fill', paint(pack.querySelector('.hero'), 'backgroundColor'), paint(root.querySelector('.ms-ps-hero'), 'backgroundColor')],
      ['hero ink', paint(pack.querySelector('.hero'), 'color'), paint(root.querySelector('.ms-ps-hero'), 'color')],
      ['switch name', pack.querySelector('.tab[data-tab="switch"]')?.getAttribute('aria-label'), root.querySelector('.ms-ps-tab[data-value="switch"]')?.getAttribute('aria-label')],
      ['promises name', pack.querySelector('.tb-promises')?.getAttribute('aria-label') ?? null, root.querySelector('.ms-ps-promises')?.getAttribute('aria-label') ?? null],
      ['menu name', pack.querySelector('.tb-menu')?.getAttribute('aria-label') ?? null, root.querySelector('.ms-ps-menu')?.getAttribute('aria-label') ?? null],
      ['bar kind', pack.querySelector('.tb')?.dataset.kind, root.querySelector('.ms-ps-tb')?.dataset.kind],
      // The clock (0.2.10): amber or not, a ring or the clock's icon, and how full the ring is, to a hundredth (sheet
      // 07 writes the ring of 5 s left of 6 as 0.17).
      ['clock amber', pack.querySelector('.timer')?.hasAttribute('data-urgent') ?? null, root.querySelector('.ms-ps-timer')?.hasAttribute('data-urgent') ?? null],
      ['clock ring', ringOf(pack.querySelector('.timer-ring')), ringOf(root.querySelector('.ms-ps-ring'))],
      ['bar tone', pack.querySelector('.tb')?.dataset.tone ?? null, root.querySelector('.ms-ps-tb')?.dataset.tone ?? null],
      ['back name', pack.querySelector('.sheet-head > .icon-btn[aria-label="Back"]')?.getAttribute('aria-label') ?? null, root.querySelector('.ms-ps-sheet-head > [data-intent="sheet-back"]')?.getAttribute('aria-label') ?? null],
      ['foot-1 kind', kindOf(pack.querySelector('.sheet-foot > .btn:nth-child(1)'), 'btn-'), kindOf(root.querySelector('.ms-ps-sheet-foot > .ms-k-btn:nth-child(1)'), 'ms-k-btn-')],
      ['foot-2 kind', kindOf(pack.querySelector('.sheet-foot > .btn:nth-child(2)'), 'btn-'), kindOf(root.querySelector('.ms-ps-sheet-foot > .ms-k-btn:nth-child(2)'), 'ms-k-btn-')],
      // The banner's icon as drawn (the same icon, filled, from the pack's icons and the component's copy of them), and Retry's kind.
      ['banner icon', pack.querySelector('.banner > svg')?.innerHTML ?? null, root.querySelector('.ms-ps-banner-icon svg')?.innerHTML ?? null],
      ['banner action kind', kindOf(pack.querySelector('.banner > .btn'), 'btn-'), kindOf(root.querySelector('.ms-ps-banner > .ms-k-btn'), 'ms-k-btn-')],
      ['banner role', pack.querySelector('.banner')?.getAttribute('role') ?? null, root.querySelector('.ms-ps-banner')?.getAttribute('role') ?? null],
      ...['actions', 'card', 'panels'].map(k => [`${k} open`, pack.querySelector(`.tab[data-tab="${k}"]`)?.getAttribute('aria-expanded'), root.querySelector(`.ms-ps-tab[data-value="${k}"]`)?.getAttribute('aria-expanded')]),
    ];
    for (const [what, a, b] of states) if (a !== b) differences.push({ part: 'state', what, pack: a ?? null, shell: b ?? null });
    checks.push({ id: `agree: ${c.id}${c.text ? ` at ${c.text}% text, ${width} × ${height}` : ''}`, ok: differences.length === 0, detail: { differences, parts } });
    shell.dispose();
    pack.remove();
    host.remove();
  }
  document.documentElement.style.fontSize = '';
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}
