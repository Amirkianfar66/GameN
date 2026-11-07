// mothership:dev-only
//
// The Blackout's lighting window (design/board-v2/films/blackout.mjs, scenes/lighting.mjs;
// docs/design/blackout-window.md): the film's beats, its inputs, its reduced variant, its flashes
// and its art. These test the proposal's own modules: none of them is a rule, a server contract
// or a measurement of a phone, and none says whether people can remember five positions.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BLACKOUT, blackoutContract, blackoutFlashes, blackoutFrame, lightsBackAt } from '../../../design/board-v2/films/blackout.mjs';
import { FIXTURES, IMPACT_BOX, IMPACT_FLASH_RADIUS, MARKER_STATES, NIGHT, SPARK_LIGHT, impactSvg, luminance, markerSvg, nightFill, nightMarkup, sparkPlan, sparkSvg } from '../../../design/board-v2/scenes/lighting.mjs';
import { fitBoardV2, slotRects } from '../../../design/board-v2/js/fit.mjs';
import { frameScene } from '../../../design/board-motion/scenes/frame.mjs';
import { BOARD_ROOMS, ROSTERS, sceneOf, slotsOf } from '../../../design/board-v2/scenes/slots.mjs';
import { BLACKOUT_OUTCOMES, fixtureSeats, settledSeats } from '../../../design/board-v2/js/fixtures.mjs';
import { lineText, receiptAt } from '../../../design/board-v2/js/blackout-view.mjs';

const OPTIONS = { outcomeAt: 15400, hits: ['B2'], windowId: 'w-test' };
const PHONES = [[320, 568], [360, 640], [360, 740], [375, 667], [390, 844], [393, 852], [414, 896], [430, 932]];

test('five seconds lit, then ten dark: at previewEndsAt exactly, in both modes, the people leave the page as the selection opens', () => {
  for (const reduced of [false, true]) {
    const at = t => blackoutFrame(t, { ...OPTIONS, reduced });
    // The whole lit preview, its last millisecond included: everyone on the page, no selection.
    for (const t of [0, 1000, 4200, 4360, 4760, 4999]) {
      assert.equal(at(t).people, 'shown', `${reduced} ${t}`);
      assert.equal(at(t).peopleOpacity, 1, `${reduced} ${t}`);
      assert.equal(at(t).selection, false, `${reduced} ${t}`);
    }
    // From 5000 to 14999: dark, nobody on the page, the markers dark, the selection open.
    for (const t of [5000, 5001, 5100, 8000, 14999]) {
      const frame = at(t);
      assert.equal(frame.darkness, 1, `${reduced} ${t}`);
      assert.equal(frame.people, 'gone', `${reduced} ${t}`);
      assert.equal(frame.peopleOpacity, 0, `${reduced} ${t}`);
      assert.deepEqual(frame.markers, { opacity: 1, style: 'dark' }, `${reduced} ${t}`);
      assert.equal(frame.selection, true, `${reduced} ${t}`);
    }
    // At endsAt the selection closes; the dark holds for the outcome.
    assert.equal(at(15000).selection, false);
    assert.equal(at(15000).people, 'gone');
    assert.equal(at(15000).darkness, 1);
    // The same cut in both modes: one boundary for the people, the dark and the selection.
    for (const t of [4999, 5000, 5100, 14999, 15000]) {
      assert.equal(at(t).people, blackoutFrame(t, { ...OPTIONS, reduced: !reduced }).people, `${t}`);
      assert.equal(at(t).selection, blackoutFrame(t, { ...OPTIONS, reduced: !reduced }).selection, `${t}`);
    }
  }
  // Every fixed slot gets its marker from the first moment, empty or not: the film has no per-slot input.
  assert.equal(blackoutFrame(300, OPTIONS).markers.opacity, 1);
});

test('the dark holds for the outcome, never past its cap, and the lights come back with it', () => {
  assert.equal(lightsBackAt(15400), 15400);
  assert.equal(lightsBackAt(null), BLACKOUT.windowMs + BLACKOUT.holdCapMs);
  assert.equal(lightsBackAt(20000), BLACKOUT.windowMs + BLACKOUT.holdCapMs);
  assert.equal(blackoutFrame(15300, OPTIONS).darkness, 1);
  assert.equal(blackoutFrame(15400 + BLACKOUT.lightsReturn[1], OPTIONS).darkness, 0);
  assert.equal(blackoutFrame(16500 + BLACKOUT.lightsReturn[1], { windowId: 'w-test' }).darkness, 0);
  assert.equal(blackoutFrame(15400 + BLACKOUT.markersOut[1], OPTIONS).markers.opacity, 0);
});

