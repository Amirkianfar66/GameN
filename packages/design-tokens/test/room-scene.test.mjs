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
/** A place's press square, without the frame it was worked out from. */
const squares = rects => rects.map(({ id, left, top, side, press }) => ({ id, left, top, side, press }));

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
  for (const name of ['room-scene.mjs', 'room-scene.css', 'framing.mjs', 'figure-extents.mjs', 'ambient.mjs', 'ambient.css', 'room-art.mjs', 'room-extension.mjs']) {
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
      // Held, a new size or new insets move nothing: the frame, its panel and every press square stay.
      const resized = roomSceneFrame({ ...state, lighting: 'dark', size: { width: width + 40, height: height + 88 }, insets: { top: 60, bottom: 20 } }, dark);
      assert.deepEqual([resized.k, resized.tx, resized.ty, resized.held, resized.panel], [lit.k, lit.tx, lit.ty, true, lit.panel], `${key} ${room}: held through a resize`);
      assert.deepEqual(squares(roomScenePlaces({ ...state, size: { width: width + 40, height: height + 88 } }, resized)), squares(roomScenePlaces(state, lit)), `${key} ${room}: the press squares stay`);
      // Opened in the dark with nobody to frame: every place, as if occupied.
      const cold = roomSceneFrame({ ...state, lighting: 'dark', people: [] });
      assert.equal(cold.cold, true);
      assert.deepEqual([cold.k, cold.tx, cold.ty], [expected.k, expected.tx, expected.ty], `${key} ${room}: cold entry frames every place`);
      // The press squares are the framing's own.
      assert.deepEqual(roomScenePlaces(state, lit).map(r => r.id), pressRects(room, 9, lit.panel, lit).map(r => r.id));
    }
  }
});

test('a fifth wider (the owner, 11 November 2026): with the approved pictures, everyone whole and the view covered', async () => {
  const { roomSceneFrame } = await import('../../../design/phone-ui/components/room-scene/room-scene.mjs');
  const { REACH, WIDER, zoomFor } = await import('../../../design/phone-ui/components/room-scene/room-extension.mjs');
  assert.deepEqual({ ...WIDER }, { [ROOM_ART_RELEASE]: 0.8 }, 'only the approved pictures are framed wider');
  assert.equal(zoomFor(null), 1);
  assert.equal(zoomFor('design-0.9.0'), 1, 'older art keeps the pack\'s framing');
  for (const room of ROOMS) {
    for (const roster of [7, 8, 9]) {
      const scene = sceneOf(room, roster), slots = slotsOf(room, roster);
      for (const [width, height] of [...Object.values(SIZES), [320, 377]]) {
        const panel = { width, height, cap: 46, pad: 8 };
        const [ix0, iy0, ix1, iy1] = scene.inner ?? [0, 0, 1024, 768];
        const fill = Math.max(width / (ix1 - ix0), height / (iy1 - iy0));
        for (let n = 0; n <= slots.length; n += 1) {
          const present = slots.slice(0, n).map(s => ({ ...s, eliminated: false }));
          const at = `${room} ${roster} ${width}×${height} ${n} present`;
          const today = phoneFrame(scene, panel, present);
          const wide = phoneFrame(scene, panel, present, { zoom: 0.8, reach: REACH });
          // The scale: the filled view's times 0.8, unless the people already zoomed it out further.
          assert.ok(Math.abs(wide.k - Math.min(today.k, fill * 0.8)) < 1e-9, `${at}: k`);
          // Everyone present whole, 4 px inside the view; every press square whole and at least 44 px.
          for (const slot of present) {
            const [x0, y0, x1, y1] = paintedExtent(slot);
            assert.ok(wide.tx + x0 * wide.k >= FIGURE_CLEAR - 0.5 && wide.tx + x1 * wide.k <= width - FIGURE_CLEAR + 0.5, `${at} ${slot.id}: whole across`);
            assert.ok(wide.ty + y0 * wide.k >= -0.5 && wide.ty + y1 * wide.k <= height + 0.5, `${at} ${slot.id}: whole up and down`);
          }
          for (const r of pressRects(room, roster, panel, wide)) {
            assert.ok(r.side >= PRESS - 0.01 && r.left >= 0 && r.left + r.side <= width + 0.01 && r.top >= 0 && r.top + r.side <= height + 0.01, `${at} ${r.id}: press square`);
          }
          // The view is covered: across by the picture, up and down by the picture and its extension.
          assert.ok(wide.tx <= 0.5 && wide.tx + 1024 * wide.k >= width - 0.5, `${at}: covered across`);
          assert.ok(wide.ty <= REACH * wide.k + 0.5 && wide.ty + (768 + REACH) * wide.k >= height - 0.5, `${at}: covered up and down`);
        }
      }
    }
  }
  // The component frames a match on the approved pictures a fifth wider, older art as the pack does,
  // and a change of art is a new frame, even within a Blackout window.
  const state = { room: 'room-b', roster: 9, size: { width: 390, height: 653 }, insets: { top: 46, bottom: 8 }, people: [], lighting: 'lit', hold: null };
  const old = roomSceneFrame({ ...state, roomArt: null });
  const wide = roomSceneFrame({ ...state, roomArt: ROOM_ART_RELEASE });
  assert.deepEqual([old.zoom, wide.zoom], [1, 0.8]);
  assert.ok(wide.k < old.k);
  const held = roomSceneFrame({ ...state, roomArt: ROOM_ART_RELEASE, hold: 'blackout-1', lighting: 'dark' }, old);
  assert.deepEqual([held.held, held.zoom], [false, 0.8]);
});

