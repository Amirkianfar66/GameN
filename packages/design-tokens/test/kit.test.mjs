// The phone interface's shared kit (design/phone-ui/components/kit): the one look and behaviour every
// Designer component's controls share. Its module graph, the scope of its styles and its values against the
// pinned pack's kit.css are checked here, and last the record of design/tools/kit-check.mjs, which draws every
// builder beside the pack's in a browser under the production headers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUTTON_KINDS, CELL_STATES, COMPONENT_KIT_VERSION, PILL_TONES, ROW_TINTS, STAMP_TONES, TILE_STATES, followTextSize, seatNumber } from '../../../design/phone-ui/components/kit/kit.mjs';
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
  assert.equal(COMPONENT_KIT_VERSION, 'component-kit-0.9.0', 'not the #121 phone kit (phone-kit-0.1.0)');
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
    'radius-group': 'radius-group', target: 'target', font: 'font-ui', letter: 'font-letter', 't-card': 't-card',
    // The teams' colours (0.8.0), for a view that may show a team.
    'faction-blue': 'faction-blue', 'faction-red': 'faction-red', 'faction-alien': 'faction-alien' };
  for (const [k, p] of Object.entries(same)) assert.equal(kit[`--ms-k-${k}`], pack[`--${p}`], `--ms-k-${k} is the pack's --${p}`);
  assert.equal(kit['--ms-k-on-accent'], '#151923', 'on-accent is the pack\'s ink');
  for (const kind of BUTTON_KINDS) assert.match(PACK_CSS, new RegExp(`\\.btn-${kind} \\{`), `the pack has .btn-${kind}`);
  for (const state of CELL_STATES.filter(s => s !== 'available')) assert.match(PACK_CSS, new RegExp(`\\.cell\\[data-state="${state}"\\]`), `the pack draws a ${state} cell`);
  for (const tone of STAMP_TONES.filter(Boolean)) assert.match(PACK_CSS, new RegExp(`\\.stamp\\[data-tone="${tone}"\\]`), `the pack has a ${tone} stamp`);
  for (const tone of PILL_TONES.filter(Boolean)) assert.match(PACK_CSS, new RegExp(`\\.pill\\[data-tone="${tone}"\\]`), `the pack has a ${tone} pill`);
  for (const tint of ROW_TINTS.filter(Boolean)) assert.match(PACK_CSS, new RegExp(`\\.row-icon\\[data-tint="${tint}"\\]`), `the pack has a ${tint} row icon`);
  // The tile's states (0.6.0) are the pack's screens.css ones; sending is its submitting.
  for (const state of TILE_STATES.filter(s => s !== 'available')) assert.match(SCREENS_CSS, new RegExp(`\\.tile\\[data-state="${state === 'sending' ? 'submitting' : state}"\\]`), `the pack draws a ${state} tile`);
  // An unavailable tile fades the art the kit draws from markup, as sheet 25 fades its one picture, and never a
  // picture node the component draws for its state (0.7.2; the pack's unavailable Eject plate is its own drawing).
  assert.ok(KIT_CSS.includes('.ms-kit :where(.ms-k-tile[data-state="unavailable"] .ms-k-tile-art:not([data-node])) { opacity: 0.35; filter: grayscale(1); }'));
  assert.equal(KIT_CSS.match(/\.ms-k-tile-art[^{]*\{[^}]*(?:opacity|filter)/g)?.length, 1, 'one rule fades a tile\'s art');
  // On glass, the pack's lighter greys.
  assert.ok(KIT_CSS.includes('.ms-kit :where([data-ms-surface="glass"], [data-ms-surface="glass"] .ms-kit) { --ms-k-text-2: #DCE3EC; --ms-k-text-3: #D3DBE5; }'), 'on glass, and in a component root on glass');
  assert.match(PACK_CSS, /--text-secondary: #DCE3EC; --text-tertiary: #D3DBE5;/);
  assert.equal(seatNumber({ seat: 'seat-7' }), 7);
});

