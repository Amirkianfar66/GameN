// mothership:dev-only
//
// The board-v2 proposal (design/board-v2/): every room's fixed slots with stable ids, the Hospital
// as a ward with one berth per seat, and a layout in which every slot is a whole 44 px press area
// on every phone the board is drawn for. These tests check the proposal's own modules; none of them
// is a rule, a server contract or a measurement of a phone.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BOARD_ROOMS, ROSTERS, entrySlot, slotCount, slotProblems, slotsOf } from '../../../design/board-v2/scenes/slots.mjs';
import { WARD_BERTHS, wardBerths, wardScene } from '../../../design/board-v2/scenes/hospital-ward.mjs';
import { MARKER_RADIUS, SHELL, fitBoardV2, passClearance, shellFor, slotRects, slotsFit } from '../../../design/board-v2/js/fit.mjs';
import { fixtureSeats } from '../../../design/board-v2/js/fixtures.mjs';
import { SCENES } from '../../../design/board-motion/scenes/index.mjs';
import { outfitFor } from '../../../design/board-motion/figures/wardrobe.mjs';

const PHONES = [[320, 568], [360, 640], [360, 740], [375, 667], [390, 844], [393, 852], [414, 896], [430, 932]];

test('every room has its fixed slots: A, B and the Jail five, the Command Room one, the Hospital one per seat', () => {
  for (const roster of ROSTERS) {
    assert.deepEqual(slotProblems(roster), []);
    assert.deepEqual(slotsOf('room-a', roster).map(slot => slot.id), ['A1', 'A2', 'A3', 'A4', 'A5']);
    assert.deepEqual(slotsOf('room-b', roster).map(slot => slot.id), ['B1', 'B2', 'B3', 'B4', 'B5']);
    assert.deepEqual(slotsOf('jail', roster).map(slot => slot.id), ['J1', 'J2', 'J3', 'J4', 'J5']);
    assert.deepEqual(slotsOf('command-room', roster).map(slot => slot.id), ['C1']);
    assert.deepEqual(slotsOf('hospital', roster).map(slot => slot.id), Array.from({ length: roster }, (_, i) => `H${i + 1}`));
    for (const room of BOARD_ROOMS) assert.equal(slotsOf(room, roster).length, slotCount(room, roster));
  }
  assert.throws(() => slotsOf('hospital', 6));
  assert.throws(() => slotsOf('final-zone', 9));
});

test('the reviewed rooms keep their places exactly; only the Hospital is new', () => {
  for (const room of ['room-a', 'room-b', 'jail', 'command-room']) {
    const places = SCENES[room].slots;
    slotsOf(room, 9).forEach((slot, index) => {
      assert.equal(slot.id, places[index].id);
      assert.deepEqual([...slot.at], places[index].at);
      assert.equal(slot.scale, places[index].scale);
      assert.equal(slot.gesture, places[index].gesture);
    });
  }
});

test('anchors are normalized to the scene and a berth\'s plate is its badge', () => {
  for (const roster of ROSTERS) {
    for (const room of BOARD_ROOMS) {
      for (const slot of slotsOf(room, roster)) {
        for (const name of ['feet', 'press', 'badge', 'fx']) for (const value of slot[name]) assert.ok(value >= 0 && value <= 1, `${slot.id} ${name}`);
        assert.ok(Math.abs(slot.press[0] - slot.pressAt[0] / 1024) < 0.0002 && Math.abs(slot.press[1] - slot.pressAt[1] / 768) < 0.0002);
        assert.deepEqual(slot.fx, slot.press);
      }
    }
  }
  const h1 = slotsOf('hospital', 9)[0];
  assert.ok(h1.badgeAt[1] < h1.pressAt[1], 'the plate is on the headboard, above the patient');
});

