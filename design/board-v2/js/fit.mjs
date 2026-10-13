// mothership:dev-only
//
// How the proposed board lays its rooms out on a phone, from the viewport, the roster and the
// captions only: never from who is where, so that no press area moves when someone moves
// (docs/design/board-v2-slots.md). It is the prototype's fitBoard() (design/board-motion/js/
// app.js) with every fixed slot counted as a target, as the Blackout needs every position
// pressable, empty ones included. Pure functions: the review page lays its board out with them
// and design/tools/board-v2-check.mjs measures them in Node.
//
// The board keeps the prototype's grid (the Command Room across the top; Room A and Room B;
// the Hospital and the Jail; a spine between) and the measurements of the phone kit's shell at
// 5c9a151: 5 px board padding and gaps, a 10 px spine, 2 px panel borders, a 44 px caption on a
// room a player moves to by its tag and 32 px on the Hospital's and the Jail's, 8 px at a panel's
// foot; the top bar 44 px and the navigation 56 px on a phone up to 640 px tall, 52 and 64 above.
// On a phone up to 600 px tall the shell is the compact one the owner approved on 13 October
// 2026: the top bar 36 px, the navigation 48 px and the board's padding 2 px above and below.

import { PRESS, frameScene } from '../../board-motion/scenes/frame.mjs';
import { BOARD_ROOMS, sceneOf, slotsOf } from '../scenes/slots.mjs';

/** A standing figure's height in figure units, as board.js measures a press area by it. */
const STAND_HEIGHT = 214;
/** A press area's side in CSS pixels, as board.js: 44 at least, a little more on a large board. */
export const pressSide = unit => Math.max(PRESS, Math.min(64, 0.26 * STAND_HEIGHT * unit));
/** A Blackout position number's radius in CSS pixels: it sits inside its press area's upper right corner. */
export const MARKER_RADIUS = 11;

/**
 * The shell around the board by the phone's height (the visible viewport): the top bar, the
 * navigation, the board's padding above and below, and the navigation's raised Pass: its
 * diameter and how far it rises above the navigation's top edge. The short and tall tiers are the
 * phone kit's at 5c9a151, the Pass measured there; the compact tier is 22 px smaller than the
 * short one. At the sides the board keeps 5 px: 2 px there would widen Rooms A and B by 3 px
 * and make them 2 px taller.
 */
export const SHELL_TIERS = Object.freeze([
  Object.freeze({ tier: 'compact', upTo: 600, top: 36, nav: 48, boardPadY: 2, pass: 52, passRise: 8 }),
  Object.freeze({ tier: 'short', upTo: 640, top: 44, nav: 56, boardPadY: 5, pass: 58, passRise: 13 }),
  Object.freeze({ tier: 'tall', upTo: Infinity, top: 52, nav: 64, boardPadY: 5, pass: 64, passRise: 17 }),
]);
export const SHELL = Object.freeze({
  boardPadX: 5, gap: 5, spine: 10, border: 2, captionMove: 44, captionFixed: 32, pad: 8, tiers: SHELL_TIERS,
});

/** The shell's measurements for a phone of this height: SHELL's own and its tier's. */
export function shellFor(height, shell = SHELL) {
  const { tiers, ...fixed } = shell;
  const { upTo, ...tier } = tiers.find(entry => height <= entry.upTo);
  return Object.freeze({ ...fixed, ...tier });
}
export const BANDS = Object.freeze({ top: ['command-room'], middle: ['room-a', 'room-b'], lower: ['hospital', 'jail'] });
const WEIGHTS = [0.8, 1.25, 1];
const captionOf = (room, shell) => (room === 'hospital' || room === 'jail' ? shell.captionFixed : shell.captionMove);

/**
 * Every slot's press area in a panel { width, height, cap, pad } (CSS pixels, the panel's
 * inside): its square on the slot's press point, moved inward to stay whole and clear of the
 * caption, as board.js's pressRect() does. Also the centres of its position number (in the press
 * area's upper right corner) and of its status badge.
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

/** The smallest panel height (2 px steps from the caption plus 50) at which a room's slots fit, or null. */
export function needHeight(room, roster, width, { cap, pad }) {
  for (let height = cap + 50; height <= 900; height += 2) if (slotsFit(room, roster, { width, height, cap, pad })) return height;
  return null;
}

/**
 * The board for a viewport and a roster: the shell's tier, each band's height, each room's panel
 * and its box on the phone, the raised Pass, and whether the rooms fit at all (fits: false when
 * the bands' needs exceed the board's height or a room never fits).
 */
