// mothership:dev-only
//
// The phone interface pack (docs/design/phone-ui.md). These tests hold what its handoff promises:
//   - the catalog covers every required screen group (A–Q), the flow, the matrix, the components,
//     the three phone sizes, larger text and Reduce motion, and every frame names a real screen;
//   - the committed review sheets are the ones the render tool recorded, and the recorded checks of
//     every frame are clean: no sideways overflow, no control under 44 px, no text under 11 px, no
//     page error;
//   - the kit's colours are tokens 0.5.0's, the icon family is whole and its exports are current;
//   - synthetic-fixture labels stay outside the proposed interface; everything is development-only,
//     and no game code imports the pack.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SHEETS, SIZES } from '../../../design/phone-ui/sheets/catalog.mjs';
import { screenRegistry } from '../../../design/phone-ui/prototype/screens.mjs';
import { ICONS, ICON_NAMES } from '../../../design/phone-ui/prototype/icons.mjs';
import { FIXTURE_LABEL } from '../../../design/phone-ui/prototype/fixtures.mjs';
import { phoneUiAssets } from '../../../design/tools/phone-ui-assets.mjs';

const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const PACK = join(REPO, 'design/phone-ui');
const read = path => readFileSync(join(REPO, path), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const walk = dir => readdirSync(dir).flatMap(name => { const p = join(dir, name); return statSync(p).isDirectory() ? walk(p) : [p]; });

test('the catalog covers every required screen group, view and diagram', () => {
  const ids = SHEETS.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length, 'sheet numbers are unique');
  assert.deepEqual([...ids], [...ids].sort(), 'sheets are numbered in order');
  for (const section of 'ABCDEFGHIJKLMNOPQ') assert.ok(SHEETS.some(s => s.section === section), `section ${section} has a sheet`);
  for (const kind of ['flow', 'phases', 'matrix', 'foundations', 'icons', 'controls', 'timeline', 'art', 'compare']) assert.ok(SHEETS.some(s => s.kind === kind), `a ${kind} sheet`);
  const frames = SHEETS.flatMap(s => s.frames ?? []);
  for (const size of ['320x568', '390x844', '430x932', '390x664']) assert.ok(frames.some(f => (f.size ?? '390x844') === size), `a frame at ${size}`);
  assert.ok(frames.some(f => f.text === '1.5') && frames.some(f => f.text === '2'), 'larger text at 150% and 200%');
  assert.ok(frames.filter(f => f.motion === 'reduced').length >= 4, 'Reduce motion examples');
  for (const f of frames) assert.ok(SIZES[f.size ?? '390x844'], `known size ${f.size}`);
  const phases = SHEETS.find(s => s.kind === 'phases');
  assert.match(phases.status, /Integration proposal/, 'the Blackout order is labelled an Integration proposal');
});

test('every frame names a screen of the prototype', () => {
  const screens = screenRegistry();
  for (const sheet of SHEETS) for (const f of sheet.frames ?? []) {
    const name = new URLSearchParams(f.q).get('s');
    assert.equal(typeof screens[name], 'function', `${sheet.id} “${f.label}”: screen ${name}`);
  }
  for (const required of ['intro', 'menu', 'host-setup', 'host-lobby', 'join', 'join-wait', 'recover', 'choose', 'role', 'boarding', 'room', 'board', 'actions', 'card', 'more', 'promises', 'windows', 'vote', 'result', 'captain', 'officer', 'nav', 'talk', 'scan', 'code', 'panel', 'blackout', 'blackhole', 'eliminated', 'end', 'system']) assert.equal(typeof screens[required], 'function', required);
});

test('the review sheets are the recorded renders, and every measured frame is clean', () => {
  const checks = JSON.parse(read('design/phone-ui/review/checks.json'));
  assert.deepEqual(checks.sheets.map(s => s.id), SHEETS.map(s => s.id), 'every sheet was rendered and recorded');
  for (const s of checks.sheets) {
    const file = join(REPO, s.file);
    assert.ok(existsSync(file), s.file);
    assert.equal(sha(readFileSync(file)), s.sha256, `${s.file} is the recorded render`);
    assert.deepEqual(s.problems, [], `${s.id}: no page errors`);
    const sheet = SHEETS.find(x => x.id === s.id);
    assert.equal(s.frames.length, sheet.kind === 'compare' ? 2 : sheet.frames?.length ?? 0, `${s.id}: every frame measured`);
    for (const f of s.frames) {
      assert.equal(f.error, undefined, `${s.id} ${f.label}: measured`);
      assert.equal(f.overflowX, false, `${s.id} ${f.label}: no sideways overflow`);
      assert.deepEqual(f.small, [], `${s.id} ${f.label}: controls at least 44 px`);
      assert.deepEqual(f.tinyText, [], `${s.id} ${f.label}: no text under 11 px`);
    }
  }
  assert.ok(existsSync(join(PACK, 'review/contact-sheet.jpg')), 'the numbered contact sheet');
  const provenance = JSON.parse(read('design/phone-ui/review/inputs/provenance.json'));
  for (const input of provenance.inputs) assert.ok(existsSync(join(REPO, input.file)), input.file);
});