test('its toast is the pack\'s .toast at its owner\'s bar foot, with the shell\'s drop and fade (0.8.0), and words that wrap inside the phone (0.8.2)', () => {
  const block = (css, selector) => { const start = css.indexOf(`${selector} {`); assert.ok(start >= 0, selector); return css.slice(start + selector.length + 2, css.indexOf('}', start)); };
  const declarations = body => Object.fromEntries(body.split(';').map(d => d.trim()).filter(Boolean).map(d => [d.slice(0, d.indexOf(':')).trim(), d.slice(d.indexOf(':') + 1).trim()]));
  const pack = declarations(block(PACK_CSS, '.toast')), kit = declarations(block(KIT_CSS, '.ms-kit :where(.ms-k-toast)'));
  const as = { 'calc(var(--top) + 10px)': 'calc(var(--ms-k-toast-top, 0px) + 10px)', 'var(--paper)': 'var(--ms-k-paper)', 'var(--ink)': 'var(--ms-k-ink)',
    '600 0.9375rem/1.2 var(--font-ui)': '600 0.9375rem/1.2 var(--ms-k-font)', 'var(--shadow-soft)': tokens(PACK_CSS, ':root')['--shadow-soft'] };
  // Its own since 0.8.2: words too long for one line wrap, and its corners are as round as a one-line toast's ends (the
  // pack's pill on one line). Every other declaration of the pack's is the kit's.
  const own = new Set(['white-space', 'border-radius']);
  for (const [key, value] of Object.entries(pack)) if (!own.has(key)) assert.equal(kit[key], as[value] ?? value, `the toast's ${key} is the pack's`);
  assert.equal(pack['white-space'], 'nowrap');
  assert.equal(pack['border-radius'], '999px');
  assert.equal(kit['white-space'], 'normal');
  assert.equal(kit['border-radius'], 'calc(max(20px, 1.2em) / 2 + 9px)');
  assert.equal(kit.width, 'max-content');
  assert.ok(KIT_CSS.includes('.ms-kit :where(.ms-k-toast-text) { text-align: start; overflow-wrap: anywhere; }'), 'its words wrap anywhere, so no word runs past the phone');
  assert.doesNotMatch(KIT_CSS, /\.ms-k-toast-text\) \{[^}]*text-overflow/, 'its words are not cut');
  assert.match(PACK_CSS, /\.toast \.ic \{ width: 20px; height: 20px; \}/);
  assert.ok(KIT_CSS.includes('.ms-kit :where(.ms-k-toast .ms-k-ic) { width: 20px; height: 20px; }'));
  // Its own: inside the phone, no tap (it has no action), the shell's drop and fade (since 0.1.0) and its 80 ms fade
  // with Reduce motion.
  assert.equal(kit['max-width'], 'calc(100% - 32px)');
  assert.equal(kit['pointer-events'], 'none');
  assert.equal(kit.animation, 'ms-k-toast-in 220ms cubic-bezier(0.16, 0.84, 0.3, 1) both');
  assert.equal(kit.transition, 'opacity 180ms linear');
  assert.ok(KIT_CSS.includes('@keyframes ms-k-toast-in { from { opacity: 0; transform: translate(-50%, -8px); } }'));
  assert.ok(KIT_CSS.includes('.ms-kit:where([data-motion="reduced"]) :where(.ms-k-toast) { animation: ms-k-fade 80ms linear both; }'));
  assert.ok(KIT_CSS.includes('@media (prefers-reduced-motion: reduce) { .ms-kit :where(.ms-k-toast) { animation: ms-k-fade 80ms linear both; } }'));
  // The shell draws its toast with the kit's and only places it: no second look.
  const shell = read('design/phone-ui/components/phone-shell/phone-shell.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(shell.includes('.ms-phone-shell .ms-ps-toast { --ms-k-toast-top: var(--ms-ps-over-top); }'), 'the shell sets the toast\'s top to its overlays\' place');
  assert.doesNotMatch(shell, /\.ms-ps-toast[^{]*\{[^}]*(?:background|padding|font|animation:|opacity|[{;]\s*top:|pointer-events)/, 'the shell draws no second look for its toast');
  assert.match(read('design/phone-ui/components/phone-shell/phone-shell.mjs'), /kit\.toast\(props\)/);
});

test('followTextSize (0.8.1): a hidden 1 em box, and the root\'s container set up again once for each change of its text size', () => {
  // A stand-in for the browser: what the root's style is when its layout is read, and what the box's observer reports.
  let observed = null, disconnected = false;
  const seen = [];
  const style = { props: new Map(),
    getPropertyValue(name) { return this.props.get(name)?.[0] ?? ''; }, getPropertyPriority(name) { return this.props.get(name)?.[1] ?? ''; },
    setProperty(name, value, priority = '') { this.props.set(name, [value, priority]); }, removeProperty(name) { this.props.delete(name); } };
  const doc = { createElement: tag => ({ tag, className: '', attrs: {}, parentNode: null, setAttribute(k, v) { this.attrs[k] = v; }, remove() { if (this.parentNode) this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1); this.parentNode = null; } }),
    defaultView: { ResizeObserver: class { constructor(fn) { observed = fn; } observe(node) { this.node = node; } disconnect() { disconnected = true; } } } };
  const root = { ownerDocument: doc, style, children: [], append(node) { node.parentNode = this; this.children.push(node); },
    get offsetWidth() { seen.push(style.getPropertyValue('container-type') || null); return 390; } };
  const report = height => observed([{ contentRect: { height } }]);
  const watch = followTextSize(root);
  const box = root.children[0];
  assert.equal(box.className, 'ms-k-em');
  assert.equal(box.attrs['aria-hidden'], 'true');
  report(16);
  assert.deepEqual(seen, [], 'the first size sets nothing up again');
  report(32);
  assert.deepEqual(seen, ['normal'], 'off for one layout');
  assert.equal(style.getPropertyValue('container-type'), '', 'then as its style has it');
  report(32);
  assert.deepEqual(seen, ['normal'], 'the same size: nothing');
  style.setProperty('container-type', 'size', 'important');
  report(24);
  assert.deepEqual(seen, ['normal', 'normal']);
  assert.deepEqual([style.getPropertyValue('container-type'), style.getPropertyPriority('container-type')], ['size', 'important'], 'a root\'s own inline value comes back');
  box.remove();
  report(0);
  assert.equal(box.parentNode, root, 'a root that dropped its children gets its box back');
  assert.deepEqual(seen, ['normal', 'normal'], 'without setting anything up');
  watch.dispose();
  watch.dispose();
  assert.ok(disconnected && box.parentNode === null, 'dispose() stops watching and takes the box away, once');
  report(48);
  assert.deepEqual(seen, ['normal', 'normal'], 'and nothing happens after it');
  assert.throws(() => followTextSize(null), TypeError);
  // The box is 1 em tall and never seen or tapped.
  const rule = KIT_CSS.match(/\.ms-kit :where\(\.ms-k-em\) \{([^}]*)\}/)?.[1] ?? '';
  for (const part of ['position: absolute', 'width: 0', 'height: 1em', 'visibility: hidden', 'pointer-events: none']) assert.ok(rule.includes(part), part);
});

