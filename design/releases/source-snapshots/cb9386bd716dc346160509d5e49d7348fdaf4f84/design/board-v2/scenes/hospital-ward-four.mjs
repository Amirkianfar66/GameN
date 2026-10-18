// mothership:dev-only
//
// The Hospital as a ward of four berths: a proposal for the owner's decision of 18 October 2026
// (HOSPITAL-4-2026-10-18, issue #155). A successor match has four beds whatever its roster, and
// an incoming player who finds all four occupied is permanently eliminated and off the board. This
// ward does not replace the roster-sized one (./hospital-ward.mjs), which stays byte for byte for
// the current release; a board draws it only under the successor's slot table (./slots-four.mjs).
//
// The room is the approved sick bay, as in the roster-sized ward: its shell (ceiling, lights, side
// walls), back wall (with its monitor, medicine cabinet and window) and edges are lifted unchanged
// from design/source/board/board-hospital.svg around the same deck. Its two beds and IV pole (the
// group hospital-props-back) are not lifted: the berths take their place. A berth is seen end on,
// as the approved beds are, the patient's head on the pillow at its far end, in two rows of two:
//
//   H3 H4   the back row, at the foot of the wall
//   H1 H2   the front row, cut by the panel's lower edge
//
// Nothing is set into the wall, so the approved back wall shows whole and no berth is under the
// room's caption on a phone. The berths are larger than the roster-sized ward's (the front row at
// 1.3 times its front row, the back row at 1.2 times its middle row). The numbers follow the order
// the berths are proposed to fill in, front row first, as in the roster-sized ward.
//
// What a berth is drawn with is public furniture only, exactly as in the roster-sized ward: a
// headboard, a pillow, a blanket, a dark monitor, a status lamp, a bed light and a plate for a
// status tag. The drawing helpers below are that ward's, with the same shapes at a larger scale.
// Nothing on a berth belongs to a role or a side, and every berth of a row is drawn the same.
//
// Original vector drawing made for this repository by the Visual and Motion Designer (Claude
// Code), in the drawing vocabulary of the scenes (design/board-motion/scenes/kit.mjs). Nothing is
// written.

import { FRAME } from '../../board-motion/figures/body.mjs';
import { skeletonOf } from '../../board-motion/figures/gestures.mjs';
import { pressPoint } from '../../board-motion/scenes/frame.mjs';
import { INK, PAPER, PAPER_SHADE, S, circle, deck, ellipse, halftone, lightCone, line, poly, rect } from '../../board-motion/scenes/kit.mjs';

/** The rosters a four-berth ward is drawn for: the same four berths for 7, 8 and 9 players. */
export const FOUR_ROSTERS = Object.freeze([7, 8, 9]);
/** The ward's capacity: four beds in every successor match (HOSPITAL-4-2026-10-18). */
export const FOUR_BEDS = 4;
/** The berths' columns, in scene units, left to right. */
export const FOUR_COLUMNS = Object.freeze([340, 684]);
/** The rows of press points, in scene units: the back row at the foot of the wall, the front row below it. */
export const FOUR_ROWS = Object.freeze({ back: 430, front: 628 });

/**
 * The four berths, in their proposed filling order. gesture: the approved Hospital gestures in
 * which a patient rests there; scale: the figure's, smaller further back.
 */
export const FOUR_BERTHS = Object.freeze([
  { id: 'H1', row: 'front', column: 0, gesture: 'bedLying', scale: 1.42, mirror: false, about: 'Front row, left: lying, an arm across the forehead' },
  { id: 'H2', row: 'front', column: 1, gesture: 'bedSitting', scale: 1.42, mirror: true, about: 'Front row, right: sitting up against the pillow' },
  { id: 'H3', row: 'back', column: 0, gesture: 'bedSitting', scale: 1.2, mirror: false, about: 'Back row, left: sitting up against the pillow' },
  { id: 'H4', row: 'back', column: 1, gesture: 'bedLying', scale: 1.2, mirror: true, about: 'Back row, right: lying, an arm across the forehead' },
].map(berth => Object.freeze({ rosters: FOUR_ROSTERS, ...berth })));

/** A row's headboard and blanket, in scene units (the roster-sized ward's floor berths, scaled). */
export const FOUR_BACK = Object.freeze({ top: 328, bottom: 422, half: 77, pillowY: 390, k: 1.08 });
export const FOUR_FRONT = Object.freeze({ top: 536, bottom: 646, half: 94, pillowY: 588, k: 1.3 });
const BACK_FRONT = { fold: 458, foot: 556, half: 74, k: 1.08, footboard: true };
const FRONT_FRONT = { fold: 650, foot: 768, half: 104, k: 1.3, footboard: false };
const ROW = { back: FOUR_BACK, front: FOUR_FRONT };

