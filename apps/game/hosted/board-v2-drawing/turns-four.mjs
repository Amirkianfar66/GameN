// Runtime drawing port of Claude cb9386bd716dc346160509d5e49d7348fdaf4f84; source design/board-v2/js/turns-four.mjs.
// Only development fence and relative imports adapted; canonical source preserved.
//
// The successor board's controls' layout, for the owner's four-bed decision of 18 October 2026
// (HOSPITAL-4-2026-10-18, issue #155): ./turns.mjs with its two imports changed, to ./fit-four.mjs
// and ../scenes/slots-four.mjs. Everything else below is ./turns.mjs's, byte for byte, and
// ./turns.mjs is unchanged for the current release; design/tools/board-v2-check.mjs holds the two
// files to that.
//
// The real controls beside the board: the owner's decision of 14 October 2026, "controls take
// turns" (docs/design/private-capsule.md, section 12). The board is fitBoardV2()'s with the
// capsule, laid out once for the match: no control moves it, shrinks it, scrolls it or covers a
// target a moment needs. The controls take turns with the two parts of the screen a moment does
// not need:
//
//   the choosing row  while a character choice is open: the navigation row's box, whole (its
//                     bottom safe-area inset included), the raised Pass hidden until the choice
//                     closes. Every character the server offers stays pressable at its slot, and a
//                     seated participant at its capsule target too; the row holds Cancel, the count
//                     and Done, and the top bar's line says what is being chosen.
//   the sheet         while no character choice is open: over the Hospital and the Jail, from the
//                     top of their band to the navigation's top edge, as wide as the board. It
//                     holds the private claim, a sent command's recovery row, a side choice or a
//                     confirmation. Its actions are pinned at its foot, left and right of the
//                     raised Pass; what does not fit scrolls inside it. It covers no other room:
//                     no caption a player moves by, not C1, nothing in the capsule.
//
// The top bar and the navigation are measured once for the match at its text size (bars), and the
// board takes the rest of the height. Where it does not fit, the page draws no board and says so
// (fitBoardV2's too-short fallback), as the owner decided the same day. Pure functions of the
// viewport, the roster, the safe-area insets and the bars; never of who is where or what a
// control says.

import { CAPSULE, SHELL, fitBoardV2, slotRects } from './fit-four.mjs';
import { BOARD_ROOMS } from './slots-four.mjs';
import { capsuleTargets } from './capsule-scene.mjs';

export const TURNS_VERSION = 'board-v2-turns-0.1.0';

/** The rooms the sheet slides over: the lower band, which nobody moves to by choice. */
export const SHEET_ROOMS = Object.freeze(['hospital', 'jail']);

/**
 * The sheet's measurements in CSS pixels: its padding above its content, at its sides and above
 * the navigation; the gap between its parts; its pinned actions row (one 44 px control high); the
 * room it keeps either side of the raised Pass; and the claim's collapsed row.
 */
export const SHEET = Object.freeze({ padTop: 8, padSide: 8, padBottom: 4, gap: 6, actions: 44, passMargin: 6, collapsed: 44 });

/**
 * The shell for the match's bars: each tier's top bar and navigation at least as tall as the
 * match's own, measured once at its text size before play ({ top, nav } in CSS pixels; a missing
 * or smaller value keeps the tier's). Without bars, SHELL itself.
 */
export function barsShell(bars, shell = SHELL) {
  const top = Number(bars?.top) || 0;
  const nav = Number(bars?.nav) || 0;
  if (!top && !nav) return shell;
  return Object.freeze({ ...shell, tiers: Object.freeze(shell.tiers.map(tier => Object.freeze({ ...tier, top: Math.max(tier.top, top), nav: Math.max(tier.nav, nav) }))) });
}

/**
 * The board and its controls' places for a viewport, a roster, the safe-area insets, the match's
 * bars and its actions row's height (44 px at least; taller where enlarged text needs it, measured
 * once for the match as the bars are). Returns { board (fitBoardV2's, with the capsule), fits, choosing, sheet }; where
 * the board does not fit, choosing and sheet are null and the page draws the too-short message.
 *
 *   choosing  { left, top, width, height, row }: the navigation's box, its bottom inset included;
 *             row is the part above the inset, where its controls go
 *   sheet     { left, top, width, height, body, actions, capacity }: its box over the Hospital and
 *             the Jail; body, the part that scrolls; actions { top, height, start, end }, the pinned
 *             row's two parts either side of the raised Pass ({ left, width } each); capacity, the
 *             height its content may take without scrolling (its body, a gap and its actions)
 */
