// The room scene component (design/phone-ui/components/room-scene): a runtime source the game imports as
// it is, so its module graph, its framing, its art and its inputs are checked here; its drawing and
// lifecycle in a browser under the production headers by design/tools/room-scene-check.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sceneOf, slotsOf } from '../../../apps/game/hosted/board-v2-drawing/slots-four.mjs';
import { PRESS } from '../../../apps/game/hosted/scene-drawing/frame.mjs';
import { phoneFrame, paintedExtent, pressRects, FIGURE_CLEAR } from '../../../design/phone-ui/components/room-scene/framing.mjs';
import * as componentFraming from '../../../design/phone-ui/components/room-scene/framing.mjs';
import * as packArt from '../../../design/phone-ui/prototype/art.mjs';
import * as packIcons from '../../../design/phone-ui/prototype/icons.mjs';
import * as icons from '../../../design/phone-ui/components/icons.mjs';
import * as packAmbient from '../../../design/phone-ui/prototype/ambient.mjs';
import * as ambient from '../../../design/phone-ui/components/room-scene/ambient.mjs';
import * as packExtents from '../../../design/phone-ui/prototype/figure-extents.mjs';
import * as extents from '../../../design/phone-ui/components/room-scene/figure-extents.mjs';
import { ROOM_ART, ROOM_ART_RELEASE, roomLayers } from '../../../design/phone-ui/components/room-scene/room-art.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENTS = join(REPO, 'design/phone-ui/components');
const read = path => readFileSync(join(REPO, path), 'utf8');
const ROOMS = ['command-room', 'room-a', 'room-b', 'hospital', 'jail'];
const SIZES = { '390x844': [390, 844 - 99 - 92], '430x932': [430, 932 - 99 - 92] };

/** The static imports of a module, resolved: relative ones to files, the rest as package names. */
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

test('the component is a runtime source: its whole graph is runtime-safe and in the hosted graph', () => {
  const files = new Map([...graph(join(COMPONENTS, 'room-scene/room-scene.mjs')), ...graph(join(COMPONENTS, 'room-scene/room-scene.css'))]);
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the component's own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through crew-runtime.mjs)');
  // Every component file the graph reaches, and nothing else in the component folder outside preview/ and review/.
  for (const name of ['room-scene.mjs', 'room-scene.css', 'framing.mjs', 'figure-extents.mjs', 'ambient.mjs', 'ambient.css', 'room-art.mjs']) {
    assert.ok(local.includes(`design/phone-ui/components/room-scene/${name}`), `${name} is in the graph`);
  }
  assert.ok(local.includes('design/phone-ui/components/icons.mjs'));
});

