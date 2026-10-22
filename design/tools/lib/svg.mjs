// A small reader and writer for the Designer's own SVG sources. Node built-ins only.
//
// It understands what those sources contain: an XML declaration, comments, elements with
// quoted attributes, and text. It is not a general XML parser and refuses what it does not
// understand (CDATA, DOCTYPE, entities other than the five predefined ones) instead of
// guessing, so a source edited into something surprising fails the build loudly.

export function parseSvg(text, file = 'svg') {
  let position = 0;
  const fail = message => {
    const line = text.slice(0, position).split('\n').length;
    throw new Error(`${file}:${line}: ${message}`);
  };
  const root = { type: 'element', name: '#document', attrs: [], children: [] };
  const stack = [root];
  while (position < text.length) {
    if (text.startsWith('<?', position)) {
      const end = text.indexOf('?>', position);
      if (end < 0) fail('unterminated declaration');
      position = end + 2;
    } else if (text.startsWith('<!--', position)) {
      const end = text.indexOf('-->', position);
      if (end < 0) fail('unterminated comment');
      stack.at(-1).children.push({ type: 'comment', value: text.slice(position + 4, end) });
      position = end + 3;
    } else if (text.startsWith('<!', position)) {
      fail('DOCTYPE and CDATA are not used in design sources');
    } else if (text.startsWith('</', position)) {
      const end = text.indexOf('>', position);
      const name = text.slice(position + 2, end).trim();
      const open = stack.pop();
      if (!open || open.name !== name) fail(`closing </${name}> does not match <${open?.name}>`);
      position = end + 1;
    } else if (text[position] === '<') {
      const match = /^<([A-Za-z][\w:.-]*)/.exec(text.slice(position, position + 80));
      if (!match) fail('malformed tag');
      const element = { type: 'element', name: match[1], attrs: [], children: [] };
      position += match[0].length;
      for (;;) {
        const rest = text.slice(position);
        const space = /^\s+/.exec(rest);
        if (space) {
          position += space[0].length;
          continue;
        }
        if (rest.startsWith('/>')) {
          position += 2;
          stack.at(-1).children.push(element);
          break;
        }
        if (rest.startsWith('>')) {
          position += 1;
          stack.at(-1).children.push(element);
          stack.push(element);
          break;
        }
        const attribute = /^([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/.exec(rest);
        if (!attribute) fail(`malformed attribute in <${element.name}>`);
        const value = attribute[2] ?? attribute[3];
        if (/&(?!(amp|lt|gt|quot|apos);)/.test(value)) fail('unsupported entity');
        if (element.attrs.some(([name]) => name === attribute[1])) fail(`duplicate attribute ${attribute[1]}`);
        element.attrs.push([attribute[1], value]);
        position += attribute[0].length;
      }
    } else {
      const end = text.indexOf('<', position);
      const value = text.slice(position, end < 0 ? text.length : end);
      if (value.trim() !== '') stack.at(-1).children.push({ type: 'text', value });
      position = end < 0 ? text.length : end;
    }
  }
  if (stack.length !== 1) fail(`<${stack.at(-1).name}> is not closed`);
  const elements = root.children.filter(node => node.type === 'element');
  if (elements.length !== 1 || elements[0].name !== 'svg') fail('expected one <svg> root');
  return elements[0];
}

export const attr = (node, name) => node.attrs.find(([key]) => key === name)?.[1] ?? null;

export function withoutAttr(node, name) {
  return { ...node, attrs: node.attrs.filter(([key]) => key !== name) };
}

export function* walk(node, ancestors = []) {
  if (node.type !== 'element') return;
  yield { node, ancestors };
  for (const child of node.children) yield* walk(child, [...ancestors, node]);
}

export function findById(root, id) {
  for (const entry of walk(root)) if (attr(entry.node, 'id') === id) return entry;
  return null;
}

/** Ids this subtree points at through url(#id) or href="#id". */
export function references(node) {
  const found = new Set();
  for (const { node: element } of walk(node)) {
    for (const [name, value] of element.attrs) {
      for (const match of value.matchAll(/url\(#([\w:.-]+)\)/g)) found.add(match[1]);
      if ((name === 'href' || name === 'xlink:href') && value.startsWith('#')) found.add(value.slice(1));
    }
  }
  return found;
}

/** Every literal color written in this subtree, upper-cased. */
export function colors(node) {
  const found = new Set();
  for (const { node: element } of walk(node)) {
    for (const [, value] of element.attrs) {
      for (const match of value.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)) found.add(match[0].toUpperCase());
    }
  }
  return found;
}

// The whole drawing vocabulary of a design source. Anything else is refused by name, so a
// title, a text element, a style, a link, a filter or an outside reference cannot slip in
// under a check that only looked for the ones it thought of.
export const ALLOWED_ELEMENTS = new Set(['svg', 'defs', 'g', 'path', 'circle', 'ellipse', 'rect', 'polygon', 'pattern', 'clipPath']);
export const ALLOWED_ATTRIBUTES = new Set([
  'id', 'xmlns', 'viewBox', 'width', 'height', 'transform', 'display', 'opacity',
  'd', 'points', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y',
  'fill', 'fill-rule', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray',
  'clip-path', 'patternUnits', 'patternTransform',
]);
const SHAPES = new Set(['path', 'circle', 'ellipse', 'rect', 'polygon']);
const PAINT = /^(none|#[0-9A-Fa-f]{6}|url\(#[\w-]+\))$/;
const LOCAL_REFERENCE = /^url\(#[\w-]+\)$/;
const NUMBERS = /^[-+0-9.eE ,]*$/;

/**
 * Everything in a subtree that a design source may not contain. A paint is `none`, a
 * six-digit hex color or a reference to a definition in the same file: a named color, an
 * rgb() or hsl() value, an eight-digit hex or a style attribute would get past a palette
 * check that reads hex literals, so none of them is allowed to exist. A shape with no fill
 * of its own or from the layer above it would be drawn in black, which is not a token color.
 */
export function problemsIn(root, { allowCurrentColor = false } = {}) {
  const problems = [];
  (function visit(node, inherited, insideClip) {
    if (node.type === 'text') {
      problems.push(`text "${node.value.trim().slice(0, 24)}"`);
      return;
    }
    if (node.type !== 'element') return;
    if (!ALLOWED_ELEMENTS.has(node.name)) {
      problems.push(`<${node.name}> is not part of the drawing vocabulary`);
      return;
    }
    const label = `<${node.name}${attr(node, 'id') ? ` id="${attr(node, 'id')}"` : ''}>`;
    for (const [name, value] of node.attrs) {
      if (!ALLOWED_ATTRIBUTES.has(name) && !name.startsWith('data-')) problems.push(`${label}: attribute ${name} is not allowed`);
      if (value.includes("'")) problems.push(`${label}: ${name} contains a quote`);
      if (name === 'fill' || name === 'stroke') {
        if (!PAINT.test(value) && !(allowCurrentColor && value === 'currentColor')) problems.push(`${label}: ${name}="${value}" is not none, a six-digit hex color or a local reference`);
      } else if (name === 'clip-path') {
        if (!LOCAL_REFERENCE.test(value)) problems.push(`${label}: clip-path="${value}" is not a local reference`);
      } else if (name === 'display') {
        if (value !== 'none') problems.push(`${label}: display may only be "none"`);
      } else if (['opacity', 'stroke-width', 'stroke-miterlimit', 'stroke-dasharray', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y'].includes(name)) {
        if (!NUMBERS.test(value)) problems.push(`${label}: ${name}="${value}" is not a number`);
      } else if (/url\(|https?:|data:|javascript:/i.test(value) && name !== 'xmlns') {
        problems.push(`${label}: ${name} carries a reference`);
      }
    }
    const fill = attr(node, 'fill') ?? inherited;
    const clip = insideClip || node.name === 'clipPath';
    if (SHAPES.has(node.name) && !clip && fill === null) problems.push(`${label}: no fill of its own or from its layer, so it would be drawn in black`);
    for (const child of node.children) visit(child, fill, clip);
  })(root, null, false);
  return problems;
}

const escapeAttr = value => value.replace(/&(?!(amp|lt|gt|quot|apos);)/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const tidy = value => value.replace(/\s+/g, ' ').trim();

/** Compact text for an export: no comments, no layout whitespace. */
export function serialize(node) {
  if (node.type === 'comment') return '';
  if (node.type === 'text') return tidy(node.value);
  const attributes = node.attrs.map(([name, value]) => ` ${name}="${escapeAttr(name === 'd' || name === 'points' ? tidy(value) : value)}"`).join('');
  const children = node.children.map(serialize).join('');
  return children === '' ? `<${node.name}${attributes}/>` : `<${node.name}${attributes}>${children}</${node.name}>`;
}

/** Replaces one literal color with another value everywhere in a subtree. Returns a new tree. */
export function recolor(node, from, to) {
  if (node.type !== 'element') return node;
  const pattern = new RegExp(from.replace('#', '#'), 'gi');
  return {
    ...node,
    attrs: node.attrs.map(([name, value]) => [name, value.replace(pattern, to)]),
    children: node.children.map(child => recolor(child, from, to)),
  };
}
