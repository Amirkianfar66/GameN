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
    '--ms-space-1': '0.25rem', '--ms-space-4': '1rem', '--ms-space-7': '3rem',
  };
  for (const [name, value] of Object.entries(expect)) assert.equal(variables.get(name), value, name);
  assert.equal(variables.get('--ms-font-body'), proposedDesignTokens.type.bodyFamily);
  assert.equal([...variables.keys()].filter(name => name.startsWith('--ms-space-')).length, proposedDesignTokens.spacingPx.length);
});

test('the token stylesheet is one :root rule that names the token version', () => {
  const sheet = shellTokenStylesheet(proposedDesignTokens);
  assert.match(sheet, /^\/\* Mothership design tokens 0\.2\.0 \(proposal for evaluation\) \*\/\n:root \{\n/);
  assert.equal(sheet.split('{').length, 2);
  assert.equal(sheet.trimEnd().endsWith('}'), true);
  for (const [name, value] of variables) assert.equal(sheet.includes(`  ${name}: ${value};\n`), true, name);
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

test('reduced motion is honored for the device setting and for the in-app choice alike', () => {
  assert.equal(proposedDesignTokens.motionMs.reducedMotionFade <= 80, true);
  const media = withoutComments.slice(withoutComments.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.equal(media.length > 0 && withoutComments.includes('@media (prefers-reduced-motion: reduce)'), true);
  for (const block of [media.slice(0, media.indexOf('.ms-shell[data-motion="reduced"]')), withoutComments.slice(withoutComments.indexOf('.ms-shell[data-motion="reduced"]'))]) {
    assert.match(block, /transition-duration: var\(--ms-motion-reduced-fade\) !important/);
    assert.match(block, /transition-property: opacity, border-color !important/);
    assert.match(block, /\.ms-role__panel \{\s*animation: ms-fade var\(--ms-motion-reduced-fade\) linear;/);
    assert.match(block, /\.ms-button:active \{\s*transform: none;/);
  }
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
  assert.match(withoutComments, /\.ms-main > \*,[\s\S]*?\.ms-card > \* \{\s*min-width: 0;/);
  // Breaking anywhere made table columns split words mid-word; it is confined to identifiers.
  assert.equal(rule('.ms-shell').includes('overflow-wrap: break-word'), true);
  assert.deepEqual([...withoutComments.matchAll(/([^{}]+)\{[^{}]*overflow-wrap: anywhere/g)].map(match => match[1].trim()), ['.ms-details__list dd']);
  assert.match(rule('.ms-shell--table .ms-roster'), /overflow-x: auto/);
});

test('the stylesheet respects safe areas, user font size and forced colors', () => {
  for (const edge of ['top', 'right', 'bottom', 'left']) assert.equal(withoutComments.includes(`env(safe-area-inset-${edge})`), true, edge);
  assert.equal(/font-size:\s*\d+px/.test(withoutComments), false, 'type sizes are not fixed in pixels');
  assert.equal(withoutComments.includes('@media (forced-colors: active)'), true);
  assert.equal(withoutComments.includes('font-variant-numeric: tabular-nums'), true);
  assert.equal(/user-scalable|maximum-scale/.test(css), false);
});
