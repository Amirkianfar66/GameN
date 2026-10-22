// mothership:dev-only
//
// How a client loads art, as the review pages do it.
//
// A bundle is ONE stylesheet: every picture in it is a custom property holding the picture
// itself, so drawing something later can never cause a request later. A device asks for
// each of its bundles once, before the first match view, whatever the seat's role, state
// or turn. Which requests a device makes then says nothing about the seat.
//
// The stylesheet's rules for art are all behind [data-art~="<bundle>"]. That attribute is
// set here, on the root element, only after the bundle has loaded. Until then, and for
// good if it never loads, the shell is the complete skin without pictures.

import { BUNDLE_STYLESHEETS } from './asset-index.js';

/** The bundles each surface loads. Every phone loads the same three; the table one. */
export const SURFACE_BUNDLES = {
  player: ['public-board', 'player-ui', 'roles'],
  table: ['public-board'],
};

function loadStylesheet(href) {
  return new Promise(resolve => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.addEventListener('load', () => resolve(true), { once: true });
    link.addEventListener('error', () => resolve(false), { once: true });
    document.head.append(link);
  });
}

/**
 * Loads the named bundles and marks each one that arrived. Returns the names that did.
 * A bundle that fails is simply not marked: nothing is retried per picture.
 */
export async function loadBundles(names) {
  const arrived = [];
  await Promise.all(names.map(async name => {
    const href = BUNDLE_STYLESHEETS[name];
    if (!href) throw new Error(`No bundle named ${name}`);
    if (await loadStylesheet(href)) arrived.push(name);
  }));
  const root = document.documentElement;
  const marked = new Set((root.dataset.art ?? '').split(/\s+/).filter(Boolean));
  for (const name of names) if (arrived.includes(name)) marked.add(name);
  if (marked.size > 0) root.dataset.art = [...marked].join(' ');
  return names.filter(name => arrived.includes(name));
}
