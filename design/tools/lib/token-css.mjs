// Turns the token file into CSS custom properties for the Designer's own review pages.
//
// The first block uses the names Frontend's shellCssVariables() gives the 0.2.0 tokens
// (apps/game/src/styles/tokens-css.ts on the Frontend branches), so a rule written here
// reads the same in Frontend's stylesheet. The second block is the names PROPOSED for what
// 0.3.0 adds, and it lists only the ones a reference stylesheet or the review kit reads:
// check-assets.mjs refuses a proposed name that nothing uses. Frontend owns the real
// mapping; this file is not shipped.

const ROOT_FONT_PX = 16;
const rem = px => `${px / ROOT_FONT_PX}rem`;

export function tokenVariables(tokens) {
  const existing = [
    ['--ms-color-canvas', tokens.color.canvas],
    ['--ms-color-panel', tokens.color.panel],
    ['--ms-color-paper', tokens.color.paper],
    ['--ms-color-ink', tokens.color.ink],
    ['--ms-color-text', tokens.color.textPrimary],
    ['--ms-color-text-secondary', tokens.color.textSecondary],
    ['--ms-color-token', tokens.color.publicToken],
    ['--ms-color-accent', tokens.color.interactiveAccent],
    ['--ms-color-focus', tokens.color.focusRing],
    ['--ms-font-body', tokens.type.bodyFamily],
    ['--ms-font-heading', tokens.type.headingFamily],
    ['--ms-text-body', rem(tokens.type.bodyPx)],
    ['--ms-text-label', rem(tokens.type.labelPx)],
    ['--ms-text-heading', rem(tokens.type.headingPx)],
    ['--ms-text-display', rem(tokens.type.displayPx)],
    ['--ms-leading-body', String(tokens.type.bodyLineHeight)],
    ['--ms-leading-heading', String(tokens.type.headingLineHeight)],
    ['--ms-radius-control', `${tokens.radiusPx.control}px`],
    ['--ms-radius-panel', `${tokens.radiusPx.panel}px`],
    ['--ms-stroke-control', `${tokens.strokePx.control}px`],
    ['--ms-stroke-focus', `${tokens.strokePx.focus}px`],
    ['--ms-stroke-illustration', `${tokens.strokePx.illustration}px`],
    ['--ms-target-min', rem(tokens.interaction.minimumTargetCssPx)],
    ['--ms-motion-selection', `${tokens.motionMs.selection}ms`],
    ['--ms-motion-card', `${tokens.motionMs.cardTransition}ms`],
    ['--ms-motion-reduced-fade', `${tokens.motionMs.reducedMotionFade}ms`],
    ['--ms-motion-stamp', `${tokens.motionMs.registrationStamp}ms`],
    ['--ms-motion-move', `${tokens.motionMs.publicMove}ms`],
    ['--ms-motion-round', `${tokens.motionMs.roundTransition}ms`],
    ['--ms-motion-beat-max', `${tokens.motionMs.comicBeatMaximum}ms`],
    ...tokens.spacingPx.map((value, index) => [`--ms-space-${index + 1}`, rem(value)]),
  ];
  // Only what a reference stylesheet uses: a variable nothing reads is a claim nothing tests.
  const dashed = name => name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  const proposed = [
    ['--ms-color-paper-shade', tokens.color.paperShade],
    ['--ms-color-paper-deep', tokens.color.paperDeep],
    ...['shadow', 'mid'].map(name => [`--ms-color-steel-${name}`, tokens.color.steel[name]]),
    // Private. A faction color is read only inside the private sheet, beside its word. Only
    // the Blue one has a card that reads it in this slice.
    ['--ms-color-faction-blue', tokens.color.factionPrivateOrRevealed.blue],
    ['--ms-font-lettering', tokens.type.letteringFamily],
    ['--ms-weight-lettering', String(tokens.type.letteringWeight)],
    ['--ms-tracking-lettering', `${tokens.type.letteringTrackingEm}em`],
    ['--ms-text-role-name', rem(tokens.type.privateRoleNameMaxPx)],
    ['--ms-text-table-timer', rem(tokens.type.tableTimerPx)],
    ['--ms-text-table-heading', rem(tokens.type.tableHeadingPx)],
    ['--ms-radius-card', `${tokens.radiusPx.card}px`],
    ['--ms-stroke-ink-fine', `${tokens.strokePx.inkFine}px`],
    ['--ms-stroke-ink-bold', `${tokens.strokePx.inkBold}px`],
    ['--ms-stroke-panel', `${tokens.strokePx.panelBorder}px`],
    ['--ms-stroke-selection', `${tokens.strokePx.selection}px`],
    ...['impact', 'settle', 'snap', 'sweep'].map(name => [`--ms-ease-${name}`, tokens.motionEasing[name]]),
    ['--ms-shadow-offset', `${tokens.comic.inkShadowOffsetPx}px`],
    ['--ms-shadow-offset-lifted', `${tokens.comic.inkShadowOffsetLiftedPx}px`],
    ['--ms-lift', `${tokens.comic.selectionLiftPx}px`],
    ['--ms-gutter', `${tokens.comic.panelGutterPx}px`],
    ['--ms-stamp-rotation', `${tokens.comic.stampRotationDeg}deg`],
    ['--ms-token-phone', rem(tokens.component.tokenDiameterPx.phone)],
    ['--ms-marker-icon-phone', rem(tokens.component.markerIconPx.phone)],
    ['--ms-marker-min-phone', rem(tokens.component.markerMinHeightPx.phone)],
    ['--ms-dock-min', rem(tokens.component.privateDockMinHeightPx)],
    ['--ms-roster-min', rem(tokens.component.tableRosterMinWidthPx)],
    ...['panelChrome', 'privateSheet', 'banner', 'cueOverlay', 'focus'].map(name => [`--ms-layer-${dashed(name)}`, String(tokens.layer[name])]),
  ];
  return { existing, proposed };
}

export function tokenStylesheet(tokens) {
  const { existing, proposed } = tokenVariables(tokens);
  const lines = list => list.map(([name, value]) => `  ${name}: ${value};`).join('\n');
  return [
    `/* Generated by design/tools/build-exports.mjs from packages/design-tokens/src/tokens-0.3.0.json (${tokens.version}, ${tokens.status}). Do not edit by hand. */`,
    ':root {',
    '  /* Names Frontend already gives the 0.2.0 tokens. */',
    lines(existing),
    '',
    '  /* Names proposed for what 0.3.0 adds. Frontend owns the real mapping. */',
    lines(proposed),
    '}',
    '',
  ].join('\n');
}

/**
 * The palette as a module, for the review page that shows it. Every color token is here,
 * whether or not a reference stylesheet reads it.
 */
export function tokenPaletteModule(tokens) {
  const { steel, factionPrivateOrRevealed: faction, ...flat } = tokens.color;
  const palette = {
    ...Object.fromEntries(Object.entries(flat).filter(([, value]) => typeof value === 'string')),
    ...Object.fromEntries(Object.entries(steel).map(([name, value]) => [`steel.${name}`, value])),
    ...Object.fromEntries(Object.entries(faction).map(([name, value]) => [`factionPrivateOrRevealed.${name}`, value])),
  };
  return `// mothership:dev-only\n// Generated by design/tools/build-exports.mjs from packages/design-tokens/src/tokens-0.3.0.json. Do not edit by hand.\nexport const TOKEN_VERSION = ${JSON.stringify(tokens.version)};\nexport const PALETTE = ${JSON.stringify(palette, null, 2)};\n`;
}
