// The gameplay parts (design/phone-ui/components/play-parts): the tile, who, facts, the notice and the time line,
// built once for the Gameplay UI builder's components (the Lead's L2). The tile, who and the facts are the kit's
// since component-kit-0.6.0 (kit.test.mjs), and the parts hand them on; the notice and the time line are drawn
// here. A runtime source, so its module graph, its styles' scope and weight, its colours and its motion are
// checked here; its drawing, in a browser under the production headers, by the Actions check
// (design/tools/actions-check.mjs: the probe and the agreement with the pack), whose record actions.test.mjs checks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAY_PARTS_VERSION, PLAY_PARTS_WORDS, STEP_STATES, TILE_STATES, createPlayParts } from '../../../design/phone-ui/components/play-parts/play-parts.mjs';
import { TILE_STATES as KIT_TILE_STATES, TILE_WORDS } from '../../../design/phone-ui/components/kit/kit.mjs';

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
  assert.equal(PLAY_PARTS_VERSION, 'play-parts-0.1.1');
  assert.deepEqual(STEP_STATES, ['done', 'next', 'later']);
  assert.throws(() => createPlayParts(null), /need a document/);
  // Only Actions uses the notice and the time line so far; another builder's use moves the part into the kit (L2).
  for (const path of ['actions/actions.mjs', 'actions/actions.css']) assert.match(read(`design/phone-ui/components/${path}`), /play-parts\/play-parts\.(?:mjs|css)/);
});

test('the tile, who and the facts are the kit\'s, handed on with the same calls (component-kit-0.6.0)', () => {
  // The same states and words as the kit's, not a copy of them.
  assert.equal(TILE_STATES, KIT_TILE_STATES);
  assert.equal(PLAY_PARTS_WORDS, TILE_WORDS);
  assert.deepEqual(TILE_STATES, ['available', 'selected', 'sending', 'registered', 'unavailable']);
  assert.ok(read('design/phone-ui/prototype/screens-game.mjs').includes(PLAY_PARTS_WORDS.registered), 'the registered mark is the pack\'s');
  // The builders are the kit's own; nothing here draws them again.
  const source = read(`${PARTS}/play-parts.mjs`).replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '');
  assert.match(source, /const \{ tile, setTile, who, setWho, facts, setFacts \} = kit;/);
  assert.doesNotMatch(source, /function (?:setTile|setWho|setFacts)\b|ms-pp-(?:tile|who|facts)/, 'no tile, who or facts of its own');
  assert.match(source, /return Object\.freeze\(\{ tile, setTile, who, setWho, facts, setFacts, notice, setNotice, timeline, setTimeline \}\);/, 'the same API');
  assert.doesNotMatch(css, /ms-pp-(?:tile|who|facts)/, 'no styles for them here: they are the kit\'s');
});

test('their styles reach only their own elements, inside a component\'s .ms-kit root, at the kit\'s weight', () => {
  const preludes = rules.map(r => r.prelude).filter(p => !p.startsWith('@'));
  assert.ok(preludes.length >= 13, `found the rules (${preludes.length})`);
  for (const list of preludes) {
    for (const selector of split(list)) {
      assert.match(selector, /^\.ms-kit(?::where\([^)]*\))?\s/, `"${selector}" is inside a component's .ms-kit root`);
      assert.match(selector, /ms-pp-(?:notice|steps?\b|step-dot)|\[class/, `"${selector}" styles the notice or the time line`);
      assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
      assert.equal(classWeight(selector), 1, `"${selector}" weighs one class, as the kit's`);
    }
  }
  assert.deepEqual([...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))], ['--ic-knock'], 'only the icons\' knock-out colour, the kit\'s own property, is set');
});

test('neither part takes taps: the tile, which you can tap, is the kit\'s (with its tap-highlight rule, kit.md)', () => {
  assert.deepEqual(rules.filter(r => /cursor:/.test(r.body)).map(r => r.prelude), []);
});

test('their colours are the kit\'s tokens, or the pack\'s own values where the kit has no token', () => {
  const pack = ['design/phone-ui/prototype/screens.css', 'design/phone-ui/prototype/kit.css'].map(read).join('\n').replace(/\s+/g, '').toLowerCase();
  const raw = [...new Set([...css.matchAll(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi)].map(m => m[0]))];
  assert.deepEqual(raw, ['#B9C4D3'], 'one raw value: the time line\'s dashed steel-pale ring');
  for (const value of raw) assert.ok(pack.includes(value.replace(/\s+/g, '').toLowerCase()), `${value} is the pack's`);
});

test('neither part moves: the sending tile\'s spinner went with the tile into the kit, where it stands still with Reduce motion', () => {
  assert.deepEqual([...css.matchAll(/@keyframes\s+([\w-]+)/g)], [], 'no keyframes of their own');
  assert.deepEqual(rules.filter(r => /animation|transition/.test(r.body)).map(r => r.prelude), [], 'no animation or transition');
});
