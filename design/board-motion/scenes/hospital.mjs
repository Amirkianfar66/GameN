// mothership:dev-only
//
// The Hospital as a scene: the approved sick bay (its two beds, cabinet, monitor, IV pole and
// window lifted unchanged from design/source/board/board-hospital.svg) with a new deck and the
// five places of the owner's decision of 9 October 2026. The Injured come here at the end of
// a round and a healed character stays until the next, so every place is a patient's but
// none shows a wound: H1 sitting up in the left bed, H2 lying in the right bed, H3 in a
// wheelchair, H4 on their feet at the IV pole, H5 on a bench, an arm across the body. The
// bandage, and H5's sling, are drawn only on a character the public view says is Injured. No
// red cross is drawn on anyone: red is a team's color, and the room and the marker say it.

import { CANVAS, INK, PAPER, PAPER_SHADE, S, circle, deck, ellipse, halftone, lightCone, line, path, poly, rect } from './kit.mjs';

function floor() {
  return deck('clip-hospital-floor', {
    pools: [[512, 628, 250, 70]],
    extra: line('M380 600 l22 -3 M620 700 l24 2 M760 610 l18 -2', { width: 2, color: PAPER_SHADE, opacity: 0.55 }),
  });
}

/** A wheelchair seen from the front, three quarters: its back, seat and the two big wheels. */
function wheelchairBack(cx, base) {
  return [
    ellipse(cx, base + 6, 74, 12, INK, { opacity: 0.32 }),
    // The back rest and its push handles.
    poly([[cx - 34, base - 150], [cx + 34, base - 150], [cx + 32, base - 78], [cx - 32, base - 78]], S.shadow, { stroke: 3.5 }),
    line(`M${cx - 34} ${base - 150} l-6 -14 M${cx + 34} ${base - 150} l6 -14`, { width: 7 }),
    // The far wheel, behind the seat.
    circle(cx + 46, base - 44, 44, 'none', { stroke: 9 }),
    circle(cx + 46, base - 44, 44, 'none', { stroke: 0 }),
    line(`M${cx + 46} ${base - 88} V${base} M${cx + 2} ${base - 44} H${cx + 90}`, { width: 2.5, color: S.light }),
    // The seat.
    poly([[cx - 40, base - 78], [cx + 40, base - 78], [cx + 46, base - 62], [cx - 46, base - 62]], S.mid, { stroke: 3.5 }),
    line(`M${cx - 30} ${base - 62} L${cx - 38} ${base - 10} M${cx + 30} ${base - 62} L${cx + 36} ${base - 10}`, { width: 5 }),
    line(`M${cx - 44} ${base - 14} H${cx - 22} M${cx + 22} ${base - 14} H${cx + 46}`, { width: 6 }),
  ].join('');
}
/** The wheelchair's near wheel, in front of whoever sits in it. */
const wheelchairFront = (cx, base) => [
  circle(cx - 48, base - 44, 44, 'none', { stroke: 10 }),
  circle(cx - 48, base - 44, 44, 'none', { stroke: 0 }),
  `<circle cx="${cx - 48}" cy="${base - 44}" r="44" fill="none" stroke="${S.light}" stroke-width="4"/>`,
  line(`M${cx - 48} ${base - 88} V${base} M${cx - 92} ${base - 44} H${cx - 4} M${cx - 79} ${base - 75} L${cx - 17} ${base - 13} M${cx - 17} ${base - 75} L${cx - 79} ${base - 13}`, { width: 2.5, color: S.light }),
  circle(cx - 48, base - 44, 7, S.mid, { stroke: 2.5 }),
].join('');

