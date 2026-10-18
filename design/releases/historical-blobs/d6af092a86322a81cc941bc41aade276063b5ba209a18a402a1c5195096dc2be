// mothership:dev-only
//
// The Hospital as a ward: a proposal for the owner's motion specification of 13 October 2026
// (the brief's sections 1 and 9). Every Injured character is in the Hospital and the Hospital
// holds the whole starting roster, so the ward has one berth for each seat of the match: seven,
// eight or nine, fixed for the whole match. It replaces the five places of the sick bay
// (design/board-motion/scenes/hospital.mjs, kept byte for byte for the historical rule
// versions) only where the new rules apply.
//
// The room is the approved sick bay: its shell (ceiling, lights, side walls), back wall (with
// its monitor, medicine cabinet and window) and edges are lifted unchanged from
// design/source/board/board-hospital.svg around a new deck. Its two beds and IV pole (the group
// hospital-props-back) are not lifted: the berths take their place. A berth is seen end on,
// as the approved beds are, the patient's head on the pillow at its far end, in three rows so
// that every berth keeps a whole 44 px press area on the smallest phone (the Hospital panel is
// 141 px wide there):
//
//   H7 H8 H9   upper berths, recessed in the back wall (H8 from eight players, H9 at nine)
//   H4 H5 H6   the middle row, at the foot of the wall
//   H1 H2 H3   the front row, cut by the panel's lower edge
//
// The numbers follow the order the berths are proposed to fill in (front row first), so a
// seven-player ward lacks only the two upper berths it never fills; their places show the
// approved medicine cabinet of the back wall and a vitals board instead.
//
// What a berth is drawn with is public furniture only: a headboard, a pillow, a blanket, a
// monitor (dark here: a patient's state is the board's to draw, from public facts), a status
// lamp, a bed light and a plate for a status tag. Nothing on a berth belongs to a role or a
// side, and every berth of a row is drawn the same. Each berth's blanket and rail is its own
// front layer, so that the patient lies under it and the row in front hides the row behind.
//
// Original vector drawing made for this repository by the Visual and Motion Designer (Claude
// Code), in the drawing vocabulary of the scenes (design/board-motion/scenes/kit.mjs):
// paths, shapes, patterns and clip paths, in the neutral family that the reviewed export
// recipe prints in the Hospital's colors. Nothing is written.

import { FRAME } from '../../board-motion/figures/body.mjs';
import { skeletonOf } from '../../board-motion/figures/gestures.mjs';
import { pressPoint } from '../../board-motion/scenes/frame.mjs';
import { INK, PAPER, PAPER_SHADE, S, circle, deck, ellipse, halftone, lightCone, line, poly, rect } from '../../board-motion/scenes/kit.mjs';

/** The rosters a ward is drawn for: one berth per seat. */
export const WARD_ROSTERS = Object.freeze([7, 8, 9]);
/** The berths' columns, in scene units, left to right. */
export const WARD_COLUMNS = Object.freeze([290, 480, 670]);
/**
 * The rows of press points, in scene units. Three rows 185 units apart keep 44 px press areas
 * whole and apart at 141 px (320 px phone) up to 196 px (430 px phone) panel widths.
 */
export const WARD_ROWS = Object.freeze({ upper: 245, middle: 430, front: 615 });

/**
 * The berths, in their proposed filling order. gesture: the approved Hospital gestures (H1's
 * sitting up, H2's lying down) in which a patient rests there; scale: smaller further back;
 * rosters: the rosters that have the berth.
 */
export const WARD_BERTHS = Object.freeze([
  { id: 'H1', row: 'front', column: 0, gesture: 'bedLying', scale: 1.1, mirror: false, about: 'Front row, left: lying, an arm across the forehead' },
  { id: 'H2', row: 'front', column: 1, gesture: 'bedSitting', scale: 1.1, mirror: false, about: 'Front row, middle: sitting up against the pillow' },
  { id: 'H3', row: 'front', column: 2, gesture: 'bedLying', scale: 1.1, mirror: true, about: 'Front row, right: lying, an arm across the forehead' },
  { id: 'H4', row: 'middle', column: 0, gesture: 'bedSitting', scale: 1, mirror: false, about: 'Middle row, left: sitting up against the pillow' },
  { id: 'H5', row: 'middle', column: 1, gesture: 'bedLying', scale: 1, mirror: true, about: 'Middle row, middle: lying, an arm across the forehead' },
  { id: 'H6', row: 'middle', column: 2, gesture: 'bedSitting', scale: 1, mirror: true, about: 'Middle row, right: sitting up against the pillow' },
  { id: 'H7', row: 'upper', column: 0, gesture: 'bedLying', scale: 0.9, mirror: false, about: 'Upper berth in the wall, left: lying' },
  { id: 'H8', row: 'upper', column: 1, gesture: 'bedLying', scale: 0.9, mirror: true, rosters: [8, 9], about: 'Upper berth in the wall, middle: lying (eight and nine players)' },
  { id: 'H9', row: 'upper', column: 2, gesture: 'bedLying', scale: 0.9, mirror: false, rosters: [9], about: 'Upper berth in the wall, right: lying (nine players)' },
].map(berth => Object.freeze({ rosters: [7, 8, 9], ...berth })));

