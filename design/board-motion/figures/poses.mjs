// mothership:dev-only
//
// The poses of the board-motion figures. Each is a skeleton and a drawing order; every
// character is drawn in it by the same rules, so a pose never says anything about who the
// character is. Which pose a piece takes comes only from public facts: the station it stands
// at, the Captain, Injured, Jailed and Eliminated (layout.js), never from anything private.

import { INK, PAPER, STEEL, blob, chain, curve } from './rig.mjs';
import { BELT, BOOTS, SUIT, head } from './crew.mjs';
import { GEOMETRY } from './geometry.mjs';

const mirror = (points, x, dir) => points.map(([dx, dy]) => [x + dx * dir, dy]);

export function hand(cv, c, [x, y], angle = 0, size = 1.15) {
  cv.group(`translate(${x} ${y}) rotate(${angle}) scale(${size})`, () => {
    cv.form(blob([[-4.3, -3.1], [3.8, -3.8], [6.4, 0], [4.3, 4.3], [-3.1, 4.1], [-5, 0.5]]), c.skin, { stroke: 1.9, shadow: blob([[0.6, 1], [6.2, 0.4], [4.2, 4.2], [-1.2, 4]]), dots: false });
    cv.line('M-1.6 -3.2 Q-4 -0.2 -1.8 2.4', { width: 1.1 });
  });
}

/** A boot, toe to the left (dir -1) or the right (dir 1). */
export function boot(cv, [x, y], dir = -1) {
  const shape = mirror([[-6, -6], [-6, 3], [-12, 6.5], [-16, 11], [-14, 14.5], [5, 14.5], [7, 10], [6.4, -6]], x, -dir).map(([px, dy]) => [px, y + dy]);
  cv.form(blob(shape, 0.5), BOOTS, { stroke: 2.3, shadow: blob(mirror([[1, -6], [6.4, -6], [7, 10], [5, 14.5], [0, 14.5]], x, -dir).map(([px, dy]) => [px, y + dy]), 0.5) });
  cv.line(`M${x + 15 * dir} ${y + 11.6} L${x - 6.6 * dir} ${y + 11.6}`, { width: 1.6 });
  cv.line(`M${x - 5.6} ${y - 1} L${x + 5.6} ${y - 1}`, { width: 1.2, color: STEEL.light });
}

/** A shoulder patch: the character's field, with a stripe of its accent. */
export function patch(cv, c, [x, y], angle) {
  cv.group(`translate(${x} ${y}) rotate(${angle})`, () => {
    cv.form('M-5.4 -2.8 H5.4 V2.8 H-5.4 Z', c.field, { stroke: 1.6 });
    cv.line('M-5.4 0.2 H5.4', { width: 1.1, color: c.accent });
  });
}

const armR = [8.4, 6.8, 5.2];
const legR = [11.8, 8.6, 6.4];
const floor = (cx, rx) => `M${cx - rx} 233 A${rx} 6.5 0 1 0 ${cx + rx} 233 A${rx} 6.5 0 1 0 ${cx - rx} 233 Z`;

/** The neck, then the torso: the crew suit, its zip, belt, buckle and patches. */
function standingTorso(cv, c) {
  cv.form(chain([[59.5, 50], [61, 66]], [6.8, 7.6]), c.skin, { stroke: 2.3, shadow: chain([[64, 50], [65.6, 66]], [4, 4.6]) });
  const torso = blob([[37.5, 70], [50, 62], [72, 62], [88, 69], [86.5, 88], [81, 110], [83, 128], [62, 133], [42, 128], [44, 110], [37, 89]], 0.85);
  cv.form(torso, SUIT, { stroke: 2.8, shadow: blob([[72, 62.5], [88, 69], [86.5, 88], [81, 110], [83, 128], [72, 131], [75, 108], [77, 84]], 0.85), hatch: true });
  cv.line('M61 63.5 L61.6 122', { width: 1.6 });
  cv.line('M51 62.8 L61 74 L71 62.8', { width: 2 });
  cv.line('M46 85 Q52.6 89.6 50.4 100 M74 83 Q69 91.6 73 101', { width: 1.2 });
  cv.line(curve([[41, 75], [40, 86], [42.6, 97]]), { width: 1.2, color: PAPER, opacity: 0.7 });
  cv.form('M43.6 118 Q62 123.2 81.4 118 L82 127 Q62 132.6 43.2 127 Z', BELT, { stroke: 2 });
  cv.form('M57.4 118.8 H66.4 V128.2 H57.4 Z', c.accent, { stroke: 1.6 });
  patch(cv, c, [44.6, 73], -22);
  patch(cv, c, [80.6, 72.6], 20);
}

