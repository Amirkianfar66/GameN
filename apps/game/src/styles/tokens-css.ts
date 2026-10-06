// Turns the Designer's token proposal into CSS custom properties. The shell stylesheet
// reads colors, sizes and durations only through these, so a token change needs no edit
// here and no value is restated by hand.

/** The parts of the token file the shells consume. Extra token fields are ignored. */
export interface ShellTokenSource {
  readonly version: string;
  readonly color: {
    readonly canvas: string; readonly panel: string; readonly paper: string; readonly ink: string;
    readonly textPrimary: string; readonly textSecondary: string; readonly publicToken: string;
    readonly interactiveAccent: string; readonly focusRing: string;
  };
  readonly type: {
    readonly bodyFamily: string; readonly headingFamily: string;
    readonly bodyPx: number; readonly labelPx: number; readonly headingPx: number; readonly displayPx: number;
    readonly bodyLineHeight: number; readonly headingLineHeight: number;
  };
  readonly spacingPx: readonly number[];
  readonly radiusPx: { readonly control: number; readonly panel: number };
  readonly strokePx: { readonly control: number; readonly focus: number; readonly illustration: number };
  readonly interaction: {
    readonly minimumTargetCssPx: number;
    readonly breakpointsCssPx: { readonly expandedPlayerLayout: number; readonly wideTableLayout: number };
  };
  readonly motionMs: { readonly selection: number; readonly cardTransition: number; readonly reducedMotionFade: number };
}

const ROOT_FONT_PX = 16;

// Token values are data from another package and reach this function untyped from plain
// JavaScript callers. A number must really be one, and a string must be a plain CSS value;
// anything else is refused rather than written into a stylesheet where it could close a
// declaration or a rule.
function num(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new TypeError(`Design token is not a non-negative number: ${String(value)}`);
  return value;
}
// Sizes follow the reader's own font setting instead of fixing pixels.
const rem = (px: number): string => `${num(px) / ROOT_FONT_PX}rem`;
const px = (value: number): string => `${num(value)}px`;
const ms = (value: number): string => `${num(value)}ms`;

function cssValue(value: string): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9 #%.,()\-]+$/.test(value)) throw new TypeError(`Design token is not a plain CSS value: ${String(value)}`);
  return value;
}

export function shellCssVariables(tokens: ShellTokenSource): ReadonlyMap<string, string> {
  const variables = new Map<string, string>([
    ['--ms-color-canvas', cssValue(tokens.color.canvas)],
    ['--ms-color-panel', cssValue(tokens.color.panel)],
    ['--ms-color-paper', cssValue(tokens.color.paper)],
    ['--ms-color-ink', cssValue(tokens.color.ink)],
    ['--ms-color-text', cssValue(tokens.color.textPrimary)],
    ['--ms-color-text-secondary', cssValue(tokens.color.textSecondary)],
    ['--ms-color-token', cssValue(tokens.color.publicToken)],
    ['--ms-color-accent', cssValue(tokens.color.interactiveAccent)],
    ['--ms-color-focus', cssValue(tokens.color.focusRing)],
    ['--ms-font-body', cssValue(tokens.type.bodyFamily)],
    ['--ms-font-heading', cssValue(tokens.type.headingFamily)],
    ['--ms-text-body', rem(tokens.type.bodyPx)],
    ['--ms-text-label', rem(tokens.type.labelPx)],
    ['--ms-text-heading', rem(tokens.type.headingPx)],
    ['--ms-text-display', rem(tokens.type.displayPx)],
    ['--ms-leading-body', String(num(tokens.type.bodyLineHeight))],
    ['--ms-leading-heading', String(num(tokens.type.headingLineHeight))],
    ['--ms-radius-control', px(tokens.radiusPx.control)],
    ['--ms-radius-panel', px(tokens.radiusPx.panel)],
    ['--ms-stroke-control', px(tokens.strokePx.control)],
    ['--ms-stroke-focus', px(tokens.strokePx.focus)],
    ['--ms-stroke-illustration', px(tokens.strokePx.illustration)],
    ['--ms-target-min', rem(tokens.interaction.minimumTargetCssPx)],
    ['--ms-motion-selection', ms(tokens.motionMs.selection)],
    ['--ms-motion-card', ms(tokens.motionMs.cardTransition)],
    ['--ms-motion-reduced-fade', ms(tokens.motionMs.reducedMotionFade)],
  ]);
  tokens.spacingPx.forEach((value, index) => variables.set(`--ms-space-${index + 1}`, rem(value)));
  return variables;
}

/** A `:root` rule for the page hosting a shell. Load it before the shell stylesheet. */
export function shellTokenStylesheet(tokens: ShellTokenSource): string {
  const declarations = [...shellCssVariables(tokens)].map(([name, value]) => `  ${name}: ${value};`).join('\n');
  return `/* Mothership design tokens ${cssValue(tokens.version)} (proposal for evaluation) */\n:root {\n${declarations}\n}\n`;
}

/**
 * Layout breakpoints in CSS pixels. Media queries cannot read custom properties, so the
 * stylesheet repeats these two numbers and a test keeps them equal to the tokens.
 */
export function shellBreakpoints(tokens: ShellTokenSource): { readonly expandedPlayer: number; readonly wideTable: number } {
  return { expandedPlayer: num(tokens.interaction.breakpointsCssPx.expandedPlayerLayout), wideTable: num(tokens.interaction.breakpointsCssPx.wideTableLayout) };
}
