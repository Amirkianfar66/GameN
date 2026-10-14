import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { ART_BUNDLES, bundlesFor } from '../hosted/art.mjs';
import { comicAssetsPlugin, TRIAL_ART } from '../hosted/comic-assets.mjs';
import { capacityLabel, publicSceneSeats, scenePressAreasFit } from '../hosted/scene-board.mjs';
import { placements, LOCATION_OF } from '../hosted/scene-drawing/layout.mjs';
import { createComicMotion } from '../hosted/comic-motion.mjs';
import { motionDom } from './support/comic-motion-dom.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const roster = (count, room) => Array.from({ length: count }, (_, index) => ({ n: index + 1, location: LOCATION_OF[room], health: index === 2 ? 'Eliminated' : index === 5 ? 'Injured' : 'Healthy', captain: index === 0 }));
test('ported drawing bytes and generated bundles match their reviewed source hashes; host/display request public bundles only', () => {
  const proof = JSON.parse(readFileSync(join(root, 'docs/frontend/scene-drawing-provenance.json')));
  assert.equal(proof.sourceCommit, '49f0db4d34d2a2a418f669a13bed660fc665b1b6');
  assert.equal(proof.styleSourceCommit, 'd87163358ea85878fd3e9e4ffb347c4e71d6de5d');
  for (const [path, hash] of Object.entries(proof.sources)) assert.equal(digest(readFileSync(join(root, path))), hash, path);
  for (const [file, pin] of Object.entries(proof.ports)) assert.equal(digest(readFileSync(join(root, 'apps/game/hosted/scene-drawing', file))), pin.sha256, file);
  for (const [file, pin] of Object.entries(proof.styles)) assert.equal(digest(readFileSync(join(root, 'apps/game/hosted', file))), pin.sha256, file);
  const emitted = [];
  comicAssetsPlugin(root).buildStart.call({ emitFile: asset => emitted.push(asset) });
  assert.equal(emitted.length, 8);
  const boardV2 = emitted.find(asset => asset.fileName === 'art/board-v2.art.5dedbf2450.css');
  assert.ok(boardV2, 'The uniform reviewed Board V2 supplement is emitted independently of the five historical bundles');
  assert.equal(createHash('sha256').update(boardV2.source).digest('hex'), '5dedbf2450adca159480d3ba448501ce6957595f1a018c5ced4d9d17f5031cd2');
  for (const [name, hash] of [
    ['art/setup.art.f196649c9c.css', 'f196649c9c117d402ac1ee2483870be279f7a347c823c0175b0caa07be9ebe15'],
    ['art/board-v2-motion.art.7793869d6b.css', '7793869d6bef7d4a851ba5d5aa12e686544c3ae3f842409ac70598d864532677'],
  ]) assert.equal(digest(emitted.find(asset => asset.fileName === name).source), hash, name);
  for (const name of ['scene-art', 'abilities']) {
    const bundle = emitted.find(asset => asset.fileName === ART_BUNDLES[name].slice(1));
    assert.equal(digest(bundle.source), TRIAL_ART[name].runtimeHash);
    assert.doesNotMatch(bundle.source, /mothership:dev-only/);
  }
  for (const device of ['host', 'display']) assert.deepEqual(bundlesFor(device), ['public-board', 'scene-art']);
  assert.deepEqual(bundlesFor('player', { abilities: false, scenes: false }), ['public-board', 'player-ui', 'roles']);
});
test('allocation is pure for the same public snapshot and legacy 6–9 occupancy retains every seat in every room', () => {
  for (const room of Object.keys(LOCATION_OF)) for (let count = 1; count <= 9; count += 1) {
    const seats = roster(count, room);
    const first = placements(seats);
    assert.equal(first.size, count, `${room}/${count}`);
    assert.equal(new Set([...first.values()].map(place => place.place)).size, count);
    assert.deepEqual([...placements([...seats].reverse())], [...first]);
    assert.deepEqual([...placements([...seats].map(seat => ({ ...seat, role: 'Hacker', privateTarget: 1 })))], [...first], 'private additions cannot change public places');
    if (count > 5 || room === 'command-room' && count > 1) assert.ok([...first.values()].every(place => place.kind === 'crowd' || place.kind === 'final'));
    const offered = [...first.values()];
    let height = 94;
    while (height < 900 && !scenePressAreasFit(offered, { width: room === 'command-room' || room === 'final-zone' ? 306 : 141, height, cap: 44, pad: 6 })) height += 2;
    assert.ok(height < 900, `${room}/${count}: all offered seats can be made reachable`);
  }
  const model = { screen: 'match', match: { roster: { zones: [{ id: 'room-a', seats: [{ seatId: 'seat-3', number: 3, health: 'Healthy', captain: false, role: 'Insider' }] }] }, privateArea: { secret: 'anything' } } };
  assert.deepEqual(publicSceneSeats(model), [{ n: 3, location: 'Room A', health: 'Healthy', captain: false }]);
});
test('FULL labels require exact capped gameplay tuples, include Eliminated occupancy, and never change offers', () => {
  const versions = { protocolVersion: 2, engineVersion: 'full-game-1.3.0', rulesetVersion: 'in-person-v1-capacity-resolution-2026-10-12', rulesetHash: 'aef288266055bfc6f9905b97ba3262400044af84c689dbcc4a979e544bdf2b1e' };
  assert.equal(capacityLabel(versions, 'Room A', 5), 'FULL');
  assert.equal(capacityLabel(versions, 'Room A', 4), null);
  assert.equal(capacityLabel(versions, 'Command Room', 1), 'FULL');
  assert.equal(capacityLabel(versions, 'Final Zone', 9), null);
  assert.equal(capacityLabel({ ...versions, rulesetHash: 'a'.repeat(64) }, 'Room A', 9), null);
  assert.equal(capacityLabel({ ...versions, protocolVersion: 1 }, 'Room A', 9), null);
  assert.equal(capacityLabel({ ...versions, engineVersion: 'full-game-1.1.0' }, 'Room A', 9), null);
});

