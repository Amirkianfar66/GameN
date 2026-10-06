// Renderer-neutral semantic markup. Shell layouts are plain data so one structure can be
// asserted in Node, serialized for the DOM fallback, or mapped onto another renderer
// without re-deriving its accessibility semantics.

const TAGS = [
  'a', 'button', 'caption', 'dd', 'details', 'div', 'dl', 'dt', 'footer', 'h1', 'h2', 'h3', 'h4', 'header',
  'input', 'label', 'li', 'main', 'ol', 'p', 'section', 'span', 'strong', 'summary', 'table', 'tbody',
  'td', 'th', 'thead', 'tr', 'ul',
] as const;
export type MarkupTag = (typeof TAGS)[number];
const TAG_SET: ReadonlySet<string> = new Set(TAGS);
const VOID_TAGS: ReadonlySet<string> = new Set(['input']);

export type MarkupAttributeValue = string | number | boolean;
export interface MarkupElement {
  readonly tag: MarkupTag;
  readonly attrs: Readonly<Record<string, MarkupAttributeValue>>;
  readonly children: readonly MarkupNode[];
}
export type MarkupNode = MarkupElement | string;
export type MarkupChild = MarkupNode | null | undefined | false | readonly MarkupChild[];
export type MarkupAttributes = Readonly<Record<string, MarkupAttributeValue | null | undefined>>;

const ATTRIBUTE_NAME = /^[a-z][a-z0-9-]*$/;
// An allowlist, not a list of known dangers: markup stays compatible with a strict content
// security policy and can never carry script, inline style, an event handler, a resource
// URL, or a navigation target chosen by data, including through an attribute nobody thought of.
const ATTRIBUTES: ReadonlySet<string> = new Set(['class', 'id', 'href', 'type', 'role', 'tabindex', 'hidden', 'checked', 'for', 'scope', 'disabled', 'open', 'lang']);
const PREFIXED_ATTRIBUTE = /^(aria|data)-[a-z][a-z0-9-]*$/;

function checkTag(tag: string): void {
  if (!TAG_SET.has(tag)) throw new TypeError(`Tag not permitted in shell markup: ${tag}`);
}

function checkAttribute(tag: string, name: string, value: MarkupAttributeValue): void {
  if (!ATTRIBUTE_NAME.test(name)) throw new TypeError(`Invalid attribute name on <${tag}>: ${name}`);
  if (!ATTRIBUTES.has(name) && !PREFIXED_ATTRIBUTE.test(name)) throw new TypeError(`Attribute not permitted in shell markup: ${name}`);
  if (name === 'href' && !(typeof value === 'string' && /^#[A-Za-z][A-Za-z0-9_-]*$/.test(value))) {
    throw new TypeError('Shell markup links may only target an in-page fragment');
  }
}

function flatten(children: readonly MarkupChild[], into: MarkupNode[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (typeof child === 'string') into.push(child);
    else if (isChildList(child)) flatten(child, into);
    else into.push(child);
  }
}
function isChildList(child: MarkupElement | readonly MarkupChild[]): child is readonly MarkupChild[] {
  return Array.isArray(child);
}

export function h(tag: MarkupTag, attrs: MarkupAttributes | null, ...children: readonly MarkupChild[]): MarkupElement {
  checkTag(String(tag));
  const kept: Record<string, MarkupAttributeValue> = {};
  for (const [name, value] of Object.entries(attrs ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    checkAttribute(tag, name, value);
    kept[name] = value;
  }
  const flat: MarkupNode[] = [];
  flatten(children, flat);
  if (VOID_TAGS.has(tag) && flat.length > 0) throw new TypeError(`<${tag}> cannot have children`);
  return { tag, attrs: kept, children: flat };
}

export function isElement(node: MarkupNode): node is MarkupElement {
  return typeof node !== 'string';
}

export function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
export function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function toHtml(node: MarkupNode): string {
  if (typeof node === 'string') return escapeText(node);
  // Checked again here, so a node assembled by hand is held to the same rules as one from h().
  checkTag(node.tag);
  let html = `<${node.tag}`;
  for (const [name, value] of Object.entries(node.attrs)) {
    if (value === false) continue;
    checkAttribute(node.tag, name, value);
    html += value === true ? ` ${name}` : ` ${name}="${escapeAttribute(String(value))}"`;
  }
  html += '>';
  if (VOID_TAGS.has(node.tag)) return html;
  for (const child of node.children) html += toHtml(child);
  return `${html}</${node.tag}>`;
}

/** Concatenated text of a subtree, as assistive technology would read its content. */
export function textOf(node: MarkupNode): string {
  if (typeof node === 'string') return node;
  return node.children.map(textOf).join('');
}

export interface RegionSplit {
  /** Attributes of the shell root. A host applies them in place instead of rebuilding the page. */
  readonly rootAttrs: Readonly<Record<string, MarkupAttributeValue>>;
  /** Everything inside the root, with every region replaced by an empty slot element. */
  readonly frameHtml: string;
  /** Region id to the serialized region element, in document order. */
  readonly regions: ReadonlyMap<string, string>;
}

// A host can replace only the regions whose serialization changed, so focus and reading
// position elsewhere on the page survive a countdown tick or a snapshot update.
export function splitRegions(root: MarkupElement): RegionSplit {
  const regions = new Map<string, string>();
  function frame(node: MarkupNode, insideRegion: boolean): MarkupNode {
    if (typeof node === 'string') return node;
    const regionId = node.attrs['data-region'];
    if (regionId !== undefined) {
      if (insideRegion) throw new TypeError('Shell regions cannot be nested');
      if (typeof regionId !== 'string' || regions.has(regionId)) throw new TypeError('Shell region ids must be unique strings');
      node.children.forEach(child => frame(child, true));
      regions.set(regionId, toHtml(node));
      return { tag: 'div', attrs: { 'data-region-slot': regionId }, children: [] };
    }
    return { tag: node.tag, attrs: node.attrs, children: node.children.map(child => frame(child, insideRegion)) };
  }
  if (root.attrs['data-region'] !== undefined) throw new TypeError('The shell root cannot itself be a region');
  const frameHtml = root.children.map(child => toHtml(frame(child, false))).join('');
  return { rootAttrs: root.attrs, frameHtml, regions };
}
