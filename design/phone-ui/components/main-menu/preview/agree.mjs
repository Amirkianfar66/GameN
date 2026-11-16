// mothership:dev-only
//
// The menu beside the pack: the frozen prototype's main menu (design/phone-ui/prototype/screens-entry.mjs
// ENTRY_SCREENS.menu, with kit.css and screens.css) and the runtime menu (../main-menu.mjs), drawn in the
// same page at the same size, compared case by case: the words, the states, the look of each choice and
// where each part sits, to within half a pixel. It is how the menu shows it draws sheet 10 and not a second
// design of it.
//
// Not compared: the hero's picture (the approved brand film, drawn by the game's player; the pack draws it
// with the films' review stage in an iframe, which the production policy refuses, so the agreement leaves it
// out). The hero's place and the fade over it are compared.

import { ENTRY_SCREENS } from '../../../prototype/screens-entry.mjs';
import { mountMainMenu } from '../main-menu.mjs';

const TOLERANCE = 0.5;

/** Loads the pack's own stylesheets into this page, for the pack's half of the comparison. */
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

/** The parts compared, as [name, the pack's selector, the menu's selector, compare words]. */
const J = '[data-tone="primary"]', H = ':not([data-tone])';
const PARTS = [
  ['hero', '.menu-hero', '.ms-mm-heroframe', false],
  ['settings', '.menu-settings .icon-btn', '.ms-mm-settings .ms-k-icon-btn', false],
  ['settings icon', '.menu-settings .icon-btn svg', '.ms-mm-settings .ms-k-icon-btn svg', false],
  ['choices', '.menu-actions', '.ms-mm-actions', false],
  ['offline note', '.menu-actions .error', '.ms-mm-actions .ms-k-error', true],
  ['offline icon', '.menu-actions .error svg', '.ms-mm-actions .ms-k-error svg', false],
  ['Join', `.entry${J}`, `.ms-ep-entry${J}`, true],
  ['Join tile', `.entry${J} .entry-icon`, `.ms-ep-entry${J} .ms-ep-icon`, false],
  ['Join icon', `.entry${J} .entry-icon svg`, `.ms-ep-entry${J} .ms-ep-icon svg`, false],
  ['Join title', `.entry${J} b`, `.ms-ep-entry${J} .ms-ep-title`, true],
  ['Join line', `.entry${J} small`, `.ms-ep-entry${J} .ms-ep-sub`, true],
  ['Join chevron', `.entry${J} .row-chev svg`, `.ms-ep-entry${J} .ms-ep-chev svg`, false],
  ['Host', `.entry${H}`, `.ms-ep-entry${H}`, true],
  ['Host tile', `.entry${H} .entry-icon`, `.ms-ep-entry${H} .ms-ep-icon`, false],
  ['Host icon', `.entry${H} .entry-icon svg`, `.ms-ep-entry${H} .ms-ep-icon svg`, false],
  ['Host title', `.entry${H} b`, `.ms-ep-entry${H} .ms-ep-title`, true],
  ['Host line', `.entry${H} small`, `.ms-ep-entry${H} .ms-ep-sub`, true],
  ['Host chevron', `.entry${H} .row-chev svg`, `.ms-ep-entry${H} .ms-ep-chev svg`, false],
  ['Recover', '.entry-plain', '.ms-mm-recover', true],
  ['Recover icon', '.entry-plain svg', '.ms-mm-recover svg', false],
];
/** The look compared, as [name, the pack's selector, the menu's selector, properties]. */
const LOOKS = [
  ['Join', `.entry${J}`, `.ms-ep-entry${J}`, ['backgroundColor', 'color', 'opacity', 'borderRadius', 'boxShadow', 'cursor']],
  ['Join tile', `.entry${J} .entry-icon`, `.ms-ep-entry${J} .ms-ep-icon`, ['backgroundColor', 'color', 'borderRadius']],
  ['Join title', `.entry${J} b`, `.ms-ep-entry${J} .ms-ep-title`, ['fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'color']],
  ['Join line', `.entry${J} small`, `.ms-ep-entry${J} .ms-ep-sub`, ['fontSize', 'fontWeight', 'lineHeight', 'color']],
  ['Join chevron', `.entry${J} .row-chev`, `.ms-ep-entry${J} .ms-ep-chev`, ['color']],
  ['Host', `.entry${H}`, `.ms-ep-entry${H}`, ['backgroundColor', 'color', 'opacity', 'borderRadius', 'boxShadow', 'cursor']],
  ['Host tile', `.entry${H} .entry-icon`, `.ms-ep-entry${H} .ms-ep-icon`, ['backgroundColor', 'color', 'borderRadius']],
  ['Host title', `.entry${H} b`, `.ms-ep-entry${H} .ms-ep-title`, ['fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'color']],
  ['Host line', `.entry${H} small`, `.ms-ep-entry${H} .ms-ep-sub`, ['fontSize', 'fontWeight', 'lineHeight', 'color']],
  ['Host chevron', `.entry${H} .row-chev`, `.ms-ep-entry${H} .ms-ep-chev`, ['color']],
  ['Recover', '.entry-plain', '.ms-mm-recover', ['backgroundColor', 'color', 'opacity', 'fontSize', 'fontWeight']],
  ['settings', '.menu-settings .icon-btn', '.ms-mm-settings .ms-k-icon-btn', ['color', 'opacity']],
  ['offline note', '.menu-actions .error', '.ms-mm-actions .ms-k-error', ['backgroundColor', 'color', 'borderRadius', 'fontSize', 'fontWeight', 'lineHeight']],
  ['offline icon', '.menu-actions .error svg', '.ms-mm-actions .ms-k-error svg', ['color']],
];

/** Each case: a size, the pack's state, the root text size and the menu's input. */
const CASES = offline => [
  { id: 'the menu at 390 × 844', size: '390x844', pack: {}, menu: {} },
  { id: 'offline at 390 × 844', size: '390x844', pack: { state: 'offline' }, menu: offline },
  { id: 'the menu at 430 × 932', size: '430x932', pack: {}, menu: {} },
  { id: 'offline at 430 × 932', size: '430x932', pack: { state: 'offline' }, menu: offline },
  { id: 'the menu with the Largest text (200 %) at 390 × 844', size: '390x844', text: 200, pack: {}, menu: {} },
  { id: 'offline with the Largest text (200 %) at 430 × 932', size: '430x932', text: 200, pack: { state: 'offline' }, menu: offline },
];

const visible = node => !!node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
function box(frame, node) {
  if (!visible(node)) return null;
  const f = frame.getBoundingClientRect(), r = node.getBoundingClientRect();
  return { x: r.left - f.left, y: r.top - f.top, w: r.width, h: r.height };
}
const words = node => (visible(node) ? node.innerText.replace(/\s+/g, ' ').trim() : null);
const near = (a, b) => (a === null || b === null ? a === b : ['x', 'y', 'w', 'h'].every(k => Math.abs(a[k] - b[k]) <= TOLERANCE));
const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
const looks = (node, props) => (node ? Object.fromEntries(props.map(p => [p, getComputedStyle(node)[p]])) : null);

export async function runMainMenuAgreement({ sizes, offline }) {
  await loadPack();
  const checks = [];
  for (const c of CASES(offline)) {
    const size = sizes[c.size];
    document.documentElement.style.fontSize = c.text ? `${c.text}%` : '';
    // The pack's phone (kit.css .ph, its safe areas as the review frames set them) and the menu's, side by side.
    const pack = document.createElement('div');
    pack.className = 'ph';
    Object.assign(pack.style, { position: 'absolute', left: '0', top: '0', width: `${size.width}px`, height: `${size.height}px` });
    pack.style.setProperty('--safe-t', `${size.insets.top}px`);
    pack.style.setProperty('--safe-b', `${size.insets.bottom}px`);
    ENTRY_SCREENS.menu(pack, c.pack);
    // The pack draws its hero through the films' review stage in an iframe, which the production policy refuses
    // (frame-src) and which is not compared: it leaves before the pack's phone enters the page. Its place stays.
    for (const frame of pack.querySelectorAll('iframe')) frame.remove();
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'absolute', left: `${size.width + 20}px`, top: '0', width: `${size.width}px`, height: `${size.height}px` });
    document.body.append(pack, host);
    const menu = mountMainMenu(host, { ...c.menu, insets: size.insets });
    await document.fonts.ready;
    await frames();
    const root = menu.element;
    const differences = [];
    const parts = {};
    for (const [name, packSel, menuSel, compareWords] of PARTS) {
      const a = pack.querySelector(packSel), b = root.querySelector(menuSel);
      const pa = box(pack, a), pb = box(host, b);
      const wa = compareWords ? words(a) : null, wb = compareWords ? words(b) : null;
      parts[name] = { pack: pa, menu: pb, words: wa };
      if (!near(pa, pb)) differences.push({ part: name, what: 'box', pack: pa, menu: pb });
      if (wa !== wb) differences.push({ part: name, what: 'words', pack: wa, menu: wb });
    }
    for (const [name, packSel, menuSel, props] of LOOKS) {
      const a = looks(pack.querySelector(packSel), props), b = looks(root.querySelector(menuSel), props);
      if (JSON.stringify(a) !== JSON.stringify(b)) differences.push({ part: name, what: 'look', pack: a, menu: b });
    }
    // The fade over the hero: the pack's ::after, the menu's own layer.
    const fadeA = getComputedStyle(pack.querySelector('.menu-hero'), '::after'), fadeB = getComputedStyle(root.querySelector('.ms-mm-fade'));
    const fade = [['height', fadeA.height, fadeB.height], ['backgroundImage', fadeA.backgroundImage, fadeB.backgroundImage]];
    for (const [what, a, b] of fade) if (a !== b) differences.push({ part: 'fade', what, pack: a, menu: b });
    // The states: each choice refused offline (aria-disabled), the note an alert, the hero hidden from screen readers.
    const refused = (scope, sel) => scope.querySelector(sel)?.getAttribute('aria-disabled') === 'true';
    const states = [
      ['Join refused', refused(pack, `.entry${J}`), refused(root, `.ms-ep-entry${J}`)],
      ['Host refused', refused(pack, `.entry${H}`), refused(root, `.ms-ep-entry${H}`)],
      ['Recover refused', refused(pack, '.entry-plain'), refused(root, '.ms-mm-recover')],
      ['note is an alert', pack.querySelector('.error')?.getAttribute('role') ?? null, root.querySelector('.ms-k-error')?.getAttribute('role') ?? null],
      ['hero hidden from screen readers', pack.querySelector('.menu-hero')?.getAttribute('aria-hidden'), root.querySelector('.ms-mm-heroframe')?.getAttribute('aria-hidden')],
    ];
    // The one difference from the pack, at larger text only: the menu's cover over the hero (the Lead's review of
    // #278, 16 November). At the Standard text there is none, as in the pack; with larger text it is recorded.
    const cover = root.querySelector('.ms-mm-cover');
    const improvement = cover.hidden ? null : { what: 'the canvas covers the hero from 24 px above the choices', coverTop: box(host, cover).y, stackTop: box(host, root.querySelector('.ms-mm-actions').firstElementChild).y };
    if (!c.text && improvement) differences.push({ part: 'cover', what: 'drawn at the Standard text', pack: null, menu: improvement });
    for (const [what, a, b] of states) if (a !== b) differences.push({ part: 'state', what, pack: a, menu: b });
    checks.push({ id: `agree: ${c.id}`, ok: differences.length === 0, detail: { differences, parts, improvement } });
    menu.dispose();
    pack.remove();
    host.remove();
  }
  document.documentElement.style.fontSize = '';
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}