/** A standing figure: what is behind the body, the legs, the torso, what is in front, the head. */
function standingWith(cv, c, { behind = () => {}, over = () => {}, legs = null }) {
  cv.fill(floor(60, 44), INK, 0.3);
  behind();
  if (legs) legs();
  else {
    cv.limb([[53, 126], [49, 175], [46, 213]], legR, SUIT);
    cv.limb([[71, 126], [76, 175], [79, 214]], legR, SUIT);
    cv.line(curve([[43, 170], [49, 175.5], [56, 172]]), { width: 1.2 });
    cv.line(curve([[69, 171], [76, 176.5], [83, 173]]), { width: 1.2 });
    boot(cv, [46, 214], -1);
    boot(cv, [79, 215], 1);
  }
  standingTorso(cv, c);
  over();
  cv.group('translate(58 36) scale(1.32)', () => head(cv, c, 'front'));
}

/** Standing, weight on the far leg, a hand on the hip. */
export function standing(cv, c) {
  standingWith(cv, c, {
    behind() {
      cv.limb([[39, 73], [31, 106], [33, 134]], armR, SUIT);
      hand(cv, c, [33.5, 139], 95, 1.25);
    },
    over() {
      cv.limb([[84, 72], [103, 100], [85, 122]], armR, SUIT);
      cv.line(curve([[97.6, 93], [101, 101], [107.6, 102]]), { width: 1.3 });
      cv.line('M87 114.6 L91.4 120.2', { width: 2.8, color: c.accent });
      hand(cv, c, [82.6, 123.6], 200, 1.22);
    },
  });
}

/** Standing with the arms folded. */
export function standingFolded(cv, c) {
  standingWith(cv, c, {
    over() {
      // The far arm: the upper arm at the side, the forearm across the body under the near arm.
      cv.limb([[40, 74], [35, 100]], [8.4, 7.2], SUIT);
      cv.limb([[36, 103], [60, 108], [84, 103]], [7, 6.4, 5.6], SUIT);
      // The near arm on top: the upper arm at the side, the forearm across, the hand on the far arm.
      cv.limb([[84, 73], [92, 98]], [8.4, 7.2], SUIT);
      cv.limb([[92, 99], [68, 96], [47, 92]], [7, 6.4, 5.6], SUIT);
      cv.line('M76 93.4 L77 100', { width: 2.6, color: c.accent });
      hand(cv, c, [42.6, 91], 186, 1.18);
      cv.line(curve([[86, 104], [92, 101], [96, 95]]), { width: 1.2 });
    },
  });
}

/** Standing with the hands clasped behind the back: the elbows show, the hands do not. */
export function standingBack(cv, c) {
  standingWith(cv, c, {
    behind() {
      cv.limb([[40, 74], [31, 100], [46, 122]], armR, SUIT);
      cv.limb([[84, 73], [93, 100], [78, 122]], armR, SUIT);
    },
    over() {
      cv.line(curve([[29, 96], [32, 102], [38, 104]]), { width: 1.2 });
      cv.line(curve([[86, 104], [92, 102], [95, 96]]), { width: 1.2 });
    },
  });
}