test('only public inputs: a strike that missed draws what no strike draws, and nothing else can change the film', () => {
  assert.deepEqual(BLACKOUT_OUTCOMES.miss, BLACKOUT_OUTCOMES.none);
  for (let t = -100; t <= 17000; t += 20) {
    const miss = blackoutFrame(t, { outcomeAt: 15400, hits: BLACKOUT_OUTCOMES.miss.hits, windowId: 'w-test' });
    const none = blackoutFrame(t, { outcomeAt: 15400, hits: BLACKOUT_OUTCOMES.none.hits, windowId: 'w-test' });
    const asked = blackoutFrame(t, { outcomeAt: 15400, hits: [], windowId: 'w-test', side: 'blue', request: 'B2', viewer: 'disabler' });
    assert.deepEqual(miss, none);
    assert.deepEqual(asked, none);
    // No impact, no shake, at a miss.
    assert.equal(miss.impact.frame, 0);
    assert.deepEqual(miss.shake, [0, 0]);
  }
  const contract = blackoutContract();
  assert.deepEqual(contract.inputs.length, 5);
  assert.ok(contract.notInputs.some(input => input.includes('side')));
});

test('the sparks come from each room\'s right-hand light, as the window\'s id alone says', () => {
  assert.deepEqual(sparkPlan('w-test'), sparkPlan('w-test'));
  assert.throws(() => sparkPlan(''));
  for (const room of BOARD_ROOMS) {
    assert.equal(SPARK_LIGHT[room], FIXTURES[room].length - 1);
    const entry = sparkPlan('w-test')[room];
    assert.equal(entry.at[1], FIXTURES[room][SPARK_LIGHT[room]][1]);
    assert.ok(Math.abs(entry.at[0] - FIXTURES[room][SPARK_LIGHT[room]][0]) <= 24);
    assert.ok(Math.abs(entry.tilt) <= 10);
  }
  // The flicker is the same in every room: one darkness for the whole board.
  assert.equal(typeof blackoutFrame(4360, OPTIONS).darkness, 'number');
});

test('reduced motion: no flicker, sparks, shake or impact frames; 80 ms fades and a still burst', () => {
  for (let t = 0; t <= 17000; t += 10) {
    const frame = blackoutFrame(t, { ...OPTIONS, reduced: true });
    assert.equal(frame.sparks.frame, 0);
    assert.equal(frame.impact.frame, 0);
    assert.deepEqual(frame.shake, [0, 0]);
    if (t < BLACKOUT.previewMs) assert.equal(frame.darkness, 0, `${t}`);
  }
  assert.equal(blackoutFrame(BLACKOUT.previewMs, { ...OPTIONS, reduced: true }).darkness, 1);
  assert.equal(blackoutFrame(15400 + 80, { ...OPTIONS, reduced: true }).darkness, 0);
  assert.equal(blackoutFrame(15400 + 300, { ...OPTIONS, reduced: true }).impact.burst, true);
  assert.equal(blackoutFrame(15400 + 600, { ...OPTIONS, reduced: true }).impact.burst, false);
  assert.equal(blackoutFrame(8000, { ...OPTIONS, reduced: true }).darkIcon, true);
});

test('three flashes a second at most; the bright part of a spark, or of every position hit at once, under a quarter of its panel', () => {
  const flashes = blackoutFlashes({ outcomeAt: 15400, hits: ['B2', 'A3'] });
  for (let from = -1000; from <= 17000; from += 10) assert.ok(flashes.filter(flash => flash.at >= from && flash.at < from + 1000).length <= 3, `${from}`);
  for (const [width, height] of PHONES) {
    for (const roster of ROSTERS) {
      const board = fitBoardV2({ width, height }, roster);
      for (const room of BOARD_ROOMS) {
        const panel = board.panels[room];
        const area = panel.width * panel.height;
        const { k } = frameScene(sceneOf(room, roster), panel);
        assert.ok((Math.PI * (17 * k) ** 2) / area <= 0.25);
        const all = slotRects(room, roster, panel).reduce((sum, rect) => sum + Math.PI * ((IMPACT_FLASH_RADIUS / IMPACT_BOX) * 1.6 * rect.side) ** 2, 0);
        assert.ok(all / area <= 0.25, `${width}x${height} ${roster} ${room}: ${all / area}`);
      }
    }
  }
});

