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
import { BOARD_ROOMS, ROSTERS, sceneOf } from '../../../design/board-v2/scenes/slots.mjs';
import { BLACKOUT_OUTCOMES } from '../../../design/board-v2/js/fixtures.mjs';

const OPTIONS = { outcomeAt: 15400, hits: ['B2'], windowId: 'w-test' };
const PHONES = [[320, 568], [360, 640], [360, 740], [375, 667], [390, 844], [393, 852], [414, 896], [430, 932]];

test('five seconds lit, then ten dark: people leave the page only when the preview ends, and the selection is the window\'s', () => {
  for (const t of [0, 1000, 4200, 4360, 4760, 4999]) assert.equal(blackoutFrame(t, OPTIONS).people, 'shown', `${t}`);
  for (const t of [5200, 8000, 14999]) {
    const frame = blackoutFrame(t, OPTIONS);
    assert.equal(frame.darkness, 1);
    assert.equal(frame.people, 'gone');
    assert.deepEqual(frame.markers, { opacity: 1, style: 'dark' });
    assert.equal(frame.selection, true);
  }
  assert.equal(blackoutFrame(4999, OPTIONS).selection, false);
  assert.equal(blackoutFrame(5000, OPTIONS).selection, true);
  assert.equal(blackoutFrame(15000, OPTIONS).selection, false);
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
    if (t < BLACKOUT.reduced.darkAt) assert.equal(frame.darkness, 0, `${t}`);
  }
  assert.equal(blackoutFrame(BLACKOUT.reduced.darkAt + 80, { ...OPTIONS, reduced: true }).darkness, 1);
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