test('its comparison with the pack is development only: the pages, the cases, the rules and the tools', () => {
  for (const path of ['cases.mjs', 'compare.mjs', 'page.mjs'].map(f => `design/phone-ui/components/kit/preview/${f}`).concat(['design/tools/kit-check.mjs', 'design/tools/lib/component-check.mjs'])) {
    assert.match(read(path), /^\/\/ mothership:dev-only/, path);
  }
  for (const page of ['pack', 'kit']) assert.match(read(`design/phone-ui/components/kit/preview/${page}.html`), /^<!doctype html>\n<!-- mothership:dev-only/, page);
  // Each half loads only its own styles: the pack's page the pack's, the kit's page the kit's and the shell's.
  assert.deepEqual([...read('design/phone-ui/components/kit/preview/pack.html').matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]), ['../../../prototype/kit.css', '../../../prototype/screens.css']);
  assert.deepEqual([...read('design/phone-ui/components/kit/preview/kit.html').matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]), ['../kit.css', '../../phone-shell/phone-shell.css']);
  assert.ok(ACCEPTED.every(a => a.why.length > 40 && (a.any === true ? !a.keys && /owner\'s decision of 19 November 2026/.test(a.why) : a.keys.length > 0)), 'every accepted difference says why');
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

// Kit 0.9.0, the panels' icons. The owner, 19 November 2026: "I like painted icons but I dont want them to have any
// background"; "I want all size of Icons on these panels to be the same follow the size of action panel 3 column
// matrix"; "Still they  have a background"; then, on draft 3, "No background now, go ahead".
test('a panel\'s icon is the painted line drawing at one size with nothing behind it; an Actions cell has no frame (0.9.0)', () => {
  const css = readFileSync(join(REPO, 'design/phone-ui/components/kit/kit.css'), 'utf8');
  const source = readFileSync(join(REPO, 'design/phone-ui/components/kit/kit.mjs'), 'utf8');
  // One painter, always the open form; a tile, a row and a check sheet's head all use it, and no row keeps a tinted chip.
  assert.match(source, /iconPaintedSvg\(name, \{ className: 'ms-k-paint', open: true \}\)/);
  assert.equal([...source.matchAll(/iconPaintedSvg\(/g)].length, 1, 'one painter');
  assert.match(source, /setPaint\(glyph, props\.icon, state === 'unavailable' \|\| state === 'spent' \? 'off' : 'on'\)/);
  assert.match(source, /lead\.removeAttribute\('data-tint'\);\n\s+setPaint\(lead, props\.icon, 'on'\);/);
  assert.match(source, /if \(form === 'icon'\) setPaint\(lead, props\.icon, 'on'\)/);
  // One size, 46 px, and no fill, corner or shadow on any holder.
  assert.match(css, /:where\(\.ms-k-tile-icon\[data-paint\], \.ms-k-row-icon\[data-paint\], \.ms-k-who-lead\[data-form="icon"\]\[data-paint\], \.ms-k-btn-icon\[data-paint\]\) \{ width: 46px; height: 46px; background: none; border-radius: 0; box-shadow: none; \}/);
  // A row keeps its 52 px: the icon's box overhangs the padding by as much as it is taller than the old chip's room.
  assert.match(css, /:where\(\.ms-k-row-icon\[data-paint\]\) \{ position: relative; margin: -4px -5px; \}/);
  // Not now is the same drawing greyed, and it keeps its words (the tile's note); never colour alone.
  assert.match(css, /:where\(\[data-paint="off"\] > \.ms-k-paint\) \{ filter: grayscale\(1\) brightness\(1\.25\); opacity: 0\.85; \}/, 'greyed, and 3 : 1 from the glass');
  // The frameless cell: only a tile with an icon (a card's art keeps its card), and each state has a cue that is no ground.
  assert.match(css, /:where\(\.ms-k-tile:has\(> \.ms-k-tile-icon\[data-paint\]\)\) \{ background: none; box-shadow: none; \}/);
  assert.match(css, /\[data-state="selected"\]:has\(> \.ms-k-tile-icon\[data-paint\]\) \.ms-k-tile-name\) \{ text-decoration: underline 2px var\(--ms-k-accent\); text-underline-offset: 5px; \}/);
  assert.match(css, /\[data-state="sending"\] \.ms-k-tile-icon\[data-paint\]\)::after \{ border-color: var\(--ms-k-paper\); border-right-color: transparent; \}/);
  assert.match(css, /:where\(\.ms-k-tile:focus-visible\) \{ outline: 3px solid #FFD36D; outline-offset: 2px; \}/, 'the focus outline is the cell\'s');
  assert.match(css, /\.ms-k-tile\) \{\n\s+position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; min-height: 104px;/, 'the press area is the whole cell');
});

test('0.9.0: a tile can wait for an answer; the dark button has an edge and the weighty button a paper fill', () => {
  const css = readFileSync(join(REPO, 'design/phone-ui/components/kit/kit.css'), 'utf8');
  const source = readFileSync(join(REPO, 'design/phone-ui/components/kit/kit.mjs'), 'utf8');
  assert.match(source, /glyph\.toggleAttribute\('data-waiting', props\.waiting === true\);/);
  assert.match(css, /\.ms-k-tile-icon\[data-paint\]\[data-waiting\]:not\(\[data-paint="off"\]\)\)::after \{ content: ""; position: absolute;/);
  assert.match(css, /:where\(\.ms-k-btn-secondary\) \{ box-shadow: inset 0 0 0 1\.5px rgba\(255, 255, 255, 0\.34\); \}/);
  assert.match(css, /:where\(\[data-ms-surface="glass"\] \.ms-k-btn-secondary\) \{ background: rgba\(8, 11, 18, 0\.42\); box-shadow: inset 0 0 0 1\.5px rgba\(255, 255, 255, 0\.62\); \}/);
  assert.match(css, /:where\(\.ms-k-btn-warn\) \{ background: var\(--ms-k-paper\); color: var\(--ms-k-ink\);/);
  // The glass itself is as the owner set it on 10 November: nothing here changes it.
  assert.doesNotMatch(css.slice(css.indexOf('The panels\' painted icons')), /--ms-k-glass-fill\s*:/);
});
