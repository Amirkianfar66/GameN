// The entry screens' own parts: what only the phone pack's entry screens draw (sheets 10–16: the menu, Host,
// Join, Recover and the character grid), in screens-entry.mjs, kit.css and screens.css. Runtime source,
// Designer's (Pre-game & Global UI; the owner, 14 and 15 November 2026: Designer builds each visual
// component once, in design/; the game and the preview use it as it is). They are not the shared kit's:
// the kit holds what both screen builders draw, and these only the entry screens (the Lead's reviews of
// #278, decision 1, and of #287, question 1). If another builder needs one, the Lead moves it into the kit.
//
//   entry, setEntry          the two-line entry choice with its icon tile and chevron (.entry; sheets 10, 12)
//   navBar, setNavBar        the back link and the centred title (.nav-bar)
//   screen, foot             the scrolling screen inside the safe areas, and its foot (.screen, .screen-foot)
//   largeTitle               the large title (.large-title)
//   codeCard, setCodeCard    the room code card: the code, Copy, the seats and their bar (.code-card)
//   createToast              the entry screens' toast with the shell's timing: TOAST_MS, shown once per id. It is
//                            drawn by the kit's toast (kit.toast, kit 0.8.0; the shell draws its own with it too),
//                            so it looks, moves and takes no tap as the shell's does (0.3.0).
//
// A component that draws them adds `ms-entry-parts` to its root (beside `ms-kit`), imports entry-parts.css,
// and gives each control to its control policy: a refused choice keeps its look, as sheet 10 draws Join and
// Host offline, and its focus (aria-disabled, never the disabled attribute).

import { iconSvg } from '../icons.mjs';
import { createKit } from '../kit/kit.mjs';

export const ENTRY_PARTS_VERSION = 'entry-parts-0.3.0';
/** The pack's two tones of an entry choice: the primary (amber) choice, and the plain one. */
export const ENTRY_TONES = Object.freeze([null, 'primary']);
/** How long a toast shows before it fades, in milliseconds: the shell's TOAST_MS, a local confirmation. */
export const ENTRY_TOAST_MS = 2400;
/** The room code card's words (screens-entry.mjs, the lobby). */
export const CODE_WORDS = Object.freeze({
  label: 'Room code', copy: 'Copy', copied: 'Copied', copyAria: 'Copy room code',
  seats: (filled, total) => `${filled} of ${total} seats`,
  code: code => `Room code ${[...code].join(' ')}`,
});
const isText = value => typeof value === 'string' && value.length > 0;

