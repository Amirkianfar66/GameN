// mothership:dev-only
//
// The Command Room as a scene: the approved bridge (its great window, consoles, chart table
// and chairs lifted unchanged from design/source/board/board-command-room.svg) with a new deck.
// Only the Captain may enter it (rules/overlays/movement-decision.json), so it has the one
// place of the owner's decision of 9 October 2026: C1, the Captain leaning over the chart
// table, which is drawn again over them.

import { PAPER, PAPER_SHADE, S, deck, ellipse, lightCone, line } from './kit.mjs';

function floor() {
  return deck('clip-command-room-floor', {
    pools: [[512, 610, 300, 74]],
    extra: line('M330 650 l22 -3 M660 690 l24 2', { width: 2, color: PAPER_SHADE, opacity: 0.55 }),
  });
}

function props() {
  return [
    lightCone([[300, 40], [724, 40]], [[300, 560], [724, 560]], { opacity: 0.08 }),
    // The chart table's light rising from it.
    ellipse(512, 430, 190, 70, PAPER, { opacity: 0.1 }),
  ].join('');
}

export const COMMAND_ROOM = {
  room: 'command-room',
  source: 'board/board-command-room.svg',
  under: ['command-room-space', 'command-room-backwall', 'command-room-shell'],
  floor,
  over: ['command-room-edges', 'command-room-props-back'],
  props,
  inner: [20, 20, 1004, 748],
  focus: [64, 200, 960, 620],
  layers: {
    table: { depth: 470, lift: { group: 'command-room-props-back', first: '<ellipse cx="522" cy="600"', last: '<g clip-path="url(#clip-command-room-table)"' } },
  },
  slots: [
    { id: 'C1', at: [512, 574], depth: 440, scale: 1.2, gesture: 'captainTable', about: 'The Captain, leaning over the chart table on both hands' },
  ],
};
