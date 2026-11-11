// mothership:dev-only
//
// Ship life (docs/design/ship-life.md): activities at the twenty places, wider room framings, local
// food capsules and the visit to them, a design proposal in no release. These tests hold what the
// package promises:
//  - every place has its activity, built from its own resting gesture, deterministic, finite, back
//    at rest at the end of every cycle; the Hospital's patients only rest; C1 and J2 say what they
//    never show;
//  - four rooms have a capsule and the Hospital none; each device sits inside its picture, its visitor
//    stands beside it, never in front of the hatch, and every walk stays on the room's picture;
//  - a visit from every place, of every kind, is 5 to 8 seconds, opens and shuts the hatch, takes a
//    portion only when there is one, and ends at the place it began, in its resting pose;
//  - the scheduler keeps the after-turn order, never puts two visitors at a capsule, shortens or drops
//    a long wait, plays nothing for unknown availability, the Hospital, the Eliminated or Reduce
//    motion, stops a visit for a real event and drops one still waiting for the capsule, and never
//    replays one (coming back, only a visit under way, recently begun and not stopped);
//  - today's framing is the phone pack's own (its phoneFrame, given the pack's own outlines), each
//    present figure whole doing its activity; a wider one keeps 44-pixel press areas and every figure
//    whole and, a fifth wider, every capsule in view on the pack's phones; each activity's measured
//    outline was measured from the drawing as it is;
//  - the capsule's states differ (unknown never draws as empty); the extensions and the handoff record
//    are what the tools write; every file carries the development-only mark and nothing in the game's
//    code refers to the package.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { POINTS } from '../../../design/board-motion/figures/body.mjs';
import { skeletonOf } from '../../../design/board-motion/figures/gestures.mjs';
import { ROOMS, FAMILIES, roomOf } from '../../../design/room-pilot/rooms.mjs';
import { BUILDERS, activityAt, activityTimeline } from '../../../design/ship-life/activities.mjs';
import { STATES, capsuleSvg } from '../../../design/ship-life/capsule.mjs';
import { KINDS, storyboard, visitAt, visitTimeline } from '../../../design/ship-life/eating.mjs';
import { REACH, extensionSvg } from '../../../design/ship-life/extend.mjs';
import { FIGURE_CLEAR, ZOOMS, activityOutline, pressRects, roomFrame } from '../../../design/ship-life/framing.mjs';
import { ACTIVITY_EXTENTS, ACTIVITY_EXTENTS_SOURCES } from '../../../design/ship-life/activity-extents.mjs';
import { ACTIVITIES, CAPSULES, EATING_ROOMS, PLACE_ORDER } from '../../../design/ship-life/positions.mjs';
import { CANCEL_MS, WAIT, onResume, planRoom, visitKey } from '../../../design/ship-life/schedule.mjs';
import { paintedExtent, phoneFrame } from '../../../design/phone-ui/prototype/art.mjs';
import { slotGeometry } from '../../../design/board-motion/scenes/frame.mjs';

const root = new URL('../../../', import.meta.url);
const text = path => readFileSync(new URL(path, root), 'utf8');
const slotOf = id => ROOMS.find(r => r.id === ACTIVITIES[id].room).scene.slots.find(s => s.id === id);
const inPicture = ([x, y]) => x >= 20 && x <= 1004 && y >= 20 && y <= 768;
const PHONES = [[320, 568, 20, 0], [390, 844, 47, 34], [430, 932, 47, 34]];
const panelOf = ([w, h, top, bottom]) => ({ width: w, height: h - top - 52 - bottom - 58, cap: 46, pad: 8 });

