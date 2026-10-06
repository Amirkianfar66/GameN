// Structural accessibility audit for shell markup trees. It checks what can be decided
// without a browser; it is not a substitute for testing with assistive technology.
import { isElement, textOf } from '@mothership/presentation';

export function walk(node, visit, ancestors = []) {
  if (!isElement(node)) return;
  visit(node, ancestors);
  for (const child of node.children) walk(child, visit, [...ancestors, node]);
}

export function findAll(root, predicate) {
  const found = [];
  walk(root, (element, ancestors) => { if (predicate(element, ancestors)) found.push(element); });
  return found;
}

export const byTag = tag => element => element.tag === tag;
export const byId = id => element => element.attrs.id === id;
export const byClass = name => element => String(element.attrs.class ?? '').split(/\s+/).includes(name);
export const byRegion = id => element => element.attrs['data-region'] === id;

export function find(root, predicate) {
  const [first] = findAll(root, predicate);
  if (!first) throw new Error('Expected element was not rendered');
  return first;
}

const INTENTS = new Set(['role-drawer/toggle', 'session/reconnect', 'app/reload', 'settings/reduce-motion']);
const IDREF_ATTRIBUTES = ['aria-labelledby', 'aria-describedby', 'aria-controls', 'for'];

/** Returns a list of human-readable problems; an empty list means the audit passed. */
export function auditMarkup(root) {
  const problems = [];
  const ids = new Map();
  walk(root, element => {
    const id = element.attrs.id;
    if (id !== undefined) ids.set(id, (ids.get(id) ?? 0) + 1);
  });
  for (const [id, count] of ids) if (count > 1) problems.push(`duplicate id: ${id}`);

  const headings = [];
  const labelTargets = new Set(findAll(root, byTag('label')).map(label => label.attrs.for));
  walk(root, (element, ancestors) => {
    const { tag, attrs } = element;
    for (const name of IDREF_ATTRIBUTES) {
      if (attrs[name] === undefined) continue;
      for (const ref of String(attrs[name]).split(/\s+/)) if (!ids.has(ref)) problems.push(`${tag}[${name}] points at missing id: ${ref}`);
    }
    if (/^h[1-6]$/.test(tag)) {
      headings.push(Number(tag[1]));
      if (textOf(element).trim() === '') problems.push(`empty heading <${tag}>`);
    }
    if (tag === 'button') {
      if (attrs.type !== 'button') problems.push('button without type="button"');
      if (textOf(element).trim() === '') problems.push('button without an accessible name');
    }
    if (tag === 'button' || tag === 'input' || tag === 'a') {
      if (attrs.id === undefined && tag !== 'a') problems.push(`<${tag}> without an id; a host cannot restore focus to it`);
    }
    if (tag === 'input' && !labelTargets.has(attrs.id)) problems.push(`input without a label: ${attrs.id}`);
    if (tag === 'a') {
      const href = String(attrs.href ?? '');
      if (!href.startsWith('#') || !ids.has(href.slice(1))) problems.push(`link target missing: ${href}`);
      if (textOf(element).trim() === '') problems.push('link without an accessible name');
    }
    if (tag === 'section' && attrs['aria-labelledby'] === undefined && attrs['aria-label'] === undefined) problems.push('section without an accessible name');
    if (tag === 'th' && attrs.scope === undefined) problems.push('table header without scope');
    if (tag === 'table' && !element.children.some(child => isElement(child) && child.tag === 'caption')) problems.push('table without a caption');
    if ((tag === 'ul' || tag === 'ol') && element.children.some(child => !isElement(child) || child.tag !== 'li')) problems.push(`<${tag}> with a non-li child`);
    if (tag === 'li' && !['ul', 'ol'].includes(ancestors.at(-1)?.tag)) problems.push('li outside a list');
    if (tag === 'dl' && element.children.some(child => !isElement(child) || !['dt', 'dd'].includes(child.tag))) problems.push('dl with a child that is not dt/dd');
    if (attrs.hidden === true && textOf(element).trim() !== '') problems.push(`hidden element still carries text: ${attrs.id ?? tag}`);
    if (attrs['data-intent'] !== undefined && !INTENTS.has(attrs['data-intent'])) problems.push(`unknown intent: ${attrs['data-intent']}`);
    if (attrs['aria-hidden'] === 'true' && findAll(element, child => ['button', 'input', 'a'].includes(child.tag)).length > 0) problems.push('focusable control inside aria-hidden');
    if (attrs.tabindex !== undefined && !['0', '-1'].includes(String(attrs.tabindex))) problems.push(`positive tabindex on <${tag}>`);
  });

  if (headings.filter(level => level === 1).length !== 1) problems.push(`expected exactly one h1, found ${headings.filter(level => level === 1).length}`);
  if (headings[0] !== 1 && headings.length > 0) problems.push('first heading is not the h1');
  for (let index = 1; index < headings.length; index += 1) {
    if (headings[index] - headings[index - 1] > 1) problems.push(`heading level jumps from h${headings[index - 1]} to h${headings[index]}`);
  }
  if (findAll(root, byTag('main')).length !== 1) problems.push('expected exactly one main landmark');
  if (findAll(root, byTag('header')).length !== 1) problems.push('expected exactly one banner landmark');
  return problems;
}

/** Every value that can act as an identifier or selector: ids, classes and data attributes. */
export function identifierValues(root) {
  const values = [];
  walk(root, element => {
    for (const [name, value] of Object.entries(element.attrs)) {
      if (name === 'id' || name === 'class' || name === 'for' || name.startsWith('data-') || name.startsWith('aria-')) values.push(String(value));
    }
  });
  return values;
}
