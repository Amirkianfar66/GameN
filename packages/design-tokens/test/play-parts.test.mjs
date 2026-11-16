// The gameplay parts (design/phone-ui/components/play-parts): the tile, who, facts, the notice and the time line,
// built once for the Gameplay UI builder's components (the Lead's L2). A runtime source, so its module graph, its
// styles' scope and weight, its colours and its motion are checked here; its drawing, in a browser under the
// production headers, by the Actions check (design/tools/actions-check.mjs: the probe and the agreement with
// the pack), whose record actions.test.mjs checks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAY_PARTS_VERSION, PLAY_PARTS_WORDS, STEP_STATES, TILE_STATES, createPlayParts } from '../../../design/phone-ui/components/play-parts/play-parts.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const PARTS = 'design/phone-ui/components/play-parts';
const read = path => readFileSync(join(REPO, path), 'utf8');
const imports = source => [...source.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s+'([^']+)'|^\s*import\s+'([^']+)'|@import url\("([^"]+)"\)/gm)].map(m => m[1] ?? m[2] ?? m[3]);
/** A selector list split at its top-level commas. */
const split = list => {
  const out = [''];
  let depth = 0;
  for (const ch of list) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) out.push(''); else out[out.length - 1] += ch;
  }
  return out.map(s => s.trim());
};
/** A selector without its :where(…) groups, which weigh nothing. */
const unweighted = selector => {
  let out = '', depth = 0;
  for (let i = 0; i < selector.length; i += 1) {
    if (depth === 0 && selector.startsWith(':where(', i)) { depth = 1; i += ':where('.length - 1; continue; }
    if (depth > 0) { if (selector[i] === '(') depth += 1; if (selector[i] === ')') depth -= 1; continue; }
    out += selector[i];
  }
  return out;
};
/** The selector's weight in classes, attributes and pseudo-classes. */
const classWeight = selector => {
  const s = unweighted(selector);
  return (s.match(/\.[\w-]+/g) ?? []).length + (s.match(/\[[^\]]+\]/g) ?? []).length + (s.match(/(?<!:):(?!:)[\w-]+/g) ?? []).length;
};
const css = read(`${PARTS}/play-parts.css`).replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ prelude: m[1].trim(), body: m[2] })).filter(r => !/^(?:from|to|\d+%)$/.test(r.prelude));

test('the parts are a runtime source: they draw on the kit alone, and nothing development-only', () => {
  assert.deepEqual(imports(read(`${PARTS}/play-parts.mjs`)), ['../kit/kit.mjs']);
  assert.deepEqual(imports(read(`${PARTS}/play-parts.css`)), ['../kit/kit.css']);
  for (const path of [`${PARTS}/play-parts.mjs`, `${PARTS}/play-parts.css`]) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  assert.equal(PLAY_PARTS_VERSION, 'play-parts-0.2.0');
  assert.deepEqual(TILE_STATES, ['available', 'selected', 'sending', 'registered', 'unavailable']);
  assert.deepEqual(STEP_STATES, ['done', 'next', 'later']);
  assert.ok(read('design/phone-ui/prototype/screens-game.mjs').includes(PLAY_PARTS_WORDS.registered), 'the registered mark is the pack\'s');
  assert.throws(() => createPlayParts(null), /need a document/);
  // Only Actions uses them so far; another builder's use moves the part into the kit (L2).
  for (const path of ['actions/actions.mjs', 'actions/actions.css']) assert.match(read(`design/phone-ui/components/${path}`), /play-parts\/play-parts\.(?:mjs|css)/);
});

test('their styles reach only their own elements, inside a component\'s .ms-kit root, at the kit\'s weight', () => {
  const preludes = rules.map(r => r.prelude).filter(p => !p.startsWith('@'));
  assert.ok(preludes.length >= 45, `found the rules (${preludes.length})`);
  // The two rules that size the kit's portrait inside who weigh two, so they outrank the kit's own in any order.
  const heavier = ['.ms-kit .ms-pp-who-lead :where(.ms-k-pt)', '.ms-kit .ms-pp-who-lead:where([data-form="pair"]) :where(.ms-k-pt + .ms-k-pt)'];
  for (const list of preludes) {
    for (const selector of split(list)) {
      assert.match(selector, /^\.ms-kit(?::where\([^)]*\))?\s/, `"${selector}" is inside a component's .ms-kit root`);
      assert.match(selector, /ms-pp-/, `"${selector}" styles a part`);
      assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
      assert.equal(classWeight(selector), heavier.includes(selector) ? 2 : 1, `"${selector}" weighs ${heavier.includes(selector) ? 'two classes' : 'one class, as the kit\'s'}`);
    }
  }
  for (const selector of heavier) assert.ok(preludes.includes(selector), `${selector} is there`);
  assert.deepEqual([...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))], ['--ic-knock'], 'only the icons\' knock-out colour, the kit\'s own property, is set');
});

test('a part you can tap turns off the browser\'s tap highlight in the same rule (kit.md)', () => {
  const pointers = rules.filter(r => /cursor:\s*pointer/.test(r.body));
  assert.ok(pointers.length >= 1, 'the tile takes taps');
  for (const r of pointers) assert.match(r.body, /-webkit-tap-highlight-color:\s*transparent/, `${r.prelude}: no tap highlight`);
});

test('their colours are the kit\'s tokens, or the pack\'s own values where the kit has no token', () => {
  const pack = ['design/phone-ui/prototype/screens.css', 'design/phone-ui/prototype/kit.css'].map(read).join('\n').replace(/\s+/g, '').toLowerCase();
  const raw = [...new Set([...css.matchAll(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi)].map(m => m[0]))];
  assert.ok(raw.length > 0 && raw.length <= 6, `a few raw values (${raw.join(', ')})`);
  for (const value of raw) assert.ok(pack.includes(value.replace(/\s+/g, '').toLowerCase()), `${value} is the pack's`);
});

test('their one motion is the kit\'s spinner, which stands still with the game\'s or the device\'s Reduce motion', () => {
  assert.deepEqual([...css.matchAll(/@keyframes\s+([\w-]+)/g)], [], 'no keyframes of their own');
  const animated = rules.filter(r => /animation:\s*(?!none\b)[\w-]/.test(r.body));
  assert.deepEqual(animated.map(r => r.body.match(/animation:\s*([\w-]+)/)[1]), ['ms-k-spin'], 'the sending tile\'s spinner, the kit\'s');
  assert.match(css, /\.ms-kit:where\(\[data-motion="reduced"\]\) :where\(\.ms-pp-tile\[data-state="sending"\] \.ms-pp-tile-icon\)::after \{ animation: none; \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.ms-kit :where\(\.ms-pp-tile\[data-state="sending"\] \.ms-pp-tile-icon\)::after \{ animation: none; \} \}/);
});