const modelAt = (room, health = 'Healthy') => ({ screen: 'match', connection: 'live', motion: 'full', match: { phase: { roundLabel: 'Round 2', phaseLabel: 'Your turn' }, roster: { zones: [{ id: room, seats: [{ seatId: 'seat-1', health, jailed: false, captain: false, markers: [] }] }, { id: 'hospital', seats: [{ seatId: 'seat-2', health: 'Healthy', jailed: false, captain: false, markers: [] }] }] } } });
test('move Injured then immediate Healthy cancels RAF/native travel and never restores a captured old pose', t => {
  const dom = motionDom(t, { scene: true });
  dom.redraw('room-a', { health: 'Injured' });
  const motion = createComicMotion(dom.root, { fx: dom.fx, now: () => 0 }); t.after(() => motion.dispose());
  motion.after(modelAt('room-a', 'Injured'), motion.before());
  const before = motion.before(); dom.redraw('room-b', { health: 'Injured' });
  motion.after(modelAt('room-b', 'Injured'), before);
  assert.equal(dom.frames.size, 1); assert.equal(dom.fx.children.length, 3);
  const old = motion.before(); dom.redraw('room-b', { health: 'Healthy' });
  motion.after(modelAt('room-b', 'Healthy'), old);
  const body = dom.piece('seat-1').querySelector('.ms-token');
  assert.equal(body.dataset.figure, 'c1|tablet'); assert.equal(body.innerHTML, 'latest authoritative tablet');
  assert.equal(dom.frames.size, 0); assert.equal(dom.fx.children.length, 0);
  assert.equal(dom.piece('seat-1').dataset.moving, undefined);
  dom.frame(performance.now() + 5_000); t.mock.timers.tick(5_000);
  assert.equal(body.innerHTML, 'latest authoritative tablet');
  motion.dispose();
});
for (const reason of ['OS reduction without a redraw', 'resize during flight']) test(`${reason} cancels full-body travel; later facts work and disposal unsubscribes`, t => {
  const dom = motionDom(t, { scene: true });
  const motion = createComicMotion(dom.root, { fx: dom.fx, now: () => 0 });
  motion.after(modelAt('room-a'), motion.before());
  const before = motion.before(); dom.redraw('room-b'); motion.after(modelAt('room-b'), before);
  assert.equal(dom.frames.size, 1);
  if (reason.startsWith('OS')) dom.deviceReduced(true); else motion.settle();
  assert.equal(dom.frames.size, 0); assert.equal(dom.fx.children.length, 0);
  assert.equal(dom.piece('seat-1').querySelector('.ms-token').dataset.figure, 'c1|tablet');
  assert.equal(dom.piece('seat-1').dataset.moving, undefined);
  dom.deviceReduced(false); assert.deepEqual(motion.after(modelAt('room-b'), motion.before()), []);
  const later = motion.before(); dom.redraw('room-a'); motion.after(modelAt('room-a'), later); assert.equal(dom.frames.size, 1);
  motion.dispose(); motion.dispose(); assert.equal(dom.frames.size, 0); assert.equal(dom.fx.children.length, 0); assert.equal(dom.mediaListeners.size, 0);
  assert.deepEqual(motion.after(modelAt('room-b'), motion.before()), []);
});