test('one source: the pack uses the component\'s outlines and ambient layer, and its frozen framing and icons agree', () => {
  // The ambient layer and the measured outlines: the pack re-exports the component's.
  assert.equal(packAmbient.ambientLayer, ambient.ambientLayer);
  assert.equal(packAmbient.SKY_EPOCH, ambient.SKY_EPOCH);
  assert.equal(packExtents.FIGURE_EXTENTS, extents.FIGURE_EXTENTS);
  for (const path of ['ambient.mjs', 'figure-extents.mjs', 'ambient.css']) {
    assert.match(read(`design/phone-ui/prototype/${path}`), /^(\/\/|\/\*) mothership:dev-only[\s\S]*components\/room-scene\//, `the pack's ${path} only re-exports the component's`);
  }
  // art.mjs and icons.mjs are pinned byte for byte by the frozen Food release (docs/integration/
  // food-consumer-source-2026-11-13.json), so they stay as they are until Integration moves those pins;
  // then they re-export too. Until then the component's framing and icons must give exactly what they give.
  for (const name of ['EDGE_CLEAR', 'FIGURE_CLEAR']) assert.equal(packArt[name], componentFraming[name], name);
  assert.deepEqual(packArt.MOTION_ALLOWANCE, componentFraming.MOTION_ALLOWANCE);
  for (const room of ROOMS) {
    for (const roster of [7, 8, 9]) {
      const scene = sceneOf(room, roster), slots = slotsOf(room, roster);
      for (const slot of slots) for (const eliminated of [false, true]) {
        assert.deepEqual(packArt.paintedExtent({ ...slot, eliminated }), componentFraming.paintedExtent({ ...slot, eliminated }), `${room} ${slot.id}`);
      }
      for (const [width, height] of [...Object.values(SIZES), [320, 377]]) {
        for (let n = 0; n <= slots.length; n += 1) {
          const present = slots.slice(0, n).map(s => ({ ...s, eliminated: false }));
          const panel = { width, height, cap: 46, pad: 8 };
          assert.deepEqual(packArt.phoneFrame(scene, panel, present), componentFraming.phoneFrame(scene, panel, present), `${room} ${roster} ${width}×${height} ${n} present`);
        }
      }
    }
  }
  assert.deepEqual(packIcons.ICONS, icons.ICONS, 'the same icon family');
  assert.equal(packIcons.ICON_FAMILY_VERSION, icons.ICON_FAMILY_VERSION);
  for (const name of icons.ICON_NAMES) for (const filled of [false, true]) {
    assert.equal(packIcons.iconSvg(name, { filled }), icons.iconSvg(name, { filled }), `${name}${filled ? ' filled' : ''}`);
  }
  assert.doesNotMatch(read('design/phone-ui/components/icons.mjs'), /mothership:dev-only/);
  // The generator writes the outlines where the component reads them.
  assert.match(read('design/tools/phone-ui-figure-extents.mjs'), /const OUT = resolve\(REPO, 'design\/phone-ui\/components\/room-scene\/figure-extents\.mjs'\);/);
});

test('the room art is the approved release, reached through the bundles\' properties', () => {
  const manifest = JSON.parse(read('design/room-drawing/assets/manifest.json'));
  assert.equal(ROOM_ART_RELEASE, manifest.release);
  for (const room of ROOMS) {
    const art = ROOM_ART[room];
    for (const asset of manifest.assets.filter(a => a.room === room)) {
      const file = asset.path.replace('design/room-drawing/assets/', '');
      const entry = asset.kind === 'back' ? art.back : asset.kind === 'dark' ? art.dark : art.layers.find(l => l.id === asset.layer);
      assert.ok(entry, `${room} ${asset.layer}`);
      assert.equal(entry.property, asset.replaces.cssVariable);
      assert.equal(entry.file, file);
      assert.ok(existsSync(join(REPO, asset.path)), `${asset.path} exists`);
      if (asset.kind === 'layer') assert.equal(entry.depth, asset.depth);
    }
    // The room's own layers are the scene's, at the scene's depths.
    const scene = sceneOf(room, 9).layers ?? {};
    assert.deepEqual(Object.fromEntries(art.layers.map(l => [l.id, l.depth])), Object.fromEntries(Object.entries(scene).map(([id, l]) => [id, l.depth])), `${room}: the scene's layers`);
    const lit = roomLayers(room), dark = roomLayers(room, { dark: true });
    assert.equal(lit[0].id, 'back');
    assert.equal(dark.at(-1).id, 'dark');
    assert.equal(dark.at(-1).depth, 1400, 'the dark picture covers the room');
    assert.equal(dark.length, lit.length + 1);
  }
});

test('the frame: whole people, held through the dark, every place framed when opened in the dark', async () => {
  // The component's frame is phoneFrame's; held when dark; cold entry frames every place.
  const { roomSceneFrame, roomScenePlaces } = await import('../../../design/phone-ui/components/room-scene/room-scene.mjs');
  for (const [key, [width, height]] of Object.entries(SIZES)) {
    for (const room of ROOMS) {
      const slots = slotsOf(room, 9);
      const people = slots.map((slot, i) => ({ seat: i + 1, slot: slot.id, character: `c${(i % 9) + 1}`, name: `P${i + 1}`, health: 'Healthy' }));
      const state = { room, roster: 9, size: { width, height }, insets: { top: 46, bottom: 8 }, people, lighting: 'lit', hold: false };
      const lit = roomSceneFrame(state);
      const expected = phoneFrame(sceneOf(room, 9), { width, height, cap: 46, pad: 8 }, slots.map(s => ({ ...s, eliminated: false })));
      assert.deepEqual([lit.k, lit.tx, lit.ty], [expected.k, expected.tx, expected.ty], `${key} ${room}: phoneFrame`);
      // Every figure whole, 4 px inside the view; every press square whole and at least 44 px.
      for (const slot of slots) {
        const [x0, y0, x1, y1] = paintedExtent(slot);
        assert.ok(lit.tx + x0 * lit.k >= FIGURE_CLEAR - 0.5 && lit.tx + x1 * lit.k <= width - FIGURE_CLEAR + 0.5, `${key} ${room} ${slot.id}: whole across`);
        assert.ok(lit.ty + y0 * lit.k >= -0.5 && lit.ty + y1 * lit.k <= height + 0.5, `${key} ${room} ${slot.id}: whole up and down`);
      }
      for (const r of roomScenePlaces(state, lit)) {
        assert.ok(r.side >= PRESS - 0.01 && r.left >= 0 && r.left + r.side <= width + 0.01 && r.top >= 0 && r.top + r.side <= height + 0.01, `${key} ${room} ${r.id}: press square`);
      }
      // Lights out: the same frame, held; even if the board changes under it.
      const dark = roomSceneFrame({ ...state, lighting: 'dark', people: people.slice(0, 1) }, lit);
      assert.deepEqual([dark.k, dark.tx, dark.ty, dark.held], [lit.k, lit.tx, lit.ty, true], `${key} ${room}: held in the dark`);
      // A different phone size is a different frame, even in the dark.
      const resized = roomSceneFrame({ ...state, lighting: 'dark', size: { width: width - 10, height } }, lit);
      assert.equal(resized.held, false);
      // Opened in the dark with nobody to frame: every place, as if occupied.
      const cold = roomSceneFrame({ ...state, lighting: 'dark', people: [] });
      assert.equal(cold.cold, true);
      assert.deepEqual([cold.k, cold.tx, cold.ty], [expected.k, expected.tx, expected.ty], `${key} ${room}: cold entry frames every place`);
      // The press squares are the framing's own.
      assert.deepEqual(roomScenePlaces(state, lit).map(r => r.id), pressRects(room, 9, lit.panel, lit).map(r => r.id));
    }
  }
});

test('inputs: unknown rooms, rosters, lights and states are refused; seat numbers read from seat ids', async () => {
  const { seatNumber, ROOM_NAMES, ROOM_SCENE_DEFAULTS } = await import('../../../design/phone-ui/components/room-scene/room-scene.mjs');
  assert.deepEqual(Object.keys(ROOM_NAMES).sort(), [...ROOMS].sort());
  assert.equal(seatNumber({ seat: 'seat-4' }), 4);
  assert.equal(seatNumber({ seat: 7 }), 7);
  assert.equal(seatNumber({ seat: 'seat-4', number: 9 }), 9);
  assert.equal(ROOM_SCENE_DEFAULTS.lighting, 'lit');
  assert.equal(ROOM_SCENE_DEFAULTS.status, 'live');
  assert.equal(ROOM_SCENE_DEFAULTS.clock, null, 'no clock is a still voyage');
  const source = read('design/phone-ui/components/room-scene/room-scene.mjs');
  for (const refusal of ['Unknown room', 'A roster is 7, 8 or 9 players', 'A room scene needs a positive size', 'Lighting is lit or dark', 'Status is', 'A clock is null or has now()']) {
    assert.ok(source.includes(refusal), refusal);
  }
});

test('the check\'s record: every capture passed under the production headers, at both phone sizes', () => {
  const record = JSON.parse(read('design/phone-ui/components/room-scene/review/check.json'));
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /img-src 'self' data:/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 20);
  for (const [key, c] of captures) {
    assert.ok(c.ok, `${key} passed`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
  }
  for (const size of Object.keys(SIZES)) {
    assert.ok(record.captures[`${size}/lit`].figures > 0 && record.captures[`${size}/lit`].tags === 4, `${size}: Room B's four people`);
    assert.equal(record.captures[`${size}/dark`].tags, 0, `${size}: nobody shown in the dark`);
    assert.ok(record.captures[`${size}/dark`].layout.held, `${size}: the lit frame held in the dark`);
    assert.ok(record.captures[`${size}/cold`].layout.cold, `${size}: opened in the dark, every place framed`);
    assert.equal(record.captures[`${size}/concealed`].figures + record.captures[`${size}/concealed`].tags, 0, `${size}: nothing shown concealed`);
    assert.equal(record.captures[`${size}/concealed`].art.length, 0, `${size}: concealed loads no picture`);
  }
});