test('every one of the twenty places has its activity, from its own resting gesture, deterministic and back at rest', () => {
  assert.equal(PLACE_ORDER.length, 20);
  for (const id of PLACE_ORDER) {
    assert.ok(BUILDERS[id]?.build, `${id} has a builder`);
    const slot = slotOf(id);
    assert.ok(slot, `${id} is a place of its room`);
    const a = activityTimeline(id, slot.gesture, { until: 30000 });
    const b = activityTimeline(id, slot.gesture, { until: 30000 });
    assert.deepEqual(a.keys.map(k => k.at), b.keys.map(k => k.at), `${id}: the same seat, the same activity`);
    assert.ok(a.keys.length > 4 && a.keys.length < 400, `${id}: a finite timeline`);
    for (let i = 1; i < a.keys.length; i += 1) assert.ok(a.keys[i].at >= a.keys[i - 1].at, `${id}: keys in time order`);
    assert.equal(a.keys.at(-1).sk, a.rest, `${id}: ends at rest`);
    for (const key of a.keys) for (const joint of POINTS) assert.ok(Array.isArray(key.sk[joint]) && key.sk[joint].every(Number.isFinite), `${id}: ${joint} at ${key.at}`);
    // Two seats at one place are out of step.
    const other = activityTimeline(id, slot.gesture, { seat: 1, until: 30000 });
    if (a.keys.length > 2) assert.notDeepEqual(other.keys.slice(0, 4).map(k => Math.round(k.at)), a.keys.slice(0, 4).map(k => Math.round(k.at)), `${id}: seats out of step`);
    // Reduce motion: the resting pose and nothing held.
    const still = activityAt(a, 5000, { reduced: true });
    assert.equal(still.sk, a.rest);
    assert.deepEqual(still.props, {});
    // The activity keeps the place's gesture marks: an Injured character keeps the bandage.
    const injured = activityTimeline(id, `${slot.gesture}+injured`, { until: 12000 });
    assert.ok(injured.keys.every(k => k.sk.bandage === true), `${id}: the bandage stays through the activity`);
  }
  for (const id of ['H1', 'H2', 'H3', 'H4']) assert.equal(ACTIVITIES[id].rests, true, `${id} only rests`);
  assert.match(ACTIVITIES.C1.never, /direction|course|navigation/);
  assert.match(ACTIVITIES.J2.never, /escape/);
});

test('four rooms have a food capsule and the Hospital none; each is in its picture, its visitor beside it', () => {
  assert.deepEqual([...EATING_ROOMS].sort(), ['command-room', 'jail', 'room-a', 'room-b']);
  assert.equal(CAPSULES.hospital, undefined);
  for (const room of EATING_ROOMS) {
    const c = CAPSULES[room];
    const [x, y, w, h] = c.box, [hx, hy, hw, hh] = c.hatch;
    assert.ok(inPicture([x, y]) && inPicture([x + w, y + h]), `${room}: the device is in the picture`);
    assert.ok(hx >= x && hy >= y && hx + hw <= x + w && hy + hh <= y + h, `${room}: the hatch is in the device`);
    assert.ok(['wall', 'counter', 'hatch'].includes(c.kind));
    assert.equal(room === 'jail', c.kind === 'hatch', 'the Jail\'s is a ration hatch');
    // The visitor's body (about 23 units either side of the spot, at its scale) clears the hatch.
    const half = 23 * c.scale;
    assert.ok(c.spot[0] - half >= hx + hw || c.spot[0] + half <= hx, `${room}: the visitor stands beside the hatch, not in front of it`);
    for (const path of Object.values(c.paths ?? {})) for (const point of path) assert.ok(inPicture(point), `${room}: a walk stays on the picture`);
  }
});

test('a visit from every place of a room with a capsule, of every kind: 5 to 8 seconds, the hatch opened and shut, home at the end', () => {
  for (const room of EATING_ROOMS) {
    for (const slot of roomOf(room).scene.slots) {
      for (const kind of KINDS) {
        const v = visitTimeline(slot, CAPSULES[room], { kind, start: 1000 });
        const ms = v.end - v.start;
        // The full visit and the empty one take 5 to 8 seconds; a brief one is shorter by design.
        assert.ok(ms >= (kind === 'brief' ? 4000 : 5000) && ms <= 8000, `${room} ${slot.id} ${kind}: ${ms} ms`);
        assert.ok(v.hatch.some(h => h.open === 1) && v.hatch.at(-1).open === 0, `${slot.id} ${kind}: the hatch opens and shuts`);
        assert.equal(v.tray[0].portion, kind !== 'empty', `${slot.id} ${kind}: a portion only when stocked`);
        if (kind === 'empty') assert.ok(!v.props.some(p => p.props?.portion), 'nothing is eaten from an empty capsule');
        const end = visitAt(v, v.end);
        assert.deepEqual(end.pos, slot.at, `${slot.id}: back at the place`);
        assert.equal(end.sk, skeletonOf(slot.gesture), `${slot.id}: in its resting pose`);
        assert.ok(v.atCapsule[0] > v.start && v.atCapsule[1] > v.atCapsule[0] && v.atCapsule[1] < v.end);
        for (let t = v.start; t <= v.end; t += 97) assert.ok(inPicture(visitAt(v, t).pos), `${slot.id} ${kind}: on the picture at ${t}`);
        assert.ok(storyboard(v).length >= 7, 'a storyboard of its beats');
      }
    }
  }
  assert.throws(() => visitTimeline(roomOf('room-a').scene.slots[0], CAPSULES['room-a'], { kind: 'unknown' }));
});

