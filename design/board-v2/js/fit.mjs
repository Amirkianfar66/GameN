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
// The compact shell the owner approved on 13 October 2026 (the top bar 36 px, the navigation
// 48 px, the board's padding 2 px above and below) is the one on a phone up to 600 px tall.
//
// The shell is chosen from the space the phone leaves the page (its viewport less its safe-area
// insets): the phone kit's shell for that height at most, and a smaller one wherever that one
// would not fit, so that no target ever runs under the navigation. Where even the compact one
// does not fit at the screen's width, the board narrows to a centred column; where no width fits,
// the page says so instead of drawing a board (fitBoardV2's fallback). Targets never shrink and
// the board never scrolls.

import { PRESS, frameScene } from '../../board-motion/scenes/frame.mjs';
import { BOARD_ROOMS, sceneOf, slotsOf } from '../scenes/slots.mjs';

/** A standing figure's height in figure units, as board.js measures a press area by it. */
const STAND_HEIGHT = 214;
/** A press area's side in CSS pixels, as board.js: 44 at least, a little more on a large board. */
export const pressSide = unit => Math.max(PRESS, Math.min(64, 0.26 * STAND_HEIGHT * unit));
/** A Blackout position number's radius in CSS pixels: it sits inside its press area's upper right corner. */
export const MARKER_RADIUS = 11;

/**
 * The shells around the board, smallest first: the top bar, the navigation, the board's padding
 * above and below, and the navigation's raised Pass (its diameter and how far it rises above the
 * navigation's top edge). upTo is the tallest usable height a tier is the phone kit's choice for.
 * The short and tall tiers are the phone kit's at 5c9a151, the Pass measured there; the compact
 * tier is 22 px smaller than the short one. At the sides the board keeps 5 px: 2 px there would
 * widen Rooms A and B by 3 px and make them 2 px taller.
 */
export const SHELL_TIERS = Object.freeze([
  Object.freeze({ tier: 'compact', upTo: 600, top: 36, nav: 48, boardPadY: 2, pass: 52, passRise: 8 }),
  Object.freeze({ tier: 'short', upTo: 640, top: 44, nav: 56, boardPadY: 5, pass: 58, passRise: 13 }),
  Object.freeze({ tier: 'tall', upTo: Infinity, top: 52, nav: 64, boardPadY: 5, pass: 64, passRise: 17 }),
]);
export const SHELL = Object.freeze({
  boardPadX: 5, gap: 5, spine: 10, border: 2, captionMove: 44, captionFixed: 32, pad: 8, tiers: SHELL_TIERS,
});

/**
 * The phone kit's shell for a usable height, SHELL's own measurements and its tier's: the largest
 * a board of that height is drawn in. fitBoardV2() steps down from it where it would not fit.
 */
export function shellFor(height, shell = SHELL) {
  return shellOf(shell.tiers.find(entry => height <= entry.upTo), shell);
}
function shellOf({ upTo, ...tier }, { tiers, ...fixed } = SHELL) {
  return Object.freeze({ ...fixed, ...tier });
}

/** The narrowest board column fitBoardV2() narrows to: the smallest phone's width. */
export const MIN_BOARD_WIDTH = 320;
/**
 * What fitBoardV2() does where the phone kit's shell cannot hold the board at the screen's width:
 *   narrow      the compact shell, the board a centred column narrower than the screen (a wide
 *               and short window: a tablet or a desktop browser on its side)
 *   too-short   no width fits the usable height: the page draws no board and asks for a taller
 *               screen (a phone on its side, or browser bars leaving less than 568 px)
 *   too-narrow  the usable width is under MIN_BOARD_WIDTH and the board does not fit it: the page
 *               draws no board and asks for a wider screen (a folding phone's cover screen)
 */
export const FALLBACKS = Object.freeze(['narrow', 'too-short', 'too-narrow']);
const NO_INSETS = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });
/** Safe-area insets as { top, right, bottom, left } in CSS pixels, from an object or a "t,r,b,l" string. */
export function insetsOf(value) {
  if (!value) return NO_INSETS;
  const list = typeof value === 'string' ? value.split(',').map(Number) : [value.top, value.right, value.bottom, value.left];
  const [top, right, bottom, left] = list.map(n => (Number.isFinite(n) && n > 0 ? n : 0));
  return Object.freeze({ top, right, bottom, left });
}
export const BANDS = Object.freeze({ top: ['command-room'], middle: ['room-a', 'room-b'], lower: ['hospital', 'jail'] });
const WEIGHTS = [0.8, 1.25, 1];
const captionOf = (room, shell) => (room === 'hospital' || room === 'jail' ? shell.captionFixed : shell.captionMove);