export function fitBoardV2({ width, height }, roster, shellSpec = SHELL) {
  const shell = shellFor(height, shellSpec);
  const boardHeight = height - shell.top - shell.nav;
  const inner = width - 2 * shell.boardPadX;
  const half = (inner - 2 * shell.gap - shell.spine) / 2;
  const panelWidth = room => (room === 'command-room' ? inner : half) - 2 * shell.border;
  const problems = [];
  const needs = Object.values(BANDS).map(rooms => rooms.map(room => {
    const cap = captionOf(room, shell);
    const width = panelWidth(room);
    const need = needHeight(room, roster, width, { cap, pad: shell.pad });
    if (need === null) problems.push(`${room}: its slots do not fit at ${width} px wide`);
    const scene = sceneOf(room, roster);
    const most = (width * (scene.inner[3] - scene.inner[1])) / (scene.focus[2] - scene.focus[0]);
    return { need: (need ?? 900) + 2 * shell.border, most: Math.max(need ?? 900, most) + 2 * shell.border };
  }));
  const need = needs.map(list => Math.max(...list.map(entry => entry.need)));
  const most = needs.map((list, index) => Math.max(need[index], Math.min(...list.map(entry => entry.most))));
  const available = boardHeight - 2 * shell.boardPadY - 2 * shell.gap;
  const sizes = [...need];
  let left = available - need.reduce((a, b) => a + b, 0);
  if (left < 0) problems.push(`the rooms need ${Math.ceil(-left)} px more than the board's ${available} px`);
  left = Math.max(0, left);
  for (let round = 0; round < 4 && left > 0.5; round += 1) {
    const open = sizes.map((size, index) => (size < most[index] ? WEIGHTS[index] : 0));
    const share = open.reduce((a, b) => a + b, 0);
    if (!share) { sizes[1] += left; left = 0; break; }
    let given = 0;
    sizes.forEach((size, index) => { const add = Math.min((left * open[index]) / share, most[index] - size); sizes[index] += add; given += add; });
    left -= given;
  }
  const bands = Object.fromEntries(Object.keys(BANDS).map((band, index) => [band, sizes[index]]));
  const panels = {};
  // Each room's box on the phone, its border included, in CSS pixels from the viewport's top left.
  const boxes = {};
  let y = shell.top + shell.boardPadY;
  Object.entries(BANDS).forEach(([band, rooms]) => {
    rooms.forEach((room, index) => {
      panels[room] = { width: panelWidth(room), height: bands[band] - 2 * shell.border, cap: captionOf(room, shell), pad: shell.pad };
      const left = shell.boardPadX + (rooms.length === 1 ? 0 : index * (half + 2 * shell.gap + shell.spine));
      boxes[room] = { left, top: y, width: panels[room].width + 2 * shell.border, height: bands[band] };
    });
    y += bands[band] + shell.gap;
  });
  const navTop = height - shell.nav;
  // The Pass is a circle in the navigation's middle, over the spine, rising above its top edge.
  const pass = { cx: width / 2, cy: navTop - shell.passRise + shell.pass / 2, r: shell.pass / 2 };
  const deficit = Math.max(0, need.reduce((a, b) => a + b, 0) - available);
  return { roster, viewport: { width, height }, shell, boardHeight, available, needs: need, deficit, bands, panels, boxes, navTop, pass, problems, fits: problems.length === 0 };
}

/** The board's panels' slots, each with its press area, for a viewport and a roster. */
export function boardRects(viewport, roster) {
  const board = fitBoardV2(viewport, roster);
  return Object.fromEntries(BOARD_ROOMS.map(room => [room, slotRects(room, roster, board.panels[room])]));
}

/**
 * How far each slot's press area is from the raised Pass (CSS pixels between the press area's
 * square and the Pass's circle; 0 where they touch or overlap), for a viewport and a roster.
 */
export function passClearance(viewport, roster) {
  const board = fitBoardV2(viewport, roster);
  const { cx, cy, r } = board.pass;
  return BOARD_ROOMS.flatMap(room => slotRects(room, roster, board.panels[room]).map(rect => {
    const left = board.boxes[room].left + board.shell.border + rect.left;
    const top = board.boxes[room].top + board.shell.border + rect.top;
    const dx = Math.max(left - cx, 0, cx - (left + rect.side));
    const dy = Math.max(top - cy, 0, cy - (top + rect.side));
    return { room, id: rect.id, clearance: Math.max(0, Math.hypot(dx, dy) - r) };
  }));
}