/**
 * Walking, mid-stride, the near foot forward: the piece on its way between rooms. Drawn going
 * right; a move to the left mirrors it.
 */
export function walking(cv, c) {
  standingWith(cv, c, {
    behind() {
      // The far arm swings forward, behind the body.
      cv.limb([[40, 74], [38, 101], [50, 122]], armR, SUIT);
      hand(cv, c, [53, 126], 40, 1.2);
    },
    legs() {
      // The far leg pushes off behind; the near leg reaches forward.
      cv.limb([[54, 126], [44, 172], [30, 206]], legR, SUIT);
      boot(cv, [31, 207], 1);
      cv.limb([[70, 126], [86, 170], [92, 212]], legR, SUIT);
      cv.line(curve([[79, 166], [86, 171.5], [93, 167]]), { width: 1.2 });
      boot(cv, [91, 214], 1);
    },
    over() {
      // The near arm swings back.
      cv.limb([[84, 72], [94, 99], [102, 120]], armR, SUIT);
      cv.line('M98 111 L103.6 114.6', { width: 2.8, color: c.accent });
      hand(cv, c, [104, 125], 70, 1.2);
    },
  });
}

/** The crew suit's front for the poses cut by a prop: torso, zip, collar, patches. */
function suitFront(cv, c, torso, shadow, { zip, collar, patches }) {
  cv.form(torso, SUIT, { stroke: 2.8, shadow, hatch: true });
  if (zip) cv.line(zip, { width: 1.6 });
  if (collar) cv.line(collar, { width: 2 });
  for (const [at, angle] of patches) patch(cv, c, at, angle);
}

/** Leaning over the chart table or the laboratory counter, both hands on it. Below the prop line the prop hides it. */
export function leaning(cv, c) {
  cv.form(chain([[70, 52], [70, 68]], [7, 7.8]), c.skin, { stroke: 2.3, shadow: chain([[74.6, 52], [74.6, 68]], [4, 4.6]) });
  suitFront(cv, c,
    blob([[40, 78], [55, 66], [85, 66], [100, 78], [98, 104], [94, 152], [46, 152], [42, 104]], 0.85),
    blob([[80, 66], [100, 78], [98, 104], [94, 152], [80, 152], [84, 104], [86, 80]], 0.85),
    { zip: 'M70 70 L70 152', collar: 'M60 66.4 L70 79 L80 66.4', patches: [[[48, 77], -32], [[92, 77], 32]] });
  cv.line('M52 96 Q58 100 56 110 M88 96 Q82 100 84 110', { width: 1.2 });
  cv.limb([[45, 81], [31, 108], [38, 134]], [8.8, 7.2, 5.6], SUIT);
  cv.limb([[95, 81], [109, 108], [102, 134]], [8.8, 7.2, 5.6], SUIT);
  cv.line(curve([[26, 104], [31, 110], [37, 107]]), { width: 1.2 });
  cv.line(curve([[103, 107], [109, 110], [114, 104]]), { width: 1.2 });
  // The hands lie on the table top, over the prop.
  cv.front(() => {
    hand(cv, c, [38.6, 139.4], 96, 1.3);
    hand(cv, c, [101.4, 139.4], 84, 1.3);
  });
  cv.group('translate(70 41) scale(1.32)', () => head(cv, c, 'down'));
}

