// mothership:dev-only
//
// The real controls beside the board (design/board-v2/js/turns.mjs; the owner's decision of
// 14 October 2026, "controls take turns"; docs/design/private-capsule.md, section 12): the
// choosing row in the navigation's box, the sheet over the Hospital and the Jail, the bars chosen
// once for the match. These test the proposal's own geometry, not Frontend's controls, a phone
// or a match.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SHELL, fitBoardV2, insetsOf } from '../../../design/board-v2/js/fit.mjs';
import { ROSTERS } from '../../../design/board-v2/scenes/slots.mjs';
import { SHEET, SHEET_ROOMS, barsShell, boardTargets, sheetPlan, turnsLayout } from '../../../design/board-v2/js/turns.mjs';

const PHONES = [[320, 568], [360, 640], [360, 740], [375, 667], [390, 664], [390, 844], [393, 852], [414, 896], [430, 932]];
const INSETS = [null, '20,0,16,0', '47,0,34,0'];
const intersects = (a, b) => a.left < b.left + b.width - 0.01 && b.left < a.left + a.width - 0.01 && a.top < b.top + b.height - 0.01 && b.top < a.top + a.height - 0.01;
const square = target => ({ left: target.left, top: target.top, width: target.side, height: target.side });

test('without bars, the board is fitBoardV2\'s with the capsule, unchanged', () => {
  assert.equal(barsShell(), SHELL);
  assert.equal(barsShell({ top: 0, nav: 0 }), SHELL);
  for (const [width, height] of PHONES) {
    for (const roster of ROSTERS) {
      assert.deepEqual(turnsLayout({ width, height }, roster).board, fitBoardV2({ width, height }, roster, { capsule: true }));
    }
  }
});

test('the choosing row is the navigation\'s box and covers no target', () => {
  for (const [width, height] of PHONES) {
    for (const safe of INSETS) {
      for (const roster of ROSTERS) {
        const layout = turnsLayout({ width, height }, roster, { insets: insetsOf(safe) });
        if (!layout.fits) { assert.equal(layout.choosing, null); continue; }
        const { board, choosing } = layout;
        assert.deepEqual([choosing.left, choosing.top, choosing.width, choosing.height], [0, board.navTop, width, height - board.navTop]);
        assert.equal(choosing.row.height, board.shell.nav);
        assert.ok(choosing.row.height >= 44);
        for (const target of boardTargets(board, roster)) assert.ok(target.top + target.side <= choosing.top + 0.01, `${width}x${height} ${safe} ${roster}: ${target.room} ${target.id}`);
      }
    }
  }
});

test('the sheet covers the Hospital and the Jail and nothing else, its actions either side of the Pass', () => {
  for (const [width, height] of PHONES) {
    for (const safe of INSETS) {
      for (const roster of ROSTERS) {
        const layout = turnsLayout({ width, height }, roster, { insets: insetsOf(safe) });
        if (!layout.fits) continue;
        const { board, sheet } = layout;
        const where = `${width}x${height} ${safe} ${roster}`;
        assert.equal(sheet.top, Math.min(board.boxes.hospital.top, board.boxes.jail.top), where);
        assert.ok(Math.abs(sheet.top + sheet.height - board.navTop) < 1e-9, where);
        assert.equal(sheet.left, board.boxes.hospital.left);
        assert.ok(Math.abs(sheet.left + sheet.width - (board.boxes.jail.left + board.boxes.jail.width)) < 1e-9);
        for (const [room, box] of Object.entries(board.boxes)) if (!SHEET_ROOMS.includes(room)) assert.ok(!intersects(sheet, box), `${where}: the sheet over ${room}`);
        for (const target of boardTargets(board, roster)) if (intersects(sheet, square(target))) assert.ok(SHEET_ROOMS.includes(target.room), `${where}: ${target.room} ${target.id}`);
        // The pinned actions: a 44 px row, two parts wide enough for a control with words, the Pass's circle between them.
        const { actions, body } = sheet;
        assert.equal(actions.height, 44);
        assert.ok(actions.start.width >= 88 && actions.end.width >= 88, `${where}: actions ${actions.start.width}, ${actions.end.width}`);
        assert.ok(actions.start.left + actions.start.width <= board.pass.cx - board.pass.r - SHEET.passMargin + 1e-9);
        assert.ok(actions.end.left >= board.pass.cx + board.pass.r + SHEET.passMargin - 1e-9);
        assert.ok(actions.top + actions.height <= board.navTop - SHEET.padBottom + 1e-9);
        assert.ok(body.height >= 100, `${where}: body ${body.height}`);
        assert.ok(Math.abs(sheet.capacity - (body.height + SHEET.gap + actions.height)) < 1e-9);
        assert.ok(sheet.capacity >= 160, `${where}: capacity ${sheet.capacity}`);
      }
    }
  }
});