/**
 * The private-talk capsule (the owner's request of 14 October 2026, recorded by Integration;
 * issue #139; docs/design/private-capsule.md): a permanent panel beside the Command Room, on its
 * right, in the top band. The band's inside width less the gap between the two panels and their
 * four borders is shared exactly 2:1, so the capsule's inside is exactly half the Command Room's
 * (fractional pixels, as the rest of the layout). It is scenery, not a room: no slots and no tag;
 * its caption is the fixed kind. Its only targets are each seated participant's own seat
 * (scenes/capsule.mjs capsuleTargets()). fitBoardV2() lays it out only when asked
 * ({ capsule: true }); without it, every layout is the one before.
 */
export const CAPSULE = Object.freeze({ id: 'capsule', side: 'right', share: Object.freeze([2, 1]) });
/** The Command Room's and the capsule's panel widths (their insides) in a top band of this inside width: exactly 2:1. */
export function capsuleSplit(inner, shell = SHELL) {
  const room = inner - shell.gap - 4 * shell.border;
  const capsule = (room * CAPSULE.share[1]) / (CAPSULE.share[0] + CAPSULE.share[1]);
  return { command: capsule * CAPSULE.share[0], capsule };
}

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

const needs = new Map();
/** The smallest panel height (2 px steps from the caption plus 50) at which a room's slots fit, or null. */
export function needHeight(room, roster, width, { cap, pad }) {
  const key = `${room}|${roster}|${width}|${cap}|${pad}`;
  if (needs.has(key)) return needs.get(key);
  let found = null;
  for (let height = cap + 50; height <= 900; height += 2) if (slotsFit(room, roster, { width, height, cap, pad })) { found = height; break; }
  needs.set(key, found);
  return found;
}

/**
 * The rooms' layout in a board column of this width with this shell: each band's need and its
 * most useful height, and whether they fit the board's height (problems empty) or by how much
 * they do not (deficit).
 */
function bandsAt(boardWidth, boardHeight, roster, shell, capsule = false) {
  const inner = boardWidth - 2 * shell.boardPadX;
  const half = (inner - 2 * shell.gap - shell.spine) / 2;
  const split = capsule ? capsuleSplit(inner, shell) : null;
  const panelWidth = room => (room === CAPSULE.id ? split.capsule : room === 'command-room' && split ? split.command : (room === 'command-room' ? inner : half) - 2 * shell.border);
  const problems = [];
  const list = Object.values(BANDS).map(rooms => rooms.map(room => {
    const cap = captionOf(room, shell);
    const width = panelWidth(room);
    const need = needHeight(room, roster, width, { cap, pad: shell.pad });
    if (need === null) problems.push(`${room}: its slots do not fit at ${width} px wide`);
    const scene = sceneOf(room, roster);
    // The band's most useful height is the whole band's, capsule or not: the capsule takes part of
    // the Command Room's width and nothing else, so every band is as tall as without it.
    const sceneWidth = room === 'command-room' && split ? inner - 2 * shell.border : width;
    const most = (sceneWidth * (scene.inner[3] - scene.inner[1])) / (scene.focus[2] - scene.focus[0]);
    return { need: (need ?? 900) + 2 * shell.border, most: Math.max(need ?? 900, most) + 2 * shell.border };
  }));
  const need = list.map(rooms => Math.max(...rooms.map(entry => entry.need)));
  const most = list.map((rooms, index) => Math.max(need[index], Math.min(...rooms.map(entry => entry.most))));
  const available = boardHeight - 2 * shell.boardPadY - 2 * shell.gap;
  const deficit = Math.max(0, need.reduce((a, b) => a + b, 0) - available);
  if (deficit > 0) problems.push(`the rooms need ${Math.ceil(deficit)} px more than the board's ${available} px`);
  return { inner, half, panelWidth, split, need, most, available, deficit, problems };
}

/**
 * The board for a viewport and a roster: the shell, each band's height, each room's panel and
 * its box on the phone, the raised Pass, and how it was fitted. From the viewport, the roster and
 * the safe-area insets only, never from who is where.
 *
 *   1. The usable box is the viewport less its safe-area insets; the top bar and the navigation
 *      are drawn inside it (their backgrounds may fill the insets).
 *   2. The phone kit's shell for the usable height (shellFor) is the largest drawn; where the
 *      rooms do not fit in it at the usable width, the next smaller shell, down to the compact one.
 *   3. Where not even the compact shell fits at that width, the compact shell with the board as a
 *      centred column: the widest, down to MIN_BOARD_WIDTH, at which the rooms fit (fallback
 *      'narrow').
 *   4. Where no width fits, fallback 'too-short' ('too-narrow' where the usable width is under
 *      MIN_BOARD_WIDTH) and fits false: the page must not draw the board (the bands are given at
 *      their needs only so that the problem can be measured).
 *   5. With { capsule: true }, the top band holds the Command Room and the capsule (CAPSULE), 2:1,
 *      and steps 2 to 4 measure the Command Room at its share. The capsule has a panel and a box
 *      in the top band, the Command Room's height; it needs nothing of its own, as its art fits any
 *      panel the band gives it (scenes/capsule.mjs). It takes part of the Command Room's width
 *      and nothing else: each band's most useful height is the whole band's, so on a phone (every
 *      width up to 430 px) every other room is exactly where it is without the capsule and the
 *      Command Room keeps its place and height. On a wide window, where C1 needs less height in
 *      the narrower panel, the bands may be shared differently.
 *
 * Returns { roster, viewport, insets, usable, ceiling (the phone kit's tier for the usable
 * height), shell, fallback (null, 'narrow', 'too-short' or 'too-narrow'), boardLeft, boardTop, boardWidth,
 * boardHeight, available, needs, deficit, bands, panels, boxes (viewport pixels), navTop, pass,
 * problems, fits, and capsule: true when the capsule is laid out }.
 */