test('the dark drawing: every fill near ink, every line faint steel, no flash of color', () => {
  for (const color of ['#F4EBDD', '#FFFFFF', '#151923', '#E9B64E', '#C0392B', '#2E86DE', '#55657E']) {
    const night = nightFill(color);
    assert.ok(luminance(night) <= luminance(NIGHT.high) + 0.01, `${color} -> ${night}`);
  }
  const svg = '<svg><rect fill="#F4EBDD" stroke="#151923"/><g id="x-space"><circle fill="#F4EBDD"/></g></svg>';
  const start = svg.indexOf('<g id="x-space"');
  const end = svg.indexOf('</g>') + 4;
  const night = nightMarkup(svg, [[start, end]]);
  assert.match(night, new RegExp(`stroke="${NIGHT.line}"`));
  assert.ok(!night.includes('#F4EBDD'));
  // The view through a window stays the brightest thing in the dark room.
  const [space] = night.slice(night.indexOf('x-space')).match(/#[0-9A-F]{6}/);
  assert.ok(luminance(space) > luminance(nightFill('#F4EBDD')));
});

test('the sprites and markers: three frames each, a marker per state, no text in the art', () => {
  for (const frame of [1, 2, 3]) {
    assert.match(sparkSvg(frame), /viewBox="0 0 120 120"/);
    assert.match(impactSvg(frame), /viewBox="0 0 160 160"/);
  }
  assert.throws(() => sparkSvg(4));
  assert.throws(() => impactSvg(0));
  assert.deepEqual(Object.keys(MARKER_STATES), ['preview', 'dark', 'chosen']);
  for (const state of Object.keys(MARKER_STATES)) assert.ok(!/<text\b/.test(markerSvg(state)));
  assert.throws(() => markerSvg('blue'));
});

test('the window\'s line is in the top bar, from the window\'s opening until the lights start back, the same words on every screen but the eligible Disabler\'s', () => {
  for (const reduced of [false, true]) {
    const returnStart = 15400 + (reduced ? 0 : BLACKOUT.lightsReturn[0]);
    for (const t of [0, 4999, 5000, 14999, 15000, returnStart - 1]) assert.equal(blackoutFrame(t, { ...OPTIONS, reduced }).line, true, `${reduced} ${t}`);
    for (const t of [-1, returnStart, 17000]) assert.equal(blackoutFrame(t, { ...OPTIONS, reduced }).line, false, `${reduced} ${t}`);
  }
  const choose = { step: 'choose', pick: 2 };
  for (const viewer of ['observer', 'display']) {
    assert.equal(lineText(blackoutFrame(1000, OPTIONS), 1000, { viewer, bound: 'room-b', selection: choose }), 'Remember who is where.');
    assert.equal(lineText(blackoutFrame(8000, OPTIONS), 8000, { viewer, bound: 'room-b', selection: choose }), 'Wait for the lights.');
  }
  const disabler = (t, selection, bound = 'room-b') => lineText(blackoutFrame(t, OPTIONS), t, { viewer: 'disabler', bound, selection });
  assert.equal(disabler(1000, choose), 'Remember Room B: you choose there.');
  assert.equal(disabler(5000, choose, 'command-room'), 'Tap a position in the Command Room.');
  assert.equal(disabler(8000, { step: 'confirm', pick: 1 }, 'command-room'), 'Position 1: tap it again to strike.');
  assert.equal(disabler(15000, { step: 'confirm', pick: 1 }), 'Time is up: no position was sent.');
  // The contract keeps the old strip's place for nobody: its line is the top bar's.
  assert.ok(!JSON.stringify(blackoutContract()).includes('strip'));
  assert.match(blackoutContract().audience.line, /covers no position/);
});

test('a sent position: one command, its line what the server answered, and never a rejection the server did not give', () => {
  const sent = extra => ({ step: 'sent', pick: 2, sentAt: 14800, reply: 'accepted', replyAt: 15300, lost: false, recoverAt: null, ...extra });
  const line = (t, selection) => lineText(blackoutFrame(t, OPTIONS), t, { viewer: 'disabler', bound: 'room-b', selection });
  // Before the answer: sending while the window is open, waiting after its end; the same words to the end of the window's line.
  assert.equal(line(14900, sent()), 'Sending position 2…');
  for (const t of [15000, 15001, 15299]) assert.equal(line(t, sent()), 'Position 2 sent. Waiting for the answer.', `${t}`);
  // A late acknowledgement: the answer after the deadline still registers the position sent before it.
  assert.equal(receiptAt(sent(), 15300), 'accepted');
  assert.equal(line(15300, sent()), 'Registered: position 2.');
  // A lost answer: waiting until the receipt is recovered with the same command id, then what it says.
  for (const t of [15000, 15300, 15519]) assert.equal(line(t, sent({ lost: true })), 'Position 2 sent. Waiting for the answer.', `${t}`);
  assert.equal(receiptAt(sent({ lost: true }), 99999), 'pending');
  assert.equal(line(15450, sent({ lost: true, recoverAt: 15450 })), 'Registered: position 2.');
  // A rejection only from the server's answer.
  assert.equal(line(15100, sent({ reply: 'rejected', replyAt: 15200 })), 'Position 2 sent. Waiting for the answer.');
  assert.equal(line(15200, sent({ reply: 'rejected', replyAt: 15200 })), 'Position 2 was not registered.');
  // Never "not registered" while the answer is pending, at any moment of the window.
  for (let t = 5000; t < 15520; t += 10) {
    for (const selection of [sent({ sentAt: Math.min(t, 14990) }), sent({ lost: true })]) assert.ok(!/not registered|no position/.test(line(t, selection)), `${t}`);
  }
  assert.equal(receiptAt({ step: 'confirm', pick: 2 }, 15300), null);
});

test('a settled hit puts the patient in the Hospital, at the slot the after-state names: the frozen slot is only where the impact is', () => {
  for (const [name, outcome] of Object.entries(BLACKOUT_OUTCOMES)) {
    for (const roster of ROSTERS) {
      const before = fixtureSeats('mixed', roster);
      const after = settledSeats(outcome, roster);
      // The impacts are at the frozen snapshot: one per hit seat, at the slot that seat had.
      const hitSeats = outcome.after[roster].map(entry => before.find(seat => seat.seat === entry.seat));
      assert.deepEqual(hitSeats.map(seat => seat.slot).sort(), [...outcome.hits].sort(), `${name} ${roster}`);
      for (const entry of outcome.after[roster]) {
        // Every Injured in the Hospital, at one of its slots, in the gown's health.
        assert.equal(entry.room, 'hospital', `${name} ${roster}`);
        assert.equal(entry.health, 'Injured');
        assert.ok(slotsOf('hospital', roster).some(slot => slot.id === entry.slot), `${name} ${roster} ${entry.slot}`);
      }
      // The berths are the lowest free at the snapshot, in player-number order: the fixture is checked
      // against the specification's rule here; the drawing layer never computes it.
      const taken = new Set(before.filter(seat => seat.room === 'hospital').map(seat => seat.slot));
      for (const entry of [...outcome.after[roster]].sort((a, b) => a.seat - b.seat)) {
        const lowest = slotsOf('hospital', roster).find(slot => !taken.has(slot.id)).id;
        assert.equal(entry.slot, lowest, `${name} ${roster} seat ${entry.seat}`);
        taken.add(lowest);
      }
      // Everyone else unmoved; one occupant per slot, one slot per seat.
      for (const seat of after) if (!outcome.after[roster].some(entry => entry.seat === seat.seat)) assert.deepEqual(seat, before.find(entry => entry.seat === seat.seat));
      const places = after.map(seat => `${seat.room}:${seat.slot}`);
      assert.equal(new Set(places).size, places.length, `${name} ${roster}`);
      assert.ok(!after.some(seat => seat.health === 'Injured' && seat.room !== 'hospital'), `${name} ${roster}`);
    }
  }
  // A miss and no strike move nobody.
  for (const roster of ROSTERS) assert.deepEqual(settledSeats(BLACKOUT_OUTCOMES.miss, roster), fixtureSeats('mixed', roster));
});