test('the claim is collapsed only when a command shares the sheet and all of it does not fit', () => {
  const sheet = { capacity: 168 };
  assert.deepEqual(sheetPlan(sheet, { claim: 70.28 }), { claim: 'full', content: 70.28, scroll: 0 });
  assert.deepEqual(sheetPlan(sheet, { claim: 70.28, receipt: 44 }), { claim: 'full', content: 120.28, scroll: 0 });
  // A claim too tall for the sheet alone is never folded: it scrolls inside it.
  assert.equal(sheetPlan(sheet, { claim: 193.11 }).claim, 'full');
  assert.ok(Math.abs(sheetPlan(sheet, { claim: 193.11 }).scroll - 25.11) < 1e-9);
  // A side choice with the declaration's claim: the claim folds to its row and the rest fits.
  assert.deepEqual(sheetPlan(sheet, { claim: 83.47, command: 105 }), { claim: 'collapsed', content: 155, scroll: 0 });
  assert.deepEqual(sheetPlan(sheet, { claim: 83.47, command: 63 }).claim, 'full');
  assert.deepEqual(sheetPlan(sheet, { command: 120.28 }), { claim: 'none', content: 120.28, scroll: 0 });
  // The collapsed row is 44 px at least, taller with enlarged text.
  assert.equal(sheetPlan(sheet, { claim: 178, command: 75.6 }, { collapsed: 30 }).content, 44 + 6 + 75.6);
  assert.equal(sheetPlan(sheet, { claim: 178, command: 75.6 }, { collapsed: 64 }).content, 64 + 6 + 75.6);
});

test('the bars are the match\'s, chosen once: a taller top bar takes height from the board, never from a target', () => {
  const enlarged = barsShell({ top: 124 });
  for (const tier of enlarged.tiers) assert.ok(tier.top >= 124);
  assert.deepEqual(enlarged.tiers.map(tier => tier.nav), SHELL.tiers.map(tier => tier.nav));
  // With the 200% text's top bar, the smallest phones get the explicit too-short page.
  for (const [width, height] of [[320, 568], [360, 640]]) {
    const layout = turnsLayout({ width, height }, 9, { bars: { top: 124 } });
    assert.equal(layout.fits, false);
    assert.equal(layout.board.fallback, 'too-short');
    assert.equal(layout.sheet, null);
  }
  for (const [width, height] of [[375, 667], [390, 844]]) {
    for (const roster of ROSTERS) {
      const layout = turnsLayout({ width, height }, roster, { bars: { top: 124 } });
      assert.equal(layout.fits, true, `${width}x${height}`);
      assert.ok(layout.board.boardTop >= 124);
      for (const target of boardTargets(layout.board, roster)) assert.ok(target.side >= 44 && target.top >= layout.board.boardTop);
    }
  }
  // 320 x 568 with 20/16 px safe areas: too short at any text size, as the owner decided.
  assert.equal(turnsLayout({ width: 320, height: 568 }, 9, { insets: insetsOf('20,0,16,0') }).fits, false);
});

test('every target is listed: each slot\'s press area and both capsule participants\'', () => {
  for (const roster of ROSTERS) {
    const { board } = turnsLayout({ width: 390, height: 844 }, roster);
    const targets = boardTargets(board, roster);
    assert.deepEqual(targets.filter(target => target.room === 'capsule').map(target => target.id), ['P1', 'P2']);
    assert.equal(targets.filter(target => target.room === 'command-room').length, 1);
    for (const target of targets) assert.ok(target.side >= 44);
  }
});

test('a taller actions row for enlarged text shortens the body, never the sheet or its capacity', () => {
  const normal = turnsLayout({ width: 390, height: 844 }, 9);
  const tall = turnsLayout({ width: 390, height: 844 }, 9, { bars: { top: 124 }, actions: 64 });
  assert.equal(tall.sheet.actions.height, 64);
  assert.equal(turnsLayout({ width: 390, height: 844 }, 9, { actions: 30 }).sheet.actions.height, 44);
  assert.equal(tall.sheet.top, normal.sheet.top);
  assert.equal(tall.sheet.capacity, normal.sheet.capacity);
  assert.equal(tall.sheet.body.height, normal.sheet.body.height - 20);
  assert.ok(Math.abs(tall.sheet.capacity - (tall.sheet.body.height + SHEET.gap + 64)) < 1e-9);
});