test('the scheduler: after-turn order, one visitor at a capsule, long waits shortened or dropped, nothing that must not play', () => {
  const r = roomOf('room-a');
  const slot = id => r.scene.slots.find(s => s.id === id);
  const turns = [{ seat: 1, place: slot('A1'), at: 1000 }, { seat: 4, place: slot('A4'), at: 2400 }, { seat: 2, place: slot('A2'), at: 3600 }, { seat: 3, place: slot('A3'), at: 4000 }, { seat: 5, place: slot('A5'), at: 4100 }];
  const { visits, none } = planRoom(turns, { capsule: CAPSULES['room-a'], availability: 'stocked' });
  assert.deepEqual(visits.map(v => v.seat), visits.map(v => v.seat).slice().sort((a, b) => turns.findIndex(t => t.seat === a) - turns.findIndex(t => t.seat === b)), 'in the order turns end');
  for (let i = 1; i < visits.length; i += 1) assert.ok(visits[i].timeline.atCapsule[0] >= visits[i - 1].timeline.atCapsule[1] - 1, 'never two at the capsule');
  for (const v of visits) {
    if (v.waited > WAIT.full) assert.equal(v.kind, 'brief', 'a long wait makes a brief visit');
    assert.ok(v.waited <= WAIT.skip);
  }
  assert.ok(visits.length + none.length === turns.length);
  assert.ok(none.every(n => /in use/.test(n.why)), 'a turn plays nothing only when the wait is too long');
  const quiet = [
    planRoom(turns, { capsule: CAPSULES['room-a'], availability: 'unknown' }),
    planRoom(turns, { capsule: null, availability: 'stocked' }),
    planRoom(turns, { capsule: CAPSULES['room-a'], availability: 'stocked', reduced: true }),
  ];
  for (const plan of quiet) assert.equal(plan.visits.length, 0);
  assert.equal(planRoom(turns.slice(0, 1), { capsule: CAPSULES['room-a'], availability: 'stocked', eliminated: [1] }).visits.length, 0);
  assert.equal(planRoom(turns.slice(0, 1), { capsule: CAPSULES['room-a'], availability: 'empty' }).visits[0].kind, 'empty');
  // A real event stops a visit; a phase change stops everyone's.
  const stopped = planRoom(turns.slice(0, 2), { capsule: CAPSULES['room-a'], availability: 'stocked', stops: [{ at: 4000, seat: 1 }, { at: 9000, seat: null }] });
  assert.equal(stopped.visits[0].cancelAt, 4000);
  assert.equal(stopped.visits[1].cancelAt, 9000);
  assert.ok(CANCEL_MS <= 300);
  // A stop while a visitor still waits for the capsule drops that visit: it never begins, so nothing
  // walks after the phase has changed (Integration's review of #230: A1 ends at 1000, A4 at 2400 and
  // waits until 6172.586; a phase change at 4286.293).
  const pair = turns.slice(0, 2);
  const waiting = planRoom(pair, { capsule: CAPSULES['room-a'], availability: 'stocked' }).visits[1];
  assert.equal(waiting.seat, 4);
  assert.ok(waiting.waited > 0, 'A4 waits for the capsule');
  const mid = (pair[1].at + waiting.start) / 2;
  const phase = planRoom(pair, { capsule: CAPSULES['room-a'], availability: 'stocked', stops: [{ at: mid, seat: null }] });
  assert.deepEqual(phase.visits.map(v => [v.seat, v.cancelAt]), [[1, mid]], 'a phase change cancels the visit under way and drops the one waiting');
  assert.ok(phase.none.some(n => n.seat === 4 && /before it began/.test(n.why)));
  assert.ok(phase.visits.every(v => v.start < mid), 'no visit begins at or after the stop');
  const atStart = planRoom(pair, { capsule: CAPSULES['room-a'], availability: 'stocked', stops: [{ at: waiting.start, seat: null }] });
  assert.deepEqual(atStart.visits.map(v => v.seat), [1], 'a stop at the moment a visit would begin drops it');
  const own = planRoom(pair, { capsule: CAPSULES['room-a'], availability: 'stocked', stops: [{ at: mid, seat: 4 }] });
  assert.deepEqual(own.visits.map(v => [v.seat, v.cancelAt]), [[1, null]], 'the waiting seat\'s own event drops only its visit');
  assert.ok(own.none.some(n => n.seat === 4 && /before it began/.test(n.why)));
  for (const plan of [stopped, phase, own, atStart]) for (const v of plan.visits) assert.ok(v.cancelAt == null || v.cancelAt > v.start, 'a stopped visit had begun');
  // No replay: a visit played on this phone is not played again; coming back, only one that began under a second ago.
  const played = new Set([visitKey(0, 1)]);
  assert.equal(planRoom(turns.slice(0, 1), { capsule: CAPSULES['room-a'], availability: 'stocked', played }).visits.length, 0);
  const v = visits[0];
  assert.equal(onResume([v], v.start + 500).length, 1);
  assert.equal(onResume([v], v.start + 1500).length, 0);
  // Only a visit under way: one yet to start plays when it starts, and a stopped one is done.
  assert.equal(onResume([v], v.start - 500).length, 0, 'a visit yet to start is not resumed');
  assert.equal(onResume([{ ...v, cancelAt: v.start + 200 }], v.start + 500).length, 0, 'a visit already stopped is done');
  assert.equal(onResume([{ ...v, cancelAt: v.start + 800 }], v.start + 500).length, 1, 'one to be stopped later plays from its start');
});

