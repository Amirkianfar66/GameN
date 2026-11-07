// mothership:dev-only
//
// Room A as a scene: the approved crew bay (its viewport, wall console, pipes, locker,
// crates and corners lifted unchanged from design/source/board/board-room-a.svg) with a new
// deck and the five places the owner asked for (9 October 2026), each with what its gesture
// works at: A1 a workstation, A2 the open floor, A3 a floor hatch, A4 a stack of crates, A5 a
// junction box on the wall. Drawn in the neutral family; the export recipe prints it in
// Room A's blues.

import { CANVAS, INK, PAPER, PAPER_SHADE, S, box, circle, deck, ellipse, halftone, lightCone, line, monitor, poly, rect } from './kit.mjs';

/** The deck, replacing the approved floor and its token pool: two pools of light, a grate, scuffs. */
function floor() {
  return deck('clip-room-a-floor', {
    pools: [[398, 590, 176, 62], [640, 600, 182, 64]],
    extra: [
      // A floor grate, front left.
      poly([[214, 664], [318, 664], [326, 712], [204, 712]], S.shadow),
      ...[0, 1, 2, 3, 4, 5].map(i => line(`M${226 + i * 17} 668 L${222 + i * 18.4} 708`, { width: 3, color: CANVAS })),
      // Scuffs where people stand.
      line('M300 560 l22 -4 M560 640 l26 2 M452 520 l18 -3 M700 676 l20 4', { width: 2, color: PAPER_SHADE, opacity: 0.55 }),
    ].join(''),
  });
}

/** What the five places work at, behind every character. */
function props() {
  return [
    // Light falls from the two ceiling bars.
    lightCone([[300, 58], [462, 58]], [[236, 600], [560, 600]], { opacity: 0.1 }),
    lightCone([[562, 58], [716, 58]], [[470, 612], [812, 612]], { opacity: 0.1 }),
    // A cable loop hangs from the soffit on the right.
    line('M640 104 C646 168 700 172 702 108', { width: 7 }),
    line('M640 104 C646 168 700 172 702 108', { width: 3, color: S.mid }),
    // A5: a junction box on the lit wall left of the viewport, its door open, wires showing.
    poly([[318, 186], [328, 190], [328, 286], [318, 292]], S.mid, { stroke: 3 }),
    rect(328, 188, 58, 98, S.shadow, { stroke: 3.5, rx: 3 }),
    rect(336, 198, 42, 78, CANVAS, { stroke: 2.5 }),
    line('M344 206 V250 M352 206 C352 236 360 246 360 262 M364 206 C366 230 372 238 372 256', { width: 2.6, color: S.pale }),
    line('M344 250 C340 270 344 300 352 318 M360 262 C358 284 366 300 370 322', { width: 2.6, color: S.light }),
    rect(340, 262, 34, 8, S.mid, { stroke: 2 }),
    circle(346, 212, 2.6, PAPER, { stroke: 0 }), circle(356, 212, 2.6, S.pale, { stroke: 0 }), circle(366, 212, 2.6, PAPER, { stroke: 0 }),
    poly([[328, 188], [300, 176], [300, 300], [328, 286]], S.light, { stroke: 3 }),
    line('M306 196 L322 202 M306 280 L322 276', { width: 2, color: S.mid }),
    // A4: a stack of crates against the wall right of the viewport.
    box(628, 404, 78, 72, 28, { front: S.light, top: S.pale, side: S.mid }),
    line('M628 368 H706 M667 332 V404', { width: 2.5, opacity: 0.6 }),
    box(640, 332, 58, 54, 22, { front: S.pale, top: PAPER_SHADE, side: S.light }),
    line('M652 300 L686 300 M652 312 L676 312', { width: 3, color: S.mid }),
    // A1: a workstation under the viewport, facing the back wall: two monitors, a keyboard, a mug; its stool in front.
    ellipse(522, 482, 96, 12, INK, { opacity: 0.3 }),
    rect(560, 398, 34, 82, S.mid, { stroke: 3 }),
    poly([[594, 398], [606, 390], [606, 470], [594, 480]], S.shadow, { stroke: 3 }),
    rect(452, 408, 8, 72, S.shadow, { stroke: 2.5 }),
    poly([[440, 392], [594, 392], [606, 382], [454, 382]], S.pale, { stroke: 3 }),
    rect(440, 392, 154, 16, S.light, { stroke: 3 }),
    ellipse(522, 440, 70, 30, PAPER, { opacity: 0.08 }),
    monitor(450, 318, 66, 48, { tilt: -4 }),
    monitor(526, 312, 70, 52, { tilt: 3 }),
    rect(490, 374, 62, 8, S.deep, { stroke: 2 }),
    rect(574, 366, 14, 14, S.light, { stroke: 2, rx: 2 }),
    line('M588 370 q6 0 6 5 q0 5 -6 5', { width: 2 }),
    line('M470 408 C468 440 476 462 488 480', { width: 4 }),
    // A power cable from the workstation along the deck to the right wall.
    line('M600 474 C680 490 760 476 846 470 C880 468 896 456 912 446', { width: 9 }),
    line('M600 474 C680 490 760 476 846 470 C880 468 896 456 912 446', { width: 4, color: S.mid }),
    // A3: an open floor hatch at the front right, its lid raised, a toolbox beside it; hazard marks round it.
    poly([[562, 574], [632, 574], [642, 610], [550, 610]], CANVAS, { stroke: 3.5 }),
    halftone([[562, 574], [632, 574], [642, 610], [550, 610]], 'l'),
    line('M572 586 H624 M568 598 H630', { width: 3, color: S.mid }),
    poly([[562, 574], [632, 574], [628, 530], [566, 530]], S.mid, { stroke: 3.5 }),
    line('M574 542 H620 M574 554 H622 M574 566 H624', { width: 2, color: S.light }),
    line('M544 622 L556 612 M564 622 L576 612 M584 622 L596 612 M604 622 L616 612 M624 622 L636 612', { width: 4, color: PAPER_SHADE }),
    box(452, 668, 58, 26, 18, { front: S.pale, top: PAPER_SHADE, side: S.light }),
    line('M468 644 Q481 628 494 644', { width: 4 }),
  ].join('');
}

export const ROOM_A = {
  room: 'room-a',
  source: 'board/board-room-a.svg',
  // The approved groups kept as they are, in their order around the new deck and props.
  under: ['room-a-space', 'room-a-backwall', 'room-a-shell'],
  floor,
  over: ['room-a-edges', 'room-a-props-back', 'room-a-props-front'],
  props,
  // The approved panel border is the board's own: the scene leaves it out.
  inner: [20, 20, 1004, 748],
  /** The part of the picture every panel shows whole: the centre bay between the ribs, from above the back row's heads. */
  focus: [322, 170, 702, 700],
  slots: [
    { id: 'A1', down: 'slumpDesk', at: [518, 530], scale: 1.02, gesture: 'consoleBack', about: 'Seated at the workstation, back to us, at the monitors' },
    { id: 'A2', at: [392, 542], scale: 1.025, gesture: 'think', mirror: true, about: 'Standing on the deck, an arm across, a hand at the chin' },
    { id: 'A3', at: [690, 604], scale: 1.07, gesture: 'crouchHatch', about: 'Crouched at the open floor hatch, a wrench in hand' },
    { id: 'A4', at: [664, 408], scale: 0.95, gesture: 'leanCrates', about: 'Leaning back on the crates, the arms folded' },
    { id: 'A5', at: [366, 394], scale: 0.94, gesture: 'wallPanelBack', about: 'At the open junction box on the wall, back to us, a hand in the wires' },
  ],
};