/** The berths a roster has. */
export function wardBerths(roster) {
  if (!WARD_ROSTERS.includes(roster)) throw new Error(`A ward is drawn for 7, 8 or 9 players, not ${roster}`);
  return WARD_BERTHS.filter(berth => berth.rosters.includes(roster));
}

const [AX, AY] = FRAME.anchor;
/**
 * Where a berth's figure stands (its anchor, in scene units) so that its gesture's press point
 * falls on the berth's press point: the inverse of toScene() in design/board-motion/scenes/frame.mjs.
 */
function anchorFor({ row, column, gesture, scale, mirror }) {
  const [px, py] = pressPoint(skeletonOf(gesture));
  const [cx, cy] = [WARD_COLUMNS[column], WARD_ROWS[row]];
  const x = mirror ? cx - (AX - px) * scale : cx - (px - AX) * scale;
  return [Number(x.toFixed(1)), Number((cy - (py - AY) * scale).toFixed(1))];
}

/** The centre of a berth's status plate (on its headboard, or over an upper berth's opening): where a status tag hangs. */
function plateCentre({ row, column }) {
  const c = WARD_COLUMNS[column];
  const [x0, y, k] = row === 'upper' ? [c - 70, 134, 0.9] : row === 'middle' ? [c - 64, 352, 0.9] : [c - 72, 556, 1];
  return [Number((x0 + 22 * k).toFixed(1)), Number((y + 13.5 * k).toFixed(1))];
}

/** Each row's blankets are drawn over its own patients and under the next row's. */
const FRONT_DEPTH = { upper: 300, middle: 495, front: 690 };

// ---------- the berths ----------

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

/** An upper berth's alcove in the back wall: bezel, dark recess, bed light, pillow and the far end of its bed. */
function upperBack(c) {
  const top = 176, bottom = 336;
  return [
    // The bezel and its plate, lamp and monitor above the opening.
    rect(c - 70, top - 42, 140, 40, S.mid, { stroke: 3.5, rx: 8 }),
    headboardKit(c - 70, c + 70, top - 42, 0.9),
    rect(c - 70, top, 140, bottom - top, S.mid, { stroke: 4, rx: 18 }),
    rect(c - 58, top + 12, 116, bottom - top - 22, S.deep, { stroke: 3, rx: 12 }),
    // The far wall of the recess, and its corners running back into the wall.
    rect(c - 42, top + 22, 84, 66, S.shadow, { stroke: 2.5, rx: 6 }),
    line(`M${c - 56} ${top + 14} L${c - 42} ${top + 24} M${c + 56} ${top + 14} L${c + 42} ${top + 24} M${c - 42} ${top + 88} L${c - 56} ${top + 130} M${c + 42} ${top + 88} L${c + 56} ${top + 130}`, { color: INK, width: 2 }),
    // The bed light along the recess's top, and its glow.
    ellipse(c, top + 40, 52, 30, PAPER, { opacity: 0.12 }),
    rect(c - 34, top + 16, 68, 6, PAPER, { stroke: 2, rx: 3 }),
    // The pillow, and the bed running out of the recess towards us.
    rect(c - 28, top + 52, 56, 26, PAPER, { stroke: 2.5, rx: 9 }),
    poly([[c - 40, top + 76], [c + 40, top + 76], [c + 52, top + 128], [c - 52, top + 128]], S.pale, { stroke: 2.5 }),
  ].join('');
}

