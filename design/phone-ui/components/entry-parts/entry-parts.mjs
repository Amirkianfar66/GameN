// The entry choice: the phone pack's two-line choice with its icon tile and chevron (screens.css .entry),
// which only the entry screens draw (sheet 10's Join and Host, sheet 12's choices). Runtime source,
// Designer's (Pre-game & Global UI; the owner, 14 and 15 November 2026: Designer builds each visual
// component once, in design/; the game and the preview use it as it is). It is not the shared kit's: the
// kit holds what both screen builders draw, and this only the entry screens (the Lead's review of #278,
// decision 1). If another builder needs it, the Lead moves it into the kit.
//
// A component that draws entry choices adds `ms-entry-parts` to its root (beside `ms-kit`), imports
// entry-parts.css, and gives each choice to its control policy: a refused choice keeps its look, as sheet 10
// draws Join and Host offline, and its focus (aria-disabled, never the disabled attribute).

import { iconSvg } from '../icons.mjs';

export const ENTRY_PARTS_VERSION = 'entry-parts-0.1.0';
/** The pack's two tones: the primary (amber) choice, and the plain one. */
export const ENTRY_TONES = Object.freeze([null, 'primary']);
const isText = value => typeof value === 'string' && value.length > 0;

/** The builders for one document: { entry, setEntry }. */
export function createEntryParts(doc) {
  if (!doc?.createElement) throw new TypeError('The entry parts need a document');
  const h = (tag, className) => { const node = doc.createElement(tag); if (className) node.className = className; return node; };
  const svg = (name, filled) => {
    const t = doc.createElement('template');
    t.innerHTML = iconSvg(name, { filled, className: 'ms-ep-ic' }).trim();
    return t.content.firstChild;
  };
  const text = (node, value) => { if (node.textContent !== value) node.textContent = value; };

  /**
   * { title, sub, icon, tone: null | 'primary', intent, value }: the pack's .entry, a button with the 48 px icon
   * tile (the icon filled), the title over the line, and the chevron. Changed in place: the button, and its
   * focus, stay.
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
  const entry = props => {
    const node = h('button');
    node.type = 'button';
    return setEntry(node, props);
  };
  return Object.freeze({ entry, setEntry });
}