test('the extension pictures: lit and lights out for every room, the component\'s own, by the bundles\' properties', async () => {
  const { REACH, ROOM_EXTENSION, extensionLayer } = await import('../../../design/phone-ui/components/room-scene/room-extension.mjs');
  assert.deepEqual(Object.keys(ROOM_EXTENSION).sort(), [...ROOMS].sort());
  for (const room of ROOMS) {
    for (const [kind, art] of Object.entries(ROOM_EXTENSION[room])) {
      assert.equal(art.property, `--bm-scene-${room}-${kind === 'lit' ? 'extend' : 'extend-dark'}`);
      const svg = read(`design/phone-ui/components/room-scene/assets/${art.file}`);
      assert.match(svg, new RegExp(`^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -${REACH} 1024 ${768 + 2 * REACH}"`), `${art.file}: the picture's box and ${REACH} each way`);
      assert.match(svg, /Written by design\/tools\/room-scene-extend\.mjs/, `${art.file}: written by the tool`);
      assert.doesNotMatch(svg, /mothership:dev-only|<script|href="http/, `${art.file}: a runtime picture, nothing fetched`);
      assert.equal((svg.match(/data-band="(top|bottom)"/g) ?? []).length, 2, `${art.file}: a ceiling and a deck`);
    }
    // Drawn just over the picture it continues: the back picture lit, the lights-out one in the dark.
    assert.equal(2 * extensionLayer(room).depth + 1, 2 * -1000 + 2);
    assert.equal(2 * extensionLayer(room, { dark: true }).depth + 1, 2 * 1400 + 2);
  }
});

test('a Blackout window holds one frame, lit and dark, through any resize, until it ends', async () => {
  const { roomSceneFrame, roomScenePlaces } = await import('../../../design/phone-ui/components/room-scene/room-scene.mjs');
  const room = 'room-b', slots = slotsOf(room, 9);
  const people = slots.slice(0, 4).map((slot, i) => ({ seat: i + 1, slot: slot.id, character: `c${i + 1}`, name: `P${i + 1}`, health: 'Healthy' }));
  const small = { width: 390, height: 653 }, large = { width: 430, height: 741 };
  const at = (size, more = {}) => ({ room, roster: 9, size, insets: { top: 46, bottom: 8 }, people, lighting: 'lit', hold: null, ...more });
  const geometry = (state, frame) => ({ k: frame.k, tx: frame.tx, ty: frame.ty, panel: frame.panel, places: squares(roomScenePlaces(state, frame)) });
  const expect = (size, shown = people) => phoneFrame(sceneOf(room, 9), { ...size, cap: 46, pad: 8 },
    shown.map(p => ({ ...slots.find(s => s.id === p.slot), eliminated: false })));

  // Lit, no hold: framed for who is there, in the current size.
  const lit = roomSceneFrame(at(small));
  assert.deepEqual([lit.k, lit.tx, lit.ty], [expect(small).k, expect(small).tx, expect(small).ty]);
  // The window begins lit (its 5 s preview): the room as it is then, and from here on held.
  const begins = roomSceneFrame(at(small, { hold: 'blackout-3' }), lit);
  assert.deepEqual(geometry(at(small), begins), geometry(at(small), lit));
  assert.equal(begins.window, 'blackout-3');
  // 390 × 653 → 430 × 741 in the same window, lit and then dark, and new insets: nothing moves.
  let frame = begins;
  for (const step of [at(large, { hold: 'blackout-3' }), at(large, { hold: 'blackout-3', lighting: 'dark', people: [] }),
    at(small, { hold: 'blackout-3', lighting: 'dark', insets: { top: 80, bottom: 30 } }), at(large, { hold: 'blackout-3', people: people.slice(0, 1) }),
    at(large, { hold: true }), at(large, { hold: null, lighting: 'dark' })]) {
    frame = roomSceneFrame(step, frame);
    assert.equal(frame.held, true, JSON.stringify([step.size, step.hold, step.lighting]));
    assert.deepEqual(geometry(step, frame), geometry(at(small), lit), JSON.stringify([step.size, step.hold, step.lighting]));
    assert.equal(frame.window, 'blackout-3', 'the window keeps its name');
  }
  // The window ends (no hold, lights on): framed again in the current size.
  const after = roomSceneFrame(at(large), frame);
  assert.equal(after.held, false);
  assert.deepEqual([after.k, after.tx, after.ty, after.panel.width], [expect(large).k, expect(large).tx, expect(large).ty, 430]);
  assert.notDeepEqual(geometry(at(large), after).places, geometry(at(small), lit).places);
  // A differently named window is a new hold; the same name is the same hold.
  const one = roomSceneFrame(at(large, { hold: 'blackout-4', lighting: 'dark' }), roomSceneFrame(at(small, { hold: 'blackout-3' }), lit));
  assert.equal(one.held, false, 'a new window frames afresh');
  assert.equal(roomSceneFrame(at(large, { hold: 'blackout-4', lighting: 'dark' }), one).held, true);
  // A different room, or roster, frames afresh even within a window.
  const moved = roomSceneFrame({ ...at(small, { hold: 'blackout-3', lighting: 'dark', people: [] }), room: 'room-a' }, begins);
  assert.equal(moved.held, false);
  assert.equal(moved.cold, true, 'entered in the dark with nobody given: every place');
  assert.equal(roomSceneFrame({ ...at(small, { hold: 'blackout-3' }), roster: 8 }, begins).held, false);
  // The lights going out with no window named keeps the last lit frame; a hold that begins lit with new
  // people frames them, not the frame before.
  assert.equal(roomSceneFrame(at(large, { lighting: 'dark' }), lit).held, true);
  const joined = roomSceneFrame(at(small, { hold: 'blackout-5', people: people.slice(0, 2) }), lit);
  assert.equal(joined.held, false);
  assert.deepEqual([joined.k, joined.tx, joined.ty], [expect(small, people.slice(0, 2)).k, expect(small, people.slice(0, 2)).tx, expect(small, people.slice(0, 2)).ty]);
});

test('0.4.0: stand-ins and the recoil are plain inputs, checked on the way in', async () => {
  const { nextRoomSceneInput, ROOM_SCENE_DEFAULTS, ROOM_SCENE_VERSION } = await import('../../../design/phone-ui/components/room-scene/room-scene.mjs');
  assert.equal(ROOM_SCENE_VERSION, 'room-scene-0.4.0');
  assert.deepEqual([ROOM_SCENE_DEFAULTS.standIns, ROOM_SCENE_DEFAULTS.brace], [[], null]);
  const next = nextRoomSceneInput(ROOM_SCENE_DEFAULTS, { standIns: ['seat-4', 6], brace: { seat: 'seat-4', dx: 6, dy: -3, extra: true } });
  assert.deepEqual(next.standIns, ['seat-4', 6]);
  assert.deepEqual(next.brace, { seat: 'seat-4', dx: 6, dy: -3 }, 'only the seat and the offset are kept');
  assert.deepEqual([nextRoomSceneInput(next, { standIns: null }).standIns, nextRoomSceneInput(next, { brace: null }).brace], [[], null]);
  for (const bad of [{ standIns: 'seat-4' }, { standIns: { seat: 4 } }, { brace: { seat: 4, dx: Number.NaN, dy: 0 } }, { brace: { dx: 1, dy: 1 } }, { brace: 4 }]) {
    assert.throws(() => nextRoomSceneInput(ROOM_SCENE_DEFAULTS, bad), TypeError, JSON.stringify(bad));
  }
});

test('the offers and the room\'s control are this viewer\'s: dropped when concealed or when the viewer changes', async () => {
  const { nextRoomSceneInput, ROOM_SCENE_DEFAULTS } = await import('../../../design/phone-ui/components/room-scene/room-scene.mjs');
  const targets = { seats: [3, 6], picked: [6] }, control = { id: 'windows', label: 'Windows · 2', icon: 'window' };
  const shown = nextRoomSceneInput(ROOM_SCENE_DEFAULTS, { room: 'room-b', self: 4, targets, control });
  assert.deepEqual([shown.targets, shown.control], [targets, control]);
  // Ordinary updates keep them; the same viewer, as a number or a string, is the same viewer.
  assert.deepEqual(nextRoomSceneInput(shown, { active: 6 }).targets, targets);
  assert.deepEqual(nextRoomSceneInput(shown, { self: '4' }).targets, targets);
  // Concealed: gone, and not kept for when the scene shows again.
  const concealed = nextRoomSceneInput(shown, { status: 'concealed' });
  assert.deepEqual([concealed.targets, concealed.control], [null, null]);
  assert.deepEqual([nextRoomSceneInput(concealed, { status: 'live' }).targets, nextRoomSceneInput(concealed, { status: 'live' }).control], [null, null]);
  assert.deepEqual(nextRoomSceneInput(concealed, { targets, control }).targets, null, 'nothing offered while concealed');
  // A new viewer (another seat, or none: a shared display) loses the previous viewer's offers...
  for (const self of [5, null]) {
    const next = nextRoomSceneInput(shown, { self });
    assert.deepEqual([next.targets, next.control], [null, null], `self ${self}`);
  }
  // ...unless the same update gives the new viewer's own.
  const own = { seats: [2], picked: [] };
  assert.deepEqual(nextRoomSceneInput(shown, { self: 5, targets: own }).targets, own);
  assert.throws(() => nextRoomSceneInput(shown, { hold: 3 }), /hold is a Blackout window's id, true, or null/);
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
  for (const refusal of ['Unknown room', 'A roster is 7, 8 or 9 players', 'A room scene needs a positive size', 'Lighting is lit or dark', 'Status is', 'A clock is null or has now()', 'roomArt is a room-art release, or null']) {
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
  assert.equal(captures.length, 22);
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
    // The approved pictures, a fifth wider with their extension; older art as the pack frames it.
    assert.equal(record.captures[`${size}/lit`].layout.zoom, 0.8, `${size}: lit, a fifth wider`);
    assert.ok(record.captures[`${size}/lit`].layers.includes('extend'), `${size}: lit, the extension`);
    assert.ok(record.captures[`${size}/dark`].layers.includes('extend-dark'), `${size}: dark, the lights-out extension`);
    assert.equal(record.captures[`${size}/today`].layout.zoom, 1, `${size}: older art, the pack's framing`);
    assert.ok(!record.captures[`${size}/today`].layers.some(l => l.startsWith('extend')), `${size}: older art, no extension`);
  }
  // The lifecycle probe (preview/probe.mjs), in the same bundle under the same headers: as the page
  // comes, and with the device's Reduce motion emulated. Every check passed, and none is missing.
  const probe = record.probe ?? {};
  assert.deepEqual(Object.keys(probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(probe)) {
    assert.ok(run.ok && run.mode === mode, `probe ${mode} passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page error or failed request`);
    assert.ok(run.violations.every(v => v.kind.startsWith('known:')), `probe ${mode}: no unexpected policy report`);
    for (const c of run.checks) assert.ok(c.ok, `probe ${mode}: ${c.id}`);
  }
  const groups = probe.full.checks.map(c => c.id.split(':')[0]);
  for (const [group, count] of Object.entries({ held: 2, private: 6, time: 11, focus: 3, films: 3 })) {
    assert.equal(groups.filter(g => g === group).length, count, `probe: the ${group} checks`);
  }
  assert.deepEqual(probe['device-reduced'].checks.map(c => c.id.split(':')[0]), ['device-reduced']);
  assert.deepEqual(probe['device-reduced'].emulated, { 'prefers-reduced-motion': 'reduce' });
});
