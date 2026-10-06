import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { proposedDesignTokens } from '@mothership/design-tokens';
import { shellBreakpoints, shellCssVariables, shellTokenStylesheet } from '@mothership/game';

const css = readFileSync(new URL('../src/styles/shell.css', import.meta.url), 'utf8');
const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
const variables = shellCssVariables(proposedDesignTokens);

// WCAG 2 relative luminance and contrast ratio.
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(channel => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

test('token variables quote the Designer proposal exactly, in units that follow the reader’s font size', () => {
  assert.equal(proposedDesignTokens.status, 'proposal_for_evaluation');
  const expect = {
    '--ms-color-canvas': '#10141C', '--ms-color-panel': '#202837', '--ms-color-paper': '#F4EBDD', '--ms-color-ink': '#151923',
    '--ms-color-text': '#F4EBDD', '--ms-color-text-secondary': '#B9C4D3', '--ms-color-token': '#C6CDD4',
    '--ms-color-accent': '#F1B84B', '--ms-color-focus': '#FFD36D',
    '--ms-text-body': '1rem', '--ms-text-label': '0.875rem', '--ms-text-heading': '1.5rem', '--ms-text-display': '2.25rem',
    '--ms-leading-body': '1.5', '--ms-leading-heading': '1.15',
    '--ms-radius-control': '8px', '--ms-radius-panel': '12px',
    '--ms-stroke-control': '2px', '--ms-stroke-focus': '3px', '--ms-stroke-illustration': '3px',
    '--ms-target-min': '2.75rem',
    '--ms-motion-selection': '120ms', '--ms-motion-card': '220ms', '--ms-motion-reduced-fade': '80ms',
    '--ms-motion-stamp': '120ms', '--ms-motion-move': '450ms', '--ms-motion-round': '700ms', '--ms-motion-beat-max': '900ms',
    '--ms-space-1': '0.25rem', '--ms-space-4': '1rem', '--ms-space-7': '3rem',
  };
  for (const [name, value] of Object.entries(expect)) assert.equal(variables.get(name), value, name);
  assert.equal(variables.get('--ms-font-body'), proposedDesignTokens.type.bodyFamily);
  assert.equal([...variables.keys()].filter(name => name.startsWith('--ms-space-')).length, proposedDesignTokens.spacingPx.length);
  // The token for a public impact is in the proposal and is deliberately not made available
  // to any shipped rule: no approved fact says that an impact happened.
  assert.equal(proposedDesignTokens.motionMs.publicImpact, 320);
  assert.deepEqual([...variables.keys()].filter(name => /impact/i.test(name)), []);
  assert.deepEqual([...variables.keys()].filter(name => name.startsWith('--ms-motion-')).sort(), [
    '--ms-motion-beat-max', '--ms-motion-card', '--ms-motion-move', '--ms-motion-reduced-fade', '--ms-motion-round', '--ms-motion-selection', '--ms-motion-stamp',
  ]);
});

test('the token stylesheet is one :root rule that names the token version', () => {
  const sheet = shellTokenStylesheet(proposedDesignTokens);
  assert.match(sheet, /^\/\* Mothership design tokens 0\.2\.0 \(proposal for evaluation\) \*\/\n:root \{\n/);
  assert.equal(sheet.split('{').length, 2);
  assert.equal(sheet.trimEnd().endsWith('}'), true);
  for (const [name, value] of variables) assert.equal(sheet.includes(`  ${name}: ${value};\n`), true, name);
});

test('a numeric token must really be a number: a string in its place cannot reach the stylesheet', () => {
  const hostile = '8px; } * { display: none } .x { --y: 0';
  const cases = [
    tokens => ({ ...tokens, radiusPx: { ...tokens.radiusPx, control: hostile } }),
    tokens => ({ ...tokens, strokePx: { ...tokens.strokePx, focus: hostile } }),
    tokens => ({ ...tokens, type: { ...tokens.type, bodyLineHeight: hostile } }),
    tokens => ({ ...tokens, type: { ...tokens.type, displayPx: '36' } }),
    tokens => ({ ...tokens, motionMs: { ...tokens.motionMs, selection: hostile } }),
    tokens => ({ ...tokens, motionMs: { ...tokens.motionMs, reducedMotionFade: Number.NaN } }),
    tokens => ({ ...tokens, spacingPx: [4, hostile] }),
    tokens => ({ ...tokens, spacingPx: [4, -8] }),
    tokens => ({ ...tokens, interaction: { ...tokens.interaction, minimumTargetCssPx: Number.POSITIVE_INFINITY } }),
  ];
  for (const [index, change] of cases.entries()) {
    assert.throws(() => shellTokenStylesheet(change(proposedDesignTokens)), /not a non-negative number/, `case ${index}`);
  }
  assert.throws(() => shellBreakpoints({ ...proposedDesignTokens, interaction: { ...proposedDesignTokens.interaction, breakpointsCssPx: { expandedPlayerLayout: '600px) { * { display:none } } @media (min-width: 1', wideTableLayout: 960 } } }), /not a non-negative number/);
  assert.throws(() => shellTokenStylesheet({ ...proposedDesignTokens, color: { ...proposedDesignTokens.color, canvas: 16 } }), /not a plain CSS value/);
  assert.equal(shellTokenStylesheet(proposedDesignTokens).split('}').length, 2, 'the real tokens still produce exactly one rule');
});

test('a token value that is not a plain CSS value is refused instead of written into a stylesheet', () => {
  for (const hostile of ['#000; } body { display: none', 'red}', 'url(https://example.test/x)', 'a"b', "a'b", 'x\ny', '</style>']) {
    const tokens = { ...proposedDesignTokens, color: { ...proposedDesignTokens.color, canvas: hostile } };
    assert.throws(() => shellTokenStylesheet(tokens), /not a plain CSS value/, hostile);
  }
  assert.throws(() => shellTokenStylesheet({ ...proposedDesignTokens, version: '*/ body{}' }), /not a plain CSS value/);
});

test('the shell stylesheet takes every color and duration from a token variable', () => {
  assert.deepEqual(withoutComments.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [], [], 'literal hex color');
  assert.deepEqual(withoutComments.match(/\b(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(/g) ?? [], [], 'literal color function');
  assert.deepEqual(withoutComments.match(/(?<![\w.-])\d*\.?\d+m?s\b/g) ?? [], [], 'literal duration');
  const named = withoutComments.match(/:\s*(red|green|blue|white|yellow|orange|purple|gray|grey)\b/g) ?? [];
  assert.deepEqual(named, [], 'named color');
});

test('every custom property the stylesheet reads is defined by the tokens or by the stylesheet itself', () => {
  const declaredLocally = new Set([...withoutComments.matchAll(/(--ms-[a-z0-9-]+)\s*:/g)].map(match => match[1]));
  const used = new Set([...withoutComments.matchAll(/var\((--[a-z0-9-]+)/g)].map(match => match[1]));
  assert.equal(used.size > 20, true);
  for (const name of used) assert.equal(variables.has(name) || declaredLocally.has(name), true, `${name} is not defined`);
  for (const name of declaredLocally) assert.equal(variables.has(name), false, `${name} shadows a token`);
});

test('layout breakpoints are the two the tokens define, and both are used', () => {
  const breakpoints = shellBreakpoints(proposedDesignTokens);
  assert.deepEqual(breakpoints, { expandedPlayer: 600, wideTable: 960 });
  const used = [...withoutComments.matchAll(/min-width:\s*(\d+)px/g)].map(match => Number(match[1]));
  assert.deepEqual([...new Set(used)].sort((a, b) => a - b), [breakpoints.expandedPlayer, breakpoints.wideTable]);
  assert.deepEqual(withoutComments.match(/max-width:\s*\d+px/g) ?? [], [], 'no device-width ceilings');
});

test('reduced motion is honored for the device setting and for the in-app choice, and the choice wins', () => {
  assert.equal(proposedDesignTokens.motionMs.reducedMotionFade <= 80, true);
  const mediaStart = withoutComments.indexOf('@media (prefers-reduced-motion: reduce)');
  const attributeStart = withoutComments.indexOf('.ms-shell[data-motion="reduced"] *');
  assert.equal(mediaStart !== -1 && attributeStart > mediaStart, true);
  const media = withoutComments.slice(mediaStart, attributeStart);
  const attribute = withoutComments.slice(attributeStart, withoutComments.indexOf('@media (forced-colors: active)'));
  for (const block of [media, attribute]) {
    assert.match(block, /transition-duration: var\(--ms-motion-reduced-fade\) !important/);
    assert.match(block, /transition-property: opacity, border-color !important/);
    assert.match(block, /\.ms-private__panel \{\s*animation: ms-fade var\(--ms-motion-reduced-fade\) linear;/);
    assert.match(block, /\.ms-button:active \{\s*transform: none;/);
  }
  // Every rule under the device setting yields to an explicit "full" chosen in the app, so
  // unchecking "Reduce motion" really restores motion on a device that asks for less.
  const deviceSelectors = [...media.matchAll(/^\s*(\.ms-shell[^,{]*)[,{]/gm)].map(match => match[1].trim());
  assert.equal(deviceSelectors.length, 5);
  for (const selector of deviceSelectors) assert.equal(selector.startsWith('.ms-shell:not([data-motion="full"])'), true, selector);
  // The only keyframes that travel or scale are the ones reduced motion replaces.
  const moving = [...withoutComments.matchAll(/@keyframes (ms-[a-z-]+) \{([\s\S]*?)\n\}/g)].filter(match => /transform/.test(match[2])).map(match => match[1]);
  assert.deepEqual(moving, ['ms-reveal']);
});

test('controls meet the minimum target size and keep a visible two-tone focus ring', () => {
  assert.equal(proposedDesignTokens.interaction.minimumTargetCssPx, 44);
  for (const selector of ['.ms-button', '.ms-field__label', '.ms-details__summary', '.ms-seat']) {
    const rule = withoutComments.slice(withoutComments.indexOf(`${selector} {`));
    assert.match(rule.slice(0, rule.indexOf('}')), /min-height: var\(--ms-target-min\)/, selector);
  }
  assert.match(withoutComments, /\.ms-shell :focus-visible \{\s*outline: var\(--ms-stroke-focus\) solid var\(--ms-color-focus\);\s*outline-offset: 2px;\s*box-shadow: var\(--ms-halo\);/);
  assert.equal(/outline:\s*(none|0)/.test(withoutComments.replace(/\.ms-main:focus \{[^}]*\}/, '')), false, 'focus outlines are not removed from controls');
});

test('the token pairs the shells use meet WCAG AA contrast (tokens only; compositing is not certified here)', () => {
  const color = proposedDesignTokens.color;
  const text = [
    ['text on canvas', color.textPrimary, color.canvas], ['text on panel', color.textPrimary, color.panel],
    ['secondary text on canvas', color.textSecondary, color.canvas], ['secondary text on panel', color.textSecondary, color.panel],
    ['ink on paper', color.ink, color.paper], ['ink on amber', color.ink, color.interactiveAccent], ['ink on token', color.ink, color.publicToken],
  ];
  for (const [name, foreground, background] of text) assert.equal(contrast(foreground, background) >= 4.5, true, `${name}: ${contrast(foreground, background).toFixed(2)}`);
  const nonText = [
    ['focus ring on canvas', color.focusRing, color.canvas], ['focus ring on panel', color.focusRing, color.panel],
    ['ink halo on paper', color.ink, color.paper], ['amber marker on panel', color.interactiveAccent, color.panel],
    ['token on panel', color.publicToken, color.panel],
  ];
  for (const [name, foreground, background] of nonText) assert.equal(contrast(foreground, background) >= 3, true, `${name}: ${contrast(foreground, background).toFixed(2)}`);
  // Why the ring needs its ink halo: amber alone does not separate from paper.
  assert.equal(contrast(color.focusRing, color.paper) < 3, true);
});

test('layout survives a narrow screen with enlarged text: found broken in a browser, kept fixed here', () => {
  const rule = selector => {
    const start = withoutComments.indexOf(`${selector} {`);
    assert.notEqual(start, -1, selector);
    return withoutComments.slice(start, withoutComments.indexOf('}', start));
  };
  // Display lettering follows the reader's font size but is capped so one word fits the screen.
  assert.match(rule('.ms-shell'), /--ms-text-display-fit: min\(var\(--ms-text-display\), \d+vw\);/);
  assert.match(rule('.ms-shell'), /--ms-text-wordmark-fit: min\(var\(--ms-text-display\), \d+vw\);/);
  assert.deepEqual(withoutComments.match(/font-size: var\(--ms-text-display\);/g) ?? [], [], 'display size is always used through a fitted variable');
  assert.equal(rule('.ms-shell').includes('font-size: var(--ms-text-body)'), true, 'body text is never capped');
  // Grid children may shrink below their longest word instead of widening the page.
  const shrinkable = /\.ms-main > \*,([\s\S]*?)\{\s*min-width: 0;/.exec(withoutComments);
  assert.notEqual(shrinkable, null);
  for (const selector of ['.ms-card > *', '.ms-card__state > *', '.ms-actions > *', '.ms-target > *']) assert.equal(shrinkable[0].includes(selector), true, selector);
  // Found in a browser at 320 px with text doubled: four nested boxes each took a full, doubled
  // side padding and left 50 px for a button's label, which then broke inside every word.
  // Side padding is capped by the screen's width wherever boxes nest.
  assert.match(rule('.ms-shell'), /--ms-inset: min\(var\(--ms-space-4\), \d+vw\);/);
  for (const selector of ['.ms-panel', '.ms-phase', '.ms-button']) assert.match(rule(selector), /padding: var\(--ms-space-\d\) var\(--ms-inset\);/, selector);
  assert.match(rule('.ms-card,\n.ms-role-card'), /padding: var\(--ms-space-4\) var\(--ms-inset\);/);
  for (const selector of ['.ms-header', '.ms-banner', '.ms-main', '.ms-footer']) assert.match(rule(selector), /max\(var\(--ms-inset\), env\(safe-area-inset-right\)\)[^;]*max\(var\(--ms-inset\), env\(safe-area-inset-left\)\)/, selector);
  // The role is one word of up to ten letters inside a panel and a card: it takes the tighter fit.
  assert.match(withoutComments, /\n\.ms-role-card \{[^}]*font-size: var\(--ms-text-wordmark-fit\);/);
  // Breaking anywhere made table columns split words mid-word; it is confined to identifiers.
  assert.equal(rule('.ms-shell').includes('overflow-wrap: break-word'), true);
  assert.deepEqual([...withoutComments.matchAll(/([^{}]+)\{[^{}]*overflow-wrap: anywhere/g)].map(match => match[1].trim()), ['.ms-details__list dd']);
  assert.match(rule('.ms-shell--table .ms-roster'), /overflow-x: auto/);
});

test('the element reset cannot out-rank a component class', () => {
  // Found in a browser: a reset written as ".ms-shell p" beat ".ms-notice" and silently
  // removed the padding of every paragraph-based chip, notice and card.
  assert.match(withoutComments, /:where\(\.ms-shell\) :where\(p, h1, h2, h3, h4, ul, dl, dd\) \{\s*margin: 0;\s*padding: 0;/);
  assert.deepEqual(withoutComments.match(/\.ms-shell (p|h[1-6]|ul|dl|dd)\b[^{]*\{/g) ?? [], []);
});

test('the stylesheet respects safe areas, user font size and forced colors', () => {
  for (const edge of ['top', 'right', 'bottom', 'left']) assert.equal(withoutComments.includes(`env(safe-area-inset-${edge})`), true, edge);
  assert.equal(/font-size:\s*\d+px/.test(withoutComments), false, 'type sizes are not fixed in pixels');
  assert.equal(withoutComments.includes('@media (forced-colors: active)'), true);
  assert.equal(withoutComments.includes('font-variant-numeric: tabular-nums'), true);
  assert.equal(/user-scalable|maximum-scale/.test(css), false);
});

test('a control that is not active yet looks it, and a picked-up card cannot be taken for keyboard focus', () => {
  const rule = selector => {
    const start = withoutComments.indexOf(`${selector} {`);
    assert.notEqual(start, -1, selector);
    return withoutComments.slice(start, withoutComments.indexOf('}', start));
  };
  // Found in review: a control drawn where the last one was pressed swallowed the second tap
  // of a double tap with nothing to show for it.
  const inactive = rule('.ms-button[aria-disabled="true"]');
  assert.match(inactive, /opacity: 0\.\d+;/);
  assert.match(inactive, /box-shadow: none;/);
  // Found in review: an amber outline on the selected card read as the focus ring on something not focused.
  const selected = rule('.ms-card:has(> .ms-card__state[data-selected="true"])');
  assert.equal(/outline/.test(selected), false);
  assert.equal(selected.includes('--ms-color-accent'), false);
  assert.equal(selected.includes('--ms-color-focus'), false);
});

// The cue stylesheet: placeholder treatments for the cues the event director issues.
const cues = readFileSync(new URL('../src/styles/cues.css', import.meta.url), 'utf8');
const cueCss = cues.replace(/\/\*[\s\S]*?\*\//g, '');
/** Every style rule as [selectors, declarations], media blocks flattened, keyframes left out. */
function styleRules(text) {
  const withoutKeyframes = text.replace(/@keyframes [a-z-]+ \{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  const flattened = withoutKeyframes.replace(/@media[^{]*\{((?:[^{}]*\{[^{}]*\})*)[^{}]*\}/g, '$1');
  return [...flattened.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match => [match[1].split(',').map(selector => selector.trim()), match[2]]);
}
const keyframes = text => new Map([...text.matchAll(/@keyframes ([a-z-]+) \{((?:[^{}]*\{[^{}]*\})*)[^{}]*\}/g)].map(match => [match[1], match[2]]));
/** Specificity as [ids, classes and attributes and pseudo-classes, elements and pseudo-elements]. */
function specificity(selector) {
  const inner = selector.replace(/:not\(([^)]*)\)/g, ' $1 ');
  const b = (inner.match(/\.[a-z_-]+|\[[^\]]+\]|:(?!:)[a-z-]+/g) ?? []).length;
  const c = (inner.replace(/\[[^\]]+\]/g, '').match(/::[a-z-]+|(?:^|[\s>+~])[a-z][a-z0-9]*/g) ?? []).length;
  return [(inner.match(/#[a-z_-]+/g) ?? []).length, b, c];
}
const outranks = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const CUE_KINDS = ['phase-change', 'public-move', 'registration', 'round-transition', 'status-change'];

test('the cue stylesheet says in its first lines that it is placeholder motion, not approved art', () => {
  assert.match(cues, /^\/\* Mothership cue treatments[\s\S]*?PLACEHOLDER MOTION[\s\S]*?not approved art/);
  assert.equal(cues.includes('mothership:dev-only'), false, 'It is a stylesheet of the client, not of the harness');
});

test('nothing in the cue stylesheet starts by itself: every rule needs the mark a renderer puts on an element', () => {
  const rules = styleRules(cueCss);
  assert.equal(rules.length > 12, true);
  for (const [selectors] of rules) for (const selector of selectors) assert.match(selector, /\[data-cue(=|\])/, selector);
  assert.equal(/!important/.test(cueCss), false);
  assert.equal(/infinite|animation-iteration-count|animation-delay|animation-direction/.test(cueCss), false, 'No cue loops, waits or runs backwards');
});

test('the cue stylesheet styles the five cues the director can issue and no other', () => {
  const styled = new Set([...cueCss.matchAll(/\[data-cue="([a-z-]+)"\]/g)].map(match => match[1]));
  assert.deepEqual([...styled].sort(), CUE_KINDS);
  // Nor is there a treatment under another name: these are all the animations and all the
  // classes the stylesheet knows.
  assert.deepEqual([...keyframes(cueCss).keys()].sort(), ['ms-cue-arrive', 'ms-cue-fade', 'ms-cue-heading', 'ms-cue-lit', 'ms-cue-mark', 'ms-cue-rule', 'ms-cue-stamp', 'ms-cue-trail']);
  assert.deepEqual([...new Set(cueCss.match(/\.[a-z][a-z_-]+(?=[\s\[:{,.])/g) ?? [])].sort(), ['.ms-phase__round', '.ms-shell']);
  assert.equal(/url\(|@import|@font-face/.test(cueCss), false, 'It loads nothing');
});

test('the cue stylesheet takes every color and duration from a token variable, and no cue outlasts the longest beat', () => {
  assert.deepEqual(cueCss.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [], [], 'literal hex color');
  assert.deepEqual(cueCss.match(/\b(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(/g) ?? [], [], 'literal color function');
  assert.deepEqual(cueCss.match(/(?<![\w.-])\d*\.?\d+m?s\b/g) ?? [], [], 'literal duration');
  const used = new Set([...cueCss.matchAll(/var\((--[a-z0-9-]+)/g)].map(match => match[1]));
  for (const name of used) assert.equal(variables.has(name), true, `${name} is not a token variable`);
  assert.deepEqual(cueCss.match(/(--[a-z0-9-]+)\s*:/g) ?? [], [], 'It declares no variable of its own');

  // Every animation names its duration as a token, and each of those is within the longest beat.
  const durations = [...cueCss.matchAll(/animation:\s*[a-z-]+\s+([^\s;]+)/g)].map(match => match[1]);
  assert.equal(durations.length >= 10, true);
  const longest = proposedDesignTokens.motionMs.comicBeatMaximum;
  for (const duration of durations) {
    const name = /^var\((--ms-motion-[a-z-]+)\)$/.exec(duration)?.[1];
    assert.notEqual(name, undefined, `${duration} is not a motion token`);
    assert.equal(Number.parseFloat(variables.get(name)) <= longest, true, name);
  }
});

test('a cue animates only how an element looks, never where it sits or how big it is', () => {
  const allowed = new Set(['opacity', 'transform', 'color', 'background-color', 'box-shadow']);
  const frames = keyframes(cueCss);
  assert.equal(frames.size >= 7, true);
  for (const [name, body] of frames) {
    for (const [, property] of body.matchAll(/([a-z-]+)\s*:/g)) assert.equal(allowed.has(property), true, `${name} animates ${property}`);
  }
  // Outside keyframes, a marked element gains at most a positioning context for its layers.
  const layoutProperties = /\b(width|height|margin|padding|font-size|letter-spacing|line-height|display|flex|grid|gap|border(?!-radius))[a-z-]*\s*:/;
  for (const [selectors, declarations] of styleRules(cueCss)) {
    if (selectors.some(selector => /::(before|after)/.test(selector))) continue;
    assert.equal(layoutProperties.test(declarations), false, `${selectors[0]} changes layout`);
  }
});

test('layers a cue draws beside an element hold no text and take no pointer events', () => {
  const contents = [...cueCss.matchAll(/content:\s*([^;]+);/g)].map(match => match[1].trim());
  assert.equal(contents.length >= 4, true);
  for (const content of contents) assert.equal(content === '""' || content === 'none', true, `content: ${content}`);
  for (const [selectors, declarations] of styleRules(cueCss)) {
    if (!selectors.some(selector => /::(before|after)/.test(selector)) || !/content:\s*""/.test(declarations)) continue;
    assert.match(declarations, /pointer-events:\s*none/, selectors[0]);
    assert.match(declarations, /position:\s*absolute/, selectors[0]);
  }
});

test('reduced motion replaces every cue with the short fade, for the device setting and for the in-app choice, and outranks every treatment', () => {
  const rules = styleRules(cueCss);
  const isReducedMotion = selector => selector.includes('[data-motion="reduced"]') || selector.includes(':not([data-motion="full"])');
  const isReducedEffects = selector => selector.includes('[data-effects="reduced"]');
  const treatments = rules.flatMap(([selectors]) => selectors).filter(selector => !isReducedMotion(selector) && !isReducedEffects(selector));
  const strongest = part => treatments.filter(selector => /::(before|after)/.test(selector) === part).map(specificity).sort(outranks).at(-1);

  for (const form of ['.ms-shell[data-motion="reduced"]', '.ms-shell:not([data-motion="full"])']) {
    const elements = rules.filter(([selectors]) => selectors.every(selector => selector.startsWith(form) && !/::/.test(selector)));
    const layers = rules.filter(([selectors]) => selectors.every(selector => selector.startsWith(form) && /::(before|after)/.test(selector)));
    assert.equal(elements.length, 1, form);
    assert.equal(layers.length, 1, form);
    assert.match(elements[0][1], /^\s*animation: ms-cue-fade var\(--ms-motion-reduced-fade\) linear;\s*$/);
    assert.match(layers[0][1], /^\s*content: none;\s*$/);
    for (const selector of elements[0][0]) assert.equal(outranks(specificity(selector), strongest(false)) >= 0, true, `${selector} does not outrank every treatment`);
    for (const selector of layers[0][0]) assert.equal(outranks(specificity(selector), strongest(true)) >= 0, true, `${selector} does not outrank every layer`);
    // Every animated part of a cue is covered: the marked element, and the heading inside it.
    assert.deepEqual(elements[0][0].map(selector => selector.slice(form.length).trim()).sort(), ['[data-cue]', '[data-cue] .ms-phase__round']);
  }
  // The device setting applies only until the player has chosen in the app.
  assert.match(cueCss, /@media \(prefers-reduced-motion: reduce\) \{\s*\.ms-shell:not\(\[data-motion="full"\]\)/);
  assert.equal(cueCss.indexOf('@media (prefers-reduced-motion: reduce)') > cueCss.lastIndexOf('@keyframes'), true, 'The reduced rules come last');
  // The fade travels nowhere and scales nothing; every other keyframe set either moves or is a layer's.
  assert.match(keyframes(cueCss).get('ms-cue-fade'), /^\s*from \{\s*opacity: 0\.\d+;\s*\}\s*$/);
  // The only child animated by a cue is the round heading, which is why it is named above.
  const animatedChildren = treatments.filter(selector => /\[data-cue[^\]]*\]\s+\S/.test(selector));
  assert.deepEqual(animatedChildren, ['.ms-shell [data-cue="round-transition"] .ms-phase__round']);
});

test('reduced effects drops the layers and the shadow and keeps the motion; it is a separate setting', () => {
  const rules = styleRules(cueCss).filter(([selectors]) => selectors.some(selector => selector.includes('[data-effects="reduced"]')));
  assert.equal(rules.length, 2);
  const [layers, status] = rules;
  assert.match(layers[1], /^\s*content: none;\s*$/);
  assert.match(status[1], /^\s*animation-name: ms-cue-fade;\s*$/);
  assert.equal(/box-shadow/.test(keyframes(cueCss).get('ms-cue-fade')), false);
  // Nothing under reduced effects mentions the motion setting, and the reverse.
  assert.equal(rules.flatMap(([selectors]) => selectors).some(selector => selector.includes('data-motion')), false);
});

test('the status outline is paper, not the amber of the focus ring, and a registration stamp has no layer at all', () => {
  const mark = keyframes(cueCss).get('ms-cue-mark');
  assert.match(mark, /box-shadow:[^;]*var\(--ms-color-text\)/);
  assert.equal(/--ms-color-(accent|focus)/.test(mark), false);
  const stampLayers = styleRules(cueCss).flatMap(([selectors]) => selectors).filter(selector => selector.includes('"registration"') && /::/.test(selector));
  assert.deepEqual(stampLayers, []);
});

test('picking a card up is a transition on the card itself, timed by the selection token', () => {
  const start = withoutComments.indexOf('.ms-card {\n  transition:');
  assert.notEqual(start, -1);
  assert.match(withoutComments.slice(start, withoutComments.indexOf('}', start)), /transition: transform var\(--ms-motion-selection\) ease-out, box-shadow var\(--ms-motion-selection\) ease-out;/);
});