test('today\'s framing is the phone pack\'s own; every figure stays whole doing its activity; wider ones keep 44-pixel press areas and, a fifth wider, every capsule in view', () => {
  for (const r of ROOMS) {
    for (const phone of PHONES) {
      const panel = panelOf(phone);
      const present = r.scene.slots.map(s => ({ ...s, pressAt: slotGeometry(s).press }));
      const pack = phoneFrame(r.scene, panel, present);
      // The pack's own outline through this framing is the pack's phoneFrame exactly.
      const same = roomFrame(r.scene, panel, r.scene.slots, { zoom: 1, room: r.id, outline: paintedExtent });
      for (const key of ['k', 'tx', 'ty']) assert.ok(Math.abs(pack[key] - same[key]) < 1e-9, `${r.id} ${panel.width}: given the pack's outlines, today's ${key} is the pack's`);
      // The owner chose a fifth wider (11 November 2026): the one framing marked chosen.
      assert.deepEqual(ZOOMS.filter(z => z.chosen).map(z => z.id), ['wider-20']);
      const today = roomFrame(r.scene, panel, r.scene.slots, { zoom: 1, room: r.id });
      assert.ok(today.k <= pack.k + 1e-9, `${r.id} ${panel.width}: doing their activities, never closer than the pack`);
      for (const z of ZOOMS) {
        const frame = roomFrame(r.scene, panel, r.scene.slots, { zoom: z.zoom, room: r.id });
        assert.ok(Math.abs(frame.k - Math.min(today.k, frame.fill * z.zoom)) < 1e-9, 'only the room is smaller: the filled view times zoom, or a crowd\'s own zoom-out');
        assert.ok(frame.k <= today.k + 1e-9, 'never closer than today');
        // Everyone whole, doing their activities: each outline inside the view, 4 px clear across.
        for (const slot of r.scene.slots) {
          const [x0, y0, x1, y1] = activityOutline(slot);
          const l = frame.tx + x0 * frame.k, right = frame.tx + x1 * frame.k, t = frame.ty + y0 * frame.k, b = frame.ty + y1 * frame.k;
          assert.ok(l >= FIGURE_CLEAR - 0.01 && right <= panel.width - FIGURE_CLEAR + 0.01, `${r.id} ${panel.width} ${z.id}: ${slot.id} is whole across (${l.toFixed(1)}–${right.toFixed(1)})`);
          assert.ok(t >= -0.01 && b <= panel.height + 0.01, `${r.id} ${panel.width} ${z.id}: ${slot.id} is whole down (${t.toFixed(1)}–${b.toFixed(1)})`);
        }
        for (const rect of pressRects(r.scene.slots, panel, frame)) assert.ok(rect.side >= 44, `${r.id} ${z.id}: a press area is at least 44 pixels`);
        const c = CAPSULES[r.id];
        if (c && z.zoom === 0.8) {
          const left = frame.tx + c.box[0] * frame.k, right = frame.tx + (c.box[0] + c.box[2]) * frame.k;
          assert.ok(left >= 0 && right <= panel.width, `${r.id} ${panel.width}: the capsule is in view a fifth wider`);
        }
        // What shows past the picture is the extension's, never nothing.
        if (z.zoom < 1) assert.ok(frame.ty <= REACH * frame.k + 1e-6 && frame.ty + (768 + REACH) * frame.k >= panel.height - 1e-6, `${r.id} ${panel.width} ${z.id}: the extension covers the view`);
      }
    }
  }
});