test('the ward: front row first, the two upper berths only in larger matches, the same berth art in every roster', () => {
  assert.deepEqual(wardBerths(7).map(berth => berth.id), ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7']);
  assert.deepEqual(wardBerths(8).map(berth => berth.id), ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8']);
  assert.deepEqual(WARD_BERTHS.slice(0, 3).map(berth => berth.row), ['front', 'front', 'front']);
  assert.deepEqual(WARD_BERTHS.slice(6).map(berth => berth.row), ['upper', 'upper', 'upper']);
  for (const roster of ROSTERS) {
    const scene = wardScene(roster);
    assert.equal(scene.room, 'hospital');
    assert.ok(!scene.under.includes('hospital-props-back') && !scene.over.includes('hospital-props-back'), 'the sick bay\'s beds are not lifted');
    for (const slot of scene.slots) {
      assert.ok(['bedLying', 'bedSitting'].includes(slot.gesture));
      assert.equal(slot.down, `${slot.gesture}+still`);
      assert.ok(scene.layers[slot.front].depth > slot.depth, `${slot.id}: its blanket is over its patient`);
    }
  }
  // Every patient wears the gown, by location alone.
  assert.equal(outfitFor('Hospital'), 'gown');
});

test('the Designer\'s entry proposal: nobody moves, the ward fills in order, A, B and the Jail by seat preference', () => {
  assert.equal(entrySlot('hospital', 9, 4, []), 'H1');
  assert.equal(entrySlot('hospital', 9, 4, ['H1', 'H3']), 'H2');
  assert.equal(entrySlot('hospital', 7, 4, ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7']), null);
  assert.equal(entrySlot('room-a', 9, 1, []), 'A1');
  assert.equal(entrySlot('room-a', 9, 6, []), 'A1');
  assert.equal(entrySlot('room-a', 9, 6, ['A1']), 'A2');
  assert.equal(entrySlot('jail', 9, 5, ['J5']), 'J1');
  assert.equal(entrySlot('room-b', 9, 3, ['B1', 'B2', 'B3', 'B4', 'B5']), null);
  assert.equal(entrySlot('command-room', 9, 8, []), 'C1');
  assert.equal(entrySlot('command-room', 9, 8, ['C1']), null);
});

test('the shell by the phone\'s height: compact up to 600 px, 22 px smaller than the short phone\'s, the sides unchanged', () => {
  assert.equal(shellFor(568).tier, 'compact');
  assert.equal(shellFor(600).tier, 'compact');
  assert.equal(shellFor(601).tier, 'short');
  assert.equal(shellFor(640).tier, 'short');
  assert.equal(shellFor(641).tier, 'tall');
  const chrome = shell => shell.top + shell.nav + 2 * shell.boardPadY;
  assert.equal(chrome(shellFor(640)) - chrome(shellFor(568)), 22);
  assert.deepEqual([shellFor(568).top, shellFor(568).nav, shellFor(568).boardPadY], [36, 48, 2]);
  assert.equal(shellFor(568).boardPadX, shellFor(640).boardPadX);
  for (const tier of SHELL.tiers) assert.ok(tier.nav >= 44 && tier.pass >= 44);
  // The compact Pass rises less than the board's foot below the lowest press areas, so it is clear
  // of them whatever its shape. (The phone kit's own Pass rises 17 px on a tall phone: its circle is
  // clear, as the next test measures.)
  const compact = shellFor(568);
  assert.ok(compact.passRise < compact.boardPadY + compact.border + compact.pad);
});

test('every slot is a whole press area of 44 px at least, apart from every other and clear of the Pass, on every phone', () => {
  for (const [width, height] of PHONES) {
    for (const roster of ROSTERS) {
      const board = fitBoardV2({ width, height }, roster);
      assert.equal(board.deficit, 0, `${width}x${height}`);
      assert.ok(board.fits, `${width}x${height}: ${board.problems.join('; ')}`);
      for (const slot of passClearance({ width, height }, roster)) assert.ok(slot.clearance > 0, `${width}x${height} ${slot.id}`);
      for (const room of BOARD_ROOMS) {
        const panel = board.panels[room];
        assert.ok(slotsFit(room, roster, panel), `${width}x${height} ${room}`);
        for (const rect of slotRects(room, roster, panel)) {
          assert.ok(rect.side >= 44);
          // The position number sits on its own press area.
          assert.ok(rect.marker[0] - MARKER_RADIUS >= rect.left - 0.01 && rect.marker[0] + MARKER_RADIUS <= rect.left + rect.side + 0.01);
          assert.ok(rect.marker[1] - MARKER_RADIUS >= rect.top - 0.01 && rect.marker[1] + MARKER_RADIUS <= rect.top + rect.side + 0.01);
        }
      }
    }
  }
});

test('the layout depends on the phone and the roster only, never on who is where', () => {
  const a = fitBoardV2({ width: 390, height: 844 }, 9);
  const b = fitBoardV2({ width: 390, height: 844 }, 9);
  assert.deepEqual(a, b);
  // The function takes no occupancy: a fixture is only what the review page draws on top.
  assert.equal(fitBoardV2.length, 2);
  assert.equal(fixtureSeats('ward', 9).length, 9);
  assert.equal(fixtureSeats('mixed', 7).length, 7);
  assert.deepEqual(fixtureSeats('empty', 8), []);
});
