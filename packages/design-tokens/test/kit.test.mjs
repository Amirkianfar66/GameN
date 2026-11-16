// The phone interface's shared kit (design/phone-ui/components/kit): the one look and behaviour every
// Designer component's controls share. Its module graph, the scope of its styles and its values against the
// pinned pack's kit.css are checked here, and last the record of design/tools/kit-check.mjs, which draws every
// builder beside the pack's in a browser under the production headers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUTTON_KINDS, CELL_STATES, COMPONENT_KIT_VERSION, PILL_TONES, ROW_TINTS, STAMP_TONES, TILE_STATES, seatNumber } from '../../../design/phone-ui/components/kit/kit.mjs';
import { CASES } from '../../../design/phone-ui/components/kit/preview/cases.mjs';
import { ACCEPTED } from '../../../design/phone-ui/components/kit/preview/compare.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const read = path => readFileSync(join(REPO, path), 'utf8');
const KIT_CSS = read('design/phone-ui/components/kit/kit.css');
const PACK_CSS = read('design/phone-ui/prototype/kit.css');
const SCREENS_CSS = read('design/phone-ui/prototype/screens.css');

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
  assert.equal(COMPONENT_KIT_VERSION, 'component-kit-0.6.1', 'not the #121 phone kit (phone-kit-0.1.0)');
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
  const ROOT = ':where(.ms-kit)', GLASS_GREYS = '.ms-kit :where([data-ms-surface="glass"], [data-ms-surface="glass"] .ms-kit)';
  for (const selector of selectors) {
    assert.ok(selector === ROOT || /^\.ms-kit(?:[\s:]|$)/.test(selector), `"${selector}" is scoped`);
    assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
    // Every element it styles carries a kit class (ms-k-…), save the root and the glass greys' surface and nested root.
    if (selector === ROOT || selector === GLASS_GREYS) continue;
    const subject = split(selector.replace(/::?(?:before|after|placeholder)$/, ''), /[\s>+~]/).at(-1);
    assert.match(subject, /ms-k-|:where\(\[class/, `"${selector}": its subject is a kit element`);
  }
  const declared = [...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))];
  assert.deepEqual(declared.filter(p => !p.startsWith('--ms-k-') && p !== '--ic-knock'), []);
});