test('each place\'s activity outline was measured from the drawing as it is, and holds its resting pose', () => {
  assert.deepEqual(Object.keys(ACTIVITY_EXTENTS).sort(), [...PLACE_ORDER].sort(), 'every place');
  for (const [path, sha] of Object.entries(ACTIVITY_EXTENTS_SOURCES)) {
    assert.equal(createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex'), sha, `${path} changed since the activities were measured: run design/tools/ship-life-extents.mjs`);
  }
  for (const id of PLACE_ORDER) {
    const slot = slotOf(id);
    const rest = paintedExtent(slot), doing = activityOutline(slot);
    assert.ok(doing[0] <= rest[0] && doing[1] <= rest[1] && doing[2] >= rest[2] && doing[3] >= rest[3], `${id}: the activity's outline holds the resting one`);
  }
});

test('the capsule\'s states are distinct and unknown never draws as empty', () => {
  const c = CAPSULES['room-a'];
  const draw = (state, open = 0) => capsuleSvg({ box: c.box, hatch: c.hatch, state, open, family: FAMILIES['room-a'], kind: c.kind, prefix: 't' });
  assert.deepEqual([...STATES], ['stocked', 'empty', 'unknown']);
  const [stocked, empty, unknown] = STATES.map(s => draw(s));
  assert.notEqual(stocked, empty);
  assert.notEqual(empty, unknown);
  assert.match(stocked, /#F7DFA3/i, 'stocked glows');
  assert.doesNotMatch(unknown, /#283142/i, 'unknown is not the empty glass');
  assert.match(draw('stocked', 1), /#F4EBDD/i, 'an open stocked capsule shows its portion');
  assert.throws(() => draw('full'));
  for (const kind of ['wall', 'counter', 'hatch']) {
    const svg = capsuleSvg({ box: [0, 0, 36, 70], hatch: [5, 24, 26, 20], state: 'stocked', family: FAMILIES.jail, kind, prefix: `k${kind}` });
    assert.match(svg, /^<svg[^>]*viewBox="0 0 36 70"/);
  }
});

test('the extensions and the handoff record are what the tools write', () => {
  for (const r of ROOMS) {
    const svg = text(`design/ship-life/assets/${r.id}.extend.svg`);
    assert.match(svg, /mothership:dev-only/);
    assert.match(svg, new RegExp(`viewBox="0 ${-REACH} 1024 ${768 + 2 * REACH}"`));
    assert.doesNotMatch(svg.split('-->')[0].replace('<!--', ''), /--/, 'no double hyphen inside its comment');
    assert.match(svg, /data-band="top"/);
    assert.match(svg, /data-band="bottom"/);
  }
  assert.throws(() => extensionSvg('room-a', { top: [[0, 0, 0]], bottom: [[0, 0, 0]] }, { header: 'a -- b' }));
  execFileSync(process.execPath, [new URL('design/tools/ship-life-export.mjs', root).pathname, '--check'], { stdio: 'pipe' });
  const record = JSON.parse(text('design/ship-life/review/renders.json'));
  for (const [file, value] of Object.entries(record.outputs)) {
    const hash = typeof value === 'string' ? value : value.sha256;
    const bytes = readFileSync(new URL(file, root));
    assert.equal(hash, createHash('sha256').update(bytes).digest('hex'), `${file} is the file the render wrote`);
  }
});

test('every file carries the development-only mark, and nothing in the game\'s code refers to the package', () => {
  const dir = new URL('design/ship-life/', root);
  for (const name of readdirSync(dir)) {
    if (!/\.(mjs|html|json)$/.test(name)) continue;
    assert.match(readFileSync(new URL(name, dir), 'utf8'), /mothership:dev-only/, `${name} is marked`);
  }
  for (const tool of ['ship-life-render.mjs', 'ship-life-export.mjs']) assert.match(text(`design/tools/${tool}`), /mothership:dev-only/);
  // git grep exits 1 when nothing matches: that is the pass.
  let apps = '';
  try { apps = execFileSync('git', ['grep', '-l', 'ship-life', '--', 'apps', 'services', 'packages/engine', 'packages/contracts'], { cwd: new URL('.', root).pathname, encoding: 'utf8' }).trim(); } catch (error) { if (error.status !== 1) throw error; }
  assert.equal(apps, '', 'the game does not use the proposal');
});