/** Sitting up in the Hospital bed against the pillow, bandaged: Injured. Below the blanket the bed hides it. */
export function inBed(cv, c) {
  cv.form(blob([[52, 30], [118, 34], [124, 74], [60, 76]], 0.6), PAPER, { stroke: 2.4, shadow: blob([[96, 33], [118, 34], [124, 74], [100, 75]], 0.6) });
  cv.form(chain([[64, 56], [65, 72]], [6.8, 7.6]), c.skin, { stroke: 2.3, shadow: chain([[68.6, 56], [69.6, 72]], [4, 4.6]) });
  suitFront(cv, c,
    blob([[42, 84], [54, 72], [80, 71], [95, 80], [95, 106], [92, 150], [48, 150], [44, 106]], 0.85),
    blob([[76, 71], [95, 80], [95, 106], [92, 150], [78, 150], [82, 104], [83, 80]], 0.85),
    { zip: 'M66 73 L66.6 150', collar: 'M57 72 L66 82 L76 71.6', patches: [[[47, 83], -26], [[89, 81], 24]] });
  // Both arms rest on the blanket, over the prop. Injured is said by the bandage, the bed and the marker.
  cv.front(() => {
    cv.limb([[46, 88], [36, 114], [52, 130]], armR, SUIT);
    hand(cv, c, [56.6, 131], 10, 1.22);
    cv.limb([[90, 86], [100, 112], [80, 128]], armR, SUIT);
    hand(cv, c, [75, 129.6], 176, 1.2);
  });
  cv.group('translate(64 45) scale(1.3)', () => head(cv, c, 'front', { bandage: true }));
}

/**
 * Seated, seen from the side, facing left: on the Jail bench (hunched, elbows on the knees,
 * looking down), or upright on a stool at a console.
 */
function seated(cv, c, { hunched }) {
  cv.fill('M18 197 A46 6 0 1 0 110 197 A46 6 0 1 0 18 197 Z', INK, 0.3);
  const seatLeg = [11.6, 8.2, 6];
  if (!hunched) {
    cv.form('M70 140 H108 V148 H70 Z', BELT, { stroke: 2 });
    cv.form('M86 148 H92 V188 H86 Z', BOOTS, { stroke: 1.8 });
    cv.form('M74 188 Q89 184 104 188 L104 192 H74 Z', BOOTS, { stroke: 1.8 });
  }
  cv.limb([[92, 132], [60, 130], [58, 182]], seatLeg, SUIT);
  boot(cv, [58, 183], -1);
  if (hunched) cv.limb([[82, 92], [66, 122], [50, 132]], [8, 6.6, 5], SUIT);
  else cv.limb([[94, 90], [84, 116], [60, 112]], [8, 6.6, 5], SUIT);
  const torso = hunched
    ? blob([[58, 94], [70, 80], [88, 82], [100, 104], [106, 134], [86, 142], [72, 130], [64, 112]], 0.85)
    : blob([[70, 82], [84, 73], [99, 81], [103, 108], [104, 137], [84, 143], [72, 132], [70, 104]], 0.85);
  const shadow = hunched
    ? blob([[86, 82], [100, 104], [106, 134], [94, 140], [90, 110]], 0.85)
    : blob([[94, 78], [103, 108], [104, 137], [94, 141], [92, 108]], 0.85);
  cv.form(torso, SUIT, { stroke: 2.8, shadow, hatch: true });
  cv.form(hunched ? 'M72 126 Q90 131 105 127 L106 135 Q90 140 72.6 134 Z' : 'M71 124 Q88 129 103.6 125 L104 133 Q88 138 71.6 132 Z', BELT, { stroke: 1.9 });
  cv.form(hunched ? 'M86 128.6 H93 V136.4 H86 Z' : 'M85 126.6 H92 V134.4 H85 Z', c.accent, { stroke: 1.4 });
  patch(cv, c, hunched ? [80, 88] : [90, 84], hunched ? 34 : 14);
  cv.limb([[88, 138], [54, 138], [50, 186]], seatLeg, SUIT);
  cv.line(curve([[50, 131], [56, 139], [50, 146]]), { width: 1.3 });
  boot(cv, [50, 187], -1);
  if (hunched) {
    cv.form(chain([[64, 74], [72, 88]], [6.6, 7.4]), c.skin, { stroke: 2.2, shadow: chain([[68, 74], [76, 88]], [3.8, 4.2]) });
    cv.group('translate(58 64) rotate(-16) scale(1.3)', () => head(cv, c, 'down'));
    cv.limb([[80, 96], [60, 128], [46, 138]], armR, SUIT);
    cv.line(curve([[55, 124], [60, 131], [67, 128]]), { width: 1.2 });
    hand(cv, c, [42, 139], 160, 1.24);
  } else {
    cv.form(chain([[80, 56], [82, 74]], [6.6, 7.4]), c.skin, { stroke: 2.2, shadow: chain([[84.6, 56], [86.6, 74]], [3.8, 4.2]) });
    cv.group('translate(78 50) scale(1.3)', () => head(cv, c, 'front'));
    cv.limb([[86, 88], [72, 116], [48, 110]], armR, SUIT);
    cv.line(curve([[68, 110], [72, 118], [79, 117]]), { width: 1.2 });
    hand(cv, c, [42, 110], 184, 1.24);
  }
}