function props() {
  return [
    lightCone([[290, 58], [470, 58]], [[250, 650], [560, 650]], { opacity: 0.08 }),
    lightCone([[556, 58], [736, 58]], [[470, 650], [790, 650]], { opacity: 0.08 }),
    // A privacy curtain rail above each bed, its curtain drawn back to the wall.
    line('M150 238 H314 M710 238 H874', { width: 6 }),
    path('M150 240 Q158 300 150 360 Q166 330 170 300 Q164 270 172 240 Z', S.pale, { stroke: 3 }),
    path('M874 240 Q866 300 874 360 Q858 330 854 300 Q860 270 852 240 Z', S.pale, { stroke: 3 }),
    // H5's bench, front right, and a medicine trolley behind it.
    ellipse(656, 720, 86, 11, INK, { opacity: 0.3 }),
    rect(702, 592, 64, 70, S.mid, { stroke: 3 }),
    poly([[702, 592], [766, 592], [778, 582], [714, 582]], S.pale, { stroke: 3 }),
    line('M710 610 H758 M710 630 H758 M710 648 H758', { width: 3, color: S.shadow }),
    ...[0, 1, 2].map(i => rect(716 + i * 16, 568, 10, 16, PAPER, { stroke: 2, rx: 3 })),
    poly([[572, 664], [734, 664], [746, 652], [584, 652]], S.pale, { stroke: 3 }),
    rect(572, 664, 162, 14, S.light, { stroke: 3 }),
    line('M584 678 V716 M722 678 V716', { width: 7 }),
    // H4's IV stand, by the cabinet.
    ellipse(474, 452, 26, 6, INK, { opacity: 0.85 }),
    line('M470 250 V448 M456 448 H486', { width: 8 }),
    line('M470 254 V446', { width: 3, color: S.pale }),
    line('M452 256 H490', { width: 6 }),
    rect(478, 262, 24, 40, PAPER, { stroke: 3.5, rx: 7 }),
    line('M484 284 H496', { width: 3, color: S.light }),
    line('M490 302 C490 326 478 336 472 356', { width: 2.5 }),
    // H3's wheelchair, centre front.
    wheelchairBack(372, 738),
    wheelchairFront(372, 738),
    // A dressing tray on a stand by the left bed.
    line('M380 470 V532', { width: 5 }),
    ellipse(380, 536, 18, 5, S.shadow, { stroke: 2.5 }),
    rect(354, 458, 52, 12, S.pale, { stroke: 2.5, rx: 2 }),
    rect(362, 450, 16, 8, PAPER, { stroke: 2 }),
    line('M386 454 h12', { width: 3, color: S.mid }),
  ].join('');
}

export const HOSPITAL = {
  room: 'hospital',
  source: 'board/board-hospital.svg',
  under: ['hospital-space', 'hospital-backwall', 'hospital-shell'],
  floor,
  over: ['hospital-edges', 'hospital-props-back'],
  props,
  inner: [20, 20, 1004, 748],
  focus: [120, 160, 904, 700],
  layers: {
    bedLeft: { depth: 420, lift: { group: 'hospital-props-back', first: '<polygon points="160,392 306,392 300,498 118,498"', last: '<circle cx="284" cy="556"' } },
    bedRight: { depth: 421, lift: { group: 'hospital-props-back', first: '<polygon points="864,392 718,392 724,498 906,498"', last: '<circle cx="740" cy="556"' } },
  },
  slots: [
    { id: 'H1', down: 'bedSitting+still', at: [232, 410], scale: 0.98, gesture: 'bedSitting', about: 'Sitting up in the left bed against the pillow' },
    { id: 'H2', down: 'bedLying+still', at: [812, 410], scale: 0.98, gesture: 'bedLying', mirror: true, about: 'Lying in the right bed, an arm across the forehead' },
    { id: 'H3', down: 'wheelchair+still', at: [372, 738], scale: 1.1, gesture: 'wheelchair', about: 'Sitting in the wheelchair, the hands on its wheels' },
    { id: 'H4', at: [530, 446], scale: 0.98, gesture: 'ivPole', about: 'On their feet at the IV pole, holding it' },
    { id: 'H5', down: 'benchSling+still', at: [652, 732], scale: 1.1, gesture: 'benchSling', mirror: true, about: 'Sitting on the bench, an arm held across the body (in a sling when Injured)' },
  ],
};
