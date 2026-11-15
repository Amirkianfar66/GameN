// The phone interface's shared kit (design/phone-ui/components/kit): the one look and behaviour every
// Designer component's controls share. Its module graph, the scope of its styles, and its values against
// the pinned pack's kit.css are checked here; its elements beside the pack's in a browser by its preview.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUTTON_KINDS, CELL_STATES, COMPONENT_KIT_VERSION, PILL_TONES, ROW_TINTS, STAMP_TONES, seatNumber } from '../../../design/phone-ui/components/kit/kit.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const read = path => readFileSync(join(REPO, path), 'utf8');
const KIT_CSS = read('design/phone-ui/components/kit/kit.css');
const PACK_CSS = read('design/phone-ui/prototype/kit.css');

function graph(entry) {
  const seen = new Map();
  const visit = file => {
    if (seen.has(file)) return;
    const source = readFileSync(file, 'utf8');
    const specifiers = [...source.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s+'([^']+)'|^\s*import\s+'([^']+)'|@import url\("([^"]+)"\)/gm)].map(m => m[1] ?? m[2] ?? m[3]);
    seen.set(file, specifiers);
    for (const s of specifiers) if (s.startsWith('.')) visit(resolve(dirname(file), s));
  };
  visit(entry);
  return seen;
}
/** A stylesheet's custom properties declared in its first block that matches `selector`. */
function tokens(css, selector) {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
}

test('the kit is a runtime source: its graph is runtime-safe and in the hosted graph', () => {
  const files = new Map([...graph(join(REPO, 'design/phone-ui/components/kit/kit.mjs')), ...graph(join(REPO, 'design/phone-ui/components/kit/kit.css'))]);
  const local = [...files.keys()].map(f => relative(REPO, f));
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), path);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview)(?:\/|\.)/, path);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, path);
  }
  assert.deepEqual([...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))], ['@mothership/contracts']);
  assert.ok(local.includes('design/phone-ui/components/icons.mjs'));
  assert.equal(COMPONENT_KIT_VERSION, 'component-kit-0.1.0', 'not the #121 phone kit (phone-kit-0.1.0)');
});

test('its styles apply only inside an ms-kit root, to elements with its own classes', () => {
  const css = KIT_CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const keyframes = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]);
  assert.ok(keyframes.length > 0 && keyframes.every(k => k.startsWith('ms-k-')));
  const body = css.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  // Split at top-level separators only, so a comma or a space inside :is(…) or :where(…) stays put.
  const split = (list, at) => { const out = ['']; let depth = 0; for (const ch of list) { if (ch === '(') depth += 1; if (ch === ')') depth -= 1; if (at.test(ch) && depth === 0) out.push(''); else out[out.length - 1] += ch; } return out.map(s => s.trim()).filter(Boolean); };
  const selectors = [...body.matchAll(/(^|[{}])([^{}]*?)\{/g)].map(m => m[2].trim()).filter(s => s && !s.startsWith('@')).flatMap(s => split(s, /,/));
  assert.ok(selectors.length > 80, `found the rules (${selectors.length})`);
  for (const selector of selectors) {
    assert.match(selector, /^\.ms-kit(?:[\s.:\[]|$)/, `"${selector}" is scoped`);
    assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
    // Every element it styles carries a kit class (ms-k-…), save the root itself and a surface marker.
    const subject = split(selector.replace(/::?(?:before|after)$/, ''), /[\s>+~]/).at(-1);
    if (selector !== '.ms-kit' && subject !== '[data-ms-surface="glass"]') assert.match(subject, /ms-k-|^:is\(\[class/, `"${selector}": its subject is a kit element`);
  }
  const declared = [...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))];
  assert.deepEqual(declared.filter(p => !p.startsWith('--ms-k-') && p !== '--ic-knock'), []);
});

test('its values are the pack\'s: every token, and the pack\'s control kinds, tones, tints and states', () => {
  const pack = tokens(PACK_CSS, ':root'), kit = tokens(KIT_CSS, '.ms-kit');
  const same = { canvas: 'canvas', 'surface-1': 'surface-1', 'surface-2': 'panel', 'surface-3': 'surface-3', 'surface-4': 'surface-4', paper: 'paper', 'paper-deep': 'paper-deep',
    ink: 'ink', text: 'text-primary', 'text-2': 'text-secondary', 'text-3': 'steel-light', accent: 'accent', caption: 'caption', 'steel-mid': 'steel-mid', 'steel-light': 'steel-light',
    hairline: 'hairline', 'glass-fill': 'glass-fill', 'glass-fill-2': 'glass-fill-2', 'glass-line': 'glass-line', 'shadow-ink': 'shadow-ink', 'radius-control': 'radius-control',
    'radius-group': 'radius-group', target: 'target', font: 'font-ui', letter: 'font-letter', 't-card': 't-card' };
  for (const [k, p] of Object.entries(same)) assert.equal(kit[`--ms-k-${k}`], pack[`--${p}`], `--ms-k-${k} is the pack's --${p}`);
  assert.equal(kit['--ms-k-on-accent'], '#151923', 'on-accent is the pack\'s ink');
  for (const kind of BUTTON_KINDS) assert.match(PACK_CSS, new RegExp(`\\.btn-${kind} \\{`), `the pack has .btn-${kind}`);
  for (const state of CELL_STATES.filter(s => s !== 'available')) assert.match(PACK_CSS, new RegExp(`\\.cell\\[data-state="${state}"\\]`), `the pack draws a ${state} cell`);
  for (const tone of STAMP_TONES.filter(Boolean)) assert.match(PACK_CSS, new RegExp(`\\.stamp\\[data-tone="${tone}"\\]`), `the pack has a ${tone} stamp`);
  for (const tone of PILL_TONES.filter(Boolean)) assert.match(PACK_CSS, new RegExp(`\\.pill\\[data-tone="${tone}"\\]`), `the pack has a ${tone} pill`);
  for (const tint of ROW_TINTS.filter(Boolean)) assert.match(PACK_CSS, new RegExp(`\\.row-icon\\[data-tint="${tint}"\\]`), `the pack has a ${tint} row icon`);
  // On glass, the pack's lighter greys.
  assert.match(KIT_CSS, /\[data-ms-surface="glass"\] \{ --ms-k-text-2: #DCE3EC; --ms-k-text-3: #D3DBE5; \}/);
  assert.match(PACK_CSS, /--text-secondary: #DCE3EC; --text-tertiary: #D3DBE5;/);
  assert.equal(seatNumber({ seat: 'seat-7' }), 7);
});
