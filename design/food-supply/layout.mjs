// mothership:dev-only
//
// The Food Supply Task's geometry: where each column, row and fixture of the machine (./task.mjs)
// sits in the Supply Room's picture, 1024 x 768 like every room's, and where the operators stand.
// The room is drawn in the board's cutaway frame (the back wall from y 70 to 372, the deck
// receding to y 748); the machine stands in a plane near the front, its deck line at y 640, so
// that every cell is a 128-pixel square and every move reads as a straight step.

import { FIXTURES, GRID, NEAR } from './task.mjs';

/** The picture. */
export const BOX = Object.freeze([1024, 768]);
/** One cell, the machine plane's left edge (column 0) and its deck line (the bottom of row 0). */
export const CELL = 128;
export const X0 = 64;
export const DECK = 640;
/** The rail's I-beam, and the gantry's wheels on it. */
export const RAIL = Object.freeze({ top: 74, bottom: 104, left: 30, right: 994 });

/** A cell's box, [x, y, w, h], in the picture. */
export const cellBox = (c, r) => [X0 + CELL * c, DECK - CELL * (r + 1), CELL, CELL];
/** A cell's centre. */
export const cellCentre = (c, r) => [X0 + CELL * c + CELL / 2, DECK - CELL * r - CELL / 2];
/** The crate, a little inside its cell; at row r it rests 4 px above the cell's floor. */
export const CRATE = 108;
export const crateBox = (x, y) => [x - CRATE / 2, y - CRATE / 2, CRATE, CRATE];
/** The gantry's centre x at a column (it may be fractional between two columns while moving). */
export const carriageX = c => X0 + CELL * c + CELL / 2;
/** The crate's centre y at a row (fractional while moving). */
export const crateY = r => DECK - CELL * r - CELL / 2 + 6;

/** The fixtures' boxes in the picture, [x, y, w, h], for the drawing, the hit regions and the annotated layout. */
export const BOXES = Object.freeze({
  cab: Object.freeze([30, 104, 176, 300]),
  cabWindow: Object.freeze([58, 172, 136, 152]),
  buffer: Object.freeze(cellBox(FIXTURES.buffer.col, 3).map((v, i) => (i === 1 ? RAIL.bottom : i === 3 ? 160 : v))),
  intake: Object.freeze([X0 + CELL * FIXTURES.intake.col + 6, DECK - 10, CELL - 12, 24]),
  rib: Object.freeze([X0 + CELL * FIXTURES.rib.col + 10, DECK - CELL * 3 + 8, CELL - 20, CELL * 3 - 8]),
  pulpit: Object.freeze([X0 + CELL * FIXTURES.pulpit.col + 4, 432, CELL - 8, DECK - 432]),
  console: Object.freeze([X0 + CELL * FIXTURES.pulpit.col + 10, 432, CELL - 20, 90]),
  platform: Object.freeze([X0 + CELL * FIXTURES.pulpit.col - 2, 522, CELL + 4, 14]),
  shaft: Object.freeze([X0 + CELL * FIXTURES.cradle.col + 6, 70, CELL - 12, DECK - 70]),
  cradle: Object.freeze(cellBox(FIXTURES.cradle.col, FIXTURES.cradle.row)),
  liftBase: Object.freeze(cellBox(FIXTURES.liftBase.col, FIXTURES.liftBase.row)),
  stop: Object.freeze([X0 + CELL * GRID.cols - 2, 92, 30, 86]),
  porthole: Object.freeze([258, 132, 120, 120]),
});

/**
 * The hit regions both attacks use, in cells and in the picture: the drop zone over the pulpit
 * (the crate entering row 2 of column 4 from row 3) and the ram zone (the gantry entering column 0).
 * The warning zones are one press before each.
 */
export const REGIONS = Object.freeze({
  dropWarning: Object.freeze({ cells: [[FIXTURES.pulpit.col, FIXTURES.pulpit.head + 1]], box: cellBox(FIXTURES.pulpit.col, FIXTURES.pulpit.head + 1), about: 'The crate over the Boom operator: one Lower from the drop' }),
  drop: Object.freeze({ cells: [[FIXTURES.pulpit.col, FIXTURES.pulpit.head]], box: cellBox(FIXTURES.pulpit.col, FIXTURES.pulpit.head), about: "The Boom operator's head: the crate entering it is the drop" }),
  ramWarning: Object.freeze({ cols: [FIXTURES.buffer.col], box: [X0 + CELL * FIXTURES.buffer.col, RAIL.top, CELL, 300], about: "The gantry at the cab's door: one Left from the ram" }),
  ram: Object.freeze({ cols: [FIXTURES.cab.col], box: [X0, RAIL.top, CELL, 300], about: "The cab: the gantry's bumper plate entering it is the ram" }),
  cradle: Object.freeze({ cells: [[FIXTURES.cradle.col, FIXTURES.cradle.row]], box: cellBox(FIXTURES.cradle.col, FIXTURES.cradle.row), about: 'The cradle: the correct position. Docked here, a survivor can send the crate alone' }),
  rib: Object.freeze({ cells: [0, 1, 2].map(r => [FIXTURES.rib.col, r]), box: BOXES.rib, about: 'The rib: blocks the crate below the top row' }),
  pulpit: Object.freeze({ cells: [0, 1, 2].map(r => [FIXTURES.pulpit.col, r]), box: BOXES.pulpit, about: 'The pulpit and its operator: the crate may not enter it from the side' }),
  intake: Object.freeze({ cells: [[FIXTURES.intake.col, 0]], box: cellBox(FIXTURES.intake.col, 0), about: 'The intake hatch, where the crate starts; it rests on the deck only here' }),
  // Accidents (the owner, 11 November 2026): where both moving at once can kill one of them by mistake.
  nearBoom: Object.freeze({ cells: NEAR.boom.cells, boxes: NEAR.boom.cells.map(([c, r]) => cellBox(c, r)), about: NEAR.boom.about }),
  nearCab: Object.freeze({ cols: NEAR.cab.carriage, box: [X0 + CELL * NEAR.cab.carriage[0], RAIL.top, CELL, 300], about: NEAR.cab.about }),
});

/**
 * The operators: their stations, the crew rig's gestures (design/board-motion/figures/gestures.mjs)
 * alive and down, where the figure's feet stand and its scale. The Boom stands behind the pulpit's
 * console, facing us, the hands on it; the Hoist sits in the cab, the hands on the two winch levers.
 * Down, each slumps over their own controls, as the board draws an Eliminated figure at a desk:
 * no wound, no mark.
 */
export const OPERATORS = Object.freeze({
  boom: Object.freeze({ gesture: 'leanBench', down: 'slumpBench', feet: [640, 522], scale: 0.96, head: 282, front: 'console' }),
  hoist: Object.freeze({ gesture: 'wheelchair', down: 'slumpDesk', feet: [118, 372], scale: 0.7, head: 200, front: 'cab' }),
});

/** The phones' view of the picture: the machine's part of it, the same crop on both phones. */
export const VIEW = Object.freeze([16, 44, 992, 612]);

/** Where each operator's name tag sits: under each station, clear of the crate's path and the gantry's. */
export const TAGS = Object.freeze({ boom: Object.freeze([640, 604]), hoist: Object.freeze([118, 432]) });