export function fitBoardV2({ width, height }, roster, { insets = NO_INSETS, shell: shellSpec = SHELL, capsule = false } = {}) {
  const safe = insetsOf(insets);
  const usable = { width: width - safe.left - safe.right, height: height - safe.top - safe.bottom };
  const ceiling = shellFor(usable.height, shellSpec);
  const tiers = shellSpec.tiers.slice(0, shellSpec.tiers.findIndex(entry => entry.tier === ceiling.tier) + 1).reverse().map(entry => shellOf(entry, shellSpec));
  const compact = tiers.at(-1);
  const heightIn = shell => usable.height - shell.top - shell.nav;
  let shell = null;
  let boardWidth = usable.width;
  let fallback = null;
  let layout = null;
  for (const candidate of tiers) {
    const at = bandsAt(usable.width, heightIn(candidate), roster, candidate, capsule);
    if (!at.problems.length) { shell = candidate; layout = at; break; }
  }
  if (!shell) {
    for (let narrower = Math.floor(usable.width) - 2; narrower >= MIN_BOARD_WIDTH; narrower -= 2) {
      const at = bandsAt(narrower, heightIn(compact), roster, compact, capsule);
      if (!at.problems.length) { shell = compact; layout = at; boardWidth = narrower; fallback = 'narrow'; break; }
    }
  }
  if (!shell) {
    shell = compact;
    fallback = usable.width < MIN_BOARD_WIDTH ? 'too-narrow' : 'too-short';
    layout = bandsAt(usable.width, heightIn(compact), roster, compact, capsule);
  }
  const boardHeight = heightIn(shell);
  const { half, panelWidth, need, most, available, deficit, problems } = layout;
  const sizes = [...need];
  let left = Math.max(0, available - need.reduce((a, b) => a + b, 0));
  for (let round = 0; round < 4 && left > 0.5; round += 1) {
    const open = sizes.map((size, index) => (size < most[index] ? WEIGHTS[index] : 0));
    const share = open.reduce((a, b) => a + b, 0);
    if (!share) { sizes[1] += left; left = 0; break; }
    let given = 0;
    sizes.forEach((size, index) => { const add = Math.min((left * open[index]) / share, most[index] - size); sizes[index] += add; given += add; });
    left -= given;
  }
  const bands = Object.fromEntries(Object.keys(BANDS).map((band, index) => [band, sizes[index]]));
  const boardLeft = safe.left + (usable.width - boardWidth) / 2;
  const boardTop = safe.top + shell.top;
  const panels = {};
  // Each room's box on the phone, its border included, in CSS pixels from the viewport's top left.
  const boxes = {};
  let y = boardTop + shell.boardPadY;
  Object.entries(BANDS).forEach(([band, rooms]) => {
    rooms.forEach((room, index) => {
      panels[room] = { width: panelWidth(room), height: bands[band] - 2 * shell.border, cap: captionOf(room, shell), pad: shell.pad };
      const x = boardLeft + shell.boardPadX + (rooms.length === 1 ? 0 : index * (half + 2 * shell.gap + shell.spine));
      boxes[room] = { left: x, top: y, width: panels[room].width + 2 * shell.border, height: bands[band] };
    });
    y += bands[band] + shell.gap;
  });
  // The capsule: on the Command Room's right in the top band, a gap apart, as tall as it.
  if (capsule) {
    const command = boxes['command-room'];
    panels[CAPSULE.id] = { width: panelWidth(CAPSULE.id), height: panels['command-room'].height, cap: shell.captionFixed, pad: shell.pad };
    boxes[CAPSULE.id] = { left: command.left + command.width + shell.gap, top: command.top, width: panels[CAPSULE.id].width + 2 * shell.border, height: command.height };
  }
  const navTop = height - safe.bottom - shell.nav;
  // The Pass is a circle in the navigation's middle, over the spine, rising above its top edge.
  const pass = { cx: safe.left + usable.width / 2, cy: navTop - shell.passRise + shell.pass / 2, r: shell.pass / 2 };
  return { roster, viewport: { width, height }, insets: safe, usable, ceiling: ceiling.tier, shell, fallback, boardLeft, boardTop, boardWidth, boardHeight, available, needs: need, deficit, bands, panels, boxes, navTop, pass, problems, fits: (fallback === null || fallback === 'narrow') && problems.length === 0, ...(capsule ? { capsule: true } : {}) };
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