/** The berths a roster has: all four, for 7, 8 and 9 players. */
export function fourBerths(roster) {
  if (!FOUR_ROSTERS.includes(roster)) throw new Error(`A four-berth ward is drawn for 7, 8 or 9 players, not ${roster}`);
  return FOUR_BERTHS;
}

const [AX, AY] = FRAME.anchor;
/**
 * Where a berth's figure stands (its anchor, in scene units) so that its gesture's press point
 * falls on the berth's press point: the inverse of toScene() in design/board-motion/scenes/frame.mjs.
 */
function anchorFor({ row, column, gesture, scale, mirror }) {
  const [px, py] = pressPoint(skeletonOf(gesture));
  const [cx, cy] = [FOUR_COLUMNS[column], FOUR_ROWS[row]];
  const x = mirror ? cx - (AX - px) * scale : cx - (px - AX) * scale;
  return [Number(x.toFixed(1)), Number((cy - (py - AY) * scale).toFixed(1))];
}

/** The centre of a berth's status plate, on its headboard: where a status tag hangs. */
export function fourPlateCentre({ row, column }) {
  const { top, half, k } = ROW[row];
  const x0 = FOUR_COLUMNS[column] - half;
  return [Number((x0 + 22 * k).toFixed(1)), Number((top + 13.5 * k).toFixed(1))];
}

/**
 * Each row's blankets are drawn over its own patients and under the next row's. The front row's
 * headboards are drawn over the back row too (they stand in front of its berths' feet) and under
 * the front row's own patients.
 */
const FRONT_DEPTH = { back: 560, front: 770 };
const HEAD_DEPTH = 600;

// ---------- the berths (the roster-sized ward's helpers, unchanged) ----------

/** A headboard's status plate (left), status lamp and dark monitor (right), on a board from x0 to x1 with its top at y. */
function headboardKit(x0, x1, y, k = 1) {
  const w = 40 * k, h = 24 * k;
  return [
    // The plate a status tag hangs on: blank here.
    rect(x0 + 8 * k, y + 6 * k, 28 * k, 15 * k, S.pale, { stroke: 2.5, rx: 3 }),
    circle(x0 + 8 * k + 28 * k + 11 * k, y + 13.5 * k, 5 * k, S.light, { stroke: 2.5 }),
    // The monitor, dark: its trace is the board's to draw.
    rect(x1 - 8 * k - w, y + 4 * k, w, h, S.deep, { stroke: 3, rx: 3 }),
    line(`M${x1 - 8 * k - w + 6 * k} ${y + 4 * k + h - 7 * k} H${x1 - 14 * k}`, { color: S.shadow, width: 2 }),
    circle(x1 - 14 * k, y + 4 * k + 6 * k, 1.8 * k, S.mid, { stroke: 0 }),
  ].join('');
}

/** A floor berth's back: the headboard with its plate, lamp and monitor, the pillow and the far end of the mattress. */
function floorBack(c, { top, bottom, half, pillowY, k }) {
  return [
    rect(c - half, top, half * 2, bottom - top, S.mid, { stroke: 4, rx: 8 }),
    rect(c - half + 9 * k, top + 34 * k, half * 2 - 18 * k, bottom - top - 40 * k, S.shadow, { stroke: 2.5, rx: 4 }),
    headboardKit(c - half, c + half, top, k),
    // The bed light on its short arm over the pillow.
    line(`M${c} ${top} V${top - 10 * k}`, { width: 4 }),
    ellipse(c, top + 40 * k, 46 * k, 22 * k, PAPER, { opacity: 0.1 }),
    rect(c - 18 * k, top - 16 * k, 36 * k, 8 * k, PAPER, { stroke: 2, rx: 3 }),
    rect(c - 34 * k, pillowY, 68 * k, 32 * k, PAPER, { stroke: 2.5, rx: 10 }),
    poly([[c - 50 * k, pillowY + 26 * k], [c + 50 * k, pillowY + 26 * k], [c + 56 * k, pillowY + 64 * k], [c - 56 * k, pillowY + 64 * k]], S.pale, { stroke: 2.5 }),
  ].join('');
}

