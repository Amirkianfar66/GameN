import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// The token files are read as files, so these tests need no build. The last test imports
// the built package and is skipped with a reason when it has not been built.
const read = path => JSON.parse(readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8'));
const pinned = read('packages/design-tokens/src/tokens.json');
// 0.3.0 was the revision of PR #45. It is kept, unexported, so that 0.4.0 can be held to it.
const previous = read('packages/design-tokens/src/tokens-0.3.0.json');
const next = read('packages/design-tokens/src/tokens-0.4.0.json');

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255).map(value => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(first, second) {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}
/** CIE76: the plain distance between two colors in L*a*b*. Coarse, and enough to tell 16 from 50. */
function distance(first, second) {
  const lab = hex => {
    const [r, g, b] = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255).map(value => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
    const f = value => (value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116);
    const [x, y, z] = [(r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, r * 0.2126 + g * 0.7152 + b * 0.0722, (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883].map(f);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  };
  const [a, b] = [lab(first), lab(second)];
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
const nearestAccent = hex => Math.min(...Object.values(next.color.factionPrivateOrRevealed).map(accent => distance(hex, accent)));

test('0.4.0 only adds to the pinned file: every 0.2.0 key keeps its name, shape and value', () => {
  assert.equal(pinned.version, '0.2.0');
  assert.equal(previous.version, '0.3.0');
  assert.equal(previous.supersedes, pinned.version);
  assert.equal(next.version, '0.4.0');
  assert.equal(next.supersedes, previous.version);
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

test('over 0.3.0, 0.4.0 changes only the entries it lists, each with what it was and why', () => {
  const changed = [];
  const removed = [];
  (function compare(before, after, path) {
    if (Array.isArray(before)) before.forEach((item, index) => compare(item, after?.[index], `${path}[${index}]`));
    else if (before !== null && typeof before === 'object') {
      for (const [key, value] of Object.entries(before)) {
        if (after?.[key] === undefined) removed.push(`${path}.${key}`);
        else compare(value, after[key], `${path}.${key}`);
      }
    } else if (before !== after) changed.push(path);
  })(previous, next, 'tokens');
  assert.deepEqual(removed, [], 'nothing 0.3.0 holds is removed');
  const listed = next.revisedFrom030.map(entry => `tokens.${entry.path}`);
  assert.deepEqual(changed.filter(path => !['tokens.version', 'tokens.supersedes', 'tokens.compatibility'].includes(path)).sort(), [...listed].sort());
  for (const entry of next.revisedFrom030) {
    const was = entry.path.split(/[.[\]]/).filter(Boolean).reduce((value, key) => value[key], previous);
    assert.deepEqual(entry.was, was, `${entry.path}: what it was`);
    assert.ok(entry.because.length > 20, `${entry.path}: why`);
  }
  // The one revision: 0.3.0 said a location is never tinted. The owner approved rooms in color.
  assert.deepEqual(listed, ['tokens.usageConstraints[7]']);
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
  // Only these become CSS values. The prose fields 0.3.0 and 0.4.0 add (statuses, notes, the
  // breakpoint unit) are not CSS and are not held to this.
  // The character set cssValue() allows in apps/game/src/styles/tokens-css.ts.
  const plain = /^[A-Za-z0-9 #%.,()\-]+$/;
  const strings = [
    next.color.paperShade, next.color.paperDeep, ...Object.values(next.color.steel),
    next.type.letteringFamily, next.type.timerNumeric, ...Object.values(next.motionEasing),
  ];
  for (const value of strings) assert.match(value, plain, value);
  const added = [
    next.color.paperShade, next.color.paperDeep, next.color.caption, ...Object.values(next.color.steel),
    ...Object.values(next.color.room).flatMap(family => Object.values(family)),
    ...Object.values(next.color.crew).flatMap(parts => Object.values(parts)),
    ...Object.values(next.color.crewHair),
  ];
  for (const value of added) assert.match(value, /^#[0-9A-F]{6}$/);
});

test('five rooms, five tones each; nine characters; and the names a recipe and a stylesheet rely on', () => {
  assert.deepEqual(Object.keys(next.color.room), ['roomA', 'roomB', 'commandRoom', 'hospital', 'jail']);
  for (const [room, family] of Object.entries(next.color.room)) {
    // The same five names as steel, in the same order, dark to light: a room drawing is made
    // in steel and printed in its family by swapping one for the other.
    assert.deepEqual(Object.keys(family), Object.keys(next.color.steel), room);
    const tones = Object.values(family).map(luminance);
    assert.deepEqual(tones, [...tones].sort((a, b) => a - b), `${room} runs dark to light`);
  }
  assert.deepEqual(Object.keys(next.color.crew), ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9']);
  for (const parts of Object.values(next.color.crew)) assert.deepEqual(Object.keys(parts), ['field', 'accent', 'skin']);
  assert.equal(new Set(Object.values(next.color.crew).map(parts => parts.field)).size, 9, 'nine different fields');
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
    'ink on the caption yellow (room captions, the own-seat tag)': [c.ink, c.caption],
    // A room panel whose picture has not arrived: paper words on the room's own shadow tone.
    ...Object.fromEntries(Object.entries(c.room).map(([room, family]) => [`paper on ${room}.shadow`, [c.textPrimary, family.shadow]])),
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

test('faction colors are not part of the public palette, and steel stays far duller than the Blue accent', () => {
  const faction = Object.values(next.color.factionPrivateOrRevealed);
  const publicPalette = [
    next.color.canvas, next.color.panel, next.color.paper, next.color.ink, next.color.publicToken, next.color.paperShade, next.color.paperDeep, next.color.interactiveAccent, next.color.caption,
    ...Object.values(next.color.steel),
    ...Object.values(next.color.room).flatMap(family => Object.values(family)),
    ...Object.values(next.color.crew).flatMap(parts => Object.values(parts)),
    ...Object.values(next.color.crewHair),
  ];
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

test('how near the new public colors come to a team accent and to amber: the numbers the token file states', () => {
  // Not a judgment of whether people confuse them: nobody has been asked. It holds the
  // numbers the documents quote, so that a color cannot move closer to a team accent or to
  // the amber of interaction without this failing and the caution being written again
  // (docs/design/README.md, DSN-D13 and DSN-D08).
  const stated = next.measuredColorDistances;
  const nearestOf = (family, measure) => Math.round(Math.min(...Object.values(family).map(measure)));
  const nearestField = measure => Object.entries(next.color.crew).map(([id, parts]) => ({ id, distance: Math.round(measure(parts.field)) })).sort((a, b) => a.distance - b.distance)[0];
  const toAmber = hex => distance(hex, next.color.interactiveAccent);

  assert.deepEqual(stated.toNearestTeamAccent, {
    ...Object.fromEntries(Object.entries(next.color.room).map(([room, family]) => [room, nearestOf(family, nearestAccent)])),
    nearestCharacterField: nearestField(nearestAccent),
  });
  assert.deepEqual(stated.toInteractionAmber, {
    caption: Math.round(toAmber(next.color.caption)),
    commandRoom: nearestOf(next.color.room.commandRoom, toAmber),
    nearestCharacterField: nearestField(toAmber),
  });
  // What those numbers are today. Three rooms share a hue with the three team accents; two do not.
  assert.deepEqual(stated.toNearestTeamAccent, { roomA: 16, roomB: 20, commandRoom: 54, hospital: 55, jail: 18, nearestCharacterField: { id: 'c6', distance: 26 } });
  assert.deepEqual(stated.toInteractionAmber, { caption: 16, commandRoom: 15, nearestCharacterField: { id: 'c2', distance: 14 } });
  // No character field is nearer to a team accent than the pink, and none is a team accent.
  for (const parts of Object.values(next.color.crew)) assert.ok(Math.round(nearestAccent(parts.field)) >= 26);
  assert.equal(next.privacyPolicy.roomColorStandsForTeam, false);
});

test('each cue\'s opening, accent and settle add up to its token total, and no 0.2.0 total changed', () => {
  for (const [name, beats] of Object.entries(next.motionBeatsMs)) {
    assert.equal(beats.opening + beats.accent + beats.settle, next.motionMs[name], name);
    assert.ok(next.motionMs[name] <= next.motionMs.comicBeatMaximum, name);
  }
  for (const [name, total] of Object.entries(pinned.motionMs)) assert.equal(next.motionMs[name], total, `${name} total changed`);
  // A piece is in the air for exactly the time of a public move in the pinned tokens.
  assert.equal(next.motionBeatsMs.pieceMove.accent, pinned.motionMs.publicMove);
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
    characterIndependentOfRole: true,
    roleDeviceOnlyInsidePrivateSheet: true,
    roomColorStandsForTeam: false,
    displayNameIsUntrustedText: true,
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
  // A tag under a piece: never under 10 px, and a name is bounded, because a player types it.
  assert.ok(next.component.seatTag.minFontPx >= 10);
  assert.ok(next.component.seatTag.nameMaxLength > 0 && next.component.seatTag.nameMaxLength <= 16);
  assert.deepEqual(next.component.piece.floorContact, [48, 104]);
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
