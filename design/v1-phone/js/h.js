// mothership:dev-only
//
// The prototype's DOM helper. Text is always set as text, never as markup: a player's name
// is untrusted input in the real game, and the prototype keeps the same habit.

export function h(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    if (name === 'style' && typeof value === 'object') {
      for (const [property, setting] of Object.entries(value)) node.style.setProperty(property, String(setting));
      continue;
    }
    node.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Text only a screen reader announces. */
export const vh = text => h('span', { class: 'j-vh' }, text);