/** An upper berth's front: the blanket pulled up to the chest and the alcove's sill. */
function upperFront(c) {
  return [
    poly([[c - 44, 268], [c + 44, 268], [c + 54, 318], [c - 54, 318]], S.light, { stroke: 3 }),
    halftone([[c + 10, 276], [c + 46, 276], [c + 54, 318], [c + 14, 318]], 's'),
    rect(c - 46, 264, 92, 9, PAPER, { stroke: 2.5, rx: 3 }),
    rect(c - 66, 312, 132, 22, S.light, { stroke: 3.5, rx: 6 }),
    halftone([[c - 64, 324], [c + 64, 324], [c + 64, 332], [c - 64, 332]], 's'),
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

const MIDDLE = { top: 352, bottom: 430, half: 64, pillowY: 404, k: 0.9 };
const FRONT = { top: 556, bottom: 640, half: 72, pillowY: 596, k: 1 };
const MIDDLE_FRONT = { fold: 452, foot: 536, half: 62, k: 0.9, footboard: true };
const FRONT_FRONT = { fold: 638, foot: 768, half: 80, k: 1, footboard: false };

/**
 * What stands in an upper berth's place in a ward too small for it. The middle one shows the
 * approved medicine cabinet of the back wall, which its berth otherwise covers; the right one a
 * vitals board.
 */
function vitalsBoard(c) {
  return [
    rect(c - 62, 182, 124, 128, S.deep, { stroke: 4, rx: 8 }),
    ...[0, 1, 2].map(i => rect(c - 50, 194 + i * 36, 100, 26, S.shadow, { stroke: 2.5, rx: 3 })),
    line(`M${c - 44} 211 H${c - 16} L${c - 10} 201 L${c - 4} 217 L${c + 2} 207 H${c + 42}`, { color: S.pale, width: 2.5 }),
    line(`M${c - 44} 247 H${c - 4} L${c + 2} 237 L${c + 8} 253 L${c + 14} 243 H${c + 42}`, { color: S.light, width: 2.5 }),
    line(`M${c - 44} 283 H${c + 12}`, { color: S.mid, width: 2.5 }),
    ...[0, 1, 2].map(i => circle(c + 22 + i * 14, 300, 4, i === 0 ? S.pale : S.mid, { stroke: 1.5 })),
  ].join('');
}

// ---------- the room ----------

function floor() {
  return deck('clip-hospital-floor', {
    pools: [[480, 548, 250, 34]],
    extra: line('M200 560 l22 -3 M760 520 l24 2 M380 552 l18 -2', { width: 2, color: PAPER_SHADE, opacity: 0.55 }),
  });
}

/** The drone's dock in the ceiling, between the two lights: closed (the drone is the board's to draw). */
function dock() {
  return [
    ellipse(512, 45, 30, 10, S.deep, { stroke: 3 }),
    ellipse(512, 45, 18, 5.5, S.shadow, { stroke: 2 }),
    line('M482 45 H494 M530 45 H542 M512 35 V39.5 M512 50.5 V55', { color: S.mid, width: 2 }),
    circle(540, 37, 3, S.pale, { stroke: 1.5 }),
  ].join('');
}

function props(roster) {
  const out = [
    lightCone([[300, 58], [470, 58]], [[230, 600], [520, 600]], { opacity: 0.06 }),
    lightCone([[560, 58], [730, 58]], [[460, 600], [780, 600]], { opacity: 0.06 }),
    dock(),
  ];
  const has = id => wardBerths(roster).some(berth => berth.id === id);
  // The upper row, in the back wall: a berth where the roster has one, otherwise furniture.
  const upper = [['H7', null], ['H8', () => ''], ['H9', vitalsBoard]];
  upper.forEach(([id, instead], index) => out.push(has(id) ? upperBack(WARD_COLUMNS[index]) : instead(WARD_COLUMNS[index])));
  // An IV stand in each gap of the middle row, behind it.
  for (const x of [385, 575]) {
    out.push(ellipse(x, 470, 18, 5, INK, { opacity: 0.7 }));
    out.push(line(`M${x} 352 V468 M${x - 12} 468 H${x + 12}`, { width: 6 }));
    out.push(line(`M${x} 356 V466`, { width: 2.5, color: S.pale }));
    out.push(line(`M${x - 14} 358 H${x + 14}`, { width: 5 }));
    out.push(rect(x + 2, 364, 18, 28, PAPER, { stroke: 3, rx: 5 }));
  }
  for (const c of WARD_COLUMNS) out.push(floorBack(c, MIDDLE));
  for (const c of WARD_COLUMNS) out.push(floorBack(c, FRONT));
  return out.join('');
}

/**
 * The ward for a roster of 7, 8 or 9, as a scene: the shape of the scenes of
 * design/board-motion/scenes/ (composeScene() builds its layers), with one front layer per
 * berth and the berths as its slots.
 */
export function wardScene(roster) {
  const berths = wardBerths(roster);
  const layers = Object.fromEntries(berths.map(berth => {
    const c = WARD_COLUMNS[berth.column];
    const draw = berth.row === 'upper' ? () => upperFront(c) : () => floorFront(c, berth.row === 'middle' ? MIDDLE_FRONT : FRONT_FRONT);
    return [`berth-${berth.id.toLowerCase()}`, { depth: FRONT_DEPTH[berth.row], draw }];
  }));
  return {
    room: 'hospital',
    roster,
    source: 'board/board-hospital.svg',
    under: ['hospital-space', 'hospital-backwall', 'hospital-shell'],
    floor,
    over: ['hospital-edges'],
    props: () => props(roster),
    inner: [20, 20, 1004, 748],
    focus: [160, 150, 800, 720],
    layers,
    slots: berths.map(berth => {
      const at = anchorFor(berth);
      return {
        id: berth.id, row: berth.row, column: berth.column, at, scale: berth.scale, mirror: berth.mirror,
        gesture: berth.gesture, down: `${berth.gesture}+still`, depth: at[1], front: `berth-${berth.id.toLowerCase()}`,
        badge: plateCentre(berth), rosters: berth.rosters, about: berth.about,
      };
    }),
  };
}

