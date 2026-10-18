// mothership:dev-only
//
// The Jail as a scene: the approved cell (its blast door, keypad, pipes and bench lifted
// unchanged from design/source/board/board-jail.svg) with a new deck and the five places of
// the owner's decision of 9 October 2026. Everyone here is Jailed (the engine places a jailed
// character in the Jail), so every place is a prisoner's: J1 hunched on the bench, J2 at the
// door, J3 leaning on the wall, J4 sitting on the deck, J5 lying on the cot.

import { CANVAS, INK, PAPER, PAPER_SHADE, S, circle, deck, ellipse, halftone, lightCone, line, path, poly, rect } from './kit.mjs';

function floor() {
  return deck('clip-jail-floor', {
    pools: [[512, 610, 230, 64]],
    extra: [
      // A drain grate in the middle of the cell, and scuffs.
      ellipse(520, 690, 34, 9, S.shadow, { stroke: 3 }),
      line('M496 690 H544 M502 684 L536 696', { width: 2.5, color: CANVAS }),
      line('M330 560 l22 -3 M640 600 l24 2 M420 700 l18 -2', { width: 2, color: PAPER_SHADE, opacity: 0.55 }),
    ].join(''),
  });
}

function props() {
  return [
    // One caged lamp over the door: a hard cone of light.
    lightCone([[470, 62], [554, 62]], [[360, 600], [664, 600]], { opacity: 0.1 }),
    // Tally marks scratched on the wall beside the bench.
    line('M150 240 V270 M158 240 V270 M166 240 V270 M174 240 V270 M146 262 L180 246 M196 240 V270 M204 240 V270', { width: 3, color: S.pale }),
    // J5's cot, along the front right, its blanket folded at one end.
    ellipse(650, 752, 120, 14, INK, { opacity: 0.32 }),
    line('M556 704 V746 M750 704 V746', { width: 7 }),
    poly([[544, 688], [758, 688], [774, 672], [560, 672]], S.pale, { stroke: 3.5 }),
    rect(544, 688, 214, 18, S.light, { stroke: 3.5 }),
    halftone([[644, 688], [758, 688], [758, 706], [644, 706]], 's'),
    path('M712 672 Q734 660 762 668 L770 682 Q740 690 716 686 Z', PAPER_SHADE, { stroke: 3 }),
    // A water pipe down the right wall with a tap over a small basin.
    line('M872 120 V430', { width: 12 }),
    line('M872 120 V430', { width: 6, color: S.light }),
    path('M828 452 H900 L892 480 H836 Z', S.pale, { stroke: 3.5 }),
    line('M872 430 Q872 444 858 446', { width: 6 }),
  ].join('');
}

export const JAIL = {
  room: 'jail',
  source: 'board/board-jail.svg',
  under: ['jail-backwall', 'jail-shell'],
  floor,
  over: ['jail-edges', 'jail-props-back'],
  props,
  inner: [20, 20, 1004, 748],
  focus: [120, 160, 904, 700],
  slots: [
    { id: 'J1', down: 'benchHunched+still', at: [246, 404], scale: 0.98, gesture: 'benchHunched', about: 'Hunched on the bench, the elbows on the knees, looking down' },
    { id: 'J2', at: [512, 398], scale: 0.96, gesture: 'doorBack', about: 'At the door, back to us, both hands flat on it' },
    { id: 'J3', at: [776, 404], scale: 0.98, gesture: 'wallLean', about: 'Leaning on the wall, the arms folded, a foot against it' },
    { id: 'J4', down: 'floorSit+still', at: [380, 700], scale: 1.1, gesture: 'floorSit', mirror: true, about: 'Sitting on the deck against the wall, the knees up, the arms on them' },
    { id: 'J5', down: 'cotLying+still', at: [652, 704], scale: 1.1, gesture: 'cotLying', about: 'Lying on the cot, the hands behind the head' },
  ],
};