test('every rule weighs one class at most, so a component\'s own rules outrank the kit whatever order they load in', () => {
  const css = KIT_CSS.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  const split = list => { const out = ['']; let depth = 0; for (const ch of list) { if (ch === '(') depth += 1; if (ch === ')') depth -= 1; if (ch === ',' && depth === 0) out.push(''); else out[out.length - 1] += ch; } return out.map(s => s.trim()).filter(Boolean); };
  /** The selector with every :where(…) taken out: what is left carries all of its weight. */
  const weighed = selector => { let out = '', depth = 0; for (let i = 0; i < selector.length; i += 1) { if (depth === 0 && selector.startsWith(':where(', i)) { depth = 1; i += 6; continue; } if (depth > 0) { if (selector[i] === '(') depth += 1; if (selector[i] === ')') depth -= 1; continue; } out += selector[i]; } return out.trim(); };
  const selectors = [...css.matchAll(/(^|[{}])([^{}]*?)\{/g)].map(m => m[2].trim()).filter(s => s && !s.startsWith('@')).flatMap(split);
  for (const selector of selectors) {
    const left = weighed(selector).replace(/::(?:before|after|placeholder)$/, '').trim();
    if (selector === ':where(.ms-kit)') { assert.equal(left, '', 'the root weighs nothing'); continue; }
    assert.equal(left, '.ms-kit', `"${selector}" weighs one class: everything but .ms-kit inside :where()`);
  }
  assert.ok(selectors.length > 100, `found the rules (${selectors.length})`);
});

test('its values are the pack\'s: every token, and the pack\'s control kinds, tones, tints and states', () => {
  const pack = tokens(PACK_CSS, ':root'), kit = tokens(KIT_CSS, ':where(.ms-kit)');
  const same = { canvas: 'canvas', 'surface-1': 'surface-1', 'surface-2': 'panel', 'surface-3': 'surface-3', 'surface-4': 'surface-4', paper: 'paper', 'paper-deep': 'paper-deep', 'paper-shade': 'paper-shade',
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
  // The tile's states (0.6.0) are the pack's screens.css ones; sending is its submitting.
  for (const state of TILE_STATES.filter(s => s !== 'available')) assert.match(SCREENS_CSS, new RegExp(`\\.tile\\[data-state="${state === 'sending' ? 'submitting' : state}"\\]`), `the pack draws a ${state} tile`);
  // On glass, the pack's lighter greys.
  assert.ok(KIT_CSS.includes('.ms-kit :where([data-ms-surface="glass"], [data-ms-surface="glass"] .ms-kit) { --ms-k-text-2: #DCE3EC; --ms-k-text-3: #D3DBE5; }'), 'on glass, and in a component root on glass');
  assert.match(PACK_CSS, /--text-secondary: #DCE3EC; --text-tertiary: #D3DBE5;/);
  assert.equal(seatNumber({ seat: 'seat-7' }), 7);
});

test('its comparison with the pack is development only: the pages, the cases, the rules and the tools', () => {
  for (const path of ['cases.mjs', 'compare.mjs', 'page.mjs'].map(f => `design/phone-ui/components/kit/preview/${f}`).concat(['design/tools/kit-check.mjs', 'design/tools/lib/component-check.mjs'])) {
    assert.match(read(path), /^\/\/ mothership:dev-only/, path);
  }
  for (const page of ['pack', 'kit']) assert.match(read(`design/phone-ui/components/kit/preview/${page}.html`), /^<!doctype html>\n<!-- mothership:dev-only/, page);
  // Each half loads only its own styles: the pack's page the pack's, the kit's page the kit's and the shell's.
  assert.deepEqual([...read('design/phone-ui/components/kit/preview/pack.html').matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]), ['../../../prototype/kit.css', '../../../prototype/screens.css']);
  assert.deepEqual([...read('design/phone-ui/components/kit/preview/kit.html').matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]), ['../kit.css', '../../phone-shell/phone-shell.css']);
  assert.ok(ACCEPTED.every(a => a.why.length > 40 && a.keys.length > 0), 'every accepted difference says why');
});

test('the kit check\'s record: every case agrees with the pinned pack at 100 % and 200 % text, plain and on glass', () => {
  const record = JSON.parse(read('design/phone-ui/components/kit/review/check.json'));
  assert.equal(record.tool, 'design/tools/kit-check.mjs');
  assert.equal(record.version, COMPONENT_KIT_VERSION);
  assert.ok(record.sourceClean, 'recorded against a clean source');
  const shell = JSON.parse(read('design/phone-ui/components/phone-shell/review/check.json'));
  assert.equal(record.headersSha256, shell.headersSha256, 'under the same production headers as the shell\'s check');
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  assert.deepEqual(Object.keys(record.pages).sort(), ['kit-100', 'kit-200', 'pack-100', 'pack-200']);
  for (const [name, page] of Object.entries(record.pages)) assert.ok(page.ok && page.problems.length === 0 && page.violations.every(v => v.kind !== 'unexpected'), `${name}: a clean page`);
  assert.deepEqual(Object.keys(record.agreement).sort(), ['100', '200']);
  for (const [text, sections] of Object.entries(record.agreement)) {
    assert.deepEqual(Object.keys(sections.plain), CASES.map(c => c.id), `${text}%: every case, plain`);
    assert.deepEqual(Object.keys(sections.glass), CASES.filter(c => c.where === 'both').map(c => c.id), `${text}%: every case drawn on glass`);
    for (const [section, cases] of Object.entries(sections)) {
      for (const [id, c] of Object.entries(cases)) {
        assert.ok(c.ok && c.differences.length === 0, `${text}% ${section} · ${id} agrees`);
        assert.ok(c.parts > 0, `${text}% ${section} · ${id}: parts compared`);
        for (const a of c.accepted) assert.ok(record.accepted[a.rule], `${text}% ${section} · ${id}: ${a.part} ${a.key} is an accepted difference with its reason`);
      }
    }
  }
  // The accepted differences are the ones the rules give reasons for, and no others.
  assert.deepEqual(record.accepted.map(a => a.why), ACCEPTED.map(a => a.why));
  assert.equal(record.summary.agree, record.summary.cases);
});
