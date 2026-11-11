// mothership:dev-only
//
// The Hospital the board shows today: the ward of four berths (the owner's decision of 18 October
// 2026, HOSPITAL-4-2026-10-18), whose drawing source is kept in its release snapshot
// (design/releases/source-snapshots/cb9386bd716dc346160509d5e49d7348fdaf4f84/design/board-v2/
// scenes/hospital-ward-four.mjs) and runs ported as apps/game/hosted/board-v2-drawing/
// hospital-ward-four.mjs. The room pilot redraws its pictures; this gives the ward's places and
// layers as that source does, for the review page to stand the crew in (tested against the
// runtime port, packages/design-tokens/test/room-pilot.test.mjs). Nothing here changes a berth.

import { FRAME } from '../board-motion/figures/body.mjs';
import { skeletonOf } from '../board-motion/figures/gestures.mjs';
import { pressPoint } from '../board-motion/scenes/frame.mjs';

const COLUMNS = [340, 684];
const ROWS = { back: 430, front: 628 };
const BACK = { top: 328, half: 77, k: 1.08 };
const FRONT = { top: 536, half: 94, k: 1.3 };
const BERTHS = [
  { id: 'H1', row: 'front', column: 0, gesture: 'bedLying', scale: 1.42, mirror: false, about: 'Front row, left: lying, an arm across the forehead' },
  { id: 'H2', row: 'front', column: 1, gesture: 'bedSitting', scale: 1.42, mirror: true, about: 'Front row, right: sitting up against the pillow' },
  { id: 'H3', row: 'back', column: 0, gesture: 'bedSitting', scale: 1.2, mirror: false, about: 'Back row, left: sitting up against the pillow' },
  { id: 'H4', row: 'back', column: 1, gesture: 'bedLying', scale: 1.2, mirror: true, about: 'Back row, right: lying, an arm across the forehead' },
];
const FRONT_DEPTH = { back: 560, front: 770 };
const HEAD_DEPTH = 600;
const [AX, AY] = FRAME.anchor;

function anchorFor({ row, column, gesture, scale, mirror }) {
  const [px, py] = pressPoint(skeletonOf(gesture));
  const [cx, cy] = [COLUMNS[column], ROWS[row]];
  const x = mirror ? cx - (AX - px) * scale : cx - (px - AX) * scale;
  return [Number(x.toFixed(1)), Number((cy - (py - AY) * scale).toFixed(1))];
}

function plateCentre({ row, column }) {
  const { top, half, k } = row === 'back' ? BACK : FRONT;
  return [Number((COLUMNS[column] - half + 22 * k).toFixed(1)), Number((top + 13.5 * k).toFixed(1))];
}

/** The ward's places and layers (the same for 7, 8 and 9 players), as the source's wardFourScene() gives them. */
export const WARD_FOUR = Object.freeze({
  room: 'hospital',
  inner: [20, 20, 1004, 748],
  focus: [190, 150, 834, 720],
  layers: Object.freeze(Object.fromEntries(BERTHS.flatMap(berth => {
    const id = `berth-four-${berth.id.toLowerCase()}`;
    const blanket = [id, Object.freeze({ depth: FRONT_DEPTH[berth.row] })];
    return berth.row === 'front' ? [[`${id}-head`, Object.freeze({ depth: HEAD_DEPTH })], blanket] : [blanket];
  }))),
  slots: Object.freeze(BERTHS.map(berth => {
    const at = anchorFor(berth);
    return Object.freeze({
      id: berth.id, row: berth.row, column: berth.column, at, scale: berth.scale, mirror: berth.mirror,
      gesture: berth.gesture, down: `${berth.gesture}+still`, depth: at[1], front: `berth-four-${berth.id.toLowerCase()}`,
      badge: plateCentre(berth), about: berth.about,
    });
  })),
});