/** The builders for one document. */
export function createEntryParts(doc) {
  if (!doc?.createElement) throw new TypeError('The entry parts need a document');
  const kit = createKit(doc);
  const h = (tag, className, attrs = {}) => kit.h(tag, className, attrs);
  const svg = (name, filled) => {
    const t = doc.createElement('template');
    t.innerHTML = iconSvg(name, { filled, className: 'ms-ep-ic' }).trim();
    return t.content.firstChild;
  };
  const text = (node, value) => { if (node.textContent !== value) node.textContent = value; return node; };

  // ── The entry choice (.entry) ─────────────────────────────────────────
  /**
   * { title, sub, icon, tone: null | 'primary', intent, value }: a button with the 48 px icon tile (the icon
   * filled), the title over the line, and the chevron. Changed in place: the button, and its focus, stay.
   */
  function setEntry(node, props) {
    if (!isText(props.title) || !isText(props.sub)) throw new TypeError('An entry choice has a title and a line');
    if (!isText(props.icon)) throw new TypeError('An entry choice has an icon');
    const tone = props.tone ?? null;
    if (!ENTRY_TONES.includes(tone)) throw new TypeError('An entry choice\'s tone is null or "primary"');
    if (node.className !== 'ms-ep-entry') node.className = 'ms-ep-entry';
    if (!node.firstChild) {
      const words = h('span', 'ms-ep-text');
      words.append(h('b', 'ms-ep-title'), h('small', 'ms-ep-sub'));
      const chev = h('span', 'ms-ep-chev');
      chev.append(svg('chevronRight', false));
      node.append(h('span', 'ms-ep-icon'), words, chev);
    }
    const [tile, words] = node.children;
    if (tile.dataset.icon !== props.icon) { tile.replaceChildren(svg(props.icon, true)); tile.dataset.icon = props.icon; }
    text(words.firstChild, props.title);
    text(words.lastChild, props.sub);
    if (tone) node.dataset.tone = tone; else delete node.dataset.tone;
    if (props.intent) node.dataset.intent = props.intent;
    if (props.value !== undefined && props.value !== null) node.dataset.value = String(props.value);
    return node;
  }
  const entry = props => setEntry(h('button', null, { type: 'button' }), props);

  // ── The nav bar (.nav-bar) ───────────────────────────────────────────
  /** { title, back: { label, intent } }: the kit's plain button with the chevron, the centred title, the spacer. */
  function setNavBar(node, { title, back }) {
    if (!isText(title) || !isText(back?.label)) throw new TypeError('A nav bar has a title and a back label');
    if (node.className !== 'ms-ep-nav') node.className = 'ms-ep-nav';
    if (!node.firstChild) node.append(kit.button({ label: back.label, kind: 'plain', icon: 'chevronLeft', filled: false, intent: back.intent ?? 'back', extra: ['ms-ep-back'] }), h('h1', 'ms-ep-nav-title'), h('span', 'ms-ep-nav-spacer'));
    const [button, heading] = node.children;
    kit.setButton(button, { label: back.label, kind: 'plain', icon: 'chevronLeft', filled: false, intent: back.intent ?? 'back', extra: ['ms-ep-back'] });
    text(heading, title);
    return node;
  }
  const navBar = props => setNavBar(h('div'), props);

  // ── The screen, its foot, the large title (.screen, .screen-foot, .large-title) ──
  const screen = () => h('div', 'ms-ep-screen');
  const foot = () => h('div', 'ms-ep-foot');
  const largeTitle = words => text(h('h2', 'ms-ep-large-title'), words);

  // ── The room code card (.code-card) ──────────────────────────────────
  /**
   * { code, copied, seats: { filled, total } }: "Room code", the code (selectable, named a character at a time),
   * Copy (the kit's small tinted button; "Copied" with the check after a copy), and "n of N seats" with the bar.
   * Copy is node.querySelector('.ms-ep-copy'), for the component's policy.
   */
  function setCodeCard(node, { code, copied = false, seats = null }) {
    if (!isText(code)) throw new TypeError('A code card has its code');
    if (node.className !== 'ms-ep-code-card') node.className = 'ms-ep-code-card';
    if (!node.firstChild) {
      const row = h('div', 'ms-ep-code-row');
      row.append(h('span', 'ms-ep-code'), kit.button({ label: CODE_WORDS.copy, kind: 'tinted', small: true, icon: 'copy', aria: CODE_WORDS.copyAria, intent: 'copy', extra: ['ms-ep-copy'] }));
      const meta = h('div', 'ms-ep-code-meta');
      const bar = h('span', 'ms-ep-progress');
      bar.append(h('i'));
      meta.append(h('span', 'ms-ep-code-seats'), bar);
      node.append(text(h('div', 'ms-ep-code-label'), CODE_WORDS.label), row, meta);
    }
    const [, row, meta] = node.children;
    const [codeNode, copy] = row.children;
    text(codeNode, code);
    kit.attr(codeNode, 'aria-label', CODE_WORDS.code(code));
    kit.setButton(copy, { label: copied ? CODE_WORDS.copied : CODE_WORDS.copy, kind: 'tinted', small: true, icon: copied ? 'check' : 'copy', aria: CODE_WORDS.copyAria, intent: 'copy', extra: ['ms-ep-copy'] });
    meta.hidden = !seats;
    if (seats) {
      text(meta.firstChild, CODE_WORDS.seats(seats.filled, seats.total));
      const width = `${seats.total > 0 ? Math.max(0, Math.min(1, seats.filled / seats.total)) * 100 : 0}%`;
      if (meta.lastChild.firstChild.style.width !== width) meta.lastChild.firstChild.style.width = width;
    }
    return node;
  }
  const codeCard = props => setCodeCard(h('div'), props);

  // ── The toast (the kit's, 0.3.0) ─────────────────────────────────────
  /**
   * The entry screens' toast in `host` (the component's root): update({ id, text, icon } | null). Each id shows
   * once, for ENTRY_TOAST_MS, then fades; a new id replaces it. The kit's toast draws it (kit 0.8.0): the pack's
   * look, the drop, and an 80 ms fade with Reduce motion (the component's data-motion or the device's), and it
   * takes no tap. It sits 10 px under the component's --ms-k-toast-top: set it to where the nav bar ends.
   */
  function createToast(host) {
    const win = doc.defaultView;
    let node = null, shown = null, timer = null, leaveTimer = null;
    const clear = () => { if (timer) win.clearTimeout(timer); if (leaveTimer) win.clearTimeout(leaveTimer); timer = leaveTimer = null; node?.remove(); node = null; };
    function update(toast) {
      if (!toast) { clear(); shown = null; return; }
      if (!isText(toast.id) || !isText(toast.text)) throw new TypeError('A toast is { id, text, icon }');
      if (shown === toast.id) return;
      shown = toast.id;
      clear();
      const props = { text: toast.text, icon: toast.icon ?? 'check' };
      node = kit.toast(props);
      host.append(node);
      const mine = node;
      timer = win.setTimeout(() => {
        timer = null;
        if (node !== mine) return;
        kit.setToast(mine, { ...props, leaving: true });
        leaveTimer = win.setTimeout(() => { leaveTimer = null; if (node === mine) { mine.remove(); node = null; } }, 200);
      }, ENTRY_TOAST_MS);
    }
    return Object.freeze({ update, dispose: () => { clear(); shown = null; }, get element() { return node; } });
  }

  return Object.freeze({ entry, setEntry, navBar, setNavBar, screen, foot, largeTitle, codeCard, setCodeCard, createToast });
}
