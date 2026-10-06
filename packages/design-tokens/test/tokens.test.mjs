import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// The token files are read as files, so these tests need no build. The last test imports
// the built package and is skipped with a reason when it has not been built.
const read = path => JSON.parse(readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8'));
const pinned = read('packages/design-tokens/src/tokens.json');
const next = read('packages/design-tokens/src/tokens-0.3.0.json');

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255).map(value => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(first, second) {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

test('0.3.0 only adds: every 0.2.0 key keeps its name, shape and value', () => {
  assert.equal(pinned.version, '0.2.0');
  assert.equal(next.version, '0.3.0');
  assert.equal(next.supersedes, pinned.version);
  assert.equal(next.status, 'proposal_for_evaluation');
  const changed = [];
  (function compare(before, after, path) {
    if (Array.isArray(before)) {
      before.forEach((item, index) => { if (JSON.stringify(item) !== JSON.stringify(after?.[index])) changed.push(`${path}[${index}]`); });
    } else if (before !== null && typeof before === 'object') {
      for (const [key, value] of Object.entries(before)) compare(value, after?.[key], `${path}.${key}`);
    } else if (path !== 'tokens.version' && before !== after) changed.push(path);
  })(pinned, next, 'tokens');
  assert.deepEqual(changed, []);
});

test('the fields Frontend\'s shell reads are all still present and of the same type', () => {
  // The shape of ShellTokenSource in apps/game/src/styles/tokens-css.ts on the Frontend branches.
  const read = {
    color: ['canvas', 'panel', 'paper', 'ink', 'textPrimary', 'textSecondary', 'publicToken', 'interactiveAccent', 'focusRing'],
    type: ['bodyFamily', 'headingFamily', 'bodyPx', 'labelPx', 'headingPx', 'displayPx', 'bodyLineHeight', 'headingLineHeight'],
    radiusPx: ['control', 'panel'],
    strokePx: ['control', 'focus', 'illustration'],
    motionMs: ['selection', 'cardTransition', 'reducedMotionFade', 'registrationStamp', 'publicMove', 'roundTransition', 'comicBeatMaximum'],
  };
  for (const [group, keys] of Object.entries(read)) {
    for (const key of keys) assert.equal(typeof next[group][key], typeof pinned[group][key], `${group}.${key}`);
  }
  assert.equal(next.interaction.minimumTargetCssPx, 44);
  assert.deepEqual([next.interaction.breakpointsCssPx.expandedPlayerLayout, next.interaction.breakpointsCssPx.wideTableLayout], [600, 960]);
  assert.ok(Array.isArray(next.spacingPx) && next.spacingPx.length === 7);
});

test('every new color, font family and easing is a plain CSS value Frontend\'s token writer accepts', () => {
  // Only these become CSS values. The prose fields 0.3.0 adds (statuses, notes, the
  // breakpoint unit) are not CSS and are not held to this.
  // The character set cssValue() allows in apps/game/src/styles/tokens-css.ts.
  const plain = /^[A-Za-z0-9 #%.,()\-]+$/;
  const strings = [
    next.color.paperShade, next.color.paperDeep, ...Object.values(next.color.steel),
    next.type.letteringFamily, next.type.timerNumeric, ...Object.values(next.motionEasing),
  ];
  for (const value of strings) assert.match(value, plain, value);
  for (const value of [next.color.paperShade, next.color.paperDeep, ...Object.values(next.color.steel)]) assert.match(value, /^#[0-9A-F]{6}$/);
});

test('text pairs the design uses reach 4.5:1 and essential marks reach 3:1', () => {
  const c = next.color;
  const text = {
    'ink on paper (cards, captions, chips)': [c.ink, c.paper],
    'ink on paperShade (target rows)': [c.ink, c.paperShade],
    'ink on paperDeep (flat and spent cards, not-active controls)': [c.ink, c.paperDeep],
    'ink on amber (primary control, active-turn chip)': [c.ink, c.interactiveAccent],
    'ink on publicToken': [c.ink, c.publicToken],
    'paper on canvas': [c.textPrimary, c.canvas],
    'paper on panel': [c.textPrimary, c.panel],
    'paper on ink (countdown)': [c.paper, c.ink],
    'paper on steel.shadow (plain location panel)': [c.textPrimary, c.steel.shadow],
    'secondary text on canvas': [c.textSecondary, c.canvas],
    'secondary text on panel': [c.textSecondary, c.panel],
  };
  for (const [name, [foreground, background]] of Object.entries(text)) {
    assert.ok(contrast(foreground, background) >= 4.5, `${name}: ${contrast(foreground, background).toFixed(2)}:1`);
  }
  const marks = {
    'focus ring on canvas': [c.focusRing, c.canvas],
    'focus ring on panel': [c.focusRing, c.panel],
    'amber outline on panel (lifted card)': [c.interactiveAccent, c.panel],
    'paper keyline on panel': [c.paper, c.panel],
    'token body on canvas': [c.publicToken, c.canvas],
    'steel.mid edge on canvas': [c.steel.mid, c.canvas],
  };
  for (const [name, [foreground, background]] of Object.entries(marks)) {
    assert.ok(contrast(foreground, background) >= 3, `${name}: ${contrast(foreground, background).toFixed(2)}:1`);
  }
});

test('amber and the focus ring are not readable on paper, so paper surfaces use ink for both', () => {
  // The reason comic.css gives a focused control on paper an ink outline inside the ring,
  // and a selected token an ink edge on both sides of its amber ring.
  assert.ok(contrast(next.color.interactiveAccent, next.color.paper) < 3);
  assert.ok(contrast(next.color.focusRing, next.color.paper) < 3);
  assert.ok(contrast(next.color.ink, next.color.paper) >= 7);
});

test('faction colors are not part of the public palette and are never close to it', () => {
  const faction = Object.values(next.color.factionPrivateOrRevealed);
  const publicPalette = [next.color.canvas, next.color.panel, next.color.paper, next.color.ink, next.color.publicToken, next.color.paperShade, next.color.paperDeep, next.color.interactiveAccent, ...Object.values(next.color.steel)];
  const saturation = hex => {
    const [r, g, b] = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
    const [max, min] = [Math.max(r, g, b), Math.min(r, g, b)];
    return max === 0 ? 0 : (max - min) / max;
  };
  for (const color of faction) assert.ok(!publicPalette.includes(color));
  // Steel is the public palette's blue-grey. It must stay far duller than the Blue accent.
  for (const steel of Object.values(next.color.steel)) assert.ok(saturation(steel) < 0.45, `${steel} saturation ${saturation(steel).toFixed(2)}`);
  assert.ok(saturation(next.color.factionPrivateOrRevealed.blue) > 0.5);
  assert.equal(next.privacyPolicy.factionAccentOnPublicAssets, false);
});

test('each cue\'s opening, accent and settle add up to the unchanged token total', () => {
  for (const [name, beats] of Object.entries(next.motionBeatsMs)) {
    assert.equal(beats.opening + beats.accent + beats.settle, next.motionMs[name], name);
    assert.equal(next.motionMs[name], pinned.motionMs[name], `${name} total changed`);
    assert.ok(next.motionMs[name] <= next.motionMs.comicBeatMaximum, name);
  }
  assert.equal(next.motionMs.reducedMotionFade, 80);
  // The synthetic studies borrow motionMs.publicImpact. They get no split of their own here.
  assert.equal(next.motionBeatsMs.publicImpact, undefined);
});

test('the policies that protect secrets and controls are still off, and the new ones say the same', () => {
  assert.equal(next.motionPolicy.publicSecretActionCue, false);
  assert.equal(next.motionPolicy.blocksActiveControls, false);
  assert.equal(next.motionPolicy.mutatesGameplayState, false);
  assert.equal(next.motionPolicy.overlaysInterceptInput, false);
  assert.equal(next.motionPolicy.queuesPlayback, false);
  assert.equal(next.motionPolicy.loops, false);
  assert.deepEqual(next.privacyPolicy, {
    privateSheetOpenByDefault: false,
    publicLayerShowsActionAvailability: false,
    publicLayerVariesByRole: false,
    factionAccentOnPublicAssets: false,
    roleArtBundleUniformAcrossSeats: true,
    targetingHighlightsOnPublicSurfaces: false,
  });
  assert.equal(next.audioPolicy.secretActionSoundOnPhone, false);
  assert.equal(next.audioPolicy.secretActionVibrationOnPhone, false);
  assert.equal(next.audioPolicy.status, 'specified_no_assets_delivered');
});

test('sizes that carry meaning: targets, the private role name, the roster breakpoint', () => {
  assert.ok(next.interaction.minimumTargetCssPx >= 44);
  assert.ok(next.type.privateRoleNameMaxPx <= next.type.headingPx, 'a role name must not be readable across a table');
  assert.ok(next.component.privateDockMinHeightPx >= next.interaction.minimumTargetCssPx);
  assert.ok(next.interaction.breakpointsCssPx.tableRosterBesideBoard > next.interaction.breakpointsCssPx.wideTableLayout);
  assert.equal(next.interaction.dragRequired, false);
});

test('the built package exports both the pinned proposal and the next revision', async t => {
  let built;
  try {
    built = await import('@mothership/design-tokens');
  } catch {
    t.skip('not built: run `npm run build` first');
    return;
  }
  assert.deepEqual(built.proposedDesignTokens, pinned);
  assert.deepEqual(built.nextDesignTokens, next);
});
