// mothership:dev-only
//
// The successor board's layout, for the owner's four-bed decision of 18 October 2026
// (HOSPITAL-4-2026-10-18, issue #155). The board is the current one, panel for panel: its shell,
// bands, panels, boxes, Pass and fallbacks are ./fit.mjs's fitBoardV2(), the same function, so every
// room and every film placed from them is where the current board puts it, and the controls' sheet
// over the Hospital and the Jail keeps its size. Only the Hospital's slots differ: the four-berth
// ward's (../scenes/slots-four.mjs), framed in the same panel.
//
// So this module re-exports ./fit.mjs and redefines the four functions that read the slot table:
// slotRects(), slotsFit(), boardRects() and passClearance(), ./fit.mjs's own code with the
// successor's table. ./fit.mjs is unchanged for the current release. design/tools/board-v2-check.mjs
// holds the four berths to every Hospital panel the current board draws, and these functions to
// ./fit.mjs's for every other room.

import { frameScene } from '../../board-motion/scenes/frame.mjs';
import { BOARD_ROOMS, sceneOf, slotsOf } from '../scenes/slots-four.mjs';
import { MARKER_RADIUS, fitBoardV2, pressSide } from './fit.mjs';

export { BANDS, CAPSULE, FALLBACKS, MARKER_RADIUS, MIN_BOARD_WIDTH, SHELL, SHELL_TIERS, capsuleSplit, fitBoardV2, insetsOf, pressSide, shellFor } from './fit.mjs';

/**
 * Every slot's press area in a panel { width, height, cap, pad } (CSS pixels, the panel's
 * inside), as ./fit.mjs's slotRects() gives it, from the successor's slot table.
 */
export function slotRects(room, roster, panel) {
  const scene = sceneOf(room, roster);
  const frame = frameScene(scene, panel);
  const at = ([x, y]) => [frame.tx + x * frame.k, frame.ty + y * frame.k];
  return slotsOf(room, roster).map(slot => {
    const side = pressSide(slot.scale * frame.k);
    const [px, py] = at(slot.pressAt);
    const left = Math.min(panel.width - side, Math.max(0, px - side / 2));
    const top = Math.min(panel.height - panel.pad - side, Math.max(panel.cap, py - side / 2));
    const marker = [left + side - MARKER_RADIUS - 1, top + MARKER_RADIUS + 1];
    return { id: slot.id, left, top, side, press: [px, py], marker, badge: at(slot.badgeAt), frame };
  });
}

const overlap = (a, b) => !(a.left + a.side <= b.left + 0.01 || b.left + b.side <= a.left + 0.01 || a.top + a.side <= b.top + 0.01 || b.top + b.side <= a.top + 0.01);

/** Whether every slot's press area is whole inside the panel, below its caption, above its foot and apart from every other. */
export function slotsFit(room, roster, panel) {
  const rects = slotRects(room, roster, panel);
  if (rects.some(r => r.top < panel.cap - 0.5 || r.top + r.side > panel.height - panel.pad + 0.5 || r.left < -0.5 || r.left + r.side > panel.width + 0.5)) return false;
  return rects.every((a, i) => rects.every((b, j) => j <= i || !overlap(a, b)));
}

/** The board's panels' slots, each with its press area, for a viewport and a roster (and fitBoardV2's options). */
export function boardRects(viewport, roster, options) {
  const board = fitBoardV2(viewport, roster, options);
  return Object.fromEntries(BOARD_ROOMS.map(room => [room, slotRects(room, roster, board.panels[room])]));
}

/**
 * How far each slot's press area is from the raised Pass (CSS pixels between the press area's
 * square and the Pass's circle; 0 where they touch or overlap), for a viewport and a roster.
 */
export function passClearance(viewport, roster, options) {
  const board = fitBoardV2(viewport, roster, options);
  const { cx, cy, r } = board.pass;
  return BOARD_ROOMS.flatMap(room => slotRects(room, roster, board.panels[room]).map(rect => {
    const left = board.boxes[room].left + board.shell.border + rect.left;
    const top = board.boxes[room].top + board.shell.border + rect.top;
    const dx = Math.max(left - cx, 0, cx - (left + rect.side));
    const dy = Math.max(top - cy, 0, cy - (top + rect.side));
    return { room, id: rect.id, clearance: Math.max(0, Math.hypot(dx, dy) - r) };
  }));
}