test('the kit’s colours, type and motion are tokens 0.5.0', () => {
  const tokens = JSON.parse(read('packages/design-tokens/src/tokens-0.5.0.json'));
  const css = read('design/phone-ui/prototype/kit.css');
  const value = name => new RegExp(`--${name}:\\s*([^;]+);`).exec(css)?.[1].trim();
  const c = tokens.color;
  const expected = {
    canvas: c.canvas, panel: c.panel, paper: c.paper, 'paper-shade': c.paperShade, 'paper-deep': c.paperDeep, ink: c.ink,
    'text-primary': c.textPrimary, 'text-secondary': c.textSecondary, 'public-token': c.publicToken, accent: c.interactiveAccent,
    focus: c.focusRing, caption: c.caption, 'steel-deep': c.steel.deep, 'steel-shadow': c.steel.shadow, 'steel-mid': c.steel.mid,
    'steel-light': c.steel.light, 'steel-pale': c.steel.pale, 'faction-blue': c.factionPrivateOrRevealed.blue, 'faction-red': c.factionPrivateOrRevealed.red,
    'faction-alien': c.factionPrivateOrRevealed.alien, 'room-a': c.room.roomA.mid, 'room-b': c.room.roomB.mid, 'room-command': c.room.commandRoom.mid,
    'room-hospital': c.room.hospital.mid, 'room-jail': c.room.jail.mid,
    't-selection': `${tokens.motionMs.selection}ms`, 't-card': `${tokens.motionMs.cardTransition}ms`, 't-public-move': `${tokens.motionMs.publicMove}ms`,
    't-round': `${tokens.motionMs.roundTransition}ms`, 't-reduced': `${tokens.motionMs.reducedMotionFade}ms`,
    'ease-standard': tokens.motionEasing.standard, 'ease-settle': tokens.motionEasing.settle, 'ease-snap': tokens.motionEasing.snap,
    target: `${tokens.interaction.minimumTargetCssPx}px`,
  };
  for (const [name, want] of Object.entries(expected)) assert.equal(value(name)?.toUpperCase(), String(want).toUpperCase(), `--${name}`);
  // Faction colours are defined once and used only for team chips (a player's own card, claims, the end reveal).
  const all = ['kit.css', 'screens.css'].map(f => read(`design/phone-ui/prototype/${f}`)).join('\n');
  const uses = all.split('\n').filter(line => /var\(--faction-/.test(line));
  assert.ok(uses.length > 0 && uses.every(line => /team-chip/.test(line)), 'faction colours only in team chips');
});

test('the icon family is whole and its exports are current', () => {
  assert.ok(ICON_NAMES.length >= 60);
  for (const name of ICON_NAMES) {
    const icon = ICONS[name];
    assert.ok(icon.label && icon.label.length > 1, `${name} has an accessible name`);
    assert.ok(['navigation', 'action', 'status', 'phase', 'entry', 'utility'].includes(icon.group), `${name} group`);
    assert.ok(icon.parts.length > 0);
  }
  for (const [file, text] of Object.entries(phoneUiAssets())) assert.equal(read(`design/phone-ui/assets/${file}`), text, `design/phone-ui/assets/${file} is current`);
});

test('fixture labels stay outside the proposed interface', () => {
  assert.match(FIXTURE_LABEL, /^Synthetic fixture/);
  for (const file of readdirSync(join(PACK, 'prototype')).filter(f => /^(screens.*|ui|art|icons)\.mjs$/.test(f))) {
    const text = read(`design/phone-ui/prototype/${file}`);
    assert.doesNotMatch(text, /FIXTURE_LABEL|Synthetic fixture/, `${file} draws no fixture label inside a phone`);
  }
});

test('the pack is development-only and no game code imports it', () => {
  const files = [...walk(join(PACK, 'prototype')), ...walk(join(PACK, 'sheets')), join(REPO, 'design/tools/phone-ui-render.mjs'), join(REPO, 'design/tools/phone-ui-assets.mjs'), join(REPO, 'design/tools/phone-ui-clickable.mjs')]
    .filter(f => /\.(mjs|html|css)$/.test(f));
  for (const f of files) assert.match(readFileSync(f, 'utf8'), /mothership:dev-only/, f);
  const roots = ['apps/game/src', 'apps/game/hosted', 'packages/contracts/src', 'packages/engine/src', 'packages/presentation/src', 'services', 'infra'].map(p => join(REPO, p)).filter(existsSync);
  for (const f of roots.flatMap(walk).filter(f => /\.(m?[jt]s|html|css)$/.test(f) && !f.includes('node_modules') && !f.includes(`${'/'}dist${'/'}`))) {
    assert.doesNotMatch(readFileSync(f, 'utf8'), /phone-ui\/(prototype|sheets|assets)/, `${f} does not import the pack`);
  }
});
