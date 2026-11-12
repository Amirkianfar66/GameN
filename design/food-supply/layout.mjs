// mothership:dev-only
//
// The Food Supply Task's geometry: where each stop of the crane's rail (./task.mjs) and each fixture
// sits in the Supply Room's picture, 1024 x 768 like every room's, and where the operators are.
// The room is drawn in the board's cutaway frame (the back wall from y 70 to 372, the floor receding
// to y 748); the crane stands in a plane near the front, its deck line at y 700. The stops are 128
// pixels apart, stop 1 at x 128, so that the click reads as an even beat and a stop is a crate's
// width.

import { FIXTURES, STOPS, ZONES } from './task.mjs';

/** The picture. */
export const BOX = Object.freeze([1024, 768]);
/** The distance between two stops, stop 1's x (stop index 0), and the crane plane's deck line. */
export const STEP = 128;
export const X0 = 128;
export const DECK = 700;
/** A stop's x in the picture (fractional while the panel moves). */
export const stopX = s => X0 + STEP * s;

/** The rail's I-beam; the locking panel's carriage under it; its blade, by its bottom edge. */
export const RAIL = Object.freeze({ top: 74, bottom: 104, left: 30, right: 994 });
export const CARRIAGE = Object.freeze({ half: 58, top: 104, bottom: 140, pivot: 140 });
export const BLADE = Object.freeze({ half: 30, height: 34, up: 140, locked: 158, caught: 164, cut: 226 });

/** The crate, its hanging height (its centre), and where it rests in each place (its centre). */
export const CRATE = 104;
export const HANG = 408;
export const REST = Object.freeze({ intake: 658, deck: 648, platform: 568, console: 540 });
/** The pendulum: from the hoist's sheave at the carriage's foot to the crate's centre. */
export const PENDULUM = HANG - CARRIAGE.pivot;

/** The fixtures' boxes in the picture, [x, y, w, h], for the drawing, the regions and the annotated layout. */
export const BOXES = Object.freeze({
  intake: Object.freeze([stopX(FIXTURES.intake.stop) - 56, DECK - 10, 112, 24]),
  console: Object.freeze([stopX(FIXTURES.console.stop) - 54, 596, 108, 104]),
  platform: Object.freeze([stopX(FIXTURES.platform.stop) - 62, 620, 124, 80]),
  liftWell: Object.freeze([stopX(FIXTURES.platform.stop) - 66, 600, 132, 104]),
  cab: Object.freeze([stopX(FIXTURES.cab.stop) - 76, 150, 152, 190]),
  cabWindow: Object.freeze([stopX(FIXTURES.cab.stop) - 64, 178, 128, 100]),
  cabBracket: Object.freeze([stopX(FIXTURES.cab.stop) + 76, RAIL.bottom, 18, 100]),
  porthole: Object.freeze([200, 128, 112, 112]),
  sign: Object.freeze([stopX(FIXTURES.platform.stop) - 30, 300, 60, 40]),
});

/**
 * The regions both attacks use, in stops and in the picture: the cut (the panel locked at the cab's
 * stop), the drop (the crate falling over the console), the platform (the correct position), and
 * the deck. The warnings are live: a phone stripes the button while the panel or the swing is there.
 */
const band = (centre, half, top, bottom) => [stopX(centre - half), top, STEP * half * 2, bottom - top];
export const REGIONS = Object.freeze({
  cut: Object.freeze({ stops: [FIXTURES.cab.stop], box: [stopX(FIXTURES.cab.stop) - STEP / 2, RAIL.top, STEP, BOXES.cab[1] + BOXES.cab[3] - RAIL.top], about: 'The cab\'s stop: the panel sweeping here has LOCK striped on the Panel phone; locked here, its blade drops into the cab' }),
  drop: Object.freeze({ centre: FIXTURES.console.stop, half: ZONES.console, box: band(FIXTURES.console.stop, ZONES.console, HANG - CRATE / 2, DECK), about: 'Over the console: the crate lowered with its centre here falls on the Panel operator' }),
  platform: Object.freeze({ centre: FIXTURES.platform.stop, half: ZONES.platform, box: band(FIXTURES.platform.stop, ZONES.platform, HANG - CRATE / 2, DECK), about: 'Over the platform: the crate lowered with its centre here lands. The correct position' }),
  intake: Object.freeze({ centre: FIXTURES.intake.stop, half: ZONES.intake, box: band(FIXTURES.intake.stop, ZONES.intake, HANG - CRATE / 2, DECK), about: 'The intake hatch, where the crate starts; lowered here it goes back in' }),
  sweep: Object.freeze({ stops: [0, STOPS - 1], box: [stopX(0) - CARRIAGE.half, RAIL.top - 30, stopX(STOPS - 1) - stopX(0) + CARRIAGE.half * 2, CARRIAGE.bottom - RAIL.top + 30], about: 'The panel\'s run: it clicks from stop to stop, end to end and back, a stop every 0.5 s (the click is the owner\'s; the numbers PROPOSED)' }),
});

/**
 * The operators: their stations, the crew rig's gestures (design/board-motion/figures/gestures.mjs)
 * alive and down, where the figure's feet stand and its scale. The Panel operator stands behind
 * the console, facing us, the hands on it; the Winch operator sits in the cab, the hands on the two
 * winch levers. Down, each slumps over their own controls, as the board draws an Eliminated figure
 * at a desk: no wound, no mark. head: the top of the head, for the drop.
 */
export const OPERATORS = Object.freeze({
  panel: Object.freeze({ gesture: 'leanBench', down: 'slumpBench', feet: [stopX(FIXTURES.console.stop), DECK], scale: 1, head: 491, front: 'console' }),
  winch: Object.freeze({ gesture: 'wheelchair', down: 'slumpDesk', feet: [stopX(FIXTURES.cab.stop), 333], scale: 0.75, head: 196, front: 'cab' }),
});

/** The phones' view of the picture: the crane's part of it, the same crop on both phones. */
export const VIEW = Object.freeze([16, 40, 992, 696]);

/** Where each operator's name tag sits: under the console, and on the cab's lower panel. */
export const TAGS = Object.freeze({ panel: Object.freeze([stopX(FIXTURES.console.stop), 718]), winch: Object.freeze([stopX(FIXTURES.cab.stop) + 21, 312]) });