export function turnsLayout(viewport, roster, { insets, bars, actions = SHEET.actions } = {}) {
  const board = fitBoardV2(viewport, roster, { insets, shell: barsShell(bars), capsule: true });
  if (!board.fits) return { board, fits: false, choosing: null, sheet: null };
  const { shell, navTop, pass } = board;
  const choosing = Object.freeze({ left: 0, top: navTop, width: viewport.width, height: viewport.height - navTop, row: Object.freeze({ top: navTop, height: shell.nav }) });
  const lower = SHEET_ROOMS.map(room => board.boxes[room]);
  const left = Math.min(...lower.map(box => box.left));
  const right = Math.max(...lower.map(box => box.left + box.width));
  const top = Math.min(...lower.map(box => box.top));
  const height = navTop - top;
  const row = Math.max(SHEET.actions, Number(actions) || 0);
  const actionsTop = navTop - SHEET.padBottom - row;
  const notch = { left: pass.cx - pass.r - SHEET.passMargin, right: pass.cx + pass.r + SHEET.passMargin };
  const inner = { left: left + SHEET.padSide, right: right - SHEET.padSide };
  const sheet = Object.freeze({
    left, top, width: right - left, height,
    body: Object.freeze({ left: inner.left, top: top + SHEET.padTop, width: inner.right - inner.left, height: actionsTop - SHEET.gap - (top + SHEET.padTop) }),
    actions: Object.freeze({
      top: actionsTop, height: row,
      start: Object.freeze({ left: inner.left, width: notch.left - inner.left }),
      end: Object.freeze({ left: notch.right, width: inner.right - notch.right }),
    }),
    capacity: height - SHEET.padTop - SHEET.padBottom,
  });
  return { board, fits: true, choosing, sheet };
}

/**
 * What the sheet shows for its parts' heights (CSS pixels, as measured at the match's text size;
 * 0 for a part not there): the claim in full while it fits with the rest; collapsed to its row
 * (collapsed px, 44 at least) only when a side choice or a confirmation shares the sheet and
 * all of it does not fit; and how far the body must scroll for what is left. The claim alone, or
 * with a recovery row, is never collapsed: in the result stage it is the private result.
 * Returns { claim: 'full' | 'collapsed' | 'none', content, scroll }.
 */
export function sheetPlan(sheet, { claim = 0, command = 0, receipt = 0 } = {}, { collapsed = SHEET.collapsed } = {}) {
  const stack = parts => parts.filter(part => part > 0).reduce((sum, part, index) => sum + (index ? SHEET.gap : 0) + part, 0);
  const full = stack([claim, command, receipt]);
  if (!claim) return { claim: 'none', content: full, scroll: Math.max(0, full - sheet.capacity) };
  if (full <= sheet.capacity || !command) return { claim: 'full', content: full, scroll: Math.max(0, full - sheet.capacity) };
  const folded = stack([Math.max(SHEET.collapsed, collapsed), command, receipt]);
  return { claim: 'collapsed', content: folded, scroll: Math.max(0, folded - sheet.capacity) };
}

/**
 * Every target on the board in viewport pixels: each slot's press area ({ room, id, left, top,
 * side }) and each capsule participant's own (room 'capsule', id 'P1' or 'P2'), whether or not
 * anyone is there now. For checks: the choosing row covers none of them, the sheet only the
 * Hospital's and the Jail's.
 */
export function boardTargets(board, roster) {
  const at = (room, rect) => ({ room, id: rect.id, left: board.boxes[room].left + board.shell.border + rect.left, top: board.boxes[room].top + board.shell.border + rect.top, side: rect.side });
  const slots = BOARD_ROOMS.flatMap(room => slotRects(room, roster, board.panels[room]).map(rect => at(room, rect)));
  const capsule = board.capsule ? capsuleTargets(board.panels[CAPSULE.id]).map(rect => at(CAPSULE.id, rect)) : [];
  return [...slots, ...capsule];
}