/** A floor berth's front: the blanket from the chest to the foot, its fold, the rails and the footboard (the front row's is below the panel). */
function floorFront(c, { fold, foot, half, k, footboard }) {
  const out = [
    poly([[c - 52 * k, fold], [c + 52 * k, fold], [c + half + 2 * k, foot], [c - half - 2 * k, foot]], S.light, { stroke: 3 }),
    halftone([[c + 14 * k, fold + 8], [c + 52 * k, fold + 8], [c + half + 2 * k, foot], [c + 20 * k, foot]], 's'),
    rect(c - 54 * k, fold - 4 * k, 108 * k, 11 * k, PAPER, { stroke: 2.5, rx: 3 }),
    // The side rails, folded down along the mattress.
    line(`M${c - 60 * k} ${fold + 10 * k} L${c - half - 6 * k} ${foot - 6 * k} M${c + 60 * k} ${fold + 10 * k} L${c + half + 6 * k} ${foot - 6 * k}`, { width: 4 }),
    line(`M${c - 60 * k} ${fold + 10 * k} L${c - half - 6 * k} ${foot - 6 * k} M${c + 60 * k} ${fold + 10 * k} L${c + half + 6 * k} ${foot - 6 * k}`, { color: S.pale, width: 1.6 }),
  ];
  if (footboard) {
    out.push(rect(c - half - 8 * k, foot - 4 * k, (half + 8 * k) * 2, 20 * k, S.mid, { stroke: 4, rx: 4 }));
    out.push(line(`M${c - half} ${foot + 6 * k} H${c + half}`, { color: S.pale, width: 2 }));
  }
  return out.join('');
}

// ---------- the room ----------

function floor() {
  return deck('clip-hospital-floor', {
    pools: [[512, 556, 270, 36]],
    extra: line('M200 560 l22 -3 M760 520 l24 2 M380 552 l18 -2', { width: 2, color: PAPER_SHADE, opacity: 0.55 }),
  });
}

/** The drone's dock in the ceiling, between the two lights: closed (the drone is the board's to draw). The roster-sized ward's. */
function dock() {
  return [
    ellipse(512, 45, 30, 10, S.deep, { stroke: 3 }),
    ellipse(512, 45, 18, 5.5, S.shadow, { stroke: 2 }),
    line('M482 45 H494 M530 45 H542 M512 35 V39.5 M512 50.5 V55', { color: S.mid, width: 2 }),
    circle(540, 37, 3, S.pale, { stroke: 1.5 }),
  ].join('');
}

/** An IV stand, between the back row's berths. */
function ivStand(x) {
  return [
    ellipse(x, 478, 20, 5.5, INK, { opacity: 0.7 }),
    line(`M${x} 330 V476 M${x - 13} 476 H${x + 13}`, { width: 6 }),
    line(`M${x} 334 V474`, { width: 2.5, color: S.pale }),
    line(`M${x - 15} 336 H${x + 15}`, { width: 5 }),
    rect(x + 2, 342, 20, 32, PAPER, { stroke: 3, rx: 5 }),
  ].join('');
}

function props() {
  return [
    lightCone([[300, 58], [470, 58]], [[200, 620], [500, 620]], { opacity: 0.06 }),
    lightCone([[560, 58], [730, 58]], [[524, 620], [824, 620]], { opacity: 0.06 }),
    dock(),
    ivStand(512),
    ...FOUR_COLUMNS.map(c => floorBack(c, FOUR_BACK)),
  ].join('');
}

/**
 * The four-berth ward, as a scene: the shape of the scenes of design/board-motion/scenes/
 * (composeScene() builds its layers), with one front layer per berth and the berths as its slots.
 * The roster only labels the slots; the drawing is the same for 7, 8 and 9 players.
 */
export function wardFourScene(roster) {
  const berths = fourBerths(roster);
  const layers = Object.fromEntries(berths.flatMap(berth => {
    const c = FOUR_COLUMNS[berth.column];
    const id = `berth-four-${berth.id.toLowerCase()}`;
    const blanket = [id, { depth: FRONT_DEPTH[berth.row], draw: () => floorFront(c, berth.row === 'back' ? BACK_FRONT : FRONT_FRONT) }];
    // A front berth's headboard, pillow and mattress: in front of the back row, behind its own patient.
    return berth.row === 'front' ? [[`${id}-head`, { depth: HEAD_DEPTH, draw: () => floorBack(c, FOUR_FRONT) }], blanket] : [blanket];
  }));
  return {
    room: 'hospital',
    roster,
    source: 'board/board-hospital.svg',
    under: ['hospital-space', 'hospital-backwall', 'hospital-shell'],
    floor,
    over: ['hospital-edges'],
    props,
    inner: [20, 20, 1004, 748],
    focus: [190, 150, 834, 720],
    layers,
    slots: berths.map(berth => {
      const at = anchorFor(berth);
      return {
        id: berth.id, row: berth.row, column: berth.column, at, scale: berth.scale, mirror: berth.mirror,
        gesture: berth.gesture, down: `${berth.gesture}+still`, depth: at[1], front: `berth-four-${berth.id.toLowerCase()}`,
        badge: fourPlateCentre(berth), rosters: berth.rosters, about: berth.about,
      };
    }),
  };
}
