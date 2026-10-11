// mothership:dev-only
//
// Lifting markup out of an approved editable source unchanged: a group's inner markup, and
// its top-level elements. Used to build the board-motion layers and scenes from the approved
// rooms without redrawing anything they draw.

/** The top-level elements of a group, as [start, end) offsets into its inner markup. */
export function topLevel(inner) {
  const items = [];
  const tag = /<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>/g;
  let depth = 0, start = null, match;
  while ((match = tag.exec(inner)) !== null) {
    const text = match[0];
    if (text.startsWith('<!--')) continue;
    const closing = text.startsWith('</');
    const selfClosing = text.endsWith('/>');
    if (depth === 0 && !closing) start = match.index;
    if (closing) depth -= 1; else if (!selfClosing) depth += 1;
    if (depth === 0 && start !== null) { items.push([start, match.index + text.length]); start = null; }
    if (depth < 0) throw new Error('Unbalanced group markup');
  }
  return items;
}

/** The inner markup of the group with this id. */
export function groupInner(source, id) {
  const open = source.indexOf(`<g id="${id}"`);
  if (open < 0) throw new Error(`No group ${id}`);
  const startInner = source.indexOf('>', open) + 1;
  const tag = /<\/?g\b[^>]*>/g;
  tag.lastIndex = open;
  let depth = 0, match;
  while ((match = tag.exec(source)) !== null) {
    if (match[0].startsWith('</')) depth -= 1; else if (!match[0].endsWith('/>')) depth += 1;
    if (depth === 0) return source.slice(startInner, match.index);
  }
  throw new Error(`Group ${id} is not closed`);
}

/** The whole group with this id, its opening tag and attributes included. */
export function groupOuter(source, id) {
  const open = source.indexOf(`<g id="${id}"`);
  const inner = groupInner(source, id);
  const startInner = source.indexOf('>', open) + 1;
  return `${source.slice(open, startInner)}${inner}</g>`;
}

/** Swaps colors by a recolor map (an export recipe's), case-insensitively. */
export const recolor = (markup, map) => Object.entries(map).reduce((text, [from, to]) => text.replace(new RegExp(from, 'gi'), to), markup);
