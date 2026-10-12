// mothership:dev-only
//
// Room B as a scene: the approved laboratory (its diagram screen, shelves, slit window and
// long bench with the microscope, tubes and flask lifted unchanged from
// design/source/board/board-room-b.svg) with a new deck and the five places of the owner's
// decision of 9 October 2026: B1 the open floor with a tablet, B2 a stool and a laptop, B3 a
// specimen tank, B4 leaning on the bench, B5 at the microscope. B4 and B5 stand behind the
// bench, which is drawn again over them.

import { CANVAS, INK, PAPER, PAPER_SHADE, S, box, circle, deck, ellipse, halftone, lightCone, line, path, poly, rect } from './kit.mjs';

function floor() {
  return deck('clip-room-b-floor', {
    pools: [[420, 640, 190, 62], [650, 646, 170, 58]],
    extra: [
      line('M282 596 l22 -3 M520 700 l24 2 M700 560 l18 -2', { width: 2, color: PAPER_SHADE, opacity: 0.55 }),
      // A drain in the deck by the tank.
      ellipse(806, 676, 30, 9, S.shadow, { stroke: 3 }),
      line('M786 676 H826 M792 670 L820 682', { width: 2.5, color: CANVAS }),
    ].join(''),
  });
}

/** The specimen tank: a tall glass cylinder on a steel base, lit from inside, something branching in it. */
function tank(cx, base) {
  const r = 46, top = base - 238;
  return [
    ellipse(cx, base + 12, 70, 14, INK, { opacity: 0.32 }),
    ellipse(cx, base - 110, 88, 120, S.pale, { opacity: 0.16 }),
    path(`M${cx - r - 10} ${base} V${base - 34} H${cx + r + 10} V${base} Z`, S.shadow, { stroke: 3.5 }),
    ellipse(cx, base, r + 10, 10, S.mid, { stroke: 3.5 }),
    path(`M${cx - r} ${base - 34} V${top + 22} H${cx + r} V${base - 34} Z`, S.light, { stroke: 0, opacity: 0.85 }),
    // The specimen: a branching growth in the liquid.
    line(`M${cx} ${base - 40} C${cx - 4} ${base - 90} ${cx + 10} ${base - 120} ${cx + 2} ${base - 170} M${cx + 2} ${base - 108} C${cx + 18} ${base - 126} ${cx + 24} ${base - 150} ${cx + 30} ${base - 168} M${cx} ${base - 80} C${cx - 18} ${base - 96} ${cx - 26} ${base - 124} ${cx - 30} ${base - 150} M${cx + 2} ${base - 150} C${cx - 10} ${base - 170} ${cx - 14} ${base - 186} ${cx - 10} ${base - 200}`, { width: 7, color: S.deep }),
    line(`M${cx + 30} ${base - 168} l8 -10 M${cx - 30} ${base - 150} l-8 -8 M${cx - 10} ${base - 200} l-6 -10 M${cx + 2} ${base - 170} l10 -10`, { width: 4, color: S.deep }),
    ...[[cx - 22, base - 70, 4], [cx + 16, base - 120, 3], [cx - 8, base - 182, 3.5], [cx + 26, base - 60, 2.6], [cx - 30, base - 200, 2.4]].map(([x, y, r2]) => circle(x, y, r2, PAPER, { stroke: 1.5, opacity: 0.9 })),
    // The glass: its outline, a highlight and halftone on its dark side.
    path(`M${cx + r * 0.3} ${top + 22} H${cx + r} V${base - 34} H${cx + r * 0.3} Z`, `url(#bm-ht-ink-s)`, { stroke: 0 }),
    line(`M${cx - r + 10} ${top + 36} V${base - 48}`, { width: 6, color: PAPER, opacity: 0.6 }),
    path(`M${cx - r} ${base - 34} V${top + 22} H${cx + r} V${base - 34}`, 'none', { stroke: 4 }),
    path(`M${cx - r - 8} ${top + 24} V${top} H${cx + r + 8} V${top + 24} Z`, S.shadow, { stroke: 3.5 }),
    ellipse(cx, top, r + 8, 9, S.mid, { stroke: 3.5 }),
    line(`M${cx + r + 8} ${top + 12} C${cx + r + 40} ${top + 12} ${cx + r + 44} ${top - 30} ${cx + r + 50} ${top - 60}`, { width: 6 }),
  ].join('');
}