export const onBench = (cv, c) => seated(cv, c, { hunched: true });
export const atConsole = (cv, c) => seated(cv, c, { hunched: false });

/**
 * Sitting on the floor, the knees drawn up, the arms on them and the head bowed: Eliminated.
 * The board greys it and the public marker says it; nothing shows how. No wound, no mark.
 */
export function out(cv, c) {
  cv.fill(floor(62, 46), INK, 0.3);
  // The body behind the knees: the torso as it sits, a little lower than standing.
  cv.group('translate(1 82)', () => standingTorso(cv, c));
  // The seat of the suit between the thighs.
  cv.form(blob([[46, 198], [62, 194], [80, 198], [82, 220], [62, 226], [44, 220]]), SUIT, { stroke: 2.2 });
  // The legs, knees up: thigh up to the knee, shin down to the boot.
  cv.limb([[52, 212], [42, 172], [40, 216]], [12, 9, 7], SUIT);
  boot(cv, [40, 218], -1);
  cv.limb([[74, 212], [84, 172], [86, 216]], [12, 9, 7], SUIT);
  boot(cv, [86, 218], 1);
  cv.line(curve([[36, 170], [42, 166], [48, 170]]), { width: 1.2 });
  cv.line(curve([[78, 170], [84, 166], [90, 170]]), { width: 1.2 });
  // The arms on the knees, the hands meeting between them.
  cv.limb([[41, 157], [38, 176], [56, 180]], armR, SUIT);
  cv.limb([[85, 156], [88, 176], [70, 180]], armR, SUIT);
  hand(cv, c, [58, 180], 0, 1.18);
  hand(cv, c, [68, 180], 180, 1.18);
  cv.group('translate(62 140) rotate(8) scale(1.32)', () => head(cv, c, 'down'));
}

const ABOUT = {
  standing: 'Standing on the floor of a room, a hand on the hip',
  standingFolded: 'Standing, the arms folded',
  standingBack: 'Standing, the hands behind the back',
  walking: 'Walking, mid-stride: a piece on its way between rooms',
  leaning: 'Leaning over the chart table or the laboratory counter: a station behind a prop; below its line the prop hides it',
  inBed: 'Sitting up in the Hospital bed, bandaged: Injured; below the blanket the bed hides it',
  onBench: 'Sitting hunched on the Jail bench: Jailed; the anchor is the seat',
  atConsole: 'Seated on a stool at a console, side on: for a room with a desk (none of the five has one yet)',
  out: 'Sitting on the floor, the knees up and the head bowed: Eliminated',
};
const DRAW = { standing, standingFolded, standingBack, walking, leaning, inBed, onBench, atConsole, out };

/** Every pose: how to draw it, its box and anchor (geometry.mjs), and what it is for. */
export const POSES = Object.fromEntries(Object.entries(GEOMETRY).map(([pose, g]) => [pose, {
  draw: DRAW[pose], viewBox: g.box.join(' '), width: g.box[2], height: g.box[3], anchor: g.anchor, head: g.head, about: ABOUT[pose],
}]));
