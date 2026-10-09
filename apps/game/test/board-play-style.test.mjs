import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The board stylesheet of issue #87. A private mark is drawn only on the viewer's own board,
// so that one leaked into a public board would still not be drawn; durations are tokens.

const css = readFileSync(new URL('../hosted/board-play.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }));
const PRIVATE = /data-board-target|phone-character-target|phone-pick-order|phone-move-ghost|data-cue="pick"/;

/** The selectors of a list, split at top-level commas only: a comma inside :is(...) is part of one selector. */
function selectors(list) {
  const parts = [];
  let depth = 0, start = 0;
  for (let index = 0; index < list.length; index += 1) {
    if (list[index] === '(') depth += 1;
    else if (list[index] === ')') depth -= 1;
    else if (list[index] === ',' && depth === 0) { parts.push(list.slice(start, index).trim()); start = index + 1; }
  }
  return [...parts, list.slice(start).trim()];
}

test('every rule that draws a private mark is scoped to the viewer\'s own board', () => {
  // Reduced-motion rules only take animation away; they draw nothing.
  const offending = rules.filter(rule => PRIVATE.test(rule.selector))
    .flatMap(rule => selectors(rule.selector).filter(part => PRIVATE.test(part) && !part.includes('[data-board="own"]') && !/^\.ms-shell\[data-motion="reduced"\]|:not\(\[data-motion="full"\]\)/.test(part)));
  assert.deepEqual(offending, []);
  assert.ok(rules.some(rule => rule.selector.includes('.ms-board[data-board="own"] .phone-character-target')));
});

test('motion takes its durations from the reviewed tokens and every animation has a reduced form', () => {
  const animations = rules.filter(rule => /animation:\s*board-/.test(rule.body));
  assert.ok(animations.length > 0);
  for (const rule of animations) assert.match(rule.body, /var\(--ms-motion-[a-z-]+\)/, rule.selector);
  assert.match(css, /\.ms-shell\[data-motion="reduced"\][^{]*\*[^{]*\{[^}]*animation:\s*none !important/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(css, /infinite/, 'nothing repeats');
});

test('press areas, room tags and the strip\'s controls keep a 44 px minimum', () => {
  const minimum = selector => rules.find(rule => rule.selector.endsWith(selector))?.body ?? '';
  assert.match(minimum('.ms-board[data-board="own"] .phone-character-target'), /min-width: 44px;[\s\S]*min-height: 44px;/);
  assert.match(minimum('.ms-board[data-board="own"] .phone-room-move'), /min-width: 44px;[\s\S]*min-height: 44px;/);
  assert.match(minimum('.phone-action-dock .phone-strip .ms-button'), /min-height: 44px;/);
});