function props() {
  return [
    lightCone([[300, 58], [462, 58]], [[250, 640], [580, 640]], { opacity: 0.09 }),
    lightCone([[562, 58], [716, 58]], [[500, 650], [820, 650]], { opacity: 0.09 }),
    // B3: the specimen tank, front right, standing on the deck.
    tank(772, 646),
    // At the left a rolling cart of sample cases; B2's stool before it.
    ellipse(348, 652, 66, 10, INK, { opacity: 0.3 }),
    line('M310 592 V644 M386 592 V644', { width: 7 }),
    line('M310 592 V644 M386 592 V644', { width: 3, color: S.light }),
    circle(310, 648, 6, S.shadow, { stroke: 2.5 }), circle(386, 648, 6, S.shadow, { stroke: 2.5 }),
    rect(300, 620, 96, 8, S.mid, { stroke: 2.5 }),
    poly([[292, 590], [402, 590], [412, 580], [302, 580]], S.pale, { stroke: 3 }),
    rect(292, 590, 110, 10, S.light, { stroke: 3 }),
    box(304, 586, 44, 28, 10, { front: S.mid, top: S.pale, side: S.shadow }),
    box(352, 586, 36, 18, 10, { front: S.light, top: S.pale, side: S.mid }),
    line('M312 572 H338 M358 577 H382', { width: 2, color: PAPER_SHADE }),
    ellipse(426, 666, 30, 8, INK, { opacity: 0.32 }),
    line('M426 606 V662 M410 662 H442', { width: 7 }),
    ellipse(426, 604, 24, 7, S.mid, { stroke: 3 }),
    // B5 and B4's bench is the approved one; under the shelves a row of sample jars on the back wall.
    ...[0, 1, 2, 3].map(i => rect(214 + i * 18, 296, 12, 22, PAPER_SHADE, { stroke: 2, rx: 3 })),
  ].join('');
}

export const ROOM_B = {
  room: 'room-b',
  source: 'board/board-room-b.svg',
  under: ['room-b-space', 'room-b-backwall', 'room-b-shell'],
  floor,
  over: ['room-b-edges', 'room-b-props-back', 'room-b-props-front'],
  props,
  inner: [20, 20, 1004, 748],
  focus: [370, 170, 770, 700],
  layers: {
    // The bench again, over the two places behind it.
    bench: { depth: 470, lift: { group: 'room-b-props-back', first: '<polygon points="176,482 852,482 868,496 176,496"', last: '<path d="M708 326 V372 H756 V326" fill="none"' } },
  },
  slots: [
    { id: 'B1', at: [562, 662], scale: 1.08, gesture: 'tablet', mirror: true, about: 'Standing on the deck, reading a tablet' },
    { id: 'B2', at: [424, 664], scale: 1.1, gesture: 'laptopStool', about: 'Seated on a stool, a laptop open on the knees, typing' },
    { id: 'B3', at: [706, 656], scale: 1.08, gesture: 'tankBack', about: 'At the specimen tank, back to us, a hand on the glass' },
    { id: 'B4', down: 'slumpBench', at: [576, 488], depth: 400, scale: 0.95, gesture: 'leanBench', about: 'Behind the bench, leaning on it with both hands, looking at the samples' },
    { id: 'B5', down: 'slumpBench', at: [400, 488], depth: 400, scale: 0.94, gesture: 'microscope', about: 'Behind the bench, bent over the microscope' },
  ],
};
