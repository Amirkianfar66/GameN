// mothership:dev-only
//
// The shell beside the pack: the pinned prototype's topBar() and tabs() (design/phone-ui/prototype/ui.mjs
// with kit.css, which the frozen Food release pins, so they stay as they are) and the runtime shell
// (../phone-shell.mjs), drawn in the same page from the same inputs, compared case by case: the words,
// the states (open, unavailable, the hero's mode) and where each part sits, to within half a pixel. It
// is how the shell shows it draws the pack's bars and not a second design of them.

import { topBar, tabs } from '../../../prototype/ui.mjs';
import { mountPhoneShell } from '../phone-shell.mjs';
import { seatOf } from '../../../prototype/fixtures.mjs';

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
  { id: 'dark', pack: { bar: { kind: 'phase', icon: 'dark', tone: 'dark', title: 'Blackout', sub: 'Lights out', round: 3, seconds: 18 }, tabs: { view: 'room', open: 'panels', hero: 'voted' } },
    shell: { bar: { kind: 'phase', icon: 'dark', tone: 'dark', title: 'Blackout', sub: 'Lights out', round: 3, timer: { remainingMs: 18000 }, promises: { count: 0 }, menu: {} }, tabs: { view: 'room', open: 'panels', hero: { mode: 'voted' } } } },
  { id: 'large-own', text: 200, width: 320, height: 568, insets: { top: 20, bottom: 0 },
    pack: { bar: { kind: 'turn', who: seatOf(4), self: true, round: 3, seconds: 42, promises: { badge: 1 } }, tabs: { view: 'room', hero: 'pass' } },
    shell: { bar: { kind: 'turn', who: seatOf(4), self: true, round: 3, timer: { remainingMs: 42000 }, promises: { count: 1 }, menu: {} }, tabs: { view: 'room', hero: { mode: 'pass' } } } },
  { id: 'large-phase', text: 200, width: 320, height: 568, insets: { top: 20, bottom: 0 },
    pack: { bar: { kind: 'phase', icon: 'jail', title: 'Jail vote · result', short: 'Vote result', round: 3, seconds: 3, ring: 0.6 }, tabs: { view: 'room', hero: 'vote-off' } },
    shell: { bar: { kind: 'phase', icon: 'jail', title: 'Jail vote · result', short: 'Vote result', round: 3, timer: { remainingMs: 3000, ring: 0.6 }, menu: {} }, tabs: { view: 'room', hero: { mode: 'vote', enabled: false } } } },
];

/** The parts compared, as [name, the pack's selector, the shell's selector]. */
const PARTS = [
  ['bar', '.tb', '.ms-ps-tb'], ['name', '.tb-name', '.ms-ps-name'], ['sub', '.tb-sub', '.ms-ps-sub'], ['glyph', '.tb-glyph', '.ms-ps-glyph'], ['glyph icon', '.tb-glyph > svg', '.ms-ps-glyph svg'],
  ['portrait', '.tb-who > .pt', '.ms-ps-who > .ms-ps-pt'], ['pair', '.pt-pair', '.ms-ps-pair'],
  ['promises', '.tb-promises', '.ms-ps-promises'], ['promises-badge', '.tb-promises .badge-dot', '.ms-ps-promises .ms-ps-badge'],
  ['round', '.tb-round', '.ms-ps-round'], ['timer', '.timer', '.ms-ps-timer'], ['menu', '.tb-menu', '.ms-ps-menu'],
  ['tabs', '.tabs', '.ms-ps-tabs'], ['tab-switch', '.tab[data-tab="switch"]', '.ms-ps-tab[data-value="switch"]'],
  ['tab-actions', '.tab[data-tab="actions"]', '.ms-ps-tab[data-value="actions"]'], ['hero', '.hero', '.ms-ps-hero'],
  ['tab-card', '.tab[data-tab="card"]', '.ms-ps-tab[data-value="card"]'], ['tab-panels', '.tab[data-tab="panels"]', '.ms-ps-tab[data-value="panels"]'],
  ['panels-badge', '.tab[data-tab="panels"] .badge-dot', '.ms-ps-tab[data-value="panels"] .ms-ps-badge:not([hidden])'],
];

const visible = node => !!node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
function box(frame, node) {
  if (!visible(node)) return null;
  const f = frame.getBoundingClientRect(), r = node.getBoundingClientRect();
  return { x: r.left - f.left, y: r.top - f.top, w: r.width, h: r.height };
}
const words = node => (visible(node) ? node.innerText.replace(/\s+/g, ' ').trim() : null);
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
    pack.append(topBar(c.pack.bar), tabs(c.pack.tabs));
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'absolute', left: `${width + 20}px`, top: '0', width: `${width}px`, height: `${height}px` });
    document.body.append(pack, host);
    const shell = mountPhoneShell(host, { versions, insets, bar: c.shell.bar, tabs: { variant: 'game', ...c.shell.tabs } });
    await document.fonts.ready;
    await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
    const root = shell.element;
    const differences = [];
    const parts = {};
    for (const [name, packSel, shellSel] of PARTS) {
      const a = pack.querySelector(packSel), b = root.querySelector(shellSel);
      const pa = box(pack, a), pb = box(host, b);
      const wa = name.endsWith('badge') || ['name', 'sub', 'round', 'timer', 'hero'].includes(name) || name.startsWith('tab-') ? words(a) : null;
      const wb = wa !== null || words(b) !== null ? words(b) : null;
      parts[name] = { pack: pa, shell: pb, words: wa };
      if (!near(pa, pb)) differences.push({ part: name, what: 'box', pack: pa, shell: pb });
      if (wa !== wb && (name.endsWith('badge') || ['name', 'sub', 'round', 'timer'].includes(name) || name.startsWith('tab-'))) differences.push({ part: name, what: 'words', pack: wa, shell: wb });
    }
    // The states: open tabs, the hero's mode and whether it can be pressed, and the accessible names the pack sets.
    const states = [
      ['hero mode', pack.querySelector('.hero')?.dataset.mode, root.querySelector('.ms-ps-hero')?.dataset.mode],
      ['hero unavailable', pack.querySelector('.hero')?.getAttribute('aria-disabled') === 'true', root.querySelector('.ms-ps-hero')?.getAttribute('aria-disabled') === 'true'],
      ['hero name', pack.querySelector('.hero')?.getAttribute('aria-label'), root.querySelector('.ms-ps-hero')?.getAttribute('aria-label')],
      ['hero word', words(pack.querySelector('.hero b')), words(root.querySelector('.ms-ps-hero-label'))],
      ['switch name', pack.querySelector('.tab[data-tab="switch"]')?.getAttribute('aria-label'), root.querySelector('.ms-ps-tab[data-value="switch"]')?.getAttribute('aria-label')],
      ['promises name', pack.querySelector('.tb-promises')?.getAttribute('aria-label') ?? null, root.querySelector('.ms-ps-promises')?.getAttribute('aria-label') ?? null],
      ['menu name', pack.querySelector('.tb-menu')?.getAttribute('aria-label') ?? null, root.querySelector('.ms-ps-menu')?.getAttribute('aria-label') ?? null],
      ['bar kind', pack.querySelector('.tb')?.dataset.kind, root.querySelector('.ms-ps-tb')?.dataset.kind],
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
